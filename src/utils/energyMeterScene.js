





import * as THREE from 'three'


const C = {
  body:        0x1a2744,   
  bodyEdge:    0x0f1a30,
  faceplate:   0x0d1f3c,  
  display:     0x001a0d,  
  displayGlow: 0x00ff88,  
  accent:      0x38bdf8,  
  accentCyan:  0x22d3ee,
  metal:       0xaabbcc,  
  metalDark:   0x667788,
  screw:       0x8899aa,
  led_green:   0x22c55e,
  led_blue:    0x38bdf8,
  led_amber:   0xf59e0b,
  wire_red:    0xef4444,
  wire_black:  0x111111,
  wire_yellow: 0xfbbf24,
  terminal:    0xd4a843,
}


const box = (w, h, d, color, rough = 0.5, metal = 0.1) => {
  const g = new THREE.BoxGeometry(w, h, d)
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  return new THREE.Mesh(g, m)
}

const cyl = (rt, rb, h, segs, color, rough = 0.5, metal = 0.3) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs)
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  return new THREE.Mesh(g, m)
}

const roundedBox = (w, h, d, color, rough = 0.4, metal = 0.15) => {
  
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2)
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  return new THREE.Mesh(g, m)
}


function makeDisplayTexture() {
  const W = 512, H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  
  ctx.fillStyle = '#001a0d'
  ctx.fillRect(0, 0, W, H)

  
  ctx.strokeStyle = 'rgba(0,255,100,0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i < H; i += 4) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke()
  }

  
  ctx.fillStyle = '#00ff88'
  ctx.font = 'bold 72px monospace'
  ctx.textAlign = 'center'
  ctx.shadowColor = '#00ff88'
  ctx.shadowBlur = 18
  ctx.fillText('1.847', W / 2, 100)

  
  ctx.font = 'bold 28px monospace'
  ctx.shadowBlur = 10
  ctx.fillText('kWh', W / 2, 138)

  
  ctx.font = '600 20px monospace'
  ctx.fillStyle = 'rgba(0,255,136,0.55)'
  ctx.shadowBlur = 6
  ctx.fillText('220V  4.8A  NORMAL', W / 2, 210)

  
  const corners = [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]]
  corners.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,255,136,0.4)'
    ctx.shadowBlur = 8
    ctx.fill()
  })

  return new THREE.CanvasTexture(canvas)
}

function makeLabelTexture(text, color = '#38bdf8') {
  const W = 256, H = 64
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.font = 'bold 22px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(text, W / 2, 42)
  return new THREE.CanvasTexture(canvas)
}


function buildEnergyMeter() {
  const root = new THREE.Group()

  
  const bodyW = 3.2, bodyH = 4.8, bodyD = 1.6
  const body = roundedBox(bodyW, bodyH, bodyD, C.body, 0.55, 0.15)
  body.castShadow = true
  body.receiveShadow = true
  root.add(body)

  
  ;[-bodyW / 2, bodyW / 2].forEach(x => {
    const rail = box(0.10, bodyH + 0.04, bodyD + 0.04, C.metal, 0.3, 0.85)
    rail.position.set(x, 0, 0)
    root.add(rail)
  })

  
  const topCap = box(bodyW + 0.1, 0.18, bodyD + 0.1, C.metal, 0.3, 0.85)
  topCap.position.set(0, bodyH / 2 + 0.09, 0)
  root.add(topCap)

  
  const botCap = box(bodyW + 0.1, 0.18, bodyD + 0.1, C.metal, 0.3, 0.85)
  botCap.position.set(0, -bodyH / 2 - 0.09, 0)
  root.add(botCap)

  
  const face = box(bodyW - 0.12, bodyH - 0.14, 0.06, C.faceplate, 0.65, 0.05)
  face.position.set(0, 0, bodyD / 2 + 0.03)
  root.add(face)

  
  const dispW = 2.2, dispH = 1.1
  const dispTex = makeDisplayTexture()
  const dispMat = new THREE.MeshStandardMaterial({
    map: dispTex,
    emissive: new THREE.Color(0x004422),
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.0,
  })
  const dispMesh = new THREE.Mesh(new THREE.PlaneGeometry(dispW, dispH), dispMat)
  dispMesh.position.set(0, 0.9, bodyD / 2 + 0.07)
  root.add(dispMesh)

  
  const bezel = box(dispW + 0.18, dispH + 0.18, 0.07, 0x0a0f1e, 0.7, 0.2)
  bezel.position.set(0, 0.9, bodyD / 2 + 0.04)
  root.add(bezel)

  
  const lcdLight = new THREE.PointLight(0x00ff88, 1.5, 2.5)
  lcdLight.position.set(0, 0.9, bodyD / 2 + 0.5)
  root.add(lcdLight)

  
  const brandTex = makeLabelTexture('VOLTEDGE', '#38bdf8')
  const brandMat = new THREE.MeshBasicMaterial({ map: brandTex, transparent: true })
  const brandMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), brandMat)
  brandMesh.position.set(0, 2.05, bodyD / 2 + 0.07)
  root.add(brandMesh)

  
  const modelTex = makeLabelTexture('SMART METER v2', 'rgba(56,189,248,0.6)')
  const modelMat = new THREE.MeshBasicMaterial({ map: modelTex, transparent: true })
  const modelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), modelMat)
  modelMesh.position.set(0, -2.1, bodyD / 2 + 0.07)
  root.add(modelMesh)

  
  const ledColors = [C.led_green, C.led_blue, C.led_amber]
  const ledLights = []
  ledColors.forEach((color, i) => {
    const xPos = -0.35 + i * 0.35
    const ledGeo = new THREE.SphereGeometry(0.065, 10, 10)
    const ledMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.8,
      roughness: 0.15,
    })
    const led = new THREE.Mesh(ledGeo, ledMat)
    led.position.set(xPos, -1.2, bodyD / 2 + 0.07)
    root.add(led)

    const pl = new THREE.PointLight(color, 1.0, 1.0)
    pl.position.copy(led.position)
    pl.position.z += 0.2
    root.add(pl)
    ledLights.push({ light: pl, base: color })
  })

  
  const screwPositions = [
    [-1.35, 2.1], [1.35, 2.1], [-1.35, -2.1], [1.35, -2.1]
  ]
  screwPositions.forEach(([x, y]) => {
    const screw = cyl(0.07, 0.07, 0.1, 8, C.screw, 0.4, 0.8)
    screw.position.set(x, y, bodyD / 2 + 0.07)
    root.add(screw)
    
    const slot1 = box(0.12, 0.016, 0.06, 0x556677, 0.5, 0.5)
    slot1.position.set(x, y, bodyD / 2 + 0.13)
    root.add(slot1)
    const slot2 = box(0.016, 0.12, 0.06, 0x556677, 0.5, 0.5)
    slot2.position.set(x, y, bodyD / 2 + 0.135)
    root.add(slot2)
  })

  
  const termBlock = box(2.8, 0.55, 0.9, 0x1e3050, 0.6, 0.05)
  termBlock.position.set(0, -2.6, 0.4)
  root.add(termBlock)

  const termColors = [C.wire_red, C.wire_black, C.terminal, C.wire_yellow, C.wire_black]
  termColors.forEach((col, i) => {
    const term = cyl(0.1, 0.1, 0.28, 8, col, 0.4, 0.6)
    term.rotation.x = Math.PI / 2
    term.position.set(-1.0 + i * 0.5, -2.6, bodyD / 2 + 0.2)
    root.add(term)
    
    const wire = cyl(0.03, 0.03, 0.5, 6, col, 0.8, 0.0)
    wire.position.set(-1.0 + i * 0.5, -2.6, bodyD / 2 + 0.65)
    wire.rotation.x = Math.PI / 2
    root.add(wire)
  })

  
  const dinRail = box(3.0, 0.32, 0.28, C.metalDark, 0.3, 0.85)
  dinRail.position.set(0, 0, -bodyD / 2 - 0.14)
  root.add(dinRail)
  const dinClip1 = box(0.15, 0.45, 0.32, C.metal, 0.3, 0.85)
  dinClip1.position.set(-1.2, 0, -bodyD / 2 - 0.25)
  root.add(dinClip1)
  const dinClip2 = box(0.15, 0.45, 0.32, C.metal, 0.3, 0.85)
  dinClip2.position.set(1.2, 0, -bodyD / 2 - 0.25)
  root.add(dinClip2)

  
  const ringGeo = new THREE.TorusGeometry(0.35, 0.025, 8, 48)
  const ringMat = new THREE.MeshStandardMaterial({
    color: C.accent,
    emissive: C.accent,
    emissiveIntensity: 2.0,
    roughness: 0.1,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.set(0.82, -1.2, bodyD / 2 + 0.07)
  root.add(ring)

  
  const btn = cyl(0.12, 0.12, 0.1, 16, C.accent, 0.3, 0.2)
  btn.rotation.x = Math.PI / 2
  btn.position.set(-0.9, -1.6, bodyD / 2 + 0.1)
  const btnMat = new THREE.MeshStandardMaterial({
    color: C.accent,
    emissive: C.accent,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  })
  btn.material = btnMat
  root.add(btn)

  return { group: root, ledLights, ring, ringMat, lcdLight }
}


export function createEnergyMeterScene(canvas) {
  const W = canvas.clientWidth  || canvas.offsetWidth  || 600
  const H = canvas.clientHeight || canvas.offsetHeight || 600

  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3

  
  const scene = new THREE.Scene()

  
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
  camera.position.set(0, 1, 10)
  camera.lookAt(0, 0, 0)

  
  scene.add(new THREE.AmbientLight(0x8899bb, 0.7))

  const keyLight = new THREE.DirectionalLight(0xaaccff, 2.8)
  keyLight.position.set(5, 8, 6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far  = 30
  keyLight.shadow.camera.top  = 10
  keyLight.shadow.camera.bottom = -10
  keyLight.shadow.camera.left = -8
  keyLight.shadow.camera.right = 8
  keyLight.shadow.radius = 3
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8)
  rimLight.position.set(-5, 3, -4)
  scene.add(rimLight)

  const fillLight = new THREE.DirectionalLight(0x22d3ee, 0.5)
  fillLight.position.set(0, -4, 4)
  scene.add(fillLight)

  
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.2 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -3.5
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  
  const { group, ledLights, ring, ringMat, lcdLight } = buildEnergyMeter()
  group.castShadow = true
  group.position.y = 0
  scene.add(group)

  
  let isDragging  = false
  let autoRotate  = true
  let lastMouse   = { x: 0, y: 0 }
  let spherical   = { theta: -0.3, phi: 1.2, radius: 10 }
  let targetTheta = spherical.theta
  let targetPhi   = spherical.phi
  let floatTime   = 0
  let animTime    = 0
  const clock = new THREE.Clock()

  
  function updateCamera() {
    const { theta, phi, radius } = spherical
    camera.position.x = radius * Math.sin(phi) * Math.sin(theta)
    camera.position.y = radius * Math.cos(phi)
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta)
    camera.lookAt(0, 0, 0)
  }
  updateCamera()

  
  const onPointerDown = (e) => {
    isDragging   = true
    autoRotate   = false
    lastMouse    = { x: e.clientX, y: e.clientY }
    canvas.style.cursor = 'grabbing'
  }
  const onPointerUp = () => {
    isDragging = false
    canvas.style.cursor = 'grab'
    setTimeout(() => { autoRotate = true }, 2000)
  }
  const onPointerMove = (e) => {
    if (!isDragging) return
    const dx = (e.clientX - lastMouse.x) * 0.007
    const dy = (e.clientY - lastMouse.y) * 0.007
    lastMouse = { x: e.clientX, y: e.clientY }
    targetTheta -= dx
    targetPhi = Math.max(0.2, Math.min(Math.PI * 0.82, targetPhi + dy))
  }
  const onWheel = (e) => {
    e.preventDefault()
    spherical.radius = Math.max(5, Math.min(18, spherical.radius + e.deltaY * 0.014))
  }

  canvas.addEventListener('pointerdown',  onPointerDown)
  canvas.addEventListener('pointerup',    onPointerUp)
  canvas.addEventListener('pointermove',  onPointerMove)
  canvas.addEventListener('pointerleave', onPointerUp)
  canvas.addEventListener('wheel',        onWheel, { passive: false })

  
  const onResize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(canvas)

  
  let rafId
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    const dt = clock.getDelta()
    floatTime += dt
    animTime  += dt

    if (autoRotate) targetTheta -= 0.003

    spherical.theta += (targetTheta - spherical.theta) * 0.07
    spherical.phi   += (targetPhi   - spherical.phi)   * 0.07
    updateCamera()

    
    group.position.y = Math.sin(floatTime * 0.75) * 0.2

    
    ledLights.forEach(({ light }, i) => {
      light.intensity = 0.7 + 0.7 * Math.abs(Math.sin(animTime * (1.2 + i * 0.5)))
    })

    
    const ringPulse = 1.5 + 1.5 * Math.abs(Math.sin(animTime * 2.0))
    ringMat.emissiveIntensity = ringPulse

    
    lcdLight.intensity = 1.2 + 0.3 * Math.sin(animTime * 7.3)

    renderer.render(scene, camera)
  }
  animate()

  
  const dispose = () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    canvas.removeEventListener('pointerdown',  onPointerDown)
    canvas.removeEventListener('pointerup',    onPointerUp)
    canvas.removeEventListener('pointermove',  onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerUp)
    canvas.removeEventListener('wheel',        onWheel)
    renderer.dispose()
  }

  return { dispose }
}

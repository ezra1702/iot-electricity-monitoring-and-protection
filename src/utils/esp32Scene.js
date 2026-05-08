/**
 * esp32Scene.js — Three.js ESP32 Hardware Visualizer
 * Procedural geometry (no GLTF needed) so it works without an asset server.
 * Features: ambient + directional lights, shadow, idle rotation,
 *           floating animation, mouse drag (orbit), scroll zoom.
 */
import * as THREE from 'three'

/* ─── Colour palette ─────────────────────────────────────────────────────── */
const C = {
  pcb:       0x1a6b3c,   // classic PCB green
  pcbEdge:   0x0f4225,
  shield:    0xc8d4dc,   // aluminium can
  shieldEdge:0x8fa3af,
  copper:    0xd4a843,
  chip:      0x111111,
  usb:       0x888888,
  btn:       0xcccccc,
  led_blue:  0x38bdf8,
  led_red:   0xef4444,
  pin:       0xdddddd,
  pinBase:   0x222222,
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const box  = (w, h, d, color, roughness = 0.6, metalness = 0.1) => {
  const g = new THREE.BoxGeometry(w, h, d)
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return new THREE.Mesh(g, m)
}

const cyl  = (r, h, segs, color, rough = 0.5, metal = 0.0) => {
  const g = new THREE.CylinderGeometry(r, r, h, segs)
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  return new THREE.Mesh(g, m)
}

/* ─── Build procedural ESP32-style board ─────────────────────────────────── */
function buildESP32() {
  const root = new THREE.Group()

  /* PCB body */
  const pcb = box(2.8, 0.12, 5.6, C.pcb, 0.8, 0.0)
  pcb.receiveShadow = true
  root.add(pcb)

  /* Copper edge lines (just thin strips on top) */
  const edgeStrip = (x) => {
    const s = box(0.04, 0.14, 5.6, C.copper, 0.4, 0.8)
    s.position.set(x, 0.0, 0)
    root.add(s)
  }
  edgeStrip(-1.4); edgeStrip(1.4)

  /* WiFi antenna area (top of board) */
  const antennaPad = box(2.4, 0.13, 0.85, 0x145028, 0.9)
  antennaPad.position.set(0, 0.005, -2.375)
  root.add(antennaPad)

  /* Copper antenna trace */
  const trace = box(1.8, 0.14, 0.04, C.copper, 0.3, 0.9)
  trace.position.set(0, 0.01, -2.82)
  root.add(trace)

  /* Metal RF Shield (WROOM module) */
  const shield = box(2.2, 0.46, 2.6, C.shield, 0.4, 0.75)
  shield.castShadow = true
  shield.position.set(0, 0.27, -0.7)
  root.add(shield)

  /* ESPRESSIF silkscreen (flat plane with text via canvas texture) */
  const labelTex = makeLabelTexture('ESPRESSIF\nESP32-WROOM', 256, 128)
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0.92 })
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), labelMat)
  labelMesh.rotation.x = -Math.PI / 2
  labelMesh.position.set(0, 0.51, -0.7)
  root.add(labelMesh)

  /* CP2102 USB-UART chip */
  const cp = box(0.45, 0.12, 0.45, C.chip, 1, 0)
  cp.position.set(0.1, 0.12, 1.6)
  root.add(cp)

  /* AMS1117 LDO */
  const ldo = box(0.55, 0.22, 0.7, C.chip, 1, 0)
  ldo.position.set(0.6, 0.17, 2.2)
  root.add(ldo)

  /* Micro-USB port */
  const usb = box(0.6, 0.28, 0.4, C.usb, 0.5, 0.7)
  usb.position.set(0, 0.2, 2.9)
  root.add(usb)

  /* Tactile buttons */
  ;[[- 0.9, 1.7], [0.9, 1.7]].forEach(([x, z]) => {
    const btn = box(0.24, 0.22, 0.24, C.btn, 0.8)
    btn.position.set(x, 0.17, z)
    root.add(btn)
    const cap = cyl(0.08, 0.12, 8, 0xaaaaaa, 0.6)
    cap.position.set(x, 0.32, z)
    root.add(cap)
  })

  /* LED indicators — emissive */
  const addLED = (color, x, z) => {
    const g = new THREE.SphereGeometry(0.055, 8, 8)
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5, roughness: 0.2 })
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, 0.13, z)
    root.add(mesh)

    /* point light for glow */
    const pl = new THREE.PointLight(color, 1.2, 1.2)
    pl.position.copy(mesh.position)
    root.add(pl)
    return { mesh, light: pl }
  }
  const blueLED = addLED(C.led_blue, -0.9, 1.4)
  const redLED  = addLED(C.led_red,   0.9, 2.4)

  /* GPIO pins — two rows */
  const pinRow = (xSign) => {
    for (let i = 0; i < 19; i++) {
      const pBase = box(0.1, 0.12, 0.06, C.pinBase)
      pBase.position.set(xSign * 1.47, 0.0, -2.0 + i * 0.22)
      root.add(pBase)

      const pin = box(0.04, 0.42, 0.04, C.pin, 0.3, 0.9)
      pin.position.set(xSign * 1.47, -0.27, -2.0 + i * 0.22)
      root.add(pin)
    }
  }
  pinRow(-1); pinRow(1)

  return { group: root, blueLED, redLED }
}

/* ─── Canvas label texture ────────────────────────────────────────────────── */
function makeLabelTexture(text, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'transparent'
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px monospace'
  ctx.textAlign = 'center'
  const lines = text.split('\n')
  lines.forEach((line, i) => ctx.fillText(line, w / 2, 36 + i * 38))
  return new THREE.CanvasTexture(canvas)
}

/* ─── Main scene factory ─────────────────────────────────────────────────── */
export function createESP32Scene(canvas) {
  const W = canvas.clientWidth  || canvas.offsetWidth  || 600
  const H = canvas.clientHeight || canvas.offsetHeight || 600

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  /* Scene */
  const scene = new THREE.Scene()

  /* Camera */
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
  camera.position.set(0, 6, 10)
  camera.lookAt(0, 0, 0)

  /* Lights */
  const ambient = new THREE.AmbientLight(0xffffff, 0.55)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0x88ccff, 2.2)
  keyLight.position.set(4, 8, 6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far  = 30
  keyLight.shadow.camera.top  = 8
  keyLight.shadow.camera.bottom = -8
  keyLight.shadow.camera.left = -8
  keyLight.shadow.camera.right = 8
  keyLight.shadow.radius = 3
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2)
  rimLight.position.set(-5, 3, -4)
  scene.add(rimLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
  fillLight.position.set(0, -4, 2)
  scene.add(fillLight)

  /* Shadow plane (invisible) */
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.25 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -3.0
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  /* Build ESP32 */
  const { group, blueLED, redLED } = buildESP32()
  group.castShadow = true
  group.position.y = 0
  scene.add(group)

  /* ─── State ──────────────────────────────────────── */
  let isDragging   = false
  let autoRotate   = true
  let lastMouse    = { x: 0, y: 0 }
  let spherical    = { theta: 0.4, phi: 1.05, radius: 10 }  // orbit
  let targetTheta  = spherical.theta
  let targetPhi    = spherical.phi
  let floatTime    = 0
  let ledTime      = 0
  const clock = new THREE.Clock()

  /* ─── Orbit helpers ─────────────────────────────── */
  function updateCamera() {
    const { theta, phi, radius } = spherical
    camera.position.x = radius * Math.sin(phi) * Math.sin(theta)
    camera.position.y = radius * Math.cos(phi)
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta)
    camera.lookAt(0, 0, 0)
  }
  updateCamera()

  /* ─── Mouse / Touch interaction ─────────────────── */
  const onPointerDown = (e) => {
    isDragging   = true
    autoRotate   = false
    lastMouse    = { x: e.clientX, y: e.clientY }
    canvas.style.cursor = 'grabbing'
  }

  const onPointerUp = () => {
    isDragging = false
    canvas.style.cursor = 'grab'
    setTimeout(() => { autoRotate = true }, 2200)
  }

  const onPointerMove = (e) => {
    if (!isDragging) return
    const dx = (e.clientX - lastMouse.x) * 0.008
    const dy = (e.clientY - lastMouse.y) * 0.008
    lastMouse = { x: e.clientX, y: e.clientY }
    targetTheta -= dx
    targetPhi    = Math.max(0.25, Math.min(Math.PI * 0.8, targetPhi + dy))
  }

  const onWheel = (e) => {
    e.preventDefault()
    spherical.radius = Math.max(5, Math.min(18, spherical.radius + e.deltaY * 0.015))
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup',   onPointerUp)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave',onPointerUp)
  canvas.addEventListener('wheel',       onWheel, { passive: false })

  /* ─── Resize ─────────────────────────────────────── */
  const onResize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(canvas)

  /* ─── Animation loop ─────────────────────────────── */
  let rafId
  const animate = () => {
    rafId = requestAnimationFrame(animate)
    const dt = clock.getDelta()
    floatTime += dt
    ledTime   += dt

    /* Auto idle rotation */
    if (autoRotate) {
      targetTheta -= 0.003
    }

    /* Smooth orbit damping */
    spherical.theta += (targetTheta - spherical.theta) * 0.06
    spherical.phi   += (targetPhi   - spherical.phi)   * 0.06
    updateCamera()

    /* Subtle float */
    group.position.y = Math.sin(floatTime * 0.8) * 0.18

    /* LED blink */
    blueLED.light.intensity = 0.8 + 0.8 * Math.abs(Math.sin(ledTime * 1.5))
    redLED.light.intensity  = 0.6 + 0.6 * Math.abs(Math.sin(ledTime * 2.3))

    renderer.render(scene, camera)
  }
  animate()

  /* ─── Cleanup ─────────────────────────────────────── */
  const dispose = () => {
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointerup',   onPointerUp)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave',onPointerUp)
    canvas.removeEventListener('wheel',       onWheel)
    renderer.dispose()
  }

  return { dispose }
}

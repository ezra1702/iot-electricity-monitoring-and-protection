









import { animate, stagger } from 'animejs'









export function pageEntrance(selector = '.page-wrap') {
  animate(selector, {
    opacity:    [0, 1],
    translateY: ['20px', '0px'],
    duration:   500,
    ease:       'outCubic',
  })
}






export function fadeInUp(target, delay = 0) {
  animate(target, {
    opacity:    [0, 1],
    translateY: ['18px', '0px'],
    duration:   480,
    delay,
    ease:       'outCubic',
  })
}






export function staggerFadeIn(selector, options = {}) {
  const { stagger: staggerMs = 70, start = 80 } = options
  animate(selector, {
    opacity:    [0, 1],
    translateY: ['16px', '0px'],
    duration:   440,
    delay:      stagger(staggerMs, { start }),
    ease:       'outCubic',
  })
}





export function btnPress(el) {
  if (!el) return
  animate(el, { scale: [1, 0.95], duration: 100, ease: 'outQuad' })
}












export function countUp(el, endValue, options = {}) {
  if (!el) return
  const { duration = 1200, decimals = 0 } = options
  const obj = { val: 0 }
  animate(obj, {
    val:      endValue,
    duration: duration,
    ease:     'outCubic',
    onUpdate: () => {
      el.textContent = obj.val.toFixed(decimals)
    },
  })
}





export function hoverLift(el) {
  if (!el) return
  animate(el, {
    translateY: [0, -4],
    boxShadow:  ['0 4px 12px rgba(0,0,0,0.2)', '0 12px 28px rgba(56,189,248,0.20)'],
    duration:   220,
    ease:       'outQuad',
  })
}





export function hoverReset(el) {
  if (!el) return
  animate(el, {
    translateY: [-4, 0],
    boxShadow:  ['0 12px 28px rgba(56,189,248,0.20)', '0 4px 12px rgba(0,0,0,0.2)'],
    duration:   260,
    ease:       'outQuad',
  })
}









export function animateLoginEntrance(containerSelector = '.login-form-wrap') {
  animate(containerSelector, {
    opacity:    [0, 1],
    translateX: ['-48px', '0px'],
    duration:   700,
    ease:       'outCubic',
  })
  animate(`${containerSelector} .anim-item`, {
    opacity:    [0, 1],
    translateY: ['24px', '0px'],
    duration:   560,
    delay:      stagger(90, { start: 200 }),
    ease:       'outCubic',
  })
}





export function animateHeroEntrance(panelSelector = '.login-hero-panel') {
  animate(panelSelector, {
    opacity:    [0, 1],
    translateX: ['60px', '0px'],
    duration:   900,
    delay:      100,
    ease:       'outCubic',
  })
}





export function animateBtnPress(el) {
  if (!el) return
  animate(el, { scale: [1, 0.96], duration: 110, ease: 'outQuad' })
}





export function animateBtnRelease(el) {
  if (!el) return
  animate(el, { scale: [0.96, 1], duration: 250, ease: 'outBack' })
}






export function animateBtnLoading(el) {
  if (!el) return null
  return animate(el, {
    opacity:  [1, 0.72, 1],
    scale:    [1, 0.975, 1],
    duration: 750,
    loop:     true,
    ease:     'inOutSine',
  })
}





export function animateFormShake(selector = '.login-form') {
  animate(selector, {
    translateX: [
      { to: '-10px', duration: 60,  ease: 'outSine' },
      { to:  '10px', duration: 80,  ease: 'inOutSine' },
      { to:  '-8px', duration: 70,  ease: 'inOutSine' },
      { to:   '8px', duration: 70,  ease: 'inOutSine' },
      { to:  '-4px', duration: 60,  ease: 'inOutSine' },
      { to:   '0px', duration: 60,  ease: 'outSine'  },
    ],
  })
}

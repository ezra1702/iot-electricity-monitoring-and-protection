/**
 * animations.js — Anime.js v4 animation utilities (named exports only)
 * All pages import from here. Anime.js v4 has NO default export.
 *
 * Exports:
 *   pageEntrance, fadeInUp, staggerFadeIn, btnPress,
 *   countUp, hoverLift, hoverReset,
 *   animateLoginEntrance, animateHeroEntrance,
 *   animateBtnPress, animateBtnRelease, animateBtnLoading, animateFormShake
 */
import { animate, stagger } from 'animejs'

/* ═══════════════════════════════════════════════════════
   SHARED / GENERIC
═══════════════════════════════════════════════════════ */

/**
 * Fade + slide-up entrance for a full page container.
 * @param {string} selector  e.g. '.page-wrap'
 */
export function pageEntrance(selector = '.page-wrap') {
  animate(selector, {
    opacity:    [0, 1],
    translateY: ['20px', '0px'],
    duration:   500,
    ease:       'outCubic',
  })
}

/**
 * Fade-in + slide-up for individual elements.
 * @param {string|HTMLElement} target
 * @param {number} delay  optional delay in ms
 */
export function fadeInUp(target, delay = 0) {
  animate(target, {
    opacity:    [0, 1],
    translateY: ['18px', '0px'],
    duration:   480,
    delay,
    ease:       'outCubic',
  })
}

/**
 * Staggered fade-in for a list of child elements.
 * @param {string} selector  e.g. '.card-item'
 * @param {object} options   stagger options
 */
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

/**
 * Button press scale-down micro-animation.
 * @param {HTMLElement|string} el
 */
export function btnPress(el) {
  if (!el) return
  animate(el, { scale: [1, 0.95], duration: 100, ease: 'outQuad' })
}

/* ═══════════════════════════════════════════════════════
   METRIC CARD
═══════════════════════════════════════════════════════ */

/**
 * Animate a numeric counter from 0 → value.
 * Writes directly to el.textContent.
 * @param {HTMLElement} el
 * @param {number}      endValue
 * @param {string}      suffix   e.g. ' kWh'
 */
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

/**
 * Lift a card on hover (mouseenter).
 * @param {HTMLElement} el
 */
export function hoverLift(el) {
  if (!el) return
  animate(el, {
    translateY: [0, -4],
    boxShadow:  ['0 4px 12px rgba(0,0,0,0.2)', '0 12px 28px rgba(56,189,248,0.20)'],
    duration:   220,
    ease:       'outQuad',
  })
}

/**
 * Reset card after hover (mouseleave).
 * @param {HTMLElement} el
 */
export function hoverReset(el) {
  if (!el) return
  animate(el, {
    translateY: [-4, 0],
    boxShadow:  ['0 12px 28px rgba(56,189,248,0.20)', '0 4px 12px rgba(0,0,0,0.2)'],
    duration:   260,
    ease:       'outQuad',
  })
}

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE SPECIFIC
═══════════════════════════════════════════════════════ */

/**
 * Animate the login form panel on mount.
 * @param {string} containerSelector  e.g. '.login-form-wrap'
 */
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

/**
 * Animate the 3D hero panel on mount.
 * @param {string} panelSelector  e.g. '.login-hero-panel'
 */
export function animateHeroEntrance(panelSelector = '.login-hero-panel') {
  animate(panelSelector, {
    opacity:    [0, 1],
    translateX: ['60px', '0px'],
    duration:   900,
    delay:      100,
    ease:       'outCubic',
  })
}

/**
 * Button press (mousedown).
 * @param {HTMLElement} el
 */
export function animateBtnPress(el) {
  if (!el) return
  animate(el, { scale: [1, 0.96], duration: 110, ease: 'outQuad' })
}

/**
 * Button release (mouseup / mouseleave).
 * @param {HTMLElement} el
 */
export function animateBtnRelease(el) {
  if (!el) return
  animate(el, { scale: [0.96, 1], duration: 250, ease: 'outBack' })
}

/**
 * Loading pulse while submitting.
 * Call .cancel() on the returned instance to stop.
 * @param {HTMLElement} el
 */
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

/**
 * Error shake on the form.
 * @param {string} selector  e.g. '.login-form'
 */
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

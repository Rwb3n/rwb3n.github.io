// Tiny DOM helpers.

import { motion } from './prefs.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  return assign(el, attrs, children);
}

export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  return assign(el, attrs, children);
}

function assign(el, attrs, children) {
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') {
        for (const [p, pv] of Object.entries(v)) {
          if (p.startsWith('--')) el.style.setProperty(p, pv);
          else el.style[p] = pv;
        }
      }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

// "Reduced" means anything short of full motion: decorative animation is off in
// both 'calm' and 'off'. motionOff() is for the few things calm still allows
// (smooth scrolling, the lens easing after the pointer).
export const reducedMotion = () => motion() !== 'full';
export const motionOff = () => motion() === 'off';

export const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));

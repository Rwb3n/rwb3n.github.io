// The landing's moving parts, shared by the site (main.js) and the component
// library: words that rise, the lens with its x-ray of the type, and the
// spotlight on the entry rows. The markup itself comes from static.js.
//
// enhanceLanding(root) → lens (or null). root contains .landing.

import { splitWords, createXray } from './type.js';
import { createLens } from './lens.js';
import { reducedMotion } from './dom.js';

export function enhanceLanding(root = document, { yieldOver = [] } = {}) {
  const display = root.querySelector('.landing .display');
  if (display && !reducedMotion()) splitWords(display);

  // Entry rows: the spotlight follows the pointer.
  root.querySelector('[data-entry]')?.addEventListener('pointermove', (e) => {
    const row = e.target.closest('.entry-item');
    if (!row) return;
    const b = row.getBoundingClientRect();
    row.style.setProperty('--mx', `${e.clientX - b.left}px`);
  });

  const canvas = root.querySelector('[data-lens]');
  if (!canvas) return null;
  try {
    const copyEl = root.querySelector('[data-copy]');
    const xray = copyEl ? createXray(copyEl, canvas) : null;
    const lens = createLens(canvas, root.querySelector('[data-lens-caption]'), { onFrame: (s) => xray?.update(s) });
    // Over the things you click, the lens steps aside.
    for (const el of [...root.querySelectorAll('.landing .entry'), ...yieldOver]) {
      el.addEventListener('pointerenter', () => lens.setYield(true));
      el.addEventListener('pointerleave', () => lens.setYield(false));
    }
    return lens;
  } catch (err) {
    console.warn('[lens]', err);
    return null;
  }
}

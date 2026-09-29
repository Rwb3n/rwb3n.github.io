// Typography in motion.
//
// splitWords  wraps each word in a clipping mask so lines can rise into view.
// createXray  under the lens, the landing copy turns to outlines with its
//             construction lines (baseline, x-height, cap height, descender):
//             the type's own "under the surface". The real copy gets a hole
//             cut in it (CSS mask) exactly where the x-ray layer shows through.

import { h } from './dom.js';

export function splitWords(root, { start = 0 } = {}) {
  let i = start;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) frag.append(part);
          else frag.append(h('span', { class: 'sw' }, h('span', { class: 'sw-in', style: { '--i': i++ } }, part)));
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('sw')) {
        walk(child);
      }
    }
  };
  walk(root);
  root.classList.add('is-split');
  return i;
}

export function createXray(copyEl, canvas) {
  const xray = copyEl.cloneNode(true);
  xray.className = 'xray';
  xray.removeAttribute('data-copy');
  xray.setAttribute('aria-hidden', 'true');
  xray.inert = true;
  for (const el of xray.querySelectorAll('[id]')) el.removeAttribute('id');
  copyEl.after(xray);

  let off = { x: 0, y: 0 };
  const measure = () => {
    const c = canvas.getBoundingClientRect();
    const b = copyEl.getBoundingClientRect();
    off = { x: b.left - c.left, y: b.top - c.top };
    guides();
  };

  // Construction lines per visual line of the headline, from real font metrics.
  function guides() {
    for (const g of xray.querySelectorAll('.guide')) g.remove();
    const probe = document.createElement('canvas').getContext('2d');
    labelled = '';
    [...xray.querySelectorAll('.display-line')].forEach((line, li) => {
      const cs = getComputedStyle(line);
      const size = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight) || size;
      probe.font = `${size}px ${cs.fontFamily}`;
      const m = probe.measureText('Hxp');
      const A = m.fontBoundingBoxAscent ?? size * 0.8;
      const D = m.fontBoundingBoxDescent ?? size * 0.2;
      const cap = probe.measureText('H').actualBoundingBoxAscent;
      const xh = probe.measureText('x').actualBoundingBoxAscent;
      const desc = probe.measureText('p').actualBoundingBoxDescent;
      const base = (lh - (A + D)) / 2 + A;
      const rows = Math.max(1, Math.round(line.offsetHeight / lh));
      const ink = rowExtents(line, rows, lh);
      for (let k = 0; k < rows; k++) {
        const y0 = k * lh + base;
        const [l, rgt] = ink[k] || [0, line.offsetWidth];
        const left = l - 28, width = rgt - l + 56;
        for (const [name, y] of [['cap height', y0 - cap], ['x-height', y0 - xh], ['baseline', y0], ['descender', y0 + desc]]) {
          line.append(h('span', {
            class: `guide is-${name.split(' ')[0]}`,
            dataset: { row: `${li}-${k}` },
            style: { top: `${y}px`, left: `${left}px`, width: `${width}px`, '--gl': `${left}px` },
          }, h('span', { class: 'guide-label' }, name)));
        }
      }
    });
  }

  // Only the headline row nearest the lens centre carries labels, so the
  // labels of two rows never collide in the (tight) leading between them.
  // Horizontal ink extent of each visual row, from the word boxes (or the
  // text's client rects when words aren't split).
  function rowExtents(line, rows, lh) {
    const out = Array.from({ length: rows }, () => [Infinity, -Infinity]);
    const lb = line.getBoundingClientRect();
    let boxes = [...line.querySelectorAll('.sw')].map((w) => ({ l: w.offsetLeft, r: w.offsetLeft + w.offsetWidth, m: w.offsetTop + w.offsetHeight / 2 }));
    if (!boxes.length) {
      const rg = document.createRange();
      rg.selectNodeContents(line);
      boxes = [...rg.getClientRects()].map((b) => ({ l: b.left - lb.left, r: b.right - lb.left, m: b.top - lb.top + b.height / 2 }));
    }
    for (const b of boxes) {
      const k = Math.min(rows - 1, Math.max(0, Math.floor(b.m / lh)));
      out[k][0] = Math.min(out[k][0], b.l);
      out[k][1] = Math.max(out[k][1], b.r);
    }
    return out.map(([l, r]) => (Number.isFinite(l) ? [l, r] : null));
  }

  let labelled = '';
  function labelNearest(ly) {
    let best = null, bd = Infinity;
    for (const g of xray.querySelectorAll('.guide.is-baseline')) {
      const d = Math.abs(g.parentElement.offsetTop + parseFloat(g.style.top) - ly);
      if (d < bd) { bd = d; best = g; }
    }
    const row = best?.dataset.row || '';
    if (row === labelled) return;
    labelled = row;
    for (const g of xray.querySelectorAll('.guide')) g.classList.toggle('is-labelled', g.dataset.row === row);
  }

  let lastKey = '';
  function update({ x, y, r }) {
    const lx = x - off.x, ly = y - off.y;
    const key = `${lx | 0},${ly | 0},${r | 0}`;
    if (key === lastKey) return;
    lastKey = key;
    if (r > 0) labelNearest(ly);
    for (const el of [copyEl, xray]) {
      el.style.setProperty('--lx', `${lx}px`);
      el.style.setProperty('--ly', `${ly}px`);
      el.style.setProperty('--lr', `${Math.max(0, r)}px`);
    }
  }

  measure();
  new ResizeObserver(measure).observe(copyEl);
  document.fonts?.ready.then(measure);
  return { update, measure };
}

// Flow diagrams as hand-laid SVG.
//
// Layouts: horizontal, vertical, fanout. Each one measures its labels, then
// checks whether it fits the container; if it doesn't, horizontal folds to
// vertical and fanout folds to a trunk. Text is never scaled — the diagram
// changes shape instead.

import { h, s, reducedMotion } from './dom.js';

const CH = 6.6;      // Geist Mono advance at 11px
const CH_SM = 5.75;  // … at 9.5px
const PAD_X = 14;
const NODE_H = 34;
const NODE_H_SUB = 48;
const HEAD = 5;

const nodeSize = (n) => ({
  w: Math.max(72, Math.ceil(Math.max(n.label.length * CH, (n.sublabel || '').length * CH_SM) + PAD_X * 2)),
  h: n.sublabel ? NODE_H_SUB : NODE_H,
});
const labelW = (t) => (t ? Math.ceil(t.length * CH_SM) + 10 : 0);

export function renderFlow(block) {
  const wrap = h('figure', { class: 'b-flow' });
  if (block.title) wrap.append(h('figcaption', { class: 'b-flow-title micro' }, block.title));
  const canvas = h('div', { class: 'b-flow-canvas' });
  wrap.append(canvas);

  const aria = describe(block);
  let lastKey = '';

  const draw = (width) => {
    const plan = layout(block, width);
    const key = plan.kind + ':' + Math.round(plan.width);
    if (key === lastKey) return;
    lastKey = key;
    canvas.replaceChildren(paint(block, plan, aria));
    measureEdges(canvas);
    if (wanted) settle();
  };

  let wanted = false;
  const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    wrap.classList.add('is-drawn');
    setTimeout(() => wrap.classList.add('is-settled'), 2400);
  }));

  // Hover a node: it and its direct connections light up; the rest recede.
  canvas.addEventListener('pointerover', (e) => {
    const node = e.target.closest?.('.fl-node');
    if (!node) return;
    const id = node.dataset.id;
    const svg = canvas.querySelector('svg');
    const near = new Set([id]);
    for (const el of svg.querySelectorAll('[data-a]')) {
      const hit = el.dataset.a === id || el.dataset.b === id;
      el.classList.toggle('is-lit', hit);
      if (hit) { near.add(el.dataset.a); near.add(el.dataset.b); }
    }
    for (const n of svg.querySelectorAll('.fl-node')) n.classList.toggle('is-lit', near.has(n.dataset.id));
    wrap.classList.add('is-focus');
  });
  canvas.addEventListener('pointerleave', () => {
    wrap.classList.remove('is-focus');
    for (const el of canvas.querySelectorAll('.is-lit')) el.classList.remove('is-lit');
  });

  const ro = new ResizeObserver(([entry]) => {
    if (!canvas.isConnected) return ro.disconnect();
    draw(entry.contentRect.width);
  });
  ro.observe(canvas);
  wrap.drawIn = () => {
    wanted = true;
    if (canvas.firstChild) settle();
  };
  return wrap;
}

function describe(block) {
  const byId = Object.fromEntries(block.nodes.map((n) => [n.id, n.label]));
  const steps = block.edges.map((e) => `${byId[e.from]} to ${byId[e.to]}${e.label ? ` (${e.label})` : ''}`);
  const loop = block.loop ? `; loops from ${byId[block.loop.from]} back to ${byId[block.loop.to]}` : '';
  return `${block.title ? block.title + ': ' : ''}Diagram — ${steps.join(', ')}${loop}.`;
}

// Layout --------------------------------------------------------------------

function layout(block, avail) {
  if (block.layout === 'fanout') {
    const f = fanout(block);
    return f.width <= avail ? f : trunk(block);
  }
  if (block.layout === 'vertical') return vertical(block);
  const hz = horizontal(block);
  return hz.width <= avail ? hz : vertical(block);
}

function horizontal(block) {
  const sizes = block.nodes.map(nodeSize);
  const rowH = Math.max(...sizes.map((z) => z.h));
  const edgeByFrom = Object.fromEntries(block.edges.map((e) => [e.from, e]));
  const topPad = block.edges.some((e) => e.label) ? 18 : 2;
  const cy = topPad + rowH / 2;
  let x = 1;
  const pos = {};
  block.nodes.forEach((n, i) => {
    const z = sizes[i];
    pos[n.id] = { x, y: cy - z.h / 2, w: z.w, h: z.h, cx: x + z.w / 2, cy };
    const gap = Math.max(40, labelW(edgeByFrom[n.id]?.label) + 16);
    x += z.w + (i < block.nodes.length - 1 ? gap : 0);
  });
  const edges = block.edges.map((e) => {
    const a = pos[e.from], b = pos[e.to];
    const x1 = a.x + a.w, x2 = b.x - 2;
    return { d: `M${x1},${cy}H${x2}`, head: [x2, cy, 'right'], a: e.from, b: e.to, label: e.label, lx: (x1 + x2) / 2, ly: cy - 9 };
  });
  let height = topPad + rowH + 2;
  let loop = null;
  if (block.loop) {
    const a = pos[block.loop.from], b = pos[block.loop.to];
    const yb = cy + rowH / 2 + 22;
    loop = { d: `M${a.cx},${a.y + a.h}V${yb}H${b.cx}V${b.y + b.h + 2}`, head: [b.cx, b.y + b.h + 2, 'up'], a: block.loop.from, b: block.loop.to, label: block.loop.label, lx: (a.cx + b.cx) / 2, ly: yb + 3 };
    height = yb + 12;
  }
  const spark = block.nodes.length > 1 ? `M${pos[block.nodes[0].id].cx},${cy}H${pos[block.nodes.at(-1).id].cx}` : null;
  return { kind: 'h', width: x + 1, height, pos, edges, loop, spark };
}

function vertical(block) {
  const sizes = block.nodes.map(nodeSize);
  const colW = Math.max(...sizes.map((z) => z.w));
  const edgeByFrom = Object.fromEntries(block.edges.map((e) => [e.from, e]));
  const gap = 38;
  const cx = 1 + colW / 2;
  let y = 1;
  const pos = {};
  block.nodes.forEach((n, i) => {
    const z = sizes[i];
    pos[n.id] = { x: 1, y, w: colW, h: z.h, cx, cy: y + z.h / 2 };
    y += z.h + (i < block.nodes.length - 1 ? gap : 0);
  });
  const edges = block.edges.map((e) => {
    const a = pos[e.from], b = pos[e.to];
    const y1 = a.y + a.h, y2 = b.y - 2;
    return { d: `M${cx},${y1}V${y2}`, head: [cx, y2, 'down'], a: e.from, b: e.to, label: e.label, lx: cx + 10, ly: (y1 + y2) / 2 + 3, anchor: 'start', bare: true };
  });
  let width = colW + 2;
  const maxEdgeLabel = Math.max(0, ...block.edges.map((e) => labelW(e.label)));
  width = Math.max(width, cx + 10 + maxEdgeLabel);
  let loop = null;
  if (block.loop) {
    const a = pos[block.loop.from], b = pos[block.loop.to];
    const xr = 1 + colW + 24;
    loop = { d: `M${a.x + a.w},${a.cy}H${xr}V${b.cy}H${b.x + b.w + 2}`, head: [b.x + b.w + 2, b.cy, 'left'], a: block.loop.from, b: block.loop.to, label: block.loop.label, lx: xr + 8, ly: (a.cy + b.cy) / 2 + 3, anchor: 'start', bare: true };
    width = Math.max(width, xr + 8 + labelW(block.loop.label));
  }
  const spark = block.nodes.length > 1 ? `M${cx},${pos[block.nodes[0].id].cy}V${pos[block.nodes.at(-1).id].cy}` : null;
  return { kind: 'v', width: width + 1, height: y + 1, pos, edges, loop, spark };
}

function fanout(block) {
  const [root, ...kids] = block.nodes;
  const sizes = Object.fromEntries(block.nodes.map((n) => [n.id, nodeSize(n)]));
  const edgeTo = Object.fromEntries(block.edges.map((e) => [e.to, e]));
  const gap = 16;
  const kidW = kids.map((k) => Math.max(sizes[k.id].w, labelW(edgeTo[k.id]?.label) + 8));
  const rowW = kidW.reduce((a, b) => a + b, 0) + gap * (kids.length - 1);
  const rs = sizes[root.id];
  const width = Math.max(rowW, rs.w) + 2;
  const pos = {};
  pos[root.id] = { x: (width - rs.w) / 2, y: 1, w: rs.w, h: rs.h, cx: width / 2, cy: 1 + rs.h / 2 };
  const rowY = rs.h + 64;
  let x = (width - rowW) / 2;
  kids.forEach((k, i) => {
    const z = sizes[k.id];
    const slot = kidW[i];
    const nx = x + (slot - z.w) / 2;
    pos[k.id] = { x: nx, y: rowY, w: z.w, h: z.h, cx: nx + z.w / 2, cy: rowY + z.h / 2 };
    x += slot + gap;
  });
  const r = pos[root.id];
  const edges = block.edges.map((e) => {
    const b = pos[e.to];
    const y1 = r.y + r.h, y2 = b.y - 2;
    const my = (y1 + y2) / 2;
    return { d: `M${r.cx},${y1}C${r.cx},${my} ${b.cx},${my} ${b.cx},${y2}`, head: [b.cx, y2, 'down'], a: e.from, b: e.to, label: e.label, lx: b.cx, ly: y2 - 10 };
  });
  const height = rowY + Math.max(...kids.map((k) => sizes[k.id].h)) + 2;
  return { kind: 'f', width, height, pos, edges, loop: null, sparks: edges.map((e) => e.d) };
}

function trunk(block) {
  const [root, ...kids] = block.nodes;
  const sizes = Object.fromEntries(block.nodes.map((n) => [n.id, nodeSize(n)]));
  const edgeTo = Object.fromEntries(block.edges.map((e) => [e.to, e]));
  const rs = sizes[root.id];
  const pos = {};
  pos[root.id] = { x: 1, y: 1, w: rs.w, h: rs.h, cx: 1 + rs.w / 2, cy: 1 + rs.h / 2 };
  const tx = 22;
  const branch = Math.max(48, ...kids.map((k) => labelW(edgeTo[k.id]?.label))) + 16;
  const kx = tx + branch;
  let y = rs.h + 24;
  kids.forEach((k) => {
    const z = sizes[k.id];
    pos[k.id] = { x: kx, y, w: z.w, h: z.h, cx: kx + z.w / 2, cy: y + z.h / 2 };
    y += z.h + 12;
  });
  const last = pos[kids.at(-1).id];
  const edges = block.edges.map((e, i) => {
    const b = pos[e.to];
    const start = i === 0 ? `M${tx},${rs.h + 1}V${b.cy}` : `M${tx},${b.cy}`;
    return { d: `${start}H${b.x - 2}`, head: [b.x - 2, b.cy, 'right'], a: e.from, b: e.to, label: e.label, lx: tx + 8, ly: b.cy - 6, anchor: 'start', bare: true };
  });
  // the trunk itself
  edges.unshift({ d: `M${tx},${rs.h + 1}V${last.cy}` });
  const width = Math.max(rs.w, kx + Math.max(...kids.map((k) => sizes[k.id].w))) + 2;
  return { kind: 't', width, height: y - 12 + 1, pos, edges, loop: null, spark: `M${tx},${rs.h + 1}V${last.cy}` };
}

// Paint ---------------------------------------------------------------------

function paint(block, plan, aria) {
  const svg = s('svg', {
    viewBox: `0 0 ${plan.width} ${plan.height}`,
    width: plan.width,
    height: plan.height,
    role: 'img',
    'aria-label': aria,
    style: { maxWidth: '100%', width: `${plan.width}px` },
  });

  const edges = s('g', { class: 'fl-edges' });
  const labels = s('g', { class: 'fl-labels' });
  plan.edges.forEach((e, i) => {
    const ids = { 'data-a': e.a, 'data-b': e.b };
    edges.append(s('path', { class: 'fl-edge', d: e.d, ...ids, style: { transitionDelay: `${250 + i * 110}ms` } }));
    if (e.head) edges.append(tag(head(e.head, 'fl-head', 350 + i * 110), ids));
    if (e.label) labels.append(tag(edgeLabel(e, 'fl-edge-label', 450 + i * 110), ids));
  });
  if (plan.loop) {
    const l = plan.loop;
    const ids = { 'data-a': l.a, 'data-b': l.b };
    edges.append(s('path', { class: 'fl-edge is-loop', d: l.d, ...ids, style: { transitionDelay: '900ms' } }));
    edges.append(tag(head(l.head, 'fl-head is-loop', 1000), ids));
    if (l.label) labels.append(tag(edgeLabel(l, 'fl-edge-label fl-loop-label', 1000), ids));
  }
  svg.append(edges);

  if (!reducedMotion()) {
    const paths = plan.sparks || (plan.spark ? [plan.spark] : []);
    const dur = Math.max(2.4, plan.width / 140);
    paths.forEach((d, i) => {
      const begin = `${1.2 + i * 0.35}s`;
      const c = s('circle', { class: 'fl-spark', r: 2.25, visibility: 'hidden' });
      c.append(s('set', { attributeName: 'visibility', to: 'visible', begin }));
      c.append(s('animateMotion', { dur: `${dur}s`, begin, repeatCount: 'indefinite', path: d, keyPoints: '0;1', keyTimes: '0;1', calcMode: 'spline', keySplines: '0.65 0 0.35 1' }));
      svg.append(c);
    });
  }

  const nodes = s('g', { class: 'fl-nodes' });
  block.nodes.forEach((n, i) => {
    const p = plan.pos[n.id];
    const g = s('g', { class: `fl-node${n.variant ? ` is-${n.variant}` : ''}`, 'data-id': n.id, style: { transitionDelay: `${i * 90}ms` } });
    g.append(s('rect', { x: p.x + 0.5, y: p.y + 0.5, width: p.w - 1, height: p.h - 1, rx: 2 }));
    const tx = p.x + p.w / 2;
    if (n.sublabel) {
      g.append(s('text', { class: 'fl-label', x: tx, y: p.y + 20, 'text-anchor': 'middle' }, n.label));
      g.append(s('text', { class: 'fl-sub', x: tx, y: p.y + 35, 'text-anchor': 'middle' }, n.sublabel));
    } else {
      g.append(s('text', { class: 'fl-label', x: tx, y: p.y + p.h / 2 + 4, 'text-anchor': 'middle' }, n.label));
    }
    nodes.append(g);
  });
  svg.append(nodes, labels);
  return svg;
}

function tag(el, ids) {
  for (const [k, v] of Object.entries(ids)) if (v != null) el.setAttribute(k, v);
  return el;
}

function head([x, y, dir], cls, delay) {
  const k = HEAD;
  const pts = {
    right: `${x},${y} ${x - k},${y - k * 0.7} ${x - k},${y + k * 0.7}`,
    left: `${x},${y} ${x + k},${y - k * 0.7} ${x + k},${y + k * 0.7}`,
    down: `${x},${y} ${x - k * 0.7},${y - k} ${x + k * 0.7},${y - k}`,
    up: `${x},${y} ${x - k * 0.7},${y + k} ${x + k * 0.7},${y + k}`,
  }[dir];
  return s('polygon', { class: cls, points: pts, style: { transitionDelay: `${delay}ms` } });
}

function edgeLabel(e, cls, delay) {
  const g = s('g', { style: { transitionDelay: `${delay}ms` } });
  const w = labelW(e.label);
  const anchor = e.anchor || 'middle';
  const bx = anchor === 'middle' ? e.lx - w / 2 : e.lx - 4;
  if (!e.bare) g.append(s('rect', { class: 'fl-edge-label-bg', x: bx, y: e.ly - 9, width: w, height: 12, style: { transitionDelay: `${delay}ms` } }));
  g.append(s('text', { class: cls, x: e.lx, y: e.ly, 'text-anchor': anchor, style: { transitionDelay: `${delay}ms` } }, e.label));
  return g;
}

function measureEdges(root) {
  for (const p of root.querySelectorAll('.fl-edge')) {
    try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch { /* not rendered yet */ }
  }
}

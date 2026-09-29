// The map: every node in the content graph as a constellation, laid out once
// by a small seeded force simulation. The visitor's route is drawn across it
// as they go — the landing's "system under the surface", now theirs.
//
// createMap(content) → { el, visit(id), snapshot() }
//   el        the SVG for the rail (click a point to go there)
//   visit     marks a node visited/current and draws the new leg of the route
//   snapshot  a static copy of the route for the brief

import { s } from './dom.js';

const W = 224, H = 176, PAD = 12;

export function createMap(content, { onPick } = {}) {
  const ids = Object.keys(content.nodes);
  const edges = graphEdges(content, ids);
  const pos = layout(ids, edges);

  const svg = s('svg', { class: 'map', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Map of every topic, with your route through them' });
  const gEdges = s('g', { class: 'map-edges' });
  for (const [a, b] of edges) gEdges.append(s('line', { x1: pos[a].x, y1: pos[a].y, x2: pos[b].x, y2: pos[b].y, 'data-a': a, 'data-b': b }));
  const gRoute = s('g', { class: 'map-route' });
  const gNodes = s('g', { class: 'map-nodes' });
  const dots = {};
  for (const id of ids) {
    const c = s('circle', { cx: pos[id].x, cy: pos[id].y, r: 2, 'data-id': id });
    const hitArea = s('circle', { class: 'map-hit', cx: pos[id].x, cy: pos[id].y, r: 7, 'data-id': id });
    const title = s('title', null, content.nodes[id].label);
    hitArea.append(title);
    dots[id] = c;
    gNodes.append(c, hitArea);
  }
  const label = s('text', { class: 'map-label', x: 0, y: 0 });
  const tip = s('text', { class: 'map-tip', x: 0, y: 0 });
  svg.append(gEdges, gRoute, gNodes, label, tip);

  // Hover: name the point and light its links. Click: go there.
  svg.addEventListener('pointerover', (e) => {
    const id = e.target.dataset?.id;
    if (!id) return;
    place(tip, id, content.nodes[id].label);
    svg.classList.add('is-hover');
    for (const l of gEdges.children) l.classList.toggle('is-lit', l.dataset.a === id || l.dataset.b === id);
  });
  svg.addEventListener('pointerout', (e) => {
    if (!e.target.dataset?.id) return;
    svg.classList.remove('is-hover');
    tip.textContent = '';
    for (const l of gEdges.children) l.classList.remove('is-lit');
  });
  svg.addEventListener('click', (e) => {
    const id = e.target.dataset?.id;
    if (id && onPick) onPick(id);
  });

  function place(textEl, id, str) {
    const { x, y } = pos[id];
    const right = x < W * 0.6;
    textEl.setAttribute('x', right ? x + 7 : x - 7);
    textEl.setAttribute('y', y + 3);
    textEl.setAttribute('text-anchor', right ? 'start' : 'end');
    textEl.textContent = str;
  }

  const route = [];
  function visit(id) {
    if (!pos[id]) return;
    const prev = route.at(-1);
    if (prev === id) return;
    route.push(id);
    for (const c of Object.values(dots)) c.classList.remove('is-current');
    dots[id].classList.add('is-visited', 'is-current');
    place(label, id, content.nodes[id].label);
    if (prev) {
      const a = pos[prev], b = pos[id];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const seg = s('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: { '--len': len } });
      gRoute.append(seg);
      requestAnimationFrame(() => requestAnimationFrame(() => seg.classList.add('is-drawn')));
    }
  }

  function reset() {
    route.length = 0;
    gRoute.replaceChildren();
    for (const c of Object.values(dots)) c.classList.remove('is-visited', 'is-current');
    label.textContent = '';
  }

  // A static print of the route, for the brief.
  function snapshot() {
    const out = s('svg', { class: 'map is-print', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Route: ${route.map((id) => content.nodes[id].label).join(' → ') || 'not started'}` });
    const ge = s('g', { class: 'map-edges' });
    for (const [a, b] of edges) ge.append(s('line', { x1: pos[a].x, y1: pos[a].y, x2: pos[b].x, y2: pos[b].y }));
    const gr = s('g', { class: 'map-route' });
    for (let i = 1; i < route.length; i++) {
      const a = pos[route[i - 1]], b = pos[route[i]];
      gr.append(s('line', { class: 'is-drawn', x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: { '--len': Math.hypot(b.x - a.x, b.y - a.y), '--i': i } }));
    }
    const gn = s('g', { class: 'map-nodes' });
    const seen = new Set(route);
    for (const id of ids) gn.append(s('circle', { cx: pos[id].x, cy: pos[id].y, r: 2, class: `${seen.has(id) ? 'is-visited' : ''}${id === route.at(-1) ? ' is-current' : ''}` }));
    out.append(ge, gr, gn);
    return out;
  }

  return { el: svg, visit, reset, snapshot, get route() { return [...route]; } };
}

// Edges: chips, grid cards and parent links, undirected, deduplicated.
function graphEdges(content, ids) {
  const set = new Set();
  const out = [];
  const add = (a, b) => {
    if (!content.nodes[a] || !content.nodes[b] || a === b) return;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (set.has(k)) return;
    set.add(k);
    out.push([a, b]);
  };
  for (const id of ids) {
    const n = content.nodes[id];
    for (const c of n.chips || []) add(id, c.target);
    for (const b of n.blocks || []) if (b.type === 'grid') for (const it of b.items) if (it.target) add(id, it.target);
    if (content.parents[id]) add(id, content.parents[id]);
  }
  return out;
}

// Seeded force layout, then fitted to the box. Deterministic: same map every visit.
function layout(ids, edges) {
  let seed = 0x9e3779b9;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const P = Object.fromEntries(ids.map((id, i) => {
    const a = (i / ids.length) * Math.PI * 2;
    return [id, { x: Math.cos(a) * 60 + rand() * 10, y: Math.sin(a) * 50 + rand() * 10, vx: 0, vy: 0 }];
  }));
  const deg = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const [a, b] of edges) { deg[a]++; deg[b]++; }
  for (let it = 0; it < 420; it++) {
    const cool = 1 - it / 420;
    for (let i = 0; i < ids.length; i++) {
      const p = P[ids[i]];
      for (let j = i + 1; j < ids.length; j++) {
        const q = P[ids[j]];
        let dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx * dx + dy * dy + 0.01;
        const f = 900 / d2;
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        p.vx += dx * f; p.vy += dy * f;
        q.vx -= dx * f; q.vy -= dy * f;
      }
    }
    for (const [a, b] of edges) {
      const p = P[a], q = P[b];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = (d - 30) * 0.04;
      p.vx += (dx / d) * f; p.vy += (dy / d) * f;
      q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
    }
    for (const id of ids) {
      const p = P[id];
      p.vx -= p.x * 0.01; p.vy -= p.y * 0.012;
      p.x += Math.max(-6, Math.min(6, p.vx)) * cool;
      p.y += Math.max(-6, Math.min(6, p.vy)) * cool;
      p.vx *= 0.5; p.vy *= 0.5;
    }
  }
  const xs = ids.map((id) => P[id].x), ys = ids.map((id) => P[id].y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (W - PAD * 2) / (maxX - minX || 1), sy = (H - PAD * 2) / (maxY - minY || 1);
  return Object.fromEntries(ids.map((id) => [id, {
    x: +(PAD + (P[id].x - minX) * sx).toFixed(1),
    y: +(PAD + (P[id].y - minY) * sy).toFixed(1),
  }]));
}

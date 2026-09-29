// The lens.
//
// The landing is a calm field of dots — the business as it looks from the
// surface. Under the pointer, a lens shows what's underneath: a tangle of
// tools, handoffs and re-keyed spreadsheets, and one node where it all snags.
// Find it and the lens locks on. That's the pitch, as an interaction.
//
// Everything is drawn on one canvas. The surface is live (so the dots can bend
// around the lens); the graph under it is pre-rendered once per size/theme.

import { copy } from './copy.js';

const VOCAB = ['inbox', 'CRM', 'invoice', 'approval', 'spreadsheet', 'Monday report', 'PO', 'supplier', 'ERP', 'Slack', 'sign-off', 'reconcile', 'forecast', 'tender', 'CSV export', 'ticket', 'renewal', 're-key', 'shared drive', 'quote', 'chaser', 'dashboard', 'timesheet', 'contract'];
const FAULT_NOTES = ['3 handoffs', '1 spreadsheet', '0 owners'];

export function createLens(canvas, caption) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const captionText = caption?.querySelector('[data-lens-caption-text]');
  if (captionText && !finePointer) captionText.textContent = copy.lens.idleTouch;

  let W = 0, H = 0, dpr = 1, R = 150;
  let colors = {};
  let scene = null;
  let under = null;          // offscreen canvas: the hidden graph
  let raf = 0, running = false, visible = true, paused = false;
  let found = false;

  // Lens position: current, target, and who's driving.
  const lens = { x: 0, y: 0, tx: 0, ty: 0 };
  let driver = 'auto';       // 'auto' | 'pointer'
  let lastPointer = 0;
  const auto = { legs: [], i: 0, t0: 0, from: null };

  // Setup -----------------------------------------------------------------

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    colors = { fg: v('--fg'), fg2: v('--fg-2'), fg3: v('--fg-3'), line: v('--line-2'), accent: v('--accent'), dot: v('--dot'), bg: v('--bg'), mono: v('--font-mono') || 'monospace', display: v('--font-display') || 'serif' };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false; // hidden (session view)
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    R = W < 720 ? Math.round(Math.min(92, W * 0.22)) : Math.round(Math.max(110, Math.min(150, Math.min(W, H) * 0.2)));
    scene = buildScene(W, H);
    under = renderUnder(scene);
    if (!lens.x) { lens.x = lens.tx = W * 0.55; lens.y = lens.ty = H * 0.25; }
    planAuto();
    return true;
  }

  // Scene -------------------------------------------------------------------

  function buildScene(w, h) {
    const rand = mulberry32(0x6d1d);
    const narrow = w < 720;
    const spacing = narrow ? 20 : 24;

    const dots = [];
    const ox = (w % spacing) / 2, oy = (h % spacing) / 2;
    for (let y = oy; y < h; y += spacing) for (let x = ox; x < w; x += spacing) dots.push(x, y);

    // Hidden nodes on a jittered grid.
    const cell = narrow ? 86 : 112;
    const nodes = [];
    for (let gy = cell * 0.5; gy < h; gy += cell) {
      for (let gx = cell * 0.5; gx < w; gx += cell) {
        if (rand() < 0.28) continue;
        nodes.push({ x: gx + (rand() - 0.5) * cell * 0.7, y: gy + (rand() - 0.5) * cell * 0.7, r: 2 + rand() * 1.5, label: null });
      }
    }

    // The fault sits where the headline isn't: upper right on wide screens,
    // upper middle on narrow ones.
    const fx = w * (narrow ? 0.72 : 0.7), fy = narrow ? Math.max(120, h * 0.14) : Math.max(210, h * 0.26);
    if (!nodes.length) nodes.push({ x: fx, y: fy, r: 2, label: null });
    let fault = nodes[0];
    let best = Infinity;
    for (const n of nodes) {
      const d = (n.x - fx) ** 2 + (n.y - fy) ** 2;
      if (d < best) { best = d; fault = n; }
    }
    fault.x = fx; fault.y = fy; fault.fault = true;

    // Labels on a subset, never too close together.
    const words = shuffle([...VOCAB], rand);
    for (const n of nodes) {
      if (n.fault || rand() > 0.42 || !words.length) continue;
      n.label = words.pop();
    }

    // Edges: each node to its 2 nearest; the fault to its 5 nearest.
    const edges = [];
    const key = new Set();
    nodes.forEach((a, i) => {
      const k = a.fault ? 5 : 2;
      nodes
        .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
        .filter((o) => o.j !== i)
        .sort((p, q) => p.d - q.d)
        .slice(0, k)
        .forEach(({ j }) => {
          const id = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (key.has(id)) return;
          key.add(id);
          const b = nodes[j];
          const bend = (rand() - 0.5) * 0.5;
          const mx = (a.x + b.x) / 2 - (b.y - a.y) * bend;
          const my = (a.y + b.y) / 2 + (b.x - a.x) * bend;
          edges.push({ a, b, mx, my, hot: a.fault || b.fault, phase: rand() });
        });
    });

    return { dots, nodes, edges, fault };
  }

  function renderUnder({ nodes, edges }) {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);

    g.lineWidth = 1;
    for (const e of edges) {
      if (e.hot) continue;
      g.strokeStyle = colors.line;
      g.beginPath();
      g.moveTo(e.a.x, e.a.y);
      g.quadraticCurveTo(e.mx, e.my, e.b.x, e.b.y);
      g.stroke();
    }

    g.font = `10px ${colors.mono}`;
    g.textBaseline = 'middle';
    for (const n of nodes) {
      if (n.fault) continue;
      g.fillStyle = colors.bg;
      g.strokeStyle = colors.fg3;
      g.beginPath();
      g.arc(n.x, n.y, n.r + 1.5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (n.label) {
        g.fillStyle = colors.fg2;
        g.fillText(n.label, n.x + n.r + 6, n.y);
      }
    }
    return c;
  }

  // Drawing -----------------------------------------------------------------

  function frame(now) {
    if (!scene) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    const { dots, fault } = scene;

    // Surface: dots bulge away from the lens rim, and tremble near the fault.
    ctx.fillStyle = colors.dot;
    const rim = R * 1.35;
    for (let i = 0; i < dots.length; i += 2) {
      let x = dots[i], y = dots[i + 1];
      const dx = x - lens.x, dy = y - lens.y;
      const d = Math.hypot(dx, dy);
      if (d < R + 1) continue;
      if (d < rim) {
        const push = (1 - (d - R) / (rim - R)) ** 2 * 10;
        x += (dx / d) * push;
        y += (dy / d) * push;
      }
      const fd = Math.hypot(x - fault.x, y - fault.y);
      if (fd < 70 && !reduce.matches) {
        const k = (1 - fd / 70) * 1.6;
        x += Math.sin(t * 7 + y * 0.3) * k;
        y += Math.cos(t * 6 + x * 0.3) * k;
      }
      ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }

    // Under the lens.
    ctx.save();
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = colors.bg;
    ctx.fill();
    ctx.drawImage(under, 0, 0, W, H);
    drawHot(t);
    drawFault(t);
    ctx.restore();

    drawRing(t);
    if (found) drawNote();
  }

  function drawHot(t) {
    const near = R * 2.2;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = colors.accent;
    ctx.setLineDash([3, 5]);
    for (const e of scene.edges) {
      if (!e.hot) continue;
      if (Math.hypot(e.mx - lens.x, e.my - lens.y) > near) continue;
      ctx.lineDashOffset = reduce.matches ? 0 : -(t * 18 + e.phase * 8);
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.quadraticCurveTo(e.mx, e.my, e.b.x, e.b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawFault(t) {
    const f = scene.fault;
    const pulse = reduce.matches ? 0.5 : (t * 0.7) % 1;
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 1 - pulse;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6 + pulse * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

  }

  function drawNote() {
    const f = scene.fault;
    const x0 = f.x + 10, y0 = f.y - 10, x1 = f.x + 34, y1 = f.y - 34;
    ctx.strokeStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 + 12, y1);
    ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    const halo = (text, x, y) => {
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = colors.bg;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    };
    ctx.font = `italic 22px ${colors.display}`;
    ctx.fillStyle = colors.accent;
    halo('the drag', x1 + 18, y1 + 6);
    ctx.font = `10px ${colors.mono}`;
    ctx.fillStyle = colors.fg2;
    FAULT_NOTES.forEach((n, i) => halo(n.toUpperCase(), x1 + 18, y1 + 24 + i * 14));
    ctx.lineWidth = 1;
  }

  function drawRing(t) {
    const c = found ? colors.accent : colors.fg3;
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, R, 0, Math.PI * 2);
    ctx.stroke();

    // Ticks at the cardinal points; they rotate slowly while searching.
    const spin = found || reduce.matches ? 0 : t * 0.25;
    for (let k = 0; k < 4; k++) {
      const a = spin + (k * Math.PI) / 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(lens.x + cx * (R - 7), lens.y + cy * (R - 7));
      ctx.lineTo(lens.x + cx * (R + 7), lens.y + cy * (R + 7));
      ctx.stroke();
    }

    // Readout.
    ctx.font = `10px ${colors.mono}`;
    ctx.fillStyle = c;
    ctx.textBaseline = 'alphabetic';
    if (!found && W < 720) return;
    const label = found ? 'FOUND' : `X ${(lens.x / W).toFixed(2)}  Y ${(lens.y / H).toFixed(2)}`;
    const a = -Math.PI / 4;
    ctx.fillText(label, lens.x + Math.cos(a) * (R + 12), lens.y + Math.sin(a) * (R + 12));
  }

  // Motion ------------------------------------------------------------------

  function planAuto() {
    const f = scene.fault;
    // Waypoints stay in the empty band around the headline, not across it.
    const narrow = W < 720;
    const fp = [f.x / W, f.y / H];
    const pts = (narrow
      ? [[0.3, 0.12], [0.78, 0.1], fp, [0.25, 0.16], [0.6, 0.08], fp]
      : [[0.56, 0.2], [0.9, 0.52], fp, [0.46, 0.14], [0.88, 0.16], fp]
    ).map(([x, y]) => ({ x: x * W, y: y * H, fault: Math.abs(x * W - f.x) < 1 }));
    auto.legs = pts;
    auto.i = 0;
    auto.t0 = performance.now();
    auto.from = { x: lens.x, y: lens.y };
  }

  function stepAuto(now) {
    const leg = auto.legs[auto.i];
    const move = 2600, dwell = leg.fault ? 3200 : 900;
    const e = now - auto.t0;
    if (e < move) {
      const p = ease(e / move);
      lens.tx = auto.from.x + (leg.x - auto.from.x) * p;
      lens.ty = auto.from.y + (leg.y - auto.from.y) * p;
    } else if (e > move + dwell) {
      auto.from = { x: leg.x, y: leg.y };
      auto.i = (auto.i + 1) % auto.legs.length;
      auto.t0 = now;
    }
  }

  function loop(now) {
    raf = 0;
    if (!running) return;
    if (driver === 'pointer' && now - lastPointer > 6000) {
      driver = 'auto';
      auto.from = { x: lens.x, y: lens.y };
      auto.t0 = now;
    }
    if (driver === 'auto') stepAuto(now);
    const k = driver === 'pointer' ? 0.18 : 0.12;
    lens.x += (lens.tx - lens.x) * k;
    lens.y += (lens.ty - lens.y) * k;
    updateFound();
    frame(now);
    raf = requestAnimationFrame(loop);
  }

  function updateFound() {
    const d = Math.hypot(lens.x - scene.fault.x, lens.y - scene.fault.y);
    const was = found;
    if (!found && d < R * 0.42) found = true;
    else if (found && d > R * 0.62) found = false;
    if (found !== was && caption) {
      caption.classList.toggle('is-found', found);
      if (captionText) captionText.textContent = found ? copy.lens.found : finePointer ? copy.lens.idle : copy.lens.idleTouch;
    }
  }

  function start() {
    if (running || paused || !visible) return;
    if (!scene && !resize()) return;
    if (reduce.matches) return still();
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Reduced motion: one frame, lens parked on the fault.
  function still() {
    if (!scene) return;
    lens.x = lens.tx = scene.fault.x - R * 0.15;
    lens.y = lens.ty = scene.fault.y + R * 0.1;
    updateFound();
    frame(0);
  }

  // Input -------------------------------------------------------------------

  function onPointer(e) {
    if (paused) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    if (e.pointerType === 'touch' && e.type === 'pointermove' && e.buttons === 0) return;
    driver = 'pointer';
    lastPointer = performance.now();
    lens.tx = x;
    lens.ty = y;
    if (reduce.matches) { lens.x = x; lens.y = y; updateFound(); frame(0); }
  }
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!resize()) return;
      if (!running) reduce.matches ? still() : frame(performance.now());
    }, 60);
  }).observe(canvas);
  reduce.addEventListener?.('change', () => { stop(); start(); });

  readColors();
  resize();
  document.fonts?.ready.then(() => { if (scene) under = renderUnder(scene); });
  start();

  return {
    pause() { paused = true; stop(); },
    resume() { paused = false; start(); },
    refresh() { readColors(); if (!scene) return; under = renderUnder(scene); if (!running) reduce.matches ? still() : frame(performance.now()); },
  };
}

// Utils ---------------------------------------------------------------------

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

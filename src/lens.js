// The lens.
//
// The landing is a calm field of dots — the business as it looks from the
// surface. Under the pointer, a lens shows what's underneath: a tangle of
// tools, handoffs and re-keyed spreadsheets, and one node where it all snags.
// Find it and the lens locks on. Choose a question and the lens opens to fill
// the screen while the tangle straightens onto a grid: "then I fix it".
//
// Phases:  boot → live → fix
//   boot  the dot field ripples out from the word "see"; the lens irises open
//   live  one short demonstration (the lens finds the fault by itself), then it
//         follows the pointer, with a magnetic lock on the fault
//   fix   the lens covers the screen and the graph untangles; resolves a promise
//
// Two canvases. The surface is drawn once per size/theme onto the base canvas.
// A transparent overlay repaints only what moves (dirty rects), so in the live
// phase the cost scales with the lens, not the screen.

import { copy } from './copy.js';
import { sfx } from './sound.js';
import { motion } from './prefs.js';

const VOCAB = ['inbox', 'CRM', 'invoice', 'approval', 'spreadsheet', 'Monday report', 'PO', 'supplier', 'ERP', 'Slack', 'sign-off', 'reconcile', 'forecast', 'tender', 'CSV export', 'ticket', 'renewal', 're-key', 'shared drive', 'quote', 'chaser', 'dashboard', 'timesheet', 'contract'];

const BOOT_MS = 1000;
// One thing at a time: the headline rises first (about 1.4 s, styles/main.css),
// then the dots ripple out and the lens opens. Keep the whole sequence under
// 5 s (WCAG 2.2.2): wait + boot + search legs + lock is about 4.5 s.
const BOOT_WAIT = 1100;
const FIX_MS = 950;
const PING_SPEED = 1500; // px/s

export function createLens(canvas, caption, { onFrame } = {}) {
  const base = canvas.getContext('2d');
  const overlay = document.createElement('canvas');
  overlay.className = canvas.className;
  overlay.setAttribute('aria-hidden', 'true');
  canvas.after(overlay);
  const ctx = overlay.getContext('2d');
  let dirty = [];            // rects painted last frame, cleared next frame
  const mark = (x, y, w, h) => dirty.push([x, y, w, h]);
  // Motion modes (prefs.js):
  //   full  boot, one demonstration and interaction. Everything that starts by
  //         itself is over in under 5 seconds (WCAG 2.2.2), then the loop sleeps
  //         until the visitor moves the pointer.
  //   calm  no boot, no demonstration: the lens is parked on the fault and only
  //         follows the pointer while you move it.
  //   off   jumps without easing.
  // `reduce.matches` = "no decorative animation".
  const reduce = { get matches() { return motion() !== 'full'; } };
  const calm = () => motion() === 'calm';
  const finePointer = matchMedia('(pointer: fine)').matches;
  const captionText = caption?.querySelector('[data-lens-caption-text]');
  if (captionText && !finePointer) captionText.textContent = copy.lens.idleTouch;

  let W = 0, H = 0, dpr = 1, R = 150;
  let colors = {};
  let scene = null;
  let under = null;          // offscreen canvas: the hidden graph
  let raf = 0, running = false, visible = true, paused = false;

  let phase = motion() === 'full' ? 'boot' : 'live';
  let bootT0 = performance.now() + BOOT_WAIT;
  let r = motion() === 'full' ? 0 : 1, rv = 0;   // drawn radius as a fraction of R, and its velocity
  let rTarget = 1;                          // < 1 while the pointer is over something clickable
  let last = performance.now();

  let found = false, foundT = -1e9, foundAmt = 0, lastFoundPing = -1e9;
  let tick = 0;              // tick-mark angle
  const pings = [];
  const fix = { t0: 0, from: 0, done: null };

  // Lens position: current, target, and who's driving.
  const lens = { x: 0, y: 0, tx: 0, ty: 0 };
  const pointer = { x: 0, y: 0 };
  let driver = 'auto';       // 'auto' (the demonstration) | 'pointer' | 'home' (gliding back to the fault) | 'rest'
  let lastPointer = 0;
  const auto = { legs: [], i: 0, t0: 0, from: null };

  // Setup -----------------------------------------------------------------

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    colors = { fg: v('--fg'), fg2: v('--fg-2'), fg3: v('--fg-3'), line: v('--line-2'), accent: v('--accent'), dot: v('--dot'), bg: v('--bg'), mono: v('--font-mono') || 'monospace', sans: v('--font-sans') || 'sans-serif', voice: v('--font-voice') || 'serif', display: v('--font-display') || 'serif' };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false; // hidden (session view)
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    // Cap the backing store at ~6 MP: two full-screen canvases at 2× on a 1440p
    // display would otherwise be 30 MP of texture for a field of 1.6px dots.
    dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(6e6 / (W * H)));
    canvas.width = overlay.width = Math.round(W * dpr);
    canvas.height = overlay.height = Math.round(H * dpr);
    dirty = [];
    const rMax = W < 720 ? Math.round(Math.min(92, W * 0.22)) : Math.round(Math.max(110, Math.min(150, Math.min(W, H) * 0.2)));
    const obs = obstacles();
    const spot = placeFault(rMax, obs);
    R = spot.r;
    scene = buildScene(W, H, spot.x, spot.y);
    scene.free = freeSpots(obs);
    scene.origin = bootOrigin();
    under = renderUnder(scene);
    if (phase !== 'boot') drawSurface();
    else base.clearRect(0, 0, canvas.width, canvas.height);
    const first = !lens.x;
    planAuto();
    if (first) {
      lens.x = lens.tx = pointer.x = auto.legs[0].x;
      lens.y = lens.ty = pointer.y = auto.legs[0].y;
      auto.from = { x: lens.x, y: lens.y };
      auto.i = 1;
    } else if (driver === 'rest' || driver === 'home') {
      lens.tx = scene.fault.x;
      lens.ty = scene.fault.y;
      if (!reduce.matches) wake();
    }
    return true;
  }

  // The boot ripple starts from the italic "see".
  function bootOrigin() {
    const see = document.querySelector('.landing .display .is-accent');
    const cr = canvas.getBoundingClientRect();
    if (!see) return { x: W * 0.3, y: H * 0.6 };
    const s = see.getBoundingClientRect();
    return { x: s.left + s.width / 2 - cr.left, y: s.top + s.height / 2 - cr.top };
  }

  // Free space -------------------------------------------------------------
  // The fault and the autopilot's route are placed where the lens won't cover
  // words. Measured from the live layout, so it holds at any viewport.

  function obstacles() {
    const cr = canvas.getBoundingClientRect();
    const range = document.createRange();
    const out = [];
    for (const el of document.querySelectorAll(OBSTACLES)) {
      if (el.closest('.xray')) continue;
      let b = el.getBoundingClientRect();
      // Split headline words are mid-animation (transformed); their untransformed
      // wrappers give the real layout.
      const words = el.querySelectorAll('.sw');
      if (words.length) b = union([...words].map((w) => w.getBoundingClientRect()));
      else if (el.matches(TEXTY)) { range.selectNodeContents(el); b = range.getBoundingClientRect(); }
      if (b.width && b.height) out.push({ x: b.left - cr.left - 10, y: b.top - cr.top - 10, w: b.width + 20, h: b.height + 20 });
    }
    return out;
  }

  const hit = (a, obs) => {
    let s = 0;
    for (const b of obs) {
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w > 0 && h > 0) s += w * h;
    }
    return s;
  };
  const lensBox = (x, y, rr) => ({ x: x - rr * 0.86, y: y - rr * 0.86, w: rr * 1.72, h: rr * 1.72 });
  const noteBox = (x, y) => ({ x: x + 8, y: y - 72, w: 180, h: 108 });

  function placeFault(rMax, obs) {
    const px = W * 0.72, py = H * 0.3;
    let best = null;
    for (const rr of [rMax, rMax * 0.86, rMax * 0.74]) {
      for (let y = rr + 12; y <= H - rr - 12; y += 16) {
        for (let x = rr + 12; x <= W - Math.max(rr, 196) - 12; x += 16) {
          const score = hit(lensBox(x, y, rr), obs) + hit(noteBox(x, y), obs);
          const pull = Math.hypot(x - px, y - py) * 0.5;
          const cand = { x, y, r: rr, score, rank: score + pull };
          if (!best || cand.score < best.score || (cand.score === best.score && cand.r === best.r && cand.rank < best.rank)) best = cand;
        }
      }
      if (best && best.score === 0) break;
    }
    return best || { x: px, y: py, r: rMax };
  }

  function freeSpots(obs) {
    const out = [];
    for (let y = R + 12; y <= H - R - 12; y += 24)
      for (let x = R + 12; x <= W - R - 12; x += 24)
        if (hit(lensBox(x, y, R), obs) === 0) out.push({ x, y });
    return out;
  }

  // Scene -------------------------------------------------------------------

  function buildScene(w, h, fx, fy) {
    const rand = mulberry32(0x6d1d);
    const narrow = w < 720;
    const spacing = narrow ? 20 : 24;

    const dots = [];
    const ox = (w % spacing) / 2, oy = (h % spacing) / 2;
    for (let y = oy; y < h; y += spacing) for (let x = ox; x < w; x += spacing) dots.push(x, y);

    // Hidden nodes on a jittered grid; each remembers its cell centre (sx, sy),
    // which is where it snaps to when the system gets fixed.
    const cell = narrow ? 86 : 112;
    const nodes = [];
    for (let gy = cell * 0.5; gy < h; gy += cell) {
      for (let gx = cell * 0.5; gx < w; gx += cell) {
        if (rand() < 0.28) continue;
        nodes.push({ x: gx + (rand() - 0.5) * cell * 0.7, y: gy + (rand() - 0.5) * cell * 0.7, sx: gx, sy: gy, r: 2 + rand() * 1.5, label: null });
      }
    }

    if (!nodes.length) nodes.push({ x: fx, y: fy, sx: fx, sy: fy, r: 2, label: null });
    let fault = nodes[0];
    let best = Infinity;
    for (const n of nodes) {
      const d = (n.x - fx) ** 2 + (n.y - fy) ** 2;
      if (d < best) { best = d; fault = n; }
    }
    fault.x = fx; fault.y = fy; fault.fault = true;

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

    return { dots, nodes, edges, fault, cell };
  }

  function renderUnder({ nodes, edges }) {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    paintGraph(g, nodes, edges, 0, false);
    return c;
  }

  // Paints the graph. u = 0 is the tangle; u = 1 is the fixed grid.
  function paintGraph(g, nodes, edges, u, withHot) {
    const P = (n) => (u ? [n.x + (n.sx - n.x) * u, n.y + (n.sy - n.y) * u] : [n.x, n.y]);
    g.lineWidth = 1;
    g.strokeStyle = colors.line;
    g.beginPath();
    for (const e of edges) {
      if (e.hot && !withHot) continue;
      const [ax, ay] = P(e.a), [bx, by] = P(e.b);
      const mx = e.mx + ((ax + bx) / 2 - e.mx) * Math.max(u, 0) , my = e.my + ((ay + by) / 2 - e.my) * Math.max(u, 0);
      g.moveTo(ax, ay);
      g.quadraticCurveTo(u ? mx : e.mx, u ? my : e.my, bx, by);
    }
    g.stroke();

    g.font = `500 9px ${colors.sans}`;
    if ('letterSpacing' in g) g.letterSpacing = '0.14em';
    g.textBaseline = 'middle';
    for (const n of nodes) {
      if (n.fault && !withHot) continue;
      const [x, y] = P(n);
      g.fillStyle = colors.bg;
      g.strokeStyle = colors.fg3;
      g.beginPath();
      g.arc(x, y, n.r + 1.5, 0, TAU);
      g.fill();
      g.stroke();
      if (n.label) {
        g.fillStyle = colors.fg2;
        g.fillText(n.label.toUpperCase(), x + n.r + 6, y);
      }
    }
  }

  // Drawing -----------------------------------------------------------------

  function drawSurface() {
    base.setTransform(dpr, 0, 0, dpr, 0, 0);
    base.clearRect(0, 0, W, H);
    base.fillStyle = colors.dot;
    const { dots } = scene;
    for (let i = 0; i < dots.length; i += 2) base.fillRect(dots[i] - 0.8, dots[i + 1] - 0.8, 1.6, 1.6);
  }

  function clearDirty() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const [x, y, w, h] of dirty) ctx.clearRect(x, y, w, h);
    dirty = [];
  }

  // Boot: dots arrive on a wavefront from the origin, popping as it passes.
  function drawBoot(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { dots, origin: o } = scene;
    const far = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, H - o.y));
    const e = Math.max(0, (now - bootT0) / BOOT_MS);
    const front = easeOut(Math.min(1, e)) * (far + 40);

    ctx.fillStyle = colors.dot;
    const hot = [];
    for (let i = 0; i < dots.length; i += 2) {
      const x = dots[i], y = dots[i + 1];
      const d = Math.hypot(x - o.x, y - o.y);
      if (d > front) continue;
      const age = front - d;
      if (age < 36) { hot.push(x, y, 1 - age / 36); continue; }
      ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }
    ctx.fillStyle = colors.accent;
    for (let i = 0; i < hot.length; i += 3) {
      const s = 1.6 + hot[i + 2] * 2;
      ctx.globalAlpha = 0.35 + hot[i + 2] * 0.65;
      ctx.fillRect(hot[i] - s / 2, hot[i + 1] - s / 2, s, s);
    }
    ctx.globalAlpha = 0.18 * (1 - Math.min(1, e));
    ctx.strokeStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(o.x, o.y, front, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (e >= 1) {
      phase = 'live';
      drawSurface();
      ctx.clearRect(0, 0, W, H);
      r = 0; rv = 0;
      auto.t0 = now;
      auto.from = { x: lens.x, y: lens.y };
      // One ping once the lens is open, so the visitor knows there's something under here.
      setTimeout(() => ping(lens.x, lens.y, false), 520);
    }
  }

  function frame(now, dt) {
    if (!scene) return;
    if (phase === 'boot') return drawBoot(now);
    clearDirty();
    if (phase === 'fix') return drawFix(now);

    const t = now / 1000;
    const { dots, fault } = scene;
    const RR = R * Math.max(0, r);
    const rim = RR * 1.35;
    const FR = 72;
    const tremble = !reduce.matches;

    // Sonar pings: a band that sweeps the screen, briefly revealing the graph.
    drawPings(now);

    // Patch out the static dots wherever the surface moves…
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    if (RR > 1) {
      ctx.arc(lens.x, lens.y, rim + 1, 0, TAU);
      mark(lens.x - rim - 3, lens.y - rim - 3, rim * 2 + 6, rim * 2 + 6);
    }
    if (tremble) {
      ctx.moveTo(fault.x + FR, fault.y);
      ctx.arc(fault.x, fault.y, FR, 0, TAU);
      mark(fault.x - FR - 4, fault.y - FR - 4, FR * 2 + 8, FR * 2 + 8);
    }
    ctx.fill();

    // …and redraw those dots moved: bulging off the lens rim, trembling over the fault.
    ctx.fillStyle = colors.dot;
    const rim2 = (rim + 1) ** 2, fr2 = FR * FR;
    for (let i = 0; i < dots.length; i += 2) {
      const x0 = dots[i], y0 = dots[i + 1];
      const dx = x0 - lens.x, dy = y0 - lens.y;
      const d2 = dx * dx + dy * dy;
      const nearFault = tremble && (x0 - fault.x) ** 2 + (y0 - fault.y) ** 2 < fr2;
      if (d2 >= rim2 && !nearFault) continue;
      const d = Math.sqrt(d2);
      if (d < RR + 1) continue;
      let x = x0, y = y0;
      if (d < rim && RR > 1) {
        const push = (1 - (d - RR) / (rim - RR)) ** 2 * 10;
        x += (dx / d) * push;
        y += (dy / d) * push;
      }
      if (nearFault) {
        const k = (1 - Math.hypot(x - fault.x, y - fault.y) / FR) * (1.6 + foundAmt * 0.8);
        if (k > 0) {
          x += Math.sin(t * 7 + y * 0.3) * k;
          y += Math.cos(t * 6 + x * 0.3) * k;
        }
      }
      ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }

    if (RR < 1) return;

    // Under the lens.
    ctx.save();
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, RR, 0, TAU);
    ctx.clip();
    blitUnder(lens.x - RR, lens.y - RR, RR * 2, RR * 2);
    drawHot(t);
    drawFault(t);
    const since = (now - foundT) / 1000;
    if (found && since < 0.7 && !reduce.matches) {
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.16 * Math.exp(-since * 6);
      ctx.fillRect(lens.x - RR, lens.y - RR, RR * 2, RR * 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    drawRing(t, dt, RR);
    if (found) drawNote(since);
  }

  function blitUnder(x, y, w, h) {
    const sx = Math.max(0, x), sy = Math.max(0, y);
    const sw = Math.min(W, x + w) - sx, sh = Math.min(H, y + h) - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(under, sx * dpr, sy * dpr, sw * dpr, sh * dpr, sx, sy, sw, sh);
  }

  function ping(x, y, accent) {
    if (motion() === 'off' || phase !== 'live') return;
    pings.push({ x, y, t0: performance.now(), accent, max: Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 40 });
    sfx(accent ? 'ping-accent' : 'ping');
    wake();
    if (pings.length > 4) pings.shift();
  }

  function drawPings(now) {
    const BAND = 56;
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i];
      const rad = Math.max(0, ((now - p.t0) / 1000) * PING_SPEED);
      if (rad > p.max) { pings.splice(i, 1); continue; }
      const a = 1 - rad / p.max;
      const inner = Math.max(0, rad - BAND);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, TAU);
      if (inner > 0) ctx.arc(p.x, p.y, inner, 0, TAU, true);
      ctx.clip();
      ctx.globalAlpha = 0.9 * a;
      ctx.fillStyle = colors.bg;
      ctx.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
      blitUnder(p.x - rad, p.y - rad, rad * 2, rad * 2);
      ctx.restore();
      ctx.globalAlpha = (p.accent ? 0.7 : 0.4) * a;
      ctx.strokeStyle = p.accent ? colors.accent : colors.fg3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const bx = Math.max(0, p.x - rad - 2), by = Math.max(0, p.y - rad - 2);
      mark(bx, by, Math.min(W, p.x + rad + 2) - bx, Math.min(H, p.y + rad + 2) - by);
    }
  }

  function drawHot(t) {
    const near = R * 2.2;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = colors.accent;
    ctx.setLineDash([3, 5]);
    for (const e of scene.edges) {
      if (!e.hot) continue;
      if (Math.hypot(e.mx - lens.x, e.my - lens.y) > near) continue;
      ctx.lineDashOffset = reduce.matches ? 0 : -(t * (18 + foundAmt * 30) + e.phase * 8);
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.quadraticCurveTo(e.mx, e.my, e.b.x, e.b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawFault(t) {
    const f = scene.fault;
    const rate = 0.7 + foundAmt * 0.8;
    const pulse = reduce.matches ? 0.5 : (t * rate) % 1;
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 1 - pulse;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6 + pulse * (22 + foundAmt * 14), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4.5 + foundAmt * 1.5, 0, TAU);
    ctx.fill();
  }

  // The annotation draws itself: leader line, then the words type in.
  function drawNote(since) {
    const f = scene.fault;
    const s = reduce.matches ? 9 : since;
    mark(f.x, f.y - 70, 190, 110);
    const x0 = f.x + 10, y0 = f.y - 10, x1 = f.x + 34, y1 = f.y - 34;
    const p = clamp01(s / 0.28);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const seg1 = Math.min(1, p * 1.6), seg2 = clamp01(p * 1.6 - 1);
    ctx.lineTo(x0 + (x1 - x0) * seg1, y0 + (y1 - y0) * seg1);
    if (seg2 > 0) ctx.lineTo(x1 + 12 * seg2, y1);
    ctx.stroke();
    if (s < 0.28) return;

    ctx.textBaseline = 'alphabetic';
    const halo = (text, x, y) => {
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = colors.bg;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    };
    const typed = (str, t0) => str.slice(0, Math.max(0, Math.floor((s - t0) / 0.028)));
    // A paper plate behind the words, so the lines under the lens never run through them.
    ctx.font = `500 9px ${colors.sans}`;
    const lines = (copy.lens.noteLines || []).map((n) => n.toUpperCase());
    const plateW = Math.max(ctx.measureText(copy.lens.note || '').width * 1.9, ...lines.map((n) => ctx.measureText(n).width)) + 10;
    const plateH = 30 + lines.length * 14;
    ctx.globalAlpha = 0.86 * clamp01((s - 0.28) / 0.2);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(x1 + 12, y1 - 16, plateW, plateH);
    ctx.globalAlpha = 1;
    mark(x1 + 12, y1 - 16, plateW, plateH);
    ctx.font = `italic 26px ${colors.display}`;
    ctx.fillStyle = colors.accent;
    halo(typed(copy.lens.note || '', 0.28), x1 + 18, y1 + 6);
    ctx.font = `500 9px ${colors.sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.22em';
    ctx.fillStyle = colors.fg2;
    lines.forEach((n, i) => halo(typed(n, 0.5 + i * 0.16), x1 + 18, y1 + 24 + i * 14));
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.lineWidth = 1;
  }

  function drawRing(t, dt, RR) {
    const c = found ? colors.accent : colors.fg3;
    ctx.strokeStyle = c;
    ctx.lineWidth = 1 + foundAmt * 0.5;
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, RR, 0, TAU);
    ctx.stroke();

    // Ticks: spin while searching, settle onto the diagonals when locked.
    if (reduce.matches) tick = found ? Math.PI / 4 : 0;
    else if (found) {
      const target = Math.round((tick - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4;
      tick += (target - tick) * Math.min(1, dt * 10);
    } else tick += dt * 0.25;
    const len = 7 + foundAmt * 7;
    for (let k = 0; k < 4; k++) {
      const a = tick + (k * Math.PI) / 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(lens.x + cx * (RR - len), lens.y + cy * (RR - len));
      ctx.lineTo(lens.x + cx * (RR + len), lens.y + cy * (RR + len));
      ctx.stroke();
    }
    // Crosshair when locked.
    if (foundAmt > 0.01) {
      ctx.globalAlpha = foundAmt;
      const f = scene.fault, g = 12 + (1 - foundAmt) * 20;
      ctx.beginPath();
      ctx.moveTo(f.x - g - 8, f.y); ctx.lineTo(f.x - g, f.y);
      ctx.moveTo(f.x + g, f.y); ctx.lineTo(f.x + g + 8, f.y);
      ctx.moveTo(f.x, f.y - g - 8); ctx.lineTo(f.x, f.y - g);
      ctx.moveTo(f.x, f.y + g); ctx.lineTo(f.x, f.y + g + 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 1;

    // Readout.
    // Readout: one word, only when it means something.
    if (!found) return;
    ctx.font = `500 9px ${colors.sans}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.22em';
    ctx.fillStyle = c;
    ctx.textBaseline = 'alphabetic';
    const label = 'FOUND';
    const a = -Math.PI / 4;
    const rx = lens.x + Math.cos(a) * (RR + 14), ry = lens.y + Math.sin(a) * (RR + 14);
    ctx.fillText(label, rx, ry);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    mark(rx - 2, ry - 12, 150, 17);
  }

  // Fix: the lens opens over everything and the tangle snaps onto its grid.
  function drawFix(now) {
    const p = clamp01((now - fix.t0) / (fix.ms || FIX_MS));  // clamped: rAF time can precede t0
    const e = easeInOut(p);
    const u = easeOut(clamp01((p - 0.12) / 0.88));
    const cover = Math.hypot(Math.max(lens.x, W - lens.x), Math.max(lens.y, H - lens.y)) + 20;
    const RR = fix.from + (cover - fix.from) * e;
    ctx.save();
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, RR, 0, TAU);
    ctx.clip();
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    paintGraph(ctx, scene.nodes, scene.edges, u, true);
    // The fault stops pulsing and becomes an ordinary, healthy node.
    const f = scene.fault;
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 1 - e;
    ctx.beginPath();
    ctx.arc(lens.x, lens.y, RR, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    mark(0, 0, W, H);
    if (p >= 1 && fix.done) { const d = fix.done; fix.done = null; d(); }
  }

  // Motion ------------------------------------------------------------------

  // Autopilot route: spread-out free spots, returning to the fault every third leg.
  function planAuto() {
    const f = scene.fault;
    const pool = scene.free.filter((p) => Math.hypot(p.x - f.x, p.y - f.y) > R);
    const picks = [];
    const far = (p) => Math.min(Math.hypot(p.x - f.x, p.y - f.y), ...picks.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
    while (picks.length < 4 && pool.length) {
      pool.sort((a, b) => far(b) - far(a));
      picks.push(pool.shift());
    }
    while (picks.length < 4) picks.push({ x: f.x + (picks.length % 2 ? -1 : 1) * R * 0.5, y: f.y + R * 0.3 });
    const home = { x: f.x, y: f.y, fault: true };
    // One pass: a look somewhere else, then straight to the fault.
    auto.legs = [{ ...picks[0], move: 600 }, { ...home, move: 900 }];
    // Re-planned on resize and when fonts land: keep the demonstration's clock.
    if (!auto.t0) { auto.i = 0; auto.t0 = performance.now(); auto.from = { x: lens.x, y: lens.y }; }
  }

  function stepAuto(now) {
    const leg = auto.legs[auto.i];
    if (!leg) { driver = 'rest'; return; }
    const move = leg.move || 1000;
    const e = now - auto.t0;
    const p = easeInOut(clamp01(e / move));
    lens.tx = auto.from.x + (leg.x - auto.from.x) * p;
    lens.ty = auto.from.y + (leg.y - auto.from.y) * p;
    if (e >= move) {
      auto.from = { x: leg.x, y: leg.y };
      auto.i += 1;
      auto.t0 = now;
      if (auto.i >= auto.legs.length) driver = 'rest';
    }
  }

  // The lens has stopped moving, nothing is travelling: the frame is final.
  const noteDone = () => !found || reduce.matches || (performance.now() - foundT) / 1000 > 0.5 + ((copy.lens.noteLines || []).length) * 0.16 + 0.45;
  const settled = () => noteDone() && pings.length === 0 && Math.abs(lens.tx - lens.x) < 0.3 && Math.abs(lens.ty - lens.y) < 0.3 && Math.abs(rTarget - r) < 0.01 && Math.abs(rv) < 0.01 && Math.abs(foundAmt - (found ? 1 : 0)) < 0.01;

  function loop(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (phase === 'live') {
      // Full: when the pointer rests, the lens glides back to the fault once.
      if (!reduce.matches && driver === 'pointer' && now - lastPointer > 2500) {
        driver = 'home';
        lens.tx = scene.fault.x;
        lens.ty = scene.fault.y;
      }
      if (driver === 'auto') { if (!reduce.matches) stepAuto(now); }
      else if (driver === 'pointer') {
        // Magnetic: near the fault, the lens is pulled onto it.
        const f = scene.fault;
        const d = Math.hypot(pointer.x - f.x, pointer.y - f.y);
        const reach = R * 0.85;
        const pull = d < reach ? (1 - d / reach) ** 0.6 * 0.75 : 0;
        lens.tx = pointer.x + (f.x - pointer.x) * pull;
        lens.ty = pointer.y + (f.y - pointer.y) * pull;
      }
      const k = 1 - Math.exp(-dt * (driver === 'pointer' ? 14 : 9));
      lens.x += (lens.tx - lens.x) * k;
      lens.y += (lens.ty - lens.y) * k;

      // Radius spring (iris open, and the kick when it locks on).
      const acc = 180 * (rTarget - r) - 16 * rv;
      rv += acc * dt;
      r += rv * dt;
      foundAmt += ((found ? 1 : 0) - foundAmt) * Math.min(1, dt * 8);
      updateFound(now);
    }
    // Once the lens has settled and nothing is travelling, stop drawing. In full
    // motion, not while the demonstration runs or the pointer might go home.
    const mayRest = calm() || driver === 'rest' || driver === 'home';
    if (phase === 'live' && mayRest && settled()) {
      try { frame(now, dt); emit(); } catch (err) { console.error('[lens]', err); }
      running = false;
      raf = 0;
      return;
    }
    // A bad frame must not kill the loop (and with it the whole landing).
    const t0 = PERF ? performance.now() : 0;
    try { frame(now, dt); emit(); } catch (err) { console.error('[lens]', err); }
    if (PERF) (window.__lensFrames ||= []).push([phase, performance.now() - t0]);
    raf = requestAnimationFrame(loop);
  }

  // Tell listeners (the x-ray type layer) where the lens is.
  function emit() {
    if (!onFrame) return;
    let xr = 0;
    if (phase === 'live') xr = R * Math.max(0, r);
    else if (phase === 'fix') xr = fix.from * (1 - easeOut(clamp01((performance.now() - fix.t0) / ((fix.ms || FIX_MS) * 0.5))));
    onFrame({ x: lens.x, y: lens.y, r: xr, found });
  }

  function updateFound(now) {
    const d = Math.hypot(lens.x - scene.fault.x, lens.y - scene.fault.y);
    const was = found;
    if (!found && d < R * 0.42) found = true;
    else if (found && d > R * 0.62) found = false;
    if (found === was) return;
    if (found) {
      foundT = now;
      sfx('found');
      if (!reduce.matches) rv += 2.2;   // the lens flexes as it locks
      if (now - lastFoundPing > 5000) { lastFoundPing = now; ping(scene.fault.x, scene.fault.y, true); }
    }
    if (caption) {
      caption.classList.toggle('is-found', found);
      if (captionText) captionText.textContent = found ? copy.lens.found : finePointer ? copy.lens.idle : copy.lens.idleTouch;
    }
  }

  function start() {
    if (running || paused || !visible) return;
    if (!scene && !resize()) return;
    if (reduce.matches) return still();
    run();
  }
  function run() {
    if (running || paused || !visible || !scene) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  // The loop sleeps when nothing moves; the visitor doing something wakes it.
  function wake() {
    if (motion() !== 'off' && phase === 'live') run();
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Reduced motion: one frame, lens parked on the fault.
  function still() {
    if (!scene) return;
    phase = 'live';
    r = 1;
    drawSurface();
    lens.x = lens.tx = scene.fault.x - R * 0.15;
    lens.y = lens.ty = scene.fault.y + R * 0.1;
    updateFound(performance.now());
    foundAmt = found ? 1 : 0;
    frame(performance.now(), 0);
    emit();
  }

  // Input -------------------------------------------------------------------

  function onPointer(e) {
    if (paused || phase === 'fix') return;
    const b = canvas.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    if (x < 0 || y < 0 || x > b.width || y > b.height) return;
    if (e.pointerType === 'touch' && e.type === 'pointermove' && e.buttons === 0) return;
    driver = 'pointer';
    lastPointer = performance.now();
    pointer.x = x;
    pointer.y = y;
    if (e.type === 'pointerdown' && !e.target.closest?.('a, button, input, label, kbd')) ping(x, y, false);
    if (motion() === 'off') { lens.x = lens.tx = x; lens.y = lens.ty = y; updateFound(performance.now()); foundAmt = found ? 1 : 0; clearDirty(); frame(performance.now(), 0); emit(); }
    else if (calm()) { lens.tx = x; lens.ty = y; wake(); }
    else wake();
  }
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (phase === 'fix' || !resize()) return;
      if (!running) reduce.matches ? still() : frame(performance.now(), 0);
    }, 60);
  }).observe(canvas);
  document.addEventListener('mu:prefs', (e) => {
    if (e.detail.key !== 'motion' || phase === 'fix') return;
    stop();
    if (phase === 'boot') { phase = 'live'; r = 1; drawSurface(); }
    pings.length = 0;
    dirty = [[0, 0, W, H]];
    start();
  });

  readColors();
  resize();
  // Webfonts change the headline's measure, so re-plan once they land.
  document.fonts?.ready.then(() => { if (phase !== 'fix' && resize() && !running) reduce.matches ? still() : frame(performance.now(), 0); });
  start();

  return {
    pause() { paused = true; stop(); },
    resume() {
      paused = false;
      if (phase === 'fix') { phase = 'live'; r = 0; rv = 0; found = false; foundAmt = 0; dirty = [[0, 0, W, H]]; caption?.classList.remove('is-found'); }
      start();
    },
    refresh() {
      readColors();
      if (!scene) return;
      under = renderUnder(scene);
      if (phase !== 'boot') drawSurface();
      dirty = [[0, 0, W, H]];
      if (!running) reduce.matches ? still() : frame(performance.now(), 0);
    },
    setYield(on) { rTarget = on ? 0.55 : 1; },
    get state() { return { phase, running, found, fault: scene && { x: scene.fault.x, y: scene.fault.y }, R, lens: { x: lens.x, y: lens.y } }; },
    // Resolves when the lens has covered the screen and the graph is straight.
    // ms: the first time it plays in full; after that it's a quick reprise.
    fix(ms = FIX_MS) {
      if (paused || !visible || !scene || reduce.matches || phase !== 'live') return Promise.resolve();
      run(); // the loop may be asleep after the demonstration
      return new Promise((resolve) => {
        phase = 'fix';
        fix.ms = ms;
        sfx('fix');
        fix.t0 = performance.now();
        fix.from = R * Math.max(0.2, r);
        fix.done = resolve;
        pings.length = 0;
      });
    },
  };
}

// Utils ---------------------------------------------------------------------

const TAU = Math.PI * 2;
const PERF = /[?&]perf\b/.test(location.search); // ?perf records frame times in window.__lensFrames
const OBSTACLES = '.landing .eyebrow, .landing .display-line, .landing .land-cue, .lens-caption';
const TEXTY = '.eyebrow, .display-line, .lede';
const union = (rs) => {
  const l = Math.min(...rs.map((r) => r.left)), tp = Math.min(...rs.map((r) => r.top));
  const rt = Math.max(...rs.map((r) => r.right)), bt = Math.max(...rs.map((r) => r.bottom));
  return { left: l, top: tp, width: rt - l, height: bt - tp };
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const easeOut = (p) => 1 - (1 - p) ** 4;

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

// Two interactive blocks. Both explain something by letting the visitor do it,
// and both work with a keyboard, a screen reader, and with motion turned off.
//
//   compare   the same process shown two ways (before / after). Steps that
//             exist in both states move to their new place; steps that go away
//             fade out; new steps grow in. The steps are an ordered list.
//   estimate  what repeated work costs a year, from three numbers the visitor
//             types. Nothing is sent anywhere. The result can be added to the
//             visit summary.

import { h, reducedMotion, motionOff } from './dom.js';
import { sfx } from './sound.js';

let uid = 0;

// Compare -------------------------------------------------------------------

export function compare(block) {
  const id = `cmp-${++uid}`;
  const states = block.states || [];
  let current = block.start ?? 0;

  const caption = h('figcaption', { class: 'cmp-title micro', id: `${id}-t` });
  const list = h('ol', { class: 'cmp-flow', role: 'list', 'aria-labelledby': `${id}-t` });
  const text = h('p', { class: 'cmp-text' });
  const statNum = h('span', { class: 'cmp-stat-num' });
  const statLabel = h('span', { class: 'cmp-stat-label' });
  const stat = h('p', { class: 'cmp-stat' }, statNum, ' ', statLabel);
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  const buttons = states.map((st, i) => h('button', {
    class: 'cmp-btn',
    type: 'button',
    'aria-pressed': String(i === current),
    'aria-controls': `${id}-t`,
    onclick: () => show(i, true),
  }, st.label));
  const thumb = h('span', { class: 'cmp-thumb', 'aria-hidden': 'true' });
  const toggle = h('div', { class: 'cmp-toggle', role: 'group', 'aria-label': block.label || 'Choose a view' }, thumb, buttons);

  const el = h('figure', { class: 'b-compare', style: { '--n': states.length } },
    h('div', { class: 'cmp-head' }, toggle, caption),
    list, stat, text, live,
  );

  function stepEl(node, i) {
    return h('li', { class: `cmp-step${node.variant ? ` is-${node.variant}` : ''}`, 'data-key': node.id, style: { '--i': i } },
      i > 0 && h('span', { class: 'cmp-arrow', 'aria-hidden': 'true' }, node.via && h('span', { class: 'cmp-via' }, node.via)),
      node.via && h('span', { class: 'visually-hidden' }, `${node.via}: `),
      h('span', { class: 'cmp-box' }, node.label),
    );
  }

  function render(i) {
    const st = states[i];
    caption.textContent = st.title || st.label;
    list.replaceChildren(...st.nodes.map(stepEl));
    text.textContent = st.text || '';
    text.hidden = !st.text;
    stat.hidden = !st.stat;
    if (st.stat) { statNum.textContent = st.stat.value; statLabel.textContent = st.stat.label; }
    buttons.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    el.style.setProperty('--at', i);
    el.dataset.state = st.key || i;
  }

  // FLIP: measure, swap, measure again, then animate from the old place.
  function show(i, user) {
    if (i === current) return;
    const animate = !reducedMotion() && el.isConnected;
    const before = new Map();
    if (animate) for (const li of list.children) before.set(li.dataset.key, { box: li.querySelector('.cmp-box').getBoundingClientRect(), li });
    const listBox = list.getBoundingClientRect();
    const oldNum = Number(statNum.textContent);
    const ghosts = [];
    if (animate) {
      // Steps that disappear: keep a copy in place and fade it out.
      const nextKeys = new Set(states[i].nodes.map((n) => n.id));
      for (const [key, { box }] of before) {
        if (nextKeys.has(key)) continue;
        const g = before.get(key).li.querySelector('.cmp-box').cloneNode(true);
        g.classList.add('cmp-ghost');
        Object.assign(g.style, { left: `${box.left - listBox.left}px`, top: `${box.top - listBox.top}px`, width: `${box.width}px`, height: `${box.height}px` });
        ghosts.push(g);
      }
    }
    current = i;
    render(i);
    live.textContent = `${states[i].label}. ${states[i].title || ''} ${states[i].stat ? `${states[i].stat.value} ${states[i].stat.label}.` : ''}`.trim();
    if (user) sfx('tick');
    if (!animate) return;

    list.append(...ghosts);
    ghosts.forEach((g) => g.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.86)' }], { duration: 320, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }).finished.then(() => g.remove()));

    [...list.querySelectorAll('.cmp-step')].forEach((li, n) => {
      const box = li.querySelector('.cmp-box');
      const was = before.get(li.dataset.key);
      const now = box.getBoundingClientRect();
      if (was) {
        const dx = was.box.left - now.left, dy = was.box.top - now.top;
        const sx = was.box.width / now.width;
        box.animate([
          { transform: `translate(${dx}px, ${dy}px) scaleX(${sx})`, transformOrigin: 'left center' },
          { transform: 'none', transformOrigin: 'left center' },
        ], { duration: 620, easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)' });
      } else {
        box.animate([{ opacity: 0, transform: 'scale(0.6)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 520, delay: 160 + n * 40, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
      }
      const arrow = li.querySelector('.cmp-arrow');
      arrow?.animate([{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 420, delay: 260 + n * 60, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
    });
    const newNum = Number(statNum.textContent);
    if (Number.isFinite(oldNum) && Number.isFinite(newNum) && oldNum !== newNum) tween(statNum, oldNum, newNum, 520, (v) => String(Math.round(v)));
    text.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
  }

  render(current);
  return el;
}

// Estimate ------------------------------------------------------------------

const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const fmtWeeks = (w) => (w < 10 ? (Math.round(w * 10) / 10).toLocaleString('en-GB') : NUM.format(Math.round(w)));

export function estimate(block, ctx) {
  const id = `est-${++uid}`;
  const weeks = block.weeksPerYear ?? 46;
  const weekHours = block.hoursPerWeek ?? 37.5;
  const maxCells = block.maxCells ?? 230;
  const L = block.labels || {};
  const values = Object.fromEntries(block.inputs.map((f) => [f.key, f.value]));
  const shown = { hours: 0, cost: 0 };

  const fields = block.inputs.map((f) => {
    const input = h('input', {
      id: `${id}-${f.key}`, class: 'est-input', type: 'number', inputmode: 'decimal',
      min: f.min, max: f.max, step: f.step ?? 1, value: f.value,
      'aria-describedby': `${id}-${f.key}-hint`,
    });
    const hint = h('span', { class: 'est-hint', id: `${id}-${f.key}-hint` }, f.hint || `A number from ${f.min} to ${f.max}.`);
    const bump = (dir) => {
      const step = Number(f.step ?? 1);
      const v = clamp((Number(input.value) || f.value) + dir * step, f.min, f.max);
      input.value = String(Math.round(v * 100) / 100);
      update(f, input, hint);
    };
    input.addEventListener('input', () => update(f, input, hint));
    input.addEventListener('change', () => {
      const v = Number(input.value);
      if (input.value !== '' && Number.isFinite(v)) { input.value = String(clamp(v, f.min, f.max)); update(f, input, hint); }
    });
    return h('div', { class: 'est-field' },
      h('label', { class: 'est-label', for: input.id }, f.label),
      h('div', { class: 'est-control' },
        h('button', { class: 'est-step', type: 'button', 'aria-label': f.less || `Less: ${f.label}`, onclick: () => bump(-1) }, '−'),
        f.prefix && h('span', { class: 'est-prefix', 'aria-hidden': 'true' }, f.prefix),
        input,
        h('button', { class: 'est-step', type: 'button', 'aria-label': f.more || `More: ${f.label}`, onclick: () => bump(1) }, '+'),
      ),
      hint,
    );
  });

  // Plain spans, not <output>: <output> is a live region and would announce
  // every frame of the count. The debounced `live` paragraph speaks instead.
  const hoursOut = h('span', { class: 'est-num' });
  const costOut = h('span', { class: 'est-num is-accent' });
  const weeksOut = h('span', { class: 'est-weeks-num' });
  const grid = h('div', { class: 'est-grid', 'aria-hidden': 'true' });
  const more = h('span', { class: 'est-more micro', 'aria-hidden': 'true' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const addBtn = ctx?.addEstimate && h('button', { class: 'btn btn-primary est-add', type: 'button' }, block.addLabel, h('span', { 'aria-hidden': 'true' }, '→'));
  const addNote = h('p', { class: 'est-added', role: 'status' });

  for (let i = 0; i < maxCells; i++) grid.append(h('i', { style: { '--i': i } }));

  const el = h('section', { class: 'b-estimate', 'aria-labelledby': `${id}-title` },
    h('h3', { class: 'est-title micro', id: `${id}-title` }, block.title),
    h('div', { class: 'est-body' },
      h('div', { class: 'est-fields' }, fields),
      h('div', { class: 'est-results' },
        h('dl', { class: 'est-dl' },
          h('div', null, h('dt', { class: 'micro' }, L.hours || 'Hours a year'), h('dd', null, hoursOut)),
          h('div', null, h('dt', { class: 'micro' }, L.cost || 'Cost a year'), h('dd', null, costOut)),
        ),
        h('p', { class: 'est-weeks' }, L.weeksBefore || 'The same as', ' ', weeksOut, ' ', L.weeksAfter || 'full working weeks.'),
        h('div', { class: 'est-grid-wrap' }, grid, more),
        h('p', { class: 'est-key' }, L.key || `Each square is one working week of ${weekHours} hours.`),
      ),
    ),
    block.note && h('p', { class: 'est-note' }, block.note),
    addBtn && h('div', { class: 'est-actions' }, addBtn, addNote),
    live,
  );

  let liveTimer = 0, lastSummary = '';
  function result() {
    const hours = values.people * values.hours * weeks;
    return { hours, cost: hours * values.rate, weeks: hours / weekHours };
  }
  function summary() {
    const r = result();
    return (block.summary || '{people} people, {hours} hours a week each, £{rate} an hour: about {totalHours} hours and {totalCost} a year.')
      .replace('{people}', NUM.format(values.people))
      .replace('{hours}', values.hours.toLocaleString('en-GB'))
      .replace('{rate}', NUM.format(values.rate))
      .replace('{totalHours}', NUM.format(Math.round(r.hours)))
      .replace('{totalCost}', GBP.format(Math.round(r.cost)))
      .replace('{weeks}', fmtWeeks(r.weeks));
  }

  function update(f, input, hint) {
    if (f) {
      const v = Number(input.value);
      const ok = input.value !== '' && Number.isFinite(v) && v >= f.min && v <= f.max;
      input.setAttribute('aria-invalid', String(!ok));
      hint.classList.toggle('is-error', !ok);
      if (!ok) return;
      values[f.key] = v;
    }
    const r = result();
    const animate = !reducedMotion() && el.isConnected && f;
    if (animate) {
      tween(hoursOut, shown.hours, r.hours, 480, (v) => NUM.format(Math.round(v)));
      tween(costOut, shown.cost, r.cost, 480, (v) => GBP.format(Math.round(v)));
    } else {
      hoursOut.textContent = NUM.format(Math.round(r.hours));
      costOut.textContent = GBP.format(Math.round(r.cost));
    }
    shown.hours = r.hours;
    shown.cost = r.cost;
    weeksOut.textContent = fmtWeeks(r.weeks);
    const n = Math.min(maxCells, Math.round(r.weeks));
    const cells = grid.children;
    const prevOn = Number(grid.dataset.on || 0);
    // Show whole rows only: at least two (one person's working year), more as needed.
    const perRow = block.cellsPerRow ?? 23;
    const rows = Math.max(2, Math.ceil(n / perRow));
    for (let i = 0; i < cells.length; i++) {
      const on = i < n;
      cells[i].hidden = i >= rows * perRow;
      // Stagger only the cells that change, starting from the edge that moved.
      cells[i].style.setProperty('--d', animate ? `${Math.min(28, Math.abs(i - prevOn)) * 12}ms` : '0ms');
      cells[i].classList.toggle('is-on', on);
    }
    grid.dataset.on = n;
    more.textContent = r.weeks > maxCells ? (L.more || '+ {n} more').replace('{n}', NUM.format(Math.round(r.weeks) - maxCells)) : '';
    if (addBtn) { addBtn.disabled = false; addNote.textContent = ''; }
    // Screen readers hear the result once the visitor stops typing.
    clearTimeout(liveTimer);
    if (f) liveTimer = setTimeout(() => { const s = summary(); if (s !== lastSummary) live.textContent = lastSummary = s; }, 800);
  }

  addBtn?.addEventListener('click', () => {
    ctx.addEstimate(summary());
    addBtn.disabled = true;
    addNote.textContent = block.added || 'Added to your summary.';
    sfx('found');
  });

  update();
  return el;
}

// Helpers -------------------------------------------------------------------

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const tweens = new WeakMap();

function tween(node, from, to, ms, fmt) {
  if (motionOff()) { node.textContent = fmt(to); return; }
  cancelAnimationFrame(tweens.get(node));
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    const e = 1 - (1 - p) ** 4;
    node.textContent = fmt(from + (to - from) * e);
    if (p < 1) tweens.set(node, requestAnimationFrame(step));
  };
  tweens.set(node, requestAnimationFrame(step));
}

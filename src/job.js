// Step 1, the job: a bench (DESIGN.md › The page). The visitor taps; nobody types.
//
// Without JavaScript nothing here runs: the form is a plain GET form to the
// Cal.com page with two text fields. With JavaScript the form goes and the
// bench shows, already set to one example job, so the page shows something
// at once. Left, what the visitor sets: the job, the systems it touches, how
// often, how many people, hours and pay. Right, what it makes: the job as
// Today ⇄ Automated, what they pay and how much of it goes on this job, what
// I would automate first, and the booking. Every tap redraws the right side.
// Every word is in site.json › page.job.decide.

import { renderBlock } from './blocks.js';
import { nearestCase, costOf, composeStates } from './decide.js';

export { nearestCase, costOf };

const NUM = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const fill = (t, vars) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtWeeks = (w) => (w < 10 ? (Math.round(w * 10) / 10).toLocaleString('en-GB') : NUM.format(Math.round(w)));
const reducedMotion = () => document.documentElement.dataset.motion !== 'full';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createJob(root = document, { book } = {}) {
  let cfg = null;
  try { cfg = JSON.parse(root.getElementById('booking-config')?.textContent || 'null')?.job; } catch { cfg = null; }
  const form = root.querySelector('[data-job]');
  const bench = root.querySelector('[data-answer]');
  if (!cfg || !form || !bench) return null;

  const A = cfg.answer || {};
  const D = cfg.decide || {};
  const kinds = D.kinds || {};
  const q = (s) => bench.querySelector(s);
  const part = {
    compare: q('[data-compare]'), firstList: q('[data-first-list]'), nearest: q('[data-answer-nearest]'), live: q('[data-answer-live]'),
    share: q('[data-answer-share]'), pay: q('[data-answer-pay]'), cost: q('[data-answer-cost]'),
    weeks: q('[data-answer-weeks]'), grid: q('[data-answer-grid]'),
  };
  const ask = Object.fromEntries([...bench.querySelectorAll('[data-q]')].map((n) => [n.dataset.q, n]));
  const perRow = 23, maxCells = 230;
  for (let i = 0; i < maxCells; i++) part.grid.append(document.createElement('i'));

  form.remove();
  bench.hidden = false;

  const values = Object.fromEntries(cfg.numbers.map((n) => [n.key, n.value]));
  const inputs = {};
  const start = D.start || {};
  const picked = { kind: start.kind || Object.keys(kinds)[0], systems: null, frequency: start.frequency ?? null, people: start.people ?? null };
  picked.systems = Object.keys(D.systems || {}).filter((k) => (kinds[picked.kind].defaults || []).includes(k));
  // `chosen`: the visitor has tapped or changed something, so the bench now
  // describes their job, not the example. `touched`: they changed a number
  // by hand; taps no longer overwrite it.
  let chosen = false, touched = false;

  // A row of tap options. `many`: several can be on.
  function options(name, list, { many = false } = {}) {
    const box = ask[name].querySelector('[data-opts]');
    const on = [].concat(picked[name] ?? []).map(String);
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', ask[name].querySelector('.pg-q-h').textContent);
    box.replaceChildren(...list.map(([key, label]) => {
      const b = el('button', 'pg-chip', label);
      b.type = 'button';
      b.dataset.key = key;
      b.setAttribute('aria-pressed', String(on.includes(String(key))));
      b.addEventListener('click', () => {
        if (many) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        else for (const o of box.children) o.setAttribute('aria-pressed', String(o === b));
        const keys = [...box.children].filter((o) => o.getAttribute('aria-pressed') === 'true').map((o) => o.dataset.key);
        tapped(name, many ? keys : keys[0]);
      });
      return b;
    }));
  }

  function tapped(name, value) {
    chosen = true;
    picked[name] = name === 'frequency' ? Number(value) : value;
    if (name === 'kind') {
      // The kind's usual systems; the visitor changes them.
      picked.systems = Object.keys(D.systems || {}).filter((k) => (kinds[value].defaults || []).includes(k));
      options('systems', Object.entries(D.systems || {}), { many: true });
    }
    draw();
  }

  // The right side. The job turns to Automated by itself the first time.
  let drawn = false;
  function draw() {
    const kind = kinds[picked.kind];
    const state = part.compare.querySelector('.b-compare')?.dataset.state;
    const startAt = drawn && state === 'after' ? 1 : 0;
    part.compare.replaceChildren(renderBlock({ type: 'compare', label: D.compareLabel, states: composeStates(kind, picked.systems || [], D), start: startAt }, {}));
    if (!drawn) {
      drawn = true;
      setTimeout(() => part.compare.querySelectorAll('.cmp-btn')[1]?.click(), reducedMotion() ? 0 : 1200);
    }
    if (!touched) {
      const ppl = D.people?.[picked.people]?.value;
      if (ppl) { values.people = ppl; inputs.people.value = String(ppl); }
      const h = D.hoursByFrequency?.[picked.frequency];
      if (h != null) { values.hours = h; inputs.hours.value = String(h); }
    }
    money();
    part.firstList.replaceChildren(renderBlock({ type: 'layers', items: kind.first.map((f, i) => ({ label: String(i + 1), title: f.title, detail: f.detail })) }, {}));
    const near = kind.case && cfg.cases.find((c) => c.id === kind.case);
    part.nearest.replaceChildren();
    part.nearest.hidden = !near;
    if (near) {
      const [before, after] = fill(A.nearest, { title: '\u0000' }).split('\u0000');
      const a = el('a', null, near.title);
      a.href = `#case-${near.id}`;
      part.nearest.append(before, a, after || '');
    }
  }

  for (const n of cfg.numbers) {
    const input = bench.querySelector(`[data-num="${n.key}"]`);
    inputs[n.key] = input;
    const set = (v) => {
      const ok = Number.isFinite(v) && v >= n.min && v <= n.max;
      input.setAttribute('aria-invalid', String(!ok));
      if (ok) { values[n.key] = v; touched = true; chosen = true; money(); }
    };
    input.addEventListener('input', () => set(input.value === '' ? NaN : Number(input.value)));
    input.addEventListener('change', () => {
      const v = Number(input.value);
      if (input.value !== '' && Number.isFinite(v)) { input.value = String(clamp(v, n.min, n.max)); set(Number(input.value)); }
    });
    for (const b of input.closest('.est-control').querySelectorAll('[data-step]')) {
      b.addEventListener('click', () => {
        const v = clamp((Number(input.value) || n.value) + Number(b.dataset.step) * (n.step ?? 1), n.min, n.max);
        input.value = String(Math.round(v * 100) / 100);
        set(v);
      });
    }
  }

  function money() {
    const r = costOf(values, A);
    part.pay.textContent = GBP.format(Math.round(r.pay));
    part.cost.textContent = GBP.format(Math.round(r.cost));
    part.share.textContent = fill(A.share, { pay: part.pay.textContent, cost: part.cost.textContent });
    part.weeks.textContent = fill(A.weeks, { weeks: fmtWeeks(r.weeks) });
    const n = Math.min(maxCells, Math.round(r.weeks));
    const rows = Math.max(2, Math.ceil(n / perRow));
    [...part.grid.children].forEach((c, i) => { c.hidden = i >= rows * perRow; c.classList.toggle('is-on', i < n); });
    part.live.textContent = part.share.textContent;
  }

  options('kind', Object.entries(kinds).map(([k, v]) => [k, v.label]));
  options('systems', Object.entries(D.systems || {}), { many: true });
  options('frequency', (D.frequency || []).map((f, i) => [String(i), f]));
  options('people', Object.entries(D.people || {}).map(([k, v]) => [k, v.label]));
  draw();

  // What goes into the booking: what they set, in words, and their numbers.
  // Nothing if they never touched the bench (it still shows the example).
  function answers() {
    if (!chosen) return {};
    const job = [
      kinds[picked.kind].label,
      (picked.systems || []).map((s) => D.systems[s]).join(', '),
      picked.frequency != null ? D.frequency[picked.frequency] : '',
      picked.people ? fill(D.peopleSummary, { people: D.people[picked.people].label }) : '',
    ].filter(Boolean).join('. ') + '.';
    const r = costOf(values, A);
    return {
      [cfg.field]: job,
      scale: fill(A.scale, {
        people: `${NUM.format(values.people)} ${values.people === 1 ? 'person' : 'people'}`, hours: values.hours.toLocaleString('en-GB'),
        salary: GBP.format(values.salary), cost: GBP.format(Math.round(r.cost)),
      }),
    };
  }

  bench.querySelector('[data-answer-book]').addEventListener('click', () => book?.(answers()));

  return { answers, tap: tapped, get state() { return { picked: { ...picked }, chosen, touched, values: { ...values } }; } };
}

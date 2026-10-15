// Step 1, the job (DESIGN.md › The page). The visitor taps; nobody types.
//
// Without JavaScript nothing here runs: the form is a plain GET form to the
// Cal.com page with two text fields. With JavaScript the form goes, and each
// tap brings the next component:
//   1. "Which sounds like your week?" (a kind of job) → the job as
//      Today ⇄ Automated (compare), from that kind's template;
//   2. "Which systems does it touch?" (several) → the diagram changes;
//   3. "How often?" and "How many people?" → what they pay and how much of
//      it goes on this job, from numbers guessed from the taps, which they
//      can change;
//   4. what I would automate first, the nearest example, and the booking.
// Changing an earlier tap updates everything after it. Every word is in
// site.json › page.job.decide.

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
  const answer = root.querySelector('[data-answer]');
  if (!cfg || !form || !answer) return null;

  const A = cfg.answer || {};
  const D = cfg.decide || {};
  const kinds = D.kinds || {};
  const q = (s) => answer.querySelector(s);
  const part = {
    compare: q('[data-compare]'), money: q('[data-money]'), first: q('[data-first]'), firstList: q('[data-first-list]'),
    end: q('[data-end]'), nearest: q('[data-answer-nearest]'), label: q('[data-decide-label]'), live: q('[data-answer-live]'),
    share: q('[data-answer-share]'), pay: q('[data-answer-pay]'), cost: q('[data-answer-cost]'),
    weeks: q('[data-answer-weeks]'), grid: q('[data-answer-grid]'), numbersNote: q('[data-numbers-note]'),
  };
  const ask = Object.fromEntries([...answer.querySelectorAll('[data-q]')].map((n) => [n.dataset.q, n]));
  const perRow = 23, maxCells = 230;
  for (let i = 0; i < maxCells; i++) part.grid.append(document.createElement('i'));

  // Taps replace the form.
  form.remove();
  answer.hidden = false;

  const values = Object.fromEntries(cfg.numbers.map((n) => [n.key, n.value]));
  const inputs = {};
  const picked = { kind: null, systems: null, frequency: null, people: null };
  // `touched`: the visitor changed a number by hand; taps no longer overwrite it.
  let touched = false;

  const reveal = (node) => {
    if (!node.hidden) return;
    node.hidden = false;
    node.classList.remove('is-in');
    requestAnimationFrame(() => node.classList.add('is-in'));
  };
  const scrollTo = (node) => {
    const r = node.getBoundingClientRect();
    if (r.top > innerHeight * 0.75) node.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  };

  // A row of tap options. `many`: several can be on (aria-pressed toggles).
  function options(name, list, { many = false, on = [] } = {}) {
    const box = ask[name].querySelector('[data-opts]');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', ask[name].querySelector('.pg-q-h').textContent);
    box.replaceChildren(...list.map(([key, label]) => {
      const b = el('button', 'pg-chip', label);
      b.type = 'button';
      b.dataset.key = key;
      b.setAttribute('aria-pressed', String(on.includes(key)));
      b.addEventListener('click', () => {
        if (many) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        else for (const o of box.children) o.setAttribute('aria-pressed', String(o === b));
        const keys = [...box.children].filter((o) => o.getAttribute('aria-pressed') === 'true').map((o) => o.dataset.key);
        tapped(name, many ? keys : keys[0]);
      });
      return b;
    }));
  }

  // 1 Which sounds like your week?
  options('kind', Object.entries(kinds).map(([k, v]) => [k, v.label]));

  function tapped(name, value) {
    picked[name] = value;
    if (name === 'kind') {
      const kind = kinds[value];
      // The kind's usual systems start pressed; the visitor changes them.
      picked.systems = Object.keys(D.systems || {}).filter((k) => (kind.defaults || []).includes(k));
      options('systems', Object.entries(D.systems || {}), { many: true, on: picked.systems });
      drawJob();
      reveal(part.compare);
      reveal(ask.systems);
      reveal(ask.frequency);
      if (!ask.frequency.querySelector('[data-opts]').children.length) {
        options('frequency', (D.frequency || []).map((f, i) => [String(i), f]));
        options('people', Object.entries(D.people || {}).map(([k, v]) => [k, v.label]));
      }
      scrollTo(part.compare);
      if (picked.frequency != null && picked.people) finish();
      return;
    }
    if (name === 'systems') { drawJob(); return; }
    if (name === 'frequency') { reveal(ask.people); scrollTo(ask.people); }
    if (picked.frequency != null && picked.people) finish();
  }

  // The job, Today ⇄ Automated; turns to Automated by itself the first time.
  let drawn = false;
  function drawJob() {
    const states = composeStates(kinds[picked.kind], picked.systems || [], D);
    const state = part.compare.querySelector('.b-compare')?.dataset.state;
    const start = drawn && state === 'after' ? 1 : 0;
    part.compare.replaceChildren(renderBlock({ type: 'compare', label: D.compareLabel, states, start }, {}));
    if (!drawn) {
      drawn = true;
      setTimeout(() => part.compare.querySelectorAll('.cmp-btn')[1]?.click(), reducedMotion() ? 0 : 1100);
    }
  }

  function finish() {
    if (!touched) {
      const ppl = D.people?.[picked.people]?.value;
      if (ppl) { values.people = ppl; inputs.people.value = String(ppl); }
      const h = D.hoursByFrequency?.[Number(picked.frequency)];
      if (h != null) { values.hours = h; inputs.hours.value = String(h); }
    }
    money();
    const kind = kinds[picked.kind];
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
    part.label.hidden = true;
    const first = part.money.hidden;
    reveal(part.money);
    reveal(part.first);
    reveal(part.end);
    if (first) scrollTo(part.money);
    part.live.textContent = part.share.textContent;
  }

  for (const n of cfg.numbers) {
    const input = answer.querySelector(`[data-num="${n.key}"]`);
    inputs[n.key] = input;
    const set = (v) => {
      const ok = Number.isFinite(v) && v >= n.min && v <= n.max;
      input.setAttribute('aria-invalid', String(!ok));
      if (ok) { values[n.key] = v; touched = true; part.numbersNote.hidden = true; money(); }
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
  }

  // What goes into the booking: what they tapped, in words, and their numbers.
  function answers() {
    if (!picked.kind) return {};
    const job = [
      kinds[picked.kind].label,
      (picked.systems || []).map((s) => D.systems[s]).join(', '),
      picked.frequency != null ? D.frequency[Number(picked.frequency)] : '',
      picked.people ? fill(D.peopleSummary, { people: D.people[picked.people].label }) : '',
    ].filter(Boolean).join('. ') + '.';
    const a = { [cfg.field]: job };
    if (!part.money.hidden) {
      const r = costOf(values, A);
      a.scale = fill(A.scale, {
        people: NUM.format(values.people), hours: values.hours.toLocaleString('en-GB'),
        salary: GBP.format(values.salary), cost: GBP.format(Math.round(r.cost)),
      });
    }
    return a;
  }

  answer.querySelector('[data-answer-book]').addEventListener('click', () => book?.(answers()));

  return { answers, tap: tapped, get state() { return { picked: { ...picked }, touched, values: { ...values } }; } };
}

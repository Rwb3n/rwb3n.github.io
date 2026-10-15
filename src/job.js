// Step 1, the job: the page's one conversational turn (DESIGN.md › The page;
// _model/target/funnel.md › Changed, evening).
//
// Without JavaScript nothing here runs: the form is a plain GET form to the
// Cal.com page with two text fields. With JavaScript, the visitor writes one
// sentence and the page answers in components, in front of them:
//   1. the decisions: repeated work, kind of job, how often, who, which
//      systems, each with how sure it is, and how long deciding took;
//   2. if it is not sure of the kind of job, it asks back with buttons;
//   3. the job as Today ⇄ Automated (the compare component), built from the
//      template for that kind and the systems found; it turns to Automated
//      by itself;
//   4. what they pay and how much of it goes on this job, from numbers
//      guessed from the sentence, which the visitor can change;
//   5. what I would automate first; the nearest example; the label saying
//      how it was decided; the booking.
// The decisions come from the decision model (worker/decide.js) when there
// is an endpoint, or from matching words on this page otherwise, and the
// label says which. The model writes no words: all of them are in site.json.

import { renderBlock } from './blocks.js';
import { nearestCase, costOf, localDecide, settle, composeStates } from './decide.js';

export { nearestCase, costOf };

const NUM = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const fill = (t, vars) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtWeeks = (w) => (w < 10 ? (Math.round(w * 10) / 10).toLocaleString('en-GB') : NUM.format(Math.round(w)));
const reducedMotion = () => document.documentElement.dataset.motion !== 'full';
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// Where the decision model is. site.json › page.job.decide.endpoint, or, for
// trying it locally, ?decide=local (worker on :8787) or ?decide=<url>.
function endpointFrom(cfg) {
  const q = new URLSearchParams(location.search).get('decide');
  if (q === 'local') return 'http://localhost:8787/decide';
  if (q && /^(https:\/\/|http:\/\/localhost[:/])/.test(q)) return q;
  return cfg?.endpoint || null;
}

async function askModel(endpoint, sentence, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sentence }), signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; } finally { clearTimeout(timer); }
}

export function createJob(root = document, { book } = {}) {
  let cfg = null;
  try { cfg = JSON.parse(root.getElementById('booking-config')?.textContent || 'null')?.job; } catch { cfg = null; }
  const form = root.querySelector('[data-job]');
  const answer = root.querySelector('[data-answer]');
  if (!cfg || !form || !answer) return null;

  const A = cfg.answer || {};
  const D = cfg.decide || {};
  const kinds = D.kinds || {};
  const endpoint = endpointFrom(D);
  const jobField = form.querySelector(`[name="${cfg.field}"]`);
  const q = (s) => answer.querySelector(s);
  const part = {
    you: q('[data-answer-you]'), status: q('[data-decide-status]'), decisions: q('[data-decisions]'),
    ask: q('[data-ask]'), askOptions: q('[data-ask-options]'), not: q('[data-not]'),
    compare: q('[data-compare]'), money: q('[data-money]'), first: q('[data-first]'), firstList: q('[data-first-list]'),
    end: q('[data-end]'), nearest: q('[data-answer-nearest]'), label: q('[data-decide-label]'), live: q('[data-answer-live]'),
    share: q('[data-answer-share]'), pay: q('[data-answer-pay]'), cost: q('[data-answer-cost]'),
    weeks: q('[data-answer-weeks]'), grid: q('[data-answer-grid]'), numbersNote: q('[data-numbers-note]'),
  };
  const perRow = 23, maxCells = 230;
  for (let i = 0; i < maxCells; i++) part.grid.append(document.createElement('i'));

  // Swap the no-JavaScript field for the button. The text field leaves the
  // form, so it is never sent twice.
  form.querySelector('[data-nojs]')?.remove();
  form.querySelector('[data-js]').hidden = false;

  const values = Object.fromEntries(cfg.numbers.map((n) => [n.key, n.value]));
  const inputs = {};
  // `touched`: the visitor changed a number. Until then the numbers are ours
  // (or guessed from the sentence), not theirs, so they stay out of the booking.
  let touched = false, run = 0, current = null;

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

  const words = () => String(jobField?.value || '').trim();

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

  function setNumber(key, v) {
    if (v == null || touched) return;
    values[key] = v;
    inputs[key].value = String(v);
  }

  // One row of the decisions: label, value, and how sure (a bar), if known.
  function row(label, value, p) {
    const d = el('div', 'pg-decision');
    d.append(el('dt', 'micro', label), el('dd', 'pg-decision-v', value));
    const bar = el('span', 'pg-decision-p');
    bar.setAttribute('aria-hidden', 'true');
    if (p != null) bar.style.setProperty('--p', String(p)); else bar.classList.add('is-none');
    d.append(bar, el('span', 'pg-decision-n', p != null ? p.toFixed(2) : ''));
    part.decisions.append(d);
    requestAnimationFrame(() => d.classList.add('is-in'));
    return d;
  }

  const reveal = (node) => { node.hidden = false; node.classList.remove('is-in'); requestAnimationFrame(() => node.classList.add('is-in')); };

  async function perform() {
    const id = ++run;
    const sentence = words();
    for (const k of ['ask', 'not', 'compare', 'money', 'first', 'end']) part[k].hidden = true;
    part.decisions.replaceChildren();
    part.you.textContent = sentence ? fill(A.you, { job: sentence }) : '';
    part.you.hidden = !sentence;
    answer.hidden = false;
    answer.focus({ preventScroll: true });
    answer.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });

    part.status.textContent = D.status?.busy || '';
    part.status.classList.add('is-busy');
    const t0 = performance.now();
    const fromModel = endpoint && sentence ? await askModel(endpoint, sentence, D.timeoutMs || 4000) : null;
    if (id !== run) return;
    const raw = fromModel || localDecide(sentence, kinds);
    const seconds = ((fromModel?.ms ?? performance.now() - t0) / 1000).toFixed(2);
    current = settle(raw, { thresholds: D.thresholds, kinds });
    const model = current.source === 'model';
    part.status.classList.remove('is-busy');
    part.status.textContent = model ? fill(D.status?.done, { seconds }) : D.status?.local || '';
    const R = D.rows || {};

    row(R.repeated, current.repeated ? D.yes : D.no, model ? raw.repeated : null);
    await wait(160);
    if (!current.repeated) { reveal(part.not); return; }

    const jobRow = row(R.job, current.kind ? kinds[current.kind].label : '…', model ? raw.job?.confidence : null);
    await wait(140);
    if (current.frequency != null) { row(R.frequency, D.frequency[current.frequency], null); await wait(140); }
    const ppl = D.people?.[current.people];
    if (ppl) { row(R.people, ppl.label, model ? raw.people?.confidence : null); await wait(140); }
    row(R.systems, current.systems.length ? current.systems.map((s) => D.systems[s]).join(' · ') : D.none, null);
    await wait(260);

    if (!current.kind) {
      current.kind = await askBack(current.ask);
      if (id !== run) return;
      jobRow.querySelector('.pg-decision-v').textContent = kinds[current.kind].label;
    }
    await compose(id);
  }

  function askBack(options) {
    part.askOptions.replaceChildren();
    reveal(part.ask);
    return new Promise((resolve) => {
      for (const k of options) {
        const b = el('button', 'pg-chip', kinds[k].label);
        b.type = 'button';
        b.addEventListener('click', () => { part.ask.hidden = true; resolve(k); });
        part.askOptions.append(b);
      }
      part.askOptions.querySelector('button')?.focus({ preventScroll: true });
    });
  }

  async function compose(id) {
    const kind = kinds[current.kind];
    // 3 The job, Today ⇄ Automated: it turns to Automated by itself.
    const states = composeStates(kind, current.systems, D);
    part.compare.replaceChildren(renderBlock({ type: 'compare', label: D.compareLabel, states }, {}));
    reveal(part.compare);
    await wait(1100);
    if (id !== run) return;
    part.compare.querySelectorAll('.cmp-btn')[1]?.click();
    await wait(500);

    // 4 Money, from numbers guessed from the sentence.
    setNumber('people', D.people?.[current.people]?.value);
    if (current.frequency != null) setNumber('hours', D.hoursByFrequency?.[current.frequency]);
    part.numbersNote.hidden = touched;
    money();
    reveal(part.money);
    await wait(500);
    if (id !== run) return;

    // 5 What I would automate first; nearest example; label; booking.
    part.firstList.replaceChildren(renderBlock({ type: 'layers', items: kind.first.map((f, i) => ({ label: String(i + 1), title: f.title, detail: f.detail })) }, {}));
    reveal(part.first);
    await wait(300);
    const near = kind.case && cfg.cases.find((c) => c.id === kind.case);
    part.nearest.replaceChildren();
    part.nearest.hidden = !near;
    if (near) {
      const [before, after] = fill(A.nearest, { title: '\u0000' }).split('\u0000');
      const a = el('a', null, near.title);
      a.href = `#case-${near.id}`;
      part.nearest.append(before, a, after || '');
    }
    part.label.textContent = current.source === 'model' ? D.label?.model : D.label?.local;
    reveal(part.end);
    part.live.textContent = `${part.share.textContent}${near ? ` ${part.nearest.textContent}` : ''}`;
  }

  function scaleText() {
    const r = costOf(values, A);
    return fill(A.scale, {
      people: NUM.format(values.people), hours: values.hours.toLocaleString('en-GB'),
      salary: GBP.format(values.salary), cost: GBP.format(Math.round(r.cost)),
    });
  }

  // What goes into the booking: the visitor's words and, if they changed any
  // number, their numbers.
  function answers() {
    const a = {};
    if (words()) a[cfg.field] = words();
    if (touched) a.scale = scaleText();
    return a;
  }

  form.querySelector('[data-job-show]').addEventListener('click', perform);
  form.addEventListener('submit', (e) => { e.preventDefault(); perform(); });
  for (const b of part.not.querySelectorAll('[data-example]')) {
    b.addEventListener('click', () => { jobField.value = b.textContent; perform(); });
  }
  answer.querySelector('[data-answer-book]').addEventListener('click', () => book?.(answers()));

  return { perform, answers, get state() { return { decision: current, touched, values: { ...values }, endpoint }; } };
}

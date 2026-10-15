// Step 1, the job: the page's one conversational turn (DESIGN.md › The page).
//
// Without JavaScript nothing here runs: the form is a plain GET form to the
// Cal.com page with two text fields. With JavaScript:
//   - the "scale" text field gives way to three numbers (people, hours each a
//     week, cost per hour);
//   - "Show what it costs" answers under the form: the visitor's words said
//     back, hours and cost a year, full working weeks, the grid of weeks, and
//     the nearest example, chosen by the words in the job;
//   - "Book the free call with these answers" opens the booking with `job`
//     and `scale` filled in.
// Everything stays in the browser. Nothing is sent until the visitor books.

// No imports: the maths below is tested in Node (tests/job.test.js).
const reducedMotion = () => document.documentElement.dataset.motion !== 'full';

const NUM = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const fill = (t, vars) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtWeeks = (w) => (w < 10 ? (Math.round(w * 10) / 10).toLocaleString('en-GB') : NUM.format(Math.round(w)));

// The example whose words appear most often in the visitor's text, or null.
// Whole words only, so "report" does not match "reporter".
export function nearestCase(text, cases = []) {
  const t = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9£ ]+/g, ' ').replace(/\s+/g, ' ')} `;
  let best = null, bestHits = 0;
  for (const c of cases) {
    const hits = (c.match || []).filter((w) => t.includes(` ${w.toLowerCase()} `)).length;
    if (hits > bestHits) { best = c; bestHits = hits; }
  }
  return best;
}

// Hours and cost a year for the numbers given.
export function costOf({ people, hours, rate }, { weeksPerYear = 46, hoursPerWeek = 37.5 } = {}) {
  const total = people * hours * weeksPerYear;
  return { hours: total, cost: total * rate, weeks: total / hoursPerWeek };
}

export function createJob(root = document, { book } = {}) {
  let cfg = null;
  try { cfg = JSON.parse(root.getElementById('booking-config')?.textContent || 'null')?.job; } catch { cfg = null; }
  const form = root.querySelector('[data-job]');
  const answer = root.querySelector('[data-answer]');
  if (!cfg || !form || !answer) return null;

  const A = cfg.answer || {};
  const jobField = form.querySelector(`[name="${cfg.field}"]`);
  const q = (s) => answer.querySelector(s);
  const out = {
    you: q('[data-answer-you]'), hours: q('[data-answer-hours]'), cost: q('[data-answer-cost]'),
    weeks: q('[data-answer-weeks]'), grid: q('[data-answer-grid]'), nearest: q('[data-answer-nearest]'),
    live: q('[data-answer-live]'),
  };
  const perRow = 23, maxCells = 230;
  for (let i = 0; i < maxCells; i++) out.grid.append(document.createElement('i'));

  // Swap the no-JavaScript field for the numbers. The text field leaves the
  // form, so it is never sent twice.
  const nojs = form.querySelector('[data-nojs]');
  nojs?.remove();
  form.querySelector('[data-js]').hidden = false;

  const values = Object.fromEntries(cfg.numbers.map((n) => [n.key, n.value]));
  // `touched`: the visitor changed a number. Until then the numbers are ours,
  // not theirs, so they do not go into the booking.
  let shown = false, touched = false, liveTimer = 0;

  for (const n of cfg.numbers) {
    const input = form.querySelector(`[data-num="${n.key}"]`);
    const set = (v) => {
      const ok = Number.isFinite(v) && v >= n.min && v <= n.max;
      input.setAttribute('aria-invalid', String(!ok));
      if (ok) { values[n.key] = v; touched = true; if (shown) render(); }
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

  function scaleText() {
    const r = costOf(values, A);
    return fill(A.scale, {
      people: NUM.format(values.people), hours: values.hours.toLocaleString('en-GB'), total: NUM.format(Math.round(r.hours)),
    });
  }

  function render() {
    const r = costOf(values, A);
    const w = words();
    out.you.textContent = w ? fill(A.you, { job: w }) : '';
    out.you.hidden = !w;
    out.hours.textContent = NUM.format(Math.round(r.hours));
    out.cost.textContent = GBP.format(Math.round(r.cost));
    out.weeks.textContent = fill(A.weeks, { weeks: fmtWeeks(r.weeks) });
    const n = Math.min(maxCells, Math.round(r.weeks));
    const rows = Math.max(2, Math.ceil(n / perRow));
    [...out.grid.children].forEach((c, i) => { c.hidden = i >= rows * perRow; c.classList.toggle('is-on', i < n); });
    const near = nearestCase(w, cfg.cases);
    out.nearest.hidden = !near;
    out.nearest.replaceChildren();
    if (near) {
      const [before, after] = fill(A.nearest, { title: '\u0000' }).split('\u0000');
      const a = document.createElement('a');
      a.href = `#case-${near.id}`;
      a.textContent = near.title;
      out.nearest.append(before, a, after || '');
    }
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      out.live.textContent = `${A.hours}: ${out.hours.textContent}. ${A.cost}: ${out.cost.textContent}.${near ? ` ${out.nearest.textContent}` : ''}`;
    }, 600);
  }

  function show() {
    render();
    const first = !shown;
    shown = true;
    answer.hidden = false;
    if (first) {
      answer.focus({ preventScroll: true });
      answer.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  form.querySelector('[data-job-show]').addEventListener('click', show);
  form.addEventListener('submit', (e) => { e.preventDefault(); show(); });
  jobField?.addEventListener('input', () => { if (shown) render(); });
  answer.querySelector('[data-answer-book]').addEventListener('click', () => book?.(answers()));

  // What goes into the booking: the visitor's words and, if they changed any
  // number, their numbers.
  function answers() {
    const a = {};
    if (words()) a[cfg.field] = words();
    if (touched) a.scale = scaleText();
    return a;
  }

  return { show, answers, get state() { return { shown, touched, values: { ...values } }; } };
}

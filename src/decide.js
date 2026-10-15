// Step 1's decisions, without the DOM (tested in Node: tests/job.test.js).
//
// A decision is what the page knows about the visitor's sentence: is it
// repeated work, which kind of job, how often, who does it, which systems.
// It comes from the decision model (worker/decide.js, the same shape) or,
// without it, from matching words here. Either way the page then builds the
// same components from the templates in site.json › page.job.decide.kinds.

const words = (text) => ` ${String(text || '').toLowerCase().replace(/[^a-z0-9£ ]+/g, ' ').replace(/\s+/g, ' ')} `;
const hits = (t, list = []) => list.filter((w) => t.includes(` ${w.toLowerCase()} `)).length;

// The example whose words appear most often in the visitor's text, or null.
// Whole words only, so "report" does not match "reporter".
export function nearestCase(text, cases = []) {
  const t = words(text);
  let best = null, bestHits = 0;
  for (const c of cases) {
    const n = hits(t, c.match);
    if (n > bestHits) { best = c; bestHits = n; }
  }
  return best;
}

// What they pay these people a year, how much of it goes on this job (the
// job's share of a working week), and the hours and working weeks it takes.
export function costOf({ people, hours, salary }, { weeksPerYear = 46, hoursPerWeek = 37.5 } = {}) {
  const pay = people * salary;
  const total = people * hours * weeksPerYear;
  return { pay, cost: pay * (hours / hoursPerWeek), hours: total, weeks: total / hoursPerWeek };
}

// Without the model: the same shape, from words. Honest about what it is
// (`source: 'local'`), and never sure enough to skip the ask-back unless one
// kind clearly wins.
const SYSTEM_WORDS = {
  spreadsheet: ['spreadsheet', 'spreadsheets', 'excel', 'sheet', 'sheets'],
  email: ['email', 'emails', 'inbox', 'outlook', 'gmail'],
  accounts: ['xero', 'sage', 'quickbooks', 'accounts', 'accounting'],
  crm: ['crm', 'salesforce', 'hubspot', 'customer database'],
  bank: ['bank', 'statement', 'statements'],
  paper: ['pdf', 'pdfs', 'paper', 'scan', 'scans', 'receipts', 'forms'],
  portal: ['portal', 'portals', 'website', 'online'],
};
const FREQ_WORDS = [
  ['daily', 'day', 'each day', 'every day', 'morning', 'every order'],
  ['weekly', 'week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  ['monthly', 'month', 'month end'],
  ['quarter', 'quarterly', 'year', 'yearly', 'annual'],
];
export function localDecide(text, kinds = {}) {
  const t = words(text);
  const scored = Object.entries(kinds).map(([k, v]) => [k, hits(t, v.match)]).sort((a, b) => b[1] - a[1]);
  const [top, second] = scored;
  const total = scored.reduce((s, [, n]) => s + n, 0);
  const probabilities = Object.fromEntries(scored.map(([k, n]) => [k, total ? n / total : 0]));
  const job = top && top[1] > 0
    ? { choice: top[0], confidence: second && second[1] === top[1] ? 0.5 : 0.8, probabilities }
    : { choice: 'other', confidence: 0, probabilities };
  const f = FREQ_WORDS.findIndex((list) => hits(t, list) > 0);
  const n = (t.match(/\b(\d+|two|three|four|five)\b/) || [])[1];
  const people = /\b(i|someone|our [a-z]+ manager|coordinator)\b/.test(t) ? 'one'
    : /\b(two|three|2|3)\b/.test(t) ? 'few'
      : /\b(team|staff|managers|everyone)\b/.test(t) || (n && Number(n) > 3) ? 'team' : 'unknown';
  return {
    source: 'local',
    // Words can only say "yes" when they match a kind of job or a frequency.
    repeated: (top && top[1] > 0) || f >= 0 ? 0.9 : 0.1,
    job,
    frequency: f >= 0 ? { score: f } : null,
    people: { choice: people },
    systems: Object.fromEntries(Object.entries(SYSTEM_WORDS).map(([k, list]) => [k, hits(t, list) ? 1 : 0])),
  };
}

// The decisions the page acts on, with the thresholds applied.
export function settle(d, { thresholds = {}, kinds = {} } = {}) {
  const th = { repeated: 0.5, job: 0.75, system: 0.8, frequency: 0.7, ...thresholds };
  const repeated = (d.repeated ?? 0) >= th.repeated;
  const sure = (d.job?.confidence ?? 0) >= th.job && kinds[d.job?.choice];
  const options = Object.entries(d.job?.probabilities || {})
    .filter(([k]) => kinds[k] && k !== 'other')
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  return {
    source: d.source || 'model',
    repeated,
    kind: sure ? d.job.choice : null,
    ask: repeated && !sure ? (options.length ? options : Object.keys(kinds).slice(0, 3)) : [],
    frequency: d.frequency && (d.frequency.confidence ?? 1) >= th.frequency ? Math.max(0, Math.min(3, Math.round(d.frequency.score))) : null,
    people: d.people?.choice || 'unknown',
    systems: Object.entries(d.systems || {}).filter(([, p]) => p >= th.system).map(([k]) => k),
    raw: d,
  };
}

// The two states of the compare component for a kind of job and the systems
// found ("$sys" in the template; the kind's defaults when none were named).
// At most three systems, shown as one step; a step already in the template
// with the same label is not repeated.
export function composeStates(kind, systems = [], { systems: names = {}, states = {}, stat = {} } = {}) {
  const ids = (systems.length ? systems : kind.defaults || []).slice(0, 3);
  const expand = (list) => {
    const out = [];
    for (const n of list) {
      if (n === '$sys' || n?.sys) {
        // One step for all of them: the sentence names systems, not their order.
        if (ids.length) out.push({ id: 'systems', label: ids.map((s) => names[s] || s).join(' · '), ...(n.via ? { via: n.via } : {}) });
      } else if (!out.some((o) => o.label === n.label && !o.variant && !n.variant)) {
        out.push({ ...n });
      }
    }
    return out;
  };
  const before = expand(kind.before || []);
  const after = expand(kind.after || []);
  const byHand = (nodes) => nodes.filter((n) => n.variant === 'muted').length;
  return [
    { key: 'before', label: states.before || 'Before', title: states.beforeTitle, stat: { value: String(byHand(before)), label: stat.before || '' }, nodes: before },
    { key: 'after', label: states.after || 'After', title: states.afterTitle, stat: { value: String(byHand(after)), label: stat.after || '' }, nodes: after },
  ];
}

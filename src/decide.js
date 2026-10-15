// Step 1 without the DOM (tested in Node: tests/job.test.js): the money, the
// nearest example, and the two states of the job (Today ⇄ Automated) built
// from the templates in site.json › page.job.decide.kinds.

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

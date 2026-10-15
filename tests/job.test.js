// Step 1's decisions and answer (src/decide.js): the maths, the matching,
// the thresholds and the components built from the templates.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nearestCase, costOf, localDecide, settle, composeStates } from '../src/decide.js';

const site = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
const J = site.page.job;
const D = J.decide;
const cases = site.page.cases.items;
const near = (t) => nearestCase(t, cases)?.id ?? null;

test('the starting numbers give the answer the copy describes', () => {
  const start = Object.fromEntries(J.numbers.map((n) => [n.key, n.value]));
  const r = costOf(start, J.answer);
  assert.equal(r.pay, 70000);
  assert.equal(Math.round(r.cost), 7467);
  assert.equal(Math.round(r.weeks * 10) / 10, 9.8);
});

test('nearest example: by whole words, the best match wins; no match, no example', () => {
  assert.equal(near('We rebuild the sales report every Monday from three spreadsheets'), 'monday-report');
  assert.equal(near('Chasing unpaid invoices and checking the bank'), 'cash');
  assert.equal(near('Booking rooms for the team'), null);
  assert.equal(near('Our reporter writes the newsletter'), null);
});

test('the model\'s answers are settled with the thresholds in site.json', () => {
  const raw = {
    repeated: 0.98,
    job: { choice: 'report', confidence: 1, probabilities: { report: 1 } },
    frequency: { score: 1, confidence: 1 },
    people: { choice: 'few' },
    systems: { spreadsheet: 0.99, email: 0.6, paper: 0.11 },
  };
  const s = settle(raw, { thresholds: D.thresholds, kinds: D.kinds });
  assert.deepEqual([s.source, s.repeated, s.kind, s.frequency, s.people, s.systems, s.ask], ['model', true, 'report', 1, 'few', ['spreadsheet'], []]);
});

test('below the job threshold it asks back with the likeliest kinds; below the frequency threshold it does not say', () => {
  const raw = { repeated: 0.95, job: { choice: 'copying', confidence: 0.68, probabilities: { copying: 0.6, invoices: 0.3, report: 0.05, other: 0.05 } }, frequency: { score: 0.6, confidence: 0.42 }, people: { choice: 'team' }, systems: {} };
  const s = settle(raw, { thresholds: D.thresholds, kinds: D.kinds });
  assert.equal(s.kind, null);
  assert.deepEqual(s.ask, ['copying', 'invoices', 'report']);
  assert.equal(s.frequency, null);
});

test('not repeated work: nothing more is decided', () => {
  const s = settle({ repeated: 0.03, job: { choice: 'other', confidence: 1 } }, { thresholds: D.thresholds, kinds: D.kinds });
  assert.equal(s.repeated, false);
  assert.deepEqual(s.ask, []);
});

test('without the model, matching words: honest about it, and no "yes" for a question', () => {
  const a = settle(localDecide('We chase timesheets from contractors every Monday by email', D.kinds), { thresholds: D.thresholds, kinds: D.kinds });
  assert.deepEqual([a.source, a.repeated, a.kind, a.frequency, a.systems], ['local', true, 'chasing', 1, ['email']]);
  assert.equal(settle(localDecide('How much do you charge?', D.kinds), { thresholds: D.thresholds, kinds: D.kinds }).repeated, false);
});

test('every kind of job builds two compare states, with the systems as one step', () => {
  for (const [k, kind] of Object.entries(D.kinds)) {
    const [before, after] = composeStates(kind, ['email', 'paper'], D);
    assert.ok(before.nodes.length >= 2 && after.nodes.length >= 2, k);
    assert.ok(after.nodes.some((n) => n.variant === 'accent'), `${k}: the automated state has the system`);
    if ([...kind.before, ...kind.after].some((n) => n === '$sys' || n?.sys)) {
      assert.ok(before.nodes.some((n) => n.label === 'Email · PDFs and paper'), k);
    }
    assert.equal(kind.first.length, 3, k);
  }
});

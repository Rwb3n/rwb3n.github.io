// Step 1 without the DOM (src/decide.js): the maths, the nearest example,
// and the job's two states built from the templates.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nearestCase, costOf, composeStates } from '../src/decide.js';

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

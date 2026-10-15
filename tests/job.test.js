// Step 1's answer (src/job.js): the cost maths and "nearest example".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nearestCase, costOf } from '../src/job.js';

const site = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
const cases = site.page.cases.items;
const near = (t) => nearestCase(t, cases)?.id ?? null;

test('the starting numbers give the answer the copy describes', () => {
  const start = Object.fromEntries(site.page.job.numbers.map((n) => [n.key, n.value]));
  const r = costOf(start, site.page.job.answer);
  assert.equal(r.hours, 552);
  assert.equal(r.cost, 16560);
  assert.equal(Math.round(r.weeks), 15);
});

test('nearest example: by whole words, the best match wins', () => {
  assert.equal(near('We rebuild the sales report every Monday from three spreadsheets'), 'monday-report');
  assert.equal(near('Copying new client details into the CRM after a proposal'), 'new-client');
  assert.equal(near('Chasing unpaid invoices and checking the bank'), 'cash');
  assert.equal(near('Cash flow forecast'), 'cash');
});

test('nearest example: no match, no example', () => {
  assert.equal(near(''), null);
  assert.equal(near('Booking rooms for the team'), null);
  assert.equal(near('Our reporter writes the newsletter'), null);
});

// Typed text → describe / answer / section / fallback (src/route.js), with the
// real conversation config from site.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { route, nextReplies, isDescribing } from '../src/route.js';
import { talkConfig } from '../src/static.js';

const site = JSON.parse(readFileSync(new URL('../content/site.json', import.meta.url), 'utf8'));
const linked = talkConfig({ ...site, booking: { ...site.booking, calLink: 'example/30min' } });
const unset = talkConfig(site);

test('a visitor describing their own work goes to the intake', () => {
  for (const t of [
    'Two of us rebuild the sales report every Monday by hand',
    'We copy orders from email into our spreadsheet every day',
    'Our team spends hours chasing invoices',
    'Could you help us with onboarding',
    'We have 12 staff and we need to automate our quotes',
  ]) assert.deepEqual(route(t, linked), { kind: 'describe', to: 'intake' }, t);
});

test('without a booking link, a description goes to the booking section (email)', () => {
  assert.deepEqual(route('We copy orders by hand every day', unset), { kind: 'describe', to: 'book' });
});

test('a question a fact answers gets that fact; an empty fact is never offered', () => {
  assert.equal(route('How much does it cost?', linked).text, site.facts.cost.missing);
  assert.equal(route('where are you based', linked).text, 'Based in: London, UK.');
  assert.equal(route('Do you have case studies', linked).text, site.facts.clients.missing);
  // timeline has no value and no missing sentence: the fallback, not a guess.
  assert.deepEqual(route('how long does it take', linked), { kind: 'fallback', text: site.conversation.fallback });
});

test('words in a section\'s intents open that section', () => {
  assert.deepEqual(route('Can I see an example', linked), { kind: 'section', to: 'cases' });
  assert.deepEqual(route('Who are you', linked), { kind: 'section', to: 'who' });
  assert.deepEqual(route('what happens first', linked), { kind: 'section', to: 'start' });
  assert.deepEqual(route('book a call', linked), { kind: 'section', to: 'book' });
});

test('word boundaries: "who" is not in "whole", "rate" is not in "operate"', () => {
  assert.equal(route('the whole thing', linked).kind, 'fallback');
  assert.equal(route('things that operate', linked).kind, 'fallback');
});

test('anything else gets the fallback; empty text does nothing', () => {
  assert.deepEqual(route('purple elephants', linked), { kind: 'fallback', text: site.conversation.fallback });
  assert.equal(route('   ', linked), null);
  assert.equal(isDescribing('how would we start', site.conversation.disclosure), false);
});

test('after an answer: unopened sections in page order, then booking', () => {
  assert.deepEqual(nextReplies(linked, ['problem']), ['cases', 'start', 'book']);
  assert.deepEqual(nextReplies(linked, ['problem', 'cases', 'start', 'who']), ['intake', 'book']);
  assert.deepEqual(nextReplies(linked, ['problem', 'book']), ['cases', 'start']);
});

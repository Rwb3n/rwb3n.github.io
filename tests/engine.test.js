import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../src/engine.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const manifest = load('graphs/default.json');
const content = E.indexContent(manifest.nodes.map((n) => load(`nodes/${n}.json`)));

test('every chip and grid target resolves to a node or a built-in action', () => {
  const builtins = new Set(['_engage', '_show_brief', '_book', '_add_context']);
  const missing = [];
  for (const [id, node] of Object.entries(content.nodes)) {
    const targets = [...(node.chips || []).map((c) => c.target)];
    for (const b of node.blocks) if (b.type === 'grid') targets.push(...b.items.map((i) => i.target).filter(Boolean));
    for (const t of targets) if (!content.nodes[t] && !builtins.has(t)) missing.push(`${id} → ${t}`);
  }
  assert.deepEqual(missing, []);
});

test('every parent exists', () => {
  for (const [id, p] of Object.entries(content.parents)) assert.ok(content.nodes[p], `${id} has missing parent ${p}`);
});

test('intent matching respects word boundaries', () => {
  const m = (q) => E.matchIntent(content.intents, q);
  assert.equal(m('show me the projects'), 'projects');
  assert.equal(m('Tell me about Salesforce'), 'salesforce');
  assert.equal(m('we transfer files weekly'), null, '"sf" must not fire inside "transfer"');
  assert.equal(m('the whole thing'), null, '"who" must not fire inside "whole"');
  assert.equal(m("what's your process?"), 'process');
});

test('routing: disclosure goes to L3, general to L2', () => {
  assert.equal(E.route(content.intents, 'our team is struggling and we need help with admin').layer, 3);
  assert.equal(E.route(content.intents, 'we spend Mondays in spreadsheets').target, 'signal_monday', 'a described problem that matches a topic opens that topic');
  assert.equal(E.route(content.intents, 'our team of 40 people is struggling').layer, 3);
  assert.equal(E.route(content.intents, 'do you use llm agents').layer, 2);
  assert.equal(E.route(content.intents, 'CALLSHEET').layer, 1);
});

test('gravity surfaces the engagement chip as depth grows', () => {
  let s = E.newSession();
  const chips = [{ label: 'a', target: 'projects' }, { label: 'b', target: 'haios' }, { label: 'c', target: 'behold' }];
  assert.ok(!E.applyGravity(chips, s, content).some((c) => c.isEngagement));
  for (let i = 0; i < 4; i++) s = E.record(s, { nodeId: null });
  assert.equal(E.applyGravity(chips, s, content).at(-1).target, '_engage');
  for (let i = 0; i < 3; i++) s = E.record(s, { nodeId: null });
  assert.equal(E.applyGravity(chips, s, content)[0].target, '_engage');
});

test('brief and mailto carry the session', () => {
  let s = E.newSession();
  s = E.record(s, { nodeId: 'callsheet' });
  s = E.record(s, { nodeId: 'callsheet_arch' });
  s = E.record(s, { nodeId: null, query: 'we have 12 staff re-keying invoices', isFreeQuestion: true, isDisclosure: true });
  const d = E.briefData(content, s);
  assert.ok(d.journey.includes(' → '), 'journey lists topics in order');
  assert.equal(d.context, 'we have 12 staff re-keying invoices');
  assert.equal(d.questions, 'None', 'disclosures are context, not questions');
  const href = E.mailtoHref('lab@mindunder.dev', d);
  assert.ok(href.startsWith('mailto:lab@mindunder.dev?subject='));
  assert.match(decodeURIComponent(href), /re-keying invoices/);
});

test('an estimate survives navigation and reaches the brief and email', () => {
  let s = { ...E.newSession(), estimate: '3 people, 4 hours a week each, £30 an hour: about 552 hours and £16,560 a year.' };
  s = E.record(s, { nodeId: 'method' });
  const d = E.briefData(content, s);
  assert.match(d.estimate, /552 hours/);
  assert.match(decodeURIComponent(E.mailtoHref('lab@mindunder.dev', d)), /Your estimate: 3 people/);
  assert.equal(E.briefData(content, E.newSession()).estimate, null, 'no estimate, no row');
});

test('time and value questions open the estimate; price questions open cost', () => {
  for (const q of ['how much time do we waste', 'is it worth it', 'roi']) assert.equal(E.route(content.intents, q).target, 'estimate', q);
  assert.equal(E.route(content.intents, 'how much does it cost').target, 'cost');
});

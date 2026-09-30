import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blocks, blockTypes, validateBlock, validateBlocks, usage, eachBlock } from '../src/catalog.js';
import { nodeStrings, lintStrings } from '../src/lint.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const load = (p) => JSON.parse(read(`content/${p}`));
const manifest = load('graphs/default.json');
const nodes = manifest.nodes.flatMap((n) => [load(`nodes/${n}.json`)].flat());
const site = load('site.json');
const fixtures = load('graphs/fixtures.json').nodes.flatMap((n) => [load(`nodes/${n}.json`)].flat());

// blocks.js touches `document` on import, so its renderer keys are read from source.
function rendererKeys() {
  const src = read('src/blocks.js');
  const body = src.slice(src.indexOf('const renderers = {'), src.indexOf('\n};', src.indexOf('const renderers = {')));
  return [...body.matchAll(/^ {2}(\w+)(?=[:,])/gm)].map((m) => m[1]).sort();
}

test('every renderer has a catalogue entry, and every entry a renderer', () => {
  assert.deepEqual([...blockTypes].sort(), rendererKeys());
});

test('every catalogue example is valid', () => {
  for (const [type, spec] of Object.entries(blocks)) assert.deepEqual(validateBlock(spec.example, type), [], type);
});

test('every block in every topic is valid against the catalogue', () => {
  const problems = nodes.flatMap((n) => validateBlocks(n.blocks, n.id));
  assert.deepEqual(problems, []);
});

test('fact blocks name facts that exist in site.json', () => {
  const keys = new Set(Object.keys(site.facts));
  const bad = [];
  const check = (list, id) => {
    for (const b of eachBlock(list)) {
      if (b.type === 'fact' && !keys.has(b.key)) bad.push(`${id}: ${b.key}`);
      if (b.type === 'facts') for (const k of b.keys || []) if (!keys.has(k)) bad.push(`${id}: ${k}`);
    }
  };
  for (const n of [...nodes, ...fixtures]) check(n.blocks, n.id);
  for (const t of ['fact', 'facts']) check([blocks[t].example], `catalogue ${t}`);
  assert.deepEqual(bad, []);
});

test('the validator catches mistakes', () => {
  assert.match(validateBlock({ type: 'nope' })[0], /unknown type/);
  assert.match(validateBlock({ type: 'text' })[0], /content: required/);
  assert.match(validateBlock({ type: 'badge', status: 'x', variant: 'loud' })[0], /must be one of/);
  assert.match(validateBlock({ type: 'text', content: 'x', colour: 'red' })[0], /not a known prop/);
  assert.match(validateBlock({ type: 'split', left: [{ type: 'metric', label: 'x' }] })[0], /left\[0\]<metric>\.value: required/);
  assert.deepEqual(validateBlock({ type: 'text', content: 'x', $note: 'comments are fine' }), []);
});

test('usage maps every non-session type used in content', () => {
  const u = usage(nodes);
  assert.ok(u.flow.includes('haios'));
  assert.ok(u.metric.includes('callsheet_scheduler'), 'nested split blocks are counted');
});

test('fixtures are valid, follow the writing rules, and stay off the site', () => {
  assert.deepEqual(fixtures.flatMap((n) => validateBlocks(n.blocks, n.id)), []);
  const issues = fixtures.flatMap((n) => lintStrings(nodeStrings(n), site.language, { scope: n.id })).filter((i) => i.level === 'error' && i.where !== 'whole topic');
  assert.deepEqual(issues, []);
  const onSite = new Set(nodes.map((n) => n.id));
  assert.deepEqual(fixtures.filter((n) => onSite.has(n.id)).map((n) => n.id), []);
});

test('every block a topic can use is used at least once (topics or fixtures)', () => {
  const u = usage([...nodes, ...fixtures]);
  const unused = blockTypes.filter((t) => !blocks[t].runtime && !u[t].length);
  assert.deepEqual(unused, []);
});

test('nested blocks are found at any depth', () => {
  const deep = [{ type: 'section', title: 'a', blocks: [{ type: 'split', left: [{ type: 'section', title: 'b', blocks: [{ type: 'text', content: 'x' }] }] }] }];
  assert.deepEqual([...eachBlock(deep)].map((b) => b.type), ['section', 'split', 'section', 'text']);
});

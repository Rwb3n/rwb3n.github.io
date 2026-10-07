// The plain-language test. Fails if any visitor-facing text breaks the rules in
// content/site.json ("language"): idioms, jargon, in-jokes, long sentences,
// fragments, rhetorical questions, unexplained abbreviations, vague buttons,
// buttons that don't match where they go, or a reading grade that is too high.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexContent } from '../src/engine.js';
import { lintContent, lintStrings, flattenCopy, missingFacts } from '../src/lint.js';
import { copy, applyConfig } from '../src/copy.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const site = json('content/site.json');
const manifest = json('content/graphs/default.json');
const content = indexContent(manifest.nodes.map((n) => json(`content/nodes/${n}.json`)));
applyConfig(site);

// Every string in landing.path: intros, notes and case text are prose; the rest are labels.
function pathStrings(path, where = 'landing.path') {
  const out = [];
  for (const [k, v] of Object.entries(path)) {
    if (k.startsWith('$')) continue;
    const w = `${where}.${k}`;
    if (typeof v === 'string') out.push({ kind: /intro|note|line|before|build|result|detail/.test(k) ? 'prose' : 'label', text: v, where: w });
    else if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'string' ? (k === 'facts' ? null : out.push({ kind: 'label', text: x, where: `${w}[${i}]` })) : out.push(...pathStrings(x, `${w}[${i}]`))));
    else if (v && typeof v === 'object') out.push(...pathStrings(v, w));
  }
  return out;
}

const report = (issues) => issues.map((i) => `  [${i.scope}] ${i.where}: ${i.msg}${i.text ? `\n      “${i.text}”` : ''}`).join('\n');

test('every topic passes the plain-language rules', () => {
  const issues = lintContent(content, site).filter((i) => i.level === 'error');
  assert.equal(issues.length, 0, `\n${issues.length} problem(s):\n${report(issues)}`);
});

test('interface text passes the plain-language rules', () => {
  const strings = flattenCopy(copy).filter((s) => !/\.keywords\[/.test(s.where));
  const issues = lintStrings(strings, site.language, { scope: 'interface' }).filter((i) => i.level === 'error' && i.where !== 'whole topic');
  assert.equal(issues.length, 0, `\n${issues.length} problem(s):\n${report(issues)}`);
});

test('site.json text passes the plain-language rules', () => {
  const L = site.landing;
  const strings = [
    { kind: 'label', text: L.eyebrow, where: 'landing.eyebrow' },
    ...L.headline.map((t, i) => ({ kind: 'prose', text: t, where: `landing.headline[${i}]` })),
    L.lede && { kind: 'prose', text: L.lede, where: 'landing.lede' },
    L.cue && { kind: 'label', text: L.cue, where: 'landing.cue' },
    ...pathStrings(L.path || {}),
    { kind: 'label', text: L.allLink, where: 'landing.allLink' },
    L.tool && { kind: 'label', text: L.tool.label, where: 'landing.tool.label' },
    L.tool?.note && { kind: 'prose', text: L.tool.note, where: 'landing.tool.note' },
    { kind: 'prose', text: site.meta.description, where: 'meta.description' },
    { kind: 'label', text: site.meta.title, where: 'meta.title' },
    { kind: 'label', text: site.onePage.title, where: 'onePage.title' },
    { kind: 'prose', text: site.onePage.intro, where: 'onePage.intro' },
    ...Object.entries(site.facts).flatMap(([k, f]) => [
      { kind: 'label', text: f.label, where: `facts.${k}.label` },
      f.value && !f.link && { kind: /\.$/.test(f.value) ? 'prose' : 'label', text: f.value, where: `facts.${k}.value` },
      f.missing && { kind: 'prose', text: f.missing, where: `facts.${k}.missing` },
    ]),
  ].filter(Boolean);
  const issues = lintStrings(strings, site.language, { scope: 'site.json' }).filter((i) => i.level === 'error' && i.where !== 'whole topic');
  assert.equal(issues.length, 0, `\n${issues.length} problem(s):\n${report(issues)}`);
});

test('landing and one-page topics exist', () => {
  for (const id of [...site.onePage.sections, ...site.onePage.appendix]) assert.ok(content.nodes[id], `onePage lists missing topic "${id}"`);
  for (const k of site.landing.facts) assert.ok(site.facts[k], `landing lists missing fact "${k}"`);
  if (site.landing.tool) assert.ok(content.nodes[site.landing.tool.target], `landing.tool opens missing topic "${site.landing.tool.target}"`);
});

test('facts still to fill in (reported, not a failure)', (t) => {
  const missing = missingFacts(site);
  if (missing.length) t.diagnostic(`Owner to fill in content/site.json: ${missing.join('; ')}`);
});

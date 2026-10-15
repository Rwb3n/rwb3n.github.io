// The plain-language test. Fails if any visitor-facing text breaks the rules in
// content/site.json ("language"): idioms, jargon, in-jokes, long sentences,
// rhetorical questions, unexplained abbreviations, vague buttons, or a reading
// grade that is too high.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lintStrings, missingFacts } from '../src/lint.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const site = json('content/site.json');

// Every string in site.json › page. Longer text is prose; headings and labels are labels.
// The headline is held to the prose rules too (statements, not questions).
const PROSE = /^(headline|intro|lead|note|line|lines|before|build|result|detail|text|example|loading|failed|email|unset|cue|items)$/;
function pageStrings(v, where = 'page', key = '') {
  if (typeof v === 'string') return [{ kind: PROSE.test(key) ? 'prose' : 'label', text: v.replace(/\{email\}/g, site.person.email), where }];
  if (Array.isArray(v)) return v.flatMap((x, i) => pageStrings(x, `${where}[${i}]`, key));
  if (v && typeof v === 'object') return Object.entries(v).filter(([k]) => !k.startsWith('$') && !['name', 'key', 'long'].includes(k)).flatMap(([k, x]) => pageStrings(x, `${where}.${k}`, k));
  return [];
}

const report = (issues) => issues.map((i) => `  [${i.scope}] ${i.where}: ${i.msg}${i.text ? `\n      “${i.text}”` : ''}`).join('\n');

test('the page passes the plain-language rules', () => {
  const strings = [
    ...pageStrings(site.page),
    { kind: 'prose', text: site.meta.description, where: 'meta.description' },
    { kind: 'label', text: site.meta.title, where: 'meta.title' },
    ...Object.entries(site.facts).flatMap(([k, f]) => [
      { kind: 'label', text: f.label, where: `facts.${k}.label` },
      f.value && { kind: /\.$/.test(f.value) ? 'prose' : 'label', text: f.value, where: `facts.${k}.value` },
      f.missing && { kind: 'prose', text: f.missing, where: `facts.${k}.missing` },
    ]),
  ].filter(Boolean);
  assert.ok(strings.length > 50);
  const issues = lintStrings(strings, site.language, { scope: 'site.json' }).filter((i) => i.level === 'error' && i.where !== 'whole topic');
  assert.equal(issues.length, 0, `\n${issues.length} problem(s):\n${report(issues)}`);
});

test('the page names facts that exist', () => {
  for (const f of site.page.start.facts) if (f.key) assert.ok(site.facts[f.key], f.key);
});

test('facts still to fill in (reported, not a failure)', (t) => {
  const missing = missingFacts(site);
  if (missing.length) t.diagnostic(`Owner to fill in content/site.json: ${missing.join('; ')}`);
});

// The copy draft for the target site (_model/target/copy.md): every line
// starting with "> " is visitor-facing text, checked by the same rules.
test('target copy draft follows the writing rules', () => {
  let where = '';
  const strings = [];
  for (const line of readFileSync(new URL('../_model/target/copy.md', import.meta.url), 'utf8').split(/\r?\n/)) {
    if (line.startsWith('## ')) where = line.slice(3);
    else if (where && line.startsWith('> ')) {
      const text = line.slice(2).trim();
      strings.push({ kind: /\.$/.test(text) ? 'prose' : 'label', text, where: `copy.md › ${where}` });
    }
  }
  assert.ok(strings.length > 20, 'copy.md has visitor-facing lines');
  const issues = lintStrings(strings, site.language, { scope: 'copy.md' }).filter((i) => i.level === 'error' && i.where !== 'whole topic');
  assert.equal(issues.length, 0, `\n${issues.length} problem(s):\n${report(issues)}`);
});

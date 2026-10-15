// Offline trial of the decision model for step 1 (_model/target/funnel.md ›
// Changed, evening). Sends each sentence in sentences.json with the questions
// in questions.json, writes results.json, and prints a summary against the
// expected answers. Not part of the site. The key comes from the environment.
//   OPENROUTER_API_KEY=… node _model/trials/jev/run.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const here = (p) => new URL(p, import.meta.url);
const questions = JSON.parse(readFileSync(here('questions.json'), 'utf8'));
const sentences = JSON.parse(readFileSync(here('sentences.json'), 'utf8'));
const MODEL = process.env.JEV_MODEL || 'typesafe/jev-1.14';
const key = process.env.OPENROUTER_API_KEY;
if (!key) { console.error('Set OPENROUTER_API_KEY'); process.exit(1); }

const results = [];
for (const s of sentences) {
  const t0 = performance.now();
  const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, state: { visitor_sentence: s.text }, questions }),
  });
  const ms = Math.round(performance.now() - t0);
  const body = await res.json();
  if (!res.ok) { console.error(res.status, JSON.stringify(body).slice(0, 400)); process.exit(1); }
  results.push({ text: s.text, expect: s.expect, ms, answers: body.answers, usage: body.usage, model: body.model });
}
writeFileSync(here('results.json'), JSON.stringify(results, null, 2) + '\n');

const sysKeys = Object.keys(questions).filter((k) => k.startsWith('sys_'));
const ok = { repeated: 0, job: 0, frequency: 0, people: 0, sys: 0 };
const tot = { repeated: 0, job: 0, frequency: 0, people: 0, sys: 0 };
for (const r of results) {
  const a = r.answers, e = r.expect;
  const rep = a.repeated.noul;
  tot.repeated++; if ((rep >= 0.5) === e.repeated) ok.repeated++;
  const SYS_MIN = 0.8; // below this, a system is not drawn
  const sys = sysKeys.filter((k) => a[k].noul >= SYS_MIN).map((k) => k.slice(4));
  let line = `${String(r.ms).padStart(5)}ms  rep ${rep.toFixed(2)}${(rep >= 0.5) === e.repeated ? ' ' : '✗'}`;
  if (e.job) { tot.job++; const hit = a.job.choice === e.job; if (hit) ok.job++; line += `  job ${a.job.choice}${hit ? '' : `✗(${e.job})`} ${a.job.confidence.toFixed(2)}`; }
  if (e.frequency !== undefined) { tot.frequency++; const hit = Math.round(a.frequency.score) === e.frequency; if (hit) ok.frequency++; line += `  freq ${a.frequency.score.toFixed(1)}${hit ? '' : `✗(${e.frequency})`}`; }
  if (e.people) { tot.people++; const hit = a.people.choice === e.people; if (hit) ok.people++; line += `  ppl ${a.people.choice}${hit ? '' : `✗(${e.people})`}`; }
  if (e.sys) { tot.sys++; const hit = e.sys.every((x) => sys.includes(x)); if (hit) ok.sys++; line += `  sys [${sys.join(',')}]${hit ? '' : `✗(${e.sys})`}`; }
  console.log(`${line}\n         "${r.text}"`);
}
const cost = results.reduce((sum, r) => sum + (r.usage?.cost || 0), 0);
const lat = results.map((r) => r.ms).sort((x, y) => x - y);
console.log(`\nmodel ${results[0].model}`);
for (const k of Object.keys(ok)) console.log(`${k.padEnd(10)} ${ok[k]}/${tot[k]}`);
console.log(`latency p50 ${lat[Math.floor(lat.length / 2)]}ms, max ${lat.at(-1)}ms (from here, network included)`);
console.log(`cost $${cost.toFixed(6)} for ${results.length} ($${(cost / results.length).toFixed(7)} each)`);

// The page against its signed-off target (_model/target/funnel.md, copy.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRegions, bookingUrl } from '../src/static.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const site = JSON.parse(read('content/site.json'));
// With a booking link, as the page will be once Cal.com is set up.
const withLink = { ...site, booking: { ...site.booking, calLink: 'example/30min' } };
const html = (s) => renderRegions(s).page.join('\n');
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();

test('every visitor-facing line of the signed-off copy is on the page, word for word', () => {
  const page = text(html(withLink));
  // Visitor lines are the "> " lines under a "## " section heading (the
  // blockquote at the top of copy.md is a note about the file).
  let inSection = false;
  const copy = [];
  for (const l of read('_model/target/copy.md').split(/\r?\n/)) {
    if (l.startsWith('## ')) inSection = l !== '## Check';
    else if (inSection && l.startsWith('> ') && l.slice(2).trim()) copy.push(l.slice(2).trim());
  }
  assert.ok(copy.length > 30, 'copy.md has visitor lines');
  // Lines of the answer that hold the visitor's own words or numbers match
  // their template in site.json › page.job.answer instead.
  const A = site.page.job.answer;
  const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const templates = ['you', 'share', 'weeks', 'nearest'].map((k) => new RegExp(`^${A[k].split(/\{\w+\}/).map(escRe).join('.+')}$`));
  const missing = copy.filter((l) => !page.includes(l) && !templates.some((t) => t.test(l)));
  assert.deepEqual(missing, []);
});

test('five sections, in the order of the funnel', () => {
  const ids = [...html(withLink).matchAll(/<section class="pg-section is-[a-z]+" id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['job', 'cases', 'start', 'who', 'book']);
});

test('steps 2 and 3 each have a quiet link to #book with the same label', () => {
  const h = html(withLink);
  for (const id of ['cases', 'start']) {
    const sec = h.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`))[0];
    assert.match(sec, new RegExp(`<a class="pg-book-link[^"]*" href="#book">${site.page.bookLink} `), id);
  }
});

test('one filled button: "Show available times" (step 1 is taps)', () => {
  const h = html(withLink);
  const filled = [...h.matchAll(/class="btn btn-primary[^"]*"[^>]*>([^<]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(filled, [site.page.book.show]);
});

test('without JavaScript, step 1 is a form to the Cal.com page with the answers as booking questions', () => {
  const h = html(withLink);
  const form = h.match(/<form[^>]*data-job[^>]*>/)[0];
  assert.match(form, /method="get"/);
  assert.match(form, /action="https:\/\/cal\.com\/example\/30min"/);
  const names = [...h.matchAll(/<(?:input|textarea)[^>]*name="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, site.booking.fields);
  // The taps and what they bring need JavaScript, so they start hidden.
  assert.match(h, /<div class="pg-bench" data-answer hidden>/);
  assert.match(h, /<a class="btn btn-primary pg-show" href="https:\/\/cal\.com\/example\/30min"/);
  assert.equal(bookingUrl(withLink, { job: 'Monday report', scale: '' }), 'https://cal.com/example/30min?job=Monday+report');
});

test('every field has a label above it and one example line, and no placeholder', () => {
  const h = html(withLink);
  for (const f of [site.page.job.field, site.page.job.noscript]) {
    assert.match(h, new RegExp(`<label class="pg-label" for="f-${f.name}">`), f.name);
    assert.match(h, new RegExp(`id="f-${f.name}-ex"`), f.name);
  }
  assert.doesNotMatch(h, /placeholder=/);
});

test('without a booking link, nothing goes to Cal.com: email only', () => {
  const h = html({ ...site, booking: { ...site.booking, calLink: null } });
  assert.doesNotMatch(h, /action=|data-booking|cal\.com\//);
  assert.match(h, /mailto:/);
});

test('every example has an id and words for "nearest example"', () => {
  for (const c of site.page.cases.items) {
    assert.match(c.id, /^[a-z-]+$/, c.title);
    assert.ok(c.match.length >= 5, c.title);
  }
});

test('step 4 shows who is speaking: full name and a photograph that says who it is', () => {
  const h = html(withLink);
  assert.ok(site.person.fullName);
  assert.match(h, new RegExp(`<p class="pg-who-name">${site.person.fullName}</p>`));
  assert.match(h, /<img class="pg-photo" src="img\/ruben\.jpg"[^>]*alt="Ruben Pires[^"]+"/);
  assert.ok(readFileSync(new URL('../img/ruben.jpg', import.meta.url)).length < 120_000, 'photo under 120 KB');
});

test('honesty: the page never says it sent, received or booked anything', () => {
  const page = text(html(withLink)).toLowerCase();
  for (const w of ['has been sent', 'was sent', 'we received', 'received your', 'is booked', 'booking confirmed', 'confirmed', 'running today', 'runs today']) {
    assert.ok(!page.includes(w), w);
  }
  // At most one sentence about sending, and it says nothing is sent.
  assert.ok((page.match(/\bsent\b/g) || []).length <= 1);
});

test('the Cal.com script is never in the page itself', () => {
  assert.doesNotMatch(read('index.html'), /<script[^>]*embed\.js/);
  assert.doesNotMatch(html(withLink), /<script/);
});

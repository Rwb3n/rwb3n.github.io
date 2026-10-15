// The page against its target (_model/target/funnel.md, copy.md), and the
// page config against the parts it is composed of (src/parts.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderRegions, bookingUrl, talkConfig } from '../src/static.js';
import { validatePage, parts, partTypes, renderPart } from '../src/parts.js';
import { checkProps } from '../src/catalog.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const site = JSON.parse(read('content/site.json'));
// With a booking link, as the page will be once Cal.com is set up.
const withLink = { ...site, booking: { ...site.booking, calLink: 'example/30min' } };
const html = (s) => renderRegions(s).page.join('\n');
const allParts = site.page.sections.flatMap((s) => s.parts);
const part = (type) => allParts.find((p) => p.type === type);
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();

test('every visitor-facing line of the signed-off copy is on the page, word for word', () => {
  const page = text(html(withLink));
  // Visitor lines are the "> " lines under a "## " section heading (the
  // blockquote at the top of copy.md is a note about the file).
  let inSection = false;
  const copy = [];
  for (const l of read('_model/target/copy.md').split(/\r?\n/)) {
    if (l.startsWith('## ')) inSection = l !== '## Check' && l !== '## Conversation answers';
    else if (inSection && l.startsWith('> ') && l.slice(2).trim()) copy.push(l.slice(2).trim());
  }
  assert.ok(copy.length > 30, 'copy.md has visitor lines');
  const missing = copy.filter((l) => !page.includes(l));
  assert.deepEqual(missing, []);
});

test('the conversation answers in copy.md are the ones in site.json, word for word', () => {
  const lines = read('_model/target/copy.md').split(/## Conversation answers/)[1].split(/\n## /)[0]
    .split(/\r?\n/).filter((l) => l.startsWith('> ') && l.slice(2).trim()).map((l) => l.slice(2).trim());
  const c = site.conversation;
  assert.deepEqual(lines, [c.fallback, c.describe, c.describeUnset]);
});

test('six sections, in the order of the funnel', () => {
  const ids = [...html(withLink).matchAll(/<section class="pg-section is-[a-z]+" id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['problem', 'cases', 'start', 'who', 'intake', 'book']);
});

test('the page config is valid, and every part type has a valid example', () => {
  assert.deepEqual(validatePage(site), []);
  for (const t of partTypes) {
    const { type, ...rest } = parts[t].example;
    assert.equal(type, t);
    assert.deepEqual(checkProps(rest, parts[t].props, t), [], t);
    assert.ok(renderPart(parts[t].example, { site: withLink, id: 'x', email: 'a@b.c', bookUrl: 'https://cal.com/x' }).length, t);
  }
});

test('the validator catches a broken page', () => {
  const bad = structuredClone(site);
  bad.page.sections[1].parts.push({ type: 'nope' }, { type: 'text' }, { type: 'headline', lines: ['x'] });
  bad.page.sections[2].replies.push('nowhere');
  bad.page.sections.push({ ...bad.page.sections[0] });
  const errors = validatePage(bad).join('\n');
  for (const want of ['type: must be one of', '.text: required', 'a headline only goes in a hero section', 'no section "nowhere"', 'id: used twice', 'exactly one hero section']) assert.ok(errors.includes(want), want);
  assert.throws(() => renderRegions(bad), /not valid/);
});

test('sections can be reordered, removed and repeated from config alone', () => {
  const s = structuredClone(withLink);
  const [problem, cases, start, who, intake, book] = s.page.sections;
  s.page.sections = [problem, who, { ...cases, id: 'more', reply: 'More', replies: [] }, book, intake];
  s.page.sections[0].replies = ['who', 'more', 'book'];
  const ids = [...html(s).matchAll(/<section class="pg-section is-[a-z]+" id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['problem', 'who', 'more', 'book', 'intake']);
  assert.match(html(s), /href="#more" data-to="more">More/);
});

test('steps 1 to 4 each offer the quiet link to the booking section, with the same label', () => {
  const h = html(withLink);
  for (const id of ['problem', 'cases', 'start', 'who']) {
    const sec = h.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`))[0];
    assert.match(sec, new RegExp(`<a class="pg-book-link" href="#book" data-to="book">${site.page.bookLink} `), id);
  }
});

test('every reply leads to a section, and is labelled with what the visitor says to open it', () => {
  const h = html(withLink);
  for (const m of h.matchAll(/<a class="pg-reply" href="#([a-z]+)" data-to="([a-z]+)">([^<]+?) </g)) {
    assert.equal(m[1], m[2]);
    assert.equal(m[3], site.page.sections.find((s) => s.id === m[1]).reply);
  }
});

test('the conversation config names only sections that are on the page', () => {
  for (const s of [withLink, site]) {
    const cfg = talkConfig(s);
    const ids = cfg.sections.map((x) => x.id);
    assert.ok(ids.includes(cfg.start) && ids.includes(cfg.book));
    for (const x of cfg.sections) for (const r of x.replies) assert.ok(ids.includes(r), r);
    assert.equal(cfg.intake, s === site ? null : 'intake');
    for (const a of cfg.answers) assert.ok(a.text, 'empty facts are left out');
  }
});

test('the ask bar is hidden without JavaScript', () => {
  assert.match(html(withLink), /<form class="pg-ask" data-ask hidden>/);
});

test('the page has exactly one filled button, "Show available times"', () => {
  const h = html(withLink);
  const filled = [...h.matchAll(/class="btn btn-primary[^"]*"[^>]*>([^<]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(filled, [part('booking').show]);
});

test('without JavaScript, the intake form goes to the Cal.com page with the answers as booking questions', () => {
  const h = html(withLink);
  const form = h.match(/<form[^>]*data-intake[^>]*>/)[0];
  assert.match(form, /method="get"/);
  assert.match(form, /action="https:\/\/cal\.com\/example\/30min"/);
  const intakeForm = h.match(/<form class="pg-intake"[\s\S]*?<\/form>/)[0];
  const names = [...intakeForm.matchAll(/<(?:input|textarea)[^>]*name="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, site.booking.fields);
  assert.match(h, /<a class="btn btn-primary pg-show" href="https:\/\/cal\.com\/example\/30min"/);
  assert.equal(bookingUrl(withLink, { job: 'Monday report', scale: '' }), 'https://cal.com/example/30min?job=Monday+report');
});

test('every field has a label above it and one example line, and no placeholder', () => {
  const h = html(withLink);
  for (const f of part('intake').fields) {
    assert.match(h, new RegExp(`<label class="pg-label" for="f-${f.name}">`), f.name);
    assert.match(h, new RegExp(`id="f-${f.name}-ex"`), f.name);
  }
  assert.doesNotMatch(h, /placeholder=/);
});

test('without a booking link, no form and nothing to send: email only', () => {
  const h = html({ ...site, booking: { ...site.booking, calLink: null } });
  assert.doesNotMatch(h, /<form class="pg-intake|data-booking|cal\.com\//);
  // The ask bar has no action: it only routes within the page.
  assert.doesNotMatch(h.match(/<form class="pg-ask"[^>]*>/)[0], /action=/);
  assert.match(h, /mailto:/);
});

test('honesty: the page never says it sent, received or booked anything', () => {
  const page = text(html(withLink)).toLowerCase();
  for (const w of ['has been sent', 'was sent', 'we received', 'received your', 'is booked', 'booking confirmed', 'confirmed', 'running today', 'runs today']) {
    assert.ok(!page.includes(w), w);
  }
  // "Nothing is sent until you book." is the one sentence about sending.
  assert.equal((page.match(/\bsent\b/g) || []).length, 1);
});

test('the Cal.com script is never in the page itself', () => {
  assert.doesNotMatch(read('index.html'), /<script[^>]*embed\.js/);
  assert.doesNotMatch(html(withLink), /<script/);
});

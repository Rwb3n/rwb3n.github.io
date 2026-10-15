// Behaviour checks on the real page (no screenshots).
// Cal.com cannot be reached from the tests: its embed script is stubbed, and a
// sample booking link is put into the page so the booking step exists.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { renderRegions, applyRegions } from '../../src/static.js';

const site = JSON.parse(readFileSync(new URL('../../content/site.json', import.meta.url), 'utf8'));
const shell = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const withLink = { ...site, booking: { ...site.booking, calLink: 'example/30min' } };
const pageWithLink = applyRegions(shell, renderRegions(withLink));
const pageNoLink = applyRegions(shell, renderRegions({ ...site, booking: { ...site.booking, calLink: null } }));

// A stand-in for Cal.com's embed.js: runs the queued calls, draws a box, and
// reports linkReady.
const STUB = `(() => { const on = {}; let el;
  const run = (a) => { const [cmd, o] = a; if (cmd === 'inline') { el = document.querySelector(o.elementOrSelector); window.__calInline = o; } if (cmd === 'on') on[o.action] = o.callback; };
  (window.Cal.q || []).forEach(run); window.Cal = function () { run(arguments); }; window.Cal.loaded = true;
  setTimeout(() => { el.innerHTML = '<div style="height:600px">calendar</div>'; on.linkReady && on.linkReady(); }, 200); })();`;

async function open(page, { cal = 'ok', html = pageWithLink, js = true } = {}) {
  const calRequests = [];
  page.on('request', (r) => { if (/cal\.com/.test(r.url())) calRequests.push(r.url()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com|fontshare\.com/, (r) => r.abort());
  await page.route((u) => u.pathname === '/' || u.pathname === '/index.html', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.route('https://app.cal.com/embed/embed.js', (r) => (cal === 'ok' ? r.fulfill({ contentType: 'text/javascript', body: STUB }) : r.abort()));
  await page.route(/^https:\/\/cal\.com\//, (r) => r.fulfill({ contentType: 'text/html', body: '<title>Cal.com</title>' }));
  await page.goto('/');
  // With JavaScript, wait until the page's script has wired the buttons;
  // a click before that follows the plain link, as it should without it.
  if (js) await page.waitForFunction(() => 'mindunderJob' in window);
  return calRequests;
}

test('the page loads without errors and asks Cal.com for nothing until the visitor acts', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const calRequests = await open(page);
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
  expect(calRequests).toEqual([]);
  expect(await page.locator('.pg-section').evaluateAll((s) => s.map((x) => x.id))).toEqual(['job', 'cases', 'start', 'who', 'book']);
});

test('step 1 answers the visitor, then opens the calendar with their words and numbers', async ({ page }) => {
  const calRequests = await open(page);
  await expect(page.locator('#f-scale')).toHaveCount(0);
  await page.fill('#f-job', 'We rebuild the Monday report from three spreadsheets');
  await page.fill('#n-people', '1');
  await page.click('[data-job-show]');
  const answer = page.locator('[data-answer]');
  await expect(answer).toBeVisible();
  await expect(answer).toContainText('You: We rebuild the Monday report from three spreadsheets');
  await expect(page.locator('[data-answer-pay]')).toHaveText('£35,000');
  await expect(page.locator('[data-answer-cost]')).toHaveText('£3,733');
  await expect(answer).toContainText('Of the £35,000 a year you pay them, £3,733 goes on this job.');
  await expect(page.locator('[data-answer-nearest] a')).toHaveAttribute('href', '#case-monday-report');
  expect(calRequests).toEqual([]);
  // Changing a number updates the answer in place.
  await page.click('[aria-label="One person more"]');
  await expect(page.locator('[data-answer-cost]')).toHaveText('£7,467');
  await page.click('[data-answer-book]');
  await expect(page.locator('[data-book-status]')).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('book-h');
  expect(await page.evaluate(() => window.__calInline)).toMatchObject({ calLink: 'example/30min', config: {
    job: 'We rebuild the Monday report from three spreadsheets', scale: '2 people, 4 hours each a week, salary £35,000 each: about £7,467 a year on this job' } });
  await expect(page.locator('[data-book-show]')).toBeHidden();
  expect(calRequests).toEqual(['https://app.cal.com/embed/embed.js']);
});

test('no example is named when none is near, and untouched numbers stay out of the booking', async ({ page }) => {
  await open(page);
  await page.fill('#f-job', 'Booking rooms for the team');
  await page.click('[data-job-show]');
  await expect(page.locator('[data-answer-nearest]')).toBeHidden();
  // The starting numbers are ours, not the visitor's: only their words go.
  await page.click('[data-answer-book]');
  await expect(page.locator('[data-book-status]')).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => window.__calInline.config)).toEqual({ layout: 'month_view', job: 'Booking rooms for the team' });
});

test('"Show available times" works without filling in the intake', async ({ page }) => {
  await open(page);
  await page.click('[data-book-show]');
  await expect(page.locator('[data-book-embed]')).toContainText('calendar', { timeout: 5000 });
  expect(await page.evaluate(() => window.__calInline.config)).toEqual({ layout: 'month_view' });
});

test('if Cal.com does not load, the page offers its booking page with the answers, and email', async ({ page }) => {
  await open(page, { cal: 'blocked' });
  await page.fill('#f-job', 'Copying orders');
  await page.click('[data-book-show]');
  const fail = page.locator('[data-book-fail]');
  await expect(fail).toBeVisible({ timeout: 12000 });
  await expect(page.locator('[data-book-status]')).toBeHidden();
  expect(await page.locator('[data-book-open]').getAttribute('href')).toBe('https://cal.com/example/30min?job=Copying+orders');
  await expect(page.locator('.pg-email a')).toHaveAttribute('href', `mailto:${site.person.email}`);
});

test('without JavaScript, step 1 goes to the Cal.com page with the answers', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await open(page, { js: false });
  await expect(page.locator('[data-job-show]')).toBeHidden();
  await page.fill('#f-job', 'The Monday report');
  await page.fill('#f-scale', 'Two people, every Monday');
  await page.click('.pg-job-go');
  await page.waitForURL(/cal\.com/);
  expect(page.url()).toBe('https://cal.com/example/30min?job=The+Monday+report&scale=Two+people%2C+every+Monday');
  await ctx.close();
});

test('every "Book the free call" link goes to the booking step', async ({ page }) => {
  await open(page);
  const hrefs = await page.locator('.pg-book-link').evaluateAll((l) => l.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBe(2);
  expect(new Set(hrefs)).toEqual(new Set(['#book']));
});

test('without a booking link, the live page offers email only', async ({ page }) => {
  await open(page, { html: pageNoLink });
  await expect(page.locator('form[action]')).toHaveCount(0);
  await expect(page.locator('#book a[href^="mailto:"]')).toHaveCount(1);
});

// Scroll reveals must not hide content that has not been scrolled to yet:
// full-page captures, previews and archives never scroll.
test('nothing below the fold is hidden before scrolling, with full motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page);
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('full');
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.pg-section > *')]
    .filter((e) => e.getBoundingClientRect().top > innerHeight && +getComputedStyle(e).opacity < 1)
    .map((e) => e.className || e.tagName));
  expect(hidden).toEqual([]);
});

// Everything the page is made of is shown in the component library.
test('the component library covers every class used on the page', async ({ page }) => {
  const classes = async (selector) => page.evaluate((sel) => {
    const out = new Set();
    for (const root of document.querySelectorAll(sel)) for (const el of [root, ...root.querySelectorAll('*')]) {
      const c = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
      c.split(/\s+/).filter(Boolean).forEach((x) => out.add(x));
    }
    return [...out];
  }, selector);
  await open(page);
  await page.waitForTimeout(800);
  const used = await classes('.pg');
  await page.goto('/components/');
  await page.waitForSelector('#layout-page .pg-section');
  const lib = new Set(await classes('.lib-main'));
  expect(used.filter((c) => !lib.has(c))).toEqual([]);
});

// Diagram boxes are sized from the mono font's measured width; every label
// must fit inside its box, whatever font is in use.
test('every diagram label in the library fits inside its box', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com|fontshare\.com/, (r) => r.abort());
  await page.goto('/components/');
  await page.waitForSelector('#block-flow .fl-node');
  const r = await page.evaluate(() => {
    const bad = [];
    for (const g of document.querySelectorAll('.fl-node')) {
      const rect = g.querySelector('rect');
      if (!rect) continue;
      const rw = rect.getBBox().width;
      for (const t of g.querySelectorAll('text')) if (t.getBBox().width > rw - 8) bad.push(t.textContent);
    }
    return { count: document.querySelectorAll('.fl-node text').length, bad };
  });
  expect(r.count).toBeGreaterThan(10);
  expect(r.bad).toEqual([]);
});

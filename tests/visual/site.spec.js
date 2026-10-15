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

// A stand-in for Cal.com's embed.js: runs the queued calls, draws a box, and
// reports linkReady.
const STUB = `(() => { const on = {}; let el;
  const run = (a) => { const [cmd, o] = a; if (cmd === 'inline') { el = document.querySelector(o.elementOrSelector); window.__calInline = o; } if (cmd === 'on') on[o.action] = o.callback; };
  (window.Cal.q || []).forEach(run); window.Cal = function () { run(arguments); }; window.Cal.loaded = true;
  setTimeout(() => { el.innerHTML = '<div style="height:600px">calendar</div>'; on.linkReady && on.linkReady(); }, 200); })();`;

async function open(page, { cal = 'ok', html = pageWithLink, hash = '' } = {}) {
  const calRequests = [];
  page.on('request', (r) => { if (/cal\.com/.test(r.url())) calRequests.push(r.url()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com|fontshare\.com/, (r) => r.abort());
  await page.route((u) => u.pathname === '/' || u.pathname === '/index.html', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.route('https://app.cal.com/embed/embed.js', (r) => (cal === 'ok' ? r.fulfill({ contentType: 'text/javascript', body: STUB }) : r.abort()));
  await page.route(/^https:\/\/cal\.com\//, (r) => r.fulfill({ contentType: 'text/html', body: '<title>Cal.com</title>' }));
  await page.goto(`/${hash}`);
  return calRequests;
}

test('the page loads without errors and asks Cal.com for nothing until the visitor acts', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const calRequests = await open(page);
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
  expect(calRequests).toEqual([]);
  expect(await page.locator('.pg-section').evaluateAll((s) => s.map((x) => x.id))).toEqual(['problem', 'cases', 'start', 'who', 'intake', 'book']);
  // A conversation: only the first turn is open, with the ask bar under it.
  expect(await page.locator('.pg-section:visible').evaluateAll((s) => s.map((x) => x.id))).toEqual(['problem']);
  await expect(page.locator('[data-ask]')).toBeVisible();
});

test('a reply says itself back, opens its section under the turn, and spends the earlier replies', async ({ page }) => {
  await open(page);
  await page.click('#problem .pg-reply[data-to="cases"]');
  await expect(page.locator('#cases')).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('cases-h');
  await expect(page.locator('.pg-you').last()).toHaveText(/You\s+Show me examples/);
  await expect(page.locator('#problem .pg-replies')).toBeHidden();
  // The new turn offers what is not open yet, and the booking link.
  expect(await page.locator('#cases .pg-replies a:visible').evaluateAll((l) => l.map((a) => a.dataset.to))).toEqual(['start', 'who', 'book']);
  expect(page.url()).toMatch(/#cases$/);
  await page.click('#cases [data-to="who"]');
  expect(await page.locator('.pg-section:visible').evaluateAll((s) => s.map((x) => x.id))).toEqual(['problem', 'cases', 'who']);
  expect(await page.locator('#who .pg-replies a:visible').evaluateAll((l) => l.map((a) => a.dataset.to))).toEqual(['intake', 'book']);
});

test('typed text: a fact answers a question; a description opens the intake with the words in it', async ({ page }) => {
  await open(page);
  await page.fill('#ask', 'How much does it cost?');
  await page.press('#ask', 'Enter');
  await expect(page.locator('.pg-turn .pg-answer')).toHaveText(site.facts.cost.missing);
  await expect(page.locator('.pg-turn .pg-you')).toContainText('“How much does it cost?”');
  await page.fill('#ask', 'Two of us copy orders into a spreadsheet by hand every day');
  await page.press('#ask', 'Enter');
  await expect(page.locator('#intake')).toBeVisible();
  await expect(page.locator('#f-job')).toHaveValue('Two of us copy orders into a spreadsheet by hand every day');
  await expect(page.locator('#intake .pg-answer')).toHaveText(site.conversation.describe);
  await page.fill('#ask', 'purple elephants');
  await page.press('#ask', 'Enter');
  await expect(page.locator('.pg-turn .pg-answer').last()).toHaveText(site.conversation.fallback);
  // The ask bar stays under the latest turn.
  expect(await page.evaluate(() => document.querySelector('.pg').lastElementChild.matches('[data-ask]'))).toBe(true);
});

test('"Show the whole page" puts every section back in order, as without JavaScript', async ({ page }) => {
  await open(page);
  await page.click('#problem [data-to="who"]');
  await page.click('[data-show-all]');
  expect(await page.locator('.pg-section:visible').evaluateAll((s) => s.map((x) => x.id))).toEqual(['problem', 'cases', 'start', 'who', 'intake', 'book']);
  await expect(page.locator('.pg-you')).toHaveCount(0);
  await expect(page.locator('[data-ask]')).toBeHidden();
  expect(page.url()).toMatch(/#all$/);
});

test('deep links: /#start opens that section; /#all the whole page', async ({ page }) => {
  await open(page, { hash: '#start' });
  expect(await page.locator('.pg-section:visible').evaluateAll((s) => s.map((x) => x.id))).toEqual(['problem', 'start']);
  await page.goto('/#all');
  await expect(page.locator('.pg-section:visible')).toHaveCount(6);
});

test('the intake form opens the calendar with the answers, and focus moves to the booking heading', async ({ page }) => {
  const calRequests = await open(page, { hash: '#intake' });
  await page.fill('#f-job', 'The Monday report');
  await page.fill('#f-scale', 'Two people, every Monday');
  await page.click('.pg-intake-go');
  await expect(page.locator('[data-book-status]')).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('book-h');
  expect(await page.evaluate(() => window.__calInline)).toMatchObject({ calLink: 'example/30min', config: { job: 'The Monday report', scale: 'Two people, every Monday' } });
  await expect(page.locator('[data-book-show]')).toBeHidden();
  await expect(page.locator('[data-book-fail]')).toBeHidden();
  await expect(page.locator('#book')).toBeVisible();
  expect(calRequests).toEqual(['https://app.cal.com/embed/embed.js']);
});

test('"Show available times" works without filling in the intake', async ({ page }) => {
  await open(page);
  await page.click('#problem .pg-book-link');
  await expect(page.locator('#book')).toBeVisible();
  await page.click('[data-book-show]');
  await expect(page.locator('[data-book-embed]')).toContainText('calendar', { timeout: 5000 });
  expect(await page.evaluate(() => window.__calInline.config)).toEqual({ layout: 'month_view' });
});

test('if Cal.com does not load, the page offers its booking page with the answers, and email', async ({ page }) => {
  await open(page, { cal: 'blocked', hash: '#intake' });
  await page.fill('#f-job', 'Copying orders');
  await page.click('.pg-intake-go');
  const fail = page.locator('[data-book-fail]');
  await expect(fail).toBeVisible({ timeout: 12000 });
  await expect(page.locator('[data-book-status]')).toBeHidden();
  expect(await page.locator('[data-book-open]').getAttribute('href')).toBe('https://cal.com/example/30min?job=Copying+orders');
  await expect(page.locator('#book a[href^="mailto:"]')).toHaveAttribute('href', `mailto:${site.person.email}`);
});

test('without JavaScript, the intake form goes to the Cal.com page with the answers', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await open(page);
  await page.fill('#f-job', 'The Monday report');
  await page.click('.pg-intake-go');
  await page.waitForURL(/cal\.com/);
  expect(page.url()).toBe('https://cal.com/example/30min?job=The+Monday+report&scale=');
  await ctx.close();
});

test('every "Book the free call" link goes to the booking section', async ({ page }) => {
  await open(page);
  const hrefs = await page.locator('.pg-book-link').evaluateAll((l) => l.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBe(4);
  expect(new Set(hrefs)).toEqual(new Set(['#book']));
  await page.click('#problem .pg-book-link');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('book-h');
});

test('without a booking link, the live page offers email only', async ({ page }) => {
  await open(page, { html: shell });
  await expect(page.locator('form[data-intake]')).toHaveCount(0);
  await expect(page.locator('#book a[href^="mailto:"]')).toHaveCount(1);
});

// Scroll reveals must not hide content that has not been scrolled to yet:
// full-page captures, previews and archives never scroll.
test('nothing below the fold is hidden before scrolling, with full motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, { hash: '#all' });
  expect(await page.evaluate(() => document.documentElement.dataset.motion)).toBe('full');
  await page.waitForTimeout(900);
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
  // Classes from every state: the conversation a few turns in, then the whole page.
  await open(page);
  await page.click('#problem [data-to="cases"]');
  await page.fill('#ask', 'How much does it cost?');
  await page.press('#ask', 'Enter');
  await page.fill('#ask', 'We copy orders by hand every day');
  await page.press('#ask', 'Enter');
  await page.waitForTimeout(800);
  const used = await classes('.pg');
  await page.click('[data-show-all]');
  used.push(...await classes('.pg'));
  await page.goto('/components/');
  await page.waitForSelector('#layout-talk .pg-turn');
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

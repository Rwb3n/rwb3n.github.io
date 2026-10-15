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

async function open(page, { cal = 'ok', html = pageWithLink, js = true, query = '' } = {}) {
  const calRequests = [];
  page.on('request', (r) => { if (/cal\.com/.test(r.url())) calRequests.push(r.url()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com|fontshare\.com/, (r) => r.abort());
  await page.route((u) => u.pathname === '/' || u.pathname === '/index.html', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.route('https://app.cal.com/embed/embed.js', (r) => (cal === 'ok' ? r.fulfill({ contentType: 'text/javascript', body: STUB }) : r.abort()));
  await page.route(/^https:\/\/cal\.com\//, (r) => r.fulfill({ contentType: 'text/html', body: '<title>Cal.com</title>' }));
  await page.goto(`/${query}`);
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

// Step 1 with the decision model stubbed: its answers are fixed here, so the
// page's part is tested, not the model's (that is _model/trials/jev/).
const DECIDE = 'https://decide.test/decide';
const MODEL_REPORT = {
  source: 'model', ms: 250, repeated: 0.98,
  job: { choice: 'report', confidence: 1, probabilities: { report: 1 } },
  frequency: { score: 1, confidence: 1 }, people: { choice: 'few', confidence: 1 },
  systems: { spreadsheet: 0.99, email: 0.2, accounts: 0.3, crm: 0.1, bank: 0, paper: 0.1, portal: 0.2 },
};
async function withModel(page, answer) {
  await page.route(DECIDE, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(typeof answer === 'function' ? answer(r) : answer) }));
  return open(page, { query: `?decide=${encodeURIComponent(DECIDE)}` });
}

test('step 1 answers in components: the decisions, the job automated, the money, the first steps', async ({ page }) => {
  const calRequests = await withModel(page, MODEL_REPORT);
  await expect(page.locator('#f-scale')).toHaveCount(0);
  await page.fill('#f-job', 'Two of us rebuild the sales report every Monday from three spreadsheets');
  await page.click('[data-job-show]');
  await expect(page.locator('[data-decide-status]')).toHaveText('Decided in 0.25 s');
  await expect(page.locator('.pg-decision')).toHaveCount(5);
  await expect(page.locator('.pg-decision').nth(1)).toContainText('A report');
  await expect(page.locator('.pg-decision').nth(4)).toContainText('Spreadsheet');
  // The job turns to Automated by itself.
  await expect(page.locator('[data-compare] .b-compare')).toHaveAttribute('data-state', 'after');
  // Numbers guessed from the sentence: two or three people, weekly.
  await expect(page.locator('#n-people')).toHaveValue('2');
  await expect(page.locator('#n-hours')).toHaveValue('3');
  await expect(page.locator('[data-answer-share]')).toHaveText('Of the £70,000 a year you pay them, £5,600 goes on this job.');
  await expect(page.locator('[data-first]')).toBeVisible();
  await expect(page.locator('[data-answer-nearest] a')).toHaveAttribute('href', '#case-monday-report');
  await expect(page.locator('[data-decide-label]')).toHaveText(site.page.job.decide.label.model);
  expect(calRequests).toEqual([]);
  // Guessed numbers are not the visitor's: only their words go to the booking.
  await page.click('[data-answer-book]');
  await expect(page.locator('[data-book-status]')).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => window.__calInline.config)).toEqual({ layout: 'month_view', job: 'Two of us rebuild the sales report every Monday from three spreadsheets' });
});

test('changed numbers update the money in place and go to the booking', async ({ page }) => {
  await withModel(page, MODEL_REPORT);
  await page.fill('#f-job', 'Two of us rebuild the sales report every Monday');
  await page.click('[data-job-show]');
  await expect(page.locator('[data-end]')).toBeVisible();
  await page.click('[aria-label="One person more"]');
  await expect(page.locator('[data-answer-cost]')).toHaveText('£8,400');
  await page.click('[data-answer-book]');
  await expect(page.locator('[data-book-status]')).toBeHidden({ timeout: 5000 });
  expect(await page.evaluate(() => window.__calInline.config.scale)).toBe('3 people, 3 hours each a week, salary £35,000 each: about £8,400 a year on this job');
});

test('when the model is not sure of the kind of job, it asks back with buttons', async ({ page }) => {
  await withModel(page, { ...MODEL_REPORT, job: { choice: 'copying', confidence: 0.6, probabilities: { copying: 0.6, invoices: 0.35, report: 0.05 } } });
  await page.fill('#f-job', 'Staff photograph receipts and finance types them into QuickBooks');
  await page.click('[data-job-show]');
  const options = page.locator('[data-ask] .pg-chip');
  await expect(options).toHaveText(['Copying between systems', 'Invoices and payments', 'A report']);
  await expect(page.locator('[data-compare]')).toBeHidden();
  await options.nth(1).click();
  await expect(page.locator('.pg-decision').nth(1)).toContainText('Invoices and payments');
  await expect(page.locator('[data-compare] .b-compare')).toBeVisible();
});

test('not repeated work gets one honest component and examples to try', async ({ page }) => {
  let n = 0;
  await withModel(page, () => (n++ === 0 ? { ...MODEL_REPORT, repeated: 0.03 } : MODEL_REPORT));
  await page.fill('#f-job', 'How much do you charge?');
  await page.click('[data-job-show]');
  await expect(page.locator('[data-not]')).toBeVisible();
  await expect(page.locator('[data-compare]')).toBeHidden();
  await page.locator('[data-example]').first().click();
  await expect(page.locator('#f-job')).toHaveValue(site.page.job.decide.notRepeated.examples[0]);
  await expect(page.locator('[data-compare] .b-compare')).toBeVisible();
});

test('without the decision model, it matches words and says so', async ({ page }) => {
  await open(page);
  await page.fill('#f-job', 'We chase timesheets from contractors every Monday by email');
  await page.click('[data-job-show]');
  await expect(page.locator('[data-decide-status]')).toHaveText(site.page.job.decide.status.local);
  await expect(page.locator('.pg-decision').nth(1)).toContainText('Chasing people');
  await expect(page.locator('[data-decide-label]')).toHaveText(site.page.job.decide.label.local);
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

// Behaviour checks on the real site (no screenshots).

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../../content/site.json', import.meta.url), 'utf8'));

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

test('the one-page view shows every listed topic, and no stray text', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/all');
  await page.waitForSelector('.page-section');
  const ids = await page.locator('.page-section').evaluateAll((l) => l.map((s) => s.id.replace('page-', '')));
  for (const id of [...site.onePage.sections, ...(site.onePage.appendix || [])]) expect(ids, id).toContain(id);
  const stray = await page.evaluate(() => [...document.querySelector('.page').childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.slice(0, 60)));
  expect(stray).toEqual([]);
  const invisible = await page.evaluate(() => [...document.querySelectorAll('.page .b-text, .page .b-callout, .page .b-fact')]
    .filter((e) => [e, ...e.querySelectorAll('*')].some((x) => x.offsetParent !== null && getComputedStyle(x).opacity === '0'))
    .map((e) => e.textContent.slice(0, 40)));
  expect(invisible).toEqual([]);
  expect(errors).toEqual([]);
});

// Everything the site's pages are made of is shown in the component library:
// every class used in the one-page view and in topic answers also appears on
// /components. The side column and the landing are not covered.
test('the component library covers every class used on /all and in topics', async ({ page }) => {
  const classes = async (selector) => page.evaluate((sel) => {
    const out = new Set();
    for (const root of document.querySelectorAll(sel)) for (const el of [root, ...root.querySelectorAll('*')]) {
      const c = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
      c.split(/\s+/).filter(Boolean).forEach((x) => out.add(x));
    }
    return [...out];
  }, selector);
  const used = new Map();
  await page.goto('/#/all');
  await page.waitForSelector('.page-section');
  for (const c of await classes('.page')) used.set(c, '/#/all');
  for (const id of ['method', 'signals', 'process', 'callsheet_domains', 'callsheet_graduation', 'estimate']) {
    await page.goto('about:blank');
    await page.goto(`/#/${id}`);
    await page.waitForSelector('.turn .chips', { timeout: 15000 });
    for (const c of await classes('.turn')) if (!used.has(c)) used.set(c, `/#/${id}`);
  }
  await page.goto('/components/');
  await page.waitForSelector('#layout-page .page-section');
  const lib = new Set(await classes('.lib-main'));
  const missing = [...used].filter(([c]) => !lib.has(c)).map(([c, where]) => `${c} (${where})`);
  expect(missing).toEqual([]);
});

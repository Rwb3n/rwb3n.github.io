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

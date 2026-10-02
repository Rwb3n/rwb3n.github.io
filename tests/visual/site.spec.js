// Behaviour checks on the real site (no screenshots).

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../../content/site.json', import.meta.url), 'utf8'));

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com|fontshare\.com/, (r) => r.abort());
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
// every class used on the landing, in the one-page view, in topic answers and
// in the side column also appears on /components.
test('the component library covers every class used on the site', async ({ page }) => {
  const classes = async (selector) => page.evaluate((sel) => {
    const out = new Set();
    for (const root of document.querySelectorAll(sel)) for (const el of [root, ...root.querySelectorAll('*')]) {
      const c = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
      c.split(/\s+/).filter(Boolean).forEach((x) => out.add(x));
    }
    return [...out];
  }, selector);
  const used = new Map();
  await page.goto('/');
  await page.waitForTimeout(1500);
  for (const c of await classes('.landing')) used.set(c, '/');
  await page.goto('about:blank');
  await page.goto('/#/all');
  await page.waitForSelector('.page-section');
  for (const c of await classes('.page')) used.set(c, '/#/all');
  for (const id of ['method', 'signals', 'process', 'callsheet_domains', 'callsheet_graduation', 'estimate']) {
    await page.goto('about:blank');
    await page.goto(`/#/${id}`);
    await page.waitForSelector('.turn .chips', { timeout: 15000 });
    for (const c of await classes('.turn, .rail')) if (!used.has(c)) used.set(c, `/#/${id}`);
  }
  await page.goto('/components/');
  await page.waitForSelector('#layout-page .page-section');
  await page.waitForSelector('#layout-landing .xray');
  const lib = new Set(await classes('.lib-main'));
  const missing = [...used].filter(([c]) => !lib.has(c)).map(([c, where]) => `${c} (${where})`);
  expect(missing).toEqual([]);
});

// Diagram boxes are sized from the mono font's measured width; every label
// must fit inside its box, whatever font is in use.
test('every diagram label fits inside its box', async ({ page }) => {
  const check = async () => page.evaluate(() => {
    const bad = [];
    for (const g of document.querySelectorAll('.fl-node')) {
      const rect = g.querySelector('rect');
      if (!rect) continue;
      const rw = rect.getBBox().width;
      for (const t of g.querySelectorAll('text')) if (t.getBBox().width > rw - 8) bad.push(t.textContent);
    }
    return { count: document.querySelectorAll('.fl-node text').length, bad };
  });
  await page.goto('/#/all');
  await page.waitForSelector('.page-section .fl-node');
  const all = await check();
  await page.goto('/components/');
  await page.waitForSelector('#block-flow .fl-node');
  const lib = await check();
  expect(all.count + lib.count).toBeGreaterThan(40);
  expect([...all.bad, ...lib.bad]).toEqual([]);
});

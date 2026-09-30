// One screenshot per part of /components/: foundations, interface pieces,
// each block, the composer. Motion is Off and webfonts are blocked, so the
// result does not depend on timing or on the network.

import { test, expect } from '@playwright/test';
import { blocks, primitives } from '../../src/catalog.js';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const parts = [
  'colour', 'type', 'space', 'motion',
  ...primitives.map((p) => `prim-${slug(p.name)}`),
  ...Object.keys(blocks).map((t) => `block-${t}`),
  'compose',
];

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => localStorage.setItem('mu-reading', JSON.stringify({ motion: 'off' })));
  await page.goto('/components/');
  await page.waitForSelector('.lib-card');
  await page.evaluate(() => document.fonts.ready);
  // Sticky, translucent chrome would sit over whatever part is being captured.
  await page.addStyleTag({ content: '.bar, .lib-nav { position: static !important; } .lib-toast { display: none; }' });
});

test('the page has no errors and no sideways scroll', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.reload();
  await page.waitForSelector('.lib-card');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.lib-errors:not([hidden])').count()).toBe(0);
});

for (const id of parts) {
  test(id, async ({ page }) => {
    const el = page.locator(`#${id}`);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150); // flow diagrams draw after a resize observer fires
    await expect(el).toHaveScreenshot(`${id}.png`, { mask: [page.locator('.b-brief-head')] });
  });
}

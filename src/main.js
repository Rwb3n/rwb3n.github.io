// Boot: chrome first (theme, clock), then content, then the lens.

import { site } from './copy.js';
import { loadContent } from './content.js';
import { createApp } from './app.js';
import { createLens } from './lens.js';

const THEME_KEY = 'mu-theme';
const html = document.documentElement;

// Theme -----------------------------------------------------------------------
function setTheme(t) {
  html.dataset.theme = t;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = t === 'dark' ? '#0c0d0d' : '#f3f0e9';
  document.dispatchEvent(new CustomEvent('mu:theme', { detail: t }));
}
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  setTheme(next);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  if (!stored) setTheme(e.matches ? 'dark' : 'light');
});

// London clock ----------------------------------------------------------------
const clock = document.querySelector('[data-clock]');
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: site.timeZone, timeZoneName: 'short' });
function tick() {
  if (!clock) return;
  const parts = fmt.formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  clock.textContent = `${get('hour')}:${get('minute')} ${get('timeZoneName')}`;
  clock.dateTime = new Date().toISOString();
}
tick();
setInterval(tick, 15_000);

const year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

// Scrolled state for the bar hairline -----------------------------------------
const onScroll = () => html.classList.toggle('is-scrolled', window.scrollY > 4);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Lens (landing hero) -----------------------------------------------------------
const lensCanvas = document.querySelector('[data-lens]');
if (lensCanvas) {
  try {
    const lens = createLens(lensCanvas, document.querySelector('[data-lens-caption]'));
    document.addEventListener('mu:session', () => lens.pause());
    document.addEventListener('mu:landing', () => lens.resume());
    document.addEventListener('mu:theme', () => lens.refresh());
  } catch (err) {
    console.warn('[lens]', err);
  }
}

// App ---------------------------------------------------------------------------
loadContent()
  .then((content) => { window.mindunder = createApp(content); })
  .catch((err) => {
    console.error('[content]', err);
    const input = document.querySelector('[data-ask-input]');
    if (input) { input.disabled = true; input.placeholder = `Couldn’t load — email ${site.email}`; }
  });

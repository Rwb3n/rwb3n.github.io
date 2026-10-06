// Boot: config → reading preferences → chrome (theme, clock) → landing (type,
// lens) → topics.

import { site, config, applyConfig } from './copy.js';
import { loadContent, loadSiteConfig } from './content.js';
import { initPrefs } from './prefs.js';
import { createSettings } from './settings.js';
import { createApp } from './app.js';
import { createLens } from './lens.js';
import { splitWords, createXray } from './type.js';
import { reducedMotion } from './dom.js';
import { createSound, sfx } from './sound.js';

try {
  applyConfig(await loadSiteConfig());
} catch (err) {
  console.warn('[config] using defaults:', err.message);
}
initPrefs(config.reading);

const THEME_KEY = 'mu-theme';
const html = document.documentElement;

// Theme -----------------------------------------------------------------------
// Switching theme spreads the new one out from the toggle as a circle.
function setTheme(t) {
  html.dataset.theme = t;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = t === 'dark' ? '#000000' : '#ffffff';
  document.dispatchEvent(new CustomEvent('mu:theme', { detail: t }));
}
const toggle = document.querySelector('[data-theme-toggle]');
toggle?.addEventListener('click', () => {
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  if (!document.startViewTransition || reducedMotion()) return setTheme(next);
  const b = toggle.getBoundingClientRect();
  const x = b.left + b.width / 2, y = b.top + b.height / 2;
  const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  html.classList.add('is-theming');
  sfx('theme');
  const vt = document.startViewTransition(() => setTheme(next));
  vt.ready.then(() => {
    html.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
      { duration: 760, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
  vt.finished.finally(() => html.classList.remove('is-theming'));
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  if (!stored) setTheme(e.matches ? 'dark' : 'light');
});

// Reading settings and sound -------------------------------------------------
const hasAudio = config.features.sound !== false && !!(window.AudioContext || window.webkitAudioContext);
if (hasAudio) createSound();
createSettings({
  toggle: document.querySelector('[data-settings-toggle]'),
  panel: document.querySelector('[data-settings]'),
  soundAvailable: hasAudio,
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

// Landing type ------------------------------------------------------------------
const display = document.querySelector('.landing .display');
if (display && !reducedMotion()) splitWords(display);
// Text size changes the layout the lens measured.
document.addEventListener('mu:prefs', (e) => { if (e.detail.key === 'text') dispatchEvent(new Event('resize')); });

// Lens + x-ray -------------------------------------------------------------------
let lens = null;
const lensCanvas = document.querySelector('[data-lens]');
const copyEl = document.querySelector('[data-copy]');
if (lensCanvas) {
  try {
    const xray = copyEl ? createXray(copyEl, lensCanvas) : null;
    lens = createLens(lensCanvas, document.querySelector('[data-lens-caption]'), { onFrame: (s) => xray?.update(s) });
    window.mindunderLens = lens; // read-only state for debugging
    document.addEventListener('mu:session', () => lens.pause());
    document.addEventListener('mu:landing', () => lens.resume());
    document.addEventListener('mu:theme', () => lens.refresh());
    // Over the things you click, the lens steps aside.
    for (const el of document.querySelectorAll('.landing .entry, .ask')) {
      el.addEventListener('pointerenter', () => lens.setYield(true));
      el.addEventListener('pointerleave', () => lens.setYield(false));
    }
  } catch (err) {
    console.warn('[lens]', err);
  }
}

// Entry rows: the spotlight follows the pointer.
document.querySelector('[data-entry]')?.addEventListener('pointermove', (e) => {
  const row = e.target.closest('.entry-item');
  if (!row) return;
  const b = row.getBoundingClientRect();
  row.style.setProperty('--mx', `${e.clientX - b.left}px`);
});

// App ---------------------------------------------------------------------------
loadContent()
  .then((content) => {
    // The fix plays in full the first time in a session; after that, a quick reprise.
    const seenFix = () => { try { return sessionStorage.getItem('mu-fixed') === '1'; } catch { return false; } };
    const beforeLeave = () => {
      const p = lens?.fix(seenFix() ? 420 : undefined);
      try { sessionStorage.setItem('mu-fixed', '1'); } catch { /* ignore */ }
      return p;
    };
    window.mindunder = createApp(content, document, { beforeLeave });
  })
  .catch((err) => {
    console.error('[content]', err);
    const input = document.querySelector('[data-ask-input]');
    if (input) { input.disabled = true; input.placeholder = `Couldn’t load — email ${site.email}`; }
  });

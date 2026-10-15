// The page: reading settings, theme, the headline's rising words, the
// conversation, booking.
// Everything a visitor reads is already in index.html; this only adds.

import { initPrefs } from './prefs.js';
import { createSettings } from './settings.js';
import { createBooking } from './book.js';
import { createTalk } from './talk.js';
import { splitWords } from './type.js';
import { reducedMotion } from './dom.js';

initPrefs(window.__muReading || {});

const THEME_KEY = 'mu-theme';
const html = document.documentElement;

// Theme: the new one spreads out from the toggle as a circle.
function setTheme(t) {
  html.dataset.theme = t;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = t === 'dark' ? '#000000' : '#ffffff';
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

createSettings({
  toggle: document.querySelector('[data-settings-toggle]'),
  panel: document.querySelector('[data-settings]'),
  soundAvailable: false,
});

const year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

const onScroll = () => html.classList.toggle('is-scrolled', window.scrollY > 4);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// The headline's words rise out of their masks (full motion only).
const display = document.querySelector('.pg .display');
if (display && !reducedMotion()) splitWords(display);

window.mindunderTalk = createTalk(document);
window.mindunderBooking = createBooking(document);

// Reading settings panel: motion, text size, sound. Native radio buttons, so
// keyboard and screen readers work without extra code. Escape or a click
// outside closes it and returns focus to the button that opened it.

import { prefs, setPref } from './prefs.js';

export function createSettings({ toggle, panel, soundAvailable = true }) {
  if (!toggle || !panel) return;
  toggle.hidden = false;
  if (!soundAvailable) panel.querySelector('[data-sound-field]')?.remove();

  const sync = () => {
    const p = prefs();
    for (const input of panel.querySelectorAll('input[type=radio]')) {
      const current = input.name === 'sound' ? String(p.sound) : p[input.name];
      input.checked = input.value === current;
    }
  };

  const open = () => {
    sync();
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    panel.querySelector('input:checked, input')?.focus();
  };
  const close = (refocus = true) => {
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (refocus) toggle.focus();
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });
  panel.addEventListener('change', (e) => {
    const { name, value } = e.target;
    setPref(name, name === 'sound' ? value === 'true' : value);
  });
  panel.querySelector('[data-settings-close]')?.addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== toggle) close(false);
  });

  // The landing's "Stop the animation" button (shown only in full motion).

  document.addEventListener('mu:prefs', sync);
  sync();
}

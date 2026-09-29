// Reading preferences, chosen by the visitor and remembered.
//
//   motion  'full'  every animation
//           'calm'  nothing moves by itself; things respond only to you (default)
//           'off'   no animation at all
//   text    'standard' | 'large'
//   sound   true | false
//
// Defaults come from content/site.json ("reading"). If the operating system asks
// for reduced motion, motion starts at 'off' unless the visitor picked otherwise.

const KEY = 'mu-reading';
const state = { motion: 'calm', text: 'standard', sound: false };
const html = document.documentElement;

export function initPrefs(defaults = {}) {
  Object.assign(state, pick(defaults));
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* private mode */ }
  if (!stored.motion && matchMedia('(prefers-reduced-motion: reduce)').matches) state.motion = 'off';
  Object.assign(state, pick(stored));
  apply();
}

export const prefs = () => ({ ...state });
export const motion = () => state.motion;

export function setPref(key, value) {
  if (!(key in state) || state[key] === value) return;
  state[key] = value;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    stored[key] = value;
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch { /* private mode */ }
  apply();
  document.dispatchEvent(new CustomEvent('mu:prefs', { detail: { key, value } }));
}

function apply() {
  html.dataset.motion = state.motion;
  html.dataset.text = state.text;
}

function pick(o) {
  const out = {};
  if (['full', 'calm', 'off'].includes(o.motion)) out.motion = o.motion;
  if (['standard', 'large'].includes(o.text)) out.text = o.text;
  if (typeof o.sound === 'boolean') out.sound = o.sound;
  return out;
}

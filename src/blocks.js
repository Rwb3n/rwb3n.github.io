// Block renderers. Each returns an element; the app reveals them in sequence.
// A block may expose `el.onReveal()` for its own entrance (count-ups, draw-ins).

import { h, reducedMotion } from './dom.js';
import { renderFlow } from './flow.js';
import { copy, site, config, factText } from './copy.js';
import { mailtoHref, briefAsText, briefRows } from './engine.js';
import { compare, estimate } from './showpieces.js';

export function renderBlock(block, ctx) {
  const fn = renderers[block.type];
  if (!fn) {
    console.warn(`[blocks] unknown block type "${block.type}"`);
    return null;
  }
  return fn(block, ctx);
}

const renderers = {
  text: ({ content }) => words(h('p', { class: 'b-text' }), content),

  hero: ({ title, accentWord, subtitle }) =>
    h('div', { class: 'b-hero' },
      h('h2', { class: 'b-hero-title' }, accent(title, accentWord)),
      subtitle && h('p', { class: 'b-hero-sub' }, subtitle),
    ),

  callout: ({ text, attribution }) =>
    h('blockquote', { class: 'b-callout' }, text, attribution && h('cite', null, attribution)),

  split: ({ left = [], right = [] }, ctx) =>
    h('div', { class: 'b-split' },
      h('div', null, left.map((b) => renderBlock(b, ctx))),
      h('div', null, right.map((b) => renderBlock(b, ctx))),
    ),

  // Heading level comes from where the section sits: the caller sets
  // ctx.headingLevel (default 3, under a conversation turn's h2).
  section: ({ title, kicker, tone = 'plain', blocks: children = [] }, ctx) => {
    const level = Math.min(6, ctx?.headingLevel || 3);
    const inner = { ...ctx, headingLevel: level + 1 };
    return h('section', { class: `b-section is-${tone}` },
      h('header', { class: 'b-section-head' },
        kicker && h('p', { class: 'micro' }, kicker),
        h(`h${level}`, { class: 'b-section-title' }, title),
      ),
      children.map((b) => renderBlock(b, inner)),
    );
  },

  metricRow: ({ items }) => {
    const el = h('div', { class: 'b-metric-row' },
      items.map((m) => h('div', null,
        h('span', { class: 'b-metric-value', 'data-count': m.value }, m.value),
        h('span', { class: 'b-metric-label' }, m.label),
      )),
    );
    el.onReveal = () => el.querySelectorAll('[data-count]').forEach(odometer);
    return el;
  },

  metric: ({ value, label, sublabel }) => {
    const el = h('div', { class: 'b-metric' },
      h('span', { class: 'b-metric-big', 'data-count': value }, value),
      h('span', { class: 'b-metric-label' }, label),
      sublabel && h('span', { class: 'b-metric-sub' }, sublabel),
    );
    el.onReveal = () => el.querySelectorAll('[data-count]').forEach(odometer);
    return el;
  },

  stats: ({ items }) =>
    h('dl', { class: 'b-stats' },
      items.map((i) => h('div', null, h('dt', { class: 'micro' }, i.label), h('dd', null, linkify(i.value)))),
    ),

  pills: ({ label, items }) =>
    h('div', { class: 'b-pills' },
      label && h('span', { class: 'micro' }, label),
      h('ul', { class: 'b-pills-list', role: 'list' }, items.map((i, n) => h('li', { class: 'b-pill', style: { '--i': n } }, i))),
    ),

  badge: ({ status, variant = 'default' }) =>
    h('p', { class: `b-badge is-${variant}` }, variant === 'active' && h('span', { class: 'pulse', 'aria-hidden': 'true' }), status),

  grid: ({ items }, ctx) =>
    h('div', { class: `b-grid cols-${items.length % 3 === 0 ? 3 : 2}` },
      items.map((item) => {
        const quote = /^[“"]/.test(item.description || '');
        const Tag = item.target ? 'button' : 'div';
        return h(Tag, {
          class: 'b-card',
          type: item.target ? 'button' : null,
          style: { '--i': items.indexOf(item) },
          onclick: item.target ? () => ctx.navigate(item.target) : null,
          onpointermove: tilt,
          onpointerleave: untilt,
        },
          h('span', { class: 'b-card-head' },
            h('span', { class: 'b-card-title' }, item.title),
            item.status && h('span', { class: 'b-card-status' }, h('span', { class: 'pulse', 'aria-hidden': 'true' }), item.status),
          ),
          h('span', { class: `b-card-desc${quote ? ' is-quote' : ''}` }, item.description),
          item.target && h('span', { class: 'b-card-go', 'aria-hidden': 'true' }, '→'),
        );
      }),
    ),

  layers: ({ items }) => {
    const steps = items.every((i) => /^\d+$/.test(i.label));
    return h(steps ? 'ol' : 'ul', { class: `b-layers${steps ? ' is-steps' : ''}`, role: 'list' },
      items.map((i, n) => h('li', { class: 'b-layer', style: { '--i': n } },
        h('span', { class: 'b-layer-label' }, i.label),
        h('span', { class: 'b-layer-title' }, i.title),
        i.detail && h('span', { class: 'b-layer-detail' }, i.detail),
      )),
    );
  },

  table: ({ headers, rows }) =>
    h('div', { class: 'b-table-wrap' },
      h('table', { class: 'b-table' },
        h('thead', null, h('tr', null, headers.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', null, rows.map((r) => h('tr', null, r.map((c) => h('td', null, c))))),
      ),
    ),

  code: ({ language, content }) =>
    h('figure', { class: 'b-code' },
      language && h('figcaption', { class: 'b-code-lang micro' }, language),
      h('pre', null, h('code', null, content)),
    ),

  progress: ({ label, current, total, sublabel }) =>
    h('div', { class: 'b-progress', role: 'group', 'aria-label': `${label}: ${current} of ${total}` },
      h('div', { class: 'b-progress-head' },
        h('span', { class: 'micro' }, label),
        h('span', { class: 'b-progress-count' }, `${current}/${total}`),
      ),
      h('div', { class: 'b-progress-track', 'aria-hidden': 'true' },
        Array.from({ length: total }, (_, i) => h('i', { class: i < current ? 'is-on' : i === current ? 'is-next' : null, style: { '--i': i } })),
      ),
      sublabel && h('p', { class: 'b-progress-sub' }, sublabel),
    ),

  flow: (block) => {
    const el = renderFlow(block);
    el.onReveal = () => el.drawIn();
    return el;
  },

  brief: ({ data }, ctx) => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: site.timeZone });
    return h('article', { class: 'b-brief', 'aria-label': copy.brief.blockTitle },
      h('header', { class: 'b-brief-head' },
        h('span', { class: 'micro' }, copy.brief.blockTitle),
        h('span', { class: 'micro' }, today),
      ),
      h('div', { class: 'b-brief-body' },
        h('dl', null,
          briefRows(data).map(([k, v], n) => h('div', { style: { '--i': n } }, h('dt', { class: 'micro' }, k), h('dd', null, v))),
        ),
        ctx?.route && h('figure', { class: 'b-brief-map' }, ctx.route(), h('figcaption', { class: 'micro' }, 'Topics you read, in order')),
      ),
      h('p', { class: 'b-brief-note' }, copy.booking.privacy),
    );
  },

  // Replaces the old simulated calendar. Hands the brief to the visitor's mail client.
  compose: ({ data }) => {
    const b = copy.booking;
    const copyBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, b.copyButton);
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`${briefAsText(data)}\n\n${site.email}`);
        copyBtn.textContent = b.copied;
        setTimeout(() => (copyBtn.textContent = b.copyButton), 1800);
      } catch { /* clipboard blocked: the mail button still works */ }
    });
    return h('div', { class: 'b-compose' },
      h('div', { class: 'b-compose-actions' },
        h('a', { class: 'btn btn-primary', href: mailtoHref(site.email, data) }, b.emailButton, h('span', { 'aria-hidden': 'true' }, '→')),
        copyBtn,
      ),
      h('p', { class: 'b-compose-note' }, 'Goes to ', h('a', { class: 'rail-mail', href: `mailto:${site.email}` }, site.email), '.'),
    );
  },

  // A fact from content/site.json. Renders nothing if the fact is not set and
  // has no "missing" sentence, so the site never shows an empty promise.
  fact: ({ key, label = true }) => {
    const f = config.facts[key];
    const text = factText(key);
    if (!f || !text) return null;
    const value = f.link && f.value ? h('a', { class: 'b-fact-link', href: f.value }, f.value) : text;
    return h('p', { class: `b-fact${f.value == null ? ' is-missing' : ''}` }, label && h('strong', null, `${f.label}: `), value);
  },

  // Several facts as a list.
  facts: ({ keys = [] }) => {
    const rows = keys.map((k) => [config.facts[k], factText(k)]).filter(([f, v]) => f && v);
    if (!rows.length) return null;
    return h('dl', { class: 'b-facts' }, rows.map(([f, v]) => h('div', null, h('dt', { class: 'micro' }, f.label), h('dd', null, v))));
  },

  compare,
  estimate,

  timeline: ({ items = [] }) =>
    h('ol', { class: 'b-layers', role: 'list' },
      items.map((i) => h('li', { class: 'b-layer' },
        h('span', { class: 'b-layer-label' }, i.date),
        h('span', { class: 'b-layer-title' }, i.event || i.title),
        i.detail && h('span', { class: 'b-layer-detail' }, i.detail),
      )),
    ),
};

// Helpers -------------------------------------------------------------------

function accent(title, word) {
  if (!word || !title.includes(word)) return title;
  const i = title.indexOf(word);
  return [title.slice(0, i), h('em', null, word), title.slice(i + word.length)];
}

// Split text into word spans so it can rise in, word by word.
function words(el, text) {
  if (reducedMotion()) {
    el.textContent = text;
    return el;
  }
  el.append(h('span', { class: 'visually-hidden' }, text));
  const visual = h('span', { 'aria-hidden': 'true' });
  let i = 0;
  for (const p of text.split(/(\s+)/)) {
    if (!p) continue;
    if (/^\s+$/.test(p)) { visual.append(' '); continue; }
    visual.append(h('span', { class: 'w', style: { '--i': Math.min(i++, 60) } }, p));
  }
  el.append(visual);
  return el;
}

function linkify(value) {
  const m = /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(value);
  return m ? h('a', { class: 'rail-mail', href: `mailto:${value}` }, value) : value;
}

// Odometer: each digit is a strip of 0–9 that rolls to its value, the
// columns settling left to right. Prefix/suffix ("~£", "/week") stay put.
function odometer(el) {
  const raw = el.dataset.count;
  const m = raw.match(/^(\D*?)(\d[\d,.]*)(.*)$/);
  if (!m || reducedMotion() || el.dataset.rolled) return;
  el.dataset.rolled = '1';
  const [, pre, num, post] = m;

  const digits = [...num];
  const cols = digits.map((ch, i) => {
    if (!/\d/.test(ch)) return h('span', { class: 'odo-lit' }, ch);
    const d = +ch;
    const strip = h('span', { class: 'odo-strip' }, Array.from({ length: 20 }, (_, k) => h('span', null, String(k % 10))));
    const col = h('span', { class: 'odo-col' }, h('span', { class: 'odo-size' }, ch), strip);
    const spins = 10 + d; // one full turn, then the digit
    strip.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-spins}em)` }], {
      duration: 1100 + i * 180,
      delay: 60,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    });
    return col;
  });
  // The rolling digits are hidden from screen readers; they read the plain value.
  el.replaceChildren(h('span', { class: 'visually-hidden' }, raw), h('span', { 'aria-hidden': 'true', class: 'odo' }, pre, cols, post));
}

// Cards lean toward the pointer, with a light that follows it.
function tilt(e) {
  if (e.pointerType !== 'mouse' || reducedMotion()) return;
  const c = e.currentTarget, b = c.getBoundingClientRect();
  const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
  c.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
  c.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
  c.style.setProperty('--gx', `${x * 100}%`);
  c.style.setProperty('--gy', `${y * 100}%`);
}
function untilt(e) {
  const c = e.currentTarget;
  c.style.setProperty('--rx', '0deg');
  c.style.setProperty('--ry', '0deg');
}

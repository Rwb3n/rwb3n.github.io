// The page's parts, and the sections they are composed into.
//
// The page is a list of sections in content/site.json (page.sections). Each
// section is a turn of the conversation: the visitor opens it by choosing a
// reply, or by typing something that matches its intents. A section is a
// list of parts. Every part type below says what it takes (the same prop
// types as the block catalogue), has an example, and renders to plain HTML
// strings, so the whole page reads without JavaScript.
//
// To change the page: reorder, remove, add or repeat sections and parts in
// site.json. `npm run sync` refuses a page that does not validate.

import { prop, checkProps } from './catalog.js';

const { str, list, obj, oneOf, req, bool } = prop;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stop = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

export const factText = (site, key) => {
  const f = site.facts?.[key];
  return f ? f.value ?? f.missing ?? null : null;
};

// The Cal.com booking page for a link like "ruben/30min", or null.
export function bookingUrl(site, answers = {}) {
  const link = site.booking?.calLink;
  if (!link) return null;
  const url = new URL(`${String(site.booking.origin || 'https://cal.com').replace(/\/$/, '')}/${link}`);
  for (const [k, v] of Object.entries(answers)) if (v) url.searchParams.set(k, v);
  return url.href;
}

// Text with {email} becomes a mailto link.
export function withEmail(text, email) {
  return esc(text).replace(/\{email\}/g, `<a href="mailto:${esc(email)}">${esc(email)}</a>`);
}

// Every part may carry `when`: "booking" shows it only once a Cal.com link is
// set, "unset" only while it is not.
const common = {
  type: str('The part type.', true),
  when: oneOf(['booking', 'unset'], '`booking`: only when a Cal.com link is set. `unset`: only while it is not.'),
};

const TEXT_STYLES = ['intro', 'lead', 'body', 'voice', 'cue', 'small'];

export const parts = {
  headline: {
    doc: 'The page\'s one main heading (h1), with a small line above it. One word can be set in the accent style. Only in a `hero` section.',
    props: {
      eyebrow: str('The small line above the heading.'),
      lines: req(list(str('One line of the heading.'), 'The heading, line by line.')),
      accent: str('One word of the heading to set in the accent style.'),
    },
    example: { type: 'headline', eyebrow: 'Example eyebrow', lines: ['A heading in two lines.', 'The second one.'], accent: 'heading' },
    render(p, ctx) {
      let accented = false;
      const lines = p.lines.map((line) => {
        const e = esc(line);
        const a = p.accent && esc(p.accent);
        if (!accented && a && e.includes(a)) { accented = true; return e.replace(a, `<em class="is-accent">${a}</em>`); }
        return e;
      });
      return [
        '<div class="copy" data-copy>',
        p.eyebrow && `  <p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>${esc(p.eyebrow)}</p>`,
        `  <h1 class="display pg-h1" id="${ctx.id}-h" tabindex="-1">`,
        ...lines.map((l) => `    <span class="display-line">${l}</span>`),
        '  </h1>',
        '</div>',
      ];
    },
  },

  text: {
    doc: 'A paragraph. `intro` is the large grey opening line; `lead` the large italic voice; `body` plain; `voice` a short italic aside; `cue` a quiet pointer; `small` fine print. `{email}` becomes a link.',
    props: {
      text: req(str('The paragraph.')),
      style: oneOf(TEXT_STYLES, 'How it reads. Default `body`.'),
    },
    example: { type: 'text', style: 'intro', text: 'An opening line, in the large grey style. Email {email} to ask.' },
    render(p, ctx) {
      return [`<p class="pg-${p.style || 'body'}">${withEmail(p.text, ctx.email)}</p>`];
    },
  },

  cases: {
    doc: 'Worked examples side by side: a tag, a title, then today, what would be built, and what changes.',
    props: {
      labels: req(obj({ before: req(str('Label for today.')), build: req(str('Label for the build.')), result: req(str('Label for the result.')) }, 'The three row labels.')),
      items: req(list(obj({
        tag: str('Small line above the title, such as the sector.'),
        title: req(str('The example\'s name.')),
        before: req(str('How the work is done today.')),
        build: req(str('What would be built.')),
        result: req(str('What changes, in numbers if possible.')),
      }), 'The examples.')),
    },
    example: {
      type: 'cases',
      labels: { before: 'Today', build: 'What I would build', result: 'What changes' },
      items: [{ tag: 'Example', title: 'An example', before: 'Someone copies the figures by hand.', build: 'The figures copy themselves overnight.', result: 'About an hour a day back.' }],
    },
    render(p) {
      const l = p.labels;
      return [
        '<div class="pg-cases">',
        ...p.items.flatMap((c) => [
          '  <article class="pg-case">',
          c.tag && `    <p class="pg-case-tag">${esc(c.tag)}</p>`,
          `    <h3 class="pg-case-title">${esc(c.title)}</h3>`,
          '    <dl class="pg-case-body">',
          `      <div><dt>${esc(l.before)}</dt><dd>${esc(c.before)}</dd></div>`,
          `      <div><dt>${esc(l.build)}</dt><dd>${esc(c.build)}</dd></div>`,
          `      <div class="is-result"><dt>${esc(l.result)}</dt><dd>${esc(c.result)}</dd></div>`,
          '    </dl>',
          '  </article>',
        ]),
        '</div>',
      ];
    },
  },

  list: {
    doc: 'A short list, each item a bold first sentence and the rest. An optional small heading above.',
    props: {
      head: str('Small heading above the list.'),
      items: req(list(obj({ title: req(str('The bold first sentence.')), text: str('The rest.') }), 'The items.')),
    },
    example: { type: 'list', head: 'A small heading', items: [{ title: 'One thing.', text: 'Why it matters.' }, { title: 'Another thing.', text: 'Why it matters.' }] },
    render(p) {
      return [
        p.head && `<h3 class="pg-sub">${esc(p.head)}</h3>`,
        '<ul class="pg-more" role="list">',
        ...p.items.map((m) => `  <li><b>${esc(m.title)}</b>${m.text ? ` ${esc(m.text)}` : ''}</li>`),
        '</ul>',
      ];
    },
  },

  steps: {
    doc: 'Numbered steps in a row: a bold title and a line of detail each.',
    props: { items: req(list(obj({ title: req(str('The step.')), detail: str('What it means.') }), 'The steps, in order.')) },
    example: { type: 'steps', items: [{ title: 'First step.', detail: 'What happens first.' }, { title: 'Second step.', detail: 'What happens next.' }] },
    render(p) {
      return [
        '<ol class="pg-steps" role="list">',
        ...p.items.map((it, i) => `  <li><span class="pg-step-n" aria-hidden="true">${i + 1}</span><h3 class="pg-step-title">${esc(it.title)}</h3>${it.detail ? ` <p class="pg-step-detail">${esc(it.detail)}</p>` : ''}</li>`),
        '</ol>',
      ];
    },
  },

  facts: {
    doc: 'Short facts as "label: value". An item is either `{ key }`, a fact from site.json › facts (hidden while it has no value and no missing sentence), or `{ label, value }`.',
    props: {
      items: req(list(obj({
        key: str('A key of site.json › facts.'),
        label: str('With `value`: the label.'),
        value: str('With `label`: the value.'),
      }), 'The facts.')),
    },
    example: { type: 'facts', items: [{ label: 'First call', value: 'Free, 30 minutes.' }, { key: 'location' }] },
    check: (p, path, site) => p.items.flatMap((f, i) => (f.key
      ? (site?.facts && !site.facts[f.key] ? [`${path}.items[${i}].key: no fact "${f.key}" in site.json › facts`] : [])
      : (f.label && f.value ? [] : [`${path}.items[${i}]: needs a key, or a label and a value`]))),
    render(p, ctx) {
      const rows = p.items.map((f) => {
        const label = f.key ? ctx.site.facts?.[f.key]?.label : f.label;
        const value = f.key ? factText(ctx.site, f.key) : f.value;
        return label && value ? `  <li><b>${esc(label)}:</b> ${esc(stop(value))}</li>` : null;
      }).filter(Boolean);
      return rows.length ? ['<ul class="pg-facts" role="list">', ...rows, '</ul>'] : [];
    },
  },

  intake: {
    doc: 'Questions for the call. A plain GET form to the Cal.com booking page, so without JavaScript the answers prefill it there. With JavaScript it opens the calendar in the booking section. Each field name is a Cal.com booking question identifier (site.json › booking.fields). Needs a Cal.com link.',
    needsBooking: true,
    props: {
      fields: req(list(obj({
        name: req(str('The Cal.com question identifier.')),
        label: req(str('The label, above the field. A statement, not a question.')),
        example: str('One example line, under the label. No placeholder.'),
        long: bool('A multi-line field.'),
      }), 'The fields, in order.')),
      submit: req(str('The button. Says what it opens.')),
      note: str('Fine print under the button.'),
    },
    example: { type: 'intake', fields: [{ name: 'job', label: 'The job that takes up your team\'s time', example: 'For example: the Monday report.', long: true }], submit: 'Choose a time for the call', note: 'Nothing is sent until you book.' },
    check: (p, path, site) => p.fields.flatMap((f, i) => (site?.booking?.fields && !site.booking.fields.includes(f.name) ? [`${path}.fields[${i}].name: "${f.name}" is not in site.json › booking.fields`] : [])),
    render(p, ctx) {
      const field = (f) => {
        const id = `f-${f.name}`;
        const desc = f.example ? ` aria-describedby="${id}-ex"` : '';
        const control = f.long
          ? `<textarea class="pg-input" id="${id}" name="${esc(f.name)}" rows="4"${desc}></textarea>`
          : `<input class="pg-input" id="${id}" name="${esc(f.name)}" type="text" autocomplete="off"${desc} />`;
        return [
          '  <div class="pg-field">',
          `    <label class="pg-label" for="${id}">${esc(f.label)}</label>`,
          f.example && `    <p class="pg-example" id="${id}-ex">${esc(f.example)}</p>`,
          `    ${control}`,
          '  </div>',
        ];
      };
      return [
        `<form class="pg-intake" method="get" action="${esc(ctx.bookUrl)}" data-intake>`,
        ...p.fields.flatMap(field),
        `  <button class="btn btn-ghost pg-intake-go" type="submit">${esc(p.submit)}</button>`,
        p.note && `  <p class="pg-small">${esc(p.note)}</p>`,
        '</form>',
      ];
    },
  },

  booking: {
    doc: 'The calendar. One filled button loads Cal.com\'s embed in place; a status line while it loads; after the timeout, a link to the Cal.com page instead. Without JavaScript the button is a link to that page. Needs a Cal.com link; only in a `booking` section.',
    needsBooking: true,
    props: {
      show: req(str('The filled button. The page\'s only one.')),
      loading: req(str('Shown while the calendar loads.')),
      failed: req(str('Shown if it does not load in time.')),
      open: req(str('The link to the Cal.com page, after a failure.')),
    },
    example: { type: 'booking', show: 'Show available times', loading: 'Loading available times from Cal.com.', failed: 'The booking calendar did not load. You can book on the Cal.com page instead.', open: 'Open the booking page on Cal.com' },
    render(p, ctx) {
      return [
        '<div class="pg-booking" data-booking>',
        `  <a class="btn btn-primary pg-show" href="${esc(ctx.bookUrl)}" data-book-show>${esc(p.show)} <span aria-hidden="true">→</span></a>`,
        `  <p class="pg-status" data-book-status role="status" hidden>${esc(p.loading)}</p>`,
        '  <div class="pg-embed" id="cal-embed" data-book-embed hidden></div>',
        `  <p class="pg-fail" data-book-fail hidden>${esc(p.failed)} <a href="${esc(ctx.bookUrl)}" data-book-open>${esc(p.open)}</a></p>`,
        '</div>',
      ];
    },
  },
};

export const partTypes = Object.keys(parts);

// A section: one turn of the conversation, and one stretch of the page.
export const VARIANTS = {
  hero: 'The opening: fills the first screen; its heading is the headline part.',
  plain: 'A section with a small heading.',
  booking: 'The end of the funnel: a large heading. Every "Book the free call" link goes here. Exactly one.',
};

export const sectionProps = {
  id: req(str('Lowercase letters only. The page anchor (#id) and how replies refer to it.')),
  variant: oneOf(Object.keys(VARIANTS), 'How the section looks. Default `plain`.'),
  head: str('The heading (h2). Not used in a `hero` section.'),
  reply: str('What the visitor says to open it: the label of every reply that leads here.'),
  intents: list(str('A word or phrase.'), 'Typed words that open this section.'),
  replies: list(str('A section id.'), 'The replies offered at the end of this section, in order.'),
  when: oneOf(['booking', 'unset'], 'As for parts.'),
  parts: req(list({ type: 'any' }, 'The parts, in order.')),
};

// Which parts and sections are shown, given whether a Cal.com link is set.
const shown = (x, booked) => !x.when || (x.when === 'booking') === booked;

export function visibleSections(site) {
  const booked = !!bookingUrl(site);
  return (site.page?.sections || []).filter((s) => shown(s, booked)).map((s) => ({
    ...s,
    parts: s.parts.filter((p) => shown(p, booked) && !(parts[p.type]?.needsBooking && !booked)),
  }));
}

export const bookSection = (sections) => sections.find((s) => s.variant === 'booking');

// The replies at the end of a section: links to other sections, so they work
// without JavaScript too. The booking reply is the quiet "Book the free call".
// The last option, "Something else", opens free text; it needs JavaScript, so
// it starts hidden.
export const otherItem = (label) => `  <li class="pg-other-li" data-other hidden><button class="pg-reply pg-other" type="button" aria-expanded="false">${esc(label)}</button></li>`;

export function replyList(ids, sections, page, other) {
  const book = bookSection(sections);
  const items = ids.map((id) => sections.find((s) => s.id === id)).filter(Boolean).map((s) => (s === book
    ? `  <li><a class="pg-book-link" href="#${s.id}" data-to="${s.id}">${esc(page.bookLink)} <span aria-hidden="true">↓</span></a></li>`
    : `  <li><a class="pg-reply" href="#${s.id}" data-to="${s.id}">${esc(s.reply)} <span aria-hidden="true">↓</span></a></li>`));
  if (other) items.push(otherItem(other));
  return items.length ? ['<ul class="pg-replies" role="list">', ...items, '</ul>'] : [];
}

export function renderPart(part, ctx) {
  const spec = parts[part.type];
  if (!spec) throw new Error(`Unknown part type "${part.type}"`);
  return spec.render(part, ctx).filter(Boolean);
}

export function renderSection(s, ctx) {
  const variant = s.variant || 'plain';
  const c = { ...ctx, id: s.id };
  return [
    `<section class="pg-section is-${variant}" id="${s.id}" aria-labelledby="${s.id}-h"${s.reply ? ` data-reply="${esc(s.reply)}"` : ''}>`,
    variant !== 'hero' && s.head && `  <h2 class="pg-head" id="${s.id}-h" tabindex="-1">${esc(s.head)}</h2>`,
    ...s.parts.flatMap((p) => renderPart(p, c)).map((l) => `  ${l}`),
    ...replyList(s.replies || [], ctx.sections, ctx.page, ctx.other).map((l) => `  ${l}`),
    '</section>',
  ].filter(Boolean);
}

export function renderPage(site) {
  const sections = visibleSections(site);
  const ctx = { site, sections, page: site.page, other: site.conversation?.other, email: site.person?.email, bookUrl: bookingUrl(site) };
  return sections.flatMap((s) => renderSection(s, ctx));
}

// Everything wrong with site.json › page, as "where: what" lines.
export function validatePage(site) {
  const page = site.page || {};
  const out = [];
  const secs = page.sections;
  if (!Array.isArray(secs) || !secs.length) return ['page.sections: required, a list of sections'];
  if (typeof page.bookLink !== 'string') out.push('page.bookLink: required');
  const ids = new Set();
  secs.forEach((s, i) => {
    const path = `page.sections[${i}]${s?.id ? ` (${s.id})` : ''}`;
    out.push(...checkProps(s, sectionProps, path));
    if (s.id && !/^[a-z]+$/.test(s.id)) out.push(`${path}.id: lowercase letters only`);
    if (ids.has(s.id)) out.push(`${path}.id: used twice`);
    ids.add(s.id);
    const variant = s.variant || 'plain';
    if (variant !== 'hero' && !s.head) out.push(`${path}.head: required outside a hero section`);
    if (variant !== 'hero' && !s.reply && variant !== 'booking') out.push(`${path}.reply: required, so replies can lead here`);
    (s.parts || []).forEach((p, j) => {
      const pp = `${path}.parts[${j}]`;
      const spec = parts[p?.type];
      if (!spec) { out.push(`${pp}.type: must be one of ${partTypes.join(', ')}`); return; }
      out.push(...checkProps(p, { ...common, ...spec.props }, pp));
      if (spec.check) out.push(...spec.check(p, pp, site));
      if (p.type === 'headline' && variant !== 'hero') out.push(`${pp}: a headline only goes in a hero section`);
      if (p.type === 'booking' && variant !== 'booking') out.push(`${pp}: the booking part only goes in the booking section`);
    });
    if (variant === 'hero' && (s.parts || []).filter((p) => p.type === 'headline').length !== 1) out.push(`${path}: a hero section has exactly one headline part`);
  });
  for (const s of secs) for (const r of s.replies || []) if (!ids.has(r)) out.push(`page.sections (${s.id}).replies: no section "${r}"`);
  const count = (v) => secs.filter((s) => (s.variant || 'plain') === v).length;
  if (count('hero') !== 1) out.push('page.sections: exactly one hero section');
  if (count('booking') !== 1) out.push('page.sections: exactly one booking section');
  if (secs.flatMap((s) => s.parts || []).filter((p) => p.type === 'booking').length > 1) out.push('page.sections: at most one booking part');
  return out;
}

// Static HTML for index.html, generated from content/site.json. Pure strings
// (no DOM), shared by scripts/sync.mjs, the component library and the tests,
// so the whole page reads without JavaScript and never drifts from config.
//
// The page is a conversation that ends at a booked call
// (_model/target/funnel.md). Its sections come from site.json › page.sections,
// rendered by src/parts.js; without JavaScript they read top to bottom.

import { esc, bookingUrl, renderPage, visibleSections, bookSection, validatePage } from './parts.js';

export { bookingUrl };

export function renderRegions(site) {
  const errors = validatePage(site);
  if (errors.length) throw new Error(`content/site.json › page is not valid:\n  ${errors.join('\n  ')}`);
  const C = site.conversation || {};
  const sections = visibleSections(site);

  // The ask bar: only useful with JavaScript, so it starts hidden.
  const ask = C.ask ? [
    '<form class="pg-ask" data-ask hidden>',
    `  <label class="pg-label" for="ask">${esc(C.ask.label)}</label>`,
    C.ask.example && `  <p class="pg-example" id="ask-ex">${esc(C.ask.example)}</p>`,
    '  <div class="pg-ask-row">',
    `    <input class="pg-input" id="ask" name="q" type="text" autocomplete="off"${C.ask.example ? ' aria-describedby="ask-ex"' : ''} />`,
    `    <button class="btn btn-ghost" type="submit">${esc(C.ask.submit)}</button>`,
    '  </div>',
    C.all && `  <button class="pg-all" type="button" data-show-all>${esc(C.all)}</button>`,
    '</form>',
  ].filter(Boolean) : [];

  const page = [...renderPage(site), ...ask];

  const meta = [
    `<title>${esc(site.meta?.title || site.brand)}</title>`,
    `<meta name="description" content="${esc(site.meta?.description)}" />`,
    `<meta property="og:title" content="${esc(site.meta?.title || site.brand)}" />`,
    `<meta property="og:description" content="${esc(site.meta?.description)}" />`,
  ];

  const reading = [`<script>window.__muReading = ${JSON.stringify({ motion: site.reading?.motion || 'calm', text: site.reading?.text || 'standard' })};</script>`];

  // Booking settings the script needs, without loading site.json at runtime.
  const booking = [`<script type="application/json" id="booking-config">${JSON.stringify({
    calLink: site.booking?.calLink || null,
    origin: site.booking?.origin || 'https://cal.com',
    embedScript: site.booking?.embedScript || 'https://app.cal.com/embed/embed.js',
    timeoutSeconds: site.booking?.timeoutSeconds ?? 10,
    fields: site.booking?.fields || [],
  }).replace(/</g, '\\u003c')}</script>`,
  // What the conversation needs: which section each reply and typed word leads to.
  `<script type="application/json" id="talk-config">${JSON.stringify(talkConfig(site, sections)).replace(/</g, '\\u003c')}</script>`];

  return { meta, reading, page, booking };
}

// The conversation's settings for src/talk.js. Fact answers are resolved
// here, so the browser never needs site.json.
export function talkConfig(site, sections = visibleSections(site)) {
  const C = site.conversation || {};
  const fact = (key) => {
    const f = site.facts?.[key];
    const v = f?.value ?? f?.missing;
    return v ? (f.value ? `${f.label}: ${/[.!?]$/.test(v) ? v : `${v}.`}` : v) : null;
  };
  return {
    start: C.start || sections[0]?.id,
    book: bookSection(sections)?.id,
    intake: sections.find((s) => s.parts.some((p) => p.type === 'intake'))?.id || null,
    you: C.you || 'You',
    bookLink: site.page.bookLink,
    fallback: C.fallback,
    describe: C.describe,
    describeUnset: C.describeUnset,
    disclosure: C.disclosure || null,
    answers: (C.answers || []).map((a) => ({ keywords: a.keywords, text: a.fact ? fact(a.fact) : a.text })).filter((a) => a.text),
    sections: sections.map((s) => ({ id: s.id, reply: s.reply || null, intents: s.intents || [], replies: (s.replies || []).filter((r) => sections.some((x) => x.id === r)) })),
  };
}

// Replace each <!-- sync:NAME --> … <!-- /sync:NAME --> region, keeping indentation.
export function applyRegions(html, regions) {
  let out = html;
  for (const [name, lines] of Object.entries(regions)) {
    const re = new RegExp(`([ \\t]*)<!-- sync:${name} -->[\\s\\S]*?<!-- /sync:${name} -->`);
    const m = out.match(re);
    if (!m) throw new Error(`index.html has no sync:${name} region`);
    const pad = m[1];
    const body = lines.map((l) => (l ? pad + l : l)).join('\n');
    out = out.replace(re, `${pad}<!-- sync:${name} -->\n${body}\n${pad}<!-- /sync:${name} -->`);
  }
  return out;
}

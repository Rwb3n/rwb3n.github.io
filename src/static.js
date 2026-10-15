// Static HTML for index.html, generated from content/site.json. Pure strings
// (no DOM), shared by scripts/sync.mjs, the component library and the tests,
// so the whole page reads without JavaScript and never drifts from config.
//
// The page is one funnel, read top to bottom, ending at a booked call
// (_model/target/funnel.md): problem, cases, start, who, intake, book. Every
// section has a quiet link straight to #book.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (t, vars) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const stop = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

const factText = (site, key) => {
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

export function renderRegions(site) {
  const P = site.page || {};
  const email = site.person?.email;
  const bookLink = (cls = '') => `<a class="pg-book-link${cls}" href="#book">${esc(P.bookLink)} <span aria-hidden="true">↓</span></a>`;
  const section = (id, head, body, { headTag = 'h2', link = true } = {}) => [
    `<section class="pg-section is-${id}" id="${id}" aria-labelledby="${id}-h">`,
    `  <${headTag} class="pg-head" id="${id}-h"${id === 'book' ? ' tabindex="-1"' : ''}>${esc(head)}</${headTag}>`,
    ...body.filter(Boolean).map((l) => `  ${l}`),
    link ? `  ${bookLink()}` : '',
    '</section>',
  ].filter(Boolean);

  // 1 The problem --------------------------------------------------------------
  const pr = P.problem || {};
  let accented = false;
  const lines = (pr.headline || []).map((line) => {
    const e = esc(line);
    const a = pr.accent && esc(pr.accent);
    if (!accented && a && e.includes(a)) { accented = true; return e.replace(a, `<em class="is-accent">${a}</em>`); }
    return e;
  });
  const problem = [
    '<section class="pg-section is-problem" id="problem" aria-labelledby="problem-h">',
    '  <div class="copy" data-copy>',
    `    <p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>${esc(pr.eyebrow)}</p>`,
    '    <h1 class="display" id="problem-h">',
    ...lines.map((l) => `      <span class="display-line">${l}</span>`),
    '    </h1>',
    '  </div>',
    pr.cue && `  <p class="pg-cue">${esc(pr.cue)}</p>`,
    `  ${bookLink(' is-first')}`,
    '</section>',
  ].filter(Boolean);

  // 2 Where the time goes ------------------------------------------------------
  const C = P.cases || {};
  const lab = C.labels || {};
  const cases = section('cases', C.head, [
    C.intro && `<p class="pg-intro">${esc(C.intro)}</p>`,
    '<div class="pg-cases">',
    ...(C.items || []).flatMap((c) => [
      '  <article class="pg-case">',
      `    <p class="pg-case-tag">${esc(c.tag)}</p>`,
      `    <h3 class="pg-case-title">${esc(c.title)}</h3>`,
      '    <dl class="pg-case-body">',
      `      <div><dt>${esc(lab.before)}</dt><dd>${esc(c.before)}</dd></div>`,
      `      <div><dt>${esc(lab.build)}</dt><dd>${esc(c.build)}</dd></div>`,
      `      <div class="is-result"><dt>${esc(lab.result)}</dt><dd>${esc(c.result)}</dd></div>`,
      '    </dl>',
      '  </article>',
    ]),
    '</div>',
    C.more && `<h3 class="pg-sub">${esc(C.more.head)}</h3>`,
    C.more && '<ul class="pg-more" role="list">',
    ...(C.more?.items || []).map((m) => `  <li><b>${esc(m.title)}</b> ${esc(m.text)}</li>`),
    C.more && '</ul>',
  ]);

  // 3 How we would start -------------------------------------------------------
  const S = P.start || {};
  const startFacts = (S.facts || []).map((f) => {
    const label = f.key ? site.facts?.[f.key]?.label : f.label;
    const value = f.key ? factText(site, f.key) : f.value;
    return label && value ? `  <li><b>${esc(label)}:</b> ${esc(stop(value))}</li>` : null;
  }).filter(Boolean);
  const start = section('start', S.head, [
    '<ol class="pg-steps" role="list">',
    ...(S.items || []).map((it, i) => `  <li><span class="pg-step-n" aria-hidden="true">${i + 1}</span><h3 class="pg-step-title">${esc(it.title)}</h3> <p class="pg-step-detail">${esc(it.detail)}</p></li>`),
    '</ol>',
    S.note && `<p class="pg-note">${esc(S.note)}</p>`,
    startFacts.length && '<ul class="pg-facts" role="list">',
    ...startFacts,
    startFacts.length && '</ul>',
  ]);

  // 4 Who you would talk to ----------------------------------------------------
  const W = P.who || {};
  const who = section('who', W.head, (W.lines || []).map((l, i) => `<p class="pg-who${i === 0 ? ' is-lead' : ''}">${esc(l)}</p>`));

  // 5 Intake --------------------------------------------------------------------
  // A plain GET form whose action is the Cal.com booking page: without
  // JavaScript the fields prefill it there. With JavaScript, src/book.js opens
  // the embed in #book instead. No booking link yet: no form, nothing to send.
  const I = P.intake || {};
  const action = bookingUrl(site);
  const field = (f) => {
    const id = `f-${f.name}`;
    const control = f.long
      ? `<textarea class="pg-input" id="${id}" name="${esc(f.name)}" rows="4" aria-describedby="${id}-ex"></textarea>`
      : `<input class="pg-input" id="${id}" name="${esc(f.name)}" type="text" autocomplete="off" aria-describedby="${id}-ex" />`;
    return [
      '  <div class="pg-field">',
      `    <label class="pg-label" for="${id}">${esc(f.label)}</label>`,
      `    <p class="pg-example" id="${id}-ex">${esc(f.example)}</p>`,
      `    ${control}`,
      '  </div>',
    ];
  };
  const intake = !action ? [] : section('intake', I.head, [
    I.intro && `<p class="pg-intro">${esc(I.intro)}</p>`,
    `<form class="pg-intake" method="get" action="${esc(action)}" data-intake>`,
    ...(I.fields || []).flatMap(field),
    `  <button class="btn btn-ghost pg-intake-go" type="submit">${esc(I.submit)}</button>`,
    `  <p class="pg-small">${esc(I.note)}</p>`,
    '</form>',
  ], { link: false });

  // 6 Book -----------------------------------------------------------------------
  const B = P.book || {};
  const bookUrl = bookingUrl(site);
  const book = section('book', B.head, bookUrl ? [
    `<p class="pg-intro">${esc(B.line)}</p>`,
    '<div class="pg-booking" data-booking>',
    `  <a class="btn btn-primary pg-show" href="${esc(bookUrl)}" data-book-show>${esc(B.show)} <span aria-hidden="true">→</span></a>`,
    `  <p class="pg-status" data-book-status role="status" hidden>${esc(B.loading)}</p>`,
    '  <div class="pg-embed" id="cal-embed" data-book-embed hidden></div>',
    `  <p class="pg-fail" data-book-fail hidden>${esc(B.failed)} <a href="${esc(bookUrl)}" data-book-open>${esc(B.open)}</a></p>`,
    '</div>',
    `<p class="pg-email">${esc(fill(B.email, { email: '\u0000' })).replace('\u0000', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}</p>`,
  ] : [
    `<p class="pg-intro">${esc(fill(B.unset, { email: '\u0000' })).replace('\u0000', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}</p>`,
  ], { link: false });

  const page = [...problem, ...cases, ...start, ...who, ...intake, ...book];

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
  }).replace(/</g, '\\u003c')}</script>`];

  return { meta, reading, page, booking };
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

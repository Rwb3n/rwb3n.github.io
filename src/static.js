// Static HTML for index.html, generated from content/site.json. Pure strings
// (no DOM), shared by scripts/sync.mjs, the component library and the tests,
// so the whole page reads without JavaScript and never drifts from config.
//
// The page is one funnel, read top to bottom, ending at a booked call
// (_model/target/funnel.md): job, cases, start, who, book. Cases and start
// end in a quiet link straight to #book.

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

  // 1 The job ------------------------------------------------------------------
  // The one conversational turn. A plain GET form to the Cal.com page: without
  // JavaScript, the job and a text "scale" field prefill it there. With
  // JavaScript, src/job.js swaps the text field for three numbers and answers
  // the visitor under "Show what it costs" (the answer block is here, hidden,
  // so its words read without JavaScript too).
  const J = P.job || {};
  const action = bookingUrl(site);
  const A = J.answer || {};
  const D = J.decide || {};
  let accented = false;
  const lines = (J.headline || []).map((line) => {
    const e = esc(line);
    const a = J.accent && esc(J.accent);
    if (!accented && a && e.includes(a)) { accented = true; return e.replace(a, `<em class="is-accent">${a}</em>`); }
    return e;
  });
  const textField = (f, id, long) => [
    '    <div class="pg-field">',
    `      <label class="pg-label" for="${id}">${esc(f.label)}</label>`,
    `      <p class="pg-example" id="${id}-ex">${esc(f.example)}</p>`,
    long
      ? `      <textarea class="pg-input" id="${id}" name="${esc(f.name)}" rows="3" aria-describedby="${id}-ex"></textarea>`
      : `      <input class="pg-input" id="${id}" name="${esc(f.name)}" type="text" autocomplete="off" aria-describedby="${id}-ex" />`,
    '    </div>',
  ];
  const number = (n) => {
    const id = `n-${n.key}`;
    return [
      '      <div class="est-field">',
      `        <label class="est-label" for="${id}">${esc(n.label)}</label>`,
      '        <div class="est-control">',
      `          <button class="est-step" type="button" data-step="-1" aria-label="${esc(n.less)}">−</button>`,
      n.prefix ? `          <span class="est-prefix" aria-hidden="true">${esc(n.prefix)}</span>` : '',
      `          <input class="est-input" id="${id}" data-num="${esc(n.key)}" type="number" inputmode="decimal" min="${n.min}" max="${n.max}" step="${n.step ?? 1}" value="${n.value}"${n.hint ? ` aria-describedby="${id}-hint"` : ''} />`,
      `          <button class="est-step" type="button" data-step="1" aria-label="${esc(n.more)}">+</button>`,
      '        </div>',
      n.hint ? `        <span class="est-hint" id="${id}-hint">${esc(n.hint)}</span>` : '',
      '      </div>',
    ].filter(Boolean);
  };
  const job = [
    '<section class="pg-section is-job" id="job" aria-labelledby="job-h">',
    '  <div class="copy" data-copy>',
    `    <p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>${esc(J.eyebrow)}</p>`,
    '    <h1 class="display" id="job-h">',
    ...lines.map((l) => `      <span class="display-line">${l}</span>`),
    '    </h1>',
    '  </div>',
    `  <form class="pg-job" method="get"${action ? ` action="${esc(action)}"` : ''} data-job>`,
    ...textField(J.field || {}, `f-${J.field?.name}`, true),
    '    <div class="pg-nojs" data-nojs>',
    ...textField(J.noscript || {}, `f-${J.noscript?.name}`, false).map((l) => `  ${l}`),
    action ? `      <button class="btn btn-ghost pg-job-go" type="submit">${esc(J.noscript?.submit)}</button>` : '',
    '    </div>',
    '  </form>',
    // With JavaScript the form goes and the bench shows, already set to one
    // example job (src/job.js builds the options; the words are in site.json).
    '  <div class="pg-bench" data-answer hidden>',
    // Left: what the visitor sets (taps and numbers). Right: what it makes.
    '    <div class="pg-bench-in">',
    ...['kind', 'systems', 'frequency', 'people'].map((q) => `      <div class="pg-q" data-q="${q}"><h3 class="pg-q-h">${esc(D.taps?.[q])}</h3><div class="pg-options" data-opts></div></div>`),
    '      <div class="pg-q pg-numbers-box">',
    `        <h3 class="pg-q-h">${esc(D.numbersHead)}</h3>`,
    '        <div class="est-fields pg-numbers">',
    ...(J.numbers || []).flatMap(number).map((l) => `    ${l}`),
    '        </div>',
    '      </div>',
    '    </div>',
    '    <div class="pg-bench-out">',
    '      <div class="pg-part" data-compare></div>',
    '      <div class="pg-part pg-money" data-money>',
    '        <p class="pg-share" data-answer-share></p>',
    '        <dl class="est-dl">',
    `          <div><dt class="micro">${esc(A.pay)}</dt><dd><span class="est-num" data-answer-pay></span></dd></div>`,
    `          <div><dt class="micro">${esc(A.cost)}</dt><dd><span class="est-num is-accent" data-answer-cost></span></dd></div>`,
    '        </dl>',
    '        <p class="est-weeks" data-answer-weeks></p>',
    '        <div class="est-grid-wrap"><div class="est-grid" data-answer-grid aria-hidden="true"></div></div>',
    `        <p class="est-key">${esc(A.key)}</p>`,
    '      </div>',
    '      <div class="pg-part" data-first>',
    `        <h3 class="pg-q-h">${esc(D.firstHead)}</h3>`,
    '        <div data-first-list></div>',
    '      </div>',
    '      <div class="pg-part pg-end" data-end>',
    '        <p class="pg-nearest" data-answer-nearest></p>',
    `        <p class="pg-small">${esc(A.note)}</p>`,
    `        <button class="btn btn-ghost pg-answer-book" type="button" data-answer-book>${esc(A.book)} <span aria-hidden="true">↓</span></button>`,
    '      </div>',
    '    </div>',
    '    <p class="visually-hidden" aria-live="polite" data-answer-live></p>',
    '  </div>',
    '</section>',
  ].filter(Boolean);

  // 2 Where the time goes ------------------------------------------------------
  const C = P.cases || {};
  const lab = C.labels || {};
  const cases = section('cases', C.head, [
    C.intro && `<p class="pg-intro">${esc(C.intro)}</p>`,
    '<div class="pg-cases">',
    ...(C.items || []).flatMap((c) => [
      `  <article class="pg-case"${c.id ? ` id="case-${esc(c.id)}"` : ''}>`,
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
  const L = S.look;
  // With "What I look for", that is the section's heading and "How we would
  // start" a sub-heading.
  const start = section('start', L ? L.head : S.head, [
    ...(L ? [
      L.intro && `<p class="pg-intro">${esc(L.intro)}</p>`,
      '<ul class="pg-look" role="list">',
      ...(L.items || []).map((t) => `  <li>${esc(t)}</li>`),
      '</ul>',
      `<h3 class="pg-sub">${esc(S.head)}</h3>`,
    ] : []),
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
  const ph = W.photo;
  const who = section('who', W.head, [
    '<div class="pg-who-body">',
    ph && `  <img class="pg-photo" src="${esc(ph.src)}" width="${ph.width}" height="${ph.height}" alt="${esc(ph.alt)}" decoding="async" />`,
    '  <div class="pg-who-lines">',
    site.person?.fullName && `    <p class="pg-who-name">${esc(site.person.fullName)}</p>`,
    ...(W.lines || []).map((l, i) => `    <p class="pg-who">${esc(l)}</p>`),
    '  </div>',
    '</div>',
  ], { link: false });

  // 5 Book -----------------------------------------------------------------------
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

  const page = [...job, ...cases, ...start, ...who, ...book];

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
    // Step 1 (src/job.js): the numbers, the answer's words, and the examples'
    // words for "nearest example".
    job: J.numbers ? {
      field: J.field?.name || 'job',
      numbers: J.numbers,
      answer: J.answer || {},
      cases: (P.cases?.items || []).filter((c) => c.id).map((c) => ({ id: c.id, title: c.title, match: c.match || [] })),
      decide: J.decide || null,
    } : null,
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

// Static HTML for index.html, generated from content/site.json and the root
// topic. Pure strings (no DOM), shared by scripts/sync.mjs and the tests, so
// the page reads correctly without JavaScript and never drifts from config.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const factText = (site, key) => {
  const f = site.facts?.[key];
  return f ? f.value ?? f.missing ?? null : null;
};

export function renderRegions(site, content) {
  const L = site.landing || {};
  const lines = (L.headline || []).map((line) => {
    const e = esc(line);
    const a = L.accent && esc(L.accent);
    return a && e.includes(a) ? e.replace(a, `<em class="is-accent">${a}</em>`) : e;
  });
  // Only the first occurrence of the accent word gets the accent.
  let accented = false;
  const display = lines.map((l) => {
    if (accented) return l.replace(/<em class="is-accent">(.*?)<\/em>/, '$1');
    if (l.includes('is-accent')) accented = true;
    return l;
  });

  const root = content.nodes[content.root];
  const entries = (root?.chips || []).map((c, i) => {
    const label = c.label || content.nodes[c.target]?.label || c.target;
    return `<a class="entry-item" href="#/${esc(c.target)}" data-target="${esc(c.target)}"><span class="entry-index">${String(i + 1).padStart(2, '0')}</span><span class="entry-label">${esc(label)}</span><span class="entry-arrow" aria-hidden="true">→</span></a>`;
  });

  const facts = (L.path?.book?.facts || L.facts || []).map((k) => [site.facts?.[k], factText(site, k)]).filter(([f, v]) => f && v);

  // The landing is one path, one idea per screen: the headline (with the lens),
  // then three examples with their context, a system that runs today, how we
  // would start, and the next step. Copy lives in site.json → landing.path.
  const P = L.path || {};
  const step = (id, title, body) => [
    `<section class="land-step is-${id}" id="land-${id}" aria-labelledby="land-${id}-h">`,
    `  <h2 class="land-step-head" id="land-${id}-h">${esc(title)}</h2>`,
    ...body.filter(Boolean).map((l) => `  ${l}`),
    '</section>',
  ];
  const first = ['cases', 'proof', 'how', 'book'].find((k) => P[k]) || 'book';

  const landing = [
    '<div class="copy" data-copy>',
    `  <p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>${esc(L.eyebrow)}</p>`,
    '  <h1 class="display" id="landing-title">',
    ...display.map((l) => `    <span class="display-line">${l}</span>`),
    '  </h1>',
    '</div>',
    L.cue ? `<a class="land-cue" href="#land-${first}">${esc(L.cue)} <span aria-hidden="true">↓</span></a>` : '',
  ].filter(Boolean);

  const C = P.cases, R = P.proof, H = P.how, B = P.book;
  const lab = C?.labels || {};
  const email = site.person?.email;
  const steps = [
    ...(C ? step('cases', C.head, [
      C.intro && `<p class="land-intro">${esc(C.intro)}</p>`,
      '<div class="land-cases">',
      ...(C.items || []).flatMap((c) => [
        '  <article class="land-case">',
        `    <p class="land-case-tag">${esc(c.tag)}</p>`,
        `    <h3 class="land-case-title">${esc(c.title)}</h3>`,
        '    <dl class="land-case-body">',
        `      <div><dt>${esc(lab.before || 'Today')}</dt><dd>${esc(c.before)}</dd></div>`,
        `      <div><dt>${esc(lab.build || 'What I would build')}</dt><dd>${esc(c.build)}</dd></div>`,
        `      <div class="is-result"><dt>${esc(lab.result || 'What changes')}</dt><dd>${esc(c.result)}</dd></div>`,
        '    </dl>',
        '  </article>',
      ]),
      '</div>',
    ]) : []),
    ...(R ? step('proof', R.head, [
      R.intro && `<p class="land-intro">${esc(R.intro)}</p>`,
      '<ul class="land-metrics" role="list">',
      ...(R.metrics || []).map((m) => `  <li><span class="land-metric-value">${esc(m.value)}</span> <span class="land-metric-label">${esc(m.label)}</span></li>`),
      '</ul>',
      R.note && `<p class="land-note">${esc(R.note)}</p>`,
      R.link && `<a class="land-link" href="#/${esc(R.link.target)}" data-target="${esc(R.link.target)}">${esc(R.link.label)} <span aria-hidden="true">→</span></a>`,
    ]) : []),
    ...(H ? step('how', H.head, [
      '<ol class="land-how" role="list">',
      ...(H.items || []).map((it, i) => `  <li><span class="land-how-n">${i + 1}</span><h3 class="land-how-title">${esc(it.title)}</h3><p class="land-how-detail">${esc(it.detail)}</p></li>`),
      '</ol>',
    ]) : []),
    ...step('book', B?.head || 'Next step', [
      B?.line && `<p class="land-line">${esc(B.line)}</p>`,
      B?.cta && email && `<a class="entry-tool is-cta" href="mailto:${esc(email)}" data-target="_book"><span class="entry-tool-label">${esc(B.cta)}</span><span class="entry-arrow" aria-hidden="true">→</span></a>`,
      facts.length && '<dl class="offer">',
      ...facts.map(([f, v]) => `  <div class="offer-item"><dt>${esc(f.label)}</dt><dd>${esc(v)}</dd></div>`),
      facts.length && '</dl>',
      B?.more && `<h3 class="land-more-head">${esc(B.more)}</h3>`,
      '<nav class="entry" aria-label="Topics" data-entry>',
      ...entries.map((e) => `  ${e}`),
      '</nav>',
      '<div class="entry-more">',
      L.tool ? `  <a class="entry-tool" href="#/${esc(L.tool.target)}" data-target="${esc(L.tool.target)}"><span class="entry-tool-label">${esc(L.tool.label)}</span>${L.tool.note ? `<span class="entry-tool-note">${esc(L.tool.note)}</span>` : ''}<span class="entry-arrow" aria-hidden="true">→</span></a>` : '',
      L.allLink ? `  <p class="entry-all"><a href="#/all" data-all-link>${esc(L.allLink)} <span aria-hidden="true">→</span></a></p>` : '',
      '</div>',
    ]),
  ];

  const meta = [
    `<title>${esc(site.meta?.title || site.brand)}</title>`,
    `<meta name="description" content="${esc(site.meta?.description)}" />`,
    `<meta property="og:title" content="${esc(site.meta?.title || site.brand)}" />`,
    `<meta property="og:description" content="${esc(site.meta?.description)}" />`,
  ];

  const reading = [`<script>window.__muReading = ${JSON.stringify({ motion: site.reading?.motion || 'calm', text: site.reading?.text || 'standard' })};</script>`];

  const caption = [`<span class="lens-caption-text" data-lens-caption-text>${esc(L.lens?.idle)}</span>`];

  const noscript = [
    '<section class="noscript">',
    '  <p>JavaScript is off. The essentials:</p>',
    '  <dl class="offer">',
    ...Object.keys(site.facts || {})
      .map((k) => [site.facts[k], factText(site, k)])
      .filter(([f, v]) => f && v && !f.link)
      .map(([f, v]) => `    <div class="offer-item"><dt>${esc(f.label)}</dt><dd>${esc(v)}</dd></div>`),
    '  </dl>',
    email ? `  <p>Email: <a href="mailto:${esc(email)}">${esc(email)}</a></p>` : '',
    '</section>',
  ].filter(Boolean);

  return { meta, reading, landing, steps, caption, noscript };
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

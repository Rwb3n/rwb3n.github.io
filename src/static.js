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

  const facts = (L.facts || []).map((k) => [site.facts?.[k], factText(site, k)]).filter(([f, v]) => f && v);

  // The landing is a sequence, one idea per screen: the headline (with the
  // lens), then examples, then the first step and cost, then where to start.
  const S = L.steps || {};
  const step = (id, title, body) => [
    `<section class="land-step" id="land-${id}" aria-labelledby="land-${id}-h">`,
    `  <h2 class="land-step-head" id="land-${id}-h">${esc(title)}</h2>`,
    ...body.filter(Boolean).map((l) => `  ${l}`),
    '</section>',
  ];

  const landing = [
    '<div class="copy" data-copy>',
    `  <p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>${esc(L.eyebrow)}</p>`,
    '  <h1 class="display" id="landing-title">',
    ...display.map((l) => `    <span class="display-line">${l}</span>`),
    '  </h1>',
    '</div>',
    L.cue ? `<a class="land-cue" href="#land-examples">${esc(L.cue)} <span aria-hidden="true">↓</span></a>` : '',
  ].filter(Boolean);

  const steps = [
    ...(L.lede ? step('examples', S.examples || 'Examples', [`<p class="lede">${esc(L.lede)}</p>`]) : []),
    ...(facts.length ? step('offer', S.offer || 'The first step', [
      '<dl class="offer">',
      ...facts.map(([f, v]) => `  <div class="offer-item"><dt>${esc(f.label)}</dt><dd>${esc(v)}</dd></div>`),
      '</dl>',
    ]) : []),
    ...step('start', S.start || 'Where to start', [
      '<nav class="entry" aria-label="Start here" data-entry>',
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

  const email = site.person?.email;
  const noscript = [
    '<section class="noscript">',
    '  <p>This site works best with JavaScript turned on. Here is a short summary.</p>',
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

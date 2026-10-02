// The /components/ page: tokens, interface pieces and every block, rendered
// live by the same code the site uses, with props, usage and an editor.

import { applyConfig } from './copy.js';
import { loadContent, loadSiteConfig } from './content.js';
import { initPrefs, setPref, motion } from './prefs.js';
import { renderBlock } from './blocks.js';
import { h, reducedMotion } from './dom.js';
import { blocks, categories, primitives, validateBlocks, usage, typeLabel } from './catalog.js';
import { turnShell, chips, onePage, createRail } from './layouts.js';
import { enhanceLanding } from './landing.js';
import { renderRegions } from './static.js';
import { splitWords } from './type.js';

const $ = (sel) => document.querySelector(sel);
const html = document.documentElement;

let config = {};
try { config = await loadSiteConfig(); applyConfig(config); } catch (err) { console.warn('[config]', err.message); }
initPrefs(config.reading);

let content = { nodes: {} };
try { content = await loadContent(); } catch (err) { console.warn('[content]', err.message); }
// Fixtures: test content that uses every block. Never loaded by the site.
const fixtureIds = new Set();
let fx = { nodes: {}, parents: {} };
try {
  fx = await loadContent('fixtures');
  for (const [id, n] of Object.entries(fx.nodes)) { fixtureIds.add(id); content.nodes[id] = n; }
} catch (err) { console.warn('[fixtures]', err.message); }
const nodes = Object.values(content.nodes);
const used = usage(nodes);

// Chrome ------------------------------------------------------------------------

$('[data-theme-toggle]').addEventListener('click', () => {
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  try { localStorage.setItem('mu-theme', next); } catch { /* private mode */ }
  document.dispatchEvent(new CustomEvent('mu:theme', { detail: next }));
});

const seg = $('[data-motion-pick]');
const syncSeg = () => seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === motion())));
seg.addEventListener('click', (e) => {
  const v = e.target.closest('button')?.dataset.v;
  if (!v) return;
  setPref('motion', v);
  syncSeg();
  replayAll();
});
syncSeg();

let toastTimer = 0;
function toast(msg) {
  const t = $('[data-toast]');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

// What blocks can do on this page instead of in a conversation.
const ctx = {
  navigate: (target) => toast(`On the site this opens the topic “${content.nodes[target]?.label || target}”.`),
  addEstimate: (s) => toast(`Added to the visit summary: ${s}`),
};

// Rendering ---------------------------------------------------------------------

// Render blocks into a stage the way the app does: add, then reveal next frame.
function mount(stage, list) {
  stage.replaceChildren();
  for (const b of list) {
    let node;
    try { node = renderBlock(b, ctx); } catch (err) { node = h('p', { class: 'lib-error' }, `Render failed: ${err.message}`); }
    if (!node) { stage.append(h('p', { class: 'lib-empty micro' }, `${b.type}: renders nothing with these props`)); continue; }
    node.classList.add('reveal');
    stage.append(node);
  }
  requestAnimationFrame(() => {
    for (const node of stage.querySelectorAll(':scope > .reveal')) {
      node.classList.add('is-in');
      node.onReveal?.();
      node.querySelectorAll('*').forEach((c) => c.onReveal?.());
    }
  });
}

const replays = [];
const afterMount = [];   // run once the page is in the document (things that measure layout)
function replayAll() {
  for (const r of replays) r();
  requestAnimationFrame(() => { while (afterMount.length) afterMount.shift()(); });
}

// An editor: JSON in a textarea, validated and re-rendered as you type.
function editor({ value, stage, errors, onValid, asList = false }) {
  const area = h('textarea', { class: 'lib-json', spellcheck: 'false', autocapitalize: 'off', rows: Math.min(24, value.split('\n').length + 1) });
  area.value = value;
  let timer = 0;
  const run = () => {
    let parsed;
    try { parsed = JSON.parse(area.value); } catch (err) { return show([`JSON: ${err.message}`]); }
    const list = asList ? parsed : [parsed];
    const problems = validateBlocks(list, asList ? 'blocks' : 'block');
    show(problems);
    if (!problems.length || list.every((b) => blocks[b?.type])) { mount(stage, list.filter((b) => blocks[b?.type])); onValid?.(parsed); }
  };
  const show = (problems) => {
    errors.replaceChildren(...problems.map((p) => h('li', null, p)));
    errors.hidden = !problems.length;
    area.setAttribute('aria-invalid', String(!!problems.length));
  };
  area.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 250); });
  area.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
  });
  return { area, run, set(v) { area.value = v; area.rows = Math.min(24, v.split('\n').length + 1); run(); } };
}

const pretty = (v) => JSON.stringify(v, null, 2);
// Docs use `backticks` for code.
const md = (t = '') => t.split(/`([^`]+)`/).map((part, i) => (i % 2 ? h('code', null, part) : part));

// Sections ----------------------------------------------------------------------

function section(id, title, kicker, ...body) {
  return h('section', { class: 'lib-section', id, 'aria-labelledby': `${id}-h` },
    h('header', { class: 'lib-section-head' },
      kicker && h('p', { class: 'micro' }, kicker),
      h('h2', { class: 'lib-h2', id: `${id}-h` }, title),
    ),
    body,
  );
}

// Foundations: values read from the live CSS, so the page cannot drift from it.
const COLOURS = [
  ['--bg', 'Page'], ['--bg-raised', 'Raised surface'], ['--bg-sunken', 'Sunken surface'],
  ['--fg', 'Text'], ['--fg-2', 'Secondary text'], ['--fg-3', 'Tertiary text'],
  ['--line', 'Hairline'], ['--line-2', 'Strong hairline'],
  ['--accent', 'Signal: the thing that matters, live state, the one action'], ['--accent-soft', 'Signal wash'], ['--accent-line', 'Signal line'],
];
const TEXT_TOKENS = new Set(['--fg', '--fg-2', '--fg-3', '--accent']);
const TYPE = [
  ['--step-display', 'display', 'Display', 'I find the work'],
  ['--step-4', 'display', 'Step 4', 'Questions and headings'],
  ['--step-3', 'display', 'Step 3', 'Callouts'],
  ['--step-2', 'sans', 'Step 2', 'Sub-headings'],
  ['--step-1', 'sans', 'Step 1', 'Body copy in answers'],
  ['--step-0', 'sans', 'Step 0', 'Interface text'],
  ['--step--1', 'sans', 'Step −1', 'Captions and notes'],
  ['--step--2', 'mono', 'Step −2', 'MICRO LABELS'],
];
const SPACE = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8', '--space-9'];
const MOTION = [['--ease-out', '--dur-3', 'Arrivals'], ['--ease-in-out', '--dur-4', 'Journeys'], ['--ease-spring', '--dur-4', 'Things that land']];

const cssVar = (name) => getComputedStyle(html).getPropertyValue(name).trim();

function colourSection() {
  const grid = h('div', { class: 'lib-swatches' });
  const paint = () => grid.replaceChildren(...COLOURS.map(([name, role]) => {
    const value = cssVar(name);
    const ratio = TEXT_TOKENS.has(name) ? contrast(value, cssVar('--bg')) : null;
    return h('figure', { class: 'lib-swatch' },
      h('span', { class: 'lib-chip', style: { background: `var(${name})` } }, ratio && h('span', { style: { color: `var(${name})` } }, 'Aa')),
      h('figcaption', null,
        h('code', null, name),
        h('span', { class: 'lib-val' }, value),
        ratio && h('span', { class: `lib-ratio${ratio < 4.5 ? ' is-fail' : ''}` }, `${ratio.toFixed(1)} : 1 on --bg ${ratio >= 4.5 ? '· AA' : '· below AA'}`),
        h('span', { class: 'lib-role' }, role),
      ),
    );
  }));
  paint();
  document.addEventListener('mu:theme', paint);
  return section('colour', 'Colour', 'Foundations',
    h('p', { class: 'lib-p' }, 'Warm paper and ink, one signal colour. Values are read from the live stylesheet in the current theme; contrast is computed here. Switch the theme to check the other one.'),
    grid);
}

function typeSection() {
  return section('type', 'Type', 'Foundations',
    h('p', { class: 'lib-p' }, 'Three voices, each with one job: Zodiak for display, Switzer for reading, JetBrains Mono for the system. All three load from Fontshare.'),
    h('div', { class: 'lib-type' }, TYPE.map(([step, face, name, sample]) =>
      h('div', { class: 'lib-type-row' },
        h('span', { class: 'micro' }, name, h('br'), step),
        h('span', { class: `lib-type-sample is-${face}`, style: { fontSize: `var(${step})` } }, sample),
      ))),
    glyphCoverage());
}

// Every character the site uses beyond plain ASCII, checked against each face.
// A face "has" a character when the measured width does not change with the
// fallback behind it: then the browser is drawing it from that face.
const SITE_CHARS = '→↓·—–’‘“”£…−×©';
const FACES = [['Display', '--font-display'], ['Text', '--font-sans'], ['System', '--font-mono']];

function glyphCoverage() {
  const body = h('tbody');
  const table = h('table', { class: 'b-table lib-glyphs', 'data-glyphs': 'pending' },
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Character'), FACES.map(([name, v]) => h('th', { scope: 'col' }, name, h('br'), h('span', { class: 'lib-val' }, primaryFamily(v)))))),
    body);
  const run = async () => {
    const ctx = document.createElement('canvas').getContext('2d');
    const status = {};
    for (const [, v] of FACES) {
      const fam = primaryFamily(v);
      try { await document.fonts.load(`64px "${fam}"`, SITE_CHARS); } catch { /* blocked or offline */ }
      status[v] = [...document.fonts].some((f) => f.family.replace(/"/g, '') === fam && f.status === 'loaded');
    }
    const has = (fam, ch) => {
      const w = (fb) => { ctx.font = `64px "${fam}", ${fb}`; return ctx.measureText(ch).width; };
      const a = w('monospace'), b = w('serif'), c = w('cursive');
      return a === b && b === c;
    };
    const missing = [];
    body.replaceChildren(...[...SITE_CHARS].map((ch) => h('tr', null,
      h('td', null, h('span', { class: 'lib-glyph' }, ch), ' ', h('span', { class: 'lib-val' }, `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)),
      FACES.map(([, v]) => {
        const fam = primaryFamily(v);
        if (!status[v]) return h('td', { class: 'lib-val' }, 'font not loaded');
        const ok = has(fam, ch);
        if (!ok) missing.push(`${fam} ${ch}`);
        return h('td', { class: ok ? null : 'lib-miss' }, h('span', { style: { fontFamily: `var(${v})` } }, ch), ' ', ok ? 'yes' : 'missing: falls back');
      }))));
    table.dataset.glyphs = Object.values(status).every(Boolean) ? (missing.length ? `missing: ${missing.join(', ')}` : 'all present') : 'fonts not loaded';
  };
  afterMount.push(run);
  return h('figure', { class: 'lib-glyph-fig', id: 'glyphs' },
    h('figcaption', { class: 'lib-doc' }, 'Characters the site uses beyond plain ASCII. "Missing" means the browser draws that character from a fallback font.'),
    h('div', { class: 'b-table-wrap' }, table));
}

function primaryFamily(v) {
  return cssVar(v).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
}

function spaceSection() {
  const rows = h('div', { class: 'lib-space' });
  const paint = () => rows.replaceChildren(...SPACE.map((n) => h('div', { class: 'lib-space-row' },
    h('code', null, n), h('span', { class: 'lib-val' }, cssVar(n)), h('i', { style: { width: `var(${n})` } }))));
  paint();
  return section('space', 'Space and shape', 'Foundations',
    h('p', { class: 'lib-p' }, 'A 4px base. Radii are 2px and 4px with 1px hairlines: an instrument, not an app.'),
    rows,
    h('div', { class: 'lib-radii' },
      ['--radius-1', '--radius-2', '--radius-round'].map((r) => h('figure', null, h('span', { style: { borderRadius: `var(${r})` } }), h('figcaption', null, h('code', null, r))))));
}

function motionSection() {
  const lane = h('div', { class: 'lib-motion' }, MOTION.map(([ease, dur, name]) =>
    h('div', { class: 'lib-motion-row' },
      h('span', { class: 'micro' }, name),
      h('code', null, `${ease} · ${dur}`),
      h('span', { class: 'lib-track' }, h('i', { style: { transitionTimingFunction: `var(${ease})`, transitionDuration: `var(${dur})` } })))));
  const play = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => lane.classList.toggle('is-on') }, 'Play the curves');
  return section('motion', 'Motion', 'Foundations',
    h('p', { class: 'lib-p' }, 'Motion follows the setting in the bar. Full: everything, and nothing that starts by itself lasts over 5 seconds. Calm: nothing starts by itself; short fades. Off: nothing moves.'),
    play, lane);
}

function primitivesSection() {
  return section('primitives', 'Interface pieces', 'Primitives',
    h('p', { class: 'lib-p' }, 'Markup and classes from styles/main.css, used outside the block system.'),
    primitives.map((p) => {
      const stage = h('div', { class: 'lib-stage is-prim' });
      stage.innerHTML = p.html;
      return h('article', { class: 'lib-card', id: `prim-${slug(p.name)}` },
        h('h3', { class: 'lib-h3' }, p.name),
        h('p', { class: 'lib-doc' }, md(p.doc)),
        stage,
        h('details', { class: 'lib-src' }, h('summary', { class: 'micro' }, 'Markup'), h('pre', null, h('code', null, p.html))),
      );
    }));
}

// Each variant is its own small example under the editable one, so every look
// a block has is on the page (and in the screenshot tests).
function variantStage(type, v) {
  const st = h('div', { class: 'lib-stage is-variant' });
  replays.push(() => mount(st, [v.example]));
  return h('figure', { class: 'lib-variant', id: `block-${type}-${slug(v.name)}` },
    h('figcaption', null, h('span', { class: 'micro' }, 'Variant'), ' ', h('b', null, v.name), v.note && h('span', { class: 'lib-doc' }, ' ', md(v.note))),
    st);
}

function blockCard(type, spec) {
  const stage = h('div', { class: 'lib-stage' });
  const errors = h('ul', { class: 'lib-errors', hidden: true, role: 'status' });
  const ed = editor({ value: pretty(spec.example), stage, errors });
  replays.push(() => ed.run());
  const where = used[type] || [];
  const props = Object.entries(spec.props);

  const widthBtn = h('button', { class: 'lib-mini', type: 'button', 'aria-pressed': 'false', onclick: () => {
    const narrow = stage.classList.toggle('is-narrow');
    widthBtn.setAttribute('aria-pressed', String(narrow));
    ed.run();
  } }, 'Phone width');

  return h('article', { class: 'lib-card', id: `block-${type}` },
    h('header', { class: 'lib-card-head' },
      h('h3', { class: 'lib-h3' }, h('code', null, type)),
      spec.runtime && h('span', { class: 'lib-tag' }, 'made by the engine'),
    ),
    h('p', { class: 'lib-doc' }, md(spec.doc)),
    h('div', { class: 'lib-tools' },
      h('button', { class: 'lib-mini', type: 'button', onclick: () => ed.run() }, 'Replay'),
      widthBtn,
      h('button', { class: 'lib-mini', type: 'button', onclick: () => ed.set(pretty(spec.example)) }, 'Reset example'),
      h('button', { class: 'lib-mini', type: 'button', onclick: () => navigator.clipboard?.writeText(ed.area.value).then(() => toast('Copied the JSON.'), () => {}) }, 'Copy JSON'),
    ),
    stage,
    (spec.variants || []).map((v) => variantStage(type, v)),
    h('div', { class: 'lib-split' },
      h('div', null,
        h('h4', { class: 'micro' }, 'Props'),
        h('table', { class: 'b-table lib-props' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Prop'), h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'What it does'))),
          h('tbody', null,
            h('tr', null, h('td', null, h('code', null, 'type'), h('b', { class: 'lib-req', title: 'required' }, '*')), h('td', null, `"${type}"`), h('td', null, 'Selects this block.')),
            props.map(([k, p]) => h('tr', null,
              h('td', null, h('code', null, k), p.required && h('b', { class: 'lib-req', title: 'required' }, '*')),
              h('td', null, typeLabel(p)),
              h('td', null, md(p.doc), p.type === 'list' && p.of.type === 'object' && h('span', { class: 'lib-sub' }, Object.entries(p.of.props).map(([sk, sp]) => `${sk}${sp.required ? '*' : ''}`).join(' · ')))))),
        ),
        h('h4', { class: 'micro lib-used-h' }, 'Used in'),
        spec.runtime ? h('p', { class: 'lib-doc' }, 'The visit summary, built by src/engine.js.')
          : where.length ? h('ul', { class: 'lib-used' }, where.map((id) => h('li', null, fixtureIds.has(id)
            ? h('span', { class: 'lib-fixture', title: 'Test content, not on the site' }, content.nodes[id]?.label || id)
            : h('a', { href: `/#/${id}` }, content.nodes[id]?.label || id))))
          : h('p', { class: 'lib-doc' }, 'Not used in any topic yet.'),
      ),
      h('div', null,
        h('label', { class: 'micro', for: `json-${type}` }, 'Edit the example'),
        Object.assign(ed.area, { id: `json-${type}` }),
        errors,
      ),
    ),
  );
}

function blocksSections() {
  return categories.map((c) => {
    const entries = Object.entries(blocks).filter(([, s]) => s.category === c.id);
    return section(`cat-${c.id}`, c.label, 'Blocks', h('p', { class: 'lib-p' }, c.doc), entries.map(([t, s]) => blockCard(t, s)));
  });
}

// Composer: a whole topic from blocks. Start from a real topic or the example.
const SAMPLE = [
  { type: 'hero', title: 'An example topic', accentWord: 'example', subtitle: 'Composed from blocks' },
  { type: 'text', content: 'Every topic on the site is a list like this one. Change it and the page below changes.' },
  { type: 'split',
    left: [{ type: 'metric', value: '12', label: 'hours a week of copying' }],
    right: [{ type: 'pills', label: 'Systems', items: ['Email', 'Spreadsheet', 'Invoices'] }] },
  { type: 'flow', layout: 'horizontal', nodes: [{ id: 'a', label: 'Email' }, { id: 'b', label: 'System', variant: 'accent' }, { id: 'c', label: 'Invoice' }], edges: [{ from: 'a', to: 'b', label: 'reads' }, { from: 'b', to: 'c', label: 'writes' }] },
  { type: 'layers', items: [{ label: '1', title: 'Call' }, { label: '2', title: 'Summary' }, { label: '3', title: 'Build' }] },
  { type: 'fact', key: 'firstStep' },
];

// Page layouts: the same functions the site uses (src/layouts.js), on fixtures.
function layoutsSection() {
  const main = fx.nodes.fixture_order_to_invoice;
  const turnStage = h('div', { class: 'lib-stage is-turn is-layout' });
  const renderTurn = () => {
    if (!main) return turnStage.replaceChildren(h('p', { class: 'lib-error' }, 'Fixtures did not load.'));
    const { turn, answer, heading } = turnShell({ n: 1, question: main.label });
    // As on the site: with motion on, the question's words rise into place.
    if (!reducedMotion()) splitWords(heading);
    const label = (c) => c.label || fx.nodes[c.target]?.label || c.target;
    // The side column, as on the site, after one topic. The progress meter is
    // switched off on the site (site.json features); it is shown here.
    const rail = createRail(content, {
      onPick: (id) => ctx.navigate(id),
      onBrief: () => toast('On the site this shows a summary of the visit.'),
      onAll: () => toast('On the site this opens the one-page view.'),
      features: { map: true, depthMeter: true },
    });
    rail.map.visit(main.id);
    rail.count();
    rail.setTrail([main.label], 0);
    rail.setDepth(0);
    const log = h('div', { class: 'log' }, turn);
    turnStage.replaceChildren(h('div', { class: 'session lib-session' }, rail.el, log));
    mount(answer, main.blocks);
    answer.append(chips((main.chips || []).map((c) => ({ ...c, label: label(c) })), (c) => ctx.navigate(c.target)));
  };
  // The landing, from the same generator as index.html, enhanced by the same code.
  const landingStage = h('div', { class: 'lib-stage is-layout is-landing-demo' });
  let landingLens = null;
  const renderLanding = () => {
    const r = renderRegions(config, content);
    landingStage.innerHTML = `<section class="landing" data-landing aria-label="Example of the landing">
      <div class="landing-hero" data-landing-hero>
        <canvas class="lens" data-lens aria-hidden="true"></canvas>
        <div class="landing-inner">${r.landing.join('\n')}</div>
        <figure class="lens-caption" data-lens-caption aria-hidden="true">${r.caption.join('')}</figure>
      </div>
      <div class="landing-steps">${r.steps.join('\n')}</div>
    </section>`;
    // One h1 per page: the library's own title.
    const h1 = landingStage.querySelector('h1');
    if (h1) h1.outerHTML = h1.outerHTML.replace(/^<h1/, '<p role="heading" aria-level="2"').replace(/h1>$/, 'p>');
    landingLens?.pause?.();
    afterMount.push(() => { landingLens = enhanceLanding(landingStage); });
  };
  landingStage.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    toast(`On the site this opens “${a.textContent.replace('→', '').trim()}”.`);
  });
  const pageStage = h('div', { class: 'lib-stage is-layout' });
  const renderPage = () => {
    const page = h('article', { class: 'page lib-page' });
    page.replaceChildren(...onePage({
      content: fx,
      layout: { title: 'Example: everything on one page', intro: 'Built from the fixture topics. On the site this page holds every topic.', sections: ['fixture_order_to_invoice'], appendix: ['fixture_how_it_is_built'] },
      ctx: { ...ctx, navigate: (id) => page.querySelector(`#page-${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
      onBack: () => toast('On the site this goes back to the start.'),
    }));
    pageStage.replaceChildren(page);
  };
  replays.push(renderLanding, renderTurn, renderPage);
  return section('layouts', 'Page layouts', 'Layouts',
    h('p', { class: 'lib-p' }, 'How blocks are assembled into pages. Both are drawn by src/layouts.js, the same code the site uses, with fixture topics as content.'),
    h('article', { class: 'lib-card', id: 'layout-landing' },
      h('h3', { class: 'lib-h3' }, 'Landing'),
      h('p', { class: 'lib-doc' }, md('The first page: the headline with the lens, then one screen each for the examples, the first step and where to start. The markup comes from `src/static.js` (the same text as `index.html`), the movement from `src/landing.js`. The headline screen is full height, as on the site; the three screens after it are shortened. Links here do not navigate.')),
      landingStage),
    h('article', { class: 'lib-card', id: 'layout-turn' },
      h('h3', { class: 'lib-h3' }, 'Conversation'),
      h('p', { class: 'lib-doc' }, md('After a topic is chosen: the side column (topics read, the map, progress, the summary button) and the turn (the topic number, the question as a heading, the answer blocks, then `Next topics`). On narrow screens the side column becomes a strip at the top, with the map behind a button.')),
      turnStage),
    h('article', { class: 'lib-card', id: 'layout-page' },
      h('h3', { class: 'lib-h3' }, 'One-page view'),
      h('p', { class: 'lib-doc' }, md('`#/all`: key facts, contents, each topic with its sub-topics indented under it, then a technical appendix, then the email button.')),
      pageStage),
  );
}

function composerSection() {
  const stage = h('div', { class: 'lib-stage is-turn' });
  const heading = h('h3', { class: 'turn-question' }, 'An example topic');
  const errors = h('ul', { class: 'lib-errors', hidden: true, role: 'status' });
  const ed = editor({ value: pretty(SAMPLE), stage, errors, asList: true });
  replays.push(() => ed.run());
  const open = h('a', { class: 'lib-mini', href: '/#/all', hidden: true }, 'Open on the site');
  const pick = h('select', { class: 'lib-select', id: 'compose-pick', onchange: () => {
    const n = content.nodes[pick.value];
    heading.textContent = n ? n.label : 'An example topic';
    open.hidden = !n || fixtureIds.has(n.id);
    if (n) open.href = `/#/${n.id}`;
    ed.set(pretty(n ? n.blocks : SAMPLE));
  } },
    h('option', { value: '' }, 'Example composition'),
    nodes.filter((n) => n.blocks?.length).sort((a, b) => a.label.localeCompare(b.label)).map((n) => h('option', { value: n.id }, `${n.label} (${n.blocks.length} blocks)`)));

  ed.area.rows = 28;
  return section('compose', 'Compose a topic', 'Composer',
    h('p', { class: 'lib-p' }, 'Load any topic from content/nodes to see how it is built, or edit the example. Blocks are checked against the catalogue as you type. Nothing is saved.'),
    h('div', { class: 'lib-tools' }, h('label', { class: 'micro', for: 'compose-pick' }, 'Start from'), pick, open),
    h('div', { class: 'lib-compose' },
      h('div', { class: 'lib-compose-src' }, h('label', { class: 'micro', for: 'compose-json' }, 'Blocks'), Object.assign(ed.area, { id: 'compose-json' }), errors),
      h('div', { class: 'lib-compose-out' }, h('p', { class: 'turn-index' }, 'Preview'), heading, stage),
    ),
  );
}

// Page ----------------------------------------------------------------------------

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const all = [
  colourSection(), typeSection(), spaceSection(), motionSection(),
  primitivesSection(),
  ...blocksSections(),
  layoutsSection(),
  composerSection(),
];
$('[data-sections]').replaceChildren(...all);
replayAll();

const counts = [
  ['Block types', Object.keys(blocks).length],
  ['Interface pieces', primitives.length],
  ['Topics built from them', nodes.length],
  ['Blocks in those topics', nodes.reduce((n, t) => n + (t.blocks?.length || 0), 0)],
];
$('[data-counts]').replaceChildren(...counts.map(([k, v]) => h('div', { class: 'offer-item' }, h('dt', null, k), h('dd', null, String(v)))));

// Navigation, with the current section marked as you scroll.
const navGroups = [
  ['Foundations', [['colour', 'Colour'], ['type', 'Type'], ['space', 'Space and shape'], ['motion', 'Motion']]],
  ['Primitives', primitives.map((p) => [`prim-${slug(p.name)}`, p.name])],
  ...categories.map((c) => [c.label, Object.entries(blocks).filter(([, s]) => s.category === c.id).map(([t]) => [`block-${t}`, t, true])]),
  ['Layouts', [['layout-landing', 'Landing'], ['layout-turn', 'Conversation'], ['layout-page', 'One-page view']]],
  ['Composer', [['compose', 'Compose a topic']]],
];
$('[data-nav]').replaceChildren(...navGroups.map(([label, items]) => h('div', { class: 'lib-nav-group' },
  h('p', { class: 'micro' }, label),
  h('ul', null, items.map(([id, text, mono]) => h('li', null, h('a', { href: `#${id}`, class: mono ? 'is-mono' : null }, text)))))));

const links = new Map([...document.querySelectorAll('.lib-nav a')].map((a) => [a.hash.slice(1), a]));
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    for (const a of links.values()) a.removeAttribute('aria-current');
    links.get(e.target.id)?.setAttribute('aria-current', 'true');
  }
}, { rootMargin: '-20% 0px -70% 0px' });
for (const id of links.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }

if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

// WCAG relative-luminance contrast of two CSS colours (hex or rgb()).
function contrast(a, b) {
  const lum = (c) => {
    const [r, g, bl] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
function rgb(c) {
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? [...c.slice(1)].map((d) => d + d).join('') : c.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  return (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
}

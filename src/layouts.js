// Page layouts, shared by the site (app.js) and the component library
// (library.js), so the library shows exactly what the site renders.
//
//   turnShell   one conversation turn: index, question heading, answer area
//   chips       "Next topics" under an answer
//   onePage     the one-page view (#/all): facts, contents, topics, appendix
//   createRail  the side column: topics read, map, progress, summary, email

import { h, reducedMotion } from './dom.js';
import { createMap } from './map.js';
import { renderBlock } from './blocks.js';
import { copy, config, site, factText } from './copy.js';

export function turnShell({ n, question, aside = false, quoted = false, technical = false }) {
  const q = h('div', { class: 'turn-q' },
    h('span', { class: 'turn-index' }, h('b', null, `${copy.ui.questionIndex} ${n}`)),
    h('h2', { class: `turn-question${quoted ? ' is-quoted' : ''}`, tabindex: '-1' }, question),
    technical && h('p', { class: 'turn-tag' }, copy.ui.technical),
  );
  const answer = h('div', { class: 'turn-a' });
  const turn = h('article', { class: `turn${aside ? ' is-aside' : ''}`, id: `turn-${n}` }, q, answer);
  return { turn, answer, heading: q.querySelector('.turn-question') };
}

// onChoose(chip, event) is called when a chip is pressed.
export function chips(list, onChoose) {
  return h('nav', { class: 'chips', 'aria-label': copy.ui.next },
    h('span', { class: 'chips-heading micro' }, copy.ui.next),
    list.map((chip, i) =>
      h('button', {
        class: `chip${chip.isEngagement ? ' is-engage' : ''}${chip.primary || chip.target === '_book' ? ' is-primary' : ''}`,
        type: 'button',
        style: { '--i': i },
        onclick: (e) => onChoose?.(chip, e),
      },
        h('span', { class: 'chip-label' }, chip.isEngagement && h('span', { class: 'pulse', 'aria-hidden': 'true' }), chip.label),
        h('span', { class: 'chip-arrow', 'aria-hidden': 'true' }, chip.expand ? '+' : '→'),
      ),
    ),
  );
}

// Everything in order on a single page: the key facts, then the main topics
// (each followed by its sub-topics), then a labelled technical appendix.
// Returns the page's children. ctx.navigate(id) moves to a topic.
export function onePage({ content, layout = config.onePage, ctx, onBack }) {
  const byParent = {};
  for (const [id, p] of Object.entries(content.parents || {})) (byParent[p] ||= []).push(id);
  const main = (layout.sections || []).filter((id) => content.nodes[id]);
  const extra = (layout.appendix || []).filter((id) => content.nodes[id]);
  const listed = new Set([...main, ...extra]);
  const done = new Set();
  // Each topic appears once: listed topics at their own place, others under their parent.
  const section = (id, level) => {
    const node = content.nodes[id];
    if (!node || done.has(id) || (level === 3 && listed.has(id))) return null;
    done.add(id);
    const H = level === 2 ? 'h2' : 'h3';
    const body = h('div', { class: 'page-body' });
    const inner = { ...ctx, headingLevel: level + 1 };
    for (const b of node.blocks) {
      const n = renderBlock(b, inner);
      if (n) { body.append(n); n.onReveal?.(); n.querySelectorAll('*').forEach((c) => c.onReveal?.()); }
    }
    return h('section', { class: `page-section is-l${level}`, id: `page-${id}`, 'aria-labelledby': `page-h-${id}` },
      h(H, { class: 'page-heading', id: `page-h-${id}` }, node.label),
      node.audience === 'technical' && h('p', { class: 'turn-tag' }, copy.ui.technical),
      body,
      level === 2 && (byParent[id] || []).map((c) => section(c, 3)),
    );
  };
  const toc = (ids) => h('ol', { class: 'page-toc-list' }, ids.map((id) => h('li', null, h('a', { href: `#page-${id}`, onclick: (e) => { e.preventDefault(); ctx.navigate(id); } }, content.nodes[id].label))));
  const factKeys = Object.keys(config.facts).filter((k) => factText(k) && !config.facts[k].link);

  // A flat list of nodes for replaceChildren, which does not flatten arrays
  // or drop false: lists are wrapped in elements.
  return [
    h('header', { class: 'page-head' },
      h('h1', { class: 'page-title', id: 'page-title', tabindex: '-1' }, layout.title || copy.ui.allLink),
      layout.intro && h('p', { class: 'page-intro' }, layout.intro),
      renderBlock({ type: 'facts', keys: factKeys }, ctx),
      h('nav', { class: 'page-toc', 'aria-label': 'Contents' },
        h('h2', { class: 'micro' }, 'Contents'), toc(main),
        extra.length && h('h2', { class: 'micro' }, 'Technical appendix'), extra.length && toc(extra)),
    ),
    h('div', { class: 'page-main' }, main.map((id) => section(id, 2))),
    ...(extra.length ? [h('div', { class: 'page-appendix' }, h('h2', { class: 'page-appendix-title' }, 'Technical appendix'), extra.map((id) => section(id, 2)))] : []),
    h('footer', { class: 'page-foot' },
      h('a', { class: 'btn btn-primary', href: `mailto:${site.email}` }, `Email ${site.email}`),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => onBack?.() }, copy.ui.backToStart),
    ),
  ];
}

// The side column of a conversation. Narrow screens show it as a strip, with
// the map in a panel that opens from a button.
//   setTrail(labels, current, onPick)  the topics read, current one marked
//   setDepth(level)                    the progress meter (-1 for none yet)
//   count()                            refresh "N of M read" after map.visit()
export function createRail(content, { onPick, onBrief, onAll, features = config.features } = {}) {
  const trail = h('ol', { class: 'trail', 'data-trail': '' });
  const depthLabel = h('p', { class: 'depth-label', 'data-depth-label': '' });
  const depth = h('div', { class: 'depth', 'data-depth': '' },
    h('div', { class: 'depth-track', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')),
    depthLabel,
  );
  const map = createMap(content, { onPick: (id) => { setMapOpen(false); onPick?.(id); } });
  const mapCount = h('p', { class: 'map-count' });
  const total = Object.keys(content.nodes).length;
  const mapToggle = h('button', { class: 'rail-map-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'rail-map' });
  const brief = h('button', { class: 'rail-brief', type: 'button', 'data-brief': '', onclick: () => onBrief?.() }, 'See a summary of your visit ', h('span', { 'aria-hidden': 'true' }, '→'));
  const mapBlock = h('div', { class: 'rail-block rail-map', id: 'rail-map' }, h('h2', { class: 'rail-heading' }, 'Map'), map.el, mapCount);
  const depthBlock = h('div', { class: 'rail-block' }, h('h2', { class: 'rail-heading' }, 'Progress'), depth);
  const el = h('aside', { class: 'rail', 'aria-label': 'Session' },
    h('div', { class: 'rail-block' }, h('h2', { class: 'rail-heading' }, 'Topics you read'), trail, mapToggle),
    mapBlock,
    depthBlock,
    h('div', { class: 'rail-block rail-actions' },
      brief,
      h('a', { class: 'rail-mail', href: `mailto:${site.email}` }, site.email),
      h('a', { class: 'rail-mail', href: '#/all', onclick: (e) => { e.preventDefault(); onAll?.(); } }, copy.ui.allLink),
    ),
  );

  function setMapOpen(open) {
    el.classList.toggle('is-map-open', open);
    mapToggle.setAttribute('aria-expanded', String(open));
  }
  mapToggle.addEventListener('click', (e) => { e.stopPropagation(); setMapOpen(!el.classList.contains('is-map-open')); });
  document.addEventListener('click', (e) => { if (!e.target.closest?.('.rail-map, .rail-map-toggle')) setMapOpen(false); });

  function count() {
    const seen = new Set(map.route).size;
    mapCount.textContent = `${seen} of ${total} topics read`;
    mapToggle.textContent = `Map: ${seen} of ${total} read`;
  }
  count();

  function setTrail(labels, current, onItem) {
    trail.replaceChildren(...labels.map((label, i) =>
      h('li', { class: 'trail-item' },
        h('button', { class: 'trail-link', type: 'button', onclick: () => onItem?.(i) }, label))));
    markCurrent(current);
  }
  function markCurrent(current) {
    const links = trail.querySelectorAll('.trail-link');
    links.forEach((b, i) => (i === current ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    // On narrow screens the trail is a horizontal strip: keep the marker in view
    // by scrolling the strip itself, never the page.
    const cur = links[current];
    if (cur && trail.scrollWidth > trail.clientWidth) {
      const left = cur.offsetLeft - trail.clientWidth / 2 + cur.offsetWidth / 2;
      trail.scrollTo({ left: Math.max(0, left), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }
  function setDepth(level) {
    depth.dataset.level = String(level);
    depthLabel.textContent = copy.depth[Math.max(0, level)];
  }

  if (!features.map) { mapBlock.hidden = true; mapToggle.hidden = true; }
  if (!features.depthMeter) depthBlock.hidden = true;

  return { el, trail, depth, depthLabel, brief, map, setMapOpen, count, setTrail, markCurrent, setDepth };
}

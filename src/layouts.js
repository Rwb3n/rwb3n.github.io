// Page layouts, shared by the site (app.js) and the component library
// (library.js), so the library shows exactly what the site renders.
//
//   turnShell   one conversation turn: index, question heading, answer area
//   chips       "Next topics" under an answer
//   onePage     the one-page view (#/all): facts, contents, topics, appendix

import { h } from './dom.js';
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

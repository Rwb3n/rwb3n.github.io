// Application controller: wires content, engine and DOM together.

import { h, wait, reducedMotion } from './dom.js';
import { copy, site } from './copy.js';
import { renderBlock } from './blocks.js';
import * as E from './engine.js';

// Delays that make the system feel like it's thinking — short enough not to annoy.
const THINK = { navigate: 320, revisit: 220, expand: 260, l2: 900, l3: 800, engage: 700, brief: 650, book: 450, addToBrief: 600 };

export function createApp(content, root = document) {
  const $ = (sel) => root.querySelector(sel);
  const el = {
    body: document.body,
    landing: $('[data-landing]'),
    session: $('[data-session]'),
    log: $('[data-log]'),
    trail: $('[data-trail]'),
    depth: $('[data-depth]'),
    depthLabel: $('[data-depth-label]'),
    brief: $('[data-brief]'),
    ask: $('[data-ask]'),
    input: $('[data-ask-input]'),
    entry: $('[data-entry]'),
  };

  let session = E.newSession();
  let turns = [];      // { el, label }
  let busy = false;
  let mode = 'landing';
  let current = 0;    // index of the turn in view

  // Landing -------------------------------------------------------------------

  const rootNode = content.nodes[content.root];
  if (rootNode && el.entry) {
    el.entry.replaceChildren(
      ...rootNode.chips.map((chip, i) =>
        h('a', { class: 'entry-item', href: `#/${chip.target}`, onclick: (e) => { e.preventDefault(); choose(chip, { from: e.currentTarget.querySelector('.entry-label') }); } },
          h('span', { class: 'entry-index' }, String(i + 1).padStart(2, '0')),
          h('span', { class: 'entry-label' }, chip.label),
          h('span', { class: 'entry-arrow', 'aria-hidden': 'true' }, chip.expand ? '+' : '→'),
        ),
      ),
    );
  }

  // Leave the landing and open the first turn. Where View Transitions exist,
  // the entry the visitor chose morphs into the turn's heading.
  async function openTurn(question, meta, from) {
    if (mode === 'session') return addTurn(question, meta);
    mode = 'session';
    busy = true;
    el.input.placeholder = copy.ui.placeholderSession;
    const swap = () => {
      el.landing.hidden = true;
      el.session.hidden = false;
      el.body.classList.remove('is-landing');
      el.body.classList.add('is-session');
      window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent('mu:session'));
      return addTurn(question, meta);
    };

    if (!document.startViewTransition || reducedMotion()) {
      el.landing.classList.add('is-leaving');
      await wait(360);
      return swap();
    }

    let t;
    if (from) from.style.viewTransitionName = 'mu-question';
    const vt = document.startViewTransition(() => {
      t = swap();
      if (from) t.heading.style.viewTransitionName = 'mu-question';
    });
    await vt.updateCallbackDone;
    vt.finished.finally(() => {
      t.heading.style.viewTransitionName = '';
      if (from) from.style.viewTransitionName = '';
    });
    return t;
  }

  function reset() {
    session = E.newSession();
    turns = [];
    current = 0;
    busy = false;
    mode = 'landing';
    el.log.replaceChildren();
    el.trail.replaceChildren();
    el.session.hidden = true;
    el.landing.hidden = false;
    el.landing.classList.remove('is-leaving');
    el.body.classList.add('is-landing');
    el.body.classList.remove('is-session');
    el.input.placeholder = copy.ui.placeholder;
    history.replaceState(null, '', location.pathname);
    updateRail();
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('mu:landing'));
  }

  // Turns ---------------------------------------------------------------------

  function spendChips() {
    for (const c of el.log.querySelectorAll('.chips')) c.remove();
  }

  function addTurn(question, { label, aside = false, quoted = true } = {}) {
    spendChips();
    const n = turns.length + 1;
    const q = h('div', { class: 'turn-q' },
      h('span', { class: 'turn-index' }, h('b', null, `${copy.ui.questionIndex}.${String(n).padStart(2, '0')}`)),
      h('h2', { class: `turn-question${quoted ? ' is-quoted' : ''}`, tabindex: '-1' }, question),
    );
    const answer = h('div', { class: 'turn-a' });
    const turn = h('article', { class: `turn${aside ? ' is-aside' : ''}`, id: `turn-${n}` }, q, answer);
    el.log.append(turn);
    turns.push({ el: turn, label: label || question });
    current = turns.length - 1;
    updateRail();
    turnObserver?.observe(turn);
    requestAnimationFrame(() => scrollToTurn(turn));
    return { turn, answer, heading: q.querySelector('.turn-question') };
  }

  async function respond(t, blocks, chips, delay, { focus = false } = {}) {
    busy = true;
    el.ask.classList.add('is-busy');
    const thinking = h('p', { class: 'thinking' },
      h('span', { class: 'thinking-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      copy.ui.thinking,
    );
    t.answer.append(thinking);
    await wait(delay);
    thinking.remove();

    const ctx = { navigate: (target, label) => choose({ target, label }) };
    for (const block of blocks) {
      const node = renderBlock(block, ctx);
      if (!node) continue;
      node.classList.add('reveal');
      t.answer.append(node);
      await reveal(node);
      await wait(pause(block));
    }

    if (chips?.length) t.answer.append(renderChips(chips));
    busy = false;
    el.ask.classList.remove('is-busy');
    if (focus) t.heading.focus({ preventScroll: true });
  }

  function reveal(node) {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        node.classList.add('is-in');
        node.onReveal?.();
        node.querySelectorAll('*').forEach((c) => c.onReveal?.());
        resolve();
      });
    });
  }

  function pause(block) {
    if (block.type === 'text') return Math.min(520, 90 + block.content.split(/\s+/).length * 12);
    if (block.type === 'flow') return 420;
    return 180;
  }

  function renderChips(chips) {
    return h('nav', { class: 'chips', 'aria-label': copy.ui.next },
      h('span', { class: 'chips-heading micro' }, copy.ui.next),
      chips.map((chip) =>
        h('button', {
          class: `chip${chip.isEngagement ? ' is-engage' : ''}${chip.primary || chip.target === '_book' ? ' is-primary' : ''}`,
          type: 'button',
          onclick: () => choose(chip, { focus: true }),
        },
          h('span', { class: 'chip-label' }, chip.isEngagement && h('span', { class: 'pulse', 'aria-hidden': 'true' }), chip.label),
          h('span', { class: 'chip-arrow', 'aria-hidden': 'true' }, chip.expand ? '+' : '→'),
        ),
      ),
    );
  }

  // Navigation ------------------------------------------------------------------

  function choose(chip, opts = {}) {
    if (busy) return;
    if (chip.expand) return expand(chip.target, chip.label, opts);
    return navigate(chip.target, chip.label, opts);
  }

  async function navigate(target, query, opts = {}) {
    if (busy) return;

    if (target === '_engage') {
      const r = E.resolveL3(content, session);
      const t = await openTurn(query || copy.engagement.userTellMore, { label: copy.navigation.engageTrailLabel }, opts.from);
      return respond(t, r.blocks, r.chips, THINK.engage, opts);
    }
    if (target === '_show_brief') {
      const r = E.generateBrief(content, session);
      const t = await openTurn(query || copy.navigation.userShowBrief, { label: 'Brief' }, opts.from);
      return respond(t, r.blocks, r.chips, THINK.brief, opts);
    }
    if (target === '_book') {
      const data = E.briefData(content, session);
      const justSawBrief = turns.at(-1)?.label === 'Brief';
      const t = await openTurn(query || copy.booking.userStart, { label: 'Book' }, opts.from);
      return respond(t,
        [{ type: 'text', content: copy.booking.intro }, !justSawBrief && { type: 'brief', data }, { type: 'compose', data }, { type: 'text', content: copy.booking.after }].filter(Boolean),
        [{ label: copy.chips.backToProjects, target: 'projects' }, { label: copy.chips.startOver, target: 'root' }],
        THINK.book, opts);
    }
    if (target === '_add_context') {
      session = { ...session, selfDisclosed: true };
      updateRail();
      const t = await openTurn(copy.engagement.userAddContext, { label: 'Context' }, opts.from);
      await respond(t, [{ type: 'text', content: copy.engagement.addContextPrompt }], [], 200);
      el.input.focus();
      return;
    }

    const node = content.nodes[target];
    if (!node) return;

    const seen = new Set(session.viewed);
    const revisit = seen.has(target) && target !== content.root;
    session = E.record(session, { nodeId: target, query });

    let chips = E.withParentChip(content, node.chips || [], target, seen);
    chips = E.applyGravity(chips, session, content);
    const t = await openTurn(query || node.label, { label: node.label, quoted: !!query }, opts.from);
    history.replaceState(null, '', target === content.root ? location.pathname : `#/${target}`);
    updateRail();

    if (revisit) {
      const r = E.revisitSuggestions(content, target, seen);
      const merged = [...r.chips, ...chips.filter((c) => !r.chips.some((x) => x.target === c.target))].slice(0, 4);
      return respond(t, [...node.blocks, ...r.blocks], E.applyGravity(merged, session, content), THINK.revisit, opts);
    }
    return respond(t, node.blocks, chips, THINK.navigate, opts);
  }

  async function expand(target, label, opts = {}) {
    const node = content.nodes[target];
    if (!node || busy) return;
    session = { ...session, viewed: [...new Set([...session.viewed, target])] };
    const t = await openTurn(label || node.label, { label: node.label, aside: true }, opts.from);
    updateRail();
    return respond(t, node.blocks, node.chips || [], THINK.expand, opts);
  }

  async function ask(text) {
    const q = text.trim();
    if (!q || busy) return;
    el.input.value = '';
    el.ask.classList.remove('has-value');

    const r = E.route(content.intents, q);
    // Once the visitor is describing their own business, longer messages are
    // context for the brief even if they mention a keyword ("our CRM…").
    const describing = session.selfDisclosed && q.split(/\s+/).length > 3;
    if (r.layer === 1 && !describing) return navigate(r.target, q);

    if (session.selfDisclosed) {
      session = E.record(session, { nodeId: null, query: q, isFreeQuestion: true, isDisclosure: true });
      const t = await openTurn(q, { label: truncate(q) });
      return respond(t, [{ type: 'text', content: copy.engagement.addedToBrief }],
        [{ label: copy.chips.showBrief, target: '_show_brief' }, { label: copy.chips.keepExploring, target: 'projects' }],
        THINK.addToBrief);
    }

    if (r.layer === 3) {
      session = E.record(session, { nodeId: null, query: q, isFreeQuestion: true, isDisclosure: true });
      const t = await openTurn(q, { label: truncate(q) });
      const res = E.resolveL3(content, session);
      return respond(t, res.blocks, res.chips, THINK.l3);
    }

    session = E.record(session, { nodeId: null, query: q, isFreeQuestion: true });
    const t = await openTurn(q, { label: truncate(q) });
    const res = E.resolveL2(q);
    return respond(t, res.blocks, E.applyGravity(res.chips, session, content), THINK.l2);
  }

  // Put a turn's question just under the sticky chrome (bar, and on narrow
  // screens the trail strip).
  function scrollToTurn(turn) {
    const q = turn.querySelector('.turn-q') || turn;
    const bar = document.querySelector('.bar')?.offsetHeight || 0;
    const rail = el.trail.closest('.rail');
    const strip = rail && getComputedStyle(rail).display === 'flex' ? rail.offsetHeight : 0;
    const top = q.getBoundingClientRect().top + window.scrollY - bar - strip - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  // Rail ------------------------------------------------------------------------

  function updateRail() {
    el.trail.replaceChildren(
      ...turns.map((t, i) =>
        h('li', { class: 'trail-item' },
          h('button', {
            class: 'trail-link',
            type: 'button',
            'aria-current': i === current ? 'step' : null,
            onclick: () => scrollToTurn(t.el),
          }, t.label),
        ),
      ),
    );
    const level = E.gravityLevel(session);
    el.depth.dataset.level = String(turns.length ? level : -1);
    el.depthLabel.textContent = turns.length ? copy.depth[level] : copy.depth[0];
    el.trail.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  const turnObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = turns.findIndex((t) => t.el === e.target);
          if (i >= 0 && i !== current) { current = i; updateRail(); }
        }
      }, { rootMargin: '-30% 0px -60% 0px' })
    : null;

  // Wiring ----------------------------------------------------------------------

  el.ask.addEventListener('submit', (e) => { e.preventDefault(); ask(el.input.value); });
  el.input.addEventListener('input', () => el.ask.classList.toggle('has-value', el.input.value.trim().length > 0));
  el.brief.addEventListener('click', () => navigate('_show_brief', null, { focus: true }));

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); el.input.focus(); }
    if (e.key === 'Escape' && document.activeElement === el.input) el.input.blur();
  });

  for (const a of document.querySelectorAll('[data-home]')) {
    a.addEventListener('click', (e) => { e.preventDefault(); reset(); });
  }

  el.body.classList.add('is-landing');

  // Deep link: /#/method opens straight into that node.
  const start = location.hash.match(/^#\/([\w-]+)/)?.[1];
  if (start && content.nodes[start] && start !== content.root) navigate(start);

  return { navigate, ask, reset, get session() { return session; } };
}

function truncate(s, n = 28) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

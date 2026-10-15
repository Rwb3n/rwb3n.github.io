// The conversation. Every section is already in the page (src/static.js), in
// reading order; this only decides which are open and in what order.
//
//   - The page opens on the first section. It ends with numbered options:
//     links to other sections, then "Something else". Choosing a section says
//     it back ("You: See examples") and opens it under the turn; the options
//     of earlier turns are spent.
//   - "Something else" opens a field in place, under the options: typed text
//     goes to src/route.js.
//     A description of the visitor's own work opens the intake with their
//     words in it; a question a fact answers gets that fact; words that match
//     a section open it; anything else gets one honest line.
//   - "Show the whole page" puts every section back in order, as without
//     JavaScript. So does /#all. /#<id> opens that section.
//   - Booking (src/book.js) asks for its section with the mu:reveal event.
//
// Nothing here pretends to think: there are no delays.

import { route, nextReplies } from './route.js';
import { reducedMotion } from './dom.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// opts.cfg and opts.pg let the component library run a demo; opts.urls false
// leaves the address bar and the document alone.
export function createTalk(root = document, opts = {}) {
  let cfg = opts.cfg;
  if (!cfg) try { cfg = JSON.parse(root.getElementById('talk-config')?.textContent || 'null'); } catch { cfg = null; }
  const urls = opts.urls !== false;
  const pg = opts.pg || root.querySelector('.pg');
  const ask = pg?.querySelector('[data-ask]');
  const end = pg?.querySelector('[data-end]');
  if (!cfg || !pg) return null;

  const sections = [...pg.querySelectorAll(':scope > .pg-section')];
  const byId = (id) => sections.find((s) => s.id === id);
  const label = (id) => (id === cfg.book ? cfg.bookLink : cfg.sections.find((s) => s.id === id)?.reply || id);
  let open = [];
  let mode = 'talk';

  // New turns go before the end of the conversation; the free-text form waits
  // there, hidden, until "Something else" asks for it.
  const place = (node) => pg.insertBefore(node, end || null);
  function park() {
    if (!ask) return;
    ask.hidden = true;
    if (end) end.prepend(ask); else pg.append(ask);
    for (const b of pg.querySelectorAll('.pg-other[aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
  }
  function openOther(button) {
    if (!ask) return;
    if (button.getAttribute('aria-expanded') === 'true') { park(); button.focus(); return; }
    park();
    button.closest('.pg-replies').after(ask);
    ask.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    ask.querySelector('input')?.focus();
  }
  const enter = (node) => {
    node.classList.remove('is-entering');
    void node.offsetWidth;
    node.classList.add('is-entering');
  };

  function you(text, quoted) {
    const p = document.createElement('p');
    p.className = `pg-you${quoted ? ' is-typed' : ''}`;
    p.innerHTML = `<span class="pg-you-k">${esc(cfg.you)}</span> ${quoted ? `“${esc(text)}”` : esc(text)}`;
    return p;
  }

  function replies(ids) {
    const ul = document.createElement('ul');
    ul.className = 'pg-replies';
    ul.setAttribute('role', 'list');
    ul.innerHTML = ids.map((id) => (id === cfg.book
      ? `<li><a class="pg-book-link" href="#${id}" data-to="${id}">${esc(cfg.bookLink)} <span aria-hidden="true">↓</span></a></li>`
      : `<li><a class="pg-reply" href="#${id}" data-to="${id}">${esc(label(id))} <span aria-hidden="true">↓</span></a></li>`)).join('')
      + (cfg.other ? `<li class="pg-other-li" data-other><button class="pg-reply pg-other" type="button" aria-expanded="false">${esc(cfg.other)}</button></li>` : '');
    return ul;
  }

  // Only the latest turn offers replies, and never to a section already open.
  function tidyReplies() {
    park();
    const turns = [...pg.querySelectorAll(':scope > .is-open, :scope > .pg-turn')];
    turns.forEach((t, i) => {
      for (const ul of t.querySelectorAll(':scope > .pg-replies')) {
        ul.hidden = i !== turns.length - 1;
        for (const li of ul.children) li.hidden = open.includes(li.querySelector('[data-to]')?.dataset.to);
      }
    });
  }

  function focusTurn(node, heading) {
    const target = heading || node;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (urls) node.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function openSection(id, { said, quoted = false, focus = true, stay = false } = {}) {
    const s = byId(id);
    if (!s) return null;
    if (mode === 'all' || open.includes(id)) {
      if (focus) focusTurn(s, s.querySelector('.pg-head, .pg-h1'));
      return s;
    }
    if (said) place(you(said, quoted));
    if (!stay) place(s);
    s.classList.add('is-open');
    open.push(id);
    enter(s);
    tidyReplies();
    if (focus) focusTurn(s, s.querySelector('.pg-head, .pg-h1'));
    if (urls) history.replaceState(null, '', id === cfg.start ? location.pathname + location.search : `#${id}`);
    return s;
  }

  // An answer that is not a section: the visitor's words, one line, replies.
  function answer(said, text, { focus = true } = {}) {
    const turn = document.createElement('div');
    turn.className = 'pg-turn';
    turn.append(you(said, true));
    const p = document.createElement('p');
    p.className = 'pg-answer';
    p.tabIndex = -1;
    p.textContent = text;
    turn.append(p, replies(nextReplies(cfg, open)));
    place(turn);
    enter(turn);
    tidyReplies();
    if (focus) focusTurn(turn, p);
  }

  function describe(text, { focus = true } = {}) {
    if (cfg.intake && byId(cfg.intake)) {
      const s = openSection(cfg.intake, { said: text, quoted: true, focus: false });
      const field = s?.querySelector('textarea, input');
      if (field && !field.value) field.value = text;
      let note = s?.querySelector('.pg-answer');
      if (s && !note) {
        note = document.createElement('p');
        note.className = 'pg-answer';
        s.querySelector('.pg-head')?.after(note);
      }
      if (note) note.textContent = cfg.describe;
      if (s && focus) focusTurn(s, s.querySelector('.pg-head'));
      return;
    }
    answer(text, cfg.describeUnset, { focus });
  }

  function showAll() {
    mode = 'all';
    pg.classList.remove('is-talk');
    for (const n of pg.querySelectorAll(':scope > .pg-you, :scope > .pg-turn')) n.remove();
    for (const s of sections) { place(s); s.classList.remove('is-open', 'is-entering'); }
    park();
    for (const ul of pg.querySelectorAll('.pg-replies, .pg-replies > li')) ul.hidden = false;
    for (const li of pg.querySelectorAll('[data-other]')) li.hidden = true;
    if (end) end.hidden = true;
    if (urls) history.replaceState(null, '', '#all');
    focusTurn(sections[0], sections[0].querySelector('.pg-head, .pg-h1'));
  }

  // Wiring --------------------------------------------------------------------

  // Read before opening the first section, which resets the address.
  const hash = urls ? decodeURIComponent(location.hash.slice(1)) : '';
  pg.classList.add('is-talk');
  for (const li of pg.querySelectorAll('[data-other]')) li.hidden = false;
  if (end) end.hidden = false;
  park();
  openSection(cfg.start, { focus: false, stay: true });

  pg.addEventListener('click', (e) => {
    const other = e.target.closest('.pg-other');
    if (other && mode !== 'all') return openOther(other);
    const a = e.target.closest('a[data-to]');
    if (!a || mode === 'all') return;
    e.preventDefault();
    openSection(a.dataset.to, { said: a.textContent.replace(/[↓→]/g, '').trim() });
  });

  ask?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = ask.querySelector('input');
    const text = input.value.trim();
    const r = route(text, cfg);
    if (!r) return;
    input.value = '';
    park();
    if (r.kind === 'describe') return describe(text);
    // A section already open: go back to it.
    if (r.kind === 'section') return openSection(r.to, { said: text, quoted: true });
    return answer(text, r.text);
  });
  ask?.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const b = pg.querySelector('.pg-other[aria-expanded="true"]');
    park();
    b?.focus();
  });

  pg.querySelector('[data-show-all]')?.addEventListener('click', showAll);
  if (urls) document.addEventListener('mu:reveal', (e) => openSection(e.detail?.id, { said: e.detail?.said, focus: false }));

  // Deep links: /#all is the whole page; /#<id> opens that section.
  const follow = (h) => {
    if (h === 'all') { if (mode !== 'all') showAll(); }
    else if (h && h !== cfg.start && byId(h)) openSection(h, { said: label(h) });
  };
  follow(hash);
  if (urls) addEventListener('hashchange', () => follow(decodeURIComponent(location.hash.slice(1))));

  return {
    openSection, showAll, answer, describe, openOther,
    get state() { return { mode, open: [...open] }; },
  };
}

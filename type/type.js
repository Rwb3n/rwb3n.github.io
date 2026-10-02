// Type directions: the same words, set in each direction. Each board sets its
// faces as CSS variables and may add its own treatment (a class and an enhance
// step); the sample markup is shared.

const boards = [
  { id: 'current', name: 'Current', idea: 'What is live now. Calm, safe, readable.',
    vars: { display: "'Zodiak'", dw: 400, accent: "'Zodiak'", aw: 400, text: "'Archivo'", mono: "'JetBrains Mono'", figures: "'Zodiak'", fw: 400, track: '-0.02em' },
    faces: 'Zodiak · Archivo · JetBrains Mono' },
  { id: 'xray', name: '1 · X-ray', idea: 'The site is about looking under the surface, so the type does it. The headline is set hairline-thin; move the pointer over it and a lens shows the same words in heavy weight underneath. This only works because the face is monospaced: every weight has the same width, so the two layers line up letter for letter. The same trick could drive the real landing lens.',
    vars: { display: "'Azeret Mono'", dw: 200, accent: "'Azeret Mono'", aw: 200, text: "'Switzer'", mono: "'Azeret Mono'", figures: "'Azeret Mono'", fw: 200, track: '-0.06em', quote: "'Erode'", qw: 300 },
    faces: 'Azeret Mono variable 200 → 800 · Switzer · Erode italic', enhance: xray },
  { id: 'poster', name: '2 · Poster', idea: 'Say it like a sign on a workshop wall. The claim in ultra-condensed capitals, each line pulled to the full width; then the promise underneath in a light, gentle italic. Loud and quiet in one breath.',
    vars: { display: "'Tanker'", dw: 400, accent: "'Sentient'", aw: 300, text: "'Supreme'", mono: "'JetBrains Mono'", figures: "'Tanker'", fw: 400, track: '0', quote: "'Sentient'", qw: 300 },
    faces: 'Tanker · Sentient light italic · Supreme · JetBrains Mono', enhance: poster },
  { id: 'theatre', name: '3 · Theatre', idea: 'One tall, high-contrast face, and weight is the only emphasis: the words that matter step forward in heavy, the rest stay light. The text is a serif, so long reading feels like a letter rather than a product page.',
    vars: { display: "'Melodrama'", dw: 300, accent: "'Melodrama'", aw: 700, text: "'Sentient'", mono: "'Azeret Mono'", figures: "'Melodrama'", fw: 700, track: '-0.01em', quote: "'Melodrama'", qw: 500 },
    faces: 'Melodrama variable 300 / 700 · Sentient · Azeret Mono', enhance: theatre },
];

const HEAD = 'I <em>find</em> the work your team repeats by hand. Then I build a system that does it.';

const sample = `
  <section class="t-hero">
    <p class="t-eyebrow"><span></span>Business process automation · London</p>
    <div class="t-stage"><h2 class="t-display">${HEAD}</h2></div>
    <a class="t-cue" href="#">Below: examples, the first step, and where to start <span class="t-arrow">↓</span></a>
  </section>
  <div class="t-grid">
    <section>
      <p class="t-micro">What this looks like</p>
      <p class="t-lede">For example: copying data between systems, chasing approvals by email, or making the same report every week.</p>
    </section>
    <section>
      <p class="t-micro">Topic 1</p>
      <h3 class="t-q">How we start</h3>
      <p class="t-body">Every project follows the same five steps, in this order. At first a person checks everything it does. It only runs alone after it has shown that it works.</p>
      <ol class="t-steps"><li><span class="t-num">1</span><b>We talk, and I listen</b><span>You tell me what works and what is difficult.</span></li><li><span class="t-num">2</span><b>I map how the work really happens</b><span>Where time goes, and where the value is.</span></li></ol>
    </section>
    <section>
      <div class="t-figs"><div><b>37</b><span>jobs that run on a timetable</span></div><div><b>~95%</b><span>of problems fixed without me</span></div><div><b>~£36</b><span>a month to run</span></div></div>
      <blockquote class="t-callout">“When the design is simpler, the work is simpler.”</blockquote>
    </section>
    <section>
      <p class="t-micro">Next topics</p>
      <ul class="t-chips"><li>What repeated work costs you <span class="t-arrow">→</span></li><li>How a new system is tested <span class="t-arrow">→</span></li></ul>
      <p class="t-btn">Email the summary <span class="t-arrow">→</span></p>
      <div class="t-node"><span>Order arrives</span><span class="t-arrow">→</span><span class="is-accent">Checked</span><span class="t-arrow">→</span><span>Invoiced</span></div>
      <p class="t-legible">Il1 O0 rn m — I, l, 1 and O, 0 side by side</p>
    </section>
  </div>`;

// X-ray: a heavy copy of the headline sits exactly under the thin one and shows
// through a circular lens. Monospace keeps both layers on the same grid.
function xray(board) {
  const stage = board.querySelector('.t-stage');
  const under = stage.querySelector('.t-display').cloneNode(true);
  under.classList.add('t-under');
  under.setAttribute('aria-hidden', 'true');
  stage.append(under);
  const ring = Object.assign(document.createElement('span'), { className: 't-ring' });
  ring.setAttribute('aria-hidden', 'true');
  stage.append(ring);
  const set = (x, y) => { stage.style.setProperty('--x', `${x}px`); stage.style.setProperty('--y', `${y}px`); };
  const park = () => {
    const s = stage.getBoundingClientRect(), w = stage.querySelector('.t-display em').getBoundingClientRect();
    set(w.left - s.left + w.width / 2, w.top - s.top + w.height / 2);
  };
  stage.addEventListener('pointermove', (e) => { const s = stage.getBoundingClientRect(); set(e.clientX - s.left, e.clientY - s.top); });
  stage.addEventListener('pointerleave', park);
  document.fonts.ready.then(park);
  addEventListener('resize', park);
  park();
}

// Poster: the claim in fixed lines, each scaled to fill the width.
function poster(board) {
  const h = board.querySelector('.t-display');
  h.innerHTML = ['I <em>find</em> the work', 'your team repeats', 'by hand.'].map((l) => `<span class="t-line">${l}</span>`).join('')
    + '<span class="t-then">Then I build a system that does it.</span>';
  const fit = () => {
    const w = h.clientWidth;
    for (const l of h.querySelectorAll('.t-line')) {
      l.style.fontSize = '100px';
      l.style.fontSize = `${Math.floor((100 * w) / l.scrollWidth * 10) / 10}px`;
    }
  };
  document.fonts.ready.then(fit);
  addEventListener('resize', fit);
  fit();
}

// Theatre: the words that matter step forward in weight.
function theatre(board) {
  board.querySelector('.t-display').innerHTML = 'I <em>find</em> the work your team repeats by hand. Then I <em>build a system</em> that does it.';
}

const main = document.querySelector('[data-boards]');
for (const b of boards) {
  const el = document.createElement('article');
  el.className = `t-board t-${b.id}`;
  el.id = b.id;
  for (const [k, v] of Object.entries(b.vars)) el.style.setProperty(`--t-${k}`, v);
  el.innerHTML = `<header class="t-head"><h1>${b.name}</h1><p>${b.idea}</p><p class="t-faces">${b.faces}</p></header>${sample}`;
  main.append(el);
  b.enhance?.(el);
}
// Which of the site's special characters each face lacks: a character is present
// if its width is the same whatever fallback stands behind the face.
const CHARS = '→↓·—–’‘“”£…−×©~%';
async function missing(family, weight) {
  await document.fonts.load(`${weight} 40px ${family}`);
  const ctx = document.createElement('canvas').getContext('2d');
  const w = (ch, fb) => { ctx.font = `${weight} 40px ${family}, ${fb}`; return ctx.measureText(ch).width; };
  if (w('abcxyz', 'monospace') !== w('abcxyz', 'serif')) return null;
  return [...CHARS].filter((ch) => !(w(ch, 'monospace') === w(ch, 'serif') && w(ch, 'serif') === w(ch, 'cursive')));
}
document.fonts.ready.then(async () => {
  for (const b of boards) {
    const v = b.vars, out = [];
    for (const [role, fam, wt] of [['display', v.display, v.dw], ['text', v.text, 400], ['figures', v.figures, v.fw]]) {
      const m = await missing(fam, wt);
      if (!m) out.push(`${role} face did not load`);
      else if (m.length) out.push(`${role} lacks ${m.join(' ')}`);
    }
    const p = Object.assign(document.createElement('p'), { className: 't-missing', textContent: out.length ? `${out.join(' · ')} (arrows are set in the mono face)` : 'Every special character present.' });
    document.getElementById(b.id).querySelector('.t-head').append(p);
  }
});

for (const a of document.querySelectorAll('.t-board a')) a.addEventListener('click', (e) => e.preventDefault());

// Type directions: the same words, set in each direction. Each board sets its
// faces as CSS variables and may add its own treatment (a class and an enhance
// step); the sample markup is shared.

const boards = [
  { id: 'current', name: 'Current', idea: 'What is live now. Calm, safe, readable.',
    vars: { display: "'Zodiak'", dw: 400, accent: "'Zodiak'", aw: 400, text: "'Archivo'", mono: "'JetBrains Mono'", figures: "'Zodiak'", fw: 400, track: '-0.02em' },
    faces: 'Zodiak · Archivo · JetBrains Mono' },
  { id: 'solo', name: '1 · Supreme alone', idea: 'One family does everything. Supreme is lettering engineers have used for a century: straight sides, even strokes. Hierarchy comes only from weight, from hairline to extra bold, and from the slanted cut for the word that matters.',
    vars: { display: "'Supreme'", dw: 150, accent: "'Supreme'", aw: 800, text: "'Supreme'", mono: "'JetBrains Mono'", figures: "'Supreme'", fw: 100, track: '-0.045em' },
    faces: 'Supreme variable 100 → 800 + slanted · JetBrains Mono for code' },
  { id: 'writer', name: '2 · Engineer and writer', idea: 'Two voices. The claim is built: Supreme, heavy and tight. The promise is spoken: a light italic serif, like a note in the margin. Text and labels stay in Supreme, so the serif only appears where a person is talking.',
    vars: { display: "'Supreme'", dw: 800, accent: "'Supreme'", aw: 800, text: "'Supreme'", mono: "'Azeret Mono'", figures: "'Supreme'", fw: 800, track: '-0.05em', quote: "'Sentient'", qw: 300, voice: "'Sentient'" },
    faces: 'Supreme 400 / 800 · Sentient light italic · Azeret Mono', enhance: writer },
  { id: 'drawing', name: '3 · Drawing office', idea: 'The page as an engineering drawing: squared paper, a title block in the corner, the important word marked with a callout, figures given dimension lines. Supreme is the lettering; the notes are in a monospace, as a drafter would write them.',
    vars: { display: "'Supreme'", dw: 250, accent: "'Supreme'", aw: 700, text: "'Supreme'", mono: "'Azeret Mono'", figures: "'Supreme'", fw: 300, track: '-0.04em' },
    faces: 'Supreme 250 / 700 · Azeret Mono for notes', enhance: drawing },
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

// Engineer and writer: the claim and the promise in two voices.
function writer(board) {
  board.querySelector('.t-display').innerHTML = 'I <em>find</em> the work your team repeats by hand. <span class="t-then">Then I build a system that does it.</span>';
}

// Drawing office: a title block in the corner and a callout on the key word.
function drawing(board) {
  const hero = board.querySelector('.t-hero');
  hero.querySelector('.t-display em').insertAdjacentHTML('beforeend', '<span class="t-mark" aria-hidden="true">A</span>');
  hero.querySelector('.t-cue').insertAdjacentHTML('beforebegin', '<p class="t-note"><span class="t-mark">A</span> The repeated work. Found in step 2, by watching how the work really happens.</p>');
  hero.insertAdjacentHTML('beforeend', `<dl class="t-block">${[['Drawing', 'Business process automation'], ['Sheet', '1 of 5'], ['Place', 'London'], ['Scale', '1 : 1']].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`);
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

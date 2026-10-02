// Type directions: the same sample, set in each direction. Each board sets its
// faces as CSS variables; the sample markup is shared.

const boards = [
  { id: 'current', name: 'Current', idea: 'What is live now. Calm, safe, readable.',
    display: "'Zodiak'", dw: 400, accent: "'Zodiak'", aw: 400, text: "'Archivo'", mono: "'JetBrains Mono'", figures: "'Zodiak'", fw: 400, track: '-0.02em',
    faces: 'Zodiak · Archivo · JetBrains Mono' },
  { id: 'a', name: 'A · Surface & depth', idea: 'The landing is "look under the surface". The surface is set flat and wide; the thing that is found cuts through it in a sharp italic serif.',
    display: "'Panchang'", dw: 600, accent: "'Boska'", aw: 500, text: "'Satoshi'", mono: "'Azeret Mono'", figures: "'Panchang'", fw: 700, track: '-0.035em', scale: 0.78,
    faces: 'Panchang 600 · Boska italic · Satoshi · Azeret Mono' },
  { id: 'b', name: 'B · Built', idea: '"Then I build a system that does it." One family in four cuts: stencil for the headline, like stamped parts; serif italic for the word that matters; sans to read; mono for the system.',
    display: "'Bespoke Stencil'", dw: 800, accent: "'Bespoke Serif'", aw: 500, text: "'Bespoke Sans'", mono: "'JetBrains Mono'", figures: "'Bespoke Stencil'", fw: 800, track: '-0.03em', scale: 0.95,
    faces: 'Bespoke Stencil 800 · Bespoke Serif italic · Bespoke Sans · JetBrains Mono' },
  { id: 'c', name: 'C · Broadsheet', idea: 'A serious editorial voice for directors: high-contrast serif set big and tight, a plain grotesque to read, numbers in a hard display cut.',
    display: "'Boska'", dw: 500, accent: "'Boska'", aw: 500, text: "'General Sans'", mono: "'Azeret Mono'", figures: "'Clash Display'", fw: 600, track: '-0.03em', scale: 1.05,
    faces: 'Boska 500 + italic · General Sans · Azeret Mono · Clash Display' },
];

const sample = `
  <section class="t-hero">
    <p class="t-eyebrow"><span></span>Business process automation · London</p>
    <h2 class="t-display">I <em>find</em> the work your team repeats by hand. Then I build a system that does it.</h2>
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

const main = document.querySelector('[data-boards]');
for (const b of boards) {
  const el = document.createElement('article');
  el.className = 't-board';
  el.id = b.id;
  for (const [k, v] of Object.entries({ display: b.display, accent: b.accent, text: b.text, mono: b.mono, figures: b.figures })) el.style.setProperty(`--t-${k}`, v);
  el.style.setProperty('--t-dw', b.dw); el.style.setProperty('--t-aw', b.aw); el.style.setProperty('--t-fw', b.fw);
  el.style.setProperty('--t-track', b.track); el.style.setProperty('--t-scale', b.scale || 1);
  el.innerHTML = `<header class="t-head"><h1>${b.name}</h1><p>${b.idea}</p><p class="t-faces">${b.faces}</p></header>${sample}`;
  main.append(el);
}
for (const a of document.querySelectorAll('.t-board a')) a.addEventListener('click', (e) => e.preventDefault());

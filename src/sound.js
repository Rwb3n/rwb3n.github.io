// Sound, synthesised — no audio files. Off by default; the toggle in the bar
// turns it on and the choice is remembered. Anything can request a sound by
// dispatching `mu:sfx` with a name; nothing plays unless the visitor opted in.
//
//   ping    sonar: a bright sine with a lowpassed echo
//   found   the lock: a two-note chime and a click
//   fix     "then I fix it": a filtered-noise sweep over a rising low tone
//   fly     a question in flight: a soft whoosh
//   tick    an answer block arriving: barely there
//   theme   a small upward blip

const KEY = 'mu-sound';

export function createSound(button) {
  let on = false;
  try { on = localStorage.getItem(KEY) === 'on'; } catch { /* private mode */ }
  let ac = null, master = null, echo = null, lastTick = 0;

  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.2;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp).connect(ac.destination);
    // Echo bus, darkened on every repeat.
    echo = ac.createDelay(1);
    echo.delayTime.value = 0.27;
    const fb = ac.createGain();
    fb.gain.value = 0.34;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    echo.connect(lp).connect(fb).connect(echo);
    lp.connect(master);
  }

  function tone(freq, { at = 0, type = 'sine', attack = 0.006, decay = 0.8, gain = 0.4, glide, send = 0 } = {}) {
    const t = ac.currentTime + at;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + decay);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(master);
    if (send) { const s = ac.createGain(); s.gain.value = send; g.connect(s).connect(echo); }
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  function noise(dur, { at = 0, from = 400, to = 2400, q = 1, gain = 0.2 } = {}) {
    const t = ac.currentTime + at;
    const len = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
  }

  const voices = {
    ping: () => tone(1320, { decay: 1.3, gain: 0.28, glide: 1150, send: 0.6 }),
    'ping-accent': () => tone(1760, { decay: 1.3, gain: 0.26, glide: 1500, send: 0.6 }),
    found: () => {
      tone(2600, { decay: 0.05, gain: 0.08, type: 'triangle' });
      tone(660, { at: 0.02, decay: 0.55, gain: 0.3, send: 0.3 });
      tone(990, { at: 0.1, decay: 0.8, gain: 0.24, send: 0.4 });
    },
    fix: () => {
      noise(1.0, { from: 220, to: 3600, q: 1.4, gain: 0.22 });
      tone(110, { decay: 1.1, gain: 0.2, glide: 220, type: 'triangle' });
      tone(880, { at: 0.9, decay: 0.9, gain: 0.16, send: 0.5 });
    },
    fly: () => noise(0.75, { from: 600, to: 2200, q: 0.9, gain: 0.1 }),
    tick: () => {
      const now = performance.now();
      if (now - lastTick < 70) return;
      lastTick = now;
      tone(2400, { attack: 0.002, decay: 0.045, gain: 0.035 });
    },
    theme: () => tone(520, { decay: 0.3, gain: 0.14, glide: 780 }),
  };

  document.addEventListener('mu:sfx', (e) => {
    if (!on || !ac || ac.state !== 'running') return;
    voices[e.detail]?.();
  });

  // Browsers only allow audio after a gesture: wake the context on the first one.
  const wake = () => { if (on) ensure(); };
  addEventListener('pointerdown', wake, { once: true, capture: true });
  addEventListener('keydown', wake, { once: true, capture: true });

  function render() {
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Sound on — turn off' : 'Sound off — turn on');
    button.title = on ? 'Sound on' : 'Sound off';
  }
  button.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
    render();
    if (on) { ensure(); setTimeout(() => voices.found(), 60); }
  });
  render();
}

export const sfx = (name) => document.dispatchEvent(new CustomEvent('mu:sfx', { detail: name }));

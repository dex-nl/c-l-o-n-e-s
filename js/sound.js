// Geluidjes, gemaakt door de computer zelf (geen geluidsbestanden nodig).
// Op de iPad mag geluid pas na de eerste aanraking, daarom starten we het dan pas.
let ctx = null, master = null, muted = false;

function unlock() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    // Geen geluid in deze browser: dan spelen we gewoon zonder.
  }
}
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
  window.addEventListener(ev, unlock, { capture: true });
}

export function setMuted(yes) {
  muted = yes;
  if (master) master.gain.value = yes ? 0 : 0.5;
}

// Eén toon: frequentie (Hz), begin (seconden vanaf nu), duur, golfvorm, volume, en eventueel glijden naar een andere toon.
function tone(freq, start, dur, type = 'square', vol = 0.15, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// Ruis (voor een "woesj")
function noise(start, dur, vol = 0.2, from = 400, to = 4000) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf;
  f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  // praatwolk: een kort piepje
  blip() { tone(520 + Math.random() * 120, 0, 0.06, 'square', 0.05); },
  // tandwiel gevonden
  ding() { tone(988, 0, 0.18, 'triangle', 0.25); tone(1319, 0.09, 0.35, 'triangle', 0.25); },
  // opdracht klaar: ta-da!
  tada() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, i === 3 ? 0.5 : 0.15, 'square', 0.1)); },
  // de clonemachine gaat aan
  powerUp() { tone(80, 0, 1.2, 'sawtooth', 0.12, 700); noise(0.1, 1.1, 0.12, 200, 3000); this.tada(); },
  // een clone wordt gemaakt
  clone() {
    noise(0, 0.7, 0.25, 300, 6000);
    tone(200, 0, 0.6, 'sawtooth', 0.08, 1600);
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.55 + i * 0.07, 0.2, 'triangle', 0.12));
  },
  // dat kan niet
  nope() { tone(180, 0, 0.15, 'square', 0.1); tone(140, 0.16, 0.25, 'square', 0.1); },
};

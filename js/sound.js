// Geluidjes en muziek, gemaakt door de computer zelf (geen geluidsbestanden nodig).
// Op de iPad mag geluid pas na de eerste aanraking, daarom starten we het dan pas.
let ctx = null, master = null, sfxGain = null, musicGain = null;
let sfxOn = true, musicOn = true;
const MUSIC_VOL = 0.32;

function unlock() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxOn ? 1 : 0;
      sfxGain.connect(master);
      musicGain = ctx.createGain();
      musicGain.gain.value = musicOn ? MUSIC_VOL : 0;
      musicGain.connect(master);
      if (current) startSong(current);
    }
    if (ctx.state !== 'running') ctx.resume(); // ook 'interrupted' (iOS na een telefoontje of app-wissel)
  } catch (e) {
    // Geen geluid in deze browser: dan spelen we gewoon zonder.
  }
}
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
  window.addEventListener(ev, unlock, { capture: true });
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
});

export function setSoundOn(yes) {
  sfxOn = yes;
  if (sfxGain) sfxGain.gain.value = yes ? 1 : 0;
}
export function setMusicOn(yes) {
  musicOn = yes;
  if (musicGain) musicGain.gain.setTargetAtTime(yes ? MUSIC_VOL : 0, ctx.currentTime, 0.1);
}

// Eén toon: frequentie (Hz), begin (seconden vanaf nu of een vaste tijd), duur, golfvorm, volume, en eventueel glijden.
function tone(freq, start, dur, type = 'square', vol = 0.15, slideTo = null, out = null, at = null) {
  if (!ctx) return;
  if (!out && !sfxOn) return;
  const t0 = at ?? ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out || sfxGain);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// Ruis (voor een "woesj", een klap of een tsss)
function noise(start, dur, vol = 0.2, from = 400, to = 4000, out = null, at = null) {
  if (!ctx) return;
  if (!out && !sfxOn) return;
  const t0 = at ?? ctx.currentTime + start;
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
  src.connect(f).connect(g).connect(out || sfxGain);
  src.start(t0);
}

export const sfx = {
  // praatwolk: een piepje per lettergreep (pitch = hoe hoog de stem is)
  voice(pitch = 1) { tone(330 * pitch * (0.9 + Math.random() * 0.25), 0, 0.05, 'square', 0.035); },
  blip() { tone(520 + Math.random() * 120, 0, 0.06, 'square', 0.05); },
  // tandwiel gevonden
  ding() { tone(988, 0, 0.18, 'triangle', 0.25); tone(1319, 0.09, 0.35, 'triangle', 0.25); },
  // opdracht klaar: ta-da!
  tada() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, i === 3 ? 0.5 : 0.15, 'square', 0.1)); },
  // grote fanfare (Superbatterij!)
  fanfare() { [523, 523, 523, 698, 880, 784, 1047].forEach((f, i) => tone(f, [0, 0.12, 0.24, 0.36, 0.6, 0.78, 0.96][i], i === 6 ? 0.8 : 0.16, 'square', 0.1)); },
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
  // zwaard
  swing() { noise(0, 0.14, 0.18, 1800, 600); },
  hit() { tone(220, 0, 0.08, 'square', 0.12, 110); noise(0, 0.08, 0.2, 2000, 800); },
  poof() { noise(0, 0.25, 0.25, 800, 200); tone(600, 0, 0.18, 'triangle', 0.12, 1400); },
  boing(p = 1) { tone(180 * p, 0, 0.25, 'triangle', 0.15, 520 * p); },
  slam() { tone(90, 0, 0.5, 'sine', 0.5, 35); noise(0, 0.5, 0.4, 600, 80); },
  // au!
  hurt() { tone(440, 0, 0.12, 'square', 0.12, 220); tone(330, 0.1, 0.18, 'square', 0.1, 160); },
  // kristal en hartje
  coin() { tone(1568 + Math.random() * 200, 0, 0.08, 'square', 0.06); tone(2093, 0.05, 0.12, 'square', 0.06); },
  heal() { [659, 880, 1175].forEach((f, i) => tone(f, i * 0.06, 0.15, 'triangle', 0.15)); },
  buy() { [784, 988, 1319].forEach((f, i) => tone(f, i * 0.07, 0.12, 'square', 0.08)); },
  click() { tone(900, 0, 0.04, 'square', 0.08); },
  rumble() { noise(0, 1.6, 0.35, 120, 60); tone(55, 0, 1.6, 'sawtooth', 0.08, 40); },
  faint() { [523, 466, 392, 330, 262].forEach((f, i) => tone(f, i * 0.15, 0.2, 'triangle', 0.15)); },
  whoosh() { noise(0, 0.4, 0.15, 300, 2500); },
  bump() { tone(110, 0, 0.12, 'sine', 0.25, 70); noise(0, 0.08, 0.08, 400, 200); }, // zachte bots
  toet() { tone(523, 0, 0.12, 'square', 0.07); tone(523, 0.18, 0.16, 'square', 0.07); }, // vriendelijk toeteren
  bubble() { tone(500, 0, 0.1, 'sine', 0.12, 1100); tone(700, 0.08, 0.12, 'sine', 0.1, 1500); }, // luchtbel
  growl() { tone(120, 0, 0.35, 'sawtooth', 0.06, 90); }, // haai gaat zo sprinten
    slurp() { tone(600, 0, 0.18, 'sine', 0.15, 1200); tone(900, 0.2, 0.15, 'sine', 0.12, 1500); },
};

// ---------- Muziek ----------
// Elk liedje: tempo, akkoorden per maat en een melodie (8 achtste noten per maat).
// '~' = de vorige noot langer laten klinken, '-' = stil.
const SONGS = {
  dorp: {
    bpm: 112, lead: 'square', drums: false,
    chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C'],
    melody: [
      'E5 - G5 - C6 - G5 E5', 'A5 - G5 - E5 - C5 -', 'F5 - A5 - C6 - A5 F5', 'G5 ~ ~ B5 D6 ~ B5 ~',
      'E5 ~ G5 E5 C6 ~ B5 A5', 'A5 ~ E5 ~ C6 ~ A5 ~', 'F5 A5 C6 A5 G5 ~ D5 ~', 'C6 ~ G5 ~ C5 ~ - -',
    ],
  },
  bos: {
    bpm: 120, lead: 'square', drums: true,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'],
    melody: [
      'A4 ~ C5 E5 A5 ~ G5 E5', 'F5 ~ E5 ~ C5 ~ A4 ~', 'G4 C5 E5 G5 ~ E5 C5 ~', 'D5 ~ B4 ~ G4 ~ - -',
      'A4 ~ C5 E5 A5 ~ B5 C6', 'A5 ~ F5 ~ C5 ~ F5 ~', 'G5 ~ D5 ~ B4 ~ D5 ~', 'E5 ~ G#5 ~ B5 ~ - -',
    ],
  },
  grot: {
    bpm: 76, lead: 'triangle', drums: false,
    chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'C', 'A'],
    melody: [
      'D5 ~ ~ ~ - - A4 ~', 'Bb4 ~ ~ ~ - - - -', 'G4 ~ A4 ~ Bb4 ~ D5 ~', 'C#5 ~ ~ ~ - - - -',
      'F5 ~ ~ E5 D5 ~ ~ ~', 'F5 ~ G5 ~ F5 ~ D5 ~', 'E5 ~ ~ ~ C5 ~ ~ ~', 'A4 ~ ~ ~ - - - -',
    ],
  },
  stad: {
    bpm: 126, lead: 'square', drums: true,
    chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'],
    melody: [
      'A5 - C6 - A5 G5 F5 ~', 'G5 - E5 - C5 ~ - -', 'F5 - A5 - D6 ~ C6 A5', 'Bb5 ~ A5 ~ G5 ~ F5 ~',
      'A5 - C6 - F6 ~ E6 D6', 'C6 ~ G5 ~ E5 ~ G5 ~', 'D6 ~ C6 ~ Bb5 ~ D5 ~', 'C5 ~ E5 ~ G5 ~ - -',
    ],
  },
  // De Grote Woestijn: een spannend woestijnliedje (met G# erin klinkt het "woestijnerig")
  woestijn: {
    bpm: 108, lead: 'square', drums: true,
    chords: ['Em', 'F', 'Em', 'Dm', 'E', 'F', 'G', 'E'],
    melody: [
      'E5 F5 G#5 ~ A5 G#5 F5 E5', 'F5 ~ A5 ~ C6 ~ A5 ~', 'E5 F5 G#5 ~ B5 A5 G#5 F5', 'D5 ~ F5 ~ A5 ~ - -',
      'B5 ~ C6 B5 A5 ~ G#5 ~', 'A5 G#5 F5 ~ E5 ~ F5 ~', 'G5 ~ F5 E5 D5 ~ F5 ~', 'E5 ~ G#5 ~ B5 ~ - -',
    ],
  },
  piramide: {
    bpm: 80, lead: 'triangle', drums: false,
    chords: ['Em', 'F', 'Em', 'B', 'Em', 'F', 'Am', 'E'],
    melody: [
      'E5 ~ ~ ~ F5 ~ E5 ~', 'F5 ~ ~ ~ - - A4 ~', 'G5 ~ F5 ~ E5 ~ D5 ~', 'D#5 ~ ~ ~ - - - -',
      'B5 ~ ~ A5 G5 ~ F5 ~', 'F5 ~ ~ ~ E5 ~ ~ ~', 'C5 ~ E5 ~ A5 ~ G#5 ~', 'E5 ~ ~ ~ - - - -',
    ],
  },
  // De Vulkaan: snel en spannend (met Bb erin klinkt het heet en gevaarlijk)
  vulkaan: {
    bpm: 132, lead: 'square', drums: true, busyBass: true,
    chords: ['Dm', 'Eb', 'Dm', 'C', 'Dm', 'Eb', 'F', 'A'],
    melody: [
      'D5 - D5 F5 A5 ~ G5 F5', 'Eb5 ~ G5 ~ Bb5 ~ G5 ~', 'D5 - F5 - A5 - D6 ~', 'C6 ~ A5 ~ G5 ~ E5 ~',
      'F5 - F5 A5 D6 ~ C6 A5', 'Bb5 ~ G5 ~ Eb5 ~ G5 ~', 'A5 ~ F5 ~ C5 ~ F5 ~', 'E5 ~ C#5 ~ A4 ~ - -',
    ],
  },
  // De Onderwaterwereld: zacht en golvend (driekwartsgevoel), een beetje geheimzinnig
  onderwater: {
    bpm: 92, lead: 'triangle', drums: false,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
    melody: [
      'A4 ~ C5 ~ E5 ~ ~ ~', 'F5 ~ E5 ~ C5 ~ ~ ~', 'E5 ~ G5 ~ C6 ~ B5 ~', 'D5 ~ ~ ~ B4 ~ ~ ~',
      'A5 ~ ~ G5 E5 ~ ~ ~', 'F5 ~ A5 ~ C6 ~ A5 ~', 'D5 ~ F5 ~ A5 ~ F5 ~', 'G#5 ~ ~ ~ E5 ~ ~ ~',
    ],
  },
  // De IJswereld: helder en twinkelend (als ijskristallen), met een spannend randje
  ijs: {
    bpm: 104, lead: 'triangle', drums: true,
    chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B'],
    melody: [
      'E6 ~ B5 ~ G5 ~ B5 E6', 'C6 ~ G5 ~ E5 ~ - -', 'D6 ~ B5 ~ G5 ~ D6 ~', 'F#5 ~ A5 ~ D6 ~ - -',
      'G6 ~ E6 ~ B5 ~ E6 ~', 'E6 ~ C6 ~ G5 ~ C6 ~', 'C6 ~ A5 ~ E5 ~ A5 ~', 'B5 ~ D#6 ~ F#6 ~ - -',
    ],
  },
  // Het Spookkasteel: een griezelig-grappig liedje (langzaam, met een wals-gevoel, zoals in een spookhuis op de kermis)
  spook: {
    bpm: 96, lead: 'triangle', drums: true,
    chords: ['Am', 'E', 'Am', 'Dm', 'Am', 'F', 'E', 'Am'],
    melody: [
      'A5 ~ C6 ~ E6 ~ D#6 E6', 'G#5 ~ B5 ~ E6 ~ - -', 'A5 ~ C6 ~ E6 ~ A6 ~', 'F6 ~ D6 ~ A5 ~ - -',
      'E6 ~ C6 ~ A5 ~ C6 E6', 'F6 ~ E6 ~ C6 ~ A5 ~', 'G#5 ~ B5 ~ D6 ~ B5 ~', 'A5 ~ ~ ~ - - - -',
    ],
  },
  baas: {
    bpm: 150, lead: 'square', drums: true, busyBass: true,
    chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B'],
    melody: [
      'E5 - E5 G5 B5 - A5 G5', 'E5 - C5 - E5 G5 - E5', 'F#5 - D5 - F#5 A5 - F#5', 'B4 - D#5 - F#5 - B5 -',
      'E5 - E5 G5 B5 - A5 G5', 'E5 - C5 - E5 G5 - E5', 'F#5 - D5 - F#5 A5 - F#5', 'B5 A5 G5 F#5 D#5 - B4 -',
    ],
  },
};

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = (name) => { const m = name.match(/^([A-G][#b]?)(\d)$/); return 12 * (+m[2] + 1) + NOTE[m[1]]; };
const freq = (n) => 440 * 2 ** ((n - 69) / 12);
function chordNotes(name) {
  const m = name.match(/^([A-G][#b]?)(m?)$/);
  const root = 48 + NOTE[m[1]]; // in octaaf 3
  return [root, root + (m[2] ? 3 : 4), root + 7];
}
// Zet de melodie om naar noten met een lengte
for (const s of Object.values(SONGS)) {
  s.steps = [];
  const tokens = s.melody.join(' ').split(/\s+/);
  tokens.forEach((tk, i) => {
    if (tk === '-' || tk === '~') { s.steps.push(null); return; }
    let len = 1;
    while (tokens[i + len] === '~') len++;
    s.steps.push({ n: midi(tk), len });
  });
  s.chordNotes = s.chords.map(chordNotes);
}

let current = null, step = 0, nextTime = 0, timer = null;

function startSong(id) {
  step = 0;
  nextTime = ctx.currentTime + 0.15;
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setValueAtTime(0, ctx.currentTime);
  musicGain.gain.linearRampToValueAtTime(musicOn ? MUSIC_VOL : 0, ctx.currentTime + 0.8);
  if (!timer) timer = setInterval(tick, 50);
}

export function playMusic(id) {
  if (current === id) return;
  current = id;
  if (ctx) startSong(id);
}

function tick() {
  if (!ctx || !current || ctx.state !== 'running') return;
  const s = SONGS[current], dur = 60 / s.bpm / 2;
  while (nextTime < ctx.currentTime + 0.3) {
    const bar = Math.floor(step / 8) % s.chords.length, beat = step % 8;
    const chord = s.chordNotes[bar];
    // bas
    if (s.busyBass || beat % 2 === 0) {
      const bn = beat >= 4 && beat % 4 === 2 ? chord[2] - 12 : chord[0] - 12;
      tone(freq(bn + 12), 0, dur * 0.9, 'triangle', 0.22, null, musicGain, nextTime);
    }
    // akkoordjes (arpeggio)
    const an = chord[[0, 1, 2, 1][beat % 4]] + 12;
    tone(freq(an), 0, dur * 0.6, 'square', 0.025, null, musicGain, nextTime);
    // melodie
    const st = s.steps[step % s.steps.length];
    if (st) tone(freq(st.n), 0, dur * st.len * 0.95, s.lead, 0.07, null, musicGain, nextTime);
    // drums
    if (s.drums) {
      if (beat % 2 === 1) noise(0, 0.05, 0.08, 7000, 9000, musicGain, nextTime);
      if (beat % 4 === 0) tone(120, 0, 0.12, 'sine', 0.35, 45, musicGain, nextTime);
    }
    nextTime += dur;
    step++;
  }
}

// Alles wat over het 3D-beeld heen ligt: opdracht, hartjes, praatwolk, meldingen, panelen.
import { fmt } from './format.js';
const $ = (id) => document.getElementById(id);

export const ui = {
  dialogOpen: false,
  panelOpen: false,
  _lines: [], _i: 0, _done: null, _toastTimer: 0, _typer: null, _voice: 1,
  onVoice: null, // wordt aangeroepen tijdens het typen (voor het stemmetje)

  setQuest(html) { if ($('quest').innerHTML !== html) $('quest').innerHTML = html; },

  // De grote knop rechts: Praat / Lees / Verder / Zwaard
  setActionBtn(label, ready, pulse) {
    const b = $('talk-btn');
    b.classList.toggle('ready', ready);
    b.classList.toggle('pulse', pulse);
    b.classList.toggle('sword', label === '⚔️');
    b.classList.toggle('long', label.length > 6); // Instappen / Uitstappen
    if (b.textContent !== label) b.textContent = label;
  },

  setCloneBtn(show, label = 'Clone!') {
    const b = $('clone-btn');
    b.classList.toggle('hidden', !show);
    if (b.textContent !== label) b.textContent = label;
  },

  setToggles(sound, music) {
    $('sound-btn').textContent = sound ? '🔊' : '🔇';
    $('music-btn').classList.toggle('off', !music);
  },

  // ---------- Hartjes, kristallen en de baas ----------
  setStats(show, hearts, max, crystals, clones = null) {
    $('stats').classList.toggle('hidden', !show);
    const cc = $('clone-count');
    cc.classList.toggle('hidden', !clones);
    if (clones) {
      const txt = `${clones.n}/${clones.max}`, b = cc.querySelector('b');
      if (b.textContent !== txt) {
        const grew = cc.dataset.max && +cc.dataset.max < clones.max;
        b.textContent = txt;
        cc.dataset.max = clones.max;
        if (grew) { cc.classList.remove('bump'); void cc.offsetWidth; cc.classList.add('bump'); }
      }
    }
    const h = '❤️'.repeat(Math.max(0, hearts)) + '🤍'.repeat(Math.max(0, max - hearts));
    if ($('hearts').textContent !== h) $('hearts').textContent = h;
    const c = `💎 ${fmt(crystals)}`;
    if ($('crystals').textContent !== c) {
      $('crystals').textContent = c;
      $('crystals').classList.remove('bump');
      void $('crystals').offsetWidth;
      $('crystals').classList.add('bump');
    }
  },

  // luchtmeter onder water (frac = 0..1, of null = weg)
  setAir(frac) {
    const el = $('air');
    el.classList.toggle('hidden', frac === null);
    if (frac === null) return;
    $('air-fill').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    el.classList.toggle('low', frac < 0.3);
  },
  // warmte-meter in De IJswereld (frac = 0..1, of null = weg)
  setWarm(frac) {
    const el = $('warm');
    el.classList.toggle('hidden', frac === null);
    if (frac === null) return;
    $('warm-fill').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    el.classList.toggle('low', frac < 0.35);
  },
  setFrost(on) { $('frost').classList.toggle('hidden', !on); },
  setInk(on) { $('ink').classList.toggle('hidden', !on); },

  setBoss(name, frac) {
    $('boss').classList.toggle('hidden', frac === null);
    if (frac === null) return;
    $('boss-name').textContent = name;
    $('boss-fill').style.width = `${Math.max(0, frac) * 100}%`;
  },

  hurtFlash() {
    const h = $('hurt');
    h.classList.remove('on');
    void h.offsetWidth;
    h.classList.add('on');
  },

  // Scherm zwart maken (bij naar een andere zone gaan)
  fade(on) { $('fade').classList.toggle('on', on); },

  zoneTitle(text) {
    const z = $('zone-title');
    z.textContent = text;
    z.classList.remove('show');
    void z.offsetWidth;
    z.classList.add('show');
  },

  toast(text, ms = 2200) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  },

  // ---------- Praatwolk (de tekst wordt letter voor letter getypt) ----------
  showDialog(name, lines, onDone, voice = 1) {
    this._lines = lines; this._i = 0; this._done = onDone; this._voice = voice;
    this.dialogOpen = true;
    $('dialog-name').textContent = name;
    $('dialog').classList.remove('hidden');
    this._type(lines[0]);
  },

  _type(text) {
    clearInterval(this._typer);
    let shown = 0;
    $('dialog-text').textContent = '';
    $('dialog-next').classList.add('wait');
    this._typer = setInterval(() => {
      shown++;
      $('dialog-text').textContent = text.slice(0, shown);
      if (shown % 2 === 1 && /\w/.test(text[shown - 1]) && this.onVoice) this.onVoice(this._voice);
      if (shown >= text.length) this._finishTyping();
    }, 26);
    this._full = text;
  },

  _finishTyping() {
    clearInterval(this._typer);
    this._typer = null;
    $('dialog-text').textContent = this._full;
    $('dialog-next').classList.remove('wait');
  },

  nextLine() {
    if (!this.dialogOpen) return;
    if (this._typer) { this._finishTyping(); return; } // eerst de hele zin laten zien
    this._i++;
    if (this._i >= this._lines.length) {
      this.dialogOpen = false;
      $('dialog').classList.add('hidden');
      const done = this._done; this._done = null;
      if (done) done();
    } else {
      this._type(this._lines[this._i]);
    }
  },

  // ---------- Startscherm ----------
  showStart(hasSave, onStart) {
    document.body.classList.add('title');
    $('start-btn').textContent = hasSave ? '▶ Verder spelen' : '▶ Spelen';
    const go = (e) => {
      e.preventDefault();
      $('start').removeEventListener('pointerup', go);
      $('start').classList.add('gone');
      document.body.classList.remove('title');
      setTimeout(() => $('start').classList.add('hidden'), 700);
      onStart();
    };
    $('start').addEventListener('pointerup', go);
    this._startKey = (e) => { if (!$('start').classList.contains('gone') && ['Enter', ' '].includes(e.key)) go(e); };
    window.addEventListener('keydown', this._startKey);
  },

  // ---------- Panelen (winkel, rugzak, kaart) ----------
  openPanel(title, build, onClose = null) {
    this.panelOpen = true;
    this._onClose = onClose;
    $('panel-title').textContent = title;
    const body = $('panel-body');
    body.innerHTML = '';
    build(body);
    $('panel').classList.remove('hidden');
  },

  refreshPanel(build) {
    const body = $('panel-body');
    body.innerHTML = '';
    build(body);
  },

  closePanel() {
    if (!this.panelOpen) return;
    this.panelOpen = false;
    $('panel').classList.add('hidden');
    const cb = this._onClose; this._onClose = null;
    if (cb) cb();
  },

  showError(text) { const e = $('error'); e.textContent = text; e.classList.remove('hidden'); },
};

// Tik op de praatwolk = verder
$('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); ui.nextLine(); });
$('panel-close').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); ui.closePanel(); });
$('panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') { e.preventDefault(); ui.closePanel(); } });

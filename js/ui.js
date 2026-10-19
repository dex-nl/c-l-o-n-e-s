// Alles wat over het 3D-beeld heen ligt: opdracht, praatwolk, meldingen.
const $ = (id) => document.getElementById(id);

export const ui = {
  dialogOpen: false,
  _lines: [], _i: 0, _done: null, _toastTimer: 0,

  setQuest(html) { const q = $('quest'); if (q.innerHTML !== html) q.innerHTML = html; },

  setTalkReady(ready, label = 'Praat') {
    const b = $('talk-btn');
    b.classList.toggle('ready', ready);
    if (b.textContent !== label) b.textContent = label;
  },

  toast(text, ms = 2200) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  },

  showDialog(name, lines, onDone) {
    this._lines = lines; this._i = 0; this._done = onDone;
    this.dialogOpen = true;
    $('dialog-name').textContent = name;
    $('dialog-text').textContent = lines[0];
    $('dialog').classList.remove('hidden');
  },

  nextLine() {
    if (!this.dialogOpen) return;
    this._i++;
    if (this._i >= this._lines.length) {
      this.dialogOpen = false;
      $('dialog').classList.add('hidden');
      const done = this._done; this._done = null;
      if (done) done();
    } else {
      $('dialog-text').textContent = this._lines[this._i];
    }
  },

  setCloneButton(show, full) {
    const b = $('clone-btn');
    b.classList.toggle('hidden', !show);
    b.classList.toggle('full', !!full);
  },

  setSquadButtons(stay, follow) {
    $('stay-btn').classList.toggle('hidden', !stay);
    $('follow-btn').classList.toggle('hidden', !follow);
  },

  fade(on) { $('fade').classList.toggle('on', on); },

  setCloneCount(show, n, max, mapPieces = 0) {
    const c = $('clone-count');
    c.classList.toggle('hidden', !show);
    const text = `👥 Clones: ${n}/${max}` + (mapPieces ? ` · 🗺️ ${mapPieces}` : '');
    if (c.textContent !== text) c.textContent = text;
  },

  flash() {
    const f = $('flash');
    f.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
  },

  hideTitle() { $('title').classList.add('gone'); },

  showError(text) { const e = $('error'); e.textContent = text; e.classList.remove('hidden'); },
};

// Tik op de praatwolk = verder
$('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); ui.nextLine(); });

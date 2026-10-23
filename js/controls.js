// Besturing: joystick + Praat- en Clone-knop op het scherm (iPad) en toetsenbord (laptop).
const JOY_RADIUS = 60;

export class Controls {
  constructor({ canvas, base, knob, talkBtn, cloneBtn, onAction, onClone, onTap, onKey }) {
    this.keys = new Set();
    this.joy = { id: null, x: 0, y: 0, sx: 0, sy: 0, startT: 0, moved: 0 };
    this.taps = new Map();
    this.base = base; this.knob = knob;
    this.onAction = onAction; this.onClone = onClone; this.onTap = onTap;
    this.flyMode = false;          // aan als je in de vliegende auto zit
    this.swimMode = false;         // aan als je onder water zwemt (R = omhoog, F of Shift = omlaag)
    this.flyBtn = { up: false, down: false };

    // Toetsenbord
    window.addEventListener('keydown', (e) => {
      // Typ je in een tekstvakje (de geheime code)? Dan doen de toetsen niks in het spel.
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) { if (e.key === 'Escape') onKey('escape'); return; }
      const k = e.key.toLowerCase();
      // In de Wolkenflitser: spatie = omhoog, Shift = omlaag (uitstappen/landen blijft E of Enter)
      if (this.flyMode && (k === ' ' || k === 'shift')) { this.keys.add(k); e.preventDefault(); return; }
      if (['e', ' ', 'enter'].includes(k)) { if (!e.repeat) this.onAction(); e.preventDefault(); return; }
      if (k === 'c') { if (!e.repeat) this.onClone(); return; }
      if (k === 'r' && this.flyMode) { if (!e.repeat) onKey('r'); e.preventDefault(); return; } // boost
      if (k === 'f' && this.flyMode) { if (!e.repeat) onKey('f'); e.preventDefault(); return; } // kickflip
      if (['m', 'b', 'i', 'h', 'escape'].includes(k)) { if (!e.repeat) onKey(k); return; }
      this.keys.add(k);
      if (k.startsWith('arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    // Joystick: druk ergens op de linkerhelft van het scherm
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.clientX < window.innerWidth * 0.5 && this.joy.id === null) {
        this.joy = { id: e.pointerId, x: 0, y: 0, sx: e.clientX, sy: e.clientY, startT: performance.now(), moved: 0 };
        this.placeBase(e.clientX, e.clientY);
        base.classList.add('active');
      } else {
        this.taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.sx, dy = e.clientY - this.joy.sy;
      const d = Math.hypot(dx, dy);
      this.joy.moved = Math.max(this.joy.moved, d);
      if (d > JOY_RADIUS) { dx *= JOY_RADIUS / d; dy *= JOY_RADIUS / d; }
      this.joy.x = dx / JOY_RADIUS;
      this.joy.y = -dy / JOY_RADIUS;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e) => {
      if (e.pointerId === this.joy.id) {
        const quick = performance.now() - this.joy.startT < 350 && this.joy.moved < 12;
        this.joy = { id: null, x: 0, y: 0 };
        knob.style.transform = '';
        base.style.left = base.style.top = base.style.bottom = '';
        base.classList.remove('active');
        if (quick && e.type === 'pointerup') this.onTap(e.clientX, e.clientY);
      } else if (this.taps.has(e.pointerId)) {
        const t = this.taps.get(e.pointerId);
        this.taps.delete(e.pointerId);
        if (e.type === 'pointerup' && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 15) this.onTap(e.clientX, e.clientY);
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    // Praat-knop
    talkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.onAction(); });
    // Clone-knop
    cloneBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.onClone(); });

    // Geen inzoomen, scrollen of terugveren op de iPad
    const stop = (e) => e.preventDefault();
    document.addEventListener('gesturestart', stop, { passive: false });
    document.addEventListener('gesturechange', stop, { passive: false });
    document.addEventListener('touchmove', (e) => { if (!e.target.closest?.('#panel-box')) e.preventDefault(); }, { passive: false });
    document.addEventListener('dblclick', stop, { passive: false });
    document.addEventListener('contextmenu', stop);
  }

  placeBase(x, y) {
    this.base.style.left = `${x - 75}px`;
    this.base.style.top = `${y - 75}px`;
    this.base.style.bottom = 'auto';
  }

  // Geeft de beweging terug: x = links/rechts, y = vooruit/achteruit (-1..1)
  // Omhoog (1), omlaag (-1) of niks (0) voor de vliegende auto
  get lift() {
    if (this.swimMode && !this.flyMode) {
      const k = this.keys;
      return ((k.has('r') || this.flyBtn.up) ? 1 : 0) - ((k.has('f') || k.has('shift') || this.flyBtn.down) ? 1 : 0);
    }
    if (!this.flyMode) return 0;
    return ((this.keys.has(' ') || this.flyBtn.up) ? 1 : 0) - ((this.keys.has('shift') || this.flyBtn.down) ? 1 : 0);
  }

  // Ingedrukt-houden knoppen voor vliegen (iPad/iPhone)
  holdButton(el, which) {
    const on = (e) => { e.preventDefault(); e.stopPropagation(); this.flyBtn[which] = true; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { this.flyBtn[which] = false; el.classList.remove('down'); };
    el.addEventListener('pointerdown', on);
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get move() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y += 1;
    if (k.has('s') || k.has('arrowdown')) y -= 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    return { x: this.joy.x, y: this.joy.y };
  }
}

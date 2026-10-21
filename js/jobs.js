// De klusjes van Burgemeester Bert in De Stad (wens van Dex). Hier staan de dingen die je ziet:
// Eendje Ed, het pakje, de bril van Opa Duif en de poortjes voor het rondje Grote Stad.
// Wat je moet doen en wat het oplevert staat in quest.js (JOBS). main.js houdt de save bij.
import * as THREE from 'three';
import { mat, box } from './characters.js';
import { LAP_TIME } from './quest.js';
import { RING, ROTONDE } from './citymore.js';

// Waar liggen de dingen?
export const JOB_SPOTS = {
  eend: { x: 29, z: -9.2 },           // Eendje Ed: voor de hoge flats (oost)
  vijver: { x: -32.9, z: 25.2 },      // de vijver in het Stadspark
  pakje: { x: -31.5, z: 12.4 },       // de parkeerplaats (west)
  bril: { x: -31.8, z: -8.7 },        // tussen de hoge flats (west)
};
// Het rondje: START op de lange weg, dan 3 poortjes (in elke volgorde) en weer terug naar de START
const GATES = [
  { id: 'start', x: 6, z: RING.minZ, along: 'x', text: 'START' },
  { id: 'oost', x: RING.maxX, z: 2, along: 'z', text: '1' },
  { id: 'rotonde', x: ROTONDE.x, z: ROTONDE.z, rotonde: true, text: '2' },
  { id: 'west', x: RING.minX, z: 0, along: 'z', text: '3' },
];
const GATE_R = 3.4;

function label(text, bg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  // geblokte vlag-rand
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#1d1d1d' : '#ffffff'; g.fillRect(i * 16, j * 80, 16, 16); }
  g.fillStyle = bg; g.fillRect(0, 16, 256, 64);
  g.fillStyle = '#fff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createJobs(zone) {
  const group = new THREE.Group();
  zone.group.add(group);
  const glowGeo = new THREE.RingGeometry(0.55, 0.8, 20).rotateX(-Math.PI / 2);
  const glow = (color) => new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));

  // ---------- Eendje Ed (met een rood strikje, zodat je hem herkent) ----------
  const duck = new THREE.Group();
  const white = mat(0xffffff);
  duck.add(box(0.5, 0.32, 0.7, white, 0, 0.22, 0), box(0.32, 0.32, 0.32, white, 0, 0.5, 0.26), box(0.16, 0.08, 0.2, mat(0xff8c42), 0, 0.46, 0.48));
  duck.add(box(0.05, 0.07, 0.03, mat(0x1d1d1d), -0.1, 0.56, 0.42), box(0.05, 0.07, 0.03, mat(0x1d1d1d), 0.1, 0.56, 0.42));
  duck.add(box(0.3, 0.1, 0.06, mat(0xe63946), 0, 0.34, 0.43)); // strikje
  for (const sx of [-0.12, 0.12]) duck.add(box(0.1, 0.12, 0.14, mat(0xff8c42), sx, 0.04, 0.05));
  const duckGlow = glow(0xfff3b0); duckGlow.position.y = 0.03; duck.add(duckGlow);
  group.add(duck);
  const duckState = { mode: 'weg', hop: 0, from: null }; // weg | volgt | springt | zwemt

  // ---------- Het pakje ----------
  const parcel = new THREE.Group();
  parcel.add(box(0.7, 0.55, 0.6, mat(0xc68b59), 0, 0.28, 0), box(0.72, 0.1, 0.62, mat(0xe63946), 0, 0.3, 0), box(0.12, 0.57, 0.62, mat(0xe63946), 0, 0.29, 0));
  parcel.add(box(0.3, 0.12, 0.3, mat(0xe63946), 0, 0.6, 0)); // strik
  const parcelGlow = glow(0xffd23f); parcel.add(parcelGlow);
  group.add(parcel);

  // ---------- De bril van Opa Duif ----------
  const specs = new THREE.Group();
  const gold = mat(0xffc300, { metalness: 0.6, emissive: 0x553300 });
  const lensGeo = new THREE.TorusGeometry(0.13, 0.03, 6, 14);
  for (const sx of [-0.17, 0.17]) { const l = new THREE.Mesh(lensGeo, gold); l.position.set(sx, 0.18, 0); specs.add(l); }
  specs.add(box(0.12, 0.03, 0.03, gold, 0, 0.2, 0));
  const specsGlow = glow(0xffffff); specs.add(specsGlow);
  group.add(specs);
  // en een bril op het hoofd van Opa Duif (als hij hem terug heeft)
  const opa = zone.npcs.find((n) => n.id === 'opa');
  const opaSpecs = new THREE.Group();
  opaSpecs.add(box(0.18, 0.12, 0.03, gold, -0.14, 0.03, 0.31), box(0.18, 0.12, 0.03, gold, 0.14, 0.03, 0.31), box(0.12, 0.03, 0.03, gold, 0, 0.05, 0.31));
  opaSpecs.visible = false;
  if (opa) opa.ch.head.add(opaSpecs);

  // ---------- De poortjes van het rondje ----------
  const postGeo = new THREE.BoxGeometry(0.3, 3.4, 0.3);
  const gates = GATES.map((gd) => {
    const g = new THREE.Group();
    const color = gd.id === 'start' ? '#e63946' : '#3a86ff';
    const bannerM = new THREE.MeshBasicMaterial({ map: label(gd.text, color), side: THREE.DoubleSide });
    const postM = mat(0xffffff);
    if (gd.rotonde) {
      // een groot lichtgevend bord boven het eiland, en een gouden ring op de weg
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.1), bannerM); banner.position.y = 5.2; g.add(banner);
      g.userData.spin = banner;
      const ring = new THREE.Mesh(new THREE.RingGeometry(ROTONDE.outer - 0.5, ROTONDE.outer - 0.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 }));
      ring.position.y = 0.07; g.add(ring);
      g.userData.ring = ring;
    } else {
      const w = 4.6;
      for (const s of [-1, 1]) { const p = new THREE.Mesh(postGeo, postM); p.position.set(s * w / 2, 1.7, 0); g.add(p); }
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, 1.0), bannerM); banner.position.y = 3.5; g.add(banner);
      if (gd.along === 'x') g.rotation.y = Math.PI / 2; // je rijdt langs x: het poortje staat dwars
    }
    g.position.set(gd.x, 0, gd.z);
    g.visible = false;
    group.add(g);
    return { ...gd, g, bannerM, postM };
  });
  const lap = { running: false, t: 0, passed: new Set(), leftStart: true, footCd: 0 };
  const resetLap = () => { lap.running = false; lap.t = 0; lap.passed.clear(); paintGates(); };
  function paintGates() {
    for (const gt of gates) {
      const on = gt.id === 'start' ? lap.running && lap.passed.size === 3 : lap.passed.has(gt.id);
      gt.postM.color.set(on ? 0x52b788 : 0xffffff);
      if (gt.g.userData.ring) gt.g.userData.ring.material.color.set(lap.passed.has(gt.id) ? 0x52b788 : 0xffd23f);
    }
  }

  // Zet alles goed neer voor de save (na laden, of als een klusje begint/klaar is)
  let job = null, step = 0;
  function sync(state, player) {
    const j = state.jobs || { done: [], active: null, step: 0 };
    job = j.active; step = j.step;
    const done = (id) => j.done.includes(id);
    // Eendje Ed
    if (done('eend')) { duckState.mode = 'zwemt'; duck.visible = true; }
    else if (job === 'eend') {
      duck.visible = true;
      if (step === 1) { if (duckState.mode !== 'volgt') { duckState.mode = 'volgt'; duck.position.set(player.pos.x + 1, 0, player.pos.z + 1); } }
      else { duckState.mode = 'weg'; duck.position.set(JOB_SPOTS.eend.x, 0, JOB_SPOTS.eend.z); }
    } else duck.visible = false;
    duckGlow.visible = job === 'eend' && step === 0;
    // pakje en bril: op hun plek, of boven je hoofd als je ze bij je hebt
    parcel.visible = job === 'pakje';
    parcelGlow.visible = step === 0;
    if (job === 'pakje' && step === 0) parcel.position.set(JOB_SPOTS.pakje.x, 0, JOB_SPOTS.pakje.z);
    specs.visible = job === 'bril';
    specsGlow.visible = step === 0;
    if (job === 'bril' && step === 0) specs.position.set(JOB_SPOTS.bril.x, 0, JOB_SPOTS.bril.z);
    opaSpecs.visible = done('bril');
    // poortjes
    for (const gt of gates) gt.g.visible = job === 'rondje';
    if (job !== 'rondje') resetLap();
  }

  // Elke frame. ctx = { who (speler of auto), player, driving, toby, opa, onStep(id), onDone(id), toast(text) }
  function update(t, dt, ctx) {
    const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
    const who = ctx.who;
    // Eendje Ed
    if (duck.visible) {
      if (duckState.mode === 'weg') {
        duck.position.y = Math.abs(Math.sin(t * 6)) * 0.06; // waggelen
        duck.rotation.y = Math.sin(t * 1.2) * 1.2;
        duck.rotation.z = Math.sin(t * 12) * 0.08;
        if (job === 'eend' && near(who, duck.position, 1.7)) { duckState.mode = 'volgt'; ctx.onStep('eend'); }
      } else if (duckState.mode === 'volgt') {
        // achter je aan waggelen
        const back = ctx.back;
        const gx = who.x - back.x * 1.4, gz = who.z - back.z * 1.4;
        const dx = gx - duck.position.x, dz = gz - duck.position.z, d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const sp = Math.min(d, Math.max(4.5, d * 3) * dt);
          duck.position.x += (dx / d) * sp; duck.position.z += (dz / d) * sp;
          duck.rotation.y = Math.atan2(dx, dz);
        }
        if (d > 25) duck.position.set(gx, 0, gz); // (is hij te ver achter? dan haalt hij je in)
        duck.position.y = Math.abs(Math.sin(t * 10)) * 0.08;
        duck.rotation.z = Math.sin(t * 14) * 0.1;
        if (job === 'eend' && (near(duck.position, JOB_SPOTS.vijver, 5.2) || near(who, JOB_SPOTS.vijver, 5.2))) { // bij de vijver: plons!
          duckState.mode = 'springt'; duckState.hop = 0; duckState.from = duck.position.clone();
        }
      } else if (duckState.mode === 'springt') {
        duckState.hop = Math.min(1, duckState.hop + dt * 1.6);
        const k = duckState.hop, to = { x: JOB_SPOTS.vijver.x + 0.8, z: JOB_SPOTS.vijver.z };
        duck.position.set(duckState.from.x + (to.x - duckState.from.x) * k, 0.2 + Math.sin(k * Math.PI) * 1.4, duckState.from.z + (to.z - duckState.from.z) * k);
        duck.rotation.z = 0;
        if (k >= 1) { duckState.mode = 'zwemt'; if (job === 'eend') ctx.onDone('eend'); }
      } else {
        // zwemmen met de andere eendjes
        const a = t * 0.5 + 1;
        duck.position.set(JOB_SPOTS.vijver.x + Math.cos(a) * 0.8, 0.18 + Math.sin(t * 3) * 0.03, JOB_SPOTS.vijver.z + Math.sin(a) * 0.8);
        duck.rotation.set(0, -a, 0);
      }
    }
    // dingen die je bij je hebt zweven boven je hoofd
    const overHead = (o) => o.position.set(who.x, (ctx.driving ? 2.7 : 2.35) + Math.sin(t * 3) * 0.08, who.z);
    for (const [o, id, spot, to, r] of [[parcel, 'pakje', JOB_SPOTS.pakje, ctx.toby, 2.6], [specs, 'bril', JOB_SPOTS.bril, ctx.opa, 2.3]]) {
      if (job !== id) continue;
      o.rotation.y = t * 1.5;
      if (step === 0) {
        o.position.y = id === 'bril' ? 0.15 + Math.sin(t * 2.5) * 0.06 : 0;
        if (near(who, spot, 1.6)) ctx.onStep(id);
      } else {
        overHead(o);
        if (to && near(who, to, r)) ctx.onDone(id);
      }
    }
    if (specsGlow.visible) specsGlow.material.opacity = 0.35 + Math.abs(Math.sin(t * 3)) * 0.6; // glinster!
    // Het rondje Grote Stad
    if (job === 'rondje') {
      for (const gt of gates) if (gt.g.userData.spin) gt.g.userData.spin.rotation.y = t * 0.8;
      const start = gates[0];
      const atStart = near(who, start, GATE_R);
      lap.footCd -= dt;
      if (!ctx.driving) {
        if (atStart && lap.footCd <= 0) { ctx.toast('🚗 Dit klusje doe je met de auto! Stap eerst in.'); lap.footCd = 4; }
        if (lap.running) { ctx.toast('🚗 Je bent uitgestapt. Het rondje begint opnieuw bij de START.', 3000); resetLap(); }
        return;
      }
      if (!atStart) lap.leftStart = true;
      if (lap.running) {
        lap.t += dt;
        for (const gt of gates.slice(1)) {
          if (lap.passed.has(gt.id)) continue;
          const hit = gt.rotonde ? near(who, gt, ROTONDE.outer + 0.6) : near(who, gt, GATE_R);
          if (hit) { lap.passed.add(gt.id); paintGates(); ctx.gate(lap.passed.size); }
        }
        if (lap.t > LAP_TIME) { ctx.toast('⏰ De tijd is om! Rij nog eens door de START.', 3500); ctx.fail(); resetLap(); lap.leftStart = false; return; }
        if (atStart && lap.passed.size === 3 && lap.leftStart) { const tt = lap.t; resetLap(); ctx.onDone('rondje', tt); }
      } else if (atStart && lap.leftStart) {
        lap.running = true; lap.t = 0; lap.passed.clear(); lap.leftStart = false; paintGates();
        ctx.toast(`🏁 Start! Rij door de poortjes 1, 2 en 3 en weer terug. Je hebt ${LAP_TIME} seconden!`, 3500);
        ctx.start();
      }
    }
  }

  // Waar moet je heen? (voor de ster op de kaart)
  function target(state, ctx) {
    if (job === 'eend') return step ? JOB_SPOTS.vijver : JOB_SPOTS.eend;
    if (job === 'pakje') return step ? ctx.toby : JOB_SPOTS.pakje;
    if (job === 'bril') return step ? ctx.opa : null; // zoeken!
    if (job === 'rondje') {
      if (!lap.running) return gates[0];
      const left = gates.slice(1).filter((g) => !lap.passed.has(g.id));
      if (!left.length) return gates[0];
      const w = ctx.who;
      return left.reduce((a, b) => (Math.hypot(a.x - w.x, a.z - w.z) < Math.hypot(b.x - w.x, b.z - w.z) ? a : b));
    }
    return null;
  }
  const hud = () => (job === 'rondje' && lap.running ? `⏱️ <b>${Math.ceil(LAP_TIME - lap.t)} s</b> · poortjes <b>${lap.passed.size}/3</b>${lap.passed.size === 3 ? ' · terug naar de <b>START</b>!' : ''}` : null);

  return { group, duck, parcel, specs, opaSpecs, gates, lap, sync, update, target, hud, resetLap, get duckMode() { return duckState.mode; } };
}

// Zelf rijden! Simpele, vergevingsgezinde "arcade"-besturing:
// duw de joystick (of WASD/pijltjes) de kant op waar je heen wilt, en de auto draait die kant op.
// Bots je ergens tegen? Dan stuiter je zachtjes terug. Geen schade, nooit.
import { collide } from './physics.js';
import { makeCarModel, CARS, FLY_CEILING } from './autowinkel.js';

const CAR_H = 1.25; // zo hoog is de auto (voor daken als je vliegt)
const CAR_R = 1.05; // de auto is (voor botsen) een cirkel van deze grootte
const angleDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class MyCar {
  constructor(group, colliders) {
    this.group = group;
    this.colliders = colliders;
    this.id = null;
    this.model = null;
    this.pos = { x: 0, z: 0 };
    this.rot = 0;
    this.speed = 0;
    this.driving = false;
    this.bumpCool = 0;
    this.tilt = 0;
    this.alt = 0;     // hoe hoog je vliegt (alleen de Wolkenflitser)
    this.vy = 0;
    this.landing = false; // aan het landen (bij uitstappen)
    // als de auto geparkeerd staat, kun je er niet doorheen lopen
    this.parkedA = { x: 9999, z: 9999, r: 0.8 };
    this.parkedB = { x: 9999, z: 9999, r: 0.8 };
    colliders.push(this.parkedA, this.parkedB);
  }

  get canFly() { return !!(this.id && CARS[this.id].fly); }
  get flying() { return this.alt > 0.05; }

  get dir() { return { x: Math.sin(this.rot), z: Math.cos(this.rot) }; }

  // Zet een (andere) auto neer op een plek
  place(id, spot) {
    if (this.model) this.group.remove(this.model.g);
    this.id = id;
    this.model = null;
    if (!id) { this.syncParked(); return; }
    this.model = makeCarModel(id);
    this.group.add(this.model.g);
    this.pos = { x: spot.x, z: spot.z };
    this.rot = spot.rot || 0;
    this.speed = 0;
    this.alt = 0; this.vy = 0; this.landing = false;
    this.syncMesh();
    this.syncParked();
  }

  syncMesh() {
    if (!this.model) return;
    this.model.g.position.set(this.pos.x, this.alt, this.pos.z);
    this.model.g.rotation.set(0, this.rot, this.tilt);
  }

  syncParked() {
    const on = this.model && !this.driving;
    const d = this.dir;
    this.parkedA.x = on ? this.pos.x + d.x * 0.7 : 9999; this.parkedA.z = on ? this.pos.z + d.z * 0.7 : 9999;
    this.parkedB.x = on ? this.pos.x - d.x * 0.7 : 9999; this.parkedB.z = on ? this.pos.z - d.z * 0.7 : 9999;
  }

  // Hoe ver is de speler van de auto? (om in te stappen)
  distanceTo(p) { return this.model ? Math.hypot(p.x - this.pos.x, p.z - this.pos.z) : Infinity; }

  setDriving(yes) { this.driving = yes; if (!yes) { this.speed = 0; this.alt = 0; this.vy = 0; this.landing = false; } this.syncParked(); }

  // Vliegen: lift = 1 (omhoog), -1 (omlaag) of 0 (blijven zweven). Geeft de nieuwe hoogte terug.
  fly(dt, lift, zone) {
    if (!this.canFly) { this.alt = 0; return 0; }
    let want = this.landing ? -2.6 : lift * 4.5;
    if (want < 0 && this.alt < 1.6) want *= Math.max(0.3, this.alt / 1.6); // vlak boven de grond: zachtjes landen
    this.vy += (want - this.vy) * Math.min(1, dt * 4);
    const floor = zone ? this.floorAt(zone) : 0;
    const top = zone ? this.roofAt(zone) : FLY_CEILING;
    const old = this.alt;
    this.alt += this.vy * dt;
    if (this.alt >= top) { this.alt = Math.max(Math.min(old, top), Math.min(this.alt, top)); this.vy = Math.min(0, this.vy); }
    // niet door een dak of boom heen zakken: daar blijf je boven zweven
    if (floor > 0 && old >= floor - 0.01 && this.alt < floor) { this.alt = floor; this.vy = Math.max(0, this.vy); }
    if (this.alt <= 0) { this.alt = 0; this.vy = Math.max(0, this.vy); }
    this.blockedBelow = floor > 0 && this.alt <= floor + 0.01;
    return this.alt;
  }

  // Hangt er iets boven je (een dak)? Dan kun je niet hoger dan daaronder.
  roofAt(zone) {
    let top = FLY_CEILING;
    for (const b of zone.airBoxes || []) {
      if (b.low >= this.alt + CAR_H - 0.05 && this.over(b)) top = Math.min(top, b.low - CAR_H);
    }
    return Math.max(0, top);
  }

  over(b) { return Math.abs(this.pos.x - b.x) < b.hw + CAR_R && Math.abs(this.pos.z - b.z) < b.hd + CAR_R; }

  // Hoe hoog is het hoogste ding vlak onder de auto?
  floorAt(zone) {
    let f = 0;
    const R = CAR_R;
    for (const b of zone.airBoxes || []) if (b.h <= this.alt + 0.06 && this.over(b)) f = Math.max(f, b.h + 0.05);
    // Kleine dingen (bankjes, heggen, lantaarns, bomen) duwen je bij het landen gewoon opzij.
    // Alleen echte daken (winkels, huizen) houden je tegen.
    for (const b of zone.boxes) if (!b.off && (b.h ?? 0) >= 3 && Math.abs(this.pos.x - b.x) < b.hw + R && Math.abs(this.pos.z - b.z) < b.hd + R) f = Math.max(f, b.h + 0.05);
    return f;
  }

  // Waar bots je tegenaan als je vliegt? Alleen tegen dingen die hoger zijn dan jij (flats, bomen als je laag vliegt).
  airZone(zone) {
    const tall = (o) => (o.h ?? 1.5) > this.alt;
    const air = (zone.airBoxes || []).filter((b) => this.alt + CAR_H > b.low && this.alt < b.h);
    return { colliders: zone.colliders.filter(tall), boxes: [...zone.boxes.filter(tall), ...air], bounds: zone.bounds };
  }

  // move = { x, y } van de joystick. people = posities van mensen waar je niet doorheen mag.
  // Geeft true terug als je ergens tegenaan botste.
  update(dt, move, zone, people) {
    const c = CARS[this.id];
    const max = this.flying && c.flySpeed ? c.flySpeed : c.speed;
    const len = Math.min(1, Math.hypot(move.x, move.y));
    let want = 0;
    if (len > 0.1) {
      const target = Math.atan2(move.x, -move.y);
      const diff = angleDiff(target, this.rot);
      const turn = 2.8 * dt * (0.5 + 0.5 * Math.min(1, Math.abs(this.speed) / 4));
      this.rot += Math.max(-turn, Math.min(turn, diff));
      // Wil je de andere kant op? Dan eerst afremmen en keren.
      want = max * len * (Math.abs(diff) > 2 ? 0.25 : Math.max(0.3, Math.cos(diff)));
      this.tilt += (-Math.sign(diff) * Math.min(0.08, Math.abs(diff) * 0.05) * (this.speed / max) - this.tilt) * Math.min(1, dt * 6);
    } else this.tilt *= 0.9;
    this.speed += (want - this.speed) * Math.min(1, dt * (want > this.speed ? 1.4 : 3));
    const d = this.dir;
    const before = { x: this.pos.x, z: this.pos.z };
    this.pos.x += d.x * this.speed * dt;
    this.pos.z += d.z * this.speed * dt;
    const goal = { x: this.pos.x, z: this.pos.z };
    collide(this.pos, CAR_R, this.flying ? this.airZone(zone) : zone);
    if (this.flying && this.alt > 1.5) people = []; // hoog in de lucht bots je niet tegen mensen
    // mensen: zachtjes om ze heen / ertegen stoppen
    for (const q of people) {
      const dx = this.pos.x - q.x, dz = this.pos.z - q.z, dd = Math.hypot(dx, dz), min = CAR_R + 0.4;
      if (dd < min && dd > 1e-4) { this.pos.x = q.x + (dx / dd) * min; this.pos.z = q.z + (dz / dd) * min; }
    }
    const pushed = Math.hypot(this.pos.x - goal.x, this.pos.z - goal.z);
    this.bumpCool -= dt;
    let bumped = false;
    if (pushed > 0.02 && Math.abs(this.speed) > 0.5) {
      // zachte bots: snelheid eraf en een klein stukje terug
      this.speed *= -0.25;
      const bx = this.pos.x - before.x, bz = this.pos.z - before.z;
      if (Math.hypot(bx, bz) < 0.01) { this.pos.x -= d.x * 0.05; this.pos.z -= d.z * 0.05; collide(this.pos, CAR_R, this.flying ? this.airZone(zone) : zone); }
      if (this.bumpCool <= 0) { bumped = true; this.bumpCool = 0.5; }
    }
    for (const w of this.model.wheels) w.rotation.x += (this.speed * dt) / 0.32;
    this.syncMesh();
    if (this.flying) this.model.g.position.y = this.alt + Math.sin(performance.now() / 400) * 0.08; // zachtjes zweven
    else this.model.g.position.y = Math.abs(Math.sin(performance.now() / 70)) * 0.02 * Math.min(1, Math.abs(this.speed) / 3);
    this.animateFly(dt);
    return bumped;
  }

  // Vleugeltjes en straalmotoren van de Wolkenflitser
  animateFly(dt) {
    const m = this.model;
    if (!m || !m.wings) return;
    const k = Math.min(1, this.alt / 1.2);
    m.wings.forEach((w, i) => { const s = i ? 1 : -1; w.rotation.z += ((s * 1.35) * (1 - k) - w.rotation.z) * Math.min(1, dt * 5); });
    const t = performance.now() / 1000;
    m.thrusters.forEach((c, i) => { const l = (this.driving ? 0.5 : 0.15) + k * (0.9 + Math.sin(t * 30 + i) * 0.15); c.scale.set(1, l, 1); c.position.y = 0.16 - 0.3 * l; });
    m.glowM.opacity = this.driving ? 0.6 + k * 0.35 : 0.3;
  }
}

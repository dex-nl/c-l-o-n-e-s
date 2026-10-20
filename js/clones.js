// De clones: kopieën van de speler die in een rij achter je aan lopen.
// Sta je even stil? Dan gaan ze dansen! Komen er slijmpjes? Dan vechten ze mee.
import { makeHero, animateWalk, animateSwing, giveSword, setHat, setShirt } from './characters.js';
import { collide } from './physics.js';
import { SWING_TIME } from './player.js';

const SPACING = 1.3;     // afstand tussen de clones in de rij
const TRAIL_STEP = 0.25; // elke 0,25 meter onthouden we waar de speler liep
const SPAWN_TIME = 0.9;  // zo lang duurt het om uit de machine te komen
const DANCE_AFTER = 2;   // na 2 seconden stilstaan gaan de clones dansen
const MIN_GAP = 0.8;     // zo dicht mogen twee clones bij elkaar staan
const RADIUS = 0.4;
const FIGHT_RANGE = 8;   // zo dichtbij moet een slijmpje zijn voordat de clones gaan vechten

// Eerst iets te groot, dan terugveren (voor het verschijnen)
const popIn = (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;

function turn(c, target, dt) {
  let diff = target - c.rot;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  c.rot += diff * Math.min(1, dt * 10);
  c.mesh.rotation.y = c.rot;
}

export class CloneSquad {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.trail = []; // waar de speler liep, nieuwste eerst
    this.idle = 0;
    this.swordLevel = 0;
    this.hat = null;
    this.shirt = null; // kleur van het shirt (uit de Kledingwinkel)
    this.holds = new Map(); // clone -> plek waar hij moet blijven staan (bijvoorbeeld op een drukknop)
  }

  get busy() { return this.list.some((c) => c.spawning > 0); }

  // Alle clones krijgen hetzelfde zwaard en hoedje als de speler
  setGear(swordLevel, hat, shirt = this.shirt) {
    this.swordLevel = swordLevel;
    this.hat = hat;
    this.shirt = shirt;
    for (const c of this.list) { giveSword(c.ch, swordLevel); setHat(c.ch, hat); if (shirt != null) setShirt(c.ch, shirt); }
  }

  makeOne() {
    const ch = makeHero();
    giveSword(ch, this.swordLevel);
    setHat(ch, this.hat);
    if (this.shirt != null) setShirt(ch, this.shirt);
    // Clones gloeien een beetje blauw, zodat je ze herkent
    const mats = new Set();
    ch.group.traverse((o) => { if (o.isMesh) mats.add(o.material); });
    mats.forEach((m) => { if (m.emissive) { m.emissive.set(0x2a8fd8); m.emissiveIntensity = 0.16; } });
    this.scene.add(ch.group);
    const c = { ch, mesh: ch.group, pos: ch.group.position, rot: 0, phase: Math.random() * 6, walk: 0, spawning: 0, swingT: 0, cool: Math.random() * 0.5, target: null };
    this.list.push(c);
    return c;
  }

  // Een nieuwe clone komt uit de machine
  spawn(x, z) {
    const c = this.makeOne();
    c.pos.set(x, 0, z);
    c.spawning = SPAWN_TIME;
    c.ghost = 1.5; // even door de machine heen mogen lopen
    c.mesh.scale.setScalar(0.01);
  }

  // Clones uit een save: zet ze meteen in de rij achter de speler
  restore(n, player) {
    for (let i = 0; i < n; i++) this.makeOne();
    this.regroup(player);
  }

  // Zet alle clones netjes in een rij achter de speler (na het opladen of in een nieuwe zone)
  regroup(player) {
    this.trail = [];
    this.holds.clear();
    const bx = -Math.sin(player.rot), bz = -Math.cos(player.rot);
    for (let d = TRAIL_STEP; d < SPACING * (this.list.length + 2); d += TRAIL_STEP) {
      this.trail.push({ x: player.pos.x + bx * d, z: player.pos.z + bz * d });
    }
    this.list.forEach((c, i) => {
      const p = this.spotInLine(i, player.pos);
      c.pos.set(p.x, 0, p.z);
      c.rot = c.mesh.rotation.y = player.rot;
      c.spawning = 0;
      c.mesh.scale.setScalar(1);
    });
  }

  // Waar hoort clone nummer i te staan? Een stukje terug over het pad van de speler.
  spotInLine(i, from) {
    let want = (i + 1) * SPACING;
    let px = from.x, pz = from.z;
    for (const p of this.trail) {
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d >= want) return { x: px + ((p.x - px) * want) / d, z: pz + ((p.z - pz) * want) / d };
      want -= d; px = p.x; pz = p.z;
    }
    return { x: px, z: pz };
  }

  // Stuur de dichtstbijzijnde vrije clone naar een plek (bijvoorbeeld een drukknop)
  holdNearest(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const c of this.list) {
      if (c.spawning > 0 || this.holds.has(c)) continue;
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) this.holds.set(best, { x, z });
    return !!best;
  }

  clearHolds() { this.holds.clear(); }

  // ctx: { zone, enemies, onHit(enemy, clone) }
  update(t, dt, player, ctx) {
    const pp = player.pos;
    const head = this.trail[0];
    if (!head || Math.hypot(head.x - pp.x, head.z - pp.z) > TRAIL_STEP) {
      this.trail.unshift({ x: pp.x, z: pp.z });
      if (this.trail.length > 200) this.trail.pop();
    }
    this.idle = player.walkAmount > 0.1 ? 0 : this.idle + dt;
    const dancing = this.idle > DANCE_AFTER;
    const enemies = this.swordLevel ? ctx.enemies.filter((e) => !e.dead && Math.hypot(e.pos.x - pp.x, e.pos.z - pp.z) < FIGHT_RANGE + e.r) : [];

    this.list.forEach((c, i) => {
      // Uit de machine komen: groeien, draaien en een sprongetje
      if (c.spawning > 0) {
        c.spawning = Math.max(0, c.spawning - dt);
        const k = 1 - c.spawning / SPAWN_TIME;
        c.mesh.scale.setScalar(Math.max(0.01, popIn(k)));
        c.rot = c.mesh.rotation.y = k * Math.PI * 4;
        c.pos.y = Math.sin(k * Math.PI) * 0.8;
        return;
      }

      // Vechten: zoek het dichtstbijzijnde slijmpje
      let foe = null, foeD = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.pos.x - c.pos.x, e.pos.z - c.pos.z);
        if (d < foeD) { foeD = d; foe = e; }
      }

      let goal;
      if (foe) goal = { x: foe.pos.x - ((foe.pos.x - c.pos.x) / (foeD || 1)) * (foe.r + 0.6), z: foe.pos.z - ((foe.pos.z - c.pos.z) / (foeD || 1)) * (foe.r + 0.6) };
      else goal = this.holds.get(c) || this.spotInLine(i, pp);

      const dx = goal.x - c.pos.x, dz = goal.z - c.pos.z;
      const d = Math.hypot(dx, dz);
      let walking = false;
      if (d > 0.05) {
        const step = Math.min(d, dt * (player.speed + d * 3));
        c.pos.x += (dx / d) * step;
        c.pos.z += (dz / d) * step;
        walking = step > dt * 1.5;
        if (walking) turn(c, Math.atan2(dx, dz), dt);
      }
      c.walk += ((walking ? 1 : 0) - c.walk) * Math.min(1, dt * 8);
      c.phase += dt * (walking ? 11 : 4);
      animateWalk(c.ch, c.phase, c.walk);

      // Zwaard zwaaien als het slijmpje dichtbij is
      c.cool -= dt;
      if (foe && foeD < foe.r + 1.3) {
        turn(c, Math.atan2(foe.pos.x - c.pos.x, foe.pos.z - c.pos.z), dt);
        if (c.cool <= 0 && c.swingT <= 0) { c.swingT = SWING_TIME; c.hitDone = false; c.cool = 0.75 + Math.random() * 0.35; }
      }
      if (c.swingT > 0) {
        c.swingT = Math.max(0, c.swingT - dt);
        const k = 1 - c.swingT / SWING_TIME;
        animateSwing(c.ch, k);
        if (!c.hitDone && k >= 0.45) {
          c.hitDone = true;
          if (foe && Math.hypot(foe.pos.x - c.pos.x, foe.pos.z - c.pos.z) < foe.r + 1.5) ctx.onHit(foe, c);
        }
      }

      // Dansje als de speler stilstaat (en er niks te vechten is)
      if (dancing && !walking && !foe && !this.holds.has(c)) {
        const b = t * 7 + i * 1.3;
        c.pos.y = Math.abs(Math.sin(b)) * 0.35;
        c.ch.arms[0].rotation.x = -Math.PI * 0.85 + Math.sin(b * 2) * 0.35;
        c.ch.arms[1].rotation.x = -Math.PI * 0.85 - Math.sin(b * 2) * 0.35;
        turn(c, Math.atan2(pp.x - c.pos.x, pp.z - c.pos.z) + Math.sin(t * 2 + i) * 0.7, dt);
      } else {
        c.pos.y = Math.max(0, c.pos.y - dt * 3);
      }
    });

    // Clones duwen elkaar een beetje opzij, zodat ze niet in elkaar staan
    for (let a = 0; a < this.list.length; a++) {
      for (let b = a + 1; b < this.list.length; b++) {
        if (this.list[a].spawning > 0 || this.list[b].spawning > 0) continue;
        const p = this.list[a].pos, q = this.list[b].pos;
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
        if (d > 0.001 && d < MIN_GAP) {
          const push = (MIN_GAP - d) / 2;
          p.x -= (dx / d) * push; p.z -= (dz / d) * push;
          q.x += (dx / d) * push; q.z += (dz / d) * push;
        }
      }
    }
    // En niemand loopt door muren
    for (const c of this.list) {
      if (c.ghost > 0) { c.ghost -= dt; continue; }
      if (c.spawning <= 0) collide(c.pos, RADIUS, ctx.zone);
    }
  }
}

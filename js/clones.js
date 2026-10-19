// De clones: kopietjes van de held die je in een rijtje volgen.
// Ze hebben (nog) geen superkrachten, ze lopen gewoon gezellig achter je aan.
import * as THREE from 'three';
import { makeHeroModel, collide, RADIUS } from './player.js';
import { animateWalk } from './characters.js';

export const MAX_CLONES = 5;
const GAP = 1.3;        // afstand tussen twee poppetjes in het rijtje
const SPEED = 7;        // iets sneller dan de speler, zodat ze kunnen bijhouden
const TINT = new THREE.Color(0x5ab0ff);

// Blauwe, een beetje doorzichtige materialen. We maken ze één keer per kleur
// en delen ze tussen alle clones (dat is fijn voor de iPad).
const matCache = new Map();
const RING_GEO = new THREE.RingGeometry(0.5, 0.7, 12).rotateX(-Math.PI / 2);
const RING_MAT = new THREE.MeshBasicMaterial({ color: 0x7dff9b, transparent: true, opacity: 0.85, depthWrite: false });
function cloneMaterial(src) {
  const key = src.color.getHex();
  if (!matCache.has(key)) {
    const m = src.clone();
    m.color.lerp(TINT, 0.45);
    m.emissive = new THREE.Color(0x1a4a8a);
    m.emissiveIntensity = 0.5;
    m.transparent = true;
    m.opacity = 0.78;
    matCache.set(key, m);
  }
  return matCache.get(key);
}

class Clone {
  constructor(scene, x, z) {
    this.ch = makeHeroModel();
    this.ch.group.traverse((o) => { if (o.isMesh) o.material = cloneMaterial(o.material); });
    this.mesh = this.ch.group;
    this.pos = this.mesh.position;
    this.pos.set(x, 0, z);
    this.rot = 0;
    this.phase = Math.random() * 6;
    this.walk = 0;
    this.pop = 0; // groei-animatie als hij net gemaakt is
    this.mesh.scale.setScalar(0.01);
    this.waiting = false;   // true = blijft op zijn plek staan
    this.waitAt = null;     // de plek waar hij wacht
    // Groene ring onder een clone die wacht
    this.ring = new THREE.Mesh(RING_GEO, RING_MAT);
    this.ring.position.y = 0.05; this.ring.visible = false;
    this.mesh.add(this.ring);
    scene.add(this.mesh);
  }
}

export class CloneSquad {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.list = [];
  }

  get count() { return this.list.length; }
  get followingCount() { return this.list.filter((c) => !c.waiting).length; }
  get waitingCount() { return this.list.filter((c) => c.waiting).length; }
  waitingPositions() { return this.list.filter((c) => c.waiting).map((c) => c.pos); }

  // "Blijf": de dichtstbijzijnde clone die volgt, gaat op jouw plek staan wachten.
  // Sta je op een drukknop? Dan gaat hij precies in het midden van de knop staan.
  stay(player, plates = []) {
    let best = null, bestD = Infinity;
    for (const c of this.list) {
      if (c.waiting) continue;
      const d = Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return null;
    let spot = { x: player.pos.x, z: player.pos.z };
    for (const pl of plates) {
      const taken = this.list.some((o) => o.waiting && o.waitAt && Math.hypot(o.waitAt.x - pl.x, o.waitAt.z - pl.z) < 0.3);
      if (!taken && Math.hypot(player.pos.x - pl.x, player.pos.z - pl.z) < pl.r + 0.6) { spot = { x: pl.x, z: pl.z }; break; }
    }
    best.waiting = true;
    best.waitAt = spot;
    best.ring.visible = true;
    return best;
  }

  // "Volg": alle clones komen weer achter je aan.
  followAll() {
    let n = 0;
    for (const c of this.list) { if (c.waiting) n++; c.waiting = false; c.waitAt = null; c.ring.visible = false; }
    return n;
  }

  // Na het wisselen van gebied: iedereen volgt weer, in een rijtje achter je.
  resetAll(player) {
    this.followAll();
    const back = new THREE.Vector3(-Math.sin(player.rot), 0, -Math.cos(player.rot));
    this.list.forEach((c, i) => {
      c.pos.set(player.pos.x + back.x * GAP * (i + 1), 0, player.pos.z + back.z * GAP * (i + 1));
      c.rot = player.rot; c.mesh.rotation.y = player.rot;
      collide(c.pos, this.world);
    });
  }

  add(x, z) {
    if (this.list.length >= MAX_CLONES) return null;
    const c = new Clone(this.scene, x, z);
    collide(c.pos, this.world);
    this.list.push(c);
    return c;
  }

  // Na het laden: zet de clones meteen in een rijtje achter de speler.
  restore(n, player) {
    const back = new THREE.Vector3(-Math.sin(player.rot), 0, -Math.cos(player.rot));
    for (let i = 0; i < Math.min(n, MAX_CLONES); i++) {
      const c = this.add(player.pos.x + back.x * GAP * (i + 1), player.pos.z + back.z * GAP * (i + 1));
      if (c) { c.pop = 1; c.mesh.scale.setScalar(1); c.rot = player.rot; c.mesh.rotation.y = player.rot; }
    }
  }

  update(t, dt, player) {
    let leader = player.pos;
    this.list.forEach((c, i) => {
      // Groeien als hij net uit de machine komt
      if (c.pop < 1) {
        c.pop = Math.min(1, c.pop + dt * 2.5);
        const s = c.pop < 1 ? 1 + Math.sin(c.pop * Math.PI) * 0.25 * (1 - c.pop) : 1;
        c.mesh.scale.setScalar(Math.max(0.01, c.pop * s));
      }

      // Loop achter je voorganger aan (de speler, of de clone voor je).
      // Een clone die wacht, loopt naar zijn wachtplek.
      const goal = c.waiting ? c.waitAt : leader;
      const gap = c.waiting ? 0 : GAP;
      const dx = goal.x - c.pos.x, dz = goal.z - c.pos.z;
      const d = Math.hypot(dx, dz);
      let moved = 0;
      if (c.waiting) {
        if (d > 0.05) {
          const step = Math.min(d, SPEED * 0.8 * dt);
          c.pos.x += (dx / d) * step; c.pos.z += (dz / d) * step;
          moved = step / Math.max(dt, 1e-4);
        }
      } else if (d > 10) {
        // Te ver achter (bijvoorbeeld vast achter een huis): spring naar voren
        c.pos.set(leader.x - (dx / d) * GAP, 0, leader.z - (dz / d) * GAP);
      } else if (d > gap) {
        const step = Math.min(d - gap, SPEED * dt * Math.min(1, (d - gap) * 1.5 + 0.3));
        c.pos.x += (dx / d) * step;
        c.pos.z += (dz / d) * step;
        moved = step / Math.max(dt, 1e-4);
        const target = Math.atan2(dx, dz);
        let diff = target - c.rot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.rot += diff * Math.min(1, dt * 10);
        c.mesh.rotation.y = c.rot;
      }

      // Niet over elkaar heen en niet in de speler
      for (const o of this.list) {
        if (o === c || (c.waiting && !o.waiting)) continue; // wie wacht, laat zich niet wegduwen door volgers
        pushApart(c.pos, o.pos, RADIUS * 2 + 0.1);
      }
      if (!c.waiting) pushApart(c.pos, player.pos, RADIUS * 2 + 0.1);
      collide(c.pos, this.world);

      // Loop-animatie
      const k = Math.min(1, moved / 5);
      c.walk += (k - c.walk) * Math.min(1, dt * 8);
      c.phase += dt * (4 + 7 * c.walk);
      animateWalk(c.ch, c.phase, c.walk);
      if (!c.waiting) leader = c.pos;
    });
  }
}

function pushApart(a, b, min) {
  const dx = a.x - b.x, dz = a.z - b.z;
  const d = Math.hypot(dx, dz);
  if (d < min) {
    if (d < 1e-4) { a.x += 0.05; return; }
    const k = (min - d) * 0.5;
    a.x += (dx / d) * k;
    a.z += (dz / d) * k;
  }
}

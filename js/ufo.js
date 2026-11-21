// De baas van De Ruimtewereld (idee van Dex) is een gevecht in 2 rondes:
//   Ronde 1: UFO UDO, een grote vliegende schotel. Hij zweeft HOOG: spring (🚀) om hem te raken,
//            of wacht tot hij laag komt met zijn trekstraal (dan is hij daarna even moe = makkelijk te raken).
//            - Laserwaaier: rode strepen op de grond, dan lasers. Spring eroverheen of ga opzij!
//            - Trekstraal: een groene lichtbundel trekt je naar hem toe. Ren weg voor hij ZAPT!
//            - Meteorietenregen: oranje rondjes = daar valt een meteoriet.
//            - Bij 2/3 en 1/3 van zijn leven komen er 2 laser-aliens helpen (die geven altijd een hartje).
//   Ronde 2: Is de ufo kapot? Dan klimt ALIEN ASTRO eruit! Hij is snel en slim:
//            - Blaster: hij schiet lasers recht op je af (eerst een korte rode streep).
//            - Flits: een paarse ring onder je... hij teleporteert en stampt! Daarna is hij duizelig (dubbele schade).
//            - Ruimtesprong: hij springt heel hoog (weinig zwaartekracht!) en landt met een schokgolf. SPRING over de golf!
//            - Bij 3/4, 1/2 en 1/4 roept hij een laser-alien.
//   Allebei worden ze boos bij de helft: sneller, meer lasers, en hun klappen doen 2 hartjes pijn.
// Hier staan ook de kleine LASER-ALIENS die overal in de ruimtewereld zweven.
import * as THREE from 'three';
import { mat } from './characters.js';
import { difficulty } from './difficulty.js';

export const LASER_SPEED = 14;
export const LASER_HIT_Y = 1.25; // ben je hoger gesprongen dan dit? Dan vliegt de laser onder je door

// ---------- Lasers (en de rode streep die zegt waar ze komen) ----------
const boltGeo = new THREE.BoxGeometry(0.2, 0.2, 1.2);
const stripGeo = new THREE.PlaneGeometry(0.42, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
export function makeLasers(group, color = 0xff4d6d) {
  const boltM = new THREE.MeshBasicMaterial({ color });
  const bolts = [], strips = [];
  const L = {
    bolts, strips,
    warn(x, z, dx, dz, len = 14, T = 0.8) {
      let s = strips.find((q) => !q.on);
      if (!s) {
        const m = new THREE.Mesh(stripGeo, new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.5, depthWrite: false }));
        group.add(m); s = { m }; strips.push(s);
      }
      s.on = true; s.t = 0; s.T = T;
      s.m.visible = true; s.m.position.set(x, 0.06, z); s.m.rotation.y = Math.atan2(dx, dz); s.m.scale.set(1, 1, len);
      return s;
    },
    fire(x, z, dx, dz, speed = LASER_SPEED, y = 0.9) {
      const l = Math.hypot(dx, dz) || 1;
      let b = bolts.find((q) => !q.on);
      if (!b) {
        const m = new THREE.Mesh(boltGeo, boltM);
        group.add(m); b = { m }; bolts.push(b);
      }
      b.on = true; b.t = 0; b.x = x; b.z = z; b.y = y; b.vx = dx / l * speed; b.vz = dz / l * speed;
      b.m.visible = true; b.m.position.set(x, y, z); b.m.rotation.y = Math.atan2(dx, dz);
      return b;
    },
    update(dt, game) {
      for (const s of strips) {
        if (!s.on) continue;
        s.t += dt;
        s.m.material.opacity = 0.25 + Math.abs(Math.sin(s.t * 16)) * 0.45;
        if (s.t >= s.T) { s.on = false; s.m.visible = false; }
      }
      const p = game?.player?.pos;
      for (const b of bolts) {
        if (!b.on) continue;
        b.t += dt; b.x += b.vx * dt; b.z += b.vz * dt;
        b.m.position.set(b.x, b.y, b.z);
        if (b.t > 1.9) { b.on = false; b.m.visible = false; continue; }
        if (p && Math.hypot(p.x - b.x, p.z - b.z) < 0.75 && (p.y || 0) < LASER_HIT_Y) {
          b.on = false; b.m.visible = false;
          game.hurtPlayer?.(1, b.x - b.vx * 0.05, b.z - b.vz * 0.05, 8);
        }
      }
    },
    clear() { for (const q of [...bolts, ...strips]) { q.on = false; q.m.visible = false; } },
    remove() { for (const q of [...bolts, ...strips]) group.remove(q.m); },
  };
  return L;
}

const keepIn = (o, c, r) => {
  const d = Math.hypot(o.x - c.x, o.z - c.z);
  if (d > r) { o.x = c.x + (o.x - c.x) / d * r; o.z = c.z + (o.z - c.z) / d * r; }
};
// raakt de speler (en niet een clone)? Dan telt hoe hoog de speler gesprongen is
const hitY = (game, fromX, fromZ) => (game?.player && Math.abs(game.player.pos.x - fromX) < 1e-6 && Math.abs(game.player.pos.z - fromZ) < 1e-6 ? (game.player.pos.y || 0) : 0);

// Een klein groen alientje op een zwevend schoteltje
function makeLittleAlien(parent, s = 1, skinColor = 0x94d82d) {
  const skin = mat(skinColor, { flatShading: true }), black = mat(0x111111), white = mat(0xffffff);
  const g = new THREE.Group(); parent.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 0.6 * s, 7), skin); body.position.y = 0.3 * s; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 10, 8), skin); head.scale.set(1.15, 0.95, 1); head.position.y = 0.95 * s; g.add(head);
  for (const sx of [-0.17, 0.17]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 8, 6), black); eye.scale.set(1, 1.35, 0.6); eye.position.set(sx * s, 0.98 * s, 0.34 * s); g.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 5, 4), white); glint.position.set(sx * s + 0.04 * s, 1.04 * s, 0.42 * s); g.add(glint);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.35 * s, 4), skin); ant.position.set(sx * 1.2 * s, 1.45 * s, 0); ant.rotation.z = -sx * 1.5; g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 6, 4), mat(0xffd43b, { emissive: 0xf59f00, emissiveIntensity: 0.8 })); tip.position.set(sx * 1.75 * s, 1.6 * s, 0); g.add(tip);
  }
  return { g, skin };
}

// ================= Laser-alien (gewone vijand) =================
export class LaserAlien {
  constructor(group, x, z, opts = {}) {
    const D = difficulty('ruimte');
    this.D = D;
    this.kind = 'alien'; this.laserAlien = true;
    this.color = 0x94d82d;
    this.hp = this.maxHp = Math.round(4 * D.hp); // level 9 → 18
    this.r = 0.65; this.loot = 4;
    this.group = group;
    this.home = { x: opts.hx ?? x, z: opts.hz ?? z };
    this.homeR = opts.homeR ?? 5;
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0; this.touchCool = 0;
    this.cool = 1.2 + Math.random() * 1.5; this.aim = 0; this.ph = Math.random() * 6;
    this.mesh = new THREE.Group();
    const saucer = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 6), mat(0xadb5bd, { metalness: 0.6, roughness: 0.3 }));
    saucer.scale.y = 0.28; this.mesh.add(saucer);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x74c0fc }));
    glow.position.y = -0.2; this.mesh.add(glow);
    const a = makeLittleAlien(this.mesh, 0.7); a.g.position.y = 0.1;
    this.bodyM = a.skin;
    // laserpistool
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), mat(0x495057)); gun.position.set(0.32, 0.45, 0.3); this.mesh.add(gun);
    this.mesh.position.set(x, 1.1, z);
    this.pos = this.mesh.position;
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    group.add(this.mesh, this.shadow);
    this.lasers = makeLasers(group);
  }
  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= dmg; this.flash = 0.12; this.invuln = 0.15;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = dx / d * 6; this.kz = dz / d * 6;
    this.aim = 0; this.cool = Math.max(this.cool, 0.6); // geraakt: even van slag
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.lasers.clear(); game.onSlimeDefeated(this); }
    return true;
  }
  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.shadow);
    this.lasers.remove();
  }
  update(t, dt, game) {
    if (this.removed) return;
    if (this.dead) {
      this.deadT += dt;
      this.mesh.rotation.y += dt * 12; this.mesh.scale.setScalar(Math.max(0.01, 1 - this.deadT / 0.6));
      if (this.deadT > 0.65) this.remove();
      return;
    }
    const p = game.player.pos;
    this.invuln = Math.max(0, this.invuln - dt); this.flash = Math.max(0, this.flash - dt); this.touchCool = Math.max(0, this.touchCool - dt);
    this.bodyM.emissive.setHex(this.flash > 0 ? 0xffffff : 0x000000); this.bodyM.emissiveIntensity = this.flash > 0 ? 0.6 : 0;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dist = Math.hypot(dx, dz) || 1;
    const active = dist < 15;
    // op afstand blijven en een beetje heen en weer zweven
    if (active && this.aim <= 0) {
      const want = dist - 6.5;
      const side = Math.sin(t * 0.9 + this.ph) * 1.6;
      this.pos.x += (dx / dist * want * 0.8 + (-dz / dist) * side) * dt;
      this.pos.z += (dz / dist * want * 0.8 + (dx / dist) * side) * dt;
    }
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    keepIn(this.pos, this.home, this.homeR);
    this.mesh.rotation.y = Math.atan2(dx, dz);
    this.pos.y = 1.1 + Math.sin(t * 2.5 + this.ph) * 0.15;
    // schieten: eerst mikken (rode streep), dan PIEW
    this.cool -= dt;
    if (active && this.aim <= 0 && this.cool <= 0 && dist < 13) {
      this.aim = 0.75; this.adx = dx / dist; this.adz = dz / dist;
      this.lasers.warn(this.pos.x, this.pos.z, this.adx, this.adz, 14, 0.75);
    }
    if (this.aim > 0) {
      this.aim -= dt;
      if (this.aim <= 0) {
        this.lasers.fire(this.pos.x, this.pos.z, this.adx, this.adz);
        game.sfx?.laser?.();
        this.cool = 2.3 + Math.random() * 0.8;
      }
    }
    if (this.touchCool <= 0 && dist < this.r + 0.5 && (p.y || 0) < 1.5) { game.hurtPlayer?.(1, this.pos.x, this.pos.z, 9); this.touchCool = 1; }
    this.lasers.update(dt, game);
    this.shadow.position.set(this.pos.x, 0.05, this.pos.z);
  }
}

// ================= Ronde 1: Ufo Udo =================
export class Ufo {
  constructor(group, x, z, arena, zone) {
    const D = difficulty('ruimte');
    this.D = D;
    this.ufo = true; this.boss = true;
    this.name = 'Ufo Udo'; this.kind = 'ufo';
    this.color = 0x9775fa;
    this.hp = this.maxHp = Math.round(40 * D.bossHp * 0.6); // level 9 → 120
    this.r = 2.4; this.loot = 20;
    this.group = group; this.arena = arena; this.zone = zone;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0; this.touchCool = 0;
    this.state = 'wait'; this.t = 0; this.cool = 2; this.next = 0;
    this.angry = false; this.summons = [2 / 3, 1 / 3];
    this.speed = 3.2 * D.speed; this.zapDamage = 1;
    this.alt = 4.6; this.highToast = 0;

    // ---------- Mesh: de vliegende schotel ----------
    this.mesh = new THREE.Group();
    this.rig = new THREE.Group(); this.mesh.add(this.rig);
    const metal = mat(0xadb5bd, { metalness: 0.65, roughness: 0.3, flatShading: true });
    this.bodyM = metal;
    const disc = new THREE.Mesh(new THREE.SphereGeometry(2.5, 18, 8), metal); disc.scale.y = 0.3; disc.castShadow = true; this.rig.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.14, 6, 24), mat(0x5f3dc4, { flatShading: true })); rim.rotation.x = Math.PI / 2; this.rig.add(rim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x99e9f2, transparent: true, opacity: 0.45, roughness: 0.1 }));
    dome.position.y = 0.45; this.rig.add(dome);
    // Alien Astro zit al in de koepel (kijk maar!)
    const pilot = makeLittleAlien(this.rig, 0.75, 0x69db7c); pilot.g.position.y = 0.35;
    this.lights = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd43b }));
      l.position.set(Math.cos(a) * 2.1, -0.18, Math.sin(a) * 2.1); this.rig.add(l); this.lights.push(l);
    }
    const belly = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8ce99a }));
    belly.position.y = -0.62; this.rig.add(belly);
    this.mesh.position.set(x, 0, z);
    this.pos = this.mesh.position;
    group.add(this.mesh);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    group.add(this.shadow);
    // trekstraal (groene lichtbundel) + rondje op de grond
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 3.0, 1, 16, 1, true).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: 0x8ce99a, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
    this.beamRing = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x40c057, transparent: true, opacity: 0.8, depthWrite: false }));
    this.beam.visible = this.beamRing.visible = false;
    group.add(this.beam, this.beamRing);
    this.lasers = makeLasers(group);
  }

  inArena(p) { return Math.hypot(p.x - this.arena.x, p.z - this.arena.z) < this.arena.r + 0.3; }
  canHitFrom(y) { return this.alt - y < 2.7; }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    if (dmg < 99 && this.state === 'wait') return false;
    if (dmg < 99 && !this.canHitFrom(hitY(game, fromX, fromZ))) { // te hoog!
      const fromPlayer = game?.player && Math.abs(game.player.pos.x - fromX) < 1e-6 && Math.abs(game.player.pos.z - fromZ) < 1e-6;
      if (fromPlayer && this.highToast <= 0) { this.highToast = 6; game?.onUfoHigh?.(); }
      return false;
    }
    this.hp -= this.state === 'tired' ? dmg * 2 : dmg; // moe na de trekstraal: dubbele schade!
    this.flash = 0.12; this.invuln = 0.16;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = dx / d * 3; this.kz = dz / d * 3;
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0;
      this.beam.visible = this.beamRing.visible = false; this.lasers.clear();
      game.onSlimeDefeated(this);
    }
    return true;
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.shadow, this.beam, this.beamRing);
    this.lasers.remove();
  }

  update(t, dt, game) {
    if (this.removed) return;
    for (let i = 0; i < this.lights.length; i++) this.lights[i].material.color.setHSL(((t * 0.6 + i / 10) % 1), 0.9, 0.6);
    if (this.dead) {
      // neerstorten: draaien, vallen, rook
      this.deadT += dt;
      this.alt = Math.max(0.3, this.alt - dt * 3.5);
      this.mesh.position.y = this.alt;
      this.mesh.rotation.y += dt * 9; this.mesh.rotation.z = Math.sin(this.deadT * 20) * 0.25;
      if (this.deadT > 1.1) this.mesh.scale.setScalar(Math.max(0.01, 1 - (this.deadT - 1.1) / 0.5));
      if (this.deadT > 1.65) this.remove();
      return;
    }
    const p = game.player.pos;
    this.touchCool = Math.max(0, this.touchCool - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.highToast = Math.max(0, this.highToast - dt);
    this.bodyM.emissive.setHex(this.flash > 0 ? 0xffffff : (this.state === 'tired' ? 0x5c940d : 0x000000));
    this.bodyM.emissiveIntensity = this.flash > 0 ? 0.6 : (this.state === 'tired' ? 0.35 + Math.abs(Math.sin(t * 10)) * 0.3 : 0);
    let altGoal = 3.9;

    if (this.state === 'wait') {
      this.alt = 4.6 + Math.sin(t * 1.5) * 0.25;
      this.mesh.position.y = this.alt; this.rig.rotation.y += dt * 0.8;
      this.shadow.position.set(this.pos.x, 0.05, this.pos.z);
      if (this.inArena(p)) { this.state = 'idle'; this.t = 0; this.cool = 1.4; }
      return;
    }

    if (!this.angry && this.hp <= this.maxHp * 0.5) {
      this.angry = true; this.zapDamage = this.D.bossDamage; this.speed *= 1.25;
      game?.onBossPhase?.(this, '🛸 Ufo Udo wordt boos! Meer lasers en een sterkere trekstraal!');
    }
    while (this.summons.length && this.hp <= this.maxHp * this.summons[0]) {
      this.summons.shift();
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const e = new LaserAlien(this.group, this.arena.x + Math.cos(a) * 6, this.arena.z + Math.sin(a) * 6, { hx: this.arena.x, hz: this.arena.z, homeR: this.arena.r - 1.5 });
        e.helper = true;
        game?.addEnemy?.(e);
      }
      game?.onBossPhase?.(this, '👽 Ufo Udo roept laser-aliens!');
    }

    this.cool = Math.max(0, this.cool - dt);
    this.t += dt;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dist = Math.hypot(dx, dz) || 1;

    if (this.state === 'idle') {
      // zweven, een beetje naast de speler
      const a = t * 0.7;
      const gx = p.x + Math.cos(a) * 4, gz = p.z + Math.sin(a) * 4;
      const ex = gx - this.pos.x, ez = gz - this.pos.z, ed = Math.hypot(ex, ez) || 1;
      if (ed > 0.3) { const s = Math.min(ed, this.speed * dt); this.pos.x += ex / ed * s; this.pos.z += ez / ed * s; }
      if (this.cool <= 0) {
        const pick = this.next % 3; this.next++;
        this.t = 0;
        if (pick === 0) {
          this.state = 'laser';
          const n = this.angry ? 5 : 3, base = Math.atan2(dx, dz);
          this.dirs = [];
          for (let i = 0; i < n; i++) { const an = base + (i - (n - 1) / 2) * 0.34; this.dirs.push([Math.sin(an), Math.cos(an)]); }
          for (const [ux, uz] of this.dirs) this.lasers.warn(this.pos.x, this.pos.z, ux, uz, 16, 0.9);
        } else if (pick === 1) { this.state = 'beam'; this.zapped = false; }
        else { this.state = 'meteor'; this.dropped = false; }
      }
    } else if (this.state === 'laser') {
      if (this.t >= 0.9 && this.dirs) {
        for (const [ux, uz] of this.dirs) this.lasers.fire(this.pos.x, this.pos.z, ux, uz, LASER_SPEED + 1);
        this.dirs = null; game.sfx?.laser?.();
      }
      if (this.t > 1.4) { this.state = 'idle'; this.cool = this.angry ? 1.6 : 2.3; }
    } else if (this.state === 'beam') {
      altGoal = 2.3;
      if (this.t < 0.7) {
        // snel boven de speler gaan hangen
        const s = Math.min(dist, 9 * dt); this.pos.x += dx / dist * s; this.pos.z += dz / dist * s;
      } else if (this.t < 2.7) {
        this.beam.visible = this.beamRing.visible = true;
        const pull = this.angry ? 3.4 : 2.6;
        if (dist < 3.6 && dist > 0.3) game.pullPlayer?.(-dx / dist * pull, -dz / dist * pull, dt);
        this.beamRing.material.opacity = 0.5 + Math.abs(Math.sin(this.t * 12)) * 0.4;
      } else if (!this.zapped) {
        this.zapped = true;
        game.sfx?.zap?.(); game?.shake?.(0.5);
        if (dist < 2.2 && (p.y || 0) < 2) game?.hurtPlayer?.(this.zapDamage, this.pos.x, this.pos.z, 13);
        this.beam.visible = this.beamRing.visible = false;
        this.state = 'tired'; this.t = 0;
      }
    } else if (this.state === 'tired') {
      // moe na de trekstraal: laag en wiebelig. NU raken!
      altGoal = 1.3;
      this.rig.rotation.z = Math.sin(t * 9) * 0.12;
      if (this.t > (this.angry ? 1.7 : 2.2)) { this.state = 'idle'; this.cool = this.angry ? 1.2 : 1.8; this.rig.rotation.z = 0; }
    } else if (this.state === 'meteor') {
      if (this.t > 0.3 && !this.dropped) {
        this.dropped = true;
        const n = this.angry ? 7 : 4;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 1.5 + Math.random() * 3;
          this.zone?.meteor?.(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, 1.2 + i * 0.18);
        }
      }
      if (this.t > 1.6) { this.state = 'idle'; this.cool = this.angry ? 1.5 : 2.2; }
    }

    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    keepIn(this.pos, this.arena, this.arena.r - 1);
    this.alt += (altGoal + Math.sin(t * 2) * 0.15 - this.alt) * Math.min(1, dt * 3);
    this.mesh.position.y = this.alt;
    this.rig.rotation.y += dt * (this.state === 'tired' ? 0.5 : 2.2);
    this.beam.position.set(this.pos.x, this.alt - 0.5, this.pos.z); this.beam.scale.y = Math.max(0.1, this.alt - 0.5);
    this.beamRing.position.set(this.pos.x, 0.07, this.pos.z);
    this.shadow.position.set(this.pos.x, 0.05, this.pos.z);
    if (this.touchCool <= 0 && this.alt < 2 && dist < this.r && (p.y || 0) < 1.5) { game?.hurtPlayer?.(1, this.pos.x, this.pos.z, 11); this.touchCool = 1.1; }
    this.lasers.update(dt, game);
  }
}

// ================= Ronde 2: Alien Astro =================
const WAVE_MAX = 7;
export class AlienBoss {
  constructor(group, x, z, arena, opts = {}) {
    const D = difficulty('ruimte');
    this.D = D;
    this.alienBoss = true; this.boss = true;
    this.name = 'Alien Astro'; this.kind = 'alienbaas';
    this.color = 0x69db7c;
    this.hp = this.maxHp = Math.round(40 * D.bossHp * 0.75); // level 9 → 150
    this.r = 1.3; this.loot = 26;
    this.group = group; this.arena = arena;
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0; this.touchCool = 0;
    this.state = 'intro'; this.t = 0; this.cool = 1.2; this.next = 0;
    this.angry = false; this.summons = [0.75, 0.5, 0.25];
    this.speed = 2.7 * D.speed; this.slamDamage = 1; this.alt = 0;

    this.mesh = new THREE.Group();
    this.rig = new THREE.Group(); this.mesh.add(this.rig);
    const a = makeLittleAlien(this.rig, 2.1, 0x69db7c);
    this.bodyM = a.skin;
    // ruimtepak-kraag en riem
    const suit = mat(0x5f3dc4, { flatShading: true });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 6, 14), suit); belt.rotation.x = Math.PI / 2; belt.position.y = 0.4; this.rig.add(belt);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 6, 14), suit); collar.rotation.x = Math.PI / 2; collar.position.y = 1.25; this.rig.add(collar);
    // derde oog (hij ziet alles!)
    const eye3 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0x111111)); eye3.scale.set(1, 1.3, 0.6); eye3.position.set(0, 2.45, 0.78); this.rig.add(eye3);
    // armen met een grote blaster
    this.arms = [];
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(sx * 0.6, 1.05, 0); this.rig.add(arm);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 5), a.skin); up.position.y = -0.35; arm.add(up);
      this.arms.push(arm);
    }
    const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.9), mat(0x343a40, { metalness: 0.5 }));
    blaster.position.set(0, -0.75, 0.3); this.arms[1].add(blaster);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff4d6d })); tip.position.set(0, -0.75, 0.78); this.arms[1].add(tip);
    this.mesh.position.set(x, 0, z);
    this.pos = this.mesh.position;
    this.rot = 0;
    group.add(this.mesh);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    group.add(this.shadow);
    // paarse flitsring en schokgolf
    this.flitsRing = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.7, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbe4bdb, transparent: true, opacity: 0.85, depthWrite: false }));
    this.flitsFill = new THREE.Mesh(new THREE.CircleGeometry(2.7, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xda77f2, transparent: true, opacity: 0.2, depthWrite: false }));
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x74c0fc, transparent: true, opacity: 0.85, depthWrite: false }));
    this.flitsRing.visible = this.flitsFill.visible = this.wave.visible = false;
    group.add(this.flitsRing, this.flitsFill, this.wave);
    this.waveOn = false; this.waveR = 0;
    this.lasers = makeLasers(group);
    this.mesh.scale.setScalar(0.01);
    // de ufo was al kapot (bijvoorbeeld na flauwvallen)? Dan staat Astro te wachten tot je in de arena komt
    if (opts.wait) { this.state = 'wait'; this.mesh.scale.setScalar(1); }
  }

  inArena(p) { return Math.hypot(p.x - this.arena.x, p.z - this.arena.z) < this.arena.r + 0.3; }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    if (dmg < 99 && (this.state === 'intro' || this.state === 'wait' || (this.state === 'flits' && this.t > 0.6))) return false; // aan het verdwijnen
    if (dmg < 99 && this.alt - hitY(game, fromX, fromZ) > 2.4) return false; // hoog in de lucht
    this.hp -= this.state === 'dizzy' ? dmg * 2 : dmg;
    this.flash = 0.12; this.invuln = 0.16;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = dx / d * 4; this.kz = dz / d * 4;
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0;
      this.lasers.clear(); this.flitsRing.visible = this.flitsFill.visible = this.wave.visible = false;
      game.onSlimeDefeated(this);
    }
    return true;
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.shadow, this.flitsRing, this.flitsFill, this.wave);
    this.lasers.remove();
  }

  update(t, dt, game) {
    if (this.removed) return;
    if (this.dead) {
      this.deadT += dt;
      this.mesh.position.y = Math.min(3, this.deadT * 2);
      this.mesh.rotation.y += dt * 10;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - this.deadT / 1.4));
      this.shadow.material.opacity = Math.max(0, 0.3 * (1 - this.deadT / 1.4));
      if (this.deadT > 1.5) this.remove();
      return;
    }
    const p = game.player.pos;
    this.touchCool = Math.max(0, this.touchCool - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.bodyM.emissive.setHex(this.flash > 0 ? 0xffffff : (this.state === 'dizzy' ? 0xffd43b : 0x000000));
    this.bodyM.emissiveIntensity = this.flash > 0 ? 0.6 : (this.state === 'dizzy' ? 0.3 : 0);
    this.t += dt;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dist = Math.hypot(dx, dz) || 1;

    if (this.state === 'wait') {
      this.rig.position.y = Math.sin(t * 3) * 0.05;
      this.mesh.rotation.y = Math.atan2(dx, dz);
      this.shadow.position.set(this.pos.x, 0.05, this.pos.z);
      if (this.inArena(p)) { this.state = 'idle'; this.t = 0; this.cool = 1.2; }
      return;
    }
    if (this.state === 'intro') {
      // klimt uit het wrak van de ufo
      const k = Math.min(1, this.t / 1.6);
      this.mesh.scale.setScalar(Math.max(0.01, k));
      this.alt = Math.sin(k * Math.PI) * 2.5;
      this.mesh.position.y = this.alt;
      this.rot += dt * 6; this.mesh.rotation.y = this.rot;
      this.shadow.position.set(this.pos.x, 0.05, this.pos.z);
      if (k >= 1) { this.state = 'idle'; this.t = 0; this.cool = 1; this.alt = 0; this.mesh.position.y = 0; }
      return;
    }

    if (!this.angry && this.hp <= this.maxHp * 0.5) {
      this.angry = true; this.slamDamage = this.D.bossDamage; this.speed *= 1.25;
      game?.onBossPhase?.(this, '👽 Alien Astro wordt boos! Pas op voor zijn ruimtesprong!');
    }
    while (this.summons.length && this.hp <= this.maxHp * this.summons[0]) {
      this.summons.shift();
      const a = Math.random() * Math.PI * 2;
      const e = new LaserAlien(this.group, this.arena.x + Math.cos(a) * 6, this.arena.z + Math.sin(a) * 6, { hx: this.arena.x, hz: this.arena.z, homeR: this.arena.r - 1.5 });
      e.helper = true;
      game?.addEnemy?.(e);
      game?.onBossPhase?.(this, '📡 Alien Astro roept een laser-alien!');
    }
    this.cool = Math.max(0, this.cool - dt);

    if (this.state === 'idle') {
      if (dist > 3) { this.pos.x += dx / dist * this.speed * dt; this.pos.z += dz / dist * this.speed * dt; }
      this.rot = Math.atan2(dx, dz);
      if (this.cool <= 0) {
        const pick = this.next % 3; this.next++;
        this.t = 0;
        if (pick === 0) { this.state = 'blast'; this.shots = this.angry ? 5 : 3; this.shotT = 0.1; }
        else if (pick === 1) { this.state = 'flits'; this.fx = p.x; this.fz = p.z; this.flitsRing.visible = this.flitsFill.visible = true; }
        else { this.state = 'sprong'; this.jx = p.x; this.jz = p.z; this._slammed = false; }
      }
    } else if (this.state === 'blast') {
      this.rot = Math.atan2(dx, dz);
      this.arms[1].rotation.x = -1.4;
      this.shotT -= dt;
      if (this.shots > 0 && this.shotT <= 0 && !this.aiming) {
        this.aiming = 0.45; this.adx = dx / dist; this.adz = dz / dist;
        this.lasers.warn(this.pos.x, this.pos.z, this.adx, this.adz, 14, 0.45);
      }
      if (this.aiming) {
        this.aiming -= dt;
        if (this.aiming <= 0) {
          this.aiming = 0;
          this.lasers.fire(this.pos.x + this.adx * 0.8, this.pos.z + this.adz * 0.8, this.adx, this.adz, LASER_SPEED + 2);
          game.sfx?.laser?.();
          this.shots--; this.shotT = 0.15;
        }
      }
      if (this.shots <= 0 && !this.aiming && this.t > 0.5) { this.state = 'idle'; this.cool = this.angry ? 1.4 : 2.0; this.arms[1].rotation.x = 0; }
    } else if (this.state === 'flits') {
      // paarse ring volgt je nog heel even, dan ligt hij stil
      if (this.t < 0.5) { this.fx += (p.x - this.fx) * Math.min(1, dt * 5); this.fz += (p.z - this.fz) * Math.min(1, dt * 5); }
      this.flitsRing.position.set(this.fx, 0.08, this.fz); this.flitsFill.position.set(this.fx, 0.07, this.fz);
      this.flitsFill.scale.setScalar(Math.max(0.05, Math.min(1, this.t / 1.1)));
      this.flitsRing.material.opacity = 0.5 + Math.abs(Math.sin(this.t * 14)) * 0.4;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - this.t / 0.9));
      if (this.t >= 1.1) {
        this.pos.x = this.fx; this.pos.z = this.fz;
        this.mesh.scale.setScalar(1);
        this.flitsRing.visible = this.flitsFill.visible = false;
        game?.slam?.(this.fx, this.fz, 2.7, 0xbe4bdb, this.slamDamage);
        this.state = 'dizzy'; this.t = 0;
      }
    } else if (this.state === 'dizzy') {
      this.rig.rotation.z = Math.sin(this.t * 8) * 0.18;
      if (this.t > (this.angry ? 1.1 : 1.5)) { this.state = 'idle'; this.cool = this.angry ? 1.0 : 1.6; this.rig.rotation.z = 0; }
    } else if (this.state === 'sprong') {
      // heel hoog springen (weinig zwaartekracht), schaduw = daar landt hij
      if (this.t < 1.3) {
        this.jx += (p.x - this.jx) * Math.min(1, dt * 1.8); this.jz += (p.z - this.jz) * Math.min(1, dt * 1.8);
        this.alt = Math.min(7, this.t * 8);
        this.shadow.position.set(this.jx, 0.05, this.jz);
        this.shadow.scale.setScalar(1.3 + Math.sin(this.t * 10) * 0.15);
      } else if (this.t < 1.75) {
        this.alt = Math.max(0, 7 - (this.t - 1.3) * 18);
        this.pos.x = this.jx; this.pos.z = this.jz;
        if (this.alt <= 0 && !this._slammed) {
          this._slammed = true;
          game.sfx?.slam?.(); game?.shake?.(0.7);
          if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 2.6 && (p.y || 0) < 1) game?.hurtPlayer?.(this.slamDamage, this.pos.x, this.pos.z, 14);
          this.waveOn = true; this.waveR = 1; this.wx = this.pos.x; this.wz = this.pos.z; this.waveHit = false;
          this.wave.visible = true; this.wave.position.set(this.wx, 0.09, this.wz);
        }
      } else {
        this.state = 'idle'; this.cool = this.angry ? 1.3 : 2.0; this.alt = 0;
        this.shadow.scale.setScalar(1);
      }
    }

    // schokgolf: een ring die groter wordt. SPRING eroverheen!
    if (this.waveOn) {
      this.waveR += dt * (this.angry ? 6.5 : 5.2);
      this.wave.scale.setScalar(this.waveR);
      this.wave.material.opacity = Math.max(0, 0.9 - this.waveR / WAVE_MAX * 0.6);
      const pd = Math.hypot(p.x - this.wx, p.z - this.wz);
      if (!this.waveHit && Math.abs(pd - this.waveR) < 0.55 && (p.y || 0) < 0.6) { this.waveHit = true; game?.hurtPlayer?.(1, this.wx, this.wz, 10); }
      if (this.waveR > WAVE_MAX) { this.waveOn = false; this.wave.visible = false; }
    }

    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    keepIn(this.pos, this.arena, this.arena.r - 1.2);
    this.mesh.position.y = this.alt;
    this.mesh.rotation.y = this.rot;
    if (this.state !== 'sprong' || this.t >= 1.3) this.shadow.position.set(this.pos.x, 0.05, this.pos.z);
    // lopen: armen zwaaien een beetje
    if (this.state === 'idle') { this.arms[0].rotation.x = Math.sin(t * 7) * 0.4; this.arms[1].rotation.x = -Math.sin(t * 7) * 0.4; }
    this.rig.position.y = Math.sin(t * 3) * 0.05;
    if (this.touchCool <= 0 && this.alt < 0.8 && this.state !== 'flits' && dist < this.r + 0.5 && (p.y || 0) < 1.2) { game?.hurtPlayer?.(1, this.pos.x, this.pos.z, 12); this.touchCool = 1.1; }
    this.lasers.update(dt, game);
  }
}

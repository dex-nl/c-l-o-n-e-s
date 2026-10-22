// Slijmpjes: ze springen rond, en als ze iemand zien springen ze erop af.
// Koning Slijm is de baas van de grot: hij springt heel hoog en landt met een KLAP.
import * as THREE from 'three';
import { mat, makeHat, disposeTree } from './characters.js';
import { collide } from './physics.js';
import { difficulty } from './difficulty.js';

const KINDS = {
  groen: { color: 0x7bd389, size: 0.55, hp: 2, speed: 2.6, aggro: 7, loot: 1 },
  blauw: { color: 0x5aa9e6, size: 0.6, hp: 3, speed: 3.3, aggro: 8, loot: 2 },
  koning: { color: 0x4cc96f, size: 1.7, hp: 24, speed: 2.2, aggro: 16, loot: 12 },
  // Mummieslijm (woestijn en piramide): een slijmpje dat in wc-papier is gerold. Sterker dan een blauw slijmpje!
  mummie: { color: 0xf1e3c2, size: 0.62, hp: 4, speed: 3.4, aggro: 9, loot: 2 },
  // Heggenslijm (doolhof): een slijmpje van bladeren. Taai! Verstopt zich tussen de heggen.
  heg: { color: 0x2d9b4e, size: 0.66, hp: 4, speed: 3.5, aggro: 9, loot: 3 },
  // Bladkoning Bram (de baas van het doolhof, zie bram.js)
  bladkoning: { color: 0x3fa34d, size: 1.9, hp: 36, speed: 2.5, aggro: 18, loot: 20 },
};
export const SLIME_COLORS = { groen: 0x7bd389, blauw: 0x5aa9e6, koning: 0x4cc96f, mummie: 0xe9d8a6, heg: 0x2d9b4e, bladkoning: 0x3fa34d };
const REST = 0.45, HOP = 0.5; // even stilzitten, dan een sprongetje

// Vormen en kleuren die alle slijmpjes delen (scheelt geheugen)
const bodyGeo = new THREE.IcosahedronGeometry(1, 1);
const eyeGeo = new THREE.BoxGeometry(0.26, 0.32, 0.08);
const pupilGeo = new THREE.BoxGeometry(0.13, 0.17, 0.06);
const browGeo = new THREE.BoxGeometry(0.32, 0.07, 0.06);
const shineGeo = new THREE.BoxGeometry(0.2, 0.12, 0.05);
const white = mat(0xffffff), black = mat(0x1d1d1d), shineM = mat(0xffffff, { emissive: 0x888888 });
const bandGeo = new THREE.TorusGeometry(0.93, 0.07, 3, 14);
const bandM = mat(0xfffaf0), sleepyGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);
const leafGeo = new THREE.ConeGeometry(0.22, 0.5, 4), leafM = mat(0x55c26b);

export class Slime {
  constructor(group, x, z, kind = 'groen', zoneId = null) {
    const k = KINDS[kind];
    const D = difficulty(zoneId); // moeilijker in elke volgende wereld (zie difficulty.js)
    this.kind = kind;
    this.king = kind === 'koning' || kind === 'bladkoning';
    this.hp = this.maxHp = Math.round(k.hp * (this.king ? D.bossHp : D.hp));
    this.r = k.size;
    this.speed = k.speed * D.speed;
    this.aggro = k.aggro * D.aggro;
    this.loot = k.loot;
    this.home = { x, z };
    this.group = group;

    this.mesh = new THREE.Group();
    this.bodyM = mat(k.color, { transparent: true, opacity: 0.9, roughness: 0.35 });
    this.body = new THREE.Mesh(bodyGeo, this.bodyM);
    this.body.castShadow = true;
    this.mesh.add(this.body);
    // ogen (kijken naar voren)
    const face = new THREE.Group();
    for (const sx of [-0.32, 0.32]) {
      const eye = new THREE.Mesh(eyeGeo, white);
      eye.position.set(sx, 0.15, 0.9);
      const pupil = new THREE.Mesh(pupilGeo, black);
      pupil.position.set(sx, 0.11, 0.95);
      face.add(eye, pupil);
      if (this.king) {
        const brow = new THREE.Mesh(browGeo, black);
        brow.position.set(sx, 0.38, 0.93);
        brow.rotation.z = sx > 0 ? 0.4 : -0.4;
        face.add(brow);
      }
    }
    if (kind === 'mummie') {
      // verbandjes rondom, en slaperige oogleden
      [[-0.35, 0.25], [0.05, -0.2], [0.45, 0.15]].forEach(([y, tilt]) => {
        const b = new THREE.Mesh(bandGeo, bandM);
        b.rotation.set(Math.PI / 2 + tilt, 0, tilt * 0.5);
        b.position.y = y;
        b.scale.setScalar(Math.cos(Math.asin(Math.min(0.9, Math.abs(y)))));
        face.add(b);
      });
      for (const sx of [-0.32, 0.32]) {
        const lid = new THREE.Mesh(sleepyGeo, bandM);
        lid.position.set(sx, 0.3, 0.97);
        face.add(lid);
      }
    }
    if (kind === 'heg') {
      // blaadjes bovenop en boze (maar lieve) wenkbrauwen
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafM);
        const a = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.45, 0.85, Math.sin(a) * 0.45);
        leaf.rotation.set(Math.sin(a) * 0.7, a, Math.cos(a) * 0.7);
        face.add(leaf);
      }
      for (const sx of [-0.32, 0.32]) {
        const brow = new THREE.Mesh(browGeo, black);
        brow.position.set(sx, 0.36, 0.93);
        brow.rotation.z = sx > 0 ? 0.3 : -0.3;
        face.add(brow);
      }
    }
    const shine = new THREE.Mesh(shineGeo, shineM);
    shine.position.set(-0.45, 0.6, 0.72);
    shine.rotation.z = 0.5;
    face.add(shine);
    this.body.add(face);
    if (this.king) {
      this.crown = makeHat('kroon');
      this.crown.scale.setScalar(1.5);
      this.crown.position.y = 0.25;
      this.body.add(this.crown);
    }
    this.mesh.position.set(x, 0, z);
    this.pos = this.mesh.position;
    this.rot = Math.random() * 6;
    group.add(this.mesh);

    this.t = Math.random() * REST; // tijd in de huidige stap
    this.hopping = false;
    this.dir = { x: 0, z: 0 };
    this.kx = 0; this.kz = 0;
    this.flash = 0;
    this.invuln = 0;
    this.dead = false;
    this.removed = false;
    this.deadT = 0;
    this.slamCool = 4;
    this.jump = null;
    this.split = false;
    this.setSize(1, 1);
  }

  // Weg uit de wereld (en het geheugen opruimen)
  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh);
    this.bodyM.dispose();
    if (this.crown) disposeTree(this.crown);
  }

  setSize(sxz, sy) {
    const s = this.r;
    this.body.scale.set(s * sxz, s * 0.8 * sy, s * sxz);
    this.body.position.y = s * 0.8 * sy;
  }

  // Wie is het dichtstbij: de speler of een clone?
  pickTarget(game) {
    let best = null, bestD = this.aggro;
    const check = (p) => {
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      if (d < bestD) { bestD = d; best = p; }
    };
    check(game.player.pos);
    for (const c of game.squad.list) if (c.spawning <= 0) check(c.pos);
    return best;
  }

  update(t, dt, game) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.3);
      this.setSize(1 + k * 0.6, 1 - k);
      if (k >= 1 && !this.removed) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      this.bodyM.emissive.setScalar(this.flash > 0 ? 0.9 : 0);
    }

    if (this.jump) this.updateJump(dt, game);
    else this.updateHop(dt, game);

    // teruggeduwd worden
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8);
      this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    collide(this.pos, this.r * 0.8, game.zone);

    // draai naar waar hij heen springt
    if (this.dir.x || this.dir.z) {
      let diff = Math.atan2(this.dir.x, this.dir.z) - this.rot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rot += diff * Math.min(1, dt * 8);
      this.mesh.rotation.y = this.rot;
    }

    // Raak je de speler? Au!
    const p = game.player.pos;
    if (this.pos.y < 0.6 && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.r * 0.85 + 0.45) {
      game.hurtPlayer(1, this.pos.x, this.pos.z);
    }

    // Koning Slijm: bij de helft van zijn leven roept hij hulp
    if (this.king && !this.split && this.hp <= this.maxHp / 2) {
      this.split = true;
      game.spawnSlime(this.pos.x + 2.5, this.pos.z, 'blauw');
      game.spawnSlime(this.pos.x - 2.5, this.pos.z, 'blauw');
    }
  }

  updateHop(dt, game) {
    this.t += dt;
    if (!this.hopping) {
      // stilzitten en een beetje ademen
      this.pos.y = 0;
      this.setSize(1 + Math.sin(this.t * 10) * 0.03, 1 - Math.sin(this.t * 10) * 0.04 - (this.t < 0.12 ? 0.18 : 0));
      if (this.t >= REST * (this.king ? 1.6 : 1)) {
        this.t = 0;
        const target = this.pickTarget(game);
        // Koning Slijm doet soms een superSPRONG
        this.slamCool -= REST * 1.6 + HOP;
        if (this.king && target && this.slamCool <= 0) {
          this.slamCool = 3 + Math.random() * 2;
          this.jump = { t: 0, from: { x: this.pos.x, z: this.pos.z }, to: { x: target.x, z: target.z } };
          game.sfx.boing(0.6);
          return;
        }
        let dx, dz;
        if (target) {
          dx = target.x - this.pos.x; dz = target.z - this.pos.z;
        } else if (Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) > 4) {
          dx = this.home.x - this.pos.x; dz = this.home.z - this.pos.z;
        } else {
          const a = Math.random() * Math.PI * 2;
          dx = Math.cos(a); dz = Math.sin(a);
        }
        const d = Math.hypot(dx, dz) || 1;
        this.dir = { x: dx / d, z: dz / d };
        this.chasing = !!target;
        this.hopping = true;
      }
    } else {
      const k = Math.min(1, this.t / HOP);
      const sp = this.speed * (this.chasing ? 1.8 : 0.8);
      this.pos.x += this.dir.x * sp * dt;
      this.pos.z += this.dir.z * sp * dt;
      this.pos.y = Math.sin(k * Math.PI) * (0.35 + this.r * 0.5);
      this.setSize(1 - Math.sin(k * Math.PI) * 0.12, 1 + Math.sin(k * Math.PI) * 0.2);
      if (k >= 1) { this.hopping = false; this.t = 0; this.pos.y = 0; }
    }
  }

  // De grote sprong van Koning Slijm
  updateJump(dt, game) {
    const j = this.jump;
    j.t += dt;
    const T = 1.2, k = Math.min(1, j.t / T);
    this.pos.x = j.from.x + (j.to.x - j.from.x) * k;
    this.pos.z = j.from.z + (j.to.z - j.from.z) * k;
    this.pos.y = Math.sin(k * Math.PI) * 6;
    this.setSize(1 - Math.sin(k * Math.PI) * 0.15, 1 + Math.sin(k * Math.PI) * 0.25);
    const dx = j.to.x - j.from.x, dz = j.to.z - j.from.z, d = Math.hypot(dx, dz) || 1;
    this.dir = { x: dx / d, z: dz / d };
    // een schaduw op de grond laat zien waar hij landt
    game.showLanding(j.to.x, j.to.z, k < 1 ? 4.5 : 0);
    if (k >= 1) {
      this.jump = null;
      this.pos.y = 0;
      this.t = 0;
      this.hopping = false;
      this.setSize(1.3, 0.6);
      game.slam(this.pos.x, this.pos.z, 4.5, this.slamColor, this.slamDamage || 1);
    }
  }

  // Geraakt door een zwaard. Geeft true als het raak was.
  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= dmg;
    this.flash = 0.12;
    this.invuln = this.king ? 0.25 : 0.18;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    const power = this.king ? 2.5 : 8;
    this.kx = (dx / d) * power; this.kz = (dz / d) * power;
    if (this.hp <= 0) {
      this.dead = true;
      this.bodyM.emissive.setScalar(0);
      game.onSlimeDefeated(this);
    }
    return true;
  }
}

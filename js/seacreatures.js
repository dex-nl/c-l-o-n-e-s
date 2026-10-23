// Dieren in De Onderwaterwereld: haaien en kwallen. Ze werken net als slijmpjes:
// pos (met hoogte y), r, dead, removed, update(), hurt() en remove().
// - Haai: zwemt heen en weer. Ziet hij je (en zwem je ongeveer even hoog)? Dan schudt hij even met een rood !-tje... en dan SPRINT hij.
//   Ga opzij, of zwem snel omhoog of omlaag!
// - Kwal: drijft langzaam op en neer. Raak je hem aan, dan prikt hij (1 hartje). Wacht tot hij weg is, of zwem eromheen.
import * as THREE from 'three';
import { mat, disposeTree } from './characters.js';
import { difficulty } from './difficulty.js';
import { SURFACE } from './sea.js';

const clampY = (y) => Math.max(0.4, Math.min(SURFACE - 0.3, y));

export class Shark {
  constructor(group, spot) {
    const D = difficulty('onderwater');
    this.kind = 'haai';
    this.color = 0x8aa1b1;
    this.hp = this.maxHp = Math.round(4 * D.hp); // 11
    this.r = 0.9;
    this.loot = 3;
    this.group = group;
    this.spot = spot;
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.state = 'patrol'; this.t = 0; this.cool = 1.5; this.dirX = 1;
    this.vel = new THREE.Vector3();

    const g = new THREE.Group();
    this.mesh = g;
    this.bodyM = mat(this.color, { emissive: 0x000000 });
    const belly = mat(0xf1f3f5), black = mat(0x1d1d1d), white = mat(0xffffff);
    const rig = new THREE.Group(); g.add(rig); this.rig = rig;
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), this.bodyM);
    body.scale.set(0.75, 0.7, 2.0); body.castShadow = true; rig.add(body);
    const bel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), belly);
    bel.scale.set(0.62, 0.45, 1.7); bel.position.set(0, -0.18, 0.05); rig.add(bel);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 4), this.bodyM);
    fin.position.set(0, 0.62, -0.1); fin.rotation.x = -0.35; rig.add(fin);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), this.bodyM);
      side.position.set(s * 0.45, -0.2, 0.2); side.rotation.set(0.5, 0, s * 1.9); rig.add(side);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), white); eye.position.set(s * 0.3, 0.12, 0.85); rig.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), black); pupil.position.set(s * 0.33, 0.12, 0.93); rig.add(pupil);
    }
    // grijns met tandjes (niet eng, wel stoer)
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 4, 10, Math.PI), black);
    mouth.rotation.z = Math.PI; mouth.position.set(0, -0.15, 1.05); rig.add(mouth);
    this.tail = new THREE.Group(); this.tail.position.set(0, 0, -1.1); rig.add(this.tail);
    const tf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), this.bodyM);
    tf.rotation.x = Math.PI / 2; tf.position.z = -0.3; tf.scale.set(0.3, 1, 1); this.tail.add(tf);
    // het rode uitroepteken (hij gaat zo sprinten!)
    this.alert = new THREE.Group();
    const ex = new THREE.MeshBasicMaterial({ color: 0xff2d55 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), ex); bar.position.y = 0.35; this.alert.add(bar);
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), ex); dot.position.y = -0.05; this.alert.add(dot);
    this.alert.position.set(0, 1.4, 0); this.alert.visible = false; g.add(this.alert);

    g.position.set(spot.x, spot.y, spot.z);
    this.pos = g.position;
    this.rot = Math.PI / 2;
    group.add(g);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh);
    disposeTree(this.mesh);
  }

  face(dx, dz, dt, sp = 6) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
    let diff = Math.atan2(dx, dz) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rot += diff * Math.min(1, dt * sp);
    this.mesh.rotation.y = this.rot;
  }

  update(t, dt, game) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.5);
      this.mesh.rotation.z = k * Math.PI;
      this.pos.y += dt * 2;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - k));
      if (k >= 1) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); this.bodyM.emissive.setScalar(this.flash > 0 ? 0.7 : 0); }
    this.t += dt; this.cool -= dt;
    const p = game.player.pos, s = this.spot;
    const d2 = Math.hypot(p.x - this.pos.x, p.z - this.pos.z), dy = Math.abs((p.y || 0) - this.pos.y);
    this.alert.visible = this.state === 'aim';
    switch (this.state) {
      case 'patrol': {
        const goalX = s.x + this.dirX * s.len / 2;
        const dx = goalX - this.pos.x;
        if (Math.abs(dx) < 0.4) this.dirX *= -1;
        this.pos.x += Math.sign(dx) * 2.4 * dt;
        this.pos.z += (s.z - this.pos.z) * Math.min(1, dt * 1.5);
        this.pos.y += (s.y - this.pos.y) * Math.min(1, dt * 1.5);
        this.face(Math.sign(dx), 0, dt);
        if (this.cool <= 0 && d2 < 7.5 && dy < 2.6) { this.state = 'aim'; this.t = 0; game.sfx.growl?.(); }
        break;
      }
      case 'aim': {
        // even schudden en richten... en dan GAAN
        this.face(p.x - this.pos.x, p.z - this.pos.z, dt, 8);
        this.rig.rotation.z = Math.sin(this.t * 40) * 0.12;
        if (this.t > 0.75) {
          this.vel.set(p.x - this.pos.x, ((p.y || 0) + 0.5) - this.pos.y, p.z - this.pos.z);
          if (this.vel.lengthSq() < 0.01) this.vel.set(0, 0, 1);
          this.vel.normalize().multiplyScalar(10);
          this.state = 'dash'; this.t = 0; this.rig.rotation.z = 0; this.hit = false;
          game.sfx.whoosh?.();
        }
        break;
      }
      case 'dash': {
        this.pos.addScaledVector(this.vel, dt);
        this.pos.y = clampY(this.pos.y);
        this.face(this.vel.x, this.vel.z, dt, 12);
        if (this.t > 0.75) { this.state = 'tired'; this.t = 0; }
        break;
      }
      case 'tired': {
        // even uitrusten (nu kun je hem goed raken!)
        this.rig.rotation.z = Math.sin(t * 3) * 0.08;
        if (this.t > 1.6) { this.state = 'patrol'; this.t = 0; this.cool = 2.4; }
        break;
      }
    }
    this.tail.rotation.y = Math.sin(t * (this.state === 'dash' ? 22 : 7)) * 0.5;
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    const B = game.zone.bounds;
    this.pos.x = Math.max(B.minX + 1, Math.min(B.maxX - 1, this.pos.x));
    this.pos.z = Math.max(B.minZ + 1, Math.min(B.maxZ - 1, this.pos.z));
    // bijten (alleen als hij echt dichtbij is, ook in de hoogte)
    if (Math.hypot(d2, ((p.y || 0) + 0.6) - this.pos.y) < this.r + 0.55) {
      game.hurtPlayer(1, this.pos.x, this.pos.z, this.state === 'dash' ? 14 : 8);
      if (this.state === 'dash') { this.state = 'tired'; this.t = 0; }
    }
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= dmg;
    this.flash = 0.12; this.invuln = 0.18;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 6; this.kz = (dz / d) * 6;
    if (this.state === 'aim' || this.state === 'patrol') { this.state = 'tired'; this.t = 0.6; } // schrikken
    if (this.hp <= 0) { this.dead = true; this.alert.visible = false; this.bodyM.emissive.setScalar(0); game.onSlimeDefeated(this); }
    return true;
  }
}

export class Jelly {
  constructor(group, x, z, helper = false) {
    const D = difficulty('onderwater');
    this.kind = 'kwal';
    this.color = 0xda77f2;
    this.hp = this.maxHp = Math.round(2 * D.hp); // 6
    this.r = 0.6;
    this.loot = 2;
    this.helper = helper;
    this.group = group;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.ph = Math.random() * 6; this.speedY = 0.55 + Math.random() * 0.25;

    const g = new THREE.Group();
    this.mesh = g;
    this.bodyM = mat(this.color, { transparent: true, opacity: 0.75, emissive: 0x5f1f6e, roughness: 0.3 });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.bodyM);
    bell.castShadow = true; g.add(bell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.06, 4, 16), this.bodyM); rim.rotation.x = Math.PI / 2; g.add(rim);
    const black = mat(0x1d1d1d);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), black); e.position.set(s * 0.18, 0.25, 0.5); g.add(e); }
    this.legs = [];
    const legM = mat(0xf3d9fa, { transparent: true, opacity: 0.8 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1.0, 4), legM);
      l.position.set(Math.cos(a) * 0.35, -0.5, Math.sin(a) * 0.35);
      g.add(l); this.legs.push(l);
    }
    g.position.set(x, 1 + Math.random() * 3.5, z);
    this.pos = g.position;
    group.add(g);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh);
    disposeTree(this.mesh);
  }

  update(t, dt, game) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.4);
      this.mesh.scale.setScalar(Math.max(0.01, 1 + k * 0.5 - k * 1.5));
      if (k >= 1) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); this.bodyM.emissive.setHex(this.flash > 0 ? 0xffffff : 0x5f1f6e); }
    // langzaam op en neer (van de bodem tot bijna boven), en een beetje heen en weer
    const k = (Math.sin(t * this.speedY + this.ph) + 1) / 2;
    const yGoal = 0.7 + k * (SURFACE - 1.4);
    this.pos.y += (yGoal - this.pos.y) * Math.min(1, dt * 2);
    const hx = this.home.x + Math.sin(t * 0.3 + this.ph) * 1.2, hz = this.home.z + Math.cos(t * 0.25 + this.ph) * 1.2;
    this.pos.x += (hx - this.pos.x) * Math.min(1, dt * 0.8);
    this.pos.z += (hz - this.pos.z) * Math.min(1, dt * 0.8);
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    const pulse = Math.sin(t * 4 + this.ph);
    this.mesh.scale.set(1 + pulse * 0.08, 1 - pulse * 0.1, 1 + pulse * 0.08);
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 3 + i) * 0.3; l.rotation.z = Math.cos(t * 3 + i) * 0.3; });
    // prik! (de tentakels hangen onder de kwal)
    const p = game.player.pos;
    const py = (p.y || 0) + 0.7;
    if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.r + 0.45 && py > this.pos.y - 1.5 && py < this.pos.y + 0.9) {
      game.hurtPlayer(1, this.pos.x, this.pos.z, 9);
    }
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= dmg;
    this.flash = 0.12; this.invuln = 0.18;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 5; this.kz = (dz / d) * 5;
    if (this.hp <= 0) { this.dead = true; this.bodyM.emissive.setHex(0); game.onSlimeDefeated(this); }
    return true;
  }
}

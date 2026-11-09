// Reuzenaap Rokko: de baas van De Junglewereld (idee van Dex). Een GROTE bruine aap met een bladkroon.
// Hij is een speelse plaaggeest (niet gemeen!), maar hij is wel heel sterk:
// - Borsttrommel: hij trommelt op zijn borst en er komt een groene schokgolf. Spring eroverheen / ren weg!
// - Kokosgooien: hij gooit bruine kokosnoten. Kijk naar de groene rondjes op de grond en ga eruit!
// - Sprong: hij springt omhoog en landt met een KLAP (schaduw = daar komt hij).
// - Bij 3/4, 1/2 en 1/4 van zijn leven roept hij 2 jungle-slijmpjes (die geven altijd een hartje).
// - Bij de helft wordt hij boos: sneller, meer kokosnoten, en zijn klappen doen 2 hartjes pijn.
// Hij blijft in de Arenatempel en begint pas als jij daar binnenkomt.
import * as THREE from 'three';
import { mat } from './characters.js';
import { difficulty } from './difficulty.js';
import { Slime } from './enemies.js';

const ORB_R = 1.4, ORB_T = 1.25, WAVE_R = 5.5;
const orbGeo = new THREE.IcosahedronGeometry(0.38, 1);
const warnGeo = new THREE.RingGeometry(ORB_R - 0.22, ORB_R, 22).rotateX(-Math.PI / 2);
const fillGeo = new THREE.CircleGeometry(ORB_R, 22).rotateX(-Math.PI / 2);

export class Ape {
  constructor(group, x, z, arena) {
    const D = difficulty('jungle');
    this.D = D;
    this.ape = true;
    this.name = 'Reuzenaap Rokko';
    this.kind = 'reuzenaap';
    this.color = 0x8d6e4c;
    this.hp = this.maxHp = Math.round(40 * D.bossHp); // level 8 → 180
    this.r = 1.7;
    this.loot = 28;
    this.group = group;
    this.arena = arena;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.state = 'wait'; this.t = 0; this.cool = 2.2; this.touchCool = 0;
    this.angry = false;
    this.summons = [0.75, 0.5, 0.25];
    this.next = 0; // 0=trommel, 1=kokos, 2=sprong, ...
    this.speed = 2.1 * D.speed;
    this.slamDamage = 1;
    this.alt = 0; // hoogte tijdens sprong

    // ---------- Mesh: grote aap ----------
    const fur = mat(0x8d6e4c, { flatShading: true });
    const dark = mat(0x5c4030, { flatShading: true });
    const skin = mat(0xd4a574, { flatShading: true });
    const leaf = mat(0x2f9e44, { flatShading: true });
    const white = mat(0xffffff), black = mat(0x1d1d1d);

    this.bodyM = fur;
    this.mesh = new THREE.Group();
    this.rig = new THREE.Group();
    this.mesh.add(this.rig);

    // lijf
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), fur);
    body.scale.set(1.15, 1.25, 0.95); body.position.y = 1.6; body.castShadow = true; this.rig.add(body);
    // buik
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), skin);
    belly.scale.set(1.05, 1.0, 0.7); belly.position.set(0, 1.45, 0.55); this.rig.add(belly);
    // hoofd
    const head = new THREE.Group(); head.position.set(0, 3.15, 0.35); this.rig.add(head); this.head = head;
    const hb = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), fur); hb.castShadow = true; head.add(hb);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), skin); face.scale.set(0.95, 1.0, 0.7); face.position.set(0, -0.1, 0.45); head.add(face);
    for (const sx of [-0.28, 0.28]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), white); eye.position.set(sx, 0.15, 0.7); head.add(eye);
      head.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), black), { position: new THREE.Vector3(sx, 0.15, 0.82) }));
      // oren
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), fur); ear.position.set(sx * 1.05, 0.15, 0); head.add(ear);
    }
    // bladkroon
    const crown = new THREE.Group(); crown.position.y = 0.7; head.add(crown); this.crown = crown;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const lf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 5), leaf);
      lf.position.set(Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45);
      lf.rotation.z = -Math.cos(a) * 0.5; lf.rotation.x = Math.sin(a) * 0.4;
      crown.add(lf);
    }
    // armen
    this.arms = [];
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(sx * 1.2, 2.1, 0); this.rig.add(arm);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.3, 6), fur); upper.position.y = -0.55; upper.castShadow = true; arm.add(upper);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 4), skin); hand.position.y = -1.25; arm.add(hand);
      this.arms.push(arm);
    }
    // benen
    for (const sx of [-0.45, 0.45]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 1.1, 6), fur);
      leg.position.set(sx, 0.55, 0); leg.castShadow = true; this.rig.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 4), dark);
      foot.scale.set(1.1, 0.55, 1.4); foot.position.set(sx, 0.12, 0.15); this.rig.add(foot);
    }

    this.mesh.position.set(x, 0, z);
    this.pos = this.mesh.position;
    this.rot = 0;
    group.add(this.mesh);

    // schaduw
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.shadow.position.set(x, 0.04, z);
    group.add(this.shadow);

    // schokgolf-ring (borsttrommel)
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.7, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x40c057, transparent: true, opacity: 0.75, depthWrite: false }));
    this.waveFill = new THREE.Mesh(new THREE.CircleGeometry(0.5, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8ce99a, transparent: true, opacity: 0.18, depthWrite: false }));
    this.wave.visible = this.waveFill.visible = false;
    group.add(this.wave, this.waveFill);
    this.waveOn = false; this.waveR = 0; this.waveX = 0; this.waveZ = 0;

    // kokosnoten
    this.orbs = [];
    this.orbM = new THREE.MeshStandardMaterial({ color: 0x6b4226, flatShading: true, roughness: 0.9 });
  }

  orb(x, z) {
    let o = this.orbs.find((q) => !q.on);
    if (!o) {
      const m = new THREE.Mesh(orbGeo, this.orbM);
      const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0x2f9e44, transparent: true, opacity: 0.8, depthWrite: false }));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0x8ce99a, transparent: true, opacity: 0.25, depthWrite: false }));
      this.group.add(m, warn, fill);
      o = { m, warn, fill, on: false };
      this.orbs.push(o);
    }
    o.on = true; o.t = 0; o.x = x; o.z = z;
    o.m.visible = true; o.warn.visible = true; o.fill.visible = true;
    o.m.position.set(x, 6.5, z);
    o.warn.position.set(x, 0.08, z); o.fill.position.set(x, 0.07, z);
    o.fill.scale.setScalar(0.05);
    return o;
  }

  inArena(p) { return Math.hypot(p.x - this.arena.x, p.z - this.arena.z) < this.arena.r + 0.5; }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0 || this.state === 'wait') return;
    this.hp -= dmg;
    this.flash = 0.18; this.invuln = 0.28;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 5; this.kz = (dz / d) * 5;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deadT = 0; game?.onApeDefeated?.(this); }
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.shadow, this.wave, this.waveFill);
    for (const o of this.orbs) this.group.remove(o.m, o.warn, o.fill);
  }

  update(dt, game) {
    if (this.removed) return;
    if (this.dead) {
      this.deadT += dt;
      this.mesh.position.y = Math.min(2.5, this.deadT * 1.5);
      this.mesh.rotation.z = this.deadT * 1.2;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - this.deadT / 1.4));
      this.shadow.material.opacity = Math.max(0, 0.28 * (1 - this.deadT / 1.4));
      if (this.deadT > 1.5) this.remove();
      return;
    }

    const p = game.player.pos;
    this.touchCool = Math.max(0, this.touchCool - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.bodyM.emissive = new THREE.Color(this.flash > 0 ? 0xffffff : 0x000000);
    this.bodyM.emissiveIntensity = this.flash > 0 ? 0.55 : 0;

    // wachten tot de speler in de arena is
    if (this.state === 'wait') {
      if (this.inArena(p)) { this.state = 'idle'; this.t = 0; this.cool = 1.2; }
      this.animate(dt, 0); return;
    }

    // boos bij de helft
    if (!this.angry && this.hp <= this.maxHp * 0.5) {
      this.angry = true;
      this.slamDamage = this.D.bossDamage;
      this.speed *= 1.25;
      game?.onBossPhase?.(this, '🦍 Reuzenaap Rokko wordt boos! Pas op voor zijn sprongen!');
    }

    // hulpjes
    while (this.summons.length && this.hp <= this.maxHp * this.summons[0]) {
      this.summons.shift();
      const n = this.hp <= this.maxHp * 0.25 ? 2 : 2;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const e = new Slime(this.group, this.pos.x + Math.cos(a) * 3, this.pos.z + Math.sin(a) * 3, 'jungle', 'jungle');
        e.helper = true;
        game?.addEnemy?.(e);
      }
      game?.onBossPhase?.(this, '🍌 Rokko roept jungle-slijmpjes!');
    }

    this.cool = Math.max(0, this.cool - dt);
    this.t += dt;

    // aanvallen
    if (this.state === 'idle') {
      // naar de speler lopen
      const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dist = Math.hypot(dx, dz) || 1;
      if (dist > 2.4) {
        this.pos.x += (dx / dist) * this.speed * dt;
        this.pos.z += (dz / dist) * this.speed * dt;
        this.rot = Math.atan2(dx, dz);
      }
      // in de arena blijven
      const ad = Math.hypot(this.pos.x - this.arena.x, this.pos.z - this.arena.z);
      if (ad > this.arena.r - 1.5) {
        this.pos.x = this.arena.x + (this.pos.x - this.arena.x) / ad * (this.arena.r - 1.5);
        this.pos.z = this.arena.z + (this.pos.z - this.arena.z) / ad * (this.arena.r - 1.5);
      }
      if (this.cool <= 0) {
        const pick = this.next % 3; this.next++;
        if (pick === 0) { this.state = 'drum'; this.t = 0; }
        else if (pick === 1) { this.state = 'throw'; this.t = 0; this.throwN = this.angry ? 5 : 3; this.thrown = 0; }
        else { this.state = 'jump'; this.t = 0; this.jumpTx = p.x; this.jumpTz = p.z; }
      }
    } else if (this.state === 'drum') {
      // trommelen (armen op en neer), daarna schokgolf
      if (this.t < 0.9) {
        this.arms[0].rotation.x = Math.sin(this.t * 28) * 0.8;
        this.arms[1].rotation.x = Math.sin(this.t * 28 + 1) * 0.8;
      } else if (!this.waveOn) {
        this.waveOn = true; this.waveR = 0.5;
        this.waveX = this.pos.x; this.waveZ = this.pos.z;
        this.wave.visible = this.waveFill.visible = true;
        this.wave.position.set(this.waveX, 0.1, this.waveZ);
        this.waveFill.position.set(this.waveX, 0.09, this.waveZ);
        game?.sfx?.rumble?.();
        game?.shake?.(0.45);
      }
      if (this.t > 2.0) { this.state = 'idle'; this.cool = this.angry ? 1.6 : 2.4; this.t = 0; this.arms[0].rotation.x = this.arms[1].rotation.x = 0; }
    } else if (this.state === 'throw') {
      if (this.t > 0.35 && this.thrown < this.throwN) {
        const a = Math.atan2(p.x - this.pos.x, p.z - this.pos.z) + (this.thrown - (this.throwN - 1) / 2) * 0.35;
        const dist = 4 + Math.random() * 3.5;
        this.orb(this.pos.x + Math.sin(a) * dist, this.pos.z + Math.cos(a) * dist);
        this.thrown++; this.t = 0;
        // arm zwaai
        this.arms[1].rotation.x = -1.2;
      }
      if (this.thrown >= this.throwN && this.t > 0.6) { this.state = 'idle'; this.cool = this.angry ? 1.8 : 2.6; this.arms[1].rotation.x = 0; }
    } else if (this.state === 'jump') {
      // mikken (schaduw bij speler), dan springen
      if (this.t < 1.1) {
        this.jumpTx += (p.x - this.jumpTx) * Math.min(1, dt * 2);
        this.jumpTz += (p.z - this.jumpTz) * Math.min(1, dt * 2);
        // schaduw op landingsplek
        this.shadow.position.set(this.jumpTx, 0.05, this.jumpTz);
        this.shadow.scale.setScalar(1.2 + Math.sin(this.t * 10) * 0.15);
        this.alt = Math.min(5.5, this.t * 6);
      } else if (this.t < 1.45) {
        this.alt = Math.max(0, 5.5 - (this.t - 1.1) * 16);
        this.pos.x = this.jumpTx; this.pos.z = this.jumpTz;
        if (this.alt <= 0 && !this._slammed) {
          this._slammed = true; this.alt = 0;
          game?.sfx?.rumble?.(); game?.shake?.(0.7);
          if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 3.2) game?.hurtPlayer?.(this.slamDamage, this.pos.x, this.pos.z, 14);
        }
      } else {
        this.state = 'idle'; this.cool = this.angry ? 1.5 : 2.2; this._slammed = false; this.alt = 0;
        this.shadow.scale.setScalar(1); this.shadow.position.set(this.pos.x, 0.04, this.pos.z);
      }
    }

    // schokgolf groeit
    if (this.waveOn) {
      this.waveR += dt * (this.angry ? 9 : 7);
      const s = this.waveR;
      this.wave.scale.setScalar(s); this.waveFill.scale.setScalar(s);
      this.wave.material.opacity = Math.max(0, 0.8 - s / WAVE_R);
      this.waveFill.material.opacity = Math.max(0, 0.2 - s / WAVE_R * 0.2);
      if (Math.abs(Math.hypot(p.x - this.waveX, p.z - this.waveZ) - this.waveR * 0.55) < 0.7 && this.waveR * 0.55 < WAVE_R) {
        game?.hurtPlayer?.(this.slamDamage, this.waveX, this.waveZ, 10);
      }
      if (this.waveR > WAVE_R) { this.waveOn = false; this.wave.visible = this.waveFill.visible = false; }
    }

    // kokosnoten
    for (const o of this.orbs) {
      if (!o.on) continue;
      o.t += dt;
      const k = Math.min(1, o.t / ORB_T);
      o.m.position.set(o.x, 6.5 * (1 - k * k) + 0.35, o.z);
      o.fill.scale.setScalar(Math.max(0.05, k));
      o.warn.material.opacity = 0.5 + Math.abs(Math.sin(o.t * 14)) * 0.4;
      if (k >= 1) {
        o.on = false; o.m.visible = o.warn.visible = o.fill.visible = false;
        if (Math.hypot(p.x - o.x, p.z - o.z) < ORB_R) game?.hurtPlayer?.(1, o.x, o.z, 9);
      }
    }

    // aanraking
    if (this.touchCool <= 0 && this.alt < 0.5 && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < this.r + 0.5) {
      game?.hurtPlayer?.(1, this.pos.x, this.pos.z, 12);
      this.touchCool = 1.1;
    }

    // terugduwen
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }

    this.mesh.position.y = this.alt;
    this.mesh.rotation.y = this.rot;
    if (this.state !== 'jump' || this.t >= 1.1) this.shadow.position.set(this.pos.x, 0.04, this.pos.z);
    this.animate(dt, Math.hypot(this.kx, this.kz) > 0.5 ? 0 : (this.state === 'idle' ? 1 : 0));
  }

  animate(dt, walk) {
    const t = performance.now() / 1000;
    this.rig.position.y = Math.sin(t * 3) * 0.04;
    this.crown.rotation.y = t * 0.4;
    if (walk) {
      this.arms[0].rotation.x = Math.sin(t * 6) * 0.35;
      this.arms[1].rotation.x = Math.sin(t * 6 + Math.PI) * 0.35;
    }
  }
}

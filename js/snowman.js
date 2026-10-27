// Sneeuwpoppen in De IJswereld (idee van Dex). Ze lopen niet, maar ze GOOIEN!
// - Ziet een sneeuwpop je? Dan tilt hij zijn arm op en komt er een blauw rondje op de grond (daar landt de sneeuwbal).
// - Ga snel uit het rondje! Wie geraakt wordt: 1 hartje.
// - Sla hem met je zwaard (of laat je clones helpen). Elke klap: er vliegt wat sneeuw af.
// Hij werkt net als een slijmpje: pos, r, dead, removed, update(), hurt() en remove().
import * as THREE from 'three';
import { mat } from './characters.js';
import { difficulty } from './difficulty.js';

export const SNOWBALL_R = 1.25;   // zo groot is het rondje
const SEE = 13;                   // zo ver kijkt hij
const AIM_T = 0.9, FLY_T = 0.85;  // richten, en dan zo lang vliegt de sneeuwbal

const snowM = mat(0xffffff, { roughness: 0.9, emissive: 0x000000 });
const coalM = mat(0x1d1d1d), carrotM = mat(0xff8c42), stickM = mat(0x6b4f3a), scarfM = [mat(0xe63946), mat(0x2f9e44), mat(0x7048e8)];
const hatM = mat(0x343a40);
const ballGeo = new THREE.IcosahedronGeometry(1, 1), stickGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 5);
const snowballGeo = new THREE.IcosahedronGeometry(0.32, 1);
const warnGeo = new THREE.RingGeometry(SNOWBALL_R - 0.22, SNOWBALL_R, 22).rotateX(-Math.PI / 2), fillGeo = new THREE.CircleGeometry(SNOWBALL_R, 22).rotateX(-Math.PI / 2);

export class Snowman {
  constructor(group, x, z, n = 0) {
    const D = difficulty('ijs');
    this.kind = 'sneeuwpop';
    this.color = 0xffffff;
    this.hp = this.maxHp = Math.round(5 * D.hp); // 16
    this.r = 0.85;
    this.loot = 4;
    this.group = group;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.state = 'wait'; this.t = 0; this.cool = 1.5 + (n % 3) * 0.7;
    this.throwCool = 2.6 / D.speed; // tijd tussen twee worpen (wordt korter in moeilijke werelden)

    const g = new THREE.Group();
    this.mesh = g;
    this.bodyM = snowM.clone();
    const ball = (r, y) => { const m = new THREE.Mesh(ballGeo, this.bodyM); m.scale.setScalar(r); m.position.y = y; m.castShadow = true; g.add(m); return m; };
    ball(0.85, 0.75); ball(0.62, 1.95);
    const head = new THREE.Group(); head.position.y = 2.85; g.add(head); this.head = head;
    const hb = new THREE.Mesh(ballGeo, this.bodyM); hb.scale.setScalar(0.45); hb.castShadow = true; head.add(hb);
    for (const sx of [-0.16, 0.16]) { const e = new THREE.Mesh(ballGeo, coalM); e.scale.setScalar(0.06); e.position.set(sx, 0.1, 0.4); head.add(e); }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 5), carrotM); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0, 0.6); head.add(nose);
    for (let i = -2; i <= 2; i++) { const m = new THREE.Mesh(ballGeo, coalM); m.scale.setScalar(0.035); m.position.set(i * 0.08, -0.17 - (2 - Math.abs(i)) * 0.03, 0.4); head.add(m); }
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 10), hatM); brim.position.y = 0.36; head.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.45, 10), hatM); top.position.y = 0.6; head.add(top);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 5, 12), scarfM[n % 3]); scarf.rotation.x = Math.PI / 2; scarf.position.y = 2.5; g.add(scarf);
    for (const sy of [1.65, 1.95, 2.25]) { const b = new THREE.Mesh(ballGeo, coalM); b.scale.setScalar(0.06); b.position.set(0, sy, 0.6); g.add(b); }
    // armen van takjes (de rechterarm gooit)
    this.arms = [-1, 1].map((s) => {
      const a = new THREE.Group(); a.position.set(s * 0.55, 2.05, 0); g.add(a);
      const st = new THREE.Mesh(stickGeo, stickM); st.position.y = 0.45; a.add(st);
      a.rotation.z = -s * 1.0;
      return a;
    });
    this.handBall = new THREE.Mesh(snowballGeo, this.bodyM); this.handBall.position.y = 0.95; this.handBall.visible = false; this.arms[1].add(this.handBall);
    g.position.set(x, 0, z);
    this.pos = g.position;
    this.rot = 0;
    group.add(g);

    // de sneeuwbal en het blauwe rondje op de grond
    this.ball = new THREE.Mesh(snowballGeo, snowM); this.ball.visible = false; this.ball.castShadow = true; group.add(this.ball);
    this.warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0x1c7ed6, transparent: true, opacity: 0.8, depthWrite: false }));
    this.fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.25, depthWrite: false }));
    this.warn.visible = this.fill.visible = false;
    group.add(this.warn, this.fill);
    this.shot = null;
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.ball, this.warn, this.fill);
    this.bodyM.dispose(); // (de vormen en kleuren delen alle sneeuwpoppen, die blijven)
    this.warn.material.dispose(); this.fill.material.dispose();
  }

  face(x, z, dt, sp = 5) {
    let diff = Math.atan2(x - this.pos.x, z - this.pos.z) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rot += diff * Math.min(1, dt * sp);
    this.mesh.rotation.y = this.rot;
  }

  // de sneeuwbal vliegt (ook als de sneeuwpop al om is)
  updateShot(t, dt, game) {
    const s = this.shot;
    if (!s) return;
    s.t += dt;
    const k = Math.min(1, s.t / FLY_T);
    this.ball.visible = true;
    this.ball.position.set(s.fx + (s.x - s.fx) * k, s.fy + (0.3 - s.fy) * k + Math.sin(k * Math.PI) * 3.2, s.fz + (s.z - s.fz) * k);
    this.fill.scale.setScalar(Math.max(0.05, k));
    this.warn.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
    if (k >= 1) {
      this.shot = null;
      this.ball.visible = this.warn.visible = this.fill.visible = false;
      game.fx.poof({ x: s.x, z: s.z }, 0xffffff, 1.2);
      game.fx.sparkle({ x: s.x, y: 0.5, z: s.z }, [0xffffff, 0xd0ebff], 10, 2);
      const p = game.player.pos;
      if (Math.hypot(p.x - s.x, p.z - s.z) < SNOWBALL_R + 0.3) game.hurtPlayer(1, s.x, s.z, 11);
    }
  }

  update(t, dt, game) {
    this.updateShot(t, dt, game);
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.5);
      this.mesh.scale.set(1 + k * 0.4, Math.max(0.01, 1 - k), 1 + k * 0.4); // smelt een beetje plat
      if (k >= 1 && !this.shot) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); this.bodyM.emissive.setHex(this.flash > 0 ? 0x4dabf7 : 0x000000); }
    this.t += dt; this.cool -= dt;
    const p = game.player.pos;
    const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    switch (this.state) {
      case 'wait':
        this.head.rotation.y = Math.sin(t * 0.8 + this.home.x) * 0.4;
        this.arms[1].rotation.z = -1.0;
        if (d < SEE) this.face(p.x, p.z, dt, 3);
        if (d < SEE && this.cool <= 0 && !this.shot && !game.sheltered?.()) {
          this.state = 'aim'; this.t = 0;
          this.target = { x: p.x, z: p.z };
          this.warn.visible = this.fill.visible = true;
          this.handBall.visible = true;
        }
        break;
      case 'aim': {
        // het rondje volgt je nog heel even, dan staat het stil: tijd om weg te gaan!
        this.face(p.x, p.z, dt, 6);
        if (this.t < AIM_T * 0.55) { this.target.x += (p.x - this.target.x) * Math.min(1, dt * 6); this.target.z += (p.z - this.target.z) * Math.min(1, dt * 6); }
        this.warn.position.set(this.target.x, 0.09, this.target.z); this.fill.position.set(this.target.x, 0.08, this.target.z);
        this.fill.scale.setScalar(0.05);
        this.warn.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
        this.arms[1].rotation.z = -1.0 - Math.min(1, this.t / AIM_T) * 2.2; // arm naar achteren
        if (this.t >= AIM_T) {
          this.handBall.visible = false;
          this.shot = { t: 0, x: this.target.x, z: this.target.z, fx: this.pos.x, fy: 2.8, fz: this.pos.z };
          game.sfx.whoosh?.();
          this.state = 'wait'; this.t = 0; this.cool = this.throwCool;
          this.arms[1].rotation.z = 0.6;
        }
        break;
      }
    }
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 10); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    // wiebelen als hij geraakt is
    this.mesh.rotation.z = this.flash > 0 ? Math.sin(t * 50) * 0.08 : 0;
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= dmg;
    this.flash = 0.12; this.invuln = 0.18;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 2; this.kz = (dz / d) * 2;
    game.fx.sparkle({ x: this.pos.x, y: 1.8, z: this.pos.z }, [0xffffff, 0xe7f5ff], 6, 2);
    if (this.state === 'aim') { this.state = 'wait'; this.t = 0; this.cool = 0.8; this.warn.visible = this.fill.visible = false; this.handBall.visible = false; } // schrikken: hij gooit niet
    if (this.hp <= 0) {
      this.dead = true;
      this.bodyM.emissive.setHex(0);
      if (!this.shot) this.warn.visible = this.fill.visible = false;
      game.onSlimeDefeated(this);
    }
    return true;
  }
}

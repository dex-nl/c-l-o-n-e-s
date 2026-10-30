// Spookkoning Sjaak: de baas van Het Spookkasteel (idee van Dex). Een GROOT spook met een gouden kroon en een paarse cape.
// Hij is een plaaggeest (niet gemeen!), maar hij is wel heel sterk:
// - Spookvuurtjes: hij steekt zijn armen omhoog en gooit paarse vuurtjes. Kijk naar de paarse rondjes op de grond en ga eruit!
// - Verdwijntruc: hij wordt onzichtbaar... en er komt een grote paarse ring onder JOU. Ren eruit! Dan verschijnt hij met een BOE!
//   Daarna is hij even duizelig (sterretjes): nu kun je hem extra hard raken!
// - Bij 3/4, 1/2 en 1/4 van zijn leven roept hij 2 spookjes (die geven altijd een hartje).
// - Bij de helft wordt hij boos: meer vuurtjes, sneller, en zijn BOE doet 2 hartjes pijn.
// Hij blijft in de Troonzaal en begint pas als jij daar binnenkomt.
import * as THREE from 'three';
import { mat } from './characters.js';
import { difficulty } from './difficulty.js';
import { makeGhostBody, Ghost } from './ghosts.js';

const ORB_R = 1.35, ORB_T = 1.15, BOO_R = 2.8;
const orbGeo = new THREE.IcosahedronGeometry(0.4, 1);
const warnGeo = new THREE.RingGeometry(ORB_R - 0.22, ORB_R, 22).rotateX(-Math.PI / 2), fillGeo = new THREE.CircleGeometry(ORB_R, 22).rotateX(-Math.PI / 2);

export class GhostKing {
  constructor(group, x, z, throne) {
    const D = difficulty('spook');
    this.D = D;
    this.ghostKing = true;
    this.name = 'Spookkoning Sjaak';
    this.kind = 'spookkoning';
    this.color = 0xd0bfff;
    this.hp = this.maxHp = Math.round(40 * D.bossHp); // 160
    this.r = 1.5;
    this.loot = 25;
    this.group = group;
    this.throne = throne;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.state = 'wait'; this.t = 0; this.cool = 2.0; this.touchCool = 0;
    this.angry = false;
    this.summons = [0.75, 0.5, 0.25];
    this.next = 0; // welke aanval komt nu (vuurtjes, verdwijnen, vuurtjes, ...)
    this.speed = 1.9 * D.speed;
    this.booDamage = 1;
    this.fade = 1;

    const b = makeGhostBody(0xf8f0fc, 0x9775fa);
    this.body = b;
    this.mesh = new THREE.Group();
    b.g.scale.setScalar(2.2);
    this.mesh.add(b.g);
    // gouden kroon
    const gold = mat(0xffc300, { metalness: 0.6, roughness: 0.3, emissive: 0x553300, emissiveIntensity: 0.4 });
    const crown = new THREE.Group(); crown.position.y = 2.25; this.mesh.add(crown);
    crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 10, 1, true), gold));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const s = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 4), gold); s.position.set(Math.cos(a) * 0.55, 0.32, Math.sin(a) * 0.55); crown.add(s); }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), mat(0xe03131, { emissive: 0xc92a2a, emissiveIntensity: 0.8 })); gem.position.set(0, 0.05, 0.63); crown.add(gem);
    this.crown = crown;
    // paarse cape
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.7, 1.9, 12, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: 0x5f3dc4, side: THREE.DoubleSide, transparent: true, flatShading: true }));
    cape.position.set(0, 0.3, -0.25); this.mesh.add(cape); this.capeM = cape.material;
    // sterretjes als hij duizelig is
    this.stars = new THREE.Group(); this.stars.position.y = 2.9; this.stars.visible = false; this.mesh.add(this.stars);
    for (let s = 0; s < 5; s++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0xffd43b })); const a = s / 5 * Math.PI * 2; st.position.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9); this.stars.add(st); }
    this.mesh.position.set(x, 1.2, z);
    this.pos = this.mesh.position;
    this.rot = 0;
    group.add(this.mesh);
    b.shadow.scale.setScalar(2.4); b.shadow.position.set(x, 0.04, z); group.add(b.shadow);

    // de grote paarse ring van de verdwijntruc
    this.booRing = new THREE.Mesh(new THREE.RingGeometry(BOO_R - 0.3, BOO_R, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9c36b5, transparent: true, opacity: 0.8, depthWrite: false }));
    this.booFill = new THREE.Mesh(new THREE.CircleGeometry(BOO_R, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xda77f2, transparent: true, opacity: 0.2, depthWrite: false }));
    this.booRing.visible = this.booFill.visible = false;
    group.add(this.booRing, this.booFill);
    // spookvuurtjes
    this.orbs = [];
    this.orbM = new THREE.MeshBasicMaterial({ color: 0xda77f2 });
  }

  orb(x, z, fx, fz) {
    let o = this.orbs.find((q) => !q.on);
    if (!o) {
      const m = new THREE.Mesh(orbGeo, this.orbM);
      const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0x9c36b5, transparent: true, opacity: 0.8, depthWrite: false }));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xda77f2, transparent: true, opacity: 0.25, depthWrite: false }));
      this.group.add(m, warn, fill);
      o = { m, warn, fill }; this.orbs.push(o);
    }
    const T = this.throne;
    o.x = Math.max(T.x1 + 1, Math.min(T.x2 - 1, x)); o.z = Math.max(T.z1 + 1, Math.min(T.z2 - 1, z));
    o.fx = fx; o.fz = fz; o.t = 0; o.on = true;
    o.m.visible = o.warn.visible = o.fill.visible = true;
    o.warn.position.set(o.x, 0.09, o.z); o.fill.position.set(o.x, 0.08, o.z);
  }

  updateOrbs(t, dt, game) {
    for (const o of this.orbs) {
      if (!o.on) continue;
      o.t += dt;
      const k = Math.min(1, o.t / ORB_T);
      o.m.position.set(o.fx + (o.x - o.fx) * k, 3 + (0.4 - 3) * k + Math.sin(k * Math.PI) * 3, o.fz + (o.z - o.fz) * k);
      o.fill.scale.setScalar(Math.max(0.05, k));
      o.warn.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
      if (k >= 1) {
        o.on = false; o.m.visible = o.warn.visible = o.fill.visible = false;
        game.fx.ring({ x: o.x, z: o.z }, ORB_R, 0xda77f2, 0.45);
        game.fx.sparkle({ x: o.x, y: 0.5, z: o.z }, [0xda77f2, 0xffffff, 0x9775fa], 12, 2.5);
        const p = game.player.pos;
        if (Math.hypot(p.x - o.x, p.z - o.z) < ORB_R + 0.3) game.hurtPlayer(1, o.x, o.z, 11);
      }
    }
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.body.shadow, this.booRing, this.booFill);
    for (const o of this.orbs) this.group.remove(o.m, o.warn, o.fill);
  }

  face(x, z, dt, sp = 5) {
    let diff = Math.atan2(x - this.pos.x, z - this.pos.z) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rot += diff * Math.min(1, dt * sp);
    this.mesh.rotation.y = this.rot;
  }

  setFade(f) {
    this.fade = f;
    this.body.m.opacity = 0.86 * f; this.body.m.depthWrite = f > 0.9;
    this.capeM.opacity = f; this.crown.visible = f > 0.3;
    this.body.shadow.material.opacity = 0.25 * f;
  }

  update(t, dt, game) {
    this.updateOrbs(t, dt, game);
    const b = this.body;
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 1.0);
      this.pos.y += dt * 2; this.mesh.rotation.y += dt * 6; this.setFade(1 - k);
      this.booRing.visible = this.booFill.visible = false;
      if (k >= 1 && !this.orbs.some((o) => o.on)) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    b.m.emissive.setHex(this.flash > 0 ? 0xffffff : this.state === 'dizzy' ? 0xffd43b : 0x9775fa);
    this.t += dt; this.cool -= dt; this.touchCool -= dt;
    const p = game.player.pos;
    const inside = game.zone.inArena?.(p);
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    // hulp roepen
    while (this.summons.length && this.hp <= this.maxHp * this.summons[0]) {
      this.summons.shift();
      for (const [ox, oz] of [[3.5, 1], [-3.5, 1]]) {
        const g = game.addEnemy(new Ghost(this.group, this.pos.x + ox, this.pos.z + oz, { helper: true }));
        game.fx.poof({ x: g.pos.x, z: g.pos.z }, 0xd0bfff, 1.2);
      }
      game.sfx.boing?.(0.8);
    }
    if (!this.angry && this.hp <= this.maxHp / 2) {
      this.angry = true;
      this.speed *= 1.25;
      this.booDamage = this.D.bossDamage;
      this.capeM.color.setHex(0x9c1a3a);
      game.onBossPhase?.(this, '👻 Spookkoning Sjaak wordt boos! Zijn kroon gloeit... Pas op voor zijn BOE!');
    }
    this.crown.rotation.y = t * (this.angry ? 2.2 : 0.7);
    const T = this.throne;
    switch (this.state) {
      case 'wait':
        // rustig op zijn troon zweven, tot jij binnenkomt
        this.face(p.x, p.z, dt, 2);
        if (inside) { this.state = 'float'; this.t = 0; this.cool = 1.6; }
        break;
      case 'float': {
        // achter je aan zweven (niet te dichtbij), en dan een aanval
        this.face(p.x, p.z, dt, 4);
        const want = d > 3.5 ? 1 : d < 2.6 ? -0.6 : 0;
        this.pos.x += (dx / d) * this.speed * want * dt; this.pos.z += (dz / d) * this.speed * want * dt;
        if (!inside && this.t > 1) { this.cool = Math.max(this.cool, 0.8); } // wacht tot je terug bent
        if (this.cool <= 0 && inside) {
          const order = this.angry ? ['orbs', 'boo', 'orbs', 'orbs', 'boo'] : ['orbs', 'orbs', 'boo'];
          this.state = order[this.next++ % order.length]; this.t = 0;
          if (this.state === 'boo') game.sfx.whoosh?.();
        }
        break;
      }
      case 'orbs': {
        // armen omhoog... en dan de vuurtjes (op jou en om je heen)
        this.face(p.x, p.z, dt, 6);
        b.arms[0].position.y = b.arms[1].position.y = 0.1 + Math.min(1, this.t / 0.8) * 0.5;
        if (this.t >= 0.8 && !this.thrown) {
          this.thrown = true;
          const n = this.angry ? 5 : 3;
          this.orb(p.x, p.z, this.pos.x, this.pos.z);
          for (let i = 1; i < n; i++) { const a = (i / (n - 1)) * Math.PI * 2 + Math.random(); this.orb(p.x + Math.cos(a) * 2.8, p.z + Math.sin(a) * 2.8, this.pos.x, this.pos.z); }
          game.sfx.whoosh?.();
        }
        if (this.t >= 1.4) { this.thrown = false; this.state = 'float'; this.t = 0; this.cool = this.angry ? 1.5 : 2.3; b.arms[0].position.y = b.arms[1].position.y = 0.1; }
        break;
      }
      case 'boo': {
        // verdwijnen, een ring onder jou (die volgt je heel even), en dan: BOE!
        const VAN = 0.6, AIM = this.angry ? 1.15 : 1.35;
        this.setFade(Math.max(0.05, 1 - this.t / VAN));
        if (this.t >= VAN) {
          if (!this.target) this.target = { x: p.x, z: p.z };
          if (this.t < VAN + AIM * 0.45) { this.target.x += (p.x - this.target.x) * Math.min(1, dt * 5); this.target.z += (p.z - this.target.z) * Math.min(1, dt * 5); }
          this.target.x = Math.max(T.x1 + 2, Math.min(T.x2 - 2, this.target.x)); this.target.z = Math.max(T.z1 + 2, Math.min(T.z2 - 2, this.target.z));
          this.booRing.visible = this.booFill.visible = true;
          this.booRing.position.set(this.target.x, 0.1, this.target.z); this.booFill.position.set(this.target.x, 0.09, this.target.z);
          this.booFill.scale.setScalar(Math.max(0.05, (this.t - VAN) / AIM));
          this.booRing.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
        }
        if (this.t >= VAN + AIM) {
          this.pos.x = this.target.x; this.pos.z = this.target.z;
          this.setFade(1);
          this.booRing.visible = this.booFill.visible = false;
          game.slam?.(this.target.x, this.target.z, BOO_R + 0.2, 0x9775fa, this.booDamage);
          game.fx.sparkle({ x: this.pos.x, y: 1.5, z: this.pos.z }, [0xda77f2, 0xffffff], 30, 5);
          game.onBoo?.();
          this.target = null;
          this.state = 'dizzy'; this.t = 0;
        }
        break;
      }
      case 'dizzy':
        // duizelig: sterretjes! Nu kun je hem extra hard raken
        this.stars.visible = true; this.stars.rotation.y = t * 5;
        b.g.rotation.z = Math.sin(t * 8) * 0.15;
        if (this.t >= (this.angry ? 2.0 : 2.6)) { this.stars.visible = false; b.g.rotation.z = 0; this.state = 'float'; this.t = 0; this.cool = this.angry ? 1.3 : 2.0; }
        break;
    }
    // aanraken doet pijn (niet als hij onzichtbaar of duizelig is)
    if (this.fade > 0.8 && this.state !== 'dizzy' && this.state !== 'wait' && d < this.r + 0.5 && this.touchCool <= 0) {
      game.hurtPlayer(1, this.pos.x, this.pos.z, 14); this.touchCool = 1.2;
    }
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 10); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    // in de troonzaal blijven
    this.pos.x = Math.max(T.x1 + 1.6, Math.min(T.x2 - 1.6, this.pos.x));
    this.pos.z = Math.max(T.z1 + 1.6, Math.min(T.z2 - 2.5, this.pos.z));
    this.pos.y = 1.2 + Math.sin(t * 2) * 0.25;
    b.shadow.position.set(this.pos.x, 0.04, this.pos.z);
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    if (dmg < 99 && (this.fade < 0.6 || this.state === 'wait')) return false; // onzichtbaar (of nog op zijn troon): mis!
    const dizzy = this.state === 'dizzy';
    this.hp -= dizzy ? dmg * 2 : dmg; // duizelig: dubbel!
    this.flash = 0.12; this.invuln = 0.15;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    if (!dizzy) { this.kx = (dx / d) * 1.5; this.kz = (dz / d) * 1.5; }
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      this.stars.visible = false;
      for (const o of this.orbs) { o.on = false; o.m.visible = o.warn.visible = o.fill.visible = false; }
      game.onSlimeDefeated(this);
    }
    return true;
  }
}

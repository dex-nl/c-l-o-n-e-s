// Reuzeninktvis Inka: de baas van De Onderwaterwereld (idee van Dex). Een grote paarse inktvis met
// grote ogen en een strik. Ze is niet gemeen, maar ze bewaakt stukje 4 van de schatkaart!
// - Tentakelklap: er komen rode banen op de bodem... daar slaan haar tentakels neer. ZWEM OMHOOG of ga opzij!
// - Inktwolk: ze spuit inkt (alles wordt even donker) en zwemt snel naar een andere plek.
// - Draaikolk: het water draait en trekt je naar haar toe. Zwem weg! (Haar snavel doet pijn.)
// - Bij 2/3 en 1/3 van haar leven roept ze 2 kwallen (die geven altijd een hartje).
// - Bij de helft wordt ze boos: sneller, en haar tentakels doen 2 hartjes.
// Raken: zwem ongeveer even hoog als haar kop (ze zweeft een beetje boven de bodem).
import * as THREE from 'three';
import { mat, disposeTree } from './characters.js';
import { difficulty } from './difficulty.js';
import { Jelly } from './seacreatures.js';

export const SLAM_LEN = 9.5, SLAM_HALF = 0.85, SLAM_SAFE_Y = 2.2; // tentakelbaan: lengte, halve breedte, en hoger dan dit ben je veilig
const BODY_Y = 2.4;

export class Squid {
  constructor(group, x, z, arena) {
    this.kind = 'inktvis';
    this.squid = true;
    this.boss = false; this.king = false;
    this.name = 'Reuzeninktvis Inka';
    this.color = 0x9775fa;
    this.D = difficulty('onderwater');
    this.hp = this.maxHp = Math.round(40 * this.D.bossHp); // 120 (zie difficulty.js)
    this.r = 2.0;
    this.loot = 30;
    this.group = group;
    this.home = { x, z };
    this.arena = arena;
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.state = 'wait'; // wait | swim | slam | ink | whirl
    this.t = 0;
    this.slamCool = 2.5; this.inkCool = 9; this.whirlCool = 14;
    this.summons = [2 / 3, 1 / 3];
    this.angry = false;
    this.slamDamage = 1;
    this.lanes = [];

    const g = new THREE.Group();
    this.mesh = g;
    this.bodyM = mat(this.color, { emissive: 0x000000, roughness: 0.5 });
    const light = mat(0xd0bfff), white = mat(0xffffff), black = mat(0x1d1d1d), pink = mat(0xff8fab), bow = mat(0xff6b9d);
    this.rig = new THREE.Group(); g.add(this.rig);
    // kop (een grote ronde muts) en lijf
    const mantle = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 2), this.bodyM);
    mantle.scale.set(1, 1.45, 1); mantle.position.y = 1.2; mantle.castShadow = true; this.rig.add(mantle);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 4), this.bodyM);
    fin.position.y = 3.2; fin.scale.set(1.4, 1, 0.4); this.rig.add(fin);
    for (let i = 0; i < 7; i++) { // vlekjes
      const a = i * 0.9, s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), light);
      s.position.set(Math.sin(a) * 1.3, 1.6 + (i % 3) * 0.45, Math.cos(a) * 1.3 - 0.2); this.rig.add(s);
    }
    // gezicht
    for (const sx of [-0.55, 0.55]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), white); eye.position.set(sx, 0.55, 1.05); eye.scale.z = 0.6; this.rig.add(eye);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), black); pu.position.set(sx, 0.52, 1.28); this.rig.add(pu);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), white); sh.position.set(sx - 0.08, 0.63, 1.42); this.rig.add(sh);
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), pink); ch.position.set(sx * 1.6, 0.18, 0.95); ch.scale.z = 0.4; this.rig.add(ch);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 4, 10, Math.PI), black);
    smile.rotation.z = Math.PI; smile.position.set(0, 0.05, 1.32); this.rig.add(smile);
    // een strik op haar kop
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), bow); b.position.set(s * 0.4, 2.95, 0.6); b.rotation.z = s * Math.PI / 2; this.rig.add(b); }
    { const knot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), bow); knot.position.set(0, 2.95, 0.62); this.rig.add(knot); }
    // 8 tentakels (elk 4 stukjes)
    this.arms = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const root = new THREE.Group();
      root.position.set(Math.sin(a) * 0.9, -0.1, Math.cos(a) * 0.9);
      root.rotation.y = a;
      this.rig.add(root);
      let parent = root;
      const segs = [];
      for (let k = 0; k < 4; k++) {
        const seg = new THREE.Group();
        seg.position.set(0, k ? -0.55 : 0, 0);
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.3 - k * 0.05, 8, 6), k % 2 ? light : this.bodyM);
        m.scale.set(1, 1.6, 1); seg.add(m);
        parent.add(seg); segs.push(seg); parent = seg;
      }
      this.arms.push({ root, segs, a });
    }
    // de grote tentakels voor de klap (liggen eerst opgerold)
    this.slamArms = [];
    // rode banen op de bodem
    this.laneM = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.35, depthWrite: false });
    this.laneGeo = new THREE.PlaneGeometry(SLAM_HALF * 2, SLAM_LEN).rotateX(-Math.PI / 2).translate(0, 0, SLAM_LEN / 2);
    this.laneMeshes = Array.from({ length: 4 }, () => {
      const m = new THREE.Mesh(this.laneGeo, this.laneM); m.visible = false; group.add(m);
      const armM = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, SLAM_LEN, 8).rotateX(Math.PI / 2).translate(0, 0, SLAM_LEN / 2), this.bodyM);
      armM.visible = false; group.add(armM);
      return { m, armM };
    });
    // de draaikolk (een ring die ronddraait)
    this.whirlM = new THREE.MeshBasicMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide });
    this.whirl = new THREE.Mesh(new THREE.RingGeometry(1.5, 9, 32, 1, 0, Math.PI * 1.6).rotateX(-Math.PI / 2), this.whirlM);
    this.whirl.visible = false; group.add(this.whirl);

    g.position.set(x, BODY_Y, z);
    this.pos = g.position;
    this.rot = 0;
    group.add(g);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.whirl, ...this.laneMeshes.flatMap((l) => [l.m, l.armM]));
    disposeTree(this.mesh);
    this.laneGeo.dispose(); this.laneM.dispose(); this.whirl.geometry.dispose(); this.whirlM.dispose();
    for (const l of this.laneMeshes) l.armM.geometry.dispose();
  }

  pickTarget(game) {
    let best = game.player.pos, bestD = Math.hypot(best.x - this.pos.x, best.z - this.pos.z);
    for (const c of game.squad.list) {
      if (c.spawning > 0) continue;
      const d = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (d < bestD - 2) { bestD = d; best = c.pos; }
    }
    return { p: best, d: bestD };
  }

  face(x, z, dt, speed = 4) {
    let diff = Math.atan2(x - this.pos.x, z - this.pos.z) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rot += diff * Math.min(1, dt * speed);
    this.mesh.rotation.y = this.rot;
  }

  // ligt punt p in een tentakelbaan (en zwemt het lager dan SLAM_SAFE_Y)?
  inLane(p) {
    if ((p.y || 0) >= SLAM_SAFE_Y) return false;
    for (const l of this.lanes) {
      const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
      const along = dx * Math.sin(l) + dz * Math.cos(l), side = dx * Math.cos(l) - dz * Math.sin(l);
      if (along > 0 && along < SLAM_LEN + 0.3 && Math.abs(side) < SLAM_HALF + 0.35) return true;
    }
    return false;
  }

  get inkActive() { return this.state === 'ink' && this.t < 2.2; }

  update(t, dt, game) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 1.2);
      this.mesh.rotation.y += dt * 8;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - k));
      this.pos.y = BODY_Y + k * 3;
      this.whirl.visible = false;
      for (const l of this.laneMeshes) l.m.visible = l.armM.visible = false;
      if (k >= 1) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); this.bodyM.emissive.setScalar(this.flash > 0 ? 0.6 : 0); }
    this.t += dt;
    this.slamCool -= dt; this.inkCool -= dt; this.whirlCool -= dt;
    const { p, d } = this.pickTarget(game);
    const pp = game.player.pos;
    const near = Math.hypot(pp.x - this.home.x, pp.z - this.home.z) < this.arena.r + 1;
    // hulp roepen
    while (this.summons.length && this.hp <= this.maxHp * this.summons[0]) {
      this.summons.shift();
      for (const [dx, dz] of [[3.5, 2], [-3.5, 2]]) {
        const j = game.addEnemy?.(new Jelly(this.group, this.pos.x + dx, this.pos.z + dz, true));
        if (j) game.fx.poof(j.pos, 0xda77f2, 1.2);
      }
    }
    if (!this.angry && this.hp <= this.maxHp / 2) {
      this.angry = true;
      this.slamDamage = this.D.bossDamage;
      game.onBossPhase?.(this, '🦑 Reuzeninktvis Inka wordt boos! Pas op voor haar tentakels!');
    }
    let wiggle = 1;
    switch (this.state) {
      case 'wait':
        if (near && this.t > 0.8) { this.state = 'swim'; this.t = 0; }
        break;
      case 'swim': {
        this.face(p.x, p.z, dt, 3);
        if (!near) {
          const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z, dd = Math.hypot(dx, dz);
          if (dd > 0.5) { this.pos.x += (dx / dd) * 2 * dt; this.pos.z += (dz / dd) * 2 * dt; } else { this.state = 'wait'; this.t = 0; }
          break;
        }
        if (this.t > 0.7) {
          if (this.whirlCool <= 0) { this.state = 'whirl'; this.t = 0; game.sfx.rumble?.(); break; }
          if (this.inkCool <= 0) { this.state = 'ink'; this.t = 0; this.inked = false; break; }
          if (this.slamCool <= 0 && d < SLAM_LEN) { this.startSlam(p); break; }
        }
        // een beetje afstand houden (niet bovenop je zwemmen)
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dd = Math.hypot(dx, dz) || 1;
        const want = dd > 4.2 ? 1 : dd < 3.2 ? -0.6 : 0;
        const sp = (this.angry ? 2.6 : 2.0) * want * dt;
        this.pos.x += (dx / dd) * sp; this.pos.z += (dz / dd) * sp;
        break;
      }
      case 'slam': {
        // eerst rode banen (richten), dan KLAP, dan liggen de tentakels nog even
        const AIM = this.angry ? 0.95 : 1.25, HIT = 0.25, LIE = 1.0;
        const show = this.t < AIM + HIT + LIE;
        this.lanes.forEach((a, i) => {
          const L = this.laneMeshes[i];
          L.m.visible = show; L.m.position.set(this.pos.x, 0.07, this.pos.z); L.m.rotation.y = a;
          L.armM.position.set(this.pos.x, 0, this.pos.z); L.armM.rotation.y = a;
          if (this.t < AIM) {
            L.armM.visible = true;
            L.armM.position.y = 7; // hoog in de lucht, klaar om te slaan
            L.armM.rotation.x = -0.9;
            this.laneM.opacity = 0.2 + Math.abs(Math.sin(this.t * 12)) * 0.35;
          } else {
            const k = Math.min(1, (this.t - AIM) / HIT);
            L.armM.position.y = 7 * (1 - k) + 0.25 * k; L.armM.rotation.x = -0.9 * (1 - k);
            this.laneM.opacity = 0.55;
          }
        });
        if (this.t >= AIM + HIT && !this.slammed) {
          this.slammed = true;
          game.sfx.slam?.();
          game.shake?.(0.6);
          for (const a of this.lanes) for (let r = 2; r < SLAM_LEN; r += 2.2) game.fx.poof({ x: this.pos.x + Math.sin(a) * r, y: 0.3, z: this.pos.z + Math.cos(a) * r }, 0xc5f6fa, 0.6);
        }
        if (this.slammed && this.t < AIM + HIT + 0.2 && this.inLane(pp)) game.hurtPlayer(this.slamDamage, this.pos.x, this.pos.z, 12);
        if (!show) {
          for (const L of this.laneMeshes) L.m.visible = L.armM.visible = false;
          this.lanes = [];
          this.state = 'swim'; this.t = 0;
          this.slamCool = this.angry ? 2.6 : 3.6;
        }
        break;
      }
      case 'ink': {
        // inkt spuiten (alles even donker), en snel wegzwemmen naar een andere plek
        if (!this.inked) {
          this.inked = true;
          game.fx.poof({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 0x1d1d1d, 3);
          game.onInk?.(this);
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * (this.arena.r - 5);
          this.to = { x: this.arena.x + Math.sin(a) * r, z: this.arena.z + Math.cos(a) * r };
        }
        const dx = this.to.x - this.pos.x, dz = this.to.z - this.pos.z, dd = Math.hypot(dx, dz);
        if (dd > 0.3) { const sp = Math.min(dd, 7 * dt); this.pos.x += (dx / dd) * sp; this.pos.z += (dz / dd) * sp; }
        wiggle = 2.5;
        if (this.t > 2.6) { this.state = 'swim'; this.t = 0; this.inkCool = this.angry ? 9 : 12; }
        break;
      }
      case 'whirl': {
        // draaikolk: het water trekt je naar haar toe (3 seconden)
        const DUR = 3.2;
        this.whirl.visible = true;
        this.whirl.position.set(this.pos.x, 0.1, this.pos.z);
        this.whirl.rotation.y = -t * 4;
        this.whirlM.opacity = Math.min(0.45, this.t * 0.8) * (this.t > DUR - 0.4 ? (DUR - this.t) / 0.4 : 1);
        this.mesh.rotation.y = this.rot + this.t * 6;
        if (this.t > 0.4) {
          const dx = this.pos.x - pp.x, dz = this.pos.z - pp.z, dd = Math.hypot(dx, dz);
          if (dd < 10 && dd > 0.5) game.pullPlayer?.((dx / dd) * (this.angry ? 3.0 : 2.5), (dz / dd) * (this.angry ? 3.0 : 2.5), dt);
        }
        wiggle = 3;
        if (this.t > DUR) { this.state = 'swim'; this.t = 0; this.whirl.visible = false; this.whirlCool = this.angry ? 11 : 15; this.mesh.rotation.y = this.rot; }
        break;
      }
    }
    if (this.state !== 'whirl') this.whirl.visible = false;
    // zweven en tentakels laten golven
    this.pos.y = BODY_Y + Math.sin(t * 1.3) * 0.35;
    this.arms.forEach((arm, i) => arm.segs.forEach((s, k) => { s.rotation.x = Math.sin(t * 2.4 * wiggle + i + k * 0.8) * 0.25 + (k === 0 ? 0.5 : 0); }));
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    // binnen de trog blijven
    const ax = this.pos.x - this.arena.x, az = this.pos.z - this.arena.z, ar = Math.hypot(ax, az), lim = this.arena.r - 2.5;
    if (ar > lim) { this.pos.x = this.arena.x + ax / ar * lim; this.pos.z = this.arena.z + az / ar * lim; }
    // tegen haar snavel aan zwemmen doet pijn (alleen als je even hoog bent)
    const py = (pp.y || 0) + 0.7;
    if (Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < this.r * 0.8 + 0.4 && py > this.pos.y - 1.6 && py < this.pos.y + 2.6) game.hurtPlayer(1, this.pos.x, this.pos.z);
  }

  startSlam(p) {
    this.state = 'slam'; this.t = 0; this.slammed = false;
    const a0 = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    const n = this.angry ? 3 : 2;
    const spread = 0.55;
    this.lanes = n === 2 ? [a0 - spread / 2, a0 + spread / 2 + (Math.random() < 0.5 ? 1.6 : -1.6)] : [a0, a0 + 2.1, a0 - 2.1];
    if (n === 2 && Math.random() < 0.5) this.lanes[0] = a0;
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= dmg;
    this.flash = 0.12; this.invuln = 0.25;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 2; this.kz = (dz / d) * 2;
    if (this.hp <= 0) {
      this.dead = true;
      this.bodyM.emissive.setScalar(0);
      this.whirl.visible = false;
      for (const l of this.laneMeshes) l.m.visible = l.armM.visible = false;
      game.onSlimeDefeated(this);
    }
    return true;
  }
}

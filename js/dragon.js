// Vuurdraak Vonk: de baas van De Vulkaan (idee van Dex). Een grote rode draak met grote ogen
// en kleine hoorntjes. Hij is niet gemeen, maar hij bewaakt stukje 3 van de schatkaart!
// - Vuuradem: hij kijkt je aan en er komt een rode punt op de grond... ga opzij! Dan blaast hij vuur.
// - Vliegen: hij vliegt omhoog (dan kun je hem niet raken). Kijk naar de schaduw: daar landt hij met een KLAP.
// - Vuurregen: hij brult en er vallen vuurballen om je heen (kijk naar de rode rondjes).
// - Bij 2/3 en 1/3 van zijn leven roept hij 2 lavamonsters (die geven altijd een hartje).
// - Bij de helft wordt hij boos: sneller, vaker vuur, en zijn klappen doen 2 hartjes.
// Hij werkt net als een slijmpje: pos, r, dead, removed, update() en hurt().
// IJsdraak IJzel (de baas van De IJswereld) is ook zo'n draak, maar dan van ijs: zie ICE_DRAGON hieronder.
import * as THREE from 'three';
import { mat, disposeTree } from './characters.js';
import { collide } from './physics.js';
import { difficulty } from './difficulty.js';

const ball = (r, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};
const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};
export const BREATH_RANGE = 7.5, BREATH_HALF = 0.42; // zo ver en zo breed is de vuuradem
const FLY_H = 6;

// Hoe ziet de draak eruit en hoe snel is hij? (Vuurdraak Vonk is de gewone draak)
const FIRE_DRAGON = {
  zone: 'vulkaan', name: 'Vuurdraak Vonk', ice: false, baseHp: 40,
  color: 0xe63946, belly: 0xffd166, dark: 0xa4161a, wing: 0xff8c42, horn: 0xfff1d0,
  aim: 0xff4d6d, fire: 0xff9f1c, flames: [0xff9f1c, 0xffd23f, 0xe63946], slamColor: 0xff7b39, helper: 'lava',
  walk: [2.3, 3.0], breathCool: [3.8, 2.6], flyCool: [8, 5.5], rainCool: [11, 8], rainN: [5, 7], aimT: [1.1, 0.85], flyAim: [1.7, 1.3],
  angryMsg: '🐉 Vuurdraak Vonk wordt boos! Pas op voor zijn vuur!',
};
// IJsdraak IJzel (De IJswereld, idee van Dex): sneller, sterker, en zijn ijsadem bevriest je even (dan loop je langzaam)
export const ICE_DRAGON = {
  zone: 'ijs', name: 'IJsdraak IJzel', ice: true, baseHp: 40,
  color: 0x74c0fc, belly: 0xe7f5ff, dark: 0x1971c2, wing: 0xa5d8ff, horn: 0xffffff,
  aim: 0x4dabf7, fire: 0xd0ebff, flames: [0xffffff, 0xd0ebff, 0x74c0fc], slamColor: 0x9bf6ff, helper: 'ijs',
  walk: [2.6, 3.4], breathCool: [3.2, 2.2], flyCool: [7, 4.8], rainCool: [9, 6.5], rainN: [5, 8], aimT: [1.0, 0.8], flyAim: [1.5, 1.15],
  angryMsg: '🐲 IJsdraak IJzel wordt boos! Pas op voor zijn ijsadem!',
};

export class Dragon {
  constructor(group, x, z, look = FIRE_DRAGON) {
    const o = this.o = look;
    this.kind = o.ice ? 'ijsdraak' : 'draak';
    this.dragon = !o.ice;     // Vuurdraak Vonk
    this.iceDragon = !!o.ice; // IJsdraak IJzel
    this.boss = false; this.king = false;
    this.name = o.name;
    this.color = o.color;
    this.D = difficulty(o.zone);
    this.hp = this.maxHp = Math.round(o.baseHp * this.D.bossHp); // Vonk 100, IJzel 140 (zie difficulty.js)
    this.r = 1.8;
    this.loot = 25;
    this.group = group;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0;
    this.kx = 0; this.kz = 0;
    this.state = 'wait'; // wait | walk | breath | fly | rain
    this.t = 0;
    this.breathCool = 2.5;
    this.flyCool = 7;
    this.rainCool = 11;
    this.summons = [2 / 3, 1 / 3];
    this.angry = false;
    this.slamDamage = 1;

    const g = new THREE.Group();
    this.mesh = g;
    this.bodyM = mat(this.color, { emissive: 0x000000 });
    const belly = mat(o.belly), dark = mat(o.dark), white = mat(0xffffff), black = mat(0x1d1d1d), horn = mat(o.horn), pink = mat(0xff8fab);
    const wingM = mat(o.wing, { side: THREE.DoubleSide, ...(o.ice ? { transparent: true, opacity: 0.85 } : {}) });
    this.rig = new THREE.Group();
    g.add(this.rig);
    // lijf en buik
    const body = ball(1.2, this.bodyM, 0, 1.5, 0); body.scale.set(1.1, 1, 1.35); this.rig.add(body);
    const tum = ball(0.95, belly, 0, 1.35, 0.55); tum.scale.set(0.95, 0.95, 0.7); this.rig.add(tum);
    // stekeltjes op de rug
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 4), belly); s.position.set(0, 2.6 - i * 0.1, 0.4 - i * 0.45); s.rotation.x = -0.5; this.rig.add(s); }
    // hoofd met een lief gezicht
    const head = new THREE.Group();
    head.position.set(0, 2.75, 1.25);
    this.rig.add(head);
    const hb = ball(0.75, this.bodyM); hb.scale.set(1.1, 0.95, 1); head.add(hb);
    const snout = ball(0.5, this.bodyM, 0, -0.18, 0.62); snout.scale.set(1.05, 0.7, 0.9); head.add(snout);
    for (const sx of [-0.18, 0.18]) head.add(ball(0.06, black, sx, -0.08, 1.05)); // neusgaten
    for (const sx of [-0.32, 0.32]) {
      const eye = ball(0.25, white, sx, 0.25, 0.5); eye.scale.z = 0.6; head.add(eye);
      head.add(ball(0.13, black, sx, 0.25, 0.65));
      head.add(ball(0.045, white, sx - 0.05, 0.31, 0.74));
      const cheek = ball(0.11, pink, sx * 1.9, -0.05, 0.45); cheek.scale.z = 0.4; head.add(cheek);
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 5), horn);
      h.position.set(sx * 1.1, 0.75, -0.1); h.rotation.set(-0.4, 0, -sx * 0.9); head.add(h);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 4, 10, Math.PI), black);
    smile.rotation.z = Math.PI; smile.position.set(0, -0.32, 0.98); head.add(smile);
    this.head = head;
    // vleugels
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(2.4, 0.9); wingShape.lineTo(2.1, -0.3); wingShape.lineTo(1.5, -0.1); wingShape.lineTo(1.1, -0.7); wingShape.lineTo(0.6, -0.2); wingShape.lineTo(0, -0.6);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    this.wings = [-1, 1].map((sgn) => {
      const w = new THREE.Group();
      w.position.set(sgn * 0.8, 2.3, -0.2);
      const m = new THREE.Mesh(wingGeo, wingM);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(sgn, 1, 1);
      w.add(m);
      this.rig.add(w);
      return { w, sgn };
    });
    // pootjes
    this.legs = [];
    for (const sx of [-0.75, 0.75]) for (const lz of [-0.6, 0.7]) {
      const l = box(0.45, 0.8, 0.5, dark, sx, 0.4, lz);
      this.rig.add(l); this.legs.push(l);
    }
    // staart met een pijlpuntje
    this.tail = new THREE.Group();
    this.tail.position.set(0, 1.2, -1.5);
    this.rig.add(this.tail);
    let parent = this.tail;
    this.tailBits = [];
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, i ? -0.55 : 0);
      seg.add(ball(0.42 - i * 0.06, i % 2 ? dark : this.bodyM));
      parent.add(seg); this.tailBits.push(seg); parent = seg;
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 4), belly);
    tip.position.set(0, 0, -0.6); tip.rotation.x = -Math.PI / 2; parent.add(tip);

    // de rode punt op de grond (hier komt de vuuradem)
    this.cone = new THREE.Mesh(new THREE.CircleGeometry(BREATH_RANGE, 18, -Math.PI / 2 - BREATH_HALF, BREATH_HALF * 2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: o.aim, transparent: true, opacity: 0.35, depthWrite: false }));
    this.cone.visible = false;
    group.add(this.cone);
    // schaduw (waar hij landt)
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
    this.shadow.visible = false;
    group.add(this.shadow);

    g.position.set(x, 0, z);
    this.pos = g.position;
    this.rot = 0;
    group.add(g);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.cone, this.shadow);
    disposeTree(this.mesh);
    this.cone.geometry.dispose(); this.shadow.geometry.dispose();
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

  // Staat de speler in de vuuradem?
  inBreath(p) {
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > BREATH_RANGE + 0.3) return false;
    if (d < this.r + 0.2) return true;
    let diff = Math.atan2(dx, dz) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < BREATH_HALF + 0.08;
  }

  get flying() { return this.state === 'fly' && this.pos.y > 1.2; }

  update(t, dt, game) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 1.0);
      this.mesh.rotation.y += dt * 10;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - k));
      this.pos.y = Math.sin(k * Math.PI) * 2;
      this.cone.visible = this.shadow.visible = false;
      if (k >= 1) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      this.bodyM.emissive.setScalar(this.flash > 0 ? 0.6 : 0);
    }
    this.t += dt;
    this.breathCool -= dt; this.flyCool -= dt; this.rainCool -= dt;
    const { p, d } = this.pickTarget(game);
    const near = Math.hypot(game.player.pos.x - this.home.x, game.player.pos.z - this.home.z) < 13;
    // hulp roepen
    while (this.summons.length && this.hp <= this.maxHp * this.summons[0] && this.state !== 'fly') {
      this.summons.shift();
      for (const [dx, dz] of [[3, 1.5], [-3, -1.5]]) {
        const h = game.spawnSlime(this.pos.x + dx, this.pos.z + dz, this.o.helper);
        if (h) h.helper = true; // geeft altijd een hartje
      }
    }
    if (!this.angry && this.hp <= this.maxHp / 2) {
      this.angry = true;
      this.slamDamage = this.D.bossDamage;
      game.onBossPhase?.(this, this.o.angryMsg);
    }
    let walk = 0;
    switch (this.state) {
      case 'wait':
        if (near && this.t > 0.8) { this.state = 'walk'; this.t = 0; }
        break;
      case 'walk': {
        this.face(p.x, p.z, dt, 3);
        if (!near && Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) < 1) { this.state = 'wait'; this.t = 0; break; }
        if (near && this.t > 0.6) {
          if (this.rainCool <= 0) { this.state = 'rain'; this.t = 0; this.rained = 0; game.sfx.rumble?.(); break; }
          if (this.flyCool <= 0) { this.state = 'fly'; this.t = 0; this.to = null; game.sfx.whoosh?.(); break; }
          if (this.breathCool <= 0 && d < BREATH_RANGE) { this.state = 'breath'; this.t = 0; this.burned = false; break; }
        }
        const goal = near ? p : this.home;
        if (Math.hypot(goal.x - this.pos.x, goal.z - this.pos.z) > this.r + 1.6) {
          if (!near) this.face(goal.x, goal.z, dt, 3);
          const sp = this.o.walk[this.angry ? 1 : 0] * dt;
          this.pos.x += Math.sin(this.rot) * sp;
          this.pos.z += Math.cos(this.rot) * sp;
          walk = 1;
        }
        break;
      }
      case 'breath': {
        // eerst richten (rode punt op de grond), dan VUUR
        const AIM = this.o.aimT[this.angry ? 1 : 0], FIRE = 1.1;
        if (this.t < AIM * 0.5) this.face(p.x, p.z, dt, 4); // daarna draait hij niet meer: tijd om opzij te gaan
        this.cone.visible = true;
        this.cone.position.set(this.pos.x, 0.07, this.pos.z);
        this.cone.rotation.y = this.rot;
        this.head.rotation.x = this.t < AIM ? -0.25 : 0.15;
        if (this.t < AIM) {
          this.cone.material.color.setHex(this.o.aim);
          this.cone.material.opacity = 0.2 + Math.abs(Math.sin(this.t * 12)) * 0.3;
        } else {
          this.cone.material.color.setHex(this.o.fire);
          this.cone.material.opacity = 0.5;
          if (!this.burned) { this.burned = true; game.sfx.whoosh?.(); }
          // vlammen
          for (let i = 0; i < 3; i++) {
            const a = this.rot + (Math.random() - 0.5) * BREATH_HALF * 2, r = 1.5 + Math.random() * (BREATH_RANGE - 1.5);
            game.fx.sparkle({ x: this.pos.x + Math.sin(a) * r, y: 0.6 + Math.random(), z: this.pos.z + Math.cos(a) * r }, this.o.flames, 2, 1.2);
          }
          if (this.inBreath(game.player.pos)) {
            if (this.o.ice && game.player.invuln <= 0) game.freezePlayer?.(1.6); // ijsadem: even bevroren (langzaam)
            game.hurtPlayer(this.slamDamage, this.pos.x, this.pos.z, 14);
          }
        }
        if (this.t > AIM + FIRE) {
          this.state = 'walk'; this.t = 0; this.cone.visible = false; this.head.rotation.x = 0;
          this.breathCool = this.o.breathCool[this.angry ? 1 : 0];
        }
        break;
      }
      case 'fly': {
        // omhoog (0,8 s), de schaduw volgt je (1,6 s), dan omlaag met een KLAP
        const UP = 0.8, AIMT = this.o.flyAim[this.angry ? 1 : 0], DOWN = 0.45;
        this.wings.forEach((w) => { w.w.rotation.z = w.sgn * Math.sin(t * 16) * 0.6; });
        if (this.t < UP) {
          this.pos.y = FLY_H * (this.t / UP);
        } else if (this.t < UP + AIMT) {
          this.pos.y = FLY_H;
          // boven je vliegen
          const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dd = Math.hypot(dx, dz) || 1, sp = Math.min(dd, 9 * dt);
          this.pos.x += (dx / dd) * sp; this.pos.z += (dz / dd) * sp;
          this.face(p.x, p.z, dt, 5);
          this.to = { x: this.pos.x, z: this.pos.z };
        } else {
          const k = Math.min(1, (this.t - UP - AIMT) / DOWN);
          this.pos.y = FLY_H * (1 - k * k);
          if (k >= 1) {
            this.pos.y = 0;
            game.slam(this.pos.x, this.pos.z, 3.8, this.o.slamColor, this.slamDamage);
            this.state = 'walk'; this.t = 0;
            this.flyCool = this.o.flyCool[this.angry ? 1 : 0];
            this.wings.forEach((w) => { w.w.rotation.z = 0; });
          }
        }
        // de schaduw: hoe lager hij komt, hoe groter
        this.shadow.visible = this.state === 'fly';
        this.shadow.position.set(this.pos.x, 0.06, this.pos.z);
        this.shadow.scale.setScalar(3.8 * (1 - this.pos.y / FLY_H * 0.45));
        break;
      }
      case 'rain': {
        // brullen, en dan vallen er vuurballen om je heen
        this.face(p.x, p.z, dt, 3);
        this.head.rotation.x = -0.5;
        this.flash = Math.max(this.flash, Math.sin(this.t * 30) > 0 ? 0.02 : 0);
        const n = this.o.rainN[this.angry ? 1 : 0];
        while (this.rained < n && this.t > 0.4 + this.rained * 0.22) {
          const a = Math.random() * Math.PI * 2, r = this.rained === 0 ? 0 : 1.5 + Math.random() * 3.5;
          game.zone.fireball?.(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r);
          this.rained++;
        }
        if (this.t > 0.6 + n * 0.22) { this.state = 'walk'; this.t = 0; this.head.rotation.x = 0; this.rainCool = this.o.rainCool[this.angry ? 1 : 0]; }
        break;
      }
    }
    if (this.state !== 'fly') this.shadow.visible = false;
    if (this.state !== 'breath') this.cone.visible = false;

    // pootjes, vleugels en staart bewegen
    this.legs.forEach((l, i) => { l.rotation.x = walk ? Math.sin(t * 9 + i * 1.6) * 0.5 : 0; });
    if (this.state !== 'fly') this.wings.forEach((w) => { w.w.rotation.z = w.sgn * (0.15 + Math.sin(t * 2) * 0.12); });
    this.tail.rotation.y = Math.sin(t * 2.2) * 0.35;
    if (this.state !== 'breath' && this.state !== 'rain') this.head.rotation.z = Math.sin(t * 1.5) * 0.06;

    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8);
      this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    collide(this.pos, this.r * 0.8, game.zone);
    // tegen hem aan lopen doet ook een beetje pijn
    const pp = game.player.pos;
    if (this.pos.y < 1 && Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < this.r * 0.8 + 0.4) game.hurtPlayer(1, this.pos.x, this.pos.z);
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0 || this.pos.y > 1.2) return false; // in de lucht kun je hem niet raken
    this.hp -= dmg;
    this.flash = 0.12;
    this.invuln = 0.25;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 2; this.kz = (dz / d) * 2;
    if (this.hp <= 0) {
      this.dead = true;
      this.bodyM.emissive.setScalar(0);
      this.cone.visible = this.shadow.visible = false;
      game.onSlimeDefeated(this);
    }
    return true;
  }
}

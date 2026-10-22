// Schorpioen Sjors: de baas van de piramide. Hij is groot en sterk, maar niet eng:
// hij heeft grote ogen, roze wangetjes en een klein rood hoedje.
// Hij knijpt met zijn scharen, stampt met zijn staart (een ring over de grond)
// en als hij boos wordt graaft hij zich in en springt hij onder je vandaan omhoog!
// Hij werkt net als een slijmpje: pos, r, dead, removed, update() en hurt().
import * as THREE from 'three';
import { mat, disposeTree } from './characters.js';
import { collide } from './physics.js';
import { difficulty } from './difficulty.js';

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};
const ball = (r, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};

export class Scorpion {
  constructor(group, x, z) {
    this.kind = 'schorpioen';
    this.boss = true;
    this.king = false;
    this.color = 0xf4a259;
    this.D = difficulty('piramide');
    this.hp = this.maxHp = Math.round(30 * this.D.bossHp); // (zie difficulty.js)
    this.r = 1.5;
    this.loot = 15;
    this.group = group;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0;
    this.kx = 0; this.kz = 0;
    this.state = 'wait'; // wait | walk | pinch | tail | burrow | pop
    this.t = 0;
    this.tailCool = 4;
    this.burrowCool = 0;
    this.angry = false;
    this.furious = false; // 2e fase (bij 1/3 leven): de grote staartzwaai
    this.spinCool = 0;

    const g = new THREE.Group();
    this.mesh = g;
    this.bodyM = mat(this.color, { emissive: 0x000000 });
    const dark = mat(0xd9822b), pink = mat(0xff8fab), white = mat(0xffffff), black = mat(0x1d1d1d), red = mat(0xe63946);
    this.mats = [this.bodyM, dark, pink, white, black, red];
    this.rig = new THREE.Group();
    g.add(this.rig);
    // lijf: drie ronde stukken achter elkaar
    const body = ball(1, this.bodyM, 0, 0.85, 0); body.scale.set(1.15, 0.65, 1.3); this.rig.add(body);
    const back = ball(0.8, this.bodyM, 0, 0.8, -1.2); back.scale.set(1, 0.6, 1); this.rig.add(back);
    for (const z of [-0.5, 0.1, 0.7]) { const s = box(1.9, 0.1, 0.12, dark, 0, 1.36, z); s.rotation.x = 0.2; this.rig.add(s); }
    // hoofd met een lief gezicht
    const head = new THREE.Group();
    head.position.set(0, 1.0, 1.25);
    this.rig.add(head);
    const hb = ball(0.62, this.bodyM); hb.scale.set(1.2, 0.85, 0.9); head.add(hb);
    for (const sx of [-0.3, 0.3]) {
      const eye = ball(0.24, white, sx, 0.32, 0.38); eye.scale.z = 0.6; head.add(eye);
      const pupil = ball(0.12, black, sx, 0.32, 0.52); head.add(pupil);
      const shine = ball(0.045, white, sx - 0.05, 0.38, 0.62); head.add(shine);
      const cheek = ball(0.11, pink, sx * 1.7, 0.02, 0.42); cheek.scale.z = 0.4; head.add(cheek);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 4, 10, Math.PI), black);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.03, 0.55);
    head.add(smile);
    // klein rood hoedje (een fez) met een kwastje
    const fez = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 8), red);
    fez.position.set(0.15, 0.62, 0); fez.rotation.z = -0.25; head.add(fez);
    head.add(ball(0.06, mat(0xffd23f), 0.3, 0.78, 0));
    this.head = head;
    // scharen
    this.claws = [-1, 1].map((sgn) => {
      const arm = new THREE.Group();
      arm.position.set(sgn * 0.9, 0.9, 1.0);
      const a1 = box(0.25, 0.25, 1.0, dark, 0, 0, 0.45); arm.add(a1);
      const hand = new THREE.Group();
      hand.position.set(0, 0, 1.05);
      arm.add(hand);
      const palm = ball(0.38, this.bodyM); palm.scale.set(1, 0.7, 1.1); hand.add(palm);
      const top = new THREE.Group(); top.position.set(0, 0, 0.25); hand.add(top);
      top.add(box(0.18, 0.16, 0.55, this.bodyM, sgn * 0.14, 0, 0.25));
      const bot = new THREE.Group(); bot.position.set(0, 0, 0.25); hand.add(bot);
      bot.add(box(0.18, 0.16, 0.5, dark, -sgn * 0.14, 0, 0.22));
      this.rig.add(arm);
      return { arm, top, bot, sgn };
    });
    // pootjes
    this.legs = [];
    for (const sgn of [-1, 1]) for (const z of [-0.9, -0.2, 0.5]) {
      const p = new THREE.Group();
      p.position.set(sgn * 0.95, 0.75, z);
      const l = box(0.9, 0.14, 0.14, dark, sgn * 0.4, -0.25, 0); l.rotation.z = sgn * -0.6; p.add(l);
      this.rig.add(p);
      this.legs.push({ p, sgn, z });
    }
    // staart: bolletjes die omhoog krullen, met een zachte roze bol aan het eind
    this.tail = new THREE.Group();
    this.tail.position.set(0, 1.0, -1.7);
    this.rig.add(this.tail);
    this.tailBits = [];
    let parent = this.tail;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i ? 0.5 : 0, i ? 0 : 0);
      seg.rotation.x = -0.45;
      seg.add(ball(0.32 - i * 0.03, i % 2 ? dark : this.bodyM));
      parent.add(seg);
      this.tailBits.push(seg);
      parent = seg;
    }
    const tip = ball(0.3, pink, 0, 0.45, 0);
    parent.add(tip);
    this.tip = tip;

    g.position.set(x, 0, z);
    this.pos = g.position;
    this.rot = Math.PI;
    g.rotation.y = this.rot;
    group.add(g);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh);
    disposeTree(this.mesh);
  }

  pickTarget(game) {
    let best = game.player.pos, bestD = Math.hypot(best.x - this.pos.x, best.z - this.pos.z);
    for (const c of game.squad.list) {
      if (c.spawning > 0) continue;
      const d = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (d < bestD - 1.5) { bestD = d; best = c.pos; }
    }
    return { p: best, d: bestD };
  }

  face(x, z, dt, speed = 5) {
    let diff = Math.atan2(x - this.pos.x, z - this.pos.z) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rot += diff * Math.min(1, dt * speed);
    this.mesh.rotation.y = this.rot;
  }

  // Raakt een aanval de speler (en ook de clones schrikken er even van)?
  hits(game, x, z, r) {
    const p = game.player.pos;
    if (Math.hypot(p.x - x, p.z - z) < r) game.hurtPlayer(1, x, z, 14);
  }

  update(t, dt, game) {
    if (this.dead) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.9);
      this.mesh.rotation.y += dt * 12;
      this.mesh.scale.setScalar(Math.max(0.01, 1 - k));
      this.pos.y = Math.sin(k * Math.PI) * 2;
      if (k >= 1) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      this.bodyM.emissive.setScalar(this.flash > 0 ? 0.6 : 0);
    }
    this.t += dt;
    this.tailCool -= dt;
    this.burrowCool -= dt;
    const { p, d } = this.pickTarget(game);
    const near = Math.hypot(game.player.pos.x - this.home.x, game.player.pos.z - this.home.z) < 16;
    let walk = 0;
    // Bij de helft van zijn leven wordt Sjors boos: hij roept 2 mummieslijmpjes en gaat graven
    if (!this.angry && this.hp <= this.maxHp / 2) {
      this.angry = true;
      this.burrowCool = 1;
      game.spawnSlime(this.pos.x + 3, this.pos.z, 'mummie');
      game.spawnSlime(this.pos.x - 3, this.pos.z, 'mummie');
    }

    // Fase 2: bij een derde van zijn leven wordt Sjors HEEL boos: hij zwaait rond met zijn staart
    if (this.angry && !this.furious && this.hp <= this.maxHp / 3) {
      this.furious = true;
      this.spinCool = 0.8;
      game.spawnSlime(this.pos.x, this.pos.z + 3, 'mummie');
      game.spawnSlime(this.pos.x, this.pos.z - 3, 'mummie');
      game.onBossPhase?.(this, '🦂 Sjors wordt HEEL boos! Pas op voor zijn staartzwaai!');
    }
    this.spinCool -= dt;
    switch (this.state) {
      case 'wait':
        if (near && this.t > 0.6) { this.state = 'walk'; this.t = 0; }
        break;
      case 'walk': {
        this.face(p.x, p.z, dt, 4);
        if (this.furious && this.spinCool <= 0 && d < 6) { this.state = 'spin'; this.t = 0; break; }
        if (this.angry && this.burrowCool <= 0 && d > 3) { this.state = 'burrow'; this.t = 0; game.sfx.rumble?.(); break; }
        if (this.tailCool <= 0 && d < 7) { this.state = 'tail'; this.t = 0; break; }
        if (d < this.r + 1.4) { this.state = 'pinch'; this.t = 0; break; }
        const sp = (this.angry ? 3.2 : 2.5) * dt;
        this.pos.x += Math.sin(this.rot) * sp;
        this.pos.z += Math.cos(this.rot) * sp;
        walk = 1;
        if (!near && Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z) < 1) { this.state = 'wait'; this.t = 0; }
        break;
      }
      case 'pinch': {
        // scharen open... en KNIP!
        this.face(p.x, p.z, dt, 3);
        const open = this.t < 0.55;
        for (const c of this.claws) {
          const a = open ? 0.6 : -0.1;
          c.top.rotation.y = c.sgn * a; c.bot.rotation.y = -c.sgn * a;
          c.arm.rotation.x = open ? -0.3 : 0.15;
        }
        if (open) this.flash = Math.max(this.flash, Math.sin(this.t * 30) > 0 ? 0.02 : 0);
        if (!this.pinched && !open) {
          this.pinched = true;
          game.sfx.hit?.();
          const fx = this.pos.x + Math.sin(this.rot) * 2.2, fz = this.pos.z + Math.cos(this.rot) * 2.2;
          this.hits(game, fx, fz, 1.6);
        }
        if (this.t > 1.0) { this.state = 'walk'; this.t = 0; this.pinched = false; }
        break;
      }
      case 'tail': {
        // staart omhoog (je ziet een ring op de grond), dan STAMP
        const up = Math.min(1, this.t / 0.9);
        this.tailBits.forEach((s) => { s.rotation.x = -0.45 - up * 0.35; });
        game.showLanding(this.pos.x, this.pos.z, this.t < 0.9 ? 4.2 * up : 0);
        if (this.t >= 0.9) {
          game.slam(this.pos.x, this.pos.z, 4.2, 0xf4d58d);
          this.tailCool = this.angry ? 3.5 : 5;
          this.state = 'walk'; this.t = 0;
          this.tailBits.forEach((s) => { s.rotation.x = -0.45; });
        }
        break;
      }
      case 'spin': {
        // eerst knipperen en een rode ring (wegwezen!), dan draait hij 2 keer rond met zijn staart
        const R = 4.4;
        if (this.t < 0.9) {
          this.flash = Math.max(this.flash, Math.sin(this.t * 40) > 0 ? 0.03 : 0);
          game.showLanding(this.pos.x, this.pos.z, R * Math.min(1, this.t / 0.5));
          this.tailBits.forEach((s) => { s.rotation.x = -0.2; });
        } else {
          game.showLanding(0, 0, 0);
          this.rot += dt * 14;
          this.mesh.rotation.y = this.rot;
          if (!this.spun) { this.spun = true; game.sfx.slam?.(); game.fx.ring(this.pos, R, 0xffb4a2, 0.5); }
          const p = game.player.pos;
          if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < R) game.hurtPlayer(this.D.bossDamage, this.pos.x, this.pos.z, 18);
        }
        if (this.t > 1.8) { this.state = 'walk'; this.t = 0; this.spun = false; this.spinCool = 6; this.tailBits.forEach((s) => { s.rotation.x = -0.45; }); }
        break;
      }
      case 'burrow': {
        // in het zand zakken, onder de grond naar je toe kruipen
        const k = Math.min(1, this.t / 0.6);
        this.rig.position.y = -2.6 * k;
        if (this.t > 0.6) {
          const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dd = Math.hypot(dx, dz) || 1;
          const sp = Math.min(dd, 7 * dt);
          this.pos.x += (dx / dd) * sp; this.pos.z += (dz / dd) * sp;
          if (Math.random() < 0.5) game.fx.dust(this.pos);
          game.showLanding(this.pos.x, this.pos.z, 2.5);
        }
        if (this.t > 2.4) { this.state = 'pop'; this.t = 0; this.popAt = { x: this.pos.x, z: this.pos.z }; }
        break;
      }
      case 'pop': {
        game.showLanding(this.popAt.x, this.popAt.z, this.t < 0.7 ? 3.4 : 0);
        if (this.t >= 0.7 && !this.popped) {
          this.popped = true;
          game.slam(this.pos.x, this.pos.z, 3.4, 0xf4d58d);
        }
        const k = Math.min(1, Math.max(0, (this.t - 0.7) / 0.3));
        this.rig.position.y = -2.6 * (1 - k) + Math.sin(k * Math.PI) * 1.2;
        if (this.t > 1.2) { this.state = 'walk'; this.t = 0; this.popped = false; this.burrowCool = 7; this.rig.position.y = 0; }
        break;
      }
    }

    // pootjes trippelen, staart wiebelt
    this.legs.forEach((l, i) => { l.p.rotation.x = walk ? Math.sin(t * 16 + i * 1.7) * 0.5 : Math.sin(t * 2 + i) * 0.05; });
    if (this.state !== 'tail') this.tail.rotation.z = Math.sin(t * 2.5) * 0.15;
    this.head.rotation.z = Math.sin(t * 1.7) * 0.06;
    if (this.state !== 'pinch') for (const c of this.claws) c.arm.rotation.x = Math.sin(t * 3 + c.sgn) * 0.12;

    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt; this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 8);
      this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
    }
    collide(this.pos, this.r * 0.8, game.zone);
    // tegen hem aan lopen doet ook een beetje pijn
    const pp = game.player.pos;
    if (!this.underground && Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < this.r * 0.8 + 0.4) game.hurtPlayer(1, this.pos.x, this.pos.z);
  }

  get underground() { return this.state === 'burrow' || (this.state === 'pop' && this.t < 0.7); }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || this.invuln > 0 || this.underground) return false;
    this.hp -= dmg;
    this.flash = 0.12;
    this.invuln = 0.25;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 2; this.kz = (dz / d) * 2;
    if (this.hp <= 0) {
      this.dead = true;
      this.bodyM.emissive.setScalar(0);
      game.showLanding(0, 0, 0);
      game.onSlimeDefeated(this);
    }
    return true;
  }
}

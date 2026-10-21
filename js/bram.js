// Bladkoning Bram: de baas van het doolhof. Een HEEL groot slijm van bladeren met een kroon van blaadjes
// en een snor. Hij is vriendelijk (hij test alleen of je sterk genoeg bent), maar hij is wel taai!
// - Hij springt hoog en landt met een KLAP (2 hartjes!). Kijk naar de schaduw.
// - Doornenkrans: hij knippert, er komt een rode ring om hem heen... weg uit de ring (heel dichtbij of ver weg)! Dan prikken er doornen omhoog.
// - Bij 3/4, 1/2 en 1/4 van zijn leven roept hij 2 heggenslijmpjes (die geven altijd een hartje).
// - Bij de helft wordt hij boos (fase 2): vaker springen en vaker doornen.
import * as THREE from 'three';
import { Slime } from './enemies.js';
import { mat } from './characters.js';
import { difficulty } from './difficulty.js';

const leafGeo = new THREE.ConeGeometry(0.35, 0.9, 4);
export class Bram extends Slime {
  constructor(group, x, z) {
    super(group, x, z, 'bladkoning', 'doolhof');
    this.bram = true;
    this.name = 'Bladkoning Bram';
    this.D = difficulty('doolhof');
    this.split = true;        // (niet de blauwe slijmpjes van Koning Slijm)
    this.slamDamage = this.D.bossDamage;
    this.slamColor = 0x2d9b4e;
    this.summons = [0.75, 0.5, 0.25];
    this.angry = false;
    this.thornCool = 4;
    this.thorn = null;
    this.slamCool = 2.5;
    // kroon van blaadjes en een snor
    const leafM = mat(0x55c26b), goldM = mat(0xffd23f, { emissive: 0x553300, emissiveIntensity: 0.4 });
    const crown = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const l = new THREE.Mesh(leafGeo, i % 2 ? leafM : goldM);
      l.position.set(Math.cos(a) * 0.45, 1.0, Math.sin(a) * 0.45);
      l.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      crown.add(l);
    }
    this.body.add(crown);
    this.crownLeaves = crown;
    const tash = mat(0x6b4f2a);
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.08), tash);
      m.position.set(sx * 0.2, -0.08, 0.98); m.rotation.z = sx * -0.35;
      this.body.children[0].add(m);
    }
    // de rode waarschuwingsring en de doornen
    this.ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.9, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.5, depthWrite: false }));
    this.ring.position.y = 0.06; this.ring.visible = false;
    group.add(this.ring);
    this.spikes = new THREE.Group();
    const sg = new THREE.ConeGeometry(0.22, 1.3, 4), sm = mat(0x6b4f2a);
    for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(sg, sm); const a = (i / 16) * Math.PI * 2; s.position.set(Math.cos(a) * 3.0, 0.6, Math.sin(a) * 3.0); this.spikes.add(s); }
    this.spikes.visible = false;
    group.add(this.spikes);
  }
  remove() { super.remove(); this.group.remove(this.ring, this.spikes); }
  update(t, dt, game) {
    if (!this.dead) {
      // hulp roepen
      while (this.summons.length && this.hp <= this.maxHp * this.summons[0]) {
        this.summons.shift();
        for (const [dx, dz] of [[3, 1], [-3, -1]]) {
          const h = game.spawnSlime(this.pos.x + dx, this.pos.z + dz, 'heg');
          if (h) h.helper = true; // geeft altijd een hartje
        }
      }
      if (!this.angry && this.hp <= this.maxHp / 2) {
        this.angry = true;
        this.speed *= 1.2;
        game.onBossPhase?.(this, '🍃 Bladkoning Bram wordt boos! Pas op voor zijn doornen!');
      }
      this.crownLeaves.rotation.y = t * (this.angry ? 2 : 0.6);
      // doornenkrans (niet tijdens een sprong)
      this.thornCool -= dt;
      if (!this.thorn && !this.jump && this.thornCool <= 0 && this.pickTarget(game)) { this.thorn = { t: 0 }; }
      if (this.thorn) {
        const th = this.thorn;
        th.t += dt;
        this.ring.position.set(this.pos.x, 0.06, this.pos.z);
        this.spikes.position.set(this.pos.x, 0, this.pos.z);
        this.ring.visible = th.t < 1.1;
        this.ring.material.opacity = 0.3 + Math.abs(Math.sin(th.t * 14)) * 0.4;
        this.flash = Math.max(this.flash, Math.sin(th.t * 30) > 0 ? 0.02 : 0);
        if (th.t >= 1.1 && !th.hit) {
          th.hit = true;
          this.spikes.visible = true;
          game.sfx.slam?.();
          game.fx.ring(this.pos, 3.9, 0xff9f1c, 0.5);
          const p = game.player.pos, d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
          // in de rode ring: 1 hartje. Vlak bij Bram (binnen de ring) of ver weg ben je veilig!
          if (d > 2.0 && d < 4.2) game.hurtPlayer(1, this.pos.x, this.pos.z, 15);
        }
        this.spikes.position.y = th.hit ? Math.max(-1.4, -Math.max(0, th.t - 1.6) * 3) : -1.4;
        if (th.t > 2.2) { this.thorn = null; this.spikes.visible = false; this.ring.visible = false; this.thornCool = this.angry ? 4 : 6.5; }
        // tijdens de doornen blijft hij staan
        this.flashUpdate(dt);
        return;
      }
      if (this.angry && !this.jump) this.slamCool = Math.min(this.slamCool, 2.2);
    }
    super.update(t, dt, game);
  }
  flashUpdate(dt) {
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt); this.bodyM.emissive.setScalar(this.flash > 0 ? 0.9 : 0); }
  }
}

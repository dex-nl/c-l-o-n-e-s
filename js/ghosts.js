// Spoken in Het Spookkasteel (idee van Dex). Lieve, ronde plaaggeesten met grote ogen (spannend, niet eng!).
// - Ze zweven rond. Zien ze je? Dan vliegen ze naar je toe, DWARS DOOR DE MUREN heen!
// - Raakt een spook je: 1 hartje. Daarna giechelt hij ("Boe!") en vliegt even weg.
// - Af en toe worden ze bijna onzichtbaar (dan kun je ze niet raken, en zij jou ook niet).
// - Sla ze met je zwaard (of laat je clones helpen).
// Een spook werkt net als een slijmpje: pos, r, dead, removed, update(), hurt() en remove().
import * as THREE from 'three';
import { mat } from './characters.js';
import { difficulty } from './difficulty.js';

const headGeo = new THREE.SphereGeometry(0.62, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
// het laken: een buis die onderaan golft
function sheetGeo() {
  const g = new THREE.CylinderGeometry(0.62, 0.72, 0.95, 12, 2, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < -0.4) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) + Math.sin(a * 6) * 0.12); }
  }
  g.computeVertexNormals();
  return g;
}
const sheet = sheetGeo();
const eyeGeo = new THREE.SphereGeometry(0.11, 8, 6), shineGeo = new THREE.SphereGeometry(0.035, 5, 4), cheekGeo = new THREE.SphereGeometry(0.07, 6, 4);
const mouthGeo = new THREE.TorusGeometry(0.08, 0.025, 4, 10, Math.PI), armGeo = new THREE.SphereGeometry(0.16, 6, 5);
const eyeM = mat(0x212529), shineM = new THREE.MeshBasicMaterial({ color: 0xffffff }), cheekM = mat(0xff8fab);

// het lijf van een spook (ook gebruikt door de spookkoning, maar dan groter)
export function makeGhostBody(color = 0xf1f3f5, glow = 0xb197fc) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 0.35, transparent: true, opacity: 0.86, flatShading: true, side: THREE.DoubleSide });
  const head = new THREE.Mesh(headGeo, m); head.position.y = 0.45; head.castShadow = true; g.add(head);
  const body = new THREE.Mesh(sheet, m); body.castShadow = true; g.add(body);
  const face = new THREE.Group(); face.position.y = 0.55; g.add(face);
  for (const sx of [-0.2, 0.2]) {
    const e = new THREE.Mesh(eyeGeo, eyeM); e.scale.set(1, 1.35, 0.6); e.position.set(sx, 0.05, 0.55); face.add(e);
    const s = new THREE.Mesh(shineGeo, shineM); s.position.set(sx + 0.04, 0.11, 0.62); face.add(s);
    const c = new THREE.Mesh(cheekGeo, cheekM); c.scale.set(1, 0.6, 0.4); c.position.set(sx * 1.75, -0.12, 0.5); face.add(c);
  }
  const mouth = new THREE.Mesh(mouthGeo, eyeM); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.12, 0.6); face.add(mouth);
  const arms = [-1, 1].map((s) => { const a = new THREE.Mesh(armGeo, m); a.scale.set(1, 0.7, 0.7); a.position.set(s * 0.72, 0.1, 0.1); g.add(a); return a; });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
  return { g, m, face, mouth, arms, shadow };
}

export class Ghost {
  constructor(group, x, z, { helper = false, n = 0 } = {}) {
    const D = difficulty('spook');
    this.kind = 'spook';
    this.color = 0xe5dbff;
    this.hp = this.maxHp = Math.round((helper ? 3 : 4) * D.hp); // 15 (hulpjes van de koning: 11)
    this.r = 0.7;
    this.loot = 3;
    this.group = group;
    this.home = { x, z };
    this.dead = false; this.removed = false; this.deadT = 0;
    this.flash = 0; this.invuln = 0; this.kx = 0; this.kz = 0;
    this.speed = 2.3 * D.speed;   // langzamer dan jij (6): wegrennen kan!
    this.see = 7 * D.aggro;       // zo ver ziet hij je (door muren heen!)
    this.state = helper ? 'chase' : 'drift';
    this.t = 0; this.cool = 0; this.fade = 1;
    this.fadeCool = 4 + (n % 4) * 1.3; // wanneer hij weer even onzichtbaar wordt
    this.wander = Math.random() * 6;
    this.helper = helper;
    const b = makeGhostBody();
    this.body = b; this.mesh = new THREE.Group(); this.mesh.add(b.g);
    this.mesh.position.set(x, 0.9, z);
    this.pos = this.mesh.position;
    this.rot = 0;
    group.add(this.mesh);
    b.shadow.position.set(x, 0.04, z); group.add(b.shadow);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.group.remove(this.mesh, this.body.shadow);
    this.body.m.dispose(); this.body.shadow.material.dispose();
  }

  face(x, z, dt, sp = 5) {
    let diff = Math.atan2(x - this.pos.x, z - this.pos.z) - this.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rot += diff * Math.min(1, dt * sp);
    this.mesh.rotation.y = this.rot;
  }

  get solid() { return this.fade > 0.5; } // bijna onzichtbaar? dan raak je hem niet (en hij jou niet)

  update(t, dt, game) {
    const b = this.body;
    if (this.dead) {
      // zweeft omhoog en verdwijnt (poef!)
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.6);
      this.pos.y += dt * 3; b.m.opacity = 0.86 * (1 - k); this.mesh.scale.setScalar(1 + k * 0.4);
      b.shadow.material.opacity = 0.25 * (1 - k);
      if (k >= 1) this.remove();
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.t += dt; this.cool -= dt;
    const p = game.player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    const zone = game.zone, B = zone.bounds;
    // af en toe onzichtbaar worden (alleen als hij achter je aan zit)
    this.fadeCool -= dt;
    let goalFade = 1;
    if (this.state === 'chase' && this.fadeCool < 0) { goalFade = 0.12; if (this.fadeCool < -1.3) this.fadeCool = 5 + Math.random() * 3; }
    this.fade += (goalFade - this.fade) * Math.min(1, dt * 6);
    let vx = 0, vz = 0;
    switch (this.state) {
      case 'drift': {
        // rustig rondzweven bij zijn plekje
        this.wander += dt * 0.6;
        const gx = this.home.x + Math.cos(this.wander) * 2.2, gz = this.home.z + Math.sin(this.wander * 1.3) * 2.2;
        vx = (gx - this.pos.x) * 0.8; vz = (gz - this.pos.z) * 0.8;
        this.face(this.pos.x + vx, this.pos.z + vz, dt, 2);
        if (d < this.see) { this.state = 'chase'; game.sfx.boing?.(1.6); }
        break;
      }
      case 'chase':
        // recht op je af, door alles heen!
        vx = (dx / d) * this.speed; vz = (dz / d) * this.speed;
        this.face(p.x, p.z, dt, 6);
        if (d > this.see * 1.8 && !this.helper) this.state = 'drift';
        if (this.solid && d < this.r + 0.55 && this.cool <= 0) {
          game.hurtPlayer(1, this.pos.x, this.pos.z, 11);
          this.cool = 1.4; this.state = 'giggle'; this.t = 0;
          game.fx.sparkle({ x: this.pos.x, y: 1.4, z: this.pos.z }, [0xffffff, 0xd0bfff], 8, 2);
        }
        break;
      case 'giggle':
        // "Boe! Hihi!" en even weg
        vx = -(dx / d) * this.speed * 1.2; vz = -(dz / d) * this.speed * 1.2;
        this.face(p.x, p.z, dt, 6);
        if (this.t > 1.2) { this.state = 'chase'; this.t = 0; }
        break;
    }
    this.pos.x += vx * dt + this.kx * dt; this.pos.z += vz * dt + this.kz * dt;
    if (this.kx || this.kz) { const f = Math.exp(-dt * 8); this.kx *= f; this.kz *= f; if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0; }
    this.pos.x = Math.max(B.minX + 0.5, Math.min(B.maxX - 0.5, this.pos.x));
    this.pos.z = Math.max(B.minZ + 0.5, Math.min(B.maxZ - 0.5, this.pos.z));
    // zweven, wiebelen en zwaaien met de armpjes
    this.pos.y = 0.9 + Math.sin(t * 2.6 + this.home.x) * 0.18;
    b.g.rotation.z = Math.sin(t * 3 + this.home.z) * 0.08;
    b.arms[0].position.y = 0.1 + Math.sin(t * 5) * 0.08; b.arms[1].position.y = 0.1 - Math.sin(t * 5) * 0.08;
    b.mouth.scale.y = this.state === 'giggle' ? 2.2 : 1;
    b.mouth.rotation.z = this.state === 'giggle' ? 0 : Math.PI;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    b.m.emissive.setHex(this.flash > 0 ? 0xffffff : 0xb197fc);
    b.m.opacity = 0.86 * this.fade; b.m.depthWrite = this.fade > 0.9;
    b.shadow.position.set(this.pos.x, 0.04, this.pos.z); b.shadow.material.opacity = 0.25 * this.fade;
  }

  hurt(dmg, fromX, fromZ, game) {
    if (this.dead || (dmg < 99 && (this.invuln > 0 || !this.solid))) return false;
    this.hp -= dmg;
    this.flash = 0.12; this.invuln = 0.18;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * 6; this.kz = (dz / d) * 6;
    if (this.state === 'drift') this.state = 'chase';
    if (this.hp <= 0) { this.dead = true; game.onSlimeDefeated(this); }
    return true;
  }
}

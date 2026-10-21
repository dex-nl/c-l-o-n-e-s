// Dingen om op te rapen: kristallen, hartjes, de Superbatterij en stukjes van de schatkaart.
// Kristallen en hartjes vliegen naar je toe als je (of een clone) dichtbij komt.
import * as THREE from 'three';
import { mat } from './characters.js';

// Vormen en kleuren die alle dingen van dezelfde soort delen (scheelt geheugen)
const crystalGeo = new THREE.OctahedronGeometry(0.2, 0);
const crystalM = mat(0x7af7ff, { emissive: 0x1b8fd8, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.3 });
const heartM = mat(0xff3b5c, { emissive: 0x660011 });
const heartBall = new THREE.SphereGeometry(0.14, 8, 6);
const heartTip = new THREE.ConeGeometry(0.21, 0.28, 8);
const batteryParts = {
  body: [new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10), mat(0xffd23f, { emissive: 0x996600, metalness: 0.4 })],
  top: [new THREE.CylinderGeometry(0.15, 0.15, 0.15, 8), mat(0xdddddd, { metalness: 0.6 })],
  band: [new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10), mat(0x1d1d1d)],
  glow: [new THREE.RingGeometry(0.7, 0.95, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.7, side: THREE.DoubleSide })],
};

const mapParts = {
  paper: [new THREE.BoxGeometry(0.9, 0.04, 0.7), mat(0xf5e6c4, { emissive: 0x5a4a20, emissiveIntensity: 0.4 })],
  roll: [new THREE.CylinderGeometry(0.09, 0.09, 0.78, 8).rotateZ(Math.PI / 2), mat(0xd9b77e)],
  x: [new THREE.BoxGeometry(0.28, 0.02, 0.06), mat(0xe63946)],
  glow: batteryParts.glow,
};
const BIG = ['batterij', 'kaartstuk']; // grote dingen: alleen de speler raapt ze op

function makeMesh(type) {
  const g = new THREE.Group();
  if (type === 'kristal') {
    const m = new THREE.Mesh(crystalGeo, crystalM);
    m.scale.set(1, 1.5, 1);
    m.castShadow = true;
    g.add(m);
  } else if (type === 'hart') {
    for (const sx of [-0.11, 0.11]) {
      const s = new THREE.Mesh(heartBall, heartM);
      s.position.set(sx, 0.08, 0);
      g.add(s);
    }
    const tip = new THREE.Mesh(heartTip, heartM);
    tip.rotation.z = Math.PI; tip.position.y = -0.1;
    g.add(tip);
  } else if (type === 'batterij') {
    const part = (name, y) => { const m = new THREE.Mesh(...batteryParts[name]); m.position.y = y; g.add(m); return m; };
    part('body', 0);
    part('top', 0.52);
    part('band', -0.2);
    const glow = part('glow', -0.55);
    g.userData.glow = glow;
  } else if (type === 'kaartstuk') {
    const part = (name, x, y, z) => { const m = new THREE.Mesh(...mapParts[name]); m.position.set(x, y, z); g.add(m); return m; };
    const paper = part('paper', 0, 0.2, 0);
    paper.rotation.x = -0.9;
    part('roll', 0, 0.48, -0.22);
    part('roll', 0, -0.08, 0.22);
    const x1 = part('x', 0.1, 0.22, 0.03); x1.rotation.set(-0.9, 0, 0.8);
    const x2 = part('x', 0.1, 0.22, 0.03); x2.rotation.set(-0.9, 0, -0.8);
    g.userData.glow = part('glow', 0, -0.55, 0);
    g.scale.setScalar(1.3);
  }
  return g;
}

export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  spawn(type, x, z, n = 1) {
    for (let i = 0; i < n; i++) {
      const mesh = makeMesh(type);
      const big = BIG.includes(type);
      const a = Math.random() * Math.PI * 2, sp = big ? 0 : 1.5 + Math.random() * 2;
      mesh.position.set(x, 0.6, z);
      this.scene.add(mesh);
      this.list.push({ type, mesh, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: big ? 6 : 5 + Math.random() * 2, age: 0, landed: false, ph: Math.random() * 6 });
    }
  }

  clear() {
    for (const p of this.list) this.scene.remove(p.mesh);
    this.list = [];
  }

  // collectors: de speler eerst, dan de clones. onCollect(type) wordt aangeroepen bij oprapen.
  update(t, dt, collectors, onCollect) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i], m = p.mesh.position;
      p.age += dt;
      if (!p.landed) {
        p.vy -= 14 * dt;
        m.x += p.vx * dt; m.y += p.vy * dt; m.z += p.vz * dt;
        if (m.y <= 0.5 && p.vy < 0) { m.y = 0.5; p.landed = true; }
      } else {
        m.y = 0.55 + Math.sin(t * 3 + p.ph) * 0.12;
      }
      p.mesh.rotation.y += dt * 2.5;
      if (p.mesh.userData.glow) p.mesh.userData.glow.scale.setScalar(1 + Math.sin(t * 5) * 0.15);

      // Wie raapt het op?
      const big = BIG.includes(p.type);
      const who = big ? collectors.slice(0, 1) : collectors;
      let best = null, bestD = big ? 1.3 : 2.4;
      for (const c of who) {
        const d = Math.hypot(c.x - m.x, c.z - m.z);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (!best || p.age < 0.5) continue;
      if (!big) {
        // naar je toe vliegen
        const sp = Math.min(bestD, dt * 12);
        m.x += ((best.x - m.x) / bestD) * sp;
        m.z += ((best.z - m.z) / bestD) * sp;
      }
      if (bestD < 0.7 || big) {
        this.scene.remove(p.mesh);
        this.list.splice(i, 1);
        onCollect(p.type, m);
      }
    }
  }
}

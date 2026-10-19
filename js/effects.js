// Deeltjes: confetti, glinsters, stofwolkjes, zwaardzwaaien, poef-wolkjes en schokgolven.
import * as THREE from 'three';

const cube = new THREE.BoxGeometry(1, 1, 1);
const puffGeo = new THREE.IcosahedronGeometry(1, 0);
// Een boog voor het zwaard: van voor-onder, over je hoofd, naar achter
const arcGeo = new THREE.RingGeometry(0.75, 1.55, 14, 1, -0.6, Math.PI * 0.95).rotateY(-Math.PI / 2);
const ringGeo = new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.bits = [];
  }

  add(geo, color, pos, size, v, life, { gravity = 9, fade = false, grow = 0, spin = 7, opacity = 1, glow = false } = {}) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color, transparent: fade, opacity, side: THREE.DoubleSide,
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !glow,
    }));
    m.position.copy(pos);
    m.scale.setScalar(size);
    m.userData = { v, life, maxLife: life, gravity, fade, grow, spin, size, opacity };
    this.scene.add(m);
    this.bits.push(m);
    return m;
  }

  // De boog van een zwaardzwaai
  swoosh(pos, rot, gold = false) {
    const m = this.add(arcGeo, gold ? 0xffe066 : 0xffffff, new THREE.Vector3(pos.x, 1.1, pos.z), 1, new THREE.Vector3(), 0.2,
      { gravity: 0, fade: true, spin: 0, opacity: 0.75, glow: true });
    m.rotation.y = rot;
  }

  // Poef! Een slijmpje verdwijnt
  poof(pos, color, size = 1) {
    this.sparkle({ x: pos.x, y: 0.6 * size, z: pos.z }, [color, 0xffffff], Math.round(16 * size), 3 + size);
    for (let i = 0; i < 5 * size; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 3);
      this.add(puffGeo, 0xf1f1f1, new THREE.Vector3(pos.x, 0.5 * size, pos.z), 0.25 * size, v, 0.6, { gravity: 0, fade: true, grow: 0.4 * size, spin: 1 });
    }
  }

  // Een ring die over de grond groter wordt (de klap van Koning Slijm)
  ring(pos, radius, color = 0xffffff, life = 0.5) {
    const m = this.add(ringGeo, color, new THREE.Vector3(pos.x, 0.15, pos.z), 0.3, new THREE.Vector3(), life,
      { gravity: 0, fade: true, grow: radius, spin: 0, opacity: 0.9, glow: true });
    m.rotation.set(0, 0, 0);
  }

  // Feest! (als een opdracht klaar is)
  confetti(pos, n = 60) {
    const colors = [0xff6b6b, 0xffd23f, 0x3a86ff, 0x52b788, 0xc77dff];
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 6);
      this.add(cube, colors[i % 5], new THREE.Vector3(pos.x, 3, pos.z), 0.15, v, 2.5);
    }
  }

  // Glinsters die alle kanten op spatten
  sparkle(pos, colors, n = 24, speed = 4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * speed * Math.random(), 2 + Math.random() * speed, Math.sin(a) * speed * Math.random());
      this.add(cube, colors[i % colors.length], pos, 0.12, v, 0.9, { gravity: 6, fade: true });
    }
  }

  // Een klein stofwolkje bij een voetstap
  dust(pos) {
    for (let i = 0; i < 2; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8);
      const p = new THREE.Vector3(pos.x + (Math.random() - 0.5) * 0.3, 0.1, pos.z + (Math.random() - 0.5) * 0.3);
      this.add(puffGeo, 0xe9dcc0, p, 0.12, v, 0.5, { gravity: 0, fade: true, grow: 0.25, spin: 1 });
    }
  }

  update(dt) {
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i], u = b.userData;
      u.v.y -= u.gravity * dt;
      b.position.addScaledVector(u.v, dt);
      b.rotation.x += dt * u.spin; b.rotation.y += dt * u.spin * 0.8;
      u.life -= dt;
      const k = u.life / u.maxLife;
      if (u.fade) b.material.opacity = Math.max(0, k) * u.opacity;
      if (u.grow) b.scale.setScalar(u.size + (1 - k) * u.grow);
      if (u.life <= 0) {
        this.scene.remove(b);
        b.material.dispose();
        this.bits.splice(i, 1);
      }
    }
  }
}

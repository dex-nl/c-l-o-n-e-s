// Deeltjes: confetti, glinsters en stofwolkjes onder je voeten.
import * as THREE from 'three';

const cube = new THREE.BoxGeometry(1, 1, 1);
const puffGeo = new THREE.IcosahedronGeometry(1, 0);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.bits = [];
  }

  add(geo, color, pos, size, v, life, { gravity = 9, fade = false, grow = 0, spin = 7 } = {}) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: fade, opacity: 1 }));
    m.position.copy(pos);
    m.scale.setScalar(size);
    m.userData = { v, life, maxLife: life, gravity, fade, grow, spin, size };
    this.scene.add(m);
    this.bits.push(m);
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
      if (u.fade) b.material.opacity = Math.max(0, k);
      if (u.grow) b.scale.setScalar(u.size + (1 - k) * u.grow);
      if (u.life <= 0) {
        this.scene.remove(b);
        b.material.dispose();
        this.bits.splice(i, 1);
      }
    }
  }
}

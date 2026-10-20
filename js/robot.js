// Robotje Bliep (uit de Speelgoedwinkel): zweeft overal met je mee.
import * as THREE from 'three';
import { mat, box } from './characters.js';

export class Robot {
  constructor(scene) {
    this.g = new THREE.Group();
    const metal = mat(0xb8c4d6, { metalness: 0.3, roughness: 0.5 });
    this.g.add(box(0.5, 0.45, 0.45, metal, 0, 0.55, 0));
    const head = new THREE.Group();
    head.position.y = 0.98;
    head.add(box(0.42, 0.34, 0.38, metal));
    head.add(box(0.3, 0.14, 0.04, mat(0x1d1d1d), 0, 0.02, 0.2));
    for (const ex of [-0.07, 0.07]) head.add(box(0.06, 0.06, 0.03, new THREE.MeshBasicMaterial({ color: 0x7af7ff }), ex, 0.02, 0.23));
    head.add(box(0.04, 0.22, 0.04, mat(0x555555), 0, 0.28, 0));
    this.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3b5c }));
    this.lamp.position.y = 0.42;
    head.add(this.lamp);
    this.g.add(head);
    this.head = head;
    this.g.add(box(0.36, 0.08, 0.36, mat(0x3a86ff), 0, 0.28, 0)); // zweefplaatje
    this.g.visible = false;
    scene.add(this.g);
    this.pos = this.g.position;
    this.jump = 0;
  }

  show(yes) { this.g.visible = yes; }

  // Zet hem naast de speler (bij een nieuwe zone)
  snap(player) { this.pos.set(player.pos.x + 1.2, 0, player.pos.z + 0.6); }

  hop() { this.jump = 1; }

  update(t, dt, player) {
    if (!this.g.visible) return;
    // een plekje schuin achter de speler
    const gx = player.pos.x - Math.sin(player.rot) * 1.2 + Math.cos(player.rot) * 1.0;
    const gz = player.pos.z - Math.cos(player.rot) * 1.2 - Math.sin(player.rot) * 1.0;
    const dx = gx - this.pos.x, dz = gz - this.pos.z, d = Math.hypot(dx, dz);
    if (d > 8) this.snap(player);
    else if (d > 0.05) { const k = Math.min(1, dt * 3); this.pos.x += dx * k; this.pos.z += dz * k; }
    this.jump = Math.max(0, this.jump - dt * 1.6);
    this.pos.y = 0.35 + Math.sin(t * 3) * 0.12 + Math.sin(this.jump * Math.PI) * 1.2;
    this.g.rotation.y = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z) + this.jump * Math.PI * 4;
    this.head.rotation.z = Math.sin(t * 2) * 0.15;
    this.lamp.visible = Math.sin(t * 6) > -0.3;
  }
}

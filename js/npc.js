// De dorpelingen: Professor Bolt, Koopman Kees, Oma Pien en Knoeper de hond.
import * as THREE from 'three';
import { makeCharacter, animateWalk, mat, box } from './characters.js';
import { collide } from './physics.js';

function makeMarker() {
  // Uitroepteken boven het hoofd ("ik heb iets te zeggen!")
  const marker = new THREE.Group();
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), yellow); bar.position.y = 0.2;
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), yellow); dot.position.y = -0.25;
  marker.add(bar, dot);
  marker.visible = false;
  return marker;
}

const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export class Npc {
  // wander: hoe ver hij rondloopt rond zijn plek (0 = blijft staan)
  constructor(group, { id, name, x, z, rot = 0, look, voice = 1, decorate = null, wander = 0 }) {
    Object.assign(this, { id, name, voice, wander });
    this.ch = makeCharacter(look);
    this.mesh = this.ch.group;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = rot;
    this.pos = this.mesh.position;
    this.home = { x, z };
    this.baseRot = rot;
    this.goal = null;
    this.pause = 2;
    this.phase = 0;
    this.walk = 0;
    if (decorate) decorate(this.ch);
    this.marker = makeMarker();
    this.marker.position.y = 2.8;
    this.mesh.add(this.marker);
    group.add(this.mesh);
  }

  showMarker(yes) { this.marker.visible = yes; }

  distanceTo(pos) {
    return Math.hypot(pos.x - this.pos.x, pos.z - this.pos.z);
  }

  update(t, dt, playerPos, zone) {
    this.marker.position.y = 2.8 + Math.sin(t * 3) * 0.12;
    this.marker.rotation.y = t * 2;
    const near = this.distanceTo(playerPos) < 5;
    let target = this.baseRot, walking = false;

    if (near) {
      target = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
    } else if (this.wander) {
      // Een beetje rondwandelen
      if (!this.goal) {
        this.pause -= dt;
        if (this.pause <= 0) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * this.wander;
          this.goal = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
        }
      } else {
        const dx = this.goal.x - this.pos.x, dz = this.goal.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.2) { this.goal = null; this.pause = 2 + Math.random() * 3; } else {
          const sp = Math.min(d, dt * 1.6);
          this.pos.x += (dx / d) * sp; this.pos.z += (dz / d) * sp;
          collide(this.pos, 0.4, zone);
          target = Math.atan2(dx, dz);
          walking = true;
        }
      }
      if (!walking) target = this.mesh.rotation.y;
    }
    this.mesh.rotation.y += angleDiff(target, this.mesh.rotation.y) * Math.min(1, dt * 5);
    this.walk += ((walking ? 1 : 0) - this.walk) * Math.min(1, dt * 6);
    this.phase += dt * (walking ? 7 : 2);
    animateWalk(this.ch, this.phase, this.walk);
    if (!walking) {
      // Een beetje wiebelen, alsof hij nadenkt
      this.ch.body.position.y = 0.98 + Math.sin(t * 2 + this.home.x) * 0.03;
      this.ch.head.rotation.z = Math.sin(t * 1.3 + this.home.z) * 0.08;
    }
  }
}

// ---------- De dorpelingen ----------

export function makeBolt(group, spot) {
  return new Npc(group, {
    id: 'bolt', name: 'Professor Bolt', ...spot, rot: 0.4, voice: 0.8,
    look: { shirt: 0x6c757d, pants: 0x495057, skin: 0xf1c27d, hair: 0xdee2e6, coat: 0xffffff },
    decorate(ch) {
      // Wilde grijze haren en een oranje bril op zijn hoofd
      for (const [hx, hz] of [[-0.3, 0], [0.3, 0], [0, -0.25]]) {
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 4), ch.hairM);
        tuft.position.set(hx, 0.42, hz); tuft.rotation.z = -hx; tuft.castShadow = true;
        ch.head.add(tuft);
      }
      const goggleM = mat(0xff8c42, { emissive: 0x552200 });
      for (const gx of [-0.15, 0.15]) {
        const gg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8), goggleM);
        gg.rotation.x = Math.PI / 2; gg.position.set(gx, 0.25, 0.31);
        ch.head.add(gg);
      }
    },
  });
}

export function makeKoopman(group, spot) {
  return new Npc(group, {
    id: 'koopman', name: 'Koopman Kees', ...spot, voice: 0.65,
    look: { shirt: 0xffd166, pants: 0x6d4c41, skin: 0xe0ac69, hair: 0x2d2d2d },
    decorate(ch) {
      ch.head.add(box(0.4, 0.09, 0.06, mat(0x2d2d2d), 0, -0.06, 0.31));          // snor
      ch.head.add(box(0.7, 0.12, 0.7, mat(0x2a9d8f), 0, 0.38, 0));               // pet
      ch.head.add(box(0.5, 0.05, 0.28, mat(0x2a9d8f), 0, 0.33, 0.42));           // klep
      ch.body.add(box(0.6, 0.6, 0.05, mat(0xffffff), 0, -0.08, 0.24));           // schort
    },
  });
}

export function makeOma(group, spot) {
  return new Npc(group, {
    id: 'oma', name: 'Oma Pien', ...spot, voice: 1.35, wander: 3,
    look: { shirt: 0xb5838d, pants: 0x6d597a, skin: 0xffdbac, hair: 0xe5e5e5, coat: 0x9d4edd },
    decorate(ch) {
      const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), ch.hairM);
      bun.position.set(0, 0.35, -0.3); bun.castShadow = true;
      ch.head.add(bun);
      const glassM = mat(0x333333);
      ch.head.add(box(0.18, 0.12, 0.03, glassM, -0.14, 0.03, 0.31), box(0.18, 0.12, 0.03, glassM, 0.14, 0.03, 0.31));
      const stick = box(0.07, 1.2, 0.07, mat(0x8b5a2b), 0, -0.3, 0.12);
      ch.arms[1].add(stick);
    },
  });
}

// Knoeper de hond: rent rond op het plein en kwispelt
export class Dog {
  constructor(group, { x, z }) {
    this.id = 'hond'; this.name = 'Knoeper'; this.voice = 1.7;
    this.mesh = new THREE.Group();
    const fur = mat(0xc9853a), dark = mat(0x5c3a21), white = mat(0xffffff);
    this.mesh.add(box(0.45, 0.4, 0.85, fur, 0, 0.55, 0));
    const head = new THREE.Group();
    head.position.set(0, 0.85, 0.5);
    head.add(box(0.4, 0.38, 0.38, fur));
    head.add(box(0.24, 0.18, 0.22, white, 0, -0.08, 0.26));
    head.add(box(0.1, 0.08, 0.06, dark, 0, -0.02, 0.38));
    head.add(box(0.07, 0.08, 0.04, dark, -0.1, 0.08, 0.2), box(0.07, 0.08, 0.04, dark, 0.1, 0.08, 0.2));
    head.add(box(0.12, 0.26, 0.1, dark, -0.21, 0.08, -0.05), box(0.12, 0.26, 0.1, dark, 0.21, 0.08, -0.05));
    this.mesh.add(head);
    this.legs = [[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]].map(([lx, lz]) => {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0.4, lz);
      pivot.add(box(0.12, 0.4, 0.12, fur, 0, -0.2, 0));
      this.mesh.add(pivot);
      return pivot;
    });
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.7, -0.42);
    this.tail.add(box(0.08, 0.08, 0.35, fur, 0, 0.08, -0.15));
    this.mesh.add(this.tail);
    this.head = head;
    this.mesh.position.set(x, 0, z);
    this.pos = this.mesh.position;
    this.home = { x, z };
    this.goal = null; this.pause = 1; this.phase = 0;
    group.add(this.mesh);
  }

  showMarker() {}

  distanceTo(pos) { return Math.hypot(pos.x - this.pos.x, pos.z - this.pos.z); }

  update(t, dt, playerPos, zone) {
    this.tail.rotation.y = Math.sin(t * 14) * 0.6;
    let moving = false;
    if (!this.goal) {
      this.pause -= dt;
      if (this.pause <= 0) {
        // Soms rent hij naar de speler, soms ergens anders heen
        if (Math.random() < 0.4 && this.distanceTo(playerPos) < 12) {
          this.goal = { x: playerPos.x + (Math.random() - 0.5) * 3, z: playerPos.z + (Math.random() - 0.5) * 3 };
        } else {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 7;
          this.goal = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
        }
      }
    } else {
      const dx = this.goal.x - this.pos.x, dz = this.goal.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { this.goal = null; this.pause = 1 + Math.random() * 3; } else {
        const sp = Math.min(d, dt * 4.5);
        this.pos.x += (dx / d) * sp; this.pos.z += (dz / d) * sp;
        collide(this.pos, 0.45, zone);
        this.mesh.rotation.y += angleDiff(Math.atan2(dx, dz), this.mesh.rotation.y) * Math.min(1, dt * 8);
        moving = true;
      }
    }
    this.phase += dt * (moving ? 16 : 0);
    this.legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0; });
    this.mesh.position.y = moving ? Math.abs(Math.sin(this.phase)) * 0.06 : 0;
    this.head.rotation.x = moving ? 0 : Math.sin(t * 2) * 0.1;
  }
}

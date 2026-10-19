// De speler: lopen, draaien en niet door muren of bomen heen gaan.
import * as THREE from 'three';
import { makeCharacter, animateWalk, mat } from './characters.js';

export const RADIUS = 0.45;

// Het poppetje van de held (ook gebruikt voor de clones).
export function makeHeroModel() {
  const ch = makeCharacter({ shirt: 0x3a86ff, pants: 0x2d3142, hair: 0x6b3e26 });
  // Een rood petje voor de held
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.66), mat(0xe63946));
  cap.position.set(0, 0.38, 0); cap.castShadow = true;
  const klep = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.3), mat(0xe63946));
  klep.position.set(0, 0.32, 0.42); klep.castShadow = true;
  ch.head.add(cap, klep);
  return ch;
}

// Duwt een positie uit huizen, bomen, muren en water, en houdt hem binnen het gebied.
// zone.colliders bevat cirkels { x, z, r } en rechthoeken { box: true, minX, maxX, minZ, maxZ, off }.
// zone.clamp(pos) houdt je binnen het gebied (anders: een cirkel met straal zone.bounds).
export function collide(pos, zone, radius = RADIUS) {
  for (let i = 0; i < 3; i++) {
    for (const c of zone.colliders) {
      if (c.box) { if (!c.off) pushOutOfBox(pos, c, radius); continue; }
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min) {
        if (d < 1e-4) { pos.x += min; continue; }
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    if (zone.clamp) { zone.clamp(pos, radius); continue; }
    const r = Math.hypot(pos.x, pos.z);
    if (r > zone.bounds) {
      pos.x *= zone.bounds / r;
      pos.z *= zone.bounds / r;
    }
  }
}

function pushOutOfBox(pos, b, radius) {
  const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
  const dx = pos.x - cx, dz = pos.z - cz;
  const d = Math.hypot(dx, dz);
  if (d > 1e-4) {
    if (d < radius) { pos.x = cx + (dx / d) * radius; pos.z = cz + (dz / d) * radius; }
    return;
  }
  // Helemaal binnen de rechthoek: duw eruit langs de kortste kant
  const opts = [
    [b.minX - radius - pos.x, 0], [b.maxX + radius - pos.x, 0],
    [0, b.minZ - radius - pos.z], [0, b.maxZ + radius - pos.z],
  ].sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1]));
  pos.x += opts[0][0]; pos.z += opts[0][1];
}

export class Player {
  constructor(scene) {
    this.ch = makeHeroModel();
    this.mesh = this.ch.group;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.rot = 0;
    this.speed = 6;
    this.phase = 0;
    this.walkAmount = 0;
  }

  setPosition(x, z, rot = 0) {
    this.pos.set(x, 0, z);
    this.rot = rot;
    this.mesh.rotation.y = rot;
  }

  // move = { x, y } tussen -1 en 1 (y omhoog = naar voren op het scherm)
  update(dt, move, world) {
    const len = Math.hypot(move.x, move.y);
    if (len > 0.05) {
      const k = Math.min(len, 1);
      const dx = (move.x / len) * k * this.speed * dt;
      const dz = (-move.y / len) * k * this.speed * dt;
      this.pos.x += dx;
      this.pos.z += dz;
      this.resolveCollisions(world);
      // Draai soepel in de looprichting
      const target = Math.atan2(dx, dz);
      let diff = target - this.rot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rot += diff * Math.min(1, dt * 12);
      this.mesh.rotation.y = this.rot;
      this.phase += dt * 11 * k;
      this.walkAmount = Math.min(1, this.walkAmount + dt * 6);
    } else {
      this.walkAmount = Math.max(0, this.walkAmount - dt * 6);
      this.phase += dt * 4;
    }
    animateWalk(this.ch, this.phase, this.walkAmount);
  }

  resolveCollisions(world) { collide(this.pos, world); }
}

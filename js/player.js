// De speler: lopen, draaien en niet door muren of bomen heen gaan.
import { makeHero, animateWalk } from './characters.js';

const RADIUS = 0.45;

export class Player {
  constructor(scene) {
    this.ch = makeHero();
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

  resolveCollisions(world) {
    for (let i = 0; i < 3; i++) {
      for (const c of world.colliders) {
        const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
        const d = Math.hypot(dx, dz), min = c.r + RADIUS;
        if (d < min) {
          if (d < 1e-4) { this.pos.x += min; continue; }
          this.pos.x = c.x + (dx / d) * min;
          this.pos.z = c.z + (dz / d) * min;
        }
      }
      const r = Math.hypot(this.pos.x, this.pos.z);
      if (r > world.bounds) {
        this.pos.x *= world.bounds / r;
        this.pos.z *= world.bounds / r;
      }
    }
  }
}

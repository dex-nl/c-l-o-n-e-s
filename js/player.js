// De speler: lopen, draaien, zwaaien met het zwaard en niet door muren of bomen heen gaan.
import { makeHero, animateWalk, animateSwing, giveSword, setHat } from './characters.js';
import { collide } from './physics.js';

export const RADIUS = 0.45;
export const SWING_TIME = 0.32;

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
    this.swordLevel = 0;
    this.swingT = 0;      // hoe lang de zwaai nog duurt
    this.swingHit = false; // true in het beeldje waarin het zwaard raakt
    this.kx = 0; this.kz = 0; // terugduwen als je geraakt wordt
    this.invuln = 0;      // even onkwetsbaar na een klap
  }

  setPosition(x, z, rot = 0) {
    this.pos.set(x, 0, z);
    this.rot = rot;
    this.mesh.rotation.y = rot;
    this.kx = this.kz = 0;
  }

  setSword(level) { this.swordLevel = level; giveSword(this.ch, level); }
  setHat(id) { setHat(this.ch, id); }

  // Begin een zwaai. Geeft false als dat nu niet kan.
  swing() {
    if (!this.swordLevel || this.swingT > 0) return false;
    this.swingT = SWING_TIME;
    this.hitDone = false;
    return true;
  }

  // Duw de speler weg van een punt (bijvoorbeeld een slijmpje)
  knock(fromX, fromZ, power = 9) {
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = (dx / d) * power;
    this.kz = (dz / d) * power;
  }

  // move = { x, y } tussen -1 en 1 (y omhoog = naar voren op het scherm)
  update(dt, move, zone) {
    const len = Math.hypot(move.x, move.y);
    if (len > 0.05) {
      const k = Math.min(len, 1);
      const dx = (move.x / len) * k * this.speed * dt;
      const dz = (-move.y / len) * k * this.speed * dt;
      this.pos.x += dx;
      this.pos.z += dz;
      this.resolveCollisions(zone);
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

    // Teruggeduwd worden
    if (this.kx || this.kz) {
      this.pos.x += this.kx * dt;
      this.pos.z += this.kz * dt;
      const f = Math.exp(-dt * 9);
      this.kx *= f; this.kz *= f;
      if (Math.hypot(this.kx, this.kz) < 0.2) this.kx = this.kz = 0;
      this.resolveCollisions(zone);
    }

    animateWalk(this.ch, this.phase, this.walkAmount);

    // Zwaard zwaaien
    this.swingHit = false;
    if (this.swingT > 0) {
      this.swingT = Math.max(0, this.swingT - dt);
      const k = 1 - this.swingT / SWING_TIME;
      if (!this.hitDone && k >= 0.45) { this.hitDone = true; this.swingHit = true; }
      animateSwing(this.ch, k);
    }

    // Knipperen als je net geraakt bent
    if (this.invuln > 0) {
      this.invuln = Math.max(0, this.invuln - dt);
      this.mesh.visible = this.invuln === 0 || Math.floor(this.invuln * 14) % 2 === 0;
    }
  }

  resolveCollisions(zone) { collide(this.pos, RADIUS, zone); }
}

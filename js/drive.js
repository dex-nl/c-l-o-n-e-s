// Zelf rijden! Simpele, vergevingsgezinde "arcade"-besturing:
// duw de joystick (of WASD/pijltjes) de kant op waar je heen wilt, en de auto draait die kant op.
// Bots je ergens tegen? Dan stuiter je zachtjes terug. Geen schade, nooit.
import { collide } from './physics.js';
import { makeCarModel, CARS } from './autowinkel.js';

const CAR_R = 1.05; // de auto is (voor botsen) een cirkel van deze grootte
const angleDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class MyCar {
  constructor(group, colliders) {
    this.group = group;
    this.colliders = colliders;
    this.id = null;
    this.model = null;
    this.pos = { x: 0, z: 0 };
    this.rot = 0;
    this.speed = 0;
    this.driving = false;
    this.bumpCool = 0;
    this.tilt = 0;
    // als de auto geparkeerd staat, kun je er niet doorheen lopen
    this.parkedA = { x: 9999, z: 9999, r: 0.8 };
    this.parkedB = { x: 9999, z: 9999, r: 0.8 };
    colliders.push(this.parkedA, this.parkedB);
  }

  get dir() { return { x: Math.sin(this.rot), z: Math.cos(this.rot) }; }

  // Zet een (andere) auto neer op een plek
  place(id, spot) {
    if (this.model) this.group.remove(this.model.g);
    this.id = id;
    this.model = null;
    if (!id) { this.syncParked(); return; }
    this.model = makeCarModel(id);
    this.group.add(this.model.g);
    this.pos = { x: spot.x, z: spot.z };
    this.rot = spot.rot || 0;
    this.speed = 0;
    this.syncMesh();
    this.syncParked();
  }

  syncMesh() {
    if (!this.model) return;
    this.model.g.position.set(this.pos.x, 0, this.pos.z);
    this.model.g.rotation.set(0, this.rot, this.tilt);
  }

  syncParked() {
    const on = this.model && !this.driving;
    const d = this.dir;
    this.parkedA.x = on ? this.pos.x + d.x * 0.7 : 9999; this.parkedA.z = on ? this.pos.z + d.z * 0.7 : 9999;
    this.parkedB.x = on ? this.pos.x - d.x * 0.7 : 9999; this.parkedB.z = on ? this.pos.z - d.z * 0.7 : 9999;
  }

  // Hoe ver is de speler van de auto? (om in te stappen)
  distanceTo(p) { return this.model ? Math.hypot(p.x - this.pos.x, p.z - this.pos.z) : Infinity; }

  setDriving(yes) { this.driving = yes; if (!yes) this.speed = 0; this.syncParked(); }

  // move = { x, y } van de joystick. people = posities van mensen waar je niet doorheen mag.
  // Geeft true terug als je ergens tegenaan botste.
  update(dt, move, zone, people) {
    const max = CARS[this.id].speed;
    const len = Math.min(1, Math.hypot(move.x, move.y));
    let want = 0;
    if (len > 0.1) {
      const target = Math.atan2(move.x, -move.y);
      const diff = angleDiff(target, this.rot);
      const turn = 2.8 * dt * (0.5 + 0.5 * Math.min(1, Math.abs(this.speed) / 4));
      this.rot += Math.max(-turn, Math.min(turn, diff));
      // Wil je de andere kant op? Dan eerst afremmen en keren.
      want = max * len * (Math.abs(diff) > 2 ? 0.25 : Math.max(0.3, Math.cos(diff)));
      this.tilt += (-Math.sign(diff) * Math.min(0.08, Math.abs(diff) * 0.05) * (this.speed / max) - this.tilt) * Math.min(1, dt * 6);
    } else this.tilt *= 0.9;
    this.speed += (want - this.speed) * Math.min(1, dt * (want > this.speed ? 1.4 : 3));
    const d = this.dir;
    const before = { x: this.pos.x, z: this.pos.z };
    this.pos.x += d.x * this.speed * dt;
    this.pos.z += d.z * this.speed * dt;
    const goal = { x: this.pos.x, z: this.pos.z };
    collide(this.pos, CAR_R, zone);
    // mensen: zachtjes om ze heen / ertegen stoppen
    for (const q of people) {
      const dx = this.pos.x - q.x, dz = this.pos.z - q.z, dd = Math.hypot(dx, dz), min = CAR_R + 0.4;
      if (dd < min && dd > 1e-4) { this.pos.x = q.x + (dx / dd) * min; this.pos.z = q.z + (dz / dd) * min; }
    }
    const pushed = Math.hypot(this.pos.x - goal.x, this.pos.z - goal.z);
    this.bumpCool -= dt;
    let bumped = false;
    if (pushed > 0.02 && Math.abs(this.speed) > 0.5) {
      // zachte bots: snelheid eraf en een klein stukje terug
      this.speed *= -0.25;
      const bx = this.pos.x - before.x, bz = this.pos.z - before.z;
      if (Math.hypot(bx, bz) < 0.01) { this.pos.x -= d.x * 0.05; this.pos.z -= d.z * 0.05; collide(this.pos, CAR_R, zone); }
      if (this.bumpCool <= 0) { bumped = true; this.bumpCool = 0.5; }
    }
    for (const w of this.model.wheels) w.rotation.x += (this.speed * dt) / 0.32;
    this.syncMesh();
    this.model.g.position.y = Math.abs(Math.sin(performance.now() / 70)) * 0.02 * Math.min(1, Math.abs(this.speed) / 3);
    return bumped;
  }
}

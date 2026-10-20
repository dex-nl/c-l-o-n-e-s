// Autootjes die rondjes rijden in De Stad. Ze stoppen netjes als er iemand voor ze staat:
// niemand wordt aangereden en niemand raakt hartjes kwijt. (Zelf rijden komt misschien later!)
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh } from './props.js';

// Een weg als een rechthoek met ronde hoeken. Geeft punten terug, met de afstand tot het begin.
export function roundedLoop(minX, maxX, minZ, maxZ, r = 2.5, step = 0.25) {
  const pts = [];
  const corners = [[maxX - r, maxZ - r], [maxX - r, minZ + r], [minX + r, minZ + r], [minX + r, maxZ - r]];
  // rondje: naar rechts langs maxZ, dan naar achteren langs maxX, enz.
  const segs = [
    [[minX + r, maxZ], [maxX - r, maxZ]], [[maxX, maxZ - r], [maxX, minZ + r]],
    [[maxX - r, minZ], [minX + r, minZ]], [[minX, minZ + r], [minX, maxZ - r]],
  ];
  for (let i = 0; i < 4; i++) {
    const [[x1, z1], [x2, z2]] = segs[i];
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) pts.push({ x: x1 + ((x2 - x1) * k) / n, z: z1 + ((z2 - z1) * k) / n });
    const [cx, cz] = corners[i];
    for (let k = 0; k < 8; k++) {
      const a = (i * Math.PI) / 2 + ((Math.PI / 2) * k) / 8;
      pts.push({ x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r });
    }
  }
  let s = 0;
  pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.s = s; });
  const last = pts[pts.length - 1];
  const total = s + Math.hypot(pts[0].x - last.x, pts[0].z - last.z);
  return { pts, total };
}

function pointAt(loop, s) {
  s = ((s % loop.total) + loop.total) % loop.total;
  const { pts } = loop;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pts[mid].s <= s) lo = mid; else hi = mid - 1; }
  const a = pts[lo], b = pts[(lo + 1) % pts.length];
  const segLen = (lo + 1 < pts.length ? b.s : loop.total) - a.s || 1;
  const k = (s - a.s) / segLen;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
}

function makeCar(color) {
  const g = new THREE.Group();
  const body = mat(color);
  mesh(new THREE.BoxGeometry(1.3, 0.55, 2.4), body, 0, 0.5, 0, g);
  mesh(new THREE.BoxGeometry(1.15, 0.5, 1.3), body, 0, 1.0, -0.15, g);
  const glass = mat(0xbfe9ff, { emissive: 0x335566, emissiveIntensity: 0.5 });
  mesh(new THREE.BoxGeometry(1.0, 0.36, 0.06), glass, 0, 1.02, 0.52, g);
  mesh(new THREE.BoxGeometry(1.0, 0.36, 0.06), glass, 0, 1.02, -0.82, g);
  for (const sx of [-0.59, 0.59]) mesh(new THREE.BoxGeometry(0.06, 0.32, 1.0), glass, sx, 1.02, -0.15, g);
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8).rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-0.62, 0.75], [0.62, 0.75], [-0.62, -0.75], [0.62, -0.75]]) wheels.push(mesh(wheelGeo, mat(0x2d2d2d), wx, 0.3, wz, g));
  for (const sx of [-0.4, 0.4]) {
    mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 0.5 }), sx, 0.55, 1.21, g);
    mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), mat(0xff4d6d, { emissive: 0x660011 }), sx, 0.55, -1.21, g);
  }
  return { g, wheels };
}

const CRUISE = 3.2; // rustig rijden (de speler loopt 6)

// people: functie die alle posities geeft waarvoor de auto's moeten stoppen (speler, clones, ...)
export function createCars(group, loop, colors, { colliders, onHonk } = {}) {
  const cars = colors.map((c, i) => {
    const { g, wheels } = makeCar(c);
    group.add(g);
    const car = { g, wheels, s: (loop.total * i) / colors.length, speed: CRUISE, wait: 0, honked: false, front: { x: 0, z: 0, r: 0.75 }, back: { x: 0, z: 0, r: 0.75 } };
    if (colliders) colliders.push(car.front, car.back);
    return car;
  });
  const place = (car) => {
    const p = pointAt(loop, car.s), q = pointAt(loop, car.s + 0.8);
    car.g.position.set(p.x, 0, p.z);
    car.g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    car.dir = { x: Math.sin(car.g.rotation.y), z: Math.cos(car.g.rotation.y) };
    car.front.x = p.x + car.dir.x * 0.6; car.front.z = p.z + car.dir.z * 0.6;
    car.back.x = p.x - car.dir.x * 0.6; car.back.z = p.z - car.dir.z * 0.6;
  };
  cars.forEach(place);

  function update(t, dt, people) {
    for (const car of cars) {
      // Staat er iemand voor de auto? Kijk een stukje vooruit over de weg.
      let blocked = false;
      for (let ahead = 1.2; ahead <= 4.4 && !blocked; ahead += 0.8) {
        const p = pointAt(loop, car.s + ahead);
        for (const q of people) if (Math.hypot(q.x - p.x, q.z - p.z) < 1.5) { blocked = true; break; }
      }
      // Niet tegen de auto voor je aan rijden
      let gap = Infinity;
      for (const o of cars) if (o !== car) { const d = ((o.s - car.s) % loop.total + loop.total) % loop.total; gap = Math.min(gap, d); }
      const want = blocked || gap < 4 ? 0 : gap < 7 ? CRUISE * 0.4 : CRUISE;
      car.speed += (want - car.speed) * Math.min(1, dt * (want < car.speed ? 6 : 1.5));
      if (car.speed < 0.02) car.speed = want ? car.speed : 0;
      // Even toeteren als je in de weg staat (vriendelijk!)
      car.wait = blocked && car.speed < 0.2 ? car.wait + dt : 0;
      if (car.wait > 1.2 && !car.honked) { car.honked = true; onHonk?.(car); }
      if (!blocked) car.honked = false;
      car.s = (car.s + car.speed * dt) % loop.total;
      place(car);
      car.g.position.y = Math.abs(Math.sin(t * 9 + car.s)) * 0.03 * (car.speed / CRUISE); // een beetje hobbelen
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.3;
    }
  }
  return { cars, update };
}

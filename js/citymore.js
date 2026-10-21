// De Grote Stad: alles rondom het plein. Een grote ringweg, een rotonde, een lange rechte weg,
// flats, huizen, een stadspark met een vijver en een glijbaan, en een parkeerplaats.
// Idee van Dex: "de stad moet groter, zodat je lekker kunt rijden!"
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh } from './props.js';
import { makeCar, roundedPath } from './cars.js';
import { mergeGroup, instanced } from './optimize.js';

export const RW = 3.4; // zo breed is een weg
// De grote ringweg om de hele stad
export const RING = { minX: -38, maxX: 39, minZ: -20, maxZ: 30 };
export const ROTONDE = { x: -17, z: 30, island: 2.9, mid: 4.6, outer: 6.3 };
export const BIG_BOUNDS = { minX: -40.2, maxX: 41.2, minZ: -22.2, maxZ: 37.2 };

// Bomen: allemaal tegelijk getekend (2 vormen voor alle bomen samen)
export function treeBatch(rand, colliders) {
  const list = [];
  return {
    add(x, z, s = 1, collide = true) {
      list.push({ x, z, s, c: [0x52b788, 0x40916c, 0x74c69d][Math.floor(rand() * 3)], ry: rand() * 6 });
      if (collide) colliders.push({ x, z, r: 0.55 * s, h: 3.2 * s });
    },
    build(group) {
      instanced(group, new THREE.CylinderGeometry(0.18, 0.26, 1.4, 5), mat(0x8b5a2b),
        list.map((t) => ({ x: t.x, y: 0.7 * t.s, z: t.z, s: t.s })));
      instanced(group, new THREE.IcosahedronGeometry(1.1, 0), mat(0xffffff),
        list.map((t) => ({ x: t.x, y: 2 * t.s, z: t.z, s: t.s, ry: t.ry, color: t.c })));
      return list.length;
    },
  };
}

// Een huis (wordt één vorm, zodat het doorzichtig kan worden als het voor de camera staat)
export function makeHouse(group, { boxes, fadeables }, x, z, rot, roof, tall = 1, wall = 0xfff1d6) {
  const g = new THREE.Group();
  const h = 3.4 * tall;
  mesh(new THREE.BoxGeometry(4.4, h, 4.4), mat(wall), 0, h / 2, 0, g);
  mesh(new THREE.ConeGeometry(3.6, 2, 4), mat(roof), 0, h + 1, 0, g).rotation.y = Math.PI / 4;
  mesh(new THREE.BoxGeometry(1, 1.7, 0.1), mat(0x8b5a2b), 0, 0.85, 2.22, g);
  const win = mat(0x9ad7f5);
  for (const wx of [-1.4, 1.4]) mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), win, wx, 1.6, 2.22, g);
  if (tall > 1) for (const wx of [-1.4, 0, 1.4]) mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), win, wx, 3.8, 2.22, g);
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.8, 0.8), win, sx * 2.22, 1.6, 0, g);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  group.add(g);
  const m = mergeGroup(g, { transparent: true });
  boxes.push({ x, z, hw: 2.3, hd: 2.3, h: h + 2.2 });
  fadeables.push({ x, z, r: 2.4, mats: [m], k: 1 });
}

// Een flat: hoog, met rijen ramen, balkonnetjes en iets op het dak
function makeFlat(group, { boxes, fadeables }, x, z, w, d, h, color, trim, fade = true) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(w, h, d), mat(color), 0, h / 2, 0, g);
  mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), mat(trim), 0, h + 0.17, 0, g);
  mesh(new THREE.BoxGeometry(w + 0.2, 0.9, d + 0.2), mat(trim), 0, 0.45, 0, g);
  const win = mat(0x9ad7f5), bal = mat(0xffffff);
  const cols = Math.max(2, Math.floor(w / 1.4)), dcols = Math.max(1, Math.floor(d / 1.6));
  for (let y = 2.0; y < h - 0.8; y += 1.9) {
    for (let i = 0; i < cols; i++) {
      const wx = -w / 2 + (w / cols) * (i + 0.5);
      if (y < 2.5 && Math.abs(wx) < 0.8) continue; // daar zit de deur
      mesh(new THREE.BoxGeometry(0.75, 0.9, 0.1), win, wx, y, d / 2 + 0.03, g);
      mesh(new THREE.BoxGeometry(0.75, 0.9, 0.1), win, wx, y, -d / 2 - 0.03, g);
      if (i % 2 === 0 && y > 3) mesh(new THREE.BoxGeometry(1.0, 0.1, 0.45), bal, wx, y - 0.55, d / 2 + 0.22, g);
    }
    for (let i = 0; i < dcols; i++) {
      const wz = -d / 2 + (d / dcols) * (i + 0.5);
      for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.9, 0.75), win, sx * (w / 2 + 0.03), y, wz, g);
    }
  }
  mesh(new THREE.BoxGeometry(1.4, 2.0, 0.15), mat(0x6b4226), 0, 1.0, d / 2 + 0.05, g);
  mesh(new THREE.BoxGeometry(1.8, 0.12, 0.9), mat(trim), 0, 2.2, d / 2 + 0.4, g);
  mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), mat(0xadb5bd), w / 4, h + 0.8, -d / 5, g);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4), mat(0x6c757d), -w / 3, h + 1.4, d / 5, g);
  g.position.set(x, 0, z);
  group.add(g);
  const m = mergeGroup(g, { transparent: fade });
  boxes.push({ x, z, hw: w / 2 + 0.1, hd: d / 2 + 0.1, h: h + 2.5 }); // flats: te hoog om overheen te vliegen
  if (fade) fadeables.push({ x, z, r: Math.max(w, d) / 2 + 0.4, mats: [m], k: 1, tall: h });
}

export function createBigCity(group, { colliders, boxes, fadeables, updaters, rand, flat, trees, bench }) {
  const ctx = { boxes, fadeables };
  const roadC = 0x6c727a;
  const dashes = [], lamps = [];
  const R = RING, T = ROTONDE;
  // Kruispunten: daar geen witte streepjes
  const junctions = [
    [R.minX, R.minZ], [R.maxX, R.minZ], [R.minX, R.maxZ], [R.maxX, R.maxZ], [-26, R.minZ], [-26, 6], [R.minX, 6],
    [-17, 6], [-17, 17.5], [17, 17.5], [17, R.maxZ], [R.maxX, 15.7],
  ];
  const nearJunction = (x, z) => junctions.some(([jx, jz]) => Math.abs(jx - x) < 2.9 && Math.abs(jz - z) < 2.9) || Math.hypot(x - T.x, z - T.z) < T.outer + 1;
  function road(x1, z1, x2, z2, { stripes = true } = {}) {
    const horiz = z1 === z2;
    const len = horiz ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    flat(horiz ? len + RW : RW, horiz ? RW : len + RW, roadC, (x1 + x2) / 2, (z1 + z2) / 2, 0.035);
    if (!stripes) return;
    for (let k = 1.6; k < len - 1.2; k += 2.4) {
      const x = horiz ? Math.min(x1, x2) + k : x1, z = horiz ? z1 : Math.min(z1, z2) + k;
      if (!nearJunction(x, z)) dashes.push({ x, y: 0.045, z, ry: horiz ? 0 : Math.PI / 2 });
    }
  }
  // ---------- Wegen ----------
  road(R.minX, R.minZ, R.maxX, R.minZ);          // de LANGE WEG (noord)
  road(R.minX, R.maxZ, T.x - T.outer + 0.6, R.maxZ); // zuid, links van de rotonde
  road(T.x + T.outer - 0.6, R.maxZ, R.maxX, R.maxZ); // zuid, rechts van de rotonde
  road(R.minX, R.minZ, R.minX, R.maxZ);          // west
  road(R.maxX, R.minZ, R.maxX, R.maxZ);          // oost
  road(-26, R.minZ, -26, 6);                     // dwarsstraat west
  road(R.minX, 6, -17, 6);                       // naar het rondje bij het plein
  road(-17, 17.5, -17, T.z - T.outer + 0.6);     // naar de rotonde
  road(17, 17.5, 17, R.maxZ);                    // naar de zuidweg
  flat(2.6, 7.1, 0x8d939c, 37.2, 15.65, 0.03);   // parkeerterrein Autowinkel -> oostweg
  // zebrapaden
  const zebra = (x, z, horiz) => { for (let i = 0; i < 6; i++) flat(horiz ? 0.6 : RW - 0.4, horiz ? RW - 0.4 : 0.6, 0xffffff, horiz ? x - 2.6 + i * 1.04 : x, horiz ? z : z - 2.6 + i * 1.04, 0.045); };
  zebra(0, R.minZ, true); zebra(-26, -2, false); zebra(17, 25, false);

  // ---------- De rotonde ----------
  const ring = mesh(new THREE.RingGeometry(T.island - 0.1, T.outer, 40).rotateX(-Math.PI / 2), mat(roadC, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), T.x, 0.04, T.z, group);
  ring.castShadow = false;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    dashes.push({ x: T.x + Math.sin(a) * T.mid, y: 0.05, z: T.z + Math.cos(a) * T.mid, ry: a });
  }
  mesh(new THREE.CylinderGeometry(T.island + 0.15, T.island + 0.2, 0.25, 24), mat(0xffffff), T.x, 0.12, T.z, group);
  mesh(new THREE.CylinderGeometry(T.island, T.island, 0.35, 24), mat(0x74c69d), T.x, 0.18, T.z, group);
  mesh(new THREE.CylinderGeometry(0.8, 1.1, 1.2, 8), mat(0xb8bec7), T.x, 0.9, T.z, group);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    mesh(new THREE.OctahedronGeometry(0.22, 0), mat([0xff6b6b, 0xffd23f, 0xffffff, 0xc77dff][i % 4]), T.x + Math.sin(a) * 2.2, 0.55, T.z + Math.cos(a) * 2.2, group);
  }
  // een reuzenkristal in het midden (het teken van De Stad)
  const gem = mesh(new THREE.OctahedronGeometry(1.0, 0), mat(0x7af7ff, { emissive: 0x1b6ca8, emissiveIntensity: 0.7, roughness: 0.3 }), T.x, 2.6, T.z, group);
  gem.scale.y = 1.5;
  updaters.push((t) => { gem.rotation.y = t * 0.8; gem.position.y = 2.6 + Math.sin(t * 1.6) * 0.15; });
  colliders.push({ x: T.x, z: T.z, r: T.island + 0.1, h: 3.6 });

  // ---------- Flats (hoge gebouwen) ----------
  makeFlat(group, ctx, -32, -14.2, 6, 5.6, 13.3, 0xbde0fe, 0x3a86ff);
  makeFlat(group, ctx, -32, -3.5, 6, 5, 9.5, 0xffc8dd, 0xd63384);
  makeFlat(group, ctx, 25.5, -13, 5.6, 5, 11.4, 0xfde4cf, 0xe76f51);
  makeFlat(group, ctx, 32.6, -13, 5.6, 5, 15.2, 0xcdb4db, 0x7209b7);

  // ---------- Huizen ----------
  const roofs = [0xd1495b, 0x3a86ff, 0x9b5de5, 0x2a9d8f, 0xff8c42];
  makeHouse(group, ctx, 21.8, 25.3, 0, roofs[1], 1.6, 0xffe8d6);
  makeHouse(group, ctx, 27.4, 25.3, 0, roofs[4], 1, 0xfff1d6);
  makeHouse(group, ctx, 33, 25.3, 0, roofs[3], 1.6, 0xe9f5db);
  makeHouse(group, ctx, -21.6, 11.2, Math.PI / 2, roofs[0], 1.6, 0xffe8d6);

  // ---------- De parkeerplaats (west) ----------
  const LX = -31.5, LZ = 12.4;
  flat(9.6, 7.4, 0x8d939c, LX, LZ, 0.03);
  for (let i = 0; i <= 5; i++) {
    const x = LX - 4.5 + i * 1.8;
    flat(0.1, 2.6, 0xffffff, x, LZ - 2.2, 0.04);
    flat(0.1, 2.6, 0xffffff, x, LZ + 2.2, 0.04);
  }
  flat(9.2, 0.1, 0xffffff, LX, LZ, 0.04);
  const pColors = [0xff8fab, 0x4cc9f0, 0xf4a261, 0x80ed99];
  [[LX - 3.6, LZ - 2.1, 0], [LX + 0, LZ - 2.1, 0], [LX - 1.8, LZ + 2.1, Math.PI], [LX + 3.6, LZ + 2.1, Math.PI]].forEach(([x, z, r], i) => {
    const { g } = makeCar(pColors[i]);
    g.position.set(x, 0, z); g.rotation.y = r; group.add(g);
    colliders.push({ x, z: z - 0.6, r: 0.75 }, { x, z: z + 0.6, r: 0.75 });
  });
  // een bord: P
  const pSign = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), mat(0x495057), 0, 1.2, 0, pSign);
  mesh(new THREE.BoxGeometry(1.0, 1.0, 0.1), mat(0x1d4ed8), 0, 2.6, 0, pSign);
  mesh(new THREE.BoxGeometry(0.16, 0.7, 0.04), mat(0xffffff), -0.16, 2.6, 0.07, pSign);
  mesh(new THREE.BoxGeometry(0.34, 0.16, 0.04), mat(0xffffff), 0.0, 2.87, 0.07, pSign);
  mesh(new THREE.BoxGeometry(0.34, 0.16, 0.04), mat(0xffffff), 0.0, 2.55, 0.07, pSign);
  mesh(new THREE.BoxGeometry(0.12, 0.3, 0.04), mat(0xffffff), 0.15, 2.71, 0.07, pSign);
  pSign.position.set(LX + 5.3, 0, LZ - 3.6); group.add(pSign);
  colliders.push({ x: LX + 5.3, z: LZ - 3.6, r: 0.2 });

  // ---------- Het stadspark (zuidwest) met een vijver en een glijbaan ----------
  const PX = -29.5, PZ = 22.6;
  flat(13, 9.6, 0x95d5b2, PX, PZ, 0.025);
  flat(13, 1.2, 0xe8dcc4, PX, PZ, 0.03);
  flat(1.2, 9.6, 0xe8dcc4, PX + 2, PZ, 0.03);
  const pond = mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.1, 16), mat(0x4fb3e8, { roughness: 0.2 }), PX - 3.4, 0.06, PZ + 2.6, group);
  pond.castShadow = false;
  mesh(new THREE.TorusGeometry(2.35, 0.18, 4, 16).rotateX(Math.PI / 2), mat(0xb8bec7), PX - 3.4, 0.1, PZ + 2.6, group);
  colliders.push({ x: PX - 3.4, z: PZ + 2.6, r: 2.4 });
  // eendjes
  const ducks = [];
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.4, 0.25, 0.55), mat(i ? 0xffd23f : 0xffffff), 0, 0, 0, d);
    mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat(i ? 0xffd23f : 0xffffff), 0, 0.22, 0.2, d);
    mesh(new THREE.BoxGeometry(0.12, 0.06, 0.15), mat(0xff8c42), 0, 0.2, 0.37, d);
    group.add(d); ducks.push(d);
  }
  updaters.push((t) => ducks.forEach((d, i) => {
    const a = t * 0.35 + i * 2.1;
    d.position.set(PX - 3.4 + Math.cos(a) * 1.4, 0.2 + Math.sin(t * 3 + i) * 0.03, PZ + 2.6 + Math.sin(a) * 1.4);
    d.rotation.y = -a;
  }));
  // glijbaan
  const slide = new THREE.Group();
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), mat(0xe63946), sx, 1.1, sz, slide);
  mesh(new THREE.BoxGeometry(1.2, 0.12, 1.2), mat(0xffd23f), 0, 2.2, 0, slide);
  for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), mat(0x3a86ff), 0, 0.4 + i * 0.4, -0.56, slide);
  const ramp = mesh(new THREE.BoxGeometry(0.9, 0.1, 3.0), mat(0x3a86ff), 0, 1.15, 1.75, slide);
  ramp.rotation.x = 0.72;
  slide.position.set(PX + 4.8, 0, PZ + 1.2); group.add(slide);
  colliders.push({ x: PX + 4.8, z: PZ + 1.2, r: 0.9 }, { x: PX + 4.8, z: PZ + 2.9, r: 0.6 });
  bench(PX - 0.6, PZ - 1.4, 0); bench(PX + 4.6, PZ - 1.4, 0);
  for (const [x, z, s] of [[PX - 5.5, PZ - 3.4, 1.2], [PX - 1.2, PZ - 3.6, 1], [PX + 5.3, PZ - 3.4, 1.1], [PX + 0.6, PZ + 3.8, 1.3], [PX + 5.6, PZ + 4.0, 1]]) trees.add(x, z, s);

  // ---------- Bomen, door de hele stad ----------
  const T2 = [
    [-35, 0.5, 1.1], [-28.5, 2.5, 1], [-35.5, -8.5, 1.2], [-28.5, -9, 1], [-23, -14.6, 1.1], [-23.6, 2.4, 1],
    [-23, 7.9, 1], [-35.5, 17.5, 1.2], [-28, 17.2, 1], [-21, 16.4, 1],
    [-12.8, 21.2, 1], [12.8, 21.2, 1], [-5.5, 27.5, 1.2], [5.5, 27.5, 1.2], [13, 27.4, 1], [-12, -15.2, 1], [-3.5, -15.4, 1.1], [3.5, -15.4, 1], [12, -15.2, 1.1],
    [36.4, 27.2, 1], [36, -16, 1], [22, -17.4, 0.9],
  ];
  for (const [x, z, s] of T2) trees.add(x, z, s);
  // buiten de stad: veel bomen (daar kun je niet komen)
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * 60, z = 8 + Math.sin(a) * 44;
    const cx = Math.max(-46, Math.min(47, x)), cz = Math.max(-24, Math.min(44, z));
    if (cz < -22.5) continue; // achter de skyline
    trees.add(cx + (rand() - 0.5) * 3, cz + (rand() - 0.5) * 3, 1.3 + rand() * 0.8, false);
  }

  // ---------- De skyline (ver weg, achter de lange weg) ----------
  const sky = [0xcdb4db, 0xbde0fe, 0xffc8dd, 0xfde4cf, 0xd8e2dc];
  for (let i = 0; i < 20; i++) {
    const x = -52 + i * 5.5 + (rand() - 0.5) * 2, h = 9 + rand() * 12, z = -33 - rand() * 3;
    mesh(new THREE.BoxGeometry(4.6, h, 4.6), mat(sky[i % 5]), x, h / 2, z, group);
    for (let y = 2; y < h - 1; y += 2.2) mesh(new THREE.BoxGeometry(3.6, 0.7, 0.1), mat(0x9ad7f5, { emissive: 0x335566 }), x, y, z + 2.31, group);
  }
  for (const [x, z, h] of [[48, -6, 14], [49, 6, 10], [48, 18, 16], [-48, -10, 12], [-49, 4, 15], [-48, 18, 9]]) {
    mesh(new THREE.BoxGeometry(5, h, 5), mat(sky[Math.floor(rand() * 5)]), x, h / 2, z, group);
    for (let y = 2; y < h - 1; y += 2.2) mesh(new THREE.BoxGeometry(0.1, 0.7, 3.8), mat(0x9ad7f5, { emissive: 0x335566 }), x - Math.sign(x) * 2.53, y, z, group);
  }

  // ---------- Lantaarnpalen langs de grote wegen ----------
  for (let x = -34; x <= 36; x += 10) if (Math.abs(x) > 17.5) lamps.push([x, R.minZ + 2.3]);
  for (let x = -34; x <= 36; x += 10) if (Math.abs(x - T.x) > 8) lamps.push([x, R.maxZ + 2.3]);
  for (let z = -12; z <= 26; z += 12) lamps.push([R.minX - 2.3, z], [R.maxX + 2.3, z]);
  for (const [x, z] of lamps) colliders.push({ x, z, r: 0.25, h: 3.9 });
  instanced(group, new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6), mat(0x2d3142), lamps.map(([x, z]) => ({ x, y: 1.8, z })));
  instanced(group, new THREE.SphereGeometry(0.25, 6, 4), mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 0.6 }), lamps.map(([x, z]) => ({ x, y: 3.7, z })), { cast: false });
  // alle witte streepjes in één keer
  instanced(group, new THREE.PlaneGeometry(1.2, 0.18).rotateX(-Math.PI / 2), mat(0xffffff, { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), dashes, { cast: false });

  // ---------- Route voor de nieuwe autootjes: de grote ringweg, met een rondje over de rotonde ----------
  const ea = 1.2; // waar je de rotonde op- en afrijdt
  const route = roundedPath([
    { x: R.minX, z: R.maxZ, r: 3 },
    { x: T.x - T.outer - 1.5, z: R.maxZ, r: 1.5 },
    ...Array.from({ length: 13 }, (_, k) => { const a = -ea + (2 * ea * k) / 12; return { x: T.x + Math.sin(a) * T.mid, z: T.z + Math.cos(a) * T.mid }; }),
    { x: T.x + T.outer + 1.5, z: R.maxZ, r: 1.5 },
    { x: R.maxX, z: R.maxZ, r: 3 }, { x: R.maxX, z: R.minZ, r: 3 }, { x: R.minX, z: R.minZ, r: 3 },
  ]);

  const W = (x1, z1, x2, z2) => ({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: Math.abs(x2 - x1) + RW, d: Math.abs(z2 - z1) + RW, color: '#6c727a' });
  return {
    route,
    mapItems: [
      W(R.minX, R.minZ, R.maxX, R.minZ), W(R.minX, R.maxZ, R.maxX, R.maxZ), W(R.minX, R.minZ, R.minX, R.maxZ), W(R.maxX, R.minZ, R.maxX, R.maxZ),
      W(-26, R.minZ, -26, 6), W(R.minX, 6, -17, 6), W(-17, 17.5, -17, 24), W(17, 17.5, 17, R.maxZ),
      { x: T.x, z: T.z, r: T.outer, color: '#6c727a' }, { x: T.x, z: T.z, r: T.island, color: '#74c69d' },
      { x: LX, z: LZ, w: 9.6, d: 7.4, color: '#8d939c' }, { x: PX, z: PZ, w: 13, d: 9.6, color: '#95d5b2' }, { x: PX - 3.4, z: PZ + 2.6, r: 2.3, color: '#4fb3e8' },
    ],
    labels: [
      { x: 0, z: R.minZ - 1.2, text: 'Lange weg' }, { x: T.x, z: T.z + T.outer + 1, text: 'Rotonde' },
      { x: LX, z: LZ, text: 'Parkeren' }, { x: PX, z: PZ - 3.6, text: 'Stadspark' }, { x: 29, z: -16.5, text: 'Flats' },
    ],
  };
}

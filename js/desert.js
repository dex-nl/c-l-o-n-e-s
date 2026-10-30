// De Grote Woestijn (hoofdstuk 3, idee van Dex): heel groot, met duinen, cactussen, een oase,
// ruïnes, piramides, mummieslijmpjes en af en toe een ZANDSTORM.
// Achterin staat de Grote Piramide. De deur gaat pas open als alle 3 de zonnestenen schijnen.
// Wil je iets verplaatsen? De belangrijkste plekken staan hieronder in SPOTS en PATHS.
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, seeded } from './props.js';
import { makePortal } from './world.js';
import { mergeStatic, mergeGroup, instanced } from './optimize.js';
import { collide } from './physics.js';

// De rand van de woestijn (veel groter dan De Grote Stad!)
export const DESERT_BOUNDS = { minX: -62, maxX: 62, minZ: -98, maxZ: 30 };
// Stenen paden (van punt naar punt): volg ze, dan verdwaal je niet
const PATHS = [
  [0, 27, 0, -66],      // hoofdpad: van de poort naar de Grote Piramide
  [0, -30, -44, -30],   // naar de Oude Ruïne (westen)
  [0, -40, 43, -40],    // naar de Kleine Piramide (oosten)
  [0, 10, -40, 10],     // naar de Vergeten Tempel (zuidwesten)
  [0, -8, -9, -8],      // naar de oase
  [0, 2, 24, -6],       // naar Sfinx Sam
];
const PYRAMID = { x: 0, z: -82, half: 14, h: 19 }; // de Grote Piramide
const DOOR_Z = PYRAMID.z + PYRAMID.half;          // hier zit de deur (voorkant)
export const SUN_STONES = [
  { id: 'west', name: 'de Oude Ruïne', x: -47, z: -30 },
  { id: 'oost', name: 'de Kleine Piramide', x: 46, z: -40 },
  { id: 'tempel', name: 'de Vergeten Tempel', x: -43, z: 10 },
];
const OASIS = { x: -17, z: -9, r: 5 };
// De groene poort naar Het Doolhof (verschijnt als Schorpioen Sjors verslagen is)
export const MAZE_PORTAL = { x: 21, z: -62 };
// De rode poort naar De Vulkaan (verschijnt als Bladkoning Bram verslagen is)
export const VOLCANO_PORTAL = { x: -21, z: -62 };
// De blauwe poort naar De Onderwaterwereld, bij de oase (verschijnt als Vuurdraak Vonk verslagen is)
export const SEA_PORTAL = { x: -17, z: 0.4 };
// De witte poort naar De IJswereld, tegenover de oase (verschijnt als Reuzeninktvis Inka verslagen is)
export const ICE_PORTAL = { x: 17, z: 0.4 };
// De paarse poort naar Het Spookkasteel, bij de ingang van de woestijn (verschijnt als IJsdraak IJzel verslagen is)
export const CASTLE_PORTAL = { x: 13, z: 17 };
// (geheim: zie GAME.md)
const PEBBLE = { x: 29.8, z: -18.6 };

function segDist(x, z, [x1, z1, x2, z2]) {
  const dx = x2 - x1, dz = z2 - z1, L = dx * dx + dz * dz;
  const k = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / L));
  return Math.hypot(x - (x1 + dx * k), z - (z1 + dz * k));
}
const pathDist = (x, z) => Math.min(...PATHS.map((p) => segDist(x, z, p)));

// Kameel Karel: hij kauwt, knippert en weet alles van de woestijn
class Camel {
  constructor(group, x, z, rot) {
    this.id = 'kameel'; this.name = 'Kameel Karel'; this.voice = 0.75;
    const g = new THREE.Group();
    const fur = mat(0xd4a373), dark = mat(0x9c6644), white = mat(0xffffff), black = mat(0x1d1d1d), red = mat(0xe63946);
    const b = (w, h, d, m, px, py, pz, parent = g) => mesh(new THREE.BoxGeometry(w, h, d), m, px, py, pz, parent);
    b(1.0, 0.9, 2.0, fur, 0, 1.6, 0);
    b(0.8, 0.6, 0.7, fur, 0, 2.25, -0.35);   // bult
    b(0.6, 0.4, 0.5, fur, 0, 2.6, -0.35);
    b(1.1, 0.2, 1.3, red, 0, 2.08, 0.35);    // een kleedje
    for (const [lx, lz] of [[-0.35, 0.75], [0.35, 0.75], [-0.35, -0.75], [0.35, -0.75]]) b(0.22, 1.2, 0.22, dark, lx, 0.6, lz);
    b(0.38, 1.1, 0.38, fur, 0, 2.3, 1.05);   // nek
    const head = new THREE.Group();
    head.position.set(0, 2.9, 1.3);
    g.add(head);
    b(0.5, 0.45, 0.8, fur, 0, 0, 0.15, head);
    this.mouth = b(0.44, 0.15, 0.4, dark, 0, -0.2, 0.42, head);
    for (const sx of [-0.2, 0.2]) {
      b(0.12, 0.14, 0.06, white, sx, 0.12, 0.38, head);
      b(0.06, 0.08, 0.04, black, sx, 0.12, 0.42, head);
      b(0.08, 0.16, 0.08, dark, sx * 1.1, 0.3, -0.1, head);
    }
    this.head = head;
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    group.add(g);
    this.mesh = g;
    this.pos = g.position;
  }
  showMarker() {}
  distanceTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }
  update(t) {
    this.mouth.position.x = Math.sin(t * 5) * 0.05; // kauwen
    this.head.rotation.x = Math.sin(t * 0.8) * 0.08;
  }
}

export function createDesert(group) {
  const rand = seeded(23);
  const colliders = [], boxes = [], updaters = [], keep = [];
  const B = DESERT_BOUNDS;
  const cx = (B.minX + B.maxX) / 2, cz = (B.minZ + B.maxZ) / 2;
  // plekken waar geen duinen of cactussen mogen staan
  const avoid = [
    { x: PYRAMID.x, z: PYRAMID.z, r: PYRAMID.half + 6 }, { x: OASIS.x, z: OASIS.z, r: OASIS.r + 5 },
    ...SUN_STONES.map((s) => ({ x: s.x, z: s.z, r: 9 })), { x: 0, z: 24, r: 8 },
    { x: 24, z: -12, r: 9 }, { x: -50, z: -58, r: 12 }, { x: 50, z: -58, r: 11 }, { x: 42, z: 14, r: 9 },
    { x: MAZE_PORTAL.x, z: MAZE_PORTAL.z, r: 6 }, { x: VOLCANO_PORTAL.x, z: VOLCANO_PORTAL.z, r: 6 },
  ];
  const free = (x, z, r) => !avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r + r);

  // ---------- Zandgrond met hoge duinen buiten de rand ----------
  const groundGeo = new THREE.PlaneGeometry(320, 300, 110, 100);
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(cx, 0, cz);
  const gp = groundGeo.attributes.position, colors = [];
  const cSand = new THREE.Color(0xf2d38f), cLight = new THREE.Color(0xf8e3b0), cDark = new THREE.Color(0xd9a65e);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const out = Math.max(B.minX - x, x - B.maxX, B.minZ - z, z - B.maxZ, 0); // hoe ver buiten de rand
    const wave = Math.sin(x * 0.11 + z * 0.05) * Math.cos(z * 0.09 - x * 0.03);
    let y = out > 1 ? Math.min(14, (out - 1) * 0.5) * (0.75 + 0.25 * wave) + wave * Math.min(1, out / 6) * 1.5 : 0;
    gp.setY(i, y);
    const c = cSand.clone().lerp(wave > 0 ? cLight : cDark, Math.abs(wave) * 0.6 + rand() * 0.15);
    colors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0xffffff, { vertexColors: true }));
  ground.receiveShadow = true;
  ground.castShadow = false;
  group.add(ground);

  // ---------- Stenen paden ----------
  const tiles = [];
  for (const [x1, z1, x2, z2] of PATHS) {
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(L / 1.5), a = Math.atan2(x2 - x1, z2 - z1);
    const px = Math.cos(a), pz = -Math.sin(a); // opzij
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = x1 + (x2 - x1) * k, z = z1 + (z2 - z1) * k;
      for (const side of [-0.65, 0.65]) {
        if (rand() < 0.12) continue; // een paar stenen zijn weggewaaid
        tiles.push({ x: x + px * side + (rand() - 0.5) * 0.15, y: 0.03, z: z + pz * side + (rand() - 0.5) * 0.15, ry: a + (rand() - 0.5) * 0.25, s: 0.85 + rand() * 0.25, sy: 1, color: [0xcdb38a, 0xbfa57c, 0xd8c29a][Math.floor(rand() * 3)] });
      }
    }
  }
  instanced(group, new THREE.BoxGeometry(1.15, 0.08, 1.2), mat(0xffffff), tiles, { cast: false });

  // ---------- Duinen in de woestijn (je moet eromheen lopen) ----------
  const dunes = [];
  for (let tries = 0; dunes.length < 85 && tries < 3000; tries++) {
    const x = B.minX + 4 + rand() * (B.maxX - B.minX - 8), z = B.minZ + 4 + rand() * (B.maxZ - B.minZ - 8);
    const sx = 3 + rand() * 4.5, sz = 3 + rand() * 4, sy = 1.1 + rand() * 1.3;
    const big = Math.max(sx, sz);
    if (pathDist(x, z) < big + 2.5 || !free(x, z, big) || dunes.some((d) => Math.hypot(d.x - x, d.z - z) < big + Math.max(d.sx, d.sz) - 1)) continue;
    const ry = rand() * Math.PI;
    dunes.push({ x, y: -0.15, z, sx, sy, sz, ry, color: [0xf0cf86, 0xeec37a, 0xf5d999][Math.floor(rand() * 3)] });
    // botsen: een paar cirkels over de lengte van de duin
    const ax = Math.sin(ry), az = Math.cos(ry), r = Math.min(sx, sz) * 0.8;
    const len = Math.max(0, (sz - sx)) * 0.6, len2 = Math.max(0, (sx - sz)) * 0.6;
    const h = sy + 0.2; // (voor de Wolkenflitser: over een duin kun je heen vliegen)
    colliders.push({ x, z, r, h });
    if (len > 0.5) colliders.push({ x: x + ax * len, z: z + az * len, r: r * 0.85, h }, { x: x - ax * len, z: z - az * len, r: r * 0.85, h });
    if (len2 > 0.5) colliders.push({ x: x + az * len2, z: z - ax * len2, r: r * 0.85, h }, { x: x - az * len2, z: z + ax * len2, r: r * 0.85, h });
  }
  const duneGeo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  instanced(group, duneGeo, mat(0xffffff), dunes);

  // ---------- Cactussen (één vorm, heel vaak getekend) ----------
  const cg = new THREE.Group();
  const green = mat(0x52a447), green2 = mat(0x3f8a3a), flower = mat(0xff8fab);
  mesh(new THREE.CylinderGeometry(0.3, 0.36, 2.4, 7), green, 0, 1.2, 0, cg);
  mesh(new THREE.SphereGeometry(0.3, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), green, 0, 2.4, 0, cg);
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.7, 6), green2, 0.45, 1.1, 0, cg).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 6), green2, 0.75, 1.5, 0, cg);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 6), green2, -0.4, 1.5, 0, cg).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 6), green2, -0.65, 1.8, 0, cg);
  mesh(new THREE.OctahedronGeometry(0.16, 0), flower, 0, 2.62, 0, cg);
  mesh(new THREE.OctahedronGeometry(0.11, 0), flower, 0.75, 2.0, 0, cg);
  mergeGroup(cg);
  const cactusGeo = cg.children[0].geometry;
  const cacti = [];
  for (let tries = 0; cacti.length < 120 && tries < 4000; tries++) {
    const x = B.minX + 2 + rand() * (B.maxX - B.minX - 4), z = B.minZ + 2 + rand() * (B.maxZ - B.minZ - 4);
    const s = 0.7 + rand() * 0.7;
    if (pathDist(x, z) < 2.6 || !free(x, z, 1) || colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.8)) continue;
    cacti.push({ x, z, ry: rand() * 6, s, color: rand() < 0.5 ? 0xffffff : 0xdff5d0 });
    colliders.push({ x, z, r: 0.42 * s, h: 2.4 * s });
  }
  // nog meer cactussen buiten de rand (alleen om naar te kijken)
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, d = 8 + rand() * 30;
    const x = cx + Math.cos(a) * (70 + d), z = cz + Math.sin(a) * (72 + d);
    cacti.push({ x, z, ry: rand() * 6, s: 1 + rand() * 0.8, color: 0xffffff });
  }
  instanced(group, cactusGeo, mat(0xffffff, { vertexColors: true }), cacti);

  // ---------- Stenen ----------
  const rocks = [];
  for (let i = 0; i < 90; i++) {
    const x = B.minX + rand() * (B.maxX - B.minX), z = B.minZ + rand() * (B.maxZ - B.minZ);
    if (pathDist(x, z) < 1.8) continue;
    rocks.push({ x, y: 0.1, z, rx: rand() * 3, ry: rand() * 3, s: 0.2 + rand() * 0.45, color: [0xc9a074, 0xb08860, 0xd8b98d][i % 3] });
  }
  instanced(group, new THREE.DodecahedronGeometry(1, 0), mat(0xffffff), rocks, { receive: false });

  // ---------- Piramides ----------
  const sandstone = mat(0xe9c46a), sand2 = mat(0xdcb35c), gold = mat(0xffd23f, { emissive: 0x7a5a00, emissiveIntensity: 0.6, metalness: 0.4 });
  function pyramid(x, z, half, h, { steps = 0, cap = true, collide = true } = {}) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (steps) {
      for (let i = 0; i < steps; i++) {
        const w = half * 2 * (1 - i / steps), sh = h / steps;
        mesh(new THREE.BoxGeometry(w, sh, w), i % 2 ? sand2 : sandstone, 0, sh * (i + 0.5), 0, g);
      }
    } else {
      const p = mesh(new THREE.ConeGeometry(half * Math.SQRT2, h, 4, 1), sandstone, 0, h / 2, 0, g);
      p.rotation.y = Math.PI / 4;
      // stenen randjes zodat je de lagen ziet
      for (let i = 1; i < 6; i++) {
        const k = i / 6, w = half * 2 * (1 - k);
        const r = mesh(new THREE.BoxGeometry(w + 0.25, 0.18, w + 0.25), sand2, 0, h * k, 0, g);
        r.castShadow = false;
      }
    }
    if (cap) {
      const c = mesh(new THREE.ConeGeometry(half * Math.SQRT2 * 0.12, h * 0.12, 4), gold, 0, h * (steps ? 1.06 : 0.94), 0, g);
      c.rotation.y = Math.PI / 4;
    }
    group.add(g);
    if (collide) boxes.push({ x, z, hw: half, hd: half, h: Math.max(h, 30) }); // piramides: ook vliegend kom je er niet overheen of in
    return g;
  }
  pyramid(PYRAMID.x, PYRAMID.z, PYRAMID.half, PYRAMID.h);
  pyramid(-50, -60, 9, 11);
  pyramid(51, -58, 8, 9, { steps: 5 });
  pyramid(43, 15, 5.5, 6, { steps: 4 });
  // ver weg (alleen om naar te kijken): zo zie je overal waar je bent
  pyramid(-95, -50, 22, 28, { collide: false });
  pyramid(95, -95, 26, 32, { collide: false });
  pyramid(-40, -130, 18, 22, { collide: false, steps: 6 });
  pyramid(60, 55, 14, 16, { collide: false });

  // De deur van de Grote Piramide
  for (const sx of [-1.9, 1.9]) {
    mesh(new THREE.BoxGeometry(1.1, 5, 1.8), sand2, sx, 2.5, DOOR_Z + 0.3, group);
    boxes.push({ x: sx, z: DOOR_Z + 0.3, hw: 0.55, hd: 0.9, h: 30 });
  }
  mesh(new THREE.BoxGeometry(5, 1.2, 2), sand2, 0, 5.4, DOOR_Z + 0.3, group);
  const sunSign = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 12), gold, 0, 5.4, DOOR_Z + 1.35, group);
  sunSign.rotation.x = Math.PI / 2;
  const hole = new THREE.Mesh(new THREE.BoxGeometry(2.7, 4.8, 1.0), new THREE.MeshBasicMaterial({ color: 0x1a1008 }));
  hole.position.set(0, 2.4, DOOR_Z - 0.1);
  group.add(hole);
  const door = new THREE.Group();
  door.userData.keep = true;
  mesh(new THREE.BoxGeometry(2.7, 4.8, 0.5), mat(0xc9a25a), 0, 2.4, 0, door);
  // drie zonnetjes op de deur: ze gaan branden als een zonnesteen schijnt
  const doorSuns = [-0.8, 0, 0.8].map((dx) => {
    const s = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10), mat(0x6c757d), dx, 3.3, 0.28, door);
    s.rotation.x = Math.PI / 2;
    return s;
  });
  mesh(new THREE.BoxGeometry(1.6, 0.12, 0.06), mat(0x8d6e3f), 0, 2.0, 0.27, door);
  door.position.set(0, 0, DOOR_Z + 0.5);
  group.add(door);
  const doorBox = { x: 0, z: DOOR_Z + 0.5, hw: 1.4, hd: 0.3, h: 30 };
  boxes.push(doorBox);

  // Twee lieve kattenbeelden naast het pad naar de deur
  function catStatue(x, z, rot, s = 1) {
    const g = new THREE.Group();
    const st = mat(0xdcb35c), eye = mat(0x2a9d8f, { emissive: 0x0b4f47 });
    mesh(new THREE.BoxGeometry(1.4, 1.0, 2.6), st, 0, 0.5, -0.2, g);
    mesh(new THREE.BoxGeometry(1.6, 0.4, 3.2), mat(0xc9a25a), 0, 0.2, -0.2, g);
    mesh(new THREE.BoxGeometry(1.1, 1.4, 1.0), st, 0, 1.4, 0.6, g);
    mesh(new THREE.BoxGeometry(1.0, 0.9, 0.9), st, 0, 2.4, 0.8, g);
    for (const ex of [-0.33, 0.33]) {
      const ear = mesh(new THREE.ConeGeometry(0.2, 0.45, 4), st, ex, 3.0, 0.8, g);
      ear.rotation.y = Math.PI / 4;
      mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), eye, ex * 0.7, 2.5, 1.27, g);
    }
    mesh(new THREE.BoxGeometry(0.15, 0.1, 0.05), mat(0xe76f51), 0, 2.3, 1.27, g);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.scale.setScalar(s);
    group.add(g);
    colliders.push({ x, z, r: 1.4 * s, h: 3.3 * s });
  }
  catStatue(-4.5, DOOR_Z + 6, 0, 1.3);
  catStatue(4.5, DOOR_Z + 6, 0, 1.3);

  // ---------- Sfinx Sam: een reuzenkat van steen (een herkenningspunt) ----------
  {
    const g = new THREE.Group();
    const st = mat(0xe0b962), st2 = mat(0xc9a25a), blue = mat(0x3a86ff), eye = mat(0x1d1d1d);
    mesh(new THREE.BoxGeometry(5, 2.6, 9), st, 0, 1.3, -1, g);
    for (const px of [-1.6, 1.6]) mesh(new THREE.BoxGeometry(1.2, 0.9, 3.6), st2, px, 0.45, 4.6, g);
    mesh(new THREE.BoxGeometry(3.4, 3.6, 3), st, 0, 3.6, 2.4, g);
    // hoofddoek met blauwe strepen
    for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(4.2, 0.45, 2.4), i % 2 ? blue : mat(0xffd23f), 0, 3.2 + i * 0.5, 1.6, g);
    for (const ex of [-0.75, 0.75]) {
      mesh(new THREE.BoxGeometry(0.6, 0.7, 0.1), mat(0xffffff), ex, 4.6, 3.95, g);
      mesh(new THREE.BoxGeometry(0.3, 0.4, 0.1), eye, ex, 4.55, 4.0, g);
      const ear = mesh(new THREE.ConeGeometry(0.5, 1.1, 4), st, ex * 1.6, 6.1, 2.4, g);
      ear.rotation.y = Math.PI / 4;
    }
    mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), mat(0xe76f51), 0, 4.0, 3.95, g);
    mesh(new THREE.BoxGeometry(1.4, 0.12, 0.1), eye, 0, 3.5, 3.95, g);
    g.position.set(26, 0, -13);
    g.rotation.y = -0.6;
    group.add(g);
    boxes.push({ x: 26, z: -13, hw: 3.6, hd: 3.6, h: 4 });
    colliders.push({ x: 26 + Math.sin(-0.6) * 4.5, z: -13 + Math.cos(-0.6) * 4.5, r: 2.4, h: 5 });
  }

  // ---------- De oase: water, palmen, riet en Kameel Karel ----------
  mesh(new THREE.CylinderGeometry(OASIS.r + 2.2, OASIS.r + 2.6, 0.1, 18), mat(0x8bc34a), OASIS.x, 0.0, OASIS.z, group).castShadow = false;
  const water = new THREE.Mesh(new THREE.CircleGeometry(OASIS.r, 20).rotateX(-Math.PI / 2),
    mat(0x3fa7d6, { transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.1 }));
  water.position.set(OASIS.x, 0.1, OASIS.z);
  group.add(water);
  updaters.push((t) => { water.material.opacity = 0.8 + Math.sin(t * 1.5) * 0.06; });
  colliders.push({ x: OASIS.x, z: OASIS.z, r: OASIS.r + 0.2 });
  const palmTrunk = mat(0xa47148), palmLeaf = mat(0x4caf50), palmLeaf2 = mat(0x388e3c);
  function palm(x, z, s = 1, collide = true) {
    const g = new THREE.Group();
    let px = 0, py = 0;
    const lean = (rand() - 0.5) * 0.5;
    for (let i = 0; i < 6; i++) {
      const seg = mesh(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.24 - i * 0.012, 0.75, 6), palmTrunk, px, py + 0.37, 0, g);
      seg.rotation.z = lean * (i / 6);
      px += Math.sin(lean * (i / 6)) * -0.7; py += 0.72;
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = mesh(new THREE.BoxGeometry(0.5, 0.06, 2.4), i % 2 ? palmLeaf : palmLeaf2, px + Math.sin(a) * 1.0, py + 0.1, Math.cos(a) * 1.0, g);
      leaf.rotation.set(0.45, a, 0, 'YXZ');
    }
    for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.16, 6, 4), mat(0x6d4c41), px + Math.cos(i * 2) * 0.22, py - 0.15, Math.sin(i * 2) * 0.22, g);
    g.position.set(x, 0, z);
    g.rotation.y = rand() * 6;
    g.scale.setScalar(s);
    group.add(g);
    if (collide) colliders.push({ x, z, r: 0.35 * s, h: 4 * s });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    if (Math.abs(a - Math.PI * 0.05) < 0.4) continue; // daar is het pad
    palm(OASIS.x + Math.cos(a) * (OASIS.r + 1.4), OASIS.z + Math.sin(a) * (OASIS.r + 1.4), 0.9 + rand() * 0.4);
  }
  for (const [x, z] of [[-4.6, 18], [4.8, 15.5], [-3.5, -60], [3.5, -60], [-41, 4], [-50, -26], [40, -36]]) palm(x, z, 1 + rand() * 0.3);
  for (let i = 0; i < 16; i++) { // riet langs het water
    const a = rand() * Math.PI * 2;
    const r = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.9 + rand() * 0.5, 4), mat(0x6a994e), OASIS.x + Math.cos(a) * (OASIS.r + 0.2), 0.45, OASIS.z + Math.sin(a) * (OASIS.r + 0.2), group);
    r.castShadow = false;
  }
  const camel = new Camel(group, OASIS.x + 7.5, OASIS.z - 3.2, -1.2);
  colliders.push({ x: camel.pos.x, z: camel.pos.z, r: 1.1, h: 2.6 });

  // ---------- Ruïnes met zuilen (bij elke zonnesteen) ----------
  const pillarM = mat(0xe6cfa0), pillarM2 = mat(0xd4b98a);
  function ruin(x, z, n, r) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      if (Math.abs(Math.sin(a - Math.atan2(-x, -z) + Math.PI / 2)) < 0.01) continue;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (pathDist(px, pz) < 1.6) continue; // niet op het pad
      const h = i % 3 === 0 ? 1 + rand() : 3 + rand() * 1.5; // sommige zijn omgevallen
      mesh(new THREE.CylinderGeometry(0.45, 0.5, h, 8), i % 2 ? pillarM : pillarM2, px, h / 2, pz, group);
      mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), pillarM2, px, h + 0.15, pz, group);
      colliders.push({ x: px, z: pz, r: 0.6, h: h + 0.3 });
      if (i % 3 === 0) { // een stuk zuil op de grond
        const piece = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.6, 8), pillarM, px + 1.2, 0.45, pz + 0.3, group);
        piece.rotation.set(0, rand() * 3, Math.PI / 2);
      }
    }
    // een stenen vloertje
    const f = mesh(new THREE.CylinderGeometry(r + 0.8, r + 1, 0.12, 16), mat(0xd8c29a), x, 0.02, z, group);
    f.castShadow = false;
  }
  ruin(SUN_STONES[0].x, SUN_STONES[0].z, 10, 5.5);
  ruin(SUN_STONES[1].x, SUN_STONES[1].z, 8, 5);
  ruin(SUN_STONES[2].x, SUN_STONES[2].z, 12, 6);

  // ---------- De 3 zonnestenen ----------
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.9, 60, 10, 1, true);
  const stones = SUN_STONES.map((s) => {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    mesh(new THREE.BoxGeometry(1.8, 0.5, 1.8), mat(0xbfa57c), 0, 0.25, 0, g);
    const ob = mesh(new THREE.CylinderGeometry(0.42, 0.75, 4.2, 4), mat(0xe9d8a6), 0, 2.6, 0, g);
    ob.rotation.y = Math.PI / 4;
    const live = new THREE.Group();
    live.userData.keep = true;
    g.add(live);
    const gem = mesh(new THREE.OctahedronGeometry(0.55, 0), mat(0x7f8fa6, { emissive: 0x223355, emissiveIntensity: 0.5 }), 0, 5.4, 0, live);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 34;
    beam.visible = false;
    live.add(beam);
    // een zon-symbool op de voorkant
    const disc = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10), mat(0xd4a017), 0, 3.0, 0.62, g);
    disc.rotation.x = Math.PI / 2 - 0.1;
    group.add(g);
    colliders.push({ x: s.x, z: s.z, r: 1.0, h: 3.4 });
    return { ...s, g, gem, beam, lit: false };
  });

  // ---------- Borden ----------
  const talkables = [
    makeSignpost(group, {
      id: 'bord-woestijn', x: 3.2, z: 19, rot: -0.3, title: 'DE WOESTIJN', color: '#d4a017',
      lines: [
        'DE GROTE WOESTIJN',
        'Hier is het heet... en HEEL groot! Volg de stenen paden, dan verdwaal je niet.',
        'Pas op voor mummieslijmpjes. Ze zijn sterker dan de slijmpjes in het bos!',
        'Komt er een zandstorm? Niet bang zijn: hij waait vanzelf weer over.',
      ],
    }),
    makeSignpost(group, {
      id: 'bord-kruispunt', x: 2.6, z: 13.5, rot: -0.3, title: 'WEGWIJZER', color: '#9c6644',
      lines: ['← Westen: de Vergeten Tempel', '↑ Rechtdoor: de Oase met Kameel Karel', '↗ Sfinx Sam, de reuzenkat'],
    }),
    makeSignpost(group, {
      id: 'bord-kruispunt2', x: 2.6, z: -26.5, rot: -0.3, title: 'WEGWIJZER', color: '#9c6644',
      lines: ['← Westen: de Oude Ruïne', '→ Oosten (iets verder): de Kleine Piramide', '↑ Noorden: de Grote Piramide'],
    }),
    makeSignpost(group, {
      id: 'bord-piramide', x: 4.2, z: DOOR_Z + 10, rot: -0.3, title: 'PIRAMIDE', color: '#c9a25a',
      lines: [
        'DE GROTE PIRAMIDE',
        'Deze deur gaat alleen open als alle 3 de ZONNESTENEN schijnen.',
        'Sla elke zonnesteen met je zwaard. Ze staan bij de ruïnes in de woestijn.',
        'Kijk op de kaart (M) als je ze niet kunt vinden!',
      ],
    }),
    camel,
  ];

  // ---------- Een klein steentje ----------
  const pebM = mat(0x9b8f72, { roughness: 1 });
  const peb = mesh(new THREE.DodecahedronGeometry(0.2, 0), pebM, PEBBLE.x, 0.13, PEBBLE.z, group);
  peb.scale.set(1.2, 0.7, 1);
  const pebble = {
    id: 'steen-kris', name: 'Klein steentje', voice: 1.3, mesh: peb, pos: peb.position, sign: true, lever: 'kris',
    lines: ['Een klein steentje... er zijn letters in gekrast:', 'K R I S', '*klik*'],
    showMarker() {}, update() {},
    distanceTo(p) { return Math.hypot(p.x - PEBBLE.x, p.z - PEBBLE.z); },
  };
  talkables.push(pebble);

  // ---------- De groene poort naar Het Doolhof ----------
  const mazePortal = makePortal(group, MAZE_PORTAL.x, MAZE_PORTAL.z, 0, 'HET DOOLHOF', '#2d9b4e');
  mazePortal.group.userData.keep = true;
  mazePortal.group.visible = false;
  updaters.push(mazePortal.update);
  const volcanoPortal = makePortal(group, VOLCANO_PORTAL.x, VOLCANO_PORTAL.z, 0, 'DE VULKAAN', '#c1121f');
  volcanoPortal.group.userData.keep = true;
  volcanoPortal.group.visible = false;
  updaters.push(volcanoPortal.update);
  const seaPortal = makePortal(group, SEA_PORTAL.x, SEA_PORTAL.z, 0, 'ONDER WATER', '#1c7ed6');
  seaPortal.group.userData.keep = true;
  seaPortal.group.visible = false;
  updaters.push(seaPortal.update);
  const icePortal = makePortal(group, ICE_PORTAL.x, ICE_PORTAL.z, 0, 'IJSWERELD', '#4dabf7');
  icePortal.group.userData.keep = true;
  icePortal.group.visible = false;
  updaters.push(icePortal.update);
  const castlePortal = makePortal(group, CASTLE_PORTAL.x, CASTLE_PORTAL.z, 0, 'SPOOKKASTEEL', '#5f3dc4');
  castlePortal.group.userData.keep = true;
  castlePortal.group.visible = false;
  updaters.push(castlePortal.update);

  // ---------- Terug naar het dorp: een regenboogpoort ----------
  const portal = makePortal(group, 0, 29.4, 0, 'HET DORP', '#2d6a4f');
  portal.group.userData.keep = true;
  updaters.push(portal.update);

  // ---------- Zandstorm ----------
  const N = 1400, AREA = 46;
  const sandPos = new Float32Array(N * 3), sandSeed = [];
  for (let i = 0; i < N; i++) {
    sandSeed.push({ x: (Math.random() - 0.5) * AREA, y: Math.random() * 7, z: (Math.random() - 0.5) * AREA, sp: 0.7 + Math.random() * 0.6 });
  }
  const sandGeo = new THREE.BufferGeometry();
  sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3));
  const sand = new THREE.Points(sandGeo, new THREE.PointsMaterial({ color: 0xe8c07a, size: 0.3, transparent: true, opacity: 0, depthWrite: false }));
  sand.frustumCulled = false;
  sand.visible = false;
  group.add(sand);
  const storm = { k: 0, active: false, timer: 25, wind: { x: -1, z: 0.3 } };
  let windT = 0;
  function startStorm(dur = 14) { storm.active = true; storm.timer = dur; const a = Math.PI + (Math.random() - 0.5) * 1.2; storm.wind = { x: Math.cos(a), z: Math.sin(a) }; }
  function stopStorm(next = 40 + Math.random() * 15) { storm.active = false; storm.timer = next; }

  // ---------- Zone ----------
  const zone = {
    id: 'woestijn', name: 'De Grote Woestijn', group, colliders, boxes, talkables, npcs: [camel],
    bounds: { ...B },
    music: 'woestijn',
    env: { sky: [0x5aa9e6, 0xfbe3b0], fog: [0xf6ddb0, 40, 110], hemi: [0xfff4dc, 0xd9a35a, 1.25], sun: [0xfff0c8, 2.6], cam: [0, 9, 11] },
    stormFog: [0xe2b874, 6, 26],
    spawns: { fromDorp: { x: 0, z: 22, rot: Math.PI }, fromPiramide: { x: 0, z: DOOR_Z + 3.6, rot: 0 }, fromDoolhof: { x: MAZE_PORTAL.x, z: MAZE_PORTAL.z + 3.4, rot: 0 }, fromVulkaan: { x: VOLCANO_PORTAL.x, z: VOLCANO_PORTAL.z + 3.4, rot: 0 }, fromZee: { x: SEA_PORTAL.x, z: SEA_PORTAL.z + 3.4, rot: 0 }, fromIjs: { x: ICE_PORTAL.x, z: ICE_PORTAL.z + 3.4, rot: 0 }, fromSpook: { x: CASTLE_PORTAL.x, z: CASTLE_PORTAL.z + 3.4, rot: 0 } },
    mazePortal: { ...MAZE_PORTAL, visible: false }, volcanoPortal: { ...VOLCANO_PORTAL, visible: false }, seaPortal: { ...SEA_PORTAL, visible: false }, icePortal: { ...ICE_PORTAL, visible: false }, castlePortal: { ...CASTLE_PORTAL, visible: false }, pebble,
    exit: { x: 0, z: 29.2 },
    door: { x: 0, z: DOOR_Z + 0.9 },
    doorOpen: false,
    stones, storm, startStorm, stopStorm,
    focus: { x: 0, z: 0 }, // waar de speler is (voor de zandkorrels)
    slimeSpots: [
      // langs het hoofdpad
      [4, 16], [-4.5, 3], [5, -18], [-5, -36], [5, -48], [-4, -56],
      // bij de Vergeten Tempel en de oase
      [-30, 14], [-38, 4], [-47, 16], [-10, -15],
      // bij de Oude Ruïne
      [-28, -34], [-42, -24], [-52, -36], [-48, -48],
      // bij de Kleine Piramide
      [24, -44], [40, -46], [50, -34], [44, -50],
      // bij Sfinx Sam en de Grote Piramide
      [18, -4], [-7, DOOR_Z + 8], [7, DOOR_Z + 9], [0, DOOR_Z + 16],
      // extra wachters rond elke zonnesteen (Dex vond het te makkelijk!)
      ...SUN_STONES.flatMap((st) => [[st.x + 4.5, st.z + 3.5], [st.x - 4, st.z - 4], [st.x + 3, st.z - 5]]),
    ].map(([x, z]) => ({ x, z, kind: 'mummie' })),
    labels: [
      { x: 0, z: 26, text: 'Naar het dorp' }, { x: OASIS.x, z: OASIS.z, text: 'Oase' },
      { x: 26, z: -13, text: 'Sfinx Sam' }, { x: 0, z: PYRAMID.z + 4, text: 'Grote Piramide' },
      ...SUN_STONES.map((s) => ({ x: s.x, z: s.z + 4, text: s.name[0].toUpperCase() + s.name.slice(1).replace('de ', '') })),
    ],
    mapItems: [{ x: OASIS.x, z: OASIS.z, r: OASIS.r, color: '#4fb3e8' }, { x: PYRAMID.x, z: PYRAMID.z, r: PYRAMID.half, color: '#e9c46a' }],
    update: (t, dt) => updaters.forEach((f) => f(t, dt)),
  };
  // de doolhofpoort laten zien (of niet)
  zone.setMazePortal = (yes) => {
    zone.mazePortal.visible = yes;
    mazePortal.group.visible = yes;
    const has = zone.labels.some((l) => l.maze);
    if (yes && !has) zone.labels.push({ x: MAZE_PORTAL.x, z: MAZE_PORTAL.z + 3, text: 'Het Doolhof', maze: true });
    if (!yes && has) zone.labels = zone.labels.filter((l) => !l.maze);
  };
  // de vulkaanpoort laten zien (of niet)
  zone.setVolcanoPortal = (yes) => {
    zone.volcanoPortal.visible = yes;
    volcanoPortal.group.visible = yes;
    const has = zone.labels.some((l) => l.volcano);
    if (yes && !has) zone.labels.push({ x: VOLCANO_PORTAL.x, z: VOLCANO_PORTAL.z + 3, text: 'De Vulkaan', volcano: true });
    if (!yes && has) zone.labels = zone.labels.filter((l) => !l.volcano);
  };
  // de onderwaterpoort laten zien (of niet)
  zone.setSeaPortal = (yes) => {
    zone.seaPortal.visible = yes;
    seaPortal.group.visible = yes;
    const has = zone.labels.some((l) => l.sea);
    if (yes && !has) zone.labels.push({ x: SEA_PORTAL.x, z: SEA_PORTAL.z + 3, text: 'Onder water', sea: true });
    if (!yes && has) zone.labels = zone.labels.filter((l) => !l.sea);
  };
  // de ijspoort laten zien (of niet)
  zone.setIcePortal = (yes) => {
    zone.icePortal.visible = yes;
    icePortal.group.visible = yes;
    const has = zone.labels.some((l) => l.ice);
    if (yes && !has) zone.labels.push({ x: ICE_PORTAL.x, z: ICE_PORTAL.z + 3, text: 'IJswereld', ice: true });
    if (!yes && has) zone.labels = zone.labels.filter((l) => !l.ice);
  };
  // de spookpoort laten zien (of niet)
  zone.setCastlePortal = (yes) => {
    zone.castlePortal.visible = yes;
    castlePortal.group.visible = yes;
    const has = zone.labels.some((l) => l.castle);
    if (yes && !has) zone.labels.push({ x: CASTLE_PORTAL.x, z: CASTLE_PORTAL.z + 3, text: 'Spookkasteel', castle: true });
    if (!yes && has) zone.labels = zone.labels.filter((l) => !l.castle);
  };
  zone.setPebbleOn = (on) => { pebM.color.set(on ? 0xc7f9cc : 0x9b8f72); pebM.emissive.set(on ? 0x2d6a4f : 0x000000); };
  // een zonnesteen laten schijnen
  zone.setStoneLit = (s, yes) => {
    s.lit = yes;
    s.beam.visible = yes;
    s.gem.material.color.set(yes ? 0xffd23f : 0x7f8fa6);
    s.gem.material.emissive.set(yes ? 0xffa000 : 0x223355);
    s.gem.material.emissiveIntensity = yes ? 1.2 : 0.5;
    stones.forEach((st, i) => doorSuns[i].material.color.set(st.lit ? 0xffd23f : 0x6c757d));
  };
  let doorK = 0;
  zone.setDoorOpen = (yes, instant = false) => {
    zone.doorOpen = yes;
    doorBox.off = yes;
    if (instant) doorK = yes ? 1 : 0;
  };
  updaters.push((t, dt) => {
    doorK += ((zone.doorOpen ? 1 : 0) - doorK) * Math.min(1, dt * 1.2);
    door.position.y = -4.9 * doorK;
    door.position.x = zone.doorOpen && doorK < 0.97 ? Math.sin(t * 60) * 0.05 : 0;
    for (const s of stones) {
      s.gem.rotation.y = t * (s.lit ? 2 : 0.6);
      s.gem.position.y = 5.4 + Math.sin(t * 2 + s.x) * 0.15;
      if (s.lit) s.beam.material.opacity = 0.28 + Math.sin(t * 3 + s.z) * 0.08;
    }
    // de zandstorm komt en gaat vanzelf
    if (!zone.group.visible) return;
    storm.timer -= dt;
    if (storm.timer <= 0) { if (storm.active) stopStorm(); else startStorm(); }
    storm.k += ((storm.active ? 1 : 0) - storm.k) * Math.min(1, dt * 0.9);
    sand.visible = storm.k > 0.02;
    if (sand.visible) {
      windT += dt;
      sand.material.opacity = Math.min(0.9, storm.k * 1.1);
      const f = zone.focus, w = storm.wind;
      for (let i = 0; i < N; i++) {
        const p = sandSeed[i];
        p.x += w.x * 22 * p.sp * dt; p.z += w.z * 22 * p.sp * dt;
        p.y += Math.sin(windT * 3 + i) * dt * 0.8;
        // blijf in een vak rond de speler
        let rx = ((p.x - f.x) % AREA + AREA * 1.5) % AREA - AREA / 2;
        let rz = ((p.z - f.z) % AREA + AREA * 1.5) % AREA - AREA / 2;
        sandPos[i * 3] = f.x + rx;
        sandPos[i * 3 + 1] = ((p.y % 7) + 7) % 7;
        sandPos[i * 3 + 2] = f.z + rz;
      }
      sandGeo.attributes.position.needsUpdate = true;
    }
  });

  // ---------- Alles wat stilstaat samenplakken (veel sneller tekenen) ----------
  const stoneLive = stones.map((s) => s.gem.parent);
  zone.merged = mergeStatic(group, {
    probe: (t) => updaters.forEach((f) => f(t, 0.016)),
    reset: () => updaters.forEach((f) => f(0, 0)),
    skip: [camel.mesh, door, sand, ...stoneLive, portal.group, mazePortal.group, volcanoPortal.group, seaPortal.group, icePortal.group, castlePortal.group, peb],
  });
  zone.collidePoint = (p, r) => collide(p, r, zone);
  return zone;
}

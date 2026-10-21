// Binnen in de Grote Piramide: gangen met fakkels, mummieslijmpjes en vazen.
// Bovenin de troonzaal woont Schorpioen Sjors. Hij bewaakt een stukje van de schatkaart!
// De piramide is getekend met letters (net als de Slijmgrot):
//   #  = muur          .  = vloer          E = ingang (terug naar de woestijn)
//   S  = Schorpioen Sjors   m = mummieslijmpje   t = fakkel   p = vaas   c = sarcofaag
//   H  = oude muur met tekens (een geheimpje...)
const MAP = [
  '#######################',
  '#########.....#########',
  '######t.........t######',
  '#####.............#####',
  '#####......S......#####',
  '#####.............#####',
  '#####p...........p#####',
  '######t.........t######',
  '##########...##########',
  '#H.p######...##########',
  '#..#####t.....t########',
  '##.####p.m...m.p#######',
  '##.###...........######',
  '##....m...c...m....p###',
  '######...........######',
  '#######p.m...m.p#######',
  '########t.....t########',
  '##########...##########',
  '##########...##########',
  '##########.E.##########',
  '#######################',
];
const TILE = 2;

import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeFloaters, seeded } from './props.js';

// Zandsteen met hiërogliefen (getekend op een canvas, dus geen plaatjes nodig)
function glyphTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e9c98f'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#b8935a'; g.lineWidth = 3;
  for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x < 128; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
  // simpele tekentjes: een oog, een vogel, een zon, een golf, een slijmpje
  g.strokeStyle = '#7a5530'; g.fillStyle = '#7a5530'; g.lineWidth = 3;
  const glyphs = [
    (x, y) => { g.beginPath(); g.ellipse(x, y, 9, 5, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); },
    (x, y) => { g.beginPath(); g.moveTo(x - 8, y + 6); g.quadraticCurveTo(x, y - 8, x + 8, y + 2); g.stroke(); g.beginPath(); g.arc(x + 6, y - 2, 2, 0, 7); g.fill(); },
    (x, y) => { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); for (let a = 0; a < 6.2; a += 0.8) { g.beginPath(); g.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); g.stroke(); } },
    (x, y) => { g.beginPath(); g.moveTo(x - 10, y); for (let i = 0; i < 4; i++) g.quadraticCurveTo(x - 7.5 + i * 5, y - 5 * (i % 2 ? -1 : 1), x - 5 + i * 5, y); g.stroke(); },
    (x, y) => { g.beginPath(); g.arc(x, y + 3, 7, Math.PI, 0); g.lineTo(x + 7, y + 6); g.lineTo(x - 7, y + 6); g.closePath(); g.stroke(); g.fillRect(x - 3, y, 2, 2); g.fillRect(x + 2, y, 2, 2); },
  ];
  let k = 0;
  for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) glyphs[(k++ * 7 + y) % glyphs.length](x, y);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPyramid(group) {
  const rand = seeded(31);
  const H = MAP.length, W = MAP[0].length;
  const tx = (c) => (c - (W - 1) / 2) * TILE;
  const tz = (r) => (r - (H - 1) / 2) * TILE;
  const at = (r, c) => (r < 0 || r >= H || c < 0 || c >= W ? '#' : MAP[r][c]);
  const isFloor = (r, c) => at(r, c) !== '#';
  const boxes = [], colliders = [], updaters = [], slimeSpots = [], torches = [], vases = [];
  let entrance = null, boss = null, coffin = null, secret = null;

  // ---------- Vloer met tegels ----------
  const floorGeo = new THREE.PlaneGeometry(W * TILE + 20, H * TILE + 20, W + 10, H + 10);
  floorGeo.rotateX(-Math.PI / 2);
  const nonIdx = floorGeo.toNonIndexed();
  const fp = nonIdx.attributes.position, colors = [];
  const c1 = new THREE.Color(0xa88552), c2 = new THREE.Color(0x8f6f42);
  for (let i = 0; i < fp.count; i += 3) {
    const tri = Math.floor(i / 6);
    const c = (tri + Math.floor(tri / (W + 10))) % 2 ? c1 : c2;
    for (let j = 0; j < 3; j++) colors.push(c.r, c.g, c.b);
  }
  nonIdx.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  nonIdx.computeVertexNormals();
  const floor = new THREE.Mesh(nonIdx, mat(0xffffff, { vertexColors: true }));
  floor.receiveShadow = true;
  group.add(floor);

  // ---------- Muren (één InstancedMesh) ----------
  const wallTiles = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = MAP[r][c];
      const x = tx(c), z = tz(r);
      if (ch === '#') {
        let nearFloor = false;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isFloor(r + dr, c + dc)) nearFloor = true;
        if (nearFloor) wallTiles.push([r, c]);
        boxes.push({ x, z, hw: TILE / 2, hd: TILE / 2 });
        continue;
      }
      if (ch === 'E') entrance = { x, z };
      if (ch === 'S') boss = { x, z };
      if (ch === 'm') slimeSpots.push({ x, z, kind: 'mummie' });
      if (ch === 't') torches.push({ x, z });
      if (ch === 'p') vases.push({ x, z });
      if (ch === 'c') coffin = { x, z };
      if (ch === 'H') secret = { x, z, r, c };
    }
  }
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 1, TILE), mat(0xffffff, { map: glyphTexture() }), wallTiles.length);
  const tops = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE + 0.1, 0.25, TILE + 0.1), mat(0xffffff), wallTiles.length);
  const dummy = new THREE.Object3D(), wallColors = [0xffffff, 0xf3e6cf, 0xe8d6b5];
  wallTiles.forEach(([r, c], i) => {
    const h = 2.4 + ((r * 7 + c * 3) % 3) * 0.15;
    dummy.position.set(tx(c), h / 2, tz(r));
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
    walls.setColorAt(i, new THREE.Color(wallColors[Math.floor(rand() * 3)]));
    dummy.position.set(tx(c), h + 0.12, tz(r));
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    tops.setMatrixAt(i, dummy.matrix);
    tops.setColorAt(i, new THREE.Color(0x7a5c34));
  });
  walls.castShadow = walls.receiveShadow = true;
  tops.castShadow = true;
  group.add(walls, tops);

  // ---------- Fakkels ----------
  const flameM = new THREE.MeshBasicMaterial({ color: 0xff9f1c }), flameM2 = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const goldM = mat(0xffc300, { metalness: 0.5, emissive: 0x553300, emissiveIntensity: 0.4 });
  torches.forEach((b, i) => {
    colliders.push({ x: b.x, z: b.z, r: 0.45 });
    mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.1, 6), mat(0x8d6e3f), b.x, 0.55, b.z, group);
    mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.3, 8), goldM, b.x, 1.2, b.z, group);
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 5), flameM);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 5), flameM2);
    f1.position.set(b.x, 1.7, b.z); f2.position.set(b.x, 1.6, b.z);
    group.add(f1, f2);
    updaters.push((t) => {
      const s = 1 + Math.sin(t * 13 + i) * 0.12 + Math.sin(t * 7.3 + i * 2) * 0.08;
      f1.scale.set(1, s, 1); f2.scale.set(1, 2 - s, 1);
      f1.rotation.y = t * 2;
    });
  });
  [{ x: 0, z: tz(4) }, { x: 0, z: tz(13) }, { x: 0, z: tz(17) }].forEach((l, i) => {
    const pl = new THREE.PointLight(0xffa94d, 16, 18, 1.5);
    pl.position.set(l.x, 3.6, l.z);
    group.add(pl);
    updaters.push((t) => { pl.intensity = 16 + Math.sin(t * 9 + i) * 2; });
  });

  // ---------- Vazen ----------
  const vaseM = [mat(0xd17a47), mat(0x3a86ff), mat(0x2a9d8f)];
  vases.forEach((v, i) => {
    const m = vaseM[i % 3];
    mesh(new THREE.SphereGeometry(0.45, 8, 6), m, v.x, 0.5, v.z, group);
    mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.5, 8), m, v.x, 1.05, v.z, group);
    mesh(new THREE.TorusGeometry(0.2, 0.06, 4, 10), goldM, v.x, 1.3, v.z, group).rotation.x = Math.PI / 2;
    colliders.push({ x: v.x, z: v.z, r: 0.55 });
  });

  // ---------- Sarcofaag in de grote hal ----------
  {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.4, 0.9, 2.8), goldM, 0, 0.45, 0, g);
    mesh(new THREE.BoxGeometry(1.2, 0.2, 2.6), mat(0x3a86ff), 0, 0.98, 0, g);
    mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), mat(0xffd23f), 0, 1.12, 0.8, g);
    for (const ex of [-0.18, 0.18]) mesh(new THREE.BoxGeometry(0.14, 0.05, 0.1), mat(0x1d1d1d), ex, 1.2, 0.95, g);
    mesh(new THREE.BoxGeometry(0.25, 0.04, 0.06), mat(0xe76f51), 0, 1.2, 1.12, g);
    g.position.set(coffin.x, 0, coffin.z);
    group.add(g);
    boxes.push({ x: coffin.x, z: coffin.z, hw: 0.8, hd: 1.5 });
  }

  // ---------- Troonzaal van Sjors: een zandbed en een grote zon op de muur ----------
  const bed = mesh(new THREE.SphereGeometry(3.2, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2d38f), boss.x, -0.6, boss.z - 3.5, group);
  bed.scale.y = 0.35;
  const sunDisc = mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16), goldM, boss.x, 3.2, tz(0) + 1.15, group);
  sunDisc.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.6 + rand() * 0.5, 8).rotateX(-Math.PI / 2), mat(0xe9c46a, { roughness: 1 }));
    p.position.set(boss.x + Math.cos(i) * 6, 0.03, boss.z + Math.sin(i) * 2.5);
    group.add(p);
  }

  // ---------- Een oude muur met tekens (alleen te lezen als je er vlak voor staat) ----------
  const plaque = new THREE.Group();
  mesh(new THREE.BoxGeometry(1.4, 1.1, 0.12), mat(0xd9b77e), 0, 1.3, 0, plaque);
  const glyphM = new THREE.MeshBasicMaterial({ map: glyphTexture(), color: 0xc8a878 });
  const glyphFace = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), glyphM);
  glyphFace.position.set(0, 1.3, 0.07);
  plaque.add(glyphFace);
  // aan de muur aan de noordkant van het doodlopende gangetje
  plaque.position.set(secret.x, 0, secret.z - TILE / 2 + 0.08);
  group.add(plaque);
  const secretWall = {
    id: 'muur-tekens', name: 'Oude muur', voice: 0.9, mesh: plaque, pos: plaque.position, sign: true,
    lines: [
      'Er zijn oude tekens in de muur gekrast...',
      'Een oog, een vogel, een zon... en daaronder, heel klein:',
      'K R I S T A L 1 0 0',
      '(Wat zou dat betekenen?)',
    ],
    showMarker() {}, update() {},
    distanceTo(p) { return Math.hypot(p.x - secret.x, p.z - secret.z); },
  };

  // Zwevend stof in het licht
  updaters.push(makeFloaters(group, { count: 40, color: 0xffe0a0, area: { x: 0, z: 0, w: W * TILE, d: H * TILE }, height: [0.3, 3], size: 0.09 }));

  const zone = {
    id: 'piramide', name: 'In de Grote Piramide', group, colliders, boxes, talkables: [secretWall],
    bounds: { minX: tx(0), maxX: tx(W - 1), minZ: tz(0), maxZ: tz(H - 1) },
    music: 'piramide',
    env: { sky: null, background: 0x1a1008, fog: [0x1a1008, 18, 44], hemi: [0xd8c8a8, 0x2a1e10, 0.55], sun: [0xffd9a0, 0.35], cam: [0, 14, 6.5] },
    spawns: { fromWoestijn: { x: entrance.x, z: entrance.z - 2.4, rot: Math.PI } },
    exit: { x: entrance.x, z: entrance.z + 0.3 },
    slimeSpots, boss, secret,
    labels: [{ x: 0, z: tz(18), text: 'Uitgang' }, { x: 0, z: tz(4), text: 'Troonzaal' }, { x: coffin.x, z: coffin.z + 2.5, text: 'Grote hal' }],
    inThroneRoom: (pos) => pos.z < tz(7.6),
    update: (t, dt) => updaters.forEach((f) => f(t, dt)),
  };
  return zone;
}
export const PYRAMID_MAP = MAP;

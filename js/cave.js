// De Slijmgrot: een kerker, getekend met letters. Hier woont Koning Slijm.
// Wil je de grot veranderen? Pas de kaart hieronder aan!
//   #  = muur          .  = vloer
//   E  = ingang (hier ga je terug naar het bos)
//   K  = Koning Slijm  s = groen slijmpje   b = blauw slijmpje
//   v  = vuurschaal (een lichtje)
const MAP = [
  '#################',
  '######.....######',
  '####v.......v####',
  '###...........###',
  '###.....K.....###',
  '###...........###',
  '####v.......v####',
  '######.....######',
  '#######...#######',
  '#######...#######',
  '#####v.....v#####',
  '####..b...b..####',
  '####.........####',
  '####..s...s..####',
  '#####.......#####',
  '#######...#######',
  '#######...#######',
  '#######.E.#######',
  '#################',
];
const TILE = 2;

import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, makeFloaters, seeded } from './props.js';

export function createCave(group) {
  const rand = seeded(11);
  const H = MAP.length, W = MAP[0].length;
  const tx = (c) => (c - (W - 1) / 2) * TILE;
  const tz = (r) => (r - (H - 1) / 2) * TILE;
  const at = (r, c) => (r < 0 || r >= H || c < 0 || c >= W ? '#' : MAP[r][c]);
  const isFloor = (r, c) => at(r, c) !== '#';
  const boxes = [], updaters = [], slimeSpots = [], braziers = [];
  let entrance = null, king = null;

  // ---------- Vloer ----------
  const floorGeo = new THREE.PlaneGeometry(W * TILE + 20, H * TILE + 20, W * 2, H * 2);
  floorGeo.rotateX(-Math.PI / 2);
  const fp = floorGeo.attributes.position, colors = [];
  const c1 = new THREE.Color(0x3b3049), c2 = new THREE.Color(0x2a2236);
  for (let i = 0; i < fp.count; i++) {
    const c = c1.clone().lerp(c2, rand());
    colors.push(c.r, c.g, c.b);
  }
  floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const floor = new THREE.Mesh(floorGeo, mat(0xffffff, { vertexColors: true }));
  floor.receiveShadow = true;
  group.add(floor);

  // ---------- Muren (één InstancedMesh: snel op de iPad) ----------
  const wallTiles = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = MAP[r][c];
      if (ch === '#') {
        let nearFloor = false;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isFloor(r + dr, c + dc)) nearFloor = true;
        if (nearFloor) wallTiles.push([r, c]);
        boxes.push({ x: tx(c), z: tz(r), hw: TILE / 2, hd: TILE / 2 });
        continue;
      }
      const x = tx(c), z = tz(r);
      if (ch === 'E') entrance = { x, z };
      if (ch === 'K') king = { x, z };
      if (ch === 's') slimeSpots.push({ x, z, kind: 'groen' });
      if (ch === 'b') slimeSpots.push({ x, z, kind: 'blauw' });
      if (ch === 'v') braziers.push({ x, z });
    }
  }
  const wallGeo = new THREE.BoxGeometry(TILE, 1, TILE);
  const walls = new THREE.InstancedMesh(wallGeo, mat(0xffffff), wallTiles.length);
  const caps = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.9, 0), mat(0xffffff), wallTiles.length);
  const dummy = new THREE.Object3D(), wallColors = [0x5a4d6b, 0x4e4260, 0x655777, 0x463b56];
  wallTiles.forEach(([r, c], i) => {
    const h = 1.3 + rand() * 0.9;
    dummy.position.set(tx(c), h / 2, tz(r));
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
    const color = new THREE.Color(wallColors[Math.floor(rand() * 4)]);
    walls.setColorAt(i, color);
    dummy.position.set(tx(c) + (rand() - 0.5) * 0.4, h, tz(r) + (rand() - 0.5) * 0.4);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(1, 0.35 + rand() * 0.25, 1);
    dummy.updateMatrix();
    caps.setMatrixAt(i, dummy.matrix);
    caps.setColorAt(i, color.clone().multiplyScalar(0.85));
  });
  walls.castShadow = walls.receiveShadow = true;
  caps.castShadow = true;
  group.add(walls, caps);

  // ---------- Kristallen in de muren ----------
  const crystalM = [mat(0x7af7ff, { emissive: 0x1b8fd8, emissiveIntensity: 0.9 }), mat(0xd0a2f7, { emissive: 0x7b2cbf, emissiveIntensity: 0.9 })];
  wallTiles.forEach(([r, c]) => {
    if (rand() > 0.3) return;
    // zoek een kant waar vloer is
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([dr, dc]) => isFloor(r + dr, c + dc));
    if (!dirs.length) return;
    const [dr, dc] = dirs[0];
    const m = crystalM[rand() < 0.6 ? 0 : 1];
    for (let i = 0; i < 3; i++) {
      const cr = mesh(new THREE.OctahedronGeometry(0.18 + rand() * 0.2, 0), m,
        tx(c) + dc * 1.05 + (rand() - 0.5) * 1.2, 0.3 + rand() * 0.9, tz(r) + dr * 1.05 + (rand() - 0.5) * 1.2, group);
      cr.scale.y = 1.8;
      cr.rotation.set((rand() - 0.5) * 0.8, rand() * 3, (rand() - 0.5) * 0.8);
      cr.castShadow = false;
    }
  });

  // ---------- Vuurschalen met flakkerende vlammen ----------
  const flameM = new THREE.MeshBasicMaterial({ color: 0xffa62b });
  const flameM2 = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  braziers.forEach((b, i) => {
    boxes.push({ x: b.x, z: b.z, hw: 0.4, hd: 0.4 });
    mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.9, 6), mat(0x4a4458), b.x, 0.45, b.z, group);
    mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.3, 8), mat(0x6c6478), b.x, 1.0, b.z, group);
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 5), flameM);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), flameM2);
    f1.position.set(b.x, 1.5, b.z); f2.position.set(b.x, 1.4, b.z);
    group.add(f1, f2);
    updaters.push((t) => {
      const s = 1 + Math.sin(t * 13 + i) * 0.12 + Math.sin(t * 7.3 + i * 2) * 0.08;
      f1.scale.set(1, s, 1); f2.scale.set(1, 2 - s, 1);
      f1.rotation.y = t * 2;
    });
  });
  // een paar echte lampjes (niet te veel, anders wordt de iPad traag)
  const lights = [
    { x: 0, z: tz(13), c: 0xff9f43 },
    { x: tx(5), z: tz(3), c: 0xff9f43 },
    { x: tx(11), z: tz(5), c: 0xff9f43 },
  ].map((l, i) => {
    const pl = new THREE.PointLight(l.c, 30, 18, 1.4);
    pl.position.set(l.x, 3.5, l.z);
    group.add(pl);
    updaters.push((t) => { pl.intensity = 30 + Math.sin(t * 9 + i) * 4; });
    return pl;
  });

  // Plassen gloeiend slijm in de koningszaal
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rand() * 0.6, 8).rotateX(-Math.PI / 2),
      mat(0x7bd389, { emissive: 0x2d6a4f, emissiveIntensity: 0.8, roughness: 0.2 }));
    puddle.position.set(king.x + Math.cos(a) * 7, 0.03, king.z + Math.sin(a) * 4.5);
    group.add(puddle);
  }
  // Een troon van slijm achter de koning
  mesh(new THREE.BoxGeometry(3.2, 1.2, 1.4), mat(0x6a4c93), king.x, 0.6, king.z - 5.2, group);
  mesh(new THREE.BoxGeometry(3.2, 3.2, 0.6), mat(0x6a4c93), king.x, 1.6, king.z - 5.9, group);
  mesh(new THREE.ConeGeometry(0.3, 0.7, 4), mat(0xffc300, { emissive: 0x553300 }), king.x - 1.2, 3.5, king.z - 5.9, group);
  mesh(new THREE.ConeGeometry(0.3, 0.7, 4), mat(0xffc300, { emissive: 0x553300 }), king.x + 1.2, 3.5, king.z - 5.9, group);
  boxes.push({ x: king.x, z: king.z - 5.5, hw: 1.6, hd: 1 });

  // Zwevende stofjes
  updaters.push(makeFloaters(group, { count: 40, color: 0xc8b6ff, area: { x: 0, z: 0, w: W * TILE, d: H * TILE }, height: [0.3, 3], size: 0.1 }));

  const talkables = [
    makeSignpost(group, {
      id: 'bord-grot', x: tx(9), z: tz(15) - 0.4, rot: -0.5, title: 'NIET STOREN', color: '#6a4c93',
      lines: ['HIER WOONT KONING SLIJM.', 'NIET STOREN!!!', '(Er staat een plakkerige handtekening onder.)'],
    }),
  ];

  const zone = {
    id: 'grot', name: 'De Slijmgrot', group, colliders: [], boxes, talkables,
    bounds: { minX: tx(0), maxX: tx(W - 1), minZ: tz(0), maxZ: tz(H - 1) },
    music: 'grot',
    env: { sky: null, background: 0x0d0a14, fog: [0x0d0a14, 17, 40], hemi: [0x8d7fc2, 0x1a1426, 0.75], sun: [0x9db4ff, 0.45], cam: [0, 14, 6.5] },
    spawns: { fromBos: { x: entrance.x, z: entrance.z - 2.4, rot: Math.PI } },
    exit: { x: entrance.x, z: entrance.z + 0.3 },
    slimeSpots, king,
    // Ben je in de koningszaal? (de bovenste kamer)
    inThroneRoom: (pos) => pos.z < tz(8.5),
    update: (t, dt) => updaters.forEach((f) => f(t, dt)),
  };
  return zone;
}

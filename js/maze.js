// Het Doolhof (hoofdstuk 4, idee van Dex): een GROOT doolhof van hoge heggen achter de woestijn.
// - Het doolhof wordt gemaakt met een vast 'zaadje' (seed): voor iedereen is het hetzelfde doolhof.
// - In het midden staat een stenen kamer met Bladkoning Bram. Hij bewaakt stukje 2 van de schatkaart.
// - Op de weg naar het midden zitten 3 gekleurde deuren. Elke deur gaat open met drukknoppen
//   ergens in een doodlopend gangetje: jij staat op één knop, je clones op de andere.
// - Vallen: rollende rotsblokken en doornen die uit de grond komen. Heggenslijmpjes overal.
// - Kristalbloemen: pak er een en een kristallen spoor wijst je even de weg.
// - Kisten met kristallen in doodlopende gangen.
// - Je ziet op de kaart alleen wat je al hebt ontdekt.
// - (En er zijn nog meer geheimen... zie GAME.md, niet verklappen!)
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, seeded } from './props.js';
import { makePortal } from './world.js';

export const MAZE_N = 15;          // 15 x 15 gangen
const BL = 1.4;                    // één blokje (een gang is 2 blokjes breed, een heg 1)
const M = 3;                       // rand rondom het doolhof (voor het geheime kamertje)
const GX = MAZE_N * 3 + 1 + 2 * M; // 52 blokjes breed
const PLAZA = 9;                   // het pleintje bij de ingang (zuidkant)
const GZ = GX + PLAZA - M;         // 58 blokjes diep
const HEDGE_H = 3.0;
const ROOM = [6, 8];               // de middenkamer: gangen 6 t/m 8
const ENTRY = { i: 7, j: MAZE_N - 1 };
const ROOM_DOOR = { i: 7, j: 5 };  // via de noordkant kom je de middenkamer in (vanaf gang (7,5))
export const DOOR_COLORS = [
  { id: 'rood', name: 'rode', color: 0xe63946, plates: 2 },
  { id: 'blauw', name: 'blauwe', color: 0x3a86ff, plates: 2 },
  { id: 'geel', name: 'gele', color: 0xffd23f, plates: 3 },
];

const bx2x = (bx) => (bx - (GX - 1) / 2) * BL;
const bz2z = (bz) => (bz - (GX - 1) / 2) * BL;
export const cellX = (i) => bx2x(M + 3 * i + 1.5);
export const cellZ = (j) => bz2z(M + 3 * j + 1.5);
export const cellOf = (x, z) => {
  const i = Math.floor((x / BL + (GX - 1) / 2 - M - 0.5) / 3 + 0), j = Math.floor((z / BL + (GX - 1) / 2 - M - 0.5) / 3);
  return { i, j, ok: i >= 0 && j >= 0 && i < MAZE_N && j < MAZE_N };
};
const key = (i, j) => j * MAZE_N + i;
const inRoom = (i, j) => i >= ROOM[0] && i <= ROOM[1] && j >= ROOM[0] && j <= ROOM[1];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ---------- Het doolhof uitrekenen (zonder 3D) ----------
export function buildMazeLayout(seed = 2026) {
  // probeer zaadjes tot alles goed past (elke deur een schakelaar, genoeg geheime hoekjes)
  for (let s = seed; s < seed + 500; s++) { const L = tryLayout(s); if (L) return L; }
  throw new Error('Geen doolhof gevonden');
}
function tryLayout(seed) {
  const rand = seeded(seed);
  const N = MAZE_N;
  const open = new Set(); // gangetjes tussen twee vakjes: "a|b" (a < b)
  const edge = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const link = (i1, j1, i2, j2) => open.add(edge(key(i1, j1), key(i2, j2)));
  const isOpen = (i1, j1, i2, j2) => open.has(edge(key(i1, j1), key(i2, j2)));
  // middenkamer: helemaal open van binnen
  for (let i = ROOM[0]; i <= ROOM[1]; i++) for (let j = ROOM[0]; j <= ROOM[1]; j++) {
    if (i < ROOM[1]) link(i, j, i + 1, j);
    if (j < ROOM[1]) link(i, j, i, j + 1);
  }
  // de rest: een "recursive backtracker" (lange kronkelgangen, veel doodlopende stukjes)
  const seen = new Set();
  for (let i = ROOM[0]; i <= ROOM[1]; i++) for (let j = ROOM[0]; j <= ROOM[1]; j++) seen.add(key(i, j));
  const stack = [[ENTRY.i, ENTRY.j]];
  seen.add(key(ENTRY.i, ENTRY.j));
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const next = DIRS.map(([di, dj]) => [i + di, j + dj]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(key(a, b)));
    if (!next.length) { stack.pop(); continue; }
    const [a, b] = next[Math.floor(rand() * next.length)];
    link(i, j, a, b);
    seen.add(key(a, b));
    stack.push([a, b]);
  }
  link(ROOM_DOOR.i, ROOM_DOOR.j, ROOM_DOOR.i, ROOM_DOOR.j + 1);

  const neighbors = (i, j) => DIRS.map(([di, dj]) => [i + di, j + dj]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && isOpen(i, j, a, b));
  const bfs = (from, blocked = () => false) => {
    const dist = new Map([[key(from.i, from.j), 0]]), prev = new Map(), q = [[from.i, from.j]];
    while (q.length) {
      const [i, j] = q.shift();
      for (const [a, b] of neighbors(i, j)) {
        const k = key(a, b);
        if (dist.has(k) || blocked(i, j, a, b)) continue;
        dist.set(k, dist.get(key(i, j)) + 1); prev.set(k, key(i, j)); q.push([a, b]);
      }
    }
    return { dist, prev };
  };
  // de weg van de ingang naar het midden
  const goal = { i: 7, j: 7 };
  const { prev } = bfs(ENTRY);
  const path = [];
  for (let k = key(goal.i, goal.j); k !== undefined; k = prev.get(k)) path.unshift({ i: k % N, j: Math.floor(k / N) });
  const roomStart = path.findIndex((c) => inRoom(c.i, c.j));
  const outside = path.slice(0, roomStart); // het stuk buiten de middenkamer
  // 3 deuren op 25%, 50% en 75% van de weg
  const doors = DOOR_COLORS.map((d, n) => {
    const at = Math.floor(outside.length * (n + 1) / 4);
    return { ...d, n, a: outside[at - 1], b: outside[at] };
  });
  const doorEdges = doors.map((d) => edge(key(d.a.i, d.a.j), key(d.b.i, d.b.j)));
  // gebieden: vakjes die je kunt halen zonder door een deur te gaan (0 = bij de ingang)
  const region = new Map();
  const starts = [ENTRY, ...doors.map((d) => d.b)];
  starts.forEach((s, r) => {
    const { dist } = bfs(s, (i, j, a, b) => doorEdges.includes(edge(key(i, j), key(a, b))));
    for (const k of dist.keys()) if (!region.has(k)) region.set(k, r);
  });
  const fromEntry = bfs(ENTRY).dist;
  const pathSet = new Set(path.map((c) => key(c.i, c.j)));
  // doodlopende gangetjes (1 uitgang), het verst weg eerst
  const deadEnds = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (inRoom(i, j) || (i === ENTRY.i && j === ENTRY.j)) continue;
    if (neighbors(i, j).length === 1) deadEnds.push({ i, j, r: region.get(key(i, j)), d: fromEntry.get(key(i, j)) });
  }
  deadEnds.sort((a, b) => b.d - a.d);
  const used = new Set();
  const take = (filter) => { const c = deadEnds.find((e) => !used.has(key(e.i, e.j)) && filter(e)); if (c) used.add(key(c.i, c.j)); return c; };
  // schakelaars: in het gebied vóór elke deur, zo ver mogelijk weg
  const sw = doors.map((d, n) => take((e) => e.r === n && e.d >= 8));
  // het geheime kamertje: achter een doodlopend gangetje aan de noordrand (diep in het doolhof)
  const secretCell = take((e) => e.j === 0 && e.r >= 2 && e.i > 0 && e.i < N - 1);
  // de steentjes met letters (diep in het doolhof)
  const st = [take((e) => e.r === 2), take((e) => e.r === 3)];
  if (sw.some((x) => !x) || !secretCell || st.some((x) => !x)) return null;
  // de 3 deuren een beetje eerlijk verdeeld: elk gebied minstens 20 vakjes
  const sizes = [0, 0, 0, 0];
  for (const r of region.values()) sizes[r]++;
  if (sizes.some((n) => n < 20)) return null;
  const switches = sw.map((e, n) => ({ ...e, door: n }));
  const stones = [{ id: 'tal', ...st[0] }, { id: '100k', ...st[1] }];
  // kisten (in andere doodlopende gangetjes)
  const chests = [];
  for (const e of deadEnds) {
    if (chests.length >= 8) break;
    if (used.has(key(e.i, e.j)) || e.d < 6) continue;
    used.add(key(e.i, e.j));
    chests.push({ id: `kist${chests.length + 1}`, i: e.i, j: e.j, r: e.r, n: 5 + e.r * 3 });
  }
  // kristalbloemen: 1 per gebied, op de weg (je komt er vanzelf langs)
  const flowers = [0, 1, 2].map((r) => {
    const onPath = outside.filter((c) => region.get(key(c.i, c.j)) === r);
    return onPath[Math.floor(onPath.length * 0.4)];
  }).filter(Boolean);
  // rechte lange gangen (voor de rotsblokken)
  const runs = [];
  for (const [di, dj] of [[1, 0], [0, 1]]) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (isOpen(i - di, j - dj, i, j)) continue; // hier begint een stuk
      const cells = [{ i, j }];
      while (isOpen(cells[cells.length - 1].i, cells[cells.length - 1].j, cells[cells.length - 1].i + di, cells[cells.length - 1].j + dj)) {
        const c = cells[cells.length - 1]; cells.push({ i: c.i + di, j: c.j + dj });
      }
      if (cells.length < 4 || cells.some((c) => inRoom(c.i, c.j) || used.has(key(c.i, c.j)))) continue;
      const ends = [cells[0], cells[cells.length - 1]];
      if (ends.some((c) => neighbors(c.i, c.j).length < 2)) continue; // niet in een doodlopend stuk: je moet kunnen wegduiken
      const r = Math.min(...cells.map((c) => region.get(key(c.i, c.j))));
      if (r < 1) continue;
      runs.push({ cells, r });
    }
  }
  runs.sort((a, b) => b.cells.length - a.cells.length);
  const boulders = runs.slice(0, 5);
  // doornen: in gangen op de weg (gebied 1 en hoger)
  const thorns = outside.filter((c, n) => n % 5 === 3 && region.get(key(c.i, c.j)) >= 1 && !doors.some((d) => (d.a.i === c.i && d.a.j === c.j) || (d.b.i === c.i && d.b.j === c.j)));
  // heggenslijmpjes: meer naarmate je dieper komt
  const slimes = [];
  const perRegion = [4, 6, 7, 8];
  for (let r = 0; r < 4; r++) {
    const cells = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (region.get(key(i, j)) === r && !inRoom(i, j) && fromEntry.get(key(i, j)) > 3) cells.push({ i, j });
    for (let n = 0; n < perRegion[r] && cells.length; n++) {
      const c = cells.splice(Math.floor(rand() * cells.length), 1)[0];
      slimes.push(c);
    }
  }
  return { seed, sizes, N, open, isOpen, neighbors, bfs, path, outside, doors, doorEdges, region, switches, secretCell, stones, chests, flowers, boulders, thorns, slimes, edge, key };
}

// Een zachte "cutaway": heggen tussen de camera en jou worden laag, zodat je jezelf altijd ziet
function cutawayMaterial(color, uni) {
  const m = mat(color, { roughness: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCut = uni.uCut;
    sh.vertexShader = 'uniform vec3 uCut;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float dz = ip.z - uCut.z;
        float side = abs(ip.x - uCut.x);
        float k = smoothstep(0.2, 1.6, dz) * (1.0 - smoothstep(8.5, 10.5, dz)) * (1.0 - smoothstep(3.6 + dz * 0.35, 5.2 + dz * 0.35, side));
        transformed.y *= mix(1.0, 0.12, k);
      #endif`);
  };
  m.customProgramCacheKey = () => 'maze-cut';
  return m;
}

export function createMaze(group) {
  const L = buildMazeLayout();
  const N = MAZE_N, rand = seeded(77);
  const colliders = [], boxes = [], updaters = [], talkables = [];
  const uni = { uCut: { value: new THREE.Vector3(0, 0, 999) } };

  // ---------- Blokjes: wat is heg en wat is gang? ----------
  const solid = [];
  for (let bz = 0; bz < GZ; bz++) solid.push(new Array(GX).fill(true));
  const carve = (bx, bz) => { if (bz >= 0 && bz < GZ && bx >= 0 && bx < GX) solid[bz][bx] = false; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const bx = M + 3 * i, bz = M + 3 * j;
    carve(bx + 1, bz + 1); carve(bx + 2, bz + 1); carve(bx + 1, bz + 2); carve(bx + 2, bz + 2);
    if (L.isOpen(i, j, i + 1, j)) { carve(bx + 3, bz + 1); carve(bx + 3, bz + 2); }
    if (L.isOpen(i, j, i, j + 1)) { carve(bx + 1, bz + 3); carve(bx + 2, bz + 3); }
    if (inRoom(i, j) && inRoom(i + 1, j + 1)) carve(bx + 3, bz + 3); // geen paaltjes in de middenkamer
  }
  // ingang en het pleintje
  const ebx = M + 3 * ENTRY.i;
  for (let bz = M + 3 * N; bz < GZ - 1; bz++) for (let bx = ebx - 5; bx <= ebx + 8; bx++) {
    if (bz === M + 3 * N && (bx < ebx + 1 || bx > ebx + 2)) continue;
    carve(bx, bz);
  }
  // het geheime kamertje (achter de noordmuur van een doodlopend gangetje)
  const sc = L.secretCell;
  const sbx = M + 3 * sc.i;
  const secretBlocks = [[sbx + 1, M], [sbx + 2, M]];
  for (const bz of [M - 2, M - 1]) for (let bx = sbx; bx <= sbx + 3; bx++) carve(bx, bz);
  const isSecret = (bx, bz) => secretBlocks.some(([a, b]) => a === bx && b === bz);
  const roomRing = (bx, bz) => {
    const lo = M + 3 * ROOM[0], hi = M + 3 * (ROOM[1] + 1);
    return bx >= lo && bx <= hi && bz >= lo && bz <= hi && (bx === lo || bx === hi || bz === lo || bz === hi);
  };

  // ---------- Grond ----------
  const W = GX * BL, D = GZ * BL;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, D + 80).rotateX(-Math.PI / 2), mat(0x7cb85a, { roughness: 1 }));
  ground.position.set(0, 0, (bz2z(0) + bz2z(GZ - 1)) / 2);
  ground.receiveShadow = true;
  group.add(ground);
  // een grindpaadje in de gangen
  const pathGeo = new THREE.PlaneGeometry(BL * 2.4, BL * 2.4).rotateX(-Math.PI / 2);
  const gravel = new THREE.InstancedMesh(pathGeo, mat(0xd8c9a3, { roughness: 1 }), N * N);
  const dummy = new THREE.Object3D();
  let gi = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (inRoom(i, j)) continue;
    dummy.position.set(cellX(i), 0.02, cellZ(j)); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    gravel.setMatrixAt(gi++, dummy.matrix);
  }
  gravel.count = gi;
  gravel.receiveShadow = true;
  group.add(gravel);
  // stenen vloer in de middenkamer
  const roomC = { x: cellX(7), z: cellZ(7) };
  const roomFloor = mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.06, 24), mat(0xc9c2b2, { roughness: 0.9 }), roomC.x, 0.03, roomC.z, group);
  roomFloor.receiveShadow = true;
  mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.08, 20), mat(0x8fb339), roomC.x, 0.05, roomC.z, group);

  // ---------- Heggen en stenen muren (InstancedMesh, met cutaway) ----------
  const near = (bx, bz) => {
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const x = bx + a, z = bz + b;
      if (x >= 0 && z >= 0 && x < GX && z < GZ && !solid[z][x]) return true;
    }
    return false;
  };
  const hedgeList = [], stoneList = [];
  for (let bz = 0; bz < GZ; bz++) for (let bx = 0; bx < GX; bx++) {
    if (!solid[bz][bx] || !near(bx, bz) || isSecret(bx, bz)) continue;
    (roomRing(bx, bz) ? stoneList : hedgeList).push([bx, bz]);
  }
  const blockGeo = new THREE.BoxGeometry(BL, 1, BL).translate(0, 0.5, 0);
  const hedges = new THREE.InstancedMesh(blockGeo, cutawayMaterial(0xffffff, uni), hedgeList.length);
  const greens = [0x2f7d32, 0x37883a, 0x2a6f2d, 0x3b8f3e];
  hedgeList.forEach(([bx, bz], n) => {
    const outer = bx <= M || bx >= GX - M - 1 || bz <= M;
    const h = HEDGE_H + (outer ? 0.6 : 0) + ((bx * 7 + bz * 13) % 5) * 0.06;
    dummy.position.set(bx2x(bx), 0, bz2z(bz)); dummy.scale.set(1, h, 1); dummy.updateMatrix();
    hedges.setMatrixAt(n, dummy.matrix);
    hedges.setColorAt(n, new THREE.Color(greens[(bx * 3 + bz * 5) % 4]));
  });
  hedges.receiveShadow = true;
  const stones = new THREE.InstancedMesh(blockGeo, cutawayMaterial(0xffffff, uni), stoneList.length);
  stoneList.forEach(([bx, bz], n) => {
    dummy.position.set(bx2x(bx), 0, bz2z(bz)); dummy.scale.set(1, 3.4, 1); dummy.updateMatrix();
    stones.setMatrixAt(n, dummy.matrix);
    stones.setColorAt(n, new THREE.Color([0xb8b0a0, 0xa89f8f, 0xc4bcab][(bx + bz) % 3]));
  });
  stones.receiveShadow = true;
  group.add(hedges, stones);
  // botsen: blokjes op een rij worden één lange doos
  for (let bz = 0; bz < GZ; bz++) {
    let start = -1;
    for (let bx = 0; bx <= GX; bx++) {
      const s = bx < GX && solid[bz][bx] && near(bx, bz) && !isSecret(bx, bz);
      if (s && start < 0) start = bx;
      if (!s && start >= 0) {
        const x1 = bx2x(start) - BL / 2, x2 = bx2x(bx - 1) + BL / 2;
        boxes.push({ x: (x1 + x2) / 2, z: bz2z(bz), hw: (x2 - x1) / 2, hd: BL / 2, h: 3 });
        start = -1;
      }
    }
  }

  // ---------- De geheime muur (ziet eruit als gewone heg) ----------
  const secretWall = new THREE.Group();
  for (const [bx, bz] of secretBlocks) {
    const m = new THREE.Mesh(blockGeo, mat(greens[(bx * 3 + bz * 5) % 4], { roughness: 0.9 }));
    m.position.set(bx2x(bx), 0, bz2z(bz)); m.scale.set(1, HEDGE_H + 0.6, 1);
    secretWall.add(m);
  }
  group.add(secretWall);
  const secretBox = { x: (bx2x(secretBlocks[0][0]) + bx2x(secretBlocks[1][0])) / 2, z: bz2z(M), hw: BL, hd: BL / 2, h: 3 };
  boxes.push(secretBox);
  // het kamertje zelf: een dak (zodat je er van bovenaf niet in kunt kijken) en letters in de muur
  const room = { x: (bx2x(sbx) + bx2x(sbx + 3)) / 2, z: (bz2z(M - 2) + bz2z(M - 1)) / 2 };
  const roof = mesh(new THREE.BoxGeometry(BL * 6, 0.3, BL * 4), mat(0x2a6f2d), room.x, HEDGE_H + 0.75, room.z - BL * 0.5, group);
  roof.castShadow = false;
  const plaque = new THREE.Group();
  mesh(new THREE.BoxGeometry(2.2, 1.0, 0.12), mat(0x9a9384), 0, 1.25, 0, plaque);
  const plaqueTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 112;
    const g = c.getContext('2d');
    g.fillStyle = '#9a9384'; g.fillRect(0, 0, 256, 112);
    g.fillStyle = '#5c574d'; g.font = 'bold 34px "Trebuchet MS", sans-serif'; g.textAlign = 'center';
    g.fillText('KRISTAL100K', 128, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.85), new THREE.MeshBasicMaterial({ map: plaqueTex }));
  plaqueFace.position.set(0, 1.25, 0.07);
  plaque.add(plaqueFace);
  plaque.position.set(room.x, 0, bz2z(M - 2) - BL / 2 + 0.08);
  group.add(plaque);
  const gemDecor = [];
  for (let n = 0; n < 5; n++) {
    const g = mesh(new THREE.OctahedronGeometry(0.22, 0), mat(0x7af7ff, { emissive: 0x1b8fd8, emissiveIntensity: 0.8 }), room.x - 1.6 + n * 0.8, 0.35, room.z + 0.3, group);
    gemDecor.push(g);
  }
  const carved = {
    id: 'kamertje', name: 'Oude muur', voice: 0.9, mesh: plaque, pos: plaque.position, sign: true, hiddenSecret: true,
    lines: ['Een piepklein geheim kamertje!', 'In de muur zijn letters gekrast:', 'K R I S T A L 1 0 0 K', '(Psst... dit weet bijna niemand!)'],
    showMarker() {}, update() {},
    distanceTo(p) { return zone.secretOpen ? Math.hypot(p.x - plaque.position.x, p.z - (plaque.position.z + 0.6)) : Infinity; },
  };
  talkables.push(carved);

  // ---------- De steentjes met letters ----------
  const pebbleM = () => mat(0x8a8577, { roughness: 1 });
  const stoneSpots = L.stones.map((s, n) => {
    // in een hoekje van het doodlopende gangetje, tegen de heg
    const nb = L.neighbors(s.i, s.j)[0];
    const away = { x: Math.sign(s.i - nb[0]), z: Math.sign(s.j - nb[1]) };
    const side = n ? 1 : -1;
    const x = cellX(s.i) + away.x * 1.05 + (away.z ? side * 1.0 : 0);
    const z = cellZ(s.j) + away.z * 1.05 + (away.x ? side * 1.0 : 0);
    const m = pebbleM();
    const peb = mesh(new THREE.DodecahedronGeometry(0.2, 0), m, x, 0.14, z, group);
    peb.scale.set(1.2, 0.7, 1);
    return { id: s.id, x, z, mesh: peb, m };
  });
  for (const s of stoneSpots) {
    talkables.push({
      id: `steen-${s.id}`, name: 'Klein steentje', voice: 1.3, mesh: s.mesh, pos: s.mesh.position, sign: true, lever: s.id,
      get lines() { return ['Een klein steentje... er zijn letters in gekrast:', s.id === 'tal' ? 'T A L' : '1 0 0 K', '*klik*']; },
      showMarker() {}, update() {},
      distanceTo(p) { return Math.hypot(p.x - s.x, p.z - s.z); },
    });
  }

  // ---------- De 3 gekleurde deuren en de drukknoppen ----------
  const doors = L.doors.map((d) => {
    const x = (cellX(d.a.i) + cellX(d.b.i)) / 2, z = (cellZ(d.a.j) + cellZ(d.b.j)) / 2;
    const alongX = d.a.j === d.b.j; // de gang loopt oost-west: de deur staat dwars
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = alongX ? Math.PI / 2 : 0;
    const barM = mat(d.color, { metalness: 0.4, roughness: 0.4, emissive: d.color, emissiveIntensity: 0.15 });
    for (let k = -3; k <= 3; k++) mesh(new THREE.BoxGeometry(0.16, 3.0, 0.16), barM, k * 0.42, 1.5, 0, g);
    mesh(new THREE.BoxGeometry(3.0, 0.22, 0.22), barM, 0, 2.9, 0, g);
    mesh(new THREE.BoxGeometry(3.0, 0.22, 0.22), barM, 0, 0.5, 0, g);
    const lock = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), mat(0xffffff, { emissive: d.color, emissiveIntensity: 0.6 }), 0, 1.6, 0, g);
    group.add(g);
    const box = alongX ? { x, z, hw: 0.25, hd: BL } : { x, z, hw: BL, hd: 0.25 };
    boxes.push(box);
    return { ...d, x, z, g, box, lock, open: false, k: 0 };
  });
  const plateGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.12, 14);
  const switches = L.switches.map((s) => {
    const d = doors[s.door];
    const cx = cellX(s.i), cz = cellZ(s.j);
    const nb = L.neighbors(s.i, s.j)[0];
    const away = { x: Math.sign(s.i - nb[0]), z: Math.sign(s.j - nb[1]) };
    const across = { x: away.z, z: away.x };
    const spots = d.plates === 2
      ? [[-0.75, 0], [0.75, 0]]
      : [[-0.85, -0.45], [0.85, -0.45], [0, 0.75]];
    const plates = spots.map(([a, b]) => {
      const x = cx + across.x * a + away.x * b, z = cz + across.z * a + away.z * b;
      const pm = mat(d.color, { emissive: d.color, emissiveIntensity: 0.2 });
      const m = mesh(plateGeo, pm, x, 0.06, z, group);
      return { x, z, m, pm, pressed: false };
    });
    // een vlaggetje in de kleur van de deur
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), mat(0x6c584c), cx + away.x * 1.0, 0.8, cz + away.z * 1.0, group);
    mesh(new THREE.BoxGeometry(0.6, 0.38, 0.04), mat(d.color), cx + away.x * 1.0 + 0.3, 1.4, cz + away.z * 1.0, group);
    return { door: s.door, i: s.i, j: s.j, x: cx, z: cz, plates };
  });

  // ---------- Kisten ----------
  const chests = L.chests.map((c) => {
    const nb = L.neighbors(c.i, c.j)[0];
    const away = { x: Math.sign(c.i - nb[0]), z: Math.sign(c.j - nb[1]) };
    const x = cellX(c.i) + away.x * 0.7, z = cellZ(c.j) + away.z * 0.7;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-away.x, -away.z);
    const wood = mat(0x9c6644), gold = mat(0xffc300, { metalness: 0.5, emissive: 0x553300, emissiveIntensity: 0.4 });
    mesh(new THREE.BoxGeometry(1.0, 0.55, 0.7), wood, 0, 0.28, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.55, -0.35); g.add(lid);
    mesh(new THREE.BoxGeometry(1.02, 0.24, 0.72), wood, 0, 0.12, 0.35, lid);
    mesh(new THREE.BoxGeometry(0.18, 0.2, 0.06), gold, 0, 0.0, 0.72, lid);
    mesh(new THREE.BoxGeometry(1.04, 0.08, 0.1), gold, 0, 0.3, 0.3, g);
    group.add(g);
    colliders.push({ x, z, r: 0.5, h: 0.8 });
    return { ...c, x, z, g, lid, opened: false, k: 0 };
  });

  // ---------- Kristalbloemen (spoor-krachtje) ----------
  const flowerM = mat(0x9bf6ff, { emissive: 0x4cc9f0, emissiveIntensity: 0.9 });
  const flowers = L.flowers.map((c, n) => {
    const g = new THREE.Group();
    const x = cellX(c.i) + 0.9, z = cellZ(c.j) - 0.9;
    g.position.set(x, 0, z);
    mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 5), mat(0x2d6a4f), 0, 0.35, 0, g);
    for (let k = 0; k < 5; k++) {
      const p = mesh(new THREE.OctahedronGeometry(0.16, 0), flowerM, Math.cos(k * 1.257) * 0.18, 0.78, Math.sin(k * 1.257) * 0.18, g);
      p.scale.set(1, 0.5, 1);
    }
    mesh(new THREE.OctahedronGeometry(0.12, 0), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 0, 0.82, 0, g);
    group.add(g);
    return { id: `bloem${n + 1}`, x, z, g, cool: 0 };
  });
  // het spoor zelf: gloeiende kristalletjes langs de weg
  const TRAIL_MAX = 40;
  const trail = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0x9bf6ff, transparent: true, opacity: 0.9 }), TRAIL_MAX);
  trail.count = 0;
  trail.frustumCulled = false;
  group.add(trail);

  // ---------- Rotsblokken die door de gangen rollen ----------
  const rockM = mat(0x8d8579, { roughness: 1 });
  const boulders = L.boulders.map((run, n) => {
    const g = new THREE.Group();
    const ball = mesh(new THREE.DodecahedronGeometry(1.0, 1), rockM, 0, 1.0, 0, g);
    // slaperige oogjes: een lieve rots, maar wel een harde!
    for (const sx of [-0.3, 0.3]) mesh(new THREE.BoxGeometry(0.25, 0.06, 0.06), mat(0x1d1d1d), sx, 1.25, 0.95, g);
    mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), mat(0x1d1d1d), 0, 0.85, 0.97, g);
    group.add(g);
    const a = run.cells[0], b = run.cells[run.cells.length - 1];
    return { g, ball, a: { x: cellX(a.i), z: cellZ(a.j) }, b: { x: cellX(b.i), z: cellZ(b.j) }, k: 0, dir: 1, wait: 1 + n * 0.7, pos: g.position, len: run.cells.length };
  });

  // ---------- Doornen die uit de grond komen ----------
  const thornGeo = new THREE.ConeGeometry(0.16, 0.9, 4);
  const thornM = mat(0x6b4f2a), warnM = new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.35, depthWrite: false });
  const thorns = L.thorns.map((c, n) => {
    const g = new THREE.Group();
    g.position.set(cellX(c.i), 0, cellZ(c.j));
    const spikes = new THREE.Group();
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const s = new THREE.Mesh(thornGeo, thornM);
      s.position.set(a * 0.75 + (b % 2) * 0.2, 0.45, b * 0.75);
      spikes.add(s);
    }
    g.add(spikes);
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), warnM);
    warn.position.y = 0.04;
    g.add(warn);
    group.add(g);
    return { g, spikes, x: cellX(c.i), z: cellZ(c.j), t: n * 0.9, up: false };
  });
  const THORN_CYCLE = 3.6, THORN_WARN = 0.8, THORN_UP = 1.3;

  // ---------- Ingang: de portaal terug naar de woestijn en een bord ----------
  const plazaZ = bz2z(M + 3 * N + 5);
  const portal = makePortal(group, cellX(ENTRY.i), bz2z(GZ - 2) - 0.2, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  const sign = {
    ...makeSignBoard(group, cellX(ENTRY.i) + 3.4, plazaZ + 1.2),
    id: 'bord-doolhof', name: 'Bord', voice: 1.1, sign: true,
    lines: [
      'HET DOOLHOF',
      'In het midden woont Bladkoning Bram. Hij bewaakt stukje 2 van de schatkaart!',
      'Gekleurde deuren gaan open met drukknoppen. Daar heb je je clones bij nodig.',
      'Pas op voor rollende rotsen, doornen en heggenslijmpjes. Verdwaal niet!',
    ],
  };
  talkables.push(sign);

  // ---------- Zone ----------
  const seenBits = new Uint8Array(N * N);
  const minZ = bz2z(0) + BL / 2, maxZ = bz2z(GZ - 1) - BL / 2;
  const zone = {
    id: 'doolhof', name: 'Het Doolhof', group, colliders, boxes, talkables, npcs: [],
    bounds: { minX: bx2x(0) + BL / 2, maxX: bx2x(GX - 1) - BL / 2, minZ, maxZ },
    music: 'bos',
    env: { sky: [0x6cb8e6, 0xd8f0d0], fog: [0xcfe8c8, 22, 52], hemi: [0xe6ffe0, 0x4a7a3a, 1.2], sun: [0xfff2d6, 2.1], cam: [0, 13.5, 7.5] },
    spawns: { fromWoestijn: { x: cellX(ENTRY.i), z: bz2z(GZ - 2) - 3.2, rot: Math.PI } },
    exit: { x: cellX(ENTRY.i), z: bz2z(GZ - 2) },
    layout: L, doors, switches, chests, flowers, boulders, thorns, stoneSpots, carved, room, roomC,
    secretOpen: false,
    slimeSpots: L.slimes.map((c) => ({ x: cellX(c.i) + (rand() - 0.5), z: cellZ(c.j) + (rand() - 0.5), kind: 'heg' })),
    boss: roomC,
    labels: [{ x: cellX(ENTRY.i), z: plazaZ, text: 'Ingang' }],
    seenBits,
    uniforms: uni,
    // de nieuwste staat uit de save overnemen
    applyState(ms) {
      for (const d of doors) { const o = ms.doors.includes(d.id); if (o !== d.open) { d.open = o; d.box.off = o; if (o) d.k = 1; } }
      for (const c of chests) if (ms.chests.includes(c.id) && !c.opened) { c.opened = true; c.k = 1; }
      zone.setSecretOpen(!!ms.secret, true);
      for (const s of stoneSpots) {
        const on = ms.levers.includes(s.id);
        s.m.color.set(on ? 0xc7f9cc : 0x8a8577);
        s.m.emissive.set(on ? 0x2d6a4f : 0x000000);
      }
      seenBits.fill(0);
      const hex = ms.seen || '';
      for (let n = 0; n < N * N; n++) {
        const byte = parseInt(hex.substr((n >> 3) * 2, 2) || '0', 16);
        seenBits[n] = (byte >> (n & 7)) & 1;
      }
    },
    seenHex() {
      let s = '';
      for (let b = 0; b < Math.ceil(N * N / 8); b++) {
        let v = 0;
        for (let k = 0; k < 8; k++) if (seenBits[b * 8 + k]) v |= 1 << k;
        s += v.toString(16).padStart(2, '0');
      }
      return s;
    },
    // ontdek het vakje waar je staat (en de buren die je kunt zien). Geeft true als er iets nieuws is.
    explore(x, z) {
      const c = cellOf(x, z);
      if (!c.ok) return false;
      let changed = false;
      const mark = (i, j) => { const k = key(i, j); if (!seenBits[k]) { seenBits[k] = 1; changed = true; } };
      mark(c.i, c.j);
      for (const [a, b] of L.neighbors(c.i, c.j)) {
        mark(a, b);
        // rechtdoor kijken in een rechte gang
        let pi = c.i, pj = c.j, qi = a, qj = b;
        for (let s = 0; s < 3; s++) {
          const ni = qi + (qi - pi), nj = qj + (qj - pj);
          if (!L.isOpen(qi, qj, ni, nj)) break;
          mark(ni, nj); pi = qi; pj = qj; qi = ni; qj = nj;
        }
      }
      if (inRoom(c.i, c.j)) for (let i = ROOM[0]; i <= ROOM[1]; i++) for (let j = ROOM[0]; j <= ROOM[1]; j++) mark(i, j);
      return changed;
    },
    isSeen: (x, z) => { const c = cellOf(x, z); return !c.ok || !!seenBits[key(c.i, c.j)]; },
    seenCount: () => seenBits.reduce((a, b) => a + b, 0),
    setSecretOpen(yes, instant = false) {
      zone.secretOpen = yes;
      secretBox.off = yes;
      if (instant) secretWall.position.y = yes ? -HEDGE_H - 0.8 : 0;
    },
    center: { i: 7, j: 7 },
    inBossRoom: (p) => { const c = cellOf(p.x, p.z); return c.ok && inRoom(c.i, c.j); },
    inSecretRoom: (p) => Math.abs(p.x - room.x) < BL * 2.2 && p.z < bz2z(M) - BL / 2 + 0.3,
    // de route (vakjes) van een plek naar een vakje, alleen door open deuren
    route(from, to) {
      const a = cellOf(from.x, from.z);
      if (!a.ok) return [];
      const closed = new Set(doors.filter((d) => !d.open).map((d) => L.edge(key(d.a.i, d.a.j), key(d.b.i, d.b.j))));
      const { prev } = L.bfs(a, (i, j, p, q) => closed.has(L.edge(key(i, j), key(p, q))));
      const out = [];
      for (let k = key(to.i, to.j); k !== undefined; k = prev.get(k)) out.unshift({ i: k % N, j: Math.floor(k / N) });
      return out[0] && out[0].i === a.i && out[0].j === a.j ? out : [];
    },
    showTrail(cells) {
      const pts = [];
      for (let n = 0; n + 1 < cells.length && pts.length < TRAIL_MAX; n++) {
        const p = cells[n], q = cells[n + 1];
        for (const f of [0, 0.5]) pts.push([cellX(p.i) + (cellX(q.i) - cellX(p.i)) * f, cellZ(p.j) + (cellZ(q.j) - cellZ(p.j)) * f]);
      }
      trail.count = Math.min(TRAIL_MAX, pts.length);
      pts.slice(0, TRAIL_MAX).forEach(([x, z], n) => {
        dummy.position.set(x, 0.5, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        trail.setMatrixAt(n, dummy.matrix);
      });
      trail.instanceMatrix.needsUpdate = true;
    },
    hideTrail() { trail.count = 0; },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      // deuren zakken in de grond als ze opengaan
      for (const d of doors) {
        d.k += ((d.open ? 1 : 0) - d.k) * Math.min(1, dt * 1.5);
        d.g.position.y = -3.2 * d.k;
        d.lock.rotation.y = t * 1.5;
      }
      for (const c of chests) { c.k += ((c.opened ? 1 : 0) - c.k) * Math.min(1, dt * 4); c.lid.rotation.x = -1.9 * c.k; }
      for (const f of flowers) { f.g.rotation.y = t * 0.8; f.g.scale.setScalar(f.cool > 0 ? 0.45 : 1 + Math.sin(t * 3 + f.x) * 0.06); f.cool = Math.max(0, f.cool - dt); }
      if (trail.count) trail.material.opacity = 0.65 + Math.sin(t * 6) * 0.25;
      // de geheime muur zakt langzaam weg
      if (zone.secretOpen && secretWall.position.y > -HEDGE_H - 0.8) secretWall.position.y = Math.max(-HEDGE_H - 0.8, secretWall.position.y - dt * 1.2);
      gemDecor.forEach((g, n) => { g.rotation.y = t * 2 + n; g.position.y = 0.35 + Math.sin(t * 3 + n) * 0.06; });
      // doornen: eerst een rood vlak (waarschuwing), dan omhoog
      for (const th of thorns) {
        th.t = (th.t + dt) % THORN_CYCLE;
        const warn = th.t > THORN_CYCLE - THORN_UP - THORN_WARN && th.t <= THORN_CYCLE - THORN_UP;
        th.up = th.t > THORN_CYCLE - THORN_UP;
        th.spikes.position.y = th.up ? Math.min(0, -0.9 + (th.t - (THORN_CYCLE - THORN_UP)) * 9) : -0.95;
        th.g.children[1].visible = warn || th.up;
        th.g.children[1].material.opacity = warn ? 0.25 + Math.abs(Math.sin(t * 12)) * 0.3 : 0.2;
      }
      // rotsblokken rollen heen en weer, en wachten even aan het eind
      for (const b of boulders) {
        if (b.wait > 0) { b.wait -= dt; b.rolling = false; }
        else {
          const len = Math.hypot(b.b.x - b.a.x, b.b.z - b.a.z);
          const sp = 5.2 / len;
          b.k += b.dir * sp * dt;
          b.rolling = true;
          if (b.k >= 1 || b.k <= 0) { b.k = Math.min(1, Math.max(0, b.k)); b.dir *= -1; b.wait = 2.2; }
          const ax = b.b.x - b.a.x, az = b.b.z - b.a.z;
          b.ball.rotation.x += (az ? Math.sign(az) : 0) * b.dir * sp * len * dt / 1.0;
          b.ball.rotation.z -= (ax ? Math.sign(ax) : 0) * b.dir * sp * len * dt / 1.0;
          b.g.rotation.y = Math.atan2(ax * b.dir, az * b.dir);
        }
        b.pos.x = b.a.x + (b.b.x - b.a.x) * b.k;
        b.pos.z = b.a.z + (b.b.z - b.a.z) * b.k;
      }
      roof.visible = !zone.inSecretRoom(zone.focus || { x: 0, z: 0 });
    },
  };
  // de kaart: alleen wat je al hebt ontdekt
  zone.drawMap = (g, px, pz, scale) => {
    g.fillStyle = '#163b1d';
    g.fillRect(px(zone.bounds.minX), pz(zone.bounds.minZ), (zone.bounds.maxX - zone.bounds.minX) * scale, (zone.bounds.maxZ - zone.bounds.minZ) * scale);
    // het pleintje bij de ingang zie je altijd
    g.fillStyle = '#d8c9a3';
    g.fillRect(px(bx2x(ebx - 5) - BL / 2), pz(bz2z(M + 3 * N + 1) - BL / 2), BL * 14 * scale, BL * (PLAZA - 2) * scale);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (!seenBits[key(i, j)]) continue;
      const x = cellX(i), z = cellZ(j), h = BL;
      g.fillStyle = inRoom(i, j) ? '#c9c2b2' : '#d8c9a3';
      g.fillRect(px(x - h), pz(z - h), 2 * h * scale, 2 * h * scale);
      if (L.isOpen(i, j, i + 1, j)) g.fillRect(px(x + h - 0.1), pz(z - h), (BL + 0.2) * scale, 2 * h * scale);
      if (L.isOpen(i, j, i, j + 1)) g.fillRect(px(x - h), pz(z + h - 0.1), 2 * h * scale, (BL + 0.2) * scale);
    }
    for (const d of doors) {
      if (!zone.isSeen(cellX(d.a.i), cellZ(d.a.j)) && !zone.isSeen(cellX(d.b.i), cellZ(d.b.j))) continue;
      g.fillStyle = d.open ? 'rgba(255,255,255,0.5)' : '#' + d.color.toString(16).padStart(6, '0');
      g.fillRect(px(d.x - 0.9), pz(d.z - 0.9), 1.8 * scale, 1.8 * scale);
    }
    for (const s of switches) {
      if (!zone.isSeen(s.x, s.z)) continue;
      g.fillStyle = '#' + doors[s.door].color.toString(16).padStart(6, '0');
      g.beginPath(); g.arc(px(s.x), pz(s.z), Math.max(3, 0.8 * scale), 0, Math.PI * 2); g.fill();
    }
    for (const c of chests) {
      if (!zone.isSeen(c.x, c.z)) continue;
      g.fillStyle = c.opened ? '#7a5c34' : '#ffc300';
      g.fillRect(px(c.x) - 3, pz(c.z) - 3, 6, 6);
    }
  };
  zone.focus = { x: 0, z: 0 };
  return zone;
}

// Een houten bord (zelfde stijl als in de rest van het spel)
function makeSignBoard(group, x, z) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), mat(0x8b5a2b), 0, 0.8, 0, g);
  mesh(new THREE.BoxGeometry(1.7, 0.75, 0.1), mat(0x2d6a4f), 0, 1.5, 0, g);
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2d6a4f'; ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('DOOLHOF', 128, 62);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.6), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.set(0, 1.5, 0.06);
  g.add(face);
  g.position.set(x, 0, z);
  group.add(g);
  return { mesh: g, pos: g.position, showMarker() {}, update() {}, distanceTo(p) { return Math.hypot(p.x - x, p.z - z); } };
}

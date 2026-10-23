// De Vulkaan (hoofdstuk 5, idee van Dex): wereld 3 van de schatkaart. Heet, donker en nog moeilijker dan het doolhof!
// Van de ingang (zuid) naar de krater (noord):
//   1. De lavarivier: steek over op de SPRINGENDE STENEN. Ze zakken om de beurt even in de lava (ze wiebelen eerst).
//   2. Het lavaveld: af en toe STIJGT DE LAVA. Ga dan snel op een stenen eiland staan!
//   3. Het vuurpad: smal pad omhoog, er regenen VUURBALLEN (kijk naar de rode rondjes).
//   4. De krater: hier woont Vuurdraak Vonk (zie dragon.js). Hij bewaakt stukje 3 van de schatkaart.
// Overal springen LAVAMONSTERS rond. Er staan 3 schatkisten. De Wolkenflitser mag hier niet komen (te makkelijk).
// Wil je iets verplaatsen? De belangrijkste plekken staan hieronder.
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, makeFloaters, seeded } from './props.js';
import { makePortal } from './world.js';
import { instanced } from './optimize.js';

export const VOLCANO_BOUNDS = { minX: -24, maxX: 24, minZ: -52, maxZ: 40 };
export const RIVER = { z1: 9.5, z2: 18.5 };          // de lavarivier (over de hele breedte)
export const FIELD = { z1: -14, z2: 6 };             // het lavaveld (over de hele breedte)
export const PASS = { z1: -27, z2: -14, half: 5 };   // het vuurpad
export const CRATER = { x: 0, z: -38, r: 11 };       // de krater met de draak
const STONE_R = 1.2, STONE_TOP = 0.35;
export const STONE_CYCLE = 5, STONE_DOWN = 1.6, STONE_STEP = 1.25, STONE_WARN = 0.8;
const ISLAND_R = 1.7, ISLAND_TOP = 0.28;
// de lava stijgt: rustig, waarschuwing, stijgen, hoog, zakken (seconden)
export const FLOOD = { calm: 8, warn: 3, rise: 0.8, high: 3.5, drain: 1.2 };
const FLOOD_CYCLE = FLOOD.calm + FLOOD.warn + FLOOD.rise + FLOOD.high + FLOOD.drain;
export const CHESTS = [
  { id: 'vkist1', x: -7.4, z: -20, n: 15 },
  { id: 'vkist2', x: 7.4, z: -20, n: 15 },
  { id: 'vkist3', x: -19, z: 24, n: 20 },
];

// Gloeiende lava (getekend op een canvas, dus geen plaatjes nodig)
function lavaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8590c'; g.fillRect(0, 0, 128, 128);
  const rand = seeded(77);
  for (let i = 0; i < 46; i++) {
    const x = rand() * 128, y = rand() * 128, r = 4 + rand() * 14;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const hot = rand() > 0.45;
    grd.addColorStop(0, hot ? '#ffe066' : '#9d0208'); grd.addColorStop(1, 'rgba(232,89,12,0)');
    g.fillStyle = grd;
    for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) { g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
// een plat stuk lava met de goede hoeveelheid herhaling
function lavaPlane(w, d, material) {
  const geo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 7, uv.getY(i) * d / 7);
  return new THREE.Mesh(geo, material);
}

export function createVolcano(group) {
  const rand = seeded(2031);
  const B = VOLCANO_BOUNDS;
  const boxes = [], colliders = [], updaters = [], talkables = [];
  const W = B.maxX - B.minX;

  // ---------- Grond: donkere steen ----------
  const groundGeo = new THREE.PlaneGeometry(150, 170, 60, 68).rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0, -6);
  const gp = groundGeo.attributes.position, colors = [];
  const cA = new THREE.Color(0x3d3431), cB = new THREE.Color(0x2b2422), cC = new THREE.Color(0x4a3b33);
  for (let i = 0; i < gp.count; i++) {
    const r = rand(), c = r < 0.4 ? cA : r < 0.8 ? cB : cC;
    colors.push(c.r, c.g, c.b);
    // buiten de rand: bergen van steen
    const x = gp.getX(i), z = gp.getZ(i);
    const out = Math.max(B.minX - x, x - B.maxX, B.minZ - z, z - B.maxZ, 0);
    if (out > 2) gp.setY(i, Math.min(14, (out - 2) * 1.4) * (0.7 + rand() * 0.5));
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  group.add(ground);

  // gloeiende scheurtjes in de grond
  const crackM = new THREE.MeshBasicMaterial({ color: 0xff7b00 });
  const cracks = [];
  for (let i = 0; i < 60; i++) {
    const x = B.minX + rand() * W, z = B.minZ + rand() * (B.maxZ - B.minZ);
    if ((z > RIVER.z1 - 1 && z < RIVER.z2 + 1) || Math.hypot(x - CRATER.x, z - CRATER.z) < CRATER.r - 1) continue;
    cracks.push({ x, y: 0.02, z, ry: rand() * Math.PI, sx: 1, sz: 1 });
  }
  instanced(group, new THREE.BoxGeometry(0.08, 0.02, 1.6), crackM, cracks, { cast: false, receive: false });

  // ---------- Lava ----------
  const lavaTex = lavaTexture();
  const lavaM = new THREE.MeshBasicMaterial({ map: lavaTex, color: 0xffffff });
  const river = lavaPlane(W + 30, RIVER.z2 - RIVER.z1, lavaM);
  river.position.set(0, 0.06, (RIVER.z1 + RIVER.z2) / 2);
  group.add(river);
  // de randjes van de rivier (donkere steen)
  for (const z of [RIVER.z1, RIVER.z2]) mesh(new THREE.BoxGeometry(W + 30, 0.18, 0.5), mat(0x241c1a, { roughness: 1 }), 0, 0.05, z, group);
  const riverLight = new THREE.PointLight(0xff6d00, 30, 22, 1.4);
  riverLight.position.set(0, 3, (RIVER.z1 + RIVER.z2) / 2);
  group.add(riverLight);

  // ---------- De springende stenen ----------
  const stoneM = mat(0x5c4d47, { roughness: 1, flatShading: true });
  const stones = [17.4, 15.2, 13.0, 10.8].map((z, k) => {
    const m = mesh(new THREE.CylinderGeometry(STONE_R, STONE_R * 1.1, 0.5, 9), stoneM, 0, STONE_TOP - 0.25, z, group);
    const ring = new THREE.Mesh(new THREE.RingGeometry(STONE_R + 0.05, STONE_R + 0.3, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, depthWrite: false }));
    ring.position.set(0, 0.1, z);
    group.add(ring);
    return { x: 0, z, r: STONE_R, k, m, ring, y: STONE_TOP, walkable: true };
  });
  // fase van een steen: 0..STONE_CYCLE, de eerste STONE_DOWN seconden is hij weg
  const stonePhase = (s, t) => (((t - s.k * STONE_STEP) % STONE_CYCLE) + STONE_CYCLE) % STONE_CYCLE;

  // ---------- Het lavaveld met eilanden ----------
  const fieldM = new THREE.MeshBasicMaterial({ map: lavaTex, color: 0xffffff, transparent: true, opacity: 0.96 });
  const flood = lavaPlane(W + 30, FIELD.z2 - FIELD.z1, fieldM);
  flood.position.set(0, -0.5, (FIELD.z1 + FIELD.z2) / 2);
  group.add(flood);
  // de korst van het veld (iets roder, zodat je ziet waar de lava komt)
  const crust = new THREE.Mesh(new THREE.PlaneGeometry(W + 30, FIELD.z2 - FIELD.z1).rotateX(-Math.PI / 2), mat(0x4a2a22, { roughness: 1 }));
  crust.position.set(0, 0.01, (FIELD.z1 + FIELD.z2) / 2);
  crust.receiveShadow = true;
  group.add(crust);
  const islandM = mat(0x6b5a52, { roughness: 1, flatShading: true });
  const islandSpots = [[0, 3.2], [-10, 1], [10, 0.5], [-19, -2], [19, -3], [-4, -4.5], [6, -6], [-12, -9], [13, -10], [1, -11.5], [-20, -11], [20, -12.5]];
  const islands = islandSpots.map(([x, z]) => {
    mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R * 1.15, ISLAND_TOP + 0.4, 10), islandM, x, (ISLAND_TOP - 0.4) / 2, z, group);
    const ring = new THREE.Mesh(new THREE.RingGeometry(ISLAND_R + 0.05, ISLAND_R + 0.45, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, depthWrite: false }));
    ring.position.set(x, 0.32, z);
    group.add(ring);
    return { x, z, r: ISLAND_R, ring };
  });
  const fieldLight = new THREE.PointLight(0xff6d00, 0, 30, 1.2);
  fieldLight.position.set(0, 4, (FIELD.z1 + FIELD.z2) / 2);
  group.add(fieldLight);
  const flooding = { t: 0, phase: 'calm', level: -0.5, hot: false };

  // ---------- Rotsen ----------
  const rockM = mat(0x4f4340, { roughness: 1, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = [];
  const addRock = (x, z, s, solid = true, flat = 1) => {
    rocks.push({ x, y: s * 0.55 * flat, z, sx: s, sy: s * flat, sz: s, ry: rand() * 6, rx: rand() * 0.3 });
    if (solid) colliders.push({ x, z, r: s * 0.85, h: s * 1.2 });
  };
  // vuurpad: muren links en rechts (met een hoekje voor een schatkist)
  const wall = (x1, x2, z1, z2) => {
    boxes.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, hw: (x2 - x1) / 2, hd: (z2 - z1) / 2, h: 30 });
    mesh(new THREE.BoxGeometry(x2 - x1, 3.4, z2 - z1), rockM, (x1 + x2) / 2, 1.7, (z1 + z2) / 2, group);
  };
  for (const s of [-1, 1]) {
    const o = (a, b) => (s < 0 ? [-b, -a] : [a, b]);
    wall(...o(9.2, B.maxX + 4), PASS.z1 - 0.5, PASS.z2);
    wall(...o(PASS.half, 9.2), PASS.z1 - 0.5, -22);
    wall(...o(PASS.half, 9.2), -18, PASS.z2);
    for (let z = PASS.z1; z < PASS.z2; z += 2.2) addRock(s * (PASS.half + 0.6 + rand() * 0.6), z, 0.8 + rand() * 0.5, false);
  }
  // krater: een ring van grote rotsen (met een opening aan de zuidkant)
  for (let a = 0; a < Math.PI * 2; a += 0.17) {
    const x = CRATER.x + Math.sin(a) * (CRATER.r + 1.5), z = CRATER.z + Math.cos(a) * (CRATER.r + 1.5);
    if (Math.abs(x) < 3.6 && z > CRATER.z) continue;
    addRock(x, z, 1.7 + rand() * 0.7, true, z > CRATER.z ? 0.5 : 0.9); // aan de voorkant lager, zodat je alles goed ziet
  }
  // losse rotsen bij de ingang
  for (const [x, z, s] of [[-9, 30, 1.2], [10, 33, 1.4], [-15, 21, 1], [16, 26, 1.3], [-21, 33, 1.5], [21, 21, 1.1], [6, 22, 0.8]]) addRock(x, z, s);
  instanced(group, rockGeo, rockM, rocks);

  // ---------- De krater: een nest met goud en een lavaring ----------
  const lavaRing = new THREE.Mesh(new THREE.RingGeometry(CRATER.r + 2.6, CRATER.r + 4.2, 40).rotateX(-Math.PI / 2), lavaM);
  lavaRing.position.set(CRATER.x, 0.05, CRATER.z);
  group.add(lavaRing);
  const craterFloor = new THREE.Mesh(new THREE.CircleGeometry(CRATER.r + 0.5, 40).rotateX(-Math.PI / 2), mat(0x3a2622, { roughness: 1 }));
  craterFloor.position.set(CRATER.x, 0.015, CRATER.z);
  craterFloor.receiveShadow = true;
  group.add(craterFloor);
  const goldM = mat(0xffc300, { metalness: 0.5, emissive: 0x553300, emissiveIntensity: 0.4 });
  const nest = { x: CRATER.x, z: CRATER.z - 8 };
  for (let i = 0; i < 14; i++) {
    const a = rand() * 6.28, r = rand() * 1.6;
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 8), goldM, nest.x + Math.cos(a) * r, 0.05 + rand() * 0.2, nest.z + Math.sin(a) * r, group).rotation.set(rand(), 0, rand());
  }
  colliders.push({ x: nest.x, z: nest.z, r: 1.4, h: 0.6 });
  const craterLight = new THREE.PointLight(0xff8c42, 26, 26, 1.3);
  craterLight.position.set(CRATER.x, 5, CRATER.z);
  group.add(craterLight);

  // ---------- De grote vulkaan achter de krater (met rook) ----------
  const cone = mesh(new THREE.ConeGeometry(30, 26, 14, 1, true), mat(0x3b302d, { roughness: 1, flatShading: true }), 0, 12, -84, group);
  cone.castShadow = false;
  const top = mesh(new THREE.CircleGeometry(6, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7b00 }), 0, 22.5, -84, group);
  top.castShadow = false;
  const smokeM = new THREE.MeshLambertMaterial({ color: 0x5a5050, transparent: true, opacity: 0.5, depthWrite: false });
  const puffs = Array.from({ length: 8 }, (_, i) => {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 0), smokeM);
    group.add(p);
    return { p, k: i / 8 };
  });
  updaters.push((t, dt) => {
    for (const f of puffs) {
      f.k = (f.k + dt * 0.06) % 1;
      f.p.position.set(Math.sin(f.k * 9 + t * 0.2) * 3 * f.k, 24 + f.k * 26, -84 + f.k * 6);
      f.p.scale.setScalar(0.6 + f.k * 1.6);
    }
  });

  // ---------- Vuurballen (uit de vulkaan) ----------
  // Eerst een rood rondje op de grond, dan valt er een vuurbal. Wie in het rondje staat: au!
  const FB_R = 1.5, FB_T = 1.3;
  const ballM = new THREE.MeshBasicMaterial({ color: 0xffa94d });
  const ballGeo = new THREE.IcosahedronGeometry(0.55, 1), coreGeo = new THREE.IcosahedronGeometry(0.75, 0);
  const warnGeo = new THREE.RingGeometry(FB_R - 0.25, FB_R, 22).rotateX(-Math.PI / 2), fillGeo = new THREE.CircleGeometry(FB_R, 22).rotateX(-Math.PI / 2);
  const fireballs = [];
  const fireball = (x, z, T = FB_T) => {
    let f = fireballs.find((b) => !b.on);
    if (!f) {
      if (fireballs.length >= 16) return null;
      const g = new THREE.Group();
      const b = new THREE.Mesh(ballGeo, ballM);
      const glow = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xe63946, transparent: true, opacity: 0.5, depthWrite: false }));
      b.add(glow);
      const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.8, depthWrite: false }));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.25, depthWrite: false }));
      g.add(b, warn, fill);
      group.add(g);
      f = { g, b, warn, fill };
      fireballs.push(f);
    }
    // binnen de rand blijven
    f.x = Math.max(B.minX + 1, Math.min(B.maxX - 1, x)); f.z = Math.max(B.minZ + 1, Math.min(B.maxZ - 1, z));
    f.t = 0; f.T = T; f.on = true; f.g.visible = true;
    f.warn.position.set(f.x, 0.08, f.z); f.fill.position.set(f.x, 0.07, f.z);
    return f;
  };
  updaters.push((t, dt) => {
    for (const f of fireballs) {
      if (!f.on) continue;
      f.t += dt;
      const k = Math.min(1, f.t / f.T);
      f.b.position.set(f.x + (1 - k) * 6, 16 * (1 - k * k) + 0.4, f.z - (1 - k) * 10);
      f.fill.scale.setScalar(Math.max(0.05, k));
      f.warn.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
      if (k >= 1) {
        f.on = false; f.g.visible = false;
        zone.onImpact?.(f.x, f.z, FB_R);
      }
    }
  });

  // ---------- Schatkisten ----------
  const chestM = mat(0x8b5a2b), bandM = mat(0xffc300, { metalness: 0.4 });
  const chests = CHESTS.map((c) => {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), chestM, 0, 0.3, 0, g);
    mesh(new THREE.BoxGeometry(1.05, 0.08, 0.75), bandM, 0, 0.45, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.35); g.add(lid);
    mesh(new THREE.BoxGeometry(1.0, 0.25, 0.7), chestM, 0, 0.12, 0.35, lid);
    mesh(new THREE.BoxGeometry(0.16, 0.18, 0.06), bandM, 0, 0.05, 0.72, lid);
    g.position.set(c.x, 0, c.z);
    group.add(g);
    colliders.push({ x: c.x, z: c.z, r: 0.55, h: 0.7 });
    return { ...c, g, lid, opened: false, k: 0 };
  });

  // ---------- Ingang: portaal terug naar de woestijn en een bord ----------
  const portal = makePortal(group, 0, B.maxZ - 2.2, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  talkables.push(makeSignpost(group, {
    id: 'bord-vulkaan', x: 5.2, z: B.maxZ - 7.5, title: 'DE VULKAAN', color: '#c1121f',
    lines: [
      'DE VULKAAN',
      'Bovenin de krater woont Vuurdraak Vonk. Hij bewaakt stukje 3 van de schatkaart!',
      'Steek de lavarivier over op de springende stenen. Wiebelt een steen? Dan zakt hij zo in de lava!',
      'Stijgt de lava? Snel op een stenen eiland! En kijk uit voor vuurballen (rode rondjes) en lavamonsters.',
    ],
  }));

  // vonkjes in de lucht
  updaters.push(makeFloaters(group, { count: 50, color: 0xff9f1c, area: { x: 0, z: -6, w: W, d: B.maxZ - B.minZ }, height: [0.3, 5], size: 0.1 }));

  // ---------- Zone ----------
  const zone = {
    id: 'vulkaan', name: 'De Vulkaan', group, colliders, boxes, talkables, npcs: [],
    bounds: { ...B },
    music: 'vulkaan',
    env: { sky: [0x2b0a0a, 0xff7b39], fog: [0x5a1e10, 28, 78], hemi: [0xffd0b0, 0x401810, 1.0], sun: [0xffb070, 1.7], cam: [0, 11, 10] },
    spawns: { fromWoestijn: { x: 0, z: B.maxZ - 5.5, rot: Math.PI } },
    exit: { x: 0, z: B.maxZ - 2.0 },
    stones, islands, chests, fireball, fireballs, flooding, crater: CRATER, nest,
    boss: { x: CRATER.x, z: CRATER.z - 3 },
    heartSpots: [{ x: -2, z: 7.6 }, { x: -1.5, z: -25.5 }, { x: 1.5, z: -25.5 }],
    slimeSpots: [[-6, 27], [7, 25], [-9, -2], [9, -4.5], [0, -8.5], [-15, -6], [-2, -17], [2.5, -23]].map(([x, z]) => ({ x, z, kind: 'lava' })),
    labels: [
      { x: 0, z: B.maxZ - 4, text: 'Ingang' }, { x: -13, z: (RIVER.z1 + RIVER.z2) / 2, text: 'Lavarivier' },
      { x: -14, z: (FIELD.z1 + FIELD.z2) / 2 + 3, text: 'Lavaveld' }, { x: 0, z: PASS.z2 - 2, text: 'Vuurpad' }, { x: 0, z: CRATER.z, text: 'Krater' },
    ],
    inRiver: (p) => p.z > RIVER.z1 + 0.15 && p.z < RIVER.z2 - 0.15,
    inField: (p) => p.z > FIELD.z1 && p.z < FIELD.z2,
    inPass: (p) => p.z > PASS.z1 && p.z <= PASS.z2,
    inCrater: (p) => Math.hypot(p.x - CRATER.x, p.z - CRATER.z) < CRATER.r + 1,
    onStone: (p) => stones.find((s) => s.walkable && Math.hypot(p.x - s.x, p.z - s.z) < s.r + 0.3) || null,
    onIsland: (p) => islands.find((s) => Math.hypot(p.x - s.x, p.z - s.z) < s.r + 0.25) || null,
    // hoe hoog staat de speler? (op een steen of eiland iets hoger)
    groundY(p) {
      const s = stones.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < q.r + 0.3);
      if (s && s.y > 0) return s.y;
      if (zone.onIsland(p)) return ISLAND_TOP;
      return 0;
    },
    get lavaHigh() { return flooding.hot; },
    // de lava begint weer rustig (als je binnenkomt)
    reset() { flooding.t = 0; for (const f of fireballs) { f.on = false; f.g.visible = false; } },
    applyState(vs) { for (const c of chests) { const o = vs.chests.includes(c.id); c.opened = o; c.k = o ? 1 : 0; c.lid.rotation.x = -1.9 * c.k; } },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      lavaTex.offset.set((t * 0.03) % 1, (t * 0.05) % 1);
      riverLight.intensity = 28 + Math.sin(t * 3) * 4;
      // springende stenen
      for (const s of stones) {
        const ph = stonePhase(s, t);
        let y = STONE_TOP, wob = 0;
        if (ph < 0.3) y = STONE_TOP - (ph / 0.3) * 1.0;               // zakken
        else if (ph < STONE_DOWN - 0.3) y = STONE_TOP - 1.0;          // weg
        else if (ph < STONE_DOWN) y = STONE_TOP - 1.0 + ((ph - (STONE_DOWN - 0.3)) / 0.3) * 1.0; // omhoog springen
        if (ph > STONE_CYCLE - STONE_WARN) wob = Math.sin(t * 40) * 0.08; // wiebelen: hij gaat zo zakken!
        s.y = y;
        s.walkable = ph >= STONE_DOWN - 0.1;
        s.m.position.set(s.x + wob, y - 0.25 + (ph >= STONE_DOWN - 0.3 && ph < STONE_DOWN + 0.25 ? Math.sin((ph - STONE_DOWN + 0.3) / 0.55 * Math.PI) * 0.35 : 0), s.z);
        s.ring.material.opacity = ph > STONE_CYCLE - STONE_WARN ? 0.4 + Math.abs(Math.sin(t * 14)) * 0.4 : 0;
      }
      // het lavaveld
      flooding.t = (flooding.t + dt) % FLOOD_CYCLE;
      const ft = flooding.t, F = FLOOD;
      let level = -0.5, phase = 'calm';
      if (ft < F.calm) phase = 'calm';
      else if (ft < F.calm + F.warn) phase = 'warn';
      else if (ft < F.calm + F.warn + F.rise) { phase = 'rise'; level = -0.5 + 0.6 * ((ft - F.calm - F.warn) / F.rise); }
      else if (ft < F.calm + F.warn + F.rise + F.high) { phase = 'high'; level = 0.1; }
      else { phase = 'drain'; level = 0.1 - 0.6 * ((ft - F.calm - F.warn - F.rise - F.high) / F.drain); }
      flooding.phase = phase;
      flooding.level = level;
      flooding.hot = level > 0.0;
      flood.position.y = level;
      fieldLight.intensity = phase === 'warn' ? 10 + Math.abs(Math.sin(t * 6)) * 20 : Math.max(0, (level + 0.5) * 60);
      crust.material.color.setHex(phase === 'warn' && Math.sin(t * 8) > 0 ? 0x7a2e1a : 0x4a2a22);
      for (const isl of islands) isl.ring.material.opacity = phase === 'warn' || phase === 'rise' || phase === 'high' ? 0.45 + Math.abs(Math.sin(t * 6)) * 0.4 : 0;
      for (const c of chests) { c.k += ((c.opened ? 1 : 0) - c.k) * Math.min(1, dt * 4); c.lid.rotation.x = -1.9 * c.k; }
    },
  };
  // de kaart
  zone.drawMap = (g, px, pz, scale) => {
    g.fillStyle = '#4a3b36';
    g.fillRect(px(B.minX), pz(B.minZ), W * scale, (B.maxZ - B.minZ) * scale);
    g.fillStyle = '#7a3324';
    g.fillRect(px(B.minX), pz(FIELD.z1), W * scale, (FIELD.z2 - FIELD.z1) * scale);
    g.fillStyle = '#ff7b00';
    g.fillRect(px(B.minX), pz(RIVER.z1), W * scale, (RIVER.z2 - RIVER.z1) * scale);
    g.fillStyle = '#8a7a72';
    for (const s of [...stones, ...islands]) { g.beginPath(); g.arc(px(s.x), pz(s.z), s.r * scale, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#2b2220';
    for (const b of boxes) g.fillRect(px(b.x - b.hw), pz(b.z - b.hd), b.hw * 2 * scale, b.hd * 2 * scale);
    for (const c of colliders) { if (c.r < 1) continue; g.beginPath(); g.arc(px(c.x), pz(c.z), c.r * scale, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#5c2e24';
    g.beginPath(); g.arc(px(CRATER.x), pz(CRATER.z), CRATER.r * scale, 0, Math.PI * 2); g.fill();
    for (const c of chests) { g.fillStyle = c.opened ? '#7a5c34' : '#ffc300'; g.fillRect(px(c.x) - 3, pz(c.z) - 3, 6, 6); }
  };
  return zone;
}

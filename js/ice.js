// De IJswereld (hoofdstuk 7, idee van Dex): wereld 5 van de schatkaart. Koud, glad en nog moeilijker dan onder water!
// Van de ingang (zuid) naar de IJsburcht (noord):
//   1. Het kamp: sneeuw en de eerste iglo.
//   2. Het IJsmeer: GLAD IJS (je glijdt door en kunt moeilijk stoppen!) met WAKKEN (gaten): plons, koud water!
//      Op het eiland staat een iglo met een schatkist.
//   3. De Sneeuwvlakte: SNEEUWPOPPEN gooien sneeuwballen (blauw rondje = daar landt hij). Dennenbomen en iglo's.
//   4. De Gletsjer: een glad pad tussen hoge ijsmuren. Er vallen IJSPEGELS (blauwe rondjes). Opzij is een ijsgrot.
//   5. De IJsburcht: een rond, glad ijsveld. Hier woont IJsdraak IJzel (zie dragon.js, ICE_DRAGON). Hij bewaakt stukje 5.
// SNEEUWSTORM: af en toe (eerst een waarschuwing!). Je ziet bijna niks, de wind duwt je terug en je wordt KOUD.
//   Schuil in een iglo of de ijsgrot: daar is het warm. Je warmte-meter (🔥) zie je linksboven.
// Overal springen IJSMONSTERS rond. Er staan 3 schatkisten. De Wolkenflitser mag hier niet komen (een auto glijdt niet, en vliegen is te makkelijk).
// Wil je iets verplaatsen? De belangrijkste plekken staan hieronder.
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, seeded } from './props.js';
import { makePortal } from './world.js';
import { instanced } from './optimize.js';

export const ICE_BOUNDS = { minX: -26, maxX: 26, minZ: -70, maxZ: 40 };
export const LAKE = { z1: 4, z2: 28 };                // het IJsmeer (over de hele breedte)
export const FIELD = { z1: -22, z2: 4 };              // de Sneeuwvlakte
export const GLACIER = { z1: -46, z2: -22, half: 8 }; // de Gletsjer (glad pad tussen ijsmuren)
export const ARENA = { x: 0, z: -57, r: 12 };         // de IJsburcht van de draak
export const ISLAND = { x: 17, z: 17, r: 4.6 };       // eiland in het meer (met een iglo)
// wakken in het ijs: [x, z, straal]
export const HOLES = [[-4, 24.5, 1.5], [8, 25, 1.3], [-16, 22, 1.8], [2, 19.5, 1.8], [-9, 16.5, 1.6], [-20, 12, 1.5], [5, 12.5, 1.7], [-3, 8.5, 1.5], [11, 7, 1.5], [-14, 6.5, 1.4], [21, 8, 1.3]];
// iglo's (schuilplekken): door = welke kant de deur op kijkt (0 = naar het zuiden, naar de camera)
export const IGLOOS = [{ id: 'kamp', x: -14, z: 33, door: 0.5 }, { id: 'eiland', x: ISLAND.x, z: ISLAND.z, door: -0.6 }, { id: 'west', x: -15, z: -6, door: 0.4 }, { id: 'oost', x: 13, z: -15, door: -0.3 }];
export const IGLOO_R = 2.9, IGLOO_IN = 2.3;
export const CAVE = { x1: -12, x2: -8, z1: -34.5, z2: -29.5 }; // de ijsgrot (een nis in de linker gletsjermuur)
export const ICE_GRIP = 1.3;     // hoe goed je grip hebt op glad ijs (klein = gladder). Op sneeuw: gewoon lopen
export const WARM_MAX = 10;      // seconden warmte in een sneeuwstorm (daarna wordt je koud: au!)
export const STORM = { calm: [30, 40], warn: 5, storm: 14 }; // seconden
export const CHESTS = [
  { id: 'ikist1', x: ISLAND.x + 0.6, z: ISLAND.z - 0.8, n: 20, igloo: true },
  { id: 'ikist2', x: 1.5, z: -20, n: 25 },
  { id: 'ikist3', x: -11, z: -32, n: 45, cave: true },
];

export function createIce(group) {
  const rand = seeded(2041);
  const B = ICE_BOUNDS;
  const W = B.maxX - B.minX;
  const colliders = [], boxes = [], updaters = [], talkables = [];

  // ---------- Sneeuw, met bergen buiten de rand ----------
  const groundGeo = new THREE.PlaneGeometry(160, 200, 64, 80).rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0, -15);
  const gp = groundGeo.attributes.position, colors = [];
  const cA = new THREE.Color(0xffffff), cB = new THREE.Color(0xeef6fc), cC = new THREE.Color(0xdcebf7), cRock = new THREE.Color(0x8fa3b3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const out = Math.max(B.minX - x, x - B.maxX, B.minZ - z, z - B.maxZ, 0);
    let y = 0;
    if (out > 1.5) y = Math.min(26, (out - 1.5) * 1.8) * (0.6 + rand() * 0.6);
    const r = rand(), c = out > 9 && r < 0.35 ? cRock : r < 0.4 ? cA : r < 0.75 ? cB : cC;
    colors.push(c.r, c.g, c.b);
    gp.setY(i, y);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- Glad ijs (blauw en glimmend) ----------
  const iceM = mat(0xbfe6ff, { roughness: 0.12, metalness: 0.1, emissive: 0x0b3a5c, emissiveIntensity: 0.12 });
  const icePlane = (x, z, w, d) => { const m = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), iceM, x, 0.03, z, group); m.castShadow = false; return m; };
  icePlane(0, (LAKE.z1 + LAKE.z2) / 2, W + 2, LAKE.z2 - LAKE.z1);
  icePlane(0, (GLACIER.z1 + GLACIER.z2) / 2, GLACIER.half * 2, GLACIER.z2 - GLACIER.z1);
  const arenaIce = mesh(new THREE.CircleGeometry(ARENA.r + 0.6, 40).rotateX(-Math.PI / 2), iceM, ARENA.x, 0.04, ARENA.z, group);
  arenaIce.castShadow = false;
  // scheurtjes in het ijs
  const crackM = new THREE.MeshBasicMaterial({ color: 0x7fb8db, transparent: true, opacity: 0.6, depthWrite: false });
  const cracks = [];
  for (let i = 0; i < 46; i++) {
    const onLake = i < 30;
    const x = onLake ? B.minX + rand() * W : (rand() - 0.5) * GLACIER.half * 1.8;
    const z = onLake ? LAKE.z1 + rand() * (LAKE.z2 - LAKE.z1) : GLACIER.z1 + rand() * (GLACIER.z2 - GLACIER.z1);
    cracks.push({ x, y: 0.045, z, sx: 1, sz: 0.6 + rand() * 1.8, ry: rand() * 3 });
  }
  instanced(group, new THREE.PlaneGeometry(0.06, 1).rotateX(-Math.PI / 2), crackM, cracks, { cast: false, receive: false });
  // de rand van het meer: een randje sneeuw
  for (const z of [LAKE.z1, LAKE.z2]) mesh(new THREE.BoxGeometry(W + 2, 0.12, 0.5), mat(0xffffff, { roughness: 1 }), 0, 0.06, z, group).castShadow = false;

  // ---------- Wakken (gaten in het ijs met ijskoud water) ----------
  const waterM = mat(0x0b4f8a, { roughness: 0.2, emissive: 0x062c4f, emissiveIntensity: 0.4 });
  const holes = HOLES.map(([x, z, r]) => {
    const w = mesh(new THREE.CircleGeometry(r, 16).rotateX(-Math.PI / 2), waterM, x, 0.06, z, group);
    w.castShadow = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.35, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.position.set(x, 0.07, z);
    group.add(ring);
    return { x, z, r, ring };
  });
  const chunkList = [];
  for (const h of holes) for (let a = 0; a < Math.PI * 2; a += 0.7) chunkList.push({ x: h.x + Math.cos(a) * (h.r + 0.2), y: 0.08, z: h.z + Math.sin(a) * (h.r + 0.2), s: 0.18 + rand() * 0.14, ry: rand() * 3, rx: rand() });
  instanced(group, new THREE.DodecahedronGeometry(1, 0), mat(0xe7f5ff, { roughness: 0.3, flatShading: true }), chunkList);

  // ---------- Het eiland in het meer ----------
  mesh(new THREE.CylinderGeometry(ISLAND.r, ISLAND.r + 0.4, 0.12, 20), mat(0xffffff, { roughness: 1, flatShading: true }), ISLAND.x, 0.05, ISLAND.z, group);

  // ---------- Rotsen met sneeuw ----------
  const rocks = [], caps = [];
  const addRock = (x, z, s) => {
    rocks.push({ x, y: s * 0.45, z, s, ry: rand() * 6, rx: rand() * 0.3 });
    caps.push({ x, y: s * 0.95, z, sx: s * 0.8, sy: s * 0.3, sz: s * 0.8, ry: rand() * 6 });
    colliders.push({ x, z, r: s * 0.85 });
  };
  for (const [x, z, s] of [[-22, 37, 1.6], [21, 35, 1.4], [8, 37, 1.1], [-24, 27, 1.2], [24, 22, 1.3], [-23, 16, 1.1], [24, 2, 1.4], [-24, -1, 1.2], [-6, -8, 1.0], [21, -20, 1.3]]) addRock(x, z, s);

  // ---------- Dennenbomen met sneeuw (Sneeuwvlakte en kamp) ----------
  const trunks = [], leaves = [], snowTops = [];
  const avoid = [...IGLOOS.map((g) => ({ x: g.x, z: g.z, r: IGLOO_R + 2.5 })), { x: 0, z: 0, r: 0 }];
  const SNOWMEN = [[-9, -1], [9, -3], [-3, -12], [17, -8], [-18, -15], [6, -19]];
  for (const [x, z] of SNOWMEN) avoid.push({ x, z, r: 3 });
  avoid.push({ x: CHESTS[1].x, z: CHESTS[1].z, r: 2.5 });
  const tree = (x, z, s) => {
    trunks.push({ x, y: 0.5 * s, z, s });
    for (let k = 0; k < 3; k++) {
      leaves.push({ x, y: (1.2 + k * 0.9) * s, z, sx: (1.6 - k * 0.4) * s, sy: 1.3 * s, sz: (1.6 - k * 0.4) * s, ry: rand() * 3 });
      snowTops.push({ x, y: (1.55 + k * 0.9) * s, z, sx: (1.05 - k * 0.27) * s, sy: 0.55 * s, sz: (1.05 - k * 0.27) * s, ry: rand() * 3 });
    }
    colliders.push({ x, z, r: 0.55 * s });
  };
  let tries = 0, made = 0;
  while (made < 34 && tries++ < 600) {
    const x = B.minX + 1.5 + rand() * (W - 3), z = FIELD.z1 + 1 + rand() * (FIELD.z2 - FIELD.z1 - 2);
    if (Math.abs(x) < 3.5) continue; // het middenpad vrij
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r + 1.2)) continue;
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1.6)) continue;
    tree(x, z, 0.85 + rand() * 0.45); made++;
  }
  for (const [x, z, s] of [[-20, 30, 1.1], [-23, 34, 0.9], [19, 30, 1.2], [23, 38, 1], [-8, 38, 0.9], [13, 38, 1]]) tree(x, z, s);
  instanced(group, new THREE.CylinderGeometry(0.18, 0.24, 1, 6), mat(0x6b4f3a), trunks);
  instanced(group, new THREE.ConeGeometry(1, 1, 7), mat(0x2b6a4f, { flatShading: true }), leaves);
  instanced(group, new THREE.ConeGeometry(1, 1, 7), mat(0xffffff, { flatShading: true, roughness: 1 }), snowTops, { cast: false });

  // ---------- Iglo's (schuilplekken) ----------
  const blockM = mat(0xf8fbff, { roughness: 0.6, flatShading: true });
  const igloos = IGLOOS.map((ig) => {
    const g = new THREE.Group();
    g.position.set(ig.x, 0, ig.z);
    g.rotation.y = ig.door;
    group.add(g);
    const domeM = blockM.clone(); domeM.transparent = true;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(IGLOO_R, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), domeM);
    dome.castShadow = true; dome.receiveShadow = true; g.add(dome);
    // lijntjes tussen de sneeuwblokken
    const lineM = domeM.clone(); lineM.color.set(0xc9dceb);
    for (let k = 1; k <= 3; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(IGLOO_R * Math.cos(k * 0.38) + 0.01, 0.03, 3, 24), lineM);
      ring.rotation.x = Math.PI / 2; ring.position.y = IGLOO_R * Math.sin(k * 0.38); g.add(ring);
    }
    // het tunneltje naar de deur (een halve buis)
    const tun = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.6, 10, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), domeM);
    tun.material.side = THREE.DoubleSide;
    tun.position.set(0, 0, IGLOO_R + 0.3); tun.castShadow = true;
    g.add(tun);
    const doorHole = new THREE.Mesh(new THREE.CircleGeometry(0.95, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x1b3a55 }));
    doorHole.position.set(0, 0.02, IGLOO_R + 1.12); g.add(doorHole);
    // binnen: een warm lampje
    const light = new THREE.PointLight(0xffc078, 9, 6, 1.5); light.position.set(0, 1.4, 0); g.add(light);
    const rug = mesh(new THREE.CircleGeometry(1.4, 14).rotateX(-Math.PI / 2), mat(0xe8590c), 0, 0.05, 0, g); rug.castShadow = false;
    // botsen: een kring van sneeuw, met een opening bij de deur
    const cos = Math.cos(ig.door), sin = Math.sin(ig.door);
    const toWorld = (lx, lz) => ({ x: ig.x + lx * cos + lz * sin, z: ig.z - lx * sin + lz * cos });
    for (let a = 0; a < Math.PI * 2; a += 0.32) {
      let d = a; if (d > Math.PI) d -= Math.PI * 2;
      if (Math.abs(d) < 0.55) continue; // de deur (a = 0 is lokaal +z)
      const w = toWorld(Math.sin(a) * IGLOO_R, Math.cos(a) * IGLOO_R);
      colliders.push({ x: w.x, z: w.z, r: 0.5 });
    }
    for (const sx of [-1.15, 1.15]) for (const lz of [IGLOO_R + 0.2, IGLOO_R + 0.9]) { const w = toWorld(sx, lz); colliders.push({ x: w.x, z: w.z, r: 0.3 }); }
    return { ...ig, g, domeM, lineM, k: 1 };
  });

  // ---------- De Gletsjer: hoge ijsmuren, met een ijsgrot in de linkermuur ----------
  const wallM = mat(0x9fd3f5, { roughness: 0.25, metalness: 0.05, flatShading: true, emissive: 0x0b3a5c, emissiveIntensity: 0.15 });
  const WALL_H = 5.5;
  const wall = (x1, x2, z1, z2, h = WALL_H) => {
    boxes.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, hw: (x2 - x1) / 2, hd: (z2 - z1) / 2 });
    return mesh(new THREE.BoxGeometry(x2 - x1, h, z2 - z1), wallM, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, group);
  };
  const G = GLACIER, OUT = 32;
  wall(G.half, OUT, G.z1 - 2, G.z2);                      // rechts
  wall(-OUT, -G.half, CAVE.z2, G.z2);                      // links (voor de grot)
  wall(-OUT, CAVE.x1, CAVE.z1, CAVE.z2);                   // achter de grot
  wall(-OUT, -G.half, G.z1 - 2, CAVE.z1);                  // links (na de grot)
  // het dak van de ijsgrot (wordt doorzichtig als je erin staat)
  const caveRoofM = wallM.clone(); caveRoofM.transparent = true;
  const caveRoof = mesh(new THREE.BoxGeometry(CAVE.x2 - CAVE.x1 + 0.6, 0.6, CAVE.z2 - CAVE.z1 + 0.4), caveRoofM, (CAVE.x1 + CAVE.x2) / 2 + 0.3, 3.3, (CAVE.z1 + CAVE.z2) / 2, group);
  const caveLight = new THREE.PointLight(0xffc078, 9, 6, 1.5); caveLight.position.set((CAVE.x1 + CAVE.x2) / 2, 1.6, (CAVE.z1 + CAVE.z2) / 2); group.add(caveLight);
  // ijspegels aan de muren (alleen om te zien)
  const icicles = [];
  for (let z = G.z2 - 0.5; z > G.z1 - 1.5; z -= 0.9) for (const s of [-1, 1]) {
    if (s < 0 && z < CAVE.z2 && z > CAVE.z1) continue;
    icicles.push({ x: s * (G.half + 0.15), y: WALL_H - 0.6 - rand() * 0.6, z, sx: 0.25, sy: 1 + rand() * 1.2, sz: 0.25, rx: Math.PI });
  }
  instanced(group, new THREE.ConeGeometry(1, 1, 4), mat(0xe7f5ff, { roughness: 0.2, emissive: 0x4dabf7, emissiveIntensity: 0.2 }), icicles, { cast: false });
  // ijskristallen op de muren
  const crystals = [];
  for (let i = 0; i < 26; i++) {
    const s = rand() < 0.5 ? -1 : 1;
    crystals.push({ x: s * (G.half + 0.8 + rand() * 4), y: WALL_H + 0.3, z: G.z1 - 1 + rand() * (G.z2 - G.z1), s: 0.5 + rand() * 0.9, rx: (rand() - 0.5) * 0.5, ry: rand() * 3 });
  }
  instanced(group, new THREE.OctahedronGeometry(1, 0), mat(0x74c0fc, { roughness: 0.1, emissive: 0x1c7ed6, emissiveIntensity: 0.35, flatShading: true }), crystals);

  // ---------- De IJsburcht: een ring van ijsblokken, opening aan de zuidkant ----------
  const ringBlocks = [];
  for (let a = 0; a < Math.PI * 2; a += 0.14) {
    const x = ARENA.x + Math.sin(a) * (ARENA.r + 1.2), z = ARENA.z + Math.cos(a) * (ARENA.r + 1.2);
    if (Math.abs(x - ARENA.x) < 3.5 && z > ARENA.z) continue;
    const h = 3 + rand() * 2.5;
    ringBlocks.push({ x, y: h / 2, z, sx: 1.9, sy: h, sz: 1.9, ry: -a, rx: 0 });
    colliders.push({ x, z, r: 1.15 });
  }
  instanced(group, new THREE.BoxGeometry(1, 1, 1), wallM, ringBlocks);
  // torens bij de ingang, met een vlaggetje
  for (const sx of [-4.6, 4.6]) {
    const tz = ARENA.z + ARENA.r + 1.0;
    mesh(new THREE.CylinderGeometry(1.1, 1.3, 7, 8), wallM, sx, 3.5, tz, group);
    mesh(new THREE.ConeGeometry(1.4, 2, 8), mat(0x1c7ed6), sx, 8, tz, group);
    colliders.push({ x: sx, z: tz, r: 1.3 });
  }
  // ijspilaren in de burcht (verstoppen voor de ijsadem!)
  const PILLARS = [[-6.5, -52], [6.5, -52], [-6.5, -62], [6.5, -62]];
  for (const [x, z] of PILLARS) {
    mesh(new THREE.CylinderGeometry(0.85, 1.0, 4.2, 6), wallM, x, 2.1, z, group);
    mesh(new THREE.OctahedronGeometry(0.7, 0), mat(0x74c0fc, { emissive: 0x1c7ed6, emissiveIntensity: 0.5 }), x, 4.8, z, group);
    colliders.push({ x, z, r: 1.0 });
  }
  const arenaLight = new THREE.PointLight(0x74c0fc, 18, 26, 1.3);
  arenaLight.position.set(ARENA.x, 7, ARENA.z);
  group.add(arenaLight);
  instanced(group, new THREE.DodecahedronGeometry(1, 0), mat(0x7d8b96, { roughness: 1, flatShading: true }), rocks);
  instanced(group, new THREE.SphereGeometry(1, 8, 5), mat(0xffffff, { roughness: 1 }), caps, { cast: false });

  // ---------- IJspegels die naar beneden vallen (Gletsjer, en de draak laat ze ook vallen) ----------
  // Eerst een blauw rondje op de grond, dan valt er een ijspegel. Wie in het rondje staat: au!
  const FB_R = 1.4, FB_T = 1.25;
  const pegM = mat(0xe7f5ff, { roughness: 0.15, emissive: 0x4dabf7, emissiveIntensity: 0.4 });
  const pegGeo = new THREE.ConeGeometry(0.4, 1.8, 5).rotateX(Math.PI);
  const warnGeo = new THREE.RingGeometry(FB_R - 0.22, FB_R, 22).rotateX(-Math.PI / 2), fillGeo = new THREE.CircleGeometry(FB_R, 22).rotateX(-Math.PI / 2);
  const pegs = [];
  const icicle = (x, z, T = FB_T) => {
    let f = pegs.find((b) => !b.on);
    if (!f) {
      if (pegs.length >= 18) return null;
      const g = new THREE.Group();
      const b = new THREE.Mesh(pegGeo, pegM); b.castShadow = true;
      const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0x1c7ed6, transparent: true, opacity: 0.8, depthWrite: false }));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0x4dabf7, transparent: true, opacity: 0.28, depthWrite: false }));
      g.add(b, warn, fill);
      group.add(g);
      f = { g, b, warn, fill };
      pegs.push(f);
    }
    f.x = Math.max(B.minX + 1, Math.min(B.maxX - 1, x)); f.z = Math.max(B.minZ + 1, Math.min(B.maxZ - 1, z));
    f.t = 0; f.T = T; f.on = true; f.g.visible = true;
    f.warn.position.set(f.x, 0.09, f.z); f.fill.position.set(f.x, 0.08, f.z);
    return f;
  };
  updaters.push((t, dt) => {
    for (const f of pegs) {
      if (!f.on) continue;
      f.t += dt;
      const k = Math.min(1, f.t / f.T);
      f.b.position.set(f.x, 15 * (1 - k * k) + 0.9, f.z);
      f.fill.scale.setScalar(Math.max(0.05, k));
      f.warn.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
      if (k >= 1) { f.on = false; f.g.visible = false; zone.onImpact?.(f.x, f.z, FB_R); }
    }
  });

  // ---------- Schatkisten ----------
  const chestM = mat(0x8b5a2b), bandM = mat(0x74c0fc, { metalness: 0.4 });
  const chests = CHESTS.map((c) => {
    const g = new THREE.Group();
    const s = c.cave ? 1.3 : 1;
    mesh(new THREE.BoxGeometry(1.0 * s, 0.6 * s, 0.7 * s), chestM, 0, 0.3 * s, 0, g);
    mesh(new THREE.BoxGeometry(1.05 * s, 0.08 * s, 0.75 * s), bandM, 0, 0.45 * s, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.6 * s, -0.35 * s); g.add(lid);
    mesh(new THREE.BoxGeometry(1.0 * s, 0.25 * s, 0.7 * s), chestM, 0, 0.12 * s, 0.35 * s, lid);
    mesh(new THREE.BoxGeometry(0.16 * s, 0.18 * s, 0.06 * s), bandM, 0, 0.05 * s, 0.72 * s, lid);
    g.position.set(c.x, 0, c.z);
    group.add(g);
    colliders.push({ x: c.x, z: c.z, r: 0.5 * s });
    return { ...c, g, lid, opened: false, k: 0 };
  });

  // ---------- Ingang: portaal terug naar de woestijn en een bord ----------
  const portal = makePortal(group, 0, B.maxZ - 2.2, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  talkables.push(makeSignpost(group, {
    id: 'bord-ijs', x: 5.2, z: B.maxZ - 7.5, title: 'IJSWERELD', color: '#1c7ed6',
    lines: [
      'DE IJSWERELD',
      'Achterin, in de IJsburcht, woont IJsdraak IJzel. Hij bewaakt stukje 5 van de schatkaart!',
      'Op het ijs is het GLAD: je glijdt door en kunt moeilijk stoppen. Pas op voor de wakken in het IJsmeer!',
      'Komt er een SNEEUWSTORM? Schuil in een iglo of in de ijsgrot, anders word je koud. Let op je warmte-meter 🔥.',
      'Sneeuwpoppen gooien sneeuwballen: blauw rondje? Wegwezen! En in de Gletsjer vallen ijspegels.',
    ],
  }));

  // ---------- Sneeuw (en de sneeuwstorm) ----------
  const N = 1500, AREA = 44, TOP = 9;
  const snowPos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) seeds.push({ x: (Math.random() - 0.5) * AREA, y: Math.random() * TOP, z: (Math.random() - 0.5) * AREA, sp: 0.6 + Math.random() * 0.8 });
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.7, depthWrite: false }));
  snow.frustumCulled = false;
  group.add(snow);
  const storm = { phase: 'calm', t: 25, k: 0, wind: { x: 0.25, z: 1 } };
  const setWind = () => { const a = (Math.random() - 0.5) * 0.9; storm.wind = { x: Math.sin(a), z: Math.cos(a) }; }; // de wind waait je TERUG (naar de ingang)
  const startStorm = (dur = STORM.storm) => { storm.phase = 'storm'; storm.t = dur; setWind(); };
  const warnStorm = (dur = STORM.warn) => { storm.phase = 'warn'; storm.t = dur; setWind(); };
  const stopStorm = (next = STORM.calm[0] + Math.random() * (STORM.calm[1] - STORM.calm[0])) => { storm.phase = 'calm'; storm.t = next; };

  // ---------- Zone ----------
  const inCircle = (p, c, r) => Math.hypot(p.x - c.x, p.z - c.z) < r;
  const inArena = (p) => inCircle(p, ARENA, ARENA.r + 0.6);
  const inGlacier = (p) => p.z > G.z1 && p.z < G.z2 && Math.abs(p.x) < G.half + 0.2;
  const onLake = (p) => p.z > LAKE.z1 && p.z < LAKE.z2 && !inCircle(p, ISLAND, ISLAND.r);
  const inIgloo = (p) => igloos.find((g) => inCircle(p, g, IGLOO_IN)) || null;
  const inCave = (p) => p.x > CAVE.x1 - 0.2 && p.x < CAVE.x2 - 0.3 && p.z > CAVE.z1 && p.z < CAVE.z2;
  const zone = {
    id: 'ijs', name: 'De IJswereld', group, colliders, boxes, talkables, npcs: [],
    bounds: { ...B },
    music: 'ijs',
    env: { sky: [0x7fb8e6, 0xeaf6ff], fog: [0xdceefa, 30, 88], hemi: [0xffffff, 0x9cc3dd, 1.25], sun: [0xffffff, 2.3], cam: [0, 10, 11] },
    stormFog: [0xeef5fb, 3, 17],
    spawns: { fromWoestijn: { x: 0, z: B.maxZ - 5.5, rot: Math.PI } },
    exit: { x: 0, z: B.maxZ - 2.0 },
    chests, holes, igloos, cave: CAVE, arena: ARENA, storm, startStorm, stopStorm, warnStorm,
    fireball: icicle, icicle, pegs,
    boss: { x: ARENA.x, z: ARENA.z - 2 },
    focus: { x: 0, z: 0 },
    heartSpots: [{ x: -12, z: 30 }, { x: 0, z: -21.5 }, { x: -9.5, z: -30.6 }, { x: -2, z: -44 }, { x: 2, z: -44 }],
    snowmanSpots: SNOWMEN.map(([x, z]) => ({ x, z })),
    slimeSpots: [[-8, 21], [9, 19], [-13, 12], [12, 11], [0, 5.5], [4, -6], [-12, -12], [11, -11], [-3, -27], [4, -32], [-2, -38], [3, -43]].map(([x, z]) => ({ x, z, kind: 'ijs' })),
    labels: [
      { x: 0, z: B.maxZ - 4, text: 'Kamp' }, { x: -10, z: (LAKE.z1 + LAKE.z2) / 2, text: 'IJsmeer' }, { x: 0, z: (FIELD.z1 + FIELD.z2) / 2, text: 'Sneeuwvlakte' },
      { x: 0, z: (G.z1 + G.z2) / 2 + 4, text: 'Gletsjer' }, { x: -10, z: CAVE.z1 - 1.5, text: 'IJsgrot' }, { x: 0, z: ARENA.z, text: 'IJsburcht' },
      ...IGLOOS.map((g) => ({ x: g.x, z: g.z + 3.4, text: 'Iglo' })),
    ],
    inArena, inGlacier, onLake, inIgloo, inCave,
    // glad ijs? (meer, gletsjer en de burcht; op sneeuw en op het eiland niet)
    slipAt: (p) => onLake(p) || inGlacier(p) || inArena(p),
    // in een wak gestapt?
    inHole: (p) => holes.find((h) => Math.hypot(p.x - h.x, p.z - h.z) < h.r - 0.15) || null,
    nearHole: (p, extra = 0.6) => holes.some((h) => Math.hypot(p.x - h.x, p.z - h.z) < h.r + extra),
    // schuilen voor de sneeuwstorm (iglo of ijsgrot)
    inShelter: (p) => !!(inIgloo(p) || inCave(p)),
    get stormOn() { return storm.phase === 'storm'; },
    reset() { for (const f of pegs) { f.on = false; f.g.visible = false; } storm.k = 0; stopStorm(22 + Math.random() * 8); },
    applyState(st) { for (const c of chests) { const o = st.chests.includes(c.id); c.opened = o; c.k = o ? 1 : 0; c.lid.rotation.x = -1.9 * c.k; } },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      const f = zone.focus;
      // de sneeuwstorm komt en gaat vanzelf (in de IJsburcht begint er geen nieuwe)
      storm.t -= storm.phase === 'calm' && inArena(f) ? 0 : dt;
      if (storm.t <= 0) { if (storm.phase === 'calm') warnStorm(); else if (storm.phase === 'warn') startStorm(); else stopStorm(); }
      const goal = storm.phase === 'storm' ? 1 : storm.phase === 'warn' ? 0.18 : 0;
      storm.k += (goal - storm.k) * Math.min(1, dt * 0.9);
      // sneeuwvlokjes rond de speler (in de storm: heel veel en heel snel)
      const k = storm.k, w = storm.wind;
      snow.material.opacity = 0.55 + k * 0.4;
      snow.material.size = 0.2 + k * 0.12;
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        s.y -= (0.7 + k * 2.5) * s.sp * dt;
        s.x += (Math.sin(t * 0.7 + i) * 0.3 + w.x * 20 * k) * s.sp * dt;
        s.z += (w.z * 20 * k) * s.sp * dt;
        if (s.y < 0) s.y += TOP;
        const rx = ((s.x - f.x) % AREA + AREA * 1.5) % AREA - AREA / 2;
        const rz = ((s.z - f.z) % AREA + AREA * 1.5) % AREA - AREA / 2;
        snowPos[i * 3] = f.x + rx; snowPos[i * 3 + 1] = s.y; snowPos[i * 3 + 2] = f.z + rz;
      }
      snowGeo.attributes.position.needsUpdate = true;
      // iglo's en het grotdak worden doorzichtig als je erin (of erachter) staat
      for (const g of igloos) {
        const near = Math.hypot(f.x - g.x, f.z - g.z) < IGLOO_R + 0.8 || (f.z < g.z && f.z > g.z - IGLOO_R - 2 && Math.abs(f.x - g.x) < IGLOO_R);
        g.k += ((near ? 0.28 : 1) - g.k) * Math.min(1, dt * 8);
        g.domeM.opacity = g.k; g.lineM.opacity = g.k; g.domeM.depthWrite = g.k > 0.9;
      }
      const inC = inCave(f) || (f.z < CAVE.z2 + 1 && f.z > CAVE.z1 - 3 && f.x < CAVE.x2 + 1 && f.x > CAVE.x1 - 1);
      caveRoofM.opacity += ((inC ? 0.25 : 1) - caveRoofM.opacity) * Math.min(1, dt * 8);
      for (const h of holes) h.ring.material.opacity = 0.7 + Math.sin(t * 2 + h.x) * 0.2;
      arenaLight.intensity = 16 + Math.sin(t * 1.5) * 4;
      for (const c of chests) { c.k += ((c.opened ? 1 : 0) - c.k) * Math.min(1, dt * 4); c.lid.rotation.x = -1.9 * c.k; }
    },
  };
  // de kaart
  zone.drawMap = (g, px, pz, scale) => {
    g.fillStyle = '#f1f7fc';
    g.fillRect(px(B.minX), pz(B.minZ), W * scale, (B.maxZ - B.minZ) * scale);
    g.fillStyle = '#a5d8ff';
    g.fillRect(px(B.minX), pz(LAKE.z1), W * scale, (LAKE.z2 - LAKE.z1) * scale);
    g.fillRect(px(-G.half), pz(G.z1), G.half * 2 * scale, (G.z2 - G.z1) * scale);
    g.beginPath(); g.arc(px(ARENA.x), pz(ARENA.z), ARENA.r * scale, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(px(ISLAND.x), pz(ISLAND.z), ISLAND.r * scale, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0b4f8a';
    for (const h of holes) { g.beginPath(); g.arc(px(h.x), pz(h.z), h.r * scale, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#4d8fbf';
    for (const b of boxes) g.fillRect(px(b.x - b.hw), pz(b.z - b.hd), b.hw * 2 * scale, b.hd * 2 * scale);
    g.fillStyle = '#2b6a4f';
    for (const c of colliders) { if (c.r < 0.45 || c.r > 0.95) continue; g.beginPath(); g.arc(px(c.x), pz(c.z), Math.max(2, c.r * scale), 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#4d8fbf';
    for (const b of ringBlocks) { g.beginPath(); g.arc(px(b.x), pz(b.z), 1.1 * scale, 0, Math.PI * 2); g.fill(); }
    for (const ig of igloos) { g.fillStyle = '#ffffff'; g.strokeStyle = '#74c0fc'; g.lineWidth = 2; g.beginPath(); g.arc(px(ig.x), pz(ig.z), IGLOO_R * scale, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = '#ffd8a8';
    g.fillRect(px(CAVE.x1), pz(CAVE.z1), (CAVE.x2 - CAVE.x1) * scale, (CAVE.z2 - CAVE.z1) * scale);
    for (const c of chests) { g.fillStyle = c.opened ? '#7a5c34' : '#ffc300'; g.fillRect(px(c.x) - 3, pz(c.z) - 3, 6, 6); }
  };
  return zone;
}

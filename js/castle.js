// Het Spookkasteel (hoofdstuk 8, idee van Dex): wereld 6 van de schatkaart. Spannend (maar niet eng) en nog moeilijker dan de ijswereld!
// Van de ingang (zuid) naar de troonzaal (noord):
//   1. Het Voorplein: een kerkhofje met pompoenen. Hier ligt de GROENE SLEUTEL. De groene poort gaat open met die sleutel.
//   2. De Grote Hal: RIDDERS (lege harnassen) lopen heen en weer, en er zijn VALLUIKEN met pinnen (eerst rood, dan: au!).
//      Achterin zijn 3 deuren: links een boog naar de Bibliotheek, rechts de RODE deur (Kerker), in het midden de GOUDEN deur.
//   3. De Bibliotheek: hier ligt de RODE SLEUTEL. Eén boekenkast is een GEHEIME DEUR (er steekt een boek uit...).
//      Daarachter: de Geheime Kamer met een grote schatkist en HENDEL 1.
//   4. De Kerker (achter de rode deur): tralies, een ridder, valluiken, een schatkist en HENDEL 2.
//   5. De Wapenzaal (achter de gouden deur, die gaat open als BEIDE hendels omlaag zijn): nog een ridder en nog meer valluiken.
//   6. De Troonzaal: hier woont Spookkoning Sjaak (zie ghostking.js). Hij bewaakt stukje 6.
// Overal zweven SPOKEN (ghosts.js): die vliegen dwars door muren heen! Spookje Pip bij de ingang helpt je.
// De Wolkenflitser mag hier niet komen (dan vlieg je over de puzzel heen).
// Wil je iets verplaatsen? De belangrijkste plekken staan hieronder.
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, seeded } from './props.js';
import { makePortal } from './world.js';
import { instanced } from './optimize.js';
import { difficulty } from './difficulty.js';

export const CASTLE_BOUNDS = { minX: -22, maxX: 22, minZ: -62, maxZ: 36 };
export const COURT = { z1: 20, z2: 36 };                    // het Voorplein
export const HALL = { x1: -22, x2: 22, z1: 0, z2: 20 };      // de Grote Hal
export const LIBRARY = { x1: -22, x2: -8, z1: -24, z2: 0 };  // de Bibliotheek
export const ARMORY = { x1: -8, x2: 8, z1: -24, z2: 0 };     // de Wapenzaal
export const DUNGEON = { x1: 8, x2: 22, z1: -24, z2: 0 };    // de Kerker
export const SECRET = { x1: -22, x2: -13, z1: -36, z2: -24 }; // de Geheime Kamer
export const THRONE = { x1: -13, x2: 13, z1: -62, z2: -24 }; // de Troonzaal
export const ARENA = { x: 0, z: -45, r: 12 };                // waar je tegen de spookkoning vecht
export const WALL_H = 3.0;
// deuren: met een sleutel (key), met de hendels (levers) of geheim (de boekenkast)
export const DOORS = [
  { id: 'groen', x: 0, z: 20, hw: 2.5, color: 0x2f9e44, key: 'groen', name: 'groene poort' },
  { id: 'rood', x: 15, z: 0, hw: 2, color: 0xe03131, key: 'rood', name: 'rode deur' },
  { id: 'goud', x: 0, z: 0, hw: 2, color: 0xffc300, levers: true, name: 'gouden deur' },
  { id: 'geheim', x: -15, z: -24, hw: 2, color: 0x7a4b2a, shelf: true, name: 'boekenkast' },
];
export const KEYS = [
  { id: 'groen', x: -17, z: 23.5, color: 0x40c057, name: 'groene sleutel' }, // achter de grafstenen
  { id: 'rood', x: -11, z: -20, color: 0xff6b6b, name: 'rode sleutel' },      // in de bibliotheek
];
export const LEVERS = [
  { id: 'west', x: -17, z: -34.8, name: 'Hendel 1', room: 'de Geheime Kamer' },
  { id: 'oost', x: 21.1, z: -21, name: 'Hendel 2', room: 'de Kerker' },
];
export const LEVER_IDS = LEVERS.map((l) => l.id);
export const CHESTS = [
  { id: 'skist1', x: 19, z: 33, n: 25 },
  { id: 'skist2', x: -20, z: -27, n: 60, big: true }, // in de Geheime Kamer
  { id: 'skist3', x: 10, z: -21.5, n: 35 },
];
// ridders: lopen heen en weer tussen a en b
export const KNIGHTS = [
  { a: [-19, 14], b: [19, 14], speed: 2.3 },
  { a: [19, 6], b: [-19, 6], speed: 2.6 },
  { a: [15.5, -3], b: [15.5, -20], speed: 2.4 },
  { a: [-6, -12], b: [6, -12], speed: 2.5 },
];
// valluiken met pinnen: g = groep (0 en 1 gaan om de beurt omhoog)
const TRAP_S = 2.4;
export const TRAPS = [];
for (let i = 0; i < 17; i++) TRAPS.push({ x: -19.2 + i * TRAP_S, z: 10, g: i % 2 });          // Grote Hal: een hele rij
for (const [i, x] of [10.2, 12.6, 15.0, 17.4].entries()) TRAPS.push({ x, z: -11, g: i % 2 }); // Kerker
for (const [i, x] of [-4.8, -2.4, 0, 2.4, 4.8].entries()) { TRAPS.push({ x, z: -6.5, g: i % 2 }); TRAPS.push({ x, z: -18, g: (i + 1) % 2 }); } // Wapenzaal
export const TRAP_T = { period: 3.2, warn: 1.2, up: 2.0, down: 3.0 }; // seconden: veilig, rood (pas op!), pinnen omhoog, weer omlaag
export const GHOST_SPOTS = [[-8, 29], [9, 25], [-12, 8], [12, 16], [0, 3], [-18, -8], [-11, -15], [18, -6], [12, -15], [-5, -21], [5, -3], [-17, -30]];

export function createCastle(group) {
  const rand = seeded(2066);
  const B = CASTLE_BOUNDS;
  const colliders = [], boxes = [], updaters = [], talkables = [];
  const walls = []; // { m, x1, x2, z1, z2 } (worden doorzichtig als ze tussen jou en de camera staan)

  // ---------- Grond: gras op het voorplein, stenen vloer binnen ----------
  const outside = mesh(new THREE.PlaneGeometry(160, 200).rotateX(-Math.PI / 2), mat(0x1d1a2b, { roughness: 1 }), 0, -0.02, -15, group);
  outside.castShadow = false;
  const grassGeo = new THREE.PlaneGeometry(B.maxX - B.minX + 6, COURT.z2 - COURT.z1 + 8, 22, 6).rotateX(-Math.PI / 2);
  const gc = [], gpos = grassGeo.attributes.position;
  for (let i = 0; i < gpos.count; i++) { const r = rand(); const c = new THREE.Color(r < 0.4 ? 0x2f4a33 : r < 0.75 ? 0x36553a : 0x29402d); gc.push(c.r, c.g, c.b); }
  grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
  const grass = mesh(grassGeo, mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 }), 0, 0, (COURT.z1 + COURT.z2) / 2 + 2, group);
  grass.castShadow = false;
  // de stenen vloer (een dambord van grijspaarse tegels)
  const FX = B.maxX - B.minX, FZ = COURT.z1 - B.minZ;
  const floorGeo = new THREE.PlaneGeometry(FX, FZ, FX / 2, FZ / 2).toNonIndexed().rotateX(-Math.PI / 2);
  const fc = [], fpos = floorGeo.attributes.position;
  for (let i = 0; i < fpos.count; i += 6) {
    const r = rand(), c = new THREE.Color(r < 0.5 ? 0x5a5470 : r < 0.85 ? 0x4e4863 : 0x635c7a);
    for (let k = 0; k < 6; k++) fc.push(c.r, c.g, c.b);
  }
  floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  const floor = mesh(floorGeo, mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 0.95 }), 0, 0.01, (COURT.z1 + B.minZ) / 2, group);
  floor.castShadow = false;
  // tapijten
  const carpet = (x, z, w, d, c) => { const m = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat(c, { roughness: 1 }), x, 0.03, z, group); m.castShadow = false; return m; };
  carpet(0, 10, 3, 19.4, 0x9c1a3a);
  carpet(0, -12, 2.4, 23.4, 0x5f3dc4);
  carpet(0, -42, 3, 34, 0x5f3dc4);
  // het pad op het voorplein
  carpet(0, 28, 3.4, 16, 0x6d6875);

  // ---------- Muren ----------
  const stoneM = mat(0x6f6889, { roughness: 0.9, flatShading: true });
  const wall = (x1, x2, z1, z2, h = WALL_H, m = stoneM) => {
    boxes.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, hw: (x2 - x1) / 2, hd: (z2 - z1) / 2 });
    const mm = m.clone(); mm.transparent = true;
    const w = mesh(new THREE.BoxGeometry(x2 - x1, h, z2 - z1), mm, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, group);
    walls.push({ m: mm, x1, x2, z1, z2, k: 1 });
    return w;
  };
  const T = 0.5; // halve dikte
  // buitenmuren
  wall(B.minX - 1, B.minX + T, B.minZ - 1, COURT.z1 - T, 4);
  wall(B.maxX - T, B.maxX + 1, B.minZ - 1, COURT.z1 - T, 4);
  // de voorgevel met de groene poort
  wall(B.minX - 1, -2.5, COURT.z1 - T, COURT.z1 + T, 4.4);
  wall(2.5, B.maxX + 1, COURT.z1 - T, COURT.z1 + T, 4.4);
  // achterkant van de hal (met 3 deuren)
  wall(B.minX, -17, -T, T); wall(-13, -2, -T, T); wall(2, 13, -T, T); wall(17, B.maxX, -T, T);
  // tussen bibliotheek, wapenzaal en kerker
  wall(-8 - T, -8 + T, -24, 0); wall(8 - T, 8 + T, -24, 0);
  // de achterkant van de bibliotheek, wapenzaal en kerker
  wall(B.minX, -17, -24 - T, -24 + T); wall(-13, -2, -24 - T, -24 + T); wall(2, B.maxX, -24 - T, -24 + T);
  // de geheime kamer en de troonzaal
  wall(B.minX, SECRET.x2, SECRET.z1 - T, SECRET.z1 + T);
  wall(-13 - T, -13 + T, B.minZ - 1, -24);
  wall(13 - T, 13 + T, B.minZ - 1, -24);
  wall(-13, 13, B.minZ - 1, B.minZ + T, 4);
  // dichte stukken (daar kun je niet komen): een donker dak erop
  const roofM = mat(0x2b2540, { roughness: 1, flatShading: true });
  for (const [x1, x2, z1, z2] of [[B.minX, -13, B.minZ, SECRET.z1 - T], [13, B.maxX, B.minZ, -24]]) {
    mesh(new THREE.BoxGeometry(x2 - x1, 3.2, z2 - z1), roofM, (x1 + x2) / 2, 1.6, (z1 + z2) / 2, group);
  }
  // torens op de hoeken van de voorgevel, met paarse puntdaken
  const roofCone = mat(0x5f3dc4, { flatShading: true });
  for (const sx of [-1, 1]) for (const [x, r, h] of [[sx * 22, 2.2, 7.5], [sx * 4.2, 1.5, 6.2]]) {
    const tw = mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 8), stoneM.clone(), x, h / 2, COURT.z1, group);
    tw.material.transparent = true;
    const cone = mesh(new THREE.ConeGeometry(r * 1.3, r * 1.6, 8), roofCone.clone(), x, h + r * 0.8, COURT.z1, group);
    cone.material.transparent = true;
    walls.push({ m: tw.material, m2: cone.material, x1: x - r, x2: x + r, z1: COURT.z1 - r, z2: COURT.z1 + r, k: 1 });
    colliders.push({ x, z: COURT.z1, r: r + 0.1 });
  }
  // kantelen bovenop de achtermuur en de zijmuren (alleen om te zien)
  const merlons = [];
  for (let x = -12.5; x <= 12.5; x += 1.6) merlons.push({ x, y: 4.3, z: B.minZ, sx: 0.8, sy: 0.6, sz: 1.2 });
  for (let z = B.minZ; z < COURT.z1 - 1; z += 1.6) for (const x of [B.minX - 0.25, B.maxX + 0.25]) merlons.push({ x, y: 4.3, z, sx: 1.2, sy: 0.6, sz: 0.8 });
  instanced(group, new THREE.BoxGeometry(1, 1, 1), stoneM, merlons);

  // ---------- Deuren ----------
  const doors = DOORS.map((d) => {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); group.add(g);
    const box = { x: d.x, z: d.z, hw: d.hw, hd: 0.6 };
    boxes.push(box);
    const h = d.id === 'groen' ? 4.0 : WALL_H;
    if (d.shelf) {
      // een boekenkast vol boeken (één boek steekt uit!)
      mesh(new THREE.BoxGeometry(d.hw * 2, h, 0.9), mat(d.color, { flatShading: true }), 0, h / 2, 0, g);
      const cols = [0xc92a2a, 0x1971c2, 0x2f9e44, 0xf08c00, 0x862e9c, 0x0c8599];
      for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
        const bh = 0.5 + rand() * 0.2;
        const out = row === 1 && i === 6; // het geheime boek
        mesh(new THREE.BoxGeometry(0.34, bh, 0.5), mat(cols[(i + row * 2) % 6]), -d.hw + 0.35 + i * 0.41, 0.45 + row * 0.95 + bh / 2, out ? 0.62 : 0.3, g);
      }
    } else {
      const dm = mat(d.color, { flatShading: true, emissive: d.color, emissiveIntensity: 0.15, metalness: d.id === 'goud' ? 0.5 : 0.1, roughness: 0.5 });
      mesh(new THREE.BoxGeometry(d.hw * 2, h, 0.7), dm, 0, h / 2, 0, g);
      // sleutelgat (of twee hendel-tekentjes op de gouden deur)
      const dark = mat(0x111111);
      if (d.key) {
        for (const s of [1, -1]) {
          mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10).rotateX(Math.PI / 2), dark, 0, 1.6, s * 0.38, g);
          mesh(new THREE.BoxGeometry(0.16, 0.45, 0.08), dark, 0, 1.3, s * 0.38, g);
        }
      } else {
        for (const s of [1, -1]) for (const sx of [-0.6, 0.6]) mesh(new THREE.BoxGeometry(0.2, 0.9, 0.08), dark, sx, 1.7, s * 0.38, g);
      }
      for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.12, h, 0.8), mat(0x343a40, { metalness: 0.5 }), sx * (d.hw - 0.06), h / 2, 0, g);
    }
    // ook deuren worden doorzichtig als ze tussen jou en de camera staan
    const mats = [];
    g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    walls.push({ mats, x1: d.x - d.hw, x2: d.x + d.hw, z1: d.z - 0.4, z2: d.z + 0.4, k: 1 });
    return { ...d, g, box, h, open: false, k: 0 };
  });

  // ---------- Sleutels (zweven en draaien) ----------
  const keyGeo = { ring: new THREE.TorusGeometry(0.28, 0.08, 6, 14), shaft: new THREE.BoxGeometry(0.12, 0.8, 0.1), tooth: new THREE.BoxGeometry(0.22, 0.1, 0.1) };
  const keys = KEYS.map((k) => {
    const g = new THREE.Group(); g.position.set(k.x, 1.2, k.z); group.add(g);
    const km = mat(k.color, { emissive: k.color, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 });
    const ring = new THREE.Mesh(keyGeo.ring, km); ring.position.y = 0.45; g.add(ring);
    const sh = new THREE.Mesh(keyGeo.shaft, km); g.add(sh);
    for (const y of [-0.3, -0.12]) { const t = new THREE.Mesh(keyGeo.tooth, km); t.position.set(0.14, y, 0); g.add(t); }
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: k.color, transparent: true, opacity: 0.35, depthWrite: false }));
    glow.position.set(k.x, 0.04, k.z); group.add(glow);
    return { ...k, g, glow, taken: false };
  });

  // ---------- Hendels ----------
  const levers = LEVERS.map((l) => {
    const g = new THREE.Group(); g.position.set(l.x, 0, l.z); group.add(g);
    mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), mat(0x495057, { flatShading: true }), 0, 0.5, 0, g);
    const arm = new THREE.Group(); arm.position.y = 1.0; g.add(arm);
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), mat(0x868e96, { metalness: 0.6 }), 0, 0.55, 0, arm);
    const knob = mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(0xe03131, { emissive: 0x7a0000, emissiveIntensity: 0.5 }), 0, 1.1, 0, arm);
    arm.rotation.z = 0.6;
    colliders.push({ x: l.x, z: l.z, r: 0.55 });
    const lv = { ...l, g, arm, knob, on: false, k: 0 };
    talkables.push({
      id: `hendel-${l.id}`, name: l.name, voice: 0.9, mesh: g, pos: g.position, sign: true, castleLever: l.id,
      get lines() { return lv.on ? [`${l.name} staat al omlaag. Klonk!`] : [`Een oude ${l.name.toLowerCase()} aan de muur.`, 'Je trekt hem met al je kracht omlaag... KLONK!']; },
      showMarker() {}, update() {},
      distanceTo(p) { return Math.hypot(p.x - l.x, p.z - l.z); },
    });
    return lv;
  });

  // de geheime boekenkast: lees hem (Praat-knop) om aan het boek te trekken
  const shelfDoor = doors.find((d) => d.shelf);
  talkables.push({
    id: 'boekenkast', name: 'Boekenkast', voice: 0.8, mesh: shelfDoor.g, pos: shelfDoor.g.position, sign: true, castleSecret: true,
    lines: ['Er steekt één boek een beetje uit de kast...', 'Je trekt aan het boek. KRRRRR... de hele kast schuift opzij!'],
    showMarker() {}, update() {},
    distanceTo(p) { return shelfDoor.open ? Infinity : Math.hypot(p.x - shelfDoor.x, p.z - (shelfDoor.z + 1.6)); },
  });

  // ---------- Ridders (lege harnassen die heen en weer lopen) ----------
  const steel = mat(0xadb5bd, { metalness: 0.7, roughness: 0.35, flatShading: true }), steelDark = mat(0x495057, { metalness: 0.6, roughness: 0.4 });
  const visorM = mat(0x74c0fc, { emissive: 0x4dabf7, emissiveIntensity: 1.2 }), plumeM = mat(0x9c36b5, { flatShading: true });
  const knights = KNIGHTS.map((kn, i) => {
    const g = new THREE.Group(); group.add(g);
    const body = new THREE.Group(); g.add(body);
    mesh(new THREE.BoxGeometry(0.9, 1.0, 0.55), steel, 0, 1.45, 0, body);          // borst
    mesh(new THREE.BoxGeometry(0.75, 0.3, 0.5), steelDark, 0, 0.9, 0, body);       // riem
    const head = new THREE.Group(); head.position.y = 2.25; body.add(head);
    mesh(new THREE.BoxGeometry(0.6, 0.62, 0.6), steel, 0, 0, 0, head);
    mesh(new THREE.BoxGeometry(0.44, 0.08, 0.05), visorM, 0, 0.04, 0.31, head);   // ogen (blauw lampje)
    const plume = mesh(new THREE.ConeGeometry(0.16, 0.7, 5), plumeM, 0, 0.55, -0.05, head); plume.rotation.x = -0.4;
    const legs = [-0.22, 0.22].map((sx) => { const l = new THREE.Group(); l.position.set(sx, 0.85, 0); body.add(l); mesh(new THREE.BoxGeometry(0.28, 0.85, 0.32), steel, 0, -0.42, 0, l); return l; });
    const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * 0.58, 1.85, 0); body.add(a); mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), steel, 0, -0.38, 0, a); return a; });
    // schild en een (bot) zwaard
    mesh(new THREE.BoxGeometry(0.1, 0.8, 0.6), mat(0x5f3dc4, { flatShading: true }), -0.1, -0.5, 0.1, arms[0]);
    const sword = mesh(new THREE.BoxGeometry(0.08, 1.2, 0.14), steelDark, 0, -0.9, 0.35, arms[1]); sword.rotation.x = 1.2;
    const stars = new THREE.Group(); stars.position.y = 2.95; stars.visible = false; g.add(stars);
    for (let s = 0; s < 4; s++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xffd43b })); const a = s / 4 * Math.PI * 2; st.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); stars.add(st); }
    g.position.set(kn.a[0], 0, kn.a[1]);
    return { ...kn, g, body, legs, arms, stars, pos: g.position, r: 0.75, k: (i * 0.37) % 1, dir: 1, stun: 0, phase: 0 };
  });
  const KS = difficulty('spook').speed; // ridders lopen sneller in moeilijke werelden
  const updateKnights = (t, dt, speedUp = KS) => {
    for (const kn of knights) {
      if (kn.stun > 0) {
        kn.stun = Math.max(0, kn.stun - dt);
        kn.stars.visible = kn.stun > 0; kn.stars.rotation.y = t * 5;
        kn.body.rotation.z = Math.sin(t * 9) * 0.12;
        continue;
      }
      kn.body.rotation.z = 0;
      const len = Math.hypot(kn.b[0] - kn.a[0], kn.b[1] - kn.a[1]);
      kn.k += (kn.dir * kn.speed * speedUp * dt) / len;
      if (kn.k >= 1) { kn.k = 1; kn.dir = -1; } else if (kn.k <= 0) { kn.k = 0; kn.dir = 1; }
      kn.pos.x = kn.a[0] + (kn.b[0] - kn.a[0]) * kn.k; kn.pos.z = kn.a[1] + (kn.b[1] - kn.a[1]) * kn.k;
      kn.g.rotation.y = Math.atan2((kn.b[0] - kn.a[0]) * kn.dir, (kn.b[1] - kn.a[1]) * kn.dir);
      kn.phase += dt * 7;
      kn.legs[0].rotation.x = Math.sin(kn.phase) * 0.5; kn.legs[1].rotation.x = -Math.sin(kn.phase) * 0.5;
      kn.arms[0].rotation.x = -Math.sin(kn.phase) * 0.3; kn.arms[1].rotation.x = Math.sin(kn.phase) * 0.3;
      kn.body.position.y = Math.abs(Math.sin(kn.phase)) * 0.06;
    }
  };

  // ---------- Valluiken met pinnen ----------
  const trapM = mat(0x3b3550, { roughness: 0.8, flatShading: true });
  const warnM = new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0, depthWrite: false });
  const traps = TRAPS.map((tr) => {
    const plate = mesh(new THREE.BoxGeometry(TRAP_S - 0.15, 0.06, TRAP_S - 0.15), trapM, tr.x, 0.03, tr.z, group); plate.castShadow = false;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(TRAP_S - 0.3, TRAP_S - 0.3).rotateX(-Math.PI / 2), warnM.clone());
    glow.position.set(tr.x, 0.075, tr.z); group.add(glow);
    return { ...tr, glow, state: 'safe', y: 0 };
  });
  // de pinnen: veel kegeltjes in één keer (InstancedMesh), 4 per valluik
  const spikeGeo = new THREE.ConeGeometry(0.22, 0.9, 4); spikeGeo.translate(0, 0.45, 0);
  const spikes = new THREE.InstancedMesh(spikeGeo, mat(0xdee2e6, { metalness: 0.7, roughness: 0.3, flatShading: true }), traps.length * 4);
  spikes.castShadow = true; group.add(spikes);
  const tmp = new THREE.Object3D();
  const trapPhase = (t, g) => ((t + g * TRAP_T.period / 2) % TRAP_T.period + TRAP_T.period) % TRAP_T.period;
  const updateTraps = (t) => {
    let i = 0;
    for (const tr of traps) {
      const ph = trapPhase(t, tr.g);
      tr.state = ph < TRAP_T.warn ? 'safe' : ph < TRAP_T.up ? 'warn' : ph < TRAP_T.down ? 'up' : 'safe';
      const goal = tr.state === 'up' ? 1 : 0;
      tr.y += (goal - tr.y) * 0.35;
      tr.glow.material.opacity = tr.state === 'warn' ? 0.35 + Math.abs(Math.sin(t * 12)) * 0.35 : tr.state === 'up' ? 0.25 : 0;
      for (const [dx, dz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
        tmp.position.set(tr.x + dx, -0.85 + tr.y * 0.85, tr.z + dz); tmp.scale.setScalar(1); tmp.updateMatrix();
        spikes.setMatrixAt(i++, tmp.matrix);
      }
    }
    spikes.instanceMatrix.needsUpdate = true;
  };

  // ---------- Kerkhofje en pompoenen op het voorplein ----------
  const graves = [], graveTops = [];
  for (const [x, z] of [[-19, 26], [-15, 26], [-19, 30], [-15, 30], [-11, 32.5], [-19, 34], [14, 25], [18, 27.5], [14, 30]]) {
    graves.push({ x, y: 0.55, z, sx: 1.0, sy: 1.1, sz: 0.3, ry: (rand() - 0.5) * 0.3 });
    graveTops.push({ x, y: 1.1, z, sx: 0.5, sy: 0.5, sz: 0.15, rx: Math.PI / 2 });
    colliders.push({ x, z, r: 0.55 });
  }
  instanced(group, new THREE.BoxGeometry(1, 1, 1), mat(0x868e96, { flatShading: true }), graves);
  instanced(group, new THREE.CylinderGeometry(1, 1, 2, 10, 1, false, 0, Math.PI), mat(0x868e96, { flatShading: true }), graveTops);
  const pumpkins = [], stems = [], faces = [];
  for (const [x, z, s] of [[-5, 34], [5, 34.5], [-4, 22.5], [4.2, 22.4], [-12, 22.5], [11, 33.5], [20, 22], [-21, 22], [8, 21.5], [-8, 21.5]].map(([x, z]) => [x, z, 0.5 + rand() * 0.25])) {
    pumpkins.push({ x, y: s * 0.75, z, sx: s, sy: s * 0.8, sz: s });
    stems.push({ x, y: s * 1.45, z, s: s * 0.4 });
    faces.push({ x, y: s * 0.85, z: z + s * 0.92, sx: s * 0.9, sy: s * 0.5, sz: 1 });
    colliders.push({ x, z, r: s * 0.9 });
  }
  instanced(group, new THREE.SphereGeometry(1, 9, 6), mat(0xf76707, { flatShading: true, roughness: 0.7 }), pumpkins);
  instanced(group, new THREE.CylinderGeometry(0.2, 0.3, 1, 5), mat(0x2b8a3e), stems);
  // een lachend gezichtje dat gloeit (twee driehoek-oogjes en een mondje)
  const faceShape = new THREE.Shape();
  faceShape.moveTo(-0.55, 0.15); faceShape.lineTo(-0.3, 0.55); faceShape.lineTo(-0.1, 0.15); faceShape.lineTo(-0.55, 0.15);
  faceShape.moveTo(0.1, 0.15); faceShape.lineTo(0.3, 0.55); faceShape.lineTo(0.55, 0.15); faceShape.lineTo(0.1, 0.15);
  const mouth = new THREE.Shape(); mouth.moveTo(-0.6, -0.15); mouth.quadraticCurveTo(0, -0.7, 0.6, -0.15); mouth.quadraticCurveTo(0, -0.4, -0.6, -0.15);
  instanced(group, new THREE.ShapeGeometry([faceShape, mouth]), new THREE.MeshBasicMaterial({ color: 0xffe066 }), faces, { cast: false, receive: false });
  // kale boompjes
  const trunkM = mat(0x3d2b1f, { flatShading: true });
  for (const [x, z, s] of [[-20, 35], [20.5, 35], [-9, 35], [17, 32.5]].map(([x, z]) => [x, z, 0.9 + rand() * 0.4])) {
    mesh(new THREE.CylinderGeometry(0.15 * s, 0.3 * s, 3.2 * s, 5), trunkM, x, 1.6 * s, z, group);
    for (const [a, y, l] of [[0.8, 2.2, 1.3], [-0.9, 2.6, 1.1], [2.4, 1.8, 1.0]]) {
      const br = mesh(new THREE.CylinderGeometry(0.05 * s, 0.11 * s, l * s, 4), trunkM, x + Math.cos(a) * 0.45 * s, y * s, z + Math.sin(a) * 0.45 * s, group);
      br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    }
    colliders.push({ x, z, r: 0.4 * s });
  }
  // de maan (lekker groot)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3bf, fog: false }));
  moon.position.set(-38, 34, -70); group.add(moon);

  // ---------- Binnen: fakkels, boekenkasten, tralies, harnassen en de troon ----------
  const torches = [[-21.4, 17], [21.4, 17], [-21.4, 3], [21.4, 3], [-6, 0.6], [6, 0.6], [-21.4, -9.5], [8.6, -12], [-7.4, -16], [7.4, -16], [-12.4, -30], [12.4, -30], [-12.4, -50], [12.4, -50], [-6, -61.4], [6, -61.4]];
  const sticks = [], flames = [];
  for (const [x, z] of torches) {
    sticks.push({ x, y: 1.9, z, sx: 0.12, sy: 0.6, sz: 0.12 });
    flames.push({ x, y: 2.35, z, s: 0.22 });
  }
  instanced(group, new THREE.BoxGeometry(1, 1, 1), mat(0x5c3d2e), sticks);
  const flameMesh = instanced(group, new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffa94d }), flames, { cast: false, receive: false });
  const lights = [];
  for (const [x, z, c, i, d] of [[0, 10, 0xffa94d, 14, 18], [-15, -12, 0xffa94d, 10, 14], [15, -12, 0x9775fa, 10, 14], [0, -12, 0xffa94d, 9, 13], [-17.5, -30, 0xffd8a8, 9, 10], [0, -45, 0x9775fa, 22, 26], [0, 28, 0xffa94d, 8, 16]]) {
    const L = new THREE.PointLight(c, i, d, 1.4); L.position.set(x, 3.5, z); group.add(L); lights.push({ L, i });
  }
  // boekenkasten in de bibliotheek (en in de geheime kamer)
  const shelfM = mat(0x7a4b2a, { flatShading: true });
  const shelf = (x, z, w, d, rot = 0) => {
    const m = mesh(new THREE.BoxGeometry(w, 2.6, d), shelfM, x, 1.3, z, group);
    const cols = [0xc92a2a, 0x1971c2, 0x2f9e44, 0xf08c00, 0x862e9c];
    const books = [];
    const n = Math.floor(Math.max(w, d) / 0.42);
    for (let row = 0; row < 3; row++) for (let i = 0; i < n; i++) {
      const along = -Math.max(w, d) / 2 + 0.3 + i * 0.42, bh = 0.45 + rand() * 0.25;
      books.push({ x: x + (w > d ? along : rot * (w / 2 + 0.05)), y: 0.4 + row * 0.85 + bh / 2, z: z + (w > d ? rot * (d / 2 + 0.05) : along), sx: w > d ? 0.34 : 0.3, sy: bh, sz: w > d ? 0.3 : 0.34, c: cols[(i * 7 + row * 3) % 5] });
    }
    boxes.push({ x, z, hw: w / 2, hd: d / 2 });
    return books;
  };
  const allBooks = [
    ...shelf(-21, -5, 1.2, 6, 1), ...shelf(-21, -14, 1.2, 6, 1), ...shelf(-9.2, -6, 0.9, 5, -1), ...shelf(-20, -23, 3.4, 0.9, 1), ...shelf(-10.5, -23, 3.4, 0.9, 1),
    ...shelf(-21, -31, 1.2, 4, 1),
  ];
  for (const c of [0xc92a2a, 0x1971c2, 0x2f9e44, 0xf08c00, 0x862e9c]) instanced(group, new THREE.BoxGeometry(1, 1, 1), mat(c), allBooks.filter((b) => b.c === c), { cast: false });
  // leestafel met kaarsjes
  mesh(new THREE.BoxGeometry(3, 0.15, 1.6), shelfM, -15, 0.95, -11, group);
  for (const [dx, dz] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]]) mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), shelfM, -15 + dx, 0.45, -11 + dz, group);
  colliders.push({ x: -15.8, z: -11, r: 0.9 }, { x: -14.2, z: -11, r: 0.9 });
  const candles = [];
  for (const [x, y, z] of [[-15.8, 1.2, -11.2], [-14.4, 1.2, -10.8], [-19.5, 0.35, -34.5], [-14.5, 0.35, -25.5], [-14.5, 0.35, -34.5]]) candles.push({ x, y, z, sx: 0.12, sy: 0.35, sz: 0.12 });
  instanced(group, new THREE.CylinderGeometry(1, 1, 1, 6), mat(0xfff9db), candles);
  instanced(group, new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd43b }), candles.map((c) => ({ x: c.x, y: c.y + c.sy / 2 + 0.06, z: c.z, s: 0.07 })), { cast: false, receive: false });
  // tralies in de kerker (cellen langs de oostmuur)
  const bars = [];
  for (let z = -2; z > -18; z -= 0.45) bars.push({ x: 19.2, y: 1.3, z, sx: 0.08, sy: 2.6, sz: 0.08 });
  for (const z of [-2, -9.5, -17.5]) for (let x = 19.4; x < 22; x += 0.45) bars.push({ x, y: 1.3, z, sx: 0.08, sy: 2.6, sz: 0.08 });
  instanced(group, new THREE.CylinderGeometry(1, 1, 1, 5), mat(0x343a40, { metalness: 0.6 }), bars);
  boxes.push({ x: 20.6, z: -9.8, hw: 1.6, hd: 7.9 });
  // in een cel: een vrolijk spookje achter de tralies (alleen om te zien) en een skeletje-kussen? Nee: een emmer en stro
  mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8), mat(0x868e96, { metalness: 0.4 }), 21, 0.25, -5, group);
  mesh(new THREE.BoxGeometry(1.6, 0.2, 1.2), mat(0xe9c46a, { flatShading: true }), 20.9, 0.1, -13.5, group);
  // harnassen die stilstaan (in de wapenzaal) en wapenrekken
  const standM = mat(0x868e96, { metalness: 0.6, roughness: 0.4, flatShading: true });
  for (const [x, z] of [[-7, -2], [7, -2], [-7, -22.5], [7, -22.5], [-7, -9], [7, -15]]) {
    mesh(new THREE.BoxGeometry(0.8, 0.95, 0.5), standM, x, 1.35, z, group);
    mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), standM, x, 2.15, z, group);
    for (const sx of [-0.2, 0.2]) mesh(new THREE.BoxGeometry(0.25, 0.85, 0.3), standM, x + sx, 0.43, z, group);
    colliders.push({ x, z, r: 0.5 });
  }
  // banieren aan de muur in de hal
  const banner = new THREE.MeshStandardMaterial({ color: 0x5f3dc4, side: THREE.DoubleSide, roughness: 1 });
  for (const x of [-10, -5, 5, 10]) {
    const b = mesh(new THREE.PlaneGeometry(1.4, 2.2), banner, x, 1.9, 0.56, group); b.castShadow = false;
    const e = mesh(new THREE.CircleGeometry(0.35, 5), new THREE.MeshBasicMaterial({ color: 0xffd43b }), x, 2.1, 0.57, group); e.castShadow = false;
  }
  // pilaren in de hal en de troonzaal
  const pillarM = mat(0x7d7698, { flatShading: true });
  for (const [x, z] of [[-19.5, 18], [19.5, 18], [-19.5, 2], [19.5, 2], [-10.5, -28], [10.5, -28], [-10.5, -59.5], [10.5, -59.5], [-8, -36], [8, -36], [-8, -54], [8, -54]]) {
    mesh(new THREE.CylinderGeometry(0.7, 0.8, 3.4, 8), pillarM, x, 1.7, z, group);
    colliders.push({ x, z, r: 0.8 });
  }
  // de troon van de spookkoning
  const throneG = new THREE.Group(); throneG.position.set(0, 0, -59.5); group.add(throneG);
  mesh(new THREE.BoxGeometry(4, 0.4, 3), mat(0x4c3a7a, { flatShading: true }), 0, 0.2, 0, throneG);
  mesh(new THREE.BoxGeometry(2.2, 0.8, 1.6), mat(0x9c1a3a), 0, 0.8, 0.2, throneG);
  mesh(new THREE.BoxGeometry(2.4, 3.6, 0.4), mat(0xffc300, { metalness: 0.5, roughness: 0.4 }), 0, 2.2, -0.7, throneG);
  for (const sx of [-1, 0, 1]) mesh(new THREE.ConeGeometry(0.25, 0.7, 4), mat(0xffc300, { metalness: 0.5 }), sx * 0.8, 4.3, -0.7, throneG);
  colliders.push({ x: 0, z: -59.8, r: 1.6 });
  // de ring van de troonzaal op de vloer (daar vecht je)
  const arenaRing = new THREE.Mesh(new THREE.RingGeometry(ARENA.r - 0.25, ARENA.r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9775fa, transparent: true, opacity: 0.45, depthWrite: false }));
  arenaRing.position.set(ARENA.x, 0.05, ARENA.z); group.add(arenaRing);

  // ---------- Schatkisten ----------
  const chestM = mat(0x8b5a2b), bandM = mat(0x9775fa, { metalness: 0.4 });
  const chests = CHESTS.map((c) => {
    const g = new THREE.Group();
    const s = c.big ? 1.3 : 1;
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

  // ---------- Spookje Pip (een lief spookje bij de ingang, helpt je) ----------
  const pipG = new THREE.Group(); pipG.position.set(-4.5, 0, 31); group.add(pipG);
  const pipM = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, emissive: 0xc5d8ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.88, flatShading: true });
  const pipBody = new THREE.Group(); pipG.add(pipBody);
  mesh(new THREE.SphereGeometry(0.55, 10, 8), pipM, 0, 1.45, 0, pipBody);
  const skirt = mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.9, 10, 1, true), pipM, 0, 0.98, 0, pipBody); skirt.material.side = THREE.DoubleSide;
  for (const sx of [-0.18, 0.18]) mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0x212529), sx, 1.55, 0.48, pipBody);
  for (const sx of [-0.3, 0.3]) mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(0xff8fab), sx, 1.4, 0.44, pipBody);
  mesh(new THREE.TorusGeometry(0.08, 0.025, 4, 10, Math.PI), mat(0x212529), 0, 1.38, 0.5, pipBody).rotation.z = Math.PI;
  const bow = mat(0xf783ac); mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), bow, 0.3, 1.9, 0.15, pipBody);
  updaters.push((t) => { pipBody.position.y = Math.sin(t * 2) * 0.15; pipBody.rotation.y = Math.sin(t * 0.7) * 0.4; });
  talkables.push({
    id: 'pip', name: 'Spookje Pip', voice: 1.6, mesh: pipG, pos: pipG.position,
    lines: [
      'Boe! Hihi, schrik niet: ik ben Spookje Pip. Ik ben een LIEF spookje!',
      'Maar de andere spoken in het kasteel zijn plaaggeesten. Ze vliegen dwars door de muren! Sla ze weg met je zwaard.',
      'De groene poort is op slot. Ik zag de groene sleutel achter de grafstenen liggen...',
      'Binnen lopen oude ridders rond. Geef ze een tik, dan staan ze even te duizelen! En pas op voor rode tegels: daar komen pinnen uit.',
      'De gouden deur gaat pas open met 2 hendels. Eén hendel zit achter een geheime deur in de bibliotheek. Kijk goed naar de boeken!',
      'Achterin woont Spookkoning Sjaak. Hij heeft stukje 6 van de schatkaart. Succes!',
    ],
    showMarker() {}, update() {},
    distanceTo(p) { return Math.hypot(p.x - pipG.position.x, p.z - pipG.position.z); },
  });
  colliders.push({ x: pipG.position.x, z: pipG.position.z, r: 0.5 });

  // ---------- Ingang: portaal terug naar de woestijn en een bord ----------
  const portal = makePortal(group, 0, B.maxZ - 2.2, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  talkables.push(makeSignpost(group, {
    id: 'bord-spook', x: 4.5, z: B.maxZ - 6.5, title: 'SPOOKKASTEEL', color: '#5f3dc4',
    lines: [
      'HET SPOOKKASTEEL',
      'Achterin, in de Troonzaal, woont Spookkoning Sjaak. Hij bewaakt stukje 6 van de schatkaart!',
      'Spoken vliegen door muren heen. Ridders lopen heen en weer. Rode tegels? Daar komen zo pinnen uit!',
      'Zoek de sleutels en de hendels om de deuren open te maken. Niet alle deuren zien eruit als een deur...',
    ],
  }));

  // ---------- Mistflarden over de vloer ----------
  const N = 160;
  const mistPos = new Float32Array(N * 3), mistSeeds = [];
  for (let i = 0; i < N; i++) mistSeeds.push({ x: B.minX + Math.random() * (B.maxX - B.minX), z: B.minZ + Math.random() * (B.maxZ - B.minZ), ph: Math.random() * 6 });
  const mistGeo = new THREE.BufferGeometry(); mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ color: 0xd0bfff, size: 0.5, transparent: true, opacity: 0.35, depthWrite: false }));
  mist.frustumCulled = false; group.add(mist);

  // ---------- Zone ----------
  const inRect = (p, r, m = 0) => p.x > r.x1 - m && p.x < r.x2 + m && p.z > r.z1 - m && p.z < r.z2 + m;
  const inArena = (p) => Math.hypot(p.x - ARENA.x, p.z - ARENA.z) < ARENA.r + 0.5 && p.z < THRONE.z2;
  const zone = {
    id: 'spook', name: 'Het Spookkasteel', group, colliders, boxes, talkables, npcs: [],
    bounds: { ...B },
    music: 'spook',
    env: { sky: [0x120b2e, 0x3b2462], fog: [0x231a3a, 26, 72], hemi: [0xb197fc, 0x2b1d3a, 0.95], sun: [0xc5d0ff, 1.25], cam: [0, 11.5, 9.5] },
    spawns: { fromWoestijn: { x: 0, z: B.maxZ - 5.5, rot: Math.PI } },
    exit: { x: 0, z: B.maxZ - 2.0 },
    doors, keys, levers, chests, knights, traps, arena: ARENA, throne: THRONE,
    boss: { x: ARENA.x, z: ARENA.z - 4 },
    focus: { x: 0, z: 0 },
    heartSpots: [{ x: -20, z: 18.5 }, { x: 20, z: 18.5 }, { x: -18, z: -34.5 }, { x: 20.5, z: -23 }, { x: -11, z: -26 }, { x: 11, z: -26 }],
    ghostSpots: GHOST_SPOTS.map(([x, z]) => ({ x, z })),
    labels: [
      { x: 0, z: 31, text: 'Voorplein' }, { x: 0, z: 17, text: 'Grote Hal' }, { x: -15, z: -3, text: 'Bibliotheek' }, { x: 0, z: -3, text: 'Wapenzaal' },
      { x: 15, z: -3.2, text: 'Kerker' }, { x: 0, z: -28, text: 'Troonzaal' },
    ],
    inArena, inRect,
    inThroneRoom: (p) => inRect(p, THRONE),
    roomOf(p) {
      if (p.z > COURT.z1) return 'plein';
      if (inRect(p, HALL)) return 'hal';
      if (inRect(p, LIBRARY)) return 'bieb';
      if (inRect(p, ARMORY)) return 'wapen';
      if (inRect(p, DUNGEON)) return 'kerker';
      if (inRect(p, SECRET)) return 'geheim';
      return 'troon';
    },
    // staat er iemand op een valluik met de pinnen omhoog?
    trapAt(p, r = 0.3) { return traps.find((tr) => tr.state === 'up' && tr.y > 0.5 && Math.abs(p.x - tr.x) < TRAP_S / 2 + r - 0.25 && Math.abs(p.z - tr.z) < TRAP_S / 2 + r - 0.25) || null; },
    // loopt er een ridder tegen je aan?
    knightAt(p, r = 0.4) { return knights.find((k) => k.stun <= 0 && Math.hypot(p.x - k.pos.x, p.z - k.pos.z) < k.r + r) || null; },
    // een tik met je zwaard: de ridder staat even te duizelen
    hitKnights(pos, rot, reach) {
      let hit = null;
      for (const k of knights) {
        const dx = k.pos.x - pos.x, dz = k.pos.z - pos.z, d = Math.hypot(dx, dz);
        if (d - k.r > reach) continue;
        let diff = Math.atan2(dx, dz) - rot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 1.3 && d > k.r + 0.6) continue;
        k.stun = 2.4; hit = k;
      }
      return hit;
    },
    setDoorOpen(id, open, instant = false) {
      const d = doors.find((q) => q.id === id); if (!d) return;
      d.open = open; d.box.off = open;
      if (instant) { d.k = open ? 1 : 0; placeDoor(d); }
    },
    setKeyTaken(id, taken) { const k = keys.find((q) => q.id === id); if (k) { k.taken = taken; k.g.visible = !taken; k.glow.visible = !taken; } },
    setLever(id, on, instant = false) { const l = levers.find((q) => q.id === id); if (l) { l.on = on; if (instant) { l.k = on ? 1 : 0; l.arm.rotation.z = 0.6 - 1.2 * l.k; } } },
    reset() { for (const k of knights) { k.stun = 0; } },
    applyState(st) {
      for (const d of doors) zone.setDoorOpen(d.id, d.shelf ? !!st.secret : st.doors.includes(d.id), true);
      for (const k of keys) zone.setKeyTaken(k.id, st.keys.includes(k.id));
      for (const l of levers) zone.setLever(l.id, st.levers.includes(l.id), true);
      for (const c of chests) { const o = st.chests.includes(c.id); c.opened = o; c.k = o ? 1 : 0; c.lid.rotation.x = -1.9 * c.k; }
    },
    // waar moet je nu heen? (de ster op het scherm). De geheime deur verraden we niet!
    goal(st) {
      const has = (a, id) => a.includes(id);
      if (!has(st.doors, 'groen')) return has(st.keys, 'groen') ? doors[0] : keys[0];
      if (!has(st.keys, 'rood')) return keys[1];
      if (!has(st.doors, 'rood')) return { x: doors[1].x, z: doors[1].z + 1.2 };
      if (!has(st.levers, 'oost')) return levers[1];
      if (!st.secret) return null;
      if (!has(st.levers, 'west')) return levers[0];
      return zone.boss;
    },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      const f = zone.focus;
      updateKnights(t, dt);
      updateTraps(t);
      // muren tussen jou en de camera worden doorzichtig
      for (const w of walls) {
        const front = w.z2 > f.z - 0.6 && w.z1 < f.z + 7 && w.x1 < f.x + 3.2 && w.x2 > f.x - 3.2 && !(w.z1 < f.z - 0.6);
        const goal = front ? 0.22 : 1;
        w.k += (goal - w.k) * Math.min(1, dt * 8);
        for (const m of w.mats || [w.m, w.m2]) if (m) { m.opacity = w.k; m.depthWrite = w.k > 0.9; }
      }
      // deuren gaan omlaag (de boekenkast schuift opzij)
      for (const d of doors) { const goal = d.open ? 1 : 0; if (Math.abs(d.k - goal) > 1e-3) { d.k += (goal - d.k) * Math.min(1, dt * 2.5); placeDoor(d); } }
      for (const l of levers) { const goal = l.on ? 1 : 0; l.k += (goal - l.k) * Math.min(1, dt * 6); l.arm.rotation.z = 0.6 - 1.2 * l.k; }
      for (const k of keys) { if (k.taken) continue; k.g.rotation.y = t * 2; k.g.position.y = 1.2 + Math.sin(t * 3 + k.x) * 0.18; k.glow.material.opacity = 0.25 + Math.sin(t * 4) * 0.12; }
      for (const c of chests) { c.k += ((c.opened ? 1 : 0) - c.k) * Math.min(1, dt * 4); c.lid.rotation.x = -1.9 * c.k; }
      // fakkels flakkeren
      const fl = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
      flameMesh.scale.set(1, fl, 1);
      for (const [i, l] of lights.entries()) l.L.intensity = l.i * (0.9 + Math.sin(t * (6 + i) + i) * 0.1);
      arenaRing.material.opacity = 0.3 + Math.sin(t * 2) * 0.15;
      // mist kruipt over de vloer
      for (let i = 0; i < N; i++) { const s = mistSeeds[i]; mistPos[i * 3] = s.x + Math.sin(t * 0.3 + s.ph) * 1.5; mistPos[i * 3 + 1] = 0.25 + Math.sin(t * 0.8 + s.ph) * 0.15; mistPos[i * 3 + 2] = s.z + Math.cos(t * 0.25 + s.ph) * 1.5; }
      mistGeo.attributes.position.needsUpdate = true;
    },
  };
  function placeDoor(d) {
    if (d.shelf) d.g.position.x = d.x - d.k * (d.hw * 2 + 0.2);
    else d.g.position.y = -d.k * (d.h + 0.05);
    d.g.visible = d.k < 0.99 || d.shelf;
  }
  // de kaart
  zone.drawMap = (g, px, pz, scale) => {
    g.fillStyle = '#3a3f2f';
    g.fillRect(px(B.minX), pz(COURT.z1), (B.maxX - B.minX) * scale, (B.maxZ - COURT.z1) * scale);
    g.fillStyle = '#8e86a8';
    g.fillRect(px(B.minX), pz(B.minZ), (B.maxX - B.minX) * scale, (COURT.z1 - B.minZ) * scale);
    g.fillStyle = '#d0bfff';
    g.beginPath(); g.arc(px(ARENA.x), pz(ARENA.z), ARENA.r * scale, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2540';
    g.fillRect(px(B.minX), pz(B.minZ), (-13 - B.minX) * scale, (SECRET.z1 - B.minZ) * scale);
    g.fillRect(px(13), pz(B.minZ), (B.maxX - 13) * scale, (-24 - B.minZ) * scale);
    for (const b of boxes) if (!b.off) g.fillRect(px(b.x - b.hw), pz(b.z - b.hd), b.hw * 2 * scale, b.hd * 2 * scale);
    for (const d of doors) {
      if (d.open || d.shelf) continue; // de geheime deur zie je niet op de kaart!
      g.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      g.fillRect(px(d.x - d.hw), pz(d.z - 0.7), d.hw * 2 * scale, 1.4 * scale);
    }
    g.fillStyle = '#ff6b6b';
    for (const tr of traps) g.fillRect(px(tr.x - 1), pz(tr.z - 1), 2 * scale, 2 * scale);
    for (const k of keys) { if (k.taken) continue; g.fillStyle = '#' + k.color.toString(16).padStart(6, '0'); g.beginPath(); g.arc(px(k.x), pz(k.z), 4, 0, Math.PI * 2); g.fill(); }
    for (const c of chests) { if (c.big && !zone.secretSeen) continue; g.fillStyle = c.opened ? '#7a5c34' : '#ffc300'; g.fillRect(px(c.x) - 3, pz(c.z) - 3, 6, 6); }
  };
  return zone;
}

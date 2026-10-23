// De Onderwaterwereld (hoofdstuk 6, idee van Dex): wereld 4 van de schatkaart. Je zwemt!
// Met ⬆️/⬇️ (of R en F op de laptop) zwem je omhoog en omlaag. Hoe hoog je zwemt is "diepte" (y: 0 = bodem, 6 = boven).
// Van de lagune (zuid) naar de diepe trog (noord):
//   1. De lagune: hier kun je ademhalen. Daarna loopt je LUCHTMETER leeg!
//   2. Het koraalrif: muren van koraal (zwem eroverheen of zoek het gat), KWALLEN die op en neer drijven.
//   3. De stroming: het water SLEURT je opzij. Vlak bij de bodem (tussen het zeewier) is de stroming zwak,
//      maar langs de randen liggen zee-egels op de bodem. En hier zwemmen HAAIEN.
//   4. Het gezonken schip: binnenin staat de grote schatkist (duik naar de bodem om hem open te maken).
//   5. De diepe trog: hier woont Reuzeninktvis Inka (zie squid.js). Zij bewaakt stukje 4 van de schatkaart.
// LUCHTBELLEN: grote bellen (pak ze) en bellenbronnen op de bodem (zwem door de bellen omhoog).
// De Wolkenflitser mag hier niet komen (een auto onder water? Nee!).
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, makeFloaters, seeded } from './props.js';
import { makePortal } from './world.js';
import { instanced } from './optimize.js';

export const SEA_BOUNDS = { minX: -24, maxX: 24, minZ: -64, maxZ: 40 };
export const SURFACE = 6;                             // hoger kun je niet zwemmen
export const LAGOON_Z = 26;                           // ten zuiden hiervan kun je ademhalen
export const REEF = { z1: 6, z2: 26 };
export const CURRENT = { z1: -17, z2: 1 };
export const CURRENT_BANDS = [                        // dir: +1 = naar rechts (oost), -1 = naar links (west)
  { z1: -17, z2: -11, dir: 1 }, { z1: -11, z2: -5, dir: -1 }, { z1: -5, z2: 1, dir: 1 },
];
export const CURRENT_SPEED = 3.3, KELP_Y = 1.3;      // onder KELP_Y (vlak bij de bodem) is de stroming zwak
export const URCHIN_X = 17;                           // zee-egels: verder naar de rand dan dit (op de bodem, in de stroming)
export const WRECK = { x: 0, z: -27, hx: 9, hz: 3, h: 4.2 }; // het gezonken schip
export const TRENCH = { x: 0, z: -51, r: 11 };       // de diepe trog met de inktvis
export const AIR_MAX = 32;                            // seconden lucht
export const BUBBLE_AIR = 11, BUBBLE_BACK = 9;        // een luchtbel geeft 11 s lucht en komt na 9 s terug
export const CHESTS = [
  { id: 'zkist1', x: -19, z: 21, n: 15, low: false },
  { id: 'zkist2', x: 0, z: -2.5, n: 20, low: true },
  { id: 'zkist3', x: 0, z: -28.3, n: 40, low: true, ship: true }, // de schatkist van het schip
];

export function createSea(group) {
  const rand = seeded(2033);
  const B = SEA_BOUNDS;
  const W = B.maxX - B.minX;
  // alles waar je tegenaan botst heeft een hoogte h: zwem je hoger, dan ga je eroverheen
  const allColliders = [], allBoxes = [], colliders = [], boxes = [], updaters = [], talkables = [];

  // ---------- Bodem: zand met wat kleur ----------
  const groundGeo = new THREE.PlaneGeometry(150, 190, 60, 76).rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0, -12);
  const gp = groundGeo.attributes.position, colors = [];
  const cA = new THREE.Color(0xd9c58f), cB = new THREE.Color(0xc8b37a), cC = new THREE.Color(0xb9a46e), cD = new THREE.Color(0x6c8f8a);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const deep = z < WRECK.z + 8; // dieper = donkerder
    const r = rand(), c = deep ? (r < 0.5 ? cD : cC) : (r < 0.4 ? cA : r < 0.8 ? cB : cC);
    colors.push(c.r, c.g, c.b);
    const out = Math.max(B.minX - x, x - B.maxX, B.minZ - z, z - B.maxZ, 0);
    if (out > 1.5) gp.setY(i, Math.min(16, (out - 1.5) * 1.6) * (0.7 + rand() * 0.5));
    else gp.setY(i, Math.sin(x * 0.4) * Math.cos(z * 0.3) * 0.08);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- Het wateroppervlak (boven je) ----------
  const surfM = new THREE.MeshBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, B.maxZ - B.minZ + 40).rotateX(-Math.PI / 2), surfM);
  surf.position.set(0, SURFACE + 1.4, (B.minZ + B.maxZ) / 2);
  group.add(surf);
  // lichtstralen in de lagune
  const rayM = new THREE.MeshBasicMaterial({ color: 0xe0fbff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const r = mesh(new THREE.PlaneGeometry(1.2 + rand(), 9), rayM, -18 + i * 4.5, 4, LAGOON_Z + 3 + rand() * 9, group);
    r.rotation.set(0, rand() * 3, 0.25); r.castShadow = false;
  }

  // ---------- Rotsen ----------
  const rockM = mat(0x5f6f73, { roughness: 1, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = [];
  const addRock = (x, z, s, h = s * 1.3, flat = 1) => {
    rocks.push({ x, y: s * 0.5 * flat, z, sx: s, sy: s * flat, sz: s, ry: rand() * 6, rx: rand() * 0.3 });
    if (h > 0) allColliders.push({ x, z, r: s * 0.85, h });
  };
  // ---------- Koraal (vrolijke kleuren) ----------
  const coralCols = [0xff6b9d, 0xffa94d, 0xb197fc, 0x63e6be, 0xffd43b, 0xff8787];
  const coralBits = [], coralFans = [];
  const coralGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 5), fanGeo = new THREE.CircleGeometry(0.7, 7);
  const addCoral = (x, z, s = 1) => {
    const c = coralCols[Math.floor(rand() * coralCols.length)];
    for (let k = 0; k < 3; k++) coralBits.push({ x: x + (rand() - 0.5) * 0.6, y: 0.5 * s, z: z + (rand() - 0.5) * 0.6, sx: s, sy: s * (0.8 + rand() * 0.8), sz: s, rx: (rand() - 0.5) * 0.6, ry: rand() * 6, color: c });
    if (rand() < 0.5) coralFans.push({ x, y: 0.8 * s, z, s, ry: rand() * 6, color: coralCols[Math.floor(rand() * coralCols.length)] });
  };

  // ---------- Het koraalrif: 2 muren van koraal ----------
  // zwem eroverheen (hoog genoeg) of zoek het gat bij de bodem
  const reefWalls = [
    { z: 20, h: 3.2, gap: [-14, -9.5] },
    { z: 11, h: 3.6, gap: [9.5, 14] },
  ];
  const reefM = mat(0xe8590c, { roughness: 0.9, flatShading: true });
  for (const w of reefWalls) {
    for (const [x1, x2] of [[B.minX - 4, w.gap[0]], [w.gap[1], B.maxX + 4]]) {
      allBoxes.push({ x: (x1 + x2) / 2, z: w.z, hw: (x2 - x1) / 2, hd: 0.8, h: w.h });
      const m = mesh(new THREE.BoxGeometry(x2 - x1, w.h, 1.4), reefM, (x1 + x2) / 2, w.h / 2, w.z, group);
      m.material = mat(0xc2410c, { roughness: 0.9, flatShading: true });
      for (let x = x1 + 0.6; x < x2; x += 1.1) addCoral(x, w.z + (rand() - 0.5) * 0.8, 0.9 + rand() * 0.6);
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = B.minX + 1 + rand() * (W - 2), z = REEF.z1 + rand() * (B.maxZ - REEF.z1 - 3);
    if (Math.abs(x) < 3 && z > LAGOON_Z) continue;
    addCoral(x, z, 0.6 + rand() * 0.6);
  }
  // rotsen in de lagune en het rif
  for (const [x, z, s] of [[-12, 34, 1.3], [13, 31, 1.6], [-20, 28, 1.1], [19, 36, 1.2], [-6, 16, 0.9], [16, 15.5, 1.1], [-17, 8, 1.2]]) addRock(x, z, s);

  // ---------- De stroming: zeewier (bescherming) en zee-egels langs de randen ----------
  const kelpM = mat(0x2f9e44, { roughness: 0.8, side: THREE.DoubleSide });
  const kelpGeo = new THREE.PlaneGeometry(0.35, 1).translate(0, 0.5, 0);
  const kelp = [];
  for (let i = 0; i < 70; i++) {
    const x = -URCHIN_X + 1 + rand() * (URCHIN_X * 2 - 2), z = CURRENT.z1 + rand() * (CURRENT.z2 - CURRENT.z1 + 4);
    const h = 0.9 + rand() * 0.8;
    kelp.push({ x, z, h, ph: rand() * 6, m: mesh(kelpGeo, kelpM, x, 0, z, group) });
    kelp[kelp.length - 1].m.scale.set(1, h, 1);
    kelp[kelp.length - 1].m.castShadow = false;
  }
  const urchinM = mat(0x3b2f4a, { roughness: 0.6 });
  const urchinGeo = new THREE.IcosahedronGeometry(0.32, 0), spikeGeo = new THREE.ConeGeometry(0.05, 0.45, 3);
  const urchins = [], spikes = [];
  for (const s of [-1, 1]) for (let z = CURRENT.z1 + 0.6; z < CURRENT.z2; z += 1.2) for (let x = URCHIN_X + 0.7; x < B.maxX; x += 1.3) {
    const ux = s * (x + (rand() - 0.5) * 0.4), uz = z + (rand() - 0.5) * 0.4;
    urchins.push({ x: ux, y: 0.25, z: uz, s: 1 });
    for (let k = 0; k < 4; k++) spikes.push({ x: ux, y: 0.3, z: uz, rx: rand() * 3, ry: rand() * 6, s: 1 });
  }
  instanced(group, urchinGeo, urchinM, urchins);
  instanced(group, spikeGeo, mat(0x1d1726), spikes, { cast: false });
  // gele randjes: hier liggen zee-egels
  for (const s of [-1, 1]) {
    const edge = mesh(new THREE.PlaneGeometry(0.15, CURRENT.z2 - CURRENT.z1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd43b }), s * URCHIN_X, 0.05, (CURRENT.z1 + CURRENT.z2) / 2, group);
    edge.castShadow = false;
  }
  // stromingsstreepjes: laten zien welke kant het water op gaat
  const streakM = new THREE.MeshBasicMaterial({ color: 0xe7f5ff, transparent: true, opacity: 0.45, depthWrite: false });
  const streakGeo = new THREE.BoxGeometry(1.4, 0.05, 0.08);
  const streaks = [];
  for (const b of CURRENT_BANDS) for (let i = 0; i < 26; i++) {
    const s = { b, x: B.minX + rand() * W, y: KELP_Y + 0.3 + rand() * (SURFACE - KELP_Y), z: b.z1 + 0.4 + rand() * (b.z2 - b.z1 - 0.8), v: 0.8 + rand() * 0.5 };
    s.m = mesh(streakGeo, streakM, s.x, s.y, s.z, group); s.m.castShadow = false;
    streaks.push(s);
  }
  // pijlen op de bodem
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-0.9, -0.25); arrowShape.lineTo(0.2, -0.25); arrowShape.lineTo(0.2, -0.6); arrowShape.lineTo(0.9, 0); arrowShape.lineTo(0.2, 0.6); arrowShape.lineTo(0.2, 0.25); arrowShape.lineTo(-0.9, 0.25);
  const arrowGeo = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2);
  const arrowM = new THREE.MeshBasicMaterial({ color: 0x74c0fc, transparent: true, opacity: 0.55, depthWrite: false });
  for (const b of CURRENT_BANDS) for (const x of [-12, -4, 4, 12]) {
    const a = mesh(arrowGeo, arrowM, x, 0.06, (b.z1 + b.z2) / 2, group);
    a.scale.set(b.dir * 1.3, 1, 1.3); a.castShadow = false;
  }

  // ---------- Het gezonken schip ----------
  const woodM = mat(0x6b4f3a, { roughness: 1, flatShading: true }), darkWood = mat(0x4a3628, { roughness: 1 });
  const ship = new THREE.Group();
  ship.position.set(WRECK.x, 0, WRECK.z);
  ship.rotation.z = 0.06; // een beetje scheef
  group.add(ship);
  const { hx, hz, h } = WRECK;
  // romp: 4 wanden, met een groot gat aan de voorkant (zuid)
  const wallBox = (x1, x2, z1, z2, wh = h) => {
    allBoxes.push({ x: WRECK.x + (x1 + x2) / 2, z: WRECK.z + (z1 + z2) / 2, hw: (x2 - x1) / 2, hd: (z2 - z1) / 2, h: wh + 0.3 });
    mesh(new THREE.BoxGeometry(x2 - x1, wh, z2 - z1), woodM, (x1 + x2) / 2, wh / 2, (z1 + z2) / 2, ship);
  };
  wallBox(-hx, hx, -hz - 0.4, -hz + 0.2);          // achterkant (noord)
  wallBox(-hx, -1.8, hz - 0.2, hz + 0.4);          // voorkant links
  wallBox(1.8, hx, hz - 0.2, hz + 0.4);            // voorkant rechts
  wallBox(-hx - 0.4, -hx + 0.2, -hz, hz);          // links
  wallBox(hx - 0.2, hx + 0.4, -hz, hz);            // rechts
  // de punt van het schip en het achterdek
  const bow = mesh(new THREE.ConeGeometry(hz + 0.4, 4, 4), woodM, hx + 1.8, h / 2, 0, ship);
  bow.rotation.set(0, Math.PI / 4, -Math.PI / 2); bow.scale.set(1, 1, 0.6);
  allColliders.push({ x: WRECK.x + hx + 1.6, z: WRECK.z, r: 2.2, h: h });
  mesh(new THREE.BoxGeometry(3.5, 1.2, hz * 2 + 0.8), darkWood, -hx + 1.4, h + 0.6, 0, ship);
  // planken van het dek (half kapot)
  for (let x = -hx + 3.6; x < hx - 0.5; x += 1.3) if (rand() < 0.45) mesh(new THREE.BoxGeometry(1.1, 0.12, hz * 2 + 0.6), darkWood, x, h - 0.1, 0, ship).rotation.z = (rand() - 0.5) * 0.2;
  // de mast (gebroken) en een vlag
  mesh(new THREE.CylinderGeometry(0.28, 0.32, 9, 8), darkWood, 3.2, 4.5, -1.2, ship).rotation.z = 0.25;
  allColliders.push({ x: WRECK.x + 3.2, z: WRECK.z - 1.2, r: 0.45, h: 20 });
  const flag = mesh(new THREE.PlaneGeometry(1.8, 1.1), mat(0x1d1d1d, { side: THREE.DoubleSide }), 4.6, 7.6, -1.2, ship);
  const skullM = mat(0xffffff);
  mesh(new THREE.CircleGeometry(0.25, 10), skullM, 4.6, 7.65, -1.15, ship).castShadow = false;
  flag.castShadow = false;
  // een gat in de romp om naar binnen te kijken: lichtje in het schip
  const shipLight = new THREE.PointLight(0xffd43b, 10, 9, 1.4);
  shipLight.position.set(WRECK.x, 1.6, WRECK.z - 1);
  group.add(shipLight);
  // munten rond het schip
  const goldM = mat(0xffc300, { metalness: 0.5, emissive: 0x553300, emissiveIntensity: 0.4 });
  for (let i = 0; i < 18; i++) {
    const a = rand() * 6.28, r = 0.5 + rand() * 2.4;
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), goldM, WRECK.x + Math.cos(a) * r, 0.04, WRECK.z - 1.5 + Math.sin(a) * r * 0.5, group).rotation.set(rand(), 0, rand());
  }
  // rotsen rond het schip
  for (const [x, z, s] of [[-16, -21, 1.4], [15, -20, 1.2], [-19, -33, 1.6], [18, -35, 1.3], [-10, -37, 1], [11, -38, 1.1]]) addRock(x, z, s);

  // ---------- De diepe trog: een ring van hoge rotsen (opening aan de zuidkant) ----------
  for (let a = 0; a < Math.PI * 2; a += 0.16) {
    const x = TRENCH.x + Math.sin(a) * (TRENCH.r + 1.6), z = TRENCH.z + Math.cos(a) * (TRENCH.r + 1.6);
    if (Math.abs(x) < 3.8 && z > TRENCH.z) continue;
    addRock(x, z, 1.8 + rand() * 0.7, 40, z > TRENCH.z ? 0.6 : 1.3); // (h 40: hier kun je niet overheen zwemmen)
  }
  const trenchFloor = new THREE.Mesh(new THREE.CircleGeometry(TRENCH.r + 0.6, 40).rotateX(-Math.PI / 2), mat(0x3d5a66, { roughness: 1 }));
  trenchFloor.position.set(TRENCH.x, 0.03, TRENCH.z);
  trenchFloor.receiveShadow = true;
  group.add(trenchFloor);
  const trenchLight = new THREE.PointLight(0x9775fa, 22, 26, 1.3);
  trenchLight.position.set(TRENCH.x, 6, TRENCH.z);
  group.add(trenchLight);
  instanced(group, rockGeo, rockM, rocks);
  instanced(group, coralGeo, mat(0xffffff, { roughness: 0.7 }), coralBits);
  instanced(group, fanGeo, mat(0xffffff, { side: THREE.DoubleSide, roughness: 0.8 }), coralFans, { cast: false });

  // ---------- Luchtbellen ----------
  const bubbleM = new THREE.MeshPhongMaterial({ color: 0xd0f4ff, transparent: true, opacity: 0.55, shininess: 120, specular: 0xffffff, depthWrite: false });
  const bubbleGeo = new THREE.SphereGeometry(0.55, 14, 10), smallGeo = new THREE.SphereGeometry(0.12, 6, 4);
  // grote bellen om te pakken (op verschillende hoogtes!)
  const BUBBLES = [
    [-3, 23, 1.0], [7, 17, 4.6], [-15, 13, 2.5], [4, 8, 1.2], [-9, 3.5, 4.8], [12, -1, 0.8],
    [-6, -8, 4.5], [8, -13, 1.0], [-14, -19, 3.5], [10, -23, 5.0], [-4, -33, 2.0], [6, -36, 0.8],
    [-7, -45, 3.0], [7, -47, 1.2], [0, -58, 4.5],
  ];
  const bubbles = BUBBLES.map(([x, z, y]) => {
    const m = new THREE.Mesh(bubbleGeo, bubbleM);
    m.position.set(x, y, z);
    group.add(m);
    return { x, y, z, m, back: 0 };
  });
  // bellenbronnen op de bodem: zwem door de bellen en je lucht loopt weer vol
  const VENTS = [[6, 15], [-6, 6], [0, -6], [-11, -24], [9, -30], [-7.5, -43], [7.5, -44]];
  const ventM = mat(0x495057, { roughness: 1, flatShading: true });
  const vents = VENTS.map(([x, z]) => {
    mesh(new THREE.CylinderGeometry(0.45, 0.8, 0.5, 7), ventM, x, 0.25, z, group);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x99e9f2, transparent: true, opacity: 0.6, depthWrite: false }));
    ring.position.set(x, 0.06, z);
    group.add(ring);
    const rising = Array.from({ length: 12 }, (_, i) => {
      const b = new THREE.Mesh(smallGeo, bubbleM);
      b.position.set(x, (i / 12) * SURFACE, z);
      group.add(b);
      return { b, k: i / 12, ox: (rand() - 0.5) * 0.8, oz: (rand() - 0.5) * 0.8 };
    });
    return { x, z, r: 1.3, rising, ring };
  });

  // ---------- Schatkisten ----------
  const chestM = mat(0x8b5a2b), bandM = mat(0xffc300, { metalness: 0.4 });
  const chests = CHESTS.map((c) => {
    const g = new THREE.Group();
    const s = c.ship ? 1.4 : 1;
    mesh(new THREE.BoxGeometry(1.0 * s, 0.6 * s, 0.7 * s), chestM, 0, 0.3 * s, 0, g);
    mesh(new THREE.BoxGeometry(1.05 * s, 0.08 * s, 0.75 * s), bandM, 0, 0.45 * s, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.6 * s, -0.35 * s); g.add(lid);
    mesh(new THREE.BoxGeometry(1.0 * s, 0.25 * s, 0.7 * s), chestM, 0, 0.12 * s, 0.35 * s, lid);
    mesh(new THREE.BoxGeometry(0.16 * s, 0.18 * s, 0.06 * s), bandM, 0, 0.05 * s, 0.72 * s, lid);
    g.position.set(c.x, 0, c.z);
    group.add(g);
    allColliders.push({ x: c.x, z: c.z, r: 0.55 * s, h: 0.8 * s });
    return { ...c, g, lid, opened: false, k: 0 };
  });

  // ---------- Ingang: portaal terug naar de woestijn en een bord ----------
  const portal = makePortal(group, 0, B.maxZ - 2.2, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  talkables.push(makeSignpost(group, {
    id: 'bord-zee', x: 5.2, z: B.maxZ - 7.5, title: 'ONDER WATER', color: '#1c7ed6',
    lines: [
      'DE ONDERWATERWERELD',
      'Diep in de trog woont Reuzeninktvis Inka. Zij bewaakt stukje 4 van de schatkaart!',
      'Zwem omhoog en omlaag met ⬆️ en ⬇️ (laptop: R en F). Kijk naar je LUCHTMETER: buiten de lagune loopt hij leeg!',
      'Pak luchtbellen of zwem door een bellenbron. Pas op voor kwallen, haaien en de stroming. Vlak bij de bodem is de stroming zwak.',
    ],
  }));

  // visjes en belletjes in het water
  updaters.push(makeFloaters(group, { count: 70, color: 0xe3fafc, area: { x: 0, z: -12, w: W, d: B.maxZ - B.minZ }, height: [0.3, SURFACE], size: 0.09 }));
  const fishM = [0xffa94d, 0x74c0fc, 0xffe066, 0xf783ac].map((c) => mat(c));
  const fishGeo = new THREE.ConeGeometry(0.18, 0.55, 5).rotateZ(-Math.PI / 2);
  const fish = Array.from({ length: 26 }, (_, i) => {
    const m = new THREE.Mesh(fishGeo, fishM[i % 4]);
    group.add(m);
    return { m, cx: (rand() - 0.5) * 36, cz: B.maxZ - 6 - rand() * 90, y: 1 + rand() * 4.5, r: 2 + rand() * 3, sp: (0.4 + rand() * 0.5) * (rand() < 0.5 ? -1 : 1), ph: rand() * 6 };
  });

  // ---------- Zone ----------
  const inLagoon = (p) => p.z > LAGOON_Z;
  const zone = {
    id: 'onderwater', name: 'De Onderwaterwereld', group, colliders, boxes, talkables, npcs: [],
    bounds: { ...B },
    music: 'onderwater',
    swim: true,
    env: { sky: [0x0b3d63, 0x2fa3c7], fog: [0x0d5a7a, 14, 52], hemi: [0xbdeeff, 0x1d4e5f, 1.15], sun: [0xc5f6fa, 1.5], cam: [0, 10, 10] },
    spawns: { fromWoestijn: { x: 0, z: B.maxZ - 5.5, rot: Math.PI } },
    exit: { x: 0, z: B.maxZ - 2.0 },
    chests, bubbles, vents, trench: TRENCH, wreck: WRECK,
    boss: { x: TRENCH.x, z: TRENCH.z - 2 },
    heartSpots: [{ x: 3, z: 3 }, { x: -3, z: -39 }, { x: 3, z: -39 }],
    // haaien zwemmen heen en weer, kwallen drijven op en neer
    sharkSpots: [{ x: -8, z: -9, y: 3.2, len: 9 }, { x: 8, z: -14, y: 2.6, len: 8 }, { x: -2, z: -21, y: 3.6, len: 12 }, { x: 4, z: -34, y: 2.4, len: 10 }],
    jellySpots: [[-4, 22], [10, 21], [-17, 16], [2, 14], [-10, 9], [14, 7], [-2, -24], [13, -26], [-13, -30], [0, -39]].map(([x, z]) => ({ x, z })),
    labels: [
      { x: 0, z: B.maxZ - 4, text: 'Lagune' }, { x: -13, z: (REEF.z1 + REEF.z2) / 2, text: 'Koraalrif' },
      { x: 0, z: (CURRENT.z1 + CURRENT.z2) / 2, text: 'Stroming' }, { x: 0, z: WRECK.z + 6, text: 'Gezonken schip' }, { x: 0, z: TRENCH.z, text: 'Diepe trog' },
    ],
    inLagoon,
    inTrench: (p) => Math.hypot(p.x - TRENCH.x, p.z - TRENCH.z) < TRENCH.r + 1,
    inWreck: (p) => Math.abs(p.x - WRECK.x) < WRECK.hx && Math.abs(p.z - WRECK.z) < WRECK.hz,
    inVent: (p) => vents.find((v) => Math.hypot(p.x - v.x, p.z - v.z) < v.r) || null,
    onUrchins: (p) => p.z > CURRENT.z1 && p.z < CURRENT.z2 && Math.abs(p.x) > URCHIN_X && (p.y ?? 0) < 1.0,
    // de stroming op deze plek (en deze hoogte): { x, z } in meter per seconde
    currentAt(p) {
      const b = CURRENT_BANDS.find((q) => p.z > q.z1 && p.z <= q.z2);
      if (!b) return null;
      const k = (p.y ?? 0) < KELP_Y ? 0.22 : 1;
      return { x: b.dir * CURRENT_SPEED * k, z: 0, dir: b.dir, weak: k < 1 };
    },
    // hoe hoog je zwemt bepaalt waar je tegenaan botst (zwem over het koraal heen!)
    setDepth(y) {
      colliders.length = 0; boxes.length = 0;
      for (const c of allColliders) if (c.h > y + 0.25) colliders.push(c);
      for (const b of allBoxes) if (b.h > y + 0.25) boxes.push(b);
    },
    allColliders, allBoxes,
    // een luchtbel pakken? (geeft de bel terug)
    takeBubble(p) {
      for (const b of bubbles) {
        if (b.back > 0) continue;
        if (Math.hypot(p.x - b.x, p.z - b.z) < 1.3 && Math.abs((p.y ?? 0) + 0.8 - b.y) < 1.4) { b.back = BUBBLE_BACK; b.m.visible = false; return b; }
      }
      return null;
    },
    reset() { for (const b of bubbles) { b.back = 0; b.m.visible = true; } },
    applyState(st) { for (const c of chests) { const o = st.chests.includes(c.id); c.opened = o; c.k = o ? 1 : 0; c.lid.rotation.x = -1.9 * c.k; } },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      surf.position.y = SURFACE + 1.4 + Math.sin(t * 0.8) * 0.08;
      surfM.opacity = 0.24 + Math.sin(t * 1.3) * 0.05;
      for (const k of kelp) k.m.rotation.z = Math.sin(t * 1.6 + k.ph) * 0.25 + 0.2 * (CURRENT_BANDS.find((b) => k.z > b.z1 && k.z <= b.z2)?.dir || 0);
      for (const s of streaks) {
        s.x += s.b.dir * CURRENT_SPEED * s.v * dt * 1.4;
        if (s.x > B.maxX + 2) s.x = B.minX - 2; if (s.x < B.minX - 2) s.x = B.maxX + 2;
        s.m.position.x = s.x;
      }
      for (const b of bubbles) {
        if (b.back > 0) { b.back -= dt; if (b.back <= 0) b.m.visible = true; }
        b.m.position.y = b.y + Math.sin(t * 2 + b.x) * 0.15;
        b.m.scale.setScalar(1 + Math.sin(t * 3 + b.z) * 0.06);
      }
      for (const v of vents) {
        for (const r of v.rising) {
          r.k = (r.k + dt * 0.35) % 1;
          r.b.position.set(v.x + r.ox + Math.sin(t * 3 + r.k * 9) * 0.15, r.k * SURFACE, v.z + r.oz);
        }
        v.ring.material.opacity = 0.4 + Math.sin(t * 3) * 0.2;
      }
      for (const f of fish) {
        const a = t * f.sp + f.ph;
        f.m.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(t + f.ph) * 0.3, f.cz + Math.sin(a) * f.r);
        f.m.rotation.y = -a + (f.sp > 0 ? 0 : Math.PI);
      }
      for (const c of chests) { c.k += ((c.opened ? 1 : 0) - c.k) * Math.min(1, dt * 4); c.lid.rotation.x = -1.9 * c.k; }
    },
  };
  zone.setDepth(0);
  // de kaart
  zone.drawMap = (g, px, pz, scale) => {
    g.fillStyle = '#1c6e8c';
    g.fillRect(px(B.minX), pz(B.minZ), W * scale, (B.maxZ - B.minZ) * scale);
    g.fillStyle = '#4dabf7';
    g.fillRect(px(B.minX), pz(LAGOON_Z), W * scale, (B.maxZ - LAGOON_Z) * scale);
    g.fillStyle = '#1971c2';
    g.fillRect(px(B.minX), pz(CURRENT.z1), W * scale, (CURRENT.z2 - CURRENT.z1) * scale);
    g.fillStyle = '#e8590c';
    for (const b of allBoxes) if (b.h < 4) g.fillRect(px(b.x - b.hw), pz(b.z - b.hd), b.hw * 2 * scale, b.hd * 2 * scale);
    g.fillStyle = '#8b5a2b';
    g.fillRect(px(WRECK.x - WRECK.hx), pz(WRECK.z - WRECK.hz), WRECK.hx * 2 * scale, WRECK.hz * 2 * scale);
    g.fillStyle = '#495057';
    for (const c of allColliders) { if (c.r < 1) continue; g.beginPath(); g.arc(px(c.x), pz(c.z), c.r * scale, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#243b53';
    g.beginPath(); g.arc(px(TRENCH.x), pz(TRENCH.z), TRENCH.r * scale, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#99e9f2';
    for (const v of vents) { g.beginPath(); g.arc(px(v.x), pz(v.z), 3, 0, Math.PI * 2); g.fill(); }
    for (const c of chests) { g.fillStyle = c.opened ? '#7a5c34' : '#ffc300'; g.fillRect(px(c.x) - 3, pz(c.z) - 3, 6, 6); }
  };
  return zone;
}

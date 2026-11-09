// De Junglewereld (hoofdstuk 9, idee van Dex): wereld 7 van de schatkaart. Groen, wild en nog moeilijker dan het spookkasteel!
// Van de ingang (zuid) naar de Arenatempel (noord):
//   1. Het Kamp: gras, bomen en een bord. Hier kom je binnen vanuit de woestijn.
//   2. De Rivier: te diep om doorheen te lopen! Gebruik de LIANEN (🌿) om eroverheen te ZWAAIEN.
//   3. De Tempelruïnes: twee VERBORGEN TEMPELS (oost en west). In de westelijke zit een geheime deur achter een standbeeld.
//   4. De Dichte Jungle: nog een liaan over een kloof, struiken en jungle-slijmpjes.
//   5. De Arenatempel: hier woont Reuzenaap Rokko (zie ape.js). Hij bewaakt stukje 7.
// Overal springen JUNGLE-slijmpjes rond. Er staan 3 schatkisten. De Wolkenflitser mag hier niet komen (dan vlieg je over de lianen heen).
// Wil je iets verplaatsen? De belangrijkste plekken staan hieronder.
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, seeded } from './props.js';
import { makePortal } from './world.js';
import { instanced } from './optimize.js';

export const JUNGLE_BOUNDS = { minX: -24, maxX: 24, minZ: -66, maxZ: 38 };
export const RIVER = { z1: 10, z2: 18 };                 // de rivier (te diep!)
export const RUINS = { z1: -10, z2: 10 };                // tempelruïnes
export const DENSE = { z1: -34, z2: -10 };               // dichte jungle
export const ARENA = { x: 0, z: -52, r: 11 };            // de Arenatempel van Rokko
// lianen: van A naar B zwaaien (of andersom). h = hoe hoog je zwaait
export const VINES = [
  { id: 'rivier', ax: -2.5, az: 19.2, bx: -2.5, bz: 8.8, h: 3.6 },   // over de rivier
  { id: 'rivier2', ax: 6.5, az: 19.2, bx: 6.5, bz: 8.8, h: 3.6 },
  { id: 'kloof', ax: 0, az: -9.2, bx: 0, bz: -18.5, h: 3.2 },         // over de kloof naar de dichte jungle
];
// verborgen tempels: west heeft een geheime deur (standbeeld)
export const TEMPLES = [
  { id: 'oost', x: 14, z: 0, rot: -0.4, secret: false },
  { id: 'west', x: -14, z: -2, rot: 0.5, secret: true },
];
export const CHESTS = [
  { id: 'jkist1', x: 14.2, z: 0.4, n: 30, temple: 'oost' },
  { id: 'jkist2', x: -14.2, z: -2.6, n: 55, temple: 'west', secret: true },
  { id: 'jkist3', x: 8.5, z: -28, n: 35 },
];
export const SWING_TIME = 1.15; // seconden om van A naar B te zwaaien

export function createJungle(group) {
  const rand = seeded(2077);
  const B = JUNGLE_BOUNDS;
  const colliders = [], boxes = [], updaters = [], talkables = [];

  // ---------- Grond: weelderig groen gras ----------
  const groundGeo = new THREE.PlaneGeometry(160, 200, 48, 60).rotateX(-Math.PI / 2);
  groundGeo.translate(0, 0, -14);
  const gp = groundGeo.attributes.position, colors = [];
  const cA = new THREE.Color(0x3d8b4f), cB = new THREE.Color(0x2f6b3a), cC = new THREE.Color(0x4ea05c), cMud = new THREE.Color(0x6b5344);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const out = Math.abs(x) > B.maxX + 2 || z > B.maxZ + 2 || z < B.minZ - 2;
    const r = rand();
    const c = out ? cMud.clone().lerp(cB, 0.3) : (r < 0.35 ? cA : r < 0.7 ? cB : cC);
    // rivier: bruinig waterkleurige grond eronder
    if (z > RIVER.z1 && z < RIVER.z2 && Math.abs(x) < 22) c.copy(new THREE.Color(0x2a5a3a));
    colors.push(c.r, c.g, c.b);
    if (out) gp.setY(i, (rand() - 0.5) * 1.4);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = mesh(groundGeo, mat(0xffffff, { vertexColors: true, flatShading: true, roughness: 1 }), 0, 0, 0, group);
  ground.castShadow = false;

  // ---------- Rivier (blauw water) ----------
  const waterM = mat(0x1c7ed6, { transparent: true, opacity: 0.72, roughness: 0.4, metalness: 0.15, roughness: 0.25 });
  const water = mesh(new THREE.PlaneGeometry(44, RIVER.z2 - RIVER.z1 - 0.4).rotateX(-Math.PI / 2), waterM, 0, 0.08, (RIVER.z1 + RIVER.z2) / 2, group);
  water.castShadow = false;
  // kloof (donkere spleet tussen ruïnes en dichte jungle)
  const gap = mesh(new THREE.PlaneGeometry(28, 8.5).rotateX(-Math.PI / 2), mat(0x1a1208, { roughness: 1 }), 0, -0.4, -13.8, group);
  gap.castShadow = false;

  // ---------- Bomen (palm + bladboom) ----------
  const trunkM = mat(0x6b4226), leafM = mat(0x2f9e44), leaf2M = mat(0x37b24d);
  const trunks = [], crowns = [];
  const placeTree = (x, z, s = 1) => {
    trunks.push({ x, y: 1.4 * s, z, sx: 0.35 * s, sy: 2.8 * s, sz: 0.35 * s });
    crowns.push({ x, y: 3.1 * s, z, sx: 1.6 * s, sy: 1.3 * s, sz: 1.6 * s });
    colliders.push({ x, z, r: 0.55 * s });
  };
  // bomen rondom (niet in pad, rivier, arena of tempels)
  for (let i = 0; i < 55; i++) {
    const x = (rand() - 0.5) * 44, z = B.maxZ - 4 - rand() * (B.maxZ - B.minZ - 8);
    if (Math.abs(x) < 4 && z > 20) continue; // pad bij kamp
    if (z > RIVER.z1 - 1 && z < RIVER.z2 + 1) continue;
    if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 2) continue;
    if (TEMPLES.some((t) => Math.hypot(x - t.x, z - t.z) < 5)) continue;
    if (Math.abs(x) < 3.5 && z < -8 && z > -20) continue; // kloof-pad
    placeTree(x, z, 0.75 + rand() * 0.55);
  }
  instanced(group, new THREE.CylinderGeometry(1, 1, 1, 6), trunkM, trunks);
  instanced(group, new THREE.IcosahedronGeometry(1, 0), leafM, crowns.filter((_, i) => i % 2 === 0));
  instanced(group, new THREE.IcosahedronGeometry(1, 0), leaf2M, crowns.filter((_, i) => i % 2 === 1));

  // ---------- Lianen ----------
  const vineM = mat(0x5c7c3a, { roughness: 0.9 });
  const vines = VINES.map((v) => {
    const g = new THREE.Group();
    const midX = (v.ax + v.bx) / 2, midZ = (v.az + v.bz) / 2;
    const len = Math.hypot(v.bx - v.ax, v.bz - v.az);
    // hangende lus (een gebogen "touw")
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(v.ax, 0.2, v.az),
      new THREE.Vector3(midX, v.h + 0.8, midZ),
      new THREE.Vector3(v.bx, 0.2, v.bz),
    );
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.08, 5, false), vineM);
    tube.castShadow = true;
    g.add(tube);
    // blaadjes aan de liaan
    for (let i = 1; i <= 4; i++) {
      const p = curve.getPoint(i / 5);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), leafM);
      leaf.scale.set(1.4, 0.5, 0.9);
      leaf.position.copy(p);
      g.add(leaf);
    }
    // grijp-markers (lichtgroene ringetjes op de grond)
    for (const [x, z] of [[v.ax, v.az], [v.bx, v.bz]]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.75, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x8ce99a, transparent: true, opacity: 0.55, depthWrite: false }),
      );
      ring.position.set(x, 0.06, z);
      g.add(ring);
    }
    group.add(g);
    return { ...v, g, midX, midZ, len };
  });

  // ---------- Verborgen tempels (stenen bouwsel) ----------
  const stoneM = mat(0x9a8b6e, { flatShading: true, roughness: 0.95 });
  const darkStone = mat(0x6d5f48, { flatShading: true, roughness: 1 });
  const goldM = mat(0xffc300, { metalness: 0.45, roughness: 0.25, emissive: 0x553300, emissiveIntensity: 0.35 });
  const temples = TEMPLES.map((t) => {
    const g = new THREE.Group();
    g.position.set(t.x, 0, t.z);
    g.rotation.y = t.rot;
    // basis + muren
    mesh(new THREE.BoxGeometry(7.2, 0.35, 7.2), darkStone, 0, 0.15, 0, g);
    for (const [x, z, w, d] of [[0, -3.2, 7.2, 0.7], [0, 3.2, 7.2, 0.7], [-3.2, 0, 0.7, 5.8], [3.2, 0, 0.7, 5.8]]) {
      mesh(new THREE.BoxGeometry(w, 2.6, d), stoneM, x, 1.45, z, g);
    }
    // dak / trapgevel
    mesh(new THREE.ConeGeometry(5.2, 2.2, 4), darkStone, 0, 3.6, 0, g).rotation.y = Math.PI / 4;
    // deuropening (zuidkant van de tempel)
    mesh(new THREE.BoxGeometry(2.2, 2.2, 0.5), mat(0x1a1208), 0, 1.2, 3.15, g);
    // pilaren
    for (const sx of [-2.2, 2.2]) mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.8, 6), stoneM, sx, 1.5, 2.6, g);
    // gouden detail boven de deur
    mesh(new THREE.BoxGeometry(1.6, 0.25, 0.3), goldM, 0, 2.5, 3.2, g);
    group.add(g);
    // botsing rond de tempel (opening aan de voorkant blijft vrij)
    const cos = Math.cos(t.rot), sin = Math.sin(t.rot);
    const toW = (lx, lz) => ({ x: t.x + lx * cos - lz * sin, z: t.z + lx * sin + lz * cos });
    for (const [lx, lz, r] of [[-3.2, 0, 0.7], [3.2, 0, 0.7], [0, -3.2, 0.8], [-2.4, 2.6, 0.5], [2.4, 2.6, 0.5]]) {
      const w = toW(lx, lz); colliders.push({ x: w.x, z: w.z, r });
    }
    boxes.push({ x: t.x, z: t.z, hw: 3.6, hd: 3.6, h: 4.5, off: false, soft: true });
    // standbeeld bij geheime tempel
    let statue = null;
    if (t.secret) {
      const sg = new THREE.Group();
      const wp = toW(0, -1.5);
      sg.position.set(wp.x, 0, wp.z);
      mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8), stoneM, 0, 0.15, 0, sg);
      mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.4, 6), stoneM, 0, 1.0, 0, sg);
      mesh(new THREE.SphereGeometry(0.38, 8, 6), stoneM, 0, 1.95, 0, sg);
      mesh(new THREE.BoxGeometry(0.7, 0.15, 0.15), goldM, 0, 2.2, 0.15, sg); // kroon
      group.add(sg);
      colliders.push({ x: wp.x, z: wp.z, r: 0.55 });
      statue = {
        id: 'standbeeld', name: 'Stenen standbeeld', voice: 0.7, mesh: sg, pos: sg.position,
        sign: true, jungleSecret: true,
        lines: [
          'EEN STENEN STANDBEELD',
          'Het standbeeld kijkt streng. Op de sokkel staat: "Duw me opzij voor het geheim."',
          'Je duwt... en er gaat een steen open!',
        ],
      };
      talkables.push(statue);
    }
    return { ...t, g, statue, secretOpen: false };
  });

  // geheime steen (verborgen kistkamer) bij west-tempel
  const secretDoor = (() => {
    const t = temples.find((x) => x.secret);
    const cos = Math.cos(t.rot), sin = Math.sin(t.rot);
    const lx = 0, lz = -2.4;
    const x = t.x + lx * cos - lz * sin, z = t.z + lx * sin + lz * cos;
    const m = mesh(new THREE.BoxGeometry(2.4, 2.2, 0.5), darkStone, x, 1.2, z, group);
    const col = { x, z, r: 1.1 };
    colliders.push(col);
    return { m, col, x, z, open: false };
  })();

  // ---------- Schatkisten ----------
  const chestM = mat(0x8b5a2b), bandM = mat(0x40c057, { metalness: 0.35 });
  const chests = CHESTS.map((c) => {
    const g = new THREE.Group();
    const s = c.secret ? 1.25 : 1;
    mesh(new THREE.BoxGeometry(1.0 * s, 0.6 * s, 0.7 * s), chestM, 0, 0.3 * s, 0, g);
    mesh(new THREE.BoxGeometry(1.05 * s, 0.08 * s, 0.75 * s), bandM, 0, 0.45 * s, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.6 * s, -0.35 * s); g.add(lid);
    mesh(new THREE.BoxGeometry(1.0 * s, 0.25 * s, 0.7 * s), chestM, 0, 0.12 * s, 0.35 * s, lid);
    mesh(new THREE.BoxGeometry(0.16 * s, 0.18 * s, 0.06 * s), bandM, 0, 0.05 * s, 0.72 * s, lid);
    g.position.set(c.x, 0, c.z);
    if (c.secret) g.visible = false; // pas zichtbaar als geheime deur open is
    group.add(g);
    colliders.push({ x: c.x, z: c.z, r: 0.5 * s });
    return { ...c, g, lid, opened: false, k: 0 };
  });

  // ---------- Arenatempel (ronde stenen ring) ----------
  const arenaRing = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (i === 0) continue; // opening zuid
    const px = ARENA.x + Math.cos(a) * (ARENA.r + 0.4), pz = ARENA.z + Math.sin(a) * (ARENA.r + 0.4);
    mesh(new THREE.BoxGeometry(1.8, 2.4, 0.7), stoneM, px, 1.2, pz, arenaRing);
    colliders.push({ x: px, z: pz, r: 0.85 });
  }
  // vloer van de arena
  mesh(new THREE.CircleGeometry(ARENA.r, 28).rotateX(-Math.PI / 2), mat(0x7a6a4e, { flatShading: true, roughness: 1 }), ARENA.x, 0.02, ARENA.z, arenaRing);
  // totem in het midden (decoratie, geen botsing met baas)
  mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 8), darkStone, ARENA.x, 0.2, ARENA.z - 7.5, arenaRing);
  mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 6), stoneM, ARENA.x, 1.4, ARENA.z - 7.5, arenaRing);
  mesh(new THREE.SphereGeometry(0.45, 8, 6), stoneM, ARENA.x, 2.7, ARENA.z - 7.5, arenaRing);
  colliders.push({ x: ARENA.x, z: ARENA.z - 7.5, r: 0.7 });
  group.add(arenaRing);

  // ---------- Ingang: portaal en bord ----------
  const portal = makePortal(group, 0, B.maxZ - 2.2, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  talkables.push(makeSignpost(group, {
    id: 'bord-jungle', x: 5.2, z: B.maxZ - 7.5, title: 'JUNGLEWERELD', color: '#2f9e44',
    lines: [
      'DE JUNGLEWERELD',
      'Achterin, in de Arenatempel, woont Reuzenaap Rokko. Hij bewaakt stukje 7 van de schatkaart!',
      'De RIVIER is te diep. Gebruik de groene LIANEN: ga op het ringetje staan en druk op Praat/Lezen om te zwaaien!',
      'Er zijn VERBORGEN TEMPELS tussen de bomen. Bij één tempel staat een standbeeld... dat houdt een geheim.',
      'Pas op voor de jungle-slijmpjes. En onthoud: geen vliegende auto hier!',
    ],
  }));

  // lianen als praatbare dingen (Praat/Lezen = zwaaien)
  for (const v of vines) {
    for (const [end, x, z] of [['a', v.ax, v.az], ['b', v.bx, v.bz]]) {
      talkables.push({
        id: `liaan-${v.id}-${end}`, name: 'Liaan', voice: 1.3,
        pos: { x, z }, mesh: v.g, sign: true, vine: v.id, vineEnd: end,
        lines: ['EEN LIAAN', 'Je grijpt de liaan... en zwaait naar de overkant! 🌿'],
        distanceTo(p) { return Math.hypot(p.x - x, p.z - z); },
      });
    }
  }

  // ---------- Zone ----------
  const inRiver = (p) => p.z > RIVER.z1 + 0.3 && p.z < RIVER.z2 - 0.3 && Math.abs(p.x) < 21;
  const inGap = (p) => p.z > -17.5 && p.z < -10.5 && Math.abs(p.x) < 12;
  const inArena = (p) => Math.hypot(p.x - ARENA.x, p.z - ARENA.z) < ARENA.r + 0.6;
  const zone = {
    id: 'jungle', name: 'De Junglewereld', group, colliders, boxes, talkables, npcs: [],
    bounds: { ...B },
    music: 'jungle',
    env: { sky: [0x4ea8de, 0xc8f0c8], fog: [0xb8e0b0, 28, 78], hemi: [0xffffee, 0x3d8b4f, 1.2], sun: [0xfff6d0, 2.2], cam: [0, 10, 11] },
    spawns: { fromWoestijn: { x: 0, z: B.maxZ - 5.5, rot: Math.PI } },
    exit: { x: 0, z: B.maxZ - 2.0 },
    chests, vines, temples, secretDoor, arena: ARENA,
    boss: { x: ARENA.x, z: ARENA.z - 1.5 },
    focus: { x: 0, z: 0 },
    heartSpots: [{ x: -8, z: 28 }, { x: 10, z: 6 }, { x: -10, z: -6 }, { x: 4, z: -30 }, { x: -3, z: -48 }],
    slimeSpots: [[-7, 26], [8, 24], [-10, 6], [11, 5], [-6, -4], [7, -6], [-8, -22], [9, -24], [-4, -36], [5, -40], [-2, -48], [3, -50]].map(([x, z]) => ({ x, z, kind: 'jungle' })),
    labels: [
      { x: 0, z: B.maxZ - 4, text: 'Kamp' }, { x: 0, z: (RIVER.z1 + RIVER.z2) / 2, text: 'Rivier' },
      { x: 14, z: 0, text: 'Tempel' }, { x: -14, z: -2, text: 'Tempel' },
      { x: 0, z: -24, text: 'Jungle' }, { x: 0, z: ARENA.z, text: 'Arenatempel' },
    ],
    inArena, inRiver, inGap,
    // zwaai-status (wordt door main.js gezet)
    swing: null, // { vineId, from, to, t, T, sx,sz, ex,ez }
    lastSafe: { x: 0, z: B.maxZ - 5.5 },
    setSecretOpen(yes) {
      secretDoor.open = !!yes;
      secretDoor.m.visible = !yes;
      secretDoor.col.r = yes ? 0.01 : 1.1;
      const c = chests.find((q) => q.secret);
      if (c) c.g.visible = !!yes;
      const t = temples.find((q) => q.secret);
      if (t) t.secretOpen = !!yes;
    },
    startSwing(vineId, fromEnd) {
      const v = vines.find((q) => q.id === vineId);
      if (!v || zone.swing) return false;
      const fromA = fromEnd === 'a';
      zone.swing = {
        vineId, t: 0, T: SWING_TIME,
        sx: fromA ? v.ax : v.bx, sz: fromA ? v.az : v.bz,
        ex: fromA ? v.bx : v.ax, ez: fromA ? v.bz : v.az,
        h: v.h, midX: v.midX, midZ: v.midZ,
      };
      return true;
    },
    // tijdens het zwaaien: waar is de speler? (en hoe hoog)
    swingPos() {
      const s = zone.swing; if (!s) return null;
      const k = Math.min(1, s.t / s.T);
      const ease = Math.sin(k * Math.PI); // omhoog in het midden
      const x = s.sx + (s.ex - s.sx) * k;
      const z = s.sz + (s.ez - s.sz) * k;
      const y = ease * s.h;
      return { x, z, y, k, done: k >= 1 };
    },
    reset() { zone.swing = null; },
    applyState(st) {
      for (const c of chests) {
        const o = st.chests.includes(c.id);
        c.opened = o; c.k = o ? 1 : 0; c.lid.rotation.x = -1.9 * c.k;
      }
      zone.setSecretOpen(!!st.secret);
    },
    // ster op de kaart: naar de volgende tip
    goal(st) {
      if (st.ape) return ARENA;
      if (!st.secret) {
        const west = temples.find((t) => t.secret);
        return { x: west.x, z: west.z };
      }
      return { x: ARENA.x, z: ARENA.z };
    },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      // kist-animatie
      for (const c of chests) {
        if (c.opened && c.k < 1) { c.k = Math.min(1, c.k + dt * 2.2); c.lid.rotation.x = -1.9 * c.k; }
      }
      // water wiebelen
      water.position.y = 0.08 + Math.sin(t * 1.4) * 0.03;
    },
  };
  return zone;
}

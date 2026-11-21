// De Ruimtewereld (hoofdstuk 10, idee van Dex): wereld 8 van de schatkaart. Planeten, sterren en aliens. Nog moeilijker dan de jungle!
// Je staat op zwevende planeetjes boven de lege ruimte. Er is WEINIG ZWAARTEKRACHT: je zweeft een beetje
// (je glijdt door) en je kunt heel hoog SPRINGEN (🚀-knop, of J/Shift op het toetsenbord).
// Van de ingang (zuid) naar het Moederschip (noord):
//   1. De Ruimtebasis: hier kom je binnen vanuit de woestijn.
//   2. Planetoïdes: kleine steentjes in de ruimte. SPRING van steen naar steen! Val je in de ruimte? Dan kost dat een hartje.
//   3. De Maanplaneet: ruimteslijmpjes en de eerste laser-alien.
//   4. Het Meteorietenveld (Ringplaneet): hier vallen steeds METEORIETEN. Kijk naar de oranje rondjes!
//   5. De Alienplaneet: laser-aliens. Zie je een rode streep? Daar komt een laser: SPRING eroverheen of ga opzij!
//   6. Het Moederschip-platform: hier vecht je tegen Ufo Udo, en daarna tegen Alien Astro (zie ufo.js). Zij bewaken stukje 8.
// Er staan 3 schatkisten. De Wolkenflitser mag hier niet komen (dan vlieg je zo over alles heen).
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, seeded } from './props.js';
import { makePortal } from './world.js';

export const SPACE_BOUNDS = { minX: -26, maxX: 26, minZ: -96, maxZ: 36 };
// Alle planeten en steentjes waar je op kunt staan (rondjes: x, z, r). Daartussen is de lege ruimte!
export const PLATFORMS = [
  { id: 'basis', x: 0, z: 25, r: 9.5, kind: 'basis' },        // Ruimtebasis (ingang)
  { id: 'steen1', x: -2, z: 11.2, r: 2.5, kind: 'steen' },
  { id: 'steen2', x: 3, z: 4.6, r: 2.5, kind: 'steen' },
  { id: 'maan', x: 0, z: -8, r: 7, kind: 'maan' },            // Maanplaneet
  { id: 'ring', x: 0, z: -27, r: 8, kind: 'ring' },           // Meteorietenveld
  { id: 'steen3', x: -5, z: -39.4, r: 2.1, kind: 'steen' },
  { id: 'steen4', x: 2, z: -45.2, r: 2.1, kind: 'steen' },
  { id: 'alien', x: 0, z: -57, r: 7.5, kind: 'alien' },       // Alienplaneet
  { id: 'steen5', x: 5, z: -68, r: 2.1, kind: 'steen' },
  { id: 'schip', x: 0, z: -82, r: 11.5, kind: 'schip' },      // Moederschip-platform (de baas)
];
export const ARENA = { x: 0, z: -82, r: 11 };
export const METEOR_FIELD = { x: 0, z: -27, r: 9 };
export const CHESTS = [
  { id: 'rkist1', x: -5, z: -11.5, n: 40 },
  { id: 'rkist2', x: 6, z: -31, n: 50 },
  { id: 'rkist3', x: -5.4, z: -60, n: 60 },
];
// hoe springen werkt (weinig zwaartekracht!)
export const JUMP_V = 6.6;     // zo hard spring je omhoog
export const GRAVITY = 6.8;    // zo hard trekt de planeet je terug (op aarde zou dit veel meer zijn)
export const SPACE_GRIP = 4.2; // je zweeft een beetje: je snelheid verandert langzaam (op glad ijs is het 1,3)
export const AIR_GRIP = 2.2;   // in de lucht stuur je nog minder
export const FALL_Y = -6;      // zo diep val je, dan word je teruggezet (en kost het een hartje)
export const METEOR_R = 1.6, METEOR_T = 1.35;
export const LASER_ALIENS = [
  { x: 4, z: -5, home: 'maan' },
  { x: -4, z: -54, home: 'alien' },
  { x: 4.5, z: -59, home: 'alien' },
  { x: 0, z: -62, home: 'alien' },
];

export function onPlatform(p, pad = 0) {
  for (const q of PLATFORMS) if (Math.hypot(p.x - q.x, p.z - q.z) < q.r + pad) return q;
  return null;
}

export function createSpace(group) {
  const rand = seeded(2088);
  const B = SPACE_BOUNDS;
  const colliders = [], boxes = [], updaters = [], talkables = [];

  // ---------- Sterren (bewegen mee met de speler, zo lijken ze heel ver weg) ----------
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 700; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = 110;
    const s = Math.sqrt(1 - u * u);
    sp.push(Math.cos(a) * s * r, u * r, Math.sin(a) * s * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
  group.add(stars);
  // verre planeten (alleen om naar te kijken)
  const far = new THREE.Group();
  const ringed = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 1), new THREE.MeshBasicMaterial({ color: 0xf4a261, fog: false }));
  ringed.position.set(-70, 10, -60); far.add(ringed);
  const ring = new THREE.Mesh(new THREE.RingGeometry(18, 25, 32), new THREE.MeshBasicMaterial({ color: 0xffd8a8, side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false }));
  ring.position.copy(ringed.position); ring.rotation.x = 1.2; ring.rotation.y = 0.3; far.add(ring);
  const blue = new THREE.Mesh(new THREE.IcosahedronGeometry(8, 1), new THREE.MeshBasicMaterial({ color: 0x4dabf7, fog: false }));
  blue.position.set(75, -5, -20); far.add(blue);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 0), new THREE.MeshBasicMaterial({ color: 0xdee2e6, fog: false }));
  moon.position.set(40, 30, 60); far.add(moon);
  group.add(far);

  // ---------- Planeten en planetoïdes ----------
  const looks = {
    basis: { top: 0x868e96, side: 0x495057 },
    steen: { top: 0xa1887f, side: 0x6d4c41 },
    maan: { top: 0xced4da, side: 0x868e96 },
    ring: { top: 0xe8590c, side: 0x9c3d08 },
    alien: { top: 0x82c91e, side: 0x5c940d },
    schip: { top: 0x5f3dc4, side: 0x343a40 },
  };
  const bobbers = [];
  for (const q of PLATFORMS) {
    const L = looks[q.kind];
    const g = new THREE.Group();
    g.position.set(q.x, 0, q.z);
    const segs = q.r > 5 ? 14 : 8;
    const top = mesh(new THREE.CylinderGeometry(q.r, q.r * 0.92, 0.6, segs), mat(L.top, { flatShading: true, roughness: 0.95 }), 0, -0.3, 0, g);
    top.castShadow = false;
    // onderkant: een puntige rotsbrok (zo zie je dat het zweeft)
    const under = mesh(new THREE.ConeGeometry(q.r * 0.92, q.r * 1.3 + 1, segs), mat(L.side, { flatShading: true, roughness: 1 }), 0, -0.6 - (q.r * 1.3 + 1) / 2, 0, g);
    under.rotation.x = Math.PI;
    under.castShadow = false;
    // kratertjes en stenen bovenop
    if (q.kind === 'maan' || q.kind === 'ring' || q.kind === 'alien') {
      for (let i = 0; i < 6; i++) {
        const a = rand() * Math.PI * 2, d = 1.5 + rand() * (q.r - 3);
        const cr = mesh(new THREE.CylinderGeometry(0.8 + rand() * 0.6, 0.5, 0.12, 8), mat(L.side, { flatShading: true }), Math.cos(a) * d, 0.03, Math.sin(a) * d, g);
        cr.castShadow = false;
      }
    }
    if (q.kind === 'steen') bobbers.push({ g, ph: rand() * 6 });
    group.add(g);
  }
  // rand van de Ruimtebasis: een lage reling met lampjes (alleen achteraan, voor de sfeer)
  const lampM = mat(0x74c0fc, { emissive: 0x1c7ed6, emissiveIntensity: 0.8 });
  for (let i = 0; i < 10; i++) {
    const a = Math.PI * (0.15 + i * 0.075);
    mesh(new THREE.SphereGeometry(0.18, 6, 4), lampM, Math.cos(a) * 9, 0.2, 25 + Math.sin(a) * 9, group);
  }
  // Alienplaneet: paarse kristallen en rare plantjes
  const crystalM = mat(0xda77f2, { emissive: 0x5f3dc4, emissiveIntensity: 0.5, flatShading: true });
  for (const [x, z, s] of [[-5.5, -52, 1.2], [5.5, -53, 1], [6, -61, 1.3], [-2.5, -63, 0.9], [3, -8.5, 0.7]]) {
    const c = mesh(new THREE.OctahedronGeometry(0.6 * s, 0), crystalM, x, 0.7 * s, z, group);
    c.scale.y = 1.8;
    colliders.push({ x, z, r: 0.55 * s });
  }
  // Maanplaneet: een vlag van Professor Bolt
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), mat(0xdee2e6), 4.5, 1.1, -10.5, group);
  mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), mat(0xe63946), 4.95, 1.9, -10.5, group);
  colliders.push({ x: 4.5, z: -10.5, r: 0.3 });

  // ---------- Moederschip-platform (arena) ----------
  const arenaG = new THREE.Group();
  const lightM = mat(0xffd43b, { emissive: 0xf59f00, emissiveIntensity: 0.9 });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    mesh(new THREE.SphereGeometry(0.22, 6, 4), lightM, ARENA.x + Math.cos(a) * (ARENA.r - 0.5), 0.15, ARENA.z + Math.sin(a) * (ARENA.r - 0.5), arenaG);
  }
  const padRing = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.6, depthWrite: false }));
  padRing.position.set(ARENA.x, 0.03, ARENA.z);
  arenaG.add(padRing);
  group.add(arenaG);

  // ---------- Schatkisten ----------
  const chestM = mat(0x495057, { metalness: 0.4, roughness: 0.5 }), bandM = mat(0x74c0fc, { emissive: 0x1c7ed6, emissiveIntensity: 0.5 });
  const chests = CHESTS.map((c) => {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), chestM, 0, 0.3, 0, g);
    mesh(new THREE.BoxGeometry(1.05, 0.08, 0.75), bandM, 0, 0.45, 0, g);
    const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.35); g.add(lid);
    mesh(new THREE.BoxGeometry(1.0, 0.25, 0.7), chestM, 0, 0.12, 0.35, lid);
    mesh(new THREE.BoxGeometry(0.16, 0.18, 0.06), bandM, 0, 0.05, 0.72, lid);
    g.position.set(c.x, 0, c.z);
    group.add(g);
    colliders.push({ x: c.x, z: c.z, r: 0.5 });
    return { ...c, g, lid, opened: false, k: 0 };
  });

  // ---------- Meteorieten ----------
  // Eerst een oranje rondje op de grond, dan valt er een meteoriet. Wie in het rondje staat: au!
  const rockM = mat(0x8d5524, { flatShading: true, emissive: 0x7a1d00, emissiveIntensity: 0.6 });
  const tailM = new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.6, depthWrite: false });
  const rockGeo = new THREE.IcosahedronGeometry(0.6, 0), tailGeo = new THREE.ConeGeometry(0.5, 2.4, 6);
  const warnGeo = new THREE.RingGeometry(METEOR_R - 0.25, METEOR_R, 22).rotateX(-Math.PI / 2), fillGeo = new THREE.CircleGeometry(METEOR_R, 22).rotateX(-Math.PI / 2);
  const meteors = [];
  const meteor = (x, z, T = METEOR_T) => {
    let f = meteors.find((b) => !b.on);
    if (!f) {
      if (meteors.length >= 20) return null;
      const g = new THREE.Group();
      const b = new THREE.Mesh(rockGeo, rockM);
      const tail = new THREE.Mesh(tailGeo, tailM); tail.position.y = 1.3; b.add(tail);
      const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.8, depthWrite: false }));
      const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.25, depthWrite: false }));
      g.add(b, warn, fill);
      group.add(g);
      f = { g, b, warn, fill };
      meteors.push(f);
    }
    f.x = Math.max(B.minX + 1, Math.min(B.maxX - 1, x)); f.z = Math.max(B.minZ + 1, Math.min(B.maxZ - 1, z));
    f.t = 0; f.T = T; f.on = true; f.g.visible = true;
    f.warn.position.set(f.x, 0.08, f.z); f.fill.position.set(f.x, 0.07, f.z);
    f.b.visible = true;
    return f;
  };
  updaters.push((t, dt) => {
    for (const f of meteors) {
      if (!f.on) continue;
      f.t += dt;
      const k = Math.min(1, f.t / f.T);
      f.b.position.set(f.x - (1 - k) * 5, 14 * (1 - k) + 0.4, f.z + (1 - k) * 3);
      f.b.rotation.x += dt * 5; f.b.rotation.z = 0.35;
      f.fill.scale.setScalar(Math.max(0.05, k));
      f.warn.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.4;
      if (k >= 1) {
        f.on = false; f.g.visible = false;
        zone.onImpact?.(f.x, f.z, METEOR_R);
      }
    }
  });

  // ---------- Ingang: portaal en bord ----------
  const portal = makePortal(group, 0, B.maxZ - 2.6, 0, 'WOESTIJN', '#d4a017');
  updaters.push(portal.update);
  talkables.push(makeSignpost(group, {
    id: 'bord-ruimte', x: 5.2, z: B.maxZ - 8, title: 'RUIMTEWERELD', color: '#5c7cfa',
    lines: [
      'DE RUIMTEWERELD',
      'Achterin, op het Moederschip-platform, zweeft Ufo Udo. Hij bewaakt stukje 8 van de schatkaart!',
      'Hier is WEINIG ZWAARTEKRACHT: je zweeft een beetje. Druk op 🚀 SPRING (of J) om heel hoog te springen!',
      'Tussen de planeten is de lege ruimte. Spring van steen naar steen. Val je eraf? Dan kost dat een hartje!',
      'Op het Meteorietenveld vallen METEORIETEN. Zie je een oranje rondje? Snel weg!',
      'Laser-aliens schieten met lasers. Een rode streep = daar komt een laser. Spring eroverheen!',
    ],
  }));

  // ---------- Zone ----------
  const inArena = (p) => Math.hypot(p.x - ARENA.x, p.z - ARENA.z) < ARENA.r + 0.3;
  const inMeteorField = (p) => Math.hypot(p.x - METEOR_FIELD.x, p.z - METEOR_FIELD.z) < METEOR_FIELD.r;
  const zone = {
    id: 'ruimte', name: 'De Ruimtewereld', group, colliders, boxes, talkables, npcs: [],
    bounds: { ...B },
    music: 'ruimte',
    env: { sky: [0x05051a, 0x2b1055], fog: [0x140a2e, 45, 140], hemi: [0xd0d8ff, 0x3b2a6b, 1.15], sun: [0xffffff, 2.5], cam: [0, 10, 11.5] },
    spawns: { fromWoestijn: { x: 0, z: B.maxZ - 6, rot: Math.PI } },
    exit: { x: 0, z: B.maxZ - 2.4 },
    chests, platforms: PLATFORMS, arena: ARENA, meteorField: METEOR_FIELD,
    boss: { x: ARENA.x, z: ARENA.z - 2 },
    laserAliens: LASER_ALIENS,
    focus: null, // main.js zet hier de speler in (dan bewegen de sterren mee)
    heartSpots: [{ x: -5, z: 28 }, { x: 3, z: 4.6 }, { x: 5, z: -6 }, { x: -6, z: -25 }, { x: 2, z: -45.2 }, { x: 5, z: -68 }],
    slimeSpots: [[-3, -4], [3, -12], [-4, -24], [4, -29], [2, -52], [-3, -60]].map(([x, z]) => ({ x, z, kind: 'ruimte' })),
    labels: [
      { x: 0, z: 22, text: 'Ruimtebasis' }, { x: 0, z: -8, text: 'Maanplaneet' }, { x: 0, z: -27, text: 'Meteorietenveld' },
      { x: 0, z: -57, text: 'Alienplaneet' }, { x: 0, z: -82, text: 'Moederschip' },
    ],
    onPlatform, inArena, inMeteorField, meteor, meteors,
    lastSafe: { x: 0, z: B.maxZ - 6 },
    // de kaart: de planeten tekenen (de ruimte ertussen is donker)
    drawMap(g, px, pz, scale) {
      g.fillStyle = '#0b0b24'; g.fillRect(0, 0, 2000, 2000);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) g.fillRect((i * 97) % 620, (i * 57) % 420, 1.5, 1.5);
      const col = { basis: '#adb5bd', steen: '#a1887f', maan: '#dee2e6', ring: '#ff922b', alien: '#94d82d', schip: '#9775fa' };
      for (const q of PLATFORMS) { g.fillStyle = col[q.kind]; g.beginPath(); g.arc(px(q.x), pz(q.z), q.r * scale, 0, Math.PI * 2); g.fill(); }
    },
    applyState(st) {
      for (const c of chests) {
        const o = st.chests.includes(c.id);
        c.opened = o; c.k = o ? 1 : 0; c.lid.rotation.x = -1.9 * c.k;
      }
    },
    reset() { for (const f of meteors) { f.on = false; f.g.visible = false; } },
    // ster op de kaart: steeds naar het volgende planeetje, tot het Moederschip
    goal(p) {
      const here = onPlatform(p);
      const i = here ? PLATFORMS.indexOf(here) : -1;
      const next = PLATFORMS[Math.min(PLATFORMS.length - 1, i + 1)];
      return { x: next.x, z: next.z };
    },
    update(t, dt) {
      updaters.forEach((f) => f(t, dt));
      if (zone.focus) { stars.position.set(zone.focus.x, 0, zone.focus.z); far.position.set(zone.focus.x, 0, zone.focus.z); }
      for (const c of chests) {
        if (c.opened && c.k < 1) { c.k = Math.min(1, c.k + dt * 2.2); c.lid.rotation.x = -1.9 * c.k; }
      }
      // planetoïdes deinen een heel klein beetje (je staat er nog steeds goed op)
      for (const b of bobbers) b.g.position.y = Math.sin(t * 1.2 + b.ph) * 0.06;
      padRing.material.opacity = 0.35 + Math.abs(Math.sin(t * 2)) * 0.35;
    },
  };
  return zone;
}

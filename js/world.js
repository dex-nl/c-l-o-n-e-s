// De wereld: het dorpje met huizen, bomen, vijver, paden, hek en de clonemachine.
import * as THREE from 'three';
import { mat } from './characters.js';

// Vaste "willekeurige" getallen, zodat het dorp er altijd hetzelfde uitziet.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function mesh(geo, material, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export const VILLAGE_RADIUS = 24;

export function createWorld(scene) {
  const colliders = []; // cirkels: { x, z, r }
  const updaters = [];  // functies die elk beeldje iets laten bewegen
  const world = { colliders, bounds: VILLAGE_RADIUS - 1.2, update: (t, dt) => updaters.forEach((f) => f(t, dt)) };

  // ---------- Grond met heuvels buiten het hek ----------
  const groundGeo = new THREE.PlaneGeometry(140, 140, 70, 70);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  const colors = [];
  const cGrass = new THREE.Color(0x8bd36b), cDark = new THREE.Color(0x5fae55);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const r = Math.hypot(x, z);
    let y = 0;
    if (r > VILLAGE_RADIUS + 1) {
      const t = r - VILLAGE_RADIUS - 1;
      y = t * 0.35 * (0.7 + 0.3 * Math.sin(x * 0.3) * Math.cos(z * 0.25)) + (rand() - 0.5) * 0.6;
    }
    gp.setY(i, y);
    const c = cGrass.clone().lerp(cDark, Math.min(1, Math.max(0, (r - 20) / 25)) * 0.8 + rand() * 0.15);
    colors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0xffffff, { vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- Paden ----------
  const pathM = mat(0xe9cf8f, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  function path(x1, z1, x2, z2, w = 2) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = new THREE.PlaneGeometry(w, len);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, pathM);
    m.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    m.receiveShadow = true;
    scene.add(m);
  }
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(4, 10).rotateX(-Math.PI / 2), pathM);
  plaza.position.y = 0.02; plaza.receiveShadow = true;
  scene.add(plaza);

  // ---------- Waterput in het midden ----------
  const well = new THREE.Group();
  mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.9, 8), mat(0xa9a9a9), 0, 0.45, 0, well);
  mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 8), mat(0x4fa3e0), 0, 0.85, 0, well);
  mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), mat(0x8b5a2b), -0.9, 1.5, 0, well);
  mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), mat(0x8b5a2b), 0.9, 1.5, 0, well);
  mesh(new THREE.ConeGeometry(1.5, 0.8, 4), mat(0xd1495b), 0, 2.6, 0, well).rotation.y = Math.PI / 4;
  const bucket = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.3, 6), mat(0x8b5a2b), 0, 1.6, 0, well);
  updaters.push((t) => { bucket.position.y = 1.5 + Math.sin(t * 0.8) * 0.15; });
  scene.add(well);
  colliders.push({ x: 0, z: 0, r: 1.3 });

  // ---------- Huizen ----------
  const smokePuffs = [];
  function house(x, z, roofColor, wallColor = 0xfff1d6) {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(4, 2.6, 4), mat(wallColor), 0, 1.3, 0, g);
    const roof = mesh(new THREE.ConeGeometry(3.4, 2, 4), mat(roofColor), 0, 3.6, 0, g);
    roof.rotation.y = Math.PI / 4;
    mesh(new THREE.BoxGeometry(1, 1.6, 0.1), mat(0x8b5a2b), 0, 0.8, 2.02, g);              // deur
    mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), mat(0xffd23f), 0.3, 0.8, 2.08, g);        // deurknop
    for (const wx of [-1.3, 1.3]) mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), mat(0x9ad7f5, { emissive: 0x335566 }), wx, 1.6, 2.02, g);
    for (const wz of [-0.8, 0.8]) {
      mesh(new THREE.BoxGeometry(0.1, 0.8, 0.8), mat(0x9ad7f5, { emissive: 0x335566 }), 2.02, 1.6, wz, g);
      mesh(new THREE.BoxGeometry(0.1, 0.8, 0.8), mat(0x9ad7f5, { emissive: 0x335566 }), -2.02, 1.6, wz, g);
    }
    mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), mat(0xb5651d), 1.1, 4, -0.8, g);              // schoorsteen
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-x, -z); // voordeur kijkt naar het plein
    scene.add(g);
    colliders.push({ x, z, r: 2.9 });
    // rook uit de schoorsteen
    g.updateMatrixWorld(true);
    const chimney = g.localToWorld(new THREE.Vector3(1.1, 4.8, -0.8));
    for (let i = 0; i < 5; i++) {
      const p = mesh(new THREE.IcosahedronGeometry(0.3, 0), mat(0xf2f2f2, { transparent: true, opacity: 0.8 }));
      p.castShadow = false;
      p.userData = { base: chimney.clone(), offset: i / 5 };
      scene.add(p);
      smokePuffs.push(p);
    }
    // pad naar de deur
    const dir = new THREE.Vector2(-x, -z).normalize();
    path(x + dir.x * 2, z + dir.y * 2, dir.x * 3.5, dir.y * 3.5, 1.6);
    return g;
  }
  updaters.push((t) => {
    for (const p of smokePuffs) {
      const k = (t * 0.25 + p.userData.offset) % 1;
      p.position.set(p.userData.base.x + Math.sin(k * 6 + p.userData.offset * 9) * 0.3 + k * 0.8, p.userData.base.y + k * 3, p.userData.base.z);
      p.scale.setScalar(0.5 + k * 1.3);
      p.material.opacity = 0.8 * (1 - k);
    }
  });

  house(10, -9, 0xd1495b);
  house(13, 3, 0x3a86ff);
  house(-13, 4, 0x9b5de5);
  const inventorHouse = house(-10, -10, 0x2a9d8f, 0xe0e7ff);
  // propeller op het dak van de uitvinder
  const prop = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), mat(0x555555), 0, 0.6, 0, prop);
  const blades = new THREE.Group();
  blades.position.y = 1.2;
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.BoxGeometry(0.15, 0.05, 1.1), mat(0xffd23f), 0, 0, 0.55, null);
    const holder = new THREE.Group(); holder.rotation.y = (i * Math.PI * 2) / 3; holder.add(b); blades.add(holder);
  }
  prop.add(blades);
  prop.position.set(0, 4.5, 0);
  inventorHouse.add(prop);
  updaters.push((t, dt) => { blades.rotation.y += dt * 5; });

  // ---------- Vijver met golvend water ----------
  const pond = { x: 5, z: 10, r: 4.2 };
  const shore = mesh(new THREE.CylinderGeometry(pond.r + 0.7, pond.r + 0.9, 0.1, 14), mat(0xd9c38a), pond.x, -0.02, pond.z);
  shore.castShadow = false; scene.add(shore);
  const waterGeo = new THREE.RingGeometry(0.01, pond.r, 18, 6);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, mat(0x4fb3e8, { transparent: true, opacity: 0.88, roughness: 0.25, metalness: 0.1 }));
  water.position.set(pond.x, 0.12, pond.z);
  water.receiveShadow = true;
  scene.add(water);
  const wp = waterGeo.attributes.position;
  const baseXZ = [];
  for (let i = 0; i < wp.count; i++) baseXZ.push([wp.getX(i), wp.getZ(i)]);
  updaters.push((t) => {
    for (let i = 0; i < wp.count; i++) {
      const [x, z] = baseXZ[i];
      const edge = Math.min(1, (pond.r - Math.hypot(x, z)) * 1.2);
      wp.setY(i, (Math.sin(x * 1.4 + t * 2) * 0.05 + Math.cos(z * 1.2 + t * 1.6) * 0.05) * edge);
    }
    wp.needsUpdate = true;
  });
  colliders.push({ x: pond.x, z: pond.z, r: pond.r + 0.3 });
  // stenen rond de vijver
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rand() * 0.3;
    const s = mesh(new THREE.DodecahedronGeometry(0.3 + rand() * 0.25, 0), mat(0x9aa0a6), pond.x + Math.cos(a) * (pond.r + 0.6), 0.15, pond.z + Math.sin(a) * (pond.r + 0.6));
    s.rotation.set(rand() * 3, rand() * 3, 0);
    scene.add(s);
  }
  // waterlelies
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2, d = 1 + rand() * 2.5;
    const lily = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 7), mat(0x52b788), pond.x + Math.cos(a) * d, 0.2, pond.z + Math.sin(a) * d);
    scene.add(lily);
    updaters.push((t) => { lily.position.y = 0.2 + Math.sin(t * 1.5 + i) * 0.04; });
  }
  // eendjes die rondzwemmen
  for (let i = 0; i < 2; i++) {
    const duck = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), mat(0xffffff), 0, 0.18, 0, duck);
    mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(i ? 0x2d6a4f : 0xffffff), 0, 0.5, 0.3, duck);
    mesh(new THREE.BoxGeometry(0.16, 0.08, 0.2), mat(0xff9f1c), 0, 0.45, 0.52, duck);
    mesh(new THREE.BoxGeometry(0.2, 0.15, 0.15), mat(0xffffff), 0, 0.35, -0.38, duck);
    scene.add(duck);
    const speed = i ? -0.35 : 0.25, rr = i ? 1.6 : 2.8;
    updaters.push((t) => {
      const a = t * speed + i * 2;
      duck.position.set(pond.x + Math.cos(a) * rr, 0.12 + Math.sin(t * 3 + i) * 0.05, pond.z + Math.sin(a) * rr);
      duck.rotation.y = -a + (speed > 0 ? 0 : Math.PI);
      duck.rotation.z = Math.sin(t * 3 + i) * 0.08;
    });
  }
  path(0, 3.5, 2.5, 6.4, 1.6);

  // ---------- Bomen ----------
  function tree(x, z, size = 1, collide = true) {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.18 * size, 0.28 * size, 1.4 * size, 5), mat(0x8b5a2b), 0, 0.7 * size, 0, g);
    const top = new THREE.Group();
    top.position.y = 1.3 * size;
    const green = [0x52b788, 0x40916c, 0x74c69d][Math.floor(rand() * 3)];
    if (rand() < 0.5) {
      mesh(new THREE.IcosahedronGeometry(1.1 * size, 0), mat(green), 0, 0.9 * size, 0, top);
      mesh(new THREE.IcosahedronGeometry(0.7 * size, 0), mat(green), 0.3 * size, 1.7 * size, 0.1, top);
    } else {
      mesh(new THREE.ConeGeometry(1.2 * size, 1.6 * size, 6), mat(green), 0, 0.8 * size, 0, top);
      mesh(new THREE.ConeGeometry(0.9 * size, 1.3 * size, 6), mat(green), 0, 1.6 * size, 0, top);
    }
    g.add(top);
    g.position.set(x, 0, z);
    g.rotation.y = rand() * 6;
    scene.add(g);
    const ph = rand() * 6;
    updaters.push((t) => { top.rotation.z = Math.sin(t * 1.3 + ph) * 0.05; top.rotation.x = Math.cos(t * 1.1 + ph) * 0.04; });
    if (collide) colliders.push({ x, z, r: 0.6 * size });
  }
  const villageTrees = [[-16, -3], [-18, 2], [-6, 16], [-11, 13], [15, -4], [18, -1], [3, -17], [-2, -18], [17, 10], [-19, -9], [9, 17], [13, 14], [-15, 12], [6, -14]];
  villageTrees.forEach(([x, z]) => tree(x, z, 0.9 + rand() * 0.4));
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2, r = VILLAGE_RADIUS + 3 + rand() * 30;
    const tx = Math.cos(a) * r, tz = Math.sin(a) * r, ts = 1 + rand() * 0.8;
    if (Math.abs(tx) < 5 && tz < -20) continue; // pad naar het bos vrij houden
    tree(tx, tz, ts, false);
  }

  // ---------- Bloemetjes ----------
  const flowerColors = [0xff6b6b, 0xffd23f, 0xffffff, 0xc77dff];
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2, r = 5 + rand() * 17;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.3)) continue;
    const f = mesh(new THREE.OctahedronGeometry(0.14, 0), mat(flowerColors[i % 4]), x, 0.25, z);
    f.castShadow = false;
    scene.add(f);
    const stem = mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), mat(0x40916c), x, 0.12, z);
    stem.castShadow = false;
    scene.add(stem);
  }

  // ---------- Hek rond het dorp ----------
  const woodM = mat(0xc68b59);
  const posts = 48;
  for (let i = 0; i < posts; i++) {
    const a1 = (i / posts) * Math.PI * 2, a2 = ((i + 1) / posts) * Math.PI * 2;
    const x1 = Math.cos(a1) * VILLAGE_RADIUS, z1 = Math.sin(a1) * VILLAGE_RADIUS;
    const x2 = Math.cos(a2) * VILLAGE_RADIUS, z2 = Math.sin(a2) * VILLAGE_RADIUS;
    if (i !== 36) scene.add(mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), woodM, x1, 0.6, z1));
    if (i === 35 || i === 36) continue; // opening voor de poort naar het bos (noorden)
    const len = Math.hypot(x2 - x1, z2 - z1);
    for (const h of [0.45, 0.9]) {
      const rail = mesh(new THREE.BoxGeometry(0.1, 0.14, len), woodM, (x1 + x2) / 2, h, (z1 + z2) / 2);
      rail.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      scene.add(rail);
    }
  }

  // ---------- Wolken ----------
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const p = mesh(new THREE.IcosahedronGeometry(1.5 + rand() * 1.2, 0), mat(0xffffff), j * 1.8 - 1.8, rand() * 0.6, rand() - 0.5, c);
      p.castShadow = false; p.receiveShadow = false;
    }
    const sx = rand() * 120 - 60, sz = rand() * 100 - 70, sy = 16 + rand() * 6, sp = 0.6 + rand() * 0.6;
    scene.add(c);
    updaters.push((t) => { c.position.set(((sx + t * sp + 60) % 120) - 60, sy, sz); });
  }

  // ---------- De (kapotte) clonemachine ----------
  world.machine = createCloneMachine(scene, -4.6, -12, updaters);
  colliders.push({ x: -4.6, z: -12, r: 1.5 });
  path(-4.6, -10.4, -2, -3.4, 1.6);

  // ---------- Poort naar het bos (noordkant) ----------
  path(0, -4, 0, -30, 2);
  world.gate = createForestGate(scene, 0, -VILLAGE_RADIUS);
  world.gateSpot = { x: 0, z: -22.4 };   // hier loop je het bos in
  world.returnSpot = { x: 0, z: -20.2 }; // hier kom je terug uit het bos

  world.npcSpot = { x: -5.8, z: -9.2 };
  world.gearSpots = [
    { id: 'tandwiel-1', x: 16.5, z: 6.5 },   // achter het blauwe huis
    { id: 'tandwiel-2', x: -0.5, z: 13.5 },  // bij de vijver
    { id: 'tandwiel-3', x: -16.8, z: 0 },    // tussen de bomen
  ];
  return world;
}

// Een houten poortboog met een bordje "HET BOS"
function createForestGate(scene, x, z) {
  const g = new THREE.Group();
  const wood = mat(0x8b5a2b), leaf = mat(0x40916c);
  for (const px of [-1.8, 1.8]) mesh(new THREE.BoxGeometry(0.45, 3.4, 0.45), wood, px, 1.7, 0, g);
  mesh(new THREE.BoxGeometry(4.4, 0.5, 0.6), wood, 0, 3.5, 0, g);
  for (const lx of [-1.6, 0, 1.6]) mesh(new THREE.IcosahedronGeometry(0.7, 0), leaf, lx, 3.95, 0, g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.8), new THREE.MeshBasicMaterial({ map: signTexture('HET BOS', '#40916c') }));
  sign.position.set(0, 2.85, 0.32); g.add(sign);
  // Deurtjes die opengaan als de clonemachine werkt
  const doors = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.6, 0, 0);
    mesh(new THREE.BoxGeometry(1.6, 1.4, 0.15), mat(0xc68b59), -side * 0.8, 0.8, 0, pivot);
    g.add(pivot);
    return { pivot, side };
  });
  g.position.set(x, 0, z);
  scene.add(g);
  const gate = { group: g, open: false };
  gate.setOpen = (yes) => {
    gate.open = yes;
    doors.forEach((d) => { d.pivot.rotation.y = yes ? d.side * 1.6 : 0; });
  };
  return gate;
}

export function signTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#2d3142'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 86);
  g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCloneMachine(scene, x, z0, updaters) {
  const z = z0;
  const g = new THREE.Group();
  const metal = mat(0x8d99ae, { metalness: 0.4, roughness: 0.5 });
  mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.5, 8), metal, 0, 0.25, 0, g);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.2, 8, 1, true),
    mat(0xa8e6ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, emissive: 0x113344 }));
  glass.position.y = 1.6; g.add(glass);
  mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.4, 8), metal, 0, 2.9, 0, g);
  const dome = mesh(new THREE.SphereGeometry(0.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xef476f), 0, 3.1, 0, g);
  // buizen
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), mat(0xffd23f), 1.25, 1.5, -0.4, g);
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), mat(0xffd23f), -1.25, 1.5, -0.4, g);
  // bedieningspaneel
  const panel = mesh(new THREE.BoxGeometry(0.9, 1, 0.5), metal, 1.7, 0.5, 0.7, g);
  panel.rotation.y = -0.5;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3333 }));
  lamp.position.set(1.7, 1.15, 0.7); g.add(lamp);
  // bord
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('KAPOT', '#e63946') }));
  sign.position.set(0, 0.85, 1.42); g.add(sign);
  // drie lege plekken voor tandwielen
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const s = makeGear(0.22);
    s.position.set(-0.6 + i * 0.6, 2.9, 1.2);
    s.visible = false; g.add(s); slots.push(s);
  }
  // vonkjes (want hij is kapot)
  const sparks = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    g.add(s); sparks.push(s);
  }
  g.position.set(x, 0, z);
  g.rotation.y = 0.5;
  scene.add(g);

  // Gloeiende ring op de grond (alleen als hij gerepareerd is)
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.1, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x7cf7ff, transparent: true, opacity: 0.5, depthWrite: false }));
  glow.position.y = 0.04; glow.visible = false; g.add(glow);
  // Lichtstraal in het glas (bij het klonen)
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 1.6; g.add(beam);
  // Glitters bij het klonen (vaste groep, wordt steeds opnieuw gebruikt)
  const glitterColors = [0xffffff, 0x7cf7ff, 0xffd23f, 0xc77dff];
  const glitter = [];
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: glitterColors[i % 4] }));
    s.visible = false; g.add(s);
    glitter.push({ mesh: s, v: new THREE.Vector3(), life: 0 });
  }

  const machine = { group: g, repaired: false, x, z, zapT: 0 };
  // Plek voor de machine waar nieuwe clones verschijnen
  machine.front = { x: x + Math.sin(0.5) * 2.4, z: z + Math.cos(0.5) * 2.4 };
  machine.setGearsInside = (n) => slots.forEach((s, i) => { s.visible = i < n; });
  machine.setRepaired = (yes) => {
    if (machine.repaired === yes && sign.material.map) return;
    machine.repaired = yes;
    if (sign.material.map) sign.material.map.dispose();
    sign.material.map = signTexture(yes ? 'KLAAR!' : 'KAPOT', yes ? '#2a9d8f' : '#e63946');
    sign.material.needsUpdate = true;
    lamp.material.color.set(yes ? 0x33ff77 : 0xff3333);
    glow.visible = yes;
    if (yes) machine.setGearsInside(3);
  };
  // Pats! Flits, glitters en de machine schudt.
  machine.zap = () => {
    machine.zapT = 1;
    glitter.forEach((p, i) => {
      p.mesh.position.set(0, 1.6, 0);
      const a = (i / glitter.length) * Math.PI * 2;
      p.v.set(Math.cos(a) * (2 + Math.random() * 2), 3 + Math.random() * 4, Math.sin(a) * (2 + Math.random() * 2));
      p.life = 1 + Math.random() * 0.5;
      p.mesh.visible = true;
    });
  };
  updaters.push((t, dt) => {
    lamp.visible = machine.repaired || Math.sin(t * 8) > 0;
    dome.rotation.y = t * (machine.repaired ? 1.5 : 0.2);
    slots.forEach((s, i) => { s.rotation.z = t * (i % 2 ? -2 : 2); });
    sparks.forEach((s, i) => {
      const k = (t * 1.5 + i / 6) % 1;
      s.visible = !machine.repaired && Math.sin(t * 3 + i) > 0.2;
      s.position.set(1.25 + Math.cos(i * 2) * k * 0.8, 2.6 + k * 0.7 - k * k * 1.2, -0.4 + Math.sin(i * 2) * k * 0.8);
    });
    // Blij gloeien als hij werkt
    const zp = machine.zapT;
    if (machine.repaired) {
      const pulse = 0.5 + Math.sin(t * 3) * 0.5;
      glass.material.emissive.setRGB(0.1 + pulse * 0.15 + zp, 0.4 + pulse * 0.3 + zp, 0.5 + pulse * 0.3 + zp);
      glow.material.opacity = 0.35 + pulse * 0.3;
      glow.scale.setScalar(1 + pulse * 0.08);
    } else {
      glass.material.emissive.set(0x113344);
    }
    // Schudden + lichtstraal tijdens het klonen
    beam.material.opacity = zp * 0.9;
    g.position.x = x + (zp > 0 ? Math.sin(t * 60) * 0.08 * zp : 0);
    g.position.z = z0 + (zp > 0 ? Math.cos(t * 53) * 0.08 * zp : 0);
    g.scale.y = 1 + zp * 0.08 * Math.sin(t * 40);
    machine.zapT = Math.max(0, zp - (dt || 0.016) * 1.2);
    for (const p of glitter) {
      if (p.life <= 0) continue;
      p.life -= dt || 0.016;
      p.v.y -= 9 * (dt || 0.016);
      p.mesh.position.addScaledVector(p.v, dt || 0.016);
      p.mesh.rotation.x += 0.2; p.mesh.rotation.y += 0.15;
      if (p.life <= 0 || p.mesh.position.y < 0) { p.life = 0; p.mesh.visible = false; }
    }
  });
  return machine;
}

// Een gouden tandwiel (ook gebruikt voor de opdracht)
export function makeGear(size = 0.45) {
  const g = new THREE.Group();
  const gold = mat(0xffc300, { metalness: 0.6, roughness: 0.3, emissive: 0x553300 });
  const disc = mesh(new THREE.CylinderGeometry(size, size, size * 0.35, 10), gold);
  disc.rotation.x = Math.PI / 2; g.add(disc);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = mesh(new THREE.BoxGeometry(size * 0.35, size * 0.35, size * 0.35), gold, Math.cos(a) * size * 1.1, Math.sin(a) * size * 1.1, 0);
    tooth.rotation.z = a; g.add(tooth);
  }
  const hole = mesh(new THREE.CylinderGeometry(size * 0.3, size * 0.3, size * 0.4, 6), mat(0x8a5a00));
  hole.rotation.x = Math.PI / 2; g.add(hole);
  return g;
}

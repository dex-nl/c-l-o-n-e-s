// Gebied 1: het Fluisterbos. Een groot bos met een beekje, een uil en 3 clone-puzzels.
// Het bos ligt een stuk verderop in dezelfde 3D-wereld (rond x = 200), zodat we
// er met een korte overgang (zwart beeld) heen kunnen "lopen".
import * as THREE from 'three';
import { mat } from './characters.js';
import { signTexture } from './world.js';

export const FX = 200;                 // midden van het bos
export const FOREST = { minX: 181.5, maxX: 218.5, minZ: -44, maxZ: 44.6 };
export const PUZZLE_NEEDS = [1, 2, 3]; // hoeveel clones elke poort nodig heeft

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function mesh(geo, material, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// Veel dezelfde dingen (bomen, paddenstoelen) in één keer tekenen: snel op de iPad.
function instanced(geo, material, items, group, shadow = true) {
  const im = new THREE.InstancedMesh(geo, material, items.length);
  const o = new THREE.Object3D();
  items.forEach((it, i) => {
    o.position.set(it.x, it.y || 0, it.z);
    o.rotation.set(0, it.ry || 0, 0);
    o.scale.setScalar(it.s || 1);
    if (it.sy) o.scale.y = it.sy * (it.s || 1);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
    if (it.color !== undefined) im.setColorAt(i, new THREE.Color(it.color));
  });
  im.castShadow = shadow; im.receiveShadow = true;
  group.add(im);
  return im;
}

export function createForest(scene) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const colliders = [];
  const updaters = [];
  const box = (minX, maxX, minZ, maxZ) => { const b = { box: true, minX, maxX, minZ, maxZ, off: false }; colliders.push(b); return b; };

  const STREAM_Z = 25.5;
  const WALLS = [12, -8, -26];
  const PLATES = [
    [{ x: 193, z: 17 }],
    [{ x: 186, z: -2 }, { x: 214, z: -2 }],
    [{ x: 187, z: -19 }, { x: 200, z: -15 }, { x: 213, z: -19 }],
  ];
  const owlSpot = { x: 194.5, z: 34 };
  const mapSpot = { x: FX, z: -36.5 };
  const entry = { x: FX, z: 41.5, rot: Math.PI };

  // Plekken waar geen boom mag staan (pad, puzzels, beek...)
  function free(x, z, extra = 0) {
    if (Math.abs(x - FX) < 3.2 + extra && z > -46 && z < 47) return false;           // middenpad
    if (Math.abs(z - STREAM_Z) < 2.6) return false;                                    // beek
    for (const w of WALLS) if (Math.abs(z - w) < 2.2) return false;                    // muren
    for (const ps of PLATES) for (const p of ps) if (Math.hypot(x - p.x, z - p.z) < 4.2 + extra) return false;
    if (Math.hypot(x - owlSpot.x, z - owlSpot.z) < 4) return false;
    if (Math.hypot(x - mapSpot.x, z - mapSpot.z) < 5) return false;
    if (z > 36 && Math.abs(x - FX) < 8) return false;                                   // ingang
    return true;
  }

  // ---------- Grond met zonnevlekjes ----------
  const groundGeo = new THREE.PlaneGeometry(110, 130, 55, 65);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  const cols = [];
  const cMoss = new THREE.Color(0x5e9c4a), cDark = new THREE.Color(0x3f7a3a), cSun = new THREE.Color(0xc9e27a);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i) + FX, z = gp.getZ(i);
    let y = 0;
    if (Math.abs(z - STREAM_Z) < 1.8) y = -0.7;                       // beekbedding
    const out = Math.max(0, Math.abs(x - FX) - 24, Math.abs(z) - 50);
    y += out * 0.25 + (out > 0 ? rand() * 0.4 : 0);                    // heuveltjes buiten het bos
    gp.setY(i, y);
    const sun = Math.sin(x * 0.7) * Math.cos(z * 0.55) + Math.sin(x * 0.23 + z * 0.31);
    const c = cMoss.clone().lerp(cDark, rand() * 0.5);
    if (sun > 1.05) c.lerp(cSun, 0.55);
    cols.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  groundGeo.computeVertexNormals();
  const ground = mesh(groundGeo, mat(0xffffff, { vertexColors: true }), FX, 0, 0, group, false);

  // Bospad
  const pathM = mat(0xc9a66b, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const pathGeo = new THREE.PlaneGeometry(3, 92).rotateX(-Math.PI / 2);
  mesh(pathGeo, pathM, FX, 0.02, 0, group, false);
  const sidePath = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = mesh(new THREE.PlaneGeometry(2, len).rotateX(-Math.PI / 2), pathM, (x1 + x2) / 2, 0.02, (z1 + z2) / 2, group, false);
    m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
  };
  sidePath(FX, 17, 193, 17);
  sidePath(FX, -2, 186, -2); sidePath(FX, -2, 214, -2);
  sidePath(FX, -17, 187, -19); sidePath(FX, -17, 213, -19);

  // ---------- Beekje met golvend water en een bruggetje ----------
  const waterGeo = new THREE.PlaneGeometry(110, 3.4, 55, 3).rotateX(-Math.PI / 2);
  const water = mesh(waterGeo, mat(0x4fb3e8, { transparent: true, opacity: 0.85, roughness: 0.2 }), FX, -0.25, STREAM_Z, group, false);
  const wp = waterGeo.attributes.position;
  updaters.push((t) => {
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i), z = wp.getZ(i);
      wp.setY(i, Math.sin(x * 0.8 - t * 2.5) * 0.06 + Math.cos(z * 2 + t * 1.7) * 0.04);
    }
    wp.needsUpdate = true;
  });
  box(170, FX - 1.4, STREAM_Z - 1.6, STREAM_Z + 1.6);
  box(FX + 1.4, 230, STREAM_Z - 1.6, STREAM_Z + 1.6);
  const plankM = mat(0xa0703c), railM = mat(0x7a4f2a);
  for (let i = 0; i < 9; i++) mesh(new THREE.BoxGeometry(2.8, 0.12, 0.5), plankM, FX, 0.04, STREAM_Z - 2.2 + i * 0.55, group);
  for (const side of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.12, 0.12, 4.6), railM, FX + side * 1.45, 0.75, STREAM_Z, group);
    for (const dz of [-2, 0, 2]) mesh(new THREE.BoxGeometry(0.16, 0.8, 0.16), railM, FX + side * 1.45, 0.4, STREAM_Z + dz, group);
  }
  // Stenen in de beek
  for (let i = 0; i < 14; i++) {
    const x = 180 + rand() * 40;
    if (Math.abs(x - FX) < 2.5) continue;
    mesh(new THREE.DodecahedronGeometry(0.3 + rand() * 0.4, 0), mat(0x8d99ae), x, -0.3, STREAM_Z + (rand() - 0.5) * 2.4, group);
  }

  // ---------- Bomen (instanced) ----------
  const trunks = [], cones1 = [], cones2 = [], rounds = [];
  const greens = [0x2d6a4f, 0x40916c, 0x1b4332, 0x52b788, 0x386641];
  function addTree(x, z, s, collide) {
    trunks.push({ x, z, s, y: 0, ry: rand() * 6 });
    const color = greens[Math.floor(rand() * greens.length)];
    if (rand() < 0.7) {
      cones1.push({ x, z, s, y: 1.6 * s, ry: rand() * 6, color });
      cones2.push({ x, z, s, y: 2.7 * s, ry: rand() * 6, color });
    } else {
      rounds.push({ x, z, s, y: 2.2 * s, ry: rand() * 6, color });
    }
    if (collide) colliders.push({ x, z, r: 0.45 * s });
  }
  // Binnen het bos: minder dicht, zodat je ertussen kunt lopen
  for (let i = 0; i < 420 && trunks.length < 150; i++) {
    const x = FOREST.minX + rand() * (FOREST.maxX - FOREST.minX), z = -43 + rand() * 86;
    if (!free(x, z, 0.6)) continue;
    if (trunks.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    addTree(x, z, 0.85 + rand() * 0.5, true);
  }
  // Randen: heel dicht bos (daar kun je niet komen)
  for (let i = 0; i < 260; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = FX + side * (20 + rand() * 22), z = -60 + rand() * 120;
    addTree(x, z, 1 + rand() * 0.9, false);
  }
  for (let i = 0; i < 90; i++) {
    const x = FX - 24 + rand() * 48;
    const z = rand() < 0.5 ? -47 - rand() * 12 : 47 + rand() * 10;
    if (Math.abs(x - FX) < 3.5) continue; // paden naar binnen en naar buiten
    addTree(x, z, 1 + rand() * 0.8, false);
  }
  const trunkM = mat(0x7a4f2a), leafM = mat(0xffffff);
  instanced(new THREE.CylinderGeometry(0.22, 0.35, 2, 5).translate(0, 1, 0), trunkM, trunks, group);
  instanced(new THREE.ConeGeometry(1.5, 2.2, 6), leafM, cones1, group);
  instanced(new THREE.ConeGeometry(1.05, 1.8, 6), leafM, cones2, group);
  instanced(new THREE.IcosahedronGeometry(1.4, 0), leafM, rounds, group);

  // ---------- Paddenstoelen en struiken ----------
  const stems = [], caps = [], bushes = [];
  const capColors = [0xe63946, 0xd4a373, 0xc77dff, 0xff9f1c];
  for (let i = 0; i < 300 && stems.length < 70; i++) {
    const x = 182 + rand() * 36, z = -43 + rand() * 86;
    if (!free(x, z) && rand() > 0.15) continue;
    if (Math.abs(z - STREAM_Z) < 2.2) continue;
    const big = stems.length < 6 && free(x, z, 1);
    const s = big ? 3 + rand() : 0.8 + rand() * 0.8;
    stems.push({ x, z, s });
    caps.push({ x, z, s, y: 0.32 * s, color: capColors[Math.floor(rand() * 4)], ry: rand() * 6 });
    if (big) colliders.push({ x, z, r: 0.35 * s });
  }
  instanced(new THREE.CylinderGeometry(0.07, 0.1, 0.35, 5).translate(0, 0.17, 0), mat(0xfff1d6), stems, group);
  instanced(new THREE.SphereGeometry(0.22, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffffff), caps, group);

  // ---------- Muren van struiken met poorten ----------
  const hedgeM = mat(0x2d6a4f);
  const gates = WALLS.map((wz, i) => {
    for (const [a, b] of [[176, FX - 2.2], [FX + 2.2, 224]]) {
      mesh(new THREE.BoxGeometry(b - a, 1.8, 1.4), hedgeM, (a + b) / 2, 0.9, wz, group);
      box(a, b, wz - 0.7, wz + 0.7);
      for (let x = a + 1; x < b; x += 2.2) bushes.push({ x, z: wz + (rand() - 0.5) * 0.4, y: 1.7, s: 0.8 + rand() * 0.4, color: 0x40916c });
    }
    const g = new THREE.Group();
    g.position.set(FX, 0, wz);
    group.add(g);
    const postM = mat(0x5c3d22);
    for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), postM, side * 2.1, 1.3, 0, g);
    mesh(new THREE.BoxGeometry(4.7, 0.4, 0.5), postM, 0, 2.7, 0, g);
    const doors = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.9, 0, 0);
      const d = mesh(new THREE.BoxGeometry(1.9, 1.7, 0.18), mat(0xb5835a), -side * 0.95, 0.95, 0, pivot);
      mesh(new THREE.BoxGeometry(1.9, 0.15, 0.22), postM, -side * 0.95, 1.5, 0, pivot);
      mesh(new THREE.BoxGeometry(1.9, 0.15, 0.22), postM, -side * 0.95, 0.4, 0, pivot);
      g.add(pivot);
      return { pivot, side, d };
    });
    // Lampjes: eentje per drukknop (rood = nog niet, groen = er staat iemand op)
    const lamps = PLATES[i].map((_, k, arr) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff4d4d }));
      l.position.set((k - (arr.length - 1) / 2) * 0.6, 3.15, 0.1);
      g.add(l);
      return l;
    });
    // Bordje met het nummer
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshBasicMaterial({ map: signTexture(`POORT ${i + 1}`, '#5c3d22') }));
    sign.position.set(0, 2.7, 0.27); g.add(sign);
    const collider = box(FX - 2.2, FX + 2.2, wz - 0.35, wz + 0.35);
    return { z: wz, g, doors, lamps, collider, openAmount: 0, open: false };
  });
  instanced(new THREE.IcosahedronGeometry(0.9, 0), mat(0xffffff), bushes, group);

  // ---------- Drukknoppen ----------
  const stoneM = mat(0x9aa0a6);
  const puzzles = PLATES.map((ps, i) => ({
    needs: PUZZLE_NEEDS[i],
    gate: gates[i],
    plates: ps.map((p) => {
      const base = mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.16, 10), stoneM, p.x, 0.08, p.z, group, false);
      const topM = mat(0xffd23f, { emissive: 0x332200 });
      const top = mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.16, 10), topM, p.x, 0.22, p.z, group, false);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.9, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.5, depthWrite: false }));
      ring.position.set(p.x, 0.06, p.z); group.add(ring);
      return { x: p.x, z: p.z, r: 1.3, top, topM, ring, base, pressed: false };
    }),
  }));

  // ---------- De uil op een boomstronk ----------
  const owl = createOwl();
  owl.group.position.set(owlSpot.x, 0, owlSpot.z);
  group.add(owl.group);
  colliders.push({ x: owlSpot.x, z: owlSpot.z, r: 0.8 });

  // ---------- Het stuk van de schatkaart ----------
  const pedestal = new THREE.Group();
  pedestal.position.set(mapSpot.x, 0, mapSpot.z);
  mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.9, 8), stoneM, 0, 0.45, 0, pedestal);
  mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.12, 8), mat(0xd4a373), 0, 0.95, 0, pedestal);
  const scroll = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.0, 8), mat(0xf4e1b5, { emissive: 0x443311 }), 0, 0, 0, scroll).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8), mat(0xc0392b), -0.45, 0, 0, scroll).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8), mat(0xc0392b), 0.45, 0, 0, scroll).rotation.z = Math.PI / 2;
  scroll.position.y = 1.8;
  pedestal.add(scroll);
  const mapGlow = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.6, depthWrite: false }));
  mapGlow.position.y = 0.05; pedestal.add(mapGlow);
  group.add(pedestal);
  colliders.push({ x: mapSpot.x, z: mapSpot.z, r: 1.0 });

  // ---------- Dicht pad naar het volgende gebied ----------
  const logM = mat(0x6b4226);
  for (let k = 0; k < 3; k++) {
    const log = mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 7), logM, FX, 0.4 + k * 0.7, -44.6 - (k % 2) * 0.2, group);
    log.rotation.z = Math.PI / 2;
  }
  const soon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), new THREE.MeshBasicMaterial({ map: signTexture('BINNENKORT', '#9b5de5') }));
  soon.position.set(FX, 2.8, -44.1); group.add(soon);
  mesh(new THREE.BoxGeometry(0.2, 2.4, 0.2), logM, FX, 1.2, -44.3, group);
  mesh(new THREE.PlaneGeometry(3, 14).rotateX(-Math.PI / 2), pathM, FX, 0.02, -53, group, false);

  // ---------- Uitgang terug naar het dorp ----------
  // (geen balk bovenlangs, anders zit die voor de camera)
  const arch = new THREE.Group();
  arch.position.set(FX, 0, 45.6);
  for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), logM, side * 1.9, 0.8, 0, arch);
  mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), logM, 3.2, 1.1, -1.2, arch);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ map: signTexture('DORP', '#e07a00') }));
  back.position.set(3.2, 2.0, -1.08); arch.add(back);
  group.add(arch);

  // ---------- Lichtstralen tussen de bomen ----------
  const shaftM = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.2, 16, 6, 1, true), shaftM);
    s.position.set(185 + rand() * 30, 7, -38 + i * 12);
    s.rotation.z = 0.35; s.rotation.x = -0.2;
    group.add(s);
  }

  // ---------- Vuurvliegjes ----------
  const FLIES = 70;
  const flyPos = new Float32Array(FLIES * 3);
  const flyBase = [];
  for (let i = 0; i < FLIES; i++) flyBase.push([182 + rand() * 36, 0.6 + rand() * 2.5, -43 + rand() * 86, rand() * 6]);
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: 0xfff27a, size: 0.28, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false;
  group.add(flies);
  updaters.push((t) => {
    for (let i = 0; i < FLIES; i++) {
      const [x, y, z, p] = flyBase[i];
      flyPos[i * 3] = x + Math.sin(t * 0.7 + p) * 1.2;
      flyPos[i * 3 + 1] = y + Math.sin(t * 1.3 + p * 2) * 0.4;
      flyPos[i * 3 + 2] = z + Math.cos(t * 0.6 + p) * 1.2;
    }
    flyGeo.attributes.position.needsUpdate = true;
  });

  // ---------- Vallende blaadjes (rond de speler) ----------
  const LEAVES = 40;
  const leafGeo = new THREE.PlaneGeometry(0.28, 0.2);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), LEAVES);
  const leafCols = [0xf4a261, 0xe9c46a, 0xe76f51, 0x95d5b2];
  const leafData = [];
  for (let i = 0; i < LEAVES; i++) {
    leaves.setColorAt(i, new THREE.Color(leafCols[i % 4]));
    leafData.push({ x: (rand() - 0.5) * 24, y: rand() * 8, z: (rand() - 0.5) * 20, p: rand() * 6, v: 0.6 + rand() * 0.6 });
  }
  leaves.frustumCulled = false;
  group.add(leaves);
  const lo = new THREE.Object3D();
  let leafCenter = { x: FX, z: 40 };

  // ---------- Elk beeldje ----------
  function update(t, dt, { pressers, playerPos, solved }) {
    updaters.forEach((f) => f(t, dt));
    owl.update(t, dt, playerPos);
    leafCenter = playerPos;
    for (let i = 0; i < LEAVES; i++) {
      const L = leafData[i];
      L.y -= L.v * dt;
      if (L.y < 0) { L.y = 7 + rand() * 2; L.x = (rand() - 0.5) * 24; L.z = (rand() - 0.5) * 20; }
      lo.position.set(leafCenter.x + L.x + Math.sin(t + L.p) * 0.8, L.y, leafCenter.z + L.z + Math.cos(t * 0.8 + L.p) * 0.5);
      lo.rotation.set(t * 2 + L.p, t * 1.5 + L.p, 0);
      lo.updateMatrix();
      leaves.setMatrixAt(i, lo.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;
    // Kaart draait en zweeft
    scroll.rotation.y = t * 1.5;
    scroll.position.y = 1.8 + Math.sin(t * 2) * 0.15;
    mapGlow.material.opacity = 0.35 + Math.sin(t * 3) * 0.25;

    // Puzzels
    const newlySolved = [];
    puzzles.forEach((pz, i) => {
      let count = 0;
      for (const pl of pz.plates) {
        pl.pressed = pressers.some((p) => Math.hypot(p.x - pl.x, p.z - pl.z) < pl.r);
        if (pl.pressed) count++;
        pl.top.position.y += ((pl.pressed ? 0.1 : 0.22) - pl.top.position.y) * Math.min(1, dt * 10);
        pl.topM.color.set(pl.pressed || solved[i] ? 0x7dff9b : 0xffd23f);
        pl.topM.emissive.set(pl.pressed ? 0x1f6f3a : 0x332200);
        pl.ring.material.opacity = solved[i] ? 0.15 : 0.35 + Math.sin(t * 4) * 0.2;
      }
      pz.pressedCount = count;
      const gate = pz.gate;
      gate.open = solved[i] || count >= pz.plates.length;
      gate.collider.off = gate.open;
      gate.lamps.forEach((l, k) => l.material.color.set(solved[i] || pz.plates[k].pressed ? 0x33ff77 : 0xff4d4d));
      gate.openAmount += ((gate.open ? 1 : 0) - gate.openAmount) * Math.min(1, dt * 5);
      gate.doors.forEach((d) => { d.pivot.rotation.y = d.side * 1.7 * gate.openAmount; });
      // Ben je door de open poort gelopen? Dan blijft hij voortaan open.
      if (!solved[i] && gate.open && playerPos.z < gate.z - 1.0 && Math.abs(playerPos.x - FX) < 3) newlySolved.push(i);
    });
    return newlySolved;
  }

  function clamp(pos, radius = 0.45) {
    pos.x = Math.max(FOREST.minX, Math.min(FOREST.maxX, pos.x));
    pos.z = Math.max(FOREST.minZ, Math.min(FOREST.maxZ, pos.z));
    // Bij de uitgang is het pad smal
    if (pos.z > 43 && Math.abs(pos.x - FX) > 2) pos.z = 43;
  }

  return {
    group, colliders, clamp, update, puzzles, owl, owlSpot, mapSpot, entry,
    allPlates: puzzles.flatMap((p) => p.plates),
    contains: (p) => p.x >= FOREST.minX - 1 && p.x <= FOREST.maxX + 1 && p.z >= FOREST.minZ - 1 && p.z <= FOREST.maxZ + 1,
    atExit: (p) => p.z > 44.2 && Math.abs(p.x - FX) < 2.2,
    nearMap: (p) => Math.hypot(p.x - mapSpot.x, p.z - mapSpot.z) < 2.2,
    setMapTaken: (yes) => { scroll.visible = !yes; mapGlow.visible = !yes; },
    fog: { color: 0x9cd3a4, near: 18, far: 60 },
  };
}

// Een vriendelijke uil: Uil Wijsje
function createOwl() {
  const g = new THREE.Group();
  const brown = mat(0x8d6e4e), light = mat(0xe9d8a6), dark = mat(0x5c4033);
  mesh(new THREE.CylinderGeometry(0.65, 0.8, 1.1, 8), mat(0x7a4f2a), 0, 0.55, 0, g);       // stronk
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 8), mat(0xd4a373), 0, 1.11, 0, g);
  const bird = new THREE.Group();
  bird.position.y = 1.15;
  g.add(bird);
  const body = mesh(new THREE.IcosahedronGeometry(0.55, 0), brown, 0, 0.55, 0, bird);
  body.scale.set(1, 1.15, 0.9);
  mesh(new THREE.IcosahedronGeometry(0.38, 0), light, 0, 0.5, 0.25, bird).scale.set(1, 1.2, 0.6);
  const head = new THREE.Group();
  head.position.y = 1.15;
  bird.add(head);
  mesh(new THREE.IcosahedronGeometry(0.45, 0), brown, 0, 0, 0, head).scale.set(1.1, 0.9, 0.95);
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10), mat(0xffffff), s * 0.17, 0.05, 0.38, head);
    eye.rotation.x = Math.PI / 2;
    const pupil = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), mat(0x222222), s * 0.17, 0.05, 0.42, head);
    pupil.rotation.x = Math.PI / 2;
    const tuft = mesh(new THREE.ConeGeometry(0.1, 0.3, 4), dark, s * 0.28, 0.42, 0, head);
    tuft.rotation.z = -s * 0.3;
  }
  const beak = mesh(new THREE.ConeGeometry(0.07, 0.18, 4), mat(0xffa62b), 0, -0.1, 0.44, head);
  beak.rotation.x = Math.PI / 2 + 0.4;
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.5, 0.8, 0);
    const w = mesh(new THREE.BoxGeometry(0.14, 0.7, 0.5), dark, 0, -0.32, 0, pivot);
    w.rotation.z = s * 0.1;
    bird.add(pivot);
    return { pivot, s };
  });
  // "!" boven haar hoofd
  const marker = new THREE.Group();
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), yellow); bar.position.y = 0.2;
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), yellow); dot.position.y = -0.25;
  marker.add(bar, dot);
  marker.position.y = 3.4;
  g.add(marker);

  let flap = 0;
  return {
    group: g, mesh: g,
    showMarker(yes) { marker.visible = yes; },
    distanceTo(p) { return Math.hypot(p.x - g.position.x, p.z - g.position.z); },
    hop() { flap = 1.2; },
    update(t, dt, playerPos) {
      marker.position.y = 3.4 + Math.sin(t * 3) * 0.12;
      marker.rotation.y = t * 2;
      const target = Math.atan2(playerPos.x - g.position.x, playerPos.z - g.position.z);
      let diff = target - bird.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      bird.rotation.y += diff * Math.min(1, dt * 4);
      head.rotation.z = Math.sin(t * 1.1) * 0.15;  // nieuwsgierig hoofd scheef
      flap = Math.max(0, flap - dt);
      const f = flap > 0 ? Math.sin(t * 25) * 0.8 : Math.sin(t * 2) * 0.05;
      wings.forEach((w) => { w.pivot.rotation.z = w.s * (0.1 + Math.abs(f)); });
      bird.position.y = 1.15 + (flap > 0 ? Math.abs(Math.sin(t * 12)) * 0.15 : 0);
    },
  };
}

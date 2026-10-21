// De Stad: een gezellige stad met straten, huizen, een fontein en 4 winkels.
// Je komt hier via de regenboogpoort aan de oostkant van het dorp. Idee van Joshua!
import * as THREE from 'three';
import { mat, box } from './characters.js';
import { mesh, seeded } from './props.js';
import { makePortal } from './world.js';
import { Npc } from './npc.js';
import { makeHat } from './characters.js';
import { createCars, roundedLoop } from './cars.js';
import { createShowroom } from './autowinkel.js';
import { createBigCity, treeBatch, makeHouse, BIG_BOUNDS } from './citymore.js';
import { mergeStatic, mergeLocal, instanced } from './optimize.js';

// Een bord met tekst dat zelf de letters kleiner maakt als de tekst lang is
function wideSign(text, bg, w = 512, h = 112) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2d3142'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
  let size = 62;
  g.font = `bold ${size}px sans-serif`;
  while (g.measureText(text).width > w - 50 && size > 20) { size -= 2; g.font = `bold ${size}px sans-serif`; }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.strokeText(text, w / 2, h / 2 + 3);
  g.fillText(text, w / 2, h / 2 + 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ROAD = { minX: -17, maxX: 17, minZ: 6, maxZ: 17.5, w: 3.4 };

export function createCity(group) {
  const rand = seeded(2026);
  const colliders = [], boxes = [], updaters = [], fadeables = [];

  // ---------- Grond, plein en straten ----------
  const ground = mesh(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2), mat(0x8fcf73), 0, 0, 0, group);
  ground.castShadow = false;
  const flat = (w, d, color, x, z, y = 0.02) => {
    const m = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat(color, { polygonOffset: true, polygonOffsetFactor: -2 - y * 50, polygonOffsetUnits: -2 - y * 50 }), x, y, z, group);
    m.castShadow = false;
    return m;
  };
  flat(46, 13, 0xe8dcc4, 0, -2.5);        // het plein met tegels
  for (let x = -22; x <= 22; x += 2) flat(0.06, 13, 0xd4c6aa, x, -2.5, 0.03); // voegen tussen de tegels
  for (let z = -9; z <= 4; z += 2) flat(46, 0.06, 0xd4c6aa, 0, z, 0.03);
  flat(7, 18, 0xe8dcc4, 0, 13);            // de winkelstraat (alleen voor lopen)
  // De autoweg: een rondje met asfalt, witte streepjes en twee zebrapaden
  const R = ROAD, RW = ROAD.w;
  const roadM = 0x6c727a;
  flat(R.maxX - R.minX + RW, RW, roadM, 0, R.minZ, 0.035);
  flat(R.maxX - R.minX + RW, RW, roadM, 0, R.maxZ, 0.035);
  flat(RW, R.maxZ - R.minZ, roadM, R.minX, (R.minZ + R.maxZ) / 2, 0.035);
  flat(RW, R.maxZ - R.minZ, roadM, R.maxX, (R.minZ + R.maxZ) / 2, 0.035);
  for (const z of [R.minZ, R.maxZ]) {
    for (let x = R.minX + 3; x <= R.maxX - 3; x += 2.4) if (Math.abs(x) > 3.2) flat(1.2, 0.18, 0xffffff, x, z, 0.045);
    for (let i = 0; i < 6; i++) flat(0.6, RW - 0.4, 0xffffff, -2.6 + i * 1.04, z, 0.045); // zebrapad
  }
  for (const x of [R.minX, R.maxX]) for (let z = R.minZ + 3; z <= R.maxZ - 3; z += 2.4) flat(0.18, 1.2, 0xffffff, x, z, 0.045);

  // ---------- Fontein in het midden ----------
  const fx = 0, fz = -0.5;
  mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.6, 12), mat(0xb8bec7), fx, 0.3, fz, group);
  const pool = mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 12), mat(0x4fb3e8, { transparent: true, opacity: 0.85, roughness: 0.2 }), fx, 0.58, fz, group);
  pool.castShadow = false;
  mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 8), mat(0xb8bec7), fx, 1.2, fz, group);
  mesh(new THREE.CylinderGeometry(0.9, 0.6, 0.25, 10), mat(0xb8bec7), fx, 2.0, fz, group);
  const spout = mesh(new THREE.ConeGeometry(0.3, 1, 8), mat(0x9bdcff, { transparent: true, opacity: 0.7 }), fx, 2.6, fz, group);
  spout.castShadow = false;
  // de druppels: 16 stuks, in één keer getekend
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshBasicMaterial({ color: 0xbfe9ff }), 16);
  drops.frustumCulled = false;
  group.add(drops);
  const dropM = new THREE.Matrix4();
  updaters.push((t) => {
    spout.scale.y = 1 + Math.sin(t * 6) * 0.15;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, k = (t * 0.8 + i / 16) % 1;
      dropM.makeTranslation(fx + Math.cos(a) * k * 1.4, 3 + k * 1.2 - k * k * 3.6, fz + Math.sin(a) * k * 1.4);
      drops.setMatrixAt(i, dropM);
    }
    drops.instanceMatrix.needsUpdate = true;
  });
  colliders.push({ x: fx, z: fz, r: 2.3 });

  // ---------- De 4 winkels (op een rij aan de achterkant van het plein) ----------
  const FRONT = -7; // hier is de voorkant van de winkels
  const shopSpots = [], shopGroups = [];
  function shop(x, { name, wall, trim, awning, deco }) {
    const g = new THREE.Group();
    g.position.set(x, 0, 0);
    group.add(g);
    const W = 7.2, D = 5, H = 5.2, cz = FRONT - D / 2;
    mesh(new THREE.BoxGeometry(W, H, D), mat(wall), 0, H / 2, cz, g);
    mesh(new THREE.BoxGeometry(W + 0.3, 0.4, D + 0.3), mat(trim), 0, H + 0.2, cz, g);       // dakrand
    // deur en twee etalages
    mesh(new THREE.BoxGeometry(1.5, 2.3, 0.1), mat(0x8b5a2b), 0, 1.15, FRONT + 0.03, g);
    mesh(new THREE.BoxGeometry(0.14, 0.14, 0.06), mat(0xffd23f), 0.5, 1.15, FRONT + 0.1, g);
    for (const wx of [-2.4, 2.4]) {
      mesh(new THREE.BoxGeometry(2.2, 1.7, 0.1), mat(0xbfe9ff, { emissive: 0x335566, emissiveIntensity: 0.6 }), wx, 1.55, FRONT + 0.03, g);
      mesh(new THREE.BoxGeometry(2.4, 0.15, 0.3), mat(trim), wx, 0.65, FRONT + 0.12, g);
    }
    // gestreepte luifel
    for (let i = 0; i < 9; i++) {
      const s = mesh(new THREE.BoxGeometry(W / 9, 0.08, 1.3), mat(i % 2 ? 0xffffff : awning), -W / 2 + W / 18 + (i * W) / 9, 2.95, FRONT + 0.6, g);
      s.rotation.x = 0.35;
    }
    // het bord met de naam
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.3), new THREE.MeshBasicMaterial({ map: wideSign(name, `#${new THREE.Color(trim).getHexString()}`) }));
    sign.position.set(0, 4.15, FRONT + 0.06);
    g.add(sign);
    // spulletjes in de etalage en iets groots op het dak
    deco(g, updaters);
    boxes.push({ x, z: cz, hw: W / 2, hd: D / 2, h: 7.5 }); // (met de dingen op het dak)
    shopSpots.push({ x, z: FRONT + 1.9 });
    shopGroups.push(g);
    return g;
  }

  // Speelgoedwinkel: blokken in de etalage en ballonnen op het dak
  shop(-13.2, {
    name: 'SPEELGOEDWINKEL', wall: 0xffe8a3, trim: 0xe76f51, awning: 0xe76f51,
    deco(g, up) {
      const cols = [0xe63946, 0x3a86ff, 0xffd23f, 0x2a9d8f];
      for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat(cols[i]), -3.1 + i * 0.45, 0.95 + (i % 2) * 0.1, FRONT + 0.25, g);
      mesh(new THREE.SphereGeometry(0.35, 8, 6), mat(0xff6b6b), 2.4, 1.05, FRONT + 0.3, g);
      const teddy = new THREE.Group();
      mesh(new THREE.SphereGeometry(0.9, 8, 6), mat(0xb5651d), 0, 0.9, 0, teddy);
      mesh(new THREE.SphereGeometry(0.6, 8, 6), mat(0xb5651d), 0, 2.0, 0, teddy);
      for (const ex of [-0.45, 0.45]) mesh(new THREE.SphereGeometry(0.22, 6, 4), mat(0x8b4513), ex, 2.5, 0, teddy);
      mesh(new THREE.SphereGeometry(0.22, 6, 4), mat(0xf4d6a0), 0, 1.9, 0.5, teddy);
      for (const ex of [-0.2, 0.2]) mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), mat(0x1d1d1d), ex, 2.15, 0.55, teddy);
      teddy.position.set(-1.8, 5.4, FRONT - 2.5);
      g.add(teddy);
      const balloons = [];
      [[1.6, 0xff5d8f], [2.2, 0x3a86ff], [2.8, 0xffd23f]].forEach(([bx, c], i) => {
        const b = new THREE.Group();
        mesh(new THREE.SphereGeometry(0.45, 8, 6), mat(c), 0, 0, 0, b).scale.y = 1.2;
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 3), mat(0xffffff));
        str.position.y = -1.4; b.add(str);
        b.position.set(bx, 7.2 + i * 0.3, FRONT - 1.5);
        g.add(b); balloons.push(b);
      });
      up.push((t) => balloons.forEach((b, i) => { b.position.y = 7.2 + i * 0.3 + Math.sin(t * 1.5 + i) * 0.2; b.rotation.z = Math.sin(t + i) * 0.1; }));
    },
  });

  // Snoepwinkel: snoepjes in de etalage en een grote lolly op het dak
  shop(-4.4, {
    name: 'SNOEPWINKEL', wall: 0xffd6e7, trim: 0xd63384, awning: 0xff8fab,
    deco(g, up) {
      const cols = [0xff5d8f, 0x7af7ff, 0xffd23f, 0x9b5de5, 0x52b788];
      for (let i = 0; i < 10; i++) mesh(new THREE.SphereGeometry(0.15, 6, 4), mat(cols[i % 5]), -3.2 + (i % 5) * 0.4, 0.9 + Math.floor(i / 5) * 0.28, FRONT + 0.25, g);
      for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.7, 8), mat(0xffffff, { transparent: true, opacity: 0.6 }), 1.7 + i * 0.7, 1.1, FRONT + 0.3, g);
      const lolly = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), mat(0xffffff), 0, 1.2, 0, lolly);
      const candy = new THREE.Group();
      candy.position.y = 2.8;
      lolly.add(candy);
      mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 14), mat(0xff5d8f), 0, 0, 0, candy).rotation.x = Math.PI / 2;
      mesh(new THREE.TorusGeometry(0.65, 0.12, 4, 14), mat(0xffffff), 0, 0, 0.17, candy);
      mesh(new THREE.TorusGeometry(0.3, 0.1, 4, 12), mat(0xffd23f), 0, 0, 0.17, candy);
      lolly.position.set(0, 5.4, FRONT - 2);
      g.add(lolly);
      up.push((t) => { candy.rotation.z = t * 1.2; });
    },
  });

  // Kledingwinkel: shirts in de etalage en een groot T-shirt op het dak
  shop(4.4, {
    name: 'KLEDINGWINKEL', wall: 0xd7f0ff, trim: 0x3a0ca3, awning: 0x4361ee,
    deco(g) {
      [[-3.0, 0xe63946], [-2.4, 0x2a9d8f], [-1.8, 0xffc300], [1.8, 0x9b5de5], [2.4, 0x2d2d2d], [3.0, 0xff8c42]].forEach(([sx, c]) => {
        mesh(new THREE.BoxGeometry(0.45, 0.55, 0.1), mat(c), sx, 1.45, FRONT + 0.25, g);
        mesh(new THREE.BoxGeometry(0.7, 0.18, 0.1), mat(c), sx, 1.66, FRONT + 0.25, g);
      });
      const shirt = new THREE.Group();
      mesh(new THREE.BoxGeometry(1.8, 2, 0.3), mat(0xff8c42), 0, 1, 0, shirt);
      mesh(new THREE.BoxGeometry(3, 0.7, 0.3), mat(0xff8c42), 0, 1.7, 0, shirt);
      mesh(new THREE.BoxGeometry(0.6, 0.15, 0.32), mat(0xffffff), 0, 2.0, 0, shirt);
      mesh(new THREE.OctahedronGeometry(0.3, 0), mat(0xffd23f, { emissive: 0x664400 }), 0, 1.1, 0.2, shirt);
      shirt.position.set(1.2, 5.4, FRONT - 2);
      g.add(shirt);
      const hat = makeHat('cowboy');
      hat.scale.setScalar(1.8);
      hat.position.set(-1.8, 4.7, FRONT - 2);
      g.add(hat);
    },
  });

  // Boekwinkel: stapels boeken en een groot open boek op het dak
  shop(13.2, {
    name: 'BOEKWINKEL', wall: 0xe9f5db, trim: 0x2d6a4f, awning: 0x52b788,
    deco(g, up) {
      const cols = [0xe63946, 0x3a86ff, 0xffd23f, 0x2a9d8f, 0x9b5de5];
      for (const bx of [-2.4, 2.4]) {
        for (let i = 0; i < 5; i++) {
          const b = mesh(new THREE.BoxGeometry(0.9, 0.16, 0.6), mat(cols[(i + (bx > 0 ? 2 : 0)) % 5]), bx + (i % 2 ? 0.08 : -0.06), 0.85 + i * 0.17, FRONT + 0.4, g);
          b.rotation.y = (i % 3 - 1) * 0.15;
        }
      }
      const book = new THREE.Group();
      for (const s of [-1, 1]) {
        const page = mesh(new THREE.BoxGeometry(1.4, 0.12, 1.8), mat(0xfffdf5), s * 0.72, 0, 0, book);
        page.rotation.z = -s * 0.25;
        const cover = mesh(new THREE.BoxGeometry(1.5, 0.08, 1.9), mat(0x2d6a4f), s * 0.74, -0.1, 0, book);
        cover.rotation.z = -s * 0.25;
      }
      book.rotation.x = 1.1;
      book.position.set(0, 6.3, FRONT - 2);
      g.add(book);
      up.push((t) => { book.position.y = 6.3 + Math.sin(t * 1.2) * 0.15; });
    },
  });

  // ---------- Huizen langs de hoofdstraat ----------
  const roofCols = [0xd1495b, 0x3a86ff, 0x9b5de5, 0x2a9d8f, 0xff8c42];
  // (alle huizen worden doorzichtig als ze tussen jou en de camera staan)
  const house = (x, z, rot, roof, tall = 1) => makeHouse(group, { boxes, fadeables }, x, z, rot, roof, tall);
  house(-8.5, 11.8, Math.PI / 2, roofCols[0], 1.6);
  house(-13.6, 11.8, Math.PI / 2, roofCols[1]);
  house(-9, 23.2, Math.PI, roofCols[3], 1.6);
  house(9, 23.2, Math.PI, roofCols[2], 1.6);
  house(-18.5, -12, 0, roofCols[4], 1.6);
  house(18.5, -12, 0, roofCols[0], 1.6);

  // ---------- Een parkje met bomen en bankjes ----------
  const trees = treeBatch(rand, colliders); // alle bomen samen in één keer getekend
  const tree = (x, z, s = 1, collide = true) => trees.add(x, z, s, collide);
  flat(10, 7, 0x74c69d, 10, 11.8, 0.025);
  tree(7, 10.2, 1.1); tree(13.4, 13.6, 1.2); tree(13, 9.8, 1); tree(-17.5, 2.5, 1.1); tree(17.5, 2.5, 1.1);
  function bench(x, z, rot) {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.8, 0.12, 0.6), mat(0xc68b59), 0, 0.5, 0, g);
    mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), mat(0xc68b59), 0, 0.85, -0.28, g);
    for (const lx of [-0.75, 0.75]) mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), mat(0x495057), lx, 0.25, 0, g);
    g.position.set(x, 0, z); g.rotation.y = rot; group.add(g);
    colliders.push({ x, z, r: 0.75 });
  }
  bench(10, 12.5, Math.PI); bench(-6.5, 1.5, Math.PI / 2); bench(6.5, 1.5, -Math.PI / 2);
  // bloembakken op het plein
  for (const [x, z] of [[-9, 2.5], [9, 2.5], [-17, -3], [17, -3]]) {
    mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), mat(0xc68b59), x, 0.3, z, group);
    for (let i = 0; i < 5; i++) mesh(new THREE.OctahedronGeometry(0.2, 0), mat([0xff6b6b, 0xffd23f, 0xffffff, 0xc77dff][i % 4]), x + (rand() - 0.5) * 1.1, 0.75, z + (rand() - 0.5) * 1.1, group);
    colliders.push({ x, z, r: 1.0 });
  }

  // ---------- Lantaarnpalen en vlaggetjes over de straat ----------
  const flagGeo = new THREE.ConeGeometry(0.25, 0.5, 3), flagM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const z of [8, 14, 20]) {
    for (const sx of [-4.4, 4.4]) {
      mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6), mat(0x2d3142), sx, 1.8, z, group);
      mesh(new THREE.SphereGeometry(0.25, 6, 4), mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 0.6 }), sx, 3.7, z, group);
      colliders.push({ x: sx, z, r: 0.25 });
    }
    const flags = new THREE.Group();
    flags.position.set(0, 3.4, z);
    const cols = [0xe63946, 0xffd23f, 0x3a86ff, 0x52b788, 0xff8fab];
    instanced(flags, flagGeo, flagM, Array.from({ length: 11 }, (_, i) => ({ x: -4 + i * 0.8, y: -0.35 - Math.sin((i / 10) * Math.PI) * 0.4, z: 0, rx: Math.PI, color: cols[i % 5] })), { cast: false, receive: false });
    group.add(flags);
    updaters.push((t) => { flags.rotation.x = Math.sin(t * 1.5 + z) * 0.12; });
  }

  // ---------- De Grote Stad: ringweg, rotonde, lange weg, flats, park, parkeerplaats, skyline ----------
  const big = createBigCity(group, { colliders, boxes, fadeables, updaters, rand, flat, trees, bench });

  // ---------- Wolken ----------
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const p = mesh(new THREE.IcosahedronGeometry(1.4 + rand() * 1.2, 0), mat(0xffffff), j * 1.8 - 1.8, rand() * 0.6, rand() - 0.5, c);
      p.castShadow = false; p.receiveShadow = false;
    }
    const sx = rand() * 120 - 60, sz = rand() * 60 - 50, sy = 18 + rand() * 6, sp = 0.5 + rand() * 0.6;
    group.add(c);
    mergeLocal(c);
    updaters.push((t) => { c.position.set(((sx + t * sp + 60) % 120) - 60, sy, sz); });
  }

  // ---------- De regenboogpoort terug naar het dorp ----------
  const portal = makePortal(group, 0, 22.4, Math.PI, 'NAAR HET DORP', '#52b788');
  portal.group.scale.setScalar(0.8);
  updaters.push(portal.update);

  // ---------- De mensen in de stad ----------
  const S = shopSpots;
  const keepers = [
    new Npc(group, {
      id: 'speelgoed', name: 'Toby Tol', x: S[0].x, z: S[0].z, rot: 0, voice: 1.25,
      look: { shirt: 0xe76f51, pants: 0x264653, skin: 0xf1c27d, hair: 0xff8c42 },
      decorate(ch) { const h = makeHat('feest'); h.scale.setScalar(0.9); ch.head.add(h); },
    }),
    new Npc(group, {
      id: 'snoep', name: 'Tante Toffee', x: S[1].x, z: S[1].z, rot: 0, voice: 1.4,
      look: { shirt: 0xff8fab, pants: 0xd63384, skin: 0xffdbac, hair: 0x8b4513 },
      decorate(ch) {
        ch.body.add(box(0.6, 0.6, 0.05, mat(0xffffff), 0, -0.08, 0.24)); // schort
        const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), ch.hairM);
        bun.position.set(0, 0.4, -0.2); ch.head.add(bun);
      },
    }),
    new Npc(group, {
      id: 'kleding', name: 'Madame Mouw', x: S[2].x, z: S[2].z, rot: 0, voice: 1.15,
      look: { shirt: 0x4361ee, pants: 0x3a0ca3, skin: 0xc68642, hair: 0x1d1d1d, coat: 0x7209b7 },
      decorate(ch) {
        ch.head.add(box(0.18, 0.1, 0.03, mat(0xffd23f), -0.14, 0.03, 0.31), box(0.18, 0.1, 0.03, mat(0xffd23f), 0.14, 0.03, 0.31)); // bril
        const h = makeHat('tovenaar'); h.scale.setScalar(0.8); h.children.forEach((c) => c.material?.color?.set(0xff5d8f)); ch.head.add(h);
      },
    }),
    new Npc(group, {
      id: 'boek', name: 'Meester Bladwijzer', x: S[3].x, z: S[3].z, rot: 0, voice: 0.75,
      look: { shirt: 0x8d99ae, pants: 0x495057, skin: 0xffcc99, hair: 0xdee2e6, coat: 0x6b4226 },
      decorate(ch) {
        ch.head.add(box(0.5, 0.18, 0.05, mat(0xdee2e6), 0, -0.16, 0.3)); // baard
        ch.head.add(box(0.18, 0.12, 0.03, mat(0x333333), -0.14, 0.03, 0.31), box(0.18, 0.12, 0.03, mat(0x333333), 0.14, 0.03, 0.31));
        ch.arms[1].add(box(0.3, 0.4, 0.1, mat(0x2d6a4f), 0, -0.7, 0.15)); // een boek in zijn hand
      },
    }),
  ];
  keepers.forEach((k, i) => { k.shop = ['speelgoed', 'snoep', 'kleding', 'boek'][i]; colliders.push({ x: k.pos.x, z: k.pos.z, r: 0.45 }); });

  const mayor = new Npc(group, {
    id: 'burgemeester', name: 'Burgemeester Bert', x: 3.4, z: 2.4, rot: 0.6, voice: 0.7,
    look: { shirt: 0xffffff, pants: 0x2d3142, skin: 0xe0ac69, hair: 0x6b3e26, coat: 0x2d3142 },
    decorate(ch) {
      const gold = mat(0xffc300, { metalness: 0.5, emissive: 0x553300 });
      ch.body.add(box(0.5, 0.08, 0.05, gold, 0, 0.18, 0.26)); // ambtsketen
      ch.body.add(box(0.16, 0.16, 0.05, gold, 0, 0.02, 0.27));
      ch.head.add(box(0.7, 0.08, 0.7, mat(0x1d1d1d), 0, 0.34, 0));
      ch.head.add(box(0.46, 0.4, 0.46, mat(0x1d1d1d), 0, 0.56, 0)); // hoge hoed
    },
  });
  colliders.push({ x: mayor.pos.x, z: mayor.pos.z, r: 0.45 });

  const lotte = new Npc(group, {
    id: 'lotte', name: 'Lotte', x: -11, z: -1, voice: 1.6, wander: 2,
    look: { shirt: 0xffd23f, pants: 0x3a86ff, skin: 0xffdbac, hair: 0xe9c46a },
  });
  const opa = new Npc(group, {
    id: 'opa', name: 'Opa Duif', x: 11, z: -1, voice: 0.6, wander: 2,
    look: { shirt: 0x6d597a, pants: 0x495057, skin: 0xf1c27d, hair: 0xe5e5e5, coat: 0x8d99ae },
  });

  // ---------- De Autowinkel (oostkant): een showroom waar je echt in kunt lopen ----------
  const showroom = createShowroom(group, { colliders, boxes, updaters, wideSign });

  const npcs = [...keepers, mayor, lotte, opa, showroom.dealer];

  // ---------- Autootjes (stoppen voor iedereen die voor ze staat) ----------
  const loop = roundedLoop(ROAD.minX, ROAD.maxX, ROAD.minZ, ROAD.maxZ, 2.5);
  const traffic = createCars(group, loop, [0xe63946, 0x3a86ff, 0xffd23f, 0x52b788], { colliders, onHonk: () => zone.onHonk?.() });
  // en 3 autootjes op de grote ringweg (die rijden ook over de rotonde)
  const traffic2 = createCars(group, big.route, [0xff8c42, 0x9b5de5, 0x2ec4b6], { colliders, onHonk: () => zone.onHonk?.() });
  trees.build(group);

  // ---------- De mensen: hoofd, armen en benen worden elk één vorm ----------
  for (const n of npcs) for (const part of [n.ch.head, ...n.ch.arms, ...n.ch.legs]) mergeLocal(part);
  for (const d of Object.values(showroom.displays)) mergeLocal(d.spin);

  // ---------- Alles wat stilstaat samenplakken (veel sneller tekenen) ----------
  const far = { x: -999, z: -999 };
  const merged = mergeStatic(group, {
    probe: (t) => { updaters.forEach((f) => f(t, 0.016)); showroom.update(t, 0.5, { x: 28.2, z: 6 }, true); },
    reset: () => { for (let i = 0; i < 4; i++) showroom.update(0, 1, far, false); updaters.forEach((f) => f(0, 0)); },
    skip: [...npcs.map((n) => n.mesh), ...traffic.cars.map((c) => c.g), ...traffic2.cars.map((c) => c.g)],
    own: shopGroups,
  });
  // De winkels worden doorzichtig als je erachter rijdt (op de lange weg), zodat je jezelf blijft zien
  for (const g of shopGroups) {
    const mats = new Set();
    g.traverse((o) => { if (o.material && !o.material.transparent) { o.material.transparent = true; mats.add(o.material); } });
    fadeables.push({ x: g.position.x, z: FRONT - 2.5, r: 4.4, mats: [...mats], k: 1 });
  }

  // ---------- Zone ----------
  const zone = {
    id: 'stad', name: 'De Stad', group, colliders, boxes, fadeables, npcs, talkables: [...npcs],
    keepers, mayor,
    bounds: BIG_BOUNDS,
    merged,
    showroom,
    airBoxes: showroom.airBoxes, // dak en gevel van de Autowinkel (voor de vliegende auto)
    music: 'stad',
    env: { sky: [0x6ec3f4, 0xe3f4ff], fog: [0xe3f4ff, 45, 110], hemi: [0xf1f8ff, 0x9a8c74, 1.25], sun: [0xfff2d6, 2.2], cam: [0, 9, 11] },
    spawns: { fromDorp: { x: 0, z: 19.6, rot: Math.PI } },
    exit: { x: 0, z: 22.4 },
    mapItems: [
      { x: 0, z: -2.5, w: 46, d: 13, color: '#e8dcc4' }, { x: 0, z: 13, w: 7, d: 18, color: '#e8dcc4' },
      { x: 0, z: ROAD.minZ, w: 37.4, d: 3.4, color: '#6c727a' }, { x: 0, z: ROAD.maxZ, w: 37.4, d: 3.4, color: '#6c727a' },
      { x: ROAD.minX, z: 11.75, w: 3.4, d: 11.5, color: '#6c727a' }, { x: ROAD.maxX, z: 11.75, w: 3.4, d: 11.5, color: '#6c727a' },
      { x: 10, z: 11.8, w: 10, d: 7, color: '#74c69d' }, { x: 27.6, z: 15.65, w: 18.5, d: 7.3, color: '#8d939c' }, { x: fx, z: fz, r: 1.8, color: '#4fb3e8' },
      ...big.mapItems,
    ],
    labels: [
      { x: -13.2, z: -9.5, text: 'Speelgoed' }, { x: -4.4, z: -9.5, text: 'Snoep' },
      { x: 4.4, z: -9.5, text: 'Kleding' }, { x: 13.2, z: -9.5, text: 'Boeken' },
      { x: 0, z: 21, text: 'Naar het dorp' }, { x: 28.5, z: 5, text: 'Autowinkel' }, { x: fx, z: fz + 3, text: 'Fontein' },
      ...big.labels,
    ],
    cars: [...traffic.cars, ...traffic2.cars],
    getPeople: null, // main.js zet hier een functie in: waar staan de speler, de clones en de mensen?
    onHonk: null,
    update: (t, dt) => {
      updaters.forEach((f) => f(t, dt));
      const people = [...(zone.getPeople ? zone.getPeople() : []), ...npcs.map((n) => n.pos)];
      traffic.update(t, dt, people);
      traffic2.update(t, dt, people);
    },
  };
  return zone;
}

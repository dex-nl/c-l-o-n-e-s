// Het Slijmbos: een open plek in het bos met slijmpjes, paddenstoelen en vuurvliegjes.
// Achterin zit de grot van Koning Slijm. De deur gaat alleen open als er op alle 3 de knoppen iemand staat!
import * as THREE from 'three';
import { mat } from './characters.js';
import { mesh, makeSignpost, makeMushroom, makeFloaters, seeded } from './props.js';

const R = 24; // grootte van de open plek

export function createForest(group) {
  const rand = seeded(7);
  const colliders = [], updaters = [];
  // De rotswand achterin, met een gat voor de deur
  const boxes = [
    { x: -16.6, z: -26, hw: 15, hd: 5, h: 30 }, // (h: ook vliegend kom je er niet overheen)
    { x: 16.6, z: -26, hw: 15, hd: 5, h: 30 },
  ];
  const doorBox = { x: 0, z: -21.6, hw: 1.6, hd: 0.5 };
  boxes.push(doorBox);

  // ---------- Grond ----------
  const groundGeo = new THREE.PlaneGeometry(160, 160, 80, 80);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position, colors = [];
  const cMoss = new THREE.Color(0x6aa84f), cDark = new THREE.Color(0x2f6b3a);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), r = Math.hypot(x, z);
    let y = 0;
    if (r > R + 1 && z > -20) y = (r - R - 1) * 0.45 * (0.7 + 0.3 * Math.sin(x * 0.3) * Math.cos(z * 0.25)) + (rand() - 0.5) * 0.5;
    gp.setY(i, y);
    const c = cMoss.clone().lerp(cDark, Math.min(1, Math.max(0, (r - 14) / 20)) * 0.8 + rand() * 0.2);
    colors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0xffffff, { vertexColors: true }));
  ground.receiveShadow = true;
  group.add(ground);

  // Een recht pad van de ingang naar de grot (handig voor de knoppen!)
  const pathM = mat(0xb08d57, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const pathMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 44).rotateX(-Math.PI / 2), pathM);
  pathMesh.position.set(0, 0.02, 1.5);
  pathMesh.receiveShadow = true;
  group.add(pathMesh);

  // ---------- Rotswand met de grotdeur ----------
  const rockM = [mat(0x7d7068), mat(0x6b5f58), mat(0x8a7d73)];
  for (let x = -32; x <= 32; x += 3.6) {
    if (Math.abs(x) < 3) continue;
    const h = 6 + rand() * 4;
    const rock = mesh(new THREE.BoxGeometry(4.2, h, 6), rockM[Math.floor(rand() * 3)], x, h / 2 - 0.3, -25 - rand() * 1.5, group);
    rock.rotation.y = (rand() - 0.5) * 0.3;
    const top = mesh(new THREE.DodecahedronGeometry(2.4, 0), rockM[Math.floor(rand() * 3)], x + (rand() - 0.5), h - 0.2, -25.5, group);
    top.scale.y = 0.6;
    if (rand() < 0.6) mesh(new THREE.DodecahedronGeometry(0.8 + rand() * 0.7, 0), rockM[0], x + (rand() - 0.5) * 2, 0.4, -21.5 - rand(), group);
  }
  // deurpost en bovenstuk
  for (const sx of [-2.1, 2.1]) mesh(new THREE.BoxGeometry(1.1, 5.2, 1.4), rockM[2], sx, 2.6, -21.8, group);
  mesh(new THREE.BoxGeometry(5.4, 1.1, 1.5), rockM[2], 0, 5.4, -21.8, group);
  // donkere tunnel achter de deur
  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.8, 3), new THREE.MeshBasicMaterial({ color: 0x0b0710 }));
  tunnel.position.set(0, 2.4, -23.8);
  group.add(tunnel);
  // de deur zelf, met een slijmgezicht erop
  const door = new THREE.Group();
  door.add(mesh(new THREE.BoxGeometry(3.2, 4.6, 0.6), mat(0x8a817c), 0, 2.3, 0));
  const emblem = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 10), mat(0x7bd389, { emissive: 0x1d4d2a }), 0, 2.6, 0.32);
  emblem.rotation.x = Math.PI / 2;
  door.add(emblem);
  for (const ex of [-0.28, 0.28]) door.add(mesh(new THREE.BoxGeometry(0.2, 0.28, 0.06), mat(0x1d1d1d), ex, 2.7, 0.4));
  const crownBits = [-0.5, 0, 0.5].map((cx) => mesh(new THREE.ConeGeometry(0.16, 0.4, 4), mat(0xffc300, { emissive: 0x553300 }), cx, 3.6, 0.32));
  door.add(...crownBits);
  door.position.set(0, 0, -21.6);
  group.add(door);

  // ---------- De 3 drukknoppen voor de deur ----------
  const plates = [-18.6, -17.3, -16.0].map((z) => {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.14, 10), mat(0x9a8f88), 0, 0.07, 0, g);
    const rune = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a5a40 }));
    rune.position.y = 0.16;
    g.add(rune);
    g.position.set(0, 0, z);
    group.add(g);
    return { x: 0, z, g, rune, pressed: false };
  });

  // ---------- Bomen ----------
  const greens = [0x2d6a4f, 0x40916c, 0x1b4332, 0x52b788];
  const fadeables = []; // bomen die doorzichtig worden als ze voor de camera staan
  function tree(x, z, size, collide) {
    const g = new THREE.Group();
    const fade = z > -6;
    const trunk = mat(0x6b4226, { transparent: fade });
    mesh(new THREE.CylinderGeometry(0.2 * size, 0.32 * size, 1.6 * size, 5), trunk, 0, 0.8 * size, 0, g);
    const top = new THREE.Group();
    top.position.y = 1.4 * size;
    const green = mat(greens[Math.floor(rand() * 4)], { transparent: fade });
    if (fade) fadeables.push({ x, z, r: 1.4 * size, mats: [trunk, green], k: 1 });
    mesh(new THREE.ConeGeometry(1.4 * size, 1.9 * size, 6), green, 0, 0.9 * size, 0, top);
    mesh(new THREE.ConeGeometry(1.05 * size, 1.6 * size, 6), green, 0, 1.9 * size, 0, top);
    mesh(new THREE.ConeGeometry(0.7 * size, 1.2 * size, 6), green, 0, 2.7 * size, 0, top);
    g.add(top);
    g.position.set(x, 0, z);
    g.rotation.y = rand() * 6;
    group.add(g);
    const ph = rand() * 6;
    updaters.push((t) => { top.rotation.z = Math.sin(t * 1.1 + ph) * 0.04; });
    if (collide) colliders.push({ x, z, r: 0.6 * size, h: 3.3 * size }); // h: hoe hoog (voor de Wolkenflitser)
  }
  // dicht bos rondom
  for (let i = 0; i < 120; i++) {
    const a = rand() * Math.PI * 2, r = R + 1 + rand() * 22;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z < -20 || (z > 16 && Math.abs(x) < 7)) continue;
    tree(x, z, 1.1 + rand() * 0.9, false);
  }
  // bomen op de open plek (niet op het pad of bij de knoppen)
  const avoid = [{ x: 0, z: -17, r: 4 }];
  let placed = 0;
  while (placed < 26) {
    const a = rand() * Math.PI * 2, r = 6 + rand() * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 3.5 || z < -18 || avoid.some((p) => Math.hypot(p.x - x, p.z - z) < p.r)) continue;
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < 3)) continue;
    tree(x, z, 0.9 + rand() * 0.5, true);
    placed++;
  }

  // ---------- Paddenstoelen, stammen en stenen ----------
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2, r = 4 + rand() * 18;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 1.6 || z < -19 || colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.4)) continue;
    makeMushroom(group, x, z, 0.8 + rand() * 0.8, rand() < 0.25);
  }
  for (const [x, z] of [[-6, -18], [5.5, -19], [-14, 3], [15, -2]]) {
    makeMushroom(group, x, z, 2.6, true);
    colliders.push({ x, z, r: 0.5, h: 2.8 });
  }
  for (const [x, z, rot] of [[-9, 13, 0.4], [11, -11, 1.2], [-15, -9, -0.6]]) {
    const log = mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 7), mat(0x7f5539), x, 0.45, z, group);
    log.rotation.set(0, rot, Math.PI / 2);
    colliders.push({ x: x + Math.cos(rot) * 0.9, z: z - Math.sin(rot) * 0.9, r: 0.6 }, { x, z, r: 0.6 }, { x: x - Math.cos(rot) * 0.9, z: z + Math.sin(rot) * 0.9, r: 0.6 });
  }
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2, r = 7 + rand() * 15;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 2 || z < -19) continue;
    const s = mesh(new THREE.DodecahedronGeometry(0.3 + rand() * 0.4, 0), rockM[1], x, 0.2, z, group);
    s.rotation.set(rand() * 3, rand() * 3, 0);
  }

  // ---------- Vuurvliegjes ----------
  updaters.push(makeFloaters(group, { count: 50, color: 0xd9ff66, area: { x: 0, z: 0, w: 44, d: 40 }, height: [0.4, 3.5], size: 0.16 }));

  // ---------- Borden ----------
  const talkables = [
    makeSignpost(group, {
      id: 'bord-bos', x: 2.6, z: 18.8, rot: -0.3, title: 'SLIJMBOS', color: '#2d6a4f',
      lines: ['HET SLIJMBOS', 'Pas op voor slijmpjes! Ze zijn plakkerig... en een beetje gevaarlijk.', 'Versla ze met je zwaard. Ze laten kristallen vallen!'],
    }),
    makeSignpost(group, {
      id: 'bord-deur', x: 2.8, z: -15.2, rot: -0.4, title: 'LEES MIJ', color: '#7d7068',
      lines: [
        'DE GROT VAN KONING SLIJM',
        'Deze deur gaat alleen open als er op ALLE DRIE de knoppen iemand staat.',
        'Tip: loop over de knoppen in een rechte lijn naar de deur. Wie loopt er altijd achter je aan?',
      ],
    }),
  ];
  // Terug naar het dorp: een boog van takken
  for (const sx of [-1.8, 1.8]) mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 5), mat(0x6b4226), sx, 1.6, 23, group);
  mesh(new THREE.BoxGeometry(4, 0.3, 0.3), mat(0x6b4226), 0, 3.1, 23, group);

  // ---------- Zone ----------
  const zone = {
    id: 'bos', name: 'Het Slijmbos', group, colliders, boxes, talkables, fadeables,
    bounds: { x: 0, z: 0, r: R - 1 },
    music: 'bos',
    env: { sky: [0x5fa8a0, 0xd4ecd0], fog: [0xa8d5b5, 22, 62], hemi: [0xd8f3dc, 0x2d6a4f, 1.0], sun: [0xffe8b0, 1.9], cam: [0, 9, 11] },
    spawns: { fromDorp: { x: 0, z: 19.6, rot: Math.PI }, fromGrot: { x: 0, z: -14.6, rot: 0 } },
    slimeSpots: [
      { x: -8, z: 8 }, { x: 9, z: 6 }, { x: -10, z: -4 }, { x: 8.5, z: -6 },
      { x: -5, z: -11 }, { x: 6, z: 12 }, { x: -6, z: -15.5 }, { x: 6, z: -14 },
    ].map((p) => ({ ...p, kind: 'groen' })),
    plates, door: { x: 0, z: -21.6 },
    doorOpen: false,
    update: (t, dt) => updaters.forEach((f) => f(t, dt)),
  };

  let doorK = 0;
  zone.setDoorOpen = (yes, instant = false) => {
    zone.doorOpen = yes;
    doorBox.off = yes;
    if (instant) doorK = yes ? 1 : 0;
  };
  updaters.push((t, dt) => {
    doorK += ((zone.doorOpen ? 1 : 0) - doorK) * Math.min(1, dt * 1.2);
    door.position.y = -4.7 * doorK;
    door.position.x = zone.doorOpen && doorK < 0.97 ? Math.sin(t * 60) * 0.05 : 0; // trillen tijdens het zakken
    emblem.material.emissiveIntensity = 1 + Math.sin(t * 2) * 0.5;
    for (const p of plates) {
      p.rune.material.color.set(p.pressed ? 0x7dff9a : 0x3a5a40);
      p.g.position.y = p.pressed ? -0.06 : 0;
    }
  });
  return zone;
}

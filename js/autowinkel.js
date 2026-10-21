// De Autowinkel in De Stad: een echte showroom waar je naar binnen kunt lopen.
// Binnen: een glimmende vloer, auto's op draaischijven met prijsbordjes, een balie met Vera Vroem
// en een grote garagedeur waar je met je eigen auto naar buiten rijdt. (Idee van Dex!)
import * as THREE from 'three';
import { mat, box } from './characters.js';
import { mesh } from './props.js';
import { Npc } from './npc.js';
import { fmt } from './format.js';

// ---------- De auto's (prijzen in kristallen 💎) ----------
// Een rondje Slijmbos levert ongeveer 8-16 kristallen op, de Slijmgrot ongeveer 8 (+12 van Koning Slijm).
export const CARS = {
  mini: { icon: '🚗', name: 'Mini Muis', price: 12, speed: 7.5, info: 'Klein, rond en grappig. Piep piep!' },
  jeep: { icon: '🚙', name: 'Jungle Jeep', price: 25, speed: 9, info: 'Grote wielen voor elk avontuur.' },
  sport: { icon: '🏎️', name: 'Bliksem Sport', price: 40, speed: 10.5, info: 'Glimmend blauw met een spoiler!' },
  race: { icon: '🏁', name: 'Rode Raket', price: 60, speed: 12, info: 'De snelste auto van De Stad!' },
  // De Wolkenflitser: een vliegende elektrische auto (wens van Dex). Heel duur, maar hij kan VLIEGEN!
  wolk: { icon: '🛸', name: 'Wolkenflitser', price: 10000, speed: 12, fly: true, flySpeed: 14, info: 'Wit, stil en elektrisch. En... hij kan VLIEGEN!' },
};
export const CAR_ORDER = ['mini', 'jeep', 'sport', 'race', 'wolk'];
export const FLY_CEILING = 8; // hoger vlieg je niet: onder de hoge flats en de skyline blijven

// ---------- 3D-modellen ----------
// Alle auto's zijn open (cabrio), zodat je jezelf ziet zitten als je rijdt.
export function makeCarModel(id) {
  const g = new THREE.Group();
  const wheels = [];
  const wheel = (x, z, r = 0.32, w = 0.24) => {
    const wg = new THREE.Group();
    wg.position.set(x, r, z);
    wg.add(mesh(new THREE.CylinderGeometry(r, r, w, 10).rotateZ(Math.PI / 2), mat(0x2d2d2d)));
    wg.add(mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 6).rotateZ(Math.PI / 2), mat(0xdee2e6, { metalness: 0.6, roughness: 0.3 })));
    g.add(wg); wheels.push(wg);
  };
  const glass = mat(0xbfe9ff, { transparent: true, opacity: 0.6, emissive: 0x335566, emissiveIntensity: 0.4 });
  const lights = (z, y, sx, front) => {
    for (const s of [-sx, sx]) mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), front ? mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 0.7 }) : mat(0xff4d6d, { emissive: 0x880022 }), s, y, z, g);
  };
  if (id === 'mini') {
    // Een rond autootje met stippen, grote koplamp-oogjes en een vlaggetje
    const body = mat(0xffd23f);
    mesh(new THREE.BoxGeometry(1.2, 0.55, 1.7), body, 0, 0.55, 0, g);
    mesh(new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), body, 0, 0.8, 0.45, g).scale.set(0.95, 0.5, 0.6);
    for (const [x, y, z] of [[-0.61, 0.6, 0.3], [0.61, 0.6, -0.4], [-0.61, 0.5, -0.5], [0.61, 0.5, 0.45]]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 8).rotateZ(Math.PI / 2), mat(0xff5d8f), x, y, z, g);
    for (const s of [-0.3, 0.3]) {
      mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0xffffff, { emissive: 0x666655 }), s, 0.72, 0.86, g);
      mesh(new THREE.SphereGeometry(0.07, 6, 4), mat(0x1d1d1d), s, 0.74, 0.99, g);
    }
    mesh(new THREE.BoxGeometry(0.9, 0.3, 0.06), glass, 0, 1.0, 0.25, g);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), mat(0x555555), -0.45, 1.25, -0.7, g);
    mesh(new THREE.ConeGeometry(0.15, 0.35, 3), new THREE.MeshBasicMaterial({ color: 0xe63946 }), -0.35, 1.7, -0.7, g).rotation.z = -Math.PI / 2;
    lights(-0.86, 0.55, 0.38, false);
    for (const [x, z] of [[-0.6, 0.55], [0.6, 0.55], [-0.6, -0.55], [0.6, -0.55]]) wheel(x, z, 0.26, 0.2);
  } else if (id === 'jeep') {
    // Groen, hoog, grote wielen, rolbeugel en een reservewiel
    const body = mat(0x2a9d8f);
    mesh(new THREE.BoxGeometry(1.5, 0.6, 2.5), body, 0, 0.85, 0, g);
    mesh(new THREE.BoxGeometry(1.5, 0.3, 0.9), body, 0, 1.25, 0.75, g);
    mesh(new THREE.BoxGeometry(1.3, 0.45, 0.06), glass, 0, 1.6, 0.35, g);
    for (const s of [-0.68, 0.68]) mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), mat(0x2d2d2d), s, 1.5, -0.35, g);
    mesh(new THREE.BoxGeometry(1.44, 0.08, 0.08), mat(0x2d2d2d), 0, 1.85, -0.35, g);
    mesh(new THREE.BoxGeometry(1.6, 0.12, 0.2), mat(0x2d2d2d), 0, 0.6, 1.3, g); // bumper
    const spare = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 10).rotateX(Math.PI / 2), mat(0x2d2d2d), 0, 1.05, -1.38, g);
    spare.castShadow = true;
    for (const s of [-0.5, 0.5]) mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 0.7 }), s, 1.0, 1.27, g);
    lights(-1.26, 0.95, 0.55, false);
    for (const [x, z] of [[-0.78, 0.8], [0.78, 0.8], [-0.78, -0.8], [0.78, -0.8]]) wheel(x, z, 0.42, 0.3);
  } else if (id === 'sport') {
    // Laag, glimmend blauw met witte strepen en een spoiler
    const body = mat(0x1e6bff, { metalness: 0.55, roughness: 0.25 });
    mesh(new THREE.BoxGeometry(1.45, 0.42, 2.7), body, 0, 0.48, 0, g);
    const nose = mesh(new THREE.BoxGeometry(1.4, 0.2, 0.8), body, 0, 0.72, 0.85, g);
    nose.rotation.x = 0.18;
    for (const s of [-0.2, 0.2]) mesh(new THREE.BoxGeometry(0.14, 0.02, 2.72), mat(0xffffff), s, 0.7, 0, g);
    const ws = mesh(new THREE.BoxGeometry(1.2, 0.4, 0.06), glass, 0, 0.95, 0.25, g);
    ws.rotation.x = -0.5;
    for (const s of [-0.5, 0.5]) mesh(new THREE.BoxGeometry(0.08, 0.35, 0.12), mat(0x2d2d2d), s, 0.85, -1.2, g);
    mesh(new THREE.BoxGeometry(1.5, 0.08, 0.4), mat(0xffffff, { metalness: 0.4, roughness: 0.3 }), 0, 1.05, -1.2, g); // spoiler
    lights(1.36, 0.55, 0.5, true);
    lights(-1.36, 0.55, 0.5, false);
    for (const [x, z] of [[-0.72, 0.85], [0.72, 0.85], [-0.72, -0.85], [0.72, -0.85]]) wheel(x, z, 0.3, 0.26);
  } else if (id === 'wolk') {
    // De Wolkenflitser: strak, wit en glad, met een glazen koepel en blauw gloeiende straalmotoren eronder
    const white = mat(0xffffff, { metalness: 0.1, roughness: 0.3, emissive: 0x3a3f47, emissiveIntensity: 0.35 });
    const black = mat(0x1d1d1d, { metalness: 0.3, roughness: 0.3 });
    mesh(new THREE.BoxGeometry(1.6, 0.42, 3.1), white, 0, 0.5, 0, g);
    const nose = mesh(new THREE.BoxGeometry(1.56, 0.26, 0.9), white, 0, 0.6, 1.5, g); nose.rotation.x = 0.22;
    const tail = mesh(new THREE.BoxGeometry(1.58, 0.3, 0.7), white, 0, 0.72, -1.3, g); tail.rotation.x = -0.15;
    mesh(new THREE.BoxGeometry(1.62, 0.1, 3.12), black, 0, 0.28, 0, g); // zwarte onderkant
    // glazen koepel (doorzichtig, zodat je jezelf ziet zitten)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(0x1d3557, { transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.4, emissive: 0x16325c, emissiveIntensity: 0.5, depthWrite: false }));
    dome.scale.set(0.92, 0.95, 1.5); dome.position.set(0, 0.68, -0.1); g.add(dome);
    // dunne blauwe streep langs de zijkant
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.03, 0.06, 2.9), mat(0x7af7ff, { emissive: 0x1b8fd8, emissiveIntensity: 0.8 }), s * 0.81, 0.52, 0, g);
    // lichtbalk voor en achter
    mesh(new THREE.BoxGeometry(1.3, 0.06, 0.05), mat(0xffffff, { emissive: 0xbfe9ff, emissiveIntensity: 1 }), 0, 0.62, 1.93, g);
    mesh(new THREE.BoxGeometry(1.4, 0.07, 0.05), mat(0xff4d6d, { emissive: 0xaa0022, emissiveIntensity: 1 }), 0, 0.8, -1.66, g);
    // kleine vleugeltjes (klappen uit als je vliegt)
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * 0.8, 0.5, -0.4); g.add(w);
      mesh(new THREE.BoxGeometry(0.7, 0.05, 0.8), white, s * 0.35, 0, 0, w);
      mesh(new THREE.BoxGeometry(0.06, 0.06, 0.8), mat(0x7af7ff, { emissive: 0x1b8fd8, emissiveIntensity: 1 }), s * 0.7, 0, 0, w);
      w.rotation.z = s * 1.35; // ingeklapt
      wings.push(w);
    }
    // straalmotoren onder de auto: gloeiende blauwe rondjes
    const glowM = new THREE.MeshBasicMaterial({ color: 0x7af7ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const thrusters = [];
    for (const [x, z] of [[-0.55, 1.0], [0.55, 1.0], [-0.55, -1.0], [0.55, -1.0]]) {
      mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.1, 10), mat(0x495057, { metalness: 0.6 }), x, 0.22, z, g);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12).rotateX(Math.PI / 2), glowM);
      glow.position.set(x, 0.16, z); g.add(glow);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 10, 1, true).rotateX(Math.PI), glowM);
      cone.position.set(x, -0.15, z); g.add(cone);
      thrusters.push(cone);
    }
    for (const [x, z] of [[-0.86, 1.0], [0.86, 1.0], [-0.86, -1.0], [0.86, -1.0]]) wheel(x, z, 0.3, 0.2);
    return { g, wheels, wings, thrusters, glowM };
  } else {
    // De Rode Raket: een raceauto met een nummer, een grote spoiler en uitlaten
    const red = mat(0xe8101f, { metalness: 0.6, roughness: 0.2 });
    mesh(new THREE.BoxGeometry(1.0, 0.4, 3.0), red, 0, 0.45, 0, g);
    const nose = mesh(new THREE.ConeGeometry(0.5, 1.0, 4).rotateX(Math.PI / 2), red, 0, 0.42, 1.9, g);
    nose.rotation.z = Math.PI / 4; nose.scale.set(1, 0.6, 1);
    for (const s of [-0.75, 0.75]) mesh(new THREE.BoxGeometry(0.5, 0.3, 1.2), red, s, 0.4, -0.2, g); // zijbakken
    mesh(new THREE.BoxGeometry(1.9, 0.08, 0.35), mat(0x1d1d1d), 0, 0.2, 2.25, g); // voorvleugel
    for (const s of [-0.6, 0.6]) mesh(new THREE.BoxGeometry(0.08, 0.6, 0.3), mat(0x1d1d1d), s, 0.85, -1.35, g);
    mesh(new THREE.BoxGeometry(1.8, 0.1, 0.55), red, 0, 1.18, -1.35, g); // grote spoiler
    mesh(new THREE.BoxGeometry(1.82, 0.04, 0.12), mat(0xffd23f, { emissive: 0x664400 }), 0, 1.25, -1.15, g);
    for (const s of [-0.2, 0.2]) mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.4, 8).rotateX(Math.PI / 2), mat(0xadb5bd, { metalness: 0.8, roughness: 0.2 }), s, 0.5, -1.65, g);
    // nummer 1 op een wit rondje
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x2 = c.getContext('2d');
    x2.fillStyle = '#fff'; x2.beginPath(); x2.arc(32, 32, 30, 0, Math.PI * 2); x2.fill();
    x2.fillStyle = '#1d1d1d'; x2.font = 'bold 44px sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText('1', 32, 35);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    for (const s of [-1, 1]) {
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      num.position.set(s * 1.005, 0.42, -0.2); num.rotation.y = s * Math.PI / 2; g.add(num);
    }
    mesh(new THREE.BoxGeometry(0.7, 0.25, 0.06), glass, 0, 0.78, 0.45, g);
    for (const [x, z, r] of [[-0.62, 1.1, 0.3], [0.62, 1.1, 0.3], [-0.68, -0.95, 0.38], [0.68, -0.95, 0.38]]) wheel(x, z, r, 0.32);
  }
  return { g, wheels };
}

// Een bordje (canvas) met tekst op twee regels
function priceTexture(title, sub, bg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#2d3142'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 118);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 34; g.font = `bold ${size}px sans-serif`;
  while (g.measureText(title).width > 226 && size > 16) { size -= 2; g.font = `bold ${size}px sans-serif`; }
  g.fillText(title, 128, 42);
  g.font = 'bold 40px sans-serif';
  g.fillStyle = '#ffd23f';
  g.fillText(sub, 128, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- De showroom ----------
// Het gebouw staat aan de oostkant van De Stad. x: 20.5..36.5, z: -1.5..12. De voorkant (glas) is aan de zuidkant.
export const SHOWROOM = { minX: 20.5, maxX: 36.5, minZ: -1.5, maxZ: 12, h: 5 };

export function createShowroom(group, { colliders, boxes, updaters, wideSign }) {
  const S = SHOWROOM, cx = (S.minX + S.maxX) / 2, W = S.maxX - S.minX, D = S.maxZ - S.minZ;
  const T = 0.3; // dikte van de muren
  const hideInside = []; // dingen die we verstoppen als je binnen bent (dak, bovenkant van de voorgevel)
  const fadeInside = []; // materialen die doorzichtig worden als je binnen bent
  const airBoxes = [];   // dingen die in de lucht hangen (dak, bovenkant gevel): alleen voor de vliegende auto

  // vloer met glimmende tegels
  const tiles = new THREE.Group();
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 7; z++) {
      const m = mesh(new THREE.PlaneGeometry(W / 8, D / 7).rotateX(-Math.PI / 2), mat((x + z) % 2 ? 0xf8f9fa : 0xdde3ea, { roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
        S.minX + (x + 0.5) * (W / 8), 0.05, S.minZ + (z + 0.5) * (D / 7), tiles);
      m.castShadow = false;
    }
  }
  group.add(tiles);

  const wallM = mat(0xf1f3f5), trimM = mat(0xe63946);
  const wall = (x1, z1, x2, z2, h = S.h, material = wallM) => {
    const w = Math.abs(x2 - x1) || T, d = Math.abs(z2 - z1) || T;
    const m = mesh(new THREE.BoxGeometry(w, h, d), material, (x1 + x2) / 2, h / 2, (z1 + z2) / 2, group);
    boxes.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, hw: w / 2, hd: d / 2, h: h + 0.4 }); // h: zo hoog (voor de vliegende auto)
    return m;
  };
  // achtermuur, zijmuren
  wall(S.minX, S.minZ, S.maxX, S.minZ);
  wall(S.minX, S.minZ, S.minX, S.maxZ);
  wall(S.maxX, S.minZ, S.maxX, S.maxZ);
  // rode streep binnen op de achtermuur
  mesh(new THREE.BoxGeometry(W - 0.6, 0.4, 0.05), trimM, cx, 3.2, S.minZ + 0.18, group);
  // poster op de achtermuur
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.1), new THREE.MeshBasicMaterial({ map: wideSign('VROEM VROEM!', '#e63946') }));
  poster.position.set(30, 4.1, S.minZ + 0.2);
  group.add(poster);

  // ---------- De voorgevel (zuidkant): deur, ramen en de garagedeur ----------
  const Z = S.maxZ;
  const glassM = mat(0xbfe9ff, { transparent: true, opacity: 0.25, roughness: 0.1, emissive: 0x335566, emissiveIntensity: 0.3, depthWrite: false });
  const frameM = mat(0x2d3142, { transparent: true });
  fadeInside.push(frameM);
  const post = (x) => { const m = mesh(new THREE.BoxGeometry(0.25, 3.2, 0.3), frameM, x, 1.6, Z, group); boxes.push({ x, z: Z, hw: 0.13, hd: 0.15, h: 3.3 }); };
  const pane = (x1, x2) => {
    const m = mesh(new THREE.BoxGeometry(x2 - x1, 3.2, 0.08), glassM, (x1 + x2) / 2, 1.6, Z, group);
    m.castShadow = false;
    boxes.push({ x: (x1 + x2) / 2, z: Z, hw: (x2 - x1) / 2, hd: 0.15, h: 3.3 });
  };
  // deuropening: x 21.6 .. 24.2 (open, geen deur: zo loop je zo naar binnen)
  post(S.minX + 0.6); pane(S.minX + 0.15, S.minX + 0.6);
  post(24.2); pane(24.2, 27); post(27);
  // garagedeur: x 27 .. 32.4
  post(32.4); pane(32.4, S.maxX - 0.15);
  // bovenkant van de gevel (boven de deuren) + het grote bord
  const header = mesh(new THREE.BoxGeometry(W, S.h - 3.2, T), wallM, cx, 3.2 + (S.h - 3.2) / 2, Z, group);
  hideInside.push(header);
  // de bovenkant van de gevel hangt in de lucht: alleen de vliegende auto kan ertegen botsen
  airBoxes.push({ x: cx, z: Z, hw: W / 2, hd: 0.15, low: 3.2, h: S.h + 0.4 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshBasicMaterial({ map: wideSign('AUTOWINKEL', '#e63946') }));
  sign.position.set(cx, 4.1, Z + 0.17);
  group.add(sign);
  hideInside.push(sign);
  // rode luifel boven de deur
  const awning = mesh(new THREE.BoxGeometry(3.2, 0.12, 1.2), trimM, 22.9, 3.3, Z + 0.6, group);
  hideInside.push(awning);

  // de garagedeur: rolt omhoog als je in de buurt komt
  const garageBox = { x: 29.7, z: Z, hw: 2.7, hd: 0.2, h: 3.3 };
  boxes.push(garageBox);
  const door = new THREE.Group();
  for (let i = 0; i < 6; i++) door.add(mesh(new THREE.BoxGeometry(5.3, 0.5, 0.1), mat(i % 2 ? 0xadb5bd : 0xced4da, { metalness: 0.3 }), 0, 0.27 + i * 0.53, 0));
  door.position.set(29.7, 0, Z);
  group.add(door);
  const garageSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: wideSign('UITRIT', '#2d6a4f', 256, 64) }));
  garageSign.position.set(29.7, 3.45, Z - 0.17);
  garageSign.rotation.y = Math.PI;
  group.add(garageSign);

  // het dak (zie je niet als je binnen bent)
  const roof = mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), mat(0x495057), cx, S.h + 0.15, (S.minZ + S.maxZ) / 2, group);
  roof.castShadow = false; // anders wordt het binnen te donker
  hideInside.push(roof);
  airBoxes.push({ x: cx, z: (S.minZ + S.maxZ) / 2, hw: W / 2 + 0.2, hd: D / 2 + 0.2, low: S.h, h: S.h + 0.4 });
  // lampen aan het plafond (alleen zichtbaar als het dak weg is: lampjes zweven dan gezellig)
  for (const lx of [24, 28.5, 33]) {
    const lamp = mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.2, 10), mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 0.8 }), lx, S.h - 0.2, 5, group);
    lamp.castShadow = false;
    hideInside.push(lamp);
  }

  // ---------- De balie met Vera Vroem ----------
  mesh(new THREE.BoxGeometry(3.8, 1.1, 0.9), mat(0xe63946), 23.2, 0.55, 1.1, group);
  mesh(new THREE.BoxGeometry(4.0, 0.1, 1.1), mat(0xffffff), 23.2, 1.15, 1.1, group);
  mesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), mat(0x2d3142), 22.3, 1.4, 1.0, group); // kassa
  mesh(new THREE.BoxGeometry(0.4, 0.06, 0.25), mat(0xffd23f, { emissive: 0x664400 }), 24.1, 1.24, 1.1, group); // sleutels
  boxes.push({ x: 23.2, z: 1.1, hw: 1.9, hd: 0.45, h: 1.3 });
  const dealer = new Npc(group, {
    id: 'dealer', name: 'Vera Vroem', x: 23.2, z: 0.05, rot: 0, voice: 1.2,
    look: { shirt: 0xffffff, pants: 0x2d3142, skin: 0xe0ac69, hair: 0xd62828, coat: 0xe63946 },
    decorate(ch) {
      ch.head.add(box(0.7, 0.12, 0.7, mat(0xe63946), 0, 0.38, 0), box(0.5, 0.05, 0.3, mat(0xe63946), 0, 0.33, 0.42)); // petje
      ch.head.add(box(0.18, 0.1, 0.03, mat(0x1d1d1d), -0.14, 0.03, 0.31), box(0.18, 0.1, 0.03, mat(0x1d1d1d), 0.14, 0.03, 0.31)); // zonnebril
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.14), ch.hairM); tail.position.set(0, 0.0, -0.36); ch.head.add(tail);
    },
  });
  colliders.push({ x: dealer.pos.x, z: dealer.pos.z, r: 0.45 });

  // ---------- Draaischijven met auto's en prijsbordjes ----------
  const spots = { mini: [26.6, 3.4], jeep: [30.4, 3.4], sport: [34.0, 3.4], race: [34.0, 7.8], wolk: [30.4, 7.8] }; // de Wolkenflitser staat op de plek waar eerst BINNENKORT stond
  const displays = {};
  const signs = [];
  for (const id of CAR_ORDER) {
    const [x, z] = spots[id];
    const gold = id === 'race';
    const fly = id === 'wolk';
    const disc = mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.2, 18), mat(fly ? 0x9b5de5 : gold ? 0xffd23f : 0xadb5bd, { metalness: 0.5, roughness: 0.3, emissive: fly ? 0x2a0d4f : gold ? 0x553300 : 0x000000 }), x, 0.1, z, group);
    disc.castShadow = false;
    const spin = new THREE.Group();
    spin.position.set(x, 0.2, z);
    group.add(spin);
    const model = makeCarModel(id);
    model.g.scale.setScalar(id === 'mini' ? 1.1 : 1);
    spin.add(model.g);
    colliders.push({ x, z, r: 1.85 });
    // prijsbordje
    const tex = priceTexture(CARS[id].name.toUpperCase(), `💎 ${fmt(CARS[id].price)}`, id === 'wolk' ? '#9b5de5' : gold ? '#e63946' : '#3a86ff');
    const st = new THREE.Group();
    st.add(mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), mat(0x2d3142), 0, 0.45, 0));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.y = 1.15; st.add(face);
    const sold = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: wideSign('VAN JOU!', '#52b788', 256, 64) }));
    sold.position.set(0, 1.62, 0.01); sold.visible = false; st.add(sold);
    st.position.set(x - 1.3, 0, z + 1.9);
    st.rotation.y = 0.15;
    group.add(st);
    displays[id] = { spin, sold, x, z };
    signs.push({ id, x: st.position.x, z: st.position.z });
  }
  // de Wolkenflitser zweeft een beetje boven zijn draaischijf
  const wolkSpin = displays.wolk.spin;
  const wolkModel = wolkSpin.children[0];

  // ---------- Het parkeerterrein voor de deur (de "lot") ----------
  const lot = mesh(new THREE.PlaneGeometry(18.5, 7.3).rotateX(-Math.PI / 2), mat(0x8d939c, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 27.6, 0.03, 15.65, group);
  lot.castShadow = false;
  for (const lx of [21, 33.5, 35.5]) mesh(new THREE.PlaneGeometry(0.12, 3).rotateX(-Math.PI / 2), mat(0xffffff, { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }), lx, 0.04, 17.4, group).castShadow = false;
  // heggen achter en voor, zodat je niet achter de showroom kunt verdwalen
  const hedgeM = mat(0x40916c);
  const hedge = (x, z, w, d, h = 1.2) => { mesh(new THREE.BoxGeometry(w, h, d), hedgeM, x, h / 2, z, group); boxes.push({ x, z, hw: w / 2, hd: d / 2, h: h + 0.1 }); };
  hedge(28.5, -4.5, 16.2, 5.6);
  hedge(28.2, 21.2, 16.6, 1.6, 0.6);
  for (let fx = 21; fx < 36; fx += 1.5) mesh(new THREE.OctahedronGeometry(0.16, 0), mat([0xff6b6b, 0xffd23f, 0xffffff, 0xc77dff][Math.round(fx * 2) % 4]), fx, 0.72, 21.2, group);

  // ---------- Waar komt jouw auto te staan? ----------
  const pickup = { x: 28.2, z: 10.2, rot: 0 }; // vlak voor de garagedeur, met de neus naar buiten

  let doorK = 0;
  const showroom = {
    dealer, displays, pickup, signs, garageBox, airBoxes,
    inside: false,
    isInside: (p) => p.x > S.minX && p.x < S.maxX && p.z > S.minZ && p.z < S.maxZ,
    setOwned(cars) { for (const id of CAR_ORDER) displays[id].sold.visible = cars.includes(id); },
    // elke frame: deur open/dicht, dak weg als je binnen bent
    update(t, dt, playerPos, driving) {
      const near = Math.hypot(playerPos.x - 29.7, playerPos.z - Z) < (driving ? 9 : 6);
      doorK += ((near ? 1 : 0) - doorK) * Math.min(1, dt * 3);
      door.position.y = doorK * 3.0;
      door.scale.y = 1 - doorK * 0.85;
      garageBox.off = doorK > 0.6;
      const inside = showroom.isInside(playerPos);
      if (inside !== showroom.inside) {
        showroom.inside = inside;
        hideInside.forEach((m) => { m.visible = !inside; });
      }
      for (const m of fadeInside) m.opacity += ((inside ? 0.3 : 1) - m.opacity) * Math.min(1, dt * 6);
      for (const id of CAR_ORDER) displays[id].spin.rotation.y = t * 0.4 + CAR_ORDER.indexOf(id);
      wolkModel.position.y = 0.35 + Math.sin(t * 2) * 0.12;
    },
  };
  return showroom;
}

// ---------- Het winkelpaneel van de Autowinkel ----------
export function buildCarShop(body, state, { onBuy, onPick, onTooPoor }) {
  const top = document.createElement('p');
  top.className = 'panel-note';
  top.innerHTML = `Je hebt <b>💎 ${fmt(state.crystals)}</b> kristallen. Koop een auto en rij hem door de garagedeur naar buiten!`;
  body.appendChild(top);
  const grid = document.createElement('div');
  grid.className = 'cards cars'; // 5 auto's naast elkaar (past ook op de iPhone)
  for (const id of CAR_ORDER) {
    const c = CARS[id];
    const owned = state.cars.includes(id);
    const card = document.createElement('div');
    card.className = 'card';
    card.classList.toggle('on', state.car === id);
    card.innerHTML = `<div class="card-icon">${c.icon}</div><div class="card-name">${c.name}</div><div class="card-info">${c.info}</div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'buy';
    const poor = !owned && state.crystals < c.price;
    if (poor) btn.classList.add('poor');
    if (owned) {
      btn.textContent = state.car === id ? '✓ Klaar om te rijden' : 'Kies deze auto';
      btn.disabled = state.car === id;
    } else btn.textContent = `💎 ${fmt(c.price)}  Koop`;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      if (owned) onPick(id);
      else if (poor) onTooPoor(id);
      else onBuy(id);
    });
    card.appendChild(btn);
    grid.appendChild(card);
  }
  body.appendChild(grid);
}

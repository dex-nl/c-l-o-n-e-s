// Hoekige poppetjes (low-poly), gebruikt voor de speler, de clones en de dorpelingen.
// Ook: het zwaard en de hoedjes.
import * as THREE from 'three';

export const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra });

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function makeCharacter({ shirt = 0x3a86ff, pants = 0x2d3142, skin = 0xffcc99, hair = 0x6b3e26, coat = null } = {}) {
  const group = new THREE.Group();
  const skinM = mat(skin), shirtM = mat(shirt), pantsM = mat(pants), hairM = mat(hair), eyeM = mat(0x222222);

  // Benen (met draaipunt bij de heup)
  const legs = [-0.17, 0.17].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.62, 0);
    pivot.add(box(0.26, 0.62, 0.3, pantsM, 0, -0.31, 0));
    pivot.add(box(0.28, 0.14, 0.38, mat(0x4a3428), 0, -0.6, 0.04));
    group.add(pivot);
    return pivot;
  });

  const body = box(0.7, 0.7, 0.45, shirtM, 0, 0.98, 0);
  group.add(body);
  if (coat) group.add(box(0.76, 0.8, 0.5, mat(coat), 0, 0.93, -0.01));

  // Armen (arms[0] is de rechterarm: daar zit het zwaard)
  const arms = [-0.46, 0.46].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.28, 0);
    pivot.add(box(0.2, 0.6, 0.24, coat ? mat(coat) : shirtM, 0, -0.28, 0));
    pivot.add(box(0.18, 0.16, 0.2, skinM, 0, -0.64, 0));
    group.add(pivot);
    return pivot;
  });

  // Hoofd
  const head = new THREE.Group();
  head.position.y = 1.62;
  head.add(box(0.62, 0.58, 0.58, skinM));
  head.add(box(0.66, 0.2, 0.62, hairM, 0, 0.3, -0.02));
  head.add(box(0.66, 0.4, 0.14, hairM, 0, 0.12, -0.27));
  head.add(box(0.09, 0.12, 0.04, eyeM, -0.14, 0.02, 0.3));
  head.add(box(0.09, 0.12, 0.04, eyeM, 0.14, 0.02, 0.3));
  head.add(box(0.16, 0.05, 0.04, mat(0xd96c6c), 0, -0.14, 0.3));
  group.add(head);

  return { group, legs, arms, body, head, hairM, sword: null, hat: null, cap: [] };
}

// De held (de speler), met een rood petje. Clones zien er precies zo uit.
export function makeHero() {
  const ch = makeCharacter({ shirt: 0x3a86ff, pants: 0x2d3142, hair: 0x6b3e26 });
  const capM = mat(0xe63946);
  ch.cap = [box(0.7, 0.16, 0.66, capM, 0, 0.38, 0), box(0.6, 0.06, 0.3, capM, 0, 0.32, 0.42)]; // petje + klep
  ch.head.add(...ch.cap);
  return ch;
}

// Laat het poppetje lopen (fase loopt op met de afstand).
export function animateWalk(ch, phase, amount) {
  const s = Math.sin(phase) * 0.7 * amount;
  ch.legs[0].rotation.x = s;
  ch.legs[1].rotation.x = -s;
  ch.arms[0].rotation.x = -s * 0.8;
  ch.arms[1].rotation.x = s * 0.8;
  ch.body.position.y = 0.98 + Math.abs(Math.cos(phase)) * 0.06 * amount;
}

// ---------- Zwaard ----------
// level 1 = gewoon zwaard, level 2 = gouden superzwaard
export function makeSword(level = 1) {
  const g = new THREE.Group();
  const gold = level > 1;
  const bladeM = mat(gold ? 0xffd23f : 0xe3eaf2, { metalness: 0.6, roughness: 0.3, emissive: gold ? 0x664400 : 0x222831 });
  g.add(part(new THREE.BoxGeometry(0.1, 0.05, gold ? 1.05 : 0.85), bladeM, 0, 0, gold ? 0.68 : 0.6));
  g.add(part(new THREE.ConeGeometry(0.07, 0.18, 4).rotateX(Math.PI / 2), bladeM, 0, 0, gold ? 1.28 : 1.1));
  g.add(part(new THREE.BoxGeometry(0.4, 0.08, 0.08), mat(gold ? 0xe63946 : 0x8b5a2b), 0, 0, 0.14));
  g.add(part(new THREE.BoxGeometry(0.07, 0.07, 0.24), mat(0x5c3a21), 0, 0, 0));
  return g;
}

export function giveSword(ch, level) {
  if (ch.sword) ch.arms[0].remove(ch.sword);
  ch.sword = null;
  if (!level) return;
  ch.sword = makeSword(level);
  ch.sword.position.set(0, -0.66, 0.06);
  ch.arms[0].add(ch.sword);
}

// Zwaai met het zwaard: k loopt van 0 tot 1 (ophalen, hakken, terug)
const lerp = (a, b, k) => a + (b - a) * k;
export function animateSwing(ch, k) {
  let a;
  if (k < 0.25) a = lerp(0, -2.8, k / 0.25);
  else if (k < 0.55) a = lerp(-2.8, -0.15, (k - 0.25) / 0.3);
  else a = lerp(-0.15, 0, (k - 0.55) / 0.45);
  ch.arms[0].rotation.x = a;
}

// ---------- Hoedjes ----------
export const HAT_NAMES = {
  feest: 'Feestmuts', piraat: 'Piratenhoed', cowboy: 'Cowboyhoed', tovenaar: 'Tovenaarshoed', kroon: 'Kroon',
};

export function makeHat(id) {
  const g = new THREE.Group();
  if (id === 'feest') {
    g.add(part(new THREE.ConeGeometry(0.3, 0.7, 8), mat(0xff5d8f), 0, 0.72, 0));
    g.add(part(new THREE.CylinderGeometry(0.2, 0.25, 0.08, 8), mat(0xffd23f), 0, 0.55, 0));
    g.add(part(new THREE.IcosahedronGeometry(0.11, 0), mat(0xffd23f), 0, 1.1, 0));
  } else if (id === 'piraat') {
    g.add(part(new THREE.BoxGeometry(1.0, 0.1, 0.55), mat(0x1d1d1d), 0, 0.45, 0));
    g.add(part(new THREE.BoxGeometry(0.66, 0.34, 0.5), mat(0x1d1d1d), 0, 0.64, 0));
    g.add(part(new THREE.BoxGeometry(0.16, 0.16, 0.04), mat(0xffffff), 0, 0.64, 0.27));
  } else if (id === 'cowboy') {
    g.add(part(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 10), mat(0x9c6644), 0, 0.44, 0));
    g.add(part(new THREE.CylinderGeometry(0.3, 0.34, 0.36, 8), mat(0x9c6644), 0, 0.64, 0));
    g.add(part(new THREE.CylinderGeometry(0.345, 0.345, 0.08, 8), mat(0x3d2817), 0, 0.5, 0));
  } else if (id === 'tovenaar') {
    g.add(part(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 10), mat(0x3a0ca3), 0, 0.43, 0));
    const cone = part(new THREE.ConeGeometry(0.36, 1.0, 8), mat(0x4361ee), 0, 0.92, -0.04);
    cone.rotation.x = -0.15; g.add(cone);
    g.add(part(new THREE.OctahedronGeometry(0.1, 0), mat(0xffd23f, { emissive: 0x665500 }), 0.2, 0.8, 0.22));
  } else if (id === 'kroon') {
    const gold = mat(0xffc300, { metalness: 0.6, roughness: 0.3, emissive: 0x553300 });
    g.add(part(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 8, 1, true), gold, 0, 0.5, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(part(new THREE.ConeGeometry(0.08, 0.2, 4), gold, Math.sin(a) * 0.32, 0.68, Math.cos(a) * 0.32));
    }
    g.add(part(new THREE.OctahedronGeometry(0.07, 0), mat(0xe63946, { emissive: 0x440000 }), 0, 0.5, 0.37));
  }
  return g;
}

// Ruim een stuk 3D op (vormen en kleuren), zodat het geheugen niet volloopt
export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

// Een ander shirt aan (de armen hebben hetzelfde shirt-materiaal als het lijf)
export function setShirt(ch, color) {
  ch.body.material.color.set(color);
}

export function setHat(ch, id) {
  if (ch.hat) { ch.head.remove(ch.hat); disposeTree(ch.hat); }
  ch.hat = null;
  ch.cap.forEach((m) => { m.visible = !id; });
  if (id) { ch.hat = makeHat(id); ch.head.add(ch.hat); }
}

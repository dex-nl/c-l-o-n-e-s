// Sneller tekenen (belangrijk voor de iPhone!):
// - mergeStatic: alles wat stilstaat plakken we samen tot een paar grote vormen.
//   Eén vorm per soort materiaal, de kleur zit in de hoekpunten (vertex colors).
// - mergeGroup: één huis of flat wordt één vorm, zodat hij in z'n geheel doorzichtig kan worden.
// - instanced: heel veel dezelfde dingen (bomen, lantaarns, streepjes) in één keer tekenen.
import * as THREE from 'three';

const tmpColor = new THREE.Color();

// Maakt van een (deel van een) vorm losse driehoeken met een kleur per hoekpunt
function bake(geo, matrix, color) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  const own = g.attributes.color ? g.attributes.color.array.slice() : null; // al gekleurd (een samengeplakte vorm)
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.applyMatrix4(matrix);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = color.r * (own ? own[i * 3] : 1); col[i * 3 + 1] = color.g * (own ? own[i * 3 + 1] : 1); col[i * 3 + 2] = color.b * (own ? own[i * 3 + 2] : 1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function concat(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

const keyOf = (m, cast) => [m.emissive.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.flatShading, m.polygonOffset ? `${m.polygonOffsetFactor}/${m.polygonOffsetUnits}` : '', m.side, cast].join('|');

function snapshot(root) {
  const snap = new Map();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o.material;
    snap.set(o, o.matrixWorld.elements.join(',') + (o.visible ? 'v' : 'h') +
      (m && !Array.isArray(m) ? `${m.color?.getHex()}/${m.emissive?.getHex()}/${m.emissiveIntensity}/${m.opacity}` : ''));
  });
  return snap;
}

// probe(t): laat alles een beetje bewegen, zodat we zien wat NIET stilstaat.
// skip: groepen die we nooit samenplakken (mensen, auto's).
export function mergeStatic(root, { probe, reset, skip = [], own = [] }) {
  const before = snapshot(root);
  for (const t of [0.37, 1.91, 3.3, 5.7]) probe(t);
  const after = snapshot(root);
  reset?.();
  root.updateMatrixWorld(true);
  const moving = new Set();
  for (const [o, s] of before) if (after.get(o) !== s) moving.add(o);
  const skipSet = new Set(skip);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  // 'own': groepen die hun eigen samengeplakte vormen houden (die kunnen dan doorzichtig worden)
  const ownSet = new Set(own), perOwn = new Map(own.map((g) => [g, new Map()]));
  const visit = (o, blocked, target) => {
    if (ownSet.has(o)) target = o;
    blocked = blocked || moving.has(o) || skipSet.has(o) || (o !== root && !o.visible) || o.userData.keep;
    if (o.isMesh && !o.isInstancedMesh && !blocked) {
      const m = o.material;
      if (m && m.isMeshStandardMaterial && !m.transparent && !m.map && o.geometry.attributes.position) {
        const key = keyOf(m, o.castShadow);
        const B = target === root ? buckets : perOwn.get(target);
        if (!B.has(key)) B.set(key, { mat: m, cast: o.castShadow, geos: [] });
        const tInv = target === root ? inv : new THREE.Matrix4().copy(target.matrixWorld).invert();
        const mtx = new THREE.Matrix4().multiplyMatrices(tInv, o.matrixWorld);
        B.get(key).geos.push(bake(o.geometry, mtx, tmpColor.copy(m.color)));
        victims.push(o);
      }
    }
    for (const c of [...o.children]) visit(c, blocked, target);
  };
  visit(root, false, root);
  let made = build(root, buckets, victims);
  for (const [g, B] of perOwn) made += build(g, B, []);
  return { removed: victims.length, made };
}

function build(root, buckets, victims) {
  for (const o of victims) { o.parent.remove(o); o.geometry.dispose(); }
  let made = 0;
  for (const { mat, cast, geos } of buckets.values()) {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: mat.flatShading, roughness: mat.roughness, metalness: mat.metalness,
      emissive: mat.emissive, emissiveIntensity: mat.emissiveIntensity, side: mat.side,
      polygonOffset: mat.polygonOffset, polygonOffsetFactor: mat.polygonOffsetFactor, polygonOffsetUnits: mat.polygonOffsetUnits,
    });
    const merged = new THREE.Mesh(concat(geos), material);
    merged.castShadow = cast; merged.receiveShadow = true;
    merged.userData.merged = true;
    root.add(merged);
    made++;
  }
  return made;
}

// Alle vormen in een groep (bijvoorbeeld een hoofd, een arm of een auto) samenplakken per soort materiaal.
// De groep zelf mag daarna nog steeds bewegen.
export function mergeLocal(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return;
    const m = o.material;
    if (!m || !m.isMeshStandardMaterial || m.transparent || m.map || m.vertexColors) return;
    const key = keyOf(m, o.castShadow);
    if (!buckets.has(key)) buckets.set(key, { mat: m, cast: o.castShadow, geos: [] });
    buckets.get(key).geos.push(bake(o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), tmpColor.copy(m.color)));
    victims.push(o);
  });
  if (victims.length < 2) return 0;
  return build(root, buckets, victims);
}

// Eén groep (een huis, een flat) wordt één vorm met één materiaal. Handig om hem doorzichtig te maken.
export function mergeGroup(g, { transparent = false } = {}) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const geos = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    geos.push(bake(o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), tmpColor.copy(o.material.color)));
  });
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, transparent });
  const m = new THREE.Mesh(concat(geos), material);
  m.castShadow = true; m.receiveShadow = true;
  for (const c of [...g.children]) { g.remove(c); c.traverse((o) => o.geometry?.dispose()); }
  g.add(m);
  return material;
}

// Heel veel dezelfde vorm: list = [{ x, y, z, ry, s, sy, color }]
export function instanced(parent, geo, material, list, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, 0); q.setFromEuler(e);
    p.set(it.x, it.y || 0, it.z);
    s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);
    if (it.color !== undefined) im.setColorAt(i, tmpColor.set(it.color));
  });
  im.count = list.length;
  im.castShadow = cast; im.receiveShadow = receive;
  im.computeBoundingSphere();
  parent.add(im);
  return im;
}

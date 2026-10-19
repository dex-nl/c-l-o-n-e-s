// Kleine dingen die in elke zone kunnen staan: wegwijzers, rotsen, paddenstoelen, vuurvliegjes.
import * as THREE from 'three';
import { mat } from './characters.js';
import { signTexture } from './world.js';

export function mesh(geo, material, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// Een bord dat je kunt lezen (met de Praat-knop). Geeft een "pratend ding" terug.
export function makeSignpost(group, { id, x, z, rot = 0, title, color = '#8b5a2b', lines }) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.15, 1.6, 0.15), mat(0x8b5a2b), 0, 0.8, 0, g);
  mesh(new THREE.BoxGeometry(1.7, 0.75, 0.1), mat(0xc68b59), 0, 1.5, 0, g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.6), new THREE.MeshBasicMaterial({ map: signTexture(title, color) }));
  face.position.set(0, 1.5, 0.06);
  g.add(face);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  group.add(g);
  return {
    id, name: 'Bord', voice: 1.1, mesh: g, pos: g.position, lines, sign: true,
    showMarker() {}, update() {},
    distanceTo(p) { return Math.hypot(p.x - x, p.z - z); },
  };
}

export function makeMushroom(group, x, z, size = 1, glow = false) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.1 * size, 0.14 * size, 0.4 * size, 6), mat(0xf1e9d2), 0, 0.2 * size, 0, g);
  const capM = glow ? mat(0x4cc9f0, { emissive: 0x1b6ca8, emissiveIntensity: 0.9 }) : mat(0xe63946);
  mesh(new THREE.SphereGeometry(0.32 * size, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.38 * size, 0, g);
  if (!glow) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      const dot = mesh(new THREE.BoxGeometry(0.08 * size, 0.04 * size, 0.08 * size), mat(0xffffff), Math.cos(a) * 0.18 * size, 0.6 * size, Math.sin(a) * 0.18 * size, g);
      dot.castShadow = false;
    }
  }
  g.position.set(x, 0, z);
  group.add(g);
  return g;
}

// Zwevende lichtjes (vuurvliegjes in het bos, stofjes in de grot)
export function makeFloaters(group, { count, color, area, height = [0.5, 3], size = 0.12 }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), base = [];
  for (let i = 0; i < count; i++) {
    const p = { x: area.x + (Math.random() - 0.5) * area.w, y: height[0] + Math.random() * (height[1] - height[0]), z: area.z + (Math.random() - 0.5) * area.d, ph: Math.random() * 6 };
    base.push(p);
    pos.set([p.x, p.y, p.z], i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(pts);
  return (t) => {
    base.forEach((p, i) => {
      pos[i * 3] = p.x + Math.sin(t * 0.5 + p.ph) * 0.8;
      pos[i * 3 + 1] = p.y + Math.sin(t * 0.9 + p.ph * 2) * 0.3;
      pos[i * 3 + 2] = p.z + Math.cos(t * 0.4 + p.ph) * 0.8;
    });
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
  };
}

// Vaste "willekeurige" getallen, zodat een zone er altijd hetzelfde uitziet
export function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

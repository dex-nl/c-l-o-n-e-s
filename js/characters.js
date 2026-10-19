// Hoekige poppetjes (low-poly), gebruikt voor de speler en de uitvinder.
import * as THREE from 'three';

export const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra });

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
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

  // Armen
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

  return { group, legs, arms, body, head, hairM };
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

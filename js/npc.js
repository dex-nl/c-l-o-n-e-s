// De uitvinder: Professor Bolt. Hij staat bij zijn clonemachine.
import * as THREE from 'three';
import { makeCharacter, mat } from './characters.js';

export class Npc {
  constructor(scene, { x, z, name }) {
    this.name = name;
    this.ch = makeCharacter({ shirt: 0x6c757d, pants: 0x495057, skin: 0xf1c27d, hair: 0xdee2e6, coat: 0xffffff });
    this.mesh = this.ch.group;
    this.mesh.position.set(x, 0, z);
    this.mesh.userData.isNpc = true;
    scene.add(this.mesh);

    // Wilde grijze haren en een oranje bril op zijn hoofd
    for (const [hx, hz] of [[-0.3, 0], [0.3, 0], [0, -0.25]]) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 4), this.ch.hairM);
      tuft.position.set(hx, 0.42, hz); tuft.rotation.z = -hx; tuft.castShadow = true;
      this.ch.head.add(tuft);
    }
    const goggleM = mat(0xff8c42, { emissive: 0x552200 });
    for (const gx of [-0.15, 0.15]) {
      const gg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8), goggleM);
      gg.rotation.x = Math.PI / 2; gg.position.set(gx, 0.25, 0.31);
      this.ch.head.add(gg);
    }

    // Uitroepteken boven zijn hoofd ("ik heb iets te zeggen!")
    this.marker = new THREE.Group();
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), yellow); bar.position.y = 0.2;
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), yellow); dot.position.y = -0.25;
    this.marker.add(bar, dot);
    this.marker.position.y = 2.8;
    this.mesh.add(this.marker);
    this.baseRot = 0.4;
  }

  showMarker(yes) { this.marker.visible = yes; }

  distanceTo(pos) {
    return Math.hypot(pos.x - this.mesh.position.x, pos.z - this.mesh.position.z);
  }

  update(t, dt, playerPos) {
    this.marker.position.y = 2.8 + Math.sin(t * 3) * 0.12;
    this.marker.rotation.y = t * 2;
    // Kijk naar de speler als die dichtbij is
    const near = this.distanceTo(playerPos) < 6;
    const target = near ? Math.atan2(playerPos.x - this.mesh.position.x, playerPos.z - this.mesh.position.z) : this.baseRot;
    let diff = target - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * Math.min(1, dt * 5);
    // Een beetje wiebelen, alsof hij nadenkt
    this.ch.body.position.y = 0.98 + Math.sin(t * 2) * 0.03;
    this.ch.head.rotation.z = Math.sin(t * 1.3) * 0.08;
    this.ch.arms[1].rotation.x = -0.4 + Math.sin(t * 2) * 0.2;
  }
}

// C.L.O.N.E.S - hier start het spel en draait de spel-lus.
import * as THREE from 'three';
import { createWorld, makeGear } from './world.js';
import { Player } from './player.js';
import { Npc } from './npc.js';
import { CloneSquad, MAX_CLONES } from './clones.js';
import { Controls } from './controls.js';
import { loadSave, writeSave } from './save.js';
import { ui } from './ui.js';
import { NPC_NAME, GEARS_NEEDED, questText, npcLines } from './quest.js';

const TALK_DISTANCE = 3.2;
const CLONE_DISTANCE = 3.4; // hoe dichtbij de clonemachine je moet staan
const canvas = document.getElementById('game');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  ui.showError('Oeps! Deze browser kan geen 3D laten zien. Probeer Safari of Chrome.');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---------- Scène, licht en camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3f4);
scene.fog = new THREE.Fog(0x8fd3f4, 35, 75);

scene.add(new THREE.HemisphereLight(0xdff6ff, 0x6a994e, 1.2));
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const CAM_OFFSET = new THREE.Vector3(0, 9, 11);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Wereld, speler en uitvinder ----------
const world = createWorld(scene);
const player = new Player(scene);
const npc = new Npc(scene, { ...world.npcSpot, name: NPC_NAME });
world.colliders.push({ x: world.npcSpot.x, z: world.npcSpot.z, r: 0.5 });

// ---------- Spelvoortgang laden ----------
const state = loadSave();
player.setPosition(state.player.x, state.player.z, state.player.rot);
player.resolveCollisions(world);

// Clones terugzetten (die volgen de speler)
const squad = new CloneSquad(scene, world);
squad.restore(state.clones || 0, player);

// Tandwielen in het dorp
const gears = world.gearSpots.map((spot) => {
  const g = makeGear(0.45);
  g.position.set(spot.x, 1, spot.z);
  scene.add(g);
  // een glinsterende ring eronder
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.8, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.7 }));
  ring.position.set(spot.x, 0.05, spot.z);
  scene.add(ring);
  return { ...spot, mesh: g, ring };
});

function refresh() {
  const q = state.quest;
  for (const g of gears) {
    const show = q.state === 'bezig' && !q.gears.includes(g.id);
    g.mesh.visible = g.ring.visible = show;
  }
  world.machine.setRepaired(q.state === 'klaar');
  if (q.state !== 'klaar') world.machine.setGearsInside(0);
  npc.showMarker(q.state === 'nieuw' || (q.state === 'bezig' && q.gears.length >= GEARS_NEEDED));
  ui.setQuest(questText(q));
  ui.setCloneCount(q.state === 'klaar', squad.count, MAX_CLONES);
}

let dirty = false;
function save() {
  state.player = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), rot: +player.rot.toFixed(2) };
  state.clones = squad.count;
  writeSave(state);
  dirty = false;
}

// ---------- Klonen ----------
function nearMachine() {
  return state.quest.state === 'klaar' &&
    Math.hypot(player.pos.x - world.machine.x, player.pos.z - world.machine.z) <= CLONE_DISTANCE;
}

let lastCloneAt = -1e9; // echte tijd (ms), zodat je niet per ongeluk dubbel kloont
function makeClone() {
  if (ui.dialogOpen || !nearMachine() || performance.now() - lastCloneAt < 400) return;
  if (squad.count >= MAX_CLONES) {
    ui.toast(`Je hebt al ${MAX_CLONES} clones! Meer passen er nog niet in het dorp 😄`, 2800);
    return;
  }
  lastCloneAt = performance.now();
  world.machine.zap();
  ui.flash();
  squad.add(world.machine.front.x, world.machine.front.z);
  const n = squad.count;
  ui.toast(n >= MAX_CLONES ? `✨ Clone ${n}! Nu heb je er ${MAX_CLONES}: je hele team! ✨` : `✨ Pats! Een clone! (${n}/${MAX_CLONES}) ✨`);
  refresh();
  save();
}

// ---------- Praten ----------
function talk() {
  if (ui.dialogOpen) { ui.nextLine(); return; }
  if (npc.distanceTo(player.pos) > TALK_DISTANCE) { if (nearMachine()) makeClone(); return; }
  const q = state.quest;
  const wasAllFound = q.state === 'bezig' && q.gears.length >= GEARS_NEEDED;
  ui.showDialog(NPC_NAME, npcLines(q), () => {
    if (q.state === 'nieuw') {
      q.state = 'bezig';
      ui.toast('Nieuwe opdracht: zoek 3 tandwielen!');
    } else if (wasAllFound) {
      q.state = 'klaar';
      ui.toast('🎉 Opdracht klaar! Goed gedaan! 🎉', 3500);
      confetti();
    }
    refresh();
    save();
  });
}

const raycaster = new THREE.Raycaster();
function onTap(x, y) {
  if (ui.dialogOpen) { ui.nextLine(); return; }
  const p = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  if (raycaster.intersectObject(npc.mesh, true).length) {
    if (npc.distanceTo(player.pos) <= TALK_DISTANCE) talk();
    else ui.toast('Loop eerst wat dichterbij!');
  }
}

const controls = new Controls({
  canvas,
  base: document.getElementById('joy-base'),
  knob: document.getElementById('joy-knob'),
  talkBtn: document.getElementById('talk-btn'),
  cloneBtn: document.getElementById('clone-btn'),
  onAction: talk,
  onClone: makeClone,
  onTap,
});

// ---------- Confetti als de opdracht klaar is ----------
const confettiBits = [];
function confetti() {
  const colors = [0xff6b6b, 0xffd23f, 0x3a86ff, 0x52b788, 0xc77dff];
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.04), new THREE.MeshBasicMaterial({ color: colors[i % 5] }));
    m.position.set(npc.mesh.position.x, 3, npc.mesh.position.z);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 6);
    m.userData.life = 2.5;
    scene.add(m);
    confettiBits.push(m);
  }
}

// ---------- Spel-lus ----------
refresh();
const clock = new THREE.Clock();
let t = 0, saveTimer = 0;
const camTarget = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
let debugCam = null; // alleen voor testen: camera ergens anders neerzetten
const TALK_CAM_OFFSET = new THREE.Vector3(5, 4.5, 7);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  const move = ui.dialogOpen ? { x: 0, y: 0 } : controls.move;
  const before = player.pos.clone();
  player.update(dt, move, world);
  if (before.distanceToSquared(player.pos) > 1e-6) dirty = true;

  world.update(t, dt);
  npc.update(t, dt, player.pos);
  squad.update(t, dt, player);

  // Tandwielen draaien en oppakken
  for (const g of gears) {
    if (!g.mesh.visible) continue;
    g.mesh.rotation.y = t * 2;
    g.mesh.position.y = 1 + Math.sin(t * 3 + g.x) * 0.2;
    g.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    if (Math.hypot(player.pos.x - g.x, player.pos.z - g.z) < 1.2) {
      state.quest.gears.push(g.id);
      const n = state.quest.gears.length;
      ui.toast(n >= GEARS_NEEDED ? '⚙️ Alle 3 gevonden! Terug naar de uitvinder!' : `⚙️ Tandwiel gevonden! (${n}/3)`);
      refresh();
      save();
    }
  }

  // Confetti laten vallen
  for (let i = confettiBits.length - 1; i >= 0; i--) {
    const c = confettiBits[i];
    c.userData.v.y -= 9 * dt;
    c.position.addScaledVector(c.userData.v, dt);
    c.rotation.x += dt * 8; c.rotation.y += dt * 6;
    c.userData.life -= dt;
    if (c.userData.life <= 0) { scene.remove(c); c.geometry.dispose(); confettiBits.splice(i, 1); }
  }

  // Praat-knop oplichten als je dichtbij bent
  const near = npc.distanceTo(player.pos) <= TALK_DISTANCE;
  ui.setTalkReady(ui.dialogOpen || near, ui.dialogOpen ? 'Verder' : 'Praat');
  // Kloon-knop alleen bij de werkende machine
  ui.setCloneButton(!ui.dialogOpen && nearMachine(), squad.count >= MAX_CLONES);

  // Camera volgt de speler soepel
  // (tijdens een gesprek schuift de camera opzij, zodat je de uitvinder goed ziet)
  if (ui.dialogOpen) {
    lookGoal.copy(player.pos).add(npc.mesh.position).multiplyScalar(0.5);
    camTarget.copy(lookGoal).add(TALK_CAM_OFFSET);
  } else {
    lookGoal.copy(player.pos);
    camTarget.copy(player.pos).add(CAM_OFFSET);
  }
  camera.position.lerp(camTarget, Math.min(1, dt * 4));
  lookAt.lerp(lookGoal, Math.min(1, dt * 6));
  camera.lookAt(lookAt.x, lookAt.y + 1, lookAt.z);
  if (debugCam) { camera.position.set(...debugCam.pos); camera.lookAt(...debugCam.look); }

  // Zon (en schaduw) volgt de speler
  sun.position.set(player.pos.x + 12, 25, player.pos.z + 8);
  sun.target.position.copy(player.pos);

  // Elke paar seconden automatisch opslaan
  saveTimer += dt;
  if (dirty && saveTimer > 1.5) { saveTimer = 0; save(); }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

camera.position.copy(player.pos).add(CAM_OFFSET);
const lookAt = player.pos.clone();
requestAnimationFrame(frame);
setTimeout(() => ui.hideTitle(), 1800);

// Opslaan als de app wordt weggezet
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// Handig om te testen (in de console): window.clones
window.clones = { state, player, npc, talk, save, squad, machine: world.machine, makeClone, scene, camera, gears, renderer,
  setDebugCam: (pos, look) => { debugCam = pos ? { pos, look } : null; } };

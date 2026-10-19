// C.L.O.N.E.S - hier start het spel en draait de spel-lus.
import * as THREE from 'three';
import { createWorld, makeGear } from './world.js';
import { Player } from './player.js';
import { Npc } from './npc.js';
import { Controls } from './controls.js';
import { loadSave, writeSave } from './save.js';
import { ui } from './ui.js';
import { NPC_NAME, GEARS_NEEDED, MAX_CLONES, questText, npcLines } from './quest.js';
import { CloneSquad } from './clones.js';
import { Effects } from './effects.js';
import { sfx, setMuted } from './sound.js';

const TALK_DISTANCE = 3.2;
const CLONE_DISTANCE = 2.2; // zo dicht moet je bij de voorkant van de machine staan
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
const squad = new CloneSquad(scene);
const fx = new Effects(scene);

// ---------- Spelvoortgang laden ----------
const state = loadSave();
player.setPosition(state.player.x, state.player.z, state.player.rot);
player.resolveCollisions(world);
squad.restore(state.clones, player);
setMuted(!state.sound);
ui.setSoundBtn(state.sound);

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
  const repaired = q.state === 'klaar' || q.state === 'aan';
  world.machine.setRepaired(repaired);
  world.machine.setOn(q.state === 'aan');
  if (!repaired) world.machine.setGearsInside(0);
  npc.showMarker(q.state === 'nieuw' || q.state === 'klaar' || (q.state === 'bezig' && q.gears.length >= GEARS_NEEDED));
  ui.setQuest(questText(q, state.clones));
}

let dirty = false;
function save() {
  state.player = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), rot: +player.rot.toFixed(2) };
  writeSave(state);
  dirty = false;
}

// ---------- Praten ----------
function talk() {
  if (ui.dialogOpen) { ui.nextLine(); return; }
  if (npc.distanceTo(player.pos) > TALK_DISTANCE) return;
  const q = state.quest;
  const wasAllFound = q.state === 'bezig' && q.gears.length >= GEARS_NEEDED;
  ui.showDialog(NPC_NAME, npcLines(q, state.clones), () => {
    if (q.state === 'nieuw') {
      q.state = 'bezig';
      ui.toast('Nieuwe opdracht: zoek 3 tandwielen!');
    } else if (wasAllFound) {
      q.state = 'klaar';
      ui.toast('🎉 Opdracht klaar! Goed gedaan! 🎉', 3500);
      fx.confetti(npc.mesh.position);
      sfx.tada();
    } else if (q.state === 'klaar') {
      q.state = 'aan';
      ui.toast('🧬 De clonemachine doet het!', 3000);
      world.machine.zap();
      fx.sparkle({ x: world.machine.x, y: 3, z: world.machine.z }, [0x7af7ff, 0xffffff, 0xffd23f], 40, 6);
      sfx.powerUp();
    }
    refresh();
    save();
  });
}

ui.onLine = () => sfx.blip();

// ---------- Clonen ----------
const nearMachine = () => Math.hypot(player.pos.x - world.machine.front.x, player.pos.z - world.machine.front.z) <= CLONE_DISTANCE;

function makeClone() {
  if (ui.dialogOpen || state.quest.state !== 'aan' || squad.busy) return;
  if (!nearMachine()) { ui.toast('Ga eerst voor de clonemachine staan!'); return; }
  if (state.clones >= MAX_CLONES) { ui.toast(`Je hebt al ${MAX_CLONES} clones. Meer passen er niet!`); sfx.nope(); return; }
  state.clones++;
  world.machine.zap();
  squad.spawn(world.machine.x, world.machine.z);
  fx.sparkle({ x: world.machine.x, y: 1.6, z: world.machine.z }, [0x7af7ff, 0xffffff], 30, 5);
  sfx.clone();
  if (state.clones >= MAX_CLONES) {
    ui.toast(`🎉 Clone-team compleet: ${MAX_CLONES} clones! 🎉`, 3500);
    setTimeout(() => { fx.confetti(player.pos); sfx.tada(); }, 900);
  } else {
    ui.toast(`🧬 Clone ${state.clones} gemaakt!`);
  }
  refresh();
  save();
}

const raycaster = new THREE.Raycaster();
function onTap(x, y) {
  if (ui.dialogOpen) { ui.nextLine(); return; }
  const p = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  if (raycaster.intersectObject(npc.mesh, true).length) {
    if (npc.distanceTo(player.pos) <= TALK_DISTANCE) talk();
    else ui.toast('Loop eerst wat dichterbij!');
  } else if (state.quest.state === 'aan' && raycaster.intersectObject(world.machine.group, true).length) {
    makeClone();
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

// Geluid aan/uit
document.getElementById('sound-btn').addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  state.sound = !state.sound;
  setMuted(!state.sound);
  ui.setSoundBtn(state.sound);
  save();
});

// ---------- Spel-lus ----------
refresh();
const clock = new THREE.Clock();
let t = 0, saveTimer = 0, lastStep = 0;
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

  // Stofwolkje bij elke voetstap
  const step = Math.floor(player.phase / Math.PI);
  if (step !== lastStep && player.walkAmount > 0.6) fx.dust(player.pos);
  lastStep = step;

  // Tandwielen draaien en oppakken
  for (const g of gears) {
    if (!g.mesh.visible) continue;
    g.mesh.rotation.y = t * 2;
    g.mesh.position.y = 1 + Math.sin(t * 3 + g.x) * 0.2;
    g.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    if (Math.hypot(player.pos.x - g.x, player.pos.z - g.z) < 1.2) {
      state.quest.gears.push(g.id);
      fx.sparkle(g.mesh.position, [0xffd23f, 0xffc300, 0xffffff]);
      sfx.ding();
      const n = state.quest.gears.length;
      ui.toast(n >= GEARS_NEEDED ? '⚙️ Alle 3 gevonden! Terug naar de uitvinder!' : `⚙️ Tandwiel gevonden! (${n}/3)`);
      refresh();
      save();
    }
  }

  // Confetti, glinsters en stof
  fx.update(dt);

  // Praat-knop oplichten als je dichtbij bent
  const near = npc.distanceTo(player.pos) <= TALK_DISTANCE;
  ui.setTalkReady(ui.dialogOpen || near, ui.dialogOpen ? 'Verder' : 'Praat');
  // Clone-knop alleen bij de machine (als hij aan staat)
  ui.setCloneBtn(!ui.dialogOpen && state.quest.state === 'aan' && nearMachine(), state.clones >= MAX_CLONES ? 'Vol!' : 'Clone!');

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
window.clones = { state, player, npc, talk, save, scene, camera, gears, renderer, squad, makeClone, world,
  setDebugCam: (pos, look) => { debugCam = pos ? { pos, look } : null; } };

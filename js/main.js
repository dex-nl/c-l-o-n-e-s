// C.L.O.N.E.S - hier start het spel en draait de spel-lus.
import * as THREE from 'three';
import { createWorld, makeGear } from './world.js';
import { Player } from './player.js';
import { Npc } from './npc.js';
import { CloneSquad, MAX_CLONES } from './clones.js';
import { createForest } from './forest.js';
import { Controls } from './controls.js';
import { loadSave, writeSave } from './save.js';
import { ui } from './ui.js';
import { NPC_NAME, GEARS_NEEDED, questText, npcLines, OWL_NAME, owlLines, forestQuestText } from './quest.js';

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
const baseChildren = new Set(scene.children); // licht en zon
const world = createWorld(scene);
const forest = createForest(scene);
const VILLAGE_FOG = { color: 0x8fd3f4, near: 35, far: 75 };
const player = new Player(scene);
const npc = new Npc(scene, { ...world.npcSpot, name: NPC_NAME });
world.colliders.push({ x: world.npcSpot.x, z: world.npcSpot.z, r: 0.5 });

// ---------- Spelvoortgang laden ----------
const state = loadSave();
const inForest = () => state.area === 'bos';
const zone = () => (inForest() ? forest : world);
player.setPosition(state.player.x, state.player.z, state.player.rot);
// Klopt de plek niet bij het gebied? Dan zetten we je bij de ingang.
if (inForest() && !forest.contains(player.pos)) player.setPosition(forest.entry.x, forest.entry.z, forest.entry.rot);
if (!inForest() && Math.hypot(player.pos.x, player.pos.z) > 23) player.setPosition(0, 5, Math.PI);
player.resolveCollisions(zone());

// Clones terugzetten (die volgen de speler)
const squad = new CloneSquad(scene, zone());
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

// ---------- Gebieden: dorp en bos ----------
let villageObjs = null;
function applyArea() {
  if (!villageObjs) {
    villageObjs = scene.children.filter((o) => !baseChildren.has(o) && o !== player.mesh && o !== forest.group &&
      !squad.list.some((c) => c.mesh === o));
  }
  const f = inForest();
  for (const o of villageObjs) o.visible = !f;
  forest.group.visible = f;
  const fog = f ? forest.fog : VILLAGE_FOG;
  scene.fog.color.set(fog.color); scene.fog.near = fog.near; scene.fog.far = fog.far;
  scene.background.set(fog.color);
  squad.world = zone();
  if (!f) refreshGears();
}

let transitioning = false;
function goTo(area) {
  if (transitioning || state.area === area) return;
  transitioning = true;
  ui.fade(true);
  setTimeout(() => {
    state.area = area;
    applyArea();
    if (area === 'bos') player.setPosition(forest.entry.x, forest.entry.z, forest.entry.rot);
    else player.setPosition(world.returnSpot.x, world.returnSpot.z, 0);
    squad.resetAll(player);
    camera.position.copy(player.pos).add(CAM_OFFSET);
    lookAt.copy(player.pos);
    refresh();
    save();
    ui.fade(false);
    ui.toast(area === 'bos' ? '🌲 Het Fluisterbos 🌲' : '🏡 Terug in het dorp');
    transitioning = false;
  }, 380);
}

function refreshGears() {
  const q = state.quest;
  for (const g of gears) {
    const show = q.state === 'bezig' && !q.gears.includes(g.id);
    g.mesh.visible = g.ring.visible = show;
  }
}

function forestHud() {
  const next = state.forest.solved.findIndex((x) => !x);
  const pressed = next >= 0 ? forest.puzzles[next].pressedCount || 0 : 0;
  return forestQuestText(state.forest, squad.count, pressed);
}

function refresh() {
  const q = state.quest;
  if (!inForest()) refreshGears();
  world.machine.setRepaired(q.state === 'klaar');
  if (q.state !== 'klaar') world.machine.setGearsInside(0);
  npc.showMarker(q.state === 'nieuw' || (q.state === 'bezig' && q.gears.length >= GEARS_NEEDED));
  world.gate.setOpen(q.state === 'klaar');
  forest.setMapTaken(state.forest.map);
  forest.owl.showMarker(!state.forest.owl);
  if (inForest()) ui.setQuest(forestHud());
  else if (q.state === 'klaar' && state.forest.map) ui.setQuest('⭐ Stuk 1 van de schatkaart gevonden! Volgende gebied: <b>binnenkort</b>');
  else if (q.state === 'klaar' && squad.count > 0) ui.setQuest('🌲 Ga door de poort in het noorden naar <b>het bos</b>');
  else ui.setQuest(questText(q));
  ui.setCloneCount(q.state === 'klaar', squad.count, MAX_CLONES, state.mapPieces);
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
  return state.quest.state === 'klaar' && !inForest() &&
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
function talker() { return inForest() ? forest.owl : npc; }

function talk() {
  if (ui.dialogOpen) { ui.nextLine(); return; }
  if (transitioning) return;
  if (inForest()) {
    if (forest.owl.distanceTo(player.pos) > TALK_DISTANCE) return;
    forest.owl.hop();
    ui.showDialog(OWL_NAME, owlLines(state.forest, squad.count), () => {
      if (!state.forest.owl) { state.forest.owl = true; ui.toast('🌲 Op naar poort 1!'); }
      refresh();
      save();
    });
    return;
  }
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
      confetti(npc.mesh.position);
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
  if (raycaster.intersectObject(talker().mesh, true).length) {
    if (talker().distanceTo(player.pos) <= TALK_DISTANCE) talk();
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
  stayBtn: document.getElementById('stay-btn'),
  followBtn: document.getElementById('follow-btn'),
  onStay: stay,
  onFollow: follow,
  onTap,
});

// ---------- Blijf en Volg ----------
function stay() {
  if (ui.dialogOpen || transitioning) return;
  if (squad.count === 0) { ui.toast('Je hebt nog geen clones! Maak ze bij de clonemachine.'); return; }
  const c = squad.stay(player, inForest() ? forest.allPlates : []);
  if (c) ui.toast(`🟢 Een clone blijft hier wachten (${squad.waitingCount} wacht${squad.waitingCount === 1 ? '' : 'en'})`);
  else ui.toast('Al je clones staan al te wachten. Druk op Volg!');
}

function follow() {
  if (ui.dialogOpen || transitioning) return;
  const n = squad.followAll();
  ui.toast(n ? '👣 Volg mij!' : 'Je clones volgen je al!');
}

// ---------- Confetti als de opdracht klaar is ----------
const confettiBits = [];
function confetti(at) {
  const colors = [0xff6b6b, 0xffd23f, 0x3a86ff, 0x52b788, 0xc77dff];
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.04), new THREE.MeshBasicMaterial({ color: colors[i % 5] }));
    m.position.set(at.x, 3, at.z);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 4, (Math.random() - 0.5) * 6);
    m.userData.life = 2.5;
    scene.add(m);
    confettiBits.push(m);
  }
}

// ---------- Spel-lus ----------
refresh();
const clock = new THREE.Clock();
let t = 0, saveTimer = 0, gateHintAt = -10;
const camTarget = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
let debugCam = null; // alleen voor testen: camera ergens anders neerzetten
const TALK_CAM_OFFSET = new THREE.Vector3(5, 4.5, 7);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  const move = ui.dialogOpen || transitioning ? { x: 0, y: 0 } : controls.move;
  const before = player.pos.clone();
  player.update(dt, move, zone());
  if (before.distanceToSquared(player.pos) > 1e-6) dirty = true;

  if (inForest()) {
    // Puzzels in het bos: jij en wachtende clones drukken op de knoppen
    const solvedNow = forest.update(t, dt, { pressers: [player.pos, ...squad.waitingPositions()], playerPos: player.pos, solved: state.forest.solved });
    for (const i of solvedNow) {
      state.forest.solved[i] = true;
      ui.toast(i < 2 ? `🎉 Poort ${i + 1} is open en blijft open! 🎉` : '🎉 Alle poorten open! Zoek de schatkaart! 🎉', 3000);
      confetti(player.pos);
      save();
    }
    // Het stuk van de schatkaart
    if (!state.forest.map && forest.nearMap(player.pos)) {
      state.forest.map = true;
      state.mapPieces += 1;
      ui.toast(`🗺️ Je vond stuk ${state.mapPieces} van de schatkaart! 🗺️`, 4000);
      confetti(forest.mapSpot);
      ui.flash();
      refresh();
      save();
    }
    ui.setQuest(forestHud());
    if (forest.atExit(player.pos)) goTo('dorp');
  } else {
    world.update(t, dt);
    npc.update(t, dt, player.pos);
    // Poort naar het bos
    if (Math.hypot(player.pos.x - world.gateSpot.x, player.pos.z - world.gateSpot.z) < 1.6) {
      if (state.quest.state === 'klaar') goTo('bos');
      else if (t - gateHintAt > 4) { gateHintAt = t; ui.toast('De poort naar het bos is nog dicht. Help eerst Professor Bolt!', 3000); }
    }
  }
  squad.update(t, dt, player);

  // Tandwielen draaien en oppakken
  for (const g of gears) {
    if (!g.mesh.visible || inForest()) continue;
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
  const near = talker().distanceTo(player.pos) <= TALK_DISTANCE;
  ui.setTalkReady(ui.dialogOpen || near, ui.dialogOpen ? 'Verder' : 'Praat');
  // Kloon-knop alleen bij de werkende machine
  ui.setCloneButton(!ui.dialogOpen && nearMachine(), squad.count >= MAX_CLONES);
  ui.setSquadButtons(!ui.dialogOpen && squad.followingCount > 0, !ui.dialogOpen && squad.waitingCount > 0);

  // Camera volgt de speler soepel
  // (tijdens een gesprek schuift de camera opzij, zodat je de uitvinder goed ziet)
  if (ui.dialogOpen) {
    lookGoal.copy(player.pos).add(talker().mesh.position).multiplyScalar(0.5);
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
applyArea();
refresh();
requestAnimationFrame(frame);
setTimeout(() => ui.hideTitle(), 1800);

// Opslaan als de app wordt weggezet
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// Handig om te testen (in de console): window.clones
window.clones = { state, player, npc, talk, save, squad, machine: world.machine, makeClone, forest, world, goTo, stay, follow,
  get transitioning() { return transitioning; }, scene, camera, gears, renderer,
  setDebugCam: (pos, look) => { debugCam = pos ? { pos, look } : null; } };

// C.L.O.N.E.S - hier start het spel en draait de spel-lus.
import * as THREE from 'three';
import { createWorld, makeGear } from './world.js';
import { createForest } from './forest.js';
import { createCave } from './cave.js';
import { Player } from './player.js';
import { makeBolt, makeKoopman, makeOma, Dog } from './npc.js';
import { Controls } from './controls.js';
import { loadSave, writeSave, SAVE_KEY } from './save.js';
import { ui } from './ui.js';
import { GEARS_NEEDED, TEAM_SIZE, reached, maxClones, questText, boltHasNews, linesFor } from './quest.js';
import { CloneSquad } from './clones.js';
import { Effects } from './effects.js';
import { Slime } from './enemies.js';
import { Pickups } from './pickups.js';
import { buildShop } from './shop.js';
import { buildBackpack } from './backpack.js';
import { buildMap } from './map.js';
import { sfx, setSoundOn, setMusicOn, playMusic } from './sound.js';

const TALK_DISTANCE = 3.2;
const CLONE_DISTANCE = 2.2; // zo dicht moet je bij de voorkant van de machine staan
const SWORD_REACH = 2.1;    // zo ver komt je zwaard
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

// ---------- Scène, licht, lucht en camera ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc4ebf8, 35, 80);
const hemi = new THREE.HemisphereLight(0xdff6ff, 0x6a994e, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
// Een lantaarn die met je meeloopt (alleen in de grot)
const lantern = new THREE.PointLight(0xffd6a0, 28, 13, 1.5);
scene.add(lantern);

// De lucht: een grote bol met een kleurverloop van boven naar de horizon
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
    void main() { float h = clamp(normalize(vPos).y * 1.8 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0);
    #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, depthWrite: false,
}));
scene.add(sky);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const CAM_OFFSET = new THREE.Vector3(0, 9, 11);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- De zones: dorp, bos en grot ----------
// Er is altijd maar één zone zichtbaar. Ze liggen allemaal op dezelfde plek.
const zones = {};
function addZone(make) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const z = make(group);
  z.group = group;
  z.npcs = z.npcs || [];
  z.talkables = z.talkables || [];
  zones[z.id] = z;
  return z;
}
const world = addZone((g) => Object.assign(createWorld(g), {
  id: 'dorp', name: 'Het Dorp', music: 'dorp',
  env: { sky: [0x58b4ea, 0xcdeefa], fog: [0xcdeefa, 35, 85], hemi: [0xdff6ff, 0x6a994e, 1.2], sun: [0xfff2d6, 2.2], cam: [0, 9, 11] },
}));
const forest = addZone(createForest);
const cave = addZone(createCave);

// Dorpelingen
const bolt = makeBolt(world.group, world.npcSpot);
const koopman = makeKoopman(world.group, world.spots.koopman);
const oma = makeOma(world.group, world.spots.oma);
const hond = new Dog(world.group, world.spots.hond);
world.colliders.push({ x: world.npcSpot.x, z: world.npcSpot.z, r: 0.5 }, { x: koopman.pos.x, z: koopman.pos.z, r: 0.45 });
world.npcs = [bolt, koopman, oma, hond];
world.talkables = [...world.npcs];

// Op de kaart
world.mapItems = [{ x: 5, z: 10, r: 4.2, color: '#4fb3e8' }, { x: 0, z: 0, r: 1.3, color: '#9aa0a6' }];
world.labels = [
  { x: -4.6, z: -14.5, text: 'Clonemachine' }, { x: 0, z: -21, text: 'Poort' },
  { x: 7, z: 0.2, text: 'Kraam' }, { x: 5, z: 10, text: 'Vijver' },
];
forest.labels = [{ x: 0, z: -20, text: 'Grotdeur' }, { x: 0, z: 21, text: 'Naar het dorp' }];
cave.labels = [{ x: 0, z: 15, text: 'Ingang' }, { x: 0, z: -15, text: 'Koningszaal' }];

// Uitgangen: waar kom je in een andere zone?
world.exits = [{
  x: 0, z: -22.4, r: 1.6, to: 'bos', spawn: () => forest.spawns.fromDorp,
  open: () => reached(state.quest, 'zwaard'), closedMsg: 'De poort is op slot. Misschien weet Professor Bolt meer...',
}];
forest.exits = [
  { x: 0, z: 22.6, r: 1.4, to: 'dorp', spawn: () => world.spots.uitBos, open: () => true },
  { x: 0, z: -22.3, r: 1.1, to: 'grot', spawn: () => cave.spawns.fromBos, open: () => forest.doorOpen },
];
cave.exits = [{ x: cave.exit.x, z: cave.exit.z, r: 1.0, to: 'bos', spawn: () => forest.spawns.fromGrot, open: () => true }];

// ---------- Speler, clones en effecten ----------
const player = new Player(scene);
const squad = new CloneSquad(scene);
const fx = new Effects(scene);
const pickups = new Pickups(scene);
const state = loadSave();
const hadSave = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
let hearts = state.maxHearts;

// Tandwielen in het dorp
const gears = world.gearSpots.map((spot) => {
  const g = makeGear(0.45);
  g.position.set(spot.x, 1, spot.z);
  world.group.add(g);
  // een glinsterende ring eronder
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.8, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.7 }));
  ring.position.set(spot.x, 0.05, spot.z);
  world.group.add(ring);
  return { ...spot, mesh: g, ring };
});

// Waar landt Koning Slijm? (een schaduw op de grond)
const landing = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
landing.position.y = 0.05;
landing.visible = false;
scene.add(landing);

// ---------- Het "spel" dat slijmpjes en zones kunnen gebruiken ----------
let enemies = [];
let king = null;
let kingBeaten = false; // in dit potje verslagen (de batterij ligt er nog)
let shake = 0, hitStop = 0, fainting = false, transition = false;
let lastHitSound = 0;

const game = {
  player, squad, fx, sfx, zone: null,
  hurtPlayer(n, x, z, power = 10) {
    if (player.invuln > 0 || fainting || transition) return;
    hearts = Math.max(0, hearts - n);
    player.invuln = 1.1;
    player.knock(x, z, power);
    ui.hurtFlash();
    sfx.hurt();
    shake = Math.max(shake, 0.35);
    if (hearts <= 0) faint();
  },
  spawnSlime(x, z, kind) {
    const s = new Slime(game.zone.group, x, z, kind);
    s.chasing = true;
    enemies.push(s);
    fx.poof({ x, z }, 0x5aa9e6);
  },
  onSlimeDefeated(s) {
    fx.poof(s.pos, s.king ? 0x4cc96f : s.kind === 'blauw' ? 0x5aa9e6 : 0x7bd389, s.king ? 3 : 1);
    sfx.poof();
    pickups.spawn('kristal', s.pos.x, s.pos.z, s.loot + Math.floor(Math.random() * 2));
    if (hearts < state.maxHearts && Math.random() < 0.3) pickups.spawn('hart', s.pos.x, s.pos.z);
    if (s.king) {
      kingBeaten = true;
      hitStop = 0.35;
      shake = 1;
      fx.confetti(s.pos, 90);
      sfx.fanfare();
      ui.toast('👑 Koning Slijm is verslagen! 👑', 3500);
      pickups.spawn('batterij', s.pos.x, s.pos.z);
      for (const e of enemies) if (!e.dead) e.hurt(99, s.pos.x, s.pos.z, game);
    }
  },
  slam(x, z, r) {
    fx.ring({ x, z }, r, 0x9bf6ff, 0.55);
    fx.ring({ x, z }, r * 0.6, 0xffffff, 0.4);
    fx.poof({ x, z }, 0x4cc96f, 1.5);
    sfx.slam();
    shake = Math.max(shake, 0.8);
    if (Math.hypot(player.pos.x - x, player.pos.z - z) < r) game.hurtPlayer(1, x, z, 16);
  },
  showLanding(x, z, r) {
    landing.visible = r > 0;
    landing.position.x = x; landing.position.z = z;
    landing.scale.setScalar(Math.max(0.01, r));
  },
};

function spawnEnemies(zone) {
  enemies = [];
  king = null;
  for (const s of zone.slimeSpots || []) enemies.push(new Slime(zone.group, s.x, s.z, s.kind));
  if (zone.id === 'grot' && state.quest.state === 'grot') {
    if (kingBeaten) pickups.spawn('batterij', zone.king.x, zone.king.z);
    else { king = new Slime(zone.group, zone.king.x, zone.king.z, 'koning'); enemies.push(king); }
  }
}

// ---------- Omgeving per zone ----------
function applyEnv(env) {
  sky.visible = !!env.sky;
  if (env.sky) {
    sky.material.uniforms.top.value.set(env.sky[0]);
    sky.material.uniforms.bottom.value.set(env.sky[1]);
    scene.background = null;
  } else {
    scene.background = new THREE.Color(env.background);
  }
  scene.fog.color.set(env.fog[0]);
  scene.fog.near = env.fog[1];
  scene.fog.far = env.fog[2];
  hemi.color.set(env.hemi[0]);
  hemi.groundColor.set(env.hemi[1]);
  hemi.intensity = env.hemi[2];
  sun.color.set(env.sun[0]);
  sun.intensity = env.sun[1];
  CAM_OFFSET.set(...env.cam);
}

let exitCooldown = 0;
function setZone(id, spawn) {
  const old = game.zone;
  if (old) {
    old.group.visible = false;
    for (const e of enemies) if (!e.removed) old.group.remove(e.mesh);
  }
  pickups.clear();
  landing.visible = false;
  const zone = zones[id];
  game.zone = zone;
  state.zone = id;
  zone.group.visible = true;
  applyEnv(zone.env);
  lantern.visible = id === 'grot';
  player.setPosition(spawn.x, spawn.z, spawn.rot ?? player.rot);
  player.resolveCollisions(zone);
  squad.regroup(player);
  spawnEnemies(zone);
  if (id === 'dorp') hearts = state.maxHearts; // thuis word je weer helemaal beter
  playMusic(zone.music);
  exitCooldown = 1;
  snapCamera();
  refresh();
}

// Naar een andere zone, met een zwart scherm ertussen
function goTo(id, spawn, after = null) {
  if (transition) return;
  transition = true;
  ui.fade(true);
  sfx.whoosh();
  setTimeout(() => {
    setZone(id, spawn);
    save();
    ui.fade(false);
    ui.zoneTitle(zones[id].name);
    transition = false;
    if (after) after();
  }, 450);
}

function faint() {
  fainting = true;
  sfx.faint();
  ui.toast('Oei! Je bent flauwgevallen...', 2000);
  setTimeout(() => {
    goTo('dorp', world.spots.flauw, () => {
      fainting = false;
      ui.toast('Professor Bolt heeft je gevonden. Rust even uit!', 3000);
    });
  }, 1200);
}

// ---------- Alles bijwerken als er iets verandert ----------
function applyGear() {
  if (player.swordLevel !== state.sword) player.setSword(state.sword);
  if (player.hatId !== state.hat) { player.setHat(state.hat); player.hatId = state.hat; }
  if (squad.swordLevel !== state.sword || squad.hat !== state.hat) squad.setGear(state.sword, state.hat);
}

function refresh() {
  const q = state.quest;
  for (const g of gears) {
    const show = q.state === 'bezig' && !q.gears.includes(g.id);
    g.mesh.visible = g.ring.visible = show;
  }
  const repaired = reached(q, 'klaar');
  world.machine.setRepaired(repaired);
  world.machine.setOn(reached(q, 'aan'));
  world.machine.setSuper(reached(q, 'held'));
  if (!repaired) world.machine.setGearsInside(0);
  world.gate.setOpen(reached(q, 'zwaard'));
  forest.setDoorOpen(reached(q, 'grot'));
  bolt.showMarker(boltHasNews(state));
  koopman.showMarker(reached(q, 'zwaard') && state.crystals >= 5 && state.hats.length === 0);
  applyGear();
  const batteryHere = pickups.list.some((p) => p.type === 'batterij');
  ui.setQuest(batteryHere ? '🔋 Pak de <b>Superbatterij</b>!' : questText(state, game.zone.id));
}

let dirty = false;
function save() {
  state.player = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), rot: +player.rot.toFixed(2) };
  writeSave(state);
  dirty = false;
}

// ---------- Praten ----------
function nearestTalkable() {
  let best = null, bestD = TALK_DISTANCE;
  for (const t of game.zone.talkables) {
    const d = t.distanceTo(player.pos);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

function talkTo(t) {
  const q = state.quest;
  const wasAllFound = q.state === 'bezig' && q.gears.length >= GEARS_NEEDED;
  const before = q.state;
  const lines = t.lines || linesFor(t.id, state);
  ui.showDialog(t.name, lines, () => {
    if (t.id === 'bolt') afterBolt(before, wasAllFound);
    if (t.id === 'koopman') openShop();
    refresh();
    save();
  }, t.voice);
}

function afterBolt(before, wasAllFound) {
  const q = state.quest;
  if (before === 'nieuw') {
    q.state = 'bezig';
    ui.toast('Nieuwe opdracht: zoek 3 tandwielen!');
  } else if (wasAllFound) {
    q.state = 'klaar';
    ui.toast('🎉 Opdracht klaar! Goed gedaan! 🎉', 3500);
    fx.confetti(bolt.pos);
    sfx.tada();
  } else if (before === 'klaar') {
    q.state = 'aan';
    ui.toast('🧬 De clonemachine doet het!', 3000);
    world.machine.zap();
    fx.sparkle({ x: world.machine.x, y: 3, z: world.machine.z }, [0x7af7ff, 0xffffff, 0xffd23f], 40, 6);
    sfx.powerUp();
  } else if (before === 'aan' && state.clones >= TEAM_SIZE) {
    q.state = 'zwaard';
    state.sword = Math.max(state.sword, 1);
    ui.toast('⚔️ Je hebt een zwaard! De poort is open!', 3500);
    fx.sparkle({ x: player.pos.x, y: 1.5, z: player.pos.z }, [0xffffff, 0xffd23f], 30, 4);
    sfx.tada();
  } else if (before === 'batterij') {
    q.state = 'held';
    world.machine.zap();
    fx.confetti(bolt.pos, 120);
    sfx.fanfare();
    ui.toast('🏆 Hoofdstuk 2 uitgespeeld! Nu kun je 10 clones maken!', 4500);
  }
}

// Actieknop: praten als er iemand is, anders zwaaien met je zwaard
function action() {
  if (ui.panelOpen || transition || !started) return;
  if (ui.dialogOpen) { ui.nextLine(); return; }
  const t = nearestTalkable();
  if (t) { talkTo(t); return; }
  if (state.sword && player.swing()) {
    sfx.swing();
    fx.swoosh(player.pos, player.rot, state.sword > 1);
  }
}

// Raakt het zwaard een slijmpje?
function swordHits(pos, rot, damage, fromClone) {
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, d = Math.hypot(dx, dz);
    if (d - e.r > SWORD_REACH) continue;
    let diff = Math.atan2(dx, dz) - rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 1.3 && d > e.r + 0.6) continue;
    if (e.hurt(damage, pos.x, pos.z, game)) onHit(e, fromClone);
  }
}

function onHit(e, fromClone) {
  const now = performance.now();
  if (now - lastHitSound > 70) { sfx.hit(); lastHitSound = now; }
  fx.sparkle({ x: e.pos.x, y: e.r, z: e.pos.z }, [0xffffff, 0xfff3b0], fromClone ? 5 : 10, 3);
  if (!fromClone) { hitStop = Math.max(hitStop, 0.05); shake = Math.max(shake, 0.15); }
}

// ---------- Clonen ----------
const nearMachine = () => game.zone === world
  && Math.hypot(player.pos.x - world.machine.front.x, player.pos.z - world.machine.front.z) <= CLONE_DISTANCE;

function makeClone() {
  if (ui.dialogOpen || ui.panelOpen || !reached(state.quest, 'aan') || squad.busy) return;
  if (!nearMachine()) { if (game.zone === world) ui.toast('Ga eerst voor de clonemachine staan!'); return; }
  const max = maxClones(state.quest);
  if (state.clones >= max) { ui.toast(`Je hebt al ${max} clones. Meer passen er niet!`); sfx.nope(); return; }
  state.clones++;
  world.machine.zap();
  squad.spawn(world.machine.x, world.machine.z);
  fx.sparkle({ x: world.machine.x, y: 1.6, z: world.machine.z }, [0x7af7ff, 0xffffff], 30, 5);
  sfx.clone();
  if (state.clones === TEAM_SIZE && state.quest.state === 'aan') {
    ui.toast(`🧬 ${TEAM_SIZE} clones! Professor Bolt wil je iets vertellen...`, 3500);
  } else if (state.clones >= max) {
    ui.toast(`🎉 Clone-team compleet: ${max} clones! 🎉`, 3500);
    setTimeout(() => { fx.confetti(player.pos); sfx.tada(); }, 900);
  } else {
    ui.toast(`🧬 Clone ${state.clones} gemaakt!`);
  }
  refresh();
  save();
}

// ---------- Winkel, rugzak en kaart ----------
function openShop() {
  const build = (body) => buildShop(body, state, (item) => {
    state.crystals -= item.price;
    if (item.kind === 'hoed') { state.hats.push(item.id); state.hat = item.id; }
    if (item.kind === 'hart') { state.maxHearts++; hearts = state.maxHearts; }
    if (item.kind === 'zwaard') state.sword = 2;
    sfx.buy();
    ui.toast(`${item.icon} ${item.name} gekocht!`);
    refresh();
    save();
    ui.refreshPanel(build);
  });
  ui.openPanel('Kraam van Koopman Kees', build);
}

function openBackpack() {
  if (ui.dialogOpen || ui.panelOpen || !started) return;
  const build = (body) => buildBackpack(body, state, hearts, (id) => {
    state.hat = id;
    sfx.click();
    refresh();
    save();
    ui.refreshPanel(build);
  });
  ui.openPanel('Rugzak', build);
}

// Waar moet je heen? (de ster op de kaart)
function questTarget() {
  const q = state.quest, z = game.zone.id;
  const toVillageExit = { x: 0, z: 22 }, toForestFromCave = cave.exit;
  if (q.state === 'bezig') {
    if (q.gears.length >= GEARS_NEEDED) return bolt.pos;
    return gears.find((g) => !q.gears.includes(g.id));
  }
  if (['nieuw', 'klaar', 'batterij'].includes(q.state) || (q.state === 'aan' && state.clones >= TEAM_SIZE)) {
    return z === 'dorp' ? bolt.pos : z === 'bos' ? toVillageExit : toForestFromCave;
  }
  if (q.state === 'aan') return world.machine.front;
  if (q.state === 'zwaard') return z === 'dorp' ? { x: 0, z: -22 } : z === 'bos' ? { x: 0, z: -19 } : null;
  if (q.state === 'grot') return z === 'dorp' ? { x: 0, z: -22 } : z === 'bos' ? { x: 0, z: -21 } : cave.king;
  return null;
}

function openMap() {
  if (ui.dialogOpen || ui.panelOpen || !started) return;
  const zone = game.zone;
  ui.openPanel(`Kaart: ${zone.name}`, (body) => buildMap(body, {
    zone, player, clones: squad.list, enemies, npcs: zone.npcs, target: questTarget(), labels: zone.labels || [],
  }));
}

function toggleSound() {
  state.sound = !state.sound;
  setSoundOn(state.sound);
  ui.setToggles(state.sound, state.music);
  save();
}
function toggleMusic() {
  state.music = !state.music;
  setMusicOn(state.music);
  ui.setToggles(state.sound, state.music);
  save();
}

// ---------- Tikken op het scherm ----------
const raycaster = new THREE.Raycaster();
function onTap(x, y) {
  if (!started || ui.panelOpen) return;
  if (ui.dialogOpen) { ui.nextLine(); return; }
  const p = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  for (const t of game.zone.talkables) {
    if (raycaster.intersectObject(t.mesh, true).length) {
      if (t.distanceTo(player.pos) <= TALK_DISTANCE) talkTo(t);
      else ui.toast('Loop eerst wat dichterbij!');
      return;
    }
  }
  if (game.zone === world && reached(state.quest, 'aan') && raycaster.intersectObject(world.machine.group, true).length) makeClone();
}

const controls = new Controls({
  canvas,
  base: document.getElementById('joy-base'),
  knob: document.getElementById('joy-knob'),
  talkBtn: document.getElementById('talk-btn'),
  cloneBtn: document.getElementById('clone-btn'),
  onAction: action,
  onClone: makeClone,
  onTap,
  onKey: (k) => {
    if (k === 'escape') ui.closePanel();
    else if (ui.panelOpen) ui.closePanel();
    else if (k === 'm') openMap();
    else openBackpack();
  },
});

const tapBtn = (id, fn) => document.getElementById(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
tapBtn('sound-btn', toggleSound);
tapBtn('music-btn', toggleMusic);
tapBtn('bag-btn', openBackpack);
tapBtn('map-btn', openMap);
ui.onVoice = (pitch) => sfx.voice(pitch);

// ---------- De drukknoppen voor de grotdeur ----------
let plateHint = 0;
function updatePlates(dt) {
  squad.clearHolds();
  const plates = forest.plates;
  plateHint -= dt;
  if (forest.doorOpen) { plates.forEach((p) => { p.pressed = true; }); return; }
  const onPlate = plates.find((p) => Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 0.75);
  // Sta jij op een knop? Dan helpen je clones mee op de andere knoppen
  if (onPlate) for (const p of plates) if (p !== onPlate) squad.holdNearest(p.x, p.z, 2.8);
  const people = [player.pos, ...squad.list.filter((c) => c.spawning <= 0).map((c) => c.pos)];
  for (const p of plates) {
    const was = p.pressed;
    p.pressed = people.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.72);
    if (p.pressed && !was) sfx.click();
  }
  if (plates.every((p) => p.pressed)) {
    forest.setDoorOpen(true);
    if (state.quest.state === 'zwaard') state.quest.state = 'grot';
    sfx.rumble();
    shake = 1.2;
    ui.toast('🚪 De grotdeur gaat open!', 3000);
    refresh();
    save();
  } else if (onPlate && squad.list.length < 2 && plateHint <= 0) {
    ui.toast('Je hebt meer mensen nodig... Wie kan je helpen?', 3000);
    plateHint = 6;
  }
}

// ---------- Spel-lus ----------
const clock = new THREE.Clock();
let t = 0, saveTimer = 0, lastStep = 0, started = false;
const camTarget = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const lookAt = new THREE.Vector3();
let debugCam = null; // alleen voor testen: camera ergens anders neerzetten
const TALK_CAM_OFFSET = new THREE.Vector3(5, 4.5, 7);
let talkPartner = null;

function snapCamera() {
  camera.position.copy(player.pos).add(CAM_OFFSET);
  lookAt.copy(player.pos);
}

function frame() {
  const realDt = Math.min(clock.getDelta(), 0.05);
  t += realDt;
  let dt = realDt;
  if (hitStop > 0) { hitStop -= realDt; dt = 0; } // heel even stilzetten bij een klap: voelt sterker!
  const zone = game.zone;
  const paused = !started || ui.dialogOpen || ui.panelOpen;

  const move = paused || transition || fainting ? { x: 0, y: 0 } : controls.move;
  const before = player.pos.clone();
  player.update(dt, move, zone);
  if (before.distanceToSquared(player.pos) > 1e-6) dirty = true;
  if (player.swingHit) swordHits(player.pos, player.rot, state.sword, false);

  zone.update(t, realDt);
  for (const n of zone.npcs) n.update(t, realDt, player.pos, zone);
  squad.update(t, dt, player, {
    zone, enemies,
    onHit: (e, c) => { if (e.hurt(state.sword, c.pos.x, c.pos.z, game)) onHit(e, true); },
  });
  if (!paused) {
    for (const e of enemies) e.update(t, dt, game);
    enemies = enemies.filter((e) => !e.removed);
  }
  pickups.update(t, dt, [player.pos, ...squad.list.map((c) => c.pos)], (type) => {
    if (type === 'kristal') { state.crystals++; sfx.coin(); }
    if (type === 'hart') { hearts = Math.min(state.maxHearts, hearts + 1); sfx.heal(); }
    if (type === 'batterij') {
      state.quest.state = 'batterij';
      kingBeaten = false;
      sfx.fanfare();
      fx.confetti(player.pos);
      ui.toast('🔋 Je hebt de Superbatterij! Breng hem naar Professor Bolt!', 4000);
      save();
    }
    refresh();
    dirty = true;
  });

  // Stofwolkje bij elke voetstap
  const step = Math.floor(player.phase / Math.PI);
  if (step !== lastStep && player.walkAmount > 0.6 && zone !== cave) fx.dust(player.pos);
  lastStep = step;

  // Tandwielen draaien en oppakken
  if (zone === world) {
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
  }
  if (zone === forest && started) updatePlates(realDt);

  // Uitgangen naar andere zones
  exitCooldown -= realDt;
  if (started && !transition && !fainting && exitCooldown <= 0) {
    for (const ex of zone.exits) {
      if (Math.hypot(player.pos.x - ex.x, player.pos.z - ex.z) > ex.r) continue;
      if (ex.open()) goTo(ex.to, ex.spawn());
      else { ui.toast(ex.closedMsg, 2500); exitCooldown = 3; }
      break;
    }
  }

  fx.update(realDt);

  // Baas: levensbalk en spannende muziek in de koningszaal
  if (zone === cave) {
    const fight = king && !king.dead && cave.inThroneRoom(player.pos);
    ui.setBoss('👑 Koning Slijm', fight ? king.hp / king.maxHp : null);
    playMusic(fight ? 'baas' : 'grot');
  } else ui.setBoss('', null);

  // Knoppen en hartjes
  const near = !paused && nearestTalkable();
  if (ui.dialogOpen) ui.setActionBtn('Verder', true, false);
  else if (near) ui.setActionBtn(near.sign ? 'Lees' : 'Praat', true, true);
  else if (state.sword) ui.setActionBtn('⚔️', true, false);
  else ui.setActionBtn('Praat', false, false);
  const max = maxClones(state.quest);
  ui.setCloneBtn(started && !paused && reached(state.quest, 'aan') && nearMachine(), state.clones >= max ? 'Vol!' : 'Clone!');
  ui.setStats(reached(state.quest, 'zwaard') || state.crystals > 0, hearts, state.maxHearts, state.crystals);

  // Camera volgt de speler soepel
  // (tijdens een gesprek schuift de camera opzij, zodat je de ander goed ziet)
  if (!started) {
    // Startscherm: de camera draait langzaam rond
    const a = t * 0.12;
    camTarget.set(player.pos.x + Math.sin(a) * 16, 8, player.pos.z + Math.cos(a) * 16);
    lookGoal.copy(player.pos);
  } else if (ui.dialogOpen && talkPartner) {
    lookGoal.copy(player.pos).add(talkPartner.pos).multiplyScalar(0.5);
    camTarget.copy(lookGoal).add(TALK_CAM_OFFSET);
  } else {
    lookGoal.copy(player.pos);
    camTarget.copy(player.pos).add(CAM_OFFSET);
  }
  camera.position.lerp(camTarget, Math.min(1, realDt * (started ? 4 : 1.5)));
  lookAt.lerp(lookGoal, Math.min(1, realDt * 6));
  camera.lookAt(lookAt.x, lookAt.y + 1, lookAt.z);
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;
    shake = Math.max(0, shake - realDt * 2.5);
  }
  if (debugCam) { camera.position.set(...debugCam.pos); camera.lookAt(...debugCam.look); }
  sky.position.copy(camera.position);

  // Zon (en schaduw) en lantaarn volgen de speler
  sun.position.set(player.pos.x + 12, 25, player.pos.z + 8);
  sun.target.position.copy(player.pos);
  lantern.position.set(player.pos.x, 5, player.pos.z + 3);

  // Bomen tussen de camera en de speler worden doorzichtig
  for (const f of zone.fadeables || []) {
    const block = f.z > player.pos.z + 0.5 && f.z < camera.position.z && Math.abs(f.x - player.pos.x) < 2.4 + f.r;
    f.k += ((block ? 0.25 : 1) - f.k) * Math.min(1, realDt * 8);
    for (const m of f.mats) m.opacity = f.k;
  }

  // Elke paar seconden automatisch opslaan
  saveTimer += realDt;
  if (dirty && saveTimer > 1.5 && !transition) { saveTimer = 0; save(); }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// Onthoud met wie je praat (voor de camera)
const showDialog = ui.showDialog.bind(ui);
ui.showDialog = (name, lines, onDone, voice) => {
  talkPartner = game.zone.talkables.find((x) => x.name === name) || null;
  showDialog(name, lines, onDone, voice);
};

// ---------- Starten ----------
setSoundOn(state.sound);
setMusicOn(state.music);
ui.setToggles(state.sound, state.music);
world.gate.setOpen(reached(state.quest, 'zwaard'), true);
forest.setDoorOpen(reached(state.quest, 'grot'), true);
squad.restore(state.clones, player);
setZone(state.zone, state.player);
camera.position.set(player.pos.x + 16, 8, player.pos.z);
requestAnimationFrame(frame);
ui.showStart(hadSave, () => {
  started = true;
  ui.zoneTitle(game.zone.name);
});

// Opslaan als de app wordt weggezet
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// Handig om te testen (in de console): window.clones
window.clones = {
  state, player, npc: bolt, bolt, koopman, oma, hond, talk: action, save, scene, camera, gears, renderer, squad, makeClone, world,
  forest, cave, zones, game, goTo, setZone, openShop, openMap, openBackpack, pickups,
  get enemies() { return enemies; }, get hearts() { return hearts; }, set hearts(v) { hearts = v; },
  get started() { return started; }, start: () => { if (!started) document.getElementById('start').dispatchEvent(new PointerEvent('pointerup')); },
  setDebugCam: (pos, look) => { debugCam = pos ? { pos, look } : null; },
};

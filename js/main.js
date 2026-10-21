// C.L.O.N.E.S - hier start het spel en draait de spel-lus.
import * as THREE from 'three';
import { createWorld, makeGear } from './world.js';
import { createForest } from './forest.js';
import { createCave } from './cave.js';
import { createCity } from './city.js';
import { createDesert } from './desert.js';
import { createPyramid } from './pyramid.js';
import { Scorpion } from './scorpion.js';
import { buildTreasureMap } from './treasure.js';
import { createJobs } from './jobs.js';
import { isPrivateCode, PRIVATE_REWARD } from './secret.js';
import { fmt } from './format.js';
import { buildCityShop, itemInfo, SHIRTS, DEFAULT_SHIRT, TOYS, CANDIES, BOOKS } from './cityshop.js';
import { makeSignpost } from './props.js';
import { Robot } from './robot.js';
import { buildCarShop, CARS } from './autowinkel.js';
import { MyCar } from './drive.js';
import { Player } from './player.js';
import { makeBolt, makeKoopman, makeOma, Dog } from './npc.js';
import { Controls } from './controls.js';
import { loadSave, writeSave, SAVE_KEY, SECRET_CODES } from './save.js';
import { ui } from './ui.js';
import { GEARS_NEEDED, TEAM_SIZE, reached, maxClones, questText, boltHasNews, linesFor, isCityDone, SUN_STONE_IDS, MAP_PIECES_TOTAL,
  JOBS, jobInfo, nextJob, bertHasNews } from './quest.js';
import { CloneSquad } from './clones.js';
import { Effects } from './effects.js';
import { Slime, SLIME_COLORS } from './enemies.js';
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
const city = addZone(createCity); // De Stad (idee van Joshua)
const cityJobs = createJobs(city); // de klusjes van Burgemeester Bert (idee van Dex)
const desert = addZone(createDesert); // De Grote Woestijn (hoofdstuk 3, idee van Dex)
const pyramid = addZone(createPyramid); // binnen in de Grote Piramide

// Dorpelingen
const bolt = makeBolt(world.group, world.npcSpot);
const koopman = makeKoopman(world.group, world.spots.koopman);
const oma = makeOma(world.group, world.spots.oma);
const hond = new Dog(world.group, world.spots.hond);
world.colliders.push({ x: world.npcSpot.x, z: world.npcSpot.z, r: 0.5 }, { x: koopman.pos.x, z: koopman.pos.z, r: 0.45 });
world.npcs = [bolt, koopman, oma, hond];
world.talkables = [...world.npcs, makeSignpost(world.group, {
  id: 'bord-stad', x: 10.6, z: -1.6, rot: -0.25, title: 'DE STAD →', color: '#e76f51',
  lines: ['NAAR DE STAD', 'Loop rechtdoor naar de regenboogpoort.', 'In De Stad: een speelgoedwinkel, een snoepwinkel, een kledingwinkel en een boekwinkel!'],
})];

// Op de kaart
world.mapItems = [{ x: 5, z: 10, r: 4.2, color: '#4fb3e8' }, { x: 0, z: 0, r: 1.3, color: '#9aa0a6' }];
world.labels = [
  { x: -4.6, z: -14.5, text: 'Clonemachine' }, { x: 0, z: -21, text: 'Poort' },
  { x: 7, z: 0.2, text: 'Kraam' }, { x: 5, z: 10, text: 'Vijver' }, { x: 20.5, z: 0, text: 'De Stad' },
  { x: -20, z: 0, text: 'Woestijn', show: () => world.desertVisible() },
];
forest.labels = [{ x: 0, z: -20, text: 'Grotdeur' }, { x: 0, z: 21, text: 'Naar het dorp' }];
cave.labels = [{ x: 0, z: 15, text: 'Ingang' }, { x: 0, z: -15, text: 'Koningszaal' }];

// Uitgangen: waar kom je in een andere zone?
world.exits = [{
  x: 0, z: -22.4, r: 1.6, to: 'bos', spawn: () => forest.spawns.fromDorp,
  open: () => reached(state.quest, 'zwaard'), closedMsg: 'De poort is op slot. Misschien weet Professor Bolt meer...',
}, {
  x: 22.4, z: 0, r: 1.6, to: 'stad', spawn: () => city.spawns.fromDorp, open: () => true, // De Stad is altijd open
}];
// De woestijnpoort (westkant): eerst moet hij verschijnen (De Stad uitgespeeld), dan moet hoofdstuk 2 klaar zijn
const desertVisible = () => isCityDone(state) || reached(state.quest, 'woestijn');
world.exits.push({
  x: -22.4, z: 0, r: 1.6, to: 'woestijn', spawn: () => desert.spawns.fromDorp, active: desertVisible,
  open: () => reached(state.quest, 'woestijn'),
  get closedMsg() { return reached(state.quest, 'held') ? 'De poort is op slot. Praat eerst met Professor Bolt!' : 'De woestijnpoort is op slot. Versla eerst Koning Slijm in het Slijmbos!'; },
});
desert.exits = [
  { x: desert.exit.x, z: desert.exit.z, r: 1.4, to: 'dorp', spawn: () => world.spots.uitWoestijn, open: () => true },
  { x: desert.door.x, z: desert.door.z, r: 1.0, to: 'piramide', spawn: () => pyramid.spawns.fromWoestijn, open: () => desert.doorOpen, closedMsg: 'De deur zit dicht. Laat eerst de 3 zonnestenen schijnen!' },
];
pyramid.exits = [{ x: pyramid.exit.x, z: pyramid.exit.z, r: 1.0, to: 'woestijn', spawn: () => desert.spawns.fromPiramide, open: () => true }];
city.exits = [{ x: city.exit.x, z: city.exit.z, r: 1.4, to: 'dorp', spawn: () => world.spots.uitStad, open: () => true }];
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
const robot = new Robot(scene);
const myCar = new MyCar(city.group, city.colliders); // jouw eigen auto (alleen in De Stad)
let driving = false;
let driveToastCd = 0; // hoe lang tot we weer zeggen: met de auto kun je niet door de poort
const state = loadSave();
const hadSave = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();
let hearts = state.maxHearts;
let boost = 0; // hoe lang het Raketsnoep nog werkt (seconden)

// De autootjes in De Stad stoppen voor de speler, de clones en Robotje Bliep
city.getPeople = () => [player.pos, ...squad.list.map((c) => c.pos), ...(robot.g.visible ? [robot.pos] : []), ...(myCar.model && !driving ? [myCar.parkedA, myCar.parkedB] : [])];
let lastHonk = 0;
city.onHonk = () => {
  sfx.toet();
  const now = performance.now();
  if (now - lastHonk > 8000) { ui.toast('🚗 Toet toet! Even opzij, alsjeblieft!', 2000); lastHonk = now; }
};

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
let sjors = null; // Schorpioen Sjors, de baas van de piramide
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
    fx.poof({ x, z }, SLIME_COLORS[kind] || 0x5aa9e6);
  },
  onSlimeDefeated(s) {
    fx.poof(s.pos, s.color || SLIME_COLORS[s.kind] || 0x7bd389, s.king || s.boss ? 3 : 1);
    sfx.poof();
    pickups.spawn('kristal', s.pos.x, s.pos.z, s.loot + Math.floor(Math.random() * 2));
    if (hearts < state.maxHearts && Math.random() < 0.3) pickups.spawn('hart', s.pos.x, s.pos.z);
    if (s.king) {
      state.quest.kingBeaten = true; // onthouden, ook als de iPad de pagina opnieuw laadt
      game.showLanding(0, 0, 0);
      hitStop = 0.35;
      shake = 1;
      fx.confetti(s.pos, 90);
      sfx.fanfare();
      ui.toast('👑 Koning Slijm is verslagen! 👑', 3500);
      pickups.spawn('batterij', s.pos.x, s.pos.z);
      for (const e of enemies) if (!e.dead) e.hurt(99, s.pos.x, s.pos.z, game);
      save();
    }
    if (s.boss) {
      state.quest.bossBeaten = true; // onthouden tot je het kaartstuk hebt gepakt
      game.showLanding(0, 0, 0);
      hitStop = 0.35;
      shake = 1;
      fx.confetti(s.pos, 90);
      sfx.fanfare();
      ui.toast('🦂 Schorpioen Sjors is verslagen! Hij liet iets vallen...', 3500);
      pickups.spawn('kaartstuk', s.pos.x, s.pos.z);
      for (const e of enemies) if (!e.dead && e !== s) e.hurt(99, s.pos.x, s.pos.z, game);
      save();
    }
  },
  slam(x, z, r, color = 0x4cc96f) {
    fx.ring({ x, z }, r, color === 0x4cc96f ? 0x9bf6ff : 0xffe8a3, 0.55);
    fx.ring({ x, z }, r * 0.6, 0xffffff, 0.4);
    fx.poof({ x, z }, color, 1.5);
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
    if (state.quest.kingBeaten) pickups.spawn('batterij', zone.king.x, zone.king.z);
    else { king = new Slime(zone.group, zone.king.x, zone.king.z, 'koning'); enemies.push(king); }
  }
  sjors = null;
  if (zone.id === 'piramide' && state.quest.state === 'piramide') {
    if (state.quest.bossBeaten) pickups.spawn('kaartstuk', zone.boss.x, zone.boss.z);
    else { sjors = new Scorpion(zone.group, zone.boss.x, zone.boss.z); enemies.push(sjors); }
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

// ---------- Zandstorm in de woestijn: mist, zandkorrels en wind ----------
const stormColor = new THREE.Color();
let stormWas = false;
desert.focus = player.pos; // de zandkorrels waaien rond de speler
function updateStorm(dt, paused) {
  const st = desert.storm, k = st.k, env = desert.env, sf = desert.stormFog;
  stormColor.set(sf[0]);
  scene.fog.color.set(env.fog[0]).lerp(stormColor, k);
  scene.fog.near = env.fog[1] + (sf[1] - env.fog[1]) * k;
  scene.fog.far = env.fog[2] + (sf[2] - env.fog[2]) * k;
  sky.material.uniforms.top.value.set(env.sky[0]).lerp(stormColor, k * 0.95);
  sky.material.uniforms.bottom.value.set(env.sky[1]).lerp(stormColor, k);
  sun.intensity = env.sun[1] * (1 - 0.45 * k);
  // de wind duwt je een beetje opzij (geen pijn!)
  if (!paused && !transition && !fainting && started && k > 0.3) {
    player.pos.x += st.wind.x * 2.2 * k * dt;
    player.pos.z += st.wind.z * 2.2 * k * dt;
    player.resolveCollisions(desert);
  }
  if (st.active !== stormWas) {
    stormWas = st.active;
    if (started) ui.toast(st.active ? '🌪️ ZANDSTORM! Hou je vast, de wind duwt je opzij!' : '☀️ De zandstorm is voorbij.', 3000);
  }
}

let exitCooldown = 0;
function setZone(id, spawn) {
  const old = game.zone;
  if (old) {
    old.group.visible = false;
    for (const e of enemies) e.remove();
  }
  pickups.clear();
  cityJobs.resetLap(); // een half rondje telt niet meer als je weggaat
  landing.visible = false;
  const zone = zones[id];
  game.zone = zone;
  if (id === 'woestijn') { desert.storm.k = 0; desert.stopStorm(20 + Math.random() * 10); stormWas = false; } // eerst even rustig
  state.zone = id;
  zone.group.visible = true;
  applyEnv(zone.env);
  lantern.visible = id === 'grot' || id === 'piramide';
  player.setPosition(spawn.x, spawn.z, spawn.rot ?? player.rot);
  player.resolveCollisions(zone);
  squad.regroup(player);
  robot.snap(player);
  if (id === 'stad' && state.car && myCar.id !== state.car) myCar.place(state.car, city.showroom.pickup);
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
const shirtColor = () => (state.shirt ? SHIRTS[state.shirt].color : DEFAULT_SHIRT.color);
function applyGear() {
  if (player.swordLevel !== state.sword) player.setSword(state.sword);
  if (player.hatId !== state.hat) { player.setHat(state.hat); player.hatId = state.hat; }
  const shirt = shirtColor();
  if (player.shirtColor !== shirt) { player.setShirt(shirt); player.shirtColor = shirt; }
  if (squad.swordLevel !== state.sword || squad.hat !== state.hat || squad.shirt !== shirt) squad.setGear(state.sword, state.hat, shirt);
  robot.show(state.toys.includes('robot'));
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
  updateDesertGate();
  world.desertGate.setOpen(reached(q, 'woestijn'));
  desert.setDoorOpen(reached(q, 'piramide'));
  for (const st of desert.stones) {
    const lit = reached(q, 'piramide') || (q.stones || []).includes(st.id);
    if (st.lit !== lit) desert.setStoneLit(st, lit);
  }
  const ghost = document.getElementById('ghost-btn');
  ghost.classList.toggle('hidden', !(reached(q, 'aan') && state.clones > 0));
  ghost.querySelector('.ico').textContent = state.clonesHidden ? '🧬' : '👻';
  ghost.querySelector('.lbl').textContent = state.clonesHidden ? 'Clones terug' : 'Clones weg';
  ghost.setAttribute('aria-label', state.clonesHidden ? 'Clones terug' : 'Clones weg');
  ghost.title = state.clonesHidden ? 'Clones terug (H)' : 'Clones weg (H)';
  ghost.classList.toggle('off', !!state.clonesHidden);
  forest.setDoorOpen(reached(q, 'grot'));
  bolt.showMarker(boltHasNews(state));
  koopman.showMarker(reached(q, 'zwaard') && state.crystals >= 5 && state.hats.length === 0);
  city.mayor.showMarker(bertHasNews(state));
  cityJobs.sync(state, player);
  city.showroom.setOwned(state.cars);
  applyGear();
  const batteryHere = pickups.list.some((p) => p.type === 'batterij');
  const pieceHere = pickups.list.some((p) => p.type === 'kaartstuk');
  ui.setQuest(batteryHere ? '🔋 Pak de <b>Superbatterij</b>!' : pieceHere ? '📜 Pak het stukje <b>schatkaart</b>!' : questText(state, game.zone.id));
}

// ---------- De woestijnpoort verschijnt (als De Stad uitgespeeld is) ----------
let desertGateShown = false, desertAppearPending = false, portalToastAt = 0;
function updateDesertGate() {
  const vis = desertVisible();
  if (vis === desertGateShown) return;
  desertGateShown = vis;
  world.setDesertVisible(vis, false);
  if (vis && started) {
    desertAppearPending = true; // de glitters zie je als je in het dorp bent
    // (net een klusje klaar? dan komt deze melding daarna)
    setTimeout(() => { ui.toast('✨ Er is een nieuwe poort verschenen! Kijk aan de westkant van het dorp.', 4500); sfx.tada(); }, Math.max(0, portalToastAt - performance.now()));
  }
}
function desertAppear() {
  desertAppearPending = false;
  world.setDesertVisible(true, true);
  const at = { x: -22, y: 2, z: 0 };
  fx.sparkle(at, [0xffd23f, 0xffffff, 0xff8c42], 50, 6);
  setTimeout(() => fx.sparkle(at, [0xffd23f, 0x7af7ff, 0xffffff], 40, 5), 500);
  fx.confetti({ x: -21, z: 0 }, 50);
  sfx.powerUp();
  ui.toast('✨ Er is een nieuwe poort verschenen: naar DE GROTE WOESTIJN!', 4000);
}

let dirty = false;
function save() {
  state.player = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), rot: +player.rot.toFixed(2) };
  writeSave(state);
  dirty = false;
}

// ---------- Praten ----------
let talkPartner = null; // met wie je praat (voor de camera)
const SIGN_DISTANCE = 1.8; // een bord lees je alleen als je er vlak voor staat

function nearestTalkable() {
  let best = null, bestD = Infinity;
  for (const t of game.zone.talkables) {
    const d = t.distanceTo(player.pos);
    if (d < (t.sign ? SIGN_DISTANCE : TALK_DISTANCE) && d < bestD) { bestD = d; best = t; }
  }
  return best;
}

// Is er een slijmpje in de buurt? Dan gaat het zwaard voor.
const enemyNear = () => enemies.some((e) => !e.dead && Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < 5 + e.r);

function talkTo(t) {
  const q = state.quest;
  const wasAllFound = q.state === 'bezig' && q.gears.length >= GEARS_NEEDED;
  const before = q.state;
  const lines = t.lines || linesFor(t.id, state);
  const newJob = t.id === 'burgemeester' && state.cityGift ? nextJob(state) : null; // Bert geeft je een nieuw klusje
  talkPartner = t;
  ui.showDialog(t.name, lines, () => {
    if (t.id === 'bolt') afterBolt(before, wasAllFound);
    if (t.id === 'koopman') openShop();
    if (t.shop) openCityShop(t);
    if (t.id === 'dealer') openCarShop();
    if (t.id === 'burgemeester' && !state.cityGift) {
      state.cityGift = true;
      state.crystals += 10;
      fx.sparkle({ x: player.pos.x, y: 1.5, z: player.pos.z }, [0x7af7ff, 0xffffff], 30, 4);
      sfx.tada();
      ui.toast('🎁 Je kreeg 10 kristallen 💎 van Burgemeester Bert!', 3000);
    }
    if (newJob) startJob(newJob);
    refresh();
    save();
  }, t.voice);
}

// ---------- De klusjes van Burgemeester Bert ----------
function startJob(id) {
  state.jobs.active = id;
  state.jobs.step = 0;
  sfx.ding();
  const n = state.jobs.done.length + 1;
  ui.toast(`📋 Nieuw klusje! ${jobInfo(id).icon} ${jobInfo(id).name} (klusje ${n} van ${JOBS.length})`, 3200);
  setTimeout(() => { if (!ui.panelOpen && !ui.dialogOpen && started) openJobs(); }, 700);
}
const JOB_GOT = {
  eend: '🦆 Kwak! Eendje Ed loopt achter je aan. Breng hem naar de vijver!',
  pakje: '📦 Je hebt het pakje! Breng het naar Toby Tol (speelgoedwinkel).',
  bril: '👓 Gevonden: de bril van Opa Duif! Breng hem naar Opa op het plein.',
};
const JOB_DONE = {
  eend: '🦆 Kwak kwak! Eendje Ed zwemt weer in de vijver.',
  pakje: '📦 Toby Tol: "Joepie, nieuwe jojo\'s!"',
  bril: '👓 Opa Duif: "Hoera, ik zie weer alles!"',
  rondje: '🏁 Wat een coureur!',
};
function jobStep(id) {
  if (state.jobs.active !== id || state.jobs.step === 1) return;
  state.jobs.step = 1;
  sfx.ding();
  fx.sparkle({ x: player.pos.x, y: 1.5, z: player.pos.z }, [0xffd23f, 0xffffff], 20, 3);
  ui.toast(JOB_GOT[id], 3200);
  refresh();
  save();
}
function finishJob(id, lapTime = 0) {
  const j = state.jobs;
  if (j.active !== id) return;
  j.done.push(id); j.active = null; j.step = 0;
  const info = jobInfo(id), n = j.done.length, all = n >= JOBS.length;
  state.crystals += info.reward;
  fx.confetti(player.pos, 70);
  fx.sparkle({ x: player.pos.x, y: 1.5, z: player.pos.z }, [0x7af7ff, 0xffffff], 30, 4);
  sfx.tada();
  const extra = id === 'rondje' ? `🏁 Rondje in ${Math.round(lapTime)} seconden!` : JOB_DONE[id];
  ui.toast(`${extra} Klusje ${n} van ${JOBS.length} klaar! +${info.reward} 💎${all ? '' : ' Ga terug naar Burgemeester Bert.'}`, 3800);
  if (all) {
    portalToastAt = performance.now() + 8000;
    setTimeout(() => { ui.toast('🏆 Alle klusjes van Bert klaar! De Stad is uitgespeeld!', 4000); sfx.fanfare(); fx.confetti(player.pos, 120); }, 4000);
  }
  refresh();
  save();
}
let lastHud = null;
const jobCtx = () => ({
  who: driving ? myCar.pos : player.pos, driving,
  back: driving ? myCar.dir : { x: Math.sin(player.rot), z: Math.cos(player.rot) },
  toby: city.keepers[0].pos, opa: city.npcs.find((n) => n.id === 'opa').pos,
  onStep: jobStep, onDone: finishJob,
  toast: (txt, ms = 2600) => ui.toast(txt, ms),
  gate: (n) => { sfx.ding(); ui.toast(n < 3 ? `✅ Poortje! (${n}/3)` : '✅ Alle 3 de poortjes! Snel terug naar de START!', 2000); },
  start: () => sfx.whoosh(),
  fail: () => sfx.nope(),
});
// Het lijstje met klusjes (uit de rugzak, of meteen als Bert je een klusje geeft)
function openJobs() {
  if (ui.dialogOpen || ui.panelOpen || !started) return;
  ui.openPanel('📋 Klusjes van Burgemeester Bert', (body) => {
    const j = state.jobs, n = j.done.length;
    const top = document.createElement('p');
    top.className = 'jobs-progress';
    top.id = 'jobs-progress';
    top.innerHTML = n >= JOBS.length ? '🏆 <b>Alle klusjes klaar!</b> De Stad is uitgespeeld.'
      : j.active ? `Bezig met <b>klusje ${n + 1} van ${JOBS.length}</b>` : `<b>${n} van ${JOBS.length}</b> klaar. Praat met Burgemeester Bert voor het volgende klusje!`;
    body.appendChild(top);
    const list = document.createElement('div');
    list.className = 'jobs-list';
    list.id = 'jobs-list';
    JOBS.forEach((job, i) => {
      const done = j.done.includes(job.id), now = j.active === job.id, open = done || now;
      const row = document.createElement('div');
      row.className = 'job-row' + (done ? ' done' : now ? ' now' : ' locked');
      row.innerHTML = `<div class="job-ico">${done ? '✅' : open ? job.icon : '🔒'}</div>`
        + `<div class="job-txt"><div class="job-name">${i + 1}. ${open ? job.name : 'Nog geheim...'}</div>`
        + `<div class="job-info">${open ? job.info : 'Eerst het klusje hiervoor doen!'}</div></div>`
        + `<div class="job-prize">${done ? 'Klaar!' : `+${job.reward} 💎`}</div>`;
      list.appendChild(row);
    });
    body.appendChild(list);
  });
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
  } else if (before === 'held' && isCityDone(state)) {
    q.state = 'woestijn';
    q.stones = [];
    sfx.powerUp();
    ui.toast('🏜️ De woestijnpoort is open! (westkant van het dorp)', 4000);
  } else if (before === 'kaart') {
    q.state = 'schat';
    fx.confetti(bolt.pos, 120);
    sfx.fanfare();
    ui.toast('🏆 Hoofdstuk 3 uitgespeeld! Schatkaart: 1 van 4. Wordt vervolgd!', 4500);
  }
}

// Actieknop: praten als er iemand is, anders zwaaien met je zwaard
function action() {
  if (ui.panelOpen || transition || fainting || !started) return;
  if (ui.dialogOpen) { ui.nextLine(); return; }
  if (driving) { exitCar(); return; }
  const t = state.sword && enemyNear() ? null : nearestTalkable();
  if (nearMyCar() && (!t || myCar.distanceTo(player.pos) < t.distanceTo(player.pos))) { enterCar(); return; }
  if (t) { talkTo(t); return; }
  if (state.sword && player.swing()) {
    sfx.swing();
    fx.swoosh(player.pos, player.rot, state.sword > 1);
  }
}

// Raakt het zwaard een zonnesteen? (in de woestijn)
function hitStones(pos, rot) {
  const q = state.quest;
  if (game.zone !== desert || q.state !== 'woestijn') return;
  for (const st of desert.stones) {
    if (st.lit) continue;
    const dx = st.x - pos.x, dz = st.z - pos.z, d = Math.hypot(dx, dz);
    if (d > SWORD_REACH + 1.0) continue;
    let diff = Math.atan2(dx, dz) - rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > 1.3 && d > 1.8) continue;
    q.stones = [...new Set([...(q.stones || []), st.id])];
    desert.setStoneLit(st, true);
    fx.sparkle({ x: st.x, y: 5, z: st.z }, [0xffd23f, 0xffffff, 0xff8c42], 40, 6);
    sfx.ding();
    const n = q.stones.length;
    if (n >= SUN_STONE_IDS.length) {
      q.state = 'piramide';
      desert.setDoorOpen(true);
      sfx.rumble();
      shake = 1;
      fx.confetti({ x: st.x, z: st.z }, 60);
      ui.toast('☀️ Alle 3 de zonnestenen schijnen! De deur van de Grote Piramide gaat open!', 4500);
    } else {
      ui.toast(`☀️ Zonnesteen ${n} van 3 schijnt! Zie je de gouden lichtstraal?`, 3500);
    }
    refresh();
    save();
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
  if (state.clonesHidden) { state.clonesHidden = false; squad.setHidden(false, player); } // nieuwe clone? dan komen de anderen ook terug
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

// De winkels in De Stad: betalen met dezelfde kristallen als bij Koopman Kees
function openCityShop(keeper) {
  const build = (body) => buildCityShop(body, keeper.shop, state, (item) => {
    if (state.crystals < item.price) return; // (kan niet, maar voor de zekerheid)
    const d = itemInfo(item);
    state.crystals -= item.price;
    if (item.kind === 'toy') state.toys.push(item.id);
    if (item.kind === 'shirt') { state.shirts.push(item.id); state.shirt = item.id; }
    if (item.kind === 'book') state.books.push(item.id);
    if (item.kind === 'candy') state.candy[item.id] = (state.candy[item.id] || 0) + 1;
    sfx.buy();
    if (item.kind === 'toy' && item.id === 'robot') setTimeout(() => robot.hop(), 400);
    const where = item.kind === 'shirt' ? 'Je hebt hem meteen aan!' : 'Hij zit in je rugzak 🎒';
    ui.toast(`${d.icon} ${d.name} ${item.price ? 'gekocht' : 'gekregen'}! ${where}`, 2600);
    refresh();
    save();
    ui.refreshPanel(build);
  }, (item) => {
    const d = itemInfo(item);
    const short = item.price - state.crystals;
    sfx.nope();
    ui.toast(`Oei, je hebt nog net niet genoeg kristallen voor ${d.name}. Nog ${short} 💎 nodig!`, 3000);
  });
  ui.openPanel(CITY_TITLES[keeper.shop], build);
}
const CITY_TITLES = { speelgoed: 'Speelgoedwinkel', snoep: 'Snoepwinkel', kleding: 'Kledingwinkel', boek: 'Boekwinkel' };

// ---------- De Autowinkel en zelf rijden ----------
const CAR_ENTER_DISTANCE = 2.6;
const nearMyCar = () => game.zone === city && !driving && myCar.distanceTo(player.pos) < CAR_ENTER_DISTANCE;
const SEAT_Y = { mini: 0.22, jeep: 0.5, sport: 0.12, race: 0.08 };

function openCarShop() {
  const build = (body) => buildCarShop(body, state, {
    onBuy(id) {
      const c = CARS[id];
      if (state.crystals < c.price || state.cars.includes(id)) return;
      state.crystals -= c.price;
      state.cars.push(id);
      state.car = id;
      myCar.place(id, city.showroom.pickup);
      city.showroom.setOwned(state.cars);
      sfx.buy();
      setTimeout(() => sfx.toet(), 300);
      fx.confetti({ x: myCar.pos.x, y: 1, z: myCar.pos.z }, 60);
      ui.toast(`${c.icon} De ${c.name} is van jou! Hij staat klaar bij de garagedeur.`, 3500);
      refresh();
      save();
      ui.refreshPanel(build);
    },
    onPick(id) {
      state.car = id;
      myCar.place(id, city.showroom.pickup);
      sfx.click();
      ui.toast(`${CARS[id].icon} De ${CARS[id].name} staat klaar bij de garagedeur!`, 2500);
      save();
      ui.refreshPanel(build);
    },
    onTooPoor(id) {
      const c = CARS[id];
      sfx.nope();
      ui.toast(`Oei, je hebt nog net niet genoeg kristallen voor ${c.name}. Nog ${fmt(c.price - state.crystals)} 💎 nodig!`, 3000);
    },
  });
  ui.openPanel('Autowinkel', build);
}

function enterCar() {
  driving = true;
  myCar.setDriving(true);
  player.legsSit = true;
  sfx.toet();
  ui.toast('🚗 Rijden maar! Druk nog eens op de knop om uit te stappen.', 2500);
}

function exitCar() {
  // Stap uit aan de zijkant (links of rechts, of achter de auto als het daar niet past)
  const d = myCar.dir;
  const tries = [[-d.z, d.x, 1.6], [d.z, -d.x, 1.6], [-d.x, -d.z, 2.0], [d.x, d.z, 2.0]];
  let spot = null;
  for (const [nx, nz, k] of tries) {
    const p = { x: myCar.pos.x + nx * k, z: myCar.pos.z + nz * k };
    const q = { ...p };
    player.pos.set(q.x, 0, q.z);
    player.resolveCollisions(game.zone);
    if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 0.3) { spot = p; break; }
  }
  if (!spot) { player.pos.set(myCar.pos.x, 0, myCar.pos.z); player.resolveCollisions(game.zone); }
  player.pos.y = 0;
  driving = false;
  myCar.setDriving(false);
  player.resolveCollisions(game.zone);
  player.ch.legs.forEach((l) => { l.rotation.x = 0; });
  // Geparkeerd voor de poort? Dan zet Vera hem netjes terug, zodat je er lopend door kunt
  if (game.zone.exits.some((ex) => Math.hypot(ex.x - myCar.pos.x, ex.z - myCar.pos.z) < 5)) {
    myCar.place(myCar.id, city.showroom.pickup);
    ui.toast('🚗 Vera Vroem zet je auto weer netjes bij de Autowinkel.', 2600);
  }
  sfx.click();
  save();
}

// Snoep eten, met speelgoed spelen en boeken lezen (vanuit de rugzak)
const cityActions = {
  onShirt(id) { state.shirt = id; sfx.click(); refresh(); save(); },
  onCandy(id) {
    if (!(state.candy[id] > 0)) return;
    state.candy[id]--;
    sfx.slurp();
    if (id === 'raket') { boost = 20; ui.toast('🚀 Zoef! 20 seconden supersnel!', 2500); }
    if (id === 'lolly') { hearts = state.maxHearts; sfx.heal(); ui.toast('🍭 Mmm! Al je hartjes zijn weer vol.', 2500); }
    if (id === 'knal') { fx.confetti(player.pos, 70); sfx.tada(); ui.toast('🎉 PATS! Confetti!', 2000); }
    save();
  },
  onToy(id) {
    ui.closePanel();
    if (id === 'robot') robot.hop();
    if (id === 'jojo' || id === 'bal') fx.sparkle({ x: player.pos.x, y: 1.6, z: player.pos.z }, [0xffd23f, 0xffffff], 14, 3);
    if (id === 'beer') fx.sparkle({ x: player.pos.x, y: 1.8, z: player.pos.z }, [0xff8fab, 0xffffff], 18, 2);
    sfx.ding();
    ui.toast(`${TOYS[id].icon} ${TOYS[id].fun}`, 2800);
  },
  onBook(id) {
    ui.closePanel();
    talkPartner = null;
    ui.showDialog(`${BOOKS[id].icon} ${BOOKS[id].name}`, BOOKS[id].lines, null, 1.0);
  },
};

function openBackpack() {
  if (ui.dialogOpen || ui.panelOpen || !started) return;
  const build = (body) => buildBackpack(body, state, hearts, (id) => {
    state.hat = id;
    sfx.click();
    refresh();
    save();
    ui.refreshPanel(build);
  }, {
    ...cityActions,
    onShirt(id) { cityActions.onShirt(id); ui.refreshPanel(build); },
    onCandy(id) { cityActions.onCandy(id); ui.refreshPanel(build); },
    onMap() { ui.closePanel(); openTreasure(); },
    onJobs() { ui.closePanel(); openJobs(); },
  });
  ui.openPanel('Rugzak', build);
}

// Waar moet je heen? (de ster op de kaart)
function questTarget() {
  const q = state.quest, z = game.zone.id;
  if (z === 'stad') {
    if (!state.cityGift) return city.mayor.pos;
    return cityJobs.target(state, jobCtx()) || (nextJob(state) ? city.mayor.pos : null);
  }
  const toDesertGate = { x: -22, z: 0 };
  if (q.state === 'woestijn') {
    if (z === 'dorp') return toDesertGate;
    if (z === 'woestijn') {
      let best = null, bd = Infinity;
      for (const st of desert.stones) {
        const d = Math.hypot(st.x - player.pos.x, st.z - player.pos.z);
        if (!st.lit && d < bd) { bd = d; best = st; }
      }
      return best;
    }
    return null;
  }
  if (q.state === 'piramide') return z === 'dorp' ? toDesertGate : z === 'woestijn' ? desert.door : z === 'piramide' ? pyramid.boss : null;
  if (q.state === 'kaart' || (q.state === 'held' && isCityDone(state))) {
    return z === 'dorp' ? bolt.pos : z === 'woestijn' ? desert.exit : z === 'piramide' ? pyramid.exit : z === 'bos' ? { x: 0, z: 22 } : z === 'grot' ? cave.exit : null;
  }
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

// De schatkaart bekijken (uit de rugzak, of meteen als je een stukje vindt)
function openTreasure() {
  if (ui.dialogOpen || ui.panelOpen || !started) return;
  ui.openPanel('📜 De schatkaart', (body) => buildTreasureMap(body, state));
}

// ---------- Geheime code (verstopt: tik 5 keer snel op je kristallen) ----------
async function useCode(raw) {
  const code = String(raw || '').toUpperCase().replace(/\s+/g, '');
  // Dex zijn eigen code: elke keer +1.000 (de code zelf staat nergens, alleen een hash; zie secret.js)
  if (!SECRET_CODES.includes(code) && await isPrivateCode(code)) {
    state.crystals += PRIVATE_REWARD;
    sfx.tada();
    fx.sparkle({ x: player.pos.x, y: 1.5, z: player.pos.z }, [0x7af7ff, 0xffffff, 0xffd23f], 60, 5);
    ui.toast(`💎 +${fmt(PRIVATE_REWARD)} kristallen!`, 3000);
    refresh();
    save();
    return { ok: true, msg: `🎉 Gelukt! +${fmt(PRIVATE_REWARD)} kristallen 💎` };
  }
  if (!SECRET_CODES.includes(code)) { sfx.nope(); return { ok: false, msg: 'Die code klopt niet.' }; }
  if (state.codes.includes(code)) { sfx.nope(); return { ok: false, msg: 'Deze code heb je al gebruikt!' }; }
  state.codes.push(code);
  if (code === 'KRISTAL100') state.crystals += 100;
  sfx.tada();
  fx.sparkle({ x: player.pos.x, y: 1.5, z: player.pos.z }, [0x7af7ff, 0xffffff, 0xffd23f], 50, 5);
  ui.toast('💎 Geheime code! Je krijgt 100 kristallen!', 3500);
  refresh();
  save();
  return { ok: true, msg: '🎉 Gelukt! +100 kristallen 💎' };
}
function openCode() {
  if (ui.dialogOpen || ui.panelOpen || !started) return;
  ui.openPanel('🤫 Geheime code', (body) => {
    const p = document.createElement('p');
    p.className = 'panel-note';
    p.textContent = 'Weet jij een geheime code? Typ hem hier:';
    const row = document.createElement('div');
    row.className = 'code-row';
    const input = document.createElement('input');
    Object.assign(input, { id: 'code-input', type: 'text', maxLength: 20, autocomplete: 'off', spellcheck: false, placeholder: 'CODE' });
    input.setAttribute('autocapitalize', 'characters');
    const ok = document.createElement('button');
    ok.id = 'code-ok'; ok.type = 'button'; ok.textContent = 'OK';
    const msg = document.createElement('div');
    msg.id = 'code-msg'; msg.className = 'code-msg';
    const go = async () => { const r = await useCode(input.value); msg.textContent = r.msg; msg.style.color = r.ok ? '#2d6a4f' : '#c1121f'; if (r.ok) input.value = ''; };
    ok.addEventListener('pointerdown', (e) => { e.preventDefault(); go(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    row.append(input, ok);
    body.append(p, row, msg);
    setTimeout(() => input.focus(), 50);
  });
}
let crystalTaps = [];
document.getElementById('crystals').addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation();
  const now = performance.now();
  crystalTaps = crystalTaps.filter((t0) => now - t0 < 2500);
  crystalTaps.push(now);
  if (crystalTaps.length >= 5) { crystalTaps = []; openCode(); }
});

// ---------- Clones even weg (👻) en weer terug ----------
function toggleClones() {
  if (!started || ui.dialogOpen || ui.panelOpen || transition) return;
  if (!state.clones) return;
  state.clonesHidden = !state.clonesHidden;
  squad.setHidden(state.clonesHidden, player);
  if (state.clonesHidden) {
    fx.poof(player.pos, 0x7af7ff, 1.5);
    ui.toast('👻 Je clones zijn even weg. Druk nog eens om ze terug te halen!', 3000);
  } else {
    fx.sparkle({ x: player.pos.x, y: 1, z: player.pos.z }, [0x7af7ff, 0xffffff], 30, 4);
    ui.toast('🧬 Je clones zijn terug!', 2000);
  }
  sfx.click();
  refresh();
  save();
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
  if (!started || ui.panelOpen || transition || fainting) return;
  if (ui.dialogOpen) { ui.nextLine(); return; }
  if (driving) return; // tijdens het rijden: handen aan het stuur!
  const p = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  for (const t of game.zone.talkables) {
    if (raycaster.intersectObject(t.mesh, true).length) {
      if (t.distanceTo(player.pos) <= (t.sign ? SIGN_DISTANCE + 0.6 : TALK_DISTANCE)) talkTo(t);
      else ui.toast('Loop eerst wat dichterbij!');
      return;
    }
  }
  if (game.zone === world && reached(state.quest, 'aan') && raycaster.intersectObject(world.machine.group, true).length) makeClone();
  if (game.zone === city && myCar.model && !driving && raycaster.intersectObject(myCar.model.g, true).length) {
    if (nearMyCar()) enterCar(); else ui.toast('Loop eerst wat dichterbij!');
  }
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
    else if (k === 'h') toggleClones();
    else openBackpack();
  },
});

const tapBtn = (id, fn) => document.getElementById(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
tapBtn('sound-btn', toggleSound);
tapBtn('music-btn', toggleMusic);
tapBtn('bag-btn', openBackpack);
tapBtn('map-btn', openMap);
tapBtn('ghost-btn', toggleClones);
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
  // Raketsnoep: even supersnel
  if (boost > 0 && !paused) {
    boost = Math.max(0, boost - realDt);
    if (boost === 0) ui.toast('Het Raketsnoep is op. Weer gewoon lopen!');
  }
  player.speed = boost > 0 ? 9.5 : 6;
  const before = player.pos.clone();
  if (driving && zone === city) {
    const people = zone.npcs.map((n) => n.pos);
    if (myCar.update(dt, move, zone, people)) { sfx.bump(); shake = Math.max(shake, 0.2); }
    // De poort is een muurtje voor auto's: je stuitert zachtjes terug (en dan zegt het spel: stap eerst uit)
    for (const ex of zone.exits) {
      const dx = myCar.pos.x - ex.x, dz = myCar.pos.z - ex.z, d = Math.hypot(dx, dz) || 1e-3, min = ex.r + 1.3;
      if (d < min) {
        myCar.pos.x = ex.x + (dx / d) * min; myCar.pos.z = ex.z + (dz / d) * min;
        if (Math.abs(myCar.speed) > 1) { myCar.speed *= -0.25; sfx.bump(); }
        myCar.syncMesh();
      }
    }
    player.pos.set(myCar.pos.x - myCar.dir.x * 0.25, SEAT_Y[myCar.id] ?? 0.2, myCar.pos.z - myCar.dir.z * 0.25);
    player.rot = myCar.rot;
    player.mesh.rotation.y = myCar.rot;
    player.walkAmount = Math.abs(myCar.speed) > 0.4 ? 1 : 0; // clones: niet dansen tijdens het rijden
    player.speed = Math.max(6, Math.abs(myCar.speed) + 1);   // clones rennen je achterna
    player.ch.legs.forEach((l) => { l.rotation.x = -1.45; }); // zitten
    player.ch.arms.forEach((a) => { a.rotation.x = -0.9; });  // handen aan het stuur
  } else {
    if (driving) { driving = false; myCar.setDriving(false); player.pos.y = 0; }
    player.update(dt, move, zone);
  }
  if (before.distanceToSquared(player.pos) > 1e-6) dirty = true;
  if (player.swingHit) { swordHits(player.pos, player.rot, state.sword, false); hitStones(player.pos, player.rot); }

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
      delete state.quest.kingBeaten;
      sfx.fanfare();
      fx.confetti(player.pos);
      ui.toast('🔋 Je hebt de Superbatterij! Breng hem naar Professor Bolt!', 4000);
      save();
    }
    if (type === 'kaartstuk') {
      if (!state.mapPieces.includes('woestijn')) state.mapPieces.push('woestijn');
      state.quest.state = 'kaart';
      delete state.quest.bossBeaten;
      sfx.fanfare();
      fx.confetti(player.pos, 100);
      ui.toast(`📜 Een stukje van de schatkaart! (${state.mapPieces.length} van ${MAP_PIECES_TOTAL})`, 4000);
      save();
      setTimeout(() => { if (!ui.panelOpen && !ui.dialogOpen) openTreasure(); }, 1400);
    }
    refresh();
    dirty = true;
  });

  // Stofwolkje bij elke voetstap
  const step = Math.floor(player.phase / Math.PI);
  if (step !== lastStep && player.walkAmount > 0.6 && zone !== cave && !driving) fx.dust(player.pos);
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
  driveToastCd -= realDt;
  if (started && !transition && !fainting && exitCooldown <= 0) {
    for (const ex of zone.exits) {
      if (ex.active && !ex.active()) continue; // deze poort is er (nog) niet
      const who = driving ? myCar.pos : player.pos;
      if (Math.hypot(who.x - ex.x, who.z - ex.z) > ex.r + (driving ? 1.5 : 0)) continue;
      if (driving) { if (driveToastCd <= 0) { ui.toast('🚗 Met de auto kun je niet door de poort. Stap eerst uit!', 2500); driveToastCd = 3; } break; }
      if (ex.open()) goTo(ex.to, ex.spawn());
      else { ui.toast(ex.closedMsg, 2500); exitCooldown = 3; }
      break;
    }
  }

  fx.update(realDt);
  if (zone === city) city.showroom.update(t, realDt, player.pos, driving);
  if (zone === city && started && !paused && !transition) {
    cityJobs.update(t, realDt, jobCtx());
    const hud = cityJobs.hud();
    if (hud) ui.setQuest(hud);
    else if (lastHud) refresh();
    lastHud = hud;
  }
  robot.update(t, realDt, player);
  if (boost > 0 && player.walkAmount > 0.5 && Math.random() < 0.3) fx.sparkle({ x: player.pos.x, y: 0.5, z: player.pos.z }, [0xff8c42, 0xffd23f], 2, 1.5);

  // Baas: levensbalk en spannende muziek in de koningszaal
  if (zone === cave) {
    const fight = king && !king.dead && cave.inThroneRoom(player.pos);
    ui.setBoss('👑 Koning Slijm', fight ? king.hp / king.maxHp : null);
    playMusic(fight ? 'baas' : 'grot');
  } else if (zone === pyramid) {
    const fight = sjors && !sjors.dead && pyramid.inThroneRoom(player.pos);
    ui.setBoss('🦂 Schorpioen Sjors', fight ? sjors.hp / sjors.maxHp : null);
    playMusic(fight ? 'baas' : 'piramide');
  } else ui.setBoss('', null);
  if (zone === world && desertAppearPending && !transition) desertAppear();
  if (zone === desert) updateStorm(realDt, paused);

  // Knoppen en hartjes
  const near = !paused && !driving && !(state.sword && enemyNear()) && nearestTalkable();
  const carNear = !paused && nearMyCar() && (!near || myCar.distanceTo(player.pos) < near.distanceTo(player.pos));
  if (ui.dialogOpen) ui.setActionBtn('Verder', true, false);
  else if (driving) ui.setActionBtn('Uitstappen', true, false);
  else if (carNear) ui.setActionBtn('Instappen', true, true);
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
    if (driving) camTarget.addScaledVector(CAM_OFFSET, 0.2);
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

// ---------- Starten ----------
setSoundOn(state.sound);
setMusicOn(state.music);
ui.setToggles(state.sound, state.music);
world.gate.setOpen(reached(state.quest, 'zwaard'), true);
forest.setDoorOpen(reached(state.quest, 'grot'), true);
squad.restore(state.clones, player);
squad.setHidden(state.clonesHidden, player);
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
  forest, cave, city, desert, pyramid, zones, game, get sjors() { return sjors; }, openTreasure, openCode, useCode, toggleClones,
  // alleen voor testen: laat de woestijnpoort meteen verschijnen (alsof De Stad uitgespeeld is)
  unlockDesert: () => { state._desertForced = true; refresh(); }, cityJobs, openJobs, finishJob, refresh, goTo, setZone, openShop, openMap, openBackpack, openCityShop, cityActions, robot, pickups,
  get boost() { return boost; }, myCar, get driving() { return driving; }, enterCar, exitCar, openCarShop,
  get enemies() { return enemies; }, get hearts() { return hearts; }, set hearts(v) { hearts = v; },
  get started() { return started; }, start: () => { if (!started) document.getElementById('start').dispatchEvent(new PointerEvent('pointerup')); },
  setDebugCam: (pos, look) => { debugCam = pos ? { pos, look } : null; },
};

// Opslaan van de spelvoortgang in localStorage.
// BELANGRIJK: verander je het formaat? Verhoog SAVE_VERSION en voeg een stap
// toe in migrate(), zodat oude saves blijven werken.
import { QUEST_ORDER, MAP_PIECES, SUN_STONE_IDS, reached, maxClones } from './quest.js';
import { HAT_NAMES } from './characters.js';
import { SHIRTS, TOYS, CANDIES, BOOKS, MAX_CANDY } from './cityshop.js';
import { CARS } from './autowinkel.js';

export const SAVE_KEY = 'clones-save';
export const SAVE_VERSION = 6;
export const SECRET_CODES = ['KRISTAL100']; // geheime codes (zie GAME.md, niet verder vertellen!)
export const MAX_HEARTS = 8;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    zone: 'dorp',       // 'dorp' | 'bos' | 'grot' | 'stad' | 'woestijn' | 'piramide'
    player: { x: 0, z: 5, rot: Math.PI },
    quest: { state: 'nieuw', gears: [] }, // zie quest.js voor alle stappen
    clones: 0,          // hoeveel clones je hebt gemaakt
    sound: true,        // geluidjes aan of uit
    music: true,        // muziek aan of uit
    crystals: 0,        // kristallen (om mee te betalen bij Koopman Kees)
    sword: 0,           // 0 = geen zwaard, 1 = zwaard, 2 = superzwaard
    maxHearts: 5,       // zoveel hartjes heb je
    hats: [],           // hoedjes die je hebt gekocht
    hat: null,          // het hoedje dat je nu draagt
    // Versie 4: De Stad (alles wordt betaald met dezelfde kristallen hierboven)
    shirts: [],         // shirts die je hebt gekocht (Kledingwinkel)
    shirt: null,        // het shirt dat je nu draagt (null = het blauwe shirt)
    toys: [],           // speelgoed (Speelgoedwinkel)
    candy: { raket: 0, lolly: 0, knal: 0 }, // snoepjes in je rugzak (Snoepwinkel)
    books: [],          // boeken (Boekwinkel)
    cityGift: false,    // heeft Burgemeester Bert je al 10 kristallen gegeven?
    // Versie 5: de Autowinkel
    cars: [],           // auto's die je hebt gekocht ('mini', 'jeep', 'sport', 'race')
    car: null,          // met welke auto je rijdt
    // Versie 6: De Grote Woestijn (quest.stones = welke zonnestenen al schijnen)
    mapPieces: [],      // stukjes van de schatkaart ('woestijn', ...)
    codes: [],          // geheime codes die je al hebt gebruikt
    clonesHidden: false, // clones even weg (👻-knop)
  };
}

// Maakt van elke oude save een save in het nieuwste formaat.
export function migrate(data) {
  if (!data || typeof data !== 'object') return defaultSave();
  let v = typeof data.version === 'number' ? data.version : 0;

  if (v === 0) {
    // Save zonder versienummer: neem over wat we herkennen.
    data = { ...defaultSave(), ...data, version: 1 };
    v = 1;
  }
  if (v === 1) {
    // Versie 2: clones en geluid erbij.
    data = { ...data, clones: 0, sound: true, version: 2 };
    v = 2;
  }
  if (v === 2) {
    // Versie 3: hoofdstuk 2 (zones, zwaard, kristallen, hartjes, hoedjes, muziek).
    data = { ...data, zone: 'dorp', music: true, crystals: 0, sword: 0, maxHearts: 5, hats: [], hat: null, version: 3 };
    v = 3;
  }
  if (v === 3) {
    // Versie 4: De Stad met winkels (shirts, speelgoed, snoep, boeken). Kristallen blijven precies hetzelfde.
    data = { ...data, shirts: [], shirt: null, toys: [], candy: { raket: 0, lolly: 0, knal: 0 }, books: [], cityGift: false, version: 4 };
    v = 4;
  }
  if (v === 4) {
    // Versie 5: de Autowinkel. Kristallen blijven precies hetzelfde.
    data = { ...data, cars: [], car: null, version: 5 };
    v = 5;
  }
  if (v === 5) {
    // Versie 6: De Grote Woestijn, de schatkaart, geheime codes en clones verstoppen. Kristallen blijven hetzelfde.
    data = { ...data, mapPieces: [], codes: [], clonesHidden: false, version: 6 };
    v = 6;
  }
  // Voorbeeld voor later:
  // if (v === 6) { data.huisdier = null; data.version = 7; v = 7; }

  // Vul ontbrekende velden aan en controleer of alles klopt.
  delete data._desertForced; // alleen voor testen, niet bewaren
  const def = defaultSave();
  const player = { ...def.player, ...(data.player || {}) };
  const quest = { ...def.quest, ...(data.quest || {}) };
  for (const k of ['x', 'z', 'rot']) if (!Number.isFinite(player[k])) player[k] = def.player[k];
  if (!QUEST_ORDER.includes(quest.state)) quest.state = 'nieuw';
  if (!Array.isArray(quest.gears)) quest.gears = [];
  if (quest.kingBeaten !== true || quest.state !== 'grot') delete quest.kingBeaten; // Koning Slijm verslagen, batterij nog niet gepakt
  if (quest.bossBeaten !== true || quest.state !== 'piramide') delete quest.bossBeaten; // Sjors verslagen, kaartstuk nog niet gepakt
  // zonnestenen: alleen tijdens hoofdstuk 3; na de deur schijnen ze allemaal
  const stoneIds = SUN_STONE_IDS;
  if (reached(quest, 'piramide')) quest.stones = [...stoneIds];
  else if (quest.state === 'woestijn') quest.stones = Array.isArray(quest.stones) ? [...new Set(quest.stones.filter((id) => stoneIds.includes(id)))] : [];
  else delete quest.stones;
  let mapPieces = Array.isArray(data.mapPieces) ? [...new Set(data.mapPieces.filter((id) => MAP_PIECES.includes(id)))] : [];
  if (reached(quest, 'kaart') && !mapPieces.includes('woestijn')) mapPieces.push('woestijn');
  const codes = Array.isArray(data.codes) ? [...new Set(data.codes.filter((c) => SECRET_CODES.includes(c)))] : [];
  const int = (n, lo, hi, d) => (Number.isInteger(n) ? Math.min(Math.max(n, lo), hi) : d);
  const clones = reached(quest, 'aan') ? int(data.clones, 0, maxClones(quest), 0) : 0;
  let zone = ['dorp', 'bos', 'grot', 'stad', 'woestijn', 'piramide'].includes(data.zone) ? data.zone : 'dorp';
  if ((zone === 'bos' && !reached(quest, 'zwaard')) || (zone === 'grot' && !reached(quest, 'grot'))) zone = 'dorp';
  if ((zone === 'woestijn' && !reached(quest, 'woestijn')) || (zone === 'piramide' && !reached(quest, 'piramide'))) zone = 'dorp';
  let sword = int(data.sword, 0, 2, 0);
  if (reached(quest, 'zwaard')) sword = Math.max(sword, 1);
  const hats = Array.isArray(data.hats) ? data.hats.filter((h) => h in HAT_NAMES) : [];
  const hat = hats.includes(data.hat) ? data.hat : null;
  const known = (list, obj) => (Array.isArray(list) ? [...new Set(list.filter((id) => id in obj))] : []);
  const shirts = known(data.shirts, SHIRTS), toys = known(data.toys, TOYS), books = known(data.books, BOOKS);
  const shirt = shirts.includes(data.shirt) ? data.shirt : null;
  const cars = known(data.cars, CARS);
  const car = cars.includes(data.car) ? data.car : (cars[0] || null);
  const candy = {};
  for (const id of Object.keys(CANDIES)) candy[id] = int(data.candy && data.candy[id], 0, MAX_CANDY, 0);
  return {
    ...data, version: Math.max(v, SAVE_VERSION), zone, player, quest, clones, sword, hats, hat,
    shirts, shirt, toys, books, candy, cityGift: data.cityGift === true, cars, car,
    mapPieces, codes, clonesHidden: data.clonesHidden === true,
    sound: data.sound !== false, music: data.music !== false,
    crystals: int(data.crystals, 0, 99999, 0), maxHearts: int(data.maxHearts, 5, MAX_HEARTS, 5),
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Save kon niet geladen worden, we beginnen opnieuw.', e);
    return defaultSave();
  }
}

export function writeSave(state) {
  try {
    const { _desertForced, ...keep } = state;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...keep, version: SAVE_VERSION, savedAt: Date.now() }));
  } catch (e) {
    // Bijvoorbeeld in privé-modus: dan gewoon niet opslaan.
  }
}

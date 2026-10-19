// Opslaan van de spelvoortgang in localStorage.
// BELANGRIJK: verander je het formaat? Verhoog SAVE_VERSION en voeg een stap
// toe in migrate(), zodat oude saves blijven werken.
import { QUEST_ORDER, reached } from './quest.js';
import { HAT_NAMES } from './characters.js';

export const SAVE_KEY = 'clones-save';
export const SAVE_VERSION = 3;
export const MAX_HEARTS = 8;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    zone: 'dorp',       // 'dorp' | 'bos' | 'grot'
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
  // Voorbeeld voor later:
  // if (v === 3) { data.huisdier = null; data.version = 4; v = 4; }

  // Vul ontbrekende velden aan en controleer of alles klopt.
  const def = defaultSave();
  const player = { ...def.player, ...(data.player || {}) };
  const quest = { ...def.quest, ...(data.quest || {}) };
  for (const k of ['x', 'z', 'rot']) if (!Number.isFinite(player[k])) player[k] = def.player[k];
  if (!QUEST_ORDER.includes(quest.state)) quest.state = 'nieuw';
  if (!Array.isArray(quest.gears)) quest.gears = [];
  const int = (n, lo, hi, d) => (Number.isInteger(n) ? Math.min(Math.max(n, lo), hi) : d);
  const clones = reached(quest, 'aan') ? int(data.clones, 0, 10, 0) : 0;
  let zone = ['dorp', 'bos', 'grot'].includes(data.zone) ? data.zone : 'dorp';
  if ((zone === 'bos' && !reached(quest, 'zwaard')) || (zone === 'grot' && !reached(quest, 'grot'))) zone = 'dorp';
  let sword = int(data.sword, 0, 2, 0);
  if (reached(quest, 'zwaard')) sword = Math.max(sword, 1);
  const hats = Array.isArray(data.hats) ? data.hats.filter((h) => h in HAT_NAMES) : [];
  const hat = hats.includes(data.hat) ? data.hat : null;
  return {
    ...data, version: Math.max(v, SAVE_VERSION), zone, player, quest, clones, sword, hats, hat,
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, version: SAVE_VERSION, savedAt: Date.now() }));
  } catch (e) {
    // Bijvoorbeeld in privé-modus: dan gewoon niet opslaan.
  }
}

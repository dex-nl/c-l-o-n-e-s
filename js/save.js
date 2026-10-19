// Opslaan van de spelvoortgang in localStorage.
// BELANGRIJK: verander je het formaat? Verhoog SAVE_VERSION en voeg een stap
// toe in migrate(), zodat oude saves blijven werken.

export const SAVE_KEY = 'clones-save';
export const SAVE_VERSION = 2;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    player: { x: 0, z: 5, rot: Math.PI },
    quest: { state: 'nieuw', gears: [] }, // state: 'nieuw' | 'bezig' | 'klaar' | 'aan'
    clones: 0,   // hoeveel clones je hebt gemaakt
    sound: true, // geluid aan of uit
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
  // Voorbeeld voor later:
  // if (v === 2) { data.inventaris = []; data.version = 3; v = 3; }

  // Vul ontbrekende velden aan met standaardwaarden.
  const def = defaultSave();
  const player = { ...def.player, ...(data.player || {}) };
  const quest = { ...def.quest, ...(data.quest || {}) };
  for (const k of ['x', 'z', 'rot']) if (!Number.isFinite(player[k])) player[k] = def.player[k];
  if (!['nieuw', 'bezig', 'klaar', 'aan'].includes(quest.state)) quest.state = 'nieuw';
  if (!Array.isArray(quest.gears)) quest.gears = [];
  let clones = Number.isInteger(data.clones) ? Math.min(Math.max(data.clones, 0), 5) : 0;
  if (quest.state !== 'aan') clones = 0;
  const sound = data.sound !== false;
  return { ...data, version: Math.max(v, SAVE_VERSION), player, quest, clones, sound };
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

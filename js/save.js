// Opslaan van de spelvoortgang in localStorage.
// BELANGRIJK: verander het formaat NOOIT zonder oude saves om te zetten!
// Verhoog SAVE_VERSION en voeg een stap toe in migrate(), zodat oude saves blijven werken.
//
// Versies:
//   (geen) - allereerste saves zonder versienummer
//   1      - speler + opdracht (tandwielen)
//   2      - + clones: hoeveel clones je hebt gemaakt (0 t/m 5)

export const SAVE_KEY = 'clones-save';
export const SAVE_VERSION = 2;
export const MAX_SAVED_CLONES = 5;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    player: { x: 0, z: 5, rot: Math.PI },
    quest: { state: 'nieuw', gears: [] }, // state: 'nieuw' | 'bezig' | 'klaar'
    clones: 0,
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
    // Versie 1 had nog geen clones: je begint met 0 clones.
    data = { ...data, clones: 0, version: 2 };
    v = 2;
  }
  // Voorbeeld voor later:
  // if (v === 2) { data.inventaris = []; data.version = 3; v = 3; }

  // Vul ontbrekende velden aan met standaardwaarden.
  const def = defaultSave();
  const player = { ...def.player, ...(data.player || {}) };
  const quest = { ...def.quest, ...(data.quest || {}) };
  for (const k of ['x', 'z', 'rot']) if (!Number.isFinite(player[k])) player[k] = def.player[k];
  if (!['nieuw', 'bezig', 'klaar'].includes(quest.state)) quest.state = 'nieuw';
  if (!Array.isArray(quest.gears)) quest.gears = [];
  let clones = Math.floor(Number(data.clones));
  if (!Number.isFinite(clones) || clones < 0) clones = 0;
  clones = Math.min(clones, MAX_SAVED_CLONES);
  if (quest.state !== 'klaar') clones = 0; // clones kan je pas maken als de machine werkt
  return { ...data, version: Math.max(v, SAVE_VERSION), player, quest, clones };
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

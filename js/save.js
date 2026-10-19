// Opslaan van de spelvoortgang in localStorage.
// BELANGRIJK: verander je het formaat? Verhoog SAVE_VERSION en voeg een stap
// toe in migrate(), zodat oude saves blijven werken.

export const SAVE_KEY = 'clones-save';
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    player: { x: 0, z: 5, rot: Math.PI },
    quest: { state: 'nieuw', gears: [] }, // state: 'nieuw' | 'bezig' | 'klaar'
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
  // Voorbeeld voor later:
  // if (v === 1) { data.inventaris = []; data.version = 2; v = 2; }

  // Vul ontbrekende velden aan met standaardwaarden.
  const def = defaultSave();
  const player = { ...def.player, ...(data.player || {}) };
  const quest = { ...def.quest, ...(data.quest || {}) };
  for (const k of ['x', 'z', 'rot']) if (!Number.isFinite(player[k])) player[k] = def.player[k];
  if (!['nieuw', 'bezig', 'klaar'].includes(quest.state)) quest.state = 'nieuw';
  if (!Array.isArray(quest.gears)) quest.gears = [];
  return { ...data, version: Math.max(v, SAVE_VERSION), player, quest };
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

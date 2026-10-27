// 📲 Voortgang meenemen: je save als tekst-code kopiëren (bijvoorbeeld in Safari)
// en plakken in een ander spel (bijvoorbeeld de app op het beginscherm, die een eigen opslag heeft).
// De code is: CLONES1. + de save (JSON, base64) + . + een controlegetal (zo zie je een kapotte code meteen).
// Dit gaat NOOIT over het netwerk (ook niet bij Samen spelen): alleen via kopiëren en plakken.
// Werkt met elke save-versie: we gebruiken migrate() en defaultSave() uit save.js, dus er staat hier geen versienummer in.
import { migrate, defaultSave, SAVE_VERSION } from './save.js';

export const CODE_PREFIX = 'CLONES1';
const MAX_CODE_LENGTH = 200000;
// Velden die niet in defaultSave() staan, maar wel bij een save horen. Nieuw los veld (niet in defaultSave)? Zet het hier.
const EXTRA_KEYS = ['desertEarly'];

// Een klein controlegetal (FNV-1a, 32 bits) als 8 hexletters
function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function toB64(text) {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

// Alleen de velden die bij een save horen (onbekende dingen gooien we weg)
function onlyKnown(data) {
  const keep = new Set([...Object.keys(defaultSave()), ...EXTRA_KEYS]);
  const out = {};
  for (const k of Object.keys(data)) if (keep.has(k)) out[k] = data[k];
  return out;
}

// Van de save een code maken
export function makeCode(state) {
  const { _desertForced, savedAt, ...rest } = state;
  const json = JSON.stringify(onlyKnown({ ...rest, version: SAVE_VERSION }));
  const body = toB64(json);
  return `${CODE_PREFIX}.${body}.${checksum(body)}`;
}

// Een code lezen. Geeft { ok: true, save } of { ok: false, msg } (een vriendelijke melding)
export function readCode(raw) {
  const bad = { ok: false, msg: 'Oei, deze code klopt niet. Kopieer hem nog eens helemaal en probeer het opnieuw.' };
  const text = String(raw || '').replace(/\s+/g, '');
  if (!text) return { ok: false, msg: 'Plak eerst een code in het vak.' };
  if (text.length > MAX_CODE_LENGTH) return bad;
  const parts = text.split('.');
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) return bad;
  const [, body, sum] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(body) || checksum(body) !== sum.toLowerCase()) return bad;
  let data;
  try { data = JSON.parse(fromB64(body)); } catch (e) { return bad; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return bad;
  if (!Number.isInteger(data.version) || data.version < 1) return bad;
  if (data.version > SAVE_VERSION) return { ok: false, msg: 'Deze code komt uit een nieuwere versie van het spel. Sluit dit spel helemaal af, open het opnieuw en probeer het nog eens.' };
  if (typeof data.crystals !== 'undefined' && !Number.isFinite(data.crystals)) return bad;
  if (data.quest && (typeof data.quest !== 'object' || Array.isArray(data.quest))) return bad;
  let save;
  try { save = onlyKnown(migrate(onlyKnown(data))); } catch (e) { return bad; }
  return { ok: true, save };
}

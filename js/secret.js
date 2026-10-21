// Dex zijn eigen code (geheim!). De code zelf staat NERGENS in het spel: alleen een "vingerafdruk" (hash).
// We maken van wat je intypt (in kleine letters) een SHA-256-hash en vergelijken die.
// Werkt crypto.subtle niet (bijvoorbeeld zonder https)? Dan gebruiken we een kleine eigen hash (cyrb53).
const SHA = '84fc133ecc97dfc579e484249fcd0b46718b0867ed19ed9b605f84be9e08fa9b';
const SMALL = 'dq49n2c7h9';
export const PRIVATE_REWARD = 1000; // elke keer opnieuw

function cyrb53(str, seed = 7) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Is dit Dex zijn eigen code? (hoofdletters maken niet uit)
export async function isPrivateCode(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return false;
  try {
    if (globalThis.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('') === SHA;
    }
  } catch (e) { /* dan de kleine hash */ }
  return cyrb53(s) === SMALL;
}

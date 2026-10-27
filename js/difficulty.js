// Hoe moeilijk is elke wereld? ALLES over moeilijkheid staat hier op één plek.
// Elke nieuwe wereld krijgt een hoger level, dan wordt hij vanzelf moeilijker:
// slijmpjes hebben meer leven, zijn iets sneller, bazen slaan harder en er vallen minder hartjes.
// Eerlijk blijven: met je clones en een goed zwaard moet het altijd te halen zijn!
export const WORLD_LEVEL = {
  dorp: 1, bos: 1, grot: 1, stad: 1,
  woestijn: 2, piramide: 2.2,
  doolhof: 3,
  vulkaan: 4, // De Vulkaan (hoofdstuk 5): nog moeilijker dan het doolhof
  onderwater: 5, // De Onderwaterwereld (hoofdstuk 6): nog moeilijker dan de vulkaan
  ijs: 6, // De IJswereld (hoofdstuk 7): nog moeilijker dan onder water
  // volgende werelden: 7, 8, ...
};

export const levelOf = (zoneId) => WORLD_LEVEL[zoneId] ?? 1;

// Alle getallen voor een wereld (L = level)
export function difficulty(zoneId) {
  const L = levelOf(zoneId), up = L - 1;
  return {
    level: L,
    hp: 1 + up * 0.45,          // leven van slijmpjes (woestijn x1,45 / doolhof x1,9 / vulkaan x2,35 / onderwater x2,8 / ijs x3,25)
    speed: 1 + up * 0.08,       // snelheid van slijmpjes
    aggro: 1 + up * 0.12,       // van hoe ver ze je zien
    bossHp: 1 + up * 0.5,       // leven van bazen (Sjors x1,6 in de piramide / doolhof x2 / vulkaan x2,5 / onderwater x3 / ijs x3,5)
    bossDamage: L >= 2 ? 2 : 1, // zware klappen van bazen (hartjes)
    heartDrop: 0.3 / L,         // kans op een hartje van een verslagen slijmpje
  };
}

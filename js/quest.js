// De opdracht: zoek 3 tandwielen voor de kapotte clonemachine, en zet hem daarna aan.
// state: 'nieuw' -> 'bezig' (tandwielen zoeken) -> 'klaar' (gerepareerd) -> 'aan' (clonen maar!)
export const NPC_NAME = 'Professor Bolt';
export const GEARS_NEEDED = 3;
export const MAX_CLONES = 5;

export function questText(quest, clones = 0) {
  if (quest.state === 'nieuw') return '💡 Tip: loop naar de uitvinder bij de <b>clonemachine</b>';
  if (quest.state === 'bezig') {
    const n = quest.gears.length;
    if (n >= GEARS_NEEDED) return '⚙️ Alle tandwielen gevonden! Breng ze naar <b>Professor Bolt</b>';
    return `⚙️ Opdracht: zoek 3 gouden tandwielen <b>(${n}/3)</b>`;
  }
  if (quest.state === 'klaar') return '⭐ Gerepareerd! Praat nog eens met <b>Professor Bolt</b>';
  if (clones < MAX_CLONES) return `🧬 Maak clones bij de <b>clonemachine</b> <b>(${clones}/${MAX_CLONES})</b>`;
  return `⭐ Je hebt een clone-team van ${MAX_CLONES}! Wat wordt jullie volgende avontuur?`;
}

// Wat zegt de uitvinder? Hangt af van hoe ver je bent.
export function npcLines(quest, clones = 0) {
  if (quest.state === 'nieuw') {
    return [
      'Hallo daar! Ik ben Professor Bolt, de uitvinder van het dorp.',
      'Zie je dat grote ding? Dat is mijn clonemachine. Daarmee kun je clones van jezelf maken!',
      'Maar oh nee... hij is kapot. Er zijn 3 gouden tandwielen uit gevallen.',
      'Ze liggen ergens in het dorp. Wil jij ze voor me zoeken? Dankjewel!',
    ];
  }
  if (quest.state === 'bezig') {
    const n = quest.gears.length;
    if (n >= GEARS_NEEDED) {
      return [
        'Wauw! Je hebt alle 3 de tandwielen gevonden!',
        'Even inzetten... klik... klak... KLONK!',
        'De clonemachine doet het bijna weer. Jij bent een echte held!',
      ];
    }
    return [`Je hebt er nu ${n} van de 3. Kijk goed rond: bij de huizen, de bomen en de vijver!`];
  }
  if (quest.state === 'klaar') {
    return [
      'Daar ben je! De clonemachine is helemaal opgewarmd.',
      'Nu nog op de grote rode knop drukken... 3... 2... 1...',
      'BZZZZZT! Hij doet het! Hij doet het echt!',
      'Ga voor de machine staan en druk op de knop Clone! Dan maakt hij een clone van jou.',
    ];
  }
  if (clones === 0) return ['Toe maar! Ga voor de machine staan en druk op Clone!'];
  if (clones < MAX_CLONES) {
    return [
      `Wauw, al ${clones === 1 ? '1 clone' : `${clones} clones`}! Ze lopen overal achter je aan.`,
      'Tip: sta eens even stil. Wat doen je clones dan?',
    ];
  }
  return [
    `${MAX_CLONES} clones! Het dorp is nog nooit zo druk geweest.`,
    'Met zo\'n clone-team kun je vast nog veel meer avonturen beleven...',
    'Ik ben benieuwd wat jullie gaan doen!',
  ];
}

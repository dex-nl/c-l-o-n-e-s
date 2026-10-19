// De eerste opdracht: zoek 3 tandwielen voor de kapotte clonemachine.
export const NPC_NAME = 'Professor Bolt';
export const GEARS_NEEDED = 3;

export function questText(quest) {
  if (quest.state === 'nieuw') return '💡 Tip: loop naar de uitvinder bij de <b>clonemachine</b>';
  if (quest.state === 'bezig') {
    const n = quest.gears.length;
    if (n >= GEARS_NEEDED) return '⚙️ Alle tandwielen gevonden! Breng ze naar <b>Professor Bolt</b>';
    return `⚙️ Opdracht: zoek 3 gouden tandwielen <b>(${n}/3)</b>`;
  }
  return '⭐ De clonemachine werkt! Ga ernaast staan en druk op <b>Kloon!</b>';
}

// Wat zegt de uitvinder? Hangt af van hoe ver je bent.
export function npcLines(quest) {
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
        'De clonemachine doet het weer! Jij bent een echte held!',
        'Ga naast de machine staan en druk op de blauwe Kloon!-knop. Dan maakt hij een clone van jou!',
      ];
    }
    return [`Je hebt er nu ${n} van de 3. Kijk goed rond: bij de huizen, de bomen en de vijver!`];
  }
  return [
    'Hij werkt! Mijn clonemachine doet het weer, dankzij jou!',
    'Ga naast de machine staan en druk op Kloon! Je mag er wel 5 maken.',
  ];
}

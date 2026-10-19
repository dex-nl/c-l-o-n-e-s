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

// ---------- Het bos: Uil Wijsje ----------
export const OWL_NAME = 'Uil Wijsje';
const NEEDS = [1, 2, 3];

function cloneHint(n, need) {
  if (n >= need) return null;
  if (n === 0) return 'Oei, je hebt nog geen clones! Ga terug naar de clonemachine in het dorp en maak er een paar. Hoe-hoe!';
  return `Je hebt nu ${n} clone${n === 1 ? '' : 's'}, maar je hebt er straks ${need} nodig. Ga terug naar de clonemachine in het dorp en maak er meer!`;
}

export function owlLines(forest, cloneCount) {
  const next = forest.solved.findIndex((s) => !s);
  if (!forest.owl) {
    const lines = [
      'Hoe-hoe! Welkom in het Fluisterbos. Ik ben Uil Wijsje.',
      'Diep in het bos ligt een stuk van een oude schatkaart. Maar er staan 3 poorten in de weg.',
      'Een poort gaat open als er iets op de gele drukknop staat: jij, of een clone die wacht.',
      'Ga op een drukknop staan en druk op Blijf (toets F). Dan blijft een clone daar wachten. Met Volg (toets V) komen ze weer achter je aan.',
      'Elke poort is een beetje moeilijker. Bij de laatste poort heb je 3 clones nodig!',
    ];
    const hint = cloneHint(cloneCount, 3);
    if (hint) lines.push(hint);
    else lines.push('Je hebt genoeg clones bij je. Succes, kleine held!');
    return lines;
  }
  if (forest.map) return ['Hoe-hoe! Je hebt het stuk van de schatkaart gevonden! Het volgende gebied gaat binnenkort open.'];
  if (next === -1) return ['Alle poorten zijn open! Loop helemaal naar het einde van het bos. Daar ligt het stuk van de schatkaart.'];
  const need = NEEDS[next];
  const lines = [`Bij poort ${next + 1} heb je ${need} clone${need === 1 ? '' : 's'} nodig. Zet ze met Blijf op de drukknop${need === 1 ? '' : 'pen'}.`];
  const hint = cloneHint(cloneCount, need);
  if (hint) lines.push(hint);
  return lines;
}

export function forestQuestText(forest, cloneCount, pressed) {
  if (!forest.owl) return '🦉 Praat met <b>Uil Wijsje</b> bij de ingang van het bos';
  if (forest.map) return '⭐ Stuk 1 van de schatkaart gevonden! Volgende gebied: <b>binnenkort</b>';
  const next = forest.solved.findIndex((s) => !s);
  if (next === -1) return '🗺️ Zoek het <b>stuk van de schatkaart</b> aan het einde van het bos';
  const need = NEEDS[next];
  let t = `🌲 Poort ${next + 1}: zet ${need} clone${need === 1 ? '' : 's'} op de drukknop${need === 1 ? '' : 'pen'} <b>(${pressed}/${need})</b>`;
  if (cloneCount < need) t += '<br>⚠️ Te weinig clones: maak er meer bij de clonemachine';
  return t;
}

// Het verhaal: wat moet je doen, en wat zeggen de dorpelingen?
// De opdracht gaat stap voor stap (quest.state):
//   Hoofdstuk 1: 'nieuw' -> 'bezig' (tandwielen zoeken) -> 'klaar' (gerepareerd) -> 'aan' (clonen maar!)
//   Hoofdstuk 2: 'zwaard' (naar het Slijmbos) -> 'grot' (deur open: versla Koning Slijm)
//                -> 'batterij' (breng hem naar Bolt) -> 'held' (klaar! nu 10 clones)
export const NPC_NAME = 'Professor Bolt';
export const GEARS_NEEDED = 3;
export const TEAM_SIZE = 3; // zoveel clones heb je nodig voordat Bolt over het Slijmbos vertelt
export const QUEST_ORDER = ['nieuw', 'bezig', 'klaar', 'aan', 'zwaard', 'grot', 'batterij', 'held'];

// Ben je al bij deze stap (of verder)?
export const reached = (quest, step) => QUEST_ORDER.indexOf(quest.state) >= QUEST_ORDER.indexOf(step);
export const maxClones = (quest) => (reached(quest, 'held') ? 10 : 5);

export function questText(state, zoneId) {
  const q = state.quest, n = state.clones, max = maxClones(q);
  switch (q.state) {
    case 'nieuw': return '💡 Tip: loop naar de uitvinder bij de <b>clonemachine</b>';
    case 'bezig': {
      const g = q.gears.length;
      if (g >= GEARS_NEEDED) return '⚙️ Alle tandwielen gevonden! Breng ze naar <b>Professor Bolt</b>';
      return `⚙️ Opdracht: zoek 3 gouden tandwielen <b>(${g}/3)</b>`;
    }
    case 'klaar': return '⭐ Gerepareerd! Praat nog eens met <b>Professor Bolt</b>';
    case 'aan':
      if (n < TEAM_SIZE) return `🧬 Maak clones bij de <b>clonemachine</b> <b>(${n}/${max})</b>`;
      return `❗ <b>Professor Bolt</b> wil je iets vertellen <b>(clones: ${n}/${max})</b>`;
    case 'zwaard':
      if (zoneId === 'dorp') return '⚔️ Ga door de <b>poort</b> achter het dorp naar het Slijmbos';
      return '🚪 Open de <b>grotdeur</b> achterin het bos';
    case 'grot':
      if (zoneId === 'grot') return '👑 Versla <b>Koning Slijm</b>!';
      return '👑 Ga de grot in en versla <b>Koning Slijm</b>';
    case 'batterij': return '🔋 Breng de Superbatterij naar <b>Professor Bolt</b>';
    default: return `⭐ Held van het dorp! Clones: <b>${n}/${max}</b>. Wat wordt je volgende avontuur?`;
  }
}

// Heeft Professor Bolt iets nieuws te vertellen? (dan staat er een ! boven zijn hoofd)
export function boltHasNews(state) {
  const q = state.quest;
  return q.state === 'nieuw' || q.state === 'klaar' || q.state === 'batterij'
    || (q.state === 'bezig' && q.gears.length >= GEARS_NEEDED)
    || (q.state === 'aan' && state.clones >= TEAM_SIZE);
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Wat zegt iemand? Hangt af van hoe ver je bent.
export function linesFor(id, state) {
  const q = state.quest, clones = state.clones;
  if (id === 'bolt') return boltLines(q, clones);
  if (id === 'koopman') {
    if (!reached(q, 'zwaard')) {
      return [
        'Welkom bij de kraam van Koopman Kees!',
        'Ik verkoop hoedjes en andere mooie spullen. Je betaalt met kristallen.',
        'Kristallen? Die heb je nog niet... Ik heb gehoord dat slijmpjes ze hebben!',
      ];
    }
    return [pick(['Welkom terug! Kijk maar rustig rond.', 'Kristallen! Mijn lievelingsgeluid: kling kling!', 'Een hoedje voor jou, en een voor al je clones!'])];
  }
  if (id === 'oma') {
    if (reached(q, 'held')) return ['Mijn held! Wil je een koekje?', 'Oh, je clones ook? Dan moet ik nog even bakken...'];
    if (reached(q, 'zwaard')) return ['Ga je naar het Slijmbos? Neem een koekje mee.', 'En pas op: slijmpjes plakken. Ik heb er eens eentje in mijn breiwerk gehad...'];
    if (reached(q, 'aan') && clones > 0) return ['Wat zie ik nou? Er lopen allemaal kleine jij\'tjes achter je aan!', 'Vroeger hadden we geen clones. Toen moesten we zelf de afwas doen!'];
    return ['Hallo lieverd! Ik ben Oma Pien.', 'Die Professor Bolt is altijd aan het knutselen. Laatst ontplofte zijn broodrooster!'];
  }
  if (id === 'hond') return [pick(['Woef! Woef!', '*kwispel kwispel*', 'Knoeper wil spelen! Woef!', '*snuffel snuffel* ...Woef?'])];
  return ['...'];
}

function boltLines(q, clones) {
  switch (q.state) {
    case 'nieuw':
      return [
        'Hallo daar! Ik ben Professor Bolt, de uitvinder van het dorp.',
        'Zie je dat grote ding? Dat is mijn clonemachine. Daarmee kun je clones van jezelf maken!',
        'Maar oh nee... hij is kapot. Er zijn 3 gouden tandwielen uit gevallen.',
        'Ze liggen ergens in het dorp. Wil jij ze voor me zoeken? Dankjewel!',
      ];
    case 'bezig': {
      const n = q.gears.length;
      if (n >= GEARS_NEEDED) {
        return [
          'Wauw! Je hebt alle 3 de tandwielen gevonden!',
          'Even inzetten... klik... klak... KLONK!',
          'De clonemachine doet het bijna weer. Jij bent een echte held!',
        ];
      }
      return [`Je hebt er nu ${n} van de 3. Kijk goed rond: bij de huizen, de bomen en de vijver!`];
    }
    case 'klaar':
      return [
        'Daar ben je! De clonemachine is helemaal opgewarmd.',
        'Nu nog op de grote rode knop drukken... 3... 2... 1...',
        'BZZZZZT! Hij doet het! Hij doet het echt!',
        'Ga voor de machine staan en druk op de knop Clone! Dan maakt hij een clone van jou.',
      ];
    case 'aan':
      if (clones === 0) return ['Toe maar! Ga voor de machine staan en druk op Clone!'];
      if (clones < TEAM_SIZE) {
        return [
          `Wauw, al ${clones === 1 ? '1 clone' : `${clones} clones`}! Ze lopen overal achter je aan.`,
          'Tip: sta eens even stil. Wat doen je clones dan?',
        ];
      }
      return [
        'Wat een clone-team! Maar luister... ik heb slecht nieuws.',
        'Sinds de clonemachine aan staat, komen er slijmpjes uit het Slijmbos. Ze zijn dol op energie!',
        'En Koning Slijm heeft mijn Superbatterij gestolen! Hij zit ermee in zijn grot.',
        'Hier, neem dit zwaard. Je clones krijgen er ook eentje. Samen zijn jullie sterk!',
        'De poort achter het dorp is nu open. Succes, held!',
      ];
    case 'zwaard':
      return [
        'Het Slijmbos is achter het dorp, door de poort.',
        'Ik heb gehoord dat de grot een rare deur heeft. Alleen een team kan hem openen...',
      ];
    case 'grot':
      return [
        'Koning Slijm is groot en sterk. Neem al je clones mee!',
        'Zie je een schaduw op de grond? Loop snel weg: dan landt hij daar met een KLAP!',
      ];
    case 'batterij':
      return [
        'Is dat... mijn Superbatterij?! Je hebt Koning Slijm verslagen!',
        'Even inbouwen... KLONK! ZOEM! ZZZZING!',
        'De clonemachine is nu SUPER. Hij kan wel 10 clones maken!',
        'Jij bent de held van het dorp. Dankjewel!',
      ];
    default:
      return [
        'De machine kan nu 10 clones maken. Probeer maar!',
        'Ik ben benieuwd wat jouw volgende avontuur wordt...',
      ];
  }
}

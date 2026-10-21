// Het verhaal: wat moet je doen, en wat zeggen de dorpelingen?
// De opdracht gaat stap voor stap (quest.state):
//   Hoofdstuk 1: 'nieuw' -> 'bezig' (tandwielen zoeken) -> 'klaar' (gerepareerd) -> 'aan' (clonen maar!)
//   Hoofdstuk 2: 'zwaard' (naar het Slijmbos) -> 'grot' (deur open: versla Koning Slijm)
//                -> 'batterij' (breng hem naar Bolt) -> 'held' (klaar! nu 10 clones)
//   Hoofdstuk 3: 'woestijn' (laat de 3 zonnestenen schijnen) -> 'piramide' (versla Schorpioen Sjors)
//                -> 'kaart' (breng het stukje schatkaart naar Bolt) -> 'schat' (wordt vervolgd!)
export const NPC_NAME = 'Professor Bolt';
export const GEARS_NEEDED = 3;
export const TEAM_SIZE = 3; // zoveel clones heb je nodig voordat Bolt over het Slijmbos vertelt
export const QUEST_ORDER = ['nieuw', 'bezig', 'klaar', 'aan', 'zwaard', 'grot', 'batterij', 'held', 'woestijn', 'piramide', 'kaart', 'schat'];
export const MAP_PIECES = ['woestijn']; // de stukjes van de schatkaart die er al zijn (er komen er 4)
export const MAP_PIECES_TOTAL = 4;
export const SUN_STONE_IDS = ['west', 'oost', 'tempel']; // de zonnestenen in de woestijn (zie desert.js)

// ---------- De klusjes van Burgemeester Bert (De Stad) ----------
// Je krijgt ze een voor een. Na het laatste klusje is De Stad "uitgespeeld" (wens van Dex).
// state.jobs = { done: [...ids], active: id | null, step: 0 | 1 }
//   step 0 = nog zoeken/ophalen, step 1 = je hebt het bij je (eendje, pakje, bril)
export const LAP_TIME = 90; // seconden voor het rondje Grote Stad
export const JOBS = [
  { id: 'eend', icon: '🦆', name: 'Eendje Ed', info: 'Breng het weggelopen eendje terug naar de vijver in het Stadspark.', reward: 3 },
  { id: 'pakje', icon: '📦', name: 'Pakje voor Toby Tol', info: 'Haal het pakje op bij de parkeerplaats en breng het naar de speelgoedwinkel.', reward: 3 },
  { id: 'bril', icon: '👓', name: 'De bril van Opa Duif', info: 'Opa Duif is zijn bril kwijt. Zoek hem ergens in De Grote Stad!', reward: 4 },
  { id: 'rondje', icon: '🏁', name: 'Rondje Grote Stad', info: `Rij met je auto in ${LAP_TIME} seconden een rondje over de ringweg (door alle 3 de poortjes).`, reward: 5 },
];
export const JOB_IDS = JOBS.map((j) => j.id);
export const jobInfo = (id) => JOBS.find((j) => j.id === id);
const jobs = (state) => state.jobs || { done: [], active: null, step: 0 };
export const jobsDone = (state) => jobs(state).done.length;
export const activeJob = (state) => jobs(state).active;
// Heeft Bert een nieuw klusje voor je? (dan staat er een ! boven zijn hoofd)
export const nextJob = (state) => (state.cityGift && !jobs(state).active && jobsDone(state) < JOBS.length ? JOBS[jobsDone(state)].id : null);
export const bertHasNews = (state) => !state.cityGift || !!nextJob(state);

// Is De Stad "uitgespeeld"? Dan verschijnt de poort naar De Grote Woestijn in het dorp.
// = alle klusjes van Burgemeester Bert gedaan. (Dit is de enige plek waar dat staat.)
// state.desertEarly: een oude save (v6) die de woestijnpoort al had, die houdt hem.
// state._desertForced is alleen voor het testen (window.clones.unlockDesert()).
export function isCityDone(state) {
  return state._desertForced === true || state.desertEarly === true || jobsDone(state) >= JOBS.length;
}
export const cityDoneHint = (state) => `help <b>Burgemeester Bert</b> in De Stad met zijn klusjes <b>(${jobsDone(state)}/${JOBS.length})</b>`;

// Ben je al bij deze stap (of verder)?
export const reached = (quest, step) => QUEST_ORDER.indexOf(quest.state) >= QUEST_ORDER.indexOf(step);
export const maxClones = (quest) => (reached(quest, 'held') ? 10 : 5);

export function questText(state, zoneId) {
  const q = state.quest, n = state.clones, max = maxClones(q);
  if (zoneId === 'stad') {
    if (!state.cityGift) return '🎁 Praat met <b>Burgemeester Bert</b> bij de fontein';
    const job = activeJob(state), step = state.jobs ? state.jobs.step : 0, k = `Klusje ${jobsDone(state) + 1} van ${JOBS.length}`;
    if (job === 'eend') return step ? '🦆 Breng <b>Eendje Ed</b> naar de vijver in het <b>Stadspark</b>' : `🦆 ${k}: zoek <b>Eendje Ed</b> bij de <b>flats</b>`;
    if (job === 'pakje') return step ? '📦 Breng het pakje naar <b>Toby Tol</b> (speelgoedwinkel)' : `📦 ${k}: haal het <b>pakje</b> op bij de <b>parkeerplaats</b>`;
    if (job === 'bril') return step ? '👓 Breng de bril naar <b>Opa Duif</b> op het plein' : `👓 ${k}: zoek de <b>bril van Opa Duif</b> (bij de hoge flats?)`;
    if (job === 'rondje') {
      if (!state.cars || !state.cars.length) return `🏁 ${k}: koop eerst een auto in de <b>Autowinkel</b>`;
      return `🏁 ${k}: rij met je auto door de <b>START</b> op de lange weg`;
    }
    if (nextJob(state)) return `❗ <b>Burgemeester Bert</b> heeft een klusje voor je! <b>(${jobsDone(state)}/${JOBS.length} klaar)</b>`;
    if (q.state === 'held' && isCityDone(state)) return '🏆 Alle klusjes klaar! Ga naar <b>Professor Bolt</b> in het dorp';
    if (state.cars && state.cars.length) return '🚗 Stap in je auto en rij een rondje door <b>De Stad</b>!';
    return '🛍️ Shoppen in <b>De Stad</b>! Nieuw: de <b>Autowinkel</b> (rechts)';
  }
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
    case 'held':
      if (isCityDone(state)) return '❗ <b>Professor Bolt</b> heeft nieuws voor je!';
      return `⭐ Held van het dorp! Volgende avontuur? Tip: ${cityDoneHint(state)}`;
    case 'woestijn': {
      const lit = (q.stones || []).length;
      if (zoneId === 'woestijn') return `☀️ Sla de 3 <b>zonnestenen</b> met je zwaard <b>(${lit}/3)</b>`;
      if (zoneId === 'dorp') return '🏜️ Ga door de <b>woestijnpoort</b> (westkant van het dorp)';
      return '🏜️ Ga naar <b>De Grote Woestijn</b> (westkant van het dorp)';
    }
    case 'piramide':
      if (zoneId === 'piramide') return '🦂 Versla <b>Schorpioen Sjors</b> in de troonzaal!';
      if (zoneId === 'woestijn') return '🚪 De piramide is open! Ga naar binnen (helemaal achterin)';
      return '🏜️ Ga naar de <b>Grote Piramide</b> in de woestijn';
    case 'kaart': return '📜 Breng het stukje <b>schatkaart</b> naar <b>Professor Bolt</b>';
    case 'schat': return `📜 Schatkaart: <b>${(state.mapPieces || []).length} van ${MAP_PIECES_TOTAL}</b> stukjes. Wordt vervolgd!`;
    default: return `⭐ Held van het dorp! Clones: <b>${n}/${max}</b>. Wat wordt je volgende avontuur?`;
  }
}

// Heeft Professor Bolt iets nieuws te vertellen? (dan staat er een ! boven zijn hoofd)
export function boltHasNews(state) {
  const q = state.quest;
  return q.state === 'nieuw' || q.state === 'klaar' || q.state === 'batterij' || (q.state === 'held' && isCityDone(state)) || q.state === 'kaart'
    || (q.state === 'bezig' && q.gears.length >= GEARS_NEEDED)
    || (q.state === 'aan' && state.clones >= TEAM_SIZE);
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Wat zegt iemand? Hangt af van hoe ver je bent.
export function linesFor(id, state) {
  const q = state.quest, clones = state.clones;
  if (id === 'bolt') {
    if (q.state === 'held' && !isCityDone(state)) {
      return [
        'De machine kan nu 10 clones maken. Probeer maar!',
        'Ben je al in De Stad geweest? Burgemeester Bert zoekt een handige helper voor een paar klusjes!',
        'Als De Stad klaar is met jou... dan heb ik misschien een nieuw avontuur. Hihi!',
      ];
    }
    return boltLines(q, clones);
  }
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
  if (id === 'kameel') return camelLines(state);
  const city = cityLines(id, state);
  if (city) return city;
  if (id === 'hond' && state.toys && state.toys.includes('bal')) return [pick(['Woef! Woef! Gooi de bal!', '*kwispel kwispel* Is dat MIJN bal?!', 'Knoeper rent de bal achterna. Woef!'])];
  if (id === 'hond') return [pick(['Woef! Woef!', '*kwispel kwispel*', 'Knoeper wil spelen! Woef!', '*snuffel snuffel* ...Woef?'])];
  return ['...'];
}

// Kameel Karel bij de oase weet alles van de woestijn
function camelLines(state) {
  const q = state.quest, lit = (q.stones || []).length;
  if (q.state === 'woestijn') {
    return [
      'Mmmh... *kauw kauw* Hallo, ik ben Kameel Karel.',
      lit === 0 ? 'Zoek je de zonnestenen? Er staat er een bij de Oude Ruïne, een bij de Kleine Piramide en een bij de Vergeten Tempel.'
        : `Je hebt er al ${lit} van de 3 laten schijnen. Zie je de gouden lichtstraal in de lucht? Zo zie je welke al klaar zijn!`,
      'Volg de stenen paden. Op de kaart (M) zie je waar je bent.',
    ];
  }
  if (q.state === 'piramide') return ['De piramide is open! *kauw* Schorpioen Sjors is mijn buurman. Hij knijpt een beetje, maar hij is niet gemeen.', 'Pas op als hij zijn staart optilt: dan stampt hij!'];
  return [pick([
    'Mmmh... *kauw kauw* Zand is lekker. Nou ja, een beetje.',
    'Wist je dat ik een hele week geen water hoef te drinken? Maar ik vind de oase toch fijn.',
    'Zandstorm? Ach, dan doe ik gewoon even mijn ogen dicht.',
  ])];
}

// Burgemeester Bert: het welkomstcadeautje, en daarna de klusjes een voor een
function bertLines(state) {
  if (!state.cityGift) {
    return [
      'Welkom, welkom in De Stad! Ik ben Burgemeester Bert.',
      'Wij hebben hier vier winkels: speelgoed, snoep, kleding en boeken.',
      'In De Stad betaal je met kristallen. Hier, een welkomstcadeautje van de stad: 10 kristallen!',
      'Let op bij het oversteken: loop over het zebrapad. De autootjes stoppen altijd voor je!',
      'O, en als je zin hebt: ik heb een paar klusjes voor je. Kom straks nog eens met me praten!',
    ];
  }
  const job = activeJob(state), n = jobsDone(state), total = JOBS.length;
  const noCar = !state.cars || !state.cars.length;
  if (job === 'eend') return [`Klusje ${n + 1} van ${total}: Eendje Ed is weggelopen uit de vijver!`, 'Ik zag hem waggelen bij de hoge flats. Loop naar hem toe, dan loopt hij achter je aan.', 'Breng hem terug naar de vijver in het Stadspark. Kwak!'];
  if (job === 'pakje') return [`Klusje ${n + 1} van ${total}: het pakje voor Toby Tol.`, 'Het ligt op de parkeerplaats aan de westkant. Lopen of met de auto, dat mag jij kiezen!'];
  if (job === 'bril') return [`Klusje ${n + 1} van ${total}: Opa Duif is zijn bril kwijt.`, 'Hij liep vanochtend bij de hoge flats aan de westkant. Kijk goed: er glinstert vast iets!'];
  if (job === 'rondje') {
    return [`Klusje ${n + 1} van ${total}: rij een rondje over de grote ringweg!`, `Begin bij de START op de lange weg. Rij door alle 3 de poortjes en weer terug naar de START, binnen ${LAP_TIME} seconden.`,
      ...(noCar ? ['Heb je nog geen auto? In de Autowinkel (rechts) kun je er een kopen. De Mini Muis is niet duur!'] : ['Rustig aan bij de rotonde, hoor!'])];
  }
  const next = nextJob(state);
  if (next === 'eend') {
    return [`Klusje 1 van ${total}! Oh jee, oh jee...`, 'Eendje Ed is weggelopen uit de vijver in het Stadspark. Ik zag hem bij de hoge flats.', 'Wil jij hem terugbrengen? Dan krijg je 3 kristallen!'];
  }
  if (next === 'pakje') {
    return [`Goed gedaan! Klusje 2 van ${total}:`, 'De bezorger heeft een pakje voor Toby Tol op de parkeerplaats laten staan. Typisch!', 'Breng jij het naar zijn speelgoedwinkel? Te voet of met de auto. Ook 3 kristallen!'];
  }
  if (next === 'bril') {
    return [`Super! Klusje 3 van ${total}:`, 'Opa Duif is zijn bril kwijt. Hij ziet alles wazig, de arme man.', 'Hij was vanochtend bij de hoge flats aan de westkant. Vind jij hem? 4 kristallen!'];
  }
  if (next === 'rondje') {
    return [`Bijna klaar! Klusje 4 van ${total}, het laatste:`, `Rij met je auto een rondje over de grote ringweg, door alle 3 de poortjes, binnen ${LAP_TIME} seconden.`,
      'De START is op de lange weg. Lukt het niet meteen? Gewoon opnieuw proberen! 5 kristallen!',
      ...(noCar ? ['Heb je nog geen auto? In de Autowinkel (rechts) kun je er een kopen. De Mini Muis is niet duur!'] : [])];
  }
  // alles klaar!
  if (state.quest.state === 'held') {
    return ['Alle klusjes gedaan! Jij bent de held van De Stad!', 'O, en Professor Bolt in het dorp wil je iets laten zien. Er is daar iets nieuws verschenen...'];
  }
  return [pick([
    'Dankzij jou is iedereen in De Stad blij. Eendje Ed zwemt weer en Opa Duif ziet weer alles!',
    'Fijne dag in De Stad! Heb je de lolly op het dak van de snoepwinkel al gezien?',
    'Op is op, maar meer kristallen vind je bij de slijmpjes in het Slijmbos!',
  ])];
}

// Wat zeggen de mensen in De Stad?
function cityLines(id, state) {
  const poor = state.crystals < 2;
  const noMoney = poor ? ['Heb je niet zoveel kristallen? Geen zorgen, kijken is gratis!'] : [];
  switch (id) {
    case 'burgemeester': return bertLines(state);
    case 'speelgoed':
      if (activeJob(state) === 'pakje') return ['Hallo! Ik ben Toby Tol.', 'Er zou vandaag een pakje voor mij komen... Heb jij het misschien gezien?'];
      return [pick(['Hallo! Ik ben Toby Tol. Welkom in mijn speelgoedwinkel!', 'Speelgoed, speelgoed! Kom maar kijken!', 'Robotje Bliep is mijn allerbeste uitvinding. Nou ja, na de jojo.']), ...noMoney];
    case 'snoep':
      return [pick(['Dag schatje! Ik ben Tante Toffee. Zin in iets lekkers?', 'Raketsnoep maakt je supersnel. Maar niet te veel, hoor!', 'Mmm, ruik je dat? Verse lollies!']), ...noMoney];
    case 'kleding':
      return [pick(['Bonjour! Ik ben Madame Mouw. Jij hebt een nieuwe look nodig!', 'Een nieuw shirt? Je clones dragen het meteen ook. Trés chic!', 'Goud staat iedereen goed. Vooral helden!']), ...noMoney];
    case 'boek':
      return [pick(['Goedendag. Ik ben Meester Bladwijzer. Lezen is een avontuur!', 'In boeken staan geheimen... en heel veel tips.', 'Het eerste boek krijg je van mij gratis. Lezen is belangrijk!']), ...noMoney];
    case 'dealer':
      if (!state.cars || !state.cars.length) {
        return [
          'Vroem vroem! Welkom in de Autowinkel! Ik ben Vera Vroem.',
          'Kijk maar rond: de Mini Muis, de Jungle Jeep, de Bliksem Sport en de Rode Raket!',
          'Je betaalt met kristallen. Daarna rij je zelf door de garagedeur naar buiten.',
          ...(state.crystals < 12 ? ['Nog niet genoeg kristallen? In het Slijmbos laten slijmpjes ze vallen!'] : []),
        ];
      }
      return [pick([
        'Hoe rijdt hij? Lekker, hè! Toet toet!',
        'Rij voorzichtig, hoor. De autootjes in De Stad stoppen gelukkig altijd voor je.',
        'Binnenkort krijg ik misschien een vliegende auto binnen... sssst, geheim!',
      ])];
    case 'lotte':
      if (state.clones > 0) return ['Wauw, zijn dat allemaal clones van jou?', 'Ik wil ook een clone! Dan kan die mijn huiswerk maken.'];
      return ['Hoi! Ik ben Lotte. Ik woon in De Stad.', 'Wist je dat de autootjes altijd stoppen als je ervoor staat? Superveilig!'];
    case 'opa':
      if (activeJob(state) === 'bril') return ['Ik ben Opa Duif. Oei, ik zie alles wazig...', 'Mijn bril! Vanochtend wandelde ik nog bij de hoge flats aan de westkant. Daar ligt hij vast!'];
      if (jobsDone(state) > 2) return [pick(['Met mijn bril zie ik weer alles scherp! Dankjewel!', 'Kijk, daar vliegt een duif! Die zag ik vroeger nooit.'])];
      return [pick([
        'Ik ben Opa Duif. Ik voer altijd de duiven. Maar waar zijn ze nou?',
        'Vroeger was hier alleen maar gras. Nu is het een hele stad!',
        'Heb je het boek over de verborgen schat al gezien? Er staat iets geheimzinnigs in...',
      ])];
    default: return null;
  }
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
    case 'held':
      return [
        'Held! Ik heb iets geks gevonden in mijn werkplaats...',
        'Een oud briefje met een tekening van een piramide. Er staat: "Het eerste stukje van de schatkaart ligt in de piramide."',
        'Het is de schatkaart van de piraat uit het boek De verborgen schat! En die piramide staat in DE GROTE WOESTIJN.',
        'Ik heb een nieuwe poort gebouwd aan de westkant van het dorp. Hij is nu open!',
        'Maar pas op: de woestijn is heel groot, en er wonen mummieslijmpjes. Neem je clones mee!',
      ];
    case 'woestijn':
      return [
        'In de woestijn staat een Grote Piramide. De deur gaat open met 3 zonnestenen.',
        'Sla elke zonnesteen met je zwaard. Dan schijnt hij! Ze staan bij de ruïnes.',
        'Verdwaal je? Kijk op de kaart, of vraag het aan Kameel Karel bij de oase.',
      ];
    case 'piramide':
      return [
        'De piramide is open? Fantastisch!',
        'Ik heb gehoord dat er een schorpioen woont. Hij heet Sjors. Hij is groot, maar eigenlijk best lief...',
        'Zakt hij in het zand? Kijk naar de schaduw: daar komt hij omhoog!',
      ];
    case 'kaart':
      return [
        'Is dat... het stukje van de schatkaart?! Laat eens zien!',
        'Kijk: een piramide, een palmboom... en een stippellijn die verder loopt!',
        'Dit is stukje 1 van 4. De andere stukjes liggen nog ergens verstopt in de wereld.',
        'Ik bewaar alles in je rugzak. Wordt vervolgd... Jij bent een echte schattenjager!',
      ];
    case 'schat':
      return [
        'Hoe gaat het met de schatkaart? Nog 3 stukjes te gaan!',
        'Ik ben benieuwd waar het volgende stukje ligt... Misschien heeft Dex een idee?',
      ];
    default:
      return [
        'De machine kan nu 10 clones maken. Probeer maar!',
        'Ik ben benieuwd wat jouw volgende avontuur wordt...',
      ];
  }
}

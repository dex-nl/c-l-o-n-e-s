// De winkels in De Stad: speelgoed, snoep, kleding en boeken. Je betaalt met kristallen 💎 (nep-geld uit het spel).
// Dit bestand gebruikt niks uit save.js, zodat save.js de lijstjes hieronder kan gebruiken om saves te controleren.

export const SHIRTS = {
  rood: { icon: '🟥', name: 'Rood shirt', color: 0xe63946 },
  groen: { icon: '🟩', name: 'Groen shirt', color: 0x2a9d8f },
  paars: { icon: '🟪', name: 'Paars shirt', color: 0x9b5de5 },
  ninja: { icon: '⬛', name: 'Ninjapak', color: 0x2d2d2d },
  goud: { icon: '🟨', name: 'Gouden shirt', color: 0xffc300 },
};
export const DEFAULT_SHIRT = { icon: '🟦', name: 'Blauw shirt', color: 0x3a86ff };

export const TOYS = {
  robot: { icon: '🤖', name: 'Robotje Bliep', fun: 'Bliep bliep! Robotje Bliep doet een vrolijk sprongetje.' },
  jojo: { icon: '🪀', name: 'Jojo', fun: 'Zoef... zoef... zoef! De jojo gaat op en neer.' },
  beer: { icon: '🧸', name: 'Knuffelbeer', fun: 'Je geeft je knuffelbeer een dikke knuffel. Aaah!' },
  bal: { icon: '🎾', name: 'Bal voor Knoeper', fun: 'Je gooit de bal hoog in de lucht en vangt hem weer!' },
};

export const CANDIES = {
  raket: { icon: '🚀', name: 'Raketsnoep', info: '20 seconden supersnel rennen!' },
  lolly: { icon: '🍭', name: 'Hartjeslolly', info: 'Al je hartjes weer vol.' },
  knal: { icon: '🎉', name: 'Knalsnoepje', info: 'Pats! Een regen van confetti.' },
};
export const MAX_CANDY = 9; // zoveel snoepjes van één soort passen in je rugzak

export const BOOKS = {
  clones: {
    icon: '📘', name: 'Clones voor beginners',
    lines: [
      'CLONES VOOR BEGINNERS',
      'Les 1: sta even stil. Je clones gaan dan dansen!',
      'Les 2: clones lopen precies over jouw pad, in een rij achter je aan.',
      'Les 3: sta je op een knop? Dan rennen je clones naar de andere knoppen.',
    ],
  },
  slijm: {
    icon: '📗', name: 'Het Slijmboek',
    lines: [
      'HET SLIJMBOEK',
      'Slijmpjes zijn dol op energie. Daarom kwamen ze op de clonemachine af!',
      'Blauwe slijmpjes zijn sterker dan groene. Neem je clones mee!',
      'Koning Slijm springt hoog. Zie je een schaduw op de grond? Snel weglopen!',
    ],
  },
  moppen: {
    icon: '📕', name: 'Moppenboek',
    lines: [
      'HET MOPPENBOEK',
      'Wat zegt een clone tegen een andere clone? "Hé, jij lijkt wel op mij!"',
      'Waarom gaat een slijmpje nooit naar school? Omdat hij altijd blijft plakken!',
      'Wat is groen en springt door het bos? Een slijmpje met een springtouw!',
    ],
  },
  schat: {
    icon: '📙', name: 'De verborgen schat',
    lines: [
      'DE VERBORGEN SCHAT',
      'Lang geleden verstopte een piraat een grote schat, ver achter de bergen.',
      'Niemand heeft hem ooit gevonden. Ze zeggen dat je er een kaart voor nodig hebt...',
      'Een kaart in stukjes, verspreid over de hele wereld.',
      'Wordt vervolgd! (Misschien in hoofdstuk 3?)',
    ],
  },
};

// De vier winkels. kind: welk soort spul het is.
export const CITY_SHOPS = {
  speelgoed: {
    title: 'Speelgoedwinkel van Toby Tol',
    note: 'Speelgoed! Tik in je rugzak 🎒 op je speelgoed om ermee te spelen.',
    items: [
      { id: 'bal', kind: 'toy', price: 3, info: 'Knoeper de hond is er gek op!' },
      { id: 'jojo', kind: 'toy', price: 4, info: 'Zoef, op en neer!' },
      { id: 'beer', kind: 'toy', price: 6, info: 'Zacht en lief.' },
      { id: 'robot', kind: 'toy', price: 12, info: 'Loopt overal met je mee!' },
    ],
  },
  snoep: {
    title: 'Snoepwinkel van Tante Toffee',
    note: 'Je snoep gaat in je rugzak 🎒. Tik erop om het op te eten!',
    items: [
      { id: 'knal', kind: 'candy', price: 1 },
      { id: 'raket', kind: 'candy', price: 2 },
      { id: 'lolly', kind: 'candy', price: 3 },
    ],
  },
  kleding: {
    title: 'Kledingwinkel van Madame Mouw',
    note: 'Een nieuw shirt voor jou, en je clones krijgen precies hetzelfde!',
    items: [
      { id: 'rood', kind: 'shirt', price: 5, info: 'Knalrood!' },
      { id: 'groen', kind: 'shirt', price: 5, info: 'Groen als het bos.' },
      { id: 'paars', kind: 'shirt', price: 6, info: 'Paars is cool.' },
      { id: 'ninja', kind: 'shirt', price: 8, info: 'Stil als een ninja...' },
      { id: 'goud', kind: 'shirt', price: 15, info: 'Glimt in de zon!' },
    ],
  },
  boek: {
    title: 'Boekwinkel van Meester Bladwijzer',
    note: 'Lees je boeken in je rugzak 🎒. Er staan handige tips in!',
    items: [
      { id: 'clones', kind: 'book', price: 0, info: 'Gratis! Handige clone-tips.' },
      { id: 'moppen', kind: 'book', price: 1, info: 'Om je slap te lachen.' },
      { id: 'slijm', kind: 'book', price: 2, info: 'Alles over slijmpjes.' },
      { id: 'schat', kind: 'book', price: 5, info: 'Een geheimzinnig boek...' },
    ],
  },
};

export function itemInfo(item) {
  const list = { toy: TOYS, candy: CANDIES, shirt: SHIRTS, book: BOOKS }[item.kind];
  const d = list[item.id];
  return { icon: d.icon, name: d.name, info: item.info || d.info || '' };
}

// Kun je dit kopen? Geeft een reden terug als het niet kan.
export function whyNotCity(item, state) {
  if (item.kind === 'toy' && state.toys.includes(item.id)) return 'Gekocht';
  if (item.kind === 'shirt' && state.shirts.includes(item.id)) return 'Gekocht';
  if (item.kind === 'book' && state.books.includes(item.id)) return 'Gekocht';
  if (item.kind === 'candy' && (state.candy[item.id] || 0) >= MAX_CANDY) return 'Vol';
  if (state.crystals < item.price) return 'Te weinig 💎';
  return null;
}

export function buildCityShop(body, shopId, state, onBuy, onTooPoor) {
  const shop = CITY_SHOPS[shopId];
  const top = document.createElement('p');
  top.className = 'panel-note';
  top.innerHTML = `Je hebt <b>💎 ${state.crystals}</b> kristallen. ${shop.note}`;
  body.appendChild(top);
  const grid = document.createElement('div');
  grid.className = 'cards';
  for (const item of shop.items) {
    const d = itemInfo(item);
    const reason = whyNotCity(item, state);
    const card = document.createElement('div');
    card.className = 'card';
    const extra = item.kind === 'candy' ? ` <br>In je rugzak: <b>${state.candy[item.id] || 0}</b>` : '';
    card.innerHTML = `<div class="card-icon">${d.icon}</div><div class="card-name">${d.name}</div><div class="card-info">${d.info}${extra}</div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'buy';
    const poor = reason === 'Te weinig 💎';
    btn.disabled = !!reason && !poor; // te weinig kristallen? Dan mag je toch tikken en zeggen we het lief
    if (poor) btn.classList.add('poor');
    const label = item.price === 0 ? 'Gratis!' : `💎 ${item.price}  Koop`;
    btn.textContent = reason === 'Gekocht' || reason === 'Vol' ? `✓ ${reason}` : label;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (poor) onTooPoor(item);
      else if (!btn.disabled) onBuy(item);
    });
    card.appendChild(btn);
    grid.appendChild(card);
  }
  body.appendChild(grid);
}

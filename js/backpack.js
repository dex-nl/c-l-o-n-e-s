// De rugzak: wat heb je allemaal? En welk hoedje draag je?
import { HAT_NAMES } from './characters.js';
import { reached, maxClones, GEARS_NEEDED, MAP_PIECES_TOTAL, JOBS } from './quest.js';
import { SHIRTS, DEFAULT_SHIRT, TOYS, CANDIES, BOOKS } from './cityshop.js';
import { fmt } from './format.js';

const HAT_ICONS = { feest: '🎉', piraat: '🏴‍☠️', cowboy: '🤠', tovenaar: '🧙', kroon: '👑' };

function section(body, title) {
  const h = document.createElement('h3');
  h.textContent = title;
  body.appendChild(h);
  const grid = document.createElement('div');
  grid.className = 'cards small';
  body.appendChild(grid);
  return grid;
}

function item(grid, icon, name, value = '') {
  const c = document.createElement('div');
  c.className = 'card';
  c.innerHTML = `<div class="card-icon">${icon}</div><div class="card-name">${name}</div><div class="card-info">${value}</div>`;
  grid.appendChild(c);
  return c;
}

// city: { onShirt(id), onCandy(id), onToy(id), onBook(id) } voor de spullen uit De Stad
export function buildBackpack(body, state, hearts, onWear, city = null) {
  const q = state.quest;
  const stuff = section(body, 'Spullen');
  if (state.sword) item(stuff, '⚔️', state.sword > 1 ? 'Superzwaard' : 'Zwaard', state.sword > 1 ? 'Goud!' : 'Van Professor Bolt');
  item(stuff, '❤️', 'Hartjes', `${hearts} van ${state.maxHearts}`);
  item(stuff, '💎', 'Kristallen', fmt(state.crystals));
  if (reached(q, 'aan')) item(stuff, '🧬', 'Clones', `${state.clones} van ${maxClones(state)}`);
  if (q.state === 'bezig') item(stuff, '⚙️', 'Tandwielen', `${q.gears.length} van ${GEARS_NEEDED}`);
  if (q.state === 'batterij') item(stuff, '🔋', 'Superbatterij', 'Voor Professor Bolt');
  if (state.mapPieces && state.mapPieces.length && city && city.onMap) {
    const c = item(stuff, '📜', 'Schatkaart', `${state.mapPieces.length} van ${MAP_PIECES_TOTAL} stukjes. Tik om te bekijken`);
    c.classList.add('pick');
    c.id = 'bag-schatkaart';
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); city.onMap(); });
  }
  if (state.cityGift && city && city.onJobs) {
    const n = state.jobs ? state.jobs.done.length : 0;
    const c = item(stuff, '📋', 'Klusjes', n >= JOBS.length ? 'Allemaal klaar! Tik om te bekijken' : `${n} van ${JOBS.length} klaar. Tik om te bekijken`);
    c.classList.add('pick');
    c.id = 'bag-klusjes';
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); city.onJobs(); });
  }

  const hats = section(body, 'Hoedjes');
  const options = [[null, '🧢', 'Rood petje'], ...state.hats.map((id) => [id, HAT_ICONS[id], HAT_NAMES[id]])];
  for (const [id, icon, name] of options) {
    const c = item(hats, icon, name, state.hat === id ? 'Draag je nu' : 'Tik om op te zetten');
    c.classList.add('pick');
    c.classList.toggle('on', state.hat === id);
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); onWear(id); });
  }
  if (!state.hats.length) {
    const p = document.createElement('p');
    p.className = 'panel-note';
    p.textContent = 'Koop hoedjes bij Koopman Kees op het plein. Je clones dragen ze ook!';
    body.appendChild(p);
  }
  if (!city) return;

  // ---------- Spullen uit De Stad ----------
  const tap = (c, fn) => { c.classList.add('pick'); c.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); };
  if (state.shirts.length) {
    const g = section(body, 'Shirts');
    for (const [id, s] of [[null, DEFAULT_SHIRT], ...state.shirts.map((i) => [i, SHIRTS[i]])]) {
      const c = item(g, s.icon, s.name, state.shirt === id ? 'Draag je nu' : 'Tik om aan te trekken');
      c.classList.toggle('on', state.shirt === id);
      tap(c, () => city.onShirt(id));
    }
  }
  const candies = Object.keys(CANDIES).filter((id) => state.candy[id] > 0);
  if (candies.length) {
    const g = section(body, 'Snoep');
    for (const id of candies) tap(item(g, CANDIES[id].icon, `${CANDIES[id].name} ×${state.candy[id]}`, `Tik om te eten: ${CANDIES[id].info}`), () => city.onCandy(id));
  }
  if (state.toys.length) {
    const g = section(body, 'Speelgoed');
    for (const id of state.toys) tap(item(g, TOYS[id].icon, TOYS[id].name, 'Tik om te spelen'), () => city.onToy(id));
  }
  if (state.books.length) {
    const g = section(body, 'Boeken');
    for (const id of state.books) tap(item(g, BOOKS[id].icon, BOOKS[id].name, 'Tik om te lezen'), () => city.onBook(id));
  }
  if (!state.shirts.length && !candies.length && !state.toys.length && !state.books.length) {
    const p = document.createElement('p');
    p.className = 'panel-note';
    p.textContent = 'In De Stad (door de regenboogpoort aan de oostkant van het dorp) zijn nog veel meer winkels!';
    body.appendChild(p);
  }
}

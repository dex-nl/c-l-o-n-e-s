// De rugzak: wat heb je allemaal? En welk hoedje draag je?
import { HAT_NAMES } from './characters.js';
import { reached, maxClones, GEARS_NEEDED } from './quest.js';

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

export function buildBackpack(body, state, hearts, onWear) {
  const q = state.quest;
  const stuff = section(body, 'Spullen');
  if (state.sword) item(stuff, '⚔️', state.sword > 1 ? 'Superzwaard' : 'Zwaard', state.sword > 1 ? 'Goud!' : 'Van Professor Bolt');
  item(stuff, '❤️', 'Hartjes', `${hearts} van ${state.maxHearts}`);
  item(stuff, '💎', 'Kristallen', `${state.crystals}`);
  if (reached(q, 'aan')) item(stuff, '🧬', 'Clones', `${state.clones} van ${maxClones(q)}`);
  if (q.state === 'bezig') item(stuff, '⚙️', 'Tandwielen', `${q.gears.length} van ${GEARS_NEEDED}`);
  if (q.state === 'batterij') item(stuff, '🔋', 'Superbatterij', 'Voor Professor Bolt');

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
}

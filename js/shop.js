// De kraam van Koopman Kees: hoedjes en handige spullen, te koop voor kristallen.
import { MAX_HEARTS } from './save.js';
import { fmt } from './format.js';

export const SHOP = [
  { id: 'feest', icon: '🎉', name: 'Feestmuts', price: 5, kind: 'hoed', info: 'Voor jou én al je clones!' },
  { id: 'piraat', icon: '🏴‍☠️', name: 'Piratenhoed', price: 10, kind: 'hoed', info: 'Arrr, kapitein!' },
  { id: 'cowboy', icon: '🤠', name: 'Cowboyhoed', price: 10, kind: 'hoed', info: 'Jiehaa!' },
  { id: 'tovenaar', icon: '🧙', name: 'Tovenaarshoed', price: 15, kind: 'hoed', info: 'Hocus pocus, clone-us!' },
  { id: 'kroon', icon: '👑', name: 'Kroon', price: 30, kind: 'hoed', info: 'Voor de echte baas van het dorp.' },
  { id: 'hart', icon: '❤️', name: 'Extra hartje', price: 10, kind: 'hart', info: `Kun je meer klappen hebben (tot ${MAX_HEARTS}).` },
  { id: 'superzwaard', icon: '⚔️', name: 'Superzwaard', price: 25, kind: 'zwaard', info: 'Goud en twee keer zo sterk. Ook voor je clones!' },
];

// Kun je dit kopen? Geeft een reden terug als het niet kan.
export function whyNot(item, state) {
  if (item.kind === 'hoed' && state.hats.includes(item.id)) return 'Gekocht';
  if (item.kind === 'hart' && state.maxHearts >= MAX_HEARTS) return 'Vol';
  if (item.kind === 'zwaard' && state.sword >= 2) return 'Gekocht';
  if (item.kind === 'zwaard' && state.sword < 1) return 'Eerst een zwaard';
  if (state.crystals < item.price) return 'Te weinig 💎';
  return null;
}

export function buildShop(body, state, onBuy) {
  const top = document.createElement('p');
  top.className = 'panel-note';
  top.innerHTML = `Je hebt <b>💎 ${fmt(state.crystals)}</b> kristallen. Slijmpjes laten ze vallen!`;
  body.appendChild(top);
  const grid = document.createElement('div');
  grid.className = 'cards';
  for (const item of SHOP) {
    const reason = whyNot(item, state);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="card-icon">${item.icon}</div><div class="card-name">${item.name}</div><div class="card-info">${item.info}</div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'buy';
    btn.disabled = !!reason;
    btn.textContent = reason === 'Gekocht' || reason === 'Vol' ? `✓ ${reason}` : `💎 ${item.price}  Koop`;
    if (reason && reason !== 'Gekocht' && reason !== 'Vol') btn.title = reason;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!btn.disabled) onBuy(item); });
    card.appendChild(btn);
    grid.appendChild(card);
  }
  body.appendChild(grid);
}

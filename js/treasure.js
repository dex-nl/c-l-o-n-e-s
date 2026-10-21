// De schatkaart van de piraat (uit het boek "De verborgen schat"): 4 stukjes.
// Elk stukje dat je vindt wordt op de kaart getekend. De rest is nog een vraagteken.
import { MAP_PIECES_TOTAL } from './quest.js';

// Wat staat er op elk stukje? (linksboven, rechtsboven, linksonder, rechtsonder)
const PIECES = [
  { id: 'woestijn', name: 'De Grote Woestijn' },
  { id: null }, { id: null }, { id: null }, // komen nog!
];

function drawDesert(g, x, y, w, h) {
  // zand
  g.fillStyle = '#f2d38f'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  // piramide
  g.fillStyle = '#d4a017';
  g.beginPath(); g.moveTo(x + w * 0.22, y + h * 0.62); g.lineTo(x + w * 0.42, y + h * 0.25); g.lineTo(x + w * 0.62, y + h * 0.62); g.closePath(); g.fill();
  g.strokeStyle = '#8d6e3f'; g.lineWidth = 2; g.stroke();
  // palmboom
  g.fillStyle = '#8d6e3f'; g.fillRect(x + w * 0.76, y + h * 0.42, 5, h * 0.22);
  g.fillStyle = '#4caf50';
  for (let a = 0; a < 6.2; a += 1.05) { g.beginPath(); g.ellipse(x + w * 0.76 + 2 + Math.cos(a) * 12, y + h * 0.42 + Math.sin(a) * 6, 13, 4, a, 0, 7); g.fill(); }
  // cactus
  g.fillStyle = '#52a447'; g.fillRect(x + w * 0.14, y + h * 0.7, 6, 20); g.fillRect(x + w * 0.14 - 7, y + h * 0.74, 7, 4); g.fillRect(x + w * 0.14 - 7, y + h * 0.68, 4, 8);
  // stippellijn naar de rand: de schat ligt verder!
  g.strokeStyle = '#c1121f'; g.lineWidth = 3; g.setLineDash([6, 6]);
  g.beginPath(); g.moveTo(x + w * 0.42, y + h * 0.66); g.quadraticCurveTo(x + w * 0.7, y + h * 0.85, x + w - 8, y + h * 0.78); g.stroke();
  g.setLineDash([]);
}

export function drawTreasureMap(canvas, pieces) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const pw = W / 2, ph = H / 2;
  PIECES.forEach((p, i) => {
    const x = (i % 2) * pw, y = Math.floor(i / 2) * ph;
    const have = p.id && pieces.includes(p.id);
    // perkament (een beetje scheef afgescheurd)
    g.fillStyle = have ? '#f5e6c4' : 'rgba(120,110,90,0.18)';
    g.beginPath();
    g.moveTo(x + 4, y + 4); g.lineTo(x + pw - 3, y + 6); g.lineTo(x + pw - 5, y + ph - 3); g.lineTo(x + 6, y + ph - 5); g.closePath();
    g.fill();
    g.strokeStyle = have ? '#b08d57' : 'rgba(120,110,90,0.5)'; g.lineWidth = 3;
    g.setLineDash(have ? [] : [8, 6]); g.stroke(); g.setLineDash([]);
    if (have && p.id === 'woestijn') drawDesert(g, x, y, pw, ph);
    if (!have) {
      g.fillStyle = 'rgba(90,80,60,0.6)'; g.font = `bold ${Math.round(ph * 0.4)}px sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('?', x + pw / 2, y + ph / 2);
    }
  });
}

export function buildTreasureMap(body, state) {
  const pieces = state.mapPieces || [];
  const p = document.createElement('p');
  p.className = 'panel-note';
  p.innerHTML = `Je hebt <b>${pieces.length} van de ${MAP_PIECES_TOTAL}</b> stukjes van de schatkaart van de piraat.`;
  body.appendChild(p);
  const c = document.createElement('canvas');
  c.width = 480; c.height = 320;
  c.className = 'treasure-map';
  c.id = 'treasure-canvas';
  body.appendChild(c);
  drawTreasureMap(c, pieces);
  const n = document.createElement('p');
  n.className = 'panel-note';
  n.textContent = pieces.includes('woestijn')
    ? 'Stukje 1: De Grote Woestijn. De rode stippellijn loopt verder... Waar zou het volgende stukje liggen? Wordt vervolgd!'
    : 'Nog geen stukjes gevonden. Misschien weet Professor Bolt meer...';
  body.appendChild(n);
}

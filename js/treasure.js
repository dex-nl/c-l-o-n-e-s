// De schatkaart van de piraat (uit het boek "De verborgen schat"): 10 stukjes.
// Elk stukje dat je vindt wordt op de kaart getekend. De rest is nog een vraagteken.
// De kaart is 5 stukjes breed en 2 hoog (stukje 1 linksboven, stukje 10 rechtsonder).
import { MAP_PIECES, MAP_PIECES_TOTAL } from './quest.js';

const NAMES = { woestijn: 'De Grote Woestijn', doolhof: 'Het Doolhof' };
// Wat staat er op elk stukje? (de stukjes 3 t/m 10 komen nog, zie GAME.md)
const PIECES = Array.from({ length: MAP_PIECES_TOTAL }, (_, i) => ({ id: MAP_PIECES[i] || null, name: NAMES[MAP_PIECES[i]] }));
const COLS = 5;

function drawMaze(g, x, y, w, h) {
  // heg-groen met een kronkelpad naar het midden
  g.fillStyle = '#6fbf73'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
  g.strokeStyle = '#2d6a3e'; g.lineWidth = 4;
  const cx = x + w / 2, cy = y + h / 2;
  for (let r = 1; r <= 3; r++) {
    const rw = (w - 20) * r / 7, rh = (h - 20) * r / 7, gap = r * 1.7;
    g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, gap, gap + Math.PI * 1.65); g.stroke();
  }
  // het pad (rode stippellijn) van de rand naar het midden
  g.strokeStyle = '#c1121f'; g.lineWidth = 3; g.setLineDash([5, 5]);
  g.beginPath(); g.moveTo(x + 6, y + h * 0.82); g.quadraticCurveTo(x + w * 0.3, y + h * 0.95, cx, cy); g.stroke();
  g.setLineDash([]);
  // een kruisje in het midden
  g.strokeStyle = '#c1121f'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(cx - 6, cy - 6); g.lineTo(cx + 6, cy + 6); g.moveTo(cx + 6, cy - 6); g.lineTo(cx - 6, cy + 6); g.stroke();
}

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
  const pw = W / COLS, ph = H / Math.ceil(PIECES.length / COLS);
  PIECES.forEach((p, i) => {
    const x = (i % COLS) * pw, y = Math.floor(i / COLS) * ph;
    const have = p.id && pieces.includes(p.id);
    // perkament (een beetje scheef afgescheurd)
    g.fillStyle = have ? '#f5e6c4' : 'rgba(120,110,90,0.18)';
    g.beginPath();
    g.moveTo(x + 4, y + 4); g.lineTo(x + pw - 3, y + 6); g.lineTo(x + pw - 5, y + ph - 3); g.lineTo(x + 6, y + ph - 5); g.closePath();
    g.fill();
    g.strokeStyle = have ? '#b08d57' : 'rgba(120,110,90,0.5)'; g.lineWidth = 3;
    g.setLineDash(have ? [] : [8, 6]); g.stroke(); g.setLineDash([]);
    if (have && p.id === 'woestijn') drawDesert(g, x, y, pw, ph);
    if (have && p.id === 'doolhof') drawMaze(g, x, y, pw, ph);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!have) {
      g.fillStyle = 'rgba(90,80,60,0.6)'; g.font = `bold ${Math.round(ph * 0.4)}px sans-serif`;
      g.fillText('?', x + pw / 2, y + ph / 2);
    }
    // het nummer van het stukje (klein, in de hoek)
    g.fillStyle = have ? '#5c4320' : 'rgba(90,80,60,0.7)'; g.font = `bold ${Math.round(ph * 0.13)}px sans-serif`;
    g.fillText(String(i + 1), x + 16, y + 18);
  });
}

export function buildTreasureMap(body, state) {
  const pieces = state.mapPieces || [];
  const p = document.createElement('p');
  p.className = 'panel-note';
  p.innerHTML = `Je hebt <b>${pieces.length} van de ${MAP_PIECES_TOTAL}</b> stukjes van de schatkaart van de piraat.`;
  body.appendChild(p);
  const c = document.createElement('canvas');
  c.width = 600; c.height = 280;
  c.className = 'treasure-map';
  c.id = 'treasure-canvas';
  body.appendChild(c);
  drawTreasureMap(c, pieces);
  const n = document.createElement('p');
  n.className = 'panel-note';
  const names = PIECES.map((p, i) => (p.id && pieces.includes(p.id) ? `Stukje ${i + 1}: ${p.name}.` : null)).filter(Boolean);
  n.textContent = names.length
    ? `${names.join(' ')} De rode stippellijn loopt verder... Waar zou het volgende stukje liggen?${pieces.length < MAP_PIECES.length ? '' : ' Wordt vervolgd!'}`
    : 'Nog geen stukjes gevonden. Misschien weet Professor Bolt meer...';
  body.appendChild(n);
}

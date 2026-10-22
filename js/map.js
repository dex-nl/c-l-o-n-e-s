// De kaart: de zone van bovenaf, met jou, je clones, de slijmpjes en een ster waar je heen moet.
// info: { zone, player, clones, enemies, npcs, target, labels }
export function buildMap(body, info) {
  const { zone } = info;
  const canvas = document.createElement('canvas');
  const W = 620, H = 420, dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.className = 'map';
  body.appendChild(canvas);
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);

  // Welk stuk van de wereld laten we zien?
  const B = zone.bounds;
  const box = B.r ? { minX: B.x - B.r - 2, maxX: B.x + B.r + 2, minZ: B.z - B.r - 2, maxZ: B.z + B.r + 2 }
    : { minX: B.minX - 2, maxX: B.maxX + 2, minZ: B.minZ - 2, maxZ: B.maxZ + 2 };
  const scale = Math.min(W / (box.maxX - box.minX), H / (box.maxZ - box.minZ));
  const ox = (W - (box.maxX - box.minX) * scale) / 2, oz = (H - (box.maxZ - box.minZ) * scale) / 2;
  const px = (x) => ox + (x - box.minX) * scale;
  const pz = (z) => oz + (z - box.minZ) * scale;
  const cave = zone.id === 'grot' || zone.id === 'piramide';
  const sand = zone.id === 'woestijn' || zone.id === 'piramide';

  g.fillStyle = zone.id === 'piramide' ? '#1a1008' : zone.id === 'woestijn' ? '#c9954f' : cave ? '#120d1f' : '#2f5e3a';
  g.fillRect(0, 0, W, H);
  // de plek waar je kunt lopen
  g.fillStyle = zone.id === 'piramide' ? '#c9a46a' : zone.id === 'woestijn' ? '#f2d38f' : cave ? '#3b3049' : zone.id === 'bos' ? '#6aa84f' : zone.id === 'stad' ? '#8fcf73' : '#8bd36b';
  if (zone.drawMap) zone.drawMap(g, px, pz, scale); // het doolhof tekent zelf (alleen wat je al gezien hebt)
  else if (B.r) { g.beginPath(); g.arc(px(B.x), pz(B.z), B.r * scale, 0, Math.PI * 2); g.fill(); }
  else g.fillRect(px(B.minX), pz(B.minZ), (B.maxX - B.minX) * scale, (B.maxZ - B.minZ) * scale);

  // muren en rotsen
  g.fillStyle = sand ? '#8d6e3f' : cave ? '#5a4d6b' : '#7d7068';
  if (!zone.drawMap) for (const b of zone.boxes) if (!b.off) g.fillRect(px(b.x - b.hw), pz(b.z - b.hd), b.hw * 2 * scale, b.hd * 2 * scale);
  // bomen en gebouwen
  if (!zone.drawMap) for (const c of zone.colliders) {
    g.fillStyle = sand ? (c.r < 0.8 ? '#3f8a3a' : '#d9a65e') : c.r < 1.3 ? '#1b4332' : '#e9cf8f';
    g.beginPath(); g.arc(px(c.x), pz(c.z), Math.max(2.5, c.r * scale), 0, Math.PI * 2); g.fill();
  }
  // vijver, plein en andere gekleurde plekken
  for (const m of zone.mapItems || []) {
    g.fillStyle = m.color;
    if (m.r) { g.beginPath(); g.arc(px(m.x), pz(m.z), m.r * scale, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(px(m.x - m.w / 2), pz(m.z - m.d / 2), m.w * scale, m.d * scale);
  }

  const dot = (x, z, r, color, stroke = null) => {
    g.fillStyle = color;
    g.beginPath(); g.arc(px(x), pz(z), r, 0, Math.PI * 2); g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
  };
  const seen = (x, z) => !zone.isSeen || zone.isSeen(x, z);
  for (const e of info.enemies) if (!e.dead && seen(e.pos.x, e.pos.z)) dot(e.pos.x, e.pos.z, e.king || e.boss ? 10 : 5, '#ff4d6d', '#5c0018');
  for (const n of info.npcs) dot(n.pos.x, n.pos.z, 6, '#ffd23f', '#7a5c00');
  for (const c of info.clones) dot(c.pos.x, c.pos.z, 4.5, '#7af7ff', '#1b6ca8');

  g.font = 'bold 13px "Trebuchet MS", sans-serif';
  g.textAlign = 'center';
  for (const l of info.labels) {
    if (l.show && !l.show()) continue;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    const w = g.measureText(l.text).width + 10;
    g.fillRect(px(l.x) - w / 2, pz(l.z) - 9, w, 18);
    g.fillStyle = '#fff';
    g.fillText(l.text, px(l.x), pz(l.z) + 4);
  }

  // jij: een pijl die laat zien welke kant je op kijkt
  const p = info.player;
  g.save();
  g.translate(px(p.pos.x), pz(p.pos.z));
  g.rotate(-p.rot + Math.PI);
  g.fillStyle = '#e63946'; g.strokeStyle = '#fff'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath();
  g.fill(); g.stroke();
  g.restore();

  // de ster: waar moet je heen?
  if (info.target) {
    g.font = '24px sans-serif';
    g.fillText('⭐', px(info.target.x), pz(info.target.z) + 8);
  }

  const legend = document.createElement('p');
  legend.className = 'panel-note map-legend';
  legend.innerHTML = '<span style="color:#e63946">▲</span> jij &nbsp; <span style="color:#1b9fc4">●</span> clones &nbsp; <span style="color:#c9a000">●</span> mensen &nbsp; <span style="color:#ff4d6d">●</span> slijmpjes &nbsp; ⭐ hier moet je heen';
  body.appendChild(legend);
}

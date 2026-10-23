// Samen spelen (idee van Dex): met een code speel je met maximaal 3 vrienden in dezelfde wereld.
// - Peer-to-peer met PeerJS (van een CDN). Er is geen eigen server: de gratis PeerJS-server
//   helpt alleen om elkaar te vinden, daarna praten de computers rechtstreeks met elkaar.
// - De speler die de code maakt is de "host": alle anderen verbinden met hem, hij stuurt alles door.
// - We sturen ALLEEN: welk nummer je bent, in welke wereld je bent, waar je staat, welke kant je op
//   kijkt, en of je in een auto zit. Geen namen, geen chat, geen kristallen, geen codes, geen save.
import * as THREE from 'three';
import { makeHero, setShirt, animateWalk } from './characters.js';
import { makeCarModel, CAR_ORDER } from './autowinkel.js';

export const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
export const PEER_PREFIX = 'clones-dex-'; // zo botsen we niet met andere spellen op de PeerJS-server
export const MAX_PLAYERS = 4;
export const SEND_HZ = 10;
const JOIN_TIMEOUT = 12000;
// Kindvriendelijke codes: een woordje en 4 cijfers, bijvoorbeeld BOS-4821
const WORDS = ['BOS', 'ZON', 'MAAN', 'KAT', 'UIL', 'VOS', 'BIJ', 'EEND', 'HAAI', 'ROOS', 'STER', 'WOLK', 'BEER', 'VIS'];
export const PLAYER_COLORS = [0xff8c42, 0xff595e, 0x8ac926, 0xb15eff]; // speler 1 (host), 2, 3, 4
export const playerName = (slot) => `Speler ${slot + 1}`;

export function makeCode(rand = Math.random) {
  const w = WORDS[Math.floor(rand() * WORDS.length)];
  return `${w}-${String(1000 + Math.floor(rand() * 9000))}`;
}
// "bos 4821", "Bos4821" en "BOS-4821" worden allemaal "BOS-4821". Klopt het niet? Dan null.
export function cleanCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = s.match(/^([A-Z]{2,5})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}
export const peerIdFor = (code) => PEER_PREFIX + code.toLowerCase();

let peerLib = null;
function loadPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerLib) return peerLib;
  peerLib = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL; s.async = true;
    s.onload = () => (window.Peer ? ok(window.Peer) : fail(new Error('geen Peer')));
    s.onerror = () => { peerLib = null; fail(new Error('laden mislukt')); };
    document.head.appendChild(s);
  });
  return peerLib;
}

// Een berichtje van een ander: alleen bekende dingen, en alleen nette getallen
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
export function cleanState(d, zones) {
  if (!d || typeof d !== 'object') return null;
  const x = num(d.x, -600, 600), z = num(d.z, -600, 600), r = num(d.r, -50, 50), y = num(d.y, 0, 20) ?? 0;
  if (x === null || z === null || r === null || !zones.includes(d.w)) return null;
  const c = CAR_ORDER.includes(d.c) ? d.c : '';
  return { w: d.w, x, z, r, y, c };
}

// ---------- Een andere speler in jouw wereld ----------
function nameTag(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath(); g.roundRect(4, 6, 248, 52, 26); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#' + color.toString(16).padStart(6, '0'); g.stroke();
  g.fillStyle = '#2d3142'; g.font = 'bold 34px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(2.0, 0.5, 1);
  sp.renderOrder = 10;
  return sp;
}

class Remote {
  constructor(scene, slot) {
    this.slot = slot;
    this.scene = scene;
    this.g = new THREE.Group();
    this.ch = makeHero();
    setShirt(this.ch, PLAYER_COLORS[slot]);
    this.g.add(this.ch.group);
    this.tag = nameTag(playerName(slot), PLAYER_COLORS[slot]);
    this.tag.position.y = 2.7;
    this.g.add(this.tag);
    this.car = null; this.carId = '';
    this.pos = new THREE.Vector3(); this.rot = 0; this.y = 0;
    this.target = null; this.phase = 0; this.walk = 0;
    this.g.visible = false;
    scene.add(this.g);
  }
  set(s) {
    const first = !this.target;
    this.target = s;
    if (first) { this.pos.set(s.x, 0, s.z); this.rot = s.r; this.y = s.y; }
    if (s.c !== this.carId) {
      if (this.car) { this.g.remove(this.car.g); this.car = null; }
      this.carId = s.c;
      if (s.c) { try { this.car = makeCarModel(s.c); this.g.add(this.car.g); } catch (e) { this.car = null; } }
    }
  }
  update(dt, zoneId) {
    const s = this.target;
    this.g.visible = !!s && s.w === zoneId;
    if (!this.g.visible) return;
    // rustig naar de nieuwe plek glijden (de berichtjes komen maar 10 keer per seconde)
    const k = 1 - Math.exp(-dt * 12);
    const before = this.pos.clone();
    const far = Math.hypot(s.x - this.pos.x, s.z - this.pos.z) > 12; // heel ver weg (bijvoorbeeld door een poort): meteen erheen
    if (far) this.pos.set(s.x, 0, s.z); else { this.pos.x += (s.x - this.pos.x) * k; this.pos.z += (s.z - this.pos.z) * k; }
    let dr = s.r - this.rot;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    this.rot += dr * k;
    this.y += (s.y - this.y) * k;
    const speed = dt > 0 ? before.distanceTo(this.pos) / dt : 0;
    this.walk += ((speed > 0.4 ? 1 : 0) - this.walk) * Math.min(1, dt * 8);
    this.phase += dt * 11;
    this.g.position.set(this.pos.x, 0, this.pos.z);
    if (this.car) {
      this.ch.group.visible = false;
      this.car.g.position.set(0, this.y, 0);
      this.car.g.rotation.set(0, this.rot, 0);
      this.tag.position.y = 2.6 + this.y;
    } else {
      this.ch.group.visible = true;
      this.ch.group.rotation.y = this.rot;
      animateWalk(this.ch, this.phase, this.walk);
      this.tag.position.y = 2.7;
    }
  }
  remove() { this.scene.remove(this.g); this.tag.material.map.dispose(); this.tag.material.dispose(); }
}

// ---------- Het netwerk ----------
// getLocal() geeft { w, x, z, r, y, c } van jezelf. onChange(status) wordt geroepen als er iets verandert.
export function createNet({ scene, zones, getLocal, onChange, onToast }) {
  const net = {
    mode: 'uit',      // 'uit' | 'host' | 'join'
    status: 'uit',    // 'uit' | 'laden' | 'wachten' | 'verbinden' | 'verbonden' | 'fout'
    code: null,
    slot: 0,
    error: '',
    remotes: new Map(), // slot -> Remote
    get friends() { return [...this.remotes.values()].filter((r) => r.target).length; },
  };
  let peer = null, hostConn = null, sendT = 0, joinTimer = null;
  const conns = new Map(); // (host) slot -> conn
  const changed = () => onChange && onChange(net);
  const fail = (msg) => { stop(true); net.status = 'fout'; net.error = msg; changed(); };

  const remoteFor = (slot) => {
    let r = net.remotes.get(slot);
    if (!r) { r = new Remote(scene, slot); net.remotes.set(slot, r); }
    return r;
  };
  const dropRemote = (slot) => { const r = net.remotes.get(slot); if (r) { r.remove(); net.remotes.delete(slot); } };

  function stop(quiet = false) {
    clearTimeout(joinTimer);
    for (const c of conns.values()) { try { c.close(); } catch (e) { /* al dicht */ } }
    conns.clear();
    if (hostConn) { try { hostConn.close(); } catch (e) { /* al dicht */ } }
    hostConn = null;
    if (peer) { try { peer.destroy(); } catch (e) { /* al weg */ } }
    peer = null;
    for (const slot of [...net.remotes.keys()]) dropRemote(slot);
    net.mode = 'uit'; net.status = 'uit'; net.code = null; net.slot = 0; net.error = '';
    if (!quiet) changed();
  }
  net.stop = () => stop(false);

  // ----- Code maken (host) -----
  net.host = async (tries = 3) => {
    stop(true);
    net.mode = 'host'; net.status = 'laden'; changed();
    let Peer;
    try { Peer = await loadPeerJS(); } catch (e) { fail('Samen spelen lukt nu niet (geen internet?)'); return; }
    if (net.mode !== 'host') return;
    const code = makeCode();
    peer = new Peer(peerIdFor(code));
    peer.on('open', () => { net.code = code; net.slot = 0; net.status = 'wachten'; changed(); });
    peer.on('error', (err) => {
      if (err && err.type === 'unavailable-id' && tries > 1) { net.host(tries - 1); return; } // code bestaat al: nieuwe code
      if (err && err.type === 'peer-unavailable') return; // (komt niet voor bij de host)
      if (net.status === 'verbonden' || net.status === 'wachten') { onToast && onToast('😕 Er ging iets mis met samen spelen.'); return; }
      fail('Samen spelen lukt nu niet. Probeer het later nog eens.');
    });
    peer.on('disconnected', () => { if (peer && !peer.destroyed) { try { peer.reconnect(); } catch (e) { /* laat maar */ } } });
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        let slot = 1;
        while (conns.has(slot)) slot++;
        if (slot >= MAX_PLAYERS) { conn.send({ t: 'vol' }); setTimeout(() => conn.close(), 400); return; }
        conns.set(slot, conn);
        conn.slot = slot;
        conn.send({ t: 'welkom', slot });
        net.status = 'verbonden';
        onToast && onToast(`🤝 ${playerName(slot)} doet mee!`);
        changed();
      });
      conn.on('data', (d) => {
        if (!conn.slot || !d || d.t !== 's') return;
        const s = cleanState(d, zones);
        if (!s) return;
        remoteFor(conn.slot).set(s);
        // doorsturen naar de anderen
        for (const [slot, c] of conns) if (slot !== conn.slot && c.open) c.send({ t: 's', slot: conn.slot, ...s });
      });
      conn.on('close', () => {
        if (!conn.slot || conns.get(conn.slot) !== conn) return;
        conns.delete(conn.slot);
        dropRemote(conn.slot);
        for (const c of conns.values()) if (c.open) c.send({ t: 'weg', slot: conn.slot });
        onToast && onToast(`👋 ${playerName(conn.slot)} is weg.`);
        if (!conns.size && net.mode === 'host') net.status = 'wachten';
        changed();
      });
    });
  };

  // ----- Code invoeren (vriend) -----
  net.join = async (raw) => {
    const code = cleanCode(raw);
    if (!code) { stop(true); net.status = 'fout'; net.error = 'Zo ziet een code er niet uit. Bijvoorbeeld: BOS-4821'; changed(); return; }
    stop(true);
    net.mode = 'join'; net.status = 'laden'; net.code = code; changed();
    let Peer;
    try { Peer = await loadPeerJS(); } catch (e) { fail('Samen spelen lukt nu niet (geen internet?)'); return; }
    if (net.mode !== 'join') return;
    peer = new Peer();
    joinTimer = setTimeout(() => { if (net.status !== 'verbonden') fail('Code niet gevonden'); }, JOIN_TIMEOUT);
    peer.on('error', (err) => {
      if (err && err.type === 'peer-unavailable') { fail('Code niet gevonden'); return; }
      if (net.status === 'verbonden') return;
      fail('Samen spelen lukt nu niet. Probeer het later nog eens.');
    });
    peer.on('open', () => {
      net.status = 'verbinden'; changed();
      hostConn = peer.connect(peerIdFor(code), { reliable: true });
      hostConn.on('data', (d) => {
        if (!d || typeof d !== 'object') return;
        if (d.t === 'welkom' && Number.isInteger(d.slot) && d.slot > 0 && d.slot < MAX_PLAYERS) {
          clearTimeout(joinTimer);
          net.slot = d.slot; net.status = 'verbonden';
          onToast && onToast('🤝 Verbonden! Je speelt samen.');
          changed();
        } else if (d.t === 'vol') {
          fail('Dit spel is vol (er doen al 4 spelers mee).');
        } else if (d.t === 's' && Number.isInteger(d.slot) && d.slot >= 0 && d.slot < MAX_PLAYERS && d.slot !== net.slot) {
          const s = cleanState(d, zones);
          if (s) { const had = net.friends; remoteFor(d.slot).set(s); if (net.friends !== had) changed(); }
        } else if (d.t === 'weg' && Number.isInteger(d.slot)) {
          dropRemote(d.slot); changed();
        }
      });
      hostConn.on('close', () => {
        if (net.mode !== 'join') return;
        const was = net.status === 'verbonden';
        fail(was ? 'De verbinding is weg. Maak een nieuwe code of probeer opnieuw.' : 'Code niet gevonden');
        if (was) onToast && onToast('📴 De verbinding is weg.');
      });
    });
  };

  // ----- Elke beeldje: sturen (10 keer per seconde) en de anderen laten bewegen -----
  net.update = (dt, zoneId) => {
    for (const r of net.remotes.values()) r.update(dt, zoneId);
    if (net.status !== 'verbonden') return;
    sendT -= dt;
    if (sendT > 0) return;
    sendT = 1 / SEND_HZ;
    const me = cleanState(getLocal(), zones);
    if (!me) return;
    if (net.mode === 'host') { for (const c of conns.values()) if (c.open) c.send({ t: 's', slot: 0, ...me }); }
    else if (hostConn && hostConn.open) hostConn.send({ t: 's', ...me });
  };
  window.addEventListener('pagehide', () => stop(true));
  return net;
}

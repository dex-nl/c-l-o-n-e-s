// C.L.O.N.E.S - app op het beginscherm
// Zet de service worker aan (alleen op https of localhost). Gaat het mis, dan speel je gewoon verder.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
  });
}

// Getallen netjes opschrijven, op z'n Nederlands: 10000 -> "10.000"
export function fmt(n) {
  const s = String(Math.round(Number(n) || 0));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

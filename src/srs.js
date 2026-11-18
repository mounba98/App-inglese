// Ripasso a intervalli (Leitner a 5 box). Date locali YYYY-MM-DD.
const INTERVALS = [0, 1, 3, 7, 14]; // giorni per box 1..5

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function addDays(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  return fmt(new Date(y, m - 1, d + days));
}

export function todayLocal(now = new Date()) {
  return fmt(now);
}

export function nextReview(card, correct, today) {
  const box = correct ? Math.min(card.box + 1, 5) : 1;
  return { box, due: addDays(today, INTERVALS[box - 1]) };
}

// Ordina per due, poi box; a parità resta l'ordine di input (sort stabile).
export function dueCards(cards, today) {
  return Object.entries(cards)
    .filter(([, c]) => c.due <= today)
    .sort(([, a], [, b]) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box))
    .map(([id]) => id);
}

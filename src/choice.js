// Opzioni per la scelta multipla: la risposta giusta più qualche distrattore.
import { normalize } from './check.js';

export function pickOptions(item, pool, rng = Math.random, n = 3) {
  const vietate = new Set([item.en, ...(item.accept ?? [])].map(normalize));
  const candidati = [];
  for (const p of pool ?? []) {
    const en = typeof p === 'string' ? p : p?.en;
    if (typeof en !== 'string') continue;
    const k = normalize(en);
    if (k === '' || vietate.has(k)) continue;
    vietate.add(k); // niente doppioni tra i distrattori
    candidati.push(en);
  }
  const mescola = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const scelti = mescola(candidati).slice(0, Math.max(0, n - 1));
  return mescola([item.en, ...scelti]);
}

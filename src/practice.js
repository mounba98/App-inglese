// Allenamento libero: sceglie parole già studiate, più spesso quelle deboli. Nessun DOM.
export function pickPractice(state, content, rng = Math.random, n = 8) {
  const done = new Set(state.completed);
  const seen = new Set();
  const pool = [];
  const groups = [...(content.levels ?? []), ...(content.topics ?? [])];
  for (const g of groups) {
    for (const lesson of g.lessons) {
      if (!done.has(lesson.id)) continue;
      for (const it of lesson.items) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        pool.push(it);
      }
    }
  }
  const out = [];
  const weight = (it) => 6 - (state.cards[it.id]?.box ?? 1);
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((s, it) => s + weight(it), 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= weight(pool[i]);
      if (r < 0) break;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

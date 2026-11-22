// Stato di una lezione nella schermata «Tutte le lezioni»: logica pura, nessun DOM.
// unlocked: la lezione è sbloccata. Una lezione fatta resta sempre aperta.
export function lessonStatus(lesson, state, unlocked) {
  const done = Array.isArray(state?.completed) && state.completed.includes(lesson.id);
  if (done) {
    const cards = state?.cards ?? {};
    const weak = (lesson.items ?? []).some((it) => cards[it.id]?.box === 1);
    return weak ? 'da-ripassare' : 'fatta';
  }
  return unlocked ? 'da-fare' : 'bloccata';
}

export const STATUS_LABEL = {
  'da-fare': 'Da fare',
  fatta: 'Fatta',
  'da-ripassare': 'Da ripassare',
  bloccata: 'Bloccata',
};

// Spezza un testo in paragrafi (righe vuote o a capo).
export function paragraphs(text) {
  return String(text ?? '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
}

// Opzioni sbagliate della scelta multipla: solo parole che la studentessa ha già visto.
// - se la lezione ha almeno 3 parole, bastano le sue;
// - altrimenti si usano le parole delle lezioni del gruppo fino a questa inclusa;
// - se ancora meno di 3, tutte le parole del gruppo.
export function distractorPool(lesson, groupLessons) {
  const own = lesson.items ?? [];
  if (own.length >= 3) return own;
  const group = groupLessons ?? [lesson];
  const idx = group.findIndex((l) => l === lesson || l.id === lesson.id);
  const upTo = idx >= 0 ? group.slice(0, idx + 1) : [lesson];
  const seen = upTo.flatMap((l) => l.items ?? []);
  if (seen.length >= 3) return seen;
  return group.flatMap((l) => l.items ?? []);
}

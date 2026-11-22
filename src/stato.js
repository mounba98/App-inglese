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

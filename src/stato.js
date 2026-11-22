// Lezione di solo ascolto (es. l'alfabeto): niente domande, carte di ripasso o allenamento.
export const isAscolto = (lesson) => lesson?.tipo === 'ascolto';

// Gli elementi delle carte da ripassare: tolti quelli delle lezioni di solo ascolto
// (anche se un vecchio salvataggio ha ancora carte con quegli id) e gli id che non esistono più.
export function reviewableItems(dueIds, groups) {
  const byId = new Map();
  const skip = new Set();
  for (const g of groups) {
    for (const lesson of g.lessons) {
      for (const it of lesson.items) {
        if (isAscolto(lesson)) skip.add(it.id);
        else byId.set(it.id, it);
      }
    }
  }
  return dueIds.filter((id) => !skip.has(id)).map((id) => byId.get(id)).filter(Boolean);
}

// Stato di una lezione nella schermata «Tutte le lezioni»: logica pura, nessun DOM.
// unlocked: la lezione è sbloccata. Una lezione fatta resta sempre aperta.
export function lessonStatus(lesson, state, unlocked) {
  const done = Array.isArray(state?.completed) && state.completed.includes(lesson.id);
  if (done) {
    if (isAscolto(lesson)) return 'fatta'; // solo ascolto: niente carte, niente ripasso
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
  const group = (groupLessons ?? [lesson]).filter((l) => l === lesson || l.id === lesson.id || !isAscolto(l));
  const idx = group.findIndex((l) => l === lesson || l.id === lesson.id);
  const upTo = idx >= 0 ? group.slice(0, idx + 1) : [lesson];
  const seen = upTo.flatMap((l) => l.items ?? []);
  if (seen.length >= 3) return seen;
  return group.flatMap((l) => l.items ?? []);
}

// Come si presenta la scelta multipla: 'ascolto' (si ascolta, l'italiano resta nascosto fino alla risposta)
// solo se la lezione lo chiede (scelta: "ascolto") e l'audio si può riprodurre; altrimenti 'lettura'.
export function choiceMode(lesson, canPlay) {
  return lesson?.scelta === 'ascolto' && canPlay ? 'ascolto' : 'lettura';
}

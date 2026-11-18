// Progressi dell'utente: lezioni completate e carte di ripasso. Salvataggio best-effort.
import { nextReview } from './srs.js';

const KEY = 'inglese-v1';
// Gli argomenti si aprono quando sono finite tutte le lezioni dei primi 6 livelli.
export const TOPICS_AFTER_LEVELS = 6;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const initial = () => ({ completed: [], cards: {}, topicsOpen: false });

function sanitize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return initial();
  if (!Array.isArray(raw.completed)) return initial();
  if (!raw.cards || typeof raw.cards !== 'object' || Array.isArray(raw.cards)) return initial();
  const completed = [...new Set(raw.completed.filter((x) => typeof x === 'string'))];
  const cards = {};
  for (const [id, c] of Object.entries(raw.cards)) {
    if (
      c && typeof c === 'object' &&
      Number.isInteger(c.box) && c.box >= 1 && c.box <= 5 &&
      typeof c.due === 'string' && YMD.test(c.due)
    ) {
      cards[id] = { box: c.box, due: c.due };
    }
  }
  return { completed, cards, topicsOpen: raw.topicsOpen === true };
}

function load(storage) {
  if (!storage) return initial();
  try {
    const raw = storage.getItem(KEY);
    if (raw == null) return initial();
    return sanitize(JSON.parse(raw));
  } catch {
    return initial();
  }
}

export function createProgress(storage) {
  let state = load(storage);

  const save = () => {
    if (!storage) return;
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage pieno o non disponibile: si continua in memoria
    }
  };

  const flat = (levels) => levels.flatMap((l) => l.lessons);

  return {
    get() {
      return {
        completed: [...state.completed],
        cards: Object.fromEntries(Object.entries(state.cards).map(([k, c]) => [k, { ...c }])),
        topicsOpen: state.topicsOpen,
      };
    },
    completeLesson(id) {
      if (!state.completed.includes(id)) state.completed.push(id);
      save();
    },
    recordAnswer(cardId, correct, today) {
      const card = state.cards[cardId] ?? { box: 1, due: today };
      state.cards[cardId] = nextReview(card, correct, today);
      save();
    },
    isLessonUnlocked(lessonId, levels) {
      const lessons = flat(levels);
      const i = lessons.findIndex((l) => l.id === lessonId);
      if (i < 0) return false;
      return i === 0 || state.completed.includes(lessons[i - 1].id);
    },
    topicsUnlocked(levels) {
      if (state.topicsOpen) return true; // una volta sbloccati, restano aperti
      const lessons = flat(levels.slice(0, TOPICS_AFTER_LEVELS));
      if (lessons.length > 0 && lessons.every((l) => state.completed.includes(l.id))) {
        state.topicsOpen = true;
        save();
        return true;
      }
      return false;
    },
  };
}

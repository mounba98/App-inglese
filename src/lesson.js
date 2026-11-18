// Logica pura del flusso di una lezione: nessun DOM.
import { isCorrect } from './check.js';

export function createLessonFlow(lesson) {
  const items = lesson.items;
  let index = 0;
  let step = 'learn';
  let wrong = 0;
  let locked = false; // vero dopo un cambio di stato, finché current() non viene riletto
  const results = {};

  const nextItem = () => {
    index += 1;
    step = 'learn';
    wrong = 0;
  };

  return {
    current() {
      locked = false;
      if (index >= items.length) return { step: 'done' };
      const c = { step, item: items[index] };
      if (step === 'write') c.showSolution = wrong >= 2;
      return c;
    },
    advance() {
      if (locked || index >= items.length) return;
      if (step === 'learn') step = 'repeat';
      else if (step === 'repeat') step = 'write';
      else if (wrong >= 2) {
        results[items[index].id] = false;
        nextItem();
      } else return;
      locked = true;
    },
    submit(answer) {
      if (locked || index >= items.length || step !== 'write' || wrong >= 2) return false;
      const item = items[index];
      locked = true;
      if (isCorrect(answer, item.accept ?? [item.en])) {
        results[item.id] = wrong === 0;
        nextItem();
        return true;
      }
      wrong += 1;
      results[item.id] = false;
      return false;
    },
    results() {
      return { ...results };
    },
  };
}

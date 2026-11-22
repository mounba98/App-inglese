// Logica pura del flusso di una lezione: nessun DOM.
import { regoleLingua, maskAnswer } from './lingua.js';
import { pickOptions } from './choice.js';

// L'aiuto e il confronto stanno in lingua.js; maskAnswer resta esportata da qui.
export { maskAnswer };

// startAt: 'write' salta teoria, learn e choose (ripasso: prima si prova a scrivere).
export function createLessonFlow(
  lesson,
  { startAt = 'learn', dictation = false, pool = null, rng = Math.random, regole = 'latino' } = {},
) {
  const { isCorrect, maskAnswer: mask } = regoleLingua(regole);
  const items = lesson.items;
  const fromLearn = startAt !== 'write';
  const firstStep = fromLearn ? 'learn' : 'write';
  let index = 0;
  let step = fromLearn && lesson.teoria ? 'teoria' : firstStep;
  let wrong = 0;
  let hintLevel = 0;
  let options = null; // calcolate una volta per elemento
  let picked = null; // scelta sbagliata già data nel passo choose
  let locked = false; // vero dopo un cambio di stato, finché current() non viene riletto
  const results = {};

  const nextItem = () => {
    index += 1;
    step = firstStep;
    wrong = 0;
    hintLevel = 0;
    options = null;
    picked = null;
  };

  const solutionShown = () => wrong >= 2 || hintLevel >= 2;

  return {
    current() {
      locked = false;
      if (index >= items.length) return { step: 'done' };
      if (step === 'teoria') return { step: 'teoria', teoria: lesson.teoria };
      const item = items[index];
      const c = { step, item };
      if (step === 'choose') {
        c.options = options;
        if (picked !== null) {
          c.picked = picked;
          c.ok = false;
        }
      } else if (step === 'write') {
        c.showSolution = solutionShown();
        if (hintLevel === 1) c.hint = mask(item.en);
        if (dictation) c.dictation = true;
      }
      return c;
    },
    advance() {
      if (locked || index >= items.length) return;
      if (step === 'teoria') step = 'learn';
      else if (step === 'learn') {
        options = pickOptions(items[index], pool ?? items, rng);
        step = options.length >= 2 ? 'choose' : 'write';
      } else if (step === 'choose') {
        if (picked === null) return;
        step = 'write';
      } else if (solutionShown()) {
        results[items[index].id] = false;
        nextItem();
      } else return;
      locked = true;
    },
    choose(option) {
      if (locked || index >= items.length || step !== 'choose' || picked !== null) return false;
      const item = items[index];
      locked = true;
      if (option === item.en) {
        step = 'write';
        return true;
      }
      picked = option;
      results[item.id] = false;
      return false;
    },
    hint() {
      if (locked || index >= items.length || step !== 'write' || solutionShown()) return 0;
      hintLevel += 1;
      results[items[index].id] = false;
      locked = true;
      return hintLevel;
    },
    submit(answer) {
      if (locked || index >= items.length || step !== 'write' || solutionShown()) return false;
      const item = items[index];
      locked = true;
      if (isCorrect(answer, item.accept ?? [item.en])) {
        results[item.id] = results[item.id] === false ? false : wrong === 0 && hintLevel === 0;
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

// Dopo una soluzione mostrata (o qualunque cambio di elemento) non devono restare
// il «Non ancora, riprova» né la vecchia risposta.
export function clearFeedback(session) {
  session.feedback = null;
  session.lastAnswer = '';
}

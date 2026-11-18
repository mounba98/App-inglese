import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLessonFlow } from '../src/lesson.js';

const lesson = {
  id: 'x1',
  title: 'Prova',
  items: [
    { id: 'a', en: 'Hello', it: 'Ciao', accept: ['Hello', 'Hi'] },
    { id: 'b', en: 'Bye', it: 'Arrivederci', accept: ['Bye'] },
  ],
};

// Simula il re-render dell'interfaccia: legge current() dopo ogni azione.
const step = (f) => f.current().step;

test('sequenza learn -> repeat -> write per ogni elemento, poi done', () => {
  const f = createLessonFlow(lesson);
  assert.equal(f.current().step, 'learn');
  assert.equal(f.current().item.id, 'a');
  f.advance();
  assert.equal(step(f), 'repeat');
  f.advance();
  assert.equal(step(f), 'write');
  assert.equal(f.submit('hello'), true);
  const c = f.current();
  assert.equal(c.step, 'learn');
  assert.equal(c.item.id, 'b');
  f.advance(); f.current();
  f.advance(); f.current();
  assert.equal(f.submit('Bye'), true);
  assert.deepEqual(f.current(), { step: 'done' });
});

test('submit sbagliato: false, resta sul passo; soluzione dopo il secondo errore', () => {
  const f = createLessonFlow(lesson);
  f.advance(); f.current(); f.advance(); f.current();
  assert.equal(f.submit('nope'), false);
  let c = f.current();
  assert.equal(c.step, 'write');
  assert.equal(c.showSolution, false);
  assert.equal(f.submit('nope2'), false);
  c = f.current();
  assert.equal(c.step, 'write');
  assert.equal(c.showSolution, true);
  assert.equal(c.item.id, 'a');
  f.advance();
  c = f.current();
  assert.equal(c.step, 'learn');
  assert.equal(c.item.id, 'b');
  assert.deepEqual(f.results(), { a: false });
});

test('due advance() rapidi spostano di un solo passo', () => {
  const f = createLessonFlow(lesson);
  f.advance();
  f.advance();
  assert.equal(step(f), 'repeat');
});

test('due submit() rapidi: il secondo è ignorato; dopo il re-render conta', () => {
  const f = createLessonFlow(lesson);
  f.advance(); f.current(); f.advance(); f.current();
  assert.equal(f.submit('x'), false);
  assert.equal(f.submit('y'), false); // ignorato, senza rilettura
  assert.equal(f.current().showSolution, false);
  assert.equal(f.submit('z'), false); // dopo il re-render conta
  assert.equal(f.current().showSolution, true);
});

test('submit giusto doppio: sposta di un solo elemento', () => {
  const f = createLessonFlow(lesson);
  f.advance(); f.current(); f.advance(); f.current();
  assert.equal(f.submit('Hello'), true);
  assert.equal(f.submit('Hello'), false);
  assert.equal(f.current().item.id, 'b');
});

test('submit fuori dal passo write: false e non cambia nulla', () => {
  const f = createLessonFlow(lesson);
  assert.equal(f.submit('Hello'), false);
  assert.equal(step(f), 'learn');
  f.advance();
  assert.equal(f.submit('Hello'), false);
  assert.equal(step(f), 'repeat');
});

test('advance durante write senza soluzione è ignorato', () => {
  const f = createLessonFlow(lesson);
  f.advance(); f.current(); f.advance(); f.current();
  f.advance();
  assert.equal(step(f), 'write');
  f.submit('x'); f.current();
  f.advance();
  assert.equal(step(f), 'write');
});

test('results: vero solo se giusto al primo tentativo', () => {
  const f = createLessonFlow(lesson);
  f.advance(); f.current(); f.advance(); f.current();
  f.submit('wrong'); f.current();
  f.submit('Hello'); f.current(); // giusto al secondo tentativo -> false
  f.advance(); f.current(); f.advance(); f.current();
  f.submit('Bye');
  assert.deepEqual(f.results(), { a: false, b: true });
  assert.deepEqual(f.current(), { step: 'done' });
  f.advance(); f.submit('x');
  assert.deepEqual(f.current(), { step: 'done' });
});

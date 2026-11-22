import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLessonFlow, clearFeedback, maskAnswer } from '../src/lesson.js';

const lesson = {
  id: 'x1',
  title: 'Prova',
  items: [
    { id: 'a', en: 'Hello', it: 'Ciao', accept: ['Hello', 'Hi'] },
    { id: 'b', en: 'Bye', it: 'Arrivederci', accept: ['Bye'] },
    { id: 'c', en: 'Thanks', it: 'Grazie', accept: ['Thanks'] },
  ],
};
const rng = () => 0.3;
const mk = (opts = {}, l = lesson) => createLessonFlow(l, { rng, ...opts });
const step = (f) => f.current().step;
// Porta il flusso fino al passo write del primo elemento.
const toWrite = (f) => {
  f.advance(); f.current(); // learn -> choose
  f.choose(f.current().item.en); // giusta -> write
  f.current();
};

test('sequenza learn -> choose -> write per ogni elemento, poi done', () => {
  const f = mk({}, { ...lesson, items: lesson.items.slice(0, 2) });
  assert.equal(step(f), 'learn');
  assert.equal(f.current().item.id, 'a');
  f.advance();
  const c = f.current();
  assert.equal(c.step, 'choose');
  assert.ok(c.options.includes('Hello'));
  assert.equal(f.choose('Hello'), true);
  assert.equal(step(f), 'write');
  assert.equal(f.submit('hello'), true);
  assert.equal(f.current().step, 'learn');
  assert.equal(f.current().item.id, 'b');
  f.advance(); f.current();
  f.choose('Bye'); f.current();
  assert.equal(f.submit('Bye'), true);
  assert.deepEqual(f.current(), { step: 'done' });
  assert.deepEqual(f.results(), { a: true, b: true });
});

test('teoria: primo passo se la lezione la ha, poi learn del primo elemento', () => {
  const teoria = { it: 'Ciao', en: 'Hello' };
  const f = mk({}, { ...lesson, teoria });
  assert.deepEqual(f.current(), { step: 'teoria', teoria });
  f.advance();
  const c = f.current();
  assert.equal(c.step, 'learn');
  assert.equal(c.item.id, 'a');
});

test('senza teoria si parte da learn; con startAt write la teoria non c\'è', () => {
  assert.equal(step(mk()), 'learn');
  const f = mk({ startAt: 'write' }, { ...lesson, teoria: { it: 'a', en: 'b' } });
  assert.equal(step(f), 'write');
});

test('choose: opzioni stabili tra current() ripetuti', () => {
  const f = mk();
  f.advance();
  const o1 = f.current().options;
  const o2 = f.current().options;
  assert.deepEqual(o1, o2);
  assert.equal(o1.length, 3);
});

test('choose: risposta sbagliata -> stato con picked, advance porta a write, risultato false', () => {
  const f = mk();
  f.advance(); f.current();
  const wrongOpt = f.current().options.find((o) => o !== 'Hello');
  assert.equal(f.choose(wrongOpt), false);
  const c = f.current();
  assert.equal(c.step, 'choose');
  assert.equal(c.picked, wrongOpt);
  assert.equal(c.ok, false);
  assert.equal(f.choose('Hello'), false); // già risposto
  f.current();
  f.advance();
  assert.equal(step(f), 'write');
  assert.equal(f.submit('Hello'), true); // giusta, ma resta false
  assert.deepEqual(f.results(), { a: false });
});

test('choose: advance senza risposta è ignorato; choose fuori dal passo è false', () => {
  const f = mk();
  assert.equal(f.choose('Hello'), false);
  f.advance(); f.current();
  f.advance();
  assert.equal(step(f), 'choose');
});

test('choose saltato se le opzioni sono meno di 2', () => {
  const solo = { id: 's', items: [{ id: 'a', en: 'Hello', it: 'Ciao', accept: ['Hello'] }] };
  const f = mk({}, solo);
  f.advance();
  assert.equal(step(f), 'write');
});

test('choose usa il pool se fornito', () => {
  const f = mk({ pool: ['Hello', 'Apple', 'Pear'] });
  f.advance();
  const o = f.current().options;
  assert.deepEqual([...o].sort(), ['Apple', 'Hello', 'Pear']);
});

test('submit sbagliato: false, resta sul passo; soluzione dopo il secondo errore', () => {
  const f = mk();
  toWrite(f);
  assert.equal(f.submit('nope'), false);
  let c = f.current();
  assert.equal(c.step, 'write');
  assert.equal(c.showSolution, false);
  assert.equal(f.submit('nope2'), false);
  c = f.current();
  assert.equal(c.showSolution, true);
  f.advance();
  c = f.current();
  assert.equal(c.step, 'learn');
  assert.equal(c.item.id, 'b');
  assert.deepEqual(f.results(), { a: false });
});

test('hint: livello 1 mostra la maschera, livello 2 la soluzione; risultato false', () => {
  const f = mk();
  toWrite(f);
  assert.equal(f.hint(), 1);
  let c = f.current();
  assert.equal(c.hint, 'H____');
  assert.equal(c.showSolution, false);
  assert.equal(f.hint(), 2);
  c = f.current();
  assert.equal(c.showSolution, true);
  assert.equal(f.hint(), 0);
  assert.equal(f.submit('Hello'), false);
  f.advance();
  assert.equal(f.current().item.id, 'b');
  assert.deepEqual(f.results(), { a: false });
});

test('hint: dopo il livello 1 una risposta giusta avanza ma conta false', () => {
  const f = mk();
  toWrite(f);
  f.hint(); f.current();
  assert.equal(f.submit('Hello'), true);
  assert.equal(f.current().item.id, 'b');
  assert.deepEqual(f.results(), { a: false });
});

test('hint: ignorato fuori da write e con doppio tocco', () => {
  const f = mk();
  assert.equal(f.hint(), 0);
  toWrite(f);
  assert.equal(f.hint(), 1);
  assert.equal(f.hint(), 0); // senza rilettura
  assert.equal(f.current().hint, 'H____');
});

test('due advance() rapidi spostano di un solo passo', () => {
  const f = mk();
  f.advance();
  f.advance();
  assert.equal(step(f), 'choose');
});

test('due submit() rapidi: il secondo è ignorato; dopo il re-render conta', () => {
  const f = mk();
  toWrite(f);
  assert.equal(f.submit('x'), false);
  assert.equal(f.submit('y'), false);
  assert.equal(f.current().showSolution, false);
  assert.equal(f.submit('z'), false);
  assert.equal(f.current().showSolution, true);
});

test('submit giusto doppio: sposta di un solo elemento', () => {
  const f = mk();
  toWrite(f);
  assert.equal(f.submit('Hello'), true);
  assert.equal(f.submit('Hello'), false);
  assert.equal(f.current().item.id, 'b');
});

test('submit fuori dal passo write: false e non cambia nulla', () => {
  const f = mk();
  assert.equal(f.submit('Hello'), false);
  assert.equal(step(f), 'learn');
});

test('advance durante write senza soluzione è ignorato', () => {
  const f = mk();
  toWrite(f);
  f.advance();
  assert.equal(step(f), 'write');
});

test('results: vero solo se giusto al primo tentativo', () => {
  const f = mk({}, { ...lesson, items: lesson.items.slice(0, 2) });
  toWrite(f);
  f.submit('wrong'); f.current();
  f.submit('Hello'); f.current();
  toWrite(f);
  f.submit('Bye');
  assert.deepEqual(f.results(), { a: false, b: true });
  assert.deepEqual(f.current(), { step: 'done' });
  f.advance(); f.submit('x'); f.hint(); f.choose('x');
  assert.deepEqual(f.current(), { step: 'done' });
});

test('startAt write: ogni elemento parte dalla scrittura', () => {
  const f = mk({ startAt: 'write' });
  let c = f.current();
  assert.equal(c.step, 'write');
  assert.equal(c.item.id, 'a');
  assert.equal(f.submit('Hi'), true);
  c = f.current();
  assert.equal(c.item.id, 'b');
  assert.equal(f.submit('Bye'), true);
  f.current();
  assert.equal(f.submit('Thanks'), true);
  assert.deepEqual(f.current(), { step: 'done' });
  assert.deepEqual(f.results(), { a: true, b: true, c: true });
});

test('startAt write: errori, soluzione e hint', () => {
  const f = mk({ startAt: 'write' });
  assert.equal(f.submit('x'), false);
  assert.equal(f.current().showSolution, false);
  assert.equal(f.submit('y'), false);
  assert.equal(f.current().showSolution, true);
  f.advance();
  assert.equal(f.current().item.id, 'b');
  assert.equal(f.hint(), 1);
  assert.equal(f.current().hint, 'B__');
  assert.equal(f.submit('Bye'), true);
  assert.deepEqual(f.results(), { a: false, b: false });
});

test('startAt write: guardie contro i doppi tocchi', () => {
  const f = mk({ startAt: 'write' });
  assert.equal(f.submit('Hello'), true);
  assert.equal(f.submit('Bye'), false);
  assert.equal(f.current().item.id, 'b');
});

test('dictation: flag sul passo write', () => {
  const f = mk({ dictation: true });
  toWrite(f);
  assert.equal(f.current().dictation, true);
  assert.equal(mk({ startAt: 'write' }).current().dictation, undefined);
});

test('maskAnswer', () => {
  assert.equal(maskAnswer("I'm tired"), "I'_ t____");
  assert.equal(maskAnswer('twenty-one'), 't_____-o__');
  assert.equal(maskAnswer('A — apple'), 'A — a____');
  assert.equal(maskAnswer('Hello, how are you?'), 'H____, h__ a__ y__?');
});

test('clearFeedback azzera feedback e ultima risposta', () => {
  const session = { feedback: 'retry', lastAnswer: 'abc', recorded: false };
  clearFeedback(session);
  assert.equal(session.feedback, null);
  assert.equal(session.lastAnswer, '');
  assert.equal(session.recorded, false);
});

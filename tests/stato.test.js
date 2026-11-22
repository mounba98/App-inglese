import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonStatus, paragraphs, distractorPool, choiceMode, isAscolto, reviewableItems } from '../src/stato.js';

const lesson = { id: 'a', items: [{ id: 'a1' }, { id: 'a2' }] };

test('da fare / bloccata', () => {
  assert.equal(lessonStatus(lesson, { completed: [], cards: {} }, true), 'da-fare');
  assert.equal(lessonStatus(lesson, { completed: [], cards: {} }, false), 'bloccata');
});

test('fatta e da ripassare', () => {
  const s = { completed: ['a'], cards: { a1: { box: 3, due: '2026-01-01' } } };
  assert.equal(lessonStatus(lesson, s, true), 'fatta');
  s.cards.a2 = { box: 1, due: '2026-01-01' };
  assert.equal(lessonStatus(lesson, s, true), 'da-ripassare');
  assert.equal(lessonStatus(lesson, s, false), 'da-ripassare');
});

test('stato mancante non rompe', () => {
  assert.equal(lessonStatus(lesson, undefined, true), 'da-fare');
});

test('paragraphs', () => {
  assert.deepEqual(paragraphs('Uno\n\nDue\n  \nTre'), ['Uno', 'Due', 'Tre']);
  assert.deepEqual(paragraphs(undefined), []);
});

const mk = (id, n) => ({ id, items: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i}` })) });

test('distractorPool: lezione con almeno 3 parole usa solo le sue', () => {
  const a = mk('a', 3), b = mk('b', 4);
  assert.deepEqual(distractorPool(a, [a, b]), a.items);
});

test('distractorPool: lezione piccola usa le lezioni fino a quella inclusa', () => {
  const a = mk('a', 2), b = mk('b', 2), c = mk('c', 5);
  assert.deepEqual(distractorPool(b, [a, b, c]), [...a.items, ...b.items]);
});

test('distractorPool: ancora meno di 3 -> tutto il gruppo', () => {
  const a = mk('a', 1), b = mk('b', 1), c = mk('c', 3);
  assert.deepEqual(distractorPool(a, [a, b, c]), [...a.items, ...b.items, ...c.items]);
});

test('choiceMode: ascolto solo con scelta "ascolto" e audio disponibile', () => {
  assert.equal(choiceMode({ scelta: 'ascolto' }, true), 'ascolto');
  assert.equal(choiceMode({ scelta: 'ascolto' }, false), 'lettura');
  assert.equal(choiceMode({}, true), 'lettura');
  assert.equal(choiceMode(undefined, true), 'lettura');
});

const asc = { id: 'al', tipo: 'ascolto', items: [{ id: 'al-a' }, { id: 'al-b' }, { id: 'al-c' }] };

test('isAscolto', () => {
  assert.equal(isAscolto(asc), true);
  assert.equal(isAscolto({ id: 'x' }), false);
  assert.equal(isAscolto(undefined), false);
});

test('lessonStatus: lezione di ascolto fatta non è mai «da ripassare»', () => {
  const s = { completed: ['al'], cards: { 'al-a': { box: 1, due: '2026-01-01' } } };
  assert.equal(lessonStatus(asc, s, true), 'fatta');
  assert.equal(lessonStatus(asc, { completed: [], cards: {} }, true), 'da-fare');
  assert.equal(lessonStatus(asc, { completed: [], cards: {} }, false), 'bloccata');
});

test('reviewableItems: salta le carte delle lezioni di ascolto e gli id sconosciuti', () => {
  const a = mk('a', 2);
  const groups = [{ id: 'g', lessons: [asc, a] }];
  const got = reviewableItems(['al-a', 'a-0', 'zzz', 'a-1'], groups);
  assert.deepEqual(got.map((i) => i.id), ['a-0', 'a-1']);
});

test('distractorPool: le parole delle lezioni di ascolto non finiscono tra le opzioni', () => {
  const a = mk('a', 1), b = mk('b', 1);
  const pool = distractorPool(b, [asc, a, b]);
  assert.deepEqual(pool, [...a.items, ...b.items]);
  assert.ok(pool.every((i) => !i.id.startsWith('al-')));
});

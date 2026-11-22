import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonStatus, paragraphs, distractorPool } from '../src/stato.js';

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

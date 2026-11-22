import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonStatus, paragraphs } from '../src/stato.js';

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

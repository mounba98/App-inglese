import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextReview, dueCards, todayLocal } from '../src/srs.js';

const T = '2026-11-18';

test('giusta da box 1 -> box 2, due oggi+1', () => {
  assert.deepEqual(nextReview({ box: 1, due: T }, true, T), { box: 2, due: '2026-11-19' });
});
test('intervalli per box 2..5', () => {
  assert.deepEqual(nextReview({ box: 2, due: T }, true, T), { box: 3, due: '2026-11-21' });
  assert.deepEqual(nextReview({ box: 3, due: T }, true, T), { box: 4, due: '2026-11-25' });
  assert.deepEqual(nextReview({ box: 4, due: T }, true, T), { box: 5, due: '2026-12-02' });
});
test('giusta al box 5 resta 5, due oggi+14', () => {
  assert.deepEqual(nextReview({ box: 5, due: T }, true, T), { box: 5, due: '2026-12-02' });
});
test('sbagliata da qualunque box -> box 1, due oggi', () => {
  for (const b of [1, 2, 3, 4, 5]) {
    assert.deepEqual(nextReview({ box: b, due: T }, false, T), { box: 1, due: T });
  }
});
test('addizione giorni attraversa fine mese e anno', () => {
  assert.deepEqual(nextReview({ box: 1, due: '2026-12-31' }, true, '2026-12-31'), { box: 2, due: '2027-01-01' });
  assert.deepEqual(nextReview({ box: 2, due: '2026-11-30' }, true, '2026-11-30'), { box: 3, due: '2026-12-03' });
});
test('nextReview non muta la carta', () => {
  const c = { box: 1, due: T };
  nextReview(c, true, T);
  assert.deepEqual(c, { box: 1, due: T });
});
test('dueCards: solo due <= today, ordinati per due poi box, poi ordine di input', () => {
  const cards = {
    a: { box: 3, due: '2026-11-18' },
    b: { box: 1, due: '2026-11-18' },
    c: { box: 5, due: '2026-11-10' },
    d: { box: 1, due: '2026-11-19' },
    e: { box: 1, due: '2026-11-18' },
  };
  assert.deepEqual(dueCards(cards, T), ['c', 'b', 'e', 'a']);
});
test('todayLocal usa la data locale', () => {
  assert.equal(todayLocal(new Date(2026, 10, 18, 23, 59)), '2026-11-18');
  assert.equal(todayLocal(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

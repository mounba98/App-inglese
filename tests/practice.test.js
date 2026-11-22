import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPractice } from '../src/practice.js';
import { createLessonFlow } from '../src/lesson.js';

const mk = (p, n) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, en: `w${p}${i}`, it: `p${p}${i}` }));
const content = {
  levels: [{ id: 'l1', lessons: [{ id: 'a', items: mk('a', 6) }, { id: 'b', items: mk('b', 6) }, { id: 'c', items: mk('c', 6) }] }],
  topics: [{ id: 't', lessons: [{ id: 't1', items: mk('t', 5) }] }],
};
const state = (completed, cards = {}) => ({ completed, cards, topicsOpen: false });
const lcg = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

test('nessuna lezione completata: vuoto', () => {
  assert.deepEqual(pickPractice(state([]), content, lcg(1)), []);
});

test('solo item di lezioni completate, max 8, senza doppioni', () => {
  const r = pickPractice(state(['a', 'b', 't1']), content, lcg(2));
  assert.equal(r.length, 8);
  assert.equal(new Set(r.map((i) => i.id)).size, 8);
  assert.ok(r.every((i) => /^[abt]/.test(i.id)));
});

test('pochi item: restituisce tutti, non vuoto', () => {
  const r = pickPractice(state(['a']), content, lcg(3));
  assert.equal(r.length, 6);
  assert.equal(pickPractice(state(['a']), content, lcg(3), 3).length, 3);
});

test('item duplicati tra lezioni contano una volta', () => {
  const dup = { levels: [{ lessons: [{ id: 'a', items: mk('a', 3) }, { id: 'b', items: mk('a', 3) }] }], topics: [] };
  const r = pickPractice(state(['a', 'b']), dup, lcg(4));
  assert.equal(r.length, 3);
});

test('deterministico con lo stesso rng', () => {
  const a = pickPractice(state(['a', 'b', 'c']), content, lcg(9)).map((i) => i.id);
  const b = pickPractice(state(['a', 'b', 'c']), content, lcg(9)).map((i) => i.id);
  assert.deepEqual(a, b);
});

test('box basso pesa circa 4 volte il box 5', () => {
  const cards = {};
  for (const it of content.levels[0].lessons[0].items) cards[it.id] = { box: 5, due: '2026-01-01' };
  for (const it of content.levels[0].lessons[1].items) cards[it.id] = { box: 1, due: '2026-01-01' };
  const rng = lcg(5);
  let low = 0, high = 0;
  for (let i = 0; i < 2000; i++) {
    for (const it of pickPractice(state(['a', 'b'], cards), content, rng, 1)) {
      if (it.id.startsWith('b')) low++; else high++;
    }
  }
  const ratio = low / high;
  assert.ok(ratio > 3 && ratio < 5.5, `rapporto ${ratio}`);
});

test('dettato: il passo write ha dictation true', () => {
  const lesson = { items: [{ id: 'x', en: 'Hello', it: 'Ciao' }] };
  const f = createLessonFlow(lesson, { startAt: 'write', dictation: true });
  assert.equal(f.current().step, 'write');
  assert.equal(f.current().dictation, true);
  assert.equal(createLessonFlow(lesson, { startAt: 'write' }).current().dictation, undefined);
  assert.equal(f.submit('hello'), true);
  assert.equal(f.current().step, 'done');
});

import { nextMode } from '../src/practice.js';
test('nextMode: scritta, dettato, scritta; il giro avanza anche senza audio', () => {
  let slot = true; // stato iniziale: come se il precedente fosse un dettato
  const seq = [];
  for (let i = 0; i < 4; i++) { const m = nextMode(slot, true); seq.push(m.dictation); slot = m.slot; }
  assert.deepEqual(seq, [false, true, false, true]);
  slot = true;
  for (let i = 0; i < 4; i++) { const m = nextMode(slot, false); assert.equal(m.dictation, false); slot = m.slot; }
  assert.equal(slot, true); // dopo 4 giri senza audio il giro è avanzato 4 volte
  assert.equal(nextMode(true, false).slot, false);
});

test('le lezioni di ascolto non entrano nell\'allenamento', () => {
  const c = { levels: [{ id: 'l1', lessons: [{ id: 'al', tipo: 'ascolto', items: mk('z', 6) }, { id: 'a', items: mk('a', 3) }] }], topics: [] };
  const r = pickPractice(state(['al', 'a']), c, lcg(5));
  assert.equal(r.length, 3);
  assert.ok(r.every((i) => i.id.startsWith('a')));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickOptions } from '../src/choice.js';
import { normalize } from '../src/check.js';

// rng deterministico (LCG)
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const item = { id: 'a', en: 'Hello', accept: ['Hello', 'Hi'] };
const pool = [
  item,
  { id: 'b', en: 'Bye' },
  { id: 'c', en: 'hi!' },
  { id: 'd', en: 'Thanks' },
  { id: 'e', en: 'thanks.' },
  { id: 'f', en: 'Please' },
];

test('le opzioni includono la risposta giusta', () => {
  for (let s = 1; s < 20; s++) {
    const o = pickOptions(item, pool, seeded(s));
    assert.equal(o.length, 3);
    assert.ok(o.includes('Hello'));
  }
});

test('i distrattori escludono le varianti accettate e i doppioni (dopo normalize)', () => {
  for (let s = 1; s < 30; s++) {
    const o = pickOptions(item, pool, seeded(s));
    const others = o.filter((x) => x !== 'Hello').map(normalize);
    assert.ok(!others.includes('hi'));
    assert.ok(!others.includes('hello'));
    assert.equal(new Set(others).size, others.length);
  }
});

test('meno opzioni se il pool è piccolo', () => {
  assert.deepEqual(pickOptions(item, [item, { en: 'Hi' }], seeded(1)), ['Hello']);
  const o = pickOptions(item, [item, 'Bye'], seeded(1));
  assert.equal(o.length, 2);
  assert.ok(o.includes('Hello') && o.includes('Bye'));
});

test('deterministico con lo stesso rng', () => {
  assert.deepEqual(pickOptions(item, pool, seeded(7)), pickOptions(item, pool, seeded(7)));
});

test('n personalizzato', () => {
  assert.equal(pickOptions(item, pool, seeded(3), 4).length, 4);
});

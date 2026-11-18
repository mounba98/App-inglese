import test from 'node:test';
import assert from 'node:assert/strict';
import { numberToWords, numberAccept, numberItems } from '../src/numbers.js';
import { isCorrect } from '../src/check.js';

test('numberToWords: casi chiave', () => {
  const cases = {
    0: 'zero', 13: 'thirteen', 15: 'fifteen', 21: 'twenty-one', 40: 'forty',
    100: 'one hundred', 101: 'one hundred one', 110: 'one hundred ten',
    999: 'nine hundred ninety-nine', 1000: 'one thousand', 1001: 'one thousand one',
    2024: 'two thousand twenty-four', 9999: 'nine thousand nine hundred ninety-nine',
  };
  for (const [n, w] of Object.entries(cases)) assert.equal(numberToWords(Number(n)), w, n);
});

test('numberAccept: trattino, spazio, and; mai le cifre', () => {
  const ok = (n, a) => assert.ok(isCorrect(a, numberAccept(n)), `${n}: ${a}`);
  ok(21, 'twenty-one'); ok(21, 'twenty one'); ok(21, 'Twenty One');
  ok(105, 'one hundred five'); ok(105, 'one hundred and five');
  ok(2024, 'two thousand and twenty-four'); ok(2024, 'two thousand and twenty four');
  ok(2024, 'two thousand twenty four');
  ok(100, 'a hundred'); ok(100, 'one hundred'); ok(1000, 'a thousand');
  ok(1100, 'one thousand one hundred'); ok(1100, 'one thousand and one hundred');
  assert.ok(!isCorrect('105', numberAccept(105)));
  assert.ok(!isCorrect('one hundred and', numberAccept(105)));
  assert.ok(!isCorrect('a hundred', numberAccept(105)));
});

test('numberItems: id, cifra, distinti, metà sotto 100', () => {
  let s = 1;
  const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const items = numberItems(8, rng);
  assert.equal(items.length, 8);
  assert.equal(new Set(items.map((i) => i.id)).size, 8);
  for (const it of items) {
    const n = Number(it.id.replace('num-', ''));
    assert.equal(it.it, String(n));
    assert.equal(it.en, numberToWords(n));
    assert.ok(it.accept.includes(it.en));
    assert.ok(n >= 0 && n <= 9999);
  }
  assert.equal(items.filter((i) => Number(i.id.slice(4)) < 100).length, 4);
});

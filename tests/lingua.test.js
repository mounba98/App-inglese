import test from 'node:test';
import assert from 'node:assert/strict';
import { regoleLingua, normalize, isCorrect, maskAnswer } from '../src/lingua.js';
import * as check from '../src/check.js';
import * as lesson from '../src/lesson.js';

test('regoleLingua("latino") dà le regole attuali', () => {
  const r = regoleLingua('latino');
  assert.equal(r.normalize(' I’m Fine. '), "i'm fine");
  assert.equal(r.isCorrect('Yes of course', ['Yes, of course']), true);
  assert.equal(r.isCorrect('', ['hello']), false);
  assert.equal(r.maskAnswer("Hi, I'm Anna"), "H_, I'_ A___");
});

test('regoleLingua: nome sconosciuto o mancante → latino', () => {
  for (const n of ['klingon', undefined, null, '']) {
    const r = regoleLingua(n);
    assert.equal(r.normalize, regoleLingua('latino').normalize);
    assert.equal(r.isCorrect, regoleLingua('latino').isCorrect);
    assert.equal(r.maskAnswer, regoleLingua('latino').maskAnswer);
  }
});

test('i moduli vecchi rimandano alle stesse funzioni', () => {
  assert.equal(check.normalize, normalize);
  assert.equal(check.isCorrect, isCorrect);
  assert.equal(lesson.maskAnswer, maskAnswer);
});

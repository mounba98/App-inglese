import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, isCorrect } from '../src/check.js';

test('normalize: minuscole, trim, apostrofo tipografico, punteggiatura finale', () => {
  assert.equal(normalize(' I’m Fine. '), "i'm fine");
});
test('isCorrect: spazi finali ignorati', () => {
  assert.equal(isCorrect('Good morning ', ['good morning']), true);
});
test('isCorrect: apostrofo tipografico', () => {
  assert.equal(isCorrect('I’m fine', ["I'm fine"]), true);
});
test('isCorrect: risposta sbagliata', () => {
  assert.equal(isCorrect('I has a dog', ['I have a dog']), false);
});
test('isCorrect: risposta vuota sempre falsa', () => {
  assert.equal(isCorrect('', ['hello']), false);
});

test('normalize: punteggiatura interna ignorata', () => {
  assert.equal(isCorrect("Hi, I'm Anna", ["Hi I'm Anna"]), true);
  assert.equal(isCorrect('Yes of course', ['Yes, of course']), true);
  assert.equal(normalize('Yes,  of course!'), 'yes of course');
  assert.equal(isCorrect('I has a dog', ['I have a dog']), false);
});

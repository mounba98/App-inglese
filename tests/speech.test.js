import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSpeech, speak, whenVoicesReady } from '../src/speech.js';

class FakeUtterance {
  constructor(text) { this.text = text; }
}

function makeEnv(voices, behavior = 'end') {
  const log = { spoken: [], cancels: 0 };
  const listeners = {};
  const synth = {
    _voices: voices,
    getVoices() { return this._voices; },
    addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
    removeEventListener(t, fn) { listeners[t] = (listeners[t] || []).filter((f) => f !== fn); },
    cancel() { log.cancels++; },
    speak(u) {
      log.spoken.push(u);
      if (behavior === 'throw') throw new Error('boom');
      if (behavior === 'end') queueMicrotask(() => u.onend && u.onend({}));
      if (behavior === 'error') queueMicrotask(() => u.onerror && u.onerror({}));
    },
  };
  return { env: { speechSynthesis: synth, SpeechSynthesisUtterance: FakeUtterance }, log, synth, listeners };
}
const en = { lang: 'en-US', name: 'US' };
const gb = { lang: 'en_GB', name: 'GB' };
const it = { lang: 'it-IT', name: 'IT' };

test('senza speechSynthesis: hasSpeech false, speak false senza lanciare', async () => {
  assert.equal(hasSpeech({}), false);
  assert.equal(await speak('hi', {}), false);
  assert.equal(await whenVoicesReady({}, 10), false);
});
test('hasSpeech true con voce inglese', () => {
  assert.equal(hasSpeech(makeEnv([it, en]).env), true);
});
test('solo voci it-IT: hasSpeech false e speak false', async () => {
  const { env, log } = makeEnv([it]);
  assert.equal(hasSpeech(env), false);
  assert.equal(await speak('hi', env, 'en-US', ), false);
  assert.equal(log.spoken.length, 0);
});
test('onend -> true, imposta lang, voice, rate 0.85', async () => {
  const { env, log } = makeEnv([it, gb, en]);
  assert.equal(await speak('hello', env), true);
  const u = log.spoken[0];
  assert.equal(u.text, 'hello');
  assert.equal(u.lang, 'en-US');
  assert.equal(u.voice, en);
  assert.equal(u.rate, 0.85);
});
test('preferisce lang uguale (en_US ~ en-US), altrimenti qualsiasi en', async () => {
  const us = { lang: 'en_US', name: 'x' };
  let t = makeEnv([gb, us]);
  await speak('a', t.env, 'en-US');
  assert.equal(t.log.spoken[0].voice, us);
  t = makeEnv([it, gb]);
  await speak('a', t.env, 'en-US');
  assert.equal(t.log.spoken[0].voice, gb);
});
test('onerror -> false', async () => {
  assert.equal(await speak('x', makeEnv([en], 'error').env), false);
});
test('speak che lancia -> false', async () => {
  assert.equal(await speak('x', makeEnv([en], 'throw').env), false);
});
test('speak annulla la pronuncia in corso prima della nuova', async () => {
  const t = makeEnv([en]);
  await speak('a', t.env);
  await speak('b', t.env);
  assert.equal(t.log.cancels, 2);
});
test('voci in ritardo: voiceschanged risolve whenVoicesReady e speak', async () => {
  const t = makeEnv([]);
  const p = speak('late', t.env);
  t.synth._voices = [en];
  (t.listeners.voiceschanged || []).forEach((f) => f());
  assert.equal(await p, true);
});
test('whenVoicesReady va in timeout -> false', async () => {
  const t = makeEnv([]);
  const start = Date.now();
  assert.equal(await whenVoicesReady(t.env, 20), false);
  assert.ok(Date.now() - start < 500);
});
test('whenVoicesReady true subito se la voce c\'è', async () => {
  assert.equal(await whenVoicesReady(makeEnv([en]).env, 20), true);
});

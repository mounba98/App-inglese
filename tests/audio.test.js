import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAudioIndex, createPlayer } from '../src/audio.js';

function makeAudioEnv(behavior = 'end') {
  const made = [];
  class FakeAudio {
    constructor(src) {
      this.src = src; this.paused = true; this.pauses = 0; made.push(this);
    }
    play() {
      this.paused = false;
      if (behavior === 'reject') return Promise.reject(new Error('no'));
      if (behavior === 'end') queueMicrotask(() => this.onended && this.onended());
      if (behavior === 'error') queueMicrotask(() => this.onerror && this.onerror());
      return Promise.resolve();
    }
    pause() { this.paused = true; this.pauses++; }
  }
  return { env: { Audio: FakeAudio }, made };
}
const item = { id: 'l1-01-a', en: 'A — apple' };
const other = { id: 'x', en: 'x' };

test('loadAudioIndex: mappa letta; errore, !ok o forma sbagliata -> vuota', async () => {
  const ok = async () => ({ ok: true, json: async () => ({ a: 'a.mp3' }) });
  assert.deepEqual(await loadAudioIndex(ok), { a: 'a.mp3' });
  assert.deepEqual(await loadAudioIndex(async () => ({ ok: false })), {});
  assert.deepEqual(await loadAudioIndex(async () => { throw new Error('x'); }), {});
  assert.deepEqual(await loadAudioIndex(async () => ({ ok: true, json: async () => [1] })), {});
  assert.deepEqual(await loadAudioIndex(async () => ({ ok: true, json: async () => { throw new Error('x'); } })), {});
});

test('canPlay: file oppure voce del telefono', () => {
  const { env } = makeAudioEnv();
  let speech = false;
  const p = createPlayer({ index: { 'l1-01-a': 'l1-01-a.mp3' }, env, speakFn: async () => true, hasSpeechFn: () => speech });
  assert.equal(p.canPlay(item), true);
  assert.equal(p.canPlay(other), false);
  speech = true; // voce arrivata in ritardo
  assert.equal(p.canPlay(other), true);
});

test('play con file: un Audio con il percorso giusto, true a fine ascolto', async () => {
  const { env, made } = makeAudioEnv('end');
  const spoken = [];
  const p = createPlayer({ index: { 'l1-01-a': 'l1-01-a.mp3' }, env, speakFn: async (t) => { spoken.push(t); return true; }, hasSpeechFn: () => true });
  assert.equal(await p.play(item), true);
  assert.equal(made.length, 1);
  assert.equal(made[0].src, 'audio/l1-01-a.mp3');
  assert.deepEqual(spoken, []);
});

test('basePath personalizzato', async () => {
  const { env, made } = makeAudioEnv('end');
  const p = createPlayer({ index: { a: 'a.mp3' }, env, speakFn: async () => false, hasSpeechFn: () => false, basePath: '/x/' });
  await p.play({ id: 'a', en: 'a' });
  assert.equal(made[0].src, '/x/a.mp3');
});

test('file che dà errore o play rifiutato: ripiego sulla voce del telefono', async () => {
  for (const b of ['error', 'reject']) {
    const { env } = makeAudioEnv(b);
    const spoken = [];
    const p = createPlayer({ index: { 'l1-01-a': 'l1-01-a.mp3' }, env, speakFn: async (t) => { spoken.push(t); return true; }, hasSpeechFn: () => true });
    assert.equal(await p.play(item), true, b);
    assert.deepEqual(spoken, ['A — apple'], b);
  }
});

test('senza file: voce del telefono; senza nulla: false', async () => {
  const { env, made } = makeAudioEnv();
  const spoken = [];
  const p = createPlayer({ index: {}, env, speakFn: async (t) => { spoken.push(t); return true; }, hasSpeechFn: () => true });
  assert.equal(await p.play(other), true);
  assert.deepEqual(spoken, ['x']);
  assert.equal(made.length, 0);
  const q = createPlayer({ index: {}, env, speakFn: async () => false, hasSpeechFn: () => false });
  assert.equal(await q.play(other), false);
});

test('nuovo play ferma il precedente e quello si risolve', async () => {
  const { env, made } = makeAudioEnv('never');
  const p = createPlayer({ index: { 'l1-01-a': 'a.mp3', x: 'x.mp3' }, env, speakFn: async () => true, hasSpeechFn: () => false });
  const first = p.play(item);
  await Promise.resolve();
  const second = p.play(other);
  assert.equal(await first, false);
  assert.equal(made[0].paused, true);
  assert.equal(made.length, 2);
  made[1].onended();
  assert.equal(await second, true);
});

test('timeout di sicurezza: si risolve anche se ended non arriva', async () => {
  const { env } = makeAudioEnv('never');
  const p = createPlayer({ index: { 'l1-01-a': 'a.mp3' }, env, speakFn: async () => true, hasSpeechFn: () => false, safetyMs: 20 });
  assert.equal(await p.play(item), true);
});

test('index nullo o env senza Audio: usa la voce, non lancia', async () => {
  const spoken = [];
  const p = createPlayer({ index: null, env: {}, speakFn: async (t) => { spoken.push(t); return true; }, hasSpeechFn: () => true });
  assert.equal(p.canPlay(item), true);
  assert.equal(await p.play(item), true);
  const q = createPlayer({ index: { 'l1-01-a': 'a.mp3' }, env: {}, speakFn: async () => true, hasSpeechFn: () => false });
  assert.equal(q.canPlay(item), false);
});

test('stop cancella anche la voce del telefono; il timeout mette in pausa il file', async () => {
  const { env, made } = makeAudioEnv('never');
  let cancels = 0;
  env.speechSynthesis = { cancel() { cancels++; } };
  const p = createPlayer({ index: { 'l1-01-a': 'a.mp3', x: 'x.mp3' }, env, speakFn: async () => true, hasSpeechFn: () => false, safetyMs: 20 });
  const first = p.play(item);
  await Promise.resolve();
  p.play(other);
  await first;
  assert.equal(cancels, 1);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(made[1].paused, true);
});

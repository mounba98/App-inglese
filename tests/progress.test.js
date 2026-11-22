import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress } from '../src/progress.js';

const levels = [
  { id: 'l1', title: 'L1', lessons: [{ id: 'l1-01', title: 'a', items: [] }, { id: 'l1-02', title: 'b', items: [] }] },
  { id: 'l2', title: 'L2', lessons: [{ id: 'l2-01', title: 'c', items: [] }] },
];
const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, v), m };
};

test('stato iniziale', () => {
  assert.deepEqual(createProgress(memStore()).get(), { completed: [], cards: {}, topicsOpen: false });
});

test('completeLesson idempotente', () => {
  const p = createProgress(null);
  p.completeLesson('l1-01');
  p.completeLesson('l1-01');
  assert.deepEqual(p.get().completed, ['l1-01']);
});

test('recordAnswer crea carta e promuove', () => {
  const p = createProgress(null);
  p.recordAnswer('c1', false, '2026-11-18');
  assert.equal(p.get().cards.c1.box, 1);
  p.recordAnswer('c1', true, '2026-11-18');
  assert.equal(p.get().cards.c1.box, 2);
});

test('sblocchi in ordine piatto', () => {
  const p = createProgress(null);
  assert.equal(p.isLessonUnlocked('l1-01', levels), true);
  assert.equal(p.isLessonUnlocked('l1-02', levels), false);
  assert.equal(p.isLessonUnlocked('l2-01', levels), false);
  assert.equal(p.isLessonUnlocked('zzz', levels), false);
  p.completeLesson('l1-01');
  assert.equal(p.isLessonUnlocked('l1-02', levels), true);
  assert.equal(p.isLessonUnlocked('l2-01', levels), false);
  p.completeLesson('l1-02');
  assert.equal(p.isLessonUnlocked('l2-01', levels), true);
});

test('topicsUnlocked', () => {
  const p = createProgress(null);
  assert.equal(p.topicsUnlocked([]), false);
  assert.equal(p.topicsUnlocked(levels), false);
  ['l1-01', 'l1-02'].forEach((id) => p.completeLesson(id));
  assert.equal(p.topicsUnlocked(levels), false);
  p.completeLesson('l2-01');
  assert.equal(p.topicsUnlocked(levels), true);
});

test('persistenza e ricarica', () => {
  const s = memStore();
  const p = createProgress(s);
  p.completeLesson('l1-01');
  p.recordAnswer('c1', true, '2026-11-18');
  assert.ok(s.m.has('inglese-v1'));
  const q = createProgress(s);
  assert.deepEqual(q.get().completed, ['l1-01']);
  assert.equal(q.get().cards.c1.box, 2);
});

test('JSON corrotto o forma errata -> stato iniziale', () => {
  for (const raw of ['{not json', '123', 'null', '[]', '{"completed":5,"cards":[]}']) {
    const p = createProgress({ getItem: () => raw, setItem() {} });
    assert.deepEqual(p.get(), { completed: [], cards: {}, topicsOpen: false }, raw);
  }
});

test('sanificazione', () => {
  const raw = JSON.stringify({
    completed: ['a', 'a', 3, 'b'],
    cards: {
      ok: { box: 3, due: '2026-11-20' },
      b0: { box: 0, due: '2026-11-20' },
      b6: { box: 6, due: '2026-11-20' },
      bf: { box: 1.5, due: '2026-11-20' },
      bd: { box: 2, due: '20/11/2026' },
      bn: { box: 2 },
      nul: null,
    },
  });
  const s = createProgress({ getItem: () => raw, setItem() {} }).get();
  assert.deepEqual(s.completed, ['a', 'b']);
  assert.deepEqual(Object.keys(s.cards), ['ok']);
});

test('storage che lancia non propaga', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('full'); } };
  const p = createProgress(bad);
  assert.doesNotThrow(() => p.completeLesson('a'));
  assert.doesNotThrow(() => p.recordAnswer('c', true, '2026-11-18'));
  assert.deepEqual(p.get().completed, ['a']);
});

test('get restituisce una copia', () => {
  const p = createProgress(null);
  p.completeLesson('a');
  const s = p.get();
  s.completed.push('x');
  s.cards.z = { box: 1, due: '2026-01-01' };
  assert.deepEqual(p.get(), { completed: ['a'], cards: {}, topicsOpen: false });
});

test('argomenti restano aperti dopo lo sblocco anche con un nuovo livello', () => {
  const s = memStore();
  const p = createProgress(s);
  ['l1-01', 'l1-02', 'l2-01'].forEach((id) => p.completeLesson(id));
  assert.equal(p.topicsUnlocked(levels), true);
  const more = [...levels, { id: 'l3', title: 'L3', lessons: [{ id: 'l3-01', title: 'd', items: [] }] }];
  assert.equal(p.topicsUnlocked(more), true);
  // e dopo una ricarica
  assert.equal(createProgress(s).topicsUnlocked(more), true);
});

test('dati salvati senza topicsOpen si caricano ancora', () => {
  const s = memStore();
  s.setItem('inglese-v1', JSON.stringify({ completed: ['l1-01'], cards: {} }));
  const p = createProgress(s);
  assert.deepEqual(p.get().completed, ['l1-01']);
  assert.equal(p.get().topicsOpen, false);
  assert.equal(p.topicsUnlocked(levels), false);
});

const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `l${i + 1}`, title: `L${i + 1}`, lessons: [{ id: `l${i + 1}-01`, title: 't', items: [] }] }));

test('argomenti: si sbloccano dopo il livello 6, anche se esiste il livello 7', () => {
  const lv = mk(7);
  const p = createProgress(null);
  ['l1-01', 'l2-01', 'l3-01', 'l4-01', 'l5-01'].forEach((id) => p.completeLesson(id));
  assert.equal(p.topicsUnlocked(lv), false);
  p.completeLesson('l6-01');
  assert.equal(p.topicsUnlocked(lv), true);
});

test('argomenti: a metà corso (livello 7 presente) restano chiusi finché non è fatto il 6', () => {
  const lv = mk(6);
  const p = createProgress(null);
  ['l1-01', 'l2-01', 'l3-01', 'l4-01', 'l5-01'].forEach((id) => p.completeLesson(id));
  assert.equal(p.topicsUnlocked(lv), false);
  const more = mk(7);
  p.completeLesson('l6-01');
  assert.equal(p.topicsUnlocked(more), true);
});

test('chiave di salvataggio: di default «inglese-v1», un corso può averne una sua', () => {
  const a = memStore();
  createProgress(a).completeLesson('l1-01');
  assert.deepEqual([...a.m.keys()], ['inglese-v1']);
  const b = memStore();
  createProgress(b, 'giapponese-v1').completeLesson('l1-01');
  assert.deepEqual([...b.m.keys()], ['giapponese-v1']);
  assert.deepEqual(createProgress(b, 'giapponese-v1').get().completed, ['l1-01']);
  assert.deepEqual(createProgress(b).get().completed, []);
});

// Controlli di qualità sui contenuti reali. Sono la rete di sicurezza delle sessioni automatiche:
// se falliscono, la pull request non viene unita.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize } from '../src/check.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../content/${f}`, import.meta.url), 'utf8'));
const levels = read('levels.json');
const topics = read('topics.json');
const groups = [...levels, ...topics];
const lessons = groups.flatMap((g) => g.lessons.map((l) => ({ group: g, lesson: l })));
const items = lessons.flatMap(({ lesson }) => lesson.items.map((it) => ({ lesson, it })));

const words = (s) =>
  normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

test('la risposta non compare in «it» (parole inglesi di 4+ lettere), salvo «uguale»: true', () => {
  const bad = [];
  for (const { it } of items) {
    if (it.uguale === true) continue;
    const itWords = new Set(words(it.it));
    const hit = words(it.en).filter((w) => w.length >= 4 && itWords.has(w));
    if (hit.length) bad.push(`${it.id}: «${hit.join(', ')}» compare sia in en sia in it`);
  }
  assert.deepEqual(bad, [], `Nel testo italiano c'è la risposta. Riscrivi «it» o, solo se la parola è davvero identica in italiano, aggiungi "uguale": true.\n${bad.join('\n')}`);
});

test('«uguale»: true solo dove serve davvero (una parola uguale c\'è)', () => {
  const useless = [];
  for (const { it } of items) {
    if (it.uguale !== true) continue;
    const itWords = new Set(words(it.it));
    if (!words(it.en).some((w) => w.length >= 4 && itWords.has(w))) useless.push(it.id);
  }
  assert.deepEqual(useless, [], `«uguale» inutile in: ${useless.join(', ')}`);
});

test('ogni «accept» contiene la frase inglese «en»', () => {
  const bad = items
    .filter(({ it }) => it.accept !== undefined && !it.accept.some((a) => normalize(a) === normalize(it.en)))
    .map(({ it }) => it.id);
  assert.deepEqual(bad, [], `«accept» senza «en» in: ${bad.join(', ')}`);
});

test('ogni voce di «accept» non è vuota dopo la normalizzazione e non è doppia', () => {
  const bad = [];
  for (const { it } of items) {
    if (it.accept === undefined) continue;
    const seen = new Set();
    for (const a of it.accept) {
      const n = normalize(a);
      if (n === '') bad.push(`${it.id}: voce vuota «${a}»`);
      else if (seen.has(n)) bad.push(`${it.id}: voce doppia «${a}»`);
      seen.add(n);
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('nessun «en» ripetuto due volte nella stessa lezione', () => {
  const bad = [];
  for (const { lesson } of lessons) {
    const seen = new Set();
    for (const it of lesson.items) {
      const n = normalize(it.en);
      if (seen.has(n)) bad.push(`${lesson.id}: «${it.en}» compare due volte`);
      seen.add(n);
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('i titoli delle lezioni sono diversi nello stesso livello/argomento', () => {
  const bad = [];
  for (const g of groups) {
    const seen = new Set();
    for (const l of g.lessons) {
      const t = l.title.trim().toLowerCase();
      if (seen.has(t)) bad.push(`${g.id}: titolo ripetuto «${l.title}»`);
      seen.add(t);
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('numero di lezioni: 3–5 per livello, 2–3 per argomento', () => {
  const bad = [];
  for (const g of levels) if (g.lessons.length < 3 || g.lessons.length > 5) bad.push(`${g.id}: ${g.lessons.length} lezioni (servono 3–5)`);
  for (const g of topics) if (g.lessons.length < 2 || g.lessons.length > 3) bad.push(`${g.id}: ${g.lessons.length} lezioni (servono 2–3)`);
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('formato degli id: lezioni «<gruppo>-NN», elementi «<lezione>-slug»', () => {
  const bad = [];
  for (const g of groups) {
    g.lessons.forEach((l, i) => {
      const expected = `${g.id}-${String(i + 1).padStart(2, '0')}`;
      if (l.id !== expected) bad.push(`lezione «${l.id}»: ci si aspetta «${expected}»`);
      for (const it of l.items) if (!it.id.startsWith(`${l.id}-`) || it.id === `${l.id}-`) bad.push(`elemento «${it.id}»: deve iniziare con «${l.id}-»`);
    });
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

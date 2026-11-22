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

// Parole che possono essere identiche in inglese e in italiano. Solo una persona può cambiare questo elenco.
const UGUALI_AMMESSE = new Set(['pizza', 'pasta', 'banana', 'zebra', 'sport', 'cinema', 'film', 'taxi', 'anna', 'bar', 'hotel', 'menu', 'computer', 'internet', 'email', 'ok']);

// Forma base grossolana: toglie una desinenza finale (ing, ed, es, s).
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');

const words = (s) =>
  normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const shared = (it) => {
  const itWords = words(it.it);
  const itSet = new Set(itWords);
  const itStems = new Set(itWords.map(stem));
  return words(it.en).filter((w) => w.length >= 4 && (itSet.has(w) || itStems.has(stem(w))));
};

test('la risposta non compare in «it» (parole inglesi di 4+ lettere, anche con s/es/ed/ing), salvo «uguale»: true', () => {
  const bad = [];
  for (const { it } of items) {
    if (it.uguale === true) continue;
    const hit = shared(it);
    if (hit.length) bad.push(`${it.id}: «${hit.join(', ')}» compare sia in en sia in it`);
  }
  assert.deepEqual(bad, [], `Nel testo italiano c'è la risposta. Riscrivi «it».\n${bad.join('\n')}`);
});

test('«uguale»: ogni parola in comune deve essere nell\'elenco delle parole ammesse', () => {
  const bad = [];
  for (const { it } of items) {
    if (it.uguale !== true) continue;
    const off = shared(it).filter((w) => !UGUALI_AMMESSE.has(w));
    if (off.length) bad.push(`${it.id}: «${off.join(', ')}» non è tra le parole ammesse. Scegli un'altra frase.`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('«uguale»: true solo dove serve davvero (una parola uguale c\'è)', () => {
  const useless = [];
  for (const { it } of items) {
    if (it.uguale !== true) continue;
    if (shared(it).length === 0) useless.push(it.id);
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

const soloAscolto = (g) => g.lessons.every((l) => l.tipo === 'ascolto');

test('numero di lezioni: 3–5 per livello (un livello di solo ascolto può averne meno), 2–3 per argomento', () => {
  const bad = [];
  for (const g of levels) if (!soloAscolto(g) && (g.lessons.length < 3 || g.lessons.length > 5)) bad.push(`${g.id}: ${g.lessons.length} lezioni (servono 3–5)`);
  for (const g of topics) if (g.lessons.length < 2 || g.lessons.length > 3) bad.push(`${g.id}: ${g.lessons.length} lezioni (servono 2–3)`);
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('formato degli id: lezioni «<gruppo>-NN», elementi «<lezione>-slug»', () => {
  const bad = [];
  for (const g of groups) {
    g.lessons.forEach((l, i) => {
      const expected = `${g.id}-${String(i + 1).padStart(2, '0')}`;
      if (l.id !== expected) bad.push(`lezione «${l.id}»: ci si aspetta «${expected}»`);
      // Lezione di solo ascolto: gli id dell'alfabeto vengono dalle vecchie lezioni (audio già generato), bastano «<gruppo>-».
      const prefix = l.tipo === 'ascolto' ? `${g.id}-` : `${l.id}-`;
      for (const it of l.items) if (!it.id.startsWith(prefix) || it.id === prefix) bad.push(`elemento «${it.id}»: deve iniziare con «${prefix}»`);
    });
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('baseline degli id: ogni id esistente c\'è ancora, il suo «en» non è cambiato e la struttura è identica', () => {
  const base = JSON.parse(readFileSync(new URL('./ids-baseline.json', import.meta.url), 'utf8'));
  const bad = [];
  const sameList = (what, got, want) => {
    if (got.length !== want.length || got.some((x, i) => x !== want[i])) {
      bad.push(`${what}: ci si aspetta [${want.join(', ')}], c'è [${got.join(', ')}]. Il contenuto nuovo va solo in nuovi livelli o argomenti.`);
    }
  };
  for (const [file, current] of [['levels', levels], ['topics', topics]]) {
    for (const g of base[file]) {
      const cg = current.find((x) => x.id === g.id);
      if (!cg) { bad.push(`${file}: manca «${g.id}»`); continue; }
      sameList(`lezioni di «${g.id}»`, cg.lessons.map((l) => l.id), g.lessons.map((l) => l.id));
      for (const l of g.lessons) {
        const cl = cg.lessons.find((x) => x.id === l.id);
        if (!cl) { bad.push(`manca la lezione «${l.id}»`); continue; }
        sameList(`elementi di «${l.id}»`, cl.items.map((x) => x.id), l.items.map((x) => x.id));
        for (const i of l.items) {
          const ci = cl.items.find((x) => x.id === i.id);
          if (!ci) bad.push(`manca l'elemento «${i.id}»`);
          else if (ci.en !== i.en) bad.push(`«${i.id}»: en cambiato da «${i.en}» a «${ci.en}»`);
        }
      }
    }
  }
  assert.deepEqual(bad, [], `Si può solo aggiungere (in nuovi livelli o argomenti), mai togliere o cambiare.\n${bad.join('\n')}`);
});

// Lezioni nuove: quelle il cui id non è nella baseline.
const baseline = JSON.parse(readFileSync(new URL('./ids-baseline.json', import.meta.url), 'utf8'));
const baselineLessonIds = new Set([...baseline.levels, ...baseline.topics].flatMap((g) => g.lessons.map((l) => l.id)));
const newLessons = lessons.filter(({ lesson }) => !baselineLessonIds.has(lesson.id));

test('le lezioni nuove hanno al massimo 8 elementi (tranne quelle di solo ascolto)', () => {
  const bad = newLessons.filter(({ lesson }) => lesson.tipo !== 'ascolto' && lesson.items.length > 8).map(({ lesson }) => `${lesson.id}: ${lesson.items.length} elementi (massimo 8)`);
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('ogni lezione nuova ha la teoria', () => {
  const bad = newLessons.filter(({ lesson }) => lesson.teoria === undefined).map(({ lesson }) => lesson.id);
  assert.deepEqual(bad, [], `Manca la «teoria» in: ${bad.join(', ')}`);
});

test('ogni lezione di ogni livello ha la teoria', () => {
  const bad = levels.flatMap((g) => g.lessons).filter((l) => !l.teoria || !l.teoria.it || !l.teoria.en).map((l) => l.id);
  assert.deepEqual(bad, [], `Manca la «teoria» (it ed en) in: ${bad.join(', ')}`);
});

test('Coda: caselle spuntate = livelli aggiunti dopo l6 e argomenti aggiunti dopo i 7 iniziali', () => {
  const md = readFileSync(new URL('../docs/CONTENUTI.md', import.meta.url), 'utf8');
  const sec = (name) => {
    const m = md.match(new RegExp(`### ${name}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{2,3} |$)`));
    assert.ok(m, `sezione «${name}» non trovata nella Coda`);
    return (m[1].match(/^- \[[xX]\]/gm) || []).length;
  };
  assert.equal(sec('Livelli'), levels.length - 6, 'livelli spuntati diversi dai livelli aggiunti');
  assert.equal(sec('Argomenti'), topics.length - 7, 'argomenti spuntati diversi dagli argomenti aggiunti');
});

test('«tipo»: "ascolto" solo nel livello 1 (alfabeto), con la teoria e senza «scelta»', () => {
  const bad = lessons.filter(({ lesson }) => lesson.tipo !== undefined && (lesson.tipo !== 'ascolto' || lesson.scelta !== undefined || !lesson.teoria)).map(({ lesson }) => lesson.id);
  assert.deepEqual(bad, []);
  const fuori = lessons.filter(({ group, lesson }) => lesson.tipo === 'ascolto' && group.id !== 'l1').map(({ lesson }) => lesson.id);
  assert.deepEqual(fuori, [], '«tipo: ascolto» è solo per l\'alfabeto, non per contenuti nuovi normali');
});

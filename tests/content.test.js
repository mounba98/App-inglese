import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent, loadContent } from '../src/content.js';

const item = (id, extra = {}) => ({ id, en: 'A — apple', it: 'si legge «ei»', ...extra });
const lesson = (id, items) => ({ id, title: 'Lezione', items });
const level = (id, lessons) => ({ id, title: 'Livello', lessons });
const ok = () => [level('l1', [lesson('l1-01', [item('l1-01-a'), item('l1-01-b')])])];
const joined = (errs) => errs.join('\n');

test('contenuto valido: nessun errore', () => {
  assert.deepEqual(validateContent(ok(), []), []);
});

test('meno di 6 livelli non è un errore', () => {
  assert.deepEqual(validateContent(ok(), []), []);
});

test('id duplicati tra elementi', () => {
  const l = ok();
  l[0].lessons[0].items.push(item('l1-01-a'));
  const errs = validateContent(l, []);
  assert.ok(errs.length > 0);
  assert.match(joined(errs), /l1-01-a/);
});

test('id duplicato tra livelli e argomenti', () => {
  const topics = [{ id: 'l1-01-a', title: 'Casa', lessons: [lesson('casa-01', [item('casa-01-a')])] }];
  assert.match(joined(validateContent(ok(), topics)), /l1-01-a/);
});

test('id non valido (formato)', () => {
  const l = ok();
  l[0].lessons[0].items[0].id = '__proto__';
  assert.match(joined(validateContent(l, [])), /__proto__/);
  const l2 = ok();
  l2[0].lessons[0].items[0].id = 'Maiuscola';
  assert.match(joined(validateContent(l2, [])), /Maiuscola/);
});

test('en o it vuoti', () => {
  const l = ok();
  l[0].lessons[0].items[0].en = '  ';
  l[0].lessons[0].items[1].it = '';
  const s = joined(validateContent(l, []));
  assert.match(s, /l1-01-a/);
  assert.match(s, /l1-01-b/);
});

test('lezione con più di 10 elementi', () => {
  const items = Array.from({ length: 11 }, (_, i) => item(`l1-01-${i}`));
  assert.match(joined(validateContent([level('l1', [lesson('l1-01', items)])], [])), /l1-01/);
});

test('lezione con 10 elementi va bene', () => {
  const items = Array.from({ length: 10 }, (_, i) => item(`l1-01-${i}`));
  assert.deepEqual(validateContent([level('l1', [lesson('l1-01', items)])], []), []);
});

const withTeoria = (t) => {
  const l = ok();
  l[0].lessons[0].teoria = t;
  return l;
};

test('teoria valida: nessun errore', () => {
  assert.deepEqual(validateContent(withTeoria({ it: 'Spiegazione', en: 'Explanation' }), []), []);
});

test('teoria al massimo 1500 caratteri va bene', () => {
  assert.deepEqual(validateContent(withTeoria({ it: 'a'.repeat(1500), en: 'b'.repeat(1500) }), []), []);
});

test('teoria troppo lunga', () => {
  assert.match(joined(validateContent(withTeoria({ it: 'a'.repeat(1501), en: 'ok' }), [])), /teoria «it».*1501/);
  assert.match(joined(validateContent(withTeoria({ it: 'ok', en: 'b'.repeat(1501) }), [])), /teoria «en».*1501/);
});

test('teoria con «it» o «en» vuoti o mancanti', () => {
  assert.match(joined(validateContent(withTeoria({ it: '  ', en: 'ok' }), [])), /teoria «it» è vuota/);
  assert.match(joined(validateContent(withTeoria({ it: 'ok' }), [])), /teoria «en» è vuota/);
  assert.match(joined(validateContent(withTeoria({ it: 5, en: 'ok' }), [])), /teoria «it» è vuota/);
});

test('teoria che non è un oggetto', () => {
  for (const t of ['testo', 3, null, ['a']]) {
    assert.match(joined(validateContent(withTeoria(t), [])), /«teoria» deve essere un oggetto/);
  }
});

test('lezione senza elementi', () => {
  assert.match(joined(validateContent([level('l1', [lesson('l1-01', [])])], [])), /l1-01/);
});

test('livello senza lezioni', () => {
  assert.match(joined(validateContent([level('l1', [])], [])), /l1/);
});

test('titoli vuoti', () => {
  const l = ok();
  l[0].title = '';
  l[0].lessons[0].title = ' ';
  const topics = [{ id: 'casa', title: '', lessons: [lesson('casa-01', [item('casa-01-a')])] }];
  const s = joined(validateContent(l, topics));
  assert.match(s, /l1\b/);
  assert.match(s, /l1-01/);
  assert.match(s, /casa\b/);
});

test('livelli non in ordine l1, l2, …', () => {
  const mk = (id) => level(id, [lesson(`${id}-01`, [item(`${id}-01-a`)])]);
  assert.match(joined(validateContent([mk('l2'), mk('l1')], [])), /l2/);
  assert.match(joined(validateContent([mk('l1'), mk('l3')], [])), /l3/);
  assert.match(joined(validateContent([mk('x1')], [])), /x1/);
});

test('più di 6 livelli consecutivi sono validi', () => {
  const mk = (n) => level(`l${n}`, [lesson(`l${n}-01`, [item(`l${n}-01-a`)])]);
  const lv = Array.from({ length: 8 }, (_, i) => mk(i + 1));
  assert.deepEqual(validateContent(lv, []), []);
});

test('accept: deve essere array non vuoto di stringhe non vuote', () => {
  for (const bad of [[], 'x', [''], [1], ['ok', ' ']]) {
    const l = ok();
    l[0].lessons[0].items[0].accept = bad;
    assert.match(joined(validateContent(l, [])), /l1-01-a/, JSON.stringify(bad));
  }
  const l = ok();
  l[0].lessons[0].items[0].accept = ['apple', 'a apple'];
  assert.deepEqual(validateContent(l, []), []);
});

test('struttura non valida non lancia eccezioni', () => {
  assert.ok(validateContent(null, null).length > 0);
  assert.ok(validateContent([null], []).length > 0);
  assert.ok(validateContent([{ id: 'l1', title: 'x', lessons: [null] }], []).length > 0);
});

test('file reali validi', () => {
  const levels = JSON.parse(readFileSync(new URL('../content/levels.json', import.meta.url), 'utf8'));
  const topics = JSON.parse(readFileSync(new URL('../content/topics.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateContent(levels, topics), []);
  assert.ok(levels.length >= 2);
  const lessonsOf = (i) => levels[i].lessons;
  assert.ok(lessonsOf(0).length >= 3);
});

const resp = (data, okFlag = true) => ({ ok: okFlag, status: okFlag ? 200 : 404, json: async () => data });

test('loadContent carica e imposta accept di default', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return resp(url === 'content/levels.json' ? ok() : []);
  };
  const { levels, topics } = await loadContent(fetchFn);
  assert.deepEqual(calls.sort(), ['content/levels.json', 'content/topics.json']);
  assert.deepEqual(levels[0].lessons[0].items[0].accept, ['A — apple']);
  assert.deepEqual(topics, []);
});

test('loadContent non muta i dati ricevuti e mantiene accept esplicito', async () => {
  const src = ok();
  src[0].lessons[0].items[1].accept = ['apple'];
  const fetchFn = async (url) => resp(url === 'content/levels.json' ? src : []);
  const { levels } = await loadContent(fetchFn);
  assert.equal(src[0].lessons[0].items[0].accept, undefined);
  assert.deepEqual(levels[0].lessons[0].items[1].accept, ['apple']);
});

test('loadContent: risposta non ok → Error in italiano', async () => {
  const fetchFn = async (url) => resp([], url !== 'content/topics.json');
  await assert.rejects(loadContent(fetchFn), (e) => e instanceof Error && /topics\.json/.test(e.message));
});

test('loadContent: contenuto non valido → Error con gli errori', async () => {
  const bad = [level('l1', [lesson('l1-01', [])])];
  const fetchFn = async (url) => resp(url === 'content/levels.json' ? bad : []);
  await assert.rejects(loadContent(fetchFn), (e) => e instanceof Error && /l1-01/.test(e.message));
});

test('«uguale» facoltativo: accetta un booleano, rifiuta altro', () => {
  const withUguale = (v) => [level('l1', [lesson('l1-01', [item('l1-01-a', { uguale: v })])])];
  assert.deepEqual(validateContent(withUguale(true), []), []);
  assert.deepEqual(validateContent(withUguale(false), []), []);
  assert.match(joined(validateContent(withUguale('sì'), [])), /uguale/);
  assert.match(joined(validateContent(withUguale(1), [])), /uguale/);
});

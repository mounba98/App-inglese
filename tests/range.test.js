import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(readFileSync(new URL('../src/range.js', import.meta.url), 'utf8') + '\nthis.parseRange = parseRange;', ctx);
const { parseRange } = ctx;

test('bytes=N- e bytes=N-M', () => {
  assert.deepEqual({ ...parseRange('bytes=10-', 100) }, { start: 10, end: 99 });
  assert.deepEqual({ ...parseRange('bytes=0-9', 100) }, { start: 0, end: 9 });
});
test('bytes=-N: ultimi N byte', () => {
  assert.deepEqual({ ...parseRange('bytes=-20', 100) }, { start: 80, end: 99 });
  assert.deepEqual({ ...parseRange('bytes=-500', 100) }, { start: 0, end: 99 });
});
test('fine oltre la dimensione: si limita', () => {
  assert.deepEqual({ ...parseRange('bytes=90-500', 100) }, { start: 90, end: 99 });
});
test('inizio >= dimensione: 416', () => {
  assert.equal(parseRange('bytes=100-', 100), 'unsatisfiable');
  assert.equal(parseRange('bytes=150-200', 100), 'unsatisfiable');
});
test('bytes=5-2 e intestazioni non valide: intervallo ignorato', () => {
  assert.equal(parseRange('bytes=5-2', 100), null);
  assert.equal(parseRange(null, 100), null);
  assert.equal(parseRange('items=1-2', 100), null);
  assert.equal(parseRange('bytes=-', 100), null);
});

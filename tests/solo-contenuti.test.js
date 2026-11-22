import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { soloContenuti } from '../scripts/solo-contenuti.mjs';

test('accetta solo file content/*.json e docs/CONTENUTI.md', () => {
  assert.equal(soloContenuti(['content/lezione-1.json']), true);
  assert.equal(soloContenuti(['docs/CONTENUTI.md']), true);
  assert.equal(soloContenuti(['content/a.json', 'docs/CONTENUTI.md']), true);
});

test('rifiuta lista vuota', () => {
  assert.equal(soloContenuti([]), false);
});

test('rifiuta file fuori ambito e liste miste', () => {
  assert.equal(soloContenuti(['src/app.js']), false);
  assert.equal(soloContenuti(['tests/ids-baseline.json']), false);
  assert.equal(soloContenuti(['tests/content-quality.test.js']), false);
  assert.equal(soloContenuti(['docs/ALTRO.md']), false);
  assert.equal(soloContenuti(['content/a.json', 'src/app.js']), false);
  assert.equal(soloContenuti(['content/a.txt']), false);
  assert.equal(soloContenuti(['content/']), false);
  assert.equal(soloContenuti(['content/sub/a.json']), false);
});

test('rifiuta percorsi con ..', () => {
  assert.equal(soloContenuti(['content/../src/app.js']), false);
  assert.equal(soloContenuti(['content/../x.json']), false);
  assert.equal(soloContenuti(['../content/a.json']), false);
});

test('CLI: exit 0 / 1, righe vuote ignorate', () => {
  const run = (input) =>
    spawnSync('node', ['scripts/solo-contenuti.mjs'], { input, encoding: 'utf8' }).status;
  assert.equal(run('content/a.json\n\ndocs/CONTENUTI.md\n'), 0);
  assert.equal(run('content/a.json\nsrc/app.js\n'), 1);
  assert.equal(run(''), 1);
  assert.equal(run('\n\n'), 1);
});

test('rifiuta content/corso.json, da solo o in una lista mista', () => {
  assert.equal(soloContenuti(['content/corso.json']), false);
  assert.equal(soloContenuti(['content/levels.json', 'content/corso.json']), false);
  assert.equal(soloContenuti(['docs/CONTENUTI.md', 'content/corso.json']), false);
  const run = (input) =>
    spawnSync('node', ['scripts/solo-contenuti.mjs'], { input, encoding: 'utf8' }).status;
  assert.equal(run('content/corso.json\n'), 1);
});

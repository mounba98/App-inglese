import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
const pages = readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');

test('sw.js: il segnaposto __VERSIONE__ compare esattamente una volta', () => {
  assert.equal(sw.split('__VERSIONE__').length - 1, 1);
  assert.match(sw, /const CACHE = 'inglese-__VERSIONE__';/);
});

test('pages.yml: ogni percorso copiato esiste', () => {
  const m = pages.match(/SITE_FILES="([^"]+)"/);
  assert.ok(m, 'riga SITE_FILES non trovata');
  const files = m[1].split(/\s+/).filter(Boolean);
  assert.ok(files.length > 0);
  for (const f of files) assert.ok(existsSync(path.join(root, f)), `manca ${f}`);
  for (const f of ['index.html', 'sw.js', 'src', 'content', 'icons']) assert.ok(files.includes(f), f);
});

test('pages.yml: ha workflow_dispatch e il segnaposto è sostituito solo in sw.js', () => {
  assert.match(pages, /^\s*workflow_dispatch:/m);
  assert.match(pages, /sed -i .*_site\/sw\.js/);
});

test('pages.yml: genera l\'audio con Piper in _site/audio, con voce in cache', () => {
  assert.match(pages, /actions\/setup-python@v5/);
  assert.match(pages, /python-version: '3\.11'/);
  assert.match(pages, /pip install piper-tts==1\.8\.0/);
  assert.match(pages, /actions\/cache@v4/);
  assert.match(pages, /key: .*en_US-ljspeech-high/);
  assert.match(pages, /rhasspy\/piper-voices\/resolve\/main\/en\/en_US\/ljspeech\/high/);
  assert.match(pages, /scripts\/genera_audio\.py _site\/audio /);
});

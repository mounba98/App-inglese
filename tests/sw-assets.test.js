import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
const block = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
const listed = block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

test('sw.js: lista di precache trovata e con percorsi relativi', () => {
  assert.ok(listed.length > 0);
  for (const p of listed) assert.ok(p.startsWith('./'), p);
});

test('sw.js: ogni file elencato esiste', () => {
  for (const p of listed) {
    const f = path.join(root, p === './' ? 'index.html' : p);
    assert.ok(existsSync(f), `manca ${p}`);
  }
});

test('sw.js: ogni src/*.js e content/*.json è elencato', () => {
  for (const [dir, ext] of [['src', '.js'], ['content', '.json']]) {
    for (const f of readdirSync(path.join(root, dir)).filter((n) => n.endsWith(ext))) {
      assert.ok(listed.includes(`./${dir}/${f}`), `non in cache: ${dir}/${f}`);
    }
  }
});

test('manifest: icone elencate nel manifest sono in cache e esistono', () => {
  const m = JSON.parse(readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const i of m.icons) {
    assert.ok(existsSync(path.join(root, i.src)), i.src);
    assert.ok(listed.includes(`./${i.src}`), i.src);
  }
});

test('sw.js: src/audio.js in precache; audio/ in cache al primo uso, index dalla rete', () => {
  assert.ok(listed.includes('./src/audio.js'));
  assert.ok(!listed.some((p) => p.includes('audio/')), 'i file audio non vanno nel precache');
  assert.match(sw, /AUDIO_PATH/);
  assert.match(sw, /audio\/index\.json|'index\.json'/);
  assert.match(sw, /res\.ok && res\.status === 200 && res\.type === 'basic'/);
  assert.match(sw, /status: 206/);
});

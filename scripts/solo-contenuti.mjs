// Dice se una lista di file cambiati riguarda solo i contenuti.
// Uso: node scripts/solo-contenuti.mjs < elenco.txt (un percorso per riga) -> exit 0 se solo contenuti, 1 altrimenti.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const CONTENUTO = /^content\/[^/]+\.json$/;
// Le impostazioni del corso non sono contenuti: non passano mai da un merge automatico.
const RISERVATI = new Set(['content/corso.json']);

export function soloContenuti(files) {
  if (!Array.isArray(files) || files.length === 0) return false;
  return files.every((f) => {
    if (typeof f !== 'string') return false;
    if (f.split('/').includes('..') || f.includes('\\')) return false;
    if (RISERVATI.has(f)) return false;
    return f === 'docs/CONTENUTI.md' || CONTENUTO.test(f);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const righe = readFileSync(0, 'utf8')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
  process.exit(soloContenuti(righe) ? 0 : 1);
}

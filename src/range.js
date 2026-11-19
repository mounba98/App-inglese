// Script classico (importScripts nel service worker), senza export: definisce parseRange.
// Risultato: null = ignora l'intervallo e rispondi 200 intero; 'unsatisfiable' = 416;
// altrimenti { start, end } (estremi inclusi).
function parseRange(header, size) {
  const m = header ? /^bytes=(\d*)-(\d*)$/.exec(String(header).trim()) : null;
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0) return 'unsatisfiable';
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    if (m[2] !== '' && Number(m[2]) < start) return null;
  }
  if (start >= size) return 'unsatisfiable';
  return { start, end };
}

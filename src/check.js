// Normalizza una risposta per il confronto.
export function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?]+$/, '')
    .trim();
}

export function isCorrect(answer, accepted) {
  const a = normalize(answer);
  if (a === '') return false;
  return accepted.some((x) => normalize(x) === a);
}

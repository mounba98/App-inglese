// Regole della lingua: come si confronta una risposta e come si fa l'aiuto.
// Il corso (content/corso.json) sceglie il gruppo di regole con il campo «regole».
// Oggi esiste solo «latino», con il comportamento di sempre.

// Normalizza una risposta per il confronto.
export function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[,.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrect(answer, accepted) {
  const a = normalize(answer);
  if (a === '') return false;
  return accepted.some((x) => normalize(x) === a);
}

// Aiuto: prima lettera di ogni parola, '_' per le altre lettere/cifre;
// spazi, apostrofi, trattini e punteggiatura restano.
export function maskAnswer(text) {
  return String(text).replace(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu, (w) => {
    const [first, ...rest] = Array.from(w);
    return first + rest.map((c) => (/[\p{L}\p{N}]/u.test(c) ? '_' : c)).join('');
  });
}

const LATINO = Object.freeze({ normalize, isCorrect, maskAnswer });

const REGOLE = { latino: LATINO };

// Nome sconosciuto o mancante: regole «latino».
export function regoleLingua(nome) {
  return Object.hasOwn(REGOLE, nome) ? REGOLE[nome] : LATINO;
}

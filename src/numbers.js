// Numeri scritti in inglese (0..9999): logica pura, nessun DOM.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below100(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? t : `${t}-${ONES[n % 10]}`;
}

// Parti del numero: migliaia, centinaia, resto sotto 100 (come testi, '' se assenti).
function parts(n) {
  const th = Math.floor(n / 1000);
  const hu = Math.floor((n % 1000) / 100);
  const tail = n % 100;
  return {
    thousands: th ? `${ONES[th]} thousand` : '',
    hundreds: hu ? `${ONES[hu]} hundred` : '',
    tail: tail ? below100(tail) : '',
  };
}

export function numberToWords(n) {
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new RangeError('numero fuori da 0..9999');
  if (n === 0) return 'zero';
  const { thousands, hundreds, tail } = parts(n);
  return [thousands, hundreds, tail].filter(Boolean).join(' ');
}

// Forme accettate: base, senza trattini, con «and» (britannico). Mai le cifre.
export function numberAccept(n) {
  const base = numberToWords(n);
  if (n === 0) return [base];
  const { thousands, hundreds, tail } = parts(n);
  const out = new Set([base]);
  const rest = [hundreds, tail].filter(Boolean);
  // «and» dopo le migliaia (se c'è un resto) e prima del resto sotto 100 (se n >= 100)
  const andAfterThousands = thousands && rest.length > 0 ? [false, true] : [false];
  const andBeforeTail = n >= 100 && tail ? [false, true] : [false];
  for (const a1 of andAfterThousands) {
    for (const a2 of andBeforeTail) {
      const seq = [thousands];
      if (a1) seq.push('and');
      seq.push(hundreds);
      if (a2 && (hundreds || (thousands && !a1))) seq.push('and');
      seq.push(tail);
      out.add(seq.filter(Boolean).join(' '));
    }
  }
  if (n === 100) out.add('a hundred');
  if (n === 1000) out.add('a thousand');
  for (const f of [...out]) out.add(f.replace(/-/g, ' '));
  return [...out];
}

// count numeri distinti: metà sotto 100, metà fino a max. Gli id sono num-<n>.
export function numberItems(count, rng = Math.random, max = 9999) {
  const pick = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const low = Math.floor(count / 2);
  const seen = new Set();
  const items = [];
  const add = (lo, hi) => {
    let n;
    do { n = pick(lo, hi); } while (seen.has(n));
    seen.add(n);
    items.push({ id: `num-${n}`, en: numberToWords(n), it: String(n), accept: numberAccept(n) });
  };
  for (let i = 0; i < low; i += 1) add(0, Math.min(99, max));
  for (let i = low; i < count; i += 1) add(Math.min(100, max), max);
  return items.sort(() => rng() - 0.5);
}

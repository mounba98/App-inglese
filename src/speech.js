// Audio: sintesi vocale inglese. Mai leggere l'inglese con una voce non inglese.

const norm = (l) => String(l || '').toLowerCase().replace(/_/g, '-');

function voicesOf(env) {
  try {
    return Array.from(env?.speechSynthesis?.getVoices?.() ?? []);
  } catch {
    return [];
  }
}

function pickVoice(env, lang = 'en-US') {
  const voices = voicesOf(env);
  const want = norm(lang);
  return (
    voices.find((v) => norm(v.lang) === want) ??
    voices.find((v) => norm(v.lang).startsWith(norm(lang).split('-')[0])) ??
    null
  );
}

export function hasSpeech(env = globalThis, lang = 'en') {
  return !!env?.speechSynthesis && pickVoice(env, lang) !== null;
}

export function whenVoicesReady(env = globalThis, timeoutMs = 1500, lang = 'en') {
  const synth = env?.speechSynthesis;
  if (!synth) return Promise.resolve(false);
  if (hasSpeech(env, lang)) return Promise.resolve(true);
  // Voci già caricate ma nessuna inglese: inutile aspettare.
  if (voicesOf(env).length > 0) return Promise.resolve(false);
  return new Promise((resolve) => {
    let done = false;
    let timer;
    const prevHandler = synth.onvoiceschanged;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { synth.removeEventListener?.('voiceschanged', onChange); } catch { /* ignore */ }
      if (synth.onvoiceschanged === onChange) synth.onvoiceschanged = prevHandler ?? null;
      resolve(ok);
    };
    const onChange = () => { if (hasSpeech(env, lang)) finish(true); };
    try {
      if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', onChange);
      else synth.onvoiceschanged = onChange;
    } catch { /* ignore */ }
    timer = setTimeout(() => finish(hasSpeech(env, lang)), timeoutMs);
  });
}

// Riferimento forte: Android Chrome può raccogliere l'utterance prima di onend.
let current = null;

export async function speak(text, env = globalThis, lang = 'en-US', safetyMs = Math.max(4000, String(text ?? '').length * 200)) {
  try {
    const synth = env?.speechSynthesis;
    const Utter = env?.SpeechSynthesisUtterance;
    if (!synth || !Utter) return false;
    if (!(await whenVoicesReady(env))) return false;
    const voice = pickVoice(env, lang);
    if (!voice) return false;
    return await new Promise((resolve) => {
      let timer;
      const done = (ok) => { clearTimeout(timer); if (current === u) current = null; resolve(ok); };
      let u;
      try {
        u = new Utter(text);
        current = u;
        u.lang = voice.lang || lang;
        u.voice = voice;
        u.rate = 0.85;
        u.onend = () => done(true);
        u.onerror = () => done(false);
        // onend/onerror a volte non scattano mai: non restare appesi.
        timer = setTimeout(() => done(true), safetyMs);
        // Chrome: cancel() subito prima di speak() a volte inghiotte la frase.
        // Si annulla solo se serve e si parla al giro successivo.
        const go = () => {
          try { synth.speak(u); } catch { done(false); }
        };
        if (synth.speaking || synth.pending) {
          synth.cancel();
          setTimeout(go, 0);
        } else go();
      } catch {
        done(false);
      }
    });
  } catch {
    return false;
  }
}

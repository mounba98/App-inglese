// Riproduzione: file audio pre-generati (Piper), voce del telefono solo come ripiego.

export async function loadAudioIndex(fetchFn = globalThis.fetch?.bind(globalThis), url = 'audio/index.json') {
  try {
    const res = await fetchFn(url);
    if (!res || !res.ok) return {};
    const data = await res.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function createPlayer({ index, env = globalThis, speakFn, hasSpeechFn, basePath = 'audio/', safetyMs = 15000 }) {
  const files = index && typeof index === 'object' ? index : {};
  let active = null; // { audio, finish }

  const hasFile = (item) => !!item && typeof files[item.id] === 'string' && typeof env?.Audio === 'function';
  const hasVoice = () => { try { return !!hasSpeechFn?.(); } catch { return false; } };
  const fallback = async (item) => {
    try { return hasVoice() ? !!(await speakFn(item.en)) : false; } catch { return false; }
  };

  function stop() {
    if (!active) return;
    const { audio, finish } = active;
    active = null;
    try { audio.pause(); } catch { /* ignora */ }
    try { env?.speechSynthesis?.cancel?.(); } catch { /* ignora */ }
    finish(false);
  }

  return {
    stop,
    canPlay: (item) => hasFile(item) || hasVoice(),
    async play(item) {
      stop();
      if (!hasFile(item)) return fallback(item);
      return new Promise((resolve) => {
        let timer;
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (active && active.finish === finish) active = null;
          resolve(ok);
        };
        let failing = false;
        const failed = () => {
          if (settled || failing) return;
          failing = true;
          if (active && active.finish === finish) active = null;
          fallback(item).then(finish);
        };
        let audio;
        try {
          audio = new env.Audio(`${basePath}${files[item.id]}`);
          active = { audio, finish };
          audio.onended = () => finish(true);
          audio.onerror = failed;
          timer = setTimeout(() => { try { audio.pause(); } catch { /* ignora */ } finish(true); }, safetyMs);
          const r = audio.play();
          if (r && typeof r.catch === 'function') r.catch(failed);
        } catch {
          failed();
        }
      });
    },
  };
}

# Voce naturale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** la sintesi vocale del telefono sbaglia (legge «A» come articolo, «E — egg» male). Si generano file audio con una voce libera e gratuita (Piper, voce `en_US-ljspeech-high`, pubblico dominio) a ogni pubblicazione, per ogni elemento dei contenuti; l'app li suona e usa la voce del telefono solo se il file manca.

**Spec:** richiesta di Nicola del 19/11 («non ci sono voci già fatte e gratuite?»); vincoli della spec `2026-11-18-app-infinita-design.md` (nessun intervento di Nicola, contenuti che crescono da soli).

## Global Constraints
- I file audio nascono in GitHub Actions al momento della pubblicazione (mai nel repository): ogni contenuto nuovo ha la voce senza fare nulla.
- Voce: Piper `en_US-ljspeech-high` (pubblico dominio). Testo letto = `en` con « — » sostituito da «, ».
- Formato: MP3 mono 64 kbps o meno (ffmpeg), un file per item: `audio/<id>.mp3`, più `audio/index.json` = `{"<id>": "<id>.mp3", ...}`.
- App: se l'item ha un file → `Audio`; se il file non c'è, non carica o dà errore → voce del telefono (`speak`) come oggi; se nessuna delle due → la nota «L'audio non è disponibile su questo telefono».
- Il pulsante «Ascolta» compare se c'è il file **oppure** la voce del telefono.
- Offline: i file audio si mettono nella cache al primo ascolto (non in blocco all'installazione: crescerebbero all'infinito).
- Numeri generati (`num-*`) e item senza file usano la voce del telefono.
- Nessuna dipendenza npm; in CI `pip install piper-tts`, modello scaricato da Hugging Face e tenuto in `actions/cache`.

### Task 1: Generazione dei file audio
- `scripts/genera_audio.py OUT_DIR VOICE_ONNX`: legge `content/levels.json` e `content/topics.json`, per ogni item scrive `OUT_DIR/<id>.mp3` e `OUT_DIR/index.json`; testo letto come sopra; esce ≠ 0 se un item fallisce.
- `pages.yml`: Python 3.11, `pip install piper-tts`, cache del modello, generazione in `_site/audio/` dopo `npm test`.
- Test: funzione pura `testo_da_leggere(en)` (Python, `python3 -m unittest`) e test Node che `pages.yml` genera in `_site/audio`.

### Task 2: Riproduzione nell'app
- `src/audio.js`: `loadAudioIndex(fetchFn)` → mappa (vuota se manca/errore); `createPlayer({index, env, speakFn, hasSpeechFn, basePath = 'audio/'})` con `canPlay(item)` e `play(item): Promise<boolean>` (file, poi voce del telefono; ferma il suono precedente; un solo `Audio` alla volta; si risolve sempre).
- `app.js`: usa il player per «Ascolta» e per l'autoplay del dettato; l'indice si carica all'avvio insieme ai contenuti, senza bloccarli.
- `sw.js`: le richieste sotto `audio/` (tranne index.json, che va sempre dalla rete con ripiego in cache) si mettono in cache al primo uso, nella cache della versione; `src/audio.js` negli ASSETS.
- Test con `Audio` finto.

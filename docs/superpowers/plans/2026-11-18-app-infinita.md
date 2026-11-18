# App infinita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** pratica senza fine, pubblicazione automatica e contenuti che crescono da soli.

**Architecture:** come la fase 1 (statico, moduli ES, `node --test`). Moduli puri nuovi: `src/numbers.js`, `src/practice.js`. Automazione con GitHub Actions (`.github/workflows/`). La crescita dei contenuti la fa un'attività programmata di Claude Code nel cloud (creata dal controllore alla fine, non è un task).

**Spec:** `docs/superpowers/specs/2026-11-18-app-infinita-design.md`

## Global Constraints
- Telefono; testo ≥ 20px (1.25rem); pulsanti ≥ 56px; interfaccia in italiano; nessun punteggio o serie.
- I contenuti crescono senza toccare il codice.
- Item = `{id, en, it, accept?}`; la fase write mostra solo `it`; `isCorrect` ignora maiuscole, spazi, apostrofi curvi, `, . ! ?`.
- Nessuna dipendenza npm.

## Review Focus
- Numeri: `numberToWords` corretto per 0, 13, 15, 40, 100, 101, 110, 999, 1000, 1001, 2024, 9999; accettate le forme con e senza trattino e con «and».
- Pratica: mai vuota per errore, mai più di 8, nessun doppione nella stessa sessione; senza audio niente dettato.
- Workflow: nessuna fusione automatica se cambia anche un solo file fuori da `content/` e `docs/CONTENUTI.md`; la pubblicazione parte anche dopo una fusione automatica (un evento creato con `GITHUB_TOKEN` non avvia altri workflow da solo).

### Task 1: Numeri infiniti
**Files:** Create `src/numbers.js`, `tests/numbers.test.js`; Modify `src/app.js`.
- Produces: `numberToWords(n: number): string` (0..9999, inglese americano, trattino nelle decine composte: «twenty-one», «one hundred five», «two thousand twenty-four»); `numberAccept(n): string[]` (forma base, senza trattini, con «and» dopo le centinaia, e le cifre NO); `numberItems(count: number, rng = Math.random, max = 9999): Item[]` (id `num-<n>`, `it` = la cifra scritta, numeri diversi tra loro, metà sotto 100).
- [ ] Test falliti con i casi del Review Focus, poi implementazione, poi verde.
- [ ] Home: pulsante «Numeri senza fine» quando il livello 2 è completo; sessione di 8 numeri con `startAt: 'write'`, senza `recordAnswer` (i numeri generati non entrano nel ripasso).
- [ ] Commit `feat: numeri senza fine`

### Task 2: Allenamento libero
**Files:** Create `src/practice.js`, `tests/practice.test.js`; Modify `src/lesson.js` (se serve), `src/app.js`.
- Produces: `pickPractice(state: State, content: {levels, topics}, rng = Math.random, n = 8): Item[]` (solo item di lezioni completate; senza doppioni; peso maggiore alle carte con box basso o senza carta; vuoto solo se nessuna lezione completata); modalità dettato nel flusso: `createLessonFlow(lesson, {startAt: 'write', dictation: true})` → `current()` del passo write ha `dictation: true` e l'app mostra solo «Ascolta» + campo, non `it`.
- [ ] Test falliti, implementazione, verde.
- [ ] Home: «Allenamento libero» dopo la prima lezione completata; alterna una sessione scritta e una a dettato (dettato solo se `hasSpeech`); registra `recordAnswer` come il ripasso.
- [ ] Commit `feat: allenamento libero`

### Task 3: Pubblicazione automatica
**Files:** Create `.github/workflows/test.yml`, `.github/workflows/pages.yml`; Modify `sw.js`, `tests/sw-assets.test.js`.
- `sw.js`: `const CACHE = 'inglese-__VERSIONE__';` (in locale resta così e funziona).
- `test.yml`: su `pull_request` e `push` → Node 22, `npm test`.
- `pages.yml`: su `push` a `main` e `workflow_dispatch` → `npm test`; copia i file del sito in `_site/` (index.html, styles.css, manifest, sw.js, src/, content/, icons/), sostituisce `__VERSIONE__` con i primi 12 caratteri dello SHA; `actions/upload-pages-artifact` + `actions/deploy-pages` (permessi `pages: write`, `id-token: write`).
- [ ] Test: `sw.js` contiene il segnaposto esattamente una volta; i file che `pages.yml` copia esistono.
- [ ] Commit `feat: pubblicazione automatica`

### Task 4: Guida ai contenuti e controlli di qualità
**Files:** Create `docs/CONTENUTI.md`, `tests/content-quality.test.js`; Modify `content/*.json` solo se i controlli trovano errori veri.
- `docs/CONTENUTI.md` in italiano: per chi è l'app; formato; regole (max 8 elementi, `it` naturale e senza la risposta, varianti in `accept`, id, tono, niente gergo, inglese americano); come aggiungere un livello (`lN` consecutivo) o un argomento; **Coda** con caselle: almeno 12 livelli (passato di be, passato regolare, passato irregolare, futuro con will, going to, can/could, must/have to/should, presente continuo, comparativi, frasi al telefono, raccontare la giornata, dare indicazioni) e almeno 12 argomenti (vestiti, negozi, città e indicazioni, viaggi, telefono, emozioni, corpo, dal medico (facile), Croce Rossa: aiuto di base, animali, orari e appuntamenti, feste); regola: prendere la prima casella vuota, segnarla fatta; se la coda è vuota aggiungere 5 nuove voci coerenti con la progressione e poi procedere.
- `tests/content-quality.test.js`: per ogni item, nessuna parola di almeno 4 lettere di `en` compare in `it` (salvo item con `"uguale": true`, da aggiungere ai casi reali: pizza, banana, zebra, sport, cinema, film…); ogni `accept` contiene `en`; nessun `en` ripetuto due volte nella stessa lezione; ogni lezione ha un titolo diverso dalle altre dello stesso livello/argomento. Il validatore accetta il campo facoltativo `uguale` (booleano).
- [ ] Test, correzioni dei contenuti necessarie, verde.
- [ ] Commit `feat: guida e controlli dei contenuti`

### Task 5: Fusione automatica dei contenuti
**Files:** Create `.github/workflows/contenuti-auto.yml`, `scripts/solo-contenuti.mjs`, `tests/solo-contenuti.test.js`.
- `scripts/solo-contenuti.mjs`: legge un elenco di file (stdin, uno per riga) ed esce 0 solo se tutti stanno in `content/` o sono `docs/CONTENUTI.md`, altrimenti 1; funzione esportata `soloContenuti(files: string[]): boolean`.
- `contenuti-auto.yml`: su `pull_request` verso `main` (opened, synchronize, reopened) → checkout con storia; `npm test`; elenco file cambiati rispetto alla base; se `soloContenuti` → `gh pr merge --squash` con `GITHUB_TOKEN` (permessi `contents: write`, `pull-requests: write`, `actions: write`) e poi `gh workflow run pages.yml --ref main`; altrimenti non fa nulla (una persona la guarda).
- [ ] Test di `soloContenuti`, verde.
- [ ] Commit `feat: fusione automatica dei contenuti`

## Dopo i task (controllore)
- Pull request del ramo verso `main` e fusione.
- Attività programmata nel cloud, due volte a settimana: aggiunge la prossima voce della coda di `docs/CONTENUTI.md` e apre una pull request.

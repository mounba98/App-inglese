# App Inglese Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una web app per telefono (PWA) che insegna l'inglese a una principiante: percorso fisso di basi, poi argomenti a scelta, con audio, ripetizione, scrittura e ripasso a intervalli.

**Architecture:** App statica senza build: HTML + JavaScript a moduli ES + JSON per i contenuti. La logica (controllo risposte, ripasso, progressi, validazione contenuti) sta in moduli puri testati con `node --test`; l'interfaccia li usa. Nessun server, nessun account, progressi nel `localStorage`.

**Tech Stack:** HTML/CSS/JS vanilla (ES modules), Node 22 `node:test` per i test, Web Speech API (`speechSynthesis`) per l'audio, service worker per l'uso offline. Nessuna dipendenza da installare.

**Spec:** `docs/superpowers/specs/2026-11-18-app-inglese-design.md`

## Global Constraints

- Mobile first, solo telefono; testo grande (corpo ≥ 20px), pulsanti ≥ 56px di altezza.
- Interfaccia tutta in italiano; l'inglese è il contenuto.
- Nessun punteggio, classifica o sfida. Nessun account o pagamento.
- Lezioni brevi: massimo 8 elementi nuovi per lezione, circa 10 minuti.
- Percorso fisso livelli 1-6; gli argomenti a scelta si sbloccano solo dopo aver completato tutte le lezioni dei livelli.
- Livelli: 1 alfabeto e suoni, 2 numeri, 3 saluti e presentarsi, 4 *to be* e *to have*, 5 verbi comuni, 6 frasi più lunghe.
- Argomenti iniziali: casa, cibo, famiglia, tempo, salute, lavoro, tempo libero.
- Fase 2 (conversazione AI) fuori da questo piano.

## Review Focus

- Risposta scritta con tastiera del telefono: maiuscola automatica a inizio frase, spazio finale, apostrofo curvo (`I’m`) → deve contare come corretta.
- Risposta quasi giusta ma con errore reale (`I have` vs `I has`) → deve restare sbagliata.
- Telefono senza voce inglese o senza `speechSynthesis` → l'app resta usabile e dice che l'audio non c'è.
- `localStorage` assente, pieno o con JSON corrotto → l'app riparte da zero senza bloccarsi.
- Doppio tocco veloce su "Avanti"/"Controlla" → non salta una lezione né registra due risposte.

---

## File Structure

```
english-app/
  index.html            guscio dell'app, carica src/app.js
  styles.css            stile mobile, testo grande
  manifest.webmanifest  installabile
  sw.js                 cache offline
  src/check.js          normalizzazione e controllo risposte
  src/srs.js            ripasso a intervalli
  src/progress.js       stato salvato e sblocchi
  src/content.js        validazione e caricamento contenuti
  src/speech.js         audio con sintesi vocale
  src/app.js            schermate e flusso lezione
  content/levels.json   livelli 1-6
  content/topics.json   argomenti a scelta
  tests/*.test.js
```

### Task 1: Controllo delle risposte

**Files:**
- Create: `english-app/src/check.js`, `english-app/tests/check.test.js`, `english-app/package.json` (`{"type":"module","scripts":{"test":"node --test tests/"}}`)
- Init: `git init` in `english-app/`

**Interfaces:**
- Produces: `normalize(s: string): string`, `isCorrect(answer: string, accepted: string[]): boolean`

- [ ] **Step 1: Test falliti:**
  - `normalize(" I’m Fine. ") === "i'm fine"`
  - `isCorrect("Good morning ", ["good morning"])` è `true`
  - `isCorrect("I’m fine", ["I'm fine"])` è `true`
  - `isCorrect("I has a dog", ["I have a dog"])` è `false`
  - `isCorrect("", ["hello"])` è `false`
- [ ] **Step 2: Esegui `npm test`** e verifica che fallisca (modulo mancante).
- [ ] **Step 3: Implementa** `normalize` (minuscole, trim, spazi multipli → uno, `’`/`‘` → `'`, tolti `. , ! ?` finali) e `isCorrect` (confronto dopo normalize con qualunque voce di `accepted`; risposta vuota sempre falsa).
- [ ] **Step 4: Esegui `npm test`**, tutto verde.
- [ ] **Step 5: Commit** `feat: controllo risposte`

### Task 2: Ripasso a intervalli

**Files:**
- Create: `english-app/src/srs.js`, `english-app/tests/srs.test.js`

**Interfaces:**
- Produces: `type Card = {box: number, due: string}` (`due` = data locale `YYYY-MM-DD`); `nextReview(card: Card, correct: boolean, today: string): Card`; `dueCards(cards: Record<string, Card>, today: string): string[]`; `todayLocal(now?: Date): string`

- [ ] **Step 1: Test falliti:**
  - risposta giusta da box 1 → box 2, `due` = oggi + 1 giorno (intervalli per box 1..5: 0, 1, 3, 7, 14 giorni)
  - risposta giusta al box 5 resta box 5, `due` = oggi + 14
  - risposta sbagliata da qualunque box → box 1, `due` = oggi
  - `dueCards` restituisce solo gli id con `due <= today`, ordinati per `due` poi per `box` crescente
  - `todayLocal(new Date(2026, 10, 18, 23, 59)) === "2026-11-18"` (data locale, non UTC)
- [ ] **Step 2: Esegui** e verifica il fallimento.
- [ ] **Step 3: Implementa** le tre funzioni; l'addizione dei giorni usa `Date` in locale, mai `toISOString()`.
- [ ] **Step 4: Esegui**, verde.
- [ ] **Step 5: Commit** `feat: ripasso a intervalli`

### Task 3: Progressi e sblocchi

**Files:**
- Create: `english-app/src/progress.js`, `english-app/tests/progress.test.js`

**Interfaces:**
- Consumes: `nextReview`, `Card` da `srs.js`
- Produces: `createProgress(storage: {getItem(k): string|null, setItem(k,v): void} | null): Progress` con `get(): State`, `completeLesson(id: string): void`, `recordAnswer(cardId: string, correct: boolean, today: string): void`, `isLessonUnlocked(lessonId: string, levels: Level[]): boolean`, `topicsUnlocked(levels: Level[]): boolean`; `State = {completed: string[], cards: Record<string, Card>}`. Chiave di salvataggio: `"inglese-v1"`.

- [ ] **Step 1: Test falliti:**
  - stato iniziale `{completed: [], cards: {}}`
  - `completeLesson("l1-01")` due volte lascia un solo elemento
  - `recordAnswer("c1", false, "2026-11-18")` crea la carta in box 1; poi `true` la porta a box 2
  - la prima lezione del livello 1 è sbloccata; `l1-02` solo dopo `l1-01`; la prima lezione del livello 2 solo dopo l'ultima del livello 1
  - `topicsUnlocked` è `false` finché non sono complete tutte le lezioni di tutti i livelli
  - `createProgress(null)` funziona in memoria senza errori; JSON corrotto in `getItem` → stato iniziale; `setItem` che lancia (storage pieno) → nessuna eccezione verso il chiamante
- [ ] **Step 2: Esegui**, fallimento.
- [ ] **Step 3: Implementa** in `progress.js`; ogni accesso a `storage` in try/catch.
- [ ] **Step 4: Esegui**, verde.
- [ ] **Step 5: Commit** `feat: progressi e sblocchi`

### Task 4: Formato contenuti e livelli 1-2

**Files:**
- Create: `english-app/src/content.js`, `english-app/content/levels.json`, `english-app/content/topics.json` (per ora `[]`), `english-app/tests/content.test.js`

**Interfaces:**
- Produces: `validateContent(levels: Level[], topics: Topic[]): string[]` (lista errori, vuota se ok); `loadContent(fetchFn = fetch): Promise<{levels: Level[], topics: Topic[]}>`
- Formato: `Level = {id: "l1", title: string, lessons: Lesson[]}`, `Topic = {id: string, title: string, lessons: Lesson[]}`, `Lesson = {id: string, title: string, items: Item[]}`, `Item = {id: string, en: string, it: string, accept?: string[]}`. `accept` default = `[en]`.

- [ ] **Step 1: Test falliti** su `validateContent`: id duplicati, `en` o `it` vuoti, lezione con più di 8 elementi, lezione senza elementi, livelli non in ordine `l1..l6`; più un test che `validateContent` sui file reali restituisce `[]`.
- [ ] **Step 2: Esegui**, fallimento.
- [ ] **Step 3: Implementa** `validateContent` e `loadContent`; scrivi i contenuti dei livelli 1 (alfabeto a gruppi di 6-8 lettere con parola d'esempio e nota di pronuncia in italiano nel campo `it`) e 2 (numeri 0-100 a gruppi).
- [ ] **Step 4: Esegui**, verde.
- [ ] **Step 5: Commit** `feat: formato contenuti, livelli 1-2`

### Task 5: Audio

**Files:**
- Create: `english-app/src/speech.js`, `english-app/tests/speech.test.js`

**Interfaces:**
- Produces: `hasSpeech(env = globalThis): boolean` (true solo se esiste `speechSynthesis` **e** `getVoices()` contiene almeno una voce con `lang` che inizia per `en`; le voci possono caricarsi in ritardo, quindi gestire anche l'evento `voiceschanged`); `speak(text: string, env = globalThis, lang = "en-US"): Promise<boolean>` (imposta `utterance.lang` e `utterance.voice` sulla voce inglese trovata; risolve `true` a fine pronuncia, `false` se non supportato, se non c'è una voce inglese o in caso di errore: mai leggere l'inglese con la voce italiana). Test aggiuntivo: con sole voci `it-IT` → `hasSpeech` false e `speak` risolve `false`.

- [ ] **Step 1: Test falliti** con `env` finto: senza `speechSynthesis` → `hasSpeech` false e `speak` risolve `false` senza lanciare; con un finto `speechSynthesis` che richiama `onend` → `true`; con `onerror` → `false`; `speak` annulla la pronuncia in corso prima di una nuova.
- [ ] **Step 2: Esegui**, fallimento.
- [ ] **Step 3: Implementa** con `SpeechSynthesisUtterance` da `env`, velocità `0.85`.
- [ ] **Step 4: Esegui**, verde.
- [ ] **Step 5: Commit** `feat: audio`

### Task 6: Flusso lezione (interfaccia)

**Files:**
- Create: `english-app/index.html`, `english-app/styles.css`, `english-app/src/app.js`
- Test: `english-app/tests/lesson-flow.test.js` (solo la logica pura del flusso, in `src/lesson.js`)
- Create: `english-app/src/lesson.js`

**Interfaces:**
- Consumes: `isCorrect`, `createProgress`, `speak`, `hasSpeech`, `loadContent`, `todayLocal`, `dueCards`
- Produces: `createLessonFlow(lesson: Lesson): Flow` con `current(): {step: "learn"|"repeat"|"write", item: Item} | {step: "done"}`, `advance(): void`, `submit(answer: string): boolean`. Ordine per ogni elemento: `learn` (testo + traduzione + ascolta), `repeat` (ripeti ad alta voce, pulsante "L'ho detto"), `write` (vede l'italiano, scrive l'inglese). Un `advance()` o `submit()` consecutivo sullo stesso passo viene ignorato finché lo stato non è cambiato.

- [ ] **Step 1: Test falliti** su `createLessonFlow`: sequenza learn→repeat→write per ogni item; `submit` giusto restituisce `true` e passa all'item successivo; `submit` sbagliato restituisce `false` e resta sullo stesso passo (mostra la soluzione al secondo errore); due `advance()` rapidi consecutivi spostano di un solo passo; finiti tutti gli item `current()` è `{step: "done"}`.
- [ ] **Step 2: Esegui**, fallimento.
- [ ] **Step 3: Implementa** `lesson.js`; poi `index.html`/`styles.css`/`app.js` con le schermate: Home (lezione di oggi + ripasso se ci sono carte da rivedere), Lezione, Fine lezione (chiama `completeLesson` e `recordAnswer`). Se `hasSpeech()` è falso mostra "L'audio non è disponibile su questo telefono" e nasconde il pulsante ascolta. Pulsanti disabilitati durante la transizione.
- [ ] **Step 4: Esegui `npm test`**, verde; avvia `python3 -m http.server` nella cartella e apri la pagina in un browser a larghezza 390px per un controllo visivo del flusso.
- [ ] **Step 5: Commit** `feat: flusso lezione`

### Task 7: Livelli 3-6

**Files:**
- Modify: `english-app/content/levels.json`

- [ ] **Step 1:** Aggiungi livello 3 (saluti, presentarsi), 4 (*to be*, *to have*: affermative, negative, domande), 5 (verbi comuni: go, want, like, eat, live, work, need, have, see, speak), 6 (frasi con *and, but, because, when*; domande utili). Rispetta il massimo di 8 elementi per lezione; `accept` per le varianti con contrazione (`I am` / `I'm`).
- [ ] **Step 2: Esegui `npm test`** (il test su file reali di `validateContent` deve dare `[]`).
- [ ] **Step 3: Commit** `feat: livelli 3-6`

### Task 8: Argomenti a scelta

**Files:**
- Modify: `english-app/content/topics.json`, `english-app/src/app.js`, `english-app/styles.css`

**Interfaces:**
- Consumes: `topicsUnlocked`, `State.completed`

- [ ] **Step 1:** Scrivi i sette argomenti (casa, cibo, famiglia, tempo, salute, lavoro, tempo libero), 2-3 lezioni da ≤ 8 elementi ciascuno, con frasi da chiacchierata quotidiana.
- [ ] **Step 2:** Nella Home mostra "Scegli un argomento" solo se `topicsUnlocked(levels)` è vero; prima mostra "Argomenti: si sbloccano dopo i livelli 1-6".
- [ ] **Step 3: Esegui `npm test`**, verde; controllo visivo con una progressione simulata.
- [ ] **Step 4: Commit** `feat: argomenti a scelta`

### Task 9: App installabile e uso offline

**Files:**
- Create: `english-app/manifest.webmanifest`, `english-app/sw.js`, `english-app/icons/` (due icone PNG semplici 192 e 512)
- Modify: `english-app/index.html` (link al manifest, registrazione del service worker)

- [ ] **Step 1:** Manifest con nome "Inglese", `display: "standalone"`, colori, icone. Service worker che mette in cache `index.html`, `styles.css`, `src/*.js`, `content/*.json`, con strategia "cache first" e aggiornamento in background; il nome della cache include una versione.
- [ ] **Step 2:** Verifica in un browser: Lighthouse/DevTools mostra il manifest valido e l'app si carica con la rete spenta dopo la prima visita.
- [ ] **Step 3:** Pubblica come sito statico gratuito (GitHub Pages o altro hosting statico scelto da Nicola) e prova l'installazione dal telefono.
- [ ] **Step 4: Commit** `feat: pwa e offline`

---

## Self-Review

- **Copertura della spec:** basi fisse e livelli (T4, T7), argomenti dopo i livelli (T3, T8), audio (T5), ripetizione e scrittura (T6), ripasso (T2, T6), niente account (T3), telefono e offline (T6, T9). L'AI è fuori piano per decisione di Nicola.
- **Coerenza dei tipi:** `Card`, `State`, `Lesson`, `Item` definiti in T2-T4 e usati con gli stessi nomi in T3, T6, T8.
- **Review Focus:** apostrofi e maiuscole e `I has` → T1; senza voce → T5 e T6; storage corrotto → T3; doppio tocco → T6.

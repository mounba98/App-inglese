# Lezioni nuove: teoria, scelta multipla, aiuti, numeri rifatti

Data: 22/11/2026. Viene da `docs/TODO.md` (punti 1–4) e dal confronto con il programma di storia che Nicola preferisce. Di quel programma piacciono quattro cose: la teoria prima delle domande, le domande a scelta con la spiegazione subito dopo, l'elenco dei capitoli con lo stato, e alla fine l'elenco degli errori.

Le regole di sempre restano: prima il telefono, testo grande, interfaccia in italiano, testo al femminile, nessun punteggio né percentuale.

## Comportamento

### Flusso di una lezione nuova (`startAt: 'learn'`)

1. **teoria**: una volta per lezione, solo se la lezione ha il campo `teoria`. Il testo si legge in italiano; il pulsante «Leggi in inglese» passa all'altra lingua e «Leggi in italiano» torna indietro. Il pulsante «Ascolta» legge il testo nella lingua mostrata:
   - in inglese con l'audio Piper `audio/<lessonId>-teoria.mp3`, e senza quel file con la voce del telefono;
   - in italiano con la voce italiana del telefono (`it-IT`). Se il telefono non ha una voce italiana, il pulsante non c'è.
   - Sotto c'è il pulsante «Inizia».
2. Per ogni elemento:
   - **impara**: si vedono `en` e `it` e c'è il pulsante Ascolta. Sopra compare la scritta «Ascolta e ripeti ad alta voce». Il vecchio passo `repeat` sparisce e si fonde in questo; il pulsante è «Avanti».
   - **scegli**: si vede `it`, con tre pulsanti in inglese, uno giusto e due sbagliati, in ordine casuale.
     - Se la scelta è giusta compare «Giusto!» e si passa a **scrivi**.
     - Se è sbagliata, la risposta giusta si colora di verde, quella scelta di rosso, e compare «La risposta giusta è: …». Con «Avanti» si passa a **scrivi**, e l'elemento è segnato come sbagliato.
   - **scrivi**: come oggi, con in più il pulsante **«Non lo so»**.
     - Primo tocco: aiuto. Si vede la prima lettera di ogni parola e un trattino basso per ogni altra lettera; spazi, apostrofi e punteggiatura restano come sono. Esempio: `I'm tired` diventa `I'_ t____`.
     - Secondo tocco: la soluzione, come dopo due errori, con il pulsante «Avanti».
     - Se ha chiesto un aiuto, l'elemento conta come sbagliato anche quando poi la risposta è giusta, e torna nel ripasso.

### Ripasso, allenamento e numeri senza fine (`startAt: 'write'`)

Partono direttamente da **scrivi**, senza teoria e senza scelta, ma con il pulsante «Non lo so».

### Fine lezione

Oltre a «Bravissima!», l'elenco degli elementi segnati come sbagliati («Queste le ripassiamo ancora:», `en` — `it`). Se non ce ne sono, non si mostra niente.

### Tutte le lezioni

Nella home c'è una scheda nuova, «Tutte le lezioni». Apre una pagina con i livelli in ordine e, per ogni lezione, il titolo e lo stato:

- «Da fare»: la lezione è sbloccata e non ancora fatta;
- «Fatta»;
- «Da ripassare»: la lezione è fatta e almeno un suo elemento ha la carta nella scatola 1;
- «Bloccata»: il pulsante è disabilitato.

Una lezione fatta si può rifare, e rifarla registra di nuovo le risposte. In fondo alla pagina c'è il pulsante «Indietro».

## Contenuti

### Lezione: campo facoltativo `teoria`

Esempio: `"teoria": {"it": "...", "en": "..."}`.

- Validatore: se c'è, deve essere un oggetto con `it` ed `en`, testi non vuoti di al massimo 1500 caratteri.
- Test di qualità:
  - ogni lezione di ogni livello ha la teoria;
  - ogni lezione di un livello o di un argomento **nuovo** (cioè che non è nella baseline) ha la teoria.
- La parte `it` va scritta in italiano semplice, al femminile quando parla di lei, senza gergo grammaticale. In 3–6 frasi brevi spiega la regola o il trucco della lezione, con 2–3 esempi. La parte `en` dice le stesse cose in inglese molto semplice.

### Elementi per lezione

- Il validatore passa a un massimo di 10, perché «Da 1 a 10» ha 10 elementi.
- Un test di qualità tiene il limite di 8 per le lezioni nuove, cioè quelle che non sono nella baseline.

### Livello 2 rifatto

Gli id delle lezioni restano `l2-01`…`l2-05`. Così chi le ha già fatte non le perde, e il livello 3 resta sbloccato.

| Lezione | Titolo | Elementi |
|---|---|---|
| `l2-01` | Da 1 a 10 | 1–10 |
| `l2-02` | Da 11 a 20 | 11–20 |
| `l2-03` | Le decine e lo zero | 30, 40, 50, 60, 70, 80, 90, 100, 0 |
| `l2-04` | Come si formano i numeri | 21, 35, 47, 58, 64, 72, 86, 99 |
| `l2-05` | Centinaia e migliaia | 200, 350, 500, 1000, 2000, 2026, 1500 |

- Ogni lezione ha la sua teoria: quando i numeri finiscono in -teen e quando in -ty, il trattino tra decine e unità, «hundred» e «thousand» che non prendono la s, la «and» facoltativa.
- Gli elementi che restano uguali tengono il loro id; quelli nuovi seguono lo schema `l2-0N-<numero>`.
- `tests/ids-baseline.json` si aggiorna per il livello 2. Lo fa una persona: Nicola ha dato il via libera il 22/11.
- Gli id vecchi che spariscono lasciano carte orfane. Sono innocue, perché il ripasso filtra gli id che non esistono più.

### Audio

`scripts/genera_audio.py` genera anche `<lessonId>-teoria.mp3` dalla parte `en` della teoria.

### Guida e sessione automatica

`docs/CONTENUTI.md` va aggiornato su quattro punti:

- come viene usato un elemento: impara, scegli, scrivi con gli aiuti;
- il campo `teoria`, obbligatorio per ogni lezione nuova;
- il formato con un esempio;
- la procedura automatica (punto 4: scrivere la teoria per ogni lezione).

## Task

1. **Flusso puro** (`src/lesson.js`, `src/choice.js` nuovo, i rispettivi test e `sw.js`): passi teoria, impara, scegli, scrivi con gli aiuti; distrattori.
2. **Formato dei contenuti** (`src/content.js`, test dei contenuti, `scripts/genera_audio.py` con il suo test, `docs/CONTENUTI.md`).
3. **Interfaccia** (`src/app.js`, `src/speech.js` se serve, `styles.css`): teoria, scelta, «Non lo so», fine lezione con gli errori, «Tutte le lezioni».
4. **Contenuti** (`content/levels.json`, `tests/ids-baseline.json`, test di qualità): livello 2 rifatto e teoria per tutte le lezioni dei livelli 1–6.

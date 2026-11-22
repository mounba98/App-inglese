# Guida ai contenuti

Questa guida serve a chi aggiunge contenuti all'app, in particolare alla sessione automatica di Claude che gira due volte a settimana senza nessuno davanti. Leggila tutta prima di scrivere.

## Per chi è l'app

È per una **donna italiana, principiante assoluta** di inglese. Fa l'infermiera e fa volontariato con la Croce Rossa: ha clienti e persone assistite straniere e vuole poterci **chiacchierare per ore**. Servono frasi di ogni giorno, amichevoli, utili con loro.

Il testo italiano (`it`) è scritto **al femminile**: «stanca», «contenta», «pronta», «sicura».

## Come viene usato un elemento

Prima di tutto, **una volta per lezione**, legge (o ascolta) la **teoria**. Poi, per ogni elemento:

1. **Impara**: vede `en` + `it`, sente l'audio e ripete a voce.
2. **Sceglie** tra tre risposte in inglese. Le altre due vengono da altri elementi della lezione: per questo gli elementi di una lezione devono essere **diversi tra loro**.
3. **Scrive**: vede **solo** `it` e deve digitare l'inglese. Con il pulsante «Non lo so» vede prima le iniziali e poi la soluzione.

Nella pratica libera può anche arrivare in dettatura: sente `en` e lo scrive.

Per questo `it` non deve mai contenere la risposta.

## Formato

I contenuti stanno in due file, **non** altrove:

- `content/levels.json`: un elenco di livelli, **in ordine**.
- `content/topics.json`: un elenco di argomenti.

Esiste anche `content/corso.json` (lingua, voce, titolo): **la sessione automatica non lo tocca mai** e non passa dal merge automatico.

Il JSON è indentato con **1 spazio** e termina con un a capo.

### Elemento

```json
{
  "id": "l6-04-tired-but-happy",
  "en": "I'm tired, but I'm happy",
  "it": "Sono stanca, ma contenta",
  "accept": [
    "I'm tired, but I'm happy",
    "I am tired but I am happy",
    "I'm tired but happy"
  ]
}
```

- `id`: obbligatorio, unico in **tutto** il corso.
- `en`: la frase inglese «da manuale». Obbligatorio.
- `it`: la frase italiana che lei vede. Obbligatorio.
- `accept`: facoltativo. Elenco di risposte accettate. Se manca, vale solo `en`. Se c'è, **deve contenere `en`**.
- `uguale`: facoltativo, booleano. Solo `true`, e solo quando una parola inglese è davvero identica in italiano (pizza, banana, zebra, sport, cinema, film, taxi, Anna…). Serve a far passare il controllo «la risposta non compare in `it`». Non usarlo mai per aggirare il controllo: se la risposta si legge nell'italiano, riscrivi `it`. Il test accetta `uguale` solo per parole di un elenco chiuso (pizza, pasta, banana, zebra, sport, cinema, film, taxi, anna, bar, hotel, menu, computer, internet, email, ok), che solo una persona può cambiare: **se ti serve `uguale` per una parola fuori elenco, non aggiungere l'elemento: scegli un'altra frase.**

### Lezione

```json
{
  "id": "l6-04",
  "title": "Collegare le frasi",
  "teoria": {
    "it": "Per unire due frasi usa «but», che vuol dire «ma». Si mette in mezzo: \"I'm tired, but I'm happy\" è «Sono stanca, ma contenta». Se il soggetto è lo stesso, puoi non ripeterlo: \"I'm tired but happy\".",
    "en": "Use \"but\" to join two ideas. It goes in the middle: \"I'm tired, but I'm happy\". If the person is the same, you can say it only once: \"I'm tired but happy\"."
  },
  "items": [ /* da 1 a 8 elementi */ ]
}
```

#### Scelta (facoltativo)

Il campo `scelta` ha un solo valore ammesso: `"ascolto"`. Si usa quando `it` rivelerebbe la risposta (per esempio nell'alfabeto: «lettera A — esempio: mela»). Nella scelta multipla la studentessa allora **ascolta** la parola (parte da sola, con il pulsante «Ascolta di nuovo») e l'italiano compare solo dopo la risposta. Se l'audio non è disponibile si torna alla scelta normale, con `it` in vista.

#### Teoria

Il campo `teoria` è **obbligatorio per ogni lezione nuova** (il test lo controlla).

- `it`: italiano semplice, al femminile quando parla di lei, niente gergo grammaticale. 3–6 frasi brevi che spiegano la regola o il trucco della lezione, con 2–3 esempi tra virgolette.
- `en`: le stesse cose in inglese molto semplice: frasi brevi, parole già insegnate quando possibile.
- Massimo 1500 caratteri ciascuna.

### Livello

```json
{
  "id": "l7",
  "title": "Il passato di essere",
  "lessons": [ /* da 3 a 5 lezioni */ ]
}
```

### Argomento

```json
{
  "id": "vestiti",
  "title": "I vestiti",
  "lessons": [ /* da 2 a 3 lezioni */ ]
}
```

## Regole

- **Al massimo 8 elementi per lezione.**
- **3–5 lezioni per livello. 2–3 lezioni per argomento.**
- **Id**:
  - livello: `lN`, numeri consecutivi senza buchi (`l7`, poi `l8`…);
  - lezione di livello: `lN-01`, `lN-02`…;
  - elemento: `lN-01-slug`, dove `slug` descrive la frase (minuscole, numeri, trattini);
  - argomento: uno slug (`vestiti`, `tempo-libero`);
  - lezione di argomento: `slug-01`, `slug-02`;
  - elemento di argomento: `slug-01-parola`.
  - **Tutti gli id sono unici** in tutto il corso. Usa solo `a-z`, `0-9` e `-`.
- **`it` è sempre al femminile** quando parla di lei: stanca, contenta, pronta, sicura (mai «stanco», «contento»).
- **`it` è italiano naturale**, come lo direbbe una persona: non una traduzione parola per parola. E **non contiene mai la risposta**: nessuna parola inglese di almeno 4 lettere di `en` può comparire in `it` (salvo `"uguale": true`).
- **`accept` elenca le alternative vere**: forme contratte e non (`I'm` / `I am`), sinonimi (`rubbish` / `trash`), varianti comuni (`Can I have` / `Could I have`). Non servono varianti solo di punteggiatura o maiuscole: il confronto ignora maiuscole, `, . ! ?` e apostrofi curvi. Ogni voce deve essere diversa dalle altre **dopo** questa normalizzazione (il test lo controlla).
- **Inglese americano**: scrivi `color`, `bathroom`, `apartment`, `trash`, `vacation` come risposta principale; le forme britanniche (`colour`, `rubbish`, `holiday`) possono stare solo in `accept`.
- **Niente gergo grammaticale**: non scrivere «present perfect», «verbo ausiliare», «complemento». Nei titoli e nelle frasi usa parole semplici («Che cosa ho fatto ieri»).
- **Difficoltà progressiva**: riusa le parole già insegnate nei livelli e negli argomenti precedenti, e aggiungine poche nuove per lezione. Non inserire di colpo parole e strutture che non ha mai visto.
- **Frasi di ogni giorno, amichevoli, utili con i clienti**: cose che si dicono davvero, con un tono caldo.
- **Nessun `en` ripetuto due volte nella stessa lezione.** Nessun titolo di lezione ripetuto nello stesso livello o argomento.

## Come aggiungere un livello

1. Controlla l'ultimo id in `content/levels.json`. Il nuovo è l'ultimo livello presente, +1, **in coda** (se l'ultimo è `l9`, scrivi `l10`).
2. Aggiungi in fondo all'elenco un livello con 3–5 lezioni `lN-01`, `lN-02`… e al massimo 8 elementi ciascuna.
3. Gli elementi si chiamano `lN-01-slug`.

I livelli restano **in ordine**: si sbloccano uno dopo l'altro. Non inserire mai un livello in mezzo.

## Come aggiungere un argomento

1. Scegli uno slug nuovo, non già usato (guarda `content/topics.json`).
2. Aggiungi in fondo un argomento con 2–3 lezioni `slug-01`, `slug-02`…
3. Gli argomenti si sbloccano **per sempre** una volta completate tutte le lezioni dei primi 6 livelli: aggiungerne di nuovi li rende subito disponibili.

## Cose da non fare mai

- **Non cambiare e non togliere id esistenti** (di livelli, lezioni, elementi). I progressi e le ripetizioni di chi usa l'app si basano su quegli id: cambiarli li perde. Un test (`tests/ids-baseline.json`) controlla che ogni id esistente ci sia ancora e che il suo `en` sia uguale: **si può solo aggiungere, mai togliere o cambiare**. Lo stesso test blocca anche la struttura: ogni livello o argomento esistente deve avere **esattamente** le stesse lezioni, e ogni lezione esistente **esattamente** gli stessi elementi, nello stesso ordine. Quindi **il contenuto nuovo va solo in NUOVI livelli o NUOVI argomenti**: non aggiungere lezioni a un livello o argomento esistente e non inserire elementi in una lezione esistente. Non toccare mai quel file: lo aggiorna solo una persona.
- Non riordinare elementi o lezioni esistenti.
- Non modificare codice, test, stile o altri file.

## Come controllare

```
npm test
```

(Node 22). Fa due cose: il validatore di formato (`src/content.js`) e i controlli di qualità (`tests/content-quality.test.js`): la risposta non compare in `it`, `accept` contiene `en` e non ha voci vuote o doppie, nessun `en` ripetuto in una lezione, titoli diversi, numero di lezioni, forma degli id. **Se un test fallisce, correggi il contenuto**, mai il test.

## Coda

Elenco delle cose da scrivere, **in ordine**. La sessione automatica scrive **una voce per volta**, **alternando**: un livello, poi un argomento, poi di nuovo un livello. Si parte dalla prima casella vuota dei Livelli. Se una delle due liste è finita, si continua con l'altra.

### Livelli

- [ ] Livello: Il passato di essere (was / were)
- [ ] Livello: Il passato regolare (-ed: worked, called, helped)
- [ ] Livello: Il passato irregolare (went, saw, had, made…)
- [ ] Livello: Il futuro con will
- [ ] Livello: Il futuro con going to
- [ ] Livello: Can e could (posso, riesco, potrei)
- [ ] Livello: Must, have to, should (devo, dovrei)
- [ ] Livello: Il presente continuo (sto facendo)
- [ ] Livello: Paragonare le cose (più grande, migliore)
- [ ] Livello: Frasi al telefono
- [ ] Livello: Raccontare la giornata
- [ ] Livello: Dare indicazioni

### Argomenti

- [ ] Argomento: I vestiti
- [ ] Argomento: I negozi
- [ ] Argomento: La città e le indicazioni
- [ ] Argomento: I viaggi
- [ ] Argomento: Il telefono
- [ ] Argomento: Le emozioni
- [ ] Argomento: Il corpo
- [ ] Argomento: Dal medico (facile)
- [ ] Argomento: Croce Rossa, aiuto di base
- [ ] Argomento: Gli animali
- [ ] Argomento: Orari e appuntamenti
- [ ] Argomento: Le feste

## Procedura per la sessione automatica

0. **Se c'è già una pull request di contenuti aperta verso main, non aprirne un'altra: lavora su quel ramo, correggi finché i test passano e aggiornala.** Se dopo tre tentativi i test non passano, lascia la pull request aperta con una nota che spiega il problema, e fermati.
1. Leggi questa guida e, per lo stile e il lessico già insegnato, `content/levels.json` e `content/topics.json`.
2. **Scegli la voce**: alterna un livello e un argomento, una sola voce per esecuzione. Conta le caselle spuntate: se i Livelli ne hanno spuntate quante gli Argomenti (o meno), prendi la prima casella non spuntata dei **Livelli**; altrimenti la prima dei **Argomenti**. Se una delle due liste non ha più caselle vuote, prendi dall'altra.
3. **Se entrambe le liste sono senza caselle vuote**: aggiungi **5 nuovi livelli in fondo alla lista Livelli**, che proseguono la progressione dopo l'ultimo, e **5 nuovi argomenti in fondo alla lista Argomenti**, utili con clienti e assistiti. Usa lo stesso formato delle righe vuote (`- [ ] Livello: …`). Poi prosegui dal punto 2.
4. Scrivi la voce nel file giusto (`content/levels.json` per un livello, `content/topics.json` per un argomento), seguendo formato e regole. Usa solo parole e strutture già insegnate più poche nuove. Scrivi anche la **teoria** di ogni lezione. Prima di andare avanti rileggi tutto come una revisione: la teoria deve essere **corretta e chiara**, gli esempi giusti, il testo italiano semplice e al femminile.
5. Spunta la casella nella Coda con la data di oggi (`date +%F`), così: `- [x] Livello: … (fatto 2026-11-21)`.
6. Lancia `npm test` e correggi i contenuti finché passa tutto. Il test controlla che le caselle spuntate corrispondano ai livelli aggiunti dopo `l6` (spuntati = livelli totali − 6) e agli argomenti aggiunti dopo i 7 iniziali (spuntati = argomenti totali − 7): non spuntare una casella senza scrivere il contenuto, e viceversa.
7. **Tocca solo** `content/*.json` e `docs/CONTENUTI.md`. Qualunque altro file, e la pull request non viene unita da sola.
8. Apri la pull request. Se tutti i test passano e hai toccato solo quei file, viene unita automaticamente.

# App per imparare l'inglese (per la madre di Nicola) — Design

## Intento e perché

La madre di Nicola è infermiera privata, ha clienti stranieri e fa volontariato alla Croce Rossa. Parte da quasi zero e vuole l'inglese per tre motivi: lavoro, Croce Rossa, uso personale. Il bisogno più concreto: **chiacchierare per ore con i clienti** (non solo lessico medico). Nicola, che ama le lingue, vuole un percorso "come con i bambini": prima le basi, poi frasi più complesse, vocabolario a poco a poco, anche in scrittura.

## Obiettivi

- Percorso a livelli: alfabeto e suoni, numeri, *essere/avere*, verbi più comuni, poi frasi più complesse.
- Vocabolario per **argomenti scelti da lei** (casa, cibo, famiglia, salute, tempo, hobby...), con audio.
- Esercizi di ascolto, ripetizione e **scrittura** (digitare la parola/frase).
- Lezioni da ~10 minuti al giorno, usabili da telefono.
- In una seconda fase: conversazione guidata con l'AI, che usa solo ciò che lei ha già imparato.
- **Crescita senza fine (richiesta di Nicola):** l'app deve poter crescere all'infinito. Per questo i contenuti stanno in JSON con un validatore, così nuovi livelli, argomenti e lezioni (scritti a mano o generati dall'AI più avanti) si aggiungono senza toccare il codice. Le lezioni oltre il livello 6 e gli argomenti nuovi seguono lo stesso formato.

## Non-obiettivi

- Punteggi, sfide, classifiche, gamification aggressiva.
- Account, registrazione, pagamenti.
- Lessico medico avanzato (arriverà come argomento extra, non è il centro).

## Anti-obiettivi (sarebbe un fallimento anche se "funziona")

- Pulsanti piccoli, testo fitto, menu complicati.
- Lezioni lunghe o troppe cose nuove per volta.
- Spiegazioni grammaticali pesanti in gergo tecnico.

## Vincoli

- Solo telefono (mobile first), testo grande, pulsanti grandi.
- Costo vicino a zero per la parte di corso.
- Interfaccia tutta in italiano; l'inglese è il contenuto.

## Approcci considerati

1. Solo corso strutturato: gratis e prevedibile, ma non fa parlare.
2. Solo conversazione AI: realistica, ma per chi parte da zero è dispersiva e costa a sessione.
3. **Mix: corso a livelli + conversazione AI sbloccata dopo le basi.** ← scelto (Nicola: conversazione sì, ma non unica; le basi vengono prima).

## Come viene fatto (scelte mie, da correggere)

- **Web app installabile (PWA)**: si apre dal telefono come una app, senza store.
- Contenuti delle lezioni in file di dati (JSON), così si aggiungono argomenti senza toccare il codice.
- Audio con la sintesi vocale del telefono (gratis), voce inglese.
- Progressi salvati sul telefono (nessun account). Sincronizzazione tra dispositivi: eventuale, più avanti.
- Ripasso a intervalli: le parole sbagliate tornano più spesso.
- Pubblicazione gratuita (hosting statico).
- **Fase 2 (AI):** richiede una chiave API a pagamento, separata dall'abbonamento Claude Pro, e un piccolo servizio server per tenerla nascosta. Costo stimato: pochi centesimi per sessione. Si decide dopo aver provato la fase 1.

## Percorso (bozza)

1. Alfabeto e suoni (con confronto con l'italiano)
2. Numeri
3. Saluti e presentarsi
4. *To be* e *to have* (frasi semplici, affermative, negative, domande)
5. Verbi comuni (go, want, like, eat, live, work, need, have...) al presente
6. Frasi più lunghe (e, ma, perché, quando) e domande utili
7. Argomenti scelti: casa, cibo, famiglia, tempo, salute, lavoro, tempo libero

Ogni lezione: parola/frase con audio, traduzione in italiano, esercizio di ripetizione, esercizio di scrittura.

## Lasciato a chi costruisce

Grafica precisa, numero e ordine esatto delle lezioni, testi degli esercizi, dettagli del ripasso a intervalli, gestione dei browser senza sintesi vocale.

## Decisioni di Nicola

- Le basi sono un percorso fisso (livelli 1-6); gli argomenti a scelta si sbloccano dopo.
- L'AI si rimanda: "vediamo più in là" (fase 2, non ora).
- Design approvato il 2026-11-18.

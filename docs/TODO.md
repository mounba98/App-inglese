# Da fare — domenica 22/11 dalle 13:10 (con Nicola)

Richieste di Nicola del 19/11, dopo aver provato l'app.

1. **Non bloccare chi non ricorda la parola.** Oggi nell'esercizio di scrittura, se non ricordi la parola sei fermo. Idee da decidere insieme:
   - un pulsante «Non lo so» che mostra la risposta senza farti sentire in colpa;
   - aiuti progressivi: prima lettera, numero di lettere, poi la parola intera;
   - prima di scrivere, un passaggio a scelta multipla («riconosci») e solo dopo «scrivi»;
   - la parola che hai chiesto torna nel ripasso.
2. **Rifare il livello 2 (numeri).** Oggi le lezioni sono 0-7, 8-15, 16-20, decine, composti: divisione senza senso. Nuova divisione:
   - da 0 a 10;
   - 11-20;
   - le decine;
   - come si formano i numeri più grandi (21, 99, 100, 1000…).
   Attenzione: cambia gli id del livello 2, quindi va aggiornato `tests/ids-baseline.json` (lo può fare solo una persona) e chi ha già fatto quelle lezioni le ritrova da rifare.
3. **Teoria nelle lezioni.** Una breve spiegazione all'inizio di ogni lezione, o quando serve (es. come si formano i numeri, *to be*, il passato). Deve:
   - essere leggibile in italiano o in inglese, con un pulsante per cambiare lingua;
   - si può ascoltare (stessa voce naturale dei file audio);
   - restare semplice, senza gergo.
   Serve un campo nuovo nel formato dei contenuti (es. `teoria: {it, en}` nella lezione), il validatore e la guida `docs/CONTENUTI.md`. Poi anche la sessione automatica deve scrivere la teoria per i livelli nuovi.
4. **Prendere spunto dal programma per studiare storia** che Nicola ha già (gli piace molto di più): capire cosa funziona meglio lì (struttura, teoria, esercizi) e portarlo qui. Nicola deve dire dov'è (repo o link).
5. Rivedere insieme le prime lezioni: sono le prime che vede la mamma.

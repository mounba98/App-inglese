# App infinita — Design

## Intento e perché
Nicola (18/11): «voglio che sia un'app infinita e che non abbia bisogno dei miei aggiornamenti costanti». Dopo i livelli 1-6 e i 7 argomenti l'app finiva. Ora deve avere sempre qualcosa da fare e crescere da sola, senza che Nicola tocchi codice, versioni o pubblicazione.

## Obiettivi
1. **Pratica che non finisce mai**, senza contenuti nuovi:
   - **Numeri infiniti**: numeri casuali da 0 a 9999 da scrivere in lettere (generati dal codice, quindi sempre nuovi). Si sblocca dopo il livello 2.
   - **Allenamento libero**: sempre disponibile dopo la prima lezione; 8 parole/frasi già studiate, scelte a caso preferendo quelle meno sicure; alternanza tra «scrivi» (vede l'italiano) e «dettato» (sente l'inglese e lo scrive, solo se c'è l'audio).
2. **Pubblicazione automatica**: ogni modifica su `main` si pubblica da sola su GitHub Pages, con la versione della cache presa dal commit (niente più versione da cambiare a mano).
3. **Contenuti che crescono da soli**: un'attività programmata (cloud, due volte a settimana) aggiunge il prossimo livello o argomento seguendo `docs/CONTENUTI.md` (regole + coda dei temi). Quando la coda finisce, ne scrive di nuovi seguendo la progressione. Apre una pull request; un controllo automatico la unisce da sola **solo se** tocca esclusivamente i contenuti e i test passano.

## Non-obiettivi
- Conversazione con l'AI dentro l'app (fase 2, chiave API a pagamento: rimandata da Nicola).
- Punteggi, serie di giorni, classifiche.

## Vincoli
- Gli stessi della fase 1: telefono, testo ≥ 20px, pulsanti ≥ 56px, interfaccia in italiano, nessun account.
- I contenuti nuovi passano dal validatore e da controlli di qualità automatici (risposta mai mostrata nella traccia italiana, varianti accettate, massimo 8 elementi).
- Una pull request automatica non può mai cambiare codice: solo `content/` e `docs/CONTENUTI.md`.

## Una cosa che resta a Nicola, una volta sola
Attivare GitHub Pages (Impostazioni → Pages → Origine: GitHub Actions). Senza, tutto il resto funziona ma il sito non è pubblico.

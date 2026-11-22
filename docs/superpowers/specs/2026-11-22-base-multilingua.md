# L'app di inglese come base per altre lingue (prima il giapponese)

Data: 22/11/2026. Richiesta di Nicola: «questa app di inglese è la base per poi iniziare quella del giapponese».

## Obiettivo

Il motore (lezioni, ripasso, teoria, scelta, aiuti, audio, aggiornamento offline, contenuti che crescono da soli) deve essere lo stesso per ogni lingua. Cambiano soltanto due cose:

1. **le impostazioni del corso**: lingua, voce, parole dell'interfaccia legate alla lingua;
2. **le regole della lingua**: come si confronta una risposta, come si fa l'aiuto, come si scrive.

## Passo 1, da fare ora nell'app di inglese: `content/corso.json`

```json
{
 "lingua": "en-US",
 "nome": "inglese",
 "titolo": "Imparo l'inglese",
 "voce_piper": "en_US-ljspeech-high",
 "regole": "latino"
}
```

- `src/app.js` prende da qui il titolo («Imparo l'inglese») e le frasi che nominano la lingua («Scrivi in inglese», «Leggi in inglese»).
- `src/speech.js` prende la lingua della voce del telefono.
- `pages.yml` prende la voce Piper da scaricare: i passaggi di `pages.yml` che dipendono dalla voce la leggono dal file, con un default.
- `src/check.js` e `maskAnswer` stanno dietro a un modulo `src/lingua.js` che sceglie le regole in base a `regole`. Oggi esiste solo `latino`, con il comportamento attuale.
- La chiave di `localStorage` resta `inglese-v1`: cambiarla farebbe perdere i progressi a chi usa già l'app. Una lingua nuova avrà la sua chiave (per esempio `giapponese-v1`), presa da `corso.json` con un campo facoltativo che per l'inglese non c'è.

Niente di quello che vede l'utente cambia per l'inglese: è un riordino interno, coperto dai test che ci sono già.

## Passo 2, quando si parte col giapponese: cosa serve in più

### Scrittura e risposte

Un elemento giapponese ha più forme:

```json
{
 "id": "g1-01-arigatou",
 "ja": "ありがとう",
 "kana": "ありがとう",
 "romaji": "arigatou",
 "it": "Grazie",
 "accept": ["ありがとう", "arigatou", "arigato"]
}
```

- Si risponde in kana con la tastiera giapponese del telefono, oppure in romaji. Le regole `giapponese` convertono il romaji in kana prima di confrontare (un convertitore piccolo scritto da noi, senza dipendenze, con i test), e ignorano spazi e punteggiatura giapponese (「」、。).
- L'aiuto «Non lo so» mostra il primo kana e un segno per ogni altro carattere (あ＿＿＿).
- La scelta multipla vale ancora di più qui: per riconoscere hiragana e katakana basta toccare, senza scrivere.
- Le opzioni della scelta mostrano la forma giapponese; il romaji si legge sotto nei primi livelli e poi sparisce.

### Percorso

1. Hiragana, in gruppi di 5 come le righe della tabella (a i u e o, ka ki ku ke ko…), con la teoria su come si leggono.
2. Saluti e frasi di cortesia: arigatou, sumimasen, onegaishimasu.
3. Katakana: nomi stranieri e parole prese dall'inglese, che aiutano perché si riconoscono.
4. Struttura della frase (soggetto, oggetto, verbo alla fine), con le particelle は, を, に spiegate nella teoria senza gergo.
5. I primi kanji, pochi e utili: 人, 日, 水, 大, 小.

### Voce

Piper non ha voci giapponesi di qualità. Le strade gratuite da provare prima di partire:

- **Kokoro** (modello aperto, licenza Apache 2.0): ha voci giapponesi e gira sul computer di GitHub come Piper;
- **VOICEVOX**: molto naturale, gratuito anche per uso pubblico, ma ogni voce ha la sua licenza e chiede di citarla;
- come ripiego, la voce giapponese del telefono, che su Android e iPhone di solito c'è.

La scelta si fa ascoltando 20 frasi, come per l'inglese (prova con il riconoscimento vocale e ascolto).

### Dove vive

Un repository nuovo, `App-giapponese`, nato come copia di questo: stesso motore, contenuti e `corso.json` propri, propria pagina GitHub Pages, propria routine dei contenuti. Se i due corsi poi divergono poco, il motore si potrà spostare in un repository comune. Non conviene farlo prima di avere due corsi veri.

## Cosa resta fuori per ora

- Più corsi nella stessa app: una lingua per app è più semplice per chi la usa.
- Il riconoscimento della voce (pronuncia): si può aggiungere più avanti a tutti i corsi insieme.

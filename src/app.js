// Interfaccia: Home, Lezione, Fine lezione.
import { loadContent } from './content.js';
import { createProgress, TOPICS_AFTER_LEVELS } from './progress.js';
import { createLessonFlow, clearFeedback } from './lesson.js';
import { dueCards, todayLocal } from './srs.js';
import { numberItems } from './numbers.js';
import { pickPractice, nextMode } from './practice.js';
import { hasSpeech, whenVoicesReady, speak } from './speech.js';
import { loadAudioIndex, createPlayer } from './audio.js';
import { lessonStatus, STATUS_LABEL, paragraphs } from './stato.js';

const REVIEW_MAX = 8;
// Blocco dei pulsanti dopo ogni cambio schermata: è questa la guardia anti doppio tocco
// che conta nell'app (quella in lesson.js è solo una difesa in più). Non portarlo a 0.
const LOCK_MS = 300;

const root = document.getElementById('app');
let levels = [];
let topics = [];
let progress;
let audioOk = hasSpeech(window);
const audioIndex = {}; // riempito in place dopo l'avvio: il player lo legge a ogni chiamata
const player = createPlayer({
  index: audioIndex,
  env: window,
  speakFn: (text) => speak(text, window),
  hasSpeechFn: () => audioOk,
});
let lastSlot = true; // alterna: prima una sessione scritta, poi una a dettato (vedi nextMode)
let session = null; // { lesson, flow, feedback, recorded }

function safeStorage() {
  try {
    const s = window.localStorage;
    s.getItem('inglese-v1');
    return s;
  } catch {
    return null;
  }
}

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'onclick') el.addEventListener('click', v);
    else if (k === 'onsubmit') el.addEventListener('submit', v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

function show(...nodes) {
  document.body.setAttribute('data-pronta', ''); // dice a index.html che l'app è partita
  root.replaceChildren(...nodes.filter((n) => n));
  // Niente doppi tocchi durante la transizione.
  const buttons = [...root.querySelectorAll('button')].filter((b) => !b.disabled); // quelli già spenti (es. lezione bloccata) restano spenti
  buttons.forEach((b) => { b.disabled = true; });
  setTimeout(() => buttons.forEach((b) => { if (b.isConnected) b.disabled = false; }), LOCK_MS);
  window.scrollTo(0, 0);
}

const allLessons = () => levels.flatMap((lv) => lv.lessons.map((lesson) => ({ lv, lesson })));

function todaysLesson() {
  const done = progress.get().completed;
  return allLessons().find(({ lesson }) => progress.isLessonUnlocked(lesson.id, levels) && !done.includes(lesson.id)) ?? null;
}

function reviewItems() {
  const ids = dueCards(progress.get().cards, todayLocal());
  const byId = new Map();
  for (const { lesson } of allLessons()) for (const it of lesson.items) byId.set(it.id, it);
  for (const t of topics) for (const lesson of t.lessons) for (const it of lesson.items) byId.set(it.id, it);
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function renderHome() {
  session = null;
  stopAudio();
  const today = todaysLesson();
  const review = reviewItems();
  const nodes = [h('h1', {}, 'Imparo l\'inglese')];
  const total = levels.length;

  if (today) {
    const levelNo = levels.indexOf(today.lv) + 1;
    nodes.push(h('p', { class: 'progress' }, `Livello ${levelNo} di ${total}`));
    nodes.push(h('div', { class: 'card' },
      h('h2', {}, 'Lezione di oggi'),
      h('p', { class: 'muted' }, today.lv.title),
      h('p', { class: 'prompt' }, today.lesson.title),
      h('button', { onclick: () => startLesson(today.lesson) }, 'Inizia la lezione'),
    ));
  } else {
    nodes.push(h('p', { class: 'progress' }, 'Hai finito tutti i livelli per ora: presto ne arriveranno altri'));
    nodes.push(h('div', { class: 'card' },
      h('p', { class: 'prompt' }, 'Hai finito tutte le lezioni, complimenti!'),
      h('p', { class: 'muted' }, 'Puoi ripassare quando vuoi. Presto arriveranno cose nuove.'),
    ));
  }

  if (review.length > 0) {
    const n = review.length;
    nodes.push(h('div', { class: 'card' },
      h('h2', {}, 'Ripasso'),
      h('p', {}, n === 1 ? 'C\'è 1 parola da ripassare.' : `Ci sono ${n} parole da ripassare.`),
      h('button', { class: 'secondary', onclick: () => startLesson({ id: 'ripasso', title: 'Ripasso', isReview: true, items: review.slice(0, REVIEW_MAX) }) }, 'Ripassa'),
    ));
  }
  nodes.push(h('div', { class: 'card' },
    h('h2', {}, 'Tutte le lezioni'),
    h('p', {}, 'Rivedi o ripeti qualsiasi lezione.'),
    h('button', { class: 'secondary', onclick: renderAll }, 'Tutte le lezioni'),
  ));
  nodes.push(topicsBlock());
  if (level2Complete()) {
    nodes.push(h('div', { class: 'card' },
      h('h2', {}, 'Numeri senza fine'),
      h('p', {}, 'Scrivi in inglese numeri sempre nuovi.'),
      h('button', { class: 'secondary', onclick: startNumbers }, 'Numeri senza fine'),
    ));
  }
  if (progress.get().completed.length > 0) {
    nodes.push(h('div', { class: 'card' },
      h('h2', {}, 'Allenamento libero'),
      h('p', {}, '8 parole già studiate, scelte a caso.'),
      h('button', { class: 'secondary', onclick: startTraining }, 'Allenati'),
    ));
  }
  if (!isStandalone()) {
    nodes.push(h('p', { class: 'hint' }, 'Consiglio: aggiungi l\'app alla schermata Home, così i progressi restano salvati.'));
  }
  show(...nodes);
}

function level2Complete() {
  const lv = levels.find((l) => l.id === 'l2');
  const done = progress.get().completed;
  return !!lv && lv.lessons.every((l) => done.includes(l.id));
}

// Sessione di numeri casuali: non entra nel ripasso e non completa nessuna lezione.
function startNumbers() {
  startLesson({ id: 'numeri', title: 'Numeri senza fine', isPractice: true, items: numberItems(8) });
}

// Allenamento libero: registra le risposte come il ripasso, ma non completa lezioni.
function startTraining() {
  const items = pickPractice(progress.get(), { levels, topics });
  if (items.length === 0) return renderHome();
  const { dictation, slot } = nextMode(lastSlot, audioOk || items.every((it) => player.canPlay(it)));
  lastSlot = slot;
  startLesson({ id: 'allenamento', title: 'Allenamento libero', isTraining: true, dictation, items });
}

function isStandalone() {
  try {
    if (window.navigator.standalone === true) return true;
    return !!window.matchMedia?.('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function topicsBlock() {
  if (!progress.topicsUnlocked(levels) || topics.length === 0) {
    return h('p', { class: 'muted topics-locked' }, `Argomenti: si sbloccano dopo il livello ${Math.min(TOPICS_AFTER_LEVELS, levels.length)}`);
  }
  return h('div', { class: 'card' },
    h('h2', {}, 'Scegli un argomento'),
    topics.map((t) => h('button', { class: 'secondary', onclick: () => renderTopic(t) }, t.title)),
  );
}

function renderTopic(topic) {
  session = null;
  stopAudio();
  const done = progress.get().completed;
  show(
    h('h1', {}, topic.title),
    h('div', { class: 'card' },
      topic.lessons.map((lesson) => h('button', {
        class: 'secondary lesson-btn',
        onclick: () => startLesson(lesson, topic),
      },
      h('span', {}, lesson.title),
      done.includes(lesson.id) ? h('span', { class: 'done-mark' }, 'fatta') : null)),
    ),
    h('button', { onclick: renderHome }, 'Indietro'),
  );
}

function renderAll() {
  session = null;
  stopAudio();
  const state = progress.get();
  const nodes = [h('h1', {}, 'Tutte le lezioni')];
  levels.forEach((lv, i) => {
    nodes.push(h('h2', {}, `Livello ${i + 1} — ${lv.title}`));
    nodes.push(h('div', { class: 'card' },
      lv.lessons.map((lesson) => {
        const st = lessonStatus(lesson, state, progress.isLessonUnlocked(lesson.id, levels));
        return h('button', {
          class: `secondary lesson-btn st-${st}`,
          disabled: st === 'bloccata',
          onclick: () => startLesson(lesson, null, true),
        }, h('span', {}, lesson.title), h('span', { class: `tag tag-${st}` }, STATUS_LABEL[st]));
      })));
  });
  nodes.push(h('button', { onclick: renderHome }, 'Indietro'));
  show(...nodes);
}

// Le opzioni sbagliate della scelta multipla vengono da tutte le lezioni dello stesso gruppo.
function poolFor(lesson, topic) {
  const group = topic ? topic.lessons : (levels.find((lv) => lv.lessons.includes(lesson))?.lessons ?? [lesson]);
  return group.flatMap((l) => l.items);
}

function startLesson(lesson, topic = null, fromAll = false) {
  const special = lesson.isReview || lesson.isPractice || lesson.isTraining;
  const opts = special ? { startAt: 'write', dictation: !!lesson.dictation } : { pool: poolFor(lesson, topic) };
  session = { lesson, topic, fromAll, flow: createLessonFlow(lesson, opts), feedback: null, recorded: false, lastAnswer: '', teoriaLang: 'it' };
  renderLesson();
}

function stopAudio() {
  try { player.stop(); } catch { /* ignora */ }
  try { window.speechSynthesis?.cancel?.(); } catch { /* ignora */ }
}

function leave() {
  stopAudio();
  if (session && session.fromAll) renderAll();
  else if (session && session.topic) renderTopic(session.topic);
  else renderHome();
}

function exitButton() {
  return h('button', { class: 'exit secondary', onclick: leave }, 'Esci');
}

function listenBlock(item) {
  if (!player.canPlay(item)) {
    const note = h('p', { class: 'note' }, 'L\'audio non è disponibile su questo telefono');
    note._item = item;
    return note;
  }
  const btn = h('button', {
    class: 'secondary',
    onclick: async () => {
      btn.disabled = true;
      await player.play(item);
      if (btn.isConnected) btn.disabled = false;
    },
  }, 'Ascolta');
  btn._item = item;
  return btn;
}

const hasItalianVoice = () => {
  try { return Array.from(window.speechSynthesis?.getVoices?.() ?? []).some((v) => String(v.lang).toLowerCase().replace('_', '-').startsWith('it')); } catch { return false; }
};

// «Ascolta» per la teoria: inglese con Piper (o voce inglese), italiano solo con una voce italiana.
function teoriaListen(lang) {
  const lesson = session.lesson;
  const t = lesson.teoria;
  if (lang === 'en') {
    const item = { id: `${lesson.id}-teoria`, en: t.en };
    if (!player.canPlay(item)) return null;
    return h('button', { class: 'secondary', onclick: () => { player.play(item).catch(() => {}); } }, 'Ascolta');
  }
  if (!hasItalianVoice()) return null;
  return h('button', { class: 'secondary', onclick: () => { stopAudio(); speak(t.it, window, 'it-IT').catch(() => {}); } }, 'Ascolta');
}

function renderTeoria(c) {
  const { flow, lesson } = session;
  const lang = session.teoriaLang;
  const t = c.teoria;
  const text = lang === 'en' ? t.en : t.it;
  const slot = h('div', { class: 'stack' });
  const fill = () => {
    const btn = teoriaListen(session.teoriaLang);
    slot.replaceChildren(...(btn ? [btn] : []));
  };
  fill();
  show(
    exitButton(),
    h('div', { class: 'card teoria' },
      h('h1', {}, lesson.title),
      h('div', { class: 'teoria-text', lang: lang === 'en' ? 'en' : null }, paragraphs(text).map((p) => h('p', {}, p))),
      h('button', {
        class: 'secondary',
        onclick: () => { stopAudio(); session.teoriaLang = lang === 'en' ? 'it' : 'en'; renderLesson(); },
      }, lang === 'en' ? 'Leggi in italiano' : 'Leggi in inglese'),
      slot,
    ),
    h('button', { onclick: () => { stopAudio(); flow.advance(); renderLesson(); } }, 'Inizia'),
  );
  // Voci caricate dopo: il pulsante in italiano compare da solo.
  try {
    const synth = window.speechSynthesis;
    if (lang === 'it' && synth && !hasItalianVoice()) {
      const onv = () => {
        if (!slot.isConnected) { synth.removeEventListener?.('voiceschanged', onv); return; }
        if (hasItalianVoice()) { synth.removeEventListener?.('voiceschanged', onv); fill(); }
      };
      synth.addEventListener?.('voiceschanged', onv);
    }
  } catch { /* ignora */ }
}

function renderLesson() {
  const { flow, lesson } = session;
  const c = flow.current();

  if (c.step === 'done') return renderDone();
  if (c.step === 'teoria') return renderTeoria(c);

  if (c.step === 'learn') {
    const ok = session.feedback === 'ok';
    session.feedback = null;
    return show(
      exitButton(),
      h('div', { class: 'card' },
        ok && h('p', { class: 'feedback ok' }, 'Giusto!'),
        h('p', { class: 'prompt' }, 'Ascolta e ripeti ad alta voce'),
        h('p', { class: 'en', lang: 'en' }, c.item.en),
        h('p', { class: 'it' }, c.item.it),
        listenBlock(c.item),
      ),
      h('button', { onclick: () => { clearFeedback(session); flow.advance(); renderLesson(); } }, 'Avanti'),
    );
  }

  if (c.step === 'choose') {
    const answered = c.picked !== undefined;
    session.feedback = null;
    return show(
      exitButton(),
      h('div', { class: 'card' },
        h('p', { class: 'prompt' }, 'Scegli la risposta giusta'),
        h('p', { class: 'it' }, c.item.it),
        h('div', { class: 'stack options' },
          c.options.map((opt) => {
            const right = answered && opt === c.item.en;
            const wrong = answered && opt === c.picked;
            return h('button', {
              class: `secondary option${right ? ' right' : ''}${wrong ? ' wrong' : ''}`,
              lang: 'en',
              disabled: answered,
              onclick: () => {
                const ok = flow.choose(opt);
                if (ok) session.feedback = 'ok';
                renderLesson();
              },
            }, right ? h('span', { class: 'mark', 'aria-hidden': 'true' }, '✓ ') : wrong ? h('span', { class: 'mark', 'aria-hidden': 'true' }, '✗ ') : null, opt);
          })),
        answered ? h('p', { class: 'solution', lang: 'en' }, `La risposta giusta è: ${c.item.en}`) : null,
      ),
      answered ? h('button', { onclick: () => { clearFeedback(session); flow.advance(); renderLesson(); } }, 'Avanti') : null,
    );
  }

  // write
  if (c.showSolution) {
    return show(
      exitButton(),
      h('div', { class: 'card' },
        c.dictation ? null : h('p', { class: 'it' }, c.item.it),
        h('p', { class: 'feedback retry' }, 'Non ancora.'),
        h('p', { class: 'solution', lang: 'en' }, `La risposta è: ${c.item.en}`),
        c.dictation ? h('p', { class: 'it' }, `Significa: ${c.item.it}`) : null,
        c.dictation ? listenBlock(c.item) : null,
      ),
      h('button', { onclick: () => { clearFeedback(session); flow.advance(); renderLesson(); } }, 'Avanti'),
    );
  }

  const input = h('input', {
    type: 'text', id: 'risposta', lang: 'en', autocapitalize: 'none', autocorrect: 'off',
    spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Scrivi in inglese',
  });
  const form = h('form', {
    class: 'stack',
    onsubmit: (e) => {
      e.preventDefault();
      const value = input.value;
      if (value.trim() === '') return;
      session.lastAnswer = value;
      const ok = flow.submit(value);
      session.feedback = ok ? 'ok' : 'retry';
      renderLesson();
    },
  },
    input,
    h('button', { type: 'submit' }, 'Controlla'),
  );
  const giusto = session.feedback === 'ok';
  if (giusto) session.feedback = null;
  const fb = session.feedback === 'retry' ? h('p', { class: 'feedback retry' }, 'Non ancora, riprova') : null;
  show(
    exitButton(),
    h('div', { class: 'card' },
      giusto ? h('p', { class: 'feedback ok' }, 'Giusto!') : null,
      h('p', { class: 'prompt' }, c.dictation ? 'Ascolta e scrivi' : 'Scrivi in inglese'),
      c.dictation ? null : h('p', { class: 'it' }, c.item.it),
      (lesson.isReview || c.dictation) ? listenBlock(c.item) : null,
      c.hint ? h('p', { class: 'hint-text', lang: 'en' }, `Aiuto: ${c.hint}`) : null,
      fb,
    ),
    form,
    h('button', { type: 'button', class: 'secondary', onclick: () => { flow.hint(); renderLesson(); } }, 'Non lo so'),
  );
  if (session.feedback === 'retry' && session.lastAnswer) {
    input.value = session.lastAnswer;
    input.select();
  }
  input.focus();
  // Dettato: la frase parte da sola una volta; sui tentativi successivi c'è il pulsante.
  if (c.dictation && session.feedback !== 'retry' && !c.hint) Promise.resolve(player.play(c.item)).catch(() => {});
}

function renderDone() {
  const { flow, lesson } = session;
  if (!session.recorded) {
    session.recorded = true;
    if (!lesson.isPractice) {
      const today = todayLocal();
      for (const [id, ok] of Object.entries(flow.results())) progress.recordAnswer(id, ok, today);
      if (!lesson.isReview && !lesson.isTraining) progress.completeLesson(lesson.id);
    }
  }
  const byId = new Map(lesson.items.map((it) => [it.id, it]));
  const weak = Object.entries(flow.results()).filter(([, ok]) => ok === false).map(([id]) => byId.get(id)).filter(Boolean);
  const lastOk = session.feedback === 'ok';
  session.feedback = null;
  show(
    h('div', { class: 'card' },
      lastOk && h('p', { class: 'feedback ok' }, 'Giusto!'),
      h('p', { class: 'prompt' }, lesson.isPractice ? 'Numeri finiti. Bravissima!' : lesson.isTraining ? 'Allenamento finito. Bravissima!' : lesson.isReview ? 'Ripasso finito. Bravissima!' : 'Lezione finita. Bravissima!'),
      h('p', { class: 'muted' }, 'Puoi fermarti qui o continuare.'),
    ),
    weak.length > 0 ? h('div', { class: 'card' },
      h('h2', {}, 'Queste le ripassiamo ancora:'),
      h('ul', { class: 'weak' }, weak.map((it) => h('li', {}, h('span', { lang: 'en' }, it.en), ` — ${it.it}`))),
    ) : null,
    lesson.isPractice ? h('button', { onclick: startNumbers }, 'Altri numeri') : null,
    lesson.isTraining ? h('button', { onclick: startTraining }, 'Ancora') : null,
    session.fromAll ? h('button', { onclick: renderAll }, 'Torna alle lezioni') : null,
    session.topic ? h('button', { onclick: () => renderTopic(session.topic) }, 'Torna all\'argomento') : null,
    h('button', { class: (session.topic || session.fromAll || lesson.isPractice || lesson.isTraining) ? 'secondary' : '', onclick: renderHome }, (lesson.isPractice || lesson.isTraining) ? 'Torna all\'inizio' : 'Torna alla home'),
  );
}

function refreshListenBlocks() {
  for (const el of root.querySelectorAll('.note')) {
    if (el._item && player.canPlay(el._item)) el.replaceWith(listenBlock(el._item));
  }
}

async function main() {
  try {
    ({ levels, topics } = await loadContent());
  } catch (err) {
    console.error(err);
    show(h('p', { class: 'error' }, 'Non riesco a caricare le lezioni. Controlla la connessione e riapri la pagina.'));
    return;
  }
  progress = createProgress(safeStorage());
  renderHome();
  try { navigator.storage?.persist?.(); } catch { /* ignora */ }
  // L'indice dell'audio arriva dopo: non blocca l'avvio; quando c'è, le note diventano pulsanti.
  loadAudioIndex().then((idx) => {
    Object.assign(audioIndex, idx);
    refreshListenBlocks();
  });
  // Voci caricate in ritardo: «Ascolta» compare subito, senza toccare input né stato.
  whenVoicesReady(window).then((ok) => {
    if (!ok) return;
    audioOk = true;
    refreshListenBlocks();
  });
}

main();

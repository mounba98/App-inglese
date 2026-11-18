// Interfaccia: Home, Lezione, Fine lezione.
import { loadContent } from './content.js';
import { createProgress } from './progress.js';
import { createLessonFlow } from './lesson.js';
import { dueCards, todayLocal } from './srs.js';
import { numberItems } from './numbers.js';
import { hasSpeech, whenVoicesReady, speak } from './speech.js';

const REVIEW_MAX = 8;
// Blocco dei pulsanti dopo ogni cambio schermata: è questa la guardia anti doppio tocco
// che conta nell'app (quella in lesson.js è solo una difesa in più). Non portarlo a 0.
const LOCK_MS = 300;

const root = document.getElementById('app');
let levels = [];
let topics = [];
let progress;
let audioOk = hasSpeech(window);
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
  const buttons = [...root.querySelectorAll('button')];
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
    nodes.push(h('p', { class: 'progress' }, `Livello ${total} di ${total}`));
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
  nodes.push(topicsBlock());
  if (level2Complete()) {
    nodes.push(h('div', { class: 'card' },
      h('h2', {}, 'Numeri senza fine'),
      h('p', {}, 'Scrivi in inglese numeri sempre nuovi.'),
      h('button', { class: 'secondary', onclick: startNumbers }, 'Numeri senza fine'),
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
    return h('p', { class: 'muted topics-locked' }, `Argomenti: si sbloccano dopo i livelli 1-${levels.length}`);
  }
  return h('div', { class: 'card' },
    h('h2', {}, 'Scegli un argomento'),
    topics.map((t) => h('button', { class: 'secondary', onclick: () => renderTopic(t) }, t.title)),
  );
}

function renderTopic(topic) {
  session = null;
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

function startLesson(lesson, topic = null) {
  session = { lesson, topic, flow: createLessonFlow(lesson, (lesson.isReview || lesson.isPractice) ? { startAt: 'write' } : undefined), feedback: null, recorded: false, lastAnswer: '' };
  renderLesson();
}

function leave() {
  if (session && session.topic) renderTopic(session.topic);
  else renderHome();
}

function exitButton() {
  return h('button', { class: 'exit secondary', onclick: leave }, 'Esci');
}

function listenBlock(item) {
  if (!audioOk) {
    const note = h('p', { class: 'note' }, 'L\'audio non è disponibile su questo telefono');
    note._item = item;
    return note;
  }
  const btn = h('button', {
    class: 'secondary',
    onclick: async () => {
      btn.disabled = true;
      await speak(item.en, window);
      if (btn.isConnected) btn.disabled = false;
    },
  }, 'Ascolta');
  btn._item = item;
  return btn;
}

function renderLesson() {
  const { flow, lesson } = session;
  const c = flow.current();

  if (c.step === 'done') return renderDone();

  if (c.step === 'learn') {
    const ok = session.feedback === 'ok';
    session.feedback = null;
    return show(
      exitButton(),
      h('div', { class: 'card' },
        ok && h('p', { class: 'feedback ok' }, 'Giusto!'),
        h('p', { class: 'en', lang: 'en' }, c.item.en),
        h('p', { class: 'it' }, c.item.it),
        listenBlock(c.item),
      ),
      h('button', { onclick: () => { flow.advance(); renderLesson(); } }, 'Avanti'),
    );
  }

  if (c.step === 'repeat') {
    return show(
      exitButton(),
      h('div', { class: 'card' },
        h('p', { class: 'prompt' }, 'Ripeti ad alta voce'),
        h('p', { class: 'en', lang: 'en' }, c.item.en),
        h('p', { class: 'it' }, c.item.it),
        listenBlock(c.item),
      ),
      h('button', { onclick: () => { flow.advance(); renderLesson(); } }, 'L\'ho detto'),
    );
  }

  // write
  if (c.showSolution) {
    return show(
      exitButton(),
      h('div', { class: 'card' },
        h('p', { class: 'it' }, c.item.it),
        h('p', { class: 'feedback retry' }, 'Non ancora.'),
        h('p', { class: 'solution', lang: 'en' }, `La risposta è: ${c.item.en}`),
      ),
      h('button', { onclick: () => { flow.advance(); renderLesson(); } }, 'Avanti'),
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
  const fb = session.feedback === 'retry' ? h('p', { class: 'feedback retry' }, 'Non ancora, riprova') : null;
  show(
    exitButton(),
    h('div', { class: 'card' },
      h('p', { class: 'prompt' }, 'Scrivi in inglese'),
      h('p', { class: 'it' }, c.item.it),
      lesson.isReview ? listenBlock(c.item) : null,
      fb,
    ),
    form,
  );
  if (session.feedback === 'retry' && session.lastAnswer) {
    input.value = session.lastAnswer;
    input.select();
  }
  input.focus();
}

function renderDone() {
  const { flow, lesson } = session;
  if (!session.recorded) {
    session.recorded = true;
    if (!lesson.isPractice) {
      const today = todayLocal();
      for (const [id, ok] of Object.entries(flow.results())) progress.recordAnswer(id, ok, today);
      if (!lesson.isReview) progress.completeLesson(lesson.id);
    }
  }
  const lastOk = session.feedback === 'ok';
  session.feedback = null;
  show(
    h('div', { class: 'card' },
      lastOk && h('p', { class: 'feedback ok' }, 'Giusto!'),
      h('p', { class: 'prompt' }, lesson.isPractice ? 'Numeri finiti. Bravissima!' : lesson.isReview ? 'Ripasso finito. Bravissima!' : 'Lezione finita. Bravissima!'),
      h('p', { class: 'muted' }, 'Puoi fermarti qui o continuare.'),
    ),
    lesson.isPractice ? h('button', { onclick: startNumbers }, 'Altri numeri') : null,
    session.topic ? h('button', { onclick: () => renderTopic(session.topic) }, 'Torna all\'argomento') : null,
    h('button', { class: (session.topic || lesson.isPractice) ? 'secondary' : '', onclick: renderHome }, lesson.isPractice ? 'Torna all\'inizio' : 'Torna alla home'),
  );
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
  // Voci caricate in ritardo: «Ascolta» compare subito, senza toccare input né stato.
  whenVoicesReady(window).then((ok) => {
    if (!ok) return;
    audioOk = true;
    for (const el of root.querySelectorAll('.note')) {
      if (el._item) el.replaceWith(listenBlock(el._item));
    }
  });
}

main();

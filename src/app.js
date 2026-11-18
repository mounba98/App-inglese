// Interfaccia: Home, Lezione, Fine lezione.
import { loadContent } from './content.js';
import { createProgress } from './progress.js';
import { createLessonFlow } from './lesson.js';
import { dueCards, todayLocal } from './srs.js';
import { hasSpeech, whenVoicesReady, speak } from './speech.js';

const TOTAL_LEVELS = 6;
const REVIEW_MAX = 8;
const LOCK_MS = 300;

const root = document.getElementById('app');
let levels = [];
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
  root.replaceChildren(...nodes);
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
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function renderHome() {
  session = null;
  const today = todaysLesson();
  const review = reviewItems();
  const nodes = [h('h1', {}, 'Imparo l\'inglese')];

  if (today) {
    const levelNo = levels.indexOf(today.lv) + 1;
    nodes.push(h('p', { class: 'progress' }, `Livello ${levelNo} di ${TOTAL_LEVELS}`));
    nodes.push(h('div', { class: 'card' },
      h('h2', {}, 'Lezione di oggi'),
      h('p', { class: 'muted' }, today.lv.title),
      h('p', { class: 'prompt' }, today.lesson.title),
      h('button', { onclick: () => startLesson(today.lesson) }, 'Inizia la lezione'),
    ));
  } else {
    nodes.push(h('p', { class: 'progress' }, `Livello ${TOTAL_LEVELS} di ${TOTAL_LEVELS}`));
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
      h('button', { class: 'secondary', onclick: () => startLesson({ id: 'ripasso', title: 'Ripasso', items: review.slice(0, REVIEW_MAX) }) }, 'Ripassa'),
    ));
  }
  show(...nodes);
}

function startLesson(lesson) {
  session = { lesson, flow: createLessonFlow(lesson), feedback: null, recorded: false };
  renderLesson();
}

function exitButton() {
  return h('button', { class: 'exit secondary', onclick: renderHome }, 'Esci');
}

function listenBlock(item) {
  if (!audioOk) return h('p', { class: 'note' }, 'L\'audio non è disponibile su questo telefono');
  const btn = h('button', {
    class: 'secondary',
    onclick: async () => {
      btn.disabled = true;
      await speak(item.en, window);
      if (btn.isConnected) btn.disabled = false;
    },
  }, 'Ascolta');
  return btn;
}

function renderLesson() {
  const { flow } = session;
  const c = flow.current();

  if (c.step === 'done') return renderDone();

  if (c.step === 'learn') {
    session.feedback = null;
    return show(
      exitButton(),
      h('div', { class: 'card' },
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
      fb,
    ),
    form,
  );
  input.focus();
}

function renderDone() {
  const { flow, lesson } = session;
  if (!session.recorded) {
    session.recorded = true;
    const today = todayLocal();
    for (const [id, ok] of Object.entries(flow.results())) progress.recordAnswer(id, ok, today);
    if (lesson.id !== 'ripasso') progress.completeLesson(lesson.id);
  }
  show(
    h('div', { class: 'card' },
      h('p', { class: 'prompt' }, lesson.id === 'ripasso' ? 'Ripasso finito. Bravissima!' : 'Lezione finita. Bravissima!'),
      h('p', { class: 'muted' }, 'Puoi fermarti qui o continuare.'),
    ),
    h('button', { onclick: renderHome }, 'Torna alla home'),
  );
}

async function main() {
  try {
    ({ levels } = await loadContent());
  } catch (err) {
    console.error(err);
    show(h('p', { class: 'error' }, 'Non riesco a caricare le lezioni. Controlla la connessione e riapri la pagina.'));
    return;
  }
  progress = createProgress(safeStorage());
  renderHome();
  // Voci caricate in ritardo: il pulsante «Ascolta» compare dal passo successivo.
  whenVoicesReady(window).then((ok) => { if (ok) audioOk = true; });
}

main();

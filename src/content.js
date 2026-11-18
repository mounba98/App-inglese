// Formato dei contenuti e validatore. Gli id degli elementi sono anche gli id delle carte
// di ripetizione: devono essere unici in tutto il corso.
const MAX_ITEMS = 8;
const ID_RE = /^[a-z0-9-]+$/;

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const blank = (s) => typeof s !== 'string' || s.trim() === '';

export function validateContent(levels, topics) {
  const errors = [];
  const seen = new Set();

  function checkId(id, what) {
    if (typeof id !== 'string' || !ID_RE.test(id)) {
      errors.push(`${what}: id non valido «${id}» (usa solo lettere minuscole, numeri e trattini).`);
      return;
    }
    if (seen.has(id)) errors.push(`${what}: id duplicato «${id}».`);
    seen.add(id);
  }

  function checkItem(item, lessonId) {
    if (!isObj(item)) {
      errors.push(`Lezione «${lessonId}»: elemento non valido.`);
      return;
    }
    checkId(item.id, `Elemento in «${lessonId}»`);
    if (blank(item.en)) errors.push(`Elemento «${item.id}»: il testo inglese è vuoto.`);
    if (blank(item.it)) errors.push(`Elemento «${item.id}»: il testo italiano è vuoto.`);
    if (item.accept !== undefined) {
      const good = Array.isArray(item.accept) && item.accept.length > 0 && item.accept.every((a) => !blank(a));
      if (!good) errors.push(`Elemento «${item.id}»: «accept» deve essere un elenco non vuoto di testi non vuoti.`);
    }
  }

  function checkLesson(lesson, parentId) {
    if (!isObj(lesson)) {
      errors.push(`«${parentId}»: lezione non valida.`);
      return;
    }
    checkId(lesson.id, `Lezione in «${parentId}»`);
    if (blank(lesson.title)) errors.push(`Lezione «${lesson.id}»: il titolo è vuoto.`);
    if (!Array.isArray(lesson.items) || lesson.items.length === 0) {
      errors.push(`Lezione «${lesson.id}»: non ha elementi.`);
      return;
    }
    if (lesson.items.length > MAX_ITEMS) {
      errors.push(`Lezione «${lesson.id}»: ha ${lesson.items.length} elementi, il massimo è ${MAX_ITEMS}.`);
    }
    lesson.items.forEach((it) => checkItem(it, lesson.id));
  }

  function checkGroup(group, kind) {
    if (!isObj(group)) {
      errors.push(`${kind} non valido.`);
      return;
    }
    checkId(group.id, kind);
    if (blank(group.title)) errors.push(`${kind} «${group.id}»: il titolo è vuoto.`);
    if (!Array.isArray(group.lessons) || group.lessons.length === 0) {
      errors.push(`${kind} «${group.id}»: non ha lezioni.`);
      return;
    }
    group.lessons.forEach((l) => checkLesson(l, group.id));
  }

  if (!Array.isArray(levels)) errors.push('I livelli devono essere un elenco.');
  else {
    levels.forEach((lv, i) => {
      checkGroup(lv, 'Livello');
      const expected = `l${i + 1}`;
      if (isObj(lv) && lv.id !== expected) {
        errors.push(`Livello «${lv.id}»: in posizione ${i + 1} ci si aspetta «${expected}» (l1, l2, l3, … in ordine).`);
      }
    });
  }
  if (!Array.isArray(topics)) errors.push('Gli argomenti devono essere un elenco.');
  else topics.forEach((t) => checkGroup(t, 'Argomento'));

  return errors;
}

const withAccept = (group) => ({
  ...group,
  lessons: group.lessons.map((l) => ({
    ...l,
    items: l.items.map((it) => ({ ...it, accept: it.accept ?? [it.en] })),
  })),
});

export async function loadContent(fetchFn = fetch) {
  async function get(url) {
    const res = await fetchFn(url);
    if (!res || !res.ok) throw new Error(`Non riesco a caricare «${url}».`);
    return res.json();
  }
  const [levels, topics] = await Promise.all([get('content/levels.json'), get('content/topics.json')]);
  const errors = validateContent(levels, topics);
  if (errors.length) throw new Error(`Contenuti non validi:\n${errors.join('\n')}`);
  return { levels: levels.map(withAccept), topics: topics.map(withAccept) };
}

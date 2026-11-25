/* Блок I — кабинет экспонента (вид «ТехноСклад»). Владелец S4b.
   Экраны: I1 главная, I2 контакты, I3 карточка контакта, I4 команда и квота, I5 доступность, I6 воркшоп,
   I7 заявки, I8 аналитика, I9 карточка решения (редактор), I10 мои посты и предложения.
   Общее состояние кабинета (пакет для показа, команда, посты, спецпредложение, решения по заявкам, добавленные контакты)
   лежит в D.st('EXH') и открыто для J.js как window.S4B. Везде термин «контакт».

   ЧИСЛА КАБИНЕТА (вымышленные, фиксированы здесь; на экранах не хранятся отдельно, а считаются из списков ниже).
   День демо 27.02, время 11:10 (F.NOW).
   • Контакты (I2, I1, I8, J): c1–c6 из фикстуры + c7–c10 (добавлены в этом файле, SEED_MORE) + контакты, добавленные сканером.
     Исходно 10: сегодня 27.02 — 5 (c4, c7, c8, c9, c10), вчера 26.02 — 5 (c1, c2, c3, c5, c6). По метке: горячих 3, тёплых 4, холодных 3.
   • Заявки (I7, I1, I5, I8): F.EXH_REQUESTS q1–q4, сегодня. Исходно: подтверждена 1, ждут ответа 2, отклонена 1. Вчера: Y_REQ, 3 заявки (2 подтверждены, 1 отклонена).
   • Воронка I8: показы и «Изучить» — F.EXH.kpi (сегодня 1 284 и 96; вчера 1 088 и 85 по дельтам «к вчера»); «Запрос встречи» = число заявок;
     «Встреча» = подтверждённые заявки; «Контакт» = число контактов периода из того же списка, что плитка I1 и группы I2 (скан, визитка, встреча;
     контакты в архиве и убранные не считаются), поэтому после сохранения контакта растёт на 1.
     Исходно сегодня 1 284 → 96 → 4 → 1 → 5, вчера 1 088 → 85 → 3 → 2 → 5, фестиваль — сумма (… → 10).
   • Архив: этап контакта «не актуально» (I3) скрывает контакт из I2 и всех счётчиков; «Убрать из контактов» (I3, J2) удаляет контакт совсем.
   • «Контакты по часам» (I8) считаются по тому же списку контактов; сумма столбцов = число контактов периода = плитка I1 и заголовок группы в I2.
   Сверка этих чисел между экранами — qa/v3/s4b_exhibitor/flows.py («числа»). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  const PACK_NAMES = ['Экспо', 'Экспо+', 'Премиум'];
  const HEAT = { hot: 'горячий', warm: 'тёплый', cold: 'холодный' };
  const HEAT_FILTERS = { all: 'Все', hot: 'Горячие', warm: 'Тёплые', cold: 'Холодные', arch: 'В архиве' };
  const EXID = 'ex01';
  const POST_MAX = 400, POST_MIN = 20;
  const OFFER_FORMATS = ['Консультация или аудит', 'Демо', 'Бонус', 'Скидка', 'Материал', 'Приглашение на встречу'];
  const OFFER_TERMS = ['сегодня', 'до 28.02', 'до конца фестиваля'];

  const pl = (n, f) => n + ' ' + D.plural(n, f);
  const num = n => Number(n).toLocaleString('ru');

  /* ---------- общее состояние кабинета ---------- */
  const X = D.st('EXH');
  if (!X.ready) {
    X.ready = true;
    X.pack = F.EXH.pack;                          /* показываемый пакет; переключатель — только для демонстрации */
    X.team = F.EXH_TEAM.map((m, i) => ({
      id: 't' + (i + 1), name: m.name, role: m.role, via: '',
      state: m.status === 'в команде' ? 'team' : 'invited', left: m.status === 'в команде' ? '' : 'осталось 52 ч'
    }));
    X.seatReq = false;
    X.dec = {};                                   /* решения по заявкам: id -> confirmed | declined */
    X.extra = [];                                 /* контакты, добавленные сканером (J2, J4) */
    X.stage = {};                                 /* этап контакта: id -> этап воронки; «не актуально» = контакт в архиве */
    X.gone = {};                                  /* убранные из контактов (I3, J2): id -> true */
    X.why = {};                                   /* причины отказа по заявкам (I7): id заявки -> текст */
    X.edits = {};                                 /* правки контактов из J4: id -> {heat, step, note, interests} */
    X.done = {};                                  /* отметки задач дня */
    X.moveReq = {};                               /* запросы на перенос окон воркшопа */
    X.card = { solution: null, desc: null, forWhom: null, status: 'published' };
    const p6 = F.post && F.post('fp06'), p7 = F.post && F.post('fp07'), p8 = F.post && F.post('fp08');
    X.posts = {
      'Премиум': [
        { id: 'xp1', slot: 'company', status: 'published', time: '09:40', feed: 'fp06',
          text: p6 ? p6.text : 'ТехноСклад на стенде А-12 разбирает план вашего склада.',
          hist: [['вчера, 18:05', 'отправлен на проверку'], ['09:40', 'опубликован']] },
        { id: 'xp2', slot: 'person', person: 'Ольга Рябова', status: 'published', time: '10:15', feed: 'fp07',
          text: p7 ? p7.text : 'Ольга Рябова ведёт круглый стол в 15:30.',
          hist: [['вчера, 18:20', 'отправлен на проверку'],
                 ['вчера, 19:02', 'возвращён: нужно описать, что участник получит на круглом столе'],
                 ['вчера, 19:40', 'отправлен повторно'], ['10:15', 'опубликован']] }
      ],
      'Экспо+': [
        { id: 'xp3', slot: 'company', status: 'review', time: '10:58', feed: null,
          text: p8 ? 'ТехноСклад на стенде А-12 показывает, как за день перенести остатки склада из таблиц в WMS. Приходите со схемой склада, разберём первые шаги и сроки.' : 'Черновик поста о компании.',
          hist: [['10:58', 'отправлен на проверку']] }
      ],
      'Экспо': []
    };
    const ex = F.exhibitor(EXID) || {};
    const ee = (F.exExt && F.exExt(EXID)) || {};
    X.offer = { on: !!ee.offerOn, format: 'Консультация или аудит', text: ex.offer || '', until: ee.offerUntil || 'сегодня',
      status: 'published', reason: '', hist: [['вчера, 17:30', 'опубликовано']] };
    X.seq = 10;
  }

  /* ---------- общие помощники ---------- */
  const packOf = name => (F.pack && F.pack(name)) || { name, reps: name === 'Премиум' ? 2 : 1, contacts: 'без ограничения',
    posts: { company: name === 'Экспо' ? 0 : 1, person: name === 'Премиум' ? 1 : 0 }, workshops: name === 'Премиум' };
  const curPack = () => packOf(X.pack);
  const repsLine = p => p.reps === 1 ? '1 представитель вместе с владельцем' : pl(p.reps, ['представитель', 'представителя', 'представителей']);
  const postsTotal = p => p.posts.company + p.posts.person;
  const postsLine = p => {
    const n = postsTotal(p);
    if (!n) return 'Постов в ленте нет';
    if (n === 1) return '1 пост о компании';
    return pl(n, ['пост', 'поста', 'постов']) + ': о компании и о человеке';
  };

  /* лист: содержимое оборачивается в .exh, чтобы действовали размеры чипов и кнопок раздела */
  function openSh(html, opts) { D.openSheet('<div class="exh">' + html + '</div>', opts); }

  /* лист подтверждения: заголовок, строки пояснения, кнопка с действием; отмена закрывает лист */
  function confirmSheet(title, lines, okLabel, act, arg) {
    openSh('<div class="sheet-title">' + esc(title) + '</div>' +
      '<ul class="exh-rules">' + lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' +
      '<button class="btn btn-primary btn-block" data-act="' + esc(act) + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + '>' + esc(okLabel) + '</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  }

  const personByName = name => (F.PEOPLE || []).find(p => p.name === name) || null;
  /* строка «аватар + имя» как кнопка перехода в карточку участника; без карточки — обычная строка */
  function whoBtn(name, subHtml, extra) {
    const p = personByName(name);
    const inner = avatar(name, 'sm') + '<span class="t"><b>' + esc(name) + '</b>' + (subHtml ? '<span>' + subHtml + '</span>' : '') + '</span>';
    return p ? '<button class="exh-who' + (extra ? ' ' + extra : '') + '" data-go="F2/' + p.id + '">' + inner + '</button>'
      : '<div class="exh-who' + (extra ? ' ' + extra : '') + '">' + inner + '</div>';
  }

  /* демо-ряд (переключатель пакета, выбор участника): подпись «демо» и лента чипов .chip-rail.
     Вверху экрана подпись и лента — прямые дети .scr сразу после шапки (как D.chipRail): первый чип на 20 px даёт padding самой ленты.
     Внутри тела экрана (поля 20 px) лента вынесена за поля отрицательным отступом (exhibitor.css): первый чип тоже на 20 px.
     Прокрутку ленты при перерисовке и подвод выбранного чипа ведёт оболочка. */
  const demoLabel = title => '<span class="exh-demo-tag">демо</span>' + esc(title);
  const demoRail = (title, chipsHtml, top) => top
    ? '<div class="exh-demo-t">' + demoLabel(title) + '</div><div class="chip-rail">' + chipsHtml + '</div>'
    : '<div class="exh-demo-rail"><div class="t">' + demoLabel(title) + '</div><div class="chip-rail">' + chipsHtml + '</div></div>';
  /* демо-переключатель пакета: показывает, как меняются квоты и разделы (в продукте пакет задаёт менеджер Экспо) */
  function packSwitch(top) {
    return demoRail('Показать как пакет', PACK_NAMES.map(n =>
      '<button class="chip' + (X.pack === n ? ' on' : '') + '" data-act="exh-pack" data-arg="' + esc(n) + '">' + esc(n) + '</button>').join(''), top);
  }
  D.action('exh-pack', el => { X.pack = el.dataset.arg; D.rerender(); });

  /* контакты: данные кабинета (c1–c6 из фикстуры, c7–c10 здесь) плюс добавленные сканером; этап и правки из J4/I3 накладываются сверху */
  /* c4 по умолчанию на этапе «контакт» (не «не актуально»): иначе он был бы в архиве с первого экрана и исходные числа кабинета (10 контактов) разошлись бы с решением ведущего */
  const STAGE0 = { c1: 'предложение', c2: 'встреча', c3: 'контакт', c4: 'контакт', c5: 'новый', c6: 'новый', c7: 'новый', c8: 'контакт', c9: 'новый', c10: 'новый' };
  const SEED_MORE = [
    { id: 'c7', name: 'Денис Воронов', company: 'ТрансЛайн', role: 'CEO', heat: 'warm', note: 'ищет WMS под транспортный склад', step: 'отправить материалы' },
    { id: 'c8', name: 'Игорь Савельев', company: 'ПромСнаб', role: 'директор по продажам', heat: 'hot', note: 'выбирает систему для двух складов', step: 'созвон' },
    { id: 'c9', name: 'Андрей Крутов', company: 'Опора Девелопмент', role: 'генеральный директор', heat: 'warm', note: 'строят склад, нужна WMS к запуску', step: 'познакомить' },
    { id: 'c10', name: 'Глеб Тарасов', company: 'ЭкоУпаковка', role: 'коммерческий директор', heat: 'cold', note: 'интересовался упаковкой, не складом', step: '—' }
  ];
  /* когда и как получен контакт (день, время, источник) */
  const CMETA = {
    c1: ['26.02', '15:10', 'скан'], c2: ['26.02', '17:20', 'встреча'], c3: ['26.02', '15:00', 'встреча'], c4: ['27.02', '10:20', 'скан'],
    c5: ['26.02', '14:25', 'скан'], c6: ['26.02', '11:40', 'визитка'], c7: ['27.02', '10:35', 'скан'], c8: ['27.02', '10:50', 'визитка'],
    c9: ['27.02', '11:00', 'скан'], c10: ['27.02', '11:05', 'скан']
  };
  /* три слоя: rawContacts — все, кроме убранных; allContacts — «живые» (без архива): их считают I1, I2, I8 и воронка;
     архив — этап «не актуально», данные хранятся, в списках и счётчиках контакта нет */
  function rawContacts() {
    return F.EXH.contacts.concat(SEED_MORE, X.extra).filter(c => !X.gone[c.id]).map(c => {
      const m = CMETA[c.id];
      const base = m ? Object.assign({}, c, { day: m[0], time: m[1], via: m[2] }) : c;
      const e = X.edits[c.id];
      return e ? Object.assign({}, base, { heat: e.heat || base.heat, step: e.step || base.step, note: e.note != null ? e.note : base.note }) : base;
    });
  }
  const stageOf = c => X.stage[c.id] || STAGE0[c.id] || 'новый';
  const ARCH = 'не актуально';
  const isArch = c => stageOf(c) === ARCH;
  const allContacts = () => rawContacts().filter(c => !isArch(c));
  const archivedContacts = () => rawContacts().filter(isArch);
  /* контакт участника: в архиве тоже (повторный скан возвращает ту же карточку, второго контакта не создаёт) */
  const contactOfPerson = pid => {
    const p = (F.PEOPLE || []).find(x => x.id === pid);
    const name = pid === 'me' ? F.ME.name : (p && p.name);
    return rawContacts().find(c => c.name === name) || null;
  };
  const contactById = id => rawContacts().find(c => c.id === id) || null;
  function addContact(o) {
    const id = 'c' + (++X.seq);
    const c = Object.assign({ id, heat: 'warm', note: '', step: '—', source: 'скан', via: 'скан', day: F.NOW.day, time: F.NOW.time }, o);
    X.extra.push(c);
    return c;
  }
  const STEPS = ['отправить материалы', 'повторная встреча', 'познакомить', 'созвон', 'ничего'];   /* следующий шаг: общий список для I3 и J4 */
  const decOf = r => X.dec[r.id] || r.status;
  /* время заявки: после «Другое время» (I7) везде показывается предложенное экспонентом окно */
  const reqTime = r => decOf(r) === 'counter' && X.counter && X.counter[r.id] ? X.counter[r.id] : r.time;
  function pendingRequests() { return F.EXH_REQUESTS.filter(r => decOf(r) === 'pending').length; }
  /* вчерашние заявки: только для периодов I8 (на экране I7 показываются заявки сегодняшнего дня) */
  const Y_REQ = [{ who: 'Дмитрий Аврамов', status: 'confirmed' }, { who: 'Марина Крылова', status: 'confirmed' }, { who: 'Роман Гладков', status: 'declined' }];
  const kpiNum = i => parseInt(String(F.EXH.kpi[i].value).replace(/\D/g, ''), 10);
  const IMPR_T = kpiNum(0), EXPL_T = kpiNum(1);
  const IMPR_Y = Math.round(IMPR_T / (1 + parseInt(F.EXH.kpi[0].delta, 10) / 100));   /* +18% к вчера: 1 284 / 1,18 ≈ 1 088 */
  const EXPL_Y = EXPL_T - parseInt(F.EXH.kpi[1].delta, 10);                           /* +11 к вчера: 96 − 11 = 85 */
  const todayN = () => allContacts().filter(c => c.day === F.NOW.day).length;

  /* «Предложить встречу» не заводит своего состояния: форма заявки F11 принадлежит S5 (F.PPL.store). Чтобы кнопка не вела в тупик,
     перед показом проверяется то же, что проверяет F11: уже есть встреча (ведёт в G4), общих окон нет (ведёт в G11), иначе форма F11. */
  function meetState(pe) {
    const P = F.PPL;
    if (!pe || !P || !P.store) return { k: 'ok' };
    const m = (P.store.meets || []).find(x => x.who && x.who.type === 'person' && x.who.id === pe.id && (x.status === 'pending' || x.status === 'confirmed'));
    if (m) return { k: 'have', m };
    if (!P.suggest(pe.id)) return { k: 'none' };
    return { k: 'ok' };
  }
  function meetBtn(pe, cls) {
    if (!pe) return '';
    const s = meetState(pe);
    /* подпись кнопки сама называет состояние (она же ссылка): «Встреча уже есть» — в G4, «Нет общих окон» — в G11 («Что можно сделать») */
    if (s.k === 'have') return '<button class="btn ' + cls + '" data-go="G4/' + s.m.id + '" aria-label="Встреча уже есть: открыть встречу">Встреча уже есть</button>';
    if (s.k === 'none') return '<button class="btn ' + cls + '" data-go="G11/' + pe.id + '" aria-label="Нет общих окон: что можно сделать">Нет общих окон</button>';
    return '<button class="btn ' + cls + '" data-go="F11/' + pe.id + '">Предложить встречу</button>';
  }
  /* пояснение к состоянию кнопки: встреча уже есть или общих окон нет (для «ok» пусто) */
  function meetNote(pe) {
    if (!pe) return '';
    const s = meetState(pe), P = F.PPL;
    if (s.k === 'have') {
      const m = s.m;
      return '<div class="banner ok">' + icon('check') + '<div style="flex:1"><div class="cap"><b>Встреча уже есть:</b> ' + esc(P.dayTime(m.day, m.start + '–' + P.endOf(m.start, m.dur || 30))) +
        (m.place ? ', ' + esc(m.place) : '') + '.' + (m.status === 'pending' ? ' Заявка ждёт ответа.' : '') + '</div>' +
        '<button class="exh-lnk" data-go="G4/' + m.id + '">Открыть встречу' + icon('chevR') + '</button></div></div>';
    }
    if (s.k === 'none') {
      return '<div class="banner">' + icon('info') + '<div style="flex:1"><div class="cap"><b>Общих окон нет:</b> в ближайшие дни нет окна, свободного у вас и у собеседника, или все столы заняты.</div>' +
        '<button class="exh-lnk" data-go="G11/' + pe.id + '">Что можно сделать' + icon('chevR') + '</button></div></div>';
    }
    return '';
  }
  const removeContact = id => { X.gone[id] = true; };
  /* архивный контакт возвращается на этап «новый» */
  const restoreContact = id => { X.stage[id] = 'новый'; };

  window.S4B = { X, openSh, packOf, curPack, confirmSheet, whoBtn, personByName, allContacts, rawContacts, archivedContacts, isArch, contactById,
    contactOfPerson, addContact, removeContact, restoreContact, meetState, meetBtn, meetNote, stageOf, pl, HEAT, EXID, demoRail, demoLabel, todayN, STEPS };

  const BODY = '<div class="exh-body">';
  const END = '<div class="exh-end"></div></div></div>';

  /* неизвестный идентификатор в маршруте: честное «не найдено» вместо чужой карточки (запись нельзя ошибочно изменить) */
  function notFoundHtml(back, eyebrow, title, text, btn) {
    return '<div class="scr exh">' + D.head({ back, eyebrow, title, sub: text, paren: paren('такой записи нет') }) + BODY +
      '<div class="empty">' + icon('search') + '<div class="e-title">' + esc(title) + '</div><div class="e-text">' + esc(text) + '</div>' +
      '<button class="btn btn-secondary btn-sm" data-go="' + back + '">' + esc(btn) + '</button></div>' + END;
  }
  window.S4B.notFoundHtml = notFoundHtml;

  /* ---------- I1 Кабинет экспонента: главная ---------- */
  D.register('I1', {
    tab: 'H1',
    meta: {
      title: 'I1 · Кабинет экспонента: главная',
      role: 'Представитель экспонента, телефон',
      fr: ['FR-EXH-01', 'FR-EXH-02', 'FR-EXH-08', 'FR-EXH-09', 'FR-ANL-02'],
      ac: ['AC-EXH-01', 'AC-EXH-03'],
      what: [
        'Пакет компании («Экспо», «Экспо+» или «Премиум») с составом: представители, посты в ленте, воркшопы; контактов без ограничения.',
        'Сверху: кнопка «Сканировать контакт» и ближайшие задачи на сегодня (срочное выше): ответить на заявки, воркшоп, карточка, пропуска.',
        'Четыре показателя дня: показы карточки, «Изучить», запросы встреч, контакты за сегодня; переход в аналитику, заявки и контакты.',
        'Пакет компании, разделы кабинета, ближайшие встречи на стенде и КипяTALK (только «Премиум»); переключатель пакета для показа внизу.',
        'Переключатель пакета стоит для демонстрации: в продукте пакет задаёт менеджер Экспо.'
      ],
      rules: [
        'Показатели считаются из списков кабинета: запросы встреч и ожидающие — из «Заявки», контакты — из «Контакты»; на главной, в списках и в аналитике числа совпадают.',
        'Экспонент видит контакты, заявки и аналитику только своей компании.',
        'После «Другое время» (I7) строка заявки показывает предложенное время и статус «другое время»; в показателе «ждут» такая заявка не считается, окно на «Доступность» занято.',
        'Воркшопы, второй представитель и пост о человеке входят только в «Премиум» (D-27, D-40).',
        'Плашек проверки экспонента в кабинете и в карточке нет, реклама проверки не размещается (D-39).'
      ],
      depends: ['D-27 пакеты Экспо', 'D-40 названия пакетов и посты', 'D-39 без плашек проверки']
    },
    html() {
      const p = curPack();
      const ex = F.exhibitor(EXID) || {};
      const E = F.EXH;
      const kt = (F.KIPATALK || []).filter(k => k.ex === EXID && k.day === F.NOW.day)[0];
      const reqs = F.EXH_REQUESTS.filter(r => decOf(r) !== 'declined')
        .sort((a, b) => reqTime(a) < reqTime(b) ? -1 : 1);
      const pend = pendingRequests();
      const nextPend = reqs.filter(r => decOf(r) === 'pending')[0];
      const confirmed = F.EXH_REQUESTS.filter(r => decOf(r) === 'confirmed').length;
      const counter = F.EXH_REQUESTS.filter(r => decOf(r) === 'counter').length;
      const contacts = allContacts();
      const hot = contacts.filter(c => c.heat === 'hot').length;
      const kpiRows = [
        ['I8', 'Показы карточки', num(IMPR_T), E.kpi[0].delta],
        ['I8', 'В «Изучить» добавили', num(EXPL_T), E.kpi[1].delta],
        ['I7', 'Запросы встреч', F.EXH_REQUESTS.length, 'подтверждено: ' + confirmed + ' · ждут: ' + pend + (counter ? '\nдругое время: ' + counter : '')],
        ['I2', 'Контактов сегодня', todayN(), 'всего ' + contacts.length + ' · горячих ' + hot]
      ];
      const kpis = kpiRows.map(k =>
        '<button class="exh-kpi" data-go="' + k[0] + '"><span class="k">' + esc(k[1]) + '</span><span class="v">' + esc(k[2]) + '</span><span class="d">' + esc(k[3]) + '</span></button>').join('');
      const tile = (go, ic, t, s, off) => '<button class="exh-tile' + (off ? ' off' : '') + '" data-go="' + go + '">' + icon(ic) + '<span class="t">' + esc(t) + '</span><span class="s">' + esc(s) + '</span></button>';
      const tiles = [
        tile('I2', 'people', 'Контакты', pl(contacts.length, ['контакт', 'контакта', 'контактов'])),
        tile('I7', 'inbox', 'Заявки', pend ? 'ждут ответа: ' + pend : 'все обработаны'),
        tile('I5', 'calendar', 'Доступность', 'окна на стенде сегодня'),
        tile('I4', 'userPlus', 'Команда и квота', repsLine(p)),
        tile('I8', 'chart', 'Аналитика', 'воронка и контакты по часам'),
        tile('I10', 'feed', 'Посты и предложения', postsLine(p)),
        tile('I9', 'briefcase', 'Карточка решения', 'как её видят участники'),
        tile('I6', 'mic', 'Воркшоп', p.workshops ? '3 окна по 30 минут' : 'входит в «Премиум»', !p.workshops)
      ].join('');

      /* ближайшие задачи на сегодня: срочное (заявки, возвращённый пост, воркшоп) выше обычных */
      const tasks = [];
      if (pend) tasks.push({ k: 'tr', t: 'Ответить на заявки на встречи: ' + pend, s: nextPend ? 'ближайшая: ' + nextPend.who + ', ' + nextPend.time.slice(0, 5) : '', go: 'I7', lab: 'Открыть заявки', live: true });
      const returned = (X.posts[X.pack] || []).some(x => x.status === 'returned');
      if (returned) tasks.push({ k: 'tp', t: 'Исправить возвращённый пост и отправить снова', go: 'I10', lab: 'Мои посты', live: true });
      if (p.workshops) tasks.push({ k: 't2', t: 'Подтвердить участие в воркшопе 15:30', go: 'I6', lab: 'Открыть воркшоп' });
      tasks.push({ k: 't1', t: 'Ответить на три вопроса о продукте в карточке', go: 'I9', lab: 'Открыть карточку' });
      tasks.push({ k: 't0', t: 'Загрузить фото стенда и двух сотрудников' });
      tasks.push({ k: 't3', t: 'Выдать пропуска команде на стойке' });
      const tasksHtml = tasks.map(t =>
        '<div class="toggle-row"><div style="flex:1;min-width:0">' +
        (t.live ? '<div class="exh-task-t">' + esc(t.t) + '</div>' : '<label class="exh-task-t" for="i1-' + t.k + '">' + esc(t.t) + '</label>') +
        (t.s ? '<div class="exh-task-s">' + esc(t.s) + '</div>' : '') +
        (t.go ? '<button class="exh-lnk" data-go="' + t.go + '">' + esc(t.lab) + icon('chevR') + '</button>' : '') + '</div>' +
        (t.live ? '' : '<label class="toggle"><input type="checkbox" id="i1-' + t.k + '" data-task="' + t.k + '"' + (X.done[t.k] ? ' checked' : '') + '><span class="tr"></span></label>') + '</div>').join('');

      const meetRows = reqs.length ? reqs.map(r => {
        const st = decOf(r);
        return '<div class="row">' + whoBtn(r.who, esc(r.company) + ' · ' + esc(reqTime(r)) + ' · ' + esc(r.space)) +
          '<span class="mc-status ' + (st === 'confirmed' ? 'ok' : 'wait') + '">' + (st === 'confirmed' ? 'подтверждена' : st === 'counter' ? 'другое время' : 'ждёт ответа') + '</span></div>';
      }).join('') : '<div class="exh-cap" style="padding:10px 0">Заявок на ближайшее время нет.</div>';

      let ktHtml;
      if (p.workshops && kt) {
        const left = kt.cap - kt.signed;
        ktHtml = '<div class="card"><div class="card-row"><span class="tag accent">КипяTALK</span><span class="exh-cap">' + esc(kt.day) + ' · ' + esc(kt.time) + ' · ' + kt.dur + ' минут</span></div>' +
          '<div class="r-title">' + esc(kt.title) + '</div>' +
          '<div class="exh-cap">Записались: ' + kt.signed + ' из ' + kt.cap + ' · ' + (left > 0 ? 'осталось ' + pl(left, ['место', 'места', 'мест']) : 'мест нет') + '</div>' +
          '<div class="exh-acts"><button class="btn btn-secondary btn-sm" data-go="I6">Записавшиеся</button>' +
          '<button class="exh-lnk" data-go="H5">Расписание КипяTALK' + icon('chevR') + '</button></div></div>';
      } else {
        ktHtml = '<div class="banner">' + icon('info') + '<div class="cap">Воркшопы на КипяTALK входят в пакет «Премиум»: три окна по 30 минут в роли спикера круглого стола. В пакете «' + esc(p.name) + '» их нет.</div></div>';
      }

      return '<div class="scr exh">' +
        D.head({ backHist: true, eyebrow: 'Кабинет экспонента', title: esc(F.EXH.company),
          sub: esc(F.EXH.what) + ' · ' + esc(ex.stand || 'Зона 1 · А-12'), paren: paren('задачи на сегодня · демо-данные') }) +
        BODY +
        '<button class="btn btn-primary btn-block" data-go="J1">' + icon('scan') + 'Сканировать контакт</button>' +
        '<div class="exh-ttl">Ближайшие задачи<span class="n">на сегодня</span></div>' +
        '<div class="card" style="padding:4px 16px">' + tasksHtml + '</div>' +
        '<div class="exh-ttl">Показатели дня</div>' +
        '<div class="exh-kpis">' + kpis + '</div>' +
        '<div class="card exh-pack"><div class="card-row" style="justify-content:space-between;align-items:flex-start">' +
        '<div><div class="exh-cap">Ваш пакет</div><div class="nm">' + esc(p.name) + '</div></div>' +
        '<button class="exh-lnk" data-go="I4">Команда и квота' + icon('chevR') + '</button></div>' +
        '<div class="lead">' + esc(F.EXH.status.charAt(0).toUpperCase() + F.EXH.status.slice(1)) + ' · ' + esc(ex.stand || '') + '</div>' +
        '<div class="exh-wrap" style="gap:2px 16px"><button class="exh-lnk" data-go="H2/' + EXID + '">Карточка в каталоге' + icon('chevR') + '</button>' +
        '<button class="exh-lnk" data-go="H8/' + EXID + '">Стенд на схеме' + icon('chevR') + '</button></div>' +
        '<div class="exh-facts">' + tag(repsLine(p)) + tag('Контактов без ограничения') + tag(postsLine(p)) +
        tag(p.workshops ? 'Воркшопы: 3 окна по 30 минут' : 'Без воркшопов') + '</div></div>' +
        '<div class="exh-ttl">Разделы кабинета</div>' +
        '<div class="exh-tiles">' + tiles + '</div>' +
        '<div class="exh-ttl">Ближайшие встречи<button class="exh-lnk" data-go="I7">Все заявки</button></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + meetRows + '</div></div>' +
        '<div class="exh-ttl">КипяTALK</div>' + ktHtml +
        packSwitch() +
        END;
    },
    mount(host) {
      host.querySelectorAll('[data-task]').forEach(inp => inp.addEventListener('change', () => {
        X.done[inp.dataset.task] = inp.checked;
        D.toast(inp.checked ? 'Задача отмечена' : 'Задача снята');
      }));
    }
  });

  /* ---------- I4 Команда и квота ---------- */
  function seatInfo() {
    const p = curPack();
    const active = X.team.filter(m => m.state === 'team').concat(X.team.filter(m => m.state === 'invited'));
    const inQuota = active.slice(0, p.reps);
    const over = active.slice(p.reps);
    return { p, active, used: inQuota.length, over, free: Math.max(0, p.reps - active.length),
      isOver: m => over.indexOf(m) >= 0 };
  }

  D.register('I4', {
    tab: 'H1',
    meta: {
      title: 'I4 · Команда и квота',
      role: 'Администратор компании-экспонента',
      fr: ['FR-EXH-02', 'FR-EXH-09', 'FR-ACC-05'],
      ac: ['AC-EXH-01', 'AC-ACC-04'],
      what: [
        'Квота представителей по пакету: «Экспо» и «Экспо+» — 1 представитель вместе с владельцем, «Премиум» — 2 (D-27).',
        'Список команды: в команде, приглашение отправлено (с остатком срока), сверх квоты.',
        'Приглашение по контакту (телефон или e-mail) с подтверждением в листе; при отсутствии свободных мест — запрос менеджеру Экспо.',
        'Сравнение пакетов по числу представителей; текущий пакет отмечен.'
      ],
      rules: [
        'Приглашение сверх квоты невозможно; увеличение квоты делает менеджер Экспо и фиксирует в журнале.',
        'Приглашение живёт 72 часа; место занято, пока приглашение действует; отзыв или удаление освобождают место.',
        'Входит ли владелец в квоту, уточняется (остаток O-05): в демо квота считается по числу представителей в списке.',
        'Представитель видит контакты, заявки и аналитику только своей компании.'
      ],
      depends: ['D-27 пакеты Экспо', 'D-40 названия пакетов', 'O-05 квота и владелец']
    },
    html() {
      const s = seatInfo(), p = s.p;
      const rows = X.team.map(m => {
        const over = s.isOver(m);
        /* пилюля статуса в одну строку; срок приглашения и пояснение про квоту стоят рядом отдельной подписью */
        const stTxt = over ? 'сверх квоты' : m.state === 'team' ? 'в команде' : 'приглашён';
        const stCls = over ? 'err' : m.state === 'team' ? 'ok' : 'wait';
        const stNote = over ? 'не входит в квоту пакета' : m.state === 'invited' ? m.left : '';
        const act = m.state === 'team' ? ['remove', 'Убрать'] : ['recall', 'Отозвать'];
        return '<div class="exh-member' + (over ? ' over' : '') + '">' + avatar(m.name, 'sm') +
          '<div class="grow"><div class="r-title">' + esc(m.name) + '</div><div class="r-sub">' + esc(m.role) + (m.via ? ' · ' + esc(m.via) : '') + '</div>' +
          '<div class="exh-st-row"><span class="exh-st ' + stCls + '">' + esc(stTxt) + '</span>' + (stNote ? '<span class="exh-cap">' + esc(stNote) + '</span>' : '') + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-act="exh-team" data-arg="' + m.id + ':' + act[0] + '">' + act[1] + '</button></div>';
      }).join('');
      const full = s.free === 0;
      const compare = PACK_NAMES.map(n => {
        const q = packOf(n);
        return '<div class="row"><div class="grow"><div class="r-title">' + esc(n) + (n === p.name ? ' ' + tag('показан', 'accent') : '') + '</div>' +
          '<div class="r-sub">' + esc(repsLine(q)) + '</div></div></div>';
      }).join('');
      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: 'Кабинет экспонента', title: 'Команда и квота',
          sub: esc(F.EXH.company) + ' · пакет ' + esc(p.name), paren: paren('число мест задаёт пакет участия') }) +
        packSwitch(true) + BODY +
        '<div class="card accent-edge exh-seatnum"><div class="exh-cap">занято мест квоты</div>' +
        '<div class="big">' + s.used + ' <small>из ' + p.reps + '</small></div>' +
        '<div class="exh-cap" style="margin-top:4px">' + esc(repsLine(p)) + ' · ' + (s.free ? 'свободно: ' + s.free : 'свободных мест нет') +
        (s.over.length ? ' · сверх квоты: ' + s.over.length : '') + '</div></div>' +
        '<div class="exh-ttl">Команда<span class="n">' + pl(X.team.length, ['человек', 'человека', 'человек']) + '</span></div>' +
        '<div class="card" style="padding:2px 16px">' + (rows || '<div class="exh-cap" style="padding:12px 0">В команде пока никого нет.</div>') + '</div>' +
        (s.over.length ? '<div class="banner warn">' + icon('alert') + '<div class="cap">В пакете «' + esc(p.name) + '» мест меньше, чем людей в списке. Приглашение сверх квоты не действует, пока менеджер Экспо не расширит квоту.</div></div>' : '') +
        '<div class="exh-ttl">Пригласить представителя</div>' +
        '<div class="card">' + (full
          ? '<div class="exh-cap">Свободных мест нет. Освободите место, убрав человека из команды или отозвав приглашение, либо запросите расширение квоты у менеджера Экспо.</div>' +
            (X.seatReq ? '<div class="banner ok">' + icon('check') + '<div class="cap">Запрос отправлен менеджеру Экспо. Решение придёт в уведомлениях.</div></div>'
              : '<button class="btn btn-secondary btn-block" data-act="exh-seat-ask">Запросить место у менеджера</button>')
          : '<div class="field"><label for="i4contact">Телефон или e-mail</label>' +
            '<input class="input" id="i4contact" data-i4contact placeholder="например, name@company.ru" autocomplete="off">' +
            '<div class="err-msg" data-i4err hidden></div></div>' +
            '<div class="field"><label for="i4name">Имя (по желанию)</label>' +
            '<input class="input" id="i4name" data-i4name placeholder="как обращаться" autocomplete="off"></div>' +
            '<button class="btn btn-primary btn-block" data-act="exh-invite">Пригласить</button>') +
        '<div class="exh-cap">Приглашение придёт по SMS или e-mail и действует 72 часа. Новый представитель видит контакты, заявки и аналитику только вашей компании.</div></div>' +
        '<div class="exh-ttl">Пакеты и квота</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + compare + '</div></div>' +
        END;
    }
  });

  function validContact(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || /^\+?[\d\s()-]{10,}$/.test(v);
  }
  D.action('exh-invite', () => {
    const inp = document.querySelector('[data-i4contact]');
    const err = document.querySelector('[data-i4err]');
    const v = inp ? inp.value.trim() : '';
    if (!validContact(v)) {
      if (inp) inp.classList.add('err');
      if (err) { err.hidden = false; err.textContent = v ? 'Похоже на неверный контакт: введите e-mail или телефон полностью' : 'Введите телефон или e-mail коллеги'; }
      return;
    }
    X.inviteDraft = { via: v, name: (document.querySelector('[data-i4name]') || {}).value || '' };
    const s = seatInfo();
    confirmSheet('Пригласить представителя?', [
      'Приглашение уйдёт на ' + v + ' и действует 72 часа.',
      'Оно займёт одно место квоты. ' + (s.free > 1 ? 'После этого свободных мест: ' + (s.free - 1) + '.' : 'После этого свободных мест не останется.'),
      'Представитель увидит контакты, заявки и аналитику только вашей компании.'
    ], 'Отправить приглашение', 'exh-invite-ok');
  });
  D.action('exh-invite-ok', () => {
    const d = X.inviteDraft;
    if (!d || seatInfo().free < 1) { D.closeSheet(); D.toast('Свободных мест нет'); return; }
    X.team.push({ id: 't' + (++X.seq), name: d.name.trim() || 'Приглашённый представитель', role: 'представитель', via: d.via, state: 'invited', left: 'осталось 72 ч' });
    X.inviteDraft = null;
    D.closeSheet(); D.toast('Приглашение отправлено: ' + d.via); D.rerender();
  });
  D.action('exh-seat-ask', () => {
    confirmSheet('Запросить место у менеджера?', [
      'Запрос уйдёт менеджеру Экспо вместе с названием компании и пакетом «' + curPack().name + '».',
      'Менеджер расширяет квоту сам и записывает решение в журнал.'
    ], 'Отправить запрос', 'exh-seat-ask-ok');
  });
  D.action('exh-seat-ask-ok', () => { X.seatReq = true; D.closeSheet(); D.toast('Запрос отправлен менеджеру Экспо'); D.rerender(); });
  D.action('exh-team', el => {
    const [id, a] = el.dataset.arg.split(':');
    const m = X.team.find(x => x.id === id);
    if (!m) return;
    const t = a === 'remove' ? ['Убрать из команды?', [m.name + ' потеряет доступ к кабинету экспонента.', 'Место квоты освободится сразу.']]
      : ['Отозвать приглашение?', ['Ссылка из приглашения перестанет работать.', 'Место квоты освободится сразу.']];
    confirmSheet(t[0], t[1], a === 'remove' ? 'Убрать' : 'Отозвать', 'exh-team-ok', id);
  });
  D.action('exh-team-ok', el => {
    const id = el.dataset.arg;
    X.team = X.team.filter(x => x.id !== id);
    D.closeSheet(); D.toast('Место освобождено'); D.rerender();
  });

  /* ---------- I10 Мои посты и предложения ---------- */
  const SLOT_NAME = { company: 'Пост о компании', person: 'Пост о человеке' };
  const ST_TXT = { review: 'на проверке', published: 'опубликован', returned: 'возвращён' };
  const ST_CLS = { review: 'wait', published: 'ok', returned: 'err' };
  const ST_IC = { review: 'clock', published: 'check', returned: 'alert' };
  const stChip = s => '<span class="exh-st ' + ST_CLS[s] + '">' + icon(ST_IC[s]) + ST_TXT[s] + '</span>';
  const RETURN_REASON = 'В тексте не хватает конкретики: напишите, что участник получит на стенде и когда, и отправьте пост снова.';
  const OFFER_RETURN = 'Укажите, что именно получит участник и когда: например, «карта процессов склада за 30 минут на стенде».';

  function quota() {
    const p = curPack();
    const posts = X.posts[p.name] || (X.posts[p.name] = []);
    const used = s => posts.filter(x => x.slot === s && x.status !== 'returned').length;
    return { p, posts, company: { max: p.posts.company, used: used('company') }, person: { max: p.posts.person, used: used('person') },
      free: s => ({ company: p.posts.company, person: p.posts.person })[s] - used(s) > 0 };
  }

  /* предпросмотр как карточка записи в ленте (R1/R4): автор, сфера и время, пометка, текст, кнопки подвала */
  const postPreview = text => {
    const t = String(text || '').trim();
    const ex = F.exhibitor(EXID) || {};
    return '<div class="exh-pv"><div class="exh-pv-h">' + avatar(F.EXH.company) +
      '<div class="who"><b>' + esc(F.EXH.company) + '</b><span>' + esc(ex.what || '') + '</span></div><span class="when">' + esc(F.NOW.time) + '</span></div>' +
      '<div>' + tag('Решения для роста бизнеса', 'accent') + '</div>' +
      '<div class="exh-pv-t' + (t ? '' : ' ph') + '">' + (t ? esc(t) : 'Здесь появится текст поста') + '</div>' +
      '<div class="exh-pv-f"><span class="exh-pvbtn">Карточка решения</span><span class="exh-pvbtn">+ Путь</span></div></div>';
  };
  const offerBox = (o, bare) => '<div class="exh-offer">' + (bare ? '' : '<span class="tag accent" style="align-self:flex-start">Спецпредложение участникам</span>') +
    '<div class="exh-offer-t">' + (o.text ? esc(o.text) : 'Здесь появится текст предложения') + '</div>' +
    '<div class="exh-cap">' + esc(o.format) + ' · срок: ' + esc(o.until || '—') + '</div></div>';

  const modRow = id => '<div class="exh-demo"><div class="t">Показать решение модератора (для демонстрации)</div>' +
    '<div class="exh-acts" style="padding-bottom:8px"><button class="btn btn-secondary btn-sm" data-act="exh-mod" data-arg="' + id + ':ok">Одобрил</button>' +
    '<button class="btn btn-secondary btn-sm" data-act="exh-mod" data-arg="' + id + ':back">Вернул с причиной</button></div></div>';

  function postCard(x) {
    const open = X.histOpen && X.histOpen[x.id];
    const when = x.status === 'published' ? 'опубликован ' + x.time : x.status === 'review' ? 'отправлен на проверку ' + x.time : 'возвращён модератором';
    const who = x.slot === 'person' && x.person ? ' · ' + x.person : '';
    return '<div class="card exh-post"><div class="exh-post-h"><span class="exh-post-k">' + SLOT_NAME[x.slot] + esc(who) + '</span>' + stChip(x.status) + '</div>' +
      '<div class="exh-post-w">' + esc(when) + '</div>' +
      '<div class="exh-post-t">' + esc(x.text) + '</div>' +
      (x.status === 'returned' ? '<div class="exh-reason"><b>Причина возврата</b>' + esc(x.reason || RETURN_REASON) + '<div class="exh-cap" style="margin-top:4px">Возвращённый пост квоту не расходует.</div></div>' : '') +
      (x.status === 'review' ? '<div class="exh-cap">В ленте пост появится после одобрения модератором. Пока он занимает место квоты.</div>' : '') +
      '<div class="exh-acts">' +
      '<button class="btn btn-secondary btn-sm" data-act="exh-post-pv" data-arg="' + x.id + '">Предпросмотр</button>' +
      (x.status === 'returned' ? '<button class="btn btn-primary btn-sm" data-act="exh-post-edit" data-arg="' + x.id + '">Исправить и отправить</button>' : '') +
      (x.status === 'published' && x.feed ? '<button class="exh-lnk" data-go="R4/' + x.feed + '">Открыть в ленте' + icon('chevR') + '</button>' : '') +
      '<button class="exh-lnk" data-act="exh-hist" data-arg="' + x.id + '">История (' + x.hist.length + ')</button></div>' +
      (open ? '<div class="exh-hist">' + x.hist.map(h => '<div class="feed-item"><span class="feed-kind"></span><div><div class="feed-text">' + esc(h[1]) + '</div><div class="feed-time">' + esc(h[0]) + '</div></div></div>').join('') + '</div>' : '') +
      (x.status === 'review' ? modRow(x.id) : '') + '</div>';
  }

  function quotaBlock(q) {
    const row = (title, slot) => {
      const s = q[slot];
      if (!s.max) return '<div class="exh-q"><div class="exh-q-h"><span>' + title + '</span><span class="exh-st dim">не входит в пакет</span></div>' +
        '<div class="cap">В пакете «' + esc(q.p.name) + '» таких постов нет.</div></div>';
      return '<div class="exh-q"><div class="exh-q-h"><span>' + title + '</span><span class="exh-q-n">' + s.used + ' <small>из ' + s.max + '</small></span></div>' +
        '<div class="cap">' + (s.used >= s.max ? 'Квота использована' : 'Осталось: ' + (s.max - s.used)) + '</div></div>';
    };
    return '<div class="card">' + row('Пост о компании', 'company') + '<div class="divider" style="margin:6px 0"></div>' + row('Пост о человеке', 'person') + '</div>';
  }

  D.register('I10', {
    tab: 'H1',
    meta: {
      title: 'I10 · Мои посты и предложения',
      role: 'Администратор или представитель экспонента',
      fr: ['FR-EXH-10', 'FR-EXH-11', 'FR-ACC-12', 'FR-FEED-06', 'FR-FEED-07'],
      ac: ['AC-EXH-07', 'AC-EXH-08', 'AC-ACC-10', 'AC-FEED-07'],
      what: [
        'Квота постов по пакету: «Экспо» — нет, «Экспо+» — 1 о компании, «Премиум» — 1 о компании и 1 о человеке; остаток виден на экране.',
        'Посты с состоянием модерации: на проверке, опубликован, возвращён с причиной; история проверки по каждому посту.',
        'Создание поста в листе с предпросмотром как в ленте (пометка «Решения для роста бизнеса») и подтверждением кнопкой.',
        'Блок «Спецпредложение участникам»: необязательный, формат и срок задаёт экспонент; изменение уходит на проверку.',
        'Правила размещения: рекламные посты участников запрещены, реклама экспонента публикуется только здесь.'
      ],
      rules: [
        'Пост публикуется в ленту только после одобрения модератора; до этого его в ленте нет (D-40, FR-FEED-07).',
        'Возвращённый пост квоту не расходует; опубликованный и затем удалённый расходует (предложение, согласовать).',
        'Пакет в ленте не показывается; пост помечен «Решения для роста бизнеса».',
        'Спецпредложение желательно, но не обязательно; формат и срок индивидуальны (D-40); карточка без него публикуется.',
        'Кнопки «Одобрил» и «Вернул с причиной» показывают решение модератора для демонстрации; в продукте решение принимает модератор в консоли.',
        'После «Одобрил» новое спецпредложение и срок видны участникам в карточке решения (H2) и в каталоге (H1); до решения модератора они видят прежнюю версию. «Убрать предложение» снимает его из H1 и H2 сразу; «Как видит участник» ведёт в H2.'
      ],
      depends: ['D-35 лента и реклама', 'D-40 квота постов и спецпредложение', 'D-54 модерация']
    },
    html() {
      const q = quota(), p = q.p, o = X.offer;
      const noPosts = !postsTotal(p);
      const canNew = (q.free('company') && p.posts.company) || (q.free('person') && p.posts.person);
      let hint = '';
      if (noPosts) hint = 'В пакете «Экспо» постов нет. «Экспо+» включает 1 пост о компании, «Премиум» ещё и 1 пост о человеке.';
      else if (!canNew) hint = 'Квота исчерпана. Возвращённый пост квоту не расходует: его можно исправить и отправить снова.';
      const list = q.posts.map(postCard).join('');
      let offerHtml;
      if (o.on) {
        offerHtml = '<div class="card exh-post"><div class="exh-post-h"><span class="exh-post-k">Сейчас в карточке решения</span>' + stChip(o.status) + '</div>' +
          offerBox(o, true) +
          (o.status === 'returned' ? '<div class="exh-reason"><b>Причина возврата</b>' + esc(o.reason || OFFER_RETURN) + '</div>' : '') +
          (o.status === 'review' ? '<div class="exh-cap">В карточке решения предложение появится после проверки. Пока участники видят прежнюю версию.</div>' : '') +
          '<div class="exh-acts"><button class="btn btn-secondary btn-sm" data-act="exh-offer-edit">Изменить</button>' +
          '<button class="exh-lnk" data-go="H2/' + EXID + '">Как видит участник' + icon('chevR') + '</button>' +
          '<button class="exh-lnk" data-act="exh-offer-off">Убрать предложение</button></div>' +
          (o.status === 'review' ? modRow('offer') : '') + '</div>';
      } else {
        offerHtml = '<div class="card"><div class="r-title">Спецпредложения пока нет</div>' +
          '<div class="exh-cap">Предложение желательно, но не обязательно: карточка решения публикуется и без него. Формат и срок вы задаёте сами по согласованию с менеджером Экспо.</div>' +
          '<button class="btn btn-secondary btn-sm" style="align-self:flex-start" data-act="exh-offer-edit">Добавить предложение</button></div>';
      }
      const rules = [
        'Рекламные посты участников запрещены: участники рассказывают о бизнесе через интро. Реклама экспонента публикуется только здесь.',
        'Каждый пост проверяет модератор до публикации; решение приходит в уведомлении.',
        'Пакет в ленте не показывается; пост помечен «Решения для роста бизнеса».',
        'Возвращённый пост квоту не расходует: исправьте текст и отправьте снова.',
        'Спецпредложение желательно, формат и срок индивидуальны; изменение текста возвращает его на проверку.'
      ];
      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: 'Кабинет экспонента · ' + esc(F.EXH.company), title: 'Мои посты и предложения',
          paren: paren('в ленту пост попадает после проверки модератором') }) +
        packSwitch(true) + BODY +
        '<div class="exh-ttl">Квота постов<span class="n">пакет ' + esc(p.name) + '</span></div>' +
        quotaBlock(q) +
        '<div class="exh-ttl">Посты</div>' +
        (list || '<div class="banner">' + icon('info') + '<div class="cap">Постов пока нет.</div></div>') +
        '<button class="btn btn-primary btn-block"' + (canNew ? ' data-act="exh-post-new"' : ' disabled') + '>' + icon('plus') + 'Новый пост</button>' +
        (hint ? '<div class="exh-cap">' + esc(hint) + '</div>' : '') +
        '<div class="exh-ttl">Спецпредложение участникам</div>' +
        offerHtml +
        '<div class="exh-ttl">Правила размещения</div>' +
        '<div class="card" style="padding:4px 16px"><ul class="exh-rules">' + rules.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul></div>' +
        END;
    }
  });

  D.action('exh-hist', el => { X.histOpen = X.histOpen || {}; X.histOpen[el.dataset.arg] = !X.histOpen[el.dataset.arg]; D.rerender(); });
  D.action('exh-post-pv', el => {
    const x = (X.posts[X.pack] || []).find(v => v.id === el.dataset.arg);
    if (!x) return;
    openSh('<div class="sheet-title">Предпросмотр</div>' + postPreview(x.text) +
      '<div class="exh-cap" style="margin-top:10px">Так пост выглядит в ленте участников. Пакет в ленте не показывается.</div>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Закрыть</button>');
  });

  /* редактор поста: лист с типом, текстом, предпросмотром и кнопкой отправки */
  function editorHtml() {
    const ed = X.ed, q = quota();
    const slots = ['company', 'person'].filter(s => q.p.posts[s] && (q.free(s) || ed.slot === s));
    const reps = X.team.filter(m => m.state === 'team').map(m => m.name);
    const chips = slots.length > 1 ? '<div class="field"><label>Тип поста</label><div class="chips">' +
      slots.map(s => '<button class="chip' + (ed.slot === s ? ' on' : '') + '" data-act="exh-ed-slot" data-arg="' + s + '">' + (s === 'company' ? 'О компании' : 'О человеке') + '</button>').join('') + '</div></div>' : '';
    const personRow = '<div class="field" data-ed-person' + (ed.slot === 'person' ? '' : ' hidden') + '><label>О ком пост</label><div class="chips">' +
      reps.map(n => '<button class="chip' + (ed.person === n ? ' on' : '') + '" data-act="exh-ed-person" data-arg="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div></div>';
    return '<div class="sheet-title">' + (ed.id ? 'Исправить пост' : 'Новый пост') + '</div>' +
      '<div class="exh-cap" style="margin-bottom:10px" data-ed-kind>' + SLOT_NAME[ed.slot] + ' · пакет «' + esc(q.p.name) + '»</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' + chips + personRow +
      '<div class="field"><label for="edtext">Текст поста</label>' +
      '<textarea class="textarea" id="edtext" rows="5" maxlength="' + POST_MAX + '" data-ed-text placeholder="Например: ТехноСклад на стенде А-12 разбирает план вашего склада и показывает, что перенести в WMS первым.">' + esc(ed.text) + '</textarea>' +
      '<div class="counter" data-ed-count>' + ed.text.length + ' / ' + POST_MAX + '</div>' +
      '<div class="err-msg" data-ed-err hidden></div></div>' +
      '<div class="exh-cap">Предпросмотр как в ленте</div><div data-ed-pv>' + postPreview(ed.text) + '</div>' +
      '<div class="exh-cap">Пост уйдёт модератору. В ленте он появится после одобрения, а до этого занимает место квоты. Без цен, внешних ссылок и телефонов.</div></div>' +
      '<div class="exh-sheet-foot"><button class="btn btn-primary btn-block" data-act="exh-post-send">Отправить на проверку</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button></div>';
  }
  function openPostEditor(slot, id) {
    const q = quota();
    const ed = X.ed = { slot, id: id || null, text: '', person: '' };
    if (id) {
      const x = q.posts.find(v => v.id === id);
      if (x) { ed.slot = x.slot; ed.text = x.text; ed.person = x.person || ''; }
    } else if (!slot) {
      ed.slot = q.p.posts.company && q.free('company') ? 'company' : 'person';
    }
    const reps = X.team.filter(m => m.state === 'team').map(m => m.name);
    ed.person = ed.person || reps[0] || '';
    openSh(editorHtml(), { mount: wrap => {
      const ta = wrap.querySelector('[data-ed-text]');
      if (!ta) return;
      ta.addEventListener('input', () => {
        X.ed.text = ta.value;
        wrap.querySelector('[data-ed-count]').textContent = ta.value.length + ' / ' + POST_MAX;
        wrap.querySelector('[data-ed-pv]').innerHTML = postPreview(ta.value);
        ta.classList.remove('err'); wrap.querySelector('[data-ed-err]').hidden = true;
      });
    } });
  }
  D.action('exh-post-new', () => openPostEditor(null, null));
  D.action('exh-post-edit', el => openPostEditor(null, el.dataset.arg));
  D.action('exh-ed-slot', el => {
    X.ed.slot = el.dataset.arg;
    const w = document.querySelector('.sheet');
    if (!w) return;
    w.querySelectorAll('[data-act="exh-ed-slot"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.ed.slot));
    const pr = w.querySelector('[data-ed-person]'); if (pr) pr.hidden = X.ed.slot !== 'person';
    const k = w.querySelector('[data-ed-kind]'); if (k) k.textContent = SLOT_NAME[X.ed.slot] + ' · пакет «' + curPack().name + '»';
  });
  D.action('exh-ed-person', el => {
    X.ed.person = el.dataset.arg;
    document.querySelectorAll('.sheet [data-act="exh-ed-person"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.ed.person));
  });
  D.action('exh-post-send', () => {
    const ed = X.ed, q = quota();
    const w = document.querySelector('.sheet');
    const fail = m => { const e = w && w.querySelector('[data-ed-err]'); const t = w && w.querySelector('[data-ed-text]'); if (e) { e.hidden = false; e.textContent = m; } if (t) t.classList.add('err'); };
    const text = ed.text.trim();
    if (text.length < POST_MIN) { fail('Напишите хотя бы ' + POST_MIN + ' знаков: что участник получит на стенде'); return; }
    if (/https?:|www\.|\+?\d[\d\s()-]{8,}/i.test(text)) { fail('Уберите внешние ссылки и телефоны: контакты участники получают на стенде и через встречи'); return; }
    const editing = ed.id ? q.posts.find(v => v.id === ed.id) : null;
    if (!q.p.posts[ed.slot] || !q.free(ed.slot)) { fail('Квота пакета «' + q.p.name + '» на этот тип постов исчерпана'); return; }
    const time = F.NOW.time;
    if (editing) {
      Object.assign(editing, { text, status: 'review', time, reason: '', person: ed.slot === 'person' ? ed.person : undefined });
      editing.hist.push([time, 'отправлен повторно']);
    } else {
      q.posts.push({ id: 'xp' + (++X.seq), slot: ed.slot, person: ed.slot === 'person' ? ed.person : undefined, status: 'review', time, feed: null,
        text, hist: [[time, 'отправлен на проверку']] });
    }
    X.ed = null;
    D.closeSheet(); D.toast('Пост отправлен на проверку'); D.rerender();
  });
  /* Публикация в каталог: карточку экспонента участники читают из общих данных (H1, H2 берут FIX.EXHIBITORS и FIX.EXH_EXT),
     поэтому решение модератора пишется именно туда, копий в S4b нет. До «Одобрил» участники видят прежнюю версию. */
  const catalogEx = () => F.exhibitor(EXID) || null;
  const catalogExt = () => (F.EXH_EXT && F.EXH_EXT[EXID]) || null;
  const stand = () => String(((catalogEx() || {}).stand || '')).split('·').pop().trim();
  function publishCard() {
    const e = catalogEx(), x = catalogExt(), c = X.card;
    if (e) {
      if (c.solution != null && c.solution.trim()) e.what = c.solution.trim();
      if (c.desc != null && c.desc.trim()) e.desc = c.desc.trim();
    }
    if (x && c.forWhom != null && c.forWhom.trim()) x.forWhom = c.forWhom.trim();
  }
  /* предложение включено — в каталоге спецпредложение со сроком; выключено — остаётся обычная строка «На стенде» без срока и без метки спецпредложения */
  function publishOffer() {
    const e = catalogEx(), x = catalogExt(), o = X.offer;
    if (!e || !x) return;
    if (o.on) { e.offer = o.text; x.offerOn = true; x.offerUntil = o.until; }
    else { x.offerOn = false; x.offerUntil = null; e.offer = 'Подойдите на стенд ' + stand() + ': расскажем о решении и ответим на вопросы'; }
  }
  D.action('exh-mod', el => {
    const [id, a] = el.dataset.arg.split(':');
    const time = F.NOW.time;
    if (id === 'card') {
      const c = X.card;
      if (a === 'ok') { c.status = 'published'; publishCard(); D.toast('Правки одобрены: карточка обновлена в каталоге'); }
      else { c.status = 'returned'; c.reason = 'Уточните срок внедрения и что именно участник получает на стенде.'; D.toast('Карточка возвращена с замечанием'); }
      D.rerender(); return;
    }
    if (id === 'offer') {
      const o = X.offer;
      if (a === 'ok') { o.status = 'published'; o.hist.push([time, 'опубликовано']); publishOffer(); D.toast('Предложение одобрено и показывается в карточке'); }
      else { o.status = 'returned'; o.reason = OFFER_RETURN; o.hist.push([time, 'возвращено с причиной']); D.toast('Предложение возвращено с причиной'); }
      D.rerender(); return;
    }
    const x = (X.posts[X.pack] || []).find(v => v.id === id);
    if (!x) return;
    if (a === 'ok') {
      x.status = 'published'; x.time = time; x.hist.push([time, 'опубликован']);
      if (!x.feed && F.FEED_POSTS) {
        const fid = 'fpx' + (++X.seq);
        F.FEED_POSTS.unshift({ id: fid, kind: 'ad', author: { type: 'exhibitor', ref: EXID }, tags: ['Решения для роста бизнеса'], time, ago: 0,
          link: 'H2/' + EXID, subject: x.slot, text: x.text });
        x.feed = fid;
      }
      D.toast('Пост одобрен и опубликован в ленте');
    } else {
      x.status = 'returned'; x.reason = RETURN_REASON; x.hist.push([time, 'возвращён: ' + RETURN_REASON]);
      D.toast('Пост возвращён: квота не расходуется');
    }
    D.rerender();
  });

  /* спецпредложение */
  function openOfferEditor() {
    const o = X.offer;
    X.of = { format: o.format, text: o.text, until: o.until, was: o.on ? o.text : null };
    openSh('<div class="sheet-title">Спецпредложение</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      '<div class="field"><label>Формат</label><div class="chips" style="flex-wrap:wrap" data-of-fmt>' +
      OFFER_FORMATS.map(f => '<button class="chip' + (X.of.format === f ? ' on' : '') + '" data-act="exh-of-fmt" data-arg="' + esc(f) + '">' + esc(f) + '</button>').join('') + '</div></div>' +
      '<div class="field"><label for="oftext">Что получит участник</label>' +
      '<textarea class="textarea" id="oftext" rows="3" maxlength="200" data-of-text placeholder="Например: карта процессов склада за 30 минут на стенде">' + esc(X.of.text) + '</textarea>' +
      '<div class="err-msg" data-of-err hidden></div></div>' +
      '<div class="field"><label>Срок</label><div class="chips" style="flex-wrap:wrap" data-of-terms>' +
      OFFER_TERMS.map(t => '<button class="chip' + (X.of.until === t ? ' on' : '') + '" data-act="exh-of-term" data-arg="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
      '<input class="input" data-of-until placeholder="или свой срок: сегодня до 18:00" value="' + (OFFER_TERMS.indexOf(X.of.until) < 0 ? esc(X.of.until) : '') + '"></div>' +
      '<div class="exh-cap">Как увидит участник</div><div data-of-pv>' + offerBox(X.of) + '</div>' +
      '<div class="exh-cap">Предложение необязательное. Новое или изменённое, оно уходит на проверку модератору; по окончании срока скрывается.</div></div>' +
      '<div class="exh-sheet-foot"><button class="btn btn-primary btn-block" data-act="exh-of-save">Отправить на проверку</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button></div>', { mount: wrap => {
        const ta = wrap.querySelector('[data-of-text]'), un = wrap.querySelector('[data-of-until]');
        const upd = () => { wrap.querySelector('[data-of-pv]').innerHTML = offerBox(X.of); };
        ta.addEventListener('input', () => { X.of.text = ta.value; ta.classList.remove('err'); wrap.querySelector('[data-of-err]').hidden = true; upd(); });
        un.addEventListener('input', () => {
          X.of.until = un.value.trim() || 'сегодня';
          wrap.querySelectorAll('[data-act="exh-of-term"]').forEach(b => b.classList.remove('on'));
          upd();
        });
      } });
  }
  D.action('exh-offer-edit', openOfferEditor);
  D.action('exh-of-fmt', el => {
    X.of.format = el.dataset.arg;
    document.querySelectorAll('.sheet [data-act="exh-of-fmt"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.of.format));
    const pv = document.querySelector('.sheet [data-of-pv]'); if (pv) pv.innerHTML = offerBox(X.of);
  });
  D.action('exh-of-term', el => {
    X.of.until = el.dataset.arg;
    document.querySelectorAll('.sheet [data-act="exh-of-term"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.of.until));
    const un = document.querySelector('.sheet [data-of-until]'); if (un) un.value = '';
    const pv = document.querySelector('.sheet [data-of-pv]'); if (pv) pv.innerHTML = offerBox(X.of);
  });
  D.action('exh-of-save', () => {
    const text = (X.of.text || '').trim();
    if (text.length < 10) {
      const e = document.querySelector('.sheet [data-of-err]'), t = document.querySelector('.sheet [data-of-text]');
      if (e) { e.hidden = false; e.textContent = 'Напишите, что получит участник (не короче 10 знаков)'; }
      if (t) t.classList.add('err');
      return;
    }
    const o = X.offer;
    Object.assign(o, { on: true, format: X.of.format, text, until: X.of.until || 'сегодня', status: 'review', reason: '' });
    o.hist.push([F.NOW.time, 'отправлено на проверку']);
    D.closeSheet(); D.toast('Предложение отправлено на проверку'); D.rerender();
  });
  D.action('exh-offer-off', () => {
    confirmSheet('Убрать спецпредложение?', [
      'Карточка решения останется опубликованной без предложения: оно необязательное.',
      'Позже предложение можно добавить снова, оно пройдёт проверку.'
    ], 'Убрать предложение', 'exh-offer-off-ok');
  });
  D.action('exh-offer-off-ok', () => {
    X.offer.on = false; X.offer.status = 'published'; X.offer.reason = '';
    X.offer.hist.push([F.NOW.time, 'убрано из карточки']);
    publishOffer();                                    /* снятие не требует проверки: из каталога предложение уходит сразу */
    D.closeSheet(); D.toast('Спецпредложение убрано из карточки'); D.rerender();
  });

  /* ---------- I8 Аналитика ---------- */
  /* Все числа считаются из списков кабинета (см. шапку файла): воронка из заявок и контактов, часы из времени получения контактов. */
  const FUNNEL = ['Показ карточки', 'Изучить', 'Запрос встречи', 'Встреча', 'Контакт'];
  const HOURS = ['10', '11', '12', '13', '14', '15', '16', '17'];
  const PERIOD_NAME = { today: 'Сегодня', yday: 'Вчера', all: 'Весь фестиваль' };
  /* медиана по экспонентам фестиваля (демо-числа, без названий компаний) */
  const MEDIAN = { today: [980, 71, 3, 1, 4], yday: [900, 66, 3, 2, 4], all: [1880, 137, 6, 3, 8] };
  const sum = a => a.reduce((s, v) => s + v, 0);
  const pct1 = x => x < 10 ? x.toFixed(1).replace('.', ',') : String(Math.round(x));
  const MINUS = '\u2212';
  const YDAY = '26.02';

  function analytics(key) {
    /* этап «Контакт» = число контактов периода из того же списка, что плитка I1, группы I2 и график по часам: после сохранения контакта растёт на 1 */
    const cs = allContacts();
    const tCs = cs.filter(c => c.day === F.NOW.day), yCs = cs.filter(c => c.day === YDAY);
    const tConf = F.EXH_REQUESTS.filter(r => decOf(r) === 'confirmed');
    const yConf = Y_REQ.filter(r => r.status === 'confirmed');
    const T = [IMPR_T, EXPL_T, F.EXH_REQUESTS.length, tConf.length, tCs.length];
    const Y = [IMPR_Y, EXPL_Y, Y_REQ.length, yConf.length, yCs.length];
    if (key === 'today') return { name: 'Сегодня, ' + F.NOW.day, funnel: T, cs: tCs, until: parseInt(F.NOW.time, 10) };
    if (key === 'yday') return { name: 'Вчера, ' + YDAY, funnel: Y, cs: yCs };
    return { name: 'Весь фестиваль', funnel: T.map((v, i) => v + Y[i]), cs: cs };
  }

  D.register('I8', {
    tab: 'H1',
    meta: {
      title: 'I8 · Аналитика',
      role: 'Экспонент, телефон',
      fr: ['FR-EXH-08', 'FR-ANL-02', 'FR-ANL-03', 'FR-ANL-05', 'FR-ANL-12'],
      ac: ['AC-ANL-10', 'AC-EXH-03', 'AC-EXH-06'],
      what: [
        'Воронка из пяти этапов: показ карточки, «Изучить», запрос встречи, встреча, контакт; полоса и доля от предыдущего этапа.',
        'Контакты по часам за выбранный период (сегодня, вчера, весь фестиваль) и час пика.',
        'Сравнение с медианой по экспонентам фестиваля по каждому этапу, без названий компаний.',
        'Выгрузка CSV и итогового отчёта PDF; записавшиеся на воркшопы для пакета «Премиум».'
      ],
      rules: [
        'Данные только по своей компании; медиана анонимна, группы меньше 5 человек в отчётах не показываются (FR-ANL-05).',
        'Числа считаются из списков кабинета: запросы встреч и встречи — из «Заявки», контакты по часам — из «Контакты»; они совпадают с главной и со списками.',
        'Этап «Контакт» воронки — все контакты периода (скан, визитка, встреча): число из того же списка, что на главной, в «Контакты» и в графике по часам, растёт на 1 после сохранения контакта; контакты в архиве («не актуально») не считаются.',
        'В выгрузке контакты с именами и профилем только по согласию участников (AC-EXH-06); везде употребляется термин «контакт» (FR-ANL-12).',
        'Все числа демонстрационные; период выбирается лентой чипов.'
      ],
      depends: ['FR-ANL-12 воронка по этапам', 'D-47 согласие участника', 'D-27 контактов без ограничения']
    },
    html() {
      const st = D.st('I8');
      st.period = st.period || 'today';
      const A = analytics(st.period), med = MEDIAN[st.period];
      const periods = Object.keys(PERIOD_NAME).map(k => '<button class="chip' + (st.period === k ? ' on' : '') + '" data-act="i8-period" data-arg="' + k + '">' + esc(PERIOD_NAME[k]) + '</button>').join('');
      const top = A.funnel[0];
      const funnel = A.funnel.map((v, i) => {
        const w = Math.max(3, v / top * 100);
        /* «Контакт» — все контакты периода (скан, визитка, встреча), от «Встречи» не зависит: процент от предыдущего этапа для него не считается */
        const cap = i === 0 ? 'начало воронки: все показы карточки'
          : i === 4 ? 'все контакты периода: те же, что на главной и в списке «Контакты»'
          : pct1(v / A.funnel[i - 1] * 100) + '% от этапа «' + FUNNEL[i - 1] + '»';
        return '<div class="exh-fn"><div class="exh-fn-top"><span>' + (i + 1) + '. ' + esc(FUNNEL[i]) + '</span><span class="n">' + num(v) + '</span></div>' +
          '<div class="exh-track" data-pct="' + w.toFixed(1) + '"><i style="width:' + w.toFixed(1) + '%"></i></div>' +
          '<div class="exh-fn-c">' + esc(cap) + '</div></div>';
      }).join('');

      /* контакты по часам: из времени получения контактов; сегодня — только прошедшие часы */
      const nSlots = A.until ? Math.max(1, A.until - 9) : HOURS.length;
      const hourly = HOURS.slice(0, nSlots).map(h => A.cs.filter(c => String(parseInt(c.time, 10)) === h).length);
      const total = sum(hourly);
      const W = 298, H = 132, maxV = Math.max(1, Math.max.apply(null, hourly)), bw = W / hourly.length, barW = Math.min(bw - 10, 46);
      const peakI = hourly.indexOf(Math.max.apply(null, hourly));
      const bars = hourly.map((v, i) => {
        const h = v / maxV * (H - 40), cx = i * bw + bw / 2;
        return (v ? '<rect class="bar' + (i === peakI ? '' : ' dim') + '" x="' + (cx - barW / 2).toFixed(1) + '" y="' + (H - 20 - h).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4"' + (i === peakI ? '' : ' style="fill:var(--accent-edge);opacity:.55"') + '/>' +
          '<text class="val" x="' + cx.toFixed(1) + '" y="' + (H - 24 - h).toFixed(1) + '" text-anchor="middle">' + v + '</text>' : '') +
          '<text class="lbl" x="' + cx.toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + HOURS[i] + ':00</text>';
      }).join('');
      const chart = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Контакты по часам">' + bars + '</svg>';
      const via = k => A.cs.filter(c => c.via === k).length;

      const cmp = A.funnel.map((v, i) => {
        const m = med[i], d = Math.round((v - m) / m * 100), mx = Math.max(v, m);
        const dTxt = d === 0 ? 'на уровне медианы' : (d > 0 ? '+' : MINUS) + Math.abs(d) + '%';
        return '<div class="exh-cmp"><div class="exh-cmp-h"><span>' + esc(FUNNEL[i]) + '</span><span class="exh-cmp-d' + (d < 0 ? ' neg' : d === 0 ? ' eq' : '') + '">' + dTxt + '</span></div>' +
          '<div class="exh-cmp-b"><span class="k">вы</span><div class="exh-track"><i style="width:' + (v / mx * 100).toFixed(1) + '%"></i></div><span class="n">' + num(v) + '</span></div>' +
          '<div class="exh-cmp-b"><span class="k">медиана</span><div class="exh-track"><i class="m" style="width:' + (m / mx * 100).toFixed(1) + '%"></i></div><span class="n">' + num(m) + '</span></div></div>';
      }).join('');

      const p = curPack();
      let ws = '';
      if (p.workshops) {
        const day = st.period === 'today' ? F.NOW.day : st.period === 'yday' ? YDAY : null;
        const kts = (F.KIPATALK || []).filter(k => k.ex === EXID && (!day || k.day === day) && (day || k.day <= F.NOW.day));
        ws = '<div class="exh-ttl">Воркшопы</div><div class="card" style="padding:2px 16px"><div class="list">' +
          (kts.length ? kts.map(k => '<div class="row"><div class="grow"><div class="r-title">' + esc(k.day) + ' · ' + esc(k.time) + '</div>' +
            '<div class="r-sub">' + esc(k.title) + '</div><div class="r-sub">Записались: ' + k.signed + ' из ' + k.cap + '</div></div></div>').join('')
            : '<div class="exh-cap" style="padding:10px 0">В этот период воркшопов не было.</div>') +
          '</div></div>';
      }

      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: esc(F.EXH.company), title: 'Аналитика', sub: 'Воронка и контакты по часам',
          actions: '<button class="btn btn-secondary btn-sm" data-act="exh-exp">' + icon('download') + 'Выгрузить</button>',
          paren: paren('демонстрационные данные · сравнение без названий компаний') }) +
        '<div class="chip-rail">' + periods + '</div>' + BODY +
        '<div class="card"><div class="exh-ttl" style="margin:0">Воронка<span class="n">' + esc(A.name) + '</span></div>' + funnel +
        '<div class="exh-cap">«Контакт» — все контакты периода: сканирование, визитки и встречи. Их число то же, что на главной и в списке «Контакты».</div></div>' +
        '<div class="card"><div class="exh-ttl" style="margin:0">Контакты по часам<span class="n">всего ' + total + '</span></div>' + chart +
        '<div class="exh-cap">' + (total ? 'Пик: ' + HOURS[peakI] + ':00, ' + pl(hourly[peakI], ['контакт', 'контакта', 'контактов']) + '. ' : '') + 'Контактов за период: ' + total +
        ' — сканирование ' + via('скан') + ', визитки ' + via('визитка') + ', встречи ' + via('встреча') + '.' +
        (A.until ? ' Сегодня показаны часы до ' + F.NOW.time + '.' : '') + '</div></div>' +
        '<div class="card"><div class="exh-ttl" style="margin:0">Сравнение с медианой</div>' + cmp +
        '<div class="exh-cap" style="margin-top:6px">Медиана — типичное значение по экспонентам фестиваля, без названий компаний. Группы меньше 5 человек не показываются.</div></div>' +
        ws +
        '<div class="banner info">' + icon('info') + '<div class="cap">Итоговый отчёт PDF формируется на следующий день после события. Контакты с именами попадают в выгрузку только по согласию участников.</div></div>' +
        END;
    }
  });
  D.action('i8-period', el => { D.st('I8').period = el.dataset.arg; D.rerender(); });

  /* выгрузка: лист с форматом, составом файла и кнопкой */
  D.action('exh-exp', () => {
    X.expFmt = X.expFmt || 'CSV';
    const body = fmt => '<div class="chips">' + ['CSV', 'PDF'].map(f => '<button class="chip' + (fmt === f ? ' on' : '') + '" data-act="exh-exp-fmt" data-arg="' + f + '">' + f + '</button>').join('') + '</div>' +
      '<ul class="exh-rules"><li>' + (fmt === 'CSV' ? 'Воронка по этапам и контакты по часам за выбранный период; контакты построчно.' : 'Итоговый отчёт: воронка, контакты по часам, сравнение с медианой, воркшопы.') + '</li>' +
      '<li>Имена и профиль участников только тех, кто дал согласие на передачу контактов при сканировании.</li>' +
      '<li>Журнал выгрузки хранит, кто и когда скачал файл.</li></ul>' +
      '<button class="btn btn-primary btn-block" data-act="exh-exp-go">' + icon('download') + 'Скачать ' + fmt + '</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>';
    openSh('<div class="sheet-title">Выгрузка</div><div data-exp>' + body(X.expFmt) + '</div>');
    X.expBody = body;
  });
  D.action('exh-exp-fmt', el => {
    X.expFmt = el.dataset.arg;
    const h = document.querySelector('.sheet [data-exp]');
    if (h && X.expBody) h.innerHTML = X.expBody(X.expFmt);
  });
  D.action('exh-exp-go', () => { D.closeSheet(); D.toast('Файл ' + X.expFmt + ' подготовлен. Скачивание в демо не выполняется'); });

  /* ---------- I2 Контакты ---------- */
  const companyIdByName = name => { const c = (F.COMPANIES || []).find(x => x.name === name); return c ? c.id : null; };
  const heatTag = h => '<span class="heat ' + h + '">' + HEAT[h] + '</span>';

  D.register('I2', {
    tab: 'H1',
    meta: {
      title: 'I2 · Контакты',
      role: 'Представитель экспонента, телефон',
      fr: ['FR-EXH-06', 'FR-LEAD-04', 'FR-LEAD-07', 'FR-ANL-12'],
      ac: ['AC-EXH-04', 'AC-EXH-06', 'AC-LEAD-03', 'AC-LEAD-05'],
      what: [
        'Все контакты, полученные на стенде, сканированием и после встреч; сгруппированы по дню получения, у группы число (совпадает с главной и аналитикой); контактов без ограничения во всех пакетах.',
        'Метка температуры (горячий, тёплый, холодный), этап воронки и следующий шаг по каждому контакту; фильтр по метке.',
        'Выгрузка CSV с подтверждением в листе; контакты, сохранённые сканером, появляются в списке сразу.',
        'Контакты на этапе «не актуально» уходят в архив: фильтр «В архиве» показывает их отдельно, в счётчиках кабинета их нет; из карточки контакт можно вернуть или убрать.'
      ],
      rules: [
        'Контакт появляется после сканирования или встречи, поля профиля — по настройкам видимости участника (D-47).',
        'Повторное сканирование не создаёт второй контакт, а обновляет карточку и историю касаний.',
        'Выгрузка содержит только поля, на которые участник дал согласие; каждая выгрузка пишется в журнал.'
      ],
      depends: ['D-47 уровни видимости', 'D-27 контактов без ограничения']
    },
    html() {
      const st = D.st('I2');
      st.f = st.f || 'all';
      const all = allContacts(), arch = archivedContacts();
      if (st.f === 'arch' && !arch.length) st.f = 'all';
      const list = st.f === 'arch' ? arch : st.f === 'all' ? all : all.filter(c => c.heat === st.f);
      const cnt = k => k === 'arch' ? arch.length : k === 'all' ? all.length : all.filter(c => c.heat === k).length;
      /* «В архиве» — контакты с этапом «не актуально»: в общих счётчиках их нет, чип показывается, пока они есть */
      const chips = Object.keys(HEAT_FILTERS).filter(k => k !== 'arch' || arch.length).map(k => '<button class="chip' + (st.f === k ? ' on' : '') + '" data-act="i2-filter" data-arg="' + k + '">' + HEAT_FILTERS[k] + ' · ' + cnt(k) + '</button>').join('');
      const row = c => '<button class="card interactive exh-contact" data-go="I3/' + c.id + '"><div class="exh-crow">' + avatar(c.name, 'sm') +
        '<div class="grow"><div class="r-title">' + esc(c.name) + '</div><div class="r-sub">' + esc(c.company) + ' · ' + esc(c.role) + '</div>' +
        '<div class="exh-cap" style="margin-top:4px">' + esc(c.note || 'без заметки') + '</div>' +
        '<div class="exh-cap">Этап: ' + esc(stageOf(c)) + ' · шаг: ' + esc(c.step) + (c.time ? ' · ' + esc(c.time) : '') + '</div></div>' + heatTag(c.heat) + '</div></button>';
      /* группы по дню получения: заголовок с числом, как плитка на главной и график в аналитике; новые сверху */
      const groups = [[F.NOW.day, 'Сегодня, ' + F.NOW.day], ['26.02', 'Вчера, 26.02']].map(g => {
        const cs = list.filter(c => c.day === g[0]).sort((a, b) => a.time < b.time ? 1 : -1);
        return cs.length ? '<div class="exh-ttl">' + g[1] + '<span class="n">' + cs.length + '</span></div>' + cs.map(row).join('') : '';
      }).join('');
      const todayAll = all.filter(c => c.day === F.NOW.day).length;
      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: esc(F.EXH.company), title: 'Контакты',
          sub: st.f === 'arch' ? 'В архиве: ' + arch.length + ' · в счётчики не входят' : 'Показано ' + list.length + ' из ' + all.length + ' · сегодня ' + todayAll +
            (arch.length ? ' · в архиве ' + arch.length : ''),
          actions: '<button class="btn btn-secondary btn-sm" data-act="i2-export">' + icon('download') + 'Выгрузить CSV</button><button class="btn btn-secondary btn-sm" data-go="J1">' + icon('scan') + 'Сканер</button>',
          paren: paren('контактов без ограничения · поля по согласию участника') }) +
        '<div class="chip-rail">' + chips + '</div>' + BODY +
        (groups || '<div class="empty">' + icon('people') + '<div class="e-title">Здесь пока никого</div><div class="e-text">В этой группе нет контактов. Смените метку в карточке контакта или выберите «Все».</div></div>') +
        END;
    }
  });
  D.action('i2-filter', el => { D.st('I2').f = el.dataset.arg; D.rerender(); });
  D.action('i2-export', () => confirmSheet('Выгрузить контакты в CSV?', [
    'В файл попадут ' + pl(allContacts().length, ['контакт', 'контакта', 'контактов']) + ' с метками, этапами и заметками.',
    'Имя, компания и профиль участника только по его согласию на передачу контактов.',
    'Выгрузка запишется в журнал: кто и когда скачал файл.'
  ], 'Скачать CSV', 'i2-export-ok'));
  D.action('i2-export-ok', () => { D.closeSheet(); D.toast('CSV с контактами подготовлен. Скачивание в демо не выполняется'); });

  /* ---------- I3 Карточка контакта ---------- */
  const HIST = {
    c1: [['26.02, 15:10', 'Скан QR-визитки на стенде А-12'], ['27.02, 09:30', 'Заявка на встречу подтверждена'], ['27.02, 14:00', 'Встреча на стенде (в плане)']],
    c2: [['26.02, 17:20', 'Заявка приглашённого покупателя принята автоматически'], ['26.02, 18:00', 'Встреча состоялась']],
    c3: [['26.02, 15:00', 'Встреча на стенде А-12 состоялась'], ['26.02, 15:40', 'Заметка добавлена: CRM и WMS связка']],
    c4: [['27.02, 10:20', 'Скан QR-визитки на стенде А-12'], ['27.02, 10:25', 'Заявка на встречу в 16:30 ждёт ответа'], ['27.02, 10:40', 'Заметка добавлена']],
    c5: [['26.02, 14:25', 'Скан QR-визитки на стенде А-12'], ['26.02, 14:30', 'Заметка добавлена: спрашивала про цену']],
    c6: [['26.02, 11:40', 'Визитка оставлена на стенде']],
    c7: [['27.02, 10:35', 'Скан QR-визитки на стенде А-12'], ['27.02, 10:40', 'Заметка добавлена: транспортный склад']],
    c8: [['27.02, 10:50', 'Визитка оставлена на стенде'], ['27.02, 10:55', 'Заметка добавлена: два склада']],
    c9: [['27.02, 11:00', 'Скан QR-визитки на стенде А-12']],
    c10: [['27.02, 11:05', 'Скан QR-визитки на стенде А-12']]
  };

  D.register('I3', {
    tab: 'H1',
    meta: {
      title: 'I3 · Карточка контакта',
      role: 'Представитель экспонента',
      fr: ['FR-EXH-06', 'FR-LEAD-03', 'FR-LEAD-04', 'FR-ANL-12'],
      ac: ['AC-EXH-04', 'AC-LEAD-03', 'AC-EXH-03'],
      what: [
        'Карточка контакта: имя, компания, должность, метка температуры, заметка и следующий шаг.',
        'Этап воронки: новый, контакт, встреча, предложение, договорённость, не актуально; у каждого контакта свой.',
        'История касаний: скан, встречи, заметки; переходы в карточку участника и компании; «Предложить встречу» ведёт в форму заявки, в существующую встречу или к «Что можно сделать», если общих окон нет.',
        '«Убрать из контактов» (лист подтверждения) удаляет ошибочно сохранённый контакт; «Вернуть в контакты» возвращает контакт из архива.'
      ],
      rules: [
        'Этап меняет представитель; изменения сохраняются и в офлайне, синхронизируются при подключении.',
        '«Не актуально» убирает контакт из рабочих списков и счётчиков (контакт в архиве, фильтр «В архиве» в «Контакты»), данные хранятся.',
        'Повторный скан обновляет карточку и историю, второй контакт не создаётся.'
      ],
      depends: ['D-47 согласие участника', 'FR-EXH-06 воронка контактов']
    },
    html(ctx) {
      const all = rawContacts();
      /* без параметра — первый контакт списка; с неизвестным — «не найдено», а не чужая карточка */
      const c = ctx.param ? all.find(x => x.id === ctx.param) : (allContacts()[0] || null);
      if (!c) return notFoundHtml('I2', 'Контакт', ctx.param ? 'Контакт не найден' : 'Контактов пока нет',
        ctx.param ? 'Такого контакта нет в списке: его могли убрать. Откройте контакт из списка «Контакты».' : 'Сохраните первый контакт сканером на стенде.', 'К контактам');
      const stage = stageOf(c), arch = isArch(c);
      const stages = F.FUNNEL_STAGES;
      const p = personByName(c.name), co = companyIdByName(c.company);
      const hist = HIST[c.id] || [[(c.day || F.NOW.day) + ', ' + (c.time || F.NOW.time), 'Контакт получен: ' + (c.via || c.source || 'скан')]];
      const stageBtns = stages.map(s => '<button class="chip' + (stage === s ? ' on' : '') + '" data-act="i3-stage" data-arg="' + c.id + ':' + esc(s) + '">' + esc(s) + '</button>').join('');
      const heats = Object.keys(HEAT).map(h => '<button class="chip' + (c.heat === h ? ' on' : '') + '" data-act="i3-heat" data-arg="' + c.id + ':' + h + '">' + HEAT[h] + '</button>').join('');
      /* следующий шаг — те же значения, что в J4 («Записать итог»); шаг из фикстуры, которого нет в списке, показывается первым выбранным */
      const curStep = c.step === '—' ? 'ничего' : c.step;
      const stepList = STEPS.indexOf(curStep) >= 0 ? STEPS : [curStep].concat(STEPS);
      const stepBtns = stepList.map(s => '<button class="chip' + (curStep === s ? ' on' : '') + '" data-act="i3-step" data-arg="' + c.id + ':' + esc(s) + '">' + esc(s) + '</button>').join('');
      return '<div class="scr exh">' +
        D.head({ back: 'I2', eyebrow: arch ? 'Контакт в архиве' : 'Контакт', title: esc(c.name), sub: esc(c.company) + ' · ' + esc(c.role), paren: paren('этап и метку выбираете вы') }) +
        BODY +
        (arch ? '<div class="banner warn">' + icon('lock') + '<div style="flex:1"><div class="b-title">Контакт в архиве</div><div class="cap">Контакт скрыт из рабочих списков и счётчиков, данные сохранены. Выберите другой этап или верните контакт в список.</div>' +
          '<div class="exh-acts"><button class="btn btn-secondary btn-sm" data-act="i3-restore" data-arg="' + c.id + '">Вернуть в контакты</button></div></div></div>' : '') +
        '<div class="exh-wrap">' + (p ? '<button class="btn btn-secondary btn-sm" data-go="F2/' + p.id + '">Карточка участника</button>' : '') +
        (co ? '<button class="btn btn-secondary btn-sm" data-go="F12/' + co + '">Компания</button>' : '') +
        meetBtn(p, 'btn-secondary btn-sm') + '</div>' + meetNote(p) +
        '<div class="card"><div class="exh-cap">Метка температуры</div><div class="chips">' + heats + '</div></div>' +
        '<div class="card"><div class="exh-cap">Следующий шаг</div><div class="exh-wrap">' + stepBtns + '</div></div>' +
        '<div class="card"><div class="field"><label for="i3note">Заметка</label>' +
        '<textarea class="textarea" id="i3note" rows="3" data-i3note="' + c.id + '" placeholder="Что обсудили, что важно запомнить">' + esc(c.note || '') + '</textarea></div>' +
        '<button class="btn btn-primary btn-block" data-act="i3-save" data-arg="' + c.id + '">Сохранить заметку</button></div>' +
        '<div class="card"><div class="exh-cap">Этап воронки: ' + esc(stage) + '</div><div class="exh-wrap">' + stageBtns + '</div>' +
        (arch ? '<div class="exh-cap">Контакт скрыт из рабочих списков и счётчиков, данные сохранены (в архиве).</div>' : '') + '</div>' +
        '<div class="card exh-hist"><div class="exh-cap">История касаний</div>' +
        hist.map(h => '<div class="feed-item"><span class="feed-kind"></span><div><div class="feed-text">' + esc(h[1]) + '</div><div class="feed-time">' + esc(h[0]) + '</div></div></div>').join('') + '</div>' +
        '<button class="btn btn-secondary btn-block" data-go="J1">' + icon('scan') + 'Сканировать следующего</button>' +
        '<button class="exh-lnk exh-danger" data-act="i3-del" data-arg="' + c.id + '">Убрать из контактов</button>' +
        END;
    },
    mount(host) {
      host.querySelectorAll('[data-i3note]').forEach(el => el.addEventListener('input', () => {
        const e = X.edits[el.dataset.i3note] = X.edits[el.dataset.i3note] || {};
        e.note = el.value;
      }));
    }
  });
  D.action('i3-stage', el => {
    const [id, s] = el.dataset.arg.split(':');
    X.stage[id] = s;
    D.toast(s === ARCH ? 'Контакт в архиве: скрыт из списка и счётчиков' : 'Этап: ' + s);
    D.rerender();
  });
  D.action('i3-restore', el => { restoreContact(el.dataset.arg); D.toast('Контакт возвращён в список: этап «новый»'); D.rerender(); });
  /* удаление — действие с потерей данных, поэтому лист подтверждения (сохранение контакта без листа допустимо именно потому, что обратимо) */
  function askRemove(id, after) {
    const c = contactById(id);
    if (!c) return;
    X.delAfter = after;
    confirmSheet('Убрать из контактов?', [
      c.name + ' исчезнет из списка «Контакты» и из всех счётчиков, метки и заметка удалятся.',
      'Участник об этом не узнает; скан остаётся в журнале сканирований.',
      'Контакт можно сохранить снова, повторно отсканировав визитку.'
    ], 'Убрать из контактов', 'exh-del-ok', id);
  }
  D.action('i3-del', el => askRemove(el.dataset.arg, 'I2'));
  D.action('exh-del', el => askRemove(el.dataset.arg, ''));
  D.action('exh-del-ok', el => {
    const c = contactById(el.dataset.arg), after = X.delAfter;
    if (!c) { D.closeSheet(); return; }
    removeContact(c.id);
    delete X.edits[c.id]; delete X.stage[c.id];
    D.closeSheet();
    D.toast('Контакт убран: ' + c.name);
    if (after) location.hash = '#/' + after; else D.rerender();
  });
  D.action('i3-heat', el => { const [id, h] = el.dataset.arg.split(':'); (X.edits[id] = X.edits[id] || {}).heat = h; D.toast('Метка: ' + HEAT[h]); D.rerender(); });
  D.action('i3-step', el => {
    const i = el.dataset.arg.indexOf(':'), id = el.dataset.arg.slice(0, i), s = el.dataset.arg.slice(i + 1);
    (X.edits[id] = X.edits[id] || {}).step = s === 'ничего' ? '—' : s;
    D.toast('Шаг: ' + s); D.rerender();
  });
  D.action('i3-save', el => {
    const note = document.querySelector('[data-i3note]');
    const e = X.edits[el.dataset.arg] = X.edits[el.dataset.arg] || {};
    if (note) e.note = note.value;
    D.toast('Заметка сохранена'); D.rerender();
  });

  /* ---------- I5 Доступность ---------- */
  /* Окна на стенде сегодня: занятость по заявкам кабинета (I7), перерывы и КипяTALK. 12 окон с шагом 30 минут, как в F.windows */
  function windowState(label) {
    const dec = r => X.dec[r.id] || r.status;
    const reqs = F.EXH_REQUESTS;
    if (label === '12:30') return { s: 'lunch', note: 'обед' };
    if (label === '15:30' && curPack().workshops) return { s: 'lunch', note: 'КипяTALK' };
    for (let i = 0; i < reqs.length; i++) {
      const r = reqs[i], d = dec(r);
      /* предложенное экспонентом окно удержано за участником: для заявок оно занято, пока тот не ответит */
      if (d === 'counter' && X.counterAt && X.counterAt[r.id] === label) return { s: 'taken', note: 'занято', hint: 'предложено участнику' };
      if (r.time.slice(0, 5) === label) {
        if (d === 'confirmed') return { s: 'taken', note: 'занято' };
        if (d === 'pending') return { s: 'pend', note: 'ждёт ответа' };
      }
    }
    if (X.closed && X.closed[label]) return { s: 'closed', note: 'закрыто' };
    return { s: 'free', note: 'свободно' };
  }

  D.register('I5', {
    tab: 'H1',
    meta: {
      title: 'I5 · Доступность',
      role: 'Представитель экспонента',
      fr: ['FR-EXH-03', 'FR-MEET-02', 'FR-ACC-07'],
      ac: ['AC-EXH-01', 'AC-EXH-03'],
      what: [
        'Окна встреч на стенде на сегодня: свободно, занято, ждёт ответа, закрыто; обед и КипяTALK недоступны для заявок.',
        'Нажатие на свободное окно закрывает его для заявок, на закрытое открывает снова.',
        'Автопринятие заявок приглашённых покупателей (Hosted Buyer) и сводка обязательства по числу встреч.'
      ],
      rules: [
        'Длина окна 20, 30 или 60 минут по типу пространства; шаг сетки 30 минут.',
        'Автопринятие действует только для приглашённых покупателей; остальные заявки ждут решения в «Заявки».',
        'Изменение доступности не трогает уже подтверждённые встречи.'
      ],
      depends: ['FR-MEET-02 правила окон', 'FR-ACC-07 Hosted Buyer']
    },
    html() {
      const hb = F.HB;
      X.closed = X.closed || {};
      if (X.auto === undefined) X.auto = true;
      const wins = F.windows.map(w => ({ label: w.label, st: windowState(w.label) }));
      const free = wins.filter(w => w.st.s === 'free').length;
      const grid = wins.map(w => {
        const can = w.st.s === 'free' || w.st.s === 'closed';
        return '<button class="exh-win ' + w.st.s + '"' + (can ? ' data-act="i5-toggle" data-arg="' + w.label + '"' : ' disabled style="cursor:default"') + ' aria-label="Окно ' + w.label + ': ' + esc(w.st.note) + (w.st.hint ? ', ' + esc(w.st.hint) : '') + '">' +
          '<span class="t">' + w.label + '</span><span class="s">' + esc(w.st.note) + '</span></button>';
      }).join('');
      const ex = ['12:30 · обед команды: заявки не принимаются'];
      if (curPack().workshops) ex.push('15:30 · КипяTALK: круглый стол, заявки не принимаются');
      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: 'Кабинет экспонента', title: 'Доступность', sub: esc(F.EXH.company) + ' · стенд А-12 · сегодня', paren: paren('нажмите на окно, чтобы закрыть или открыть его') }) +
        BODY +
        '<div class="card"><div class="exh-ttl" style="margin:0">Окна на стенде<span class="n">свободно ' + free + ' из ' + wins.length + '</span></div>' +
        '<div class="exh-wins">' + grid + '</div>' +
        '<div class="exh-legend"><span><i></i>свободно</span><span><i class="taken"></i>занято</span><span><i class="pend"></i>ждёт ответа</span><span><i class="closed"></i>закрыто</span></div></div>' +
        '<div class="card"><div class="toggle-row" style="border:0;padding:0"><div style="flex:1;min-width:0"><label class="tr-title" for="i5auto" style="display:block;cursor:pointer">Автопринимать приглашённых покупателей</label>' +
        '<div class="tr-sub">только для приглашённых покупателей (Hosted Buyer); остальные заявки ждут решения</div></div>' +
        '<label class="toggle"><input type="checkbox" id="i5auto" data-i5auto' + (X.auto ? ' checked' : '') + '><span class="tr"></span></label></div></div>' +
        (X.auto ? '<div class="banner ok">' + icon('check') + '<div style="flex:1"><div class="b-title">Автопринятие включено</div>' +
          '<div class="cap">' + esc(hb.name) + ' (' + esc(hb.company) + '): заявки подтверждаются сразу. Проведено встреч: ' + hb.quota.done + ' из ' + hb.quota.total + ', осталось ' + hb.quota.left + '.</div></div></div>'
          : '<div class="banner">' + icon('info') + '<div class="cap">Автопринятие выключено: заявки приглашённых покупателей тоже ждут вашего решения.</div></div>') +
        '<div class="card"><div class="exh-cap">Исключения на сегодня</div><ul class="exh-rules">' + ex.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' +
        '<button class="btn btn-secondary btn-block" data-go="I7">Заявки на встречи</button>' +
        END;
    },
    mount(host) {
      const inp = host.querySelector('[data-i5auto]');
      if (inp) inp.addEventListener('change', () => {
        X.auto = inp.checked;
        D.toast(inp.checked ? 'Автопринятие включено' : 'Автопринятие выключено: заявки ждут ручного решения');
        D.rerender();
      });
    }
  });
  D.action('i5-toggle', el => {
    const l = el.dataset.arg;
    X.closed[l] = !X.closed[l];
    D.toast(X.closed[l] ? 'Окно ' + l + ' закрыто для заявок' : 'Окно ' + l + ' открыто'); D.rerender();
  });

  /* ---------- I6 Воркшоп ---------- */
  /* Окна воркшопа берутся из F.KIPATALK (так их видят участники в КипяTALK); состав записавшихся задан здесь по числу записавшихся.
     В фикстуре F.EXH_WORKSHOP окна и числа тоже вычисляются из KIPATALK. */
  const ROSTER = {
    '26.02': [F.ME.name, 'Марина Крылова', 'Сергей Лапин', 'Ольга Мартынова', 'Анна Соколова', 'Дмитрий Аврамов'],
    '27.02': ['Павел Гусев', 'Наталья Бурова', 'Артём Чайка', 'Елена Штерн', 'Михаил Орлов'],
    '28.02': ['Ксения Лобова', 'Роман Гладков', 'Софья Миллер']
  };
  const MOVE_REASONS = ['Конфликт со встречами на стенде', 'Нужен другой день', 'Другая причина'];

  D.register('I6', {
    tab: 'H1',
    meta: {
      title: 'I6 · Воркшоп',
      role: 'Экспонент «Премиум»',
      fr: ['FR-EXH-04', 'FR-EXPO-06', 'FR-EXH-09'],
      ac: ['AC-EXH-05', 'AC-EXH-01'],
      what: [
        'Три окна по 30 минут в роли спикера круглого стола на КипяTALK; запись участников и число свободных мест.',
        'Список записавшихся по каждому окну; запрос менеджеру на перенос окна с подтверждением в листе.',
        'Для пакетов «Экспо» и «Экспо+» — пустое состояние: воркшопы входят только в «Премиум».'
      ],
      rules: [
        'Воркшопы входят в «Премиум»: 3 окна по 30 минут, малые группы 8–10 человек (D-27).',
        'Окна делятся между проданными «Премиум» поровну по доступному времени круглых столов; менеджер Экспо подтверждает и может переставить окно.',
        'Запись закрывается на значении ёмкости; расписание и числа те же, что в разделе КипяTALK.'
      ],
      depends: ['D-27 воркшопы только в «Премиум»', 'D-40 название пакета']
    },
    html() {
      const p = curPack();
      const head = ptxt => '<div class="scr exh">' + D.head({ back: 'I1', eyebrow: 'Кабинет экспонента · ' + esc(p.name), title: 'Воркшоп', sub: esc(F.EXH.company), paren: paren(ptxt) });
      if (!p.workshops) {
        return head('входит только в пакет «Премиум»') + packSwitch(true) + BODY +
          '<div class="empty topo-host">' + D.topo() + icon('mic') + '<div class="e-title">Воркшопы входят в «Премиум»</div>' +
          '<div class="e-text">Три окна по 30 минут в роли спикера круглого стола назначаются только пакету «Премиум».</div>' +
          '<button class="btn btn-secondary btn-sm" data-go="I4">Пакеты и квота</button></div>' + END;
      }
      const kts = (F.KIPATALK || []).filter(k => k.ex === EXID);
      const cards = kts.map(k => {
        const key = k.day + ' ' + k.time, past = k.day < F.NOW.day;
        const names = ROSTER[k.day] || [];
        const left = k.cap - k.signed;
        const req = X.moveReq[key];
        return '<div class="card"><div class="card-row" style="justify-content:space-between"><div class="grow"><div class="r-title" style="font-size:15px">' + esc(k.day) + ' · ' + esc(k.time) + ' · ' + k.dur + ' минут</div>' +
          '<div class="r-sub">' + esc(k.title) + '</div><div class="r-sub">КипяTALK · экспо-зона Конгресс-центра</div></div>' +
          '<span class="exh-st ' + (past ? 'dim' : 'ok') + '">' + (past ? 'прошёл' : k.day === F.NOW.day ? 'сегодня' : 'впереди') + '</span></div>' +
          '<div class="exh-cap">Записались: ' + k.signed + ' из ' + k.cap + ' · ' + (left > 0 ? 'осталось ' + pl(left, ['место', 'места', 'мест']) : 'мест нет') + '</div>' +
          '<div class="exh-wrap">' + names.map(n => { const q = personByName(n); return q ? '<button class="chip" data-go="F2/' + q.id + '">' + esc(n) + '</button>' : '<span class="chip">' + esc(n) + '</span>'; }).join('') + '</div>' +
          (req ? '<div class="exh-cap">Запрос на перенос отправлен менеджеру: ' + esc(req) + '.</div>'
            : past ? '' : '<button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-act="i6-move" data-arg="' + esc(key) + '">Попросить перенос окна</button>') + '</div>';
      }).join('');
      return head('3 окна по 30 минут · малые группы 8–10 человек') + packSwitch(true) + BODY +
        '<div class="banner">' + icon('info') + '<div class="cap">Три окна по 30 минут на КипяTALK, по одному на каждый день. Тему и описание задаёте вы; время подтверждает менеджер Экспо и при необходимости предлагает другое.</div></div>' +
        '<div class="exh-ttl">Ваши окна</div>' + cards +
        '<button class="exh-lnk" data-go="H5">Расписание КипяTALK для участников' + icon('chevR') + '</button>' +
        END;
    }
  });
  D.action('i6-move', el => {
    const key = el.dataset.arg;
    X.moveKey = key; X.moveWhy = MOVE_REASONS[0];
    openSh('<div class="sheet-title">Перенос окна</div><div class="exh-cap" style="margin-bottom:10px">Окно ' + esc(key) + ' · запрос уйдёт менеджеру Экспо</div>' +
      '<div class="exh-wrap" data-mv>' + MOVE_REASONS.map((r, i) => '<button class="chip' + (i === 0 ? ' on' : '') + '" data-act="i6-why" data-arg="' + esc(r) + '">' + esc(r) + '</button>').join('') + '</div>' +
      '<ul class="exh-rules" style="margin-top:10px"><li>Менеджер подтверждает перенос и может предложить другое время.</li><li>Записавшиеся участники получат уведомление после решения.</li></ul>' +
      '<button class="btn btn-primary btn-block" data-act="i6-move-ok">Отправить менеджеру</button><button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('i6-why', el => {
    X.moveWhy = el.dataset.arg;
    document.querySelectorAll('.sheet [data-act="i6-why"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.moveWhy));
  });
  D.action('i6-move-ok', () => { X.moveReq[X.moveKey] = X.moveWhy; D.closeSheet(); D.toast('Запрос на перенос отправлен менеджеру'); D.rerender(); });

  /* ---------- I7 Заявки ---------- */
  D.register('I7', {
    tab: 'H1',
    meta: {
      title: 'I7 · Заявки',
      role: 'Представитель экспонента',
      fr: ['FR-EXH-05', 'FR-EXH-03', 'FR-ACC-07'],
      ac: ['AC-EXH-03'],
      what: [
        'Входящие заявки на встречи у стенда: кто, когда, где; решение по кнопке с подтверждением в листе.',
        'Действия: принять, предложить другое время, отклонить с причиной.',
        'Сводка по заявкам: подтверждено, ждут ответа, другое время, отклонено.'
      ],
      rules: [
        'Заявки приглашённых покупателей подтверждаются автоматически, если включено автопринятие (раздел «Доступность»).',
        'Обычные заявки ждут решения; решение уходит участнику уведомлением, поэтому подтверждается в листе.',
        'Отклонённая заявка не удаляется: остаётся в списке с отметкой и причиной, которую получил участник.',
        'Предложенное другое время остаётся за участником: окно на «Доступность» занято, на главной у заявки новое время.'
      ],
      depends: ['FR-EXH-05 заявки', 'FR-ACC-07 Hosted Buyer']
    },
    html() {
      const stMap = { confirmed: 'подтверждена', pending: 'ждёт ответа', declined: 'отклонена', counter: 'другое время' };
      const stCls = { confirmed: 'ok', pending: 'wait', declined: 'err', counter: 'wait' };
      const cnt = { confirmed: 0, pending: 0, declined: 0, counter: 0 };
      const rows = F.EXH_REQUESTS.slice().sort((a, b) => a.time < b.time ? -1 : 1).map(r => {
        const s = X.dec[r.id] || r.status;
        cnt[s]++;
        const time = reqTime(r);
        return '<div class="card exh-req"><div class="exh-req-h">' + whoBtn(r.who, esc(r.company)) + '<span class="exh-st ' + stCls[s] + '">' + stMap[s] + '</span></div>' +
          '<div class="exh-cap">' + esc(time) + ' · ' + esc(r.space) + (s === 'counter' ? ' · вы предложили новое время' : '') + '</div>' +
          (s === 'declined' && X.why[r.id] ? '<div class="exh-cap">Причина, которую получил участник: ' + esc(X.why[r.id]) + '</div>' : '') +
          (s === 'pending' ? '<div class="exh-req-acts"><button class="btn btn-primary btn-sm" data-act="i7-ask" data-arg="' + r.id + ':confirmed">Принять</button>' +
            '<button class="btn btn-secondary btn-sm" data-act="i7-ask" data-arg="' + r.id + ':counter">Другое время</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="i7-ask" data-arg="' + r.id + ':declined">Отклонить</button></div>' : '') + '</div>';
      }).join('');
      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: 'Кабинет экспонента', title: 'Заявки', sub: 'Входящие запросы на встречу у стенда', paren: paren('ответ уйдёт участнику после вашего подтверждения') }) +
        BODY +
        '<div class="banner info">' + icon('info') + '<div class="cap">Подтверждено: ' + cnt.confirmed + ' · ждут ответа: ' + cnt.pending + ' · другое время: ' + cnt.counter + ' · отклонено: ' + cnt.declined + '.' +
        (X.auto === false ? ' Автопринятие выключено.' : ' Заявки приглашённых покупателей принимаются автоматически.') + '</div></div>' +
        rows +
        '<button class="btn btn-secondary btn-block" data-go="I5">Окна встреч на стенде</button>' +
        END;
    }
  });
  D.action('i7-ask', el => {
    const [id, a] = el.dataset.arg.split(':');
    const r = F.EXH_REQUESTS.find(x => x.id === id);
    if (!r) return;
    X.req = { id, a, time: null, why: 'Не подходит время' };
    if (a === 'confirmed') {
      confirmSheet('Принять встречу?', [r.who + ' получит подтверждение: ' + r.time + ', ' + r.space + '.', 'Окно на стенде станет занятым.'], 'Принять встречу', 'i7-ok');
    } else if (a === 'declined') {
      openSh('<div class="sheet-title">Отклонить заявку?</div><div class="exh-cap" style="margin-bottom:10px">' + esc(r.who) + ' получит отказ с причиной.</div>' +
        '<div class="exh-wrap">' + ['Не подходит время', 'Не целевой запрос', 'Нет свободных представителей'].map((w, i) =>
          '<button class="chip' + (i === 0 ? ' on' : '') + '" data-act="i7-why" data-arg="' + esc(w) + '">' + esc(w) + '</button>').join('') + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="i7-ok">Отклонить заявку</button><button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
    } else {
      const free = F.windows.map(w => w.label).filter(l => windowState(l).s === 'free').slice(0, 6);
      X.req.time = free[0] || null;
      openSh('<div class="sheet-title">Другое время</div><div class="exh-cap" style="margin-bottom:10px">Свободные окна на стенде сегодня. ' + esc(r.who) + ' выберет сам.</div>' +
        (free.length ? '<div class="exh-wrap">' + free.map((l, i) => '<button class="chip' + (i === 0 ? ' on' : '') + '" data-act="i7-time" data-arg="' + l + '">' + l + '</button>').join('') + '</div>'
          : '<div class="exh-cap">Свободных окон нет: откройте окна в «Доступность».</div>') +
        '<button class="btn btn-primary btn-block"' + (free.length ? ' data-act="i7-ok"' : ' disabled') + '>Предложить время</button><button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
    }
  });
  D.action('i7-why', el => {
    X.req.why = el.dataset.arg;
    document.querySelectorAll('.sheet [data-act="i7-why"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.req.why));
  });
  D.action('i7-time', el => {
    X.req.time = el.dataset.arg;
    document.querySelectorAll('.sheet [data-act="i7-time"]').forEach(b => b.classList.toggle('on', b.dataset.arg === X.req.time));
  });
  D.action('i7-ok', () => {
    const q = X.req;
    if (!q) return;
    X.dec[q.id] = q.a;
    if (q.a === 'declined') X.why[q.id] = q.why;
    if (q.a === 'counter') {
      X.counter = X.counter || {}; X.counterAt = X.counterAt || {};
      const end = F.PPL && F.PPL.endOf ? F.PPL.endOf(q.time, 30) : q.time;
      X.counter[q.id] = q.time + '–' + end; X.counterAt[q.id] = q.time;
    }
    D.closeSheet();
    D.toast(q.a === 'confirmed' ? 'Встреча подтверждена: участник уведомлён' : q.a === 'declined' ? 'Заявка отклонена: участник получил причину' : 'Другое время предложено: ' + q.time);
    D.rerender();
  });

  /* ---------- I9 Карточка решения (редактор) ---------- */
  D.register('I9', {
    tab: 'H1',
    meta: {
      title: 'I9 · Карточка решения (редактор)',
      role: 'Администратор экспонента',
      fr: ['FR-EXH-01', 'FR-EXH-11', 'FR-EXPO-02', 'FR-EXPO-14'],
      ac: ['AC-EXH-02', 'AC-EXH-08', 'AC-EXPO-11'],
      what: [
        'Редактор карточки решения: решение, описание, для кого, кейсы, контактное лицо; спецпредложение ведёт в «Мои посты и предложения».',
        'Замечание модерации и состояние карточки: опубликована, на проверке, возвращена.',
        'Предпросмотр, как карточку видит участник, и отправка правок на проверку с подтверждением в листе.'
      ],
      rules: [
        'Карточка появляется в каталоге после одобрения менеджера Экспо; правки опубликованной карточки уходят на повторную проверку.',
        'Обязательные поля: решение, описание, контактное лицо стенда.',
        'После «Одобрил» решение, описание и «Для кого» обновляются в карточке решения (H2) и в каталоге (H1); до решения модератора участники видят прежнюю версию.',
        'Плашек проверки экспонента в карточке нет; в предпросмотре показан дисклеймер об ответственности за сделки (D-39).'
      ],
      depends: ['D-39 дисклеймер и без плашек проверки', 'D-40 спецпредложение']
    },
    html() {
      const ex = F.exhibitor(EXID) || {}, ee = (F.exExt && F.exExt(EXID)) || {};
      const c = X.card, p = curPack();
      const val = (k, d) => c[k] != null ? c[k] : d;
      const cases = [ex.cases].concat(ee.casesMore || []).filter(Boolean);
      const o = X.offer;
      const stHtml = c.status === 'review' ? stChip('review') : c.status === 'returned' ? stChip('returned') : '<span class="exh-st ok">' + icon('check') + 'опубликована</span>';
      return '<div class="scr exh">' +
        D.head({ back: 'I1', eyebrow: 'Кабинет экспонента', title: 'Карточка решения', sub: esc(F.EXH.company) + ' · ' + esc(p.name), paren: paren('правки уходят на повторную проверку') }) +
        BODY +
        '<div class="card-row" style="justify-content:space-between"><span class="exh-cap">Состояние карточки</span>' + stHtml + '</div>' +
        '<div class="card"><div class="field"><label for="i9sol">Решение</label><input class="input" id="i9sol" data-i9="solution" value="' + esc(val('solution', ex.what || '')) + '"></div>' +
        '<div class="field"><label for="i9desc">Описание</label><textarea class="textarea" id="i9desc" rows="3" data-i9="desc">' + esc(val('desc', ex.desc || '')) + '</textarea></div>' +
        '<div class="field"><label for="i9for">Для кого</label><textarea class="textarea" id="i9for" rows="3" data-i9="forWhom">' + esc(val('forWhom', ee.forWhom || '')) + '</textarea></div></div>' +
        '<div class="card"><div class="exh-cap">Кейсы</div>' + cases.map(t => '<div class="r-sub" style="font-size:13.5px;color:var(--ink)">' + esc(t) + '</div>').join('') + '</div>' +
        '<div class="card"><div class="exh-cap">Контактное лицо стенда</div>' + whoBtn((ee.reps && ee.reps[0] && ee.reps[0].name) || 'Ольга Рябова', 'представитель · видят участники по правам') + '</div>' +
        '<div class="card"><div class="card-row" style="justify-content:space-between"><div class="exh-cap">Спецпредложение участникам</div>' + (o.on ? stChip(o.status) : '<span class="exh-st dim">нет</span>') + '</div>' +
        '<div class="r-sub" style="font-size:13.5px;color:var(--ink)">' + (o.on ? esc(o.text) + ' · срок: ' + esc(o.until) : 'Необязательное: карточка публикуется и без него.') + '</div>' +
        '<button class="exh-lnk" data-go="I10">Изменить в «Мои посты и предложения»' + icon('chevR') + '</button></div>' +
        (c.status === 'returned' ? '<div class="exh-reason"><b>Замечание модерации</b>' + esc(c.reason) + '</div>'
          : c.status === 'review' ? '<div class="banner info">' + icon('info') + '<div class="cap">Правки на проверке у менеджера Экспо. Участники видят прежнюю версию.</div></div>'
          : '<div class="banner warn">' + icon('alert') + '<div style="flex:1"><div class="b-title">Замечания модерации · 1</div><div class="cap">Уточните срок внедрения в описании.</div></div></div>') +
        (c.status === 'review' ? modRow('card') : '') +
        '<div class="exh-acts"><button class="btn btn-secondary" style="flex:1" data-act="i9-preview">Предпросмотр</button>' +
        '<button class="btn btn-primary" style="flex:1" data-act="i9-send"' + (c.status === 'review' ? ' disabled' : '') + '>На проверку</button></div>' +
        END;
    },
    mount(host) {
      host.querySelectorAll('[data-i9]').forEach(el => el.addEventListener('input', () => { X.card[el.dataset.i9] = el.value; }));
    }
  });
  D.action('i9-preview', () => {
    const ex = F.exhibitor(EXID) || {}, ee = (F.exExt && F.exExt(EXID)) || {}, c = X.card, o = X.offer;
    openSh('<div class="sheet-title">Как видит участник</div>' +
      '<div class="exh-pv"><div class="exh-pv-h">' + avatar('Техно Склад', 'sm') + '<div class="who"><b>' + esc(F.EXH.company) + '</b><span>' + esc(c.solution != null ? c.solution : ex.what) + '</span></div></div>' +
      '<div class="exh-pv-t">' + esc(c.desc != null ? c.desc : ex.desc) + '</div>' +
      '<div class="exh-cap">Для кого: ' + esc(c.forWhom != null ? c.forWhom : ee.forWhom || '') + '</div>' +
      (o.on && o.status !== 'review' ? offerBox(o) : '') +
      '<div class="exh-cap">Стенд: ' + esc(ex.stand || '') + '</div></div>' +
      '<div class="exh-cap" style="margin-top:10px">Сделки заключаются участниками самостоятельно, организаторы не отвечают за сделки.</div>' +
      '<button class="btn btn-secondary btn-block" data-go="H2/' + EXID + '">Открыть карточку в каталоге</button>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Закрыть</button>');
  });
  D.action('i9-send', () => {
    /* обязательные поля: решение и описание (контактное лицо стенда задано владельцем) */
    const ex = catalogEx() || {}, c = X.card;
    const sol = (c.solution != null ? c.solution : ex.what || '').trim(), desc = (c.desc != null ? c.desc : ex.desc || '').trim();
    if (!sol || !desc) {
      const bad = [!sol ? 'решение' : '', !desc ? 'описание' : ''].filter(Boolean).join(' и ');
      document.querySelectorAll('[data-i9="solution"],[data-i9="desc"]').forEach(el => el.classList.toggle('err', !el.value.trim()));
      D.toast('Заполните обязательные поля: ' + bad);
      return;
    }
    confirmSheet('Отправить правки на проверку?', [
      'Менеджер Экспо проверит карточку; до решения участники видят прежнюю версию.',
      'Обязательные поля: решение, описание, контактное лицо стенда.'
    ], 'Отправить на проверку', 'i9-send-ok');
  });
  D.action('i9-send-ok', () => { X.card.status = 'review'; X.card.reason = ''; D.closeSheet(); D.toast('Правки отправлены на проверку'); D.rerender(); });
})();

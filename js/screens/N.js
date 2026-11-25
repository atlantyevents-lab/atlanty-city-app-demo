/* Блок N — ИИ-помощники v3 (раздел S2): N1 Ассистент, N2 Штурман: запрос, N3 Штурман: маршруты, N4 Секретарь,
   N5 Подборщик, N6 Люди для знакомства, N7 Хроникёр, N8 Почему это в вашем пути.
   Общий модуль D.pth (состояние пути, листы, кнопка «+ Путь») создаёт B.js, который подключён раньше.
   ИИ только предлагает: запись, заявка, пересборка и замена совершаются кнопкой и подтверждаются в листе (D-49, AC-AI-02). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;
  const plural = D.plural;
  const PU = D.pth;
  const PS = PU.PS;
  const { sheet, ul, cut, plusBtn, specOf } = PU;

  const WEEK = { 'чт': 'Чт', 'пт': 'Пт', 'сб': 'Сб', 'вс': 'Вс' };
  const dayShort = d => { const x = (F.DAYS || []).find(y => y.id === d); return x ? (WEEK[x.week] || x.week) : d; };

  /* ================= N1 Ассистент ================= */
  const P = D.prog;
  const PROMPTS = {
    program: ['Запиши меня к ментору', 'Что рядом через час?', 'Где проходит Бизнес-лаунж и когда?', 'Пересобери мой путь'],
    market: ['Покажи решения для склада', 'Какие стенды помогут снизить расходы?', 'Подбери решения по моему запросу'],
    people: ['С кем познакомиться по моей цели?', 'Кто занимается логистикой?', 'Найди кофе на сегодня']
  };
  const BLOCKS = [['program', 'Программа'], ['market', 'Маркетплейс'], ['people', 'Участники']];
  const NOW_ABS = PU.abs(F.PATH_NOW.day, F.PATH_NOW.time);
  const mParam = (key, day, time) => 'm_' + key + '_' + day.replace('.', '') + '_' + time.replace(':', '');   /* адрес D2 менторской записи, как в D.js */
  const surname = name => String(name).split(' ').slice(-1)[0];

  function domainTitle(code) {
    const d = ((F.TAXO && F.TAXO.DOMAINS) || []).find(x => x.code === code);
    return d ? d.title : code;
  }

  /* окна менторов: FIX.mentorSlots, без занятых, прошедших и жёстких пересечений с записями.
     «Свободно» только то окно, которое не пересекается и не мешает по переходам с принятым, записанным и добавленным вами (firm);
     пересекающиеся окна ассистент свободными не называет (V-06). */
  const MENTOR_ORDER = ['kovalev', 'soroka', 'levin'];
  const mSpec = (key, w) => ({ type: 'mentor', ref: key, day: w.day, time: w.time, dur: 30, hall: 'magnolia', place: 'Магнолия · стол ' + w.table });
  function mentorWindows() {
    const all = [];
    MENTOR_ORDER.forEach(key => {
      if (!F.speaker(key) || !F.mentorSlots) return;
      F.mentorSlots(key).forEach(w => {
        if (w.taken || PU.abs(w.day, w.time) <= NOW_ABS || (P.isPastWin && P.isPastWin(w))) return;
        const it = PU.findAny('mentor', key, w.day, w.time);
        if (it && it.status === 'booked') return;
        const hard = P.conflictsFor({ id: 'm:' + mParam(key, w.day, w.time), day: w.day, time: w.time, dur: 30, hall: 'magnolia' }).hard.length;
        if (hard) return;
        all.push({ key, w, c: PU.altConflicts(mSpec(key, w), null, true) });
      });
    });
    all.sort((a, b) => PU.abs(a.w.day, a.w.time) - PU.abs(b.w.day, b.w.time));
    return { free: all.filter(x => !x.c.length), busy: all.filter(x => x.c.length) };
  }
  const mentorBooked = (key, day, time) => { const it = PU.findAny('mentor', key, day, time); return !!it && it.status === 'booked'; };
  const winName = x => dayShort(x.w.day) + ' ' + x.w.time + ', ' + F.mentor(x.key).name;
  const winBtn = (x, tail) => ({ label: dayShort(x.w.day) + ' ' + x.w.time + ' · ' + surname(F.mentor(x.key).name) + (tail || ''), act: 'n1-win-ask',
    arg: [x.key, x.w.day, x.w.time, x.w.table].join('|'), slot: { key: x.key, day: x.w.day, time: x.w.time } });
  function mentorAnswer() {
    const ME = F.ME, o = mentorWindows(), free = o.free.slice(0, 3), busy = o.busy.slice(0, 2);
    const busyTxt = busy.length ? ' С вашим путём пересекаются, свободными я их не называю: ' + busy.map(x => winName(x) + ' (' + x.c[0].text.replace(/^пересекается с /, 'с ') + ')').join('; ') + '.' : '';
    if (!free.length && !busy.length) {
      return { role: 'ai', mode: 'Планировщик пути', text: 'Свободных окон менторов впереди не нашёл: они заняты или уже прошли. Откройте раздел «Менторские»: окна могут освободиться.', btns: [{ label: 'Менторские', go: 'D1' }] };
    }
    if (!free.length) {
      return { role: 'ai', mode: 'Планировщик пути',
        text: 'Окон менторов без пересечений с вашим путём нет.' + busyTxt + ' Записаться можно, конфликт появится в списке «Конфликты».',
        btns: busy.map(x => winBtn(x, ', пересекается')).concat([{ label: 'Менторские', go: 'D1' }]) };
    }
    return { role: 'ai', mode: 'Планировщик пути',
      text: 'Под ваш запрос «' + (ME.requestTask || 'Масштабирование') + '» подойдут окна без пересечений с вашим путём: ' + free.map(winName).join('; ') + '.' + busyTxt + ' Выберите окно: запись создаётся только после подтверждения.',
      btns: free.map(x => winBtn(x)) };
  }

  /* ближайший час: пункты пути и сессии, до которых успеть пешком (время из матрицы переездов) */
  function nearbyAnswer() {
    const day = F.PATH_NOW.day, from = F.PATH_NOW.hall, here = F.PATH_NOW.place;
    const items = PU.upcoming(day).filter(it => PU.startAbs(it) <= NOW_ABS + 75);
    const lines = items.map(it => {
      const t = it.hall ? PU.transit(PU.nowLoc(), it) : null;
      return it.time + ' ' + cut(it.title, 46) + (t ? ' (' + (it.hall === from ? 'вы уже здесь' : 'идти ' + t.walk + ' мин, выйти за ' + t.lead) + ')' : '');
    });
    const near = F.SESSIONS.filter(s => s.day === day && PU.abs(s.day, s.time) > NOW_ABS && PU.abs(s.day, s.time) <= NOW_ABS + 75 && F.canBook(s) && s.left !== 0 &&
      !PU.isDismissed('session', s.id) && !PU.findAny('session', s.id) && !(F.isBooked && F.isBooked(s.id)))
      .map(s => ({ s, walk: from === s.hall ? 0 : F.pathTransit(from, s.hall) }))
      .filter(x => x.walk != null && PU.abs(x.s.day, x.s.time) - NOW_ABS >= x.walk)
      .sort((a, b) => a.walk - b.walk || a.s.time.localeCompare(b.s.time)).slice(0, 3);
    const toExpo = F.pathTransit(from, 'congress');
    const text = 'Сейчас ' + F.PATH_NOW.time + ', вы в зале «' + here + '». ' +
      (lines.length ? 'В ближайший час и чуть дальше в вашем пути: ' + lines.join('; ') + '. ' : 'В ближайший час в пути пусто. ') +
      (near.length ? 'Ещё можно успеть: ' + near.length + ' ' + plural(near.length, ['сессия', 'сессии', 'сессий']) + ' рядом по матрице переездов. ' : '') +
      (toExpo != null ? 'Стенды Экспо в Конгресс-центре: ' + toExpo + ' ' + plural(toExpo, ['минута', 'минуты', 'минут']) + ' пешком.' : '');
    const btns = [];
    if (items[0] && items[0].hall) btns.push({ label: 'Маршрут', go: 'E4/' + items[0].hall });
    btns.push({ label: 'Экспо: стенды и зоны', go: 'H8' }, { label: 'Таймлайн дня', go: 'B4/' + PU.dayKey(day) });
    return { role: 'ai', mode: 'Секретарь', text, sessions: near.map(x => ({ id: x.s.id, walk: x.walk })), btns };
  }

  /* подбор решений по задаче каталога: ключевые слова запроса → задача → стенды (без отказов) */
  const CLUSTER_KEYS = [
    [['расход', 'налог', 'энерг'], ['Снижение расходов']],
    [['лизинг', 'финанс', 'капитал', 'кредит', 'факторинг'], ['Финансирование']],
    [['персонал', 'команд', 'найм', 'вакан'], ['Эффективная команда']],
    [['клиент', 'продаж', 'обращен', 'воронк'], ['Рост продаж', 'Больше обращений клиентов']],
    [['масштаб', 'регион', 'доставк'], ['Масштабирование']],
    [['искусствен', 'автоматиз'], ['Внедрение ИИ']],
    [['здоров', 'медицин'], ['Здоровье']]
  ];
  function solutionAnswer(t) {
    const has = (...k) => k.some(x => t.indexOf(x) >= 0);
    let clusters = null;
    CLUSTER_KEYS.forEach(c => { if (!clusters && has.apply(null, c[0])) clusters = c[1]; });
    if (!clusters && !has('склад') && has('запрос')) clusters = [F.ME.requestTask || 'Масштабирование'];
    if (clusters) {
      const picks = F.EXHIBITORS.filter(e => clusters.indexOf(e.cluster) >= 0 && !PU.isDismissed('stand', e.id)).slice(0, 3)
        .map(e => ({ ex: e.id, reason: { kind: 'overlap', text: (clusters[0] === F.ME.requestTask ? 'ваш запрос: ' : 'общее: ') + (clusters[0] === F.ME.requestTask ? clusters[0] : e.cluster) } }));
      return { role: 'ai', mode: 'Подборщик решений',
        text: 'По задаче «' + clusters[0] + '» нашёл ' + picks.length + ' ' + plural(picks.length, ['решение', 'решения', 'решений']) + '. Платное размещение помечено «на площадке», остальные подобраны только по задаче.',
        picks, btns: [{ label: 'Все решения по задаче', go: 'N5' }, { label: 'Маркетплейс', go: 'H1' }] };
    }
    const picks = F.PATH_PICKER.picks.filter(p => !PU.isDismissed('stand', p.ex)).slice(0, 3);
    return { role: 'ai', mode: 'Подборщик решений',
      text: 'Под задачу «' + F.PATH_PICKER.task.replace(/\.$/, '') + '» подобрал решения. Платное размещение помечено «на площадке», неплатные показаны рядом.',
      picks, btns: [{ label: 'Все пять решений', go: 'N5' }, { label: 'Маркетплейс', go: 'H1' }] };
  }

  /* подбор людей: условия из фразы (отрасль, оборот, цель) разбирает умная строка раздела «Участники» (PPL.parseAsk / runAsk);
     без условий берутся люди из подборки «Мой путь». «Хочу других» исключает тех, кто уже в пути или в подборке на главном экране. */
  function peopleAnswer(raw) {
    const t = raw.toLowerCase(), has = (...k) => k.some(x => t.indexOf(x) >= 0), ME = F.ME;
    const PP = F.PPL, chips = PP ? PP.parseAsk(raw).chips.filter(c => c.id !== 'words') : [];
    const btnsAll = [{ label: 'Умный поиск по участникам', go: 'F1' }, { label: 'Люди для знакомства', go: 'N6' }];
    if (chips.length) {
      const r = PP.runAsk(chips), rows = r.exact.filter(x => F.person(x.p.id) && !PU.isDismissed('person', x.p.id)).slice(0, 3);
      const cond = chips.map(c => '«' + c.label + '»').join(', ');
      return { role: 'ai', mode: 'Подбор людей', chips: chips.map(c => c.label),
        text: rows.length ? 'Учёл условие ' + cond + ': нашёл ' + rows.length + ' ' + plural(rows.length, ['человека', 'человека', 'человек']) + '. ' + (r.notes[0] || '') + ' Встречу вы предлагаете сами.'
          : 'По условию ' + cond + ' среди участников никого не нашёл. ' + (r.notes[0] || '') + ' Попробуйте смягчить условие в умном поиске по участникам.',
        ppl: rows.map(x => ({ id: x.p.id, how: x.how })), btns: btnsAll };
    }
    const others = has('других', 'другого', 'зря', 'не подошёл', 'не подошел');
    let list = PU.peopleList(5, true);
    if (others) { const shown = PU.peopleList(2, true).map(x => x.id); list = list.filter(x => shown.indexOf(x.id) < 0); }
    list = list.slice(0, 3);
    return { role: 'ai', mode: 'Подбор людей',
      text: list.length ? (others ? 'Показываю других: без тех, кто уже в вашем пути или в подборке на главном экране. ' : '') +
        'По вашей цели «' + domainTitle(ME.mainDomain || 'G2') + '» и запросу «' + (ME.requestTask || 'Масштабирование') + '» подобрал ' + list.length + ' ' + plural(list.length, ['человека', 'человека', 'человек']) + '. Причина показана у каждого; встречу вы предлагаете сами.'
        : 'Новых людей без повторов сейчас нет: остальные уже в вашем пути, скрыты или показаны на главном экране. Вернуть скрытых можно кнопкой «Сбросить отказы» в настройках уведомлений.',
      people: list.map(x => x.id), btns: others ? btnsAll : [{ label: 'Люди для знакомства', go: 'N6' }, { label: 'Предметный кофе', go: 'F6' }] };
  }

  /* база знаний ассистента (Q-28): описания тарифов, данные программы и карты; «Любимки» нет */
  const countAcc = a => F.SESSIONS.filter(s => (s.access || 'all') === a).length;
  const TARIFF_NAMES = [['бизнес', 'Бизнес'], ['первый класс', 'Первый класс'], ['первого класса', 'Первый класс'], ['оптимум', 'Оптимум'], ['спутник', 'Спутник']];
  function tariffAnswer(t) {
    const hit = TARIFF_NAMES.filter(x => t.indexOf(x[0]) >= 0)[0], name = hit ? hit[1] : F.ME.tariff;
    const nB = countAcc('biz_fc'), nF = countAcc('fc'), nS = countAcc('sat'), nA = countAcc('all');
    const q3 = (F.FAQ || []).filter(x => x.id === 'q3')[0];
    const ses = n => n + ' ' + plural(n, ['сессия', 'сессии', 'сессий']);
    const info = {
      'Бизнес': 'запись на менторские встречи и экспертные гостиные, закрытые сессии «Бизнес и Первый класс» (' + ses(nB) + ') и общая программа (' + nA + '). Закрыты: сессии только для Первого класса (' + nF + ') и программы «Спутник» (' + nS + ').',
      'Первый класс': 'всё, что у «Бизнеса»: менторские встречи, экспертные гостиные, закрытые сессии «Бизнес и Первый класс» (' + nB + '), и сверх того сессии только для Первого класса (' + nF + '). Закрыты сессии программы «Спутник» (' + nS + ').',
      'Оптимум': 'общая программа (' + ses(nA) + ') и стенды Экспо. Запись на менторские встречи и экспертные гостиные закрыта, закрытые сессии «Бизнеса» и Первого класса недоступны.',
      'Спутник': 'общая программа (' + ses(nA) + ') и сессии программы «Спутник» (' + nS + '). Менторские встречи и гостиные не входят.'
    }[name] || '';
    return { role: 'ai', mode: 'FAQ',
      text: 'Тариф «' + name + '»: ' + info + (name === F.ME.tariff ? ' Это ваш тариф.' : ''),
      source: 'Вопросы и ответы · «' + (q3 ? q3.q : 'Что даёт мой тариф') + '» и данные программы', note: 'Оплата и смена тарифа не проводятся в приложении: кнопка «Изменить тариф» ведёт в Telegram организатору',
      btns: [{ label: 'Вопросы и ответы', go: 'L11' }] };
  }
  /* соответствие вопроса заготовленным ответам «Вопросы и ответы»: по ключевым словам */
  const KB_RULES = [
    [['взять с собой', 'на заезд', 'qr', 'пройти на вход', 'как пройти'], 'q2'], [['код входа', 'не приходит код', 'код не'], 'q1'],
    [['как записаться', 'запись на сессию'], 'q4'], [['общий чат', 'чат участников', 'чаты'], 'q8'], [['реклам'], 'q9'], [['профил', 'видит мои', 'контакты видят'], 'q10'],
    [['выгрузить', 'удалить мои данные', 'удалить аккаунт'], 'q11'], [['что делает ии', 'какие данные'], 'q12'], [['почему мне показ', 'почему именно'], 'q7']
  ];
  function faqAnswer(raw) {
    const t = raw.toLowerCase(), has = (...k) => k.some(x => t.indexOf(x) >= 0), A = F.AI_FAQ;
    if (has('тариф', 'билет') && !has('qr', 'где мой билет')) return tariffAnswer(t);
    if (has('лаунж', 'магнол', 'где проходит')) return { role: 'ai', mode: 'FAQ', text: A.a, source: A.source, note: A.tariffNote };
    let faq = null;
    KB_RULES.forEach(r => { if (!faq && has.apply(null, r[0])) faq = (F.FAQ || []).filter(x => x.id === r[1])[0]; });
    if (faq) return { role: 'ai', mode: 'FAQ', text: faq.a, source: 'Вопросы и ответы · «' + faq.q + '»', btns: [{ label: 'Все вопросы и ответы', go: 'L11' }] };
    return noKnowledge();
  }
  /* отказ по Q-28: в базе тарифы, программа и карта */
  function noKnowledge() {
    return { role: 'ai', mode: 'FAQ', text: 'Этого нет в моей базе: тарифы, программа и карта. Спросите службу заботы.',
      btns: [{ label: 'Карта площадки', go: 'E1' }, { label: 'Передать вопрос', act: 'n1-ask' }] };
  }
  function plannerAnswer(t) {
    const v = F.pathVersion(PS.version), has = (...k) => k.some(x => t.indexOf(x) >= 0);
    if (has('мои записи', 'мои запис', 'покажи запис')) {
      return { role: 'ai', mode: 'Планировщик пути', text: 'Ваши записи на сессии, менторские встречи и гостиные собраны в разделе «Мои записи». Там же можно отменить запись, если до начала больше двух часов.',
        btns: [{ label: 'Мои записи', go: 'D5' }, { label: 'Таймлайн дня', go: 'B4/' + PU.dayKey(F.PATH_NOW.day) }] };
    }
    if (has('завтра')) {
      const n = PU.dayItems('28.02').filter(it => it.type !== 'task' && PU.active(it)).length;
      return { role: 'ai', mode: 'Планировщик пути',
        text: 'Путь на завтра (28.02) уже собран: ' + n + ' ' + plural(n, ['пункт', 'пункта', 'пунктов']) + '. Переносить пункты с сегодняшнего дня на завтра я сам не могу: замену пункта и пересборку пути вы подтверждаете в листе.',
        btns: [{ label: 'Путь на завтра', go: 'B4/d2802' }, { label: 'Пересобрать путь', act: 'pth-rebuild-ask' }] };
    }
    return { role: 'ai', mode: 'Планировщик пути',
      text: 'Могу пересобрать путь по версии «' + v.name + '» с учётом убранных и закреплённых пунктов. Это изменит расписание, поэтому нужно ваше подтверждение в листе.',
      btns: [{ label: 'Пересобрать путь', act: 'pth-rebuild-ask' }, { label: 'Версии пути', go: 'B5' }, { label: 'Таймлайн дня', go: 'B4/' + PU.dayKey(F.PATH_NOW.day) }] };
  }
  /* поиск по программе: слово запроса должно совпасть с началом слова в названии или описании сессии */
  function searchAnswer(raw) {
    const t = raw.toLowerCase();
    const words = t.replace(/[^а-яёa-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 5);
    const w0 = words[0];
    const stem = w0 ? (w0.length <= 6 ? w0 : w0.slice(0, w0.length - 2)) : '';
    const re = stem ? new RegExp('(^|[^а-яёa-z0-9])' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null;
    const hits = re ? F.SESSIONS.filter(s => re.test((s.title + ' ' + (s.desc || '')).toLowerCase())).slice(0, 3) : [];
    if (!hits.length) return null;
    return { role: 'ai', mode: 'Умный поиск', text: 'Нашёл в программе по запросу «' + raw + '»: ' + hits.length + ' ' + plural(hits.length, ['сессия', 'сессии', 'сессий']) + '.',
      sessions: hits.map(s => ({ id: s.id })), btns: [{ label: 'Поиск по всему', go: 'Z2' }] };
  }

  /* маршрутизатор запроса по правилам (FR-AI-05): режим и ответ собираются из данных, без свободного текста модели.
     forced — режим записи из истории: «Повторить» воспроизводит тот же режим и тот же ответ. */
  function answer(raw, forced) {
    const t = raw.toLowerCase();
    const has = (...k) => k.some(x => t.indexOf(x) >= 0);
    if (forced === 'FAQ') return faqAnswer(raw);
    if (forced === 'Подбор людей') return peopleAnswer(raw);
    if (forced === 'Подборщик решений') return solutionAnswer(t);
    if (forced === 'Планировщик пути') return has('ментор') ? mentorAnswer() : plannerAnswer(t);
    if (has('ментор')) return mentorAnswer();
    if (has('рядом', 'через час', 'что дальше', 'ближайш')) return nearbyAnswer();
    if (has('тариф', 'билет', 'лаунж', 'магнол', 'где проходит', 'взять с собой', 'код входа', 'qr', 'реклам', 'выгрузить', 'удалить мои') || /(^|\s)чат/.test(t)) return faqAnswer(raw);
    if (has('пересобер', 'пересбор', 'собери', 'путь', 'расписан', 'мой день', 'мои записи', 'покажи запис', 'завтра')) return plannerAnswer(t);
    if (has('кто ', 'познаком', 'кофе', 'люди', 'людей', 'человек', 'участник', 'ребят', 'партн', 'знакомств')) return peopleAnswer(raw);
    if (has('решен', 'стенд', 'экспонент', 'склад', 'лизинг', 'расход', 'маркетплейс', 'налог', 'персонал')) return solutionAnswer(t);
    if (has('заметк', 'письм', 'итог встреч', 'после встреч')) {
      return { role: 'ai', mode: 'Хроникёр', text: 'Могу подготовить черновик письма по вашим заметкам и итогу встречи. Факты берутся только из заметок, отправка за вами.', btns: [{ label: 'Черновик письма', go: 'N7' }] };
    }
    return searchAnswer(raw) || noKnowledge();
  }

  function greeting() {
    return { role: 'ai', mode: 'Ассистент', text: 'Я Ассистент «Мой путь». Помогу найти сессии, решения и людей и собрать день. Выберите тему ниже или напишите запрос.' };
  }

  function n1Send(text, mode) {
    const st = D.st('N1');
    st.msgs = st.msgs || [greeting()];
    st.msgs.push({ role: 'me', text, when: 'сейчас' });
    st.msgs.push(answer(text, mode));
    st.tab = 'dialog'; st.scroll = true;
    PS.q = '';
    D.rerender();
  }

  function btnHTML(b) {
    if (b.go) return '<button class="chip pth-qr" data-go="' + esc(b.go) + '">' + esc(b.label) + '</button>';
    const done = b.slot && mentorBooked(b.slot.key, b.slot.day, b.slot.time);
    return '<button class="chip pth-qr' + (done ? ' on' : '') + '" data-act="' + b.act + '"' + (b.arg != null ? ' data-arg="' + esc(b.arg) + '"' : '') + (done ? ' disabled' : '') + '>' +
      (done ? icon('check') + 'Записано: ' : '') + esc(b.label) + '</button>';
  }
  function peopleCard(id) {
    const pp = F.PATH_PEOPLE.find(x => x.id === id), p = pp && F.person(pp.person);
    if (!p || PU.isDismissed('person', p.id)) return '';
    const found = PU.findPerson(p.id);
    return '<div class="pth-chat-card"><button class="pth-it-main" data-go="F2/' + p.id + '"><span class="pth-it-t">' + esc(p.name) + '</span>' +
      '<span class="pth-it-s"><span>' + esc(p.company) + ' · ' + esc(p.role) + '</span></span>' +
      '<span class="pth-it-why">' + esc(PU.whyLine(pp.reason.text)) + '</span></button>' +
      '<div class="pth-it-foot"><button class="btn btn-ghost btn-sm" data-go="F11/' + p.id + '">Предложить встречу</button>' +
      '<span class="pth-it-act">' + plusBtn(PU.personSlot(pp, p), found) + '</span></div></div>';
  }
  /* человек из умной строки участников: причина — какое условие совпало (оборот и другие значения не показываются) */
  function pplCard(x) {
    const p = F.person(x.id); if (!p || PU.isDismissed('person', p.id)) return '';
    const found = PU.findPerson(p.id);
    const slot = { type: 'person', ref: p.id, day: '27.02', time: '14:00', dur: 15, place: 'Нетворкинг-зона', title: 'Знакомство: ' + p.name };
    return '<div class="pth-chat-card"><button class="pth-it-main" data-go="F2/' + p.id + '"><span class="pth-it-t">' + esc(p.name) + '</span>' +
      '<span class="pth-it-s"><span>' + esc(p.company) + ' · ' + esc(p.role) + '</span></span>' +
      '<span class="pth-it-why">' + esc('Причина: ' + (x.how && x.how.length ? x.how.join(', ') : 'совпало условие запроса')) + '</span></button>' +
      '<div class="pth-it-foot"><button class="btn btn-ghost btn-sm" data-go="F11/' + p.id + '">Предложить встречу</button>' +
      '<span class="pth-it-act">' + plusBtn(slot, found) + '</span></div></div>';
  }
  function pickCard(pk) {
    const e = F.exhibitor(pk.ex);
    if (!e || PU.isDismissed('stand', pk.ex)) return '';
    const found = PU.findAny('stand', pk.ex);
    const sp = found ? specOf(found) : { type: 'stand', ref: pk.ex, day: '28.02', time: '13:15', dur: 15, hall: 'congress', place: 'Экспо · ' + e.stand, title: 'Стенд: ' + e.name };
    sp.paid = PU.isPaid(pk.ex);
    return '<div class="pth-chat-card"><button class="pth-it-main" data-go="H2/' + e.id + '"><span class="pth-it-k"><span class="pth-kind">Стенд · ' + esc(e.stand) + '</span>' +
      (sp.paid ? tag('на площадке', 'fill') : '') + '</span><span class="pth-it-t">' + esc(e.name) + '</span>' +
      '<span class="pth-it-s"><span>' + esc(e.what) + '</span></span><span class="pth-it-why">' + esc(pk.reason ? PU.whyLine(pk.reason.text) : '') + '</span>' +
      '<span class="pth-it-s">' + icon('clock') + '<span>' + esc(sp.day) + ', ' + esc(sp.time) + '</span></span></button>' +
      '<div class="pth-it-foot"><span></span><span class="pth-it-act">' + plusBtn(sp, found) + '</span></div></div>';
  }
  function sessCard(x) {
    const s = F.session(x.id); if (!s) return '';
    return '<button class="row clickable pth-chat-row" data-go="C3/' + s.id + '"><div class="grow"><div class="r-title">' + esc(cut(s.title, 70)) + '</div>' +
      '<div class="r-sub">' + s.day + ' · ' + s.time + ' · ' + esc((F.hall(s.hall) || {}).name || '') +
      (x.walk != null ? ' · ' + (x.walk ? x.walk + ' ' + plural(x.walk, ['минута', 'минуты', 'минут']) + ' пешком' : 'вы уже здесь') : '') + '</div></div>' + icon('chevR') + '</button>';
  }
  function msgHTML(m) {
    if (m.role === 'me') return '<div class="pth-msg me"><div class="pth-bub">' + esc(m.text) + '</div></div>';
    return '<div class="pth-msg ai"><span class="pth-ai-av">' + icon('spark') + '</span><div class="pth-bub">' +
      (m.mode || m.updated ? '<div class="pth-mode">' + (m.mode ? 'режим: ' + esc(m.mode) : '') +
        (m.updated ? (m.mode ? ' · ' : '') + '<span class="tag accent">обновлено</span>' : '') + '</div>' : '') +
      '<div class="pth-bt">' + esc(m.text) + '</div>' +
      (m.chips && m.chips.length ? '<div class="pth-wrapchips">' + m.chips.map(c => tag(c, 'accent')).join('') + '</div>' : '') +
      (m.people ? m.people.map(peopleCard).join('') : '') +
      (m.ppl ? m.ppl.map(pplCard).join('') : '') +
      (m.picks ? m.picks.map(pickCard).join('') : '') +
      (m.sessions ? '<div class="pth-chat-rows">' + m.sessions.map(sessCard).join('') + '</div>' : '') +
      (m.source ? '<div class="pth-src">' + icon('file') + '<span>Источник: ' + esc(m.source) + (m.note ? '. ' + esc(m.note) : '') + '</span></div>' : '') +
      (m.btns && m.btns.length ? '<div class="pth-qrs">' + m.btns.map(btnHTML).join('') + '</div>' : '') +
      '</div></div>';
  }

  D.register('N1', {
    tab: 'B1',
    meta: {
      title: 'N1 · Ассистент',
      role: 'Участник, ИИ-помощник',
      fr: ['FR-AI-02', 'FR-AI-03', 'FR-AI-04', 'FR-AI-05', 'FR-AI-09', 'FR-PATH-14'],
      ac: ['AC-AI-02', 'AC-AI-07', 'AC-AI-08', 'AC-AI-09', 'AC-AI-10', 'AC-PATH-14'],
      what: [
        'Диалог с историей запросов (вкладка «История» хранит прежние вопросы и текущие) и подсказками по блокам «Программа», «Маркетплейс», «Участники».',
        'Быстрые ответы-кнопки: «Запиши меня к ментору», затем свободные окна из FIX.mentorSlots («Сб 15:30 · Ковалёв»), лист подтверждения и «Запись создана»: пункт «записано» в «Мой путь», окно занято в D1, запись в D5, ссылка ведёт в D2 этой записи.',
        'Кнопка микрофона (макет голосового ввода): «Слушаю», затем текст, который можно править; подпись «распознавание речи уточняется».',
        'Плашка «ИИ только предлагает, действие совершается кнопкой»; у каждого ответа указан режим и, где есть, источник; вне базы знаний — «передаю организатору».'
      ],
      rules: [
        'Запрос направляет в один из девяти режимов правила маршрутизатора (Диагност, Автор питча, Планировщик пути, Подбор людей, Подборщик решений, Умный поиск, Секретарь, FAQ, Хроникёр).',
        'Запись, заявка, публикация и пересборка пути выполняются только нажатием кнопки и подтверждением в листе (D-49, AC-AI-02).',
        'В модель не передаются контакты; имена шифруются (D-49). Ответ не раскрывает материалы, закрытые правами тарифа.',
        'Лимит запросов: 30 в сутки на человека плюс отдельные лимиты режимов; при отказе ИИ работает замена без ИИ (быстрые запросы и поиск).'
      ],
      depends: ['D-46', 'D-49', 'FR-AI-03 база знаний', 'права на контент по тарифу']
    },
    html(ctx) {
      PU.syncPhase();
      const st = ctx.state;
      st.tab = st.tab || 'dialog'; st.block = st.block || 'program'; st.msgs = st.msgs || [greeting()];
      if (PS.aiPending) {
        const t = PS.aiPending; PS.aiPending = null;
        st.msgs.push({ role: 'me', text: t }); st.msgs.push(answer(t)); st.tab = 'dialog'; st.scroll = true;
      }
      const tabs = '<div class="segbar">' + [['dialog', 'Диалог'], ['hist', 'История']].map(x =>
        '<button class="seg' + (st.tab === x[0] ? ' on' : '') + '" data-act="n1-tab" data-arg="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
      let body;
      if (st.tab === 'hist') {
        const mine = st.msgs.map((m, i) => ({ m, i })).filter(x => x.m.role === 'me').reverse();
        const rows = mine.map(x => ({ when: 'сегодня', q: x.m.text, mode: (st.msgs[x.i + 1] || {}).mode || 'Ассистент' })).concat(F.PATH_AI_HISTORY);
        const MODE_FORCED = { 'FAQ': 1, 'Подбор людей': 1, 'Подборщик решений': 1, 'Планировщик пути': 1 };
        body = '<div class="cap pth-note">История сохраняется между сеансами. Любой запрос можно повторить.</div>' +
          '<div class="card" style="padding:2px 16px"><div class="list">' + rows.map((r, i) =>
            '<div class="row"><div class="grow"><div class="r-title">' + esc(r.q) + '</div><div class="r-sub">' + esc(r.when) + ' · режим: ' + esc(r.mode) + '</div></div>' +
            '<button class="btn btn-ghost btn-sm" data-act="n1-repeat" data-arg="' + esc(r.q) + '"' + (MODE_FORCED[r.mode] ? ' data-mode="' + esc(r.mode) + '"' : '') + '>Повторить</button></div>').join('') + '</div></div>';
      } else {
        const chips = '<div class="pth-ai-quick">' + BLOCKS.map(b => '<button class="chip' + (st.block === b[0] ? ' on' : '') + '" data-act="n1-block" data-arg="' + b[0] + '">' + b[1] + '</button>').join('') + '</div>';
        body = '<div class="banner info">' + icon('spark') + '<div><div class="b-title">ИИ только предлагает, действие совершается кнопкой</div>' +
          '<div class="cap">Запись, заявку и пересборку пути вы подтверждаете в листе. Без ИИ работают быстрые запросы и поиск.</div></div></div>' +
          '<div class="pth-chat">' + st.msgs.map(m => msgHTML(m)).join('') + '</div>' +
          '<div class="sec-title">Подсказки</div>' + chips +
          '<div class="card" style="padding:2px 16px"><div class="list">' + PROMPTS[st.block].map(q =>
            '<button class="row clickable" data-act="n1-send" data-arg="' + esc(q) + '"><div class="grow"><div class="r-title">' + esc(q) + '</div></div>' + icon('send') + '</button>').join('') + '</div></div>' +
          '<div class="cap pth-note" id="pth-ai-note">Можно говорить: распознавание речи уточняется, текст можно править до отправки.</div>';
      }
      const composer = st.tab === 'hist' ? '' : '<div class="pth-composer"><div class="pth-ai-row pth-compose"><label class="pth-ai-field">' + icon('spark') +
        '<input id="pth-q" type="text" placeholder="Спросите Ассистента" autocomplete="off" aria-label="Сообщение Ассистенту"></label>' +
        '<button class="pth-mic" data-act="pth-voice" aria-pressed="false" aria-label="Голосовой ввод">' + icon('mic') + '</button>' +
        '<button class="pth-send" data-act="n1-send-field" aria-label="Отправить">' + icon('send') + '</button></div></div>';
      return '<div class="scr">' +
        D.head({ back: 'B1', eyebrow: 'ИИ · Ассистент', title: 'Ассистент', sub: 'Программа, Маркетплейс, участники и ваш путь', paren: paren('запрос сам попадёт в нужный режим') }) +
        tabs + '<div class="pth-body">' + body + '<div class="pth-end"></div></div>' + composer + '</div>';
    },
    mount(host, ctx) {
      const st = D.st('N1');
      const scr = host.querySelector('.scr');
      /* после отправки показываем начало ответа: вопрос (или последний ответ) у верхнего края, поле ввода закреплено внизу */
      if (st.scroll && scr) {
        const list = host.querySelectorAll(st.scroll === 'ai' ? '.pth-msg.ai' : '.pth-msg.me'), last = list[list.length - 1];
        if (last) scr.scrollTop = last.getBoundingClientRect().top - scr.getBoundingClientRect().top + scr.scrollTop - 12;
        else scr.scrollTop = scr.scrollHeight;
        st.scroll = false;
      }
      const q = host.querySelector('#pth-q'); if (!q) return;
      q.value = PS.q || '';
      q.addEventListener('input', () => { PS.q = q.value; });
      q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = host.querySelector('.pth-send'); if (b) b.click(); } });
    }
  });
  D.action('n1-tab', el => { D.st('N1').tab = el.dataset.arg; D.rerender(); });
  D.action('n1-block', el => { D.st('N1').block = el.dataset.arg; D.rerender(); });
  D.action('n1-send', el => n1Send(el.dataset.arg));
  /* «Повторить»: тот же режим (data-mode из истории) и тип ответа; ответ считается на текущих данных,
     при отличии от прежнего помечается «обновлено» (подпись в пузыре). */
  const sigOf = m => JSON.stringify({ mode: m.mode, text: m.text,
    ppl: (m.ppl || []).length, people: (m.people || []).length, picks: (m.picks || []).length,
    sessions: (m.sessions || []).length, chips: (m.chips || []).length });
  function prevAnswer(msgs, q) {
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === 'me' && msgs[i].text === q && msgs[i + 1].role === 'ai') { return msgs[i + 1]; }
    }
    return null;
  }
  D.action('n1-repeat', el => {
    const st = D.st('N1');
    st.msgs = st.msgs || [greeting()];
    const q = el.dataset.arg, prev = prevAnswer(st.msgs, q);
    st.msgs.push({ role: 'me', text: q, when: 'сейчас' });
    const nw = answer(q, el.dataset.mode || null);
    if (prev) { if (sigOf(prev) !== sigOf(nw)) { nw.updated = true; } }
    else {
      st.rsig = st.rsig || {};
      if (st.rsig[q] && st.rsig[q] !== sigOf(nw)) { nw.updated = true; }
      st.rsig[q] = sigOf(nw);
    }
    st.msgs.push(nw); st.tab = 'dialog'; st.scroll = true; PS.q = '';
    D.rerender();
  });
  D.action('n1-send-field', () => {
    const t = (PS.q || '').trim();
    if (!t) { D.toast('Напишите запрос или выберите подсказку'); return; }
    n1Send(t);
  });
  D.action('n1-ask', () => {
    sheet('Передать вопрос в службу заботы?', ul(['Служба заботы получит ваш вопрос и ваше имя. Ответ придёт уведомлением.',
      'Контакты и данные профиля вместе с вопросом не передаются.']), 'n1-ask-do', '', 'Передать');
  });
  D.action('n1-ask-do', () => { D.closeSheet(); D.toast('Вопрос передан в службу заботы'); });
  D.action('n1-win-ask', el => {
    const [key, day, time, table] = el.dataset.arg.split('|'), m = F.mentor(key); if (!m) return;
    const spec = { type: 'mentor', ref: key, day, time, dur: 30, hall: 'magnolia', place: 'Магнолия · стол ' + table, title: 'Менторская встреча: ' + m.name };
    const c = PU.altConflicts(spec);
    const cf = P.conflictsFor({ id: 'm:' + mParam(key, day, time), day, time, dur: 30, hall: 'magnolia' });
    sheet('Записать к ментору?', ul([
      'Менторская встреча: <b>' + esc(m.name) + '</b>, ' + dayShort(day) + ' ' + day + ', ' + time + '–' + PU.fmt(PU.tm(time) + 30) + ', Магнолия, стол ' + esc(table) + '.',
      cf.soft.length ? 'Не успеваете: между «' + esc(cut(cf.soft[0].o.title, 40)) + '» и этим окном ' + cf.soft[0].gap + ' мин, на переход нужно ' + cf.soft[0].need + '.'
        : (c.length ? 'Есть конфликт с путём: ' + esc(c[0].text) + '. Запись возможна, конфликт появится в списке «Конфликты».' : 'Конфликтов по времени нет.'),
      'Запись займёт окно и добавит пункт со статусом «записано» в «Мой путь». Отмена — до начала минус 2 часа.'
    ]), 'n1-win-do', el.dataset.arg, 'Записать');
  });
  D.action('n1-win-do', el => {
    const [key, day, time, table] = el.dataset.arg.split('|'), m = F.mentor(key);
    const st = D.st('N1'); st.msgs = st.msgs || [greeting()];
    const slot = F.mentorSlots(key).find(w => w.day === day && w.time === time);
    if (!m || !slot || slot.taken) { D.closeSheet(); D.toast('Окно уже занято'); return; }
    /* запись так же, как в D1: пункт пути типа mentor со статусом booked, последняя запись для D2 */
    const it = F.pathAdd('mentor', key, { day, time, place: 'Магнолия · стол ' + table });
    if (!it) { D.closeSheet(); D.toast('Не удалось записать'); return; }
    it.status = 'booked';
    P.bk().last = { kind: 'mentor', key, day, time };
    PU.logEv('booked', 'Запись к ментору: ' + m.name + ', ' + day + ' ' + time);
    st.msgs.push({ role: 'ai', mode: 'Планировщик пути',
      text: 'Запись создана: менторская встреча с ' + m.name + ', ' + dayShort(day) + ' ' + day + ', ' + time + ', Магнолия, стол ' + table + '. Пункт добавлен в «Мой путь» со статусом «записано».',
      btns: [{ label: 'Подтверждение записи', go: 'D2/' + mParam(key, day, time) }, { label: 'Мои записи', go: 'D5' }, { label: 'Таймлайн дня', go: 'B4/' + PU.dayKey(day) }] });
    st.scroll = 'ai';
    D.closeSheet();
    D.rerender();
    PU.say('Запись создана: ' + dayShort(day) + ' ' + time + ', ' + m.name, 6000, { label: 'Отменить', act: 'path-remove', id: it.id });
  });

  /* ================= N3 Штурман: варианты дня ================= */
  D.register('N3', {
    tab: 'B1',
    meta: {
      title: 'N3 · Штурман: маршруты',
      role: 'Участник, ИИ-помощник',
      fr: ['FR-AI-05', 'FR-PATH-07', 'FR-PATH-10', 'FR-AI-02'],
      ac: ['AC-PATH-07', 'AC-AI-02'],
      what: [
        'Три варианта дня как переключаемые карточки с объяснением и нагрузкой.',
        'Кнопка «В мой путь» открывает лист подтверждения: вариант помечает день как план Штурмана (отметка видна в B1 и B4), записи делаются отдельно.',
        'Связь с версиями пути (B5) и таймлайном дня (B4); переход в «Избранное» (C4).'
      ],
      rules: [
        'Варианты строятся из программы, записей и встреч участника; выбор варианта сам ничего не бронирует.',
        'Версии пути (B5) задают состав на весь фестиваль, варианты Штурмана раскладывают один день.',
        'Применение варианта подтверждается нажатием кнопки в листе (D-49).'
      ],
      depends: ['D-49', 'D-52', 'база программы', 'личное расписание']
    },
    html(ctx) {
      PU.syncPhase();
      const st = ctx.state;
      st.sel = st.sel || 'n1';
      st.added = !!st.added;
      const cards = F.NAV_DAYS.map(d =>
        '<button class="card plan-card' + (st.sel === d.id ? ' on' : '') + '" data-act="n3-sel" data-arg="' + d.id + '">' +
        '<div class="pl-title">' + esc(d.title) + '</div>' +
        '<div class="pl-desc">' + esc(d.desc) + '</div>' +
        '<div class="pl-load">' + esc(d.load) + '</div></button>').join('');
      const cur = F.NAV_DAYS.find(d => d.id === st.sel);
      return '<div class="scr">' +
        D.head({ back: 'B1', eyebrow: esc(F.NOW.dateLong), title: 'Штурман', sub: 'Три варианта дня под ваши цели', paren: paren('вариант — план, записи делаются отдельно') }) +
        '<div class="pth-body">' + cards +
        '<div class="banner">' + icon('info') + '<div class="cap">Выбран «' + esc(cur.title) + '»: ' + esc(cur.desc) + '</div></div>' +
        '<button class="btn ' + (st.added ? 'btn-secondary' : 'btn-primary') + ' btn-block" data-act="n3-add">' +
        icon('route') + (st.added ? 'План дня в вашем пути' : 'В мой путь') + '</button>' +
        '<button class="btn btn-ghost btn-block" data-go="C4">' + icon('bookmark') + 'Открыть избранное</button>' +
        '<div class="pth-foot-btns"><button class="btn btn-secondary" data-go="B4/' + PU.dayKey(F.PATH_NOW.day) + '">Таймлайн дня</button>' +
        '<button class="btn btn-secondary" data-go="B5">Версии пути</button></div>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
  D.action('n3-sel', el => { D.st('N3').sel = el.dataset.arg; D.st('N3').added = false; PS.plan = null; D.rerender(); });
  D.action('n3-add', () => {
    const st = D.st('N3');
    if (st.added) { st.added = false; PS.plan = null; D.rerender(); PU.say('Отметка плана убрана'); return; }
    const cur = F.NAV_DAYS.find(d => d.id === st.sel);
    sheet('Добавить план дня в путь?', ul([
      'Вариант «' + esc(cur.title) + '»: ' + esc(cur.load) + '.',
      'День получит отметку «план Штурмана»: она видна в «Моём пути» и в таймлайне дня. Записи на сессии и встречи делаются отдельно.',
      'Вернуть отметку к прежнему состоянию можно повторным нажатием.'
    ]), 'n3-add-do', '', 'Добавить в путь');
  });
  D.action('n3-add-do', () => {
    const st3 = D.st('N3'), cur = F.NAV_DAYS.find(d => d.id === st3.sel) || F.NAV_DAYS[0];
    st3.added = true;
    PS.plan = { id: cur.id, title: cur.title };
    PU.logEv('plan', 'План дня Штурмана: «' + cur.title + '»');
    D.closeSheet();
    D.rerender();
    PU.say('План дня добавлен в «Мой путь»');
  });

  /* ================= N4 Секретарь: перенос записи ================= */
  /* Сценарий из данных программы: практикум, на который человек записан (D5), сдвинут на 30 минут (SCHEDULE_NOTICES).
     Секретарь показывает, что это меняет в пути, и предлагает следующие шаги; запись на другую практику создаётся тем же способом,
     что в D.prog.bookSession (пункт пути со статусом «записано»), и подтверждается в листе. */
  function n4Cancelable(s) {
    const dl = parseInt(s.day, 10) * 1440 + PU.tm(s.time) - 120;
    return parseInt(F.NOW.day, 10) * 1440 + PU.tm(F.NOW.time) <= dl;
  }
  function n4Obj(s) {
    const h = F.hall(s.hall);
    return { id: 'n4_' + s.id, type: F.pathTypeOf ? F.pathTypeOf(s) : 'practice', ref: s.id, title: s.title, reason: PU.leverReason(s.lever),
      day: s.day, time: s.time, dur: s.dur, hall: s.hall, place: h ? h.name : '' };
  }
  /* до трёх практик: сначала те, что не пересекаются с принятым и записанным в пути (V-03, V-08), затем остальные */
  function n4Alts() {
    const ok = [], rest = [];
    F.SESSIONS.filter(s => F.isPractice && F.isPractice(s) && PU.abs(s.day, s.time) > NOW_ABS && F.canBook(s) && s.left !== 0 &&
      !PU.isDismissed('session', s.id) && !PU.findAny('session', s.id) && !(F.isBooked && F.isBooked(s.id)) && !P.isBookedNow(s.id))
      .sort((a, b) => PU.abs(a.day, a.time) - PU.abs(b.day, b.time)).forEach(s => {
        if (P.conflictsFor({ id: s.id, day: s.day, time: s.time, dur: s.dur, hall: s.hall }).hard.length) return;
        const o = n4Obj(s);
        (PU.altConflicts(o, null, true).length ? rest : ok).push(o);
      });
    return ok.concat(rest).slice(0, 3);
  }
  D.register('N4', {
    tab: 'B1',
    meta: {
      title: 'N4 · Секретарь',
      role: 'Участник, ИИ-помощник',
      fr: ['FR-NTF-03', 'FR-FEED-11', 'FR-PROG-05', 'FR-AI-02'],
      ac: ['AC-FEED-02', 'AC-AI-02'],
      what: [
        'Перенос записанной сессии (практикум сдвинут с 12:00 на 12:30, данные SCHEDULE_NOTICES): что изменилось и что это меняет в пути (пересечения и время на переход).',
        'Шаги Секретаря: решить пересечение (B7), показать следующую сессию в этом зале (C3), выбрать другую практику; у каждой замены время, зал и причина, показаны только практики без жёстких пересечений с вашими записями.',
        '«Записаться» на замену создаёт настоящую запись (пункт «записано», запись видна в D5) после подтверждения в листе; если пересечение с вашей записью жёсткое, кнопки нет.',
        'Связь с дайджестом дня (B8): Секретарь собирает сводки в 08:00 и 19:00.'
      ],
      rules: [
        'Секретарь срабатывает на перенос или отмену записанного и предлагает до трёх замен за 60 секунд.',
        'Замены подбираются по близости времени и теме; время перехода считается по матрице переездов.',
        'Отмена прежней записи возможна до начала минус 2 часа; позже только через организатора.',
        'Запись создаётся только после подтверждения в листе; без ИИ работают правила и очередь.'
      ],
      depends: ['D-49', 'FR-BOOK-04', 'матрица переездов', 'фид изменений']
    },
    html(ctx) {
      PU.syncPhase();
      const nt = (F.SCHEDULE_NOTICES || [])[0], s = nt && F.session(nt.sid);
      if (!nt || !s) {
        return '<div class="scr">' + D.head({ back: 'B1', eyebrow: 'Секретарь', title: 'Изменений нет', sub: 'По вашим записям изменений не было', paren: paren('Секретарь напишет, если расписание изменится') }) +
          '<div class="pth-body"><div class="card pth-empty"><div class="cap">Когда запись перенесут или отменят, здесь появятся шаги и замены.</div>' +
          '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B8">Дайджест дня</button></div></div><div class="pth-end"></div></div></div>';
      }
      const it = PU.findAny(F.pathTypeOf ? F.pathTypeOf(s) : 'practice', s.id);
      const confs = it ? PU.confOf(it) : [];
      const next = F.nextInHall ? F.nextInHall(s) : null;
      /* набор замен запоминается при первом показе: после записи карточка остаётся со статусом «Записаны» */
      if (!ctx.state.offer) ctx.state.offer = n4Alts().map(a => a.ref);
      const alts = ctx.state.offer.map(id => F.session(id)).filter(Boolean).map(n4Obj);
      const canCancel = n4Cancelable(s);
      const cards = alts.map(a => {
        const booked = P.isBookedNow(a.ref);
        const act = booked ? '<span class="pth-in">' + icon('check') + 'Записаны</span>'
          : '<button class="btn btn-primary btn-sm pth-plus" data-act="n4-book" data-arg="' + esc(a.ref) + '">Записаться</button>';
        return PU.altHTML(a, { actHTML: act, dayLabel: true, compact: true });
      }).join('');
      return '<div class="scr">' +
        D.head({ back: 'B1', eyebrow: 'Секретарь · ' + esc(F.NOW.dateLong), title: 'Практикум сдвинут', sub: esc(PU.fixTitle(s.title)),
          paren: paren('ваша запись остаётся, время изменилось') }) +
        '<div class="pth-body">' +
        '<div class="banner warn">' + icon('alert') + '<div><div class="b-title">Организатор сдвинул сессию на ' + nt.shiftMin + ' ' + plural(nt.shiftMin, ['минуту', 'минуты', 'минут']) + '</div>' +
        '<div class="cap">Было ' + esc(nt.was) + ', стало ' + esc(nt.now) + ' · ' + esc((F.hall(s.hall) || {}).name || '') + '. Уведомление пришло в ' + esc(nt.at) + '.</div></div></div>' +
        '<div class="sec-title">Что это меняет в пути</div>' +
        '<div class="card">' + (confs.length ? PU.ul(confs.slice(0, 4).map(c => esc(PU.confText(c)))) + '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B7/' + it.id + '">Решить в «Конфликты»</button></div>'
          : '<div class="cap">Новое время не создаёт пересечений: запись остаётся как есть.</div>') + '</div>' +
        '<div class="sec-title">Что предлагает Секретарь</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        (next ? '<button class="row clickable" data-go="C3/' + next.id + '"><div class="grow"><div class="r-title">Показать следующую в этом зале</div><div class="r-sub">' + next.time + ' · ' + esc(cut(next.title, 60)) + '</div></div>' + icon('chevR') + '</button>' : '') +
        '<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow"><div class="r-title">Открыть сессию</div><div class="r-sub">' + esc(s.time) + ' · ' + esc(cut(s.title, 60)) + '</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="D5"><div class="grow"><div class="r-title">Мои записи</div><div class="r-sub">' + (canCancel ? 'отмена прежней записи возможна' : 'отмена закрыта: до начала меньше двух часов, напишите организатору') + '</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +
        (alts.length ? '<div class="sec-title">Другие практики</div><div class="cap pth-note">Ближайшие практики с датой и временем. Те, что пересекаются с вашим путём, помечены.</div>' + cards : '') +
        '<div class="pth-foot-btns"><button class="btn btn-secondary" data-go="B8">Дайджест дня</button>' +
        '<button class="btn btn-secondary" data-go="B4/' + PU.dayKey(F.PATH_NOW.day) + '">Таймлайн дня</button></div>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
  D.action('n4-book', el => {
    const s = F.session(el.dataset.arg); if (!s) return;
    const cf = P.conflictsFor({ id: s.id, day: s.day, time: s.time, dur: s.dur, hall: s.hall });
    sheet('Записаться на замену?', ul([
      '<b>' + esc(cut(s.title, 64)) + '</b>, ' + esc(s.time) + '–' + esc(F.sessionEnd(s)) + ', ' + esc((F.hall(s.hall) || {}).name || '') + '.',
      cf.soft.length ? 'Не успеваете: на переход нужно ' + cf.soft[0].need + ' мин, между событиями ' + cf.soft[0].gap + '.' : 'Жёстких пересечений с вашими записями нет.',
      'Запись создаётся после подтверждения и появится в «Моих записях». Отмена — до начала минус 2 часа.'
    ]), 'n4-book-do', s.id, 'Записаться');
  });
  D.action('n4-book-do', el => {
    const s = F.session(el.dataset.arg);
    D.closeSheet();
    if (!s || !P.bookSession(s.id)) return;
    PU.logEv('booked', 'Запись на замену: ' + cut(s.title, 40));
    D.rerender();
    PU.say('Вы записаны на замену');
  });

  /* ================= N6 Люди для знакомства ================= */
  D.register('N6', {
    tab: 'B1',
    meta: {
      title: 'N6 · Люди для знакомства',
      role: 'Участник, ИИ-подбор',
      fr: ['FR-AI-06', 'FR-PPL-10', 'FR-PPL-12', 'FR-SRCH-05'],
      ac: ['AC-AI-11', 'AC-PATH-03'],
      what: [
        'Те же люди и те же причины, что в блоке «Люди для знакомства» на B1: причина по таксономии (цель, запрос, пересечение), без числовой оценки совпадения.',
        'Кнопки «+ Путь», «Предложить встречу» (F11) и «Скрыть»; «Скрыть» убирает человека везде в разделе «Мой путь» (B1, N1, N6) до «Сбросить отказы» в настройках уведомлений (B3).',
        'Плашка подборки дня «Предметный кофе» ведёт в F6.'
      ],
      rules: [
        'Подбор выполняется автоматически по цели, запросу, отрасли и пользе; рейтинг и оценка совпадения не показываются (D-46).',
        '«Скрыть» убирает человека из рекомендаций без объяснений; общий набор отказов: FIX.PATH_DISMISSED.',
        '«+ Путь» запись не создаёт; встречу и заявку человек отправляет отдельно.'
      ],
      depends: ['D-46', 'D-50', 'FR-PPL-03 цели']
    },
    html() {
      PU.syncPhase();
      const list = PU.peopleList(5);
      const cards = list.map(pp => PU.personCardHTML(pp, { hide: true })).join('');
      return '<div class="scr">' +
        D.head({ back: 'B1', eyebrow: esc(F.NOW.dateLong), title: 'Люди для знакомства', sub: 'Подбор по вашим целям и пользе', paren: paren('совпадение объясняется причинами') }) +
        '<div class="pth-body">' +
        '<button class="banner info pth-banner" data-go="F6">' + icon('people') + '<span class="grow"><b class="b-title">Предметный кофе</b>' +
        '<span class="cap">подборка дня: люди, у которых есть пересечение с вашим запросом</span></span>' + icon('chevR') + '</button>' +
        (cards || '<div class="card pth-empty"><div class="e-title">Подборка пуста</div><div class="cap">Скрытые люди не показываются. Вернуть их можно кнопкой «Сбросить отказы» в настройках уведомлений.</div>' +
          '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B3">Настройки</button></div></div>') +
        '<div class="cap pth-note">Подбор выполняется автоматически. Скрыть человека можно в любой момент.</div>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
  D.action('n6-hide', el => {
    PU.dismiss('person', el.dataset.arg);
    PU.logEv('hidden', 'Скрыт человек: ' + ((F.person(el.dataset.arg) || {}).name || el.dataset.arg));
    D.rerender();
    PU.say('Скрыто из рекомендаций');
  });

  /* ================= N2 Штурман: запрос ================= */
  D.register('N2', {
    tab: 'B1',
    meta: {
      title: 'N2 · Штурман: запрос',
      role: 'Участник, ИИ-помощник',
      fr: ['FR-AI-05', 'FR-AI-07', 'FR-PATH-08'],
      ac: ['AC-AI-10', 'AC-AI-12'],
      what: [
        'Форма запроса к Штурману: цели дня, свободное время, ограничения.',
        'Подсказки по формату: что можно просить и что учтётся; быстрые цели чипами.',
        'Лимит запросов и переход к готовым маршрутам N3; связь с версиями пути (B5).'
      ],
      rules: [
        'Штурман учитывает программу, ваши записи и матрицу переездов.',
        'Лимит: 30 запросов в сутки на человека плюс лимит режима; при превышении работает замена без ИИ.',
        'Ответ можно проверить: источники видны в N1 и N3.'
      ],
      depends: ['D-49', 'программа', 'цели', 'матрица переездов']
    },
    html(ctx) {
      PU.syncPhase();
      const st = ctx.state;
      st.q = st.q || '';
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'ИИ · Штурман', title: 'Собрать день', sub: 'Цели и свободное время, затем варианты', paren: paren('учитывает ваши записи и переезды') }) +
        '<div class="pth-body">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Что хотите от дня</div>' +
        '<textarea class="textarea" rows="3" placeholder="Например: больше встреч с экспонентами, пропустить утренние кейсы, оставить вечер свободным" data-n2q>' + esc(st.q) + '</textarea></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Быстрые цели</div><div class="chips" style="flex-wrap:wrap">' +
        ['встречи с экспонентами', 'программа и спикеры', 'нетворкинг', 'воркшопы', 'свободное время'].map(g =>
          '<button class="chip" data-act="n2-goal" data-arg="' + esc(g) + '">' + esc(g) + '</button>').join('') + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Лимит: 30 запросов в сутки. Штурман не бронирует: выбранный вариант добавляется в «Мой путь» после подтверждения в листе.</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="N3">Построить варианты дня</button>' +
        '<button class="btn btn-ghost btn-block" data-go="B5">Версии пути на весь фестиваль</button>' +
        '<div class="pth-end"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('[data-n2q]');
      if (ta) ta.addEventListener('input', () => { D.st('N2').q = ta.value; });
    }
  });
  D.action('n2-goal', el => { const st = D.st('N2'); st.q = (st.q ? st.q + ' ' : '') + el.dataset.arg; D.rerender(); });

  /* ================= N5 Подборщик ================= */
  D.register('N5', {
    tab: 'B1',
    meta: {
      title: 'N5 · Подборщик',
      role: 'Участник, ИИ-подбор решений',
      fr: ['FR-AI-05', 'FR-AI-06', 'FR-PATH-06', 'FR-SRCH-07'],
      ac: ['AC-AI-11', 'AC-PATH-06', 'AC-PATH-03'],
      what: [
        'Задача подбора и до пяти решений с причинами; у каждого переход к карточке решения, «+ Путь» и «Предложить встречу».',
        'Доля решений с платным размещением показана числом и полосой относительно параметра; такие решения подписаны «на площадке», неплатные показаны рядом.',
        'Ссылка «Почему эти решения» (N8) и «Уточнить задачу» (диалог Ассистента); числовой оценки совпадения нет.'
      ],
      rules: [
        'Подбор объясним: показана причина (цель, запрос, пересечение, «на площадке»); оценка не показывается (D-46).',
        'Доля платных решений не выше параметра, по умолчанию 30% (FR-PATH-06); платное размещение помечено всегда.',
        'Лимит показов: 20 в сутки на человека; ранжирование по пакету не поднимает результат выше точного совпадения.'
      ],
      depends: ['D-39', 'D-46', 'параметр «доля платных пунктов»', 'карточки решений']
    },
    html() {
      PU.syncPhase();
      const P5 = F.PATH_PICKER, picks = P5.picks.filter(p => F.exhibitor(p.ex) && !PU.isDismissed('stand', p.ex));
      const paid = picks.filter(p => PU.isPaid(p.ex)).length, share = picks.length ? Math.round(paid * 100 / picks.length) : 0, lim = PU.PAID_LIMIT;
      const rows = picks.map(p => {
        const ex = F.exhibitor(p.ex); if (!ex) return '';
        const found = PU.findAny('stand', p.ex);
        const sp = found ? specOf(found) : { type: 'stand', ref: p.ex, day: '28.02', time: '13:15', dur: 15, hall: 'congress', place: 'Экспо · ' + ex.stand, title: 'Стенд: ' + ex.name };
        sp.paid = PU.isPaid(p.ex);
        return '<div class="pth-card pth-g-expo">' +
          '<button class="pth-it-main" data-go="H2/' + ex.id + '"><span class="pth-it-k"><span class="pth-kind">Стенд · ' + esc(ex.stand) + '</span>' +
          (PU.isPaid(p.ex) ? tag('на площадке', 'fill') : '') + '</span><span class="pth-it-t">' + esc(ex.name) + '</span>' +
          '<span class="pth-it-s"><span>' + esc(ex.what) + '</span></span><span class="pth-it-why">' + esc(PU.whyLine(p.reason.text)) + '</span>' +
          '<span class="pth-it-s">' + icon('clock') + '<span>' + esc(sp.day) + ', ' + esc(sp.time) + '</span></span></button>' +
          '<div class="pth-it-foot"><button class="btn btn-ghost btn-sm" data-go="G3/' + ex.id + '">Предложить встречу</button>' +
          '<span class="pth-it-act">' + plusBtn(sp, found) + '</span></div></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'ИИ · Подборщик', title: picks.length === 5 ? 'Пять решений' : 'Решения под задачу', sub: 'По вашей задаче и целям', paren: paren('причина показана у каждого решения') }) +
        '<div class="pth-body">' +
        '<div class="banner">' + icon('spark') + '<div style="flex:1"><div class="b-title">Ваша задача</div><div class="cap">' + esc(P5.task) + '</div></div></div>' +
        '<div class="card pth-share"><div class="pth-paid-t"><span>На площадке: <b>' + paid + ' из ' + picks.length + '</b> (' + share + '%)</span><small>не выше ' + lim + '%</small></div>' +
        '<span class="progress pth-paid-bar"><i style="width:' + Math.min(100, Math.round(share * 100 / lim)) + '%"></i></span>' +
        '<div class="cap">Решения с платным размещением подписаны «на площадке». Остальные подобраны только по задаче и целям.</div></div>' +
        '<div class="pth-tagrow">' + tag('Решения для роста бизнеса', 'accent') + '</div>' +
        (rows || '<div class="card pth-empty"><div class="cap">Решения скрыты. Вернуть их можно кнопкой «Сбросить отказы» в настройках уведомлений.</div>' +
          '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B3">Настройки</button></div></div>') +
        '<div class="pth-foot-col"><button class="btn btn-secondary" data-act="pth-ai-quick" data-arg="market">Уточнить задачу</button>' +
        '<button class="btn btn-secondary" data-go="N8">Почему эти решения</button></div>' +
        '<div class="cap pth-note">Лимит показов: 20 в сутки. Подбор учитывает вашу цель и запрос; оценка совпадения не показывается.</div>' +
        '<div class="pth-end"></div></div></div>';
    }
  });

  /* ================= N7 Хроникёр ================= */
  D.register('N7', {
    tab: 'B1',
    meta: {
      title: 'N7 · Хроникёр',
      role: 'Участник, ИИ-итоги',
      fr: ['FR-PATH-13', 'FR-AI-02', 'FR-MEET-11'],
      ac: ['AC-PATH-13', 'AC-AI-07'],
      what: [
        'Итог встречи и черновик письма второй стороне.',
        'Черновик строится по заметкам: проверьте перед отправкой.',
        'Кнопки «Скопировать черновик» и «Изменить текст»; переход к контактам после события (M6).'
      ],
      rules: [
        'Письмо только черновик: отправка по вашему действию.',
        'ИИ не добавляет фактов, которых нет в заметках и итоге встречи.',
        'Отправленное письмо попадает в историю контакта.'
      ],
      depends: ['D-49', 'заметки', 'итоги встреч']
    },
    html(ctx) {
      PU.syncPhase();
      const st = ctx.state, c = F.pathChronicle ? F.pathChronicle() : F.CHRONICLE, facts = (c.facts || []).join('; ');
      if (st.draft == null) st.draft = c.draft;
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'ИИ · Хроникёр', title: 'Итог встречи', sub: esc(c.meeting), paren: paren('черновик по вашим заметкам, проверьте') }) +
        '<div class="pth-body">' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Как прошла</div>' +
        '<div class="pth-wrapchips">' + tag(c.outcome, 'ok') + '</div><div class="pth-step">Следующий шаг: ' + esc(c.step) + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Черновик письма · от ' + esc(F.ME.name) + ' для ' + esc(c.to || 'участника встречи') + '</div>' +
        (st.edit ? '<textarea class="textarea" rows="6" data-n7draft>' + esc(st.draft) + '</textarea>'
          : '<div class="pth-draft">' + esc(st.draft) + '</div>') +
        (facts ? '<div class="cap" style="margin-top:8px">Основано на данных встречи: ' + esc(facts) + '. Других фактов в письме нет.</div>' : '') + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="n7-copy">Скопировать черновик</button>' +
        '<button class="btn btn-ghost btn-block" data-act="n7-edit">' + (st.edit ? 'Сохранить текст' : 'Изменить текст') + '</button>' +
        '<button class="btn btn-secondary btn-block" data-go="M6">Контакты после события</button>' +
        '<div class="pth-end"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('[data-n7draft]');
      if (ta) ta.addEventListener('input', () => { D.st('N7').draft = ta.value; });
    }
  });
  D.action('n7-copy', () => {
    const t = D.st('N7').draft;
    try { if (navigator.clipboard && t) navigator.clipboard.writeText(t); } catch (e) { /* в демо копирование необязательно */ }
    D.toast('Черновик скопирован');
  });
  D.action('n7-edit', () => {
    const st = D.st('N7');
    st.edit = !st.edit;
    D.rerender();
    PU.say(st.edit ? 'Правьте текст письма' : 'Текст сохранён');
  });

  /* ================= N8 Почему это в вашем пути ================= */
  const REASON_WHY = {
    goal: 'Цель из вашего профиля',
    request: 'Запрос на 30–90 дней из вашего профиля',
    overlap: 'Пересечение с вашим профилем или с человеком',
    onsite: 'Пункт организатора фестиваля',
    paid: 'Пометка «на площадке»: платное размещение экспонента',
    self: 'Вы добавили этот пункт сами'
  };
  D.register('N8', {
    tab: 'B1',
    meta: {
      title: 'N8 · Почему это в вашем пути',
      role: 'Участник, объяснение подбора',
      fr: ['FR-PATH-15', 'FR-AI-01', 'FR-AI-06', 'FR-PATH-05', 'FR-PATH-06'],
      ac: ['AC-PATH-15', 'AC-AI-06', 'AC-AI-11', 'AC-PATH-06'],
      what: [
        'Что учтено: цель и ещё цели, запрос на 30–90 дней, отрасль, хобби, чем вы полезны (значения из вашего профиля).',
        'Что не передаётся: контакты (телефон, e-mail, Telegram, ссылки на соцсети); имена шифруются и подставляются обратно при показе.',
        'Правило пометки «на площадке» и доля таких пунктов; ссылка на «Приватность» (L6) и на политику обработки данных.',
        'С параметром (id пункта, например N8/pi06) экран объясняет, почему именно этот пункт; подпись «подбор выполняется автоматически».'
      ],
      rules: [
        'Отказа от автоматизированного подбора нет: он работает на лету без показываемой оценки и без грейда человека (D-46).',
        'Причина собирается из структурированных данных: цель, запрос, пересечение, «на площадке», «вы добавили»; числовой оценки совпадения нет.',
        'Правила подбора описаны в политике обработки персональных данных (D-29); данные обрабатывают модели, размещённые в РФ (D-49).'
      ],
      depends: ['D-29', 'D-46', 'D-47', 'D-49', 'D-57']
    },
    html(ctx) {
      PU.syncPhase();
      const ME = F.ME;
      const it = ctx.param ? F.pathItem(ctx.param) : null;
      const doms = (ME.domains || []).map(c => (c === ME.mainDomain ? domainTitle(c) + ' (главная)' : domainTitle(c)));
      const rs = it && it.reason && it.reason.kind !== 'self' ? (it.reason.kind === 'onsite' ? '' : PU.whyBody(it.reason.text)) : '';
      const one = it ? '<div class="sec-title">Этот пункт</div>' + PU.itemHTML(it, { noMore: true, noAct: true, noConf: true, dayLabel: true }) +
        '<div class="card"><div class="card-title">' + esc(it.paid ? REASON_WHY.paid : (REASON_WHY[it.reason ? it.reason.kind : 'self'] || 'Причина')) + '</div>' +
        '<div class="cap">' + (rs ? esc(rs.charAt(0).toUpperCase() + rs.slice(1)) + '. ' : '') + 'Причина собрана из данных профиля и каталога, а не написана моделью.</div>' +
        (it.paid ? '<div class="cap">Размещение экспонента платное: пункт подписан «на площадке».</div>' : '') + '</div>' : '';
      const learned = [
        ['Цель', doms.join('; ') || '—'], ['Запрос на 30–90 дней', ME.request || '—'], ['Отрасль', ME.industry || '—'],
        ['Хобби', ME.hobby || '—'], ['Чем могу быть полезен', ME.usefulness || '—'],
        ['Оборот компании', 'учитывается только подбором и виден только вам']
      ];
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Мой путь', title: 'Почему это в вашем пути', sub: 'Как подбираются пункты, люди и решения', paren: paren('подбор выполняется автоматически') }) +
        '<div class="pth-body">' + one +
        '<div class="sec-title">Что учтено</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + learned.map(r =>
          '<div class="row"><div class="grow"><div class="r-sub" style="margin:0">' + r[0] + '</div><div class="r-title">' + esc(r[1]) + '</div></div></div>').join('') + '</div></div>' +
        '<div class="sec-title">Что не передаётся</div>' +
        '<div class="card">' + ul(['Контакты: телефон, e-mail, Telegram и ссылки на соцсети в ИИ не уходят.',
          'Имена шифруются: модель видит метки, а ваше имя подставляется обратно только при показе результата.']) + '</div>' +
        '<div class="sec-title">Метка «на площадке»</div>' +
        '<div class="card"><div class="cap pth-rule">Так подписаны решения экспонентов с платным размещением. Доля таких пунктов в версии пути не выше ' + PU.PAID_LIMIT + '%, платное размещение помечено всегда, а неплатные решения показываются рядом.</div></div>' +
        '<div class="pth-foot-btns"><button class="btn btn-secondary" data-go="L6">Приватность</button>' +
        '<button class="btn btn-secondary" data-act="n8-policy">Политика данных</button></div>' +
        '<div class="cap pth-note">Подбор выполняется автоматически и работает без показываемой оценки: числа совпадения и рейтинга людей нигде нет. Отключить подбор в настройках нельзя: он работает автоматически. Правила описаны в политике обработки персональных данных.</div>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
  D.action('n8-policy', () => D.toast('Откроется на atlantycity.ru'));
})();

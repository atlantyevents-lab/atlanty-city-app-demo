/* Блок N — ИИ-помощники. Фаза B: N1, N3, N4, N6. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  /* ---------- N1 Ассистент ---------- */
  D.register('N1', {
    tab: 'MORE',
    meta: {
      title: 'N1 · Ассистент',
      role: 'Гость / участник',
      fr: ['FR-AI-01', 'FR-AI-02'],
      ac: ['AC-AI-01'],
      what: [
        'Вопрос-ответ про площадку: где и когда проходит формат.',
        'Блок «Источник» — откуда взят ответ.',
        'Кнопка «Передать организатору» и пометка про тариф.'
      ],
      rules: [
        'Ответ учитывает тариф и программу гостя — видны только доступные форматы.',
        'Каждый ответ снабжён источником из материалов фестиваля.',
        'Ассистент не выдумывает: при отсутствии данных предлагает организатора.'
      ],
      depends: ['права на контент по тарифу', 'база знаний']
    },
    html(ctx) {
      const st = ctx.state;
      st.asked = !!st.asked;
      const A = F.AI_FAQ;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Помощник</div><h1>Ассистент</h1>' +
        '<div class="sub">Ответы по программе и площадке</div></div></div>' +
        '</div>' +
        paren('ответ учитывает ваш тариф') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="flex-direction:row;gap:10px;background:var(--surface-2)">' +
        '<span class="avatar" style="width:34px;height:34px;border-radius:10px">' + icon('spark') + '</span>' +
        '<div class="grow"><div style="font-size:14px"><b>Вы:</b> ' + esc(A.q) + '</div></div></div>' +
        '<div class="card"><div style="font-size:14.5px;line-height:1.55">' + esc(A.a) + '</div>' +
        '<div class="banner" style="margin-top:10px">' + icon('file') + '<div><div class="b-title" style="font-size:12.5px">Источник</div>' +
        '<div class="cap">' + esc(A.source) + '</div></div></div>' +
        '<div class="card-foot" style="margin-top:10px"><span class="cap">' + esc(A.tariffNote) + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-act="n1-ask">Передать организатору</button></div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Быстрые вопросы</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
        ['Где регистрация?', 'Как записаться на воркшоп?', 'Когда нетворкинг?'].map(q =>
          '<button class="chip" data-act="n1-quick" data-arg="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('n1-ask', () => D.toast('Вопрос передан организатору — ответ придёт уведомлением'));
  D.action('n1-quick', () => D.toast('Демо: покажем такой же ответ с источником'));

  /* ---------- N3 Штурман: варианты дня ---------- */
  D.register('N3', {
    tab: 'MORE',
    meta: {
      title: 'N3 · Штурман',
      role: 'Гость / участник',
      fr: ['FR-AI-03', 'FR-PROG-02'],
      ac: ['AC-AI-02'],
      what: [
        'Три варианта дня как переключаемые карточки с объяснением.',
        'Кнопка «В мою программу» добавляет вариант в личное расписание.',
        'Нагрузка каждого варианта показана в подзаголовке.'
      ],
      rules: [
        'Варианты строятся из программы, записи и встреч гостя.',
        'Выбор варианта не бронирует сессии — это план, записи отдельно.',
        '«В мою программу» помечает день как «план Штурмана».'
      ],
      depends: ['база программы', 'личное расписание']
    },
    html(ctx) {
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
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Штурман</h1>' +
        '<div class="sub">Три варианта дня под ваши цели</div></div></div>' +
        '</div>' +
        paren('вариант — план, записи делаются отдельно') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' + cards +
        '<div class="banner">' + icon('info') + '<div class="cap">Выбран «' + esc(cur.title) + '»: ' + esc(cur.desc) + '</div></div>' +
        '<button class="btn ' + (st.added ? 'btn-secondary' : 'btn-primary') + ' btn-block" data-act="n3-add">' +
        icon('calendar') + (st.added ? 'В вашей программе' : 'В мою программу') + '</button>' +
        '<button class="btn btn-ghost btn-block" data-go="C4">' + icon('bookmark') + 'Открыть мою программу</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('n3-sel', el => { D.st('N3').sel = el.dataset.arg; D.st('N3').added = false; D.rerender(); });
  D.action('n3-add', () => {
    const st = D.st('N3');
    st.added = !st.added;
    D.toast(st.added ? 'План дня добавлен в программу' : 'План убран из программы');
    D.rerender();
  });

  /* ---------- N4 Секретарь: замены ---------- */
  D.register('N4', {
    tab: 'MORE',
    meta: {
      title: 'N4 · Секретарь',
      role: 'Гость / участник',
      fr: ['FR-PROG-05', 'FR-NTF-02'],
      ac: ['AC-PROG-05'],
      what: [
        'Сессия из вашей программы отменена — карточка с альтернативами.',
        'Три замены с временем и залом, время перехода из текущей точки.',
        'Кнопки «Записаться» и «Пропустить» у каждой замены.'
      ],
      rules: [
        'Секретарь срабатывает на изменение программы по вашим записям.',
        'Замены подбираются по близости времени и теме трека.',
        'Время перехода считается по матрице переездов от текущего места.'
      ],
      depends: ['матрица переездов', 'фид изменений']
    },
    html(ctx) {
      const st = ctx.state;
      st.booked = st.booked || null;
      const A = F.SECRETARY_ALT;
      const toMin = t => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3));
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Секретарь · ' + esc(F.NOW.dateLong) + '</div><h1>Сессия отменена</h1>' +
        '<div class="sub">' + esc(A.cancelled) + ' · ' + esc(A.was) + ' · ' + esc(A.hall) + '</div></div></div>' +
        '</div>' +
        paren('три варианта с учётом ваших записей') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="banner warn">' + icon('alert') + '<div><div class="b-title">Ваша запись отменена организатором</div>' +
        '<div class="cap">Окно освободилось. Вот три замены — все с запасом на переход.</div></div></div>' +
        A.alts.map((a, i) =>
          '<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
          '<div class="grow" style="min-width:0"><div class="r-title" style="font-size:14.5px">' + esc(a.title) + '</div>' +
          '<div class="r-sub">' + esc(a.time) + ' · ' + esc(a.hall) + '</div>' +
          '<div class="cap" style="margin-top:4px">' + esc(a.note) + '</div></div>' +
          '<span class="sess-time">' + a.move + '</span></div>' +
          '<div class="card-foot"><span class="cap">' + esc(a.move) + '</span>' +
          '<button class="btn ' + (st.booked === i ? 'btn-secondary' : 'btn-primary') + ' btn-sm" data-act="n4-book" data-arg="' + i + '">' +
          (st.booked === i ? 'Записаны' : 'Записаться') + '</button></div></div>').join('') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('n4-book', el => {
    const st = D.st('N4');
    st.booked = st.booked === parseInt(el.dataset.arg, 10) ? null : parseInt(el.dataset.arg, 10);
    D.toast(st.booked == null ? 'Запись отменена' : 'Вы записаны на замену');
    D.rerender();
  });

  /* ---------- N6 Люди для знакомства ---------- */
  D.register('N6', {
    tab: 'MORE',
    meta: {
      title: 'N6 · Люди для знакомства',
      role: 'Гость / участник',
      fr: ['FR-PPL-08', 'FR-PPL-09'],
      ac: ['AC-PPL-05'],
      what: [
        'Рекомендованные люди с блоком «Почему вам» — чипы причин.',
        'Кнопки «Познакомиться» (заявка) и «Скрыть» (убрать из подборки).',
        'Рейтинг совпадения не показывается — только причины.'
      ],
      rules: [
        'Подбор по целям, пользе и отрасли — без продажи «рейтинга».',
        '«Скрыть» убирает человека из рекомендаций без объяснений.',
        '«Познакомиться» создаёт заявку на знакомство с причиной.'
      ],
      depends: ['FR-PPL-03 цели', 'FR-PPL-08']
    },
    html(ctx) {
      const st = ctx.state;
      st.hidden = st.hidden || {};
      const picks = F.PEOPLE_PICKS.filter(pk => !st.hidden[pk.person]);
      const cards = picks.map(pk => {
        const p = F.person(pk.person);
        if (!p) return '';
        const why = pk.why.map(w => '<span class="chip">' + esc(w) + '</span>').join('');
        return '<div class="card"><div style="display:flex;gap:12px;align-items:flex-start">' +
          avatar(p.name, 'sm') +
          '<div class="grow" style="min-width:0"><div class="r-title" style="font-size:14.5px">' + esc(p.name) + '</div>' +
          '<div class="r-sub">' + esc(p.company) + ' · ' + esc(p.role) + '</div>' +
          '<div class="cap" style="margin-top:6px">цель: ' + esc(p.goal) + ' · свободно ' + esc(p.free) + '</div>' +
          '<div class="cap" style="margin-top:8px;font-weight:600">Почему вам</div>' +
          '<div class="tags-row" style="margin-top:4px">' + why + '</div></div></div>' +
          '<div class="card-foot" style="margin-top:10px"><span class="cap">' + pk.rank + '-й по совпадению</span>' +
          '<div style="display:flex;gap:6px"><button class="btn btn-secondary btn-sm" data-go="F3/' + p.id + '">Познакомиться</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="n6-hide" data-arg="' + p.id + '">Скрыть</button></div></div></div>';
      }).join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Люди для знакомства</h1>' +
        '<div class="sub">Подбор по вашим целям и пользе</div></div></div>' +
        '</div>' +
        paren('совпадение объясняется причинами, не рейтингом') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        (cards || '<div class="empty topo-host">' + D.topo() + '<div class="e-title">Подборка пуста</div><div class="e-text">Скрытые люди не показываются. Измените цели в профиле — появятся новые.</div></div>') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('n6-hide', el => {
    const st = D.st('N6');
    st.hidden = st.hidden || {};
    st.hidden[el.dataset.arg] = true;
    D.toast('Скрыто из рекомендаций');
    D.rerender();
  });

  /* ---------- N2 Штурман: запрос ---------- */
  D.register('N2', {
    tab: 'MORE',
    meta: {
      title: 'N2 · Штурман: запрос',
      role: 'Гость, ИИ-помощник',
      fr: ['FR-AI-NAV'],
      ac: ['AC-AI-NAV'],
      what: [
        'Форма запроса к Штурману: цели дня, свободное время, ограничения.',
        'Подсказки по формату: что можно просить и что учтётся.',
        'Лимит запросов и переход к готовым маршрутам N3.'
      ],
      rules: [
        'Штурман учитывает программу, ваши записи и матрицу переездов.',
        'Лимит — 30 запросов в сутки на человека.',
        'Ответ всегда можно проверить по источникам — кнопка «Источник» в N3/N1.'
      ],
      depends: ['программа', 'цели', 'матрица переездов']
    },
    html(ctx) {
      const st = ctx.state;
      st.q = st.q || '';
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="N3" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">ИИ · Штурман</div><h1>Собрать день</h1>' +
        '<div class="sub">цели и свободное время — и получите варианты</div></div></div>' +
        '</div>' +
        paren('учитывает ваши записи и переезды') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Что хотите от дня</div>' +
        '<textarea class="textarea" rows="3" placeholder="Например: больше встреч с экспонентами, пропустить утренние кейсы, оставить вечер свободным" data-n2q>' + esc(st.q) + '</textarea></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Быстрые цели</div><div class="chips" style="flex-wrap:wrap">' +
        ['встречи с экспонентами','программа и спикеры','нетворкинг','воркшопы','свободное время'].map(g =>
          '<button class="chip" data-act="n2-goal" data-arg="' + esc(g) + '">' + esc(g) + '</button>').join('') + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Лимит — 30 запросов в сутки. Штурман не бронирует: выбранный вариант добавляется в вашу программу вручную.</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="N3">Построить варианты дня</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('[data-n2q]');
      if (ta) ta.addEventListener('input', () => { D.st('N2').q = ta.value; });
    }
  });
  D.action('n2-goal', el => { const st = D.st('N2'); st.q = (st.q ? st.q + ' ' : '') + el.dataset.arg; D.rerender(); });

  /* ---------- N5 Подборщик ---------- */
  D.register('N5', {
    tab: 'MORE',
    meta: {
      title: 'N5 · Подборщик',
      role: 'Гость, ИИ-подбор',
      fr: ['FR-AI-PICK'],
      ac: ['AC-AI-PICK'],
      what: [
        'Задача подбора и пять экспонентов с причинами совпадения.',
        'У каждого — оценка совпадения и переход к карточке решения.',
        'Лимит показов и честное «почему именно они».'
      ],
      rules: [
        'Подбор объясним: причины видны, а не только оценка.',
        'Лимит показов — 20 в сутки на человека.',
        'В UI называется «подбор» — без внутренних терминов.'
      ],
      depends: ['карточки решений', 'цели']
    },
    html(ctx) {
      const t = F.PICKER_TASK;
      const rows = t.picks.map(p => {
        const ex = F.exhibitor(p.ex);
        return '<button class="row clickable" data-go="H2/' + p.ex + '"><div class="grow"><div class="r-title">' + esc(ex.name) + ' ' + tag(p.score, 'accent') + '</div>' +
          '<div class="r-sub">' + esc(ex.what) + ' · ' + esc(ex.stand) + '</div>' +
          '<div class="cap" style="margin-top:2px">' + esc(p.why) + '</div></div>' + icon('chevR') + '</button>';
      }).join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">ИИ · Подборщик</div><h1>Пять решений</h1>' +
        '<div class="sub">по вашей задаче и целям</div></div></div>' +
        '</div>' +
        paren('каждая причина объяснима') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="banner">' + icon('spark') + '<div style="flex:1"><div class="b-title">Ваша задача</div>' +
        '<div class="cap">' + esc(t.text) + '</div></div></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Лимит показов — 20 в сутки. Подбор учитывает ваш тариф и записи.</div></div>' +
        '<button class="btn btn-ghost btn-block" data-go="N2">Уточнить задачу</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- N7 Хроникёр ---------- */
  D.register('N7', {
    tab: 'MORE',
    meta: {
      title: 'N7 · Хроникёр',
      role: 'Гость, ИИ-итоги',
      fr: ['FR-AI-CHR'],
      ac: ['AC-AI-CHR'],
      what: [
        'Итог встречи и черновик письма второй стороне.',
        'Черновик строится по вашим заметкам — проверьте перед отправкой.',
        'Кнопки «Скопировать», «Отправить», «Изменить».'
      ],
      rules: [
        'Письмо — черновик: отправка только по вашему действию.',
        'ИИ не добавляет фактов, которых нет в заметках и итоге встречи.',
        'Отправленное письмо попадает в историю контакта.'
      ],
      depends: ['заметки', 'итоги встреч']
    },
    html(ctx) {
      const c = F.CHRONICLE;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="G8" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">ИИ · Хроникёр</div><h1>Итог встречи</h1>' +
        '<div class="sub">' + esc(c.meeting) + '</div></div></div>' +
        '</div>' +
        paren('черновик по вашим заметкам — проверьте') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Как прошла</div>' +
        '<div class="chips">' + tag(c.outcome, 'ok') + tag('следующий шаг: ' + c.step, 'accent') + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Черновик письма · ' + esc(F.ME.first) + ' › Игорь Власов</div>' +
        '<div style="font-size:13.5px;line-height:1.6;background:var(--surface);border-radius:12px;padding:12px">' + esc(c.draft) + '…</div>' +
        '<div class="cap" style="margin-top:8px">Основано на ваших заметках: «' + esc(F.NOTES[3].text.slice(0, 60)) + '…»</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="n7-copy">Скопировать черновик</button>' +
        '<button class="btn btn-ghost btn-block" data-act="n7-edit">Изменить текст</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('n7-copy', () => D.toast('Черновик скопирован'));
  D.action('n7-edit', () => D.toast('Откроется редактор письма'));
})();

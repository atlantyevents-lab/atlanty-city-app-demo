/* Блок I — кабинет экспонента (вид «ТехноСклад»). Фаза B: I1, I2, I8. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  /* ---------- I1 Кабинет экспонента ---------- */
  D.register('I1', {
    tab: 'MORE',
    meta: {
      title: 'I1 · Кабинет экспонента',
      role: 'Экспонент, телефон',
      fr: ['FR-EXH-01', 'FR-EXH-02'],
      ac: ['AC-EXH-01'],
      what: [
        'Сводка компании: решение, кластер, пакет участия и статус модерации.',
        'KPI дня: просмотры карточки, «Изучить», запросы встреч, контакты.',
        'Список задач (чек-лист) и ближайшие встречи на стенде.'
      ],
      rules: [
        'Показатели — за текущий день, обновляются по факту событий.',
        'Задачи кабинета обязательны для публикации карточки и раздачи бейджей.',
        'Все числа — демо из фикстур.'
      ],
      depends: ['пакет экспонента', 'модерация EXH']
    },
    html(ctx) {
      const st = ctx.state;
      const kpi = F.EXH.kpi;
      const tasks = F.EXH.tasks;
      st.taskDone = st.taskDone || {};
      const tasksHtml = tasks.map((t, i) =>
        '<div class="toggle-row"><div style="flex:1;min-width:0"><div class="tr-title" style="font-weight:500">' + esc(t) + '</div></div>' +
        '<label class="toggle"><input type="checkbox" data-task="' + i + '"' + (st.taskDone[i] ? ' checked' : '') + '><span class="tr"></span></label></div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Кабинет · ' + esc(F.NOW.dateLong) + '</div><h1>' + esc(F.EXH.company) + '</h1>' +
        '<div class="sub">' + esc(F.EXH.what) + ' · пакет ' + esc(F.EXH.pack) + '</div></div>' +
        '<span class="hb-badge">экспонент</span></div>' +
        '</div>' +
        paren('показатели за сегодня, демо-данные') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="kpi-row">' + kpi.slice(0, 2).map(k =>
          '<div class="kpi-cell"><div class="k">' + esc(k.label) + '</div><div class="v">' + esc(k.value) + '</div><div class="cap">' + esc(k.delta) + '</div></div>').join('') + '</div>' +
        '<div class="kpi-row">' + kpi.slice(2).map(k =>
          '<div class="kpi-cell"><div class="k">' + esc(k.label) + '</div><div class="v">' + esc(k.value) + '</div><div class="cap">' + esc(k.delta) + '</div></div>').join('') + '</div>' +
        '<div class="sec-title">Задачи дня</div>' +
        '<div class="card" style="padding:4px 16px">' + tasksHtml + '</div>' +
        '<div class="sec-title">Ближайшие встречи<button class="more" data-go="I2">Все контакты</button></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        F.EXH.upcoming.map(u => '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(u.time) + ' · ' + esc(u.who) + '</div><div class="r-sub">' + esc(u.space) + '</div></div>' +
          '<span class="mc-status ' + (u.status === 'confirmed' ? 'ok' : 'wait') + '">' + (u.status === 'confirmed' ? 'подтв.' : 'ждёт') + '</span></div>').join('') +
        '</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="i1-profile">Дополнить профиль</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      host.querySelectorAll('[data-task]').forEach(inp => inp.addEventListener('change', () => {
        const st = D.st('I1');
        st.taskDone = st.taskDone || {};
        st.taskDone[inp.dataset.task] = inp.checked;
        D.toast(inp.checked ? 'Задача отмечена' : 'Задача снята');
      }));
    }
  });

  D.action('i1-profile', () => {
    D.openSheet('<div class="sheet-title">Профиль компании</div>' +
      '<div class="card"><div class="fgrid">' +
      '<div class="fcell"><div class="cap">Компания</div><div class="fval">' + esc(F.EXH.company) + '</div></div>' +
      '<div class="fcell"><div class="cap">Решение</div><div class="fval">' + esc(F.EXH.what) + '</div></div>' +
      '<div class="fcell"><div class="cap">Пакет</div><div class="fval">' + esc(F.EXH.pack) + '</div></div>' +
      '<div class="fcell"><div class="cap">Статус</div><div class="fval">' + esc(F.EXH.status) + '</div></div></div></div>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Закрыть</button>');
  });

  /* ---------- I2 Контакты экспонента ---------- */
  D.register('I2', {
    tab: 'MORE',
    meta: {
      title: 'I2 · Контакты экспонента',
      role: 'Экспонент, телефон',
      fr: ['FR-EXH-03', 'FR-EXH-04'],
      ac: ['AC-EXH-02'],
      what: [
        'Список контактов, полученных на стенде и встречах, с метками температуры.',
        'Фильтры по статусу: горячий, тёплый, холодный.',
        'Заметка и следующий шаг по каждому контакту; экспорт в CSV.'
      ],
      rules: [
        'Контакт появляется после сканирования или подтверждённой встречи — с согласием человека.',
        'Метки ставит экспонент вручную; «горячий» подсвечивается в списке.',
        'Экспорт — только по своим контактам, с журналом выгрузки.'
      ],
      depends: ['FR-PPL-08 согласие на передачу']
    },
    html(ctx) {
      const st = ctx.state;
      st.f = st.f || 'all';
      const heats = { all: 'Все', hot: 'Горячие', warm: 'Тёплые', cold: 'Холодные' };
      let list = F.EXH.contacts;
      if (st.f !== 'all') list = list.filter(c => c.heat === st.f);
      const chips = Object.keys(heats).map(k =>
        '<button class="chip' + (st.f === k ? ' on' : '') + '" data-act="i2-filter" data-arg="' + k + '">' + heats[k] + '</button>').join('');
      const rows = list.map(c =>
        '<button class="card interactive" data-go="I3/' + c.id + '" style="padding:12px 14px;text-align:left;width:100%"><div style="display:flex;gap:10px;align-items:flex-start">' +
        avatar(c.name, 'sm') +
        '<div class="grow" style="min-width:0"><div class="r-title" style="font-size:14.5px">' + esc(c.name) + '</div>' +
        '<div class="r-sub">' + esc(c.company) + ' · ' + esc(c.role) + '</div>' +
        '<div class="cap" style="margin-top:4px">' + esc(c.note) + '</div>' +
        '<div class="cap" style="margin-top:2px">шаг: ' + esc(c.step) + '</div></div>' +
        '<span class="heat ' + c.heat + '">' + heats[c.heat].toLowerCase().replace(/ые$/, 'ий').replace('холодний', 'холодный') + '</span></div></button>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.EXH.company) + '</div><h1>Контакты</h1>' +
        '<div class="sub">' + list.length + ' из ' + F.EXH.contacts.length + ' · получены на фестивале</div></div>' +
        '<button class="icon-btn" data-act="i2-export" aria-label="Экспорт">' + icon('download') + '</button></div>' +
        '</div>' +
        paren('контакты — только с согласием человека') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + chips + '</div>' +
        rows +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('i2-filter', el => { D.st('I2').f = el.dataset.arg; D.rerender(); });
  D.action('i2-export', () => D.toast('CSV с контактами подготовлен — скачивание в демо не выполняется'));

  /* ---------- I8 Аналитика экспонента ---------- */
  D.register('I8', {
    tab: 'MORE',
    meta: {
      title: 'I8 · Аналитика экспонента',
      role: 'Экспонент, телефон',
      fr: ['FR-EXH-05', 'FR-EXH-06'],
      ac: ['AC-EXH-03'],
      what: [
        'Воронка дня: показы карточки › «Изучить» › запросы встреч › состоявшиеся.',
        'Контакты по часам и заполняемость — SVG-графики.',
        'Сравнение с медианой по экспонентам без названий компаний.'
      ],
      rules: [
        'Данные — только по своему стенду; медиана анонимна.',
        'Показатели считаются по фактам сканирований и встреч.',
        'Все числа — демо из фикстур.'
      ],
      depends: ['счётчики показов', 'медиана EXH.median']
    },
    html(ctx) {
      const st = ctx.state;
      st.period = st.period || 'day';
      const periods = [['day', 'Сегодня'], ['week', 'Неделя'], ['all', 'Весь фестиваль']];
      const chips = periods.map(p =>
        '<button class="chip' + (st.period === p[0] ? ' on' : '') + '" data-act="i8-period" data-arg="' + p[0] + '">' + p[1] + '</button>').join('');
      const E = F.EXH;

      /* воронка */
      const max = E.funnel[0].value;
      const funnel = E.funnel.map(f =>
        '<div class="funnel-row"><div class="fr-label">' + esc(f.label) + '</div>' +
        '<div class="fr-bar"><i style="width:' + Math.round(f.value / max * 100) + '%"></i></div>' +
        '<div class="fr-val">' + f.value.toLocaleString('ru') + '</div></div>').join('');

      /* почасовые контакты */
      const W = 320, H = 120, maxV = Math.max(...E.hourly.map(h => h.v));
      const bw = W / E.hourly.length;
      const bars = E.hourly.map((h, i) =>
        '<rect class="bar" x="' + (i * bw + 3).toFixed(1) + '" y="' + (H - h.v / maxV * (H - 18)).toFixed(1) + '" width="' + (bw - 6).toFixed(1) + '" height="' + (h.v / maxV * (H - 18)).toFixed(1) + '" rx="3"/>' +
        '<text class="lbl" x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (H - 2) + '" text-anchor="middle">' + h.h + '</text>').join('');
      const chart = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' + bars + '</svg>';

      /* сравнение с медианой */
      const cmp = E.funnel.map((f, i) => {
        const m = E.median.funnel[i];
        const pct = Math.round((f.value - m) / m * 100);
        return '<div class="funnel-row"><div class="fr-label">' + esc(f.label) + '</div>' +
          '<div class="fr-bar"><i style="width:' + Math.min(100, Math.max(4, pct + 50)) + '%;background:' + (pct >= 0 ? 'var(--ok)' : 'var(--err)') + '"></i></div>' +
          '<div class="fr-val">' + (pct >= 0 ? '+' : '') + pct + '%</div></div>';
      }).join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.EXH.company) + '</div><h1>Аналитика</h1>' +
        '<div class="sub">Воронка и контакты по часам</div></div></div>' +
        '</div>' +
        paren('демо-данные · медиана анонимна') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Воронка дня</div>' + funnel + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Контакты по часам</div>' + chart +
        '<div class="cap" style="margin-top:6px">пик — ' + E.hourly.reduce((a, b) => a.v > b.v ? a : b).h + ':00, ' + E.hourly.reduce((a, b) => a.v > b.v ? a : b).v + ' контактов</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">К медиане по экспонентам</div>' + cmp +
        '<div class="cap" style="margin-top:8px">' + esc(E.median.note) + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Сравнение без названий компаний — только агрегированная медиана.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('i8-period', el => { D.st('I8').period = el.dataset.arg; D.rerender(); });

  /* ---------- I3 Карточка контакта ---------- */
  D.register('I3', {
    tab: 'I2',
    meta: {
      title: 'I3 · Карточка контакта',
      role: 'Экспонент, работа с контактами',
      fr: ['FR-EXH-06'],
      ac: ['AC-EXH-06'],
      what: [
        'Карточка контакта: имя, компания, роль, заметка, следующий шаг.',
        'Воронка этапов: новый, контакт, встреча, предложение, договорённость, не актуально.',
        'История касаний: скан, встреча, заметки команды.'
      ],
      rules: [
        'Контакт появляется только по согласию участника на обмен.',
        'Этап воронки меняет представитель; история пишется автоматически.',
        '«Не актуально» скрывает контакт из рабочих списков, данные хранятся.'
      ],
      depends: ['согласие на обмен', 'заметки']
    },
    html(ctx) {
      const st = ctx.state;
      const c = (ctx.param && F.EXH.contacts.find(x => x.id === ctx.param)) || F.EXH.contacts[0];
      st.stage = st.stage || 'встреча';
      const stages = F.FUNNEL_STAGES;
      const heatTag = { hot: 'urgent', warm: 'accent', cold: '' };
      const stageBtns = stages.map(s =>
        '<button class="chip' + (st.stage === s ? ' on' : '') + '" data-act="i3-stage" data-arg="' + s + '">' + esc(s) + '</button>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I2" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Контакт</div><h1>' + esc(c.name) + '</h1>' +
        '<div class="sub">' + esc(c.company) + ' · ' + esc(c.role) + '</div></div>' +
        tag(c.heat === 'hot' ? 'горячий' : c.heat === 'warm' ? 'тёплый' : 'холодный', heatTag[c.heat] || '') + '</div>' +
        '</div>' +
        paren('этап воронки выбираете вы') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Заметка</div>' +
        '<div style="font-size:14px;line-height:1.55">' + esc(c.note) + '</div>' +
        '<div class="cap" style="margin-top:8px">Следующий шаг: ' + esc(c.step) + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Этап воронки · ' + esc(st.stage) + '</div>' +
        '<div class="chips" style="flex-wrap:wrap">' + stageBtns + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">История</div>' +
        '<div class="feed-item"><span class="feed-kind"></span><div><div class="feed-text">Скан визитки на стенде А-12</div><div class="feed-time">сегодня, 10:58</div></div></div>' +
        '<div class="feed-item"><span class="feed-kind" style="background:var(--ok)"></span><div><div class="feed-text">Встреча состоялась · 14:00–14:30</div><div class="feed-time">сегодня</div></div></div>' +
        '<div class="feed-item"><span class="feed-kind"></span><div><div class="feed-text">Заметка добавлена командой</div><div class="feed-time">сегодня, 14:35</div></div></div></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" style="flex:1;min-width:130px" data-act="i3-step">Записать шаг</button>' +
        '<button class="btn btn-secondary" style="flex:1;min-width:120px" data-go="G2">Встреча</button></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('i3-stage', el => { D.st('I3').stage = el.dataset.arg; D.rerender(); });
  D.action('i3-step', () => D.toast('Следующий шаг сохранён в карточке'));

  /* ---------- I4 Команда и квота ---------- */
  D.register('I4', {
    tab: 'I2',
    meta: {
      title: 'I4 · Команда и квота',
      role: 'Экспонент, администрирование',
      fr: ['FR-ACC-05'],
      ac: ['AC-ACC-05'],
      what: [
        'Состав команды экспонента и занятые места квоты: «3 из 5».',
        'Приглашение нового представителя по e-mail.',
        'Статусы: в команде, приглашение отправлено, истекло.'
      ],
      rules: [
        'Квота представителей зависит от пакета участника; место освобождается при удалении.',
        'Приглашение живёт 72 часа; повторная отправка — после истечения.',
        'Каждый представитель видит только свою статистику и контакты.'
      ],
      depends: ['пакеты участия', 'права ролей']
    },
    html(ctx) {
      const used = 3, total = 5;
      const rows = F.EXH_TEAM.map(m =>
        '<div class="row"><div class="grow"><div class="r-title">' + esc(m.name) + '</div>' +
        '<div class="r-sub">' + esc(m.role) + '</div></div>' +
        '<span class="mc-status ' + (m.status === 'в команде' ? 'ok' : 'wait') + '">' + esc(m.status) + '</span></div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Кабинет экспонента</div><h1>Команда</h1>' +
        '<div class="sub">' + esc(F.EXH.company) + ' · пакет ' + esc(F.EXH.pack) + '</div></div></div>' +
        '</div>' +
        paren('места квоты — по пакету участия') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card accent-edge" style="text-align:center;padding:20px 16px"><div class="cap">представителей в команде</div>' +
        '<div style="font-family:var(--font-display);font-size:44px;color:var(--accent-display)">' + used + ' <span style="font-size:22px;color:var(--ink-dim)">из ' + total + '</span></div>' +
        '<div class="cap" style="margin-top:4px">свободно мест: ' + (total - used) + '</div></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Пригласить представителя</div>' +
        '<div class="row"><input class="input" style="flex:1" placeholder="e-mail коллеги" data-i4mail>' +
        '<button class="btn btn-primary btn-sm" data-act="i4-invite">Пригласить</button></div></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('[data-i4mail]');
      if (inp) inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') D.act && document.querySelector('[data-act="i4-invite"]').click(); });
    }
  });
  D.action('i4-invite', el => {
    const inp = document.querySelector('[data-i4mail]');
    const v = inp && inp.value.trim();
    D.toast(v ? 'Приглашение отправлено: ' + v : 'Введите e-mail коллеги');
    if (v) inp.value = '';
  });

  /* ---------- I5 Доступность ---------- */
  D.register('I5', {
    tab: 'I2',
    meta: {
      title: 'I5 · Доступность',
      role: 'Экспонент, встречи',
      fr: ['FR-EXH-03'],
      ac: ['AC-EXH-03'],
      what: [
        'Окна встреч на сегодня и завтра: занятость по пространствам стенда.',
        'Настройка автопринятия заявок приглашённых покупателей.',
        'Исключения: обед и время воркшопа.'
      ],
      rules: [
        'Окна — 20/30/60 минут по типу пространства; шаг сетки 30 минут.',
        'Автопринятие действует только для приглашённых покупателей (Hosted Buyer).',
        'Изменение доступности не трогает уже подтверждённые встречи.'
      ],
      depends: ['окна встреч', 'Hosted Buyer']
    },
    html(ctx) {
      const hb = F.HB;
      const wins = F.spaceWindows('ms-booth').slice(0, 12);
      const chips = wins.map(w =>
        '<span class="chip' + (w.status === 'taken' ? ' on' : '') + '" style="' + (w.status === 'taken' ? '' : 'opacity:.45') + '">' + esc(w.label) + '</span>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Кабинет экспонента</div><h1>Доступность</h1>' +
        '<div class="sub">' + esc(F.EXH.company) + ' · стенд А-12</div></div></div>' +
        '</div>' +
        paren('окна сегодня и завтра') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Сегодня · свободные и занятые окна</div>' +
        '<div class="chips" style="flex-wrap:wrap">' + chips + '</div></div>' +
        '<div class="banner ok">' + icon('check') + '<div style="flex:1"><div class="b-title">Автопринятие Hosted Buyer</div>' +
        '<div class="cap">' + esc(hb.name) + ' (' + esc(hb.company) + ') — заявки подтверждаются сразу, ' +
        'обязательных окон: осталось ' + hb.quota.left + ' из ' + hb.quota.total + '.</div></div></div>' +
        '<div class="toggle-row"><div style="flex:1"><div class="tr-title">Автопринимать приглашённых покупателей</div>' +
        '<div class="tr-sub">только для гостей с бейджем Hosted Buyer</div></div>' +
        '<label class="toggle"><input type="checkbox" checked data-i5auto><span class="tr"></span></label></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Исключения</div>' +
        '<div class="r-sub">13:00–13:45 — воркшоп; 12:30–13:00 — обед команды. В эти окна заявки не предлагаются.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('[data-i5auto]');
      if (inp) inp.addEventListener('change', () => D.toast(inp.checked ? 'Автоприём включён' : 'Автоприём выключен — заявки ждут ручного подтверждения'));
    }
  });

  /* ---------- I6 Воркшоп ---------- */
  D.register('I6', {
    tab: 'I2',
    meta: {
      title: 'I6 · Воркшоп',
      role: 'Экспонент, программа',
      fr: ['FR-EXH-04'],
      ac: ['AC-EXH-04'],
      what: [
        'Создание воркшопа: название, время, зал, лимит мест.',
        'Список записавшихся участников и их контакты по согласию.',
        'Статус модерации карточки воркшопа.'
      ],
      rules: [
        'Лимит мест задаёт экспонент; запись сверх лимита закрыта.',
        'Список участников виден экспоненту; публично — только число записавшихся.',
        'Воркшоп публикуется после модерации организатором.'
      ],
      depends: ['модерация программы', 'места']
    },
    html(ctx) {
      const w = F.EXH_WORKSHOP;
      const rows = w.signedUp.map((n, i) =>
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + (i + 1) + '. ' + esc(n) + '</div></div>' +
        '<span class="mc-status ok">записан</span></div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Кабинет экспонента</div><h1>Воркшоп</h1>' +
        '<div class="sub">' + esc(F.EXH.company) + '</div></div></div>' +
        '</div>' +
        paren('список виден только вам') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Ваша заявка на модерации</div>' +
        '<div class="r-title" style="font-size:15px">' + esc(w.title) + '</div>' +
        '<div class="r-sub" style="margin-top:4px">' + esc(w.time) + ' · ' + esc(w.hall) + ' · мест: ' + w.signed + ' из ' + w.cap + '</div>' +
        '<div style="margin-top:8px">' + tag('на модерации', 'wait') + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Записавшиеся · ' + w.signedUp.length + ' показаны</div>' +
        '<div class="list" style="padding:0">' + rows + '</div></div>' +
        '<button class="btn btn-secondary btn-block" data-act="i6-new">Создать ещё воркшоп</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('i6-new', () => D.toast('Форма создания: название, время, зал, лимит'));

  /* ---------- I7 Заявки ---------- */
  D.register('I7', {
    tab: 'I2',
    meta: {
      title: 'I7 · Заявки на встречи',
      role: 'Экспонент, входящие',
      fr: ['FR-EXH-05'],
      ac: ['AC-EXH-05'],
      what: [
        'Входящие заявки на встречи со стендом: кто, когда, где.',
        'Действия: принять, отклонить, предложить другое время.',
        'Счётчик подтверждённых за день.'
      ],
      rules: [
        'Приглашённые покупатели подтверждаются автоматически (Hosted Buyer).',
        'Обычные заявки ждут ручного решения в пределах окна заявки.',
        'Отклонённая заявка не удаляется — видна в истории со статусом.'
      ],
      depends: ['окна встреч', 'Hosted Buyer']
    },
    html(ctx) {
      const st = ctx.state;
      st.dec = st.dec || {};
      const stMap = { confirmed: 'подтверждена', pending: 'ожидает', declined: 'отклонена' };
      const stCls = { confirmed: 'ok', pending: 'wait', declined: '' };
      const rows = F.EXH_REQUESTS.map(r => {
        const d = st.dec[r.id];
        const status = d || r.status;
        return '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(r.who) + '</div>' +
          '<div class="r-sub">' + esc(r.company) + ' · ' + esc(r.time) + ' · ' + esc(r.space) + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
          '<span class="mc-status ' + stCls[status] + '">' + esc(stMap[status]) + '</span>' +
          (status === 'pending' ? '<div style="display:flex;gap:6px">' +
            '<button class="btn btn-ghost btn-sm" data-act="i7-dec" data-arg="' + r.id + ':declined">Отклонить</button>' +
            '<button class="btn btn-primary btn-sm" data-act="i7-dec" data-arg="' + r.id + ':confirmed">Принять</button></div>' : '') +
          '</div></div>';
      }).join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Кабинет экспонента</div><h1>Заявки</h1>' +
        '<div class="sub">входящие запросы на встречу</div></div></div>' +
        '</div>' +
        paren('приглашённые покупатели — автоприём') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="banner info">' + icon('info') + '<div class="cap">Сегодня подтверждено встреч: 2 · ожидают решения: 2.</div></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('i7-dec', el => {
    const [id, v] = el.dataset.arg.split(':');
    D.st('I7').dec[id] = v;
    D.toast(v === 'confirmed' ? 'Встреча подтверждена — стороны уведомлены' : 'Заявка отклонена');
    D.rerender();
  });

  /* ---------- I9 Карточка решения ---------- */
  D.register('I9', {
    tab: 'I2',
    meta: {
      title: 'I9 · Карточка решения',
      role: 'Экспонент, редактор',
      fr: ['FR-EXH-01'],
      ac: ['AC-EXH-01'],
      what: [
        'Редактор карточки решения: название, описание, оффер, кейсы, воркшоп.',
        'Статус модерации и список замечаний организатора.',
        'Предпросмотр карточки, как её видит участник.'
      ],
      rules: [
        'Карточка публикуется после модерации; правки отправляются на повторную проверку.',
        'Обязательные поля: название, описание, контакт стенда.',
        'Логотипы и цены в карточке запрещены правилами площадки.'
      ],
      depends: ['модерация экспонентов']
    },
    html(ctx) {
      const ex = F.exhibitor('ex01');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="I1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Кабинет экспонента</div><h1>Карточка решения</h1>' +
        '<div class="sub">' + esc(F.EXH.company) + '</div></div>' +
        tag('на модерации', 'wait') + '</div>' +
        '</div>' +
        paren('правки уходят на повторную проверку') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Название</div>' +
        '<input class="input" value="' + esc(ex.name) + ' — ' + esc(ex.what) + '"></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Описание</div>' +
        '<textarea class="textarea" rows="3">' + esc(ex.desc) + '</textarea></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Что предлагаем</div>' +
        '<textarea class="textarea" rows="2">' + esc(ex.offer) + '</textarea></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Кейсы</div>' +
        '<div class="r-sub">' + esc(ex.cases) + '</div></div>' +
        '<div class="banner warn">' + icon('alert') + '<div style="flex:1"><div class="b-title">Замечания модерации · 1</div>' +
        '<div class="cap">Добавьте ссылку на кейс или уточните срок внедрения в описании.</div></div></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-secondary" style="flex:1;min-width:130px" data-act="i9-preview">Предпросмотр</button>' +
        '<button class="btn btn-primary" style="flex:1;min-width:170px" data-act="i9-send">На модерацию</button></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('i9-preview', () => D.toast('Откроется карточка, как её видит участник'));
  D.action('i9-send', () => { D.toast('Карточка отправлена на модерацию'); });
})();

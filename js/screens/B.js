/* Блок B — «Сегодня». Фаза B: B1, B3. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, tariffTag } = D;

  D.register('B1', {
    tab: 'B1',
    meta: {
      title: 'B1 · Сегодня',
      role: 'Гость, дневной экран',
      fr: ['FR-UI-03', 'FR-PROG-05', 'FR-NTF-03'],
      ac: ['AC-PROG-01', 'AC-NTF-03'],
      what: [
        'Приветствие, тариф и дата; слабый слой топографии в шапке.',
        'Подсказка Секретаря в скобках с запасом времени на переход.',
        'Баннер «сейчас идёт» с прогрессом и переходом в карточку сессии.',
        'Карточка «следующее событие» с залом и временем перехода.',
        'Быстрые действия, анонс ленты, оценки дня; нижняя навигация.'
      ],
      rules: [
        'Подсказка Секретаря учитывает матрицу переездов: запас на переход считается в минутах.',
        '«Сейчас идёт» показывается только для сессии в моменте; остальные — по расписанию.',
        'Все цифры и время — из фикстур: демо-день 27.02, текущее время 11:10.'
      ],
      depends: ['D-09', 'матрица переездов']
    },
    html(ctx) {
      const ME = F.ME;
      const now = F.session('s2703');           // идёт сейчас 11:00–12:00
      const next = F.session('s2704');          // 11:35 Магнолия
      const later = F.sessionsOf('27.02').filter(s => s.time > '11:35').slice(0, 3);
      const toMin = t => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3));
      const prog = Math.round(((toMin(F.NOW.time) - toMin(now.time)) / now.dur) * 100);
      const endLabel = F.fmtTime(toMin(now.time) + now.dur);

      const sessRow = s => {
        const h = F.hall(s.hall);
        return '<button class="row clickable" data-go="C3/' + s.id + '">' +
          '<div class="grow"><div class="r-title">' + esc(s.title) + '</div>' +
          '<div class="r-sub">' + esc(s.time) + ' · ' + esc(h.name) + ' · ' + esc(s.format) + '</div></div>' +
          icon('chevR') + '</button>';
      };

      return '<div class="scr">' +
        D.head({eyebrow:esc(F.NOW.dateLong), title:'Доброе утро, ' + esc(ME.first), sub:esc(ME.company) + ' · ' + tariffTag(ME.tariff) + ' ' + tag('Зима 2027', 'accent'), paren:paren(F.SECRETARY_TODAY), topo:1}) +

        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +

        '<div class="banner info">' + icon('play') + '<div style="flex:1;min-width:0">' +
        '<div class="b-title">Сейчас идёт · ' + esc(now.title) + '</div>' +
        '<div class="cap">' + esc(now.time) + '–' + esc(endLabel) + ' · ' + esc(F.hall(now.hall).name) + '</div>' +
        '<div class="progress" style="margin-top:8px"><i style="width:' + prog + '%"></i></div>' +
        '<button class="feed-link" data-go="C3/' + now.id + '" style="margin-top:8px">Открыть сессию ' + icon('chevR') + '</button>' +
        '</div></div>' +

        '<div class="card accent-edge" data-go="C3/' + next.id + '" style="cursor:pointer">' +
        '<div class="card-head"><div><div class="cap">Следующее событие</div><div class="card-title" style="margin-top:2px">' + esc(next.title) + '</div></div>' +
        '<span class="sess-time">' + esc(next.time) + '</span></div>' +
        '<div class="sess-meta"><span class="hall-line">' + icon('pin') + '<span class="hl-t">' + esc(F.hall(next.hall).name) + ' · ' + esc(F.hall(next.hall).place) + '</span></span>' + tag(next.format, 'accent') + '</div>' +
        '<div class="card-foot"><span class="cap">запас на переход из текущей точки — 4 мин</span>' + icon('chevR') + '</div>' +
        '</div>' +

        '<div class="sec-title" style="margin-top:6px">Дальше сегодня<button class="more" data-go="C1">Вся программа</button></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + later.map(sessRow).join('') + '</div></div>' +

        '<div class="sec-title">Быстрое</div>' +
        '<div class="grid-2">' +
        '<button class="card interactive" data-go="L1"><div class="card-row">' + icon('ticket') + '<b style="font-size:14px">Билет</b></div><div class="cap">QR и детали</div></button>' +
        '<button class="card interactive" data-go="C4"><div class="card-row">' + icon('bookmark') + '<b style="font-size:14px">Моя программа</b></div><div class="cap">' + F.MY_BOOKINGS.length + ' ' + D.plural(F.MY_BOOKINGS.length, ['запись', 'записи', 'записей']) + ' на сегодня</div></button>' +
        '<button class="card interactive" data-go="E4"><div class="card-row">' + icon('route') + '<b style="font-size:14px">Маршрут</b></div><div class="cap">между точками</div></button>' +
        '<button class="card interactive" data-go="B2"><div class="card-row">' + icon('bell') + '<b style="font-size:14px">Лента</b></div><div class="cap">' + F.FEED.length + ' новых</div></button>' +
        '</div>' +

        '<div class="banner">' + icon('spark') + '<div><div class="b-title">Подсказка подбора</div>' +
        '<div class="cap">По цели «ищу партнёра» сегодня: ' + F.sessionsOf('27.02').length + ' ' + D.plural(F.sessionsOf('27.02').length, ['событие', 'события', 'событий']) + ' программы и ' + F.EXHIBITORS.length + ' ' + D.plural(F.EXHIBITORS.length, ['экспонент', 'экспонента', 'экспонентов']) + '.</div>' +
        '<button class="feed-link" data-go="N5" style="margin-top:4px">Открыть подбор ' + icon('chevR') + '</button></div></div>' +

        '<div class="banner">' + icon('star') + '<div style="flex:1"><div class="b-title">Оценка дня</div>' +
        '<div class="cap">Пара минут — и ваши впечатления попадут в итоги фестиваля.</div>' +
        '<button class="feed-link" data-go="M3" style="margin-top:4px">Оценить день ' + icon('chevR') + '</button></div></div>' +

        '<div style="height:16px"></div>' +
        '</div>' +
        '</div>';
    }
  });

  /* ---------- B3 Настройки уведомлений ---------- */
  const CH = ['wp', 'tg', 'sms', 'em'];

  D.register('B3', {
    tab: null,
    meta: {
      title: 'B3 · Настройки уведомлений',
      role: 'Гость, кабинет',
      fr: ['FR-NTF-04', 'FR-NTF-05'],
      ac: ['AC-NTF-04', 'AC-NTF-03'],
      what: [
        'Матрица «тип × канал»: Web Push, Telegram, SMS, e-mail по типам из политики уведомлений.',
        'Тихие часы 23:00–07:00 — подпись под матрицей.',
        'Срочные уведомления не отключаются — помечены и заблокированы.',
        'Основной и резервный канал видны в подписях типов.'
      ],
      rules: [
        'Каналы и типы — по таблице политики: Telegram — основной для анонсов, Web Push — для внутри-событийных.',
        'Тихие часы 23:00–07:00 не действуют на срочные уведомления.',
        'Одно событие не дублируется по каналам: если push доставлен, резервный не отправляется (дедупликация).',
        'На iOS Web Push работает только после установки на экран и разрешения.'
      ],
      depends: ['D-09', 'матрица каналов TZ_01 §7']
    },
    html(ctx) {
      const st = ctx.state;
      st.val = st.val || F.NOTIF_TYPES.reduce((o, t) => { o[t.id] = Object.assign({}, t.def); return o; }, {});
      const main = { ann: 'Telegram', 'rem-s': 'Web Push', meet: 'Web Push', 'rem-m': 'Web Push', prog: 'Web Push', code: 'SMS', urgent: 'Web Push + Telegram' };

      const head = '<tr><th>Тип уведомления</th>' + F.NOTIF_CHANNELS.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr>';
      const rows = F.NOTIF_TYPES.map(t => {
        const cells = CH.map(k => {
          const v = st.val[t.id][k];
          const cls = 'tg-mini' + (v ? ' on' : '') + (t.urgent ? ' fixed' : '');
          return '<td>' + (t.urgent
            ? '<span class="tg-mini fixed" title="срочное — всегда включено"></span>'
            : '<button class="' + cls + '" data-act="b3-toggle" data-arg="' + t.id + ':' + k + '" role="switch" aria-checked="' + !!v + '" aria-label="' + esc(t.name) + ' · ' + esc(F.NOTIF_CHANNELS[CH.indexOf(k)]) + '"></button>') + '</td>';
        }).join('');
        return '<tr><td class="t-name">' + esc(t.name) + (t.urgent ? ' <span class="ntf-urgent">· срочное</span>' : '') +
          '<div class="cap" style="font-weight:400;margin-top:2px">осн.: ' + main[t.id] + '</div></td>' + cells + '</tr>';
      }).join('');

      return '<div class="scr">' +
        D.head({back:'B1', eyebrow:'Кабинет', title:'Уведомления', sub:'Каналы и типы · тихие часы ' + esc(F.QUIET_HOURS.from) + '–' + esc(F.QUIET_HOURS.to), paren:paren('срочные уведомления приходят всегда')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="padding:8px 14px;overflow-x:auto"><table class="ntf-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="banner">' + icon('clock') + '<div><div class="b-title">Тихие часы ' + esc(F.QUIET_HOURS.from) + '–' + esc(F.QUIET_HOURS.to) + '</div>' +
        '<div class="cap">В это время уведомления не приходят, кроме срочных по площадке.</div></div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Если Web Push недоступен (нет установки на экран), важные уведомления придут в Telegram и по SMS.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('b3-toggle', el => {
    const [tid, k] = el.dataset.arg.split(':');
    const st = D.st('B3');
    st.val[tid][k] = !st.val[tid][k];
    D.rerender();
  });

  /* ---------- B2 Лента ---------- */
  D.register('B2', {
    tab: 'B1',
    meta: {
      title: 'B2 · Лента',
      role: 'Гость, сообщения организаторов',
      fr: ['FR-NTF-01'],
      ac: ['AC-NTF-01'],
      what: [
        'Лента сообщений организаторов с метками «срочно» и «изменение».',
        'Фильтры: все, срочные, изменения.',
        'У каждой записи — время и переход к связанному экрану.'
      ],
      rules: [
        'Срочные сообщения не фильтруются и не скрываются тихими часами.',
        'Изменения программы дублируются адресным уведомлением записанным.',
        'Лента — только официальные сообщения; пользовательские посты отсутствуют.'
      ],
      depends: ['NTF', 'фид программы']
    },
    html(ctx) {
      const st = ctx.state;
      st.f = st.f || 'all';
      const kinds = { urgent: 'срочно', change: 'изменение', news: 'новость' };
      const filters = [['all', 'Все'], ['urgent', 'Срочные'], ['change', 'Изменения']];
      const chips = filters.map(([id, l]) =>
        '<button class="chip' + (st.f === id ? ' on' : '') + '" data-act="b2-filter" data-arg="' + id + '">' + l + '</button>').join('');
      let items = F.FEED;
      if (st.f === 'urgent') items = items.filter(i => i.kind === 'urgent');
      if (st.f === 'change') items = items.filter(i => i.kind === 'change');
      const rows = items.map(i =>
        '<div class="feed-item' + (i.kind === 'urgent' ? ' urgent' : (i.kind === 'change' ? ' change' : '')) + '">' +
        '<div class="feed-kind"></div>' +
        '<div class="grow" style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<span class="feed-text" style="font-weight:600">' + esc(i.text) + '</span>' +
        tag(kinds[i.kind], i.kind === 'urgent' ? 'urgent' : (i.kind === 'change' ? 'accent' : '')) + '</div>' +
        '<div class="feed-time">' + esc(i.time) + '</div></div>' +
        (i.link ? '<button class="icon-btn" data-go="' + i.link + '" aria-label="Открыть">' + icon('chevR') + '</button>' : '') + '</div>').join('');
      return '<div class="scr">' +
        D.head({back:'B1', eyebrow:'Сообщения организаторов', title:'Лента', sub:'Новости, изменения и срочное', paren:paren('срочные приходят всегда, даже в тихие часы')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="card" style="padding:4px 16px"><div class="list">' + rows + '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('b2-filter', el => { D.st('B2').f = el.dataset.arg; D.rerender(); });
})();

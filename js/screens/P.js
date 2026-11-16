/* Блок P — консоль организатора (рабочий стол). Фаза A: P1 «Табло встреч». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, tag } = D;

  const NAV = [
    ['P1', 'Табло встреч', 'grid'], ['P2', 'Аккредитация', 'scan'], ['P3', 'Уведомления', 'bell'],
    ['P4', 'Дашборд', 'layers'], ['P5', 'Параметры', 'cog'], ['P6', 'Программа', 'program'], ['P7', 'Оценки', 'star']
  ];

  D.register('P1', {
    tab: null,
    meta: {
      title: 'P1 · Табло встреч',
      role: 'Команда организатора',
      fr: ['FR-MEET-13'],
      ac: ['AC-MEET-10'],
      what: [
        'Консоль рабочего стола: боковое меню, метрики встреч за день, загрузка пространств.',
        'Карточки пространств: занятость окон за день полосой и легендой.',
        'Правая колонка: идущие встречи, неявки, очередь переносов и блокировок.'
      ],
      rules: [
        'Табло обновляется не реже раза в 10 секунд; ручной перенос пишется в журнал и уведомляет стороны.',
        'Неявки фиксируются по отметке прихода; повторная неявка влияет на приоритет в листах ожидания.',
        'Все числа — из фикстур консоли; данных реальных гостей нет.'
      ],
      depends: ['D-12', 'права ролей ADM']
    },
    html(ctx) {
      const C = F.CONSOLE, M = C.meetings;
      const total = F.windows.length;

      const nav = NAV.map(([id, label, ic]) =>
        '<button class="c-nav-item' + (id === 'P1' ? ' on' : '') + '" data-go="' + id + '">' + icon(ic) + '<span>' + esc(label) + '</span></button>').join('');

      const tiles = [
        ['Заявок сегодня', M.requests], ['Подтверждено', M.confirmed], ['Состоялось', M.held], ['Неявок', M.noShow]
      ].map(([l, v]) => '<div class="stat-tile"><span class="num">' + v + '</span><span class="lbl">' + l + '</span></div>').join('');

      const spaceCards = F.MEETING_SPACES.map(sp => {
        const wins = F.spaceWindows(sp.id);
        const taken = wins.filter(w => w.status === 'taken').length;
        const free = total - taken;
        const pctT = Math.round(taken / total * 100), pctF = 100 - pctT;
        return '<div class="space-card"><div class="sc-head"><div><div class="sc-name">' + esc(sp.name) + ' ' + esc(sp.num) + '</div>' +
          '<div class="sc-place">' + esc(sp.place) + ' · до ' + sp.cap + ' чел.</div></div>' +
          '<div style="text-align:right"><div style="font-family:var(--font-display);font-size:22px">' + free + '/' + total + '</div><div class="cap">окон свободно</div></div></div>' +
          '<div class="sc-bar"><i style="width:' + pctT + '%;background:var(--accent-solid)"></i><i style="width:' + pctF + '%;background:var(--surface-2)"></i></div>' +
          '<div class="sc-legend"><span><i class="legend-dot" style="background:var(--accent-solid)"></i>занято <b>' + taken + '</b></span>' +
          '<span><i class="legend-dot" style="background:var(--surface-2);border:1px solid var(--line)"></i>свободно <b>' + free + '</b></span></div></div>';
      }).join('');

      const cur = C.current.map(c =>
        '<div class="feed-item"><span class="feed-kind"></span><div style="flex:1"><div class="feed-time">' + esc(c.time) + ' · ' + esc(c.space) + '</div>' +
        '<div class="feed-text">' + esc(c.who) + ' ' + tag(c.note) + '</div></div></div>').join('');

      const noShow = C.noShows.map(n =>
        '<div class="feed-item"><span class="feed-kind" style="background:var(--err)"></span><div style="flex:1"><div class="feed-text"><b>' + esc(n.name) + '</b></div>' +
        '<div class="feed-time">' + esc(n.space) + ' · ' + esc(n.time) + ' · не пришёл</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="p1-noshow" data-arg="' + esc(n.name) + '">перенести</button></div>').join('');

      const queue = C.queue.map(q =>
        '<div class="feed-item"><span class="feed-kind" style="background:var(--accent-solid)"></span><div style="flex:1"><div class="feed-text">' + esc(q.text) + '</div>' +
        '<div class="feed-time">' + esc(q.time) + '</div></div></div>').join('');

      return '<div class="console">' +
        '<aside class="c-side"><div class="c-logo">АТЛАНТЫ.<br>СИТИ · ЗИМА</div>' + nav +
        '<div style="margin-top:auto;padding:10px;font-size:12px;color:var(--ink-dim)">консоль организатора<br>' + esc(C.today) + '</div></aside>' +
        '<main class="c-main"><h2>Табло встреч</h2>' +
        '<div class="c-sub">' + esc(F.NOW.dateLong) + ' · обновляется каждые 10 секунд · демо-данные</div>' +
        '<div class="stat-tiles four" style="margin-bottom:18px">' + tiles + '</div>' +
        '<div class="sec-title" style="margin-top:0">Пространства</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' + spaceCards + '</div></main>' +
        '<aside class="c-right"><div class="sec-title" style="margin-top:0">Сейчас</div><div>' + cur + '</div>' +
        '<div class="sec-title">Неявки · ' + C.noShows.length + '</div><div>' + noShow + '</div>' +
        '<div class="sec-title">Очередь · ' + C.queue.length + '</div><div>' + queue + '</div>' +
        '<div class="banner" style="margin-top:14px">' + icon('info') + '<div class="cap">Ручной перенос и блокировка пишутся в журнал и уведомляют обе стороны.</div></div></aside>' +
        '</div>';
    }
  });
  D.action('p1-noshow', el => D.toast('Перенос оформлен: ' + el.dataset.arg + ' › лист ожидания'));

  /* ---------- общая разметка консоли ---------- */
  function navHtml(activeId) {
    return NAV.map(([id, label, ic]) =>
      '<button class="c-nav-item' + (id === activeId ? ' on' : '') + '" data-go="' + id + '">' + icon(ic) + '<span>' + esc(label) + '</span></button>').join('');
  }
  function consoleShell(activeId, title, sub, mainHtml, rightHtml) {
    return '<div class="console">' +
      '<aside class="c-side"><div class="c-logo">АТЛАНТЫ.<br>СИТИ · ЗИМА</div>' + navHtml(activeId) +
      '<div style="margin-top:auto;padding:10px;font-size:12px;color:var(--ink-dim)">консоль организатора<br>' + esc(F.CONSOLE.today) + '</div></aside>' +
      '<main class="c-main"><h2>' + esc(title) + '</h2><div class="c-sub">' + esc(sub) + ' · демо-данные</div>' + mainHtml + '</main>' +
      (rightHtml ? '<aside class="c-right">' + rightHtml + '</aside>' : '') +
      '</div>';
  }

  /* ---------- P2 Очередь аккредитации ---------- */
  D.register('P2', {
    tab: null,
    meta: {
      title: 'P2 · Аккредитация экспонентов',
      role: 'Команда организатора',
      fr: ['FR-ACC-03', 'FR-ACC-04'],
      ac: ['AC-ACC-02'],
      what: [
        'Таблица заявок экспонентов с результатом проверки по ИНН (ДаДата и Checko).',
        'Флаги проверки: регистрация менее 6 месяцев, расхождение названия.',
        'Правая панель с деталями и действия: принять, запросить исправления, отклонить.'
      ],
      rules: [
        'Проверка по ИНН идёт по двум источникам; расхождение — флаг, не отказ.',
        '«Запросить исправления» возвращает заявку экспоненту с комментарием.',
        'Все решения пишутся в журнал аккредитации.'
      ],
      depends: ['реестр экспонентов', 'интеграции ДаДата/Checko']
    },
    html(ctx) {
      const st = ctx.state;
      st.sel = st.sel || 'a1';
      st.dec = st.dec || {};
      const rows = F.ACC_QUEUE.map(a => {
        const stt = st.dec[a.id] || 'new';
        const lbl = { new: 'новая', ok: 'принята', fix: 'на исправлении', no: 'отклонена' }[stt];
        return '<tr class="queue-row' + (st.sel === a.id ? ' on' : '') + '" data-act="p2-sel" data-arg="' + a.id + '">' +
          '<td><div class="co">' + esc(a.company) + '</div><div class="chk">ИНН ' + esc(a.inn) + ' · ' + esc(a.pack) + '</div></td>' +
          '<td>' + esc(a.contact) + '</td>' +
          '<td>' + (a.flag ? '<span class="flag">' + icon('alert') + esc(a.flag) + '</span>' : '<span class="chk">—</span>') + '</td>' +
          '<td><span class="pill-count">' + lbl + '</span></td></tr>';
      }).join('');

      const a = F.ACC_QUEUE.find(x => x.id === st.sel) || F.ACC_QUEUE[0];
      const stt = st.dec[a.id] || 'new';
      const detail = '<div class="acc-panel"><div class="cap" style="margin-bottom:4px">Заявка · ' + esc(a.id.toUpperCase()) + '</div>' +
        '<div style="font-weight:700;font-size:16px">' + esc(a.company) + '</div>' +
        '<div class="cap" style="margin-top:2px">' + esc(a.contact) + ' · пакет ' + esc(a.pack) + ' · ИНН ' + esc(a.inn) + '</div>' +
        '<div class="cap" style="margin-top:10px;font-weight:600">Проверка ИНН</div>' +
        '<div class="chk" style="margin-top:4px">' + esc(a.check) + '</div>' +
        (a.flag ? '<div class="flag" style="margin-top:8px">' + icon('alert') + ' ' + esc(a.flag) + '</div>' : '') +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">' +
        (stt === 'new' || stt === 'fix'
          ? '<button class="btn btn-primary btn-block" data-act="p2-ok" data-arg="' + a.id + '">Принять</button>' +
            '<button class="btn btn-secondary btn-block" data-act="p2-fix" data-arg="' + a.id + '">Запросить исправления</button>' +
            '<button class="btn btn-ghost btn-block" data-act="p2-no" data-arg="' + a.id + '">Отклонить</button>'
          : '<div class="banner ok">' + icon('check') + '<div class="cap">Решение по заявке уже принято: ' + { ok: 'принята', fix: 'на исправлении', no: 'отклонена' }[stt] + '.</div></div>') +
        '</div></div>';

      const main = '<div class="sec-title" style="margin-top:0">Очередь аккредитации · ' + F.ACC_QUEUE.length + '</div>' +
        '<div class="acc-tbl-wrap"><table class="c-table"><thead><tr><th>Компания</th><th>Контакт</th><th>Флаг</th><th>Статус</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="cap" style="margin-top:10px">Проверка по ИНН: ДаДата и Checko · решения в журнале</div>';

      return consoleShell('P2', 'Аккредитация', F.NOW.dateLong + ' · очередь заявок экспонентов', main, detail);
    }
  });
  ['ok', 'fix', 'no'].forEach(k => {
    D.action('p2-' + k, el => {
      const st = D.st('P2');
      st.dec = st.dec || {};
      st.dec[el.dataset.arg] = k === 'ok' ? 'ok' : k === 'fix' ? 'fix' : 'no';
      D.toast(k === 'ok' ? 'Заявка принята' : k === 'fix' ? 'Запрошены исправления' : 'Заявка отклонена');
      D.rerender();
    });
  });
  D.action('p2-sel', el => { D.st('P2').sel = el.dataset.arg; D.rerender(); });

  /* ---------- P3 Консоль уведомлений ---------- */
  D.register('P3', {
    tab: null,
    meta: {
      title: 'P3 · Уведомления',
      role: 'Команда организатора',
      fr: ['FR-NTF-06', 'FR-NTF-07', 'FR-NTF-08'],
      ac: ['AC-NTF-05'],
      what: [
        'Форма составления: заголовок, текст, аудитория, расписание отправки.',
        'Окно отмены 5 минут после отправки и лимит 2 рассылки в час.',
        'Предпросмотр уведомления на телефоне.'
      ],
      rules: [
        'Отправленное уведомление можно отменить в течение 5 минут.',
        'Не более 2 рассылок в час на площадку; срочные идут вне лимита.',
        'Аудитория — сегменты по тарифу и роли.'
      ],
      depends: ['матрица каналов TZ_01 §7', 'D-09']
    },
    html(ctx) {
      const st = ctx.state;
      const N = F.NTFC;
      st.title = st.title != null ? st.title : N.preview.title;
      st.text = st.text != null ? st.text : N.preview.text;
      st.aud = st.aud || 0;
      st.sched = st.sched || 0;
      st.sent = !!st.sent;

      const audChips = N.audience.map((a, i) =>
        '<button class="chip' + (st.aud === i ? ' on' : '') + '" data-act="p3-aud" data-arg="' + i + '">' + esc(a) + '</button>').join('');
      const schedChips = N.schedule.map((s, i) =>
        '<button class="chip' + (st.sched === i ? ' on' : '') + '" data-act="p3-sched" data-arg="' + i + '">' + esc(s) + '</button>').join('');

      const left = N.hourlyLimit - N.sentToday;
      const main = '<div class="sec-title" style="margin-top:0">Новое уведомление</div>' +
        '<div class="acc-tbl-wrap" style="padding:18px"><div style="display:grid;grid-template-columns:1.4fr 1fr;gap:18px">' +
        '<div>' +
        '<div class="field" style="margin-bottom:12px"><label for="p3-t">Заголовок</label><input class="input" id="p3-t" maxlength="80" value="' + esc(st.title) + '"></div>' +
        '<div class="field" style="margin-bottom:12px"><label for="p3-x">Текст</label><textarea class="textarea" id="p3-x" maxlength="280" style="min-height:80px">' + esc(st.text) + '</textarea></div>' +
        '<div class="cap" style="margin-bottom:6px">Аудитория</div><div class="chips" style="margin-bottom:12px">' + audChips + '</div>' +
        '<div class="cap" style="margin-bottom:6px">Когда</div><div class="chips">' + schedChips + '</div>' +
        '</div>' +
        '<div><div class="cap" style="margin-bottom:8px">Предпросмотр на телефоне</div>' +
        '<div class="ntf-phone"><div class="np-head">Атланты Сити</div>' +
        '<div class="np-item"><b>' + esc(st.title) + '</b><span>' + esc(st.text) + '</span></div>' +
        '<div class="np-item"><b>Сессия начнётся через час</b><span>«Практикум: юнит-экономика» — Дойбица, 12:30.</span></div>' +
        '<div class="np-app">'+ esc(F.NOW.dateLong) + ' · ' + esc(F.NOW.time) + '</div></div>' +
        '<div style="margin-top:12px" class="banner">' + icon('clock') + '<div class="cap">Окно отмены — ' + N.cancelWindow + ' минут после отправки.</div></div>' +
        '<div style="margin-top:8px" class="' + (left > 0 ? 'ntf-ok' : 'ntf-lim') + '">' +
        (left > 0 ? 'Лимит: отправлено ' + N.sentToday + ' из ' + N.hourlyLimit + ' за час — осталось ' + left : 'Лимит исчерпан: ' + N.hourlyLimit + ' рассылки в час') + '</div>' +
        '</div></div>' +
        '<div style="margin-top:14px;display:flex;gap:10px">' +
        '<button class="btn btn-primary" data-act="p3-send"' + ((st.title && st.text && left > 0) ? '' : ' disabled') + '>Отправить</button>' +
        '<button class="btn btn-ghost" data-act="p3-reset">Сбросить</button></div>' +
        (st.sent ? '<div class="banner ok" style="margin-top:12px">' + icon('check') + '<div><div class="b-title">Отправлено</div><div class="cap">Уведомление ушло аудитории «' + esc(N.audience[st.aud]) + '». Отмена возможна ' + N.cancelWindow + ' минут.</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-act="p3-cancel">Отменить рассылку</button></div>' : '') +
        '</div>';

      const right = '<div class="sec-title" style="margin-top:0">Правила</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Не более ' + N.hourlyLimit + ' рассылок в час на площадку. Срочные уведомления идут вне лимита.</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">После отправки есть ' + N.cancelWindow + ' минут на отмену — дальше уведомления уже у людей.</div></div>' +
        '<div class="banner">' + icon('bell') + '<div class="cap">Доставки по каналам из матрицы: Web Push, Telegram, SMS, e-mail — по типу и настройкам гостя.</div></div>';

      return consoleShell('P3', 'Уведомления', F.NOW.dateLong + ' · рассылки и push', main, right);
    },
    mount(host) {
      const t = host.querySelector('#p3-t'), x = host.querySelector('#p3-x');
      if (t) t.addEventListener('input', () => { D.st('P3').title = t.value; });
      if (x) x.addEventListener('input', () => { D.st('P3').text = x.value; });
    }
  });
  D.action('p3-aud', el => { D.st('P3').aud = parseInt(el.dataset.arg, 10); D.rerender(); });
  D.action('p3-sched', el => { D.st('P3').sched = parseInt(el.dataset.arg, 10); D.rerender(); });
  D.action('p3-send', () => {
    const st = D.st('P3');
    if (!st.title || !st.text) return;
    st.sent = true;
    F.NTFC.sentToday += 1;
    D.toast('Уведомление отправлено');
    D.rerender();
  });
  D.action('p3-cancel', () => {
    const st = D.st('P3');
    st.sent = false;
    F.NTFC.sentToday = Math.max(0, F.NTFC.sentToday - 1);
    D.toast('Рассылка отменена в окне ' + F.NTFC.cancelWindow + ' минут');
    D.rerender();
  });
  D.action('p3-reset', () => {
    const st = D.st('P3');
    st.title = F.NTFC.preview.title; st.text = F.NTFC.preview.text;
    D.rerender();
  });

  /* ---------- P4 Дашборд ---------- */
  D.register('P4', {
    tab: null,
    meta: {
      title: 'P4 · Дашборд',
      role: 'Команда организатора',
      fr: ['FR-ADM-01', 'FR-ADM-02'],
      ac: ['AC-ADM-01'],
      what: [
        'Активации билетов: сделано из общего числа.',
        'Активные пользователи по часам — SVG-график.',
        'Заполняемость залов, воронка встреч, распределение оценок.'
      ],
      rules: [
        'Все числа — из фикстур раздела 3 брифа, подпись «демо» на экране.',
        'Воронка встреч: заявки › подтверждённые › состоявшиеся › неявки.',
        'Оценки — распределение по звёздам за день.'
      ],
      depends: ['счётчики платформы', 'журнал активаций']
    },
    html(ctx) {
      const DSH = F.DASH, C = F.CONSOLE;
      /* активации */
      const actPct = Math.round(DSH.activations.done / DSH.activations.total * 100);
      /* активные по часам */
      const W = 560, H = 160, maxV = Math.max(...DSH.hourly.map(h => h.v));
      const bw = W / DSH.hourly.length;
      const hourly = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' +
        '<line class="grid-l" x1="0" y1="' + (H - 20) + '" x2="' + W + '" y2="' + (H - 20) + '"/>' +
        DSH.hourly.map((h, i) => {
          const bh = h.v / maxV * (H - 40);
          return '<rect class="bar" x="' + (i * bw + 4).toFixed(1) + '" y="' + (H - 20 - bh).toFixed(1) + '" width="' + (bw - 8).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3">' +
            '<title>' + h.h + ':00 — ' + h.v + '</title></rect>' +
            '<text class="lbl" x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">' + h.h + '</text>';
        }).join('') + '</svg>';
      /* заполняемость */
      const fill = DSH.fill.map(f =>
        '<div class="funnel-row"><div class="fr-label">' + esc(f.label) + '</div>' +
        '<div class="fr-bar"><i style="width:' + f.pct + '%"></i></div>' +
        '<div class="fr-val">' + f.pct + '%</div></div>').join('');
      /* воронка встреч */
      const m = C.meetings, mMax = m.requests;
      const funnel = [
        ['Заявки', m.requests], ['Подтверждено', m.confirmed], ['Состоялось', m.held], ['Неявки', m.noShow]
      ].map(([l, v]) =>
        '<div class="funnel-row"><div class="fr-label">' + l + '</div>' +
        '<div class="fr-bar"><i style="width:' + Math.round(v / mMax * 100) + '%;background:' + (l === 'Неявки' ? 'var(--err)' : 'var(--accent-solid)') + '"></i></div>' +
        '<div class="fr-val">' + v + '</div></div>').join('');
      /* оценки */
      const ratings = DSH.ratings.map(r =>
        '<div class="funnel-row"><div class="fr-label">' + r.stars + ' из 5</div>' +
        '<div class="fr-bar"><i style="width:' + r.pct + '%"></i></div>' +
        '<div class="fr-val">' + r.pct + '%</div></div>').join('');

      const main = '<div class="stat-tiles four" style="margin-bottom:16px">' +
        '<div class="stat-tile"><span class="num">' + DSH.activations.done.toLocaleString('ru') + '</span><span class="lbl">активаций</span></div>' +
        '<div class="stat-tile"><span class="num">' + actPct + '%</span><span class="lbl">билетов активировано</span></div>' +
        '<div class="stat-tile"><span class="num">' + C.meetings.held + '</span><span class="lbl">встреч состоялось</span></div>' +
        '<div class="stat-tile"><span class="num">' + C.meetings.noShow + '</span><span class="lbl">неявок</span></div></div>' +
        '<div class="sec-title" style="margin-top:0">Активные пользователи по часам</div>' +
        '<div class="acc-tbl-wrap" style="padding:14px">' + hourly + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px">' +
        '<div class="acc-panel"><div class="cap" style="margin-bottom:8px">Заполняемость залов</div>' + fill + '</div>' +
        '<div class="acc-panel"><div class="cap" style="margin-bottom:8px">Воронка встреч</div>' + funnel + '</div></div>' +
        '<div class="acc-panel" style="margin-top:14px"><div class="cap" style="margin-bottom:8px">Оценки сессий</div>' + ratings + '</div>';

      const right = '<div class="sec-title" style="margin-top:0">Итого за день</div>' +
        '<div class="banner">' + icon('star') + '<div class="cap">Пик активности — 11:00 (' + DSH.hourly.reduce((a, b) => a.v > b.v ? a : b).v + ' активных). Средняя заполняемость — ' + Math.round(DSH.fill.reduce((a, f) => a + f.pct, 0) / DSH.fill.length) + '%.</div></div>' +
        '<div class="banner">' + icon('check') + '<div class="cap">Все числа — демо из фикстур. Конверсия воронки встреч: ' + Math.round(m.held / m.requests * 100) + '% от заявок до состоявшихся.</div></div>';

      return consoleShell('P4', 'Дашборд', F.NOW.dateLong + ' · метрики площадки', main, right);
    }
  });

  /* ---------- P5 Параметры ---------- */
  D.register('P5', {
    tab: null,
    meta: {
      title: 'P5 · Параметры',
      role: 'Команда организатора',
      fr: ['FR-ADM-04'],
      ac: ['AC-ADM-04'],
      what: [
        'Параметры системы: квота Оптимума, лимиты, сроки — таблица с владельцем изменения.',
        'Флаги функций: ИИ-подбор, Хроникёр, автоприём, офлайн-режим.',
        'Значения по умолчанию из ТЗ — видны все 22 параметра.'
      ],
      rules: [
        'Каждый параметр имеет владельца изменения — кто может его править.',
        'Флаги функций включаются поэтапно; выключенный не показывает UI.',
        'Изменения параметров пишутся в журнал и требуют подтверждения.'
      ],
      depends: ['роли команды', 'журнал изменений']
    },
    html(ctx) {
      const rows = F.PARAMS.map(p =>
        '<tr><td class="t-name">' + esc(p.param) + '</td><td>' + esc(p.value) + '</td><td class="cap">' + esc(p.who) + '</td></tr>').join('');
      const flags = F.PARAM_FLAGS.map(f =>
        '<label class="toggle-row"><div class="tr-title" style="font-weight:500;font-size:14px">' + esc(f.name) + '</div>' +
        '<span class="toggle"><input type="checkbox"' + (f.on ? ' checked' : '') + ' data-p5flag="' + f.id + '"><span class="tr"></span></span></label>').join('');
      const main = '<div class="sec-title" style="margin-top:0">Флаги функций</div>' +
        '<div class="acc-panel">' + flags + '</div>' +
        '<div class="sec-title">Параметры и лимиты</div>' +
        '<div class="acc-panel" style="padding:8px 14px;overflow-x:auto"><table class="c-table"><thead><tr><th>Параметр</th><th>Значение</th><th>Меняет</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      const right = '<div class="sec-title" style="margin-top:0">Примечания</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Значения — по умолчанию из ТЗ, раздел 4. Квота Оптимума = 0: записи на менторские и экспертные окна доступны тарифам Бизнес и Первый класс.</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">Изменение лимитов применяется к новым заявкам; подтверждённые встречи не пересчитываются.</div></div>';
      return consoleShell('P5', 'Параметры', 'квоты, лимиты, флаги функций · демо-значения', main, right);
    },
    mount(host) {
      host.querySelectorAll('[data-p5flag]').forEach(inp => inp.addEventListener('change', () => {
        const f = F.PARAM_FLAGS.find(x => x.id === inp.dataset.p5flag);
        if (f) { f.on = inp.checked; D.toast(f.name + ': ' + (f.on ? 'включено' : 'выключено')); }
      }));
    }
  });

  /* ---------- P6 Синхронизация программы ---------- */
  D.register('P6', {
    tab: null,
    meta: {
      title: 'P6 · Синхронизация программы',
      role: 'Команда организатора',
      fr: ['FR-INT-05'],
      ac: ['AC-INT-05'],
      what: [
        'Журнал изменений фида программы: версия, время, что изменилось, источник.',
        'Последняя версия фида и статус синхронизации.',
        'Фильтр по источнику: фид программы или ручной редактор.'
      ],
      rules: [
        'Каждое изменение фида — новая версия с меткой времени.',
        'Изменения помечаются в приложении пользователей меткой «изменено».',
        'Ручные правки редактора и фида не конфликтуют: приоритет у фида по расписанию.'
      ],
      depends: ['фид программы', 'редактор']
    },
    html(ctx) {
      const last = F.SYNC_JOURNAL[0];
      const rows = F.SYNC_JOURNAL.map(j =>
        '<tr><td class="cap">' + esc(j.ver) + '</td><td class="cap">' + esc(j.time) + '</td>' +
        '<td class="t-name">' + esc(j.what) + '</td><td class="cap">' + esc(j.by) + '</td></tr>').join('');
      const main = '<div class="sec-title" style="margin-top:0">Статус</div>' +
        '<div class="stat-tiles four" style="margin-bottom:16px">' +
        '<div class="stat-tile"><span class="num">' + esc(last.ver) + '</span><span class="lbl">последняя версия</span></div>' +
        '<div class="stat-tile"><span class="num">' + esc(last.time) + '</span><span class="lbl">обновлено</span></div>' +
        '<div class="stat-tile"><span class="num">' + F.SYNC_JOURNAL.length + '</span><span class="lbl">изменений за 2 дня</span></div>' +
        '<div class="stat-tile"><span class="num" style="color:var(--ok)">ок</span><span class="lbl">синхронизация</span></div></div>' +
        '<div class="sec-title">Журнал изменений</div>' +
        '<div class="acc-panel" style="padding:8px 14px;overflow-x:auto"><table class="c-table"><thead><tr><th>Версия</th><th>Время</th><th>Изменение</th><th>Источник</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      const right = '<div class="sec-title" style="margin-top:0">Как это работает</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Фид публикуется по расписанию; каждое изменение получает версию. Пользователи видят метку «изменено» у затронутых сессий.</div></div>' +
        '<div class="banner">' + icon('refresh') + '<div class="cap">Записанным на изменённую сессию уходит уведомление по каналам из их настроек.</div></div>';
      return consoleShell('P6', 'Синхронизация программы', 'журнал фида · последняя версия ' + last.ver, main, right);
    }
  });

  /* ---------- P7 Оценки спикеров ---------- */
  D.register('P7', {
    tab: null,
    meta: {
      title: 'P7 · Оценки спикеров',
      role: 'Команда организатора',
      fr: ['FR-NOTE-05'],
      ac: ['AC-NOTE-05'],
      what: [
        'Агрегированные оценки спикеров: средняя, число оценок, распределение.',
        'Показ только при не менее 5 оценках — анонимность малого числа.',
        'Распределение оценок столбцами 1–5.'
      ],
      rules: [
        'Спикер виден в рейтинге при 5+ оценках; меньше — скрыт до порога.',
        'Оценки анонимны: видны только агрегаты, не голоса.',
        'Распределение считается по шкале 1–5 после сессии.'
      ],
      depends: ['оценки сессий', 'анонимность']
    },
    html(ctx) {
      const rows = F.SPEAKER_RATINGS.map(r => {
        const max = Math.max.apply(null, r.dist);
        const bars = r.dist.map((v, i) =>
          '<div class="vbar-col" style="height:56px"><div class="vbar" style="height:' + Math.round(v / max * 100) + '%"></div>' +
          '<div class="vbar-lbl">' + (5 - i) + '</div></div>').join('');
        return '<div class="acc-panel"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">' +
          '<div><b>' + esc(r.speaker) + '</b> <span class="cap">· ' + r.count + ' оценок</span></div>' +
          '<div style="font-family:var(--font-display);font-size:24px;color:var(--accent-display)">' + r.avg.toFixed(1) + ' <span class="cap" style="font-family:var(--font-accent);font-size:11px">из 5</span></div></div>' +
          '<div class="vbars" style="height:56px;margin-top:10px">' + bars + '</div></div>';
      }).join('');
      const hidden = F.SPEAKER_RATINGS.filter(r => !r.show).map(r =>
        '<div class="feed-item"><span class="feed-kind"></span><div class="feed-text"><b>' + esc(r.speaker) + '</b> — ' + r.count + ' оценки, покажется при 5+</div></div>').join('');
      const main = '<div class="sec-title" style="margin-top:0">Спикеры · по убыванию средней</div>' + rows;
      const right = '<div class="sec-title" style="margin-top:0">Скрыты до порога</div>' + hidden +
        '<div class="banner" style="margin-top:14px">' + icon('info') + '<div class="cap">Порог показа — 5 оценок: защита от деанонимизации при малом числе голосов.</div></div>';
      return consoleShell('P7', 'Оценки спикеров', 'агрегаты и распределение · демо-оценки', main, right);
    }
  });
})();

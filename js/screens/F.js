/* Блок F — люди. Фаза A: F2 «Карточка человека». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;

  D.register('F2', {
    tab: 'F1',
    meta: {
      title: 'F2 · Карточка человека',
      role: 'Гость, участник',
      fr: ['FR-PPL-01', 'FR-PPL-02', 'FR-PROF-01', 'FR-PROF-04'],
      ac: ['AC-PPL-02'],
      what: [
        'Публичный профиль: имя, компания, должность, отрасль, цель, «польза», тариф, свободные окна.',
        'Уровни видимости: поля «по запросу» показаны закрытыми с объяснением.',
        'Действия: предложить встречу, заявка на знакомство, сохранить, QR-визитка.',
        'Переход в раздел встреч с контекстом человека.'
      ],
      rules: [
        'Публично: имя, компания, должность, отрасль, польза, цель. По запросу: Telegram, телефон.',
        'Скрыто: оборот, семья и дети — в карточке не показываются.',
        'Тариф виден всем и не редактируется пользователем (D-07).',
        'Список людей виден всем тарифам.'
      ],
      depends: ['D-07', 'FR-PROF-01 уровни видимости']
    },
    html(ctx) {
      const st = ctx.state;
      const id = (ctx.param && F.person(ctx.param)) ? ctx.param : 'p01';
      const p = F.person(id);
      const saved = st.saved || (st.saved = {});
      const isSaved = !!saved[p.id];

      const field = (k, v, raw) => '<div class="fcell"><div class="cap">' + k + '</div><div class="fval">' + (raw ? v : esc(v)) + '</div></div>';
      const locked = '<span class="lock-note">' + icon('lock') + 'по запросу</span>';

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div class="actions">' +
        '<button class="icon-btn' + (isSaved ? ' on' : '') + '" data-act="f2-save" data-arg="' + p.id + '" aria-label="Сохранить">' + icon('bookmark') + '</button>' +
        '<button class="icon-btn" data-go="F7/' + p.id + '" aria-label="QR-визитка">' + icon('qr') + '</button></div></div>' +
        '</div>' +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +

        '<div class="card" style="align-items:center;text-align:center;padding:22px 16px">' +
        avatar(p.name, 'xl accent') +
        '<div class="card-title" style="font-size:19px;margin-top:10px">' + esc(p.name) + '</div>' +
        '<div class="card-sub">' + esc(p.role) + ' · ' + esc(p.company) + '</div>' +
        '<div class="sess-meta" style="justify-content:center;margin-top:8px">' + tag(p.industry) + tariffTag(p.tariff) + (p.hb ? '<span class="hb-badge">Hosted Buyer</span>' : '') + '</div>' +
        paren('цель: ' + p.goal) +
        '</div>' +

        '<div class="card"><div class="cap" style="margin-bottom:4px">Чем полезен</div>' +
        '<div style="font-family:var(--font-accent);font-style:italic;font-size:15.5px;line-height:1.5">«' + esc(p.use) + '»</div></div>' +

        '<div class="card"><div class="sec-title" style="margin:0 0 8px">Профиль</div><div class="fgrid">' +
        field('Компания', p.company) + field('Должность', p.role) +
        field('Отрасль', p.industry) + field('Образование', p.edu) +
        field('Свободные окна', p.free) + field('Telegram', locked, true) +
        field('Телефон', locked, true) +
        '</div></div>' +

        '<div class="banner">' + icon('eye') + '<div><div class="b-title">Что видно вам</div>' +
        '<div class="cap">Публичные поля — всем. Контакты откроются после принятия заявки на знакомство или сканирования вашего QR.</div></div></div>' +

        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button class="btn btn-primary btn-block" data-go="G2/' + p.id + '">' + icon('route') + 'Предложить встречу</button>' +
        '<button class="btn btn-secondary btn-block" data-go="F3/' + p.id + '">Заявка на знакомство</button>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-ghost btn-block" data-go="M1">Заметка</button>' +
        '<button class="btn btn-ghost btn-block" data-go="F7/' + p.id + '">Показать QR</button>' +
        '</div></div>' +
        '<div style="height:16px"></div>' +
        '</div></div>';
    }
  });
  D.action('f2-save', el => {
    const st = D.st('F2');
    st.saved = st.saved || {};
    const id = el.dataset.arg;
    if (st.saved[id]) { delete st.saved[id]; D.toast('Убрано из сохранённых'); }
    else { st.saved[id] = true; D.toast('Сохранено в «Люди»'); }
    D.rerender();
  });

  /* ---------- F1 Каталог людей ---------- */
  const EXPO_COMPANIES = new Set(F.EXH.contacts.map(c => c.company));
  function peopleOf(tab) {
    if (tab === 'speakers') return F.PEOPLE.filter(p => p.tariff === 'Первый класс');
    if (tab === 'expo') return F.PEOPLE.filter(p => EXPO_COMPANIES.has(p.company));
    if (tab === 'partners') return F.PEOPLE.filter(p => p.hb || p.goal === 'покупаю' || p.goal === 'инвестирую');
    return F.PEOPLE;
  }

  D.register('F1', {
    tab: 'F1',
    meta: {
      title: 'F1 · Люди',
      role: 'Гость / участник',
      fr: ['FR-PPL-01', 'FR-PPL-03', 'FR-PPL-05'],
      ac: ['AC-PPL-01'],
      what: [
        'Каталог участников: вкладки разделов, поиск по имени и компании, счётчик результатов.',
        'Строки: аватар-инициалы, имя, компания, должность, цель, тариф, свободные окна.',
        'Строка ведёт в карточку человека.'
      ],
      rules: [
        'Список людей виден всем тарифам (D-07); поля «по запросу» открываются заявкой.',
        'Тариф — нейтральная метка, не поощряет и не наказывает.',
        'Вкладки разделов — демо-группировка: спикеры, экспоненты, партнёры.'
      ],
      depends: ['D-07', 'FR-PPL-03']
    },
    html(ctx) {
      const st = ctx.state;
      st.tab = st.tab || 'all';
      st.q = st.q || '';
      const q = st.q.trim().toLowerCase();
      let list = peopleOf(st.tab);
      if (q) list = list.filter(p => (p.name + ' ' + p.company + ' ' + p.role + ' ' + p.goal + ' ' + p.industry).toLowerCase().includes(q));

      const rows = list.map(p =>
        '<button class="row clickable" data-go="F2/' + p.id + '">' +
        avatar(p.name, 'sm') +
        '<div class="grow"><div class="r-title">' + esc(p.name) + (p.hb ? ' <span class="hb-badge">HB</span>' : '') + '</div>' +
        '<div class="r-sub">' + esc(p.company) + ' · ' + esc(p.role) + '</div>' +
        '<div class="r-sub">' + esc(p.goal) + ' · свободно ' + esc(p.free) + '</div></div>' +
        tariffTag(p.tariff) + icon('chevR') + '</button>').join('');

      const tabs = F.CATALOG_TABS.map(t =>
        '<button class="chip' + (st.tab === t.id ? ' on' : '') + '" data-act="f1-tab" data-arg="' + t.id + '">' + esc(t.label) + '</button>').join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Люди</h1>' +
        '<div class="sub">Участники, спикеры, экспоненты и партнёры</div></div>' +
        '<button class="icon-btn" data-go="F4" aria-label="Входящие заявки">' + icon('bell') + '</button></div>' +
        '<input class="input" type="search" id="f1-q" placeholder="Имя, компания, цель" value="' + esc(st.q) + '" aria-label="Поиск по людям" style="margin-top:10px">' +
        '</div>' +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + tabs + '</div>' +
        '<div class="cap" style="margin-top:-4px">Найдено: ' + list.length + '</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        (rows || '<div class="empty"><div class="e-title">Никого не нашли</div><div class="e-text">Попробуйте другой запрос или снимите фильтр.</div></div>') +
        '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#f1-q');
      if (inp) inp.addEventListener('input', () => {
        D.st('F1').q = inp.value;
        const cnt = host.querySelector('.scr .cap');
        /* счётчик обновляем перерендером с задержкой, чтобы не мешать вводу */
        clearTimeout(window.__f1t);
        window.__f1t = setTimeout(() => D.rerender(), 350);
      });
    }
  });
  D.action('f1-tab', el => { D.st('F1').tab = el.dataset.arg; D.rerender(); });

  /* ---------- F3 Заявка на знакомство ---------- */
  D.register('F3', {
    tab: 'F1',
    meta: {
      title: 'F3 · Заявка на знакомство',
      role: 'Гость / участник',
      fr: ['FR-PPL-04', 'FR-PPL-06'],
      ac: ['AC-PPL-03'],
      what: [
        'Форма заявки: причина до 280 знаков с живым счётчиком — обязательна.',
        'Лимит окон адресата: «у {имя} свободно N из M окон».',
        'Отправка активна только с заполненной причиной.',
        'Пометка: адресат увидит вашу причину и цель.'
      ],
      rules: [
        'Причина обязательна и ограничена 280 знаками; показывается адресату как есть.',
        'Входящих заявок в день — не более 4 у адресата (квота REQ_LIMIT).',
        'Исходящие ожидающие заявки ограничены (5); принятая заявка открывает контакты по запросу.'
      ],
      depends: ['FR-PPL-06 причина обязательна']
    },
    html(ctx) {
      const st = ctx.state;
      const pid = (ctx.param && F.person(ctx.param)) ? ctx.param : 'p01';
      const p = F.person(pid);
      st.reason = st.reason != null ? st.reason : '';
      st.sent = !!st.sent;
      const len = st.reason.length;
      const ok = len >= 10 && len <= 280;

      if (st.sent) {
        return '<div class="scr"><div class="scr-head"><div class="head-row"><div>' +
          '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
          '<div style="margin-top:10px"><div class="eyebrow">Заявка отправлена</div>' +
          '<h1>Ждём ответа</h1>' +
          '<div class="sub">' + esc(p.name) + ' · ' + esc(p.company) + '</div></div>' +
          '</div></div>' +
          paren('ответ придёт уведомлением и в раздел заявок') +
          '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
          '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Заявка у ' + esc(p.name) + '</div>' +
          '<div class="cap">«' + esc(st.reason.slice(0, 90)) + (st.reason.length > 90 ? '…' : '') + '»</div></div></div>' +
          '<div class="banner">' + icon('clock') + '<div class="cap">Обычно отвечают в течение часа. Если окна закончатся — предложим другие.</div></div>' +
          '<button class="btn btn-primary btn-block" data-go="F1">К каталогу людей</button>' +
          '<div style="height:16px"></div></div></div>';
      }

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F2/' + p.id + '" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Заявка на знакомство</div><h1>Почему вы?</h1>' +
        '<div class="sub">' + esc(p.name) + ' · ' + esc(p.company) + ' · ' + esc(p.role) + '</div></div></div>' +
        '</div>' +
        paren('адресат увидит вашу причину и цель') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 14px">' +
        avatar(p.name, 'sm') + '<div class="grow"><div class="r-title" style="font-size:14px">' + esc(p.name) + '</div>' +
        '<div class="r-sub">' + esc(p.company) + ' · свободно ' + esc(p.free) + '</div></div></div>' +
        '<div class="field"><label for="f3-reason">Причина знакомства <span class="cap">· обязательно, до 280 знаков</span></label>' +
        '<textarea class="textarea" id="f3-reason" maxlength="280" placeholder="Что объединяет, что хотите обсудить, какую пользу можете принести">' + esc(st.reason) + '</textarea>' +
        '<div class="counter"><span>' + len + ' / 280</span>' + (len < 10 && len > 0 ? '<span class="cap">· минимум 10 знаков</span>' : '') + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Ваша цель «' + esc(F.ME.goals[0] || 'нетворкинг') + '» и польза видны адресату вместе с причиной.</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="f3-send"' + (ok ? '' : ' disabled') + '>Отправить запрос</button>' +
        '<div class="cap" style="text-align:center">' + (ok ? '' : 'заполните причину, чтобы отправить') + '</div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#f3-reason');
      if (ta) ta.addEventListener('input', () => {
        const st = D.st('F3');
        st.reason = ta.value.slice(0, 280);
        const btn = host.querySelector('.btn-primary');
        const len = st.reason.length;
        if (btn) btn.disabled = !(len >= 10 && len <= 280);
        const cnt = host.querySelector('.counter');
        if (cnt) {
          const note = len < 10 && len > 0 ? ' · минимум 10 знаков' : '';
          cnt.innerHTML = '<span>' + len + ' / 280</span>' + (note ? '<span class="cap">' + note + '</span>' : '');
        }
      });
    }
  });
  D.action('f3-send', () => {
    D.st('F3').sent = true;
    D.toast('Заявка отправлена');
    D.rerender();
  });

  /* ---------- F4 Входящие заявки ---------- */
  D.register('F4', {
    tab: 'F1',
    meta: {
      title: 'F4 · Входящие заявки',
      role: 'Гость / участник',
      fr: ['FR-PPL-06', 'FR-PPL-07'],
      ac: ['AC-PPL-04'],
      what: [
        'Очередь входящих заявок на знакомство с причиной каждого.',
        'Счётчик «сегодня принято N из M».',
        'Действия: принять, отложить, отклонить — с сохранением статуса.'
      ],
      rules: [
        'Входящих заявок в день — не более 4; принятая заявка расходует квоту.',
        'Принятие открывает контакты по уровням видимости профиля.',
        'Отклонённая заявка видна отправителю как «отклонено» без деталей.'
      ],
      depends: ['FR-PPL-06']
    },
    html(ctx) {
      const st = ctx.state;
      st.dec = st.dec || {};
      const lim = F.REQ_LIMIT;
      const accepted = F.INCOMING_REQS.filter(r => (st.dec[r.id] || r.status) === 'accepted').length;
      const done = F.INCOMING_REQS.filter(r => (st.dec[r.id] || r.status) === 'done').length;

      const card = r => {
        const p = F.person(r.from);
        const status = st.dec[r.id] || r.status;
        let btns;
        if (status === 'new') {
          btns = '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
            '<button class="btn btn-primary btn-sm" data-act="f4-acc" data-arg="' + r.id + '">Принять</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="f4-later" data-arg="' + r.id + '">Позже</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="f4-dec" data-arg="' + r.id + '">Отклонить</button></div>';
        } else {
          const lbl = { accepted: 'принята', declined: 'отклонена', later: 'отложена', done: 'уже принята' }[status] || status;
          btns = '<div class="cap" style="margin-top:8px">Статус: ' + lbl + '</div>';
        }
        return '<div class="card"><div style="display:flex;gap:12px;align-items:flex-start">' +
          avatar(p ? p.name : '?', 'sm') +
          '<div class="grow" style="min-width:0"><div class="r-title" style="font-size:14.5px">' + esc(p ? p.name : '') + ' · ' + esc(p ? p.company : '') + '</div>' +
          '<div class="r-sub" style="margin-top:2px">«' + esc(r.reason) + '»</div>' +
          '<div class="r-sub" style="margin-top:4px">цель: ' + esc(p ? p.goal : '') + ' · свободно ' + esc(p ? p.free : '') + '</div>' + btns + '</div></div></div>';
      };

      const pending = F.INCOMING_REQS.filter(r => (st.dec[r.id] || r.status) === 'new');
      const rest = F.INCOMING_REQS.filter(r => (st.dec[r.id] || r.status) !== 'new');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Заявки</div><h1>Входящие</h1>' +
        '<div class="sub">Знакомства с участниками</div></div></div>' +
        '</div>' +
        paren('сегодня принято ' + (accepted + done) + ' из ' + lim.day) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        (pending.length ? pending.map(card).join('') : '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Очередь пуста</div><div class="cap">Новых заявок нет — ответим, когда появятся.</div></div></div>') +
        (rest.length ? '<div class="sec-title">Ранее</div>' + rest.map(card).join('') : '') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  ['acc', 'later', 'dec'].forEach((k, i) => {
    D.action('f4-' + ['acc', 'later', 'dec'][i], el => {
      const st = D.st('F4');
      st.dec = st.dec || {};
      st.dec[el.dataset.arg] = k === 'acc' ? 'accepted' : k === 'later' ? 'later' : 'declined';
      D.toast(k === 'acc' ? 'Заявка принята — контакты открыты' : k === 'later' ? 'Отложено' : 'Заявка отклонена');
      D.rerender();
    });
  });

  /* ---------- F5 Исходящие ---------- */
  D.register('F5', {
    tab: 'F1',
    meta: {
      title: 'F5 · Исходящие заявки',
      role: 'Гость, знакомства',
      fr: ['FR-PPL-03'],
      ac: ['AC-PPL-03'],
      what: [
        'Мои отправленные заявки на знакомство со статусами.',
        'Статусы: ожидает, принята, отклонена, истекла.',
        'Для принятой — переход к карточке человека и контакту.'
      ],
      rules: [
        'Заявка живёт 24 часа; без ответа — статус «истекла» и место возвращается.',
        'Одна активная заявка на пару человек–человек.',
        'Причина видна адресату, мои заметки — нет.'
      ],
      depends: ['D-09']
    },
    html(ctx) {
      const stMap = { pending: 'ожидает', accepted: 'принята', declined: 'отклонена', expired: 'истекла' };
      const stCls = { pending: 'wait', accepted: 'ok', declined: '', expired: '' };
      const rows = F.OUTGOING_REQS.map(r => {
        const p = F.person(r.to);
        return '<div class="row"><div class="grow"><div class="r-title">' + esc(p ? p.name : r.to) + '</div>' +
          '<div class="r-sub">' + esc(p ? p.company : '') + ' · ' + esc(r.reason) + '</div></div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
          '<span class="mc-status ' + (stCls[r.status] || '') + '">' + esc(stMap[r.status]) + '</span>' +
          (r.status === 'accepted' ? '<button class="btn btn-ghost btn-sm" data-go="F2/' + r.to + '">Открыть</button>' : '') +
          '</div></div>';
      }).join('');
      const expired = '<div class="row"><div class="grow"><div class="r-title">' + esc(F.person('p15').name) + '</div>' +
        '<div class="r-sub">' + esc(F.person('p15').company) + ' · заявка не получила ответа</div></div>' +
        '<span class="mc-status">истекла</span></div>';
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Знакомства</div><h1>Мои заявки</h1>' +
        '<div class="sub">отправленные запросы на контакт</div></div></div>' +
        '</div>' +
        paren('заявка живёт сутки') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + expired + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Новая заявка доступна из каталога F1 — лимит на количество отправленных проверяется системой.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- F6 НеРэндом кофе ---------- */
  D.register('F6', {
    tab: 'F1',
    meta: {
      title: 'F6 · Пара дня',
      role: 'Гость, знакомства',
      fr: ['FR-PPL-06'],
      ac: ['AC-PPL-06'],
      what: [
        'Ежедневная пара для короткого кофе: два участника и точка на площадке.',
        'Причины совпадения показаны честно: тема, цель, свободное время.',
        'Кнопки «Предложить кофе» и «Пропустить сегодня».'
      ],
      rules: [
        'Пара подбирается по целям и темам, без скрытого профилирования — причины видны.',
        'Одна пара в день; «пропустить» не наказывает в следующих подборках.',
        'Точка встречи — спокойное место с посадкой (Бизнес-лаунж или кафе зала).'
      ],
      depends: ['цели и темы', 'свободное время']
    },
    html(ctx) {
      const c = F.COFFEE;
      const pa = F.person(c.a), pb = F.person(c.b);
      const card = p => p ? '<div class="card" style="text-align:center;padding:18px 14px">' + avatar(p.name, 'xl accent') +
        '<div style="font-weight:600;font-size:14px;margin-top:8px">' + esc(p.name) + '</div>' +
        '<div class="cap" style="margin-top:2px">' + esc(p.company) + '</div>' +
        '<div class="cap" style="margin-top:6px">' + esc(p.goal || 'цель рядом') + '</div></div>' : '';
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Знакомства</div><h1>Пара дня</h1>' +
        '<div class="sub">короткий кофе · ' + esc(c.time) + '</div></div></div>' +
        '</div>' +
        paren('почему именно эта пара — ниже') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="grid-2" style="gap:10px">' + card(pa) + card(pb) + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Почему вы можете быть полезны друг другу</div>' +
        c.reasons.map(r => '<div class="row" style="padding:6px 0"><span class="feed-kind"></span><div class="r-sub">' + esc(r) + '</div></div>').join('') + '</div>' +
        '<div class="banner">' + icon('pin') + '<div class="cap">Точка: ' + esc(c.point) + ' · переход от вашего зала — ' + (F.travelMin('magnolia','magnolia') || '—') + ' мин</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="f6-send">' + icon('chat') + 'Предложить кофе</button>' +
        '<button class="btn btn-ghost btn-block" data-act="f6-skip">Пропустить сегодня</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('f6-send', () => D.toast('Приглашение отправлено — ждём ответа'));
  D.action('f6-skip', () => D.toast('На сегодня пропущено — завтра будет новая пара'));

  /* ---------- F7 QR-визитка ---------- */
  D.register('F7', {
    tab: 'F1',
    meta: {
      title: 'F7 · QR-визитка',
      role: 'Гость, обмен контактами',
      fr: ['FR-PPL-07'],
      ac: ['AC-PPL-07'],
      what: [
        'Показ моей визитки как QR и сканирование чужой.',
        'Переключатель «какие контакты передавать»: имя, компания, телефон, Telegram.',
        'Согласие фиксируется на каждый скан — список в «Мои контакты».'
      ],
      rules: [
        'Передаются только включённые поля; скрытые не попадают в скан.',
        'QR живёт 60 секунд и обновляется; скриншот не принимается дольше 90 секунд.',
        'Сканирование создаёт контакт только при согласии второй стороны.'
      ],
      depends: ['D-09', 'токены QR']
    },
    html(ctx) {
      const st = ctx.state;
      st.fields = st.fields || { name: true, company: true, tg: true, phone: false };
      const f = st.fields;
      const rows = [['name','Имя и фамилия'],['company','Компания и должность'],['tg','Telegram'],['phone','Телефон']].map(([k,l]) =>
        '<label class="toggle-row" style="cursor:pointer"><div class="tr-title" style="font-weight:500;font-size:14px">' + l + '</div>' +
        '<span class="toggle"><input type="checkbox" data-f7f="' + k + '"' + (f[k] ? ' checked' : '') + '><span class="tr"></span></span></label>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Контакты</div><h1>QR-визитка</h1>' +
        '<div class="sub">обмен без поиска в каталоге</div></div></div>' +
        '</div>' +
        paren('показывайте код — или сканируйте чужой') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="qr-box"><div class="qr" data-qr="f7" style="width:150px;height:150px"></div>' +
        '<div class="qr-caption">' + esc(F.ME.name) + ' · ' + esc(F.ME.company) + '</div>' +
        '<div class="cap">код обновляется каждые 60 секунд</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Что передавать при сканировании</div>' + rows + '</div>' +
        '<button class="btn btn-primary btn-block" data-go="J1">Сканировать визитку</button>' +
        '<button class="btn btn-ghost btn-block" data-go="F8">Мои контакты · ' + F.MY_CONTACTS.length + '</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const el = host.querySelector('[data-qr="f7"]');
      if (el) el.innerHTML = qrPat('visit-' + F.ME.patronymic, 150);
      host.querySelectorAll('[data-f7f]').forEach(inp => inp.addEventListener('change', () => {
        D.st('F7').fields[inp.dataset.f7f] = inp.checked;
        D.toast('Передача поля ' + (inp.checked ? 'включена' : 'выключена'));
      }));
    }
  });
  /* код-нативный узор QR (как в L1): декоративный */
  function qrPat(seed, px) {
    const N = 21, cell = px / N;
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    let out = '<rect width="' + px + '" height="' + px + '" fill="#fff"/>';
    const bit = (x, y) => { h = (h * 1103515245 + 12345 + x * 97 + y * 31) >>> 0; return (h >>> 8) % 5 < 2; };
    const finder = (fx, fy) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6, core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (edge || core) out += '<rect x="' + ((fx + x) * cell).toFixed(1) + '" y="' + ((fy + y) * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '"/>';
    } };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const inF = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
      if (!inF && bit(x, y)) out += '<rect x="' + (x * cell).toFixed(1) + '" y="' + (y * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '"/>';
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    return '<svg viewBox="0 0 ' + px + ' ' + px + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges" aria-label="Демонстрационный QR-узор">' + out + '</svg>';
  }

  /* ---------- F8 Мои контакты ---------- */
  D.register('F8', {
    tab: 'F1',
    meta: {
      title: 'F8 · Мои контакты',
      role: 'Гость, контакты',
      fr: ['FR-PPL-07'],
      ac: ['AC-PPL-07'],
      what: [
        'Все контакты, собранные за фестиваль: имя, компания, метка, заметка, когда познакомились.',
        'Фильтр по меткам «горячий / тёплый / холодный».',
        'Выгрузка контактов в файл — по кнопке внизу.'
      ],
      rules: [
        'Контакт появляется только при взаимном согласии на обмен.',
        'Заметки и метки видны только мне и не передаются третьим лицам.',
        'Выгрузка — в vCard/CSV по моему действию, без фоновой отправки.'
      ],
      depends: ['согласие на обмен', 'заметки']
    },
    html(ctx) {
      const st = ctx.state;
      st.f = st.f || 'all';
      const tags = [['all','Все'],['горячий','Горячие'],['тёплый','Тёплые'],['холодный','Холодные']];
      const chips = tags.map(([id,l]) => '<button class="chip' + (st.f===id?' on':'') + '" data-act="f8-filter" data-arg="' + id + '">' + l + '</button>').join('');
      const list = F.MY_CONTACTS.filter(c => st.f === 'all' || c.tag === st.f);
      const rows = list.map(c =>
        '<div class="row"><div class="grow" style="display:flex;gap:10px;align-items:center">' + avatar(c.name, 'sm accent') +
        '<div><div class="r-title">' + esc(c.name) + ' ' + tag(c.tag, c.tag === 'горячий' ? 'urgent' : (c.tag === 'тёплый' ? 'accent' : '')) + '</div>' +
        '<div class="r-sub">' + esc(c.company) + ' · ' + esc(c.note) + '</div>' +
        '<div class="cap" style="margin-top:2px">' + esc(c.when) + '</div></div></div>' + icon('chevR') + '</div></div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="F1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Контакты</div><h1>Мои контакты</h1>' +
        '<div class="sub">' + F.MY_CONTACTS.length + ' человека · по согласию</div></div></div>' +
        '</div>' +
        paren('заметки видны только вам') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<button class="btn btn-secondary btn-block" data-act="f8-export">' + icon('download') + 'Выгрузить контакты</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('f8-filter', el => { D.st('F8').f = el.dataset.arg; D.rerender(); });
  D.action('f8-export', () => D.toast('Файл контактов сформирован — в демо загрузка не выполняется'));
})();

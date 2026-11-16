/* Блок M — итоги и оценки. Фаза B: M3 «Оцените день». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  const STAR_SVG = n => {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      s += '<svg class="ic' + (i <= n ? ' on' : '') + '" viewBox="0 0 24 24" fill="' + (i <= n ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
    }
    return '<span class="rate-stars" data-stars="' + n + '">' + s + '</span>';
  };

  D.register('M3', {
    tab: 'MORE',
    meta: {
      title: 'M3 · Оцените день',
      role: 'Гость / участник',
      fr: ['FR-RATE-01', 'FR-RATE-02'],
      ac: ['AC-RATE-01'],
      what: [
        'Сессии дня, где человек записан или отмечен присутствие.',
        'Оценка звёздами одним жестом и метки впечатления.',
        'Индикатор прогресса «N из 5» и кнопка отправки.'
      ],
      rules: [
        'Оцениваются только сессии с записью или отметкой присутствия — по списку DAY_RATINGS.',
        'Оценка и метки уходят в итоговую аналитику фестиваля анонимно.',
        'Можно оценить часть сессий и вернуться позже.'
      ],
      depends: ['FR-PROG-07 отметка присутствия']
    },
    html(ctx) {
      const st = ctx.state;
      st.val = st.val || {};   // id -> {stars, tags[]}
      const ids = F.DAY_RATINGS;
      const done = ids.filter(id => st.val[id] && st.val[id].stars).length;
      const total = ids.length;

      const cards = ids.map(id => {
        const s = F.session(id);
        if (!s) return '';
        const h = F.hall(s.hall);
        const v = st.val[id] || {};
        const tags = F.RATING_TAGS.map(t =>
          '<button class="chip' + ((v.tags || []).includes(t) ? ' on' : '') + '" data-act="m3-tag" data-arg="' + id + ':' + t + '">' + esc(t) + '</button>').join('');
        return '<div class="card" data-sess="' + id + '"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
          '<div class="grow" style="min-width:0"><div class="r-title" style="font-size:14.5px">' + esc(s.title) + '</div>' +
          '<div class="r-sub">' + esc(s.time) + ' · ' + esc(h.name) + ' · ' + esc(s.format) + '</div></div>' +
          '<span class="pill-count">' + (v.stars ? v.stars + '/5' : '—') + '</span></div>' +
          '<div style="margin-top:10px">' + STAR_SVG(v.stars || 0) + '</div>' +
          (v.stars ? '<div class="tags-row" style="margin-top:10px">' + tags + '</div>' : '') +
          '</div>';
      }).join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Оцените день</h1>' +
        '<div class="sub">Сессии, где вы были или записаны</div></div></div>' +
        '</div>' +
        paren('оценки уходят в итоги фестиваля анонимно') +
        (st.sent ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Оценки отправлены</div><div class="cap">Спасибо — они попадут в итоги фестиваля.</div></div></div>' : '') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="flex-direction:row;align-items:center;gap:12px"><div class="grow"><div class="cap">Прогресс</div>' +
        '<div style="font-family:var(--font-display);font-size:24px">' + done + ' из ' + total + '</div></div>' +
        '<div class="progress" style="flex:1;max-width:120px"><i style="width:' + Math.round(done / total * 100) + '%"></i></div></div>' +
        cards +
        '<button class="btn btn-primary btn-block" data-act="m3-send"' + (done ? '' : ' disabled') + '>Отправить оценки</button>' +
        '<button class="btn btn-ghost btn-block" data-go="M4">Мои итоги</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      host.querySelectorAll('[data-stars]').forEach(el => {
        el.querySelectorAll('svg').forEach((svg, i) => {
          svg.style.cursor = 'pointer';
          svg.addEventListener('click', () => {
            const card = el.closest('.card');
            const id = card ? card.dataset.sess : null;
            if (!id) return;
            const st = D.st('M3');
            st.val = st.val || {};
            const cur = st.val[id] || {};
            cur.stars = i + 1;
            cur.tags = cur.tags || [];
            st.val[id] = cur;
            D.rerender();
          });
        });
      });
    }
  });
  D.action('m3-tag', el => {
    const [id, t] = el.dataset.arg.split(':');
    const st = D.st('M3');
    st.val = st.val || {};
    const cur = st.val[id] || { stars: 0, tags: [] };
    cur.tags = cur.tags || [];
    const i = cur.tags.indexOf(t);
    if (i >= 0) cur.tags.splice(i, 1); else cur.tags.push(t);
    st.val[id] = cur;
    D.rerender();
  });
  D.action('m3-send', () => {
    const st = D.st('M3');
    st.sent = true;
    D.toast('Оценки отправлены — спасибо!');
    D.rerender();
  });

  /* ---------- M1 Заметки ---------- */
  D.register('M1', {
    tab: 'MORE',
    meta: {
      title: 'M1 · Заметки',
      role: 'Гость, заметки',
      fr: ['FR-NOTE-01'],
      ac: ['AC-NOTE-01'],
      what: [
        'Все заметки фестиваля: список с поиском по тексту и меткам.',
        'У каждой — привязка к сессии или контакту, время, метки.',
        'Новая заметка — кнопкой; открытие ведёт к M2.'
      ],
      rules: [
        'Заметки видны только автору; организатор видит их только по запросу в поддержку.',
        'Привязка к сессии сохраняется при изменении расписания.',
        'Поиск идёт по тексту, заголовку и меткам без учёта регистра.'
      ],
      depends: ['заметки', 'программа']
    },
    html(ctx) {
      const st = ctx.state;
      st.q = st.q || '';
      const q = st.q.toLowerCase();
      const list = F.NOTES.filter(n => !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
      const rows = list.map(n => {
        const s = n.session ? F.session(n.session) : null;
        return '<button class="row clickable" data-go="M2/' + n.id + '"><div class="grow">' +
          '<div class="r-title note-card" style="padding-left:8px">' + esc(n.title) + '</div>' +
          '<div class="r-sub" style="margin-top:2px">' + esc(n.time) + (s ? ' · ' + esc(s.title.slice(0, 40)) : ' · без привязки') + '</div>' +
          '<div class="note-tags" style="margin-top:6px">' + n.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div>' + icon('chevR') + '</button>';
      }).join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Заметки</div><h1>Мои заметки</h1>' +
        '<div class="sub">' + F.NOTES.length + ' записей · поиск и метки</div></div></div>' +
        '</div>' +
        paren('заметки видны только вам') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<input class="input" placeholder="Поиск по тексту и меткам" value="' + esc(st.q) + '" data-m1q>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="M2/new">' + icon('plus') + 'Новая заметка</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('[data-m1q]');
      if (inp) inp.addEventListener('input', () => { D.st('M1').q = inp.value; D.rerender(); });
    }
  });

  /* ---------- M2 Заметка в сессии ---------- */
  D.register('M2', {
    tab: 'MORE',
    meta: {
      title: 'M2 · Заметка',
      role: 'Гость, заметки',
      fr: ['FR-NOTE-01'],
      ac: ['AC-NOTE-01'],
      what: [
        'Редактор заметки: текст, метки, привязка к сессии.',
        'Фото-заглушка: место для снимка сессии (камера в демо не активна).',
        'Сохранение привязывает заметку к сессии и обновляет список M1.'
      ],
      rules: [
        'Заметка без текста не сохраняется — только метки и фото.',
        'Метки выбираются из справочника; свои — до 20 знаков.',
        'Фото хранится локально в моём архиве, в облако уходит по желанию.'
      ],
      depends: ['заметки', 'программа']
    },
    html(ctx) {
      const st = ctx.state;
      const id = ctx.param;
      const n = id && id !== 'new' ? F.NOTES.find(x => x.id === id) : null;
      st.text = st.text !== undefined ? st.text : (n ? n.text : '');
      st.tags = st.tags || (n ? n.tags.slice() : []);
      st.sess = st.sess !== undefined ? st.sess : (n && n.session ? n.session : 's2704');
      const sessOpts = F.sessionsOf('27.02').map(s => '<option value="' + s.id + '"' + (st.sess === s.id ? ' selected' : '') + '>' + esc(s.title.slice(0, 44)) + '</option>').join('');
      const tagChips = F.NOTE_TAGS.map(t => {
        const on = st.tags.includes(t);
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="m2-tag" data-arg="' + t + '">' + esc(t) + '</button>';
      }).join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="M1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Заметки</div><h1>' + (n ? 'Заметка' : 'Новая заметка') + '</h1>' +
        '<div class="sub">' + (n ? esc(n.time) : 'сейчас') + '</div></div></div>' +
        '</div>' +
        paren('заметка привяжется к сессии') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="map-plate" style="min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
        '<div class="ic">' + icon('eye') + '</div><div class="cap">Фото сессии — в демо заглушка</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Привязка</div>' +
        '<select class="input" data-m2sess>' + sessOpts + '</select></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Метки</div><div class="chips" style="flex-wrap:wrap">' + tagChips + '</div></div>' +
        '<div class="card"><textarea class="textarea" rows="5" placeholder="Текст заметки…" data-m2text>' + esc(st.text) + '</textarea></div>' +
        '<button class="btn btn-primary btn-block" data-act="m2-save">Сохранить заметку</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('[data-m2text]');
      if (ta) ta.addEventListener('input', () => { D.st('M2').text = ta.value; });
      const sel = host.querySelector('[data-m2sess]');
      if (sel) sel.addEventListener('change', () => { D.st('M2').sess = sel.value; });
    }
  });
  D.action('m2-tag', el => {
    const st = D.st('M2'), t = el.dataset.arg, i = st.tags.indexOf(t);
    if (i >= 0) st.tags.splice(i, 1); else st.tags.push(t);
    D.rerender();
  });
  D.action('m2-save', () => { D.toast('Заметка сохранена'); setTimeout(() => { location.hash = '#/M1'; }, 600); });

  /* ---------- M4 Мои итоги ---------- */
  D.register('M4', {
    tab: 'MORE',
    meta: {
      title: 'M4 · Мои итоги',
      role: 'Гость, итоги фестиваля',
      fr: ['FR-ANL-01'],
      ac: ['AC-ANL-01'],
      what: [
        'Сводка за фестиваль: встречи, контакты, договорённости, сессии.',
        'Цифры собраны из ваших действий — без чужих данных.',
        'Выгрузка итогов файлом и переход к заметкам.'
      ],
      rules: [
        'Итоги считаются только по подтверждённым событиям: встреча засчитана после отметки прихода или исхода.',
        'Контакты — только по взаимному согласию на обмен.',
        'Выгрузка — в читаемом виде, доступна 180 дней после события.'
      ],
      depends: ['встречи', 'контакты', 'заметки']
    },
    html(ctx) {
      const tiles = [
        ['Встреч', F.MY_MEETINGS.length + ' · 3 состоялось'],
        ['Контакты', F.MY_CONTACTS.length + ' человека'],
        ['Заметки', F.NOTES.length],
        ['Оценки', F.DAY_RATINGS.length + ' из ' + F.DAY_RATINGS.length]
      ];
      const deals = [
        ['Отправить расчёт — Игорь Власов', 'ТехноСклад · следующий шаг'],
        ['Демо-стенд — Дмитрий Аврамов', 'Группа Аврона · подготовить'],
        ['Познакомить с КлиентПоток — Марина Крылова', 'Студия Кедр · контакты']
      ];
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Итоги</div><h1>Мои итоги</h1>' +
        '<div class="sub">' + esc(F.NOW.dateLong) + ' · ваша статистика</div></div></div>' +
        '</div>' +
        paren('только подтверждённые события') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="stat-tiles two">' + tiles.map(([l, v]) => '<div class="stat-tile"><span class="num" style="font-size:24px">' + esc(v) + '</span><span class="lbl">' + esc(l) + '</span></div>').join('') + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Договорённости и следующие шаги</div>' +
        deals.map(d => '<div class="row" style="padding:7px 0"><span class="feed-kind"></span><div class="grow"><div class="r-title" style="font-size:14px">' + esc(d[0]) + '</div><div class="r-sub">' + esc(d[1]) + '</div></div></div>').join('') + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Сессии с оценками</div>' +
        '<div class="r-sub">Вы оценили ' + F.DAY_RATINGS.length + ' события — средняя оценка 4.6 из 5 по вашим меткам.</div>' +
        '<button class="feed-link" data-go="M3" style="margin-top:6px">Оценки дня ' + icon('chevR') + '</button></div>' +
        '<div style="display:flex;gap:10px">' +
        '<button class="btn btn-secondary" style="flex:1" data-act="m4-export">Выгрузить</button>' +
        '<button class="btn btn-primary" style="flex:1" data-go="M1">Заметки</button></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('m4-export', () => D.toast('Итоги выгружены — в демо файл не формируется'));
})();

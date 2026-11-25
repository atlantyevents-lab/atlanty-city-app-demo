/* Блок M — заметки, оценки и итоги (раздел S7, демо v3).
   M1–M3 оставлены (заметки берутся из FIX.PS.notes, оценки дня по DAY_RATINGS); M4 переделан; M5 и M6 новые.
   Общее состояние профиля — FIX.PS (data/fx_profile.js); экранное — D.st(id). */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;
  const PS = F.PS;

  /* перерисовка без прыжка прокрутки; лист закрывается */
  function rr(msg, ms) {
    const s = document.querySelector('.scr'), y = s ? s.scrollTop : 0;
    D.closeSheet();
    D.rerender();
    const n = document.querySelector('.scr');
    if (n) n.scrollTop = y;
    if (msg) D.toast(msg, ms);   /* тост после перерисовки: рамка пересоздаётся и старый тост пропал бы */
  }
  /* кнопки в конце листа закрепляются внизу (sticky): «Отмена» и главное действие не уходят за край */
  function pinFoot(sh) {
    if (!sh) return;
    const kids = [...sh.children];
    let i = kids.length;
    while (i > 0 && kids[i - 1].matches('button.btn')) i--;
    const tail = kids.slice(i);
    if (!tail.length || i <= 1) return;
    const foot = document.createElement('div');
    foot.className = 'cab-sheet-foot';
    tail.forEach(b => foot.appendChild(b));
    sh.appendChild(foot);
  }
  const sheet = (title, body) => { D.openSheet('<div class="sheet-title">' + title + '</div>' + body); pinFoot(document.querySelector('.sheet')); };
  const val = sel => { const el = document.querySelector('.sheet ' + sel); return el ? el.value : ''; };
  const sec = (t, more) => '<div class="sec-title">' + t + (more || '') + '</div>';
  /* обрезка по границе слова с «…» (без разрыва слова посередине) */
  const cutW = (str, n) => {
    str = String(str || '');
    if (str.length <= n) return str;
    const head = str.slice(0, n + 1), i = head.lastIndexOf(' ');
    return (i > n * 0.5 ? head.slice(0, i) : str.slice(0, n)).replace(/[\s,;:.—-]+$/, '') + '…';
  };
  /* предыдущий маршрут: слушатель регистрируется после слушателя core.js, поэтому при отрисовке экрана здесь ещё хэш ухода */
  let lastHash = location.hash;
  window.addEventListener('hashchange', () => { lastHash = location.hash; });

  const STAR_SVG = n => {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      s += '<svg class="ic' + (i <= n ? ' on' : '') + '" viewBox="0 0 24 24" fill="' + (i <= n ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
    }
    return '<span class="rate-stars" data-stars="' + n + '">' + s + '</span>';
  };

  /* ---------- M3 Оцените день ---------- */
  D.register('M3', {
    tab: 'MORE',
    meta: {
      title: 'M3 · Оцените день',
      role: 'Гость / участник',
      fr: ['FR-NOTE-03', 'FR-NOTE-04'],
      ac: ['AC-NOTE-01'],
      what: [
        'Сессии дня, где человек записан или отмечен присутствие.',
        'Оценка звёздами одним жестом и метки впечатления.',
        'Индикатор прогресса «N из 4» и кнопка отправки.'
      ],
      rules: [
        'Оцениваются только сессии с записью или отметкой присутствия: оценить сессию без основания нельзя.',
        'Оценка и метки уходят в итоговую аналитику фестиваля анонимно; гость оценки других не видит.',
        'Можно оценить часть сессий и вернуться позже; оценки видны в разделе «Мои итоги».'
      ],
      depends: ['FR-NOTE-04 вечерний экран в 19:00']
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
          (v.stars ? '<div class="tags-row cab-m3tags" style="margin-top:10px">' + tags + '</div>' : '') +
          '</div>';
      }).join('');

      return '<div class="scr">' +
        D.head({back:'B1', eyebrow:esc(F.NOW.dateLong), title:'Оцените день', sub:'Сессии, где вы были или записаны', paren:paren('оценки уходят в итоги анонимно')}) +
        (st.sent ? '<div class="banner ok" style="margin:0 20px 14px">' + icon('check') + '<div><div class="b-title">Оценки отправлены</div><div class="cap">Спасибо — они попадут в итоги фестиваля.</div></div></div>' : '') +
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
    rr('Оценки отправлены — спасибо!');
  });

  /* ---------- M1 Заметки ---------- */
  /* привязка заметки: контакт (person), сессия (session) или без привязки */
  const bindLabel = n => {
    if (n.person) { const p = F.person(n.person); return p ? 'контакт: ' + p.name : 'контакт'; }
    const s = n.session ? F.session(n.session) : null;
    return s ? s.title : 'без привязки';
  };
  D.register('M1', {
    tab: 'MORE',
    meta: {
      title: 'M1 · Заметки',
      role: 'Гость, заметки',
      fr: ['FR-NOTE-01', 'FR-NOTE-02'],
      ac: ['AC-NOTE-01', 'AC-NOTE-04'],
      what: [
        'Все заметки фестиваля: список с поиском по тексту и меткам.',
        'У каждой — привязка к сессии или контакту (или без привязки), время, метки.',
        'Новая заметка — кнопкой; открытие ведёт к M2; сохранённая заметка сразу попадает в список.'
      ],
      rules: [
        'Заметки видны только автору; организатор видит их только по запросу в поддержку.',
        'Привязка к сессии сохраняется при изменении расписания.',
        'Поиск идёт по тексту, заголовку и меткам без учёта регистра.',
        'Заметки о людях используются для черновика письма в разделе «Контакты после события» (M6) и не добавляют фактов.'
      ],
      depends: ['заметки', 'программа']
    },
    html(ctx) {
      const st = ctx.state;
      st.q = st.q || '';
      const q = st.q.toLowerCase();
      const all = PS.notes;
      const list = all.filter(n => !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)));
      const rows = list.map(n =>
        '<button class="row clickable" data-go="M2/' + n.id + '"><div class="grow">' +
        '<div class="r-title">' + esc(n.title) + '</div>' +
        '<div class="r-sub cab-sub2" style="margin-top:2px">' + esc(n.time) + ' · ' + esc(bindLabel(n)) + '</div>' +
        '<div class="cab-ntags">' + n.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></div>' + icon('chevR') + '</button>').join('');
      return '<div class="scr">' +
        D.head({back:'L0', eyebrow:'Заметки', title:'Мои заметки', sub:all.length + ' ' + D.plural(all.length, ['запись', 'записи', 'записей']) + ' · поиск и метки', paren:paren('заметки видны только вам')}) +
        '<div class="cab-body">' +
        '<input class="input" placeholder="Поиск по тексту и меткам" value="' + esc(st.q) + '" data-m1q aria-label="Поиск по заметкам">' +
        (list.length
          ? '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>'
          : '<div class="cab-empty">' + (all.length ? 'Ничего не найдено. Попробуйте другое слово или метку.' : 'Заметок пока нет. Запишите мысль с сессии или после встречи.') + '</div>') +
        '<button class="btn btn-primary btn-block" data-act="m1-new">' + icon('plus') + 'Новая заметка</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('[data-m1q]'), st = D.st('M1');
      if (!inp) return;
      inp.addEventListener('input', () => { st.q = inp.value; st.refocus = true; D.rerender(); });
      if (st.refocus) { st.refocus = false; inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  });
  /* новая заметка из M1: чистый редактор без привязки */
  D.action('m1-new', () => { const s = D.st('M2'); s.id = null; s.pre = null; location.hash = '#/M2/new'; });

  /* ---------- M2 Заметка ---------- */
  /* значение привязки в селекте: '' — без привязки, 'p:p03' — контакт, 's:s2603' — сессия */
  const bindVal = n => n ? (n.person ? 'p:' + n.person : n.session ? 's:' + n.session : '') : '';
  D.register('M2', {
    tab: 'MORE',
    meta: {
      title: 'M2 · Заметка',
      role: 'Гость, заметки',
      fr: ['FR-NOTE-01'],
      ac: ['AC-NOTE-01', 'AC-NOTE-02'],
      what: [
        'Редактор заметки: текст, привязка (без привязки, контакт или сессия), метки.',
        'Фото-заглушка: место для снимка сессии (камера в демо не активна).',
        'Сохранение обновляет список M1; заметка о контакте попадает в «Контакты после события» (M6) и в черновик письма; если пришли из M6, возврат в M6.'
      ],
      rules: [
        'Заметка без текста не сохраняется.',
        'Метки выбираются из справочника.',
        'По умолчанию привязки нет: заметка не привязывается к сессии молча.',
        'Фото хранится локально в моём архиве, в облако уходит по желанию.'
      ],
      depends: ['заметки', 'программа']
    },
    html(ctx) {
      const st = ctx.state;
      const id = ctx.param;
      const key = id || 'new';
      const n = id && id !== 'new' ? PS.notes.find(x => x.id === id) : null;
      /* состояние редактора привязано к заметке: при открытии другой заметки (или заметки из M6) поля сбрасываются */
      if (st.pre || st.id !== key) {
        st.id = key;
        st.text = n ? n.text : '';
        st.tags = n ? n.tags.slice() : [];
        st.bind = n ? bindVal(n) : (st.pre && st.pre.person ? 'p:' + st.pre.person : '');
        st.back = st.pre ? st.pre.back : null;
        st.pre = null;
      }
      const sessOpts = day => '<optgroup label="Сессии ' + day + '">' + F.sessionsOf(day).map(s =>
        '<option value="s:' + s.id + '"' + (st.bind === 's:' + s.id ? ' selected' : '') + '>' + esc(cutW(s.title, 60)) + '</option>').join('') + '</optgroup>';
      const peopleOpts = '<optgroup label="Контакт">' + F.POST_CONTACTS.map(c => {
        const p = F.person(c.person);
        return '<option value="p:' + c.person + '"' + (st.bind === 'p:' + c.person ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('') + '</optgroup>';
      /* сессия вне списка двух дней (заметка с привязкой к другому дню): добавляется отдельным пунктом, чтобы привязка не терялась */
      const known = ['26.02', '27.02'].some(d => F.sessionsOf(d).some(s => st.bind === 's:' + s.id));
      const extra = (st.bind.indexOf('s:') === 0 && !known && F.session(st.bind.slice(2)))
        ? '<option value="' + st.bind + '" selected>' + esc(cutW(F.session(st.bind.slice(2)).title, 60)) + '</option>' : '';
      const tagChips = F.NOTE_TAGS.map(t => {
        const on = st.tags.includes(t);
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="m2-tag" data-arg="' + t + '">' + esc(t) + '</button>';
      }).join('');
      return '<div class="scr">' +
        D.head({back: st.back || 'M1', eyebrow:'Заметки', title:(n ? 'Заметка' : 'Новая заметка'), sub:(n ? esc(n.time) : 'сейчас'), paren:paren(st.back ? 'после сохранения вернётесь к контактам' : 'можно привязать к контакту или сессии')}) +
        '<div class="cab-body">' +
        '<div class="card"><textarea class="textarea" rows="5" placeholder="Текст заметки…" data-m2text aria-label="Текст заметки">' + esc(st.text) + '</textarea></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Привязка</div>' +
        '<select class="input" data-m2sess aria-label="Привязка заметки"><option value=""' + (st.bind === '' ? ' selected' : '') + '>Без привязки</option>' + peopleOpts + sessOpts('26.02') + sessOpts('27.02') + extra + '</select></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Метки</div><div class="chips cab-m2chips" style="flex-wrap:wrap">' + tagChips + '</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="m2-save">Сохранить заметку</button>' +
        '<div class="map-plate" style="min-height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">' +
        '<div class="ic">' + icon('eye') + '</div><div class="cap">Фото сессии — в демо заглушка</div></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('[data-m2text]');
      if (ta) ta.addEventListener('input', () => { D.st('M2').text = ta.value; });
      const sel = host.querySelector('[data-m2sess]');
      if (sel) sel.addEventListener('change', () => { D.st('M2').bind = sel.value; });
    }
  });
  D.action('m2-tag', el => {
    const st = D.st('M2'), t = el.dataset.arg, i = st.tags.indexOf(t);
    if (i >= 0) st.tags.splice(i, 1); else st.tags.push(t);
    const s = document.querySelector('.scr'), y = s ? s.scrollTop : 0;
    D.rerender();
    const n = document.querySelector('.scr');
    if (n) n.scrollTop = y;
  });
  D.action('m2-save', () => {
    const st = D.st('M2'), text = (st.text || '').trim();
    if (!text) { D.toast('Заметка без текста не сохраняется'); return; }
    const person = st.bind.indexOf('p:') === 0 ? st.bind.slice(2) : null;
    const session = st.bind.indexOf('s:') === 0 ? st.bind.slice(2) : null;
    const old = st.id !== 'new' ? PS.notes.find(x => x.id === st.id) : null;
    const back = st.back || 'M1';
    if (old) {
      old.text = text; old.tags = st.tags.slice(); old.session = session; old.person = person;
    } else {
      const sess = session ? F.session(session) : null, pp = person ? F.person(person) : null;
      PS.notes.unshift({
        id: 'nn' + (PS.notes.length + 1), title: pp ? 'Контакт: ' + pp.name : sess ? 'Заметка: ' + cutW(sess.title, 36) : 'Заметка',
        session, person, time: 'сегодня, ' + PS.stamp().split(', ')[1], tags: st.tags.slice(), text
      });
    }
    st.id = null; st.back = null;
    D.toast('Заметка сохранена');
    setTimeout(() => { location.hash = '#/' + back; }, 600);
  });

  /* ---------- общее для M4–M6 ---------- */
  const addDays = (dm, n) => PS.addDays(dm, n);
  /* собеседник из записи итогов: имя, подпись и ссылка по схеме идентификаторов */
  function who(m) {
    if (m.kind === 'person') { const p = F.person(m.ref); return { name: p.name, sub: p.company, go: 'F2/' + p.id, ic: 'user' }; }
    if (m.kind === 'exhibitor') { const e = F.exhibitor(m.ref); return { name: e.name, sub: e.what, go: 'H2/' + e.id, ic: 'market' }; }
    const s = F.speaker(m.ref);
    return { name: s.name, sub: s.company, go: 'C5/' + m.ref, ic: 'mic' };
  }
  /* ссылка на человека: кнопка с областью касания не меньше 40 px */
  const personLink = id => { const p = F.person(id); return '<button class="cab-inl" data-go="F2/' + id + '">' + esc(p.name) + '</button>'; };
  const row = (ic, go, t, s) =>
    '<button class="row clickable cab-row" data-go="' + go + '"><span class="cab-ic">' + icon(ic) + '</span><div class="grow"><div class="r-title">' + esc(t) + '</div>' +
    '<div class="r-sub cab-sub1">' + esc(s) + '</div></div>' + icon('chevR') + '</button>';

  /* ---------- M4 Мои итоги ---------- */
  D.action('m4-ag', el => {
    const id = el.dataset.arg;
    PS.agDone[id] = !PS.agDone[id];
    rr(PS.agDone[id] ? 'Договорённость выполнена' : 'Договорённость снова открыта');
  });
  D.action('m4-mode-now', () => { D.st('M4').mode = 'now'; rr(); });
  D.action('m4-mode-after', () => { D.st('M4').mode = 'after'; rr(); });
  D.action('m4-pdf', () => sheet('Файл «Мои итоги фестиваля»',
    '<div class="cap">Макет: в демо файл не создаётся. В продукте PDF формируется из ваших событий и хранится до конца срока доступа.</div>' +
    '<div class="cab-sheet-list">' + ['Встречи и их исходы', 'Контакты и договорённости', 'Изученные и посещённые стенды', 'Заметки', 'Оценки сессий'].map(t => '<div class="cab-sl">' + icon('check') + '<span>' + esc(t) + '</span></div>').join('') + '</div>' +
    '<button class="btn btn-primary btn-block" data-act="m4-pdf-yes">' + icon('download') + 'Сформировать PDF</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('m4-pdf-yes', () => { D.st('M4').pdf = PS.stamp(); rr('PDF сформирован (макет, файл не выгружается)', 2800); });
  D.action('m4-mail', () => sheet('Отправить итоги на e-mail?',
    '<div class="cap">Файл уйдёт на адрес из профиля: ' + esc(F.ME.email) + '.</div>' +
    '<button class="btn btn-primary btn-block" data-act="m4-mail-yes">Отправить</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('m4-mail-yes', () => { D.closeSheet(); D.toast('Итоги отправлены на ' + F.ME.email, 2800); });

  const AG_LBL = { wait: 'ждёт подтверждения', you: 'ждёт вашего ответа', done: 'согласовано обеими сторонами' };
  const MEET_RAW = { pending: 'ждёт ответа', confirmed: 'подтверждена', held: 'состоялась', cancelled: 'отменена' };

  D.register('M4', {
    tab: '-',
    meta: {
      title: 'M4 · Мои итоги',
      role: 'Гость, итоги фестиваля',
      fr: ['FR-ANL-01', 'FR-PATH-12', 'FR-PATH-13', 'FR-NOTE-03'],
      ac: ['AC-ANL-04', 'AC-PATH-12'],
      what: [
        'Два среза: «На сейчас» (27.02.2027, 11:10, с встречами впереди) и «Итоги фестиваля» (01.03.2027, без «впереди»); из экрана «Мой путь» после события открывается итоговый срез, из остальных мест — срез на сейчас.',
        'Сводка по вашим действиям: встречи, контакты, стенды, заметки, договорённости, оценки; встречи, договорённости, контакты и стенды берутся из тех же данных, что «Встречи» (G1, G9), «Мои контакты» (F8) и «Мой список» (H3).',
        'Списки со ссылками на человека, экспонента и спикера; договорённости отмечаются выполненными.',
        'Макет файла PDF «Мои итоги фестиваля»: предпросмотр, формирование и отправка на e-mail в листе.',
        'Переходы в дорожную карту на полгода (M5) и в контакты после события (M6).'
      ],
      rules: [
        'Итоги считаются только по вашим событиям; итоговый срез — проекция демо: подтверждённые встречи считаются состоявшимися, заявка без ответа остаётся без ответа.',
        'Денежной оценки результата нет: только встречи, контакты, стенды, заметки, договорённости и оценки.',
        'Итоги доступны около полугода после события (до 28.08.2027, D-18) и выгружаются файлом.',
        'Оценки берутся из «Оцените день» (M3): средняя считается только по вашим ответам.'
      ],
      depends: ['D-18 срок доступа', 'D-52 итоги не срезаются (трактовка)']
    },
    html(ctx) {
      const st = ctx.state;
      /* срез: вход из «Мой путь» после события (B1/after) или M4/after — итоговый; перерисовка и переходы внутри блока M — прежний */
      if (!/^#\/M4(\/|$)/.test(lastHash)) {
        if (ctx.param === 'after' || ctx.param === 'now') st.mode = ctx.param;
        else if (/^#\/B1\/after/.test(lastHash)) st.mode = 'after';
        else if (!(st.mode && /^#\/M[1-6](\/|$)/.test(lastHash))) st.mode = 'now';
      }
      const fin = st.mode === 'after', mode = fin ? 'after' : 'now';
      const R = F.MY_RESULTS;
      const meets = R.meetingsAt(mode), stands = R.standsAt(mode), ags = R.agreements, contacts = F.POST_CONTACTS;
      const rate = D.st('M3').val || {};
      const rated = F.DAY_RATINGS.filter(id => rate[id] && rate[id].stars);
      const avg = rated.length ? rated.reduce((a, id) => a + rate[id].stars, 0) / rated.length : 0;
      const cnt = k => meets.filter(m => m.status === k).length;
      const done = cnt('done'), planned = cnt('planned'), nores = cnt('nores'), canc = cnt('cancelled');
      const visited = stands.filter(s => s.visited).length;
      const agOpen = ags.filter(a => !PS.agDone[a.id]).length;
      const asOf = fin ? F.RESULTS_END : F.RESULTS_NOW;
      const tile = (n, l, s) => '<div class="cab-tile"><span class="num">' + esc(n) + '</span><span class="lbl">' + esc(l) + '</span><span class="cap">' + esc(s) + '</span></div>';
      const mrow = m => {
        const w = who(m);
        const tags = m.status === 'done' ? tag('состоялась', 'ok') : m.status === 'planned' ? tag('впереди') + tag(MEET_RAW[m.raw] || '', m.raw === 'confirmed' ? 'ok' : '')
          : m.status === 'nores' ? tag('заявка без ответа') : tag('отменена');
        return '<button class="row clickable cab-row" data-go="' + w.go + '"><span class="cab-ic">' + icon(w.ic) + '</span><div class="grow"><div class="r-title">' + esc(w.name) + '</div>' +
          '<div class="r-sub cab-sub2">' + esc(m.day + ', ' + m.time + ' · ' + m.place) + '</div>' +
          '<div class="cab-tags">' + tags + (m.outcome ? tag(m.outcome) : '') + '</div></div>' + icon('chevR') + '</button>';
      };
      const srow = s => {
        const e = F.exhibitor(s.ex);
        return '<button class="row clickable cab-row" data-go="H2/' + e.id + '"><span class="cab-ic">' + icon('market') + '</span><div class="grow"><div class="r-title">' + esc(e.name) + '</div>' +
          '<div class="r-sub cab-sub1">' + esc(e.stand) + '</div><div class="cab-tags">' + (s.studied ? tag('в списке «Изучить»', 'accent') : '') + tag(s.visited ? 'были ' + s.visited : 'не были') + '</div></div>' + icon('chevR') + '</button>';
      };
      const arow = a => {
        const d = !!PS.agDone[a.id];
        return '<div class="cab-ag' + (d ? ' done' : '') + '"><button class="cab-chk' + (d ? ' on' : '') + '" data-act="m4-ag" data-arg="' + a.id + '" aria-pressed="' + d + '" aria-label="Выполнено: ' + esc(a.raw) + '">' + icon('check') + '</button>' +
          '<div class="grow"><div class="r-title">' + esc(a.raw) + '</div>' +
          '<div class="cab-ag-meta">' + (a.who && F.person(a.who) ? personLink(a.who) : '') + '<span class="r-sub">срок: ' + esc(a.dueText) + ' · ' + (d ? 'выполнено' : esc(AG_LBL[a.g9] || '')) + '</span></div></div></div>';
      };
      const notes = PS.notes.slice(0, 3);
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: fin ? 'Итоги фестиваля' : 'Итоги', title: 'Мои итоги', sub: (fin ? 'на ' : 'на ') + esc(asOf) + ' · только ваши действия', paren: paren('без оценки результата в деньгах') }) +
        '<div class="cab-segwrap">' + D.segbar([['m4-mode-now', 'На сейчас'], ['m4-mode-after', 'Итоги фестиваля']], 'm4-mode-' + mode, 'data-act') + '</div>' +
        '<div class="cab-body">' +
        '<div class="cab-tiles">' +
        tile(meets.length, 'Встречи', fin ? done + ' ' + D.plural(done, ['состоялась', 'состоялись', 'состоялись']) + (nores ? ', без ответа ' + nores : '') + (canc ? ', отменено ' + canc : '')
          : done + ' ' + D.plural(done, ['состоялась', 'состоялись', 'состоялись']) + ', ' + planned + ' впереди') +
        tile(contacts.length, 'Контакты', 'для писем и напоминаний') +
        tile(stands.length, 'Стенды', 'в списке, были: ' + visited) +
        tile(PS.notes.length, 'Заметки', 'видны только вам') +
        tile(ags.length, 'Договорённости', 'открытых: ' + agOpen) +
        tile(rated.length + ' из ' + F.DAY_RATINGS.length, 'Оценки', 'сессий оценено') + '</div>' +
        '<div class="card cab-list"><div class="list">' +
        row('route', 'M5', 'Дорожная карта на полгода', 'этапы из запросов и контактов') +
        row('mail', 'M6', 'Контакты после события', 'напомнить и написать письмо') +
        '</div></div>' +
        sec('Встречи') + '<div class="card cab-list"><div class="list">' + (meets.map(mrow).join('') || '<div class="cab-empty">Встреч пока нет.</div>') + '</div></div>' +
        sec('Стенды') + '<div class="card cab-list"><div class="list">' + (stands.map(srow).join('') || '<div class="cab-empty">Список «Изучить» пуст.</div>') + '</div></div>' +
        sec('Договорённости') + '<div class="card cab-list"><div class="list">' + (ags.map(arow).join('') || '<div class="cab-empty">Договорённостей пока нет. Они появятся после итога встречи.</div>') + '</div></div>' +
        sec('Заметки', '<button class="more" data-go="M1">Все заметки</button>') +
        '<div class="card cab-list"><div class="list">' + (notes.length ? notes.map(n => row('file', 'M2/' + n.id, n.title, n.time)).join('') : '<div class="cab-empty">Заметок пока нет.</div>') + '</div></div>' +
        sec('Оценки') +
        '<div class="card"><div class="r-title">' + (rated.length ? 'Ваша средняя оценка: ' + avg.toFixed(1).replace('.', ',') + ' из 5' : fin ? 'Вы не оценили сессии дня' : 'Вы ещё не оценили сессии') + '</div>' +
        '<div class="cab-note">' + (rated.length ? 'Оценено сессий: ' + rated.length + ' из ' + F.DAY_RATINGS.length + '.' : 'Оценки дня уходят в итоги фестиваля анонимно.') + '</div>' +
        '<button class="btn btn-secondary btn-block cab-gap" data-go="M3">' + (rated.length < F.DAY_RATINGS.length ? 'Оценить сессии дня' : 'Изменить оценки') + '</button></div>' +
        sec('Файл итогов') +
        '<div class="doc cab-pdf"><div class="doc-kicker">Атланты Сити · Зима 2027</div><div class="doc-title">' + esc(R.pdfName.replace(/\.pdf$/, '')) + '</div>' +
        '<div class="doc-line"></div><div class="doc-line short"></div>' +
        '<ol class="cab-pdf-l"><li>Встречи: ' + meets.length + '</li><li>Контакты: ' + contacts.length + '</li><li>Стенды: ' + stands.length + '</li><li>Договорённости: ' + ags.length + '</li><li>Заметки: ' + PS.notes.length + '</li><li>Оценки: ' + rated.length + ' из ' + F.DAY_RATINGS.length + '</li></ol>' +
        '<div class="doc-foot">' + esc(asOf) + ' · хранится до ' + esc(F.ACCESS_UNTIL) + ' · макет файла</div></div>' +
        (st.pdf ? '<div class="banner ok">' + icon('check') + '<div class="cap">PDF сформирован ' + esc(st.pdf) + '. В демо файл не выгружается.</div></div>' : '') +
        '<div class="cab-mem-act"><button class="btn btn-primary" data-act="m4-pdf">' + icon('download') + 'Скачать PDF</button>' +
        '<button class="btn btn-secondary" data-act="m4-mail">' + icon('mail') + 'На e-mail</button></div>' +
        '<div class="cab-note">В итогах нет оценки результата в деньгах: только то, что вы сделали на фестивале.</div>' +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* ---------- M5 Дорожная карта на полгода ---------- */
  const SRC = { contact: 'контакты', request: 'запрос', goal: 'цель', tip: 'подсказка' };
  D.action('m5-done', el => {
    const id = el.dataset.arg;
    PS.rdDone[id] = !PS.rdDone[id];
    rr(PS.rdDone[id] ? 'Шаг выполнен' : 'Шаг снова открыт');
  });
  D.action('m5-bell', el => {
    const id = el.dataset.arg, it = F.ROADMAP.items.find(x => x.id === id);
    PS.rdRemind[id] = !PS.remindOn(it);
    rr(PS.rdRemind[id] ? 'Напомним: ' + it.due : 'Напоминание выключено');
  });
  D.action('m5-fest', () => {
    PS.festSub = !PS.festSub;
    rr(PS.festSub ? 'Напомним о следующем фестивале' : 'Напоминание о фестивале выключено');
  });
  D.register('M5', {
    tab: '-',
    meta: {
      title: 'M5 · Дорожная карта на полгода',
      role: 'Гость, после события',
      fr: ['FR-PATH-13', 'FR-PATH-12', 'FR-MEET-11'],
      ac: ['AC-PATH-13', 'AC-PATH-12'],
      what: [
        'Четыре этапа до 28.08.2027: первая неделя, март и апрель, май и июнь, лето.',
        'Шаги собраны из контактов, договорённостей (G9), списка «Изучить» (H3), вашего запроса и целей; у каждого причина, срок и переход к человеку, стенду или цели.',
        'Отметка «выполнено» и напоминание по каждому шагу; общий прогресс.',
        'Блок «Куда ещё сходить»: подсказки без названий конкретных мероприятий, причины из вашего профиля.',
        'Карточка следующего фестиваля и напоминание о нём.'
      ],
      rules: [
        'Карта доступна около полугода после события (до 28.08.2027, D-18); уровень Should, не срезается (трактовка).',
        'Шаги строятся из запросов и контактов человека; выдуманных мероприятий и дат нет: даты следующего фестиваля пока не объявлены.',
        'Клубных подсказок нет: функций клуба в объёме нет (D-32, D-44).',
        'Напоминания идут по настройкам уведомлений (B3).'
      ],
      depends: ['D-18', 'D-32', 'D-52']
    },
    html() {
      const RM = F.ROADMAP, items = RM.items, n = items.length, done = items.filter(i => PS.rdDone[i.id]).length;
      const item = it => {
        const d = !!PS.rdDone[it.id], r = PS.remindOn(it);
        return '<div class="cab-rd' + (d ? ' done' : '') + '"><button class="cab-chk' + (d ? ' on' : '') + '" data-act="m5-done" data-arg="' + it.id + '" aria-pressed="' + d + '" aria-label="Выполнено: ' + esc(it.title) + '">' + icon('check') + '</button>' +
          '<button class="cab-rd-main" data-go="' + it.link + '"><span class="cab-rd-t">' + esc(it.title) + '</span>' +
          '<span class="cab-rd-s">' + esc(it.due) + ' · ' + esc(SRC[it.src]) + '</span><span class="cab-rd-w">' + esc(it.why) + '</span></button>' +
          '<button class="cab-bell' + (r ? ' on' : '') + '" data-act="m5-bell" data-arg="' + it.id + '" aria-pressed="' + r + '" aria-label="Напоминание: ' + esc(it.title) + '">' + icon('bell') + '</button></div>';
      };
      const tips = F.ROADMAP_TIPS;
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'После фестиваля', title: 'Дорожная карта', sub: 'на полгода, до ' + esc(F.ACCESS_UNTIL), paren: paren('из ваших запросов и контактов') }) +
        '<div class="cab-body">' +
        '<div class="card"><div class="cab-fill-t">Выполнено <b>' + done + '</b> из ' + n + '</div><div class="progress" aria-hidden="true"><i style="width:' + Math.round(100 * done / n) + '%"></i></div>' +
        '<div class="cap">Шаги собраны из контактов, договорённостей, запроса и целей.</div></div>' +
        RM.stages.map(s => sec(esc(s.title), '<span class="more cab-range">' + esc(s.range) + '</span>') +
          '<div class="cab-hint">' + esc(s.hint) + '</div>' +
          '<div class="card cab-list"><div class="list">' + (items.filter(i => i.stage === s.id).map(item).join('') || '<div class="cab-empty">Шагов нет.</div>') + '</div></div>').join('') +
        (tips.length ? sec('Куда ещё сходить') +
          '<div class="card cab-list"><div class="list">' + tips.map(t =>
            '<div class="cab-tip"><span class="cab-ic">' + icon('pin') + '</span><div class="grow"><div class="r-title">' + esc(t.title) + '</div><div class="r-sub">' + esc(t.why) + '</div></div></div>').join('') + '</div></div>' : '') +
        sec('Следующий фестиваль') +
        '<div class="card cab-next"><div class="cab-next-t">' + esc(F.NEXT_FEST.title) + '</div><div class="r-sub">' + esc(F.NEXT_FEST.when) + ' · ' + esc(F.NEXT_FEST.site) + '</div>' +
        '<button class="btn ' + (PS.festSub ? 'btn-secondary' : 'btn-primary') + ' btn-block" data-act="m5-fest">' + icon('bell') + (PS.festSub ? 'Напоминание включено' : 'Напомнить о фестивале') + '</button></div>' +
        '<div class="card cab-list"><div class="list">' +
        row('chart', 'M4', 'Мои итоги', 'встречи, контакты, договорённости') +
        row('mail', 'M6', 'Контакты после события', 'написать через неделю') +
        '</div></div>' +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* ---------- M6 Контакты после события ---------- */
  const DAYS = [[3, '3 дня'], [7, '7 дней'], [30, '30 дней']];
  const SIGN = 'Хорошего дня!';
  /* как познакомились: «26.02 (стенд А-12 · Экспо)» из записи «Мои контакты» */
  const metLine = c => { const p = String(c.when).split(', '); return p[0] + (p.length > 1 ? ' (' + p.slice(1).join(', ') + ')' : ''); };
  const contactOf = id => F.POST_CONTACTS.find(x => x.id === id);
  const k8 = id => F.PPL.CONTACTS.find(x => x.id === id);
  /* черновик по заметкам: только то, что записано; предложения (созвониться, встретиться) участник добавляет сам переключателями */
  function draftText(c) {
    const p = F.person(c.person), ME = F.ME, first = p.name.split(' ')[0], notes = PS.contactNotes(c.person);
    const lines = ['Здравствуйте, ' + first + '!', 'Это ' + ME.name + ' из «' + ME.company + '», мы познакомились ' + metLine(c) + '.'];
    if (notes.length) lines.push(notes.map(n => n.s).join(' '));
    lines.push(SIGN);
    return lines.join('\n\n');
  }
  D.action('m6-days', el => {
    const [id, d] = el.dataset.arg.split(':'), c = contactOf(id), ps = PS.postState(c), k = k8(id);
    ps.days = +d; ps.on = true; ps.date = addDays(c.day, +d);
    if (k) k.remind = 'написать ' + ps.date;   /* то же напоминание видно в «Мои контакты» (F8) */
    rr('Напомним ' + ps.date);
  });
  D.action('m6-on', el => {
    const id = el.dataset.arg, c = contactOf(id), ps = PS.postState(c), k = k8(id);
    ps.on = !ps.on;
    if (ps.on) { ps.date = ps.date || addDays(c.day, 7); if (k) k.remind = 'написать ' + ps.date; }
    else if (k) { k.remind = ''; }
    rr(ps.on ? 'Напоминание включено' : 'Напоминание выключено');
  });
  /* заметка о человеке: редактор M2 с привязкой к контакту, возврат в M6 */
  D.action('m6-note', el => {
    const s = D.st('M2');
    s.pre = { person: el.dataset.arg, back: 'M6' };
    location.hash = '#/M2/new';
  });
  D.action('m6-draft', el => {
    const c = contactOf(el.dataset.arg), p = F.person(c.person), notes = PS.contactNotes(c.person);
    sheet('Черновик письма',
      '<div class="banner">' + icon('spark') + '<div class="cap">Хроникёр составил черновик только по вашим заметкам: других фактов в нём нет. ИИ предлагает, отправляете вы.</div></div>' +
      '<div class="field cab-gap"><label>Текст письма · ' + esc(p.name) + '</label><textarea class="textarea cab-draft" data-f="d" rows="9">' + esc(draftText(c)) + '</textarea></div>' +
      (notes.length ? '<div class="cab-note cab-gap">Опирается на заметки: ' + esc(notes.map(n => { const t = n.t.replace(/[.!\s]+$/, ''); return t.charAt(0).toLowerCase() + t.slice(1); }).join('; ')) + '.</div>'
        : '<div class="cab-note cab-gap">Заметок о контакте нет, поэтому письмо короткое. Добавьте заметку — она попадёт в письмо.</div>') +
      '<div class="sec-title cab-offers-t">Предложения, которые вы можете добавить</div>' +
      '<div class="cab-offers">' + PS.offers.map(o =>
        '<label class="toggle-row"><div class="grow"><div class="tr-title">' + esc(o.label) + '</div></div>' +
        '<span class="toggle"><input type="checkbox" data-act="m6-offer" data-arg="' + o.id + '" aria-label="' + esc(o.label) + '"><span class="tr"></span></span></label>').join('') + '</div>' +
      (c.tgOpen
        ? '<div class="cab-note cab-gap">Telegram открыт по уровню «Те, с кем у меня встреча»: ' + esc(c.tg) + '.</div>' +
          '<button class="btn btn-primary btn-block" data-act="m6-tg" data-arg="' + c.id + '">' + icon('send') + 'Открыть в Telegram</button>'
        : '<div class="banner warn cab-gap">' + icon('lock') + '<div class="cap">Telegram человека закрыт его настройками: он виден только тем, с кем есть встреча. Предложите встречу.</div></div>' +
          '<button class="btn btn-primary btn-block" data-go="F11/' + c.person + '">Хочу встретиться</button>') +
      '<button class="btn btn-secondary btn-block" data-act="m6-copy">Скопировать текст</button>' +
      '<button class="btn btn-ghost btn-block" data-act="m6-sent" data-arg="' + c.id + '">Отметить как написанное</button>');
    const ta = document.querySelector('.sheet [data-f="d"]');
    if (ta) { fitDraft(ta); ta.addEventListener('input', () => fitDraft(ta)); }
  });
  /* поле черновика растёт по тексту: письмо видно целиком, лист прокручивается, кнопки закреплены */
  function fitDraft(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  /* предложение: вставка перед подписью и удаление; ручные правки текста сохраняются */
  D.action('m6-offer', el => {
    const t = document.querySelector('.sheet [data-f="d"]'), o = PS.offers.find(x => x.id === el.dataset.arg);
    if (!t || !o) return;
    let v = t.value;
    if (el.checked) {
      const i = v.lastIndexOf(SIGN);
      v = i >= 0 ? v.slice(0, i).replace(/\s+$/, '') + '\n\n' + o.s + '\n\n' + v.slice(i) : v.replace(/\s+$/, '') + '\n\n' + o.s;
    } else {
      v = v.split('\n\n' + o.s).join('').split(o.s).join('');
    }
    t.value = v;
    fitDraft(t);
  });
  D.action('m6-tg', el => {
    const c = contactOf(el.dataset.arg);
    D.toast('В демо Telegram не открывается: ' + c.tg, 3200);
  });
  /* копирование: тост «Скопировано» только при успехе; отказ буфера — текст выделен и подсказка «Скопируйте вручную» */
  D.action('m6-copy', () => {
    const t = document.querySelector('.sheet [data-f="d"]');
    if (!t) return;
    const manual = () => { try { t.focus(); t.select(); } catch (e) { /* поле недоступно */ } D.toast('Скопируйте вручную', 3200); };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { manual(); return; }
      navigator.clipboard.writeText(t.value).then(() => D.toast('Скопировано'), manual);
    } catch (e) { manual(); }
  });
  D.action('m6-sent', el => {
    PS.postState(contactOf(el.dataset.arg)).written = true;
    rr('Отмечено: письмо написано');
  });
  D.action('m6-unsent', el => { PS.postState(contactOf(el.dataset.arg)).written = false; rr(); });
  D.register('M6', {
    tab: '-',
    meta: {
      title: 'M6 · Контакты после события',
      role: 'Гость, после события',
      fr: ['FR-PATH-13', 'FR-MEET-11', 'FR-AI-01', 'FR-AI-02'],
      ac: ['AC-PATH-13', 'AC-AI-07'],
      what: [
        'Список контактов совпадает с «Мои контакты» (F8): с кем познакомились и где, ваши заметки о человеке, дата напоминания.',
        'Напоминание «написать через неделю»: выбор срока (3, 7 или 30 дней), дата, включение и выключение; дата видна и в F8.',
        'Черновик письма от Хроникёра по заметкам: правится в листе, копируется (если копирование не удалось, текст выделяется для ручного копирования), предложения добавляются переключателями, Telegram открывается по уровню видимости человека.',
        'Заметка о контакте создаётся из M6 в редакторе M2 и возвращает в M6; она попадает в черновик письма.',
        'Отметка «написано» и счётчик, сколько писем ещё ждут.'
      ],
      rules: [
        'Черновик строится только из заметок и места знакомства; фактов вне заметок не добавляется (AI-CHR); предложения («созвониться…») по умолчанию выключены.',
        'ИИ предлагает, отправляете вы; письмо не уходит само.',
        'Telegram человека доступен, только если с ним была встреча (уровень «Те, с кем у меня встреча»); иначе предлагается встреча.',
        'Срок напоминания считается от дня знакомства; в ИИ не передаются контакты, имена шифруются (D-49).'
      ],
      depends: ['D-49', 'D-47', 'D-52']
    },
    html() {
      const list = F.POST_CONTACTS, n = list.length;
      const waiting = list.filter(c => !PS.postState(c).written).length, on = list.filter(c => PS.postState(c).on && !PS.postState(c).written).length;
      const card = c => {
        const p = F.person(c.person), ps = PS.postState(c), notes = PS.contactNotes(c.person);
        return '<div class="card cab-pc' + (ps.written ? ' done' : '') + '">' +
          '<button class="cab-pc-h" data-go="F2/' + p.id + '">' + avatar(p.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(p.name) + '</span><span class="r-sub">' + esc(p.company) + '</span></span>' + icon('chevR') + '</button>' +
          '<div class="cab-tags">' + tag(c.meeting ? 'была встреча' : 'знакомство без встречи', c.meeting ? 'accent' : '') + (ps.written ? tag('письмо написано', 'ok') : '') + '</div>' +
          '<div class="cap">Познакомились ' + esc(c.when) + '</div>' +
          (notes.length ? '<ul class="cab-pc-n">' + notes.map(x => '<li>' + esc(x.t) + '</li>').join('') + '</ul>'
            : '<div class="cab-empty">Заметок о контакте нет.</div>') +
          '<div class="cab-rem"><div class="cab-rem-h"><div class="cab-rem-t">' + icon('bell') + '<span>' + (ps.on && !ps.written ? 'Написать ' + esc(ps.date) : ps.written ? 'Напоминание не нужно' : 'Напоминание выключено') + '</span></div>' +
          '<button class="cab-link" data-act="m6-on" data-arg="' + c.id + '">' + (ps.on ? 'Выключить' : 'Включить') + '</button></div>' +
          '<div class="cab-rem-c"><span class="cap">Через</span>' + DAYS.map(d => '<button class="chip' + (ps.days === d[0] ? ' on' : '') + '" data-act="m6-days" data-arg="' + c.id + ':' + d[0] + '" aria-pressed="' + (ps.days === d[0]) + '">' + d[1] + '</button>').join('') + '</div></div>' +
          '<div class="cab-mem-act"><button class="btn btn-primary btn-sm" data-act="m6-draft" data-arg="' + c.id + '">' + icon('mail') + 'Черновик письма</button>' +
          '<button class="btn btn-secondary btn-sm" data-act="m6-note" data-arg="' + c.person + '">' + icon('plus') + 'Добавить заметку</button>' +
          (ps.written ? '<button class="btn btn-ghost btn-sm" data-act="m6-unsent" data-arg="' + c.id + '">Вернуть в ожидание</button>' : '<button class="btn btn-ghost btn-sm" data-act="m6-sent" data-arg="' + c.id + '">Написано</button>') + '</div></div>';
      };
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'После фестиваля', title: 'Контакты после события', sub: waiting + ' из ' + n + ' ждут письма · напоминаний: ' + on, paren: paren('те же люди, что в «Мои контакты»') }) +
        '<div class="cab-body">' +
        list.map(card).join('') +
        '<div class="card cab-list"><div class="list">' +
        row('chart', 'M4', 'Мои итоги', 'встречи, договорённости, PDF') +
        row('route', 'M5', 'Дорожная карта на полгода', 'этапы и напоминания') +
        '</div></div>' +
        '<div class="cab-end"></div></div></div>';
    }
  });
})();

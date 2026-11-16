/* Блок C — программа. Фаза A: C1 «Вся программа», C3 «Карточка сессии». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;

  /* доступ по тарифу: all | biz_fc | fc | sat */
  function canBook(s) {
    const t = F.ME.tariff;
    if (s.access === 'all') return true;
    if (s.access === 'biz_fc') return t === 'Бизнес' || t === 'Первый класс';
    if (s.access === 'fc') return t === 'Первый класс';
    if (s.access === 'sat') return t === 'Спутник';
    return false;
  }
  const ACCESS_LABEL = { biz_fc: 'Бизнес и Первый класс', fc: 'Первый класс', sat: 'Спутник' };

  /* записи — общий стейт между экранами (фикстурные + сделанные в демо) */
  function bookings() { return D.st('_book'); }
  function isBookedNow(id) {
    const bk = bookings();
    if (bk.unbooked && bk.unbooked[id]) return false;
    return F.isBooked(id) || !!(bk.booked && bk.booked[id]);
  }
  function bookedTotal() {
    const bk = bookings();
    const extra = bk.booked ? Object.keys(bk.booked).filter(k => !F.isBooked(k)).length : 0;
    const removed = bk.unbooked ? Object.keys(bk.unbooked).filter(k => F.isBooked(k)).length : 0;
    return F.MY_BOOKINGS.length + extra - removed;
  }

  function hallLine(s) {
    const h = F.hall(s.hall);
    return '<span class="hall-line">' + icon('pin') + '<span class="hl-t">' + esc(h.name) + ' · ' + esc(h.place) + '</span></span>';
  }
  function leftChip(s) {
    const pct = s.left / s.cap;
    const cls = pct <= 0.15 ? ' low' : '';
    return '<span class="left-count' + cls + '">' + (pct <= 0.15 ? 'мало: ' : '') + s.left + ' из ' + s.cap + '</span>';
  }

  /* ---------- C1 ---------- */
  D.register('C1', {
    tab: 'C1',
    meta: {
      title: 'C1 · Вся программа',
      role: 'Гость, расписание',
      fr: ['FR-PROG-01', 'FR-PROG-02'],
      ac: ['AC-PROG-03'],
      what: [
        'Дни фестиваля чипами, треки горизонтальной прокруткой.',
        'Список сессий: время, формат, зал, остаток мест, метки «изменено» и «вы записаны».',
        'Ограниченные по тарифу сессии показаны с замком и подписью тарифа.',
        'Переход в карточку сессии по нажатию.'
      ],
      rules: [
        'Сессии Бизнеса и Первого класса видны всем тарифам с пометкой (D-07); запись — по тарифу.',
        'Программа «Спутник» — для тарифа Спутник и членов семьи.',
        'Остаток мест и метки берутся из фикстур; «изменено» — по фиду организаторов.'
      ],
      depends: ['D-07', 'тарифная сетка']
    },
    html(ctx) {
      const st = ctx.state;
      const day = st.day || '27.02';
      const track = st.track || 'all';

      let list = F.sessionsOf(day);
      if (track !== 'all') list = list.filter(s => s.track === track);

      const dayChips = F.DAYS.map(d =>
        '<button class="chip' + (d.id === day ? ' on' : '') + '" data-act="c1-day" data-arg="' + d.id + '">' +
        esc(d.label) + ' ' + esc(d.week) + (d.demo ? ' · демо' : '') + '</button>').join('');

      const trackChips = F.TRACKS.map(t =>
        '<button class="chip' + (t.id === track ? ' on' : '') + '" data-act="c1-track" data-arg="' + esc(t.id) + '">' + esc(t.label) + '</button>').join('');

      const rows = list.map(s => {
        const booked = isBookedNow(s.id);
        const locked = !canBook(s);
        const marks = [];
        if (s.changed) marks.push('<span class="mark-changed">' + icon('refresh') + 'изменено</span>');
        if (booked) marks.push(tag('вы записаны', 'ok'));
        if (locked) marks.push('<span class="lock-note">' + icon('lock') + esc(ACCESS_LABEL[s.access] || '') + '</span>');
        return '<button class="row clickable" data-go="C3/' + s.id + '">' +
          '<div style="width:46px;flex:none"><div class="sess-time">' + esc(s.time) + '</div></div>' +
          '<div class="grow"><div class="r-title">' + esc(s.title) + '</div>' +
          '<div class="sess-meta" style="margin-top:4px">' + tag(s.format) + hallLine(s) + '</div>' +
          (marks.length ? '<div class="sess-meta" style="margin-top:4px">' + marks.join('') + '</div>' : '') +
          '</div>' +
          '<div class="r-right" style="flex-direction:column;align-items:flex-end;gap:4px">' + leftChip(s) + icon('chevR') + '</div>' +
          '</button>';
      }).join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<div class="eyebrow">' + esc(F.NOW.dateLong) + ' · ' + esc(F.ME.tariff) + '</div>' +
        '<h1>Программа</h1>' +
        '<div class="sub">' + list.length + ' событий' + (track !== 'all' ? ' · трек «' + esc(track) + '»' : '') + '</div>' +
        '</div><button class="icon-btn" data-go="C4" aria-label="Моя программа">' + icon('bookmark') + '</button></div>' +
        '</div>' +
        '<div style="padding:0 20px">' +
        '<div class="chips" style="padding-top:0">' + dayChips + '</div>' +
        '<div class="chips">' + trackChips + '</div>' +
        '</div>' +
        '<div style="padding:0 20px 20px"><div class="card" style="padding:2px 16px"><div class="list">' +
        (rows || '<div class="empty"><div class="e-title">Пусто</div><div class="e-text">В этот день по выбранному треку событий нет.</div></div>') +
        '</div></div>' +
        '<div style="height:8px"></div></div>' +
        '</div>';
    }
  });
  D.action('c1-day', el => { D.st('C1').day = el.dataset.arg; D.rerender(); });
  D.action('c1-track', el => { D.st('C1').track = el.dataset.arg; D.rerender(); });

  /* ---------- C3 ---------- */
  D.register('C3', {
    tab: 'C1',
    meta: {
      title: 'C3 · Карточка сессии',
      role: 'Гость, событие',
      fr: ['FR-PROG-03', 'FR-PROG-05', 'FR-BOOK-02'],
      ac: ['AC-PROG-03', 'AC-PROG-04'],
      what: [
        'Полная карточка: формат, время, длительность, зал и место, трек, спикеры, описание.',
        'Остаток мест, метка «изменено», заметка о тарифном доступе.',
        'Кнопка записи: состояние «записаться» / «вы записаны», для закрытых — объяснение тарифа.',
        'Связанные действия: маршрут, заметка, лента изменений.'
      ],
      rules: [
        'Запись на сессию мгновенная при наличии мест; при отсутствии — лист ожидания (D3, следующая фаза).',
        'Сессии с доступом «Бизнес и Первый класс» доступны тарифам Бизнес и Первый класс.',
        'Сессии «Спутник» — только тарифу Спутник и членам семьи.',
        'Изменённые сессии помечаются по фиду организаторов.'
      ],
      depends: ['D-07', 'тарифная сетка', 'фид организаторов']
    },
    html(ctx) {
      const st = ctx.state;
      const id = ctx.param || 's2704';
      const s = F.session(id) || F.session('s2704');
      const booked = isBookedNow(s.id);
      const allowed = canBook(s);
      const h = F.hall(s.hall);
      const toMin = t => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3));
      const end = F.fmtTime(toMin(s.time) + s.dur);
      const bookedCount = bookedTotal();

      const speakers = (s.speakers || []).map(k => {
        const p = F.speaker(k);
        return '<div class="spk-row">' + avatar(p.name, 'sm') + '<div><div class="spk-name">' + esc(p.name) + '</div><div class="spk-role">' + esc(p.role) + '</div></div></div>';
      }).join('');

      let cta;
      if (booked) {
        cta = '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Вы записаны</div><div class="cap">Место подтверждено. Напомним за 60 минут и за 10 минут.</div></div></div>' +
          '<button class="btn btn-secondary btn-block" data-act="c3-unbook" data-arg="' + s.id + '">Отменить запись</button>';
      } else if (!allowed) {
        cta = '<div class="banner warn">' + icon('lock') + '<div><div class="b-title">Доступно по тарифу «' + esc(ACCESS_LABEL[s.access]) + '»</div><div class="cap">Ваш тариф — ' + esc(F.ME.tariff) + '. Условия — в разделе билета.</div></div></div>' +
          '<button class="btn btn-secondary btn-block" data-go="L3">Условия тарифа</button>';
      } else {
        cta = '<button class="btn btn-primary btn-block" data-act="c3-book" data-arg="' + s.id + '">Записаться · осталось ' + s.left + '</button>' +
          '<div class="cap" style="text-align:center">бесплатно, место сохранено за вами</div>';
      }

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div style="display:flex;gap:8px">' +
        '<button class="icon-btn" data-go="C1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div class="actions">' +
        '<button class="icon-btn" data-go="M2/' + s.id + '" aria-label="Заметка">' + icon('file') + '</button>' +
        '<button class="icon-btn" data-act="c3-share" aria-label="Поделиться">' + icon('share') + '</button></div></div>' +
        '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' +
        tag(s.format, 'accent') + tag(s.track) + (s.changed ? '<span class="mark-changed" style="padding:4px 10px;border:1px solid var(--accent-edge);border-radius:99px">' + icon('refresh') + 'изменено</span>' : '') +
        '</div>' +
        '<h1 style="font-size:30px;margin-top:8px">' + esc(s.title) + '</h1>' +
        '</div>' +

        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +

        '<div class="card"><div class="card-row" style="justify-content:space-between">' +
        '<div><div class="sess-time">' + esc(s.time) + '–' + esc(end) + '</div><div class="cap">' + s.dur + ' мин</div></div>' +
        '<div style="text-align:right"><div class="card-title" style="font-size:14px">' + esc(h.name) + '</div><div class="cap">' + esc(h.place) + ' · до ' + h.cap + ' мест</div></div>' +
        '</div>' +
        '<div class="sess-meta">' + leftChip(s) + '<span class="cap">· ' + bookedCount + ' записи у вас</span></div>' +
        '</div>' +

        (speakers ? '<div><div class="sec-title" style="margin-top:0">Спикеры</div><div class="card" style="padding:6px 16px">' + speakers + '</div></div>' : '') +

        '<div><div class="sec-title" style="margin-top:0">О событии</div><div class="card"><div style="font-size:14px;line-height:1.55">' + esc(s.desc) + '</div></div></div>' +

        '<div class="card"><div class="sec-title" style="margin:0 0 6px">Как добраться</div>' +
        '<div class="cap">' + esc(h.name) + ' — ' + esc(h.place) + (h.note ? ' · ' + esc(h.note) : '') + '</div>' +
        '<button class="btn btn-secondary btn-sm" data-go="E4" style="margin-top:8px;align-self:flex-start">Построить маршрут</button></div>' +

        '<div style="display:flex;flex-direction:column;gap:10px">' +
        (s.format === 'Менторская гостиная'
          ? (allowed
              ? '<button class="btn btn-primary btn-block" data-go="D1">' + icon('people') + 'Выбрать окно ментора</button>' +
                '<div class="cap" style="text-align:center">запись — выбором ментора и окна на следующем экране</div>'
              : cta)
          : cta) +
        '</div>' +
        '<div style="height:16px"></div>' +
        '</div>' +
        '</div>';
    },
    mount(host) {
      /* запомнить выбранную сессию для D2/других экранов */
    }
  });
  D.action('c3-book', el => {
    const id = el.dataset.arg;
    const s = F.session(id);
    const bk = bookings();
    bk.booked = bk.booked || {};
    bk.booked[id] = true;
    delete (bk.unbooked || {})[id];
    D.toast('Место забронировано: ' + s.title);
    D.rerender();
  });
  D.action('c3-unbook', el => {
    const id = el.dataset.arg;
    const bk = bookings();
    if (F.isBooked(id)) {
      bk.unbooked = bk.unbooked || {};
      bk.unbooked[id] = true;
    } else if (bk.booked) {
      delete bk.booked[id];
    }
    D.toast('Запись отменена');
    D.rerender();
  });
  D.action('c3-share', () => D.toast('Ссылка на сессию скопирована'));

  /* ---------- C4 Моя программа ---------- */
  function myItems(st) {
    const removed = st.removed || {};
    const items = [];
    F.MY_DAY.forEach(d => {
      const key = d.session || d.meeting;
      if (removed[key]) return;
      if (d.session) {
        const s = F.session(d.session);
        if (!s) return;
        items.push({ key, kind: 'session', id: s.id, time: s.time, dur: s.dur, title: s.title, hall: s.hall, sub: s.format + ' · ' + F.hall(s.hall).name });
      } else if (d.meeting) {
        const m = F.MY_MEETINGS.find(x => x.id === d.meeting);
        if (m) items.push({ key, kind: 'meeting', id: m.id, time: m.time.split('–')[0], dur: 30, title: 'Встреча: ' + m.with_, hall: 'congress', sub: m.space + ' · ' + m.status });
      }
    });
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }
  const toMin = t => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3));

  D.register('C4', {
    tab: 'C1',
    meta: {
      title: 'C4 · Моя программа',
      role: 'Гость, личное расписание',
      fr: ['FR-PROG-04', 'FR-PROG-06', 'FR-BOOK-04'],
      ac: ['AC-PROG-04'],
      what: [
        'Список выбранных сессий и встреч демо-дня с временем, залом и форматом.',
        'Предупреждения о пересечениях и нехватке времени на переход между залами.',
        'Действия у каждой строки: «Календарь» (файл ICS) и «Убрать».',
        'Итоговая кнопка экспорта всего расписания.'
      ],
      rules: [
        'Пересечение по времени показывается предупреждением; жёсткая запись на пересекающееся блокируется при бронировании.',
        'Запас времени на переход считается по матрице переездов между залами.',
        '«Календарь» формирует файл ICS по сессии и подписку на личное расписание.',
        'Отмена записи возможна до срока (по умолчанию за 2 часа до начала).'
      ],
      depends: ['матрица переездов', 'фид программы']
    },
    html(ctx) {
      const st = ctx.state;
      const items = myItems(st);
      const warns = [];
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1], cur = items[i];
        const prevEnd = toMin(prev.time) + prev.dur;
        const gap = toMin(cur.time) - prevEnd;
        const need = F.travelMin(prev.hall, cur.hall);
        const prevH = F.hall(prev.hall) ? F.hall(prev.hall).name : prev.hall;
        const curH = F.hall(cur.hall) ? F.hall(cur.hall).name : cur.hall;
        if (gap < 0) {
          warns.push('Пересечение: ' + prev.title + ' и ' + cur.title + ' накладываются на ' + (-gap) + ' мин');
        } else if (need != null && gap < need) {
          warns.push('Не успеваете: между ' + prevH + ' и ' + curH + ' нужно ' + need + ' мин, а между событиями ' + gap + ' мин');
        }
      }

      const rows = items.map(it =>
        '<div class="prog-item"><div class="pi-time">' + esc(it.time) + '</div>' +
        '<div class="pi-body"><div class="pi-title">' + esc(it.title) + '</div>' +
        '<div class="pi-sub">' + esc(it.sub) + '</div></div>' +
        '<div class="pi-actions"><button class="btn btn-ghost btn-sm" data-act="c4-cal" data-arg="' + it.key + '">Календарь</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="c4-del" data-arg="' + it.key + '">Убрать</button></div></div>').join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="C1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Моя программа</h1>' +
        '<div class="sub">' + items.length + ' события · ' + esc(F.ME.tariff) + '</div></div>' +
        '<button class="icon-btn" data-act="c4-all-cal" aria-label="Весь день в календарь">' + icon('calendar') + '</button></div>' +
        '</div>' +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        (warns.length
          ? '<div class="banner warn conflict-warn">' + icon('alert') + '<div>' + warns.map(w => '<div class="b-title" style="font-size:13px">' + esc(w) + '</div>').join('') + '</div></div>'
          : '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Конфликтов нет</div><div class="cap">Между событиями хватает времени на переходы.</div></div></div>') +
        '<div class="card" style="padding:4px 16px">' + (rows || '<div class="empty"><div class="e-title">Пусто</div><div class="e-text">Добавьте сессии кнопкой «В программу» в карточке события.</div></div>') + '</div>' +
        '<button class="btn btn-secondary btn-block" data-act="c4-all-cal">' + icon('calendar') + 'Весь день в календарь</button>' +
        '<div class="cap" style="text-align:center">ICS-файл и подписка на изменения — по кнопке у каждой строки</div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('c4-cal', () => D.toast('Файл календаря добавлен'));
  D.action('c4-all-cal', () => D.toast('Весь день добавлен в календарь'));
  D.action('c4-del', el => {
    const st = D.st('C4');
    st.removed = st.removed || {};
    st.removed[el.dataset.arg] = true;
    D.toast('Событие убрано из программы');
    D.rerender();
  });

  /* ---------- C2 Фильтры ---------- */
  D.register('C2', {
    tab: 'C1',
    meta: {
      title: 'C2 · Фильтры программы',
      role: 'Гость, программа',
      fr: ['FR-PROG-02'],
      ac: ['AC-PROG-02'],
      what: [
        'Лист фильтров: день, зал, формат, тема, «доступно мне».',
        'Активные фильтры показаны счётчиком и сбрасываются одной кнопкой.',
        'Применение возвращает к списку программы с учётом фильтров.'
      ],
      rules: [
        'Фильтр «доступно мне» учитывает тариф и записи (замок по тарифу остаётся видимым).',
        'Фильтры не скрывают сессии с меткой «изменено» — они помечаются отдельно.',
        'Сочетание фильтров — И (все условия одновременно).'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const st = ctx.state;
      st.f = st.f || { hall: 'all', format: 'all', track: 'all', mine: false };
      const f = st.f;
      const grp = (label, key, opts) => '<div style="margin-bottom:12px"><div class="cap" style="margin-bottom:6px">' + label + '</div><div class="chips" style="flex-wrap:wrap">' +
        opts.map(o => '<button class="chip' + (f[key] === o.id ? ' on' : '') + '" data-act="c2-set" data-arg="' + key + ':' + o.id + '">' + esc(o.label) + '</button>').join('') + '</div></div>';
      const halls = [{ id: 'all', label: 'Все залы' }].concat(F.HALLS.map(h => ({ id: h.id, label: h.name })));
      const formats = [{ id: 'all', label: 'Все форматы' }].concat(F.FORMATS.map(x => ({ id: x, label: x })));
      const tracks = F.TRACKS.slice(0, 8).map(t => ({ id: t.id === 'all' ? 'all' : t.label, label: t.label }));
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="C1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Программа</div><h1>Фильтры</h1>' +
        '<div class="sub">Сузьте список сессий</div></div></div>' +
        '</div>' +
        paren('фильтр «доступно мне» учитывает ваш тариф') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        grp('Зал', 'hall', halls) + grp('Формат', 'format', formats) + grp('Тема', 'track', tracks) +
        '<div class="toggle-row"><div style="flex:1"><div class="tr-title">Доступно мне</div>' +
        '<div class="tr-sub">Скрыть сессии закрытых тарифов</div></div>' +
        '<label class="toggle"><input type="checkbox" data-c2mine' + (f.mine ? ' checked' : '') + '><span class="tr"></span></label></div>' +
        '<div style="display:flex;gap:10px">' +
        '<button class="btn btn-ghost" data-act="c2-reset">Сбросить</button>' +
        '<button class="btn btn-primary" style="flex:1" data-go="C1">Показать ' + F.sessionsOf('27.02').length + ' сессий</button></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('[data-c2mine]');
      if (inp) inp.addEventListener('change', () => { D.st('C2').f.mine = inp.checked; });
    }
  });
  D.action('c2-set', el => {
    const [k, v] = el.dataset.arg.split(':');
    const f = D.st('C2').f;
    f[k] = f[k] === v ? 'all' : v;
    D.rerender();
  });
  D.action('c2-reset', () => { D.st('C2').f = { hall: 'all', format: 'all', track: 'all', mine: false }; D.rerender(); });

  /* ---------- C5 Спикер ---------- */
  D.register('C5', {
    tab: 'C1',
    meta: {
      title: 'C5 · Спикер',
      role: 'Гость, карточка спикера',
      fr: ['FR-PROG-07'],
      ac: ['AC-PROG-07'],
      what: [
        'Карточка спикера: фото-заглушка с инициалами, роль, «о себе», темы.',
        'Список сессий спикера за фестиваль с переходом в карточку сессии.',
        'Кнопка «Предложить встречу» ведёт к заявке на встречу.'
      ],
      rules: [
        'Публичные поля спикера заполняются спикером в кабинете и проходят модерацию.',
        'Окна менторских встреч показываются только для спикеров-менторов (O-04).',
        'Запись на сессию — из карточки сессии, не из карточки спикера.'
      ],
      depends: ['модерация профилей', 'O-04']
    },
    html(ctx) {
      const key = ctx.param || 'levin';
      const sp = F.speaker(key) || F.speaker('levin');
      const sessions = F.SESSIONS.filter(s => (s.speakers || []).includes(key));
      const rows = sessions.map(s =>
        '<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow">' +
        '<div class="r-title">' + esc(s.title) + '</div>' +
        '<div class="r-sub">' + esc(s.day) + ' · ' + esc(s.time) + ' · ' + esc(F.hall(s.hall).name) + '</div></div>' + icon('chevR') + '</button>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="C1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Спикер</div>' +
        '<h1>' + esc(sp.name) + '</h1>' +
        '<div class="sub">' + esc(sp.role) + '</div></div>' +
        '</div>' +
        paren('профиль проверен модерацией') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="text-align:center;padding:22px 16px"><div class="avatar xl accent" style="margin:0 auto 10px;border-radius:24px;font-size:26px">' + esc(sp.name.split(' ').map(w => w[0]).join('')) + '</div>' +
        '<div style="font-size:15px;font-weight:600">' + esc(sp.name) + '</div>' +
        '<div class="cap" style="margin-top:4px">' + esc(sp.role) + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">О себе</div>' +
        '<div class="r-sub" style="line-height:1.55">' + esc(sp.bio || 'Практик с 15-летним стажем: строил команды, выводил продукты на новые рынки, дважды проходил через кризис роста. На фестивале — в трёх сессиях и менторских окнах.') + '</div></div>' +
        '<div><div class="sec-title" style="margin-top:0">Сессии · ' + sessions.length + '</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div></div>' +
        '<button class="btn btn-secondary btn-block" data-go="G2">' + icon('userPlus') + 'Предложить встречу</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- C6 Изменение расписания ---------- */
  D.register('C6', {
    tab: 'C1',
    meta: {
      title: 'C6 · Изменение расписания',
      role: 'Гость, уведомление об изменении',
      fr: ['FR-PROG-08', 'FR-NTF-02'],
      ac: ['AC-PROG-08'],
      what: [
        'Баннер об изменении сессии с кнопкой «Обновить мой день».',
        'Карточка «было › стало»: зал, время, что не изменилось.',
        'Список моих записей, которых коснулось изменение.'
      ],
      rules: [
        'Изменение помечается в программе меткой «изменено» до конца фестиваля.',
        'Записанным на сессию уходит адресное уведомление по политике каналов.',
        '«Обновить мой день» пересчитывает маршрут и подсказки Секретаря.'
      ],
      depends: ['фид программы', 'матрица переездов']
    },
    html(ctx) {
      const s = F.session('s2707'); // кейс, перенесён в Соболь
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="C1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Изменение · ' + esc(F.NOW.time) + '</div><h1>Расписание обновлено</h1>' +
        '<div class="sub">Сессия перенесена</div></div></div>' +
        '</div>' +
        paren('изменения помечаются в программе меткой') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="banner warn">' + icon('alert') + '<div style="flex:1"><div class="b-title">Сессия перенесена</div>' +
        '<div class="cap">«' + esc(s.title) + '» — зал сменился, время то же</div></div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Было › стало</div>' +
        '<div class="row"><div class="grow"><div class="r-title">' + esc(s.time) + '–15:00</div>' +
        '<div class="r-sub">Конгресс-центр, сцена</div></div></div>' +
        '<div class="row" style="border-top:1px solid var(--line);padding-top:10px;margin-top:4px"><div class="grow"><div class="r-title" style="color:var(--accent-text)">' + esc(s.time) + '–15:00 · ' + esc(F.hall(s.hall).name) + '</div>' +
        '<div class="r-sub">' + esc(F.hall(s.hall).place) + ' · переход из зала ' + (F.travelMin('congress', 'sobol') || '—') + ' мин</div></div>' + icon('pin') + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Ваши записи под вопросом</div>' +
        '<div class="r-sub">Записаны на «' + esc(s.title) + '» — запись сохранена, новый зал в карточке.</div>' +
        '<button class="btn btn-primary btn-block" style="margin-top:10px" data-act="c6-refresh">' + icon('refresh') + 'Обновить мой день</button></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Маршрут и подсказка Секретаря пересчитаны: до Соболя от вашего следующего события — ' + (F.travelMin('congress', 'sobol') || 4) + ' мин.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('c6-refresh', () => D.toast('Мой день обновлён: маршрут и подсказки пересчитаны'));
})();

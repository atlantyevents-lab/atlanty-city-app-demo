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

  /* ---------- общий фильтр программы (C1/C2/C7/D1) ---------- */
  function pf() { const p = D.st('_prog'); p.f = p.f || {}; return p.f; }
  function progDay() { return pf().day || '27.02'; }
  function filteredSessions() { return F.progFilter(pf()); }
  function activeChips() {
    const f = pf(), out = [];
    (f.halls || []).forEach(h => { const x = F.hall(h); out.push(['halls', h, 'зал: ' + (x ? x.name : h)]); });
    (f.speakers || []).forEach(k => { const p = F.speaker(k); out.push(['speakers', k, 'спикер: ' + (p ? p.name : k)]); });
    (f.levers || []).forEach(l => out.push(['levers', l, 'рычаг: ' + l]));
    (f.formats || []).forEach(x => out.push(['formats', x, 'формат: ' + x]));
    (f.groups || []).forEach(g => out.push(['groups', g, 'группа: ' + g]));
    if (f.booked) out.push(['booked', '1', 'с записью']);
    if (f.avail) out.push(['avail', '1', 'доступно мне']);
    return out;
  }
  function sessMeta(s) {
    const h = F.hall(s.hall);
    return '<span class="sess-meta" style="margin-top:4px">' +
      '<span class="tag accent" data-go="C2">' + esc(s.format) + '</span>' +
      '<span class="tag" data-act="c1-lever" data-arg="' + esc(s.lever) + '">' + esc(s.lever) + '</span>' +
      '<span class="hall-line" data-go="E3/' + h.id + '"><span class="hl-t">' + icon('pin') + esc(h.name) + '</span></span>' +
      '</span>';
  }
  function sessMarks(s) {
    const marks = [];
    if (s.changed) marks.push('<span class="mark-changed">' + icon('refresh') + 'изменено</span>');
    if (isBookedNow(s.id)) marks.push(tag('вы записаны', 'ok'));
    if (!canBook(s)) marks.push('<span class="lock-note">' + icon('lock') + esc(ACCESS_LABEL[s.access] || '') + '</span>');
    return marks.length ? '<div class="sess-meta" style="margin-top:4px">' + marks.join('') + '</div>' : '';
  }
  function sessRow(s) {
    return '<div class="row clickable" data-go="C3/' + s.id + '">' +
      '<div style="width:46px;flex:none"><div class="sess-time">' + esc(s.time) + '</div></div>' +
      '<div class="grow"><div class="r-title">' + esc(s.title) + '</div>' +
      sessMeta(s) + sessMarks(s) + '</div>' +
      '<div class="r-right" style="flex-direction:column;align-items:flex-end;gap:4px">' + leftChip(s) + icon('chevR') + '</div>' +
      '</div>';
  }
  function viewSeg(active) {
    return D.segbar([['C1', 'Список'], ['C7', 'Сетка'], ['D1', 'Менторские'], ['C4', 'Мой день']], active || 'C1');
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
        'Виды: список, сетка параллельных сессий (C7), менторские гостиные (D1), мой день (C4).',
        'Фильтры C2: залы, спикеры, рычаги, формат, «с записью», «доступно мне» — комбинируются.',
        'Активные фильтры — снимаемые чипы; счётчик «Показать N» на кнопке фильтра.',
        'Карточка сессии C3: спикеры, зал (карта), рычаг, формат — все ссылки.'
      ],
      rules: [
        'Сессии Бизнеса и Первого класса видны всем тарифам с пометкой; запись — по тарифу.',
        'Менторские гостиные показываются только через спикеров; круглые столы — в разделе «КипяTALK».',
        'Список и сетка показывают один и тот же отфильтрованный набор.'
      ],
      depends: ['D-07', 'тарифная сетка']
    },
    html(ctx) {
      const day = progDay();
      const list = filteredSessions().filter(s => s.day === day);
      const f = pf();
      const achips = activeChips();

      const dayChips = F.DAYS.map(d =>
        '<button class="chip' + (d.id === day ? ' on' : '') + '" data-act="c1-day" data-arg="' + d.id + '">' +
        esc(d.label) + ' ' + esc(d.week) + (d.demo ? ' · демо' : '') + '</button>').join('');

      const achipHtml = achips.map(c =>
        '<button class="chip on" data-act="c1-fclr" data-arg="' + c[0] + ':' + c[1] + '">' + esc(c[2]) + ' ×</button>').join('');

      return '<div class="scr">' +
        D.head({eyebrow:esc(F.NOW.dateLong) + ' · ' + esc(F.ME.tariff), title:'Программа', sub:list.length + ' ' + D.plural(list.length, ['событие', 'события', 'событий']) + (achips.length ? ' · фильтры: ' + achips.length : ''),
          actions:'<button class="icon-btn" data-go="C2" aria-label="Фильтры">' + icon('filter') + '</button>' +
          '<button class="icon-btn" data-go="C4" aria-label="Моя программа">' + icon('bookmark') + '</button>'}) +
        viewSeg('C1') +
        '<div class="chip-rail">' + dayChips + '</div>' +
        (achipHtml ? '<div class="chip-rail" style="padding-top:0">' + achipHtml + '</div>' : '') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:10px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        (list.map(sessRow).join('') || '<div class="empty"><div class="e-title">Пусто</div><div class="e-text">В этот день по выбранным фильтрам событий нет — снимите чипы или измените фильтры.</div></div>') +
        '</div></div>' +
        '<div style="height:16px"></div></div>' +
        '</div>';
    }
  });
  D.action('c1-day', el => { pf().day = el.dataset.arg; D.rerender(); });
  D.action('c1-fclr', el => {
    const [k, v] = el.dataset.arg.split(':');
    const f = pf();
    if (k === 'booked' || k === 'avail') { delete f[k]; }
    else if (Array.isArray(f[k])) f[k] = f[k].filter(x => x !== v);
    D.rerender();
  });
  /* клик по рычагу в мета-строке сессии — фильтр по этому рычагу */
  D.action('c1-lever', el => {
    const f = pf();
    const v = el.dataset.arg;
    f.levers = (f.levers || []).indexOf(v) >= 0 ? f.levers.filter(x => x !== v) : (f.levers || []).concat([v]);
    D.route('C1');
  });

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
        if (!p) return '';
        const mw = F.mentorWindows(k).length;
        return '<div class="spk-row" data-go="C5/' + k + '" style="cursor:pointer">' + avatar(p.name, 'sm') +
          '<div class="grow"><div class="spk-name">' + esc(p.name) + (mw ? ' <span class="cap">· ментор</span>' : '') + '</div>' +
          '<div class="spk-role">' + esc(p.role) + ' · ' + esc(p.company) + '</div></div>' + icon('chevR') + '</div>';
      }).join('');

      /* «Ещё в этом зале» и «Параллельно» — переходы внутри карточки */
      const sameHallRows = F.sameHall(s, 3).map(x =>
        '<button class="row clickable" data-go="C3/' + x.id + '"><div class="grow">' +
        '<div class="r-title" style="font-size:14px">' + esc(x.title) + '</div>' +
        '<div class="r-sub">' + esc(x.time) + ' · ' + esc(F.hall(x.hall).name) + '</div></div>' + icon('chevR') + '</button>').join('');
      const parRows = F.parallel(s).map(x => {
        const hh = F.hall(x.hall);
        return '<button class="row clickable" data-go="C3/' + x.id + '"><div class="grow">' +
        '<div class="r-title" style="font-size:14px">' + esc(x.title) + '</div>' +
        '<div class="r-sub">' + esc(x.time) + '–' + esc(F.fmtTime(parseInt(x.time.slice(0, 2)) * 60 + parseInt(x.time.slice(3)) + x.dur)) + ' · ' +
        '<span data-go="E1" style="cursor:pointer">' + esc(hh.name) + '</span></div></div>' + icon('chevR') + '</button>';
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
        D.head({back:'C1', eyebrow:'Программа · ' + esc(s.day), title:esc(s.title),
          sub:esc(s.time) + '–' + esc(end) + ' · ' + esc(h.name) + ' · ' + esc(s.lever),
          actions:'<button class="icon-btn" data-go="M2/' + s.id + '" aria-label="Заметка">' + icon('file') + '</button>' +
          '<button class="icon-btn" data-act="c3-share" aria-label="Поделиться">' + icon('share') + '</button>'}) +
        '<div style="padding:0 20px;display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
        tag(s.format, 'accent') + tag(s.lever) + (s.changed ? '<span class="mark-changed" style="padding:4px 10px;border:1px solid var(--accent-edge);border-radius:99px">' + icon('refresh') + 'изменено</span>' : '') +
        '</div>' +

        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +

        '<div class="card"><div class="card-row" style="justify-content:space-between">' +
        '<div><div class="sess-time">' + esc(s.time) + '–' + esc(end) + '</div><div class="cap">' + s.dur + ' ' + D.plural(s.dur, ['минута', 'минуты', 'минут']) + '</div></div>' +
        '<div style="text-align:right"><div class="card-title" style="font-size:14px" data-go="E3/' + h.id + '" role="link">' + esc(h.name) + '</div><div class="cap">' + esc(h.place) + ' · до ' + h.cap + ' ' + D.plural(h.cap, ['места', 'мест', 'мест']) + '</div></div>' +
        '</div>' +
        '<div class="sess-meta">' + leftChip(s) + '<span class="cap">· ' + bookedCount + ' записи у вас</span></div>' +
        '</div>' +

        (speakers ? '<div><div class="sec-title" style="margin-top:0">Спикеры</div><div class="card" style="padding:6px 16px">' + speakers + '</div></div>' : '') +

        '<div><div class="sec-title" style="margin-top:0">О событии</div><div class="card"><div style="font-size:14px;line-height:1.55">' + esc(s.desc) + '</div></div></div>' +

        '<div class="card"><div class="sec-title" style="margin:0 0 6px">Где и что</div>' +
        '<div class="sess-meta">' +
        '<span class="tag accent" data-act="c2-open-format" data-arg="' + esc(s.format) + '">' + esc(s.format) + '</span>' +
        '<span class="tag" data-act="c1-lever" data-arg="' + esc(s.lever) + '">' + esc(s.lever) + '</span>' +
        '<span class="hall-line" data-go="E3/' + h.id + '"><span class="hl-t">' + icon('pin') + esc(h.name) + ' · ' + esc(h.place) + '</span></span>' +
        '</div></div>' +

        (sameHallRows ? '<div><div class="sec-title" style="margin-top:0">Ещё в этом зале</div><div class="card" style="padding:2px 16px"><div class="list">' + sameHallRows + '</div></div></div>' : '') +
        (parRows ? '<div><div class="sec-title" style="margin-top:0">Параллельно</div><div class="card" style="padding:2px 16px"><div class="list">' + parRows + '</div></div></div>' : '') +

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
          warns.push('Пересечение: ' + prev.title + ' и ' + cur.title + ' накладываются на ' + (-gap) + ' ' + D.plural(-gap, ['минуту', 'минуты', 'минут']));
        } else if (need != null && gap < need) {
          warns.push('Не успеваете: между ' + prevH + ' и ' + curH + ' нужно ' + need + ' ' + D.plural(need, ['минута', 'минуты', 'минут']) + ', а между событиями ' + gap + ' ' + D.plural(gap, ['минута', 'минуты', 'минут']));
        }
      }

      const rows = items.map(it =>
        '<div class="prog-item"><div class="pi-time">' + esc(it.time) + '</div>' +
        '<div class="pi-body"><div class="pi-title">' + esc(it.title) + '</div>' +
        '<div class="pi-sub">' + esc(it.sub) + '</div></div>' +
        '<div class="pi-actions"><button class="btn btn-ghost btn-sm" data-act="c4-cal" data-arg="' + it.key + '">Календарь</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="c4-del" data-arg="' + it.key + '">Убрать</button></div></div>').join('');

      return '<div class="scr">' +
        D.head({eyebrow:esc(F.NOW.dateLong), title:'Программа', sub:'моих сессий: ' + items.length + ' ' + D.plural(items.length, ['сессия', 'сессии', 'сессий']) + ' · ' + esc(F.ME.tariff), actions:'<button class="icon-btn" data-act="c4-all-cal" aria-label="Весь день в календарь">' + icon('calendar') + '</button>'}) +
        viewSeg('C4') +
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
        'Лист фильтров: залы по названию с поиском и мультивыбором, спикеры с поиском, рычаги, группа формата.',
        'Переключатели «с записью» и «доступно мне» — комбинируются с остальными.',
        'Активные фильтры — снимаемые чипы; кнопка «Показать N» считает результат на данных.',
        'Применение возвращает к программе; список и сетка показывают один набор.'
      ],
      rules: [
        '«Доступно мне» учитывает тариф (закрытые тарифом сессии скрываются).',
        '«С записью» оставляет только события с записью пользователя.',
        'Фильтры комбинируются по И; пустой результат показывает пустое состояние.'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const f = pf();
      const sq = (D.st('C2').sq || '').toLowerCase();
      const spq = (D.st('C2').spq || '').toLowerCase();
      const count = filteredSessions().filter(s => s.day === progDay()).length;

      const has = (arr, v) => (arr || []).indexOf(v) >= 0;
      const toggle = (key, v) => {
        const a = f[key] || (f[key] = []);
        const i = a.indexOf(v);
        if (i >= 0) a.splice(i, 1); else a.push(v);
      };

      /* залы: поиск + мультивыбор */
      const hallRows = F.HALLS.filter(h => !sq || (h.name + ' ' + h.place).toLowerCase().indexOf(sq) >= 0).map(h =>
        '<button class="chip' + (has(f.halls, h.id) ? ' on' : '') + '" data-act="c2-hall" data-arg="' + h.id + '">' +
        esc(h.name) + ' <span class="cap">' + h.cap + '</span></button>').join('');

      /* спикеры: поиск + выбор (24) */
      const spkRows = Object.keys(F.SPEAKERS).filter(k => {
        const p = F.SPEAKERS[k];
        return !spq || (p.name + ' ' + p.company + ' ' + p.lever).toLowerCase().indexOf(spq) >= 0;
      }).map(k => {
        const p = F.SPEAKERS[k];
        const nw = F.mentorWindows(k).length;
        return '<button class="chip' + (has(f.speakers, k) ? ' on' : '') + '" data-act="c2-spk" data-arg="' + k + '">' +
          esc(p.name) + (nw ? ' ·м' : '') + '</button>';
      }).join('');

      const leverRows = F.LEVERS.map(l =>
        '<button class="chip' + (has(f.levers, l) ? ' on' : '') + '" data-act="c2-lever" data-arg="' + esc(l) + '">' + esc(l) + '</button>').join('');

      const grpRows = Object.keys(F.FORMAT_GROUPS).map(g =>
        '<button class="chip' + (has(f.groups, g) ? ' on' : '') + '" data-act="c2-grp" data-arg="' + esc(g) + '">' + esc(g) + '</button>').join('');

      const fmtRows = F.FORMATS.map(x =>
        '<button class="chip' + (has(f.formats, x) ? ' on' : '') + '" data-act="c2-fmt" data-arg="' + esc(x) + '">' + esc(x) + '</button>').join('');

      const achipHtml = activeChips().map(c =>
        '<button class="chip on" data-act="c1-fclr" data-arg="' + c[0] + ':' + c[1] + '">' + esc(c[2]) + ' ×</button>').join('');

      return '<div class="scr">' +
        D.head({back:'C1', eyebrow:'Программа', title:'Фильтры', sub:'Сузьте список сессий · ' + count + ' ' + D.plural(count, ['событие', 'события', 'событий']), paren:paren('фильтры комбинируются — список и сетка покажут один набор')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="field"><label>Залы</label>' +
        '<input class="input" type="search" id="c2-hq" placeholder="Название зала" value="' + esc(D.st('C2').sq || '') + '" aria-label="Поиск зала"></div>' +
        '<div class="chips" style="flex-wrap:wrap">' + hallRows + '</div>' +
        '<div class="field"><label>Спикеры</label>' +
        '<input class="input" type="search" id="c2-sq" placeholder="Имя или компания" value="' + esc(D.st('C2').spq || '') + '" aria-label="Поиск спикера"></div>' +
        '<div class="chips" style="flex-wrap:wrap">' + spkRows + '</div>' +
        '<div><div class="cap" style="margin-bottom:6px">Рычаги</div><div class="chips" style="flex-wrap:wrap">' + leverRows + '</div></div>' +
        '<div><div class="cap" style="margin-bottom:6px">Группа формата</div><div class="chips" style="flex-wrap:wrap">' + grpRows + '</div></div>' +
        '<div><div class="cap" style="margin-bottom:6px">Формат</div><div class="chips" style="flex-wrap:wrap">' + fmtRows + '</div></div>' +
        '<div class="toggle-row"><div style="flex:1"><div class="tr-title">С записью</div>' +
        '<div class="tr-sub">Только события, на которые вы записаны</div></div>' +
        '<label class="toggle"><input type="checkbox" data-c2flag="booked"' + (f.booked ? ' checked' : '') + '><span class="tr"></span></label></div>' +
        '<div class="toggle-row"><div style="flex:1"><div class="tr-title">Доступно мне</div>' +
        '<div class="tr-sub">Скрыть сессии закрытых тарифов</div></div>' +
        '<label class="toggle"><input type="checkbox" data-c2flag="avail"' + (f.avail ? ' checked' : '') + '><span class="tr"></span></label></div>' +
        (achipHtml ? '<div><div class="cap" style="margin-bottom:6px">Активные фильтры</div><div class="chips" style="flex-wrap:wrap">' + achipHtml + '</div></div>' : '') +
        '<div style="display:flex;gap:10px">' +
        '<button class="btn btn-ghost" data-act="c2-reset">Сбросить</button>' +
        '<button class="btn btn-primary" style="flex:1" data-go="C1">Показать ' + count + '</button></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const bind = (sel, key) => {
        const inp = host.querySelector(sel);
        if (inp) inp.addEventListener('input', () => { D.st('C2')[key] = inp.value; D.rerender(); });
      };
      bind('#c2-hq', 'sq'); bind('#c2-sq', 'spq');
      host.querySelectorAll('[data-c2flag]').forEach(inp => inp.addEventListener('change', () => {
        const f = pf(); const k = inp.dataset.c2flag;
        if (inp.checked) f[k] = true; else delete f[k];
        D.rerender();
      }));
    }
  });
  D.action('c2-hall', el => { const f = pf(); const a = f.halls || (f.halls = []); const i = a.indexOf(el.dataset.arg); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.arg); D.rerender(); });
  D.action('c2-spk', el => { const f = pf(); const a = f.speakers || (f.speakers = []); const i = a.indexOf(el.dataset.arg); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.arg); D.rerender(); });
  D.action('c2-lever', el => { const f = pf(); const v = el.dataset.arg; const a = f.levers || (f.levers = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); D.rerender(); });
  D.action('c2-grp', el => { const f = pf(); const v = el.dataset.arg; const a = f.groups || (f.groups = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); D.rerender(); });
  D.action('c2-fmt', el => { const f = pf(); const v = el.dataset.arg; const a = f.formats || (f.formats = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); D.rerender(); });
  D.action('c2-reset', () => { D.st('_prog').f = { day: progDay() }; D.st('C2').sq = ''; D.st('C2').spq = ''; D.rerender(); });
  /* формат/рычаг как фильтр: клик из карточки сессии открывает отфильтрованную программу */
  D.action('c2-open-format', el => {
    const f = pf(); f.formats = [el.dataset.arg]; f.day = progDay();
    D.route('C1');
  });

  /* ---------- C7 Сетка программы ---------- */
  D.register('C7', {
    tab: 'C1',
    meta: {
      title: 'C7 · Сетка программы',
      role: 'Гость, расписание',
      fr: ['FR-PROG-02'],
      ac: ['AC-PROG-03'],
      what: [
        'Параллельные сессии одного времени — колонками по залам.',
        'Тот же фильтр, что у списка C1: набор сессий идентичен.',
        'Карточка в клетке ведёт в C3; зал и спикеры — ссылки.'
      ],
      rules: ['Сетка и список используют progFilter — один источник истины.',
        'Пустые клетки времени не рисуются — только реальные сессии.']
    },
    html(ctx) {
      const day = progDay();
      const list = filteredSessions().filter(s => s.day === day);
      const tmin = t => { const p = t.split(':'); return (+p[0]) * 60 + (+p[1]); };
      const dayChips = F.DAYS.map(d =>
        '<button class="chip' + (d.id === day ? ' on' : '') + '" data-act="c1-day" data-arg="' + d.id + '">' + esc(d.label) + '</button>').join('');
      const achipHtml = activeChips().map(c =>
        '<button class="chip on" data-act="c1-fclr" data-arg="' + c[0] + ':' + c[1] + '">' + esc(c[2]) + ' ×</button>').join('');

      let gridHtml = '', hallCount = 0;
      if (list.length) {
        const PX = 46 / 30;                 /* px на минуту: слот 30 мин = 46 px */
        const HEAD_H = 44;
        const COL_W = 150, TIME_W = 56;
        const halls = F.HALLS.filter(h => list.some(s => s.hall === h.id));
        hallCount = halls.length;
        const starts = list.map(s => tmin(s.time));
        const ends = list.map(s => tmin(s.time) + s.dur);
        const startMin = Math.floor(Math.min.apply(null, starts) / 30) * 30;
        const endMin = Math.ceil(Math.max.apply(null, ends) / 30) * 30;
        const slots = (endMin - startMin) / 30;
        const ini = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const LEV = ['#FD5000', '#3D8BFD', '#2FBF71', '#9B6BFF', '#14B8A6', '#F0A202'];
        /* метка «!» — только конфликт в «моей программе»: пересечение по времени
           в разных залах или нехватка запаса на переход между залами */
        const ovl = {}, laneOf = {}, laneCount = {};
        const byHall = {};
        list.forEach(s => { (byHall[s.hall] = byHall[s.hall] || []).push(s); });
        Object.keys(byHall).forEach(h => {
          const arr = byHall[h].slice().sort((a, b) => tmin(a.time) - tmin(b.time) || a.id.localeCompare(b.id));
          const laneEnd = [];
          arr.forEach(s => {
            const st = tmin(s.time), en = st + s.dur;
            let li = laneEnd.findIndex(e => e <= st);
            if (li < 0) { li = laneEnd.length; laneEnd.push(en); } else laneEnd[li] = en;
            laneOf[s.id] = li;
          });
          laneCount[h] = laneEnd.length;
        });
        const mine = list.filter(s => isBookedNow(s.id)).sort((a, b) => tmin(a.time) - tmin(b.time));
        for (let i = 0; i < mine.length; i++) {
          const a1 = tmin(mine[i].time), a2 = a1 + mine[i].dur;
          for (let j = i + 1; j < mine.length; j++) {
            const b1 = tmin(mine[j].time), b2 = b1 + mine[j].dur;
            if (b1 >= a2 && mine[i].hall !== mine[j].hall) {
              const need = F.travelMin(mine[i].hall, mine[j].hall) || 0;
              if (b1 - a2 < need) { ovl[mine[i].id] = ovl[mine[j].id] = true; }
            } else if (b1 < a2) { ovl[mine[i].id] = ovl[mine[j].id] = true; }
          }
        }
        let cells = '<div class="pg-corner"></div>';
        halls.forEach((h, i) => {
          cells += '<div class="pg-hall" data-go="E3/' + h.id + '" style="grid-column:' + (i + 2) + ';grid-row:1">' + esc(h.short || h.name) +
            '<span class="pg-cap">' + h.cap + ' ' + D.plural(h.cap, ['место', 'места', 'мест']) + '</span></div>';
        });
        for (let r = 0; r < slots; r++) {
          const m = startMin + r * 30;
          const hh = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
          cells += '<div class="pg-time" style="grid-row:' + (r + 2) + '">' + hh + '</div>';
          halls.forEach((h, i) => {
            cells += '<div class="pg-cell" style="grid-column:' + (i + 2) + ';grid-row:' + (r + 2) + '"></div>';
          });
        }
        const blocks = list.map(s => {
          const hIdx = halls.findIndex(h => h.id === s.hall);
          const lv = LEV[F.LEVERS.indexOf(s.lever) < 0 ? 0 : F.LEVERS.indexOf(s.lever)];
          const top = HEAD_H + (tmin(s.time) - startMin) * PX;
          const hgt = s.dur * PX;
          const lanes = laneCount[s.hall] || 1;
          const pitch = (COL_W - 10) / lanes;
          const left = TIME_W + hIdx * COL_W + 5 + laneOf[s.id] * pitch;
          const width = pitch - 4;
          const inits = (s.speakers || []).map(k => { const p = F.speaker(k); return p ? ini(p.name) : ''; }).filter(Boolean).join(' ');
          return '<div class="pg-block' + (isBookedNow(s.id) ? ' mine' : '') + (ovl[s.id] ? ' ovl' : '') + '" ' +
            'data-go="C3/' + s.id + '" data-hall="' + s.hall + '" data-sid="' + s.id + '" data-top="' + Math.round(top) + '" ' +
            'style="left:' + Math.round(left) + 'px;top:' + Math.round(top) + 'px;width:' + Math.round(width) + 'px;height:' + Math.round(hgt) + 'px;--lvc:' + lv + '">' +
            '<div class="pg-btitle">' + esc(s.title) + '</div>' +
            '<div class="pg-bbot"><span class="pg-inits">' + esc(inits) + '</span><span class="pg-btime">' + esc(s.time) + '</span></div>' +
            '</div>';
        }).join('');
        let nowLine = '';
        if (day === F.NOW.day) {
          const nm = tmin(F.NOW.time);
          if (nm >= startMin && nm <= endMin) {
            nowLine = '<div class="pg-now" style="top:' + Math.round(HEAD_H + (nm - startMin) * PX) + 'px"><span>' + esc(F.NOW.time) + '</span></div>';
          }
        }
        gridHtml = '<div class="pgrid-wrap"><div class="pgrid" style="grid-template-columns:' + TIME_W + 'px repeat(' + halls.length + ',' + COL_W + 'px);grid-template-rows:' + HEAD_H + 'px repeat(' + slots + ',46px)">'
          + cells + blocks + nowLine + '</div></div>';
      }

      return '<div class="scr">' +
        D.head({eyebrow:esc(F.NOW.dateLong), title:'Программа', sub:list.length + ' ' + D.plural(list.length, ['событие', 'события', 'событий']) + ' · ' + hallCount + ' ' + D.plural(hallCount, ['зал', 'зала', 'залов']), actions:'<button class="icon-btn" data-go="C2" aria-label="Фильтры">' + icon('filter') + '</button>'}) +
        viewSeg('C7') +
        '<div class="chip-rail">' + dayChips + '</div>' +
        (achipHtml ? '<div class="chip-rail" style="padding-top:0">' + achipHtml + '</div>' : '') +
        (gridHtml || '<div style="padding:0 20px"><div class="empty"><div class="e-title">Пусто</div><div class="e-text">По фильтрам ничего не нашлось.</div></div></div>') +
        '</div>';
    }
  });

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
        'Окна менторских встреч показываются только для спикеров-менторов.',
        'Запись на сессию — из карточки сессии, не из карточки спикера.'
      ],
      depends: ['модерация профилей', 'параметры программы']
    },
    html(ctx) {
      const key = ctx.param || 'levin';
      const sp = F.speaker(key) || F.speaker('levin');
      const sessions = F.speakerSessions(key);
      const mw = F.mentorWindows(key);
      const rows = sessions.map(s =>
        '<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow">' +
        '<div class="r-title">' + esc(s.title) + '</div>' +
        '<div class="r-sub">' + esc(s.day) + ' · ' + esc(s.time) + ' · ' + esc(F.hall(s.hall).name) + ' · ' + esc(s.lever) + '</div></div>' + icon('chevR') + '</button>').join('');
      const mwRows = mw.map(w =>
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(w.day) + ' · ' + esc(w.time) + '–' + esc(F.fmtTime(parseInt(w.time.slice(0, 2)) * 60 + parseInt(w.time.slice(3)) + 30)) + '</div>' +
        '<div class="r-sub">менторский стол ' + w.table + ' · ' + esc(F.hall('magnolia').name) + '</div></div>' +
        '<button class="btn btn-secondary btn-sm" data-go="D1">Записаться</button></div>').join('');
      return '<div class="scr">' +
        D.head({back:'C1', eyebrow:'Спикер · ' + esc(sp.lever || ''), title:esc(sp.name), sub:esc(sp.role) + ' · ' + esc(sp.company), paren:paren('профиль проверен модерацией')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="text-align:center;padding:22px 16px"><div class="avatar xl accent" style="margin:0 auto 10px;border-radius:24px;font-size:26px">' + esc(sp.name.split(' ').map(w => w[0]).join('')) + '</div>' +
        '<div style="font-size:15px;font-weight:600">' + esc(sp.name) + '</div>' +
        '<div class="cap" style="margin-top:4px"><span data-go="F1" style="cursor:pointer">' + esc(sp.company) + '</span> · ' + esc(sp.role) + '</div>' +
        '<div class="sess-meta" style="justify-content:center;margin-top:8px"><span class="tag accent" data-act="c1-lever" data-arg="' + esc(sp.lever || '') + '">' + esc(sp.lever || '') + '</span>' +
        (mw.length ? '<span class="tag" data-go="D1">ментор</span>' : '') + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">О себе</div>' +
        '<div class="r-sub" style="line-height:1.55">' + esc(sp.bio || 'Практик с 15-летним стажем: строил команды, выводил продукты на новые рынки, дважды проходил через кризис роста. На фестивале — в трёх сессиях и менторских окнах.') + '</div></div>' +
        (mw.length ? '<div><div class="sec-title" style="margin-top:0">Менторские встречи · ' + mw.length + '</div>' +
        '<div class="card" style="padding:4px 16px"><div class="list">' + mwRows + '</div></div>' +
        '<div class="cap">окна по 30 минут · ' + esc(F.hall('magnolia').name) + ' · запись — на экране менторских</div></div>' : '') +
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
        D.head({back:'C1', eyebrow:'Изменение · ' + esc(F.NOW.time), title:'Расписание обновлено', sub:'Сессия перенесена', paren:paren('изменения помечаются в программе меткой')}) +
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

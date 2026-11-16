/* Блок J — сканер контактов (команда). Фаза B: J1, J2, J3. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  /* ---------- J1 Сканер ---------- */
  D.register('J1', {
    tab: 'MORE',
    meta: {
      title: 'J1 · Сканер контактов',
      role: 'Участник / экспонент',
      fr: ['FR-SCAN-01', 'FR-SCAN-02'],
      ac: ['AC-SCAN-01'],
      what: [
        'Камера с угловыми рамками и подсказкой — честная заглушка без фото.',
        'Переключатель «сеть есть / офлайн» — очередь сканирований.',
        'Демо-кнопки результата: с согласием и без согласия.'
      ],
      rules: [
        'QR-визитка не даёт прав сама по себе — только открывает карточку.',
        'Без сети сканирования копятся в очереди и уходят при подключении.',
        'Сканирование фиксирует факт обмена контактами с согласием человека.'
      ],
      depends: ['O-08 офлайн-очередь']
    },
    html(ctx) {
      const st = ctx.state;
      st.offline = st.offline || false;
      const queue = st.queue || 0;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Обмен контактами</div><h1>Сканер</h1>' +
        '<div class="sub">Визитка участника или метка стенда</div></div>' +
        '<button class="icon-btn' + (st.offline ? ' on' : '') + '" data-act="j1-offline" aria-label="Офлайн-режим">' + icon('wifi') + '</button></div>' +
        '</div>' +
        paren('QR открывает карточку, прав не даёт') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-stage">' +
        '<div class="scan-frame"><span class="c"></span><div class="scan-line"></div></div>' +
        '<div class="scan-hint">Наведите камеру на QR-код визитки или метку стенда</div>' +
        '</div>' +
        (st.offline ? '<div class="banner warn">' + icon('wifi') + '<div><div class="b-title">Офлайн-режим</div>' +
          '<div class="cap">Сканирования сохранятся в очереди (' + queue + ') и отправятся при подключении.</div></div></div>' : '') +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Демо-результаты</div>' +
        '<div class="grid-2">' +
        '<button class="btn btn-secondary" data-go="J2">С согласием</button>' +
        '<button class="btn btn-secondary" data-go="J3">Без согласия</button></div>' +
        '<div class="cap" style="margin-top:8px">В проде результат определяется согласием отсканированного.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('j1-offline', () => {
    const st = D.st('J1');
    st.offline = !st.offline;
    if (st.offline) st.queue = (st.queue || 0) + 1;
    D.toast(st.offline ? 'Офлайн: сканирования в очереди' : 'Сеть восстановлена');
    D.rerender();
  });

  /* ---------- J2 Результат: с согласием ---------- */
  D.register('J2', {
    tab: 'MORE',
    meta: {
      title: 'J2 · Результат: согласие',
      role: 'Участник после сканирования',
      fr: ['FR-SCAN-03', 'FR-SCAN-04'],
      ac: ['AC-SCAN-02'],
      what: [
        'Карточка отсканированного: имя, компания, должность, контакты.',
        'Метка «контакт передан с согласием» и кнопки действий.',
        'Переход в карточку человека и предложение встречи.'
      ],
      rules: [
        'Контакты открываются только при согласии отсканированного.',
        'Факт обмена фиксируется в журнале обеих сторон.',
        'Сканирование не создаёт обязательств — только знакомство.'
      ],
      depends: ['FR-PPL-08']
    },
    html(ctx) {
      const c = F.SCAN_RESULTS.consent;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="J1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Сканирование · ' + esc(F.NOW.time) + '</div><h1>Контакт получен</h1>' +
        '<div class="sub">' + esc(c.company) + '</div></div>' +
        '<span class="mc-status ok">согласие</span></div>' +
        '</div>' +
        paren('человек разрешил передать контакты') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-result scan-ok"><div style="display:flex;gap:12px;align-items:center">' +
        avatar(c.name, 'lg accent') +
        '<div class="grow"><div class="card-title" style="font-size:17px">' + esc(c.name) + '</div>' +
        '<div class="card-sub">' + esc(c.role) + ' · ' + esc(c.company) + '</div></div></div>' +
        '<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">' +
        c.contacts.map(x => '<div class="r-sub" style="font-size:13.5px">' + esc(x) + '</div>').join('') + '</div>' +
        '<div class="banner ok" style="margin-top:12px">' + icon('check') + '<div class="cap">Контакт передан с согласием — запись в журнале.</div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button class="btn btn-primary btn-block" data-go="J4">Метки и заметка</button>' +
        '<button class="btn btn-secondary btn-block" data-go="G2">Предложить встречу</button>' +
        '<button class="btn btn-ghost btn-block" data-go="F2/p03">Карточка в каталоге</button>' +
        '<button class="btn btn-ghost btn-block" data-go="J1">Сканировать ещё</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- J3 Результат: без согласия ---------- */
  D.register('J3', {
    tab: 'MORE',
    meta: {
      title: 'J3 · Результат: без согласия',
      role: 'Участник после сканирования',
      fr: ['FR-SCAN-03', 'FR-PPL-08'],
      ac: ['AC-SCAN-03'],
      what: [
        'Карточка отсканированного без согласия: имя и компания, контакты закрыты.',
        'Объяснение: человек не разрешил передачу контактов.',
        'Действие «Запросить контакт» — заявка на знакомство.'
      ],
      rules: [
        'Без согласия видны только публичные поля профиля.',
        '«Запросить контакт» создаёт заявку — решение за человеком.',
        'Повторное сканирование не обходит отказ.'
      ],
      depends: ['FR-PPL-08', 'FR-PPL-06']
    },
    html(ctx) {
      const c = F.SCAN_RESULTS.noConsent;
      const st = ctx.state;
      st.asked = !!st.asked;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="J1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Сканирование · ' + esc(F.NOW.time) + '</div><h1>Без согласия</h1>' +
        '<div class="sub">' + esc(c.company) + '</div></div>' +
        '<span class="mc-status wait">закрыто</span></div>' +
        '</div>' +
        paren('человек не разрешил передачу контактов') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-result scan-warn"><div style="display:flex;gap:12px;align-items:center">' +
        avatar(c.name, 'lg') +
        '<div class="grow"><div class="card-title" style="font-size:17px">' + esc(c.name) + '</div>' +
        '<div class="card-sub">' + esc(c.role) + ' · ' + esc(c.company) + '</div></div></div>' +
        '<div class="card" style="margin-top:12px;padding:12px 14px"><div class="r-sub">' +
        icon('lock') + ' Контакты закрыты: Telegram, телефон и e-mail видны после принятия заявки.</div></div>' +
        '</div>' +
        (st.asked
          ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Запрос отправлен</div><div class="cap">' + esc(c.name) + ' увидит вашу заявку с причиной.</div></div></div>'
          : '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<button class="btn btn-primary btn-block" data-act="j3-ask">' + icon('userPlus') + 'Запросить контакт</button>' +
            '<button class="btn btn-secondary btn-block" data-go="F3/p03">Заявка на знакомство</button>' +
            '<button class="btn btn-ghost btn-block" data-go="J1">Сканировать ещё</button></div>') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('j3-ask', () => {
    D.st('J3').asked = true;
    D.toast('Запрос на контакт отправлен');
    D.rerender();
  });

  /* ---------- J4 Метки и заметка ---------- */
  D.register('J4', {
    tab: 'J1',
    meta: {
      title: 'J4 · Метки и заметка',
      role: 'Гость, после скана',
      fr: ['FR-LEAD-03'],
      ac: ['AC-LEAD-03'],
      what: [
        'Быстрые метки после скана: «горячий/тёплый/холодный» и интересы.',
        'Следующий шаг и короткая заметка — сохраняются в контакт.',
        'Карточка человека сверху для контекста.'
      ],
      rules: [
        'Метки и заметки видны только мне; вторая сторона их не видит.',
        'Следующий шаг подсказывает Секретарь по контексту встречи.',
        'Сохранение создаёт/обновляет контакт в «Мои контакты».'
      ],
      depends: ['контакты', 'заметки']
    },
    html(ctx) {
      const st = ctx.state;
      st.tags = st.tags || { heat: 'тёплый', interests: [] };
      st.step = st.step || 'отправить материалы';
      const heat = F.SCAN_TAGS.heat.map(h =>
        '<button class="chip' + (st.tags.heat === h ? ' on' : '') + '" data-act="j4-heat" data-arg="' + h + '">' + esc(h) + '</button>').join('');
      const ints = F.SCAN_TAGS.interest.map(t => {
        const on = st.tags.interests.includes(t);
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="j4-int" data-arg="' + t + '">' + esc(t) + '</button>';
      }).join('');
      const c = F.SCAN_RESULTS.consent;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="J2" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Контакт</div><h1>' + esc(c.name) + '</h1>' +
        '<div class="sub">' + esc(c.company) + ' · ' + esc(c.role) + '</div></div></div>' +
        '</div>' +
        paren('метки видны только вам') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Температура</div><div class="chips">' + heat + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Интересы</div><div class="chips" style="flex-wrap:wrap">' + ints + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Следующий шаг</div>' +
        '<div class="chips">' + ['отправить материалы','повторная встреча','познакомить','созвон','ничего'].map(s =>
          '<button class="chip' + (st.step === s ? ' on' : '') + '" data-act="j4-step" data-arg="' + s + '">' + esc(s) + '</button>').join('') + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Заметка</div>' +
        '<textarea class="textarea" rows="3" placeholder="Что обсудили, что важно запомнить">' + esc(st.note || '') + '</textarea></div>' +
        '<button class="btn btn-primary btn-block" data-act="j4-save">Сохранить контакт</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('textarea');
      if (ta) ta.addEventListener('input', () => { D.st('J4').note = ta.value; });
    }
  });
  D.action('j4-heat', el => { D.st('J4').tags.heat = el.dataset.arg; D.rerender(); });
  D.action('j4-int', el => {
    const st = D.st('J4'), t = el.dataset.arg;
    const i = st.tags.interests.indexOf(t);
    if (i >= 0) st.tags.interests.splice(i, 1); else st.tags.interests.push(t);
    D.rerender();
  });
  D.action('j4-step', el => { D.st('J4').step = el.dataset.arg; D.rerender(); });
  D.action('j4-save', () => { D.toast('Контакт сохранён с метками и заметкой'); setTimeout(() => { location.hash = '#/F8'; }, 600); });

  /* ---------- J5 Офлайн-очередь ---------- */
  D.register('J5', {
    tab: 'J1',
    meta: {
      title: 'J5 · Офлайн-очередь',
      role: 'Гость, сканер',
      fr: ['FR-LEAD-06'],
      ac: ['AC-LEAD-06'],
      what: [
        'Сканы, сделанные без сети, ждут отправки — «3 скана ждут отправки».',
        'У каждого — имя, компания, время скана и статус.',
        'Кнопки «Отправить сейчас» и «Очистить отправленное».'
      ],
      rules: [
        'Офлайн-сканер хранит токен на 15 минут; скриншот не принимается дольше 90 секунд при связи.',
        'Очередь отправляется при появлении сети, без потери порядка.',
        'Скан без согласия уходит в очередь как «запрос контакта», не как контакт.'
      ],
      depends: ['офлайн-режим', 'токены QR']
    },
    html(ctx) {
      const rows = F.PENDING_SCANS.map(p =>
        '<div class="q-item"><div class="q-ic">' + icon('scan') + '</div><div class="grow"><div class="r-title" style="font-size:14px">' + esc(p.name) + '</div>' +
        '<div class="r-sub">' + esc(p.company) + ' · ' + esc(p.time) + '</div></div>' +
        tag('ждёт отправки', 'wait') + '</div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="J1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Сканер</div><h1>Офлайн-очередь</h1>' +
        '<div class="sub">без сети · ' + F.PENDING_SCANS.length + ' скана ждут</div></div></div>' +
        '</div>' +
        paren('отправятся при появлении сети') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="banner warn">' + icon('wifi') + '<div style="flex:1"><div class="b-title">Сеть недоступна</div>' +
        '<div class="cap">Сканы сохраняются на устройстве и уйдут автоматически.</div></div></div>' +
        '<div class="card" style="padding:4px 16px">' + rows + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="j5-send">Отправить сейчас</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('j5-send', () => D.toast('Сеть появилась — очередь отправляется'));

  /* ---------- J6 Кто меня сканировал ---------- */
  D.register('J6', {
    tab: 'J1',
    meta: {
      title: 'J6 · Кто меня сканировал',
      role: 'Гость, прозрачность',
      fr: ['FR-LEAD-05'],
      ac: ['AC-LEAD-05'],
      what: [
        'Список тех, кто сканировал мою визитку: имя, компания, время, место.',
        'Прозрачность: каждый скан виден владельцу визитки.',
        'Запрет: контакт нельзя передать третьему лицу.'
      ],
      rules: [
        'Скан без моего согласия не создаёт контакт и виден здесь как «запрос».',
        'Передача контакта третьим лицам запрещена правилами площадки.',
        'Список очищается через 180 дней после события.'
      ],
      depends: ['согласие на обмен', 'права на данные']
    },
    html(ctx) {
      const rows = F.SCANNED_BY.map(s =>
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(s.name) + ' ' + tag('по согласию', 'ok') + '</div>' +
        '<div class="r-sub">' + esc(s.company) + ' · ' + esc(s.place) + ' · ' + esc(s.time) + '</div></div>' + icon('chevR') + '</div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="J1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Контакты</div><h1>Кто меня сканировал</h1>' +
        '<div class="sub">' + F.SCANNED_BY.length + ' человека за фестиваль</div></div></div>' +
        '</div>' +
        paren('контакт нельзя передать третьим лицам') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="banner">' + icon('lock') + '<div class="cap">Ваш контакт виден только тем, кому вы дали согласие. Передача данных третьим лицам запрещена.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
})();

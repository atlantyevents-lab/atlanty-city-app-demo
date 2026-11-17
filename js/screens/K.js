/* Блок K — партнёры. Уровень 2: K1–K4. Логотипы — текстовые заглушки, без реальных брендов. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  const statusLabel = { 'генеральный': 'генеральный', 'отраслевой': 'отраслевой', 'сервисный': 'сервисный' };
  const statusCls = { 'генеральный': 'urgent', 'отраслевой': 'accent', 'сервисный': '' };

  /* ---------- K1 Партнёры по статусам ---------- */
  D.register('K1', {
    tab: 'H1',
    meta: {
      title: 'K1 · Партнёры',
      role: 'Гость, партнёры фестиваля',
      fr: ['FR-PART-01'],
      ac: ['AC-PART-01'],
      what: [
        'Партнёры по статусам: генеральные, отраслевые, сервисные.',
        'Логотипы — текстовые заглушки с названием (реальных логотипов нет).',
        'У каждого партнёра — описание и список предложений участникам.'
      ],
      rules: [
        'Статус партнёра определяет программу и набор предложений.',
        'Логотипы в демо — заглушки; в продукте — утверждённые файлы бренда.',
        'Предложения партнёров проходят модерацию организатора.'
      ],
      depends: ['партнёрские пакеты']
    },
    html(ctx) {
      const groups = ['генеральный', 'отраслевой', 'сервисный'];
      const sections = groups.map(g => {
        const list = F.PARTNERS.filter(p => p.status === g).map(p =>
          '<button class="card interactive" data-go="K2/' + p.id + '" style="text-align:left;width:100%">' +
          '<div class="card-row"><div class="logo-ph" style="width:64px;min-height:44px;flex:none">' + esc(p.name) + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">' + esc(p.name) + '</div>' +
          '<div class="cap" style="margin-top:2px">' + esc(p.desc) + '</div></div>' + icon('chevR') + '</div></button>').join('');
        return '<div class="sec-title" style="margin-top:6px">' + esc(statusLabel[g]) + ' · ' + F.PARTNERS.filter(p => p.status === g).length + '</div>' + list;
      }).join('');
      return '<div class="scr">' +
        D.head({eyebrow:'Экспо', title:'Партнёры', sub:'компании, поддерживающие фестиваль', paren:paren('логотипы в демо — заглушки')}) +
        D.segbar([['H1', 'Решения'], ['H5', 'КипяTALK'], ['K1', 'Партнёры'], ['H3', 'Мой список']], 'K1') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' + sections +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- K2 Карточка партнёра ---------- */
  D.register('K2', {
    tab: 'H1',
    meta: {
      title: 'K2 · Карточка партнёра',
      role: 'Гость, партнёры',
      fr: ['FR-PART-01'],
      ac: ['AC-PART-01'],
      what: [
        'Карточка партнёра: статус, описание, список предложений.',
        'Логотип-заглушка с названием партнёра.',
        'Переход к конкретному предложению (K3).'
      ],
      rules: [
        'Описание и предложения утверждаются партнёром и модератором.',
        'Контакты партнёра открываются через предложение, не напрямую.',
        'Партнёр может быть одновременно экспонентом — карточки связаны.'
      ],
      depends: ['партнёрские пакеты', 'модерация']
    },
    html(ctx) {
      const p = F.PARTNERS.find(x => x.id === ctx.param) || F.PARTNERS[0];
      const offers = p.offers.map((o, i) =>
        '<button class="row clickable" data-go="K3/' + p.id + '/' + i + '"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(o) + '</div></div>' + icon('chevR') + '</button>').join('');
      return '<div class="scr">' +
        D.head({back:'K1', eyebrow:'Партнёр · ' + esc(statusLabel[p.status]), title:esc(p.name), sub:esc(p.desc), paren:paren('предложения проверены организатором')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="logo-ph lg">' + esc(p.name) + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Что предлагает участникам</div>' +
        '<div class="list" style="padding:0">' + offers + '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- K3 Предложение ---------- */
  D.register('K3', {
    tab: 'H1',
    meta: {
      title: 'K3 · Предложение партнёра',
      role: 'Гость, партнёры',
      fr: ['FR-PART-03'],
      ac: ['AC-PART-03'],
      what: [
        'Карточка конкретного предложения: условия, срок, как получить.',
        'Кнопка действия: записаться, сохранить, перейти к партнёру.',
        'Срок действия предложения.'
      ],
      rules: [
        'Предложение действительно до указанного срока; просроченное скрывается.',
        'Действие создаёт запись или контакт — по типу предложения.',
        'Отказ от предложения не влияет на другие офферы.'
      ],
      depends: ['партнёрские пакеты']
    },
    html(ctx) {
      const parts = (ctx.param || '').split('/');
      const p = F.PARTNERS.find(x => x.id === parts[0]) || F.PARTNERS[0];
      const idx = parseInt(parts[1] || '0', 10);
      const offer = p.offers[idx] || p.offers[0];
      return '<div class="scr">' +
        D.head({back:'K2/' + p.id, eyebrow:'Предложение · ' + esc(p.name), title:esc(offer), sub:esc(statusLabel[p.status]) + ' партнёр', paren:paren('условия проверены организатором')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Условия</div>' +
        '<div class="r-sub" style="line-height:1.55">Предложение доступно участникам фестиваля ' + esc(F.NOW.dateLong) +
        '. Получить — у партнёра на площадке или через заявку в приложении. Срок действия — до конца дня.</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">Действует сегодня · запись и подтверждение занимают пару минут.</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="k3-go">' + icon('ticket') + 'Получить предложение</button>' +
        '<button class="btn btn-ghost btn-block" data-act="k3-save">Сохранить на потом</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('k3-go', () => D.toast('Заявка на предложение отправлена'));
  D.action('k3-save', () => D.toast('Сохранено в «Мои предложения»'));

  /* ---------- K4 Мои предложения ---------- */
  D.register('K4', {
    tab: 'H1',
    meta: {
      title: 'K4 · Мои предложения',
      role: 'Гость, партнёры',
      fr: ['FR-PART-04'],
      ac: ['AC-PART-04'],
      what: [
        'Сохранённые и полученные предложения в одном списке.',
        'Статусы: на рассмотрении, принято, отклонено.',
        'Переход к карточке партнёра и условиям.'
      ],
      rules: [
        '«Сохранить» добавляет предложение в список без обязательств.',
        'Статус меняется партнёром или организатором — участник видит актуальный.',
        'История предложений хранится 180 дней после события.'
      ],
      depends: ['партнёрские пакеты']
    },
    html(ctx) {
      const stMap = { 'на рассмотрении': 'wait', 'принято': 'ok', 'отклонено': '' };
      const rows = F.MY_OFFERS.map(o =>
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(o.text) + '</div>' +
        '<div class="r-sub">' + esc(o.partner) + '</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
        '<span class="mc-status ' + (stMap[o.status] || '') + '">' + esc(o.status) + '</span>' +
        '<button class="btn btn-ghost btn-sm" data-go="K1">Партнёры</button></div></div>').join('');
      return '<div class="scr">' +
        D.head({back:'K1', eyebrow:'Партнёры', title:'Мои предложения', sub:F.MY_OFFERS.length + ' активных', paren:paren('статус обновляется партнёром')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Сохранённые предложения не обязывают — забрать можно в любой момент до конца фестиваля.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
})();

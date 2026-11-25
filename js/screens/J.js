/* Блок J — сканер контактов (представитель экспонента). Владелец S4b.
   Экраны: J1 сканер, J2 результат с согласием (профиль по настройкам видимости), J3 результат без согласия,
   J4 метки и заметка («Записать итог»), J5 офлайн-очередь, J6 кто меня сканировал.
   Правило показа (FR-LEAD-08, D-47): «Все участники» — всегда; «Экспоненты и спикеры по согласию» — при согласии;
   «Те, с кем у меня встреча» — только если есть встреча с этой компанией; «Только вы» — никогда.
   Без согласия экспонент видит имя, компанию и кнопку «Запросить контакт». Общее состояние кабинета — window.S4B (I.js).
   «Сохранить контакт» — одно, главное действие в J2 (закреплено внизу экрана); J4 («Записать итог») и I3 его не дублируют.
   «Предложить встречу» не заводит своего состояния: ведёт на F11 (форма заявки S5, подтверждение в её листе). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;
  const S = window.S4B;
  const X = S.X;
  const openSh = S.openSh;
  const pl = S.pl;
  const BODY = '<div class="exh-body">';
  const BODY_PIN = '<div class="exh-body exh-pinned">';
  const END = '<div class="exh-end"></div></div></div>';
  const END_PIN = '</div></div>';
  const CONSENT_VER = (F.CONSENT_TEXT && F.CONSENT_TEXT.ver) || 'редакция от 15.11.2026';
  const CONSENT_BODY = (F.CONSENT_TEXT && F.CONSENT_TEXT.scan) ||
    'Я разрешаю экспонентам при сканировании моего QR-кода видеть поля профиля уровней «Все участники» и «Экспоненты и спикеры по согласию».';
  const CONSENT_TITLE = ((F.CONSENTS || []).find(c => c.id === 'scan') || {}).title || 'Передавать контакты экспонентам при сканировании';

  /* ---------- общее состояние сканера ---------- */
  const J = D.st('J');
  if (!J.ready) {
    J.ready = true;
    J.offline = false;
    J.snap = 0;
    J.queue = F.PENDING_SCANS.map(p => {
      const q = (F.PEOPLE || []).find(x => x.name === p.name);
      return { pid: p.name === F.ME.name ? 'me' : (q ? q.id : null), name: p.name, company: p.company, time: p.time };
    });
    J.sent = [];
    J.asked = {};
    J.tags = {};
    J.revoked = {};
    J.scannedMe = [];                              /* сканы визитки владельца демо, сделанные экспонентом в этом кабинете (J6) */
  }
  /* черновик итога (J4) живёт, пока открыт экран: после ухода его нет, и при следующем открытии метка, шаг и заметка читаются из контакта (правки I3 не теряются) */
  window.addEventListener('hashchange', () => { if (!/^#\/J4\//.test(location.hash)) J.tags = {}; });

  /* участники для демонстрации скана: согласие и выдача полей зависят от настроек каждого.
     Камера по кругу открывает сначала тех, у кого после скана работает весь путь «Сохранить контакт» → «Предложить встречу» → форма F11 с окном
     (проверено по F.PPL.suggest): p10 Артём Чайка — новый участник с согласием, затем p05, p06 (уже в списке), p03, p15 (без согласия).
     p11 Елена Штерн (общих окон нет), p12 Михаил Орлов (встреча уже есть) и p04 Павел Гусев (общих окон нет) остаются в очереди, но не первыми;
     для них J2 и J3 показывают состояние со ссылкой (G11 или G4), а не кнопку, которая ведёт в тупик. */
  const CONSENT_NEW = ['p10', 'p11', 'p12'];
  const CONSENT_LISTED = ['p05', 'p06'];
  const CONSENT_IDS = CONSENT_NEW.concat(CONSENT_LISTED, ['me']);
  const NO_CONSENT_IDS = ['p03', 'p15', 'p04'];
  const SNAP_ORDER = ['p10', 'p05', 'p06', 'p03', 'p15', 'p11', 'p12', 'p04'];
  const CONSENT0 = { p11: true, p12: true, p10: true, p05: true, p06: true, p03: false, p15: false, p04: false };

  function who(id) {
    if (id === 'me') return { id, name: F.ME.name, company: F.ME.company, role: (F.SCAN_RESULTS.consent || {}).role || 'владелец' };
    const p = F.person(id) || { name: id, company: '', role: '' };
    return { id, name: p.name, company: p.company, role: p.role };
  }
  function hasConsent(id) {
    if (id === 'me') return F.PS && F.PS.consents ? !!F.PS.consents.scan : !J.revoked.me;
    return !!CONSENT0[id];
  }
  const isKnown = id => CONSENT_IDS.concat(NO_CONSENT_IDS).indexOf(id) >= 0;
  const shortName = id => id === 'me' ? 'Ваша визитка' : who(id).name;
  /* встреча участника с этой компанией: подтверждённая заявка в «Заявки» (I7) */
  function hasMeeting(id) {
    const name = who(id).name;
    return F.EXH_REQUESTS.some(r => r.who === name && (X.dec[r.id] || r.status) === 'confirmed');
  }
  const FIELDS = () => ((F.TAXO && F.TAXO.PROFILE_FIELDS) || []).filter(f => f.id !== 'name' && f.id !== 'company');
  function levelOf(id, f) {
    if (id === 'me') return F.PS ? F.PS.vis(f.id) : ((F.ME.visibility || {})[f.id] || f.defaultVis);
    const c = F.PPL.company(id);
    if (f.id === 'revenue') return c && c.revenueOpen ? 'all' : 'only_me';
    const e = F.PPL.ext(id);
    return (e.vis && e.vis[f.id]) || f.defaultVis;
  }
  function valueOf(id, f) {
    if (id === 'me') return F.PS ? F.PS.display(f.id) : (F.ME[f.id] || null);
    const c = F.PPL.company(id), e = F.PPL.ext(id);
    switch (f.id) {
      case 'site': return c ? c.site : null;
      case 'industry': return c ? c.industry : null;
      case 'revenue': return c ? c.revenue : null;
      case 'communities': return (e.communities || []).join(', ') || null;
      case 'goals': case 'family': case 'kids': return null;
      default: return e[f.id] || null;
    }
  }
  const canSee = (lvl, consent, meeting) => lvl === 'all' || (lvl === 'partners' && consent) || (lvl === 'meeting' && meeting);
  /* поля профиля, которые видит экспонент: vis — что передал участник; hidden — скрытое; later — из скрытого то, что откроется после встречи */
  function shown(id) {
    const consent = hasConsent(id), meeting = hasMeeting(id);
    const vis = [], hidden = [], later = [];
    FIELDS().forEach(f => {
      const v = valueOf(id, f);
      if (!v) return;
      const lvl = levelOf(id, f);
      if (canSee(lvl, consent, meeting)) vis.push({ f, v, lvl });
      else { hidden.push({ f, v, lvl }); if (lvl === 'meeting') later.push({ f, v, lvl }); }
    });
    return { vis, hidden, later, consent, meeting };
  }
  const fieldsN = n => pl(n, ['поле', 'поля', 'полей']);

  function consentSheet() {
    openSh('<div class="sheet-title">Текст согласия</div>' +
      '<div class="exh-cap" style="margin-bottom:8px">' + esc(CONSENT_TITLE) + ' · ' + esc(CONSENT_VER) + '</div>' +
      '<div class="card" style="font-size:14px;line-height:1.55">' + esc(CONSENT_BODY) + '</div>' +
      '<div class="exh-cap" style="margin-top:10px">Это текст из раздела «Приватность» (L6): участник даёт согласие на шаге онбординга «Согласия» и меняет его в «Приватность». Версия текста записывается в каждый скан.</div>' +
      '<button class="btn btn-secondary btn-block" data-go="A4">Открыть шаг онбординга «Согласия»</button>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Закрыть</button>');
  }
  D.action('j-consent', consentSheet);

  const consentLine = () => '<button class="exh-lnk" data-act="j-consent">Текст согласия · ' + esc(CONSENT_VER) + icon('chevR') + '</button>';
  /* выбор участника для демонстрации: лента .chip-rail вне полей тела (первый чип на 20 px), прокрутку и подвод ведёт оболочка */
  const demoWho = (ids, cur, route) => S.demoRail('Показать результат скана участника', ids.map(i =>
    '<button class="chip' + (i === cur ? ' on' : '') + '" data-go="' + route + '/' + i + '">' + esc(shortName(i)) + '</button>').join(''));
  /* переключатель сети (для демонстрации): внутри тела (J1) или сразу после шапки (J5, top) */
  const netBtns = () => '<div class="exh-netseg" role="group" aria-label="Режим сети (для демонстрации)">' +
    '<button class="seg' + (J.offline ? '' : ' on') + '" data-act="j-net" data-arg="on">' + icon('wifi') + 'Сеть есть</button>' +
    '<button class="seg' + (J.offline ? ' on' : '') + '" data-act="j-net" data-arg="off">Офлайн</button></div>';
  const netSeg = top => top
    ? '<div class="exh-demo-t">' + S.demoLabel('Режим сети') + '</div><div class="exh-demo-seg">' + netBtns() + '</div>'
    : '<div class="exh-demo-rail"><div class="t">' + S.demoLabel('Режим сети') + '</div><div class="exh-demo-seg-in">' + netBtns() + '</div></div>';

  /* ---------- J1 Сканер ---------- */
  D.register('J1', {
    tab: 'H1',
    meta: {
      title: 'J1 · Сканер',
      role: 'Представитель экспонента, телефон',
      fr: ['FR-LEAD-01', 'FR-LEAD-02', 'FR-LEAD-06', 'FR-LEAD-09'],
      ac: ['AC-LEAD-01', 'AC-LEAD-02', 'AC-LEAD-07'],
      what: [
        'Камера с угловой рамкой и подсказкой; нажатие на камеру показывает пример скана: первым идёт новый участник с согласием, и «Сохранить контакт» на следующем экране один шаг (до полезного контакта не больше трёх касаний от главной кабинета).',
        'Список ниже позволяет выбрать участника для демонстрации; у каждого видно, с согласием он, уже в списке или без согласия.',
        'Режим сети (для демонстрации): без сети сканы копятся в очереди, с сетью открывается результат (J2 или J3) и очередь уходит.',
        'Счётчик очереди, переходы в «Офлайн-очередь» и «Кто сканировал мою визитку».'
      ],
      rules: [
        'QR-визитка прав сама по себе не даёт: она открывает карточку по настройкам видимости и согласию участника (D-47).',
        'Без сети результат не открывается: скан сохраняется в очереди и уходит при подключении, без дублей.',
        'Скан записывается с версией текста согласия, действовавшей в момент сканирования.',
        'Результат определяется согласием отсканированного; в демо оно задано по каждому участнику списка.'
      ],
      depends: ['D-47 уровни видимости и согласие', 'FR-LEAD-06 работа без сети']
    },
    html() {
      const q = J.queue.length;
      const row = id => {
        const w = who(id);
        const cc = S.contactOfPerson(id);
        const st = id === 'me' ? ['ваша визитка', 'dim'] : !hasConsent(id) ? ['без согласия', 'dim'] : cc ? (S.isArch(cc) ? ['в архиве', 'dim'] : ['в списке', 'ok']) : ['с согласием', 'ok'];
        return '<button class="exh-who" style="width:100%" data-act="j1-scan" data-arg="' + id + '">' + avatar(w.name, 'sm') +
          '<span class="t"><b>' + esc(w.name) + '</b><span>' + esc(w.company) + '</span></span>' +
          '<span class="exh-st ' + st[1] + '" style="margin-left:auto">' + st[0] + '</span></button>';
      };
      return '<div class="scr exh">' +
        D.head({ backHist: true, eyebrow: 'Сканер контактов · ' + esc(F.EXH.company), title: 'Сканер', sub: 'QR-визитка участника',
          paren: paren('контакты открываются по согласию участника') }) +
        BODY +
        '<div class="scan-stage"><div class="scan-frame"><span class="c"></span><div class="scan-line"></div></div>' +
        '<div class="scan-hint">Наведите камеру на QR-код визитки участника</div>' +
        '<button class="exh-cam-tap" data-act="j1-snap" aria-label="Показать пример скана"></button>' +
        '<div class="exh-stage-note">Нажмите на камеру: покажем пример скана</div></div>' +
        (J.offline
          ? '<div class="banner warn">' + icon('wifi') + '<div style="flex:1"><div class="b-title">Нет сети</div><div class="cap">Сканы сохраняются в очереди и уйдут при подключении. Профиль откроется после отправки.</div>' +
            '<button class="exh-lnk" data-go="J5">Очередь: ' + q + icon('chevR') + '</button></div></div>'
          : q ? '<div class="banner info">' + icon('inbox') + '<div style="flex:1"><div class="cap">Ждут отправки: ' + q + ' (сделаны без сети).</div>' +
            '<div class="exh-acts"><button class="btn btn-secondary btn-sm" data-act="j5-send">Отправить сейчас</button>' +
            '<button class="exh-lnk" data-go="J5">Открыть очередь' + icon('chevR') + '</button></div></div></div>' : '') +
        '<div class="exh-ttl">Приложить QR участника<span class="n">для демонстрации</span></div>' +
        '<div class="card" style="padding:4px 16px">' + CONSENT_NEW.concat(CONSENT_LISTED, NO_CONSENT_IDS, ['me']).map(row).join('<div class="divider" style="margin:0"></div>') + '</div>' +
        '<div class="exh-cap">В продукте результат определяется согласием самого участника: «Передавать контакты экспонентам при сканировании».</div>' +
        netSeg() +
        '<div class="exh-wrap"><button class="exh-lnk" data-go="I2">Контакты кабинета' + icon('chevR') + '</button>' +
        '<button class="exh-lnk" data-go="J6">Кто сканировал мою визитку' + icon('chevR') + '</button></div>' +
        END;
    }
  });
  function scanOf(id) {
    if (!isKnown(id)) return;
    if (J.offline) {
      const dup = J.queue.find(x => x.pid === id);
      if (dup) { dup.time = F.NOW.time; D.toast('Скан уже в очереди: время обновлено'); D.rerender(); return; }
      const w = who(id);
      J.queue.push({ pid: id, name: w.name, company: w.company, time: F.NOW.time });
      D.toast('Нет сети: скан сохранён в очереди (' + J.queue.length + ')');
      D.rerender();
      return;
    }
    location.hash = '#/' + (hasConsent(id) ? 'J2/' : 'J3/') + id;
  }
  D.action('j1-scan', el => scanOf(el.dataset.arg));
  D.action('j1-snap', () => { const id = SNAP_ORDER[J.snap % SNAP_ORDER.length]; J.snap++; scanOf(id); });
  /* отправка очереди по тем же правилам, что J2 и J3 (D-47): без дублей; участник с согласием становится контактом (известный обновляется),
     участник без согласия контактом не становится: скан остаётся записью журнала, он по-прежнему «Контакты закрыты», в I2 и счётчики не попадает.
     Контакт без согласия создаёт только согласие участника или его ответ на «Запросить контакт» (J3). */
  function flushQueue() {
    const n = J.queue.length;
    let added = 0, denied = 0;
    J.queue.forEach(x => {
      if (x.pid && !hasConsent(x.pid)) { x.res = 'denied'; denied++; return; }
      if (x.pid && !S.contactOfPerson(x.pid)) {
        const w = who(x.pid);
        S.addContact({ name: w.name, company: w.company, role: w.role, heat: 'warm', note: '', step: '—', source: 'скан без сети', via: 'скан' });
        x.res = 'added'; added++;
      } else x.res = 'known';
    });
    J.sent = J.sent.concat(J.queue);
    J.queue = [];
    return { n, added, denied };
  }
  const flushMsg = r => 'Отправлено: ' + r.n + (r.added || r.denied ? ', контактов: ' + r.added + (r.denied ? ', без согласия: ' + r.denied : '') : ', карточки обновлены без дублей');
  D.action('j-net', el => {
    const off = el.dataset.arg === 'off';
    if (off === J.offline) return;
    J.offline = off;
    if (!off && J.queue.length) D.toast('Сеть появилась. ' + flushMsg(flushQueue()));
    else D.toast(off ? 'Офлайн: сканы будут в очереди' : 'Сеть восстановлена');
    D.rerender();
  });

  /* ---------- J2 Результат с согласием ---------- */
  /* нижняя панель главного действия (закреплена, видна без прокрутки); «Предложить встречу» — только для людей из каталога */
  /* вторая кнопка ряда зависит от состояния встречи (S.meetBtn): «Предложить встречу» (F11), «Открыть встречу» (G4) или «Что можно сделать» (G11) */
  function pinBar(id, saved, pe, arch) {
    return '<div class="exh-pin">' +
      (saved
        ? '<button class="btn btn-primary" data-go="J1">' + icon('scan') + 'Сканировать ещё</button>'
        : '<button class="btn btn-primary" data-act="j2-save" data-arg="' + id + '">' + icon('userPlus') + (arch ? 'Вернуть в контакты' : 'Сохранить контакт') + '</button>') +
      '<div class="exh-pin-row"><button class="btn btn-secondary btn-sm" data-go="J4/' + id + '">Записать итог</button>' +
      S.meetBtn(pe, 'btn-secondary btn-sm') + '</div></div>';
  }
  /* запись в «Кто меня сканировал» (J6), когда экспонент сканирует визитку владельца демо; повторный скан обновляет ту же строку */
  function logScanOfMe() {
    const k = F.EXH.company;
    const e = J.scannedMe.find(x => x.name === k);
    if (e) e.time = F.NOW.time; else J.scannedMe.unshift({ name: k, company: 'экспонент', place: 'стенд ' + String((F.exhibitor(S.EXID) || {}).stand || 'А-12').split('·').pop().trim(), time: F.NOW.time });
  }
  function resultHtml(id) {
    if (id === 'me') logScanOfMe();
    const w = who(id), sh = shown(id), c = S.contactOfPerson(id), pe = S.personByName(w.name);
    const arch = !!c && S.isArch(c);
    const coId = id === 'me' ? 'co00' : ((F.PPL.company(id) || {}).id || null);
    const rows = sh.vis.map(x => '<div class="exh-f"><div class="k"><span>' + esc(x.f.label) + '</span>' +
      (x.lvl === 'meeting' ? '<span class="exh-lvl">открыто после встречи</span>' : '') + '</div><div class="v">' + esc(x.v) + '</div></div>').join('');
    const n = sh.hidden.length, later = sh.later.map(x => esc(x.f.label)), other = n - later.length;
    const hiddenTxt = n ? '<b>Что скрыто:</b> ' + fieldsN(n) + '.' +
      (later.length ? ' Откроются после встречи с вашей компанией: ' + later.join(', ') + '.' : '') +
      (other > 0 ? (later.length ? ' Ещё ' + other + ' скрыто' : ' Скрыто') + ' самим участником.' : '') : '';
    const saved = !!c && !arch;
    return '<div class="scr exh">' +
      D.head({ back: 'J1', eyebrow: 'Сканирование · ' + esc(F.NOW.time), title: saved ? 'Контакт в списке' : arch ? 'Контакт в архиве' : 'Скан принят', sub: esc(w.company),
        paren: paren(saved ? 'повторный скан обновляет карточку, второго контакта не будет' : arch ? 'контакт скрыт из списка и счётчиков' : 'участник разрешил передачу контактов') }) +
      BODY_PIN +
      '<div class="scan-result scan-ok"><div class="exh-person">' + avatar(w.name, 'l accent') +
      '<div class="grow"><div class="card-title" style="font-size:17px">' + esc(w.name) + '</div><div class="card-sub">' + esc(w.role) + ' · ' + esc(w.company) + '</div></div></div>' +
      (saved ? '<div class="exh-saved" style="margin-top:10px">' + icon('check') + '<div><div class="exh-cap" style="color:var(--ink)">Контакт в вашем списке.</div>' +
        '<div class="exh-wrap" style="gap:2px 16px"><button class="exh-lnk" data-go="I3/' + c.id + '">Открыть карточку контакта' + icon('chevR') + '</button>' +
        '<button class="exh-lnk exh-danger" data-act="exh-del" data-arg="' + c.id + '">Убрать из контактов</button></div></div></div>'
        : arch ? '<div class="exh-cap" style="margin-top:10px">Контакт в архиве: на этапе «не актуально» его нет в списке и счётчиках. <button class="exh-lnk" data-go="I3/' + c.id + '">Открыть карточку' + icon('chevR') + '</button></div>'
        : '<div class="exh-cap" style="margin-top:10px">Скан записан в журнал вместе с версией согласия: ' + esc(CONSENT_VER) + '.</div>') + '</div>' +
      '<div class="card"><div class="exh-ttl" style="margin:0">Что вам передал участник<span class="n">' + fieldsN(sh.vis.length) + '</span></div>' +
      '<div class="exh-cap">Участник разрешил экспонентам видеть эти поля при сканировании.</div>' +
      '<div class="exh-fl">' + (rows || '<div class="exh-cap" style="padding:10px 0">Участник не открыл дополнительных полей.</div>') + '</div>' +
      (n ? '<div class="exh-hidden">' + icon('lock') + '<span>' + hiddenTxt + '</span></div>' : '') + '</div>' +
      '<div class="exh-wrap" style="gap:2px 16px">' + consentLine() +
      (pe ? '<button class="exh-lnk" data-go="F2/' + pe.id + '">Карточка участника' + icon('chevR') + '</button>' : '') +
      (coId ? '<button class="exh-lnk" data-go="F12/' + coId + '">Компания' + icon('chevR') + '</button>' : '') + '</div>' +
      S.meetNote(pe) +
      demoWho(CONSENT_IDS, id, 'J2') +
      pinBar(id, saved, pe, arch) +
      END_PIN;
  }

  D.register('J2', {
    tab: 'H1',
    meta: {
      title: 'J2 · Результат с согласием',
      role: 'Представитель экспонента после сканирования',
      fr: ['FR-LEAD-02', 'FR-LEAD-03', 'FR-LEAD-04', 'FR-LEAD-08', 'FR-LEAD-09', 'FR-EXH-06'],
      ac: ['AC-LEAD-01', 'AC-LEAD-03', 'AC-LEAD-06', 'AC-LEAD-07'],
      what: [
        'Профиль отсканированного участника: имя, должность, компания и только те поля, которые его настройки видимости позволяют показать экспоненту («Что вам передал участник»).',
        'Одна строка «Что скрыто»: сколько полей закрыто и какие откроются после встречи; текст и версия согласия по ссылке.',
        'Закреплённая нижняя панель: «Сохранить контакт» (одно касание, без листа), «Записать итог» (метка, шаг, заметка), «Предложить встречу» (форма заявки S5, F11); после сохранения главным становится «Сканировать ещё».',
        'Если встреча с участником уже есть, вместо «Предложить встречу» стоит «Встреча уже есть» (ссылка на G4); если общих окон нет — «Нет общих окон» (ссылка на G11 «Что можно сделать»); оба с пояснением на экране: кнопка не ведёт в тупик.',
        'После сохранения контакт можно убрать («Убрать из контактов», с подтверждением в листе): сохранение без листа обратимо.',
        'Выбор участника для демонстрации: разные настройки дают разный набор полей; повторный скан обновляет существующий контакт. Камера по кругу открывает сначала участников, у которых «Предложить встречу» доходит до формы с окном (p10, p05, p06, p03, p15).'
      ],
      rules: [
        'Все участники — всегда; «Экспоненты и спикеры по согласию» — при согласии; «Те, с кем у меня встреча» — только при подтверждённой встрече с этой компанией; «Только вы» — никогда.',
        'Настройки владельца демо берутся из «Приватность» (L6): смена уровня поля меняет этот экран.',
        'Значения полей других участников — из их профилей; оборот показывается только если компания открыла его (D-47).',
        'Один участник даёт один контакт на экспонента; факт скана и версия согласия пишутся в журнал.',
        'Сохранение контакта в собственный список листа не требует: оно ничего не отправляет и не публикует (Q-27 перечисляет только такие действия).',
        'Чаты участников — только групповой чат встречи и «мой чат» (D-33); связаться с человеком можно через встречу, заявку на знакомство создаёт S5.'
      ],
      depends: ['D-47 уровни видимости и согласие', 'FR-ONB-08 текст согласия (экран A4)', 'D-33 чаты участников: чат встречи и «мой чат»']
    },
    html(ctx) {
      /* без параметра открывается первый демо-участник с согласием, а не владелец визитки; неизвестный параметр — «не найдено» */
      if (ctx.param && !isKnown(ctx.param)) return S.notFoundHtml('J1', 'Сканирование', 'Участник не найден', 'Такого участника нет среди отсканированных: вернитесь в сканер и отсканируйте визитку.', 'В сканер');
      const id = ctx.param || CONSENT_NEW[0];
      if (!hasConsent(id)) return noConsentHtml(id);
      return resultHtml(id);
    }
  });
  D.action('j2-save', el => {
    const id = el.dataset.arg, w = who(id), c = S.contactOfPerson(id);
    if (c && S.isArch(c)) { S.restoreContact(c.id); D.toast('Контакт возвращён в список: ' + w.name); D.rerender(); return; }
    if (!c) S.addContact({ name: w.name, company: w.company, role: w.role, heat: 'warm', note: '', step: '—', source: 'скан', via: 'скан' });
    D.toast('Контакт сохранён: ' + w.name + '. Он в списке «Контакты»'); D.rerender();
  });

  /* ---------- J3 Результат без согласия ---------- */
  function noConsentHtml(id) {
    if (id === 'me') logScanOfMe();
    const w = who(id), asked = J.asked[id], pe = S.personByName(w.name);
    return '<div class="scr exh">' +
      D.head({ back: 'J1', eyebrow: 'Сканирование · ' + esc(F.NOW.time), title: 'Контакты закрыты', sub: esc(w.company),
        paren: paren('участник не разрешил передачу контактов') }) +
      BODY_PIN +
      '<div class="scan-result scan-warn"><div class="exh-person">' + avatar(w.name, 'l') +
      '<div class="grow"><div class="card-title" style="font-size:17px">' + esc(w.name) + '</div><div class="card-sub">' + esc(w.company) + '</div></div></div>' +
      '<div class="exh-hidden" style="margin-top:12px">' + icon('lock') + '<span>Участник не давал согласия на передачу контактов при сканировании. Видны только имя и компания.</span></div>' +
      '<div class="exh-cap" style="margin-top:10px">Скан записан в журнал: согласие не выдано; текст согласия — ' + esc(CONSENT_VER) + '.</div></div>' +
      (asked
        ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Запрос отправлен</div><div class="cap">' + esc(w.name) + ' увидит заявку от «' + esc(F.EXH.company) + '» и решит сам. Если он согласится, вы увидите поля, открытые для экспонентов.</div></div></div>' : '') +
      '<div class="exh-wrap">' + consentLine() + '</div>' + S.meetNote(pe) +
      demoWho(NO_CONSENT_IDS, id, 'J3') +
      '<div class="exh-pin">' +
      (id === 'me' ? '<button class="btn btn-primary" data-go="J6">Вернуть согласие</button>'
        : asked ? '<button class="btn btn-primary" data-go="J1">' + icon('scan') + 'Сканировать ещё</button>'
        : '<button class="btn btn-primary" data-act="j3-ask" data-arg="' + id + '">' + icon('userPlus') + 'Запросить контакт</button>') +
      '<div class="exh-pin-row">' + S.meetBtn(pe, 'btn-secondary btn-sm') +
      (asked || id === 'me' ? '' : '<button class="btn btn-secondary btn-sm" data-go="J1">Сканировать ещё</button>') + '</div></div>' +
      END_PIN;
  }
  D.register('J3', {
    tab: 'H1',
    meta: {
      title: 'J3 · Результат без согласия',
      role: 'Представитель экспонента после сканирования',
      fr: ['FR-LEAD-02', 'FR-LEAD-08', 'FR-LEAD-09'],
      ac: ['AC-LEAD-01', 'AC-LEAD-06', 'AC-LEAD-07'],
      what: [
        'Без согласия видны только имя и компания; поля профиля и контакты закрыты.',
        'Кнопка «Запросить контакт»: участник получает заявку от компании экспонента, решение за ним; отправка подтверждается в листе. Рядом «Предложить встречу» (форма заявки S5) и «Сканировать ещё».',
        'Запись в журнале скана с версией текста согласия; ссылка на текст согласия.'
      ],
      rules: [
        'API не возвращает представителю ничего, кроме имени и компании; повторное сканирование отказ не обходит.',
        '«Запросить контакт» создаёт заявку, а не контакт: он появится в списке только после согласия участника.',
        'Текст согласия единый с онбордингом (экран A4).'
      ],
      depends: ['D-47 согласие участника', 'FR-ONB-08 текст согласия']
    },
    html(ctx) {
      if (ctx.param && !isKnown(ctx.param)) return S.notFoundHtml('J1', 'Сканирование', 'Участник не найден', 'Такого участника нет среди отсканированных: вернитесь в сканер и отсканируйте визитку.', 'В сканер');
      const id = ctx.param || 'p03';
      if (hasConsent(id)) return resultHtml(id);
      return noConsentHtml(id);
    }
  });
  D.action('j3-ask', el => {
    const id = el.dataset.arg, w = who(id);
    openSh('<div class="sheet-title">Запросить контакт?</div>' +
      '<ul class="exh-rules"><li>' + esc(w.name) + ' получит заявку от «' + esc(F.EXH.company) + '» с вашим именем.</li>' +
      '<li>Решение за участником: до его согласия вы видите только имя и компанию.</li>' +
      '<li>Повторное сканирование отказ не обходит.</li></ul>' +
      '<button class="btn btn-primary btn-block" data-act="j3-ask-ok" data-arg="' + esc(id) + '">Отправить запрос</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('j3-ask-ok', el => { J.asked[el.dataset.arg] = true; D.closeSheet(); D.toast('Запрос на контакт отправлен'); D.rerender(); });

  /* ---------- J4 Записать итог (метки и заметка) ---------- */
  const HEAT_BY_LABEL = { 'горячий': 'hot', 'тёплый': 'warm', 'холодный': 'cold' };
  D.register('J4', {
    tab: 'H1',
    meta: {
      title: 'J4 · Метки и заметка',
      role: 'Представитель экспонента, после скана',
      fr: ['FR-LEAD-03', 'FR-EXH-06', 'FR-LEAD-04'],
      ac: ['AC-EXH-04', 'AC-LEAD-03'],
      what: [
        'Быстрые метки после скана: температура (горячий, тёплый, холодный), следующий шаг и интересы кнопками, короткая заметка.',
        'Кнопка «Записать итог» закреплена внизу: итог пишется в контакт (если контакта ещё нет, он создаётся); «Сохранить контакт» здесь не повторяется.',
        'Сверху — человек, чей контакт размечается; после записи возврат к результату скана, откуда видно «Сканировать ещё».'
      ],
      rules: [
        'Метки и заметки видны представителям вашей компании; участник их не видит.',
        'Запись итога создаёт контакт в списке кабинета (I2) или обновляет существующий, второго контакта не будет.',
        'Значения следующего шага те же, что в карточке контакта (I3). Метки работают и без сети: запись уйдёт в очередь (AC-EXH-04).'
      ],
      depends: ['FR-LEAD-03 метки на месте', 'D-27 контактов без ограничения']
    },
    html(ctx) {
      if (ctx.param && !isKnown(ctx.param)) return S.notFoundHtml('J1', 'Итог разговора', 'Участник не найден', 'Итог можно записать только участнику, которого вы отсканировали. Вернитесь в сканер.', 'В сканер');
      const id = ctx.param || CONSENT_NEW[0];
      const w = who(id), c = S.contactOfPerson(id);
      const t = J.tags[id] = J.tags[id] || {
        heat: c ? S.HEAT[c.heat] : 'тёплый', interests: [], step: c && c.step && c.step !== '—' ? c.step : null, note: c ? (c.note || '') : ''
      };
      const heat = F.SCAN_TAGS.heat.map(h => '<button class="chip' + (t.heat === h ? ' on' : '') + '" data-act="j4-heat" data-arg="' + id + ':' + h + '">' + esc(h) + '</button>').join('');
      const ints = F.SCAN_TAGS.interest.map(i => '<button class="chip' + (t.interests.indexOf(i) >= 0 ? ' on' : '') + '" data-act="j4-int" data-arg="' + id + ':' + i + '">' + esc(i) + '</button>').join('');
      const stepList = !t.step || S.STEPS.indexOf(t.step) >= 0 ? S.STEPS : [t.step].concat(S.STEPS);
      const steps = stepList.map(s => '<button class="chip' + (t.step === s ? ' on' : '') + '" data-act="j4-step" data-arg="' + id + ':' + esc(s) + '">' + esc(s) + '</button>').join('');
      return '<div class="scr exh">' +
        D.head({ back: hasConsent(id) ? 'J2/' + id : 'J3/' + id, eyebrow: 'Итог разговора', title: esc(w.name), sub: esc(w.company) + ' · ' + esc(w.role), paren: paren('метки видны только вашей компании') }) +
        BODY_PIN +
        '<div class="card"><div class="exh-cap">Температура</div><div class="chips">' + heat + '</div></div>' +
        '<div class="card"><div class="exh-cap">Следующий шаг</div><div class="exh-wrap">' + steps + '</div></div>' +
        '<div class="card"><div class="exh-cap">Интересы</div><div class="exh-wrap">' + ints + '</div></div>' +
        '<div class="card"><div class="field"><label for="j4note">Заметка</label>' +
        '<textarea class="textarea" id="j4note" rows="3" data-j4note="' + id + '" placeholder="Что обсудили, что важно запомнить">' + esc(t.note) + '</textarea></div></div>' +
        '<div class="exh-cap">' + (c ? 'Контакт уже в списке: итог обновит метку, шаг и заметку.' : 'Контакта в списке пока нет: он сохранится вместе с итогом.') + '</div>' +
        '<div class="exh-pin"><button class="btn btn-primary" data-act="j4-save" data-arg="' + id + '">Записать итог</button></div>' +
        END_PIN;
    },
    mount(host) {
      const ta = host.querySelector('[data-j4note]');
      if (ta) ta.addEventListener('input', () => { (J.tags[ta.dataset.j4note] || {}).note = ta.value; });
    }
  });
  D.action('j4-heat', el => { const [id, h] = el.dataset.arg.split(':'); J.tags[id].heat = h; D.rerender(); });
  D.action('j4-int', el => {
    const [id, i] = el.dataset.arg.split(':'), a = J.tags[id].interests, k = a.indexOf(i);
    if (k >= 0) a.splice(k, 1); else a.push(i);
    D.rerender();
  });
  D.action('j4-step', el => {
    const i = el.dataset.arg.indexOf(':'), id = el.dataset.arg.slice(0, i), s = el.dataset.arg.slice(i + 1);
    J.tags[id].step = J.tags[id].step === s ? null : s;
    D.rerender();
  });
  D.action('j4-save', el => {
    const id = el.dataset.arg, t = J.tags[id], w = who(id);
    const ta = document.querySelector('[data-j4note]'); if (ta) t.note = ta.value;
    let c = S.contactOfPerson(id);
    const isNew = !c;
    const step = !t.step || t.step === 'ничего' ? '—' : t.step;
    if (!c) c = S.addContact({ name: w.name, company: w.company, role: w.role, heat: HEAT_BY_LABEL[t.heat], note: t.note, step, source: 'скан', via: 'скан' });
    else X.edits[c.id] = Object.assign(X.edits[c.id] || {}, { heat: HEAT_BY_LABEL[t.heat], step, note: t.note, interests: t.interests.slice() });
    D.toast(isNew ? 'Итог записан, контакт сохранён: ' + w.name : 'Итог записан: ' + w.name);
    backToResult(id);
  });
  /* возврат на результат скана: если экран результата стоит в истории прямо перед J4, это шаг назад (иначе в истории копилась бы вторая запись J2 и «назад» вёл бы в J4) */
  function backToResult(id) {
    const target = '#/' + (hasConsent(id) ? 'J2/' : 'J3/') + id;
    try {
      const nav = window.navigation, cur = nav && nav.currentEntry;
      const prev = cur && cur.index > 0 ? nav.entries()[cur.index - 1] : null;
      if (prev && new URL(prev.url).hash === target) { history.back(); return; }
    } catch (err) { /* без Navigation API — обычный переход */ }
    location.hash = target;
  }

  /* ---------- J5 Офлайн-очередь ---------- */
  D.register('J5', {
    tab: 'H1',
    meta: {
      title: 'J5 · Офлайн-очередь',
      role: 'Представитель экспонента, сканер',
      fr: ['FR-LEAD-06', 'FR-LEAD-04'],
      ac: ['AC-LEAD-02', 'AC-LEAD-03'],
      what: [
        'Сканы, сделанные без сети и в ожидании отправки: имя, компания, время и отметка очереди.',
        'Режим сети (для демонстрации); «Отправить сейчас» без сети сообщает об ошибке, с сетью отправляет очередь; при появлении сети очередь уходит сама.',
        'После отправки сканы переходят в «Отправлено»; «Очистить отправленное» убирает их из списка.'
      ],
      rules: [
        'Офлайн-сканер хранит токен 15 минут; скриншот QR не принимается дольше 90 секунд при связи.',
        'Очередь уходит при появлении сети в прежнем порядке, без дублей: уже известный контакт обновляется.',
        'Скан без согласия при отправке не создаёт контакт: участник остаётся «Контакты закрыты» (как в J3), в списке и счётчиках его нет; в итоге отправки такие сканы считаются отдельно («без согласия: N»).',
        'Запрос контакта у такого участника отправляется отдельно в J3 («Запросить контакт») и подтверждается в листе.'
      ],
      depends: ['FR-LEAD-06 очередь и синхронизация', 'D-47 согласие участника']
    },
    html() {
      const q = J.queue, sent = J.sent;
      const item = (x, done) => '<div class="q-item"><div class="q-ic">' + icon(done ? 'check' : 'scan') + '</div>' +
        (S.personByName(x.name) ? '<button class="exh-who" data-go="F2/' + S.personByName(x.name).id + '"><span class="t"><b>' + esc(x.name) + '</b><span>' + esc(x.company) + ' · ' + esc(x.time) + '</span></span></button>'
          : '<div class="grow"><div class="r-title" style="font-size:14px">' + esc(x.name) + '</div><div class="r-sub">' + esc(x.company) + ' · ' + esc(x.time) + '</div></div>') +
        (done ? (x.res === 'denied' ? '<span class="exh-st dim">без согласия</span>' : '<span class="exh-st ok">' + (x.res === 'added' ? 'контакт' : 'отправлено') + '</span>')
          : '<span class="exh-st wait">в очереди</span>') + '</div>';
      return '<div class="scr exh">' +
        D.head({ back: 'J1', eyebrow: 'Сканер', title: 'Офлайн-очередь', sub: q.length ? 'В очереди: ' + q.length : 'Очередь пуста',
          paren: paren('сканы уйдут при появлении сети') }) +
        netSeg(true) + BODY +
        (J.offline
          ? '<div class="banner warn">' + icon('wifi') + '<div style="flex:1"><div class="b-title">Сеть недоступна</div><div class="cap">Сканы сохранены на устройстве и уйдут автоматически, когда связь появится.</div></div></div>'
          : q.length ? '<div class="banner info">' + icon('info') + '<div class="cap">Сеть есть. Эти сканы сделаны без сети и ещё не отправлены: нажмите «Отправить сейчас».</div></div>' : '') +
        (q.length ? '<div class="card" style="padding:4px 16px">' + q.map(x => item(x, false)).join('') + '</div>'
          : '<div class="empty">' + icon('inbox') + '<div class="e-title">Очередь пуста</div><div class="e-text">Сканы без сети появятся здесь и уйдут при подключении.</div></div>') +
        '<button class="btn btn-primary btn-block"' + (q.length ? ' data-act="j5-send"' : ' disabled') + '>Отправить сейчас</button>' +
        (sent.length ? '<div class="exh-ttl">Отправлено<span class="n">' + sent.length + '</span></div><div class="card" style="padding:4px 16px">' + sent.map(x => item(x, true)).join('') + '</div>' +
          '<button class="btn btn-ghost btn-block" data-act="j5-clear">Очистить отправленное</button>' : '') +
        END;
    }
  });
  D.action('j5-send', () => {
    if (J.offline) { D.toast('Нет сети: очередь сохранена на устройстве'); return; }
    if (!J.queue.length) return;
    D.toast(flushMsg(flushQueue())); D.rerender();
  });
  D.action('j5-clear', () => { J.sent = []; D.toast('Отправленные сканы убраны из списка'); D.rerender(); });

  /* ---------- J6 Кто меня сканировал ---------- */
  /* Экран участника (раздел «Приватность»): кто сканировал мою визитку. Состояние согласия одно — hasConsent('me'),
     все тексты экрана выбираются по нему, поэтому после отзыва нигде не остаётся «видны контакты». */
  D.register('J6', {
    tab: 'H1',
    meta: {
      title: 'J6 · Кто меня сканировал',
      role: 'Участник, прозрачность',
      fr: ['FR-LEAD-05', 'FR-LEAD-09'],
      ac: ['AC-LEAD-04', 'AC-LEAD-07'],
      what: [
        'Список тех, кто сканировал мою визитку: имя, компания, время и место.',
        'Согласие на передачу контактов при сканировании: текст, версия, дата; «Отозвать согласие» (лист) и «Разрешить снова»; после отзыва весь экран говорит одно: экспоненты видят только имя и компанию.',
        'Запрет передачи контакта третьим лицам.'
      ],
      rules: [
        'Участник видит все сканирования о себе; каждый скан хранит версию согласия на момент сканирования.',
        'После отзыва согласия экспонент при сканировании видит только имя и компанию; прежние сканы остаются в списке.',
        'Передача контакта третьим лицам запрещена правилами площадки; список очищается через 180 дней после события.'
      ],
      depends: ['D-47 согласие участника', 'FR-LEAD-05 прозрачность']
    },
    html() {
      const on = hasConsent('me');
      const n = shown('me').vis.length;
      const sc = F.CONSENTS ? F.CONSENTS.find(c => c.id === 'scan') : null;
      const log = J.scannedMe.concat(F.SCANNED_BY), nLog = log.length;
      const rows = log.map(s => '<div class="row">' + S.whoBtn(s.name, esc(s.company) + ' · ' + esc(s.place) + ' · ' + esc(s.time)) + '</div>').join('');
      return '<div class="scr exh">' +
        D.head({ backHist: true, eyebrow: 'Приватность · вы как участник', title: 'Кто меня сканировал',
          sub: nLog + ' ' + D.plural(nLog, ['скан', 'скана', 'сканов']) + ' за фестиваль',
          paren: paren('контакт нельзя передать третьим лицам') }) +
        BODY +
        '<div class="card"><div class="card-row" style="justify-content:space-between;align-items:flex-start"><div class="r-title">' + esc(CONSENT_TITLE) + '</div>' +
        '<span class="exh-st ' + (on ? 'ok' : 'dim') + '">' + (on ? 'дано' : 'отозвано') + '</span></div>' +
        '<div class="exh-cap">' + (on ? 'Согласие дано ' + esc((sc && sc.given) || '12.02.2027') + ' · ' + esc(CONSENT_VER) : 'Согласие отозвано. Сейчас экспоненты при сканировании видят только ваше имя и компанию.') + '</div>' +
        (on ? '<div class="exh-cap">Сейчас экспоненты при сканировании видят имя, компанию и ' + fieldsN(n) + ' по вашим настройкам видимости.</div>' : '') +
        '<div class="exh-acts">' + (on ? '<button class="btn btn-secondary btn-sm" data-act="j6-revoke">Отозвать согласие</button>'
          : '<button class="btn btn-primary btn-sm" data-act="j6-grant">Разрешить снова</button>') +
        '<button class="exh-lnk" data-act="j-consent">Текст согласия' + icon('chevR') + '</button></div></div>' +
        '<div class="exh-ttl">Кто сканировал<span class="n">' + nLog + '</span></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="banner">' + icon('lock') + '<div class="cap">' + (on
          ? 'Контакты видят только экспоненты при сканировании и только поля, которые вы открыли. '
          : 'Новые сканы показывают только имя и компанию. Прежние сканы остаются в списке. ') +
        'Передача данных третьим лицам запрещена. Список очищается через 180 дней после события.</div></div>' +
        '<button class="btn btn-secondary btn-block" data-go="L6">Настройки приватности</button>' +
        END;
    }
  });
  /* то же, что делает L6 (consSet): значение, дата выдачи в FIX.CONSENTS[scan].given (PS.grant пишет сегодняшнюю дату демо) и запись журнала */
  function setConsent(v) {
    if (F.PS && F.PS.consents) {
      if (F.PS.grant) F.PS.grant('scan', v); else F.PS.consents.scan = v;
      if (F.PS.consentLog && F.PS.stamp) F.PS.consentLog.unshift({ time: F.PS.stamp(), title: CONSENT_TITLE, to: v ? 'дано' : 'отозвано', ver: CONSENT_VER });
    } else J.revoked.me = !v;
  }
  D.action('j6-revoke', () => openSh('<div class="sheet-title">Отозвать согласие?</div>' +
    '<ul class="exh-rules"><li>Экспоненты при сканировании будут видеть только имя и компанию.</li>' +
    '<li>Уже сделанные сканы остаются в списке; новые контакты передаваться не будут.</li>' +
    '<li>Согласие можно вернуть в любой момент.</li></ul>' +
    '<button class="btn btn-primary btn-block" data-act="j6-revoke-ok">Отозвать согласие</button><button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('j6-revoke-ok', () => { setConsent(false); D.closeSheet(); D.toast('Согласие отозвано'); D.rerender(); });
  D.action('j6-grant', () => openSh('<div class="sheet-title">Разрешить снова?</div>' +
    '<ul class="exh-rules"><li>' + esc(CONSENT_BODY) + '</li></ul>' +
    '<button class="btn btn-primary btn-block" data-act="j6-grant-ok">Разрешить передачу</button><button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('j6-grant-ok', () => { setConsent(true); D.closeSheet(); D.toast('Согласие дано'); D.rerender(); });
})();

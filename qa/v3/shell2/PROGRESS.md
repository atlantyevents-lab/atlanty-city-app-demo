# Прогресс партии 3 (оболочка) — для переживания перезапусков

Дата: 24.11.2026. Правятся только: core.js, css/app.css, tokens.css, shell.css, js/screens/Z.js, tools/checks.py.

## Статус по пунктам (все проверены в браузере на :8850)

1. **mount-скролл побеждает keepY** — СДЕЛАНО ранее. keepY/restore применяется ДО R.mount (core.js ~стр. 575–585). Проверено: H8 тап по ex03 → .mkt-sel cb=829 < tabbar tt=849. checks.py: `h8-stand-card`.
2. **.chip-rail scrollLeft** — СДЕЛАНО. SCR_POS хранит {y, rails[]} по hash; restore при sameRoute и traversal-back; после mount активный чип (.on/.active/[aria-pressed=true]) дотягивается в вид. Проверено: H1 «Финансирование» rail1 sl=721 виден после click/rerender/back; R1 «Дайджест» sl=664 vis=True. checks.py: `h1-chip-visible`.
3. **Возврат назад восстанавливает scrollTop корневых** — СДЕЛАНО+ДОДЕЛАНО. Был баг: isBackNav по IHIST.indexOf путал forward-навигацию на виденный hash с back. ФИНАЛЬНОЕ РЕШЕНИЕ: Navigation API — `window.navigation.currentEntry.index` сравнивается с LAST_NAV_IDX; index уменьшился = traversal → restore из SCR_POS; иначе forward → верх. popstate НЕ подходит: location.hash= тоже стреляет popstate (проверено событиями). Проверено: R1/C1/F1/B1/H1 scrollTop=700 → detail → history.back() → 700; Z1→Z2→Z1 (location.hash) → 0. checks.py: `back-scroll-restore`, `scroll-reset-nav`.
4. **Клавиатурная доступность** — СДЕЛАНО+ДОДЕЛАНО. a11yify вешает data-a11y/tabindex=0/role на не-нативных [data-go]/[data-act]; Enter/Space → click() с guard `ev.defaultPrevented` (SVG-стенды H8 имеют свой keydown). ДОДЕЛКА: нативные A/BUTTON/INPUT/SELECT/TEXTAREA/SUMMARY/LABEL не помечаются (иначе двойная активация); элементы *scrim* пропускаются (подложки не в Tab-порядке). Проверено: Tab→ARTICLE.card[data-go=R4] → Enter → #/R4/fp03. checks.py: `a11y-marked`, `r1-enter-R4`.
5. **body.sheet-open снимается при route()** — СДЕЛАНО. route() ~стр. 543: если есть .sheet-wrap → remove sheet-open + SHEET_RETURN=null (элемент умирает с innerHTML). checks.py: `sheet-open-cleared` (добавлена в shell-v32).
6. **app.css** — СДЕЛАНО: .err-msg color:var(--err) вне .field (стр. 370); .btn-sm 40px (227); .feed-link min-height 40px (606); .tag 12px + font-feature-settings:normal (272–279); .chip numeric-off (280); .mc-status 12px (727/730); .kt-till/.kt-kind/.kt-seat-txt → 12px (899/901/907, seat-txt дополнено в этой сессии, overflow чист на H*/K*/C1/R1/F1/I1 обе темы); «+» в «Экспо+»: .tag/.chip font-feature-settings:normal — проверено computed ffs=normal на H1 (.tag.tariff), I1 (.chip). Остаток: .mkt-note (market.css, чужой файл) — прозаические упоминания «Экспо+» в тексте пояснения остаются с lnum.
7. **Z.js path-add** — СДЕЛАНО ранее, не трогалось. pathFindAny→suggested принимается (time:null → pathAdd по ref), freePathTime для stand: EXPO_HOURS['27.02'] 10:00–18:30, start=max(11:25, eh[0]), end=eh[1]; нет окон → тост «Сегодня окон на стенде не осталось…» + return. Проверено: H2/ex11 pi14→accepted 15:00, pusEx11=0. checks.py: `h2-ex11-suggested`.
8. **checks.py shell-v32** (~стр. 687–748): h8-stand-card, back-scroll-restore, h1-chip-visible, a11y-marked, r1-enter-R4, h2-ex11-suggested, sheet-open-cleared. ВАЖНО: селекторы — `.scr [data-go^="R4"]` (не `[data-go^=]` — первый матч был sidebar-кнопкой!), H8 идёт с `go('H8')` + клик по `[data-act="h8-pick"][data-arg="ex03"]` (не H8/ex03 — param уже выбирает, клик снимает выбор).

## Доделки этой сессии (после обрыва)

- core.js: TRAVERSAL/popstate → заменено на Navigation API index (location.hash= стреляет popstate — popstate не различает направление!). См. п.3.
- core.js a11yify: skip нативных тегов + *scrim* (чинит sheet-focus: scrim воровал первый фокус, .sheet не содержал activeElement).
- core.js: `window.restoreScroll` + `Demo.restoreScroll` — хелпер для экранов (R7 вызывает bare `restoreScroll(root)` в mount, функции не было → pageerror). Ставит .scr.scrollTop = APPLIED_SCR_Y (значение, применённое route() до mount). Проверено: R7/R3/R4/R1 pageerrors=[] — R7 больше не падает.
- css/app.css: .kt-seat-txt 11→12px.
- tools/_spot_shell3.py — точечный скрипт (артефакт).

## Известное чужое (не моё)

- P5 overflow toggle-row ×3 (S8), E1 e1youare + E7 publicSeg (S8), align chip-rail field=33 на I1/I4/I6/I10/J2/J3 (S4b).
- B.js/R.js правятся параллельно (S2/S4a): transient pageerror'ы (`claim is not defined`, `restoreScroll is not defined`) — на момент проверки уже закрыты (restoreScroll закрыт моим хелпером; claim — B.js сам определяет).
- B.js `pth-add` (S2) — отдельный обработчик «+ Путь», не мой.

## Что осталось

- Полный `python tools/checks.py` (DEMO_PORT=8850) → tools/checks_result.json → отчёт lead'у с разделением «оболочка/раздел».
- После отчёта: убить сервер 8850 (PID 57444) и Chromium.

## Партия 4 (21:xx) — все 7 пунктов на диске, проверки в checks.py shell-v33
1. Z.js freePathTime: сетка 5 мин для stand, start=ceil(11:25/5)*5, EXPO_HOURS 10:00–18:30. Проверено: H2/ex03→pu01 18:00, ex05/ex07→тост (окон реально 1 на 27.02 — расписание забито дублями pi33-36, вопрос к S2).
2. app.css .toast: bottom 156px, max-width 350px, line-clamp 4. Проверено: w=340, clamp=4, над tabbar.
3. app.css .toggle → border var(--toggle-off-line); tokens.css обе темы; disabled .55/not-allowed; + .console .con-sw override (console.css грузится позже). Контраст: R2/P5 ≥3:1 обе темы (проверка в checks.py).
4. core.js data-go: closest('.menu-ov') → closeMenu(). Проверено: B1→B1 меню закрылось.
5. Z.js z2Index: own-флаги (person/company/product) + z2Results фильтр по PS.consents.profile и ME.visibility only_me. Проверено: отзыв→«НИЧЕГО», only_me→скрыто.
6. app.css: .pill-count/.stat-tile .lbl/.kpi-cell .k/.dash-cell .dk → 12px. .toggle hit-area: .toggle-row label 63px / .con-sw ::before 46×44 — ≥40.
7. checks.py shell-v33: p4-stand-x3, menu-same-close, z2-own-hidden, toast-long, toggle-contrast.
Далее: полный checks.py.

## Финал партии 4
- Полный checks.py прогнан дважды. Прогон 1: всё чисто (overflow 0/144, console чист, align чист, shell 0 нарушений, heads/tabs чисто, catalog 144/144), кроме устаревшей проверки toast-2lines (обновлена до toast-lines: clamp=4, w≤351, над tabbar — PASS) и toggle-contrast (метрика была неверной: мерила border-токен против заливки трека=1.4; исправлено на border-token/--surface-2 против фона КАРТОЧКИ → R2/P5 summer 4.32, winter 3.87 ≥3:1).
- p4-stand-x3: n=1 pu@18:00, clash=false, toasts=2, ok=true — на 27.02 реально ОДНО 15-мин окно (18:00–18:15); расписание забито дублями pi33–36 (вопрос к S2). Проверка утверждает инвариант: ≥1 создан, без пересечений.
- H2-study-on: 0 — файл H.js правится S4a параллельно (transient).
- Известные чужие: map e1youare hitAtFit:false, e6nocoord:2, publicSegE7:false, hallLinks B1/F1/F9:0 (S8/map).
- Сервер 8850 и Chromium будут остановлены после финального прогона.
- Финальный checks.py чист: все проверки зелёные. Сервер 8850 остановлен, headless-shell процессы закрыты. Партия 4 завершена.

## Партия 5 (малое) — ЗАВЕРШЕНА
1. Z.js path-add stand: свободного окна нет → softPathTime (5-мин сетка в EXPO_HOURS['27.02'], ≥11:25, пересекает ТОЛЬКО accepted/suggested; booked/done и PATH_ADDED не трогаем) → пункт accepted + тост «Пересекается с «<название>». Разрешить можно в конфликтах» + ссылка на B7; B7 считает конфликты сам по времени (isFirm: accepted/booked/done|self|feed). Совсем нет окон → старый тост.
2. core.js toast(msg,ms,act): act={label,go} → <a class="toast-act" href="#/GO">; app.css .toast-act (accent-solid, underline, pointer-events:auto — .toast имеет pointer-events:none!). Проверено: ex03→pu01@18:00 (обычный тост), ex05→pu02@14:30, ex07→pu03@14:45 (тост+ссылка, клик → #/B7); B7: 10 карт конфликтов, 2 «Стенд:».
3. checks.py: p4-stand-x3 переписан (n===3, inHours, без booked/done, без pu-pu наложения, confItems) + p4-b7-conflicts (.pth-cf со «Стенд:» ≥1). JS_ALIGN: chip-rail с scrollLeft>0 — пропуск поля 20px для чипа.
4. Дебаг-остатки: console.log/_spot_/debugger в core.js/app.css/Z.js/tokens/shell — нет.
5. Убитые ранее chrome-headless-shell — playwright-процессы сессии проверок (свои); чужих агентов не затрагивал сознательно, в дальнейшем только по своим PID.
- Финальный checks.py чист (все clicks PASS, overflow 0, align пусто). Сервер 8850 остановлен. Партия 5 завершена.

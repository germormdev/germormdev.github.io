/* ИМЯ ПРОДУКТА — ЗАГОТОВКА ПЕРЕИМЕНОВАНИЯ, ПОКА ВЫКЛЮЧЕНА.
 *
 * ⛔ ПОКА REBRAND = false ЭТОТ ФАЙЛ НЕ ДЕЛАЕТ НИЧЕГО. Сайт говорит CargoLog —
 * и это правда: в Play пока лежит CargoLog. Сайт про VecturaBook со ссылкой на
 * CargoLog был бы враньём, поэтому имя ждёт своего часа здесь, а не в разметке.
 *
 * ТРИ ПЕРЕКЛЮЧАТЕЛЯ, И БОЛЬШЕ НИГДЕ НИЧЕГО ПРАВИТЬ НЕ НАДО:
 *
 *   REBRAND       false -> true   ВКЛЮЧИТЬ новое имя целиком (шапка + баннер)
 *   SHOW_OLD_NAME true  -> false  убрать «раньше CargoLog» из шапки
 *   SHOW_BANNER   true  -> false  снять баннер переименования
 *
 * Порядок жизни такой: сегодня всё выключено · в день выпуска под новым именем
 * REBRAND = true · когда баннер отработал, SHOW_BANNER = false · когда переход
 * закончился и старое имя больше никому не нужно, SHOW_OLD_NAME = false.
 *
 * ⛔ ЧЕГО ЭТОТ ФАЙЛ НЕ ДЕЛАЕТ И НЕ ДОЛЖЕН. Он не трогает текст страниц, историю
 * версий и ссылки в магазины: записи до 2.4.2 вышли под именем CargoLog — это
 * правда, и подделывать её нельзя; ссылки строятся из имени пакета
 * com.driver.triplog и не меняются никогда.
 */
(function () {
  'use strict';

  // ─────────────────────────── ПЕРЕКЛЮЧАТЕЛИ ───────────────────────────
  var REBRAND = false;        // ← ОДНА ПРАВКА ВКЛЮЧАЕТ ВСЁ
  var SHOW_OLD_NAME = true;   // «раньше CargoLog» рядом с новым именем
  var SHOW_BANNER = true;     // баннер переименования наверху страницы
  // ─────────────────────────────────────────────────────────────────────

  if (!REBRAND) return;

  var NEW_NAME = 'VecturaBook';
  var OLD_NAME = 'CargoLog';

  var WORDS = {
    en: {
      was: 'formerly ' + OLD_NAME,
      title: 'We have changed our surname.',
      body: OLD_NAME + ' is now ' + NEW_NAME + ' — like a bride after the wedding: ' +
            'a new name on the passport, the same person, the same passport number. ' +
            'The same app, your trips are where you left them, and updates arrive as ' +
            'they always did. The old name stays next to the new one for a while, so ' +
            'that nobody gets lost.',
      close: 'hide'
    },
    ru: {
      was: 'раньше ' + OLD_NAME,
      title: 'Мы сменили фамилию.',
      body: OLD_NAME + ' теперь ' + NEW_NAME + ' — как барышня после свадьбы: ' +
            'имя в паспорте новое, человек тот же, номер паспорта тот же. ' +
            'Приложение то же самое, ваши рейсы на месте, обновления приходят, как ' +
            'приходили. Старое имя ещё поживёт рядом с новым, чтобы никто не ' +
            'потерялся.',
      close: 'скрыть'
    },
    he: {
      was: 'לשעבר ' + OLD_NAME,
      title: 'החלפנו שם משפחה.',
      body: OLD_NAME + ' היא מעכשיו ' + NEW_NAME + ' — כמו כלה אחרי החתונה: ' +
            'שם חדש בתעודה, אותו אדם, אותו מספר תעודה. אותה אפליקציה, הנסיעות שלכם ' +
            'במקומן, והעדכונים ממשיכים להגיע כרגיל. השם הישן יישאר עוד זמן מה לצד ' +
            'החדש, כדי שאף אחד לא ילך לאיבוד.',
      close: 'להסתיר'
    }
  };

  function words() {
    var l = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
    return WORDS[l] || WORDS.en;
  }

  /* Шапка: новое имя крупно, старое — мелко рядом. Правится ТОЛЬКО элемент с
     id="brand"; нет его на странице — значит этой странице шапка не положена. */
  function renameBrand() {
    var el = document.getElementById('brand');
    if (!el) return;
    var w = words();
    // Значок рядом с именем (грузовик на политике) — не часть имени, его беречь.
    var mark = el.querySelector('.mark');
    el.textContent = '';
    if (mark) {
      el.appendChild(mark);
      el.appendChild(document.createTextNode(' '));
    }
    var big = document.createElement('span');
    big.textContent = NEW_NAME;
    el.appendChild(big);
    if (SHOW_OLD_NAME) {
      var small = document.createElement('span');
      small.textContent = w.was;
      small.style.cssText = 'display:block;font-size:11px;font-weight:400;' +
                            'line-height:1.1;opacity:.65;letter-spacing:0';
      el.appendChild(small);
    }
  }

  /* Баннер: первым, что видно. Ставится только там, где разметка сама об этом
     просит (data-brand-banner на <body>) — на политике и истории версий его нет. */
  function showBanner() {
    if (!SHOW_BANNER) return;
    if (!document.body || !document.body.hasAttribute('data-brand-banner')) return;
    var w = words();
    var bar = document.createElement('div');
    bar.id = 'brand-banner';
    bar.setAttribute('role', 'note');
    bar.style.cssText = 'background:#fff7ed;border-bottom:1px solid #fed7aa;' +
                        'color:#7c2d12;padding:14px 18px;font-size:15px;line-height:1.5;';
    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:880px;margin:0 auto;';
    var strong = document.createElement('strong');
    strong.textContent = w.title + ' ';
    inner.appendChild(strong);
    inner.appendChild(document.createTextNode(w.body));
    bar.appendChild(inner);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function go() {
    renameBrand();
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();

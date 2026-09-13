/* ИМЯ ПРОДУКТА: ПРЕДУПРЕЖДЕНИЕ СЕЙЧАС, СМЕНА ИМЕНИ ПОТОМ.
 *
 * ⛔ ДВА ПЕРЕКЛЮЧАТЕЛЯ НЕЗАВИСИМЫ, И ЭТО ГЛАВНОЕ В ЭТОМ ФАЙЛЕ.
 * Сегодня в магазинах стоит CargoLog, значит шапка обязана говорить CargoLog —
 * а баннер уже может предупреждать, что в следующем выпуске имя сменится.
 * Свяжи их в один флаг — и придётся выбирать между «молчим» и «врём».
 *
 *   SHOW_BANNER = true   баннер-предупреждение виден (сейчас — да)
 *   REBRAND     = false  шапка и имя: false = CargoLog, true = VecturaBook
 *
 * ПОРЯДОК ЖИЗНИ:
 *   сегодня            SHOW_BANNER = true,  REBRAND = false  ← так и стоит
 *   выпуск под новым   SHOW_BANNER = true,  REBRAND = true   (баннер уже в прошедшем
 *                                                            времени не нужен — см. ниже)
 *   переход кончился   SHOW_BANNER = false, SHOW_OLD_NAME = false
 *
 * ⛔ ТЕКСТ БАННЕРА НАПИСАН В БУДУЩЕМ ВРЕМЕНИ. В день, когда REBRAND станет true,
 * его надо либо снять (SHOW_BANNER = false), либо переписать в прошедшее —
 * иначе он будет обещать то, что уже случилось.
 *
 * ⛔ ЧЕГО В ТЕКСТЕ НЕТ И БЫТЬ НЕ ДОЛЖНО: «заставили», «потребовали», «пришлось»,
 * чужой фирмы, страны, отрасли, намёка на конфликт. Ничего этого не было.
 * ⛔ ЗНАЧКА В ТЕКСТЕ ТОЖЕ НЕТ (решение German 13.09.2026): значок не меняется,
 * и упоминать его — значит поднимать вопрос, которого нет.
 *
 * ⛔ ЧЕГО ЭТОТ ФАЙЛ НЕ ДЕЛАЕТ. Не трогает текст страниц, <title>, историю версий
 * и ссылки в магазины: записи вышли под именем CargoLog — это правда, а ссылки
 * строятся из имени пакета com.driver.triplog и не меняются никогда.
 */
(function () {
  'use strict';

  // ─────────────────────────── ПЕРЕКЛЮЧАТЕЛИ ───────────────────────────
  var SHOW_BANNER = true;     // баннер-предупреждение наверху страницы
  var REBRAND = false;        // имя в шапке: false = CargoLog, true = VecturaBook
  var SHOW_OLD_NAME = true;   // «раньше CargoLog» мелко рядом с новым именем
  // ─────────────────────────────────────────────────────────────────────

  var NEW_NAME = 'VecturaBook';
  var OLD_NAME = 'CargoLog';

  var WORDS = {
    en: {
      was: 'formerly ' + OLD_NAME,
      title: 'We are about to change our surname.',
      body: 'In the next release ' + OLD_NAME + ' will be called ' + NEW_NAME +
            ' — like a bride after the wedding: a new name on the passport, the ' +
            'same person, the same passport number. There is nothing for you to ' +
            'do: the app updates itself, and all your trips and settings stay ' +
            'exactly where they are. Only the name changes — the same app and the ' +
            'same developer.'
    },
    ru: {
      was: 'раньше ' + OLD_NAME,
      title: 'Скоро сменим фамилию.',
      body: 'В следующем выпуске ' + OLD_NAME + ' станет называться ' + NEW_NAME +
            ' — как барышня после свадьбы: имя в паспорте новое, человек тот же, ' +
            'номер паспорта тот же. Делать ничего не нужно: приложение обновится ' +
            'само, все рейсы и настройки останутся на месте. Меняется только имя — ' +
            'приложение то же самое и разработчик тот же.'
    },
    he: {
      was: 'לשעבר ' + OLD_NAME,
      title: 'בקרוב נחליף שם משפחה.',
      body: 'במהדורה הבאה ' + OLD_NAME + ' ייקרא ' + NEW_NAME +
            ' — כמו כלה אחרי החתונה: שם חדש בתעודה, אותו אדם, אותו מספר תעודה. ' +
            'אין צורך לעשות דבר: האפליקציה תתעדכן מעצמה, וכל הנסיעות וההגדרות ' +
            'יישארו במקומן. רק השם משתנה — אותה אפליקציה ואותו מפתח.'
    }
  };

  function words() {
    var l = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
    return WORDS[l] || WORDS.en;
  }

  /* Шапка. Правится ТОЛЬКО элемент с id="brand"; нет его — страница без шапки. */
  function renameBrand() {
    if (!REBRAND) return;
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

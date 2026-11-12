// «Возможности VecturaBook» — PDF на 29 языках (задание German 12.11.2026).
// Файлы — features/VecturaBook-<язык>.pdf (собирает Клод Мак: tools/help/features_pdf.py, коды как у справки:
// he — иврит, no — норвежский). Названия языков — как в переключателе справки (tools/help/build_site.py NAMES).
// Язык по умолчанию = язык страницы (data-features-pdf). Без скрипта ссылка уже ведёт на язык страницы,
// скрипт только добавляет выбор остальных 28. Список — один, здесь; сторож site_check.py [4.3] берёт его отсюда.
(function () {
  var NAMES = {
    "en": "English", "ru": "Русский", "he": "עברית", "ar": "العربية", "bg": "Български", "cs": "Čeština", "da": "Dansk",
    "de": "Deutsch", "el": "Ελληνικά", "es": "Español", "et": "Eesti", "fi": "Suomi", "fr": "Français", "hr": "Hrvatski",
    "hu": "Magyar", "it": "Italiano", "lt": "Lietuvių", "lv": "Latviešu", "nl": "Nederlands", "no": "Norsk", "pl": "Polski",
    "pt": "Português", "ro": "Română", "sk": "Slovenčina", "sl": "Slovenščina", "sr": "Српски", "sv": "Svenska",
    "tr": "Türkçe", "uk": "Українська"
  };
  function file(lang) { return "features/VecturaBook-" + lang + ".pdf"; }
  function init() {
    var box = document.querySelector("[data-features-pdf]");
    if (!box) return;
    var page = box.getAttribute("data-features-pdf");
    var sel = box.querySelector("select");
    var link = box.querySelector("a[download]");
    if (!sel || !link || !NAMES[page]) return;
    if (!sel.options.length) {
      for (var code in NAMES) {
        var o = document.createElement("option");
        o.value = code;
        o.textContent = NAMES[code];
        o.lang = code;
        if (code === "he" || code === "ar") o.dir = "rtl";
        sel.appendChild(o);
      }
    }
    function set(lang) {
      sel.value = lang;
      link.setAttribute("href", file(lang));
      link.setAttribute("hreflang", lang);
    }
    sel.addEventListener("change", function () { set(sel.value); });
    // «Назад» в браузере возвращает выбор из памяти страницы — а язык по умолчанию всегда язык страницы
    // (тот же урок, что у вкладок ролика 27.10.2026).
    window.addEventListener("pageshow", function () { set(page); });
    set(page);
    sel.hidden = false;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

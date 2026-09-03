// ═══════════════════════════════════════════════════════════════════════
// GA4 для САЙТА CargoLog. ОДИН файл на все пять страниц — не копия в каждой.
// ═══════════════════════════════════════════════════════════════════════
//
// Поток веб-приложения «CargoLog Web» живёт в ТОМ ЖЕ проекте cargolog-28bdd,
// что и приложение (замер 03.09.2026: Firebase Management API и конфиг сайта
// дали один и тот же measurementId). Отдельный проект не заводился намеренно:
// иначе аудитории приложения и сайта разъехались бы навсегда.
//
// СОГЛАСИЯ САЙТ НЕ СПРАШИВАЕТ и cookie-баннера здесь нет — это осознанно:
// трафик анонимный, IP анонимизируется, рекламные сигналы выключены.
//
// Заходы админа не считаются: просмотр страницы уходит НЕ сразу, а после того
// как выяснится состояние входа. Иначе собственные визиты German попадали бы
// в отчёты и портили бы то, ради чего аналитика заводится.
(function () {
  var GA_ID = "G-1W3HBDDM7P";

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  (document.head || document.documentElement).appendChild(s);

  gtag("js", new Date());
  gtag("config", GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: false
  });

  var isAdmin = false, resolved = false, queue = [];

  function flush() {
    if (isAdmin) { queue.length = 0; return; }
    gtag("event", "page_view", {
      page_location: location.href,
      page_title: document.title
    });
    for (var i = 0; i < queue.length; i++) gtag("event", queue[i][0], queue[i][1]);
    queue.length = 0;
  }

  var GA = {
    markAdmin: function () { isAdmin = true; queue.length = 0; },
    ready: function () { if (resolved) return; resolved = true; flush(); },
    track: function (name, params) {
      if (isAdmin) return;
      if (!resolved) { queue.push([name, params || {}]); return; }
      gtag("event", name, params || {});
    }
  };
  window.CargoLogGA = GA;

  // Если signin.js не загрузился, состояние входа не выяснится никогда.
  // Через три секунды считаем гостем и шлём просмотр, иначе потеряли бы всё.
  setTimeout(function () { GA.ready(); }, 3000);

  // ── ради чего это заведено: три события ──────────────────────────────
  // Слушатель один, на документе: ссылки рисуются в том числе скриптом,
  // поэтому вешать на каждую по отдельности нельзя.
  document.addEventListener("click", function (e) {
    var el = e.target;
    var a = el && el.closest ? el.closest("a") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("play.google.com") >= 0) {
      GA.track("store_click", { store: "google_play" });
    } else if (href.indexOf("rustore.ru") >= 0) {
      GA.track("store_click", { store: "rustore" });
    } else if (href === "index.html" || href === "ru.html" || href === "he.html") {
      GA.track("language_switch", { to: href === "index.html" ? "en" : href.slice(0, 2) });
    } else if (href === "privacy.html" || href.indexOf("privacy.html") >= 0) {
      GA.track("policy_click", {});
    }
  }, true);

  // ── дошёл ли человек до сути ─────────────────────────────────────────
  // Ровно три события и больше НИКАКИХ: шум дороже пользы.
  document.addEventListener("DOMContentLoaded", function () {
    // 1. досмотр до Roadmap. Наблюдатель, а не скролл-обработчик: обработчик
    //    на каждый пиксель дороже и врёт на инерции.
    var rm = document.getElementById("roadmap");
    if (rm && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            GA.track("roadmap_seen", {});
            io.disconnect();
            return;
          }
        }
      }, { threshold: 0.3 });
      io.observe(rm);
    }

    // 2. открытие ролика. Внутрь чужого iframe заглянуть нельзя, поэтому
    //    ловим единственный доступный признак: окно потеряло фокус, а фокус
    //    оказался на самом кадре ролика. Это и есть нажатие «play».
    var seen = false;
    window.addEventListener("blur", function () {
      if (seen) return;
      var a = document.activeElement;
      if (a && a.tagName === "IFRAME" && (a.src || "").indexOf("youtube") >= 0) {
        seen = true;
        GA.track("video_open", {});
      }
    });
  });
})();

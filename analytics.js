// ═══════════════════════════════════════════════════════════════════════
// GA4 для САЙТА VecturaBook. ОДИН файл на все страницы — не копия в каждой.
// ═══════════════════════════════════════════════════════════════════════
//
// ⛔ РЕШЕНИЕ German 28.10.2026: сайты пишут в СВОЙ ресурс GA4, в ресурсе
// программы (cargolog-28bdd, 534432169) — только программа. Ресурс сайта —
// «vecturabook.com (сайт)», 561654276, тот же аккаунт German (заведён Admin API
// 30.10.2026); пустой GA_ID — сайт не шлёт НИЧЕГО (прежний общий поток
// G-1W3HBDDM7P больше не трогаем). Смена ID — замена ОДНОЙ строки ниже.
//
// Наши проверки сайта в аналитику не пишут: шлёт только боевой хост
// (не 127.0.0.1, не NAS, не file:), не браузер под управлением робота
// (navigator.webdriver), и не браузер, помеченный однажды адресом с ?noga=1
// (метка живёт в localStorage этого браузера: Chrome проверок, Safari
// симулятора — открыть любую страницу с ?noga=1 один раз).
//
// СОГЛАСИЯ САЙТ НЕ СПРАШИВАЕТ и cookie-баннера здесь нет — это осознанно:
// трафик анонимный, IP анонимизируется, рекламные сигналы выключены.
//
// Заходы админа не считаются: просмотр страницы уходит НЕ сразу, а после того
// как выяснится состояние входа. Иначе собственные визиты German попадали бы
// в отчёты и портили бы то, ради чего аналитика заводится.
(function () {
  var GA_ID = "G-7QCC1PSEZX"; // веб-поток ресурса сайта 561654276; пусто — сайт не шлёт ничего

  var GA_HOSTS = ["vecturabook.com", "www.vecturabook.com"];
  function ourCheck() {
    try {
      if (/[?&]noga=1\b/.test(location.search)) localStorage.setItem("vb_noga", "1");
      if (localStorage.getItem("vb_noga") === "1") return true;
    } catch (e) { /* без хранилища — по остальным признакам */ }
    return navigator.webdriver === true || GA_HOSTS.indexOf(location.hostname) < 0;
  }
  if (!GA_ID || ourCheck()) {
    // Без отправки: страницы зовут CargoLogGA как обычно, но ничего не уходит.
    window.CargoLogGA = { markAdmin: function () {}, ready: function () {}, track: function () {} };
    return;
  }

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
    } else if (href.indexOf("profi-nav.co.il") >= 0) {
      // Баннер партнёра: без этого события нечем ответить, работает он или зря стоит.
      GA.track("partner_click", { partner: "profi-nav" });
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

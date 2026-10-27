// Рекламный ролик наверху главной (задание German 27.10.2026).
// Файл лежит на самом сайте (video/promo-<язык>.mp4, 720p, звук трека German без перекодирования),
// вкладки — три языка ролика, по умолчанию язык страницы. Автозапуск беззвучный (со звуком
// браузеры не запускают), звук — кнопкой на видео. Ролик качается только после загрузки
// страницы, до того видна обложка; вне экрана беззвучный ролик стоит на паузе.
(function () {
  var LANGS = [
    { id: "ru", name: "Русский" },
    { id: "he", name: "עברית" },
    { id: "en", name: "English" }
  ];
  var TEXT = {
    ru: { on: "Включить звук", off: "Выключить звук", play: "Смотреть ролик", tabs: "Язык ролика" },
    he: { on: "הפעלת קול", off: "השתקת קול", play: "צפייה בסרטון", tabs: "שפת הסרטון" },
    en: { on: "Sound on", off: "Sound off", play: "Watch the video", tabs: "Video language" }
  };
  var ICON_MUTED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';

  function track(name, params) {
    if (window.CargoLogGA) window.CargoLogGA.track(name, params);
  }

  function init(box) {
    var page = box.getAttribute("data-promo");
    var t = TEXT[page] || TEXT.en;
    var video = box.querySelector("video");
    var frame = video.parentNode;
    var lang = page, started = false, userPaused = false, visible = true, switching = false;

    var tabs = box.querySelector(".promo-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", t.tabs);
    LANGS.forEach(function (l) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "promo-tab";
      b.setAttribute("role", "tab");
      b.setAttribute("lang", l.id);
      b.setAttribute("data-lang", l.id);
      b.setAttribute("aria-selected", String(l.id === lang));
      b.textContent = l.name;
      b.addEventListener("click", function () { choose(l.id); });
      tabs.appendChild(b);
    });

    var sound = document.createElement("button");
    sound.type = "button";
    sound.className = "promo-btn";
    frame.appendChild(sound);
    var play = document.createElement("button");
    play.type = "button";
    play.className = "promo-play";
    play.setAttribute("aria-label", t.play);
    play.innerHTML = ICON_PLAY;
    play.hidden = true;
    frame.appendChild(play);

    function paint() {
      sound.innerHTML = (video.muted ? ICON_MUTED : ICON_SOUND) + "<span>" + (video.muted ? t.on : t.off) + "</span>";
      sound.setAttribute("aria-pressed", String(!video.muted));
    }
    function src(id) { return "video/promo-" + id + ".mp4"; }
    function start() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { play.hidden = false; });
    }
    function load() {
      started = true;
      video.preload = "auto";
      video.src = src(lang);
      start();
    }

    function choose(id) {
      if (id === lang) return;
      var at = video.currentTime || 0, wasPlaying = started && !video.paused;
      lang = id;
      Array.prototype.forEach.call(tabs.children, function (b) {
        b.setAttribute("aria-selected", String(b.getAttribute("data-lang") === id));
      });
      video.poster = "video/promo-" + id + ".jpg";
      track("promo_language", { promo_lang: id, page_lang: page });
      if (!started) return;
      // Ролики на трёх языках идут кадр в кадр — продолжаем с того же места.
      switching = true;
      video.src = src(id);
      video.addEventListener("loadedmetadata", function once() {
        video.removeEventListener("loadedmetadata", once);
        switching = false;
        if (at > 0 && at < video.duration) video.currentTime = at;
        if (wasPlaying) start();
      });
    }

    sound.addEventListener("click", function () {
      video.muted = !video.muted;
      // Звук включили — даём и системные кнопки (перемотка, во весь экран).
      if (!video.muted) video.controls = true;
      userPaused = false;
      if (!started) load(); else if (video.paused) start();
      if (!video.muted) track("promo_sound_on", { promo_lang: lang, page_lang: page });
    });
    play.addEventListener("click", function () {
      userPaused = false;
      if (!started) load(); else start();
    });
    video.addEventListener("volumechange", paint);
    video.addEventListener("play", function () { play.hidden = true; });
    video.addEventListener("ended", function () { play.hidden = false; });
    video.addEventListener("pause", function () {
      // Пауза, поставленная не нами (системная кнопка), — воля человека: вне экрана не будим.
      if (visible && !switching && !video.ended) userPaused = true;
    });
    paint();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (!started || !video.muted) return;
        if (!visible && !video.paused) video.pause();
        else if (visible && video.paused && !userPaused && !video.ended) start();
      }, { threshold: 0.25 }).observe(frame);
    }

    // Экономия трафика в браузере — не качаем сами, ждём кнопки.
    var saveData = navigator.connection && navigator.connection.saveData;
    function begin() { if (saveData) play.hidden = false; else load(); }
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin);
  }

  function boot() {
    var boxes = document.querySelectorAll("[data-promo]");
    for (var i = 0; i < boxes.length; i++) init(boxes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

// Рекламный ролик наверху главной (задание German 27.10.2026).
// Файл лежит на самом сайте (video/promo-<язык>.mp4, 720p, звук трека German без перекодирования),
// язык ролика = язык страницы (data-promo), меняется только переключателем языка сайта: вкладок над
// видео нет (German 27.10.2026 — вкладка, выбранная на странице, возвращалась кнопкой «Назад» из
// памяти браузера, и на английской странице шёл ролик на иврите). Автозапуск беззвучный (со звуком
// браузеры не запускают), звук — кнопкой на видео. Ролик качается только после загрузки
// страницы, до того видна обложка; вне экрана беззвучный ролик стоит на паузе.
(function () {
  var TEXT = {
    ru: { on: "Включить звук", off: "Выключить звук", play: "Смотреть ролик" },
    he: { on: "הפעלת קול", off: "השתקת קול", play: "צפייה בסרטון" },
    en: { on: "Sound on", off: "Sound off", play: "Watch the video" }
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
    var started = false, userPaused = false, visible = true;

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
    function start() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { play.hidden = false; });
    }
    function load() {
      started = true;
      video.preload = "auto";
      video.src = "video/promo-" + page + ".mp4";
      start();
    }

    sound.addEventListener("click", function () {
      video.muted = !video.muted;
      // Звук включили — даём и системные кнопки (перемотка, во весь экран).
      if (!video.muted) video.controls = true;
      userPaused = false;
      if (!started) load(); else if (video.paused) start();
      if (!video.muted) track("promo_sound_on", { promo_lang: page });
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
      if (visible && !video.ended) userPaused = true;
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

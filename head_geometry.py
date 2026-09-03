# -*- coding: utf-8 -*-
"""Геометрия шапок: не налезают ли блоки друг на друга на узком экране.

Зовётся из site_check.py. Работает ТОЛЬКО с локальной копией (--local):
страницы грузятся в iframe того же origin, иначе координаты изнутри не достать.

ПОЧЕМУ НЕ ПО BOUNDING BOX. Flex не накладывает элементы, он их СЖИМАЕТ — боксы
не пересекаются, а текст вылезает за свой бокс, и глазом это видно как
наложение. Замер 04.09.2026: проверка по пересечению прямоугольников сказала
«чисто» на шапке, где «Signed in as <почта>» лежало поверх «CargoLog».
Поэтому меряем ПЕРЕПОЛНЕНИЕ содержимым (scrollWidth > clientWidth).

Вход админа НЕ нужен: вид залогиненного подделывается разметкой — ровно то,
что делает updateAdminUI (показать #user-badge, спрятать кнопку входа)."""
import http.server
import json
import os
import shutil
import socket
import subprocess
import tempfile
import threading

WIDTHS = [(320, "узкий"), (430, "широкий"), (1280, "десктоп")]
PAGES = ["index.html", "ru.html", "he.html", "privacy.html", "versions.html"]
EMAIL = "germormdev@gmail.com"

HARNESS = """<!doctype html>
<meta charset="utf-8"><title>geom</title><body>
<div id="frames" style="opacity:0;height:0;overflow:hidden"></div>
<script>
var PAGES = %PAGES%, WIDTHS = %WIDTHS%, EMAIL = '%EMAIL%';
var jobs = [], out = [];
PAGES.forEach(function (p) { WIDTHS.forEach(function (w) { jobs.push([p, w[0], w[1]]); }); });

function measure(doc, page) {
  var nav = doc.querySelector('nav') || doc.querySelector('header');
  if (!nav) return 'шапки нет';
  if (page.indexOf('versions') === 0) {
    var b = doc.getElementById('user-badge'), l = doc.getElementById('btn-google-signin');
    if (b) { b.classList.remove('hidden');
      b.innerHTML = '<span class="text-gray-600 text-sm mr-2">Signed in as <strong>'
        + EMAIL + '</strong></span><button class="text-orange-500 text-sm">Sign out</button>'; }
    if (l) l.classList.add('hidden');
  }
  var spill = [];
  (function scan(el, d) {
    if (d > 4) return;
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
      spill.push((el.id || el.tagName).toLowerCase());
    for (var i = 0; i < el.children.length; i++) scan(el.children[i], d + 1);
  })(nav, 0);
  var parts = [];
  if (spill.length) parts.push('текст вылезает за бокс: ' + spill.join(','));
  if (nav.scrollWidth > nav.clientWidth + 1) parts.push('шапка шире экрана');
  return parts.length ? parts.join('; ') : '';
}

function step(i) {
  if (i >= jobs.length) {
    fetch('/__report?d=' + encodeURIComponent(JSON.stringify(out)));
    return;
  }
  var j = jobs[i], f = document.createElement('iframe');
  f.style.cssText = 'width:' + j[1] + 'px;height:700px;border:0';
  f.src = j[0];
  f.onload = function () {
    var r;
    try { r = measure(f.contentDocument, j[0]); } catch (e) { r = 'ОШИБКА: ' + e.message; }
    out.push([j[0], j[2] + ' ' + j[1] + 'px', r]);
    step(i + 1);
  };
  document.getElementById('frames').appendChild(f);
}
step(0);
</script></body>
"""

_result = {"data": None}


class _H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.startswith("/__report"):
            from urllib.parse import unquote, urlparse, parse_qs
            q = parse_qs(urlparse(self.path).query)
            _result["data"] = json.loads(q.get("d", ["[]"])[0])
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
            return
        return http.server.SimpleHTTPRequestHandler.do_GET(self)


def find_chrome():
    for p in (r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
              "/usr/bin/google-chrome", "/usr/bin/chromium"):
        if p and os.path.isfile(p):
            return p
    return None


def run(local_dir):
    """Возвращает (строки, причина_пропуска). Строки: [страница, ширина, беда]."""
    chrome = find_chrome()
    if not chrome:
        return None, "Chrome не найден — геометрию снять нечем"

    tmp = tempfile.mkdtemp(prefix="cargolog-geom-")
    try:
        for n in os.listdir(local_dir):
            s = os.path.join(local_dir, n)
            if os.path.isfile(s) and (n.endswith(".html") or n.endswith(".js")
                                      or n.endswith(".png") or n.endswith(".ico")):
                shutil.copy2(s, os.path.join(tmp, n))
        h = (HARNESS.replace("%PAGES%", json.dumps(PAGES))
                    .replace("%WIDTHS%", json.dumps([[w, n] for w, n in WIDTHS]))
                    .replace("%EMAIL%", EMAIL))
        with open(os.path.join(tmp, "__geom.html"), "w", encoding="utf-8") as f:
            f.write(h)

        s = socket.socket()
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
        s.close()

        os.chdir(tmp)
        srv = http.server.HTTPServer(("127.0.0.1", port), _H)
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()

        # Браузер держим ЖИВЫМ и ждём ответа, а не полагаемся на --screenshot:
        # по снимку Chrome выходит на событии load, когда iframe'ы ещё считают,
        # и замер не успевает уйти (обожглись 04.09.2026). Виртуальное время
        # тут тоже не помощник — оно гонит таймеры, а не сеть.
        prof = os.path.join(tmp, "prof")
        proc = subprocess.Popen(
            [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
             "--no-default-browser-check", "--user-data-dir=" + prof,
             "--window-size=900,600",
             "http://127.0.0.1:%d/__geom.html" % port],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import time
        for _ in range(120):                     # до 30 секунд настоящего времени
            if _result["data"] is not None:
                break
            time.sleep(0.25)
        try:
            proc.kill()
        except Exception:
            pass
        srv.shutdown()
        if _result["data"] is None:
            return None, "браузер не вернул замер (сеть или время вышло)"
        return _result["data"], None
    finally:
        pass

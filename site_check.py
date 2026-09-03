# -*- coding: utf-8 -*-
"""СТОРОЖ ВИТРИНЫ CargoLog. Только читает, ничего не правит.

Гонять ПОСЛЕ каждой ручной вставки в админку и ПЕРЕД любой правкой витрины.

    python site_check.py                 # боевой сайт + Firestore
    python site_check.py --local .       # страницы из папки (перед пушем)
    python site_check.py --no-firestore  # без обращения к Firestore

Выход 0 — всё зелено, 2 — есть красное. Каждая проверка печатает СВОЮ строку:
молчание при беде выглядит как молчание при чистоте, поэтому строки печатаются
всегда, и зелёные тоже.

ПРЕДЕЛ, названный вслух: пустоту, которая возникает в браузере из Firestore,
статическим разбором не поймать. Сторож ловит её с другой стороны — проверяет
сами данные (история версий) и разметку (заголовок без содержимого). Третий
класс дефекта — пустой массив, затирающий контейнер, — закрыт в signin.js
проверкой на length, а не здесь.
"""
import io, json, os, re, sys, urllib.request
from html.parser import HTMLParser

BASE_URL = "https://germormdev.github.io/"
PAGES = ["index.html", "ru.html", "he.html", "privacy.html", "versions.html"]
LANG_PAGES = ["index.html", "ru.html", "he.html"]
VIDEO = "Bth3gelqPeg"
FS = ("https://firestore.googleapis.com/v1/projects/cargolog-28bdd"
      "/databases/(default)/documents/version_history?pageSize=300&key="
      "AIzaSyBgS40KxwWoSn3vcL_k-m9C__qpIciS3nI")
RELEASED = ["2.0.0", "2.0.1", "2.1.0", "2.1.1", "2.1.2", "2.1.3", "2.2.0", "2.3.0"]

# Обещания, которых на витрине быть НЕ ДОЛЖНО. Ключ — что именно нарушено.
FORBIDDEN = [
    ("no cloud", "обещание «без облака»"),
    ("без облака", "обещание «без облака»"),
    ("בלי ענן", "обещание «без облака»"),
    ("never leaves your phone", "«данные не покидают телефон»"),
    ("не покидают телефон", "«данные не покидают телефон»"),
    ("לא עוזבים את הטלפון", "«данные не покидают телефон»"),
    ("not uploaded to our servers", "«не уходит на наши серверы»"),
    ("не загружаются на наши серверы", "«не уходит на наши серверы»"),
    ("אינם מועלים לשרתים שלנו", "«не уходит на наши серверы»"),
]

LOCAL = None
if "--local" in sys.argv:
    LOCAL = sys.argv[sys.argv.index("--local") + 1]
NO_FS = "--no-firestore" in sys.argv

RED = []


def say(ok, line):
    print(("  OK   " if ok else "  КРАСНОЕ ") + line)
    if not ok:
        RED.append(line)


def fetch(page):
    if LOCAL:
        p = os.path.join(LOCAL, page)
        if not os.path.isfile(p):
            return None
        return io.open(p, encoding="utf-8", errors="replace").read()
    try:
        req = urllib.request.Request(BASE_URL + page,
                                     headers={"User-Agent": "cargolog-site-check"})
        return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    except Exception as e:
        return None


class Doc(HTMLParser):
    """Собирает мета, ссылки, iframe и — для проверки пустых разделов —
    последовательность заголовков с текстом, идущим после каждого."""

    HEADS = ("h1", "h2", "h3", "h4")
    SKIP = ("script", "style")

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.links, self.iframes = {}, [], []
        self.alts = []
        self.stack = []
        self.skip = 0
        self.heads = []          # [(tag, текст заголовка, набранный после текст)]
        self.text = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag in self.SKIP:
            self.skip += 1
        elif tag == "meta":
            k = d.get("property") or d.get("name")
            if k == "og:locale:alternate":
                self.alts.append(d.get("content", ""))
            elif k:
                self.meta[k] = d.get("content", "")
        elif tag == "link":
            self.links.append((d.get("rel", ""), d.get("href", "")))
        elif tag == "iframe":
            self.iframes.append(d.get("src", ""))
        elif tag in self.HEADS:
            self.heads.append([tag, "", ""])
            self.stack.append("head")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        elif tag in self.HEADS and self.stack and self.stack[-1] == "head":
            self.stack.pop()

    def handle_data(self, data):
        if self.skip:
            return
        s = data.strip()
        if not s:
            return
        if self.stack and self.stack[-1] == "head" and self.heads:
            self.heads[-1][1] += s
        elif self.heads:
            self.heads[-1][2] += s + " "
        self.text.append(s)

    def visible(self):
        """Видимый текст: без script/style и БЕЗ КОММЕНТАТИВ разметки.
        Проверять сырой HTML нельзя — русские комментарии в коде содержат
        слово «без облака», и сторож краснел на собственных пояснениях."""
        return " ".join(self.text)

    def empty_heads(self):
        """Заголовок пуст, только если до следующего заголовка ТОГО ЖЕ ИЛИ
        ВЫШЕ уровня нет ни текста, ни вложенного подзаголовка. Раздел, чьё
        содержимое — карточки со своими h4, пустым НЕ считается."""
        lvl = lambda t: int(t[1])
        out = []
        for i, (tag, title, tail) in enumerate(self.heads):
            if not title:
                continue
            if tail.strip():
                continue
            has_sub = False
            for tag2, _t2, _x2 in self.heads[i + 1:]:
                if lvl(tag2) <= lvl(tag):
                    break
                has_sub = True
                break
            if not has_sub:
                out.append(title[:42])
        return out


def parse(html):
    d = Doc()
    d.feed(html)
    return d


print("=" * 74)
print("СТОРОЖ ВИТРИНЫ — источник: %s" % (("папка " + LOCAL) if LOCAL else BASE_URL))
print("=" * 74)

docs, RAW = {}, {}
print("\n[1] страницы доступны")
for p in PAGES:
    h = fetch(p)
    RAW[p] = h          # сырой текст нужен проверкам РАЗМЕТКИ (счётчик, gtag)
    docs[p] = parse(h) if h else None
    say(h is not None, "%s %s" % (p, "получена" if h else "НЕ ПОЛУЧЕНА"))

print("\n[2] og и canonical на всех пяти страницах")
for p in PAGES:
    d = docs.get(p)
    if not d:
        say(False, "%s — страницы нет, проверить нечем" % p)
        continue
    need = ["og:title", "og:description", "og:image", "og:url", "og:locale"]
    miss = [k for k in need if k not in d.meta]
    canon = [h for r, h in d.links if r == "canonical"]
    desc = d.meta.get("description", "")
    ok = not miss and len(canon) == 1 and bool(desc)
    say(ok, "%s og:%s canonical:%d description:%d зн."
        % (p, ("все" if not miss else "НЕТ " + ",".join(miss)), len(canon), len(desc)))

print("\n[3] og:locale:alternate — обе чужие локали на языковых страницах")
EXP = {"index.html": {"ru_RU", "he_IL"}, "ru.html": {"en_US", "he_IL"},
       "he.html": {"en_US", "ru_RU"}}
for p, need in EXP.items():
    d = docs.get(p)
    got = set(d.alts) if d else set()
    say(got == need, "%s alternate: %s" % (p, ",".join(sorted(got)) or "НЕТ"))

print("\n[4] ролик %s жив на трёх языках" % VIDEO)
for p in LANG_PAGES:
    d = docs.get(p)
    hits = [s for s in (d.iframes if d else []) if VIDEO in s]
    ok = len(hits) == 1 and all("youtube-nocookie" in s for s in hits)
    say(ok, "%s iframe с роликом: %d%s"
        % (p, len(hits), "" if ok else "  <- ролик пропал или не nocookie"))

print("\n[5] нет обещаний, что данные или местоположение не уходят")
for p in PAGES:
    d = docs.get(p)
    if not d:
        continue
    low = d.visible().lower()
    found = sorted({why for w, why in FORBIDDEN if w.lower() in low})
    say(not found, "%s %s" % (p, "чисто" if not found else "ВЕРНУЛОСЬ: " + "; ".join(found)))

print("\n[6] ни одного заголовка без содержимого")
for p in PAGES:
    d = docs.get(p)
    if not d:
        continue
    empty = d.empty_heads()
    say(not empty, "%s пустых заголовков: %d%s"
        % (p, len(empty), "" if not empty else "  -> " + " | ".join(empty)))

print("\n[7] счётчика посещений на витрине НЕТ ни на одном языке")
COUNTER_MARKS = ["visit-counter", "admin-visit-stats"]
COUNTER_WORDS = ["visits", "посещен", "ביקורים"]
for p in LANG_PAGES:
    raw = RAW.get(p)
    d = docs.get(p)
    if raw is None or d is None:
        say(False, "%s — страницы нет, проверить нечем" % p)
        continue
    marks = [m for m in COUNTER_MARKS if m in raw]
    words = [w for w in COUNTER_WORDS if w in d.visible().lower()]
    ok = not marks and not words
    say(ok, "%s разметка: %s, подписи: %s"
        % (p, ",".join(marks) or "нет", ",".join(words) or "нет"))

print("\n[8] абзац про аналитику стоит в политике на ВСЕХ трёх языках")
POLICY_MARKS = [("en", "Google Analytics to count visits"),
                ("ru", "чтобы считать посещения"),
                ("he", "כדי לספור ביקורים")]
praw = RAW.get("privacy.html")
if praw is None:
    say(False, "privacy.html не получена")
else:
    miss = [lang for lang, m in POLICY_MARKS if praw.count(m) != 1]
    say(not miss, "языков с абзацем: %d из 3%s"
        % (3 - len(miss), "" if not miss else "  НЕТ: " + ", ".join(miss)))

print("\n[9] шапки не наезжают сами на себя на узком экране")
if not LOCAL:
    say(True, "ПРОПУЩЕНО: геометрию можно снять только с --local (нужен один origin "
              "для iframe). Это не зелёное, это «не проверялось».")
else:
    import head_geometry
    _here = os.path.abspath(LOCAL)
    _cwd = os.getcwd()
    try:
        rows, why = head_geometry.run(_here)
    finally:
        os.chdir(_cwd)
    if rows is None:
        say(True, "ПРОПУЩЕНО: %s. Это не зелёное, это «не проверялось»." % why)
    else:
        bad = [r for r in rows if r[2]]
        say(not bad, "проверено %d сочетаний страница×ширина, с бедой: %d"
            % (len(rows), len(bad)))
        for page, width, trouble in bad:
            say(False, "   %s @ %s — %s" % (page, width, trouble))

print("\n[10] gtag подключён на всех пяти страницах и РОВНО ОДИН раз")
for p in PAGES:
    raw = RAW.get(p)
    if raw is None:
        say(False, "%s — страницы нет" % p)
        continue
    n_tag = raw.count('src="analytics.js"')
    n_inline = raw.count("googletagmanager.com/gtag/js")
    ok = n_tag == 1 and n_inline == 0
    say(ok, "%s analytics.js: %d, встроенных копий gtag: %d%s"
        % (p, n_tag, n_inline, "" if ok else "  <- должно быть 1 и 0"))

if NO_FS:
    print("\n[11-12] Firestore пропущен по флагу --no-firestore")
else:
    print("\n[11] история версий: восемь выпущенных на месте, номера целы, языки полные")
    try:
        raw = urllib.request.urlopen(FS, timeout=30).read().decode()
        vh = json.loads(raw).get("documents", [])
    except Exception as e:
        vh = None
        say(False, "Firestore недоступен: %s" % str(e)[:70])
    if vh is not None:
        site = {}
        broken = []
        SEM = re.compile(r"^\d+\.\d+\.\d+$")
        LEG = re.compile(r"^v?\d+\.\d+(\.\d+)?$")
        for doc in vh:
            f = doc.get("fields", {})
            v = (f.get("version", {}).get("stringValue") or "").strip()
            loc = (f.get("locale", {}).get("stringValue") or "").strip()
            site.setdefault(v, set()).add(loc)
            if not SEM.match(v) and not LEG.match(v):
                broken.append(v)
        miss = [v for v in RELEASED if v not in site]
        say(not miss, "выпущенных версий на сайте: %d из %d%s"
            % (len(RELEASED) - len(miss), len(RELEASED),
               "" if not miss else "  НЕТ: " + ", ".join(miss)))
        say(not broken, "битых номеров: %d%s"
            % (len(broken), "" if not broken else "  -> " + ", ".join(sorted(set(broken)))))
        lack = ["%s(%s)" % (v, ",".join(sorted({"en", "ru", "he"} - site[v])))
                for v in RELEASED if v in site and {"en", "ru", "he"} - site[v]]
        say(not lack, "неполный набор языков: %d%s"
            % (len(lack), "" if not lack else "  -> " + ", ".join(lack)))

        print("\n[12] «What's New» не пуст — свежая версия есть на всех трёх языках")
        newest = RELEASED[-1]
        have = site.get(newest, set())
        say({"en", "ru", "he"} <= have,
            "%s: языки %s" % (newest, ",".join(sorted(have)) or "НЕТ НИ ОДНОГО"))

print("\n" + "=" * 74)
if RED:
    print("КРАСНОЕ: %d" % len(RED))
    for r in RED:
        print("   - %s" % r)
    sys.exit(2)
print("ВСЁ ЗЕЛЕНО")
sys.exit(0)

# -*- coding: utf-8 -*-
"""СТОРОЖ ВИТРИНЫ VecturaBook. Только читает, ничего не правит.

Гонять ПОСЛЕ каждой ручной вставки в админку и ПЕРЕД любой правкой витрины.

    python site_check.py                 # боевой сайт + Firestore
    python site_check.py --local .       # страницы из папки (перед пушем)
    python site_check.py --no-firestore  # без обращения к Firestore
    python site_check.py --fs-json F     # история версий из снимка (зубы в bite_site_check.py)
    python site_check.py --released F    # список выпущенного не из дерева CargoLog
    python site_check.py --not-released F  # список не выходивших версий не из этой папки

Номера версий берутся из published_version_names.txt дерева CargoLog (его
дописывает каждый выпуск) — зашитый список молча кончился на 2.3.0 (14.09.2026).
⛔ Номер — ещё не выпуск: отклонённые и пропущенные версии названы в
not_released_versions.txt с причиной, и записи для них сторож не требует.

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

BASE_URL = "https://vecturabook.com/"
PAGES = ["index.html", "ru.html", "he.html", "privacy.html", "versions.html"]
LANG_PAGES = ["index.html", "ru.html", "he.html"]
VIDEO = "Bth3gelqPeg"
FS = ("https://firestore.googleapis.com/v1/projects/cargolog-28bdd"
      "/databases/(default)/documents/version_history?pageSize=300&key="
      "AIzaSyBgS40KxwWoSn3vcL_k-m9C__qpIciS3nI")
#: Нижняя граница: эти выпуски были на сайте всегда. Всё новее читается из дерева CargoLog.
FLOOR = ["2.0.0", "2.0.1", "2.1.0", "2.1.1", "2.1.2", "2.1.3", "2.2.0", "2.3.0"]
LANGS = ("en", "ru", "he")
#: Последний выпуск под именем CargoLog; прежние записи истории не переписываются.
RENAMED_AFTER = "2.4.2"
NEW_NAME = "VecturaBook"


def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


def version_key(v):
    return tuple(int(x) for x in v.split("."))


def released_versions():
    """(версии по возрастанию, откуда взяты или None, если список не прочитан)."""
    tree = os.environ.get("CARGOLOG_TREE", "F:/Bortovok")
    path = arg("--released") or os.path.join(tree, "published_version_names.txt")
    try:
        lines = io.open(path, encoding="utf-8").read().splitlines()
    except OSError:
        return sorted(FLOOR, key=version_key), None
    named = {l.strip() for l in lines if re.match(r"^\d+\.\d+\.\d+$", l.strip())}
    newer = {v for v in named if version_key(v) >= version_key(FLOOR[0])}
    return sorted(set(FLOOR) | newer, key=version_key), path


def not_released():
    """({версия: причина}, битые строки, откуда или None). Номер есть, версия людям не выходила."""
    path = arg("--not-released") or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                  "not_released_versions.txt")
    try:
        lines = io.open(path, encoding="utf-8").read().splitlines()
    except OSError:
        return {}, [], None
    found, broken = {}, []
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        version, _, why = line.partition("\t")
        if not re.match(r"^\d+\.\d+\.\d+$", version.strip()) or not why.strip():
            broken.append(line.strip()[:40])
        else:
            found[version.strip()] = why.strip()
    return found, broken, path


NUMBERED, RELEASED_FROM = released_versions()
NOT_RELEASED, NOT_RELEASED_BROKEN, NOT_RELEASED_FROM = not_released()
# Выпущенное = пронумерованное минус не выходившее: разрыв в ряду номеров законен.
RELEASED = [v for v in NUMBERED if v not in NOT_RELEASED]

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


class Cut(HTMLParser):
    """Режет документ на куски по заголовкам и считает в каждом блочные узлы.

    Если заданы языковые секции (<section class="lang" id=...>), куски и текст копятся
    ВНУТРИ своей секции: политика — один файл на три языка, и счёт по файлу не видел,
    что абзац лежит не в своём языке (German нашёл глазами 13.09.2026).
    """

    COUNTED = ("p", "li", "div", "a", "img", "iframe", "h3")

    def __init__(self, heads, by_section):
        super().__init__(convert_charrefs=True)
        self.heads, self.by_section = heads, by_section
        self.sec, self.depth = (None if by_section else "page"), 0
        self.parts = {} if by_section else {"page": []}
        self.texts = {} if by_section else {"page": []}
        self.cur, self.level, self.buf = None, None, ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.by_section and tag == "section":
            if "lang" in (a.get("class") or "").split() and self.sec is None:
                self.sec, self.depth = a.get("id"), 1
                self.parts[self.sec], self.texts[self.sec], self.cur = [], [], None
            elif self.sec is not None:
                self.depth += 1
            return
        if self.sec is None:
            return
        if tag in self.heads:
            self.level, self.buf = tag, ""
        elif self.cur is not None and tag in self.COUNTED:
            self.cur[tag] += 1

    def handle_startendtag(self, tag, attrs):
        if self.sec is not None and self.cur is not None and tag in self.COUNTED:
            self.cur[tag] += 1

    def handle_endtag(self, tag):
        if self.by_section and tag == "section" and self.sec is not None:
            self.depth -= 1
            if self.depth == 0:
                self.sec, self.cur = None, None
            return
        if self.sec is not None and tag == self.level:
            self.cur = {t: 0 for t in self.COUNTED}
            self.parts[self.sec].append((" ".join(self.buf.split()), self.cur))
            self.level = None

    def handle_data(self, data):
        if self.sec is None:
            return
        if self.level:
            self.buf += data
        self.texts[self.sec].append(data)


def cut(html, heads, by_section):
    c = Cut(heads, by_section)
    c.feed(html)
    return c


def shape(parts):
    """Форма куска без слов: число разделов и узлы в каждом. Слова у языков разные, форма — одна."""
    return [tuple(sorted(counts.items())) for _title, counts in parts]


def first_mismatch(shapes):
    """(номер раздела с 1, {язык: счёт}) первого расхождения формы или None."""
    langs = list(shapes)
    if len({len(shapes[l]) for l in langs}) > 1:
        return 0, {l: len(shapes[l]) for l in langs}
    for i in range(len(shapes[langs[0]])):
        if len({shapes[l][i] for l in langs}) > 1:
            return i + 1, {l: dict(shapes[l][i]) for l in langs}
    return None


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

print("\n[5.1] мёртвых адресов нет: сайт на vecturabook.com, телеграм t.me/VecturaBook (15.09.2026)")
DEAD_ADDRESSES = ["germormdev.github.io", "TripLog_app"]
for p in PAGES:
    raw = RAW.get(p)
    if raw is None:
        continue
    found = [a for a in DEAD_ADDRESSES if a.lower() in raw.lower()]
    say(not found, "%s %s" % (p, "чисто" if not found else "МЁРТВЫЙ АДРЕС: " + ", ".join(found)))

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
    # ⛔ ПО СЕКЦИЯМ, А НЕ ПО ФАЙЛУ: ровно на счёте по файлу все три перевода однажды
    # лежали в английской секции, а сторож отвечал «3 из 3».
    secs = {s: " ".join(" ".join(t).split()) for s, t in cut(praw, ("h2",), True).texts.items()}
    miss = [lang for lang, m in POLICY_MARKS if secs.get(lang, "").count(m) != 1]
    stray = ["%s в секции %s" % (lang, s) for lang, m in POLICY_MARKS for s in secs if s != lang and m in secs[s]]
    say(not miss and not stray, "языков с абзацем в СВОЕЙ секции: %d из 3%s%s"
        % (3 - len(miss), "" if not miss else "  НЕТ: " + ", ".join(miss),
           "" if not stray else "  ЧУЖОЕ МЕСТО: " + ", ".join(stray)))

print("\n[8.1] политика: языковые секции одной формы — разделы и узлы в каждом")
if praw is None:
    say(False, "privacy.html не получена")
else:
    parts = cut(praw, ("h2",), True).parts
    missing = [l for l in LANGS if l not in parts]
    if missing:
        say(False, "нет языковых секций: %s" % ", ".join(missing))
    else:
        bad = first_mismatch({l: shape(parts[l]) for l in LANGS})
        say(bad is None, "разделов: %s%s" % (
            " · ".join("%s=%d" % (l, len(parts[l])) for l in LANGS),
            "" if bad is None else "  РАЗЪЕХАЛОСЬ в разделе %d: %s" % bad))

print("\n[8.2] языковые страницы одной формы — разделы и узлы в каждом")
page_parts = {}
for lang, p in zip(LANGS, LANG_PAGES):
    raw = RAW.get(p)
    if raw is not None:
        page_parts[lang] = cut(raw, ("h1", "h2"), False).parts["page"]
if len(page_parts) < 3:
    say(False, "языковых страниц получено %d из 3" % len(page_parts))
else:
    bad = first_mismatch({l: shape(page_parts[l]) for l in LANGS})
    say(bad is None, "разделов: %s%s" % (
        " · ".join("%s=%d" % (l, len(page_parts[l])) for l in LANGS),
        "" if bad is None else "  РАЗЪЕХАЛОСЬ в разделе %d: %s" % bad))

print("\n[9] шапки не наезжают сами на себя на узком экране")
if not LOCAL:
    say(True, "ПРОПУЩЕНО: геометрию можно снять только с --local (нужен один origin "
              "для iframe). Это не зелёное, это «не проверялось».")
elif "--no-geometry" in sys.argv:
    say(True, "ПРОПУЩЕНО по флагу --no-geometry (зубы разметки). Это не зелёное, это «не проверялось».")
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
    print("\n[11] история версий: все выпущенные на месте, номера целы, языки полные")
    say(RELEASED_FROM is not None,
        "список выпущенного: %s — %d версий, свежая %s" % (RELEASED_FROM, len(RELEASED), RELEASED[-1])
        if RELEASED_FROM else "список выпущенного НЕ ПРОЧИТАН (published_version_names.txt дерева "
        "CargoLog или --released) — версии новее %s сторож не видит" % FLOOR[-1])
    say(NOT_RELEASED_FROM is not None and not NOT_RELEASED_BROKEN,
        "не выходившие версии: %s — %s%s" % (
            NOT_RELEASED_FROM, ", ".join(sorted(NOT_RELEASED, key=version_key)) or "нет",
            "" if not NOT_RELEASED_BROKEN else "  СТРОКИ БЕЗ ВЕРСИИ ИЛИ ПРИЧИНЫ: " + "; ".join(NOT_RELEASED_BROKEN))
        if NOT_RELEASED_FROM else "список не выходивших версий НЕ ПРОЧИТАН (not_released_versions.txt)")
    snapshot = arg("--fs-json")
    try:
        if snapshot:
            vh = json.loads(io.open(snapshot, encoding="utf-8").read()).get("documents", [])
        else:
            vh, token = [], ""
            while True:
                page = json.loads(urllib.request.urlopen(
                    FS + ("&pageToken=" + token if token else ""), timeout=30).read().decode())
                vh += page.get("documents", [])
                token = page.get("nextPageToken", "")
                if not token:
                    break
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
        ghost = sorted((v for v in NOT_RELEASED if v in site), key=version_key)
        say(not ghost, "записей о не выходивших версиях: %d%s"
            % (len(ghost), "" if not ghost else "  -> " + ", ".join(ghost)))
        say(not broken, "битых номеров: %d%s"
            % (len(broken), "" if not broken else "  -> " + ", ".join(sorted(set(broken)))))
        lack = ["%s(%s)" % (v, ",".join(sorted({"en", "ru", "he"} - site[v])))
                for v in RELEASED if v in site and {"en", "ru", "he"} - site[v]]
        say(not lack, "неполный набор языков: %d%s"
            % (len(lack), "" if not lack else "  -> " + ", ".join(lack)))

        print("\n[11.1] записи после переименования начинаются именем %s" % NEW_NAME)
        # Анонс в Телеграм публикует поле changes как есть — старое имя в новой записи уйдёт людям.
        late = []
        for doc in vh:
            f = doc.get("fields", {})
            v = (f.get("version", {}).get("stringValue") or "").strip()
            if SEM.match(v) and version_key(v) > version_key(RENAMED_AFTER):
                head = (f.get("changes", {}).get("stringValue") or "").lstrip()
                if not head.startswith(NEW_NAME):
                    late.append("%s(%s): %s" % (v, (f.get("locale", {}).get("stringValue") or "?"),
                                                head.split("\n")[0][:40]))
        say(not late, "записей новее %s не с %s: %d%s"
            % (RENAMED_AFTER, NEW_NAME, len(late), "" if not late else "  -> " + "; ".join(sorted(late))))

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

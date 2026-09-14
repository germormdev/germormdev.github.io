# -*- coding: utf-8 -*-
"""ЗУБЫ СТОРОЖА ВИТРИНЫ (14.09.2026). Сторож не знал версий после 2.3.0 и считал абзацы
политики по файлу, а не по языковой секции — оба раза зелёный при живом дефекте.

Каждый укус портит КОПИЮ (страницы во временной папке, снимок истории версий в файле) и
обязан покраснить свою строку сторожа. Боевой сайт и Firestore не трогаются.

    python bite_site_check.py [--fs-json снимок.json]   (без флага снимок снимается с Firestore)

Выход 0 — все зубы кусают, 2 — нет.
"""
import copy
import re
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = ("index.html", "ru.html", "he.html", "privacy.html", "versions.html", "brand.js", "analytics.js")


def fs_snapshot():
    if "--fs-json" in sys.argv:
        path = sys.argv[sys.argv.index("--fs-json") + 1]
        return json.loads(io.open(path, encoding="utf-8").read())
    # Адрес — из самого сторожа: вторая копия адреса однажды разошлась бы с ним.
    src = io.open(os.path.join(HERE, "site_check.py"), encoding="utf-8").read()
    url = "".join(re.findall(r'"([^"]*)"', re.search(r"FS = \((.*?)\)\n", src, re.S).group(1)))
    return json.loads(urllib.request.urlopen(url, timeout=30).read().decode())


def doc(version, locale, changes):
    return {"fields": {"version": {"stringValue": version}, "locale": {"stringValue": locale},
                       "changes": {"stringValue": changes}}}


def run_check(site, snap, released):
    work = tempfile.mkdtemp(prefix="bite-site-")
    snap_path = os.path.join(work, "fs.json")
    io.open(snap_path, "w", encoding="utf-8").write(json.dumps(snap, ensure_ascii=False))
    out = subprocess.run([sys.executable, os.path.join(HERE, "site_check.py"), "--local", site,
                          "--no-geometry", "--fs-json", snap_path, "--released", released],
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         env=dict(os.environ, PYTHONIOENCODING="utf-8"))
    shutil.rmtree(work, ignore_errors=True)
    text = out.stdout.decode("utf-8", "replace")
    red = [l.strip()[len("КРАСНОЕ"):].strip() for l in text.splitlines() if l.strip().startswith("КРАСНОЕ ")]
    return out.returncode, red


def copy_site():
    site = tempfile.mkdtemp(prefix="bite-site-pages-")
    for name in PAGES:
        shutil.copy2(os.path.join(HERE, name), site)
    return site


def edit(site, name, old, new):
    path = os.path.join(site, name)
    text = io.open(path, encoding="utf-8", newline="").read()
    if text.count(old) != 1:
        return False
    io.open(path, "w", encoding="utf-8", newline="").write(text.replace(old, new))
    return True


def section_of(text, lang):
    start = text.index('<section class="lang' + (' active"' if lang == "en" else '"') + ' id="%s"' % lang)
    return start, text.index("</section>", start)


def main():
    live = fs_snapshot()
    versions = {d["fields"]["version"]["stringValue"] for d in live.get("documents", [])}
    work = tempfile.mkdtemp(prefix="bite-site-list-")
    released = os.path.join(work, "published_version_names.txt")
    # Список выпущенного стенда — ровно то, что лежит в снимке: зубы меряют сторожа, а не живой пропуск.
    listed = sorted((v for v in versions if v[:1].isdigit() and v.count(".") == 2),
                    key=lambda v: tuple(int(x) for x in v.split(".")))
    io.open(released, "w", encoding="utf-8").write("\n".join(listed) + "\n")
    newest = listed[-1]
    verdicts = []

    def judge(name, code, red, expect):
        hit = [r for r in red if expect in r]
        ok = code == 2 and bool(hit)
        verdicts.append(ok)
        print(("  OK     | " if ok else "  ПРОВАЛ | ") + "укус «%s» красит «%s»" % (name, expect)
              + ("" if ok else " — код %d, красное: %s" % (code, red or "нет")))

    site = copy_site()
    code, red = run_check(site, live, released)
    control = code == 0 and not red
    verdicts.append(control)
    print(("  OK     | " if control else "  ПРОВАЛ | ") + "контроль: нетронутые копии ЗЕЛЁНЫЕ"
          + ("" if control else " — %s" % red))
    if not control:
        print("ИТОГ: контроль не зелёный — укусы не ставлю")
        return 2

    # A. запись одного языка свежей версии пропала
    snap = copy.deepcopy(live)
    snap["documents"] = [d for d in snap["documents"] if not (
        d["fields"]["version"]["stringValue"] == newest and d["fields"]["locale"]["stringValue"] == "ru")]
    judge("A. нет ru-записи %s" % newest, *run_check(site, snap, released), "неполный набор языков")

    # B. выпущенная версия пропала целиком
    older = listed[-2]
    snap = copy.deepcopy(live)
    snap["documents"] = [d for d in snap["documents"] if d["fields"]["version"]["stringValue"] != older]
    judge("B. нет версии %s" % older, *run_check(site, snap, released), "НЕТ: " + older)

    # C. выпуск новее 2.3.0, которого сторож прежде не знал: в списке есть, на сайте нет
    fresh = os.path.join(work, "published-plus.txt")
    io.open(fresh, "w", encoding="utf-8").write("\n".join(listed + ["9.9.9"]) + "\n")
    judge("C. выпущена 9.9.9, на сайте её нет", *run_check(site, live, fresh), "НЕТ: 9.9.9")

    # D. новая запись со старым именем
    snap = copy.deepcopy(live)
    snap["documents"].append(doc("9.9.9", "ru", "CargoLog 9.9.9 — стенд"))
    judge("D. запись 9.9.9 начинается CargoLog", *run_check(site, snap, released), "не с VecturaBook: 1")

    # E. абзац про аналитику по-русски уехал в английскую секцию
    site_e = copy_site()
    text = io.open(os.path.join(site_e, "privacy.html"), encoding="utf-8", newline="").read()
    mark = "чтобы считать посещения"
    ru_start, ru_end = section_of(text, "ru")
    p_start = text.rindex("<p>", 0, text.index(mark, ru_start))
    p_end = text.index("</p>", p_start) + 4
    para = text[p_start:p_end]
    moved = text[:p_start] + text[p_end:]
    en_start, en_end = section_of(moved, "en")
    moved = moved[:en_end] + para + "\n" + moved[en_end:]
    io.open(os.path.join(site_e, "privacy.html"), "w", encoding="utf-8", newline="").write(moved)
    judge("E. ru-абзац аналитики в секции en", *run_check(site_e, live, released), "ЧУЖОЕ МЕСТО")

    # F. в русской секции политики пропал один пункт списка
    site_f = copy_site()
    text = io.open(os.path.join(site_f, "privacy.html"), encoding="utf-8", newline="").read()
    ru_start, ru_end = section_of(text, "ru")
    li = text.index("<li>", ru_start)
    cut_to = text.index("</li>", li) + 5
    io.open(os.path.join(site_f, "privacy.html"), "w", encoding="utf-8", newline="").write(text[:li] + text[cut_to:])
    judge("F. в ru-секции политики нет пункта", *run_check(site_f, live, released), "РАЗЪЕХАЛОСЬ в разделе")

    # G. на русской странице пропал абзац
    site_g = copy_site()
    text = io.open(os.path.join(site_g, "ru.html"), encoding="utf-8", newline="").read()
    h2 = text.index("<h2")
    p = re.compile(r"<p[ >]").search(text, h2).start()
    io.open(os.path.join(site_g, "ru.html"), "w", encoding="utf-8", newline="").write(
        text[:p] + text[text.index("</p>", p) + 4:])
    judge("G. на ru.html нет абзаца", *run_check(site_g, live, released), "РАЗЪЕХАЛОСЬ в разделе")

    # H. список выпущенного не прочитан
    judge("H. список выпущенного недоступен", *run_check(site, live, os.path.join(work, "нет-такого.txt")),
          "НЕ ПРОЧИТАН")

    code, red = run_check(site, live, released)
    after = code == 0 and not red
    verdicts.append(after)
    print(("  OK     | " if after else "  ПРОВАЛ | ") + "после укусов нетронутые копии снова ЗЕЛЁНЫЕ")
    for folder in (site, site_e, site_f, site_g, work):
        shutil.rmtree(folder, ignore_errors=True)
    bad = verdicts.count(False)
    print("ИТОГ: %s | проверок %d | провалов %d" % ("ЗУБЫ КУСАЮТ" if not bad else "ЕСТЬ ПРОБЛЕМА", len(verdicts), bad))
    return 0 if not bad else 2


if __name__ == "__main__":
    raise SystemExit(main())

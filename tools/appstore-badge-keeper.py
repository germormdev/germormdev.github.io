#!/usr/bin/env python3
# Сторож значка App Store на витрине (Клод Нетворк, 08.11.2026, задание German: «пока приложение не опубликовано
# в App Store, значок не показывать; включить, когда оно появится в магазине»).
#
# Значок уже стоит на index.html, ru.html, he.html — ссылкой <a data-appstore-badge hidden …>. Раз в час сторож
# спрашивает открытый поиск Apple (itunes.apple.com/lookup, без ключей) про VecturaBook (Apple id 6830076619) в
# нескольких странах. Нашёл — клонирует источник витрины с NAS, снимает «hidden» на трёх страницах, коммитит и пушит
# в main (хук NAS сам отправит на GitHub Pages), пишет German. После этого молчит: отметка в STATE.
# Посетители сайта к Apple за проверкой не ходят — проверяет только NAS.
#
# Ставится в /usr/local/sbin/appstore-badge-keeper.py, крон NAS под Gromoz, :23 каждый час;
# журнал /volume1/Gromoz/CargoLogSite/appstore-badge-keeper.log. Откат: убрать строку из /etc/crontab.
# Подмена для проверки (K_*): K_FOUND=1 — «нашёл» без запроса, K_REPO — другой bare, K_STATE, K_LOG, K_NOTIFY.
import json, os, subprocess, sys, tempfile, time, urllib.request

APP_ID = "6830076619"
COUNTRIES = ("us", "il", "gb", "de", "ru")
PAGES = ("index.html", "ru.html", "he.html")
MARK_OFF, MARK_ON = "data-appstore-badge hidden", "data-appstore-badge"
E = os.environ.get
REPO = E("K_REPO", "/volume1/Gromoz/CargoLogSite/Git/CargoLogSite.git")
STATE = E("K_STATE", "/volume1/Gromoz/CargoLogSite/.appstore-badge-keeper.done")
LOG = E("K_LOG", "/volume1/Gromoz/CargoLogSite/appstore-badge-keeper.log")
NOTIFY = E("K_NOTIFY", "/volume1/Gromoz/VecturaWeb/work/deploy/backup/notify.sh")


def log(msg):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + msg + "\n")


def tell(subject, body):
    if NOTIFY == "-":
        log("сообщение (подмена): " + subject)
        return
    fd, p = tempfile.mkstemp(prefix="appstore-badge-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(body + "\n")
    r = subprocess.run(["sh", NOTIFY, "alert", subject, p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.unlink(p)
    log(("сообщил German: " if r.returncode == 0 else "ОТКАЗ: не дошло сообщение German: ") + subject)


def lookup():
    """Страна, где VecturaBook уже есть в App Store, и адрес карточки; None — пока нигде."""
    if E("K_FOUND"):
        return "test", "https://apps.apple.com/app/id" + APP_ID
    # 12.11.2026: тот же адрес поиска Apple отдаёт закэшированный «0» часами (VecturaBook в App Store с 11.11, а сторож всё
    # время видел 0 во всех пяти странах — замер с мака и NAS). Метка против кэша в адресе и три попытки на страну.
    errors, tries = 0, 0
    for cc in COUNTRIES:
        for i in range(3):
            tries += 1
            url = "https://itunes.apple.com/lookup?id=%s&country=%s&_=%d" % (APP_ID, cc, int(time.time() * 1000) + i)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "vecturabook-site-keeper"})
                data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))
            except Exception as e:
                errors += 1
                continue
            for item in data.get("results", []):
                if str(item.get("trackId")) == APP_ID:
                    return cc, item.get("trackViewUrl", "")
            time.sleep(1)
    log("в поиске Apple пока нет (%d стран, %d запросов%s)" % (len(COUNTRIES), tries,
                                                               ", ОТКАЗ: поиск не ответил ни разу" if errors == tries else ""))
    return None


def git(*args, cwd=None):
    return subprocess.run(["git"] + list(args), cwd=cwd, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT).stdout.decode("utf-8", "replace")


def main():
    if os.path.exists(STATE):
        return 0
    hit = lookup()
    if not hit:
        return 0
    cc, store_url = hit
    with tempfile.TemporaryDirectory(prefix="appstore-badge-") as tmp:
        w = os.path.join(tmp, "site")
        git("clone", "-q", "--branch", "main", REPO, w)
        changed = []
        for page in PAGES:
            p = os.path.join(w, page)
            s = open(p, encoding="utf-8").read()
            if MARK_OFF in s:
                open(p, "w", encoding="utf-8").write(s.replace(MARK_OFF, MARK_ON))
                changed.append(page)
        if changed:
            git("-c", "user.name=appstore-badge-keeper (NAS)", "-c", "user.email=noreply@vecturabook.com",
                "commit", "-q", "-am",
                "Витрина: значок App Store включён — VecturaBook появилась в App Store (страна %s, %s); "
                "сторож appstore-badge-keeper, задание German 08.11.2026" % (cc, store_url), cwd=w)
            out = git("push", "-q", "origin", "main", cwd=w)
            log("включил значок на %s (App Store %s, %s); пуш: %s" % (", ".join(changed), cc, store_url,
                                                                     out.strip().replace("\n", " | ") or "ок"))
            tell("VecturaBook: значок App Store на сайте включён",
                 "VecturaBook нашлась в App Store (%s, %s).\nСторож снял скрытие значка «Download on the App Store» "
                 "на vecturabook.com: %s.\nGitHub Pages обновит сайт за ~10 минут." % (cc, store_url, ", ".join(changed)))
        else:
            log("приложение в App Store (%s), а скрытых значков уже нет — отмечаю и молчу" % cc)
    open(STATE, "w").write(time.strftime("%Y-%m-%d %H:%M:%S ") + cc + " " + store_url + "\n")
    if os.path.exists(STATE + ".fail"):
        os.unlink(STATE + ".fail")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as e:
        log("ОТКАЗ git: %s — %s" % (" ".join(e.cmd), (e.stdout or b"").decode("utf-8", "replace").strip()))
        if not os.path.exists(STATE + ".fail"):          # одно сообщение на отказ, повтор каждый час молча
            open(STATE + ".fail", "w").write(time.strftime("%Y-%m-%d %H:%M:%S\n"))
            tell("VecturaBook: сторож значка App Store не смог включить значок",
                 "git отказал: %s\nПовторяет раз в час. Журнал: /volume1/Gromoz/CargoLogSite/appstore-badge-keeper.log"
                 % " ".join(e.cmd))
        sys.exit(1)

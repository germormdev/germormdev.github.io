#!/usr/bin/env python3
"""Источник трёх страниц VecturaBook Pro (решение German 04.11.2026): правки текста — здесь, потом `python3 pro_pages.py .`.
Собирает pro.html / pro-ru.html / pro-he.html витрины из одного шаблона (тексты трёх языков здесь).
Голова (палитра Tailwind, шрифты, Font Awesome) берётся из index.html как есть — та же, что у остальных страниц."""
import html, re, sys
from pathlib import Path

SITE = Path(sys.argv[1])
index = (SITE / "index.html").read_text(encoding="utf-8")
m = re.search(r'(    <script src="https://cdn\.tailwindcss\.com"></script>.*?<link rel="stylesheet" href="https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/6\.4\.0/css/all\.min\.css">)', index, re.S)
HEAD_SHARED = m.group(1)
# emailjs на Pro не нужен
HEAD_SHARED = re.sub(r'\s*<script src="https://cdn\.jsdelivr\.net/npm/@emailjs[^>]*></script>', '', HEAD_SHARED)

MAIL = "germormdev@gmail.com"
PAGES = {"en": "pro.html", "ru": "pro-ru.html", "he": "pro-he.html"}
HOME = {"en": "index.html", "ru": "ru.html", "he": "he.html"}
LOCALE = {"en": "en_US", "ru": "ru_RU", "he": "he_IL"}

T = {
"en": dict(
    title="VecturaBook Pro — fleet program for transport companies",
    desc="VecturaBook Pro: your company's own server, a dispatcher window for Windows, Mac and Android, drivers, trucks, trailers, couplings, trips, branches, service and deadlines. Tailored to your company, with your data moved from the old system.",
    signin="Sign in", back="← VecturaBook for drivers",
    h1a="VecturaBook Pro", h1b="for transport companies",
    lead="Your company's own server, a dispatcher window and the driver's VecturaBook app working together. Drivers, trucks, trailers, couplings, trips, branches, service and deadlines — in one place, on your own computers.",
    cta="Write to us", mail_subj="VecturaBook Pro",
    feat_h="What's inside",
    feats=[
        ("fa-server", "Company server", "Runs on your own computer or server — Windows or Linux. The data stays inside the company, not in someone else's cloud."),
        ("fa-desktop", "Dispatcher window", "One program for the office and the road: Windows, Mac and Android. Live list of trucks, who drives what and where it is going."),
        ("fa-id-card", "Drivers", "Who is working and who is not, which truck and trailer each driver has now, and the history of who drove what."),
        ("fa-truck", "Trucks", "Tractors, rigid trucks and cars. The picture is drawn by the real wheel layout (4×2, 6×4, 8×4…), with mileage and engine hours."),
        ("fa-trailer", "Trailers", "Every trailer by axles and body: where it stands, which truck it is coupled to, what is due on it."),
        ("fa-link", "Couplings", "Driver + truck + trailer as one unit. Re-couple on the fly; every change is kept in the history."),
        ("fa-route", "Trips", "Jobs with loading and unloading points. The driver's status comes from the phone: accepted, on the way, unloaded."),
        ("fa-code-branch", "Branches", "Each branch works with its own trucks and people; other branches are visible read-only."),
        ("fa-screwdriver-wrench", "Service and deadlines", "Service and inspection by date, kilometres or engine hours. Overdue goes first, “due soon” is warned in advance."),
    ],
    custom_h="Built around your company",
    custom=[
        ("fa-pen-ruler", "Adapted to your tasks", "VecturaBook Pro is finished for the work of a specific company: your cargo types, your documents, your rules for drivers and branches. What you need is added; what you don't need is not in the way."),
        ("fa-palette", "Your own interface", "Sections, fields, wording, order of columns and the look of the window can be changed for you. The screenshots below are the starting point, not a fixed form."),
        ("fa-right-left", "Moving your data", "Drivers, trucks, trailers, deadlines and history are moved from your previous system — Excel tables, an old program or a database. You start with your own data, not an empty screen."),
    ],
    shots_h="What is already done",
    shots_note="Screenshots of the current version on demo data. The interface is adjusted for each client — what you see here is changed to fit your company.",
    shots=[
        ("en-win-fleet.jpg", 1028, 749, "Windows: “Vehicles” — every truck with its driver, trailer, trip and deadlines; the card shows coupling, current trip, service and coupling history"),
        ("en-mac-fleet.jpg", 1147, 628, "Mac: the same window and the same data"),
        ("en-mac-service.jpg", 1147, 628, "Mac: “Service and inspection” — overdue first, by date, kilometres or engine hours"),
        ("en-android.jpg", 450, 1000, "Android: the truck card on a phone"),
    ],
    contact_h="Let's talk about your fleet",
    contact="Tell us how many trucks and branches you have and what you work in now. We will answer by e-mail.",
    footer_privacy="Privacy Policy", footer_home="VecturaBook for drivers",
),
"ru": dict(
    title="VecturaBook Pro — программа для транспортных компаний",
    desc="VecturaBook Pro: свой сервер фирмы, окно диспетчера для Windows, Мака и Android, водители, машины, прицепы, сцепки, рейсы, филиалы, ТО и сроки. Дорабатывается под фирму, данные переносятся из прежней системы.",
    signin="Войти", back="← VecturaBook для водителей",
    h1a="VecturaBook Pro", h1b="для транспортных компаний",
    lead="Свой сервер фирмы, окно диспетчера и приложение VecturaBook у водителей — вместе. Водители, машины, прицепы, сцепки, рейсы, филиалы, ТО и сроки — в одном месте, на ваших компьютерах.",
    cta="Написать нам", mail_subj="VecturaBook Pro",
    feat_h="Что внутри",
    feats=[
        ("fa-server", "Сервер фирмы", "Стоит на вашем компьютере или сервере — Windows или Linux. Данные остаются в фирме, а не в чужом облаке."),
        ("fa-desktop", "Окно диспетчера", "Одна программа для офиса и дороги: Windows, Мак и Android. Живой список машин: кто на чём едет и куда."),
        ("fa-id-card", "Водители", "Кто в работе, а кто нет, какая машина и прицеп у водителя сейчас, история — кто на чём ездил."),
        ("fa-truck", "Машины", "Тягачи, грузовики и легковые. Рисунок — по настоящей колёсной формуле (4×2, 6×4, 8×4…), пробег и моточасы."),
        ("fa-trailer", "Прицепы", "Каждый прицеп по осям и кузову: где стоит, с какой машиной сцеплен, что по нему подходит."),
        ("fa-link", "Сцепки", "Водитель + машина + прицеп одной связкой. Перецепка на ходу, каждая смена остаётся в истории."),
        ("fa-route", "Рейсы", "Задания с точками погрузки и разгрузки. Состояние приходит с телефона водителя: принято, в пути, разгружен."),
        ("fa-code-branch", "Филиалы", "Каждый филиал ведёт свои машины и людей; чужие филиалы видны только для чтения."),
        ("fa-screwdriver-wrench", "ТО и сроки", "ТО и техосмотр по дате, километрам или моточасам. Просроченное — первым, «скоро» — предупреждение заранее."),
    ],
    custom_h="Под вашу фирму",
    custom=[
        ("fa-pen-ruler", "Дорабатывается под ваши задачи", "VecturaBook Pro доводится под работу конкретной фирмы: ваши грузы, ваши документы, ваши правила для водителей и филиалов. Нужное добавляется, ненужное не мешает."),
        ("fa-palette", "Свой интерфейс", "Разделы, поля, надписи, порядок колонок и вид окна меняются под вас. Снимки ниже — отправная точка, а не застывшая форма."),
        ("fa-right-left", "Перенос данных", "Водители, машины, прицепы, сроки и история переносятся из вашей прежней системы — таблиц Excel, старой программы или базы. Вы начинаете со своими данными, а не с пустого экрана."),
    ],
    shots_h="Что уже сделано",
    shots_note="Снимки нынешней версии на проверочных данных. Интерфейс подстраивается под каждого клиента — то, что вы видите, меняется под вашу фирму.",
    shots=[
        ("ru-win-fleet.jpg", 1028, 749, "Windows: раздел «Машины» — каждая машина с водителем, прицепом, рейсом и сроками; в карточке сцепка, рейс сейчас, ТО и история сцепки"),
        ("ru-mac-fleet.jpg", 1147, 628, "Мак: то же окно и те же данные"),
        ("ru-mac-service.jpg", 1147, 628, "Мак: «ТО и техосмотр» — просроченное первым, по дате, километрам или моточасам"),
        ("ru-android.jpg", 450, 1000, "Android: карточка машины на телефоне"),
    ],
    contact_h="Поговорим о вашем парке",
    contact="Напишите, сколько у вас машин и филиалов и в чём вы работаете сейчас. Ответим письмом.",
    footer_privacy="Политика конфиденциальности", footer_home="VecturaBook для водителей",
),
"he": dict(
    title="VecturaBook Pro — תוכנה לחברות הובלה",
    desc="VecturaBook Pro: שרת משלכם בחברה, חלון סדרן ל-Windows, Mac ואנדרואיד, נהגים, משאיות, נגררים, צימודים, נסיעות, סניפים, טיפולים ומועדים. מותאם לחברה שלכם, והנתונים מועברים מהמערכת הקודמת.",
    signin="כניסה לאפליקציה", back="VecturaBook לנהגים →",
    h1a="VecturaBook Pro", h1b="לחברות הובלה",
    lead="שרת משלכם בחברה, חלון סדרן ואפליקציית VecturaBook אצל הנהגים — עובדים יחד. נהגים, משאיות, נגררים, צימודים, נסיעות, סניפים, טיפולים ומועדים — במקום אחד, על המחשבים שלכם.",
    cta="כתבו לנו", mail_subj="VecturaBook Pro",
    feat_h="מה יש בפנים",
    feats=[
        ("fa-server", "שרת של החברה", "פועל על מחשב או שרת שלכם — Windows או Linux. הנתונים נשארים בחברה, לא בענן של מישהו אחר."),
        ("fa-desktop", "חלון סדרן", "תוכנה אחת למשרד ולדרך: Windows, Mac ואנדרואיד. רשימה חיה של המשאיות: מי נוהג במה ולאן נוסעים."),
        ("fa-id-card", "נהגים", "מי בעבודה ומי לא, איזו משאית ואיזה נגרר יש לכל נהג עכשיו, והיסטוריה — מי נהג במה."),
        ("fa-truck", "משאיות", "ראשי גרר, משאיות ורכבים פרטיים. הציור לפי תצורת הסרנים האמיתית (4×2, 6×4, 8×4…), עם קילומטראז' ושעות מנוע."),
        ("fa-trailer", "נגררים", "כל נגרר לפי סרנים ומרכב: איפה הוא עומד, לאיזו משאית הוא מחובר, מה מתקרב אצלו."),
        ("fa-link", "צימודים", "נהג + משאית + נגרר כיחידה אחת. החלפה תוך כדי עבודה, וכל שינוי נשמר בהיסטוריה."),
        ("fa-route", "נסיעות", "משימות עם נקודות העמסה ופריקה. המצב מגיע מהטלפון של הנהג: התקבל, בדרך, נפרק."),
        ("fa-code-branch", "סניפים", "כל סניף מנהל את המשאיות והאנשים שלו; סניפים אחרים גלויים לקריאה בלבד."),
        ("fa-screwdriver-wrench", "טיפולים ומועדים", "טיפול וטסט לפי תאריך, קילומטרים או שעות מנוע. מה שעבר מועדו — ראשון, ו„בקרוב” — התראה מראש."),
    ],
    custom_h="בנוי סביב החברה שלכם",
    custom=[
        ("fa-pen-ruler", "מותאם למשימות שלכם", "VecturaBook Pro מושלם לעבודה של חברה מסוימת: סוגי המטען שלכם, המסמכים שלכם, הכללים שלכם לנהגים ולסניפים. מה שצריך — מתווסף, מה שלא צריך — לא מפריע."),
        ("fa-palette", "ממשק משלכם", "אפשר לשנות בשבילכם את הלשוניות, השדות, הכיתובים, סדר העמודות ומראה החלון. צילומי המסך למטה הם נקודת התחלה, לא צורה קבועה."),
        ("fa-right-left", "העברת נתונים", "נהגים, משאיות, נגררים, מועדים והיסטוריה מועברים מהמערכת הקודמת שלכם — טבלאות Excel, תוכנה ישנה או מסד נתונים. מתחילים עם הנתונים שלכם, לא ממסך ריק."),
    ],
    shots_h="מה כבר עשוי",
    shots_note="צילומי מסך של הגרסה הנוכחית על נתוני הדגמה. הממשק מותאם לכל לקוח — מה שרואים כאן משתנה לפי החברה שלכם.",
    shots=[
        ("he-win-fleet.jpg", 1028, 749, "Windows: הלשונית „רכבים” — כל משאית עם הנהג, הנגרר, הנסיעה והמועדים; בכרטיס — צימוד, נסיעה נוכחית, טיפולים והיסטוריית צימוד"),
        ("he-mac-fleet.jpg", 1147, 628, "Mac: אותו חלון ואותם נתונים"),
        ("he-mac-service.jpg", 1147, 628, "Mac: „טיפולים וטסט” — מה שעבר מועדו ראשון, לפי תאריך, קילומטרים או שעות מנוע"),
        ("he-android.jpg", 450, 1000, "אנדרואיד: כרטיס משאית בטלפון"),
    ],
    contact_h="בואו נדבר על הצי שלכם",
    contact="ספרו לנו כמה משאיות וסניפים יש לכם ובמה אתם עובדים היום. נענה במייל.",
    footer_privacy="מדיניות פרטיות", footer_home="VecturaBook לנהגים",
),
}

def e(s): return html.escape(s, quote=True)

def page(lang):
    t = T[lang]; rtl = lang == "he"
    url = "https://vecturabook.com/" + PAGES[lang]
    mail = f"mailto:{MAIL}?subject=" + t["mail_subj"].replace(" ", "%20")
    alt_links = "\n".join(f'    <link rel="alternate" hreflang="{l}" href="https://vecturabook.com/{p}">' for l, p in PAGES.items())
    og_alt = "\n".join(f'    <meta property="og:locale:alternate" content="{LOCALE[l]}">' for l in PAGES if l != lang)
    def sw(l, label):
        if l == lang: return f'<span class="text-orange-500 border-b-2 border-orange-500 pb-1">{label}</span>'
        return f'<a href="{PAGES[l]}" class="text-gray-500 hover:text-orange-500 transition">{label}</a>'
    feats = "\n".join(
        f'''            <div class="pro-card"><h3 class="text-xl font-bold text-gray-900 mb-2"><i class="fa-solid {i} text-orange-500 me-2"></i>{e(h)}</h3><p class="text-gray-700">{e(p)}</p></div>'''
        for i, h, p in t["feats"])
    custom = "\n".join(
        f'''            <div><h3 class="text-xl font-bold mb-2"><i class="fa-solid {i} text-orange-500 me-2"></i>{e(h)}</h3><p class="text-gray-300">{e(p)}</p></div>'''
        for i, h, p in t["custom"])
    if t["shots"]:
        f0, w0, h0, _ = t["shots"][0]
        og_url = f"https://vecturabook.com/pro/{f0}"
        og_image = (f'    <meta property="og:image" content="{og_url}">\n    <meta property="og:image:type" content="image/jpeg">\n'
                    f'    <meta property="og:image:width" content="{w0}">\n    <meta property="og:image:height" content="{h0}">')
    else:
        og_url = "https://vecturabook.com/og-image.png"
        og_image = f'    <meta property="og:image" content="{og_url}">'
    shots = "\n".join(
        f'''            <figure class="pro-shot{' pro-shot-phone' if h > w else ''}"><a href="pro/{f}" target="_blank" rel="noopener"><img src="pro/{f}" alt="{e(c)}" width="{w}" height="{h}" loading="lazy"></a><figcaption>{e(c)}</figcaption></figure>'''
        for f, w, h, c in t["shots"])
    if not t["shots"]:
        shots_section = ""
    else:
        shots_section = f'''    <section class="bg-white py-16 border-t border-gray-200">
        <div class="container mx-auto px-6 max-w-5xl">
            <h2 class="text-3xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-orange-500 inline-block">{e(t["shots_h"])}</h2>
            <p class="pro-note mb-8">{e(t["shots_note"])}</p>
            <div class="pro-shots">
{shots}
            </div>
        </div>
    </section>

'''
    return f'''<!DOCTYPE html>
<html lang="{lang}"{' dir="rtl"' if rtl else ''}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{e(t["title"])}</title>
    <script src="analytics.js"></script>
    <script src="brand.js" defer></script>
    <meta name="description" content="{e(t["desc"])}">
    <link rel="canonical" href="{url}">
{alt_links}
    <link rel="alternate" hreflang="x-default" href="https://vecturabook.com/pro.html">
    <link rel="icon" href="favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="apple-touch-icon.png">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="VecturaBook">
    <meta property="og:title" content="{e(t["title"])}">
    <meta property="og:description" content="{e(t["desc"])}">
    <meta property="og:url" content="{url}">
{og_image}
    <meta property="og:locale" content="{LOCALE[lang]}">
{og_alt}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{e(t["title"])}">
    <meta name="twitter:description" content="{e(t["desc"])}">
    <meta name="twitter:image" content="{og_url}">
<!-- Голова ниже (палитра «Манила», шрифты, значки) — та же, что у index.html. Страницу собирает один шаблон на три языка. -->
{HEAD_SHARED}
    <link rel="stylesheet" href="pro.css">
</head>
<body class="bg-gray-50 text-gray-800">

    <nav class="container mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-y-2">
        <a href="{HOME[lang]}" id="brand" class="text-2xl font-bold text-orange-500 tracking-tight">CargoLog</a>
        <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2{' flex-row-reverse' if rtl else ''}">
            <a href="https://my.vecturabook.com" target="_blank" rel="noopener"
               class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 px-4 rounded-full transition">
                {e(t["signin"])}
            </a>
            <div class="lang-switch flex items-baseline gap-4 text-sm font-medium"{' dir="ltr"' if rtl else ''}>
                {sw("en", "EN")}
                {sw("ru", "RU")}
                {sw("he", "HE")}
            </div>
        </div>
    </nav>

    <header class="container mx-auto px-6 pt-10 pb-12 text-center">
        <p class="mb-6"><a href="{HOME[lang]}" class="text-orange-600 hover:underline">{e(t["back"])}</a></p>
        <h1 class="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            <span translate="no">{e(t["h1a"])}</span><br><span class="text-orange-500">{e(t["h1b"])}</span>
        </h1>
        <p class="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto">{e(t["lead"])}</p>
        <a href="{mail}" class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-7 rounded-full transition">
            <i class="fa-solid fa-envelope"></i> {e(t["cta"])}
        </a>
    </header>

    <section class="bg-white py-16 border-t border-gray-200">
        <div class="container mx-auto px-6 max-w-5xl">
            <h2 class="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-orange-500 inline-block">{e(t["feat_h"])}</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
{feats}
            </div>
        </div>
    </section>

    <section class="py-16">
        <div class="container mx-auto px-6 max-w-5xl">
            <div class="bg-gray-900 text-white rounded-2xl p-8">
                <h2 class="text-3xl font-bold mb-8">{e(t["custom_h"])}</h2>
                <div class="grid md:grid-cols-3 gap-8">
{custom}
                </div>
            </div>
        </div>
    </section>

{shots_section}    <section class="py-16 border-t border-gray-200">
        <div class="container mx-auto px-6 max-w-3xl text-center">
            <h2 class="text-3xl font-bold text-gray-900 mb-4">{e(t["contact_h"])}</h2>
            <p class="text-lg text-gray-700 mb-8">{e(t["contact"])}</p>
            <a href="{mail}" class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-7 rounded-full transition">
                <i class="fa-solid fa-envelope"></i> {MAIL}
            </a>
        </div>
    </section>

    <footer class="bg-gray-900 text-white py-10">
        <div class="container mx-auto px-6 text-center text-sm flex flex-wrap justify-center gap-6">
            <a href="{HOME[lang]}" class="text-gray-400 hover:text-orange-400 transition">{e(t["footer_home"])}</a>
            <a href="privacy.html" class="text-gray-400 hover:text-orange-400 transition">{e(t["footer_privacy"])}</a>
            <a href="mailto:{MAIL}" class="text-gray-400 hover:text-orange-400 transition">{MAIL}</a>
        </div>
    </footer>
</body>
</html>
'''

for lang, name in PAGES.items():
    (SITE / name).write_text(page(lang), encoding="utf-8")
    print("written", name)

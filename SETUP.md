# CargoLog Site Admin — Setup Instructions

Что добавлено в этой итерации сайта:

1. **Tab "Content"** в `versions.html` — редактирование описания (заголовок, фичи, причины, тех. характеристики, аудитория) для каждой локали
2. **Tab "Screenshots"** — загрузка/удаление скриншотов через GitHub API
3. **Tab "Videos"** — добавление YouTube видео по локали (показываются на index/ru/he)
4. **Секция Videos** на `index.html` / `ru.html` / `he.html` — рендерится из Firestore, скрыта если для локали нет видео

Все админские функции видны **только** для email'ов в ADMIN_EMAILS (`germormdev@gmail.com`, `ormgerm@gmail.com`).

---

## Шаг 1. Залить файлы в репо

Замени в репозитории `germormdev.github.io`:

- `signin.js` — заменить целиком
- `index.html` / `ru.html` / `he.html` — заменить целиком
- `versions.html` — заменить целиком

Создать новую папку:
- `screenshots/` — пока пустая, сюда будут попадать загруженные через админку файлы

Старые `screen1.png` / `screen2.png` / `screen3.png` оставить — они работают как fallback пока в Firestore нет ни одной записи в `site_screenshots`.

---

## Шаг 2. Применить Firestore Security Rules

Файл `firestore.rules` (внутри инструкции лежит рядом).

1. https://console.firebase.google.com → проект **cargolog-28bdd**
2. Build → **Firestore Database** → вкладка **Rules**
3. Заменить содержимое целиком на содержимое `firestore.rules`
4. Кнопка **Publish**

Без этого шага любой залогиненный юзер сможет писать в `site_content`, `site_videos` и т.п. — будет дыра.

---

## Шаг 3. Создать GitHub Personal Access Token (для скриншотов)

Скриншоты сохраняются как коммиты в репо. Браузеру нужен PAT.

### Как создать токен:

1. https://github.com/settings/tokens?type=beta → **Generate new token (Fine-grained)**
2. Token name: `CargoLog site screenshots`
3. Expiration: 90 days (можно дольше, периодически переcоздавать)
4. Repository access: **Only select repositories** → выбрать **germormdev/germormdev.github.io**
5. Permissions → Repository permissions:
   - **Contents**: **Read and write**
6. Generate token → **скопировать** (показывается один раз)

### Как ввести его в админке:

1. Зайти на https://germormdev.github.io/versions.html
2. Войти через Google своим админ-email
3. В блоке Admin справа сверху — кнопка **Set GitHub Token**
4. Вставить токен, OK

Токен лежит в **localStorage браузера**. На другом компе/телефоне — придётся ввести заново. Если потерял устройство → Settings → Tokens → Revoke и создай новый.

---

## Шаг 4. Первое заполнение контента

Когда сайт открывается:
- если в `site_content/{locale}` ничего нет → используются статические тексты из HTML (никаких пустых блоков)
- как только заполнишь хоть одну локаль через **Content** таб — она будет браться из Firestore

Поэтому первая загрузка контента **необязательна**. Можно постепенно — сначала en, потом ru, потом he. Каждая локаль независимо.

### Как заполнить контент:

1. versions.html → залогиниться → таб **Content**
2. Выбрать **Locale** = en
3. Поля автоматически загружаются из Firestore (если ничего нет — пустые)
4. Заполнить все поля
5. Save content

**Формат полей**:

- **Hero title** — HTML разрешён. Пример:
  ```
  Digital Logbook <br><span class="text-orange-500">for Truck Drivers</span>
  ```
- **Hero subtitle** — обычный текст
- **Features** — каждая фича на новой строке в формате `Заголовок :: Описание`. Пример:
  ```
  Trip Logging :: Record every trip from origin to destination…
  Cargo Tracking :: Supports all types of transport and trailers…
  ```
- **Why drivers choose** — каждый пункт на новой строке. HTML тег `<strong>` разрешён:
  ```
  <strong>Works offline</strong> — no internet needed during shift
  <strong>No registration</strong> — open the app, start working
  ```
- **Technical details** — каждый пункт на новой строке (без HTML)
- **Who is it for** — один параграф

---

## Шаг 5. Загрузка скриншотов

1. versions.html → таб **Screenshots**
2. Browse → выбрать PNG/JPG
3. Order: 1, 2, 3 (порядок отображения)
4. Upload → файл коммитится в `screenshots/{timestamp}_{filename}` в GitHub

Удаление работает так же — кнопка корзины коммитит deletion.

**Важно**: после первой загрузки своего скриншота старые `screen1/2/3.png` перестают показываться — они только fallback для пустого Firestore. Можешь их потом удалить вручную из репо когда наполнишь свои.

---

## Шаг 6. Добавление YouTube видео

1. Залить ролик на YouTube (любой канал — публичный или unlisted)
2. Скопировать URL: `https://www.youtube.com/watch?v=XXXXXXXXXXX`
3. versions.html → таб **Videos**
4. YouTube URL: вставить ссылку (или просто 11-значный ID)
5. Title: что показывается под плеером
6. Description: опционально
7. Locale: выбрать язык — видео появится только на странице этой локали
8. Order: порядок
9. Add video

Хочешь одно и то же видео на 3 языка? Добавь 3 раза с разной локалью (это нормально — разные тайтлы под разные страны).

---

## Что хранится где (для будущего отладки)

| Коллекция Firestore | Что | Размер |
|---|---|---|
| `pending_testers` | Кто кликнул "Sign in with Google" | по 1 записи на тестера |
| `version_history` | Релизы | 1 запись = 1 язык 1 версии |
| `site_content` | Тексты страниц | 3 документа — `en`, `ru`, `he` |
| `site_screenshots` | Метаданные скриншотов | 1 запись = 1 файл |
| `site_videos` | YouTube видео | 1 запись = 1 видео × 1 локаль |

| GitHub репо | Что |
|---|---|
| `screenshots/*.png` | Сами файлы скриншотов |
| `screen1/2/3.png` | Fallback старые (можно удалить когда наполнишь Firestore) |

---

## Известные ограничения / FAQ

**Q: Что если PAT истёк / отозван?**
A: Загрузка/удаление скринов перестанет работать. Создай новый и введи через Set GitHub Token.

**Q: Можно ли редактировать существующее видео (поменять title/order)?**
A: Сейчас только удалить и добавить заново. Если нужна правка без переcоздания — допишу.

**Q: Что если случайно ввёл текст с битым HTML в Hero title?**
A: Браузер покажет как-то — не fatal. Зайди в Content → выбери ту же локаль → поправь → Save.

**Q: Скриншоты на странице медленно появляются?**
A: GitHub Pages кеширует ~10 минут. Подожди или force-refresh (Ctrl+F5).

**Q: Видео не показывается на странице после добавления?**
A: Проверь что в админке Locale совпадает с языком страницы. Видео с `locale=en` только на index.html, не на ru.html.

---

## Если что-то ломается

1. F12 → Console — смотрим ошибки
2. Самые частые:
   - **"GitHub upload 401: Bad credentials"** → токен неверный или истёк
   - **"GitHub upload 403"** → у токена нет прав contents:write на этот репо
   - **"Missing or insufficient permissions"** в Firestore → не применил rules или твой email не в whitelist
3. Если нужна помощь — скрин консоли + что нажимал

// ═══════════════════════════════════════════════════════════════════════
// CargoLog Site — Auth, Tester Registration, Version History,
//                  Site Content, Screenshots (GitHub), Videos
// ═══════════════════════════════════════════════════════════════════════
//
// Подключается на:
//   - index.html / ru.html / he.html — публичный рендер контента
//   - versions.html — админ-формы (видны только whitelist email'ам)
//
// Зависимости (подключить в HTML до этого файла):
//   - Firebase v10 ES modules CDN
//   - EmailJS SDK v4 CDN
//   - Tailwind CSS
// ═══════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, addDoc, collection,
  query, orderBy, where, limit, getDocs, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ── Firebase config ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBgS40KxwWoSn3vcL_k-m9C__qpIciS3nI",
  authDomain: "cargolog-28bdd.firebaseapp.com",
  projectId: "cargolog-28bdd",
  storageBucket: "cargolog-28bdd.firebasestorage.app",
  messagingSenderId: "948696748141",
  appId: "1:948696748141:web:4778e3f40fc52f054eaf64",
  measurementId: "G-1W3HBDDM7P"
};

// ── EmailJS config ───────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY = "hkEmjKw6XParMcuQ0";
const EMAILJS_SERVICE_ID = "service_gs58cka";
const EMAILJS_TEMPLATE_ID = "template_ot60bck";

// ── Whitelist админов ────────────────────────────────────────────────
const ADMIN_EMAILS = ["germormdev@gmail.com", "ormgerm@gmail.com"];

// ── GitHub repo для скриншотов ───────────────────────────────────────
// PAT хранится в localStorage и вводится админом один раз через "Set GitHub Token".
// Скриншоты заливаются в screenshots/ в этом репо через GitHub Contents API.
const GITHUB_OWNER = "germormdev";
const GITHUB_REPO  = "germormdev.github.io";
const GITHUB_BRANCH = "main";
const GITHUB_SCREENSHOTS_DIR = "screenshots";
const PAT_LS_KEY = "cargolog_github_pat";

// ── Инициализация ────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

if (typeof emailjs !== "undefined") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ── Локализация UI-сообщений ─────────────────────────────────────────
const LOCALE = (document.documentElement.lang || "en").toLowerCase();
const I18N = {
  en: {
    signing_in: "Signing in…",
    welcome_registered: "✓ You're registered! Check your email or wait for the install link within 24 hours.",
    welcome_already_registered: "✓ You're already registered as a tester.",
    error_generic: "Something went wrong. Please try again.",
    error_popup_blocked: "Popup was blocked. Please allow popups for this site.",
    error_popup_closed: "Sign-in cancelled.",
    sign_out: "Sign out",
    signed_in_as: "Signed in as",
    admin_welcome: "✓ Welcome, admin",
    admin_open_panel: "Open admin panel →",
    not_admin: "This login is for administrators only.",
    confirm_delete_version: "Delete this version entry?",
    confirm_delete_screenshot: "Delete this screenshot? This will commit a deletion to GitHub.",
    confirm_delete_section: "Delete this section?",
  },
  ru: {
    signing_in: "Вход…",
    welcome_registered: "✓ Вы зарегистрированы! Проверьте email или дождитесь ссылки на установку в течение 24 часов.",
    welcome_already_registered: "✓ Вы уже зарегистрированы как тестер.",
    error_generic: "Что-то пошло не так. Попробуйте ещё раз.",
    error_popup_blocked: "Всплывающее окно заблокировано. Разрешите всплывающие окна для этого сайта.",
    error_popup_closed: "Вход отменён.",
    sign_out: "Выйти",
    signed_in_as: "Вы вошли как",
    admin_welcome: "✓ С возвращением, админ",
    admin_open_panel: "Открыть админ-панель →",
    not_admin: "Этот вход только для администраторов.",
    confirm_delete_version: "Удалить эту запись версии?",
    confirm_delete_screenshot: "Удалить скриншот? Это сделает коммит удаления в GitHub.",
    confirm_delete_section: "Удалить эту секцию?",
  },
  he: {
    signing_in: "מתחבר…",
    welcome_registered: "✓ ההרשמה הושלמה! בדוק את האימייל או המתן לקישור ההתקנה תוך 24 שעות.",
    welcome_already_registered: "✓ אתה כבר רשום כבודק.",
    error_generic: "משהו השתבש. אנא נסה שוב.",
    error_popup_blocked: "החלון הקופץ נחסם. אנא אפשר חלונות קופצים לאתר זה.",
    error_popup_closed: "ההתחברות בוטלה.",
    sign_out: "התנתק",
    signed_in_as: "מחובר כ",
    admin_welcome: "✓ ברוך שובך, מנהל",
    admin_open_panel: "פתח את לוח הניהול ←",
    not_admin: "התחברות זו מיועדת למנהלים בלבד.",
    confirm_delete_version: "למחוק את רשומת הגרסה הזו?",
    confirm_delete_screenshot: "למחוק את הצילום? פעולה זו תיצור קומיט מחיקה ב-GitHub.",
    confirm_delete_section: "למחוק את הסעיף הזה?",
  }
};
const t = (key) => (I18N[LOCALE] || I18N.en)[key] || key;

// ── Утилита: показ статуса в кнопке/баннере ──────────────────────────
function showStatus(message, isError = false) {
  const banner = document.getElementById("auth-status");
  if (!banner) return;
  banner.textContent = message;
  banner.className = isError
    ? "mt-4 p-4 rounded-lg bg-red-100 text-red-800 text-center"
    : "mt-4 p-4 rounded-lg bg-green-100 text-green-800 text-center";
  banner.classList.remove("hidden");
}

function clearStatus() {
  const banner = document.getElementById("auth-status");
  if (banner) banner.classList.add("hidden");
}

// Спец-баннер для админа: вместо обычного "registered" — приглашение в панель.
function showAdminWelcome(user) {
  const banner = document.getElementById("auth-status");
  if (!banner) return;
  banner.className = "mt-4 p-4 rounded-lg bg-orange-100 text-orange-900 text-center";
  banner.innerHTML = `
    <div class="font-semibold mb-2">${t("admin_welcome")} — ${escapeHtml(user.email)}</div>
    <a href="versions.html" class="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-lg transition">
      ${t("admin_open_panel")}
    </a>
  `;
  banner.classList.remove("hidden");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════════════════
// AUTH (Sign-in / Sign-out / Tester registration)
// ═══════════════════════════════════════════════════════════════════════

async function handleSignIn() {
  clearStatus();
  const btn = document.getElementById("btn-google-signin");
  if (btn) {
    btn.disabled = true;
    btn.dataset.origLabel = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> ${t("signing_in")}`;
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // v1.0.1 (S28): тестерская программа закрыта — приложение в production.
    // Кнопка "Admin" в футере служит только для входа в админ-панель.
    // Админ — показываем приглашение в админку. Не-админ — вежливо
    // сообщаем что вход только для админов и разлогиниваем (чтобы случайный
    // юзер не висел залогиненным без цели).
    if (ADMIN_EMAILS.includes(user.email)) {
      showAdminWelcome(user);
    } else {
      showStatus(t("not_admin"), false);
      await signOut(auth);
    }
  } catch (err) {
    console.error("Sign-in error:", err);
    if (err.code === "auth/popup-blocked") {
      showStatus(t("error_popup_blocked"), true);
    } else if (err.code === "auth/popup-closed-by-user" ||
               err.code === "auth/cancelled-popup-request") {
      showStatus(t("error_popup_closed"), true);
    } else {
      showStatus(t("error_generic") + " (" + (err.code || err.message) + ")", true);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.origLabel) btn.innerHTML = btn.dataset.origLabel;
    }
  }
}

async function registerTester(user) {
  const email = user.email;
  const uid = user.uid;
  const displayName = user.displayName || "";

  const existing = await getDoc(doc(db, "pending_testers", uid));
  if (existing.exists()) {
    showStatus(t("welcome_already_registered"), false);
    return;
  }

  await setDoc(doc(db, "pending_testers", uid), {
    email,
    displayName,
    photoURL: user.photoURL || "",
    locale: LOCALE,
    userAgent: navigator.userAgent || "",
    createdAt: serverTimestamp(),
    status: "pending"
  });

  try {
    if (typeof emailjs !== "undefined") {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        user_email: email,
        user_name: displayName,
        timestamp: new Date().toISOString(),
        locale: LOCALE
      });
    }
  } catch (e) {
    console.warn("EmailJS notification failed:", e);
  }

  showStatus(t("welcome_registered"), false);
}

async function handleSignOut() {
  try {
    await signOut(auth);
    location.reload();
  } catch (e) {
    console.error("Sign-out error:", e);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// VISIT COUNTER (v1.0.1, S28) — уникальные визиты через Firestore stats/visits
// ═══════════════════════════════════════════════════════════════════════
//
// Механика:
//  - При первом заходе с браузера (нет localStorage флага) инкрементим
//    stats/visits.count на +1 и ставим флаг навсегда.
//  - При повторных заходах — только читаем и показываем число, не инкрементим.
//  - Один общий счётчик на все локали (index/ru/he делят stats/visits).
//  - Защита в firestore.rules: update разрешён только как count+1, нельзя
//    обнулить/записать произвольное.
//
// Накрутка возможна (чистка localStorage + рефреш), но для солопроекта это
// приемлемая честная метрика "сколько уникальных браузеров видели сайт".

const VISIT_LS_KEY = "cargolog_visited_v1";

async function initVisitCounter() {
  const el = document.getElementById("visit-counter");
  if (!el) return; // счётчика нет на этой странице (например versions.html)

  const ref = doc(db, "stats", "visits");
  const alreadyVisited = localStorage.getItem(VISIT_LS_KEY) === "1";

  try {
    if (!alreadyVisited) {
      // Первый визит с этого браузера — инкрементим.
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(ref, { count: snap.data().count + 1 }, { merge: false });
      } else {
        // Документа ещё нет — создаём с count: 1 (разрешено правилом create).
        await setDoc(ref, { count: 1 });
      }
      localStorage.setItem(VISIT_LS_KEY, "1");
    }

    // Читаем актуальное значение (после возможного инкремента) и показываем.
    const fresh = await getDoc(ref);
    const count = fresh.exists() ? fresh.data().count : 0;
    renderVisitCounter(el, count);
  } catch (e) {
    console.warn("Visit counter failed:", e);
    // Тихо прячем элемент если счётчик не сработал — не ломаем страницу.
    el.classList.add("hidden");
  }
}

function renderVisitCounter(el, count) {
  // Формат числа с разделителями: 1234 → 1,234
  const formatted = Number(count).toLocaleString(
    LOCALE === "ru" ? "ru-RU" : LOCALE === "he" ? "he-IL" : "en-US"
  );
  const label =
    LOCALE === "ru" ? "посещений" :
    LOCALE === "he" ? "ביקורים" :
    "visits";
  el.innerHTML = `<i class="fa-solid fa-eye mr-1"></i> ${formatted} ${label}`;
  el.classList.remove("hidden");
}

// ═══════════════════════════════════════════════════════════════════════
// VERSIONS (existing — не трогаем, только переиспользуем)
// ═══════════════════════════════════════════════════════════════════════

async function loadVersions(maxCount = null) {
  const container = document.getElementById("versions-list");
  if (!container) return;
  try {
    let q;
    if (maxCount) {
      q = query(
        collection(db, "version_history"),
        orderBy("releasedAt", "desc"),
        limit(maxCount)
      );
    } else {
      q = query(collection(db, "version_history"), orderBy("releasedAt", "desc"));
    }
    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML = `<p class="text-gray-500 text-center py-8">No versions yet.</p>`;
      return;
    }

    const filtered = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data.locale || data.locale === LOCALE) {
        filtered.push({ id: d.id, ...data });
      }
    });

    if (filtered.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-center py-8">No versions for this language yet.</p>`;
      return;
    }

    const isAdmin = auth.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email);
    container.innerHTML = filtered.map((v) => renderVersionCard(v, isAdmin)).join("");

    if (isAdmin) {
      container.querySelectorAll("[data-delete-version]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.currentTarget.dataset.deleteVersion;
          if (confirm(t("confirm_delete_version"))) {
            try {
              await deleteDoc(doc(db, "version_history", id));
              loadVersions(maxCount);
            } catch (err) {
              alert("Delete failed: " + err.message);
            }
          }
        });
      });
    }
  } catch (e) {
    console.error("loadVersions error:", e);
    container.innerHTML = `<p class="text-red-500 text-center py-8">Failed to load versions.</p>`;
  }
}

function renderVersionCard(v, isAdmin) {
  const date = v.releasedAt && v.releasedAt.toDate
    ? v.releasedAt.toDate().toLocaleDateString(LOCALE === "he" ? "he-IL" : LOCALE === "ru" ? "ru-RU" : "en-US",
        { year: "numeric", month: "long", day: "numeric" })
    : "";
  const changesHtml = (v.changes || "")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => `<li class="text-gray-700">${escapeHtml(l.trim())}</li>`)
    .join("");

  const adminBtn = isAdmin
    ? `<button data-delete-version="${v.id}" class="text-red-500 hover:text-red-700 text-sm ml-2" title="Delete">
         <i class="fa-solid fa-trash"></i>
       </button>`
    : "";

  return `
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-4">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="text-2xl font-bold text-gray-900">v${escapeHtml(v.version || "")}</h3>
          <p class="text-sm text-gray-500">${date}</p>
        </div>
        ${adminBtn}
      </div>
      <ul class="list-disc list-inside space-y-1">${changesHtml}</ul>
    </div>
  `;
}

function setupVersionForm() {
  const form = document.getElementById("admin-add-version-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const version = form.querySelector("[name=version]").value.trim();
    const changes = form.querySelector("[name=changes]").value.trim();
    const locale = form.querySelector("[name=locale]").value;
    if (!version || !changes || !locale) return;

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    try {
      await addDoc(collection(db, "version_history"), {
        version, changes, locale,
        releasedAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.email : "unknown"
      });
      form.reset();
      loadVersions();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.origLabel || "Save";
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SITE CONTENT (texts) — Firestore: site_content/{locale}
// ═══════════════════════════════════════════════════════════════════════
//
// Document structure (один документ на локаль):
// {
//   hero: { title_html, subtitle },
//   features: [{ title, description }, ...],   // "What CargoLog does"
//   reasons:  [string, ...],                    // "Why drivers choose"
//   tech:     [string, ...],                    // "Technical Details"
//   audience: string,                           // "Who is it for"
//   updatedAt
// }
// Если документа нет — рендер использует fallback из HTML (статика).
// ═══════════════════════════════════════════════════════════════════════

async function loadSiteContent() {
  // Подмена текстов на индексе. Если документ не существует — оставляем статику.
  let data;
  try {
    const snap = await getDoc(doc(db, "site_content", LOCALE));
    if (!snap.exists()) return;
    data = snap.data();
  } catch (e) {
    console.warn("loadSiteContent failed:", e);
    return;
  }

  // Hero
  const heroTitle = document.getElementById("content-hero-title");
  const heroSubtitle = document.getElementById("content-hero-subtitle");
  if (heroTitle && data.hero?.title_html) heroTitle.innerHTML = data.hero.title_html;
  if (heroSubtitle && data.hero?.subtitle) heroSubtitle.textContent = data.hero.subtitle;

  // Features
  const featuresBox = document.getElementById("content-features");
  if (featuresBox && Array.isArray(data.features)) {
    featuresBox.innerHTML = data.features.map((f) => `
      <div>
        <h4 class="font-bold text-xl text-gray-900 mb-2">${escapeHtml(f.title || "")}</h4>
        <p>${escapeHtml(f.description || "")}</p>
      </div>
    `).join("");
  }

  // Reasons
  const reasonsBox = document.getElementById("content-reasons");
  if (reasonsBox && Array.isArray(data.reasons)) {
    reasonsBox.innerHTML = data.reasons.map((r) => `
      <li><i class="fa-solid fa-check text-orange-500 mr-2"></i> ${escapeHtml(r)}</li>
    `).join("");
  }

  // Tech
  const techBox = document.getElementById("content-tech");
  if (techBox && Array.isArray(data.tech)) {
    techBox.innerHTML = data.tech.map((line) => `
      <li><i class="fa-solid fa-circle-dot text-gray-400 mr-2"></i> ${escapeHtml(line)}</li>
    `).join("");
  }

  // Audience
  const audienceBox = document.getElementById("content-audience");
  if (audienceBox && data.audience) {
    audienceBox.textContent = data.audience;
  }
}

function setupContentForm() {
  const localeSelect = document.getElementById("content-locale");
  if (!localeSelect) return;

  // При смене локали — подгружаем текущее содержимое в поля
  localeSelect.addEventListener("change", () => loadContentIntoForm(localeSelect.value));
  loadContentIntoForm(localeSelect.value);

  // Кнопки "Save" по секциям — каждая обновляет только свой блок через updateDoc().
  // setDoc с merge: true создаст документ если его нет, либо обновит только указанные поля.
  document.querySelectorAll("[data-save-section]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const section = btn.dataset.saveSection;
      const locale = localeSelect.value;
      const origLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saving…";

      try {
        const partial = buildSectionUpdate(section);
        partial.updatedAt = serverTimestamp();
        partial.updatedBy = auth.currentUser ? auth.currentUser.email : "unknown";
        // setDoc with {merge:true} обновляет только переданные поля.
        // Это безопаснее чем updateDoc — работает и когда документа ещё нет.
        await setDoc(doc(db, "site_content", locale), partial, { merge: true });
        // Краткое подтверждение в кнопке вместо alert
        btn.textContent = "✓ Saved";
        setTimeout(() => { btn.textContent = origLabel; btn.disabled = false; }, 1500);
      } catch (err) {
        alert("Save failed: " + err.message);
        btn.textContent = origLabel;
        btn.disabled = false;
      }
    });
  });
}

// Собирает partial-объект для setDoc{merge:true} по секции.
// Возвращает только те поля которые относятся к секции — остальные не трогаются.
function buildSectionUpdate(section) {
  switch (section) {
    case "hero":
      return {
        hero: {
          title_html: document.getElementById("content-hero-title-input").value,
          subtitle:   document.getElementById("content-hero-subtitle-input").value,
        },
      };
    case "features":
      return {
        features: parseFeatures(document.getElementById("content-features-input").value),
      };
    case "reasons":
      return {
        reasons: parseLines(document.getElementById("content-reasons-input").value),
      };
    case "tech":
      return {
        tech: parseLines(document.getElementById("content-tech-input").value),
      };
    case "audience":
      return {
        audience: document.getElementById("content-audience-input").value,
      };
    default:
      throw new Error("Unknown section: " + section);
  }
}

async function loadContentIntoForm(locale) {
  // Все ID полей в Content tab. Если каких-то нет в DOM — фрагмент не на этой странице.
  const ids = [
    "content-hero-title-input",
    "content-hero-subtitle-input",
    "content-features-input",
    "content-reasons-input",
    "content-tech-input",
    "content-audience-input",
  ];
  const els = ids.map((id) => document.getElementById(id));
  if (els.some((e) => !e)) return; // не на admin-странице

  try {
    const snap = await getDoc(doc(db, "site_content", locale));
    if (!snap.exists()) {
      els.forEach((e) => { e.value = ""; });
      return;
    }
    const d = snap.data();
    els[0].value = d.hero?.title_html || "";
    els[1].value = d.hero?.subtitle || "";
    els[2].value = (d.features || []).map(
      (f) => `${f.title || ""} :: ${f.description || ""}`
    ).join("\n");
    els[3].value = (d.reasons || []).join("\n");
    els[4].value = (d.tech    || []).join("\n");
    els[5].value = d.audience || "";
  } catch (e) {
    console.warn("loadContentIntoForm:", e);
  }
}

// "Title :: Description" → { title, description }
function parseFeatures(text) {
  return text.split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      const idx = line.indexOf("::");
      if (idx === -1) return { title: line, description: "" };
      return {
        title:       line.slice(0, idx).trim(),
        description: line.slice(idx + 2).trim(),
      };
    });
}

function parseLines(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════
// SCREENSHOTS — GitHub репо как хостинг + Firestore site_screenshots
// ═══════════════════════════════════════════════════════════════════════
//
// Firestore document: { fileName, githubPath, sha, order, createdAt, createdBy }
// Файл лежит в GitHub: screenshots/{fileName}
// На фронте URL: https://germormdev.github.io/screenshots/{fileName}
// ═══════════════════════════════════════════════════════════════════════

function getGitHubPat() {
  return localStorage.getItem(PAT_LS_KEY) || "";
}

function setGitHubPat(pat) {
  localStorage.setItem(PAT_LS_KEY, pat);
}

function clearGitHubPat() {
  localStorage.removeItem(PAT_LS_KEY);
}

async function loadScreenshots() {
  // 30.07.2026: главная галерея статическая — кадры лежат в репозитории рядом
  // со страницей (screen1..8.png). Раньше эта функция ВСЕГДА перезаписывала
  // контейнер: либо записями из Firestore, либо захардкоженной тройкой
  // screen1/2/3 — поэтому на сайте показывались три кадра, что бы ни лежало в
  // HTML. Управление лентой из админки отключено сознательно; видео и тексты
  // по-прежнему из Firestore.
  return;
}

async function loadScreenshotsAdmin() {
  const container = document.getElementById("admin-screenshots-list");
  if (!container) return;
  try {
    const snap = await getDocs(query(collection(db, "site_screenshots"), orderBy("order", "asc")));
    if (snap.empty) {
      container.innerHTML = `<p class="text-gray-500 text-sm">No screenshots in Firestore yet. Use the form above to add.</p>`;
      return;
    }
    const html = [];
    snap.forEach((d) => {
      const data = d.data();
      const url = `${GITHUB_SCREENSHOTS_DIR}/${data.fileName}`;
      html.push(`
        <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border">
          <img src="${escapeHtml(url)}" class="w-16 h-28 object-cover rounded border" alt="">
          <div class="flex-1 text-sm">
            <div class="font-mono text-xs text-gray-700">${escapeHtml(data.fileName)}</div>
            <div class="text-xs text-gray-500">order: ${data.order ?? "—"}</div>
          </div>
          <button data-delete-screenshot="${d.id}"
                  data-file="${escapeHtml(data.fileName)}"
                  data-sha="${escapeHtml(data.sha || "")}"
                  class="text-red-500 hover:text-red-700 text-sm">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `);
    });
    container.innerHTML = html.join("");

    container.querySelectorAll("[data-delete-screenshot]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.deleteScreenshot;
        const fileName = e.currentTarget.dataset.file;
        const sha = e.currentTarget.dataset.sha;
        if (!confirm(t("confirm_delete_screenshot"))) return;
        const pat = getGitHubPat();
        if (!pat) {
          alert("GitHub token not set. Click 'Set GitHub Token'.");
          return;
        }
        try {
          // Удаление из GitHub
          await deleteFromGitHub(`${GITHUB_SCREENSHOTS_DIR}/${fileName}`, sha, pat);
          // Удаление из Firestore
          await deleteDoc(doc(db, "site_screenshots", id));
          loadScreenshotsAdmin();
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      });
    });
  } catch (e) {
    console.warn("loadScreenshotsAdmin:", e);
  }
}

function setupScreenshotForm() {
  const form = document.getElementById("admin-add-screenshot-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = form.querySelector("[name=file]");
    const orderInput = form.querySelector("[name=order]");
    const file = fileInput.files[0];
    if (!file) return;

    const pat = getGitHubPat();
    if (!pat) {
      alert("GitHub token not set. Click 'Set GitHub Token' first.");
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading…";

    try {
      // Имя файла: timestamp + sanitized
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const fileName = `${Date.now()}_${safeName}`;
      const path = `${GITHUB_SCREENSHOTS_DIR}/${fileName}`;

      // Читаем base64
      const base64 = await fileToBase64(file);
      // Пушим в GitHub
      const sha = await uploadToGitHub(path, base64,
        `Add screenshot: ${fileName}`, pat);

      // Сохраняем метаданные в Firestore
      const order = parseInt(orderInput.value, 10) || 99;
      await addDoc(collection(db, "site_screenshots"), {
        fileName,
        githubPath: path,
        sha,
        order,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.email : "unknown",
      });

      form.reset();
      loadScreenshotsAdmin();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.origLabel || "Upload";
    }
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result;
      // result = "data:image/png;base64,XXXX..."
      const b64 = result.split(",")[1];
      resolve(b64);
    };
    r.onerror = () => reject(new Error("File read failed"));
    r.readAsDataURL(file);
  });
}

async function uploadToGitHub(path, base64Content, commitMessage, pat) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      content: base64Content,
      branch: GITHUB_BRANCH,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub upload ${res.status}: ${txt}`);
  }
  const json = await res.json();
  return json.content?.sha || "";
}

async function deleteFromGitHub(path, sha, pat) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Delete screenshot: ${path}`,
      sha,
      branch: GITHUB_BRANCH,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub delete ${res.status}: ${txt}`);
  }
}

function setupGitHubPatUI() {
  const btn = document.getElementById("btn-set-github-pat");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = getGitHubPat();
    const masked = current ? `${current.slice(0, 6)}…${current.slice(-4)}` : "(not set)";
    const next = prompt(
      `GitHub Personal Access Token (current: ${masked}).\n` +
      `Required scopes: contents:write on this repo.\n` +
      `Stored only in this browser's localStorage.\n\n` +
      `Enter new token (or empty string to clear):`,
      ""
    );
    if (next === null) return; // cancel
    if (next.trim() === "") {
      clearGitHubPat();
      alert("Token cleared.");
    } else {
      setGitHubPat(next.trim());
      alert("Token saved to localStorage.");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Admin UI gating
// ═══════════════════════════════════════════════════════════════════════

function updateAdminUI(user) {
  const adminBlock = document.getElementById("admin-block");
  const userBadge = document.getElementById("user-badge");
  // v1.0.1 (S28): кнопка "Admin login" в nav versions.html — прячем когда
  // уже залогинен админ (тогда виден user-badge с sign out).
  const adminLoginBtn = document.getElementById("btn-google-signin");

  if (user && ADMIN_EMAILS.includes(user.email)) {
    // На admin-странице (versions.html) — показываем админ-блок и badge
    if (adminBlock) adminBlock.classList.remove("hidden");
    // Залогинен — прячем кнопку входа (на versions.html в nav)
    if (adminLoginBtn && adminBlock) adminLoginBtn.classList.add("hidden");
    if (userBadge) {
      userBadge.classList.remove("hidden");
      userBadge.innerHTML = `
        <span class="text-gray-600 text-sm mr-2">${t("signed_in_as")} <strong>${escapeHtml(user.email)}</strong></span>
        <button id="btn-signout" class="text-orange-500 hover:underline text-sm">${t("sign_out")}</button>
      `;
      const signoutBtn = document.getElementById("btn-signout");
      if (signoutBtn) signoutBtn.addEventListener("click", handleSignOut);
    }
    // На обычных страницах (index/ru/he) — показываем баннер с кнопкой "Open admin panel"
    // (если #auth-status есть и admin-block отсутствует — значит мы не на admin-странице)
    if (!adminBlock && document.getElementById("auth-status")) {
      showAdminWelcome(user);
    }
    // Подгружаем админ-списки (только на versions.html, где они есть)
    loadScreenshotsAdmin();
  } else {
    if (adminBlock) adminBlock.classList.add("hidden");
    if (userBadge) userBadge.classList.add("hidden");
    // Не залогинен — показываем кнопку входа на versions.html
    if (adminLoginBtn && adminBlock) adminLoginBtn.classList.remove("hidden");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.getElementById("btn-google-signin");
  if (signinBtn) signinBtn.addEventListener("click", handleSignIn);

  setupVersionForm();
  setupContentForm();
  setupScreenshotForm();
  setupGitHubPatUI();

  // Публичный контент: тексты и скриншоты
  loadSiteContent();
  loadScreenshots();
  initVisitCounter();

  // Версии: если есть #versions-list-preview → 3 шт., иначе все
  if (document.getElementById("versions-list")) {
    const preview = document.body.dataset.versionsPreview === "true";
    loadVersions(preview ? 3 : null);
  }

  onAuthStateChanged(auth, (user) => {
    updateAdminUI(user);
    if (document.getElementById("versions-list")) {
      const preview = document.body.dataset.versionsPreview === "true";
      loadVersions(preview ? 3 : null);
    }
  });
});

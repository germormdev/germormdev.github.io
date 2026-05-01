// ═══════════════════════════════════════════════════════════════════════
// CargoLog Site — Auth & Tester Registration & Version History
// ═══════════════════════════════════════════════════════════════════════
//
// Используется на index.html, ru.html, he.html (кнопка Sign-In + 3 версии)
// и на versions.html (полный список + админ-форма).
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
  query, orderBy, limit, getDocs, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ── Firebase config (создан Firebase Console) ─────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBgS40KxwWoSn3vcL_k-m9C__qpIciS3nI",
  authDomain: "cargolog-28bdd.firebaseapp.com",
  projectId: "cargolog-28bdd",
  storageBucket: "cargolog-28bdd.firebasestorage.app",
  messagingSenderId: "948696748141",
  appId: "1:948696748141:web:4778e3f40fc52f054eaf64",
  measurementId: "G-1W3HBDDM7P"
};

// ── EmailJS config ─────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY = "hkEmjKw6XParMcuQ0";
const EMAILJS_SERVICE_ID = "service_gs58cka";
const EMAILJS_TEMPLATE_ID = "template_ot60bck";

// ── Whitelist админов для редактирования версий ───────────────────────
const ADMIN_EMAILS = ["germormdev@gmail.com", "ormgerm@gmail.com"];

// ── Инициализация ──────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// EmailJS инициализируется при загрузке страницы из глобального scope
if (typeof emailjs !== "undefined") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// ── Локализация UI-сообщений ──────────────────────────────────────────
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
    confirm_delete_version: "Delete this version entry?",
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
    confirm_delete_version: "Удалить эту запись версии?",
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
    confirm_delete_version: "למחוק את רשומת הגרסה הזו?",
  }
};
const t = (key) => (I18N[LOCALE] || I18N.en)[key] || key;

// ── Утилита: показ статуса в кнопке/баннере ───────────────────────────
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

// ── Sign-In кнопка: вешаем обработчик ─────────────────────────────────
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
    await registerTester(user);
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

// ── Регистрация тестера в Firestore + уведомление по email ────────────
async function registerTester(user) {
  const email = user.email;
  const uid = user.uid;
  const displayName = user.displayName || "";

  // Проверяем, не зарегистрирован ли уже
  const existing = await getDoc(doc(db, "pending_testers", uid));
  if (existing.exists()) {
    showStatus(t("welcome_already_registered"), false);
    return;
  }

  // Записываем в Firestore
  await setDoc(doc(db, "pending_testers", uid), {
    email,
    displayName,
    photoURL: user.photoURL || "",
    locale: LOCALE,
    userAgent: navigator.userAgent || "",
    createdAt: serverTimestamp(),
    status: "pending"
  });

  // Шлём уведомление через EmailJS — не критично, если не сработает
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

// ── Sign-out ──────────────────────────────────────────────────────────
async function handleSignOut() {
  try {
    await signOut(auth);
    location.reload();
  } catch (e) {
    console.error("Sign-out error:", e);
  }
}

// ── Подгрузка последних N версий ──────────────────────────────────────
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

    // Фильтруем по текущей локали страницы
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

    // Обработчики удаления для админа
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Админ-форма добавления версии (на versions.html) ──────────────────
function setupAdminForm() {
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
        version,
        changes,
        locale,
        releasedAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.email : "unknown"
      });
      form.reset();
      // Перезагружаем список — берём текущий язык страницы
      loadVersions();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.origLabel || "Save";
    }
  });
}

// ── UI: показ/скрытие админ-блока в зависимости от логина ─────────────
function updateAdminUI(user) {
  const adminBlock = document.getElementById("admin-block");
  const userBadge = document.getElementById("user-badge");

  if (user && ADMIN_EMAILS.includes(user.email)) {
    if (adminBlock) adminBlock.classList.remove("hidden");
    if (userBadge) {
      userBadge.classList.remove("hidden");
      userBadge.innerHTML = `
        <span class="text-gray-600 text-sm mr-2">${t("signed_in_as")} <strong>${escapeHtml(user.email)}</strong></span>
        <button id="btn-signout" class="text-orange-500 hover:underline text-sm">${t("sign_out")}</button>
      `;
      const signoutBtn = document.getElementById("btn-signout");
      if (signoutBtn) signoutBtn.addEventListener("click", handleSignOut);
    }
  } else {
    if (adminBlock) adminBlock.classList.add("hidden");
    if (userBadge) userBadge.classList.add("hidden");
  }
}

// ── Главный entry point ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.getElementById("btn-google-signin");
  if (signinBtn) signinBtn.addEventListener("click", handleSignIn);

  setupAdminForm();

  // Подгрузка версий: если есть #versions-list-preview → 3 шт., иначе все
  if (document.getElementById("versions-list")) {
    const preview = document.body.dataset.versionsPreview === "true";
    loadVersions(preview ? 3 : null);
  }

  onAuthStateChanged(auth, (user) => {
    updateAdminUI(user);
    // Перезагружаем версии чтобы показать кнопки Delete админу
    if (document.getElementById("versions-list")) {
      const preview = document.body.dataset.versionsPreview === "true";
      loadVersions(preview ? 3 : null);
    }
  });
});

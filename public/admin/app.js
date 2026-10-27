"use strict";

const MESSAGES = {
  zh: {
    appName: "短網址",
    logout: "登出",
    notConfiguredTitle: "尚未設定密碼",
    notConfiguredBody: "請在 Cloudflare 後台替這個 Worker 加上名為 ADMIN_PASSWORD 的 Secret，然後重新整理這個頁面。",
    loginTitle: "登入",
    password: "密碼",
    login: "登入",
    createTitle: "建立短網址",
    targetUrl: "目標網址",
    slug: "短碼",
    slugHint: "已自動產生，可以改成你想要的",
    slugPlaceholder: "輸入網址後自動產生",
    reroll: "換一個",
    note: "備註（選填）",
    noteLabel: "備註",
    notePlaceholder: "方便之後搜尋",
    create: "建立",
    created: "已建立",
    copy: "複製",
    copied: "已複製",
    linksTitle: "所有短網址",
    total: (n) => `共 ${n} 條`,
    searchPlaceholder: "搜尋短碼、網址或備註",
    noLinks: "還沒有短網址，從上面建立第一條吧。",
    noResults: "找不到符合的短網址。",
    prev: "上一頁",
    next: "下一頁",
    pageInfo: (page, pages) => `${page} / ${pages}`,
    clicks: (n) => `${n.toLocaleString()} 次點擊`,
    justNow: "剛剛",
    edit: "編輯",
    delete: "刪除",
    editTitle: "編輯短網址",
    cancel: "取消",
    save: "儲存",
    saved: "已儲存",
    deleteTitle: "刪除短網址？",
    deleteConfirm: (slug) => `「${slug}」刪除後就無法再使用，這個動作無法復原。`,
    deleted: "已刪除",
    importTitle: "從舊版 KV 匯入",
    importBody: "偵測到 LEGACY_KV 綁定。可以把舊版 Url-Shorten-Worker 的短網址匯入到這裡，已存在的短碼會略過。",
    importButton: "開始匯入",
    importing: "匯入中…",
    importDone: (imported, skipped) => `匯入 ${imported} 條，略過 ${skipped} 筆。`,
    errors: {
      wrong_password: "密碼錯誤。",
      wrongPasswordRemaining: (n) => (n > 0 ? `密碼錯誤，還可以再試 ${n} 次。` : "密碼錯誤，嘗試次數已用完，請 15 分鐘後再試。"),
      too_many_attempts: (minutes) => `嘗試太多次，請 ${minutes} 分鐘後再試。`,
      not_configured: "尚未設定 ADMIN_PASSWORD。",
      invalid_url: "請輸入以 http:// 或 https:// 開頭的完整網址。",
      invalid_slug: "短碼只能包含文字、數字和 - _ . ~，不能以 . 開頭，最多 64 字。",
      reserved_slug: "這個短碼是系統保留字，請換一個。",
      slug_taken: "這個短碼已經有人用了。",
      invalid_note: "備註最多 500 字。",
      not_found: "找不到這條短網址，可能已被刪除。",
      network: "連線失敗，請稍後再試。",
      unknown: "發生錯誤，請稍後再試。",
    },
  },
  en: {
    appName: "Short links",
    logout: "Log out",
    notConfiguredTitle: "No password set",
    notConfiguredBody: "Add a secret named ADMIN_PASSWORD to this Worker in the Cloudflare dashboard, then reload this page.",
    loginTitle: "Log in",
    password: "Password",
    login: "Log in",
    createTitle: "New short link",
    targetUrl: "Destination URL",
    slug: "Slug",
    slugHint: "Picked at random. Change it if you like.",
    slugPlaceholder: "Fills in once you enter a URL",
    reroll: "Pick another",
    note: "Note (optional)",
    noteLabel: "Note",
    notePlaceholder: "Helps you find it later",
    create: "Create",
    created: "Created",
    copy: "Copy",
    copied: "Copied",
    linksTitle: "All links",
    total: (n) => `${n} total`,
    searchPlaceholder: "Search slugs, URLs or notes",
    noLinks: "No links yet. Create your first one above.",
    noResults: "No links match your search.",
    prev: "Previous",
    next: "Next",
    pageInfo: (page, pages) => `${page} / ${pages}`,
    clicks: (n) => `${n.toLocaleString()} ${n === 1 ? "click" : "clicks"}`,
    justNow: "just now",
    edit: "Edit",
    delete: "Delete",
    editTitle: "Edit link",
    cancel: "Cancel",
    save: "Save",
    saved: "Saved",
    deleteTitle: "Delete link?",
    deleteConfirm: (slug) => `"${slug}" will stop working. This can't be undone.`,
    deleted: "Deleted",
    importTitle: "Import from old KV",
    importBody: "A LEGACY_KV binding was found. You can import links from an old Url-Shorten-Worker here. Slugs that already exist are skipped.",
    importButton: "Start import",
    importing: "Importing…",
    importDone: (imported, skipped) => `Imported ${imported}, skipped ${skipped}.`,
    errors: {
      wrong_password: "Wrong password.",
      wrongPasswordRemaining: (n) =>
        n > 0 ? `Wrong password. ${n} ${n === 1 ? "try" : "tries"} left.` : "Wrong password. No tries left; please wait 15 minutes.",
      too_many_attempts: (minutes) => `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
      not_configured: "ADMIN_PASSWORD is not set.",
      invalid_url: "Enter a full URL starting with http:// or https://.",
      invalid_slug: "Slugs may contain letters, digits and - _ . ~, can't start with a dot, and are at most 64 characters.",
      reserved_slug: "That slug is reserved. Please pick another.",
      slug_taken: "That slug is already taken.",
      invalid_note: "Notes are limited to 500 characters.",
      not_found: "That link no longer exists.",
      network: "Network error. Please try again.",
      unknown: "Something went wrong. Please try again.",
    },
  },
};

const PAGE_SIZE = 20;
const $ = (id) => document.getElementById(id);

const state = {
  lang: pickLanguage(),
  query: "",
  page: 1,
  total: 0,
  items: [],
  editing: null,
};

function pickLanguage() {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "zh" || saved === "en") return saved;
  } catch {}
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(key, ...args) {
  const value = MESSAGES[state.lang][key];
  return typeof value === "function" ? value(...args) : value;
}

function errorText(code, ...args) {
  const errors = MESSAGES[state.lang].errors;
  const value = errors[code] ?? errors.unknown;
  return typeof value === "function" ? value(...args) : value;
}

function applyLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-Hant" : "en";
  document.title = `${location.host} · ${t("appName")}`;
  $("lang-toggle").textContent = state.lang === "zh" ? "EN" : "中文";
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
}

// --- API ---

class ApiError extends Error {
  constructor(code, status, data = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("network", 0);
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && data.error === "unauthorized") {
    showView("login");
    throw new ApiError("unauthorized", 401);
  }
  if (!response.ok) throw new ApiError(data.error ?? "unknown", response.status, data);
  return data;
}

// --- Helpers ---

function showView(name) {
  for (const id of ["loading", "not-configured", "login", "app"]) $(id).hidden = id !== name;
  $("logout").hidden = name !== "app";
}

function shortUrl(slug) {
  return `${location.origin}/${slug}`;
}

function shortHref(slug) {
  return `${location.origin}/${encodeURIComponent(slug)}`;
}

function showError(el, error) {
  if (error.code === "unauthorized") return;
  el.textContent = errorText(error.code);
  el.hidden = false;
}

let toastTimer;
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t("copied"));
  } catch {
    window.prompt("", text);
  }
}

function formatDate(seconds) {
  const date = new Date(seconds * 1000);
  const diff = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(state.lang === "zh" ? "zh-Hant" : "en", { numeric: "auto" });
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size) return rtf.format(Math.round(diff / size), unit);
  }
  return t("justNow");
}

function fullDate(seconds) {
  return new Date(seconds * 1000).toLocaleString(state.lang === "zh" ? "zh-Hant" : "en");
}

// --- Link list ---

let listRequest = 0;

async function loadLinks() {
  const requestId = ++listRequest;
  const params = new URLSearchParams({ page: String(state.page), pageSize: String(PAGE_SIZE) });
  if (state.query) params.set("q", state.query);
  try {
    const data = await api(`/api/links?${params}`);
    // Ignore responses that arrive after a newer search was started.
    if (requestId !== listRequest) return;
    state.items = data.items;
    state.total = data.total;
    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (state.page > pages) {
      state.page = pages;
      return loadLinks();
    }
    renderLinks();
  } catch (error) {
    if (error.code !== "unauthorized") toast(errorText(error.code));
  }
}

function renderLinks() {
  const list = $("links");
  const template = $("link-template");
  list.replaceChildren();

  for (const link of state.items) {
    const item = template.content.firstElementChild.cloneNode(true);
    const slugEl = item.querySelector(".slug");
    slugEl.textContent = `/${link.slug}`;
    slugEl.href = shortHref(link.slug);
    item.querySelector(".copy").title = t("copy");
    item.querySelector(".copy").addEventListener("click", () => copy(shortUrl(link.slug)));
    const target = item.querySelector(".target");
    target.textContent = link.url;
    target.href = link.url;
    target.title = link.url;
    item.querySelector(".note").textContent = link.note;
    item.querySelector(".clicks").textContent = t("clicks", link.clicks);
    const date = item.querySelector(".date");
    date.textContent = formatDate(link.created_at);
    date.title = fullDate(link.created_at);
    const editButton = item.querySelector(".edit");
    editButton.textContent = t("edit");
    editButton.addEventListener("click", () => openEdit(link));
    const deleteButton = item.querySelector(".delete");
    deleteButton.textContent = t("delete");
    deleteButton.addEventListener("click", () => confirmDelete(link));
    list.append(item);
  }

  const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
  $("total").textContent = t("total", state.total);
  $("empty").hidden = state.items.length > 0;
  $("empty").textContent = state.query ? t("noResults") : t("noLinks");
  $("pager").hidden = pages <= 1;
  $("page-info").textContent = t("pageInfo", state.page, pages);
  $("prev").disabled = state.page <= 1;
  $("next").disabled = state.page >= pages;
}

// --- Create ---

// Same alphabet and length as randomSlug() in src/links.ts.
const SLUG_ALPHABET = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const RANDOM_SLUG_LENGTH = 6;

function randomSlug() {
  const limit = 256 - (256 % SLUG_ALPHABET.length);
  let slug = "";
  while (slug.length < RANDOM_SLUG_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(RANDOM_SLUG_LENGTH * 2))) {
      if (byte < limit && slug.length < RANDOM_SLUG_LENGTH) slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
    }
  }
  return slug;
}

// True while the slug field holds a slug we picked rather than one the user typed.
let slugIsRandom = false;

function setRandomSlug(slug) {
  $("create-form").slug.value = slug;
  slugIsRandom = slug !== "";
  $("slug-hint").hidden = !slugIsRandom;
}

function onCreateUrlInput(event) {
  const hasUrl = event.target.value.trim() !== "";
  const slugField = $("create-form").slug;
  if (hasUrl && slugField.value === "") setRandomSlug(randomSlug());
  else if (!hasUrl && slugIsRandom) setRandomSlug("");
}

function onCreateSlugInput() {
  slugIsRandom = false;
  $("slug-hint").hidden = true;
}

async function onCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  $("create-error").hidden = true;
  button.disabled = true;
  try {
    let link;
    for (let attempt = 0; ; attempt++) {
      try {
        ({ link } = await api("/api/links", {
          method: "POST",
          body: { url: form.url.value, slug: form.slug.value, note: form.note.value },
        }));
        break;
      } catch (error) {
        // A picked slug clashing with an existing one is rare; just pick again.
        if (error.code !== "slug_taken" || !slugIsRandom || attempt >= 3) throw error;
        setRandomSlug(randomSlug());
      }
    }
    form.reset();
    setRandomSlug("");
    const resultLink = $("result-link");
    resultLink.textContent = shortUrl(link.slug);
    resultLink.href = shortHref(link.slug);
    $("create-result").hidden = false;
    state.query = "";
    state.page = 1;
    $("search").value = "";
    await loadLinks();
  } catch (error) {
    showError($("create-error"), error);
  } finally {
    button.disabled = false;
  }
}

// --- Edit ---

function openEdit(link) {
  state.editing = link;
  const form = $("edit-form");
  $("edit-slug").textContent = shortUrl(link.slug);
  form.url.value = link.url;
  form.note.value = link.note;
  $("edit-error").hidden = true;
  $("edit-dialog").showModal();
}

async function onEditSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  $("edit-error").hidden = true;
  button.disabled = true;
  try {
    await api(`/api/links/${encodeURIComponent(state.editing.slug)}`, {
      method: "PATCH",
      body: { url: form.url.value, note: form.note.value },
    });
    $("edit-dialog").close();
    toast(t("saved"));
    await loadLinks();
  } catch (error) {
    showError($("edit-error"), error);
  } finally {
    button.disabled = false;
  }
}

// --- Delete ---

let pendingDelete = null;

function confirmDelete(link) {
  pendingDelete = link;
  $("confirm-text").textContent = t("deleteConfirm", link.slug);
  $("confirm-dialog").showModal();
}

// The form uses method="dialog", so either button closes the dialog by itself.
async function onConfirmSubmit(event) {
  const link = pendingDelete;
  pendingDelete = null;
  if (!link || event.submitter?.value !== "confirm") return;
  try {
    await api(`/api/links/${encodeURIComponent(link.slug)}`, { method: "DELETE", body: {} });
    toast(t("deleted"));
    await loadLinks();
  } catch (error) {
    if (error.code !== "unauthorized") toast(errorText(error.code));
  }
}

// --- Import ---

async function onImport() {
  const button = $("import");
  const output = $("import-result");
  button.disabled = true;
  button.textContent = t("importing");
  try {
    const result = await api("/api/import-kv", { method: "POST", body: {} });
    const lines = [t("importDone", result.imported, result.skipped.length)];
    for (const { key, reason } of result.skipped) lines.push(`- ${key}: ${reason}`);
    output.textContent = lines.join("\n");
    output.hidden = false;
    await loadLinks();
  } catch (error) {
    if (error.code !== "unauthorized") toast(errorText(error.code));
  } finally {
    button.disabled = false;
    button.textContent = t("importButton");
  }
}

// --- Session ---

async function enterApp(session) {
  showView("app");
  $("import-card").hidden = !session.legacyKv;
  await loadLinks();
}

async function onLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  $("login-error").hidden = true;
  button.disabled = true;
  try {
    await api("/api/login", { method: "POST", body: { password: form.password.value } });
    form.reset();
    await enterApp(await api("/api/session"));
  } catch (error) {
    const el = $("login-error");
    if (error.code === "too_many_attempts") {
      el.textContent = errorText(error.code, Math.ceil(error.data.retryAfter / 60));
      el.hidden = false;
    } else if (error.code === "wrong_password" && Number.isInteger(error.data.remaining)) {
      el.textContent = errorText("wrongPasswordRemaining", error.data.remaining);
      el.hidden = false;
    } else {
      showError(el, error);
    }
  } finally {
    button.disabled = false;
  }
}

async function onLogout() {
  await api("/api/logout", { method: "POST", body: {} }).catch(() => {});
  state.items = [];
  $("links").replaceChildren();
  $("create-result").hidden = true;
  showView("login");
}

async function init() {
  applyLanguage();
  $("site-name").textContent = location.host;
  for (const el of document.querySelectorAll(".prefix")) {
    el.textContent = `${location.host}/`;
    el.title = `${location.origin}/`;
  }

  $("lang-toggle").addEventListener("click", () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    try {
      localStorage.setItem("lang", state.lang);
    } catch {}
    applyLanguage();
    renderLinks();
  });
  $("logout").addEventListener("click", onLogout);
  $("login-form").addEventListener("submit", onLogin);
  $("create-form").addEventListener("submit", onCreate);
  $("create-form").url.addEventListener("input", onCreateUrlInput);
  $("create-form").slug.addEventListener("input", onCreateSlugInput);
  $("reroll").addEventListener("click", () => setRandomSlug(randomSlug()));
  $("result-copy").addEventListener("click", () => copy($("result-link").textContent));
  $("edit-form").addEventListener("submit", onEditSubmit);
  $("edit-cancel").addEventListener("click", () => $("edit-dialog").close());
  $("confirm-form").addEventListener("submit", onConfirmSubmit);
  $("import").addEventListener("click", onImport);
  $("prev").addEventListener("click", () => {
    state.page--;
    loadLinks();
  });
  $("next").addEventListener("click", () => {
    state.page++;
    loadLinks();
  });

  let searchTimer;
  $("search").addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = event.target.value.trim();
      state.page = 1;
      loadLinks();
    }, 250);
  });

  try {
    const session = await api("/api/session");
    if (!session.configured) showView("not-configured");
    else if (session.authenticated) await enterApp(session);
    else showView("login");
  } catch {
    showView("login");
  }
}

init();

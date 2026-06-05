/* 
 * Communicates with backend on http://localhost:3000
 */

const API_BASE = "http://localhost:3000";

// State
let wishlists = [];
let selectedWishlistId = null;

const state = {
  filter: "",
  sortBy: "createdAt",
  sortDir: "desc",
};

// DOM elements for easier access and better readibility in code below
const el = {
  list: document.getElementById("wishlistList"),
  empty: document.getElementById("emptyState"),
  status: document.getElementById("statusLine"),
  chips: document.getElementById("chips"),
  sidebar: document.querySelector(".sidebar"),

  filter: document.getElementById("filterTitle"),
  sortBy: document.getElementById("sortBy"),
  btnDir: document.getElementById("btnToggleDir"),

  btnBurger: document.getElementById("btnBurger"),
  btnCreateWishlist: document.getElementById("btnCreateWishlist"),
  btnCreateWishlistMobile: document.getElementById("btnCreateWishlistMobile"),


  statWishlists: document.getElementById("statWishlists"),
  statWishes: document.getElementById("statWishes"),
  statAvg: document.getElementById("statAvg"),
  topWishes: document.getElementById("topWishes"),

  dlg: document.getElementById("wishlistDialog"),
  dlgTitle: document.getElementById("dlgTitle"),
  dlgMeta: document.getElementById("dlgMeta"),
  dlgWishlistTitle: document.getElementById("dlgWishlistTitle"),
  btnSaveWishlistTitle: document.getElementById("btnSaveWishlistTitle"),
  btnDeleteWishlist: document.getElementById("btnDeleteWishlist"),
  dlgWishes: document.getElementById("dlgWishes"),
  newWishTitle: document.getElementById("newWishTitle"),
  newWishQty: document.getElementById("newWishQty"),
  btnAddWish: document.getElementById("btnAddWish"),

  createDlg: document.getElementById("createDialog"),
  createTitleInput: document.getElementById("createWishlistTitle"),
  btnCreateConfirm: document.getElementById("btnCreateConfirm"),

  toasts: document.getElementById("toasts")
};

// Helpers
function fmtDate(iso) {
  if (!iso) return "–";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("de-AT", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(d);
  } catch {
    return iso;
  }
}

function safeText(s) {
  return (s ?? "").toString();
}

function toast(title, msg) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `
    <div class="toast__title">${escapeHtml(title)}</div>
    <div class="toast__msg">${escapeHtml(msg)}</div>
  `;
  el.toasts.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(2px)";
  }, 3200);
  setTimeout(() => node.remove(), 3800);
}

//better readibility in code 
function escapeHtml(str) {
  return safeText(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(text, ok = true) {
  el.status.textContent = text;
  el.status.style.color = ok ? "" : "var(--danger)";
}

function renderChips() {
  el.chips.replaceChildren();

  const chips = [];
  if (state.filter.trim()) chips.push({ label: `Filter: “${state.filter.trim()}”` });

  const sortLabel = state.sortBy === "title" ? "Titel" : "Erstelldatum";
  const dirLabel = state.sortDir === "asc" ? "aufsteigend" : "absteigend";
  chips.push({ label: `Sortierung: ${sortLabel} (${dirLabel})` });

  for (const c of chips) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = c.label;
    el.chips.appendChild(chip);
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${txt ? ` – ${txt}` : ""}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Data
async function fetchAll() {
  setStatus("Lade Wunschlisten…");
  try {
    wishlists = await api("/wishlist");
    setStatus(`Verbunden mit Backend (${API_BASE})`);
  } catch (e) {
    wishlists = [];
    setStatus(`Backend nicht erreichbar: ${e.message}`, false);
    toast("Fehler", "Backend nicht erreichbar. Starte zuerst das Backend auf localhost:3000.");
  }

  render();
}

// Rendering
function getVisibleWishlists() {
  const f = state.filter.trim().toLowerCase();
  let out = [...wishlists];

  if (f) {
    out = out.filter(wl => safeText(wl.title).toLowerCase().includes(f));
  }

  out.sort((a, b) => {
    let av, bv;
    if (state.sortBy === "title") {
      av = safeText(a.title).toLowerCase();
      bv = safeText(b.title).toLowerCase();
      if (av < bv) return state.sortDir === "asc" ? -1 : 1;
      if (av > bv) return state.sortDir === "asc" ? 1 : -1;
      return 0;
    }

    // createdAt
    av = new Date(a.createdAt || 0).getTime();
    bv = new Date(b.createdAt || 0).getTime();
    return state.sortDir === "asc" ? av - bv : bv - av;
  });

  return out;
}

function renderStats() {
  const wlCount = wishlists.length;
  let wishesCount = 0;

  const counts = new Map(); // title -> occurrences
  for (const wl of wishlists) {
    const wishes = Array.isArray(wl.Wishes) ? wl.Wishes : [];
    wishesCount += wishes.length;
    for (const w of wishes) {
      const key = safeText(w.title).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const avg = wlCount === 0 ? 0 : (wishesCount / wlCount);

  el.statWishlists.textContent = String(wlCount);
  el.statWishes.textContent = String(wishesCount);
  el.statAvg.textContent = wlCount === 0 ? "–" : avg.toFixed(1);

  // Top 3 wishes
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  el.topWishes.replaceChildren();
  if (top.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Noch keine Wünsche vorhanden.";
    el.topWishes.appendChild(li);
  } else {
    for (const [title, n] of top) {
      const li = document.createElement("li");
      li.textContent = `${title} (${n}×)`;
      el.topWishes.appendChild(li);
    }
  }
}

function renderWishlists() {
  const visible = getVisibleWishlists();
  el.list.replaceChildren();

  if (visible.length === 0) {
    el.empty.hidden = false;
    return;
  }

  el.empty.hidden = true;

  for (const wl of visible) {
    const wishes = Array.isArray(wl.Wishes) ? wl.Wishes : [];

    const card = document.createElement("article");
    card.className = "wl";

    const created = fmtDate(wl.createdAt);
    const updated = fmtDate(wl.updatedAt);

    const shortHint = wishes.length === 0
      ? "Keine Wünsche" : wishes.length === 1
        ? "1 Wunsch" : `${wishes.length} Wünsche`;

    const preview = wishes[0]?.title ? `z.B. “${safeText(wishes[0].title)}”` : "";

    card.innerHTML = `
      <div class="wl__head">
        <div style="min-width:0">
          <h3 class="wl__title" title="${escapeHtml(safeText(wl.title))}">${escapeHtml(safeText(wl.title) || "(ohne Titel)")}</h3>
          <p class="wl__meta">Erstellt: <strong>${escapeHtml(created)}</strong><br>Geändert: <strong>${escapeHtml(updated)}</strong></p>
          <div class="wl__badges">
            <span class="badge badge--ok">${escapeHtml(shortHint)}</span>
            <span class="badge badge--gold">${escapeHtml(preview || "–")}</span>
          </div>
        </div>
      </div>

      <div class="wl__actions">
        <button class="btn btn--primary" type="button" data-open="${wl.id}">Öffnen</button>
        <button class="btn" type="button" data-rename="${wl.id}">Titel ändern</button>
        <button class="btn btn--danger" type="button" data-delete="${wl.id}">Löschen</button>
      </div>
    `;

    card.querySelector("[data-open]").addEventListener("click", () => openWishlist(wl.id));
    card.querySelector("[data-rename]").addEventListener("click", () => quickRename(wl.id));
    card.querySelector("[data-delete]").addEventListener("click", () => deleteWishlist(wl.id));

    el.list.appendChild(card);
  }
}

function render() {
  renderChips();
  renderStats();
  renderWishlists();

  if (el.dlg.open && selectedWishlistId != null) {
    const wl = wishlists.find(w => String(w.id) === String(selectedWishlistId));
    if (wl) renderDialog(wl);
  }
}

// Wishlist actions
function openCreateDialog() {
  el.createTitleInput.value = "";
  if (typeof el.createDlg.showModal === "function") el.createDlg.showModal();
  else el.createDlg.setAttribute("open", "");
  el.createTitleInput.focus();
}

async function createWishlist() {
  const title = el.createTitleInput.value.trim();
  if (!title) {
    toast("Hinweis", "Bitte einen Titel eingeben.");
    el.createTitleInput.focus();
    return;
  }

  try {
    await api("/wishlist", {
      method: "POST",
      body: JSON.stringify({ title })
    });
    toast("Erstellt", `Wunschliste “${title}” wurde angelegt.`);

    el.createDlg.close();
    await fetchAll();

    const newest = [...wishlists].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (newest) openWishlist(newest.id);
  } catch (e) {
    toast("Fehler", e.message);
  }
}

async function quickRename(id) {
  const wl = wishlists.find(w => String(w.id) === String(id));
  if (!wl) return;

  const current = safeText(wl.title);
  const title = prompt("Neuer Titel der Wunschliste:", current);
  if (title == null) return;

  const trimmed = title.trim();
  if (!trimmed) {
    toast("Hinweis", "Titel darf nicht leer sein.");
    return;
  }

  try {
    await api(`/wishlist/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title: trimmed })
    });
    toast("Gespeichert", "Wunschliste wurde umbenannt.");
    await fetchAll();
  } catch (e) {
    toast("Fehler", e.message);
  }
}

async function deleteWishlist(id) {
  const wl = wishlists.find(w => String(w.id) === String(id));
  const name = wl ? safeText(wl.title) : `#${id}`;
  if (!confirm(`Wunschliste “${name}” wirklich löschen?`)) return;

  try {
    await api(`/wishlist/${id}`, { method: "DELETE" });
    toast("Gelöscht", "Wunschliste wurde gelöscht.");
    if (String(selectedWishlistId) === String(id)) {
      selectedWishlistId = null;
      if (el.dlg.open) el.dlg.close();
    }
    await fetchAll();
  } catch (e) {
    toast("Fehler", e.message);
  }
}

// Dialog: wishlist + wishes
async function openWishlist(id) {
  selectedWishlistId = id;

  try {
    const wl = await api(`/wishlist/${id}`);
    const idx = wishlists.findIndex(w => String(w.id) === String(id));
    if (idx >= 0) wishlists[idx] = wl;

    renderDialog(wl);

    if (typeof el.dlg.showModal === "function") el.dlg.showModal();
    else el.dlg.setAttribute("open", "");

    el.newWishTitle.focus();
  } catch (e) {
    toast("Fehler", e.message);
  }
}

function renderDialog(wl) {
  el.dlgTitle.textContent = `Wunschliste #${wl.id}`;
  el.dlgMeta.textContent = `Titel: ${safeText(wl.title) || "(ohne Titel)"} · erstellt ${fmtDate(wl.createdAt)} · geändert ${fmtDate(wl.updatedAt)}`;
  el.dlgWishlistTitle.value = safeText(wl.title);

  const wishes = Array.isArray(wl.Wishes) ? wl.Wishes : [];
  el.dlgWishes.replaceChildren();

  if (wishes.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Noch keine Wünsche – füge unten einen hinzu.";
    el.dlgWishes.appendChild(li);
    return;
  }

  for (const w of wishes) {
    const li = document.createElement("li");
    li.className = "wish";

    li.innerHTML = `
      <input type="text" value="${escapeHtml(safeText(w.title))}" aria-label="Wunsch Titel" />
      <input type="number" min="1" step="1" value="${Number.isFinite(w.quantity) ? w.quantity : (parseInt(w.quantity, 10) || 1)}" aria-label="Menge" />
      <div class="wish__actions">
        <button class="btn btn--primary" type="button" data-save>Speichern</button>
        <button class="btn btn--danger" type="button" data-del>Löschen</button>
      </div>
    `;

    const [titleInput, qtyInput] = li.querySelectorAll("input");

    li.querySelector("[data-save]").addEventListener("click", async () => {
      const newTitle = titleInput.value.trim();
      const newQty = parseInt(qtyInput.value, 10);

      if (!newTitle) {
        toast("Hinweis", "Titel darf nicht leer sein.");
        titleInput.focus();
        return;
      }
      if (!Number.isFinite(newQty) || newQty < 1) {
        toast("Hinweis", "Menge muss mindestens 1 sein.");
        qtyInput.focus();
        return;
      }

      try {
        await api(`/wish/${w.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: newTitle, quantity: newQty })
        });
        toast("Gespeichert", "Wunsch wurde aktualisiert.");
        await fetchAll();
      } catch (e) {
        toast("Fehler", e.message);
      }
    });

    li.querySelector("[data-del]").addEventListener("click", async () => {
      if (!confirm(`Wunsch “${safeText(w.title)}” löschen?`)) return;
      try {
        await api(`/wish/${w.id}`, { method: "DELETE" });
        toast("Gelöscht", "Wunsch wurde gelöscht.");
        await fetchAll();
      } catch (e) {
        toast("Fehler", e.message);
      }
    });

    el.dlgWishes.appendChild(li);
  }
}

async function saveWishlistTitle() {
  if (selectedWishlistId == null) return;
  const title = el.dlgWishlistTitle.value.trim();
  if (!title) {
    toast("Hinweis", "Titel darf nicht leer sein.");
    el.dlgWishlistTitle.focus();
    return;
  }

  try {
    await api(`/wishlist/${selectedWishlistId}`, {
      method: "PUT",
      body: JSON.stringify({ title })
    });
    toast("Gespeichert", "Wunschliste wurde aktualisiert.");
    await fetchAll();
  } catch (e) {
    toast("Fehler", e.message);
  }
}

async function deleteSelectedWishlist() {
  if (selectedWishlistId == null) return;
  await deleteWishlist(selectedWishlistId);
}

async function addWish() {
  if (selectedWishlistId == null) return;

  const title = el.newWishTitle.value.trim();
  const qty = parseInt(el.newWishQty.value, 10);

  if (!title) {
    toast("Hinweis", "Bitte einen Wunschtitel eingeben.");
    el.newWishTitle.focus();
    return;
  }
  if (!Number.isFinite(qty) || qty < 1) {
    toast("Hinweis", "Menge muss mindestens 1 sein.");
    el.newWishQty.focus();
    return;
  }

  try {
    await api(`/wishlist/${selectedWishlistId}/wish`, {
      method: "POST",
      body: JSON.stringify({ title, quantity: qty })
    });
    el.newWishTitle.value = "";
    el.newWishQty.value = "1";
    toast("Hinzugefügt", "Wunsch wurde hinzugefügt.");
    await fetchAll();
    el.newWishTitle.focus();
  } catch (e) {
    toast("Fehler", e.message);
  }
}

// Events
el.filter.addEventListener("input", () => {
  state.filter = el.filter.value;
  render();
});

el.sortBy.addEventListener("change", () => {
  state.sortBy = el.sortBy.value;
  render();
});

el.btnDir.addEventListener("click", () => {
  state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  el.btnDir.textContent = state.sortDir === "asc" ? "↑ Aufsteigend" : "↓ Absteigend";
  render();
});

el.btnBurger.addEventListener("click", () => {
  el.sidebar.classList.toggle("show");
  const isOpen = el.sidebar.classList.contains("show");
  el.btnBurger.textContent = isOpen ? "✕" : "☰";
  el.btnBurger.setAttribute("aria-expanded", isOpen);
});

el.btnCreateWishlist.addEventListener("click", openCreateDialog);
if (el.btnCreateWishlistMobile) {
  el.btnCreateWishlistMobile.addEventListener("click", openCreateDialog);
}
el.btnCreateConfirm.addEventListener("click", createWishlist);

el.btnSaveWishlistTitle.addEventListener("click", saveWishlistTitle);
el.btnDeleteWishlist.addEventListener("click", deleteSelectedWishlist);
el.btnAddWish.addEventListener("click", addWish);

el.createTitleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    createWishlist();
  }
});

el.newWishTitle.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addWish();
  }
});
el.newWishQty.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addWish();
  }
});

el.dlg.addEventListener("close", () => {
  selectedWishlistId = null;
});

// Init
(function init() {
  state.sortBy = "createdAt";
  state.sortDir = "desc";
  el.sortBy.value = "createdAt";
  el.btnDir.textContent = "↓ Absteigend";

  renderChips();
  fetchAll();
})();

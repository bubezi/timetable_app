const STORAGE_KEY = "journal_entries_v1";
const DEFAULT_MOODS = [
  "Confident",
  "Disciplined",
  "Calm",
  "Neutral",
  "FOMO",
  "Anxious",
  "Revenge",
  "Frustrated",
  "Hesitant",
  "Overconfident",
];

let entries = loadEntries();
let editingId = null;
let selectedMoods = new Set();
let pendingImages = []; // dataURLs for the entry currently being edited/created

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load entries", e);
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

function fmtMoney(n) {
  const num = Number(n) || 0;
  const sign = num > 0 ? "+" : "";
  return sign + num.toFixed(2);
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ---------------- image compression ---------------- */
function compressImage(file, maxWidth = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------------- form handling ---------------- */
const formSection = document.getElementById("formSection");
const moodChips = document.getElementById("moodChips");
const thumbPreview = document.getElementById("thumbPreview");

function renderMoodChips() {
  const allMoods = new Set(DEFAULT_MOODS);
  entries.forEach((e) => (e.moods || []).forEach((m) => allMoods.add(m)));
  moodChips.innerHTML = "";
  [...allMoods].forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-toggle" + (selectedMoods.has(m) ? " on" : "");
    btn.textContent = m;
    btn.addEventListener("click", () => {
      if (selectedMoods.has(m)) selectedMoods.delete(m);
      else selectedMoods.add(m);
      renderMoodChips();
    });
    moodChips.appendChild(btn);
  });
}

function renderThumbs() {
  thumbPreview.innerHTML = "";
  pendingImages.forEach((src, idx) => {
    const div = document.createElement("div");
    div.className = "thumb";
    div.innerHTML = `<img src="${src}" /><button class="rm" data-idx="${idx}">✕</button>`;
    div.querySelector("img").addEventListener("click", () =>
      openImageModal(src),
    );
    div.querySelector(".rm").addEventListener("click", (ev) => {
      ev.stopPropagation();
      pendingImages.splice(idx, 1);
      renderThumbs();
    });
    thumbPreview.appendChild(div);
  });
}

document
  .getElementById("fldImages")
  .addEventListener("change", async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      try {
        const dataUrl = await compressImage(f);
        pendingImages.push(dataUrl);
      } catch (err) {
        console.error("Image compression failed", err);
      }
    }
    renderThumbs();
    e.target.value = "";
  });

document.getElementById("customMoodInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = e.target.value.trim();
    if (val) {
      selectedMoods.add(val);
      renderMoodChips();
      e.target.value = "";
    }
  }
});

function openForm(entry) {
  editingId = entry ? entry.id : null;
  selectedMoods = new Set(entry ? entry.moods || [] : []);
  pendingImages = entry ? [...(entry.images || [])] : [];
  document.getElementById("formTitle").textContent = entry
    ? "Edit Entry"
    : "New Entry";
  document.getElementById("fldDate").value =
    (entry && entry.date) || new Date().toISOString().slice(0, 10);
  document.getElementById("fldPair").value = (entry && entry.pair) || "";
  document.getElementById("fldDirection").value =
    (entry && entry.direction) || "long";
  document.getElementById("fldPnl").value =
    entry && entry.pnl != null ? entry.pnl : "";
  document.getElementById("fldEntry").value =
    entry && entry.entryPrice != null ? entry.entryPrice : "";
  document.getElementById("fldExit").value =
    entry && entry.exitPrice != null ? entry.exitPrice : "";
  document.getElementById("fldLots").value =
    entry && entry.lots != null ? entry.lots : "";
  document.getElementById("fldTitle").value = (entry && entry.title) || "";
  document.getElementById("fldTags").value = entry
    ? (entry.tags || []).join(", ")
    : "";
  document.getElementById("fldBody").value = (entry && entry.body) || "";
  renderMoodChips();
  renderThumbs();
  formSection.hidden = false;
  formSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  formSection.hidden = true;
  editingId = null;
  pendingImages = [];
  selectedMoods = new Set();
}

document.getElementById("newEntryBtn").addEventListener("click", () =>
  openForm(null),
);
document
  .getElementById("cancelFormBtn")
  .addEventListener("click", closeForm);

document.getElementById("saveEntryBtn").addEventListener("click", () => {
  const date = document.getElementById("fldDate").value;
  if (!date) {
    alert("Please set a date.");
    return;
  }
  const pnlRaw = document.getElementById("fldPnl").value;
  const tagsRaw = document.getElementById("fldTags").value;
  const entry = {
    id: editingId || uid(),
    date,
    pair: document.getElementById("fldPair").value.trim().toUpperCase(),
    direction: document.getElementById("fldDirection").value,
    pnl: pnlRaw === "" ? null : Number(pnlRaw),
    entryPrice: numOrNull(document.getElementById("fldEntry").value),
    exitPrice: numOrNull(document.getElementById("fldExit").value),
    lots: numOrNull(document.getElementById("fldLots").value),
    title: document.getElementById("fldTitle").value.trim(),
    tags: tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    moods: [...selectedMoods],
    body: document.getElementById("fldBody").value,
    images: [...pendingImages],
    createdAt: editingId
      ? (entries.find((e) => e.id === editingId) || {}).createdAt ||
        Date.now()
      : Date.now(),
  };

  if (editingId) {
    entries = entries.map((e) => (e.id === editingId ? entry : e));
  } else {
    entries.unshift(entry);
  }
  saveEntries();
  closeForm();
  populateFilterOptions();
  applyFilters();
});

function numOrNull(v) {
  return v === "" || v === null || v === undefined ? null : Number(v);
}

function deleteEntry(id) {
  if (!confirm("Delete this journal entry? This can't be undone.")) return;
  entries = entries.filter((e) => e.id !== id);
  saveEntries();
  populateFilterOptions();
  applyFilters();
}

/* ---------------- image modal ---------------- */
const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
function openImageModal(src) {
  modalImg.src = src;
  imageModal.hidden = false;
}
document
  .getElementById("closeModal")
  .addEventListener("click", () => (imageModal.hidden = true));
imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) imageModal.hidden = true;
});

/* ---------------- filters ---------------- */
function populateFilterOptions() {
  const pairs = [...new Set(entries.map((e) => e.pair).filter(Boolean))].sort();
  const moods = [
    ...new Set(entries.flatMap((e) => e.moods || [])),
  ].sort();

  const pairSel = document.getElementById("fPair");
  const currentPair = pairSel.value;
  pairSel.innerHTML =
    '<option value="">All</option>' +
    pairs.map((p) => `<option value="${p}">${p}</option>`).join("");
  pairSel.value = pairs.includes(currentPair) ? currentPair : "";

  const moodSel = document.getElementById("fMood");
  const currentMood = moodSel.value;
  moodSel.innerHTML =
    '<option value="">All</option>' +
    moods.map((m) => `<option value="${m}">${m}</option>`).join("");
  moodSel.value = moods.includes(currentMood) ? currentMood : "";
}

function getFiltered() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const dir = document.getElementById("fDirection").value;
  const result = document.getElementById("fResult").value;
  const pair = document.getElementById("fPair").value;
  const mood = document.getElementById("fMood").value;
  const from = document.getElementById("fFrom").value;
  const to = document.getElementById("fTo").value;

  return entries
    .filter((e) => {
      if (q) {
        const hay = `${e.title} ${e.body} ${e.pair} ${(e.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dir && e.direction !== dir) return false;
      if (pair && e.pair !== pair) return false;
      if (mood && !(e.moods || []).includes(mood)) return false;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (result) {
        const pnl = Number(e.pnl) || 0;
        if (result === "win" && !(pnl > 0)) return false;
        if (result === "loss" && !(pnl <= 0)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

function renderStats(list) {
  const box = document.getElementById("statsBox");
  const total = list.length;
  const withPnl = list.filter((e) => e.pnl !== null && e.pnl !== undefined);
  const totalPnl = withPnl.reduce((s, e) => s + Number(e.pnl), 0);
  const wins = withPnl.filter((e) => Number(e.pnl) > 0).length;
  const winRate = withPnl.length ? Math.round((wins / withPnl.length) * 100) : 0;
  const avg = withPnl.length ? totalPnl / withPnl.length : 0;

  box.innerHTML = `
    <div class="stat-box">
      <div class="num ${totalPnl >= 0 ? "pos" : "neg"}">${fmtMoney(totalPnl)}</div>
      <div class="lbl2">Total P&amp;L</div>
    </div>
    <div class="stat-box">
      <div class="num">${total}</div>
      <div class="lbl2">Entries</div>
    </div>
    <div class="stat-box">
      <div class="num">${winRate}%</div>
      <div class="lbl2">Win rate</div>
    </div>
    <div class="stat-box">
      <div class="num ${avg >= 0 ? "pos" : "neg"}">${fmtMoney(avg)}</div>
      <div class="lbl2">Avg P&amp;L / trade</div>
    </div>
  `;
}

function renderList(list) {
  const container = document.getElementById("entriesList");
  document.getElementById("countFoot").textContent =
    `Showing ${list.length} of ${entries.length} entries`;

  if (!list.length) {
    container.innerHTML = `<div class="card empty">No entries match. Try clearing filters, or add your first trade.</div>`;
    return;
  }

  container.innerHTML = "";
  list.forEach((e) => {
    const pnl = e.pnl === null || e.pnl === undefined ? null : Number(e.pnl);
    const div = document.createElement("div");
    div.className = "card entry";
    div.innerHTML = `
      <div class="entry-head">
        <span class="badge ${e.direction}">${
          e.direction === "long" ? "Long" : e.direction === "short" ? "Short" : "Other"
        }</span>
        <span class="pair-tag">${e.pair || "—"}</span>
        <span class="note">${fmtDate(e.date)}</span>
        <span class="pnl-tag ${pnl === null ? "" : pnl >= 0 ? "pos" : "neg"}">${
          pnl === null ? "—" : fmtMoney(pnl)
        }</span>
      </div>
      ${e.title ? `<h3>${escapeHtml(e.title)}</h3>` : ""}
      <div class="meta-line">
        ${e.entryPrice != null ? `Entry: ${e.entryPrice} · ` : ""}${
          e.exitPrice != null ? `Exit: ${e.exitPrice} · ` : ""
        }${e.lots != null ? `Lots: ${e.lots}` : ""}
      </div>
      ${
        e.moods && e.moods.length
          ? `<div class="tag-row">${e.moods.map((m) => `<span class="tag-pill">${escapeHtml(m)}</span>`).join("")}</div>`
          : ""
      }
      ${
        e.tags && e.tags.length
          ? `<div class="tag-row">${e.tags.map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join("")}</div>`
          : ""
      }
      ${e.body ? `<div class="body-preview">${escapeHtml(e.body)}</div>` : ""}
      <div class="thumbs" data-role="thumbs"></div>
      <div class="entry-actions">
        <button class="btn small" data-role="edit">Edit</button>
        <button class="btn small warn" data-role="delete">Delete</button>
      </div>
    `;
    const thumbsEl = div.querySelector('[data-role="thumbs"]');
    (e.images || []).forEach((src) => {
      const t = document.createElement("div");
      t.className = "thumb";
      t.innerHTML = `<img src="${src}" />`;
      t.addEventListener("click", () => openImageModal(src));
      thumbsEl.appendChild(t);
    });
    div.querySelector('[data-role="edit"]').addEventListener("click", () =>
      openForm(e),
    );
    div.querySelector('[data-role="delete"]').addEventListener("click", () =>
      deleteEntry(e.id),
    );
    container.appendChild(div);
  });
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function applyFilters() {
  const list = getFiltered();
  renderStats(list);
  renderList(list);
}

[
  "searchInput",
  "fDirection",
  "fResult",
  "fPair",
  "fMood",
  "fFrom",
  "fTo",
].forEach((id) =>
  document.getElementById(id).addEventListener("input", applyFilters),
);

/* ---------------- export / import JSON ---------------- */
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportBtn").addEventListener("click", () => {
  download(
    "trading-journal.json",
    JSON.stringify(entries, null, 2),
    "application/json",
  );
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid format");
    if (
      entries.length &&
      !confirm(
        `Import ${parsed.length} entries and merge with your existing ${entries.length}?`,
      )
    )
      return;
    entries = [...parsed, ...entries];
    saveEntries();
    populateFilterOptions();
    applyFilters();
    alert("Imported.");
  } catch (err) {
    alert("Could not import that JSON file.");
  } finally {
    e.target.value = "";
  }
});

/* ---------------- MT5 CSV import ---------------- */
function parseCsv(text) {
  // basic CSV parser handling quoted fields and comma/semicolon/tab delimiters
  const delim = text.includes("\t") ? "\t" : text.includes(";") ? ";" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  const rows = lines.map((line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delim && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((c) => c.trim());
  });
  return rows;
}

function findCol(headers, keywords) {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

document.getElementById("importCsv").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("Empty file");
    const headers = rows[0];
    const timeIdx = findCol(headers, ["open time", "time"]);
    const symbolIdx = findCol(headers, ["symbol"]);
    const typeIdx = findCol(headers, ["type"]);
    const volIdx = findCol(headers, ["volume", "lots"]);
    const priceIdx = findCol(headers, ["price"]);
    const closeIdx = findCol(headers, ["price.1", "close"]);
    const profitIdx = findCol(headers, ["profit", "pnl"]);

    if (symbolIdx === -1 || profitIdx === -1) {
      throw new Error(
        "Couldn't find Symbol and Profit columns — this file may not be a standard MT5 history export.",
      );
    }

    const imported = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const symbol = r[symbolIdx];
      if (!symbol) continue;
      const profitVal = Number(String(r[profitIdx]).replace(/[^0-9.\-]/g, ""));
      if (Number.isNaN(profitVal)) continue;
      const rawType = (typeIdx !== -1 ? r[typeIdx] : "").toLowerCase();
      const direction = rawType.includes("sell")
        ? "short"
        : rawType.includes("buy")
          ? "long"
          : "none";
      let date = new Date().toISOString().slice(0, 10);
      if (timeIdx !== -1 && r[timeIdx]) {
        const d = new Date(r[timeIdx].replace(".", "-").replace(".", "-"));
        if (!isNaN(d)) date = d.toISOString().slice(0, 10);
      }
      imported.push({
        id: uid(),
        date,
        pair: symbol.toUpperCase(),
        direction,
        pnl: profitVal,
        entryPrice: priceIdx !== -1 ? numOrNull(r[priceIdx]) : null,
        exitPrice: closeIdx !== -1 ? numOrNull(r[closeIdx]) : null,
        lots: volIdx !== -1 ? numOrNull(r[volIdx]) : null,
        title: "",
        tags: ["mt5-import"],
        moods: [],
        body: "",
        images: [],
        createdAt: Date.now(),
      });
    }

    if (!imported.length) {
      alert("No valid trade rows found in that file.");
      return;
    }
    if (!confirm(`Import ${imported.length} trades from MT5 history?`)) return;
    entries = [...imported, ...entries];
    saveEntries();
    populateFilterOptions();
    applyFilters();
    alert(`Imported ${imported.length} trades.`);
  } catch (err) {
    console.error(err);
    alert(err.message || "Could not parse that CSV file.");
  } finally {
    e.target.value = "";
  }
});

/* ---------------- init ---------------- */
populateFilterOptions();
applyFilters();

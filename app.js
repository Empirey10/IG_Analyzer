/* ══════════════════════════════════════════════════════════════
        CONFIG
    ══════════════════════════════════════════════════════════════ */
// Biarkan kosong ("") karena kita akan menggunakan file lokal "Tutorial.mp4"
const TUTORIAL_VIDEO_EMBED_URL = "";

/* ══════════════════════════════════════════════════════════════
        SECTION 1: THEME TOGGLE (Tetap Sama)
    ══════════════════════════════════════════════════════════════ */
const html = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("igTheme") === "dark") {
  html.classList.add("dark");
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = html.classList.toggle("dark");
    localStorage.setItem("igTheme", isDark ? "dark" : "light");
  });
}

/* ══════════════════════════════════════════════════════════════
        SECTION 2: TUTORIAL VIDEO SETUP (Sistem Klik Aktif)
    ══════════════════════════════════════════════════════════════ */
(function setupTutorialVideo() {
  const videoFrame = document.getElementById("tutorialVideoFrame");
  const placeholder = document.getElementById("tutorialVideoPlaceholder");
  if (!videoFrame) return;

  // Ketika area frame / placeholder di-klik oleh user
  videoFrame.addEventListener("click", function handler() {
    // Hapus event listener agar tidak ke-trigger dua kali
    videoFrame.removeEventListener("click", handler);

    // 1. Sembunyikan tampilan placeholder bawaan secara instan
    if (placeholder) placeholder.style.display = "none";
    
    // 2. Buat tag <video> HTML5 untuk memutar file lokal MP4
    const video = document.createElement("video");
    video.src = "Tutorial.mp4"; // Diarahkan ke file mp4 lokal kamu
    video.controls = true;
    video.autoplay = true; // Langsung berputar pasca-klik
    video.playsInline = true;
    
    // Styling ketat agar ukurannya presisi mengunci di dalam frame asli kamu
    video.style.cssText = "width:100%; height:100%; object-fit:contain; background:#000; border-radius:inherit; position:absolute; inset:0; z-index:10;";
    
    // 3. Masukkan ke dalam frame utama
    videoFrame.style.position = "relative";
    videoFrame.appendChild(video);
  });
})();

/* ══════════════════════════════════════════════════════════════
       SECTION 3: FILE UPLOAD & DRAG/DROP
    ══════════════════════════════════════════════════════════════ */
const dropzoneOld = document.getElementById("dropzoneOld");
const fileInputOld = document.getElementById("fileInputOld");
let oldFileData = null;
let newFileData = null;

dropzoneOld.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzoneOld.classList.add("drag-over");
});
dropzoneOld.addEventListener("dragleave", () => dropzoneOld.classList.remove("drag-over"));
dropzoneOld.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzoneOld.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleOldFile(file);
});
dropzoneOld.addEventListener("click", () => fileInputOld.click());
fileInputOld.addEventListener("change", () => {
  if (fileInputOld.files[0]) handleOldFile(fileInputOld.files[0]);
});

const dropzoneNew = document.getElementById("dropzoneNew");
const fileInputNew = document.getElementById("fileInputNew");

dropzoneNew.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzoneNew.classList.add("drag-over");
});
dropzoneNew.addEventListener("dragleave", () => dropzoneNew.classList.remove("drag-over"));
dropzoneNew.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzoneNew.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleNewFile(file);
});
dropzoneNew.addEventListener("click", () => fileInputNew.click());
fileInputNew.addEventListener("change", () => {
  if (fileInputNew.files[0]) handleNewFile(fileInputNew.files[0]);
});

/* ══════════════════════════════════════════════════════════════
       SECTION 4: STATE
    ══════════════════════════════════════════════════════════════ */
let state = {
  unfoll: [],
  fans: [],
  mutualan: [],
  recent: [],
  blocked: [],
  followingWithDate: [],
  combinedDateMap: new Map(),
  activeTab: "unfoll",
  unfollPage: 0,
  PAGE_SIZE: 50,
  searchQuery: "",
  oldData: { following: [], followers: [], dateMap: new Map() },
  newData: { following: [], followers: [], dateMap: new Map() },
  unfollowDetected: [],
};

/* ══════════════════════════════════════════════════════════════
       SECTION 5: ZIP PROCESSING
    ══════════════════════════════════════════════════════════════ */
async function handleOldFile(file) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    showError("File lama harus berformat .zip");
    return;
  }
  document.getElementById("oldFileStatus").textContent = `⏳ Memproses ${file.name}...`;
  try {
    oldFileData = await extractDataFromZip(file);
    oldFileData.fileName = file.name; // simpan nama file untuk Snapshot panel
    document.getElementById("oldFileStatus").textContent =
      `✅ ${file.name} (${oldFileData.following.length} following)`;
    document.getElementById("oldFileLabel").innerHTML =
      `<span class="text-green-500">✅</span> ${file.name}`;
    checkBothFilesReady();
  } catch (err) {
    document.getElementById("oldFileStatus").textContent = `❌ Gagal memproses: ${err.message}`;
    console.error(err);
  }
}

async function handleNewFile(file) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    showError("File baru harus berformat .zip");
    return;
  }
  document.getElementById("newFileStatus").textContent = `⏳ Memproses ${file.name}...`;
  try {
    newFileData = await extractDataFromZip(file);
    newFileData.fileName = file.name; // simpan nama file untuk Snapshot panel
    document.getElementById("newFileStatus").textContent =
      `✅ ${file.name} (${newFileData.following.length} following)`;
    document.getElementById("newFileLabel").innerHTML =
      `<span class="text-green-500">✅</span> ${file.name}`;
    checkBothFilesReady();
  } catch (err) {
    document.getElementById("newFileStatus").textContent = `❌ Gagal memproses: ${err.message}`;
    console.error(err);
  }
}

function checkBothFilesReady() {
  const btn = document.getElementById("compareBtn");
  if (oldFileData && newFileData) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left mr-2"></i> Bandingkan Kedua File`;
  } else {
    btn.disabled = true;
  }
}

function normalizeUserList(users) {
  return Array.from(
    new Set((users || []).map(normalizeUsername).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function mergeDateMaps(targetMap, sourceMap) {
  if (!targetMap || !sourceMap || typeof sourceMap.forEach !== "function") return;

  sourceMap.forEach((date, username) => {
    const key = normalizeUsername(username);
    if (!key) return;
    targetMap.set(key, date);
  });
}

function buildRelationshipData(oldData, newData) {
  const oldFollowing = normalizeUserList(oldData?.following || []);
  const oldFollowers = normalizeUserList(oldData?.followers || []);
  const newFollowing = normalizeUserList(newData?.following || []);
  const newFollowers = normalizeUserList(newData?.followers || []);

  const newFollowingSet = new Set(newFollowing);
  const newFollowersSet = new Set(newFollowers);

  return {
    oldFollowing,
    oldFollowers,
    newFollowing,
    newFollowers,
    unfoll: newFollowing.filter((u) => !newFollowersSet.has(u)),
    fans: newFollowers.filter((u) => !newFollowingSet.has(u)),
    mutualan: newFollowing.filter((u) => newFollowersSet.has(u)),
    unfollowDetected: oldFollowers.filter((u) => !newFollowersSet.has(u)),
  };
}

document.getElementById("compareBtn").addEventListener("click", async () => {
  if (!oldFileData || !newFileData) {
    showError("Silakan upload kedua file terlebih dahulu!");
    return;
  }
  showLoading();
  try {
    const relationship = buildRelationshipData(oldFileData, newFileData);
    const unfollowed = relationship.unfollowDetected;

    const combinedDateMap = new Map();
    mergeDateMaps(combinedDateMap, oldFileData.followingWithDateMap);
    mergeDateMaps(combinedDateMap, oldFileData.followersDateMap);
    mergeDateMaps(combinedDateMap, newFileData.followingWithDateMap);
    mergeDateMaps(combinedDateMap, newFileData.followersDateMap);

    state.unfoll = relationship.unfoll;
    state.fans = relationship.fans;
    state.mutualan = relationship.mutualan;
    state.recent = newFileData.recent;
    state.blocked = newFileData.blocked;
    state.combinedDateMap = combinedDateMap;
    state.unfollowDetected = unfollowed;
    state.oldData = oldFileData;
    state.newData = newFileData;
    state.unfollPage = 0;
    state.searchQuery = "";

    renderResults(newFileData.followers.length, newFileData.following.length);
    showResults();

    // if (unfollowed.length > 0) {
    //   showError(`🔍 Ditemukan ${unfollowed.length} akun yang unfollow! Cek tab "Unfollow Detector"`);
    // } else {
    //   showError(`✅ Tidak ada yang unfollow! Semua aman.`);
    // }
  } catch (err) {
    hideLoading();
    showError(err.message || "Terjadi kesalahan saat membandingkan data.");
    console.error(err);
  }
});

/* ══════════════════════════════════════════════════════════════
       SECTION 6: EXTRACTOR FUNCTIONS — REWRITTEN & MAXIMIZED
       Menangani semua format Instagram data export:
         • Format lama  : <table> dengan <td>
         • Format tengah: <div> nested dengan class _a706/_a72d
         • Format baru  : <div> flat dengan <a> + <time>
         • Format _u/   : URL dengan prefix /_u/username
         • JSON embedded: window.__additionalData di <script>
    ══════════════════════════════════════════════════════════════ */

/* ─── UTIL: normalisasi username ke bentuk kanonik ─────────────
   Dipanggil di SETIAP titik: ekstraksi, perbandingan, render.
   Menjamin "Budi123 ", "budi123/", "BUDI123" semua → "budi123"
───────────────────────────────────────────────────────────────── */
function normalizeUsername(u) {
  if (!u || typeof u !== "string") return "";
  return u
    .toLowerCase()          // huruf kecil semua
    .trim()                 // buang spasi awal/akhir
    .replace(/\/+$/, "")    // buang trailing slash: "user/" → "user"
    .replace(/\s+/g, "");   // buang semua whitespace internal
}

/* ─── UTIL: ekstrak username dari satu href ────────────────────
   Menangani semua variasi URL Instagram yang diketahui:
     https://www.instagram.com/username/
     https://instagram.com/username
     https://www.instagram.com/_u/username/
     http://instagram.com/username?...
───────────────────────────────────────────────────────────────── */
function extractUsernameFromLink(href) {
  if (!href || typeof href !== "string") return null;

  // Normalisasi URL: decode entity HTML (&amp; → &, dll)
  let url = href.trim();
  try {
    // Coba decode HTML entities jika ada
    const tmp = document.createElement("textarea");
    tmp.innerHTML = url;
    url = tmp.value;
  } catch (_) {}

  // Pola URL instagram: tangkap username setelah domain, opsional /_u/
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:_u\/)?([A-Za-z0-9._]+(?:\.[A-Za-z0-9._]+)*)\/?(?:[?#].*)?$/i
  );

  if (!match || !match[1]) return null;

  const username = normalizeUsername(match[1]);

  // Validasi: username Instagram hanya boleh mengandung huruf, angka, titik, underscore
  if (!username || !/^[a-z0-9._]+$/.test(username)) return null;
  if (username.length < 1 || username.length > 30) return null;

  // Blacklist path Instagram yang bukan username
  const BLACKLIST = new Set([
    "explore", "p", "reel", "reels", "stories", "accounts",
    "directory", "about", "legal", "help", "terms", "download",
    "your_information", "your", "information", "language",
    "meta", "privacy", "guidelines", "login", "signup",
    "challenge", "oauth", "api", "graphql", "data",
    "ar", "tv", "web", "static", "cdn", "maps",
    "favicon.ico", "robots.txt",
  ]);
  if (BLACKLIST.has(username)) return null;

  return username;
}

/* ─── UTIL: parse tanggal dari berbagai format ─────────────────
   Instagram menggunakan format:
     "Jan 1, 2024"       (bahasa Inggris)
     "1 Jan 2024"        (variasi)
     "2024-01-01T00:00:00" (ISO 8601 dari <time>)
     "Jan 1, 2024, 12:00 AM" (dengan waktu)
───────────────────────────────────────────────────────────────── */
function parseDateText(text) {
  if (!text) return null;
  const cleaned = String(text).trim();

  const toDisplay = (date, withTime = false) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleDateString("id-ID", { month: "short" }).replace(".", "");
    const year = date.getFullYear();
    if (!withTime) return `${day} ${month} ${year}`;
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  const monthNames = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    mei: 4, agu: 7, okt: 9, des: 11,
    january: 0, february: 1, march: 2, april: 3,
    june: 5, july: 6, august: 7, september: 8,
    october: 9, november: 10, december: 11,
  };

  const parseIso = (value) => {
    const d = new Date(value);
    if (!isNaN(d)) {
      const hasTime = /\d{2}:\d{2}/.test(value);
      return toDisplay(d, hasTime);
    }
    return null;
  };

  const tryDirect = parseIso(cleaned);
  if (tryDirect) return tryDirect;

  const tryIsoLike = cleaned.replace(/\s+/g, " ").replace(/\s+(AM|PM)$/i, "$1");
  const isoMatch = tryIsoLike.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?/);
  if (isoMatch) {
    const normalized = isoMatch[2] ? `${isoMatch[1]}T${isoMatch[2]}:00` : isoMatch[1];
    return parseIso(normalized);
  }

  const parseMonthDayYear = (monthStr, dayStr, yearStr, timeStr) => {
    const monthKey = monthStr.toLowerCase();
    const monthIndex = monthNames[monthKey];
    if (monthIndex === undefined) return null;
    const day = Number(dayStr);
    const year = Number(yearStr);
    if (!day || !year) return null;

    let hours = 0;
    let minutes = 0;
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return null;
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);
      const meridiem = timeMatch[3]?.toUpperCase();
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }

    const date = new Date(year, monthIndex, day, hours, minutes);
    return toDisplay(date, Boolean(timeStr));
  };

  let match = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:,?\s*(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?))?$/i);
  if (match) {
    return parseMonthDayYear(match[1], match[2], match[3], match[4]);
  }

  match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,?\s*(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?))?$/i);
  if (match) {
    return parseMonthDayYear(match[2], match[1], match[3], match[4]);
  }

  return null;
}

/* ─── UTIL: cari teks tanggal paling dekat dengan sebuah elemen ─
   Menelusuri DOM ke atas dan samping untuk menemukan tanggal.
───────────────────────────────────────────────────────────────── */
function findNearbyDate(linkEl) {
  // Strategi 1: cek <time> di kontainer yang sama
  let container = linkEl.parentElement;
  for (let i = 0; i < 5 && container; i++) {
    const timeEl = container.querySelector("time");
    if (timeEl) {
      // Prioritaskan atribut datetime, lalu textContent
      const dt = timeEl.getAttribute("datetime") || timeEl.textContent;
      const parsed = parseDateText(dt);
      if (parsed) return parsed;
    }
    container = container.parentElement;
  }

  // Strategi 2: cari teks tanggal di div/td saudara (sibling)
  let parent = linkEl.parentElement;
  for (let i = 0; i < 4 && parent; i++) {
    // Cek semua child langsung dari parent
    const children = Array.from(parent.children);
    for (const child of children) {
      if (child === linkEl) continue;
      if (child.contains(linkEl)) continue;
      const text = child.textContent.trim();
      const parsed = parseDateText(text);
      if (parsed) return parsed;

      // Cek kedalaman 1 ke dalam child tersebut
      for (const grandchild of Array.from(child.children)) {
        const gcText = grandchild.textContent.trim();
        const gcParsed = parseDateText(gcText);
        if (gcParsed) return gcParsed;
      }
    }
    parent = parent.parentElement;
  }

  // Strategi 3: cari pola tanggal di teks keseluruhan kontainer terdekat
  let ctx = linkEl.closest("div, tr, li");
  if (ctx) {
    const fullText = ctx.textContent || "";
    const dateMatch = fullText.match(
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Mei|Agu|Okt|Des)\s+\d{1,2},?\s+\d{4}/i
    );
    if (dateMatch) {
      const parsed = parseDateText(dateMatch[0]);
      if (parsed) return parsed;
    }
    // ISO dalam teks
    const isoMatch = fullText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    if (isoMatch) {
      const parsed = parseDateText(isoMatch[0]);
      if (parsed) return parsed;
    }
  }

  return null;
}

/* ─── CORE: ekstrak dari semua <a href*=instagram.com> ─────────
   Satu fungsi tunggal yang dipakai oleh following DAN followers.
   targetSet  : Set<string> — diisi dengan username
   dateMap    : Map<string,string> — diisi dengan tanggal follow
───────────────────────────────────────────────────────────────── */
function extractFromHtml(htmlString, targetSet, dateMap) {
  if (!htmlString || typeof htmlString !== "string") return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  /* === Jalur A: JSON embedded di <script> =====================
     Beberapa versi export menyimpan data dalam:
       window.__additionalData = { ... }
     atau tag <script type="text/json"> / <script type="application/json">
  ============================================================== */
  const scripts = doc.querySelectorAll("script");
  scripts.forEach(script => {
    const src = script.textContent || "";
    // Coba parse JSON dari window.__additionalData
    const jsonMatch = src.match(/window\.__additionalData\s*=\s*(\{[\s\S]*?\})(?:\s*;|$)/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        extractFromJsonObject(data, targetSet, dateMap);
      } catch (_) {}
    }
    // Coba parse jika seluruh isi script adalah JSON
    if (src.trim().startsWith("{") || src.trim().startsWith("[")) {
      try {
        const data = JSON.parse(src.trim());
        extractFromJsonObject(data, targetSet, dateMap);
      } catch (_) {}
    }
  });

  /* === Jalur B: <a href*=instagram.com> (semua format HTML) ===
     Ini jalur utama — menangkap semua format div/tabel/list.
  ============================================================== */
  const links = doc.querySelectorAll("a[href]");
  links.forEach(link => {
    const href = link.getAttribute("href") || "";
    if (!href.includes("instagram.com")) return;

    const username = extractUsernameFromLink(href);
    if (!username) return;

    // Jangan overwrite username yang sudah ada (Set.add() sudah idempoten)
    targetSet.add(username);

    // Cari tanggal hanya jika belum ada di map
    if (!dateMap.has(username)) {
      const dateStr = findNearbyDate(link);
      dateMap.set(username, dateStr || "Tanggal tidak tersedia");
    }
  });

  /* === Jalur C: tabel lama — <td> berisi username teks biasa ==
     Format export sangat lama tidak punya link, hanya teks.
  ============================================================== */
  const rows = doc.querySelectorAll("tr");
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length === 0) return;

    cells.forEach((cell, idx) => {
      const headerLike = cell.textContent.toLowerCase().trim();
      // Jika sel ini adalah header "Username" / "Nama Pengguna", skip
      if (headerLike === "username" || headerLike === "nama pengguna") return;

      // Coba ekstrak dari link di dalam sel
      const cellLink = cell.querySelector("a[href*='instagram.com']");
      if (cellLink) return; // sudah ditangani di Jalur B

      // Teks mentah yang menyerupai username (tidak ada spasi, tidak ada http)
      const rawText = normalizeUsername(cell.textContent);
      if (
        rawText &&
        rawText.length >= 1 &&
        rawText.length <= 30 &&
        /^[a-z0-9._]+$/.test(rawText) &&
        !rawText.startsWith("http")
      ) {
        targetSet.add(rawText);

        // Cari tanggal di sel berikutnya
        if (!dateMap.has(rawText) && cells[idx + 1]) {
          const nextText = cells[idx + 1].textContent.trim();
          const parsed = parseDateText(nextText);
          dateMap.set(rawText, parsed || "Tanggal tidak tersedia");
        } else if (!dateMap.has(rawText)) {
          dateMap.set(rawText, "Tanggal tidak tersedia");
        }
      }
    });
  });
}

/* ─── UTIL: rekursif ekstrak dari JSON object ──────────────────
   Menangani struktur JSON export Instagram yang kompleks.
───────────────────────────────────────────────────────────────── */
function extractFromJsonObject(obj, targetSet, dateMap, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8) return;

  if (Array.isArray(obj)) {
    obj.forEach(item => extractFromJsonObject(item, targetSet, dateMap, depth + 1));
    return;
  }

  // Cek apakah objek ini punya field username atau href
  const username = obj.username || obj.value || obj.string_value;
  if (username && typeof username === "string") {
    const normalized = normalizeUsername(username);
    if (normalized && /^[a-z0-9._]+$/.test(normalized)) {
      targetSet.add(normalized);
      if (!dateMap.has(normalized)) {
        const rawDate = obj.timestamp || obj.date || obj.time || null;
        const parsed = rawDate ? parseDateText(String(rawDate)) : null;
        dateMap.set(normalized, parsed || "Tanggal tidak tersedia");
      }
    }
  }

  // Cek href
  const href = obj.href;
  if (href && typeof href === "string" && href.includes("instagram.com")) {
    const extracted = extractUsernameFromLink(href);
    if (extracted) {
      targetSet.add(extracted);
      if (!dateMap.has(extracted)) {
        dateMap.set(extracted, "Tanggal tidak tersedia");
      }
    }
  }

  // Rekursi ke semua value
  Object.values(obj).forEach(val => {
    if (val && typeof val === "object") {
      extractFromJsonObject(val, targetSet, dateMap, depth + 1);
    }
  });
}

/* ─── PUBLIC: wrapper untuk following.html ─────────────────────
   (Tetap ada agar pemanggil lama tidak perlu diubah)
───────────────────────────────────────────────────────────────── */
function extractFollowingWithDate(htmlString, targetSet, dateMap) {
  extractFromHtml(htmlString, targetSet, dateMap);
}

/* ─── PUBLIC: wrapper untuk followers_N.html ───────────────────
   (Tetap ada agar pemanggil lama tidak perlu diubah)
───────────────────────────────────────────────────────────────── */
function extractFollowersWithDate(htmlString, targetSet, dateMap) {
  extractFromHtml(htmlString, targetSet, dateMap);
}

/* ─── PUBLIC: wrapper generik (recently_unfollowed, blocked) ───
───────────────────────────────────────────────────────────────── */
function extractWithRegex(htmlString, targetSet) {
  const dummyMap = new Map();
  extractFromHtml(htmlString, targetSet, dummyMap);
}

function extractTableText(htmlString, targetSet) {
  const dummyMap = new Map();
  extractFromHtml(htmlString, targetSet, dummyMap);
}

/* ─── PUBLIC: proses ZIP — deteksi SEMUA file relevan ──────────
   Perbaikan dari versi lama:
     • followers_1..N.html semua terbaca (bukan hanya followers.html)
     • following_1..N.html juga ditangani
     • File di subfolder manapun dalam ZIP tetap terdeteksi
     • Nama file case-insensitive
───────────────────────────────────────────────────────────────── */
async function extractDataFromZip(file) {
  const zip = await JSZip.loadAsync(file);

  const followersSet        = new Set();
  const followingSet        = new Set();
  const followersDateMap    = new Map();
  const followingWithDateMap = new Map();
  const recentSet           = new Set();
  const blockedSet          = new Set();

  // Kumpulkan semua entry file (bukan direktori) dan sort agar konsisten
  const fileEntries = Object.entries(zip.files)
    .filter(([, fileData]) => !fileData.dir)
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [filename, fileData] of fileEntries) {
    // Ambil nama file saja (tanpa path folder) dan lowercase
    const parts    = filename.split(/[\\/]/);
    const justName = parts[parts.length - 1].toLowerCase();
    const ext      = justName.split(".").pop();

    // Hanya proses file HTML
    if (ext !== "html") continue;

    const htmlContent = await fileData.async("string");

    /* ── Followers: followers.html, followers_1.html, followers_2.html … ── */
    if (/^followers(?:_\d+)?\.html$/.test(justName)) {
      extractFollowersWithDate(htmlContent, followersSet, followersDateMap);
      continue;
    }

    /* ── Following: following.html, following_1.html … ── */
    if (/^following(?:_\d+)?\.html$/.test(justName)) {
      extractFollowingWithDate(htmlContent, followingSet, followingWithDateMap);
      continue;
    }

    /* ── Recently unfollowed ── */
    if (justName === "recently_unfollowed_profiles.html") {
      extractTableText(htmlContent, recentSet);
      continue;
    }

    /* ── Blocked profiles ── */
    if (justName === "blocked_profiles.html") {
      extractTableText(htmlContent, blockedSet);
      continue;
    }
  }

  // Normalisasi ulang semua Set sebelum dikembalikan — jaminan terakhir
  const normalizedFollowers = new Set(Array.from(followersSet).map(normalizeUsername).filter(Boolean));
  const normalizedFollowing = new Set(Array.from(followingSet).map(normalizeUsername).filter(Boolean));

  // Rebuild dateMap dengan key yang sudah ternormalisasi
  const normFollowersDateMap = new Map();
  followersDateMap.forEach((date, raw) => {
    const key = normalizeUsername(raw);
    if (key) normFollowersDateMap.set(key, date);
  });

  const normFollowingDateMap = new Map();
  followingWithDateMap.forEach((date, raw) => {
    const key = normalizeUsername(raw);
    if (key) normFollowingDateMap.set(key, date);
  });

  return {
    followers:           Array.from(normalizedFollowers),
    following:           Array.from(normalizedFollowing),
    followersDateMap:    normFollowersDateMap,
    followingWithDateMap: normFollowingDateMap,
    recent:              Array.from(recentSet).map(normalizeUsername).filter(Boolean),
    blocked:             Array.from(blockedSet).map(normalizeUsername).filter(Boolean),
  };
}

/* ─── PUBLIC: bandingkan dua snapshot — siapa yang unfollow ────
   Menggunakan Set untuk lookup O(1), bukan Array.includes() O(n).
   Semua username dinormalisasi ulang sebelum dibandingkan.
───────────────────────────────────────────────────────────────── */
function compareData(oldData, newData) {
  // LOGIKA UTAMA DITAMBAHKAN TANPA MENGURANGI APAPUN
  // Kita menggunakan array cadangan (|| []) agar tidak error jika data kosong

  // 1. Buat Set dari data FOLLOWERS BARU untuk pencarian super cepat
  const newFollowersSet = new Set(
    (newData.followers || []).map(normalizeUsername).filter(Boolean)
  );

  // 2. Ambil data FOLLOWERS LAMA, lalu saring (filter)
  // Cari siapa saja di data lama yang TIDAK ADA (!has) di data followers baru
  // Inilah orang-orang yang terdeteksi melakukan UNFOLLOW
  return (oldData.followers || [])
    .map(normalizeUsername)
    .filter(Boolean)
    .filter(u => !newFollowersSet.has(u));
}

/* ══════════════════════════════════════════════════════════════
       SECTION 7: RENDER RESULTS
    ══════════════════════════════════════════════════════════════ */
function renderResults(followersCount, followingCount) {
  const { unfoll, fans, mutualan, unfollowDetected } = state;
  const grand = unfoll.length + fans.length + mutualan.length;

  // Populate new stat-compare cards & compare overview
  renderCompareOverview();

  // Animate the "Data Baru" numbers (existing IDs)
  animateNumber("statFollowing", followingCount);
  animateNumber("statFollowers", followersCount);
  animateNumber("statUnfoll", unfoll.length);
  animateNumber("statMutualan", mutualan.length);

  // Tab badges
  setText("badgeUnfoll", unfoll.length.toLocaleString("id"));
  setText("badgeFans", fans.length.toLocaleString("id"));
  setText("badgeMutualan", mutualan.length.toLocaleString("id"));
  setText("badgeBlocked", state.blocked.length.toLocaleString("id"));

  // Engagement ratios
  const pctUnfoll = grand ? Math.round((unfoll.length / grand) * 100) : 0;
  const pctFans   = grand ? Math.round((fans.length   / grand) * 100) : 0;
  const pctMutualan = grand ? Math.round((mutualan.length / grand) * 100) : 0;

  setText("ratioUnfoll", pctUnfoll + "%");
  setText("ratioFans", pctFans + "%");
  setText("ratioMutualan", pctMutualan + "%");
  setText("legendUnfoll", pctUnfoll + "%");
  setText("legendFans", pctFans + "%");
  setText("legendMutualan", pctMutualan + "%");
  setText("donutCenter", grand.toLocaleString("id"));
  setText("mutualScore", pctMutualan + "%");

  setTimeout(() => {
    document.getElementById("progUnfoll").style.width = pctUnfoll + "%";
    document.getElementById("progFans").style.width = pctFans + "%";
    document.getElementById("progMutualan").style.width = pctMutualan + "%";
  }, 100);

  renderDonut(pctUnfoll, pctFans, pctMutualan);
  renderTable();
}

/* ══════════════════════════════════════════════════════════════
       SECTION 8: COMPARE OVERVIEW — logika perbandingan lama vs baru
    ══════════════════════════════════════════════════════════════ */
function renderCompareOverview() {
  if (!state.oldData || !state.newData) return;

  const oldFollowing  = state.oldData.following  || [];
  const oldFollowers  = state.oldData.followers  || [];
  const newFollowing  = state.newData.following  || [];
  const newFollowers  = state.newData.followers  || [];

  // Hitung metrik data lama dengan formula yang sama persis seperti data baru
  const oldUnfoll    = oldFollowing.filter(u => !oldFollowers.includes(u));
  const oldMutualan  = oldFollowing.filter(u =>  oldFollowers.includes(u));

  // Daftar metrik: key, nilai lama, nilai baru, apakah "inverse" (naik = buruk)
  const metrics = [
    { key: "followers", label: "Followers",  oldVal: oldFollowers.length,  newVal: newFollowers.length,    inverse: false },
    { key: "following", label: "Following",  oldVal: oldFollowing.length,  newVal: newFollowing.length,    inverse: false },
    { key: "mutualan",  label: "Mutualan",   oldVal: oldMutualan.length,   newVal: state.mutualan.length,  inverse: false },
    { key: "unfoll",    label: "Unfollow",   oldVal: oldUnfoll.length,     newVal: state.unfoll.length,    inverse: true  },
  ];

  metrics.forEach(({ key, oldVal, newVal, inverse }) => {
    const change    = newVal - oldVal;
    const changePct = oldVal === 0
      ? (newVal > 0 ? 100 : 0)
      : (change / oldVal) * 100;

    // "Good" jika: untuk unfoll → turun; untuk lainnya → naik
    const good  = inverse ? change <= 0 : change >= 0;
    const cls   = good ? "is-good" : "is-bad";
    const arrow = change >= 0 ? "↑" : "↓";
    const absChange  = Math.abs(change).toLocaleString("id");
    const absPct     = Math.abs(changePct).toFixed(1) + "%";
    const capKey     = capitalize(key);

    // ── Compare Overview table ──────────────────────────────────
    setText(`co-old-${key}`, oldVal.toLocaleString("id"));
    setText(`co-new-${key}`, newVal.toLocaleString("id"));

    const changeEl = document.getElementById(`co-change-${key}`);
    if (changeEl) {
      changeEl.textContent = change === 0 ? "—" : `${arrow} ${absChange}`;
      changeEl.className = `co-change${change !== 0 ? " " + cls : ""}`;
    }
    const pctEl = document.getElementById(`co-changepct-${key}`);
    if (pctEl) {
      pctEl.textContent = change === 0 ? "—" : `${arrow} ${absPct}`;
      pctEl.className = `co-change${change !== 0 ? " " + cls : ""}`;
    }

    // ── Stat-compare cards ──────────────────────────────────────
    setText(`oldStat${capKey}`, oldVal.toLocaleString("id"));

    const deltaEl = document.getElementById(`delta${capKey}`);
    if (deltaEl) {
      if (change === 0) {
        deltaEl.innerHTML = "—";
        deltaEl.className = "stat-compare-delta";
      } else {
        deltaEl.innerHTML =
          `<span class="${cls}">${arrow} ${absChange} (${absPct})</span>`;
        deltaEl.className = "stat-compare-delta";
      }
    }
  });

  // ── Snapshot Comparison panel ───────────────────────────────
  // File names
  const oldFileName = state.oldData.fileName
    ? truncateFileName(state.oldData.fileName)
    : "—";
  const newFileName = state.newData.fileName
    ? truncateFileName(state.newData.fileName)
    : "—";
  setText("snap-old-file", oldFileName);
  setText("snap-new-file", newFileName);

  // Old column values
  setText("snap-old-followers", oldFollowers.length.toLocaleString("id"));
  setText("snap-old-following", oldFollowing.length.toLocaleString("id"));
  setText("snap-old-mutualan",  oldMutualan.length.toLocaleString("id"));
  setText("snap-old-unfoll",    oldUnfoll.length.toLocaleString("id"));

  // New column values
  setText("snap-new-followers", newFollowers.length.toLocaleString("id"));
  setText("snap-new-following", newFollowing.length.toLocaleString("id"));
  setText("snap-new-mutualan",  state.mutualan.length.toLocaleString("id"));
  setText("snap-new-unfoll",    state.unfoll.length.toLocaleString("id"));
}

/* ══════════════════════════════════════════════════════════════
       SECTION 9: DONUT CHART
    ══════════════════════════════════════════════════════════════ */
const CIRCUMFERENCE = 2 * Math.PI * 48;

function renderDonut(pctUnfoll, pctFans, pctMutualan) {
  const segUnfoll   = (pctUnfoll   / 100) * CIRCUMFERENCE;
  const segFans     = (pctFans     / 100) * CIRCUMFERENCE;
  const segMutualan = (pctMutualan / 100) * CIRCUMFERENCE;
  const gap = 4;

  const dUnfoll = document.getElementById("donutUnfoll");
  dUnfoll.style.strokeDasharray  = `${Math.max(0, segUnfoll   - gap)} ${CIRCUMFERENCE}`;
  dUnfoll.style.strokeDashoffset = 0;

  const dFans = document.getElementById("donutFans");
  dFans.style.strokeDasharray  = `${Math.max(0, segFans   - gap)} ${CIRCUMFERENCE}`;
  dFans.style.strokeDashoffset = -segUnfoll;

  const dMutualan = document.getElementById("donutMutualan");
  dMutualan.style.strokeDasharray  = `${Math.max(0, segMutualan - gap)} ${CIRCUMFERENCE}`;
  dMutualan.style.strokeDashoffset = -(segUnfoll + segFans);
}


/* ══════════════════════════════════════════════════════════════
       SECTION 10: TABLE RENDERING
    ══════════════════════════════════════════════════════════════ */
function renderTable() {
  const { activeTab, unfollPage, PAGE_SIZE, searchQuery, unfollowDetected } = state;

  const tierHeader   = document.getElementById("tierHeader");
  const tierFilterWrap = document.getElementById("tierFilterWrap");
  const loadMoreWrap = document.getElementById("loadMoreWrap");
  const emptyState   = document.getElementById("emptyState");
  const tableBody    = document.getElementById("tableBody");

  if (tierHeader)     tierHeader.style.display = "none";
  if (tierFilterWrap) tierFilterWrap.style.display = "none";

  const dateMap = state.combinedDateMap || new Map();

  let source;
  if      (activeTab === "unfoll")            source = state.unfoll;
  else if (activeTab === "fans")              source = state.fans;
  else if (activeTab === "mutualan")          source = state.mutualan;
  else if (activeTab === "recent")            source = state.recent;
  else if (activeTab === "blocked")           source = state.blocked;
  else if (activeTab === "unfollow_detector") source = unfollowDetected;

  let filtered = source;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = source.filter(u => u.toLowerCase().includes(q));
  }

  const displayCount = (unfollPage + 1) * PAGE_SIZE;
  const toRender     = filtered.slice(0, displayCount);
  const showLoadMore = filtered.length > displayCount;

  if (showLoadMore) {
    const remaining = filtered.length - displayCount;
    const loadMoreInfo = document.getElementById("loadMoreInfo");
    if (loadMoreInfo) {
      loadMoreInfo.textContent =
        `Menampilkan ${displayCount} dari ${filtered.length.toLocaleString("id")} akun (${remaining} lagi)`;
    }
  }
  loadMoreWrap.classList.toggle("hidden", !showLoadMore);

  if (toRender.length === 0) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");

    if (activeTab === "unfollow_detector") {
      // Gunakan oldFileData untuk cek apakah data lama sudah ada
      if (!oldFileData) {
        emptyState.innerHTML = `
          <div class="text-4xl mb-3">📊</div>
          <p class="font-medium text-sm" style="color:var(--text-primary)">Belum ada data lama</p>
          <p class="text-xs mt-1 max-w-sm mx-auto" style="color:var(--text-muted)">
            Upload file ZIP lama sebagai baseline, lalu file ZIP baru untuk mendeteksi siapa yang unfollow.
          </p>`;
      } else {
        emptyState.innerHTML = `
          <div class="text-4xl mb-3">✅</div>
          <p class="font-medium text-sm" style="color:var(--text-primary)">Tidak ada yang unfollow</p>
          <p class="text-xs mt-1" style="color:var(--text-muted)">Semua akun yang kamu follow masih follow balik</p>`;
      }
    }
  } else {
    emptyState.classList.add("hidden");
    tableBody.innerHTML = toRender
      .map((username, idx) => buildRow(username, idx + 1, activeTab, dateMap))
      .join("");
  }
}

function buildRow(username, index, tab, dateMap) {
  const followDate = dateMap.get(username) || "";
  let dateDisplay = "";
  if (followDate && followDate !== "Tanggal tidak tersedia") {
    dateDisplay = `<span class="text-[11px] text-gray-400/70 block mt-0.5">
      <i class="fa-regular fa-calendar mr-1"></i>Follow: ${followDate}
    </span>`;
  } else if (followDate === "Tanggal tidak tersedia") {
    dateDisplay = `<span class="text-[11px] text-gray-400/50 block mt-0.5">
      <i class="fa-regular fa-calendar mr-1"></i>Tanggal tidak tersedia
    </span>`;
  }

  let statusHint = `<div class="flex flex-col gap-0.5">
    <span class="text-xs text-gray-400"><i class="fa-solid fa-circle-info mr-1"></i> Profil Publik</span>
    ${dateDisplay}
  </div>`;

  if (tab === "blocked") {
    statusHint = `<span class="text-xs font-bold text-red-500"><i class="fa-solid fa-lock mr-1"></i> Masuk Blacklist</span>`;
  } else if (tab === "recent") {
    statusHint = `<span class="text-xs font-bold text-gray-500"><i class="fa-solid fa-clock mr-1"></i> Baru di-unfollow</span>`;
  } else if (tab === "unfollow_detector") {
    statusHint = `<span class="text-xs font-bold text-red-500"><i class="fa-solid fa-user-slash mr-1"></i> Tidak follow balik</span>`;
  }

  return `
    <tr class="tbl-row">
      <td class="px-5 py-3 text-xs" style="color:var(--text-muted)">${index}</td>
      <td class="px-5 py-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full grad-bg flex items-center justify-center flex-shrink-0">
            <span class="text-white text-xs font-bold">${username[0]?.toUpperCase() || "?"}</span>
          </div>
          <div>
            <p class="font-medium text-sm" style="color:var(--text-primary)">@${escapeHtml(username)}</p>
            ${dateDisplay}
          </div>
        </div>
      </td>
      <td class="px-5 py-3 hidden md:table-cell">${statusHint}</td>
      <td class="px-5 py-3 hidden sm:table-cell">
        <div class="flex items-center justify-end gap-2">
          <a href="https://instagram.com/${encodeURIComponent(username)}" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
            style="border-color:var(--border);color:var(--text-muted);background:var(--bg-muted)">
            <i class="fa-brands fa-instagram text-pink-500"></i> Buka Profil
          </a>
          <button type="button"
            data-action="toggle-flag"
            class="inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors hover:opacity-80"
            style="border-color:var(--border);color:var(--text-muted);background:var(--bg-muted)"
            title="Toggle penanda">
            <i class="fa-solid fa-toggle-off"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

/* ══════════════════════════════════════════════════════════════
       SECTION 11: TAB EVENTS
    ══════════════════════════════════════════════════════════════ */
const tableBody = document.getElementById("tableBody");
if (tableBody) {
  tableBody.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("[data-action='toggle-flag']");
    if (!toggleBtn) return;

    e.preventDefault();
    const icon = toggleBtn.querySelector("i");
    const isOn = toggleBtn.dataset.active === "true";
    toggleBtn.dataset.active = String(!isOn);
    if (icon) {
      icon.className = isOn ? "fa-solid fa-toggle-off" : "fa-solid fa-toggle-on";
      icon.style.color = isOn ? "var(--text-muted)" : "var(--clr-green)";
    }
  });
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.style.color = "var(--text-muted)";
    });
    btn.classList.add("active");
    btn.style.color = "";
    state.activeTab  = btn.dataset.tab;
    state.searchQuery = "";
    state.unfollPage  = 0;
    document.getElementById("searchInput").value = "";
    renderTable();
  });
});

let searchTimeout;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = e.target.value.trim();
    state.unfollPage  = 0;
    renderTable();
  }, 250);
});

document.getElementById("loadMoreBtn").addEventListener("click", () => {
  state.unfollPage++;
  renderTable();
  document.getElementById("loadMoreWrap").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.getElementById("resetBtn").addEventListener("click", resetApp);

// Header reset button (shown saat results visible)
const headerResetBtn = document.getElementById("headerResetBtn");
if (headerResetBtn) headerResetBtn.addEventListener("click", resetApp);

/* ══════════════════════════════════════════════════════════════
       SECTION 12: UI HELPERS
    ══════════════════════════════════════════════════════════════ */
function showLoading() {
  document.getElementById("uploadSection").classList.add("hidden");
  document.getElementById("loadingSection").classList.remove("hidden");
  document.getElementById("resultsSection").classList.add("hidden");
  hideError();
}

function hideLoading() {
  document.getElementById("loadingSection").classList.add("hidden");
  document.getElementById("uploadSection").classList.remove("hidden");
}

function showResults() {
  document.getElementById("loadingSection").classList.add("hidden");
  document.getElementById("uploadSection").classList.add("hidden");
  document.getElementById("resultsSection").classList.remove("hidden");
  // Tampilkan tombol "Bandingkan Lagi" di header
  const headerResetBtn = document.getElementById("headerResetBtn");
  if (headerResetBtn) headerResetBtn.classList.remove("hidden");
}

function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
  document.getElementById("errorToast").classList.remove("hidden");
}

function hideError() {
  document.getElementById("errorToast").classList.add("hidden");
}

function resetApp() {
  // Reset state
  state = {
    unfoll: [],
    fans: [],
    mutualan: [],
    recent: [],
    blocked: [],
    followingWithDate: [],
    combinedDateMap: new Map(),
    activeTab: "unfoll",
    unfollPage: 0,
    PAGE_SIZE: 50,
    searchQuery: "",
    oldData: { following: [], followers: [], dateMap: new Map() },
    newData: { following: [], followers: [], dateMap: new Map() },
    unfollowDetected: [],
  };

  // Reset module-level file references
  oldFileData = null;
  newFileData = null;

  // Reset file inputs
  if (fileInputOld) fileInputOld.value = "";
  if (fileInputNew) fileInputNew.value = "";

  // Reset file labels dan status
  const oldFileLabel  = document.getElementById("oldFileLabel");
  const oldFileStatus = document.getElementById("oldFileStatus");
  const newFileLabel  = document.getElementById("newFileLabel");
  const newFileStatus = document.getElementById("newFileStatus");
  if (oldFileLabel)  oldFileLabel.textContent  = "Klik atau drag file ZIP lama di sini";
  if (oldFileStatus) oldFileStatus.textContent = "Belum ada file";
  if (newFileLabel)  newFileLabel.textContent  = "Klik atau drag file ZIP baru di sini";
  if (newFileStatus) newFileStatus.textContent = "Belum ada file";

  // Disable tombol bandingkan
  const compareBtn = document.getElementById("compareBtn");
  if (compareBtn) {
    compareBtn.disabled = true;
    compareBtn.innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left mr-2"></i>Bandingkan Kedua File`;
  }

  // Sembunyikan tombol header reset
  const headerResetBtn = document.getElementById("headerResetBtn");
  if (headerResetBtn) headerResetBtn.classList.add("hidden");

  // Reset search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  // Tampilkan ulang upload section
  document.getElementById("resultsSection").classList.add("hidden");
  document.getElementById("uploadSection").classList.remove("hidden");

  hideError();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ══════════════════════════════════════════════════════════════
       SECTION 13: UTILITIES
    ══════════════════════════════════════════════════════════════ */
function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const duration = 900;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString("id");
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Set textContent element by id (safe, no-op jika tidak ada) */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Set innerHTML element by id (safe, no-op jika tidak ada) */
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/** Capitalize first letter, handle special keys */
function capitalize(str) {
  const map = { followers: "Followers", following: "Following", mutualan: "Mutualan", unfoll: "Unfoll" };
  return map[str] || (str.charAt(0).toUpperCase() + str.slice(1));
}

/** Potong nama file panjang agar tidak overflow */
function truncateFileName(name, maxLen = 28) {
  if (!name || name.length <= maxLen) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0) {
    const base = name.slice(0, ext);
    const extension = name.slice(ext);
    return base.slice(0, maxLen - extension.length - 3) + "…" + extension;
  }
  return name.slice(0, maxLen - 3) + "…";
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cssId(username) {
  return username.replace(/[^a-zA-Z0-9_-]/g, "_");
}
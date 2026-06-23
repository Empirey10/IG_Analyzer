/* ══════════════════════════════════════════════════════════════
       CONFIG
    ══════════════════════════════════════════════════════════════ */
// Isi dengan URL embed YouTube untuk video tutorial.
// Contoh: "https://www.youtube.com/embed/VIDEO_ID"
// Biarkan kosong ("") untuk menampilkan placeholder.
const TUTORIAL_VIDEO_EMBED_URL = "";

/* ══════════════════════════════════════════════════════════════
       SECTION 1: THEME TOGGLE
    ══════════════════════════════════════════════════════════════ */
const html = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("igTheme") === "dark") {
  html.classList.add("dark");
}

themeToggle.addEventListener("click", () => {
  const isDark = html.classList.toggle("dark");
  localStorage.setItem("igTheme", isDark ? "dark" : "light");
});

/* ══════════════════════════════════════════════════════════════
       SECTION 2: TUTORIAL VIDEO SETUP
    ══════════════════════════════════════════════════════════════ */
(function setupTutorialVideo() {
  const videoFrame = document.getElementById("tutorialVideoFrame");
  const placeholder = document.getElementById("tutorialVideoPlaceholder");
  if (!videoFrame) return;

  if (TUTORIAL_VIDEO_EMBED_URL && TUTORIAL_VIDEO_EMBED_URL.trim() !== "") {
    const iframe = document.createElement("iframe");
    iframe.src = TUTORIAL_VIDEO_EMBED_URL.trim();
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border-radius:inherit";
    if (placeholder) placeholder.style.display = "none";
    videoFrame.style.position = "relative";
    videoFrame.appendChild(iframe);
  }
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

document.getElementById("compareBtn").addEventListener("click", async () => {
  if (!oldFileData || !newFileData) {
    showError("Silakan upload kedua file terlebih dahulu!");
    return;
  }
  showLoading();
  try {
    const unfollowed = compareData(oldFileData, newFileData);

    const combinedDateMap = new Map();
    oldFileData.followingWithDateMap.forEach((date, username) => combinedDateMap.set(username, date));
    newFileData.followingWithDateMap.forEach((date, username) => combinedDateMap.set(username, date));
    newFileData.followersDateMap.forEach((date, username) => combinedDateMap.set(username, date));

    state.unfoll = newFileData.following.filter((u) => !newFileData.followers.includes(u));
    state.fans = newFileData.followers.filter((u) => !newFileData.following.includes(u));
    state.mutualan = newFileData.following.filter((u) => newFileData.followers.includes(u));
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

    if (unfollowed.length > 0) {
      showError(`🔍 Ditemukan ${unfollowed.length} akun yang unfollow! Cek tab "Unfollow Detector"`);
    } else {
      showError(`✅ Tidak ada yang unfollow! Semua aman.`);
    }
  } catch (err) {
    hideLoading();
    showError(err.message || "Terjadi kesalahan saat membandingkan data.");
    console.error(err);
  }
});

/* ══════════════════════════════════════════════════════════════
       SECTION 6: EXTRACTOR FUNCTIONS (FIXED)
   ══════════════════════════════════════════════════════════════ */
function extractUsernameFromLink(href) {
  if (!href) return null;
  // Regex universal untuk menangkap username dari url instagram (termasuk variasi dengan _u/)
  const match = href.match(/instagram\.com\/(?:_u\/)?([^/"'?#]+)/i);
  if (match && match[1]) {
    let username = match[1].toLowerCase().trim();
    const blacklist = ["explore","p","reel","reels","stories","accounts","directory","about","legal","help","terms","download","your","information","language","meta","privacy","guidelines"];
    if (!blacklist.includes(username) && !username.includes(" ")) {
      return username;
    }
  }
  return null;
}

function extractFollowingWithDate(htmlString, targetSet, dateMap) {
  // Menggunakan DOMParser agar parsing HTML jauh lebih akurat dibanding Regex baris per baris
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const links = doc.querySelectorAll("a[href*='instagram.com']");

  links.forEach(link => {
    const username = extractUsernameFromLink(link.getAttribute("href"));
    if (username) {
      targetSet.add(username);
      
      // Cari teks tanggal di sekitar elemen pembungkus data ini
      let parentContainer = link.closest("div");
      if (parentContainer) {
        const textContent = parentContainer.textContent || "";
        // Deteksi format nama bulan bahasa Inggris atau Indonesia standar beserta tahunnya
        const dateMatch = textContent.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Iba|Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\s+\d+,\s+\d{4}/i);
        if (dateMatch) {
          dateMap.set(username, dateMatch[0]);
        } else {
          // Fallback jika struktur berbeda, ambil teks div paling akhir di dalam kontainer
          const divs = parentContainer.querySelectorAll("div");
          if (divs.length > 0) {
            let lastDivText = divs[divs.length - 1].textContent.trim();
            if (lastDivText && lastDivText !== username && lastDivText.length < 50) {
              dateMap.set(username, lastDivText);
            }
          }
        }
      }
      if (!dateMap.has(username)) {
        dateMap.set(username, "Tanggal tidak tersedia");
      }
    }
  });
}

function extractFollowersWithDate(htmlString, targetSet, dateMap) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const links = doc.querySelectorAll("a[href*='instagram.com']");

  links.forEach(link => {
    const username = extractUsernameFromLink(link.getAttribute("href"));
    if (username) {
      targetSet.add(username);
      
      let parentContainer = link.closest("div");
      if (parentContainer) {
        const divs = parentContainer.querySelectorAll("div");
        if (divs.length > 0) {
          let lastDivText = divs[divs.length - 1].textContent.trim();
          if (lastDivText && lastDivText !== username && lastDivText.length < 50) {
            dateMap.set(username, lastDivText);
          }
        }
      }
      if (!dateMap.has(username)) {
        dateMap.set(username, "Tanggal tidak tersedia");
      }
    }
  });
}

function extractWithRegex(htmlString, targetSet) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const links = doc.querySelectorAll("a[href*='instagram.com']");
  links.forEach(link => {
    const username = extractUsernameFromLink(link.getAttribute("href"));
    if (username) targetSet.add(username);
  });
}

function extractTableText(htmlString, targetSet) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  
  // Ambil dari link jika ada
  const links = doc.querySelectorAll("a[href*='instagram.com']");
  links.forEach(link => {
    const username = extractUsernameFromLink(link.getAttribute("href"));
    if (username) targetSet.add(username);
  });

  // Ambil dari selector tabel teks biasa jika strukturnya berbentuk tabel lama
  const tds = doc.querySelectorAll("td");
  for (let i = 0; i < tds.length; i++) {
    let text = tds[i].textContent.trim();
    if ((text.toLowerCase() === "nama pengguna" || text.toLowerCase() === "username") && tds[i+1]) {
      let username = tds[i+1].textContent.toLowerCase().trim();
      if (username && !username.includes(" ") && !username.startsWith("http")) {
        targetSet.add(username);
      }
    }
  }
}

async function extractDataFromZip(file) {
  const zip = await JSZip.loadAsync(file);
  const followersSet = new Set();
  const followingSet = new Set();
  const followersDateMap = new Map();
  const followingWithDateMap = new Map();
  const recentSet = new Set();
  const blockedSet = new Set();

  for (let [filename, fileData] of Object.entries(zip.files)) {
    if (!fileData.dir && filename.endsWith(".html")) {
      const parts = filename.split(/[\\/]/);
      const justName = parts[parts.length - 1].toLowerCase();
      
      // Menggunakan regex agar file followers_1.html, followers_2.html, dst semuanya terekstraksi penuh
      if (/^followers(_\d+)?\.html$/.test(justName)) {
        const htmlContent = await fileData.async("string");
        extractFollowersWithDate(htmlContent, followersSet, followersDateMap);
      } else if (justName === "following.html") {
        const htmlContent = await fileData.async("string");
        extractFollowingWithDate(htmlContent, followingSet, followingWithDateMap);
      } else if (justName === "recently_unfollowed_profiles.html") {
        extractTableText(await fileData.async("string"), recentSet);
      } else if (justName === "blocked_profiles.html") {
        extractTableText(await fileData.async("string"), blockedSet);
      }
    }
  }

  return {
    followers: Array.from(followersSet),
    following: Array.from(followingSet),
    followersDateMap,
    followingWithDateMap,
    recent: Array.from(recentSet),
    blocked: Array.from(blockedSet),
  };
}

function compareData(oldData, newData) {
  const newFollowingSet = new Set(newData.following);
  return oldData.following.filter(u => !newFollowingSet.has(u));
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
  document.getElementById("badgeUnfoll").textContent = unfoll.length.toLocaleString("id");
  document.getElementById("badgeFans").textContent = fans.length.toLocaleString("id");
  document.getElementById("badgeMutualan").textContent = mutualan.length.toLocaleString("id");
  document.getElementById("badgeRecent").textContent = state.recent.length.toLocaleString("id");
  document.getElementById("badgeBlocked").textContent = state.blocked.length.toLocaleString("id");

  const badgeDetector = document.getElementById("badgeUnfollowDetector");
  if (badgeDetector) badgeDetector.textContent = unfollowDetected.length.toLocaleString("id");

  // Engagement ratios
  const pctUnfoll = grand ? Math.round((unfoll.length / grand) * 100) : 0;
  const pctFans   = grand ? Math.round((fans.length   / grand) * 100) : 0;
  const pctMutualan = grand ? Math.round((mutualan.length / grand) * 100) : 0;

  document.getElementById("ratioUnfoll").textContent = pctUnfoll + "%";
  document.getElementById("ratioFans").textContent = pctFans + "%";
  document.getElementById("ratioMutualan").textContent = pctMutualan + "%";
  document.getElementById("legendUnfoll").textContent = pctUnfoll + "%";
  document.getElementById("legendFans").textContent = pctFans + "%";
  document.getElementById("legendMutualan").textContent = pctMutualan + "%";
  document.getElementById("donutCenter").textContent = grand.toLocaleString("id");
  document.getElementById("mutualScore").textContent = pctMutualan + "%";

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
    document.getElementById("loadMoreInfo").textContent =
      `Menampilkan ${displayCount} dari ${filtered.length.toLocaleString("id")} akun (${remaining} lagi)`;
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
        <a href="https://instagram.com/${encodeURIComponent(username)}" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
          style="border-color:var(--border);color:var(--text-muted);background:var(--bg-muted)">
          <i class="fa-brands fa-instagram text-pink-500"></i> Buka Profil
        </a>
      </td>
    </tr>`;
}

/* ══════════════════════════════════════════════════════════════
       SECTION 11: TAB EVENTS
    ══════════════════════════════════════════════════════════════ */
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
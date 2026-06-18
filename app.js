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
       SECTION 2: FILE UPLOAD & DRAG/DROP
    ══════════════════════════════════════════════════════════════ */
// Event untuk upload file lama
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

// Event untuk upload file baru
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
       SECTION 3: STATE
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
  oldData: { following: [], dateMap: new Map() },
  newData: { following: [], followers: [], dateMap: new Map() },
  unfollowDetected: [],
};

/* ══════════════════════════════════════════════════════════════
       SECTION 4: ZIP PROCESSING (DENGAN EKSTRAKSI TANGGAL)
    ══════════════════════════════════════════════════════════════ */
// Handle file lama
async function handleOldFile(file) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    showError("File lama harus berformat .zip");
    return;
  }
  
  document.getElementById("oldFileStatus").textContent = `⏳ Memproses ${file.name}...`;
  
  try {
    oldFileData = await extractDataFromZip(file);
    document.getElementById("oldFileStatus").textContent = `✅ ${file.name} (${oldFileData.following.length} following)`;
    document.getElementById("oldFileLabel").innerHTML = `<span class="text-green-500">✅</span> ${file.name}`;
    checkBothFilesReady();
  } catch (err) {
    document.getElementById("oldFileStatus").textContent = `❌ Gagal memproses: ${err.message}`;
    console.error(err);
  }
}

// Handle file baru
async function handleNewFile(file) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    showError("File baru harus berformat .zip");
    return;
  }
  
  document.getElementById("newFileStatus").textContent = `⏳ Memproses ${file.name}...`;
  
  try {
    newFileData = await extractDataFromZip(file);
    document.getElementById("newFileStatus").textContent = `✅ ${file.name} (${newFileData.following.length} following)`;
    document.getElementById("newFileLabel").innerHTML = `<span class="text-green-500">✅</span> ${file.name}`;
    checkBothFilesReady();
  } catch (err) {
    document.getElementById("newFileStatus").textContent = `❌ Gagal memproses: ${err.message}`;
    console.error(err);
  }
}

// Cek apakah kedua file sudah siap
function checkBothFilesReady() {
  const btn = document.getElementById("compareBtn");
  if (oldFileData && newFileData) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-arrow-right-arrow-left mr-2"></i> Bandingkan Kedua File`;
  } else {
    btn.disabled = true;
  }
}

// Tombol Bandingkan
document.getElementById("compareBtn").addEventListener("click", async () => {
  if (!oldFileData || !newFileData) {
    showError("Silakan upload kedua file terlebih dahulu!");
    return;
  }

  showLoading();

  try {
    // Deteksi unfollow
    const unfollowed = compareData(oldFileData, newFileData);
    
    // Gabungkan date map dari kedua file
    const combinedDateMap = new Map();
    oldFileData.followingWithDateMap.forEach((date, username) => combinedDateMap.set(username, date));
    newFileData.followingWithDateMap.forEach((date, username) => combinedDateMap.set(username, date));
    newFileData.followersDateMap.forEach((date, username) => combinedDateMap.set(username, date));

    // Set state
    state.unfoll = newFileData.following.filter((u) => !newFileData.followers.includes(u));
    state.fans = newFileData.followers.filter((u) => !newFileData.following.includes(u));
    state.mutualan = newFileData.following.filter((u) => newFileData.followers.includes(u));
    state.recent = newFileData.recent;
    state.blocked = newFileData.blocked;
    state.combinedDateMap = combinedDateMap;
    state.unfollowDetected = unfollowed;
    
    // Simpan data baru sebagai old untuk next time
    state.oldData = oldFileData;
    state.newData = newFileData;

    state.unfollPage = 0;
    state.searchQuery = "";

    renderResults(newFileData.followers.length, newFileData.following.length);
    showResults();
    
    // Tampilkan notifikasi jumlah unfollow
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

/**
 * Ekstrak username dan tanggal dari following.html
 * Format: <h2>username</h2> ... <div>Tanggal</div>
 */
function extractFollowingWithDate(htmlString, targetSet, dateMap) {
    const pattern = /<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<div>([^<]+)<\/div>/gi;
    let match;
    let blacklist = ["explore", "p", "reel", "reels", "stories", "accounts", "directory", "about", "legal", "help"];

    while ((match = pattern.exec(htmlString)) !== null) {
        let username = match[1].toLowerCase().trim();
        let date = match[2].trim();

        if (username && !blacklist.includes(username) && username.length > 0 && !username.includes(' ')) {
            targetSet.add(username);
            if (date && date.length > 0 && !dateMap.has(username)) {
                dateMap.set(username, date);
            }
        }
    }

    // Fallback jika pola di atas gagal
    if (dateMap.size === 0) {
        const linkRegex = /href=["']https?:\/\/(?:www\.)?instagram\.com\/(?:_u\/)?([^/"'?#]+)/gi;
        let linkMatch;
        let tempUsernames = [];
        while ((linkMatch = linkRegex.exec(htmlString)) !== null) {
            let username = linkMatch[1].toLowerCase().trim();
            if (username && !blacklist.includes(username)) {
                tempUsernames.push(username);
                targetSet.add(username);
            }
        }
        tempUsernames.forEach(u => {
            if (!dateMap.has(u)) {
                dateMap.set(u, "Tanggal tidak tersedia");
            }
        });
    }
}

/**
 * Ekstrak username dan tanggal dari followers.html
 * Format: <a href="...">username</a> ... <div>Jun 18, 2026 3:45 am</div>
 */
function extractFollowersWithDate(htmlString, targetSet, dateMap) {
    const regex = /<a[^>]*href="https:\/\/www\.instagram\.com\/([^/"'?#]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div>([^<]+)<\/div>/gi;
    let match;
    const blacklist = ["explore", "p", "reel", "reels", "stories", "accounts", "directory"];

    while ((match = regex.exec(htmlString)) !== null) {
        let username = match[1].toLowerCase().trim();
        let date = match[3].trim();

        if (username && !blacklist.includes(username) && username.length > 0 && !username.includes(' ')) {
            targetSet.add(username);
            if (date && date.length > 0 && !dateMap.has(username)) {
                dateMap.set(username, date);
            }
        }
    }
}

/**
 * SUPER REGEX EXTRACTOR (Akurat Berbasis Tautan Profil IG)
 */
function extractWithRegex(htmlString, targetSet) {
  const regex =
    /href=["']https?:\/\/(?:www\.)?instagram\.com\/(?:_u\/)?([^/"'?#]+)/gi;
  let match;
  const blacklist = [
    "explore",
    "p",
    "reel",
    "reels",
    "stories",
    "accounts",
    "directory",
    "about",
    "legal",
    "help",
    "terms",
    "download",
    "your",
    "information",
    "language",
    "meta",
    "privacy",
    "guidelines",
  ];

  while ((match = regex.exec(htmlString)) !== null) {
    let username = match[1].toLowerCase().trim();
    if (username && !blacklist.includes(username)) {
      targetSet.add(username);
    }
  }
}

/**
 * TABLE EXTRACTOR (Kombinasi Ekstrak Tautan dan Tabel Teks IG)
 */
function extractTableText(htmlString, targetSet) {
  const linkRegex =
    /href=["']https?:\/\/(?:www\.)?instagram\.com\/(?:_u\/)?([^/"'?#]+)/gi;
  let matchLink;
  while ((matchLink = linkRegex.exec(htmlString)) !== null) {
    let username = matchLink[1].toLowerCase().trim();
    if (username && username !== "instagram.com") {
      targetSet.add(username);
    }
  }

  const tdRegex = /(?:Nama pengguna|Username)<\/td><td[^>]*>([^<]+)<\/td>/gi;
  let matchTd;
  while ((matchTd = tdRegex.exec(htmlString)) !== null) {
    let username = matchTd[1].toLowerCase().trim();
    if (username && !username.includes(" ") && !username.startsWith("http")) {
      targetSet.add(username);
    }
  }
}

// Ekstrak data dari file ZIP
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

// Fungsi untuk membandingkan dua data
function compareData(oldData, newData) {
  const oldFollowingSet = new Set(oldData.following);
  const newFollowingSet = new Set(newData.following);
  
  // Cari yang ada di old tapi tidak ada di new
  const unfollowed = oldData.following.filter(u => !newFollowingSet.has(u));
  
  return unfollowed;
}

/* ══════════════════════════════════════════════════════════════
       SECTION 5: RENDER RESULTS
    ══════════════════════════════════════════════════════════════ */
function renderResults(followersCount, followingCount) {
  const { unfoll, fans, mutualan, unfollowDetected } = state; // <- Perbaikan di sini
  const total = followersCount + fans.length;
  const grand = unfoll.length + fans.length + mutualan.length;

  animateNumber("statFollowing", followingCount);
  animateNumber("statFollowers", followersCount);
  animateNumber("statUnfoll", unfoll.length);
  animateNumber("statMutualan", mutualan.length);

  document.getElementById("badgeUnfoll").textContent =
    unfoll.length.toLocaleString("id");
  document.getElementById("badgeFans").textContent =
    fans.length.toLocaleString("id");
  document.getElementById("badgeMutualan").textContent =
    mutualan.length.toLocaleString("id");
  document.getElementById("badgeRecent").textContent =
    state.recent.length.toLocaleString("id");
  document.getElementById("badgeBlocked").textContent =
    state.blocked.length.toLocaleString("id");

  // Unfollow Detector badge
  const badgeDetector = document.getElementById("badgeUnfollowDetector");
  if (badgeDetector) {
    badgeDetector.textContent = unfollowDetected.length.toLocaleString("id");
  }

  const pctUnfoll = grand ? Math.round((unfoll.length / grand) * 100) : 0;
  const pctFans = grand ? Math.round((fans.length / grand) * 100) : 0;
  const pctMutualan = grand ? Math.round((mutualan.length / grand) * 100) : 0;

  document.getElementById("ratioUnfoll").textContent = pctUnfoll + "%";
  document.getElementById("ratioFans").textContent = pctFans + "%";
  document.getElementById("ratioMutualan").textContent = pctMutualan + "%";
  document.getElementById("legendUnfoll").textContent = pctUnfoll + "%";
  document.getElementById("legendFans").textContent = pctFans + "%";
  document.getElementById("legendMutualan").textContent = pctMutualan + "%";
  document.getElementById("donutCenter").textContent =
    grand.toLocaleString("id");
  document.getElementById("mutualScore").textContent = pctMutualan + "%";

  setTimeout(() => {
    document.getElementById("progUnfoll").style.width = pctUnfoll + "%";
    document.getElementById("progFans").style.width = pctFans + "%";
    document.getElementById("progMutualan").style.width = pctMutualan + "%";
  }, 100);

  renderDonut(pctUnfoll, pctFans, pctMutualan);
  renderTable();
}

const CIRCUMFERENCE = 2 * Math.PI * 48;

function renderDonut(pctUnfoll, pctFans, pctMutualan) {
  const segUnfoll = (pctUnfoll / 100) * CIRCUMFERENCE;
  const segFans = (pctFans / 100) * CIRCUMFERENCE;
  const segMutualan = (pctMutualan / 100) * CIRCUMFERENCE;

  const gap = 4;
  const dUnfoll = document.getElementById("donutUnfoll");
  dUnfoll.style.strokeDasharray = `${Math.max(0, segUnfoll - gap)} ${CIRCUMFERENCE}`;
  dUnfoll.style.strokeDashoffset = 0;

  const dFans = document.getElementById("donutFans");
  dFans.style.strokeDasharray = `${Math.max(0, segFans - gap)} ${CIRCUMFERENCE}`;
  dFans.style.strokeDashoffset = -segUnfoll;

  const dMutualan = document.getElementById("donutMutualan");
  dMutualan.style.strokeDasharray = `${Math.max(0, segMutualan - gap)} ${CIRCUMFERENCE}`;
  dMutualan.style.strokeDashoffset = -(segUnfoll + segFans);
}

/* ══════════════════════════════════════════════════════════════
       SECTION 6: TABLE RENDERING (DENGAN TANGGAL)
    ══════════════════════════════════════════════════════════════ */
function renderTable() {
    const { activeTab, unfollPage, PAGE_SIZE, searchQuery, unfollowDetected } = state;

    const tierHeader = document.getElementById("tierHeader");
    const tierFilterWrap = document.getElementById("tierFilterWrap");
    const loadMoreWrap = document.getElementById("loadMoreWrap");
    const emptyState = document.getElementById("emptyState");
    const tableBody = document.getElementById("tableBody");

    // Sembunyikan elemen tier
    if (tierHeader) tierHeader.style.display = "none";
    if (tierFilterWrap) tierFilterWrap.style.display = "none";

    let source;
    const dateMap = state.combinedDateMap || new Map();
    
    if (activeTab === "unfoll") {
        source = state.unfoll;
    } else if (activeTab === "fans") {
        source = state.fans;
    } else if (activeTab === "mutualan") {
        source = state.mutualan;
    } else if (activeTab === "recent") {
        source = state.recent;
    } else if (activeTab === "blocked") {
        source = state.blocked;
    } else if (activeTab === "unfollow_detector") {
        // NEW: Gunakan data unfollowDetected
        source = unfollowDetected;
    }

    let filtered = source;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = source.filter((u) => u.toLowerCase().includes(q));
    }

    let toRender = filtered;
    let showLoadMore = false;

    const displayCount = (unfollPage + 1) * PAGE_SIZE;
    toRender = filtered.slice(0, displayCount);
    showLoadMore = filtered.length > displayCount;

    if (showLoadMore) {
        const remaining = filtered.length - displayCount;
        document.getElementById("loadMoreInfo").textContent =
            `Menampilkan ${displayCount} dari ${filtered.length.toLocaleString("id")} akun (${remaining} lagi)`;
    }

    loadMoreWrap.classList.toggle("hidden", !showLoadMore);

    if (toRender.length === 0) {
        tableBody.innerHTML = "";
        emptyState.classList.remove("hidden");
        
        // Tampilkan pesan khusus untuk unfollow detector
        if (activeTab === "unfollow_detector") {
            const oldData = loadOldFollowing();
            if (!oldData) {
                emptyState.innerHTML = `
                    <div class="text-4xl mb-3">📊</div>
                    <p class="font-medium text-sm" style="color:var(--text-primary)">Belum ada data lama</p>
                    <p class="text-xs mt-1 max-w-sm mx-auto" style="color:var(--text-muted)">
                        Upload file ZIP pertama kali untuk menyimpan data following sebagai baseline.
                        Upload kedua kalinya akan mendeteksi siapa yang unfollow.
                    </p>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="text-4xl mb-3">✅</div>
                    <p class="font-medium text-sm" style="color:var(--text-primary)">Tidak ada yang unfollow</p>
                    <p class="text-xs mt-1" style="color:var(--text-muted)">Semua akun yang kamu follow masih follow balik</p>
                `;
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
    // Ambil tanggal follow jika ada
    const followDate = dateMap.get(username) || "";
    
    // Format tampilan tanggal
    let dateDisplay = '';
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
        // NEW: Status khusus untuk Unfollow Detector
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
       SECTION 7: TAB EVENTS
    ══════════════════════════════════════════════════════════════ */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.style.color = "var(--text-muted)";
    });
    btn.classList.add("active");
    btn.style.color = "";

    state.activeTab = btn.dataset.tab;
    state.searchQuery = "";
    state.unfollPage = 0;
    document.getElementById("searchInput").value = "";
    renderTable();
  });
});

let searchTimeout;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = e.target.value.trim();
    state.unfollPage = 0;
    renderTable();
  }, 250);
});

document.getElementById("loadMoreBtn").addEventListener("click", () => {
  state.unfollPage++;
  renderTable();
  document
    .getElementById("loadMoreWrap")
    .scrollIntoView({ behavior: "smooth", block: "center" });
});

document.getElementById("resetBtn").addEventListener("click", resetApp);

/* ══════════════════════════════════════════════════════════════
       SECTION 8: UI HELPERS
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
}

function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
  document.getElementById("errorToast").classList.remove("hidden");
}

function hideError() {
  document.getElementById("errorToast").classList.add("hidden");
}

function resetApp() {
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
    oldFollowing: [],
    unfollowDetected: [],
  };

  document.getElementById("resultsSection").classList.add("hidden");
  document.getElementById("uploadSection").classList.remove("hidden");
  document.getElementById("fileInput").value = "";
  document.getElementById("searchInput").value = "";
  hideError();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cssId(username) {
  return username.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let state = {
    raw: [],        // parsed exception stat rows
    stats: [],      // parsed stat absen
    filtered: [],   // filtered raw
    employees: [],  // unique employees list
    empMaster: [],  // master list dari Lap. Log Absen (urutan sheet)
    months: [],     // unique months
    tanggalMerahDates: new Set(), // tanggal merah terdeteksi
    activeMonth: '',
    dateFrom: '', dateTo: '',
    history: JSON.parse(localStorage.getItem('pres_history') || '[]'),
    charts: {},
    resignedIds: JSON.parse(localStorage.getItem('pres_resigned') || '[]'),
    avatars: JSON.parse(localStorage.getItem('pres_avatars') || '{}'),
    isAdmin: false,
    adminPin: localStorage.getItem('pres_admin_pin') || '1234',
    holidays: new Set(), // computed public holidays + weekend
};

// ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════
const STD_IN = 8 * 60;       // 08:00 — patokan masuk
const STD_OUT = 16 * 60;      // 16:00 — patokan pulang (untuk single punch)
const OT_START = 17 * 60;      // 17:00 — lembur dihitung setelah ini
const LATE_TOL = 5;            // toleransi 5 menit → terlambat jika masuk > 08:05
const LATE_LIMIT = STD_IN + LATE_TOL; // 08:05 in minutes

// ══════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════
function toggleTheme() {
    const html = document.documentElement;
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('pres_theme', next);
    updateThemeIcon();
    Object.values(state.charts).forEach(c => { try { c.destroy(); } catch (e) { } });
    state.charts = {};
    renderCurrentSection();
}
function updateThemeIcon() {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.getElementById('themeIcon').innerHTML = dark
        ? '<circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41"/>'
        : '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>';
}
const savedTheme = localStorage.getItem('pres_theme');
if (savedTheme) { document.documentElement.dataset.theme = savedTheme; updateThemeIcon(); }

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
let currentSection = 'overview';
function switchSection(sec) {
    currentSection = sec;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.sec === sec));
    document.querySelectorAll('.section').forEach(el => el.classList.toggle('active', el.id === 'sec-' + sec));
    const titles = { overview: 'Ringkasan Umum', leaderboard: 'Leaderboard Performa', personal: 'Profil Karyawan', table: 'Data Presensi', history: 'Riwayat Upload' };
    document.getElementById('pageTitle').textContent = titles[sec] || sec;
    const hasData = state.raw.length > 0;
    document.getElementById('filterWrap').style.display = hasData && ['overview', 'leaderboard', 'table'].includes(sec) ? '' : 'none';
    // document.getElementById('btnExport').style.display = hasData && sec === 'table' ? '' : 'none';
    renderCurrentSection();
}
function goToProfile(empId) {
    switchSection('personal');
    const sel = document.getElementById('empSelector');
    if (sel) { sel.value = empId; renderPersonal(); }
}
function renderCurrentSection() {
    if (document.getElementById('sec-overview')) {
        renderOverview();
    }
    if (document.getElementById('sec-leaderboard')) {
        renderLeaderboard();
    }
    if (document.getElementById('sec-personal')) {
        renderPersonalSection();
    }
    if (document.getElementById('sec-table')) {
        renderTable();
    }
    if (document.getElementById('sec-history')) {
        renderHistory();
    }
}

// ══════════════════════════════════════════════
// FILE UPLOAD (MANUAL)
// ══════════════════════════════════════════════
const uploadZone = document.getElementById('uploadZone');
if (uploadZone) {
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
}

// Tambahkan listener ini untuk tombol upload manual di UI
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                handleFile(this.files[0]);
            }
        });
    } else {
        console.warn("[DEBUG UI] Elemen <input id='fileInput'> tidak ditemukan di HTML!");
    }
});

function handleFile(file) {
    if (!file) return;
    console.log(`[DEBUG UPLOAD] Memulai upload manual file: ${file.name} (${file.size} bytes)`);
    const reader = new FileReader();
    reader.onload = e => {
        try {
            console.log(`[DEBUG UPLOAD] File ${file.name} berhasil dibaca, mulai proses XLSX.read...`);
            const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });

            // ── Deteksi duplikat bulan sebelum parsing ──
            let detectedYM = null;
            const fnMatch = (file.name || '').match(/(\d{4})[-_](\d{2})/);
            if (fnMatch) detectedYM = `${fnMatch[1]}-${fnMatch[2]}`;

            if (detectedYM && state.months.includes(detectedYM)) {
                const mLabel = monthLabel(detectedYM);
                const confirm = window.confirm(`⚠️ PERINGATAN: Data bulan ${mLabel} sudah pernah diupload sebelumnya! Lanjut?`);
                if (!confirm) return;
            }

            parseWorkbook(wb, file.name);
            addHistory(file.name, file.size, state.raw.length);
        } catch (err) {
            console.error('[ERROR UPLOAD] Gagal membaca file:', err);
            // alert('Gagal membaca file: ' + err.message);
        }
    };
    reader.readAsBinaryString(file);
}

// ══════════════════════════════════════════════
// PARSER UTAMA: Lap. Log Absen
// ══════════════════════════════════════════════
function parseLogCell(cellVal) {
    if (!cellVal) return { masuk: null, keluar: null, status: null };
    const s = String(cellVal).trim();
    if (s === 'S' || s === 'SAKIT') return { masuk: null, keluar: null, status: 'S' };
    if (/^(CUTI|IZIN)/i.test(s)) return { masuk: null, keluar: null, status: 'CUTI' };

    const times = (s.match(/\d{2}:\d{2}/g) || []);
    if (!times.length) return { masuk: null, keluar: null, status: null };

    const masukArr = times.filter(t => parseInt(t) < 14);
    const keluarArr = times.filter(t => parseInt(t) >= 14);

    const masuk = masukArr.length ? masukArr[0] : null;
    const keluar = keluarArr.length ? keluarArr[keluarArr.length - 1] : null;

    if (times.length === 1) {
        const h = parseInt(times[0]);
        if (h >= 14) return { masuk: null, keluar: times[0], status: null };
        return { masuk: times[0], keluar: null, status: null };
    }

    return { masuk, keluar, status: null };
}

function parseWorkbook(wb, fname) {
    console.log(`\n========================================`);
    console.log(`[DEBUG PARSER] Mulai parseWorkbook untuk: ${fname}`);
    console.log(`[DEBUG PARSER] Sheet Names di Excel ini:`, wb.SheetNames);

    const existingDates = new Set(state.raw.map(r => r.date + '|' + r.id));
    let newRows = [];
    let newStats = [];

    state.tanggalMerahDates = new Set();

    // Deteksi Sheet
    const logSheet = wb.SheetNames.find(n => n.toLowerCase().includes('lap') && n.toLowerCase().includes('log'));
    const excSheet = wb.SheetNames.find(n => n.toLowerCase().includes('exception') || n.toLowerCase().includes('exc'));
    const statSheet = wb.SheetNames.find(n => n.toLowerCase().includes('stat') && n.toLowerCase().includes('absen'));

    console.log(`[DEBUG PARSER] Hasil pencarian sheet:`);
    console.log(`  - logSheet (Lap Log):`, logSheet || 'TIDAK DITEMUKAN');
    console.log(`  - excSheet (Exception):`, excSheet || 'TIDAK DITEMUKAN');
    console.log(`  - statSheet (Stat Absen):`, statSheet || 'TIDAK DITEMUKAN');

    if (logSheet) {
        console.log(`[DEBUG PARSER] Memproses logSheet: ${logSheet}...`);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[logSheet], { header: 1, defval: null });

        const dateRow = rows[1] || [];
        let year = new Date().getFullYear(), month = new Date().getMonth() + 1;

        let foundFromSheet = false;
        for (let ri = 0; ri < Math.min(5, rows.length); ri++) {
            const row = rows[ri];
            if (!row) continue;
            for (const cell of row) {
                if (!cell) continue;
                const s = String(cell);
                const m1 = s.match(/(\d{4})-(\d{2})-\d{2}/);
                if (m1) { year = parseInt(m1[1]); month = parseInt(m1[2]); foundFromSheet = true; break; }
            }
            if (foundFromSheet) break;
        }

        const colDateMap = {};
        dateRow.forEach((v, ci) => {
            if (v && !isNaN(Number(v))) {
                const day = parseInt(v);
                if (day >= 1 && day <= 31) {
                    const mm = String(month).padStart(2, '0');
                    const dd = String(day).padStart(2, '0');
                    colDateMap[ci] = `${year}-${mm}-${dd}`;
                }
            }
        });

        const EXCLUDE_NAMES = ['AYU', 'KRISMAWATI', 'RIRIS'];
        const rawByDate = {};
        const empBlocks = [];

        let i = 2;
        while (i < rows.length) {
            const hRow = rows[i];
            if (!hRow) { i++; continue; }

            if (hRow[0] === 'ID:') {
                const empId = String(hRow[2] || '').trim();
                const empNama = String(hRow[10] || '').trim().toUpperCase();
                const empDept = String(hRow[20] || 'Perusahaan').trim();
                const dRow = rows[i + 1] || [];

                if (!empNama || !empId || EXCLUDE_NAMES.includes(empNama)) {
                    i += 2; continue;
                }

                empBlocks.push({ empId, empNama, empDept, dRow });

                Object.entries(colDateMap).forEach(([ci, dateStr]) => {
                    const cellVal = dRow[parseInt(ci)];
                    if (!rawByDate[dateStr]) rawByDate[dateStr] = [];
                    rawByDate[dateStr].push({ empId, cellVal });
                });

                i += 2;
            } else { i++; }
        }

        const tanggalMerah = new Set();
        Object.entries(rawByDate).forEach(([dateStr, entries]) => {
            const dow = getDow(dateStr);
            if (dow >= 1 && dow <= 5) {
                const anyHasLog = entries.some(e => e.cellVal && String(e.cellVal).trim() !== 'null' && String(e.cellVal).trim() !== '');
                if (!anyHasLog) tanggalMerah.add(dateStr);
            }
        });
        tanggalMerah.forEach(d => state.tanggalMerahDates.add(d));

        empBlocks.forEach(({ empId, empNama, empDept, dRow }) => {
            if (!state.empMaster.find(e => e.id === empId)) {
                state.empMaster.push({ id: empId, nama: empNama, dept: empDept });
            }

            Object.entries(colDateMap).forEach(([ci, dateStr]) => {
                const colIdx = parseInt(ci);
                const cellVal = dRow[colIdx];
                const dow = getDow(dateStr);
                const isWeekend = dow === 0 || dow === 6;

                if (isWeekend || tanggalMerah.has(dateStr)) return;

                const { masuk, keluar, status } = parseLogCell(cellVal);
                let isHadir = (masuk || keluar) && status !== 'S' && status !== 'CUTI';

                let terlambat_min = 0;
                if (masuk && isHadir) {
                    const [mh, mm] = masuk.split(':').map(Number);
                    if (mh * 60 + mm > LATE_LIMIT) terlambat_min = (mh * 60 + mm) - LATE_LIMIT;
                }

                let ot_min = 0;
                if (keluar && isHadir) {
                    const [kh, km] = keluar.split(':').map(Number);
                    if (kh * 60 + km > OT_START) ot_min = (kh * 60 + km) - OT_START;
                }

                let total_min = 0;
                if (isHadir) {
                    const [mh, mm] = (masuk || '08:00').split(':').map(Number);
                    const [kh, km] = (keluar || '16:00').split(':').map(Number);
                    total_min = Math.max(0, (kh * 60 + km) - (mh * 60 + mm));
                }

                const key = dateStr + '|' + empId;
                if (!existingDates.has(key)) {
                    existingDates.add(key);
                    newRows.push({
                        id: empId, nama: empNama, dept: empDept, date: dateStr,
                        masuk, keluar, terlambat_min, pulang_awal_min: 0,
                        absen_min: isHadir ? 0 : 480, total_min, isHadir, ot_min,
                        isWeekend: false, statusNote: status, isTanggalMerah: false
                    });
                }
            });
        });
    }

    console.log(`[DEBUG PARSER] Jumlah newRows didapat: ${newRows.length}`);

    // Update state
    state.raw = [...state.raw, ...newRows];
    console.log(`[DEBUG PARSER] Total baris data di state.raw sekarang: ${state.raw.length}`);

    if (state.empMaster.length > 0) {
        state.employees = [...state.empMaster].sort((a, b) => a.nama.localeCompare(b.nama));
    } else {
        const empMap = {};
        state.raw.forEach(r => { if (!empMap[r.id]) empMap[r.id] = { id: r.id, nama: r.nama, dept: r.dept }; });
        state.employees = Object.values(empMap).sort((a, b) => a.nama.localeCompare(b.nama));
    }

    const monthSet = new Set();
    state.raw.forEach(r => { if (r.date) monthSet.add(r.date.substring(0, 7)); });
    state.months = [...monthSet].sort();

    state.filtered = state.raw.filter(r => !r.isWeekend);
    state.activeMonth = '';

    console.log(`[DEBUG UI] Memperbarui antarmuka pengguna...`);

    // CEK ELEMEN HTML
    const overviewEmpty = document.getElementById('overviewEmpty');
    const overviewDash = document.getElementById('overviewDash');
    const filterWrap = document.getElementById('filterWrap');

    console.log(`[DEBUG UI] Elemen overviewEmpty ditemukan?`, !!overviewEmpty);
    console.log(`[DEBUG UI] Elemen overviewDash ditemukan?`, !!overviewDash);

    // Update pageSub selalu (ada data atau tidak)
    try {
        document.getElementById('pageSub').textContent = state.raw.length > 0 
            ? `${state.employees.length} karyawan · ${state.raw.length} catatan · ${state.months.length} bulan`
            : 'Tidak ada data';
    } catch (e) {
        console.warn("[DEBUG UI] Gagal update pageSub:", e.message);
    }

    if (state.raw.length > 0) {
        console.log(`[DEBUG UI] Data > 0, mencoba menyembunyikan Empty State dan memunculkan Dashboard`);
        if (overviewEmpty) overviewEmpty.style.display = 'none';
        if (overviewDash) overviewDash.style.display = '';
        if (filterWrap) filterWrap.style.display = '';
        // TAMBAHKAN INI AGAR DASHBOARD PERSONAL MUNCUL
        const pEmpty = document.getElementById('personalEmpty');
        const pDash = document.getElementById('personalDash');
        if (pEmpty) pEmpty.style.display = 'none';
        if (pDash) pDash.style.display = 'block';

        document.getElementById('nbEmp').textContent = state.employees.length;
        document.getElementById('nbRows').textContent = state.raw.length;
        updateMonthFilters();
        populateEmpSelectors();

        // Elemen tambahan yang perlu diupdate (jika ada)
        try {
            // document.getElementById('btnExport').style.display = '';
            document.getElementById('lbEmpty').style.display = 'none';
            document.getElementById('lbDash').style.display = '';
            document.getElementById('personalEmpty').style.display = 'none';
            document.getElementById('personalDash').style.display = '';
            document.getElementById('btnAdmin').style.display = '';
        } catch (e) {
            console.warn("[DEBUG UI] Ada elemen UI (selain overview) yang gagal diupdate. Mungkin elemennya tidak ada di HTML.", e.message);
        }

        renderCurrentSection();
    } else {
        console.warn(`[DEBUG UI] PERINGATAN: Data state.raw KOSONG! Tampilan tidak akan diubah.`);
    }
    console.log(`========================================\n`);
}

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function getDow(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
}
function fmtMin(m) {
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60), mn = m % 60;
    return mn > 0 ? `${h}j ${mn}m` : `${h}j`;
}
function monthLabel(ym) {
    const [y, m] = ym.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${names[parseInt(m) - 1]} ${y}`;
}
function getThemeColor(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function initChart(id, config) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (state.charts[id]) { state.charts[id].destroy(); }
    const ctx = el.getContext('2d');
    const c = new Chart(ctx, config);
    state.charts[id] = c;
    return c;
}
function chartDefaults() {
    return {
        color: getThemeColor('--text2'),
        scales: { x: { grid: { color: getThemeColor('--border') }, ticks: { color: getThemeColor('--text3'), font: { size: 10 } } }, y: { grid: { color: getThemeColor('--border') }, ticks: { color: getThemeColor('--text3'), font: { size: 10 } } } },
        plugins: { legend: { labels: { color: getThemeColor('--text2'), font: { size: 11 } } } }
    };
}

// ══════════════════════════════════════════════
// FILTERS
// ══════════════════════════════════════════════
function updateMonthFilters() {
    const opts = `<option value="">Semua Bulan</option>` + state.months.map(m => `<option value="${m}">${monthLabel(m)}</option>`).join('');
    const mFilt = document.getElementById('monthFilter');
    const pFilt = document.getElementById('personalMonth');const mFiltMobile = document.getElementById('monthFilterMobile');
    if (mFilt) mFilt.innerHTML = opts;
    if (pFilt) pFilt.innerHTML = opts;if (mFiltMobile) mFiltMobile.innerHTML = opts;
    renderMonthTabs('monthTabs');
    renderMonthTabs('lbMonthTabs');
}
function renderMonthTabs(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<button class="month-tab ${state.activeMonth === '' ? 'active' : ''}" onclick="setActiveMonth('')">Semua</button>` +
        state.months.map(m => `<button class="month-tab ${state.activeMonth === m ? 'active' : ''}" onclick="setActiveMonth('${m}')">${monthLabel(m)}</button>`).join('');
}
function setActiveMonth(m) {
    state.activeMonth = m;
    const mFilt = document.getElementById('monthFilter');
    const mFiltMobile = document.getElementById('monthFilterMobile');
    if (mFilt) mFilt.value = m;
    if (mFiltMobile) mFiltMobile.value = m;
    applyFilters();
}
function applyFilters() {
    // Cek apakah kita sedang di mode mobile (tombol filter mobile terlihat)
    const isMobile = window.innerWidth <= 1200;

    let mf, df, dt;

    if (isMobile) {
        // Ambil nilai dari input modal
        mf = document.getElementById('monthFilterMobile').value;
        df = document.getElementById('dateFromMobile').value;
        dt = document.getElementById('dateToMobile').value;
        
        // SINKRONISASI: Update input desktop agar tetap sama nilainya (opsional tapi bagus)
        document.getElementById('monthFilter').value = mf;
        document.getElementById('dateFrom').value = df;
        document.getElementById('dateTo').value = dt;
    } else {
        // Ambil nilai dari input desktop (seperti biasa)
        mf = document.getElementById('monthFilter').value;
        df = document.getElementById('dateFrom').value;
        dt = document.getElementById('dateTo').value;
    }

    state.activeMonth = mf;
    state.dateFrom = df;
    state.dateTo = dt;

    renderMonthTabs('monthTabs');
    renderMonthTabs('lbMonthTabs');

    state.filtered = state.raw.filter(r => {
        if (r.isWeekend) return false; 
        if (mf && !r.date.startsWith(mf)) return false;
        if (state.dateFrom && r.date < state.dateFrom) return false;
        if (state.dateTo && r.date > state.dateTo) return false;
        return true;
    });

    renderCurrentSection();
}
function resetFilters() {
    state.activeMonth = '';
    state.dateFrom = '';
    state.dateTo = '';

    // Reset input desktop
    document.getElementById('monthFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';

    // Reset input mobile (modal)
    const mfM = document.getElementById('monthFilterMobile');
    const dfM = document.getElementById('dateFromMobile');
    const dtM = document.getElementById('dateToMobile');
    
    if (mfM) mfM.value = '';
    if (dfM) dfM.value = '';
    if (dtM) dtM.value = '';

    state.filtered = state.raw.filter(r => !r.isWeekend);
    renderMonthTabs('monthTabs');
    renderMonthTabs('lbMonthTabs');
    renderCurrentSection();
}

// Mobile Filter Functions
function openFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'flex';
}

function closeFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) modal.style.display = 'none';
}

function syncFilters(source) {
    if (source === 'mobile') {
        // Sync dari mobile ke desktop
        const monthMobile = document.getElementById('monthFilterMobile');
        const dateFromMobile = document.getElementById('dateFromMobile');
        const dateToMobile = document.getElementById('dateToMobile');
        
        if (monthMobile) document.getElementById('monthFilter').value = monthMobile.value;
        if (dateFromMobile) document.getElementById('dateFrom').value = dateFromMobile.value;
        if (dateToMobile) document.getElementById('dateTo').value = dateToMobile.value;
        
        // Apply filters immediately
        applyFilters();
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function getFilteredStats() {
    const empMap = {};
    state.filtered.forEach(r => {
        if (!empMap[r.id]) empMap[r.id] = { id: r.id, nama: r.nama, dept: r.dept, hari_hadir: 0, absen_hari: 0, terlambat_kali: 0, terlambat_min: 0, ot_min: 0 };
        const e = empMap[r.id];
        if (r.isHadir) e.hari_hadir++; else e.absen_hari++;
        if (r.terlambat_min > LATE_TOL) { e.terlambat_kali++; e.terlambat_min += r.terlambat_min; }
        e.ot_min += r.ot_min || 0;
    });
    return Object.values(empMap);
}

// ══════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════
function renderOverview() {
    const data = state.filtered;
    if (!data.length) return;
    const stats = getFilteredStats();
    const totalRows = data.length;
    const totalHadir = data.filter(r => r.isHadir).length;
    const totalAbsen = data.filter(r => !r.isHadir).length;
    const totalLate = data.filter(r => r.terlambat_min > LATE_TOL).length;
    const totalOTMin = data.reduce((s, r) => s + (r.ot_min || 0), 0);
    const attendRate = totalRows ? Math.round(totalHadir / totalRows * 100) : 0;
    const workdays = new Set(data.filter(r => r.isHadir).map(r => r.date)).size;

    document.getElementById('kpiEmp').textContent = state.employees.length;
    document.getElementById('kpiAttend').textContent = attendRate + '%';
    document.getElementById('kpiLate').textContent = totalLate;
    document.getElementById('kpiOT').textContent = fmtMin(totalOTMin);
    document.getElementById('kpiWorkdays').textContent = workdays;
    document.getElementById('kpiAbsent').textContent = totalAbsen;

    const isAllMonths = !state.activeMonth; // true = semua bulan → tampilkan per bulan

    const blue = getThemeColor('--blue');
    const red = getThemeColor('--red');
    const yellow = getThemeColor('--yellow');
    const green = getThemeColor('--green');
    const purple = getThemeColor('--purple');

    // ── Tren Kehadiran: SELALU line chart, sumbu X per bulan (Semua) atau per hari (bulan tertentu) ──
    if (isAllMonths) {
        // Agregat per bulan → line chart
        const monthMapTrend = {};
        data.forEach(r => {
            const m = r.date.substring(0, 7);
            if (!monthMapTrend[m]) monthMapTrend[m] = { hadir: 0, absen: 0 };
            if (r.isHadir) monthMapTrend[m].hadir++; else monthMapTrend[m].absen++;
        });
        const sortedMonths = Object.keys(monthMapTrend).sort();
        initChart('chartTrend', {
            type: 'line',
            data: {
                labels: sortedMonths.map(monthLabel),
                datasets: [
                    { label: 'Hadir', data: sortedMonths.map(m => monthMapTrend[m].hadir), borderColor: blue, backgroundColor: blue + '20', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: blue },
                    { label: 'Absen', data: sortedMonths.map(m => monthMapTrend[m].absen), borderColor: red, backgroundColor: red + '20', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: red }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index' }, ...chartDefaults(),
                scales: {
                    ...chartDefaults().scales,
                    y: { ...chartDefaults().scales.y, title: { display: true, text: 'Jumlah', color: getThemeColor('--text3'), font: { size: 10 } } }
                }
            }
        });
    } else {
        // Per hari dalam bulan → line chart
        const dayMapTrend = {};
        data.forEach(r => {
            if (!dayMapTrend[r.date]) dayMapTrend[r.date] = { hadir: 0, absen: 0 };
            if (r.isHadir) dayMapTrend[r.date].hadir++; else dayMapTrend[r.date].absen++;
        });
        const sortedDates = Object.keys(dayMapTrend).sort();
        initChart('chartTrend', {
            type: 'line',
            data: {
                labels: sortedDates.map(d => d.substring(5)),
                datasets: [
                    { label: 'Hadir', data: sortedDates.map(d => dayMapTrend[d].hadir), borderColor: blue, backgroundColor: blue + '20', fill: true, tension: .35, pointRadius: 2 },
                    { label: 'Absen', data: sortedDates.map(d => dayMapTrend[d].absen), borderColor: red, backgroundColor: red + '20', fill: true, tension: .35, pointRadius: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index' }, ...chartDefaults(),
                scales: {
                    ...chartDefaults().scales,
                    y: { ...chartDefaults().scales.y, title: { display: true, text: 'Jumlah', color: getThemeColor('--text3'), font: { size: 10 } } }
                }
            }
        });
    }

    // ── Distribusi Waktu Masuk: hanya ketika filter bulan spesifik ──
    // (rentang jam masuk, sumbu x=rentang, y=jumlah orang)
    const arrivalBuckets = { '< 07:00': 0, '07:00-07:59': 0, '08:00-08:14': 0, '08:15-08:30': 0, '08:30-09:00': 0, '> 09:00': 0 };
    data.filter(r => r.masuk).forEach(r => {
        const parts = r.masuk.split(':');
        const h = parseInt(parts[0]), m = parseInt(parts[1]);
        const total = h * 60 + m;
        if (total < 7 * 60) arrivalBuckets['< 07:00']++;
        else if (total < 8 * 60) arrivalBuckets['07:00-07:59']++;
        else if (total < 8 * 60 + 14) arrivalBuckets['08:00-08:14']++;
        else if (total < 8 * 60 + 30) arrivalBuckets['08:15-08:30']++;
        else if (total < 9 * 60) arrivalBuckets['08:30-09:00']++;
        else arrivalBuckets['> 09:00']++;
    });
    initChart('chartArrival', {
        type: 'bar',
        data: {
            labels: Object.keys(arrivalBuckets),
            datasets: [{
                label: 'Jumlah', data: Object.values(arrivalBuckets),
                backgroundColor: [green, green, green, yellow, yellow, red], borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            ...chartDefaults(),
            scales: {
                ...chartDefaults().scales,
                x: { ...chartDefaults().scales.x, title: { display: true, text: 'Rentang Jam', color: getThemeColor('--text3'), font: { size: 10 } } },
                y: { ...chartDefaults().scales.y, title: { display: true, text: 'Jumlah', color: getThemeColor('--text3'), font: { size: 10 } } }
            }
        }
    });

    // ── Histogram Keterlambatan ──
    // Jika "Semua": sumbu X = bulan, Y = jumlah kejadian terlambat (per orang per hari)
    // Jika bulan tertentu: sumbu X = rentang menit, Y = jumlah hari kerja
    //   → setiap hari kerja dihitung 1x: pakai rata-rata menit terlambat hari itu
    //   → "Tepat Waktu" = hari kerja di mana 0 orang terlambat
    document.getElementById('chartLateBarWrap').style.height = '200px';
    if (isAllMonths) {
        // Per bulan: hitung total kejadian terlambat (per orang per hari)
        const monthLateMap = {};
        data.forEach(r => {
            const m = r.date.substring(0, 7);
            if (!monthLateMap[m]) monthLateMap[m] = 0;
            if (r.isHadir && r.terlambat_min > LATE_TOL) monthLateMap[m]++;
        });
        const sortedMonths = Object.keys(monthLateMap).sort();
        initChart('chartLateBar', {
            type: 'bar',
            data: {
                labels: sortedMonths.map(monthLabel),
                datasets: [{
                    label: 'Jumlah Terlambat', data: sortedMonths.map(m => monthLateMap[m]),
                    backgroundColor: yellow + 'bb', borderColor: yellow, borderWidth: 1, borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} kejadian` } } },
                scales: {
                    ...chartDefaults().scales,
                    x: { ...chartDefaults().scales.x, title: { display: true, text: 'Bulan', color: getThemeColor('--text3'), font: { size: 10 } } },
                    y: { ...chartDefaults().scales.y, title: { display: true, text: 'Jumlah', color: getThemeColor('--text3'), font: { size: 10 } }, ticks: { ...chartDefaults().scales.y.ticks, stepSize: 1 } }
                }
            }
        });
    } else {
        // Per bulan tertentu: hitung per HARI KERJA
        // Untuk setiap hari kerja, cari rata-rata menit terlambat dari semua karyawan hadir
        // Tujuan: 1 hari = 1 titik di histogram → tidak bergantung jumlah karyawan
        const dayLateMap = {}; // date → { totalLateMin, countHadir, anyLate }
        data.filter(r => r.isHadir && r.masuk).forEach(r => {
            if (!dayLateMap[r.date]) dayLateMap[r.date] = { avgLate: 0, count: 0, totalLate: 0 };
            dayLateMap[r.date].count++;
            dayLateMap[r.date].totalLate += (r.terlambat_min || 0);
        });

        // Untuk setiap hari kerja, ambil rata-rata menit terlambat seluruh karyawan
        const lateBuckets = {
            'Tepat Waktu': 0,
            '1–5 menit': 0,
            '6–15 menit': 0,
            '16–30 menit': 0,
            '31–60 menit': 0,
            '> 60 menit': 0,
        };
        Object.values(dayLateMap).forEach(d => {
            const avg = d.count > 0 ? d.totalLate / d.count : 0;
            if (avg <= 0) lateBuckets['Tepat Waktu']++;
            else if (avg <= 5) lateBuckets['1–5 menit']++;
            else if (avg <= 15) lateBuckets['6–15 menit']++;
            else if (avg <= 30) lateBuckets['16–30 menit']++;
            else if (avg <= 60) lateBuckets['31–60 menit']++;
            else lateBuckets['> 60 menit']++;
        });
        initChart('chartLateBar', {
            type: 'bar',
            data: {
                labels: Object.keys(lateBuckets),
                datasets: [{
                    label: 'Jumlah Hari Kerja', data: Object.values(lateBuckets),
                    backgroundColor: [green, green + '99', yellow, yellow + 'cc', red + '99', red],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} hari kerja` } } },
                scales: {
                    ...chartDefaults().scales,
                    x: { ...chartDefaults().scales.x, title: { display: true, text: 'Rata-rata Menit Terlambat per Hari', color: getThemeColor('--text3'), font: { size: 10 } } },
                    y: { ...chartDefaults().scales.y, title: { display: true, text: 'Jumlah Hari Kerja', color: getThemeColor('--text3'), font: { size: 10 } }, ticks: { ...chartDefaults().scales.y.ticks, stepSize: 1 } }
                }
            }
        });
    }

    // ── Tren Lembur ──
    // Jika "Semua": sumbu X = bulan, Y = total jam lembur
    // Jika bulan tertentu: sumbu X = hari, Y = total menit
    document.getElementById('chartOTBarWrap').style.height = '200px';
    if (isAllMonths) {
        const monthOTMap = {};
        data.forEach(r => {
            const m = r.date.substring(0, 7);
            if (!monthOTMap[m]) monthOTMap[m] = 0;
            monthOTMap[m] += (r.ot_min || 0);
        });
        const sortedMonths = Object.keys(monthOTMap).sort();
        initChart('chartOTBar', {
            type: 'bar',
            data: {
                labels: sortedMonths.map(monthLabel),
                datasets: [{
                    label: 'Total Lembur (jam)', data: sortedMonths.map(m => Math.round(monthOTMap[m] / 60 * 10) / 10),
                    backgroundColor: purple + '99', borderColor: purple, borderWidth: 1, borderRadius: 3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} jam` } } },
                scales: {
                    ...chartDefaults().scales,
                    x: { ...chartDefaults().scales.x, title: { display: true, text: 'Bulan', color: getThemeColor('--text3'), font: { size: 10 } } },
                    y: { ...chartDefaults().scales.y, title: { display: true, text: 'Jam', color: getThemeColor('--text3'), font: { size: 10 } } }
                }
            }
        });
    } else {
        // Per hari kerja dalam bulan
        const dayMap = {};
        data.forEach(r => {
            if (!dayMap[r.date]) dayMap[r.date] = 0;
            dayMap[r.date] += (r.ot_min || 0);
        });
        const sortedDates = Object.keys(dayMap).sort();
        initChart('chartOTBar', {
            type: 'bar',
            data: {
                labels: sortedDates.map(d => d.substring(5)),
                datasets: [{
                    label: 'Total Lembur (menit)', data: sortedDates.map(d => dayMap[d]),
                    backgroundColor: purple + '99', borderColor: purple, borderWidth: 1, borderRadius: 3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}m (${Math.floor(ctx.parsed.y / 60)}j ${ctx.parsed.y % 60}m)` } } },
                scales: {
                    ...chartDefaults().scales,
                    x: { ...chartDefaults().scales.x, title: { display: true, text: 'Hari', color: getThemeColor('--text3'), font: { size: 10 } } },
                    y: { ...chartDefaults().scales.y, title: { display: true, text: 'Menit', color: getThemeColor('--text3'), font: { size: 10 } } }
                }
            }
        });
    }
}
// ══════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════
/**
 * Precise score (float) for ranking.
 * A – Punctuality (max 50): -0.5pt per late-minute, finer than count-based
 * B – Attendance  (max 30): hadir/workdays × 30
 * C – Overtime    (max 20): capped at 300 min (5h) → ot_min/300 × 20
 */
function calcScore(s, totalDays) {
    const workdays = totalDays || 1;
    const pA = Math.max(0, 50 - Math.min(50, (s.terlambat_min || 0) * 0.5));
    const pB = ((s.hari_hadir || 0) / workdays) * 30;
    const pC = Math.min(20, ((s.ot_min || 0) / 300) * 20);
    return pA + pB + pC; // float – round only at display
}
/** Tiebreaker: score DESC → lateMin ASC → OT DESC → absent ASC → name ASC */
function lbCompare(a, b) {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    if ((a.terlambat_min || 0) !== (b.terlambat_min || 0)) return (a.terlambat_min || 0) - (b.terlambat_min || 0);
    if ((b.ot_min || 0) !== (a.ot_min || 0)) return (b.ot_min || 0) - (a.ot_min || 0);
    if ((a.absen_hari || 0) !== (b.absen_hari || 0)) return (a.absen_hari || 0) - (b.absen_hari || 0);
    return a.nama.localeCompare(b.nama);
}
function renderLeaderboard() {
    // Exclude resigned + nama yang dikecualikan dari leaderboard
    const EXCLUDE_LB = ['AYU', 'KRISMAWATI', 'RIRIS'];
    const stats = getFilteredStats().filter(s =>
        !state.resignedIds.includes(s.id) && !EXCLUDE_LB.includes(s.nama)
    );
    if (!stats.length) return;
    const totalDays = new Set(state.filtered.map(r => r.date)).size;
    const scored = stats.map(s => ({ ...s, score: calcScore(s, totalDays) })).sort(lbCompare);
    const maxScore = scored[0]?.score || 100;

    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
    const lbHtml = scored.map((emp, i) => {
        const rank = i + 1;
        const rankClass = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : 'rn';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const barW = Math.round(emp.score / maxScore * 100);
        const color = colors[i % colors.length];
        const pA = Math.max(0, 50 - Math.min(50, (emp.terlambat_min || 0) * 0.5));
        const pB = totalDays > 0 ? (emp.hari_hadir || 0) / totalDays * 30 : 0;
        const pC = Math.min(20, ((emp.ot_min || 0) / 300) * 20);
        const scoreDisplay = Math.round(emp.score);
        const scoreDetail = `Ketepatan: ${pA.toFixed(1)}/50  ·  Kehadiran: ${pB.toFixed(1)}/30  ·  Lembur: ${pC.toFixed(1)}/20`;
        const adminBtn = state.isAdmin ? `<button class="btn btn-ghost" style="padding:3px 8px;font-size:10px;margin-left:8px" onclick="toggleResign('${emp.id}')">✕ Resign</button>` : '';
        return `<div class="lb-item ${rank <= 3 ? 'rank' + rank : ''}">
      <div class="lb-rank ${rankClass}">${medal}</div>
      <div class="lb-avatar" style="background:linear-gradient(135deg,${color}99,${color})">${state.avatars[emp.id] ? `<img src="${state.avatars[emp.id]}" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/>` : emp.nama.charAt(0)}</div>
      <div class="lb-info">
        <div class="lb-name"><span style="cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--border2)" onclick="goToProfile('${emp.id}')" title="Lihat profil ${emp.nama}">${emp.nama}</span>${adminBtn}</div>
        <div class="lb-dept">${emp.dept} · Hadir ${emp.hari_hadir}d · Telat ${emp.terlambat_kali}x (${fmtMin(emp.terlambat_min || 0)}) · Lembur ${fmtMin(emp.ot_min || 0)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px;font-family:'JetBrains Mono',monospace">${scoreDetail}</div>
        <div class="lb-bar-wrap" style="margin-top:6px"><div class="lb-bar" style="width:${barW}%;background:linear-gradient(90deg,${color}88,${color})"></div></div>
      </div>
      <div class="lb-score">
        <div class="lb-score-val" style="color:${color}">${scoreDisplay}</div>
        <div class="lb-score-lbl">/ 100</div>
      </div>
    </div>`;
    }).join('');
    document.getElementById('lbList').innerHTML = lbHtml;

    // Radar for top 5 — axes aligned with scoring formula
    const top5 = scored.slice(0, 5);
    const totalDaysForPct = totalDays || 1;
    const blue = getThemeColor('--blue');
    initChart('chartLbRadar', {
        type: 'radar',
        data: {
            labels: ['Kehadiran', 'Ketepatan Waktu', 'Lembur', 'Konsistensi Hadir', 'Skor Akhir'],
            datasets: top5.map((e, i) => ({
                label: e.nama,
                data: [
                    Math.round(e.hari_hadir / totalDaysForPct * 100),
                    Math.round(Math.max(0, 50 - Math.min(50, (e.terlambat_min || 0) * 0.5)) / 50 * 100),
                    Math.min(100, Math.round((e.ot_min || 0) / 300 * 100)),
                    Math.round(Math.max(0, 100 - (e.absen_hari || 0) / totalDaysForPct * 100)),
                    Math.round(e.score),
                ],
                borderColor: colors[i], backgroundColor: colors[i] + '20', pointBackgroundColor: colors[i], borderWidth: 2,
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { grid: { color: getThemeColor('--border') }, angleLines: { color: getThemeColor('--border') }, ticks: { backdropColor: 'transparent', color: getThemeColor('--text3'), font: { size: 9 } }, pointLabels: { color: getThemeColor('--text2'), font: { size: 10 } } } },
            plugins: { legend: { labels: { color: getThemeColor('--text3'), font: { size: 10 }, boxWidth: 10 } } }
        }
    });
}

// ══════════════════════════════════════════════
// FULL CALENDAR BUILDER FOR PERSONAL DETAIL
// ══════════════════════════════════════════════
function buildFullCalendarRows(empId, selectedMonth) {
    // Build map of date -> row from raw data for this employee
    const rawMap = {};
    state.raw.filter(r => r.id === empId).forEach(r => { rawMap[r.date] = r; });

    // Determine which months to show
    let months = [];
    if (selectedMonth) {
        months = [selectedMonth];
    } else {
        const ms = new Set(Object.keys(rawMap).map(d => d.substring(0, 7)));
        months = [...ms].sort();
        if (!months.length) return '<tr><td colspan="7" style="text-align:center;color:var(--text3)">Tidak ada data.</td></tr>';
    }

    // Tanggal merah: gunakan data dari state (terdeteksi saat parsing)
    const allDatesWithData = new Set(state.raw.map(r => r.date));

    let rows = '';
    months.forEach(ym => {
        const [y, m] = ym.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        let prevMonth = '';
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dow = getDow(dateStr); // 0=Sun, 6=Sat
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            const dayName = dayNames[dow];
            const isWeekend = dow === 0 || dow === 6;

            // Month header row
            const curMonth = dateStr.substring(0, 7);
            if (curMonth !== prevMonth) {
                prevMonth = curMonth;
                const mLabel = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'][m];
                rows += `<tr><td colspan="7" style="background:var(--panel2);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);padding:8px 14px">${mLabel} ${y}</td></tr>`;
            }

            if (isWeekend) {
                rows += `<tr style="opacity:.35"><td style="font-family:'JetBrains Mono',monospace;color:var(--text3)">${dateStr}</td><td style="color:var(--text3)">${dayName}</td><td>—</td><td>—</td><td><span class="badge libur">Libur</span></td><td>—</td><td>—</td></tr>`;
                continue;
            }

            // Tanggal merah: weekday yang tidak ada di state.raw (libur nasional)
            const isPH = state.tanggalMerahDates.has(dateStr) || (!allDatesWithData.has(dateStr));
            if (isPH) {
                rows += `<tr style="opacity:.45"><td style="font-family:'JetBrains Mono',monospace;color:var(--red)">${dateStr}</td><td style="color:var(--red);font-weight:600">${dayName}</td><td>—</td><td>—</td><td><span class="badge" style="background:var(--red-bg);color:var(--red)">Tanggal Merah</span></td><td>—</td><td>—</td></tr>`;
                continue;
            }

            const r = rawMap[dateStr];
            if (!r) {
                // Weekday with company data but employee absent
                rows += `<tr><td style="font-family:'JetBrains Mono',monospace">${dateStr}</td><td style="color:var(--text3)">${dayName}</td><td style="color:var(--text3)">—</td><td style="color:var(--text3)">—</td><td><span class="badge absen">Absen</span></td><td>—</td><td>—</td></tr>`;
                continue;
            }

            let status;
            if (!r.isHadir && r.statusNote === 'S') status = '<span class="badge cuti">Sakit</span>';
            else if (!r.isHadir && r.statusNote === 'CUTI') status = '<span class="badge cuti">Cuti/Izin</span>';
            else if (!r.isHadir) status = '<span class="badge absen">Absen</span>';
            else if (r.terlambat_min > LATE_TOL) status = '<span class="badge terlambat">Terlambat</span>';
            else status = '<span class="badge hadir">Hadir</span>';
            const late = r.terlambat_min > LATE_TOL ? `<span style="color:var(--orange)">${r.terlambat_min}m</span>` : '—';
            const ot = r.ot_min > 0 ? `<span style="color:var(--purple)">${fmtMin(r.ot_min)}</span>` : '—';
            rows += `<tr><td style="font-family:'JetBrains Mono',monospace">${dateStr}</td><td style="color:var(--text3)">${dayName}</td><td style="font-family:'JetBrains Mono',monospace;color:var(--green)">${r.masuk || '—'}</td><td style="font-family:'JetBrains Mono',monospace;color:var(--blue)">${r.keluar || '—'}</td><td>${status}</td><td>${late}</td><td>${ot}</td></tr>`;
        }
    });
    return rows;
}

// ══════════════════════════════════════════════
// PERSONAL PROFILE
// ══════════════════════════════════════════════
function populateEmpSelectors() {
    const sel = document.getElementById('empSelector');

    // CEK: Jika elemen tidak ditemukan, jangan teruskan proses innerHTML
    if (!sel) {
        console.warn("[DEBUG] Elemen #empSelector tidak ditemukan di DOM. Menunda populasi...");
        return;
    }

    // Show all employees in personal profile
    const opts = state.employees.map(e => {
        const r = state.resignedIds.includes(e.id) ? ' [Resign]' : '';
        return `<option value="${e.id}">${e.nama}${r}</option>`;
    }).join('');

    sel.innerHTML = opts;

    // Hanya render jika ada data
    if (state.employees.length > 0) {
        renderPersonal();
    }
}
function renderPersonalSection() {
    if (!state.employees.length) return;
    renderPersonal();
}
function renderPersonal() {
    const empId = document.getElementById('empSelector').value;
    const month = document.getElementById('personalMonth').value;
    if (!empId) return;
    let empRows = state.raw.filter(r => r.id === empId && !r.isWeekend);
    if (month) empRows = empRows.filter(r => r.date.startsWith(month));
    if (!empRows.length && !state.raw.filter(r => r.id === empId).length) { document.getElementById('personalContent').innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3)">Tidak ada data untuk periode ini.</div>'; return; }

    const emp = state.employees.find(e => e.id === empId);
    const empStat = state.stats.find(s => s.id === empId) || {};
    const totalDays = new Set(empRows.map(r => r.date)).size;
    const hadirRows = empRows.filter(r => r.isHadir);
    const absenRows = empRows.filter(r => !r.isHadir);
    const lateRows = empRows.filter(r => r.terlambat_min > LATE_TOL);
    const totalLateMin = lateRows.reduce((s, r) => s + r.terlambat_min, 0);
    const totalOTMin = empRows.reduce((s, r) => s + (r.ot_min || 0), 0);
    const avgWorkMin = hadirRows.length ? Math.round(hadirRows.reduce((s, r) => s + (r.total_min || 480), 0) / hadirRows.length) : 0;
    const attendRate = totalDays > 0 ? Math.round(hadirRows.length / totalDays * 100) : 0;
    const totalDaysForScore = new Set(state.filtered.map(r => r.date)).size || totalDays;
    const score = Math.round(calcScore({ hari_hadir: hadirRows.length, absen_hari: absenRows.length, terlambat_kali: lateRows.length, terlambat_min: totalLateMin, ot_min: totalOTMin }, totalDaysForScore));

    // Evaluation notes
    const evalNotes = [];
    if (attendRate >= 95) evalNotes.push({ icon: '✅', text: '<strong>Kehadiran Excellent:</strong> Tingkat kehadiran ' + attendRate + '% sangat baik.' });
    else if (attendRate >= 85) evalNotes.push({ icon: '🟡', text: '<strong>Kehadiran Cukup:</strong> Kehadiran ' + attendRate + '%. Perlu ditingkatkan.' });
    else evalNotes.push({ icon: '🔴', text: '<strong>Kehadiran Rendah:</strong> Hanya ' + attendRate + '%. Perlu perhatian khusus.' });
    if (lateRows.length === 0) evalNotes.push({ icon: '⭐', text: '<strong>Selalu Tepat Waktu:</strong> Tidak ada keterlambatan di periode ini.' });
    else if (lateRows.length <= 2) evalNotes.push({ icon: '🟡', text: `<strong>Sedikit Terlambat:</strong> ${lateRows.length}x terlambat (total ${fmtMin(totalLateMin)}). Pertahankan kedisiplinan.` });
    else evalNotes.push({ icon: '🔴', text: `<strong>Sering Terlambat:</strong> ${lateRows.length}x terlambat (total ${fmtMin(totalLateMin)}). Perlu perbaikan segera.` });
    if (totalOTMin > 0) evalNotes.push({ icon: '💼', text: `<strong>Kontribusi Lembur:</strong> ${fmtMin(totalOTMin)} total lembur. Dedikasi tinggi.` });
    if (absenRows.length > 3) evalNotes.push({ icon: '⚠️', text: `<strong>Absensi Tinggi:</strong> ${absenRows.length} hari absen. Diperlukan klarifikasi.` });

    // Monthly breakdown
    const monthMap = {};
    empRows.forEach(r => {
        const m = r.date.substring(0, 7);
        if (!monthMap[m]) monthMap[m] = { hadir: 0, late: 0, lateMin: 0, ot: 0, absen: 0 };
        if (r.isHadir) monthMap[m].hadir++; else monthMap[m].absen++;
        if (r.terlambat_min > LATE_TOL) { monthMap[m].late++; monthMap[m].lateMin += r.terlambat_min; }
        monthMap[m].ot += r.ot_min || 0;
    });
    const monthKeys = Object.keys(monthMap).sort();

    const kpiColor = v => v > 80 ? 'var(--green)' : v > 60 ? 'var(--yellow)' : 'var(--red)';

    document.getElementById('personalContent').innerHTML = `
    <div class="profile-header">
      <div class="avatar-wrap" title="${state.isAdmin ? 'Ganti foto via panel Admin' : emp.nama}">
        ${state.avatars[emp.id]
            ? `<img class="avatar-img" src="${state.avatars[emp.id]}" alt="${emp.nama}"/>`
            : `<div class="profile-avatar">${emp.nama.charAt(0)}</div>`}
        ${state.isAdmin ? '<div class="avatar-edit-overlay" onclick="openAdminModal()">📷</div>' : ''}
      </div>
      <div class="profile-identity">
        <h2>${emp.nama} ${state.resignedIds.includes(emp.id) ? '<span class="badge resign" style="font-size:11px;vertical-align:middle">Resign</span>' : ''}</h2>
        <p>ID: ${emp.id} · ${emp.dept}</p>
        <p style="margin-top:6px;font-size:13px">Skor Performa: <strong style="color:${kpiColor(score)};font-family:'JetBrains Mono',monospace;font-size:18px">${score}</strong><span style="color:var(--text3)">/100</span></p>
      </div>
      <div class="profile-kpis">
        <div class="profile-kpi"><div class="profile-kpi-val" style="color:var(--green)">${hadirRows.length}</div><div class="profile-kpi-lbl">Hari Hadir</div></div>
        <div class="profile-kpi"><div class="profile-kpi-val" style="color:var(--blue)">${attendRate}%</div><div class="profile-kpi-lbl">Kehadiran</div></div>
        <div class="profile-kpi"><div class="profile-kpi-val" style="color:var(--yellow)">${lateRows.length}x</div><div class="profile-kpi-lbl">Terlambat</div></div>
        <div class="profile-kpi"><div class="profile-kpi-val" style="color:var(--orange)">${fmtMin(totalLateMin)}</div><div class="profile-kpi-lbl">Total Keterlambatan</div></div>
        <div class="profile-kpi"><div class="profile-kpi-val" style="color:var(--purple)">${fmtMin(totalOTMin)}</div><div class="profile-kpi-lbl">Total Lembur</div></div>
        <div class="profile-kpi"><div class="profile-kpi-val" style="color:var(--red)">${absenRows.length}</div><div class="profile-kpi-lbl">Hari Absen</div></div>
      </div>
    </div>
    <div class="charts-grid three">
      <div class="chart-card">
        <div class="chart-title">📅 Kehadiran per Bulan</div>
        <div class="chart-wrap" style="height:180px"><canvas id="chartEmpAttend"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">⏰ Keterlambatan per Bulan</div>
        <div class="chart-wrap" style="height:180px"><canvas id="chartEmpLate"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🌙 Lembur per Bulan</div>
        <div class="chart-wrap" style="height:180px"><canvas id="chartEmpOT"></canvas></div>
      </div>
    </div>
    <div class="eval-card">
      <div class="eval-title">📋 Catatan Evaluasi</div>
      ${evalNotes.map(n => `<div class="eval-item"><div class="eval-icon">${n.icon}</div><div class="eval-text">${n.text}</div></div>`).join('')}
    </div>
    <div style="margin-top:16px">
      <div class="chart-title" style="margin-bottom:10px">🗓 Riwayat Absensi Detail</div>
      ${month
            ? `<div class="table-wrap">
            <table>
              <thead><tr><th>Tanggal</th><th>Hari</th><th>Jam Masuk</th><th>Jam Keluar</th><th>Status</th><th>Terlambat</th><th>Lembur</th></tr></thead>
              <tbody>${buildFullCalendarRows(empId, month)}</tbody>
            </table>
          </div>`
            : `<div class="table-wrap">
            <table>
              <thead><tr><th>Bulan</th><th>Hadir</th><th>Absen</th><th>Terlambat</th><th>Total Keterlambatan</th><th>Lembur</th></tr></thead>
              <tbody>${monthKeys.map(m => {
                const mm = monthMap[m];
                return `<tr>
                    <td style="font-weight:600">${monthLabel(m)}</td>
                    <td style="color:var(--green);font-family:'JetBrains Mono',monospace">${mm.hadir}</td>
                    <td style="color:var(--red);font-family:'JetBrains Mono',monospace">${mm.absen}</td>
                    <td style="color:var(--yellow);font-family:'JetBrains Mono',monospace">${mm.late}x</td>
                    <td style="color:var(--orange);font-family:'JetBrains Mono',monospace">${fmtMin(mm.lateMin || 0)}</td>
                    <td style="color:var(--purple);font-family:'JetBrains Mono',monospace">${fmtMin(mm.ot)}</td>
                  </tr>`;
            }).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--text3)">💡 Pilih bulan tertentu untuk melihat detail harian lengkap</div>`
        }
    </div>
  `;

    // Charts — 3 separate line charts with months on X axis
    const blue = getThemeColor('--blue');
    const green = getThemeColor('--green');
    const red2 = getThemeColor('--red');
    const yellow = getThemeColor('--yellow');
    const purple = getThemeColor('--purple');

    // Chart 1: Attendance — Hadir (green) vs Absen (red), line chart
    initChart('chartEmpAttend', {
        type: 'line',
        data: {
            labels: monthKeys.map(monthLabel),
            datasets: [
                { label: 'Hadir', data: monthKeys.map(m => monthMap[m].hadir), borderColor: green, backgroundColor: green + '20', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: green },
                { label: 'Absen', data: monthKeys.map(m => monthMap[m].absen), borderColor: red2, backgroundColor: red2 + '20', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: red2 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, ...chartDefaults(), interaction: { mode: 'index' } }
    });

    // Chart 2: Keterlambatan per bulan — line
    initChart('chartEmpLate', {
        type: 'line',
        data: {
            labels: monthKeys.map(monthLabel),
            datasets: [
                { label: 'Keterlambatan (kali)', data: monthKeys.map(m => monthMap[m].late), borderColor: yellow, backgroundColor: yellow + '25', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: yellow }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, ...chartDefaults(),
            scales: { ...chartDefaults().scales, y: { ...chartDefaults().scales.y, ticks: { ...chartDefaults().scales.y.ticks, stepSize: 1 } } }
        }
    });

    // Chart 3: Lembur per bulan — line
    initChart('chartEmpOT', {
        type: 'line',
        data: {
            labels: monthKeys.map(monthLabel),
            datasets: [
                { label: 'Lembur (menit)', data: monthKeys.map(m => monthMap[m].ot), borderColor: purple, backgroundColor: purple + '25', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: purple }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, ...chartDefaults(),
            plugins: { ...chartDefaults().plugins, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} menit (${Math.floor(ctx.parsed.y / 60)}j ${ctx.parsed.y % 60}m)` } } }
        }
    });
}
function renderTable() {
    const search = document.getElementById('tableSearch').value.toLowerCase();
    let rows = state.filtered;
    if (search) rows = rows.filter(r => r.nama.toLowerCase().includes(search) || r.id.includes(search));
    rows = rows.sort((a, b) => a.date.localeCompare(b.date) || a.nama.localeCompare(b.nama));
    document.getElementById('tableInfo').textContent = `${rows.length} baris`;
    const html = `<table>
    <thead><tr><th>ID</th><th>Nama</th><th>Departemen</th><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Status</th><th>Terlambat</th><th>Lembur</th></tr></thead>
    <tbody>${rows.map(r => {
        const status = !r.isHadir && r.statusNote === 'S' ? '<span class="badge cuti">Sakit</span>' : !r.isHadir && r.statusNote === 'CUTI' ? '<span class="badge cuti">Cuti/Izin</span>' : !r.isHadir ? '<span class="badge absen">Absen</span>' : r.terlambat_min > LATE_TOL ? '<span class="badge terlambat">Terlambat</span>' : '<span class="badge hadir">Hadir</span>';
        const late = r.terlambat_min > LATE_TOL ? `<span style="color:var(--orange)">${r.terlambat_min}m</span>` : '—';
        const ot = r.ot_min > 0 ? `<span style="color:var(--purple)">${fmtMin(r.ot_min)}</span>` : '—';
        return `<tr><td style="color:var(--text3);font-family:'JetBrains Mono',monospace">${r.id}</td><td style="font-weight:500">${r.nama}</td><td style="color:var(--text3)">${r.dept}</td><td style="font-family:'JetBrains Mono',monospace">${r.date}</td><td style="font-family:'JetBrains Mono',monospace">${r.masuk || '—'}</td><td style="font-family:'JetBrains Mono',monospace">${r.keluar || '—'}</td><td>${status}</td><td>${late}</td><td>${ot}</td></tr>`;
    }).join('')}</tbody>
  </table>`;
    document.getElementById('mainTable').innerHTML = html;
}
function filterTable() { renderTable(); }

// ══════════════════════════════════════════════
// DUMMY RENDER FUNCTIONS (Agar kode tidak error jika dipanggil)
// ══════════════════════════════════════════════
// function renderLeaderboard() { console.log("[DEBUG] renderLeaderboard dipanggil"); }
// function renderPersonalSection() { console.log("[DEBUG] renderPersonalSection dipanggil"); }
// function renderPersonal() { console.log("[DEBUG] renderPersonal dipanggil"); }
// function renderTable() { console.log("[DEBUG] renderTable dipanggil"); }
// function populateEmpSelectors() { console.log("[DEBUG] populateEmpSelectors dipanggil"); }

// ══════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════
function exportData() {
    const rows = state.filtered.sort((a, b) => a.date.localeCompare(b.date));
    const wsData = [['ID', 'Nama', 'Departemen', 'Tanggal', 'Masuk', 'Keluar', 'Hadir', 'Terlambat (min)', 'Lembur (min)']];
    rows.forEach(r => wsData.push([r.id, r.nama, r.dept, r.date, r.masuk || '', r.keluar || '', r.isHadir ? 'Ya' : 'Tidak', r.terlambat_min, r.ot_min]));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), 'Presensi');
    XLSX.writeFile(wb, 'presensi_export.xlsx');
}

// ══════════════════════════════════════════════
// INIT & SERVER SYNC
// ══════════════════════════════════════════════
async function loadFilesFromServer() {
    console.log("[DEBUG SERVER] Memulai fungsi loadFilesFromServer...");
    try {
        const response = await fetch('api/get_uploads.php');
        console.log("[DEBUG SERVER] Status Response API:", response.status, response.statusText);

        if (!response.ok) {
            console.error("[DEBUG SERVER] API merespons dengan error.");
            return;
        }

        const fileNames = await response.json();
        console.log("[DEBUG SERVER] Data dari API (fileNames):", fileNames);

        if (!Array.isArray(fileNames) || fileNames.length === 0) {
            console.warn("[DEBUG SERVER] Array kosong. Tidak ada file di server atau PHP gagal membaca folder upload.");
            return;
        }

        for (const fileName of fileNames) {
            console.log(`[DEBUG SERVER] Sedang memproses file dari server: ${fileName}...`);
            try {
                const fileResponse = await fetch('upload/' + fileName);
                if (!fileResponse.ok) {
                    console.warn(`[DEBUG SERVER] Gagal mendownload file upload/${fileName}`);
                    continue;
                }

                const arrayBuffer = await fileResponse.arrayBuffer();
                console.log(`[DEBUG SERVER] File ${fileName} terdownload, mencoba membaca dengan XLSX...`);
                const data = new Uint8Array(arrayBuffer);
                const wb = XLSX.read(data, { type: 'array', cellDates: true });

                parseWorkbook(wb, fileName);

            } catch (err) {
                console.error("[ERROR SERVER] Gagal memproses file:", fileName, err);
            }
        }
    } catch (error) {
        console.error("[ERROR SERVER] Fetch gagal sama sekali (mungkin API tidak ada atau path salah):", error);
    }
}

// Jalankan saat halama siap
window.addEventListener('DOMContentLoaded', loadFilesFromServer);
<?php


require_once 'config/config.php';

// Ambil file terakhir
$result = $conn->query("SELECT file_name FROM uploads ORDER BY id DESC LIMIT 1");

$latestFile = null;

if ($result && $result->num_rows > 0) {
  $row = $result->fetch_assoc();
  $latestFile = "upload/" . $row['file_name'];
}

// Tentukan title dan subtitle berdasarkan page yang aktif
$page = isset($_GET['page']) ? $_GET['page'] : 'dashboard';

$pageInfo = [
  'dashboard' => [
    'title' => 'Ringkasan Umum',
    'sub' => 'Tidak ada data'
  ],
  'leaderboard' => [
    'title' => 'Leaderboard Performa',
    'sub' => 'Ranking karyawan berdasarkan performa kehadiran'
  ],
  'profil' => [
    'title' => 'Profil Karyawan',
    'sub' => 'Detail informasi dan performa individu karyawan'
  ],
  'presensi' => [
    'title' => 'Data Presensi',
    'sub' => 'Catatan lengkap kehadiran dan jam kerja'
  ],
  'history' => [
    'title' => 'Riwayat Upload',
    'sub' => 'Daftar file yang telah diupload ke sistem'
  ]
];

$current = $pageInfo[$page] ?? $pageInfo['dashboard'];
?>


<header class="topbar">
  <!-- TOMBOL BUKA (Hanya muncul di < 1200px) -->
  <button class="menu-btn" onclick="toggleSidebar()">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  </button>
  <div style="flex:1">
    <div class="topbar-title" id="pageTitle"><?= htmlspecialchars($current['title']) ?></div>
    <div class="topbar-sub" id="pageSub"><?= htmlspecialchars($current['sub']) ?></div>
  </div>


  <!-- Filter Desktop (Sembunyi di < 1200px) -->
  <div class="filter-wrap desktop-filter" id="filterWrap" style="display:none">
    <label>Bulan:</label>
    <select class="filter-sel" id="monthFilter" onchange="applyFilters()">
      <option value="">Semua Bulan</option>
    </select>
    <label>Dari:</label>
    <input type="date" class="filter-inp" id="dateFrom" onchange="applyFilters()" />
    <label>–</label>
    <input type="date" class="filter-inp" id="dateTo" onchange="applyFilters()" />
    <button class="btn btn-ghost" onclick="resetFilters()">Reset</button>
  </div>

  <!-- Tombol Filter Mobile (Hanya muncul di < 1200px) -->
  <button class="btn btn-ghost mobile-filter-btn" onclick="openFilterModal()" style="display: none;">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
    Filter
  </button>

  <!-- Tombol Export hanya tampil jika $page == 'presensi' -->
  <button class="btn btn-ghost btn-export"
    onclick="exportData()"
    id="btnExport"
    style="display: <?= ($page === 'presensi') ? 'flex' : 'none' ?>;">
    <svg viewBox="0 0 20 20">
      <path d="M10 3v10M6 9l4 4 4-4M4 17h12" />
    </svg>
    Export
  </button>

  <!-- Di dalam tag <header> atau tempat tombol berada -->
  <?php if (isset($_SESSION['user_id'])): ?>
    <!-- Tombol Logout dengan konfirmasi -->
    <button type="button" class="btn btn-ghost" style="color: var(--red)" onclick="confirmLogout()">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" style="width:18px; margin-right:5px;">
        <path d="M13 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M8 15l-5-5 5-5M3 10h12" />
      </svg>
      Logout
    </button>

    <!-- Hidden form untuk memproses logout jika user setuju -->
    <form id="logout-form" action="logout.php" method="POST" style="display: none;"></form>
  <?php else: ?>
    <!-- Jika BELUM login: Tampilkan tombol Login -->
    <button class="btn btn-ghost" onclick="openAdminModal()">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M10 2L4 5v5c0 4.4 2.6 8.5 6 10 3.4-1.5 6-5.6 6-10V5l-6-3z" />
      </svg>
      Admin Login
    </button>
  <?php endif; ?>
</header>


<!-- ADMIN MODAL -->
<div class="modal-overlay" id="adminModal" style="display:none" onclick="if(event.target===this)closeAdminModal()">
  <div class="modal-box" style="min-width:360px">
    <form action="login.php" method="POST">
      <div class="modal-title">🔒 Login Admin</div>
      <div class="modal-sub">Masukkan kredensial Anda untuk mengakses panel.</div>

      <div style="margin-bottom: 12px;">
        <label style="font-size: 12px; display: block; margin-bottom: 4px;">Username</label>
        <input class="modal-input" type="text" name="username" required placeholder="Username" />
      </div>

      <div style="margin-bottom: 12px;">
        <label style="font-size: 12px; display: block; margin-bottom: 4px;">Password</label>
        <input class="modal-input" type="password" name="password" required placeholder="••••••••" />
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="closeAdminModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Login</button>
      </div>
    </form>
  </div>
</div>


<!-- MODAL FILTER (Sama style dengan Login) -->
<div class="modal-overlay" id="filterModal" style="display:none" onclick="if(event.target===this)closeFilterModal()">
  <div class="modal-box" style="min-width:320px">
    <div class="modal-title">🔍 Filter Data</div>
    <div class="modal-sub">Sesuaikan rentang data yang ingin ditampilkan.</div>

    <div class="modal-field">
      <label>Bulan</label>
      <select class="modal-input" id="monthFilterMobile" onchange="syncFilters('mobile')">
        <option value="">Semua Bulan</option>
      </select>
    </div>

    <div style="display: grid; gap: 10px; margin-bottom: 14px;">
      <div>
        <label style="font-size: 11px; color: var(--text3); display:block; margin-bottom:4px;">Dari</label>
        <input type="date" class="modal-input" id="dateFromMobile" onchange="syncFilters('mobile')" />
      </div>
      <div>
        <label style="font-size: 11px; color: var(--text3); display:block; margin-bottom:4px;">Sampai</label>
        <input type="date" class="modal-input" id="dateToMobile" onchange="syncFilters('mobile')" />
      </div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" onclick="resetFilters(); closeFilterModal();">Reset</button>
      <button type="button" class="btn btn-primary" onclick="applyFilters(); closeFilterModal();">Terapkan</button>
    </div>
  </div>
</div>

<script>
  function openAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
  }

  function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
  }

  function openFilterModal() {
    document.getElementById('filterModal').style.display = 'flex';
  }

  function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
  }

  // Fungsi pembantu agar saat input di modal diubah, filter utama juga terupdate
  function syncFilters(source) {
    if (source === 'mobile') {
      document.getElementById('monthFilter').value = document.getElementById('monthFilterMobile').value;
      document.getElementById('dateFrom').value = document.getElementById('dateFromMobile').value;
      document.getElementById('dateTo').value = document.getElementById('dateToMobile').value;
    }
    // Panggil fungsi applyFilters bawaan anda
    if (typeof applyFilters === "function") applyFilters();
  }

  // Update juga fungsi resetFilters anda agar mengosongkan input di modal
  const originalResetFilters = resetFilters;
  resetFilters = function() {
    if (typeof originalResetFilters === "function") originalResetFilters();

    // Kosongkan input modal juga
    document.getElementById('monthFilterMobile').value = "";
    document.getElementById('dateFromMobile').value = "";
    document.getElementById('dateToMobile').value = "";
  };
</script>
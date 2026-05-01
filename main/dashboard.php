<?php
require_once 'config/config.php';

// Ambil file terakhir
$result = $conn->query("SELECT file_name FROM uploads ORDER BY id DESC LIMIT 1");

$latestFile = null;

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $latestFile = "upload/" . $row['file_name'];
}
?>



<!-- OVERVIEW -->
<section class="section active" id="sec-overview">

    <?php if (!$latestFile): ?>
        <!-- tampilkan empty state -->
        <div class="empty-state" id="overviewEmpty">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="10" y="15" width="60" height="50" rx="6" />
                <path d="M25 35h30M25 45h20M25 55h15" />
                <circle cx="58" cy="22" r="10" fill="var(--blue-bg)" stroke="var(--blue)" />
                <path d="M53 22l3 3 6-6" stroke="var(--blue)" />
            </svg>
            <h3>Upload data presensi untuk memulai</h3>
            <p>Format yang didukung: XLSX (Laporan Presensi), XLS, atau CSV dengan kolom ID, Nama, Departemen, Tanggal,
                Masuk/Terlambat</p>
            <button class="btn btn-primary" onclick="handleUploadClick()">
                <svg viewBox="0 0 20 20">
                    <path d="M12 2L8 6h3v8h2V6h3L12 2zm-7 13H4v4a1 1 0 001 1h14a1 1 0 001-1v-4h-1" />
                </svg>
                Upload File
            </button>
        </div>
    <?php else: ?>
        <!-- tampilkan dashboard -->
        <div id="overviewDash" style="display:none">
            <!-- Month tabs -->
            <div class="month-tabs" id="monthTabs"></div>
            <!-- KPI Grid -->
            <div class="kpi-grid">
                <div class="kpi-card blue">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-val" id="kpiEmp">—</div>
                    <div class="kpi-lbl">Total Karyawan</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-icon">✅</div>
                    <div class="kpi-val" id="kpiAttend">—</div>
                    <div class="kpi-lbl">Tingkat Kehadiran</div>
                </div>
                <div class="kpi-card red">
                    <div class="kpi-icon">⏰</div>
                    <div class="kpi-val" id="kpiLate">—</div>
                    <div class="kpi-lbl">Total Terlambat</div>
                </div>
                <div class="kpi-card yellow">
                    <div class="kpi-icon">⚡</div>
                    <div class="kpi-val" id="kpiOT">—</div>
                    <div class="kpi-lbl">Total Menit Lembur</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-icon">📅</div>
                    <div class="kpi-val" id="kpiWorkdays">—</div>
                    <div class="kpi-lbl">Hari Kerja</div>
                </div>
                <div class="kpi-card orange">
                    <div class="kpi-icon">🏃</div>
                    <div class="kpi-val" id="kpiAbsent">—</div>
                    <div class="kpi-lbl">Total Absen</div>
                </div>
            </div>
            <!-- Charts -->
            <div class="charts-grid wide">
                <div class="chart-card">
                    <div class="chart-title">📈 Tren Kehadiran Harian</div>
                    <div class="chart-wrap" style="height:200px"><canvas id="chartTrend"></canvas></div>
                </div>
            </div>
            <div class="charts-grid three">
                <div class="chart-card">
                    <div class="chart-title">🕗 Distribusi Waktu Masuk</div>
                    <div class="chart-wrap" style="height:180px"><canvas id="chartArrival"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">⏱ Histogram Keterlambatan (rentang menit)</div>
                    <div class="chart-wrap" id="chartLateBarWrap" style="height:200px"><canvas id="chartLateBar"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">🌙 Tren Total Lembur Harian (menit)</div>
                    <div class="chart-wrap" id="chartOTBarWrap" style="height:200px"><canvas id="chartOTBar"></canvas></div>
                </div>
            </div>
        </div>
    <?php endif; ?>
</section>
<script>
    // Menyimpan status login ke variabel JS
    const isAdminLoggedIn = <?= isset($_SESSION['user_id']) ? 'true' : 'false' ?>;


    function handleUploadClick() {
        if (isAdminLoggedIn) {
            document.getElementById('fileInput').click();
        } else {
            Swal.fire({
                icon: 'lock', // Menggunakan ikon kunci agar lebih relevan dengan akses
                title: 'Akses Dibatasi',
                text: 'Silakan login sebagai admin terlebih dahulu untuk mengunggah data.',

                // Konfigurasi Dark Mode
                background: '#1e1e2d', // Warna background gelap (sesuaikan dengan sidebar/panel Anda)
                color: '#ffffff', // Warna teks putih
                iconColor: '#f27474', // Warna ikon (opsional)

                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Tutup',

                // Styling Footer
                footer: '<a href="javascript:void(0)" onclick="swalLoginBridge()" class="btn btn-primary" style="text-decoration: none;">Klik di sini untuk Login</a>'
            });
        }
    }

    // Fungsi jembatan agar saat link diklik, alert tertutup lalu modal login terbuka
    function swalLoginBridge() {
        Swal.close();
        openAdminModal();
    }
</script>
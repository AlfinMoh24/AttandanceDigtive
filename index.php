<?php
session_start();

// 1. Panggil koneksi database
require_once 'config/config.php';

// 2. Tentukan halaman (default dashboard)
$page = isset($_GET['page']) ? $_GET['page'] : 'dashboard';

// 3. Whitelist halaman (supaya aman)
$allowed_pages = ['dashboard', 'leaderboard', 'presensi', 'profil', 'history'];

if (!in_array($page, $allowed_pages)) {
    $page = 'dashboard';
}
?>

<!DOCTYPE html>
<html lang="id" data-theme="dark">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Dashboard Presensi Karyawan</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="shortcut icon" href="data:image/png;base64,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" type="image/x-icon">
    <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>

    <link rel="stylesheet" href="assets/style.css" />
</head>

<body>
    <div class="layout">
        <!-- Sidebar -->
        <?php include 'partial/sidebar.php'; ?>
        <div class="main">
            <!-- Header -->
            <?php include 'partial/header.php'; ?>
            <!-- main content -->
            <div class="content">
                <?php include "main/$page.php"; ?>
            </div>
        </div>
    </div>
    <script src="assets/script.js"></script>
    <!-- Pastikan script SweetAlert2 sudah dipanggil di atas atau di sini -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <script>
        <?php if (isset($_SESSION['login_success'])): ?>
            Swal.fire({
                icon: 'success',
                title: 'Login Berhasil!',
                text: '<?= $_SESSION['login_success'] ?>',
                timer: 2000,
                showConfirmButton: false
            });
            <?php unset($_SESSION['login_success']); // Hapus session setelah ditampilkan 
            ?>
        <?php endif; ?>

        <?php if (isset($_SESSION['login_error'])): ?>
            Swal.fire({
                icon: 'error',
                title: 'Login Gagal',
                text: '<?= $_SESSION['login_error'] ?>',
                confirmButtonColor: '#3085d6'
            });
            <?php unset($_SESSION['login_error']); // Hapus session setelah ditampilkan 
            ?>
        <?php endif; ?>
        // LOGOUT
        function confirmLogout() {
            Swal.fire({
                title: 'Konfirmasi Logout',
                text: "Apakah Anda yakin ingin mengakhiri sesi ini?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#d33', // Warna tombol Ya (Merah)
                cancelButtonColor: '#3085d6', // Warna tombol Batal (Biru)
                confirmButtonText: 'Ya, Logout!',
                cancelButtonText: 'Batal',
                reverseButtons: true // Menukar posisi tombol agar Batal di kiri
            }).then((result) => {
                if (result.isConfirmed) {
                    // Jika user menekan 'Ya', kirim form logout
                    document.getElementById('logout-form').submit();
                }
            });
        }

        // Logika untuk menampilkan alert SUKSES setelah kembali dari logout.php
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('logout') === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'Berhasil Logout',
                text: 'Sesi Anda telah berakhir.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Menghapus ?logout=success dari URL tanpa refresh
                window.history.replaceState({}, document.title, window.location.pathname);
            });
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            sidebar.classList.toggle('open');

            // Opsional: mencegah body scrolling saat sidebar buka
            if (sidebar.classList.contains('open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }

        // Tutup sidebar otomatis jika layar di-resize ke desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 1200) {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    </script>
</body>

</html>
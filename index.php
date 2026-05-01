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
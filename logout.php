<?php
session_start();
// Hapus semua data session
session_unset();
// Hancurkan session
session_destroy();

// Alihkan kembali ke halaman utama
header("Location: index.php?logout=success");
exit();
?>
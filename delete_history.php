<?php
require_once 'config/config.php';

// Cek parameter
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';

if ($action === 'clear') {
    // Ambil semua file_name sebelum delete
    $result = $conn->query("SELECT file_name FROM uploads");
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $filePath = 'upload/' . $row['file_name'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
    }
    
    // Hapus semua record dari table uploads
    $conn->query("DELETE FROM uploads");
    
    // Redirect kembali ke history page
    header('Location: index.php?page=history');
    exit;
} elseif ($id) {
    // Ambil file_name dari database berdasarkan ID
    $id = intval($id);
    $result = $conn->query("SELECT file_name FROM uploads WHERE id = $id");
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $filePath = 'upload/' . $row['file_name'];
        
        // Hapus file dari folder
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    // Hapus record berdasarkan ID
    $conn->query("DELETE FROM uploads WHERE id = $id");
    
    // Redirect kembali ke history page
    header('Location: index.php?page=history');
    exit;
} else {
    // Jika tidak ada parameter, redirect ke home
    header('Location: index.php');
    exit;
}
?>

<?php
require_once 'config/config.php';

if (isset($_FILES['file_excel'])) {

    $file = $_FILES['file_excel'];

    // 1️⃣ Cek error upload
    if ($file['error'] !== 0) {
        die("Gagal upload file.");
    }

    // 2️⃣ Validasi ekstensi
    $allowed = ['xlsx', 'xls', 'csv'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($ext, $allowed)) {
        die("Format file tidak didukung.");
    }

    // 3️⃣ Cek duplikasi berdasarkan nama asli file
    $originalName = $file['name'];

    $check = $conn->prepare("SELECT id FROM uploads WHERE file_name = ?");
    $check->bind_param("s", $originalName);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $check->close();
        echo "<script>
            alert('File sudah pernah diupload!');
            window.location.href='index.php?page=dashboard';
          </script>";
        exit;
    }
    $check->close();

    // 4️⃣ Simpan file dengan nama asli (tidak pakai time() lagi)
    $targetPath = "upload/" . $originalName;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {

        // 5️⃣ Simpan ke database
        $stmt = $conn->prepare("INSERT INTO uploads (file_name) VALUES (?)");
        $stmt->bind_param("s", $originalName);
        $stmt->execute();
        $stmt->close();

        header("Location: index.php?page=dashboard");
        exit;
    } else {
        echo "Gagal menyimpan file.";
    }
}

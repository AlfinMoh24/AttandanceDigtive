<?php
// Wajib: Beri tahu browser bahwa ini adalah data JSON murni
header('Content-Type: application/json; charset=utf-8');

// Matikan error reporting agar HTML error tidak bocor ke output JSON
error_reporting(0);

// Path ke folder upload. 
// Karena get_uploads.php ada di dalam folder /api/, 
// kita harus naik satu tingkat ('../') untuk ke folder /upload/
$directory = "../upload/"; 

// Cek apakah folder benar-benar ada
if (!is_dir($directory)) {
    // Jika tidak ada, jangan munculkan error, kembalikan saja array kosong
    echo json_encode([]);
    exit;
}

$files = scandir($directory);
$result = [];

if ($files !== false) {
    foreach ($files as $file) {
        // Abaikan navigasi folder bawaan sistem (. dan ..) dan pastikan itu file
        if ($file !== '.' && $file !== '..' && !is_dir($directory . $file)) {
            $result[] = $file;
        }
    }
}

// Kembalikan hasilnya
echo json_encode($result);
?>
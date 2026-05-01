<?php
require_once 'config/config.php';

$result = $conn->query("SELECT * FROM uploads ORDER BY id DESC LIMIT 1");

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();

    echo json_encode([
        'status' => 'success',
        'file'   => $row['file_name'], // pastikan kolom sesuai
        'path'   => 'uploads/' . $row['file_name']
    ]);
} else {
    echo json_encode([
        'status' => 'empty'
    ]);
}
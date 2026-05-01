<?php
session_start();
require_once 'config/config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $conn->real_escape_string($_POST['username']);
    $password = md5($_POST['password']); 

    $sql = "SELECT id, username FROM users WHERE username = '$username' AND password = '$password' LIMIT 1";
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        
        // Simpan pesan sukses ke session
        $_SESSION['login_success'] = "Selamat datang, " . $user['username'] . "!";
        header("Location: index.php"); 
        exit();
    } else {
        // Simpan pesan error ke session
        $_SESSION['login_error'] = "Username atau Password salah!";
        header("Location: index.php");
        exit();
    }
}
?>
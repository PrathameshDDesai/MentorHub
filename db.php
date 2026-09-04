<?php
// db.php - Central Database Connection using PDO & Prepared Statements

$host = 'localhost';
$dbname = 'mentor_db';
$username = 'root';
$password = ''; // Default XAMPP MySQL password is blank

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
} catch (PDOException $e) {
    // Return friendly error response without exposing raw SQL or server paths
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Unable to connect to the database. Please ensure MySQL is running in XAMPP and the mentor_db database is created.'
    ]);
    exit;
}

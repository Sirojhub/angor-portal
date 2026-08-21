<?php
// ============================================================
// ANGOR AGRO STAR PORTAL — Database Connection Config (PDO)
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = getenv('DB_HOST') ?: '127.0.0.1';
$db_name = getenv('DB_NAME') ?: 'angor_portal';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';
$db_type = getenv('DB_TYPE') ?: 'mysql'; // 'mysql', 'pgsql', or 'sqlite'

$pdo = null;

try {
    if ($db_type === 'sqlite') {
        $sqlite_file = __DIR__ . '/angor_portal.sqlite';
        $pdo = new PDO("sqlite:" . $sqlite_file);
    } else if ($db_type === 'pgsql') {
        $pdo = new PDO("pgsql:host=$db_host;dbname=$db_name", $db_user, $db_pass);
    } else {
        // Default: MySQL / MariaDB
        $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
} catch (PDOException $e) {
    // If MySQL connection fails, fallback to SQLite automatically so backend works immediately
    try {
        $sqlite_file = __DIR__ . '/angor_portal.sqlite';
        $pdo = new PDO("sqlite:" . $sqlite_file);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        // Auto-initialize SQLite schema if empty
        $query = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        if (!$query || !$query->fetch()) {
            init_sqlite_db($pdo);
        }
    } catch (PDOException $e2) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed: ' . $e2->getMessage()]);
        exit();
    }
}

function init_sqlite_db($pdo) {
    $sql = "
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        role TEXT NOT NULL, position TEXT, department TEXT, phone TEXT,
        avatar TEXT, avatar_color TEXT, hire_date TEXT, efficiency INTEGER, status TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, description TEXT, assigned_to INTEGER,
        assigned_name TEXT, deadline TEXT, priority TEXT, category TEXT,
        status TEXT, created_by INTEGER, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL, category TEXT, version TEXT, file_type TEXT,
        file_size TEXT, file_path TEXT, uploaded_by INTEGER, uploaded_name TEXT,
        upload_date TEXT, status TEXT, description TEXT
    );
    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, inn TEXT, country TEXT, city TEXT,
        contact_person TEXT, phone TEXT, email TEXT, contract_number TEXT,
        ai_risk TEXT, risk_text TEXT, status TEXT, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS warehouse_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, category TEXT, unit TEXT, current_stock REAL,
        min_stock REAL, max_stock REAL, location TEXT, temperature INTEGER, status TEXT
    );
    ";
    $pdo->exec($sql);
}

function json_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

function get_json_input() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

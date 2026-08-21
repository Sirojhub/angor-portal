<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
    if ($id) {
        $stmt = $pdo->prepare("SELECT id, name, email, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status FROM users WHERE id = ?");
        $stmt->execute([$id]);
        json_response($stmt->fetch() ?: ['error' => 'Not found'], 404);
    } else {
        $stmt = $pdo->query("SELECT id, name, email, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status FROM users ORDER BY id ASC");
        json_response($stmt->fetchAll());
    }
}

if ($method === 'POST') {
    $input = get_json_input();
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $pass = $input['password'] ?? 'user123';

    if (empty($name) || empty($email)) json_response(['error' => 'Ism va email kiriting!'], 400);

    // Hash password securely
    $hashed = password_hash($pass, PASSWORD_BCRYPT);
    $initials = strtoupper(substr($name, 0, 2));

    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 75, 'active')");
    $stmt->execute([
        $name, $email, $hashed,
        $input['role'] ?? 'employee',
        $input['position'] ?? 'Xodim',
        $input['department'] ?? 'Ishlab chiqarish',
        $input['phone'] ?? '',
        $initials,
        $input['avatarColor'] ?? '#1A3A6B',
        $input['hireDate'] ?? date('Y-m-d')
    ]);

    json_response(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    if (!$id) json_response(['error' => 'ID required'], 400);
    $input = get_json_input();

    $stmt = $pdo->prepare("UPDATE users SET name=?, email=?, role=?, position=?, department=?, phone=?, status=? WHERE id=?");
    $stmt->execute([
        $input['name'], $input['email'], $input['role'],
        $input['position'], $input['department'], $input['phone'],
        $input['status'] ?? 'active', $id
    ]);
    json_response(['success' => true]);
}

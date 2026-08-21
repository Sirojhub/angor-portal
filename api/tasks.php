<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// READ
if ($method === 'GET') {
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
        $stmt->execute([$id]);
        $task = $stmt->fetch();
        if ($task) json_response($task);
        json_response(['error' => 'Topshiriq topilmadi'], 404);
    } else {
        $status = $_GET['status'] ?? null;
        $assigned_to = $_GET['assigned_to'] ?? null;
        
        $sql = "SELECT * FROM tasks WHERE 1=1";
        $params = [];
        if ($status && $status !== 'all') {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        if ($assigned_to) {
            $sql .= " AND assigned_to = ?";
            $params[] = $assigned_to;
        }
        $sql .= " ORDER BY id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response($stmt->fetchAll());
    }
}

// CREATE
if ($method === 'POST') {
    $input = get_json_input();
    $title = trim($input['title'] ?? '');
    $assigned_to = (int)($input['assignedTo'] ?? $input['assigned_to'] ?? 0);
    $deadline = $input['deadline'] ?? '';

    if (empty($title) || !$assigned_to || empty($deadline)) {
        json_response(['error' => 'Barcha majburiy maydonlarni to\'ldiring!'], 400);
    }

    $stmt_u = $pdo->prepare("SELECT name FROM users WHERE id = ?");
    $stmt_u->execute([$assigned_to]);
    $u = $stmt_u->fetch();
    $assigned_name = $u ? $u['name'] : '—';

    $stmt = $pdo->prepare("INSERT INTO tasks (title, description, assigned_to, assigned_name, deadline, priority, category, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $title,
        $input['description'] ?? '',
        $assigned_to,
        $assigned_name,
        $deadline,
        $input['priority'] ?? 'medium',
        $input['category'] ?? 'Ishlab chiqarish',
        $input['status'] ?? 'new',
        $input['createdBy'] ?? 1
    ]);

    json_response(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

// UPDATE
if ($method === 'PUT') {
    if (!$id) json_response(['error' => 'ID topilmadi'], 400);
    $input = get_json_input();

    $fields = [];
    $params = [];
    
    $allowed = ['title', 'description', 'assigned_to', 'assigned_name', 'deadline', 'priority', 'category', 'status'];
    foreach ($allowed as $f) {
        $camel = str_replace('_', '', lcfirst(ucwords($f, '_')));
        if (isset($input[$f]) || isset($input[$camel])) {
            $fields[] = "$f = ?";
            $params[] = $input[$f] ?? $input[$camel];
        }
    }

    if (empty($fields)) json_response(['error' => 'O\'zgarishlar kiritilmadi'], 400);

    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    json_response(['success' => true]);
}

// DELETE
if ($method === 'DELETE') {
    if (!$id) json_response(['error' => 'ID topilmadi'], 400);
    $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->execute([$id]);
    json_response(['success' => true]);
}

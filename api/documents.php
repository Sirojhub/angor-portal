<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $cat = $_GET['category'] ?? null;
    $sql = "SELECT * FROM documents WHERE 1=1";
    $params = [];
    if ($cat && $cat !== 'all') {
        $sql .= " AND category = ?";
        $params[] = $cat;
    }
    $sql .= " ORDER BY id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    // Handle file upload or JSON metadata
    $title = $_POST['title'] ?? null;
    if (!$title) {
        $input = get_json_input();
        $title = $input['title'] ?? '';
    }

    if (empty($title)) json_response(['error' => 'Hujjat nomini kiriting!'], 400);

    $file_path = null;
    $file_size = '—';
    $file_type = $_POST['file_type'] ?? $input['fileType'] ?? 'PDF';

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/../uploads/';
        if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
        
        $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
        $filename = uniqid('doc_') . '.' . $ext;
        $target = $upload_dir . $filename;

        if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
            $file_path = 'uploads/' . $filename;
            $file_size = round($_FILES['file']['size'] / 1024) . ' KB';
            $file_type = strtoupper($ext);
        }
    }

    $stmt = $pdo->prepare("INSERT INTO documents (title, category, version, file_type, file_size, file_path, uploaded_by, uploaded_name, upload_date, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE(), ?, ?)");
    $stmt->execute([
        $title,
        $_POST['category'] ?? $input['category'] ?? 'shartnoma',
        $_POST['version'] ?? $input['version'] ?? 'v1',
        $file_type,
        $file_size,
        $file_path,
        $_POST['uploaded_by'] ?? $input['uploadedBy'] ?? 1,
        $_POST['uploaded_name'] ?? $input['uploadedName'] ?? 'Aziz Karimov',
        'active',
        $_POST['description'] ?? $input['description'] ?? ''
    ]);

    json_response(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM documents WHERE id = ?");
        $stmt->execute([$id]);
        json_response(['success' => true]);
    }
}

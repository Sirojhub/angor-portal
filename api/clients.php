<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM clients WHERE id = ?");
        $stmt->execute([$id]);
        json_response($stmt->fetch() ?: ['error' => 'Not found'], $id ? 200 : 404);
    } else {
        $stmt = $pdo->query("SELECT * FROM clients ORDER BY id DESC");
        json_response($stmt->fetchAll());
    }
}

if ($method === 'POST') {
    $input = get_json_input();
    $name = trim($input['name'] ?? '');
    if (empty($name)) json_response(['error' => 'Firma nomini kiriting!'], 400);

    $stmt = $pdo->prepare("INSERT INTO clients (name, inn, country, city, contact_person, phone, email, contract_number, ai_risk, risk_text, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $name,
        $input['inn'] ?? '',
        $input['country'] ?? 'O\'zbekiston',
        $input['city'] ?? '',
        $input['contactPerson'] ?? $input['contact_person'] ?? '',
        $input['phone'] ?? '',
        $input['email'] ?? '',
        $input['contractNumber'] ?? $input['contract_number'] ?? '',
        $input['aiRisk'] ?? $input['ai_risk'] ?? 'low',
        $input['riskText'] ?? $input['risk_text'] ?? 'Yangi mijoz, tahlil qilinmagan',
        $input['status'] ?? 'active',
        $input['notes'] ?? ''
    ]);

    json_response(['success' => true, 'id' => $pdo->lastInsertId()], 201);
}

if ($method === 'PUT') {
    if (!$id) json_response(['error' => 'ID required'], 400);
    $input = get_json_input();
    
    $stmt = $pdo->prepare("UPDATE clients SET name=?, inn=?, country=?, city=?, contact_person=?, phone=?, email=?, ai_risk=?, risk_text=?, notes=? WHERE id=?");
    $stmt->execute([
        $input['name'], $input['inn'], $input['country'], $input['city'],
        $input['contactPerson'] ?? $input['contact_person'],
        $input['phone'], $input['email'],
        $input['aiRisk'] ?? $input['ai_risk'],
        $input['riskText'] ?? $input['risk_text'],
        $input['notes'], $id
    ]);
    json_response(['success' => true]);
}

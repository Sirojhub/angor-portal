<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM warehouse_items ORDER BY id ASC");
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $input = get_json_input();
    $item_id = (int)($input['itemId'] ?? $input['item_id'] ?? 0);
    $type = $input['type'] ?? 'kirim';
    $qty = (float)($input['quantity'] ?? 0);

    if (!$item_id || $qty <= 0) json_response(['error' => 'Miqdorni to\'g\'ri kiriting!'], 400);

    $stmt = $pdo->prepare("SELECT * FROM warehouse_items WHERE id = ?");
    $stmt->execute([$item_id]);
    $item = $stmt->fetch();

    if (!$item) json_response(['error' => 'Mahsulot topilmadi'], 404);

    $new_stock = ($type === 'kirim') ? $item['current_stock'] + $qty : $item['current_stock'] - $qty;
    if ($new_stock < 0) json_response(['error' => 'Zaxira yetarli emas!'], 400);

    // Update stock
    $stmt_u = $pdo->prepare("UPDATE warehouse_items SET current_stock = ?, status = ? WHERE id = ?");
    $status = ($new_stock <= $item['min_stock']) ? 'low' : 'normal';
    $stmt_u->execute([$new_stock, $status, $item_id]);

    // Record transaction
    $stmt_t = $pdo->prepare("INSERT INTO warehouse_transactions (item_id, item_name, type, quantity, note, date, created_by) VALUES (?, ?, ?, ?, ?, CURRENT_DATE(), ?)");
    $stmt_t->execute([$item_id, $item['name'], $type, $qty, $input['note'] ?? '', $input['createdBy'] ?? 1]);

    json_response(['success' => true, 'newStock' => $new_stock]);
}

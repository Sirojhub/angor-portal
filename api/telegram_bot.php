<?php
// ============================================================
// ANGOR AGRO STAR PORTAL — Telegram Bot Integratsiyasi
// ============================================================

require_once __DIR__ . '/config.php';

// Telegram Bot Sozlamalari (Portal sozlamalaridan olinishi mumkin)
define('TELEGRAM_BOT_TOKEN', getenv('TELEGRAM_BOT_TOKEN') ?: '7512345678:AAH1234567890abcdefghijklmnopqrstuv');
define('TELEGRAM_DEFAULT_CHAT_ID', getenv('TELEGRAM_CHAT_ID') ?: ''); // Guruh yoki Admin Chat ID

/**
 * Telegram API ga xabar yuborish
 */
function sendTelegramMessage($chat_id, $text, $parse_mode = 'HTML') {
    $token = TELEGRAM_BOT_TOKEN;
    if (empty($token) || strpos($token, '7512345678') !== false) {
        // Mock success response if token is placeholder
        return ['ok' => true, 'mock' => true, 'message' => 'Demo rejimda xabar yuborildi'];
    }

    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $payload = [
        'chat_id' => $chat_id,
        'text' => $text,
        'parse_mode' => $parse_mode,
        'disable_web_page_preview' => true
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $result = curl_exec($ch);
    curl_close($ch);

    return json_decode($result, true);
}

/**
 * 1. Yangi topshiriq xabarnomasi
 */
function notifyNewTask($task, $chat_id = null) {
    $target_chat = $chat_id ?: TELEGRAM_DEFAULT_CHAT_ID;
    $msg = "📌 <b>YANGI TOPSHIRIQ!</b>\n\n";
    $msg .= "<b>Sarlavha:</b> " . htmlspecialchars($task['title']) . "\n";
    $msg .= "<b>Mas'ul:</b> " . htmlspecialchars($task['assignedName'] ?? $task['assigned_name']) . "\n";
    $msg .= "<b>Muddat:</b> 📅 " . htmlspecialchars($task['deadline']) . "\n";
    $msg .= "<b>Muhimlik:</b> " . strtoupper($task['priority']) . "\n";
    $msg .= "<b>Turkum:</b> " . htmlspecialchars($task['category']) . "\n";
    if (!empty($task['description'])) {
        $msg .= "\n📝 <i>" . htmlspecialchars($task['description']) . "</i>\n";
    }
    $msg .= "\n🔗 <i>Angor Agro Star Portal</i>";

    return sendTelegramMessage($target_chat, $msg);
}

/**
 * 2. Topshiriq bajarildi xabarnomasi
 */
function notifyTaskDone($task, $chat_id = null) {
    $target_chat = $chat_id ?: TELEGRAM_DEFAULT_CHAT_ID;
    $msg = "✅ <b>TOPSHIRIQ BAJARILDI!</b>\n\n";
    $msg .= "<b>Sarlavha:</b> " . htmlspecialchars($task['title']) . "\n";
    $msg .= "<b>Bajaruvchi:</b> " . htmlspecialchars($task['assignedName'] ?? $task['assigned_name']) . "\n";
    $msg .= "<b>Sana:</b> 📅 " . date('Y-m-d H:i') . "\n";
    $msg .= "\n🎉 <i>Topshiriq muvaffaqiyatli yakunlandi!</i>";

    return sendTelegramMessage($target_chat, $msg);
}

/**
 * 3. Muddati o'tgan topshiriqlar xabarnomasi (Daily Cron / Reminder)
 */
function notifyOverdueTasksCron($pdo) {
    $stmt = $pdo->query("SELECT * FROM tasks WHERE deadline < CURRENT_DATE() AND status != 'done'");
    $overdue = $stmt->fetchAll();

    if (empty($overdue)) return ['count' => 0];

    $msg = "⚠️ <b>MUDDATI O'TGAN TOPSHIRIQLAR OGOHLANTIRUVI!</b>\n\n";
    $msg .= "Jami kechikayotgan topshiriqlar: <b>" . count($overdue) . " ta</b>\n\n";

    foreach ($overdue as $i => $t) {
        $msg .= ($i + 1) . ". <b>" . htmlspecialchars($t['title']) . "</b>\n";
        $msg .= "   👤 Mas'ul: " . htmlspecialchars($t['assigned_name']) . " | 📅 Muddat: " . $t['deadline'] . "\n\n";
    }

    $msg .= "<i>Iltimos, ijroni tezlashtiring!</i>";

    return sendTelegramMessage(TELEGRAM_DEFAULT_CHAT_ID, $msg);
}

// REST API Handling
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
    $input = get_json_input();
    $action = $input['action'] ?? 'test';

    if ($action === 'test') {
        $chat_id = $input['chat_id'] ?? TELEGRAM_DEFAULT_CHAT_ID;
        $res = sendTelegramMessage($chat_id, "🤖 <b>Angor Agro Star Portal Bot</b>\n\nTelegram integratsiyasi muvaffaqiyatli ulandi! ✅");
        json_response(['success' => true, 'result' => $res]);
    }

    if ($action === 'notify_task') {
        $task = $input['task'] ?? [];
        $type = $input['type'] ?? 'new';
        if ($type === 'done') {
            $res = notifyTaskDone($task, $input['chat_id'] ?? null);
        } else {
            $res = notifyNewTask($task, $input['chat_id'] ?? null);
        }
        json_response(['success' => true, 'result' => $res]);
    }
}

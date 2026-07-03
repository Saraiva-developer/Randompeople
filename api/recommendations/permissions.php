<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('POST');

$pdo = db();
recommendation_ensure_tables($pdo);
$user = recommendation_require_common($pdo);
$userId = (int)$user['id'];
$input = json_input();

$action = strtolower(trim((string)($input['action'] ?? '')));

if ($action === 'set_mode') {
    respond([
        'ok' => true,
        'settings' => [
            'receive_mode' => 'approved',
        ],
    ]);
}

if (!in_array($action, ['approve', 'reject', 'block', 'unblock'], true)) {
    error_response('Acao invalida', 422);
}

$senderUserId = isset($input['sender_user_id']) ? (int)$input['sender_user_id'] : 0;
if ($senderUserId <= 0) {
    error_response('sender_user_id obrigatorio', 422);
}
if ($senderUserId === $userId) {
    error_response('Acao invalida', 422);
}

$sender = recommendation_get_user($pdo, $senderUserId);
if (!$sender || ($sender['account_type'] ?? 'professional') !== 'common') {
    error_response('Utilizador nao encontrado', 404);
}

$statusMap = [
    'approve' => 'approved',
    'reject' => 'rejected',
    'block' => 'blocked',
    'unblock' => 'rejected',
];
$nextStatus = $statusMap[$action] ?? 'rejected';

recommendation_upsert_permission($pdo, $senderUserId, $userId, $nextStatus);

respond([
    'ok' => true,
    'sender_user_id' => $senderUserId,
    'status' => $nextStatus,
]);

<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('GET');

$pdo = db();
recommendation_ensure_tables($pdo);
$user = recommendation_require_common($pdo);
$userId = (int)$user['id'];

$q = trim((string)($_GET['q'] ?? ''));
if (mb_strlen($q) < 2) {
    respond([
        'ok' => true,
        'users' => [],
    ]);
}

$like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';

ensure_users_account_type_column($pdo);
$sql = users_has_account_type($pdo)
    ? 'SELECT id, name, email
       FROM users
       WHERE account_type = "common"
         AND id <> :current_user_id
         AND (
            name LIKE :like_q_name
            OR email LIKE :like_q_email
         )
       ORDER BY name ASC
       LIMIT 30'
    : 'SELECT id, name, email
       FROM users
       WHERE id <> :current_user_id
         AND (
            name LIKE :like_q_name
            OR email LIKE :like_q_email
         )
       ORDER BY name ASC
       LIMIT 30';

$stmt = $pdo->prepare($sql);
$stmt->execute([
    'current_user_id' => $userId,
    'like_q_name' => $like,
    'like_q_email' => $like,
]);
$rows = $stmt->fetchAll() ?: [];

$users = array_map(static function (array $row): array {
    return [
        'id' => (int)$row['id'],
        'name' => (string)($row['name'] ?? ''),
        'email' => (string)($row['email'] ?? ''),
    ];
}, $rows);

respond([
    'ok' => true,
    'users' => $users,
]);

<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('GET');

$userId = current_user_id();
if (!$userId) {
    respond([
        'ok' => true,
        'authenticated' => false,
        'user' => null,
    ]);
}

$pdo = db();
ensure_users_account_type_column($pdo);
$selectSql = users_has_account_type($pdo)
    ? 'SELECT id, name, email, account_type FROM users WHERE id = :id LIMIT 1'
    : 'SELECT id, name, email FROM users WHERE id = :id LIMIT 1';
$stmt = $pdo->prepare($selectSql);
$stmt->execute(['id' => $userId]);
$user = $stmt->fetch();

if (!$user) {
    $_SESSION = [];
    session_destroy();
    respond([
        'ok' => true,
        'authenticated' => false,
        'user' => null,
    ]);
}

$accountType = normalize_account_type($user['account_type'] ?? ($_SESSION['account_type'] ?? 'professional'));
$_SESSION['account_type'] = $accountType;

respond([
    'ok' => true,
    'authenticated' => true,
    'user' => [
        'id' => (int)$user['id'],
        'name' => (string)$user['name'],
        'email' => (string)$user['email'],
        'account_type' => $accountType,
    ],
]);

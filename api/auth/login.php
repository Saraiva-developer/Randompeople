<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('POST');

$input = json_input();
$email = strtolower(trim((string)($input['email'] ?? '')));
$password = (string)($input['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error_response('Email invalido', 422);
}
if ($password === '') {
    error_response('Palavra-passe obrigatoria', 422);
}

$pdo = db();
ensure_users_account_type_column($pdo);
$selectSql = users_has_account_type($pdo)
    ? 'SELECT id, name, email, password_hash, account_type FROM users WHERE email = :email LIMIT 1'
    : 'SELECT id, name, email, password_hash FROM users WHERE email = :email LIMIT 1';
$stmt = $pdo->prepare($selectSql);
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, (string)$user['password_hash'])) {
    error_response('Credenciais invalidas', 401);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$accountType = normalize_account_type($user['account_type'] ?? ($_SESSION['account_type'] ?? 'professional'));
$_SESSION['account_type'] = $accountType;

respond([
    'ok' => true,
    'user' => [
        'id' => (int)$user['id'],
        'name' => (string)$user['name'],
        'email' => (string)$user['email'],
        'account_type' => $accountType,
    ],
]);

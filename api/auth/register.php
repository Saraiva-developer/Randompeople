<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('POST');

$input = json_input();
$name = trim((string)($input['name'] ?? ''));
$email = strtolower(trim((string)($input['email'] ?? '')));
$password = (string)($input['password'] ?? '');
$accountType = normalize_account_type($input['account_type'] ?? 'professional');

if ($name === '' || strlen($name) < 2) {
    error_response('Nome invalido', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error_response('Email invalido', 422);
}
if (strlen($password) < 6) {
    error_response('A palavra-passe deve ter pelo menos 6 caracteres', 422);
}

$pdo = db();
ensure_users_account_type_column($pdo);

$check = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$check->execute(['email' => $email]);
if ($check->fetch()) {
    error_response('Email ja registado', 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

if (users_has_account_type($pdo)) {
    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, account_type) VALUES (:name, :email, :password_hash, :account_type)'
    );
    $stmt->execute([
        'name' => $name,
        'email' => $email,
        'password_hash' => $hash,
        'account_type' => $accountType,
    ]);
} else {
    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :password_hash)'
    );
    $stmt->execute([
        'name' => $name,
        'email' => $email,
        'password_hash' => $hash,
    ]);
}

$userId = (int)$pdo->lastInsertId();
$_SESSION['user_id'] = $userId;
$_SESSION['account_type'] = $accountType;

respond([
    'ok' => true,
    'user' => [
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'account_type' => $accountType,
    ],
], 201);

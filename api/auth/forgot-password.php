<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('POST');

$input = json_input();
$email = strtolower(trim((string)($input['email'] ?? '')));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    error_response('Email invalido', 422);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

if (!$user) {
    respond([
        'ok' => true,
        'message' => 'Se o email existir, enviamos instrucoes.',
    ]);
}

$userId = (int)$user['id'];
$rawToken = bin2hex(random_bytes(24));
$tokenHash = hash('sha256', $rawToken);
$expiresAt = (new DateTimeImmutable('+30 minutes'))->format('Y-m-d H:i:s');

$insert = $pdo->prepare(
    'INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES (:user_id, :token_hash, :expires_at)'
);
$insert->execute([
    'user_id' => $userId,
    'token_hash' => $tokenHash,
    'expires_at' => $expiresAt,
]);

respond([
    'ok' => true,
    'message' => 'Token de recuperacao gerado.',
    // Ambiente local/dev: retorna token para teste.
    // Em producao, enviar por email e remover este campo.
    'reset_token' => $rawToken,
    'expires_at' => $expiresAt,
]);


<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('POST');

$input = json_input();
$token = trim((string)($input['token'] ?? ''));
$newPassword = (string)($input['password'] ?? '');

if ($token === '' || strlen($token) < 16) {
    error_response('Token invalido', 422);
}
if (strlen($newPassword) < 6) {
    error_response('A palavra-passe deve ter pelo menos 6 caracteres', 422);
}

$tokenHash = hash('sha256', $token);
$pdo = db();

$stmt = $pdo->prepare(
    'SELECT id, user_id, expires_at, used_at
     FROM password_resets
     WHERE token_hash = :token_hash
     ORDER BY id DESC
     LIMIT 1'
);
$stmt->execute(['token_hash' => $tokenHash]);
$row = $stmt->fetch();

if (!$row) {
    error_response('Token invalido', 404);
}
if (!empty($row['used_at'])) {
    error_response('Token ja utilizado', 409);
}

$now = new DateTimeImmutable('now');
$exp = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', (string)$row['expires_at']) ?: null;
if (!$exp || $exp < $now) {
    error_response('Token expirado', 410);
}

$hash = password_hash($newPassword, PASSWORD_DEFAULT);

$pdo->beginTransaction();
try {
    $upUser = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
    $upUser->execute([
        'hash' => $hash,
        'id' => (int)$row['user_id'],
    ]);

    $useToken = $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = :id');
    $useToken->execute(['id' => (int)$row['id']]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

respond([
    'ok' => true,
    'message' => 'Palavra-passe atualizada com sucesso.',
]);


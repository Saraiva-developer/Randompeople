<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$userId = require_auth();
$pdo = db();

function saved_profile_ids(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT profile_ref
         FROM saved_profiles
         WHERE user_id = :user_id
         ORDER BY created_at DESC'
    );
    $stmt->execute(['user_id' => $userId]);
    $rows = $stmt->fetchAll();
    return array_values(array_map(static fn(array $row): string => (string)$row['profile_ref'], $rows));
}

if ($method === 'GET') {
    respond([
        'ok' => true,
        'saved_profile_ids' => saved_profile_ids($pdo, $userId),
    ]);
}

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    $input = json_input();
    $profileRef = trim((string)($input['profile_id'] ?? $input['profile_ref'] ?? ''));

    if ($profileRef === '') {
        error_response('profile_id obrigatorio', 422);
    }

    if (mb_strlen($profileRef) > 80) {
        error_response('profile_id demasiado longo', 422);
    }

    $savedRaw = $input['saved'] ?? true;
    $saved = filter_var($savedRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($saved === null) {
        $saved = true;
    }

    if ($saved) {
        $stmt = $pdo->prepare(
            'INSERT IGNORE INTO saved_profiles (user_id, profile_ref)
             VALUES (:user_id, :profile_ref)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'profile_ref' => $profileRef,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'DELETE FROM saved_profiles
             WHERE user_id = :user_id AND profile_ref = :profile_ref'
        );
        $stmt->execute([
            'user_id' => $userId,
            'profile_ref' => $profileRef,
        ]);
    }

    respond([
        'ok' => true,
        'saved_profile_ids' => saved_profile_ids($pdo, $userId),
    ]);
}

error_response('Metodo nao permitido', 405);


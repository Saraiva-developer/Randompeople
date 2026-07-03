<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$userId = require_auth();
$pdo = db();

if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT id, user_id, slug, name, type, data_json, is_published, created_at, updated_at
         FROM profiles
         WHERE user_id = :user_id
         ORDER BY updated_at DESC
         LIMIT 1'
    );
    $stmt->execute(['user_id' => $userId]);
    $profile = $stmt->fetch();

    if (!$profile) {
        respond(['ok' => true, 'profile' => null]);
    }

    respond([
        'ok' => true,
        'profile' => [
            'id' => (int)$profile['id'],
            'user_id' => (int)$profile['user_id'],
            'slug' => (string)$profile['slug'],
            'name' => (string)$profile['name'],
            'type' => (string)$profile['type'],
            'data' => json_decode((string)$profile['data_json'], true) ?? [],
            'is_published' => (bool)$profile['is_published'],
            'created_at' => (string)$profile['created_at'],
            'updated_at' => (string)$profile['updated_at'],
        ],
    ]);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $input = json_input();
    $name = trim((string)($input['name'] ?? ''));
    $type = trim((string)($input['type'] ?? ''));
    $data = $input['data'] ?? null;
    $isPublished = $input['is_published'] ?? null;

    $stmt = $pdo->prepare(
        'SELECT id, slug, name, type, data_json, is_published
         FROM profiles
         WHERE user_id = :user_id
         ORDER BY updated_at DESC
         LIMIT 1'
    );
    $stmt->execute(['user_id' => $userId]);
    $current = $stmt->fetch();

    if (!$current) {
        error_response('Perfil nao encontrado para este utilizador', 404);
    }

    $nextName = $name !== '' ? $name : (string)$current['name'];
    $nextType = $type !== '' ? $type : (string)$current['type'];
    $nextData = is_array($data) ? $data : (json_decode((string)$current['data_json'], true) ?? []);
    $nextPublished = is_bool($isPublished) ? ($isPublished ? 1 : 0) : (int)$current['is_published'];

    $update = $pdo->prepare(
        'UPDATE profiles
         SET name = :name, type = :type, data_json = :data_json, is_published = :is_published
         WHERE id = :id AND user_id = :user_id'
    );
    $update->execute([
        'name' => $nextName,
        'type' => $nextType,
        'data_json' => json_encode($nextData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'is_published' => $nextPublished,
        'id' => (int)$current['id'],
        'user_id' => $userId,
    ]);

    respond([
        'ok' => true,
        'profile' => [
            'id' => (int)$current['id'],
            'user_id' => $userId,
            'slug' => (string)$current['slug'],
            'name' => $nextName,
            'type' => $nextType,
            'data' => $nextData,
            'is_published' => (bool)$nextPublished,
        ],
    ]);
}

error_response('Metodo nao permitido', 405);

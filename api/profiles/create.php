<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('POST');
$userId = require_auth();
$input = json_input();

$slug = strtolower(trim((string)($input['slug'] ?? '')));
$name = trim((string)($input['name'] ?? ''));
$type = trim((string)($input['type'] ?? 'service_pro'));
$data = $input['data'] ?? [];
$isPublished = !empty($input['is_published']) ? 1 : 0;

if ($slug === '' || !preg_match('/^[a-z0-9-]{3,80}$/', $slug)) {
    error_response('Slug invalido (use minusculas, numeros e hifen)', 422);
}
if ($name === '' || mb_strlen($name) < 2) {
    error_response('Nome do perfil invalido', 422);
}
if (!is_array($data)) {
    error_response('Campo data deve ser um objeto JSON', 422);
}

$pdo = db();

$check = $pdo->prepare('SELECT id FROM profiles WHERE slug = :slug LIMIT 1');
$check->execute(['slug' => $slug]);
if ($check->fetch()) {
    error_response('Slug ja existe', 409);
}

$stmt = $pdo->prepare(
    'INSERT INTO profiles (user_id, slug, name, type, data_json, is_published)
     VALUES (:user_id, :slug, :name, :type, :data_json, :is_published)'
);
$stmt->execute([
    'user_id' => $userId,
    'slug' => $slug,
    'name' => $name,
    'type' => $type,
    'data_json' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'is_published' => $isPublished,
]);

$profileId = (int)$pdo->lastInsertId();

respond([
    'ok' => true,
    'profile' => [
        'id' => $profileId,
        'user_id' => $userId,
        'slug' => $slug,
        'name' => $name,
        'type' => $type,
        'data' => $data,
        'is_published' => (bool)$isPublished,
    ],
], 201);

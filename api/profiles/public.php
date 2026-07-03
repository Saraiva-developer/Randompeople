<?php

declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('GET');

$slug = strtolower(trim((string)($_GET['slug'] ?? '')));
if ($slug === '') {
    error_response('Slug obrigatorio', 422);
}

$pdo = db();
$stmt = $pdo->prepare(
    'SELECT id, user_id, slug, name, type, data_json, is_published, created_at, updated_at
     FROM profiles
     WHERE slug = :slug
     LIMIT 1'
);
$stmt->execute(['slug' => $slug]);
$profile = $stmt->fetch();

if (!$profile) {
    error_response('Perfil nao encontrado', 404);
}
if (!(int)$profile['is_published']) {
    error_response('Perfil nao publicado', 403);
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

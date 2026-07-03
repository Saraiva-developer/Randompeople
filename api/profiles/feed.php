<?php
declare(strict_types=1);

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/db.php';

require_method('GET');

$limit = (int)($_GET['limit'] ?? 120);
if ($limit < 1) $limit = 1;
if ($limit > 300) $limit = 300;

$pdo = db();
$sql = "
  SELECT id, user_id, slug, name, type, data_json, created_at, updated_at
  FROM profiles
  WHERE is_published = 1
  ORDER BY updated_at DESC
  LIMIT {$limit}
";
$stmt = $pdo->query($sql);
$rows = $stmt->fetchAll();

$profiles = array_map(static function (array $row): array {
    return [
        'id' => (int)$row['id'],
        'user_id' => (int)$row['user_id'],
        'slug' => (string)$row['slug'],
        'name' => (string)$row['name'],
        'type' => (string)$row['type'],
        'data' => json_decode((string)$row['data_json'], true) ?? [],
        'created_at' => (string)$row['created_at'],
        'updated_at' => (string)$row['updated_at'],
    ];
}, $rows ?: []);

respond([
    'ok' => true,
    'profiles' => $profiles,
    'count' => count($profiles),
]);


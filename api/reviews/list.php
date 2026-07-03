<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('GET');

$profileId = (int)($_GET['profile_id'] ?? 0);
$slug = strtolower(trim((string)($_GET['slug'] ?? '')));

if ($profileId <= 0 && $slug === '') {
    error_response('Perfil obrigatorio', 422);
}

$pdo = db();
reviews_ensure_table($pdo);

$profile = reviews_find_profile($pdo, $profileId > 0 ? $profileId : null, $slug);
if (!$profile) {
    error_response('Perfil nao encontrado', 404);
}
if (!(int)($profile['is_published'] ?? 0)) {
    error_response('Perfil nao publicado', 403);
}

$profileId = (int)$profile['id'];

$summaryStmt = $pdo->prepare(
    'SELECT COUNT(*) AS total, ROUND(AVG(rating), 2) AS average
     FROM profile_reviews
     WHERE profile_id = :profile_id'
);
$summaryStmt->execute(['profile_id' => $profileId]);
$summary = $summaryStmt->fetch() ?: ['total' => 0, 'average' => null];

$distStmt = $pdo->prepare(
    'SELECT rating, COUNT(*) AS total
     FROM profile_reviews
     WHERE profile_id = :profile_id
     GROUP BY rating'
);
$distStmt->execute(['profile_id' => $profileId]);
$distribution = ['1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0];
foreach (($distStmt->fetchAll() ?: []) as $row) {
    $key = (string)(int)($row['rating'] ?? 0);
    if (isset($distribution[$key])) {
        $distribution[$key] = (int)$row['total'];
    }
}

$listStmt = $pdo->prepare(
    'SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
            u.id AS user_id, u.name AS user_name
     FROM profile_reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.profile_id = :profile_id
     ORDER BY r.updated_at DESC, r.id DESC
     LIMIT 120'
);
$listStmt->execute(['profile_id' => $profileId]);
$reviews = array_map(static function (array $row): array {
    return [
        'id' => (int)$row['id'],
        'rating' => (int)$row['rating'],
        'comment' => (string)($row['comment'] ?? ''),
        'created_at' => (string)$row['created_at'],
        'updated_at' => (string)$row['updated_at'],
        'user' => [
            'id' => (int)$row['user_id'],
            'name' => (string)($row['user_name'] ?? ''),
        ],
    ];
}, $listStmt->fetchAll() ?: []);

$viewerUserId = current_user_id();
$viewer = null;
if ($viewerUserId) {
    $viewer = reviews_get_user($pdo, $viewerUserId);
}
$viewerReview = null;
if ($viewerUserId) {
    $vStmt = $pdo->prepare(
        'SELECT rating, comment
         FROM profile_reviews
         WHERE profile_id = :profile_id
           AND user_id = :user_id
         LIMIT 1'
    );
    $vStmt->execute([
        'profile_id' => $profileId,
        'user_id' => $viewerUserId,
    ]);
    $v = $vStmt->fetch();
    if ($v) {
        $viewerReview = [
            'rating' => (int)$v['rating'],
            'comment' => (string)($v['comment'] ?? ''),
        ];
    }
}

$canRate = false;
if ($viewer && ($viewer['account_type'] ?? 'professional') === 'common') {
    $canRate = ((int)$profile['user_id'] !== (int)$viewer['id']);
}

respond([
    'ok' => true,
    'profile_id' => $profileId,
    'summary' => [
        'total' => (int)($summary['total'] ?? 0),
        'average' => isset($summary['average']) ? (float)$summary['average'] : 0.0,
        'distribution' => $distribution,
    ],
    'viewer' => [
        'authenticated' => (bool)$viewerUserId,
        'account_type' => $viewer['account_type'] ?? null,
        'can_rate' => $canRate,
        'review' => $viewerReview,
    ],
    'reviews' => $reviews,
]);


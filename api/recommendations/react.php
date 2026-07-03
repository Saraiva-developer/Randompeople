<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('POST');

$pdo = db();
recommendation_ensure_tables($pdo);
$user = recommendation_require_common($pdo);
$userId = (int)$user['id'];
$input = json_input();

$recommendationId = isset($input['recommendation_id']) ? (int)$input['recommendation_id'] : 0;
$reaction = strtolower(trim((string)($input['reaction'] ?? '')));

if ($recommendationId <= 0) {
    error_response('recommendation_id obrigatorio', 422);
}

$allowed = ['like', 'fire', 'wow', 'love'];
if ($reaction !== '' && !in_array($reaction, $allowed, true)) {
    error_response('Reacao invalida', 422);
}

$check = $pdo->prepare(
    'SELECT id
     FROM recommendations
     WHERE id = :id
       AND receiver_user_id = :user_id
       AND expires_at > NOW()
     LIMIT 1'
);
$check->execute([
    'id' => $recommendationId,
    'user_id' => $userId,
]);
$row = $check->fetch();
if (!$row) {
    error_response('Recomendacao nao encontrada', 404);
}

if ($reaction === '') {
    $del = $pdo->prepare(
        'DELETE FROM recommendation_reactions
         WHERE recommendation_id = :recommendation_id
           AND user_id = :user_id'
    );
    $del->execute([
        'recommendation_id' => $recommendationId,
        'user_id' => $userId,
    ]);
    respond([
        'ok' => true,
        'recommendation_id' => $recommendationId,
        'reaction' => '',
    ]);
}

$upsert = $pdo->prepare(
    'INSERT INTO recommendation_reactions (recommendation_id, user_id, reaction)
     VALUES (:recommendation_id, :user_id, :reaction)
     ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)'
);
$upsert->execute([
    'recommendation_id' => $recommendationId,
    'user_id' => $userId,
    'reaction' => $reaction,
]);

respond([
    'ok' => true,
    'recommendation_id' => $recommendationId,
    'reaction' => $reaction,
]);


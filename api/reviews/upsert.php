<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('POST');

$userId = require_auth();
$input = json_input();

$profileId = (int)($input['profile_id'] ?? 0);
$slug = strtolower(trim((string)($input['slug'] ?? '')));
$rating = (int)($input['rating'] ?? 0);
$comment = trim((string)($input['comment'] ?? ''));

if ($profileId <= 0 && $slug === '') {
    error_response('Perfil obrigatorio', 422);
}
if ($rating < 1 || $rating > 5) {
    error_response('Rating invalido', 422);
}
if (mb_strlen($comment) > 1200) {
    error_response('Comentario demasiado longo', 422);
}

$pdo = db();
reviews_ensure_table($pdo);

$user = reviews_get_user($pdo, $userId);
if (!$user) {
    error_response('Utilizador nao encontrado', 404);
}
if (($user['account_type'] ?? 'professional') !== 'common') {
    error_response('Apenas conta pessoal pode avaliar', 403);
}

$profile = reviews_find_profile($pdo, $profileId > 0 ? $profileId : null, $slug);
if (!$profile) {
    error_response('Perfil nao encontrado', 404);
}
if (!(int)($profile['is_published'] ?? 0)) {
    error_response('Perfil nao publicado', 403);
}
if ((int)$profile['user_id'] === $userId) {
    error_response('Nao podes avaliar o teu proprio perfil', 403);
}

$profileId = (int)$profile['id'];

$stmt = $pdo->prepare(
    'INSERT INTO profile_reviews (profile_id, user_id, rating, comment)
     VALUES (:profile_id, :user_id, :rating, :comment)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP'
);
$stmt->execute([
    'profile_id' => $profileId,
    'user_id' => $userId,
    'rating' => $rating,
    'comment' => $comment !== '' ? $comment : null,
]);

respond([
    'ok' => true,
    'saved' => [
        'profile_id' => $profileId,
        'user_id' => $userId,
        'rating' => $rating,
        'comment' => $comment,
    ],
]);


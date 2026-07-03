<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('GET');

$pdo = db();
recommendation_ensure_tables($pdo);
$user = recommendation_require_common($pdo);
$userId = (int)$user['id'];
$settings = recommendation_get_settings($pdo, $userId);

$inbox = [];
$sent = [];
$pending = [];

try {
    $inboxStmt = $pdo->prepare(
        'SELECT
            r.id,
            r.sender_user_id,
            r.profile_id,
            r.profile_slug,
            r.source_profile_name,
            r.content_type,
            r.content_uri,
            r.created_at,
            r.expires_at,
            su.name AS sender_name,
            su.email AS sender_email,
            rr.reaction AS my_reaction,
            (
              SELECT p.data_json
              FROM profiles p
              WHERE p.user_id = su.id
              ORDER BY p.updated_at DESC
              LIMIT 1
            ) AS sender_profile_data
         FROM recommendations r
         INNER JOIN users su ON su.id = r.sender_user_id
         LEFT JOIN recommendation_reactions rr
           ON rr.recommendation_id = r.id
          AND rr.user_id = :reaction_user_id
         WHERE r.receiver_user_id = :receiver_user_id
           AND r.expires_at > NOW()
         ORDER BY r.created_at DESC
         LIMIT 120'
    );
    $inboxStmt->execute([
        'reaction_user_id' => $userId,
        'receiver_user_id' => $userId,
    ]);
    $inboxRows = $inboxStmt->fetchAll() ?: [];

    $inbox = array_map(static function (array $row): array {
        $avatar = recommendation_parse_avatar_from_profile_data($row['sender_profile_data'] ?? '');
        return [
            'id' => (int)$row['id'],
            'sender' => [
                'id' => (int)$row['sender_user_id'],
                'name' => (string)($row['sender_name'] ?? ''),
                'email' => (string)($row['sender_email'] ?? ''),
                'avatar' => $avatar,
            ],
            'profile_id' => isset($row['profile_id']) ? (int)$row['profile_id'] : null,
            'profile_slug' => (string)($row['profile_slug'] ?? ''),
            'source_profile_name' => (string)($row['source_profile_name'] ?? ''),
            'content_type' => (string)($row['content_type'] ?? 'profile'),
            'content_uri' => (string)($row['content_uri'] ?? ''),
            'reaction' => (string)($row['my_reaction'] ?? ''),
            'created_at' => (string)($row['created_at'] ?? ''),
            'expires_at' => (string)($row['expires_at'] ?? ''),
        ];
    }, $inboxRows);
} catch (Throwable $_e) {
    $inbox = [];
}

try {
    $sentStmt = $pdo->prepare(
        'SELECT
            r.id,
            r.receiver_user_id,
            r.profile_id,
            r.profile_slug,
            r.source_profile_name,
            r.content_type,
            r.content_uri,
            r.created_at,
            r.expires_at,
            ru.name AS receiver_name,
            ru.email AS receiver_email,
            rr.reaction AS receiver_reaction,
            (
              SELECT p.data_json
              FROM profiles p
              WHERE p.user_id = ru.id
              ORDER BY p.updated_at DESC
              LIMIT 1
            ) AS receiver_profile_data
         FROM recommendations r
         INNER JOIN users ru ON ru.id = r.receiver_user_id
         LEFT JOIN recommendation_reactions rr
           ON rr.recommendation_id = r.id
          AND rr.user_id = r.receiver_user_id
         WHERE r.sender_user_id = :sender_user_id
           AND r.expires_at > NOW()
         ORDER BY r.created_at DESC
         LIMIT 120'
    );
    $sentStmt->execute([
        'sender_user_id' => $userId,
    ]);
    $sentRows = $sentStmt->fetchAll() ?: [];

    $sent = array_map(static function (array $row): array {
        $avatar = recommendation_parse_avatar_from_profile_data($row['receiver_profile_data'] ?? '');
        return [
            'id' => (int)$row['id'],
            'receiver' => [
                'id' => (int)$row['receiver_user_id'],
                'name' => (string)($row['receiver_name'] ?? ''),
                'email' => (string)($row['receiver_email'] ?? ''),
                'avatar' => $avatar,
            ],
            'profile_id' => isset($row['profile_id']) ? (int)$row['profile_id'] : null,
            'profile_slug' => (string)($row['profile_slug'] ?? ''),
            'source_profile_name' => (string)($row['source_profile_name'] ?? ''),
            'content_type' => (string)($row['content_type'] ?? 'profile'),
            'content_uri' => (string)($row['content_uri'] ?? ''),
            'receiver_reaction' => (string)($row['receiver_reaction'] ?? ''),
            'created_at' => (string)($row['created_at'] ?? ''),
            'expires_at' => (string)($row['expires_at'] ?? ''),
        ];
    }, $sentRows);
} catch (Throwable $_e) {
    $sent = [];
}

try {
    $pendingStmt = $pdo->prepare(
        'SELECT p.user_id, p.status, p.created_at, u.name, u.email
         FROM recommendation_permissions p
         INNER JOIN users u ON u.id = p.user_id
         WHERE p.target_user_id = :user_id
           AND p.status = "pending"
         ORDER BY p.created_at DESC
         LIMIT 120'
    );
    $pendingStmt->execute(['user_id' => $userId]);
    $pendingRows = $pendingStmt->fetchAll() ?: [];

    $pending = array_map(static function (array $row): array {
        return [
            'sender_user_id' => (int)$row['user_id'],
            'sender_name' => (string)($row['name'] ?? ''),
            'sender_email' => (string)($row['email'] ?? ''),
            'status' => (string)($row['status'] ?? 'pending'),
            'created_at' => (string)($row['created_at'] ?? ''),
        ];
    }, $pendingRows);
} catch (Throwable $_e) {
    $pending = [];
}

respond([
    'ok' => true,
    'settings' => $settings,
    'inbox' => $inbox,
    'sent' => $sent,
    'pending_permissions' => $pending,
]);

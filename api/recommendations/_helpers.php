<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';

function recommendation_ensure_tables(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS recommendation_settings (
            user_id INT PRIMARY KEY,
            receive_mode ENUM('all','approved','off') NOT NULL DEFAULT 'approved',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_recommendation_settings_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE
        )"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS recommendation_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            target_user_id INT NOT NULL,
            status ENUM('pending','approved','blocked','rejected') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_recommendation_permissions_pair (user_id, target_user_id),
            INDEX idx_recommendation_permissions_target (target_user_id, status),
            CONSTRAINT fk_recommendation_permissions_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE,
            CONSTRAINT fk_recommendation_permissions_target
              FOREIGN KEY (target_user_id) REFERENCES users(id)
              ON DELETE CASCADE
        )"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS recommendations (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            sender_user_id INT NOT NULL,
            receiver_user_id INT NOT NULL,
            profile_id INT NULL,
            profile_slug VARCHAR(190) NULL,
            source_profile_name VARCHAR(160) NULL,
            content_type ENUM('profile','photo','video','reel') NOT NULL DEFAULT 'profile',
            content_uri TEXT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_recommendations_receiver (receiver_user_id, expires_at, created_at),
            INDEX idx_recommendations_sender (sender_user_id, created_at),
            CONSTRAINT fk_recommendations_sender
              FOREIGN KEY (sender_user_id) REFERENCES users(id)
              ON DELETE CASCADE,
            CONSTRAINT fk_recommendations_receiver
              FOREIGN KEY (receiver_user_id) REFERENCES users(id)
              ON DELETE CASCADE,
            CONSTRAINT fk_recommendations_profile
              FOREIGN KEY (profile_id) REFERENCES profiles(id)
              ON DELETE SET NULL
        )"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS recommendation_reactions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            recommendation_id BIGINT NOT NULL,
            user_id INT NOT NULL,
            reaction ENUM('like','fire','wow','love') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_recommendation_reactions_pair (recommendation_id, user_id),
            INDEX idx_recommendation_reactions_user (user_id),
            CONSTRAINT fk_recommendation_reactions_recommendation
              FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
              ON DELETE CASCADE,
            CONSTRAINT fk_recommendation_reactions_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE
        )"
    );
}

function recommendation_get_user(PDO $pdo, int $userId): ?array
{
    ensure_users_account_type_column($pdo);
    $sql = users_has_account_type($pdo)
        ? 'SELECT id, name, email, account_type FROM users WHERE id = :id LIMIT 1'
        : 'SELECT id, name, email, "professional" AS account_type FROM users WHERE id = :id LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['id'] = (int)$row['id'];
    $row['account_type'] = normalize_account_type($row['account_type'] ?? 'professional');
    return $row;
}

function recommendation_require_common(PDO $pdo): array
{
    $userId = require_auth();
    $user = recommendation_get_user($pdo, $userId);
    if (!$user) {
        error_response('Utilizador nao encontrado', 404);
    }
    if (($user['account_type'] ?? 'professional') !== 'common') {
        error_response('Acesso reservado a conta pessoal', 403);
    }
    return $user;
}

function recommendation_default_settings(): array
{
    return [
        'receive_mode' => 'approved',
    ];
}

function recommendation_get_settings(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT receive_mode
         FROM recommendation_settings
         WHERE user_id = :user_id
         LIMIT 1'
    );
    $stmt->execute(['user_id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return recommendation_default_settings();
    }

    $mode = strtolower((string)($row['receive_mode'] ?? 'approved'));
    if (!in_array($mode, ['all', 'approved', 'off'], true)) {
        $mode = 'approved';
    }

    return [
        'receive_mode' => $mode,
    ];
}

function recommendation_set_receive_mode(PDO $pdo, int $userId, string $mode): array
{
    $normalized = strtolower(trim($mode));
    if (!in_array($normalized, ['all', 'approved', 'off'], true)) {
        $normalized = 'approved';
    }

    $stmt = $pdo->prepare(
        'INSERT INTO recommendation_settings (user_id, receive_mode)
         VALUES (:user_id, :receive_mode)
         ON DUPLICATE KEY UPDATE receive_mode = VALUES(receive_mode)'
    );
    $stmt->execute([
        'user_id' => $userId,
        'receive_mode' => $normalized,
    ]);

    return recommendation_get_settings($pdo, $userId);
}

function recommendation_get_permission_status(PDO $pdo, int $senderUserId, int $receiverUserId): ?string
{
    $stmt = $pdo->prepare(
        'SELECT status
         FROM recommendation_permissions
         WHERE user_id = :user_id
           AND target_user_id = :target_user_id
         LIMIT 1'
    );
    $stmt->execute([
        'user_id' => $senderUserId,
        'target_user_id' => $receiverUserId,
    ]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    return strtolower((string)$row['status']);
}

function recommendation_upsert_permission(PDO $pdo, int $senderUserId, int $receiverUserId, string $status): void
{
    $normalized = strtolower(trim($status));
    if (!in_array($normalized, ['pending', 'approved', 'blocked', 'rejected'], true)) {
        $normalized = 'pending';
    }
    $stmt = $pdo->prepare(
        'INSERT INTO recommendation_permissions (user_id, target_user_id, status)
         VALUES (:user_id, :target_user_id, :status)
         ON DUPLICATE KEY UPDATE status = VALUES(status)'
    );
    $stmt->execute([
        'user_id' => $senderUserId,
        'target_user_id' => $receiverUserId,
        'status' => $normalized,
    ]);
}

function recommendation_sender_daily_count(PDO $pdo, int $senderUserId): int
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total
         FROM recommendations
         WHERE sender_user_id = :sender_user_id
           AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)'
    );
    $stmt->execute(['sender_user_id' => $senderUserId]);
    $row = $stmt->fetch();
    return (int)($row['total'] ?? 0);
}

function recommendation_resolve_profile(PDO $pdo, ?int $profileId, string $profileSlug): ?array
{
    if ($profileId && $profileId > 0) {
        $stmt = $pdo->prepare(
            'SELECT id, slug, name
             FROM profiles
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $profileId]);
        $row = $stmt->fetch();
        if ($row) {
            return [
                'id' => (int)$row['id'],
                'slug' => (string)$row['slug'],
                'name' => (string)$row['name'],
            ];
        }
    }

    if ($profileSlug !== '') {
        $stmt = $pdo->prepare(
            'SELECT id, slug, name
             FROM profiles
             WHERE slug = :slug
             LIMIT 1'
        );
        $stmt->execute(['slug' => $profileSlug]);
        $row = $stmt->fetch();
        if ($row) {
            return [
                'id' => (int)$row['id'],
                'slug' => (string)$row['slug'],
                'name' => (string)$row['name'],
            ];
        }
    }

    return null;
}

function recommendation_parse_avatar_from_profile_data($rawJson): string
{
    $decoded = json_decode((string)$rawJson, true);
    if (!is_array($decoded)) {
        return '';
    }
    $avatar = trim((string)($decoded['avatar'] ?? ''));
    return $avatar;
}

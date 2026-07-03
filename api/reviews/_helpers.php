<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';

function reviews_ensure_table(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS profile_reviews (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            profile_id INT NOT NULL,
            user_id INT NOT NULL,
            rating TINYINT NOT NULL,
            comment TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_profile_reviews_profile_user (profile_id, user_id),
            INDEX idx_profile_reviews_profile_created (profile_id, created_at),
            CONSTRAINT fk_profile_reviews_profile
              FOREIGN KEY (profile_id) REFERENCES profiles(id)
              ON DELETE CASCADE,
            CONSTRAINT fk_profile_reviews_user
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE
        )"
    );
}

function reviews_find_profile(PDO $pdo, ?int $profileId, string $slug): ?array
{
    if ($profileId && $profileId > 0) {
        $stmt = $pdo->prepare(
            'SELECT id, user_id, slug, is_published
             FROM profiles
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $profileId]);
        $row = $stmt->fetch();
        if ($row) return $row;
    }

    if ($slug !== '') {
        $stmt = $pdo->prepare(
            'SELECT id, user_id, slug, is_published
             FROM profiles
             WHERE slug = :slug
             LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        if ($row) return $row;
    }

    return null;
}

function reviews_get_user(PDO $pdo, int $userId): ?array
{
    ensure_users_account_type_column($pdo);
    $sql = users_has_account_type($pdo)
        ? 'SELECT id, name, email, account_type FROM users WHERE id = :id LIMIT 1'
        : 'SELECT id, name, email, "professional" AS account_type FROM users WHERE id = :id LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) return null;
    $row['id'] = (int)$row['id'];
    $row['account_type'] = normalize_account_type($row['account_type'] ?? 'professional');
    return $row;
}


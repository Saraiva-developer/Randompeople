<?php

declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/../config.php';
    $db = $config['db'] ?? [];

    $host = $db['host'] ?? '127.0.0.1';
    $port = (int)($db['port'] ?? 3306);
    $name = $db['name'] ?? '';
    $user = $db['user'] ?? '';
    $pass = $db['pass'] ?? '';
    $charset = $db['charset'] ?? 'utf8mb4';

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset={$charset}";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function table_has_column(PDO $pdo, string $table, string $column): bool
{
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
        return false;
    }

    $sql = 'SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table_name
              AND COLUMN_NAME = :column_name
            LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'table_name' => $table,
        'column_name' => $column,
    ]);
    return (bool)$stmt->fetch();
}

function users_has_account_type(PDO $pdo): bool
{
    return table_has_column($pdo, 'users', 'account_type');
}

function ensure_users_account_type_column(PDO $pdo): bool
{
    if (users_has_account_type($pdo)) {
        return true;
    }

    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN account_type ENUM('professional','common') NOT NULL DEFAULT 'professional' AFTER password_hash");
    } catch (Throwable $e) {
        // Ignore migration failures and continue in backward-compatible mode.
    }

    return users_has_account_type($pdo);
}

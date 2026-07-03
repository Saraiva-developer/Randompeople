<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $status = 400): void
{
    respond(['ok' => false, 'error' => $message], $status);
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        error_response('Metodo nao permitido', 405);
    }
}

function current_user_id(): ?int
{
    $id = $_SESSION['user_id'] ?? null;
    return is_numeric($id) ? (int)$id : null;
}

function require_auth(): int
{
    $id = current_user_id();
    if (!$id) {
        error_response('Nao autenticado', 401);
    }
    return $id;
}

function normalize_account_type($raw): string
{
    $value = strtolower(trim((string)$raw));
    return $value === 'common' ? 'common' : 'professional';
}

set_exception_handler(function (Throwable $e): void {
    respond([
        'ok' => false,
        'error' => 'server_error',
        'detail' => $e->getMessage(),
    ], 500);
});

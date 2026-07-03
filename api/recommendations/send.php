<?php

declare(strict_types=1);

require __DIR__ . '/_helpers.php';

require_method('POST');

$pdo = db();
recommendation_ensure_tables($pdo);
$sender = recommendation_require_common($pdo);
$senderId = (int)$sender['id'];
$input = json_input();

$recipientId = isset($input['recipient_id']) ? (int)$input['recipient_id'] : 0;
$recipientEmail = strtolower(trim((string)($input['recipient_email'] ?? '')));

if ($recipientId <= 0 && $recipientEmail === '') {
    error_response('Destinatario obrigatorio', 422);
}

if ($recipientId <= 0 && $recipientEmail !== '') {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $recipientEmail]);
    $row = $stmt->fetch();
    if (!$row) {
        error_response('Destinatario nao encontrado', 404);
    }
    $recipientId = (int)$row['id'];
}

if ($recipientId === $senderId) {
    error_response('Nao podes enviar para a tua propria conta', 422);
}

$recipient = recommendation_get_user($pdo, $recipientId);
if (!$recipient) {
    error_response('Destinatario nao encontrado', 404);
}
if (($recipient['account_type'] ?? 'professional') !== 'common') {
    error_response('O destinatario precisa de conta pessoal', 422);
}

$permissionStatus = recommendation_get_permission_status($pdo, $senderId, $recipientId);
if ($permissionStatus === 'blocked') {
    error_response('Nao tens permissao para enviar a este utilizador', 403);
}

if ($permissionStatus !== 'approved') {
    recommendation_upsert_permission($pdo, $senderId, $recipientId, 'pending');
    respond([
        'ok' => false,
        'error' => 'permission_required',
        'message' => 'Pedido de permissao enviado',
    ], 403);
}

$contentType = strtolower(trim((string)($input['content_type'] ?? 'profile')));
if (!in_array($contentType, ['profile', 'photo', 'video', 'reel'], true)) {
    error_response('Tipo de conteudo invalido', 422);
}

$profileId = isset($input['profile_id']) ? (int)$input['profile_id'] : 0;
$profileSlug = strtolower(trim((string)($input['profile_slug'] ?? '')));
$sourceProfileName = trim((string)($input['source_profile_name'] ?? ''));
$contentUri = trim((string)($input['content_uri'] ?? ''));

$resolvedProfile = recommendation_resolve_profile($pdo, $profileId > 0 ? $profileId : null, $profileSlug);
if ($resolvedProfile) {
    $profileId = (int)$resolvedProfile['id'];
    $profileSlug = (string)$resolvedProfile['slug'];
    if ($sourceProfileName === '') {
        $sourceProfileName = (string)$resolvedProfile['name'];
    }
}

if ($contentType !== 'profile' && $contentUri === '') {
    error_response('content_uri obrigatorio para este tipo', 422);
}

if ($contentType === 'profile' && $profileId <= 0 && $profileSlug === '' && $sourceProfileName === '') {
    error_response('Perfil de origem obrigatorio', 422);
}

$insert = $pdo->prepare(
    'INSERT INTO recommendations (
        sender_user_id,
        receiver_user_id,
        profile_id,
        profile_slug,
        source_profile_name,
        content_type,
        content_uri,
        expires_at
     ) VALUES (
        :sender_user_id,
        :receiver_user_id,
        :profile_id,
        :profile_slug,
        :source_profile_name,
        :content_type,
        :content_uri,
        DATE_ADD(NOW(), INTERVAL 24 HOUR)
     )'
);
$insert->execute([
    'sender_user_id' => $senderId,
    'receiver_user_id' => $recipientId,
    'profile_id' => $profileId > 0 ? $profileId : null,
    'profile_slug' => $profileSlug !== '' ? $profileSlug : null,
    'source_profile_name' => $sourceProfileName !== '' ? $sourceProfileName : null,
    'content_type' => $contentType,
    'content_uri' => $contentUri !== '' ? $contentUri : null,
]);

$recommendationId = (int)$pdo->lastInsertId();

respond([
    'ok' => true,
    'recommendation_id' => $recommendationId,
]);

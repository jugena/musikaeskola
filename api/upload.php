<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_start();
function uploadResponse(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') uploadResponse(405, ['ok' => false, 'error' => 'method_not_allowed']);
if (($_SESSION['musika_admin'] ?? false) !== true) uploadResponse(401, ['ok' => false, 'error' => 'authentication_required']);
session_write_close();
$file = $_FILES['file'] ?? null;
if (!$file || !is_int($file['error'] ?? null)) uploadResponse(400, ['ok' => false, 'error' => 'missing_file_or_server_limit']);
if ($file['error'] !== UPLOAD_ERR_OK) uploadResponse(400, ['ok' => false, 'error' => 'upload_error_' . $file['error']]);
$kind = $_POST['kind'] ?? '';
$limit = $kind === 'audio' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
if ($file['size'] <= 0 || $file['size'] > $limit) uploadResponse(400, ['ok' => false, 'error' => 'file_too_large_or_empty']);
$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($kind === 'audio') {
    if ($extension !== 'mp3') uploadResponse(400, ['ok' => false, 'error' => 'invalid_mp3']);
    // Recognise ID3 tags or an MPEG audio frame; never trust the browser MIME type.
    $handle = fopen($file['tmp_name'], 'rb');
    $head = $handle ? fread($handle, 3) : '';
    if ($handle) fclose($handle);
    if (substr($head, 0, 3) !== 'ID3' && !(strlen($head) >= 2 && ord($head[0]) === 255 && (ord($head[1]) & 224) === 224)) {
        uploadResponse(400, ['ok' => false, 'error' => 'invalid_mp3']);
    }
    $relative = 'audio/podcasts/';
} elseif ($kind === 'cover') {
    $info = @getimagesize($file['tmp_name']);
    $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$info || !isset($types[$info['mime']])) uploadResponse(400, ['ok' => false, 'error' => 'invalid_image']);
    $extension = $types[$info['mime']];
    $relative = 'img/podcasts/';
} else uploadResponse(400, ['ok' => false, 'error' => 'invalid_kind']);
$directory = dirname(__DIR__) . '/' . $relative;
if ((!is_dir($directory) && !mkdir($directory, 0755, true)) || !is_writable($directory)) {
    uploadResponse(500, ['ok' => false, 'error' => 'upload_directory_not_writable']);
}
$path = $relative . bin2hex(random_bytes(16)) . '.' . $extension;
if (!move_uploaded_file($file['tmp_name'], dirname(__DIR__) . '/' . $path)) uploadResponse(500, ['ok' => false, 'error' => 'upload_failed']);
uploadResponse(201, ['ok' => true, 'path' => $path]);

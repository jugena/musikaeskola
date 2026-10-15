<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'httponly' => true,
    'secure' => $isHttps,
    'samesite' => 'Strict',
    'path' => '/',
]);
session_start();

const DEFAULT_PASSWORD_HASH = '64b2f62a1e902237be9e26eac2958d49105bb162ad356b6ced7029a1f76425d7';

$collections = [
    'news' => 'news.json',
    'subjects' => 'subjects.json',
    'teachers' => 'teachers.json',
    'events' => 'events.json',
    'posts' => 'posts.json',
    'podcasts' => 'podcasts.json',
    'menu' => 'menu.json',
    'calendar' => 'calendar.json',
];

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '' || strlen($raw) > 10 * 1024 * 1024) {
        respond(400, ['ok' => false, 'error' => 'invalid_body']);
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['ok' => false, 'error' => 'invalid_json']);
    }
    return $decoded;
}

function isAuthenticated(): bool
{
    return isset($_SESSION['musika_admin']) && $_SESSION['musika_admin'] === true;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($action === 'status' && $method === 'GET') {
    respond(200, ['ok' => true, 'authenticated' => isAuthenticated()]);
}

if ($action === 'login' && $method === 'POST') {
    $body = readJsonBody();
    $password = isset($body['password']) ? (string) $body['password'] : '';
    $configuredHash = getenv('MUSIKA_ADMIN_PASSWORD_HASH') ?: DEFAULT_PASSWORD_HASH;

    if (!hash_equals($configuredHash, hash('sha256', $password))) {
        usleep(350000);
        respond(401, ['ok' => false, 'error' => 'invalid_credentials']);
    }

    session_regenerate_id(true);
    $_SESSION['musika_admin'] = true;
    respond(200, ['ok' => true, 'authenticated' => true]);
}

if ($action === 'logout' && $method === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(200, ['ok' => true, 'authenticated' => false]);
}

$collection = $_GET['collection'] ?? '';
if (!isset($collections[$collection])) {
    respond(404, ['ok' => false, 'error' => 'unknown_collection']);
}

$dataDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
$filePath = $dataDirectory . DIRECTORY_SEPARATOR . $collections[$collection];

if ($method === 'GET') {
    if (!is_file($filePath)) {
        respond(200, ['ok' => true, 'data' => [], 'revision' => hash('sha256', '')]);
    }

    $contents = file_get_contents($filePath);
    $data = $contents === false ? null : json_decode($contents, true);
    if ($data === null && trim((string) $contents) !== 'null') {
        respond(500, ['ok' => false, 'error' => 'invalid_data_file']);
    }
    $revision = hash('sha256', (string) $contents);
    if ($collection === 'podcasts' && (!isAuthenticated() || ($_GET['admin'] ?? '') !== '1')) {
        if (!is_array($data)) respond(500, ['ok' => false, 'error' => 'invalid_data_file']);
        $today = (new DateTimeImmutable('now', new DateTimeZone('Europe/Madrid')))->format('Y-m-d');
        $data = array_values(array_filter($data ?? [], static function ($item) use ($today) {
            return is_array($item) && ($item['published'] ?? false) === true && ($item['date'] ?? '') <= $today;
        }));
    }
    respond(200, ['ok' => true, 'data' => $data, 'revision' => $revision]);
}

if ($method !== 'PUT') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

if (!isAuthenticated()) {
    respond(401, ['ok' => false, 'error' => 'authentication_required']);
}

$body = readJsonBody();
if (!array_key_exists('data', $body) || !is_array($body['data'])) {
    respond(400, ['ok' => false, 'error' => 'invalid_collection_data']);
}

$data = $body['data'];
if ($collection === 'podcasts') {
    $ids = [];
    foreach ($data as $item) {
        if (!is_array($item) || !is_string($item['id'] ?? null) || !preg_match('/^[a-zA-Z0-9_-]+$/', $item['id']) || isset($ids[$item['id']])) {
            respond(400, ['ok' => false, 'error' => 'invalid_podcast_id']);
        }
        $ids[$item['id']] = true;
        foreach (['title', 'title_eu', 'description', 'description_eu', 'keywords', 'keywords_eu', 'date', 'episode', 'cover', 'audio_url'] as $field) {
            if (!is_string($item[$field] ?? null)) respond(400, ['ok' => false, 'error' => 'invalid_podcast_field']);
        }
        foreach (['title', 'title_eu', 'description', 'description_eu'] as $field) {
            if (trim($item[$field]) === '') respond(400, ['ok' => false, 'error' => 'missing_podcast_text']);
        }
        if ($item['episode'] !== '' && !preg_match('/^[1-9][0-9]*$/', $item['episode'])) respond(400, ['ok' => false, 'error' => 'invalid_episode_number']);
        $audioPath = parse_url($item['audio_url'], PHP_URL_PATH);
        if (!is_bool($item['published'] ?? null) || !$audioPath || !preg_match('/\.mp3$/i', $audioPath) || preg_match('/[\\\\\x00-\x1f]/', $item['audio_url']) || preg_match('/^(?!https?:)[a-z][a-z0-9+.-]*:/i', $item['audio_url'])) {
            respond(400, ['ok' => false, 'error' => 'invalid_podcast_audio']);
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $item['date']);
        if (!$date || $date->format('Y-m-d') !== $item['date']) respond(400, ['ok' => false, 'error' => 'invalid_podcast_date']);
    }
}
$expectsObject = in_array($collection, ['menu', 'calendar'], true);
if (!$expectsObject && array_keys($data) !== range(0, count($data) - 1) && $data !== []) {
    respond(400, ['ok' => false, 'error' => 'collection_must_be_a_list']);
}

$encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false) {
    respond(400, ['ok' => false, 'error' => 'encoding_failed']);
}

if (!is_dir($dataDirectory) || !is_writable($dataDirectory)) {
    respond(500, ['ok' => false, 'error' => 'data_directory_not_writable']);
}

// A separate lock keeps concurrent editors from silently replacing newer content.
$lock = fopen($filePath . '.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) respond(500, ['ok' => false, 'error' => 'lock_failed']);
$current = is_file($filePath) ? file_get_contents($filePath) : '';
if ($collection === 'podcasts' && (!isset($body['revision']) || !hash_equals(hash('sha256', (string) $current), (string) $body['revision']))) {
    respond(409, ['ok' => false, 'error' => 'content_changed_reload']);
}
$temporary = tempnam($dataDirectory, 'content-');
if ($temporary) chmod($temporary, is_file($filePath) ? (fileperms($filePath) & 0777) : 0644);
if (!$temporary || file_put_contents($temporary, $encoded . PHP_EOL) === false || !rename($temporary, $filePath)) {
    if ($temporary && is_file($temporary)) unlink($temporary);
    respond(500, ['ok' => false, 'error' => 'write_failed']);
}
flock($lock, LOCK_UN);
fclose($lock);

respond(200, ['ok' => true, 'data' => $data, 'revision' => hash('sha256', $encoded . PHP_EOL)]);


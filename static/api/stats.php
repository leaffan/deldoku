<?php
// Stats API for DELDoku
//
// GET  api/stats.php[?date=YYYY-MM-DD]          Public daily values (aggregates only)
// GET  api/stats.php?userId=<id>                 Own stats, X-DelDoku-Token header required
// POST api/stats.php {date, selections[, userId]} Submit a game; without userId a new user is created
// DELETE api/stats.php?userId=<id>               Delete own account including games, X-DelDoku-Token header required
//
// Requires PHP 8.0 or newer (str_ends_with); production and CI run on PHP 8.2.

const MAX_BODY_BYTES = 8192;
const MAX_GAMES_PER_DAY = 20;
const HISTORY_LIMIT = 100;
const WIN_BONUS = 100;
const MAX_SCORE_PER_DAY = 1000; // 9 cells at 100 points each plus win bonus
const CELL_KEYS = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];
const DEFAULT_REGISTRATION_LIMIT = 20; // new users per IP and UTC day
const RETENTION_MONTHS = 12; // accounts without a game in this period are deleted

// --- Only for the API tests (tests/api): never set on the server ---
// DELDOKU_TEST_TODAY               fixed "today" (YYYY-MM-DD), so tests do not break across midnight
// DELDOKU_TEST_REGISTRATION_LIMIT  separate limit for new users, since all tests come from one IP
function testSetting($name) {
    $value = getenv($name);
    return $value === false || $value === '' ? null : $value;
}

function registrationLimit() {
    $env = testSetting('DELDOKU_TEST_REGISTRATION_LIMIT');
    return ($env !== null && ctype_digit($env)) ? (int)$env : DEFAULT_REGISTRATION_LIMIT;
}

function respond($status, $data) {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Each instance has its own data next to the instance directory: deldoku/ -> data/, deldoku_tst/ -> data_tst/
function dataDir() {
    $suffix = str_ends_with(basename(dirname(__DIR__)), '_tst') ? '_tst' : '';
    return __DIR__ . "/../../data$suffix";
}

function ensureDataDirs() {
    $dir = dataDir();
    // is_dir() after mkdir(), in case a parallel request just created the directory
    if (!is_dir($dir . '/users') && !@mkdir($dir . '/users', 0755, true) && !is_dir($dir . '/users')) {
        respond(500, ['error' => 'could not create data directory']);
    }
    // data/ may live in the document root; contains token hashes and raw data
    if (!file_exists($dir . '/.htaccess') && @file_put_contents($dir . '/.htaccess', "Require all denied\n") === false) {
        respond(500, ['error' => 'could not protect data directory']);
    }
}

// Only allow real calendar dates in YYYY-MM-DD format, since the value goes into the file path
function isValidChallengeDate($challengeDate) {
    if (!is_string($challengeDate)) {
        return false;
    }
    if (!preg_match('/\A(\d{4})-(\d{2})-(\d{2})\z/', $challengeDate, $m)) {
        return false;
    }
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

// User IDs also go into the file path
function isValidUserId($userId) {
    return is_string($userId) && preg_match('/\Au_[0-9a-f]{16}\z/', $userId) === 1;
}

// Player IDs contain dots, %-encoding and non-ASCII characters; they only end up in JSON, never in paths
function isValidPlayerId($playerId) {
    return is_string($playerId) && strlen($playerId) <= 80
        && preg_match('/\A\d+\/[^\s\x00-\x1F\x7F]+\z/u', $playerId) === 1;
}

// Players are compared only by their numeric Eliteprospects ID (the number before the "/"); the name part is just for readability
// and is not always encoded the same in the player list and the challenges (e.g. "krauß" vs. "krauÃŸ")
function epId($playerId) {
    $pos = strpos($playerId, '/');
    return $pos === false ? $playerId : substr($playerId, 0, $pos);
}

// The challenge's spelling for the player, or null if the player is not valid in the cell
function matchAnswer($playerId, $valid) {
    $epId = epId($playerId);
    foreach ($valid as $answer) {
        if (is_string($answer) && epId($answer) === $epId) {
            return $answer;
        }
    }
    return null;
}

function utcToday() {
    $fixed = testSetting('DELDOKU_TEST_TODAY');
    return ($fixed !== null && isValidChallengeDate($fixed)) ? $fixed : gmdate('Y-m-d');
}

function previousDate($date) {
    return gmdate('Y-m-d', strtotime($date . ' 00:00:00 UTC') - 86400);
}

function readJsonFile($path, $default) {
    if (!file_exists($path)) {
        return $default;
    }
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) {
        // Do not overwrite the file, or data is lost
        respond(500, ['error' => 'corrupt data file']);
    }
    return $data;
}

function writeJsonFileAtomic($path, $data) {
    $tmp = $path . '.tmp' . getmypid();
    if (file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false
        || !rename($tmp, $path)) {
        @unlink($tmp);
        respond(500, ['error' => 'could not write data']);
    }
}

function withLock($fn) {
    $fh = fopen(dataDir() . '/.lock', 'c');
    if ($fh === false || !flock($fh, LOCK_EX)) {
        respond(500, ['error' => 'could not acquire lock']);
    }
    try {
        return $fn();
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function userFile($userId) {
    return dataDir() . "/users/$userId.json";
}

// Count the fallback challenge separately: same cell names, but different categories than the daily challenge
function dayFile($date, $fallback = false) {
    return dataDir() . "/day_$date" . ($fallback ? '_fallback' : '') . '.json';
}

// Only "fallback" or no value is allowed
function parseChallengeParam($value) {
    if ($value === null) {
        return false;
    }
    if ($value !== 'fallback') {
        respond(400, ['error' => 'invalid challenge']);
    }
    return true;
}

function emptyDay($date) {
    return ['date' => $date, 'games' => 0, 'sumCorrect' => 0, 'sumScore' => 0, 'cells' => []];
}

function logLine($data) {
    return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
}

// Only the hash, never the token itself
function registrationLogEntry($user) {
    return [
        'type' => 'register',
        'userId' => $user['userId'],
        'tokenHash' => $user['tokenHash'],
        'created' => $user['created'],
    ];
}

function rateLimitFile($date) {
    return dataDir() . "/ratelimit_$date.json";
}

// Store IPs only as HMAC with a daily new key, so they cannot be tracked across days
function loadRateLimit() {
    $today = utcToday();
    $path = rateLimitFile($today);
    if (!file_exists($path)) {
        // Keep only today and yesterday
        $yesterday = previousDate($today);
        foreach (glob(dataDir() . '/ratelimit_*.json') as $old) {
            $date = substr(basename($old, '.json'), strlen('ratelimit_'));
            if ($date !== $today && $date !== $yesterday) {
                @unlink($old);
            }
        }
        return ['path' => $path, 'data' => ['secret' => bin2hex(random_bytes(32)), 'counts' => []]];
    }
    return ['path' => $path, 'data' => readJsonFile($path, null)];
}

function clientKey($rateLimit) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    return hash_hmac('sha256', $ip, $rateLimit['data']['secret']);
}

function requestToken() {
    return isset($_SERVER['HTTP_X_DELDOKU_TOKEN']) ? (string)$_SERVER['HTTP_X_DELDOKU_TOKEN'] : '';
}

function authenticate($userId) {
    if (!isValidUserId($userId)) {
        respond(400, ['error' => 'invalid userId']);
    }
    $token = requestToken();
    $user = readJsonFile(userFile($userId), null);
    if ($user === null || $token === '' || !isset($user['tokenHash']) || !is_string($user['tokenHash'])
        || !hash_equals($user['tokenHash'], hash('sha256', $token))) {
        respond(401, ['error' => 'invalid credentials']);
    }
    return $user;
}

function logFile() {
    return dataDir() . '/games.jsonl';
}

// Removes user files and their lines in the game log. Call only inside withLock().
function deleteUsers($userIds) {
    if (count($userIds) === 0) {
        return;
    }
    $remove = array_flip($userIds);
    $log = logFile();
    if (file_exists($log)) {
        $in = fopen($log, 'r');
        $tmp = $log . '.tmp' . getmypid();
        $out = fopen($tmp, 'w');
        if ($in === false || $out === false) {
            respond(500, ['error' => 'could not write data']);
        }
        while (($line = fgets($in)) !== false) {
            $entry = json_decode($line, true);
            // Keep unreadable lines instead of silently losing them
            if (is_array($entry) && isset($entry['userId']) && isset($remove[$entry['userId']])) {
                continue;
            }
            if (fwrite($out, $line) === false) {
                respond(500, ['error' => 'could not write data']);
            }
        }
        fclose($in);
        if (!fclose($out) || !rename($tmp, $log)) {
            @unlink($tmp);
            respond(500, ['error' => 'could not write data']);
        }
    }
    foreach ($userIds as $userId) {
        if (file_exists(userFile($userId)) && !unlink(userFile($userId))) {
            respond(500, ['error' => 'could not delete data']);
        }
    }
}

// Point in time from which an account counts as expired: RETENTION_MONTHS before today (UTC)
function retentionCutoff() {
    return gmdate('c', strtotime(utcToday() . ' 00:00:00 UTC -' . RETENTION_MONTHS . ' months'));
}

// Whether an account has not played since the cutoff (ISO-8601, UTC)
function isExpired($user, $cutoff) {
    $games = isset($user['games']) && is_array($user['games']) ? $user['games'] : [];
    $lastPlayed = end($games);
    $activity = $lastPlayed !== false && isset($lastPlayed['timestamp']) ? $lastPlayed['timestamp'] : (isset($user['created']) ? $user['created'] : null);
    return is_string($activity) && $activity < $cutoff;
}

// Once per UTC day on the first API call: delete expired accounts
function expireInactiveUsers() {
    $today = utcToday();
    $marker = dataDir() . '/expired_until';
    if (file_exists($marker) && trim(file_get_contents($marker)) === $today) {
        return;
    }
    withLock(function () use ($marker, $today) {
        // Check again: a parallel request may already have cleaned up
        if (file_exists($marker) && trim(file_get_contents($marker)) === $today) {
            return;
        }
        $cutoff = retentionCutoff();
        $expired = [];
        foreach (glob(dataDir() . '/users/u_*.json') as $path) {
            $user = json_decode(file_get_contents($path), true);
            // Leave corrupt files alone; they surface with a 500 on access anyway
            if (is_array($user) && isset($user['userId']) && isValidUserId($user['userId']) && isExpired($user, $cutoff)) {
                $expired[] = $user['userId'];
            }
        }
        deleteUsers($expired);
        if (file_put_contents($marker, $today) === false) {
            respond(500, ['error' => 'could not write data']);
        }
    });
}

// Returns [answers, isFallback]. Without a daily file the fallback challenge applies, as in the client.
// The client sends "fallback" so a daily challenge uploaded later is not scored incorrectly.
function loadChallengeAnswers($date, $wantFallback) {
    $path = __DIR__ . "/../challenges/$date.json";
    $isFallback = $wantFallback || !file_exists($path);
    if ($isFallback) {
        $path = __DIR__ . '/../challenges/fallback.json';
    }
    if (!file_exists($path)) {
        respond(404, ['error' => 'challenge not found']);
    }
    $challenge = json_decode(file_get_contents($path), true);
    if (!is_array($challenge) || !isset($challenge['answers']) || !is_array($challenge['answers'])) {
        respond(500, ['error' => 'invalid challenge file']);
    }
    return [$challenge['answers'], $isFallback];
}

// Rarity points: 100 * (1 - share of this player among all answers in the cell), at least 10
function cellScore($cellCounts, $playerId) {
    $total = array_sum($cellCounts);
    if ($total === 0) {
        return 100;
    }
    $usage = isset($cellCounts[$playerId]) ? $cellCounts[$playerId] : 0;
    return max(10, (int)round(100 * (1 - $usage / $total)));
}

function computeSummary($user) {
    $games = $user['games'];
    $byDate = [];
    $gamesWon = 0;
    foreach ($games as $g) {
        if ($g['won']) {
            $gamesWon++;
        }
        $d = $g['date'];
        if (!isset($byDate[$d])) {
            $byDate[$d] = ['best' => 0, 'won' => false];
        }
        $byDate[$d]['best'] = max($byDate[$d]['best'], $g['score']);
        $byDate[$d]['won'] = $byDate[$d]['won'] || $g['won'];
    }
    ksort($byDate);
    $dates = array_keys($byDate);

    $longest = 0;
    $run = 0;
    $prev = null;
    foreach ($dates as $d) {
        $run = ($prev !== null && previousDate($d) === $prev) ? $run + 1 : 1;
        $longest = max($longest, $run);
        $prev = $d;
    }

    // The current streak only continues if the user played today or yesterday
    $current = 0;
    $cursor = utcToday();
    if (!isset($byDate[$cursor])) {
        $cursor = previousDate($cursor);
    }
    while (isset($byDate[$cursor])) {
        $current++;
        $cursor = previousDate($cursor);
    }

    $totalPoints = 0;
    $daysWon = 0;
    foreach ($byDate as $day) {
        $totalPoints += $day['best'];
        if ($day['won']) {
            $daysWon++;
        }
    }

    $history = array_slice($games, -HISTORY_LIMIT);
    return [
        'totalGames' => count($games),
        'gamesWon' => $gamesWon,
        'lastPlayedDate' => count($games) > 0 ? $games[count($games) - 1]['timestamp'] : '',
        'daysPlayed' => count($byDate),
        'daysWon' => $daysWon,
        'totalPoints' => $totalPoints,
        // Share of the possible points, based on the days played
        'pointsPercent' => count($byDate) > 0 ? round($totalPoints / (count($byDate) * MAX_SCORE_PER_DAY) * 100, 1) : null,
        'currentStreak' => $current,
        'longestStreak' => $longest,
        'gameHistory' => array_map(function ($g) {
            return [
                'timestamp' => $g['timestamp'],
                'date' => $g['date'],
                'won' => $g['won'],
                'playerSelections' => (object)$g['playerSelections'],
                'score' => $g['score'],
                'cellScores' => (object)$g['cellScores'],
            ];
        }, $history),
    ];
}

function publicDayStats($day) {
    $cells = [];
    foreach ($day['cells'] as $key => $counts) {
        $cells[$key] = (object)$counts;
    }
    return [
        'date' => $day['date'],
        'games' => $day['games'],
        'avgCorrect' => $day['games'] > 0 ? $day['sumCorrect'] / $day['games'] : null,
        'avgScore' => $day['games'] > 0 ? $day['sumScore'] / $day['games'] : null,
        'cells' => (object)$cells,
    ];
}

function parseSelections($raw) {
    if (!is_array($raw)) {
        respond(400, ['error' => 'invalid selections']);
    }
    foreach (array_keys($raw) as $key) {
        if (!in_array($key, CELL_KEYS, true)) {
            respond(400, ['error' => 'invalid selections']);
        }
    }
    $selections = [];
    $used = [];
    foreach (CELL_KEYS as $key) {
        $playerId = isset($raw[$key]) ? $raw[$key] : '';
        if ($playerId !== '' && !isValidPlayerId($playerId)) {
            respond(400, ['error' => 'invalid selections']);
        }
        if ($playerId !== '') {
            $epId = epId($playerId);
            if (isset($used[$epId])) {
                respond(400, ['error' => 'player used more than once']);
            }
            $used[$epId] = true;
        }
        $selections[$key] = $playerId;
    }
    return $selections;
}

function handleGet() {
    if (isset($_GET['userId'])) {
        $user = authenticate($_GET['userId']);
        respond(200, ['userId' => $user['userId'], 'stats' => computeSummary($user)]);
    }
    $date = isset($_GET['date']) ? $_GET['date'] : (isset($_GET['challengeDate']) ? $_GET['challengeDate'] : utcToday());
    if (!isValidChallengeDate($date)) {
        respond(400, ['error' => 'invalid date']);
    }
    $fallback = parseChallengeParam(isset($_GET['challenge']) ? $_GET['challenge'] : null);
    respond(200, publicDayStats(readJsonFile(dayFile($date, $fallback), emptyDay($date))));
}

function handlePost() {
    $raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
    if ($raw === false || strlen($raw) > MAX_BODY_BYTES) {
        respond(413, ['error' => 'request too large']);
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        respond(400, ['error' => 'invalid JSON']);
    }

    $date = isset($body['date']) ? $body['date'] : null;
    if (!isValidChallengeDate($date)) {
        respond(400, ['error' => 'invalid date']);
    }
    // Allow today and yesterday (UTC), so a tab left open past midnight can still submit
    $today = utcToday();
    if ($date !== $today && $date !== previousDate($today)) {
        respond(400, ['error' => 'date not playable']);
    }
    $selections = parseSelections(isset($body['selections']) ? $body['selections'] : null);
    $wantFallback = parseChallengeParam(isset($body['challenge']) ? $body['challenge'] : null);
    list($answers, $fallback) = loadChallengeAnswers($date, $wantFallback);
    // "Player already used" marker also kept separately for the fallback challenge
    $seenKey = $fallback ? "$date:fallback" : $date;

    $result = withLock(function () use ($body, $date, $selections, $answers, $fallback, $seenKey) {
        $newToken = null;
        $rateLimit = null;
        if (isset($body['userId'])) {
            $user = authenticate($body['userId']);
        } else {
            $rateLimit = loadRateLimit();
            $ipKey = clientKey($rateLimit);
            $registered = isset($rateLimit['data']['counts'][$ipKey]) ? $rateLimit['data']['counts'][$ipKey] : 0;
            if ($registered >= registrationLimit()) {
                respond(429, ['error' => 'registration limit reached']);
            }
            $newToken = bin2hex(random_bytes(32));
            $user = [
                'userId' => 'u_' . bin2hex(random_bytes(8)),
                'tokenHash' => hash('sha256', $newToken),
                'created' => gmdate('c'),
                'games' => [],
                'seen' => [],
            ];
        }

        $gamesToday = 0;
        foreach ($user['games'] as $g) {
            if ($g['date'] === $date) {
                $gamesToday++;
            }
        }
        if ($gamesToday >= MAX_GAMES_PER_DAY) {
            respond(429, ['error' => 'daily game limit reached']);
        }

        $day = readJsonFile(dayFile($date, $fallback), emptyDay($date));
        $cellScores = [];
        $correct = 0;
        $score = 0;
        foreach (CELL_KEYS as $key) {
            $playerId = $selections[$key];
            list($row, $col) = array_map('intval', explode('-', $key));
            $valid = isset($answers[$row][$col]) && is_array($answers[$row][$col]) ? $answers[$row][$col] : [];
            $match = $playerId === '' ? null : matchAnswer($playerId, $valid);
            if ($match === null) {
                $cellScores[$key] = 0;
                continue;
            }
            // From here on the challenge's spelling applies, so a different name part does not get
            // its own count (and thus full rarity points)
            $playerId = $match;
            $selections[$key] = $match;
            $counts = isset($day['cells'][$key]) ? $day['cells'][$key] : [];
            // Compute points against the state before this game
            $cellScores[$key] = cellScore($counts, $playerId);
            $score += $cellScores[$key];
            $correct++;
        }
        $won = $correct === 9;
        if ($won) {
            $score += WIN_BONUS;
        }

        // Each player counts only once per user and cell in the rarity count
        foreach (CELL_KEYS as $key) {
            $playerId = $selections[$key];
            if ($cellScores[$key] === 0) {
                continue;
            }
            $seen = isset($user['seen'][$seenKey][$key]) ? $user['seen'][$seenKey][$key] : [];
            if (!in_array($playerId, $seen, true)) {
                $user['seen'][$seenKey][$key] = array_merge($seen, [$playerId]);
                $day['cells'][$key][$playerId] = (isset($day['cells'][$key][$playerId]) ? $day['cells'][$key][$playerId] : 0) + 1;
            }
        }
        $day['games']++;
        $day['sumCorrect'] += $correct;
        $day['sumScore'] += $score;

        $entry = [
            'timestamp' => gmdate('c'),
            'date' => $date,
            'won' => $won,
            'correct' => $correct,
            'playerSelections' => $selections,
            'score' => $score,
            'cellScores' => $cellScores,
        ];
        if ($fallback) {
            $entry['challenge'] = 'fallback';
        }
        $user['games'][] = $entry;

        // Complete log from which user and daily files can be rebuilt.
        // Registration before the first game, so a rebuild can keep the credentials (tokenHash).
        $logLines = '';
        if ($newToken !== null) {
            $logLines .= logLine(registrationLogEntry($user));
        }
        $logLines .= logLine(['type' => 'game', 'userId' => $user['userId']] + $entry);
        if (file_put_contents(logFile(), $logLines, FILE_APPEND) === false) {
            respond(500, ['error' => 'could not write data']);
        }
        writeJsonFileAtomic(dayFile($date, $fallback), $day);
        writeJsonFileAtomic(userFile($user['userId']), $user);
        if ($rateLimit !== null) {
            // Count only after a successful save
            $rateLimit['data']['counts'][$ipKey] = $registered + 1;
            writeJsonFileAtomic($rateLimit['path'], $rateLimit['data']);
        }

        $response = [
            'userId' => $user['userId'],
            'game' => [
                'date' => $date,
                'won' => $won,
                'correct' => $correct,
                'score' => $score,
                'cellScores' => (object)$cellScores,
            ] + ($fallback ? ['challenge' => 'fallback'] : []),
            'stats' => computeSummary($user),
        ];
        if ($newToken !== null) {
            $response['token'] = $newToken;
        }
        return $response;
    });
    respond(200, $result);
}

function handleDelete() {
    $userId = isset($_GET['userId']) ? $_GET['userId'] : null;
    withLock(function () use ($userId) {
        $user = authenticate($userId);
        deleteUsers([$user['userId']]);
    });
    respond(200, ['deleted' => true]);
}

ensureDataDirs();
expireInactiveUsers();

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($method === 'GET') {
    handleGet();
} elseif ($method === 'POST') {
    handlePost();
} elseif ($method === 'DELETE') {
    handleDelete();
}
respond(405, ['error' => 'method not allowed']);

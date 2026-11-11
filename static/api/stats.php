<?php
// Stats API für DELDoku
//
// GET  api/stats.php[?date=YYYY-MM-DD]          Öffentliche Tageswerte (nur Aggregate)
// GET  api/stats.php?userId=<id>                 Eigene Stats, Header X-DelDoku-Token erforderlich
// POST api/stats.php {date, selections[, userId]} Spiel absenden; ohne userId wird ein neuer Nutzer angelegt
//
// Bewusst PHP-7.4-kompatibel gehalten.

const MAX_BODY_BYTES = 8192;
const MAX_GAMES_PER_DAY = 20;
const HISTORY_LIMIT = 100;
const WIN_BONUS = 100;
const CELL_KEYS = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];

function respond($status, $data) {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function dataDir() {
    return __DIR__ . '/../../data';
}

function ensureDataDirs() {
    $dir = dataDir();
    if (!is_dir($dir . '/users')) {
        mkdir($dir . '/users', 0755, true);
    }
    // data/ kann im Document Root liegen; enthält Token-Hashes und Rohdaten
    if (!file_exists($dir . '/.htaccess')) {
        file_put_contents($dir . '/.htaccess', "Require all denied\n");
    }
}

// Nur echte Kalenderdaten im Format YYYY-MM-DD zulassen, da der Wert in den Dateipfad eingeht
function isValidChallengeDate($challengeDate) {
    if (!is_string($challengeDate)) {
        return false;
    }
    if (!preg_match('/\A(\d{4})-(\d{2})-(\d{2})\z/', $challengeDate, $m)) {
        return false;
    }
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
}

// Nutzer-IDs gehen ebenfalls in den Dateipfad ein
function isValidUserId($userId) {
    return is_string($userId) && preg_match('/\Au_[0-9a-f]{16}\z/', $userId) === 1;
}

function isValidPlayerId($playerId) {
    return is_string($playerId) && strlen($playerId) <= 80
        && preg_match('/\A\d+\/[a-z0-9-]+\z/', $playerId) === 1;
}

function utcToday() {
    return gmdate('Y-m-d');
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
        // Datei nicht überschreiben, sonst gehen Daten verloren
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

function dayFile($date) {
    return dataDir() . "/day_$date.json";
}

function emptyDay($date) {
    return ['date' => $date, 'games' => 0, 'sumCorrect' => 0, 'sumScore' => 0, 'cells' => []];
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
    if ($user === null || $token === '' || !hash_equals($user['tokenHash'], hash('sha256', $token))) {
        respond(401, ['error' => 'invalid credentials']);
    }
    return $user;
}

function loadChallengeAnswers($date) {
    $path = __DIR__ . "/../challenges/$date.json";
    if (!file_exists($path)) {
        respond(404, ['error' => 'challenge not found']);
    }
    $challenge = json_decode(file_get_contents($path), true);
    if (!is_array($challenge) || !isset($challenge['answers']) || !is_array($challenge['answers'])) {
        respond(500, ['error' => 'invalid challenge file']);
    }
    return $challenge['answers'];
}

// Seltenheitspunkte: 100 * (1 - Anteil dieses Spielers an allen Antworten der Zelle), mindestens 10
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

    // Aktueller Streak läuft nur weiter, wenn heute oder gestern gespielt wurde
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
            if (isset($used[$playerId])) {
                respond(400, ['error' => 'player used more than once']);
            }
            $used[$playerId] = true;
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
    respond(200, publicDayStats(readJsonFile(dayFile($date), emptyDay($date))));
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
    // Heute und gestern (UTC) zulassen, damit ein über Mitternacht offener Tab noch absenden kann
    $today = utcToday();
    if ($date !== $today && $date !== previousDate($today)) {
        respond(400, ['error' => 'date not playable']);
    }
    $selections = parseSelections(isset($body['selections']) ? $body['selections'] : null);
    $answers = loadChallengeAnswers($date);

    $result = withLock(function () use ($body, $date, $selections, $answers) {
        $newToken = null;
        if (isset($body['userId'])) {
            $user = authenticate($body['userId']);
        } else {
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

        $day = readJsonFile(dayFile($date), emptyDay($date));
        $cellScores = [];
        $correct = 0;
        $score = 0;
        foreach (CELL_KEYS as $key) {
            $playerId = $selections[$key];
            list($row, $col) = array_map('intval', explode('-', $key));
            $valid = isset($answers[$row][$col]) && is_array($answers[$row][$col]) ? $answers[$row][$col] : [];
            if ($playerId === '' || !in_array($playerId, $valid, true)) {
                $cellScores[$key] = 0;
                continue;
            }
            $counts = isset($day['cells'][$key]) ? $day['cells'][$key] : [];
            // Punkte gegen den Stand vor diesem Spiel berechnen
            $cellScores[$key] = cellScore($counts, $playerId);
            $score += $cellScores[$key];
            $correct++;
        }
        $won = $correct === 9;
        if ($won) {
            $score += WIN_BONUS;
        }

        // Jeder Spieler zählt pro Nutzer und Zelle nur einmal in die Seltenheitszählung
        foreach (CELL_KEYS as $key) {
            $playerId = $selections[$key];
            if ($cellScores[$key] === 0) {
                continue;
            }
            $seen = isset($user['seen'][$date][$key]) ? $user['seen'][$date][$key] : [];
            if (!in_array($playerId, $seen, true)) {
                $user['seen'][$date][$key] = array_merge($seen, [$playerId]);
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
        $user['games'][] = $entry;

        // Vollständiges Protokoll, aus dem sich Nutzer- und Tagesdateien neu erzeugen lassen
        $logLine = json_encode(['userId' => $user['userId']] + $entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
        if (file_put_contents(dataDir() . '/games.jsonl', $logLine, FILE_APPEND) === false) {
            respond(500, ['error' => 'could not write data']);
        }
        writeJsonFileAtomic(dayFile($date), $day);
        writeJsonFileAtomic(userFile($user['userId']), $user);

        $response = [
            'userId' => $user['userId'],
            'game' => [
                'date' => $date,
                'won' => $won,
                'correct' => $correct,
                'score' => $score,
                'cellScores' => (object)$cellScores,
            ],
            'stats' => computeSummary($user),
        ];
        if ($newToken !== null) {
            $response['token'] = $newToken;
        }
        return $response;
    });
    respond(200, $result);
}

ensureDataDirs();

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($method === 'GET') {
    handleGet();
} elseif ($method === 'POST') {
    handlePost();
}
respond(405, ['error' => 'method not allowed']);

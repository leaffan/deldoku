<?php
// Stats API für DELDoku
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Funktion um Challenge-Datum aus Stats zu extrahieren
function getChallengeDate($stats) {
    if (isset($stats['currentChallenge'])) {
        return $stats['currentChallenge'];
    }
    return date('Y-m-d'); // Fallback: heutiges Datum
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

// Funktion um Stats-Datei für ein Challenge-Datum zu bekommen
function getStatsFile($challengeDate = null) {
    if (!$challengeDate) {
        $challengeDate = date('Y-m-d');
    }
    if (!isValidChallengeDate($challengeDate)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid challengeDate']);
        exit;
    }
    return __DIR__ . "/../../data/stats_$challengeDate.json";
}

// Stelle sicher, dass das data-Verzeichnis existiert
$dataDir = __DIR__ . '/../../data';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// OPTIONS Request für CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// GET: Lade Stats
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $userId = $_GET['userId'] ?? null;
    $challengeDate = $_GET['challengeDate'] ?? date('Y-m-d');
    
    $statsFile = getStatsFile($challengeDate);
    
    // Lade alle Stats für dieses Challenge-Datum
    $allStats = [];
    if (file_exists($statsFile)) {
        $content = file_get_contents($statsFile);
        $allStats = json_decode($content, true) ?: [];
    }
    
    // Wenn userId angegeben, gebe nur diesen User zurück
    if ($userId) {
        $userStats = $allStats[$userId] ?? null;
        echo json_encode([
            'userId' => $userId,
            'stats' => $userStats
        ]);
    } else {
        // Ohne userId: gebe alle Stats zurück (für Score-Berechnung)
        echo json_encode($allStats);
    }
    exit;
}

// POST: Speichere Stats
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!isset($data['userId']) || !isset($data['stats'])) {
        http_response_code(400);
        echo json_encode(['error' => 'userId and stats required']);
        exit;
    }
    
    $userId = $data['userId'];
    $stats = $data['stats'];
    
    // Extrahiere Challenge-Datum aus Stats
    $challengeDate = getChallengeDate($stats);
    $statsFile = getStatsFile($challengeDate);
    
    // Lade existierende Stats für dieses Challenge-Datum
    $allStats = [];
    if (file_exists($statsFile)) {
        $content = file_get_contents($statsFile);
        $allStats = json_decode($content, true) ?: [];
    }
    
    // Update Stats für diesen User
    $allStats[$userId] = $stats;
    
    // Speichere zurück
    file_put_contents($statsFile, json_encode($allStats, JSON_PRETTY_PRINT));
    
    echo json_encode([
        'success' => true,
        'userId' => $userId,
        'stats' => $stats,
        'challengeDate' => $challengeDate
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

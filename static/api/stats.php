<?php
// Stats API für DEL-Doku
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Pfad zur Stats-Datei
$statsFile = __DIR__ . '/../../data/stats.json';

// Stelle sicher, dass das data-Verzeichnis existiert
$dataDir = dirname($statsFile);
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
    
    // Lade alle Stats
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
    
    // Lade existierende Stats
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
        'stats' => $stats
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);

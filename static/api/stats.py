#!/usr/bin/env python3
"""
Stats API für DELDoku (Python CGI)
"""
import cgi
import cgitb
import json
import os
import sys
from datetime import date
from pathlib import Path

# Aktiviere CGI-Fehlerausgabe für Debugging
cgitb.enable()

# Basis-Pfad für Stats-Dateien
DATA_DIR = Path(__file__).parent.parent.parent / 'data'


def get_challenge_date(stats):
    """Extrahiere Challenge-Datum aus Stats"""
    if isinstance(stats, dict) and 'currentChallenge' in stats:
        return stats['currentChallenge']
    return date.today().isoformat()


def get_stats_file(challenge_date=None):
    """Pfad zur Stats-Datei für ein Challenge-Datum"""
    if not challenge_date:
        challenge_date = date.today().isoformat()
    return DATA_DIR / f'stats_{challenge_date}.json'


def send_response(data, status=200):
    """Sende JSON-Antwort"""
    print("Content-Type: application/json")
    print("Access-Control-Allow-Origin: *")
    print("Access-Control-Allow-Methods: GET, POST, OPTIONS")
    print("Access-Control-Allow-Headers: Content-Type")
    print(f"Status: {status}")
    print()  # Leere Zeile zwischen Headers und Body
    print(json.dumps(data, indent=2))
    sys.exit(0)


def load_stats(challenge_date=None):
    """Lade Stats für ein Challenge-Datum"""
    stats_file = get_stats_file(challenge_date)
    
    if stats_file.exists():
        with open(stats_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_stats(stats, challenge_date=None):
    """Speichere Stats für ein Challenge-Datum"""
    stats_file = get_stats_file(challenge_date)
    
    # Erstelle Verzeichnis falls nicht vorhanden
    stats_file.parent.mkdir(parents=True, exist_ok=True)

    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)


def handle_get():
    """GET Request: Lade Stats"""
    form = cgi.FieldStorage()
    user_id = form.getvalue('userId')
    challenge_date = form.getvalue('challengeDate')  # Optional: Challenge-Datum

    all_stats = load_stats(challenge_date)

    if user_id:
        # Gebe nur Stats für einen User zurück
        user_stats = all_stats.get(user_id)
        send_response({
            'userId': user_id,
            'stats': user_stats
        })
    else:
        # Gebe alle Stats zurück (für Score-Berechnung)
        send_response(all_stats)


def handle_post():
    """POST Request: Speichere Stats"""
    try:
        # Lese Request Body
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        post_data = sys.stdin.read(content_length)
        data = json.loads(post_data)

        user_id = data.get('userId')
        stats = data.get('stats')

        if not user_id or not stats:
            send_response({'error': 'userId and stats required'}, 400)

        # Bestimme Challenge-Datum aus Stats
        challenge_date = get_challenge_date(stats)

        # Lade existierende Stats für dieses Challenge-Datum
        all_stats = load_stats(challenge_date)

        # Update Stats für diesen User
        all_stats[user_id] = stats

        # Speichere zurück in die challenge-spezifische Datei
        save_stats(all_stats, challenge_date)

        send_response({
            'success': True,
            'userId': user_id,
            'stats': stats,
            'challengeDate': challenge_date
        })
    except json.JSONDecodeError:
        send_response({'error': 'Invalid JSON'}, 400)
    except Exception as e:
        send_response({'error': str(e)}, 500)


def main():
    """Hauptfunktion"""
    method = os.environ.get('REQUEST_METHOD', 'GET')

    if method == 'OPTIONS':
        # CORS Preflight
        send_response({}, 200)
    elif method == 'GET':
        handle_get()
    elif method == 'POST':
        handle_post()
    else:
        send_response({'error': 'Method not allowed'}, 405)


if __name__ == '__main__':
    main()

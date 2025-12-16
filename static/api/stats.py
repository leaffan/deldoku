#!/usr/bin/env python3
"""
Stats API für DEL-Doku (Python CGI)
"""
import cgi
import cgitb
import json
import os
import sys
from pathlib import Path

# Aktiviere CGI-Fehlerausgabe für Debugging
cgitb.enable()

# Pfad zur Stats-Datei (zwei Ebenen höher als das Script)
STATS_FILE = Path(__file__).parent.parent.parent / 'data' / 'stats.json'


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


def load_stats():
    """Lade alle Stats aus der Datei"""
    if STATS_FILE.exists():
        with open(STATS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_stats(stats):
    """Speichere Stats in die Datei"""
    # Erstelle Verzeichnis falls nicht vorhanden
    STATS_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)


def handle_get():
    """GET Request: Lade Stats"""
    form = cgi.FieldStorage()
    user_id = form.getvalue('userId')

    all_stats = load_stats()

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

        # Lade existierende Stats
        all_stats = load_stats()

        # Update Stats für diesen User
        all_stats[user_id] = stats

        # Speichere zurück
        save_stats(all_stats)

        send_response({
            'success': True,
            'userId': user_id,
            'stats': stats
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

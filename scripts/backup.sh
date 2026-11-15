#!/usr/bin/env bash
# Sichert die Spieldaten (data/) als tar.gz und löscht Sicherungen, die älter als <tage> sind.
# Gedacht für einen täglichen Cron-Job auf dem Server.
#
# Aufruf: backup.sh <datenverzeichnis> <backupverzeichnis> <tage>
#
# Während des Packens wird dieselbe Sperre gehalten wie in stats.php (data/.lock), damit kein
# Spiel nur halb im Archiv landet; Anfragen warten so lange (wenige Sekunden).
# Wiederherstellen: siehe README, Abschnitt "Backups".
set -euo pipefail

usage() {
	echo "Aufruf: $0 <datenverzeichnis> <backupverzeichnis> <tage>" >&2
	exit 2
}

[ $# -eq 3 ] || usage
DATA_DIR=$1
BACKUP_DIR=$2
KEEP_DAYS=$3

[[ $KEEP_DAYS =~ ^[1-9][0-9]*$ ]] || { echo "<tage> muss eine Zahl ab 1 sein" >&2; exit 2; }
[ -d "$DATA_DIR" ] || { echo "Datenverzeichnis fehlt: $DATA_DIR" >&2; exit 1; }

# Die Archive enthalten Nutzerdaten: nur für den eigenen Benutzer lesbar
umask 077
mkdir -p "$BACKUP_DIR"

DATA_DIR=$(cd "$DATA_DIR" && pwd)
ARCHIVE="$BACKUP_DIR/deldoku-data-$(date -u +%Y-%m-%d_%H%M%S).tar.gz"

# Erst unter anderem Namen schreiben, damit nie ein halbes Archiv als Sicherung gilt
flock "$DATA_DIR/.lock" \
	tar -czf "$ARCHIVE.part" --exclude='*.tmp*' -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
mv "$ARCHIVE.part" "$ARCHIVE"

# Alte Sicherungen löschen; nur eigene Archive, nie andere Dateien im Backup-Verzeichnis
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'deldoku-data-*.tar.gz' \
	-mmin +$((KEEP_DAYS * 24 * 60)) -delete
# Reste abgebrochener Läufe
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'deldoku-data-*.tar.gz.part' -mmin +60 -delete

echo "Backup: $ARCHIVE"

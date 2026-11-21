#!/usr/bin/env bash
# Backs up the game data (data/) as tar.gz and deletes backups older than <days>.
# Meant for a daily cron job on the server.
#
# Usage: backup.sh <data-dir> <backup-dir> <days>
#
# While packing, the same lock as in stats.php (data/.lock) is held, so no game ends up
# half-written in the archive; requests wait meanwhile (a few seconds).
# Restoring: see README, section "Backups".
set -euo pipefail

usage() {
	echo "Usage: $0 <data-dir> <backup-dir> <days>" >&2
	exit 2
}

[ $# -eq 3 ] || usage
DATA_DIR=$1
BACKUP_DIR=$2
KEEP_DAYS=$3

[[ $KEEP_DAYS =~ ^[1-9][0-9]*$ ]] || { echo "<days> must be a number of at least 1" >&2; exit 2; }
[ -d "$DATA_DIR" ] || { echo "Data directory missing: $DATA_DIR" >&2; exit 1; }

# The archives contain user data: readable only by the owner
umask 077
mkdir -p "$BACKUP_DIR"

DATA_DIR=$(cd "$DATA_DIR" && pwd)
ARCHIVE="$BACKUP_DIR/deldoku-data-$(date -u +%Y-%m-%d_%H%M%S).tar.gz"

# Write under a different name first, so a half-written archive never counts as a backup
flock "$DATA_DIR/.lock" \
	tar -czf "$ARCHIVE.part" --exclude='*.tmp*' -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
mv "$ARCHIVE.part" "$ARCHIVE"

# Delete old backups; only our own archives, never other files in the backup directory
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'deldoku-data-*.tar.gz' \
	-mmin +$((KEEP_DAYS * 24 * 60)) -delete
# Leftovers from aborted runs
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'deldoku-data-*.tar.gz.part' -mmin +60 -delete

echo "Backup: $ARCHIVE"

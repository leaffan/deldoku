"""scripts/backup.sh: archive contents, restore, retention, locking and argument checks."""

import fcntl
import os
import subprocess
import tarfile
import time

import pytest

from conftest import REPO

SCRIPT = REPO / "scripts" / "backup.sh"
DAY = 24 * 60 * 60


def run_backup(data_dir, backup_dir, days="14", **kwargs):
    return subprocess.run(
        ["bash", str(SCRIPT), str(data_dir), str(backup_dir), str(days)],
        capture_output=True,
        text=True,
        timeout=30,
        **kwargs,
    )


def archives(backup_dir):
    return sorted(p.name for p in backup_dir.glob("deldoku-data-*.tar.gz"))


@pytest.fixture
def data_dir(tmp_path):
    data = tmp_path / "data"
    (data / "users").mkdir(parents=True)
    (data / "users" / "u_1.json").write_text('{"userId": "u_1"}')
    (data / "day_2030-06-15.json").write_text('{"games": 3}')
    (data / "games.log").write_text("line\n")
    (data / "day_2030-06-15.json.tmp123").write_text("half written")
    return data


def test_archive_restores_the_data_directory(tmp_path, data_dir):
    backup_dir = tmp_path / "backups"
    result = run_backup(data_dir, backup_dir)
    assert result.returncode == 0, result.stderr

    [name] = archives(backup_dir)
    restored = tmp_path / "restored"
    with tarfile.open(backup_dir / name) as tar:
        tar.extractall(restored, filter="data")

    assert (restored / "data" / "users" / "u_1.json").read_text() == '{"userId": "u_1"}'
    assert (restored / "data" / "day_2030-06-15.json").read_text() == '{"games": 3}'
    assert (restored / "data" / "games.log").read_text() == "line\n"
    # Half-written temp files of stats.php must not end up in the backup
    assert not (restored / "data" / "day_2030-06-15.json.tmp123").exists()


def test_archives_are_private(tmp_path, data_dir):
    backup_dir = tmp_path / "backups"
    run_backup(data_dir, backup_dir)
    [name] = archives(backup_dir)
    assert (backup_dir / name).stat().st_mode & 0o077 == 0


def test_deletes_only_own_archives_older_than_retention(tmp_path, data_dir):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    now = time.time()
    files = {
        "deldoku-data-2030-05-01_030000.tar.gz": now - 15 * DAY,  # too old
        "deldoku-data-2030-05-03_030000.tar.gz": now - 13 * DAY,  # still within retention
        "deldoku-data-2030-05-02_030000.tar.gz.part": now - 2 * DAY,  # left over from an aborted run
        "something-else.tar.gz": now - 100 * DAY,  # not ours
    }
    for name, mtime in files.items():
        (backup_dir / name).write_text("x")
        os.utime(backup_dir / name, (mtime, mtime))

    assert run_backup(data_dir, backup_dir, days=14).returncode == 0

    remaining = sorted(p.name for p in backup_dir.iterdir())
    assert "deldoku-data-2030-05-01_030000.tar.gz" not in remaining
    assert "deldoku-data-2030-05-03_030000.tar.gz" in remaining
    assert "deldoku-data-2030-05-02_030000.tar.gz.part" not in remaining
    assert "something-else.tar.gz" in remaining
    assert len(archives(backup_dir)) == 2  # the new backup and the one still within retention


def test_waits_for_the_stats_api_lock(tmp_path, data_dir):
    backup_dir = tmp_path / "backups"
    with open(data_dir / ".lock", "w") as lock:
        # Hold the lock like stats.php does while writing
        fcntl.flock(lock, fcntl.LOCK_EX)
        proc = subprocess.Popen(
            ["bash", str(SCRIPT), str(data_dir), str(backup_dir), "14"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        time.sleep(1)
        assert proc.poll() is None
        assert archives(backup_dir) == []
        fcntl.flock(lock, fcntl.LOCK_UN)
    assert proc.wait(timeout=30) == 0
    assert len(archives(backup_dir)) == 1


@pytest.mark.parametrize("days", ["0", "-1", "abc", ""])
def test_rejects_invalid_retention(tmp_path, data_dir, days):
    result = run_backup(data_dir, tmp_path / "backups", days=days)
    assert result.returncode == 2
    assert not (tmp_path / "backups").exists()


def test_fails_without_data_directory(tmp_path):
    result = run_backup(tmp_path / "missing", tmp_path / "backups")
    assert result.returncode == 1
    assert "Data directory missing" in result.stderr

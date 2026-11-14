"""Fixtures for the stats API tests.

One PHP built-in server runs for the whole session. Before every test the data directory is
emptied and the test challenges are copied in again, so each test starts from a clean state.
"""

import json
import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).parent / "fixtures"

# Fixed dates (passed to stats.php via DELDOKU_TEST_TODAY), so tests never depend on the clock
TODAY = "2030-06-15"
YESTERDAY = "2030-06-14"
TWO_DAYS_AGO = "2030-06-13"
THREE_DAYS_AGO = "2030-06-12"
TOMORROW = "2030-06-16"

REGISTRATION_LIMIT = 25  # passed via DELDOKU_TEST_REGISTRATION_LIMIT
CELL_KEYS = [f"{r}-{c}" for r in range(3) for c in range(3)]
REQUEST_TIMEOUT = 10  # seconds; keeps a hung server from blocking the run


def load_answers(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))["answers"]


CHALLENGE = load_answers("challenge.json")
FALLBACK = load_answers("fallback.json")


def grid(answers=CHALLENGE, pick=0):
    """A complete, valid selection: the pick-th answer of every cell."""
    return {key: answers[int(key[0])][int(key[2])][pick] for key in CELL_KEYS}


@dataclass
class User:
    user_id: str
    token: str


class Api:
    """Minimal client for api/stats.php. Every call returns (status, parsed JSON or raw text)."""

    def __init__(self, base_url):
        self.url = base_url + "/deldoku/api/stats.php"

    def request(self, method, query="", body=None, token=None, raw=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(self.url + query, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("X-DelDoku-Token", token)
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return resp.status, json.loads(resp.read() or b"null")
        except urllib.error.HTTPError as err:
            text = err.read()
            try:
                return err.code, json.loads(text)
            except ValueError:
                return err.code, text.decode(errors="replace")

    def get(self, query="", token=None):
        return self.request("GET", query, token=token)

    def post(self, body=None, token=None, raw=None):
        return self.request("POST", body=body, token=token, raw=raw)

    def play(self, selections, user=None, date=TODAY, **extra):
        """Submit a game; without a user a new one is registered."""
        body = {"date": date, "selections": selections, **extra}
        if user:
            body["userId"] = user.user_id
        return self.post(body, token=user.token if user else None)

    def register(self, selections=None, date=TODAY):
        """Register a new user by submitting their first game."""
        status, body = self.play(selections or grid(), date=date)
        assert status == 200, body
        return User(body["userId"], body["token"])

    def day(self, date=TODAY, fallback=False):
        status, body = self.get(f"?date={date}" + ("&challenge=fallback" if fallback else ""))
        assert status == 200, body
        return body


@dataclass
class Server:
    root: Path  # document root: deldoku/api, deldoku/challenges and data/ live below it
    base_url: str

    @property
    def data(self):
        return self.root / "data"

    @property
    def challenges(self):
        return self.root / "deldoku" / "challenges"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="session")
def server(tmp_path_factory):
    root = tmp_path_factory.mktemp("srv")
    api_dir = root / "deldoku" / "api"
    api_dir.mkdir(parents=True)
    stats = api_dir / "stats.php"
    shutil.copy(REPO / "static" / "api" / "stats.php", stats)
    subprocess.run(["php", "-l", str(stats)], check=True, capture_output=True)

    port = free_port()
    env = {
        **os.environ,
        "PHP_CLI_SERVER_WORKERS": "8",
        "DELDOKU_TEST_TODAY": TODAY,
        "DELDOKU_TEST_REGISTRATION_LIMIT": str(REGISTRATION_LIMIT),
    }
    proc = subprocess.Popen(
        ["php", "-S", f"127.0.0.1:{port}", "-t", str(root)],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    base_url = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)
    else:
        proc.terminate()
        pytest.fail("PHP server did not start")

    yield Server(root, base_url)
    proc.terminate()
    proc.wait(timeout=5)


@pytest.fixture(autouse=True)
def fresh_state(server):
    """Empty data/ and restore the challenges for today, yesterday and the fallback."""
    for directory in (server.data, server.challenges):
        shutil.rmtree(directory, ignore_errors=True)
        directory.mkdir(parents=True)
    for date in (TODAY, YESTERDAY):
        shutil.copy(FIXTURES / "challenge.json", server.challenges / f"{date}.json")
    shutil.copy(FIXTURES / "fallback.json", server.challenges / "fallback.json")


@pytest.fixture
def api(server):
    return Api(server.base_url)


@pytest.fixture
def user(api):
    """A registered user who has already played one complete game today."""
    return api.register()


def read_log(server):
    """All lines of games.jsonl, parsed. Raises if a line is not valid JSON."""
    path = server.data / "games.jsonl"
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def read_user_file(server, user):
    return json.loads((server.data / "users" / f"{user.user_id}.json").read_text(encoding="utf-8"))

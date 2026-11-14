"""Daily game limit, registration limit per IP and concurrent requests."""

import json
from concurrent.futures import ThreadPoolExecutor

from conftest import REGISTRATION_LIMIT, THREE_DAYS_AGO, TODAY, YESTERDAY, grid

GAMES_PER_DAY = 20


def test_daily_game_limit_per_user(api, user):
    # The registering game was the first one today
    codes = [api.play(grid(), user=user)[0] for _ in range(GAMES_PER_DAY)]
    assert codes == [200] * (GAMES_PER_DAY - 1) + [429]


def test_registration_limit_per_ip(api):
    for _ in range(REGISTRATION_LIMIT):
        api.register()
    status, body = api.play(grid())
    assert (status, body["error"]) == (429, "registration limit reached")


def test_existing_user_can_play_after_the_registration_limit(api):
    first = api.register()
    for _ in range(REGISTRATION_LIMIT - 1):
        api.register()
    status, _ = api.play(grid(), user=first)
    assert status == 200


def test_rate_limit_file_stores_only_hashes(api, server):
    api.register()
    content = (server.data / f"ratelimit_{TODAY}.json").read_text()
    assert "127.0.0.1" not in content
    counts = json.loads(content)["counts"]
    assert counts and all(len(key) == 64 for key in counts)


def test_old_rate_limit_files_are_removed(api, server):
    old = server.data / f"ratelimit_{THREE_DAYS_AGO}.json"
    yesterday = server.data / f"ratelimit_{YESTERDAY}.json"
    for path in (old, yesterday):
        path.write_text('{"secret":"x","counts":{}}')
    api.register()
    assert not old.exists()
    assert yesterday.exists()


def test_parallel_registrations_are_all_stored(api):
    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: api.play(grid(), date=YESTERDAY), range(20)))
    assert [status for status, _ in results] == [200] * 20
    assert api.day(YESTERDAY)["games"] == 20

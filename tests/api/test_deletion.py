"""Deleting an account on request and expiring inactive accounts."""

import json

from conftest import TODAY, grid, read_log, read_user_file

# TODAY is 2030-06-15, so accounts whose last game is before 2029-06-15 have expired
EXPIRED = "2029-06-14T23:59:59+00:00"
STILL_ACTIVE = "2029-06-15T00:00:00+00:00"


def user_file(server, user):
    return server.data / "users" / f"{user.user_id}.json"


def log_user_ids(server):
    return {entry["userId"] for entry in read_log(server)}


def set_activity(server, user, timestamp):
    """Pretend the user registered and played their last game at the given time."""
    data = read_user_file(server, user)
    data["created"] = timestamp
    for game in data["games"]:
        game["timestamp"] = timestamp
    user_file(server, user).write_text(json.dumps(data), encoding="utf-8")


def run_daily_expiry(api, server):
    """Forget that today's expiry already ran, then trigger it with any request."""
    (server.data / "expired_until").unlink(missing_ok=True)
    api.day()


# --- Deleting on request ---


def test_delete_removes_user_file_and_log_lines(api, server, user):
    other = api.register()
    status, body = api.delete(user.user_id, token=user.token)
    assert status == 200
    assert body == {"deleted": True}
    assert not user_file(server, user).exists()
    assert log_user_ids(server) == {other.user_id}


def test_deleted_user_can_no_longer_log_in(api, user):
    api.delete(user.user_id, token=user.token)
    status, _ = api.get(f"?userId={user.user_id}", token=user.token)
    assert status == 401


def test_delete_requires_the_token(api, server, user):
    assert api.delete(user.user_id)[0] == 401
    assert api.delete(user.user_id, token="wrong")[0] == 401
    assert user_file(server, user).exists()


def test_delete_rejects_invalid_user_id(api, user):
    assert api.delete("..%2F..%2Fx", token=user.token)[0] == 400


def test_delete_keeps_day_stats(api, user):
    before = api.day()
    api.delete(user.user_id, token=user.token)
    assert api.day() == before


def test_delete_keeps_unparseable_log_lines(api, server, user):
    log = server.data / "games.jsonl"
    log.write_text(log.read_text(encoding="utf-8") + "not json\n", encoding="utf-8")
    api.delete(user.user_id, token=user.token)
    assert log.read_text(encoding="utf-8") == "not json\n"


# --- Expiring inactive accounts ---


def test_inactive_account_expires(api, server, user):
    set_activity(server, user, EXPIRED)
    run_daily_expiry(api, server)
    assert not user_file(server, user).exists()
    assert user.user_id not in log_user_ids(server)


def test_recently_active_account_is_kept(api, server, user):
    set_activity(server, user, STILL_ACTIVE)
    run_daily_expiry(api, server)
    assert user_file(server, user).exists()


def test_old_account_with_a_recent_game_is_kept(api, server, user):
    set_activity(server, user, EXPIRED)
    data = read_user_file(server, user)
    data["games"][-1]["timestamp"] = STILL_ACTIVE
    user_file(server, user).write_text(json.dumps(data), encoding="utf-8")
    run_daily_expiry(api, server)
    assert user_file(server, user).exists()


def test_old_account_without_games_falls_back_to_created(api, server, user):
    set_activity(server, user, EXPIRED)
    data = read_user_file(server, user)
    data["games"] = []
    user_file(server, user).write_text(json.dumps(data), encoding="utf-8")
    run_daily_expiry(api, server)
    assert not user_file(server, user).exists()


def test_expiry_runs_only_once_per_day(api, server, user):
    api.day()  # today's expiry has run
    set_activity(server, user, EXPIRED)
    api.day()
    assert user_file(server, user).exists()
    assert (server.data / "expired_until").read_text(encoding="utf-8") == TODAY


def test_expired_user_plays_on_as_a_new_account(api, server, user):
    set_activity(server, user, EXPIRED)
    run_daily_expiry(api, server)
    status, _ = api.play(grid(), user=user)
    assert status == 401

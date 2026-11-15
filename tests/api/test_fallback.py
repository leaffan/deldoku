"""The fallback challenge, used when no challenge file exists for the day."""

import pytest

from conftest import CELL_KEYS, FALLBACK, TODAY, grid, read_log, read_user_file


def fallback_grid():
    return grid(FALLBACK)


def test_declared_fallback_is_scored_against_the_fallback_answers(api, user):
    _, body = api.play(fallback_grid(), user=user, challenge="fallback")
    assert body["game"]["challenge"] == "fallback"
    assert body["game"]["score"] == 1000


def test_fallback_is_counted_separately(api, server, user):
    regular = (server.data / f"day_{TODAY}.json").read_text()
    api.play(fallback_grid(), user=user, challenge="fallback")
    assert (server.data / f"day_{TODAY}.json").read_text() == regular
    cells = api.day(fallback=True)["cells"]
    assert all(cells[key] == {fallback_grid()[key]: 1} for key in CELL_KEYS)


def test_fallback_is_marked_in_user_file_and_log(api, server, user):
    api.play(fallback_grid(), user=user, challenge="fallback")
    user_file = read_user_file(server, user)
    assert f"{TODAY}:fallback" in user_file["seen"]
    assert user_file["games"][-1]["challenge"] == "fallback"
    assert read_log(server)[-1]["challenge"] == "fallback"


def test_server_falls_back_when_the_day_file_is_missing(api, server):
    (server.challenges / f"{TODAY}.json").unlink()
    _, body = api.play(fallback_grid())
    assert body["game"]["challenge"] == "fallback"
    assert body["game"]["score"] == 1000


def test_missing_day_file_and_fallback_gives_404(api, server):
    (server.challenges / f"{TODAY}.json").unlink()
    (server.challenges / "fallback.json").unlink()
    status, _ = api.play(fallback_grid())
    assert status == 404


@pytest.mark.parametrize("value", ["x", 1])
def test_post_rejects_invalid_challenge_value(api, user, value):
    status, _ = api.play(fallback_grid(), user=user, challenge=value)
    assert status == 400


def test_get_rejects_invalid_challenge_value(api):
    status, _ = api.get(f"?date={TODAY}&challenge=x")
    assert status == 400

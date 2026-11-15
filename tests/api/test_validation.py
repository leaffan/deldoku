"""Input validation: query parameters, request bodies and selections."""

import pytest

from conftest import TODAY, TOMORROW, TWO_DAYS_AGO, grid


@pytest.mark.parametrize(
    "query", ["?date=abc", "?date=..%2Fx", "?challengeDate=2026-13-45", "?date%5B%5D=x"]
)
def test_get_rejects_invalid_date(api, query):
    status, _ = api.get(query)
    assert status == 400


def test_get_empty_day(api):
    status, body = api.get()
    assert status == 200
    assert body["games"] == 0
    assert body["cells"] == {}


def duplicate_player():
    selections = grid()
    selections["0-1"] = selections["0-0"]
    return selections


@pytest.mark.parametrize(
    "body",
    [
        pytest.param({"date": TODAY, "selections": duplicate_player()}, id="duplicate player"),
        pytest.param({"date": TODAY, "selections": {"0-0": "../x"}}, id="bad player id"),
        pytest.param({"date": TODAY, "selections": {"3-3": grid()["0-0"]}}, id="unknown cell key"),
        pytest.param({"date": TODAY, "selections": "x"}, id="selections not an object"),
        pytest.param({"date": "x/../../probe", "selections": grid()}, id="invalid date"),
        pytest.param({"date": TWO_DAYS_AGO, "selections": grid()}, id="date two days ago"),
        pytest.param({"date": TOMORROW, "selections": grid()}, id="date tomorrow"),
    ],
)
def test_post_rejects_invalid_body(api, body):
    status, _ = api.post(body)
    assert status == 400


def test_post_rejects_invalid_json(api):
    status, _ = api.post(raw=b"{not json")
    assert status == 400


def test_post_rejects_body_over_8_kb(api):
    status, _ = api.post(raw=b'{"x":"' + b"a" * 9000 + b'"}')
    assert status == 413


def test_real_world_player_ids_pass_validation(api):
    # Real IDs contain dots, %-encoding and non-ASCII. An invalid userId stops the request right
    # after the selections were parsed, so this error proves they were accepted (and nothing stored).
    selections = {
        "0-0": "12390/t.j.-mulock",
        "0-1": "15224/daniel-wei%C3%9F",
        "0-2": "22333/bastian-steingroÃŸ",
    }
    status, body = api.post({"date": TODAY, "selections": selections, "userId": "x"})
    assert (status, body["error"]) == (400, "invalid userId")

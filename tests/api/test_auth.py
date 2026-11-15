"""Registration and token authentication."""

from conftest import TODAY, grid


def test_first_game_registers_a_new_user(api):
    status, body = api.play(grid())
    assert status == 200
    assert body["userId"].startswith("u_")
    assert body["token"]


def test_known_user_without_token_is_rejected(api, user):
    status, _ = api.post({"date": TODAY, "selections": grid(), "userId": user.user_id})
    assert status == 401


def test_known_user_with_wrong_token_is_rejected(api, user):
    status, _ = api.post({"date": TODAY, "selections": grid(), "userId": user.user_id}, token="wrong")
    assert status == 401


def test_user_id_with_path_traversal_is_rejected(api, user):
    status, _ = api.post({"date": TODAY, "selections": grid(), "userId": "../../x"}, token=user.token)
    assert status == 400


def test_own_stats_require_token(api, user):
    status, _ = api.get(f"?userId={user.user_id}")
    assert status == 401


def test_own_stats_reject_path_traversal(api, user):
    status, _ = api.get("?userId=..%2F..%2Fx", token=user.token)
    assert status == 400


def test_own_stats_with_token(api, user):
    status, body = api.get(f"?userId={user.user_id}", token=user.token)
    assert status == 200
    assert body["stats"]["totalGames"] == 1


def test_returning_user_gets_no_new_token(api, user):
    status, body = api.play(grid(), user=user)
    assert status == 200
    assert body["userId"] == user.user_id
    assert "token" not in body

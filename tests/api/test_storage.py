"""What ends up on disk: the game log, user files and the protection of the data directory."""

from conftest import grid, read_log, read_user_file


def play_some_games(api):
    """Two users, three games: a registration plus game, a replay, a second registration."""
    first = api.register()
    api.play(grid(pick=1), user=first)
    second = api.register()
    return first, second


def test_log_has_one_register_line_per_user_and_one_line_per_game(api, server):
    first, second = play_some_games(api)
    log = read_log(server)
    assert [(entry["type"], entry["userId"]) for entry in log] == [
        ("register", first.user_id),
        ("game", first.user_id),
        ("game", first.user_id),
        ("register", second.user_id),
        ("game", second.user_id),
    ]


def test_register_line_holds_exactly_the_token_hash(api, server):
    user = api.register()
    register = read_log(server)[0]
    assert set(register) == {"type", "userId", "tokenHash", "created"}
    assert register["tokenHash"] == read_user_file(server, user)["tokenHash"]


def test_no_plaintext_tokens_are_stored(api, server):
    first, second = play_some_games(api)
    log = (server.data / "games.jsonl").read_text(encoding="utf-8")
    user_file = (server.data / "users" / f"{first.user_id}.json").read_text(encoding="utf-8")
    for token in (first.token, second.token):
        assert token not in log
    assert first.token not in user_file


def test_data_directory_is_protected(api, server):
    api.register()
    assert (server.data / ".htaccess").read_text().strip() == "Require all denied"


def test_nothing_is_written_outside_the_data_directory(api, server):
    play_some_games(api)
    assert sorted(path.name for path in server.root.iterdir()) == ["data", "deldoku"]

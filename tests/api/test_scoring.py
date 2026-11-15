"""Scoring: rarity points per cell, win bonus, replays and the summary statistics.

Rarity points per correct cell: max(10, round(100 * (1 - usage / total))), where usage is how
often this player was counted in the cell before this game and total is the sum over all players
in the cell. An empty cell counts 100. A game with all nine cells correct gets a 100-point bonus.
Each user counts at most once per player and cell.
"""

from conftest import CELL_KEYS, TODAY, YESTERDAY, grid


def test_first_game_on_an_empty_day_scores_the_maximum(api):
    _, body = api.play(grid())
    game = body["game"]
    assert game["won"] is True
    assert game["correct"] == 9
    assert all(score == 100 for score in game["cellScores"].values())
    assert game["score"] == 9 * 100 + 100


def test_replay_with_the_same_players(api, user):
    # Every cell is {A: 1}: usage 1 of 1 -> the minimum of 10 points
    _, body = api.play(grid(), user=user)
    assert body["game"]["score"] == 9 * 10 + 100


def test_replay_does_not_count_the_same_player_twice(api, user):
    api.play(grid(), user=user)
    cells = api.day()["cells"]
    assert all(cells[key] == {grid()[key]: 1} for key in CELL_KEYS)


def test_replay_with_new_players_counts_them(api, user):
    # New players have usage 0 -> 100 points each; afterwards every cell is {A: 1, B: 1}
    _, body = api.play(grid(pick=1), user=user)
    assert body["game"]["score"] == 9 * 100 + 100
    cells = api.day()["cells"]
    assert all(cells[key] == {grid()[key]: 1, grid(pick=1)[key]: 1} for key in CELL_KEYS)


def test_second_user_with_a_shared_answer(api, user):
    api.play(grid(pick=1), user=user)
    # Every cell is {A: 1, B: 1}: choosing A is usage 1 of 2 -> 50 points
    _, body = api.play(grid())
    assert body["game"]["score"] == 9 * 50 + 100


def test_wrong_and_empty_cells_score_zero_and_cost_the_bonus(api):
    selections = grid()
    selections["0-0"] = "1/not-a-real-player"
    selections["2-2"] = ""
    _, body = api.play(selections)
    game = body["game"]
    assert game["correct"] == 7
    assert game["won"] is False
    assert game["cellScores"]["0-0"] == game["cellScores"]["2-2"] == 0
    assert game["score"] == 7 * 100


def test_public_day_stats_contain_no_user_data(api, user):
    status, body = api.get()
    assert status == 200
    assert body["games"] == 1
    assert user.user_id not in str(body)
    assert user.token not in str(body)


def test_summary_over_two_days(api, user):
    api.play(grid(), user=user)  # replay today: 190, the best of today stays 1000
    api.play(grid(), user=user, date=YESTERDAY)  # first game yesterday: 1000

    _, body = api.get(f"?userId={user.user_id}", token=user.token)
    stats = body["stats"]
    assert stats["totalGames"] == 3
    assert stats["daysPlayed"] == 2
    assert stats["currentStreak"] == 2
    assert stats["longestStreak"] == 2
    assert stats["totalPoints"] == 1000 + 1000  # best game per day
    assert stats["pointsPercent"] == 100.0  # of 2 days * 1000 possible points
    assert {game["date"] for game in stats["gameHistory"]} == {TODAY, YESTERDAY}


def test_corrupt_day_file_is_kept_and_reported(api, server, user):
    day_file = server.data / f"day_{TODAY}.json"
    day_file.write_text("{broken")
    status, _ = api.play(grid(), user=user)
    assert status == 500
    assert day_file.read_text() == "{broken"

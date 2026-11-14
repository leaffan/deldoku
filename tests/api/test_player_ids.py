"""Players are matched by their Eliteprospects ID (the number before "/"); the name part may differ."""

from conftest import grid


def with_name(player_id, name):
    return player_id.split("/")[0] + "/" + name


def test_different_name_part_with_the_same_ep_id_is_correct(api):
    selections = grid()
    selections["0-0"] = with_name(selections["0-0"], "anders-geschrieben")
    _, body = api.play(selections)
    assert body["game"]["cellScores"]["0-0"] == 100
    assert body["game"]["won"] is True


def test_counts_use_the_spelling_of_the_challenge(api):
    selections = grid()
    selections["0-0"] = with_name(selections["0-0"], "anders-geschrieben")
    api.play(selections)
    assert api.day()["cells"]["0-0"] == {grid()["0-0"]: 1}


def test_same_name_part_with_a_wrong_ep_id_is_incorrect(api):
    selections = grid()
    selections["0-0"] = "999999/" + selections["0-0"].split("/", 1)[1]
    _, body = api.play(selections)
    assert body["game"]["cellScores"]["0-0"] == 0


def test_same_ep_id_in_two_cells_is_rejected(api):
    selections = grid()
    selections["0-1"] = with_name(selections["0-0"], "zweite-schreibweise")
    status, body = api.play(selections)
    assert (status, body["error"]) == (400, "player used more than once")

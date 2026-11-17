"""The test instance (deldoku_tst) keeps its own data next to data/ and never touches it."""

import shutil

from conftest import FIXTURES, TODAY, Api, php_server


def test_test_instance_writes_to_its_own_data_directory(tmp_path):
    challenges = tmp_path / "deldoku_tst" / "challenges"
    challenges.mkdir(parents=True)
    shutil.copy(FIXTURES / "challenge.json", challenges / f"{TODAY}.json")

    with php_server(tmp_path, instance="deldoku_tst") as base_url:
        user = Api(base_url, instance="deldoku_tst").register()

    assert (tmp_path / "data_tst" / "users" / f"{user.user_id}.json").exists()
    assert not (tmp_path / "data").exists()

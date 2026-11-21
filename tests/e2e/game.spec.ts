import { expect, PLAYERS, test, TODAY } from './fixtures';

test('loads the daily challenge', async ({ game, page }) => {
	const errors: Error[] = [];
	page.on('pageerror', (error) => errors.push(error));

	await expect(page.getByText('E2E-Test')).toBeVisible();
	await expect(page.getByRole('button', { name: /^Zeile .*: offen$/ })).toHaveCount(9);
	await expect(game.cell(0, 0)).toHaveAccessibleName(
		'Zeile 10 Playoff-Tore / Karriere, Spalte Aktiv in den 1990ern: offen'
	);
	await expect(game.submit).toBeDisabled();
	await game.expectAnswers(0);
	await game.expectScore(0);
	expect(errors).toEqual([]);
});

test('marks incorrect and correct answers', async ({ game }) => {
	await game.answer(0, 0, PLAYERS.wally.name);
	await expect(game.cell(0, 0)).toHaveAccessibleName(/: falsch$/);
	await game.expectAnswers(1);
	// After a wrong answer the dialog stays open and the player is blocked for that cell
	await expect(game.dialog).toBeVisible();
	await game.search.fill(PLAYERS.wally.name);
	await expect(game.option(PLAYERS.wally.name)).toHaveAttribute('aria-disabled', 'true');

	await game.choose(PLAYERS.anton.name);
	await expect(game.cell(0, 0)).toHaveAccessibleName(/: richtig: Anton Ahorn$/);
	await expect(game.dialog).toBeHidden();
	await game.expectAnswers(2);
	await game.expectScore(100);
});

test('takes the score from the server on submit', async ({ game, request }) => {
	await game.answer(0, 0, PLAYERS.anton.name);
	// Provisionally 100 points: nobody has named Anton in this cell today
	await game.expectScore(100);
	await expect(game.dialog).toBeHidden();

	// Meanwhile someone else submits the same answer; only the server knows
	const other = await request.post('api/stats.php', {
		data: { date: TODAY, selections: { '0-0': PLAYERS.anton.id } }
	});
	expect(other.ok()).toBe(true);

	await game.submit.click();
	// 100 * (1 - 1/1) = 0, so the minimum score of 10
	await game.expectScore(10);
	await expect(game.submit).toBeDisabled();
});

test('copies the result for sharing', async ({ game, page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await game.answer(0, 0, PLAYERS.anton.name);
	await game.answer(0, 1, PLAYERS.wally.name);
	await game.closeDialog();
	await game.submit.click();
	await game.expectScore(100);

	await page.getByRole('button', { name: 'Ergebnis teilen' }).click();
	await expect(page.getByText('In die Zwischenablage kopiert')).toBeVisible();
	// The Windows clipboard returns \r\n instead of \n
	const text = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
	expect(text).toContain('DELDoku 15.06.2030');
	expect(text).toContain('🟩🟥⬜\n⬜⬜⬜\n⬜⬜⬜');
	expect(text).toContain('Punkte: 100 / 1000');
});

test('can be played with the keyboard alone', { tag: '@keyboard' }, async ({ game, page }) => {
	// Tab to the first cell
	for (let i = 0; i < 10; i++) {
		if (await game.cell(0, 0).evaluate((el) => el === document.activeElement)) break;
		await page.keyboard.press('Tab');
	}
	await expect(game.cell(0, 0)).toBeFocused();

	// Enter opens the search with focus in the search field; arrow key and Enter select
	await page.keyboard.press('Enter');
	await expect(game.search).toBeFocused();
	await page.keyboard.type('Anton');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(game.cell(0, 0)).toHaveAccessibleName(/: richtig: Anton Ahorn$/);
	await expect(game.dialog).toBeHidden();
	// After closing, focus is back on the cell
	await expect(game.cell(0, 0)).toBeFocused();

	// Escape closes the suggestion list first, then the dialog
	await page.keyboard.press('Tab');
	await expect(game.cell(0, 1)).toBeFocused();
	await page.keyboard.press('Enter');
	await page.keyboard.type('Wal');
	await expect(game.search).toHaveAttribute('aria-expanded', 'true');
	await page.keyboard.press('Escape');
	await expect(game.search).toHaveAttribute('aria-expanded', 'false');
	await expect(game.dialog).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(game.dialog).toBeHidden();
	await expect(game.cell(0, 1)).toBeFocused();
});

test('deletes the own data after confirmation', async ({ game, page }) => {
	await game.answer(0, 0, PLAYERS.anton.name);
	await game.closeDialog();
	await game.submit.click();
	await game.expectScore(100);

	await page.getByRole('button', { name: 'Statistiken anzeigen' }).click();
	// The provisional score already shows 100 before the server answers, so wait until the login
	// from the response is stored; reading it once right away is racy
	const readAuth = () => page.evaluate(() => localStorage.getItem('del_doku_auth'));
	await expect
		.poll(readAuth, { message: 'del_doku_auth missing after the first game' })
		.not.toBeNull();
	const auth = JSON.parse((await readAuth())!);
	expect(auth.userId).toMatch(/^u_[0-9a-f]{16}$/);
	await expect(page.getByText(auth.userId)).toBeVisible();
	await page.getByRole('button', { name: 'Meine Daten löschen' }).click();
	// Cancel leaves everything as it is
	await page.getByRole('button', { name: 'Abbrechen' }).click();
	await page.getByRole('button', { name: 'Meine Daten löschen' }).click();
	await page.getByRole('button', { name: 'Endgültig löschen' }).click();
	await expect(page.getByText('Deine Daten wurden gelöscht.')).toBeVisible();

	// Local login is removed; after reloading there are no stats anymore
	expect(await page.evaluate(() => localStorage.getItem('del_doku_auth'))).toBeNull();
	await page.reload();
	await page.getByRole('button', { name: 'Statistiken anzeigen' }).click();
	await expect(page.getByText('Noch keine Spiele gespielt.', { exact: false })).toBeVisible();
});

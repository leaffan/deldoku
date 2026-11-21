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
	// Bei einer falschen Antwort bleibt der Dialog offen, der Spieler ist für die Zelle gesperrt
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
	// Vorläufig 100 Punkte: Bisher hat heute niemand Anton in dieser Zelle genannt
	await game.expectScore(100);
	await expect(game.dialog).toBeHidden();

	// Inzwischen reicht jemand anderes dieselbe Antwort ein; das weiß nur der Server
	const other = await request.post('api/stats.php', {
		data: { date: TODAY, selections: { '0-0': PLAYERS.anton.id } }
	});
	expect(other.ok()).toBe(true);

	await game.submit.click();
	// 100 * (1 - 1/1) = 0, also die Mindestpunktzahl 10
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
	// Die Windows-Zwischenablage liefert \r\n statt \n
	const text = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
	expect(text).toContain('DELDoku 15.06.2030');
	expect(text).toContain('🟩🟥⬜\n⬜⬜⬜\n⬜⬜⬜');
	expect(text).toContain('Punkte: 100 / 1000');
});

test('can be played with the keyboard alone', { tag: '@keyboard' }, async ({ game, page }) => {
	// Mit Tab zur ersten Zelle
	for (let i = 0; i < 10; i++) {
		if (await game.cell(0, 0).evaluate((el) => el === document.activeElement)) break;
		await page.keyboard.press('Tab');
	}
	await expect(game.cell(0, 0)).toBeFocused();

	// Enter öffnet die Suche mit Fokus im Suchfeld; Pfeiltaste und Enter wählen aus
	await page.keyboard.press('Enter');
	await expect(game.search).toBeFocused();
	await page.keyboard.type('Anton');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(game.cell(0, 0)).toHaveAccessibleName(/: richtig: Anton Ahorn$/);
	await expect(game.dialog).toBeHidden();
	// Nach dem Schließen ist der Fokus wieder auf der Zelle
	await expect(game.cell(0, 0)).toBeFocused();

	// Escape schließt erst die Vorschlagsliste, dann den Dialog
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
	const auth = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('del_doku_auth') ?? 'null')
	);
	await expect(page.getByText(auth.userId)).toBeVisible();
	await page.getByRole('button', { name: 'Meine Daten löschen' }).click();
	// Abbrechen lässt alles, wie es ist
	await page.getByRole('button', { name: 'Abbrechen' }).click();
	await page.getByRole('button', { name: 'Meine Daten löschen' }).click();
	await page.getByRole('button', { name: 'Endgültig löschen' }).click();
	await expect(page.getByText('Deine Daten wurden gelöscht.')).toBeVisible();

	// Lokaler Login ist entfernt, nach dem Neuladen gibt es keine Statistik mehr
	expect(await page.evaluate(() => localStorage.getItem('del_doku_auth'))).toBeNull();
	await page.reload();
	await page.getByRole('button', { name: 'Statistiken anzeigen' }).click();
	await expect(page.getByText('Noch keine Spiele gespielt.', { exact: false })).toBeVisible();
});

import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Fester Spieltag; muss zu TODAY in serve.sh passen (dort heißt die Test-Challenge so). */
export const TODAY = '2030-06-15';

// data/ des Test-Servers (serve.sh); der Container läuft mit unserer User-ID, wir dürfen es leeren
const DATA_DIR = fileURLToPath(new URL('../../.e2e-server/data', import.meta.url));

/** Spieler aus fixtures/players.json, die in der Test-Challenge vorkommen. */
export const PLAYERS = {
	anton: { id: '900001/anton-ahorn', name: 'Anton Ahorn' }, // Zelle 0-0
	berta: { id: '900002/berta-birke', name: 'Berta Birke' }, // Zelle 0-1
	wally: { id: '900010/wally-wrong', name: 'Wally Wrong' } // in keiner Zelle richtig
};

/** Spielbrett der Startseite, angesprochen wie von Nutzern: über Rollen und sichtbare Texte. */
export class Game {
	constructor(readonly page: Page) {}

	/** Zelle in Zeile row, Spalte col (0-basiert); ihr Name nennt Zeile, Spalte und Zustand. */
	cell(row: number, col: number): Locator {
		return this.page.getByRole('button', { name: /^Zeile / }).nth(row * 3 + col);
	}

	get dialog(): Locator {
		return this.page.getByRole('dialog');
	}

	get search(): Locator {
		return this.dialog.getByRole('combobox');
	}

	option(name: string): Locator {
		return this.dialog.getByRole('option', { name });
	}

	get submit(): Locator {
		return this.page.getByRole('button', { name: 'Lösung einreichen' });
	}

	/** Zelle öffnen und einen Spieler eintragen (Maus bzw. Touch). */
	async answer(row: number, col: number, name: string) {
		// Nach einer richtigen Antwort schließt sich der Dialog erst nach kurzer Verzögerung
		await expect(this.dialog).toBeHidden();
		await this.cell(row, col).click();
		await this.choose(name);
	}

	/** Im offenen Dialog einen Spieler suchen und „Auswählen“ drücken. */
	async choose(name: string) {
		await this.search.fill(name);
		await this.option(name).locator('button').click();
	}

	async closeDialog() {
		await this.dialog.getByRole('button', { name: /^Abbrechen/ }).click();
		await expect(this.dialog).toBeHidden();
	}

	async expectScore(score: number) {
		await expect(this.page.getByText(`Punkte: ${score} / 1000`)).toBeVisible();
	}

	async expectAnswers(count: number) {
		await expect(this.page.getByText(`Antworten: ${count} / 9`)).toBeVisible();
	}
}

export const test = base.extend<{ game: Game }>({
	game: async ({ page }, use) => {
		await rm(DATA_DIR, { recursive: true, force: true });
		await mkdir(DATA_DIR);
		// Browser und Server (DELDOKU_TEST_TODAY) spielen am selben Tag; Timer laufen normal weiter
		await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00Z`));
		await page.goto('./');
		const game = new Game(page);
		await expect(game.cell(2, 2)).toBeVisible();
		await use(game);
	}
});

export { expect };

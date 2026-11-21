import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { TODAY } from './constants';

export { TODAY };

// data/ of the test server (serve.sh); the container runs with our user ID, so we may empty it
const DATA_DIR = fileURLToPath(new URL('../../.e2e-server/data', import.meta.url));

/** Players from fixtures/players.json that appear in the test challenge. */
export const PLAYERS = {
	anton: { id: '900001/anton-ahorn', name: 'Anton Ahorn' }, // cell 0-0
	berta: { id: '900002/berta-birke', name: 'Berta Birke' }, // cell 0-1
	wally: { id: '900010/wally-wrong', name: 'Wally Wrong' } // correct in no cell
};

/** Game board on the start page, addressed as users do: via roles and visible texts. */
export class Game {
	constructor(readonly page: Page) {}

	/** Cell in row `row`, column `col` (0-based); its name states row, column and state. */
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

	/** Open a cell and enter a player (mouse or touch). */
	async answer(row: number, col: number, name: string) {
		// After a correct answer the dialog closes only after a short delay
		await expect(this.dialog).toBeHidden();
		await this.cell(row, col).click();
		await this.choose(name);
	}

	/** Search for a player in the open dialog and press "Auswählen" (select). */
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
		// Browser and server (DELDOKU_TEST_TODAY) play on the same day; timers keep running normally
		await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00Z`));
		await page.goto('./');
		const game = new Game(page);
		await expect(game.cell(2, 2)).toBeVisible();
		await use(game);
	}
});

export { expect };

<script lang="ts">
	import type { DELPlayer, DELDokuChallenge } from '$lib/data';
	import { validatePlayerMatch } from '$lib/data';
	import { playersStore, languageStore } from '$lib/stores';
	import { t } from '$lib/i18n';
	import GameCell from './GameCell.svelte';
	import PlayerSearch from './PlayerSearch.svelte';
	import { gameStore, statsStore } from '$lib/stores';

	interface Props {
		rowCategories: string[];
		colCategories: string[];
		grid: (DELPlayer | null)[][];
		challenge: DELDokuChallenge;
	}

	let { rowCategories, colCategories, grid: initialGrid, challenge }: Props = $props();

	// Create local reactive grid instead of using prop
	let gameGrid = $state<(DELPlayer | null)[][]>([
		[null, null, null],
		[null, null, null],
		[null, null, null]
	]);

	let selectedCell: [number, number] | null = $state(null);
	let feedback = $state<string>('');
	let correctCells = $state<string[]>([]);
	let incorrectCells = $state<string[]>([]);
	let playerSearchComponent: any = $state(null);
	let isAutoSubmitting = $state(false);
	let answersGiven = $state(0); // Zählt alle Antworten (richtig oder falsch)

	// Derived state: Liste der verwendeten Spieler-IDs
	let usedPlayerIds = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).map(p => p!.id);
	});

	// Derived state: Anzahl gefüllter Zellen (egal ob richtig oder falsch)
	let filledCells = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).length;
	});

	function getCellKey(row: number, col: number): string {
		return `${row}-${col}`;
	}

	function addCorrectCell(key: string) {
		if (!correctCells.includes(key)) {
			correctCells = [...correctCells, key];
		}
		incorrectCells = incorrectCells.filter((k) => k !== key);
	}

	function addIncorrectCell(key: string) {
		if (!incorrectCells.includes(key)) {
			incorrectCells = [...incorrectCells, key];
		}
		correctCells = correctCells.filter((k) => k !== key);
	}

	function handlePlayerSelect(player: DELPlayer) {
		if (selectedCell) {
			const [row, col] = selectedCell;
			const isCorrect = validatePlayerMatch(
				player,
				challenge.answers,
				row,
				col
			);

			console.log('Validating:', player.name, 'at', row, col, '- Correct:', isCorrect);

			// Inkrementiere Antwort-Counter (für alle Antworten, richtig oder falsch)
			answersGiven++;
			console.log('Answers given:', answersGiven);

			const cellKey = getCellKey(row, col);
			
			if (isCorrect) {
				// Nur richtige Antworten in die Zelle eintragen
				gameGrid[row][col] = player;
				gameGrid = gameGrid; // Trigger reactivity

				addCorrectCell(cellKey);
				feedback = `✓ Richtig! ${player.name}`;
			} else {
				feedback = `✗ Falsch! ${player.name} passt nicht hier.`;
				addIncorrectCell(cellKey);
			}

			selectedCell = null;
			setTimeout(() => {
				feedback = '';
			}, 3000);

			// Überprüfe, ob 9 Antworten gegeben wurden
			if (answersGiven === 9 && !isAutoSubmitting) {
				console.log('9 answers given - auto-submitting...');
				isAutoSubmitting = true;
				setTimeout(() => {
					submitSolution();
					isAutoSubmitting = false;
				}, 100);
			}
		}
	}

	function submitSolution() {
		let correctCount = 0;
		const playerSelections: Record<string, string> = {};

		// Überprüfe alle 9 Zellen
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 3; col++) {
				const cellKey = getCellKey(row, col);
				const player = gameGrid[row][col];

				// Speichere Spielerauswahl (oder leerer String wenn leer)
				playerSelections[cellKey] = player ? player.id : '';

				if (player) {
					// Zelle ist gefüllt - prüfe ob korrekt
					const isCorrect = validatePlayerMatch(
						player,
						challenge.answers,
						row,
						col
					);

					if (isCorrect) {
						correctCount++;
						addCorrectCell(cellKey);
					} else {
						addIncorrectCell(cellKey);
					}
				} else {
					// Zelle ist leer - zählt als falsch
					addIncorrectCell(cellKey);
				}
			}
		}

		// Gebe Feedback
		if (correctCount === 9) {
			feedback = t('correctAnswer', $languageStore);
			statsStore.addGame(true, playerSelections);
		} else {
			feedback = `⏁ ${correctCount}/9 ${t('partialAnswer', $languageStore)}`;
			statsStore.addGame(false, playerSelections);
		}

		setTimeout(() => {
			feedback = '';
		}, 4000);
	}
</script>

<div class="w-full flex flex-col items-center">
	<div class="mb-6 text-center">
		<h1 class="text-2xl sm:text-3xl font-bold mb-4">{t('title', $languageStore)}</h1>
		<p class="text-sm sm:text-base text-gray-600">{t('subtitle', $languageStore)}</p>
	</div>

	<div class="mb-6 p-4 bg-blue-50 rounded-lg w-full max-w-2xl px-3 sm:px-4">
		<PlayerSearch bind:this={playerSearchComponent} onPlayerSelect={handlePlayerSelect} usedPlayerIds={usedPlayerIds} />
	</div>

	<!-- Game Grid -->
	<div class="inline-block bg-white shadow-lg rounded-lg overflow-hidden mb-6 max-w-full">
		<!-- Header with column categories -->
		<div class="flex">
			<div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-gray-200 flex items-center justify-center font-bold text-center text-xs p-2">
			</div>
			{#each colCategories as colCat}
				<div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center font-bold text-center bg-gray-100 text-xs sm:text-sm p-2">
					{colCat}
				</div>
			{/each}
		</div>

		<!-- Grid rows -->
		{#each rowCategories as rowCat, rowIdx}
			<div class="flex">
				<div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center font-bold text-center bg-gray-100 text-xs sm:text-sm p-2">
					{rowCat}
				</div>
				{#each colCategories as colCat, colIdx}
					<div class="">
						<GameCell
							rowCategory={rowCat}
							colCategory={colCat}
							player={gameGrid[rowIdx][colIdx]}
							onCellClick={() => {
								selectedCell = [rowIdx, colIdx];
								playerSearchComponent?.focusInput();
								console.log('Cell clicked:', rowIdx, colIdx, 'selectedCell now:', selectedCell);
							}}
							isSelected={selectedCell?.[0] === rowIdx && selectedCell?.[1] === colIdx}
							isCorrect={correctCells.includes(getCellKey(rowIdx, colIdx))}
							isIncorrect={incorrectCells.includes(getCellKey(rowIdx, colIdx))}
						/>
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Correct cells counter -->
	<div class="mt-6 text-center text-sm text-gray-600">
		{answersGiven}/9 {t('answersGiven', $languageStore)}
	</div>

	<!-- Feedback Message -->
	{#if feedback}
		<div
			class={`mt-6 p-4 rounded-lg font-semibold w-full max-w-2xl text-center ${correctCells.length === 9 ? 'bg-green-100 text-green-800' : feedback.startsWith('✓') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
		>
			{feedback}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="w-full max-w-2xl space-y-3 mt-6">
		<button
			onclick={submitSolution}
			class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
		>
			{t('submitSolution', $languageStore)}
		</button>
		
		<button
			onclick={() => {
				gameGrid = [
					[null, null, null],
					[null, null, null],
					[null, null, null]
				];
				correctCells = [];
				incorrectCells = [];
				selectedCell = null;
				feedback = '';
				answersGiven = 0; // Reset counter
			}}
			class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
		>
			{t('restartGame', $languageStore)}
		</button>
	</div>
</div>

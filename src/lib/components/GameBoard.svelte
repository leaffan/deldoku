<script lang="ts">
	import type { DELPlayer, PuckdokuChallenge } from '$lib/data';
	import { validatePlayerMatch, samplePlayers } from '$lib/data';
	import GameCell from './GameCell.svelte';
	import PlayerSearch from './PlayerSearch.svelte';
	import { gameStore, statsStore } from '$lib/stores';

	interface Props {
		rowCategories: string[];
		colCategories: string[];
		grid: (DELPlayer | null)[][];
		challenge: PuckdokuChallenge;
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
				rowCategories[row],
				colCategories[col],
				challenge.answers,
				row,
				col,
				samplePlayers
			);

			console.log('Validating:', player.name, 'at', row, col, '- Correct:', isCorrect);

			if (isCorrect) {
				// Directly mutate the grid and trigger reactivity
				gameGrid[row][col] = player;
				gameGrid = gameGrid; // Trigger reactivity

				const cellKey = getCellKey(row, col);
				addCorrectCell(cellKey);
				feedback = `✓ Richtig! ${player.name}`;

				// Überprüfe ob alle Zellen richtig gefüllt sind
				if (correctCells.length === 9) {
					feedback = '🎉 Glückwunsch! Rätsel gelöst!';
					const endTime = Date.now();
					const startTime = Date.now() - 60000;
					const timeMs = endTime - startTime;
					statsStore.addGame(true, timeMs);
				}
			} else {
				feedback = `✗ Falsch! ${player.name} passt nicht hier.`;
				const cellKey = getCellKey(row, col);
				addIncorrectCell(cellKey);
			}

			selectedCell = null;
			setTimeout(() => {
				feedback = '';
			}, 3000);
		}
	}
</script>

<div class="w-full max-w-2xl">
	<div class="mb-6">
		<h1 class="text-3xl font-bold mb-4">DEL Puckdoku</h1>
		<p class="text-gray-600">Finde die Spieler basierend auf Team- und Positionskombinationen!</p>
	</div>

	{#if feedback}
		<div
			class={`mb-6 p-4 rounded-lg font-semibold ${correctCells.length === 9 ? 'bg-green-100 text-green-800' : feedback.startsWith('✓') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
		>
			{feedback}
		</div>
	{/if}

	<div class="mb-6 p-4 bg-blue-50 rounded-lg">
		<PlayerSearch onPlayerSelect={handlePlayerSelect} />
		<div class="text-sm text-gray-600 mt-2">{correctCells.length}/9 Zellen korrekt gefüllt</div>
	</div>

	<!-- Game Grid -->
	<div class="inline-block bg-white shadow-lg rounded-lg overflow-hidden">
		<!-- Header with column categories -->
		<div class="flex">
			<div class="w-28 h-28 bg-gray-200 flex items-center justify-center font-bold text-center text-xs p-2">
			</div>
			{#each colCategories as colCat}
				<div class="w-28 h-28 flex items-center justify-center font-bold text-center bg-gray-100 text-sm p-2">
					{colCat}
				</div>
			{/each}
		</div>

		<!-- Grid rows -->
		{#each rowCategories as rowCat, rowIdx}
			<div class="flex">
				<div class="w-28 h-28 flex items-center justify-center font-bold text-center bg-gray-100 text-sm p-2">
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

	<!-- Submit Button -->
	<div class="mt-6">
		<button
			onclick={() => {
				if (correctCells.length === 9) {
					gameStore.markSolved?.();
				} else {
					feedback = `Noch ${9 - correctCells.length} Zellen zu füllen!`;
					setTimeout(() => {
						feedback = '';
					}, 2000);
				}
			}}
			class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
		>
			Lösung einreichen
		</button>
	</div>
</div>

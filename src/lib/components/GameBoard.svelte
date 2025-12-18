<script lang="ts">
	import type { DELPlayer, DELDokuChallenge } from '$lib/data';
	import { validatePlayerMatch, getApiBasePath } from '$lib/data';
	import { playersStore, languageStore } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { debug } from '$lib/debug';
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
	let incorrectPlayersByCell = $state<Record<string, string[]>>({}); // Falsche Spieler pro Zelle
	let playerSearchComponent: any = $state(null);
	let isAutoSubmitting = $state(false);
	let answersGiven = $state(0); // Zählt alle Antworten (richtig oder falsch)
	let currentScore = $state<number>(0); // Aktuelle Punktzahl
	let cellScores = $state<Record<string, number>>({}); // Punkte pro Zelle
	let cachedStats: Record<string, any> | null = null; // Zwischenspeicher für Stats
	let gameFinished = $state(false); // Ob das Spiel beendet wurde

	// Derived state: Liste der verwendeten Spieler-IDs
	let usedPlayerIds = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).map(p => p!.id);
	});

	// Derived state: Anzahl gefüllter Zellen (egal ob richtig oder falsch)
	let filledCells = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).length;
	});

	// Lade Stats beim Mounting der Komponente
	async function preloadStats() {
		if (!cachedStats) {
			try {
				const apiPath = getApiBasePath();
				const response = await fetch(`${apiPath}api/stats`);
				cachedStats = await response.json();
				debug('📥 Stats vorab geladen und gecached');
			} catch (error) {
				console.error('Error preloading stats:', error);
			}
		}
	}

	// Stats beim Laden der Seite vorladen
	$effect(() => {
		preloadStats();
	});

	// Fokussiere das Eingabefeld wenn eine Zelle ausgewählt wird
	$effect(() => {
		if (selectedCell !== null) {
			setTimeout(() => {
				playerSearchComponent?.focusInput();
			}, 100);
		}
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

	async function handlePlayerSelect(player: DELPlayer) {
		if (selectedCell) {
			const [row, col] = selectedCell;
			const isCorrect = validatePlayerMatch(
				player,
				challenge.answers,
				row,
				col
			);

			debug('Validating:', player.name, 'at', row, col, '- Correct:', isCorrect);

			// Inkrementiere Antwort-Counter (für alle Antworten, richtig oder falsch)
			answersGiven++;
			debug('Answers given:', answersGiven);

			const cellKey = getCellKey(row, col);
			
			if (isCorrect) {
				// Nur richtige Antworten in die Zelle eintragen
				gameGrid[row][col] = player;
				gameGrid = gameGrid; // Trigger reactivity

				addCorrectCell(cellKey);
				feedback = `✓ Richtig! ${player.name}`;
				playerSearchComponent?.showFeedback(true);
				
				// Berechne Score nur für diese eine Zelle
				await updateScoreForCell(cellKey, player.id);
			
			// Overlay verzögert schließen bei richtiger Antwort
			setTimeout(() => {
				selectedCell = null;
			}, 600);
		} else {
			feedback = `✗ Falsch! ${player.name} passt nicht hier.`;
			addIncorrectCell(cellKey);
			playerSearchComponent?.showFeedback(false);			// Speichere falsche Antwort für diese Zelle
			if (!incorrectPlayersByCell[cellKey]) {
				incorrectPlayersByCell[cellKey] = [];
			}
			if (!incorrectPlayersByCell[cellKey].includes(player.id)) {
				incorrectPlayersByCell[cellKey] = [...incorrectPlayersByCell[cellKey], player.id];
			}			// Overlay bleibt offen bei falscher Antwort
		}

		setTimeout(() => {
			feedback = '';
		}, 3000);

		// Überprüfe, ob 9 Antworten gegeben wurden
		if (answersGiven === 9 && !isAutoSubmitting) {
			debug('9 answers given - auto-submitting...');
			isAutoSubmitting = true;
			setTimeout(() => {
				submitSolution();
				isAutoSubmitting = false;
			}, 800);
		}
		}
	}

	async function updateScoreForCell(cellKey: string, playerId: string) {
		// Lade Stats nur beim ersten Mal, danach aus Cache
		if (!cachedStats) {
			const apiPath = getApiBasePath();
			const response = await fetch(`${apiPath}api/stats`);
			cachedStats = await response.json();
			debug('📥 Stats geladen und gecached');
		}
		const allStats = cachedStats;

		// Zähle wie oft dieser Spieler in dieser Position verwendet wurde
		const usageCounts: Record<string, number> = {};
		
		// Durchlaufe alle Spielerstatistiken
		Object.values(allStats).forEach((stats: any) => {
			stats.gameHistory?.forEach((game: any) => {
				const playerInCell = game.playerSelections?.[cellKey];
				if (playerInCell && playerInCell !== '') {
					usageCounts[playerInCell] = (usageCounts[playerInCell] || 0) + 1;
				}
			});
		});

		// Berechne Gesamtzahl aller Antworten für diese Zelle
		const totalAnswers = Object.values(usageCounts).reduce((sum, count) => sum + count, 0) || 1;
		const usageCount = usageCounts[playerId] || 0;
		
		// Dynamische Formel: 100 * (1 - usageCount / totalAnswers), Minimum 10 Punkte
		const score = Math.max(10, Math.round(100 * (1 - usageCount / totalAnswers)));
		
		// Update Score und cellScores
		cellScores[cellKey] = score;
		currentScore += score;
		
		debug(`Score für ${cellKey}: ${playerId} → ${usageCount}/${totalAnswers} Verwendungen = ${score} Punkte (Total: ${currentScore})`);
	}

	async function submitSolution() {
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

		// Gebe Feedback und füge Bonus hinzu
		const won = correctCount === 9;
		gameFinished = true; // Spiel ist beendet
		if (won) {
			feedback = t('correctAnswer', $languageStore);
			// Bonus für gewonnene Spiele: 100 Punkte extra
			currentScore += 100;
			debug(`🎉 Spiel gewonnen! Bonus +100 Punkte → Total: ${currentScore}/1000`);
		} else {
			feedback = `⏁ ${correctCount}/9 ${t('partialAnswer', $languageStore)}`;
		}
		
		// Speichere das Spiel in den Stats (Score ist bereits berechnet)
		await statsStore.addGame(won, playerSelections, currentScore, cellScores);

		setTimeout(() => {
			feedback = '';
		}, 4000);
	}
</script>

<div class="w-full flex flex-col items-center">
	<div class="mb-3 text-center">
		<h1 class="text-2xl sm:text-3xl font-bold mb-2">{t('title', $languageStore)}</h1>
	</div>

	<!-- Action Buttons (above game board) -->
	<div class="mb-2 flex items-stretch gap-2 w-80 sm:w-96 md:w-112 mx-auto">
		<button
			onclick={submitSolution}
			disabled={gameFinished}
			class="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-2 rounded-lg transition-colors text-sm whitespace-nowrap"
		>
			{t('submitSolution', $languageStore)}
		</button>
		
		<button
			onclick={async () => {
				gameGrid = [
					[null, null, null],
					[null, null, null],
					[null, null, null]
				];
				correctCells = [];
				incorrectCells = [];
				incorrectPlayersByCell = {}; // Reset incorrect players
				selectedCell = null;
				feedback = '';
				answersGiven = 0; // Reset counter
				currentScore = 0; // Reset score
				cellScores = {}; // Reset cell scores
				cachedStats = null; // Reset cache
				gameFinished = false; // Reset game state
				await preloadStats(); // Stats neu laden
			}}
			class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-2 rounded-lg transition-colors text-sm whitespace-nowrap"
		>
			{t('restartGame', $languageStore)}
		</button>
	</div>

	<!-- Game Grid -->
	<div class="inline-block bg-white shadow-lg rounded-lg overflow-hidden max-w-full">
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
								debug('Cell clicked:', rowIdx, colIdx, 'selectedCell now:', selectedCell);
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

	<!-- Counter and Score Display (below game board) -->
	<div class="mt-2 flex items-stretch gap-2 w-80 sm:w-96 md:w-112 mx-auto">
		<div class={`flex-1 p-2 rounded-lg ${gameFinished ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 border-2 border-gray-300'}`}>
			<div class={`text-xs sm:text-sm ${gameFinished ? 'font-bold text-blue-800' : 'font-semibold text-gray-700'} text-center whitespace-nowrap`}>
				{t('answersGiven', $languageStore)}: {answersGiven} / 9
			</div>
		</div>
		
		<div class={`flex-1 p-2 rounded-lg ${gameFinished ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 border-2 border-gray-300'}`}>
			<div class={`text-xs sm:text-sm ${gameFinished ? 'font-bold text-blue-800' : 'font-semibold text-gray-700'} text-center whitespace-nowrap`}>
				{t('score', $languageStore)}: {currentScore} / 1000
			</div>
		</div>
	</div>

	<!-- Overlay für Spielereingabe -->
	{#if selectedCell !== null}
		<div 
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					selectedCell = null;
				}
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					selectedCell = null;
				}
			}}
		>
			<div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
				<div class="mb-4">
					<h2 class="text-lg font-bold text-gray-800 mb-2 text-center">Spieler auswählen</h2>
					<div class="text-sm text-gray-600 text-center">
						<span class="font-semibold">Zeile:</span> {rowCategories[selectedCell[0]]} · 
						<span class="font-semibold">Spalte:</span> {colCategories[selectedCell[1]]}
					</div>
				</div>
				<PlayerSearch 
					bind:this={playerSearchComponent} 
					onPlayerSelect={handlePlayerSelect} 
					usedPlayerIds={usedPlayerIds}
					incorrectPlayerIds={selectedCell ? (incorrectPlayersByCell[getCellKey(selectedCell[0], selectedCell[1])] || []) : []}
				/>
				<button
					onclick={() => selectedCell = null}
					class="mt-4 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
				>
					Abbrechen (ESC)
				</button>
			</div>
		</div>
	{/if}
</div>

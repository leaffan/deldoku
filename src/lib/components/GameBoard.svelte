<script lang="ts">
	import type { DELPlayer, DELDokuChallenge } from '$lib/data';
	import { validatePlayerMatch, getApiBasePath } from '$lib/data';
	import { playersStore, languageStore } from '$lib/stores';
	import { t, translations, c, categories } from '$lib/i18n';
	import { pngLogoCategories } from '$lib/pngLogoCategories';
	import { debug } from '$lib/debug';
	import GameCell from './GameCell.svelte';
	import PlayerSearch from './PlayerSearch.svelte';
	import { statsStore } from '$lib/stores';
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';

	interface Props {
		rowCategories: string[];
		colCategories: string[];
		grid: (DELPlayer | null)[][];
		challenge: DELDokuChallenge;
	}

	let showRules = $state(false); // For rules modal visibility
	let { rowCategories, colCategories, grid: initialGrid, challenge }: Props = $props();

	// Create local reactive grid instead of using prop
	let gameGrid = $state<(DELPlayer | null)[][]>([
		[null, null, null],
		[null, null, null],
		[null, null, null]
	]);

	let selectedCell: [number, number] | null = $state(null);
	let correctCells = $state<string[]>([]);
	let incorrectCells = $state<string[]>([]);
	let incorrectPlayersByCell = $state<Record<string, string[]>>({}); // Incorrect players per cell
	let playerSearchComponent: any = $state(null);
	let isAutoSubmitting = $state(false);
	let answersGiven = $state(0); // Counts all answers (correct or incorrect)
	let currentScore = $state<number>(0); // Current score
	let flashAnswers = $state(false); // For flash animation on answers
	let flashScore = $state(false); // For flash animation on score
	let cellScores = $state<Record<string, number>>({}); // Points per cell
	let cachedStats: Record<string, any> | null = null; // Cache for stats
	let gameFinished = $state(false); // Whether the game is finished

	function formatDate(dateStr: string, lang: string): string {
		if (!dateStr) return '';
		const [y, m, d] = dateStr.split('-');
		if (lang === 'de') return `${d}.${m}.${y}`;
		return `${y}-${m}-${d}`;
	}

	// Emoji für grün/rot (🟩/🟥) oder Unicode-Quadrate
	const GREEN = '🟩';
	const RED = '🟥';

	// Entwickler-Template für das Ergebnis. Hier editierbar:
	const resultTemplate = ({
		grid,
		score,
		t,
		$languageStore,
		date
	}: {
		grid: string;
		score: number;
		t: (key: string, lang: string) => string;
		$languageStore: string;
		date: string;
	}) =>
`DELDoku ${formatDate(date, $languageStore)}\n 
${grid}\n
${t('score', $languageStore)}: ${score} / 1000\n
#DELDoku
https://www.leaffan.net/deldoku
`;

	function generateResultText() {
		// 3x3-Gitter mit grünen/roten Quadraten je nach Korrektheit
		let grid = '';
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 3; col++) {
				const cellKey = getCellKey(row, col);
				grid += correctCells.includes(cellKey)
					? GREEN
					: (gameGrid[row][col] ? RED : '⬜'); // Leere Zellen als weißes Quadrat
			}
			if (row < 2) grid += '\n';
		}
		const date = challenge?.date || '';
		return resultTemplate({ grid, score: currentScore, t, $languageStore, date });
	}

	function copyResultToClipboard() {
		const text = generateResultText();
		navigator.clipboard.writeText(text);
	}



	// Derived state: list of used player IDs
	let usedPlayerIds = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).map(p => p!.id);
	});

	// Logo loading state: map of slug -> boolean (true if logo exists)
	let logoMap: Record<string, string | null> = $state<Record<string, string>>({});

	function getCategoryName(category: string): string {
		const lang = $languageStore === 'de' ? 'de' : 'en';
		const categoryNames = categories[lang];
		return categoryNames[category as keyof typeof categoryNames] || category; // Fallback to original if no mapping exists
	}

	async function findLogo(category: string) {
		const appBase = import.meta.env.BASE_URL || '/';
		let extension = ""
		if (pngLogoCategories.includes(category)) {
			extension = '.png';
		} else {
			extension = '.svg';
		}
		const logo_template = `img/logos/logo_${category.toUpperCase()}${extension}`;

		function join(prefix: string, path: string) {
			return `${prefix.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
		}

		const url = join(appBase, logo_template);
		try {
			const resp = await fetch(url, { method: 'HEAD' });
			if (resp.ok) {
				debug('Found logo URL', url, 'for category', category);
				logoMap = { ...logoMap, [category]: url };
				return;
			}
		} catch (e) {
			debug('No logo found for', category);
			logoMap = { ...logoMap, [category]: null };
		}
	}

	onMount(() => {
		// Pre-check logos for all categories (fire-and-forget)
		const cats = new Set<string>([...rowCategories, ...colCategories]);
		cats.forEach((c) => {
			debug('Preloading logo for category:', c);
			if (/^\d/.test(c)) return; // skipping categories starting with a digit
			if (/^WJC/.test(c)) return; // skipping categories starting with a digit
			findLogo(c);
		});
	});

	// Derived state: number of filled cells (correct or incorrect)
	let filledCells = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).length;
	});

	// Load stats when component mounts
	async function preloadStats() {
		if (!cachedStats) {
			try {
				const apiPath = getApiBasePath();
				const response = await fetch(`${apiPath}api/stats`);
				cachedStats = await response.json();
				debug('📥 Stats preloaded and cached');
			} catch (error) {
				console.error('Error preloading stats:', error);
			}
		}
	}

	// Preload stats when page loads
	$effect(() => {
		preloadStats();
	});

	// Focus the input field when a cell is selected
	$effect(() => {
		if (selectedCell !== null) {
			// Direct call without delay for better mobile compatibility
			playerSearchComponent?.focusInput();
		}
	});

	// Focus the overlay when opened (for ESC key)
	$effect(() => {
		if (showRules) {
			setTimeout(() => {
				(document.querySelector('[data-rules-overlay]') as HTMLElement | null)?.focus();
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

			// Increment answer counter (for all answers, correct or incorrect)
			answersGiven++;
			debug('Answers given:', answersGiven);
			
			// Triggere Flash-Animation
			flashAnswers = true;
			setTimeout(() => flashAnswers = false, 400);

			const cellKey = getCellKey(row, col);
			
			if (isCorrect) {
				// Only enter correct answers into the cell
				gameGrid[row][col] = player;
				gameGrid = gameGrid; // Trigger reactivity

				addCorrectCell(cellKey);
				
				// Calculate score only for this cell
				await updateScoreForCell(cellKey, player.id);
				
				// Trigger flash animation for score
				flashScore = true;
				setTimeout(() => flashScore = false, 400);
			
				// Delay closing overlay on correct answer
				setTimeout(() => {
					selectedCell = null;
				}, 600);
			} else {
				addIncorrectCell(cellKey);
				if (!incorrectPlayersByCell[cellKey]) {
					incorrectPlayersByCell[cellKey] = [];
					}
				if (!incorrectPlayersByCell[cellKey].includes(player.id)) {
					incorrectPlayersByCell[cellKey] = [...incorrectPlayersByCell[cellKey], player.id];
				}
				// Keep overlay open on incorrect answer
			}

		// Check if 9 answers have been given
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
			debug('📥 Stats loaded and cached');
		}
		const allStats = cachedStats;

		// Count how often this player was used in this position
		const usageCounts: Record<string, number> = {};
		
		// Iterate all player statistics
		if (allStats) {
			Object.values(allStats).forEach((stats: any) => {
			stats.gameHistory?.forEach((game: any) => {
				const playerInCell = game.playerSelections?.[cellKey];
				if (playerInCell && playerInCell !== '') {
					usageCounts[playerInCell] = (usageCounts[playerInCell] || 0) + 1;
				}
			});
		});
		}

		// Calculate total number of answers for this cell
		const totalAnswers = Object.values(usageCounts).reduce((sum, count) => sum + count, 0) || 1;
		const usageCount = usageCounts[playerId] || 0;
		
		// Dynamic formula: 100 * (1 - usageCount / totalAnswers), minimum 10 points
		const score = Math.max(10, Math.round(100 * (1 - usageCount / totalAnswers)));
		
		// Update score and cellScores
		cellScores[cellKey] = score;
		currentScore += score;
		
		debug(`Score for ${cellKey}: ${playerId} → ${usageCount}/${totalAnswers} usages = ${score} points (Total: ${currentScore})`);
	}

	async function submitSolution() {
		let correctCount = 0;
		const playerSelections: Record<string, string> = {};

		// Check all 9 cells
		for (let row = 0; row < 3; row++) {
			for (let col = 0; col < 3; col++) {
				const cellKey = getCellKey(row, col);
				const player = gameGrid[row][col];

				// Store player selection (or empty string if empty)
				playerSelections[cellKey] = player ? player.id : '';

				if (player) {
					// Cell is filled - check if correct
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
					// Cell is empty - counts as incorrect
					addIncorrectCell(cellKey);
				}
			}
		}

		const won = correctCount === 9;
		gameFinished = true; // Game is finished
		if (won) {
			// Bonus for won games: 100 extra points
			currentScore += 100;
			debug(`🎉 Game won! Bonus +100 points → Total: ${currentScore}/1000`);
		}
		
		// Store the game in stats (score is already calculated)
		await statsStore.addGame(won, playerSelections, currentScore, cellScores);
	}
</script>

<div class="w-full flex flex-col items-center">
	<div class="mb-3 text-center">
		<!-- svelte-ignore a11y_missing_attribute -->
		<img src="{resolve('/img/deldoku.png')}" alt="DELDoku Logo" class="h-20 sm:h-28 md:h-32 w-auto mx-auto mb-2" />
		<!-- <h1 class="text-2xl sm:text-3xl font-bold mb-2">{t('title', $languageStore)}</h1> -->
		{#if challenge?.title}
			<p class="text-sm text-gray-600 mb-1 flex flex-wrap justify-center items-center gap-2">
				<span class="font-medium text-gray-500">{t('todaysTopic', $languageStore)}:</span>
				<span><b>{challenge.title}</b></span>
			</p>
		{/if}
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
				<!-- {@const slug = slugify(colCat)} -->
				<div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center font-bold text-center bg-gray-100 text-xs sm:text-sm p-2">
					{#if logoMap[colCat]}
						<img src={logoMap[colCat]} alt={colCat} class="h-14 w-auto" title={getCategoryName(colCat)} />
					{:else}
						{getCategoryName(colCat)}
					{/if}
				</div>
			{/each}
		</div>

		<!-- Grid rows -->
		{#each rowCategories as rowCat, rowIdx}
			<!-- {@const rslug = slugify(rowCat)} -->
			<div class="flex">
				<div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center font-bold text-center bg-gray-100 text-xs sm:text-sm p-2">
					{#if logoMap[rowCat]}
						<img src="{logoMap[rowCat]}" alt="{rowCat}" class="h-14 w-auto" title={getCategoryName(rowCat)} />
					{:else}
						{getCategoryName(rowCat)}
					{/if}
				</div>
				{#each colCategories as colCat, colIdx}
					<div class="">
						<GameCell
							rowCategory={rowCat}
							colCategory={colCat}
							player={gameGrid[rowIdx][colIdx]}
							onCellClick={() => {
								// Prevent input if game is finished
								if (gameFinished) return;
								
								// Prevent input in cells with correct answers
								const cellKey = getCellKey(rowIdx, colIdx);
								if (correctCells.includes(cellKey)) return;
								
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
	<div class="mt-4 flex items-stretch gap-2 w-80 sm:w-96 md:w-112 mx-auto">
		<div class={`flex-1 p-2 rounded-lg transition-all ${flashAnswers ? 'scale-105 ring-2 ring-blue-500' : ''} ${gameFinished ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 border-2 border-gray-300'}`}>
			<div class={`text-xs sm:text-sm ${gameFinished ? 'font-bold text-blue-800' : 'font-semibold text-gray-700'} text-center whitespace-nowrap`}>
				{t('answersGiven', $languageStore)}: {answersGiven} / 9
			</div>
		</div>
		
		<div class={`flex-1 p-2 rounded-lg transition-all ${flashScore ? 'scale-105 ring-2 ring-green-500' : ''} ${gameFinished ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 border-2 border-gray-300'}`}>
			<div class={`text-xs sm:text-sm ${gameFinished ? 'font-bold text-blue-800' : 'font-semibold text-gray-700'} text-center whitespace-nowrap`}>
				{t('score', $languageStore)}: {currentScore} / 1000
			</div>
		</div>
	</div>

	{#if gameFinished}
		   <div class="mt-4 flex items-stretch gap-2 w-80 sm:w-96 md:w-112 mx-auto">
			   <button
				   class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 text-sm sm:text-base rounded-lg transition-colors"
				   style="width:100%"
				   onclick={copyResultToClipboard}
			   >
				{t('shareResult', $languageStore)}
			   </button>
		   </div>
	{/if}

	<!-- Overlay for player input -->
	{#if selectedCell !== null}
		<div 
			role="dialog"
			aria-modal="true"
			tabindex="-1"
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
					<h2 class="text-lg font-bold text-gray-800 mb-2 text-center">{t('selectPlayer', $languageStore)}</h2>
					<div class="text-sm text-gray-600 text-center">
					<span class="font-semibold">{t('row', $languageStore)}:</span> {getCategoryName(rowCategories[selectedCell[0]])} · 
					<span class="font-semibold">{t('column', $languageStore)}:</span> {getCategoryName(colCategories[selectedCell[1]])}
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
					{t('cancel', $languageStore)} (ESC)
				</button>
			</div>
		</div>
	{/if}
</div>

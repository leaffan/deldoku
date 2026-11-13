<script lang="ts">
	import type { DELPlayer, DELDokuChallenge } from '$lib/data';
	import { validatePlayerMatch, getStatsApiUrl } from '$lib/data';
	import { playersStore, languageStore } from '$lib/stores';
	import { t, translations, c, categories, type Language } from '$lib/i18n';
	import { pngLogoCategories } from '$lib/pngLogoCategories';
	import { debug } from '$lib/debug';
	import GameCell from './GameCell.svelte';
	import PlayerSearch from './PlayerSearch.svelte';
	import { statsStore } from '$lib/stores';
	import { onMount, tick } from 'svelte';
	import { asset } from '$app/paths';
	import { modalDialog, countryName } from '$lib/a11y';

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
	let dayCounts: Record<string, Record<string, number>> | null = null; // Antwortzählung des Tages pro Zelle
	let gameFinished = $state(false); // Whether the game is finished
	let saveFailed = $state(false); // Ergebnis konnte nicht auf dem Server gespeichert werden

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
		$languageStore,
		date
	}: {
		grid: string;
		score: number;
		$languageStore: Language;
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
				// Grün = richtig, Rot = nur falsche Versuche, Weiß = nicht beantwortet
				grid += correctCells.includes(cellKey)
					? GREEN
					: (incorrectPlayersByCell[cellKey]?.length ? RED : '⬜');
			}
			if (row < 2) grid += '\n';
		}
		const date = challenge?.date || '';
		return resultTemplate({ grid, score: currentScore, $languageStore, date });
	}

	let shareStatus = $state<'copied' | 'failed' | null>(null);
	let shareStatusTimeout: ReturnType<typeof setTimeout> | null = null;

	async function copyResultToClipboard() {
		try {
			await navigator.clipboard.writeText(generateResultText());
			shareStatus = 'copied';
		} catch (error) {
			console.error('Error copying result:', error);
			shareStatus = 'failed';
		}
		if (shareStatusTimeout) clearTimeout(shareStatusTimeout);
		shareStatusTimeout = setTimeout(() => (shareStatus = null), 2000);
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

	function getChallengeTitle(): string {
		if (!challenge?.title) return '';
		if (typeof challenge.title === 'string') return challenge.title;
		// If title is an object with language keys
		const lang = $languageStore === 'de' ? 'de' : 'en';
		return challenge.title[lang] || challenge.title.en || '';
	}

	async function findLogo(category: string) {
		const appBase = import.meta.env.BASE_URL || '/';
		let extension = "";
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
			if (/^WJC/.test(c)) return; // skipping categories starting with WJC
			if (c.toUpperCase() !== 'OG' && /^[a-zA-Z]{2}$/.test(c)) return; // keine Logo-Suche für ISO-Ländercode
			findLogo(c);
		});
	});

	// Derived state: number of filled cells (correct or incorrect)
	let filledCells = $derived.by(() => {
		return gameGrid.flat().filter(p => p !== null).length;
	});

	// Tageszählung für die vorläufige Punkteanzeige laden; verbindlich sind die Punkte vom Server
	async function loadDayCounts() {
		if (dayCounts) return;
		try {
			const fallback = challenge.isFallback ? '&challenge=fallback' : '';
			const response = await fetch(`${getStatsApiUrl()}?date=${challenge.date}${fallback}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			dayCounts = data.cells ?? {};
			debug('📥 Day counts loaded');
		} catch (error) {
			console.error('Error loading day counts:', error);
			dayCounts = {};
		}
	}

	$effect(() => {
		loadDayCounts();
	});

	// Focus the input field when a cell is selected
	$effect(() => {
		if (selectedCell !== null) {
			// Direct call without delay for better mobile compatibility
			playerSearchComponent?.focusInput();
		}
	});

	// Zugänglicher Name einer Zelle: Zeile, Spalte und Zustand (nicht nur über die Farbe erkennbar)
	function getCellLabel(rowIdx: number, colIdx: number): string {
		const key = getCellKey(rowIdx, colIdx);
		const state = correctCells.includes(key)
			? `${t('cellCorrect', $languageStore)}: ${gameGrid[rowIdx][colIdx]?.name ?? ''}`
			: incorrectCells.includes(key) ? t('cellIncorrect', $languageStore) : t('cellOpen', $languageStore);
		return `${t('row', $languageStore)} ${getCategoryName(rowCategories[rowIdx])}, ${t('column', $languageStore)} ${getCategoryName(colCategories[colIdx])}: ${state}`;
	}

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
		// Nach der 9. Antwort bzw. Abgabe keine weiteren Antworten annehmen
		if (gameFinished || answersGiven >= 9) return;
		if (selectedCell) {
			const [row, col] = selectedCell;
			const isCorrect = validatePlayerMatch(
				player,
				challenge.answers,
				row,
				col
			);

			debug('Validating:', player.name, 'at', row, col, '- Correct:', isCorrect);
			playerSearchComponent?.showFeedback(isCorrect);

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
		await loadDayCounts();
		const usageCounts: Record<string, number> = dayCounts?.[cellKey] ?? {};

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
		if (gameFinished) return; // Doppelte Abgabe (Button + automatische Abgabe) verhindern
		selectedCell = null; // Offenes Suchfenster schließen
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
		
		try {
			const result = await statsStore.submitGame(challenge.date, playerSelections, challenge.isFallback);
			currentScore = result.score;
			cellScores = result.cellScores;
		} catch (error) {
			// Ohne Server bleibt die vorläufige Punktzahl stehen
			console.error('Error submitting game:', error);
			saveFailed = true;
		}
		dayCounts = null; // Nächstes Spiel mit aktueller Zählung
	}
</script>

<div class="w-full flex flex-col items-center">
	<div class="mb-3 text-center">
		<img src={asset('/img/deldoku.png')} alt="DELDoku Logo" class="h-20 sm:h-28 md:h-32 w-auto mx-auto mb-2" />
		<!-- <h1 class="text-2xl sm:text-3xl font-bold mb-2">{t('title', $languageStore)}</h1> -->
		{#if challenge?.title}
			<p class="text-sm text-gray-600 mb-1 flex flex-wrap justify-center items-center gap-2">
				<span class="font-medium text-gray-500">{t('todaysTopic', $languageStore)}:</span>
				<span><b>{getChallengeTitle()}</b></span>
			</p>
		{/if}
	</div>

	<!-- Action Buttons (above game board) -->
	<div class="mb-2 flex items-stretch gap-2 w-80 sm:w-96 md:w-112 mx-auto">
		<button
			onclick={submitSolution}
			disabled={gameFinished || answersGiven === 0}
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
				dayCounts = null;
				gameFinished = false; // Reset game state
				saveFailed = false;
				await loadDayCounts();
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
						<img src={logoMap[colCat]} alt={getCategoryName(colCat)} class="h-14 w-auto" title={getCategoryName(colCat)} />
					{:else if /^([a-zA-Z]{2})$/.test(colCat) }
						<span class={"fi fi-" + colCat.toLowerCase()} role="img" aria-label={countryName(colCat, $languageStore)} title={countryName(colCat, $languageStore)} style="font-size:2.5rem;"></span>
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
						<img src={logoMap[rowCat]} alt={getCategoryName(rowCat)} class="h-14 w-auto" title={getCategoryName(rowCat)} />
					{:else if /^([a-zA-Z]{2})$/.test(rowCat) }
						<span class={"fi fi-" + rowCat.toLowerCase()} role="img" aria-label={countryName(rowCat, $languageStore)} title={countryName(rowCat, $languageStore)} style="font-size:2.5rem;"></span>
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
							label={getCellLabel(rowIdx, colIdx)}
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

	{#if saveFailed}
		<p class="mt-2 text-xs sm:text-sm text-red-600 text-center" role="status">{t('saveFailed', $languageStore)}</p>
	{/if}

	{#if gameFinished}
		   <div class="mt-4 flex items-stretch gap-2 w-80 sm:w-96 md:w-112 mx-auto">
			   <button
				   class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 text-sm sm:text-base rounded-lg transition-colors"
				   style="width:100%"
				   onclick={copyResultToClipboard}
			   >
				<span aria-live="polite">
					{shareStatus === 'copied' ? t('shareCopied', $languageStore)
						: shareStatus === 'failed' ? t('shareFailed', $languageStore)
						: t('shareResult', $languageStore)}
				</span>
			   </button>
		   </div>
	{/if}

	<!-- Overlay for player input -->
	{#if selectedCell !== null}
		<!-- Klick auf den Hintergrund schließt; per Tastatur übernimmt das Escape in modalDialog -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div 
			role="dialog"
			aria-modal="true"
			aria-labelledby="player-dialog-title"
			tabindex="-1"
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
			use:modalDialog={() => (selectedCell = null)}
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					selectedCell = null;
				}
			}}
		>
			<div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
				<div class="mb-4">
					<h2 id="player-dialog-title" class="text-lg font-bold text-gray-800 mb-2 text-center">{t('selectPlayer', $languageStore)}</h2>
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

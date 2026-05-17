<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import { generateDailyChallenge, type DELDokuChallenge } from '$lib/data';
	import { playersStore, languageStore, statsStore } from '$lib/stores';
	import { t } from '$lib/i18n';
	import { getDebugChallenge, isDebugEnabled } from '$lib/debug';

	let showStats = $state(false);
	let showRules = $state(false);
	let challenge = $state<DELDokuChallenge | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Lade Players, Stats und Challenge beim Komponenten-Mount
	Promise.all([
		playersStore.init(),
		statsStore.init()
	])
		.then(async () => {
			let challengeDate: string | null = null;
			if (isDebugEnabled()) {
				challengeDate = getDebugChallenge();
			}
			if (challengeDate) {
				// Challenge-Override: Lade gezielt die Datei
				try {
					const basePath = (typeof window !== 'undefined') ? new URL('.', window.location.href).pathname : '/deldoku/';
					const response = await fetch(`${basePath}challenges/${challengeDate}.json`);
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}
					const challengeData = await response.json();
					const grid = Array(3).fill(null).map(() => Array(3).fill(null));
					challenge = {
						date: challengeDate,
						title: challengeData.title,
						rowCategories: challengeData.rowCategories,
						colCategories: challengeData.colCategories,
						grid,
						answers: challengeData.answers
					};
					loading = false;
					return;
				} catch (err) {
					console.error('Error loading debug challenge:', err);
					error = `${t('error', $languageStore)}${err instanceof Error ? err.message : err}`;
					loading = false;
					return;
				}
			}
			// Standard: Lade die Tages-Challenge
			return generateDailyChallenge([]).then((data) => {
				challenge = data;
				loading = false;
			});
		})
		.catch((err) => {
			console.error('Error loading game:', err);
			error = `${t('error', $languageStore)}${err.message}`;
			loading = false;
		});
</script>

<svelte:head>
	<title>DELDoku - {t('title', $languageStore)}</title>
	<meta name="description" content={t('subtitle', $languageStore)} />
</svelte:head>

<header class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4">
   <div class="max-w-4xl mx-auto flex justify-between items-center">
	   <div class="flex items-center gap-3">
		   <h1 class="text-lg sm:text-xl font-bold">DELDoku</h1>
	   </div>
	   <div class="flex items-center gap-3">
			<button
				onclick={() => showRules = true}
				class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
				aria-label={typeof t('howToPlay', $languageStore) === 'string' ? t('howToPlay', $languageStore) : ''}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="hidden sm:inline">{t('howToPlay', $languageStore)}</span>
			</button>
			<button
				onclick={() => languageStore.toggle()}
				class="relative inline-flex items-center h-8 w-16 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-500"
				class:bg-green-500={$languageStore === 'en'}
				class:bg-blue-300={$languageStore === 'de'}
				aria-label="Toggle language"
			>
				<!-- Toggle circle -->
				<span
					class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform flex items-center justify-center text-xs font-bold text-blue-600"
					class:translate-x-8={$languageStore === 'en'}
					class:translate-x-1={$languageStore === 'de'}
				>
					{$languageStore === 'de' ? 'DE' : 'EN'}
				</span>
			</button>
		</div>
	</div>
</header>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-2 sm:px-4">
	<div class="max-w-4xl mx-auto w-full">
		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
				<p>{error}</p>
				<p class="text-xs mt-2">{t('errorConsole', $languageStore)}</p>
			</div>
		{:else if loading}
			<div class="text-center py-12">
				<p class="text-sm sm:text-base text-gray-600">{t('loading', $languageStore)}</p>
			</div>
		{:else if challenge}
			<div class="space-y-4 sm:space-y-6">
				<GameBoard
					rowCategories={challenge.rowCategories}
					colCategories={challenge.colCategories}
					grid={challenge.grid}
					{challenge}
				/>

				<div class="text-center">
					<button
						onclick={() => showStats = !showStats}
						class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 text-sm sm:text-base rounded-lg transition-colors"
					>
						{showStats ? t('hideStats', $languageStore) : t('showStats', $languageStore)}
					</button>
				</div>

				{#if showStats}
					<Stats />
				{/if}
			</div>
		{/if}
	</div>
</main>

<!-- Rules Modal -->
{#if showRules}
	<div 
		data-rules-overlay
		role="presentation"
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				showRules = false;
			}
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				showRules = false;
			}
		}}
	>
		<div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
			<h2 class="text-2xl font-bold text-gray-800 mb-4">{t('howToPlay', $languageStore)}</h2>
			
			<div class="space-y-4 text-gray-700">
				<div>
					<h3 class="font-bold text-lg mb-2">{t('rulesGoal', $languageStore)}</h3>
					<p>{t('rulesGoalText', $languageStore)}</p>
				</div>
				
				<div>
					<h3 class="font-bold text-lg mb-2">{t('rulesHowTo', $languageStore)}</h3>
					<ul class="list-disc list-inside space-y-1">
						<li>{t('rulesHowTo1', $languageStore)}</li>
						<li>{t('rulesHowTo2', $languageStore)}</li>
						<li>{t('rulesHowTo3', $languageStore)}</li>
						<li>{t('rulesHowTo4', $languageStore)}</li>
					</ul>
				</div>
				
				<div>
					<h3 class="font-bold text-lg mb-2">{t('rulesScoring', $languageStore)}</h3>
					<ul class="list-disc list-inside space-y-1">
						<li>{t('rulesScoring1', $languageStore)}</li>
						<li>{t('rulesScoring2', $languageStore)}</li>
						<li>{t('rulesScoring3', $languageStore)}</li>
						<li>{t('rulesScoring4', $languageStore)}</li>
					</ul>
				</div>
			</div>
			
			<button
				onclick={() => showRules = false}
				class="mt-6 w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
			>
				{t('close', $languageStore)}
			</button>
		</div>
	</div>
{/if}

<style global>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			'Open Sans', 'Helvetica Neue', sans-serif;
	}
</style>

<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import { generateDailyChallenge, type DELDokuChallenge } from '$lib/data';
	import { playersStore, languageStore } from '$lib/stores';
	import { t } from '$lib/i18n';

	let showStats = $state(false);
	let challenge = $state<DELDokuChallenge | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Lade Players und Challenge beim Komponenten-Mount
	playersStore.init()
		.then(() => generateDailyChallenge([]))
		.then((data) => {
			challenge = data;
			loading = false;
		})
		.catch((err) => {
			console.error('Error loading game:', err);
			error = `${t('error', $languageStore)}${err.message}`;
			loading = false;
		});
</script>

<svelte:head>
	<title>DEL-Doku - {t('title', $languageStore)}</title>
	<meta name="description" content={t('subtitle', $languageStore)} />
</svelte:head>

<header class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4">
	<div class="max-w-4xl mx-auto flex justify-between items-center">
		<h1 class="text-lg sm:text-xl font-bold">DEL-Doku</h1>
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

<style global>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			'Open Sans', 'Helvetica Neue', sans-serif;
	}
</style>

<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import { generateDailyChallenge, type DELDokuChallenge } from '$lib/data';
	import { playersStore } from '$lib/stores';

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
			error = `Fehler beim Laden: ${err.message}`;
			loading = false;
		});
</script>

<svelte:head>
	<title>DEL-Doku - Tägliches Rätsel</title>
	<meta name="description" content="Tägliches DEL-Doku Rätsel" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-2 sm:px-4">
	<div class="max-w-4xl mx-auto w-full">
		{#if error}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
				<p>{error}</p>
				<p class="text-xs mt-2">Bitte öffne die Browser-Konsole (F12) für mehr Details.</p>
			</div>
		{:else if loading}
			<div class="text-center py-12">
				<p class="text-sm sm:text-base text-gray-600">Laden...</p>
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
						{showStats ? 'Statistiken ausblenden' : 'Statistiken anzeigen'}
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

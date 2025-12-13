<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import { generateDailyChallenge, type DELDokuChallenge } from '$lib/data';

	let showStats = $state(false);
	let challenge = $state<DELDokuChallenge | null>(null);
	let loading = $state(true);

	// Lade Challenge beim Komponenten-Mount
	generateDailyChallenge([]).then((data) => {
		challenge = data;
		loading = false;
	});
</script>

<svelte:head>
	<title>DEL-Doku - Tägliches Rätsel</title>
	<meta name="description" content="Tägliches DEL-Doku Rätsel" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
	<div class="max-w-4xl mx-auto">
		{#if loading}
			<div class="text-center py-12">
				<p class="text-gray-600">Laden...</p>
			</div>
		{:else if challenge}
			<div class="space-y-6">
				<GameBoard
					rowCategories={challenge.rowCategories}
					colCategories={challenge.colCategories}
					grid={challenge.grid}
					{challenge}
				/>

				<Stats {showStats} />
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

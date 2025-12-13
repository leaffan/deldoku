<script lang="ts">
	import GameBoard from '$lib/components/GameBoard.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import { generateDailyChallenge } from '$lib/data';

	let showStats = $state(false);

	const challenge = generateDailyChallenge([]);
</script>

<svelte:head>
	<title>DEL Puckdoku - Tägliches Rätsel</title>
	<meta name="description" content="Tägliches DEL Puckdoku Rätsel" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="md:col-span-2">
				<GameBoard
					rowCategories={challenge.rowCategories}
					colCategories={challenge.colCategories}
					grid={challenge.grid}
					{challenge}
				/>
			</div>

			<div class="md:col-span-1">
				<button
					onclick={() => (showStats = !showStats)}
					class="w-full mb-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
				>
					{showStats ? 'Spiel anzeigen' : 'Statistiken'}
				</button>

				{#if showStats}
					<Stats {showStats} />
				{:else}
					<div class="bg-white rounded-lg shadow-lg p-6">
						<h3 class="text-xl font-bold mb-4">Über DEL Puckdoku</h3>
						<p class="text-gray-700 mb-3">
							Kombiniere Team und Position, um die richtigen Spieler zu finden!
						</p>
						<p class="text-gray-600 text-sm">
							Tägliches Rätsel • Lokal speichern • Statistiken verfolgen
						</p>
					</div>
				{/if}
			</div>
		</div>
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

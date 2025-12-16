<script lang="ts">
	import { statsStore, languageStore, winRate } from '$lib/stores';
	import { t } from '$lib/i18n';

	interface Props {
		showStats?: boolean;
	}

	let { showStats = false }: Props = $props();
</script>

<div class="bg-white rounded-lg shadow-lg p-6">
	<h2 class="text-2xl font-bold mb-4">{t('statistics', $languageStore)}</h2>

	<div class="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
		<div class="bg-blue-50 p-2 sm:p-4 rounded-lg">
			<div class="text-xl sm:text-3xl font-bold text-blue-600">{$statsStore.totalGames}</div>
			<div class="text-xs sm:text-sm text-gray-600">{t('totalGames', $languageStore)}</div>
		</div>

		<div class="bg-green-50 p-2 sm:p-4 rounded-lg">
			<div class="text-xl sm:text-3xl font-bold text-green-600">{$winRate}%</div>
			<div class="text-xs sm:text-sm text-gray-600">{t('winRate', $languageStore)}</div>
		</div>

		<div class="bg-purple-50 p-2 sm:p-4 rounded-lg">
			<div class="text-xl sm:text-3xl font-bold text-purple-600">{$statsStore.gamesWon}</div>
			<div class="text-xs sm:text-sm text-gray-600">{t('gamesWon', $languageStore)}</div>
		</div>
	</div>

	{#if $statsStore.gameHistory && $statsStore.gameHistory.length > 0}
		<div class="border-t pt-6">
			<h3 class="text-base sm:text-lg font-bold mb-4">{t('gameHistory', $languageStore)}</h3>
			<div class="space-y-2 sm:space-y-4 max-h-96 overflow-y-auto">
				{#each $statsStore.gameHistory.slice().reverse() as game}
					<div class="border rounded-lg p-2 sm:p-4 {game.won ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}">
						<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-2">
							<div class="font-semibold text-xs sm:text-sm">{new Date(game.timestamp).toLocaleString($languageStore === 'en' ? 'en-US' : 'de-DE', { 
								year: 'numeric', 
								month: '2-digit', 
								day: '2-digit',
								hour: '2-digit',
								minute: '2-digit'
							})}</div>
						<div class="flex gap-2 items-center">
							{#if game.score !== undefined}
								<span class="text-xs sm:text-sm font-bold text-blue-600">
									{game.score}/900
								</span>
							{/if}
							<div class="text-xs sm:text-sm font-bold {game.won ? 'text-green-600' : 'text-red-600'}">
								{game.won ? t('won', $languageStore) : t('lost', $languageStore)}
							</div>
							</div>
						</div>
						<details class="text-xs text-gray-600">
							<summary class="cursor-pointer hover:text-gray-800">Details anzeigen</summary>
							<div class="mt-2 space-y-1">
								{#each Object.entries(game.playerSelections) as [cellKey, playerId]}
									<div class="ml-2">
										<span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{cellKey}</span>: {playerId}
									</div>
								{/each}
							</div>
						</details>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="border-t pt-6 text-center text-gray-500 text-sm">
			Noch keine Spiele gespielt. Starten Sie ein Spiel um Statistiken zu sammeln!
		</div>
	{/if}

	<!-- Debug Info -->
	<div class="border-t pt-4 mt-4 text-xs text-gray-500">
		<details>
			<summary class="cursor-pointer">Debug Info</summary>
			<div class="mt-2 p-2 bg-gray-50 rounded font-mono text-xs">
				<div>localStorage: {typeof window !== 'undefined' ? localStorage.getItem('del_doku_stats') : 'nicht verfügbar'}</div>
				<div>gameHistory length: {$statsStore.gameHistory?.length || 0}</div>
				<button 
					onclick={() => statsStore.resetStats()}
					class="mt-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
				>
					Stats zurücksetzen
				</button>
			</div>
		</details>
	</div>
</div>

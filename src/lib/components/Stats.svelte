<script lang="ts">
	import { statsStore, languageStore, winRate, playersStore } from '$lib/stores';
	import { t } from '$lib/i18n';

	interface Props {
		showStats?: boolean;
	}

	let { showStats = false }: Props = $props();

	// Find player name based on ID
	function getPlayerName(playerId: string): string {
		if (!playerId) return '(leer)';
		const player = $playersStore.find(p => p.id === playerId);
		return player ? player.name : playerId;
	}
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
									{#if game.won}
										{game.score - 100} + 100 = {game.score} / 1000
									{:else}
										{game.score} / 1000
									{/if}
									</span>
								{/if}
								<div class="text-xs sm:text-sm font-bold {game.won ? 'text-green-600' : 'text-red-600'}">
									{game.won ? t('won', $languageStore) : t('lost', $languageStore)}
								</div>
							</div>
						</div>
						<details class="text-xs text-gray-600">
						<summary class="cursor-pointer hover:text-gray-800">{t('showDetails', $languageStore)}</summary>
							<div class="mt-2 space-y-1">
								{#each Object.entries(game.playerSelections) as [cellKey, playerId]}
									{@const score = game.cellScores?.[cellKey] ?? 0}
									<div class="ml-2 flex justify-between items-center">
										<div>
											<span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{cellKey}</span>: 
											<span class={playerId ? 'font-semibold' : 'text-gray-400 italic'}>
												{getPlayerName(playerId)}
											</span>
										</div>
										<span class="text-xs font-bold {score > 0 ? 'text-blue-600' : 'text-red-600'}">
											{score} Pkt
										</span>
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
			{t('noGamesYet', $languageStore)}
		</div>
	{/if}
</div>

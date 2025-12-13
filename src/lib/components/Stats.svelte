<script lang="ts">
	import { gameStore, statsStore, winRate, bestTimeFormatted, averageTimeFormatted } from '$lib/stores';

	interface Props {
		showStats?: boolean;
	}

	let { showStats = false }: Props = $props();
</script>

<div class="bg-white rounded-lg shadow-lg p-6">
	<h2 class="text-2xl font-bold mb-4">Statistiken</h2>

	<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
		<div class="bg-blue-50 p-4 rounded-lg">
			<div class="text-3xl font-bold text-blue-600">{$statsStore.totalGames}</div>
			<div class="text-sm text-gray-600">Spiele gesamt</div>
		</div>

		<div class="bg-green-50 p-4 rounded-lg">
			<div class="text-3xl font-bold text-green-600">{$winRate}%</div>
			<div class="text-sm text-gray-600">Gewinnquote</div>
		</div>

		<div class="bg-purple-50 p-4 rounded-lg">
			<div class="text-3xl font-bold text-purple-600">{$statsStore.gamesWon}</div>
			<div class="text-sm text-gray-600">Spiele gewonnen</div>
		</div>

		<div class="bg-orange-50 p-4 rounded-lg">
			<div class="text-2xl font-bold text-orange-600">{$bestTimeFormatted}</div>
			<div class="text-sm text-gray-600">Beste Zeit</div>
		</div>

		<div class="bg-pink-50 p-4 rounded-lg">
			<div class="text-2xl font-bold text-pink-600">{$averageTimeFormatted}</div>
			<div class="text-sm text-gray-600">Ø Zeit</div>
		</div>

		<div class="bg-red-50 p-4 rounded-lg">
			<div class="text-3xl font-bold text-red-600">{$statsStore.currentStreak}</div>
			<div class="text-sm text-gray-600">Aktuelle Serie</div>
		</div>
	</div>
</div>

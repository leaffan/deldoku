<script lang="ts">
	import type { DELPlayer } from '$lib/data';

	interface Props {
		rowCategory: string;
		colCategory: string;
		player?: DELPlayer | null;
		onCellClick: () => void;
		isSelected?: boolean;
		isCorrect?: boolean;
		isIncorrect?: boolean;
	}

	let { rowCategory, colCategory, player, onCellClick, isSelected, isCorrect, isIncorrect }: Props = $props();
</script>

<button
	onclick={onCellClick}
	class={`w-28 h-28 flex flex-col items-center justify-center font-semibold text-center text-xs transition-all cursor-pointer
		${isCorrect ? 'bg-green-400 text-white shadow-lg' : isIncorrect ? 'bg-red-400 text-white shadow-lg' : isSelected ? 'bg-blue-300 text-gray-900 shadow-md' : 'bg-white text-gray-900 hover:bg-gray-50'}
		${player ? 'font-bold' : 'text-2xl text-gray-300'}`}
>
	{#if player}
		<div class="flex flex-col items-center justify-center gap-1">
			<div class="font-bold text-sm leading-tight">{player.name}</div>
			<div class="text-xs opacity-80">#{player.number}</div>
		</div>
	{:else}
		<div>?</div>
	{/if}
</button>

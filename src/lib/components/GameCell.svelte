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

	// Kürzt Vornamen zu Initialen ab (für Mobilansicht)
	function abbreviateName(fullName: string): string {
		const parts = fullName.split(' ');
		if (parts.length <= 1) return fullName;
		
		// Erster Teil = Initial, Rest = vollständiger Name
		const firstInitial = parts[0].charAt(0) + '.';
		const lastName = parts.slice(1).join(' ');
		return `${firstInitial} ${lastName}`;
	}
</script>

<button
	onclick={onCellClick}
	class={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex flex-col items-center justify-center font-semibold text-center text-xs transition-all cursor-pointer
		${isCorrect ? 'bg-green-400 text-white shadow-lg' : isIncorrect ? 'bg-red-400 text-white shadow-lg' : isSelected ? 'bg-blue-300 text-gray-900 shadow-md' : 'bg-white text-gray-900 hover:bg-gray-50'}
		${player ? 'font-bold' : 'text-2xl text-gray-300'}`}
>
	{#if player}
		<div class="flex flex-col items-center justify-center gap-1">
			<span class="fi fi-{player.nationality}" style="font-size: 1rem;"></span>
			<!-- Vollständiger Name auf größeren Bildschirmen, abgekürzter Name auf Mobilgeräten -->
			<div class="font-bold text-xs leading-tight">
				<span class="hidden sm:inline">{player.name}</span>
				<span class="sm:hidden">{abbreviateName(player.name)}</span>
			</div>
			<div class="text-xs opacity-80">{player.first_season} – {player.last_season}</div>
		</div>
	{:else}
		<div>?</div>
	{/if}
</button>

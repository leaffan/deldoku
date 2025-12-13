<script lang="ts">
	import type { DELPlayer } from '$lib/data';
	import { samplePlayers } from '$lib/data';

	interface Props {
		onPlayerSelect: (player: DELPlayer) => void;
	}

	let { onPlayerSelect }: Props = $props();
	let searchQuery = $state('');
	let suggestions = $state<DELPlayer[]>([]);
	let isOpen = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);

	// Exportiere eine Funktion zum Fokussieren des Input-Felds
	export function focusInput() {
		inputElement?.focus();
	}

	function handleInput(e: Event) {
		const input = (e.target as HTMLInputElement).value;
		searchQuery = input;
		isOpen = true;

		if (input.length > 0) {
			suggestions = samplePlayers.filter(
				(p) =>
					p.name.toLowerCase().includes(input.toLowerCase()) ||
					p.number.toString().includes(input)
			);
            console.log('Suggestions for "', input, '":', suggestions);
		} else {
			suggestions = [];
		}
	}

	function selectPlayer(player: DELPlayer) {
		searchQuery = '';
		isOpen = false;
		onPlayerSelect(player);
	}

	function handleFocus() {
		searchQuery = '';
		suggestions = [];
		if (searchQuery.length > 0) {
			isOpen = true;
		}
	}

	function handleBlur() {
		setTimeout(() => {
			isOpen = false;
		}, 100);
	}
</script>

<div class="relative w-full">
	<input
		bind:this={inputElement}
		type="text"
		placeholder="Spieler suchen..."
		value={searchQuery}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
	/>

	{#if isOpen && suggestions.length > 0}
		<ul class="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-10">
			{#each suggestions as player (player.id)}
				<li>
					<button
						onclick={() => selectPlayer(player)}
						class="w-full text-left px-3 py-2 hover:bg-gray-100 flex justify-between items-center"
					>
						<div>
							<div class="font-semibold">{player.name}</div>
							<div class="text-sm text-gray-600">{player.team} • {player.position}</div>
						</div>
						<span class="text-gray-500">#{player.number}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

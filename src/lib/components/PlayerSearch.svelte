<script lang="ts">
	import type { DELPlayer } from '$lib/data';
	import { playersStore } from '$lib/stores';
	import { debug } from '$lib/debug';

	interface Props {
		onPlayerSelect: (player: DELPlayer) => void;
		usedPlayerIds?: string[];
		incorrectPlayerIds?: string[];
	}

	let { onPlayerSelect, usedPlayerIds = [], incorrectPlayerIds = [] }: Props = $props();
	let searchQuery = $state('');
	let suggestions = $state<DELPlayer[]>([]);
	let isOpen = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);
	let selectedIndex = $state(-1); // Index des aktuell markierten Spielers
	let feedbackStatus = $state<'correct' | 'incorrect' | null>(null); // Feedback-Status

	// Auto-focus when component mounts
	$effect(() => {
		if (inputElement) {
			inputElement.focus();
		}
	});

	// Exportiere eine Funktion zum Fokussieren des Input-Felds
	export function focusInput() {
		if (inputElement) {
			// Fokussieren mit Workaround für Mobile-Browser
			inputElement.focus({ preventScroll: false });
			// Trigger input event für bessere Mobile-Kompatibilität
			inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
		}
	}

	// Exportiere eine Funktion zum Anzeigen von Feedback
	export function showFeedback(isCorrect: boolean) {
		feedbackStatus = isCorrect ? 'correct' : 'incorrect';
		setTimeout(() => {
			feedbackStatus = null;
			// Nach Feedback das Eingabefeld leeren
			if (isCorrect) {
				searchQuery = '';
			}
		}, 800);
	}

	function handleInput(e: Event) {
		const input = (e.target as HTMLInputElement).value;
		searchQuery = input;
		isOpen = true;
		selectedIndex = -1; // Reset selection bei neuer Eingabe

		// Hole alle falschen Antworten (immer am Anfang)
		const incorrectPlayers = $playersStore.filter(p => incorrectPlayerIds.includes(p.id));
		
		if (input.length > 0) {
			const filtered = $playersStore.filter(
				(p) => p.name.toLowerCase().includes(input.toLowerCase()) && !incorrectPlayerIds.includes(p.id)
			);
			// Falsche Antworten zuerst, dann gefilterte Rest
			suggestions = [...incorrectPlayers, ...filtered];
		} else {
			// Auch wenn Eingabefeld leer ist, zeige falsche Antworten
			suggestions = incorrectPlayers.length > 0 ? incorrectPlayers : [];
		}
	}

	function selectPlayer(player: DELPlayer) {
		searchQuery = player.name;
		isOpen = false;
		selectedIndex = -1;
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
			selectedIndex = -1;
		}, 100);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!isOpen || suggestions.length === 0) return;

		// Filtere nur verfügbare (nicht verwendete und nicht bereits falsch) Spieler
		const availableSuggestions = suggestions.filter(p => !usedPlayerIds.includes(p.id) && !incorrectPlayerIds.includes(p.id));
		
		if (availableSuggestions.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % availableSuggestions.length;
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = selectedIndex <= 0 ? availableSuggestions.length - 1 : selectedIndex - 1;
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < availableSuggestions.length) {
					selectPlayer(availableSuggestions[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				isOpen = false;
				selectedIndex = -1;
				break;
		}
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
		onkeydown={handleKeyDown}
		autofocus
		class="w-full px-3 py-2 border-2 rounded-lg transition-colors
			{feedbackStatus === 'correct' ? 'border-green-500 bg-green-50' : 
			 feedbackStatus === 'incorrect' ? 'border-red-500 bg-red-50' : 
			 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'}"
	/>

	{#if isOpen && suggestions.length > 0}
		{@const availablePlayers = suggestions.filter(p => !usedPlayerIds.includes(p.id) && !incorrectPlayerIds.includes(p.id))}
		<ul class="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-10 max-h-96 overflow-y-auto">
			{#each suggestions as player, index (player.id)}
				{@const isUsed = usedPlayerIds.includes(player.id)}
				{@const isIncorrect = incorrectPlayerIds.includes(player.id)}
				{@const isDisabled = isUsed || isIncorrect}
				{@const availableIndex = availablePlayers.indexOf(player)}
				{@const isSelected = !isDisabled && selectedIndex === availableIndex}
				<li>
					<div class={`w-full px-3 py-2 flex justify-between items-center transition-colors
						${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
						${isIncorrect ? 'bg-red-50' : ''}`}>
						<div>
							<div class="font-semibold {isDisabled ? 'line-through text-gray-400' : ''}">
								{player.name}

							</div>
							<div class="text-sm text-gray-600">{player.first_season} – {player.last_season}</div>
						</div>
						<button
							onclick={() => !isDisabled && selectPlayer(player)}
							disabled={isDisabled}
							class={`ml-2 px-3 py-1 rounded text-sm font-semibold transition-colors
								${isDisabled ? 'opacity-30 cursor-not-allowed bg-gray-200 text-gray-400' : isSelected ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'}`}
						>
							{isSelected ? '→ Enter' : 'Auswählen'}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

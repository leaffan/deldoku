import { writable, derived } from 'svelte/store';
import type { DELPlayer } from './data';
import type { Language } from './i18n';
import { loadPlayers } from './data';

export interface GameState {
	grid: (string | null)[][];
	categories: string[];
	dailyChallenge: string;
	startTime: number;
	endTime: number | null;
	solved: boolean;
}

export interface GameEntry {
	timestamp: string; // ISO 8601 full timestamp
	won: boolean;
	playerSelections: Record<string, string>; // "0-0": "p1", "0-1": "p2", etc.
}

export interface PlayerStats {
	totalGames: number;
	gamesWon: number;
	currentStreak: number;
	lastPlayedDate: string; // ISO 8601 full timestamp
	gameHistory: GameEntry[];
}

const defaultGameState: GameState = {
	grid: Array(9)
		.fill(null)
		.map(() => Array(3).fill(null)),
	categories: [],
	dailyChallenge: new Date().toISOString().split('T')[0],
	startTime: Date.now(),
	endTime: null,
	solved: false
};

const defaultStats: PlayerStats = {
	totalGames: 0,
	gamesWon: 0,
	currentStreak: 0,
	lastPlayedDate: '',
	gameHistory: []
};

function createGameStore() {
	const { subscribe, set, update } = writable<GameState>(defaultGameState);

	return {
		subscribe,
		resetGame: () => set(defaultGameState),
		setCell: (row: number, col: number, value: string | null) => {
			update((state) => {
				state.grid[row][col] = value;
				return state;
			});
		},
		setCategories: (categories: string[]) => {
			update((state) => ({
				...state,
				categories
			}));
		},
		markSolved: () => {
			update((state) => ({
				...state,
				solved: true,
				endTime: Date.now()
			}));
		}
	};
}

function createStatsStore() {
	let initial = defaultStats;
	
	// Versuche localStorage zu laden, nur auf Client-Seite
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('del_doku_stats');
		if (stored) {
			try {
				initial = JSON.parse(stored);
				// Sicherstelle, dass gameHistory existiert
				if (!initial.gameHistory) {
					initial.gameHistory = [];
				}
			} catch (e) {
				console.error('Error parsing stats from localStorage:', e);
				initial = defaultStats;
			}
		}
	}

	const { subscribe, set, update } = writable<PlayerStats>(initial);

	return {
		subscribe,
		addGame: (won: boolean, playerSelections: Record<string, string>) => {
			update((state) => {
				const timestamp = new Date().toISOString();
				const newEntry: GameEntry = {
					timestamp,
					won,
					playerSelections
				};

				const newStats = {
					...state,
					totalGames: state.totalGames + 1,
					gamesWon: won ? state.gamesWon + 1 : state.gamesWon,
					currentStreak: won ? state.currentStreak + 1 : 0,
					lastPlayedDate: timestamp,
					gameHistory: [...(state.gameHistory || []), newEntry]
				};

				if (typeof window !== 'undefined') {
					localStorage.setItem('del_doku_stats', JSON.stringify(newStats));
				}

				return newStats;
			});
		},
		resetStats: () => {
			set(defaultStats);
			if (typeof window !== 'undefined') {
				localStorage.removeItem('del_doku_stats');
			}
		}
	};
}

export const gameStore = createGameStore();
export const statsStore = createStatsStore();

export const winRate = derived(statsStore, ($stats) =>
	$stats.totalGames === 0 ? 0 : (($stats.gamesWon / $stats.totalGames) * 100).toFixed(1)
);

function createPlayersStore() {
	const { subscribe, set } = writable<DELPlayer[]>([]);

	return {
		subscribe,
		init: async () => {
			const players = await loadPlayers();
			set(players);
		}
	};
}

export const playersStore = createPlayersStore();

function createLanguageStore() {
	// Versuche Sprache aus localStorage zu laden, Standard ist Deutsch
	const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
	const initialLanguage: Language = savedLanguage === 'en' ? 'en' : 'de';
	
	const { subscribe, set, update } = writable<Language>(initialLanguage);

	return {
		subscribe,
		toggle: () => {
			update((current) => {
				const newLang: Language = current === 'de' ? 'en' : 'de';
				if (typeof window !== 'undefined') {
					localStorage.setItem('language', newLang);
				}
				return newLang;
			});
		}
	};
}

export const languageStore = createLanguageStore();

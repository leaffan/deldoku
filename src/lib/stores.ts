import { writable, derived } from 'svelte/store';
import type { DELPlayer } from './data';
import type { Language } from './i18n';
import { loadPlayers, getApiBasePath } from './data';

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
	score?: number; // Punktzahl (0-900)
	cellScores?: Record<string, number>; // Punkte pro Zelle
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
	let userId: string | null = null;
	
	// Generiere oder lade eine eindeutige User-ID
	if (typeof window !== 'undefined') {
		userId = localStorage.getItem('del_doku_user_id');
		if (!userId) {
			userId = 'user_' + Math.random().toString(36).substr(2, 9);
			localStorage.setItem('del_doku_user_id', userId);
		}
	}

	const { subscribe, set, update } = writable<PlayerStats>(initial);

	return {
		subscribe,
		
		// Lade Stats vom Server
		init: async () => {
			if (typeof window === 'undefined' || !userId) return;
			
			try {
				const apiPath = getApiBasePath();
				const response = await fetch(`${apiPath}api/stats?userId=${userId}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				
				if (data.stats) {
					set(data.stats);
				}
			} catch (error) {
				console.error('Error loading stats from server:', error);
				// Fallback auf localStorage
				const stored = localStorage.getItem('del_doku_stats');
				if (stored) {
					try {
						const parsed = JSON.parse(stored);
						set(parsed);
					} catch (e) {
						console.error('Error parsing stats from localStorage:', e);
					}
				}
			}
		},
		
		addGame: async (won: boolean, playerSelections: Record<string, string>) => {
			// Lade alle Stats vom Server um Seltenheit zu berechnen
			let allStats: Record<string, any> = {};
			
			try {
				const apiPath = getApiBasePath();
				const response = await fetch(`${apiPath}api/stats`);
				if (response.ok) {
					const data = await response.json();
					allStats = data;
				}
			} catch (error) {
				console.error('Error loading all stats for score calculation:', error);
			}

			// Berechne Punkte basierend auf Seltenheit
			const { calculateRarityScore } = await import('./data');
			const { totalScore, cellScores } = calculateRarityScore(playerSelections, allStats);

			update((state) => {
				const timestamp = new Date().toISOString();
				const newEntry: GameEntry = {
					timestamp,
					won,
					playerSelections,
					score: totalScore,
					cellScores
				};

				const newStats = {
					...state,
					totalGames: state.totalGames + 1,
					gamesWon: won ? state.gamesWon + 1 : state.gamesWon,
					currentStreak: won ? state.currentStreak + 1 : 0,
					lastPlayedDate: timestamp,
					gameHistory: [...(state.gameHistory || []), newEntry]
				};

				// Speichere auf Server und localStorage
				if (typeof window !== 'undefined' && userId) {
					const apiPath = getApiBasePath();
					fetch(`${apiPath}api/stats`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ userId, stats: newStats })
					}).catch(err => console.error('Error saving stats:', err));
					
					localStorage.setItem('del_doku_stats', JSON.stringify(newStats));
				}

				return newStats;
			});
			
			// Gebe Score und cellScores zurück
			return { score: totalScore, cellScores };
		},
		
		resetStats: () => {
			set(defaultStats);
			if (typeof window !== 'undefined') {
				localStorage.removeItem('del_doku_stats');
				if (userId) {
					const apiPath = getApiBasePath();
					fetch(`${apiPath}api/stats`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ userId, stats: defaultStats })
					}).catch(err => console.error('Error resetting stats:', err));
				}
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

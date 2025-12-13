import { writable, derived } from 'svelte/store';

export interface GameState {
	grid: (string | null)[][];
	categories: string[];
	dailyChallenge: string;
	startTime: number;
	endTime: number | null;
	solved: boolean;
}

export interface GameEntry {
	date: string;
	won: boolean;
	playerSelections: Record<string, string>; // "0-0": "p1", "0-1": "p2", etc.
}

export interface PlayerStats {
	totalGames: number;
	gamesWon: number;
	currentStreak: number;
	lastPlayedDate: string;
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
	const stored = typeof window !== 'undefined' ? localStorage.getItem('del_doku_stats') : null;
	const initial = stored ? JSON.parse(stored) : defaultStats;

	const { subscribe, set, update } = writable<PlayerStats>(initial);

	return {
		subscribe,
		addGame: (won: boolean, playerSelections: Record<string, string>) => {
			update((state) => {
				const today = new Date().toISOString().split('T')[0];
				const newEntry: GameEntry = {
					date: today,
					won,
					playerSelections
				};

				const newStats = {
					...state,
					totalGames: state.totalGames + 1,
					gamesWon: won ? state.gamesWon + 1 : state.gamesWon,
					currentStreak: won ? state.currentStreak + 1 : 0,
					lastPlayedDate: today,
					gameHistory: [...state.gameHistory, newEntry]
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

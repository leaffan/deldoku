import { writable, derived } from 'svelte/store';

export interface GameState {
	grid: (string | null)[][];
	categories: string[];
	dailyChallenge: string;
	startTime: number;
	endTime: number | null;
	solved: boolean;
}

export interface PlayerStats {
	totalGames: number;
	gamesWon: number;
	bestTime: number;
	averageTime: number;
	currentStreak: number;
	lastPlayedDate: string;
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
	bestTime: Infinity,
	averageTime: 0,
	currentStreak: 0,
	lastPlayedDate: ''
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
		addGame: (won: boolean, timeMs: number) => {
			update((state) => {
				const newStats = {
					...state,
					totalGames: state.totalGames + 1,
					gamesWon: won ? state.gamesWon + 1 : state.gamesWon,
					bestTime: Math.min(state.bestTime, timeMs),
					averageTime: (state.averageTime * state.totalGames + timeMs) / (state.totalGames + 1),
					currentStreak: won ? state.currentStreak + 1 : 0,
					lastPlayedDate: new Date().toISOString().split('T')[0]
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

export const bestTimeFormatted = derived(statsStore, ($stats) =>
	$stats.bestTime === Infinity ? '--:--' : formatTime($stats.bestTime)
);

export const averageTimeFormatted = derived(statsStore, ($stats) =>
	$stats.totalGames === 0 ? '--:--' : formatTime($stats.averageTime)
);

function formatTime(ms: number): string {
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

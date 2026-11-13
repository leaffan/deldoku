import { writable, derived } from 'svelte/store';
import type { DELPlayer } from './data';
import type { Language } from './i18n';
import { loadPlayers, getStatsApiUrl } from './data';

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
	date?: string; // Challenge-Datum (YYYY-MM-DD)
	won: boolean;
	playerSelections: Record<string, string>; // "0-0": "<player id>", "0-1": "", etc.
	score?: number; // Punktzahl (0-1000, inkl. 100 Bonus für Gewinn)
	cellScores?: Record<string, number>; // Punkte pro Zelle
}

export interface PlayerStats {
	totalGames: number;
	gamesWon: number;
	lastPlayedDate: string; // ISO 8601 full timestamp
	gameHistory: GameEntry[]; // die letzten 100 Spiele
	daysPlayed?: number;
	daysWon?: number;
	totalPoints?: number; // Summe des besten Ergebnisses pro Tag
	pointsPercent?: number | null; // Anteil an den möglichen Punkten der gespielten Tage (0-100)
	currentStreak?: number;
	longestStreak?: number;
}

export interface GameResult {
	date: string;
	won: boolean;
	correct: number;
	score: number;
	cellScores: Record<string, number>;
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

interface Auth {
	userId: string;
	token: string;
}

const AUTH_KEY = 'del_doku_auth';

function loadAuth(): Auth | null {
	try {
		const parsed = JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null');
		return typeof parsed?.userId === 'string' && typeof parsed?.token === 'string' ? parsed : null;
	} catch {
		return null;
	}
}

function saveAuth(auth: Auth | null) {
	try {
		if (auth) {
			localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
		} else {
			localStorage.removeItem(AUTH_KEY);
		}
	} catch {
		// localStorage nicht verfügbar (z. B. privates Fenster): Stats gelten dann nur für diese Sitzung
	}
}

function createStatsStore() {
	// Server vergibt userId und Token beim ersten abgesendeten Spiel
	let auth: Auth | null = null;
	const { subscribe, set } = writable<PlayerStats>(defaultStats);

	async function submitGame(
		date: string,
		selections: Record<string, string>,
		isFallback = false
	): Promise<GameResult> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		const body: Record<string, unknown> = { date, selections };
		if (isFallback) {
			// Sonst würde nach einem späteren Upload der Tagesdatei gegen die falsche Challenge gewertet
			body.challenge = 'fallback';
		}
		if (auth) {
			body.userId = auth.userId;
			headers['X-DelDoku-Token'] = auth.token;
		}
		const response = await fetch(getStatsApiUrl(), {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});
		if (response.status === 401 && auth) {
			// Zugangsdaten auf dem Server unbekannt: als neuer Nutzer erneut absenden
			auth = null;
			saveAuth(null);
			return submitGame(date, selections, isFallback);
		}
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		const data = await response.json();
		if (data.token) {
			auth = { userId: data.userId, token: data.token };
			saveAuth(auth);
		}
		set(data.stats);
		return data.game;
	}

	return {
		subscribe,

		// Lade eigene Stats vom Server
		init: async () => {
			if (typeof window === 'undefined') return;
			try {
				// Schlüssel des alten Stats-Formats aufräumen
				localStorage.removeItem('del_doku_user_id');
				localStorage.removeItem('del_doku_stats');
			} catch {
				// ignorieren
			}
			auth = loadAuth();
			if (!auth) return;

			try {
				const response = await fetch(
					`${getStatsApiUrl()}?userId=${encodeURIComponent(auth.userId)}`,
					{ headers: { 'X-DelDoku-Token': auth.token } }
				);
				if (response.status === 401) {
					auth = null;
					saveAuth(null);
					return;
				}
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				set(data.stats);
			} catch (error) {
				console.error('Error loading stats from server:', error);
			}
		},

		submitGame
	};
}

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

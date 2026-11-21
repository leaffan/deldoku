import { writable, derived, readonly } from 'svelte/store';
import type { DELPlayer } from './data';
import type { Language } from './i18n';
import { loadPlayers, getStatsApiUrl } from './data';

export interface GameEntry {
	timestamp: string; // ISO 8601 full timestamp
	date?: string; // Challenge date (YYYY-MM-DD)
	won: boolean;
	playerSelections: Record<string, string>; // "0-0": "<player id>", "0-1": "", etc.
	score?: number; // Score (0-1000, incl. 100 bonus for a win)
	cellScores?: Record<string, number>; // Points per cell
}

export interface PlayerStats {
	totalGames: number;
	gamesWon: number;
	lastPlayedDate: string; // ISO 8601 full timestamp
	gameHistory: GameEntry[]; // the last 100 games
	daysPlayed?: number;
	daysWon?: number;
	totalPoints?: number; // Sum of the best result per day
	pointsPercent?: number | null; // Share of the possible points on the days played (0-100)
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

const defaultStats: PlayerStats = {
	totalGames: 0,
	gamesWon: 0,
	lastPlayedDate: '',
	gameHistory: []
};

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
		// localStorage unavailable (e.g. private window): stats then apply to this session only
	}
}

// Own user ID, shown in the stats (e.g. for data access requests); null without an account.
// Exported read-only: it is changed only via setAuth(), so it stays in sync with auth.
const userId = writable<string | null>(null);
export const userIdStore = readonly(userId);

function createStatsStore() {
	// The server assigns userId and token on the first submitted game
	let auth: Auth | null = null;
	const { subscribe, set } = writable<PlayerStats>(defaultStats);

	function setAuth(next: Auth | null, persist = true) {
		auth = next;
		if (persist) saveAuth(next);
		userId.set(next?.userId ?? null);
	}

	async function submitGame(
		date: string,
		selections: Record<string, string>,
		isFallback = false
	): Promise<GameResult> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		const body: Record<string, unknown> = { date, selections };
		if (isFallback) {
			// Otherwise, after a later upload of the daily file, the game would be scored against the wrong challenge
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
			// Credentials unknown to the server: resubmit as a new user
			setAuth(null);
			return submitGame(date, selections, isFallback);
		}
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		const data = await response.json();
		if (data.token) {
			setAuth({ userId: data.userId, token: data.token });
		}
		set(data.stats);
		return data.game;
	}

	return {
		subscribe,

		// Load own stats from the server
		init: async () => {
			if (typeof window === 'undefined') return;
			try {
				// Clean up the key of the old stats format
				localStorage.removeItem('del_doku_user_id');
				localStorage.removeItem('del_doku_stats');
			} catch {
				// ignore
			}
			setAuth(loadAuth(), false);
			if (!auth) return;

			try {
				const response = await fetch(
					`${getStatsApiUrl()}?userId=${encodeURIComponent(auth.userId)}`,
					{ headers: { 'X-DelDoku-Token': auth.token } }
				);
				if (response.status === 401) {
					setAuth(null);
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

		submitGame,

		// Deletes the account and games on the server; the next game creates a new account
		deleteAccount: async () => {
			if (auth) {
				const response = await fetch(
					`${getStatsApiUrl()}?userId=${encodeURIComponent(auth.userId)}`,
					{ method: 'DELETE', headers: { 'X-DelDoku-Token': auth.token } }
				);
				// 401: account no longer exists on the server (e.g. expired), so the goal is reached
				if (!response.ok && response.status !== 401) {
					throw new Error(`HTTP ${response.status}`);
				}
			}
			setAuth(null);
			set(defaultStats);
		}
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
	// Try to load the language from localStorage; default is German
	let savedLanguage: string | null = null;
	try {
		savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
	} catch {
		// localStorage unavailable (e.g. private window): use the default
	}
	const initialLanguage: Language = savedLanguage === 'en' ? 'en' : 'de';

	const { subscribe, update } = writable<Language>(initialLanguage);

	return {
		subscribe,
		toggle: () => {
			update((current) => {
				const newLang: Language = current === 'de' ? 'en' : 'de';
				try {
					if (typeof window !== 'undefined') {
						localStorage.setItem('language', newLang);
					}
				} catch {
					// Cannot be stored: the switch then applies to this session only
				}
				return newLang;
			});
		}
	};
}

export const languageStore = createLanguageStore();

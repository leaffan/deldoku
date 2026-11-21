export interface DELPlayer {
	id: string;
	name: string;
	nationality: string;
	first_season: number;
	last_season: number;
}

export interface DELDokuChallenge {
	date: string;
	title?: string | { de: string; en: string };
	rowCategories: string[];
	colCategories: string[];
	grid: (DELPlayer | null)[][];
	answers: string[][][];
	isFallback?: boolean; // Fallback challenge, because no file exists for the date
}

// Neither daily nor fallback challenge available
export class NoChallengeError extends Error {
	constructor() {
		super('No challenge available');
		this.name = 'NoChallengeError';
	}
}

// Formats of the JSON files as delivered by the server
interface CompressedPlayer {
	i: string; // id
	n: string; // name
	t: string; // nationality
	f: number; // first_season
	l: number; // last_season
}

interface ChallengeFile {
	title?: DELDokuChallenge['title'];
	rowCategories: string[];
	colCategories: string[];
	answers: string[][][];
}

export let samplePlayers: DELPlayer[] = [];

function getBasePath(): string {
	if (typeof window !== 'undefined') {
		return new URL('.', window.location.href).pathname;
	}
	return '/deldoku/';
}

export function getApiBasePath(): string {
	if (typeof window !== 'undefined') {
		const pathname = new URL('.', window.location.href).pathname;
		return pathname.endsWith('/') ? pathname : pathname + '/';
	}
	return '/deldoku/';
}

// Point directly at stats.php so no MultiViews/rewrite is needed on the server
export function getStatsApiUrl(): string {
	return `${getApiBasePath()}api/stats.php`;
}

export async function loadPlayers(): Promise<DELPlayer[]> {
	if (samplePlayers.length === 0 && typeof window !== 'undefined') {
		const basePath = getBasePath();
		const response = await fetch(`${basePath}all_players.json`);
		const compressed: CompressedPlayer[] = await response.json();

		// Expand compressed data back to the full format
		samplePlayers = compressed.map((p) => ({
			id: p.i,
			name: p.n,
			nationality: p.t,
			first_season: p.f,
			last_season: p.l
		}));
		currentSeason = samplePlayers.reduce((max, p) => Math.max(max, p.last_season), 0);
	}
	return samplePlayers;
}

// Current season = latest season in the player data; players with this last_season are still active.
// Computed once in loadPlayers, because the function is called per cell and search hit.
let currentSeason = 0;
export function getCurrentSeason(): number {
	return currentSeason;
}

export function getDailyChallengeDate(): string {
	// Use UTC instead of local time
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// null only on 404 (file missing); network, server and parse errors are propagated
// so they are shown as errors instead of as "no challenge" or the fallback challenge
async function fetchChallengeFile(name: string): Promise<ChallengeFile | null> {
	const response = await fetch(`${getBasePath()}challenges/${name}.json`);
	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} (${name}.json)`);
	}
	return response.json();
}

export async function generateDailyChallenge(players: DELPlayer[]): Promise<DELDokuChallenge> {
	const date = getDailyChallengeDate();

	// Load players if not yet loaded
	if (players.length === 0) {
		await loadPlayers();
	}

	// Only load in the browser, not during server-side rendering
	if (typeof window === 'undefined') {
		throw new Error('Challenge can only be loaded in the browser');
	}

	let challengeData = await fetchChallengeFile(date);
	let isFallback = false;
	if (!challengeData) {
		// Permanently valid fallback challenge; the server scores against the same file
		challengeData = await fetchChallengeFile('fallback');
		isFallback = true;
	}
	if (!challengeData) {
		throw new NoChallengeError();
	}

	return {
		date,
		title: challengeData.title,
		rowCategories: challengeData.rowCategories,
		colCategories: challengeData.colCategories,
		grid: Array(3)
			.fill(null)
			.map(() => Array(3).fill(null)),
		answers: challengeData.answers,
		isFallback
	};
}

// Players are compared only by their numeric Eliteprospects ID (the number before the "/"); the name part is
// for readability only and is not always encoded the same way in the player list and challenges (e.g. "krauß" vs. "krauÃŸ")
export function epId(playerId: string): string {
	const pos = playerId.indexOf('/');
	return pos === -1 ? playerId : playerId.slice(0, pos);
}

export function samePlayer(a: string, b: string): boolean {
	return epId(a) === epId(b);
}

export function validatePlayerMatch(
	player: DELPlayer,
	answers: string[][][],
	rowIdx: number,
	colIdx: number
): boolean {
	// Get the valid player IDs for this cell
	const expectedPlayerIds = answers[rowIdx][colIdx];

	// Check whether the selected player is among the valid IDs
	if (!expectedPlayerIds.some((id) => samePlayer(id, player.id))) {
		return false;
	}

	return true;
}

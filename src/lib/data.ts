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
	isFallback?: boolean; // Ersatz-Challenge, weil für das Datum keine Datei existiert
}

// Weder Tages- noch Ersatz-Challenge verfügbar
export class NoChallengeError extends Error {
	constructor() {
		super('No challenge available');
		this.name = 'NoChallengeError';
	}
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

// Direkt auf stats.php zeigen, damit kein MultiViews/Rewrite auf dem Server nötig ist
export function getStatsApiUrl(): string {
	return `${getApiBasePath()}api/stats.php`;
}

export async function loadPlayers(): Promise<DELPlayer[]> {
	if (samplePlayers.length === 0 && typeof window !== 'undefined') {
		const basePath = getBasePath();
		const response = await fetch(`${basePath}all_players.json`);
		const compressed = await response.json();

		// Transformiere komprimierte Daten zurück zum vollen Format
		samplePlayers = compressed.map((p: any) => ({
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

// Aktuelle Saison = jüngste Saison in den Spielerdaten; Spieler mit dieser last_season sind noch aktiv.
// Wird einmal in loadPlayers berechnet, weil die Funktion pro Zelle und Suchtreffer aufgerufen wird.
let currentSeason = 0;
export function getCurrentSeason(): number {
	return currentSeason;
}

export function getDailyChallengeDate(): string {
	// Verwende UTC-Zeit statt lokale Zeit
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// null nur bei 404 (Datei fehlt); Netzwerk-, Server- und Parse-Fehler werden weitergereicht,
// damit sie als Fehler angezeigt werden statt als "keine Challenge" oder Ersatz-Challenge
async function fetchChallengeFile(name: string): Promise<any | null> {
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

	// Lade Spieler wenn nicht vorhanden
	if (players.length === 0) {
		await loadPlayers();
	}

	// Nur im Browser laden - nicht während Server-Side Rendering
	if (typeof window === 'undefined') {
		throw new Error('Challenge kann nur im Browser geladen werden');
	}

	let challengeData = await fetchChallengeFile(date);
	let isFallback = false;
	if (!challengeData) {
		// Dauerhaft gültige Ersatz-Challenge; der Server wertet mit derselben Datei
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

// Spieler werden nur über ihre numerische Eliteprospects-ID (die Zahl vor dem "/") verglichen; der Namensteil dient nur der Lesbarkeit
// und ist zwischen Spielerliste und Challenges nicht immer gleich kodiert (z. B. "krauß" vs. "krauÃŸ")
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
	// Hole die gültigen Player-IDs für diese Zelle
	const expectedPlayerIds = answers[rowIdx][colIdx];

	// Überprüfe ob der ausgewählte Spieler in den gültigen IDs enthalten ist
	if (!expectedPlayerIds.some((id) => samePlayer(id, player.id))) {
		return false;
	}

	return true;
}

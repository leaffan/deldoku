export interface DELPlayer {
	id: string;
	name: string;
	number?: number;
	position?: 'C' | 'LW' | 'RW' | 'D' | 'G';
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
	}
	return samplePlayers;
}

export function getDailyChallengeDate(): string {
	// Verwende UTC-Zeit statt lokale Zeit
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

async function fetchChallengeFile(name: string): Promise<any | null> {
	try {
		const response = await fetch(`${getBasePath()}challenges/${name}.json`);
		return response.ok ? await response.json() : null;
	} catch (error) {
		console.warn(`Challenge-Datei ${name}.json konnte nicht geladen werden:`, error instanceof Error ? error.message : String(error));
		return null;
	}
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

export function validatePlayerMatch(
	player: DELPlayer,
	answers: string[][][],
	rowIdx: number,
	colIdx: number
): boolean {
	// Hole die gültigen Player-IDs für diese Zelle
	const expectedPlayerIds = answers[rowIdx][colIdx];
	
	// Überprüfe ob der ausgewählte Spieler in den gültigen IDs enthalten ist
	if (!expectedPlayerIds.includes(player.id)) {
		return false;
	}

	return true;
}

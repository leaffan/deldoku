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
	title?: string;
	rowCategories: string[];
	colCategories: string[];
	grid: (DELPlayer | null)[][];
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

export async function generateDailyChallenge(players: DELPlayer[]): Promise<DELDokuChallenge> {
	const date = getDailyChallengeDate();
	
	// Lade Spieler wenn nicht vorhanden
	const allPlayers = players.length > 0 ? players : await loadPlayers();
	
	// Lade die Challenge-Datei für den heutigen Tag (nur auf dem Client)
	try {
		// Nur im Browser laden - nicht während Server-Side Rendering
		if (typeof window === 'undefined') {
			throw new Error('Challenge kann nur im Browser geladen werden');
		}
		
		const basePath = getBasePath();
		const response = await fetch(`${basePath}challenges/${date}.json`);
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const challengeData = await response.json();
		
		// Erstelle ein leeres Grid für den Spieler (am Anfang leer)
		const grid: (DELPlayer | null)[][] = Array(3)
			.fill(null)
			.map(() => Array(3).fill(null));

		return {
			date,
			title: challengeData.title,
			rowCategories: challengeData.rowCategories,
			colCategories: challengeData.colCategories,
			grid,
			answers: challengeData.answers
		};
	} catch (error) {
		console.warn(`Challenge-Datei für ${date} konnte nicht geladen werden:`, error instanceof Error ? error.message : String(error));
		
		// Fallback auf Standard-Kategorien
		const rowCategories = ['München', 'Berlin', 'Cologne'];
		const colCategories = ['Center (C)', 'Stürmer (LW/RW)', 'Verteidigung (D)'];
		const answers: string[][][] = [
			[['p1'], ['p7'], ['p3']],
			[['p6'], ['p2'], ['p4']],
			[['p8'], ['p5'], ['p9', 'p10']]
		];

		const grid: (DELPlayer | null)[][] = Array(3)
			.fill(null)
			.map(() => Array(3).fill(null));

		return {
			date,
			rowCategories,
			colCategories,
			grid,
			answers
		};
	}
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

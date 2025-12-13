import playersData from './all_players.json';

export interface DELPlayer {
	id: string;
	name: string;
	number: number;
	position: 'C' | 'LW' | 'RW' | 'D' | 'G';
	team: string;
	season: number;
	nationality: string;
}

export interface DELDokuChallenge {
	date: string;
	rowCategories: string[];
	colCategories: string[];
	grid: (DELPlayer | null)[][];
	answers: string[][][];
}

export const samplePlayers: DELPlayer[] = playersData as DELPlayer[];

export function getDailyChallengeDate(): string {
	return new Date().toISOString().split('T')[0];
}

export async function generateDailyChallenge(players: DELPlayer[]): Promise<DELDokuChallenge> {
	const date = getDailyChallengeDate();
	
	// Verwende alle Sample-Spieler wenn keine übergeben
	const allPlayers = players.length > 0 ? players : samplePlayers;
	
	// Lade die Challenge-Datei für den heutigen Tag
	try {
		const challengeModule = await import(`./challenges/${date}.json`);
		const challengeData = challengeModule.default;
		
		// Erstelle ein leeres Grid für den Spieler (am Anfang leer)
		const grid: (DELPlayer | null)[][] = Array(3)
			.fill(null)
			.map(() => Array(3).fill(null));

		return {
			date,
			rowCategories: challengeData.rowCategories,
			colCategories: challengeData.colCategories,
			grid,
			answers: challengeData.answers
		};
	} catch (error) {
		console.warn(`Challenge-Datei für ${date} nicht gefunden, verwende Standard-Kategorien`);
		
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
	rowCategory: string,
	colCategory: string,
	answers: string[][][],
	rowIdx: number,
	colIdx: number,
	allPlayers: DELPlayer[] = samplePlayers
): boolean {
	// Hole die gültigen Player-IDs für diese Zelle
	const expectedPlayerIds = answers[rowIdx][colIdx];
	
	// Überprüfe ob der ausgewählte Spieler in den gültigen IDs enthalten ist
	if (!expectedPlayerIds.includes(player.id)) {
		return false;
	}

	// Zusätzliche Validierung: Überprüfe ob der Spieler die Kategorien erfüllt
	const matchesRowCategory = rowCategory === 'München' ? player.team === 'München' :
	                           rowCategory === 'Berlin' ? player.team === 'Berlin' :
	                           rowCategory === 'Cologne' ? player.team === 'Cologne' :
	                           false;

	const matchesColCategory = colCategory === 'Center (C)' ? player.position === 'C' :
	                          colCategory === 'Stürmer (LW/RW)' ? (player.position === 'LW' || player.position === 'RW') :
	                          colCategory === 'Verteidigung (D)' ? player.position === 'D' :
	                          false;

	return matchesRowCategory && matchesColCategory;
}

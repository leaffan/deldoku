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

export interface PuckdokuChallenge {
	date: string;
	rowCategories: string[];
	colCategories: string[];
	grid: (DELPlayer | null)[][];
	answers: string[][][];
}

export const samplePlayers: DELPlayer[] = playersData;

export function getDailyChallengeDate(): string {
	return new Date().toISOString().split('T')[0];
}

export function generateDailyChallenge(players: DELPlayer[]): PuckdokuChallenge {
	const date = getDailyChallengeDate();
	
	// Verwende alle Sample-Spieler wenn keine übergeben
	const allPlayers = players.length > 0 ? players : samplePlayers;
	
	// Definiere die Kategorien für dieses Rätsel
	const rowCategories = ['München', 'Berlin', 'Cologne'];
	const colCategories = ['Center (C)', 'Stürmer (LW/RW)', 'Verteidigung (D)'];

	// Erstelle ein 3x3 Grid mit Spieler-IDs als Lösungen
	// Jede Zelle kann mehrere gültige Spieler haben
	const answers: string[][][] = [
		[['p1'], ['p7'], ['p3']],     // München: John Doe (C), Martin Hoffmann (LW), Anna Schmidt (D)
		[['p6'], ['p2'], ['p4']],     // Berlin: Stefan König (C), Max Mustermann (LW), Klaus Weber (D)
		[['p8'], ['p5'], ['p9', 'p10']]    // Cologne: Christian Uhle (C), Thomas Bauer (RW), Robert Müller/Fischer (D)
	];

	// Erstelle ein leeres Grid für den Spieler (am Anfang leer)
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

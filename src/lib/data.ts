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
		samplePlayers = await response.json();
	}
	return samplePlayers;
}

export function getDailyChallengeDate(): string {
	// Verwende lokale Zeit statt UTC
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
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

import { debug } from './debug';

export function calculateRarityScore(
	playerSelections: Record<string, string>,
	allStats: Record<string, any>
): { totalScore: number; cellScores: Record<string, number> } {
	const cellScores: Record<string, number> = {};
	let totalScore = 0;

	debug('🎯 Starting score calculation...');

	// Zähle wie oft jeder Spieler in jeder Position verwendet wurde
	const usageCounts: Record<string, Record<string, number>> = {};
	
	// Initialisiere Zähler für alle 9 Positionen
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 3; col++) {
			const cellKey = `${row}-${col}`;
			usageCounts[cellKey] = {};
		}
	}

	// Durchlaufe alle Spielerstatistiken
	Object.values(allStats).forEach((stats: any) => {
		stats.gameHistory?.forEach((game: any) => {
			Object.entries(game.playerSelections).forEach(([cellKey, playerId]) => {
				if (playerId && playerId !== '') {
					if (!usageCounts[cellKey]) {
						usageCounts[cellKey] = {};
					}
					usageCounts[cellKey][playerId as string] = (usageCounts[cellKey][playerId as string] || 0) + 1;
				}
			});
		});
	});

	// Berechne die Gesamtzahl aller Antworten pro Zelle (für Normalisierung)
	const totalAnswersPerCell: Record<string, number> = {};
	Object.entries(usageCounts).forEach(([cellKey, playerCounts]) => {
		const counts = Object.values(playerCounts);
		totalAnswersPerCell[cellKey] = counts.reduce((sum, count) => sum + count, 0);
	});

	debug('📊 Total answers per cell:', totalAnswersPerCell);

	// Berechne Punkte für jede Zelle
	Object.entries(playerSelections).forEach(([cellKey, playerId]) => {
		if (!playerId || playerId === '') {
			// Leere Zelle = 0 Punkte
			cellScores[cellKey] = 0;
			debug(`  ${cellKey}: (leer) → 0 Punkte`);
		} else {
			const usageCount = usageCounts[cellKey]?.[playerId] || 0;
			const totalAnswers = totalAnswersPerCell[cellKey] || 1;
			
			// Dynamische Formel: 100 * (1 - usageCount / totalAnswers)
			// Minimum 10 Punkte für richtige Antworten
			const score = Math.max(10, Math.round(100 * (1 - usageCount / totalAnswers)));
			cellScores[cellKey] = score;
			totalScore += score;
			
			debug(`  ${cellKey}: ${playerId.split('/')[1] || playerId} → ${usageCount}/${totalAnswers} Verwendungen = ${score} Punkte`);
		}
	});

	debug(`✅ Total Score: ${totalScore}/900`);

	return { totalScore, cellScores };
}

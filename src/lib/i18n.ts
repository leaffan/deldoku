export type Language = 'de' | 'en';

export type Translations = {
	title: string;
	subtitle: string;
	loading: string;
	error: string;
	errorConsole: string;
	showStats: string;
	hideStats: string;
	correctAnswer: string;
	partialAnswer: string;
	answersGiven: string;
	submitSolution: string;
	restartGame: string;
	statistics: string;
	totalGames: string;
	winRate: string;
	gamesWon: string;
	gameHistory: string;
	won: string;
	lost: string;
	score: string;
	selectPlayer: string;
	row: string;
	column: string;
	cancel: string;
	showDetails: string;
	howToPlay: string;
	close: string;
	rulesGoal: string;
	rulesGoalText: string;
	rulesHowTo: string;
	rulesHowTo1: string;
	rulesHowTo2: string;
	rulesHowTo3: string;
	rulesHowTo4: string;
	rulesScoring: string;
	rulesScoring1: string;
	rulesScoring2: string;
	rulesScoring3: string;
	rulesScoring4: string;
	points: string;
	noGamesYet: string;
	delStats: string;
	todaysTopic: string;
	shareResult: string;
};

export type CategoryKey =
	| '20_goal'
	| '30_assist'
	| '50_point'
	| '150_g_career'
	| '250_a_career'
	| '400_pts_career'
	| '500_pts_career'
	| 'single_team'
	| 'championship'
	| '100_penalty_minutes'
	| '1994'
	| '2025'
	| 'WJC-20'
	| 'WJC-20_MEDAL'
	| 'WJC-20_GOLD_MEDAL';

export const categories: Record<Language, Record<CategoryKey, string>> = {
	de: {
		'20_goal': '20-Tore-Saison',
		'30_assist': '30-Vorlagen-Saison',
		'50_point': '50-Punkte-Saison',
		'150_g_career': '150 Tore/Karriere',
		'250_a_career': '250 Vorlagen/Karriere',
		'400_pts_career': '400 Punkte/Karriere',
		'500_pts_career': '500 Punkte / Karriere',
		'single_team': 'Nur ein Team',
		'championship': 'DEL-Meister',
		'100_penalty_minutes': '100 Strafminuten-Saison',
		'1994': '1994/95 aktive Spieler',
		'2025': '2025/26 aktive Spieler',
		'WJC-20': 'U20-WM-Teilnehmer',
		'WJC-20_MEDAL': 'U20-WM-Medaille',
		'WJC-20_GOLD_MEDAL': 'U20-WM-Titel'
	},
	en: {
		'20_goal': '20 Goals Season',
		'30_assist': '30 Assists Season',
		'50_point': '50 Points Season',
		'150_g_career': '150 Goals/Career',
		'250_a_career': '250 Assists/Career',
		'400_pts_career': '400 Points/Career',
		'500_pts_career': '500 Points / Career',
		'single_team': 'Single Team',
		'championship': 'DEL Champion',
		'100_penalty_minutes': '100 Penalty Minutes Season',
		'1994': '1994/95 Active Players',
		'2025': '2025/26 Active Players',
		'WJC-20': 'U20s Participant',
		'WJC-20_MEDAL': 'U20s Medal',
		'WJC-20_GOLD_MEDAL': 'U20s Champion'
	}
};

export const translations: Record<Language, Translations> = {
	de: {
		title: 'DELDoku',
		subtitle: 'Finde die Spieler basierend auf Team- und Positionskombinationen!',
		loading: 'Laden...',
		error: 'Fehler beim Laden: ',
		errorConsole: 'Bitte öffne die Browser-Konsole (F12) für mehr Details.',
		showStats: 'Statistiken anzeigen',
		hideStats: 'Statistiken ausblenden',
		correctAnswer: '🎉 Glückwunsch! Rätsel gelöst!',
		partialAnswer: 'Zellen korrekt. Versuchen Sie es erneut!',
		answersGiven: 'Antworten',
		submitSolution: 'Lösung einreichen',
		restartGame: 'Spiel neu starten',
		statistics: 'Statistiken',
		totalGames: 'Spiele gesamt',
		winRate: 'Gewinnquote',
		gamesWon: 'Spiele gewonnen',
		gameHistory: 'Spielhistorie',
		won: '✓ Gewonnen',
		lost: '✗ Verloren',
		todaysTopic: 'Heutiges Thema',
		shareResult: 'Ergebnis teilen',
		score: 'Punkte',
		selectPlayer: 'Spieler auswählen',
		row: 'Zeile',
		column: 'Spalte',
		cancel: 'Abbrechen',
		showDetails: 'Details anzeigen',
		howToPlay: 'Spielregeln',
		close: 'Schließen',
		rulesGoal: 'Spielziel',
		rulesGoalText: 'Fülle das 3x3-Raster mit DEL-Spielern, die sowohl die Zeilen- als auch die Spaltenbedingung erfüllen. Jeder Spieler darf nur einmal verwendet werden.',
		rulesHowTo: 'Spielablauf',
		rulesHowTo1: 'Klicke auf eine Zelle, um einen Spieler durch Eingabe des Namens auszuwählen',
		rulesHowTo2: 'Der Spieler muss beide Bedingungen (Zeile und Spalte) erfüllen',
		rulesHowTo3: 'Richtige Antworten füllen die Zelle grün, falsche rot',
		rulesHowTo4: 'Das Spiel endet nach 9 Antworten oder durch Klick auf "Lösung einreichen"',
		rulesScoring: 'Punktewertung',
		rulesScoring1: 'Jede richtige Antwort bringt 10-100 Punkte basierend auf der Seltenheit',
		rulesScoring2: 'Seltenere Spieler (weniger oft verwendet) bringen mehr Punkte',
		rulesScoring3: 'Bei vollständig gelöstem Rätsel gibt es 100 Bonuspunkte',
		rulesScoring4: 'Maximale Punktzahl: 1000 Punkte',
		points: 'Pkt',
		noGamesYet: 'Noch keine Spiele gespielt. Starten Sie ein Spiel um Statistiken zu sammeln!',
		delStats: 'DEL-Statistiken'
	},
	en: {
		title: "DELDoku",
		subtitle: 'Find the players based on team and position combinations!',
		loading: 'Loading...',
		error: 'Error loading: ',
		errorConsole: 'Please open the browser console (F12) for more details.',
		showStats: 'Show Statistics',
		hideStats: 'Hide Statistics',
		correctAnswer: '🎉 Congratulations! Puzzle solved!',
		partialAnswer: 'cells correct. Try again!',
		answersGiven: 'Answers',
		submitSolution: 'Submit Solution',
		restartGame: 'Restart Game',
		statistics: 'Statistics',
		totalGames: 'Total Games',
		winRate: 'Win Rate',
		gamesWon: 'Games Won',
		gameHistory: 'Game History',
		won: '✓ Won',
		lost: '✗ Lost',
		todaysTopic: "Today's Topic",
		shareResult: 'Share Result',
		score: 'Score',
		selectPlayer: 'Select Player',
		row: 'Row',
		column: 'Column',
		cancel: 'Cancel',
		showDetails: 'Show Details',
		howToPlay: 'How to Play',
		close: 'Close',
		rulesGoal: 'Game Objective',
		rulesGoalText: 'Fill the 3x3 grid with DEL players who meet both the row and column conditions. Each player can only be used once.',
		rulesHowTo: 'How to Play',
		rulesHowTo1: 'Click on a cell to select a player',
		rulesHowTo2: 'The player must meet both conditions (row and column)',
		rulesHowTo3: 'Correct answers fill the cell green, incorrect ones red',
		rulesHowTo4: 'The game ends after 9 answers or by clicking "Submit Solution"',
		rulesScoring: 'Scoring',
		rulesScoring1: 'Each correct answer earns 10-100 points based on rarity',
		rulesScoring2: 'Rarer players (used less often) earn more points',
		rulesScoring3: 'Completely solved puzzles earn 100 bonus points',
		rulesScoring4: 'Maximum score: 1000 points',
		points: 'Pts',
		noGamesYet: 'No games played yet. Start a game to collect statistics!',
		delStats: 'DEL Statistics'
	}
};

export function t(key: keyof typeof translations.de, lang: Language | undefined): string {
	const language: Language = lang === 'en' ? 'en' : 'de';
	return translations[language][key] || translations.de[key];
}

export function c(key: keyof typeof categories.de, lang: Language | undefined): string {
	const language: Language = lang === 'en' ? 'en' : 'de';
	return categories[language][key] || categories.de[key];
}

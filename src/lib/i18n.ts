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

	// Aggregated stats
	globalStatsTitle: string;
	globalStatsLoading: string;
	globalStatsError: string;
	globalStatsGamesToday: string;
	globalStatsAvgCorrect: string;
	globalStatsAvgScore: string;
};

export type CategoryKey =
	| '20_goal'
	| '50_point'
	| '20_g_season'
	| '30_g_season'
	| '5_g_season_po'
	| '30_a_season'
	| '20_pts_season'
	| '40_pts_season'
	| '50_pts_season'
	| '60_pts_season'
	| '70_pts_season'
	| '1_so_season'
	| '5_so_season'
	| '1_so_season_po'
	| '100_gp_career'
	| '500_gp_career'
	| '10_gp_career_po'
	| '25_gp_career_po'
	| '50_gp_career_po'
	| '100_gp_career_po'
	| '50_g_career'
	| '100_g_career'
	| '150_g_career'
	| '200_g_career'
	| '10_g_career_po'
	| '100_a_career'
	| '200_a_career'
	| '250_a_career'
	| '250_pts_career'
	| '400_pts_career'
	| '500_pts_career'
	| '30_pts_career_po'
	| '500_pim_career'
	| '100_pim_career_po'
	| '50_pim_career_po'
	| '10_so_career'
	| '25_so_career'
	| '1_teams'
	| '2_teams'
	| '3_teams'
	| '3_plus_teams'
	| '5_plus_teams'
	| '6_teams'
	| 'italy-champion'
	| 'del-champion'
	| 'del2-champion'
	| 'dnl-champion'
	| 'spengler-cup-winner'
	| 'hobey-baker-memorial-award-finalist'
	| '100_pim_season'
	| '1994'
	| '2025'
	| 'WJC-20'
	| 'WJC-20_MEDAL'
	| 'u20-wjc-gold-medal'
	| 'world-championship-medal'
	| 'shl-sm-silver-medal'
	| 'drafted'
	| 'not_drafted'
	| 'dual_nationalities'
	| 'draft_2000s'
	| 'draft_round_1'
	| 'draft_round_2'
	| 'goalie'
	| 'defender'
	| 'forward'
	| 'le_2.5_gaa_season'
	| 'le_100_gp_career'
	| 'le_10_gp_career'
	| 'goalscorer_over_40'
	| 'relative_del'
	| 'relative_nhl'
	| '50_w_career'
	| '10_w_season_po'
	| 'le_3.0_gaa_season_po'
	;

export const categories: Record<Language, Record<CategoryKey, string>> = {
	de: {
		'20_goal': '20-Tore-Saison',
		'50_point': '50-Punkte-Saison',
		'20_g_season': '20-Tore-Saison',
		'30_g_season': '30-Tore-Saison',
		'5_g_season_po': '5-Tore-Saison (Playoffs)',
		'30_a_season': '30-Vorlagen-Saison',
		'20_pts_season': '20-Punkte-Saison',
		'40_pts_season': '40-Punkte-Saison',
		'50_pts_season': '50-Punkte-Saison',
		'60_pts_season': '60-Punkte-Saison',
		'70_pts_season': '70-Punkte-Saison',
		'100_pim_season': '100 Strafminuten-Saison',
		'1_so_season': '1+ Shutout-Saison',
		'1_so_season_po': '1+ Shutout-Saison (Playoffs)',
		'5_so_season': '5+ Shutout-Saison',
		'le_2.5_gaa_season': 'Saison mit ≤ 2,50 GTS',
		'100_gp_career': '100 Spiele / Karriere',
		'500_gp_career': '500 Spiele / Karriere',
		'10_gp_career_po': '10 Playoff-Spiele / Karriere',
		'25_gp_career_po': '25 Playoff-Spiele / Karriere',
		'50_gp_career_po': '50 Playoff-Spiele / Karriere',
		'100_gp_career_po': '100 Playoff-Spiele / Karriere',
		'50_g_career': '50 Tore / Karriere',
		'100_g_career': '100 Tore / Karriere',
		'150_g_career': '150 Tore / Karriere',
		'200_g_career': '200 Tore / Karriere',
		'10_g_career_po': '10 Playoff-Tore / Karriere',
		'100_a_career': '100 Vorlagen / Karriere',
		'200_a_career': '200 Vorlagen / Karriere',
		'250_a_career': '250 Vorlagen / Karriere',
		'250_pts_career': '250 Punkte / Karriere',
		'400_pts_career': '400 Punkte / Karriere',
		'500_pts_career': '500 Punkte / Karriere',
		'30_pts_career_po': '30 Playoff-Punkte / Karriere',
		'500_pim_career': '500 Strafminuten / Karriere',
		'100_pim_career_po': '100 Strafminuten in Playoffs / Karriere',
		'50_pim_career_po': '50 Strafminuten in Playoffs / Karriere',
		'10_so_career': '10+ Shutouts / Karriere',
		'25_so_career': '25+ Shutouts / Karriere',
		'le_100_gp_career': '≤ 100 Spiele / Karriere',
		'le_10_gp_career': '≤ 10 Spiele / Karriere',
		'1_teams': 'Nur ein Team',
		'2_teams': 'Exakt 2 Teams',
		'3_plus_teams': '3+ Teams',
		'3_teams': 'Exakt 3 Teams',
		'5_plus_teams': '5+ Teams',
		'6_teams': 'Exakt 6 Teams',
		'del-champion': 'DEL-Meister',
		'del2-champion': 'DEL2-Meister',
		'dnl-champion': 'DNL-Meister',
		'italy-champion': 'Italienischer Meister',
		'spengler-cup-winner': 'Spengler-Cup-Sieger',
		'hobey-baker-memorial-award-finalist': 'Finalist Hobey-Baker-Award',
		'1994': '1994/95 aktive Spieler',
		'2025': '2025/26 aktive Spieler',
		'WJC-20': 'U20-WM-Teilnehmer',
		'WJC-20_MEDAL': 'U20-WM-Medaille',
		'u20-wjc-gold-medal': 'U20-WM-Titel',
		'world-championship-medal': 'WM-Medaille',
		'shl-sm-silver-medal': 'SHL-Vizemeister',
		'drafted': 'Ausgewählt im NHL-Draft',
		'not_drafted': 'Nicht ausgewählt im NHL-Draft',
		'dual_nationalities': 'Doppelflaggen-Spieler',
		'draft_2000s': 'Ausgewählt im NHL-Draft der 2000er',
		'draft_round_1': 'In Runde 1 gedraftet',
		'draft_round_2': 'In Runde 2 gedraftet',
		'goalie': 'Torwart',
		'defender': 'Verteidiger',
		'forward': 'Stürmer',
		'goalscorer_over_40': 'Torschütze über 40 Jahre',
		'relative_del': 'Verwandter mit DEL-Spiel(en)',
		'relative_nhl': 'Verwandter mit NHL-Spiel(en)',
		'50_w_career': '50 Siege / Karriere',
		'10_w_season_po': '10 Siege in Playoffs / Saison',
		'le_3.0_gaa_season_po': 'Saison mit ≤ 3,0 GTS in Playoffs'
	},
	en: {
		'20_goal': '20 Goals / Season',
		'50_point': '50 Points / Season',
		'20_g_season': '20 Goals / Season',
		'30_g_season': '30 Goals / Season',
		'5_g_season_po': '5 Goals / Season (Playoffs)',
		'30_a_season': '30 Assists / Season',
		'20_pts_season': '20 Points / Season',
		'40_pts_season': '40 Points / Season',
		'50_pts_season': '50 Points / Season',
		'60_pts_season': '60 Points / Season',
		'70_pts_season': '70 Points / Season',
		'100_pim_season': '100 PIMs / Season',
		'1_so_season': '1+ Shutout Season',
		'1_so_season_po': '1+ Shutout Season (Playoffs)',
		'le_2.5_gaa_season': '≤ 2.50 GAA / Season',
		'100_gp_career': '100 Games / Career',
		'500_gp_career': '500 Games / Career',
		'10_gp_career_po': '10 Playoff Games / Career',
		'25_gp_career_po': '25 Playoff Games / Career',
		'50_gp_career_po': '50 Playoff Games / Career',
		'100_gp_career_po': '100 Playoff Games / Career',
		'50_g_career': '50 Goals / Career',
		'100_g_career': '100 Goals / Career',
		'150_g_career': '150 Goals / Career',
		'200_g_career': '200 Goals / Career',
		'10_g_career_po': '10 Playoff Goals / Career',
		'100_a_career': '100 Assists / Career',
		'200_a_career': '200 Assists / Career',
		'250_a_career': '250 Assists / Career',
		'250_pts_career': '250 Points / Career',
		'400_pts_career': '400 Points / Career',
		'500_pts_career': '500 Points / Career',
		'30_pts_career_po': '30 Playoff Points / Career',
		'500_pim_career': '500 PIMs / Career',
		'100_pim_career_po': '100 PIMs in Playoffs / Career',
		'50_pim_career_po': '50 PIMs in Playoffs / Career',
		'10_so_career': '10+ Shutouts / Career',
		'25_so_career': '25+ Shutouts / Career',
		'5_so_season': '5+ Shutout Season',
		'le_100_gp_career': '≤ 100 Games / Career',
		'le_10_gp_career': '≤ 10 Games / Career',
		'1_teams': 'Single Team',
		'2_teams': 'Exactly 2 Teams',
		'3_plus_teams': '3+ Teams',
		'3_teams': 'Exactly 3 Teams',
		'5_plus_teams': '5+ Teams',
		'6_teams': 'Exactly 6 Teams',
		'del-champion': 'DEL Champion',
		'del2-champion': 'DEL2 Champion',
		'dnl-champion': 'DNL Champion',
		'italy-champion': 'Italian Champion',
		'spengler-cup-winner': 'Spengler Cup Champion',
		'hobey-baker-memorial-award-finalist': 'Hobey Baker Award Finalist',
		'world-championship-medal': 'World Championship Medal',
		'shl-sm-silver-medal': 'SHL Silver Medal',
		'1994': '1994/95 Active Players',
		'2025': '2025/26 Active Players',
		'WJC-20': 'U20s Participant',
		'WJC-20_MEDAL': 'U20s Medal',
		'u20-wjc-gold-medal': 'U20s Gold Medal',
		'drafted': 'Selected in NHL Draft',
		'not_drafted': 'Not selected in NHL Draft',
		'draft_round_1': 'Drafted in Round 1',
		'draft_round_2': 'Drafted in Round 2',
		'dual_nationalities': 'Dual Nationalities',
		'draft_2000s': 'Selected in NHL Draft of 2000s',
		'goalie': 'Goalie',
		'defender': 'Defender',
		'forward': 'Forward',
		'goalscorer_over_40': 'Goalscorer over 40 years',
		'relative_del': 'Relative with DEL game(s) played',
		'relative_nhl': 'Relative with NHL game(s) played',
		'50_w_career': '50 Wins / Career',
		'10_w_season_po': '10 Wins in Playoffs / Season',
		'le_3.0_gaa_season_po': '≤ 3.0 GAA / Season in Playoffs'
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
		delStats: 'DEL-Statistiken',
		globalStatsTitle: '🌍 Gesamtstatistiken (heute)',
		globalStatsLoading: 'Lade Gesamtstatistiken...',
		globalStatsError: 'Fehler: ',
		globalStatsGamesToday: 'Spiele heute',
		globalStatsAvgCorrect: 'Ø richtige Antworten',
		globalStatsAvgScore: 'Ø Punkte'
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
		delStats: 'DEL Statistics',
		globalStatsTitle: '🌍 Global Statistics (today)',
		globalStatsLoading: 'Loading global statistics...',
		globalStatsError: 'Error: ',
		globalStatsGamesToday: 'Games today',
		globalStatsAvgCorrect: 'Avg. correct answers',
		globalStatsAvgScore: 'Avg. score'
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

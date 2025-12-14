export type Language = 'de' | 'en';

export const translations = {
	de: {
		title: 'DEL-Doku',
		subtitle: 'Finde die Spieler basierend auf Team- und Positionskombinationen!',
		loading: 'Laden...',
		error: 'Fehler beim Laden: ',
		errorConsole: 'Bitte öffne die Browser-Konsole (F12) für mehr Details.',
		showStats: 'Statistiken anzeigen',
		hideStats: 'Statistiken ausblenden',
		correctAnswer: '🎉 Glückwunsch! Rätsel gelöst!',
		partialAnswer: 'Zellen korrekt. Versuchen Sie es erneut!',
		answersGiven: 'Antworten gegeben',
		about: 'Über',
		language: 'Sprache',
		submitSolution: 'Lösung einreichen',
		restartGame: 'Spiel neu starten',
		statistics: 'Statistiken',
		totalGames: 'Spiele gesamt',
		winRate: 'Gewinnquote',
		gamesWon: 'Spiele gewonnen',
		gameHistory: 'Spielhistorie',
		won: '✓ Gewonnen',
		lost: '✗ Verloren',
		currentStreak: 'Aktuelle Serie'
	},
	en: {
		title: 'DEL-Doku',
		subtitle: 'Find the players based on team and position combinations!',
		loading: 'Loading...',
		error: 'Error loading: ',
		errorConsole: 'Please open the browser console (F12) for more details.',
		showStats: 'Show Statistics',
		hideStats: 'Hide Statistics',
		correctAnswer: '🎉 Congratulations! Puzzle solved!',
		partialAnswer: 'cells correct. Try again!',
		answersGiven: 'answers given',
		about: 'About',
		language: 'Language',
		submitSolution: 'Submit Solution',
		restartGame: 'Restart Game',
		statistics: 'Statistics',
		totalGames: 'Total Games',
		winRate: 'Win Rate',
		gamesWon: 'Games Won',
		gameHistory: 'Game History',
		won: '✓ Won',
		lost: '✗ Lost',
		currentStreak: 'Current Streak'
	}
};

export function t(key: keyof typeof translations.de, lang: Language | undefined): string {
	const language: Language = lang === 'en' ? 'en' : 'de';
	return translations[language][key] || translations.de[key];
}

import type { PlayerStats } from './stores';

/**
 * Gibt das aktuelle Challenge-Datum zurück (Format: YYYY-MM-DD)
 */
export function getCurrentChallengeId(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Prüft ob die Stats für eine neue Challenge zurückgesetzt werden müssen
 * und archiviert die alten Stats wenn nötig
 */
export function checkAndArchiveStats(stats: PlayerStats, defaultStats: PlayerStats): PlayerStats {
	const currentChallenge = getCurrentChallengeId();
	
	// Wenn keine currentChallenge gesetzt ist, setze sie
	if (!stats.currentChallenge) {
		return { ...stats, currentChallenge };
	}
	
	// Wenn Challenge gewechselt hat, archiviere und setze zurück
	if (stats.currentChallenge !== currentChallenge) {
		// Archiviere alte Stats in localStorage
		if (typeof window !== 'undefined') {
			const archiveKey = `del_doku_stats_archive_${stats.currentChallenge}`;
			localStorage.setItem(archiveKey, JSON.stringify(stats));
			console.log(`📦 Stats für Challenge ${stats.currentChallenge} archiviert`);
		}
		
		// Neue Stats für aktuelle Challenge
		return { ...defaultStats, currentChallenge };
	}
	
	// Challenge ist gleich, keine Änderung nötig
	return stats;
}

/**
 * Lädt archivierte Stats für ein bestimmtes Challenge-Datum
 */
export function loadArchivedStats(challengeId: string): PlayerStats | null {
	if (typeof window === 'undefined') return null;
	
	const archiveKey = `del_doku_stats_archive_${challengeId}`;
	const stored = localStorage.getItem(archiveKey);
	
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch (e) {
			console.error('Error parsing archived stats:', e);
			return null;
		}
	}
	
	return null;
}

/**
 * Listet alle archivierten Challenge-IDs auf
 */
export function listArchivedChallenges(): string[] {
	if (typeof window === 'undefined') return [];
	
	const archives: string[] = [];
	const prefix = 'del_doku_stats_archive_';
	
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith(prefix)) {
			archives.push(key.substring(prefix.length));
		}
	}
	
	return archives.sort().reverse(); // Neueste zuerst
}

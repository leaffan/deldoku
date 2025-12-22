// Debug-Utility für DELDoku
// Aktiviere Debug-Logs mit ?debug=true in der URL

let debugEnabled = false;

if (typeof window !== 'undefined') {
	const params = new URLSearchParams(window.location.search);
	debugEnabled = params.get('debug') === 'true';
	
	if (debugEnabled) {
		console.log('🐛 Debug-Modus aktiviert');
	}
}

export function debug(...args: any[]) {
	if (debugEnabled) {
		console.log('[DEBUG]', ...args);
	}
}

export function isDebugEnabled(): boolean {
	return debugEnabled;
}

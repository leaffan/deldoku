// Debug utility for DELDoku
// Enable debug logs with ?debug=true in the URL

let debugEnabled = false;

let debugChallenge: string | null = null;

if (typeof window !== 'undefined') {
	const params = new URLSearchParams(window.location.search);
	debugEnabled = params.get('debug') === 'true';
	debugChallenge = params.get('challenge');

	if (debugEnabled) {
		console.log('🐛 Debug mode enabled');
		if (debugChallenge) {
			console.log(`[DEBUG] Challenge-Override: ${debugChallenge}`);
		}
	}
}

export function debug(...args: unknown[]) {
	if (debugEnabled) {
		console.log('[DEBUG]', ...args);
	}
}

export function isDebugEnabled(): boolean {
	return debugEnabled;
}

export function getDebugChallenge(): string | null {
	return debugChallenge;
}

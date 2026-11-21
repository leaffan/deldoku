import type { DELPlayer } from './data';

/**
 * Returns the search forms of a text (name or input), e.g. for "Müller":
 *   ['muller', 'mueller']  — accents stripped or German transcription
 * Duplicate forms (e.g. for "Smith") occur only once.
 *
 * Names and input go through the same function; it is a match if any form of the
 * input is contained in any form of the name.
 */
export function searchForms(text: string): string[] {
	// Lowercase and handle special characters
	const lower = text.toLowerCase().replaceAll('ø', 'o');
	// Strip accents
	const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');
	// Transcribe umlauts
	const transcribed = lower
		.replaceAll('ä', 'ae')
		.replaceAll('ö', 'oe')
		.replaceAll('ü', 'ue')
		.replaceAll('ß', 'ss'); /* … ö, ü, ß */
	// Build the result: unique forms of the original and the transcription
	return [...new Set([strip(lower), strip(transcribed)])];
}

// Search forms per player; computed once per player object instead of on every keystroke.
// WeakMap instead of a field on DELPlayer, so the data type stays free of search internals.
const formsCache = new WeakMap<DELPlayer, string[]>();

function playerForms(player: DELPlayer): string[] {
	let forms = formsCache.get(player);
	if (!forms) {
		forms = searchForms(player.name);
		formsCache.set(player, forms);
	}
	return forms;
}

/** Prepared input; compute once per keystroke and reuse for all players. */
export function prepareQuery(query: string): string[] {
	const trimmed = query.trim();
	return trimmed.length === 0 ? [] : searchForms(trimmed);
}

export function playerMatches(player: DELPlayer, queryForms: string[]): boolean {
	const names = playerForms(player);
	return queryForms.some((q) => names.some((n) => n.includes(q)));
}

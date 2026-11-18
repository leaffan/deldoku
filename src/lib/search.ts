import type { DELPlayer } from './data';

/**
 * Liefert die Suchformen eines Textes (Name oder Eingabe), z. B. für "Müller":
 *   ['muller', 'mueller']  — Akzente entfernt bzw. deutsch transkribiert
 * Doppelte Formen (etwa bei "Smith") sollen nur einmal vorkommen.
 *
 * Name und Eingabe laufen durch dieselbe Funktion; ein Treffer liegt vor, wenn irgendeine
 * Form der Eingabe in irgendeiner Form des Namens enthalten ist.
 */
export function searchForms(text: string): string[] {
	// Kleinbuchstaben und Sonderzeichen behandeln
	const lower = text.toLowerCase().replaceAll('ø', 'o');
	// Akzente entfernen
	const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');
	// Umlaute transkribieren
	const transcribed = lower
		.replaceAll('ä', 'ae')
		.replaceAll('ö', 'oe')
		.replaceAll('ü', 'ue')
		.replaceAll('ß', 'ss'); /* … ö, ü, ß */
	// Ergebnis zusammenstellen: Einzigartige Formen von Original und transkribiert
	return [...new Set([strip(lower), strip(transcribed)])];
}

// Suchformen je Spieler; einmal pro Spielerobjekt berechnet statt bei jedem Tastendruck.
// WeakMap statt Feld in DELPlayer, damit der Datentyp frei von Such-Interna bleibt.
const formsCache = new WeakMap<DELPlayer, string[]>();

function playerForms(player: DELPlayer): string[] {
	let forms = formsCache.get(player);
	if (!forms) {
		forms = searchForms(player.name);
		formsCache.set(player, forms);
	}
	return forms;
}

/** Vorbereitete Eingabe; einmal pro Tastendruck berechnen und für alle Spieler verwenden. */
export function prepareQuery(query: string): string[] {
	return searchForms(query.trim());
}

export function playerMatches(player: DELPlayer, queryForms: string[]): boolean {
	const names = playerForms(player);
	return queryForms.some((q) => names.some((n) => n.includes(q)));
}

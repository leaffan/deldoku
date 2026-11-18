import { describe, expect, it } from 'vitest';
import type { DELPlayer } from './data';
import { playerMatches, prepareQuery, searchForms } from './search';

function player(name: string): DELPlayer {
	return { id: '1/x', name, nationality: 'de', first_season: 2000, last_season: 2001 };
}

function finds(name: string, query: string): boolean {
	return playerMatches(player(name), prepareQuery(query));
}

describe('searchForms', () => {
	it('lowercases and has no duplicates for plain names', () => {
		expect(searchForms('Smith')).toEqual(['smith']);
	});

	it('strips accents and transcribes German umlauts', () => {
		expect(searchForms('Müller')).toEqual(expect.arrayContaining(['muller', 'mueller']));
	});

	it('transcribes ß', () => {
		expect(searchForms('Strauß')).toEqual(expect.arrayContaining(['strauss']));
	});
});

describe('playerMatches', () => {
	it.each([
		['Müller', 'muller'],
		['Müller', 'mueller'],
		['Müller', 'Müller'],
		['Müller', 'MÜL'],
		['Mueller', 'müller'],
		['Strauß', 'strauss'],
		['Jaromír Jágr', 'jagr'],
		['Rémi Elie', 'remi'],
		['Jonas Holøs', 'holos'],
		['Jonas Holøs', 'Holøs'],
		['Patrick Hager', ' hager ']
	])('%s is found by %j', (name, query) => {
		expect(finds(name, query)).toBe(true);
	});

	it.each([
		['Müller', 'mux'],
		['Smith', 'smyth']
	])('%s is not found by %j', (name, query) => {
		expect(finds(name, query)).toBe(false);
	});
});

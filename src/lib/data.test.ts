import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// data.ts hält die Spielerliste und die aktuelle Saison im Modul-Zustand; jeder Test lädt das
// Modul daher frisch.
type DataModule = typeof import('./data');
let data: DataModule;

const BASE_URL = 'http://localhost/deldoku/';
const BASE_PATH = '/deldoku/'; // data.ts lädt relativ zum Pfad der Seite

const PLAYERS = [
	{ i: '1001/alice-a', n: 'Alice A', t: 'de', f: 2015, l: 2026 },
	{ i: '1002/bob-b', n: 'Bob B', t: 'ca,de', f: 2001, l: 2010 }
];

const CHALLENGE = {
	title: { de: 'Test', en: 'Test' },
	rowCategories: ['r1', 'r2', 'r3'],
	colCategories: ['c1', 'c2', 'c3'],
	answers: [
		[['1001/alice-a'], ['2001/x'], ['3001/y']],
		[['4001/z'], ['5001/u'], ['6001/v']],
		[['7001/w'], ['8001/s'], ['9001/t']]
	]
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

/** fetch-Attrappe: liefert pro Dateipfad unterhalb von /deldoku/ (z. B. "all_players.json") eine Antwort oder 404. */
function stubFetch(files: Record<string, Response | (() => Response)>) {
	const fetchMock = vi.fn(async (url: string) => {
		const name = url.slice(BASE_PATH.length);
		const entry = files[name];
		if (!entry) return new Response('not found', { status: 404 });
		return typeof entry === 'function' ? entry() : entry;
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

beforeEach(async () => {
	vi.resetModules();
	vi.stubGlobal('window', { location: { href: BASE_URL } });
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2030-06-15T23:30:00Z'));
	data = await import('./data');
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('epId / samePlayer', () => {
	it('extracts the Eliteprospects ID before the slash', () => {
		expect(data.epId('22333/bastian-steingroÃŸ')).toBe('22333');
	});

	it('returns IDs without a slash unchanged', () => {
		expect(data.epId('22333')).toBe('22333');
	});

	it('treats different name parts with the same EP ID as the same player', () => {
		expect(data.samePlayer('415499/johannes-krauß', '415499/johannes-krauÃŸ')).toBe(true);
		expect(data.samePlayer('15224/daniel-wei%C3%9F', '15224/daniel-weiß')).toBe(true);
	});

	it('distinguishes different EP IDs with the same name part', () => {
		expect(data.samePlayer('1/same-name', '2/same-name')).toBe(false);
	});
});

describe('validatePlayerMatch', () => {
	const player = {
		id: '1001/alice-a',
		name: 'Alice A',
		nationality: 'de',
		first_season: 2015,
		last_season: 2026
	};

	it('accepts a player listed in the cell', () => {
		expect(data.validatePlayerMatch(player, CHALLENGE.answers, 0, 0)).toBe(true);
	});

	it('accepts a player whose name part is spelled differently in the challenge', () => {
		const answers = structuredClone(CHALLENGE.answers);
		answers[0][0] = ['1001/alice-ä'];
		expect(data.validatePlayerMatch(player, answers, 0, 0)).toBe(true);
	});

	it('rejects a player listed only in another cell', () => {
		expect(data.validatePlayerMatch(player, CHALLENGE.answers, 0, 1)).toBe(false);
	});
});

describe('getDailyChallengeDate', () => {
	it('uses the UTC date, not the local one', () => {
		// 23:30 UTC is already the next day in Germany
		expect(data.getDailyChallengeDate()).toBe('2030-06-15');
	});
});

describe('loadPlayers / getCurrentSeason', () => {
	it('expands the compressed player format', async () => {
		stubFetch({ 'all_players.json': jsonResponse(PLAYERS) });
		const players = await data.loadPlayers();
		expect(players[1]).toEqual({
			id: '1002/bob-b',
			name: 'Bob B',
			nationality: 'ca,de',
			first_season: 2001,
			last_season: 2010
		});
	});

	it('derives the current season from the latest last_season', async () => {
		stubFetch({ 'all_players.json': jsonResponse(PLAYERS) });
		await data.loadPlayers();
		expect(data.getCurrentSeason()).toBe(2026);
	});

	it('loads the player list only once', async () => {
		const fetchMock = stubFetch({ 'all_players.json': () => jsonResponse(PLAYERS) });
		await data.loadPlayers();
		await data.loadPlayers();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('generateDailyChallenge', () => {
	const players = [
		{
			id: '1001/alice-a',
			name: 'Alice A',
			nationality: 'de',
			first_season: 2015,
			last_season: 2026
		}
	];

	it("loads today's challenge", async () => {
		stubFetch({ 'challenges/2030-06-15.json': jsonResponse(CHALLENGE) });
		const challenge = await data.generateDailyChallenge(players);
		expect(challenge.date).toBe('2030-06-15');
		expect(challenge.isFallback).toBe(false);
		expect(challenge.answers).toEqual(CHALLENGE.answers);
		expect(challenge.grid.flat()).toEqual(Array(9).fill(null));
	});

	it('falls back to fallback.json when there is no challenge for today', async () => {
		stubFetch({ 'challenges/fallback.json': jsonResponse(CHALLENGE) });
		const challenge = await data.generateDailyChallenge(players);
		expect(challenge.isFallback).toBe(true);
		expect(challenge.date).toBe('2030-06-15');
	});

	it('throws NoChallengeError when neither file exists', async () => {
		stubFetch({});
		await expect(data.generateDailyChallenge(players)).rejects.toBeInstanceOf(
			data.NoChallengeError
		);
	});

	it('reports server errors instead of falling back', async () => {
		const fetchMock = stubFetch({ 'challenges/2030-06-15.json': jsonResponse({}, 500) });
		await expect(data.generateDailyChallenge(players)).rejects.toThrow('HTTP 500');
		expect(fetchMock).not.toHaveBeenCalledWith(`${BASE_PATH}challenges/fallback.json`);
	});
});

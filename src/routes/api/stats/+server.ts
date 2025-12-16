import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import * as fs from 'fs';
import * as path from 'path';

// Pfad zur Datei, wo wir Stats speichern
const STATS_FILE = path.join(process.cwd(), 'data', 'stats.json');

// Stelle sicher, dass das Verzeichnis existiert
function ensureDataDir() {
	const dir = path.dirname(STATS_FILE);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

// Lade alle Stats aus der Datei
function loadAllStats(): Record<string, any> {
	ensureDataDir();
	if (fs.existsSync(STATS_FILE)) {
		const data = fs.readFileSync(STATS_FILE, 'utf-8');
		return JSON.parse(data);
	}
	return {};
}

// Speichere Stats in die Datei
function saveAllStats(stats: Record<string, any>) {
	ensureDataDir();
	fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// GET: Lade Stats für einen User oder alle Stats
export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	
	const allStats = loadAllStats();
	
	// Wenn userId angegeben, gebe nur diesen User zurück
	if (userId) {
		const userStats = allStats[userId] || null;
		return json({ userId, stats: userStats });
	}
	
	// Wenn keine userId angegeben, gebe alle Stats zurück (für Score-Berechnung)
	return json(allStats);
};

// POST: Speichere/Update Stats für einen User
export const POST: RequestHandler = async ({ request }) => {
	const { userId, stats } = await request.json();

	if (!userId || !stats) {
		return json({ error: 'userId and stats required' }, { status: 400 });
	}

	const allStats = loadAllStats();
	allStats[userId] = stats;
	saveAllStats(allStats);

	return json({ success: true, userId, stats });
};

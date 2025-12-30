import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import * as fs from 'fs';
import * as path from 'path';

// Liefert den Pfad zur Stats-Datei für das aktuelle UTC-Datum
function getStatsFilePath() {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	const day = String(now.getUTCDate()).padStart(2, '0');
	return path.join(process.cwd(), 'data', `stats_${year}-${month}-${day}.json`);
}

// Stelle sicher, dass das Verzeichnis existiert
function ensureDataDir() {
	const dir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

// Lade alle Stats aus der Datei für das aktuelle UTC-Datum
function loadAllStats(): Record<string, any> {
	ensureDataDir();
	const statsFile = getStatsFilePath();
	if (fs.existsSync(statsFile)) {
		const data = fs.readFileSync(statsFile, 'utf-8');
		return JSON.parse(data);
	}
	return {};
}

// Speichere Stats in die Datei für das aktuelle UTC-Datum
function saveAllStats(stats: Record<string, any>) {
	ensureDataDir();
	const statsFile = getStatsFilePath();
	fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
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

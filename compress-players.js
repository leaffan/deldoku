// Script to compress all_players.json
import { readFileSync, writeFileSync, statSync } from 'fs';

// Load the original file
const players = JSON.parse(readFileSync('all_players_uncompressed.json', 'utf-8'));

// Compress the fields
const compressed = players.map((p) => ({
	i: p.id, // id → i
	n: p.name, // name → n
	t: p.nationality, // nationality → t (territory)
	f: p.first_season, // first_season → f
	l: p.last_season // last_season → l
}));

// Save the compressed version
writeFileSync('static/all_players.json', JSON.stringify(compressed));

console.log(`Original: ${players.length} players`);
console.log(`Compressed to ${statSync('static/all_players.json').size} bytes`);

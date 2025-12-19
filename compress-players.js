// Script zum Komprimieren der all_players.json
import { readFileSync, writeFileSync, statSync } from 'fs';

// Lade die Original-Datei
const players = JSON.parse(readFileSync('static/all_players.json', 'utf-8'));

// Komprimiere die Felder
const compressed = players.map(p => ({
  i: p.id,           // id → i
  n: p.name,         // name → n
  t: p.nationality,  // nationality → t (territory)
  f: p.first_season, // first_season → f
  l: p.last_season   // last_season → l
}));

// Speichere die komprimierte Version
writeFileSync('static/all_players.json', JSON.stringify(compressed));

console.log(`Original: ${players.length} Spieler`);
console.log(`Komprimiert auf ${statSync('static/all_players.json').size} bytes`);

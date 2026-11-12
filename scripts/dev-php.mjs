// Startet bzw. stoppt den PHP-Container für die lokale Entwicklung.
// Unter Windows läuft Docker in WSL, daher dort über `wsl` aufrufen.
import { spawnSync } from 'node:child_process';

const action = process.argv[2] === 'down' ? ['down'] : ['up', '-d'];
const [cmd, args] =
	process.platform === 'win32'
		? ['wsl', ['docker', 'compose', ...action]]
		: ['docker', ['compose', ...action]];

const result = spawnSync(cmd, args, { stdio: 'inherit' });
if (result.status !== 0) {
	console.error('\nPHP-Container konnte nicht gestartet/gestoppt werden. Läuft Docker (in WSL)?');
	process.exit(result.status ?? 1);
}

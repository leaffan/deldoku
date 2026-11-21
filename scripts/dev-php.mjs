// Starts or stops the PHP container for local development.
// On Windows, Docker runs in WSL, so call it via `wsl` there.
import { spawnSync } from 'node:child_process';

const action = process.argv[2] === 'down' ? ['down'] : ['up', '-d'];
const [cmd, args] =
	process.platform === 'win32'
		? ['wsl', ['docker', 'compose', ...action]]
		: ['docker', ['compose', ...action]];

const result = spawnSync(cmd, args, { stdio: 'inherit' });
if (result.status !== 0) {
	console.error('\nCould not start/stop the PHP container. Is Docker running (in WSL)?');
	process.exit(result.status ?? 1);
}

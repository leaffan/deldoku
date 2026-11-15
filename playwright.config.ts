import { defineConfig, devices } from '@playwright/test';
import { TODAY } from './tests/e2e/constants';

// E2E-Tests gegen den Produktions-Build und das echte stats.php (PHP 8.2 in Docker, siehe
// tests/e2e/serve.sh). Vorher `pnpm build` ausführen.
const PORT = 8091;

export default defineConfig({
	testDir: 'tests/e2e',
	// Alle Tests teilen sich einen Server und dessen data/-Verzeichnis, das jeder Test leert
	workers: 1,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${PORT}/deldoku/`,
		locale: 'de-DE',
		timezoneId: 'Europe/Berlin',
		trace: 'retain-on-failure'
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{
			name: 'mobile-360',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 360, height: 740 },
				isMobile: true,
				hasTouch: true
			},
			// Tastaturbedienung nur auf dem Desktop prüfen
			grepInvert: /@keyboard/
		}
	],
	webServer: {
		// Als Argumente, nicht als Umgebungsvariablen: Unter Windows startet `bash` die WSL-Bash, und
		// dort kommen Umgebungsvariablen nicht an
		command: `bash tests/e2e/serve.sh ${TODAY} ${PORT}`,
		url: `http://127.0.0.1:${PORT}/deldoku/`,
		// PHP protokolliert jeden Request; nur bei Bedarf anzeigen (E2E_SERVER_LOG=1)
		stderr: process.env.E2E_SERVER_LOG ? 'pipe' : 'ignore',
		reuseExistingServer: false,
		timeout: 60_000,
		// SIGTERM statt des standardmäßigen SIGKILL: docker run reicht es an den Container weiter
		gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 }
	}
});

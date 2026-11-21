import { defineConfig, devices } from '@playwright/test';
import { TODAY } from './tests/e2e/constants';

// E2E tests against the production build and the real stats.php (PHP 8.2 in Docker, see
// tests/e2e/serve.sh). Run `pnpm build` first.
const PORT = 8091;

export default defineConfig({
	testDir: 'tests/e2e',
	// All tests share one server and its data/ directory, which each test empties
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
			// Test keyboard operation on desktop only
			grepInvert: /@keyboard/
		}
	],
	webServer: {
		// As arguments, not environment variables: on Windows `bash` starts the WSL bash, and
		// environment variables do not reach it
		command: `bash tests/e2e/serve.sh ${TODAY} ${PORT}`,
		url: `http://127.0.0.1:${PORT}/deldoku/`,
		// PHP logs every request; show only when needed (E2E_SERVER_LOG=1)
		stderr: process.env.E2E_SERVER_LOG ? 'pipe' : 'ignore',
		reuseExistingServer: false,
		timeout: 60_000,
		// SIGTERM instead of the default SIGKILL: docker run forwards it to the container
		gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 }
	}
});

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import http from 'node:http';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// Leitet /deldoku[_tst]/api/* an den PHP-Container aus docker-compose.yml weiter.
// Muss vor SvelteKit laufen, sonst wird static/api/stats.php als Quelltext ausgeliefert.
function phpApiProxy(): Plugin {
	const handler: Connect.NextHandleFunction = (req, res, next) => {
		const match = req.url?.match(/^\/deldoku(?:_tst)?(\/api\/.*)$/);
		if (!match) return next();
		const proxyReq = http.request(
			{
				host: 'localhost',
				port: 8090,
				path: '/deldoku' + match[1],
				method: req.method,
				headers: req.headers
			},
			(proxyRes) => {
				res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
				proxyRes.pipe(res);
			}
		);
		proxyReq.on('error', () => {
			res.statusCode = 502;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ error: 'PHP dev container not reachable' }));
		});
		req.pipe(proxyReq);
	};
	return {
		name: 'php-api-proxy',
		enforce: 'pre',
		configureServer: (server) => {
			server.middlewares.use(handler);
		},
		configurePreviewServer: (server) => {
			server.middlewares.use(handler);
		}
	};
}

export default defineConfig({
	plugins: [
		phpApiProxy(),
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),

			adapter: adapter({
				pages: 'build',
				assets: 'build',
				precompress: false,
				strict: false
			}),

			paths: {
				base: process.env.VITE_BUILD_ENV === 'test' ? '/deldoku_tst' : '/deldoku'
			},
			// Der Deploy setzt den Commit, damit der Smoke-Test den ausgelieferten Build erkennt; sonst ein Zeitstempel
			version: { name: process.env.BUILD_SHA || undefined }
		})
	],
	// Version aus package.json für den Footer
	define: { __APP_VERSION__: JSON.stringify(version) },
	build: {
		// Flaggen einzeln ausliefern statt alle ~400 SVGs ins CSS einzubetten; sie werden nur bei Bedarf geladen
		assetsInlineLimit: (filePath) => (filePath.includes('/flag-icons/') ? false : undefined)
	},
	test: {
		// Unit-Tests liegen neben dem Code (z. B. src/lib/data.test.ts); fetch und window werden gemockt
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});

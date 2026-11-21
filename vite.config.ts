import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import http from 'node:http';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// Forwards /deldoku[_tst]/api/* to the PHP container from docker-compose.yml.
// Must run before SvelteKit, otherwise static/api/stats.php is served as source text.
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
			// The deploy sets the commit so the smoke test recognizes the deployed build; otherwise a timestamp
			version: { name: process.env.BUILD_SHA || undefined }
		})
	],
	// Version from package.json for the footer
	define: { __APP_VERSION__: JSON.stringify(version) },
	build: {
		// Serve flags as separate files instead of inlining all ~400 SVGs into the CSS; they load only when needed
		assetsInlineLimit: (filePath) => (filePath.includes('/flag-icons/') ? false : undefined)
	},
	test: {
		// Unit tests live next to the code (e.g. src/lib/data.test.ts); fetch and window are mocked
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Connect, type Plugin } from 'vite';
import http from 'node:http';

// Leitet /deldoku[_tst]/api/* an den PHP-Container aus docker-compose.yml weiter.
// Muss vor SvelteKit laufen, sonst wird static/api/stats.php als Quelltext ausgeliefert.
function phpApiProxy(): Plugin {
	const handler: Connect.NextHandleFunction = (req, res, next) => {
		const match = req.url?.match(/^\/deldoku(?:_tst)?(\/api\/.*)$/);
		if (!match) return next();
		const proxyReq = http.request(
			{ host: 'localhost', port: 8090, path: '/deldoku' + match[1], method: req.method, headers: req.headers },
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
	plugins: [phpApiProxy(), sveltekit()]
});

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
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
		version: {
			name: process.env.BUILD_SHA || undefined
		}
	}
};

export default config;

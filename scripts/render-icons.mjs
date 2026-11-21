// Renders the PNG app icons from static/favicon.svg (home screen, web app manifest).
// Run after changing the favicon: node scripts/render-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const svg = readFileSync(new URL('../static/favicon.svg', import.meta.url), 'utf-8');
const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };

const browser = await chromium.launch();
for (const [name, size] of Object.entries(sizes)) {
	const page = await browser.newPage({ viewport: { width: size, height: size } });
	// Square background behind the rounded icon: iOS and Android apply their own mask
	await page.setContent(
		`<body style="margin:0;background:#1e3a6e">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`
	);
	const out = fileURLToPath(new URL(`../static/${name}`, import.meta.url));
	await page.screenshot({ path: out });
	console.log(`Wrote ${out}`);
	await page.close();
}
await browser.close();

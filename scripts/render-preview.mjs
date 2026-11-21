// Renders the link preview image (Open Graph, 1200×630) from the logo.
// Run after changing the logo or the tagline: node scripts/render-preview.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const logo = readFileSync(new URL('../static/img/deldoku.png', import.meta.url)).toString('base64');
const out = new URL('../static/img/og-image.png', import.meta.url);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; }
  body {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px;
    background: radial-gradient(ellipse at center, #ffffff 0%, #eaf3fb 60%, #cfe2f3 100%);
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  }
  img { width: 960px; }
  p { margin: 0; font-size: 46px; font-weight: 700; color: #1e3a6e; letter-spacing: 0.5px; }
</style></head>
<body>
  <img src="data:image/png;base64,${logo}" alt="">
  <p>Das tägliche DEL-Quiz</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: out.pathname.replace(/^\/([A-Za-z]:)/, '$1') });
await browser.close();
console.log(`Wrote ${out.pathname}`);

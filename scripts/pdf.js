// Renders the built site to a PDF for distribution.
//
//   npm run build && npm run pdf
//
// Serves `build/` on a local port, opens it in Chromium with print styles
// and writes `an-introduction-to-rdf.pdf`. Set CHROMIUM_PATH to use a
// specific Chromium binary instead of Playwright's own.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = 'build';
const OUT = process.argv[2] ?? 'an-introduction-to-rdf.pdf';
// Letter, minus the 0.75in side margins set in app.css, in CSS pixels.
const CONTENT_WIDTH = 672;
const TYPES = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.png': 'image/png'
};

const server = createServer(async (req, res) => {
	const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
	const file = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
	try {
		const body = await readFile(file);
		res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
		res.end(body);
	} catch {
		res.writeHead(404).end();
	}
});
await new Promise((resolve) => server.listen(0, resolve));
const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
	// Lay the page out at the printed width so figures are drawn at their final size.
	const page = await browser.newPage({ viewport: { width: CONTENT_WIDTH, height: 900 } });
	await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
	await page.emulateMedia({ media: 'print' });
	await page.waitForTimeout(3000); // figures redraw and finish their transitions
	await page.pdf({
		path: OUT,
		preferCSSPageSize: true,
		printBackground: true,
		displayHeaderFooter: true,
		headerTemplate: '<span></span>',
		footerTemplate:
			'<div style="width:100%;font:8px sans-serif;color:#767676;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
	});
	console.log(`Wrote ${OUT}`);
} finally {
	await browser.close();
	server.close();
}

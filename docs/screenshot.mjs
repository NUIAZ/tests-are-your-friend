// docs/screenshot.mjs: captures docs/demo.png of the running page. Playwright is
// not a dependency of this repo; point PLAYWRIGHT_DIR at any project that has it.
//   PLAYWRIGHT_DIR=../some-project/node_modules/playwright BROWSER_CHANNEL=msedge node docs/screenshot.mjs
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const pw = process.env.PLAYWRIGHT_DIR
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_DIR, 'index.mjs')).href
  : 'playwright';
const { chromium } = await import(pw);

const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, server: { port: 5199 } });
await server.listen();
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 520, height: 640 }, colorScheme: 'light' });
await page.goto('http://localhost:5199/');
await page.fill('#subtotal', '10');
await page.fill('#taxRate', '0');
await page.fill('#tipPercent', '0');
await page.fill('#people', '3');
await page.waitForTimeout(200);
await page.locator('.card').screenshot({ path: resolve(root, 'docs', 'demo.png') });
console.log('check line:', await page.locator('.check').textContent());
await browser.close();
await server.close();

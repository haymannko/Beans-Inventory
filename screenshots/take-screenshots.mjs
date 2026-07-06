import puppeteer from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = join(import.meta.dirname);
const WIDTH = 1280;
const HEIGHT = 800;

const pages = [
  { url: 'http://localhost:5173/', name: 'dashboard' },
  { url: 'http://localhost:5173/arrivals', name: 'arrivals' },
  { url: 'http://localhost:5173/sales', name: 'voucher' },
];

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Login first
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.type('input[name="username"], input[type="text"]', 'admin');
  await page.type('input[name="password"], input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  for (const p of pages) {
    await page.goto(p.url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000)); // Wait for charts/data
    const path = join(SCREENSHOTS_DIR, `${p.name}.png`);
    await page.screenshot({ path, fullPage: false });
    console.log(`✅ ${p.name}.png (${WIDTH}x${HEIGHT})`);
  }

  await browser.close();
}

takeScreenshots().catch(e => { console.error(e); process.exit(1); });

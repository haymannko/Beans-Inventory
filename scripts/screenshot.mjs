import puppeteer from 'puppeteer';

const URL_BASE = 'https://beans-app-iota.vercel.app';
const WIDTH = 1280;
const HEIGHT = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  // --- Login as admin first ---
  console.log('Logging in...');
  await page.goto(URL_BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  const usernameInput = await page.$('input[type="text"], input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');
  if (usernameInput && passwordInput) {
    await usernameInput.click({ clickCount: 3 });
    await usernameInput.type('admin');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('admin123');
    const submitBtn = await page.$('button[type="submit"]') || await page.$('button');
    if (submitBtn) await submitBtn.click();
    else await page.keyboard.press('Enter');
    await sleep(4000);
  }

  // --- Screenshot 1: Login page (fresh, no auth) ---
  console.log('1) Capturing screenshots/login.png ...');
  const freshPage = await browser.newPage();
  await freshPage.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await freshPage.goto(URL_BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  await freshPage.screenshot({ path: 'screenshots/login.png', fullPage: false });
  await freshPage.close();
  console.log('   Saved screenshots/login.png');

  // --- Screenshot 2: Arrivals page ---
  console.log('2) Capturing arrivals.png ...');
  await page.goto(`${URL_BASE}/arrivals`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  await page.screenshot({ path: 'arrivals.png', fullPage: false });
  console.log('   Saved arrivals.png');

  // --- Screenshot 3: Voucher page ---
  console.log('3) Capturing Voucher.png ...');
  await page.goto(`${URL_BASE}/bouncher`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  await page.screenshot({ path: 'Voucher.png', fullPage: false });
  console.log('   Saved Voucher.png');

  await browser.close();
  console.log('Done! All 3 screenshots captured at 1280x800.');
})();

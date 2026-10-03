// So hình có/không gộp đồ tĩnh: chụp ?room=<id> và ?room=<id>&nomerge=1 cạnh nhau.
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(`${process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core'}/index.mjs`).href);
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = process.env.OUT ?? '/Users/a1234/Documents/smartoshi/.playwright-mcp';
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
for (const id of process.argv.slice(2)) {
  for (const nm of ['', '&nomerge=1']) {
    const url = id === 'hall' ? `/?saved=5&mute=1${nm}` : `/?room=${id}&mute=1&wake=1${nm}`;
    await page.goto(`http://localhost:5182${url}`);
    if (id === 'hall') { await page.waitForSelector('#start-btn.ready'); await page.click('#start-btn', { force: true }); }
    await page.waitForFunction(() => window.__game?.scene && !document.getElementById('fade').classList.contains('on'), null, { timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { for (const id of ['banner', 'panel', 'actions', 'family', 'hud']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } });
    await page.screenshot({ path: `${out}/princess-ab-${id}${nm ? '-orig' : '-merged'}.png` });
  }
}
await browser.close();

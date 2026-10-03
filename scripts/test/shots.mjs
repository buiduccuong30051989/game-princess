// Chụp màn soát giao diện ở 3 cỡ máy tính bảng (cảm ứng): phòng (từng bài), sảnh. Ảnh → OUT (mặc định .playwright-mcp).
//   node scripts/test/shots.mjs [room=rapunzel] [sizes=1024x768,1180x820,1366x1024]
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(`${process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core'}/index.mjs`).href);
const CHROME = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const OUT = process.env.OUT ?? '/Users/a1234/Documents/smartoshi/.playwright-mcp';
const [room = 'rapunzel', sizes = '1024x768,1180x820,1366x1024'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
for (const sz of sizes.split(',')) {
  const [W, H] = sz.split('x').map(Number);
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: false, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${process.env.PORT ?? 5182}/?room=${room}&reset=1`);
  await page.waitForFunction(() => window.__game?.scene?.challenge && !document.getElementById('fade').classList.contains('on'), null, { timeout: 90000 });
  await page.touchscreen.tap(W / 2, H / 3);
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => window.__game.scene.challenge.waiting, null, { timeout: 120000 });
    await page.waitForTimeout(2500);
    const kind = await page.evaluate(() => window.__game.scene.challenge.waiting);
    await page.screenshot({ path: `${OUT}/princess-${room}-${kind}-${W}x${H}.png` });
    const target = await page.evaluate(() => window.__game.scene.challenge.current);
    const box = await page.locator(`#options .opt[data-value="${target}"]`).boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => !window.__game.scene.challenge.waiting, null, { timeout: 30000 });
  }
  console.log(`${sz}: ok${errs.length ? ' — lỗi: ' + errs.slice(0, 5).join(' | ') : ''}`);
  await page.close();
}
await browser.close();

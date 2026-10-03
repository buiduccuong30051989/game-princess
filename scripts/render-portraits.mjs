// Vẽ chân dung Elsa + 11 công chúa cho khung phụ đề (src/talk.ts) → src/assets/portraits/<id>.png (nền trong suốt).
// Cần `pnpm dev` (cổng 5182) + playwright-core + chrome-headless-shell (biến PW, CHROME nếu khác máy Adam).
//   node scripts/render-portraits.mjs [id...]
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(pathToFileURL(`${process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core'}/index.mjs`).href);
const CHROME = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : ['elsa', 'rapunzel', 'ariel', 'belle', 'cinderella', 'jasmine', 'snowwhite', 'anna', 'aurora', 'mulan', 'merida', 'tiana'];
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 384, height: 384 } })).newPage();
for (const id of ids) {
  await page.goto(`http://localhost:${process.env.PORT ?? 5182}/portrait.html?id=${id}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const out = new URL(`../src/assets/portraits/${id}.png`, import.meta.url).pathname;
  await page.locator('canvas').screenshot({ path: out, omitBackground: true });
  execFileSync('sips', ['-Z', '192', out], { stdio: 'ignore' }); // khung phụ đề 76 px × DPR 2 → 192 px là đủ (macOS sips)
  console.log('✓', id);
}
await browser.close();

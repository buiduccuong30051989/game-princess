// Đo hiệu năng từng cảnh bằng renderer.info (tam giác + draw call của 1 khung hình, gồm cả lượt vẽ bóng).
// Cần `pnpm dev` (cổng 5182) + playwright-core + chrome-headless-shell (biến PW, CHROME nếu khác máy Adam).
//   node scripts/test/perf.mjs [cảnh...]     cảnh: hall0 hall11 <roomId> <roomId>:wake   (mặc định: tất cả)
import { pathToFileURL } from 'node:url';
const PW = process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core';
const CHROME = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = process.env.PORT ?? '5182';
const W = Number(process.env.W ?? 1180), H = Number(process.env.H ?? 820);
const { chromium } = await import(pathToFileURL(`${PW}/index.mjs`).href);
const ROOMS = ['rapunzel', 'ariel', 'belle', 'cinderella', 'jasmine', 'snowwhite', 'anna', 'aurora', 'mulan', 'merida', 'tiana'];
const all = ['hall0', 'hall11', ...ROOMS, ...ROOMS.map((r) => `${r}:wake`)];
const want = process.argv.slice(2).length ? process.argv.slice(2) : all;
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, deviceScaleFactor: 2 });
const rows = [];
for (const s of want) {
  const page = await ctx.newPage();
  const url = s.startsWith('hall') ? `/?saved=${s.slice(4)}&mute=1` : `/?room=${s.split(':')[0]}${s.endsWith(':wake') ? '&wake=1' : ''}&mute=1`;
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  if (s.startsWith('hall')) { await page.waitForSelector('#start-btn.ready', { timeout: 60000 }); await page.click('#start-btn', { force: true }); }
  await page.waitForFunction(() => window.__game?.scene && !document.getElementById('fade').classList.contains('on'), null, { timeout: 90000 });
  await page.waitForTimeout(3500);
  const samples = [];
  for (let i = 0; i < 8; i++) {
    samples.push(await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => { const inf = window.__game.renderer.info; r({ calls: inf.render.calls, tris: inf.render.triangles, geo: inf.memory.geometries, tex: inf.memory.textures, pr: window.__game.renderer.getPixelRatio() }); }))));
    await page.waitForTimeout(250);
  }
  const max = (k) => Math.max(...samples.map((x) => x[k]));
  rows.push({ scene: s, tris: max('tris'), calls: max('calls'), geo: max('geo'), tex: max('tex'), dpr: samples[0].pr });
  console.log(`${s.padEnd(18)} tris ${String(max('tris')).padStart(7)}  calls ${String(max('calls')).padStart(4)}  geo ${max('geo')}  tex ${max('tex')}  dpr ${samples[0].pr}`);
  await page.close();
}
await browser.close();
const bad = rows.filter((r) => r.tris > 300000 || r.calls > 150);
if (bad.length) { console.error(`✗ vượt ngân sách (≤300k tam giác, ≤150 draw call): ${bad.map((r) => r.scene).join(', ')}`); process.exit(1); }
console.log('✓ mọi cảnh trong ngân sách');

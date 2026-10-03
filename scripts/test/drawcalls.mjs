// Soát draw call còn lại của 1 cảnh: liệt kê vật vẽ được (mesh/sprite/points) theo nhóm, để biết gộp tiếp chỗ nào.
//   node scripts/test/drawcalls.mjs <roomId|hall> [saved=N]
import { pathToFileURL } from 'node:url';
const PW = process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core';
const CHROME = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const { chromium } = await import(pathToFileURL(`${PW}/index.mjs`).href);
const [id = 'hall', saved = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto(`http://localhost:${process.env.PORT ?? 5182}/${id === 'hall' ? `?saved=${saved}&mute=1` : `?room=${id}&mute=1`}`);
if (id === 'hall') { await page.waitForSelector('#start-btn.ready'); await page.click('#start-btn', { force: true }); }
await page.waitForFunction(() => window.__game?.scene && !document.getElementById('fade').classList.contains('on'), null, { timeout: 90000 });
await page.waitForTimeout(3000);
const out = await page.evaluate(() => {
  const sc = window.__game.scene;
  const rows = new Map();
  sc.scene.traverseVisible((o) => {
    if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
    if (o.material && !Array.isArray(o.material) && o.material.visible === false) return;
    // nhóm theo tổ tiên gần gốc nhất có tên / kiểu
    let p = o, path = [];
    while (p && p !== sc.scene) { path.unshift(p.name || p.type); p = p.parent; }
    const kind = o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'instanced' : o.isSprite ? 'sprite' : o.isPoints ? 'points' : o.name.startsWith('merged') ? 'merged' : 'mesh';
    const key = `${kind} ${path.slice(0, 3).join('/')}${o.castShadow ? ' [shadow]' : ''}`;
    rows.set(key, (rows.get(key) ?? 0) + 1);
  });
  return [...rows].sort((a, b) => b[1] - a[1]);
});
for (const [k, n] of out) console.log(String(n).padStart(4), k);
console.log(logs.filter((l) => l.includes('gộp')).join('\n'));
await browser.close();

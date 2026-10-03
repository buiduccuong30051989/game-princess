// Vì sao còn nhiều draw call: phân loại vật vẽ còn lại của 1 phòng (động / material riêng / texture riêng / sprite...).
import { pathToFileURL } from 'node:url';
const PW = process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core';
const CHROME = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const { chromium } = await import(pathToFileURL(`${PW}/index.mjs`).href);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
const logs = [];
page.on('console', (m) => logs.push(m.text()));
for (const id of process.argv.slice(2)) {
  await page.goto(`http://localhost:5182/?room=${id}&mute=1`);
  await page.waitForFunction(() => window.__game?.scene && !document.getElementById('fade').classList.contains('on'), null, { timeout: 90000 });
  await page.waitForTimeout(1000);
  const out = await page.evaluate(() => {
    const sc = window.__game.scene, mv = sc.__moving;
    const inMoving = (o) => { for (let p = o; p && p !== sc.root; p = p.parent) if (mv.has(p)) return p; return null; };
    const rows = {};
    sc.root.traverseVisible((o) => {
      if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine) || o.material?.visible === false) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const anc = inMoving(o);
      const kind = o.isSkinnedMesh ? 'skinned' : o.isInstancedMesh ? 'inst' : o.isSprite ? 'sprite' : o.isPoints ? 'points' : o.name.startsWith('merged') ? 'merged' : 'mesh';
      const why = anc === o ? 'self-moving' : anc ? `in-moving(${anc.name || anc.type})` : 'static';
      const k = `${kind} ${why} ${m.type}${m.map ? ' map' : ''}${m.transparent ? ' transp' : ''}`;
      rows[k] = (rows[k] ?? 0) + 1;
    });
    return Object.entries(rows).sort((a, b) => b[1] - a[1]);
  });
  console.log(`== ${id}`); for (const [k, n] of out) console.log(String(n).padStart(4), k);
}
console.log(logs.filter((l) => l.includes('gộp')).join('\n'));
await browser.close();

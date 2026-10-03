// Kiểm tra hồi quy "không bao giờ đơ": chơi như NGƯỜI THẬT — không chế độ tự động, CÓ tiếng, chạm màn hình cảm ứng (touch):
// chạm nút bắt đầu, chạm bệ ở Đại sảnh, trong phòng cố ý chọn SAI rồi chạm ĐÚNG ngay lúc Elsa đang đọc "chưa đúng" / đang
// đếm cùng (lỗi đơ của game 5), có lúc sai 2 lần để thấy gợi ý, có lúc chạm lung tung; xong phòng chạm "Về đại sảnh".
// Đứng yên 1 trạng thái > 25 s = ĐƠ → exit 1 + ảnh chụp.
//
// Cần `pnpm dev` (cổng 5182) + playwright-core + chrome-headless-shell (biến PW, CHROME nếu khác máy Adam).
//   node scripts/test/play-human.mjs [số phòng=4] [new|finale] [WxH=1180x820]
//     new    : chơi mới từ đầu (?reset=1), 3 phòng đầu xong có dạ hội mốc 3
//     finale : giả lập đã cứu 10 công chúa (?saved=10), chơi phòng cuối → đại dạ hội + Elsa thay váy
import { pathToFileURL } from 'node:url';
const PW = process.env.PW ?? '/private/tmp/pw/node_modules/playwright-core';
const CHROME = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const OUT = process.env.OUT ?? '/Users/a1234/Documents/smartoshi/.playwright-mcp';
const { chromium } = await import(pathToFileURL(`${PW}/index.mjs`).href);
const [roomsArg = '4', mode = 'new', size = '1180x820'] = process.argv.slice(2);
const ROOMS = Number(roomsArg);
const [W, H] = size.split('x').map(Number);
const PORT = process.env.PORT ?? '5182';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`, ...a);

const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (/watchdog/.test(m.text())) log('⚠', m.text()); });
const tap = (x, y) => page.touchscreen.tap(Math.round(x), Math.round(y));
const tapSel = async (sel) => { const b = await page.locator(sel).first().boundingBox().catch(() => null); if (b) await tap(b.x + b.width / 2, b.y + b.height / 2); return !!b; };

const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/${mode === 'finale' ? '?saved=10' : '?reset=1'}`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#start-btn.ready', { timeout: 60000 });
await sleep(500);
await tapSel('#start-btn');

let done = 0, lastKey = '', lastChange = Date.now(), ok = false, roomsStarted = 0;
const seen = new Set();
const balls = new Set();
let wrongPlan = null; // kế hoạch sai cho câu hiện tại
while (Date.now() - t0 < 900000) {
  const st = await page.evaluate(() => {
    const g = window.__game; const sc = g?.scene;
    const vis = (id) => { const e = document.getElementById(id); return !!e && !e.hidden; };
    if (!sc) return null;
    const sub = vis('subtitle') ? document.getElementById('subtitle').textContent : '';
    if (sc.kind === 'hall') return { kind: 'hall', busy: sc.testBusy, targets: sc.testTargets(), sub, fade: document.getElementById('fade').classList.contains('on'), saved: g.progress.saved.length, balls: [...g.progress.balls] };
    const c = sc.challenge;
    const opts = [...document.querySelectorAll('#options .opt')].map((b) => { const r = b.getBoundingClientRect(); return { v: b.dataset.value, x: r.x + r.width / 2, y: r.y + r.height / 2, gone: b.classList.contains('gone'), hint: b.classList.contains('hint') }; });
    return { kind: 'room', id: sc.def.id, waiting: c?.waiting ?? null, current: c?.current ?? null, problem: c?.problem ?? null, opts, actions: vis('actions'), again: vis('btn-again'), sub, counted: document.querySelectorAll('.mitem.counted').length, fade: document.getElementById('fade').classList.contains('on') };
  });
  if (!st) { await sleep(300); continue; }
  const key = JSON.stringify([st.kind, st.id, st.waiting, st.current, st.sub, st.actions, st.counted, st.busy, st.fade, st.opts?.map((o) => o.gone + '' + o.hint)]);
  if (key !== lastKey) { lastKey = key; lastChange = Date.now(); }
  if (Date.now() - lastChange > 25000) {
    const f = `${OUT}/princess-STUCK-${st.kind}-${st.id ?? ''}.png`;
    await page.screenshot({ path: f });
    console.error(`✗ ĐƠ > 25 s: ${key}\n  ảnh: ${f}`);
    break;
  }
  if (st.fade) { await sleep(300); continue; }

  if (st.kind === 'hall') {
    for (const b of st.balls) if (!balls.has(b)) { balls.add(b); log(`🎉 dạ hội mốc ${b} đã chạy`); }
    if (done >= ROOMS || (mode === 'finale' && done >= 1)) {
      // chờ dạ hội / chào đón xong rồi mới kết thúc
      if (!st.busy) { if (mode !== 'finale' || balls.has(11)) { ok = true; break; } }
      await sleep(800); continue;
    }
    if (st.busy) { await sleep(600); continue; }
    const open = st.targets.filter((t) => t.open && !t.saved);
    if (!open.length) { await sleep(500); continue; }
    // thỉnh thoảng chạm nhầm bệ khoá trước (Elsa nhắc), rồi chạm bệ mở
    const locked = st.targets.find((t) => !t.open);
    if (locked && Math.random() < 0.3) { log('chạm bệ khoá', locked.id); await tap(locked.x, locked.y); await sleep(1800); }
    const t = open[Math.floor(Math.random() * open.length)];
    log('🏰 chạm bệ', t.id);
    await tap(t.x, t.y);
    roomsStarted++;
    await sleep(2500);
    continue;
  }

  // ---- trong phòng
  if (st.actions) {
    done++;
    log(`✓ phòng ${st.id} xong (${done}/${ROOMS})`);
    await sleep(1200);
    await tapSel('#btn-hall');
    await sleep(2000);
    continue;
  }
  if (st.waiting && st.current) {
    const qid = `${st.id}|${st.waiting}|${st.current}|${JSON.stringify(st.problem)}`;
    const right = st.opts.find((o) => o.v === st.current && !o.gone);
    const wrongs = st.opts.filter((o) => o.v !== st.current && !o.gone);
    if (!seen.has(qid)) {
      seen.add(qid);
      // kế hoạch: 0 = đúng ngay, 1 = sai 1 lần rồi chạm đúng NGAY lúc đang đọc phản hồi, 2 = sai 2 lần (gợi ý) rồi đúng,
      // 3 (toán) = sai, chờ đếm cùng xong rồi đúng
      const r = Math.random();
      wrongPlan = { left: r < 0.15 ? 0 : r < 0.55 ? 1 : 2, rush: Math.random() < 0.6 };
      log(`❓ ${st.waiting}${st.problem ? ` ${st.problem.op} ${st.problem.a},${st.problem.b},${st.problem.c}` : ''} → đáp án ${st.current}, sai ${wrongPlan.left} lần${wrongPlan.rush ? ' (chạm đúng lúc đang đọc)' : ''}`);
      await sleep(1500 + Math.random() * 2500);
    }
    if (wrongPlan.left > 0 && wrongs.length) {
      wrongPlan.left--;
      const w = wrongs[0];
      await tap(w.x, w.y);
      // chạm thêm lung tung vào nút sai đang bận (không được làm kẹt)
      if (Math.random() < 0.5) { await sleep(120); await tap(w.x, w.y); }
      await sleep(wrongPlan.rush ? 350 + Math.random() * 500 : 6000);
      continue;
    }
    if (right) { await tap(right.x, right.y); await sleep(1500); }
    continue;
  }
  // đang đọc / làm phép / tỉnh dậy: thỉnh thoảng chạm vào cảnh (không được ảnh hưởng)
  if (Math.random() < 0.05) await tap(W * 0.5, H * 0.35);
  await sleep(400);
}
await page.screenshot({ path: `${OUT}/princess-human-end-${mode}-${W}x${H}.png` });
await browser.close();
const errs = errors.filter((e) => !/Multiple instances|favicon/.test(e));
if (errs.length) console.error('lỗi console:\n  ' + errs.slice(0, 10).join('\n  '));
if (!ok || errs.length) process.exit(1);
console.log(`✓ chơi ${done} phòng kiểu người thật tới hết, không đơ (${((Date.now() - t0) / 1000).toFixed(0)} s; dạ hội: ${[...balls].join(', ') || 'không'})`);

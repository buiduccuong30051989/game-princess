// PHÒNG MẪU: Tháp của Rapunzel. Tháp tròn tường đá kem, sàn gỗ, cửa sổ vòm lớn khoét thủng nhìn ra trời đêm
// đầy đèn lồng bay (càng tan băng càng nhiều đèn), tranh mặt trời, kệ có Pascal, chảo, hoa, nến, đèn lồng treo trần.
import * as THREE from 'three';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, brickTex, plankTex, skyDome, starField, floor, curvedWall, wallWithArch, archFrame, rug,
  shelf, books, painting, candle, flicker, paperLantern, fairyLights, flowerPot, glow, curtain, bob, shadows,
} from '../room/kit.ts';

const PAL = { primary: 0x9b5de5, secondary: 0xf15bb5, accent: 0xffc233, light: 0xfff1e6, dark: 0x3c1a5b };

/** Mặt trời Tangled: đĩa vàng + tia lượn sóng trên nền tím. */
function drawSun(g: CanvasRenderingContext2D, w: number, h: number, bg: string, sun: string): void {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.18;
  g.fillStyle = sun;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a - 0.12) * r * 1.1, cy + Math.sin(a - 0.12) * r * 1.1);
    g.quadraticCurveTo(cx + Math.cos(a + 0.18) * r * 1.8, cy + Math.sin(a + 0.18) * r * 1.8, cx + Math.cos(a) * r * (i % 2 ? 2.1 : 2.5), cy + Math.sin(a) * r * (i % 2 ? 2.1 : 2.5));
    g.quadraticCurveTo(cx + Math.cos(a - 0.05) * r * 1.6, cy + Math.sin(a - 0.05) * r * 1.6, cx + Math.cos(a + 0.12) * r * 1.1, cy + Math.sin(a + 0.12) * r * 1.1);
    g.fill();
  }
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2); g.fill();
}

/** Chảo rán (vũ khí huyền thoại của Rapunzel). */
function fryingPan(): THREE.Group {
  const g = new THREE.Group();
  const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.08, 32), mat(0x3b3b4f, { rough: 0.35 }));
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.01, 32), mat(0x5a5a74, { rough: 0.3 }));
  inner.position.y = 0.04;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.5, 12), mat(0x8a5a33, { rough: 0.6 }));
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.55;
  g.add(pan, inner, handle);
  shadows(g);
  return g;
}

/** Giá vẽ + tranh đang vẽ dở. */
function easel(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0xb07442, { rough: 0.7 });
  for (const [x, rz] of [[-0.3, 0.12], [0.3, -0.12]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.06), wood);
    leg.position.set(x, 0.85, 0);
    leg.rotation.z = rz;
    g.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06), wood);
  back.position.set(0, 0.8, -0.35);
  back.rotation.x = -0.25;
  g.add(back);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.12), wood);
  tray.position.set(0, 0.75, 0.06);
  g.add(tray);
  const art = painting(0.8, 0.95, (c, w, h) => {
    drawSun(c, w, h, '#7c4dcc', '#ffcf3d');
    c.fillStyle = '#ff7ac8';
    for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(20 + i * 36, h - 24 - (i % 2) * 10, 12, 0, Math.PI * 2); c.fill(); }
  }, 0xffffff, 0xd6a35c);
  art.position.set(0, 1.28, 0.08);
  art.rotation.x = -0.08;
  g.add(art);
  shadows(g);
  return g;
}

interface SkyLantern { obj: THREE.Object3D; speed: number; sway: number; seed: number; order: number }

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;
  const R = 6.8;          // bán kính tháp
  const H = 9;            // cao tường
  const gap = 0.36;       // nửa góc khoảng tường phẳng có cửa sổ phía sau

  // --- ngoài cửa sổ: trời đêm tím hồng + sao + đèn lồng bay
  const dome = skyDome(0x16185e, 0xc86fc0, 70);
  dome.position.set(0, -22, -10);
  root.add(dome);
  const stars = starField(500, 45, 0xfff6d6, 0.35);
  stars.position.set(0, 0, -8);
  root.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), glowMat(0xfff4c2));
  moon.position.set(3.2, 6.5, -30);
  root.add(moon);
  const moonGlow = glow(0xfff1b8, 7, 0.45);
  moonGlow.position.copy(moon.position);
  root.add(moonGlow);
  // mặt hồ xa phản chiếu (dải sáng)
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ color: 0x3b2a7a, fog: false }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, -2.5, -30);
  root.add(lake);

  const lanterns: SkyLantern[] = [];
  const lanternColors = [0xffa53d, 0xffb84d, 0xff9340, 0xffc75a];
  for (let i = 0; i < 46; i++) {
    const l = paperLantern(lanternColors[i % 4], 0.5 + Math.random() * 0.35);
    l.position.set((Math.random() - 0.5) * 34, -3 + Math.random() * 18, -12 - Math.random() * 22);
    root.add(l);
    lanterns.push({ obj: l, speed: 0.25 + Math.random() * 0.3, sway: 0.3 + Math.random() * 0.4, seed: Math.random() * 10, order: i / 46 });
  }
  ctx.state.lanterns = lanterns;

  // --- tường tháp: đá kem ấm, 2 cung hai bên + mảng phẳng phía sau có cửa sổ khoét
  const stone = texMat(brickTex(0xf3dcc2, 0xd6b894, [10, 5], 9), { rough: 0.9 });
  const sideArc = Math.PI * 0.66 - gap;
  for (const side of [-1, 1]) root.add(curvedWall(R, H, stone, sideArc, side * (gap + sideArc / 2)));
  const chord = 2 * R * Math.sin(gap);
  const backZ = -R * Math.cos(gap);
  const backWall = wallWithArch(chord + 0.05, H, 3.3, 3.3, 0.95, texMat(brickTex(0xf3dcc2, 0xd6b894, [2.4, 5], 9), { rough: 0.9 }), chord);
  backWall.position.set(0, 0, backZ);
  root.add(backWall);
  const frame = archFrame(3.3, 3.3, 0xc58a4b, 0.22, 0.3);
  frame.position.set(0, 0.95, backZ - 0.05);
  root.add(frame);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 0.55), mat(0xc58a4b, { rough: 0.6 }));
  sill.position.set(0, 0.9, backZ + 0.2);
  sill.castShadow = true; sill.receiveShadow = true;
  root.add(sill);
  // rèm tím hai bên cửa sổ
  for (const side of [-1, 1]) {
    const c = curtain(3.9, 0.9, PAL.primary, 0x7b3fc9);
    c.position.set(side * 2.25, 0.2, backZ + 0.35);
    root.add(c);
  }
  // nến trên bậu cửa
  const candles: THREE.Object3D[] = [];
  for (const x of [-1.45, -1.2, 1.25, 1.5]) {
    const c = candle(0.18 + Math.random() * 0.15, 0xfff1dc);
    c.position.set(x, 0.97, backZ + 0.25);
    root.add(c);
    candles.push(c);
  }
  // chân tường gỗ + gờ trên
  const skirting = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.35, 72, 1, true, Math.PI - Math.PI * 0.66, Math.PI * 1.32), new THREE.MeshStandardMaterial({ color: 0xa8683a, roughness: 0.7, side: THREE.BackSide }));
  skirting.position.y = 0.175;
  root.add(skirting);

  // --- sàn gỗ + thảm tròn tím viền vàng + hoạ tiết mặt trời trên thảm
  root.add(floor(30, 30, texMat(plankTex(0xd29a63, [6, 6]), { rough: 0.8 })));
  const carpet = rug(3.4, 2.4, 0x8e4fd6, 0xffc233);
  carpet.position.set(0, 0, 0.6);
  root.add(carpet);

  // --- trần: dầm gỗ toả tròn + đèn lồng treo
  const beamMat = mat(0x8a5530, { rough: 0.75 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, R), beamMat);
    beam.position.set(Math.sin(a) * R / 2, 5.6, -Math.cos(a) * R / 2);
    beam.rotation.y = -a;
    root.add(beam);
  }
  const hanging: THREE.Object3D[] = [];
  for (const [x, y, z, c] of [[-3.4, 3.05, -4.6, 0xff9a3c], [3.4, 3.1, -4.6, 0xffb347], [-5.3, 2.75, -2.9, 0xff7f50], [5.3, 2.8, -2.9, 0xffa53d]] as const) {
    const l = paperLantern(c, 0.55);
    l.position.set(x, y, z);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 5.6 - y, 4), mat(0x5b3a1e));
    cord.position.set(x, (5.6 + y) / 2, z);
    root.add(l, cord);
    hanging.push(l);
  }
  const lights = fairyLights(new THREE.Vector3(-5.8, 3.9, -2.6), new THREE.Vector3(-2.3, 4.2, -6.2), 0.55, 14, [0xfff1a8, 0xffc2e2, 0xffd9a0]);
  const lights2 = fairyLights(new THREE.Vector3(2.3, 4.2, -6.2), new THREE.Vector3(5.8, 3.9, -2.6), 0.55, 14, [0xfff1a8, 0xffc2e2, 0xffd9a0]);
  root.add(lights, lights2);

  // --- tường trái: tranh mặt trời lớn + chảo treo + chậu hoa
  const sunArt = painting(1.5, 1.5, (c, w, h) => drawSun(c, w, h, '#8e4fd6', '#ffcf3d'), 0xffffff, 0xe8b04a);
  sunArt.position.set(-5.35, 2.7, -3.9);
  sunArt.lookAt(0, 2.7, 0);
  root.add(sunArt);
  const art2 = painting(1.0, 1.3, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d1f6b'); gr.addColorStop(1, '#ff9ec4');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { c.fillStyle = '#ffb347'; const x = (i * 53) % w, y = 20 + (i * 71) % (h * 0.7); c.fillRect(x, y, 10, 14); }
    c.fillStyle = '#6a4c9c'; c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.3, h * 0.72); c.lineTo(w * 0.55, h); c.fill();
  }, 0xffffff, 0xe8b04a);
  art2.position.set(-6.25, 2.4, -1.4);
  art2.lookAt(0, 2.4, 0);
  root.add(art2);
  const pan = fryingPan();
  pan.position.set(-6.3, 1.6, 0.6);
  pan.lookAt(0, 1.6, 0.6);
  pan.rotateX(Math.PI / 2);
  pan.rotateY(Math.PI / 2 + 0.2);
  root.add(pan);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), mat(0x444455));
  hook.position.set(-6.35, 2.35, 0.65);
  root.add(hook);
  const pot1 = flowerPot(0xe07b39, [0xff5fb4, 0xffd166, 0xb28dff, 0xff8fab]);
  pot1.position.set(-4.4, 0, 1.6);
  pot1.scale.setScalar(1.4);
  root.add(pot1);

  // --- tường phải: kệ sách + Pascal + giá vẽ + chậu hoa
  const sh = shelf(1.9, 0xa8683a);
  sh.position.set(5.15, 2.1, -4.1);
  sh.lookAt(0, 2.1, 0);
  root.add(sh);
  const bk = books(9, [0xf15bb5, 0x9b5de5, 0x00bbf9, 0xffc233, 0x00c49a]);
  bk.position.set(5.15, 2.1, -4.1);
  bk.lookAt(0, 2.1, 0);
  bk.translateX(-0.35);
  root.add(bk);
  const sh2 = shelf(1.6, 0xa8683a);
  sh2.position.set(5.9, 1.2, -2.3);
  sh2.lookAt(0, 1.2, 0);
  root.add(sh2);
  try {
    const pascal = await ctx.model('pascal.glb', { height: 0.32 });
    pascal.position.set(5.75, 1.2, -2.2);
    pascal.lookAt(0, 1.2, 3);
    root.add(pascal);
    ctx.state.pascal = pascal;
  } catch (e) { console.warn('pascal', e); }
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), mat(0xbfe9ff, { rough: 0.1, opacity: 0.7 }));
  jar.position.set(5.95, 1.35, -2.75);
  root.add(jar);
  const ez = easel();
  ez.position.set(3.7, 0, 0.3);
  ez.rotation.y = -0.7;
  root.add(ez);
  const pot2 = flowerPot(0x8e4fd6, [0xffd166, 0xff5fb4, 0xffffff]);
  pot2.position.set(3.4, 0, 2.4);
  pot2.scale.setScalar(1.25);
  root.add(pot2);
  for (const [x, z, sc, pot, cols] of [[-3.0, -4.9, 1.1, 0xd9773a, [0xff5fb4, 0xffd166, 0xb28dff]], [3.0, -4.9, 1.1, 0x8e4fd6, [0xffffff, 0xff8fab, 0xffd166]]] as const) {
    const fp = flowerPot(pot, [...cols]);
    fp.position.set(x, 0, z);
    fp.scale.setScalar(sc);
    root.add(fp);
  }
  // đèn lồng giấy thật (model) trên bậu cửa sổ
  try {
    const pack = await ctx.model('lanterns.glb', { height: 0.55 });
    pack.position.set(0.95, 0.97, backZ + 0.2);
    root.add(pack);
  } catch { /* bỏ qua */ }

  // --- ánh sáng ấm: đèn lồng + nến (2 point light là đủ, giữ 60 fps)
  const warmL = new THREE.PointLight(0xffa04a, 6, 9, 1.6);
  warmL.position.set(-3.5, 3.6, -1.8);
  const warmR = new THREE.PointLight(0xffb45a, 6, 9, 1.6);
  warmR.position.set(3.5, 3.6, -1.8);
  root.add(warmL, warmR);
  const windowGlow = glow(0xffb870, 5.5, 0.35);
  windowGlow.position.set(0, 2.6, backZ + 0.1);
  root.add(windowGlow);

  ctx.state.candles = candles;
  ctx.state.hanging = hanging;
  ctx.state.windowGlow = windowGlow;
}

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time;
  const lanterns = ctx.state.lanterns as SkyLantern[] | undefined;
  if (lanterns) {
    // đóng băng: ít đèn, đi chậm; tan dần: đèn nhiều + sáng lên
    const shown = 0.25 + 0.75 * ctx.melt;
    for (const l of lanterns) {
      l.obj.visible = l.order < shown;
      l.obj.position.y += l.speed * dt * (0.4 + 0.6 * ctx.melt);
      l.obj.position.x += Math.sin(t * l.sway + l.seed) * dt * 0.15;
      if (l.obj.position.y > 16) { l.obj.position.y = -3; l.obj.position.x = (Math.random() - 0.5) * 34; }
    }
  }
  (ctx.state.candles as THREE.Object3D[] | undefined)?.forEach((c, i) => flicker(c, t, i * 1.7));
  (ctx.state.hanging as THREE.Object3D[] | undefined)?.forEach((h, i) => { h.rotation.y = Math.sin(t * 0.6 + i) * 0.25; bob(h, t, 0.04, 0.9, i); });
  const wg = ctx.state.windowGlow as THREE.Sprite | undefined;
  if (wg) wg.material.opacity = 0.25 + 0.2 * ctx.melt + Math.sin(t * 1.5) * 0.04;
  const pascal = ctx.state.pascal as THREE.Object3D | undefined;
  if (pascal) pascal.rotation.z = Math.sin(t * 2.2) * 0.05;
  // đom đóm vàng quanh phòng khi đã tỉnh
  if (ctx.awake && Math.random() < 0.25) {
    ctx.magic.twinkle(new THREE.Vector3((Math.random() - 0.5) * 9, 0.6 + Math.random() * 3.5, -2 + Math.random() * 3), Math.random() < 0.5 ? 0xffb000 : 0xff5fb4, 1, 0.3, 0.3);
  }
}

const room: RoomDef = {
  id: 'rapunzel',
  name: 'Tháp của Rapunzel',
  emoji: '🏮',
  princessModel: 'p_rapunzel.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'đèn', emoji: '🏮', name: 'cái đèn', fill: { index: 0, distractors: ['b', 'm'] } },
    { word: 'hoa', emoji: '🌸', name: 'bông hoa', fill: { index: 0, distractors: ['t', 'l'] } },
    { word: 'chảo', emoji: '🍳', name: 'cái chảo' },
    { word: 'sao', emoji: '⭐', name: 'ngôi sao', fill: { index: 0, distractors: ['c', 'b'] } },
    { word: 'nến', emoji: '🕯️', name: 'cây nến', fill: { index: 0, distractors: ['m', 'l'] } },
    { word: 'sách', emoji: '📖', name: 'quyển sách' },
    { word: 'trăng', emoji: '🌙', name: 'mặt trăng' },
  ],
  count: { emoji: '🏮', audio: 'rapunzel_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],
  magicColors: [0xf08c00, 0x8b3fd9],
  audio: { name: 'rapunzel_name', intro: 'rapunzel_intro', thanks: 'rapunzel_thanks' },
};

export default room;

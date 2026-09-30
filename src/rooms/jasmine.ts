// PHÒNG JASMINE: Ban công cung điện Agrabah về đêm. Sàn gạch sao ngọc lam–vàng, thảm tròn hoa văn, dãy vòm củ hành
// khoét thủng nhìn ra thành Agrabah (nhà mái vòm, tháp nhọn, cửa sổ sáng đèn), trăng tròn lớn, cồn cát xa.
// Thảm bay lượn sóng (băng tan → bay lên, tỉnh → bay vòng), đèn lồng Ma-rốc nhiều màu treo, hổ Rajah nằm trên nệm,
// khỉ Abu đội mũ đỏ ngồi trên lan can, vẹt Iago trên giá vàng, cây đèn thần nhả khói tím, mâm dưa + nho, cây cọ.
import * as THREE from 'three';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, mix, skyDome, starField, floor, wall, painting, curtain, glow, bob, shadows, flowerPot,
} from '../room/kit.ts';

const PAL = { primary: 0x14b8a6, secondary: 0xa855f7, accent: 0xf5b50b, light: 0xfff1dc, dark: 0x2a1b5e };
const GOLD = 0xffc233;
const TEAL = 0x14b8a6;
const BACK_Z = -3.9;        // mặt tường vòm + lan can
const LAMP_POS = new THREE.Vector3(3.95, 0.52, 0.2);   // đèn thần trên bàn thấp

// ---------------------------------------------------------------- texture
/** Gạch sàn Ma-rốc: nền kem, sao 8 cánh ngọc lam viền vàng, hình thoi tím nhỏ. */
function starTileTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#fff0d6'; g.fillRect(0, 0, w, h);
    const star8 = (cx: number, cy: number, r: number, fill: string, stroke: string) => {
      g.beginPath();
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? r * 0.72 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 6; g.strokeStyle = stroke; g.stroke();
    };
    const s = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      star8(i * s + s / 2, j * s + s / 2, s * 0.42, '#2cc9b7', '#e8b12e');
      star8(i * s + s / 2, j * s + s / 2, s * 0.18, '#ffd166', '#ffffff');
    }
    g.fillStyle = '#a855f7';
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
      g.beginPath(); g.moveTo(i * s, j * s - 22); g.lineTo(i * s + 22, j * s); g.lineTo(i * s, j * s + 22); g.lineTo(i * s - 22, j * s); g.fill();
    }
  }, repeat);
}

/** Tường vữa kem ấm, hoa văn sao nhỏ mờ. */
function plasterTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffe2bf'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 20; i++) { g.beginPath(); g.arc((i * 71) % w, (i * 113) % h, 18 + (i % 4) * 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(232,177,46,0.55)';
    for (const [x, y] of [[w / 4, h / 4], [w * 3 / 4, h * 3 / 4]]) {
      g.beginPath();
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? 7 : 14; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      g.fill();
    }
  }, repeat);
}

/** Dải gạch men chân tường: ô vuông ngọc lam + tím + vàng. */
function zelligeTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    const cols = ['#14b8a6', '#2cc9b7', '#7c3aed', '#ffd166', '#0e9f8f', '#a855f7'];
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = cols[(i * 3 + j * 5) % cols.length];
      g.fillRect(i * s, j * s, s, s);
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.moveTo(i * s + s / 2, j * s + 8); g.lineTo(i * s + s - 8, j * s + s / 2); g.lineTo(i * s + s / 2, j * s + s - 8); g.lineTo(i * s + 8, j * s + s / 2); g.fill();
      g.fillStyle = cols[(i * 5 + j * 3 + 2) % cols.length];
      g.beginPath(); g.arc(i * s + s / 2, j * s + s / 2, s * 0.18, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#fff6e0'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, repeat);
}

/** Thảm bay: nền tím đỏ, viền vàng hoa văn, huy chương ngọc lam giữa. */
function carpetTex(): THREE.CanvasTexture {
  return canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = '#b0206f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffc233'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#6d28d9'; g.fillRect(22, 22, w - 44, h - 44);
    g.fillStyle = '#ffc233';
    for (let y = 30; y < h - 30; y += 22) { g.beginPath(); g.arc(34, y, 5, 0, Math.PI * 2); g.arc(w - 34, y, 5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c0267a'; g.fillRect(48, 48, w - 96, h - 96);
    // huy chương giữa
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#ffc233';
    g.beginPath(); g.moveTo(cx, cy - 110); g.lineTo(cx + 62, cy); g.lineTo(cx, cy + 110); g.lineTo(cx - 62, cy); g.fill();
    g.fillStyle = '#14b8a6';
    g.beginPath(); g.moveTo(cx, cy - 86); g.lineTo(cx + 46, cy); g.lineTo(cx, cy + 86); g.lineTo(cx - 46, cy); g.fill();
    g.fillStyle = '#ffe9a8';
    g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffc233';
    for (const [x, y] of [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]]) { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); }
  });
}

/** Thảm tròn quanh bệ: mandala tím hồng + vàng + ngọc lam. */
function mandalaTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    const rings = ['#ffc233', '#7c3aed', '#ff4fa3', '#14b8a6', '#a855f7', '#ffd166', '#c0267a'];
    rings.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, c * (1 - i * 0.13), 0, Math.PI * 2); g.fill(); });
    for (let ring = 0; ring < 3; ring++) {
      const r = c * (0.8 - ring * 0.22), n = 16 - ring * 4;
      g.fillStyle = ring % 2 ? '#ffffff' : '#ffd166';
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        g.beginPath(); g.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r, 14 - ring * 2, 26 - ring * 4, a + Math.PI / 2, 0, Math.PI * 2); g.fill();
      }
    }
  });
}

/** Sọc hổ: nền cam, sọc tím sẫm lượn sóng chạy vòng quanh (theo chiều v). */
function tigerTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ff8c2a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3b2350';
    for (let k = 0; k < 9; k++) {
      const y0 = (k + 0.5) * h / 9;
      g.beginPath();
      g.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.05 + k) * 6 - 5);
      for (let x = w; x >= 0; x -= 16) g.lineTo(x, y0 + Math.sin(x * 0.05 + k) * 6 + 5 * (0.4 + (x % 64) / 64));
      g.fill();
    }
  });
}

/** Song gỗ mashrabiya phát sáng (ô cửa sổ bên): lưới sao vàng trên nền cam ấm. */
function latticeTex(): THREE.CanvasTexture {
  return canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffb347'); gr.addColorStop(1, '#ff6fa8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7a3a12'; g.lineWidth = 7;
    const s = 42;
    for (let x = -s; x < w + s; x += s) for (let y = -s; y < h + s; y += s) {
      g.beginPath(); g.arc(x, y, s * 0.5, 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = 'rgba(255,241,170,0.9)';
    for (let x = 0; x < w + s; x += s) for (let y = 0; y < h + s; y += s) { g.beginPath(); g.arc(x + s / 2, y + s / 2, 5, 0, Math.PI * 2); g.fill(); }
  });
}

/** Vỏ dưa hấu: sọc xanh đậm/nhạt. */
function melonTex(): THREE.CanvasTexture {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#5fcf5a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f8a3c';
    for (let k = 0; k < 10; k++) {
      const x0 = (k + 0.5) * w / 10;
      g.beginPath(); g.moveTo(x0, 0);
      for (let y = 0; y <= h; y += 8) g.lineTo(x0 + Math.sin(y * 0.15 + k) * 4 - 5, y);
      for (let y = h; y >= 0; y -= 8) g.lineTo(x0 + Math.sin(y * 0.15 + k) * 4 + 5, y);
      g.fill();
    }
  });
}

// ---------------------------------------------------------------- hình khối
/**
 * Vẽ 1 cung vòm củ hành (ogee) nối tiếp path hiện tại: từ chân vòm (x∓w/2, y0) đi lên chân cung `spring`,
 * vòng qua đỉnh nhọn `apex`, xuống chân bên kia. e = nới rộng (vẽ viền ngoài). ltr = đi từ trái sang phải.
 */
function ogeeTo(p: THREE.Path, x: number, y0: number, w: number, spring: number, apex: number, e: number, ltr: boolean): void {
  const r = w / 2 + e, top = apex + e * 1.4, rise = top - spring;
  const sgn = ltr ? -1 : 1;           // chân xuất phát: trái (-) hoặc phải (+)
  p.lineTo(x + sgn * r, spring);
  p.bezierCurveTo(x + sgn * (r + rise * 0.12), spring + rise * 0.45, x + sgn * r * 0.08, top - rise * 0.38, x, top);
  p.bezierCurveTo(x - sgn * r * 0.08, top - rise * 0.38, x - sgn * (r + rise * 0.12), spring + rise * 0.45, x - sgn * r, spring);
  p.lineTo(x - sgn * r, y0);
}

interface Arch { x: number; w: number; spring: number; apex: number }

/** Tường vòm: mảng phẳng rộng w cao h, các ô vòm củ hành khoét từ sàn lên (nhìn xuyên ra thành phố). */
function archWall(w: number, h: number, arches: Arch[], m: THREE.Material, uvScale = 2): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  for (const a of [...arches].sort((p, q) => p.x - q.x)) {
    shape.lineTo(a.x - a.w / 2, 0);
    ogeeTo(shape, a.x, 0, a.w, a.spring, a.apex, 0, true);
  }
  shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.lineTo(-w / 2, 0);
  const geo = new THREE.ShapeGeometry(shape, 24);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / uvScale; uv[i * 2 + 1] = pos.getY(i) / uvScale; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  return mesh;
}

/** Viền nổi hình chữ U ngược quanh 1 ô vòm củ hành (extrude). */
function ogeeFrame(a: Arch, t: number, color: number, depth = 0.18): THREE.Mesh {
  const sh = new THREE.Shape();
  sh.moveTo(a.x - a.w / 2 - t, 0);
  ogeeTo(sh, a.x, 0, a.w, a.spring, a.apex, t, true);
  sh.lineTo(a.x + a.w / 2, 0);
  ogeeTo(sh, a.x, 0, a.w, a.spring, a.apex, 0, false);
  sh.lineTo(a.x - a.w / 2 - t, 0);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, curveSegments: 20 }), mat(color, { rough: 0.4, emissive: 0x6a4500, ei: 0.2 }));
  m.castShadow = true;
  return m;
}

/** Profile vòm củ hành (LatheGeometry) bán kính r, cao h. */
function onionGeo(r: number, h: number, seg = 20): THREE.LatheGeometry {
  return new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(r * 0.92, 0), new THREE.Vector2(r * 1.06, h * 0.18), new THREE.Vector2(r * 1.0, h * 0.38),
    new THREE.Vector2(r * 0.72, h * 0.6), new THREE.Vector2(r * 0.32, h * 0.8), new THREE.Vector2(r * 0.1, h * 0.93), new THREE.Vector2(0.001, h),
  ], seg);
}

function instanced(geo: THREE.BufferGeometry, m: THREE.Material, mats: THREE.Matrix4[], colors?: number[], cast = false): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(geo, m, mats.length);
  mats.forEach((mm, i) => im.setMatrixAt(i, mm));
  if (colors) { const c = new THREE.Color(); colors.forEach((col, i) => im.setColorAt(i, c.setHex(col))); }
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = true;
  return im;
}
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

/** Thành Agrabah xa: nhà hộp nhiều màu (instanced), mái vòm, tháp nhọn, cung điện lớn vòm trắng, cửa sổ vàng. */
function agrabah(): { group: THREE.Group; windows: THREE.InstancedMesh } {
  const g = new THREE.Group();
  const Y0 = -2.5;   // nền thành phố (thấp hơn ban công; tầm nhìn qua lan can thấy từ y ≈ -0.5 trở lên)
  const houseCols = [0xf6c7a0, 0xffd9b8, 0xf2b8a2, 0xffe6c4, 0xeab4d6, 0xf7c9d9, 0xd9c2f0];
  const domeCols = [0x2cc9b7, GOLD, 0xa855f7, 0xff8fc8, 0x14b8a6];
  const houses: THREE.Matrix4[] = [], hc: number[] = [], domes: THREE.Matrix4[] = [], dc: number[] = [], wins: THREE.Matrix4[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let row = 0; row < 3; row++) {
    const z = -18 - row * 6;
    for (let i = 0; i < 12; i++) {
      const x = -22 + i * 4 + rnd() * 1.5 + row * 1.3;
      if (x > 2 && x < 10 && row === 0) continue;   // chừa chỗ cho cung điện lớn
      const w = 1.8 + rnd() * 1.8, d = 1.8 + rnd() * 1.2, hgt = 2.2 + rnd() * 3 + row * 0.8;
      const y0 = Y0;
      houses.push(M4(x, y0 + hgt / 2, z, w, hgt, d));
      hc.push(houseCols[(i + row * 3) % houseCols.length]);
      if (rnd() < 0.55) {
        const r = Math.min(w, d) * 0.42;
        domes.push(M4(x, y0 + hgt, z, r, r * 1.3, r));
        dc.push(domeCols[(i * 2 + row) % domeCols.length]);
      }
      const nw = 1 + Math.floor(rnd() * 3);
      const step = nw > 1 ? (w * 0.6) / (nw - 1) : 0, wx0 = nw > 1 ? x - w * 0.3 : x;
      for (let k = 0; k < nw; k++) wins.push(M4(wx0 + k * step, y0 + hgt * (0.55 + (k % 2) * 0.2), z + d / 2 + 0.02, 0.28, 0.42, 1));
    }
  }
  const houseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), houseMat, houses, hc));
  g.add(instanced(onionGeo(1, 1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), domes, dc));
  // cung điện lớn: trống tròn + vòm củ hành trắng ngà + chóp vàng + 2 tháp nhọn
  const palace = new THREE.Group();
  const palaceWins: THREE.Matrix4[] = [];
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false });
  const ivory = new THREE.MeshBasicMaterial({ color: 0xfff1dc, fog: false });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 5, 24), new THREE.MeshBasicMaterial({ color: 0xf6d9b8, fog: false }));
  drum.position.y = 2.5;
  const dome = new THREE.Mesh(onionGeo(3.0, 5.2, 28), ivory);
  dome.position.y = 5;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0x14b8a6, fog: false }));
  band.position.y = 4.9;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.2, 8), new THREE.MeshBasicMaterial({ color: GOLD, fog: false }));
  spire.position.y = 10.7;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: GOLD, fog: false }));
  ball.position.y = 10.2;
  palace.add(drum, dome, band, spire, ball);
  const base = new THREE.Mesh(new THREE.BoxGeometry(9, 3.5, 4), new THREE.MeshBasicMaterial({ color: 0xf2c9a8, fog: false }));
  base.position.set(0, 1.75, 1.5);
  palace.add(base);
  for (const s of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 8.5, 12), ivory);
    tower.position.set(s * 4.3, 4.25, 1.5);
    const cap = new THREE.Mesh(onionGeo(0.75, 1.5, 16), new THREE.MeshBasicMaterial({ color: 0x2cc9b7, fog: false }));
    cap.position.set(s * 4.3, 8.5, 1.5);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 6), new THREE.MeshBasicMaterial({ color: GOLD, fog: false }));
    tip.position.set(s * 4.3, 10.2, 1.5);
    palace.add(tower, cap, tip);
    for (let k = 0; k < 3; k++) palaceWins.push(M4(s * 4.3, 3 + k * 1.8, 2.02, 0.3, 0.55, 1));
  }
  for (let k = 0; k < 5; k++) palaceWins.push(M4(-3 + k * 1.5, 2.2, 3.52, 0.4, 0.7, 1));
  for (let k = 0; k < 6; k++) { const a = -0.9 + k * 0.36; palaceWins.push(new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * 2.72, 3.4, Math.cos(a) * 2.72), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(0.35, 0.8, 1))); }
  palace.add(instanced(new THREE.PlaneGeometry(1, 1), winMat, palaceWins));
  palace.scale.setScalar(0.85);
  palace.position.set(6, Y0, -24);
  g.add(palace);
  // 3 tháp nhọn lẻ trong thành
  for (const [x, z, hgt, col] of [[-8, -21, 7.5, 0xa855f7], [-15, -27, 7, 0x2cc9b7], [14, -20, 6.5, 0xff8fc8]] as const) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, hgt, 10), new THREE.MeshBasicMaterial({ color: 0xffe6c4, fog: false }));
    t.position.set(x, Y0 + hgt / 2, z);
    const cap = new THREE.Mesh(onionGeo(0.6, 1.2, 14), new THREE.MeshBasicMaterial({ color: col, fog: false }));
    cap.position.set(x, Y0 + hgt, z);
    g.add(t, cap);
  }
  const windows = instanced(new THREE.PlaneGeometry(1, 1), winMat, wins);
  g.add(windows);
  // cồn cát xa
  const dune = new THREE.MeshBasicMaterial({ color: 0xf0a97a, fog: false });
  for (const [x, sx] of [[-24, 22], [4, 26], [30, 20]] as const) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), dune);
    d.scale.set(sx, 5, 6);
    d.position.set(x, -3, -44);
    g.add(d);
  }
  return { group: g, windows };
}

/** Đèn thần (vàng): thân dẹt, vòi dài, quai, nắp có núm. Vòi hướng +x. Đáy y=0. */
function magicLamp(): THREE.Group {
  const g = new THREE.Group();
  const goldM = mat(0xffc233, { rough: 0.25, emissive: 0x7a4a00, ei: 0.35 });
  const body = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.1, 0.03), new THREE.Vector2(0.2, 0.08), new THREE.Vector2(0.21, 0.13),
    new THREE.Vector2(0.15, 0.18), new THREE.Vector2(0.08, 0.2), new THREE.Vector2(0.001, 0.2),
  ], 24), goldM);
  body.scale.z = 0.8;
  const spout = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.1, 0), new THREE.Vector3(0.27, 0.13, 0), new THREE.Vector3(0.38, 0.2, 0), new THREE.Vector3(0.44, 0.28, 0),
  ]), 12, 0.035, 8, false), goldM);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20, Math.PI * 1.3), goldM);
  handle.position.set(-0.22, 0.13, 0);
  handle.rotation.z = Math.PI * 0.35;
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
  lid.position.y = 0.19;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(0xa855f7, { rough: 0.2, emissive: 0x5b21b6, ei: 0.4 }));
  knob.position.y = 0.28;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 16), goldM);
  foot.position.y = 0.015;
  g.add(body, spout, handle, lid, knob, foot);
  shadows(g);
  return g;
}

/** Bàn thấp bát giác ngọc lam viền vàng. Mặt bàn ở y = h. */
function lowTable(r: number, h: number, top = TEAL): THREE.Group {
  const g = new THREE.Group();
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.55, h - 0.06, 8), mat(0x7c3aed, { rough: 0.5 }));
  leg.position.y = (h - 0.06) / 2;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 8), mat(top, { rough: 0.4 }));
  plate.position.y = h - 0.03;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, 0.025, 6, 8), mat(GOLD, { rough: 0.3 }));
  rim.rotation.x = Math.PI / 2;
  rim.rotation.z = Math.PI / 8;
  rim.position.y = h;
  g.add(leg, plate, rim);
  shadows(g);
  return g;
}

/** Nệm tròn phồng có viền vàng + 4 tua. Đáy y=0. */
function cushion(color: number, rx: number, ry: number, rz: number, m?: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), m ?? mat(color, { rough: 0.8 }));
  c.scale.set(rx, ry, rz);
  c.position.y = ry;
  const piping = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02 / Math.max(rx, rz), 6, 40), mat(GOLD, { rough: 0.4 }));
  piping.rotation.x = Math.PI / 2;
  piping.scale.set(rx * 0.99, rz * 0.99, 1);
  piping.position.y = ry;
  g.add(c, piping);
  shadows(g);
  return g;
}

/** Hổ Rajah nằm phục, đầu hướng +z. Dài ~1.4 m. userData: head, tail, body để hoạt cảnh. */
function tiger(stripe: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const orange = mat(0xff8c2a, { rough: 0.7 });
  const white = mat(0xfff4e6, { rough: 0.8 });
  const dark = mat(0x3b2350, { rough: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.75, 8, 16), stripe);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.3, 0);
  body.scale.set(1, 1, 0.85);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), white);
  belly.scale.set(0.9, 0.5, 1.6);
  belly.position.set(0, 0.12, 0.05);
  g.add(body, belly);
  // chân sau (đùi) + chân trước duỗi ra trước
  for (const s of [-1, 1]) {
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), stripe);
    haunch.scale.set(0.8, 0.9, 1.2);
    haunch.position.set(s * 0.2, 0.22, -0.4);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 6, 10), orange);
    leg.rotation.x = Math.PI / 2;
    leg.position.set(s * 0.16, 0.08, 0.62);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), white);
    paw.scale.set(1, 0.6, 1.25);
    paw.position.set(s * 0.16, 0.06, 0.88);
    g.add(haunch, leg, paw);
  }
  // đầu (group để quay)
  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.62);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), stripe);
  skull.scale.set(1.05, 0.95, 0.95);
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), white);
  cheek.scale.set(1.1, 0.6, 0.7);
  cheek.position.set(0, -0.09, 0.12);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), white);
  muzzle.scale.set(1.2, 0.8, 1);
  muzzle.position.set(0, -0.06, 0.2);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xff7aa8, { rough: 0.5 }));
  nose.scale.set(1.3, 0.8, 1);
  nose.position.set(0, -0.01, 0.29);
  head.add(skull, cheek, muzzle, nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), orange);
    ear.scale.set(1, 1, 0.45);
    ear.position.set(s * 0.16, 0.19, -0.02);
    const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), white);
    earIn.scale.set(1, 1, 0.3);
    earIn.position.set(s * 0.16, 0.18, 0.015);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), mat(0xc6f26b, { rough: 0.3 }));
    eye.position.set(s * 0.09, 0.05, 0.19);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), dark);
    pupil.scale.set(0.6, 1.2, 0.6);
    pupil.position.set(s * 0.093, 0.05, 0.225);
    head.add(ear, earIn, eye, pupil);
  }
  g.add(head);
  // đuôi (group quay quanh gốc)
  const tail = new THREE.Group();
  tail.position.set(0, 0.32, -0.62);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, -0.12, -0.25), new THREE.Vector3(0.35, -0.2, -0.35), new THREE.Vector3(0.55, -0.12, -0.25),
  ]), 16, 0.045, 8, false), stripe);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark);
  tip.position.set(0.55, -0.12, -0.25);
  tail.add(tailMesh, tip);
  g.add(tail);
  g.userData = { head, tail, body };
  shadows(g);
  return g;
}

/** Vẹt Iago đỏ: thân, đầu, mỏ vàng cam, cánh xanh, đuôi dài. Nhìn +z, đứng trên y=0. */
function parrot(): THREE.Group {
  const g = new THREE.Group();
  const red = mat(0xe63946, { rough: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), red);
  body.scale.set(0.9, 1.35, 0.9);
  body.position.y = 0.15;
  const head = new THREE.Group();
  head.position.set(0, 0.33, 0.02);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), red);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 10), mat(0xffb020, { rough: 0.4 }));
  beak.rotation.x = Math.PI / 2 + 0.6;
  beak.position.set(0, -0.02, 0.09);
  head.add(skull, beak);
  for (const s of [-1, 1]) {
    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(0xffffff, { rough: 0.3 }));
    eyeW.position.set(s * 0.045, 0.025, 0.06);
    const eyeB = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat(0x1b1b3a, { rough: 0.2 }));
    eyeB.position.set(s * 0.05, 0.025, 0.085);
    head.add(eyeW, eyeB);
  }
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.09, 0.22, -0.01);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0x2563eb, { rough: 0.6 }));
    w.scale.set(0.35, 1.25, 0.8);
    w.position.y = -0.08;
    const tipW = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), mat(0xffd166, { rough: 0.6 }));
    tipW.scale.set(0.35, 1.2, 0.8);
    tipW.position.y = -0.18;
    pivot.add(w, tipW);
    pivot.userData.side = s;
    g.add(pivot);
    wings.push(pivot);
  }
  for (const [col, x] of [[0x2563eb, -0.025], [0xffd166, 0.025]] as const) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 6), mat(col, { rough: 0.6 }));
    f.rotation.x = -2.6;
    f.position.set(x, 0.0, -0.1);
    g.add(f);
  }
  g.add(body, head);
  g.userData = { head, wings };
  shadows(g);
  return g;
}

/** Khỉ Abu ngồi, đội mũ đỏ có tua, áo gi-lê tím. Nhìn +z, ngồi trên y=0. */
function monkey(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xb5733d, { rough: 0.85 });
  const face = mat(0xf2c9a0, { rough: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), fur);
  body.scale.set(1, 1.2, 0.9);
  body.position.y = 0.14;
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 14, 1, true), mat(0x7c3aed, { rough: 0.7, side: THREE.DoubleSide }));
  vest.position.y = 0.18;
  const head = new THREE.Group();
  head.position.set(0, 0.36, 0.01);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), fur);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), face);
  mask.scale.set(1.1, 0.9, 0.6);
  mask.position.set(0, -0.015, 0.06);
  const fez = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.08, 14), mat(0xe63946, { rough: 0.6 }));
  fez.position.set(0.02, 0.1, 0);
  fez.rotation.z = -0.2;
  const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(GOLD, { rough: 0.4 }));
  tassel.position.set(0.07, 0.11, 0.02);
  head.add(skull, mask, fez, tassel);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), face);
    ear.scale.set(0.5, 1, 1);
    ear.position.set(s * 0.1, 0.01, 0);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), mat(0x1b1b3a, { rough: 0.2 }));
    eye.position.set(s * 0.03, 0.01, 0.11);
    head.add(ear, eye);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 4, 8), fur);
    arm.position.set(s * 0.13, 0.12, 0.05);
    arm.rotation.set(-0.5, 0, s * 0.3);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 4, 8), fur);
    leg.rotation.x = Math.PI / 2;
    leg.position.set(s * 0.07, 0.03, 0.1);
    g.add(arm, leg);
  }
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, -0.1), new THREE.Vector3(0.1, 0.0, -0.2), new THREE.Vector3(0.2, 0.12, -0.2), new THREE.Vector3(0.18, 0.24, -0.12), new THREE.Vector3(0.12, 0.22, -0.06),
  ]), 16, 0.018, 6, false), fur);
  g.add(body, vest, head, tail);
  g.userData = { head };
  shadows(g);
  return g;
}

/** Đèn lồng Ma-rốc: thân củ hành kính màu phát sáng, chóp + đế vàng, dây treo. Tâm thân ở gốc. */
function moroccanLantern(color: number, size: number, cordTo: number): THREE.Group {
  const g = new THREE.Group();
  const goldM = mat(GOLD, { rough: 0.3, emissive: 0x6a4500, ei: 0.3 });
  const glass = new THREE.Mesh(onionGeo(size * 0.5, size * 1.1, 12), glowMat(mix(color, 0xffffff, 0.15)));
  glass.position.y = -size * 0.5;
  const cage = new THREE.Mesh(onionGeo(size * 0.52, size * 1.12, 8), new THREE.MeshBasicMaterial({ color: mix(GOLD, 0x7a4a00, 0.3), wireframe: true, fog: false }));
  cage.position.y = -size * 0.5;
  const base = new THREE.Mesh(new THREE.ConeGeometry(size * 0.3, size * 0.3, 8), goldM);
  base.rotation.x = Math.PI;
  base.position.y = -size * 0.62;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(size * 0.12, size * 0.35, 8), goldM);
  cap.position.y = size * 0.72;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, cordTo, 4), mat(0x7a4a00));
  cord.position.y = size * 0.72 + cordTo / 2;
  const halo = glow(mix(color, 0xffffff, 0.3), size * 4.2, 0.5);
  g.add(glass, cage, base, cap, cord, halo);
  g.userData.halo = halo;
  return g;
}

/** Chậu gốm ngọc lam cao (trồng cọ). Đáy y=0. */
function urn(color = TEAL): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.22, 0), new THREE.Vector2(0.18, 0.08), new THREE.Vector2(0.36, 0.35), new THREE.Vector2(0.34, 0.6),
    new THREE.Vector2(0.24, 0.72), new THREE.Vector2(0.3, 0.78), new THREE.Vector2(0.28, 0.8),
  ], 22), mat(color, { rough: 0.35 }));
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 6, 28), mat(GOLD, { rough: 0.3 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.42;
  g.add(pot, band);
  shadows(g);
  return g;
}

interface Carpet { obj: THREE.Mesh; geo: THREE.PlaneGeometry; base: Float32Array; tassels: THREE.Object3D[]; corners: number[] }
interface Lantern { obj: THREE.Group; seed: number }

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;

  // --- trời đêm tím chàm → hồng cam chân trời, sao, trăng tròn lớn, thành Agrabah + cồn cát
  const dome = skyDome(0x1f1a7a, 0xff8f7a, 48);
  dome.position.set(0, -4, -10);
  root.add(dome);
  const stars = starField(520, 40, 0xfff6d6, 0.42);
  stars.position.set(0, -2, -6);
  root.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.0, 48), glowMat(0xfff4cf));
  moon.position.set(-5.6, 4.7, -32);
  root.add(moon);
  const moonGlow = glow(0xffe9b0, 12, 0.5);
  moonGlow.position.copy(moon.position);
  root.add(moonGlow);
  const city = agrabah();
  root.add(city.group);
  // sao băng (thanh sáng mảnh + quầng) – ambient cho bay qua trời
  const shoot = new THREE.Group();
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.06), new THREE.MeshBasicMaterial({ color: 0xfff6d6, transparent: true, opacity: 0.9, fog: false }));
  streak.position.x = -1.1;
  const head = glow(0xffffff, 0.8, 0.9);
  shoot.add(streak, head);
  shoot.visible = false;
  root.add(shoot);

  // --- sàn gạch sao + thảm tròn mandala quanh bệ
  root.add(floor(30, 30, texMat(starTileTex([8, 8]), { rough: 0.45 })));
  const mandala = new THREE.Mesh(new THREE.CircleGeometry(1, 64), texMat(mandalaTex(), { rough: 0.95 }));
  mandala.rotation.x = -Math.PI / 2;
  mandala.scale.set(2.5, 1.8, 1);
  mandala.position.set(0, 0.01, 0.4);
  mandala.receiveShadow = true;
  root.add(mandala);

  // --- tường vòm củ hành phía sau (khoét thủng tới sàn) + viền vàng
  const arches: Arch[] = [
    { x: 0, w: 6.4, spring: 2.55, apex: 3.9 },
    { x: -5.15, w: 1.9, spring: 2.2, apex: 3.2 },
    { x: 5.15, w: 1.9, spring: 2.2, apex: 3.2 },
  ];
  const plaster = texMat(plasterTex([1, 1]), { rough: 0.85 });
  const wallB = archWall(13.2, 9, arches, plaster, 2.2);
  wallB.position.set(0, 0, BACK_Z);
  root.add(wallB);
  for (const a of arches) {
    const fr = ogeeFrame(a, 0.17, GOLD, 0.2);
    fr.position.set(0, 0, BACK_Z - 0.05);
    root.add(fr);
    // chỉ ngọc lam thứ 2 bên trong viền vàng
    const fr2 = ogeeFrame({ ...a, w: a.w - 0.02 }, 0.07, TEAL, 0.26);
    fr2.position.set(0, 0, BACK_Z - 0.1);
    root.add(fr2);
  }
  // cột xoắn ở 2 trụ giữa + mũ cột
  for (const s of [-1, 1]) {
    const x = s * 3.62;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.4, 16), mat(0xfff1dc, { rough: 0.4 }));
    col.position.set(x, 1.2, BACK_Z + 0.25);
    const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => {
      const a = i * 0.55, y = 0.1 + i * 0.058;
      return new THREE.Vector3(x + Math.cos(a) * 0.17, y, BACK_Z + 0.25 + Math.sin(a) * 0.17);
    })), 120, 0.03, 5, false), mat(TEAL, { rough: 0.4 }));
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.22, 16), mat(GOLD, { rough: 0.3 }));
    capital.position.set(x, 2.5, BACK_Z + 0.25);
    const baseC = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.2, 16), mat(GOLD, { rough: 0.3 }));
    baseC.position.set(x, 0.1, BACK_Z + 0.25);
    shadows(col); shadows(spiral);
    root.add(col, spiral, capital, baseC);
    // rèm voan tím vắt ở mép vòm giữa
    const c = curtain(2.5, 0.5, 0xa855f7, 0x8b3fd9);
    c.position.set(s * 3.05, 0.05, BACK_Z + 0.35);
    root.add(c);
  }
  // dải gạch men chân tường vòm (ở các trụ)
  const zel = texMat(zelligeTex([2, 1]), { rough: 0.5 });
  for (const x of [-6.35, -3.62, 3.62, 6.35]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x) > 5 ? 0.5 : 0.62, 0.9, 0.06), zel);
    band.position.set(x, 0.45, BACK_Z + 0.04);
    root.add(band);
  }

  // --- lan can ban công: bệ + con tiện hình bình + tay vịn vàng (chạy suốt bề ngang)
  const railW = 12.7;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(railW, 0.18, 0.4), mat(0xffe6c4, { rough: 0.6 }));
  plinth.position.set(0, 0.09, BACK_Z - 0.2);
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(railW, 0.1, 0.34), mat(GOLD, { rough: 0.35, emissive: 0x6a4500, ei: 0.2 }));
  topRail.position.set(0, 0.98, BACK_Z - 0.2);
  shadows(plinth); shadows(topRail);
  root.add(plinth, topRail);
  const baluster = new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.05, 0.08), new THREE.Vector2(0.09, 0.3),
    new THREE.Vector2(0.05, 0.55), new THREE.Vector2(0.035, 0.66), new THREE.Vector2(0.07, 0.75), new THREE.Vector2(0.001, 0.75),
  ], 10);
  const bals: THREE.Matrix4[] = [], balC: number[] = [];
  for (let x = -railW / 2 + 0.25; x < railW / 2; x += 0.34) { bals.push(M4(x, 0.18, BACK_Z - 0.2)); balC.push(Math.round((x + 10) / 0.34) % 2 ? 0xfff1dc : 0x5fe0d0); }
  root.add(instanced(baluster, mat(0xffffff, { rough: 0.5 }), bals, balC, true));

  // --- tường 2 bên: vữa kem + chân tường gạch men + ô cửa mashrabiya phát sáng
  for (const s of [-1, 1]) {
    const sw = wall(12, 9, texMat(plasterTex([5, 4]), { rough: 0.85 }));
    sw.position.set(s * 6.45, 0, 2.1);
    sw.rotation.y = -s * Math.PI / 2;
    const dado = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 12), texMat(zelligeTex([12, 1]), { rough: 0.5 }));
    dado.position.set(s * 6.41, 0.5, 2.1);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 12), mat(GOLD, { rough: 0.35 }));
    trim.position.set(s * 6.39, 1.02, 2.1);
    root.add(sw, dado, trim);
    // ô cửa vòm: tấm lưới sáng + viền vàng (vẽ bằng shape vòm củ hành)
    const a: Arch = { x: 0, w: 1.3, spring: 1.5, apex: 2.3 };
    const panelShape = new THREE.Shape();
    panelShape.moveTo(-a.w / 2, 0);
    ogeeTo(panelShape, 0, 0, a.w, a.spring, a.apex, 0, true);
    panelShape.lineTo(-a.w / 2, 0);
    const pg = new THREE.ShapeGeometry(panelShape, 20);
    const pp = pg.getAttribute('position');
    const uv = new Float32Array(pp.count * 2);
    for (let i = 0; i < pp.count; i++) { uv[i * 2] = pp.getX(i) / a.w + 0.5; uv[i * 2 + 1] = pp.getY(i) / 2.4; }
    pg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const panel = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: latticeTex(), fog: false }));
    const niche = new THREE.Group();
    const fr = ogeeFrame(a, 0.12, GOLD, 0.12);
    fr.position.z = -0.04;
    const sill = new THREE.Mesh(new THREE.BoxGeometry(a.w + 0.4, 0.1, 0.25), mat(GOLD, { rough: 0.35 }));
    sill.position.set(0, -0.05, 0.08);
    niche.add(panel, fr, sill);
    niche.position.set(s * 6.38, 1.05, -1.6);
    niche.rotation.y = -s * Math.PI / 2;
    root.add(niche);
    const ng = glow(0xffb870, 2.6, 0.3);
    ng.position.set(s * 6.2, 2.1, -1.6);
    root.add(ng);
  }

  // --- tranh cung điện trên tường phải (tranh hoa văn hình đèn thần)
  const art = painting(1.2, 1.0, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b1f8a'); gr.addColorStop(1, '#ff8f7a');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff4cf'; c.beginPath(); c.arc(w * 0.78, h * 0.25, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6d28d9';
    c.fillRect(w * 0.1, h * 0.7, w * 0.8, h * 0.3);
    c.beginPath(); c.arc(w * 0.5, h * 0.7, w * 0.18, Math.PI, 0); c.fill();
    c.fillStyle = '#2cc9b7';
    c.beginPath(); c.arc(w * 0.22, h * 0.72, w * 0.08, Math.PI, 0); c.fill();
    c.beginPath(); c.arc(w * 0.78, h * 0.72, w * 0.08, Math.PI, 0); c.fill();
    // thảm bay nhỏ
    c.fillStyle = '#ff4fa3'; c.beginPath(); c.moveTo(w * 0.2, h * 0.42); c.quadraticCurveTo(w * 0.35, h * 0.36, w * 0.5, h * 0.42); c.lineTo(w * 0.48, h * 0.47); c.quadraticCurveTo(w * 0.34, h * 0.41, w * 0.22, h * 0.47); c.fill();
  }, 0xffffff, GOLD);
  art.position.set(6.38, 2.35, 1.2);
  art.rotation.y = -Math.PI / 2;
  root.add(art);
  const art2 = painting(0.9, 1.1, '🐘', 0xfff0d6, GOLD);
  art2.position.set(-6.38, 2.3, 1.3);
  art2.rotation.y = Math.PI / 2;
  root.add(art2);

  // --- cây cọ trong chậu 2 bên + cọ ngoài ban công (thò lá qua lan can)
  const palms: THREE.Object3D[] = [];
  for (const [x, z, y, h, potted] of [[-5.9, -3.25, 0, 2.9, true], [5.9, -3.25, 0, 2.9, true], [-6.5, -7.0, -1.6, 4.8, false], [6.8, -7.5, -1.6, 5.2, false]] as const) {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    if (potted) holder.add(urn(x < 0 ? 0x7c3aed : TEAL));
    try {
      const p = await ctx.model('rooms/jasmine/palm.glb', { height: h });
      const w = new THREE.Group();
      w.add(p);
      if (potted) w.position.y = 0.7;
      w.rotation.y = x * 0.7;
      holder.add(w);
      palms.push(w);
    } catch (e) { console.warn('palm', e); }
    root.add(holder);
  }

  // --- trái: hổ Rajah nằm trên nệm tím + nệm hoạ tiết hổ
  const stripeMat = texMat(tigerTex(), { rough: 0.7 });
  const bed = cushion(0x7c3aed, 0.95, 0.16, 0.8);
  bed.position.set(-4.55, 0, -2.2);
  root.add(bed);
  const rajah = tiger(stripeMat);
  rajah.position.set(-4.55, 0.26, -2.25);
  rajah.rotation.y = 0.55;
  root.add(rajah);
  const pillowT = cushion(0, 0.32, 0.12, 0.26, stripeMat);
  pillowT.position.set(-5.5, 0, -1.2);
  root.add(pillowT);
  const pillowP = cushion(0xff4fa3, 0.3, 0.13, 0.26);
  pillowP.position.set(-3.7, 0, -3.3);
  root.add(pillowP);

  // --- khỉ Abu ngồi trên lan can (giữa Elsa và công chúa)
  const abu = monkey();
  abu.position.set(-1.65, 1.03, BACK_Z - 0.2);
  abu.rotation.y = 0.25;
  abu.scale.setScalar(1.25);
  root.add(abu);

  // --- phải: vẹt Iago trên giá vàng + đống nệm + bàn thấp có đèn thần
  const perch = new THREE.Group();
  const pBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 16), mat(GOLD, { rough: 0.3 }));
  pBase.position.y = 0.03;
  const pPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.45, 8), mat(GOLD, { rough: 0.3 }));
  pPole.position.y = 0.75;
  const pBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8), mat(GOLD, { rough: 0.3 }));
  pBar.rotation.z = Math.PI / 2;
  pBar.position.y = 1.45;
  const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 16), mat(TEAL, { rough: 0.3 }));
  pRing.position.set(0.28, 1.36, 0);
  perch.add(pBase, pPole, pBar, pRing);
  shadows(perch);
  perch.position.set(5.2, 0, -2.2);
  perch.rotation.y = -0.4;
  root.add(perch);
  const iago = parrot();
  iago.position.set(5.2, 1.46, -2.2);
  iago.rotation.y = -0.5;
  iago.scale.setScalar(1.35);
  root.add(iago);
  for (const [x, z, col, sx] of [[4.8, -0.9, 0x14b8a6, 0.42], [5.5, -0.4, 0xa855f7, 0.36], [5.2, 0.3, 0xffc233, 0.34]] as const) {
    const c = cushion(col, sx, 0.15, sx * 0.85);
    c.position.set(x, 0, z);
    root.add(c);
  }
  const lampTable = lowTable(0.42, LAMP_POS.y, 0x14b8a6);
  lampTable.position.set(LAMP_POS.x, 0, LAMP_POS.z);
  root.add(lampTable);
  const lamp = magicLamp();
  lamp.scale.setScalar(1.35);
  lamp.position.copy(LAMP_POS);
  lamp.rotation.y = 0.4;
  root.add(lamp);
  const lampGlow = glow(0xffd76b, 1.1, 0.5);
  lampGlow.position.set(LAMP_POS.x, LAMP_POS.y + 0.2, LAMP_POS.z);
  root.add(lampGlow);

  // --- trái trước: bàn thấp mâm hoa quả (dưa hấu, nho, cam) cho bé nhận ra "dưa", "nho"
  const fruitTable = lowTable(0.48, 0.45, 0xa855f7);
  fruitTable.position.set(-4.2, 0, -0.35);
  root.add(fruitTable);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.04, 24), mat(GOLD, { rough: 0.3 }));
  tray.position.set(-4.2, 0.47, -0.35);
  root.add(tray);
  const melon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), texMat(melonTex(), { rough: 0.5 }));
  melon.scale.set(1.25, 0.95, 1);
  melon.position.set(-4.35, 0.62, -0.45);
  melon.castShadow = true;
  root.add(melon);
  const slice = new THREE.Group();
  const rind = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16, 1, false, 0, Math.PI), mat(0x2e9e48, { rough: 0.6 }));
  const flesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.062, 16, 1, false, 0, Math.PI), mat(0xff3b5c, { rough: 0.6 }));
  slice.add(rind, flesh);
  for (let k = 0; k < 5; k++) {
    const seedM = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), mat(0x3b2350));
    const a = 0.3 + k * 0.6;
    seedM.position.set(Math.sin(a) * 0.08, 0.032, Math.cos(a) * 0.08);
    slice.add(seedM);
  }
  slice.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI / 2);
  slice.position.set(-4.0, 0.62, -0.2);
  root.add(slice);
  const grapes: THREE.Matrix4[] = [];
  for (let k = 0; k < 16; k++) {
    const layer = Math.floor(k / 5), a = k * 2.3;
    const r = 0.07 * (1 - layer * 0.25);
    grapes.push(M4(-4.05 + Math.cos(a) * r, 0.52 + (3 - layer) * 0.045, -0.5 + Math.sin(a) * r));
  }
  root.add(instanced(new THREE.SphereGeometry(0.035, 10, 8), mat(0x8b3fd9, { rough: 0.35 }), grapes, undefined, true));
  const oranges: THREE.Matrix4[] = [M4(-4.45, 0.54, -0.18), M4(-4.3, 0.54, -0.1)];
  root.add(instanced(new THREE.SphereGeometry(0.06, 12, 8), mat(0xff8a1f, { rough: 0.5 }), oranges, undefined, true));

  // --- chậu hoa 2 bên chân lan can
  for (const [x, cols] of [[-2.7, [0xff4fa3, 0xffd166, 0xa855f7]], [2.7, [0xffffff, 0xff8fc8, 0x2cc9b7]], [-4.5, [0xffd166, 0xff4fa3]], [4.5, [0xa855f7, 0xffd166]]] as const) {
    const fp = flowerPot(Math.abs(x) > 3 ? 0x7c3aed : TEAL, [...cols]);
    fp.position.set(x, 0, BACK_Z + 0.4);
    fp.scale.setScalar(1.3);
    root.add(fp);
  }

  // --- đèn lồng Ma-rốc treo
  const lanterns: Lantern[] = [];
  const lcols = [0x2ee6d0, 0xff4fa3, 0xffc233, 0xb06bff, 0xff8a3d, 0x2ee6d0];
  const spots: [number, number, number, number][] = [[-2.5, 3.05, -3.2, 0.36], [2.5, 3.0, -3.2, 0.36], [0, 3.4, -3.5, 0.3], [-5.1, 2.75, -1.9, 0.4], [5.1, 2.8, -1.6, 0.4], [-3.9, 3.25, -0.6, 0.3]];
  spots.forEach(([x, y, z, sz], i) => {
    const l = moroccanLantern(lcols[i], sz, 6 - y);
    l.position.set(x, y, z);
    root.add(l);
    lanterns.push({ obj: l, seed: i * 1.3 });
  });

  // --- thảm bay: lưới có gợn sóng (cập nhật đỉnh trong ambient) + 4 tua vàng
  const cw = 1.3, cl = 1.9, segX = 12, segY = 18;
  const cgeo = new THREE.PlaneGeometry(cw, cl, segX, segY);
  const carpetMat = texMat(carpetTex(), { rough: 0.85, side: THREE.DoubleSide });
  const carpetMesh = new THREE.Mesh(cgeo, carpetMat);
  carpetMesh.castShadow = true;
  const tassels: THREE.Object3D[] = [];
  const corners = [0, segX, (segX + 1) * segY, (segX + 1) * (segY + 1) - 1];
  for (let k = 0; k < 4; k++) {
    const tsl = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), mat(GOLD, { rough: 0.35 }));
    carpetMesh.add(tsl);
    tassels.push(tsl);
  }
  root.add(carpetMesh);
  const carpet: Carpet = { obj: carpetMesh, geo: cgeo, base: Float32Array.from(cgeo.getAttribute('position').array as ArrayLike<number>), tassels, corners };
  const carpetGlow = glow(0xff7ad0, 2.2, 0.0);
  root.add(carpetGlow);

  // --- ánh sáng: vàng ấm ở đèn thần + tím hồng ở đèn lồng trái (2 point light)
  const lampLight = new THREE.PointLight(0xffc46b, 3, 6, 1.6);
  lampLight.position.set(LAMP_POS.x, LAMP_POS.y + 0.8, LAMP_POS.z);
  const lanternLight = new THREE.PointLight(0xff7ad0, 4, 8, 1.6);
  lanternLight.position.set(-3.3, 2.7, -2.2);
  root.add(lampLight, lanternLight);

  Object.assign(ctx.state, {
    carpet, carpetGlow, lanterns, rajah, iago, abu, lamp, lampGlow, lampLight, stars, shoot, windows: city.windows, palms,
    shootT: 3,
  });
}

const tmpV = new THREE.Vector3();
const tmpF = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const tN = new THREE.Vector3(), tR = new THREE.Vector3(), tU = new THREE.Vector3(), tM = new THREE.Matrix4(), tQ = new THREE.Quaternion();

/** Xoay thảm: trục dọc (y cục bộ) theo hướng bay f, mặt thảm (z cục bộ) ngửa lên + hơi quay về camera, nghiêng cánh bank. */
function orientCarpet(o: THREE.Object3D, f: THREE.Vector3, cam: THREE.Vector3, bank: number, dt: number): void {
  tU.copy(cam).sub(o.position).normalize().multiplyScalar(0.55).add(UP).normalize();
  tU.applyAxisAngle(f, bank);
  tR.crossVectors(f, tU).normalize();
  tN.crossVectors(tR, f).normalize();
  tM.makeBasis(tR, f, tN);
  tQ.setFromRotationMatrix(tM);
  o.quaternion.slerp(tQ, Math.min(1, dt * 3));
}
const FIREWORK = [0xe0338a, 0x0fa89a, 0xf08c00, 0x8b3fd9, 0x2f6bff];

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time;
  const s = ctx.state;
  const melt = ctx.melt;

  // thảm bay: đóng băng nằm sát sàn, gợn nhẹ; băng tan dần bay lên; tỉnh dậy bay vòng số 8 sau lưng công chúa
  const carpet = s.carpet as Carpet | undefined;
  if (carpet) {
    const pos = carpet.geo.getAttribute('position') as THREE.BufferAttribute;
    const amp = 0.025 + 0.06 * melt + (ctx.awake ? 0.03 : 0);
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = carpet.base[i * 3], y = carpet.base[i * 3 + 1];
      arr[i * 3 + 2] = Math.sin(y * 3.2 - t * 3.5) * amp + Math.sin(x * 4 + t * 2) * amp * 0.35;
    }
    pos.needsUpdate = true;
    carpet.geo.computeVertexNormals();
    carpet.corners.forEach((ci, k) => {
      const tsl = carpet.tassels[k];
      tsl.position.set(arr[ci * 3], arr[ci * 3 + 1] + (k < 2 ? 0.07 : -0.07), arr[ci * 3 + 2]);
      tsl.rotation.x = k < 2 ? 0 : Math.PI;
    });
    const o = carpet.obj;
    let bank = 0;
    if (ctx.awake) {
      // bay vòng số 8 sau lưng công chúa, hướng thảm = hướng bay
      s.flyT = ((s.flyT as number | undefined) ?? 0) + dt * 0.35;
      const a = s.flyT as number;
      // biên độ x ≤ 2.3, z ≥ -3.0: thảm không cắm vào rèm (x ±3.05) / cột (x ±3.62) sát tường vòm
      tmpV.set(Math.sin(a) * 2.3, 1.75 + Math.sin(a * 2) * 0.25, -2.45 + Math.sin(a * 2) * 0.5);
      tmpF.set(Math.cos(a) * 2.3, 0, Math.cos(a * 2) * 1.0).normalize();
      bank = -Math.sin(a) * 0.25;
    } else {
      // nằm chờ bên phải; băng tan dần thì bay lên, bồng bềnh
      tmpV.set(2.55, 0.35 + 1.1 * melt + Math.sin(t * 1.2) * (0.02 + 0.08 * melt), -2.6);
      tmpF.set(-0.55, 0, -1).normalize();
      bank = Math.sin(t * 0.7) * 0.06 * melt;
    }
    o.position.lerp(tmpV, Math.min(1, dt * 2));
    orientCarpet(o, tmpF, ctx.camera.position, bank, dt);
    const cg = s.carpetGlow as THREE.Sprite;
    cg.position.copy(o.position);
    cg.material.opacity = 0.12 * melt + (ctx.awake ? 0.15 : 0);
    if (Math.random() < 0.05 + 0.25 * melt) {
      ctx.magic.twinkle(tmpV.set(o.position.x + (Math.random() - 0.5) * 1.2, o.position.y - 0.1, o.position.z + (Math.random() - 0.5) * 0.8), Math.random() < 0.5 ? 0xf08c00 : 0xe0338a, 1, 0.25, 0.3);
    }
  }

  // đèn lồng đung đưa, sáng dần khi băng tan
  (s.lanterns as Lantern[] | undefined)?.forEach((l) => {
    l.obj.rotation.z = Math.sin(t * 0.8 + l.seed) * 0.06;
    l.obj.rotation.y = t * 0.2 + l.seed;
    (l.obj.userData.halo as THREE.Sprite).material.opacity = 0.3 + 0.3 * melt + Math.sin(t * 2.3 + l.seed) * 0.05;
  });

  // hổ Rajah: thở, vẫy đuôi, ngó quanh; tỉnh dậy ngẩng đầu nhìn công chúa
  const rajah = s.rajah as THREE.Group | undefined;
  if (rajah) {
    const u = rajah.userData as { head: THREE.Object3D; tail: THREE.Object3D; body: THREE.Object3D };
    const br = 1 + Math.sin(t * 1.8) * 0.03;
    u.body.scale.set(br, br, 0.85);
    u.tail.rotation.y = Math.sin(t * (1 + melt * 1.5)) * 0.45;
    u.tail.rotation.x = Math.sin(t * 0.7) * 0.15;
    u.head.rotation.y = ctx.awake ? 0.5 + Math.sin(t * 0.8) * 0.15 : Math.sin(t * 0.4) * 0.35 * (0.3 + melt);
    u.head.rotation.x = ctx.awake ? -0.15 : 0.1 - 0.15 * melt;
  }
  // vẹt Iago: nhún, nghiêng đầu; tỉnh dậy vỗ cánh
  const iago = s.iago as THREE.Group | undefined;
  if (iago) {
    const u = iago.userData as { head: THREE.Object3D; wings: THREE.Object3D[] };
    bob(iago, t, 0.015 + 0.02 * melt, 3);
    u.head.rotation.z = Math.sin(t * 1.7) * 0.3;
    u.head.rotation.y = Math.sin(t * 0.9) * 0.5;
    const flap = ctx.awake ? Math.max(0, Math.sin(t * 0.8)) * Math.sin(t * 22) * 0.8 : 0;
    u.wings.forEach((w) => { w.rotation.z = (w.userData.side as number) * (0.1 + Math.abs(flap)); });
  }
  // khỉ Abu: lắc lư, ngó quanh; tỉnh dậy nhảy tưng tưng
  const abu = s.abu as THREE.Group | undefined;
  if (abu) {
    const u = abu.userData as { head: THREE.Object3D };
    if (abu.userData.baseY === undefined) abu.userData.baseY = abu.position.y;
    abu.position.y = (abu.userData.baseY as number) + (ctx.awake ? Math.abs(Math.sin(t * 4)) * 0.12 : Math.abs(Math.sin(t * 1.5)) * 0.01);
    u.head.rotation.y = Math.sin(t * 0.9) * 0.6;
    u.head.rotation.z = Math.sin(t * 1.3) * 0.12;
    abu.rotation.z = Math.sin(t * 1.1) * 0.05;
  }

  // đèn thần: khói tím + ánh vàng; băng tan khói nhiều hơn; tỉnh dậy phép xanh của Thần Đèn xoáy lên
  const lamp = s.lamp as THREE.Object3D | undefined;
  if (lamp) {
    lamp.rotation.y = 0.4 + Math.sin(t * 0.5) * 0.1;
    const lg = s.lampGlow as THREE.Sprite;
    lg.material.opacity = 0.35 + 0.25 * melt + Math.sin(t * 3) * 0.05;
    (s.lampLight as THREE.PointLight).intensity = 2 + 2.5 * melt + Math.sin(t * 6) * 0.2;
    // miệng vòi (vòi hướng +x cục bộ, đã quay 0.4 rad)
    const sx = LAMP_POS.x + Math.cos(0.4) * 0.58, sz = LAMP_POS.z - Math.sin(0.4) * 0.58, sy = LAMP_POS.y + 0.4;
    if (Math.random() < 0.12 + 0.3 * melt) {
      ctx.magic.emit({ x: sx, y: sy, z: sz, color: Math.random() < 0.6 ? 0x8b3fd9 : 0xe0338a, vy: 0.5 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.25, vz: (Math.random() - 0.5) * 0.25, max: 1.6, size: 0.3 + Math.random() * 0.25, drag: 0.98 });
    }
    if (ctx.awake && Math.random() < 0.2) {
      const a = t * 4, r = 0.25 + (t % 2) * 0.2;
      ctx.magic.emit({ x: sx + Math.cos(a) * r, y: sy + (t % 2) * 0.8, z: sz + Math.sin(a) * r, color: 0x2f6bff, vy: 0.8, max: 1.2, size: 0.35, drag: 0.97 });
    }
  }

  // sao nhấp nháy, cửa sổ thành phố sáng dần
  const stars = s.stars as THREE.Points | undefined;
  if (stars) (stars.material as THREE.PointsMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 1.9);
  const win = s.windows as THREE.InstancedMesh | undefined;
  if (win) (win.material as THREE.MeshBasicMaterial).color.setHex(melt > 0.5 || ctx.awake ? 0xffe08a : 0xf0c870);

  // sao băng thỉnh thoảng bay ngang trời
  const shoot = s.shoot as THREE.Group | undefined;
  if (shoot) {
    s.shootT = (s.shootT as number) - dt;
    if ((s.shootT as number) <= 0 && !shoot.visible) {
      shoot.visible = true;
      shoot.position.set(-14 + Math.random() * 10, 9 + Math.random() * 3, -26);
      shoot.rotation.z = -0.35;
      shoot.userData.life = 0;
    }
    if (shoot.visible) {
      shoot.userData.life = (shoot.userData.life as number) + dt;
      shoot.position.x += dt * 16;
      shoot.position.y -= dt * 5.5;
      if ((shoot.userData.life as number) > 1.3) { shoot.visible = false; s.shootT = 4 + Math.random() * 5 - 2.5 * melt; }
    }
  }

  // tỉnh dậy: pháo hoa trên thành Agrabah
  if (ctx.awake && Math.random() < dt * 0.9) {
    tmpV.set((Math.random() - 0.5) * 16, 4.5 + Math.random() * 3, -14 - Math.random() * 4);
    ctx.magic.burst(tmpV, 40, FIREWORK[Math.floor(Math.random() * FIREWORK.length)], 3.2, 0.9, 1.8, -1.2, 0.2);
  }
  // hạt vàng lấp lánh khắp ban công, nhiều dần khi băng tan
  if (Math.random() < 0.05 + 0.28 * melt) {
    tmpV.set((Math.random() - 0.5) * 11, 0.5 + Math.random() * 3.2, -3.4 + Math.random() * 4);
    ctx.magic.twinkle(tmpV, Math.random() < 0.5 ? 0xf08c00 : (Math.random() < 0.5 ? 0x0fa89a : 0xe0338a), 1, 0.3, 0.3);
  }
}

const room: RoomDef = {
  id: 'jasmine',
  name: 'Ban công của Jasmine',
  emoji: '🪔',
  princessModel: 'p_jasmine.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'đèn', emoji: '🪔', name: 'cái đèn', fill: { index: 0, distractors: ['b', 'm'] } },
    { word: 'hổ', emoji: '🐯', name: 'con hổ', fill: { index: 0, distractors: ['b', 't'] } },
    { word: 'khỉ', emoji: '🐒', name: 'con khỉ' },
    { word: 'vẹt', emoji: '🦜', name: 'con vẹt', fill: { index: 0, distractors: ['m', 'l'] } },
    { word: 'dưa', emoji: '🍉', name: 'quả dưa', ask: 'Quả nào là quả dưa?', fill: { index: 0, distractors: ['b', 'l'] } },
    { word: 'nho', emoji: '🍇', name: 'chùm nho', ask: 'Chùm nào là chùm nho?' },
    { word: 'voi', emoji: '🐘', name: 'con voi', fill: { index: 0, distractors: ['t', 'm'] } },
  ],
  count: { emoji: '🪔', audio: 'jasmine_count', range: [3, 7] },
  challenges: ['fill', 'spell', 'count'],
  magicColors: [0x0fa89a, 0xa21caf],
  audio: { name: 'jasmine_name', intro: 'jasmine_intro', thanks: 'jasmine_thanks' },
};

export default room;

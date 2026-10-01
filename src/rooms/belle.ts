// PHÒNG BELLE: Thư viện phép thuật. Phòng bát giác giấy dán tường kem–vàng, cửa sổ vòm lớn sau công chúa nhìn ra
// vườn hồng + lâu đài lúc hoàng hôn, 4 tủ sách cao chật sách màu (1 InstancedMesh), thang trượt, đèn chùm nến,
// hoa hồng phép trong chuông kính (bên phải), bục đọc có sách lật trang (bên trái), bàn trà có ấm + tách biết nhìn,
// chân nến, ghế bành đỏ, quả địa cầu, gương thần, tranh ngựa Philippe. Sách bay vỗ bìa, cánh hoa rơi.
// Băng càng tan: đèn chùm thắp thêm nến, nhiều sách bay + cánh hoa hơn, hoa hồng sáng rực; tỉnh rồi thì tách nhảy tưng tưng.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, wallpaperTex, tileTex, skyDome, floor, wall, wallWithArch, archFrame, curtain,
  candle, flicker, glow, shadows,
} from '../room/kit.ts';

const PAL = { primary: 0xf4b400, secondary: 0xd62839, accent: 0xffe29a, light: 0xfff3dc, dark: 0x7a1f35 };

const WOOD = 0xd98a3f;      // gỗ mật ong (tủ sách, bàn)
const WOOD_D = 0xb8672a;    // gỗ đậm hơn (chân, gờ)
const GOLD = 0xffc233;
const VELVET = 0xd62839;    // nhung đỏ hoa hồng
const CASE_BACK = 0x2f5fb3; // lòng tủ xanh Belle cho sách nổi màu
const BOOK_COLS = [0xd62839, 0x3f8efc, 0x2fbf71, 0xf4b400, 0x9b5de5, 0xff7a3d, 0x00a6a6, 0xff5fa2, 0x1d5fd6, 0xffd23f];

// ---------------------------------------------------------------- tiện ích
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
/** Ma trận đặt khối: vị trí, góc xoay (rad), tỉ lệ. */
function M(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.Matrix4 {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

/** Gộp nhiều khối nhỏ (mỗi khối 1 màu) thành 1 mesh màu đỉnh → ít draw call. */
class Batch {
  private parts: THREE.BufferGeometry[] = [];
  add(geo: THREE.BufferGeometry, color: number, m: THREE.Matrix4): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(m);
    const n = g.getAttribute('position').count;
    const c = new THREE.Color(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
  }
  mesh(rough = 0.7, emissive = 0x000000): THREE.Mesh {
    const geo = mergeGeometries(this.parts) ?? new THREE.BufferGeometry();
    for (const p of this.parts) p.dispose();
    this.parts = [];
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, emissive, emissiveIntensity: 0.25 }));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

// ---------------------------------------------------------------- texture canvas
/** Gáy sách: nền trắng (nhân màu instance) + 2 vạch nhũ + nhãn sáng. */
function spineTex(): THREE.CanvasTexture {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff2a8';
    g.fillRect(0, h * 0.12, w, h * 0.06); g.fillRect(0, h * 0.82, w, h * 0.06);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(w * 0.2, h * 0.38, w * 0.6, h * 0.2);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(w * 0.2, h * 0.38, w * 0.6, 3);
  });
}

/** Thảm oval đỏ viền vàng, giữa có bông hồng vàng + dây lá. */
function rugTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const ell = (r: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2); g.fill(); };
    ell(w * 0.5, '#ffc233'); ell(w * 0.46, '#c81e3a'); ell(w * 0.42, '#ffd966'); ell(w * 0.4, '#d62839');
    // vòng lá
    g.fillStyle = '#ffcf4d';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.save(); g.translate(cx + Math.cos(a) * w * 0.33, cy + Math.sin(a) * w * 0.33); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    // bông hồng vàng giữa
    for (let k = 0; k < 3; k++) {
      g.fillStyle = ['#ffcf4d', '#ffe08a', '#ffb81c'][k];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + k * 0.5, rr = 56 - k * 16;
        g.beginPath(); g.ellipse(cx + Math.cos(a) * rr * 0.5, cy + Math.sin(a) * rr * 0.5, rr * 0.55, rr * 0.4, a, 0, Math.PI * 2); g.fill();
      }
    }
  });
}

/** Quả địa cầu: biển xanh + lục địa xanh lá. */
function globeTex(): THREE.CanvasTexture {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#3f8efc'; g.fillRect(0, 0, w, h);
    const r = rng(9);
    g.fillStyle = '#5fd35f';
    for (let i = 0; i < 9; i++) {
      const x = r() * w, y = h * 0.2 + r() * h * 0.6;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * 60, y + (r() - 0.5) * 40, 20 + r() * 26, 14 + r() * 18, r() * 3, 0, Math.PI * 2); g.fill(); }
    }
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2;
    for (let y = 1; y < 6; y++) { g.beginPath(); g.moveTo(0, (y / 6) * h); g.lineTo(w, (y / 6) * h); g.stroke(); }
  });
}

/** Tranh ngựa Philippe trên đồi cỏ (emoji ngựa + trời xanh + hoa). */
function drawHorse(g: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#8fd0ff'); sky.addColorStop(1, '#e8f7ff');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6fd36f'; g.beginPath(); g.ellipse(w * 0.5, h * 1.02, w * 0.8, h * 0.38, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffe066'; g.beginPath(); g.arc(w * 0.82, h * 0.18, w * 0.08, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) { g.fillStyle = ['#ff5f7e', '#ffd23f', '#ffffff'][i % 3]; g.beginPath(); g.arc(20 + i * (w - 40) / 11, h * 0.86 + (i % 2) * 10, 6, 0, Math.PI * 2); g.fill(); }
  g.font = `${Math.round(w * 0.5)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('🐎', w * 0.5, h * 0.55);
}

// ---------------------------------------------------------------- khối trang trí
interface BookSlot { m: THREE.Matrix4; c: number }

/**
 * Tủ sách cao đứng sát tường (gốc ở chân tủ giữa mặt sau, mặt tủ hướng +z). Khung vào batch `wood`,
 * từng quyển sách vào danh sách `books` (sau này dồn thành 1 InstancedMesh).
 */
function bookcase(wood: Batch, books: BookSlot[], W: THREE.Matrix4, w: number, h: number, r: () => number): void {
  const d = 0.42;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (color: number, local: THREE.Matrix4) => wood.add(box, color, W.clone().multiply(local));
  add(WOOD, M(-w / 2, h / 2, d / 2, 0, 0, 0, 0.1, h, d));
  add(WOOD, M(w / 2, h / 2, d / 2, 0, 0, 0, 0.1, h, d));
  add(CASE_BACK, M(0, h / 2, 0.02, 0, 0, 0, w, h, 0.04));
  add(WOOD, M(0, h + 0.09, d / 2 + 0.02, 0, 0, 0, w + 0.24, 0.18, d + 0.1));
  add(GOLD, M(0, h + 0.02, d + 0.075, 0, 0, 0, w + 0.18, 0.05, 0.02));
  add(WOOD_D, M(0, 0.09, d / 2 + 0.02, 0, 0, 0, w + 0.14, 0.18, d + 0.06));
  // cột trang trí 2 bên có đầu vàng
  for (const s of [-1, 1]) add(GOLD, M(s * w / 2, h - 0.05, d + 0.02, 0, 0, 0, 0.13, 0.1, 0.06));
  for (let y = 0.18; y < h - 0.35; y += 0.55) {
    add(WOOD, M(0, y, d / 2, 0, 0, 0, w, 0.05, d));
    add(GOLD, M(0, y, d + 0.005, 0, 0, 0, w, 0.04, 0.012));
    let x = -w / 2 + 0.07;
    while (x < w / 2 - 0.12) {
      if (r() < 0.05) { x += 0.14; continue; }                       // chỗ trống
      const bw = 0.06 + r() * 0.05, bh = 0.3 + r() * 0.15;
      const lean = r() < 0.05 && x < w / 2 - 0.3 ? -0.22 : 0;
      books.push({ m: W.clone().multiply(M(x + bw / 2 + (lean ? 0.05 : 0), y + 0.025 + bh / 2 - (lean ? 0.01 : 0), d * 0.55, 0, 0, lean, bw, bh, 0.28)), c: BOOK_COLS[Math.floor(r() * BOOK_COLS.length)] });
      x += bw + 0.005 + (lean ? 0.08 : 0);
    }
  }
}

/** Hoa hồng phép trong chuông kính trên bàn tròn. userData: bloom, glow, petals (2 cánh rơi trong chuông). */
function enchantedRose(): THREE.Group {
  const g = new THREE.Group();
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.85, 16), mat(WOOD, { rough: 0.55 }));
  col.position.y = 0.43;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.1, 24), mat(WOOD_D, { rough: 0.6 }));
  foot.position.y = 0.05;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.07, 32), mat(WOOD, { rough: 0.5 }));
  top.position.y = 0.88;
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 8, 40), mat(GOLD, { rough: 0.3, emissive: 0x8a5a00, ei: 0.3 }));
  trim.rotation.x = Math.PI / 2; trim.position.y = 0.9;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.08, 32), mat(GOLD, { rough: 0.3, emissive: 0x8a5a00, ei: 0.3 }));
  base.position.y = 0.955;
  g.add(col, foot, top, trim, base);
  // cây hồng
  const rose = new THREE.Group();
  rose.position.y = 1.0;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.34, 6), mat(0x2f9e44, { rough: 0.6 }));
  stem.position.y = 0.17;
  rose.add(stem);
  for (const [y, s] of [[0.1, 1], [0.2, -1]] as const) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x40c057, { rough: 0.6 }));
    leaf.scale.set(1, 0.25, 0.5); leaf.position.set(s * 0.05, y, 0); leaf.rotation.z = s * 0.5;
    rose.add(leaf);
  }
  const bloom = new THREE.Group();
  bloom.position.y = 0.38;
  const petalMat = mat(0xe0182d, { rough: 0.45, emissive: 0x6a0010, ei: 0.4 });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), petalMat);
  inner.scale.set(1, 1.2, 1);
  bloom.add(inner);
  for (let k = 0; k < 2; k++) for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + k * 0.6, rr = 0.045 + k * 0.03;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05 + k * 0.012, 10, 8), petalMat);
    p.scale.set(0.9, 1.1, 0.45);
    p.position.set(Math.cos(a) * rr, -0.01 - k * 0.02, Math.sin(a) * rr);
    p.lookAt(0, -0.01 - k * 0.02, 0);
    p.rotateX(-0.4 - k * 0.3);
    bloom.add(p);
  }
  rose.add(bloom);
  g.add(rose);
  shadows(g);
  // chuông kính
  const glass = mat(0xbfe6ff, { rough: 0.05, opacity: 0.32, emissive: 0x7fc8ff, ei: 0.35 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.42, 32, 1, true), glass);
  tube.position.y = 1.21;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  cap.position.y = 1.42;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), mat(GOLD, { rough: 0.3 }));
  knob.position.y = 1.69;
  // viền vàng chân chuông + vệt sáng dọc để thấy rõ kính trên nền sáng
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.018, 8, 40), mat(GOLD, { rough: 0.3, emissive: 0x8a5a00, ei: 0.3 }));
  ringB.rotation.x = Math.PI / 2; ringB.position.y = 1.0;
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5), glowMat(0xffffff, 0.55));
  shine.position.set(-0.13, 1.25, 0.2);
  shine.rotation.y = -0.5;
  g.add(tube, cap, knob, ringB, shine);
  // 2 cánh hoa rơi chậm trong chuông
  const petals: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), petalMat);
    p.scale.set(1, 0.3, 0.7);
    p.userData.seed = i * 2.1;
    g.add(p);
    petals.push(p);
  }
  const halo = glow(0xff4d6d, 1.1, 0.45);
  halo.position.y = 1.38;
  g.add(halo);
  g.userData = { bloom, halo, petals };
  return g;
}

/** Bục đọc sách: chân tiện + mặt nghiêng + sách mở; userData.page = trang đang lật (xoay quanh gáy). */
function lectern(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(WOOD, { rough: 0.55 });
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.08, 20), mat(WOOD_D, { rough: 0.6 }));
  foot.position.y = 0.04;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.0, 12), wood);
  post.position.y = 0.55;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mat(GOLD, { rough: 0.3 }));
  knot.position.y = 0.55;
  g.add(foot, post, knot);
  const desk = new THREE.Group();
  desk.position.y = 1.08;
  desk.rotation.x = 0.45;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.46), wood);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.03), mat(GOLD, { rough: 0.3 }));
  lip.position.set(0, 0.04, 0.23);
  desk.add(board, lip);
  const paper = mat(0xfff6e0, { rough: 0.9 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.4), mat(VELVET, { rough: 0.6 }));
  cover.position.y = 0.03;
  desk.add(cover);
  for (const s of [-1, 1]) {
    const pg = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.03, 0.37), paper);
    pg.position.set(s * 0.14, 0.05, 0);
    pg.rotation.z = -s * 0.06;
    desk.add(pg);
  }
  const pivot = new THREE.Group();
  pivot.position.y = 0.068;
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.004, 0.36), paper);
  leaf.position.x = 0.13;
  pivot.add(leaf);
  desk.add(pivot);
  g.add(desk);
  shadows(g);
  g.userData.page = pivot;
  return g;
}

/** Bàn trà tròn: ấm trà (có mắt), tách nhỏ (có mắt, userData.cup để nhảy), chân nến 3 ngọn (userData.candles). */
function teaTable(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(WOOD, { rough: 0.55 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.6, 0.06, 32), wood);
  top.position.y = 0.72;
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.7, 0.2, 32, 1, true), mat(0xfff0f3, { rough: 0.9, side: THREE.DoubleSide }));
  cloth.position.y = 0.66;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 12), wood);
  leg.position.y = 0.35;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 20), mat(WOOD_D));
  foot.position.y = 0.03;
  g.add(top, cloth, leg, foot);
  const china = mat(0xf2f8ff, { rough: 0.25 });
  const blue = mat(0x3f8efc, { rough: 0.35 });
  const goldM = mat(GOLD, { rough: 0.3, emissive: 0x8a5a00, ei: 0.25 });
  const eyeM = mat(0x1c2a5a, { rough: 0.2 });
  const faceEyes = (parent: THREE.Object3D, x: number, y: number, z: number, gap: number, size: number) => {
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), eyeM); e.position.set(x + s * gap, y, z); parent.add(e); }
  };
  // ấm trà
  const pot = new THREE.Group();
  pot.position.set(-0.18, 0.75, 0.05);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), china);
  body.scale.set(1, 0.85, 1); body.position.y = 0.17;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.018, 8, 32), blue);
  band.rotation.x = Math.PI / 2; band.position.y = 0.17;
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), china);
  lid.position.y = 0.32;
  const lidKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), goldM);
  lidKnob.position.y = 0.43;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.22, 10), china);
  spout.position.set(0.24, 0.2, 0); spout.rotation.z = -0.9;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 16, Math.PI * 1.3), goldM);
  handle.position.set(-0.2, 0.19, 0); handle.rotation.z = Math.PI * 0.35;
  pot.add(body, band, lid, lidKnob, spout, handle);
  faceEyes(pot, 0.06, 0.24, 0.17, 0.05, 0.018);
  pot.rotation.y = -0.1;
  g.add(pot);
  // tách nhỏ + đĩa
  const cup = new THREE.Group();
  cup.position.set(0.22, 0.75, 0.22);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.02, 20), china);
  saucer.position.y = 0.01;
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.1, 20), china);
  mug.position.y = 0.07;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.008, 6, 20), blue);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.12;
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.068, 20), mat(0xd9893f, { rough: 0.2 }));
  tea.rotation.x = -Math.PI / 2; tea.position.y = 0.11;
  const ch = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), china);
  ch.position.set(-0.085, 0.07, 0); ch.rotation.y = Math.PI / 2;
  cup.add(saucer, mug, rim, tea, ch);
  faceEyes(cup, 0.02, 0.08, 0.06, 0.025, 0.011);
  cup.rotation.y = 0.1;
  g.add(cup);
  // chân nến 3 ngọn
  const cand = new THREE.Group();
  cand.position.set(0.28, 0.75, -0.28);
  const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.04, 16), goldM);
  cb.position.y = 0.02;
  const cs = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.36, 10), goldM);
  cs.position.y = 0.2;
  const arms = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 20, Math.PI), goldM);
  arms.position.y = 0.38; arms.rotation.z = Math.PI;
  cand.add(cb, cs, arms);
  const candles: THREE.Object3D[] = [];
  for (const [x, y] of [[-0.13, 0.38], [0, 0.4], [0.13, 0.38]] as const) {
    const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.03, 10), goldM);
    cup2.position.set(x, y, 0);
    const c = candle(0.14, 0xfff4e0);
    c.position.set(x, y + 0.015, 0);
    cand.add(cup2, c);
    candles.push(c);
  }
  faceEyes(cand, 0, 0.26, 0.03, 0.02, 0.012);
  cand.rotation.y = -0.2;
  g.add(cand);
  shadows(g);
  g.userData = { cup, pot, candles };
  return g;
}

/** Ghế bành nhung đỏ chân vàng + gối + sách mở trên nệm. Mặt ghế hướng +z. */
function armchair(): THREE.Group {
  const g = new THREE.Group();
  const velvet = mat(VELVET, { rough: 0.85 }), velvetL = mat(0xe8445a, { rough: 0.85 });
  const goldM = mat(GOLD, { rough: 0.35 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.8), velvetL);
  seat.position.y = 0.48;
  const baseB = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.85), velvet);
  baseB.position.y = 0.3;
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24, 1, false, -Math.PI / 2, Math.PI), velvet);
  back.rotation.x = Math.PI / 2; back.rotation.z = Math.PI;
  back.scale.set(1, 1, 1.5);
  back.position.set(0, 0.95, -0.34);
  const backLow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.18), velvet);
  backLow.position.set(0, 0.68, -0.34);
  g.add(seat, baseB, back, backLow);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16), velvet);
    arm.rotation.x = Math.PI / 2; arm.position.set(s * 0.5, 0.66, 0.02);
    const armFront = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16), goldM);
    armFront.rotation.x = Math.PI / 2; armFront.position.set(s * 0.5, 0.66, 0.43);
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.75), velvet);
    armPost.position.set(s * 0.5, 0.5, 0.02);
    g.add(arm, armFront, armPost);
    for (const z of [-0.33, 0.33]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.2, 8), goldM);
      leg.position.set(s * 0.42, 0.1, z);
      g.add(leg);
    }
  }
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(PAL.primary, { rough: 0.8 }));
  pillow.scale.set(1.2, 0.9, 0.45); pillow.position.set(0.18, 0.75, -0.18); pillow.rotation.z = -0.3;
  const book = new THREE.Group();
  const bc = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), mat(0x3f8efc, { rough: 0.6 }));
  const bp = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.03, 0.22), mat(0xfff6e0, { rough: 0.9 }));
  bp.position.y = 0.02;
  book.add(bc, bp);
  book.position.set(-0.15, 0.6, 0.12); book.rotation.y = 0.4;
  g.add(pillow, book);
  shadows(g);
  return g;
}

/** Thang trượt tủ sách: 2 tay vịn + bậc + bánh xe. Đáy ở y=0, dựa ngả về -z. */
function ladder(h: number): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(WOOD_D, { rough: 0.6 });
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), wood);
    rail.position.set(s * 0.25, h / 2, 0);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 14), mat(GOLD, { rough: 0.3 }));
    wheel.position.set(s * 0.25, 0.05, 0.02); wheel.rotation.y = Math.PI / 2;
    g.add(rail, wheel);
  }
  for (let y = 0.35; y < h - 0.1; y += 0.38) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.09), wood);
    rung.position.y = y;
    g.add(rung);
  }
  g.rotation.x = -0.2;
  shadows(g);
  return g;
}

/** Sách bay: 2 bìa bản lề ở gáy (userData.l / .r) vỗ như cánh + khối trang. Gáy dọc trục z, bay theo +x. */
function flyingBook(color: number): THREE.Group {
  const g = new THREE.Group();
  const cover = mat(color, { rough: 0.6 });
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.36), mat(0xfff6e0, { rough: 0.9 }));
  g.add(pages);
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group();
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.4), cover);
    c.position.y = s * 0.14;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.405), mat(GOLD, { rough: 0.3 }));
    band.position.y = s * 0.22;
    pv.add(c, band);
    g.add(pv);
    wings.push(pv);
  }
  g.userData.wings = wings;
  shadows(g);
  return g;
}

/** Đèn chùm vàng: vòng + tay + 8 nến (userData.candles) + xích treo lên trần. Gốc ở vòng đèn. */
function chandelier(): THREE.Group {
  const g = new THREE.Group();
  const goldM = mat(GOLD, { rough: 0.3, emissive: 0x8a5a00, ei: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 48), goldM);
  ring.rotation.x = Math.PI / 2;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 36), goldM);
  ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.25;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), goldM);
  hub.position.y = -0.2;
  const drop = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 12), goldM);
  drop.position.y = -0.42; drop.rotation.x = Math.PI;
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), goldM);
  chain.position.y = 1.5;
  g.add(ring, ring2, hub, drop, chain);
  const candles: THREE.Object3D[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = candle(0.18, 0xfff4e0);
    c.position.set(Math.cos(a) * 0.7, 0.02, Math.sin(a) * 0.7);
    const cupM = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.05, 10), goldM);
    cupM.position.copy(c.position);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), mat(0xdff6ff, { rough: 0.05, emissive: 0x9fdcff, ei: 0.4 }));
    crystal.position.set(Math.cos(a) * 0.55, -0.18, Math.sin(a) * 0.55);
    crystal.scale.y = 1.8;
    g.add(c, cupM, crystal);
    candles.push(c);
  }
  g.userData.candles = candles;
  return g;
}

// ---------------------------------------------------------------- dữ liệu hoạt cảnh
interface Flyer { obj: THREE.Object3D; c: THREE.Vector3; rx: number; rz: number; speed: number; a: number; order: number }
interface Petals { mesh: THREE.InstancedMesh; x: Float32Array; y: Float32Array; z: Float32Array; v: Float32Array; seed: Float32Array; spawn: (i: number, first: boolean) => void }

const _dummy = new THREE.Object3D();
const _tw = new THREE.Vector3();

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;
  const r = rng(7);
  const backZ = -5.6;
  const H = 8;
  const backW = 8.6;
  // 2 tường xiên (bát giác) + 2 tường bên
  const A = new THREE.Vector2(backW / 2, backZ), B = new THREE.Vector2(6.8, -1.5);
  const diagLen = A.distanceTo(B);

  // --- ngoài cửa sổ: trời hoàng hôn hồng vàng, vườn hồng, lâu đài xa
  const dome = skyDome(0x7fb2ff, 0xffc3a0, 70);
  dome.position.set(0, -10, -12);
  root.add(dome);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), glowMat(0xffe7a0));
  sun.position.set(-4.5, 4.2, -34);
  root.add(sun);
  const sunGlow = glow(0xffd18a, 9, 0.5);
  sunGlow.position.copy(sun.position);
  root.add(sunGlow);
  const outside = new Batch();
  // lâu đài (tím xanh, mái vàng)
  for (const [x, h, rr] of [[3.5, 7, 0.9], [1.6, 5.2, 0.7], [5.4, 5.6, 0.7], [7, 4, 0.55], [0.2, 3.8, 0.5]] as const) {
    outside.add(new THREE.CylinderGeometry(rr * 0.9, rr, h, 14), 0xa7a3f0, M(x, h / 2 - 1, -28));
    outside.add(new THREE.ConeGeometry(rr * 1.2, h * 0.45, 14), 0x6f6ad8, M(x, h - 1 + h * 0.22, -28));
    outside.add(new THREE.SphereGeometry(rr * 0.2, 8, 6), 0xffd23f, M(x, h - 1 + h * 0.46, -28));
  }
  outside.add(new THREE.BoxGeometry(9, 2.6, 2), 0xb9b5f5, M(3.5, 0.3, -28.5));
  // đồi cỏ + hàng rào hồng
  outside.add(new THREE.SphereGeometry(1, 20, 10), 0x7ad36f, M(0, -2.2, -22, 0, 0, 0, 26, 3, 10));
  for (let i = 0; i < 22; i++) {
    const x = -9 + i * 0.85 + (r() - 0.5) * 0.3, z = -9 - r() * 1.5, s = 0.6 + r() * 0.35;
    outside.add(new THREE.SphereGeometry(1, 10, 8), i % 2 ? 0x38b24a : 0x4cc25a, M(x, s * 0.55 - 0.1, z, 0, 0, 0, s, s * 0.8, s));
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2;
      outside.add(new THREE.SphereGeometry(0.13, 8, 6), [0xe0182d, 0xff5f7e, 0xffd23f][k], M(x + Math.cos(a) * s * 0.7, s * 0.7 + r() * 0.3, z + Math.sin(a) * s * 0.6 + 0.25));
    }
  }
  const out = outside.mesh(0.85);
  out.castShadow = false;
  root.add(out);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), mat(0x8fe07a, { rough: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(0, -0.02, -32);
  root.add(lawn);
  for (const [name, x, z, h] of [['tree_fat.glb', -6.5, -14, 4.5], ['tree_default.glb', 7.5, -15, 5], ['tree_default.glb', -2.8, -18, 4]] as const) {
    try { const tr = await ctx.model(name, { height: h }); tr.position.set(x, 0, z); root.add(tr); } catch { /* bỏ qua */ }
  }

  // --- tường: giấy dán kem vàng hoa hồng đỏ; tường sau có cửa sổ vòm khoét
  const paper = texMat(wallpaperTex(0xffe8c4, 0xffd99a, 0xe84a5f, [4, 2]), { rough: 0.9 });
  const paperSide = texMat(wallpaperTex(0xffe8c4, 0xffd99a, 0xe84a5f, [7, 2]), { rough: 0.9 });
  const backWall = wallWithArch(backW + 0.1, H, 3.0, 3.8, 0.85, texMat(wallpaperTex(0xffe8c4, 0xffd99a, 0xe84a5f, [1, 1]), { rough: 0.9 }), 2.2);
  backWall.position.set(0, 0, backZ);
  root.add(backWall);
  const frame = archFrame(3.0, 3.8, GOLD, 0.2, 0.3);
  frame.position.set(0, 0.85, backZ - 0.05);
  root.add(frame);
  // song cửa (khung vàng mảnh) + bậu cửa
  const mullion = mat(GOLD, { rough: 0.35 });
  const mv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.8, 0.06), mullion);
  mv.position.set(0, 0.85 + 1.9, backZ + 0.05);
  const mh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.06), mullion);
  mh.position.set(0, 0.85 + 2.3, backZ + 0.05);
  root.add(mv, mh);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.55), mat(WOOD, { rough: 0.55 }));
  sill.position.set(0, 0.8, backZ + 0.22);
  sill.castShadow = true; sill.receiveShadow = true;
  root.add(sill);
  for (const side of [-1, 1]) {
    const c = curtain(4.4, 0.95, VELVET, 0xb01a33);
    c.position.set(side * 2.05, 0.1, backZ + 0.35);
    root.add(c);
    // dải buộc rèm vàng
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 20), mat(GOLD, { rough: 0.35 }));
    tie.position.set(side * 2.05, 1.6, backZ + 0.45);
    tie.rotation.x = Math.PI / 2;
    tie.scale.set(1.2, 0.6, 1);
    root.add(tie);
  }
  // rèm ngang (valance) trên cửa sổ
  const valance = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.9, 16, 1, false, 0, Math.PI), mat(VELVET, { rough: 0.9 }));
  valance.rotation.z = Math.PI / 2;
  valance.rotation.y = Math.PI / 2;
  valance.position.set(0, 4.85, backZ + 0.4);
  root.add(valance);
  const candlesSill: THREE.Object3D[] = [];
  for (const x of [-1.3, -1.05, 1.1, 1.35]) {
    const c = candle(0.16 + r() * 0.12, 0xfff1dc);
    c.position.set(x, 0.87, backZ + 0.25);
    root.add(c);
    candlesSill.push(c);
  }

  const diagMid = A.clone().add(B).multiplyScalar(0.5);
  // góc quay tường xiên PHẢI để mặt (+z) hướng vào trong phòng: pháp tuyến = (-dy, dx) của đoạn A→B; bên trái dùng -diagYaw
  const diagYaw = Math.atan2(-(B.y - A.y), B.x - A.x);
  for (const side of [-1, 1]) {
    const w = wall(diagLen + 0.1, H, paper);
    w.position.set(side * diagMid.x, 0, diagMid.y);
    w.rotation.y = side * diagYaw;
    root.add(w);
    const sw = wall(8, H, paperSide);
    sw.position.set(side * 6.8, 0, 2.5);
    sw.rotation.y = -side * Math.PI / 2;
    root.add(sw);
  }
  // chân tường gỗ + gờ vàng (3 mảng: sau + 2 xiên + 2 bên)
  const trimB = new Batch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const skirt = (x: number, z: number, yaw: number, len: number) => {
    trimB.add(box, WOOD_D, M(x, 0.2, z, 0, yaw, 0, len, 0.4, 0.08));
    trimB.add(box, GOLD, M(x, 0.42, z, 0, yaw, 0, len, 0.04, 0.1));
    trimB.add(box, WOOD, M(x, 5.4, z, 0, yaw, 0, len, 0.3, 0.2));
  };
  skirt(0, backZ + 0.04, 0, backW);
  for (const side of [-1, 1]) {
    const dx = Math.sin(side * diagYaw) * 0.04, dz = Math.cos(side * diagYaw) * 0.04;
    skirt(side * diagMid.x + dx, diagMid.y + dz, side * diagYaw, diagLen);
    skirt(side * 6.76, 2.5, -side * Math.PI / 2, 8);
  }
  root.add(trimB.mesh(0.6));

  // --- sàn đá hoa kem + thảm oval hoa hồng vàng
  root.add(floor(30, 30, texMat(tileTex(0xf7cf86, 0xffedcc, [12, 12], 0xe8b35c), { rough: 0.55 })));
  const rugM = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: rugTex(), transparent: true, alphaTest: 0.3, roughness: 1, metalness: 0 }));
  rugM.rotation.x = -Math.PI / 2;
  rugM.scale.set(6.6, 4.6, 1);
  rugM.position.set(0, 0.012, 0.8);
  rugM.receiveShadow = true;
  root.add(rugM);

  // --- 4 tủ sách cao (2 cạnh cửa sổ + 2 tường xiên) + tủ thấp 2 bên; sách = 1 InstancedMesh
  const wood = new Batch();
  const books: BookSlot[] = [];
  for (const side of [-1, 1]) {
    bookcase(wood, books, M(side * 3.45, 0, backZ + 0.02), 1.7, 4.5, r);
    const yaw = side * diagYaw;
    const nx = Math.sin(yaw) * 0.05, nz = Math.cos(yaw) * 0.05;
    bookcase(wood, books, M(side * diagMid.x + nx, 0, diagMid.y + nz, 0, yaw, 0), diagLen - 0.5, 4.5, r);
    bookcase(wood, books, M(side * 6.75, 0, 1.3, 0, -side * Math.PI / 2, 0), 1.6, 1.25, r);
  }
  root.add(wood.mesh(0.6));
  const bookMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: spineTex(), roughness: 0.75, metalness: 0 }), books.length);
  const tmpC = new THREE.Color();
  books.forEach((b, i) => { bookMesh.setMatrixAt(i, b.m); bookMesh.setColorAt(i, tmpC.setHex(b.c)); });
  bookMesh.castShadow = true;
  bookMesh.receiveShadow = true;
  root.add(bookMesh);

  // thang trượt dựa tủ xiên phải: đứng trước tủ, lệch về phía cửa sổ, ngả vào tủ
  {
    const holder = new THREE.Group();
    const ax = Math.cos(diagYaw), az = -Math.sin(diagYaw);          // trục dọc mặt tủ
    const nx = Math.sin(diagYaw), nz = Math.cos(diagYaw);           // pháp tuyến hướng vào phòng
    holder.position.set(diagMid.x - ax * 0.9 + nx * 1.15, 0, diagMid.y - az * 0.9 + nz * 1.15);
    holder.rotation.y = diagYaw;
    holder.add(ladder(3.6));
    root.add(holder);
  }

  // --- tường bên: gương thần (trái) + tranh ngựa Philippe (phải)
  const mirror = new THREE.Group();
  const mf = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 10, 48), mat(GOLD, { rough: 0.3, emissive: 0x8a5a00, ei: 0.3 }));
  mf.scale.set(0.8, 1.1, 1);
  const mg = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), mat(0xbfe8ff, { rough: 0.05, emissive: 0x7fd0ff, ei: 0.35 }));
  mg.scale.set(0.8, 1.1, 1);
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(VELVET, { rough: 0.4, emissive: 0x6a0010, ei: 0.3 }));
  crest.position.y = 0.78;
  mirror.add(mf, mg, crest);
  mirror.position.set(-6.72, 2.4, 0.2);
  mirror.rotation.y = Math.PI / 2;
  root.add(mirror);
  const mirrorGlow = glow(0x9fe3ff, 2.2, 0.35);
  mirrorGlow.position.set(-6.6, 2.4, 0.2);
  root.add(mirrorGlow);
  const horse = new THREE.Group();
  {
    const tex = canvasTex(256, 320, drawHorse);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), texMat(tex, { rough: 0.9 }));
    pic.position.z = 0.03;
    horse.add(pic);
    const fm = mat(GOLD, { rough: 0.4 });
    for (const [x, y, fw, fh] of [[0, 0.8, 1.44, 0.12], [0, -0.8, 1.44, 0.12], [-0.66, 0, 0.12, 1.5], [0.66, 0, 0.12, 1.5]] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.08), fm);
      bar.position.set(x, y, 0.02);
      horse.add(bar);
    }
  }
  horse.position.set(6.72, 2.5, 0.1);
  horse.rotation.y = -Math.PI / 2;
  root.add(horse);

  // --- hoa hồng phép (phải, sau) + bục đọc (trái, sau) + quả địa cầu
  const rose = enchantedRose();
  rose.position.set(2.5, 0, -3.1);
  rose.scale.setScalar(1.3);
  root.add(rose);
  const lec = lectern();
  lec.position.set(-2.45, 0, -3.1);
  lec.rotation.y = 0.35;
  root.add(lec);
  const globe = new THREE.Group();
  {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 10), mat(WOOD_D));
    stand.position.y = 0.4;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.06, 18), mat(WOOD));
    foot.position.y = 0.03;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 18), texMat(globeTex(), { rough: 0.5 }));
    ball.position.y = 1.1;
    ball.rotation.z = 0.4;
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 40), mat(GOLD, { rough: 0.3 }));
    meridian.position.y = 1.1;
    meridian.rotation.z = 0.4;
    globe.add(stand, foot, ball, meridian);
    globe.userData.ball = ball;
    shadows(globe);
  }
  globe.position.set(-4.7, 0, -3.5);
  root.add(globe);

  // --- bàn trà (trái trước) + ghế bành (phải) + chồng sách dưới sàn
  const tea = teaTable();
  tea.position.set(-3.95, 0, -1.55);
  tea.rotation.y = 0.5;
  root.add(tea);
  const chair = armchair();
  chair.position.set(4.15, 0, -1.2);
  chair.rotation.y = -0.7;
  root.add(chair);
  const stacks = new Batch();
  for (const [x, z, n] of [[3.4, 1.4, 4], [-3.5, 1.8, 3], [5.3, -2.2, 5], [-5.6, -1.7, 3]] as const) {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const th = 0.07 + r() * 0.04;
      stacks.add(box, BOOK_COLS[Math.floor(r() * BOOK_COLS.length)], M(x + (r() - 0.5) * 0.06, y + th / 2, z, 0, r() * 0.8, 0, 0.42 - i * 0.03, th, 0.3 - i * 0.015));
      y += th;
    }
  }
  root.add(stacks.mesh(0.7));

  // --- đèn chùm giữa phòng (sau lưng công chúa, cao trên đầu)
  const chand = chandelier();
  chand.position.set(0, 3.15, -2.7);
  root.add(chand);

  // --- sách bay vỗ bìa (hiện dần khi băng tan)
  const flyers: Flyer[] = [];
  const flyPaths: [number, number, number, number, number, number][] = [
    [-4.6, 3.0, -2.4, 0.9, 1.2, 0.45], [4.6, 3.2, -2.2, 0.9, 1.2, -0.4], [-4.2, 3.6, -3.6, 1.2, 0.7, -0.35],
    [4.3, 3.7, -3.5, 1.1, 0.7, 0.38], [0, 4.0, -4.3, 2.6, 0.5, 0.25], [-5.6, 2.4, -0.2, 0.5, 0.9, 0.5],
  ];
  flyPaths.forEach(([x, y, z, rx, rz, sp], i) => {
    const b = flyingBook(BOOK_COLS[(i * 3 + 1) % BOOK_COLS.length]);
    root.add(b);
    flyers.push({ obj: b, c: new THREE.Vector3(x, y, z), rx, rz, speed: sp, a: r() * 6, order: [0, 3, 1, 4, 2, 5][i] / flyPaths.length });
  });

  // --- cánh hoa hồng rơi (1 InstancedMesh)
  const NP = 60;
  const petalGeo = new THREE.SphereGeometry(1, 8, 6);
  petalGeo.scale(1, 0.28, 0.7);
  const pet: Petals = {
    mesh: new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, emissive: 0x4a0010, emissiveIntensity: 0.3 }), NP),
    x: new Float32Array(NP), y: new Float32Array(NP), z: new Float32Array(NP), v: new Float32Array(NP), seed: new Float32Array(NP),
    spawn: (i, first) => {
      const side = i % 2 ? -1 : 1;
      pet.x[i] = side * (2.9 + Math.random() * 3.3);
      pet.z[i] = -5 + Math.random() * 5.5;
      pet.y[i] = first ? Math.random() * 4.6 : 4.6 + Math.random() * 0.4;
      pet.v[i] = 0.22 + Math.random() * 0.2;
      pet.seed[i] = Math.random() * 10;
    },
  };
  const petalCols = [0xe0182d, 0xff5f7e, 0xff8fa3, 0xd62839];
  for (let i = 0; i < NP; i++) { pet.spawn(i, true); pet.mesh.setColorAt(i, tmpC.setHex(petalCols[i % petalCols.length])); }
  pet.mesh.frustumCulled = false;
  root.add(pet.mesh);

  // --- ánh sáng: nến đèn chùm (vàng ấm) + hoa hồng (hồng đỏ) – 2 point light
  const warm = new THREE.PointLight(0xffb45a, 4, 10, 1.5);
  warm.position.set(0, 2.9, -2.4);
  const roseL = new THREE.PointLight(0xff4d6d, 3, 5, 1.6);
  roseL.position.set(2.5, 2.0, -2.6);
  root.add(warm, roseL);
  const windowGlow = glow(0xffd9a0, 5.5, 0.35);
  windowGlow.position.set(0, 2.8, backZ + 0.1);
  root.add(windowGlow);

  Object.assign(ctx.state, {
    candlesSill, chandCandles: chand.userData.candles, teaCandles: tea.userData.candles, tea, rose, lec, globe, flyers, pet, warm, roseL, windowGlow, mirrorGlow,
  });
}

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time, melt = ctx.melt, st = ctx.state;

  // nến: bậu cửa + chân nến luôn cháy; đèn chùm thắp dần theo băng tan
  (st.candlesSill as THREE.Object3D[] | undefined)?.forEach((c, i) => flicker(c, t, i * 1.7));
  (st.teaCandles as THREE.Object3D[] | undefined)?.forEach((c, i) => flicker(c, t, i * 2.3 + 1));
  const cc = st.chandCandles as THREE.Object3D[] | undefined;
  if (cc) {
    const lit = ctx.awake ? cc.length : Math.round(2 + melt * (cc.length - 2));
    cc.forEach((c, i) => {
      const on = i % cc.length < lit;
      (c.userData.flame as THREE.Object3D).visible = on;
      (c.userData.halo as THREE.Object3D).visible = on;
      if (on) flicker(c, t, i * 1.3);
    });
  }
  const warm = st.warm as THREE.PointLight | undefined;
  if (warm) warm.intensity = 2.5 + 4 * melt + Math.sin(t * 9) * 0.15;
  const wg = st.windowGlow as THREE.Sprite | undefined;
  if (wg) wg.material.opacity = 0.25 + 0.2 * melt + Math.sin(t * 1.3) * 0.04;
  const mgl = st.mirrorGlow as THREE.Sprite | undefined;
  if (mgl) mgl.material.opacity = 0.25 + 0.25 * melt + Math.sin(t * 2.1) * 0.08;

  // hoa hồng: xoay chậm, sáng rực dần; 2 cánh rơi trong chuông
  const rose = st.rose as THREE.Object3D | undefined;
  if (rose) {
    const u = rose.userData as { bloom: THREE.Object3D; halo: THREE.Sprite; petals: THREE.Mesh[] };
    u.bloom.rotation.y = t * 0.4;
    u.bloom.scale.setScalar(1 + 0.25 * melt + Math.sin(t * 2) * 0.03);
    u.halo.material.opacity = 0.3 + 0.45 * melt + Math.sin(t * 2.4) * 0.06;
    u.halo.scale.setScalar(0.9 + 0.7 * melt);
    for (const p of u.petals) {
      const k = ((t * 0.12 + (p.userData.seed as number)) % 1);
      p.position.set(Math.sin(t * 1.3 + (p.userData.seed as number)) * 0.1, 1.36 - k * 0.36, Math.cos(t * 1.1 + (p.userData.seed as number)) * 0.08);
      p.rotation.set(t * 1.5, t, 0);
    }
    const rl = st.roseL as THREE.PointLight | undefined;
    if (rl) rl.intensity = 2 + 4 * melt;
    if (melt > 0.3 && Math.random() < 0.08 * melt) {
      rose.localToWorld(_tw.set(0, 1.4, 0));
      ctx.magic.twinkle(_tw, 0xd62839, 1, 0.35, 0.3);
    }
  }

  // bục đọc: trang sách tự lật (khi băng bắt đầu tan)
  const lec = st.lec as THREE.Object3D | undefined;
  if (lec) {
    const page = lec.userData.page as THREE.Object3D;
    const cyc = (t * (0.15 + 0.2 * melt)) % 1;
    const k = melt > 0 || ctx.awake ? THREE.MathUtils.smoothstep(cyc, 0.25, 0.75) : 0;
    page.rotation.z = k * Math.PI * 0.97;
    page.position.y = 0.068 + Math.sin(k * Math.PI) * 0.02;
  }

  // quả địa cầu xoay
  const globe = st.globe as THREE.Object3D | undefined;
  if (globe) (globe.userData.ball as THREE.Object3D).rotation.y = t * (0.2 + 0.5 * melt);

  // bàn trà: tách nhỏ nhảy tưng tưng khi công chúa tỉnh, ấm trà lắc lư
  const tea = st.tea as THREE.Object3D | undefined;
  if (tea) {
    const u = tea.userData as { cup: THREE.Object3D; pot: THREE.Object3D };
    if (ctx.awake) {
      u.cup.position.y = 0.75 + Math.abs(Math.sin(t * 5)) * 0.14;
      u.cup.rotation.z = Math.sin(t * 5) * 0.15;
      u.pot.rotation.z = Math.sin(t * 2.5) * 0.08;
    } else {
      u.cup.position.y = 0.75;
      u.pot.rotation.z = Math.sin(t * 1.2) * 0.02 * melt;
    }
  }

  // sách bay: băng tan → nhiều sách bay, vỗ bìa
  for (const f of (st.flyers as Flyer[] | undefined) ?? []) {
    const show = ctx.awake || f.order < melt * 1.05;
    f.obj.visible = show;
    if (!show) continue;
    f.a += f.speed * dt * (ctx.awake ? 1.4 : 1);
    const ca = Math.cos(f.a), sa = Math.sin(f.a);
    f.obj.position.set(f.c.x + ca * f.rx, f.c.y + Math.sin(f.a * 2) * 0.15, f.c.z + sa * f.rz);
    const dir = Math.sign(f.speed) || 1;
    f.obj.rotation.set(0, Math.atan2(-ca * f.rz * dir, -sa * f.rx * dir), Math.sin(f.a * 2) * 0.12);
    const wings = f.obj.userData.wings as THREE.Object3D[];
    const flap = 0.5 + Math.sin(t * 7 + f.order * 9) * 0.45;
    wings[0].rotation.x = flap;
    wings[1].rotation.x = -flap;
  }

  // cánh hoa rơi: đóng băng ít, tan dần nhiều hơn
  const pet = st.pet as Petals | undefined;
  if (pet) {
    const n = Math.round(pet.x.length * (0.2 + 0.8 * melt));
    pet.mesh.count = n;
    for (let i = 0; i < n; i++) {
      pet.y[i] -= pet.v[i] * dt;
      if (pet.y[i] < 0.02) pet.spawn(i, false);
      const s = pet.seed[i];
      _dummy.position.set(pet.x[i] + Math.sin(t * 0.9 + s) * 0.35, pet.y[i], pet.z[i] + Math.cos(t * 0.7 + s) * 0.2);
      _dummy.rotation.set(Math.sin(t * 1.7 + s) * 1.2, t * 0.8 + s, Math.cos(t * 1.3 + s) * 0.8);
      _dummy.scale.setScalar(0.05);
      _dummy.updateMatrix();
      pet.mesh.setMatrixAt(i, _dummy.matrix);
    }
    pet.mesh.instanceMatrix.needsUpdate = true;
  }

  // đã tỉnh: lấp lánh vàng/đỏ quanh tủ sách
  if (ctx.awake && Math.random() < 0.25) {
    const x = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 2.8);
    ctx.magic.twinkle(_tw.set(x, 0.6 + Math.random() * 3.4, -4.5 + Math.random() * 4.5), Math.random() < 0.5 ? 0xe0a000 : 0xd62839, 1, 0.3, 0.32);
  }
}

const room: RoomDef = {
  id: 'belle',
  name: 'Thư viện của Belle',
  emoji: '🌹',
  princessModel: 'p_belle.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'sách', emoji: '📖', name: 'quyển sách', fill: { index: 0, distractors: ['p', 'g'] } },
    { word: 'hồng', emoji: '🌹', name: 'bông hồng', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'ghế', emoji: '🪑', name: 'cái ghế' },
    { word: 'tách', emoji: '☕', name: 'cái tách', fill: { index: 0, distractors: ['p', 'g'] } },
    { word: 'ấm', emoji: '🫖', name: 'cái ấm' },
    { word: 'gương', emoji: '🪞', name: 'cái gương', fill: { index: 0, distractors: ['p', 'b'] } },
    { word: 'ngựa', emoji: '🐴', name: 'con ngựa' },
  ],
  count: { emoji: '🌹', audio: 'belle_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],
  magicColors: [0xe0a000, 0xd62839],
  audio: { name: 'belle_name', intro: 'belle_intro', thanks: 'belle_thanks' },
};

export default room;

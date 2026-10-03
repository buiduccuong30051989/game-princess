// PHÒNG BẠCH TUYẾT: Nhà nhỏ của bảy chú lùn trong rừng. Tường vữa vàng kem + khung gỗ + chân tường đá, cửa sổ vòm lớn
// khoét thủng nhìn ra khu rừng (cây táo đỏ, giếng ước, nấm, đồi xanh, chim xanh bay vòng), bảy chiếc giường nhỏ chăn
// bảy màu, lò sưởi lửa bập bùng, bàn ăn có bánh táo, xe goòng đá quý của các chú lùn, nấm đỏ chấm trắng.
// Băng tan → hoa trong bồn cửa sổ nở, chim bay về nhiều hơn, thỏ/sóc lần lượt ló ra, lửa ấm hơn; tỉnh → nai + chim bay vào nhà.
import * as THREE from 'three';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, brickTex, plankTex, skyDome, floor, wall, wallWithArch, archFrame, rug, shelf,
  painting, candle, flicker, glow, bunting, shadows, mix,
} from '../room/kit.ts';

const PAL = { primary: 0xe63946, secondary: 0x2563eb, accent: 0xffd166, light: 0xeaf8ff, dark: 0x14532d };

const BACK_Z = -5.6;   // tường sau
const SIDE_X = 6.6;    // tường bên
const ROOM_H = 6;

// bảy màu chăn / cốc / mũ của bảy chú lùn
const DWARF = [0xe63946, 0xff8c1a, 0xffd23f, 0x2fbf71, 0x2f80ed, 0x8e44ec, 0xff5fa2];
const hexCss = (c: number) => '#' + c.toString(16).padStart(6, '0');

// ---------------------------------------------------------------- texture riêng
/** Vữa trát vàng kem có đốm nhẹ (tường). */
function plasterTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fbe3b0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * w;
      const y = (Math.sin(i * 78.233) * 12543.123 % 1 + 1) % 1 * h;
      g.fillStyle = i % 3 ? 'rgba(255,255,255,0.22)' : 'rgba(214,150,80,0.12)';
      g.beginPath(); g.arc(x, y, 6 + (i % 5) * 3, 0, Math.PI * 2); g.fill();
    }
  }, repeat);
}

/** Mũ nấm màu chấm trắng. */
const capCache = new Map<string, THREE.CanvasTexture>();
function capTex(color: string): THREE.CanvasTexture {
  let t = capCache.get(color);
  if (!t) {
    t = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff8ec';
      for (let i = 0; i < 14; i++) {
        const x = (i * 37 + (i % 2) * 18) % w, y = 16 + ((i * 29) % (h * 0.55));
        g.beginPath(); g.ellipse(x, y, 11 - (y / h) * 5, 8 - (y / h) * 3, 0, 0, Math.PI * 2); g.fill();
      }
    });
    capCache.set(color, t);
  }
  return t;
}

// ---------------------------------------------------------------- đồ vật
/** Chim xanh nhỏ, đầu hướng +z. userData.wings để vỗ cánh. simple = bản ít khối (bay xa). */
function bird(color = 0x2f9bff, simple = false): THREE.Group {
  const g = new THREE.Group();
  const bodyM = mat(color, { rough: 0.55 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), bodyM);
  body.scale.set(1, 0.9, 1.35);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), bodyM);
  head.position.set(0, 0.08, 0.12);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 8), mat(0xff9f1c, { rough: 0.5 }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.07, 0.21);
  g.add(body, head, beak);
  if (!simple) {
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), mat(0xfff1d6, { rough: 0.6 }));
    belly.position.set(0, -0.03, 0.05);
    const eyeM = mat(0x1b1b3a, { rough: 0.3 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeM);
      eye.position.set(s * 0.045, 0.02, 0.05);
      head.add(eye);   // mắt gắn vào đầu → ngó nghiêng theo đầu
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), mat(mix(color, 0x000000, 0.2)));
    tail.rotation.x = -Math.PI / 2 - 0.4;
    tail.position.set(0, 0.02, -0.17);
    g.add(belly, tail);
  }
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.07, 0.03, 0);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), mat(mix(color, 0xffffff, 0.2), { rough: 0.6 }));
    w.scale.set(1, 0.18, 0.62);
    w.position.x = s * 0.09;
    pivot.add(w);
    g.add(pivot);
    wings.push(pivot);
  }
  g.userData.wings = wings;
  g.userData.head = head;
  return g;
}

/** Vỗ cánh (gọi trong ambient). */
function flap(b: THREE.Object3D, t: number, speed: number, amp: number): void {
  const wings = b.userData.wings as THREE.Object3D[];
  const a = Math.sin(t * speed) * amp;
  wings[0].rotation.z = a;
  wings[1].rotation.z = -a;
}

/** Nấm chấm trắng. Đáy y=0, cao ~h. */
function toadstool(h: number, capColor = '#e63946'): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.16, h * 0.22, h * 0.7, 16), mat(0xfff3dc, { rough: 0.8 }));
  stem.position.y = h * 0.35;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(h * 0.48, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), texMat(capTex(capColor), { rough: 0.55 }));
  cap.scale.y = 0.75;
  cap.position.y = h * 0.62;
  const under = new THREE.Mesh(new THREE.CircleGeometry(h * 0.48, 28), mat(0xffe1b8, { rough: 0.9 }));
  under.rotation.x = Math.PI / 2;
  under.position.y = h * 0.62;
  g.add(stem, cap, under);
  shadows(g);
  return g;
}

/** Quả táo bóng (+ cuống, + lá nếu leaf). Tâm ở gốc. */
function apple(r = 0.09, color = 0xe0202e, leaf = false): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color, { rough: 0.3 }));
  body.scale.y = 0.92;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.08, r * 0.1, r * 0.5, 5), mat(0x8a5427));
  stem.position.y = r * 1.05;
  g.add(body, stem);
  if (leaf) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 8, 6), mat(0x3fb950, { rough: 0.6 }));
    l.scale.set(1, 0.25, 0.5);
    l.position.set(r * 0.3, r * 1.1, 0);
    l.rotation.z = 0.5;
    g.add(l);
  }
  shadows(g);
  return g;
}

/** Giường nhỏ của chú lùn: khung gỗ, nệm, gối, chăn màu, đầu giường có biển tròn vẽ hình. Đầu giường ở -z, đáy y=0. */
function littleBed(blanket: number, sign: string): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0xd08a4a, { rough: 0.65 });
  const L = 1.35, W = 0.78;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W, 0.22, L), wood);
  frame.position.set(0, 0.2, 0);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.1, L - 0.1), mat(0xfff4dc, { rough: 0.9 }));
  mattress.position.set(0, 0.36, 0);
  const quilt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.08, L * 0.62), mat(blanket, { rough: 0.9 }));
  quilt.position.set(0, 0.42, L * 0.18);
  const fold = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, 0.1, 0.12), mat(mix(blanket, 0xffffff, 0.45), { rough: 0.9 }));
  fold.position.set(0, 0.45, L * 0.18 - L * 0.31);
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mat(0xffffff, { rough: 0.95 }));
  pillow.scale.set(1.3, 0.35, 0.7);
  pillow.position.set(0, 0.46, -L / 2 + 0.2);
  const head = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.85, 0.08), wood);
  head.position.set(0, 0.42, -L / 2 - 0.02);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.5, 0.08), wood);
  foot.position.set(0, 0.25, L / 2 + 0.02);
  const plaqueTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#fff4dc'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = hexCss(blanket); c.lineWidth = 12;
    c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2); c.stroke();
    c.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(sign, w / 2, h / 2 + 4);
  });
  const plaque = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), texMat(plaqueTex, { rough: 0.8 }));
  plaque.position.set(0, 0.95, -L / 2 + 0.03);
  g.add(frame, mattress, quilt, fold, pillow, head, foot, plaque);
  shadows(g, true, true);
  return g;
}

/** Lò sưởi đá có lửa (userData.flames, halo). Mặt trước hướng +z, đáy y=0. */
function fireplace(): THREE.Group {
  const g = new THREE.Group();
  const stone = texMat(brickTex(0xf1c9a5, 0xd9a47a, [1.5, 1.5], 6), { rough: 0.9 });
  const W = 2.1, H = 1.7, D = 0.7;
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, D), stone);
    side.position.set(s * (W / 2 - 0.25), H / 2, 0);
    g.add(side);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.5, D), stone);
  top.position.set(0, H - 0.25, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, H - 0.5), mat(0x9c3b22, { rough: 1 }));
  back.position.set(0, (H - 0.5) / 2, -D / 2 + 0.02);
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.35, 0.12, D + 0.2), mat(0xc47a3f, { rough: 0.6 }));
  mantel.position.set(0, H + 0.06, 0.05);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 3, D * 0.8), stone);
  chimney.position.set(0, H + 1.6, -0.05);
  g.add(top, back, mantel, chimney);
  const logM = mat(0xb5652d, { rough: 0.8 });
  for (const [x, rz] of [[-0.15, 0.25], [0.15, -0.25]] as const) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), logM);
    log.rotation.set(0, 0, Math.PI / 2 + rz);
    log.position.set(x, 0.1, -0.05);
    g.add(log);
  }
  const flames: THREE.Mesh[] = [];
  for (const [x, h, c] of [[-0.18, 0.45, 0xff7b00], [0.18, 0.4, 0xff9500], [0, 0.6, 0xffc300], [0, 0.3, 0xfff08a]] as const) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, h, 10), glowMat(c));
    f.geometry.translate(0, h / 2, 0);   // gốc ở đáy ngọn lửa → co giãn từ dưới lên
    f.position.set(x, 0.14, 0);
    g.add(f);
    flames.push(f);
  }
  const halo = glow(0xff9f43, 1.6, 0.6);
  halo.position.set(0, 0.45, 0.2);
  g.add(halo);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), mat(0x4a5a8a, { rough: 0.4, side: THREE.DoubleSide }));
  pot.position.set(0, 0.95, 0);
  g.add(pot);
  g.userData.flames = flames;
  g.userData.halo = halo;
  shadows(g, true, true);
  return g;
}

/** Giếng ước bằng đá, mái đỏ, tay quay + xô xanh. Đáy y=0. */
function wishingWell(): THREE.Group {
  const g = new THREE.Group();
  const stone = texMat(brickTex(0xefe3d6, 0xc2ae98, [3, 1], 3), { rough: 0.9 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.8, 24, 1, true), stone);
  ring.position.y = 0.4;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.08, 8, 24), mat(0xe0d2c2, { rough: 0.8 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.8;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), mat(0x3aa8ff, { rough: 0.15 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.55;
  const wood = mat(0xc47a3f, { rough: 0.7 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), wood);
    post.position.set(s * 0.72, 1.35, 0);
    g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.7, 4), mat(0xe63946, { rough: 0.6 }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.35;
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), wood);
  axle.rotation.z = Math.PI / 2;
  axle.position.y = 1.7;
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.22, 12), mat(0x2563eb, { rough: 0.6 }));
  bucket.position.set(0.2, 1.2, 0);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), mat(0xf2d49b));
  rope.position.set(0.2, 1.5, 0);
  g.add(ring, rim, water, roof, axle, bucket, rope);
  shadows(g);
  return g;
}

/** Cây táo: thân + tán tròn + nhiều quả đỏ (InstancedMesh). Đáy y=0, cao ~h. */
function appleTree(h: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.05, h * 0.08, h * 0.5, 10), mat(0xa0622d, { rough: 0.85 }));
  trunk.position.y = h * 0.25;
  g.add(trunk);
  const leafM = mat(0x3fbf4f, { rough: 0.8, flat: true });
  const blobs: [number, number, number, number][] = [[0, 0.68, 0, 0.34], [-0.24, 0.58, 0.05, 0.26], [0.25, 0.6, -0.02, 0.27], [0.02, 0.85, -0.05, 0.25]];
  for (const [x, y, z, r] of blobs) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(h * r, 1), leafM);
    b.position.set(x * h, y * h, z * h);
    g.add(b);
  }
  const n = 16;
  const apples = new THREE.InstancedMesh(new THREE.SphereGeometry(h * 0.045, 10, 8), mat(0xe0202e, { rough: 0.3 }), n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const [bx, by, bz, br] = blobs[i % blobs.length];
    const th = i * 2.4, ph = 0.3 + (i % 5) * 0.22;
    d.position.set((bx + Math.cos(th) * Math.sin(ph + 0.6) * br * 0.95) * h, (by + Math.cos(ph + 0.6) * br * 0.7 - 0.02) * h, (bz + Math.abs(Math.sin(th)) * br * 0.9 + 0.04) * h);
    d.updateMatrix();
    apples.setMatrixAt(i, d.matrix);
  }
  g.add(apples);
  shadows(g);
  return g;
}

/** Bàn gỗ tròn thấp của chú lùn + bánh táo + bát táo. Đáy y=0. */
function dwarfTable(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0xd08a4a, { rough: 0.65 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 28), wood);
  top.position.y = 0.55;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.55, 12), wood);
  leg.position.y = 0.275;
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.01, 24), mat(0xfff8ee, { rough: 0.95 }));
  cloth.position.y = 0.6;
  const clothTrim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 32), mat(PAL.primary, { rough: 0.9 }));
  clothTrim.rotation.x = Math.PI / 2;
  clothTrim.position.y = 0.605;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.03, 20), mat(0x8fd3ff, { rough: 0.3 }));
  plate.position.set(-0.2, 0.62, 0.1);
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.08, 20), mat(0xf4b860, { rough: 0.7 }));
  pie.position.set(-0.2, 0.67, 0.1);
  const crust = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), mat(0xe39a3b, { rough: 0.7 }));
  crust.rotation.x = Math.PI / 2;
  crust.position.set(-0.2, 0.71, 0.1);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x2563eb, { rough: 0.4, side: THREE.DoubleSide }));
  bowl.position.set(0.28, 0.78, -0.12);
  g.add(top, leg, cloth, clothTrim, plate, pie, crust, bowl);
  for (const [x, y, z, c] of [[0.2, 0.8, -0.1, 0xe0202e], [0.36, 0.8, -0.05, 0xff3b30], [0.3, 0.8, -0.22, 0x7ccf3a], [0.27, 0.9, -0.12, 0xe0202e]] as const) {
    const a = apple(0.075, c);
    a.position.set(x, y, z);
    g.add(a);
  }
  shadows(g);
  return g;
}

/** Ghế đẩu nhỏ. */
function stool(color: number): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 16), mat(color, { rough: 0.7 }));
  seat.position.y = 0.34;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.32, 8), mat(0xd08a4a, { rough: 0.7 }));
  leg.position.y = 0.16;
  g.add(seat, leg);
  shadows(g);
  return g;
}

/** Xe goòng chở đá quý lấp lánh (các chú lùn đi mỏ về). userData.gems. Đáy y=0. */
function gemCart(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.55), mat(0xc47a3f, { rough: 0.6 }));
  body.position.y = 0.3;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.93, 0.06, 0.58), mat(0xffc233, { rough: 0.35 }));
  band.position.y = 0.44;
  g.add(body, band);
  const wheelM = mat(0x2563eb, { rough: 0.5 });
  for (const [x, z] of [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]] as const) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14), wheelM);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.12, z);
    g.add(w);
  }
  const gems: THREE.Mesh[] = [];
  const cols = [0xff2e7e, 0x00c2ff, 0x3ee07a, 0xb04bff, 0xffc300, 0xff5a36];
  for (let i = 0; i < 9; i++) {
    const c = cols[i % cols.length];
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + (i % 3) * 0.02), mat(c, { rough: 0.15, emissive: c, ei: 0.35, flat: true }));
    gem.position.set(-0.3 + (i % 3) * 0.3 + ((i * 7) % 3) * 0.03, 0.5 + Math.floor(i / 3) * 0.05, -0.15 + Math.floor(i / 3) * 0.15);
    gem.rotation.set(i, i * 2, 0);
    g.add(gem);
    gems.push(gem);
  }
  g.userData.gems = gems;
  shadows(g);
  return g;
}

/** Cuốc chim của chú lùn (treo tường). */
function pickaxe(): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.9, 8), mat(0xd08a4a, { rough: 0.7 }));
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 16, Math.PI * 0.7), mat(0x9fb4d8, { rough: 0.35 }));
  head.rotation.z = Math.PI * 0.15;
  head.position.y = 0.2;
  g.add(handle, head);
  return g;
}

/** Tranh bảy chú lùn (mũ nhọn bảy màu + râu trắng) trên đồi xanh. */
function drawDwarfs(c: CanvasRenderingContext2D, w: number, h: number): void {
  const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fd3ff'); gr.addColorStop(1, '#c8f7c5');
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
  c.fillStyle = '#5fcf6a'; c.beginPath(); c.ellipse(w / 2, h * 1.05, w * 0.8, h * 0.35, 0, 0, Math.PI * 2); c.fill();
  DWARF.forEach((col, i) => {
    const x = w * (0.1 + i * 0.133), y = h * (0.66 - (i % 2) * 0.06);
    c.fillStyle = hexCss(col);
    c.beginPath(); c.moveTo(x - 14, y); c.quadraticCurveTo(x - 4, y - 40, x + 10, y - 48); c.lineTo(x + 14, y); c.fill();
    c.fillStyle = '#fff4dc'; c.beginPath(); c.ellipse(x, y + 16, 12, 14, 0, 0, Math.PI * 2); c.fill();   // râu
    c.fillStyle = '#ffc9a8'; c.beginPath(); c.arc(x, y + 5, 9, 0, Math.PI * 2); c.fill();                // mặt
    c.fillStyle = '#ff8f8f'; c.beginPath(); c.arc(x, y + 8, 3, 0, Math.PI * 2); c.fill();                 // mũi
  });
  c.fillStyle = '#ffd23f';
  c.beginPath(); c.arc(w * 0.86, h * 0.2, 14, 0, Math.PI * 2); c.fill();
}

interface Flyer { obj: THREE.Object3D; r: number; y: number; speed: number; phase: number; cx: number; cz: number; squash: number; order: number; inside: boolean }
interface Bloom { petals: THREE.InstancedMesh; leaves: THREE.InstancedMesh; base: THREE.Vector3[] }

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;

  // ---------------------------------------------- ngoài cửa sổ: trời xanh, nắng, đồi, cây táo, giếng ước, rừng
  const sky = skyDome(0x3ea8ff, 0xd9f6ff, 70);
  sky.position.set(0, -12, -10);
  root.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), glowMat(0xffe27a));
  sun.position.set(-4, 9, -40);
  const sunGlow = glow(0xfff0a8, 9, 0.6);
  sunGlow.position.copy(sun.position);
  root.add(sun, sunGlow);
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), mat(0x6fd66a, { rough: 1 }));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(0, -0.02, -40);
  meadow.receiveShadow = true;
  root.add(meadow);
  for (const [x, z, r, c] of [[-14, -38, 14, 0x55c25c], [10, -42, 16, 0x4bb35a], [0, -52, 20, 0x62cf6d]] as const) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(c, { rough: 1 }));
    hill.scale.y = 0.38;
    hill.position.set(x, -0.5, z);
    root.add(hill);
  }
  const clouds: THREE.Object3D[] = [];
  const cloudM = glowMat(0xf7fbff);
  const puffGeo = new THREE.SphereGeometry(1, 12, 8);
  for (const [x, y, z, s] of [[-4, 7.5, -30, 1.4], [5, 8.6, -34, 1.8], [-13, 6.8, -26, 1.3]] as const) {
    const cl = new THREE.Group();
    for (const [dx, dy, r] of [[0, 0, 1], [1.1, -0.2, 0.75], [-1.1, -0.25, 0.7], [0.4, 0.5, 0.7]] as const) {
      const p = new THREE.Mesh(puffGeo, cloudM);
      p.scale.setScalar(r);
      p.position.set(dx, dy, 0);
      cl.add(p);
    }
    cl.position.set(x, y, z);
    cl.scale.setScalar(s);
    root.add(cl);
    clouds.push(cl);
  }
  ctx.state.clouds = clouds;

  const tree = appleTree(3.8);
  tree.position.set(2.1, 0, -12.5);
  root.add(tree);
  const tree2 = appleTree(3.0);
  tree2.position.set(-3.6, 0, -17.5);
  root.add(tree2);
  const well = wishingWell();
  well.position.set(-1.7, 0, -13.5);
  well.rotation.y = 0.3;
  well.scale.setScalar(1.15);
  root.add(well);
  for (const [x, z, c] of [[-0.5, -14.5, '#e63946'], [0.4, -13.4, '#ff5fa2'], [3.6, -13.8, '#e63946']] as const) {
    const m = toadstool(0.8, c);
    m.position.set(x, 0, z);
    root.add(m);
  }
  const forest: [string, number, number, number][] = [
    ['tree_default.glb', -5, -19, 5.5], ['tree_fat.glb', -0.8, -21, 4.2], ['tree_default.glb', 4.8, -19, 6], ['tree_fat.glb', 7.5, -16, 4.5],
    ['tree_default.glb', 1.6, -25, 6.5], ['tree_default.glb', -8.5, -23, 6.5],
  ];
  await Promise.all(forest.map(async ([name, x, z, h]) => {
    try {
      const t = await ctx.model(name, { height: h });
      t.position.set(x, 0, z);
      t.rotation.y = x * 0.7;
      root.add(t);
    } catch (e) { console.warn('snowwhite tree', e); }
  }));
  // nai trong rừng: ló ra khi công chúa tỉnh
  const deer = ctx.emoji('🦌', 1.4);
  deer.position.set(-3.0, 0.75, -16.5);
  root.add(deer);
  ctx.state.deer = deer;

  // ---------------------------------------------- tường nhà: vữa vàng kem + khung gỗ + chân tường đá
  const backWall = wallWithArch(SIDE_X * 2 + 0.4, ROOM_H, 3.5, 3.5, 0.9, texMat(plasterTex([1, 1]), { rough: 0.95 }), 3);
  backWall.position.set(0, 0, BACK_Z);
  root.add(backWall);
  const plaster = texMat(plasterTex([3, 2]), { rough: 0.95 });
  for (const s of [-1, 1]) {
    const side = wall(9.5, ROOM_H, plaster);
    side.position.set(s * SIDE_X, ROOM_H / 2, BACK_Z + 4.75);
    side.rotation.y = -s * Math.PI / 2;
    root.add(side);
  }
  const timber = mat(0xc47a3f, { rough: 0.7 });
  const beamV = new THREE.BoxGeometry(0.22, ROOM_H, 0.16);
  for (const x of [-5.6, -3.1, 3.1, 5.9]) {
    const b = new THREE.Mesh(beamV, timber);
    b.position.set(x, ROOM_H / 2, BACK_Z + 0.08);
    root.add(b);
  }
  const beamH = new THREE.Mesh(new THREE.BoxGeometry(SIDE_X * 2, 0.24, 0.18), timber);
  beamH.position.set(0, 4.95, BACK_Z + 0.1);
  root.add(beamH);
  for (const s of [-1, 1]) {
    for (const z of [-3.9, -0.9]) {
      const b = new THREE.Mesh(beamV, timber);
      b.position.set(s * (SIDE_X - 0.08), ROOM_H / 2, z);
      b.rotation.y = Math.PI / 2;
      root.add(b);
    }
    const bh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 9.5), timber);
    bh.position.set(s * (SIDE_X - 0.1), 4.95, BACK_Z + 4.75);
    root.add(bh);
  }
  for (const z of [-4.2, -2.2, -0.2, 1.8]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(SIDE_X * 2, 0.3, 0.26), timber);
    b.position.set(0, 5.4, z);
    root.add(b);
  }
  const stoneTex = brickTex(0xf5d7b8, 0xdcae83, [6, 1], 3);
  const stoneBack = new THREE.Mesh(new THREE.BoxGeometry(SIDE_X * 2, 0.7, 0.2), texMat(stoneTex, { rough: 0.9 }));
  stoneBack.position.set(0, 0.35, BACK_Z + 0.1);
  root.add(stoneBack);
  const stoneSideM = texMat(brickTex(0xf5d7b8, 0xdcae83, [4, 1], 3), { rough: 0.9 });
  for (const s of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 9.5), stoneSideM);
    st.position.set(s * (SIDE_X - 0.1), 0.35, BACK_Z + 4.75);
    root.add(st);
  }

  // ---------------------------------------------- cửa sổ vòm lớn: khung gỗ, cửa chớp xanh hình tim, bồn hoa, chim + táo trên bậu
  const frame = archFrame(3.5, 3.5, 0xc47a3f, 0.22, 0.3);
  frame.position.set(0, 0.9, BACK_Z - 0.05);
  root.add(frame);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.14, 0.6), mat(0xd08a4a, { rough: 0.6 }));
  sill.position.set(0, 0.86, BACK_Z + 0.2);
  sill.castShadow = true; sill.receiveShadow = true;
  root.add(sill);
  const heartTex = canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#2f80ed'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#1d5fc4'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.strokeRect(10, h / 2, w - 20, h / 2 - 10);
    c.fillStyle = '#ff4d6d';
    const x = w / 2, y = h * 0.26, s = 20;
    c.beginPath(); c.moveTo(x, y + s * 1.2);
    c.bezierCurveTo(x - s * 2, y, x - s, y - s * 1.3, x, y - s * 0.4);
    c.bezierCurveTo(x + s, y - s * 1.3, x + s * 2, y, x, y + s * 1.2); c.fill();
  });
  const shutterM = texMat(heartTex, { rough: 0.7 });
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.06), shutterM);
    sh.position.set(s * 2.5, 2.15, BACK_Z + 0.35);
    sh.rotation.y = s * 0.35;
    sh.castShadow = true;
    root.add(sh);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, 0.34), mat(0xe63946, { rough: 0.7 }));
  box.position.set(0, 1.06, BACK_Z + 0.3);
  root.add(box);
  const bloomN = 12;
  const petals = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), mat(0xffffff, { rough: 0.6, flat: true }), bloomN);
  const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0x3fbf4f, { rough: 0.8 }), bloomN);
  const bloomCols = [0xff4d6d, 0xffd23f, 0xff8fab, 0x8e44ec, 0xff8c1a, 0x4cc3ff];
  const bloomBase: THREE.Vector3[] = [];
  for (let i = 0; i < bloomN; i++) {
    bloomBase.push(new THREE.Vector3(-1.05 + i * 0.19, 1.28 + (i % 3) * 0.05, BACK_Z + 0.3 + ((i % 2) - 0.5) * 0.1));
    petals.setColorAt(i, new THREE.Color(bloomCols[i % bloomCols.length]));
  }
  root.add(petals, leaves);
  ctx.state.bloom = { petals, leaves, base: bloomBase } satisfies Bloom;
  for (const [x, c] of [[-1.55, 0xe0202e], [1.6, 0xff3b30], [1.42, 0x7ccf3a]] as const) {
    const a = apple(0.1, c, true);
    a.position.set(x, 1.02, BACK_Z + 0.35);
    root.add(a);
  }
  const sillBirds: THREE.Object3D[] = [];
  for (const [x, ry, c] of [[-1.3, 0.5, 0x2f9bff], [1.2, -0.6, 0x4cc3ff]] as const) {
    const b = bird(c);
    b.position.set(x, 1.03, BACK_Z + 0.25);
    b.rotation.y = ry;
    b.scale.setScalar(1.3);
    root.add(b);
    sillBirds.push(b);
  }
  ctx.state.sillBirds = sillBirds;
  const flags = bunting(new THREE.Vector3(-3.8, 4.65, BACK_Z + 0.4), new THREE.Vector3(3.8, 4.65, BACK_Z + 0.4), DWARF, 0.4, 11);
  root.add(flags);
  ctx.state.flags = flags;

  // ---------------------------------------------- sàn gỗ + thảm đỏ viền vàng + thảm xanh + hoạ tiết chấm vàng
  const fl = floor(SIDE_X * 2, 12, texMat(plankTex(0xf0b27a, [5, 4]), { rough: 0.8 }));
  fl.position.z = BACK_Z + 6;
  root.add(fl);
  const carpet = rug(3.4, 2.3, 0xe63946, 0xffd166);
  carpet.position.set(0, 0, 0.6);
  root.add(carpet);
  const carpet2 = rug(1.6, 1.15, 0x2563eb, 0xfff1b8);
  carpet2.position.set(0, 0.008, 0.6);
  root.add(carpet2);
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.11, 16), mat(0xffd166, { rough: 1 }), 16);
  const d = new THREE.Object3D();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    d.position.set(Math.cos(a) * 2.55, 0.02, 0.6 + Math.sin(a) * 1.72);
    d.rotation.set(-Math.PI / 2, 0, 0);
    d.updateMatrix();
    dots.setMatrixAt(i, d.matrix);
  }
  dots.receiveShadow = true;
  root.add(dots);

  // ---------------------------------------------- góc phải: 7 chiếc giường nhỏ (4 dọc tường sau, 3 dọc tường phải)
  const signs = ['⭐', '🌸', '💎', '🍄', '🌙', '🍎', '💖'];
  for (let i = 0; i < 4; i++) {
    const b = littleBed(DWARF[i], signs[i]);
    b.position.set(2.75 + i * 0.98, 0, BACK_Z + 0.85);
    root.add(b);
  }
  for (let i = 0; i < 3; i++) {
    const b = littleBed(DWARF[4 + i], signs[4 + i]);
    b.position.set(SIDE_X - 0.8, 0, -3.35 + i * 1.0);
    b.rotation.y = -Math.PI / 2;
    root.add(b);
  }
  const sh = shelf(2.4, 0xc47a3f);
  sh.position.set(SIDE_X - 0.2, 1.95, -2.35);
  sh.rotation.y = -Math.PI / 2;
  root.add(sh);
  for (let i = 0; i < 7; i++) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 12), mat(DWARF[i], { rough: 0.5 }));
    mug.position.set(SIDE_X - 0.25, 2.03, -3.3 + i * 0.3);
    mug.castShadow = true;
    root.add(mug);
  }
  // đèn bánh xe gỗ treo trên giường (5 nến)
  const wheel = new THREE.Group();
  const rimW = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 28), timber);
  rimW.rotation.x = Math.PI / 2;
  wheel.add(rimW);
  const candles: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const c = candle(0.18, 0xfff1dc);
    c.position.set(Math.cos(a) * 0.6, 0.03, Math.sin(a) * 0.6);
    wheel.add(c);
    candles.push(c);
  }
  wheel.position.set(4.3, 3.3, -3.2);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.1, 4), mat(0x8a5a33));
  chain.position.set(4.3, 4.35, -3.2);
  root.add(wheel, chain);
  ctx.state.wheel = wheel;
  const cart = gemCart();
  cart.position.set(4.3, 0, 0.9);
  cart.rotation.y = -0.5;
  root.add(cart);
  ctx.state.gems = cart.userData.gems;
  for (const [z, rz] of [[-0.55, 0.5], [-0.05, -0.5]] as const) {
    const p = pickaxe();
    p.position.set(SIDE_X - 0.12, 2.9, z);
    p.rotation.set(0, -Math.PI / 2, rz);
    root.add(p);
  }
  // thỏ trắng cạnh xe goòng: ló ra khi băng tan 1 nấc
  const bunny = ctx.emoji('🐇', 0.75);
  bunny.position.set(3.5, 0.37, 1.9);
  root.add(bunny);
  ctx.state.bunny = bunny;

  // ---------------------------------------------- góc trái: lò sưởi, bàn ăn + ghế đẩu, kệ + giỏ táo, tranh bảy chú lùn
  const fire = fireplace();
  fire.position.set(-4.35, 0, BACK_Z + 0.45);
  root.add(fire);
  ctx.state.fire = fire;
  for (const [x, c] of [[-5.0, 0xe0202e], [-3.7, 0x7ccf3a]] as const) {
    const a = apple(0.1, c, true);
    a.position.set(x, 1.9, BACK_Z + 0.5);
    root.add(a);
  }
  for (const x of [-4.6, -4.1]) {
    const c = candle(0.22, 0xfff1dc);
    c.position.set(x, 1.82, BACK_Z + 0.5);
    root.add(c);
    candles.push(c);
  }
  const fireLight = new THREE.PointLight(0xff8a3d, 6, 7, 1.6);
  fireLight.position.set(-4.35, 1.1, BACK_Z + 1.4);
  root.add(fireLight);
  ctx.state.fireLight = fireLight;

  const table = dwarfTable();
  table.position.set(-4.6, 0, -2.2);
  root.add(table);
  for (const [x, z, c] of [[-5.5, -1.6, DWARF[0]], [-3.8, -1.5, DWARF[3]], [-4.7, -3.1, DWARF[5]]] as const) {
    const s = stool(c);
    s.position.set(x, 0, z);
    root.add(s);
  }
  const art = painting(2.1, 1.2, drawDwarfs, 0xffffff, 0xe8b04a);
  art.position.set(-SIDE_X + 0.06, 2.95, -2.4);
  art.rotation.y = Math.PI / 2;
  root.add(art);
  const sh2 = shelf(1.8, 0xc47a3f);
  sh2.position.set(-SIDE_X + 0.2, 1.7, -0.2);
  sh2.rotation.y = Math.PI / 2;
  root.add(sh2);
  const wicker = mat(0xe8a65d, { rough: 0.9, side: THREE.DoubleSide });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.2, 14, 1, true), wicker);
  basket.position.set(-SIDE_X + 0.3, 1.8, -0.55);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 16, Math.PI), wicker);
  handle.position.set(-SIDE_X + 0.3, 1.9, -0.55);
  handle.rotation.y = Math.PI / 2;
  root.add(basket, handle);
  for (let i = 0; i < 4; i++) {
    const a = apple(0.085, i === 2 ? 0x7ccf3a : 0xe0202e);
    a.position.set(-SIDE_X + 0.25 + (i % 2) * 0.12, 1.9, -0.65 + i * 0.07);
    root.add(a);
  }
  // sóc trên kệ: ló ra khi băng tan 2 nấc
  const squirrel = ctx.emoji('🐿️', 0.5);
  squirrel.position.set(-SIDE_X + 0.35, 1.97, 0.25);
  root.add(squirrel);
  ctx.state.squirrel = squirrel;

  // ---------------------------------------------- nấm đỏ chấm trắng quanh phòng (thấp, không che nhân vật)
  for (const [x, z, h, c] of [[-3.6, 2.2, 0.48, '#e63946'], [-4.2, 1.6, 0.34, '#ff8c1a'], [3.4, 2.7, 0.45, '#e63946'], [-5.9, -4.4, 0.5, '#ff5fa2'], [5.9, 2.2, 0.48, '#e63946']] as const) {
    const m = toadstool(h, c);
    m.position.set(x, 0, z);
    root.add(m);
  }

  // ---------------------------------------------- chim bay: ngoài cửa sổ (nhiều dần theo băng tan) + trong nhà (khi tỉnh)
  const flyers: Flyer[] = [];
  const flyCols = [0x2f9bff, 0x4cc3ff, 0xff4d6d, 0xffd23f, 0x2f9bff, 0xff5fa2];
  for (let i = 0; i < 6; i++) {
    const inside = i >= 4;
    const b = bird(flyCols[i], !inside);
    b.scale.setScalar(inside ? 1.5 : 2.2);
    b.visible = false;
    root.add(b);
    flyers.push(inside
      ? { obj: b, r: 2.6 + (i - 4) * 0.5, y: 3.0 + (i - 4) * 0.35, speed: 0.8 + (i - 4) * 0.25, phase: i * 2, cx: 0.2, cz: -1.2, squash: 0.45, order: 1, inside }
      : { obj: b, r: 2.0 + i * 0.6, y: 2.6 + i * 0.4, speed: 0.35 + i * 0.07, phase: i * 1.7, cx: 0.4, cz: -12, squash: 0.5, order: i / 4, inside });
  }
  ctx.state.flyers = flyers;

  const sunBeam = glow(0xfff0b8, 6.5, 0.3);
  sunBeam.position.set(0, 2.6, BACK_Z + 0.2);
  root.add(sunBeam);
  ctx.state.sunBeam = sunBeam;
  ctx.state.candles = candles;
}

// tái dùng mỗi frame (ambient không tạo object mới)
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const sparkAt = new THREE.Vector3();

function fadeSprite(s: THREE.Sprite | undefined, o: number): void {
  if (!s) return;
  s.material.opacity = o;
  s.visible = o > 0.01;
}

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time;
  const melt = ctx.melt;
  const st = ctx.state;

  // lửa lò sưởi: ấm dần khi tan băng
  const fire = st.fire as THREE.Object3D | undefined;
  if (fire) {
    const k = 0.55 + 0.45 * melt;
    (fire.userData.flames as THREE.Mesh[]).forEach((f, i) => {
      f.scale.set(k * (1 + Math.sin(t * 11 + i) * 0.1), k * (1 + Math.sin(t * 17 + i * 2) * 0.18), k);
    });
    (fire.userData.halo as THREE.Sprite).material.opacity = 0.35 + 0.35 * melt + Math.sin(t * 9) * 0.05;
  }
  const fl = st.fireLight as THREE.PointLight | undefined;
  if (fl) fl.intensity = (3 + 5 * melt) * (1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05);
  (st.candles as THREE.Object3D[] | undefined)?.forEach((c, i) => flicker(c, t, i * 1.3));
  const wheel = st.wheel as THREE.Object3D | undefined;
  if (wheel) { wheel.rotation.z = Math.sin(t * 0.7) * 0.04; wheel.rotation.x = Math.sin(t * 0.5) * 0.03; }

  // hoa bồn cửa sổ nở theo băng tan
  const bloom = st.bloom as Bloom | undefined;
  if (bloom) {
    bloom.base.forEach((p, i) => {
      const open = THREE.MathUtils.clamp(melt * 1.6 - (i % 4) * 0.15, 0, 1);
      tmpQ.setFromAxisAngle(UP, t * 0.3 + i);
      tmpP.set(p.x, p.y + Math.sin(t * 2 + i) * 0.015 + open * 0.08, p.z);
      bloom.petals.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS.setScalar(0.35 + 0.95 * open)));
      tmpP.set(p.x, p.y - 0.06, p.z);
      bloom.leaves.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS.set(1.2, 0.6, 1.2)));
    });
    bloom.petals.instanceMatrix.needsUpdate = true;
    bloom.leaves.instanceMatrix.needsUpdate = true;
  }

  // chim trên bậu cửa: nhảy nhót, ngó nghiêng (đông cứng thì gần như đứng im)
  (st.sillBirds as THREE.Object3D[] | undefined)?.forEach((b, i) => {
    if (b.userData.baseY === undefined) b.userData.baseY = b.position.y;
    const hop = Math.max(0, Math.sin(t * (3 + i) + i * 2));
    b.position.y = (b.userData.baseY as number) + hop * hop * 0.08 * (0.2 + melt);
    (b.userData.head as THREE.Object3D).rotation.y = Math.sin(t * 1.3 + i * 3) * 0.6 * (0.3 + 0.7 * melt);
    flap(b, t, 20, hop > 0.7 && melt > 0.2 ? 0.8 : 0.05);
  });

  // chim bay vòng: ngoài cửa sổ nhiều dần theo băng tan; trong nhà khi đã tỉnh
  (st.flyers as Flyer[] | undefined)?.forEach((f) => {
    const vis = f.inside ? ctx.awake : f.order <= 0.2 + melt * 0.85;
    f.obj.visible = vis;
    if (!vis) return;
    const a = t * f.speed + f.phase;
    f.obj.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(a * 2.3) * 0.3, f.cz + Math.sin(a) * f.r * f.squash);
    f.obj.rotation.y = -a;   // bay theo tiếp tuyến vòng
    f.obj.rotation.z = -0.25;
    flap(f.obj, t + f.phase, 16, 0.9);
  });

  // thú rừng ló ra dần
  const bunny = st.bunny as THREE.Sprite | undefined;
  fadeSprite(bunny, THREE.MathUtils.clamp((melt - 0.2) * 3, 0, 1));
  if (bunny?.visible) bunny.position.y = 0.37 + Math.max(0, Math.sin(t * 2.6)) * 0.12;
  const squirrel = st.squirrel as THREE.Sprite | undefined;
  fadeSprite(squirrel, THREE.MathUtils.clamp((melt - 0.55) * 3, 0, 1));
  if (squirrel) squirrel.material.rotation = Math.sin(t * 3) * 0.1;
  const deer = st.deer as THREE.Sprite | undefined;
  fadeSprite(deer, ctx.awake ? 1 : THREE.MathUtils.clamp((melt - 0.9) * 10, 0, 1));
  if (deer) deer.position.x = -3.0 + Math.sin(t * 0.2) * 0.5;

  // đá quý xoay + lấp lánh
  (st.gems as THREE.Mesh[] | undefined)?.forEach((g, i) => { g.rotation.y = t * 0.8 + i; });
  if (Math.random() < 0.04 + 0.1 * melt) {
    sparkAt.set(4.3 + (Math.random() - 0.5) * 0.7, 0.65, 0.9 + (Math.random() - 0.5) * 0.4);
    ctx.magic.twinkle(sparkAt, Math.random() < 0.5 ? 0xd6187a : 0x0a84ff, 1, 0.2, 0.3);
  }

  // mây trôi, cờ đung đưa, nắng rọi
  (st.clouds as THREE.Object3D[] | undefined)?.forEach((c, i) => {
    c.position.x += dt * (0.15 + i * 0.04);
    if (c.position.x > 22) c.position.x = -22;
  });
  const flags = st.flags as THREE.Object3D | undefined;
  flags?.children.forEach((f, i) => { f.rotation.x = Math.sin(t * 2 + i * 0.7) * 0.18; });
  const beam = st.sunBeam as THREE.Sprite | undefined;
  if (beam) beam.material.opacity = 0.18 + 0.2 * melt + Math.sin(t * 1.2) * 0.03;

  // đã tỉnh: tim đỏ + sao vàng lấp lánh quanh phòng
  if (ctx.awake && Math.random() < 0.22) {
    sparkAt.set((Math.random() - 0.5) * 9, 0.6 + Math.random() * 3.4, -2.5 + Math.random() * 3);
    ctx.magic.twinkle(sparkAt, Math.random() < 0.55 ? 0xd62839 : 0xf0a500, 1, 0.3, 0.34);
  }
}

const room: RoomDef = {
  id: 'snowwhite',
  name: 'Nhà nhỏ của Bạch Tuyết',
  emoji: '🍎',
  princessModel: 'p_snowwhite.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'táo', emoji: '🍎', name: 'quả táo', fill: { index: 0, distractors: ['m', 'p'] } },
    { word: 'chim', emoji: '🐦', name: 'con chim' },
    { word: 'nấm', emoji: '🍄', name: 'cây nấm', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'thỏ', emoji: '🐇', name: 'con thỏ' },
    { word: 'sóc', emoji: '🐿️', name: 'con sóc', fill: { index: 0, distractors: ['p', 'đ'] } },
    { word: 'nai', emoji: '🦌', name: 'con nai', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'giỏ', emoji: '🧺', name: 'cái giỏ' },
  ],
  challenges: ['spell', 'fill', 'math'],
  magicColors: [0xd62839, 0x1d4ed8],
  audio: { name: 'snowwhite_name', intro: 'snowwhite_intro', thanks: 'snowwhite_thanks' },
};

export default room;

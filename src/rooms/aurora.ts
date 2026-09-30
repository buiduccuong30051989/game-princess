// PHÒNG AURORA: ngôi nhà gỗ nhỏ trong rừng (nhà của "Briar Rose" và 3 bà tiên).
// Tường vữa hồng hoa nhí có khung gỗ mật ong, cửa vòm lớn khoét thủng nhìn ra khoảng rừng nắng + lâu đài hồng mái xanh
// trên đồi, hoa hồng leo quanh cửa (nở dần khi tan băng), bậu cửa có đệm + 2 chú chim xanh, guồng quay tơ, cú đậu trên kệ,
// bàn có bánh sinh nhật lệch tầng + bát dâu + vương miện, ma-nơ-canh mặc váy đổi màu hồng ↔ xanh (Flora vs Merryweather),
// 3 bà tiên tí hon bay vòng quanh phòng (băng càng tan càng nhiều tiên), bướm (bài đếm), thỏ + sóc ngoài cửa.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, mix, plankTex, tileTex, skyDome, floor, wall, wallWithArch, archFrame, archWindow,
  rug, shelf, books, painting, candle, flicker, fairyLights, bunting, flowerPot, glow, bob, shadows,
} from '../room/kit.ts';

const PAL = { primary: 0xec4899, secondary: 0x3b82f6, accent: 0xfacc15, light: 0xfff0f7, dark: 0x831843 };
const PINK = 0xf472b6;
const BLUE = 0x60a5fa;
const GOLD = 0xfacc15;
const WOOD = 0xc98a4b;
const WOOD_LIGHT = 0xe7a960;

const BACK_Z = -5.6;        // tường sau
const SIDE_X = 5.8;         // tường bên (khung hình iPad 4:3 chỉ thấy |x| ≲ 5 ở sâu trong phòng)
const WALL_H = 5.6;
const ARCH_W = 3.8, ARCH_H = 3.4, ARCH_Y = 0.75;

// ---------------------------------------------------------------- texture

/** Vữa hồng nhạt có hoa nhí xanh/hồng in rải rác (kiểu nhà tranh cổ tích). 1 ô = 256 px. */
function plasterTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fde2ee'; g.fillRect(0, 0, w, h);
    // loang vữa nhẹ
    for (let i = 0; i < 70; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(244,164,200,0.12)';
      g.beginPath(); g.arc((i * 97) % w, (i * 61) % h, 8 + (i % 5) * 5, 0, Math.PI * 2); g.fill();
    }
    // hoa nhí 5 cánh
    const flower = (x: number, y: number, c: string) => {
      g.fillStyle = c;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath(); g.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffd84d'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
    };
    flower(40, 50, '#f78fbf'); flower(170, 30, '#7fb2ff'); flower(110, 140, '#f78fbf');
    flower(220, 170, '#7fb2ff'); flower(50, 215, '#7fb2ff'); flower(190, 235, '#f78fbf');
    g.fillStyle = '#79c86b';
    for (const [x, y] of [[52, 60], [182, 40], [122, 150], [232, 180], [62, 225], [202, 245]] as const) {
      g.beginPath(); g.ellipse(x, y, 5, 2.5, 0.6, 0, Math.PI * 2); g.fill();
    }
  }, repeat);
}

/** Cảnh rừng vẽ lên kính cửa sổ tường bên. */
function forestView(): THREE.CanvasTexture {
  return canvasTex(256, 384, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6fc3ff'); gr.addColorStop(0.6, '#ffd9ec'); gr.addColorStop(1, '#ffe9c2');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6d5'; g.beginPath(); g.arc(w * 0.72, h * 0.2, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8fd86a'; g.beginPath(); g.ellipse(w * 0.3, h * 0.85, w * 0.8, h * 0.22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5fbf55'; g.beginPath(); g.ellipse(w * 0.9, h * 0.95, w * 0.7, h * 0.22, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 6; i++) {
      const x = 20 + i * 45, y = h * 0.62 + (i % 2) * 30;
      g.fillStyle = '#a86a3d'; g.fillRect(x - 4, y, 8, 40);
      g.fillStyle = i % 2 ? '#3fae52' : '#4cc36a';
      g.beginPath(); g.moveTo(x, y - 70); g.lineTo(x + 26, y + 6); g.lineTo(x - 26, y + 6); g.fill();
    }
    g.fillStyle = '#ff8fc4';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 53) % w, h - 20 - (i * 17) % 50, 5, 0, Math.PI * 2); g.fill(); }
  });
}

// ---------------------------------------------------------------- đồ vật

/** Guồng quay tơ bằng gỗ. userData.wheel = bánh xe (quay quanh trục x). Đáy y=0. */
function spinningWheel(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(WOOD, { rough: 0.6 });
  const dark = mat(0xa8683a, { rough: 0.6 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 1.1), wood);
  bench.position.set(0, 0.45, 0);
  bench.rotation.x = 0.18;
  g.add(bench);
  for (const [z, x] of [[-0.45, 0], [0.4, -0.12], [0.4, 0.12]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.5, 8), dark);
    leg.position.set(x, 0.23 + (z < 0 ? 0.06 : 0), z);
    g.add(leg);
  }
  for (const x of [-0.08, 0.08]) {
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 8), dark);
    up.position.set(x, 0.78, -0.25);
    g.add(up);
  }
  const wheel = new THREE.Group();
  wheel.position.set(0, 1.0, -0.25);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 40), wood);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.84, 6), dark);
    sp.rotation.x = (i / 8) * Math.PI;
    wheel.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), mat(0xf6c453, { rough: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  g.add(wheel);
  // cọc cuộn len hồng + sợi len
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), dark);
  post.position.set(0, 0.72, 0.42);
  g.add(post);
  const wool = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 14), mat(0xf9a8d4, { rough: 1 }));
  wool.position.set(0, 1.08, 0.42);
  wool.rotation.x = Math.PI;
  g.add(wool);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.72, 4), mat(PINK));
  thread.position.set(0, 1.03, 0.08);
  thread.rotation.x = Math.PI / 2 - 0.1;
  g.add(thread);
  shadows(g);
  g.userData.wheel = wheel;
  return g;
}

/** Giỏ len: rổ + mấy cuộn len hồng/xanh/vàng. */
function yarnBasket(): THREE.Group {
  const g = new THREE.Group();
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.22, 16, 1, true), mat(0xe0a45e, { rough: 0.9, side: THREE.DoubleSide }));
  basket.position.y = 0.11;
  g.add(basket);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat(WOOD));
  bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.01;
  g.add(bottom);
  for (const [x, z, y, c] of [[-0.1, 0, 0.2, PINK], [0.1, 0.05, 0.2, BLUE], [0, -0.1, 0.27, GOLD], [0.35, 0.2, 0.08, PINK]] as const) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mat(c, { rough: 1 }));
    b.position.set(x, y, z);
    g.add(b);
  }
  shadows(g);
  return g;
}

/** Cú (bạn trong rừng của Aurora). Chân ở y=0, mặt hướng +z. userData.head / eyes để chớp mắt, quay đầu. */
function owl(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xe0a060, { rough: 0.9 });
  const wing = mat(0xc07d40, { rough: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), fur);
  body.scale.set(1, 1.25, 0.9);
  body.position.y = 0.2;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat(0xfff1d6, { rough: 1 }));
  belly.scale.set(1, 1.2, 0.6);
  belly.position.set(0, 0.18, 0.08);
  g.add(belly);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), wing);
    w.scale.set(0.45, 1.3, 0.9);
    w.position.set(s * 0.15, 0.2, -0.01);
    g.add(w);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0xf59e0b));
    foot.scale.set(1, 0.5, 1.4);
    foot.position.set(s * 0.06, 0.015, 0.06);
    g.add(foot);
  }
  const head = new THREE.Group();
  head.position.y = 0.42;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), fur);
  skull.scale.set(1.1, 0.95, 0.95);
  head.add(skull);
  const eyes: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), wing);
    tuft.position.set(s * 0.1, 0.12, 0);
    tuft.rotation.z = -s * 0.4;
    head.add(tuft);
    const eye = new THREE.Group();
    eye.position.set(s * 0.058, 0.01, 0.125);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.052, 20), mat(0xffe29a));
    const white = new THREE.Mesh(new THREE.CircleGeometry(0.042, 20), mat(0xffffff));
    white.position.z = 0.003;
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), mat(0x2b1b3a));
    pupil.position.z = 0.006;
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.008, 8), glowMat(0xffffff));
    shine.position.set(0.01, 0.01, 0.009);
    eye.add(ring, white, pupil, shine);
    head.add(eye);
    eyes.push(eye);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 8), mat(0xf59e0b));
  beak.position.set(0, -0.045, 0.13);
  beak.rotation.x = Math.PI + 0.3;
  head.add(beak);
  g.add(head);
  shadows(g);
  g.userData.head = head;
  g.userData.eyes = eyes;
  return g;
}

/** Chim xanh nhỏ. Chân ở y=0, mỏ hướng +z. userData.wings để vỗ cánh. */
function bluebird(color: number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), m);
  body.scale.set(0.9, 0.85, 1.3);
  body.position.y = 0.07;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(0xffc9a3, { rough: 0.8 }));
  belly.position.set(0, 0.055, 0.03);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), m);
  head.position.set(0, 0.14, 0.06);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.045, 6), mat(0xfbbf24));
  beak.position.set(0, 0.135, 0.12);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), mat(0x1e1b3a));
    e.position.set(s * 0.03, 0.155, 0.1);
    g.add(e);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.09), m);
  tail.position.set(0, 0.09, -0.11);
  tail.rotation.x = -0.4;
  g.add(tail);
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.055, 0.09, 0);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), mat(mix(color, 0x000000, 0.15)));
    w.scale.set(0.25, 0.6, 1.2);
    w.position.set(s * 0.01, 0, -0.01);
    pivot.add(w);
    g.add(pivot);
    wings.push(pivot);
  }
  shadows(g);
  g.userData.wings = wings;
  return g;
}

/** Thỏ trắng hồng. Chân ở y=0, mặt hướng +z. */
function bunny(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xfff0f5, { rough: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), fur);
  body.scale.set(1, 0.9, 1.2);
  body.position.y = 0.14;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), fur);
  head.position.set(0, 0.3, 0.13);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 4, 8), fur);
    ear.position.set(s * 0.05, 0.47, 0.1);
    ear.rotation.z = -s * 0.2;
    g.add(ear);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.12, 4, 6), mat(0xf9a8d4));
    inner.position.set(s * 0.05, 0.47, 0.125);
    inner.rotation.z = -s * 0.2;
    g.add(inner);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), mat(0x2b1b3a));
    e.position.set(s * 0.045, 0.33, 0.225);
    g.add(e);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), mat(PINK));
  nose.position.set(0, 0.29, 0.24);
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), fur);
  tail.position.set(0, 0.16, -0.19);
  g.add(tail);
  shadows(g);
  return g;
}

/** Sóc cam đuôi xù cuộn, ôm hạt dẻ. Chân ở y=0, mặt hướng +z. userData.tail để vẫy. */
function squirrel(): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xf08a2c, { rough: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), fur);
  body.scale.set(1, 1.3, 1);
  body.position.y = 0.13;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat(0xffe6c2, { rough: 1 }));
  belly.scale.set(1, 1.3, 0.6);
  belly.position.set(0, 0.12, 0.06);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), fur);
  head.position.set(0, 0.29, 0.03);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), fur);
    ear.position.set(s * 0.04, 0.37, 0.01);
    g.add(ear);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), mat(0x2b1b3a));
    e.position.set(s * 0.03, 0.305, 0.095);
    g.add(e);
  }
  const acorn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(WOOD));
  acorn.position.set(0, 0.2, 0.12);
  g.add(acorn);
  // đuôi: ống cong xù (xoay quanh gốc đuôi)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.06, -0.08);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.09, -0.12), new THREE.Vector3(0, 0.26, -0.12),
    new THREE.Vector3(0, 0.36, -0.02), new THREE.Vector3(0, 0.32, 0.06),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.06, 8, false), mat(0xf59e3a, { rough: 1 }));
  tailPivot.add(tail);
  g.add(tailPivot);
  shadows(g);
  g.userData.tail = tailPivot;
  return g;
}

/** 1 quả dâu tây (nón đỏ + lá xanh). Đáy ~ y=0. */
function strawberry(s = 1): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.ConeGeometry(0.032 * s, 0.06 * s, 10), mat(0xe11d48, { rough: 0.5 }));
  b.rotation.x = Math.PI;
  b.position.y = 0.03 * s;
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.03 * s, 0.015 * s, 6), mat(0x22a447));
  leaf.position.y = 0.065 * s;
  g.add(b, leaf);
  return g;
}

/** Bánh sinh nhật lệch tầng (3 bà tiên tự làm bánh không dùng phép). Đáy y=0. */
function lopsidedCake(): { group: THREE.Group; candles: THREE.Object3D[] } {
  const g = new THREE.Group();
  const tiers = [
    { r: 0.28, h: 0.16, c: 0xf9a8d4, tilt: 0 },
    { r: 0.21, h: 0.14, c: 0x93c5fd, tilt: 0.07 },
    { r: 0.14, h: 0.12, c: 0xf9a8d4, tilt: 0.15 },
  ];
  const cream = mat(0xfff4e0, { rough: 0.5 });
  let y = 0;
  let x = 0;
  let top: THREE.Object3D = g;
  for (const t of tiers) {
    const tier = new THREE.Group();
    tier.position.set(x, y, 0);
    tier.rotation.z = t.tilt;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r, t.h, 24), mat(t.c, { rough: 0.55 }));
    body.position.y = t.h / 2;
    const drip = new THREE.Mesh(new THREE.TorusGeometry(t.r, 0.022, 8, 24), cream);
    drip.rotation.x = Math.PI / 2;
    drip.position.y = t.h;
    tier.add(body, drip);
    g.add(tier);
    top = tier;
    y += t.h * 0.95;
    x += 0.025;
  }
  const candles: THREE.Object3D[] = [];
  for (const cx of [-0.05, 0.05]) {
    const c = candle(0.12, cx < 0 ? PINK : BLUE);
    c.position.set(cx, 0.12, 0);
    top.add(c);
    candles.push(c);
  }
  // dâu tây quanh tầng dưới
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const berry = strawberry();
    berry.position.set(Math.cos(a) * 0.24, 0.16, Math.sin(a) * 0.24);
    g.add(berry);
  }
  shadows(g);
  return { group: g, candles };
}

/** Bát dâu tây. Đáy y=0. */
function berryBowl(): THREE.Group {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(BLUE, { rough: 0.4, side: THREE.DoubleSide }));
  bowl.position.y = 0.16;
  g.add(bowl);
  const pts: [number, number][] = [[0, 0], [0.07, 0.03], [-0.07, 0.02], [0.02, -0.07], [-0.03, 0.07], [0.06, -0.05], [-0.06, -0.04]];
  pts.forEach(([x, z], i) => {
    const s = strawberry(1.5);
    s.position.set(x, 0.12 + (i === 0 ? 0.04 : 0), z);
    s.rotation.set((i * 0.7) % 0.6 - 0.3, i, (i * 0.9) % 0.6 - 0.3);
    g.add(s);
  });
  shadows(g);
  return g;
}

/** Vương miện vàng nhỏ có ngọc hồng. Đáy y=0. */
function crown(): THREE.Group {
  const g = new THREE.Group();
  const gold = mat(GOLD, { rough: 0.3, emissive: 0x6b4a00, ei: 0.4 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.06, 20, 1, true), mat(GOLD, { rough: 0.3, emissive: 0x6b4a00, ei: 0.4, side: THREE.DoubleSide }));
  band.position.y = 0.03;
  g.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 6), gold);
    spike.position.set(Math.cos(a) * 0.087, 0.09, Math.sin(a) * 0.087);
    g.add(spike);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.02), mat(0xec4899, { rough: 0.2, emissive: 0x7a1047, ei: 0.5 }));
  gem.position.set(0, 0.035, 0.09);
  g.add(gem);
  shadows(g);
  return g;
}

/** Bàn tròn phủ khăn caro hồng. Mặt bàn ở y=0.8. */
function clothTable(): THREE.Group {
  const g = new THREE.Group();
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.74, 0.78, 28, 1, true), texMat(tileTex(0xfbcfe8, 0xfff4f9, [6, 2], 0xfbcfe8), { rough: 0.95, side: THREE.DoubleSide }));
  cloth.position.y = 0.39;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.03, 28), mat(0xfff4f9, { rough: 0.9 }));
  top.position.y = 0.785;
  const lace = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.025, 6, 40), mat(0xfff7fb, { rough: 0.9 }));
  lace.rotation.x = Math.PI / 2;
  lace.position.y = 0.02;
  g.add(cloth, top, lace);
  shadows(g);
  return g;
}

/** Ma-nơ-canh mặc váy (váy Aurora đổi hồng ↔ xanh). Trả material riêng để đổi màu. */
function dressForm(): { group: THREE.Group; dress: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const dress = new THREE.MeshStandardMaterial({ color: PINK, roughness: 0.55, metalness: 0 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 20), mat(WOOD, { rough: 0.6 }));
  base.position.y = 0.03;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8), mat(0xf6c453, { rough: 0.4 }));
  pole.position.y = 0.75;
  const prof = [[0.02, 0.95], [0.12, 0.92], [0.2, 0.75], [0.32, 0.5], [0.46, 0.22], [0.56, 0.05], [0.57, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), dress);
  skirt.position.y = 0.12;
  const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.38, 20), dress);
  bodice.position.y = 1.25;
  const bust = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dress);
  bust.scale.y = 0.35;
  bust.position.y = 1.44;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 10), mat(0xfff1e6));
  neck.position.y = 1.52;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(0xf6c453, { rough: 0.4 }));
  knob.position.y = 1.62;
  // cổ áo trễ vai kem + thắt lưng vàng
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 28), mat(0xfff4e0, { rough: 0.8 }));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.43;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24), mat(GOLD, { rough: 0.4 }));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.07;
  g.add(base, pole, skirt, bodice, bust, neck, knob, collar, belt);
  shadows(g);
  return { group: g, dress };
}

/** Giỏ hoa treo trần (dây + giỏ + hoa rủ). Gốc = điểm treo ở trần. */
function hangingBasket(len: number, colors: number[]): THREE.Group {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, len, 4), mat(0x8a5a33));
  cord.position.y = -len / 2;
  g.add(cord);
  const basket = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xe0a45e, { rough: 0.9, side: THREE.DoubleSide }));
  basket.position.y = -len;
  g.add(basket);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 8), mat(0x5cbf4a, { rough: 0.9 }));
  leaves.scale.y = 0.45;
  leaves.position.y = -len + 0.02;
  g.add(leaves);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat(colors[i % colors.length], { rough: 0.6 }));
    const hang = i % 3 === 0 ? 0.18 : 0.04;
    f.position.set(Math.cos(a) * 0.24, -len + 0.06 - hang, Math.sin(a) * 0.24);
    g.add(f);
  }
  return g;
}

interface Fairy { obj: THREE.Group; wings: THREE.Object3D[]; deep: number; phase: number; speed: number; rx: number; rz: number; cy: number }

/** Bà tiên tí hon: lõi sáng + váy + mũ nhọn + quầng + 2 cánh trong. */
function fairy(light: number, deep: number): { obj: THREE.Group; wings: THREE.Object3D[] } {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glowMat(light));
  g.add(core);
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 12), glowMat(deep));
  dress.position.y = -0.07;
  g.add(dress);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 10), glowMat(deep));
  hat.position.y = 0.09;
  g.add(hat);
  const halo = glow(light, 0.75, 0.75);
  g.add(halo);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xe0f2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, fog: false, depthWrite: false });
  const wgeo = new THREE.CircleGeometry(0.07, 12);
  wgeo.scale(1.4, 0.8, 1);
  wgeo.translate(0.09, 0.02, 0);
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wgeo, wingMat);
    w.rotation.y = s < 0 ? Math.PI : 0;
    w.position.z = -0.03;
    const pivot = new THREE.Group();
    pivot.add(w);
    g.add(pivot);
    wings.push(pivot);
  }
  return { obj: g, wings };
}

interface Butterfly { obj: THREE.Group; wings: THREE.Object3D[]; cx: number; cy: number; cz: number; phase: number; order: number }

/** Bướm 2 cánh (bài đếm của phòng đếm bướm). */
function butterfly(color: number): { obj: THREE.Group; wings: THREE.Object3D[] } {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(0.08, 12);
  geo.scale(1, 1.3, 1);
  geo.translate(0.075, 0.02, 0);
  geo.rotateX(-Math.PI / 2);        // cánh nằm ngang (mặt phẳng XZ), vỗ quanh trục z
  const m = mat(color, { rough: 0.6, side: THREE.DoubleSide, emissive: color, ei: 0.25 });
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const w = new THREE.Mesh(geo, m);
    w.rotation.y = s < 0 ? Math.PI : 0;
    pivot.add(w);
    g.add(pivot);
    wings.push(pivot);
  }
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.08, 4, 6), mat(0x4c1d95));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  return { obj: g, wings };
}

/** Lâu đài hồng mái xanh ở xa (lâu đài của vua Stefan). Đáy y=0. */
function farCastle(): THREE.Group {
  const g = new THREE.Group();
  const wallM = mat(0xfbcfe8, { rough: 0.8 });
  const roofM = mat(0x3b82f6, { rough: 0.6 });
  const flagM = mat(GOLD, { rough: 0.5 });
  const towers: [number, number, number, number][] = [[0, 0, 0.9, 6.5], [-2.2, 0.6, 0.6, 4.2], [2.2, 0.6, 0.6, 4.4], [-1.1, -0.9, 0.5, 5.2], [1.2, -0.9, 0.5, 5.6]];
  for (const [x, z, r, h] of towers) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 16), wallM);
    t.position.set(x, h / 2, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.3, r * 2.6, 16), roofM);
    roof.position.set(x, h + r * 1.3, z);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.02), flagM);
    flag.position.set(x + 0.25, h + r * 2.6 + 0.2, z);
    g.add(t, roof, flag);
  }
  const keep = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3, 1.6), wallM);
  keep.position.set(0, 1.5, 0.3);
  g.add(keep);
  const gate = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16, 0, Math.PI), roofM);
  gate.position.set(0, 0.7, 1.11);
  const gateB = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), roofM);
  gateB.position.set(0, 0.35, 1.11);
  g.add(gate, gateB);
  return g;
}

/** Đám mây (vài quả cầu dẹt, tự sáng). */
function cloud(s = 1): THREE.Group {
  const g = new THREE.Group();
  const m = glowMat(0xfff3fa);
  for (const [x, y, r] of [[0, 0, 1.2], [1.3, -0.2, 0.9], [-1.3, -0.25, 0.85], [0.5, 0.5, 0.8]] as const) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 14, 8), m);
    b.scale.y = 0.6;
    b.position.set(x * s, y * s, 0);
    g.add(b);
  }
  return g;
}

// ---------------------------------------------------------------- hoa hồng leo quanh cửa vòm

interface RoseVine { heads: THREE.InstancedMesh; base: THREE.Matrix4[]; bloom: number }

/** Cành hồng leo bám quanh viền cửa vòm (ống cành + lá + hoa instanced). */
function roseVine(root: THREE.Group, z: number): RoseVine {
  const r = ARCH_W / 2 + 0.42;
  const cy = ARCH_Y + ARCH_H - ARCH_W / 2;
  const pts: THREE.Vector3[] = [];
  pts.push(new THREE.Vector3(-r - 0.1, 0.1, z));
  for (let i = 0; i <= 3; i++) pts.push(new THREE.Vector3(-r + Math.sin(i * 1.7) * 0.08, 0.5 + (cy - 0.5) * (i / 3), z));
  for (let i = 1; i < 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    const rr = r + Math.sin(i * 2.3) * 0.08;
    pts.push(new THREE.Vector3(Math.cos(a) * rr, cy + Math.sin(a) * rr, z));
  }
  for (let i = 3; i >= 0; i--) pts.push(new THREE.Vector3(r + Math.sin(i * 1.3) * 0.08, 0.5 + (cy - 0.5) * (i / 3), z));
  pts.push(new THREE.Vector3(r + 0.1, 0.1, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.03, 5, false), mat(0x3f9e45, { rough: 0.8 }));
  root.add(stem);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const nLeaf = 70;
  const leafGeo = new THREE.SphereGeometry(0.08, 8, 5);
  leafGeo.scale(1, 0.25, 0.55);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 }), nLeaf);
  const green = [0x3fae52, 0x5cc85e, 0x2f9a48].map((c) => new THREE.Color(c));
  for (let i = 0; i < nLeaf; i++) {
    curve.getPoint((i + 0.5) / nLeaf, p);
    p.x += Math.sin(i * 7.1) * 0.12; p.y += Math.cos(i * 5.3) * 0.12; p.z += 0.03;
    e.set(Math.sin(i) * 0.6, 0, i * 1.9);
    q.setFromEuler(e);
    sc.setScalar(0.8 + ((i * 37) % 10) / 20);
    m4.compose(p, q, sc);
    leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, green[i % 3]);
  }
  root.add(leaves);

  const nRose = 28;
  const roseGeo = new THREE.IcosahedronGeometry(0.1, 1);
  roseGeo.scale(1, 0.8, 1);
  const heads = new THREE.InstancedMesh(roseGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 }), nRose);
  const roseCols = [0xe11d74, 0xf472b6, 0xdc2651, 0xfb7fb8].map((c) => new THREE.Color(c));
  const base: THREE.Matrix4[] = [];
  for (let i = 0; i < nRose; i++) {
    curve.getPoint(0.02 + (i / (nRose - 1)) * 0.96, p);
    p.x += Math.sin(i * 3.7) * 0.1; p.y += Math.cos(i * 2.9) * 0.1; p.z += 0.07;
    e.set(0.4, i, 0);
    q.setFromEuler(e);
    sc.setScalar(0.85 + ((i * 13) % 7) / 14);
    const b = new THREE.Matrix4().compose(p, q, sc);
    base.push(b);
    heads.setMatrixAt(i, b);
    heads.setColorAt(i, roseCols[i % 4]);
  }
  root.add(heads);
  return { heads, base, bloom: -1 };
}

/** Tắt đổ bóng cho đồ nhỏ (bán kính < minR m) để giảm draw call ở pass bóng; chỉ đụng tới đồ của phòng (không đụng nhân vật). */
function trimShadows(objs: THREE.Object3D[], minR: number): void {
  const s = new THREE.Vector3();
  for (const obj of objs) {
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.castShadow) return;
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      m.getWorldScale(s);
      if ((m.geometry.boundingSphere?.radius ?? 0) * Math.max(s.x, s.y, s.z) < minR) m.castShadow = false;
    });
  }
}

/**
 * Gộp mọi mesh tĩnh trong 1 group thành ít mesh (1 mesh / material) để giảm draw call.
 * Chỉ dùng cho group KHÔNG có bộ phận chuyển động riêng, không có sprite / InstancedMesh (gặp thì trả nguyên group).
 */
function mergeStatic(g: THREE.Object3D): THREE.Object3D {
  let ok = true;
  g.traverse((o) => { if ((o as THREE.Sprite).isSprite || (o as THREE.InstancedMesh).isInstancedMesh || (o as THREE.Points).isPoints) ok = false; });
  if (!ok) return g;
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const byMat = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean }>();
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(inv.clone().multiply(m.matrixWorld));
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
    const e = byMat.get(m.material) ?? { geos: [], cast: false };
    e.geos.push(geo);
    e.cast ||= m.castShadow;
    byMat.set(m.material, e);
  });
  const out = new THREE.Group();
  out.position.copy(g.position); out.quaternion.copy(g.quaternion); out.scale.copy(g.scale);
  for (const [material, { geos, cast }] of byMat) {
    const merged = mergeGeometries(geos, false);
    if (!merged) return g;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = cast;
    out.add(mesh);
  }
  return out;
}

// ---------------------------------------------------------------- dựng phòng

interface AuroraState {
  fairies: Fairy[];
  butterflies: Butterfly[];
  vine: RoseVine;
  dress: THREE.MeshStandardMaterial;
  wheel: THREE.Object3D;
  owl: THREE.Group;
  birds: THREE.Group[];
  candles: THREE.Object3D[];
  rabbit: THREE.Object3D;
  squirrel: THREE.Group;
  baskets: THREE.Object3D[];
  clouds: THREE.Object3D[];
  windowGlow: THREE.Sprite;
  sunLight: THREE.PointLight;
  trail: number;
  dressT: number;
}

// biến tạm dùng lại trong ambient (không tạo object mới mỗi frame)
const tmpV = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const cPink = new THREE.Color(PINK);
const cBlue = new THREE.Color(BLUE);

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;
  const before = new Set(root.children);

  // --- ngoài cửa: trời xanh hồng, đồi cỏ, rừng, lâu đài, mây
  const dome = skyDome(0x5fb8ff, 0xffe0f0, 75);
  dome.position.set(0, -12, -10);
  root.add(dome);
  const sun = glow(0xfff3b0, 8, 0.8);
  sun.position.set(-4.5, 8, -45);
  root.add(sun);
  const sunCore = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), glowMat(0xfff7cf));
  sunCore.position.set(-4.5, 8, -45.5);
  root.add(sunCore);
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), mat(0x86d76a, { rough: 1 }));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(0, -0.02, -46);
  meadow.receiveShadow = true;
  root.add(meadow);
  for (const [x, z, sx, sy, c] of [[-12, -40, 16, 5, 0x6cc75a], [6, -39, 14, 5, 0x7ed36a], [0, -58, 34, 10, 0x5cb85a], [-26, -50, 16, 8, 0x75cc62]] as const) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(c, { rough: 1 }));
    hill.scale.set(sx, sy, sx * 0.5);
    hill.position.set(x, -0.05, z);
    root.add(hill);
  }
  const castle = farCastle();
  castle.position.set(3.2, 4.4, -39);
  castle.rotation.y = -0.2;
  castle.scale.setScalar(0.55);
  root.add(mergeStatic(castle));
  const clouds: THREE.Object3D[] = [];
  for (const [x, y, z, s] of [[-7, 7.5, -42, 1.3], [3, 9, -44, 1.1], [12, 7, -42, 1.2]] as const) {
    const c = mergeStatic(cloud(s));
    c.position.set(x, y, z);
    root.add(c);
    clouds.push(c);
  }
  // cây rừng + bụi hoa ngay ngoài cửa
  const trees: [string, number, number, number][] = [
    // chừa khoảng giữa trống để thấy đồi + lâu đài qua cửa vòm
    ['tree_default.glb', -3.9, -11, 4.2], ['tree_fat.glb', 4.3, -12, 3.8], ['tree_default.glb', -6.5, -15, 5],
    ['tree_fat.glb', 7.5, -16, 4.6], ['tree_default.glb', -2.6, -24, 4.4], ['tree_fat.glb', -9, -22, 5],
    ['tree_default.glb', -9, -9, 4.4], ['tree_default.glb', 9.5, -9.5, 4.8],
  ];
  const flowers: [string, number, number][] = [
    ['flower_redA.glb', -1.4, -6.6], ['flower_purpleA.glb', 1.5, -6.7], ['flower_yellowA.glb', -0.6, -7.4],
    ['flower_redA.glb', 0.9, -8], ['flower_purpleA.glb', -2.3, -7.8], ['plant_bush.glb', 2.6, -7.2], ['plant_bush.glb', -2.8, -6.8],
  ];
  await Promise.all([
    ...trees.map(async ([n, x, z, h]) => {
      try { const t = await ctx.model(n, { height: h }); t.position.set(x, 0, z); t.rotation.y = x * 1.3; root.add(t); } catch { /* bỏ qua */ }
    }),
    ...flowers.map(async ([n, x, z]) => {
      try { const f = await ctx.model(n, { height: n.startsWith('plant') ? 0.6 : 0.4 }); f.position.set(x, 0, z); f.rotation.y = x * 2; root.add(f); } catch { /* bỏ qua */ }
    }),
  ]);
  // thỏ + sóc ngồi ngoài cửa (nhảy nhót khi công chúa tỉnh)
  const rabbit = bunny();
  rabbit.position.set(-1.25, 0, -7.2);
  rabbit.rotation.y = 0.5;
  rabbit.scale.setScalar(1.3);
  const rabbitM = mergeStatic(rabbit);
  root.add(rabbitM);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.35, 14), mat(WOOD, { rough: 0.9 }));
  stump.position.set(1.5, 0.175, -7.6);
  const stumpTop = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.01, 14), mat(0xf3cf92));
  stumpTop.position.set(1.5, 0.355, -7.6);
  const sq = squirrel();
  sq.position.set(1.5, 0.36, -7.6);
  sq.rotation.y = -0.4;
  sq.scale.setScalar(1.4);
  root.add(stump, stumpTop, sq);

  // --- tường: vữa hồng hoa nhí + khung gỗ
  const backWall = wallWithArch(SIDE_X * 2 + 0.2, WALL_H, ARCH_W, ARCH_H, ARCH_Y, texMat(plasterTex([1, 1]), { rough: 0.95 }), 2);
  backWall.position.set(0, 0, BACK_Z);
  root.add(backWall);
  const sideMat = texMat(plasterTex([5, 2.8]), { rough: 0.95 });
  for (const s of [-1, 1]) {
    const w = wall(11.5, WALL_H, sideMat);   // wall() đã đặt y = h/2
    w.position.x = s * SIDE_X;
    w.position.z = -0.2;
    w.rotation.y = -s * Math.PI / 2;
    root.add(w);
  }
  const beam = mat(WOOD, { rough: 0.65 });
  const timber = new THREE.Group();   // mọi cột / xà / thanh chéo: gộp 1 mesh ở cuối
  // cột + xà + thanh chéo tường sau (cột trong đặt ngoài vòng hoa hồng)
  for (const x of [-5.7, -4.6, -2.85, 2.85, 4.6, 5.7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, WALL_H, 0.14), beam);
    post.position.set(x, WALL_H / 2, BACK_Z + 0.07);
    post.castShadow = true;
    timber.add(post);
  }
  for (const y of [0.18, 4.55]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(SIDE_X * 2, y < 1 ? 0.36 : 0.22, 0.16), beam);
    rail.position.set(0, y, BACK_Z + 0.08);
    timber.add(rail);
  }
  // thanh chéo chữ V trên cao (trên tranh / kệ)
  for (const [x0, x1] of [[-5.7, -4.6], [-4.6, -2.85], [2.85, 4.6], [4.6, 5.7]] as const) {
    for (const d of [-1, 1]) {
      const len = Math.hypot((x1 - x0) / 2, 0.9);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, len, 0.1), beam);
      brace.position.set(x0 + (x1 - x0) * (d < 0 ? 0.25 : 0.75), 4.0, BACK_Z + 0.09);
      brace.rotation.z = d * Math.atan2((x1 - x0) / 2, 0.9);
      timber.add(brace);
    }
  }
  // cột + xà tường bên
  for (const s of [-1, 1]) {
    for (const z of [-3.2, -0.6, 2.0]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, WALL_H, 0.24), beam);
      post.position.set(s * (SIDE_X - 0.07), WALL_H / 2, z);
      timber.add(post);
    }
    for (const [y, hh] of [[0.18, 0.36], [4.55, 0.22]] as const) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, hh, 11.5), beam);
      rail.position.set(s * (SIDE_X - 0.08), y, -0.2);
      timber.add(rail);
    }
  }

  // --- cửa vòm: khung gỗ + bậu ngồi có đệm + chim xanh + hoa hồng leo
  const frame = archFrame(ARCH_W, ARCH_H, WOOD_LIGHT, 0.22, 0.34);
  frame.position.set(0, ARCH_Y, BACK_Z - 0.08);
  root.add(frame);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(ARCH_W + 0.5, 0.16, 0.7), mat(WOOD_LIGHT, { rough: 0.6 }));
  seat.position.set(0, ARCH_Y - 0.02, BACK_Z + 0.22);
  seat.castShadow = true; seat.receiveShadow = true;
  root.add(seat);
  for (const [x, c] of [[-1.35, PINK], [1.35, BLUE]] as const) {
    const cush = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.5), mat(c, { rough: 0.95 }));
    cush.position.set(x, ARCH_Y + 0.12, BACK_Z + 0.25);
    cush.castShadow = true;
    root.add(cush);
  }
  const birds: THREE.Group[] = [];
  for (const [x, c, ry] of [[-0.75, 0x3b82f6, 0.4], [0.8, 0x60a5fa, -0.5]] as const) {
    const b = bluebird(c);
    b.position.set(x, ARCH_Y + 0.07, BACK_Z + 0.3);
    b.rotation.y = ry;
    b.scale.setScalar(1.5);
    root.add(b);
    birds.push(b);
  }
  const vine = roseVine(root, BACK_Z + 0.2);
  // dây cờ hồng xanh vàng trên tường sau
  root.add(bunting(new THREE.Vector3(-5.6, 3.95, BACK_Z + 0.3), new THREE.Vector3(-2.5, 3.95, BACK_Z + 0.3), [PINK, BLUE, GOLD], 0.3, 7));
  root.add(bunting(new THREE.Vector3(2.5, 3.95, BACK_Z + 0.3), new THREE.Vector3(5.6, 3.95, BACK_Z + 0.3), [BLUE, PINK, GOLD], 0.3, 7));

  // --- sàn gỗ mật ong + thảm tròn hồng viền xanh + 2 thảm nhỏ
  const planks = floor(SIDE_X * 2 + 2, 14, texMat(plankTex(0xe6ae70, [3, 3]), { rough: 0.8 }));   // chỉ trong nhà (ngoài cửa là cỏ)
  planks.position.z = BACK_Z + 7;
  root.add(planks);
  const carpet = rug(3.5, 2.5, 0xf9a8d4, BLUE);
  carpet.position.set(0, 0, 0.7);
  root.add(carpet);
  const inner = rug(2.3, 1.6, 0xfbcfe8, GOLD);
  inner.position.set(0, 0.012, 0.7);
  root.add(inner);
  for (const s of [-1, 1]) {
    const small = rug(1.0, 0.7, s < 0 ? 0x93c5fd : 0xf9a8d4, 0xfff4e0);
    small.position.set(s < 0 ? -4.6 : 3.95, 0, s < 0 ? -4.1 : -2.7);
    root.add(small);
  }

  // --- trần: dầm gỗ + giỏ hoa treo + dây đèn
  for (let i = 0; i < 5; i++) {
    const cb = new THREE.Mesh(new THREE.BoxGeometry(SIDE_X * 2, 0.26, 0.24), beam);
    cb.position.set(0, WALL_H - 0.3, BACK_Z + 0.6 + i * 2.2);
    timber.add(cb);
  }
  root.add(mergeStatic(timber));
  const baskets: THREE.Object3D[] = [];
  for (const [x, z, len, cols] of [[-3.7, -4.2, 2.3, [PINK, GOLD, 0xffffff]], [3.7, -4.2, 2.4, [BLUE, PINK, GOLD]]] as const) {
    const b = hangingBasket(len, [...cols]);
    b.position.set(x, WALL_H - 0.3, z);
    const bm = mergeStatic(b);
    root.add(bm);
    baskets.push(bm);
  }
  // dây đèn nhỏ vắt ngang 2 giỏ hoa (sáng dần khi tan băng: xem ambient)
  const lightsL = fairyLights(new THREE.Vector3(-5.6, 3.55, BACK_Z + 0.35), new THREE.Vector3(-3.7, 3.1, -4.2), 0.25, 8, [0xffc2e2, 0xbfe0ff, 0xfff1a8]);
  const lightsR = fairyLights(new THREE.Vector3(3.7, 3.1, -4.2), new THREE.Vector3(5.6, 3.55, BACK_Z + 0.35), 0.25, 8, [0xbfe0ff, 0xffc2e2, 0xfff1a8]);
  root.add(lightsL, lightsR);

  // --- bên trái: cửa sổ nhỏ tường bên nhìn ra rừng (màn rộng mới thấy) + hộp hoa; tường sau: tranh lâu đài, kệ có cú;
  //     sàn: guồng quay tơ + giỏ len + chậu hoa
  const win = archWindow(1.2, 1.8, forestView(), WOOD_LIGHT);
  win.position.set(-SIDE_X + 0.05, 1.25, -4.3);
  win.rotation.y = Math.PI / 2;
  root.add(win);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 1.3), mat(BLUE, { rough: 0.6 }));
  box.position.set(-SIDE_X + 0.3, 1.08, -4.3);
  root.add(box);
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mat([PINK, GOLD, 0xffffff][i % 3], { rough: 0.6 }));
    f.position.set(-SIDE_X + 0.32, 1.24 + (i % 2) * 0.05, -4.85 + i * 0.22);
    root.add(f);
  }
  const castleArt = painting(0.85, 0.8, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#ffd6ea');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7ed36a'; c.beginPath(); c.ellipse(w / 2, h, w * 0.7, h * 0.28, 0, 0, Math.PI * 2); c.fill();
    const tower = (x: number, tw: number, th: number) => {
      c.fillStyle = '#fbcfe8'; c.fillRect(x - tw / 2, h * 0.78 - th, tw, th);
      c.fillStyle = '#3b82f6'; c.beginPath(); c.moveTo(x - tw * 0.7, h * 0.78 - th); c.lineTo(x + tw * 0.7, h * 0.78 - th); c.lineTo(x, h * 0.78 - th - tw * 1.4); c.fill();
    };
    tower(w * 0.3, 26, 70); tower(w * 0.7, 26, 78); tower(w * 0.4, 20, 90); tower(w * 0.6, 20, 95); tower(w * 0.5, 36, 110);
    c.fillStyle = '#ffd84d'; c.beginPath(); c.arc(w * 0.85, h * 0.18, 16, 0, Math.PI * 2); c.fill();
  }, 0xffffff, WOOD_LIGHT);
  castleArt.position.set(-5.15, 2.45, BACK_Z + 0.1);
  root.add(mergeStatic(castleArt));
  const owlShelf = shelf(1.2, WOOD);
  owlShelf.position.set(-3.72, 1.75, BACK_Z + 0.25);
  root.add(mergeStatic(owlShelf));
  const theOwl = owl();
  theOwl.position.set(-3.95, 1.75, BACK_Z + 0.28);
  theOwl.lookAt(0.15, 1.95, 8.4);
  theOwl.scale.setScalar(1.25);
  root.add(theOwl);
  const bk = books(4, [PINK, BLUE, GOLD, 0x34d399]);
  bk.position.set(-3.3, 1.75, BACK_Z + 0.25);
  bk.scale.setScalar(0.8);
  root.add(mergeStatic(bk));
  const wheelObj = spinningWheel();
  wheelObj.position.set(-4.75, 0, -4.35);   // lệch hẳn sang trái để Elsa (-2.15, 0.75) không che
  wheelObj.rotation.y = 0.75;
  wheelObj.scale.setScalar(1.15);
  root.add(wheelObj);
  const yarn = yarnBasket();
  yarn.position.set(-3.35, 0, -0.1);
  root.add(mergeStatic(yarn));
  const potL = flowerPot(BLUE, [PINK, GOLD, 0xffffff, 0xf9a8d4]);
  potL.position.set(-3.6, 0, -0.9);
  potL.scale.setScalar(1.4);
  root.add(mergeStatic(potL));

  // --- tường phải: bàn bánh sinh nhật + dâu + vương miện, ma-nơ-canh váy, kệ lọ, tranh 3 bà tiên
  const table = clothTable();
  table.position.set(3.45, 0, -4.4);
  root.add(mergeStatic(table));
  const cake = lopsidedCake();
  cake.group.position.set(3.35, 0.8, -4.45);
  cake.group.scale.setScalar(1.3);
  root.add(cake.group);
  const bowl = berryBowl();
  bowl.position.set(3.85, 0.8, -4.05);
  root.add(mergeStatic(bowl));
  const cr = crown();
  cr.position.set(2.98, 0.8, -4.05);
  cr.scale.setScalar(1.3);
  root.add(mergeStatic(cr));
  const df = dressForm();
  df.group.position.set(4.05, 0, -2.6);
  df.group.rotation.y = -0.45;
  root.add(mergeStatic(df.group));
  const fairyArt = painting(1.1, 1.3, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fde2ee'); gr.addColorStop(1, '#dbeafe');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    ([['#e11d48', 0.25, 0.55], ['#16a34a', 0.5, 0.4], ['#2563eb', 0.75, 0.55]] as const).forEach(([col, fx, fy]) => {
      const x = w * fx, y = h * fy;
      c.fillStyle = 'rgba(191,224,255,0.9)';
      c.beginPath(); c.ellipse(x - 18, y - 16, 16, 10, -0.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(x + 18, y - 16, 16, 10, 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 20, y + 30); c.lineTo(x - 20, y + 30); c.fill();
      c.beginPath(); c.moveTo(x - 10, y - 26); c.lineTo(x + 10, y - 26); c.lineTo(x, y - 52); c.fill();
      c.fillStyle = '#ffe0c7'; c.beginPath(); c.arc(x, y - 20, 9, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#facc15';
    for (let i = 0; i < 16; i++) { c.beginPath(); c.arc((i * 47) % w, 12 + (i * 29) % (h - 24), 3, 0, Math.PI * 2); c.fill(); }
  }, 0xffffff, WOOD_LIGHT);
  fairyArt.position.set(3.72, 2.5, BACK_Z + 0.1);
  root.add(mergeStatic(fairyArt));
  const jarShelf = shelf(1.0, WOOD);
  jarShelf.position.set(5.15, 1.9, BACK_Z + 0.25);
  root.add(mergeStatic(jarShelf));
  for (let i = 0; i < 3; i++) {
    const h = 0.22 + (i % 2) * 0.06;
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, h, 12), mat([0xfbcfe8, 0xbfdbfe, 0xfde68a][i], { rough: 0.2, opacity: 0.85 }));
    jar.position.set(4.85 + i * 0.3, 1.9 + h / 2, BACK_Z + 0.25);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 12), mat([PINK, BLUE, GOLD][i]));
    lid.position.set(4.85 + i * 0.3, 1.92 + h, BACK_Z + 0.25);
    root.add(jar, lid);
  }
  const potR = flowerPot(PINK, [0xffffff, BLUE, GOLD, 0xf9a8d4]);
  potR.position.set(3.6, 0, -0.9);
  potR.scale.setScalar(1.35);
  root.add(mergeStatic(potR));
  for (const [x, z, pc, cols] of [[-2.95, -5.05, PINK, [0xffffff, GOLD, BLUE]], [5.0, -4.95, BLUE, [PINK, 0xffffff, GOLD]]] as const) {
    const fp = flowerPot(pc, [...cols]);
    fp.position.set(x, 0, z);
    fp.scale.setScalar(1.15);
    root.add(mergeStatic(fp));
  }

  // --- tiên tí hon (Merryweather xanh dương, Flora hồng đỏ, Fauna xanh lá)
  const fairies: Fairy[] = [];
  const fdef: [number, number, number, number, number, number][] = [
    // sáng, đậm, pha, tốc độ, bán kính x, độ cao
    [0x93c5fd, 0x2563eb, 0, 0.55, 4.2, 3.0],
    [0xfda4c8, 0xdb2777, 2.1, 0.5, 3.6, 3.3],
    [0x86efac, 0x16a34a, 4.2, 0.6, 4.6, 2.8],
  ];
  for (const [light, deep, phase, speed, rx, cy] of fdef) {
    const f = fairy(light, deep);
    root.add(f.obj);
    fairies.push({ obj: f.obj, wings: f.wings, deep, phase, speed, rx, rz: 1.3, cy });
  }

  // --- bướm bay quanh 2 bên phòng và ngoài cửa
  const butterflies: Butterfly[] = [];
  const bdef: [number, number, number, number][] = [[-3.4, 2.2, -1.8, PINK], [3.5, 2.5, -1.4, BLUE], [-1.2, 2.6, -7.5, GOLD], [1.6, 2.0, -8.2, 0xa855f7], [-4.4, 3.0, -3.9, 0xf97316], [2.9, 3.2, -4.0, 0xec4899]];
  bdef.forEach(([x, y, z, c], i) => {
    const b = butterfly(c);
    b.obj.position.set(x, y, z);
    b.obj.scale.setScalar(1.3);
    root.add(b.obj);
    butterflies.push({ obj: b.obj, wings: b.wings, cx: x, cy: y, cz: z, phase: i * 1.7, order: i / bdef.length });
  });

  // --- ánh sáng: nắng qua cửa + 2 đèn ấm hồng (tổng 3 point light)
  const sunLight = new THREE.PointLight(0xfff0c8, 4, 10, 1.5);
  sunLight.position.set(0, 3.2, BACK_Z + 1.2);
  const warmL = new THREE.PointLight(0xffb8dc, 5, 9, 1.6);
  warmL.position.set(-3.8, 3.4, -1.8);
  const warmR = new THREE.PointLight(0xffd6a0, 5, 9, 1.6);
  warmR.position.set(3.8, 3.4, -1.8);
  root.add(sunLight, warmL, warmR);
  const windowGlow = glow(0xfff0c0, 6, 0.3);
  windowGlow.position.set(0, 2.4, BACK_Z + 0.1);
  root.add(windowGlow);

  const S: AuroraState = {
    fairies, butterflies, vine, dress: df.dress, wheel: wheelObj.userData.wheel as THREE.Object3D, owl: theOwl, birds,
    candles: cake.candles, rabbit: rabbitM, squirrel: sq, baskets, clouds, windowGlow, sunLight, trail: 0, dressT: 0,
  };
  ctx.state.aurora = S;
  trimShadows(root.children.filter((o) => !before.has(o)), 0.3);
}

function ambient(ctx: RoomCtx, dt: number): void {
  const S = ctx.state.aurora as AuroraState | undefined;
  if (!S) return;
  const t = ctx.time;
  const melt = ctx.melt;
  const awake = ctx.awake;
  const life = awake ? 1 : 0.35 + 0.65 * melt;      // độ "sống" của cảnh: băng → chậm, tan → nhanh

  // hoa hồng: nụ nhỏ → nở to theo melt (lerp mượt, chỉ ghi lại matrix khi còn đổi)
  const v = S.vine;
  const target = awake ? 1 : 0.35 + 0.65 * melt;
  if (v.bloom < 0 || Math.abs(target - v.bloom) > 0.002) {
    v.bloom = v.bloom < 0 ? target : v.bloom + (target - v.bloom) * Math.min(1, dt * 2.5);
    for (let i = 0; i < v.base.length; i++) {
      v.base[i].decompose(tmpP, tmpQ, tmpS);
      tmpS.multiplyScalar(THREE.MathUtils.clamp(v.bloom * 1.25 - (i % 5) * 0.06, 0.3, 1.1));
      tmpM.compose(tmpP, tmpQ, tmpS);
      v.heads.setMatrixAt(i, tmpM);
    }
    v.heads.instanceMatrix.needsUpdate = true;
  }

  // tiên bay vòng; số tiên hiện theo melt (1 → 2 → 3), rắc bụi tiên theo đường bay
  const shown = awake ? 3 : 1 + Math.round(melt * 2);
  S.trail += dt;
  const doTrail = S.trail > 0.08;
  if (doTrail) S.trail = 0;
  S.fairies.forEach((f, i) => {
    f.obj.visible = i < shown;
    if (!f.obj.visible) return;
    const a = t * f.speed * (0.6 + 0.6 * life) + f.phase;
    f.obj.position.set(Math.sin(a) * f.rx, f.cy + Math.sin(a * 2.3) * 0.35, -2.4 + Math.cos(a) * f.rz);
    const flap = Math.sin(t * 30 + i) * 0.7;
    f.wings[0].rotation.y = flap;
    f.wings[1].rotation.y = -flap;
    if (doTrail) ctx.magic.twinkle(f.obj.position, f.deep, 1, 0.1, 0.35);
  });

  // váy đổi màu hồng ↔ xanh (2 bà tiên tranh nhau); nhanh hơn khi tỉnh, kèm lấp lánh
  S.dressT += dt * (awake ? 0.5 : 0.12 + 0.2 * melt);
  const k = 0.5 + 0.5 * Math.sin(S.dressT * Math.PI);
  S.dress.color.copy(cPink).lerp(cBlue, THREE.MathUtils.smoothstep(k, 0.2, 0.8));
  if (awake && Math.random() < 0.08) {
    tmpV.set(5.0 + (Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 1.2, -1.1 + (Math.random() - 0.5) * 0.6);
    ctx.magic.twinkle(tmpV, k > 0.5 ? 0x2563eb : 0xdb2777, 1, 0.2, 0.4);
  }

  // guồng quay tơ: gần đứng yên khi đóng băng, quay đều khi tan
  S.wheel.rotation.x -= dt * (0.15 + 1.4 * melt);

  // cú: chớp mắt + quay/nghiêng đầu
  const head = S.owl.userData.head as THREE.Object3D;
  head.rotation.y = Math.sin(t * 0.5) * 0.5 * life;
  head.rotation.z = Math.sin(t * 0.8) * 0.12;
  const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
  for (const e of S.owl.userData.eyes as THREE.Object3D[]) e.scale.y = blink;

  // chim xanh: mổ, thỉnh thoảng vỗ cánh; khi tỉnh thì vỗ cánh + nhảy nhót
  S.birds.forEach((b, i) => {
    const wings = b.userData.wings as THREE.Object3D[];
    const flapping = awake || (melt > 0.3 && Math.sin(t * 0.9 + i * 2) > 0.85);
    const fl = flapping ? Math.sin(t * 28) * 0.9 : 0;
    wings[0].rotation.z = fl; wings[1].rotation.z = -fl;
    b.rotation.x = Math.max(0, Math.sin(t * 1.7 + i * 3)) * 0.35 * life;
    if (awake) bob(b, t, 0.05, 6, i * 1.3);
  });

  S.candles.forEach((c, i) => flicker(c, t, i * 2.1));
  S.baskets.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.7 + i) * 0.03; });
  S.clouds.forEach((c, i) => { c.position.x += dt * 0.25; if (c.position.x > 22) c.position.x = -22 - i; });

  // thỏ + sóc: khi tỉnh thì nhảy, sóc vẫy đuôi
  const hopAmp = awake ? 0.18 : 0.03 * melt;
  S.rabbit.position.y = Math.abs(Math.sin(t * 3.2)) * hopAmp;
  S.squirrel.position.y = 0.36 + Math.abs(Math.sin(t * 4 + 1)) * hopAmp * 0.6;
  (S.squirrel.userData.tail as THREE.Object3D).rotation.x = Math.sin(t * 3) * 0.2 * life;

  // bướm: đóng băng còn ít, tan dần thêm nhiều
  const bShown = awake ? 1.01 : 0.34 + 0.67 * melt;
  S.butterflies.forEach((b) => {
    b.obj.visible = b.order < bShown;
    if (!b.obj.visible) return;
    const a = t * 0.6 + b.phase;
    b.obj.position.set(b.cx + Math.sin(a) * 0.6, b.cy + Math.sin(a * 1.7) * 0.3, b.cz + Math.cos(a) * 0.4);
    b.obj.rotation.y = a;
    const fl = Math.sin(t * 16 + b.phase) * 1.0 + 0.3;
    b.wings[0].rotation.z = -fl; b.wings[1].rotation.z = fl;
  });

  S.windowGlow.material.opacity = 0.22 + 0.25 * melt + Math.sin(t * 1.3) * 0.03;
  S.sunLight.intensity = 3 + 3 * melt;

  // tỉnh rồi: bụi tiên hồng xanh rắc khắp phòng
  if (awake && Math.random() < 0.2) {
    tmpV.set((Math.random() - 0.5) * 9, 0.6 + Math.random() * 3.4, -3 + Math.random() * 3);
    ctx.magic.twinkle(tmpV, Math.random() < 0.5 ? 0xdb2777 : 0x2563eb, 1, 0.3, 0.35);
  }
}

const room: RoomDef = {
  id: 'aurora',
  name: 'Nhà trong rừng của Aurora',
  emoji: '🦋',
  princessModel: 'p_aurora.glb',
  rig: 'hires',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'cú', emoji: '🦉', name: 'con cú', fill: { index: 0, distractors: ['b', 'm'] } },
    { word: 'sóc', emoji: '🐿️', name: 'con sóc', fill: { index: 0, distractors: ['b', 'h'] } },
    { word: 'dâu', emoji: '🍓', name: 'quả dâu', ask: 'Quả nào là quả dâu?', fill: { index: 0, distractors: ['b', 'n'] } },
    { word: 'váy', emoji: '👗', name: 'cái váy', fill: { index: 0, distractors: ['h', 'l'] } },
    { word: 'nơ', emoji: '🎀', name: 'cái nơ' },
    { word: 'thỏ', emoji: '🐇', name: 'con thỏ' },
    { word: 'chim', emoji: '🐦', name: 'con chim' },
  ],
  count: { emoji: '🦋', audio: 'aurora_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],
  magicColors: [0xdb2777, 0x2563eb],
  audio: { name: 'aurora_name', intro: 'aurora_intro', thanks: 'aurora_thanks' },
};

export default room;

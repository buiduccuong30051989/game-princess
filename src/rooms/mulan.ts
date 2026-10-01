// PHÒNG MỘC LAN: khu vườn hoa đào kiểu Trung Hoa.
// Tường vữa màu mơ có cửa trăng (cổng tròn) viền đỏ + mái ngói vàng cong đầu đao, nhìn xuyên qua cổng thấy hồ sen, cầu cong đỏ,
// đình lục giác, chùa tháp và núi xa; 2 cây hoa đào nở rộ, cánh hoa rơi (băng càng tan rơi càng nhiều), đèn lồng đỏ (sáng dần),
// rồng đỏ tí hon kiểu Mushu ngồi trên tảng đá (ngủ khi đóng băng → mở mắt → vẫy tay + phun lửa khi công chúa tỉnh),
// trống trận, quạt xếp, tranh cuộn con ngựa, bàn trà + dế mèn may mắn, đèn đá, bình hoa đào, cá chép nhảy, diều bay trên trời.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import { mat, glowMat, texMat, canvasTex, tileTex, skyDome, floor, rug, pillar, flowerPot, glow, shadows } from '../room/kit.ts';

const PAL = { primary: 0xdc2626, secondary: 0xf472b6, accent: 0xf59e0b, light: 0xfff4e6, dark: 0x7f1d1d };
const RED = 0xdc2626;
const RED_DEEP = 0xb91c1c;
const GOLD = 0xf5b82e;
const JADE = 0x0f9d7a;
const PINKS = [0xffb3d1, 0xff8fbf, 0xffd1e3, 0xf472b6];

const BACK_Z = -5.5;
const WALL_LOW = 2.7;          // 2 đoạn tường thấp hai bên (thấy trời + diều phía trên)
const WALL_HIGH = 3.7;         // đoạn giữa có cửa trăng
const STEP_X = 3.45;           // chỗ tường đổi độ cao (có cột đỏ)
const GATE_R = 1.5, GATE_Y = 1.85;

// ---------------------------------------------------------------- texture

/** Vữa màu mơ, loang nhẹ. */
function plasterTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fde0c2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,236,214,0.35)' : 'rgba(255,190,150,0.12)';
      g.beginPath(); g.ellipse((i * 83) % w, (i * 59) % h, 14 + (i % 4) * 6, 8 + (i % 3) * 4, i, 0, Math.PI * 2); g.fill();
    }
  }, [1, 1]);
}

/** Ngói lưu ly vàng: sọc dọc + gờ sáng. repeat theo chiều dài mái. */
function tileRoofTex(len: number): THREE.CanvasTexture {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#f5b82e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = i * 32;
      const gr = g.createLinearGradient(x, 0, x + 32, 0);
      gr.addColorStop(0, '#d98f0f'); gr.addColorStop(0.45, '#ffd45e'); gr.addColorStop(1, '#d98f0f');
      g.fillStyle = gr; g.fillRect(x + 2, 0, 28, h);
    }
  }, [len * 3, 1]);
}

/** Xà vẽ hoa văn: nền ngọc bích, viền vàng, hoa đỏ. */
function beamTex(len: number): THREE.CanvasTexture {
  return canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#0f9d7a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f5b82e'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.ellipse(w / 2, h / 2, 26, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e11d48'; g.beginPath(); g.arc(w / 2, h / 2, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd45e'; g.beginPath(); g.arc(w / 2, h / 2, 2.5, 0, Math.PI * 2); g.fill();
  }, [Math.max(1, Math.round(len / 1.2)), 1]);
}

/** Ô cửa hoa (lậu song) tròn: nền trời xanh lá + song gỗ đỏ đan hình học. */
function latticeTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(0.65, '#c9f0c4'); gr.addColorStop(1, '#7fcf7a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff9ec7';
    for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 71) % w, 30 + (i * 43) % 120, 9, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#c81e1e'; g.lineWidth = 9; g.lineCap = 'square';
    const step = 42;
    for (let x = -w; x < w * 2; x += step) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke();
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke();
    }
    g.strokeStyle = '#f5b82e'; g.lineWidth = 5;
    for (let y = step / 2; y < h; y += step * 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}

// ---------------------------------------------------------------- kiến trúc

/** Tường sau: 2 đoạn thấp + đoạn giữa cao có cửa trăng khoét thủng. Đáy y=0, tâm x=0. UV theo mét. */
function moonGateWall(halfW: number, m: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(-halfW, 0); s.lineTo(halfW, 0); s.lineTo(halfW, WALL_LOW); s.lineTo(STEP_X, WALL_LOW); s.lineTo(STEP_X, WALL_HIGH);
  s.lineTo(-STEP_X, WALL_HIGH); s.lineTo(-STEP_X, WALL_LOW); s.lineTo(-halfW, WALL_LOW); s.lineTo(-halfW, 0);
  const hole = new THREE.Path();
  hole.absarc(0, GATE_Y, GATE_R, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geo = new THREE.ShapeGeometry(s, 48);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 2; uv[i * 2 + 1] = pos.getY(i) / 2; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  return mesh;
}

/** Mái ngói vàng chữ Λ trên đỉnh tường: 2 mái dốc + nóc + đầu đao cong vểnh 2 đầu + xà vẽ ngọc bích. Gốc = đỉnh tường. */
function roofCap(len: number, depth = 0.8): THREE.Group {
  const g = new THREE.Group();
  const tiles = texMat(tileRoofTex(len), { rough: 0.45 });
  for (const s of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, depth * 0.62), tiles);
    slab.position.set(0, 0.16, s * depth * 0.25);
    slab.rotation.x = s * 0.5;
    slab.castShadow = true;
    g.add(slab);
  }
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len + 0.1, 10), mat(0xe39a14, { rough: 0.4 }));
  ridge.rotation.z = Math.PI / 2;
  ridge.position.y = 0.3;
  g.add(ridge);
  const band = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.32), texMat(beamTex(len), { rough: 0.6 }));
  band.position.y = 0.02;
  g.add(band);
  // đầu đao cong vểnh
  const tipM = mat(GOLD, { rough: 0.4 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 8), tipM);
      tip.position.set(sx * (len / 2 + 0.05), 0.2, sz * depth * 0.42);
      tip.rotation.set(sz * 0.5, 0, -sx * 0.85);
      g.add(tip);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(RED, { rough: 0.5 }));
    knob.position.set(sx * (len / 2 + 0.02), 0.34, 0);
    g.add(knob);
  }
  return g;
}

// ---------------------------------------------------------------- cây hoa đào

interface BlossomSpec { root: THREE.Vector3; trunk: THREE.Vector3[]; branches: THREE.Vector3[][]; crowns: [number, number, number, number, number][] }

/** Dựng nhiều cây đào: thân + cành (ống cong) và TẤT CẢ chùm hoa gộp 1 InstancedMesh. */
function blossomTrees(root: THREE.Group, specs: BlossomSpec[]): THREE.InstancedMesh {
  const bark = mat(0x8b4f3a, { rough: 0.85 });
  const blobs: [number, number, number, number, number][] = [];   // x y z scale màu
  for (const sp of specs) {
    const tc = new THREE.CatmullRomCurve3([sp.root, ...sp.trunk]);
    root.add(shadows(new THREE.Mesh(new THREE.TubeGeometry(tc, 20, 0.13, 8, false), bark)));
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), bark);
    base.scale.set(1.2, 0.5, 1.2);
    base.position.copy(sp.root);
    root.add(base);
    for (const br of sp.branches) {
      const bc = new THREE.CatmullRomCurve3(br);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(bc, 12, 0.06, 6, false), bark));
    }
    for (const [cx, cy, cz, r, n] of sp.crowns) {
      for (let i = 0; i < n; i++) {
        const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), k = Math.cbrt(Math.random());
        blobs.push([cx + Math.sin(v) * Math.cos(u) * r * k, cy + Math.cos(v) * r * 0.6 * k, cz + Math.sin(v) * Math.sin(u) * r * 0.6 * k, 0.7 + Math.random() * 0.6, i % PINKS.length]);
      }
    }
  }
  const geo = new THREE.IcosahedronGeometry(0.2, 1);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 }), blobs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  blobs.forEach(([x, y, z, sc, ci], i) => {
    p.set(x, y, z); s.setScalar(sc); q.setFromAxisAngle(p.clone().normalize(), i);
    m4.compose(p, q, s);
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, c.setHex(PINKS[ci]));
  });
  inst.castShadow = true;
  root.add(inst);
  return inst;
}

// ---------------------------------------------------------------- đồ vật

/** Đèn lồng đỏ tròn kiểu Trung Hoa: thân đỏ tự sáng, nắp vàng, tua vàng, dây treo. Gốc = điểm treo. */
function redLantern(size: number, cord: number): { obj: THREE.Group; halo: THREE.Sprite; body: THREE.Object3D } {
  const g = new THREE.Group();
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, cord, 4), mat(0x7f1d1d));
  line.position.y = -cord / 2;
  g.add(line);
  const body = new THREE.Group();
  body.position.y = -cord - size * 0.5;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(size * 0.5, 18, 12), glowMat(0xe8262f));
  ball.scale.y = 0.85;
  body.add(ball);
  const ribM = glowMat(0xb3121c);
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(size * 0.5, size * 0.012, 4, 24), ribM);
    rib.rotation.y = (i / 4) * Math.PI;
    rib.scale.y = 0.85;
    body.add(rib);
  }
  const capM = mat(GOLD, { rough: 0.35, emissive: 0x7a4a00, ei: 0.4 });
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.2, size * 0.24, size * 0.12, 12), capM);
    cap.position.y = s * size * 0.44;
    body.add(cap);
  }
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.03, size * 0.09, size * 0.5, 8), capM);
  tassel.position.y = -size * 0.78;
  body.add(tassel);
  const halo = glow(0xff7a4a, size * 3.2, 0.45);
  body.add(halo);
  g.add(body);
  return { obj: g, halo, body };
}

/** Tranh cuộn treo tường (giấy kem, viền lụa ngọc bích, trục gỗ đỏ đầu vàng). Tâm tranh ở gốc, mặt hướng +z. */
function hangingScroll(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Group {
  const g = new THREE.Group();
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.14, h + 0.3), mat(0x2bb391, { rough: 0.8 }));
  g.add(silk);
  const tex = canvasTex(256, Math.round(256 * h / w), (c, cw, ch) => {
    c.fillStyle = '#fff4dc'; c.fillRect(0, 0, cw, ch);
    draw(c, cw, ch);
  });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(tex, { rough: 0.9 }));
  paper.position.z = 0.01;
  g.add(paper);
  const rodM = mat(RED_DEEP, { rough: 0.5 });
  const endM = mat(GOLD, { rough: 0.4 });
  for (const y of [h / 2 + 0.17, -h / 2 - 0.17]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, w + 0.3, 10), rodM);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, y, 0.03);
    g.add(rod);
    for (const s of [-1, 1]) {
      const end = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), endM);
      end.position.set(s * (w / 2 + 0.16), y, 0.03);
      g.add(end);
    }
  }
  return g;
}

/** Quạt xếp mở (hình rẻ quạt): nền đỏ, cành đào hồng, nan vàng. Tâm = chốt quạt, mặt hướng +z. */
function foldingFan(r: number): THREE.Group {
  const g = new THREE.Group();
  const a0 = Math.PI * 0.08, a1 = Math.PI * 0.84;
  const tex = canvasTex(512, 512, (c, w, h) => {
    const cx = w / 2, cy = h / 2;
    const gr = c.createRadialGradient(cx, cy, w * 0.1, cx, cy, w * 0.5);
    gr.addColorStop(0, '#ff6b6b'); gr.addColorStop(1, '#c81e3c');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // cành đào
    c.strokeStyle = '#6b2f1f'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(cx - 180, cy - 60); c.quadraticCurveTo(cx - 40, cy - 190, cx + 170, cy - 120); c.stroke();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(cx - 60, cy - 150); c.quadraticCurveTo(cx - 10, cy - 220, cx + 40, cy - 230); c.stroke();
    const blossom = (x: number, y: number, s: number) => {
      c.fillStyle = '#ffd1e3';
      for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.8, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffd45e'; c.beginPath(); c.arc(x, y, s * 0.45, 0, Math.PI * 2); c.fill();
    };
    for (const [x, y, s] of [[-150, -95, 13], [-90, -150, 15], [-20, -175, 12], [40, -165, 16], [110, -140, 13], [160, -118, 11], [30, -228, 12], [-60, -205, 10]] as const) blossom(cx + x, cy + y, s);
    // nan quạt
    c.strokeStyle = 'rgba(245,184,46,0.85)'; c.lineWidth = 3;
    for (let i = 0; i <= 14; i++) {
      const a = a0 + (i / 14) * (a1 - a0);
      c.beginPath(); c.moveTo(cx + Math.cos(a) * w * 0.12, cy - Math.sin(a) * h * 0.12); c.lineTo(cx + Math.cos(a) * w * 0.5, cy - Math.sin(a) * h * 0.5); c.stroke();
    }
    c.strokeStyle = '#f5b82e'; c.lineWidth = 10;
    c.beginPath(); c.arc(cx, cy, w * 0.49, -a1, -a0); c.stroke();
  });
  const leaf = new THREE.Mesh(new THREE.RingGeometry(r * 0.24, r, 40, 1, a0, a1 - a0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }));
  g.add(leaf);
  // nan gỗ phần dưới (lộ ra dưới giấy)
  const stickM = mat(0xb45309, { rough: 0.5 });
  for (let i = 0; i <= 8; i++) {
    const a = a0 + (i / 8) * (a1 - a0);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.018, r * 0.26, 0.01), stickM);
    stick.position.set(Math.cos(a) * r * 0.13, Math.sin(a) * r * 0.13, 0.005);
    stick.rotation.z = a - Math.PI / 2;
    g.add(stick);
  }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), mat(GOLD));
  pin.rotation.x = Math.PI / 2;
  g.add(pin);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.04, 0.3, 8), mat(RED));
  tassel.position.set(0, -0.17, 0.02);
  g.add(tassel);
  return g;
}

/** Trống trận đỏ trên giá gỗ, mặt trống hướng +z. userData.drum = thân trống (nhịp khi tỉnh). */
function warDrum(): THREE.Group {
  const g = new THREE.Group();
  const standM = mat(0x9a2a1c, { rough: 0.6 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.07), standM);
      leg.position.set(sx * 0.38, 0.45, sz * 0.2);
      leg.rotation.z = sx * 0.12;
      g.add(leg);
    }
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), standM);
  bar.position.set(0, 0.3, 0);
  g.add(bar);
  const drum = new THREE.Group();
  drum.position.y = 1.0;
  const bodyProf = [[0.34, -0.25], [0.39, -0.12], [0.41, 0], [0.39, 0.12], [0.34, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyProf, 28), mat(RED, { rough: 0.45, side: THREE.DoubleSide }));
  body.rotation.x = Math.PI / 2;
  drum.add(body);
  const headM = mat(0xfdecc8, { rough: 0.8 });
  const studM = mat(GOLD, { rough: 0.35 });
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), headM);
    head.position.z = s * 0.25;
    head.rotation.y = s < 0 ? Math.PI : 0;
    drum.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.02, 6, 28), studM);
    ring.position.z = s * 0.24;
    drum.add(ring);
  }
  // hoạ tiết âm dương/hoa đỏ giữa mặt trống
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), mat(RED, { rough: 0.6 }));
  emblem.position.z = 0.252;
  drum.add(emblem);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), mat(GOLD));
  dot.position.z = 0.254;
  drum.add(dot);
  for (const s of [-1, 1]) {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), studM);
    hook.position.set(s * 0.41, 0.0, 0);
    hook.rotation.y = Math.PI / 2;
    drum.add(hook);
  }
  g.add(drum);
  // 2 dùi trống bắt chéo dựa bên giá
  for (const s of [-1, 1]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.55, 8), mat(0xd08a3c));
    stick.position.set(0.5, 0.3, s * 0.06);
    stick.rotation.z = -0.35;
    stick.rotation.x = s * 0.25;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(RED));
    ball.position.set(0.5 + Math.sin(0.35) * 0.27, 0.3 + Math.cos(0.35) * 0.27, s * 0.06 + s * 0.07);
    g.add(stick, ball);
  }
  shadows(g);
  g.userData.drum = drum;
  return g;
}

/** Đèn đá trong vườn: đế, cột, bệ, hộp lửa sáng, mái lục giác. Đáy y=0. userData.glow = quầng lửa. */
function stoneLantern(): THREE.Group {
  const g = new THREE.Group();
  const stone = mat(0xe8d5b0, { rough: 0.9 });
  const parts: [THREE.BufferGeometry, number][] = [
    [new THREE.CylinderGeometry(0.28, 0.32, 0.14, 6), 0.07],
    [new THREE.CylinderGeometry(0.09, 0.11, 0.55, 10), 0.41],
    [new THREE.CylinderGeometry(0.26, 0.22, 0.08, 6), 0.72],
  ];
  for (const [geo, y] of parts) { const m = new THREE.Mesh(geo, stone); m.position.y = y; g.add(m); }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), stone);
    post.position.set(Math.cos(a) * 0.15, 0.9, Math.sin(a) * 0.15);
    g.add(post);
  }
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glowMat(0xffb347));
  fire.position.y = 0.9;
  g.add(fire);
  const halo = glow(0xffa94d, 0.9, 0.5);
  halo.position.y = 0.9;
  g.add(halo);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.24, 6), stone);
  roof.position.y = 1.16;
  g.add(roof);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), stone);
  knob.position.y = 1.3;
  g.add(knob);
  shadows(g);
  g.userData.glow = halo;
  return g;
}

/** Bình sứ trắng xanh cắm cành đào. Đáy y=0. */
function blossomVase(): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f4f8ff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2458c7'; c.lineWidth = 6;
    for (const y of [22, 40, h - 30]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const x = 32 + i * 64, y = h * 0.55;
      c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - 30, y + 40); c.quadraticCurveTo(x, y + 10, x + 30, y + 40); c.stroke();
    }
  });
  const prof = [[0.0, 0], [0.16, 0], [0.2, 0.08], [0.25, 0.3], [0.22, 0.48], [0.1, 0.62], [0.09, 0.72], [0.14, 0.8]].map(([r, y]) => new THREE.Vector2(r, y));
  const vase = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0, side: THREE.DoubleSide }));
  g.add(vase);
  const bark = mat(0x8b4f3a, { rough: 0.85 });
  const tips: THREE.Vector3[] = [];
  for (const [dx, dz, hh] of [[-0.35, 0.05, 1.15], [0.3, -0.05, 1.05], [0.05, 0.15, 1.35]] as const) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.65, 0), new THREE.Vector3(dx * 0.4, 0.9, dz * 0.4), new THREE.Vector3(dx, hh, dz)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.02, 5, false), bark));
    for (let i = 0; i < 9; i++) tips.push(curve.getPoint(0.35 + (i / 9) * 0.65));
  }
  const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 }), tips.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
  tips.forEach((p, i) => {
    const pp = p.clone().add(new THREE.Vector3(Math.sin(i * 3.1) * 0.05, Math.cos(i * 2.3) * 0.04, Math.sin(i * 1.7) * 0.05));
    s.setScalar(0.8 + (i % 3) * 0.25);
    m4.compose(pp, q, s);
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, c.setHex(PINKS[i % PINKS.length]));
  });
  g.add(inst);
  shadows(g);
  return g;
}

/** Dế mèn may mắn (Cri-Kee). Chân ở y=0, đầu hướng +z. */
function cricket(): THREE.Group {
  const g = new THREE.Group();
  const green = mat(0x65b832, { rough: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 4, 10), green);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.04;
  g.add(body);
  const wing = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.07, 4, 8), mat(0x3f8f1f, { rough: 0.6 }));
  wing.rotation.x = Math.PI / 2;
  wing.scale.set(1, 1, 0.5);
  wing.position.set(0, 0.062, -0.01);
  g.add(wing);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), green);
  head.position.set(0, 0.05, 0.075);
  g.add(head);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), mat(0x1f1235));
    eye.position.set(s * 0.022, 0.065, 0.095);
    g.add(eye);
    const ant = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.012, 0.075, 0.1), new THREE.Vector3(s * 0.05, 0.16, 0.14), new THREE.Vector3(s * 0.09, 0.2, 0.08)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(ant, 8, 0.003, 3, false), mat(0x2f6a16)));
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.015), green);
    thigh.position.set(s * 0.035, 0.07, -0.02);
    thigh.rotation.x = -0.9;
    g.add(thigh);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.01), green);
    shin.position.set(s * 0.04, 0.035, -0.06);
    shin.rotation.x = 0.8;
    g.add(shin);
  }
  shadows(g);
  return g;
}

/** Bàn trà thấp sơn đỏ + ấm trà men ngọc + 2 chén. Mặt bàn ở y=0.45. */
function teaTable(): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.62), mat(RED, { rough: 0.35 }));
  top.position.y = 0.42;
  g.add(top);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.02, 0.66), mat(GOLD, { rough: 0.4 }));
  edge.position.y = 0.45;
  g.add(edge);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), mat(RED_DEEP, { rough: 0.5 }));
    leg.position.set(sx * 0.43, 0.2, sz * 0.25);
    g.add(leg);
  }
  const cel = mat(0x5fd3bc, { rough: 0.25 });
  const pot = new THREE.Group();
  pot.position.set(-0.15, 0.46, 0);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), cel);
  belly.scale.y = 0.78;
  belly.position.y = 0.085;
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cel);
  lid.position.y = 0.16;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat(GOLD));
  knob.position.y = 0.225;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, 0.13, 8), cel);
  spout.position.set(0.13, 0.12, 0);
  spout.rotation.z = -0.9;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI * 1.2), cel);
  handle.position.set(-0.11, 0.1, 0);
  handle.rotation.z = Math.PI * 0.4;
  pot.add(belly, lid, knob, spout, handle);
  g.add(pot);
  for (const [x, z] of [[0.18, 0.12], [0.3, -0.08]] as const) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 0.055, 14), cel);
    cup.position.set(x, 0.48, z);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.038, 12), mat(0xd9a23a, { rough: 0.2 }));
    tea.rotation.x = -Math.PI / 2;
    tea.position.set(x, 0.503, z);
    g.add(cup, tea);
  }
  // 2 đệm ngồi
  for (const [x, c] of [[-0.8, 0xf472b6], [0.8, GOLD]] as const) {
    const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 20), mat(c, { rough: 0.95 }));
    cush.position.set(x, 0.06, 0.1);
    g.add(cush);
  }
  shadows(g);
  return g;
}

/**
 * Rồng đỏ tí hon kiểu Mushu ngồi, mặt hướng +z. Trả các khớp để hoạt cảnh:
 * head (gật/nghiêng), eyes (chớp/ngủ), arm (vẫy), tail (ve vẩy), snout (điểm phun lửa).
 */
function littleDragon(): { obj: THREE.Group; head: THREE.Object3D; eyes: THREE.Object3D[]; arm: THREE.Object3D; tail: THREE.Object3D; snout: THREE.Object3D } {
  const g = new THREE.Group();
  const red = mat(0xe0252f, { rough: 0.55 });
  const gold = mat(0xfbbf24, { rough: 0.45 });
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), red);
  torso.scale.set(1, 1.35, 0.9);
  torso.position.y = 0.3;
  g.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), gold);
  belly.scale.set(0.9, 1.3, 0.55);
  belly.position.set(0, 0.28, 0.09);
  g.add(belly);
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.1 - i * 0.012, 0.008, 4, 16, Math.PI), mat(0xe39a14));
    stripe.position.set(0, 0.2 + i * 0.08, 0.13);
    stripe.rotation.z = Math.PI;
    g.add(stripe);
  }
  // gai lưng
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), gold);
    fin.position.set(0, 0.48 - i * 0.1, -0.13 + i * 0.01);
    fin.rotation.x = -1.2;
    g.add(fin);
  }
  // chân ngồi
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 8), red);
    leg.rotation.x = Math.PI / 2;
    leg.position.set(s * 0.1, 0.07, 0.08);
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), gold);
    foot.scale.set(1, 0.55, 1.2);
    foot.position.set(s * 0.1, 0.03, 0.17);
    g.add(foot);
  }
  // tay: trái buông, phải (arm) vẫy được
  let arm: THREE.Object3D = g;
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.14, 0.4, 0.04);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.033, 0.12, 4, 8), red);
    a.position.y = -0.08;
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), gold);
    claw.position.y = -0.17;
    pivot.add(a, claw);
    pivot.rotation.z = s * 0.35;
    pivot.rotation.x = -0.3;
    g.add(pivot);
    if (s > 0) arm = pivot;
  }
  // đuôi cong nằm trên đá, chóp đuôi vàng hình ngọn lửa
  const tail = new THREE.Group();
  tail.position.set(0, 0.1, -0.12);
  const tc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.12, -0.06, -0.18), new THREE.Vector3(0.32, -0.07, -0.22),
    new THREE.Vector3(0.46, -0.03, -0.08), new THREE.Vector3(0.48, 0.06, 0.06),
  ]);
  tail.add(new THREE.Mesh(new THREE.TubeGeometry(tc, 20, 0.045, 8, false), red));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), gold);
  tip.position.set(0.48, 0.13, 0.08);
  tail.add(tip);
  g.add(tail);
  // đầu
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0.04);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), red);
  skull.scale.set(1, 0.9, 1.05);
  head.add(skull);
  const snoutM = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), red);
  snoutM.scale.set(1.05, 0.7, 1.35);
  snoutM.position.set(0, -0.04, 0.14);
  head.add(snoutM);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 14, Math.PI), mat(0x7f1d1d));
  smile.position.set(0, -0.07, 0.25);
  smile.rotation.z = Math.PI;
  head.add(smile);
  for (const s of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), mat(0x7f1d1d));
    nostril.position.set(s * 0.035, -0.005, 0.275);
    head.add(nostril);
    const eye = new THREE.Group();
    eye.position.set(s * 0.068, 0.05, 0.1);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), mat(0xffffff, { rough: 0.3 }));
    white.scale.z = 0.7;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), mat(0x1f1235, { rough: 0.2 }));
    pupil.position.z = 0.03;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), glowMat(0xffffff));
    shine.position.set(0.01, 0.012, 0.052);
    eye.add(white, pupil, shine);
    head.add(eye);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.15, 8), gold);
    horn.position.set(s * 0.06, 0.14, -0.05);
    horn.rotation.set(-0.7, 0, -s * 0.3);
    head.add(horn);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), gold);
    ear.scale.z = 0.4;
    ear.position.set(s * 0.14, 0.03, -0.02);
    ear.rotation.z = -s * 1.2;
    head.add(ear);
    const wc = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.07, -0.03, 0.24), new THREE.Vector3(s * 0.17, -0.02, 0.26), new THREE.Vector3(s * 0.26, -0.08, 0.2)]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(wc, 8, 0.006, 4, false), gold));
    head.userData['eye' + s] = eye;
  }
  for (let i = 0; i < 3; i++) {
    const mane = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), gold);
    mane.position.set(0, 0.1 - i * 0.07, -0.13 - i * 0.02);
    mane.rotation.x = -1.3;
    head.add(mane);
  }
  const snout = new THREE.Object3D();
  snout.position.set(0, -0.03, 0.32);
  head.add(snout);
  g.add(head);
  shadows(g);
  return { obj: g, head, eyes: [head.userData['eye-1'] as THREE.Object3D, head.userData.eye1 as THREE.Object3D], arm, tail, snout };
}

/** Cá chép đỏ cam đốm trắng. Mũi hướng +z. */
function koi(color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(color, { rough: 0.4 }));
  body.scale.set(0.45, 0.35, 1.2);
  g.add(body);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0xfff7ed, { rough: 0.4 }));
  spot.scale.set(0.9, 0.5, 1.2);
  spot.position.set(0, 0.025, 0.02);
  g.add(spot);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 6), mat(color, { rough: 0.4 }));
  fin.scale.x = 0.25;
  fin.rotation.x = Math.PI / 2;
  fin.position.z = -0.15;
  g.add(fin);
  return g;
}

/** Cầu cong đỏ bắc qua hồ (dọc trục x). Đáy 2 đầu ở y=0. */
function archBridge(span: number, rise: number): THREE.Group {
  const g = new THREE.Group();
  const deckM = mat(0xe35b3a, { rough: 0.6 });
  const railM = mat(RED, { rough: 0.5 });
  const n = 10;
  const yAt = (x: number) => rise * Math.cos((x / span) * Math.PI);   // x ∈ [-span/2, span/2]
  for (let i = 0; i < n; i++) {
    const x0 = -span / 2 + (i / n) * span, x1 = x0 + span / n;
    const y0 = yAt(x0), y1 = yAt(x1);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.1, 1.1), deckM);
    plank.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    plank.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    g.add(plank);
  }
  for (const z of [-0.52, 0.52]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) { const x = -span / 2 + (i / 16) * span; pts.push(new THREE.Vector3(x, yAt(x) + 0.5, z)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.04, 6, false), railM));
    for (let i = 0; i <= 6; i++) {
      const x = -span / 2 + (i / 6) * span;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6), railM);
      post.position.set(x, yAt(x) + 0.27, z);
      g.add(post);
    }
  }
  return g;
}

/** Đình lục giác: nền, 6 cột đỏ, mái vàng, chóp. Đáy y=0. */
function pavilion(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.3, 6), mat(0xf6e3c4, { rough: 0.9 }));
  base.position.y = 0.15;
  g.add(base);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8), mat(RED, { rough: 0.5 }));
    col.position.set(Math.cos(a) * 1.0, 1.2, Math.sin(a) * 1.0);
    g.add(col);
  }
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.14, 6), mat(JADE, { rough: 0.6 }));
  eave.position.y = 2.15;
  g.add(eave);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.0, 6), mat(GOLD, { rough: 0.45 }));
  roof.position.y = 2.7;
  g.add(roof);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(RED));
  fin.position.y = 3.28;
  g.add(fin);
  return g;
}

/** Chùa tháp 5 tầng: thân đỏ, mái ngọc bích, chóp vàng. Đáy y=0. */
function pagoda(h: number): THREE.Group {
  const g = new THREE.Group();
  const tiers = 5;
  const th = (h * 0.85) / tiers;
  for (let i = 0; i < tiers; i++) {
    const w = 1.6 - i * 0.22;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, th * 0.7, w), mat(RED, { rough: 0.6 }));
    body.position.y = i * th + th * 0.35;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.95, th * 0.45, 4), mat(JADE, { rough: 0.5 }));
    roof.position.y = i * th + th * 0.8;
    roof.rotation.y = Math.PI / 4;
    g.add(body, roof);
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, h * 0.15, 8), mat(GOLD, { rough: 0.4 }));
  spire.position.y = h * 0.85 + h * 0.075;
  g.add(spire);
  return g;
}

/** Diều hình cánh én đỏ vàng (mặt phẳng có alpha) + đuôi. */
function kite(main: string, trim: string): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = main;
    c.beginPath(); c.moveTo(w / 2, 10); c.lineTo(w - 12, h * 0.42); c.lineTo(w / 2, h - 20); c.lineTo(12, h * 0.42); c.closePath(); c.fill();
    c.strokeStyle = trim; c.lineWidth = 10; c.stroke();
    c.fillStyle = trim; c.beginPath(); c.arc(w / 2, h * 0.42, 32, 0, Math.PI * 2); c.fill();
    c.fillStyle = main; c.beginPath(); c.arc(w / 2, h * 0.42, 16, 0, Math.PI * 2); c.fill();
    c.strokeStyle = trim; c.lineWidth = 4;
    c.beginPath(); c.moveTo(w / 2, 10); c.lineTo(w / 2, h - 20); c.moveTo(12, h * 0.42); c.lineTo(w - 12, h * 0.42); c.stroke();
  });
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  g.add(sail);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 0.18, -0.7 - i * 0.28, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4, false), glowMat(0xf5b82e)));
  return g;
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

interface Lotus { pos: THREE.Vector3; scale: number }
interface Koi { obj: THREE.Group; cx: number; cz: number; rx: number; rz: number; speed: number; phase: number }
interface Kite { obj: THREE.Group; x: number; y: number; phase: number }

interface MulanState {
  petals: THREE.InstancedMesh;
  petalData: Float32Array;          // x, y, z, tốc độ rơi, pha, cỡ  (6 số / cánh)
  lanterns: { obj: THREE.Group; halo: THREE.Sprite; seed: number }[];
  dragon: ReturnType<typeof littleDragon>;
  drum: THREE.Object3D;
  stoneGlow: THREE.Sprite;
  lotusPetals: THREE.InstancedMesh;
  lotus: Lotus[];
  lotusBloom: number;
  koi: Koi[];
  kites: Kite[];
  cricket: THREE.Group;
  water: THREE.CanvasTexture;
  gateGlow: THREE.Sprite;
  sunLight: THREE.PointLight;
  puff: number;
  beat: number;
}

const PETAL_N = 170;
const LOTUS_PETALS = 8;
const tmpV = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();

function spawnPetal(d: Float32Array, i: number, anyY: boolean): void {
  const o = i * 6;
  d[o] = (Math.random() - 0.5) * 10;
  d[o + 1] = anyY ? Math.random() * 4.2 : 3.6 + Math.random() * 0.8;
  d[o + 2] = -5.2 + Math.random() * 5.8;
  d[o + 3] = 0.25 + Math.random() * 0.25;
  d[o + 4] = Math.random() * 10;
  d[o + 5] = 0.8 + Math.random() * 0.5;
}

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;
  const before = new Set(root.children);

  // --- ngoài cổng: trời, núi xa, cỏ, hồ sen, cầu, đình, chùa tháp, cây đào, diều
  const dome = skyDome(0x7cc4ff, 0xffe4ec, 80);
  dome.position.set(0, -12, -10);
  root.add(dome);
  const sun = glow(0xfff1c2, 9, 0.75);
  sun.position.set(9, 9, -50);
  root.add(sun);
  for (const [x, z, r, h, c] of [[-14, -55, 11, 16, 0xc4b5fd], [-2, -62, 13, 20, 0xb4c8f0], [11, -56, 10, 14, 0xa5d8cc], [22, -60, 12, 18, 0xc4b5fd], [-26, -60, 12, 15, 0xa5d8cc]] as const) {
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat(c, { rough: 1, flat: true }));
    mtn.position.set(x, h / 2 - 0.5, z);
    root.add(mtn);
  }
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), mat(0x9ad97a, { rough: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -0.03, -50);
  grass.receiveShadow = true;
  root.add(grass);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), mat(0xf2d7ae, { rough: 1 }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.005, -6.0);
  root.add(path);
  // hồ sen: mặt nước texture gợn sóng (trượt offset trong ambient)
  const water = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4cc3e6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const y = (i * 37) % h, x = (i * 61) % w;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 6, x + 40, y); g.stroke();
    }
  }, [6, 4]);
  const pond = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ map: water, roughness: 0.15, metalness: 0 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(0, 0.01, -11.6);
  root.add(pond);
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(20.6, 10.6), mat(0xe8cf9f, { rough: 1 }));
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(0, 0.0, -11.6);
  root.add(bank);
  // lá sen + hoa sen (instanced)
  const lotus: Lotus[] = [];
  const lotusSpots: [number, number, number][] = [[-1.6, -8.4, 1], [1.3, -8.8, 1.1], [-2.4, -10.2, 0.9], [2.3, -10.4, 1], [-0.9, -9.6, 0.8], [1.9, -7.9, 0.8], [-3.2, -8.3, 1]];
  const padGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.02, 16, 1, false, 0.3, Math.PI * 2 - 0.3);
  const pads = new THREE.InstancedMesh(padGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0, side: THREE.DoubleSide }), 16);
  const padC = [0x3fae52, 0x57c46a, 0x2f9a48].map((c) => new THREE.Color(c));
  for (let i = 0; i < 16; i++) {
    const [lx, lz] = lotusSpots[i % lotusSpots.length];
    tmpV.set(lx + (i >= lotusSpots.length ? (Math.sin(i * 3) * 0.7) : 0.35), 0.03, lz + (i >= lotusSpots.length ? Math.cos(i * 2) * 0.6 : 0.25));
    tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.3);
    tmpS.setScalar(0.8 + (i % 4) * 0.15);
    tmpM.compose(tmpV, tmpQ, tmpS);
    pads.setMatrixAt(i, tmpM);
    pads.setColorAt(i, padC[i % 3]);
  }
  root.add(pads);
  const petalGeo = new THREE.SphereGeometry(0.09, 8, 6);
  petalGeo.scale(0.5, 1, 0.22);
  petalGeo.translate(0, 0.09, 0);
  const lotusPetals = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 }), lotusSpots.length * LOTUS_PETALS);
  const lc = [0xf472b6, 0xfb9ccb, 0xec4899].map((c) => new THREE.Color(c));
  const centerGeo = new THREE.CylinderGeometry(0.05, 0.035, 0.05, 10);
  const centers = new THREE.InstancedMesh(centerGeo, mat(0xfacc15, { rough: 0.5 }), lotusSpots.length);
  lotusSpots.forEach(([x, z, s], k) => {
    lotus.push({ pos: new THREE.Vector3(x, 0.04, z), scale: s * 1.6 });
    for (let j = 0; j < LOTUS_PETALS; j++) lotusPetals.setColorAt(k * LOTUS_PETALS + j, lc[(j + k) % 3]);
    tmpV.set(x, 0.08, z); tmpQ.identity(); tmpS.setScalar(s * 1.6);
    tmpM.compose(tmpV, tmpQ, tmpS);
    centers.setMatrixAt(k, tmpM);
  });
  root.add(lotusPetals, centers);
  // cá chép
  const kois: Koi[] = [];
  for (const [cx, cz, rx, rz, sp, ph, c] of [[-1.6, -9.6, 0.8, 0.5, 0.7, 0, 0xff7a1a], [1.5, -9.9, 0.7, 0.55, 0.6, 2, 0xef4444], [0.0, -11.2, 1.6, 0.6, 0.5, 4, 0xffa21a]] as const) {
    const f = mergeStatic(koi(c)) as THREE.Group;
    f.scale.setScalar(1.6);
    root.add(f);
    kois.push({ obj: f, cx, cz, rx, rz, speed: sp, phase: ph });
  }
  const bridge = archBridge(6.4, 1.05);
  bridge.position.set(0, 0, -12.6);
  root.add(mergeStatic(bridge));
  const pav = pavilion();
  pav.position.set(2.4, 0, -17.5);
  pav.scale.setScalar(0.95);
  root.add(mergeStatic(pav));
  const pg = pagoda(5.4);
  pg.position.set(-2.5, 0, -30);
  root.add(mergeStatic(pg));
  const kites: Kite[] = [];
  for (const [x, y, z, a, b, ph] of [[-9, 6.3, -30, '#e11d48', '#f5b82e', 0], [8.5, 6.8, -32, '#f5b82e', '#e11d48', 2]] as const) {
    const k = mergeStatic(kite(a, b)) as THREE.Group;
    k.position.set(x, y, z);
    root.add(k);
    kites.push({ obj: k, x, y, phase: ph });
  }

  // --- tường sau có cửa trăng + mái ngói vàng + 2 cột đỏ chỗ tường đổi độ cao
  const plaster = texMat(plasterTex(), { rough: 0.95 });
  const wallM = moonGateWall(8.5, plaster);
  wallM.position.set(0, 0, BACK_Z);
  root.add(wallM);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(17, 0.3, 0.2), mat(0xf2c79b, { rough: 0.9 }));
  plinth.position.set(0, 0.15, BACK_Z + 0.1);
  root.add(plinth);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(GATE_R + 0.08, 0.13, 12, 72), mat(RED, { rough: 0.45 }));
  ring.position.set(0, GATE_Y, BACK_Z + 0.02);
  ring.castShadow = true;
  const ringIn = new THREE.Mesh(new THREE.TorusGeometry(GATE_R - 0.03, 0.04, 8, 72), mat(GOLD, { rough: 0.35 }));
  ringIn.position.set(0, GATE_Y, BACK_Z + 0.08);
  const sill = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24, 1, false, 0, Math.PI), mat(0xf2c79b, { rough: 0.9 }));
  sill.position.set(0, 0.04, BACK_Z);
  sill.rotation.y = -Math.PI / 2;
  root.add(ring, ringIn, sill);
  const capMid = roofCap(STEP_X * 2 + 0.3);
  capMid.position.set(0, WALL_HIGH, BACK_Z);
  root.add(mergeStatic(capMid));
  for (const s of [-1, 1]) {
    const len = 8.5 - STEP_X;
    const cap = roofCap(len);
    cap.position.set(s * (STEP_X + len / 2), WALL_LOW, BACK_Z);
    root.add(mergeStatic(cap));
    const col = pillar(WALL_HIGH + 0.1, 0.16, RED, GOLD);
    col.position.set(s * STEP_X, 0, BACK_Z + 0.2);
    shadows(col);
    root.add(mergeStatic(col));
    // ô cửa hoa tròn trên đoạn tường thấp
    const lw = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), texMat(latticeTex(), { rough: 0.8 }));
    lw.position.set(s * 5.25, 1.45, BACK_Z + 0.02);
    const lf = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 40), mat(RED, { rough: 0.5 }));
    lf.position.set(s * 5.25, 1.45, BACK_Z + 0.05);
    root.add(lw, lf);
    // tường bên thấp (màn rộng mới thấy)
    const side = new THREE.Mesh(new THREE.PlaneGeometry(9, WALL_LOW), texMat(plasterTex(), { rough: 0.95 }));
    side.position.set(s * 7.2, WALL_LOW / 2, -1.0);
    side.rotation.y = -s * Math.PI / 2;
    root.add(side);
    const sideCap = roofCap(9);
    sideCap.position.set(s * 7.2, WALL_LOW, -1.0);
    sideCap.rotation.y = Math.PI / 2;
    root.add(mergeStatic(sideCap));
  }
  // tranh cuộn con ngựa (bên trái cổng) + quạt xếp (bên phải cổng)
  const horseScroll = hangingScroll(0.62, 1.1, (c, w, h) => {
    c.fillStyle = 'rgba(120,150,190,0.35)';
    c.beginPath(); c.moveTo(0, h * 0.62); c.lineTo(w * 0.3, h * 0.35); c.lineTo(w * 0.55, h * 0.58); c.lineTo(w * 0.8, h * 0.3); c.lineTo(w, h * 0.5); c.lineTo(w, h * 0.7); c.lineTo(0, h * 0.72); c.fill();
    c.font = `${Math.round(w * 0.62)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🐎', w / 2, h * 0.7);
    c.fillStyle = '#d6263a'; c.fillRect(w * 0.76, h * 0.08, w * 0.14, w * 0.14);
    c.fillStyle = '#e8453c'; c.beginPath(); c.arc(w * 0.25, h * 0.16, w * 0.09, 0, Math.PI * 2); c.fill();
  });
  horseScroll.position.set(-2.62, 2.35, BACK_Z + 0.06);
  root.add(mergeStatic(horseScroll));
  const fan = foldingFan(0.7);
  fan.position.set(2.55, 1.9, BACK_Z + 0.05);
  root.add(mergeStatic(fan));

  // --- 2 cây hoa đào ở 2 góc sau + 1 cây ngoài hồ
  blossomTrees(root, [
    {
      root: new THREE.Vector3(-4.7, 0, -4.7),
      trunk: [new THREE.Vector3(-4.5, 1.2, -4.6), new THREE.Vector3(-4.0, 2.2, -4.4), new THREE.Vector3(-3.6, 2.8, -4.3)],
      branches: [
        [new THREE.Vector3(-3.9, 2.4, -4.4), new THREE.Vector3(-3.1, 3.0, -4.2), new THREE.Vector3(-2.5, 3.2, -4.0)],
        [new THREE.Vector3(-4.3, 1.9, -4.5), new THREE.Vector3(-5.1, 2.8, -4.7), new THREE.Vector3(-5.7, 3.3, -4.9)],
        [new THREE.Vector3(-3.7, 2.7, -4.3), new THREE.Vector3(-4.2, 3.5, -4.5), new THREE.Vector3(-4.0, 3.9, -4.6)],
      ],
      crowns: [[-2.7, 3.25, -4.1, 0.8, 22], [-3.7, 3.3, -4.3, 1.0, 28], [-5.2, 3.2, -4.7, 0.95, 26], [-4.2, 3.85, -4.6, 0.8, 18]],
    },
    {
      root: new THREE.Vector3(5.4, 0, -5.0),
      trunk: [new THREE.Vector3(5.1, 1.3, -4.9), new THREE.Vector3(4.6, 2.3, -4.6), new THREE.Vector3(4.2, 2.9, -4.5)],
      branches: [
        [new THREE.Vector3(4.5, 2.5, -4.6), new THREE.Vector3(3.7, 3.1, -4.3), new THREE.Vector3(3.0, 3.3, -4.1)],
        [new THREE.Vector3(4.9, 2.0, -4.8), new THREE.Vector3(5.6, 2.9, -5.0), new THREE.Vector3(6.1, 3.3, -5.1)],
        [new THREE.Vector3(4.3, 2.8, -4.5), new THREE.Vector3(4.7, 3.6, -4.7), new THREE.Vector3(4.5, 4.0, -4.8)],
      ],
      crowns: [[3.2, 3.3, -4.2, 0.8, 22], [4.2, 3.35, -4.5, 1.0, 28], [5.6, 3.25, -5.0, 0.95, 26], [4.6, 3.9, -4.8, 0.8, 18]],
    },
    {
      root: new THREE.Vector3(-3.6, 0, -15.5),
      trunk: [new THREE.Vector3(-3.5, 1.2, -15.5), new THREE.Vector3(-3.2, 2.1, -15.4)],
      branches: [[new THREE.Vector3(-3.3, 1.8, -15.4), new THREE.Vector3(-2.5, 2.4, -15.2)]],
      crowns: [[-3.1, 2.5, -15.4, 1.2, 30]],
    },
  ]);

  // --- sàn đá lát màu cát + thảm tròn vàng viền đỏ + vòng hồng
  const paving = floor(18, 14, texMat(tileTex(0xf4cf9a, 0xeebf84, [7, 6], 0xdca66c), { rough: 0.85 }));   // chỉ trong sân (ngoài cổng là hồ + cỏ)
  paving.position.z = BACK_Z + 7;
  root.add(paving);
  const carpet = rug(3.4, 2.5, 0xfde68a, RED);
  carpet.position.set(0, 0, 0.6);
  root.add(carpet);
  const inner = rug(2.3, 1.7, 0xfbcfe8, GOLD);
  inner.position.set(0, 0.012, 0.6);
  root.add(inner);

  // --- đèn lồng đỏ: 2 cái treo 2 bên cổng + 2 cái treo trong 2 cây đào
  const lanterns: MulanState['lanterns'] = [];
  for (const [x, y, z, size, cord] of [[-1.95, WALL_HIGH + 0.05, BACK_Z + 0.35, 0.5, 0.35], [1.95, WALL_HIGH + 0.05, BACK_Z + 0.35, 0.5, 0.35], [-3.3, 3.1, -4.1, 0.38, 0.4], [3.6, 3.15, -4.3, 0.38, 0.45]] as const) {
    const l = redLantern(size, cord);
    l.obj.position.set(x, y, z);
    root.add(l.obj);
    lanterns.push({ obj: l.obj, halo: l.halo, seed: x });
  }
  // xà treo đèn 2 bên cổng
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.45), mat(RED_DEEP));
    arm.position.set(s * 1.95, WALL_HIGH + 0.05, BACK_Z + 0.2);
    root.add(arm);
  }

  // --- bên phải: rồng Mushu trên tảng đá, trống trận, bàn trà + dế
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), mat(0xe6cfa3, { rough: 0.95, flat: true }));
  rock.scale.set(1.25, 0.6, 1.0);
  rock.position.set(3.05, 0.25, -2.5);
  rock.castShadow = true; rock.receiveShadow = true;
  root.add(rock);
  const moss = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6), mat(0x6cc75a, { rough: 1 }));
  moss.scale.set(1.2, 0.35, 0.9);
  moss.position.set(3.45, 0.36, -2.25);
  root.add(moss);
  const dragon = littleDragon();
  dragon.obj.position.set(3.0, 0.5, -2.5);
  dragon.obj.scale.setScalar(1.65);
  dragon.obj.rotation.y = -0.45;
  root.add(dragon.obj);
  const drum = warDrum();
  drum.position.set(4.35, 0, -3.6);
  drum.rotation.y = -0.35;
  root.add(drum);
  const teaRaw = teaTable();
  teaRaw.position.set(3.35, 0, -0.8);
  teaRaw.rotation.y = -0.25;
  const tea = mergeStatic(teaRaw);
  root.add(tea);
  const cri = cricket();          // dế ngồi trên bàn trà (toạ độ trong bàn)
  cri.position.set(0.33, 0.455, 0.2);
  cri.rotation.y = -1.2;
  cri.scale.setScalar(1.6);
  tea.add(cri);

  // --- bên trái: đèn đá + bình hoa đào + 2 chậu hoa 2 bên cổng
  const stone = stoneLantern();
  stone.position.set(-4.75, 0, -3.6);
  stone.scale.setScalar(1.2);
  root.add(stone);
  const vase = blossomVase();
  vase.position.set(-3.6, 0, -0.9);
  vase.scale.setScalar(1.1);
  root.add(vase);
  for (const s of [-1, 1]) {
    const pot = flowerPot(0x2458c7, [0xf472b6, 0xffd1e3, GOLD, 0xec4899], 0x4caf50);
    pot.position.set(s * 2.3, 0, BACK_Z + 0.55);
    pot.scale.setScalar(1.5);
    root.add(mergeStatic(pot));
  }

  // --- cánh hoa đào rơi (instanced, cập nhật trong ambient)
  const petalShape = new THREE.PlaneGeometry(0.075, 0.055);
  const petals = new THREE.InstancedMesh(petalShape, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }), PETAL_N);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const petalData = new Float32Array(PETAL_N * 6);
  const pc = new THREE.Color();
  for (let i = 0; i < PETAL_N; i++) { spawnPetal(petalData, i, true); petals.setColorAt(i, pc.setHex(PINKS[i % PINKS.length])); }
  petals.frustumCulled = false;
  root.add(petals);

  // --- ánh sáng: nắng qua cổng + 2 đèn ấm (tổng 3 point light)
  const sunLight = new THREE.PointLight(0xfff0d0, 3, 9, 1.5);
  sunLight.position.set(0, 3.0, BACK_Z + 1.3);
  const warmL = new THREE.PointLight(0xffc27a, 5, 9, 1.6);
  warmL.position.set(-3.6, 3.3, -2.0);
  const warmR = new THREE.PointLight(0xff9fb8, 5, 9, 1.6);
  warmR.position.set(3.6, 3.3, -2.0);
  root.add(sunLight, warmL, warmR);
  const gateGlow = glow(0xfff1c8, 4.2, 0.3);
  gateGlow.position.set(0, GATE_Y, BACK_Z - 0.2);
  root.add(gateGlow);

  const S: MulanState = {
    petals, petalData, lanterns, dragon, drum: drum.userData.drum as THREE.Object3D, stoneGlow: stone.userData.glow as THREE.Sprite,
    lotusPetals, lotus, lotusBloom: -1, koi: kois, kites, cricket: cri, water, gateGlow, sunLight, puff: 1.5, beat: 0,
  };
  ctx.state.mulan = S;
  trimShadows(root.children.filter((o) => !before.has(o)), 0.3);
}

function ambient(ctx: RoomCtx, dt: number): void {
  const S = ctx.state.mulan as MulanState | undefined;
  if (!S) return;
  const t = ctx.time;
  const melt = ctx.melt;
  const awake = ctx.awake;
  const life = awake ? 1 : 0.35 + 0.65 * melt;

  // cánh hoa đào rơi: đóng băng còn lác đác, tan dần rơi nhiều
  const active = Math.round(PETAL_N * (awake ? 1 : 0.25 + 0.6 * melt));
  const d = S.petalData;
  for (let i = 0; i < active; i++) {
    const o = i * 6;
    d[o + 1] -= d[o + 3] * dt;
    d[o] += Math.sin(t * 1.3 + d[o + 4]) * dt * 0.35 + dt * 0.08;
    d[o + 2] += Math.cos(t * 0.9 + d[o + 4]) * dt * 0.15;
    if (d[o + 1] < 0.03 || d[o] > 5.5) spawnPetal(d, i, false);
    tmpV.set(d[o], d[o + 1], d[o + 2]);
    tmpE.set(t * 2 + d[o + 4], t * 1.3 + d[o + 4] * 2, d[o + 4]);
    tmpQ.setFromEuler(tmpE);
    tmpS.setScalar(d[o + 5]);
    tmpM.compose(tmpV, tmpQ, tmpS);
    S.petals.setMatrixAt(i, tmpM);
  }
  S.petals.count = active;
  S.petals.instanceMatrix.needsUpdate = true;

  // đèn lồng đung đưa + sáng dần
  S.lanterns.forEach((l, i) => {
    l.obj.rotation.z = Math.sin(t * 0.9 + l.seed) * 0.06;
    l.obj.rotation.x = Math.sin(t * 0.7 + i) * 0.04;
    l.halo.material.opacity = 0.2 + 0.4 * life + Math.sin(t * 3 + i) * 0.04;
  });
  S.stoneGlow.material.opacity = 0.2 + 0.45 * life + Math.sin(t * 11) * 0.04;

  // sen nở theo melt (búp → nở xoè)
  const target = awake ? 1 : 0.15 + 0.85 * melt;
  if (S.lotusBloom < 0 || Math.abs(target - S.lotusBloom) > 0.002) {
    S.lotusBloom = S.lotusBloom < 0 ? target : S.lotusBloom + (target - S.lotusBloom) * Math.min(1, dt * 2);
    const tilt = 0.2 + 0.75 * S.lotusBloom;
    S.lotus.forEach((lo, k) => {
      for (let j = 0; j < LOTUS_PETALS; j++) {
        const a = (j / LOTUS_PETALS) * Math.PI * 2 + (j % 2) * 0.2;
        tmpQ.setFromEuler(tmpE.set(tilt * (j % 2 ? 0.8 : 1), a, 0, 'YXZ'));
        tmpS.setScalar(lo.scale * (j % 2 ? 0.85 : 1));
        tmpM.compose(lo.pos, tmpQ, tmpS);
        S.lotusPetals.setMatrixAt(k * LOTUS_PETALS + j, tmpM);
      }
    });
    S.lotusPetals.instanceMatrix.needsUpdate = true;
  }

  // mặt nước gợn
  S.water.offset.x = t * 0.02;
  S.water.offset.y = Math.sin(t * 0.3) * 0.03;

  // cá chép bơi vòng; khi tỉnh thỉnh thoảng nhảy khỏi mặt nước
  S.koi.forEach((k, i) => {
    const a = t * k.speed * life + k.phase;
    k.obj.position.set(k.cx + Math.sin(a) * k.rx, 0.035, k.cz + Math.cos(a) * k.rz);
    k.obj.rotation.set(0, a + Math.PI / 2, Math.sin(t * 6 + i) * 0.1);
    k.obj.visible = awake || melt > 0.3 || i === 0;
    if (awake) {
      const cyc = (t + i * 1.7) % 4.5;
      if (cyc < 0.9) {
        const u = cyc / 0.9;
        k.obj.position.y = 0.035 + Math.sin(u * Math.PI) * 0.9;
        k.obj.rotation.x = (u - 0.5) * 1.8;
      }
    }
  });

  // diều bay lượn
  S.kites.forEach((k) => {
    k.obj.position.x = k.x + Math.sin(t * 0.3 + k.phase) * 1.2;
    k.obj.position.y = k.y + Math.sin(t * 0.7 + k.phase) * 0.4;
    k.obj.rotation.z = Math.sin(t * 0.9 + k.phase) * 0.25;
  });

  // rồng: ngủ (nhắm mắt) khi đóng băng → mở mắt khi tan → vẫy tay + phun lửa khi công chúa tỉnh
  const dr = S.dragon;
  const sleepy = !awake && melt < 0.3;
  const blink = sleepy ? 0.12 : (t % 3.3) < 0.13 ? 0.15 : 1;
  for (const e of dr.eyes) e.scale.y = blink;
  dr.head.rotation.x = sleepy ? 0.35 + Math.sin(t * 1.2) * 0.04 : Math.sin(t * 1.1) * 0.06;
  dr.head.rotation.y = sleepy ? 0 : Math.sin(t * 0.6) * 0.35;
  dr.head.rotation.z = Math.sin(t * 0.8) * 0.08 * life;
  dr.tail.rotation.y = Math.sin(t * 1.6) * 0.25 * life;
  dr.arm.rotation.z = awake ? 2.3 + Math.sin(t * 7) * 0.45 : 0.35 + Math.sin(t * 1.2) * 0.05 * life;
  dr.obj.position.y = 0.5 + (awake ? Math.abs(Math.sin(t * 2.4)) * 0.05 : 0);
  if (awake) {
    S.puff -= dt;
    if (S.puff <= 0) {
      S.puff = 2.2 + Math.random() * 1.5;
      dr.snout.getWorldPosition(tmpV);
      ctx.magic.burst(tmpV, 16, 0xff5a00, 1.4, 0.4, 0.9, 1.2, 0.08);
      ctx.magic.burst(tmpV, 10, 0xffb000, 1.0, 0.35, 0.8, 1.2, 0.05);
    }
  } else if (sleepy && Math.random() < dt * 0.6) {
    // "khò khò": vài hạt hồng nhỏ bay lên từ mũi
    dr.snout.getWorldPosition(tmpV);
    ctx.magic.twinkle(tmpV, 0xec4899, 1, 0.05, 0.25);
  }

  // trống trận: khi tỉnh đánh nhịp (mặt trống nảy + lấp lánh vàng)
  if (awake) {
    S.beat += dt;
    const k = S.beat % 0.9;
    const pulse = k < 0.12 ? 1 + (0.12 - k) * 0.6 : 1;
    S.drum.scale.setScalar(pulse);
    if (k < dt) {
      S.drum.getWorldPosition(tmpV);
      tmpV.z += 0.35;
      ctx.magic.twinkle(tmpV, 0xf59e0b, 3, 0.4, 0.4);
    }
  }

  // dế mèn nhún nhảy khi tỉnh
  S.cricket.position.y = 0.455 + (awake ? Math.abs(Math.sin(t * 5)) * 0.08 : 0);

  S.gateGlow.material.opacity = 0.2 + 0.25 * melt + Math.sin(t * 1.2) * 0.03;
  S.sunLight.intensity = 2.5 + 3 * melt;

  // tỉnh rồi: lấp lánh đỏ vàng quanh vườn
  if (awake && Math.random() < 0.18) {
    tmpV.set((Math.random() - 0.5) * 9, 0.6 + Math.random() * 3.2, -3.5 + Math.random() * 3);
    ctx.magic.twinkle(tmpV, Math.random() < 0.5 ? 0xdc2626 : 0xf59e0b, 1, 0.3, 0.35);
  }
}

const room: RoomDef = {
  id: 'mulan',
  name: 'Vườn hoa đào của Mộc Lan',
  emoji: '🐉',
  princessModel: 'p_mulan.glb',
  rig: 'hires',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'sen', emoji: '🪷', name: 'bông sen', fill: { index: 0, distractors: ['b', 'p'] } },
    { word: 'rồng', emoji: '🐉', name: 'con rồng', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'dế', emoji: '🦗', name: 'con dế', fill: { index: 0, distractors: ['l', 'p'] } },
    { word: 'trà', emoji: '🍵', name: 'chén trà' },
    { word: 'quạt', emoji: '🪭', name: 'cái quạt' },
    { word: 'ngựa', emoji: '🐎', name: 'con ngựa' },
    { word: 'trống', emoji: '🥁', name: 'cái trống' },
  ],
  count: { emoji: '🌸', audio: 'mulan_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],
  magicColors: [0xdc2626, 0xf59e0b],
  audio: { name: 'mulan_name', intro: 'mulan_intro', thanks: 'mulan_thanks' },
};

export default room;

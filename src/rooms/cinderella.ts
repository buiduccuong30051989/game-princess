// PHÒNG LỌ LEM: Cầu thang cung điện lúc nửa đêm. Sảnh đá hoa xanh–trắng, cầu thang lớn trải thảm xanh viền vàng
// dẫn lên chiếu nghỉ; tường sau có đồng hồ lớn (kim nhích dần tới 12 giờ khi băng tan) và 2 cửa sổ vòm khoét thủng
// nhìn ra trời đêm có trăng + lâu đài xa. Trái: cỗ xe bí ngô + bí ngô + đũa phép bà tiên. Phải: váy hồng trên ma-nơ-canh,
// giỏ may với 2 chú chuột, cây chổi, tranh. Chiếc giày pha lê nằm trên bậc thang. Chim xanh bay lượn, hạt phép xanh.
import * as THREE from 'three';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, mix, skyDome, starField, floor, wall, archFrame, archWindow, rug,
  painting, candle, flicker, glow, curtain, bob, shadows,
} from '../room/kit.ts';

const PAL = { primary: 0x3d7bff, secondary: 0x9fd0ff, accent: 0xffc94d, light: 0xeaf3ff, dark: 0x1b2f7a };
const GOLD = 0xffc94d;
const BACK_Z = -5.4;       // tường sau
const STEP_N = 8;          // số bậc
const STEP_RISE = 0.15;
const STEP_RUN = 0.36;
const STAIR_Z0 = -1.9;     // mép bậc đầu tiên
const STAIR_HALF = 2.0;    // nửa bề rộng cầu thang
const COACH_POS = new THREE.Vector3(-4.75, 0, -3.1);

// ---------------------------------------------------------------- texture
/** Sàn đá hoa ô vuông xanh–trắng, chỉ vàng, hoa nhỏ ở góc ô. */
function marbleTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e7f0ff'; g.fillRect(0, 0, w, h);
    const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if ((i + j) % 2) continue;
      g.fillStyle = '#9cc4ff';
      g.fillRect(i * s, j * s, s, s);
    }
    // vân đá mờ
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    for (let k = 0; k < 14; k++) {
      g.beginPath();
      const y = (k * 71) % h;
      g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 30, w * 0.6, y - 20, w, y + 12);
      g.stroke();
    }
    g.strokeStyle = '#e8b94a'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    g.fillStyle = '#ffd166';
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      g.beginPath();
      for (let p = 0; p < 4; p++) { const a = p * Math.PI / 2 + Math.PI / 4; g.ellipse(i * s + Math.cos(a) * 7, j * s + Math.sin(a) * 7, 6, 6, 0, 0, Math.PI * 2); }
      g.fill();
    }
  }, [7, 7]);
}

/** Giấy dán tường xanh hoạ tiết hoa huệ trắng + sọc vàng mảnh. */
function damaskTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#b9d6ff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a6c9ff'; g.fillRect(0, 0, w * 0.08, h); g.fillRect(w * 0.92, 0, w * 0.08, h);
    g.fillStyle = '#f3c75a'; g.fillRect(w * 0.08, 0, 3, h); g.fillRect(w * 0.92 - 3, 0, 3, h);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let y = 70; y < h; y += 190) {
      const cx = w / 2;
      g.beginPath(); g.ellipse(cx, y - 18, 11, 30, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx - 24, y, 9, 22, -0.8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx + 24, y, 9, 22, 0.8, 0, Math.PI * 2); g.fill();
      g.fillRect(cx - 22, y + 14, 44, 7);
      g.beginPath(); g.moveTo(cx - 6, y + 21); g.lineTo(cx + 6, y + 21); g.lineTo(cx, y + 40); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let y = 165; y < h; y += 190) for (const x of [w * 0.25, w * 0.75]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
  }, repeat);
}

/** Mặt đồng hồ: nền kem xanh, số La Mã xanh đậm, vạch vàng, ngôi sao nhỏ. */
function clockFace(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    const gr = g.createRadialGradient(c, c, 10, c, c, c);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.75, '#e4f0ff'); gr.addColorStop(1, '#9cc4ff');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2f5fd0'; g.lineWidth = 8; g.beginPath(); g.arc(c, c, c * 0.93, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#e8b94a'; g.lineWidth = 4; g.beginPath(); g.arc(c, c, c * 0.62, 0, Math.PI * 2); g.stroke();
    const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    g.fillStyle = '#1d3a8a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 50px Georgia, serif';
    nums.forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      g.save(); g.translate(c + Math.cos(a) * c * 0.77, c + Math.sin(a) * c * 0.77); g.rotate(a + Math.PI / 2);
      g.fillText(n, 0, 0); g.restore();
    });
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      g.fillStyle = i % 5 ? '#6b8fe0' : '#e8b94a';
      g.beginPath(); g.arc(c + Math.cos(a) * c * 0.88, c + Math.sin(a) * c * 0.88, i % 5 ? 3 : 6, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffd166';
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 16 : 40; g.lineTo(c + Math.cos(a) * r, c * 1.28 + Math.sin(a) * r); }
    g.fill();
  });
}

/** Thảm chạy xanh hoàng gia, viền vàng, hoa huệ trắng. */
function runnerTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2f63e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd166'; g.fillRect(0, 0, 18, h); g.fillRect(w - 18, 0, 18, h);
    g.fillStyle = '#1d3a8a'; g.fillRect(18, 0, 6, h); g.fillRect(w - 24, 0, 6, h);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    const cx = w / 2, cy = h / 2;
    g.beginPath(); g.ellipse(cx, cy - 16, 9, 24, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx - 20, cy, 7, 18, -0.8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 20, cy, 7, 18, 0.8, 0, Math.PI * 2); g.fill();
  }, repeat);
}

/** Cảnh đêm dán kính cửa sổ bên: trời xanh tím, sao, lâu đài nhỏ. */
function nightViewTex(): THREE.CanvasTexture {
  return canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2a8a'); gr.addColorStop(1, '#e39ad9');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6d0';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 83) % w, (i * 137) % (h * 0.7), i % 6 ? 1.5 : 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#b49de8';
    g.fillRect(w * 0.2, h * 0.72, w * 0.6, h * 0.28);
    for (const [x, tw, th] of [[0.25, 0.14, 0.2], [0.5, 0.18, 0.32], [0.72, 0.14, 0.22]] as const) {
      g.fillStyle = '#b49de8';
      g.fillRect(w * (x - tw / 2), h * (0.72 - th), w * tw, h * th + 2);
      g.fillStyle = '#3d6bff';
      g.beginPath(); g.moveTo(w * (x - tw * 0.7), h * (0.72 - th)); g.lineTo(w * (x + tw * 0.7), h * (0.72 - th)); g.lineTo(w * x, h * (0.72 - th - 0.12)); g.fill();
      g.fillStyle = '#ffe08a';
      g.fillRect(w * x - 4, h * (0.72 - th * 0.6), 8, 12);
    }
  });
}

// ---------------------------------------------------------------- khối dựng
/** Tường phẳng có nhiều ô cửa vòm khoét thủng. holes: x tâm, y mép dưới, w, h. UV theo mét. */
function wallWithArches(w: number, h: number, holes: { x: number; y: number; w: number; h: number }[], m: THREE.Material, uvScale = 2): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.lineTo(-w / 2, 0);
  for (const o of holes) {
    const r = o.w / 2;
    const p = new THREE.Path();
    p.moveTo(o.x - r, o.y); p.lineTo(o.x + r, o.y); p.lineTo(o.x + r, o.y + o.h - r);
    p.absarc(o.x, o.y + o.h - r, r, 0, Math.PI, false);
    p.lineTo(o.x - r, o.y);
    shape.holes.push(p);
  }
  const geo = new THREE.ShapeGeometry(shape, 32);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / uvScale; uv[i * 2 + 1] = pos.getY(i) / uvScale; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  return mesh;
}

/** InstancedMesh từ danh sách ma trận (gộp nhiều khối giống nhau thành 1 draw call). */
function instanced(geo: THREE.BufferGeometry, m: THREE.Material, mats: THREE.Matrix4[], cast = true): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(geo, m, mats.length);
  mats.forEach((mm, i) => im.setMatrixAt(i, mm));
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = true;
  return im;
}
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

/** Cầu thang lớn: bậc đá, thảm xanh, thanh đồng vàng, lan can 2 bên, trụ đầu cầu thang có đèn cầu. */
function staircase(): { group: THREE.Group; lamps: THREE.Object3D[] } {
  const g = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const goldM = mat(GOLD, { rough: 0.3, emissive: 0x6a4500, ei: 0.3 });
  const stepM: THREE.Matrix4[] = [], runTop: THREE.Matrix4[] = [], runFront: THREE.Matrix4[] = [], nose: THREE.Matrix4[] = [];
  for (let i = 0; i < STEP_N; i++) {
    const zf = STAIR_Z0 - i * STEP_RUN;
    stepM.push(M4(0, i * STEP_RISE + STEP_RISE / 2, (zf + BACK_Z) / 2, STAIR_HALF * 2, STEP_RISE, zf - BACK_Z));
    runTop.push(M4(0, (i + 1) * STEP_RISE + 0.006, zf - STEP_RUN / 2 + 0.01, 1.6, 0.012, STEP_RUN + 0.02));
    runFront.push(M4(0, i * STEP_RISE + STEP_RISE / 2, zf + 0.006, 1.6, STEP_RISE, 0.012));
    nose.push(M4(0, (i + 1) * STEP_RISE + 0.012, zf - 0.02, 1.7, 0.018, 0.018));
  }
  g.add(instanced(box, mat(0xe3ecfb, { rough: 0.35 }), stepM));
  g.add(instanced(box, mat(0x2f63e8, { rough: 0.9 }), runTop, false));
  g.add(instanced(box, mat(0x2656d0, { rough: 0.9 }), runFront, false));
  // thanh đồng giữ thảm: trụ nằm ngang (đã xoay trục sang x)
  g.add(instanced(new THREE.CylinderGeometry(1, 1, 1, 8).rotateZ(Math.PI / 2), goldM, nose, false));
  // chiếu nghỉ trên cùng: thảm tràn tới tường
  const landFront = STAIR_Z0 - (STEP_N - 1) * STEP_RUN - STEP_RUN;
  const landing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.012, landFront - BACK_Z), mat(0x2f63e8, { rough: 0.9 }));
  landing.position.set(0, STEP_N * STEP_RISE + 0.006, (landFront + BACK_Z) / 2);
  g.add(landing);
  // lan can: con tiện trắng + tay vịn vàng xiên + má cầu thang xanh
  const bal: THREE.Matrix4[] = [];
  const topY = STEP_N * STEP_RISE;
  for (const s of [-1, 1]) {
    const x = s * (STAIR_HALF - 0.1);
    for (let i = 0; i < STEP_N; i++) bal.push(M4(x, (i + 1) * STEP_RISE + 0.36, STAIR_Z0 - i * STEP_RUN - STEP_RUN / 2, 1, 0.72, 1));
    const a = new THREE.Vector3(x, STEP_RISE + 0.74, STAIR_Z0 + 0.1);
    const b = new THREE.Vector3(x, topY + 0.74, landFront + 0.06);
    const len = a.distanceTo(b);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 12), goldM);
    rail.position.copy(a).lerp(b, 0.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    rail.castShadow = true;
    const rail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, b.z - BACK_Z, 12), goldM);
    rail2.rotation.x = Math.PI / 2;
    rail2.position.set(x, topY + 0.74, (b.z + BACK_Z) / 2);
    for (let k = 0; k < 2; k++) bal.push(M4(x, topY + 0.36, b.z - 0.2 - k * 0.3, 1, 0.72, 1));
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, len + 0.25), mat(0x3d7bff, { rough: 0.5 }));
    str.position.set(s * (STAIR_HALF + 0.03), (a.y + b.y) / 2 - 0.66, (a.z + b.z) / 2);
    str.rotation.x = Math.atan2(b.y - a.y, a.z - b.z);
    g.add(rail, rail2, str);
  }
  g.add(instanced(new THREE.CylinderGeometry(0.035, 0.05, 1, 8), mat(0xf4f8ff, { rough: 0.4 }), bal));
  // trụ đầu cầu thang: cột xanh + mũ vàng + đèn cầu phát sáng
  const lamps: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const post = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.36), mat(0xf4f8ff, { rough: 0.4 }));
    base.position.y = 0.1;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.05, 16), mat(0x3d7bff, { rough: 0.45 }));
    col.position.y = 0.72;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.1, 16), goldM);
    cap.position.y = 1.28;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.3, 8), goldM);
    arm.position.y = 1.45;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), glowMat(0xe8f4ff));
    globe.position.y = 1.7;
    const halo = glow(0x9fd0ff, 1.3, 0.55);
    halo.position.y = 1.7;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 12), goldM);
    crown.position.y = 1.9;
    post.add(base, col, cap, arm, globe, halo, crown);
    post.userData.halo = halo;
    post.position.set(s * (STAIR_HALF + 0.08), 0, STAIR_Z0 + 0.12);
    shadows(post);
    g.add(post);
    lamps.push(post);
  }
  return { group: g, lamps };
}

/** Cỗ xe bí ngô: thân bí có múi, cửa sổ tròn, bánh xe vàng, dây leo xanh, đèn nhỏ. Dài theo trục x. */
function pumpkinCoach(): { group: THREE.Group; body: THREE.MeshStandardMaterial; lamps: THREE.Object3D[] } {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.78, 40, 24);
  const p = geo.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.y);   // múi chạy dọc trục x
    const k = 1 + 0.07 * Math.pow(Math.abs(Math.cos(a * 5)), 0.6);
    p.setXYZ(i, v.x * 1.18, v.y * k * 0.95, v.z * k);
  }
  geo.computeVertexNormals();
  // material riêng (không cache) để ambient chỉnh độ phát sáng
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff9a2e, roughness: 0.45, metalness: 0, emissive: 0xff7a00, emissiveIntensity: 0.05 });
  const body = new THREE.Mesh(geo, bodyMat);
  body.position.y = 1.08;
  g.add(body);
  const goldM = mat(GOLD, { rough: 0.3, emissive: 0x6a4500, ei: 0.3 });
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), glowMat(0xcfe7ff));
    win.position.set(0.05, 1.12, s * 0.83);
    if (s < 0) win.rotation.y = Math.PI;
    const fr = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 36), goldM);
    fr.position.set(0.05, 1.12, s * 0.84);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 24, Math.PI * 1.5), goldM);
    curl.position.set(0.05, 0.64, s * 0.8);
    curl.rotation.z = Math.PI * 0.75;
    g.add(win, fr, curl);
  }
  // bánh xe: vành vàng + nan chữ thập
  const spokeGeo = new THREE.BoxGeometry(0.03, 0.7, 0.03);
  for (const [x, z] of [[-0.62, 0.72], [0.62, 0.72], [-0.62, -0.72], [0.62, -0.72]] as const) {
    const w = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 10, 36), goldM);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), goldM);
    w.add(rim, inner);
    for (let k = 0; k < 2; k++) { const s = new THREE.Mesh(spokeGeo, goldM); s.rotation.z = k * Math.PI / 2 + Math.PI / 4; w.add(s); }
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  const axle = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.08), goldM);
  axle.position.set(0, 0.42, 0);
  g.add(axle);
  // cuống + dây leo xanh xoắn + vương miện trên nóc
  const leaf = mat(0x3fbf5a, { rough: 0.6 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.28, 10), leaf);
  stem.position.set(0, 1.9, 0);
  stem.rotation.z = 0.25;
  g.add(stem);
  for (const [x, rz] of [[-0.25, 0.4], [0.28, -0.6]] as const) {
    const vine = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24, Math.PI * 1.6), leaf);
    vine.position.set(x, 1.86, 0.05);
    vine.rotation.set(0.3, 0, rz);
    g.add(vine);
  }
  const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24), goldM);
  crownBase.rotation.x = Math.PI / 2;
  crownBase.position.set(0, 1.82, 0);
  g.add(crownBase);
  // 2 đèn nhỏ phía trước
  const lamps: THREE.Object3D[] = [];
  for (const z of [-0.5, 0.5]) {
    const l = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMat(0xfff1b0));
    const h = glow(0xffd98a, 0.55, 0.7);
    l.add(bulb, h);
    l.userData.halo = h;
    l.position.set(0.98, 1.1, z);
    g.add(l);
    lamps.push(l);
  }
  shadows(g);
  return { group: g, body: bodyMat, lamps };
}

/** Chú chuột (Jaq/Gus): áo màu, mũ tuỳ chọn. Cao ~0.4 m, nhìn về +z. userData.head để ngó nghiêng. */
function mouse(shirt: number, hat: number | null): THREE.Group {
  const g = new THREE.Group();
  const fur = mat(0xc9a27e, { rough: 0.85 });
  const pink = mat(0xff9fb8, { rough: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat(shirt, { rough: 0.8 }));
  body.scale.set(1, 1.15, 0.95);
  body.position.y = 0.12;
  const head = new THREE.Group();
  head.position.set(0, 0.28, 0.02);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), fur);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), fur);
  snout.position.set(0, -0.02, 0.07);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), pink);
  nose.position.set(0, -0.01, 0.11);
  head.add(skull, snout, nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), pink);
    ear.scale.set(1, 1, 0.35);
    ear.position.set(s * 0.07, 0.08, -0.01);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat(0x1b1b3a, { rough: 0.2 }));
    eye.position.set(s * 0.032, 0.02, 0.066);
    head.add(ear, eye);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), fur);
    foot.scale.set(1, 0.5, 1.5);
    foot.position.set(s * 0.05, 0.01, 0.05);
    g.add(foot);
  }
  if (hat !== null) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 12), mat(hat, { rough: 0.8 }));
    h.position.set(0.02, 0.12, 0);
    h.rotation.z = -0.3;
    head.add(h);
  }
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.06, -0.09), new THREE.Vector3(0, 0.04, -0.2), new THREE.Vector3(0.05, 0.1, -0.28), new THREE.Vector3(0.1, 0.18, -0.25),
  ]), 12, 0.01, 5, false), pink);
  g.add(body, head, tail);
  g.userData.head = head;
  shadows(g);
  return g;
}

/** Chim xanh (bạn của Lọ Lem): thân, đầu, mỏ cam, 2 cánh (userData.wings để vỗ). Bay theo hướng +x. */
function bluebird(color: number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), m);
  body.scale.set(1.4, 0.9, 0.9);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xfff2d6, { rough: 0.7 }));
  belly.position.set(0.02, -0.03, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), m);
  head.position.set(0.12, 0.05, 0);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), mat(0xff9f1c));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.19, 0.04, 0);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), m);
  tail.rotation.z = Math.PI / 2;
  tail.scale.z = 0.3;
  tail.position.set(-0.17, 0.02, 0);
  const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mat(0x1b1b3a, { rough: 0.2 }));
  eyes.scale.set(1, 1, 6.5);   // 1 khối dẹt xuyên đầu = 2 mắt 2 bên
  eyes.position.set(0.16, 0.07, 0);
  g.add(body, belly, head, beak, tail, eyes);
  const wings: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), mat(mix(color, 0x1b2f7a, 0.25), { rough: 0.6 }));
    w.scale.set(0.9, 0.18, 1.3);
    w.position.z = s * 0.09;
    pivot.add(w);
    pivot.position.set(0, 0.04, s * 0.04);
    pivot.userData.side = s;
    g.add(pivot);
    wings.push(pivot);
  }
  g.userData.wings = wings;
  return g;
}

/** Cái nơ: 2 tai + nút giữa + 2 đuôi. size = bề ngang 1 tai. */
function ribbonBow(color: number, size = 0.15): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color, { rough: 0.6 });
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.ConeGeometry(size * 0.55, size, 12), m);
    loop.rotation.z = s * Math.PI / 2;
    loop.scale.z = 0.5;
    loop.position.x = s * size * 0.5;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.25, size * 0.9, 0.02), m);
    tail.position.set(s * size * 0.25, -size * 0.5, 0);
    tail.rotation.z = s * 0.35;
    g.add(loop, tail);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.22, 10, 8), mat(mix(color, 0x000000, 0.12), { rough: 0.6 }));
  g.add(knot);
  return g;
}

/** Ma-nơ-canh mặc váy dạ hội hồng (váy các chú chuột may) + nơ + ngọc trai. Đáy y=0. */
function dressForm(): THREE.Group {
  const g = new THREE.Group();
  const goldM = mat(GOLD, { rough: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.06, 20), goldM);
  base.position.y = 0.03;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), goldM);
  pole.position.y = 0.3;
  const pinkM = mat(0xff8fc8, { rough: 0.7 });
  const skirt = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 1.02), new THREE.Vector2(0.16, 1.0), new THREE.Vector2(0.3, 0.8), new THREE.Vector2(0.48, 0.5), new THREE.Vector2(0.58, 0.28), new THREE.Vector2(0.6, 0.18),
  ], 28), mat(0xff8fc8, { rough: 0.7, side: THREE.DoubleSide }));
  const ruffle = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 8, 40), mat(0xffffff, { rough: 0.8 }));
  ruffle.rotation.x = Math.PI / 2;
  ruffle.position.y = 0.2;
  const ruffle2 = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 8, 36), mat(0xffc2e2, { rough: 0.8 }));
  ruffle2.rotation.x = Math.PI / 2;
  ruffle2.position.y = 0.55;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.38, 16), pinkM);
  torso.position.y = 1.2;
  const bust = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 10), pinkM);
  bust.scale.set(1, 0.6, 0.8);
  bust.position.y = 1.36;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), goldM);
  neck.position.y = 1.5;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), goldM);
  knob.position.y = 1.58;
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 24), mat(0xffffff, { rough: 0.8 }));
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 1.03;
  g.add(base, pole, skirt, ruffle, ruffle2, torso, bust, neck, knob, sash);
  const bow = ribbonBow(0xff4fa3, 0.16);
  bow.position.set(0, 1.04, 0.16);
  g.add(bow);
  const pearls: THREE.Matrix4[] = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; pearls.push(M4(Math.sin(a) * 0.5, 0.42, Math.cos(a) * 0.5)); }
  g.add(instanced(new THREE.SphereGeometry(0.024, 8, 6), mat(0xffffff, { rough: 0.2 }), pearls, false));
  shadows(g);
  return g;
}

/** Cây chổi dựng tựa tường. Đáy y=0. */
function broom(): THREE.Group {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), mat(0xd9954a, { rough: 0.7 }));
  stick.position.y = 0.85;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), mat(0x3d7bff, { rough: 0.5 }));
  band.position.y = 0.3;
  const straw = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 14, 1, true), mat(0xffd166, { rough: 0.9, side: THREE.DoubleSide }));
  straw.position.y = 0.14;
  straw.scale.z = 0.45;
  g.add(stick, band, straw);
  g.rotation.z = 0.16;
  shadows(g);
  return g;
}

/** Giỏ may: giỏ mây + cuộn chỉ màu + dải ruy băng. Đáy y=0. */
function sewingBasket(): THREE.Group {
  const g = new THREE.Group();
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.24, 20, 1, true), mat(0xe8b570, { rough: 0.85, side: THREE.DoubleSide }));
  basket.position.y = 0.12;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), mat(0xd9a060));
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.02;
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 28), mat(0xd9954a, { rough: 0.8 }));
  rimT.rotation.x = Math.PI / 2;
  rimT.position.y = 0.24;
  g.add(basket, bottom, rimT);
  const cols = [0xff4fa3, 0x3d7bff, 0xffd166, 0x9b5de5, 0x2ec4b6];
  cols.forEach((c, i) => {
    const a = (i / cols.length) * Math.PI * 2;
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), mat(c, { rough: 0.8 }));
    thread.position.set(Math.cos(a) * 0.14, 0.24, Math.sin(a) * 0.14);
    thread.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5);
    g.add(thread);
  });
  const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.28, 0.1), new THREE.Vector3(0.3, 0.3, 0.25), new THREE.Vector3(0.42, 0.1, 0.35), new THREE.Vector3(0.55, 0.01, 0.3),
  ]), 16, 0.018, 4, false), mat(0xff4fa3, { rough: 0.6 }));
  g.add(rib);
  shadows(g);
  return g;
}

/** Đèn chùm pha lê: 2 vòng vàng + nến + giọt pha lê (instanced). */
function crystalChandelier(): { group: THREE.Group; candles: THREE.Object3D[] } {
  const g = new THREE.Group();
  const goldM = mat(GOLD, { rough: 0.3, emissive: 0x6a4500, ei: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 36), goldM);
  ring.rotation.x = Math.PI / 2;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 28), goldM);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.32;
  const stemC = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.7, 8), goldM);
  stemC.position.y = 0.2;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), goldM);
  ball.position.y = -0.18;
  g.add(ring, ring2, stemC, ball);
  const crystal = mat(0xcfe8ff, { rough: 0.05, opacity: 0.85, emissive: 0x6fb0ff, ei: 0.3 });
  const drops: THREE.Matrix4[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    drops.push(M4(Math.cos(a) * 0.5, -0.1 - (i % 2) * 0.07, Math.sin(a) * 0.5, 1, 1.8, 1));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    drops.push(M4(Math.cos(a) * 0.26, 0.22, Math.sin(a) * 0.26, 0.8, 1.5, 0.8));
  }
  g.add(instanced(new THREE.OctahedronGeometry(0.045), crystal, drops, false));
  const candles: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const c = candle(0.14, 0xfff6e8);
    c.position.set(Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5);
    g.add(c);
    candles.push(c);
  }
  return { group: g, candles };
}

/** Lâu đài xa (bóng tím hồng, cửa sổ vàng sáng) – đặt ngoài cửa sổ. Đáy y=0. */
function farCastle(): THREE.Group {
  const g = new THREE.Group();
  const wallM = new THREE.MeshBasicMaterial({ color: 0xc9b6f2, fog: false });
  const wall2 = new THREE.MeshBasicMaterial({ color: 0xb49de8, fog: false });
  const roof = new THREE.MeshBasicMaterial({ color: 0x3d6bff, fog: false });
  const towers: [number, number, number, number][] = [[0, 0, 1.3, 6.2], [-2.2, 0.4, 0.8, 4.4], [2.2, 0.4, 0.8, 4.6], [-3.6, 0.8, 0.6, 3.2], [3.6, 0.8, 0.6, 3.4], [-1.1, -0.4, 0.55, 5.0], [1.1, -0.4, 0.55, 5.2]];
  const body = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 1.5), wall2);
  body.position.set(0, 1.3, 0.5);
  g.add(body);
  const wins: THREE.Matrix4[] = [];
  for (const [x, z, r, h] of towers) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 16), wallM);
    t.position.set(x, h / 2, z);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.3, r * 2.6, 16), roof);
    c.position.set(x, h + r * 1.3, z);
    g.add(t, c);
    for (let k = 0; k < 2; k++) wins.push(M4(x, h * (0.45 + k * 0.25), z + r + 0.02, r * 0.35, r * 0.55, 1));
  }
  g.add(instanced(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }), wins, false));
  const flags: THREE.Matrix4[] = towers.map(([x, z, r, h]) => M4(x + 0.25, h + r * 2.6 + 0.2, z, 0.5, 0.3, 1));
  g.add(instanced(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xff5fb4, fog: false, side: THREE.DoubleSide }), flags, false));
  return g;
}

interface Bird { obj: THREE.Group; r: number; speed: number; phase: number; y: number }
interface Mouse { obj: THREE.Object3D; seed: number }
interface Coach { group: THREE.Group; body: THREE.MeshStandardMaterial; lamps: THREE.Object3D[] }

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root } = ctx;

  // --- ngoài cửa sổ: trời đêm xanh tím, sao, trăng tròn, lâu đài xa
  const dome = skyDome(0x16237a, 0xe39ad9, 40);
  dome.position.set(0, -2, -10);
  root.add(dome);
  const stars = starField(420, 34, 0xfff6d6, 0.4);
  stars.position.set(0, -2, -6);
  root.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), glowMat(0xfff6d0));
  moon.position.set(-7.4, 5.2, -28);
  root.add(moon);
  const moonGlow = glow(0xfff1b8, 8, 0.5);
  moonGlow.position.copy(moon.position);
  root.add(moonGlow);
  const castle = farCastle();
  castle.position.set(7.2, -0.6, -29);
  root.add(castle);
  const hills = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6d5fc9, fog: false }));
  hills.scale.set(1.6, 0.08, 0.5);
  hills.position.set(0, -1.2, -36);
  root.add(hills);

  // --- sàn đá hoa + thảm chạy xanh từ trước bệ tới chân cầu thang + thảm tròn quanh bệ
  root.add(floor(30, 30, texMat(marbleTex(), { rough: 0.3 })));
  const runLen = 5.6;
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, runLen), texMat(runnerTex([1, 4]), { rough: 0.9 }));
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.008, STAIR_Z0 + runLen / 2);
  runner.receiveShadow = true;
  root.add(runner);
  const round = rug(2.3, 1.6, 0x5a95ff, GOLD);
  round.position.set(0, 0.004, 0.45);
  root.add(round);

  // --- tường sau: 2 cửa sổ vòm khoét + đồng hồ lớn ở giữa
  const winY = STEP_N * STEP_RISE + 0.08, winW = 1.7, winH = 2.55, winX = 2.75;
  const backWall = wallWithArches(16, 9, [{ x: -winX, y: winY, w: winW, h: winH }, { x: winX, y: winY, w: winW, h: winH }], texMat(damaskTex([1, 0.5]), { rough: 0.8 }), 2);
  backWall.position.set(0, 0, BACK_Z);
  root.add(backWall);
  for (const s of [-1, 1]) {
    const fr = archFrame(winW, winH, GOLD, 0.16, 0.26);
    fr.position.set(s * winX, winY, BACK_Z - 0.08);
    root.add(fr);
    // rèm xanh 2 bên cửa sổ, buộc nơ hồng
    for (const side of [-1, 1]) {
      const c = curtain(winH + 0.3, 0.55, 0x3d7bff, 0x2f63e8);
      c.position.set(s * winX + side * (winW / 2 + 0.3), winY - 0.2, BACK_Z + 0.25);
      root.add(c);
      const tie = ribbonBow(0xff5fb4, 0.12);
      tie.position.set(s * winX + side * (winW / 2 + 0.3), winY + 0.9, BACK_Z + 0.5);
      root.add(tie);
    }
  }
  // đồng hồ nửa đêm
  const clock = new THREE.Group();
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.1, 48), mat(0x2f63e8, { rough: 0.5 }));
  back.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.74, 48), texMat(clockFace(), { rough: 0.6, emissive: 0xffffff, ei: 0.25 }));
  face.position.z = 0.06;
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 12, 56), mat(GOLD, { rough: 0.3, emissive: 0x6a4500, ei: 0.3 }));
  bezel.position.z = 0.06;
  clock.add(back, face, bezel);
  const jewels: THREE.Matrix4[] = [], pinkJ: THREE.Matrix4[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    (i % 3 ? jewels : pinkJ).push(M4(Math.sin(a) * 0.86, Math.cos(a) * 0.86, 0.09));
  }
  const jGeo = new THREE.SphereGeometry(0.045, 10, 8);
  clock.add(instanced(jGeo, mat(0xffd166, { rough: 0.3 }), jewels, false), instanced(jGeo, mat(0xff5fb4, { rough: 0.3 }), pinkJ, false));
  const handM = mat(0x1d3a8a, { rough: 0.4 });
  const tipM = mat(GOLD, { rough: 0.3 });
  const mkHand = (len: number, wdt: number): THREE.Group => {
    const pv = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(wdt, len, 0.02), handM);
    h.position.y = len / 2 - 0.05;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(wdt * 1.4, 0.1, 4), tipM);
    tip.position.y = len;
    pv.add(h, tip);
    pv.position.z = 0.09;
    clock.add(pv);
    return pv;
  };
  const hourHand = mkHand(0.36, 0.05);
  const minHand = mkHand(0.56, 0.035);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), tipM);
  pin.position.z = 0.11;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), mat(GOLD, { rough: 0.3, emissive: 0xffb000, ei: 0.5 }));
  star.position.set(0, 1.0, 0.1);
  clock.add(pin, star);
  clock.position.set(0, 3.08, BACK_Z + 0.08);
  root.add(clock);
  const clockGlow = glow(0x9fd0ff, 2.8, 0.25);
  clockGlow.position.set(0, 3.08, BACK_Z + 0.05);
  root.add(clockGlow);
  // quầng sáng trăng tràn vào cửa sổ
  const winGlows: THREE.Sprite[] = [];
  for (const s of [-1, 1]) {
    const wg = glow(0xb8d8ff, 3.6, 0.28);
    wg.position.set(s * winX, winY + 1.3, BACK_Z + 0.2);
    root.add(wg);
    winGlows.push(wg);
  }

  // --- cầu thang lớn
  const stairs = staircase();
  root.add(stairs.group);

  // --- tường 2 bên: giấy dán xanh, chân tường trắng + gờ vàng
  const sideMat = texMat(damaskTex([7, 2.25]), { rough: 0.8 });
  const dado = mat(0xdde9ff, { rough: 0.5 });
  const railM = mat(GOLD, { rough: 0.35 });
  for (const s of [-1, 1]) {
    const sw = wall(14, 9, sideMat);
    sw.position.set(s * 6.5, 0, 1.6);
    sw.rotation.y = -s * Math.PI / 2;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 14), dado);
    d.position.set(s * 6.45, 0.45, 1.6);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 14), railM);
    r.position.set(s * 6.42, 0.92, 1.6);
    root.add(sw, d, r);
  }

  // --- tường trái: cửa sổ vòm nhìn ra trời đêm + tranh giày pha lê; đèn tường 2 bên
  const leftWin = archWindow(1.3, 2.2, nightViewTex(), GOLD, true);
  leftWin.position.set(-6.4, 1.05, -2.3);
  leftWin.rotation.y = Math.PI / 2;
  root.add(leftWin);
  const leftCurt = curtain(2.6, 0.5, 0x3d7bff, 0x2f63e8);
  leftCurt.position.set(-6.25, 0.9, -3.4);
  leftCurt.rotation.y = Math.PI / 2;
  root.add(leftCurt);
  const slipperArt = painting(0.95, 1.15, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f63e8'); gr.addColorStop(1, '#9fd0ff');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 18; i++) { c.beginPath(); c.arc((i * 61) % w, (i * 97) % h, i % 4 ? 2 : 4, 0, Math.PI * 2); c.fill(); }
    c.font = `${Math.round(w * 0.55)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('👠', w / 2, h * 0.55);
  }, 0xffffff, GOLD);
  slipperArt.position.set(-6.4, 2.35, 0.5);
  slipperArt.rotation.y = Math.PI / 2;
  root.add(slipperArt);
  const sconces: THREE.Object3D[] = [];
  const plateGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 16).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-6.4, -0.7], [-6.4, 1.7], [6.4, -0.9], [6.4, 1.9]] as const) {
    const plate = new THREE.Mesh(plateGeo, railM);
    plate.position.set(x, 1.75, z);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.06, 12), railM);
    cup.position.set(x - Math.sign(x) * 0.14, 1.72, z);
    const c = candle(0.18, 0xffffff);
    c.position.set(x - Math.sign(x) * 0.14, 1.75, z);
    root.add(plate, cup, c);
    sconces.push(c);
  }

  // --- trái: cỗ xe bí ngô + bí ngô nhỏ + đũa phép bà tiên
  const coach = pumpkinCoach();
  coach.group.position.copy(COACH_POS);
  coach.group.rotation.y = 0.45;
  root.add(coach.group);
  const pumpkins: THREE.Object3D[] = [];
  const pumpkinSpots: [number, number, number, number][] = [[-3.55, -2.05, 0.42, 0.3], [-5.75, -1.1, 0.5, -0.5], [-3.7, -4.5, 0.36, 1.2], [2.75, -2.3, 0.4, -0.4], [3.25, -2.75, 0.3, 0.8], [-5.2, 1.5, 0.44, 0.2]];
  await Promise.all(pumpkinSpots.map(async ([x, z, h, ry]) => {
    let p: THREE.Object3D;
    try {
      p = await ctx.model('rooms/cinderella/pumpkin.glb', { height: h });
    } catch (e) {
      // dự phòng: bí ngô bằng khối
      const b = new THREE.Mesh(new THREE.SphereGeometry(h / 2, 16, 12), mat(0xff8a1f, { rough: 0.5 }));
      b.scale.set(1.2, 0.9, 1.2);
      b.position.y = h * 0.45;
      p = b;
      console.warn('pumpkin', e);
    }
    const w = new THREE.Group();
    w.add(p);
    w.position.set(x, 0, z);
    w.rotation.y = ry;
    root.add(w);
    pumpkins.push(w);
  }));
  const wandHold = new THREE.Group();
  wandHold.position.set(-3.55, 1.45, -3.4);
  root.add(wandHold);
  try {
    const wand = await ctx.model('wand_star.glb', { height: 0.55 });
    wandHold.add(wand);
    wand.rotation.z = -0.5;
  } catch (e) { console.warn('wand', e); }
  const wandGlow = glow(0x9fd0ff, 1.1, 0.45);
  wandGlow.position.set(0.1, 0.4, 0.05);
  wandHold.add(wandGlow);

  // --- chiếc giày pha lê trên gối nhung, đặt trên bậc thang thứ 3 (bên phải công chúa)
  const slipperSpot = new THREE.Vector3(1.2, 3 * STEP_RISE, STAIR_Z0 - 2 * STEP_RUN - STEP_RUN / 2);
  const pillowGeo = new THREE.BoxGeometry(0.42, 0.1, 0.3, 6, 2, 6);
  {
    const pp = pillowGeo.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); v.y *= 1 - 0.6 * (Math.abs(v.x) / 0.21) * (Math.abs(v.z) / 0.15); pp.setXYZ(i, v.x, v.y, v.z); }
    pillowGeo.computeVertexNormals();
  }
  const pillow = new THREE.Mesh(pillowGeo, mat(0x2f63e8, { rough: 0.9 }));
  pillow.position.copy(slipperSpot).add(new THREE.Vector3(0, 0.05, 0));
  pillow.castShadow = true;
  root.add(pillow);
  const tassels: THREE.Matrix4[] = [[-0.21, -0.15], [0.21, -0.15], [-0.21, 0.15], [0.21, 0.15]].map(([dx, dz]) => M4(slipperSpot.x + dx, slipperSpot.y + 0.05, slipperSpot.z + dz));
  root.add(instanced(new THREE.ConeGeometry(0.03, 0.09, 6), mat(GOLD, { rough: 0.3 }), tassels, false));
  const slipperHold = new THREE.Group();
  slipperHold.position.copy(slipperSpot).add(new THREE.Vector3(0, 0.1, 0));
  root.add(slipperHold);
  try {
    const sl = await ctx.model('slipper.glb', { height: 0.24, keep: ['heel'] });
    const glass = new THREE.MeshStandardMaterial({ color: 0xa8d4ff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.85, emissive: 0x4f9dff, emissiveIntensity: 0.35 });
    sl.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = glass; });
    slipperHold.add(sl);
  } catch (e) { console.warn('slipper', e); }
  const slipperGlow = glow(0xbfe0ff, 0.9, 0.6);
  slipperGlow.position.copy(slipperSpot).add(new THREE.Vector3(0, 0.22, 0));
  root.add(slipperGlow);

  // --- phải: váy hồng trên ma-nơ-canh + giỏ may + chuột + cây chổi + tranh
  const dress = dressForm();
  dress.position.set(4.55, 0, -2.9);
  dress.rotation.y = -0.4;
  root.add(dress);
  const basket = sewingBasket();
  basket.position.set(3.7, 0, -1.75);
  root.add(basket);
  const mice: Mouse[] = [];
  for (const [shirt, hat, x, y, z, ry, sc, seed] of [
    [0xe63946, 0xe63946, 3.6, 0.22, -1.72, -0.3, 1.25, 0],                                                   // Jaq áo đỏ mũ đỏ, ngồi trong giỏ
    [0xffd23f, null, 4.3, 0, -1.2, -0.6, 1.45, 2.1],                                                          // Gus áo vàng
    [0x9b5de5, 0x9b5de5, -1.5, 5 * STEP_RISE, STAIR_Z0 - 4 * STEP_RUN - STEP_RUN / 2, 0.4, 1.2, 4.2],       // chuột tím trên bậc thang
  ] as const) {
    const m = mouse(shirt, hat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.scale.setScalar(sc);
    root.add(m);
    mice.push({ obj: m, seed });
  }
  const br = broom();
  br.position.set(6.05, 0, 0.9);
  root.add(br);
  const castleArt = painting(1.5, 1.2, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b3fb0'); gr.addColorStop(1, '#ff9ed8');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (const [x, y, col] of [[0.2, 0.25, '#ffd166'], [0.8, 0.2, '#ff5fb4'], [0.55, 0.12, '#9fd0ff']] as const) {
      c.strokeStyle = col; c.lineWidth = 3;
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; c.beginPath(); c.moveTo(w * x + Math.cos(a) * 6, h * y + Math.sin(a) * 6); c.lineTo(w * x + Math.cos(a) * 22, h * y + Math.sin(a) * 22); c.stroke(); }
    }
    c.fillStyle = '#e9e0ff';
    c.fillRect(w * 0.22, h * 0.62, w * 0.56, h * 0.38);
    for (const [x, tw, th] of [[0.28, 0.1, 0.24], [0.5, 0.14, 0.42], [0.72, 0.1, 0.26], [0.39, 0.07, 0.3], [0.61, 0.07, 0.32]] as const) {
      c.fillStyle = '#e9e0ff'; c.fillRect(w * (x - tw / 2), h * (0.62 - th), w * tw, h * th + 2);
      c.fillStyle = '#3d6bff'; c.beginPath(); c.moveTo(w * (x - tw * 0.7), h * (0.62 - th)); c.lineTo(w * (x + tw * 0.7), h * (0.62 - th)); c.lineTo(w * x, h * (0.62 - th - 0.14)); c.fill();
    }
    c.fillStyle = '#ffd166';
    c.beginPath(); c.arc(w * 0.5, h * 0.86, 10, Math.PI, 0); c.fill(); c.fillRect(w * 0.5 - 10, h * 0.86, 20, h * 0.14);
  }, 0xffffff, GOLD);
  castleArt.position.set(6.4, 2.3, -2.5);
  castleArt.rotation.y = -Math.PI / 2;
  root.add(castleArt);
  const horseArt = painting(0.9, 0.9, (c, w, h) => {
    c.fillStyle = '#ffe2f2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9fd0ff'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2); c.fill();
    c.font = `${Math.round(w * 0.36)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🐴', w * 0.33, h * 0.52);
    c.fillText('🎃', w * 0.7, h * 0.55);
  }, 0xffffff, GOLD);
  horseArt.position.set(6.4, 2.35, 0.6);
  horseArt.rotation.y = -Math.PI / 2;
  root.add(horseArt);

  // --- 2 bình hoa hồng ở chân tường sau, ngoài lan can
  const roseCols = [0xff5fb4, 0xffffff, 0x9fd0ff, 0xff8fc8, 0xffd166];
  for (const s of [-1, 1]) {
    const urn = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0.1, 0.1), new THREE.Vector2(0.22, 0.35), new THREE.Vector2(0.2, 0.55), new THREE.Vector2(0.26, 0.6),
    ], 20), mat(0xf4f8ff, { rough: 0.35 }));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), railM);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.4;
    urn.add(pot, band);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4;
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat(roseCols[k % roseCols.length], { rough: 0.6, flat: true }));
      r.position.set(Math.cos(a) * (0.05 + (k % 3) * 0.06), 0.66 + (k % 3) * 0.06, Math.sin(a) * (0.05 + (k % 3) * 0.06));
      urn.add(r);
    }
    urn.scale.setScalar(1.3);
    urn.position.set(s * 2.75, 0, -3.8);
    shadows(urn);
    root.add(urn);
  }

  // --- 2 đèn chùm pha lê treo 2 bên
  const chandeliers: THREE.Object3D[] = [];
  const chCandles: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const holder = new THREE.Group();
    holder.position.set(s * 3.6, 3.0, -3.2);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 4, 6), railM);
    chain.position.y = 2.5;
    const cc = crystalChandelier();
    const halo = glow(0xffe2a0, 2.2, 0.35);
    halo.position.y = 0.05;
    holder.add(chain, cc.group, halo);
    chCandles.push(...cc.candles);
    root.add(holder);
    chandeliers.push(holder);
  }

  // --- chim xanh bay lượn
  const birds: Bird[] = [];
  for (let i = 0; i < 3; i++) {
    const b = bluebird(i === 1 ? 0x6fb8ff : 0x3d8bff);
    b.scale.setScalar(1.35);
    root.add(b);
    birds.push({ obj: b, r: 4.2 + i * 0.35, speed: 0.32 + i * 0.05, phase: i * 2.1, y: 2.85 + (i % 2) * 0.2 });
  }

  // --- ánh sáng: 2 đèn ấm dưới đèn chùm + 1 đèn xanh phép bà tiên ở cỗ xe (tổng 3)
  const warmL = new THREE.PointLight(0xffd28a, 5, 8, 1.6);
  warmL.position.set(-3.5, 2.8, -2.6);
  const warmR = new THREE.PointLight(0xffd28a, 5, 8, 1.6);
  warmR.position.set(3.5, 2.8, -2.6);
  const fairy = new THREE.PointLight(0x7fb8ff, 2, 6, 1.6);
  fairy.position.set(-4.3, 1.8, -2.2);
  root.add(warmL, warmR, fairy);

  Object.assign(ctx.state, {
    hourHand, minHand, clockGlow, star, winGlows, lamps: stairs.lamps, coach, pumpkins, wandHold, wandGlow,
    slipperHold, slipperGlow, slipperSpot, mice, birds, chandeliers, candles: [...sconces, ...chCandles], stars, fairy,
  });
}

const tmpV = new THREE.Vector3();

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time;
  const s = ctx.state;
  const melt = ctx.melt;
  // đồng hồ: đóng băng dừng ở 11:45, băng tan kim nhích dần, tỉnh dậy = đúng 12 giờ rồi chạy tiếp thật chậm
  const minHand = s.minHand as THREE.Object3D | undefined, hourHand = s.hourHand as THREE.Object3D | undefined;
  if (minHand && hourHand) {
    if (ctx.awake && s.wokeAt === undefined) s.wokeAt = t;
    const target = ctx.awake ? (t - (s.wokeAt as number)) * 0.05 : -Math.PI / 2 * (1 - melt);
    const cur = (minHand.userData.a as number | undefined) ?? target;
    const a = cur + (target - cur) * Math.min(1, dt * 2);
    minHand.userData.a = a;
    minHand.rotation.z = -a;
    hourHand.rotation.z = -a / 12;
  }
  const cg = s.clockGlow as THREE.Sprite | undefined;
  if (cg) cg.material.opacity = 0.15 + 0.2 * melt + (ctx.awake ? 0.12 * (0.5 + 0.5 * Math.sin(t * 3)) : 0);
  const star = s.star as THREE.Object3D | undefined;
  if (star) star.rotation.y = t * 1.2;
  (s.winGlows as THREE.Sprite[] | undefined)?.forEach((g, i) => { g.material.opacity = 0.2 + 0.15 * melt + Math.sin(t * 1.3 + i) * 0.04; });
  (s.lamps as THREE.Object3D[] | undefined)?.forEach((l, i) => {
    (l.userData.halo as THREE.Sprite).material.opacity = 0.4 + 0.25 * melt + Math.sin(t * 2 + i) * 0.05;
  });
  (s.candles as THREE.Object3D[] | undefined)?.forEach((c, i) => flicker(c, t, i * 1.3));
  (s.chandeliers as THREE.Object3D[] | undefined)?.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.7 + i) * 0.02; c.rotation.y = Math.sin(t * 0.3 + i) * 0.1; });

  // cỗ xe bí ngô: băng tan → thân bí phát sáng cam vàng, đèn sáng; tỉnh → lấp lánh vàng + xanh
  const coach = s.coach as Coach | undefined;
  if (coach) {
    coach.body.emissiveIntensity = 0.05 + 0.2 * melt + (ctx.awake ? 0.08 * Math.sin(t * 2.5) : 0);
    coach.lamps.forEach((l, i) => { (l.userData.halo as THREE.Sprite).material.opacity = 0.4 + 0.4 * melt + Math.sin(t * 5 + i) * 0.06; });
    bob(coach.group, t, 0.01 + 0.02 * melt, 1.6);
    if (ctx.awake && Math.random() < 0.15) {
      tmpV.set(COACH_POS.x + (Math.random() - 0.5) * 1.8, 0.5 + Math.random() * 1.6, COACH_POS.z + (Math.random() - 0.5) * 1.2);
      ctx.magic.twinkle(tmpV, Math.random() < 0.5 ? 0xf08c00 : 0x2f6bff, 1, 0.3, 0.35);
    }
  }
  (s.pumpkins as THREE.Object3D[] | undefined)?.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.4 + i * 1.7) * 0.03 * (0.3 + melt); });

  // đũa phép bà tiên bồng bềnh + rắc hạt xanh
  const wand = s.wandHold as THREE.Object3D | undefined;
  if (wand) {
    bob(wand, t, 0.08, 1.2);
    wand.rotation.y = Math.sin(t * 0.8) * 0.5;
    if (Math.random() < 0.08 + 0.25 * melt) ctx.magic.twinkle(tmpV.set(wand.position.x + 0.1, wand.position.y + 0.4, wand.position.z), Math.random() < 0.6 ? 0x2f6bff : 0x8a3fe0, 1, 0.3, 0.4);
  }
  const wg = s.wandGlow as THREE.Sprite | undefined;
  if (wg) wg.material.opacity = 0.35 + 0.2 * Math.sin(t * 3);
  const fairy = s.fairy as THREE.PointLight | undefined;
  if (fairy) fairy.intensity = 1.5 + 2.5 * melt + Math.sin(t * 2.2) * 0.3;

  // giày pha lê xoay nhẹ, lấp lánh
  const sh = s.slipperHold as THREE.Object3D | undefined;
  if (sh) { sh.rotation.y = Math.sin(t * 0.6) * 0.5; bob(sh, t, 0.02, 1.5); }
  const sg = s.slipperGlow as THREE.Sprite | undefined;
  if (sg) sg.material.opacity = 0.35 + 0.2 * Math.sin(t * 2.4) + 0.2 * melt;
  const spot = s.slipperSpot as THREE.Vector3 | undefined;
  if (spot && Math.random() < 0.06 + 0.1 * melt) ctx.magic.twinkle(tmpV.set(spot.x, spot.y + 0.25, spot.z), 0x2f7bff, 1, 0.3, 0.3);

  // chuột nhún nhảy, ngó nghiêng (tỉnh: nhảy cẫng)
  (s.mice as Mouse[] | undefined)?.forEach((m) => {
    const hop = ctx.awake ? Math.max(0, Math.sin(t * 5 + m.seed)) * 0.08 : Math.max(0, Math.sin(t * 2 + m.seed)) * 0.015 * (0.3 + melt);
    if (m.obj.userData.baseY === undefined) m.obj.userData.baseY = m.obj.position.y;
    m.obj.position.y = (m.obj.userData.baseY as number) + hop;
    const head = m.obj.userData.head as THREE.Object3D;
    head.rotation.y = Math.sin(t * 1.3 + m.seed) * 0.5;
    head.rotation.z = Math.sin(t * 0.9 + m.seed) * 0.15;
  });

  // chim xanh bay vòng; đóng băng: bay chậm
  const speedK = 0.35 + 0.65 * melt + (ctx.awake ? 0.3 : 0);
  (s.birds as Bird[] | undefined)?.forEach((b) => {
    b.phase += dt * b.speed * speedK;
    b.obj.position.set(Math.cos(b.phase) * b.r, b.y + Math.sin(b.phase * 3) * 0.12, -3.4 + Math.sin(b.phase) * 1.1);
    b.obj.rotation.y = Math.atan2(-Math.cos(b.phase) * 1.1, -Math.sin(b.phase) * b.r);
    const flap = Math.sin(t * 14 + b.r * 3) * 0.7;
    (b.obj.userData.wings as THREE.Object3D[]).forEach((w) => { w.rotation.x = flap * (w.userData.side as number); });
  });

  const stars = s.stars as THREE.Points | undefined;
  if (stars) (stars.material as THREE.PointsMaterial).opacity = 0.75 + 0.25 * Math.sin(t * 1.7);

  // hạt phép xanh lơ lửng khắp sảnh, nhiều dần khi băng tan
  if (Math.random() < 0.06 + 0.3 * melt) {
    tmpV.set((Math.random() - 0.5) * 10, 0.5 + Math.random() * 3.2, -3.5 + Math.random() * 4);
    ctx.magic.twinkle(tmpV, Math.random() < 0.65 ? 0x2f6bff : (Math.random() < 0.5 ? 0xe0338a : 0xf08c00), 1, 0.3, 0.3);
  }
}

const room: RoomDef = {
  id: 'cinderella',
  name: 'Cầu thang của Lọ Lem',
  emoji: '👠',
  princessModel: 'p_cinderella.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'giày', emoji: '👠', name: 'chiếc giày', ask: 'Chiếc nào là chiếc giày?' },
    { word: 'bí', emoji: '🎃', name: 'quả bí', ask: 'Quả nào là quả bí?', fill: { index: 0, distractors: ['p', 'đ'] } },
    { word: 'váy', emoji: '👗', name: 'cái váy', fill: { index: 0, distractors: ['b', 'p'] } },
    { word: 'nơ', emoji: '🎀', name: 'cái nơ', fill: { index: 0, distractors: ['p', 'g'] } },
    { word: 'chổi', emoji: '🧹', name: 'cái chổi' },
    { word: 'ngựa', emoji: '🐴', name: 'con ngựa' },
    { word: 'chim', emoji: '🐦', name: 'con chim' },
  ],
  challenges: ['spell', 'math', 'fill'],
  magicColors: [0x2f6bff, 0xe0338a],
  audio: { name: 'cinderella_name', intro: 'cinderella_intro', thanks: 'cinderella_thanks' },
};

export default room;

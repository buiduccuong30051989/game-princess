// PHÒNG ARIEL: Hang kho báu dưới biển. Vách đá xanh tím lấp lánh, miệng hang lớn phía sau nhìn ra biển xanh
// có lâu đài Atlantica xa xa + tia nắng rọi xuống. Trong hang: san hô rực rỡ, rong biển đung đưa, bong bóng bay,
// cá bơi vòng, rùa bơi ngang, cua Sebastian trên đá, vỏ sò khổng lồ có ngọc trai, rương kho báu, nĩa vàng (dinglehopper).
// Băng càng tan: càng nhiều bong bóng + cá, tia nắng sáng hơn, vỏ sò mở rộng, ngọc sáng rực.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import { mat, texMat, canvasTex, mix, skyDome, floor, curvedWall, fairyLights, glow, bob, shadows } from '../room/kit.ts';

const PAL = { primary: 0x00b4d8, secondary: 0xff6f9f, accent: 0xffc94d, light: 0xd4f6ff, dark: 0x0a4f8a };

// ---------------------------------------------------------------- tiện ích dựng khối
/** Số ngẫu nhiên có hạt giống (cảnh giống nhau mỗi lần vào phòng). */
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

/** Gộp nhiều khối nhỏ (mỗi khối 1 màu) thành 1 mesh màu đỉnh → ít draw call, cảnh vẫn giàu chi tiết. */
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
  mesh(rough = 0.7, flat = false, emissive = 0x000000): THREE.Mesh {
    const geo = mergeGeometries(this.parts) ?? new THREE.BufferGeometry();
    for (const p of this.parts) p.dispose();
    this.parts = [];
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, flatShading: flat, emissive, emissiveIntensity: 0.25 }));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

// ---------------------------------------------------------------- texture canvas
/** Vách đá hang: đốm đá tròn xanh–tím–ngọc, viền sáng, chấm khoáng lấp lánh. */
function rockTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6fa8e6'; g.fillRect(0, 0, w, h);
    const r = rng(11);
    const cols = ['#7fb8f0', '#9b8cf0', '#68cfd0', '#8fa4f5', '#a99af2', '#74c2ea'];
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rx = 30 + r() * 55, ry = 22 + r() * 40, rot = r() * 3;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        g.fillStyle = cols[i % cols.length];
        g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, rot, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)';
        g.beginPath(); g.ellipse(x + dx - rx * 0.2, y + dy - ry * 0.3, rx * 0.55, ry * 0.3, rot, 0, Math.PI * 2); g.fill();
      }
    }
    for (let i = 0; i < 90; i++) { g.fillStyle = i % 3 ? 'rgba(255,255,255,0.5)' : 'rgba(255,214,120,0.75)'; g.fillRect(r() * w, r() * h, 3, 3); }
  }, repeat);
}

/** Cát đáy biển: kem hồng + gợn sóng + hạt cát. */
function sandTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffe2b8'; g.fillRect(0, 0, w, h);
    const r = rng(5);
    g.strokeStyle = 'rgba(230,170,120,0.35)'; g.lineWidth = 5;
    for (let y = 10; y < h; y += 34) {
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x < w; x += 32) g.quadraticCurveTo(x + 16, y + ((x / 32) % 2 ? 8 : -8), x + 32, y);
      g.stroke();
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = ['#f3c48e', '#fff4dd', '#ffc6c6', '#e8b07a'][i % 4]; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
  }, [14, 14]);
}

/** Vân sáng lăn tăn dưới đáy biển (caustics) – nền trong suốt, vân trắng xanh. */
function causticTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(235,255,255,0.95)'; g.lineWidth = 3; g.lineCap = 'round';
    const r = rng(23);
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, s = 18 + r() * 26;
      g.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2, rr = s * (0.7 + r() * 0.5);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (k === 0) g.moveTo(px, py); else g.quadraticCurveTo(x + Math.cos(a - 0.5) * rr * 1.2, y + Math.sin(a - 0.5) * rr * 1.2, px, py);
      }
      g.stroke();
    }
  }, [5, 4]);
}

/** Tia nắng dưới nước: dải sáng mờ dần xuống dưới, mép mềm. */
function rayTex(): THREE.CanvasTexture {
  return canvasTex(64, 256, (g, w, h) => {
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gx; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    const gy = g.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gy; g.fillRect(0, 0, w, h);
  });
}

/** Vỏ sò quạt (thảm hồng + huy hiệu tường): nhiều múi, gân trắng, tai bản lề dưới. Tâm quạt ở (0.5w, 0.9h), bán kính 0.47w. */
function drawScallop(g: CanvasRenderingContext2D, w: number, h: number, a: string, b: string, rib: string): void {
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.9, R = w * 0.47, n = 9;
  const a0 = Math.PI * 1.08, a1 = Math.PI * 1.92;
  for (let i = 0; i < n; i++) {
    const s = a0 + (a1 - a0) * (i / n), e = a0 + (a1 - a0) * ((i + 1) / n), m = (s + e) / 2;
    g.fillStyle = i % 2 ? a : b;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(s) * R, cy + Math.sin(s) * R);
    g.quadraticCurveTo(cx + Math.cos(m) * R * 1.12, cy + Math.sin(m) * R * 1.12, cx + Math.cos(e) * R, cy + Math.sin(e) * R);
    g.closePath(); g.fill();
    g.strokeStyle = rib; g.lineWidth = w / 90;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(m) * R * 1.02, cy + Math.sin(m) * R * 1.02); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = w / 160;
  for (const k of [0.35, 0.55, 0.75]) { g.beginPath(); g.arc(cx, cy, R * k, a0, a1); g.stroke(); }
  g.fillStyle = b;
  g.beginPath(); g.moveTo(cx - w * 0.14, cy + h * 0.02); g.lineTo(cx + w * 0.14, cy + h * 0.02); g.lineTo(cx + w * 0.06, cy - h * 0.1); g.lineTo(cx - w * 0.06, cy - h * 0.1); g.closePath(); g.fill();
}

// ---------------------------------------------------------------- khối trang trí
/** Tường sau có miệng hang KHOÉT THỦNG, mép lởm chởm tự nhiên. Đáy hố dưới mặt cát để cát liền ra ngoài. */
function caveWall(w: number, h: number, holeW: number, holeH: number, m: THREE.Material): { mesh: THREE.Mesh; rim: THREE.Vector2[] } {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -1); shape.lineTo(w / 2, -1); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.lineTo(-w / 2, -1);
  const rim: THREE.Vector2[] = [];
  const rx = holeW / 2, side = holeH - rx * 0.9, n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let x: number, y: number;
    if (t < 0.2) { x = rx; y = -0.3 + (side + 0.3) * (t / 0.2); }
    else if (t > 0.8) { x = -rx; y = -0.3 + (side + 0.3) * ((1 - t) / 0.2); }
    else { const a = ((t - 0.2) / 0.6) * Math.PI; x = Math.cos(a) * rx; y = side + Math.sin(a) * rx * 0.9; }
    const wob = 1 + Math.sin(i * 1.7) * 0.035 + Math.sin(i * 4.1) * 0.02;
    rim.push(new THREE.Vector2(x * wob, y > 0.2 ? y * (1 + Math.sin(i * 2.3) * 0.02) : y));
  }
  shape.holes.push(new THREE.Path(rim.slice().reverse()));
  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / 3; uv[i * 2 + 1] = pos.getY(i) / 3; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  return { mesh, rim };
}

/** San hô cành (đệ quy) vào batch. dir = hướng mọc; flat = mọc trong mặt phẳng (quạt biển). */
function coralBranch(b: Batch, r: () => number, at: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number, color: number, tip: number, flat = false): void {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mid = at.clone().addScaledVector(dir, len / 2);
  b.add(new THREE.CylinderGeometry(rad * 0.72, rad, len, 7), color, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
  const end = at.clone().addScaledVector(dir, len);
  if (depth <= 0) {
    b.add(new THREE.SphereGeometry(rad * 1.3, 8, 6), tip, M(end.x, end.y, end.z));
    return;
  }
  const kids = 2 + (r() < 0.4 ? 1 : 0);
  for (let k = 0; k < kids; k++) {
    const d = dir.clone();
    const spread = 0.55 + r() * 0.35;
    if (flat) d.x += (k - (kids - 1) / 2) * spread;
    else { const a = (k / kids) * Math.PI * 2 + r(); d.x += Math.cos(a) * spread; d.z += Math.sin(a) * spread; }
    d.y += 0.25;
    d.normalize();
    coralBranch(b, r, end, d, len * (0.68 + r() * 0.15), rad * 0.72, depth - 1, color, tip, flat);
  }
}

/** Ống san hô (tube coral): cụm ống miệng loe. */
function tubeCoral(b: Batch, r: () => number, x: number, z: number, color: number, lip: number, scale = 1): void {
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.22 * scale, hh = (0.35 + r() * 0.5) * scale;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    b.add(new THREE.CylinderGeometry(0.085 * scale, 0.07 * scale, hh, 10, 1, true), color, M(px, hh / 2, pz));
    b.add(new THREE.TorusGeometry(0.085 * scale, 0.025 * scale, 6, 12), lip, M(px, hh, pz, Math.PI / 2));
  }
}

/** San hô não (tròn) có rãnh vòng. */
function brainCoral(b: Batch, x: number, y: number, z: number, s: number, color: number, groove: number): void {
  b.add(new THREE.SphereGeometry(s, 14, 10), color, M(x, y, z, 0, 0, 0, 1, 0.7, 1));
  for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(s * (0.5 + k * 0.2), s * 0.06, 5, 20), groove, M(x, y + s * 0.6 - k * s * 0.16, z, Math.PI / 2));
}

/** Sao biển 5 cánh (khối dày, bo cạnh). */
function starfishGeo(size: number): THREE.ExtrudeGeometry {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? size * 0.42 : size;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  return new THREE.ExtrudeGeometry(sh, { depth: size * 0.12, bevelEnabled: true, bevelSize: size * 0.1, bevelThickness: size * 0.1, bevelSegments: 2 });
}

/** Ốc xoắn: chuỗi cầu nhỏ dần theo đường xoắn + miệng loe. */
function conch(b: Batch, x: number, y: number, z: number, s: number, ry: number, color: number, lip: number): void {
  const base = M(x, y, z, 0, ry, 0, s);
  for (let i = 0; i < 7; i++) {
    const t = i / 6, a = t * Math.PI * 2.4, rr = 0.16 * (1 - t * 0.75);
    const local = M(Math.cos(a) * 0.07 * (1 - t), 0.12 + t * 0.28, Math.sin(a) * 0.07 * (1 - t), 0, 0, 0, rr / 0.16);
    b.add(new THREE.SphereGeometry(0.16, 10, 8), i % 2 ? color : mix(color, 0xffffff, 0.3), base.clone().multiply(local));
  }
  b.add(new THREE.ConeGeometry(0.14, 0.26, 10, 1, true), lip, base.clone().multiply(M(0.1, 0.1, 0, 0, 0, Math.PI / 2 + 0.3)));
}

/** Nĩa vàng (dinglehopper của Ariel): cán + 4 răng, dọc trục y, răng hướng lên. */
function fork(len: number): THREE.Group {
  const g = new THREE.Group();
  const gold = mat(0xffc233, { rough: 0.3, emissive: 0x8a5a00, ei: 0.35 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(len * 0.09, len * 0.6, len * 0.03), gold);
  handle.position.y = len * 0.3;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(len * 0.07, 12, 8), gold);
  knob.scale.set(1, 1.3, 0.5);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(len * 0.24, len * 0.07, len * 0.03), gold);
  neck.position.y = len * 0.62;
  g.add(handle, knob, neck);
  for (let i = 0; i < 4; i++) {
    const tine = new THREE.Mesh(new THREE.BoxGeometry(len * 0.035, len * 0.3, len * 0.03), gold);
    tine.position.set((i - 1.5) * len * 0.068, len * 0.8, 0);
    g.add(tine);
  }
  shadows(g);
  return g;
}

/** Cá tròn đáng yêu hướng +x. userData.tail = cụm đuôi để vẫy. Dùng chung hình khối (geos). */
function fish(geos: { ball: THREE.SphereGeometry; cone: THREE.ConeGeometry }, body: number, fin: number, len: number): THREE.Group {
  const g = new THREE.Group();
  const b = new THREE.Mesh(geos.ball, mat(body, { rough: 0.45 }));
  b.scale.set(len * 0.55, len * 0.36, len * 0.22);
  const pivot = new THREE.Group();
  pivot.position.x = -len * 0.46;
  const tail = new THREE.Mesh(geos.cone, mat(fin, { rough: 0.5 }));
  tail.rotation.z = -Math.PI / 2;
  tail.scale.set(len * 0.34, len * 0.4, len * 0.1);
  tail.position.x = -len * 0.2;
  pivot.add(tail);
  const dorsal = new THREE.Mesh(geos.cone, mat(fin, { rough: 0.5 }));
  dorsal.scale.set(len * 0.2, len * 0.22, len * 0.05);
  dorsal.position.set(-len * 0.05, len * 0.32, 0);
  dorsal.rotation.z = 0.5;
  g.add(b, pivot, dorsal);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(geos.ball, mat(0x1c2a5a, { rough: 0.2 }));
    eye.scale.setScalar(len * 0.075);
    eye.position.set(len * 0.3, len * 0.06, s * len * 0.15);
    g.add(eye);
  }
  g.userData.tail = pivot;
  return g;
}

/** Rùa biển: mai xanh vân lục giác, đầu + 4 chân chèo (userData.flips để quạt nước). Hướng +x. */
function turtle(): THREE.Group {
  const g = new THREE.Group();
  const shellTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#3fbf6f'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#1f8a55'; c.lineWidth = 8; c.fillStyle = '#5fd98a';
    for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) {
      const cx = x * 60 + (y % 2) * 30, cy = y * 52;
      c.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); }
      c.closePath(); c.fill(); c.stroke();
    }
    void h;
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), texMat(shellTex, { rough: 0.6 }));
  shell.scale.set(1.15, 0.55, 0.9);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.33, 0.06, 20), mat(0xf5e6a0, { rough: 0.7 }));
  belly.scale.set(1.12, 1, 0.88);
  const skin = mat(0x8fd694, { rough: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), skin);
  head.position.set(0.46, 0.04, 0);
  head.scale.set(1.25, 0.9, 0.95);
  g.add(shell, belly, head);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(0x1c2a5a, { rough: 0.2 }));
    eye.position.set(0.55, 0.08, s * 0.065);
    g.add(eye);
  }
  const flips: THREE.Object3D[] = [];
  for (const [x, z, big] of [[0.2, 0.3, 1], [0.2, -0.3, 1], [-0.25, 0.26, 0], [-0.25, -0.26, 0]] as const) {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), skin);
    f.scale.set(big ? 1.5 : 0.9, 0.25, big ? 2.2 : 1.2);
    f.position.z = Math.sign(z) * (big ? 0.18 : 0.1);
    p.add(f);
    g.add(p);
    flips.push(p);
  }
  g.userData.flips = flips;
  shadows(g);
  return g;
}

/** Cua Sebastian: thân đỏ, mắt trên cuống, 2 càng (userData.claws), 6 chân. Hướng +x. */
function crab(): THREE.Group {
  const g = new THREE.Group();
  const red = mat(0xe8323f, { rough: 0.45 }), redD = mat(0xc41f35, { rough: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), red);
  body.scale.set(1.25, 0.62, 0.95);
  body.position.y = 0.2;
  g.add(body);
  for (const s of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 6), red);
    stalk.position.set(0.1, 0.36, s * 0.07);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat(0xffffff, { rough: 0.3 }));
    eye.position.set(0.12, 0.45, s * 0.07);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(0x1c2a5a, { rough: 0.2 }));
    pupil.position.set(0.165, 0.45, s * 0.07);
    g.add(stalk, eye, pupil);
    for (let k = 0; k < 3; k++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.26, 5), redD);
      leg.position.set(-0.1 + k * 0.1, 0.1, s * 0.24);
      leg.rotation.x = s * 0.9;
      g.add(leg);
    }
  }
  const claws: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0.18, 0.22, s * 0.2);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.2, 6), red);
    upper.rotation.z = -0.9;
    upper.position.set(0.07, 0.06, 0);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), red);
    palm.scale.set(1.2, 0.9, 0.7);
    palm.position.set(0.17, 0.15, 0);
    const jaw = new THREE.Group();
    jaw.position.set(0.23, 0.15, 0);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.13, 6), red);
    top.rotation.z = -Math.PI / 2 + 0.25; top.position.set(0.05, 0.025, 0);
    const bot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 6), redD);
    bot.rotation.z = -Math.PI / 2 - 0.25; bot.position.set(0.045, -0.02, 0);
    jaw.add(top, bot);
    arm.add(upper, palm, jaw);
    arm.userData.top = top;
    g.add(arm);
    claws.push(arm);
  }
  g.userData.claws = claws;
  shadows(g);
  return g;
}

/** Vỏ sò khổng lồ có ngọc trai: nửa dưới cố định, nửa trên (userData.lid) mở dần. */
function giantClam(): THREE.Group {
  const g = new THREE.Group();
  const R = 0.6;
  const mkHalf = () => {
    const geo = new THREE.SphereGeometry(R, 36, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + 0.07 * Math.abs(Math.cos(Math.atan2(z, x) * 6));
      pos.setXYZ(i, x * k, y * 0.38 * k, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const bottom = new THREE.Mesh(mkHalf(), mat(0xff7eb0, { rough: 0.45, side: THREE.DoubleSide }));
  bottom.rotation.x = Math.PI;
  bottom.position.y = 0.24;
  const lining = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 36), mat(0xffd6ec, { rough: 0.3 }));
  lining.rotation.x = -Math.PI / 2;
  lining.position.y = 0.245;
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.25, -R);
  const lid = new THREE.Mesh(mkHalf(), mat(0xff95c0, { rough: 0.45, side: THREE.DoubleSide }));
  lid.position.z = R;
  lidPivot.add(lid);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), mat(0xfff4fb, { rough: 0.15, emissive: 0xffc6e8, ei: 0.55 }));
  pearl.position.set(0, 0.42, 0.05);
  const halo = glow(0xff9fd4, 1.1, 0.6);
  halo.position.copy(pearl.position);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.14, 20), mat(0xb68cf2, { rough: 0.8 }));
  foot.position.y = 0.07;
  g.add(foot, bottom, lining, lidPivot, pearl);
  shadows(g);
  g.add(halo);
  g.userData.lid = lidPivot;
  g.userData.halo = halo;
  return g;
}

/** Lâu đài Atlantica xa xa: tháp nhọn kem–hồng–vàng (gộp 1 mesh, mờ trong sương biển). */
function atlantica(): THREE.Mesh {
  const b = new Batch();
  const towers: [number, number, number, number][] = [[0, 5.2, 0.9, 0], [-2.2, 3.8, 0.7, 0.3], [2.2, 3.9, 0.7, -0.2], [-4, 2.6, 0.55, 0.6], [4.1, 2.8, 0.55, -0.4], [-1.1, 4.4, 0.5, -0.8], [1.2, 4.5, 0.5, 0.9]];
  for (const [x, h, r, z] of towers) {
    b.add(new THREE.CylinderGeometry(r * 0.8, r, h, 12), 0xffd4a8, M(x, h / 2, z));
    b.add(new THREE.ConeGeometry(r * 1.15, h * 0.5, 12), 0xff9ec7, M(x, h * 1.25, z));
    b.add(new THREE.SphereGeometry(r * 0.28, 8, 6), 0xffe066, M(x, h * 1.5 + r * 0.2, z));
    b.add(new THREE.TorusGeometry(r * 0.85, r * 0.12, 6, 16), 0xffe066, M(x, h * 0.9, z, Math.PI / 2));
  }
  b.add(new THREE.CylinderGeometry(5.5, 6.5, 1.4, 24), 0xc9a6ff, M(0, 0.7, 0));
  const m = b.mesh(0.8, false, 0xffb0d0);
  m.castShadow = false;
  return m;
}

// ---------------------------------------------------------------- dữ liệu hoạt cảnh
interface Weed { geo: THREE.BufferGeometry; base: Float32Array; h: number; seed: number; amp: number }
interface Swimmer { obj: THREE.Object3D; c: THREE.Vector3; rx: number; rz: number; speed: number; a: number; order: number; bobA: number }
interface Bubbles { mesh: THREE.InstancedMesh; x: Float32Array; y: Float32Array; z: Float32Array; v: Float32Array; s: Float32Array; seed: Float32Array; spawn: (i: number, first: boolean) => void }

const _dummy = new THREE.Object3D();
const _tw = new THREE.Vector3();

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root, scene } = ctx;
  const r = rng(42);
  const R = 6.8;          // bán kính hang
  const H = 9;
  const gap = 0.36;
  const backZ = -R * Math.cos(gap);
  const chord = 2 * R * Math.sin(gap);

  // --- biển ngoài miệng hang: vòm nước xanh + sương biển + tia nắng + lâu đài Atlantica
  scene.fog = new THREE.Fog(0x5cc6e6, 10, 52);
  const dome = skyDome(0xaaf4ff, 0x2a9ad6, 70);
  dome.position.set(0, -6, -10);
  root.add(dome);
  const castle = atlantica();
  castle.position.set(1.2, -2.2, -30);
  root.add(castle);
  const castleGlow = glow(0xffe0f0, 16, 0.35);
  castleGlow.position.set(1.2, 3.5, -31);
  root.add(castleGlow);
  // đồi san hô xa + rong xa + đáy biển ngoài
  const farB = new Batch();
  for (let i = 0; i < 14; i++) {
    const x = (i - 6.5) * 4.2 + (r() - 0.5) * 2, z = -16 - r() * 14, s = 1.5 + r() * 2.5;
    farB.add(new THREE.SphereGeometry(1, 12, 8), [0xc58cf0, 0xff8fb8, 0x6fd6c0, 0xa0b4ff][i % 4], M(x, -1.2, z, 0, 0, 0, s, s * 0.8, s));
  }
  for (let i = 0; i < 10; i++) {
    const x = (i - 4.5) * 5 + (r() - 0.5) * 3, z = -12 - r() * 12, hh = 2.5 + r() * 3;
    farB.add(new THREE.ConeGeometry(0.25, hh, 5), 0x34b58a, M(x, hh / 2 - 1, z, 0, 0, (r() - 0.5) * 0.3));
  }
  const far = farB.mesh(0.9);
  far.castShadow = false;
  root.add(far);
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), mat(0xf2cf9a, { rough: 1 }));
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.set(0, -2.3, -40);
  root.add(seabed);

  const rayT = rayTex();
  const rays: THREE.Mesh[] = [];
  const addRay = (x: number, y: number, z: number, w: number, h: number, rz: number, op: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: rayT, color: 0xf2ffff, transparent: true, opacity: op, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.z = rz;
    m.userData.op = op;
    m.userData.seed = r() * 10;
    root.add(m);
    rays.push(m);
  };
  for (let i = 0; i < 6; i++) addRay(-9 + i * 3.6 + r(), 6, -14 - r() * 8, 1.4 + r(), 20, -0.35 + r() * 0.2, 0.28);
  // tia rọi vào trong hang qua khe trần – ở sau/ngang hai bên công chúa, không che mặt
  for (const [x, z, rz] of [[-4.2, -3.6, -0.28], [4.4, -3.2, 0.3], [-1.4, -5.2, -0.22], [1.8, -5.0, 0.2]] as const) addRay(x, 3.4, z, 1.1, 7.5, rz, 0.2);

  // --- vách hang: 2 cung đá hai bên + vách sau có miệng hang
  const rockSide = texMat(rockTex([5, 2.5]), { rough: 0.9 });
  const sideArc = Math.PI * 0.66 - gap;
  for (const side of [-1, 1]) root.add(curvedWall(R, H, rockSide, sideArc, side * (gap + sideArc / 2)));
  const back = caveWall(chord + 0.05, H, 3.9, 3.9, texMat(rockTex([1, 1]), { rough: 0.9 }));
  back.mesh.position.set(0, 0, backZ);
  root.add(back.mesh);

  // đá tảng viền miệng hang + chân vách + nhũ đá trần (gộp 1 mesh, flat shading cho ra chất đá)
  const rocks = new Batch();
  const rockCols = [0x8f7fe6, 0x6fb0ea, 0x5fc7c9, 0xa58ff0, 0x7aa0f2];
  const dodec = new THREE.DodecahedronGeometry(1, 0);
  back.rim.forEach((p, i) => {
    if (i % 2) return;
    const s = 0.22 + r() * 0.2;
    rocks.add(dodec, rockCols[i % rockCols.length], M(p.x * 1.03, Math.max(0.05, p.y), backZ + 0.12, r() * 3, r() * 3, r() * 3, s, s * 0.85, s * 0.7));
  });
  for (let i = 0; i < 34; i++) {
    const a = (i / 33 - 0.5) * Math.PI * 1.3;
    if (Math.abs(a) < 0.33) continue; // chừa miệng hang
    const s = 0.3 + r() * 0.45;
    rocks.add(dodec, rockCols[i % rockCols.length], M(Math.sin(a) * (R - 0.3), s * 0.35, -Math.cos(a) * (R - 0.3), r() * 3, r() * 3, r() * 3, s, s * 0.7, s));
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 15 - 0.5) * Math.PI * 1.25, hh = 0.6 + r() * 1.1;
    rocks.add(new THREE.ConeGeometry(0.22 + r() * 0.2, hh, 6), rockCols[(i + 2) % rockCols.length], M(Math.sin(a) * (R - 0.4), 5.3 - hh / 2, -Math.cos(a) * (R - 0.4), Math.PI, r() * 3, 0));
  }
  // tảng đá làm bệ cho cua + ốc
  rocks.add(dodec, 0x9a86ee, M(-4.9, 0.2, -0.3, 0.3, 0.5, 0.1, 0.7, 0.4, 0.6));
  rocks.add(dodec, 0x6fb6ea, M(5.1, 0.2, 0.9, 0.1, 1.2, 0.2, 0.55, 0.4, 0.5));
  root.add(rocks.mesh(0.85, true));

  // --- sàn cát + vân nắng lăn tăn + thảm vỏ sò hồng
  root.add(floor(40, 40, texMat(sandTex(), { rough: 0.95 })));
  const causT = causticTex();
  const caustic = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshBasicMaterial({ map: causT, color: 0xdffcff, transparent: true, opacity: 0.32, depthWrite: false }));
  caustic.rotation.x = -Math.PI / 2;
  caustic.position.set(0, 0.02, -0.5);
  root.add(caustic);
  const shellTex = canvasTex(512, 512, (g, w, h) => drawScallop(g, w, h, '#ff8fb8', '#ffb3cf', '#fff3f8'));
  const shellRug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshStandardMaterial({ map: shellTex, transparent: true, alphaTest: 0.4, roughness: 0.9, metalness: 0 }));
  shellRug.rotation.x = -Math.PI / 2;
  shellRug.position.set(0, 0.03, 1.55);
  shellRug.receiveShadow = true;
  root.add(shellRug);

  // --- san hô + sao biển + ốc (gộp 1 mesh màu đỉnh)
  const reef = new Batch();
  const coralSpots: [number, number, number, number, number, boolean][] = [
    // x, z, màu, màu đầu cành, cỡ, quạt?
    [-5.6, -2.6, 0xff5c8a, 0xffd1e0, 0.5, false], [-4.4, -4.6, 0xff8a3d, 0xffe08a, 0.42, false], [-3.4, -5.4, 0xb05cff, 0xf0c8ff, 0.5, true],
    [5.5, -2.9, 0xff4f9a, 0xffd1ec, 0.5, true], [4.3, -4.6, 0xffa62b, 0xfff0a0, 0.45, false], [3.4, -5.5, 0xff5c8a, 0xffd1e0, 0.4, false],
    [-6.0, 0.6, 0xa77bff, 0xf0e0ff, 0.42, false], [6.1, -0.6, 0xff7a59, 0xffe0c8, 0.45, false],
    [-2.3, -5.9, 0x36d6b0, 0xd8fff4, 0.38, true], [2.5, -5.9, 0xffd23f, 0xfff6c8, 0.36, true],
  ];
  for (const [x, z, c, tip, s, flat] of coralSpots) {
    const d = new THREE.Vector3((r() - 0.5) * 0.2, 1, 0).normalize();
    coralBranch(reef, r, new THREE.Vector3(x, 0, z), d, s * 0.9, s * 0.13, 3, c, tip, flat);
  }
  tubeCoral(reef, r, -5.2, -1.2, 0xb35cff, 0xffd6ff, 1.2);
  tubeCoral(reef, r, 5.2, -1.8, 0xff7a3d, 0xffe066, 1.1);
  tubeCoral(reef, r, -2.9, -4.9, 0x2ec4b6, 0xe8fff8, 0.9);
  brainCoral(reef, -4.0, 0.12, -3.2, 0.45, 0xffb347, 0xff7f3a);
  brainCoral(reef, 3.8, 0.1, -3.6, 0.4, 0x7ee081, 0x3fae6a);
  brainCoral(reef, 4.9, 0.1, -4.9, 0.3, 0xff8fb8, 0xff5c8a);
  const star = starfishGeo(0.16);
  const stars: [number, number, number, number, number][] = [
    [-3.6, 0.03, 1.9, -Math.PI / 2, 0xff7a3d], [3.9, 0.03, 2.3, -Math.PI / 2, 0xff4f9a], [4.6, 0.03, -2.2, -Math.PI / 2, 0xffc233],
    [-1.6, 1.4, backZ + 0.1, 0, 0xff5c8a], [1.9, 2.6, backZ + 0.1, 0, 0xffa62b], [-5.3, 0.42, -0.25, -1.2, 0xffd23f],
  ];
  for (const [x, y, z, rx, c] of stars) reef.add(star, c, M(x, y, z, rx, 0, r() * 3));
  conch(reef, 5.1, 0.35, 0.9, 1.3, 2.4, 0xffb3a7, 0xff6f9f);
  conch(reef, -3.3, 0, 2.5, 1.1, 0.8, 0xc9a6ff, 0xff8fb8);
  conch(reef, 2.9, 0, -4.2, 1.2, -1.2, 0xffd08a, 0xff7a59);
  root.add(reef.mesh(0.6, false, 0x221133));

  // --- rong biển đung đưa (dải ribbon, uốn theo sin mỗi frame)
  const weeds: Weed[] = [];
  const weedCols = [0x2ecc71, 0x1fbf8f, 0x7ed957, 0x16a58a];
  const weedSpots: [number, number, number][] = [
    [-6.0, -1.8, 3.4], [-5.7, -2.2, 2.6], [-4.9, -4.2, 3.8], [-4.5, -4.5, 2.7], [-3.8, -5.2, 3.2],
    [6.0, -1.5, 3.2], [5.6, -2.5, 3.9], [5.0, -4.0, 2.8], [4.0, -5.0, 3.5], [-6.2, 1.4, 2.4], [6.2, 1.2, 2.6],
    [-1.6, -7.5, 3.6], [1.9, -7.8, 3.2], [0.4, -9.5, 4.2],
  ];
  weedSpots.forEach(([x, z, h], i) => {
    const geo = new THREE.PlaneGeometry(0.26, h, 1, 14);
    geo.translate(0, h / 2, 0);
    const pos = geo.getAttribute('position');
    for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); pos.setX(k, pos.getX(k) * (1.1 - (y / h) * 0.7)); }
    const m = new THREE.Mesh(geo, mat(weedCols[i % weedCols.length], { rough: 0.7, side: THREE.DoubleSide }));
    m.position.set(x, 0, z);
    m.rotation.y = r() * Math.PI;
    m.castShadow = true;
    m.frustumCulled = false; // đỉnh lá lắc ra ngoài bounding box gốc
    root.add(m);
    weeds.push({ geo, base: new Float32Array(pos.array as ArrayLike<number>), h, seed: r() * 10, amp: 0.18 + r() * 0.12 });
  });

  // --- chuỗi ngọc trai phát sáng võng ngang miệng hang + 2 vách
  const pearlCols = [0xfff4fb, 0xffc6e8, 0xc6f1ff];
  root.add(
    fairyLights(new THREE.Vector3(-2.3, 4.25, backZ + 0.35), new THREE.Vector3(2.3, 4.25, backZ + 0.35), 0.45, 14, pearlCols),
    fairyLights(new THREE.Vector3(-5.9, 3.6, -2.4), new THREE.Vector3(-3.0, 4.2, -5.6), 0.5, 12, pearlCols),
    fairyLights(new THREE.Vector3(3.0, 4.2, -5.6), new THREE.Vector3(5.9, 3.6, -2.4), 0.5, 12, pearlCols),
  );

  // --- vách sau: nĩa vàng lớn (trái) + huy hiệu vỏ sò tím viền ngọc (phải)
  // (vách sau phẳng chỉ rộng ±2.4 m; 2 món này gắn lên vách cong hai bên miệng hang, quay vào tâm)
  const onCave = (obj: THREE.Object3D, x: number, y: number, inset: number) => {
    const z = -Math.sqrt(R * R - x * x);
    obj.position.set(x, y, z);
    obj.lookAt(0, y, 0);
    obj.translateZ(inset);
    root.add(obj);
  };
  const forkHolder = new THREE.Group();
  const bigFork = fork(1.1);
  bigFork.rotation.z = 0.28;
  forkHolder.add(bigFork);
  onCave(forkHolder, -3.35, 1.3, 0.3);
  const forkGlow = glow(0xffd966, 1.9, 0.45);
  onCave(forkGlow, -3.4, 1.9, 0.22);
  const emblemTex = canvasTex(512, 512, (g, w, h) => drawScallop(g, w, h, '#b77cff', '#d4a8ff', '#fff4ff'));
  const emblem = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ map: emblemTex, transparent: true, alphaTest: 0.4, roughness: 0.6, metalness: 0 }));
  const emblemHolder = new THREE.Group();
  emblemHolder.add(emblem);
  const emblemPearls = new Batch();
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (1.08 + 0.84 * (i / 10));
    // tâm quạt ở v = 0.1 của ảnh → y = -0.6 so với tâm tấm; bán kính 0.47 × 1.5 m; trục y canvas ngược trục y thế giới
    emblemPearls.add(new THREE.SphereGeometry(0.05, 10, 8), i % 2 ? 0xfff4fb : 0xffd6ec, M(Math.cos(a) * 0.74, -0.6 - Math.sin(a) * 0.74, 0.05));
  }
  emblemHolder.add(emblemPearls.mesh(0.2, false, 0xffc6e8));
  onCave(emblemHolder, 3.4, 2.35, 0.12);

  // --- kệ đá hai vách: đồ sưu tầm của Ariel
  const ledge = mat(0xffb3c7, { rough: 0.6 });
  const placeOnWall = (obj: THREE.Object3D, x: number, y: number, z: number) => { obj.position.set(x, y, z); obj.lookAt(0, y, 0); root.add(obj); };
  for (const [x, y, z] of [[-5.25, 1.9, -3.85], [5.35, 2.0, -3.7]] as const) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.5), ledge);
    l.castShadow = true; l.receiveShadow = true;
    placeOnWall(l, x, y, z);
  }
  // trái: nĩa nhỏ, gương cầm tay, cốc vàng
  const gold = mat(0xffc233, { rough: 0.3, emissive: 0x8a5a00, ei: 0.3 });
  const trinkL = new THREE.Group();
  const f2 = fork(0.5); f2.position.set(-0.55, 0, 0.05); f2.rotation.z = -0.15; trinkL.add(f2);
  const mirror = new THREE.Group();
  const mFrame = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 24), gold);
  const mGlass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), mat(0xbff3ff, { rough: 0.05, emissive: 0x6fd6ff, ei: 0.35 }));
  const mHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.26, 8), gold);
  mFrame.position.y = 0.42; mGlass.position.set(0, 0.42, 0.01); mHandle.position.y = 0.13;
  mirror.add(mFrame, mGlass, mHandle); mirror.rotation.z = 0.12; trinkL.add(mirror);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.22, 16), gold);
  cup.position.set(0.45, 0.2, 0);
  const cupFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 16), gold);
  cupFoot.position.set(0.45, 0.04, 0);
  trinkL.add(cup, cupFoot);
  shadows(trinkL);
  placeOnWall(trinkL, -5.25, 1.95, -3.85);
  trinkL.translateZ(0.05);
  // phải: hũ ngọc trai + ốc + đồng hồ cát
  const trinkR = new THREE.Group();
  const jar = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xbfeaff, { rough: 0.05, opacity: 0.55 }));
  jar.position.set(-0.45, 0.2, 0);
  const jp = new Batch();
  for (let i = 0; i < 12; i++) jp.add(new THREE.SphereGeometry(0.05, 8, 6), i % 3 ? 0xfff4fb : 0xffc6e8, M(-0.45 + (r() - 0.5) * 0.2, 0.08 + r() * 0.14, (r() - 0.5) * 0.2));
  trinkR.add(jp.mesh(0.2, false, 0xffd6ec), jar);
  const hg = new THREE.Group();
  for (const y of [0, 0.36]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 12), mat(0x3fb7e8, { rough: 0.5 })); cap.position.y = y; hg.add(cap); }
  for (const [y, rot] of [[0.1, 0], [0.26, Math.PI]] as const) { const bulb = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 12), mat(0xe8fbff, { rough: 0.05, opacity: 0.6 })); bulb.position.y = y; bulb.rotation.x = rot; hg.add(bulb); }
  const sandIn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.08, 12), mat(0xffc233)); sandIn.position.y = 0.06; hg.add(sandIn);
  hg.position.set(0.45, 0.02, 0);
  trinkR.add(hg);
  const smallConch = new Batch();
  conch(smallConch, 0, 0, 0, 0.7, 0.5, 0xffc0a8, 0xff6f9f);
  trinkR.add(smallConch.mesh(0.5));
  shadows(trinkR);
  placeOnWall(trinkR, 5.35, 2.05, -3.7);
  trinkR.translateZ(0.05);

  // --- rương kho báu (CC0 Quaternius) + núi tiền vàng + đá quý + chuỗi ngọc
  try {
    const chest = await ctx.model('rooms/ariel/chest.glb', { height: 0.72 });
    chest.position.set(-4.35, 0, -2.05);
    chest.rotation.y = 0.75;
    shadows(chest);
    // texture gỗ gốc hơi tối → nâng sáng + ấm cho hợp nền biển tươi
    chest.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.isMeshStandardMaterial && !m.userData.bright) { m.color.setRGB(1.5, 1.3, 1.1); m.userData.bright = true; }
    });
    root.add(chest);
  } catch (e) { console.warn('chest', e); }
  const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 14), mat(0xffc933, { rough: 0.3, emissive: 0x9a6a00, ei: 0.35 }), 70);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.75;
    const hgt = Math.max(0, 0.32 * (1 - d / 0.75)) * r();
    _dummy.position.set(-3.75 + Math.cos(a) * d, 0.012 + hgt, -1.45 + Math.sin(a) * d * 0.8);
    _dummy.rotation.set((r() - 0.5) * 1.2, r() * 3, (r() - 0.5) * 1.2);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    coins.setMatrixAt(i, _dummy.matrix);
  }
  coins.castShadow = true;
  root.add(coins);
  const gems = new Batch();
  const oct = new THREE.OctahedronGeometry(0.09, 0);
  for (const [x, y, z, c] of [[-3.5, 0.2, -1.3, 0xff2f6d], [-3.9, 0.15, -1.1, 0x2fd6a0], [-3.3, 0.1, -1.7, 0x9b5de5], [-4.0, 0.12, -1.7, 0x2f9bff], [-3.6, 0.3, -1.55, 0xffd23f]] as const) {
    gems.add(oct, c, M(x, y, z, r(), r(), r(), 1, 1.35, 1));
  }
  const neck = new Batch();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; neck.add(new THREE.SphereGeometry(0.035, 8, 6), 0xfff4fb, M(-3.2 + Math.cos(a) * 0.22, 0.04 + Math.max(0, Math.sin(a)) * 0.05, -0.95 + Math.sin(a) * 0.14)); }
  root.add(gems.mesh(0.2, true, 0x331133), neck.mesh(0.2, false, 0xffe0f0));

  // --- vỏ sò khổng lồ có ngọc (phải)
  const clam = giantClam();
  clam.position.set(4.35, 0, -1.35);
  clam.rotation.y = -0.55;
  clam.scale.setScalar(1.15);
  root.add(clam);

  // --- cua Sebastian trên tảng đá trái, quay vào giữa phòng
  const seb = crab();
  seb.position.set(-4.9, 0.36, -0.25);
  seb.rotation.y = -0.2;
  seb.scale.setScalar(1.2);
  root.add(seb);

  // --- cá bơi (trong hang: 2 vòng hai bên, ngoài hang: đàn cá xa) + rùa bơi ngang phía sau trên cao
  const geos = { ball: new THREE.SphereGeometry(1, 16, 12), cone: new THREE.ConeGeometry(1, 1, 8) };
  const fishCols: [number, number][] = [[0xffd23f, 0x2f9bff], [0xff7a1a, 0xffffff], [0xff5c8a, 0xffd1e0], [0xb05cff, 0xffc233], [0x2ec4b6, 0xffe066], [0x2f9bff, 0xffd23f]];
  const swimmers: Swimmer[] = [];
  const addFish = (c: THREE.Vector3, rx: number, rz: number, speed: number, len: number, k: number) => {
    const [b, f] = fishCols[k % fishCols.length];
    const o = fish(geos, b, f, len);
    root.add(o);
    swimmers.push({ obj: o, c, rx, rz, speed, a: r() * Math.PI * 2, order: 0, bobA: 0.12 });
  };
  for (let i = 0; i < 4; i++) addFish(new THREE.Vector3(-4.7, 2.5 + i * 0.28, -2.4), 0.95 + i * 0.12, 1.5, 0.5 + i * 0.08, 0.34, i);
  for (let i = 0; i < 4; i++) addFish(new THREE.Vector3(4.8, 2.7 + i * 0.26, -2.5), 0.9 + i * 0.12, 1.5, -(0.45 + i * 0.09), 0.34, i + 2);
  for (let i = 0; i < 7; i++) addFish(new THREE.Vector3(1, 0.6 + (i % 4) * 0.9, -16 - (i % 3) * 3), 9 + i, 3 + (i % 3), 0.12 + (i % 3) * 0.03, 0.5, i);
  // thứ tự hiện dần khi băng tan: xen kẽ trái / phải / ngoài biển
  const order = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11, 12, 13, 14];
  swimmers.forEach((s, i) => { s.order = order[i] / swimmers.length; });
  const tur = turtle();
  tur.scale.setScalar(1.1);
  root.add(tur);
  const turtleSwim: Swimmer = { obj: tur, c: new THREE.Vector3(0, 3.45, -3.5), rx: 3.6, rz: 0.8, speed: 0.16, a: 1.2, order: 0, bobA: 0.1 };

  // --- bong bóng bay (1 InstancedMesh, nguồn: vỏ sò, rương, rong, miệng hang, góc trước)
  const N = 90;
  const srcs = [[4.35, -1.3, 0.25], [-4.1, -1.9, 0.3], [-5.3, -2.8, 0.6], [5.3, -3.0, 0.6], [0.0, -7.5, 1.6], [-5.4, 1.2, 0.5], [5.4, 1.2, 0.5]];
  const bub: Bubbles = {
    mesh: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xeafcff, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.5, emissive: 0x7fdcff, emissiveIntensity: 0.3, depthWrite: false }), N),
    x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), v: new Float32Array(N), s: new Float32Array(N), seed: new Float32Array(N),
    spawn: (i, first) => {
      const src = srcs[i % srcs.length];
      bub.x[i] = src[0] + (Math.random() - 0.5) * src[2];
      bub.z[i] = src[1] + (Math.random() - 0.5) * src[2];
      bub.y[i] = first ? Math.random() * 5 : 0.3;
      bub.v[i] = 0.35 + Math.random() * 0.45;
      bub.s[i] = 0.035 + Math.random() * 0.08;
      bub.seed[i] = Math.random() * 10;
    },
  };
  for (let i = 0; i < N; i++) bub.spawn(i, true);
  bub.mesh.frustumCulled = false;
  root.add(bub.mesh);

  // --- ánh sáng: đèn ngọc hồng (vỏ sò) + đèn ngọc xanh (rương) – 2 point light
  const pearlL = new THREE.PointLight(0xff8fd0, 5, 7, 1.6);
  pearlL.position.set(4.2, 1.6, -0.9);
  const aquaL = new THREE.PointLight(0x7fe8ff, 5, 9, 1.6);
  aquaL.position.set(-3.6, 3.2, -2.2);
  root.add(pearlL, aquaL);
  const mouthGlow = glow(0xcff8ff, 6, 0.3);
  mouthGlow.position.set(0, 2.2, backZ - 0.4);
  root.add(mouthGlow);

  Object.assign(ctx.state, { weeds, swimmers, turtleSwim, bub, rays, causT, clam, seb, pearlL, mouthGlow, forkGlow, castleGlow });
}

/** Bơi theo vòng elip, quay đầu theo hướng bơi, vẫy đuôi. */
function swim(s: Swimmer, t: number, dt: number, boost: number): void {
  s.a += s.speed * dt * boost;
  const ca = Math.cos(s.a), sa = Math.sin(s.a);
  s.obj.position.set(s.c.x + ca * s.rx, s.c.y + Math.sin(s.a * 2 + s.order * 7) * s.bobA, s.c.z + sa * s.rz);
  const dir = Math.sign(s.speed) || 1;
  s.obj.rotation.y = Math.atan2(-ca * s.rz * dir, -sa * s.rx * dir);
  const tail = s.obj.userData.tail as THREE.Object3D | undefined;
  if (tail) tail.rotation.y = Math.sin(t * 9 * boost + s.order * 5) * 0.45;
}

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time, melt = ctx.melt, st = ctx.state;
  const boost = 0.6 + 0.6 * melt + (ctx.awake ? 0.4 : 0);

  // rong biển
  for (const w of (st.weeds as Weed[] | undefined) ?? []) {
    const pos = w.geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const amp = w.amp * (0.5 + 0.5 * melt);
    for (let k = 0; k < pos.count; k++) {
      const y = w.base[k * 3 + 1], f = Math.pow(y / w.h, 1.4);
      arr[k * 3] = w.base[k * 3] + Math.sin(t * 1.3 + w.seed + y * 1.1) * amp * f * 1.6;
      arr[k * 3 + 2] = w.base[k * 3 + 2] + Math.cos(t * 0.9 + w.seed + y * 0.8) * amp * f;
    }
    pos.needsUpdate = true;
  }

  // cá + rùa: băng tan → nhiều cá hơn, bơi nhanh hơn
  const shown = 0.35 + 0.65 * melt;
  for (const s of (st.swimmers as Swimmer[] | undefined) ?? []) {
    s.obj.visible = ctx.awake || s.order < shown;
    if (s.obj.visible) swim(s, t, dt, boost);
  }
  const tur = st.turtleSwim as Swimmer | undefined;
  if (tur) {
    swim(tur, t, dt, 0.7 + 0.5 * melt);
    const flips = tur.obj.userData.flips as THREE.Object3D[];
    for (let i = 0; i < flips.length; i++) flips[i].rotation.x = Math.sin(t * 2.4 + (i % 2) * Math.PI) * (i < 2 ? 0.45 : 0.27);
  }

  // bong bóng
  const bub = st.bub as Bubbles | undefined;
  if (bub) {
    const n = Math.round(bub.x.length * (0.3 + 0.7 * melt));
    bub.mesh.count = n;
    for (let i = 0; i < n; i++) {
      bub.y[i] += bub.v[i] * dt * (0.7 + 0.5 * melt);
      if (bub.y[i] > 5.2) bub.spawn(i, false);
      _dummy.position.set(bub.x[i] + Math.sin(t * 2.2 + bub.seed[i]) * 0.12, bub.y[i], bub.z[i] + Math.cos(t * 1.7 + bub.seed[i]) * 0.06);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(bub.s[i] * (1 + Math.sin(t * 5 + bub.seed[i]) * 0.06));
      _dummy.updateMatrix();
      bub.mesh.setMatrixAt(i, _dummy.matrix);
    }
    bub.mesh.instanceMatrix.needsUpdate = true;
  }

  // tia nắng + vân sáng đáy + các quầng sáng
  for (const ray of (st.rays as THREE.Mesh[] | undefined) ?? []) {
    (ray.material as THREE.MeshBasicMaterial).opacity = (ray.userData.op as number) * (0.55 + 0.55 * melt) * (0.8 + 0.2 * Math.sin(t * 0.7 + (ray.userData.seed as number)));
  }
  const causT = st.causT as THREE.Texture | undefined;
  if (causT) causT.offset.set(Math.sin(t * 0.15) * 0.3, t * 0.02);
  const mg = st.mouthGlow as THREE.Sprite | undefined;
  if (mg) mg.material.opacity = 0.2 + 0.2 * melt + Math.sin(t * 1.1) * 0.04;
  const fg = st.forkGlow as THREE.Sprite | undefined;
  if (fg) fg.material.opacity = 0.3 + 0.25 * melt + Math.sin(t * 2) * 0.08;
  const cg = st.castleGlow as THREE.Sprite | undefined;
  if (cg) cg.material.opacity = 0.2 + 0.3 * melt;

  // vỏ sò mở dần theo băng tan, ngọc sáng dần
  const clam = st.clam as THREE.Object3D | undefined;
  if (clam) {
    (clam.userData.lid as THREE.Object3D).rotation.x = -(0.35 + 0.55 * melt + Math.sin(t * 1.2) * 0.05);
    const halo = clam.userData.halo as THREE.Sprite;
    halo.material.opacity = 0.35 + 0.45 * melt + Math.sin(t * 2.5) * 0.08;
    halo.scale.setScalar(0.9 + 0.6 * melt);
    const pl = st.pearlL as THREE.PointLight | undefined;
    if (pl) pl.intensity = 3 + 4 * melt;
    // ngọc thỉnh thoảng nhả hạt lấp lánh
    if (melt > 0.3 && Math.random() < 0.06 * melt) {
      clam.localToWorld(_tw.set(0, 0.5, 0.05));
      ctx.magic.twinkle(_tw, 0xff3d8b, 1, 0.25, 0.3);
    }
  }

  // cua: càng kẹp lách cách; tỉnh rồi thì lắc lư như đang chỉ huy dàn nhạc
  const seb = st.seb as THREE.Object3D | undefined;
  if (seb) {
    const claws = seb.userData.claws as THREE.Object3D[];
    for (let i = 0; i < claws.length; i++) {
      const c = claws[i];
      (c.userData.top as THREE.Object3D).rotation.z = -Math.PI / 2 + 0.25 + Math.max(0, Math.sin(t * (ctx.awake ? 8 : 3) + i)) * 0.5;
      c.rotation.z = ctx.awake ? Math.sin(t * 4 + i * Math.PI) * 0.5 : Math.sin(t * 1.2 + i) * 0.08;
    }
    if (ctx.awake) { seb.position.x = -4.9 + Math.sin(t * 2) * 0.1; bob(seb, t, 0.04, 8); }
  }

  // đã tỉnh: lấp lánh hồng/xanh quanh hang
  if (ctx.awake && Math.random() < 0.25) {
    const x = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 2.8);
    ctx.magic.twinkle(_tw.set(x, 0.6 + Math.random() * 3.2, -4 + Math.random() * 4.5), Math.random() < 0.5 ? 0xff3d8b : 0x0096c7, 1, 0.3, 0.32);
  }
}

const room: RoomDef = {
  id: 'ariel',
  name: 'Hang kho báu của Ariel',
  emoji: '🐚',
  princessModel: 'p_ariel.glb',
  rig: 'lores',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'cá', emoji: '🐟', name: 'con cá', fill: { index: 0, distractors: ['g', 'p'] } },
    { word: 'cua', emoji: '🦀', name: 'con cua', fill: { index: 0, distractors: ['l', 'p'] } },
    { word: 'tôm', emoji: '🦐', name: 'con tôm', fill: { index: 0, distractors: ['c', 'p'] } },
    { word: 'rùa', emoji: '🐢', name: 'con rùa', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'ốc', emoji: '🐚', name: 'con ốc' },
    { word: 'mực', emoji: '🦑', name: 'con mực' },
    { word: 'ngọc', emoji: '💎', name: 'viên ngọc' },
  ],
  count: { emoji: '🐠', audio: 'ariel_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],
  magicColors: [0x0096c7, 0xff3d8b],
  audio: { name: 'ariel_name', intro: 'ariel_intro', thanks: 'ariel_thanks' },
};

export default room;

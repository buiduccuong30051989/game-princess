// BỘ ĐỒ NGHỀ DỰNG PHÒNG (dùng chung cho 11 phòng). Chỉ phụ thuộc three → an toàn khi node import file phòng.
// Mọi hàm trả về Object3D (chưa add); gọi `ctx.root.add(...)`. Đơn vị: mét. Nhân vật cao ~1.8 m.
// Texture vẽ bằng canvas (không cần file ảnh). Màu: số hex; nên dùng màu tươi, bão hoà vừa (xem ROOM-GUIDE).
import * as THREE from 'three';

// ---------------------------------------------------------------- vật liệu
const matCache = new Map<string, THREE.MeshStandardMaterial>();
/** Material chuẩn (cache theo tham số). rough 0..1, emissive tuỳ chọn. */
export function mat(color: number, opts: { rough?: number; emissive?: number; ei?: number; opacity?: number; side?: THREE.Side; flat?: boolean } = {}): THREE.MeshStandardMaterial {
  const key = [color, opts.rough, opts.emissive, opts.ei, opts.opacity, opts.side, opts.flat].join('|');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.75, metalness: 0,
      emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1,
      transparent: opts.opacity !== undefined && opts.opacity < 1, opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide, flatShading: opts.flat ?? false,
    });
    matCache.set(key, m);
  }
  return m;
}
/** Material phát sáng không chịu ánh sáng (đèn, lửa, bầu trời). */
export function glowMat(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });
}
/** Material có texture. */
export function texMat(tex: THREE.Texture, opts: { rough?: number; color?: number; side?: THREE.Side; emissive?: number; ei?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex, color: opts.color ?? 0xffffff, roughness: opts.rough ?? 0.85, metalness: 0, side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, emissiveMap: opts.emissive ? tex : null,
  });
}

// ---------------------------------------------------------------- texture canvas
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
export const css = hex;
/** Pha màu: t=0 → a, t=1 → b. */
export function mix(a: number, b: number, t: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

/** Tạo CanvasTexture: draw(g, w, h). repeat = số lần lặp (u, v). */
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** Gạch đá: base = màu đá, mortar = vữa. */
export function brickTex(base: number, mortar: number, repeat: [number, number] = [4, 3], rows = 8): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = hex(mortar); g.fillRect(0, 0, w, h);
    const bh = h / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4, bw = w / cols, off = (r % 2) * bw / 2;
      for (let c = -1; c <= cols; c++) {
        const shade = 0.82 + ((r * 7 + c * 13) % 5) * 0.05;
        g.fillStyle = hex(mix(0x000000, base, shade));
        const x = c * bw + off + 4, y = r * bh + 4;
        g.beginPath(); g.roundRect(x, y, bw - 8, bh - 8, 10); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x + 6, y + 4, bw - 20, 6);
      }
    }
  }, repeat);
}

/** Sàn gỗ ván. */
export function plankTex(base: number, repeat: [number, number] = [3, 3]): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    const n = 6, ph = h / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = hex(mix(0x000000, base, 0.85 + (i % 3) * 0.07));
      g.fillRect(0, i * ph, w, ph);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, i * ph, w, 3);
      const cut = ((i * 173) % w);
      g.fillRect(cut, i * ph, 3, ph);
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, i * ph + 12 + k * 18); g.bezierCurveTo(w * 0.3, i * ph + 6 + k * 18, w * 0.6, i * ph + 20 + k * 18, w, i * ph + 10 + k * 18); g.stroke(); }
    }
  }, repeat);
}

/** Sàn ô vuông 2 màu (đá hoa). */
export function tileTex(a: number, b: number, repeat: [number, number] = [6, 6], grout = 0xffffff): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = hex(grout); g.fillRect(0, 0, w, h);
    const s = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = hex((i + j) % 2 ? a : b);
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  }, repeat);
}

/** Giấy dán tường hoạ tiết (sọc dọc + chấm/hoa nhỏ). */
export function wallpaperTex(base: number, stripe: number, dot: number, repeat: [number, number] = [6, 2]): THREE.CanvasTexture {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
    g.fillStyle = hex(stripe); g.fillRect(w * 0.42, 0, w * 0.16, h);
    g.fillStyle = hex(dot);
    for (let y = 40; y < h; y += 128) {
      for (const x of [w * 0.18, w * 0.82]) {
        g.beginPath();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 8, 0, 0, Math.PI * 2); }
        g.fill();
      }
    }
  }, repeat);
}

/** Bầu trời gradient (+ sao nếu stars > 0). Dùng cho cửa sổ / nền xa. */
export function skyTex(top: number, bottom: number, stars = 0, w = 512, h = 512): THREE.CanvasTexture {
  return canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, hex(top)); gr.addColorStop(1, hex(bottom));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < stars; i++) {
      const x = (i * 97.13 % 1) * w, y = ((i * 57.7) % 1) * h * 0.8;
      const xx = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * w;
      const yy = (Math.sin(i * 78.233) * 12543.123 % 1 + 1) % 1 * h * 0.85;
      const r = i % 9 === 0 ? 2.6 : 1.3;
      g.fillStyle = i % 5 === 0 ? '#fff6c8' : '#ffffff';
      g.beginPath(); g.arc(xx || x, yy || y, r, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Chấm sáng mềm (radial) – dùng làm quầng sáng sprite. */
let glowTexCache: THREE.CanvasTexture | null = null;
export function glowTex(): THREE.CanvasTexture {
  if (!glowTexCache) {
    glowTexCache = canvasTex(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
  }
  return glowTexCache;
}

// ---------------------------------------------------------------- khối kiến trúc
/** Mặt phẳng gradient dọc (tường xa, trời). */
export function gradientPlane(w: number, h: number, top: number, bottom: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(w, h, 1, 8);
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const ct = new THREE.Color(top), cb = new THREE.Color(bottom), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(cb).lerp(ct, pos.getY(i) / h + 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
}

/** Vòm trời bao quanh (hình cầu mặt trong, gradient). Đặt làm nền xa thay scene.background. */
export function skyDome(top: number, bottom: number, radius = 60): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const ct = new THREE.Color(top), cb = new THREE.Color(bottom), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.clamp(pos.getY(i) / radius * 1.4 + 0.3, 0, 1);
    c.copy(cb).lerp(ct, k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
}

/** Sàn phẳng (y=0) có texture hoặc màu. */
export function floor(w: number, d: number, m: THREE.Material): THREE.Mesh {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  f.rotation.x = -Math.PI / 2;
  f.receiveShadow = true;
  return f;
}

/** Tường phẳng (đáy ở y=0, tâm x=0). */
export function wall(w: number, h: number, m: THREE.Material): THREE.Mesh {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  g.position.y = h / 2;
  g.receiveShadow = true;
  return g;
}

/**
 * Tường cong (phòng tròn / tháp): cung trụ nhìn từ trong. arc = góc mở (rad), tâm cung hướng về -z.
 * Đặt ở gốc toạ độ phòng; bán kính ~6.5 là vừa khung hình. center = góc lệch giữa cung (rad, + = sang phải).
 */
export function curvedWall(radius: number, height: number, m: THREE.Material, arc = Math.PI * 1.25, center = 0): THREE.Mesh {
  // CylinderGeometry: theta = 0 ở +z, x = r·sinθ → giữa cung ở phía -z là theta = π; center > 0 lệch sang +x
  const geo = new THREE.CylinderGeometry(radius, radius, height, 72, 1, true, Math.PI - center - arc / 2, arc);
  const inner = m.clone();
  inner.side = THREE.BackSide;
  const w = new THREE.Mesh(geo, inner);
  w.position.y = height / 2;
  w.receiveShadow = true;
  return w;
}

/**
 * Tường phẳng có ô cửa vòm KHOÉT THỦNG (nhìn xuyên ra cảnh ngoài: trời sao, biển...). Đáy tường y=0, tâm x=0.
 * archW/archH = cỡ ô cửa, archY = độ cao mép dưới ô cửa. UV theo mét (lặp texture theo `uvScale` m).
 */
export function wallWithArch(w: number, h: number, archW: number, archH: number, archY: number, m: THREE.Material, uvScale = 2): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.lineTo(-w / 2, 0);
  const r = archW / 2;
  const hole = new THREE.Path();
  hole.moveTo(-r, archY); hole.lineTo(r, archY); hole.lineTo(r, archY + archH - r);
  hole.absarc(0, archY + archH - r, r, 0, Math.PI, false);
  hole.lineTo(-r, archY);
  shape.holes.push(hole);
  const geo = new THREE.ShapeGeometry(shape, 32);
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / uvScale; uv[i * 2 + 1] = pos.getY(i) / uvScale; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  return mesh;
}

/** Khung vòm nổi (viền quanh ô cửa khoét của wallWithArch). Đáy khung ở y=0 của group. */
export function archFrame(w: number, h: number, color = 0xffe2a8, t = 0.16, depth = 0.25): THREE.Mesh {
  const r = w / 2;
  const border = new THREE.Shape();
  border.moveTo(-r - t, 0); border.lineTo(r + t, 0); border.lineTo(r + t, h - r);
  border.absarc(0, h - r, r + t, 0, Math.PI, false);
  border.lineTo(-r - t, 0);
  const hole = new THREE.Path();
  hole.moveTo(-r, 0); hole.lineTo(-r, h - r); hole.absarc(0, h - r, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.lineTo(-r, 0);
  border.holes.push(hole);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(border, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, curveSegments: 32 }), mat(color, { rough: 0.5 }));
  m.castShadow = true;
  return m;
}

/** Bầu trời đêm có sao (Points) quanh 1 điểm – đặt ngoài ô cửa khoét. */
export function starField(n = 400, radius = 40, color = 0xffffff, size = 0.18): THREE.Points {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI - Math.PI / 2, ph = Math.random() * Math.PI * 0.45;
    pos[i * 3] = Math.sin(th) * Math.cos(ph) * radius;
    pos[i * 3 + 1] = Math.sin(ph) * radius + 2;
    pos[i * 3 + 2] = -Math.cos(th) * Math.cos(ph) * radius;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: true, map: glowTex(), transparent: true, depthWrite: false, fog: false }));
}

/** Cột tròn có đế + đầu cột. */
export function pillar(h: number, r: number, color: number, cap = 0xffd166): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h - 0.3, 24), mat(color, { rough: 0.55 }));
  shaft.position.y = h / 2;
  shaft.castShadow = true;
  g.add(shaft);
  for (const [y, s] of [[0.08, 1.35], [h - 0.08, 1.35]] as const) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * s, r * s, 0.16, 24), mat(cap, { rough: 0.45 }));
    b.position.y = y;
    g.add(b);
  }
  return g;
}

/** Cửa sổ vòm: kính hiện texture `view` (vd skyTex), khung + song cửa + bậu. Đáy cửa ở y=0 của group. */
export function archWindow(w: number, h: number, view: THREE.Texture | number, frame = 0xffe2a8, bars = true): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const r = w / 2;
  shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, h - r);
  shape.absarc(0, h - r, r, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  const glassGeo = new THREE.ShapeGeometry(shape, 24);
  // UV theo bbox
  const pos = glassGeo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = (pos.getX(i) + r) / w; uv[i * 2 + 1] = pos.getY(i) / h; }
  glassGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const glass = new THREE.Mesh(glassGeo, typeof view === 'number' ? glowMat(view) : new THREE.MeshBasicMaterial({ map: view, fog: false }));
  g.add(glass);
  // khung: viền dày
  const border = new THREE.Shape();
  const t = 0.12;
  border.moveTo(-r - t, -t); border.lineTo(r + t, -t); border.lineTo(r + t, h - r);
  border.absarc(0, h - r, r + t, 0, Math.PI, false);
  border.lineTo(-r - t, -t);
  const hole = new THREE.Path();
  hole.moveTo(-r, 0); hole.lineTo(-r, h - r); hole.absarc(0, h - r, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.lineTo(-r, 0);
  border.holes.push(hole);
  const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(border, { depth: 0.14, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, curveSegments: 24 }), mat(frame, { rough: 0.5 }));
  fr.position.z = -0.05;
  fr.castShadow = true;
  g.add(fr);
  if (bars) {
    const bm = mat(frame, { rough: 0.5 });
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), bm);
    v.position.set(0, h / 2, 0.03);
    g.add(v);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), bm);
    hb.position.set(0, h * 0.45, 0.03);
    g.add(hb);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.12, 0.4), mat(frame, { rough: 0.5 }));
  sill.position.set(0, -0.1, 0.15);
  sill.castShadow = true;
  g.add(sill);
  return g;
}

/** Thảm tròn/elip có viền. */
export function rug(rx: number, rz: number, color: number, trim: number): THREE.Group {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat(trim, { rough: 1 }));
  a.scale.set(rx, rz, 1);
  a.rotation.x = -Math.PI / 2;
  a.position.y = 0.006;
  a.receiveShadow = true;
  const b = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat(color, { rough: 1 }));
  b.scale.set(rx * 0.88, rz * 0.88, 1);
  b.rotation.x = -Math.PI / 2;
  b.position.y = 0.012;
  b.receiveShadow = true;
  g.add(a, b);
  return g;
}

/** Rèm xếp nếp (đặt ở mép cửa sổ / hai bên phòng). Đáy y=0. */
export function curtain(h: number, w: number, color: number, color2 = mix(color, 0x000000, 0.18)): THREE.Group {
  const g = new THREE.Group();
  const n = Math.max(3, Math.round(w / 0.28));
  for (let k = 0; k < n; k++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h, 12), mat(k % 2 ? color2 : color, { rough: 0.95 }));
    f.position.set(-w / 2 + (k + 0.5) * (w / n), h / 2, (k % 2) * 0.05);
    f.castShadow = true;
    g.add(f);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w + 0.4, 12), mat(0xffd166, { rough: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = h + 0.05;
  g.add(rod);
  return g;
}

/** Kệ gỗ treo tường (mặt kệ ở y=0 của group). */
export function shelf(w: number, color = 0xb97a4a, depth = 0.35): THREE.Group {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, depth), mat(color, { rough: 0.7 }));
  board.position.y = -0.04;
  board.castShadow = true; board.receiveShadow = true;
  g.add(board);
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), mat(mix(color, 0x000000, 0.2)));
    br.position.set(x, -0.2, -depth / 2 + 0.05);
    g.add(br);
  }
  return g;
}

/** Hàng sách đứng (đặt lên kệ). */
export function books(n: number, colors: number[], w = 0.09): THREE.Group {
  const g = new THREE.Group();
  let x = -(n * w) / 2;
  for (let i = 0; i < n; i++) {
    const h = 0.28 + ((i * 37) % 10) / 60;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h, 0.24), mat(colors[i % colors.length], { rough: 0.8 }));
    b.position.set(x + w / 2, h / 2, 0);
    b.rotation.z = i === n - 1 ? -0.25 : 0;
    b.castShadow = true;
    g.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.025, 0.245), mat(0xffd166, { rough: 0.4 }));
    band.position.set(x + w / 2, h * 0.8, 0);
    g.add(band);
    x += w;
  }
  return g;
}

/** Tranh khung vàng; nội dung vẽ bằng draw(g,w,h) hoặc 1 emoji to. Tâm tranh ở gốc group. */
export function painting(w: number, h: number, content: string | ((g: CanvasRenderingContext2D, w: number, h: number) => void), bg = 0xfff3d6, frame = 0xe8b04a): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTex(256, Math.round(256 * h / w), (c, cw, ch) => {
    c.fillStyle = hex(bg); c.fillRect(0, 0, cw, ch);
    if (typeof content === 'string') {
      c.font = `${Math.round(Math.min(cw, ch) * 0.7)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(content, cw / 2, ch / 2 + ch * 0.04);
    } else content(c, cw, ch);
  });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(tex, { rough: 0.9 }));
  pic.position.z = 0.03;
  g.add(pic);
  const fm = mat(frame, { rough: 0.45 });
  const t = 0.1;
  for (const [x, y, fw, fh] of [[0, h / 2 + t / 2, w + 2 * t, t], [0, -h / 2 - t / 2, w + 2 * t, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0, t, h]] as const) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.08), fm);
    b.position.set(x, y, 0.02);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

/** Quầng sáng mềm (sprite). Dùng quanh đèn/nến/ngôi sao. */
export function glow(color: number, size = 1, opacity = 0.8, additive = false): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex(), color, transparent: true, opacity, depthWrite: false, fog: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  s.scale.setScalar(size);
  return s;
}

/** Nến: thân + ngọn lửa + quầng. userData.flame để nhấp nháy (xem flicker). Đáy ở y=0. */
export function candle(h = 0.3, color = 0xfff4e0): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, h, 16), mat(color, { rough: 0.6 }));
  body.position.y = h / 2;
  g.add(body);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), glowMat(0xffb347));
  flame.scale.y = 1.8;
  flame.position.y = h + 0.06;
  g.add(flame);
  const halo = glow(0xffc46b, 0.5, 0.7);
  halo.position.y = h + 0.07;
  g.add(halo);
  g.userData.flame = flame;
  g.userData.halo = halo;
  return g;
}

/** Nhấp nháy nến / đèn (gọi trong ambient). */
export function flicker(obj: THREE.Object3D, t: number, seed = 0): void {
  const k = 1 + Math.sin(t * 13 + seed) * 0.08 + Math.sin(t * 29 + seed * 2) * 0.05;
  const f = obj.userData.flame as THREE.Object3D | undefined;
  const h = obj.userData.halo as THREE.Object3D | undefined;
  if (f) f.scale.set(k, 1.8 * k, k);
  if (h) h.scale.setScalar(0.5 * k);
}

/** Đèn lồng giấy phát sáng (kiểu Tangled). Tâm ở gốc. */
export function paperLantern(color = 0xffa53d, size = 0.35): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.55, size * 0.42, size, 16, 1, false), new THREE.MeshBasicMaterial({ color, fog: false }));
  g.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.42, size * 0.55, size * 0.12, 16), glowMat(mix(color, 0x000000, 0.25)));
  top.position.y = size * 0.55;
  g.add(top);
  const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.18, 10, 8), glowMat(0xfff3b0));
  core.position.y = -size * 0.2;
  g.add(core);
  const halo = glow(mix(color, 0xffffff, 0.35), size * 4, 0.55);
  g.add(halo);
  return g;
}

/** Dây đèn nhỏ (fairy lights) võng giữa 2 điểm. */
export function fairyLights(a: THREE.Vector3, b: THREE.Vector3, sag = 0.5, n = 16, colors = [0xfff1a8, 0xffc2e2, 0xbfe6ff]): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.01, 4, false), mat(0x6b4b3a));
  g.add(wire);
  for (let i = 1; i < n; i++) {
    const p = curve.getPoint(i / n);
    const c = colors[i % colors.length];
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glowMat(c));
    bulb.position.copy(p).add(new THREE.Vector3(0, -0.04, 0));
    g.add(bulb);
    const h = glow(c, 0.32, 0.55);
    h.position.copy(bulb.position);
    g.add(h);
  }
  return g;
}

/** Dây cờ đuôi nheo tam giác giữa 2 điểm. */
export function bunting(a: THREE.Vector3, b: THREE.Vector3, colors: number[], sag = 0.4, n = 10): THREE.Group {
  const g = new THREE.Group();
  const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.13, 0, 0), new THREE.Vector3(0.13, 0, 0), new THREE.Vector3(0, -0.3, 0)]);
  tri.computeVertexNormals();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    const f = new THREE.Mesh(tri, mat(colors[i % colors.length], { side: THREE.DoubleSide, rough: 0.9 }));
    f.position.copy(p);
    f.lookAt(p.clone().add(new THREE.Vector3(0, 0, 1)));
    g.add(f);
  }
  return g;
}

/** Chậu cây/hoa đơn giản bằng khối (không cần model). Đáy y=0. */
export function flowerPot(potColor: number, flowerColors: number[], leaf = 0x5cbf4a): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 16), mat(potColor, { rough: 0.7 }));
  pot.position.y = 0.15;
  pot.castShadow = true;
  g.add(pot);
  const soil = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), mat(leaf, { rough: 0.9 }));
  soil.scale.y = 0.6;
  soil.position.y = 0.32;
  g.add(soil);
  flowerColors.forEach((c, i) => {
    const a = (i / flowerColors.length) * Math.PI * 2;
    const f = new THREE.Group();
    for (let p = 0; p < 5; p++) {
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(c, { rough: 0.6 }));
      const pa = (p / 5) * Math.PI * 2;
      pet.position.set(Math.cos(pa) * 0.05, 0, Math.sin(pa) * 0.05);
      f.add(pet);
    }
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0xffd166));
    f.add(mid);
    f.position.set(Math.cos(a) * 0.1, 0.42 + (i % 2) * 0.06, Math.sin(a) * 0.1);
    f.rotation.x = -0.5;
    g.add(f);
  });
  return g;
}

/** Đặt obj nằm trên cung tròn bán kính r ở góc a (0 = phía sau -z), quay mặt vào tâm. */
export function onArc(obj: THREE.Object3D, r: number, a: number, y = 0): THREE.Object3D {
  obj.position.set(Math.sin(a) * r, y, -Math.cos(a) * r);
  obj.rotation.y = -a;
  return obj;
}

/** Lắc lư / bồng bềnh nhẹ (gọi trong ambient): lưu y gốc ở userData.baseY. */
export function bob(obj: THREE.Object3D, t: number, amp = 0.05, speed = 1, seed = 0): void {
  if (obj.userData.baseY === undefined) obj.userData.baseY = obj.position.y;
  obj.position.y = (obj.userData.baseY as number) + Math.sin(t * speed + seed) * amp;
}

/** Bật đổ bóng cho cả cây object. */
export function shadows(obj: THREE.Object3D, cast = true, receive = false): THREE.Object3D {
  obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
  return obj;
}

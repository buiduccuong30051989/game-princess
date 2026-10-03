// PHÒNG MERIDA: Rừng xanh cao nguyên Scotland. Trời xanh trong, đồi cỏ xanh mướt, núi tím xa có lâu đài DunBroch,
// vòng đá cổ (cổng đá lớn ngay sau công chúa) khắc hoa văn xoắn phát sáng xanh khi băng tan, đốm sáng xanh kỳ diệu
// (will-o'-the-wisp) bay lượn (càng tan càng nhiều), bia bắn cung + cung + ống tên, gấu mẹ + 2 gấu con, ngựa Angus,
// rừng thông, hoa thạch nam tím, nấm đỏ, cờ và thảm kẻ ô tartan.
// Model tải thêm (CC0, xem CREDITS.md): public/models/rooms/merida/{horse,bow,quiver,mushroom}.glb
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import { loadGLB } from '../core/assets.ts';
import { mat, glowMat, texMat, canvasTex, skyDome, floor, glow, bunting, bob, shadows, mix } from '../room/kit.ts';

const PAL = { primary: 0x0f9d8a, secondary: 0xf97316, accent: 0xfacc15, light: 0xe9fbf4, dark: 0x0b5d57 };

/** Số ngẫu nhiên có hạt giống: cảnh giống hệt nhau mỗi lần vào phòng. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Vải kẻ ô tartan (xanh ngọc + xanh dương + sọc cam/vàng). */
function tartanTex(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0f9d8a'; g.fillRect(0, 0, w, h);
    const bands: [number, number, string][] = [
      [0, 64, 'rgba(37,99,235,0.55)'], [128, 64, 'rgba(37,99,235,0.55)'],
      [92, 10, 'rgba(249,115,22,0.9)'], [220, 10, 'rgba(249,115,22,0.9)'],
      [40, 4, 'rgba(250,204,21,0.95)'], [168, 4, 'rgba(250,204,21,0.95)'],
      [112, 3, 'rgba(255,255,255,0.6)'],
    ];
    for (const [p, s, c] of bands) {
      g.fillStyle = c;
      g.fillRect(p, 0, s, h);
      g.fillRect(0, p, w, s);
    }
    // sợi dệt chéo
    g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 1;
    for (let i = -h; i < w; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
  }, repeat);
}

/** Cỏ xanh tươi có đốm hoa nhỏ. */
function grassTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5cc85a'; g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = ['#4fb94e', '#6fd86a', '#48ad55', '#7ee07a'][i % 4];
      g.fillRect(r() * w, r() * h, 2 + r() * 3, 6 + r() * 8);
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = ['#ffe45c', '#ffffff', '#c084fc', '#fb923c'][i % 4];
      g.beginPath(); g.arc(r() * w, r() * h, 2.6, 0, Math.PI * 2); g.fill();
    }
  }, [14, 14]);
}

/** Hoa văn xoắn ốc Celtic (nét trắng trên nền trong suốt – tô màu bằng material). */
function spiralTex(): THREE.CanvasTexture {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round';
    for (const [cx, cy] of [[w * 0.5, h * 0.34], [w * 0.31, h * 0.66], [w * 0.69, h * 0.66]]) {
      g.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.1) {
        const rr = 4 + a * 4.2;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.43, 0, Math.PI * 2); g.stroke();
  });
}

/** Tảng đá dựng: hộp thuôn đầu, mép sần (flat shading). Đáy y=0. */
function standingStone(h: number, w: number, color: number, seed: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, w * 0.55, 2, 4, 1);
  const pos = geo.getAttribute('position');
  const r = rng(seed);
  const jit = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let j = jit.get(key);
    if (!j) { j = [(r() - 0.5) * w * 0.14, (r() - 0.5) * h * 0.04, (r() - 0.5) * w * 0.1]; jit.set(key, j); }
    const taper = 1 - 0.28 * (y / h + 0.5);
    const top = y > h / 2 - 0.01 ? Math.cos(x * 3) * 0.1 : 0;
    pos.setXYZ(i, x * taper + j[0], y + h / 2 + j[1] + top, z * taper + j[2]);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { rough: 0.9, flat: true }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Cây thông: 3 tầng nón xanh + thân gỗ. Đáy y=0. */
function pine(h: number, shade: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.04, h * 0.055, h * 0.3, 7), mat(0xa0642f, { rough: 0.8 }));
  trunk.position.y = h * 0.15;
  g.add(trunk);
  const cols = [mix(0x1f9d5c, 0x0b5d57, shade * 0.5), 0x2fb56b, 0x4ccb7f];
  for (let i = 0; i < 3; i++) {
    const rad = h * (0.3 - i * 0.07), ch = h * (0.42 - i * 0.06);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, ch, 8), mat(cols[i], { rough: 0.85, flat: true }));
    cone.position.y = h * 0.28 + i * h * 0.2 + ch / 2;
    cone.castShadow = true;
    g.add(cone);
  }
  return g;
}

/** Gộp nhiều mesh (cùng 1 material) thành 1 mesh – giảm draw call. Mesh con dùng toạ độ trong group cha. */
function merged(parts: THREE.Mesh[], m: THREE.Material): THREE.Mesh {
  const geos = parts.map((p) => {
    p.updateMatrix();
    const g = p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone();
    g.deleteAttribute('uv');
    return g.applyMatrix4(p.matrix);
  });
  const out = new THREE.Mesh(mergeGeometries(geos) ?? new THREE.BufferGeometry(), m);
  for (const g of geos) g.dispose();
  for (const p of parts) p.geometry.dispose();
  return out;
}

/** Gấu tròn trịa dễ thương (ngồi), cao ~1.55 m khi scale 1. Đầu ở userData.head để lắc. Gộp theo màu: ~7 mesh/con. */
function bear(scale: number, fur = 0xb8733d): THREE.Group {
  const g = new THREE.Group();
  const sph = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const bodyFur: THREE.Mesh[] = [sph(0.5, 0, 0.58, 0, 1, 1.1, 0.9)];
  const bodyLight: THREE.Mesh[] = [sph(0.33, 0, 0.52, 0.3, 1, 1.2, 0.5)];
  const headFur: THREE.Mesh[] = [sph(0.33, 0, 0, 0)];
  const headLight: THREE.Mesh[] = [sph(0.15, 0, -0.07, 0.27, 1.1, 0.85, 1)];
  const headDark: THREE.Mesh[] = [sph(0.055, 0, -0.02, 0.41, 1.3, 0.9, 1)];
  const shine: THREE.Mesh[] = [];
  const cheeks: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    headFur.push(sph(0.1, s * 0.23, 0.24, -0.02));
    headLight.push(sph(0.055, s * 0.23, 0.24, 0.05));
    headDark.push(sph(0.04, s * 0.12, 0.07, 0.28));
    shine.push(sph(0.013, s * 0.12 + 0.012, 0.085, 0.315));
    cheeks.push(sph(0.045, s * 0.2, -0.04, 0.24, 1, 0.6, 0.4));
    // tay trước + bàn chân sau + đệm chân
    bodyFur.push(sph(0.13, s * 0.33, 0.55, 0.3, 0.9, 1.3, 0.9), sph(0.16, s * 0.3, 0.12, 0.35, 0.9, 0.7, 1.2));
    bodyLight.push(sph(0.09, s * 0.3, 0.13, 0.53, 1, 1, 0.3));
  }
  const f = mat(fur, { rough: 0.95 });
  const light = mat(mix(fur, 0xfff1dc, 0.55), { rough: 0.95 });
  const dark = mat(0x3d2416, { rough: 0.5 });
  g.add(merged(bodyFur, f), merged(bodyLight, light));
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0.12);
  head.add(merged(headFur, f), merged(headLight, light), merged(headDark, dark), merged(shine, glowMat(0xffffff)), merged(cheeks, mat(0xff9fb0, { rough: 0.9 })));
  g.add(head);
  g.userData.head = head;
  g.scale.setScalar(scale);
  shadows(g);
  return g;
}

/** Mũi tên cắm (đuôi lông cam) – gốc ở đầu cắm vào bia. */
function arrow(x: number, y: number, ry: number, rx: number): THREE.Group {
  const a = new THREE.Group();
  a.position.set(x, y, 0.09);
  a.rotation.set(rx, ry, 0);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), mat(0xe8b77a));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0.31;
  a.add(shaft);
  const fl = mat(0xf97316, { rough: 0.8, side: THREE.DoubleSide });
  for (let k = 0; k < 3; k++) {
    const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.14), fl);
    vane.position.z = 0.56;
    vane.rotation.set(Math.PI / 2, 0, (k / 3) * Math.PI * 2);
    vane.translateX(0.028);
    a.add(vane);
  }
  return a;
}

/** Bia bắn cung trên giá 3 chân, mặt bia hướng +z. Tâm bia cao ~1.1 m. Mũi tên cắm sẵn. */
function archeryTarget(): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0xc27a3a, { rough: 0.75 });
  for (const [x, z, rx, rz] of [[-0.35, 0.05, 0, 0.18], [0.35, 0.05, 0, -0.18], [0, -0.45, 0.35, 0]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.5, 6), wood);
    leg.position.set(x, 0.72, z);
    leg.rotation.set(rx, 0, rz);
    g.add(leg);
  }
  const face = new THREE.Group();
  face.position.set(0, 1.12, 0.08);
  face.rotation.x = -0.12;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.16, 32), mat(0xf2c46d, { rough: 1 }));
  straw.rotation.x = Math.PI / 2;
  face.add(straw);
  [0xfff4dc, 0x7c3aed, 0x2f80ed, 0xef4444, 0xfacc15].forEach((c, i) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6 - i * 0.12, 40), mat(c, { rough: 0.8 }));
    disc.position.z = 0.081 + i * 0.002;
    face.add(disc);
  });
  for (const [x, y, ry, rx] of [[0.03, 0.05, 0.12, -0.08], [-0.2, 0.22, -0.2, 0.1], [0.26, -0.18, 0.25, 0.05]] as const) {
    face.add(arrow(x, y, ry, rx));
  }
  g.add(face);
  shadows(g);
  return g;
}

/** Cờ tartan trên cột (cờ ở userData.flag, toạ độ gốc ở userData.base để phấp phới). Đáy y=0. */
function banner(h: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 8), mat(0xc27a3a, { rough: 0.7 }));
  pole.position.y = h / 2;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mat(0xfacc15, { rough: 0.35 }));
  knob.position.y = h + 0.05;
  const flagGeo = new THREE.PlaneGeometry(0.9, 1.3, 8, 1);
  flagGeo.translate(0.45, 0, 0);
  const flag = new THREE.Mesh(flagGeo, texMat(tartanTex([1, 1.4]), { rough: 0.9, side: THREE.DoubleSide }));
  flag.position.set(0.04, h - 0.75, 0);
  flag.castShadow = true;
  g.add(pole, knob, flag);
  g.userData.flag = flag;
  g.userData.base = Float32Array.from(flagGeo.getAttribute('position').array as Float32Array);
  return g;
}

/** Mây bông (cụm cầu). */
function cloud(r: () => number): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xf6f1ff, fog: false });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m);
    s.scale.set(1.3 + r() * 0.8, 0.8 + r() * 0.4, 0.8);
    s.position.set((i - 2) * 1.3, Math.sin(i * 1.3) * 0.35 + (i === 2 ? 0.5 : 0), 0);
    g.add(s);
  }
  return g;
}

/** Đổi màu material theo tên (model tải về màu tối/xỉn). Material do ctx.model clone riêng cho model này. */
function recolor(obj: THREE.Object3D, map: Record<string, number>): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mt of Array.isArray(m.material) ? m.material : [m.material]) {
      const c = map[mt.name];
      if (c !== undefined) (mt as THREE.MeshStandardMaterial).color.setHex(c);
    }
  });
}

/** Model có trục dài nằm ngang (fitHeight làm nó khổng lồ): scale theo cạnh dài nhất, đáy y=0, bọc trong Group. */
function fitLongest(obj: THREE.Object3D, size: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(obj);
  const dim = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(size / Math.max(dim.x, dim.y, dim.z, 1e-4));
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box2.min.y;
  const g = new THREE.Group();
  g.add(obj);
  return g;
}

/** Hướng ngựa Angus (model nhìn theo +z): quay nhìn về phía công chúa + camera. */
const HORSE_YAW = -0.7;

interface Wisp { core: THREE.Mesh; halo: THREE.Sprite; base: THREE.Vector3; seed: number; order: number }

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root, scene } = ctx;
  const r = rng(42);
  scene.fog = new THREE.Fog(0xcdeefc, 24, 70);

  // --- trời xanh trong, mặt trời ấm, mây bông
  const dome = skyDome(0x3da5f5, 0xffe3b8, 80);
  dome.position.set(0, -24, -10);
  root.add(dome);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), glowMat(0xfff3b0));
  sun.position.set(-9, 9.5, -45);
  const sunGlow = glow(0xffe08a, 12, 0.55);
  sunGlow.position.copy(sun.position);
  root.add(sun, sunGlow);
  const clouds: THREE.Object3D[] = [];
  for (const [x, y, z, s] of [[-14, 7.5, -38, 1.2], [6, 9, -44, 1.5], [18, 6.5, -36, 1], [-2, 11, -50, 1.1]] as const) {
    const c = cloud(r);
    c.position.set(x, y, z);
    c.scale.setScalar(s);
    root.add(c);
    clouds.push(c);
  }

  // --- núi tím xa (đỉnh tuyết nhỏ)
  const mtn = [[-20, -40, 9, 15, 0x8b8ee8], [-8, -46, 12, 18, 0x7d7fe0], [6, -42, 10, 14, 0x9a8fe6], [20, -40, 11, 16, 0x8286e3], [32, -46, 10, 13, 0x9d97ea], [-32, -44, 10, 13, 0x9d97ea]] as const;
  for (const [x, z, rad, h, c] of mtn) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), mat(c, { rough: 0.95, flat: true }));
    m.position.set(x, h / 2 - 2, z);
    m.rotation.y = x;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.28, h * 0.28, 7), mat(0xf1f0ff, { rough: 0.9, flat: true }));
    cap.position.set(x, h - 2 - h * 0.14 + 0.02, z);
    cap.rotation.y = x;
    root.add(m, cap);
  }
  // đồi cỏ lượn sóng
  for (const [x, z, sx, sy, sz, c] of [[-16, -22, 14, 5, 8, 0x49b85c], [0, -26, 16, 4.2, 8, 0x3fae6a], [15, -21, 13, 5.5, 8, 0x55c46a], [-7, -15, 9, 2.4, 5, 0x6fd06a], [9, -14, 9, 2.1, 5, 0x66cc70]] as const) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(c, { rough: 1 }));
    hill.scale.set(sx, sy, sz);
    hill.position.set(x, -0.4, z);
    root.add(hill);
  }
  // lâu đài DunBroch nhỏ trên đồi xa (trái)
  const castle = new THREE.Group();
  const wallC = mat(0xf3dfc0, { rough: 0.8 });
  const roofC = mat(0x1aa39a, { rough: 0.6 });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 1.6), wallC);
  keep.position.y = 1.1;
  castle.add(keep);
  for (const [x, h] of [[-1.5, 3.4], [1.5, 3.0], [0.2, 4.2]] as const) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, h, 10), wallC);
    tw.position.set(x, h / 2, 0.2);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.3, 10), roofC);
    roof.position.set(x, h + 0.65, 0.2);
    const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), mat(0xf97316, { side: THREE.DoubleSide }));
    pennant.position.set(x + 0.2, h + 1.45, 0.2);
    castle.add(tw, roof, pennant);
  }
  // đặt ngay giữa: nhìn xuyên qua cổng đá thấy lâu đài trên đồi
  castle.position.set(0.4, 0.45, -17);
  castle.scale.setScalar(0.62);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5fcb62, { rough: 1 }));
  mound.scale.set(3.2, 0.6, 2.2);
  mound.position.set(0.4, 0, -17);
  root.add(castle, mound);

  // --- mặt đất cỏ + thảm tartan + lối đá lát dẫn vào cổng đá
  root.add(floor(90, 90, texMat(grassTex(), { rough: 1 })));
  const rugMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 64), texMat(tartanTex([3, 3]), { rough: 1 }));
  rugMesh.scale.set(3.3, 2.3, 1);
  rugMesh.rotation.x = -Math.PI / 2;
  rugMesh.position.set(0, 0.012, 0.6);
  rugMesh.receiveShadow = true;
  const rugTrim = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.05, 64), mat(0xfacc15, { rough: 0.8 }));
  rugTrim.scale.set(3.3, 2.3, 1);
  rugTrim.rotation.x = -Math.PI / 2;
  rugTrim.position.set(0, 0.016, 0.6);
  root.add(rugMesh, rugTrim);
  const flagstone = mat(0xd8d2f4, { rough: 0.9, flat: true });
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.34 - i * 0.02, 0.36 - i * 0.02, 0.06, 7), flagstone);
    st.position.set(Math.sin(i * 1.7) * 0.25, 0.03, -1.6 - i * 0.62);
    st.rotation.y = i;
    st.receiveShadow = true;
    root.add(st);
  }

  // --- vòng đá cổ + cổng đá lớn ngay sau công chúa; hoa văn xoắn phát sáng khi băng tan
  const runeTex = spiralTex();
  const runeMats: THREE.MeshBasicMaterial[] = [];
  const addRune = (stone: THREE.Object3D, y: number, size: number, faceZ: number) => {
    const m = new THREE.MeshBasicMaterial({ map: runeTex, color: 0x1c9dff, transparent: true, opacity: 0.35, depthWrite: false, fog: false });
    runeMats.push(m);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
    p.position.set(0, y, faceZ);
    stone.add(p);
  };
  const stoneCol = [0xa9b3f0, 0x9fa9ea, 0xb4b9f2];
  const gate = new THREE.Group();
  gate.position.set(0, 0, -5.4);
  for (const s of [-1, 1]) {
    const up = standingStone(3.3, 1.0, stoneCol[1], 11 + s);
    up.position.x = s * 1.75;
    addRune(up, 1.7, 0.75, 0.3);
    gate.add(up);
  }
  const lintel = standingStone(4.6, 0.8, stoneCol[2], 21);
  lintel.rotation.z = Math.PI / 2;
  lintel.position.set(2.3, 3.25, 0);
  gate.add(lintel);
  for (const s of [-1, 1]) {
    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), mat(0x58c957, { rough: 1 }));
    moss.scale.set(1.2, 0.35, 0.8);
    moss.position.set(s * 1.4, 3.72, 0);
    gate.add(moss);
  }
  root.add(gate);
  const gateGlow = glow(0x49c6ff, 3.4, 0.25);
  gateGlow.position.set(0, 1.6, -5.2);
  root.add(gateGlow);
  const ring: [number, number, number, number][] = [[-1.35, 2.6, 0.95, 0], [-1.0, 2.2, 0.85, 1], [-0.72, 2.8, 0.95, 2], [0.72, 2.5, 0.9, 0], [1.4, 2.4, 0.9, 2]];
  const R = 6.1;
  for (const [a, h, w, ci] of ring) {
    const st = standingStone(h, w, stoneCol[ci], Math.round(a * 100) + 200);
    st.position.set(Math.sin(a) * R, 0, -1.2 - Math.cos(a) * R);
    st.lookAt(0, 0, 1);
    st.rotateY(r() * 0.3 - 0.15);
    addRune(st, h * 0.55, w * 0.65, w * 0.3);
    root.add(st);
    const moss = new THREE.Mesh(new THREE.SphereGeometry(w * 0.4, 10, 6), mat(0x58c957, { rough: 1 }));
    moss.scale.set(1.1, 0.35, 0.8);
    moss.position.set(st.position.x, h - 0.05, st.position.z);
    root.add(moss);
  }

  // --- đốm sáng xanh kỳ diệu (will-o'-the-wisp): 1 vệt lượn từ xa dẫn vào cổng đá
  const wisps: Wisp[] = [];
  const coreMat = glowMat(0xb8f0ff);
  const coreGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const N = 16;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const base = new THREE.Vector3(
      Math.sin(t * Math.PI * 2.2) * (1.2 + t * 3.8) + (i % 2 ? 0.4 : -0.4),
      0.7 + Math.sin(t * 7) * 0.35 + t * 0.9,
      -9.5 + t * 6.5,
    );
    // né vùng nhân vật: gần phía trước thì dạt ra hai bên
    if (base.z > -2.2 && Math.abs(base.x) < 3.4) base.x = Math.sign(base.x || 1) * 3.6;
    const core = new THREE.Mesh(coreGeo, coreMat);
    const halo = glow(0x1c9dff, 0.7, 0.85);
    core.position.copy(base);
    halo.position.copy(base);
    root.add(core, halo);
    wisps.push({ core, halo, base, seed: r() * 10, order: ((i * 7) % N) / N });
  }

  // --- rừng thông 2 bên + phía xa, dây cờ đuôi nheo giữa các cây
  const pines: [number, number, number][] = [[-6.6, -3.2, 5.2], [-5.4, -6.4, 6], [-7.6, -0.4, 4.6], [-3.4, -8.6, 5.4], [6.8, -2.6, 5.4], [5.6, -6.8, 6.2], [7.8, 0.4, 4.4], [3.6, -9, 5], [-9.5, -7, 6.5], [9.4, -7.5, 6.8], [-4.8, -12, 5], [5.2, -12.5, 5.6]];
  for (const [x, z, h] of pines) {
    const p = pine(h, r());
    p.position.set(x, 0, z);
    p.rotation.y = r() * 6;
    root.add(p);
  }
  root.add(
    bunting(new THREE.Vector3(-5.9, 3.4, -3.0), new THREE.Vector3(-3.5, 3.3, -6.2), [0x0f9d8a, 0xf97316, 0xfacc15, 0x2563eb], 0.45, 9),
    bunting(new THREE.Vector3(3.5, 3.3, -6.2), new THREE.Vector3(6.1, 3.4, -2.6), [0xf97316, 0x0f9d8a, 0x2563eb, 0xfacc15], 0.45, 9),
  );

  // --- hoa thạch nam tím + khóm cỏ (InstancedMesh: 2 draw call cho vài trăm bông)
  const heather = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4), mat(0xffffff, { rough: 0.9 }), 320);
  const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.32, 4), mat(0x3fae4f, { rough: 1, flat: true }), 220);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const hc = [0xb45cf0, 0xd07cff, 0x9b4fe0, 0xf06bc8];
  const patches: [number, number, number][] = [[-4.6, -1.8, 1.2], [4.8, -1.4, 1.1], [-3.2, -4.6, 1.0], [3.0, -4.4, 1.0], [-6.2, 1.4, 1.2], [6.3, 1.8, 1.2], [-1.6, -7.5, 1.3], [2.2, -7.2, 1.2], [-4.2, 2.8, 0.9], [4.4, 3.0, 0.9]];
  let hi = 0, ti = 0;
  for (const [px, pz, pr] of patches) {
    for (let k = 0; k < 32 && hi < 320; k++, hi++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * pr;
      dummy.position.set(px + Math.cos(a) * d, 0.08 + r() * 0.22, pz + Math.sin(a) * d * 0.7);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1.6 + r(), 1);
      dummy.updateMatrix();
      heather.setMatrixAt(hi, dummy.matrix);
      heather.setColorAt(hi, col.setHex(hc[k % 4]));
    }
    for (let k = 0; k < 22 && ti < 220; k++, ti++) {
      const a = r() * Math.PI * 2, d = pr + r() * 0.8;
      dummy.position.set(px + Math.cos(a) * d, 0.14, pz + Math.sin(a) * d * 0.7);
      dummy.rotation.set((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
      dummy.scale.setScalar(0.7 + r() * 0.6);
      dummy.updateMatrix();
      tufts.setMatrixAt(ti, dummy.matrix);
    }
  }
  heather.count = hi; tufts.count = ti;
  heather.castShadow = true;
  const heatherGroup = new THREE.Group();
  heatherGroup.add(heather);
  root.add(heatherGroup, tufts);

  // --- trái: gấu mẹ ngồi + 2 gấu con (3 cậu em hoá gấu) + cờ tartan hai bên
  const mama = bear(1.15);
  mama.position.set(-5.5, 0, -4.1);
  mama.rotation.y = 0.55;
  root.add(mama);
  const cubs = [bear(0.42, 0xc98a4b), bear(0.38, 0xd49a5c)];
  cubs[0].position.set(-4.3, 0, -1.9);
  cubs[0].rotation.y = 0.9;
  cubs[1].position.set(-3.7, 0, -2.9);
  cubs[1].rotation.y = 0.2;
  root.add(...cubs);
  const flagL = banner(3.4);
  flagL.position.set(-6.4, 0, -1.2);
  flagL.rotation.y = 0.5;
  const flagR = banner(3.4);
  flagR.position.set(6.7, 0, 0.9);
  flagR.rotation.y = Math.PI - 0.5;
  root.add(flagL, flagR);

  // --- phải: bia bắn cung + giá cung/ống tên + ngựa Angus
  const tgt = archeryTarget();
  tgt.position.set(5.7, 0, -1.0);
  tgt.rotation.y = -0.85;
  root.add(tgt);
  const tgt2 = archeryTarget();
  tgt2.position.set(3.4, 0, -7.2);
  tgt2.rotation.y = -0.2;
  tgt2.scale.setScalar(0.85);
  root.add(tgt2);
  const rack = new THREE.Group();
  const rw = mat(0xc27a3a, { rough: 0.75 });
  for (const x of [-0.45, 0.45]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.08), rw);
    post.position.set(x, 0.65, 0);
    rack.add(post);
  }
  for (const y of [1.2, 0.55]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.1), rw);
    bar.position.y = y;
    rack.add(bar);
  }
  rack.position.set(4.0, 0, 1.2);
  rack.rotation.y = -0.5;
  root.add(shadows(rack));
  try {
    const bow = await ctx.model('rooms/merida/bow.glb', { height: 1.15 });
    recolor(bow, { DarkWood: 0x9a5426, LightWood: 0xd88a45, White: 0xfff1d6 });
    const holder = new THREE.Group();
    holder.add(bow);
    holder.position.set(4.05, 0.12, 1.25);
    holder.rotation.y = -0.5;
    root.add(holder);
  } catch (e) { console.warn('bow', e); }
  try {
    const quiver = await ctx.model('rooms/merida/quiver.glb');
    const holder = fitLongest(quiver, 0.8);
    holder.position.set(4.7, 0.02, 0.7);
    holder.rotation.set(0, -0.6, 0);
    root.add(holder);
  } catch (e) { console.warn('quiver', e); }
  try {
    const gltf = await loadGLB('rooms/merida/horse.glb');
    const horse = await ctx.model('rooms/merida/horse.glb', { height: 1.7 });
    recolor(horse, { 'Material.003': 0x5a3a2e, 'Material.006': 0x2a1c18 });
    const hg = new THREE.Group();
    hg.add(horse);
    hg.position.set(4.6, 0, -3.9);
    hg.rotation.y = HORSE_YAW;
    root.add(hg);
    const clip = gltf.animations.find((c) => /idle/i.test(c.name)) ?? gltf.animations[0];
    if (clip) {
      const mixer = new THREE.AnimationMixer(horse);
      mixer.clipAction(clip).play();
      ctx.state.mixer = mixer;
    }
  } catch (e) { console.warn('horse', e); }

  // --- nấm đỏ quanh chân đá
  for (const [x, z, h] of [[-2.7, -4.7, 0.36], [-2.35, -4.4, 0.24], [2.6, -4.9, 0.3], [2.95, -4.6, 0.22], [-6.0, -2.4, 0.32], [5.9, -3.9, 0.28], [-4.9, 0.6, 0.26], [5.2, 1.6, 0.3]] as const) {
    try {
      const m = await ctx.model('rooms/merida/mushroom.glb', { height: h });
      recolor(m, { LightRed: 0xef3b3b, White: 0xfff4e4 });
      const holder = new THREE.Group();
      holder.add(m);
      holder.position.set(x, 0, z);
      holder.rotation.y = x * 3;
      root.add(holder);
    } catch { break; }
  }

  // --- đèn xanh ở cổng đá (sáng dần khi băng tan)
  const wispLight = new THREE.PointLight(0x49c6ff, 2, 9, 1.6);
  wispLight.position.set(0, 2.2, -4.2);
  root.add(wispLight);

  ctx.state.wisps = wisps;
  ctx.state.runeMats = runeMats;
  ctx.state.gateGlow = gateGlow;
  ctx.state.wispLight = wispLight;
  ctx.state.heather = heatherGroup;
  ctx.state.mama = mama;
  ctx.state.cubs = cubs;
  ctx.state.flags = [flagL, flagR];
  ctx.state.clouds = clouds;
}

const tmp = new THREE.Vector3();
const sparkPos = new THREE.Vector3();

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time, melt = ctx.melt;
  (ctx.state.mixer as THREE.AnimationMixer | undefined)?.update(dt);

  // đốm sáng xanh: đóng băng thì ít + chậm; tan dần thì nhiều hơn, lượn nhanh hơn
  const wisps = ctx.state.wisps as Wisp[] | undefined;
  if (wisps) {
    const shown = 0.3 + 0.7 * melt;
    const sp = 0.5 + 0.8 * melt;
    for (const w of wisps) {
      const vis = w.order < shown;
      w.core.visible = w.halo.visible = vis;
      if (!vis) continue;
      tmp.set(Math.sin(t * sp * 0.7 + w.seed) * 0.35, Math.sin(t * sp * 1.3 + w.seed * 2) * 0.22, Math.cos(t * sp * 0.6 + w.seed) * 0.3).add(w.base);
      w.core.position.copy(tmp);
      w.halo.position.copy(tmp);
      w.halo.material.opacity = 0.55 + 0.3 * Math.sin(t * 3 + w.seed * 5);
      w.halo.scale.setScalar(0.6 + 0.12 * Math.sin(t * 2.3 + w.seed));
    }
  }
  // hoa văn trên đá + cổng đá sáng dần theo băng tan
  (ctx.state.runeMats as THREE.MeshBasicMaterial[] | undefined)?.forEach((m, i) => {
    m.opacity = 0.3 + 0.6 * melt + Math.sin(t * 2 + i) * 0.08 * (0.3 + melt);
  });
  const gg = ctx.state.gateGlow as THREE.Sprite | undefined;
  if (gg) { gg.material.opacity = 0.15 + 0.35 * melt + Math.sin(t * 1.4) * 0.05; gg.scale.setScalar(3.2 + melt * 1.2); }
  const wl = ctx.state.wispLight as THREE.PointLight | undefined;
  if (wl) wl.intensity = 2 + 7 * melt + Math.sin(t * 2.1) * 0.6;
  // hoa thạch nam mọc cao dần
  const heather = ctx.state.heather as THREE.Object3D | undefined;
  if (heather) heather.scale.y = 0.45 + 0.55 * melt;

  // gấu mẹ gật gù, gấu con nhún nhảy (tỉnh rồi thì nhảy vui hơn)
  const mama = ctx.state.mama as THREE.Object3D | undefined;
  if (mama) {
    const head = mama.userData.head as THREE.Object3D;
    head.rotation.z = Math.sin(t * 0.8) * 0.12;
    head.rotation.x = Math.sin(t * 0.5) * 0.06;
  }
  (ctx.state.cubs as THREE.Object3D[] | undefined)?.forEach((c, i) => {
    const hop = ctx.awake ? 0.18 : 0.04 + 0.06 * melt;
    c.position.y = Math.abs(Math.sin(t * (2.2 + i * 0.4) + i)) * hop;
    c.rotation.z = Math.sin(t * 1.6 + i * 2) * 0.12;
    (c.userData.head as THREE.Object3D).rotation.y = Math.sin(t * 1.1 + i) * 0.35;
  });
  // cờ tartan phấp phới (sóng chạy dọc cờ, mép cán đứng yên)
  (ctx.state.flags as THREE.Object3D[] | undefined)?.forEach((f, i) => {
    const flag = f.userData.flag as THREE.Mesh;
    const base = f.userData.base as Float32Array;
    const pos = flag.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      const x = base[k * 3];
      pos.setZ(k, Math.sin(x * 5 - t * 4 + i) * 0.09 * x);
    }
    pos.needsUpdate = true;
  });
  (ctx.state.clouds as THREE.Object3D[] | undefined)?.forEach((c, i) => {
    c.position.x += dt * (0.25 + i * 0.05);
    if (c.position.x > 30) c.position.x = -30;
    bob(c, t, 0.2, 0.3, i);
  });
  // lấp lánh xanh + vàng quanh đồi (nhiều dần theo băng tan, rộn ràng khi đã tỉnh)
  if (Math.random() < (ctx.awake ? 0.3 : 0.04 + 0.1 * melt)) {
    sparkPos.set((Math.random() - 0.5) * 11, 0.5 + Math.random() * 3, -5 + Math.random() * 4);
    ctx.magic.twinkle(sparkPos, Math.random() < 0.6 ? 0x1e90ff : 0xf59e0b, 1, 0.3, 0.3);
  }
}

const room: RoomDef = {
  id: 'merida',
  name: 'Rừng xanh của Merida',
  emoji: '🏹',
  princessModel: 'p_merida.glb',
  rig: 'hires',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'gấu', emoji: '🐻', name: 'con gấu', fill: { index: 0, distractors: ['p', 'v'] } },
    { word: 'cung', emoji: '🏹', name: 'cái cung' },
    { word: 'đá', emoji: '🪨', name: 'hòn đá', fill: { index: 0, distractors: ['p', 'g'] } },
    { word: 'ngựa', emoji: '🐴', name: 'con ngựa' },
    { word: 'nấm', emoji: '🍄', name: 'cây nấm', fill: { index: 0, distractors: ['m', 'p'] } },
    { word: 'lửa', emoji: '🔥', name: 'ngọn lửa', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'núi', emoji: '⛰️', name: 'ngọn núi', fill: { index: 0, distractors: ['p', 'đ'] } },
  ],
  challenges: ['spell', 'fill', 'math'],
  magicColors: [0x0f7fd6, 0xea580c],
  audio: { name: 'merida_name', intro: 'merida_intro', thanks: 'merida_thanks' },
};

export default room;

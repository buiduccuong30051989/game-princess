// PHÒNG TIANA: Đầm sen New Orleans lúc chạng vạng. Bến gỗ trên mặt nước, trời tím-cam có Ngôi Sao Chiều (Evangeline)
// thật to, lá sen + hoa súng hồng trôi, ếch xanh ngồi trên lá (1 chú đội vương miện: hoàng tử Naveen), đom đóm vàng
// (đom đóm Ray bay quanh công chúa), nhà hàng "Tiana's Palace" sáng đèn (bàn bánh beignet, nồi gumbo bốc khói),
// góc nhạc jazz: kèn trumpet vàng của Louis + đèn đường, cây liễu rủ rêu, tàu hơi nước guồng đỏ ngoài xa.
// Băng tan → đom đóm nhiều dần, hoa súng nở, cửa sổ nhà hàng sáng rực, sao sáng hơn; tỉnh → nốt nhạc bay, ếch nhảy.
// Model tải thêm (CC0, xem CREDITS.md): public/models/rooms/tiana/{willow,streetlight,donut,lilypad}.glb
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RoomCtx, RoomDef } from '../room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, plankTex, skyDome, starField, glow, glowTex, rug, bob, shadows,
} from '../room/kit.ts';

const PAL = { primary: 0x22a06b, secondary: 0xffc53d, accent: 0xff6fae, light: 0xeafff4, dark: 0x1b4d5c };

/** Số ngẫu nhiên có hạt giống: cảnh giống hệt nhau mỗi lần vào phòng. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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

/** Mặt nước đầm: xanh ngọc có gợn sóng sáng. */
function waterTex(): THREE.CanvasTexture {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1b8fa6'); gr.addColorStop(1, '#23a3b0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(3);
    g.lineCap = 'round';
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = i % 3 ? 'rgba(160,240,255,0.35)' : 'rgba(255,214,150,0.35)';
      g.lineWidth = 2 + r() * 3;
      const x = r() * w, y = r() * h, l = 14 + r() * 40;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke();
    }
  }, [10, 10]);
}

/** Biển hiệu "Tiana's Palace": chữ vàng trên nền xanh lá, viền bóng đèn. */
function signTex(): THREE.CanvasTexture {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#16704a'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 26); g.fill();
    g.strokeStyle = '#ffd35c'; g.lineWidth = 8; g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, 20); g.stroke();
    for (let i = 0; i < 22; i++) {
      const t = i / 22;
      const x = 14 + t * (w - 28), top = 14, bot = h - 14;
      g.fillStyle = i % 2 ? '#fff4b8' : '#ffb347';
      g.beginPath(); g.arc(x, top, 5, 0, Math.PI * 2); g.arc(x, bot, 5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffd35c';
    g.font = 'italic bold 64px Georgia, "Times New Roman", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255,200,80,0.9)'; g.shadowBlur = 14;
    g.fillText("Tiana's Palace", w / 2, h / 2 + 4);
  });
}

/** Mái hiên sọc xanh – kem. */
function awningTex(): THREE.CanvasTexture {
  return canvasTex(256, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff3d1' : '#1f9d63'; g.fillRect(i * w / 8, 0, w / 8, h); }
  });
}

/** Chú ếch xanh tròn trịa (ngồi). crown = đội vương miện (hoàng tử Naveen). Cao ~0.3 m. */
function frog(crown = false, body = 0x5ecb3a): THREE.Group {
  const g = new THREE.Group();
  const sph = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const skin: THREE.Mesh[] = [sph(0.16, 0, 0.13, 0, 1.15, 0.85, 1)];
  const white: THREE.Mesh[] = [];
  const pupil: THREE.Mesh[] = [];
  const cheek: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    skin.push(sph(0.065, s * 0.085, 0.25, 0.06), sph(0.07, s * 0.15, 0.04, 0.03, 0.8, 0.55, 1.5));
    white.push(sph(0.05, s * 0.085, 0.26, 0.1));
    pupil.push(sph(0.026, s * 0.085, 0.265, 0.145));
    cheek.push(sph(0.03, s * 0.12, 0.17, 0.12));
  }
  g.add(
    merged(skin, mat(body, { rough: 0.55 })),
    merged([sph(0.11, 0, 0.11, 0.1, 1.1, 0.8, 0.6)], mat(0xf4f08a, { rough: 0.6 })),
    merged(white, mat(0xffffff, { rough: 0.4 })),
    merged(pupil, mat(0x1d2433, { rough: 0.3 })),
    merged(cheek, mat(0xff8fb1, { rough: 0.8 })),
  );
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), mat(0x2b5f22));
  smile.rotation.z = Math.PI;
  smile.position.set(0, 0.17, 0.15);
  g.add(smile);
  if (crown) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.05, 8, 1, true), mat(0xffc53d, { rough: 0.3, emissive: 0x6a4500, ei: 0.3, side: THREE.DoubleSide }));
    c.position.set(0, 0.3, 0.02);
    c.rotation.z = 0.2;
    g.add(c);
  }
  shadows(g);
  return g;
}

/** Lá sen tròn có khe (nổi trên nước) + tuỳ chọn hoa súng hồng. Hoa ở userData.flower để nở. */
function lilyPad(r: number, color: number, flower: boolean): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 20, 0.35, Math.PI * 2 - 0.35), mat(color, { rough: 0.6, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2;
  pad.receiveShadow = true;
  g.add(pad);
  if (flower) {
    const f = new THREE.Group();
    const petal = mat(0xff7eb6, { rough: 0.5 });
    const petal2 = mat(0xffb3d4, { rough: 0.5 });
    const layers: THREE.Mesh[][] = [[], []];
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 7; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6));
        p.scale.set(0.45, 0.25, 1);
        const a = (i / 7) * Math.PI * 2 + layer * 0.4;
        p.position.set(Math.cos(a) * 0.08 * (1 - layer * 0.35), 0.05 + layer * 0.04, Math.sin(a) * 0.08 * (1 - layer * 0.35));
        p.rotation.set(-0.6 - layer * 0.4, -a + Math.PI / 2, 0);
        layers[layer].push(p);
      }
    }
    f.add(merged(layers[0], petal), merged(layers[1], petal2));
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0xffd34d, { emissive: 0x6b4a00, ei: 0.4 }));
    heart.position.y = 0.08;
    f.add(heart);
    f.position.set(r * 0.25, 0, -r * 0.15);
    g.add(f);
    g.userData.flower = f;
  }
  return g;
}

/** Cây bách đầm lầy: gốc loe, tán dẹt, rêu Tây Ban Nha rủ xuống. Đáy y=0. */
function cypress(h: number, leaf: number, far = false): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.035, h * 0.1, h * 0.75, 9), mat(0x9c6a4a, { rough: 0.9 }));
  trunk.position.y = h * 0.375;
  g.add(trunk);
  const crowns: THREE.Mesh[] = [];
  for (const [x, y, z, s] of [[0, 0.82, 0, 1], [-0.22, 0.72, 0.1, 0.7], [0.25, 0.7, -0.05, 0.75], [0.05, 0.95, 0.05, 0.55]] as const) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(h * 0.2 * s, 9, 6));
    c.scale.set(1.4, 0.45, 1.2);
    c.position.set(x * h, y * h, z * h);
    crowns.push(c);
  }
  g.add(merged(crowns, mat(leaf, { rough: 0.9, flat: true })));
  if (!far) {
    const strands: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const len = h * (0.16 + (i % 3) * 0.06);
      const strand = new THREE.Mesh(new THREE.ConeGeometry(h * 0.025, len, 5));
      strand.rotation.x = Math.PI;
      strand.position.set(Math.cos(a) * h * 0.24, h * 0.72 - len / 2, Math.sin(a) * h * 0.2);
      strands.push(strand);
    }
    g.add(merged(strands, mat(0xa7d9a2, { rough: 1 })));
  }
  shadows(g);
  return g;
}

/** Dây đèn võng qua các cột (1 dây + bóng đèn instanced + quầng Points): 3 draw call cho cả hàng. */
function ropeLights(posts: THREE.Vector3[], sag: number, perSpan: number, colors: number[]): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  const bulbs: THREE.Vector3[] = [];
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      pts.push(a.clone().lerp(b, t).setY(a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag));
    }
    for (let k = 1; k <= perSpan; k++) {
      const t = k / (perSpan + 1);
      bulbs.push(a.clone().lerp(b, t).setY(a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag - 0.04));
    }
  }
  pts.push(posts[posts.length - 1].clone());
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.012, 4, false), mat(0x6b4b3a));
  g.add(wire);
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ fog: false }), bulbs.length);
  const d = new THREE.Object3D();
  const col = new THREE.Color();
  const hp = new Float32Array(bulbs.length * 3), hc = new Float32Array(bulbs.length * 3);
  bulbs.forEach((p, i) => {
    d.position.copy(p); d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
    col.setHex(colors[i % colors.length]);
    inst.setColorAt(i, col);
    p.toArray(hp, i * 3); col.toArray(hc, i * 3);
  });
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  hg.setAttribute('color', new THREE.BufferAttribute(hc, 3));
  const halos = new THREE.Points(hg, new THREE.PointsMaterial({ size: 0.3, map: glowTex(), vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
  g.add(inst, halos);
  return g;
}

/** Kèn trumpet vàng của Louis (nằm ngang, loa hướng +x). */
function trumpet(): THREE.Group {
  const g = new THREE.Group();
  const gold = mat(0xffc233, { rough: 0.25, emissive: 0x5a3a00, ei: 0.35 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 10), gold);
  tube.rotation.z = Math.PI / 2;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.03, 0.22, 20, 1, true), mat(0xffc233, { rough: 0.25, emissive: 0x5a3a00, ei: 0.35, side: THREE.DoubleSide }));
  bell.rotation.z = -Math.PI / 2;
  bell.position.x = 0.38;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 20, Math.PI), gold);
  loop.position.set(-0.05, -0.07, 0);
  loop.rotation.z = Math.PI;
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.07, 10), gold);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.x = -0.33;
  g.add(tube, bell, loop, mouth);
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), gold);
    v.position.set(-0.08 + i * 0.05, 0.06, 0);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.015, 10), mat(0xfff1c2, { rough: 0.3 }));
    cap.position.set(-0.08 + i * 0.05, 0.125, 0);
    g.add(v, cap);
  }
  shadows(g);
  return g;
}

/** Bánh beignet: gối bột vàng phủ đường trắng. */
function beignet(): THREE.Group {
  const g = new THREE.Group();
  const dough = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12, 2, 1, 2), mat(0xf0b35a, { rough: 0.8 }));
  const pos = dough.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * (1 - 0.35 * (Math.abs(pos.getX(i)) + Math.abs(pos.getZ(i))) / 0.12));
  dough.geometry.computeVertexNormals();
  const sugar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.1), mat(0xfffaf0, { rough: 1 }));
  sugar.position.y = 0.03;
  g.add(dough, sugar);
  return g;
}

/** Tàu hơi nước guồng đỏ (xa). Guồng ở userData.wheel để quay; cửa sổ ở userData.windows. */
function steamboat(): THREE.Group {
  const g = new THREE.Group();
  const cream = mat(0xfff0d6, { rough: 0.7 });
  const red = mat(0xe8433f, { rough: 0.6 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 2.2), cream);
  hull.position.y = 0.4;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(7.05, 0.18, 2.25), red);
  trim.position.y = 0.72;
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.9, 1.9), cream);
  deck1.position.set(-0.2, 1.25, 0);
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.75, 1.6), cream);
  deck2.position.set(-0.5, 2.05, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.12, 1.8), red);
  roof.position.set(-0.5, 2.48, 0);
  g.add(hull, trim, deck1, deck2, roof);
  const winMat = glowMat(0xffc861);
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 0.32), winMat, 26);
  const d = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 14; i++) { d.position.set(-2.8 + i * 0.4, 1.28, 0.96); d.updateMatrix(); windows.setMatrixAt(n++, d.matrix); }
  for (let i = 0; i < 12 && n < 26; i++) { d.position.set(-2.2 + i * 0.3, 2.07, 0.81); d.scale.set(0.8, 0.8, 1); d.updateMatrix(); windows.setMatrixAt(n++, d.matrix); }
  g.add(windows);
  for (const x of [-1.3, 0.3]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 10), mat(0x2f3f7a, { rough: 0.6 }));
    stack.position.set(x, 3.5, 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.14, 0.25, 10), mat(0xffc53d, { rough: 0.35 }));
    crown.position.set(x, 4.65, 0);
    g.add(stack, crown);
  }
  const wheel = new THREE.Group();
  wheel.position.set(3.7, 0.8, 0);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 6, 24), red);
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.5), red);
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
  }
  wheel.rotation.y = Math.PI / 2;
  const wheelHolder = new THREE.Group();
  wheelHolder.add(wheel);
  g.add(wheelHolder);
  g.userData.wheel = wheel;
  return g;
}

/** Đổi màu material theo tên (model tải về màu tối/xỉn). */
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

/** Model nằm lệch trục (fitHeight làm nó khổng lồ): scale theo cạnh dài nhất, đáy y=0, bọc trong Group. */
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

/** Nốt nhạc màu (emoji 🎵 của Apple màu đen, không hợp nền): vẽ chữ ♪ viền trắng. */
function noteTex(ch: string, color: string): THREE.CanvasTexture {
  return canvasTex(128, 128, (g, w, h) => {
    g.font = 'bold 100px "Apple Symbols", "Segoe UI Symbol", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#ffffff'; g.strokeText(ch, w / 2, h / 2);
    g.fillStyle = color; g.fillText(ch, w / 2, h / 2);
  });
}

interface Pad { obj: THREE.Object3D; seed: number }
interface Hopper { obj: THREE.Object3D; seed: number; baseY: number }
const FIREFLIES = 70;
/** cột đèn đường New Orleans (x, z) */
const LAMPS: [number, number][] = [[3.9, -2.3]];
/** hướng cột đèn: model gốc vươn tay đèn theo +x → quay để tay đèn chìa vào giữa, hơi về camera */
const LAMP_YAW = Math.PI - 0.35;

async function buildScene(ctx: RoomCtx): Promise<void> {
  const { root, scene } = ctx;
  const r = rng(11);
  scene.fog = new THREE.Fog(0x6a4f9c, 26, 75);

  // --- trời chạng vạng tím → cam hồng + sao + Ngôi Sao Chiều thật to
  const dome = skyDome(0x24287a, 0xff9f7a, 80);
  dome.position.set(0, -26, -10);
  root.add(dome);
  const stars = starField(420, 50, 0xfff6d6, 0.32);
  stars.position.set(0, 4, -8);
  root.add(stars);
  const evening = new THREE.Group();
  evening.position.set(-3.2, 5.8, -36);
  const starCore = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), glowMat(0xfffbe0));
  const starHalo = glow(0xfff0a8, 6, 0.75);
  const flareH = glow(0xfff6c8, 1, 0.8);
  flareH.scale.set(9, 0.35, 1);
  const flareV = glow(0xfff6c8, 1, 0.8);
  flareV.scale.set(0.35, 7, 1);
  evening.add(starHalo, flareH, flareV, starCore);
  root.add(evening);

  // --- mặt nước đầm + hàng cây xa (bóng tím) + tàu hơi nước
  const wTex = waterTex();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), new THREE.MeshStandardMaterial({ map: wTex, color: 0xffffff, roughness: 0.3, metalness: 0, emissive: 0x0e5a78, emissiveIntensity: 0.55 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.28, -40);
  water.receiveShadow = true;
  root.add(water);
  // dải phản chiếu ánh sao/đèn trên mặt nước
  const shimmer = glow(0xffd27a, 1, 0.35);
  shimmer.scale.set(1.2, 9, 1);
  shimmer.position.set(-3.2, 0.4, -30);
  root.add(shimmer);
  for (let i = 0; i < 16; i++) {
    const x = -40 + i * 5.3 + r() * 2;
    const tree = cypress(3.6 + r() * 2.6, i % 2 ? 0x3d7f7a : 0x4b6fa0, true);
    tree.position.set(x, -0.3, -30 - r() * 8);
    root.add(tree);
  }
  const boat = steamboat();
  boat.position.set(6.0, -0.3, -22);
  boat.rotation.y = -0.2;
  root.add(boat);
  const boatGlow = glow(0xffc861, 6, 0.3);
  boatGlow.position.set(5.8, 1.5, -21.5);
  root.add(boatGlow);

  // --- lá sen + hoa súng trôi, ếch ngồi trên lá
  const pads: Pad[] = [];
  const flowers: THREE.Object3D[] = [];
  const padSpots: [number, number, number, boolean][] = [];
  for (let i = 0; i < 30; i++) {
    let x = (r() - 0.5) * 22, z = -3.6 - r() * 13;
    if (i < 8) { x = (i - 3.5) * 1.7 + (r() - 0.5) * 0.6; z = -3.5 - r() * 1.6; }
    padSpots.push([x, z, 0.35 + r() * 0.35, i % 3 === 0]);
  }
  padSpots.forEach(([x, z, rad, fl], i) => {
    const p = lilyPad(rad, r() < 0.5 ? 0x3fbf4f : 0x62d35a, fl);
    p.position.set(x, -0.25, z);
    p.rotation.y = r() * 6;
    root.add(p);
    // iPad: chỉ 8 lá gần bập bềnh; lá xa đứng yên để gộp chung 1 draw call (nhìn từ xa không thấy khác)
    const seed = r() * 10;
    if (i < 8) pads.push({ obj: p, seed });
    if (p.userData.flower) flowers.push(p.userData.flower as THREE.Object3D);
  });
  const hoppers: Hopper[] = [];
  for (const [x, z, crown, rot] of [[-2.2, -4.0, true, 0.4], [2.6, -4.3, false, -0.4], [-4.3, -6.8, false, 0.6], [4.8, -7.6, false, -0.7], [0.6, -8.8, false, 0]] as const) {
    const pad = lilyPad(0.42, 0x4cc94f, false);
    pad.position.set(x, -0.25, z);
    root.add(pad);
    pads.push({ obj: pad, seed: x });
    const f = frog(crown, crown ? 0x4fbf3a : 0x6fd146);
    f.position.set(x, -0.24, z);
    f.rotation.y = rot;
    f.scale.setScalar(crown ? 1.25 : 1.1);
    root.add(f);
    hoppers.push({ obj: f, seed: x * 3 + z, baseY: -0.24 });
  }
  try {
    // vài lá sen model CC0 (có hoa) cho đa dạng hình dáng
    for (const [x, z, s] of [[-6.5, -5.5, 1.2], [6.8, -5.2, 1.1], [-1.2, -11, 1.4]] as const) {
      const m = fitLongest(await ctx.model('rooms/tiana/lilypad.glb'), s);
      recolor(m, { Green: 0x46c15a, Pink: 0xff6fae });
      m.position.set(x, -0.27, z);
      root.add(m);
      pads.push({ obj: m, seed: z });
    }
  } catch (e) { console.warn('lilypad', e); }

  // --- bến gỗ (sàn) + mép bến có cột + dây đèn, thảm tròn xanh viền vàng
  const deck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.3, 13), texMat(plankTex(0xe8b066, [7, 3]), { rough: 0.8 }));
  deck.position.set(0, -0.15, 3.9);
  deck.receiveShadow = true;
  root.add(deck);
  const postM = mat(0xb87a45, { rough: 0.8 });
  const capM = mat(0xffc53d, { rough: 0.4 });
  const posts: THREE.Vector3[] = [];
  const postParts: THREE.Mesh[] = [];
  const capParts: THREE.Mesh[] = [];
  for (let i = 0; i < 13; i++) {
    const x = -9 + i * 1.5;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.2, 8));
    post.position.set(x, 0.3, -2.62);
    // cột chìm dưới nước phía trước mép bến
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8));
    pile.position.set(x, -0.3, -2.45);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8));
    cap.position.set(x, 0.92, -2.62);
    postParts.push(post, pile);
    capParts.push(cap);
    posts.push(new THREE.Vector3(x, 0.9, -2.62));
  }
  root.add(shadows(merged(postParts, postM)), merged(capParts, capM));
  root.add(ropeLights(posts, 0.16, 4, [0xffe07a, 0xff9fcf, 0x9ff0c8]));
  const carpet = rug(3.3, 2.3, 0x22a06b, 0xffc53d);
  carpet.position.set(0, 0.002, 0.6);
  root.add(carpet);
  const inner = rug(1.7, 1.2, 0x31c07e, 0xff6fae);
  inner.position.set(0, 0.006, 1.2);
  root.add(inner);

  // --- dây đèn lớn vắt ngang phía sau (từ nhà hàng sang cột đèn)
  root.add(ropeLights([new THREE.Vector3(-4.9, 3.7, -3.6), new THREE.Vector3(0, 3.9, -4.4), new THREE.Vector3(5.0, 3.6, -3.4)], 0.55, 11, [0xffe07a, 0xff9fcf, 0xa8f0ff]));

  // --- trái: nhà hàng Tiana's Palace (mặt tiền quay vào giữa)
  const palace = new THREE.Group();
  palace.position.set(-4.9, 0, -6.0);
  palace.rotation.y = 0.4;
  palace.scale.setScalar(0.78);
  const facade = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.4, 0.3), mat(0xffe1a3, { rough: 0.85 }));
  facade.position.y = 2.2;
  palace.add(facade);
  const trimG = mat(0x1f9d63, { rough: 0.6 });
  for (const y of [0.1, 2.35, 4.35]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.14, 0.4), trimG);
    band.position.y = y;
    palace.add(band);
  }
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffb347, fog: false });
  const winParts: THREE.Mesh[] = [];
  const frameParts: THREE.Mesh[] = [];
  for (const [x, y, w, h] of [[-1.35, 0.7, 0.8, 1.3], [1.35, 0.7, 0.8, 1.3], [-1.3, 2.75, 0.75, 1.05], [0, 2.75, 0.75, 1.05], [1.3, 2.75, 0.75, 1.05]] as const) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h));
    win.position.set(x, y + h / 2, 0.16);
    const top = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 16, 0, Math.PI));
    top.position.set(x, y + h, 0.16);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.08, 0.1));
    frame.position.set(x, y - 0.02, 0.2);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05));
    bar.position.set(x, y + h / 2, 0.19);
    winParts.push(win, top);
    frameParts.push(frame, bar);
  }
  palace.add(merged(winParts, winMat), merged(frameParts, trimG));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.8), mat(0x1f9d63, { rough: 0.5 }));
  door.position.set(0, 0.95, 0.16);
  const doorTop = new THREE.Mesh(new THREE.CircleGeometry(0.475, 16, 0, Math.PI), mat(0x1f9d63, { rough: 0.5 }));
  doorTop.position.set(0, 1.85, 0.16);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), capM);
  knob.position.set(0.3, 0.95, 0.2);
  palace.add(door, doorTop, knob);
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 0.8), texMat(awningTex(), { rough: 0.9, side: THREE.DoubleSide }));
  awning.position.set(0, 2.2, 0.5);
  awning.rotation.x = -0.9;
  palace.add(awning);
  // ban công sắt uốn vàng tầng 2
  const railM = mat(0xffc53d, { rough: 0.4 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.06), railM);
  rail.position.set(0, 3.3, 0.7);
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.1, 0.8), trimG);
  balcony.position.set(0, 2.45, 0.4);
  palace.add(rail, balcony);
  const bars: THREE.Mesh[] = [];
  for (let i = 0; i < 15; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.8, 0.03));
    bar.position.set(-2.05 + i * 0.29, 2.9, 0.72);
    bars.push(bar);
  }
  palace.add(merged(bars, railM));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.875), texMat(signTex(), { rough: 0.6, emissive: 0xffffff, ei: 0.55 }));
  sign.position.set(0.8, 4.0, 0.9); // lệch vào giữa để nút lâu đài (góc trái trên) không che chữ
  palace.add(sign);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.2, 0.7), trimG);
  roof.position.set(0, 4.5, 0.1);
  palace.add(roof);
  shadows(palace, true, true);
  root.add(palace);
  const palaceGlow = glow(0xffb347, 5, 0.3);
  palaceGlow.position.set(-4.4, 1.5, -5.3);
  root.add(palaceGlow);

  // bàn ăn nhỏ ngoài hiên: khăn kẻ ô, đĩa bánh beignet, nồi gumbo bốc khói trên bếp
  const table = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), texMat(canvasTex(128, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#ffffff' : '#ff6f8e'; g.fillRect(i * w / 8, j * h / 8, w / 8, h / 8); }
  }), { rough: 0.9 }));
  top.position.y = 0.72;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.72, 10), mat(0x1f9d63, { rough: 0.5 }));
  leg.position.y = 0.36;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.03, 24), mat(0xfff8ee, { rough: 0.4 }));
  plate.position.y = 0.76;
  table.add(top, leg, plate);
  for (const [x, z, y] of [[-0.08, -0.06, 0.8], [0.09, -0.04, 0.8], [0, 0.09, 0.8], [0.01, 0.0, 0.855]] as const) {
    const b = beignet();
    b.position.set(x, y, z);
    b.rotation.y = x * 20;
    table.add(b);
  }
  table.position.set(-4.5, 0, -1.2);
  shadows(table);
  root.add(table);
  try {
    const dn = await ctx.model('rooms/tiana/donut.glb', { height: 0.09 });
    dn.position.set(-4.35, 0.745, -1.45);
    root.add(dn);
  } catch (e) { console.warn('donut', e); }
  const stove = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.5, 16), mat(0x2f3f7a, { rough: 0.6 }));
  stand.position.y = 0.25;
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 10), glowMat(0xff8a2a));
  fire.position.y = 0.58;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.42, 20), mat(0xe8433f, { rough: 0.45 }));
  pot.position.y = 0.84;
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.31, 20), mat(0xe39a3b, { rough: 0.6 }));
  soup.rotation.x = -Math.PI / 2;
  soup.position.y = 1.03;
  const handleM = mat(0xffc53d, { rough: 0.4 });
  for (const s of [-1, 1]) {
    const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12, Math.PI), handleM);
    hnd.position.set(s * 0.36, 0.98, 0);
    hnd.rotation.set(0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    stove.add(hnd);
  }
  const spoon = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), mat(0xd99a5a));
  stick.position.y = 0.27;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xd99a5a));
  bowl.scale.set(1, 0.4, 1.3);
  spoon.add(stick, bowl);
  spoon.position.set(0.08, 0.95, 0.05);
  spoon.rotation.z = -0.35;
  stove.add(stand, fire, pot, soup, spoon);
  stove.position.set(-3.7, 0, -2.1);
  shadows(stove);
  root.add(stove);
  const steam: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const s = glow(0xfff4ea, 0.4, 0.4);
    s.position.set(-3.7, 1.1, -2.1);
    root.add(s);
    steam.push(s);
  }

  // --- phải: góc jazz: thùng gỗ + kèn trumpet, đèn đường New Orleans, cây liễu rủ
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), texMat(plankTex(0xd4924e, [1, 1]), { rough: 0.8 }));
  crate.position.set(3.4, 0.3, -1.85);
  crate.rotation.y = -0.4;
  crate.castShadow = true;
  root.add(crate);
  const horn = trumpet();
  horn.position.set(3.4, 0.66, -1.85);
  horn.rotation.set(0, -0.4 + Math.PI, 0.15);
  horn.scale.setScalar(1.1);
  root.add(horn);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 20), mat(0xe8433f, { rough: 0.5 }));
  drum.position.set(4.3, 0.23, -1.5);
  const drumTop = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), mat(0xfff4dc, { rough: 0.7 }));
  drumTop.rotation.x = -Math.PI / 2;
  drumTop.position.set(4.3, 0.46, -1.5);
  root.add(drum, drumTop);
  // cột đèn đường New Orleans: tay đèn vươn vào giữa; quầng sáng đặt đúng chỗ bóng đèn (đo bbox mesh "Light")
  const lampGlows: THREE.Sprite[] = [];
  for (const [x, z] of LAMPS) {
    try {
      const lamp = fitLongest(await ctx.model('rooms/tiana/streetlight.glb'), 2.6);
      recolor(lamp, { Grey: 0x2f6f5a, Light: 0xfff2b0 });
      lamp.position.set(x, 0, z);
      lamp.rotation.y = LAMP_YAW;
      root.add(lamp);
      lamp.updateMatrixWorld(true);
      const bulb = new THREE.Box3();
      lamp.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && [m.material].flat().some((mt) => mt.name === 'Light')) bulb.expandByObject(m);
      });
      const lg = glow(0xffe08a, 1.6, 0.6);
      if (bulb.isEmpty()) lg.position.set(x, 3.2, z); else bulb.getCenter(lg.position);
      root.add(lg);
      lampGlows.push(lg);
    } catch (e) { console.warn('streetlight', e); break; }
  }
  try {
    for (const [x, z, h] of [[8.7, -5.0, 4.6], [-8.4, -7.0, 5.6], [9.8, -10.5, 5.4]] as const) {
      const wl = await ctx.model('rooms/tiana/willow.glb', { height: h });
      recolor(wl, { Wood: 0xa0704f, DarkGreen: 0x4aa877 });
      const holder = new THREE.Group();
      holder.add(wl);
      holder.position.set(x, x > 5 || x < -5 ? 0 : -0.3, z);
      holder.rotation.y = x;
      root.add(holder);
    }
  } catch (e) { console.warn('willow', e); }
  for (const [x, z, h, c] of [[8.8, -1.0, 6.2, 0x4aa877], [-9.0, -0.8, 6.8, 0x3f9f7a], [-10.5, -11, 7, 0x4b8fa0], [-4.4, -14, 5.5, 0x3f9f7a]] as const) {
    const cy = cypress(h, c);
    cy.position.set(x, z < -3 ? -0.3 : 0, z);
    cy.rotation.y = x;
    root.add(cy);
  }

  // --- đom đóm: 1 Points (1 draw call) + đom đóm Ray to bay quanh công chúa
  const ffPos = new Float32Array(FIREFLIES * 3);
  const ffSeed: number[] = [];
  for (let i = 0; i < FIREFLIES; i++) {
    ffSeed.push(r() * 100);
    ffPos[i * 3] = (r() - 0.5) * 16;
    ffPos[i * 3 + 1] = 0.4 + r() * 3.6;
    ffPos[i * 3 + 2] = -9 + r() * 8;
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xffe14d, size: 0.32, map: glowTex(), transparent: true, depthWrite: false, fog: false }));
  root.add(fireflies);
  const ray = new THREE.Group();
  const rayBody = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), glowMat(0xfff27a));
  const rayGlow = glow(0xffd42a, 0.7, 0.9);
  ray.add(rayBody, rayGlow);
  root.add(ray);

  // nốt nhạc bay lên từ kèn (hiện khi băng tan hết / công chúa tỉnh)
  const notes: THREE.Sprite[] = [];
  const noteA = noteTex('♪', '#ffc53d'), noteB = noteTex('♫', '#ff6fae');
  for (let i = 0; i < 4; i++) {
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: i % 2 ? noteA : noteB, transparent: true, depthWrite: false }));
    n.scale.setScalar(0.42);
    n.visible = false;
    root.add(n);
    notes.push(n);
  }

  // --- đèn ấm: nhà hàng + cột đèn (2 point light)
  const warmL = new THREE.PointLight(0xffb45a, 6, 9, 1.6);
  warmL.position.set(-4.2, 2.4, -2.4);
  const warmR = new THREE.PointLight(0xffd27a, 5, 9, 1.6);
  warmR.position.set(3.6, 3.0, -1.8);
  root.add(warmL, warmR);

  ctx.state.pads = pads;
  ctx.state.flowers = flowers;
  ctx.state.hoppers = hoppers;
  ctx.state.evening = evening;
  ctx.state.starHalo = starHalo;
  ctx.state.wTex = wTex;
  ctx.state.wheel = boat.userData.wheel;
  ctx.state.fireflies = fireflies;
  ctx.state.ffSeed = ffSeed;
  ctx.state.ffBase = Float32Array.from(ffPos);
  ctx.state.ray = ray;
  ctx.state.notes = notes;
  ctx.state.steam = steam;
  ctx.state.fire = fire;
  ctx.state.winMat = winMat;
  ctx.state.palaceGlow = palaceGlow;
  ctx.state.lampGlows = lampGlows;
  ctx.state.warm = [warmL, warmR];
}

const WIN_DIM = new THREE.Color(0xe0923a);
const WIN_LIT = new THREE.Color(0xffd36b);
const sparkPos = new THREE.Vector3();

function ambient(ctx: RoomCtx, dt: number): void {
  const t = ctx.time, melt = ctx.melt;

  // lá sen bồng bềnh, nước gợn trôi
  (ctx.state.pads as Pad[] | undefined)?.forEach((p) => { bob(p.obj, t, 0.02, 1.2, p.seed); p.obj.rotation.y += dt * 0.03 * Math.sin(p.seed); });
  const wTex = ctx.state.wTex as THREE.Texture | undefined;
  if (wTex) { wTex.offset.x = (t * 0.004) % 1; wTex.offset.y = (t * 0.01) % 1; }
  // hoa súng nở theo băng tan
  (ctx.state.flowers as THREE.Object3D[] | undefined)?.forEach((f, i) => {
    const s = 0.45 + 0.75 * melt + Math.sin(t * 1.5 + i) * 0.03;
    f.scale.setScalar(s);
  });
  // ếch: thở phập phồng; tỉnh rồi thì thi nhau nhảy
  (ctx.state.hoppers as Hopper[] | undefined)?.forEach((h) => {
    const ph = (t * 0.9 + h.seed) % 3;
    const jump = ctx.awake && ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) * 0.35 : 0;
    h.obj.position.y = h.baseY + jump + Math.sin(t * 1.2 + h.seed) * 0.015;
    h.obj.scale.y = h.obj.scale.x * (1 + Math.sin(t * 4 + h.seed) * 0.04);
  });
  // Ngôi Sao Chiều lấp lánh, sáng hơn khi băng tan
  const ev = ctx.state.evening as THREE.Object3D | undefined;
  if (ev) {
    const k = 0.75 + 0.35 * melt + Math.sin(t * 2.2) * 0.08;
    ev.scale.setScalar(k);
    ev.rotation.z = Math.sin(t * 0.4) * 0.08;
  }
  const halo = ctx.state.starHalo as THREE.Sprite | undefined;
  if (halo) halo.material.opacity = 0.5 + 0.35 * melt;
  const wheel = ctx.state.wheel as THREE.Object3D | undefined;
  if (wheel) wheel.rotation.z -= dt * (0.4 + 0.8 * melt);

  // đom đóm: bay lượn, nhiều dần theo băng tan
  const ff = ctx.state.fireflies as THREE.Points | undefined;
  if (ff) {
    const seed = ctx.state.ffSeed as number[];
    const base = ctx.state.ffBase as Float32Array;
    const pos = ff.geometry.getAttribute('position') as THREE.BufferAttribute;
    const n = Math.round(FIREFLIES * (0.25 + 0.75 * melt));
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      pos.setXYZ(i,
        base[i * 3] + Math.sin(t * 0.35 + s) * 0.9,
        base[i * 3 + 1] + Math.sin(t * 0.7 + s * 2) * 0.35,
        base[i * 3 + 2] + Math.cos(t * 0.3 + s) * 0.6);
    }
    pos.needsUpdate = true;
    ff.geometry.setDrawRange(0, n);
    (ff.material as THREE.PointsMaterial).size = 0.26 + 0.08 * Math.sin(t * 5);
  }
  // Ray bay vòng quanh công chúa (sau lưng rồi ra trước), sáng nhấp nháy
  const ray = ctx.state.ray as THREE.Object3D | undefined;
  if (ray) {
    const a = t * (0.7 + 0.5 * melt);
    ray.position.set(Math.cos(a) * 1.6, 1.4 + Math.sin(t * 1.7) * 0.35 + melt * 0.3, -0.4 + Math.sin(a) * 1.0);
    ray.scale.setScalar(0.9 + 0.25 * Math.sin(t * 9));
  }
  // cửa sổ nhà hàng sáng dần
  const win = ctx.state.winMat as THREE.MeshBasicMaterial | undefined;
  if (win) win.color.copy(WIN_DIM).lerp(WIN_LIT, melt);
  const pg = ctx.state.palaceGlow as THREE.Sprite | undefined;
  if (pg) pg.material.opacity = 0.2 + 0.3 * melt + Math.sin(t * 1.3) * 0.04;
  (ctx.state.lampGlows as THREE.Sprite[] | undefined)?.forEach((g, i) => { g.material.opacity = 0.5 + 0.2 * Math.sin(t * 3 + i * 2) * 0.3 + 0.2 * melt; });
  const warm = ctx.state.warm as THREE.PointLight[] | undefined;
  if (warm) { warm[0].intensity = 5 + 3 * melt + Math.sin(t * 8) * 0.3; warm[1].intensity = 4 + 3 * melt; }
  // bếp: lửa lập loè, khói bay
  const fire = ctx.state.fire as THREE.Object3D | undefined;
  if (fire) fire.scale.set(1 + Math.sin(t * 13) * 0.1, 1 + Math.sin(t * 17) * 0.18, 1 + Math.sin(t * 11) * 0.1);
  (ctx.state.steam as THREE.Sprite[] | undefined)?.forEach((s, i) => {
    const ph = ((t * 0.35 + i / 5) % 1);
    s.position.set(-3.7 + Math.sin(ph * 6 + i) * 0.12, 1.1 + ph * 1.1, -2.1);
    s.scale.setScalar(0.3 + ph * 0.5);
    s.material.opacity = 0.45 * (1 - ph);
  });
  // nốt nhạc bay từ kèn khi đã tỉnh (hoặc gần tan hết)
  const notes = ctx.state.notes as THREE.Sprite[] | undefined;
  if (notes) {
    const on = ctx.awake || melt > 0.95;
    notes.forEach((n, i) => {
      n.visible = on;
      if (!on) return;
      const ph = ((t * 0.3 + i / notes.length) % 1);
      n.position.set(3.2 - ph * 0.6 + Math.sin(ph * 8 + i) * 0.2, 0.9 + ph * 2.4, -1.9);
      n.material.opacity = Math.min(1, (1 - ph) * 2.5);
    });
  }
  // lấp lánh xanh lá + vàng (nhiều dần theo băng tan)
  if (Math.random() < (ctx.awake ? 0.3 : 0.03 + 0.1 * melt)) {
    sparkPos.set((Math.random() - 0.5) * 10, 0.4 + Math.random() * 3, -4 + Math.random() * 3);
    ctx.magic.twinkle(sparkPos, Math.random() < 0.5 ? 0xd99a00 : 0x16a34a, 1, 0.3, 0.3);
  }
}

const room: RoomDef = {
  id: 'tiana',
  name: 'Đầm sen của Tiana',
  emoji: '🐸',
  princessModel: 'p_tiana.glb',
  rig: 'tiana',
  palette: PAL,
  buildScene,
  ambient,
  words: [
    { word: 'ếch', emoji: '🐸', name: 'con ếch' },
    { word: 'sen', emoji: '🪷', name: 'bông sen', fill: { index: 0, distractors: ['b', 'p'] } },
    { word: 'bánh', emoji: '🍩', name: 'cái bánh', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'kèn', emoji: '🎺', name: 'cái kèn', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'nồi', emoji: '🍲', name: 'cái nồi', fill: { index: 0, distractors: ['p', 'x'] } },
    { word: 'thìa', emoji: '🥄', name: 'cái thìa' },
    { word: 'tôm', emoji: '🦐', name: 'con tôm', fill: { index: 0, distractors: ['c', 'l'] } },
  ],
  challenges: ['spell', 'fill', 'math'],
  magicColors: [0x15803d, 0xd97706],
  audio: { name: 'tiana_name', intro: 'tiana_intro', thanks: 'tiana_thanks' },
};

export default room;

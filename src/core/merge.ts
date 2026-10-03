// GỘP ĐỒ TĨNH để giảm draw call cho iPad (ngân sách ≤ 150 draw call / cảnh).
// Sau khi dựng cảnh: mọi Mesh tĩnh cùng "loại vật liệu" (cùng tham số, không cần cùng object) gộp thành 1 Mesh;
// Sprite tĩnh (emoji, quầng sáng) đổi thành tấm phẳng quay về camera rồi gộp theo texture.
//
// KHÔNG gộp (giữ nguyên, vẫn hoạt cảnh được):
//  - object nằm trong `keep` hoặc nằm dưới 1 object trong `keep` (phòng: mọi thứ tham chiếu từ ctx.state, kể cả lồng trong
//    mảng / object thường) — ambient() chỉ đụng tới đồ qua ctx.state nên đồ còn lại là tĩnh;
//  - material nằm trong `keepMaterials` (ambient đổi màu/độ mờ của material đó → giữ nguyên object material);
//  - SkinnedMesh, InstancedMesh, Points, Line, mesh có userData (vùng chạm / dữ liệu riêng), material ẩn, morph.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sharedGeometries } from './shared.ts';

export interface MergeOpts {
  /** object động (giữ nguyên cả cây con) */
  keep?: Iterable<THREE.Object3D>;
  /** material có hoạt cảnh (đổi màu/opacity…) → không gộp theo tham số, chỉ gộp mesh dùng CHÍNH material đó */
  keepMaterials?: Iterable<THREE.Material>;
  /** camera để xoay sprite → tấm phẳng (không có thì giữ sprite) */
  camera?: THREE.Camera;
}

export interface MergeStats { meshesBefore: number; meshesAfter: number; sprites: number }

/** Gom mọi Object3D / Material tham chiếu được từ 1 giá trị (ctx.state): mảng, object thường, Map, Set. */
export function collectRefs(value: unknown): { objects: Set<THREE.Object3D>; materials: Set<THREE.Material>; directMaterials: Set<THREE.Material> } {
  const objects = new Set<THREE.Object3D>();
  const materials = new Set<THREE.Material>();
  const directMaterials = new Set<THREE.Material>();
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number): void => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 6) return;
    seen.add(v);
    if ((v as THREE.Object3D).isObject3D) {
      const o = v as THREE.Object3D;
      objects.add(o);
      // material của object động cũng có thể bị đổi → giữ identity
      const m = (o as THREE.Mesh).material;
      if (m) for (const x of Array.isArray(m) ? m : [m]) materials.add(x);
      walk(o.userData, depth + 1);
      return;
    }
    if ((v as THREE.Material).isMaterial) { materials.add(v as THREE.Material); directMaterials.add(v as THREE.Material); return; }
    if ((v as THREE.Texture).isTexture || (v as THREE.BufferGeometry).isBufferGeometry || ArrayBuffer.isView(v)) return;
    if (v instanceof Map) { for (const x of v.values()) walk(x, depth + 1); return; }
    if (v instanceof Set || Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    for (const x of Object.values(v as Record<string, unknown>)) walk(x, depth + 1);
  };
  walk(value, 0);
  return { objects, materials, directMaterials };
}

/** Loại material gộp được khi chỉ khác màu (màu → vertex color). */
const COLORLESS_OK = new Set(['MeshStandardMaterial', 'MeshBasicMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial']);

const MAT_PROPS = [
  'type', 'opacity', 'transparent', 'side', 'depthWrite', 'depthTest', 'blending', 'alphaTest', 'vertexColors', 'fog',
  'toneMapped', 'flatShading', 'roughness', 'metalness', 'emissiveIntensity', 'wireframe', 'polygonOffset',
  'polygonOffsetFactor', 'polygonOffsetUnits', 'visible', 'colorWrite',
] as const;

/** Chữ ký tham số material (2 material cùng chữ ký vẽ y hệt nhau). */
function matSig(m: THREE.Material, colorless = false): string {
  const r = m as unknown as Record<string, unknown>;
  // gộp theo màu: bỏ qua cả độ nhám (khác 0.3 với 0.8 nhìn gần như không thấy trên đồ trang trí nhỏ)
  const parts: unknown[] = MAT_PROPS.map((k) => (colorless && k === 'roughness' ? '' : r[k]));
  parts.push(colorless ? 'vc' : '');
  for (const k of [colorless ? '' : 'color', 'emissive', 'specular', 'sheenColor']) { const c = r[k] as THREE.Color | undefined; parts.push(c?.isColor ? c.getHexString() : ''); }
  for (const k of ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'aoMap', 'lightMap', 'bumpMap', 'envMap']) parts.push((r[k] as THREE.Texture | null)?.uuid ?? '');
  // material tự viết shader / onBeforeCompile riêng: không gộp theo tham số
  if ((m as THREE.ShaderMaterial).isShaderMaterial || m.onBeforeCompile.toString().length > 30) parts.push(m.uuid);
  return parts.join('|');
}

function geoSig(g: THREE.BufferGeometry, colorless = false): string {
  return Object.keys(g.attributes).filter((k) => !(colorless && k === 'color')).sort().map((k) => {
    const a = g.attributes[k] as THREE.BufferAttribute;
    return `${k}:${a.itemSize}:${a.normalized ? 1 : 0}:${(a as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute ? 'i' : 'f'}`;
  }).join(',');
}

function chainVisible(o: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (!p.visible) return false;
  return true;
}

/** Hình học đã đặt vào hệ toạ độ của root, mọi thuộc tính Float32 không xen kẽ, có index. */
function bakeGeometry(src: THREE.BufferGeometry, m: THREE.Matrix4, color?: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const [k, a0] of Object.entries(src.attributes)) {
    if (color && k === 'color') continue;
    const a = a0 as THREE.BufferAttribute;
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
    g.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize, false));
  }
  const n = src.attributes.position.count;
  if (color) {
    const ca = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ca[i * 3] = color.r; ca[i * 3 + 1] = color.g; ca[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  }
  const idx = src.index ? Array.from(src.index.array) : Array.from({ length: n }, (_, i) => i);
  // drawRange / groups: chỉ lấy phần đang vẽ
  const start = src.drawRange.start, count = Math.min(src.drawRange.count, idx.length - start);
  g.setIndex(idx.slice(start, start + count));
  g.applyMatrix4(m);
  // ma trận lật (scale âm) → đảo chiều tam giác cho mặt trước vẫn đúng
  if (m.determinant() < 0) {
    const ix = g.index!.array as Uint32Array | Uint16Array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  }
  return g;
}

/**
 * Gộp đồ tĩnh trong cây `root` (toạ độ gộp = hệ của root). Gọi sau khi dựng xong + đã đặt camera.
 * Object trong `keep` không bị gộp; phần tĩnh BÊN TRONG nó được gộp riêng theo hệ của nó (nó vẫn di chuyển được).
 */
export function mergeStatic(root: THREE.Object3D, opts: MergeOpts = {}): MergeStats {
  const keep = new Set(opts.keep ?? []);
  const stats: MergeStats = { meshesBefore: 0, meshesAfter: 0, sprites: 0 };
  const scopes: THREE.Object3D[] = [root];
  root.updateMatrixWorld(true);
  while (scopes.length) mergeScope(scopes.pop()!, keep, opts, stats, scopes);
  return stats;
}

function mergeScope(root: THREE.Object3D, keep: Set<THREE.Object3D>, opts: MergeOpts, stats: MergeStats, scopes: THREE.Object3D[]): void {
  const spriteMats = new Map<string, THREE.MeshBasicMaterial>();
  const keepMats = new Set(opts.keepMaterials ?? []);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<string, { mat: THREE.Material; vc: boolean; items: { obj: THREE.Object3D; geo: THREE.BufferGeometry; m: THREE.Matrix4; color?: THREE.Color }[]; cast: boolean; recv: boolean; order: number }>();
  let before = 0;
  const camQ = new THREE.Quaternion();
  if (opts.camera) { opts.camera.updateMatrixWorld(true); opts.camera.getWorldQuaternion(camQ); }
  const rootQ = new THREE.Quaternion();
  root.getWorldQuaternion(rootQ);
  const rootScale = new THREE.Vector3();
  root.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), rootScale);

  const visit = (o: THREE.Object3D): void => {
    if (o !== root && keep.has(o)) { scopes.push(o); if ((o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite) before++; return; }
    for (const c of o.children) visit(c);
    if (o === root) return;
    // userData.name do GLTFLoader gắn (tên gốc) không phải dữ liệu của game
    const hasData = Object.keys(o.userData).some((k) => k !== 'name');
    if ((o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh && !(o as THREE.InstancedMesh).isInstancedMesh) {
      const mesh = o as THREE.Mesh;
      before++;
      const mt = mesh.material;
      if (Array.isArray(mt) || hasData || !mt.visible || !chainVisible(o, root) || mesh.geometry.morphAttributes.position) return;
      if (!mesh.geometry.attributes.position) return;
      // material chỉ khác MÀU → gộp chung, màu nướng vào vertex color
      const vc = !keepMats.has(mt) && COLORLESS_OK.has(mt.type) && !(mt as THREE.MeshStandardMaterial).vertexColors;
      const sig = keepMats.has(mt) ? `id:${mt.uuid}` : matSig(mt, vc);
      const key = [sig, geoSig(mesh.geometry, vc), mesh.castShadow, mesh.receiveShadow, mesh.renderOrder].join('#');
      let g = groups.get(key);
      if (!g) { g = { mat: mt, vc, items: [], cast: mesh.castShadow, recv: mesh.receiveShadow, order: mesh.renderOrder }; groups.set(key, g); }
      g.items.push({ obj: o, geo: mesh.geometry, m: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), color: vc ? (mt as THREE.MeshStandardMaterial).color.clone() : undefined });
      return;
    }
    // sprite tĩnh (cỡ theo khoảng cách) → tấm phẳng quay về camera
    const sp = o as THREE.Sprite;
    if (sp.isSprite) before++;
    if (sp.isSprite && opts.camera && !hasData && sp.material.sizeAttenuation && sp.material.visible && chainVisible(o, root) && !keepMats.has(sp.material) && sp.material.rotation === 0) {
      const sm = sp.material;
      const key = ['sp', sm.map?.uuid ?? '', sm.color.getHexString(), sm.opacity, sm.transparent, sm.blending, sm.depthTest, sm.depthWrite, sm.fog, sm.alphaTest].join('|');
      let bm = spriteMats.get(key);
      if (!bm) {
        bm = new THREE.MeshBasicMaterial({
          map: sm.map, color: sm.color, opacity: sm.opacity, transparent: sm.transparent, blending: sm.blending, depthTest: sm.depthTest,
          depthWrite: sm.depthWrite, fog: sm.fog, alphaTest: sm.alphaTest, side: THREE.DoubleSide, toneMapped: sm.toneMapped,
        });
        spriteMats.set(key, bm);
      }
      // tấm 1×1 lệch theo sprite.center, scale theo sprite.scale, quay theo camera (trong hệ root)
      const pos = new THREE.Vector3(), scl = new THREE.Vector3();
      o.matrixWorld.decompose(pos, new THREE.Quaternion(), scl);
      const plane = new THREE.PlaneGeometry(1, 1);
      plane.translate(0.5 - sp.center.x, 0.5 - sp.center.y, 0);
      const q = rootQ.clone().invert().multiply(camQ);
      const local = pos.clone().applyMatrix4(inv);
      const m = new THREE.Matrix4().compose(local, q, new THREE.Vector3(scl.x / rootScale.x, scl.y / rootScale.y, 1));
      const gkey = `sprite#${key}#${o.renderOrder}`;
      let g = groups.get(gkey);
      if (!g) { g = { mat: bm, vc: false, items: [], cast: false, recv: false, order: o.renderOrder }; groups.set(gkey, g); }
      g.items.push({ obj: o, geo: plane, m });
      stats.sprites++;
    }
  };
  visit(root);

  let after = before;
  for (const g of groups.values()) {
    const isSprite = (g.items[0].obj as THREE.Sprite).isSprite;
    if (g.items.length < 2 && !isSprite) continue;
    const baked = g.items.map((it) => bakeGeometry(it.geo, it.m, it.color));
    const merged = mergeGeometries(baked, false);
    baked.forEach((b) => b.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    let mat = g.mat;
    if (g.vc) {
      const c = g.mat.clone() as THREE.MeshStandardMaterial;
      c.color.set(0xffffff);
      c.vertexColors = true;
      mat = c;
    }
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = g.cast; mesh.receiveShadow = g.recv; mesh.renderOrder = g.order;
    mesh.name = `merged:${g.mat.name || g.mat.type}`;
    root.add(mesh);
    mesh.updateMatrixWorld(true);
    for (const it of g.items) {
      it.obj.removeFromParent();
      if (isSprite) it.geo.dispose();
      else if (!sharedGeometries.has(it.geo)) it.geo.userData.__mergedAway = true;
    }
    after += 1 - g.items.length;
  }
  // huỷ geometry gốc không còn ai dùng
  const stillUsed = new Set<THREE.BufferGeometry>();
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) stillUsed.add(m.geometry); });
  for (const g of groups.values()) for (const it of g.items) if (it.geo.userData.__mergedAway && !stillUsed.has(it.geo)) { it.geo.dispose(); delete it.geo.userData.__mergedAway; }
  stats.meshesBefore += before;
  stats.meshesAfter += after;
}

/**
 * Tìm object THỰC SỰ chuyển động: chụp vị trí/xoay/scale/ẩn-hiện của mọi object trong cây, chạy `step(i)` `frames` lần
 * (ambient giả lập), đánh dấu object đổi; object mới sinh ra trong lúc chạy cũng tính là động. Sau đó trả lại y nguyên
 * transform + tham số material (màu, độ mờ, độ sáng, offset texture) như trước khi chạy.
 */
export function detectMoving(root: THREE.Object3D, step: (i: number) => void, frames: number): { objects: Set<THREE.Object3D>; materials: Set<THREE.Material> } {
  const objs: THREE.Object3D[] = [];
  root.traverse((o) => objs.push(o));
  const known = new Set(objs);
  const snap = objs.map((o) => ({ o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: o.visible }));
  const mats = new Set<THREE.Material>();
  for (const o of objs) { const m = (o as THREE.Mesh).material; if (m) for (const x of Array.isArray(m) ? m : [m]) mats.add(x); }
  const msnap = [...mats].map((m) => {
    const r = m as THREE.MeshStandardMaterial;
    return { m: r, op: r.opacity, vis: r.visible, c: r.color?.clone(), e: r.emissive?.clone(), ei: r.emissiveIntensity, off: r.map?.offset.clone(), rot: (m as THREE.SpriteMaterial).rotation };
  });
  const moving = new Set<THREE.Object3D>();
  const animMats = new Set<THREE.Material>();
  const eps = 1e-5;
  const check = () => {
    for (const x of snap) {
      if (moving.has(x.o)) continue;
      const o = x.o;
      if (o.visible !== x.v || o.position.distanceToSquared(x.p) > eps || Math.abs(o.quaternion.dot(x.q)) < 1 - eps || o.scale.distanceToSquared(x.s) > eps) moving.add(o);
    }
    for (const x of msnap) {
      if (animMats.has(x.m)) continue;
      const m = x.m;
      if (m.opacity !== x.op || m.visible !== x.vis || (x.c && !m.color.equals(x.c)) || (x.e && !m.emissive.equals(x.e)) || (x.ei !== undefined && m.emissiveIntensity !== x.ei)
        || (x.off && m.map && !m.map.offset.equals(x.off)) || (x.rot !== undefined && (m as unknown as THREE.SpriteMaterial).rotation !== x.rot)) animMats.add(m);
    }
  };
  try {
    for (let i = 0; i < frames; i++) { step(i); if (i % 3 === 0) check(); }
    check();
  } finally {
    root.traverse((o) => { if (!known.has(o)) moving.add(o); });
    for (const x of snap) { x.o.position.copy(x.p); x.o.quaternion.copy(x.q); x.o.scale.copy(x.s); x.o.visible = x.v; }
    for (const x of msnap) {
      x.m.opacity = x.op; x.m.visible = x.vis;
      if (x.c) x.m.color.copy(x.c);
      if (x.e) x.m.emissive.copy(x.e);
      if (x.ei !== undefined) x.m.emissiveIntensity = x.ei;
      if (x.off && x.m.map) x.m.map.offset.copy(x.off);
      if (x.rot !== undefined) (x.m as unknown as THREE.SpriteMaterial).rotation = x.rot;
    }
    root.updateMatrixWorld(true);
  }
  return { objects: moving, materials: animMats };
}

/** Chụp giá trị nguyên thuỷ (số, chuỗi, bool) trong object/mảng thường lồng nhau (không đi vào Object3D, material…) → hàm trả lại. */
export function snapshotPlain(value: unknown): () => void {
  const restores: (() => void)[] = [];
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number): void => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 4) return;
    seen.add(v);
    const r = v as Record<string, unknown>;
    if (r.isObject3D || r.isMaterial || r.isTexture || r.isBufferGeometry || ArrayBuffer.isView(v) || v instanceof Map || v instanceof Set) return;
    if (Object.getPrototypeOf(v) !== Object.prototype && !Array.isArray(v)) return;
    const keys = new Set(Object.keys(r));
    const prim = Object.entries(r).filter(([, x]) => x === null || typeof x !== 'object');
    restores.push(() => {
      for (const k of Object.keys(r)) if (!keys.has(k) && !Array.isArray(v)) delete r[k];
      for (const [k, x] of prim) r[k] = x;
    });
    for (const x of Object.values(r)) walk(x, depth + 1);
  };
  walk(value, 0);
  return () => { for (const f of restores) f(); };
}

/** Tắt đổ bóng cho cả cây (đồ trang trí: pass bóng nhân đôi draw call + tam giác). */
export function noCastShadow(root: THREE.Object3D): void {
  root.traverse((o) => { (o as THREE.Mesh).castShadow = false; });
}

// Kho asset dùng chung: tải GLB (cache), clone có xương, sửa material (metalness 0), fit chiều cao, emoji sprite.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export interface Instance { obj: THREE.Object3D; clips: THREE.AnimationClip[] }
export interface InstanceOpts {
  /** chỉ giữ mesh có material tên trong danh sách (model kèm đồ thừa, vd slipper → ['heel']) */
  keep?: string[];
  /** fit chiều cao (m), chân chạm y=0, tâm x/z về 0 */
  height?: number;
  castShadow?: boolean;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
const fixed = new Map<THREE.Material, THREE.Material>();

export function modelUrl(name: string): string {
  return `${import.meta.env.BASE_URL}models/${name}`;
}

/** Tải GLB 1 lần (cache theo tên file trong public/models). */
export function loadGLB(name: string): Promise<GLTF> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(modelUrl(name));
    p.catch(() => cache.delete(name)); // lỗi mạng: lần sau thử lại
    cache.set(name, p);
  }
  return p;
}

/** Tải trước (không chờ). */
export function prefetch(names: string[]): void {
  for (const n of names) void loadGLB(n).catch(() => { /* báo khi dùng thật */ });
}

/** glTF mặc định metalness 1 → đen dưới ánh sáng thường: ép 0, giữ texture. Material clone dùng chung giữa các instance. */
export function fixMaterial(mat: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  if (Array.isArray(mat)) return mat.map((m) => fixMaterial(m) as THREE.Material);
  let out = fixed.get(mat);
  if (!out) {
    const m = mat.clone() as THREE.MeshStandardMaterial;
    if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(0.55, m.roughness ?? 1); }
    if (m.transparent && m.opacity < 0.05) m.opacity = 1; // vài model để alpha 0 sai
    out = m;
    fixed.set(mat, out);
    fixed.set(out, out);
  }
  return out;
}

/** Clone 1 model (SkeletonUtils: giữ xương riêng cho mỗi bản). */
export async function instance(name: string, opts: InstanceOpts = {}): Promise<Instance> {
  const gltf = await loadGLB(name);
  const obj = SkeletonUtils.clone(gltf.scene);
  if (opts.keep) keepMaterials(obj, opts.keep);
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = opts.castShadow ?? true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false; // skinned mesh: bbox bind-pose sai khi tạo dáng
      mesh.material = fixMaterial(mesh.material);
    }
  });
  if (opts.height) fitHeight(obj, opts.height);
  // clip dùng chung giữa các instance → trả bản sao để caller lọc track thoải mái
  return { obj, clips: gltf.animations.map((c) => c.clone()) };
}

export function keepMaterials(obj: THREE.Object3D, keep: string[]): void {
  const drop: THREE.Object3D[] = [];
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (!mats.some((mt) => keep.includes(mt.name))) drop.push(m);
  });
  for (const d of drop) d.removeFromParent();
}

/** Scale về chiều cao, chân chạm y=0, tâm x/z về 0 (theo bbox bind-pose). Trả về hệ số scale. */
export function fitHeight(obj: THREE.Object3D, height: number): number {
  obj.updateMatrixWorld(true);
  obj.traverse((o) => { const sm = o as THREE.SkinnedMesh; if (sm.isSkinnedMesh) sm.computeBoundingBox(); });
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const s = height / Math.max(size.y, 1e-4);
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(obj, true);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box2.min.y;
  return s;
}

/** Bọc obj vào 1 Group có gốc ở đáy-giữa (dễ đặt, xoay). */
export function wrap(obj: THREE.Object3D): THREE.Group {
  const g = new THREE.Group();
  g.add(obj);
  return g;
}

const emojiTex = new Map<string, THREE.CanvasTexture>();
/** Texture emoji Apple (256px), cache theo emoji. */
export function emojiTexture(emoji: string): THREE.CanvasTexture {
  let tex = emojiTex.get(emoji);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 140);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    emojiTex.set(emoji, tex);
  }
  return tex;
}

/** Emoji thành sprite (luôn quay về camera). size = cạnh (m). */
export function emojiSprite(emoji: string, size = 1): THREE.Sprite {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}

/** Giải phóng GPU cho 1 cây object (geometry + material riêng; texture dùng chung KHÔNG huỷ). */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !(m as THREE.SkinnedMesh).isSkinnedMesh) m.geometry.dispose();
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) if (!fixed.has(mat)) mat.dispose();
  });
}

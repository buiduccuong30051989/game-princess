// Tượng băng: phủ material "băng" lên model gốc (vá shader MeshStandardMaterial), tan từ đầu xuống chân
// theo 3 nấc (100% → 66% → 33% băng), vết nứt dày dần, cụm pha lê dưới chân, nổ vỡ khi tan hết.
// Băng là opaque (không transparent) để khỏi lỗi sắp xếp trong suốt với nhân vật có xương;
// cảm giác trong suốt đến từ viền sáng fresnel + ánh lấp lánh + màu nhạt dần theo độ sáng texture.
import * as THREE from 'three';
import type { Magic } from './magic.ts';
import { tween, easeInOutSine, easeOutQuad } from './tween.ts';

interface IceUniforms {
  uIce: { value: number };        // 0..1 tổng lượng băng (fade khi vỡ)
  uLine: { value: number };       // độ cao vạch tan (m, hệ toạ độ space): trên vạch đã tan
  uBand: { value: number };
  uCrack: { value: number };      // 0..1 độ dày vết nứt
  uFlash: { value: number };      // loé sáng khi làm phép
  uTime: { value: number };
  uH: { value: number };          // chiều cao tượng
  uSpaceInv: { value: THREE.Matrix4 };
}

const VERT_HEAD = /* glsl */ `
uniform mat4 uSpaceInv;
varying vec3 vIceP;
`;
const VERT_BODY = /* glsl */ `
#include <project_vertex>
vIceP = (uSpaceInv * modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const FRAG_HEAD = /* glsl */ `
uniform float uIce, uLine, uBand, uCrack, uFlash, uTime, uH;
varying vec3 vIceP;
float iceHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float iceNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(iceHash(i), iceHash(i + vec3(1,0,0)), f.x), mix(iceHash(i + vec3(0,1,0)), iceHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(iceHash(i + vec3(0,0,1)), iceHash(i + vec3(1,0,1)), f.x), mix(iceHash(i + vec3(0,1,1)), iceHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;
const FRAG_MAP = /* glsl */ `
#include <map_fragment>
vec3 iceQ = vIceP / max(uH, 1e-3);
float iceF = uIce * (1.0 - smoothstep(uLine - uBand, uLine + uBand, vIceP.y));
float iceLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
vec3 iceCol = mix(vec3(0.24, 0.55, 0.95), vec3(0.78, 0.93, 1.0), smoothstep(0.05, 1.0, iceLum) * 0.85);
iceCol = mix(iceCol, vec3(0.62, 0.86, 1.0), 0.25 * iceNoise(iceQ * 9.0));
diffuseColor.rgb = mix(diffuseColor.rgb, iceCol, iceF);
`;
const FRAG_ROUGH = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.22, iceF);
`;
const FRAG_EMISSIVE = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 vdir = normalize(vViewPosition);
  float fres = pow(1.0 - clamp(abs(dot(normal, vdir)), 0.0, 1.0), 2.2);
  // vết nứt: gờ của nhiễu (|n - 0.5| nhỏ) ở 2 tần số
  float n1 = abs(iceNoise(iceQ * vec3(7.0, 5.0, 7.0)) - 0.5);
  float n2 = abs(iceNoise(iceQ * 17.0 + 3.1) - 0.5);
  float crack = (1.0 - smoothstep(0.0, 0.008 + 0.012 * uCrack, n1)) * step(0.05, uCrack)
              + (1.0 - smoothstep(0.0, 0.012, n2)) * smoothstep(0.4, 1.0, uCrack) * 0.8;
  // ánh lấp lánh
  float g = iceHash(floor(iceQ * 90.0));
  float glint = step(0.975, g) * (0.5 + 0.5 * sin(uTime * 4.0 + g * 60.0));
  vec3 iceGlow = vec3(0.22, 0.52, 0.95) * 0.28 + fres * vec3(0.55, 0.88, 1.0) * 1.05
               + crack * vec3(0.95, 0.99, 1.0) * 1.3 + glint * vec3(1.0) * 0.9 + uFlash * vec3(0.6, 0.85, 1.0);
  // vạch tan: dải nước sáng
  float band = exp(-pow((vIceP.y - uLine) / max(uBand * 0.6, 1e-3), 2.0)) * uIce * step(0.001, uLine) * step(uLine, uH);
  totalEmissiveRadiance += iceGlow * iceF + band * vec3(0.75, 0.95, 1.0) * 0.9;
}
`;

function patch(src: THREE.Material, u: IceUniforms): THREE.Material {
  let m: THREE.MeshStandardMaterial;
  if ((src as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
    m = src.clone() as THREE.MeshStandardMaterial;
  } else {
    const s = src as THREE.MeshBasicMaterial;
    m = new THREE.MeshStandardMaterial({ map: s.map ?? null, color: s.color ?? new THREE.Color(0xffffff), roughness: 0.8, metalness: 0 });
  }
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace('#include <project_vertex>', VERT_BODY);
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader
      .replace('#include <map_fragment>', FRAG_MAP)
      .replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
      .replace('#include <emissivemap_fragment>', FRAG_EMISSIVE);
  };
  m.customProgramCacheKey = () => 'ice-v1';
  return m;
}

interface Shard { pos: THREE.Vector3; rot: THREE.Euler; size: number; v: THREE.Vector3; spin: THREE.Vector3; life: number; max: number }
interface Crystal { pos: THREE.Vector3; q: THREE.Quaternion; base: THREE.Vector3 }
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

const crystalMat = new THREE.MeshStandardMaterial({
  color: 0xbfeaff, emissive: 0x4fb4ff, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0,
  transparent: true, opacity: 0.82, flatShading: true,
});
const crystalGeo = new THREE.OctahedronGeometry(1, 0);
const shardGeo = new THREE.TetrahedronGeometry(1, 0);

export class Ice {
  /** 0 = đóng băng hoàn toàn, 1..2 = đã tan 1/3, 2/3; 3 = hết (sau shatter) */
  level = 0;
  readonly crystals = new THREE.Group();
  private readonly u: IceUniforms;
  private readonly swaps: { mesh: THREE.Mesh; orig: THREE.Material | THREE.Material[]; ice: THREE.Material | THREE.Material[] }[] = [];
  private shards: Shard[] = [];
  /** iPad: 16 pha lê = 1 InstancedMesh (1 draw call thay vì 16) */
  private crystalMesh!: THREE.InstancedMesh;
  private crystalData: Crystal[] = [];
  /** mảnh vỡ khi nổ băng: 1 InstancedMesh */
  private shardMesh: THREE.InstancedMesh | null = null;
  private applied = false;
  private readonly h: number;
  private foot = 0.2;
  private readonly space: THREE.Object3D;

  /**
   * model = object chứa mesh công chúa; space = group có gốc ở chân tượng (y=0 chân, y=h đỉnh đầu).
   * Cụm pha lê được thêm vào `space`.
   */
  constructor(model: THREE.Object3D, space: THREE.Object3D, height: number) {
    this.space = space;
    this.h = height;
    this.u = {
      uIce: { value: 1 }, uLine: { value: height * 1.08 }, uBand: { value: height * 0.05 }, uCrack: { value: 0 },
      uFlash: { value: 0 }, uTime: { value: 0 }, uH: { value: height }, uSpaceInv: { value: new THREE.Matrix4() },
    };
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const orig = mesh.material;
      const ice = Array.isArray(orig) ? orig.map((m) => patch(m, this.u)) : patch(orig, this.u);
      this.swaps.push({ mesh, orig, ice });
    });
    // bán kính chân tượng (váy phồng → cụm pha lê rộng hơn)
    space.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(space.matrixWorld).invert();
    const box = new THREE.Box3().setFromObject(model, true).applyMatrix4(inv);
    this.foot = Math.max(height * 0.12, Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) * 0.85);
    this.buildCrystals();
    space.add(this.crystals);
    this.apply(true);
  }

  private buildCrystals(): void {
    const h = this.h;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const r = this.foot * (0.8 + Math.random() * 0.35);
      const tall = h * (0.12 + Math.random() * 0.2);
      this.crystalData.push({
        pos: new THREE.Vector3(Math.cos(a) * r, tall * 0.35, Math.sin(a) * r),
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.7, Math.random() * 3, (Math.random() - 0.5) * 0.7)),
        base: new THREE.Vector3(h * 0.045, tall, h * 0.045),
      });
    }
    this.crystalMesh = new THREE.InstancedMesh(crystalGeo, crystalMat, n);
    this.crystalMesh.castShadow = false;
    this.crystals.add(this.crystalMesh);
    this.setCrystalScale(1);
  }

  private setCrystalScale(k: number): void {
    this.crystalData.forEach((c, i) => this.crystalMesh.setMatrixAt(i, _m4.compose(c.pos, c.q, _s.copy(c.base).multiplyScalar(k))));
    this.crystalMesh.instanceMatrix.needsUpdate = true;
    this.crystalMesh.computeBoundingSphere();
  }

  private apply(on: boolean): void {
    if (this.applied === on) return;
    this.applied = on;
    for (const s of this.swaps) s.mesh.material = on ? s.ice : s.orig;
  }

  /** Đặt ngay mức băng (0..3) không hiệu ứng (dùng khi dựng cảnh / debug). */
  setLevel(level: number): void {
    this.level = Math.max(0, Math.min(3, level));
    const m = this.level / 3;
    this.u.uLine.value = this.lineFor(m);
    this.u.uCrack.value = Math.min(1, this.level * 0.45);
    this.setCrystalScale(1 - m * 0.7);
    if (this.level >= 3) this.remove();
  }

  private lineFor(meltFrac: number): number { return this.h * (1.08 - meltFrac * 1.16); }

  /** Tan 1 nấc có hiệu ứng (nứt + vạch tan trượt xuống + pha lê co lại). */
  async meltStep(magic?: Magic, colors: [number, number] = [0x2f9df5, 0xffffff]): Promise<void> {
    if (this.level >= 3) return;
    const from = this.level / 3;
    this.level++;
    const to = this.level / 3;
    const c0 = this.u.uCrack.value, c1 = Math.min(1, this.level * 0.45);
    // loé sáng + nứt trước
    await tween(260, (k) => { this.u.uFlash.value = Math.sin(k * Math.PI) * 0.9; this.u.uCrack.value = c0 + (c1 - c0) * k; });
    const head = this.space.localToWorld(new THREE.Vector3(0, this.lineFor(from), 0));
    if (magic) {
      magic.burst(head, 70, colors[0], 1.8, 0.55, 1.6, -1.4);
      magic.burst(head, 40, colors[1], 1.4, 0.45, 1.4, -1.4);
    }
    await tween(1100, (k) => {
      const m = from + (to - from) * k;
      this.u.uLine.value = this.lineFor(m);
      this.setCrystalScale(1 - m * 0.7);
      if (magic && Math.random() < 0.6) {
        const p = this.space.localToWorld(new THREE.Vector3((Math.random() - 0.5) * this.h * 0.3, this.lineFor(m), (Math.random() - 0.5) * this.h * 0.2));
        magic.emit({ x: p.x, y: p.y, z: p.z, color: 0x7fd0ff, vy: -0.8, gravity: -3, max: 0.9, size: 0.35 });
      }
    }, easeInOutSine);
  }

  /** Vỡ tung: mảnh băng bay ra, hạt nổ, băng biến mất, trả material gốc. */
  async shatter(magic?: Magic): Promise<void> {
    const center = this.space.localToWorld(new THREE.Vector3(0, this.h * 0.5, 0));
    const scale = this.space.getWorldScale(new THREE.Vector3()).x;
    await tween(380, (k) => { this.u.uFlash.value = k * 1.6; this.u.uCrack.value = 1; });
    // mảnh vỡ: pha lê dưới chân + mảnh quanh thân
    const parent = this.space.parent ?? this.space;
    const addShard = (pos: THREE.Vector3, size: number) => {
      const dir = pos.clone().sub(center).setY(0).normalize();
      const v = dir.multiplyScalar((1.2 + Math.random() * 2.2) * scale).add(new THREE.Vector3(0, (1.5 + Math.random() * 2.5) * scale, 0));
      // vận tốc tính trong hệ thế giới; mảnh nằm trong hệ của parent (scale đồng đều) → đổi vận tốc sang hệ parent
      const ps = parent.getWorldScale(new THREE.Vector3()).x || 1;
      const pq = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      this.shards.push({
        pos: parent.worldToLocal(pos.clone()), rot: new THREE.Euler(), size: size / ps, v: v.applyQuaternion(pq).divideScalar(ps),
        spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), life: 0, max: 1.1 + Math.random() * 0.6,
      });
    };
    this.crystals.updateMatrixWorld(true);
    for (const c of this.crystalData) addShard(this.crystals.localToWorld(c.pos.clone()), this.h * 0.05 * scale);
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, y = Math.random() * this.h;
      const r = this.h * (0.12 + Math.random() * 0.12) * (1 - y / this.h * 0.4);
      addShard(this.space.localToWorld(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)), this.h * (0.018 + Math.random() * 0.03) * scale);
    }
    this.shardMesh = new THREE.InstancedMesh(shardGeo, crystalMat, this.shards.length);
    this.shardMesh.frustumCulled = false;
    parent.add(this.shardMesh);
    this.crystals.visible = false;
    if (magic) {
      magic.burst(center, 200, 0x3fa9f5, 3.4 * scale, 0.6, 1.8, -1.6, 0.6 * scale);
      magic.burst(center, 120, 0x9be4ff, 2.6 * scale, 0.55, 1.6, -1.6, 0.6 * scale);
      magic.burst(center, 90, 0xffffff, 2.0 * scale, 0.5, 1.5, -1.6, 0.6 * scale);
      magic.ring(this.space.localToWorld(new THREE.Vector3(0, 0.1, 0)), 0x2f9df5, 120, 3.2 * scale, 0.6);
    }
    this.level = 3;
    await tween(700, (k) => { this.u.uIce.value = 1 - k; this.u.uFlash.value = 1.6 * (1 - k); }, easeOutQuad);
    this.remove();
  }

  /** Bỏ băng ngay (công chúa đã tỉnh). */
  remove(): void {
    this.apply(false);
    this.crystals.visible = false;
    this.level = 3;
  }

  get active(): boolean { return this.applied; }

  update(dt: number): void {
    this.u.uTime.value += dt;
    if (this.applied) {
      this.space.updateWorldMatrix(true, false);
      this.u.uSpaceInv.value.copy(this.space.matrixWorld).invert();
    }
    const sm = this.shardMesh;
    if (sm) {
      let alive = 0;
      this.shards.forEach((s, i) => {
        s.life += dt;
        const k = s.life / s.max;
        if (k >= 1) { sm.setMatrixAt(i, _m4.makeScale(0, 0, 0)); return; }
        alive++;
        s.v.y -= 7 * dt;
        s.pos.addScaledVector(s.v, dt);
        s.rot.x += s.spin.x * dt; s.rot.y += s.spin.y * dt; s.rot.z += s.spin.z * dt;
        if (k > 0.6) s.size *= 0.93;
        sm.setMatrixAt(i, _m4.compose(s.pos, _q.setFromEuler(s.rot), _s.setScalar(s.size)));
      });
      sm.instanceMatrix.needsUpdate = true;
      if (!alive) { sm.removeFromParent(); sm.dispose(); this.shardMesh = null; this.shards = []; }
    }
  }

  dispose(): void {
    for (const s of this.swaps) {
      const mats = Array.isArray(s.ice) ? s.ice : [s.ice];
      mats.forEach((m) => m.dispose());
    }
    this.shardMesh?.removeFromParent();
    this.shardMesh?.dispose();
    this.shardMesh = null;
    this.shards = [];
    this.crystalMesh.dispose();
    this.crystals.removeFromParent();
  }
}

// Bộ tư thế chung cho 12 tượng công chúa (không có animation, đứng chữ T/A).
// Tìm xương theo tên đã chuẩn hoá (bỏ tiền tố "X_Rig:" và hậu tố "_NN") qua bảng alias
// cho 3 nhóm rig: TSMG LoRes (8 con), TSMG HiRes (merida, mulan, aurora), Tiana (xương b_XXXX).
//
// Cách tạo dáng: KHÔNG gõ góc Euler theo trục xương (mỗi rig 1 kiểu trục) mà "ngắm hướng" trong
// hệ toạ độ THÂN NGƯỜI (L = trái nhân vật, U = lên, F = mặt nhìn ra): xoay xương bằng cung ngắn nhất
// từ hướng hiện tại tới hướng mong muốn → tay hạ xuống trong mặt phẳng trán, không xoắn xuyên người.
// Mỗi frame: trả xương về bind pose → áp các lớp (hạ tay, thở, vẫy, nhún chào, dang tay, nhìn) theo trọng số.
import * as THREE from 'three';

export type Joint =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'lUpper' | 'lLower' | 'lHand' | 'rUpper' | 'rLower' | 'rHand'
  | 'lThigh' | 'lShin' | 'rThigh' | 'rShin';

export type RigGroup = 'lores' | 'hires' | 'tiana' | 'unknown';

/** Alias theo thứ tự ưu tiên (tên đã chuẩn hoá). */
const ALIAS: Record<Joint, string[]> = {
  hips: ['spine1_loResSpine1', 'spine1_hiResSpine1', 'b_0002'],
  spine: ['spine1_loResSpine2', 'spine1_hiResSpine3', 'b_000C'],
  chest: ['spine1_loResSpine3', 'spine1_hiResSpine5', 'b_0015'],
  neck: ['head1_neck', 'b_0018'],
  head: ['head1_head', 'b_001B'],
  lUpper: ['leftArm1_LoResUpperArm', 'leftArm1_HiResUpperArm', 'b_003E'],
  lLower: ['leftArm1_LoResLowerArm', 'leftArm1_HiResLowerArm', 'b_0043'],
  lHand: ['leftArm1_LoResHand', 'leftArm1_HiResHand', 'b_0047'],
  rUpper: ['rightArm1_LoResUpperArm', 'rightArm1_HiResUpperArm', 'b_003C'],
  rLower: ['rightArm1_LoResLowerArm', 'rightArm1_HiResLowerArm', 'b_0041'],
  rHand: ['rightArm1_LoResHand', 'rightArm1_HiResHand', 'b_0046'],
  lThigh: ['leftLeg1_LoResUpperLeg', 'leftLeg1_HiResUpperLeg', 'b_0005'],
  lShin: ['leftLeg1_LoResLowerLeg', 'leftLeg1_HiResLowerLeg', 'b_000E'],
  rThigh: ['rightLeg1_LoResUpperLeg', 'rightLeg1_HiResUpperLeg', 'b_0004'],
  rShin: ['rightLeg1_LoResLowerLeg', 'rightLeg1_HiResLowerLeg', 'b_000D'],
};
const REQUIRED: Joint[] = ['chest', 'head', 'lUpper', 'lLower', 'lHand', 'rUpper', 'rLower', 'rHand'];

/**
 * "Ariel_Rig:leftArm1_LoResUpperArm_057" → "leftArm1_LoResUpperArm".
 * GLTFLoader đã bỏ dấu ':' (PropertyBinding.sanitizeNodeName) nên tên thực tế là "Ariel_RigleftArm1_..." → bỏ cả tiền tố "<X>_Rig".
 */
export function normBone(name: string): string {
  return name.replace(/^.*:/, '').replace(/^[A-Za-z0-9]*_[Rr]ig(?=[a-z])/, '').replace(/_\d+$/, '');
}

/** Tinh chỉnh theo từng model (váy phồng cần dang tay rộng hơn...). */
export interface PoseTuning {
  /** độ dang tay khi đứng nghỉ (0 = sát người, 0.3 mặc định, 0.6 = váy rất phồng) */
  armOut?: number;
  /** tay đưa ra trước khi đứng nghỉ (mặc định 0.12) */
  armForward?: number;
}

/** Trọng số các lớp dáng, 0..1. Actor tween các số này. */
export interface PoseWeights {
  rest: number;    // T/A-pose → tay buông tự nhiên
  wave: number;    // tay phải giơ vẫy
  curtsy: number;  // nhún chào
  open: number;    // dang tay (xoay váy, mừng)
  cheer: number;   // hai tay giơ cao mừng rỡ
  breathe: number; // biên độ thở / đung đưa
  lookYaw: number; // quay đầu (rad, + = sang trái nhân vật)
  lookPitch: number; // cúi (+) / ngẩng (-)
}

type V3 = THREE.Vector3;
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();

export class Poser {
  readonly bones: Partial<Record<Joint, THREE.Bone>> = {};
  readonly group: RigGroup;
  readonly ok: boolean;
  /** Góc (rad) quanh trục y để mặt model nhìn về +z trong hệ của root. */
  readonly facingYaw: number;
  readonly w: PoseWeights = { rest: 0, wave: 0, curtsy: 0, open: 0, cheer: 0, breathe: 1, lookYaw: 0, lookPitch: 0 };
  private readonly bind = new Map<THREE.Bone, THREE.Quaternion>();
  private readonly L = new THREE.Vector3(1, 0, 0);
  private readonly U = new THREE.Vector3(0, 1, 0);
  private readonly F = new THREE.Vector3(0, 0, 1);
  private readonly tuning: Required<PoseTuning>;
  private t = Math.random() * 10;
  private readonly root: THREE.Object3D;

  /** root = gốc model (object đã fitHeight). Gọi khi model ở bind pose. */
  constructor(root: THREE.Object3D, tuning: PoseTuning = {}) {
    this.root = root;
    this.tuning = { armOut: tuning.armOut ?? 0.3, armForward: tuning.armForward ?? 0.12 };
    const byName = new Map<string, THREE.Bone>();
    root.traverse((o) => { if ((o as THREE.Bone).isBone) { const n = normBone(o.name); if (!byName.has(n)) byName.set(n, o as THREE.Bone); } });
    for (const j of Object.keys(ALIAS) as Joint[]) {
      for (const a of ALIAS[j]) { const b = byName.get(a); if (b) { this.bones[j] = b; break; } }
    }
    this.group = byName.has('spine1_loResSpine1') ? 'lores' : byName.has('spine1_hiResSpine1') ? 'hires' : byName.has('b_0002') ? 'tiana' : 'unknown';
    this.ok = REQUIRED.every((j) => this.bones[j]);
    if (this.ok) {
      cleanStrayArmWeights(root, [this.bones.lUpper!, this.bones.rUpper!], [this.bones.lHand!, this.bones.rHand!]);
    }
    for (const b of Object.values(this.bones)) if (b) this.bind.set(b, b.quaternion.clone());

    // hệ thân người trong không gian root: L từ vai phải → vai trái, F = L × U
    let yaw = 0;
    if (this.ok) {
      root.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const pl = this.bones.lUpper!.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      const pr = this.bones.rUpper!.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      this.L.copy(pl).sub(pr).setY(0).normalize();
      this.F.crossVectors(this.L, this.U).normalize();
      yaw = Math.atan2(this.F.x, this.F.z);
    }
    this.facingYaw = yaw;
  }

  /** Trục thân người trong hệ thế giới (theo xoay hiện tại của root). */
  private axes(): { L: V3; U: V3; F: V3 } {
    this.root.getWorldQuaternion(_q3);
    return {
      L: _v1.copy(this.L).applyQuaternion(_q3).clone(),
      U: _v2.copy(this.U).applyQuaternion(_q3).clone(),
      F: _v3.copy(this.F).applyQuaternion(_q3).clone(),
    };
  }

  /** Xoay xương quanh 1 trục thế giới. */
  private rotW(bone: THREE.Bone | undefined, axis: V3, angle: number): void {
    if (!bone || !bone.parent || Math.abs(angle) < 1e-5) return;
    bone.parent.getWorldQuaternion(_q1);
    bone.getWorldQuaternion(_q2);
    _q3.setFromAxisAngle(axis, angle).multiply(_q2);
    bone.quaternion.copy(_q1.invert().multiply(_q3));
    bone.updateMatrixWorld(true);
  }

  /** Xoay xương để hướng (xương → xương con `end`) trùng `dirFn(hướng hiện tại)`. */
  private aim(bone: THREE.Bone | undefined, end: THREE.Bone | undefined, dirFn: (cur: V3) => V3): void {
    if (!bone || !end || !bone.parent) return;
    end.updateWorldMatrix(true, false);
    const p0 = bone.getWorldPosition(new THREE.Vector3());
    const cur = end.getWorldPosition(new THREE.Vector3()).sub(p0).normalize();
    const want = dirFn(cur.clone()).normalize();
    if (cur.dot(want) > 0.99999) return;
    const delta = new THREE.Quaternion().setFromUnitVectors(cur, want);
    bone.parent.getWorldQuaternion(_q1);
    bone.getWorldQuaternion(_q2);
    const nw = delta.multiply(_q2);
    bone.quaternion.copy(_q1.invert().multiply(nw));
    bone.updateMatrixWorld(true);
  }

  update(dt: number): void {
    if (!this.ok) return;
    this.t += dt;
    const w = this.w, t = this.t;
    for (const [b, q] of this.bind) b.quaternion.copy(q);
    this.root.updateMatrixWorld(true);
    const { L, U, F } = this.axes();
    const B = this.bones;
    const br = w.breathe;

    // thân: đung đưa + thở + nhún chào
    this.rotW(B.hips, F, Math.sin(t * 0.9) * 0.018 * br);
    this.rotW(B.spine, L, Math.sin(t * 1.8) * 0.012 * br + w.curtsy * 0.12 - w.cheer * 0.05);
    this.rotW(B.chest, L, Math.sin(t * 1.8 + 0.6) * 0.022 * br + w.curtsy * 0.16 - w.cheer * 0.06);
    // tay
    const out = this.tuning.armOut, fwd = this.tuning.armForward;
    for (const side of [1, -1] as const) {
      const up = side === 1 ? B.lUpper : B.rUpper;
      const lo = side === 1 ? B.lLower : B.rLower;
      const hand = side === 1 ? B.lHand : B.rHand;
      const S = L.clone().multiplyScalar(side); // hướng ra ngoài của tay này
      const dir = (a: number, u: number, f: number) => S.clone().multiplyScalar(a).addScaledVector(U, u).addScaledVector(F, f).normalize();
      const breatheArm = Math.sin(t * 1.8 + side) * 0.02 * br;
      const waveK = side === -1 ? w.wave : 0;
      const osc = Math.sin(t * 8.5);
      const upperTargets: [V3, number][] = [
        [dir(out + breatheArm, -1, fwd), w.rest],
        [dir(0.42, -1, 0.3), w.curtsy],
        [dir(0.8, -0.45, 0.35), w.open],
        [dir(0.45, 1, 0.25), w.cheer],
        [dir(0.95, 0.5, 0.3), waveK],
      ];
      const lowerTargets: [V3, number][] = [
        [dir(out * 0.6, -1, fwd + 0.35), w.rest],
        [dir(0.5, -0.85, 0.55), w.curtsy],
        [dir(0.65, -0.05, 0.7), w.open],
        [dir(0.3, 1, 0.1), w.cheer],
        [dir(0.2 + osc * 0.4, 1, 0.3), waveK],
      ];
      const blend = (targets: [V3, number][]) => (cur: V3) => {
        const d = cur.clone();
        for (const [tg, k] of targets) if (k > 0) d.lerp(tg, Math.min(1, k)).normalize();
        return d;
      };
      this.aim(up, lo, blend(upperTargets));
      this.aim(lo, hand, blend(lowerTargets));
    }

    // đầu: nhìn + nghiêng nhẹ + cúi chào
    this.rotW(B.neck, U, w.lookYaw * 0.4);
    this.rotW(B.head, U, w.lookYaw * 0.6);
    this.rotW(B.head, L, w.lookPitch + w.curtsy * 0.28 - w.cheer * 0.15);
    this.rotW(B.head, F, Math.sin(t * 0.7) * 0.05 * br + w.wave * 0.1);
  }

  /** Vị trí thế giới 1 xương (vd đầu để bắn hạt). */
  jointWorld(j: Joint, out = new THREE.Vector3()): THREE.Vector3 | null {
    const b = this.bones[j];
    return b ? b.getWorldPosition(out) : null;
  }
}

/**
 * Vài model có đỉnh ở xa (mi mắt, tóc) lỡ bị gán trọng số vào xương tay: đứng chữ T thì không lộ,
 * hạ tay xuống thì kéo thành sợi dài. Gỡ trọng số tay khỏi đỉnh nằm xa xương đó (> 0.75 × dài tay), chuẩn hoá lại.
 * Geometry dùng chung giữa các bản clone nên chỉ làm 1 lần (đánh dấu userData).
 */
function cleanStrayArmWeights(root: THREE.Object3D, uppers: THREE.Bone[], hands: THREE.Bone[]): void {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh || sm.geometry.userData.armClean) return;
    sm.geometry.userData.armClean = true;
    const sk = sm.skeleton;
    const pos = sm.geometry.getAttribute('position');
    const si = sm.geometry.getAttribute('skinIndex');
    const sw = sm.geometry.getAttribute('skinWeight');
    if (!pos || !si || !sw) return;
    // vị trí bind của xương trong hệ "bind space" của mesh: inverse(boneInverse)
    const bindPos = sk.boneInverses.map((bi) => new THREE.Vector3().setFromMatrixPosition(bi.clone().invert()));
    const armBones = new Map<number, number>(); // index xương tay → dài tay
    uppers.forEach((up, k) => {
      const ui = sk.bones.indexOf(up), hi = sk.bones.indexOf(hands[k]);
      if (ui < 0 || hi < 0) return;
      const len = bindPos[ui].distanceTo(bindPos[hi]);
      up.traverse((b) => { const i = sk.bones.indexOf(b as THREE.Bone); if (i >= 0) armBones.set(i, len); });
    });
    const v = new THREE.Vector3();
    let fixedCount = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(sm.bindMatrix);
      let changed = false;
      const w = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)];
      const idx = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)];
      for (let k = 0; k < 4; k++) {
        const len = armBones.get(idx[k]);
        if (w[k] > 0 && len !== undefined && v.distanceTo(bindPos[idx[k]]) > len * 0.75) { w[k] = 0; changed = true; }
      }
      if (!changed) continue;
      const sum = w[0] + w[1] + w[2] + w[3];
      if (sum <= 1e-5) {
        // đỉnh chỉ theo tay (vd 1 sợi mi gán nhầm vào ngón cái): gán hẳn cho xương gần nhất không thuộc tay
        let best = -1, bd = Infinity;
        bindPos.forEach((bp, bi) => { if (armBones.has(bi)) return; const d = bp.distanceTo(v); if (d < bd) { bd = d; best = bi; } });
        if (best < 0) continue;
        si.setXYZW(i, best, 0, 0, 0);
        sw.setXYZW(i, 1, 0, 0, 0);
        si.needsUpdate = true;
      } else {
        sw.setXYZW(i, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
      }
      fixedCount++;
    }
    if (fixedCount) { sw.needsUpdate = true; if (import.meta.env?.DEV) console.info('[pose] gỡ trọng số tay lạc', sm.name, fixedCount); }
  });
}


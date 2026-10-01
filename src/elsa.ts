// Elsa dẫn đường: model elsa_anim.glb (Frozen Free Fall, 20 clip) – nhân vật DUY NHẤT có animation thật.
// Rig game có root motion + gốc lệch tâm: BẮT BUỘC bỏ mọi track '.position' và neo xương hông về tâm mỗi frame.
// Không có clip đi bộ / vẫy tay thật (level_wave_placeholder = y hệt idle) nên:
//  - LƯỚT: dời root theo frame trên vệt băng (hạt + bông tuyết in trên sàn), nghiêng người theo hướng lướt, nhấp nhô nhẹ.
//  - VẪY: xoay cánh tay phải CỘNG THÊM lên clip idle (ngắm hướng trong hệ thân người như pose.ts), trọng số mượt 0..1.
//  - XOAY: quay vòng + bung bông tuyết.
import * as THREE from 'three';
import { instance, disposeSkeletons, emojiTexture } from './core/assets.ts';
import type { Magic } from './magic.ts';
import { tween, wait, easeInOutSine } from './tween.ts';

export const ELSA_MODEL = 'elsa_anim.glb';
// vector/quaternion tạm dùng lại (update chạy mỗi frame: không cấp phát)
const _hw = new THREE.Vector3();
const _target = new THREE.Vector3();
const _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _cur = new THREE.Vector3(), _want = new THREE.Vector3();
const _F = new THREE.Vector3(), _U = new THREE.Vector3(0, 1, 0), _R = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qd = new THREE.Quaternion(), _qt = new THREE.Quaternion();
const TRAIL_COLORS = [0xffffff, 0x8fd3ff, 0x4fb3ff, 0xb9e6ff];

/** Tên clip dùng trong game (xem danh sách đủ 20 clip ở README). */
export const ELSA_CLIPS = {
  idle: 'level_idle_01',
  idle2: 'level_idle_02_placeholder',
  hello: 'level_win_01',                    // giơ 2 tay mừng
  spell: 'level_powerup_triggered',         // làm phép (mỗi câu đúng)
  think: 'level_thinking_01',               // bé chọn sai
  worriedIn: 'level_idle_to_fail',          // lo lắng (vào) – nối thẳng sang worriedOut
  worriedOut: 'level_fail_to_idle',
  win: 'level_win_01',
  celebrate: 'level_celebration_01_placeholder',
  great: 'level_greatmove_01',
  best: 'level_bestmove_01',
} as const;
export type ElsaClip = keyof typeof ELSA_CLIPS;

interface Glide {
  fx: number; fz: number; tx: number; tz: number;
  t: number; dur: number; trailAcc: number;
  done: (ok: boolean) => void;
}

/** Bông tuyết in trên sàn sau lưng Elsa khi lướt (pool cố định, mờ dần). */
interface Decal { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number }
const DECALS = 22;
const DECAL_LIFE = 2.4;

export class ElsaGuide {
  /** đặt vị trí/hướng bằng root */
  readonly root = new THREE.Group();
  private readonly turn = new THREE.Group(); // quay mặt về mục tiêu (+ nghiêng khi lướt)
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private idle: THREE.AnimationAction | null = null;
  private current: THREE.AnimationAction | null = null;
  private anchor: { bone: THREE.Object3D; restY: number } | null = null;
  private hand: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private playToken = 0;
  readonly height: number;
  /** hạt phép chung (vệt băng khi lướt, bông tuyết khi xoay). null = không có hạt */
  magic: Magic | null = null;
  /** độ cao mặt sàn tại (x, z) – sảnh có sân khấu cao; mặc định phẳng y = 0 */
  groundAt: (x: number, z: number) => number = () => 0;

  // quay mặt: yaw (trong hệ root) đuổi theo yawTarget mỗi frame → mọi lần quay đều mượt
  private yaw = 0;
  private yawTarget = 0;
  private spin = 0;
  private lean = 0;
  private glide: Glide | null = null;
  private groundY = 0;
  private bobT = Math.random() * 10;
  // vẫy tay thủ công
  private arm: { sh: THREE.Bone; el: THREE.Bone; wr: THREE.Bone } | null = null;
  private readonly rightLocal = new THREE.Vector3(-1, 0, 0); // hướng tay phải nhân vật trong hệ turn
  private waveW = 0;
  private waveTarget = 0;
  private waveT = 0;
  private waveToken = 0;
  private decals: Decal[] = [];
  private decalNext = 0;
  private decalGroup: THREE.Group | null = null;

  constructor(height = 1.9) {
    this.height = height;
    this.turn.rotation.order = 'YXZ'; // quay (y) trước, nghiêng (x) theo hướng mặt
    this.root.add(this.turn);
  }

  async load(): Promise<this> {
    const { obj, clips } = await instance(ELSA_MODEL, { height: this.height });
    for (const c of clips) c.tracks = c.tracks.filter((t) => !t.name.endsWith('.position'));
    obj.rotation.y = Math.PI; // model nhìn về -z
    this.turn.add(obj);
    this.model = obj;
    this.clips = clips;
    obj.updateMatrixWorld(true);
    const bones: THREE.Bone[] = [];
    obj.traverse((o) => { if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone); });
    const bone = (re: RegExp) => bones.find((b) => re.test(b.name));
    this.hand = bone(/r_Arm_Wrist/i) ?? null;
    this.head = bone(/Head_Top/i) ?? null;
    this.root.updateMatrixWorld(true);
    const hips = bone(/ROOTSHJnt|hips|pelvis/i);
    if (hips) this.anchor = { bone: hips, restY: this.turn.worldToLocal(hips.getWorldPosition(new THREE.Vector3())).y };
    const sh = bone(/r_Arm_Shoulder/i), el = bone(/r_Arm_Elbow/i), wr = bone(/r_Arm_Wrist/i), lsh = bone(/l_Arm_Shoulder/i);
    if (sh && el && wr) {
      this.arm = { sh, el, wr };
      if (lsh) {
        const r = this.turn.worldToLocal(sh.getWorldPosition(new THREE.Vector3()));
        const l = this.turn.worldToLocal(lsh.getWorldPosition(new THREE.Vector3()));
        this.rightLocal.copy(r).sub(l).setY(0).normalize();
      }
    }
    this.mixer = new THREE.AnimationMixer(obj);
    const idleClip = this.clip('idle');
    if (idleClip) { this.idle = this.mixer.clipAction(idleClip); this.idle.play(); this.current = this.idle; }
    this.mixer.update(Math.random() * 2);
    return this;
  }

  get loaded(): boolean { return this.mixer !== null; }

  private clip(name: ElsaClip): THREE.AnimationClip | undefined {
    return this.clips.find((c) => c.name === ELSA_CLIPS[name]);
  }

  /** Phát 1 clip 1 lần rồi về idle. Resolve khi xong (hoặc khi clip khác chen vào). */
  play(name: ElsaClip, fade = 0.25): Promise<void> {
    return this.playSeq([name], fade);
  }

  /** Lo lắng (bé chọn sai): chùng vai buồn rồi tươi lại, 2 clip nối thẳng nhau. */
  worried(): Promise<void> {
    return this.playSeq(['worriedIn', 'worriedOut'], 0.3);
  }

  /** Phát chuỗi clip nối nhau (crossfade thẳng clip → clip), hết chuỗi về idle. */
  private async playSeq(names: ElsaClip[], fade: number): Promise<void> {
    if (!this.mixer) return;
    const my = ++this.playToken;
    for (let i = 0; i < names.length; i++) {
      const clip = this.clip(names[i]);
      if (!clip) continue;
      await this.playOne(clip, fade, my, i === names.length - 1);
      if (my !== this.playToken) return;
    }
  }

  private playOne(clip: THREE.AnimationClip, fade: number, my: number, toIdle: boolean): Promise<void> {
    const mixer = this.mixer!;
    const a = mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.reset().play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    this.current = a;
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        mixer.removeEventListener('finished', onDone);
        clearTimeout(timer);
        resolve();
      };
      const onDone = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== a) return;
        if (toIdle && my === this.playToken && this.idle) {
          this.idle.reset().play();
          a.crossFadeTo(this.idle, 0.35, false);
          this.current = this.idle;
        }
        finish();
      };
      mixer.addEventListener('finished', onDone);
      // clip khác chen ngang: vẫn resolve sau thời lượng clip
      const timer = setTimeout(finish, clip.duration * 1000 + 600);
    });
  }

  /** Yaw (trong hệ root) để nhìn về 1 điểm thế giới; null = hướng gốc (+z của root). */
  private yawTo(target: THREE.Vector3 | null): number {
    if (!target) return 0;
    const p = this.root.worldToLocal(_p0.copy(target));
    return Math.atan2(p.x, p.z);
  }
  private setYawTarget(y: number): void {
    // quay theo cung ngắn nhất
    this.yawTarget = this.yaw + Math.atan2(Math.sin(y - this.yaw), Math.cos(y - this.yaw));
  }

  /** Quay mặt về 1 điểm thế giới; null = về hướng gốc (+z của root). Quay mượt trong update(). */
  async face(target: THREE.Vector3 | null, ms = 450): Promise<void> {
    this.setYawTarget(this.yawTo(target));
    await wait(ms);
  }

  /** Lướt trên mặt băng tới (x, z) thế giới. Resolve true khi tới nơi, false nếu bị stop() / lệnh lướt khác. */
  glideTo(x: number, z: number, speed = 1.25): Promise<boolean> {
    this.stopGlide();
    const p = this.root.position;
    const dist = Math.hypot(x - p.x, z - p.z);
    if (dist < 0.04) return Promise.resolve(true);
    this.groundY = p.y;
    return new Promise((done) => {
      this.glide = { fx: p.x, fz: p.z, tx: x, tz: z, t: 0, dur: Math.max(0.7, dist / speed + 0.35), trailAcc: 0, done };
    });
  }

  get gliding(): boolean { return this.glide !== null; }

  private stopGlide(): void {
    const g = this.glide;
    if (!g) return;
    this.glide = null;
    // dừng giữa đường: hạ về mặt sàn (bỏ phần lơ lửng)
    this.root.position.y = this.groundAt(this.root.position.x, this.root.position.z);
    g.done(false);
  }

  /** Vẫy tay phải (thủ công, cộng lên clip đang chạy). */
  async wave(seconds = 1.8): Promise<void> {
    const my = ++this.waveToken;
    this.waveTarget = 1;
    await wait(seconds * 1000);
    if (my !== this.waveToken) return;
    this.waveTarget = 0;
    await wait(350);
  }

  /** Xoay 1 vòng, bung bông tuyết. */
  async spinOnce(ms = 1200): Promise<void> {
    const m = this.magic;
    if (m) {
      const c = this.root.localToWorld(_p1.set(0, this.height * 0.55, 0));
      m.ring(c, 0x4fb3ff, 70, 2.6, 0.32);
      m.burst(c, 60, 0xffffff, 2.2, 0.36, 1.3, -1.2);
      m.burst(c, 40, 0x8b5cf6, 1.8, 0.32, 1.2, -1.2);
    }
    await tween(ms, (k) => { this.spin = k * Math.PI * 2; }, easeInOutSine);
    this.spin = 0;
  }

  /** Dừng mọi hoạt cảnh tự do (lướt, vẫy) – bé vừa chạm / nghi lễ bắt đầu. Clip đang chạy giữ nguyên. */
  stop(): void {
    this.stopGlide();
    this.waveToken++;
    this.waveTarget = 0;
  }

  handWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.hand ? this.hand.getWorldPosition(out) : this.root.localToWorld(out.set(0.3, this.height * 0.6, 0.2));
  }
  headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.head ? this.head.getWorldPosition(out) : this.root.localToWorld(out.set(0, this.height * 0.9, 0));
  }

  update(dt: number): void {
    if (!this.mixer || !this.model) return;
    this.bobT += dt;
    this.updateGlide(dt);
    // quay mượt (≈ 0.4 s) + nghiêng người theo hướng lướt
    this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-dt * 7));
    this.turn.rotation.y = this.yaw + this.spin;
    const leanTarget = this.glide ? 0.1 * Math.sin(Math.min(1, this.glide.t / this.glide.dur) * Math.PI) : 0;
    this.lean += (leanTarget - this.lean) * (1 - Math.exp(-dt * 5));
    this.turn.rotation.x = this.lean;
    this.updateDecals(dt);

    this.mixer.update(dt);
    if (this.anchor) {
      // neo hông: kéo hông về trục giữa (x/z) và độ cao nghỉ
      // chỉ cập nhật chuỗi cha của xương hông (không cả cây model); vector dùng lại, không cấp phát mỗi frame
      this.anchor.bone.updateWorldMatrix(true, false);
      const hw = this.anchor.bone.getWorldPosition(_hw);
      const target = this.turn.localToWorld(_target.set(0, this.anchor.restY, 0));
      const parent = this.model.parent!;
      parent.worldToLocal(target);
      parent.worldToLocal(hw);
      this.model.position.add(target.sub(hw));
    }
    this.waveW += (this.waveTarget - this.waveW) * (1 - Math.exp(-dt * 6));
    if (this.waveW > 0.003) { this.waveT += dt; this.applyWave(); } else this.waveT = 0;
  }

  private updateGlide(dt: number): void {
    const g = this.glide;
    if (!g) return;
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    const e = easeInOutSine(k);
    const p = this.root.position;
    const px = p.x, pz = p.z;
    p.x = g.fx + (g.tx - g.fx) * e;
    p.z = g.fz + (g.tz - g.fz) * e;
    // sàn cao thấp (sân khấu) → hạ/nâng mượt; lơ lửng nhẹ giữa đường + nhấp nhô
    const gy = this.groundAt(p.x, p.z);
    this.groundY += (gy - this.groundY) * (1 - Math.exp(-dt * 7));
    const s = Math.sin(k * Math.PI);
    p.y = this.groundY + s * 0.07 + Math.sin(this.bobT * 7) * 0.018 * s;
    // nhìn theo hướng lướt (gần tới đích thì thôi, để lệnh face sau đó quyết)
    if (k < 0.85) this.setYawTarget(Math.atan2(g.tx - g.fx, g.tz - g.fz) - this.root.rotation.y);
    // vệt băng: hạt dưới gấu váy + bông tuyết in trên sàn mỗi ~0.3 m
    const m = this.magic;
    if (m) {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2, r = 0.15 + Math.random() * 0.3;
        m.emit({
          x: p.x + Math.cos(a) * r, y: gy + 0.05 + Math.random() * 0.25, z: p.z + Math.sin(a) * r,
          color: TRAIL_COLORS[(Math.random() * TRAIL_COLORS.length) | 0],
          vx: (Math.random() - 0.5) * 0.3, vy: 0.25 + Math.random() * 0.45, vz: (Math.random() - 0.5) * 0.3,
          max: 0.9 + Math.random() * 0.7, size: 0.16 + Math.random() * 0.18, drag: 0.97,
        });
      }
    }
    g.trailAcc += Math.hypot(p.x - px, p.z - pz);
    if (g.trailAcc > 0.3) { g.trailAcc = 0; this.dropDecal(p.x, gy, p.z); }
    if (k >= 1) { this.glide = null; g.done(true); }
  }

  private dropDecal(x: number, y: number, z: number): void {
    const parent = this.root.parent;
    if (!parent) return;
    if (!this.decalGroup) {
      // tạo pool 1 lần: 1 geometry chung, mỗi bông 1 material (độ mờ riêng)
      this.decalGroup = new THREE.Group();
      const geo = new THREE.PlaneGeometry(0.42, 0.42);
      geo.rotateX(-Math.PI / 2);
      const tex = emojiTexture('❄️');
      for (let i = 0; i < DECALS; i++) {
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.renderOrder = 1;
        this.decalGroup.add(mesh);
        this.decals.push({ mesh, mat, life: 0 });
      }
      parent.add(this.decalGroup);
    }
    const d = this.decals[this.decalNext];
    this.decalNext = (this.decalNext + 1) % DECALS;
    d.life = DECAL_LIFE;
    d.mesh.visible = true;
    d.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.012, z + (Math.random() - 0.5) * 0.15);
    d.mesh.rotation.y = Math.random() * Math.PI;
    d.mesh.scale.setScalar(0.7 + Math.random() * 0.5);
  }

  private updateDecals(dt: number): void {
    for (const d of this.decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.mat.opacity = Math.max(0, Math.min(1, (d.life / DECAL_LIFE) * 1.6)) * 0.85;
      if (d.life <= 0) d.mesh.visible = false;
    }
  }

  /**
   * Vẫy tay: sau khi clip đã đặt xương, ngắm cánh tay trên ra ngoài + lên, cẳng tay dựng lên và lắc qua lại.
   * Hướng tính trong hệ thân người (F = mặt, U = lên, R = bên phải) → không phụ thuộc trục riêng của xương.
   */
  private applyWave(): void {
    if (!this.arm) return;
    const { sh, el, wr } = this.arm;
    const w = Math.min(1, this.waveW);
    this.turn.getWorldQuaternion(_qt);
    _F.set(0, 0, 1).applyQuaternion(_qt);
    _R.copy(this.rightLocal).applyQuaternion(_qt);
    // cánh tay trên: ngang vai chếch lên, hơi ra trước
    _want.copy(_R).multiplyScalar(0.8).addScaledVector(_U, 0.55).addScaledVector(_F, 0.4);
    this.aimBone(sh, el, _want, w);
    // cẳng tay: dựng đứng, lắc qua lại
    const osc = Math.sin(this.waveT * 9);
    _want.copy(_R).multiplyScalar(0.12 + osc * 0.5).addScaledVector(_U, 1).addScaledVector(_F, 0.3);
    this.aimBone(el, wr, _want, w);
  }

  /** Xoay `bone` để hướng (bone → end) tiến về `want` theo trọng số k (cung ngắn nhất, hệ thế giới). */
  private aimBone(bone: THREE.Bone, end: THREE.Object3D, want: THREE.Vector3, k: number): void {
    if (!bone.parent) return;
    bone.getWorldPosition(_p0);
    end.getWorldPosition(_p1);
    _cur.copy(_p1).sub(_p0).normalize();
    // đích = cur → want theo k
    const tgt = _p1.copy(want).normalize().lerp(_cur, 1 - k).normalize();
    if (_cur.dot(tgt) > 0.99999) return;
    _qd.setFromUnitVectors(_cur, tgt);
    bone.parent.getWorldQuaternion(_q1);
    bone.getWorldQuaternion(_q2);
    _q2.premultiply(_qd);
    bone.quaternion.copy(_q1.invert().multiply(_q2));
    bone.updateWorldMatrix(false, true);
  }

  dispose(): void {
    this.stop();
    this.mixer?.stopAllAction();
    if (this.mixer && this.model) this.mixer.uncacheRoot(this.model);
    disposeSkeletons(this.root);
    if (this.decalGroup) {
      this.decalGroup.removeFromParent();
      for (const d of this.decals) d.mat.dispose(); // texture emoji dùng chung: không huỷ
      this.decals[0]?.mesh.geometry.dispose();
      this.decals = [];
      this.decalGroup = null;
    }
    this.root.removeFromParent();
  }
}

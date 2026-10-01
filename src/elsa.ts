// Elsa dẫn đường: model elsa_anim.glb (Frozen Free Fall, 20 clip) – nhân vật DUY NHẤT có animation thật.
// Rig game có root motion + gốc lệch tâm: BẮT BUỘC bỏ mọi track '.position' và neo xương hông về tâm mỗi frame.
import * as THREE from 'three';
import { instance, disposeSkeletons } from './core/assets.ts';
import { tween, easeInOutSine } from './tween.ts';

export const ELSA_MODEL = 'elsa_anim.glb';
const _hw = new THREE.Vector3();
const _target = new THREE.Vector3();

/** Tên clip dùng trong game (xem danh sách đủ 20 clip ở README). */
export const ELSA_CLIPS = {
  idle: 'level_idle_01',
  idle2: 'level_idle_02_placeholder',
  hello: 'level_win_01',                    // giơ tay chào khi vào phòng
  spell: 'level_powerup_triggered',         // làm phép (mỗi câu đúng)
  think: 'level_thinking_01',               // bé chọn sai
  win: 'level_win_01',
  celebrate: 'level_celebration_01_placeholder',
  great: 'level_greatmove_01',
  best: 'level_bestmove_01',
} as const;
export type ElsaClip = keyof typeof ELSA_CLIPS;

export class ElsaGuide {
  /** đặt vị trí/hướng bằng root */
  readonly root = new THREE.Group();
  private readonly turn = new THREE.Group(); // quay mặt về mục tiêu
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

  constructor(height = 1.9) {
    this.height = height;
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
    const bones: THREE.Object3D[] = [];
    obj.traverse((o) => { if ((o as THREE.Bone).isBone) bones.push(o); });
    this.hand = bones.find((b) => /r_Arm_Wrist/i.test(b.name)) ?? null;
    this.head = bones.find((b) => /Head_Top/i.test(b.name)) ?? null;
    this.root.updateMatrixWorld(true);
    const hips = bones.find((b) => /ROOTSHJnt|hips|pelvis/i.test(b.name));
    if (hips) this.anchor = { bone: hips, restY: this.turn.worldToLocal(hips.getWorldPosition(new THREE.Vector3())).y };
    this.mixer = new THREE.AnimationMixer(obj);
    const idleClip = this.clip('idle');
    if (idleClip) { this.idle = this.mixer.clipAction(idleClip); this.idle.play(); this.current = this.idle; }
    this.mixer.update(Math.random() * 2);
    return this;
  }

  private clip(name: ElsaClip): THREE.AnimationClip | undefined {
    return this.clips.find((c) => c.name === ELSA_CLIPS[name]);
  }

  /** Phát 1 clip 1 lần rồi về idle. Resolve khi xong (hoặc khi clip khác chen vào). */
  play(name: ElsaClip, fade = 0.25): Promise<void> {
    const clip = this.clip(name);
    if (!clip || !this.mixer) return Promise.resolve();
    const my = ++this.playToken;
    const a = this.mixer.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.reset().play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    this.current = a;
    return new Promise((resolve) => {
      const mixer = this.mixer!;
      const onDone = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== a) return;
        mixer.removeEventListener('finished', onDone);
        if (my === this.playToken && this.idle) {
          this.idle.reset().play();
          a.crossFadeTo(this.idle, 0.35, false);
          this.current = this.idle;
        }
        resolve();
      };
      mixer.addEventListener('finished', onDone);
      // clip khác chen ngang: vẫn resolve sau thời lượng clip
      setTimeout(() => { mixer.removeEventListener('finished', onDone); resolve(); }, clip.duration * 1000 + 600);
    });
  }

  /** Quay mặt (yaw) về 1 điểm thế giới; null = về hướng camera ban đầu (+z của root). */
  async face(target: THREE.Vector3 | null, ms = 450): Promise<void> {
    let yaw = 0;
    if (target) {
      const p = this.root.worldToLocal(target.clone());
      yaw = Math.atan2(p.x, p.z);
    }
    const from = this.turn.rotation.y;
    await tween(ms, (k) => { this.turn.rotation.y = from + (yaw - from) * k; }, easeInOutSine);
  }

  handWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.hand ? this.hand.getWorldPosition(out) : this.root.localToWorld(out.set(0.3, this.height * 0.6, 0.2));
  }
  headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.head ? this.head.getWorldPosition(out) : this.root.localToWorld(out.set(0, this.height * 0.9, 0));
  }

  update(dt: number): void {
    if (!this.mixer || !this.model) return;
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
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    if (this.mixer && this.model) this.mixer.uncacheRoot(this.model);
    disposeSkeletons(this.root);
    this.root.removeFromParent();
  }
}

// Công chúa = model tượng + Poser (tạo dáng theo xương) + Ice (đóng băng). Dùng ở cả Đại sảnh lẫn phòng.
import * as THREE from 'three';
import { instance, fitHeight, disposeSkeletons } from './core/assets.ts';
import { Poser, normBone, type PoseTuning, type PoseWeights } from './pose.ts';
import { Ice } from './ice.ts';
import type { Magic } from './magic.ts';
import { tween, wait, easeInOutSine, easeOutBack } from './tween.ts';

export interface PrincessSpec {
  model: string;          // file trong public/models (vd 'p_rapunzel.glb')
  height?: number;        // m, mặc định 1.75
  tuning?: PoseTuning;
  /** cộng thêm vào góc tự quay mặt (rad) nếu model nhìn lệch */
  yawOffset?: number;
  /** bỏ các mesh có material tên này (đồ thừa kèm model: kiếm, đèn lồng lơ lửng...) */
  hide?: string[];
  /** thu nhỏ về 0 các xương này (đồ thừa dính vào mesh có xương riêng, vd cung/tên Merida) */
  hideBones?: string[];
}

export class PrincessActor {
  /** đặt vị trí/hướng actor bằng root (chân ở y=0) */
  readonly root = new THREE.Group();
  /** lớp trong: xoay vòng, nhún, nảy */
  readonly body = new THREE.Group();
  model: THREE.Object3D | null = null;
  poser: Poser | null = null;
  ice: Ice | null = null;
  awake = false;
  /** tự làm động tác lặt vặt khi đã tỉnh (nhìn quanh, thỉnh thoảng vẫy) */
  idleLife = true;
  readonly height: number;
  /** lệch pha từng công chúa: không bao giờ cả hàng cùng làm 1 động tác */
  private lifeTimer = 2 + Math.random() * 12;
  private lastLife = -1;
  private busy = 0;
  private bobT = Math.random() * 10;
  private readonly spec: PrincessSpec;

  constructor(spec: PrincessSpec) {
    this.spec = spec;
    this.height = spec.height ?? 1.75;
    this.root.add(this.body);
  }

  /** Tải model. frozen = true → phủ băng ở mức iceLevel (0..2). */
  async load(frozen: boolean, iceLevel = 0): Promise<this> {
    const { obj } = await instance(this.spec.model);
    if (this.spec.hide?.length) {
      const drop: THREE.Object3D[] = [];
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && (Array.isArray(m.material) ? m.material : [m.material]).some((mt) => this.spec.hide!.includes(mt.name))) drop.push(m);
      });
      drop.forEach((d) => d.removeFromParent());
    }
    // xoay mặt ra +z TRƯỚC khi fit (fit căn tâm theo bbox sau xoay)
    const holder = new THREE.Group();
    holder.add(obj);
    // ẩn xương (cung tên Merida…) TRƯỚC khi fit, không thì bbox tính cả cung → công chúa lơ lửng trên bệ
    if (this.spec.hideBones?.length) {
      obj.traverse((o) => { if ((o as THREE.Bone).isBone && this.spec.hideBones!.includes(normBone(o.name))) o.scale.setScalar(1e-4); });
    }
    fitHeight(obj, this.height);
    this.poser = new Poser(obj, this.spec.tuning);
    holder.rotation.y = -this.poser.facingYaw + (this.spec.yawOffset ?? 0);
    this.body.add(holder);
    this.model = holder;
    if (!this.poser.ok) console.warn('[pose] không tạo dáng được', this.spec.model, this.poser.group);
    if (frozen) {
      this.ice = new Ice(holder, this.root, this.height);
      this.ice.setLevel(iceLevel);
      this.poser.w.breathe = 0;
    } else {
      this.setAwake();
    }
    this.poser.update(0);
    return this;
  }

  get w(): PoseWeights { return this.poser!.w; }

  /** Tỉnh ngay (không hiệu ứng): tay buông, thở. */
  setAwake(): void {
    this.awake = true;
    this.ice?.remove();
    if (this.poser) { this.poser.w.rest = 1; this.poser.w.breathe = 1; }
  }

  private async tw(ms: number, set: Partial<PoseWeights>, ease = easeInOutSine): Promise<void> {
    if (!this.poser) { await wait(ms); return; }
    const w = this.poser.w;
    const from: Partial<PoseWeights> = {};
    for (const k of Object.keys(set) as (keyof PoseWeights)[]) from[k] = w[k];
    await tween(ms, (t) => {
      for (const k of Object.keys(set) as (keyof PoseWeights)[]) w[k] = from[k]! + (set[k]! - from[k]!) * t;
    }, ease);
  }

  private async act<T>(fn: () => Promise<T>): Promise<T> {
    this.busy++;
    try { return await fn(); } finally { this.busy--; }
  }

  /** Vỡ băng → hạ tay → nhìn bé → (caller phát lời cảm ơn trong lúc) nhún chào → vẫy. */
  async wake(magic?: Magic): Promise<void> {
    return this.act(async () => {
      if (this.ice && this.ice.active) await this.ice.shatter(magic);
      this.awake = true;
      // bừng tỉnh: nảy nhẹ + hít thở
      void tween(500, (k) => { this.body.position.y = Math.sin(k * Math.PI) * this.height * 0.03; });
      await this.tw(1300, { rest: 1, breathe: 1, lookPitch: -0.12 });
      await this.tw(400, { lookPitch: 0 });
    });
  }

  async curtsy(): Promise<void> {
    return this.act(async () => {
      const y0 = this.body.position.y;
      await Promise.all([
        this.tw(700, { curtsy: 1 }),
        tween(700, (k) => { this.body.position.y = y0 - k * this.height * 0.015; }, easeInOutSine),
      ]);
      await wait(500);
      await Promise.all([
        this.tw(650, { curtsy: 0 }),
        tween(650, (k) => { this.body.position.y = y0 - (1 - k) * this.height * 0.015; }, easeInOutSine),
      ]);
    });
  }

  async wave(seconds = 2): Promise<void> {
    return this.act(async () => {
      await this.tw(450, { wave: 1, lookYaw: 0.08 });
      await wait(seconds * 1000);
      await this.tw(450, { wave: 0, lookYaw: 0 });
    });
  }

  async cheer(seconds = 1.2): Promise<void> {
    return this.act(async () => {
      const y0 = this.body.position.y;
      await this.tw(350, { cheer: 1 });
      await tween(seconds * 1000, (k) => { this.body.position.y = y0 + Math.abs(Math.sin(k * Math.PI * 3)) * this.height * 0.05; });
      this.body.position.y = y0;
      await this.tw(400, { cheer: 0 });
    });
  }

  /** Xoay váy 1 vòng (hoặc n vòng) với tay dang. */
  async twirl(turns = 1, ms = 1600): Promise<void> {
    return this.act(async () => {
      const r0 = this.body.rotation.y;
      void this.tw(350, { open: 1, rest: 1 });
      await tween(ms * turns, (k) => {
        this.body.rotation.y = r0 + k * Math.PI * 2 * turns;
        this.body.position.y = Math.sin(k * Math.PI * turns * 2) ** 2 * this.height * 0.025;
      }, easeInOutSine);
      this.body.rotation.y = r0;
      this.body.position.y = 0;
      await this.tw(400, { open: 0 });
    });
  }

  /** Hiện ra bằng scale nảy (đặt lên bệ ở sảnh). */
  async popIn(ms = 700): Promise<void> {
    this.root.scale.setScalar(0.001);
    const s = 1;
    await tween(ms, (k) => this.root.scale.setScalar(Math.max(0.001, s * k)), easeOutBack);
  }

  headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.poser?.jointWorld('head', out) ?? this.root.localToWorld(out.set(0, this.height * 0.9, 0));
  }
  chestWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.poser?.jointWorld('chest', out) ?? this.root.localToWorld(out.set(0, this.height * 0.68, 0));
  }

  /** Rảnh (không đang làm động tác nào). */
  get idle(): boolean { return this.busy === 0; }

  /** Chờ động tác đang làm xong (tối đa maxMs) – trước khi nghi lễ ra lệnh động tác khác, tránh 2 lệnh giành nhau. */
  async settle(maxMs = 3000): Promise<void> {
    const t0 = performance.now();
    while (this.busy > 0 && performance.now() - t0 < maxMs) await wait(80);
  }

  /** 1 động tác ngẫu nhiên khi đứng chơi (không lặp lại động tác vừa làm). Mọi trọng số đều tween → không giật. */
  private async idleAct(): Promise<void> {
    const acts = [
      // nhìn quanh: trái → phải → giữa
      () => this.act(async () => {
        const s = Math.random() < 0.5 ? 1 : -1;
        await this.tw(900, { lookYaw: 0.42 * s, lookPitch: -0.05 });
        await wait(700 + Math.random() * 500);
        await this.tw(1100, { lookYaw: -0.38 * s });
        await wait(600);
        await this.tw(800, { lookYaw: 0, lookPitch: 0 });
      }),
      () => this.wave(1 + Math.random() * 1.2),
      () => this.curtsy(),
      () => this.twirl(1, 1700),
      // nghiêng đầu điệu đà, lắc hông
      () => this.act(async () => {
        const s = Math.random() < 0.5 ? 1 : -1;
        await this.tw(700, { tilt: s, lookPitch: 0.06 });
        await wait(900 + Math.random() * 600);
        await this.tw(800, { tilt: 0, lookPitch: 0 });
      }),
      () => this.cheer(0.6),
    ];
    let i = Math.floor(Math.random() * acts.length);
    if (i === this.lastLife) i = (i + 1 + Math.floor(Math.random() * (acts.length - 1))) % acts.length;
    this.lastLife = i;
    await acts[i]();
  }

  update(dt: number): void {
    this.ice?.update(dt);
    if (!this.poser) return;
    if (!this.poser.ok && this.awake) {
      // model không tạo dáng được: thở bằng scale
      this.bobT += dt;
      this.body.scale.y = 1 + Math.sin(this.bobT * 1.8) * 0.006;
    }
    if (this.awake && this.idleLife && this.busy === 0) {
      this.lifeTimer -= dt;
      if (this.lifeTimer <= 0) {
        this.lifeTimer = 8 + Math.random() * 7;
        void this.idleAct();
      }
    }
    this.poser.update(dt);
  }

  dispose(): void {
    this.ice?.dispose();
    disposeSkeletons(this.root);
    this.root.removeFromParent();
  }
}

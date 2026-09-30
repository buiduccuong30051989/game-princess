// Hà An trên bệ: model Quaternius (có Idle), gắn đồ theo xương, hoá thân thành công chúa có animation.
import * as THREE from 'three';
import type { Room } from './room';
import type { ItemDef, PrincessDef } from './data';
import { PALETTE } from './data';
import { tween, easeOutBack, easeInOutSine, wait } from './tween';

interface Follow { obj: THREE.Object3D; bone: THREE.Object3D; up: number; forward: number; yaw: number }

const HERO_HEIGHT = 2.0;

export class Avatar {
  readonly group = new THREE.Group();      // trên bệ
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private idle: THREE.AnimationAction | null = null;
  private readonly follows: Follow[] = [];
  private readonly bones = new Map<string, THREE.Object3D>();
  private readonly worn = new Map<string, THREE.Object3D>();
  private headTop = HERO_HEIGHT;
  private anchor: { bone: THREE.Object3D; obj: THREE.Object3D; restY: number } | null = null;
  transformed = false;

  constructor(private room: Room) {
    room.pedestal.add(this.group);
    this.group.position.y = 0.28;
  }

  /** Hà An: model Quaternius, đầu to kiểu chibi, Idle loop. */
  async loadHero(): Promise<void> {
    const { obj, clips } = await this.room.instance('haan.glb');
    this.room.fitHeight(obj, HERO_HEIGHT);
    obj.rotation.y = 0; // model Quaternius nhìn về +z (ra camera)
    this.model = obj;
    this.group.add(obj);
    obj.traverse((o) => { if ((o as THREE.Bone).isBone) this.bones.set(o.name, o); });
    // chibi: phóng đầu
    const head = this.bones.get('Head');
    if (head) head.scale.setScalar(1.15);
    obj.updateMatrixWorld(true);
    const top = this.bones.get('HeadTop_End');
    if (top) this.headTop = top.getWorldPosition(new THREE.Vector3()).y - this.group.getWorldPosition(new THREE.Vector3()).y;
    this.clips = clips;
    this.mixer = new THREE.AnimationMixer(obj);
    const idleClip = clips.find((c) => /idle/i.test(c.name)) ?? clips[0];
    if (idleClip) { this.idle = this.mixer.clipAction(idleClip); this.idle.play(); }
  }

  /** Vị trí thế giới của đỉnh đầu (để bay đồ tới, nổ sao). */
  headWorld(): THREE.Vector3 {
    const b = this.bones.get('Head');
    return b ? b.getWorldPosition(new THREE.Vector3()) : this.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.7, 0));
  }

  /** Gắn 1 món lên người / bệ. Trả về object để tween bay tới. */
  async wear(item: ItemDef): Promise<THREE.Object3D> {
    let obj: THREE.Object3D;
    if (item.model) {
      const inst = await this.room.instance(item.model);
      obj = inst.obj;
      if (item.keep) {
        const drop: THREE.Object3D[] = [];
        obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          if (!mats.some((mt) => item.keep!.includes(mt.name))) drop.push(m);
        });
        for (const d of drop) d.removeFromParent();
      }
      this.room.fitHeight(obj, item.height);
      // đưa tâm về gốc để xoay/gắn dễ
      const box = new THREE.Box3().setFromObject(obj, true);
      const c = box.getCenter(new THREE.Vector3());
      const holder = new THREE.Group();
      obj.position.sub(c);
      holder.add(obj);
      obj = holder;
    } else {
      obj = this.buildCrown();
    }
    const m = item.mount;
    if (m.kind === 'bone') {
      const bone = this.bones.get(m.bone);
      if (bone) {
        this.follows.push({ obj, bone, up: m.up, forward: m.forward, yaw: m.yaw ?? 0 });
        this.room.scene.add(obj);
      } else {
        this.group.add(obj); obj.position.y = 1.5;
      }
    } else if (m.kind === 'crown') {
      const bone = this.bones.get('Head')!;
      this.follows.push({ obj, bone, up: this.headTop - bone.getWorldPosition(new THREE.Vector3()).y + this.group.getWorldPosition(new THREE.Vector3()).y - 0.02, forward: 0, yaw: 0 });
      this.room.scene.add(obj);
    } else {
      obj.position.set(m.x, 0.2 + item.height / 2, m.z);
      obj.rotation.y = m.yaw ?? 0;
      if (item.id === 'olaf') obj.position.y = item.height / 2; // đứng sàn
      this.room.scene.add(obj);
    }
    this.worn.set(item.id, obj);
    // hiện ra bằng scale nảy
    const s = obj.scale.x;
    obj.scale.setScalar(0.001);
    await tween(600, (k) => obj.scale.setScalar(s * k), easeOutBack);
    return obj;
  }

  /** Vương miện băng: vòng + 5 mũi nhọn + ngọc. */
  private buildCrown(): THREE.Object3D {
    const g = new THREE.Group();
    const ice = new THREE.MeshStandardMaterial({ color: PALETTE.ice, roughness: 0.25, emissive: 0x7fd0ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.92 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 10, 40), ice);
    band.rotation.x = Math.PI / 2;
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, i === 0 ? 0.26 : 0.17, 6), ice);
      spike.position.set(Math.cos(a) * 0.19, (i === 0 ? 0.13 : 0.085), Math.sin(a) * 0.19);
      g.add(spike);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfe9ff, emissiveIntensity: 0.8 }));
      gem.position.set(Math.cos(a) * 0.19, 0.02, Math.sin(a) * 0.19);
      g.add(gem);
    }
    return g;
  }

  /** Đồ gắn xương đi theo xương mỗi frame. */
  update(dt: number): void {
    this.mixer?.update(dt);
    if (this.anchor) {
      this.anchor.obj.updateMatrixWorld(true);
      const hw = this.anchor.bone.getWorldPosition(new THREE.Vector3());
      const target = this.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, this.anchor.restY, 0));
      const dLocal = this.group.worldToLocal(target.clone()).sub(this.group.worldToLocal(hw.clone()));
      this.anchor.obj.position.add(dLocal);
    }
    const p = new THREE.Vector3(), q = new THREE.Quaternion();
    for (const f of this.follows) {
      f.bone.getWorldPosition(p);
      f.bone.getWorldQuaternion(q);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      const upv = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      f.obj.position.copy(p).addScaledVector(upv, f.up).addScaledVector(fwd, f.forward);
      f.obj.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.yaw));
    }
  }

  private setOpacity(root: THREE.Object3D, k: number): void {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        mat.transparent = true; mat.opacity = k; mat.depthWrite = k > 0.5;
      }
    });
  }

  /** Hoá thân: Hà An + đồ gắn người mờ đi, công chúa hiện ra cùng chỗ, chơi clip win rồi idle. */
  async transform(p: PrincessDef): Promise<void> {
    if (!this.model) return;
    this.transformed = true;
    const { obj, clips } = await this.room.instance(p.model);
    // bỏ mọi track dịch chuyển (root motion của rig game làm nhân vật trôi khỏi bệ); giữ xoay + scale
    for (const c of clips) c.tracks = c.tracks.filter((t) => !t.name.endsWith('.position'));
    this.room.fitHeight(obj, HERO_HEIGHT + 0.15);
    obj.rotation.y = p.modelYaw;
    obj.visible = false;
    this.group.add(obj);
    // neo hông: rig game xoay quanh gốc lệch tâm → mỗi frame kéo hông về giữa bệ
    obj.updateMatrixWorld(true);
    const bones: THREE.Object3D[] = [];
    obj.traverse((o) => { if ((o as THREE.Bone).isBone) bones.push(o); });
    const gy = this.group.getWorldPosition(new THREE.Vector3()).y;
    const byName = bones.find((b) => /hips|pelvis/i.test(b.name));
    const hips = byName ?? bones
      .filter((b) => b.children.length > 0)
      .sort((a, b) => Math.abs(a.getWorldPosition(new THREE.Vector3()).y - gy - HERO_HEIGHT * 0.5) - Math.abs(b.getWorldPosition(new THREE.Vector3()).y - gy - HERO_HEIGHT * 0.5))[0];
    if (hips) this.anchor = { bone: hips, obj, restY: hips.getWorldPosition(new THREE.Vector3()).y - gy };
    const fadeOut = [this.model, ...this.follows.map((f) => f.obj)];
    await tween(900, (k) => { for (const o of fadeOut) this.setOpacity(o, 1 - k); }, easeInOutSine);
    for (const o of fadeOut) o.visible = false;
    this.follows.length = 0;
    this.model.visible = false;
    this.mixer?.stopAllAction();
    obj.visible = true;
    this.setOpacity(obj, 0);
    this.model = obj;
    this.mixer = new THREE.AnimationMixer(obj);
    this.clips = clips;
    const find = (n?: string) => (n ? clips.find((c) => c.name === n) : undefined) ?? clips.find((c) => /idle/i.test(c.name));
    const idleClip = find(p.clips?.idle);
    this.idle = idleClip ? this.mixer.clipAction(idleClip) : null;
    await tween(900, (k) => this.setOpacity(obj, k), easeInOutSine);
    const winClip = find(p.clips?.win);
    if (winClip) await this.playOnce(winClip);
    this.idle?.reset().fadeIn(0.3).play();
  }

  private playOnce(clip: THREE.AnimationClip): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mixer) return resolve();
      const a = this.mixer.clipAction(clip);
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      this.idle?.fadeOut(0.2);
      a.reset().fadeIn(0.2).play();
      const onDone = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== a) return;
        this.mixer!.removeEventListener('finished', onDone);
        a.fadeOut(0.3);
        this.idle?.reset().fadeIn(0.3).play();
        resolve();
      };
      this.mixer.addEventListener('finished', onDone);
    });
  }

  /** Làm phép: clip magic (nếu có) + trả về vị trí tay/đầu để nổ hạt. */
  async castMagic(p: PrincessDef): Promise<void> {
    const clip = p.clips?.magic ? this.clips.find((c) => c.name === p.clips!.magic) : undefined;
    if (clip) await this.playOnce(clip); else await wait(900);
  }

  /** Nhảy xoay ăn mừng (Hà An chưa hoá thân). */
  async celebrate(): Promise<void> {
    const y0 = this.group.position.y;
    await tween(700, (k) => { this.group.position.y = y0 + Math.sin(k * Math.PI) * 0.6; });
    this.group.position.y = y0;
  }
}

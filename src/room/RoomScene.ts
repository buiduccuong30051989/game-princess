// Màn PHÒNG CÔNG CHÚA: dựng bệ + tượng băng + Elsa + ánh sáng chung, gọi RoomDef.buildScene để trang trí,
// chạy 3 thử thách → mỗi câu đúng Elsa làm phép, băng tan 1 nấc → câu 3: băng vỡ, công chúa tỉnh, cảm ơn.
// Elsa "sống": vào phòng vẫy chào, lúc chờ bé thì lướt nhẹ / ngắm tượng / quay ra vẫy; đúng → làm phép + vẫy;
// sai → suy nghĩ / lo lắng. Thỉnh thoảng người nhà Nhím hiện bong bóng cổ vũ (src/family.ts).
import * as THREE from 'three';
import { PARAMS } from '../core/params.ts';
import type { Engine, GameScene } from '../core/engine.ts';
import { instance, emojiSprite, disposeTree, evictGLB } from '../core/assets.ts';
import { PrincessActor } from '../princess.ts';
import { ElsaGuide } from '../elsa.ts';
import { Challenge } from '../challenge.ts';
import { play, sfx, chime, CHIME, CHIME_BIG, stopSpeech, withTimeout } from '../audio.ts';
import { els, showHud, banner, setFrost, showActions, confetti, toast, onTap } from '../ui.ts';
import { bankKeyPick } from '../voice.ts';
import { clearTalk } from '../talk.ts';
import { ROOM_ORDER } from '../core/progress.ts';
import { tween, wait, easeInOutSine } from '../tween.ts';
import { familyCheer, clearFamily } from '../family.ts';
import { princessInfo } from '../rooms/princesses.ts';
import { buildWord, validateRoom } from './words.ts';
import { roomAudioKeys } from './audioKeys.ts';
import { mat, mix } from './kit.ts';
import { mergeStatic, collectRefs, noCastShadow, detectMoving, snapshotPlain } from '../core/merge.ts';
import type { RoomCtx, RoomDef, RoomLayout } from './types.ts';

export const ROOM_LAYOUT: RoomLayout = {
  pedestalRadius: 1.0,
  pedestalH: 0.35,
  elsa: new THREE.Vector3(-2.15, 0, 0.75),
  clearX: 3.2,
  clearZ: -1.4,
  backZ: -5,
  sideX: 6.5,
};

const PRINCESS_H = 1.75;

export interface RoomOpts {
  saved: boolean;
  /** công chúa vừa tỉnh (lưu tiến độ) */
  onSaved(id: RoomDef['id']): void;
  /** bé bấm về sảnh */
  onExit(): void;
  debug?: boolean;
  /** vào thẳng trạng thái tỉnh / đã tan N nấc (debug) */
  startWake?: boolean;
  startMelt?: number;
}

export class RoomScene implements GameScene {
  readonly kind = 'room';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  readonly root = new THREE.Group();
  readonly def: RoomDef;
  princess!: PrincessActor;
  elsa!: ElsaGuide;
  challenge!: Challenge;
  private readonly engine: Engine;
  private readonly opts: RoomOpts;
  private readonly ctxState: Record<string, unknown> = {};
  private ctx!: RoomCtx;
  private melt = 0;           // 0..1 hiển thị (tween)
  private awake = false;
  private alive = true;
  private time = 0;
  private hemi!: THREE.HemisphereLight;
  private key!: THREE.DirectionalLight;
  private fill!: THREE.DirectionalLight;
  private thinkCooldown = 0;
  private pedestal!: THREE.Group;
  private wrongN = 0;
  // Elsa tự hoạt động lúc chờ bé (elsaHold > 0: đang làm phép / nghi lễ → đứng yên chờ lệnh)
  private elsaHold = 0;
  private lifeT = 6;
  private lifeToken = 0;
  private lifeRunning = false;
  private readonly _v = new THREE.Vector3();
  private flowRunning = false;
  private lastLine: string | null = null;
  private savedReported = false;
  private unbind: (() => void)[] = [];
  /** giây không có gì xảy ra (watchdog phòng) */
  private stuckT = 0;

  private constructor(engine: Engine, def: RoomDef, opts: RoomOpts) {
    this.engine = engine;
    this.def = def;
    this.opts = opts;
  }

  static async create(engine: Engine, def: RoomDef, opts: RoomOpts): Promise<RoomScene> {
    const r = new RoomScene(engine, def, opts);
    await r.build();
    return r;
  }

  // ------------------------------------------------------------------ dựng cảnh
  private async build(): Promise<void> {
    const { def } = this;
    const pal = def.palette;
    this.scene.background = new THREE.Color(pal.light);
    this.scene.add(this.root);
    this.buildLights();

    const self = this;
    this.ctx = {
      root: this.root, scene: this.scene, camera: this.camera, magic: this.engine.magic, layout: ROOM_LAYOUT, palette: pal,
      model: async (name, o) => (await instance(name, o)).obj,
      emoji: (e, size) => emojiSprite(e, size),
      get melt() { return self.melt; },
      get awake() { return self.awake; },
      get time() { return self.time; },
      state: this.ctxState,
    };

    const info = princessInfo(def.princessModel);
    this.princess = new PrincessActor({
      model: def.princessModel, height: PRINCESS_H, tuning: { ...info?.tuning, ...def.pose }, hide: info?.hide, hideBones: info?.hideBones,
    });
    this.elsa = new ElsaGuide(1.92);
    this.elsa.magic = this.engine.magic;
    const frozen = !(this.opts.saved || this.opts.startWake);
    const startMelt = frozen ? Math.max(0, Math.min(2, this.opts.startMelt ?? 0)) : 3;

    this.buildPedestal();
    this.princess.root.position.set(0, ROOM_LAYOUT.pedestalH, 0);
    this.scene.add(this.princess.root);
    this.elsa.root.position.copy(ROOM_LAYOUT.elsa);
    this.elsa.root.rotation.y = 0.32; // hơi quay vào tượng
    this.scene.add(this.elsa.root);

    await Promise.all([
      Promise.resolve(def.buildScene(this.ctx)).catch((e) => console.error(`[room ${def.id}] buildScene lỗi`, e)),
      this.princess.load(frozen, startMelt),
      this.elsa.load().catch((e) => console.error('[room] không tải được Elsa', e)),
    ]);
    this.optimizeDecor();
    this.princess.idleLife = false;
    if (!frozen) { this.awake = true; this.melt = 1; this.princess.setAwake(); }
    else this.melt = startMelt / 3;
    this.applyMeltLook();

    const words = def.words.map(buildWord);
    this.challenge = new Challenge(words, { roomIndex: Math.max(0, ROOM_ORDER.indexOf(def.id)), theme: def.id }, { onWrong: () => this.onWrong() });

    if (this.opts.debug) this.buildDebug();
  }

  /**
   * iPad: đồ trang trí không đổ bóng (pass bóng nhân đôi draw call + tam giác; chỉ công chúa, Elsa, bệ đổ bóng)
   * và đồ tĩnh gộp theo material (ambient chỉ đụng đồ trong ctx.state → giữ nguyên các thứ đó).
   */
  private optimizeDecor(): void {
    if (PARAMS.nomerge) return;
    noCastShadow(this.root);
    this.resize(1180 / 820); // sprite → tấm phẳng cần hướng camera thật
    const refs = collectRefs(this.ctxState);
    // Đồ THỰC SỰ chuyển động: chạy ambient giả lập 30 s (băng tan dần rồi tỉnh dậy), xem object nào đổi vị trí/xoay/ẩn hiện,
    // rồi trả mọi thứ (transform, material, số liệu trong ctx.state) về như cũ.
    let moving: Set<THREE.Object3D>, animMats: Set<THREE.Material>;
    const ambient = this.def.ambient;
    const restoreState = snapshotPlain(this.ctxState);
    try {
      let t = 0, melt = 0, awake = false;
      const sim = Object.create(this.ctx) as RoomCtx;
      Object.defineProperties(sim, { melt: { get: () => melt }, awake: { get: () => awake }, time: { get: () => t } });
      const dt = 1 / 30;
      const res = ambient ? detectMoving(this.root, (i) => { t += dt; melt = Math.min(1, i / 300); awake = i >= 420; ambient.call(this.def, sim, dt); }, 900) : null;
      moving = res?.objects ?? new Set();
      animMats = res?.materials ?? new Set();
    } catch (e) {
      console.warn(`[room ${this.def.id}] giả lập ambient lỗi → chỉ gộp đồ không có trong ctx.state`, e);
      moving = new Set(refs.objects);
      animMats = refs.materials;
    } finally {
      restoreState();
      this.engine.magic.clear();
    }
    // material ctx.state trỏ THẲNG tới (không qua object) thường để ambient đổi màu/độ sáng → giữ nguyên dù giả lập không thấy đổi
    for (const m of refs.directMaterials) animMats.add(m);
    const st = mergeStatic(this.root, { keep: moving, keepMaterials: animMats, camera: this.camera });
    mergeStatic(this.pedestal, { camera: this.camera });
    if (import.meta.env.DEV) (this as unknown as Record<string, unknown>).__moving = moving;
    if (import.meta.env.DEV) console.info(`[room ${this.def.id}] gộp đồ tĩnh: ${st.meshesBefore} → ${st.meshesAfter} vật vẽ (${moving.size} object động, ${st.sprites} sprite → tấm phẳng)`);
  }

  private buildLights(): void {
    this.hemi = new THREE.HemisphereLight(0xfff6fb, mix(this.def.palette.primary, 0xffffff, 0.6), 1.15);
    this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xfff3e0, 2.1);
    key.position.set(3, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); // iPad: 2048² PCF quá nặng
    const sc = key.shadow.camera;
    sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -2; sc.near = 1; sc.far = 25;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
    key.shadow.intensity = 0.45;
    this.key = key;
    this.scene.add(key);
    this.fill = new THREE.DirectionalLight(0xdfeeff, 0.8);
    this.fill.position.set(-5, 4, 4);
    this.scene.add(this.fill);
    // viền sáng sau lưng công chúa cho nổi khối
    const rim = new THREE.PointLight(mix(this.def.palette.accent, 0xffffff, 0.5), 5, 8);
    rim.position.set(0, 3.2, -1.6);
    this.scene.add(rim);
  }

  /** Bệ tròn nhiều tầng theo màu phòng + huy hiệu emoji phía trước. */
  private buildPedestal(): void {
    const { pedestalRadius: r, pedestalH: h } = ROOM_LAYOUT;
    const pal = this.def.palette;
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.2, h * 0.45, 64), mat(mix(pal.primary, 0xffffff, 0.35), { rough: 0.5 }));
    base.position.y = h * 0.225;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, h * 0.55, 64), mat(0xfffaf4, { rough: 0.35 }));
    top.position.y = h * 0.45 + h * 0.275;
    const trim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.035, 10, 72), mat(0xffc94d, { rough: 0.35, emissive: 0x7a4a00, ei: 0.25 }));
    trim.rotation.x = Math.PI / 2;
    trim.position.y = h;
    const trim2 = trim.clone();
    trim2.scale.setScalar(1.15);
    trim2.position.y = h * 0.45;
    // bệ thấp: chỉ nhận bóng (bóng của chính nó gần như không thấy; iPad đỡ 2 lượt vẽ)
    for (const m of [base, top]) m.receiveShadow = true;
    g.add(base, top, trim, trim2);
    const badge = emojiSprite(this.def.emoji, 0.42);
    badge.position.set(0, h * 0.62, r * 1.05 + 0.05);
    g.add(badge);
    this.scene.add(g);
    this.pedestal = g;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(8.4, 3.3 / (t * aspect));
    this.camera.position.set(0.15, 1.95 + (dist - 8.4) * 0.12, dist);
    this.camera.lookAt(0.15, 0.62 + (dist - 8.4) * 0.1, 0);
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ luồng chơi
  enter(): void {
    showHud(true);
    showActions(false, false);
    this.unbind.push(
      onTap(els.home, () => this.exit()),
      onTap(els.btnHall, () => this.exit()),
      onTap(els.btnAgain, () => void this.replay()),
      onTap(els.say, () => { if (!this.challenge?.repeat() && this.lastLine) void play(this.lastLine); }),
    );
    banner(`${this.def.emoji} ${this.def.name}`);
    void this.intro();
  }

  private async line(key: string): Promise<void> {
    if (!this.alive) return;
    this.lastLine = key;
    await play(key);
  }
  /** 1 câu trong ngân hàng (không lặp câu vừa nói). */
  private bank(name: string): Promise<void> { return this.line(bankKeyPick(name)); }

  /** Elsa quay ra vẫy chào bé khi vào phòng. */
  private async greet(): Promise<void> {
    const release = this.holdElsa();
    try {
      await withTimeout(this.elsa.face(this.camera.position, 350), 2000);
      if (!this.alive) return;
      await withTimeout(this.elsa.wave(2.2), 5000);
    } finally { release(); }
  }

  private async intro(): Promise<void> {
    this.flowRunning = true;
    try {
      void this.greet();
      if (this.awake) {
        void this.princess.wave(2);
        await this.bank('replay_intro');
        if (!this.alive) return;
        this.princess.idleLife = true;
        showActions(true, true);
        return;
      }
      await this.line(this.def.audio.intro);
      if (!this.alive) return;
      await this.runChallenges();
    } finally {
      this.flowRunning = false;
    }
  }

  private async runChallenges(): Promise<void> {
    const start = this.princess.ice ? this.princess.ice.level : 0;
    for (let i = start; i < 3; i++) {
      const intro = bankKeyPick(i === 0 ? 'start' : i === 2 ? 'last' : 'next');
      const ok = await this.challenge.run(this.def.challenges[i], intro);
      if (!ok || !this.alive) return;
      if (i === 2) {
        // LƯU NGAY khi câu 3 đúng (màn mừng + tỉnh dậy dài ~8 s; bé bấm về giữa chừng không được mất công)
        this.reportSaved();
        els.home.style.visibility = 'hidden';
      }
      await this.celebrateCorrect(i);
      if (!this.alive) return;
    }
    await this.wakeUp();
  }

  private reportSaved(): void {
    if (this.savedReported) return;
    this.savedReported = true;
    this.opts.onSaved(this.def.id);
  }

  /** Câu đúng: Elsa làm phép, tia phép bay tới tượng, băng tan 1 nấc. */
  private async celebrateCorrect(i: number): Promise<void> {
    const release = this.holdElsa();
    try { await this.celebrateCorrectInner(i); } finally { release(); }
  }

  private async celebrateCorrectInner(i: number): Promise<void> {
    const [c1, c2] = this.def.magicColors;
    void this.bank('praise');
    await withTimeout(this.elsa.face(this.princess.chestWorld(), 350), 2000);
    const spell = withTimeout(this.elsa.play('spell'), 6000);
    await wait(700);
    if (!this.alive) return;
    sfx('sfx_win', 0.35);
    await withTimeout(this.engine.magic.beam(this.elsa.handWorld(), this.princess.chestWorld(), c1, c2, 0.8, 1.4, 1.1), 4000);
    if (!this.alive) return;
    chime(i < 2 ? CHIME : CHIME_BIG);
    if (i < 2) {
      const m0 = this.melt;
      void tween(1300, (k) => { this.melt = m0 + (1 / 3) * k; this.applyMeltLook(); }, easeInOutSine);
      await withTimeout(this.princess.ice?.meltStep(this.engine.magic, [c1, 0x7fd0ff]) ?? Promise.resolve(), 4000);
      if (!this.alive) return;
      // chờ câu "băng tan" đọc HẾT (câu hỏi kế tiếp sẽ cắt tiếng đang phát)
      await Promise.all([this.bank('melt'), spell]);
      if (!this.alive) return;
    }
    await spell;
    if (!this.alive) return;
    // phép xong: quay ra vẫy bé
    await withTimeout(this.elsa.face(this.camera.position, 350), 2000);
    void this.elsa.wave(1.4);
    // thỉnh thoảng người nhà cổ vũ (câu 3 thì để lúc công chúa tỉnh)
    if (i < 2 && Math.random() < 0.55) await this.cheer();
  }

  private async cheer(): Promise<void> {
    if (!this.alive) return;
    await withTimeout(familyCheer(), 8000);
  }

  /** Câu 3 đúng: băng vỡ, công chúa tỉnh, nhún chào, vẫy, cảm ơn. */
  private async wakeUp(): Promise<void> {
    const release = this.holdElsa();
    try { await this.wakeUpInner(); } finally {
      release();
      // lỗi giữa chừng cũng không được để bé kẹt không có nút về sảnh
      if (this.alive) els.home.style.visibility = 'visible';
    }
  }

  /** Watchdog phòng gọi khi không còn gì chạy: chạy lại các bài còn lại (băng chưa tan hết) hoặc hiện nút cuối phòng. */
  private async restartFlow(): Promise<void> {
    if (this.flowRunning || !this.alive) return;
    if (this.awake) { els.home.style.visibility = 'visible'; this.princess.idleLife = true; showActions(true, true); return; }
    this.flowRunning = true;
    try { await this.runChallenges(); } finally { this.flowRunning = false; }
  }

  private async wakeUpInner(): Promise<void> {
    if (!this.alive) return;
    this.reportSaved();
    els.home.style.visibility = 'hidden';
    const m0 = this.melt;
    void tween(900, (k) => { this.melt = m0 + (1 - m0) * k; this.applyMeltLook(); });
    this.awake = true;
    sfx('sfx_win', 0.6);
    const wake = this.princess.wake(this.engine.magic);
    await wait(500);
    confetti(90);
    void this.elsa.play('celebrate');
    await withTimeout(wake, 8000);
    if (!this.alive) return;
    await this.bank('wake');
    if (!this.alive) return;
    const thanks = this.line(this.def.audio.thanks);
    await withTimeout(this.princess.curtsy(), 6000);
    if (!this.alive) return;
    void this.princess.wave(2.2);
    await thanks;
    if (!this.alive) return;
    // công chúa tỉnh: Elsa vẫy mừng + 1 người nhà cổ vũ
    void this.elsa.face(this.camera.position, 350).then(() => this.elsa.wave(1.6));
    await this.cheer();
    if (!this.alive) return;
    this.sparkleAround(40);
    this.princess.idleLife = true;
    els.home.style.visibility = 'visible';
    showActions(true, true);
    void this.bank('tap_home');
  }

  /** Chơi lại khi công chúa đã tỉnh: 3 bài, mỗi câu đúng tung phép quanh công chúa, cuối cùng xoay váy. */
  private async replay(): Promise<void> {
    if (this.flowRunning || !this.alive) return;
    this.flowRunning = true;
    showActions(false, false);
    this.princess.idleLife = false;
    try {
      await withTimeout(this.princess.settle(), 4000);
      for (let i = 0; i < 3; i++) {
        const intro = bankKeyPick(i === 0 ? 'replay_start' : i === 2 ? 'last' : 'next');
        const ok = await this.challenge.run(this.def.challenges[i], intro);
        if (!ok || !this.alive) return;
        void this.bank('praise');
        const release = this.holdElsa();
        try {
          await withTimeout(this.elsa.face(this.princess.chestWorld(), 300), 2000);
          const spell = withTimeout(this.elsa.play('spell'), 6000);
          await wait(700);
          await withTimeout(this.engine.magic.beam(this.elsa.handWorld(), this.princess.chestWorld(), this.def.magicColors[0], this.def.magicColors[1], 0.8, 1.4, 1.1), 4000);
          this.sparkleAround(60);
          chime(CHIME);
          void this.princess.cheer(0.8);
          await spell;
          if (!this.alive) return;
          await withTimeout(this.elsa.face(this.camera.position, 300), 2000);
          void this.elsa.wave(1.2);
          if (Math.random() < 0.35) await this.cheer();
        } finally { release(); }
      }
      if (!this.alive) return;
      confetti(80);
      void this.bank('replay_done');
      void this.elsa.play('celebrate');
      await withTimeout(this.princess.twirl(2, 1500), 5000);
      if (!this.alive) return;
      await withTimeout(this.princess.curtsy(), 6000);
    } finally {
      this.flowRunning = false;
      if (this.alive) { this.princess.idleLife = true; showActions(true, true); }
    }
  }

  private onWrong(): void {
    if (this.thinkCooldown > 0) return;
    this.thinkCooldown = 3;
    this.stopLife();
    this.lifeT = Math.max(this.lifeT, 5);
    // xen kẽ: suy nghĩ / lo lắng
    void this.elsa.face(this.camera.position, 300);
    void (this.wrongN++ % 2 ? this.elsa.worried() : this.elsa.play('think'));
  }

  // ------------------------------------------------------------------ Elsa tự hoạt động
  /** Giữ Elsa đứng yên cho nghi lễ (làm phép, tỉnh dậy…). Trả hàm nhả. */
  private holdElsa(): () => void {
    this.elsaHold++;
    this.stopLife();
    let done = false;
    return () => { if (!done) { done = true; this.elsaHold--; this.lifeT = 4 + Math.random() * 3; } };
  }

  private stopLife(): void {
    this.lifeToken++;
    this.lifeRunning = false;
    this.elsa?.stop();
  }

  /** Mỗi 5–9 s lúc chờ bé: lướt nhẹ quanh chỗ đứng / ngắm tượng / quay ra vẫy (công chúa tỉnh thì vẫy lại). */
  private async elsaIdle(): Promise<void> {
    const my = ++this.lifeToken;
    const ok = () => my === this.lifeToken && this.alive && this.elsaHold === 0;
    this.lifeRunning = true;
    const e = this.elsa, home = ROOM_LAYOUT.elsa, cam = this.camera.position;
    try {
      const r = Math.random();
      const p = e.root.position;
      if (r < 0.35) {
        // lướt nhẹ trong vòng ~0.5 m quanh chỗ đứng (đi xa thì về chỗ cũ)
        const far = Math.hypot(p.x - home.x, p.z - home.z) > 0.3;
        const x = far ? home.x : home.x + (Math.random() - 0.6) * 0.9;
        const z = far ? home.z : home.z + (Math.random() - 0.3) * 0.8;
        if (!(await e.glideTo(x, z, 0.8)) || !ok()) return;
        await e.face(Math.random() < 0.5 ? cam : this.princess.chestWorld(this._v), 500);
      } else if (r < 0.6) {
        // ngắm tượng một lúc rồi quay ra bé
        await e.face(this.princess.chestWorld(this._v), 500);
        await wait(1600 + Math.random() * 900);
        if (!ok()) return;
        await e.face(cam, 500);
      } else if (r < 0.85) {
        await e.face(cam, 400);
        if (!ok()) return;
        if (this.awake && this.princess.idle) void this.princess.wave(1.2);
        await e.wave(1.5);
      } else {
        await e.face(null, 400);
        if (ok()) await e.play('great');
      }
    } finally {
      if (my === this.lifeToken) { this.lifeRunning = false; this.lifeT = 5 + Math.random() * 4; }
    }
  }

  private sparkleAround(n: number): void {
    const c = this.princess.chestWorld();
    const [a, b] = this.def.magicColors;
    this.engine.magic.burst(c, n, a, 2.2, 0.5, 1.6, -1.2);
    this.engine.magic.burst(c, Math.round(n * 0.6), b, 1.8, 0.45, 1.5, -1.2);
    this.engine.magic.burst(c, Math.round(n * 0.4), 0xffb000, 1.6, 0.4, 1.4, -1.2);
  }

  /** Băng tan → ánh sáng ấm dần, viền băng màn hình mờ đi. */
  private applyMeltLook(): void {
    const m = this.melt;
    const icy = new THREE.Color(0xc9e8ff), warm = new THREE.Color(0xfff6fb);
    this.hemi.color.copy(icy).lerp(warm, m);
    this.hemi.intensity = 0.95 + 0.25 * m;
    this.key.intensity = 1.6 + 0.6 * m;
    this.key.color.copy(new THREE.Color(0xdcecff)).lerp(new THREE.Color(0xfff3e0), m);
    setFrost(this.awake ? 0 : 0.85 * (1 - m));
  }

  private exit(): void {
    if (!this.alive) return;
    stopSpeech();
    this.challenge.abort();
    this.alive = false;
    sfx('sfx_tap', 0.5);
    this.opts.onExit();
  }

  update(dt: number): void {
    this.time += dt;
    // watchdog phòng: không có luồng chơi, không bảng câu hỏi, không nút cuối phòng quá 15 s → chạy lại / hiện nút
    const nothing = this.alive && !this.flowRunning && els.panel.hidden && els.actions.hidden;
    this.stuckT = nothing ? this.stuckT + dt : 0;
    if (this.stuckT > 15) {
      this.stuckT = 0;
      console.warn(`[room ${this.def.id}] watchdog: 15 s không có gì để chạm → gỡ kẹt`);
      void this.restartFlow();
    }
    this.thinkCooldown -= dt;
    this.princess?.update(dt);
    this.elsa?.update(dt);
    if (this.elsa?.loaded && this.elsaHold === 0 && !this.lifeRunning && this.alive) {
      this.lifeT -= dt;
      if (this.lifeT <= 0) void this.elsaIdle();
    }
    // lấp lánh băng quanh Elsa
    if (this.elsa && Math.random() < 0.06) {
      const ep = this.elsa.root.position;
      this.engine.magic.twinkle(this._v.set(ep.x + (Math.random() - 0.5) * 0.8, ep.y + 0.2 + Math.random() * 1.6, ep.z + (Math.random() - 0.5) * 0.6), Math.random() < 0.6 ? 0x4fb3ff : 0xb48bff, 1, 0.2, 0.2);
    }
    // tuyết rơi nhẹ khi còn đóng băng
    if (!this.awake && Math.random() < 0.5 * (1 - this.melt * 0.7)) {
      this.engine.magic.emit({
        x: (Math.random() - 0.5) * 9, y: 4.5, z: (Math.random() - 0.5) * 4 + 0.5, color: Math.random() < 0.5 ? 0xffffff : 0x9fd8ff,
        vy: -0.7 - Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.3, max: 5, size: 0.14 + Math.random() * 0.12, drag: 1,
      });
    }
    // lấp lánh quanh công chúa đã tỉnh
    if (this.awake && Math.random() < 0.12) {
      const c = this.princess.root.position;
      this.engine.magic.twinkle(this._v.set(c.x + (Math.random() - 0.5) * 1.4, c.y + Math.random() * 1.9, c.z + 0.3), Math.random() < 0.5 ? this.def.magicColors[0] : 0xffc233, 1, 0.2, 0.3);
    }
    try { this.def.ambient?.(this.ctx, dt); } catch (e) { console.error(`[room ${this.def.id}] ambient lỗi`, e); this.def.ambient = undefined; }
  }

  dispose(): void {
    this.alive = false;
    this.lifeToken++;
    clearFamily();
    this.challenge?.dispose();
    this.unbind.forEach((f) => f());
    this.unbind = [];
    clearTalk();
    showActions(false, false);
    setFrost(0);
    els.debug.hidden = true;
    els.debug.innerHTML = '';
    this.princess?.dispose();
    this.elsa?.dispose();
    disposeTree(this.scene);
    // tượng full-res chỉ phòng này dùng (sảnh dùng bản lod/) → trả bộ nhớ GPU
    evictGLB(this.def.princessModel);
  }

  // ------------------------------------------------------------------ debug
  private buildDebug(): void {
    const box = els.debug;
    box.hidden = false;
    box.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'row';
    const btn = (label: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; row.appendChild(b); };
    btn('✔ đúng', () => this.challenge.skip());
    btn('✨ tỉnh ngay', () => { this.challenge.abort(); void this.wakeUp(); });
    btn('🧊 tan 1 nấc', () => { if (this.princess.ice && this.princess.ice.level < 2) { void this.princess.ice.meltStep(this.engine.magic); this.melt = Math.min(1, this.melt + 1 / 3); this.applyMeltLook(); } });
    btn('💃 xoay', () => void this.princess.twirl());
    btn('🙇 chào', () => void this.princess.curtsy());
    btn('👋 vẫy', () => void this.princess.wave(2));
    box.appendChild(row);
    const errs = validateRoom(this.def);
    const pre = document.createElement('pre');
    pre.className = errs.length ? 'bad' : 'ok';
    pre.textContent = errs.length ? `❌ ${this.def.id}: ${errs.length} lỗi\n- ${errs.join('\n- ')}` : `✅ ${this.def.id}: hợp đồng OK (${this.def.words.length} từ). Đang soát audio…`;
    box.appendChild(pre);
    void this.checkAudio(pre, errs.length === 0);
    toast('DEBUG', 800);
  }

  /** Thử tải mọi audio key phòng cần; liệt kê key thiếu. */
  private async checkAudio(pre: HTMLElement, ok: boolean): Promise<void> {
    const keys = roomAudioKeys(this.def);
    const missing: string[] = [];
    await Promise.all(keys.map(async (k) => {
      try { const r = await fetch(`${import.meta.env.BASE_URL}audio/${k}.m4a`, { method: 'HEAD' }); if (!r.ok || !(r.headers.get('content-type') ?? '').includes('audio')) missing.push(k); } catch { missing.push(k); }
    }));
    if (missing.length) {
      pre.className = 'bad';
      pre.textContent += `\n❌ thiếu ${missing.length} audio: ${missing.join(', ')}\n→ thêm dòng vào scripts/audio/${this.def.id}.txt rồi chạy bash scripts/gen-audio.sh`;
    } else pre.textContent += ok ? `\n✅ đủ ${keys.length} audio` : `\n✅ audio đủ (${keys.length})`;
    (window as unknown as Record<string, unknown>).__roomCheck = { errors: pre.className === 'bad' ? pre.textContent : null, missing };
  }
}


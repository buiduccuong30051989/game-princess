// Động cơ chung: 1 renderer, 1 hệ hạt phép, vòng lặp, đổi màn (Sảnh ↔ Phòng) có mờ dần, chạm 3D.
import * as THREE from 'three';
import { Magic } from '../magic.ts';
import { updateTweens, finishAllTweens, wait } from '../tween.ts';

export interface GameScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** gọi sau khi màn đã hiện (fade xong) */
  enter?(): void;
  update(dt: number, t: number): void;
  /** khung hình đổi cỡ: chỉnh camera */
  resize(aspect: number): void;
  /** chạm màn hình: toạ độ NDC (-1..1) */
  onTap?(ndc: THREE.Vector2): void;
  dispose(): void;
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly magic: Magic;
  current: GameScene | null = null;
  private readonly timer = new THREE.Timer();
  private t = 0;
  private switching = false;
  private readonly fadeEl: HTMLElement;
  /** hàng đợi callback chạy mỗi frame (ngoài scene) */
  readonly hooks = new Set<(dt: number) => void>();
  fps = 60;
  /** dựng màn lỗi (mạng chập chờn, thiếu file): gọi để về màn an toàn (sảnh). Không có → chờ chạm để tải lại trang. */
  onSceneError: ((failures: number) => void) | null = null;
  private failures = 0;

  constructor(container: HTMLElement, fadeEl: HTMLElement) {
    this.fadeEl = fadeEl;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV });
    // iPad: màn retina + MSAA + bóng nặng → giới hạn 1.5 trên máy cảm ứng
    const touch = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // màu tươi, không bị nén xám
    container.appendChild(this.renderer.domElement);
    this.magic = new Magic(null, 620, THREE.NormalBlending); // nền sáng: additive bị hoà trắng
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // chạm: pointerup, bỏ qua kéo dài
    let down: { x: number; y: number } | null = null;
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) return;
      down = null;
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (!this.switching) this.current?.onTap?.(ndc);
    });
  }

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.magic.setPointScale(this.renderer.getDrawingBufferSize(new THREE.Vector2()).y * 0.39);
    this.current?.resize(w / h);
  }

  get aspect(): number { return window.innerWidth / window.innerHeight; }

  /** Đổi màn: mờ ra → huỷ màn cũ → dựng màn mới (có thể lâu: hiện vòng xoay) → mờ vào → enter(). */
  async show(make: () => Promise<GameScene>): Promise<GameScene | null> {
    this.switching = true;
    this.fadeEl.classList.add('on');
    await wait(this.current ? 420 : 0);
    const old = this.current;
    this.current = null;
    finishAllTweens();
    if (old) old.dispose();
    this.magic.clear();
    this.fadeEl.classList.add('loading');
    let next: GameScene;
    try {
      next = await make();
      this.failures = 0;
    } catch (e) {
      // KHÔNG để bé kẹt màn hồng: thử về sảnh (tối đa 2 lần), sau đó chờ chạm để tải lại trang
      console.error('[engine] dựng màn lỗi', e);
      this.failures++;
      this.switching = false;
      if (this.onSceneError && this.failures <= 2) {
        await wait(600);
        this.onSceneError(this.failures);
      } else {
        this.fadeEl.addEventListener('pointerup', () => location.reload(), { once: true });
      }
      return null;
    } finally {
      this.fadeEl.classList.remove('loading');
    }
    this.magic.attach(next.scene);
    next.resize(this.aspect);
    this.current = next;
    // render 1 frame để compile shader trước khi hiện
    this.renderer.compile(next.scene, next.camera);
    this.renderer.render(next.scene, next.camera);
    this.fadeEl.classList.remove('on');
    this.switching = false;
    next.enter?.();
    return next;
  }

  start(): void {
    let frames = 0, acc = 0;
    this.renderer.setAnimationLoop(() => {
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 0.05);
      this.t += dt;
      frames++; acc += dt;
      if (acc >= 1) { this.fps = frames / acc; frames = 0; acc = 0; }
      updateTweens(dt);
      for (const h of this.hooks) h(dt);
      const cur = this.current;
      if (cur) {
        cur.update(dt, this.t);
        this.magic.update(dt);
        this.renderer.render(cur.scene, cur.camera);
      }
    });
  }
}

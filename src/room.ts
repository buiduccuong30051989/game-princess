// Phòng gương: renderer, camera cố định, sàn + tường + gương + rèm + bệ xoay, loader GLB, hạt phép.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PALETTE } from './data';
import { Magic } from './magic';
import { updateTweens } from './tween';

export class Room {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly magic: Magic;
  readonly pedestal = new THREE.Group();   // xoay chậm, chứa nhân vật + đồ trên bệ
  spin = true;
  private readonly timer = new THREE.Timer();
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();
  private readonly fixed = new Map<THREE.Material, THREE.Material>();
  private readonly sparkleAt: THREE.Vector3[] = [];
  private t = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(PALETTE.bg);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 2.4, 8.2);
    this.camera.lookAt(0, 1.35, 0);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.buildLights();
    this.buildRoom();
    this.scene.add(this.pedestal);
    this.magic = new Magic(this.scene, 620, THREE.NormalBlending); // nền sáng: additive bị hoà trắng
  }

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    // màn dọc: lùi camera để lọt nhân vật + bệ
    this.camera.position.z = w / h < 1 ? 8.2 / (w / h) * 0.9 : 8.2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff6fb, 0xf3d6ea, 1.2));
    const key = new THREE.DirectionalLight(0xfff5e8, 2.2);
    key.position.set(3, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -5; key.shadow.camera.right = 5;
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 1; key.shadow.camera.far = 25;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
    key.shadow.intensity = 0.4;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfeeff, 0.9);
    fill.position.set(-4, 4, 3);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0xffc6e6, 6, 12);
    rim.position.set(0, 3.2, -2.5);
    this.scene.add(rim);
  }

  private gradientPlane(w: number, h: number, top: number, bottom: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(w, h, 1, 1);
    const c = new Float32Array(4 * 3);
    const ct = new THREE.Color(top), cb = new THREE.Color(bottom);
    [ct, ct, cb, cb].forEach((col, i) => { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; });
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  }

  private buildRoom(): void {
    // tường sau gradient
    const wall = this.gradientPlane(30, 14, PALETTE.wallTop, PALETTE.wallBottom);
    wall.position.set(0, 6, -6);
    this.scene.add(wall);

    // sàn ô vuông pastel
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const tileMat = new THREE.MeshStandardMaterial({ color: PALETTE.floorTile, roughness: 0.9 });
    for (let i = -6; i <= 6; i++) for (let j = -3; j <= 6; j++) {
      if ((i + j) % 2 !== 0) continue;
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(i * 2, 0.003, j * 2 - 6);
      tile.receiveShadow = true;
      this.scene.add(tile);
    }

    // 2 gương vòm + khung vàng
    for (const x of [-4.2, 4.2]) {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.09, 12, 64), new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.5 }));
      frame.position.set(x, 2.6, -5.8);
      frame.scale.y = 1.6;
      this.scene.add(frame);
      const glass = this.gradientPlane(1, 1, 0xf3fbff, PALETTE.mirror);
      glass.geometry = new THREE.CircleGeometry(1.2, 48);
      glass.material = new THREE.MeshStandardMaterial({ color: PALETTE.mirror, roughness: 0.15, emissive: 0xbfe6ff, emissiveIntensity: 0.35 });
      glass.position.set(x, 2.6, -5.85);
      glass.scale.y = 1.6;
      this.scene.add(glass);
      // vệt sáng chéo trên gương
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
      streak.position.set(x - 0.45, 2.8, -5.84);
      streak.rotation.z = 0.35;
      this.scene.add(streak);
      this.sparkleAt.push(new THREE.Vector3(x, 2.6, -5.7));
    }
    // cửa sổ vòm giữa: ánh sáng
    const win = this.gradientPlane(2.6, 4.2, 0xfff8e1, 0xffe0f0);
    win.position.set(0, 3.4, -5.85);
    this.scene.add(win);
    const winFrame = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 12, 40, Math.PI), new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.5 }));
    winFrame.position.set(0, 4.1, -5.8);
    this.scene.add(winFrame);

    // rèm hồng hai bên
    const curtain = new THREE.MeshStandardMaterial({ color: PALETTE.curtain, roughness: 1 });
    const curtainDark = new THREE.MeshStandardMaterial({ color: PALETTE.curtainDark, roughness: 1 });
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 6.5, 12), k % 2 ? curtainDark : curtain);
        fold.position.set(side * (6.2 + k * 0.45), 3.2, -5.4 + k * 0.05);
        fold.castShadow = true;
        this.scene.add(fold);
      }
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 10, 24), new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.5 }));
      tie.position.set(side * 6.9, 2.0, -5.0);
      tie.rotation.y = Math.PI / 2;
      this.scene.add(tie);
    }

    // đèn chùm: cầu sáng + hạt lấp lánh
    const chandelier = new THREE.Group();
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
    chandelier.add(glow);
    for (let i = 0; i < 8; i++) {
      const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color: 0xdff3ff, emissive: 0xbfe9ff, emissiveIntensity: 0.6 }));
      const a = (i / 8) * Math.PI * 2;
      drop.position.set(Math.cos(a) * 0.7, -0.3 - (i % 2) * 0.2, Math.sin(a) * 0.7);
      chandelier.add(drop);
    }
    chandelier.position.set(0, 5.6, -1.5);
    this.scene.add(chandelier);
    this.sparkleAt.push(new THREE.Vector3(0, 5.3, -1.5));

    // bệ xoay
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 0.28, 64), new THREE.MeshStandardMaterial({ color: PALETTE.pedestal, roughness: 0.6 }));
    base.position.y = 0.14;
    base.receiveShadow = true; base.castShadow = true;
    this.pedestal.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.06, 12, 64), new THREE.MeshStandardMaterial({ color: PALETTE.pedestalRim, roughness: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.29;
    this.pedestal.add(ring);
    // bệ phụ 2 bên (cố định, không xoay)
    for (const x of [-2.3, 2.3]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.2, 40), new THREE.MeshStandardMaterial({ color: PALETTE.pedestal, roughness: 0.6 }));
      s.position.set(x, 0.1, 0.2);
      s.receiveShadow = true; s.castShadow = true;
      this.scene.add(s);
    }
  }

  // ---------- GLB ----------
  load(name: string): Promise<GLTF> {
    let p = this.cache.get(name);
    if (!p) { p = this.loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}`); this.cache.set(name, p); }
    return p;
  }

  async instance(name: string): Promise<{ obj: THREE.Object3D; clips: THREE.AnimationClip[] }> {
    const gltf = await this.load(name);
    const obj = SkeletonUtils.clone(gltf.scene);
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        mesh.material = this.fix(mesh.material);
      }
    });
    return { obj, clips: gltf.animations };
  }

  /** metalness 0 (glTF mặc định 1 → đen), giữ texture; clone để chỉnh opacity riêng từng instance. */
  private fix(mat: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
    if (Array.isArray(mat)) return mat.map((m) => this.fix(m) as THREE.Material);
    let out = this.fixed.get(mat);
    if (!out) {
      const m = mat.clone() as THREE.MeshStandardMaterial;
      if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(0.6, m.roughness ?? 1); }
      if (m.transparent && m.opacity < 0.05) m.opacity = 1; // vài model để alpha 0 sai
      out = m;
      this.fixed.set(mat, out);
    }
    return out;
  }

  /** Scale về chiều cao, chân chạm y=0, tâm x/z về 0 (theo bbox bind-pose). */
  fitHeight(obj: THREE.Object3D, height: number): number {
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

  emojiSprite(emoji: string, size = 1): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 140);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.setScalar(size);
    return sp;
  }

  start(update: (dt: number, t: number) => void): void {
    this.renderer.setAnimationLoop(() => {
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 0.05);
      this.t += dt;
      updateTweens(dt);
      if (this.spin) this.pedestal.rotation.y += dt * 0.25;
      // lấp lánh nền
      if (Math.random() < 0.35) {
        const p = this.sparkleAt[Math.floor(Math.random() * this.sparkleAt.length)];
        this.magic.twinkle(p, Math.random() < 0.5 ? 0xffffff : PALETTE.pink, 1, 1.6, 0.4);
      }
      update(dt, this.t);
      this.magic.update(dt);
      this.renderer.render(this.scene, this.camera);
    });
  }
}

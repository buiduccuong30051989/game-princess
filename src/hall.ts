// ĐẠI SẢNH: sảnh tròn lát đá hoa, 11 bệ xếp vòng quanh sân khấu giữa (Elsa dẫn đường đứng đó),
// sau mỗi bệ là 1 cánh cửa phòng. Bệ: tượng băng (chưa cứu) / công chúa thở, vẫy (đã cứu). Chạm bệ → vào phòng.
// Cứu đủ 3/6/9/11 → dạ hội mini (đèn màu, nhạc hộp, pháo hoa, công chúa xoay váy); 11 → Elsa thay váy băng Frozen 1.
// Sảnh "sống": lúc rảnh Elsa tự lướt đi thăm bệ / ra trước vẫy bé / xoay tung tuyết; tuyết rơi lác đác;
// khung ảnh "Gia đình Nhím" ở góc phải (chạm vào → người nhà cổ vũ). Dạ hội: cả nhà lần lượt cổ vũ.
import * as THREE from 'three';
import { PARAMS } from './core/params.ts';
import type { Engine, GameScene } from './core/engine.ts';
import { emojiTexture, disposeTree, prefetch, lodModel } from './core/assets.ts';
import { type Progress, isUnlocked, isSaved, markBall, ROOM_ORDER, BALL_MILESTONES } from './core/progress.ts';
import { ROOMS } from './rooms/index.ts';
import { princessInfo } from './rooms/princesses.ts';
import { PrincessActor } from './princess.ts';
import { ElsaGuide, ELSA_MODEL } from './elsa.ts';
import { play, sfx, musicBox, stopMusic, chime, WALTZ, CHIME_BIG, stopSpeech } from './audio.ts';
import { els, showHud, setStars, confetti, showActions, banner } from './ui.ts';
import { FAMILY, photoUrl, familyCheer, familyCheerAll, familyBusy, clearFamily } from './family.ts';
import { tween, wait, easeOutBack, easeInOutSine } from './tween.ts';
import { mergeStatic } from './core/merge.ts';
import type { RoomDef, RoomId } from './room/types.ts';
import {
  mat, glowMat, texMat, canvasTex, tileTex, wallpaperTex, floor, pillar, glow, mix, bunting, fairyLights, css,
} from './room/kit.ts';

const STATUE_H = 1.45;
const PED_H = 0.55;
const RING = { cz: -1.2 };
const WALL = { rx: 9.8, rz: 7.4, cz: -1.2, h: 7.5 };
/**
 * Vị trí 11 bệ: hình móng ngựa (cánh trái từ trước ra sau → hàng sau → cánh phải từ sau ra trước).
 * Đã tính để huy hiệu trên đầu cách nhau ≥ 80 px ở 16:10 và vẫn lọt khung ở 4:3.
 */
const SLOT_POS: [number, number][] = [
  [-5.8, 2.6], [-6.6, 0.2], [-6.6, -2.4], [-4.6, -4.4], [-2.3, -5.2], [0, -5.4], [2.3, -5.2], [4.6, -4.4], [6.6, -2.4], [6.6, 0.2], [5.8, 2.6],
];
/** góc (rad) của mỗi bệ nhìn từ tâm sảnh: 0 = phía sau (-z), + = sang phải */
const ANGLES = SLOT_POS.map(([x, z]) => Math.atan2(x, -(z - RING.cz)));
const BADGE = 0.072;
const STAGE = new THREE.Vector3(0, 0, 0.5);
const STAGE_H = 0.42;

interface Slot {
  def: RoomDef;
  index: number;
  angle: number;
  base: THREE.Group;          // bệ + tượng
  actor: PrincessActor | null;
  loading: Promise<void> | null;
  badge: THREE.Sprite;
  badgeState: string;
  hit: THREE.Mesh;
  door: THREE.Group;
  doorPanel: THREE.Mesh;
  ringGlow: THREE.Mesh;
}

export interface HallOpts {
  progress: Progress;
  /** vừa cứu xong phòng này (chạy màn chào đón) */
  arrival?: RoomId | null;
  onOpenRoom(id: RoomId): void;
  /** debug: ép chạy dạ hội mốc n */
  forceBall?: number;
}

export class HallScene implements GameScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
  private readonly engine: Engine;
  private readonly opts: HallOpts;
  private readonly slots: Slot[] = [];
  private elsa!: ElsaGuide;
  private elsaF1: PrincessActor | null = null;
  private hemi!: THREE.HemisphereLight;
  private key!: THREE.DirectionalLight;
  private chandelier!: THREE.Group;
  private discoLights: THREE.PointLight[] = [];
  private busy = true;
  /** đã chạm 1 cửa, đang mở phòng: chặn mọi chạm khác (flow() không được nhả cờ này) */
  private opening = false;
  /** cửa vừa được mở nhờ công chúa mới cứu: vẽ như còn khoá tới lúc arrival() bật nó lên */
  private pendingDoor: RoomId | null = null;
  /** giây bé chưa chạm gì (nhắc lại khi quá lâu) */
  private idleT = 0;
  private alive = true;
  private time = 0;
  private lastLine: string | null = null;
  private readonly raycaster = new THREE.Raycaster();
  // Elsa tự hoạt động lúc rảnh (lifeToken: lệnh mới / bé chạm → huỷ chuỗi đang chạy)
  private readonly elsaHome = new THREE.Vector3(STAGE.x, STAGE_H, STAGE.z + 0.2);
  private lifeT = 7;
  private lifeToken = 0;
  private lifeRunning = false;
  private elsaHit!: THREE.Mesh;
  private familyFrame: THREE.Group | null = null;
  private readonly snow: { sp: THREE.Sprite; speed: number; phase: number }[] = [];
  private readonly snowMats: THREE.SpriteMaterial[] = [];
  private readonly _v = new THREE.Vector3();
  private readonly onSay = () => { if (this.lastLine) void play(this.lastLine); };

  private constructor(engine: Engine, opts: HallOpts) {
    this.engine = engine;
    this.opts = opts;
    if (opts.arrival) {
      const id = ROOM_ORDER[3 + opts.progress.saved.length - 1];
      if (id && !isSaved(opts.progress, id)) this.pendingDoor = id;
    }
  }

  /** cửa đang mở và chưa cứu (tính cả cửa đang chờ màn chào đón bật lên) */
  private isOpen(id: RoomId): boolean {
    return id !== this.pendingDoor && isUnlocked(this.opts.progress, id);
  }

  static async create(engine: Engine, opts: HallOpts): Promise<HallScene> {
    const h = new HallScene(engine, opts);
    await h.build();
    return h;
  }

  private get finaleDone(): boolean { return this.opts.progress.balls.includes(11); }

  // ------------------------------------------------------------------ dựng sảnh
  private async build(): Promise<void> {
    this.scene.background = new THREE.Color(0xfbe3f1);
    this.scene.fog = new THREE.Fog(0xfbe3f1, 30, 60);
    this.buildLights();
    this.buildRoomShell();
    this.buildStage();
    ROOMS.forEach((def, i) => this.buildSlot(def, i));
    this.optimizeStatic();

    this.elsa = new ElsaGuide(1.9);
    this.elsa.root.position.copy(this.elsaHome);
    this.elsa.magic = this.engine.magic;
    this.elsa.groundAt = stageGround;
    this.scene.add(this.elsa.root);
    // vùng chạm Elsa (đi theo Elsa khi lướt)
    this.elsaHit = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2, 10), new THREE.MeshBasicMaterial({ visible: false }));
    this.elsaHit.position.y = 1;
    this.elsaHit.userData.elsa = true;
    this.elsa.root.add(this.elsaHit);
    this.buildSnow();
    const jobs: Promise<unknown>[] = [this.elsa.load().catch((e) => console.error('[hall] không tải được Elsa', e))];
    if (this.finaleDone) jobs.push(this.loadElsaF1(true).catch((e) => console.error('[hall] không tải được Elsa F1', e)));
    // tải trước tượng các bệ gần nhất (đã mở + vừa cứu); còn lại tải dần sau khi hiện sảnh
    for (const s of this.slots) {
      const p = this.opts.progress;
      if (s.index < 4 || isSaved(p, s.def.id)) jobs.push(this.loadStatue(s));
    }
    await Promise.all(jobs);
    if (this.finaleDone && this.elsaF1) this.elsa.root.visible = false;
    prefetch([ELSA_MODEL]);
  }

  /**
   * iPad (≤ 150 draw call): gộp đồ tĩnh của sảnh theo material (chậu hoa 50 quả cầu, đèn chùm, dây cờ, cột…), đồ trang trí
   * không đổ bóng. Giữ riêng thứ có hoạt cảnh: đèn chùm (đung đưa: gộp bên trong nó), khung ảnh gia đình (nhún khi chạm),
   * huy hiệu, vòng sáng, cánh cửa (đổi màu), vùng chạm.
   */
  private optimizeStatic(): void {
    if (PARAMS.nomerge) return;
    this.scene.traverse((o) => { o.castShadow = false; });
    this.resize(1180 / 820);
    const keep: THREE.Object3D[] = [this.chandelier];
    if (this.familyFrame) keep.push(this.familyFrame);
    const keepMats: THREE.Material[] = [];
    for (const s of this.slots) { keep.push(s.badge, s.hit, s.ringGlow, s.doorPanel); keepMats.push(s.ringGlow.material as THREE.Material, s.doorPanel.material as THREE.Material); }
    const st = mergeStatic(this.scene, { keep, keepMaterials: keepMats, camera: this.camera });
    if (import.meta.env.DEV) console.info(`[hall] gộp đồ tĩnh: ${st.meshesBefore} → ${st.meshesAfter} vật vẽ (${st.sprites} sprite → tấm phẳng)`);
  }

  private buildLights(): void {
    this.hemi = new THREE.HemisphereLight(0xfff7fb, 0xf5cde6, 1.15);
    this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xfff3e6, 1.9);
    key.position.set(4, 12, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); // iPad: 2048² PCF quá nặng
    const sc = key.shadow.camera;
    sc.left = -12; sc.right = 12; sc.top = 10; sc.bottom = -10; sc.near = 2; sc.far = 40;
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.04;
    key.shadow.intensity = 0.35;
    this.key = key;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xe4efff, 0.7);
    fill.position.set(-8, 6, 6);
    this.scene.add(fill);
    const center = new THREE.PointLight(0xffe2b0, 7, 16, 1.4);
    center.position.set(0, 5.2, -1.2);
    this.scene.add(center);
  }

  /** Sàn đá hoa, tường tròn giấy dán, cột, cửa sổ tròn kính màu, dây cờ, đèn chùm. */
  private buildRoomShell(): void {
    const s = this.scene;
    const f = floor(60, 60, texMat(tileTex(0xffe4f1, 0xfffaf5, [22, 22], 0xf3c6de), { rough: 0.55 }));
    s.add(f);
    // hoạ tiết tròn giữa sàn
    const inlay = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.55, 96), mat(0xffc94d, { rough: 0.4, emissive: 0x6b4200, ei: 0.2 }));
    inlay.rotation.x = -Math.PI / 2; inlay.position.set(0, 0.01, RING.cz);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(3.3, 96), texMat(canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#fff6fb'); gr.addColorStop(1, '#f7c6e3');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.translate(w / 2, h / 2);
      for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6);
        g.fillStyle = i % 2 ? '#c9a7ff' : '#9fdcff';
        g.beginPath(); g.moveTo(0, 30); g.lineTo(26, 150); g.lineTo(0, 250); g.lineTo(-26, 150); g.closePath(); g.fill();
      }
    }), { rough: 0.5 }));
    inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.008, RING.cz);
    s.add(inlay, inner);

    // thảm đỏ từ cửa chính tới sân khấu + 2 chậu hoa lớn hai bên
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 12), mat(0xe8435a, { rough: 0.9 }));
    runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.012, 7.6);
    runner.receiveShadow = true;
    s.add(runner);
    for (const x of [-1.38, 1.38]) {
      const trim = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 12), mat(0xffc94d, { rough: 0.5 }));
      trim.rotation.x = -Math.PI / 2; trim.position.set(x, 0.014, 7.6);
      s.add(trim);
    }
    s.add(this.flowerUrn(-2.9, 4.4));
    this.familyFrame = this.buildFamilyFrame();
    this.familyFrame.position.set(2.75, 0, 4.5);
    this.familyFrame.lookAt(0.6, 0, 12.6);
    s.add(this.familyFrame);
    // tường tròn (elip), giấy dán tím hồng sọc vàng
    const wallGeo = new THREE.CylinderGeometry(1, 1, WALL.h, 96, 1, true);
    const wallMat = texMat(wallpaperTex(0xf1e0ff, 0xe6ccff, 0xffd166, [18, 2]), { rough: 0.9, side: THREE.BackSide });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.scale.set(WALL.rx, 1, WALL.rz);
    wallMesh.position.set(0, WALL.h / 2, WALL.cz);
    wallMesh.receiveShadow = true;
    s.add(wallMesh);
    // chân tường + gờ trên
    for (const [y, hgt, c] of [[0.25, 0.5, 0xffffff], [WALL.h - 0.3, 0.6, 0xffe2a8]] as const) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, hgt, 96, 1, true), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.BackSide }));
      band.scale.set(WALL.rx - 0.05, 1, WALL.rz - 0.05);
      band.position.set(0, y, WALL.cz);
      s.add(band);
    }
    // cột giữa các cửa (bỏ 2 cột sát camera) + cửa sổ tròn kính màu trên mỗi cửa
    const mids = ANGLES.slice(0, -1).map((a, i) => (a + ANGLES[i + 1]) / 2);
    for (const a of mids) {
      const col = pillar(WALL.h - 0.6, 0.28, 0xfffaf6, 0xffc94d);
      col.position.copy(this.onWall(a, 0.35));
      s.add(col);
    }
    ANGLES.forEach((wa, i) => {
      const wp = this.onWall(wa, 0.08);
      const rose = this.roseWindow(ROOMS[i]);
      rose.position.set(wp.x, 5.4, wp.z);
      rose.lookAt(0, 5.4, WALL.cz);
      s.add(rose);
    });
    // dây cờ + dây đèn quanh tường
    const colors = [0xff5fb4, 0xffc233, 0x7fd8ff, 0xa78bfa, 0x58cc02];
    for (let i = 0; i < mids.length - 1; i++) {
      const p0 = this.onWall(mids[i], 0.45).setY(4.3), p1 = this.onWall(mids[i + 1], 0.45).setY(4.3);
      s.add(i % 2 ? bunting(p0, p1, colors, 0.45, 8) : fairyLights(p0, p1, 0.5, 10));
    }
    this.chandelier = this.buildChandelier();
    this.chandelier.position.set(0, 6.3, RING.cz);
    s.add(this.chandelier);
  }

  /** Chậu hoa lớn: chân vàng + bó hoa tròn nhiều màu. */
  private flowerUrn(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    const gold = mat(0xffc94d, { rough: 0.35, emissive: 0x6b4200, ei: 0.2 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.3, 24), gold);
    foot.position.y = 0.15;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.5, 32), mat(0xfffaf4, { rough: 0.4 }));
    bowl.position.y = 0.55;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 32), gold);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.8;
    g.add(lip);
    g.add(foot, bowl);
    const cols = [0xff5fb4, 0xffc233, 0xa78bfa, 0xff8a3d, 0xffffff, 0x7fd8ff];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.5, y = 0.85 + Math.sqrt(Math.max(0, 0.36 - r * r)) * 0.9;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.05, 10, 8), mat(cols[i % cols.length], { rough: 0.6 }));
      f.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      g.add(f);
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0x4caf50, { rough: 0.8 }));
      leaf.scale.set(1.4, 0.5, 0.8);
      leaf.position.set(Math.cos(a) * 0.48, 0.85, Math.sin(a) * 0.48);
      leaf.rotation.y = -a;
      g.add(leaf);
    }
    // chỉ chân + chậu đổ bóng (50 quả cầu hoa đổ bóng = 50 draw call thừa trong pass bóng)
    foot.castShadow = bowl.castShadow = true;
    g.position.set(x, 0, z);
    return g;
  }

  /** Khung ảnh "Gia đình Nhím" trên giá vẽ vàng: 5 ảnh tròn (ảnh thật nếu có trong public/family/, không thì emoji). */
  private buildFamilyFrame(): THREE.Group {
    const g = new THREE.Group();
    const gold = mat(0xffc94d, { rough: 0.35, emissive: 0x6b4200, ei: 0.25 });
    const W = 1.75, H = 1.25, cy = 1.5;
    // giá vẽ: 2 chân trước + 1 chân sau + thanh đỡ
    // chân nằm SAU tranh, không nhô quá mép trên khung
    for (const [x, z, rx] of [[-0.6, -0.06, 0], [0.6, -0.06, 0], [0, -0.5, -0.3]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.05, 8), gold);
      leg.position.set(x, 1.0, z);
      leg.rotation.x = rx;
      leg.castShadow = true;
      g.add(leg);
    }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.06, 0.16), gold);
    shelf.position.set(0, cy - H / 2 - 0.08, 0.12);
    g.add(shelf);
    // tranh
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 550;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const imgs = new Map<string, HTMLImageElement>();
    const draw = () => drawFamilyCanvas(canvas, imgs);
    draw();
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    pic.position.set(0, cy, 0.1);
    pic.rotation.x = -0.06;
    pic.userData.family = true;
    g.add(pic);
    // viền khung
    const t = 0.09;
    for (const [w, h, x, y] of [[W + 2 * t, t, 0, H / 2 + t / 2], [W + 2 * t, t, 0, -H / 2 - t / 2], [t, H, -W / 2 - t / 2, 0], [t, H, W / 2 + t / 2, 0]] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), gold);
      b.position.set(x, cy + y, 0.1);
      b.rotation.x = -0.06;
      g.add(b);
    }
    const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('💖'), transparent: true, depthWrite: false }));
    heart.scale.setScalar(0.42);
    heart.position.set(W / 2 + 0.05, cy + H / 2 + 0.12, 0.2);
    g.add(heart);
    g.userData.heart = heart;
    // ảnh thật (nếu có): tải xong vẽ lại
    for (const m of FAMILY) {
      const url = photoUrl(m.id);
      if (!url) continue;
      const img = new Image();
      img.onload = () => { if (!this.alive) return; imgs.set(m.id, img); draw(); tex.needsUpdate = true; };
      img.src = url;
    }
    return g;
  }

  /** Tuyết rơi lác đác trong sảnh: 18 bông emoji, 3 material dùng chung (xoay khác nhau), không tạo object mỗi frame. */
  private buildSnow(): void {
    const tex = emojiTexture('❄️');
    for (let i = 0; i < 3; i++) this.snowMats.push(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }));
    for (let i = 0; i < 18; i++) {
      const sp = new THREE.Sprite(this.snowMats[i % 3]);
      sp.scale.setScalar(0.2 + Math.random() * 0.2);
      sp.position.set((Math.random() - 0.5) * 17, Math.random() * 7.5, -6 + Math.random() * 11);
      this.scene.add(sp);
      this.snow.push({ sp, speed: 0.35 + Math.random() * 0.4, phase: Math.random() * 10 });
    }
  }

  private onWall(a: number, inset = 0): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(a) * (WALL.rx - inset), 0, WALL.cz - Math.cos(a) * (WALL.rz - inset));
  }

  private roseWindow(def: RoomDef): THREE.Group {
    const g = new THREE.Group();
    const p = def.palette;
    const tex = canvasTex(256, 256, (c, w) => {
      c.translate(w / 2, w / 2);
      for (let i = 0; i < 8; i++) {
        c.rotate(Math.PI / 4);
        c.fillStyle = css(i % 2 ? p.primary : p.secondary);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 120, 0, Math.PI / 4); c.closePath(); c.fill();
      }
      c.fillStyle = css(p.accent); c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff4d6'; c.lineWidth = 8;
      for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(0, 40); c.lineTo(0, 120); c.stroke(); }
      c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.72, 48), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.08, 10, 48), mat(0xffc94d, { rough: 0.4 }));
    g.add(disc, ring);
    return g;
  }

  private buildChandelier(): THREE.Group {
    const g = new THREE.Group();
    const gold = mat(0xffc94d, { rough: 0.35, emissive: 0x6b4200, ei: 0.3 });
    for (const [r, y] of [[1.6, 0], [1.0, 0.55]] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 10, 64), gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
      const n = Math.round(r * 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glowMat(0xfff1c4));
        bulb.position.set(Math.cos(a) * r, y + 0.14, Math.sin(a) * r);
        g.add(bulb);
        const h = glow(0xffe2a0, 0.55, 0.7);
        h.position.copy(bulb.position);
        g.add(h);
        const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), mat(0xe0f6ff, { rough: 0.1, emissive: 0x9fdcff, ei: 0.5 }));
        drop.position.set(Math.cos(a + 0.2) * r, y - 0.3, Math.sin(a + 0.2) * r);
        drop.scale.y = 1.8;
        g.add(drop);
      }
    }
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 8), gold);
    chain.position.y = 2;
    g.add(chain);
    const core = glow(0xfff0c8, 3.2, 0.5);
    core.position.y = 0.3;
    g.add(core);
    return g;
  }

  /** Sân khấu giữa 2 tầng cho Elsa. */
  private buildStage(): void {
    const g = new THREE.Group();
    const layers: [number, number, number][] = [[1.7, 0.2, 0xffffff], [1.35, 0.22, 0xd9c2ff]];
    let y = 0;
    for (const [r, h, c] of layers) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.06, h, 64), mat(c, { rough: 0.45 }));
      d.position.y = y + h / 2;
      d.castShadow = true; d.receiveShadow = true;
      g.add(d);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.035, 8, 72), mat(0xffc94d, { rough: 0.35 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y + h;
      g.add(rim);
      y += h;
    }
    const snow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 6), texMat(emojiTexture('❄️'), { rough: 0.6 }));
    snow.rotation.x = -Math.PI / 2;
    snow.position.y = y + 0.005;
    (snow.material as THREE.MeshStandardMaterial).transparent = true;
    g.add(snow);
    g.position.copy(STAGE);
    this.scene.add(g);
  }

  // ------------------------------------------------------------------ bệ + cửa
  private slotPos(index: number): THREE.Vector3 {
    return new THREE.Vector3(SLOT_POS[index][0], 0, SLOT_POS[index][1]);
  }

  private buildSlot(def: RoomDef, index: number): void {
    const angle = ANGLES[index];
    const pal = def.palette;
    const base = new THREE.Group();
    base.position.copy(this.slotPos(index));
    // quay mặt về phía camera (điểm trước sân khấu)
    base.lookAt(new THREE.Vector3(0, 0, 9));
    const marble = mat(0xfffaf4, { rough: 0.4 });
    const band = mat(pal.primary, { rough: 0.5 });
    const gold = mat(0xffc94d, { rough: 0.35, emissive: 0x6b4200, ei: 0.2 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.16, 48), marble);
    plinth.position.y = 0.08;
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, PED_H - 0.26, 48), band);
    mid.position.y = 0.16 + (PED_H - 0.26) / 2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.74, 0.1, 48), marble);
    top.position.y = PED_H - 0.05;
    for (const m of [plinth, mid, top]) { m.castShadow = true; m.receiveShadow = true; }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 48), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = PED_H;
    base.add(plinth, mid, top, rim);
    // huy hiệu emoji trước bệ
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), texMat(emojiTexture(def.emoji), { rough: 0.6 }));
    (plate.material as THREE.MeshStandardMaterial).transparent = true;
    plate.position.set(0, 0.3, 0.73);
    base.add(plate);
    // vòng sáng dưới chân khi bệ đang mở, chờ cứu
    const ringGlow = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.25, 48), new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.0, depthWrite: false, fog: false }));
    ringGlow.rotation.x = -Math.PI / 2;
    ringGlow.position.y = 0.02;
    base.add(ringGlow);
    this.scene.add(base);

    // vùng chạm lớn (vô hình): bệ + tượng
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.2, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.6;
    hit.userData.slot = index;
    base.add(hit);

    // huy hiệu nổi trên đầu (cỡ cố định trên màn hình)
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(def.emoji), sizeAttenuation: false, depthTest: false, transparent: true }));
    badge.scale.setScalar(BADGE);
    badge.position.set(0, PED_H + STATUE_H + 0.45, 0);
    badge.renderOrder = 5;
    badge.userData.slot = index;
    base.add(badge);

    // cửa phòng trên tường phía sau
    const door = new THREE.Group();
    const wp = this.onWall(angle, 0.12);
    door.position.copy(wp);
    door.lookAt(0, 0, WALL.cz);
    const dw = 1.7, dh = 3.1, r = dw / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, dh - r); shape.absarc(0, dh - r, r, 0, Math.PI, false); shape.lineTo(-r, 0);
    const doorPanel = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), mat(pal.primary, { rough: 0.6 }));
    doorPanel.position.z = 0.02;
    door.add(doorPanel);
    const frameShape = new THREE.Shape();
    const t = 0.16;
    frameShape.moveTo(-r - t, 0); frameShape.lineTo(r + t, 0); frameShape.lineTo(r + t, dh - r); frameShape.absarc(0, dh - r, r + t, 0, Math.PI, false); frameShape.lineTo(-r - t, 0);
    const hole = new THREE.Path();
    hole.moveTo(-r, 0); hole.lineTo(-r, dh - r); hole.absarc(0, dh - r, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.lineTo(-r, 0);
    frameShape.holes.push(hole);
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.12, bevelEnabled: false, curveSegments: 24 }), gold);
    door.add(frame);
    // 2 cánh cửa: đường giữa + tay nắm
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, dh - 0.1, 0.02), mat(mix(pal.primary, 0x000000, 0.3)));
    seam.position.set(0, (dh - 0.1) / 2, 0.04);
    door.add(seam);
    for (const x of [-0.14, 0.14]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), gold);
      knob.position.set(x, 1.35, 0.08);
      door.add(knob);
    }
    const doorBadge = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), texMat(emojiTexture(def.emoji), { rough: 0.6 }));
    (doorBadge.material as THREE.MeshStandardMaterial).transparent = true;
    doorBadge.position.set(0, dh - 0.55, 0.06);
    door.add(doorBadge);
    this.scene.add(door);

    const slot: Slot = { def, index, angle, base, actor: null, loading: null, badge, badgeState: '', hit, door, doorPanel, ringGlow };
    this.slots.push(slot);
    this.refreshSlot(slot);
  }

  /** Cập nhật huy hiệu, màu cửa, vòng sáng theo trạng thái khoá / mở / đã cứu. */
  private refreshSlot(s: Slot): void {
    const p = this.opts.progress;
    const saved = isSaved(p, s.def.id), open = this.isOpen(s.def.id);
    const state = saved ? 'saved' : open ? 'open' : 'locked';
    if (s.badgeState !== state) {
      s.badgeState = state;
      const old = s.badge.material.map;
      s.badge.material.map = this.badgeTexture(s.def, state);
      s.badge.material.needsUpdate = true;
      if (old && old !== emojiTexture(s.def.emoji)) old.dispose();
    }
    const doorMat = s.doorPanel.material as THREE.MeshStandardMaterial;
    doorMat.color.setHex(open ? s.def.palette.primary : mix(s.def.palette.primary, 0x9a8fa8, 0.75));
    doorMat.emissive.setHex(open && !saved ? mix(s.def.palette.primary, 0x000000, 0.6) : 0x000000);
  }

  private badgeTexture(def: RoomDef, state: string): THREE.CanvasTexture {
    return canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      g.fillStyle = 'rgba(74,44,74,0.25)';
      g.beginPath(); g.arc(c, c + 8, 104, 0, Math.PI * 2); g.fill();
      g.fillStyle = state === 'locked' ? '#d9d2e3' : state === 'saved' ? '#ffd24d' : css(mix(def.palette.primary, 0xffffff, 0.25));
      g.beginPath(); g.arc(c, c, 104, 0, Math.PI * 2); g.fill();
      g.lineWidth = 12; g.strokeStyle = '#4a2c4a';
      g.beginPath(); g.arc(c, c, 104, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.arc(c, c, 90, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
      g.font = '120px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = state === 'locked' ? 0.45 : 1;
      g.fillText(def.emoji, c, c + 10);
      g.globalAlpha = 1;
      if (state === 'locked') { g.font = '90px "Apple Color Emoji", sans-serif'; g.fillText('🔒', c + 58, c + 62); }
      if (state === 'saved') { g.font = '84px "Apple Color Emoji", sans-serif'; g.fillText('⭐', c + 64, c - 58); }
    });
  }

  private loadStatue(s: Slot, popIn = false): Promise<void> {
    if (s.loading) return s.loading;
    const saved = isSaved(this.opts.progress, s.def.id);
    const info = princessInfo(s.def.princessModel);
    // bản nhẹ (texture 512): 11 tượng full-res ≈ 87 MB texture GPU, quá nặng cho iPad
    const actor = new PrincessActor({ model: lodModel(s.def.princessModel), height: STATUE_H, tuning: { ...info?.tuning, ...s.def.pose }, hide: info?.hide, hideBones: info?.hideBones });
    s.loading = actor.load(!saved, 0).then(() => {
      if (!this.alive) { actor.dispose(); return; }
      actor.root.position.y = PED_H;
      // tượng trên bệ không đổ bóng (11 tượng × pass bóng = gấp đôi tam giác; bóng rơi trên mặt bệ gần như không thấy)
      actor.root.traverse((o) => { o.castShadow = false; });
      actor.idleLife = saved;
      s.base.add(actor.root);
      s.actor = actor;
      if (popIn) void actor.popIn(500);
      // công chúa vừa cứu: giấu tới lúc arrival() cho hiện ra (không thì đứng sẵn rồi giật nhỏ lại)
      else if (s.def.id === this.opts.arrival) actor.root.scale.setScalar(0.001);
    }).catch((e) => { console.error('[hall] không tải được', s.def.princessModel, e); });
    return s.loading;
  }

  private async loadElsaF1(awake: boolean): Promise<PrincessActor> {
    const info = princessInfo('p_elsa_f1.glb');
    const a = new PrincessActor({ model: 'p_elsa_f1.glb', height: 1.85, tuning: info?.tuning });
    await a.load(!awake);
    if (!this.alive) { a.dispose(); throw new Error('hall disposed'); }
    a.root.position.set(STAGE.x, STAGE_H, STAGE.z + 0.2);
    a.idleLife = true;
    this.scene.add(a.root);
    this.elsaF1 = a;
    return a;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(14.2, 8.4 / (t * aspect));
    const k = dist / 14.2;
    this.camera.position.set(0, 6.6 * k, 12.6 * k);
    this.camera.lookAt(0, 1.2, -1.4);
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ luồng
  enter(): void {
    showHud(false);
    showActions(false, false);
    els.say.addEventListener('click', this.onSay);
    const p = this.opts.progress;
    setStars(p.saved.length, ROOM_ORDER.length);
    // tải nốt tượng còn lại (lần lượt, không giật)
    void (async () => {
      for (const s of this.slots) { if (!this.alive) return; await this.loadStatue(s, true); }
    })();
    void this.flow();
  }

  private speaking = 0;
  private async line(key: string): Promise<void> {
    if (!this.alive) return;
    this.lastLine = key;
    this.speaking++;
    try { await play(key); } finally { this.speaking--; this.idleT = 0; }
  }

  private async flow(): Promise<void> {
    const p = this.opts.progress;
    this.busy = true;
    try {
      if (this.opts.arrival) await this.arrival(this.opts.arrival);
      if (!this.alive) return;
      const n = p.saved.length;
      const ball = this.opts.forceBall ?? (BALL_MILESTONES.includes(n) && !p.balls.includes(n) ? n : null);
      if (ball) {
        await this.runBall(ball);
        if (!this.alive) return;
        markBall(p, ball);
      }
      this.busy = false;
      banner('Chào Nhím! 👋', 2400);
      void this.guideHello();
      if (!this.opts.arrival && !ball) await this.line(p.saved.length === 0 ? 'hall_intro_first' : 'hall_hello');
      else await this.line('hall_intro');
    } finally {
      this.busy = false;
    }
  }

  private guideHello(): Promise<void> {
    if (this.elsaF1) return this.elsaF1.wave(1.5);
    void this.elsa.face(this.camera.position);
    return this.elsa.wave(2.2);
  }

  /** Công chúa vừa cứu về bệ: bừng sáng + hiện ra, Elsa mừng, mở cửa mới. */
  private async arrival(id: RoomId): Promise<void> {
    const s = this.slots.find((x) => x.def.id === id);
    if (!s) return;
    await this.loadStatue(s);
    if (!this.alive) return;
    const head = s.base.localToWorld(new THREE.Vector3(0, PED_H + STATUE_H * 0.6, 0));
    const [c1, c2] = s.def.palette ? [s.def.palette.primary, s.def.palette.accent] : [0xff5fb4, 0xffc233];
    // cột sáng xoáy
    void tween(1600, (k) => {
      for (let i = 0; i < 4; i++) {
        const a = k * Math.PI * 8 + i * Math.PI / 2;
        this.engine.magic.emit({ x: head.x + Math.cos(a) * 0.9, y: 0.4 + k * 2.6, z: head.z + Math.sin(a) * 0.9, color: i % 2 ? c1 : c2, vy: 0.6, max: 1.3, size: 0.55 });
      }
    }, easeInOutSine);
    if (s.actor) await s.actor.popIn(800);
    this.engine.magic.burst(head, 140, c1, 2.4, 0.55, 1.6, -1.4);
    this.engine.magic.burst(head, 80, 0xffc233, 2, 0.5, 1.5, -1.4);
    chime(CHIME_BIG);
    confetti(70);
    void this.elsa.play('celebrate');
    setStars(this.opts.progress.saved.length, ROOM_ORDER.length, true);
    s.actor?.wave(1.6);
    await this.line('hall_welcome_back');
    if (!this.alive) return;
    await this.cheer();
    if (!this.alive) return;
    // cửa mới mở
    const newly = ROOM_ORDER[3 + this.opts.progress.saved.length - 1];
    const ns = newly ? this.slots.find((x) => x.def.id === newly) : undefined;
    if (ns && !isSaved(this.opts.progress, ns.def.id)) {
      this.pendingDoor = null;
      this.refreshSlot(ns);
      const dp = ns.door.localToWorld(new THREE.Vector3(0, 1.6, 0.3));
      this.engine.magic.burst(dp, 120, ns.def.palette.primary, 2.2, 0.55, 1.5, -1.2);
      this.engine.magic.burst(dp, 60, 0xffffff, 1.6, 0.45, 1.3, -1.2);
      void tween(700, (k) => ns.badge.scale.setScalar(BADGE * (1 + Math.sin(k * Math.PI) * 0.5)), easeOutBack);
      chime('G6:0.5 C7:1');
      await this.line('hall_new_door');
    }
  }

  onTap(ndc: THREE.Vector2): void {
    this.idleT = 0;
    if (this.busy || this.opening || !this.alive) return;
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [this.elsaHit];
    for (const s of this.slots) targets.push(s.hit, s.badge);
    if (this.familyFrame) targets.push(this.familyFrame);
    const hit = this.raycaster.intersectObjects(targets, true)[0];
    const ud = hit?.object.userData ?? {};
    // bé chạm bất kỳ đâu: Elsa dừng việc đang làm và phản ứng
    if (ud.elsa) { void this.runLife((ok) => this.elsaTapped(ok)); return; }
    if (ud.family) { void this.familyWallTap(); return; }
    const s = typeof ud.slot === 'number' ? this.slots[ud.slot as number] : undefined;
    if (s) { this.stopLife(); void this.tapSlot(s); return; }
    if (!this.elsaF1) void this.runLife(async (ok) => { await this.elsa.face(this.camera.position, 300); if (ok()) await this.elsa.wave(1.1); });
  }

  /** 1 người nhà cổ vũ (bong bóng + giọng). */
  private async cheer(): Promise<void> {
    if (!this.alive) return;
    this.speaking++;
    try { await familyCheer(); } finally { this.speaking--; this.idleT = 0; }
  }

  private async familyWallTap(): Promise<void> {
    if (familyBusy() || !this.familyFrame) return;
    sfx('sfx_tap', 0.5);
    const f = this.familyFrame;
    void tween(600, (k) => f.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.08), easeOutBack);
    const heart = f.userData.heart as THREE.Sprite;
    this.engine.magic.burst(heart.getWorldPosition(new THREE.Vector3()), 50, 0xff5fb4, 1.8, 0.4, 1.2, -1.2);
    if (!this.elsaF1) void this.runLife(async (ok) => { await this.elsa.face(f.position, 300); if (ok()) await this.elsa.wave(1.4); });
    await this.line('family_wall');
    await this.cheer();
  }

  /** Bé chạm vào Elsa: quay ra, xoay tung tuyết, cười, vẫy. */
  private async elsaTapped(ok: () => boolean): Promise<void> {
    sfx('sfx_pop', 0.5);
    const key = `elsa_tap_${1 + Math.floor(Math.random() * 3)}`;
    if (this.elsaF1) { void this.line(key); await this.elsaF1.twirl(1, 1400); return; }
    await this.elsa.face(this.camera.position, 250);
    if (!ok()) return;
    void this.line(key);
    await this.elsa.spinOnce(1100);
    if (!ok()) return;
    await this.elsa.wave(1.4);
  }

  // ------------------------------------------------------------------ Elsa tự hoạt động
  /** Elsa rảnh: không nghi lễ, không đang mở cửa, không phải Elsa váy F1. */
  private get elsaFree(): boolean {
    return !this.busy && !this.opening && this.alive && !this.elsaF1 && this.elsa.loaded;
  }

  /** Chạy 1 chuỗi hoạt động của Elsa; chuỗi mới / stopLife() huỷ chuỗi cũ (ok() = còn hiệu lực). */
  private async runLife(fn: (ok: () => boolean) => Promise<void>): Promise<void> {
    this.stopLife();
    const my = ++this.lifeToken;
    const ok = () => my === this.lifeToken && this.alive;
    this.lifeRunning = true;
    try { await fn(ok); } finally {
      if (my === this.lifeToken) { this.lifeRunning = false; this.lifeT = 6 + Math.random() * 6; }
    }
  }

  private stopLife(): void {
    this.lifeToken++;
    this.lifeRunning = false;
    this.lifeT = Math.max(this.lifeT, 4 + Math.random() * 4);
    this.elsa?.stop();
  }

  /** Mỗi 6–12 s lúc rảnh: thăm 1 bệ / ra trước vẫy bé / vẫy tại chỗ / xoay tung tuyết / múa 1 clip. */
  private async elsaIdle(ok: () => boolean): Promise<void> {
    const e = this.elsa, home = this.elsaHome, cam = this.camera.position;
    // bị ngắt giữa đường lần trước → về sân khấu trước
    if (Math.hypot(e.root.position.x - home.x, e.root.position.z - home.z) > 0.25) {
      if (!(await e.glideTo(home.x, home.z)) || !ok()) return;
      await e.face(cam);
      return;
    }
    const r = Math.random();
    if (r < 0.32) {
      // thăm 1 bệ: lướt tới trước bệ, ngắm tượng; công chúa đã tỉnh thì 2 bạn vẫy nhau
      const loaded = this.slots.filter((s) => s.actor);
      const saved = loaded.filter((s) => s.actor!.awake);
      const pool = saved.length && Math.random() < 0.7 ? saved : loaded;
      const s = pool[Math.floor(Math.random() * pool.length)];
      if (!s) return;
      const p = s.base.position;
      const dx = -p.x, dz = 0.3 - p.z, d = Math.hypot(dx, dz) || 1;
      if (!(await e.glideTo(p.x + (dx / d) * 2.1, p.z + (dz / d) * 2.1)) || !ok()) return;
      const head = s.base.localToWorld(new THREE.Vector3(0, PED_H + STATUE_H * 0.8, 0));
      await e.face(head, 500);
      if (!ok()) return;
      if (s.actor?.awake) {
        if (s.actor.idle) void s.actor.wave(1.3);
        await e.wave(1.4);
      } else {
        this.engine.magic.burst(head, 30, 0x4fb3ff, 1.2, 0.3, 1, -1);
        await wait(1500);
      }
      if (!ok()) return;
      if (!(await e.glideTo(home.x, home.z)) || !ok()) return;
      await e.face(cam);
    } else if (r < 0.52) {
      // lướt ra trước sân khấu, vẫy bé, có khi xoay 1 vòng, rồi về
      const x = (Math.random() - 0.5) * 4.6, z = 2.5 + Math.random() * 1.1;
      if (!(await e.glideTo(x, z)) || !ok()) return;
      await e.face(cam, 400);
      if (!ok()) return;
      await e.wave(1.6);
      if (!ok()) return;
      if (Math.random() < 0.4) { await e.spinOnce(); if (!ok()) return; }
      if (!(await e.glideTo(home.x, home.z)) || !ok()) return;
      await e.face(cam);
    } else if (r < 0.7) {
      await e.face(cam, 350);
      if (ok()) await e.wave(2);
    } else if (r < 0.85) {
      await e.face(cam, 300);
      if (ok()) await e.spinOnce();
    } else {
      await e.face(cam, 300);
      if (ok()) await e.play((['best', 'great', 'celebrate'] as const)[Math.floor(Math.random() * 3)]);
    }
  }

  private async tapSlot(s: Slot): Promise<void> {
    const p = this.opts.progress;
    if (!isUnlocked(p, s.def.id)) {
      sfx('sfx_soft', 0.5);
      void tween(450, (k) => { s.badge.position.x = Math.sin(k * Math.PI * 6) * 0.12 * (1 - k); });
      if (this.elsaF1) void this.elsaF1.cheer(0.4); else void this.elsa.play('think');
      this.bumpOpenBadges();
      await this.line('hall_locked');
      return;
    }
    this.opening = true;
    this.busy = true;
    stopSpeech();
    sfx('sfx_tap', 0.6);
    const saved = isSaved(p, s.def.id);
    void tween(500, (k) => s.badge.scale.setScalar(BADGE * (1 + Math.sin(k * Math.PI) * 0.4)), easeOutBack);
    const doorP = s.door.localToWorld(new THREE.Vector3(0, 1.5, 0.3));
    if (!this.elsaF1) {
      await this.elsa.face(doorP, 350);
      void this.elsa.play('spell');
      await wait(550);
      void this.engine.magic.beam(this.elsa.handWorld(), doorP, s.def.magicColors[0], s.def.magicColors[1], 0.9, 2.2, 1.2);
    } else void this.elsaF1.cheer(0.6);
    const nameLine = this.line(saved ? 'hall_saved_tap' : s.def.audio.name);
    await wait(900);
    if (!this.alive) return;
    this.engine.magic.burst(doorP, 120, s.def.palette.primary, 2.2, 0.55, 1.5, -1.2);
    this.engine.magic.burst(doorP, 60, 0xffffff, 1.6, 0.45, 1.3, -1.2);
    const doorMat = s.doorPanel.material as THREE.MeshStandardMaterial;
    void tween(500, (k) => { doorMat.emissiveIntensity = 1 + k * 2; doorMat.emissive.setHex(0xffffff); });
    await Promise.race([nameLine, wait(1800)]);
    if (!this.alive) return;
    this.opts.onOpenRoom(s.def.id);
  }

  /** Nhún huy hiệu các bệ đang mở, chưa cứu: chỉ cho bé biết chạm vào đâu. */
  private bumpOpenBadges(): void {
    for (const o of this.slots) {
      if (!this.isOpen(o.def.id) || isSaved(this.opts.progress, o.def.id)) continue;
      void tween(800, (k) => o.badge.scale.setScalar(BADGE * (1 + Math.sin(k * Math.PI) * 0.6)), easeOutBack);
    }
  }

  // ------------------------------------------------------------------ dạ hội
  private async runBall(n: number): Promise<void> {
    const final = n >= 11;
    const awake = this.slots.filter((s) => isSaved(this.opts.progress, s.def.id) && s.actor);
    // dạ hội điều khiển công chúa: tắt động tác lặt vặt, chờ động tác đang dở xong (không giành nhau)
    awake.forEach((s) => { s.actor!.idleLife = false; });
    await Promise.all(awake.map((s) => s.actor!.settle()));
    // đèn tối lại, sắc tím hồng + đèn màu quay
    const h0 = this.hemi.intensity, k0 = this.key.intensity;
    const hc0 = this.hemi.color.clone();
    await tween(900, (k) => {
      this.hemi.intensity = h0 - 0.45 * k;
      this.key.intensity = k0 - 1.1 * k;
      this.hemi.color.copy(hc0).lerp(new THREE.Color(0xc7b0ff), k);
    });
    const disco = [0xff4fa8, 0x4fc3ff, 0xffd23f, 0x9b6bff].map((c) => {
      const l = new THREE.PointLight(c, 0, 14, 1.2);
      l.position.set(0, 4, RING.cz);
      this.scene.add(l);
      return l;
    });
    this.discoLights = disco;
    void tween(600, (k) => disco.forEach((l) => (l.intensity = 14 * k)));
    const music = musicBox(WALTZ, 150, 0.2, 2);
    const ballLine = this.line(final ? 'ball_final' : `ball_${n}`);
    // nói xong lời mở dạ hội → cả nhà lần lượt cổ vũ
    const family = (async () => {
      await ballLine;
      if (!this.alive) return;
      this.speaking++;
      try { await familyCheerAll(() => this.alive); } finally { this.speaking--; }
    })();
    confetti(120);
    let fireworks = true;
    const fw = (async () => {
      while (fireworks && this.alive) {
        this.firework();
        await wait(420 + Math.random() * 380);
      }
    })();
    void this.elsa.play('celebrate');
    // công chúa lần lượt xoay váy
    for (let r = 0; r < 2; r++) {
      await Promise.all(awake.map(async (s, i) => { await wait(i * 180); await s.actor?.twirl(1, 1500); }));
      if (!this.alive) break;
      await Promise.all(awake.map((s) => s.actor?.cheer(0.8)));
    }
    if (final && this.alive) await this.finaleChange();
    await Promise.race([music, wait(final ? 4000 : 1500)]);
    await family;
    fireworks = false;
    await fw;
    if (!this.alive) return;
    awake.forEach((s) => { if (s.actor) s.actor.idleLife = true; });
    stopMusic();
    void tween(900, (k) => {
      this.hemi.intensity = h0 - 0.45 * (1 - k);
      this.key.intensity = k0 - 1.1 * (1 - k);
      this.hemi.color.copy(new THREE.Color(0xc7b0ff)).lerp(hc0, k);
      disco.forEach((l) => (l.intensity = 14 * (1 - k)));
    });
    await this.line('ball_end');
    disco.forEach((l) => l.removeFromParent());
    this.discoLights = [];
  }

  private firework(): void {
    const colors = [0xff3d9a, 0x3db8ff, 0xffc21a, 0x8b5cf6, 0x2ecc71, 0xff7a1a];
    const at = new THREE.Vector3((Math.random() - 0.5) * 11, 3.6 + Math.random() * 1.7, RING.cz - 1.5 - Math.random() * 3);
    const c = colors[Math.floor(Math.random() * colors.length)];
    this.engine.magic.burst(at, 90, c, 3.2, 0.5, 1.6, -1.6);
    this.engine.magic.burst(at, 30, 0xffffff, 2, 0.4, 1.2, -1.6);
    sfx('sfx_pop', 0.25);
  }

  /** Dạ hội cuối: Elsa dẫn đường xoay trong cột tuyết rồi hoá thành Elsa váy băng Frozen 1. */
  private async finaleChange(): Promise<void> {
    const center = new THREE.Vector3(STAGE.x, STAGE_H + 1, STAGE.z + 0.2);
    // tải váy mới TRƯỚC khi giấu Elsa: lỗi tải thì giữ nguyên Elsa, bỏ màn thay váy
    let f1: PrincessActor;
    try { f1 = await this.loadElsaF1(true); } catch (e) { console.error('[hall] không tải được Elsa F1', e); return; }
    if (!this.alive) return;
    f1.root.visible = false;
    void tween(2400, (k) => {
      for (let i = 0; i < 6; i++) {
        const a = k * Math.PI * 12 + i * (Math.PI / 3);
        this.engine.magic.emit({ x: center.x + Math.cos(a) * 1.1, y: STAGE_H + k * 2.6, z: center.z + Math.sin(a) * 1.1, color: i % 2 ? 0x2f9df5 : 0x8b5cf6, vy: 0.8, max: 1.3, size: 0.6 });
      }
    }, easeInOutSine);
    await wait(1200);
    const elsaRoot = this.elsa.root;
    await tween(500, (k) => elsaRoot.scale.setScalar(Math.max(0.001, 1 - k)));
    elsaRoot.visible = false;
    const a = f1;
    a.root.visible = true;
    if (!this.alive) return;
    this.engine.magic.burst(center, 260, 0x2f9df5, 3.5, 0.6, 1.8, -1.2);
    this.engine.magic.burst(center, 140, 0xffffff, 2.4, 0.5, 1.6, -1.2);
    chime(CHIME_BIG);
    await a.popIn(700);
    await a.twirl(2, 1400);
    void a.wave(1.5);
  }

  // ------------------------------------------------------------------ frame
  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    this.elsa?.update(dt);
    this.elsaF1?.update(dt);
    const p = this.opts.progress;
    // Elsa tự hoạt động lúc rảnh; nghi lễ bắt đầu → dừng ngay
    if (this.elsa) {
      if (this.elsaFree) {
        if (!this.lifeRunning) { this.lifeT -= dt; if (this.lifeT <= 0) void this.runLife((ok) => this.elsaIdle(ok)); }
      } else if (this.lifeRunning && (this.busy || this.opening)) this.stopLife();
      // lấp lánh băng quanh Elsa
      if (this.elsa.root.visible && Math.random() < 0.1) {
        const ep = this.elsa.root.position;
        this.engine.magic.twinkle(this._v.set(ep.x + (Math.random() - 0.5) * 0.9, ep.y + 0.2 + Math.random() * 1.6, ep.z + (Math.random() - 0.5) * 0.7), Math.random() < 0.6 ? 0x4fb3ff : 0xb48bff, 1, 0.2, 0.22);
      }
    }
    // tuyết rơi
    for (let i = 0; i < this.snowMats.length; i++) this.snowMats[i].rotation += dt * (0.3 + i * 0.25) * (i % 2 ? 1 : -1);
    for (const f of this.snow) {
      const sp = f.sp.position;
      sp.y -= f.speed * dt;
      sp.x += Math.cos(t * 0.7 + f.phase) * 0.25 * dt;
      if (sp.y < 0.05) sp.set((Math.random() - 0.5) * 17, 7 + Math.random(), -6 + Math.random() * 11);
    }
    // bé ngồi im lâu: Elsa nhắc lại + nhún các bệ đang mở
    if (!this.busy && !this.opening && this.speaking === 0) {
      this.idleT += dt;
      if (this.idleT > 12) {
        this.idleT = 0;
        this.bumpOpenBadges();
        void this.line('hall_intro');
      }
    }
    for (const s of this.slots) {
      s.actor?.update(dt);
      const open = this.isOpen(s.def.id) && !isSaved(p, s.def.id);
      const rm = s.ringGlow.material as THREE.MeshBasicMaterial;
      rm.opacity = open ? 0.35 + Math.sin(t * 3 + s.index) * 0.25 : 0;
      s.badge.position.y = PED_H + STATUE_H + 0.45 + Math.sin(t * 1.6 + s.index) * 0.06;
      if (open && Math.random() < 0.08) {
        const w = s.base.localToWorld(this._v.set((Math.random() - 0.5) * 1.4, 0.3 + Math.random() * 1.8, (Math.random() - 0.5) * 1.4));
        this.engine.magic.twinkle(w, Math.random() < 0.5 ? s.def.palette.accent : 0xffffff, 1, 0.2, 0.28);
      }
    }
    this.chandelier.rotation.y = Math.sin(t * 0.3) * 0.08;
    this.discoLights.forEach((l, i) => {
      const a = t * (0.9 + i * 0.2) + i * Math.PI / 2;
      l.position.set(Math.cos(a) * 6, 3.5 + Math.sin(t * 2 + i) * 0.8, RING.cz + Math.sin(a) * 3.5);
    });
    if (Math.random() < 0.15) {
      this.engine.magic.twinkle(this._v.set((Math.random() - 0.5) * 3, 5.8 + Math.random() * 0.8, RING.cz + (Math.random() - 0.5) * 3), 0xffe08a, 1, 0.2, 0.25);
    }
  }

  dispose(): void {
    this.alive = false;
    this.lifeToken++;
    stopMusic();
    clearFamily();
    els.say.removeEventListener('click', this.onSay);
    for (const s of this.slots) s.actor?.dispose();
    this.elsa?.dispose();
    this.elsaF1?.dispose();
    disposeTree(this.scene);
  }
}

/** Mặt sàn dưới chân Elsa: sân khấu 2 tầng (r 1.35 cao 0.42, r 1.7 cao 0.2), ngoài là sàn. */
function stageGround(x: number, z: number): number {
  const d = Math.hypot(x - STAGE.x, z - STAGE.z);
  return d < 1.3 ? STAGE_H : d < 1.68 ? 0.2 : 0;
}

/** Vẽ tranh gia đình: nền hồng, tiêu đề, 5 ảnh tròn (3 trên, 2 dưới) + tên. */
function drawFamilyCanvas(c: HTMLCanvasElement, imgs: Map<string, HTMLImageElement>): void {
  const g = c.getContext('2d')!;
  const w = c.width, h = c.height;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#fff3fa'); bg.addColorStop(1, '#ffd9ee');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // chấm tim mờ
  g.font = '34px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  g.globalAlpha = 0.25;
  for (let i = 0; i < 14; i++) g.fillText(i % 2 ? '💗' : '✨', (i * 137) % w, 40 + ((i * 89) % (h - 40)));
  g.globalAlpha = 1;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 64px "Baloo 2", "Nunito", system-ui, sans-serif';
  g.lineWidth = 10; g.strokeStyle = '#4a2c4a'; g.fillStyle = '#ffffff';
  g.strokeText('Gia đình Nhím', w / 2, 52); g.fillText('Gia đình Nhím', w / 2, 52);
  const slots = [[w * 0.2, 185], [w * 0.5, 185], [w * 0.8, 185], [w * 0.33, 400], [w * 0.67, 400]];
  FAMILY.forEach((m, i) => {
    const [x, y] = slots[i];
    const r = 82;
    g.fillStyle = m.color;
    g.beginPath(); g.arc(x, y, r + 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    const img = imgs.get(m.id);
    if (img) {
      g.save();
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
      const s = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, x - r, y - r, r * 2, r * 2);
      g.restore();
    } else {
      g.font = '112px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      g.fillText(m.emoji, x, y + 8);
    }
    const label = m.name.replace(' Celistia', '');
    g.font = '800 40px "Baloo 2", "Nunito", system-ui, sans-serif';
    g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.fillStyle = m.color;
    g.strokeText(label, x, y + r + 32); g.fillText(label, x, y + r + 32);
  });
}

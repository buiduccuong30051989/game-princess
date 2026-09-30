// ĐẠI SẢNH: sảnh tròn lát đá hoa, 11 bệ xếp vòng quanh sân khấu giữa (Elsa dẫn đường đứng đó),
// sau mỗi bệ là 1 cánh cửa phòng. Bệ: tượng băng (chưa cứu) / công chúa thở, vẫy (đã cứu). Chạm bệ → vào phòng.
// Cứu đủ 3/6/9/11 → dạ hội mini (đèn màu, nhạc hộp, pháo hoa, công chúa xoay váy); 11 → Elsa thay váy băng Frozen 1.
import * as THREE from 'three';
import type { Engine, GameScene } from './core/engine.ts';
import { emojiTexture, disposeTree, prefetch } from './core/assets.ts';
import { type Progress, isUnlocked, isSaved, markBall, ROOM_ORDER, BALL_MILESTONES } from './core/progress.ts';
import { ROOMS } from './rooms/index.ts';
import { princessInfo } from './rooms/princesses.ts';
import { PrincessActor } from './princess.ts';
import { ElsaGuide, ELSA_MODEL } from './elsa.ts';
import { play, sfx, musicBox, stopMusic, chime, WALTZ, CHIME_BIG, stopSpeech } from './audio.ts';
import { els, showHud, setStars, confetti, showActions } from './ui.ts';
import { tween, wait, easeOutBack, easeInOutSine } from './tween.ts';
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
  private alive = true;
  private time = 0;
  private lastLine: string | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly onSay = () => { if (this.lastLine) void play(this.lastLine); };

  private constructor(engine: Engine, opts: HallOpts) {
    this.engine = engine;
    this.opts = opts;
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

    this.elsa = new ElsaGuide(1.9);
    this.elsa.root.position.set(STAGE.x, STAGE_H, STAGE.z + 0.2);
    this.scene.add(this.elsa.root);
    const jobs: Promise<unknown>[] = [this.elsa.load()];
    if (this.finaleDone) jobs.push(this.loadElsaF1(true));
    // tải trước tượng các bệ gần nhất (đã mở + vừa cứu); còn lại tải dần sau khi hiện sảnh
    for (const s of this.slots) {
      const p = this.opts.progress;
      if (s.index < 4 || isSaved(p, s.def.id)) jobs.push(this.loadStatue(s));
    }
    await Promise.all(jobs);
    if (this.finaleDone) this.elsa.root.visible = false;
    prefetch([ELSA_MODEL]);
  }

  private buildLights(): void {
    this.hemi = new THREE.HemisphereLight(0xfff7fb, 0xf5cde6, 1.15);
    this.scene.add(this.hemi);
    const key = new THREE.DirectionalLight(0xfff3e6, 1.9);
    key.position.set(4, 12, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
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
    for (const x of [-2.9, 2.9]) s.add(this.flowerUrn(x, 4.4));
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
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    g.position.set(x, 0, z);
    return g;
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
    const saved = isSaved(p, s.def.id), open = isUnlocked(p, s.def.id);
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
    const actor = new PrincessActor({ model: s.def.princessModel, height: STATUE_H, tuning: { ...info?.tuning, ...s.def.pose }, hide: info?.hide, hideBones: info?.hideBones });
    s.loading = actor.load(!saved, 0).then(() => {
      if (!this.alive) { actor.dispose(); return; }
      actor.root.position.y = PED_H;
      actor.idleLife = saved;
      s.base.add(actor.root);
      s.actor = actor;
      if (popIn) void actor.popIn(500);
    }).catch((e) => { console.error('[hall] không tải được', s.def.princessModel, e); });
    return s.loading;
  }

  private async loadElsaF1(awake: boolean): Promise<PrincessActor> {
    const info = princessInfo('p_elsa_f1.glb');
    const a = new PrincessActor({ model: 'p_elsa_f1.glb', height: 1.85, tuning: info?.tuning });
    await a.load(!awake);
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

  private async line(key: string): Promise<void> {
    if (!this.alive) return;
    this.lastLine = key;
    await play(key);
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
      void this.guideHello();
      if (!this.opts.arrival && !ball) await this.line(p.saved.length === 0 ? 'hall_intro_first' : 'hall_intro');
      else await this.line('hall_intro');
    } finally {
      this.busy = false;
    }
  }

  private guideHello(): Promise<void> {
    if (this.elsaF1) return this.elsaF1.wave(1.5);
    return this.elsa.play('hello');
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
    // cửa mới mở
    const newly = ROOM_ORDER[3 + this.opts.progress.saved.length - 1];
    const ns = newly ? this.slots.find((x) => x.def.id === newly) : undefined;
    if (ns && !isSaved(this.opts.progress, ns.def.id)) {
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
    if (this.busy || !this.alive) return;
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const s of this.slots) targets.push(s.hit, s.badge);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    const s = this.slots[hit.object.userData.slot as number];
    if (s) void this.tapSlot(s);
  }

  private async tapSlot(s: Slot): Promise<void> {
    const p = this.opts.progress;
    if (!isUnlocked(p, s.def.id)) {
      sfx('sfx_soft', 0.5);
      void tween(450, (k) => { s.badge.position.x = Math.sin(k * Math.PI * 6) * 0.12 * (1 - k); });
      if (this.elsaF1) void this.elsaF1.cheer(0.4); else void this.elsa.play('think');
      await this.line('hall_locked');
      return;
    }
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

  // ------------------------------------------------------------------ dạ hội
  private async runBall(n: number): Promise<void> {
    const final = n >= 11;
    const awake = this.slots.filter((s) => isSaved(this.opts.progress, s.def.id) && s.actor);
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
    void this.line(final ? 'ball_final' : `ball_${n}`);
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
    fireworks = false;
    await fw;
    if (!this.alive) return;
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
    const f1 = this.loadElsaF1(true);
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
    const a = await f1;
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
    for (const s of this.slots) {
      s.actor?.update(dt);
      const open = isUnlocked(p, s.def.id) && !isSaved(p, s.def.id);
      const rm = s.ringGlow.material as THREE.MeshBasicMaterial;
      rm.opacity = open ? 0.35 + Math.sin(t * 3 + s.index) * 0.25 : 0;
      s.badge.position.y = PED_H + STATUE_H + 0.45 + Math.sin(t * 1.6 + s.index) * 0.06;
      if (open && Math.random() < 0.08) {
        const w = s.base.localToWorld(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.3 + Math.random() * 1.8, (Math.random() - 0.5) * 1.4));
        this.engine.magic.twinkle(w, Math.random() < 0.5 ? s.def.palette.accent : 0xffffff, 1, 0.2, 0.28);
      }
    }
    this.chandelier.rotation.y = Math.sin(t * 0.3) * 0.08;
    this.discoLights.forEach((l, i) => {
      const a = t * (0.9 + i * 0.2) + i * Math.PI / 2;
      l.position.set(Math.cos(a) * 6, 3.5 + Math.sin(t * 2 + i) * 0.8, RING.cz + Math.sin(a) * 3.5);
    });
    if (Math.random() < 0.15) {
      this.engine.magic.twinkle(new THREE.Vector3((Math.random() - 0.5) * 3, 5.8 + Math.random() * 0.8, RING.cz + (Math.random() - 0.5) * 3), 0xffe08a, 1, 0.2, 0.25);
    }
  }

  dispose(): void {
    this.alive = false;
    stopMusic();
    els.say.removeEventListener('click', this.onSay);
    for (const s of this.slots) s.actor?.dispose();
    this.elsa?.dispose();
    this.elsaF1?.dispose();
    disposeTree(this.scene);
  }
}

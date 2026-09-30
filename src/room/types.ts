// HỢP ĐỒNG PHÒNG (room contract). Mỗi phòng = 1 file src/rooms/<id>.ts export default 1 RoomDef.
// Đọc docs/ROOM-GUIDE.md trước khi viết phòng mới.
import type * as THREE from 'three';
import type { Magic } from '../magic.ts';
import type { InstanceOpts } from '../core/assets.ts';
import type { PoseTuning, RigGroup } from '../pose.ts';

export type RoomId =
  | 'rapunzel' | 'ariel' | 'belle' | 'cinderella' | 'jasmine' | 'snowwhite'
  | 'anna' | 'aurora' | 'mulan' | 'merida' | 'tiana';

export type ChallengeKind = 'spell' | 'fill' | 'count';

/** 1 từ vựng của phòng. Token đánh vần + audio key được SINH TỰ ĐỘNG từ `word` (src/spell.ts). */
export interface RoomWord {
  /** 1 tiếng, chữ thường, có dấu (vd 'đèn') */
  word: string;
  /** emoji Apple minh hoạ (bé nhìn hình để chọn) */
  emoji: string;
  /** cụm gọi tên đọc lên, có loại từ: 'cái đèn', 'con mèo', 'bông hoa' */
  name: string;
  /** câu hỏi bài nghe–chọn hình; mặc định 'Cái nào là <name>?' / 'Con nào là <name>?' */
  ask?: string;
  /** bài điền chữ: index = vị trí chữ bị che (Array.from(word)), distractors = 2 chữ nhiễu khác chữ đúng */
  fill?: { index: number; distractors: [string, string] };
}

/** Bảng màu phòng (số hex). primary = màu chủ đạo (cửa ở sảnh, bệ), accent = điểm nhấn. */
export interface RoomPalette {
  primary: number;
  secondary: number;
  accent: number;
  /** màu nền/ánh sáng chung (bầu trời, tường xa) */
  light: number;
  /** màu tối để tạo chiều sâu */
  dark: number;
}

/** Bố cục cố định của mọi phòng (RoomScene dựng bệ + đặt nhân vật; phòng chỉ trang trí xung quanh). */
export interface RoomLayout {
  /** tâm bệ công chúa (x,z) = (0,0); mặt bệ cao pedestalH */
  pedestalRadius: number;
  pedestalH: number;
  /** Elsa đứng ở đây */
  elsa: THREE.Vector3;
  /** vùng cấm đặt đồ cao (che nhân vật): |x| < clearX và z > clearZ */
  clearX: number;
  clearZ: number;
  /** tường sau nên đặt ở z ≈ backZ, tường bên ở x ≈ ±sideX */
  backZ: number;
  sideX: number;
}

export interface RoomCtx {
  /** thêm MỌI đồ trang trí vào đây */
  readonly root: THREE.Group;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly magic: Magic;
  readonly layout: RoomLayout;
  readonly palette: RoomPalette;
  /** tải + clone model trong public/models (đã sửa metalness). KHÔNG tự thêm vào scene. */
  model(name: string, opts?: InstanceOpts): Promise<THREE.Object3D>;
  /** emoji thành sprite quay về camera */
  emoji(emoji: string, size?: number): THREE.Sprite;
  /** 0 (đóng băng) → 1 (tan hết); đọc trong ambient để cảnh sáng dần */
  readonly melt: number;
  readonly awake: boolean;
  /** giây kể từ lúc vào phòng */
  readonly time: number;
  /** chỗ phòng cất dữ liệu riêng giữa buildScene và ambient */
  readonly state: Record<string, unknown>;
}

export interface RoomDef {
  id: RoomId;
  /** tên hiển thị tiếng Việt (vd 'Tháp của Rapunzel') */
  name: string;
  /** emoji biểu tượng phòng (cửa sảnh, thẻ) */
  emoji: string;
  /** model tượng trong public/models (vd 'p_rapunzel.glb') */
  princessModel: string;
  /** nhóm rig (chỉ để ghi chú / soát; Poser tự dò) */
  rig: RigGroup;
  /** tinh chỉnh tư thế riêng (ghi đè bảng src/rooms/princesses.ts) */
  pose?: PoseTuning;
  palette: RoomPalette;
  /** dựng cảnh vào ctx.root (hình khối + model có sẵn). Được await. */
  buildScene(ctx: RoomCtx): Promise<void> | void;
  /** ≥ 6 từ theo chủ đề phòng, ≥ 3 từ có `fill` */
  words: RoomWord[];
  /** bài đếm: emoji vật để đếm + audio key câu hỏi đếm */
  count: { emoji: string; audio: string; range?: [number, number] };
  /** 3 bài theo thứ tự */
  challenges: [ChallengeKind, ChallengeKind, ChallengeKind];
  /** 2 màu hạt phép (đậm, bão hoà – nền sáng dùng NormalBlending) */
  magicColors: [number, number];
  /** audio key (định nghĩa trong scripts/audio/<id>.txt) */
  audio: {
    /** "Tòa tháp của Rapunzel!" – đọc khi chạm cửa ở sảnh */
    name: string;
    /** lời Elsa giới thiệu khi vào phòng */
    intro: string;
    /** lời công chúa cảm ơn khi tỉnh */
    thanks: string;
  };
  /** hoạt cảnh mỗi frame (đèn lồng bay, bong bóng...) */
  ambient?(ctx: RoomCtx, dt: number): void;
}

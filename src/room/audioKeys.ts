// Danh sách audio key để tải trước: dùng chung (src/lines.ts: câu đơn + ngân hàng câu + câu toán chung + số) và riêng 1 phòng
// (từ vựng + token đánh vần + câu phòng + câu toán theo chủ đề). Mọi câu sinh bằng `pnpm audio` (scripts/audio-lines.mjs).
import type { RoomDef } from './types.ts';
import { wordAudioLines } from './words.ts';
import { LINES, BANK_TEXT, bankKey, roomKey } from '../lines.ts';
import { MATH_COMMON, MATH_THEMES, numKey, themeKey } from '../math.ts';

export const NUMBER_KEYS = Array.from({ length: 10 }, (_, i) => numKey(i + 1));

/** Câu dùng chung mọi phòng / sảnh. */
export const COMMON_KEYS = [
  ...Object.keys(LINES),
  ...Object.entries(BANK_TEXT).flatMap(([b, [, list]]) => list.map((_, i) => bankKey(b, i))),
  ...Object.keys(MATH_COMMON),
  ...NUMBER_KEYS,
];

const THEME_PARTS = ['has', 'noun', 'addPre', 'addEnd', 'subEnd', 'qAdd', 'qSub', 'qMiss'] as const;
/** Câu của 1 chủ đề toán. */
export function themeKeys(theme: string): string[] { return THEME_PARTS.map((p) => themeKey(theme, p)); }

/** Mọi key 1 phòng cần (ngoài COMMON_KEYS). */
export function roomAudioKeys(def: RoomDef): string[] {
  return [...new Set([
    ...wordAudioLines(def.words).map(([k]) => k),
    roomKey(def.id, 'name'), roomKey(def.id, 'intro'), roomKey(def.id, 'thanks'),
    ...(def.id in MATH_THEMES ? themeKeys(def.id) : []), ...themeKeys('snow'), ...themeKeys('gem'),
  ])];
}

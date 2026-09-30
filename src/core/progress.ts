// Tiến độ lâu đài: công chúa nào đã tỉnh, đã xem dạ hội mốc nào. localStorage key có version.
import type { RoomId } from '../room/types.ts';
import { PARAMS } from './params.ts';

const KEY = 'castle-progress-v1';

export interface Progress {
  v: 1;
  /** id phòng đã cứu, theo thứ tự cứu */
  saved: RoomId[];
  /** mốc dạ hội đã xem (3, 6, 9, 11) */
  balls: number[];
}

/** Thứ tự mở cửa: 3 phòng đầu mở sẵn, mỗi công chúa tỉnh mở thêm 1 phòng theo thứ tự này. */
export const ROOM_ORDER: RoomId[] = [
  'rapunzel', 'ariel', 'belle', 'cinderella', 'jasmine', 'snowwhite', 'anna', 'aurora', 'mulan', 'merida', 'tiana',
];
export const BALL_MILESTONES = [3, 6, 9, 11];

let volatile = false; // ?saved=N: chỉ giả lập trong bộ nhớ

function fresh(): Progress { return { v: 1, saved: [], balls: [] }; }

export function loadProgress(): Progress {
  if (PARAMS.reset) { try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ } }
  if (PARAMS.saved !== undefined) {
    volatile = true;
    const n = Math.max(0, Math.min(ROOM_ORDER.length, PARAMS.saved));
    return { v: 1, saved: ROOM_ORDER.slice(0, n), balls: BALL_MILESTONES.filter((m) => m <= n && m !== PARAMS.ball) };
  }
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null') as Progress | null;
    if (p && p.v === 1 && Array.isArray(p.saved)) {
      return { v: 1, saved: p.saved.filter((id) => ROOM_ORDER.includes(id)), balls: Array.isArray(p.balls) ? p.balls : [] };
    }
  } catch { /* hỏng thì làm lại */ }
  return fresh();
}

export function saveProgress(p: Progress): void {
  if (volatile) return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* chế độ riêng tư: bỏ qua */ }
}

export function isUnlocked(p: Progress, id: RoomId): boolean {
  return ROOM_ORDER.indexOf(id) < 3 + p.saved.length || p.saved.includes(id);
}
export function isSaved(p: Progress, id: RoomId): boolean { return p.saved.includes(id); }

/** Ghi nhận cứu xong. Trả về mốc dạ hội vừa đạt (nếu có và chưa xem). */
export function markSaved(p: Progress, id: RoomId): number | null {
  if (!p.saved.includes(id)) p.saved.push(id);
  saveProgress(p);
  const n = p.saved.length;
  return BALL_MILESTONES.includes(n) && !p.balls.includes(n) ? n : null;
}
export function markBall(p: Progress, n: number): void {
  if (!p.balls.includes(n)) p.balls.push(n);
  saveProgress(p);
}

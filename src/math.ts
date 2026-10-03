// TOÁN CỘNG TRỪ TRONG 10 (thay bài đếm B1). File THUẦN (chạy được bằng Node): scripts/audio-lines.mjs sinh câu từ đây và
// soát MỌI tổ hợp phép tính đều có đủ clip.
//
// Câu hỏi ghép từ clip dùng lại (đều giọng Elsa):
//   cộng:  "Trên trời có" [3] "chiếc đèn lồng." · "Elsa thả thêm" [2] "chiếc đèn lồng" "nữa." · "Có tất cả mấy chiếc đèn lồng?"
//          · [3] "cộng" [2] "bằng mấy?"
//   trừ:   "Trên trời có" [7] "chiếc đèn lồng." · [2] "chiếc đèn lồng" "bay xa mất rồi." · "Còn lại mấy chiếc đèn lồng?"
//          · [7] "trừ" [2] "bằng mấy?"
//   thiếu: "Trên trời có" [3] "chiếc đèn lồng." · "Elsa muốn có" [5] "chiếc đèn lồng." · "Phải thêm mấy chiếc nữa?"
//          · [3] "cộng" "mấy" "bằng" [5]?
// Trả lời đúng: [3] "cộng" [2] "bằng" [5]. Số: n1…n10 ("một"… "mười").
import type { RoomId } from './room/types.ts';

export type MathOp = 'add' | 'sub' | 'miss';
export interface MathProblem { op: MathOp; a: number; b: number; c: number; theme: string }

export interface MathTheme {
  emoji: string;
  /** câu mở: "Trên trời có" (trước số đầu) */
  has: string;
  /** cụm danh từ đọc sau số: "chiếc đèn lồng" */
  noun: string;
  /** trước số thứ 2 (cộng): "Elsa thả thêm" */
  addPre: string;
  /** sau danh từ (cộng): "nữa." */
  addEnd: string;
  /** sau danh từ (trừ): "bay xa mất rồi." */
  subEnd: string;
  /** "Có tất cả mấy chiếc đèn lồng?" */
  qAdd: string;
  /** "Còn lại mấy chiếc đèn lồng?" */
  qSub: string;
  /** "Phải thêm mấy chiếc nữa?" */
  qMiss: string;
  /** trừ: vật bị bớt đi thế nào trên màn hình */
  away: 'fly' | 'fall' | 'melt' | 'run';
}

/** Chủ đề theo phòng (vật của phòng) + 2 chủ đề của Elsa (bông tuyết, ngọc vương miện) xen kẽ cho đỡ lặp. */
export const MATH_THEMES: Record<RoomId | 'snow' | 'gem', MathTheme> = {
  snow: { emoji: '❄️', has: 'Chị {Elsa} có', noun: 'bông tuyết', addPre: 'Chị làm phép thêm', addEnd: 'nữa.', subEnd: 'tan mất rồi.', qAdd: 'Có tất cả mấy bông tuyết?', qSub: 'Còn lại mấy bông tuyết?', qMiss: 'Phải làm phép thêm mấy bông nữa?', away: 'melt' },
  gem: { emoji: '💎', has: 'Trên vương miện có', noun: 'viên ngọc', addPre: 'Chị gắn thêm', addEnd: 'nữa.', subEnd: 'rơi xuống mất rồi.', qAdd: 'Có tất cả mấy viên ngọc?', qSub: 'Còn lại mấy viên ngọc?', qMiss: 'Phải gắn thêm mấy viên nữa?', away: 'fall' },
  rapunzel: { emoji: '🏮', has: 'Trên trời có', noun: 'chiếc đèn lồng', addPre: 'Chị thả thêm', addEnd: 'nữa.', subEnd: 'bay xa mất rồi.', qAdd: 'Có tất cả mấy chiếc đèn lồng?', qSub: 'Còn lại mấy chiếc đèn lồng?', qMiss: 'Phải thả thêm mấy chiếc nữa?', away: 'fly' },
  ariel: { emoji: '🐠', has: 'Trong hang có', noun: 'con cá nhỏ', addPre: 'Lại có thêm', addEnd: 'bơi tới.', subEnd: 'bơi đi chơi mất rồi.', qAdd: 'Có tất cả mấy con cá nhỏ?', qSub: 'Còn lại mấy con cá nhỏ?', qMiss: 'Phải có thêm mấy con nữa?', away: 'run' },
  belle: { emoji: '🌹', has: 'Trong bình có', noun: 'bông hồng', addPre: 'Chị cắm thêm', addEnd: 'nữa.', subEnd: 'bị gió thổi bay mất.', qAdd: 'Có tất cả mấy bông hồng?', qSub: 'Còn lại mấy bông hồng?', qMiss: 'Phải cắm thêm mấy bông nữa?', away: 'fly' },
  cinderella: { emoji: '🎃', has: 'Trong vườn có', noun: 'quả bí ngô', addPre: 'Bà tiên làm phép thêm', addEnd: 'nữa.', subEnd: 'lăn đi mất rồi.', qAdd: 'Có tất cả mấy quả bí ngô?', qSub: 'Còn lại mấy quả bí ngô?', qMiss: 'Phải làm phép thêm mấy quả nữa?', away: 'run' },
  jasmine: { emoji: '🪔', has: 'Trên bàn có', noun: 'cây đèn thần', addPre: 'Chị mang thêm', addEnd: 'nữa.', subEnd: 'được thảm bay chở đi mất.', qAdd: 'Có tất cả mấy cây đèn thần?', qSub: 'Còn lại mấy cây đèn thần?', qMiss: 'Phải mang thêm mấy cây nữa?', away: 'fly' },
  snowwhite: { emoji: '🍎', has: 'Trong giỏ có', noun: 'quả táo', addPre: 'Bạn chim hái thêm', addEnd: 'nữa.', subEnd: 'lăn ra ngoài mất rồi.', qAdd: 'Có tất cả mấy quả táo?', qSub: 'Còn lại mấy quả táo?', qMiss: 'Phải hái thêm mấy quả nữa?', away: 'fall' },
  anna: { emoji: '⛄', has: 'Ngoài sân có', noun: 'bạn người tuyết', addPre: 'Chị làm phép thêm', addEnd: 'nữa.', subEnd: 'tan mất rồi.', qAdd: 'Có tất cả mấy bạn người tuyết?', qSub: 'Còn lại mấy bạn người tuyết?', qMiss: 'Phải làm thêm mấy bạn nữa?', away: 'melt' },
  aurora: { emoji: '🦋', has: 'Trong vườn có', noun: 'con bướm', addPre: 'Lại bay tới thêm', addEnd: 'nữa.', subEnd: 'bay đi mất rồi.', qAdd: 'Có tất cả mấy con bướm?', qSub: 'Còn lại mấy con bướm?', qMiss: 'Phải bay tới thêm mấy con nữa?', away: 'fly' },
  mulan: { emoji: '🌸', has: 'Trên cành có', noun: 'bông hoa đào', addPre: 'Chị làm nở thêm', addEnd: 'nữa.', subEnd: 'bị gió thổi bay mất.', qAdd: 'Có tất cả mấy bông hoa đào?', qSub: 'Còn lại mấy bông hoa đào?', qMiss: 'Phải làm nở thêm mấy bông nữa?', away: 'fly' },
  merida: { emoji: '🐻', has: 'Trong rừng có', noun: 'chú gấu', addPre: 'Lại chạy tới thêm', addEnd: 'nữa.', subEnd: 'chạy về hang mất rồi.', qAdd: 'Có tất cả mấy chú gấu?', qSub: 'Còn lại mấy chú gấu?', qMiss: 'Phải có thêm mấy chú nữa?', away: 'run' },
  tiana: { emoji: '🐸', has: 'Trên lá sen có', noun: 'chú ếch', addPre: 'Lại nhảy lên thêm', addEnd: 'nữa.', subEnd: 'nhảy xuống nước mất rồi.', qAdd: 'Có tất cả mấy chú ếch?', qSub: 'Còn lại mấy chú ếch?', qMiss: 'Phải nhảy lên thêm mấy chú nữa?', away: 'fall' },
};

/** Câu dùng chung (giọng Elsa). */
export const MATH_COMMON: Record<string, string> = {
  m_plus: 'cộng', m_minus: 'trừ', m_eq: 'bằng', m_eq_q: 'bằng mấy?', m_may: 'mấy', m_want: 'Chị muốn có',
};
export const NUMBER_TEXT = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];
export const numKey = (n: number) => `n${n}`;
const PARTS = ['has', 'noun', 'addPre', 'addEnd', 'subEnd', 'qAdd', 'qSub', 'qMiss'] as const;
type Part = typeof PARTS[number];
export const themeKey = (theme: string, part: Part) => `mt_${theme}_${part.toLowerCase()}`;

/** Mọi câu toán (khoá, chữ) cần sinh audio. */
export function mathAudioLines(): [string, string][] {
  const out: [string, string][] = Object.entries(MATH_COMMON);
  for (let n = 1; n <= 10; n++) out.push([numKey(n), NUMBER_TEXT[n]]);
  for (const [id, t] of Object.entries(MATH_THEMES)) for (const p of PARTS) out.push([themeKey(id, p), t[p]]);
  return out;
}

/** Câu hỏi: [chuỗi clip đọc, chữ phụ đề]. */
export function mathAsk(p: MathProblem): { keys: string[]; text: string } {
  const t = MATH_THEMES[p.theme as keyof typeof MATH_THEMES];
  const k = (part: Part) => themeKey(p.theme, part);
  const N = numKey;
  if (p.op === 'add') return {
    keys: [k('has'), N(p.a), k('noun'), k('addPre'), N(p.b), k('noun'), k('addEnd'), k('qAdd'), N(p.a), 'm_plus', N(p.b), 'm_eq_q'],
    text: `${t.has} ${p.a} ${t.noun}. ${t.addPre} ${p.b} ${t.noun} ${t.addEnd} ${t.qAdd} ${p.a} + ${p.b} = ?`,
  };
  if (p.op === 'sub') return {
    keys: [k('has'), N(p.a), k('noun'), N(p.b), k('noun'), k('subEnd'), k('qSub'), N(p.a), 'm_minus', N(p.b), 'm_eq_q'],
    text: `${t.has} ${p.a} ${t.noun}. ${p.b} ${t.noun} ${t.subEnd} ${t.qSub} ${p.a} − ${p.b} = ?`,
  };
  return {
    keys: [k('has'), N(p.a), k('noun'), 'm_want', N(p.c), k('noun'), k('qMiss'), N(p.a), 'm_plus', 'm_may', 'm_eq', N(p.c)],
    text: `${t.has} ${p.a} ${t.noun}. ${MATH_COMMON.m_want} ${p.c} ${t.noun}. ${t.qMiss} ${p.a} + ? = ${p.c}`,
  };
}
/** Câu hỏi ngắn khi bấm 🔊 / nhắc lại: câu hỏi + phép tính. */
export function mathAskShort(p: MathProblem): string[] {
  const all = mathAsk(p).keys;
  const q = all.findIndex((x) => /_q(add|sub|miss)$/.test(x));
  return all.slice(q);
}
/** Đọc phép tính đúng: "ba cộng hai bằng năm". */
export function mathSolved(p: MathProblem): string[] {
  if (p.op === 'sub') return [numKey(p.a), 'm_minus', numKey(p.b), 'm_eq', numKey(p.c)];
  return [numKey(p.a), 'm_plus', numKey(p.b), 'm_eq', numKey(p.c)];
}
/** Đáp án bé phải chọn. */
export function mathAnswer(p: MathProblem): number { return p.op === 'miss' ? p.b : p.c; }

/**
 * Độ khó theo vị trí phòng trong thứ tự mở cửa: 4 phòng đầu tổng / số bị trừ ≤ 5; sau đó ≤ 10; 3 phòng cuối có thêm
 * dạng "3 + ? = 5". Cộng / trừ xen kẽ (đếm `n` = số bài toán đã ra).
 */
export function mathLevel(roomIndex: number): { max: number; miss: boolean } {
  return { max: roomIndex < 4 ? 5 : 10, miss: roomIndex >= 8 };
}

/** Ra 1 bài. rnd ∈ [0,1). Kết quả luôn ≥ 1 (bé 5 tuổi chưa học số 0). */
export function makeProblem(roomIndex: number, n: number, theme: string, rnd: () => number = Math.random): MathProblem {
  const { max, miss } = mathLevel(roomIndex);
  const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  // xen kẽ cộng / trừ; phòng cuối: cứ 3 bài có 1 bài "thiếu số"
  const op: MathOp = miss && n % 3 === 2 ? 'miss' : n % 2 === 0 ? 'add' : 'sub';
  if (op === 'add') { const c = ri(2, max); const a = ri(1, c - 1); return { op, a, b: c - a, c, theme }; }
  if (op === 'sub') { const a = ri(2, max); const b = ri(1, a - 1); return { op, a, b, c: a - b, theme }; }
  const c = ri(3, max); const a = ri(1, c - 1); return { op, a, b: c - a, c, theme };
}

/** 3 số để chọn: đáp án + 2 số gần (≥ 1, ≤ max của phòng nhưng ít nhất 5), xáo trộn. */
export function mathOptions(answer: number, roomIndex: number, rnd: () => number = Math.random): number[] {
  const hi = Math.max(5, mathLevel(roomIndex).max);
  const near = [answer - 1, answer + 1, answer - 2, answer + 2, answer + 3, answer - 3].filter((x) => x >= 1 && x <= hi);
  const picks = new Set<number>([answer]);
  // ưu tiên 1 số liền kề + 1 số ngẫu nhiên trong vùng gần
  for (const x of near.sort(() => rnd() - 0.5).sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer)).slice(0, 4).sort(() => rnd() - 0.5)) {
    if (picks.size < 3) picks.add(x);
  }
  return [...picks].sort(() => rnd() - 0.5);
}

/** Liệt kê MỌI bài có thể ra (để soát đủ clip): mọi chủ đề × mọi phép × mọi cặp số. */
export function allProblems(): MathProblem[] {
  const out: MathProblem[] = [];
  for (const theme of Object.keys(MATH_THEMES)) {
    for (let c = 2; c <= 10; c++) for (let a = 1; a < c; a++) out.push({ op: 'add', a, b: c - a, c, theme });
    for (let a = 2; a <= 10; a++) for (let b = 1; b < a; b++) out.push({ op: 'sub', a, b, c: a - b, theme });
    for (let c = 3; c <= 10; c++) for (let a = 1; a < c; a++) out.push({ op: 'miss', a, b: c - a, c, theme });
  }
  return out;
}

// Chọn câu trong ngân hàng (src/lines.ts BANK_TEXT): ngẫu nhiên, không lặp lại các câu vừa dùng của ngân hàng đó
// (nhớ tối đa 3 câu gần nhất) → bé nghe đa dạng, không bị "nhai lại".
import { BANK_TEXT, bankKey } from './lines.ts';
import { play } from './audio.ts';

const recent = new Map<string, number[]>();

function pick(name: string, n: number, keep = 3): number {
  const last = recent.get(name) ?? [];
  const free = Array.from({ length: n }, (_, i) => i).filter((i) => !last.includes(i));
  const i = free[Math.floor(Math.random() * free.length)] ?? 0;
  recent.set(name, [...last, i].slice(-Math.min(keep, n - 1)));
  return i;
}

/** Khoá audio của 1 câu trong ngân hàng (không lặp câu vừa nói). */
export function bankKeyPick(bank: string): string {
  const entry = BANK_TEXT[bank];
  if (!entry) { console.warn('[voice] không có ngân hàng', bank); return bankKey(bank, 0); }
  return bankKey(bank, pick(bank, entry[1].length));
}

/** Phát 1 câu ngân hàng, resolve khi đọc xong. */
export function sayBank(bank: string): Promise<void> {
  return play(bankKeyPick(bank));
}

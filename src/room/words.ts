// Từ vựng phòng → dữ liệu bài tập (token đánh vần + audio key) + kiểm lỗi. Node-safe (không DOM, không three).
import { spell, defaultAsk, wordId, letterNameAudio, type SpellToken, type AudioLine } from '../spell.ts';
import type { RoomDef, RoomWord } from './types.ts';

export interface WordEntry {
  id: string;           // telex: mèo → meof
  word: string;
  emoji: string;
  name: string;
  tokens: SpellToken[];
  /** letterKeys: chữ → audio key âm của chữ đó (đọc khi bé chạm nhầm) */
  fill?: { index: number; distractors: string[]; letterKeys: Record<string, string> };
  askKey: string;       // ask_<id>
  /** chữ câu hỏi (phụ đề) */
  askText: string;
  nameKey: string;      // name_<id>
}

export function buildWord(w: RoomWord): WordEntry {
  const s = spell(w.word);
  return {
    id: s.id, word: s.word, emoji: w.emoji, name: w.name, tokens: s.tokens,
    fill: w.fill ? { index: w.fill.index, distractors: [...w.fill.distractors], letterKeys: fillLetterKeys(s.word, w.fill) } : undefined,
    askKey: `ask_${s.id}`, nameKey: `name_${s.id}`, askText: w.ask ?? defaultAsk(w.name),
  };
}

function fillLetterLines(word: string, fill: { index: number; distractors: readonly string[] }): AudioLine[] {
  const correct = Array.from(word)[fill.index];
  return [correct, ...fill.distractors].map((ch) => letterNameAudio(ch)).filter((x): x is AudioLine => !!x);
}
function fillLetterKeys(word: string, fill: { index: number; distractors: readonly string[] }): Record<string, string> {
  const out: Record<string, string> = {};
  const correct = Array.from(word)[fill.index];
  for (const ch of [correct, ...fill.distractors]) { const a = letterNameAudio(ch); if (a) out[ch] = a[0]; }
  return out;
}

/** Mọi dòng audio (key|text) mà từ vựng của phòng cần: câu hỏi, tên, token đánh vần. */
export function wordAudioLines(words: RoomWord[]): AudioLine[] {
  const out = new Map<string, string>();
  for (const w of words) {
    const s = spell(w.word);
    out.set(`ask_${s.id}`, w.ask ?? defaultAsk(w.name));
    out.set(`name_${s.id}`, w.name);
    for (const [k, t] of s.lines) out.set(k, t);
    if (w.fill) for (const [k, t] of fillLetterLines(s.word, w.fill)) out.set(k, t);
  }
  return [...out];
}

/** Soát hợp đồng phòng. Trả về danh sách lỗi (rỗng = đạt). */
export function validateRoom(def: RoomDef): string[] {
  const errs: string[] = [];
  const need = (ok: unknown, msg: string) => { if (!ok) errs.push(msg); };
  need(def.name && def.emoji, 'thiếu name/emoji');
  need(/^p_.+\.glb$/.test(def.princessModel), `princessModel "${def.princessModel}" phải là p_*.glb`);
  need(def.words.length >= 6, `cần ≥ 6 từ (đang ${def.words.length})`);
  need(def.words.filter((w) => w.fill).length >= 3, 'cần ≥ 3 từ có fill');
  need(def.challenges.length === 3, 'cần đúng 3 bài');
  need(def.audio && def.audio.intro && def.audio.thanks && def.audio.name, 'thiếu audio.name/intro/thanks');
  const ids = new Set<string>();
  const emojis = new Set<string>();
  for (const w of def.words) {
    let s;
    try { s = spell(w.word); } catch (e) { errs.push(`từ "${w.word}": ${(e as Error).message}`); continue; }
    if (ids.has(s.id)) errs.push(`từ "${w.word}" bị trùng`);
    ids.add(s.id);
    if (emojis.has(w.emoji)) errs.push(`emoji ${w.emoji} dùng cho 2 từ → bài chọn hình bị trùng hình`);
    emojis.add(w.emoji);
    if (!w.name || !w.name.normalize('NFC').includes(w.word.normalize('NFC'))) errs.push(`từ "${w.word}": name "${w.name}" phải chứa đúng từ đó (vd "con ${w.word}")`);
    if (w.fill) {
      const chars = Array.from(s.word);
      const { index, distractors } = w.fill;
      if (index < 0 || index >= chars.length) errs.push(`từ "${w.word}": fill.index ${index} ngoài 0..${chars.length - 1}`);
      else {
        const correct = chars[index];
        if (distractors.length !== 2) errs.push(`từ "${w.word}": fill.distractors cần đúng 2 chữ`);
        for (const d of distractors) {
          if (Array.from(d).length !== 1) errs.push(`từ "${w.word}": chữ nhiễu "${d}" phải là 1 ký tự`);
          if (d === correct) errs.push(`từ "${w.word}": chữ nhiễu "${d}" trùng chữ đúng`);
          if (!letterNameAudio(d)) errs.push(`từ "${w.word}": chữ nhiễu "${d}" không có âm để đọc`);
        }
        if (new Set(distractors).size !== distractors.length) errs.push(`từ "${w.word}": 2 chữ nhiễu trùng nhau`);
        const onsetLen = Array.from(s.onset).length;
        if (onsetLen > 1 && index < onsetLen) errs.push(`từ "${w.word}": đừng che 1 chữ trong âm đầu ghép "${s.onset}" (bé khó hiểu) – che nguyên âm hoặc chọn từ khác`);
      }
    }
  }
  if (!def.challenges.every((c) => c === 'spell' || c === 'fill' || c === 'math')) errs.push('challenges chỉ nhận spell | fill | math');
  if (!def.challenges.includes('math')) errs.push('cần 1 bài toán (math)');
  if (def.words.length < 3) errs.push('bài chọn hình cần ≥ 3 từ khác emoji');
  return errs;
}

export { wordId };

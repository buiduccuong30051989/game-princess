// Đánh vần tự động theo GDPT 2018 (Tiếng Việt 1). File THUẦN, không import gì:
// vừa chạy trong trình duyệt, vừa chạy bằng `node scripts/word-audio.ts` để sinh audio.
//
// Quy tắc:
//  - Gọi phụ âm theo ÂM: bờ, cờ, chờ, gờ, giờ, ngờ, quờ... (k = "ca").
//  - Vần 1 chữ:   âm đầu – vần – tiếng không dấu – tên dấu – tiếng      (bờ – o – bo – huyền – bò)
//  - Vần 2+ chữ:  đánh vần vần trước (e – o – eo), rồi tiếng (mờ – eo – meo), rồi thanh (huyền – mèo)
//  - Không dấu thì không có bước thanh. Âm cuối ng/nh/ch đọc là 1 đơn vị (ă – ngờ – ăng).
//  - lit = chỉ số chữ sáng lên khi đọc token, đếm theo Array.from(word) (code point, dạng NFC).

export interface SpellToken { audio: string; lit: number[] }
export type AudioLine = [key: string, text: string];

export interface Spelled {
  /** id ổn định theo từ (telex ASCII, có dấu thanh): mèo → meof, đèn → ddenf */
  id: string;
  word: string;
  onset: string;
  rhyme: string;
  tone: ToneName | null;
  tokens: SpellToken[];
  /** các dòng audio cần cho token (key|text) */
  lines: AudioLine[];
}

export type ToneName = 'huyen' | 'sac' | 'hoi' | 'nga' | 'nang';

const TONE_MARKS: Record<string, ToneName> = {
  '̀': 'huyen', '́': 'sac', '̉': 'hoi', '̃': 'nga', '̣': 'nang',
};
export const TONE_TEXT: Record<ToneName, string> = { huyen: 'huyền', sac: 'sắc', hoi: 'hỏi', nga: 'ngã', nang: 'nặng' };
const TONE_TELEX: Record<ToneName, string> = { huyen: 'f', sac: 's', hoi: 'r', nga: 'x', nang: 'j' };

/** Tên âm của phụ âm đầu / âm cuối (đánh vần theo âm, không theo tên chữ). */
export const CONSONANT_SOUND: Record<string, string> = {
  b: 'bờ', c: 'cờ', ch: 'chờ', d: 'dờ', 'đ': 'đờ', g: 'gờ', gh: 'gờ', gi: 'giờ', h: 'hờ', k: 'ca', kh: 'khờ',
  l: 'lờ', m: 'mờ', n: 'nờ', ng: 'ngờ', ngh: 'ngờ', nh: 'nhờ', p: 'pờ', ph: 'phờ', qu: 'quờ', r: 'rờ',
  s: 'sờ', t: 'tờ', th: 'thờ', tr: 'trờ', v: 'vờ', x: 'xờ',
};
const ONSETS = ['ngh', 'ng', 'gh', 'gi', 'ch', 'kh', 'nh', 'ph', 'th', 'tr', 'qu',
  'b', 'c', 'd', 'đ', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'x'];
const FINALS = ['ng', 'nh', 'ch', 'c', 'm', 'n', 'p', 't'];
const VOWELS = new Set(Array.from('aăâeêioôơuưy'));
const CONSONANT_LETTERS = new Set(Array.from('bcdđghklmnpqrstvx'));
/** Đọc nguyên âm đơn: y đọc là "i". */
const VOWEL_TEXT: Record<string, string> = { y: 'i' };

const TELEX: Record<string, string> = { 'ă': 'aw', 'â': 'aa', 'đ': 'dd', 'ê': 'ee', 'ô': 'oo', 'ơ': 'ow', 'ư': 'uw' };
/** Chữ không dấu thanh → ASCII telex (ă → aw, ư → uw, đ → dd). */
export function slug(s: string): string {
  return Array.from(s.normalize('NFC').toLowerCase()).map((c) => TELEX[c] ?? c).join('').replace(/[^a-z0-9]/g, '');
}

/** Tách dấu thanh: trả về tiếng không dấu (NFC) + tên thanh + vị trí chữ mang dấu. */
export function splitTone(word: string): { base: string; tone: ToneName | null; toneIndex: number } {
  const chars = Array.from(word.normalize('NFC'));
  let tone: ToneName | null = null;
  let toneIndex = -1;
  const out = chars.map((ch, i) => {
    const d = Array.from(ch.normalize('NFD'));
    const kept = d.filter((m) => {
      const t = TONE_MARKS[m];
      if (t) { tone = t; toneIndex = i; return false; }
      return true;
    });
    return kept.join('').normalize('NFC');
  });
  return { base: out.join(''), tone, toneIndex };
}

export class SpellError extends Error {}

export function spell(wordIn: string): Spelled {
  const word = wordIn.normalize('NFC').toLowerCase().trim();
  if (!word || /\s/.test(word)) throw new SpellError(`"${wordIn}": chỉ nhận 1 tiếng (không dấu cách)`);
  const { base, tone, toneIndex } = splitTone(word);
  const chars = Array.from(base);
  if (chars.some((c) => !VOWELS.has(c) && !CONSONANT_LETTERS.has(c))) throw new SpellError(`"${word}": có ký tự lạ`);

  // âm đầu
  let onset = '';
  for (const o of ONSETS) {
    if (!base.startsWith(o)) continue;
    const next = chars[Array.from(o).length];
    // gi / qu chỉ là âm đầu khi theo sau là nguyên âm (gió, quả); "gì" → g + i
    if ((o === 'gi' || o === 'qu') && (next === undefined || !VOWELS.has(next))) continue;
    onset = o; break;
  }
  const onLen = Array.from(onset).length;
  const rhymeChars = chars.slice(onLen);
  if (!rhymeChars.length || !VOWELS.has(rhymeChars[0])) throw new SpellError(`"${word}": không tách được vần`);
  const rhyme = rhymeChars.join('');

  // đơn vị trong vần: nguyên âm từng chữ; âm cuối ng/nh/ch gộp 1
  const units: { text: string; idx: number[]; consonant: boolean }[] = [];
  for (let i = 0; i < rhymeChars.length;) {
    const rest = rhymeChars.slice(i).join('');
    const fin = !VOWELS.has(rhymeChars[i]) ? FINALS.find((f) => rest === f) : undefined;
    if (fin) {
      const n = Array.from(fin).length;
      units.push({ text: fin, idx: Array.from({ length: n }, (_, k) => onLen + i + k), consonant: true });
      i += n;
    } else if (VOWELS.has(rhymeChars[i])) {
      units.push({ text: rhymeChars[i], idx: [onLen + i], consonant: false });
      i++;
    } else {
      throw new SpellError(`"${word}": âm cuối "${rest}" không hợp lệ`);
    }
  }

  const all = chars.map((_, i) => i);
  const rhymeIdx = rhymeChars.map((_, i) => onLen + i);
  const lines = new Map<string, string>();
  const tokens: SpellToken[] = [];
  const say = (key: string, text: string, lit: number[]) => { lines.set(key, text); tokens.push({ audio: key, lit }); };
  const unitKey = (u: typeof units[number]) => (u.consonant ? `c_${slug(u.text)}` : `v_${slug(u.text)}`);
  const unitText = (u: typeof units[number]) => (u.consonant ? CONSONANT_SOUND[u.text] : VOWEL_TEXT[u.text] ?? u.text);
  const rhymeKey = `v_${slug(rhyme)}`;
  const rhymeText = rhyme.length === 1 ? (VOWEL_TEXT[rhyme] ?? rhyme) : rhyme;

  if (units.length > 1) {
    for (const u of units) say(unitKey(u), unitText(u), u.idx);
    say(rhymeKey, rhymeText, rhymeIdx);
  }
  if (onset) {
    say(`c_${slug(onset)}`, CONSONANT_SOUND[onset], Array.from({ length: onLen }, (_, i) => i));
    say(rhymeKey, rhymeText, rhymeIdx);
    say(`s_${slug(base)}`, base, all);
  } else if (units.length === 1) {
    say(rhymeKey, rhymeText, rhymeIdx);
  }
  if (tone) {
    say(`t_${tone}`, TONE_TEXT[tone], [toneIndex]);
    say(`w_${wordId(word)}`, word, all);
  }
  return { id: wordId(word), word, onset, rhyme, tone, tokens, lines: [...lines] };
}

/** id từ: telex + chữ thanh (mèo → meof, bò → bof, cá → cas). */
export function wordId(word: string): string {
  const { base, tone } = splitTone(word.normalize('NFC').toLowerCase());
  return slug(base) + (tone ? TONE_TELEX[tone] : '');
}

/** Câu hỏi mặc định cho bài nghe – chọn hình. */
export function defaultAsk(name: string): string {
  return /^con /.test(name) ? `Con nào là ${name}?` : `Cái nào là ${name}?`;
}

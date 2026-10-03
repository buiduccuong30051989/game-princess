// Bảng vàng đánh vần: so chuỗi token (CHỮ đọc ra) của src/spell.ts với đáp án viết tay theo SGK Tiếng Việt 1 (GDPT 2018).
// Chạy đầu `pnpm build`: lệch 1 token là build đỏ. MỌI từ trong 11 phòng phải có ở đây (thêm từ mới → thêm đáp án tay).
// Quy tắc: phụ âm gọi theo âm (bờ, cờ…, k = "ca"); ă = "á", â = "ớ"; i, y trong chuỗi đánh vần đọc "i" (tên chữ: "i ngắn",
// "i dài"); iê/yê → "ia", uô → "ua", ươ → "ưa" khi có âm cuối; vần kết thúc c/ch/p/t đọc với thanh SẮC rồi mới thêm dấu
// (vịt = i – tờ – ít, vờ – ít – vít – nặng – vịt; tiếng mang sắc dừng ở tiếng sắc: sách = … sờ – ách – sách).
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { spell, letterNameAudio } = await imp('src/spell.ts');

/** từ → chuỗi đọc, các token cách nhau bởi " – " (viết tay, đối chiếu SGK) */
const GOLDEN = {
  // ---- 61 từ của 11 phòng
  'bánh': 'a – nhờ – anh – bờ – anh – banh – sắc – bánh',
  'bí': 'bờ – i – bi – sắc – bí',
  'chim': 'i – mờ – im – chờ – im – chim',
  'chảo': 'a – o – ao – chờ – ao – chao – hỏi – chảo',
  'chổi': 'ô – i – ôi – chờ – ôi – chôi – hỏi – chổi',
  'cua': 'u – a – ua – cờ – ua – cua',
  'cung': 'u – ngờ – ung – cờ – ung – cung',
  'cá': 'cờ – a – ca – sắc – cá',
  'cú': 'cờ – u – cu – sắc – cú',
  'dâu': 'ớ – u – âu – dờ – âu – dâu',
  'dưa': 'ư – a – ưa – dờ – ưa – dưa',
  'dế': 'dờ – ê – dê – sắc – dế',
  'ghế': 'gờ – ê – ghê – sắc – ghế',
  'giày': 'a – i – ay – giờ – ay – giay – huyền – giày',
  'giỏ': 'giờ – o – gio – hỏi – giỏ',
  'gương': 'ưa – ngờ – ương – gờ – ương – gương',
  'gấu': 'ớ – u – âu – gờ – âu – gâu – sắc – gấu',
  'hoa': 'o – a – oa – hờ – oa – hoa',
  'hồng': 'ô – ngờ – ông – hờ – ông – hông – huyền – hồng',
  'hổ': 'hờ – ô – hô – hỏi – hổ',
  'kem': 'e – mờ – em – ca – em – kem',
  'khăn': 'á – nờ – ăn – khờ – ăn – khăn',
  'khỉ': 'khờ – i – khi – hỏi – khỉ',
  'kèn': 'e – nờ – en – ca – en – ken – huyền – kèn',
  'kẹo': 'e – o – eo – ca – eo – keo – nặng – kẹo',
  'lửa': 'ư – a – ưa – lờ – ưa – lưa – hỏi – lửa',
  'mũ': 'mờ – u – mu – ngã – mũ',
  'mực': 'ư – cờ – ức – mờ – ức – mức – nặng – mực',
  'nai': 'a – i – ai – nờ – ai – nai',
  'ngọc': 'o – cờ – óc – ngờ – óc – ngóc – nặng – ngọc',
  'ngựa': 'ư – a – ưa – ngờ – ưa – ngưa – nặng – ngựa',
  'nho': 'nhờ – o – nho',
  'núi': 'u – i – ui – nờ – ui – nui – sắc – núi',
  'nơ': 'nờ – ơ – nơ',
  'nấm': 'ớ – mờ – âm – nờ – âm – nâm – sắc – nấm',
  'nến': 'ê – nờ – ên – nờ – ên – nên – sắc – nến',
  'nồi': 'ô – i – ôi – nờ – ôi – nôi – huyền – nồi',
  'quạt': 'a – tờ – át – quờ – át – quát – nặng – quạt',
  'rùa': 'u – a – ua – rờ – ua – rua – huyền – rùa',
  'rồng': 'ô – ngờ – ông – rờ – ông – rông – huyền – rồng',
  'sao': 'a – o – ao – sờ – ao – sao',
  'sen': 'e – nờ – en – sờ – en – sen',
  'sách': 'a – chờ – ách – sờ – ách – sách',
  'sóc': 'o – cờ – óc – sờ – óc – sóc',
  'thìa': 'i – a – ia – thờ – ia – thia – huyền – thìa',
  'thỏ': 'thờ – o – tho – hỏi – thỏ',
  'trà': 'trờ – a – tra – huyền – trà',
  'trăng': 'á – ngờ – ăng – trờ – ăng – trăng',
  'trống': 'ô – ngờ – ông – trờ – ông – trông – sắc – trống',
  'tuyết': 'u – ia – tờ – uyết – tờ – uyết – tuyết',
  'tách': 'a – chờ – ách – tờ – ách – tách',
  'táo': 'a – o – ao – tờ – ao – tao – sắc – táo',
  'tôm': 'ô – mờ – ôm – tờ – ôm – tôm',
  'voi': 'o – i – oi – vờ – oi – voi',
  'váy': 'a – i – ay – vờ – ay – vay – sắc – váy',
  'vẹt': 'e – tờ – ét – vờ – ét – vét – nặng – vẹt',
  'đá': 'đờ – a – đa – sắc – đá',
  'đèn': 'e – nờ – en – đờ – en – đen – huyền – đèn',
  'ấm': 'ớ – mờ – âm – sắc – ấm',
  'ếch': 'ê – chờ – ếch',
  'ốc': 'ô – cờ – ốc',
  // ---- ca mẫu (giữ bộ sinh đúng nếu sau này thêm từ): vần tắc có dấu nặng / sắc, ă, y, không âm đầu
  'vịt': 'i – tờ – ít – vờ – ít – vít – nặng – vịt',
  'học': 'o – cờ – óc – hờ – óc – hóc – nặng – học',
  'hát': 'a – tờ – át – hờ – át – hát',
  'đẹp': 'e – pờ – ép – đờ – ép – đép – nặng – đẹp',
  'ăn': 'á – nờ – ăn',
  'yên': 'ia – nờ – yên',
  'ly': 'lờ – i – ly',
  'bà': 'bờ – a – ba – huyền – bà',
  'mèo': 'e – o – eo – mờ – eo – meo – huyền – mèo',
};

/** Tên chữ khi bé chạm nút chữ ở bài điền chữ thiếu (gọi theo âm, SGK lớp 1). */
const NAMES = {
  a: 'a', 'ă': 'á', 'â': 'ớ', b: 'bờ', c: 'cờ', d: 'dờ', 'đ': 'đờ', e: 'e', 'ê': 'ê', g: 'gờ', h: 'hờ', i: 'i ngắn',
  k: 'ca', l: 'lờ', m: 'mờ', n: 'nờ', o: 'o', 'ô': 'ô', 'ơ': 'ơ', p: 'pờ', r: 'rờ', s: 'sờ', t: 'tờ',
  u: 'u', 'ư': 'ư', v: 'vờ', x: 'xờ', y: 'i dài',
};

let bad = 0;
const textOf = (w) => {
  const s = spell(w);
  const map = new Map(s.lines);
  return s.tokens.map((t) => map.get(t.audio)).join(' – ');
};
for (const [w, want] of Object.entries(GOLDEN)) {
  let got;
  try { got = textOf(w); } catch (e) { got = `LỖI ${e.message}`; }
  if (got !== want) { bad++; console.error(`✗ ${w}\n    muốn: ${want}\n    ra:   ${got}`); }
}
for (const [ch, want] of Object.entries(NAMES)) {
  const got = letterNameAudio(ch)?.[1];
  if (got !== want) { bad++; console.error(`✗ tên chữ ${ch}: "${got}" ≠ "${want}"`); }
}
// mọi từ của 11 phòng phải có đáp án tay; mọi chữ trên nút bài điền phải có tên đúng
let words = 0, letters = 0;
for (const f of readdirSync(join(root, 'src/rooms')).filter((x) => x.endsWith('.ts') && x !== 'index.ts' && x !== 'princesses.ts')) {
  const def = (await imp(`src/rooms/${f}`)).default;
  for (const w of def.words) {
    words++;
    if (!(w.word in GOLDEN)) { bad++; console.error(`✗ từ "${w.word}" (phòng ${def.id}) chưa có đáp án trong bảng vàng`); }
    if (w.fill) {
      const correct = Array.from(w.word.normalize('NFC'))[w.fill.index];
      for (const ch of [correct, ...w.fill.distractors]) {
        letters++;
        if (!(ch in NAMES)) { bad++; console.error(`✗ nút chữ "${ch}" (từ ${w.word}, phòng ${def.id}) chưa có tên trong bảng NAMES`); }
      }
    }
  }
}
if (bad) { console.error(`\ncheck-spelling: ${bad} lỗi`); process.exit(1); }
console.log(`check-spelling: ✓ ${Object.keys(GOLDEN).length} từ + ${Object.keys(NAMES).length} tên chữ khớp bảng vàng (${words} từ phòng, ${letters} nút chữ)`);

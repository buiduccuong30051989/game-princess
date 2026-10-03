// Gom MỌI dòng audio của game → scripts/audio/_all.gen.txt (key|giọng|câu), cho scripts/gen-audio.py sinh bằng edge-tts
// (Microsoft Hoài My). Nguồn: src/lines.ts (thoại, ngân hàng câu, câu phòng, gia đình), src/math.ts (câu toán, số),
// src/rooms/<id>.ts + src/spell.ts (từ vựng, token đánh vần, tên chữ). Node ≥ 22.18 tự bỏ kiểu TS khi import.
//
// Dùng: node scripts/audio-lines.mjs           (ghi _all.gen.txt)
//       node scripts/audio-lines.mjs --check   (chỉ soát, chạy trong `pnpm build`; exit 1 nếu lỗi):
//         - khoá lạ / câu rỗng / khoá trùng khác chữ, ngoặc {} lệch;
//         - phần giọng Việt còn chứa tên tiếng Anh (EN_NAMES) → phải viết {Tên};
//         - ngân hàng câu 8–15 câu;
//         - hợp đồng 11 phòng (src/room/words.ts validateRoom);
//         - MỌI tổ hợp bài toán (mọi chủ đề × cộng/trừ/thiếu số × mọi cặp số trong 10) có đủ clip;
//         - mỗi khoá có file public/audio/<key>.m4a (bỏ qua bằng --no-files).
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const L = await imp('src/lines.ts');
const M = await imp('src/math.ts');
const { wordAudioLines, validateRoom } = await imp('src/room/words.ts');
const check = process.argv.includes('--check');
const files = !process.argv.includes('--no-files');

const out = new Map();
let bad = 0;
const err = (m) => { bad++; console.error(`✗ ${m}`); };
const add = (key, voice, text) => {
  if (!/^[a-z0-9_]+$/.test(key)) return err(`khoá lạ: ${key}`);
  if (!text || !text.trim()) return err(`câu rỗng: ${key}`);
  if (!L.VOICES[voice]) return err(`giọng lạ "${voice}" ở ${key}`);
  // phần đọc bằng giọng Việt (ngoài {…}) không được chứa tên tiếng Anh → tên tiếng Anh luôn do giọng tiếng Anh đọc
  const vi = text.replace(/\{[^}]*\}/g, ' ');
  for (const n of L.EN_NAMES) {
    if (new RegExp(`(^|[^\\p{L}])${n}([^\\p{L}]|$)`, 'iu').test(vi)) err(`${key}: tên tiếng Anh "${n}" nằm trong phần giọng Việt — viết {${n}}`);
  }
  if (/[{}]/.test(vi) || (text.match(/\{/g) ?? []).length !== (text.match(/\}/g) ?? []).length) err(`${key}: ngoặc {} lệch`);
  const prev = out.get(key);
  if (prev && (prev[0] !== voice || prev[1] !== text)) return err(`khoá ${key} trùng mà khác câu: "${prev[1]}" ≠ "${text}"`);
  out.set(key, [voice, text]);
};

// 1. thoại + ngân hàng + phòng + gia đình
for (const [k, sp, t] of L.allLines()) add(k, L.voiceOf(sp), t);
for (const [b, [, list]] of Object.entries(L.BANK_TEXT)) {
  if (list.length < 8 || list.length > 15) err(`ngân hàng "${b}" có ${list.length} câu (cần 8–15)`);
}
// 2. toán: số, câu chung, câu theo chủ đề (giọng Elsa)
for (const [k, t] of M.mathAudioLines()) add(k, 'elsa', t);
// 3. từ vựng 11 phòng: câu hỏi, tên, token đánh vần, tên chữ cái (giọng Elsa) + soát hợp đồng phòng
const roomFiles = readdirSync(join(root, 'src/rooms')).filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'princesses.ts');
for (const f of roomFiles.sort()) {
  const def = (await imp(`src/rooms/${f}`)).default;
  const errs = validateRoom(def);
  for (const e of errs) err(`${def.id}: ${e}`);
  for (const [k, t] of wordAudioLines(def.words)) add(k, 'elsa', t);
  for (const part of ['name', 'intro', 'thanks']) if (def.audio[part] !== L.roomKey(def.id, part)) err(`${def.id}: audio.${part} phải là ${L.roomKey(def.id, part)}`);
  if (!(def.id in M.MATH_THEMES)) err(`${def.id}: chưa có chủ đề toán trong src/math.ts`);
}

// 4. mọi tổ hợp bài toán đều đủ clip
let combos = 0;
for (const p of M.allProblems()) {
  combos++;
  for (const k of [...M.mathAsk(p).keys, ...M.mathSolved(p), ...M.mathAskShort(p)]) {
    if (!out.has(k)) { err(`toán ${p.theme} ${p.op} ${p.a},${p.b},${p.c}: thiếu clip "${k}"`); break; }
  }
}
// đáp án luôn nằm trong 3 lựa chọn, kết quả trong 1..10
for (let room = 0; room < 11; room++) for (let n = 0; n < 60; n++) {
  const p = M.makeProblem(room, n, 'snow');
  const ans = M.mathAnswer(p), opts = M.mathOptions(ans, room);
  const { max } = M.mathLevel(room);
  if (!opts.includes(ans) || opts.length !== 3 || new Set(opts).size !== 3) err(`toán phòng ${room}: lựa chọn ${opts} sai (đáp án ${ans})`);
  if (p.c > max || p.c < 1 || p.a < 1 || p.b < 1) err(`toán phòng ${room}: ${JSON.stringify(p)} ngoài phạm vi ≤ ${max}`);
}

// 5. file audio đã sinh đủ
if (check && files) {
  const missing = [...out.keys()].filter((k) => !existsSync(join(root, 'public/audio', `${k}.m4a`)));
  if (missing.length) err(`${missing.length} câu chưa có file public/audio/<key>.m4a (chạy \`pnpm audio\`): ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ' …' : ''}`);
}

if (bad) { console.error(`audio-lines: ${bad} lỗi`); process.exit(1); }
if (!check) {
  const vo = Object.entries(L.VOICES).map(([k, v]) => `#voice ${k}|${v.voice}|${v.rate}|${v.pitch}|${v.en}|${v.enPitch}`);
  const lines = [...out].sort(([a], [b]) => a.localeCompare(b)).map(([k, [v, t]]) => `${k}|${v}|${t}`);
  writeFileSync(join(root, 'scripts/audio/_all.gen.txt'),
    ['# TỰ SINH bởi scripts/audio-lines.mjs – ĐỪNG SỬA TAY. Sửa câu trong src/lines.ts / src/math.ts / src/rooms/<id>.ts rồi `pnpm audio`.', ...vo, ...lines].join('\n') + '\n');
}
console.log(`audio-lines: ✓ ${out.size} câu, ${combos} tổ hợp bài toán đủ clip${check && files ? ', đủ file m4a' : ''}`);

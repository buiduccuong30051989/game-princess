// Sinh scripts/audio/_words.gen.txt: mọi dòng audio từ vựng (ask_/name_/token đánh vần) của 11 phòng,
// đọc THẲNG từ src/rooms/<id>.ts (Node ≥ 22.18 tự bỏ type TS). Đồng thời soát hợp đồng phòng.
// Dùng: node scripts/word-audio.mjs            (gen-audio.sh tự gọi)
//       node scripts/word-audio.mjs --check    (chỉ soát, không ghi file; exit 1 nếu lỗi)
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const roomsDir = join(root, 'src/rooms');
const checkOnly = process.argv.includes('--check');
const { wordAudioLines, validateRoom } = await import(pathToFileURL(join(root, 'src/room/words.ts')).href);

const files = readdirSync(roomsDir).filter((f) => f.endsWith('.ts') && !f.startsWith('_') && f !== 'index.ts' && f !== 'princesses.ts');
const lines = new Map();
let bad = 0;
for (const f of files.sort()) {
  let def;
  try {
    def = (await import(pathToFileURL(join(roomsDir, f)).href)).default;
  } catch (e) {
    console.error(`✗ ${f}: không import được (${e.message.split('\n')[0]}) – bỏ qua phòng này`);
    bad++;
    continue;
  }
  const errs = validateRoom(def);
  if (errs.length) { bad++; console.error(`✗ ${def.id}: ${errs.length} lỗi\n   - ${errs.join('\n   - ')}`); }
  else console.log(`✓ ${def.id} (${def.words.length} từ)`);
  try {
    for (const [k, t] of wordAudioLines(def.words)) {
      const prev = lines.get(k);
      if (prev !== undefined && prev !== t) console.warn(`! key ${k}: "${prev}" ≠ "${t}" (giữ bản đầu) – đổi name/ask cho khớp phòng khác`);
      if (prev === undefined) lines.set(k, t);
    }
  } catch (e) { console.error(`✗ ${def.id}: ${e.message}`); bad++; }
}
if (!checkOnly) {
  const out = ['# TỰ SINH bởi scripts/word-audio.mjs – ĐỪNG SỬA TAY. Sửa từ vựng trong src/rooms/<id>.ts rồi chạy lại.',
    ...[...lines].sort(([a], [b]) => a.localeCompare(b)).map(([k, t]) => `${k}|${t}`)];
  writeFileSync(join(root, 'scripts/audio/_words.gen.txt'), out.join('\n') + '\n');
  console.log(`→ scripts/audio/_words.gen.txt: ${lines.size} dòng`);
}
if (checkOnly && bad) process.exit(1);

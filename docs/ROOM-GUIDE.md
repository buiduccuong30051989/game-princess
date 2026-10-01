# Hướng dẫn làm 1 phòng công chúa

Tài liệu cho người (hoặc agent) làm 1 trong 11 phòng của "Lâu đài công chúa". Phòng mẫu đã xong: **`src/rooms/rapunzel.ts`** + **`scripts/audio/rapunzel.txt`**. Đọc hết file mẫu trước khi viết.

Người chơi: Hà An, 5 tuổi, chưa biết đọc. Chơi trên iPad/Mac, chỉ chạm. Mọi chỉ dẫn đều được đọc thành tiếng. Không có thua.

---

## 0. Luật làm song song (quan trọng)

Có 10 phòng được làm cùng lúc. Để không giẫm chân nhau, **mỗi phòng chỉ được sửa đúng 2 file của mình**:

| Được sửa | Không được sửa |
|---|---|
| `src/rooms/<id>.ts` | mọi file khác trong `src/` (kit, RoomScene, hall, pose, ice…) |
| `scripts/audio/<id>.txt` | `scripts/audio-manifest.txt`, `scripts/audio/_words.gen.txt` (tự sinh), phòng khác |
| sinh thêm file `public/audio/*.m4a` bằng script | `src/rooms/index.ts`, `src/rooms/_stub.ts`, `src/rooms/princesses.ts` |

Cần thêm helper dùng chung? Viết hàm **ngay trong file phòng của mình** (như `drawSun`, `fryingPan`, `easel` trong rapunzel.ts). Nếu thấy thật sự cần sửa file chung (bug, tư thế model lệch…), ghi rõ vào báo cáo cuối việc, đừng tự sửa.

Không dùng `npm`, chỉ `pnpm`. Không bật dev server cổng khác: server dev chạy sẵn ở **http://localhost:5182** (kiểm bằng `curl -s -o /dev/null -w "%{http_code}" http://localhost:5182`; nếu chưa chạy thì `pnpm dev --port 5182`).

---

## 1. Hợp đồng phòng (`RoomDef`)

Định nghĩa ở `src/room/types.ts`. File phòng `export default` 1 object:

```ts
const room: RoomDef = {
  id: 'belle',                         // GIỮ NGUYÊN id có sẵn trong file stub
  name: 'Thư viện của Belle',          // tên tiếng Việt (hiện băng rôn khi vào phòng)
  emoji: '🌹',                          // biểu tượng phòng (huy hiệu ở sảnh, cửa, bệ)
  princessModel: 'p_belle.glb',        // GIỮ NGUYÊN
  rig: 'lores',                        // GIỮ NGUYÊN (ghi chú; Poser tự dò xương)
  palette: { primary, secondary, accent, light, dark },   // số hex
  buildScene,                          // (ctx) => dựng cảnh vào ctx.root (được await)
  ambient,                             // (ctx, dt) => hoạt cảnh mỗi frame (tuỳ chọn)
  words: [...],                        // ≥ 6 từ, ≥ 3 từ có `fill`
  count: { emoji: '🌹', audio: 'belle_count', range: [3, 7] },
  challenges: ['spell', 'fill', 'count'],     // 3 bài theo thứ tự, có thể đổi thứ tự
  magicColors: [0xd62839, 0xf4b400],          // 2 màu hạt phép (đậm, bão hoà)
  audio: { name: 'belle_name', intro: 'belle_intro', thanks: 'belle_thanks' },
};
export default room;
```

Những gì **RoomScene tự làm, phòng KHÔNG cần làm**: bệ tròn giữa phòng (màu theo `palette.primary`), tượng băng công chúa + tan băng + vỡ băng + tỉnh dậy, Elsa dẫn đường + tia phép, ánh sáng chung (hemi + đèn chính có bóng + đèn phụ + đèn viền), tuyết rơi khi còn băng, viền băng mép màn hình, bảng câu hỏi, nút, pháo giấy, tiến độ.

**Phòng chỉ làm: trang trí xung quanh + từ vựng + audio riêng.**

### Bố cục cố định (`ctx.layout`, xem `ROOM_LAYOUT` trong `src/room/RoomScene.ts`)

```
            tường sau z ≈ -5 … -6.5   (chỉ thấy tới độ cao ~4 m ở tường sau)
                    ┌─────────────┐
                    │  cửa sổ/tranh│
   tường bên        │   [công chúa] │        tường bên
   x ≈ -6.5         │ bệ r=1 tại 0,0│        x ≈ +6.5
                    │               │
      Elsa (-2.15, 0, 0.75)
              ─────────────── camera (0.15, 1.95, 8.4) nhìn (0.15, 0.62, 0)
```

- Công chúa cao 1.75 m đứng trên bệ cao 0.35 m tại (0, 0, 0). Elsa đứng (-2.15, 0, 0.75).
- **Vùng cấm đồ cao**: đừng đặt gì cao hơn 0.5 m trong khoảng |x| < 3.2 và z > -1.4 (che nhân vật / che Elsa).
- **40 % dưới màn hình bị bảng câu hỏi che** khi đang làm bài → sàn phía trước chỉ cần đẹp (thảm, hoạ tiết), đừng đặt đồ quan trọng ở đó.
- Khung hình thấy rõ nhất: tường sau từ y = 0.5 tới ~4 m, hai tường bên x = ±5…6.5, cao 0.5…3.5 m. Đồ treo trần phải hạ xuống ≤ 3.3 m mới lọt khung.
- Màn 4:3 (iPad) camera tự lùi ra, hai bên thấy rộng hơn chút → đừng để mép cảnh trống trơn ở |x| ≈ 7.

### `RoomCtx` (tham số của `buildScene` / `ambient`)

| Trường | Dùng để |
|---|---|
| `root` | `ctx.root.add(...)` MỌI thứ phòng tạo ra (để đổi phòng dọn sạch) |
| `scene`, `camera` | đổi `scene.background`, thêm `scene.fog` nếu muốn (đừng di chuyển camera) |
| `model(name, { height, keep })` | tải + clone GLB trong `public/models` (đã sửa metalness). Trả `Object3D` chưa add |
| `emoji(e, size)` | emoji thành sprite quay về camera (dùng tiết chế: đồ khối 3D đẹp hơn) |
| `magic` | hạt phép chung: `twinkle`, `burst`, `ring`, `emit` (nền sáng: màu ĐẬM, size 0.3–0.7) |
| `melt` (0→1), `awake`, `time` | đọc trong `ambient` để cảnh sáng/đông vui dần khi băng tan |
| `state` | object riêng của phòng để cất tham chiếu giữa `buildScene` và `ambient` |
| `palette`, `layout` | như trên |

---

## 2. Từ vựng và đánh vần (tự động, đúng GDPT 2018)

```ts
words: [
  { word: 'đèn', emoji: '🏮', name: 'cái đèn', fill: { index: 0, distractors: ['b', 'm'] } },
  { word: 'mèo', emoji: '🐈', name: 'con mèo', ask: 'Con nào là con mèo?' },
]
```

- `word`: **1 tiếng**, chữ thường, có dấu, đồ vật/con vật **cụ thể, vẽ được bằng 1 emoji Apple, bé 5 tuổi biết**. Gắn với chủ đề phòng.
- `emoji`: mỗi từ 1 emoji KHÁC NHAU (bài chọn hình cần 3 hình khác nhau).
- `name`: cụm có loại từ, phải chứa đúng `word`: `cái đèn`, `con cá`, `bông hoa`, `quả táo`, `quyển sách`.
- `ask` (tuỳ chọn): mặc định `Con nào là <name>?` nếu name bắt đầu bằng "con ", ngược lại `Cái nào là <name>?`. Viết `ask` khi câu mặc định nghe kỳ ("Cái nào là quả táo?" → "Quả nào là quả táo?" cũng được, nhưng giữ đơn giản).
- `fill`: bài điền chữ. `index` = vị trí chữ bị che theo `Array.from(word)` (đ, ă, ê… tính 1 chữ). `distractors` = 2 chữ nhiễu, khác chữ đúng, khác nhau. Nên che **phụ âm đầu 1 chữ** (b, c, đ, h, l, m, n, s, t, v…). ĐỪNG che 1 chữ trong âm đầu ghép (ch, th, nh, ng, gi, tr, ph, kh, qu…) – validator sẽ báo lỗi. Đừng cho chữ nhiễu đọc gần giống chữ đúng (s/x, d/gi, ch/tr).

**Token đánh vần + audio key được SINH TỰ ĐỘNG** từ `word` bằng `src/spell.ts`, theo đúng quy tắc:

- Gọi âm theo ÂM: bờ, cờ, chờ, đờ, gờ, giờ, ngờ, quờ… (k = "ca").
- Vần 1 chữ: `bờ – o – bo – huyền – bò`.
- Vần 2+ chữ: `e – o – eo`, rồi `mờ – eo – meo`, rồi `huyền – mèo`. Âm cuối ng/nh/ch đọc 1 đơn vị: `ă – ngờ – ăng`.
- Không dấu thì không có bước thanh (`hờ – oa – hoa` là hết).

Xem thử token của 1 từ:

```bash
node -e "import('./src/spell.ts').then(({spell})=>{const s=spell('chảo');console.log(s.id, s.tokens.map(t=>s.lines.find(l=>l[0]===t.audio)[1]+'['+t.lit+']').join(' – '))})"
# chaor a[2] – o[3] – ao[2,3] – chờ[0,1] – ao[2,3] – chao[0,1,2,3] – hỏi[2] – chảo[0,1,2,3]
```

Số trong `[...]` là chữ sáng lên (cam) khi đọc token đó. Kiểm bằng mắt từng từ của phòng mình.

**Cùng 1 từ ở 2 phòng dùng chung audio** (key theo từ: `ask_hoa`, `name_hoa`). Trước khi thêm từ, mở `scripts/audio/_words.gen.txt`: nếu từ đã có, dùng **đúng** `name`/`ask` như bản đã có (script sẽ cảnh báo nếu khác).

---

## 3. Audio

Giọng: macOS `say -v Linh` → `.m4a` trong `public/audio/`.

1. Viết câu riêng của phòng vào `scripts/audio/<id>.txt`, mỗi dòng `key|text`:
   ```
   belle_name|Thư viện của Belle!
   belle_intro|Đây là thư viện của công chúa Belle. Ôi, Belle bị đóng băng mất rồi! Hà An trả lời đúng ba câu để làm tan băng nhé!
   belle_thanks|Cảm ơn Hà An nhé! Tớ là Belle. Mình cùng đọc truyện nhé!
   belle_count|Có mấy bông hồng? Chạm từng bông để đếm nhé.
   ```
   - Câu ngắn, từ dễ, giọng vui, gọi "Hà An". Intro ≤ 2 câu + lời nhắc làm tan băng. Thanks do công chúa nói, xưng "tớ".
   - Câu đếm nói rõ vật đếm là gì, khớp `count.emoji`.
   - **KHÔNG viết dòng từ vựng** (`ask_…`, `name_…`, `c_…`, `v_…`, `s_…`, `t_…`, `w_…`): chúng tự sinh.
2. Sinh audio (chỉ sinh clip chưa có; phòng khác không bị ảnh hưởng):
   ```bash
   bash scripts/gen-audio.sh                 # tất cả clip còn thiếu
   ONLY=belle bash scripts/gen-audio.sh      # chỉ file của phòng mình + từ vựng
   FORCE=1 ONLY=belle bash scripts/gen-audio.sh   # sinh lại khi đã sửa câu
   ```
   Script tự chạy `node scripts/word-audio.mjs` (soát hợp đồng 11 phòng + sinh `_words.gen.txt`). Chỉ soát: `node scripts/word-audio.mjs --check`.
3. Câu dùng chung (đúng rồi, thử lại, số 1–10, câu tan băng…) đã có trong `scripts/audio-manifest.txt` – đừng thêm lại.

---

## 4. Xem thử phòng của mình

```
http://localhost:5182/?room=<id>&debug=1            vào thẳng phòng (bỏ sảnh), thanh debug góc phải dưới
http://localhost:5182/?room=<id>&debug=1&melt=1     đã tan 1 nấc   (&melt=2: 2 nấc)
http://localhost:5182/?room=<id>&debug=1&wake=1     công chúa đã tỉnh
http://localhost:5182/?saved=5                      sảnh như đã cứu 5 phòng đầu (không ghi tiến độ thật)
http://localhost:5182/?saved=3&ball=3               chạy dạ hội mốc 3
http://localhost:5182/?reset=1                      xoá tiến độ đã lưu
http://localhost:5182/lab.html?state=rest           12 tượng cùng lúc: frozen | bind | rest | wave | curtsy | open | cheer | twirl (&ice=0..2, &only=p_belle)
```

Thanh debug: **✔ đúng** (qua câu hiện tại), **✨ tỉnh ngay**, **🧊 tan 1 nấc**, **💃 xoay**, **🙇 chào**, **👋 vẫy**, và 1 khung soát:
- ✅/❌ hợp đồng phòng (số từ, fill, emoji trùng, token lỗi…)
- ✅/❌ audio: liệt kê key còn thiếu file `.m4a`.

Kết quả soát cũng nằm ở `window.__roomCheck` (`{ errors, missing }`) để đọc bằng Playwright.

**Chưa chạm vào trang thì trình duyệt chưa cho phát tiếng** – luồng vẫn chạy (tự chờ đúng độ dài clip), chạm 1 lần bất kỳ đâu là có tiếng.

### Chụp màn hình bằng Playwright MCP

- Nạp tool: `ToolSearch select:mcp__playwright__browser_navigate,mcp__playwright__browser_evaluate,mcp__playwright__browser_take_screenshot,mcp__playwright__browser_close`.
- Lưu ảnh vào `/Users/a1234/Documents/smartoshi/.playwright-mcp/`.
- Screenshot thường hay **hụt frame hạt phép**. Muốn kiểm hiệu ứng: `window.__game.snap()` (render + `toDataURL`) rồi gắn ảnh vào trang để chụp.
- Vòng chờ trong `browser_evaluate` **luôn có giới hạn thời gian** (`Date.now() - t0 < 20000`), không thì treo tool rất lâu.
- `window.__game` (chỉ bản dev): `scene` (RoomScene hiện tại: `.challenge.skip()`, `.princess`, `.elsa`, `.awake`), `goRoom(id)`, `goHall()`, `snap()`, `engine.fps`.
- Xong việc: `browser_close`.

---

## 5. Công cụ dựng cảnh (`src/room/kit.ts`)

Mọi hàm trả `Object3D` chưa add. Đơn vị mét.

| Nhóm | Hàm |
|---|---|
| Vật liệu | `mat(color, {rough, emissive, ei, opacity, side, flat})` (cache), `glowMat(color)` (tự sáng), `texMat(tex, {...})`, `mix(a, b, t)` pha màu, `css(hex)` |
| Texture canvas | `canvasTex(w, h, draw, repeat)`, `brickTex`, `plankTex`, `tileTex`, `wallpaperTex`, `skyTex(top, bottom, stars)`, `glowTex()` |
| Kiến trúc | `floor(w, d, mat)`, `wall(w, h, mat)`, `curvedWall(r, h, mat, arc, center)` (tháp/phòng tròn), `wallWithArch(w, h, archW, archH, archY, mat)` (tường có ô cửa **khoét thủng** nhìn ra cảnh ngoài), `archFrame`, `archWindow(w, h, view, frame)` (cửa sổ kính dán cảnh), `pillar`, `curtain`, `rug(rx, rz, color, trim)` |
| Nền xa | `skyDome(top, bottom, r)`, `starField(n, r, color, size)`, `gradientPlane(w, h, top, bottom)` |
| Đồ đạc | `shelf`, `books`, `painting(w, h, emoji | draw)`, `flowerPot`, `candle` + `flicker`, `paperLantern`, `fairyLights(a, b)`, `bunting(a, b, colors)`, `glow(color, size, opacity)` (quầng sáng) |
| Tiện ích | `onArc(obj, r, angle)` đặt quanh cung tròn quay vào tâm, `bob(obj, t, amp, speed)` bồng bềnh, `shadows(obj)` bật bóng |

Model có sẵn trong `public/models` (xem `CREDITS.md`, `ASSETS.md`): `lanterns.glb`, `pascal.glb`, `olaf.glb`, `wand_star.glb`, `slipper.glb` (dùng `keep: ['heel']`), Kenney `tree_default/tree_fat/flower_*A/plant_bush` (low-poly, hợp cảnh ngoài trời hơn trong nhà). Model chưa dùng (`olaf_small`, `tail_ariel`, `dress_*`, `hair_*`, `wings_tinkerbell`…) nằm ở `assets-raw/unused-models/` để bản build không chở theo; cần thì chép lại vào `public/models`. Kiểm model lẻ: `http://localhost:5182/viewer.html?model=models/<file>.glb&yaw=3.14`.

---

## 6. Chuẩn chất lượng (bắt buộc)

Ba của bé từng chê "màu xỉn, nhân vật cứng". Phòng phải:

1. **Tươi, rực, hài hoà**: 1 màu chủ đạo + 1 màu phụ + 1 màu nhấn vàng/kem. Không xám, không nâu đục, không đen. Nền sáng. Tránh trắng tinh diện rộng (bị cháy sáng vì không có tone mapping).
2. **Giàu chi tiết, khác biệt rõ với phòng khác**: tối thiểu 1 "điểm nhìn" lớn phía sau công chúa (cửa sổ ra cảnh ngoài / tranh lớn / cầu thang / bể nước…), 2 tường bên có đồ (kệ, tranh, cây, đèn), sàn có hoạ tiết + thảm, đồ biểu tượng của công chúa (Belle: sách + hoa hồng trong chuông kính; Ariel: bong bóng, san hô, vỏ sò; Lọ Lem: cầu thang + giày pha lê + bí ngô…).
3. **Có chuyển động** trong `ambient`: vật bồng bềnh, lấp lánh, nến chập chờn, bong bóng bay… và **đổi theo `ctx.melt`/`ctx.awake`** (băng tan → cảnh sống dậy: nhiều đèn hơn, hoa nở, cá bơi…) như đèn lồng của Rapunzel.
4. **Hiệu năng**: 60 fps trên MacBook. Tối đa ~3 `PointLight` thêm, không thêm `DirectionalLight` có bóng, tránh > 300 mesh (gộp / dùng ít segment), texture canvas ≤ 512 px. `ambient` không tạo object mới mỗi frame.
5. **Không lỗi console** (warning `KHR_materials_pbrSpecularGlossiness` của GLTFLoader là chấp nhận được).
6. Từ vựng đúng chủ đề, bé biết, đọc đúng; audio đủ (khung debug ✅ cả 2 dòng).

---

## 7. Tư thế công chúa

Không cần làm gì: `src/pose.ts` tự dò xương (bảng alias cho rig LoRes / HiRes / Tiana), tự quay mặt ra camera, tự gỡ trọng số tay lạc. Đã soát cả 12 model ở `/lab.html`. Nếu tay công chúa phòng mình xuyên váy khi đứng nghỉ, thử `pose: { armOut: 0.4 }` (0.3 mặc định, càng lớn càng dang) trong RoomDef, rồi xem `?room=<id>&debug=1&wake=1`.

---

## 8. Checklist nộp

- [ ] `node scripts/word-audio.mjs --check` → phòng mình ✓
- [ ] `bash scripts/gen-audio.sh` xong, khung debug: ✅ hợp đồng, ✅ đủ audio
- [ ] `pnpm exec tsc --noEmit` sạch, `pnpm build` OK
- [ ] Ảnh chụp: phòng đang băng, sau 1 câu đúng (có hạt phép qua `snap()`), công chúa đã tỉnh
- [ ] Không console error; fps ~60 (`window.__game.engine.fps`)
- [ ] Chỉ sửa `src/rooms/<id>.ts`, `scripts/audio/<id>.txt` (+ clip `.m4a` mới)
- [ ] Commit tiếng Anh, không trailer: `feat(room): <id> room`

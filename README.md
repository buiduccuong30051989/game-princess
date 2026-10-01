# Lâu đài công chúa của Hà An (game 3, Three.js)

Lâu đài bị phép ngủ: 11 công chúa đóng băng thành tượng trong phòng của mình. Elsa (nhân vật có animation thật) dẫn bé đi từng phòng; mỗi phòng 3 bài (nghe – chọn hình, điền chữ thiếu, đếm) theo đánh vần GDPT 2018. Mỗi câu đúng Elsa làm phép, băng tan 1/3; câu 3 băng vỡ, công chúa tỉnh, nhún chào, vẫy, cảm ơn rồi về đứng trên bệ ở Đại sảnh. Cứu 3/6/9/11 mở dạ hội mini; 11 là đại dạ hội, Elsa thay váy băng Frozen 1. Thiết kế: `PLAN.md`. Ghi công model: `CREDITS.md`.

## Cách chơi (cho bé 5 tuổi, không cần biết đọc)

- Chạm ❄️ ở màn chào (mở tiếng trên iPad) → Đại sảnh. Bệ có vòng sáng = phòng đang mở; 🔒 = còn khoá; ⭐ = đã cứu.
- Chạm bệ đang sáng → vào phòng. Elsa nói mọi hướng dẫn; 🔊 (góc phải, và trong bảng) nghe lại câu hỏi.
- **Nghe – chọn hình**: "Con nào là con cá?" → chạm hình. Đúng thì đánh vần từng bước, chữ sáng theo giọng.
- **Điền chữ thiếu**: hình + từ có ô `?` → chạm 1 trong 3 chữ. Chạm nhầm thì nghe âm của chữ vừa chạm.
- **Đếm**: chạm từng vật (mỗi vật đọc 1 số), rồi chọn số. Chạm nhầm thì nghe số vừa chạm.
- Không có thua: sai lần 1 bỏ 1 đáp án, sai lần 2 đáp án đúng nhấp nháy. Ngồi im ~9 s: Elsa hỏi lại, các nút nhún (ở sảnh ~12 s: nhắc + nhún các bệ đang mở).
- Thứ tự mở cửa: 3 phòng đầu mở sẵn, mỗi công chúa tỉnh mở thêm 1 cửa (`ROOM_ORDER` trong `src/core/progress.ts`). Tiến độ lưu ngay khi câu 3 đúng (localStorage `castle-progress-v1`).

## Cá nhân hoá cho Nhím + gia đình

- Elsa và công chúa gọi bé là **Nhím** (thỉnh thoảng "Hà An"). Câu thoại ở `scripts/audio-manifest.txt` và `scripts/audio/<id>.txt`.
- **Gia đình cổ vũ** (`src/family.ts`): Ba Cường 👨, Mẹ Yến 👩, Bà Tuyết Celistia 👵, Ông Cương 👴, Bác Hanh 👩‍🦱. Bong bóng lớn trượt vào từ mép phải ~2.5 s kèm giọng đọc: thỉnh thoảng sau câu đúng, luôn có khi công chúa tỉnh và khi công chúa về sảnh; dạ hội / đại dạ hội thì cả nhà lần lượt cổ vũ. Khung ảnh "Gia đình Nhím" trên giá vẽ ở góc phải Đại sảnh: chạm vào là 1 người nhà khen.
- **Ảnh thật thay emoji**: thả ảnh vuông (khoảng 400×400) vào `public/family/` đúng tên `ba-cuong.jpg`, `me-yen.jpg`, `ba-tuyet.jpg`, `ong-cuong.jpg`, `bac-hanh.jpg` (nhận cả .jpeg/.png/.webp). Thiếu ảnh nào thì người đó dùng emoji. Danh sách ảnh do `vite.config.ts` quét lúc chạy (module ảo `virtual:family-photos`) nên không có lỗi 404; đang `pnpm dev` thì thêm/xoá ảnh trang tự tải lại (sửa `vite.config.ts` thì phải tắt bật lại dev server).
- Đổi câu khen: sửa dòng `fam_*` trong `scripts/audio-manifest.txt` + chữ hiện trong `FAMILY` (`src/family.ts`), xoá m4a cũ, chạy `gen-audio.sh`.

## Elsa và công chúa "sống"

- Đại sảnh, lúc rảnh (không nghi lễ, không đang mở cửa) cứ 6–12 s Elsa làm 1 việc: lướt trên vệt băng tới thăm 1 bệ (công chúa đã tỉnh thì 2 bạn vẫy nhau), lướt ra trước vẫy bé, vẫy tại chỗ, xoay tung tuyết, múa 1 clip. Bé chạm bất kỳ đâu: Elsa dừng và quay ra vẫy; chạm Elsa: xoay + cười. Tuyết ❄️ rơi lác đác, lấp lánh quanh Elsa.
- Trong phòng: vào phòng Elsa vẫy chào; lúc chờ bé thì lướt nhẹ / ngắm tượng / quay ra vẫy; đúng → làm phép rồi vẫy; sai → xen kẽ suy nghĩ / lo lắng.
- Không có clip đi / vẫy (`level_wave_placeholder` y hệt idle): **lướt** = dời root theo frame + nghiêng + nhấp nhô + hạt và bông tuyết in sàn (pool 22 mesh); **vẫy** = xoay cánh tay phải cộng lên clip idle (ngắm hướng trong hệ thân người, trọng số mượt). Xem `src/elsa.ts`.
- Công chúa đã tỉnh: mỗi 8–15 s (lệch pha từng người) 1 động tác ngẫu nhiên không lặp: nhìn quanh, vẫy, nhún chào, xoay váy, nghiêng đầu điệu đà (`tilt` trong `pose.ts`), mừng. Mọi trọng số tween nên không giật; dạ hội tắt động tác lặt vặt và chờ động tác dở xong (`settle()`).

## Chạy

```bash
pnpm install
pnpm dev                     # http://localhost:5182 (--host sẵn: mở được trên iPad cùng Wi-Fi)
pnpm exec tsc --noEmit       # soát kiểu
pnpm build                   # dist/ ~51 MB (models 42 MB, audio ~7 MB)
bash scripts/gen-audio.sh    # sinh clip còn thiếu (macOS, giọng Linh); FORCE=1 sinh lại hết
node scripts/word-audio.mjs --check   # soát hợp đồng + từ vựng 11 phòng
```

Đổi câu trong `scripts/audio-manifest.txt` / `scripts/audio/<id>.txt` hoặc đổi quy tắc đánh vần: xoá đúng file `public/audio/<key>.m4a` có chữ đổi rồi chạy lại `gen-audio.sh` (nó chỉ sinh clip chưa có).

## Debug URL

| URL | Tác dụng |
|---|---|
| `?room=<id>&debug=1` | vào thẳng phòng + thanh debug (✔ đúng, ✨ tỉnh ngay, 🧊 tan 1 nấc, xoay, chào, vẫy) + bảng soát từ vựng/audio thiếu |
| `?room=<id>&wake=1` / `&melt=1` / `&melt=2` | vào phòng đã tỉnh / đã tan 1–2 nấc |
| `?saved=N` | sảnh giả lập đã cứu N công chúa đầu (không ghi localStorage) |
| `?ball=3` (6, 9, 11) | chạy ngay dạ hội mốc đó |
| `?reset=1` | xoá tiến độ |
| `/lab.html?state=rest` (wave, curtsy, open, cheer, twirl, frozen) | 12 tượng cạnh nhau để soát tư thế |
| `/viewer.html?model=models/<f>.glb` | xem 1 model |

Dev mode có `window.__game` (`goHall()`, `goRoom(id)`, `scene`, `renderer`, `progress`, `snap()`).

`<id>`: rapunzel, ariel, belle, cinderella, jasmine, snowwhite, anna, aurora, mulan, merida, tiana.

## Cấu trúc

```
src/main.ts            điều phối: màn chào → Đại sảnh ↔ Phòng; lưu tiến độ; dựng màn lỗi → về sảnh
src/core/engine.ts     renderer (DPR ≤1.5 trên máy cảm ứng), vòng lặp, đổi màn có mờ dần + bắt lỗi, chạm 3D
src/core/assets.ts     tải GLB (cache, evictGLB), clone có xương, metalness 0, fitHeight, emoji sprite, disposeTree
src/core/shared.ts     sổ tài nguyên GPU dùng chung (disposeTree bỏ qua)
src/core/progress.ts   localStorage 'castle-progress-v1', thứ tự mở cửa, mốc dạ hội
src/core/params.ts     tham số URL debug
src/hall.ts            Đại sảnh: 11 bệ móng ngựa + cửa + sân khấu Elsa, dạ hội, finale (tượng dùng bản lod/)
src/room/RoomScene.ts  khung phòng: bệ, tượng băng, Elsa, ánh sáng, luồng 3 bài → tỉnh; thanh debug
src/room/types.ts      HỢP ĐỒNG PHÒNG (RoomDef, RoomCtx, RoomWord)
src/room/kit.ts        bộ đồ nghề dựng cảnh (tường, cửa vòm, thảm, kệ, tranh, nến, đèn lồng…)
src/room/words.ts      từ vựng → token đánh vần + audio key (+ âm chữ cái cho bài điền) + soát lỗi (node-safe)
src/rooms/<id>.ts      11 phòng dựng cảnh riêng; princesses.ts = bảng 12 model tượng + tinh chỉnh tư thế
src/spell.ts           đánh vần GDPT 2018 tự động, chạy cả trong node
src/pose.ts            tạo dáng theo xương cho 12 tượng (hạ tay, thở, vẫy, nhún chào, dang tay, mừng, nhìn)
src/ice.ts             material băng (fresnel, nứt, lấp lánh) tan 3 nấc, pha lê chân, vỡ tung
src/princess.ts        PrincessActor = model + Poser + Ice + chuỗi tỉnh dậy
src/elsa.ts            Elsa dẫn đường (elsa_anim.glb, bỏ track position + neo hông) + lướt, vẫy thủ công, xoay
src/family.ts          gia đình Nhím: bong bóng cổ vũ (ảnh public/family/ hoặc emoji) + giọng đọc
src/challenge.ts       A1 / A2 / B1, sai 1 bỏ 1 đáp án, sai 2 nhấp nháy, nhắc khi ngồi im
src/audio.ts           WebAudio (mở khoá iPad, tự resume sau khoá màn), play luôn resolve, hộp nhạc valse
scripts/audio-manifest.txt  câu dùng chung; scripts/audio/<id>.txt câu riêng phòng; _words.gen.txt tự sinh
public/models/lod/     tượng bản nhẹ cho sảnh (texture 512 px WebP, gltf-transform resize + webp)
assets-raw/            bản gốc Sketchfab + unused-models/ (model chưa dùng, để build không chở theo)
```

## Quy tắc đánh vần (src/spell.ts)

- Phụ âm gọi theo âm: bờ, cờ, chờ, gờ, giờ, ngờ, quờ… (k = "ca").
- Vần 1 chữ: âm đầu – vần – tiếng không dấu – tên dấu – tiếng (bờ – o – bo – huyền – bò).
- Vần 2+ chữ: vần trước (e – o – eo), rồi tiếng (mờ – eo – meo), rồi thanh (huyền – mèo). Không dấu thì không có bước thanh.
- Vần tắc (kết thúc p/t/c/ch): bỏ bước tiếng không dấu, vần đọc bằng chữ có sắc: vờ – ét – nặng – vẹt (máy đọc "vet" thành "vét").
- Nguyên âm đôi trước âm cuối là 1 đơn vị: iê/yê → ia, uô → ua, ươ → ưa (ưa – ngờ – ương). ă đọc "á", â đọc "ớ".

## Hợp đồng phòng (tóm tắt, chi tiết `docs/ROOM-GUIDE.md`)

Mỗi phòng là `src/rooms/<id>.ts` export default `RoomDef`:

- `id, name, emoji, princessModel ('p_*.glb'), rig, pose?, palette, magicColors` (màu đậm, nền sáng dùng NormalBlending).
- `buildScene(ctx)`: dựng cảnh vào `ctx.root` (kit.ts + `ctx.model(name)`), tránh vùng bệ và chỗ Elsa (`ctx.layout`). `ambient?(ctx, dt)` hoạt cảnh mỗi frame, đọc `ctx.melt` (0→1) / `ctx.awake` để cảnh sáng dần.
- `words`: ≥ 6 từ 1 tiếng, cụ thể, có emoji Apple rõ nghĩa, từ miền Bắc; ≥ 3 từ có `fill` (2 chữ nhiễu KHÔNG được tạo thành từ có nghĩa; không che 1 chữ trong âm đầu ghép). `name` phải chứa từ (vd "con cá"); `ask` tuỳ chọn (mặc định "Con/Quả/Bông nào là …", còn lại "Cái nào là …").
- `count { emoji, audio, range? }`, `challenges` (3 bài trong spell, fill, count), `audio { name, intro, thanks }` (câu trong `scripts/audio/<id>.txt`).
- Soát: `node scripts/word-audio.mjs --check` và `?room=<id>&debug=1`.

## Bẫy đã dính

- Rig Elsa (Frozen Free Fall) có root motion + gốc lệch tâm: bỏ mọi track `.position` VÀ neo xương hông mỗi frame.
- GLTFLoader bỏ dấu `:` trong tên node (`Ariel_Rig:leftArm…` → `Ariel_RigleftArm…`) → chuẩn hoá tên xương phải bỏ cả tiền tố `<X>_Rig`.
- Tượng đứng chữ T/A: hạ tay bằng "ngắm hướng" trong hệ thân người (cung ngắn nhất) → không xoắn. Aurora có 1 sợi mi gán nhầm vào ngón cái → `cleanStrayArmWeights` gán lại. Merida có cung/tên lơ lửng → thu xương về 0; Mulan kiếm, Rapunzel đèn lồng rời → giấu theo tên material.
- Hạt additive trên nền sáng bị hoà trắng → NormalBlending, màu đậm, hạt to. Playwright hay hụt frame hạt → `window.__game.snap()`.
- Audio chưa mở khoá (chưa chạm) thì `onended` không tới → `play()` có hẹn giờ dự phòng, luồng không kẹt. `play()` giọng mới cắt giọng đang phát → câu quan trọng phải `await` xong mới sang câu kế.
- Texture canvas tạo mỗi lần dựng màn → `disposeTree` huỷ texture riêng của màn; đồ cache phải đăng ký ở `core/shared.ts`.
- Giọng Linh đọc sai vài vần tách rời ("oc" → "o xê", "ă"/"â" kéo dài, "vet" → "vét") → xem quy tắc ở trên; nghe thử clip mới trước khi chốt.

## Bản quyền

Nhân vật công chúa là IP của Disney; model 3D là fan-made / rip game trên Sketchfab, giấy phép CC BY 4.0 (ghi công đủ trong `CREDITS.md`), cộng vài model CC0 (Kenney, Quaternius, poly.pizza). **Chỉ dùng chơi trong nhà, không publish, không bán, không đưa lên store.** Giọng đọc: macOS "Linh" sinh offline.

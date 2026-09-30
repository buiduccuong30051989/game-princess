# Lâu đài công chúa của Hà An (game 3, Three.js)

Lâu đài bị phép ngủ: 11 công chúa đóng băng thành tượng trong phòng của mình. Elsa (nhân vật có animation thật) dẫn bé đi từng phòng; mỗi phòng 3 bài (nghe – chọn hình, điền chữ thiếu, đếm) theo đánh vần GDPT 2018. Mỗi câu đúng Elsa làm phép, băng tan 1/3; câu 3 băng vỡ, công chúa tỉnh, nhún chào, vẫy, cảm ơn rồi về đứng trên bệ ở Đại sảnh. Cứu 3/6/9/11 mở dạ hội mini; 11 là đại dạ hội, Elsa thay váy băng Frozen 1. Thiết kế: `PLAN.md`. Ghi công model: `CREDITS.md`.

## Chạy

```bash
pnpm install
pnpm dev                     # http://localhost:5182 (--host sẵn: mở được trên iPad cùng Wi-Fi)
pnpm build
bash scripts/gen-audio.sh    # sinh clip còn thiếu (macOS, giọng Linh); FORCE=1 sinh lại hết
node scripts/word-audio.mjs --check   # soát hợp đồng + từ vựng 11 phòng
```

Debug: `?room=<id>&debug=1[&melt=1|2][&wake=1]`, `?saved=N`, `?ball=3|6|9|11`, `?reset=1`, `/lab.html?state=rest|wave|curtsy|open|cheer|twirl|frozen` (12 tượng), `/viewer.html?model=models/<f>.glb`. Chi tiết + cách làm phòng mới: **`docs/ROOM-GUIDE.md`**.

## Cấu trúc

```
src/main.ts            điều phối: màn chào → Đại sảnh ↔ Phòng; lưu tiến độ
src/core/engine.ts     renderer, vòng lặp, đổi màn có mờ dần, chạm 3D, hạt phép dùng chung
src/core/assets.ts     tải GLB (cache), clone có xương, metalness 0, fitHeight, emoji sprite
src/core/progress.ts   localStorage 'castle-progress-v1', thứ tự mở cửa, mốc dạ hội
src/core/params.ts     tham số URL debug
src/hall.ts            Đại sảnh: 11 bệ móng ngựa + cửa + sân khấu Elsa, dạ hội, finale
src/room/RoomScene.ts  khung phòng: bệ, tượng băng, Elsa, ánh sáng, luồng 3 bài → tỉnh; thanh debug
src/room/types.ts      HỢP ĐỒNG PHÒNG (RoomDef, RoomCtx, RoomWord)
src/room/kit.ts        bộ đồ nghề dựng cảnh (tường, cửa vòm khoét, thảm, kệ, tranh, nến, đèn lồng…)
src/room/words.ts      từ vựng → token đánh vần + audio key + soát lỗi (node-safe)
src/rooms/<id>.ts      11 phòng (rapunzel = mẫu, 10 phòng còn lại đang là khung tạm _stub.ts)
src/rooms/princesses.ts  bảng 12 model tượng + tinh chỉnh tư thế / đồ thừa cần giấu
src/spell.ts           đánh vần GDPT 2018 tự động (âm đầu – vần – tiếng – thanh), chạy cả trong node
src/pose.ts            tạo dáng theo xương cho 12 tượng (hạ tay, thở, vẫy, nhún chào, dang tay, mừng, nhìn)
src/ice.ts             material băng (fresnel, nứt, lấp lánh) tan 3 nấc từ đầu xuống, pha lê chân, vỡ tung
src/princess.ts        PrincessActor = model + Poser + Ice + chuỗi tỉnh dậy
src/elsa.ts            Elsa dẫn đường (elsa_anim.glb, bỏ track position + neo hông)
src/challenge.ts       A1 / A2 / B1, sai 1 bỏ 1 đáp án, sai 2 nhấp nháy đáp án đúng
src/audio.ts           WebAudio (mở khoá iPad, play luôn resolve), hộp nhạc tổng hợp (valse dạ hội)
scripts/audio-manifest.txt  câu dùng chung; scripts/audio/<id>.txt câu riêng phòng; _words.gen.txt tự sinh
```

## Bẫy đã dính

- Rig Elsa (Frozen Free Fall) có root motion + gốc lệch tâm: bỏ mọi track `.position` VÀ neo xương hông mỗi frame.
- GLTFLoader bỏ dấu `:` trong tên node (`Ariel_Rig:leftArm…` → `Ariel_RigleftArm…`) → chuẩn hoá tên xương phải bỏ cả tiền tố `<X>_Rig`.
- Tượng đứng chữ T/A: hạ tay bằng "ngắm hướng" trong hệ thân người (cung ngắn nhất) → không xoắn. Aurora có 1 sợi mi gán nhầm vào ngón cái → `cleanStrayArmWeights` gán lại. Merida có cung/tên lơ lửng → thu xương về 0; Mulan kiếm, Rapunzel đèn lồng rời → giấu theo tên material.
- Hạt additive trên nền sáng bị hoà trắng → NormalBlending, màu đậm, hạt to; burst rải điểm xuất phát tránh cục đặc. Playwright hay hụt frame hạt → `window.__game.snap()`.
- Audio chưa mở khoá (chưa chạm) thì `onended` không tới → `play()` có hẹn giờ dự phòng, luồng không kẹt.

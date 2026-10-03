# Plan game 3 bản 2: "Lâu đài công chúa" (Elsa dẫn đường, đánh thức 12 công chúa)

Trạng thái: PLAN, 30/09/2026, chờ Adam gật. Bản 1 (tủ đồ Hà An) giữ ở `PLAN-v1-tu-do.md`, code cũ tái dùng.

## 1 câu

Lâu đài bị phép ngủ: các công chúa đóng băng thành tượng pha lê trong phòng của mình; Elsa (có animation thật) dẫn bé đi từng phòng, bé làm đúng 3 bài thì công chúa tỉnh dậy, bước ra vẫy tay, về đứng trong Đại sảnh. Đánh thức đủ thì mở Dạ hội.

## Vì sao hợp với assets

- Elsa Frozen Free Fall là con DUY NHẤT có 20 animation → vai chính, lúc nào cũng cử động (đứng, làm phép, mừng, suy nghĩ khi bé sai).
- 12 công chúa (cùng tác giả con Twilight) đẹp nhưng đứng chữ T, không animation. Đã soi 30/09: **8 con dùng chung 1 bộ xương** (Jasmine, Belle, Cinderella, Anna, Bạch Tuyết, Elsa F1, Rapunzel, Ariel), **3 con bộ xương biến thể** (Merida, Mulan, Aurora), Tiana khác hẳn. → Tao viết 1 bộ tư thế chung theo tên xương: hạ tay, thở, vẫy tay, nhún chào, xoay váy. Đủ cho "tỉnh dậy + chào bé", không cần đi lại.
- Trạng thái "tượng băng" = cùng model phủ màu băng trong suốt, nên đóng/mở băng chỉ là đổi material → luôn khớp.

## Vòng chơi

1. **Đại sảnh** (màn chính): sảnh hình tròn, 12 bệ quanh vòng, bệ trống có tượng băng mờ, bệ đã đánh thức có công chúa đứng thở, thỉnh thoảng vẫy. Elsa đứng giữa. Bé chạm 1 cửa phòng đang mở.
2. **Phòng công chúa**: mỗi phòng 1 cảnh riêng + màu riêng, công chúa đóng băng giữa phòng.
   - Rapunzel: tháp, đèn lồng. Ariel: dưới biển, bong bóng. Belle: thư viện hoa hồng. Cinderella: cầu thang giày pha lê. Jasmine: sa mạc thảm bay. Bạch Tuyết: rừng táo…
   - Bản 1 làm 3 phòng dựng cảnh riêng (Rapunzel, Ariel, Belle); các phòng khác dùng khung chung đổi màu + 1 vật đặc trưng.
3. **3 bài / phòng** (tái dùng A1, A2, B1). Mỗi bài đúng: Elsa làm phép (clip powerup), 1 vết nứt băng + 1/3 lớp băng tan, cảnh sáng dần. Sai: Elsa clip "suy nghĩ", sai lần 2 đáp án nhấp nháy.
4. Bài 3 đúng: băng vỡ tung (hạt), công chúa hiện màu thật, hạ tay, nhún chào, vẫy bé, đọc "Cảm ơn Hà An!" → bay về Đại sảnh.
5. Đánh thức 3 → mở Dạ hội mini: nhạc, pháo giấy, các công chúa đã tỉnh xoay váy. Mốc tiếp: 6, 9, 12.

## Nội dung học gắn với phòng

Từ vựng theo phòng để bé nhớ: Rapunzel (tóc, đèn, hoa, mèo), Ariel (cá, cua, sò, tôm), Belle (sách, hoa, bò…). Bài đếm dùng vật của phòng (đèn lồng, bong bóng, hoa hồng).

## Kỹ thuật

- Tái dùng: `room.ts` (tách thành scene sảnh + scene phòng), `challenge.ts`, `magic.ts`, `audio.ts`, `ui.ts`.
- Mới: `pose.ts` bộ tư thế chung theo tên xương (chuẩn hoá bỏ tiền tố `X_Rig:` và hậu tố số; bảng alias LoRes/HiRes; Tiana dùng tư thế tĩnh). `ice.ts` material băng (fresnel xanh trong + vết nứt), tan dần theo tiến độ.
- Elsa: `elsa_anim.glb`, bỏ root motion + neo hông (đã làm).
- Hà An: bỏ model người lớn. Bé là "người chơi", Elsa gọi tên "Hà An".

## Phạm vi bản 1

- Đại sảnh 12 bệ + 3 phòng (Rapunzel, Ariel, Belle) chơi được trọn, 9 phòng còn lại khoá có tượng băng.
- A1/A2/B1, Elsa đủ animation, tượng băng tan 3 nấc, công chúa tỉnh + vẫy, Dạ hội mini khi đủ 3.
- Chưa: 9 phòng còn lại, giọng ba mẹ, iPad.

## Rủi ro

- Tư thế tự viết cho 11 model: có thể 1–2 con lệch (tay xoắn), cần chỉnh tay từng con.
- 12 model + Elsa ≈ 25 MB: load dần theo phòng, sảnh dùng bản thu nhỏ.

## Bản 3: máy tính bảng + âm thanh chuẩn + toán cộng trừ trong 10 (03/10/2026)

Ba yêu cầu: "sửa game 3 theo hướng chơi trên máy tính bảng, dùng âm thanh chuẩn, toán cộng trừ trong 10". Mọi chữ + giọng giữ tiếng Việt.
Tái dùng pipeline của `05-pony-story` (gen-audio.py, audio-lines.mjs, check-spelling.mjs, bộ sinh đánh vần, ghép tên tiếng Anh).

### 1. Âm thanh chuẩn
- Bỏ hết clip macOS Linh. Toàn bộ ~690 câu sinh lại bằng **Microsoft Hoài My** (`vi-VN-HoaiMyNeural`, edge-tts, rate −10%, cắt lặng
  −42 dBFS, thử lại 5 lần khi trả về rỗng). Công chúa: Hoài My cao hơn chút (+8 Hz, −6%). Ba Cường, ông Cương: **Nam Minh** (giọng nam);
  mẹ Yến, bà Tuyết, bác Hanh: Hoài My trầm / chậm khác nhau. Bảng `VOICES` đầu `src/lines.ts`.
- **Tên tiếng Anh** (Elsa, Anna, Rapunzel, Ariel, Belle, Cinderella, Jasmine, Snow White, Aurora, Mulan, Merida, Tiana, Olaf…) viết `{Tên}`
  → đọc bằng giọng Anh `en-US-JennyNeural` (ba/ông: Guy), ghép với phần Việt cách 80 ms. `audio-lines.mjs --check` báo lỗi nếu phần giọng
  Việt còn tên tiếng Anh. Tên Việt quen (Lọ Lem, Bạch Tuyết, Mộc Lan) vẫn giọng Việt; công chúa nói thêm "tên tiếng Anh là {Cinderella}".
- **Đánh vần**: dùng bộ sinh của game 5 (vần tắc c/ch/p/t đọc sắc: vẹt = e – tờ – ét, vờ – ét – vét – nặng – vẹt). Nút chữ ở bài điền chữ
  gọi tên theo SGK (bờ, cờ…, k = "ca", i = "i ngắn", y = "i dài"). **Bảng vàng** `scripts/check-spelling.mjs`: 61 từ của 11 phòng + ca mẫu,
  viết tay, chạy đầu `pnpm build` — lệch 1 token là build đỏ; từ mới chưa có đáp án cũng đỏ.
- **Ngân hàng câu** 8–15 câu / tình huống (đúng, khen, sai, gợi ý, nhắc, băng tan, tỉnh dậy, về sảnh, chạm Elsa, dạ hội xong…), chọn ngẫu
  nhiên không lặp 3 câu gần nhất (`src/voice.ts`). Nhắc khi ngồi im: **20 s, rồi 40 s, 80 s** (trước: 9 s / 12 s).
- **Phụ đề có nhãn người nói** (`src/talk.ts`): khung trên cùng giữa màn, mặt tròn + "Elsa:", "Ariel:", "Lọ Lem (Cinderella):"; người nhà
  vẫn dùng bong bóng lớn bên phải, nhãn "Bà Tuyết:". Chân dung Elsa + 11 công chúa vẽ từ chính model (`scripts/render-portraits.mjs`
  → `src/assets/portraits/`); người nhà dùng ảnh thật `public/family/` hoặc emoji.
- Hiệu ứng âm thanh: tổng hợp bằng WebAudio (chạm, bụp, chuông, nảy, vút) — bỏ file .ogg (Safari iPad cũ không giải mã Ogg).

### 2. Toán cộng trừ trong 10 (thay bài đếm B1) — `src/math.ts`
- Mỗi phòng 1 chủ đề theo vật của phòng (đèn lồng Rapunzel, cá nhỏ Ariel, bông hồng Belle, bí ngô Lọ Lem, ếch Tiana…), xen kẽ 2 chủ đề của
  Elsa (bông tuyết, ngọc vương miện). "Trên trời có 3 chiếc đèn lồng. Chị thả thêm 2 chiếc đèn lồng nữa. Có tất cả mấy chiếc đèn lồng?
  Ba cộng hai bằng mấy?" / "… 2 chiếc đèn lồng bay xa mất rồi. Còn lại mấy chiếc đèn lồng?".
- Bảng: hàng đồ vật (cộng: 2 nhóm; trừ: vật bị bớt bay / rơi / tan / chạy đi, gạch chéo; thiếu số: nhóm + ❓ = nhóm) + phép tính bằng
  chữ số "3 + 2 = ?" + **3 nút số to**. Sai: "Mình cùng đếm nhé!" → các vật nảy lên lần lượt, Elsa đếm 1..N → "Nhím chọn lại nhé"; sai lần 2
  đáp án đúng nhấp nháy. Không phạt.
- Độ khó theo thứ tự mở cửa: 4 phòng đầu tổng / số bị trừ ≤ 5, sau đó ≤ 10; 3 phòng cuối thêm dạng "3 + ? = 5". Cộng / trừ xen kẽ.
  Kết quả luôn ≥ 1 (chưa dạy số 0).
- Câu ghép từ clip dùng lại (số n1…n10, "cộng", "trừ", "bằng mấy?", "có tất cả mấy…", "còn lại mấy…"); `audio-lines.mjs --check` duyệt
  **mọi** tổ hợp (13 chủ đề × cộng/trừ/thiếu × mọi cặp số = 1742 bài) và soát đủ clip + đủ file m4a.

### 3. Máy tính bảng
- Chạm: mọi nút ≥ 96 px (nút đáp án 136 px, HUD 104 px), pointer events (`onTap` trong `src/ui.ts`, nhận khi nhấc ngón trên nút), không có
  gì dựa vào hover. Chặn phóng to 2 ngón / chạm đúp / kéo trang / kéo để tải lại / giữ lâu / chọn chữ (`src/tablet.ts` + CSS).
- Bố cục ngang 1024×768, 1180×820, 1366×1024; màn dọc hiện "Nhím ơi, xoay ngang máy nhé!"; tôn trọng safe area.
  `manifest.webmanifest` (fullscreen, landscape) + `apple-mobile-web-app-capable` + icon → "Thêm vào MH chính" chạy như app.
- Âm thanh: mở khoá ở lần chạm đầu (touchend / click / pointerup), tự resume khi quay lại tab / mở khoá màn hình.
- Hiệu năng (ngân sách iPad ≤ 300k tam giác, ≤ 150 draw call): `src/core/merge.ts` gộp đồ tĩnh theo material (màu nướng vào vertex color),
  sprite tĩnh → tấm phẳng; giả lập ambient() 30 s để biết vật nào THỰC SỰ chuyển động (giữ riêng), đồ trang trí không đổ bóng, pha lê băng /
  mảnh vỡ thành InstancedMesh, tượng sảnh giảm lưới còn ~9k tam giác, `elsa_anim.glb` chỉ giữ 10 clip dùng + texture WebP
  (7.6 → 3.6 MB), DPR ≤ 1.5 trên máy cảm ứng. Đo: `node scripts/test/perf.mjs` (bảng số ở README).
- Không bao giờ kẹt: mọi câu đọc có hạn giờ (tải > 6 s bỏ qua, phát > thời lượng + 1.5 s tự xong), mọi animation được chờ qua
  `withTimeout`, khoá nhả trong `finally`; chạm ĐÚNG luôn được nhận ngay kể cả lúc đang đọc "chưa đúng" / đang đếm cùng (lỗi đơ của
  game 5); watchdog 15 s trong bài (khoá giữ quá lâu / không còn nút → nhả + hiện lại nút + hỏi lại), trong phòng (không có gì để chạm →
  chạy lại bài / hiện nút cuối phòng), ở sảnh (cờ bận giữ khi im lặng → nhả).
- Kiểm hồi quy: `node scripts/test/play-human.mjs` chơi như người thật (chạm cảm ứng, có tiếng, sai rồi đúng thật nhanh, sai 2 lần,
  chạm lung tung), đứng yên > 25 s = đơ.

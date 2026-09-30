# Plan game 3: "Tủ đồ công chúa của Hà An" (Three.js, dress-up + học)

Trạng thái: PLAN, viết 30/09/2026, chờ Adam gật + model. Chưa có code.

## 1 câu

Hà An đứng trong phòng gương lộng lẫy; mỗi lần đánh vần hoặc đếm đúng thì nhận 1 món (tóc, váy, vương miện, đũa phép, giày...) của công chúa đang chọn; đủ bộ thì hoá thân thành công chúa đó, xoay trên bệ, phép thuật nổ tung.

## Vì sao khác 2 game trước

- Không đi lại, không quái. Camera cố định nhìn vào bệ xoay giữa phòng → không cần rig đi bộ, model không animation vẫn đẹp.
- Vòng chơi = **sưu tầm**: bé thấy tủ đồ còn ô trống là muốn làm bài để mở.
- Elsa có 20 animation → nếu có "làm phép" thì Elsa thật sự vung tay tạo băng.

## Luật vàng (giữ)

Chỉ tap, nút ≥ 2 cm, mọi thứ có tiếng, không màn thua, sai lần 1 bỏ 1 đáp án, sai lần 2 đáp án đúng nhấp nháy.

## Màn hình

1. **Chọn công chúa**: 3 thẻ to (Elsa, Rapunzel, Ariel), thẻ đã hoá thân có ⭐. Tap → đọc tên.
2. **Phòng gương** (Three.js): bệ tròn xoay chậm, Hà An đứng giữa, 2 bên là gương + rèm, nền pastel sáng, hạt lấp lánh nhẹ. Dưới là **tủ đồ**: 6 ô, ô đã mở hiện món, ô chưa mở là ❓ lấp lánh.
3. Tap ô ❓ → **thử thách** (bảng DOM như game 2): A1 nghe chọn hình / B1 đếm ngọc / (mới) A2 điền chữ thiếu.
4. Đúng → món bay từ bảng vào người Hà An (tween), sao xoáy, "ting". Tủ đầy 6/6 → **hoá thân**: vòng sáng, Hà An mờ đi, công chúa thật hiện ra, xoay 1 vòng, pháo giấy, đọc "Hà An đã thành công chúa Elsa!".
5. Sau hoá thân: nút 🪄 làm phép (Elsa: băng tuyết, Rapunzel: tóc phát sáng, Ariel: bong bóng nước), nút 🔄 chọn công chúa khác. Bộ đã mở giữ mãi (localStorage), bé có thể vào mặc lại.

## 6 món mỗi công chúa

| | Elsa | Rapunzel | Ariel |
|---|---|---|---|
| 1 | Tóc bím bạch kim (model tóc) | Tóc vàng bím dài (model tóc) | Tóc đỏ (model tóc) |
| 2 | Váy xanh băng (model váy) | Váy tím hồng (model váy) | Đuôi cá xanh (model) |
| 3 | Vương miện băng (dựng khối) | Vòng hoa (dựng khối) | Vỏ sò tím (dựng khối) |
| 4 | Găng tay / áo choàng | Chảo 🍳 (Pascal cầm) | Cây chĩa ba nhỏ (dựng khối) |
| 5 | Olaf bạn đồng hành (model) | Pascal (model) | Cá Flounder (emoji sprite) |
| 6 | Đũa phép sao (model) | Đèn lồng (model pack) | Ngọc trai (khối) |

Món 1–2 gắn lên Hà An thật (tóc lên đầu, váy đổi màu/thay mesh váy). Món 3–6 đặt lên bệ cạnh bé hoặc bé cầm.

## Thử thách (tái dùng `challenge.ts` game 2 + thêm A2)

- A1 nghe – chọn hình (10 từ có sẵn + thêm từ công chúa: váy, tóc, giày, hoa, sao, băng, cá, sò).
- A2 điền chữ thiếu: hình + `v _ y` → 3 nút chữ cái to. Đúng thì đánh vần đủ (vờ – ay – vay – sắc – váy).
- B1 đếm ngọc → chọn số. B2 cộng trong 5 bằng hình (2 sao + 1 sao = ?).
- Mỗi công chúa 6 ô = 3 đánh vần (A1, A1, A2) + 3 toán (B1, B1, B2), độ khó tăng dần.

## Kỹ thuật

- Vite + Three.js, tái dùng `audio.ts`, `tween.ts`, `magic.ts`, `challenge.ts`, `ui.ts` từ game 2.
- Hà An: Quaternius Animated Woman (CC0, có Idle) đổi màu tóc/áo, hoặc model người Twilight đã có (đổi màu tóc) nếu muốn mặt dễ thương hơn.
- Gắn tóc: model tóc rời fit đầu bằng cách đo bbox đầu Hà An rồi scale/đặt vào xương Head.
- Hoá thân: crossfade opacity Hà An → model công chúa (cùng vị trí, cùng chiều cao), hạt xoáy che chuyển cảnh.
- Elsa 20 animation: tải về, liệt kê tên clip, chọn idle + 1 clip vung tay làm phép; không có thì phép bằng hạt.
- Camera: PerspectiveCamera cố định, bệ xoay `rotation.y += dt*0.3`, dừng xoay khi đang thử thách.

## Phạm vi bản 1

- 1 công chúa (Elsa) đủ 6 món + hoá thân + phép băng. Rapunzel, Ariel = thẻ khoá.
- A1 + B1 + A2. Chưa B2.
- Cần 4 file: Elsa (bộ đủ thân), Elsa 20 animation, tóc Elsa, đũa phép sao (link trong ASSETS.md mục E).

## Adam cần làm

1. Tải 4 file trên (hoặc đưa API token Sketchfab để tao tải).
2. Gật plan hoặc sửa danh sách 6 món.

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

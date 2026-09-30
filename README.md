# Tủ đồ công chúa của Hà An (dự án 3: Three.js dress-up + học)

Hà An đứng trong phòng gương trên bệ xoay. Tủ đồ 6 ô, mỗi ô là 1 bài đánh vần / điền chữ / đếm. Đúng thì nhận 1 món của Elsa (tóc bím, váy băng, vương miện, đũa phép, Olaf, giày pha lê). Đủ 6 món thì hoá thân thành Elsa (model có animation thật), bấm 🪄 để làm phép băng tuyết. Plan: `PLAN.md`, kho asset: `ASSETS.md`, ghi công: `CREDITS.md`.

## Chạy

```bash
pnpm install
pnpm dev        # http://localhost:5173 (thêm --host để mở trên iPad cùng Wi-Fi)
pnpm build
pnpm audio      # sinh lại 118 clip từ scripts/audio-manifest.txt (macOS, giọng Linh)
```

Xem model lẻ: `/viewer.html?model=models/elsa_anim.glb&yaw=3.14&anim=13` (anim = chỉ số clip).

## Luồng chơi

1. Chạm 👑 bắt đầu → chọn công chúa (Elsa mở, Rapunzel/Ariel khoá, bấm vào thì nghe "chưa mở").
2. Phòng gương: Hà An giữa bệ, tủ đồ 6 ô ❓ dưới màn. Chạm ô → bảng thử thách:
   - **A1** nghe "Cái nào là cái váy?" → 3 hình.
   - **A2** hình + chữ có ô trống (`_áy`) → 3 nút chữ cái, đúng thì đánh vần đủ (a – y – ay – vờ – ay – vay – sắc – váy).
   - **B1** đếm ngọc băng → chọn số.
   - Sai lần 1 bỏ 1 đáp án, sai lần 2 đáp án đúng nhấp nháy. Không bao giờ kẹt.
3. Đúng → sao xoáy, món hiện ra (tóc/vương miện/đũa gắn lên người theo xương; váy/giày lên bệ phụ; Olaf đứng sàn). 6/6 → hoá thân: Hà An mờ đi, Elsa hiện ra, chơi clip `level_win_01` rồi idle.
4. 🪄 → clip `level_powerup_triggered` + vòng băng + bụi băng + tuyết rơi. 🔄 về màn chọn. Tiến độ lưu localStorage (`princess-progress`).

## Cấu trúc

```
index.html        UI DOM: thẻ chọn công chúa, HUD, tủ đồ, bảng thử thách, nút phép, pháo giấy
src/main.ts       điều phối: chọn → tủ đồ → thử thách → nhận đồ → hoá thân → phép; lưu tiến độ
src/room.ts       Three.js: camera cố định, phòng (sàn ô, tường gradient, 2 gương khung vàng, rèm, đèn chùm), bệ xoay, loader GLB (metalness 0), emoji sprite, lấp lánh nền
src/avatar.ts     Hà An (Quaternius, Idle, đầu chibi), gắn đồ theo xương (Head/RightHand) hoặc bệ, vương miện dựng khối, hoá thân (fade + swap model + bỏ track position + neo hông về giữa bệ), playOnce clip
src/challenge.ts  A1 / A2 / B1 (tái dùng từ game 2, thêm A2)
src/ui.ts, src/magic.ts (hạt, NormalBlending cho nền sáng), src/audio.ts, src/tween.ts
src/data.ts       palette, 12 từ + token + ô trống, Elsa + 6 món (model, chiều cao, cách gắn), Rapunzel/Ariel khoá
public/models/    18 GLB Sketchfab (CC BY, IP Disney, chỉ chơi trong nhà) + haan.glb (CC0) + vài cây Kenney
```

## Bẫy đã dính (để khỏi dính lại)

- Rig game (Elsa Frozen Free Fall) có root motion + gốc lệch tâm: phải bỏ mọi track `.position` VÀ neo xương hông về giữa bệ mỗi frame, không thì nhân vật trôi khỏi bệ.
- Hạt additive trên nền sáng bị hoà trắng → dùng NormalBlending, màu đậm, hạt to (0.5–0.7), sống 1.5–2 s. Playwright screenshot hay bắt hụt frame hạt; muốn kiểm thì `renderer.render()` rồi `canvas.toDataURL()`.
- Model giày Sketchfab kèm cả cầu thang + tiên → `keep: ['heel']` lọc theo tên material.
- Quaternius Woman nhìn về +z (không cần xoay), tóc Elsa cần yaw π.

## Chưa làm

- Hà An đang là model người lớn Quaternius (placeholder). Cần model bé gái tóc đen nếu Adam muốn giống thật.
- Rapunzel, Ariel: model đã có (`rapunzel.glb`, `ariel.glb`, tóc/váy/đuôi rời) nhưng chưa có danh sách 6 món + audio.
- B2 cộng trong 5, ảnh thật người thân, giọng ba mẹ, test iPad.

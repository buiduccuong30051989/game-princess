# Cách chạy: Lâu đài công chúa

Game web 3D (Vite + TypeScript + Three.js) cho Nhím học đánh vần và toán cộng trừ trong 10. Chơi trên **máy tính bảng nằm ngang**
(iPad, chỉ chạm), mở từ Mac qua Wi-Fi. Khi chơi không cần mạng (giọng đọc đã sinh sẵn thành file).

## Cần có

- Node.js 22.18 trở lên (`node -v`) — script soát đánh vần / audio đọc thẳng file `.ts`.
- pnpm 9 trở lên: `corepack enable` (KHÔNG dùng npm).
- Chỉ khi muốn sinh lại giọng đọc: macOS (có sẵn `afconvert`) + Python 3 + mạng.

## Chạy lần đầu

```bash
git clone git@github.com:buiduccuong30051989/game-princess.git
cd game-princess
pnpm install
pnpm dev          # http://localhost:5182
```

Chạm bông tuyết ❄️ to giữa màn hình để bắt đầu (lần chạm đầu cũng mở tiếng trên iPad).

## Chơi trên iPad / máy tính bảng

1. Mac và iPad cùng Wi-Fi. `pnpm dev` in dòng `Network: http://192.168.x.x:5182` (máy Adam: **http://192.168.1.6:5182**) → mở bằng Safari.
2. Safari → Chia sẻ → **Thêm vào MH chính**: mở từ biểu tượng 🏰 "Lâu đài" là chạy toàn màn hình như app.
3. Xoay **ngang** máy (màn dọc sẽ nhắc "Nhím ơi, xoay ngang máy nhé!"). Bố cục đã soát ở 1024×768, 1180×820, 1366×1024.
4. Không có tiếng: tắt chế độ im lặng, tăng âm lượng, chạm lại màn hình (tiếng tự bật lại sau khi khoá màn / chuyển app rồi quay lại).
5. Muốn chạy bản build (nhẹ hơn): `pnpm build && pnpm preview` → `http://192.168.1.6:5182`.

## Cách chơi (cho ba mẹ)

- Đại sảnh: chạm huy hiệu / bệ đang sáng để vào phòng công chúa.
- Trong phòng 3 bài: **nghe – chọn hình**, **điền chữ thiếu**, **toán** (Elsa kể chuyện bằng đồ vật: "Có 3 chiếc đèn lồng, thả thêm 2 chiếc…",
  bảng hiện `3 + 2 = ?`, chạm 1 trong 3 số to). Sai không sao: các vật nảy lên, Elsa đếm cùng rồi bé chọn lại; sai lần 2 đáp án đúng nhấp nháy.
- Mỗi câu đúng băng tan 1 nấc; câu 3 công chúa tỉnh dậy, về đại sảnh. Cứu 3 / 6 / 9 / 11 công chúa thì mở dạ hội.
- 🏰 về sảnh, 🔊 nghe lại câu hỏi. Phụ đề trên cùng có mặt + tên người đang nói.

## Sinh lại giọng đọc (Microsoft Hoài My)

Mọi câu thoại: `src/lines.ts` (thoại, ngân hàng câu, câu phòng, gia đình), `src/math.ts` (câu toán), từ vựng trong `src/rooms/<id>.ts`.
Sửa chữ xong:

```bash
# lần đầu: môi trường Python riêng cho edge-tts
python3 -m venv scripts/.venv
scripts/.venv/bin/pip install edge-tts

pnpm audio        # = node scripts/audio-lines.mjs (gom câu) + scripts/gen-audio.py (chỉ sinh câu mới / đã đổi)
scripts/.venv/bin/python scripts/gen-audio.py --force          # sinh lại tất cả (~690 câu, ~25 phút)
scripts/.venv/bin/python scripts/gen-audio.py c_b b_right_0    # sinh lại vài câu
pnpm check:audio  # soát: đủ file, đủ clip mọi bài toán, không tên tiếng Anh trong phần giọng Việt
```

- Giọng `vi-VN-HoaiMyNeural` tốc độ −10% (Elsa); công chúa cao hơn chút; ba Cường, ông Cương giọng nam `vi-VN-NamMinhNeural`.
  Đổi giọng: bảng `VOICES` đầu `src/lines.ts`.
- Tên tiếng Anh viết `{Rapunzel}`: đoạn đó do giọng tiếng Anh `en-US-JennyNeural` (nam: `en-US-GuyNeural`) đọc rồi ghép với phần tiếng Việt.
- edge-tts đôi khi trả về rỗng ("No audio was received"): script tự thử lại 5 lần; còn lỗi thì chạy `pnpm audio` lần nữa.
- Muốn thay bằng giọng ba mẹ: ghi âm rồi lưu đè file `public/audio/<key>.m4a` cùng tên (khoá + chữ xem `scripts/audio/_all.gen.txt`).

## Lệnh khác

| Lệnh | Làm gì |
|---|---|
| `pnpm dev` | bản dev (cổng 5182, mở được qua Wi-Fi), tự tải lại khi sửa code |
| `pnpm build` | bảng vàng đánh vần + soát audio + `tsc` + build ra `dist/` |
| `pnpm preview` | chạy thử bản `dist/` |
| `pnpm audio` | sinh giọng đọc còn thiếu / đã đổi |
| `node scripts/test/play-human.mjs 4` | chơi 4 phòng như người thật (chạm, có tiếng, cố ý sai); đứng yên > 25 s = đơ → báo lỗi + ảnh |
| `node scripts/test/play-human.mjs 1 finale` | phòng cuối → đại dạ hội |
| `node scripts/test/perf.mjs` | tam giác + draw call từng cảnh |

Các script kiểm tra cần `pnpm dev` đang chạy + playwright-core + chrome-headless-shell (đổi đường dẫn bằng biến `PW`, `CHROME`).

## Ảnh gia đình

Thả ảnh vuông vào `public/family/` tên `ba-cuong.jpg`, `me-yen.jpg`, `ba-tuyet.jpg`, `ong-cuong.jpg`, `bac-hanh.jpg` (nhận .jpeg/.png/.webp).
Ảnh hiện ở bong bóng cổ vũ, khung "Gia đình Nhím" ở sảnh và phụ đề. Thiếu ảnh nào thì người đó hiện emoji.

## Link nhảy nhanh (ba mẹ / soát lỗi)

- `/?reset=1`: chơi lại từ đầu · `/?room=belle&debug=1`: vào thẳng 1 phòng (`rapunzel ariel cinderella jasmine snowwhite anna aurora mulan merida tiana`)
- `/?ball=11`: xem đại dạ hội · `/?saved=10`: giả lập đã cứu 10 công chúa (không ghi tiến độ thật)
- Đầy đủ: mục debug trong `README.md`.

## Lưu ý

Nhân vật Disney trong game là model 3D do fan làm (xem `CREDITS.md`), chỉ để chơi trong nhà, không dùng thương mại.

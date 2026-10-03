// Tham số URL (debug / xem thử 1 phòng). Chỉ đọc 1 lần lúc khởi động.
//  ?room=<id>     vào thẳng phòng, bỏ qua sảnh + màn chào
//  &debug=1       thanh công cụ debug (✔ đúng, tan băng, tỉnh, về sảnh) + bảng soát từ vựng/audio
//  &wake=1        vào phòng ở trạng thái đã tỉnh
//  &melt=1|2      vào phòng ở trạng thái đã tan 1 hoặc 2 nấc
//  ?saved=N       (sảnh) giả lập đã cứu N công chúa đầu tiên (không ghi localStorage)
//  ?ball=3|6|9|11 (sảnh) chạy ngay dạ hội mốc đó
//  ?reset=1       xoá tiến độ đã lưu
//  ?nomerge=1     không gộp đồ tĩnh (so sánh hình / soát lỗi gộp)
const q = new URLSearchParams(location.search);
const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);

export const PARAMS = {
  room: q.get('room') ?? undefined,
  debug: q.get('debug') === '1',
  wake: q.get('wake') === '1',
  melt: num('melt'),
  saved: num('saved'),
  ball: num('ball'),
  reset: q.get('reset') === '1',
  nomerge: q.get('nomerge') === '1',
} as const;

// TODO(room-agent): phòng Anna – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'anna',
  name: 'Phòng tuyết của Anna',
  emoji: '⛄',
  princessModel: 'p_anna.glb',
  rig: 'lores',
  palette: { primary: 0xc026d3, secondary: 0x0ea5e9, accent: 0x22c55e, light: 0xf5f3ff, dark: 0x3b0764 },
  countEmoji: '⛄',
});

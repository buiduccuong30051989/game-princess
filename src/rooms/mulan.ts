// TODO(room-agent): phòng Mộc Lan – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'mulan',
  name: 'Vườn của Mộc Lan',
  emoji: '🐉',
  princessModel: 'p_mulan.glb',
  rig: 'hires',
  palette: { primary: 0xdc2626, secondary: 0x16a34a, accent: 0xf59e0b, light: 0xfff7ed, dark: 0x7f1d1d },
  countEmoji: '🏮',
});

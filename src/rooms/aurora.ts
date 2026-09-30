// TODO(room-agent): phòng Aurora – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'aurora',
  name: 'Rừng hoa của Aurora',
  emoji: '🦋',
  princessModel: 'p_aurora.glb',
  rig: 'hires',
  palette: { primary: 0xf472b6, secondary: 0x60a5fa, accent: 0xfde047, light: 0xfff0f7, dark: 0x831843 },
  countEmoji: '🦋',
});

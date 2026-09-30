// TODO(room-agent): phòng Merida – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'merida',
  name: 'Rừng xanh của Merida',
  emoji: '🏹',
  princessModel: 'p_merida.glb',
  rig: 'hires',
  palette: { primary: 0x0f766e, secondary: 0xf97316, accent: 0x84cc16, light: 0xf0fdf4, dark: 0x064e3b },
  countEmoji: '🎯',
});

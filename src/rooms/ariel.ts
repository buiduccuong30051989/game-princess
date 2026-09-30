// TODO(room-agent): phòng Ariel – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'ariel',
  name: 'Cung điện dưới biển',
  emoji: '🐚',
  princessModel: 'p_ariel.glb',
  rig: 'lores',
  palette: { primary: 0x00b4d8, secondary: 0xff7aa2, accent: 0x5ee6c9, light: 0xe6fbff, dark: 0x023e8a },
  countEmoji: '🫧',
});

// TODO(room-agent): phòng Bạch Tuyết – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'snowwhite',
  name: 'Rừng táo của Bạch Tuyết',
  emoji: '🍎',
  princessModel: 'p_snowwhite.glb',
  rig: 'lores',
  palette: { primary: 0xe63946, secondary: 0x1d4ed8, accent: 0xffd166, light: 0xf1fff0, dark: 0x14532d },
  countEmoji: '🍎',
});

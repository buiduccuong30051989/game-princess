// TODO(room-agent): phòng Tiana – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'tiana',
  name: 'Đầm sen của Tiana',
  emoji: '🐸',
  princessModel: 'p_tiana.glb',
  rig: 'tiana',
  palette: { primary: 0x65a30d, secondary: 0xfacc15, accent: 0x14b8a6, light: 0xf7fee7, dark: 0x365314 },
  countEmoji: '🐸',
});

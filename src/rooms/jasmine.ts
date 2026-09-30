// TODO(room-agent): phòng Jasmine – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'jasmine',
  name: 'Cung điện của Jasmine',
  emoji: '🪔',
  princessModel: 'p_jasmine.glb',
  rig: 'lores',
  palette: { primary: 0x14b8a6, secondary: 0xf59e0b, accent: 0xa855f7, light: 0xfff4e0, dark: 0x134e4a },
  countEmoji: '🪔',
});

// TODO(room-agent): phòng Belle – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'belle',
  name: 'Thư viện của Belle',
  emoji: '🌹',
  princessModel: 'p_belle.glb',
  rig: 'lores',
  palette: { primary: 0xf4b400, secondary: 0xd62839, accent: 0x7b2cbf, light: 0xfff6dc, dark: 0x5a2d0c },
  countEmoji: '🌹',
});

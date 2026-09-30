// TODO(room-agent): phòng Lọ Lem – đang là KHUNG TẠM (src/rooms/_stub.ts). Thay bằng phòng thật theo docs/ROOM-GUIDE.md,
// lấy src/rooms/rapunzel.ts làm mẫu. Giữ nguyên id, princessModel, rig; đổi tự do name/emoji/palette/từ vựng/cảnh.
import { stubRoom } from './_stub.ts';

export default stubRoom({
  id: 'cinderella',
  name: 'Cầu thang của Lọ Lem',
  emoji: '👠',
  princessModel: 'p_cinderella.glb',
  rig: 'lores',
  palette: { primary: 0x5aa9ff, secondary: 0xb8dcff, accent: 0xffd166, light: 0xf0f7ff, dark: 0x1d3a8a },
  countEmoji: '🎃',
});

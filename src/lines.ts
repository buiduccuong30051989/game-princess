// MỌI câu thoại của game (trừ từ vựng / token đánh vần: src/spell.ts + src/rooms/<id>.ts; câu toán: src/math.ts).
// File THUẦN (không DOM, không three): scripts/audio-lines.mjs đọc file này để sinh audio Microsoft Hoài My (edge-tts).
// Sửa chữ → `pnpm audio` (chỉ sinh lại câu đổi).
//
// LUẬT TÊN TIẾNG ANH: tên riêng tiếng Anh (Elsa, Rapunzel, Cinderella…) PHẢI do giọng tiếng Anh đọc. Viết tên trong ngoặc nhọn:
// "Tớ là {Ariel}!" → scripts/gen-audio.py sinh "{…}" bằng giọng EN của người nói (VOICES[].en), phần còn lại bằng giọng Việt,
// cắt lặng rồi ghép cách ~80 ms. scripts/audio-lines.mjs báo lỗi nếu phần giọng Việt còn sót tên trong EN_NAMES.
// Tên tiếng Việt quen thuộc (Lọ Lem, Bạch Tuyết, Mộc Lan) vẫn đọc bằng giọng Việt.
import type { RoomId } from './room/types.ts';

export type FamilyId = 'ba-cuong' | 'me-yen' | 'ba-tuyet' | 'ong-cuong' | 'bac-hanh';
/** Ai nói: Elsa (dẫn đường), 1 công chúa, 1 người nhà. */
export type Speaker = 'elsa' | RoomId | FamilyId;
export type Voice = 'elsa' | 'princess' | 'ba' | 'me' | 'ong' | 'batuyet' | 'bachanh';

export interface VoiceDef { voice: string; rate: string; pitch: string; /** giọng tiếng Anh đọc {Tên riêng} */ en: string; enPitch: string }
const EN_F = 'en-US-JennyNeural'; // nữ: hợp với Hoài My (Elsa, công chúa, mẹ, bà, bác)
const EN_M = 'en-US-GuyNeural';   // nam: ba, ông
/**
 * Hoài My là giọng chính (rate −10% cho trẻ con nghe rõ). Công chúa: Hoài My cao + nhanh hơn chút cho khác Elsa.
 * Ba Cường / ông Cương: Nam Minh (giọng nam — giọng nữ nói "Ba thương con" nghe sai với bé). Đổi 1 dòng là đổi giọng.
 */
export const VOICES: Record<Voice, VoiceDef> = {
  elsa: { voice: 'vi-VN-HoaiMyNeural', rate: '-10%', pitch: '+0Hz', en: EN_F, enPitch: '+0Hz' },
  princess: { voice: 'vi-VN-HoaiMyNeural', rate: '-6%', pitch: '+8Hz', en: EN_F, enPitch: '+8Hz' },
  ba: { voice: 'vi-VN-NamMinhNeural', rate: '-6%', pitch: '+0Hz', en: EN_M, enPitch: '+0Hz' },
  me: { voice: 'vi-VN-HoaiMyNeural', rate: '-10%', pitch: '+3Hz', en: EN_F, enPitch: '+3Hz' },
  ong: { voice: 'vi-VN-NamMinhNeural', rate: '-16%', pitch: '-10Hz', en: EN_M, enPitch: '-10Hz' },
  batuyet: { voice: 'vi-VN-HoaiMyNeural', rate: '-16%', pitch: '-7Hz', en: EN_F, enPitch: '-7Hz' },
  bachanh: { voice: 'vi-VN-HoaiMyNeural', rate: '-12%', pitch: '-4Hz', en: EN_F, enPitch: '-4Hz' },
};

const FAMILY_VOICE: Record<FamilyId, Voice> = { 'ba-cuong': 'ba', 'me-yen': 'me', 'ba-tuyet': 'batuyet', 'ong-cuong': 'ong', 'bac-hanh': 'bachanh' };
export function voiceOf(s: Speaker): Voice {
  if (s === 'elsa') return 'elsa';
  return (FAMILY_VOICE as Record<string, Voice>)[s] ?? 'princess';
}

/** Tên riêng tiếng Anh có thể được ĐỌC (phần giọng Việt không được chứa — scripts/audio-lines.mjs soát). */
export const EN_NAMES = [
  'Elsa', 'Anna', 'Rapunzel', 'Ariel', 'Belle', 'Cinderella', 'Jasmine', 'Snow White', 'Aurora', 'Mulan', 'Merida', 'Tiana',
  'Olaf', 'Pascal', 'Frozen', 'Celistia', 'Celestia', 'Sebastian', 'Flounder', 'Rajah', 'Abu', 'Aladdin', 'Naveen', 'Ray', 'Mama Odie',
];

/** Nhãn người nói trên khung phụ đề + màu viền + emoji dự phòng khi chưa có ảnh chân dung. */
export const SPEAKER_INFO: Record<Speaker, { name: string; color: string; emoji: string }> = {
  elsa: { name: 'Elsa', color: '#2f9df5', emoji: '❄️' },
  rapunzel: { name: 'Rapunzel', color: '#a855f7', emoji: '🏮' },
  ariel: { name: 'Ariel', color: '#14b8a6', emoji: '🐚' },
  belle: { name: 'Belle', color: '#f59e0b', emoji: '🌹' },
  cinderella: { name: 'Lọ Lem (Cinderella)', color: '#3b82f6', emoji: '👠' },
  jasmine: { name: 'Jasmine', color: '#0ea5a4', emoji: '🪔' },
  snowwhite: { name: 'Bạch Tuyết (Snow White)', color: '#e11d48', emoji: '🍎' },
  anna: { name: 'Anna', color: '#16a34a', emoji: '⛄' },
  aurora: { name: 'Aurora', color: '#ec4899', emoji: '🦋' },
  mulan: { name: 'Mộc Lan (Mulan)', color: '#dc2626', emoji: '🌸' },
  merida: { name: 'Merida', color: '#ea580c', emoji: '🏹' },
  tiana: { name: 'Tiana', color: '#65a30d', emoji: '🐸' },
  'ba-cuong': { name: 'Ba Cường', color: '#2f9df5', emoji: '👨' },
  'me-yen': { name: 'Mẹ Yến', color: '#ff5fb4', emoji: '👩' },
  'ba-tuyet': { name: 'Bà Tuyết', color: '#8b5cf6', emoji: '👵' },
  'ong-cuong': { name: 'Ông Cương', color: '#58a700', emoji: '👴' },
  'bac-hanh': { name: 'Bác Hanh', color: '#ff9600', emoji: '👩‍🦱' },
};

/** Câu đơn: key → [người nói, câu]. Khoá chỉ dùng a-z 0-9 _ (tên file). */
export const LINES: Record<string, [Speaker, string]> = {
  hall_intro_first: ['elsa', 'Chào Nhím! Chị là {Elsa}. Các công chúa trong lâu đài bị phép thuật đóng băng hết rồi. Nhím giúp chị đánh thức các bạn ấy nhé! Chạm vào bệ đang sáng đi nào!'],
  family_wall: ['elsa', 'Đây là cả nhà của Nhím đó!'],
  ask_fill: ['elsa', 'Chữ nào còn thiếu? Chạm vào chữ đúng nhé.'],
  ball_3: ['elsa', 'Tuyệt vời! Nhím đã cứu được ba công chúa! Mở dạ hội thôi!'],
  ball_6: ['elsa', 'Sáu công chúa rồi! Nhím ơi, dạ hội lần thứ hai nào!'],
  ball_9: ['elsa', 'Chín công chúa! Hà An giỏi quá! Dạ hội lần thứ ba!'],
  ball_final: ['elsa', 'Hà An đã đánh thức tất cả các công chúa! Lâu đài lại vui như xưa. Chị {Elsa} cũng thay váy băng để dự dạ hội với Nhím đây!'],
  fam_all: ['ba-cuong', 'Cả nhà cùng vỗ tay cho Nhím nào!'],
};

/**
 * Ngân hàng câu: mỗi tình huống 8–15 câu, chọn ngẫu nhiên không lặp liền (src/voice.ts). Khoá audio: b_<tên>_<i>.
 * Nhắc khi ngồi im: chỉ sau ~20 s, rồi giãn ra 40 s, 80 s (src/challenge.ts, src/hall.ts).
 */
export const BANK_TEXT: Record<string, [Speaker, string[]]> = {
  hall_hello: ['elsa', [
    'Chào Nhím! Mình đi cứu công chúa nào tiếp theo? Chạm vào bệ đang sáng nhé.',
    'Nhím về rồi! Chị nhớ Nhím quá. Mình cứu thêm một công chúa nhé!',
    'Nhím ơi, các công chúa đang chờ Nhím đó. Chạm vào bệ đang sáng nào!',
    'A, Nhím đây rồi! Hôm nay mình đánh thức công chúa nào đây?',
    'Chào Hà An! Bệ nào đang sáng là cửa đã mở đó.',
    'Nhím sẵn sàng chưa? Mình cùng làm tan băng nào!',
    'Lâu đài vui hẳn lên khi có Nhím. Mình đi tiếp nhé!',
    'Nhím ơi, chạm vào một bệ đang sáng để vào phòng công chúa nhé.',
  ]],
  hall_idle: ['elsa', [
    'Nhím ơi, chạm vào bệ đang sáng để đi cứu công chúa nhé!',
    'Bệ nào đang lấp lánh là cửa đã mở đó Nhím.',
    'Chị đang chờ Nhím chọn một công chúa nè.',
    'Nhím chạm vào bệ có vòng sáng nhé!',
    'Các công chúa đang chờ Nhím đó!',
    'Mình đi cứu công chúa tiếp không Nhím?',
    'Nhím ơi, nhìn kìa, có bệ đang sáng đó!',
    'Chạm vào bệ đang nhún nhảy nhé Nhím.',
  ]],
  hall_locked: ['elsa', [
    'Cửa này còn khoá. Mình đi cứu công chúa ở bệ đang sáng trước nhé!',
    'Ôi, cửa này chưa mở được. Nhím chọn bệ đang sáng nhé.',
    'Cửa này cần thêm phép thuật. Mình cứu công chúa khác trước đã!',
    'Chưa mở được Nhím ơi. Bệ có vòng sáng mới vào được nhé.',
    'Cửa này còn ngủ say. Mình đi cửa đang sáng nhé!',
    'Khoá mất rồi! Cứu thêm công chúa thì cửa này sẽ mở.',
    'Nhím chọn bệ đang lấp lánh nhé, cửa này chưa mở.',
    'Cửa này để sau nhé Nhím. Mình đi cửa đang sáng!',
  ]],
  hall_welcome: ['elsa', [
    'Công chúa đã về đại sảnh rồi! Nhím giỏi quá!',
    'Hoan hô! Thêm một công chúa về với lâu đài!',
    'Nhìn kìa, bạn ấy về bệ của mình rồi! Cảm ơn Nhím!',
    'Nhím làm được rồi! Đại sảnh sáng thêm một chút nữa!',
    'Tuyệt quá! Công chúa đang vẫy Nhím đó!',
    'Thêm một ngôi sao cho Nhím nè!',
    'Lâu đài vui hơn rồi, nhờ có Nhím đó!',
    'Công chúa đã tỉnh và về nhà rồi. Nhím giỏi lắm!',
  ]],
  hall_new_door: ['elsa', [
    'Một cánh cửa mới đã mở ra!',
    'Nhìn kìa, có cửa mới mở rồi!',
    'Cửa mới sáng lên rồi Nhím ơi!',
    'Lại thêm một phòng công chúa mở cửa!',
    'Ồ, cánh cửa kia vừa mở ra đó!',
    'Có thêm một công chúa đang chờ Nhím kìa!',
    'Cửa mới đã mở, mình đi cứu tiếp nhé!',
    'Phép thuật của Nhím vừa mở thêm một cánh cửa!',
  ]],
  hall_saved_tap: ['elsa', [
    'Công chúa này tỉnh rồi! Mình vào chơi với bạn ấy nhé.',
    'Bạn ấy tỉnh rồi! Vào chơi thêm nhé Nhím.',
    'Mình vào thăm bạn ấy nào!',
    'Công chúa này đang chờ Nhím vào chơi đó.',
    'Vào chơi lại với bạn ấy nhé!',
    'Bạn ấy vui lắm khi Nhím quay lại!',
    'Mình vào phòng bạn ấy chơi tiếp nhé.',
    'Đi thăm công chúa nào!',
  ]],
  elsa_tap: ['elsa', [
    'Hi hi! Nhột quá Nhím ơi!',
    'Chị thương Nhím lắm!',
    'Nhím xem chị làm phép tuyết nè!',
    'Ôi, Nhím chạm vào chị à? Hi hi!',
    'Chị xoay một vòng cho Nhím xem nhé!',
    'Tuyết rơi lấp lánh nè Nhím!',
    'Nhím là bạn thân nhất của chị!',
    'Hi hi, chị vui quá!',
    'Nhím có thấy bông tuyết không?',
    'Chị ôm Nhím một cái nè!',
  ]],
  start: ['elsa', [
    'Nhím ơi, trả lời đúng để làm tan băng nhé!',
    'Mình cùng làm tan băng nào!',
    'Câu đầu tiên đây Nhím ơi!',
    'Nhím giúp chị làm phép nhé!',
    'Bắt đầu nào! Nhím nghe chị hỏi nhé.',
    'Mình bắt đầu phép thuật nhé Nhím!',
    'Nhím sẵn sàng chưa? Câu đầu tiên nè!',
    'Mỗi câu đúng là băng tan một chút đó!',
  ]],
  replay_start: ['elsa', [
    'Mình cùng chơi thêm nhé!',
    'Chơi lại nào Nhím ơi!',
    'Thêm một lượt nữa nhé!',
    'Công chúa muốn chơi với Nhím đó!',
    'Mình chơi tiếp nào!',
    'Nhím chơi thêm cho công chúa xem nhé!',
    'Lại nào, lại nào!',
    'Mình chơi thêm ba câu nhé Nhím!',
  ]],
  next: ['elsa', [
    'Thêm một câu nữa nào!',
    'Câu tiếp theo nè!',
    'Nhím giỏi quá, mình làm tiếp nhé!',
    'Còn một chút nữa thôi!',
    'Mình làm câu tiếp nhé!',
    'Nhím nghe câu này nhé!',
    'Tiếp nào Nhím ơi!',
    'Băng sắp tan rồi, thêm câu nữa nào!',
  ]],
  last: ['elsa', [
    'Câu cuối cùng rồi, Nhím cố lên!',
    'Câu cuối nè! Công chúa sắp tỉnh rồi!',
    'Chỉ còn một câu nữa thôi Nhím ơi!',
    'Câu cuối cùng! Nhím làm được mà!',
    'Một câu nữa là công chúa tỉnh dậy đó!',
    'Câu cuối rồi, chị tin Nhím!',
    'Nhím ơi, câu cuối cùng đây!',
    'Sắp xong rồi! Câu cuối nè!',
  ]],
  right: ['elsa', [
    'Đúng rồi!', 'Đúng rồi Nhím ơi!', 'Chính xác!', 'Giỏi quá!', 'Đúng rồi, tuyệt quá!', 'Nhím đúng rồi!',
    'Đúng luôn!', 'A, đúng rồi!', 'Hay quá, đúng rồi!', 'Đúng rồi, Nhím giỏi ghê!', 'Chuẩn luôn!', 'Đúng rồi nè!',
  ]],
  praise: ['elsa', [
    'Giỏi lắm!', 'Tuyệt vời!', 'Nhím giỏi quá!', 'Hoan hô Nhím!', 'Nhím làm phép hay quá!', 'Chị thích quá!',
    'Siêu quá Nhím ơi!', 'Nhím thông minh quá!', 'Phép thuật mạnh lắm!', 'Hay lắm Nhím!', 'Nhím giỏi ghê!', 'Đỉnh quá!',
  ]],
  melt: ['elsa', [
    'Băng tan rồi kìa!',
    'Băng tan thêm rồi! Sắp được rồi!',
    'Nhìn kìa, băng đang tan đó!',
    'Băng mỏng đi rồi!',
    'Công chúa ấm lên rồi kìa!',
    'Một lớp băng tan rồi!',
    'Băng chảy thành nước rồi!',
    'Ồ, băng nứt ra rồi!',
    'Phép thuật làm băng tan rồi!',
    'Sắp thấy công chúa rồi!',
  ]],
  retry: ['elsa', [
    'Chưa đúng rồi, thử lại nhé!',
    'Gần đúng rồi, Nhím thử lại nào!',
    'Không sao đâu, mình thử lại nhé!',
    'Ồ, chưa phải rồi. Nhím chọn lại nhé!',
    'Thử lại nào Nhím ơi!',
    'Chưa đúng, nhưng Nhím giỏi lắm. Thử lại nhé!',
    'Hừm, chưa phải. Nhím nghe lại nhé!',
    'Không sao, chị cũng hay nhầm mà. Thử lại nào!',
    'Nhím thử cái khác xem nào!',
    'Chưa đúng rồi, mình cùng thử lại nha!',
  ]],
  hint: ['elsa', [
    'Chạm vào cái đang nhấp nháy nhé.',
    'Nhím nhìn cái đang sáng lên kìa!',
    'Chị chỉ cho Nhím nè, cái đang nhấp nháy đó!',
    'Cái đang nhún nhảy là đúng đó Nhím.',
    'Nhím chạm vào cái lấp lánh nhé!',
    'Gợi ý nè: cái đang sáng đó!',
    'Thử cái đang nhấp nháy xem Nhím!',
    'Chị giúp Nhím nhé, chạm vào cái đang sáng.',
  ]],
  idle: ['elsa', [
    'Nhím ơi, chị đang chờ Nhím nè.',
    'Nhím chọn đi nào!',
    'Nhím nghe lại câu hỏi nhé.',
    'Chị hỏi lại nhé Nhím.',
    'Nhím ơi, mình chơi tiếp nào!',
    'Công chúa đang chờ Nhím đó.',
    'Nhím thử chạm vào một cái xem!',
    'Không sao, Nhím cứ từ từ nhé.',
  ]],
  wake: ['elsa', [
    'Công chúa tỉnh dậy rồi!',
    'Băng vỡ rồi! Công chúa tỉnh rồi!',
    'Hoan hô! Bạn ấy tỉnh dậy rồi!',
    'Nhìn kìa, công chúa mở mắt rồi!',
    'Phép thuật thành công rồi!',
    'Nhím đã đánh thức công chúa!',
    'Công chúa tỉnh rồi, nhờ có Nhím đó!',
    'Tuyệt vời! Băng tan hết rồi!',
  ]],
  tap_home: ['elsa', [
    'Chạm vào nút lâu đài để về đại sảnh nhé.',
    'Mình về đại sảnh nhé Nhím, chạm vào nút lâu đài.',
    'Nhím muốn về đại sảnh thì chạm nút lâu đài nhé.',
    'Chạm nút vàng để về đại sảnh nào!',
    'Về đại sảnh thôi Nhím, chạm vào nút lâu đài.',
    'Nhím chạm nút lâu đài, mình về gặp các công chúa khác nhé.',
    'Hoặc Nhím chạm chơi lại để chơi thêm nhé!',
    'Mình về đại sảnh đưa công chúa về nhà nhé!',
  ]],
  replay_intro: ['elsa', [
    'Công chúa tỉnh rồi! Nhím chạm chơi lại để chơi thêm với bạn ấy nhé.',
    'Bạn ấy đang chờ Nhím chơi cùng đó!',
    'Nhím chạm chơi lại nhé, công chúa muốn chơi thêm!',
    'Mình chơi với công chúa nhé Nhím!',
    'Chạm chơi lại để chơi thêm nhé!',
    'Công chúa vui quá vì Nhím quay lại!',
    'Nhím muốn chơi thêm không? Chạm chơi lại nhé!',
    'Bạn ấy vẫy Nhím kìa!',
  ]],
  replay_done: ['elsa', [
    'Nhím giỏi quá! Công chúa múa cho Nhím xem nè!',
    'Hoan hô! Công chúa xoay váy cảm ơn Nhím đó!',
    'Tuyệt quá! Công chúa vui lắm!',
    'Nhím giỏi ghê! Công chúa múa nè!',
    'Hay quá! Công chúa nhún chào Nhím đó!',
    'Xong rồi! Công chúa cảm ơn Nhím!',
    'Nhím chơi giỏi quá! Xem công chúa múa nè!',
    'Hoan hô Nhím! Công chúa thích lắm!',
  ]],
  ball_end: ['elsa', [
    'Dạ hội vui quá! Cảm ơn Nhím nhé!',
    'Vui quá đi! Mình đi cứu tiếp nhé!',
    'Dạ hội thật tuyệt! Nhím giỏi quá!',
    'Các công chúa cảm ơn Nhím đó!',
    'Nhím múa đẹp quá! Mình đi tiếp nào!',
    'Dạ hội xong rồi, các công chúa vui lắm!',
    'Cảm ơn Nhím đã mang dạ hội về lâu đài!',
    'Hoan hô Nhím! Mình đi cứu thêm công chúa nhé!',
  ]],
  math_count: ['elsa', [
    'Mình cùng đếm nhé!',
    'Nhím đếm cùng chị nào!',
    'Đếm nào Nhím ơi!',
    'Mình đếm từng cái nhé!',
    'Chị đếm, Nhím đếm theo nhé!',
    'Nào, mình đếm nhé!',
    'Nhím nhìn chị đếm nè!',
    'Cùng đếm nào!',
  ]],
  math_retry: ['elsa', [
    'Nhím chọn lại số nhé!',
    'Bây giờ Nhím chọn số đúng nhé!',
    'Nhím thử chọn lại nào!',
    'Đếm xong rồi, Nhím chọn số nhé!',
    'Chọn lại nhé Nhím ơi!',
    'Vậy là mấy nhỉ? Nhím chọn đi!',
    'Nhím chạm vào số đúng nhé!',
    'Thử lại nào, Nhím làm được mà!',
  ]],
};
export const bankKey = (bank: string, i: number) => `b_${bank}_${i}`;

/** Câu riêng từng phòng: tên phòng (Elsa đọc khi chạm cửa), lời giới thiệu (Elsa), lời cảm ơn (công chúa tự nói). */
export const ROOM_TEXT: Record<RoomId, { name: string; intro: string; thanks: string }> = {
  rapunzel: {
    name: 'Tòa tháp của {Rapunzel}!',
    intro: 'Đây là tòa tháp của công chúa {Rapunzel}. Ôi, {Rapunzel} bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím nhé! Tớ là {Rapunzel}. Tối nay mình cùng ngắm đèn lồng bay lên trời nhé!',
  },
  ariel: {
    name: 'Hang kho báu của {Ariel}!',
    intro: 'Đây là hang kho báu dưới biển của nàng tiên cá {Ariel}. Ôi, {Ariel} bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Ariel}. Mình cùng bơi với các bạn cá nhé!',
  },
  belle: {
    name: 'Thư viện của {Belle}!',
    intro: 'Đây là thư viện phép thuật của công chúa {Belle}. Ôi, {Belle} bị đóng băng mất rồi! Hà An trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Belle}. Mình cùng đọc truyện cổ tích nhé!',
  },
  cinderella: {
    name: 'Cầu thang của Lọ Lem!',
    intro: 'Đây là cầu thang trong cung điện của Lọ Lem. Sắp nửa đêm rồi, mà Lọ Lem bị đóng băng mất! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là Lọ Lem, tên tiếng Anh là {Cinderella}. Mình cùng lên xe bí ngô đi dự vũ hội nhé!',
  },
  jasmine: {
    name: 'Ban công của {Jasmine}!',
    intro: 'Đây là ban công cung điện của công chúa {Jasmine}. Ôi, {Jasmine} bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Jasmine}. Mình cùng ngồi thảm bay đi ngắm trăng nhé!',
  },
  snowwhite: {
    name: 'Ngôi nhà nhỏ của Bạch Tuyết!',
    intro: 'Đây là ngôi nhà nhỏ trong rừng của công chúa Bạch Tuyết. Ôi, Bạch Tuyết bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là Bạch Tuyết, tên tiếng Anh là {Snow White}. Mình cùng đi hái táo với các bạn chim nhé!',
  },
  anna: {
    name: 'Sân hè của {Anna}!',
    intro: 'Đây là sân lâu đài của công chúa {Anna}, bên bờ biển xanh. Ôi, {Anna} bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Anna}, em gái của chị {Elsa}. Mình cùng {Olaf} đi ăn sô cô la nhé!',
  },
  aurora: {
    name: 'Ngôi nhà trong rừng của {Aurora}!',
    intro: 'Đây là ngôi nhà nhỏ trong rừng của công chúa {Aurora}. Ôi, {Aurora} bị đóng băng mất rồi! Hà An trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Aurora}. Mình cùng hát với các bạn chim nhé!',
  },
  mulan: {
    name: 'Vườn hoa đào của Mộc Lan!',
    intro: 'Đây là vườn hoa đào của công chúa Mộc Lan. Ôi, Mộc Lan bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là Mộc Lan, tên tiếng Anh là {Mulan}. Nhím dũng cảm lắm!',
  },
  merida: {
    name: 'Rừng xanh của {Merida}!',
    intro: 'Đây là rừng xanh của công chúa {Merida}, có vòng đá cổ và những đốm sáng xanh kỳ diệu. Ôi, {Merida} bị đóng băng mất rồi! Hà An trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Merida}. Mình cùng đi bắn cung và cưỡi ngựa nhé!',
  },
  tiana: {
    name: 'Đầm sen của {Tiana}!',
    intro: 'Đây là đầm sen của công chúa {Tiana}, có đom đóm và những chú ếch xanh. Ôi, {Tiana} bị đóng băng mất rồi! Nhím trả lời đúng ba câu để làm tan băng nhé!',
    thanks: 'Cảm ơn Nhím đã cứu tớ! Tớ là {Tiana}. Tớ sẽ làm bánh thật ngon mời Nhím ăn nhé!',
  },
};
export const roomKey = (id: RoomId, part: 'name' | 'intro' | 'thanks') => `${id}_${part}`;

/** Gia đình Nhím cổ vũ: mỗi người tự nói bằng giọng của mình (ba, ông: giọng nam). Khoá fam_<id>_<i>, fam_<id>_ball. */
export const FAMILY_TEXT: Record<FamilyId, { cheer: string[]; ball: string }> = {
  'ba-cuong': { cheer: ['Nhím ơi, cố lên! Ba tin con!', 'Nhím của ba giỏi quá!', 'Ba giơ ngón tay cái cho Nhím nè!'], ball: 'Hoan hô Nhím!' },
  'me-yen': { cheer: ['Nhím giỏi quá! Mẹ tự hào về con!', 'Mẹ thương Nhím nhất trên đời!', 'Nhím ơi, tuyệt vời!'], ball: 'Nhím giỏi nhất!' },
  'ba-tuyet': { cheer: ['Bà thương Nhím nhiều lắm!', 'Cháu bà ngoan quá!', 'Bà ôm Nhím một cái thật chặt!'], ball: 'Bà thương Nhím!' },
  'ong-cuong': { cheer: ['Ông vỗ tay cho Nhím nè!', 'Cháu ông giỏi quá!', 'Ông cười tít mắt vì Nhím đó!'], ball: 'Tuyệt vời cháu ơi!' },
  'bac-hanh': { cheer: ['Bác thơm Nhím một cái!', 'Nhím thông minh quá!', 'Nhím ơi, hoan hô!'], ball: 'Thơm Nhím nào!' },
};
const famSlug = (id: FamilyId) => id.replace('-', '_');
export const famKey = (id: FamilyId, i: number | 'ball') => `fam_${famSlug(id)}_${i}`;

/** Chữ + người nói của 1 khoá audio (để hiện phụ đề có nhãn người nói). null = không phải câu thoại (token đánh vần, số…). */
export function lineInfo(key: string): { speaker: Speaker; text: string } | null {
  const l = LINES[key];
  if (l) return { speaker: l[0], text: l[1] };
  const b = /^b_([a-z_]+)_(\d+)$/.exec(key);
  if (b && BANK_TEXT[b[1]]) { const [sp, list] = BANK_TEXT[b[1]]; const t = list[Number(b[2])]; return t ? { speaker: sp, text: t } : null; }
  const r = /^([a-z]+)_(name|intro|thanks)$/.exec(key);
  if (r && r[1] in ROOM_TEXT) {
    const id = r[1] as RoomId;
    return { speaker: r[2] === 'thanks' ? id : 'elsa', text: ROOM_TEXT[id][r[2] as 'name' | 'intro' | 'thanks'] };
  }
  for (const [id, f] of Object.entries(FAMILY_TEXT) as [FamilyId, typeof FAMILY_TEXT[FamilyId]][]) {
    if (key === famKey(id, 'ball')) return { speaker: id, text: f.ball };
    const i = f.cheer.findIndex((_, n) => famKey(id, n) === key);
    if (i >= 0) return { speaker: id, text: f.cheer[i] };
  }
  return null;
}

/** Mọi câu thoại (khoá, người nói, chữ) — cho scripts/audio-lines.mjs. */
export function allLines(): [key: string, speaker: Speaker, text: string][] {
  const out: [string, Speaker, string][] = [];
  for (const [k, [sp, t]] of Object.entries(LINES)) out.push([k, sp, t]);
  for (const [bank, [sp, list]] of Object.entries(BANK_TEXT)) list.forEach((t, i) => out.push([bankKey(bank, i), sp, t]));
  for (const [id, r] of Object.entries(ROOM_TEXT) as [RoomId, typeof ROOM_TEXT[RoomId]][]) {
    out.push([roomKey(id, 'name'), 'elsa', r.name], [roomKey(id, 'intro'), 'elsa', r.intro], [roomKey(id, 'thanks'), id, r.thanks]);
  }
  for (const [id, f] of Object.entries(FAMILY_TEXT) as [FamilyId, typeof FAMILY_TEXT[FamilyId]][]) {
    f.cheer.forEach((t, i) => out.push([famKey(id, i), id, t]));
    out.push([famKey(id, 'ball'), id, f.ball]);
  }
  return out;
}

// Danh sách audio key: dùng chung (scripts/audio-manifest.txt) + riêng từng phòng (scripts/audio/<id>.txt + từ vựng tự sinh).
import type { RoomDef } from './types.ts';
import { wordAudioLines } from './words.ts';

export const NUMBER_KEYS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'];

/** Câu dùng chung mọi phòng / sảnh (định nghĩa trong scripts/audio-manifest.txt). */
export const COMMON_KEYS = [
  'hall_intro_first', 'hall_hello', 'hall_intro', 'elsa_tap_1', 'elsa_tap_2', 'elsa_tap_3', 'family_wall', 'hall_locked', 'hall_welcome_back', 'hall_new_door', 'hall_saved_tap',
  'ball_3', 'ball_6', 'ball_9', 'ball_final', 'ball_end',
  'challenge_start', 'challenge_start_replay', 'challenge_next', 'challenge_last',
  'right', 'good', 'yay', 'great', 'retry', 'hint_last', 'ask_fill', 'ask_pick_number',
  'melt_1', 'melt_2', 'wake', 'replay_intro', 'replay_done', 'tap_home',
  'sfx_tap', 'sfx_pop', 'sfx_win', 'sfx_soft',
  ...NUMBER_KEYS,
];

/** Mọi key 1 phòng cần (ngoài COMMON_KEYS). */
export function roomAudioKeys(def: RoomDef): string[] {
  return [...new Set([
    ...wordAudioLines(def.words).map(([k]) => k),
    def.audio.name, def.audio.intro, def.audio.thanks, def.count.audio,
  ])];
}

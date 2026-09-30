// Dữ liệu game 3: palette, từ vựng + token đánh vần + điền chữ, công chúa + 6 món đồ.

export const PALETTE = {
  bg: 0xfff4f8,
  wallTop: 0xe9dcff,
  wallBottom: 0xfff1f7,
  floor: 0xf7e6f2,
  floorTile: 0xf0d9ea,
  pedestal: 0xfff8fc,
  pedestalRim: 0xf3c9e3,
  curtain: 0xff9ecf,
  curtainDark: 0xf07ab8,
  gold: 0xffd166,
  mirror: 0xdff3ff,
  ice: 0x5cc8f5,
  iceDeep: 0x6cc8f5,
  magic: 0xc084fc,
  pink: 0xff7ac8,
  star: 0xffd166,
  ink: 0x3b3220,
} as const;

export interface SpellToken { audio: string; lit: number[] }
export interface WordDef {
  id: string; word: string; emoji: string; tokens: SpellToken[];
  /** A2: chỉ số chữ bị che + 2 chữ gây nhiễu (chữ hiển thị trên nút). */
  fill?: { index: number; distractors: string[] };
}

/*
 * Đánh vần theo GDPT 2018: vần 2+ chữ đánh vần vần trước (a – y – ay), rồi tiếng
 * (vờ – ay – vay), rồi thanh (sắc – váy). Gọi phụ âm theo ÂM (vờ, bờ, hờ...).
 */
export const WORDS: WordDef[] = [
  { id: 'vay', word: 'váy', emoji: '👗', fill: { index: 0, distractors: ['b', 'm'] }, tokens: [
    { audio: 'v_a', lit: [1] }, { audio: 'v_y', lit: [2] }, { audio: 'v_ay', lit: [1, 2] },
    { audio: 'c_vo', lit: [0] }, { audio: 'v_ay', lit: [1, 2] }, { audio: 's_vay', lit: [0, 1, 2] },
    { audio: 't_sac', lit: [1] }, { audio: 'w_vay', lit: [0, 1, 2] } ] },
  { id: 'giay', word: 'giày', emoji: '👠', tokens: [
    { audio: 'v_a', lit: [2] }, { audio: 'v_y', lit: [3] }, { audio: 'v_ay', lit: [2, 3] },
    { audio: 'c_gio', lit: [0, 1] }, { audio: 'v_ay', lit: [2, 3] }, { audio: 's_giay', lit: [0, 1, 2, 3] },
    { audio: 't_huyen', lit: [2] }, { audio: 'w_giay', lit: [0, 1, 2, 3] } ] },
  { id: 'hoa', word: 'hoa', emoji: '🌸', fill: { index: 0, distractors: ['t', 'b'] }, tokens: [
    { audio: 'v_o', lit: [1] }, { audio: 'v_a', lit: [2] }, { audio: 'v_oa', lit: [1, 2] },
    { audio: 'c_ho', lit: [0] }, { audio: 'v_oa', lit: [1, 2] }, { audio: 'w_hoa', lit: [0, 1, 2] } ] },
  { id: 'sao', word: 'sao', emoji: '⭐', fill: { index: 0, distractors: ['c', 'b'] }, tokens: [
    { audio: 'v_a', lit: [1] }, { audio: 'v_o', lit: [2] }, { audio: 'v_ao', lit: [1, 2] },
    { audio: 'c_so', lit: [0] }, { audio: 'v_ao', lit: [1, 2] }, { audio: 'w_sao', lit: [0, 1, 2] } ] },
  { id: 'so', word: 'sò', emoji: '🐚', fill: { index: 0, distractors: ['b', 'c'] }, tokens: [
    { audio: 'c_so', lit: [0] }, { audio: 'v_o', lit: [1] }, { audio: 's_so', lit: [0, 1] },
    { audio: 't_huyen', lit: [1] }, { audio: 'w_so', lit: [0, 1] } ] },
  { id: 'bang', word: 'băng', emoji: '❄️', fill: { index: 0, distractors: ['m', 't'] }, tokens: [
    { audio: 'v_abreve', lit: [1] }, { audio: 'c_ngo', lit: [2, 3] }, { audio: 'v_ang', lit: [1, 2, 3] },
    { audio: 'c_bo', lit: [0] }, { audio: 'v_ang', lit: [1, 2, 3] }, { audio: 'w_bang', lit: [0, 1, 2, 3] } ] },
  { id: 'ca', word: 'cá', emoji: '🐟', fill: { index: 0, distractors: ['g', 'b'] }, tokens: [
    { audio: 'c_co', lit: [0] }, { audio: 'v_a', lit: [1] }, { audio: 's_ca', lit: [0, 1] },
    { audio: 't_sac', lit: [1] }, { audio: 'w_ca', lit: [0, 1] } ] },
  { id: 'meo', word: 'mèo', emoji: '🐈', fill: { index: 0, distractors: ['b', 'k'] }, tokens: [
    { audio: 'v_e', lit: [1] }, { audio: 'v_o', lit: [2] }, { audio: 'v_eo', lit: [1, 2] },
    { audio: 'c_mo', lit: [0] }, { audio: 'v_eo', lit: [1, 2] }, { audio: 's_meo', lit: [0, 1, 2] },
    { audio: 't_huyen', lit: [1] }, { audio: 'w_meo', lit: [0, 1, 2] } ] },
  { id: 'ga', word: 'gà', emoji: '🐔', fill: { index: 0, distractors: ['c', 'b'] }, tokens: [
    { audio: 'c_go', lit: [0] }, { audio: 'v_a', lit: [1] }, { audio: 's_ga', lit: [0, 1] },
    { audio: 't_huyen', lit: [1] }, { audio: 'w_ga', lit: [0, 1] } ] },
  { id: 'bo', word: 'bò', emoji: '🐄', fill: { index: 0, distractors: ['m', 'c'] }, tokens: [
    { audio: 'c_bo', lit: [0] }, { audio: 'v_o', lit: [1] }, { audio: 's_bo', lit: [0, 1] },
    { audio: 't_huyen', lit: [1] }, { audio: 'w_bo', lit: [0, 1] } ] },
  { id: 'cho', word: 'chó', emoji: '🐕', tokens: [
    { audio: 'c_cho', lit: [0, 1] }, { audio: 'v_o', lit: [2] }, { audio: 's_cho', lit: [0, 1, 2] },
    { audio: 't_sac', lit: [2] }, { audio: 'w_cho', lit: [0, 1, 2] } ] },
  { id: 'tho', word: 'thỏ', emoji: '🐇', tokens: [
    { audio: 'c_tho', lit: [0, 1] }, { audio: 'v_o', lit: [2] }, { audio: 's_tho', lit: [0, 1, 2] },
    { audio: 't_hoi', lit: [2] }, { audio: 'w_tho', lit: [0, 1, 2] } ] },
];

export const NUMBER_AUDIO = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'];

export type ChallengeKind = 'spell' | 'fill' | 'count';

export type Mount =
  | { kind: 'bone'; bone: string; up: number; forward: number; yaw?: number }   // theo xương Hà An
  | { kind: 'stand'; x: number; z: number; yaw?: number }                          // trên bệ/sàn
  | { kind: 'crown' };                                                             // vòng dựng khối trên đầu

export interface ItemDef {
  id: string;
  emoji: string;
  audio: string;            // item_<princess>_<id>
  model?: string;           // file trong public/models (không có → dựng khối)
  keep?: string[];          // chỉ giữ mesh có material tên này (model kèm đồ thừa)
  height: number;           // chiều cao sau normalize
  mount: Mount;
  challenge: ChallengeKind;
}

export interface PrincessDef {
  id: string;
  name: string;
  emoji: string;
  pickAudio: string;
  model: string;            // model công chúa đủ thân (sau hoá thân)
  modelYaw: number;         // xoay để nhìn ra camera
  clips?: { idle: string; win: string; magic: string };
  magicAudio: string;
  magicColors: [number, number];
  items: ItemDef[];
  playable: boolean;
}

export const PRINCESSES: PrincessDef[] = [
  {
    id: 'elsa', name: 'Elsa', emoji: '❄️', pickAudio: 'pick_elsa',
    model: 'elsa_anim.glb', modelYaw: Math.PI,
    clips: { idle: 'level_idle_01', win: 'level_win_01', magic: 'level_powerup_triggered' },
    magicAudio: 'magic_elsa', magicColors: [0x3fb6f0, 0x8b5cf6],
    playable: true,
    items: [
      { id: 'hair', emoji: '💇‍♀️', audio: 'item_elsa_hair', model: 'hair_elsa.glb', height: 0.78,
        mount: { kind: 'bone', bone: 'Head', up: 0.13, forward: -0.03, yaw: Math.PI }, challenge: 'spell' },
      { id: 'dress', emoji: '👗', audio: 'item_elsa_dress', model: 'dress_elsa.glb', height: 1.6,
        mount: { kind: 'stand', x: -2.3, z: 0.2, yaw: Math.PI * 0.15 }, challenge: 'count' },
      { id: 'crown', emoji: '👑', audio: 'item_elsa_crown', height: 0.2,
        mount: { kind: 'crown' }, challenge: 'fill' },
      { id: 'wand', emoji: '🪄', audio: 'item_elsa_wand', model: 'wand_star.glb', height: 0.7,
        mount: { kind: 'bone', bone: 'RightHand', up: 0.05, forward: 0.02, yaw: 0 }, challenge: 'count' },
      { id: 'olaf', emoji: '⛄', audio: 'item_elsa_olaf', model: 'olaf_small.glb', height: 0.9,
        mount: { kind: 'stand', x: 1.7, z: 1.0, yaw: -0.4 }, challenge: 'spell' },
      { id: 'slipper', emoji: '👠', audio: 'item_elsa_slipper', model: 'slipper.glb', keep: ['heel'], height: 0.36,
        mount: { kind: 'stand', x: 2.3, z: 0.2, yaw: -0.6 }, challenge: 'fill' },
    ],
  },
  { id: 'rapunzel', name: 'Rapunzel', emoji: '🌸', pickAudio: 'pick_rapunzel', model: 'rapunzel.glb', modelYaw: Math.PI,
    magicAudio: 'magic_elsa', magicColors: [0xffd166, 0xffffff], playable: false, items: [] },
  { id: 'ariel', name: 'Ariel', emoji: '🐚', pickAudio: 'pick_ariel', model: 'ariel.glb', modelYaw: 0,
    magicAudio: 'magic_elsa', magicColors: [0x7fd8ff, 0xffffff], playable: false, items: [] },
];

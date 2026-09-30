// Bảng 12 model tượng công chúa + tinh chỉnh tư thế (đã soát bằng /lab.html). Rooms dùng qua princessModel.
import type { PoseTuning, RigGroup } from '../pose.ts';

export interface PrincessModelInfo { model: string; rig: RigGroup; tuning?: PoseTuning; hide?: string[]; hideBones?: string[] }

export const PRINCESS_MODELS: PrincessModelInfo[] = [
  { model: 'p_rapunzel.glb', rig: 'lores', tuning: { armOut: 0.3 }, hide: ['Princess3_rig-Paper_Lantern_Rig_lantern_tex2'] },
  { model: 'p_ariel.glb', rig: 'lores', tuning: { armOut: 0.3 } },
  { model: 'p_belle.glb', rig: 'lores', tuning: { armOut: 0.3 } },
  { model: 'p_cinderella.glb', rig: 'lores', tuning: { armOut: 0.3 } },
  { model: 'p_jasmine.glb', rig: 'lores', tuning: { armOut: 0.3 } },
  // Bạch Tuyết: tay áo phồng + thân áo rộng, armOut 0.3 thì cẳng tay chìm hẳn vào váy (soát 30/09)
  { model: 'p_snowwhite.glb', rig: 'lores', tuning: { armOut: 0.55, armForward: 0.18 } },
  { model: 'p_anna.glb', rig: 'lores', tuning: { armOut: 0.3 } },
  { model: 'p_aurora.glb', rig: 'hires', tuning: { armOut: 0.3 } },
  { model: 'p_mulan.glb', rig: 'hires', tuning: { armOut: 0.3 }, hide: ['MulanSword_Texture'] },
  { model: 'p_merida.glb', rig: 'hires', tuning: { armOut: 0.3 }, hideBones: ['anm_Bow', 'anm_Arrow'] },
  { model: 'p_tiana.glb', rig: 'tiana', tuning: { armOut: 0.3 } },
  { model: 'p_elsa_f1.glb', rig: 'lores', tuning: { armOut: 0.3 } },
];

export function princessInfo(model: string): PrincessModelInfo | undefined {
  return PRINCESS_MODELS.find((p) => p.model === model);
}

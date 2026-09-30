// TODO(room-agent): KHUNG TẠM cho phòng chưa làm. Mỗi phòng thật phải thay bằng cảnh + từ vựng + audio riêng
// (xem docs/ROOM-GUIDE.md). File này chỉ để dự án biên dịch và chơi thử được cả 11 phòng.
import * as THREE from 'three';
import type { RoomCtx, RoomDef, RoomId, RoomPalette } from '../room/types.ts';
import type { RigGroup } from '../pose.ts';
import { wallpaperTex, tileTex, texMat, floor, wall, pillar, painting, rug, mix, curtain } from '../room/kit.ts';

export interface StubMeta {
  id: RoomId;
  name: string;
  emoji: string;
  princessModel: string;
  rig: RigGroup;
  palette: RoomPalette;
  countEmoji: string;
}

/** Phòng tạm: tường giấy dán theo màu phòng, sàn ô, 4 cột, 1 tranh emoji, thảm. Từ vựng chung. */
export function stubRoom(m: StubMeta): RoomDef {
  const p = m.palette;
  return {
    id: m.id,
    name: m.name,
    emoji: m.emoji,
    princessModel: m.princessModel,
    rig: m.rig,
    palette: p,
    buildScene(ctx: RoomCtx) {
      const { root } = ctx;
      const back = wall(18, 9, texMat(wallpaperTex(mix(p.light, p.primary, 0.18), mix(p.light, p.primary, 0.32), mix(p.primary, 0xffffff, 0.2))));
      back.position.z = -5.5;
      root.add(back);
      for (const side of [-1, 1]) {
        const s = wall(12, 9, texMat(wallpaperTex(mix(p.light, p.secondary, 0.15), mix(p.light, p.secondary, 0.3), mix(p.secondary, 0xffffff, 0.2))));
        s.position.set(side * 7, 0, 0);
        s.rotation.y = -side * Math.PI / 2;
        root.add(s);
      }
      root.add(floor(30, 30, texMat(tileTex(mix(p.light, p.primary, 0.12), 0xffffff, [10, 10], mix(p.light, p.primary, 0.3)))));
      for (const [x, z] of [[-4.6, -4.2], [4.6, -4.2], [-5.8, -0.5], [5.8, -0.5]] as const) {
        const col = pillar(6, 0.35, 0xfffaf4, p.accent);
        col.position.set(x, 0, z);
        root.add(col);
      }
      const pic = painting(1.8, 1.8, m.emoji, mix(p.light, 0xffffff, 0.5), p.accent);
      pic.position.set(0, 3.2, -5.4);
      root.add(pic);
      for (const side of [-1, 1]) {
        const c = curtain(5, 1.2, p.primary);
        c.position.set(side * 2.6, 0, -5.2);
        root.add(c);
      }
      const r = rug(3.4, 2.3, p.secondary, p.accent);
      r.position.z = 0.6;
      root.add(r);
      const l = new THREE.PointLight(mix(p.accent, 0xffffff, 0.4), 4, 10);
      l.position.set(0, 4, -2);
      root.add(l);
    },
    words: [
      { word: 'hoa', emoji: '🌸', name: 'bông hoa', fill: { index: 0, distractors: ['t', 'l'] } },
      { word: 'sao', emoji: '⭐', name: 'ngôi sao', fill: { index: 0, distractors: ['c', 'b'] } },
      { word: 'cá', emoji: '🐟', name: 'con cá', fill: { index: 0, distractors: ['g', 'b'] } },
      { word: 'mèo', emoji: '🐈', name: 'con mèo', fill: { index: 0, distractors: ['b', 'l'] } },
      { word: 'bò', emoji: '🐄', name: 'con bò' },
      { word: 'gà', emoji: '🐔', name: 'con gà' },
    ],
    count: { emoji: m.countEmoji, audio: `${m.id}_count` },
    challenges: ['spell', 'fill', 'count'],
    magicColors: [mix(p.primary, 0x000000, 0.15), p.secondary],
    audio: { name: `${m.id}_name`, intro: `${m.id}_intro`, thanks: `${m.id}_thanks` },
  };
}

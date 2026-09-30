// Danh sách 11 phòng (thứ tự = thứ tự mở cửa ở Đại sảnh). Mỗi phòng 1 file, export default RoomDef.
import type { RoomDef, RoomId } from '../room/types.ts';
import { ROOM_ORDER } from '../core/progress.ts';
import rapunzel from './rapunzel.ts';
import ariel from './ariel.ts';
import belle from './belle.ts';
import cinderella from './cinderella.ts';
import jasmine from './jasmine.ts';
import snowwhite from './snowwhite.ts';
import anna from './anna.ts';
import aurora from './aurora.ts';
import mulan from './mulan.ts';
import merida from './merida.ts';
import tiana from './tiana.ts';

const ALL: Record<RoomId, RoomDef> = { rapunzel, ariel, belle, cinderella, jasmine, snowwhite, anna, aurora, mulan, merida, tiana };

export const ROOMS: RoomDef[] = ROOM_ORDER.map((id) => ALL[id]);
export function getRoom(id: string): RoomDef | undefined { return ALL[id as RoomId]; }

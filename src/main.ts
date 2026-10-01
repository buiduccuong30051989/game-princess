// Điều phối: màn chào → Đại sảnh ↔ Phòng công chúa. Tiến độ lưu localStorage (castle-progress-v1).
// Debug: ?room=<id>&debug=1[&wake=1|&melt=1] vào thẳng 1 phòng; ?saved=N / ?ball=N cho sảnh (xem core/params.ts).
import { Engine } from './core/engine.ts';
import { PARAMS } from './core/params.ts';
import { loadProgress, markSaved, ROOM_ORDER } from './core/progress.ts';
import { prefetch, lodModel } from './core/assets.ts';
import { ROOMS, getRoom } from './rooms/index.ts';
import { HallScene } from './hall.ts';
import { RoomScene } from './room/RoomScene.ts';
import { COMMON_KEYS, roomAudioKeys } from './room/audioKeys.ts';
import { ELSA_MODEL } from './elsa.ts';
import { unlockAudio, preload, stopSpeech, stopMusic } from './audio.ts';
import { els, setStars, startSparkles } from './ui.ts';
import { FAMILY_KEYS } from './family.ts';
import type { RoomId } from './room/types.ts';

const engine = new Engine(document.getElementById('app')!, els.fade);
engine.start();
// màn lỗi (tải model hỏng…): quay về sảnh thay vì kẹt
engine.onSceneError = () => void goHall();
const progress = loadProgress();
let justSaved: RoomId | null = null;
setStars(progress.saved.length, ROOM_ORDER.length);

async function goHall(): Promise<void> {
  stopSpeech();
  const arrival = justSaved;
  justSaved = null;
  await engine.show(() => HallScene.create(engine, {
    progress,
    arrival,
    forceBall: PARAMS.ball,
    onOpenRoom: (id) => void goRoom(id),
  }));
}

async function goRoom(id: RoomId): Promise<void> {
  const def = getRoom(id);
  if (!def) { console.error('không có phòng', id); return; }
  stopSpeech();
  stopMusic();
  void preload(roomAudioKeys(def));
  await engine.show(() => RoomScene.create(engine, def, {
    saved: progress.saved.includes(id),
    debug: PARAMS.debug,
    startWake: PARAMS.room === id && PARAMS.wake,
    startMelt: PARAMS.room === id ? PARAMS.melt : undefined,
    onSaved: (rid) => {
      markSaved(progress, rid);
      justSaved = rid;
      setStars(progress.saved.length, ROOM_ORDER.length, true);
    },
    onExit: () => void goHall(),
  }));
}

function boot(): void {
  // tải trước những thứ màn đầu cần
  prefetch([ELSA_MODEL, ...ROOMS.slice(0, 4).map((r) => lodModel(r.princessModel))]);
  if (PARAMS.room) {
    // xem thử 1 phòng: bỏ màn chào; chạm đầu tiên ở bất kỳ đâu sẽ mở tiếng
    els.start.hidden = true;
    const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    void preload([...COMMON_KEYS, ...FAMILY_KEYS]);
    if (!getRoom(PARAMS.room)) console.error(`?room=${PARAMS.room} không có. Có: ${ROOM_ORDER.join(', ')}`);
    void goRoom((getRoom(PARAMS.room)?.id ?? 'rapunzel') as RoomId);
    return;
  }
  startSparkles();
  els.startBtn.classList.add('ready');
  els.startBtn.addEventListener('click', () => {
    unlockAudio();
    els.start.classList.add('hide');
    setTimeout(() => (els.start.hidden = true), 520);
    void preload([...COMMON_KEYS, ...FAMILY_KEYS]).then(() => goHall());
  }, { once: true });
}

boot();

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = {
    engine, progress, goHall, goRoom, ROOMS,
    get scene() { return engine.current; },
    get renderer() { return engine.renderer; },
    /** chụp khung hình hiện tại (kể cả hạt phép) thành dataURL */
    snap() { const c = engine.current; if (c) engine.renderer.render(c.scene, c.camera); return engine.renderer.domElement.toDataURL('image/jpeg', 0.85); },
  };
}

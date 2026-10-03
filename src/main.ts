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
import { els, setStars, startSparkles, onTap } from './ui.ts';
import { initTalk } from './talk.ts';
import { seedMathCounter } from './challenge.ts';
import { installTabletGuards } from './tablet.ts';
import { FAMILY_KEYS } from './family.ts';
import type { RoomId } from './room/types.ts';

installTabletGuards();
initTalk();
const engine = new Engine(document.getElementById('app')!, els.fade);
engine.start();
// màn lỗi (tải model hỏng…): quay về sảnh thay vì kẹt
engine.onSceneError = () => void goHall();
const progress = loadProgress();
// cộng / trừ xen kẽ tiếp nối giữa các lần chơi (mỗi phòng đã cứu ≈ 1 bài toán)
seedMathCounter(progress.saved.length);
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
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    unlockAudio();
    els.start.classList.add('hide');
    setTimeout(() => (els.start.hidden = true), 520);
    // tải trước tối đa 8 s (mạng chậm vẫn vào được sảnh; clip thiếu thì tải lúc cần)
    void Promise.race([preload([...COMMON_KEYS, ...FAMILY_KEYS]), new Promise((r) => setTimeout(r, 8000))]).then(() => goHall());
  };
  onTap(els.startBtn, start);
  // iPad Safari: mở tiếng chắc ăn nhất trong touchend / click của chính nút này
  els.startBtn.addEventListener('click', start);
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

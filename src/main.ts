// Điều phối: chọn công chúa → phòng gương → tủ đồ 6 ô → thử thách → nhận đồ → hoá thân → làm phép.
import * as THREE from 'three';
import { PRINCESSES, WORDS, PALETTE, type PrincessDef, type ItemDef } from './data';
import { Room } from './room';
import { Avatar } from './avatar';
import { Challenge } from './challenge';
import { unlockAudio, preload, play, sfx, stopSpeech } from './audio';
import { els, showPick, hidePick, renderWardrobe, markSlot, setBusySlot, toast, confetti } from './ui';
import { tween, wait, easeInOutSine } from './tween';

const AUDIO_KEYS = [
  'intro', 'locked', 'wardrobe_hint', 'challenge_start', 'got_item', 'transform', 'tap_magic', 'all_done',
  'right', 'good', 'yay', 'retry', 'almost', 'hint_last', 'ask_count', 'ask_pick_number', 'ask_fill',
  'sfx_tap', 'sfx_pop', 'sfx_win', 'sfx_soft',
  ...['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'],
  ...['v', 'b', 'm', 'h', 't', 's', 'c', 'g', 'k', 'n', 'd', 'l'].map((l) => `l_${l}`),
  ...PRINCESSES.flatMap((p) => [p.pickAudio, p.magicAudio, ...p.items.map((i) => i.audio)]),
  ...WORDS.flatMap((w) => [`ask_${w.id}`, `name_${w.id}`, ...w.tokens.map((t) => t.audio)]),
];

interface Progress { owned: Record<string, string[]>; done: string[] }
function loadProgress(): Progress {
  try { const p = JSON.parse(localStorage.getItem('princess-progress') || ''); if (p && p.owned) return p; } catch { /* trống */ }
  return { owned: {}, done: [] };
}
function saveProgress(p: Progress): void { try { localStorage.setItem('princess-progress', JSON.stringify(p)); } catch { /* bỏ qua */ } }

async function boot(): Promise<void> {
  const room = new Room(document.getElementById('app')!);
  const avatar = new Avatar(room);
  const progress = loadProgress();
  let princess: PrincessDef | null = null;
  let busy = false;

  room.start((dt) => avatar.update(dt));
  await avatar.loadHero();
  void room.load('elsa_anim.glb');

  els.startBtn.classList.add('ready');
  els.startBtn.addEventListener('click', async () => {
    unlockAudio();
    els.start.classList.add('hide');
    setTimeout(() => (els.start.hidden = true), 500);
    await preload(AUDIO_KEYS);
    openPick();
  }, { once: true });

  function openPick(): void {
    showPick(progress.done, (id) => void pickPrincess(id));
    void play('intro');
  }

  async function pickPrincess(id: string): Promise<void> {
    const p = PRINCESSES.find((x) => x.id === id)!;
    if (!p.playable) { sfx('sfx_soft', 0.5); await play('locked'); return; }
    princess = p;
    hidePick();
    stopSpeech();
    await play(p.pickAudio);
    const owned = progress.owned[p.id] ?? [];
    renderWardrobe(p.items, owned, (it) => void openItem(it));
    // mặc lại đồ đã có
    for (const it of p.items) if (owned.includes(it.id)) await avatar.wear(it);
    if (owned.length >= p.items.length) {
      if (!avatar.transformed) await avatar.transform(p);
      els.magic.hidden = false;
      await play('tap_magic');
    } else {
      await play('wardrobe_hint');
    }
  }

  const challenge = new Challenge({ onWrong: () => sfx('sfx_soft', 0.4) }, [1, 6]);

  async function openItem(it: ItemDef): Promise<void> {
    if (!princess || busy) return;
    const owned = progress.owned[princess.id] ?? [];
    if (owned.includes(it.id)) { sfx('sfx_tap', 0.4); await play(it.audio); return; }
    busy = true;
    setBusySlot(it.id);
    room.spin = false;
    await challenge.run(it.challenge);
    // nhận đồ: sao xoáy trên đầu, món hiện ra
    const head = avatar.headWorld();
    room.magic.ring(new THREE.Vector3(head.x, 0.35, head.z), princess.magicColors[0], 90, 2.6, 0.55);
    room.magic.burst(head, 120, princess.magicColors[1], 2.2, 0.55, 1.4, -1.2);
    room.magic.burst(head, 60, 0xffb000, 1.8, 0.45, 1.2, -1.2);
    sfx('sfx_win', 0.5);
    void play('got_item');
    await avatar.wear(it);
    await play(it.audio);
    owned.push(it.id);
    progress.owned[princess.id] = owned;
    saveProgress(progress);
    markSlot(it.id, it.emoji);
    els.progress.textContent = `${owned.length}/${princess.items.length}`;
    confetti(30);
    setBusySlot(null);
    room.spin = true;
    if (owned.length >= princess.items.length) {
      await wait(500);
      await transformNow();
    } else {
      await avatar.celebrate();
    }
    busy = false;
  }

  async function transformNow(): Promise<void> {
    if (!princess) return;
    const center = room.pedestal.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0));
    // vòng sáng dâng lên + hạt xoáy che chuyển cảnh
    const spin = tween(2600, (k) => {
      for (let i = 0; i < 6; i++) {
        const a = k * Math.PI * 10 + i * (Math.PI / 3);
        room.magic.emit({ x: center.x + Math.cos(a) * 1.3, y: 0.3 + k * 2.6, z: center.z + Math.sin(a) * 1.3, color: i % 2 ? princess!.magicColors[0] : princess!.magicColors[1], vy: 0.8, max: 1.2, size: 0.6 });
      }
    }, easeInOutSine);
    void play('transform');
    await avatar.transform(princess);
    await spin;
    room.magic.burst(center, 260, 0x2f9df5, 3.5, 0.6, 1.8, -1.2);
    room.magic.burst(center, 140, 0x7c3aed, 2.6, 0.5, 1.6, -1.2);
    room.magic.burst(center, 80, 0xffffff, 2.0, 0.45, 1.4, -1.2);
    confetti(100);
    if (!progress.done.includes(princess.id)) progress.done.push(princess.id);
    saveProgress(progress);
    await play('all_done');
    els.magic.hidden = false;
    await play('tap_magic');
  }

  async function castMagic(): Promise<void> {
    if (!princess || busy || !avatar.transformed) return;
    busy = true;
    room.spin = false;
    void play(princess.magicAudio);
    const p = avatar.headWorld();
    const magicJob = avatar.castMagic(princess);
    // băng tuyết: nền sáng nên hạt phải to, đậm, sống lâu; bông tuyết rơi từ mép trên khung hình
    await wait(500);
    room.magic.ring(new THREE.Vector3(p.x, 0.35, p.z), 0x1e90ff, 140, 3.2, 0.7);
    room.magic.burst(new THREE.Vector3(p.x, p.y + 0.3, p.z), 220, 0x2f9df5, 3.2, 0.7, 2.2, -0.5);
    room.magic.burst(new THREE.Vector3(p.x, p.y + 0.3, p.z), 120, 0x7c3aed, 2.4, 0.6, 2.0, -0.5);
    room.magic.burst(new THREE.Vector3(p.x, p.y + 0.3, p.z), 80, 0xffffff, 1.6, 0.5, 1.6, -0.5);
    const flakes: THREE.Sprite[] = [];
    for (let i = 0; i < 30; i++) {
      const sp = room.emojiSprite('❄️', 0.34 + Math.random() * 0.34);
      sp.position.set(p.x + (Math.random() - 0.5) * 6, 2.6 + Math.random() * 1.4, p.z + (Math.random() - 0.5) * 3 + 0.5);
      sp.userData.phase = Math.random() * 6;
      sp.userData.speed = 0.012 + Math.random() * 0.012;
      room.scene.add(sp);
      flakes.push(sp);
    }
    // vòng 2: thêm tuyết sau 1.2 s cho dày
    setTimeout(() => {
      for (let i = 0; i < 20; i++) {
        const sp = room.emojiSprite('❄️', 0.3 + Math.random() * 0.3);
        sp.position.set(p.x + (Math.random() - 0.5) * 6, 3.0 + Math.random() * 0.8, p.z + (Math.random() - 0.5) * 3 + 0.5);
        sp.userData.phase = Math.random() * 6;
        sp.userData.speed = 0.012 + Math.random() * 0.012;
        room.scene.add(sp);
        flakes.push(sp);
      }
    }, 1200);
    await tween(3600, (k) => {
      for (const f of flakes) {
        f.position.y -= f.userData.speed;
        f.position.x += Math.sin(k * 8 + f.userData.phase) * 0.008;
        f.material.rotation += 0.01;
        f.material.opacity = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
      }
    });
    for (const f of flakes) room.scene.remove(f);
    await magicJob;
    room.spin = true;
    busy = false;
  }

  els.magic.addEventListener('click', () => void castMagic());
  els.back.addEventListener('click', () => { if (!busy) location.reload(); });

  if (import.meta.env.DEV) (window as any).__game = { room, avatar, progress, get princess() { return princess; }, get busy() { return busy; }, pickPrincess, openItem, castMagic };
}

void boot();

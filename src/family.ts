// GIA ĐÌNH NHÍM: ba Cường, mẹ Yến, bà Tuyết, ông Cương, bác Hanh cổ vũ bé. Bong bóng lớn trượt vào từ mép phải ~2.5 s
// (mặt tròn + "Ba Cường:" + câu nói) kèm giọng của chính người đó (ba, ông: giọng nam Nam Minh; mẹ, bà, bác: Hoài My).
// Chữ + giọng: FAMILY_TEXT trong src/lines.ts. Ảnh thật: thả public/family/<id>.jpg (hoặc .jpeg/.png/.webp) → tự thay emoji.
// Danh sách ảnh có sẵn lấy từ module ảo 'virtual:family-photos' (vite.config.ts quét thư mục) → không gọi thử file thiếu.
import photos from 'virtual:family-photos';
import { play, sfx } from './audio.ts';
import { wait } from './tween.ts';
import { FAMILY_TEXT, SPEAKER_INFO, famKey, type FamilyId } from './lines.ts';
import { speakerAvatar } from './talk.ts';

export type { FamilyId };

export interface FamilyMember { id: FamilyId; name: string; emoji: string; color: string }

const ORDER: FamilyId[] = ['ba-cuong', 'me-yen', 'ba-tuyet', 'ong-cuong', 'bac-hanh'];
export const FAMILY: FamilyMember[] = ORDER.map((id) => ({ id, ...SPEAKER_INFO[id] }));

/** Mọi audio key của gia đình (tải trước cùng COMMON_KEYS). */
export const FAMILY_KEYS = [...ORDER.flatMap((id) => [...FAMILY_TEXT[id].cheer.map((_, i) => famKey(id, i)), famKey(id, 'ball')]), 'fam_all'];

/** URL ảnh thật của 1 người (nếu ba mẹ đã thả ảnh vào public/family/), không thì null. */
export function photoUrl(id: FamilyId): string | null {
  const f = (photos as Record<string, string>)[id];
  return f ? `${import.meta.env.BASE_URL}family/${f}` : null;
}

// ------------------------------------------------------------------ bong bóng DOM
let box: HTMLElement | null = null;
function container(): HTMLElement {
  if (!box) {
    box = document.createElement('div');
    box.id = 'family';
    document.body.appendChild(box);
  }
  return box;
}

function card(m: FamilyMember, text: string, mini: boolean): HTMLElement {
  const c = document.createElement('div');
  c.className = 'fam-card' + (mini ? ' mini' : '');
  c.style.setProperty('--fam', m.color);
  c.appendChild(speakerAvatar(m.id, 'fam-ava'));
  const body = document.createElement('div');
  body.className = 'fam-body';
  const name = document.createElement('div');
  name.className = 'fam-name';
  name.textContent = `${m.name}:`;
  const say = document.createElement('div');
  say.className = 'fam-say';
  say.textContent = text;
  body.append(name, say);
  c.appendChild(body);
  container().appendChild(c);
  return c;
}

function dismiss(c: HTMLElement): void {
  c.classList.add('out');
  setTimeout(() => c.remove(), 450);
}

/** Túi xáo trộn: lần lượt đủ 5 người rồi mới lặp lại; mỗi người xoay vòng câu của mình (không lặp liền). */
let bag: FamilyMember[] = [];
function nextMember(): FamilyMember {
  if (!bag.length) bag = [...FAMILY].sort(() => Math.random() - 0.5);
  return bag.pop()!;
}
const lastLine = new Map<FamilyId, number>();
function pickLine(id: FamilyId): number {
  const n = FAMILY_TEXT[id].cheer.length;
  const last = lastLine.get(id) ?? -1;
  let i = Math.floor(Math.random() * n);
  if (i === last) i = (i + 1) % n;
  lastLine.set(id, i);
  return i;
}

let showing = false;
/** Đang có bong bóng gia đình trên màn. */
export function familyBusy(): boolean { return showing; }

/** 1 người nhà cổ vũ: bong bóng ~2.5 s + giọng. Resolve khi xong. Đang có bong bóng khác thì bỏ qua. */
export async function familyCheer(id?: FamilyId): Promise<void> {
  if (showing) return;
  showing = true;
  let c: HTMLElement | null = null;
  try {
    const m = id ? FAMILY.find((x) => x.id === id)! : nextMember();
    const i = pickLine(m.id);
    sfx('sfx_pop', 0.4);
    c = card(m, FAMILY_TEXT[m.id].cheer[i], false);
    await Promise.all([play(famKey(m.id, i)), wait(2500)]);
  } finally {
    if (c) dismiss(c);
    await wait(250);
    showing = false;
  }
}

/** Cả nhà lần lượt cổ vũ (dạ hội, đại dạ hội): bong bóng xếp chồng, đủ 5 người rồi cùng trượt ra. */
export async function familyCheerAll(alive: () => boolean = () => true): Promise<void> {
  if (showing) return;
  showing = true;
  const cards: HTMLElement[] = [];
  try {
    for (const m of FAMILY) {
      if (!alive()) break;
      sfx('sfx_pop', 0.4);
      cards.push(card(m, FAMILY_TEXT[m.id].ball, true));
      await Promise.all([play(famKey(m.id, 'ball')), wait(1300)]);
    }
    if (alive()) await play('fam_all');
    await wait(600);
  } finally {
    cards.forEach((c, i) => setTimeout(() => dismiss(c), i * 90));
    showing = false;
  }
}

/** Đổi màn: dọn bong bóng còn sót. */
export function clearFamily(): void {
  if (box) box.innerHTML = '';
  showing = false;
}

// Phụ đề có NHÃN NGƯỜI NÓI: khung trên cùng giữa màn (giữa nút 🏰 và 🔊) gồm mặt tròn (chân dung công chúa / ảnh thật
// người nhà / emoji) + "Elsa:" / "Ariel:" / "Bà Tuyết:" + câu đang đọc. Bé chưa biết đọc nhưng nhìn mặt biết ai đang nói;
// ba mẹ đọc được câu.
// Tự hiện theo giọng: audio.ts báo mỗi clip bắt đầu / kết thúc → tra src/lines.ts (lineInfo) → hiện / ẩn.
// Câu ghép từ nhiều clip (câu toán) thì gọi showSticky(text) cho cả chuỗi.
import photos from 'virtual:family-photos';
import { setVoiceHook } from './audio.ts';
import { lineInfo, SPEAKER_INFO, type Speaker } from './lines.ts';

/** Chân dung vẽ sẵn (scripts/render-portraits.mjs → src/assets/portraits/<speaker>.png). */
const PORTRAITS = import.meta.glob('./assets/portraits/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function portraitUrl(s: Speaker): string | null {
  const p = PORTRAITS[`./assets/portraits/${s}.png`];
  if (p) return p;
  const f = (photos as Record<string, string>)[s];
  return f ? `${import.meta.env.BASE_URL}family/${f}` : null;
}

/** Mặt tròn của người nói: ảnh (chân dung / ảnh thật) hoặc emoji. */
export function speakerAvatar(s: Speaker, cls: string): HTMLElement {
  const info = SPEAKER_INFO[s];
  const a = document.createElement('div');
  a.className = cls;
  a.style.borderColor = info.color;
  const url = portraitUrl(s);
  if (url) {
    const img = document.createElement('img');
    img.alt = info.name;
    img.src = url;
    img.draggable = false;
    img.onerror = () => { img.remove(); a.textContent = info.emoji; };
    a.appendChild(img);
  } else a.textContent = info.emoji;
  return a;
}

let box: HTMLElement | null = null;
function el(): HTMLElement {
  if (!box) {
    box = document.createElement('div');
    box.id = 'subtitle';
    box.hidden = true;
    document.body.appendChild(box);
  }
  return box;
}

interface Sub { text: string; speaker: Speaker }
let transient: Sub | null = null;
let sticky: Sub | null = null;
let shown: Sub | null = null;
let hideTimer = 0;

function render(): void {
  const want = transient ?? sticky;
  if (want === shown) return;
  shown = want;
  const s = el();
  if (!want) { s.classList.remove('in'); s.hidden = true; return; }
  const info = SPEAKER_INFO[want.speaker];
  s.innerHTML = '';
  s.style.setProperty('--sc', info.color);
  const body = document.createElement('div');
  body.className = 'sub-body';
  const name = document.createElement('b');
  name.textContent = `${info.name}:`;
  const t = document.createElement('span');
  t.textContent = want.text.replace(/[{}]/g, '');
  body.append(name, t);
  s.append(speakerAvatar(want.speaker, 'sub-ava'), body);
  s.hidden = false;
  s.classList.remove('in');
  void s.offsetWidth;
  s.classList.add('in');
}

/** Hiện 1 câu (không gắn với clip nào) tới khi hideSticky(); câu thoại có clip vẫn đè lên tạm thời. */
export function showSticky(text: string, speaker: Speaker = 'elsa'): void { sticky = { text, speaker }; render(); }
export function hideSticky(): void { sticky = null; render(); }
export function clearTalk(): void { transient = null; sticky = null; clearTimeout(hideTimer); render(); }

export function initTalk(): void {
  setVoiceHook((key, phase) => {
    // gia đình đã có bong bóng riêng (ảnh + tên + câu) → không lặp phụ đề
    if (key.startsWith('fam_') && key !== 'fam_all') return;
    const info = lineInfo(key);
    if (!info) return;
    if (phase === 'start') {
      clearTimeout(hideTimer);
      transient = { text: info.text, speaker: info.speaker };
      render();
    } else if (transient?.text === info.text) {
      // giữ thêm chút cho ba mẹ kịp đọc; câu kế tiếp tới thì thay ngay
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => { transient = null; render(); }, 900);
    }
  });
}

// UI DOM: màn chọn công chúa, tủ đồ 6 ô, bảng thử thách, nút phép, pháo giấy.
import { PRINCESSES, type ItemDef } from './data';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

export const els = {
  start: $('#start'),
  startBtn: $('#start-btn'),
  pick: $('#pick'),
  pickCards: $('#pick-cards'),
  hud: $('#hud'),
  progress: $('#progress'),
  back: $<HTMLButtonElement>('#back'),
  wardrobe: $('#wardrobe'),
  magic: $<HTMLButtonElement>('#magic'),
  panel: $('#panel'),
  repeat: $<HTMLButtonElement>('#repeat'),
  word: $('#word'),
  wordEmoji: $('#word-emoji'),
  counter: $('#counter'),
  gemrow: $('#gemrow'),
  options: $('#options'),
  toast: $('#toast'),
  confetti: $('#confetti'),
};

export function showPick(done: string[], onPick: (id: string) => void): void {
  els.pickCards.innerHTML = '';
  for (const p of PRINCESSES) {
    const b = document.createElement('button');
    b.className = 'card' + (p.playable ? '' : ' locked') + (done.includes(p.id) ? ' done' : '');
    b.innerHTML = `<span class="card-emoji">${p.emoji}</span><span class="card-name">${p.name}</span>`;
    b.addEventListener('click', () => onPick(p.id));
    els.pickCards.appendChild(b);
  }
  els.pick.hidden = false;
  els.pick.classList.remove('hide');
  els.hud.hidden = true;
  els.wardrobe.hidden = true;
  els.magic.hidden = true;
}
export function hidePick(): void {
  els.pick.classList.add('hide');
  setTimeout(() => (els.pick.hidden = true), 450);
}

/** Tủ đồ: ô đã mở hiện emoji món, chưa mở là ❓; ô đang mở nhấp nháy. */
export function renderWardrobe(items: ItemDef[], owned: string[], onTap: (item: ItemDef) => void): void {
  els.wardrobe.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    const has = owned.includes(it.id);
    b.className = 'slot' + (has ? ' owned' : '');
    b.textContent = has ? it.emoji : '❓';
    b.dataset.id = it.id;
    b.addEventListener('click', () => onTap(it));
    els.wardrobe.appendChild(b);
  }
  els.wardrobe.hidden = false;
  els.hud.hidden = false;
  els.progress.textContent = `${owned.length}/${items.length}`;
}
export function markSlot(id: string, emoji: string): void {
  const b = els.wardrobe.querySelector<HTMLButtonElement>(`[data-id="${id}"]`);
  if (b) { b.textContent = emoji; b.classList.add('owned', 'pop'); }
}
export function setBusySlot(id: string | null): void {
  els.wardrobe.querySelectorAll('.slot').forEach((s) => s.classList.toggle('busy', (s as HTMLElement).dataset.id === id));
}

export function showPanel(v: boolean): void {
  els.panel.hidden = !v;
  if (!v) {
    hideWord();
    setCounter(null);
    clearOptions();
    els.gemrow.hidden = true;
    els.gemrow.innerHTML = '';
    els.wordEmoji.hidden = true;
  }
}

/** Hiện từ; `lit` tô cam; `whole` tô xanh cả từ; `blank` = chỉ số chữ bị che thành ô trống. */
export function showWord(word: string, lit: number[] = [], whole = false, blank = -1): void {
  const w = els.word;
  w.hidden = false;
  w.innerHTML = '';
  Array.from(word).forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = i === blank ? '_' : ch;
    s.className = (lit.includes(i) ? 'lit' : '') + (i === blank ? ' blank' : '');
    w.appendChild(s);
  });
  w.classList.toggle('whole', whole);
}
export function hideWord(): void { els.word.hidden = true; els.word.classList.remove('whole'); }

export function setCounter(n: number | null): void {
  if (n === null) { els.counter.hidden = true; return; }
  els.counter.hidden = false;
  els.counter.textContent = String(n);
  els.counter.classList.remove('bump');
  void els.counter.offsetWidth;
  els.counter.classList.add('bump');
}

export interface Option { label: string; value: string }
export function showOptions(items: Option[], onPick: (value: string, btn: HTMLButtonElement) => void): HTMLButtonElement[] {
  clearOptions();
  return items.map((it) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.textContent = it.label;
    b.dataset.value = it.value;
    b.addEventListener('click', () => onPick(it.value, b));
    els.options.appendChild(b);
    return b;
  });
}
export function clearOptions(): void { els.options.innerHTML = ''; }

export function showGemRow(n: number, onTap: (btn: HTMLButtonElement, index: number) => void): void {
  els.gemrow.innerHTML = '';
  els.gemrow.hidden = false;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.className = 'gem';
    b.textContent = '💎';
    b.addEventListener('click', () => onTap(b, i));
    els.gemrow.appendChild(b);
  }
}

export function wobbleEl(el: HTMLElement): void {
  el.classList.remove('wobble');
  void el.offsetWidth;
  el.classList.add('wobble');
}

let toastTimer = 0;
export function toast(text: string, ms = 1400): void {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), ms);
}

const CONFETTI_COLORS = ['#a7e8ff', '#ff7ac8', '#ffd166', '#c084fc', '#ffffff', '#7fd8ff'];
export function confetti(count = 60): void {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    els.confetti.appendChild(p);
    setTimeout(() => p.remove(), 2600);
  }
}

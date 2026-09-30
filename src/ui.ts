// UI DOM: HUD, bảng thử thách, nút lớn, băng rôn tên phòng, pháo giấy, lớp băng mép màn.
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

export const els = {
  start: $('#start'),
  startBtn: $<HTMLButtonElement>('#start-btn'),
  hud: $('#hud'),
  home: $<HTMLButtonElement>('#home'),
  say: $<HTMLButtonElement>('#say'),
  stars: $('#stars'),
  banner: $('#banner'),
  frost: $('#frost'),
  panel: $('#panel'),
  repeat: $<HTMLButtonElement>('#repeat'),
  word: $('#word'),
  wordEmoji: $('#word-emoji'),
  counter: $('#counter'),
  gemrow: $('#gemrow'),
  options: $('#options'),
  actions: $('#actions'),
  btnHall: $<HTMLButtonElement>('#btn-hall'),
  btnAgain: $<HTMLButtonElement>('#btn-again'),
  toast: $('#toast'),
  confetti: $('#confetti'),
  fade: $('#fade'),
  debug: $('#debug'),
};

export function setStars(n: number, total: number, bump = false): void {
  els.stars.textContent = `⭐ ${n}/${total}`;
  if (bump) { els.stars.classList.remove('bump'); void els.stars.offsetWidth; els.stars.classList.add('bump'); }
}

/** HUD: home = hiện nút về sảnh (trong phòng). */
export function showHud(home: boolean): void {
  els.hud.hidden = false;
  els.home.style.visibility = home ? 'visible' : 'hidden';
}

let bannerTimer = 0;
export function banner(text: string, ms = 2600): void {
  els.banner.textContent = text;
  els.banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => els.banner.classList.remove('show'), ms);
}

/** Lớp băng mép màn (0..1). */
export function setFrost(k: number): void { els.frost.style.opacity = String(Math.max(0, Math.min(1, k))); }

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
    s.textContent = i === blank ? '?' : ch;
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

export function showGemRow(n: number, emoji: string, onTap: (btn: HTMLButtonElement, index: number) => void): void {
  els.gemrow.innerHTML = '';
  els.gemrow.hidden = false;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.className = 'gem';
    b.textContent = emoji;
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

/** Nút lớn cuối phòng. */
export function showActions(hall: boolean, again: boolean): void {
  els.actions.hidden = !(hall || again);
  els.btnHall.hidden = !hall;
  els.btnAgain.hidden = !again;
}

const CONFETTI_COLORS = ['#7fd8ff', '#ff5fb4', '#ffc233', '#a78bfa', '#ffffff', '#58cc02', '#ff8a3d'];
export function confetti(count = 60, colors = CONFETTI_COLORS): void {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.animationDuration = `${1.5 + Math.random() * 1}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    els.confetti.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

/** Sao lấp lánh trang trí màn bắt đầu. */
export function startSparkles(): void {
  const box = els.start.querySelector('.sparkles')!;
  const icons = ['✨', '❄️', '⭐', '💎', '👑', '🌸'];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('i');
    s.textContent = icons[i % icons.length];
    s.style.left = `${Math.random() * 96}%`;
    s.style.top = `${Math.random() * 92}%`;
    s.style.fontSize = `${22 + Math.random() * 30}px`;
    s.style.animationDelay = `${Math.random() * 2.4}s`;
    box.appendChild(s);
  }
}

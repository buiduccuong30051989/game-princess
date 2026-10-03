// UI DOM: HUD, bảng thử thách, nút lớn, băng rôn tên phòng, pháo giấy, lớp băng mép màn, hàng phép tính toán.
// Mọi nút dùng onTap (pointer events, không phụ thuộc hover / click trễ của iPad).
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
  math: $('#math'),
  mathEq: $('#math-eq'),
  options: $('#options'),
  actions: $('#actions'),
  btnHall: $<HTMLButtonElement>('#btn-hall'),
  btnAgain: $<HTMLButtonElement>('#btn-again'),
  toast: $('#toast'),
  confetti: $('#confetti'),
  fade: $('#fade'),
  debug: $('#debug'),
};

/**
 * Chạm (pointer events): kích hoạt khi NHẤC ngón tay trên chính phần tử (ngón trượt ra ngoài thì thôi).
 * Không dùng 'click' (iPad có thể trễ / nuốt khi đang cuộn) và không có gì phụ thuộc hover. Trả hàm gỡ.
 */
export function onTap(el: HTMLElement, fn: (e: PointerEvent) => void): () => void {
  let downId: number | null = null;
  const down = (e: PointerEvent) => { if (e.isPrimary !== false) downId = e.pointerId; };
  const up = (e: PointerEvent) => {
    if (downId !== e.pointerId) return;
    downId = null;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left - 8 || e.clientX > r.right + 8 || e.clientY < r.top - 8 || e.clientY > r.bottom + 8) return;
    fn(e);
  };
  const cancel = () => { downId = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', cancel);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
}

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
    clearOptions();
    hideMath();
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

export interface Option { label: string; value: string }
let optUnbind: (() => void)[] = [];
export function showOptions(items: Option[], onPick: (value: string, btn: HTMLButtonElement) => void, cls = ''): HTMLButtonElement[] {
  clearOptions();
  return items.map((it) => {
    const b = document.createElement('button');
    b.className = `opt ${cls}`.trim();
    b.textContent = it.label;
    b.dataset.value = it.value;
    optUnbind.push(onTap(b, () => onPick(it.value, b)));
    els.options.appendChild(b);
    return b;
  });
}
export function clearOptions(): void { optUnbind.forEach((f) => f()); optUnbind = []; els.options.innerHTML = ''; }

// ------------------------------------------------------------------ hàng phép tính (toán)
export interface MathView {
  /** vật chạy "đếm cùng" khi bé chọn sai (theo thứ tự đếm 1..N) */
  countItems: HTMLElement[];
  /** ô "?" trong phép tính */
  q: HTMLElement;
}

function item(emoji: string, cls = ''): HTMLElement {
  const s = document.createElement('span');
  s.className = `mitem ${cls}`.trim();
  s.textContent = emoji;
  return s;
}
function group(children: HTMLElement[], cls = ''): HTMLElement {
  const g = document.createElement('div');
  g.className = `mgroup ${cls}`.trim();
  g.append(...children);
  return g;
}
function op(t: string): HTMLElement { const o = document.createElement('span'); o.className = 'mop'; o.textContent = t; return o; }

/**
 * Dựng phép tính bằng đồ vật + chữ số:
 *   cộng  🔷🔷🔷 + 🔷🔷 = ?      (dòng dưới: 3 + 2 = ?)
 *   trừ   🔷🔷🔷🔷🔷 🔷̶🔷̶       (2 vật cuối bay đi / gạch chéo; dòng dưới: 7 − 2 = ?)
 *   thiếu 🔷🔷🔷 + ❓ = 🔷🔷🔷🔷🔷  (dòng dưới: 3 + ? = 5; sai thì hiện 2 vật mờ còn thiếu và đếm)
 */
export function showMath(p: { op: 'add' | 'sub' | 'miss'; a: number; b: number; c: number }, emoji: string, away: string): MathView {
  const m = els.math;
  m.innerHTML = '';
  m.hidden = false;
  const objs = document.createElement('div');
  objs.className = 'mobjs';
  const eq = els.mathEq;
  eq.innerHTML = '';
  eq.hidden = false;
  const q = document.createElement('span');
  q.className = 'mq';
  q.textContent = '?';
  const num = (n: number | string) => { const s = document.createElement('span'); s.className = 'mnum'; s.textContent = String(n); return s; };
  let countItems: HTMLElement[] = [];
  if (p.op === 'add') {
    const A = Array.from({ length: p.a }, () => item(emoji));
    const B = Array.from({ length: p.b }, () => item(emoji, 'new'));
    objs.append(group(A), op('+'), group(B, 'gb'));
    eq.append(num(p.a), op('+'), num(p.b), op('='), q);
    countItems = [...A, ...B];
  } else if (p.op === 'sub') {
    const keep = Array.from({ length: p.c }, () => item(emoji));
    const gone = Array.from({ length: p.b }, () => item(emoji, `gone away-${away}`));
    objs.append(group([...keep, ...gone]));
    eq.append(num(p.a), op('−'), num(p.b), op('='), q);
    countItems = keep;
  } else {
    const A = Array.from({ length: p.a }, () => item(emoji));
    const ghosts = Array.from({ length: p.b }, () => item(emoji, 'ghost'));
    const C = Array.from({ length: p.c }, () => item(emoji, 'small'));
    const bag = document.createElement('span');
    bag.className = 'mitem bag';
    bag.textContent = '❓';
    objs.append(group(A), op('+'), group([bag, ...ghosts], 'gb'), op('='), group(C, 'gc'));
    eq.append(num(p.a), op('+'), q, op('='), num(p.c));
    countItems = ghosts;
  }
  m.append(objs);
  return { countItems, q };
}
/** Trừ: các vật bị bớt bay / rơi / tan đi (gọi sau khi đọc tới câu "… mất rồi"). */
export function mathTakeAway(): void { els.math.querySelectorAll('.mitem.gone').forEach((e) => e.classList.add('went')); }
/** Thiếu số: hiện các vật mờ còn thiếu (lúc đếm cùng). */
export function mathShowGhosts(): void {
  els.math.querySelector('.bag')?.classList.add('open');
  els.math.querySelectorAll('.mitem.ghost').forEach((e) => e.classList.add('shown'));
}
/** 1 vật nảy lên + số đếm trên đầu. */
export function hopItem(el: HTMLElement, n: number): void {
  el.dataset.n = String(n);
  el.classList.remove('hop');
  void el.offsetWidth;
  el.classList.add('hop', 'counted');
}
export function clearCounted(): void { els.math.querySelectorAll('.mitem.counted').forEach((e) => { e.classList.remove('counted', 'hop'); delete (e as HTMLElement).dataset.n; }); }
export function hideMath(): void { els.math.hidden = true; els.math.innerHTML = ''; els.mathEq.hidden = true; els.mathEq.innerHTML = ''; }

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

// Thử thách (DOM): spell = nghe – chọn hình, fill = điền chữ thiếu, math = cộng trừ trong 10 (đồ vật + chữ số).
// Không có thua: sai lần 1 bỏ đáp án vừa chọn (toán: các vật nảy lên đếm 1..N cùng Elsa), sai lần 2 đáp án đúng nhấp nháy.
// run() trả false nếu bị huỷ giữa chừng (bé bấm về sảnh).
//
// KHÔNG BAO GIỜ KẸT (bài học từ game 5: chạm đúng lúc đang đọc "chưa đúng" bị nuốt → đơ):
//  - chạm ĐÚNG luôn được nhận ngay, kể cả lúc đang đọc / đang đếm cùng (cắt tiếng, huỷ phần đếm);
//  - khoá chống bấm sai liên tục nhả trong finally;
//  - watchdog mỗi giây: khoá giữ > 15 s, hoặc không còn nút nào chạm được → nhả khoá, hiện lại nút, hỏi lại;
//  - ngồi im: nhắc sau 20 s, rồi giãn 40 s, 80 s (đỡ "nhai" câu hỏi).
import { play, sfx, speakSequence, stopSpeech, audioActivity, withTimeout } from './audio.ts';
import {
  els, showPanel, showWord, showOptions, wobbleEl, hideWord, showMath, mathTakeAway, mathShowGhosts, hopItem, clearCounted,
  onTap, type MathView,
} from './ui.ts';
import { wait } from './tween.ts';
import { bankKeyPick } from './voice.ts';
import { showSticky, hideSticky } from './talk.ts';
import {
  MATH_THEMES, makeProblem, mathAnswer, mathAsk, mathAskShort, mathOptions, mathSolved, numKey, themeKey, type MathProblem,
} from './math.ts';
import { lineInfo } from './lines.ts';
import type { WordEntry } from './room/words.ts';
import type { ChallengeKind } from './room/types.ts';

/** nhắc khi ngồi im: lần 1 sau 20 s, rồi 40 s, 80 s, 80 s… */
const IDLE_STEPS = [20000, 40000, 80000];
const WATCHDOG_MS = 15000;

export interface ChallengeHooks {
  /** bé chọn sai (Elsa suy nghĩ) */
  onWrong(): void;
}
export interface MathSetup {
  /** vị trí phòng trong thứ tự mở cửa (độ khó: 4 phòng đầu ≤ 5, sau ≤ 10, 3 phòng cuối thêm "3 + ? = 5") */
  roomIndex: number;
  /** chủ đề toán của phòng (src/math.ts MATH_THEMES) */
  theme: string;
}

/** Số bài toán đã ra trong phiên (cộng / trừ xen kẽ liên tục giữa các phòng). */
let mathCounter = 0;
export function seedMathCounter(n: number): void { mathCounter = n; }

class Aborted extends Error {}

export class Challenge {
  private used = new Set<string>();
  private repeatFn: (() => void) | null = null;
  /** đáp án đúng của câu đang hỏi (data-value của nút) – cho test / soát; null khi không chờ chọn */
  current: string | null = null;
  /** bài đang chờ bé chọn (test play-human đọc) */
  waiting: ChallengeKind | null = null;
  /** bài toán đang hỏi (test đọc) */
  problem: MathProblem | null = null;
  private aborted = false;
  private skipResolve: (() => void) | null = null;
  private idleTimer = 0;
  private idleStep = 0;
  private idleFn: (() => void) | null = null;
  private watchdog = 0;
  private lastInput = performance.now();
  private unbindRepeat: () => void;
  private readonly words: WordEntry[];
  private readonly math: MathSetup;
  private readonly hooks: ChallengeHooks;
  /** watchdog gọi: nhả khoá + hiện lại nút + hỏi lại (đặt bởi pickLoop đang chạy) */
  private rescue: (() => void) | null = null;

  constructor(words: WordEntry[], math: MathSetup, hooks: ChallengeHooks) {
    this.words = words;
    this.math = math;
    this.hooks = hooks;
    this.unbindRepeat = onTap(els.repeat, () => { this.kickIdle(); this.repeatFn?.(); });
  }

  /** Nút 🔊 ngoài bảng gọi được: lặp lại câu hỏi hiện tại. */
  repeat(): boolean { if (!this.repeatFn) return false; this.kickIdle(); this.repeatFn(); return true; }

  private ck(): void { if (this.aborted) throw new Aborted(); }
  private async say(key: string): Promise<void> { this.ck(); await play(key); this.ck(); }

  async run(kind: ChallengeKind, introKey?: string): Promise<boolean> {
    if (this.aborted) return false;
    const skip = new Promise<'skip'>((r) => { this.skipResolve = () => r('skip'); });
    try {
      if (introKey) await this.say(introKey);
      showPanel(true);
      const body = kind === 'spell' ? this.spell() : kind === 'fill' ? this.fill() : this.mathRound();
      body.catch(() => { /* huỷ: nuốt lỗi */ });
      const res = await Promise.race([body, skip]);
      if (res === 'skip') { stopSpeech(); sfx('sfx_win', 0.5); }
      this.ck();
      await wait(250);
      return !this.aborted;
    } catch (e) {
      if (e instanceof Aborted) return false;
      throw e;
    } finally {
      this.skipResolve = null;
      this.repeatFn = null;
      this.rescue = null;
      this.waiting = null;
      this.current = null;
      this.problem = null;
      this.setIdle(null);
      this.stopWatchdog();
      hideSticky();
      showPanel(false);
    }
  }

  /** Debug: coi như trả lời đúng bài hiện tại. */
  skip(): void { this.skipResolve?.(); }

  abort(): void {
    this.aborted = true;
    this.setIdle(null);
    this.stopWatchdog();
    stopSpeech();
    this.skipResolve?.();
    hideSticky();
    showPanel(false);
  }

  dispose(): void {
    this.abort();
    this.unbindRepeat();
  }

  // ------------------------------------------------------------------ nhắc khi ngồi im (giãn dần)
  private setIdle(fn: (() => void) | null): void {
    this.idleFn = fn;
    this.idleStep = 0;
    this.armIdle();
  }
  /** Bé vừa chạm: đếm lại từ mốc 20 s. */
  private kickIdle(): void {
    this.lastInput = performance.now();
    this.idleStep = 0;
    this.armIdle();
  }
  private armIdle(): void {
    clearTimeout(this.idleTimer);
    if (!this.idleFn || this.aborted) return;
    const ms = IDLE_STEPS[Math.min(this.idleStep, IDLE_STEPS.length - 1)];
    this.idleTimer = window.setTimeout(() => { this.idleStep++; this.idleFn?.(); this.armIdle(); }, ms);
  }

  // ------------------------------------------------------------------ watchdog
  private startWatchdog(isLocked: () => number): void {
    this.stopWatchdog();
    this.watchdog = window.setInterval(() => {
      if (this.aborted || !this.rescue) return;
      const now = performance.now();
      const lockedFor = isLocked();
      const live = [...els.options.querySelectorAll<HTMLButtonElement>('.opt:not(.gone)')];
      const panelGone = els.panel.hidden;
      const quiet = now - audioActivity() > WATCHDOG_MS && now - this.lastInput > WATCHDOG_MS;
      if (lockedFor > WATCHDOG_MS || !live.length || panelGone || (quiet && lockedFor > 0)) {
        console.warn(`[challenge] watchdog: khoá ${Math.round(lockedFor)} ms, ${live.length} nút, panel ${panelGone ? 'ẩn' : 'hiện'} → nhả + hỏi lại`);
        this.lastInput = now;
        this.rescue();
      }
    }, 1000);
  }
  private stopWatchdog(): void { clearInterval(this.watchdog); this.watchdog = 0; }

  private pickWord(filter?: (w: WordEntry) => boolean): WordEntry {
    const all = this.words.filter(filter ?? (() => true));
    const fresh = all.filter((w) => !this.used.has(w.id));
    const pool = fresh.length ? fresh : all;
    const w = pool[Math.floor(Math.random() * pool.length)];
    this.used.add(w.id);
    return w;
  }

  /**
   * Vòng chọn đáp án. Đúng → tô xanh, xong. Sai → `wrongFeedback(lần sai, giá trị)`; lần 2 trở đi đáp án đúng nhấp nháy.
   * Chạm ĐÚNG luôn được nhận ngay (cắt tiếng + huỷ phần phản hồi sai đang chạy). Chạm sai trong lúc đang phản hồi sai
   * thì bỏ qua (không khoá cứng: watchdog nhả nếu kẹt).
   */
  private pickLoop(
    kind: ChallengeKind,
    items: { label: string; value: string; audio?: string }[],
    target: string,
    ask: () => Promise<unknown>,
    wrongFeedback: (wrong: number, value: string, cancelled: () => boolean) => Promise<void>,
    cls = '',
  ): Promise<void> {
    let wrong = 0;
    let busySince = 0;
    let solved = false;
    let feedbackToken = 0;
    this.repeatFn = () => { if (!busySince) void ask(); };
    this.current = target;
    this.waiting = kind;
    const goneValues = new Set<string>();
    return new Promise((resolve) => {
      const onPick = (value: string, btn: HTMLButtonElement) => {
        if (this.aborted || solved) return;
        this.kickIdle();
        if (value !== target) {
          if (busySince) { wobbleEl(btn); return; }
          wrong++;
          busySince = performance.now();
          const my = ++feedbackToken;
          sfx('sfx_soft', 0.5);
          wobbleEl(btn);
          btn.classList.add('gone');
          goneValues.add(value);
          this.hooks.onWrong();
          if (wrong >= 2) buttons.find((b) => b.dataset.value === target)?.classList.add('hint');
          void (async () => {
            try {
              await withTimeout(wrongFeedback(wrong, value, () => my !== feedbackToken || solved || this.aborted), 14000);
            } catch { /* phản hồi lỗi: bỏ qua */ } finally {
              if (my === feedbackToken) busySince = 0;
            }
          })();
          return;
        }
        solved = true;
        feedbackToken++;
        busySince = 0;
        this.setIdle(null);
        stopSpeech();
        buttons.forEach((b) => { b.classList.remove('hint'); if (b !== btn) b.classList.add('gone'); });
        btn.classList.add('correct');
        sfx('sfx_win', 0.5);
        this.current = null;
        this.waiting = null;
        this.rescue = null;
        this.stopWatchdog();
        resolve();
      };
      /** dựng (lại) các nút, giữ trạng thái đã bỏ / gợi ý */
      const build = () => {
        const bs = showOptions(items, onPick, cls);
        for (const b of bs) {
          if (goneValues.has(b.dataset.value!)) b.classList.add('gone');
          if (wrong >= 2 && b.dataset.value === target) b.classList.add('hint');
        }
        return bs;
      };
      let buttons = build();
      // ngồi im lâu: 1 câu nhắc ngắn + hỏi lại + nhún các nút còn lại (20 s, 40 s, 80 s…)
      this.setIdle(() => {
        if (busySince || solved) return;
        void speakSequence([bankKeyPick('idle')], undefined, 150).then((ok) => { if (ok && !solved && !busySince) void ask(); });
        buttons.forEach((b) => { if (!b.classList.contains('gone')) wobbleEl(b); });
      });
      // watchdog: nhả khoá, hiện lại nút (giữ đáp án đúng + ít nhất 1 nút), hỏi lại
      this.rescue = () => {
        if (solved) return;
        feedbackToken++;
        busySince = 0;
        stopSpeech();
        els.panel.hidden = false;
        if (!buttons[0]?.isConnected) buttons = build();
        const right = buttons.find((b) => b.dataset.value === target);
        if (right) { right.classList.remove('gone'); if (wrong >= 2) right.classList.add('hint'); }
        void ask();
      };
      this.startWatchdog(() => (busySince ? performance.now() - busySince : 0));
      void ask();
    });
  }

  /** Phản hồi sai mặc định (chọn hình / chữ): đọc âm của cái vừa chạm → "thử lại" + hỏi lại, lần 2: gợi ý nhấp nháy. */
  private simpleWrong(items: { value: string; audio?: string }[], askKeys: string[]) {
    return async (wrong: number, value: string): Promise<void> => {
      const said = items.find((it) => it.value === value)?.audio;
      const pre = said ? [said] : [];
      if (wrong === 1) await speakSequence([...pre, bankKeyPick('retry'), ...askKeys], undefined, 150);
      else await speakSequence([...pre, bankKeyPick('hint')], undefined, 150);
    };
  }

  /** A1: nghe "Con nào là …?" → 3 hình. Đúng thì đánh vần. */
  private async spell(): Promise<void> {
    const target = this.pickWord();
    const others = this.words.filter((w) => w.id !== target.id && w.emoji !== target.emoji).sort(() => Math.random() - 0.5).slice(0, 2);
    const items = [target, ...others].sort(() => Math.random() - 0.5).map((w) => ({ label: w.emoji, value: w.id, audio: w.nameKey }));
    showSticky(target.askText);
    await this.pickLoop('spell', items, target.id, () => speakSequence([target.askKey], undefined, 150), this.simpleWrong(items, [target.askKey]));
    await this.say(bankKeyPick('right'));
    await this.spellOut(target);
  }

  /** A2: hình + chữ có ô trống → 3 nút chữ cái (chạm nhầm thì nghe tên chữ vừa chạm: bờ, cờ…). */
  private async fill(): Promise<void> {
    const target = this.pickWord((w) => !!w.fill);
    const f = target.fill!;
    const correct = Array.from(target.word)[f.index];
    const letters = [correct, ...f.distractors].sort(() => Math.random() - 0.5);
    showWord(target.word, [], false, f.index);
    els.wordEmoji.textContent = target.emoji;
    els.wordEmoji.hidden = false;
    const items = letters.map((l) => ({ label: l, value: l, audio: f.letterKeys[l] }));
    const askKeys = [target.nameKey, 'ask_fill'];
    showSticky(`${target.name}… ${lineInfo('ask_fill')?.text ?? ''}`);
    await this.pickLoop('fill', items, correct, () => speakSequence(askKeys, undefined, 150), this.simpleWrong(items, askKeys), 'letter');
    els.wordEmoji.hidden = true;
    showWord(target.word, [f.index], false);
    await this.say(bankKeyPick('right'));
    await this.spellOut(target);
  }

  private async spellOut(w: WordEntry): Promise<void> {
    this.ck();
    hideSticky();
    const all = Array.from(w.word).map((_, i) => i);
    els.wordEmoji.textContent = w.emoji;
    els.wordEmoji.hidden = false;
    showWord(w.word, all, true);
    // đang đánh vần: 🔊 không làm gì (chạy spellOut thứ 2 sẽ chồng tiếng + ẩn chữ giữa chừng)
    this.repeatFn = () => {};
    const ok = await speakSequence([w.nameKey, ...w.tokens.map((t) => t.audio)], (i) => {
      if (i === 0) showWord(w.word, all, true);
      else showWord(w.word, w.tokens[i - 1].lit, false);
    });
    this.ck();
    if (ok) showWord(w.word, all, true);
    await wait(600);
    hideWord();
  }

  // ------------------------------------------------------------------ toán
  /** B: bài toán cộng / trừ / thiếu số bằng đồ vật của phòng (xen kẽ bông tuyết, ngọc của Elsa). */
  private async mathRound(): Promise<void> {
    const n = mathCounter++;
    const theme = n % 3 === 2 ? (n % 2 ? 'snow' : 'gem') : this.math.theme in MATH_THEMES ? this.math.theme : 'snow';
    const p = makeProblem(this.math.roomIndex, n, theme);
    const t = MATH_THEMES[theme as keyof typeof MATH_THEMES];
    this.problem = p;
    const answer = mathAnswer(p);
    const view: MathView = showMath(p, t.emoji, t.away);
    const ask = mathAsk(p);
    showSticky(ask.text);
    const subAt = ask.keys.indexOf(themeKey(theme, 'subEnd'));
    const full = () => speakSequence(ask.keys, (i) => { if (i === subAt) { mathTakeAway(); sfx('sfx_whoosh', 0.4); } }, 60);
    const short = () => speakSequence(mathAskShort(p), undefined, 60);
    // lần đầu đọc cả câu chuyện, hỏi lại (🔊 / nhắc / watchdog) thì đọc câu hỏi + phép tính
    let first = true;
    const askFn = () => { const f = first; first = false; if (p.op === 'sub') mathTakeAway(); return f ? full() : short(); };
    const items = mathOptions(answer, this.math.roomIndex).map((v) => ({ label: String(v), value: String(v), audio: numKey(v) }));
    await this.pickLoop('math', items, String(answer), askFn, (wrong, _value, cancelled) => this.countAlong(view, p, wrong, cancelled), 'num');
    // đúng: ô ? hiện số, đọc cả phép tính
    view.q.textContent = String(answer);
    view.q.classList.add('solved');
    if (p.op === 'miss') mathShowGhosts();
    showSticky(p.op === 'sub' ? `${p.a} − ${p.b} = ${p.c}` : `${p.a} + ${p.b} = ${p.c}`);
    await speakSequence([...mathSolved(p), bankKeyPick('right')], undefined, 80);
    this.ck();
    await wait(400);
  }

  /** Sai: "Mình cùng đếm nhé!" → các vật còn lại nảy lên lần lượt, đọc 1..N → "Nhím chọn lại nhé" (lần 2: gợi ý). */
  private async countAlong(view: MathView, p: MathProblem, wrong: number, cancelled: () => boolean): Promise<void> {
    if (p.op === 'miss') mathShowGhosts();
    clearCounted();
    await play(bankKeyPick('math_count'));
    for (let i = 0; i < view.countItems.length; i++) {
      if (cancelled()) return;
      hopItem(view.countItems[i], i + 1);
      sfx('sfx_hop', 0.35);
      await play(numKey(i + 1));
      await wait(120);
    }
    if (cancelled()) return;
    await play(bankKeyPick(wrong >= 2 ? 'hint' : 'math_retry'));
  }
}

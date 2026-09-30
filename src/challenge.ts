// Thử thách (DOM): A1 nghe – chọn hình, A2 điền chữ thiếu, B1 đếm – chọn số.
// Không có thua: sai lần 1 bỏ 1 đáp án, sai lần 2 đáp án đúng nhấp nháy. Luôn kết thúc thành công.
// run() trả false nếu bị huỷ giữa chừng (bé bấm về sảnh).
import { play, sfx, speakSequence, stopSpeech } from './audio.ts';
import { els, showPanel, showWord, showOptions, showGemRow, setCounter, wobbleEl, hideWord } from './ui.ts';
import { wait } from './tween.ts';
import type { WordEntry } from './room/words.ts';
import type { ChallengeKind } from './room/types.ts';

export const NUMBER_AUDIO = ['', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'];

export interface ChallengeHooks {
  /** bé chọn sai (Elsa suy nghĩ) */
  onWrong(): void;
}

class Aborted extends Error {}

export class Challenge {
  private used = new Set<string>();
  private repeatFn: (() => void) | null = null;
  /** đáp án đúng của câu đang hỏi (data-value của nút) – chỉ để test/soát, null khi không có câu chọn */
  current: string | null = null;
  private aborted = false;
  private skipResolve: (() => void) | null = null;
  private readonly onRepeat = () => this.repeatFn?.();
  private readonly words: WordEntry[];
  private readonly count: { emoji: string; audio: string; range: [number, number] };
  private readonly hooks: ChallengeHooks;

  constructor(words: WordEntry[], count: { emoji: string; audio: string; range?: [number, number] }, hooks: ChallengeHooks) {
    this.words = words;
    this.count = { emoji: count.emoji, audio: count.audio, range: count.range ?? [3, 7] };
    this.hooks = hooks;
    els.repeat.addEventListener('click', this.onRepeat);
  }

  /** Nút 🔊 ngoài bảng gọi được: lặp lại câu hỏi hiện tại. */
  repeat(): boolean { if (!this.repeatFn) return false; this.repeatFn(); return true; }

  private ck(): void { if (this.aborted) throw new Aborted(); }
  private async say(key: string): Promise<void> { this.ck(); await play(key); this.ck(); }

  async run(kind: ChallengeKind, introKey?: string): Promise<boolean> {
    this.ck();
    const skip = new Promise<'skip'>((r) => { this.skipResolve = () => r('skip'); });
    try {
      if (introKey) await this.say(introKey);
      showPanel(true);
      const body = kind === 'spell' ? this.spell() : kind === 'fill' ? this.fill() : this.count_();
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
      showPanel(false);
    }
  }

  /** Debug: coi như trả lời đúng bài hiện tại. */
  skip(): void { this.skipResolve?.(); }

  abort(): void {
    this.aborted = true;
    stopSpeech();
    this.skipResolve?.();
    showPanel(false);
  }

  dispose(): void {
    this.abort();
    els.repeat.removeEventListener('click', this.onRepeat);
  }

  private pickWord(filter?: (w: WordEntry) => boolean): WordEntry {
    const all = this.words.filter(filter ?? (() => true));
    const fresh = all.filter((w) => !this.used.has(w.id));
    const pool = fresh.length ? fresh : all;
    const w = pool[Math.floor(Math.random() * pool.length)];
    this.used.add(w.id);
    return w;
  }

  /**
   * Chọn đúng → bỏ hint, tô xanh; sai → lần 1 bỏ 1 đáp án + nhắc lại câu hỏi, lần 2 nhấp nháy đáp án đúng.
   * Câu hỏi phát bằng speakSequence nên chạm đúng giữa chừng (stopSpeech) là cắt luôn phần còn lại.
   */
  private pickLoop(items: { label: string; value: string }[], target: string, askKeys: string[]): Promise<void> {
    let wrong = 0;
    let busy = false;
    const ask = () => speakSequence(askKeys, undefined, 150);
    this.repeatFn = () => void ask();
    this.current = target;
    return new Promise((resolve) => {
      const buttons = showOptions(items, async (value, btn) => {
        if (this.aborted) return;
        if (value !== target) {
          if (busy) return;
          busy = true;
          wrong++;
          sfx('sfx_soft', 0.5);
          wobbleEl(btn);
          btn.classList.add('gone');
          this.hooks.onWrong();
          if (wrong === 1) {
            await speakSequence(['retry', ...askKeys], undefined, 150);
          } else {
            buttons.find((b) => b.dataset.value === target)?.classList.add('hint');
            await speakSequence(['hint_last'], undefined, 150);
          }
          busy = false;
          return;
        }
        stopSpeech();
        buttons.forEach((b) => { b.classList.remove('hint'); if (b !== btn) b.classList.add('gone'); });
        btn.classList.add('correct');
        sfx('sfx_win', 0.5);
        this.current = null;
        resolve();
      });
      void ask();
    });
  }

  /** A1: nghe "Cái nào là …?" → 3 hình. Đúng thì đánh vần. */
  private async spell(): Promise<void> {
    const target = this.pickWord();
    const others = this.words.filter((w) => w.id !== target.id && w.emoji !== target.emoji).sort(() => Math.random() - 0.5).slice(0, 2);
    const items = [target, ...others].sort(() => Math.random() - 0.5).map((w) => ({ label: w.emoji, value: w.id }));
    await this.pickLoop(items, target.id, [target.askKey]);
    await this.say('right');
    await this.spellOut(target);
  }

  /** A2: hình + chữ có ô trống → 3 nút chữ cái. */
  private async fill(): Promise<void> {
    const target = this.pickWord((w) => !!w.fill);
    const f = target.fill!;
    const correct = Array.from(target.word)[f.index];
    const letters = [correct, ...f.distractors].sort(() => Math.random() - 0.5);
    showWord(target.word, [], false, f.index);
    els.wordEmoji.textContent = target.emoji;
    els.wordEmoji.hidden = false;
    await this.pickLoop(letters.map((l) => ({ label: l, value: l })), correct, [target.nameKey, 'ask_fill']);
    els.wordEmoji.hidden = true;
    showWord(target.word, [f.index], false);
    await this.say('right');
    await this.spellOut(target);
  }

  private async spellOut(w: WordEntry): Promise<void> {
    this.ck();
    const all = Array.from(w.word).map((_, i) => i);
    els.wordEmoji.textContent = w.emoji;
    els.wordEmoji.hidden = false;
    showWord(w.word, all, true);
    this.repeatFn = () => void this.spellOut(w).catch(() => {});
    const ok = await speakSequence([w.nameKey, ...w.tokens.map((t) => t.audio)], (i) => {
      if (i === 0) showWord(w.word, all, true);
      else showWord(w.word, w.tokens[i - 1].lit, false);
    });
    this.ck();
    if (ok) showWord(w.word, all, true);
    await wait(600);
    hideWord();
  }

  /** B1: chạm từng vật để đếm → chọn số. */
  private async count_(): Promise<void> {
    const [lo, hi] = this.count.range;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    let counted = 0;
    this.repeatFn = () => void speakSequence([this.count.audio]);
    await new Promise<void>((resolve) => {
      showGemRow(n, this.count.emoji, async (btn) => {
        if (this.aborted) return;
        if (btn.classList.contains('done')) { void play(NUMBER_AUDIO[Math.min(counted, 10)] || 'n1'); return; }
        btn.classList.add('done');
        counted++;
        sfx('sfx_pop', 0.5);
        setCounter(counted);
        await play(NUMBER_AUDIO[counted]);
        if (counted === n) { await wait(250); resolve(); }
      });
      void speakSequence([this.count.audio]);
    });
    this.ck();
    const opts = new Set<number>([n]);
    while (opts.size < 3) {
      const d = n + Math.floor(Math.random() * 5) - 2;
      if (d >= 1 && d <= 10) opts.add(d);
    }
    const list = [...opts].sort(() => Math.random() - 0.5).map((v) => ({ label: String(v), value: String(v) }));
    await this.pickLoop(list, String(n), ['ask_pick_number']);
    await this.say(NUMBER_AUDIO[n]);
    await this.say('right');
    els.gemrow.hidden = true;
    setCounter(null);
  }
}

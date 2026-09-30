// Thử thách (DOM): A1 nghe – chọn hình, A2 điền chữ thiếu, B1 đếm ngọc – chọn số. Luôn kết thúc thành công.
import { WORDS, NUMBER_AUDIO, type WordDef, type ChallengeKind } from './data';
import { play, sfx, speakSequence, stopSpeech } from './audio';
import { els, showPanel, showWord, showOptions, showGemRow, setCounter, wobbleEl, hideWord } from './ui';
import { wait } from './tween';

export interface ChallengeHooks { onWrong: () => void }

export class Challenge {
  private used = new Set<string>();
  private repeatFn: (() => void) | null = null;

  constructor(private hooks: ChallengeHooks, private countRange: [number, number]) {
    els.repeat.addEventListener('click', () => this.repeatFn?.());
  }

  async run(kind: ChallengeKind): Promise<void> {
    showPanel(true);
    await play('challenge_start');
    if (kind === 'spell') await this.spell();
    else if (kind === 'fill') await this.fill();
    else await this.count();
    await wait(300);
    showPanel(false);
    this.repeatFn = null;
  }

  private pickWord(filter?: (w: WordDef) => boolean): WordDef {
    const all = WORDS.filter(filter ?? (() => true));
    const fresh = all.filter((w) => !this.used.has(w.id));
    const pool = fresh.length ? fresh : all;
    const w = pool[Math.floor(Math.random() * pool.length)];
    this.used.add(w.id);
    return w;
  }

  /** Chọn đúng → bỏ hint, tô xanh; sai → lần 1 bỏ 1 đáp án, lần 2 nhấp nháy đáp án đúng. */
  private pickLoop(items: { label: string; value: string }[], target: string, askAudio: string, onWrongAudio?: () => Promise<void>): Promise<HTMLButtonElement> {
    let wrong = 0;
    this.repeatFn = () => void play(askAudio);
    return new Promise((resolve) => {
      const buttons = showOptions(items, async (value, btn) => {
        if (value !== target) {
          wrong++;
          sfx('sfx_soft', 0.5);
          wobbleEl(btn);
          this.hooks.onWrong();
          if (wrong === 1) {
            btn.classList.add('gone');
            await play('retry');
            if (onWrongAudio) await onWrongAudio(); else await play(askAudio);
          } else {
            await play('hint_last');
            buttons.find((b) => b.dataset.value === target)?.classList.add('hint');
          }
          return;
        }
        buttons.forEach((b) => { b.classList.remove('hint'); if (b !== btn) b.classList.add('gone'); });
        btn.classList.add('correct');
        sfx('sfx_win', 0.5);
        resolve(btn);
      });
      void play(askAudio);
    });
  }

  /** A1 */
  private async spell(): Promise<void> {
    const target = this.pickWord();
    const others = WORDS.filter((w) => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 2);
    const items = [target, ...others].sort(() => Math.random() - 0.5).map((w) => ({ label: w.emoji, value: w.id }));
    await this.pickLoop(items, target.id, `ask_${target.id}`);
    await play('right');
    await this.spellOut(target);
  }

  /** A2: hình + chữ có ô trống → 3 nút chữ cái. Chạm nút sai vẫn đọc tên âm của chữ đó (học thêm). */
  private async fill(): Promise<void> {
    const target = this.pickWord((w) => !!w.fill);
    const f = target.fill!;
    const correct = Array.from(target.word)[f.index];
    const letters = [correct, ...f.distractors].sort(() => Math.random() - 0.5);
    showWord(target.word, [], false, f.index);
    els.wordEmoji.textContent = target.emoji;
    els.wordEmoji.hidden = false;
    await play(`name_${target.id}`);
    await this.pickLoop(letters.map((l) => ({ label: l, value: l })), correct, 'ask_fill', async () => { await play(`name_${target.id}`); await play('ask_fill'); });
    els.wordEmoji.hidden = true;
    showWord(target.word, [f.index], false);
    await play('right');
    await this.spellOut(target);
  }

  private async spellOut(w: WordDef): Promise<void> {
    const all = Array.from(w.word).map((_, i) => i);
    showWord(w.word, all, true);
    this.repeatFn = () => void this.spellOut(w);
    const ok = await speakSequence([`name_${w.id}`, ...w.tokens.map((t) => t.audio)], (i) => {
      if (i === 0) showWord(w.word, all, true);
      else showWord(w.word, w.tokens[i - 1].lit, false);
    });
    if (ok) showWord(w.word, all, true);
    await wait(500);
    hideWord();
  }

  /** B1 */
  private async count(): Promise<void> {
    const [lo, hi] = this.countRange;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    let counted = 0;
    this.repeatFn = () => void play('ask_count');
    await new Promise<void>((resolve) => {
      showGemRow(n, async (btn) => {
        if (btn.classList.contains('done')) { void play(NUMBER_AUDIO[Math.min(counted, 10)] || 'n1'); return; }
        btn.classList.add('done');
        counted++;
        sfx('sfx_pop', 0.5);
        setCounter(counted);
        await play(NUMBER_AUDIO[counted]);
        if (counted === n) { await wait(250); resolve(); }
      });
      void play('ask_count');
    });
    const opts = new Set<number>([n]);
    while (opts.size < 3) {
      const d = n + Math.floor(Math.random() * 5) - 2;
      if (d >= 1 && d <= 10) opts.add(d);
    }
    const list = [...opts].sort(() => Math.random() - 0.5).map((v) => ({ label: String(v), value: String(v) }));
    await this.pickLoop(list, String(n), 'ask_pick_number', async () => { await play(NUMBER_AUDIO[n]); });
    stopSpeech();
    await play('right');
    els.gemrow.hidden = true;
    setCounter(null);
  }
}

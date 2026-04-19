// engines/riddle.js — riddle / MCQ engine

import { getEgg } from '../main.js';

const TYPEWRITER_MS = 28;
const REVEAL_CORRECT_MS = 1000;
const ADVANCE_DELAY_MS = 1500;
const CUTSCENE_LINE_PAUSE_MS = 2000;
const CUTSCENE_FINAL_PAUSE_MS = 3000;

export class RiddleEngine {
  constructor(config, gameState, onWin) {
    this.config = config;
    this.gameState = gameState;
    this.onWin = onWin;

    this.container = null;
    this.presenterEl = null;
    this.speakerEl = null;
    this.textEl = null;
    this.answersEl = null;
    this.hintEl = null;
    this.feedbackEl = null;
    this.scoreEl = null;

    this.riddles = [];
    this.riddleIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.ended = false;

    // Typewriter state
    this.typewriterTimer = null;
    this.typewriterFullText = '';
    this.typewriterOnComplete = null;
    this.typewriterDone = true;

    this.activeTimers = new Set();
    this.skipHandler = null;
  }

  // ───────────── Lifecycle ─────────────

  render(container) {
    this.container = container;
    container.innerHTML = '';
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    // Ambient drift layer
    const drift = document.createElement('div');
    drift.className = `riddle-ambient riddle-ambient-${this.config.id}`;
    container.appendChild(drift);

    // HUD
    const hud = document.createElement('div');
    hud.className = 'maze-hud riddle-hud';
    const needed = this.config.requiredCorrect;
    hud.innerHTML = `
      <span class="maze-hud-region">${this._regionName()}</span>
      <span class="riddle-score">CORRECT: <span class="riddle-score-count">0</span> / ${needed}</span>
    `;
    this.scoreEl = hud.querySelector('.riddle-score-count');
    container.appendChild(hud);

    // Stage
    const stage = document.createElement('div');
    stage.className = 'riddle-stage';

    const portrait = document.createElement('div');
    portrait.className = `riddle-portrait portrait-${this.config.presenter.sprite}`;
    if (this.gameState.mode === 'explorer') {
      portrait.title = this.config.presenter.description;
    }
    portrait.innerHTML = this._portraitMarkup(this.config.presenter.sprite);
    this.presenterEl = portrait;
    stage.appendChild(portrait);

    const box = document.createElement('div');
    box.className = 'riddle-box';
    box.innerHTML = `
      <div class="riddle-speaker"></div>
      <div class="riddle-text"></div>
      <div class="dialogue-skip-hint">(click to skip)</div>
    `;
    this.speakerEl = box.querySelector('.riddle-speaker');
    this.textEl = box.querySelector('.riddle-text');
    this.skipHandler = () => {
      if (!this.typewriterDone) this._finishTypewriter();
    };
    box.addEventListener('click', this.skipHandler);
    stage.appendChild(box);

    container.appendChild(stage);

    // Answers
    const answers = document.createElement('div');
    answers.className = 'riddle-answers';
    this.answersEl = answers;
    container.appendChild(answers);

    // Hint
    const hint = document.createElement('div');
    hint.className = 'riddle-hint';
    this.hintEl = hint;
    container.appendChild(hint);

    // Feedback
    const feedback = document.createElement('div');
    feedback.className = 'riddle-feedback';
    this.feedbackEl = feedback;
    container.appendChild(feedback);
  }

  _portraitMarkup(sprite) {
    if (sprite === 'fa-glin') {
      return `
        <div class="portrait-faglin-body"></div>
        <div class="portrait-faglin-head"></div>
        <div class="portrait-faglin-bow"></div>
      `;
    }
    if (sprite === 'guardian') {
      return `
        <div class="portrait-guardian-body"></div>
        <div class="portrait-guardian-head"></div>
        <div class="portrait-pet portrait-pet-1" title="Pride"></div>
        <div class="portrait-pet portrait-pet-2" title="Envy"></div>
        <div class="portrait-pet portrait-pet-3" title="Hate"></div>
        <div class="portrait-pet portrait-pet-4" title="Greed"></div>
      `;
    }
    return '';
  }

  start() {
    this._prepareRiddles();
    this._loadRiddle();
  }

  destroy() {
    this._clearAllTimers();
    if (this.container) {
      this.container.innerHTML = '';
      delete this.container.dataset.region;
    }
  }

  _clearAllTimers() {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.activeTimers.forEach(id => clearTimeout(id));
    this.activeTimers.clear();
  }

  _setTimer(fn, ms) {
    const id = setTimeout(() => {
      this.activeTimers.delete(id);
      fn();
    }, ms);
    this.activeTimers.add(id);
    return id;
  }

  // ───────────── Riddle preparation ─────────────

  _prepareRiddles() {
    // Clone riddles with shuffled answer order
    const cloned = this.config.riddles.map(r => {
      const answers = r.answers.map(a => this._applyEggReplace(a));
      this._shuffle(answers);
      return { ...r, answers };
    });
    if (!this.config.singleShot) {
      this._shuffle(cloned);
    }
    this.riddles = cloned;
    this.riddleIndex = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.ended = false;
    this._updateScore();
  }

  _applyEggReplace(answer) {
    if (!answer.eggReplace) return { ...answer };
    const egg = getEgg(answer.eggReplace);
    if (egg && egg.content && egg.content.optionText) {
      return {
        ...answer,
        text: egg.content.optionText,
        eggTriggered: answer.eggReplace,
      };
    }
    return { ...answer };
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ───────────── Riddle flow ─────────────

  _loadRiddle() {
    if (this.ended) return;
    const riddle = this.riddles[this.riddleIndex];
    if (!riddle) {
      this._resolveOutcome();
      return;
    }

    this.answersEl.innerHTML = '';
    this.hintEl.textContent = '';
    this.hintEl.classList.remove('visible');
    this.feedbackEl.textContent = '';
    this.feedbackEl.classList.remove('visible', 'feedback-correct', 'feedback-wrong');

    this.speakerEl.textContent = this.config.presenter.name;

    this._typewrite(riddle.question, () => {
      this._renderAnswers(riddle);
      if (this.gameState.mode === 'explorer' && riddle.hint) {
        this.hintEl.textContent = riddle.hint;
        this.hintEl.classList.add('visible');
      }
    });
  }

  _renderAnswers(riddle) {
    this.answersEl.innerHTML = '';
    riddle.answers.forEach((answer, idx) => {
      const btn = document.createElement('button');
      btn.className = 'riddle-answer';
      btn.textContent = answer.text;
      btn.dataset.idx = idx;
      btn.addEventListener('click', () => this._onAnswer(riddle, answer, btn));
      this.answersEl.appendChild(btn);
    });
  }

  _onAnswer(riddle, answer, btn) {
    // Disable all
    const buttons = Array.from(this.answersEl.querySelectorAll('.riddle-answer'));
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.add('riddle-answer-disabled');
    });
    this.hintEl.classList.remove('visible');

    if (answer.correct) {
      btn.classList.remove('riddle-answer-disabled');
      btn.classList.add('riddle-answer-correct');
      this.correctCount += 1;
      this._updateScore();
      this._showFeedback(riddle.correctFlavour, 'correct');

      this._setTimer(() => this._advanceAfterCorrect(), ADVANCE_DELAY_MS);
    } else {
      btn.classList.remove('riddle-answer-disabled');
      btn.classList.add('riddle-answer-wrong');
      this.wrongCount += 1;

      // Single-shot → cutscene
      if (this.config.singleShot) {
        this._triggerFailCutscene(answer);
        return;
      }

      // Reveal correct answer after 1s
      this._setTimer(() => {
        const correctBtn = buttons.find(b => {
          const ans = riddle.answers[Number(b.dataset.idx)];
          return ans && ans.correct;
        });
        if (correctBtn) {
          correctBtn.classList.remove('riddle-answer-disabled');
          correctBtn.classList.add('riddle-answer-correct');
        }
      }, REVEAL_CORRECT_MS);

      if (riddle.wrongFlavour) {
        this._showFeedback(riddle.wrongFlavour, 'wrong');
      }

      if (this.config.hardFail) {
        this._setTimer(() => this._triggerFail(), ADVANCE_DELAY_MS);
      } else {
        this._setTimer(() => this._advanceAfterWrong(), ADVANCE_DELAY_MS + REVEAL_CORRECT_MS);
      }
    }
  }

  _advanceAfterCorrect() {
    if (this.correctCount >= this.config.requiredCorrect) {
      this._triggerWin();
      return;
    }
    this.riddleIndex += 1;
    if (this.riddleIndex >= this.riddles.length) {
      this._resolveOutcome();
    } else {
      this._loadRiddle();
    }
  }

  _advanceAfterWrong() {
    this.riddleIndex += 1;
    if (this.riddleIndex >= this.riddles.length) {
      this._resolveOutcome();
    } else {
      this._loadRiddle();
    }
  }

  _resolveOutcome() {
    if (this.correctCount >= this.config.requiredCorrect) {
      this._triggerWin();
    } else {
      this._triggerFail();
    }
  }

  _updateScore() {
    if (this.scoreEl) this.scoreEl.textContent = String(this.correctCount);
  }

  // ───────────── Feedback ─────────────

  _showFeedback(text, kind) {
    this.feedbackEl.textContent = text;
    this.feedbackEl.classList.remove('feedback-correct', 'feedback-wrong', 'visible');
    void this.feedbackEl.offsetWidth;
    this.feedbackEl.classList.add('visible');
    if (kind === 'correct') this.feedbackEl.classList.add('feedback-correct');
    else if (kind === 'wrong') this.feedbackEl.classList.add('feedback-wrong');
  }

  // ───────────── Typewriter ─────────────

  _typewrite(text, onComplete) {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.typewriterFullText = text;
    this.typewriterOnComplete = onComplete;
    this.typewriterDone = false;
    this.textEl.textContent = '';
    this.textEl.classList.add('is-typing');

    let i = 0;
    const step = () => {
      if (i >= text.length) {
        this._finishTypewriter();
        return;
      }
      this.textEl.textContent += text.charAt(i);
      i += 1;
      this.typewriterTimer = setTimeout(step, TYPEWRITER_MS);
    };
    this.typewriterTimer = setTimeout(step, TYPEWRITER_MS);
  }

  _finishTypewriter() {
    if (this.typewriterDone) return;
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.textEl.textContent = this.typewriterFullText;
    this.textEl.classList.remove('is-typing');
    this.typewriterDone = true;
    const cb = this.typewriterOnComplete;
    this.typewriterOnComplete = null;
    if (cb) cb();
  }

  // ───────────── Win ─────────────

  _triggerWin() {
    if (this.ended) return;
    this.ended = true;
    this.answersEl.innerHTML = '';
    this.hintEl.classList.remove('visible');
    this.presenterEl.classList.add('portrait-golden');

    this._typewrite(this.config.winText, () => {
      this._setTimer(() => this._showWinOverlay(), 1500);
    });
  }

  _showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'maze-win-overlay riddle-win-overlay';
    overlay.style.setProperty('--accent', this.config.accentColour);
    overlay.innerHTML = `
      <div class="maze-win-content">
        <div class="maze-win-gem riddle-win-gem"></div>
        <h2 class="maze-win-title">${this.config.gemName} found!</h2>
        <p class="maze-win-text">The Belt grows stronger.</p>
        <button class="maze-win-btn">CONTINUE</button>
      </div>
    `;
    overlay.querySelector('.maze-win-btn').addEventListener('click', () => {
      overlay.remove();
      this.onWin(this.config.id, this.config.gemName.toLowerCase());
    });
    this.container.appendChild(overlay);
  }

  // ───────────── Fail (standard) ─────────────

  _triggerFail() {
    if (this.ended) return;
    this.ended = true;
    this.answersEl.innerHTML = '';
    this.hintEl.classList.remove('visible');

    const failText = this.config.failText || '';

    const finishAndShowOverlay = () => {
      this._setTimer(() => this._showFailOverlay(), 1500);
    };

    if (failText) {
      this._typewrite(failText, finishAndShowOverlay);
    } else {
      finishAndShowOverlay();
    }
  }

  _showFailOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'maze-catch-overlay riddle-fail-overlay';
    overlay.innerHTML = `
      <div class="maze-catch-content">
        <h2 class="maze-catch-title riddle-fail-title">${this._regionName()} rejects you.</h2>
        <p class="maze-catch-text">Try again.</p>
        <button class="maze-catch-btn">TRY AGAIN</button>
      </div>
    `;
    overlay.querySelector('.maze-catch-btn').addEventListener('click', () => {
      overlay.remove();
      this._reset();
    });
    this.container.appendChild(overlay);
  }

  _reset() {
    this._clearAllTimers();
    this.presenterEl.classList.remove('portrait-golden');
    this.feedbackEl.textContent = '';
    this.feedbackEl.classList.remove('visible', 'feedback-correct', 'feedback-wrong');
    this._prepareRiddles();
    this._loadRiddle();
  }

  // ───────────── Fail cutscene (Valley single-shot) ─────────────

  _triggerFailCutscene(chosenAnswer) {
    if (this.ended) return;
    this.ended = true;
    this.answersEl.innerHTML = '';
    this.hintEl.classList.remove('visible');
    this.feedbackEl.textContent = '';
    this.feedbackEl.classList.remove('visible');

    const overlay = document.createElement('div');
    overlay.className = 'valley-cutscene-overlay';
    overlay.innerHTML = `
      <div class="valley-cutscene-inner">
        <div class="valley-cutscene-lines"></div>
        <button class="valley-cutscene-btn">TRY AGAIN</button>
      </div>
    `;
    const linesEl = overlay.querySelector('.valley-cutscene-lines');
    const btn = overlay.querySelector('.valley-cutscene-btn');
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';

    this.container.appendChild(overlay);

    // Build lines
    const lines = (this.config.failCutscene || []).slice();

    // Baek egg override: replace first line if chosenAnswer came from egg
    if (chosenAnswer && chosenAnswer.eggTriggered) {
      const egg = getEgg(chosenAnswer.eggTriggered);
      if (egg && egg.content && egg.content.failResponse) {
        lines[0] = egg.content.failResponse;
      }
    }

    this._playCutsceneLines(linesEl, lines, 0, () => {
      this._setTimer(() => {
        btn.style.transition = 'opacity 0.8s ease-out';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        btn.addEventListener('click', () => {
          overlay.remove();
          this._reset();
        });
      }, CUTSCENE_FINAL_PAUSE_MS);
    });
  }

  _playCutsceneLines(linesEl, lines, idx, onDone) {
    if (idx >= lines.length) {
      onDone();
      return;
    }
    const p = document.createElement('p');
    p.className = 'valley-cutscene-line';
    linesEl.appendChild(p);

    const text = lines[idx];
    let i = 0;
    const TYPE_MS = 55;
    const typeStep = () => {
      if (i >= text.length) {
        this._setTimer(() => {
          this._playCutsceneLines(linesEl, lines, idx + 1, onDone);
        }, CUTSCENE_LINE_PAUSE_MS);
        return;
      }
      p.textContent += text.charAt(i);
      i += 1;
      const id = setTimeout(typeStep, TYPE_MS);
      this.activeTimers.add(id);
    };
    typeStep();
  }

  // ───────────── Helpers ─────────────

  _regionName() {
    const names = {
      dread: 'Dread Mountain',
      valley: 'Valley of the Lost',
    };
    return names[this.config.id] || this.config.id;
  }
}

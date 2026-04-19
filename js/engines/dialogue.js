// engines/dialogue.js — shared dialogue tree engine

import { getEgg } from '../main.js';

const TYPEWRITER_MS = 28;
const NARRATOR_AUTOADVANCE_MS = 2000;
const CHOICE_RESPONSE_PAUSE_MS = 1500;
const EGG_DELAY_MS = 1000;
const WIN_FAIL_PAUSE_MS = 2000;

export class DialogueEngine {
  constructor(config, gameState, onWin) {
    this.config = config;
    this.gameState = gameState;
    this.onWin = onWin;

    this.container = null;
    this.nodeIndex = 0;
    this.trust = 0;
    this.ended = false;

    // Elements
    this.portraitEl = null;
    this.speakerEl = null;
    this.textEl = null;
    this.choicesEl = null;
    this.hintEl = null;
    this.trustEl = null;

    // Typewriter + timer tracking
    this.typewriterTimer = null;
    this.activeTimers = new Set();
    this.typewriterDone = true;
    this.typewriterFullText = '';
    this.typewriterOnComplete = null;
    this.skipHandler = null;
  }

  // ───────────── Lifecycle ─────────────

  render(container) {
    this.container = container;
    container.innerHTML = '';
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    // Drift background layer
    const drift = document.createElement('div');
    drift.className = 'lake-drift';
    container.appendChild(drift);

    // HUD
    const hud = document.createElement('div');
    hud.className = 'maze-hud dialogue-hud';
    hud.innerHTML = `
      <span class="maze-hud-region">${this._regionDisplayName()}</span>
      <span class="dialogue-trust-meter" aria-label="Trust meter">
        <span class="dialogue-trust-label">${this.config.character.name.toUpperCase()}'S TRUST:</span>
        <span class="dialogue-trust-dots"></span>
      </span>
    `;
    container.appendChild(hud);

    // Main stage
    const stage = document.createElement('div');
    stage.className = 'dialogue-stage';

    // Portrait
    const portrait = document.createElement('div');
    portrait.className = `dialogue-portrait portrait-${this.config.character.sprite}`;
    if (this.gameState.mode === 'explorer') {
      portrait.title = this.config.character.description;
    }
    portrait.innerHTML = `
      <div class="portrait-water"></div>
      <div class="portrait-body"></div>
      <div class="portrait-eye portrait-eye-1"></div>
      <div class="portrait-eye portrait-eye-2"></div>
    `;
    this.portraitEl = portrait;
    stage.appendChild(portrait);

    // Dialogue box
    const box = document.createElement('div');
    box.className = 'dialogue-box';
    box.innerHTML = `
      <div class="dialogue-speaker"></div>
      <div class="dialogue-text"></div>
      <div class="dialogue-skip-hint">(click to skip)</div>
    `;
    this.speakerEl = box.querySelector('.dialogue-speaker');
    this.textEl = box.querySelector('.dialogue-text');

    // Skip typewriter on click
    this.skipHandler = () => {
      if (!this.typewriterDone) this._finishTypewriter();
    };
    box.addEventListener('click', this.skipHandler);

    stage.appendChild(box);
    container.appendChild(stage);

    // Choices container
    const choices = document.createElement('div');
    choices.className = 'dialogue-choices';
    this.choicesEl = choices;
    container.appendChild(choices);

    // Explorer hint
    const hint = document.createElement('div');
    hint.className = 'dialogue-hint';
    this.hintEl = hint;
    container.appendChild(hint);

    // Initial trust dots
    this.trustEl = hud.querySelector('.dialogue-trust-dots');
    this._updateTrustMeter();
  }

  start() {
    this._loadNode(this.nodeIndex);
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

  // ───────────── Node loading ─────────────

  _loadNode(index) {
    if (this.ended) return;
    const node = this.config.nodes[index];
    if (!node) return;

    this.choicesEl.innerHTML = '';
    this.hintEl.textContent = '';
    this.hintEl.classList.remove('visible');

    if (node.speaker === 'narrator') {
      this.speakerEl.textContent = '';
      this.speakerEl.classList.add('is-narrator');
      this.textEl.classList.add('is-narrator');
    } else {
      this.speakerEl.textContent = node.speaker;
      this.speakerEl.classList.remove('is-narrator');
      this.textEl.classList.remove('is-narrator');
    }

    this._typewrite(node.text, () => {
      if (node.choices && node.choices.length > 0) {
        this._renderChoices(node);
      } else {
        // Narrator — auto-advance
        this._setTimer(() => this._advanceFromNarrator(), NARRATOR_AUTOADVANCE_MS);
      }
    });
  }

  _advanceFromNarrator() {
    this.nodeIndex += 1;
    if (this.nodeIndex >= this.config.nodes.length) {
      this._resolveOutcome();
    } else {
      this._loadNode(this.nodeIndex);
    }
  }

  // ───────────── Choices ─────────────

  _renderChoices(node) {
    this.choicesEl.innerHTML = '';
    node.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => this._onChoice(node, choice));
      this.choicesEl.appendChild(btn);
    });

    if (this.gameState.mode === 'explorer' && node.hint) {
      this.hintEl.textContent = node.hint;
      this.hintEl.classList.add('visible');
    }
  }

  _onChoice(node, choice) {
    // Disable choice buttons
    this.choicesEl.querySelectorAll('.dialogue-choice').forEach(b => {
      b.disabled = true;
      b.classList.add('dialogue-choice-disabled');
    });
    this.hintEl.classList.remove('visible');

    // Trust update
    this.trust += choice.trustDelta;
    this._updateTrustMeter();

    // Portrait reaction
    this._flashPortrait(choice.responseType);

    // Speaker switch for response: character talks back
    this.speakerEl.textContent = this.config.character.name;
    this.speakerEl.classList.remove('is-narrator');
    this.textEl.classList.remove('is-narrator');

    // Clear choice buttons after a short beat
    this._setTimer(() => {
      this.choicesEl.innerHTML = '';
    }, 200);

    const baseText = choice.response;
    const egg = choice.eggTrigger ? getEgg(choice.eggTrigger) : null;
    const eggLine = egg && this.config.eggLines
      ? this.config.eggLines[choice.eggTrigger]
      : null;

    this._typewrite(baseText, () => {
      const continueAfterResponse = () => {
        // Check fail immediately after a negative-enough choice
        if (this.trust <= this.config.failThreshold) {
          this._triggerFail();
          return;
        }

        this._setTimer(() => {
          this.nodeIndex += 1;
          if (this.nodeIndex >= this.config.nodes.length) {
            this._resolveOutcome();
          } else {
            this._loadNode(this.nodeIndex);
          }
        }, CHOICE_RESPONSE_PAUSE_MS);
      };

      if (eggLine) {
        this._setTimer(() => {
          if (this.ended) return;
          // Append egg line with a soft visual break
          const currentText = this.textEl.textContent;
          const appended = currentText + '\n\n' + eggLine;
          this._typewrite(appended, continueAfterResponse, { startFrom: currentText.length + 2 });
        }, EGG_DELAY_MS);
      } else {
        continueAfterResponse();
      }
    });
  }

  // ───────────── Outcomes ─────────────

  _resolveOutcome() {
    if (this.ended) return;
    if (this.trust >= this.config.trustRequired) {
      this._triggerWin();
    } else {
      this._triggerFail();
    }
  }

  _triggerWin() {
    if (this.ended) return;
    this.ended = true;
    this.choicesEl.innerHTML = '';
    this.hintEl.classList.remove('visible');

    this.trustEl.classList.add('trust-golden');
    this.portraitEl.classList.remove('portrait-react-positive', 'portrait-react-negative');
    this.portraitEl.classList.add('portrait-golden');

    this.speakerEl.textContent = this.config.character.name;
    this.speakerEl.classList.remove('is-narrator');
    this.textEl.classList.remove('is-narrator');

    this._typewrite(this.config.winText, () => {
      this._setTimer(() => this._showWinOverlay(), WIN_FAIL_PAUSE_MS);
    });
  }

  _triggerFail() {
    if (this.ended) return;
    this.ended = true;
    this.choicesEl.innerHTML = '';
    this.hintEl.classList.remove('visible');

    this.trustEl.classList.add('trust-empty');
    this.portraitEl.classList.add('portrait-react-negative');

    this.speakerEl.classList.add('is-narrator');
    this.speakerEl.textContent = '';
    this.textEl.classList.add('is-narrator');

    this._typewrite(this.config.failText, () => {
      this._setTimer(() => this._showFailOverlay(), WIN_FAIL_PAUSE_MS);
    });
  }

  _showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'maze-win-overlay dialogue-win-overlay';
    overlay.style.setProperty('--accent', this.config.accentColour);
    overlay.innerHTML = `
      <div class="maze-win-content">
        <div class="maze-win-gem dialogue-win-gem"></div>
        <h2 class="maze-win-title">${this.config.gemName} found!</h2>
        <p class="maze-win-text">Soldeen remembered who he was.</p>
        <button class="maze-win-btn">CONTINUE</button>
      </div>
    `;
    overlay.querySelector('.maze-win-btn').addEventListener('click', () => {
      overlay.remove();
      this.onWin(this.config.id, this.config.gemName.toLowerCase());
    });
    this.container.appendChild(overlay);
  }

  _showFailOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'maze-catch-overlay dialogue-fail-overlay';
    overlay.innerHTML = `
      <div class="maze-catch-content">
        <h2 class="maze-catch-title dialogue-fail-title">Soldeen's patience is gone.</h2>
        <p class="maze-catch-text">The Lake of Tears claims another.</p>
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
    this.ended = false;
    this.trust = 0;
    this.nodeIndex = 0;

    this.trustEl.classList.remove('trust-golden', 'trust-empty');
    this.portraitEl.classList.remove(
      'portrait-react-positive',
      'portrait-react-negative',
      'portrait-golden'
    );

    this._updateTrustMeter();
    this._loadNode(0);
  }

  // ───────────── Typewriter ─────────────

  _typewrite(text, onComplete, opts = {}) {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }

    const start = opts.startFrom || 0;
    this.typewriterFullText = text;
    this.typewriterOnComplete = onComplete;
    this.typewriterDone = false;
    this.textEl.classList.add('is-typing');

    if (start === 0) {
      this.textEl.textContent = '';
    } else {
      this.textEl.textContent = text.slice(0, start);
    }

    let i = start;
    const step = () => {
      if (this.ended && !this._isOutcomeText(text)) {
        // still allow outcome text to finish
      }
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

  _isOutcomeText(text) {
    return text === this.config.winText || text === this.config.failText;
  }

  // ───────────── Trust meter ─────────────

  _updateTrustMeter() {
    const max = this.config.trustMax;
    const clamped = Math.max(0, Math.min(this.trust, max));
    let html = '';
    for (let i = 0; i < max; i++) {
      if (i < clamped) {
        html += '<span class="trust-dot trust-dot-filled">&#9679;</span>';
      } else {
        html += '<span class="trust-dot">&#9675;</span>';
      }
    }
    this.trustEl.innerHTML = html;
  }

  // ───────────── Portrait reactions ─────────────

  _flashPortrait(type) {
    this.portraitEl.classList.remove(
      'portrait-react-positive',
      'portrait-react-negative',
      'portrait-react-neutral'
    );
    // Force reflow so animation restarts
    void this.portraitEl.offsetWidth;
    if (type === 'positive') {
      this.portraitEl.classList.add('portrait-react-positive');
    } else if (type === 'negative') {
      this.portraitEl.classList.add('portrait-react-negative');
    } else {
      this.portraitEl.classList.add('portrait-react-neutral');
    }
  }

  // ───────────── Helpers ─────────────

  _regionDisplayName() {
    const names = {
      lake: 'Lake of Tears',
    };
    return names[this.config.id] || this.config.id;
  }
}

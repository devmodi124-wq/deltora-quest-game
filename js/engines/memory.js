// engines/memory.js — memory card flip engine

import { getEgg } from '../main.js';

const MISMATCH_FLIP_BACK_MS = 1000;
const WIN_PAUSE_MS = 500;
const DESCRIPTION_PANEL_MS = 3000;

export class MemoryEngine {
  constructor(config, gameState, onWin) {
    this.config = config;
    this.gameState = gameState;
    this.onWin = onWin;

    this.container = null;
    this.gridEl = null;
    this.hudMatchedEl = null;
    this.feedbackEl = null;
    this.descPanelEl = null;

    this.cards = [];           // array of 16 card objects
    this.cardEls = [];         // DOM refs parallel to cards
    this.firstPick = null;     // index of first flipped card
    this.secondPick = null;
    this.locked = false;
    this.matchedCount = 0;
    this.ended = false;

    this.activeTimers = new Set();
  }

  // ───────────── Lifecycle ─────────────

  render(container) {
    this.container = container;
    container.innerHTML = '';
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    // HUD
    const hud = document.createElement('div');
    hud.className = 'maze-hud memory-hud';
    hud.innerHTML = `
      <span class="maze-hud-region">City of the Rats</span>
      <span class="memory-hud-progress">
        Pairs matched: <span class="memory-matched-count">0</span>/${this.config.pairs.length}
      </span>
    `;
    this.hudMatchedEl = hud.querySelector('.memory-matched-count');
    container.appendChild(hud);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    this.gridEl = grid;
    container.appendChild(grid);

    // Feedback line
    const feedback = document.createElement('div');
    feedback.className = 'memory-feedback';
    this.feedbackEl = feedback;
    container.appendChild(feedback);

    // Explorer description panel (hidden by default, slides up)
    const panel = document.createElement('div');
    panel.className = 'memory-desc-panel';
    panel.innerHTML = `
      <span class="memory-desc-icon"></span>
      <span class="memory-desc-label"></span>
      <span class="memory-desc-dash">\u2014</span>
      <span class="memory-desc-text"></span>
    `;
    this.descPanelEl = panel;
    container.appendChild(panel);

    this._buildDeck();
    this._renderCards();
  }

  start() {
    // Nothing to bind globally — all interaction is card-level
  }

  destroy() {
    this._clearAllTimers();
    if (this.container) {
      this.container.innerHTML = '';
      delete this.container.dataset.region;
    }
  }

  _clearAllTimers() {
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

  // ───────────── Deck setup ─────────────

  _buildDeck() {
    const deck = [];
    this.config.pairs.forEach(pair => {
      deck.push({ pairId: pair.id, pair, matched: false, flipped: false });
      deck.push({ pairId: pair.id, pair, matched: false, flipped: false });
    });
    this._shuffle(deck);
    this.cards = deck;
    this.matchedCount = 0;
    this.firstPick = null;
    this.secondPick = null;
    this.locked = false;
    this.ended = false;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _renderCards() {
    this.gridEl.innerHTML = '';
    this.cardEls = [];
    this.cards.forEach((card, idx) => {
      const el = document.createElement('button');
      el.className = 'memory-card';
      el.dataset.index = idx;
      el.innerHTML = `
        <span class="memory-card-inner">
          <span class="memory-card-back"></span>
          <span class="memory-card-front">
            <span class="memory-card-icon">${card.pair.icon}</span>
            <span class="memory-card-label">${card.pair.label}</span>
          </span>
        </span>
      `;
      el.addEventListener('click', () => this._onCardClick(idx));
      this.gridEl.appendChild(el);
      this.cardEls.push(el);
    });
  }

  // ───────────── Card interaction ─────────────

  _onCardClick(idx) {
    if (this.ended || this.locked) return;
    const card = this.cards[idx];
    if (card.matched || card.flipped) return;

    card.flipped = true;
    this.cardEls[idx].classList.add('flipped');

    if (this.firstPick === null) {
      this.firstPick = idx;
      return;
    }

    // Second pick
    this.secondPick = idx;
    this.locked = true;

    this._setTimer(() => this._resolvePair(), MISMATCH_FLIP_BACK_MS);
  }

  _resolvePair() {
    const a = this.cards[this.firstPick];
    const b = this.cards[this.secondPick];
    const aEl = this.cardEls[this.firstPick];
    const bEl = this.cardEls[this.secondPick];

    if (a.pairId === b.pairId) {
      // Match
      a.matched = true;
      b.matched = true;
      aEl.classList.add('matched');
      bEl.classList.add('matched');
      this.matchedCount += 1;
      this.hudMatchedEl.textContent = String(this.matchedCount);
      this._showFeedback(`Matched: ${a.pair.label}`, 'matched');

      if (this.gameState.mode === 'explorer') {
        this._showDescriptionPanel(a.pair);
      }

      this.firstPick = null;
      this.secondPick = null;
      this.locked = false;

      if (this.matchedCount === this.config.pairs.length) {
        this._setTimer(() => this._triggerWin(), WIN_PAUSE_MS);
      }
    } else {
      // Mismatch: flash red, flip back
      aEl.classList.add('mismatched');
      bEl.classList.add('mismatched');

      this._setTimer(() => {
        a.flipped = false;
        b.flipped = false;
        aEl.classList.remove('flipped', 'mismatched');
        bEl.classList.remove('flipped', 'mismatched');
        this.firstPick = null;
        this.secondPick = null;
        this.locked = false;
      }, MISMATCH_FLIP_BACK_MS);

      this._showFeedback(this._pickWrongResponse(), 'wrong');
    }
  }

  _pickWrongResponse() {
    const egg = getEgg('sassy_memory_responses');
    const pool = (egg && egg.content && egg.content.responses)
      ? egg.content.responses
      : this.config.wrongFlipResponses;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ───────────── Feedback text ─────────────

  _showFeedback(text, kind) {
    this.feedbackEl.textContent = text;
    this.feedbackEl.classList.remove('memory-feedback-wrong', 'memory-feedback-matched');
    if (kind === 'wrong') {
      this.feedbackEl.classList.add('memory-feedback-wrong');
    } else if (kind === 'matched') {
      this.feedbackEl.classList.add('memory-feedback-matched');
    }
    // Reset animation
    this.feedbackEl.classList.remove('memory-feedback-visible');
    void this.feedbackEl.offsetWidth;
    this.feedbackEl.classList.add('memory-feedback-visible');
  }

  // ───────────── Explorer description panel ─────────────

  _showDescriptionPanel(pair) {
    this.descPanelEl.querySelector('.memory-desc-icon').textContent = pair.icon;
    this.descPanelEl.querySelector('.memory-desc-label').textContent = pair.label;
    this.descPanelEl.querySelector('.memory-desc-text').textContent = pair.description;
    this.descPanelEl.classList.add('visible');

    this._setTimer(() => {
      this.descPanelEl.classList.remove('visible');
    }, DESCRIPTION_PANEL_MS);
  }

  // ───────────── Win ─────────────

  _triggerWin() {
    if (this.ended) return;
    this.ended = true;

    // Pulse all matched cards gold
    this.cardEls.forEach(el => el.classList.add('memory-card-win-pulse'));

    this._setTimer(() => {
      const overlay = document.createElement('div');
      overlay.className = 'maze-win-overlay memory-win-overlay';
      overlay.style.setProperty('--accent', this.config.accentColour);
      overlay.innerHTML = `
        <div class="maze-win-content">
          <div class="maze-win-gem memory-win-gem"></div>
          <h2 class="maze-win-title">${this.config.gemName} found!</h2>
          <p class="maze-win-text">Reeah's crown lies empty.</p>
          <button class="maze-win-btn">CONTINUE</button>
        </div>
      `;
      overlay.querySelector('.maze-win-btn').addEventListener('click', () => {
        overlay.remove();
        this.onWin(this.config.id, this.config.gemName.toLowerCase());
      });
      this.container.appendChild(overlay);
    }, WIN_PAUSE_MS);
  }
}

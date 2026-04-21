// engines/sands.js — Shifting Sands sinking tile engine

import { getEgg } from '../main.js';

const TILE_SAFE = 0;
const TILE_WALL = 1;
const TILE_SINKING = 2;
const TILE_VOID = 3;

// Base timings (ms) before sinkSpeed multiplier
const T_WARNED_MS = 2000;
const T_CRUMBLING_MS = 3500;
const T_VOID_MS = 5000;

export class SandsEngine {
  constructor(config, gameState, onWin) {
    this.config = config;
    this.gameState = gameState;
    this.onWin = onWin;

    this.rows = config.grid.length;
    this.cols = config.grid[0].length;
    this.tileSize = config.tileSize;
    this.sinkSpeed = config.sinkSpeed || 1.0;

    this.playerPos = [...config.playerStart];
    this.container = null;
    this.gridEl = null;
    this.playerEl = null;
    this.tileEls = [];      // 2D array of DOM tile refs
    this.sinkState = [];    // 2D array: null | { timers: [...], phase }
    this.won = false;
    this.dead = false;

    this._onKeyDown = this._onKeyDown.bind(this);
  }

  // ───────────── Render ─────────────

  render(container) {
    this.container = container;
    container.innerHTML = '';
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    // Easter egg stone overlay (shown once before the grid starts)
    const egg = getEgg('meeting_date_stone');
    if (egg) {
      this._showStoneOverlay(() => this._renderGame());
    } else {
      this._renderGame();
    }
  }

  _renderGame() {
    const container = this.container;
    container.innerHTML = '';
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    // Shimmer background layer
    const shimmer = document.createElement('div');
    shimmer.className = 'sands-shimmer';
    container.appendChild(shimmer);

    // HUD
    const hud = document.createElement('div');
    hud.className = 'maze-hud sands-hud';
    hud.innerHTML = `
      <span class="maze-hud-region">Shifting Sands</span>
      <span class="maze-hud-goal">Find the ${this.config.gemName}</span>
    `;
    container.appendChild(hud);

    const subHud = document.createElement('div');
    subHud.className = 'sands-subhud';
    subHud.textContent = 'The Sands remember every step.';
    container.appendChild(subHud);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'sands-grid';
    grid.style.gridTemplateColumns = `repeat(${this.cols}, ${this.tileSize}px)`;
    grid.style.gridTemplateRows = `repeat(${this.rows}, ${this.tileSize}px)`;

    const [gemR, gemC] = this.config.gemPosition;
    this.tileEls = [];
    this.sinkState = [];

    for (let r = 0; r < this.rows; r++) {
      const tileRow = [];
      const stateRow = [];
      for (let c = 0; c < this.cols; c++) {
        const tile = document.createElement('div');
        tile.className = 'sands-tile';
        tile.dataset.row = r;
        tile.dataset.col = c;

        const val = this.config.grid[r][c];
        if (val === TILE_WALL) {
          tile.classList.add('sands-wall');
        } else if (val === TILE_SINKING) {
          // Fresh sinking tile looks identical to safe
          tile.classList.add('sands-sand');
        } else {
          tile.classList.add('sands-sand');
        }

        // Gem tile visual (only overrides safe/sinking)
        if (r === gemR && c === gemC && val !== TILE_WALL) {
          tile.classList.add('sands-gem-tile');
          tile.innerHTML = `
            <span class="sands-gem-spark sands-gem-spark-1"></span>
            <span class="sands-gem-spark sands-gem-spark-2"></span>
            <span class="sands-gem-spark sands-gem-spark-3"></span>
            <span class="sands-gem-spark sands-gem-spark-4"></span>
          `;
        }

        grid.appendChild(tile);
        tileRow.push(tile);
        stateRow.push(null);
      }
      this.tileEls.push(tileRow);
      this.sinkState.push(stateRow);
    }

    // Player
    const player = document.createElement('div');
    player.className = 'sands-player';
    player.style.width = `${this.tileSize}px`;
    player.style.height = `${this.tileSize}px`;
    this.playerEl = player;
    grid.appendChild(player);

    this.gridEl = grid;
    container.appendChild(grid);
    this._updatePlayerVisual();

    // Mobile controls — directional arrow dpad
    const controls = document.createElement('div');
    controls.className = 'maze-controls dpad-container';
    controls.innerHTML = `
      <div class="maze-ctrl-row dpad-row">
        <button class="maze-ctrl-btn dpad-btn" data-dir="up" aria-label="Up">↑</button>
      </div>
      <div class="maze-ctrl-row dpad-row">
        <button class="maze-ctrl-btn dpad-btn" data-dir="left" aria-label="Left">←</button>
        <button class="maze-ctrl-btn dpad-btn" data-dir="down" aria-label="Down">↓</button>
        <button class="maze-ctrl-btn dpad-btn" data-dir="right" aria-label="Right">→</button>
      </div>
    `;
    controls.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._move(btn.dataset.dir);
      }, { passive: false });
      btn.addEventListener('click', () => this._move(btn.dataset.dir));
    });
    container.appendChild(controls);

    this._attachSwipe(grid);
  }

  _attachSwipe(target) {
    const THRESH = 24;
    let startX = 0, startY = 0, active = false;
    target.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      active = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    target.addEventListener('touchend', (e) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this._move(dx > 0 ? 'right' : 'left');
      } else {
        this._move(dy > 0 ? 'down' : 'up');
      }
    }, { passive: true });
  }

  // ───────────── Stone overlay (easter egg) ─────────────

  _showStoneOverlay(onProceed) {
    const overlay = document.createElement('div');
    overlay.className = 'sands-stone-overlay';
    overlay.innerHTML = `
      <div class="sands-stone">
        <div class="sands-stone-header">&#9888; TRAVELLER, BEWARE &#9888;</div>
        <div class="sands-stone-body">
          <p>The Sands take all who</p>
          <p>enter unprepared.</p>
          <p>The Hive is always hungry.</p>
        </div>
        <div class="sands-stone-footer">Last marked: 02.04.26</div>
        <button class="sands-stone-btn">PROCEED</button>
      </div>
    `;
    overlay.querySelector('.sands-stone-btn').addEventListener('click', () => {
      overlay.remove();
      onProceed();
    });
    this.container.appendChild(overlay);
  }

  // ───────────── Lifecycle ─────────────

  start() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    this._clearAllTimers();
    if (this.container) {
      this.container.innerHTML = '';
      delete this.container.dataset.region;
    }
  }

  _clearAllTimers() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const s = this.sinkState[r] && this.sinkState[r][c];
        if (s && s.timers) {
          s.timers.forEach(id => clearTimeout(id));
        }
      }
    }
  }

  _pauseAllTimers() {
    // Same as clear — once paused we don't resume these; reset rebuilds state
    this._clearAllTimers();
  }

  // ───────────── Input ─────────────

  _onKeyDown(e) {
    if (this.won || this.dead) return;
    if (!this.gridEl) return;
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', W: 'up', s: 'down', S: 'down',
      a: 'left', A: 'left', d: 'right', D: 'right',
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      this._move(dir);
    }
  }

  _move(dir) {
    if (this.won || this.dead) return;
    if (!this.gridEl) return;

    const [r, c] = this.playerPos;
    const deltas = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] };
    const [dr, dc] = deltas[dir];
    const nr = r + dr;
    const nc = c + dc;

    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return;

    const base = this.config.grid[nr][nc];
    if (base === TILE_WALL) return;

    // Block void tiles
    const state = this.sinkState[nr][nc];
    if (state && state.phase === 'void') return;

    // Move
    this.playerPos = [nr, nc];
    this._updatePlayerVisual();

    // Trigger sinking countdown on first step on a sinking tile
    if (base === TILE_SINKING && !state) {
      this._beginSink(nr, nc);
    }

    // Win check
    const [gr, gc] = this.config.gemPosition;
    if (nr === gr && nc === gc) {
      this._triggerWin();
      return;
    }

    // Death check: if player has no valid moves now
    if (this._isTrapped()) {
      this._triggerDeath();
    }
  }

  _updatePlayerVisual() {
    const [r, c] = this.playerPos;
    this.playerEl.style.transform =
      `translate(${c * this.tileSize}px, ${r * this.tileSize}px)`;
  }

  _isTrapped() {
    const [r, c] = this.playerPos;
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
      const base = this.config.grid[nr][nc];
      if (base === TILE_WALL) continue;
      const s = this.sinkState[nr][nc];
      if (s && s.phase === 'void') continue;
      return false;
    }
    return true;
  }

  // ───────────── Sinking logic ─────────────

  _beginSink(r, c) {
    const tile = this.tileEls[r][c];
    const state = { phase: 'fresh', timers: [] };
    this.sinkState[r][c] = state;

    const scale = 1 / this.sinkSpeed;
    const tWarn = T_WARNED_MS * scale;
    const tCrumble = T_CRUMBLING_MS * scale;
    const tVoid = T_VOID_MS * scale;

    state.timers.push(setTimeout(() => {
      if (this.dead || this.won) return;
      state.phase = 'warned';
      tile.classList.add('tile-sinking-warned');
    }, tWarn));

    state.timers.push(setTimeout(() => {
      if (this.dead || this.won) return;
      state.phase = 'crumbling';
      tile.classList.remove('tile-sinking-warned');
      tile.classList.add('tile-sinking-crumbling');
    }, tCrumble));

    state.timers.push(setTimeout(() => {
      if (this.dead || this.won) return;
      state.phase = 'void';
      tile.classList.remove('tile-sinking-warned', 'tile-sinking-crumbling');
      tile.classList.add('tile-void');

      // Death if player on this tile
      const [pr, pc] = this.playerPos;
      if (pr === r && pc === c) {
        this._triggerDeath();
        return;
      }

      // Check trapped
      if (this._isTrapped()) {
        this._triggerDeath();
      }
    }, tVoid));
  }

  // ───────────── Death ─────────────

  _triggerDeath() {
    if (this.dead || this.won) return;
    this.dead = true;
    this._pauseAllTimers();
    document.removeEventListener('keydown', this._onKeyDown);

    const overlay = document.createElement('div');
    overlay.className = 'sands-death-overlay';
    overlay.innerHTML = `
      <div class="sands-death-content">
        <h2 class="sands-death-title">The Sands claimed you.</h2>
        <p class="sands-death-text">The Hive adds your bones to its collection.</p>
        <button class="sands-death-btn">TRY AGAIN</button>
      </div>
    `;
    overlay.querySelector('.sands-death-btn').addEventListener('click', () => {
      overlay.remove();
      this._resetAfterDeath();
    });
    this.container.appendChild(overlay);
  }

  _resetAfterDeath() {
    this._clearAllTimers();

    // Reset tile visuals
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.tileEls[r][c];
        tile.classList.remove(
          'tile-sinking-warned',
          'tile-sinking-crumbling',
          'tile-void'
        );
        this.sinkState[r][c] = null;
      }
    }

    this.dead = false;
    this.playerPos = [...this.config.playerStart];
    this._updatePlayerVisual();
    document.addEventListener('keydown', this._onKeyDown);
  }

  // ───────────── Win ─────────────

  _triggerWin() {
    if (this.won) return;
    this.won = true;
    this._clearAllTimers();
    document.removeEventListener('keydown', this._onKeyDown);

    const overlay = document.createElement('div');
    overlay.className = 'maze-win-overlay sands-win-overlay';
    overlay.style.setProperty('--accent', this.config.accentColour);
    overlay.innerHTML = `
      <div class="maze-win-content">
        <div class="maze-win-gem sands-win-gem"></div>
        <h2 class="maze-win-title">${this.config.gemName} found!</h2>
        <p class="maze-win-text">The Hive did not expect cleverness.</p>
        <button class="maze-win-btn">CONTINUE</button>
      </div>
    `;
    overlay.querySelector('.maze-win-btn').addEventListener('click', () => {
      overlay.remove();
      this.onWin(this.config.id, this.config.gemName.toLowerCase());
    });
    this.container.appendChild(overlay);
  }
}

// engines/maze.js — Canvas-based maze engine.
// Preserves all prior behaviour (BFS solvability check, web/pipe obstacles,
// fan-mode hints, easter egg tile, Glus patrol, win/catch/egg overlays).
// Rendering and input are new: HTML5 Canvas + ResizeObserver + rAF loop.

import { getEgg } from '../main.js';

const CHAR_EGG = '?';

export class MazeEngine {
  constructor(config, gameState, onWin) {
    this.config = config;
    this.gameState = gameState;
    this.onWin = onWin;

    this.rows = config.grid.length;
    this.cols = config.grid[0].length;
    this.player = {
      row: config.playerStart[0],
      col: config.playerStart[1],
    };

    this.container = null;
    this.canvasBox = null;
    this.canvas = null;
    this.ctx = null;

    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this._cssWidth = 0;
    this._cssHeight = 0;

    this.won = false;
    this.caught = false;
    this.animFrame = null;
    this.resizeObserver = null;

    this.enemy = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onCanvasTap = this._onCanvasTap.bind(this);
    this._loop = this._loop.bind(this);
  }

  // ───────────── BFS solvability check ─────────────

  _verifySolvable() {
    const [sr, sc] = this.config.playerStart;
    const [gr, gc] = this.config.gemPosition;
    const grid = this.config.grid;
    const visited = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    const queue = [[sr, sc]];
    visited[sr][sc] = true;

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      if (r === gr && c === gc) return true;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols
          && !visited[nr][nc] && grid[nr][nc] !== 1 && grid[nr][nc] !== 2) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
    return false;
  }

  // ───────────── Colour palette ─────────────

  _colours() {
    const c = this.config.colours || {};
    const accent = this.config.accentColourHex || this.config.accentColour || '#f5c842';
    return {
      background: c.background || '#0a0604',
      wall:       c.wall       || '#1a1208',
      path:       c.path       || '#161008',
      accent,
      obstacle:   accent + 'aa',
      hintRing:   'rgba(245, 200, 66, 0.35)',
      egg:        '#f5c842',
      player:     '#f5c842',
      enemyFill:  '#1a0030',
      enemyGlow:  '#6a00aa',
    };
  }

  // ───────────── Render (setup) ─────────────

  render(container) {
    this.container = container;
    container.innerHTML = '';
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    if (!this._verifySolvable()) {
      console.warn(`MAZE WARNING: No valid path for region ${this.config.id}`);
    }

    // HUD
    const hud = document.createElement('div');
    hud.className = 'maze-hud';
    hud.innerHTML = `
      <span class="maze-hud-region">${this._getRegionDisplayName()}</span>
      <span class="maze-hud-goal">Find the ${this.config.gemName}</span>
    `;
    container.appendChild(hud);

    // Canvas wrapper (CSS decides size; canvas fills it)
    const box = document.createElement('div');
    box.className = 'maze-canvas-container';
    this.canvasBox = box;
    container.appendChild(box);

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    box.appendChild(canvas);

    canvas.addEventListener('click', this._onCanvasTap);

    // Beast vignette stays an HTML overlay
    if (this.config.id === 'beast') {
      const vignette = document.createElement('div');
      vignette.className = 'maze-vignette';
      box.appendChild(vignette);
    }

    this._resize();
    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(box);

    // Enemy (Glus) init
    if (this.config.enemy) {
      const path = this.config.enemy.patrolPath;
      const first = path[0];
      const second = path[1 % path.length];
      this.enemy = {
        row: first[0],
        col: first[1],
        targetRow: second[0],
        targetCol: second[1],
        progress: 0,
        // config.speed is tiles/second; convert to progress units at ~60fps
        speed: (this.config.enemy.speed || 1.5) / 60,
        pathIndex: 0,
      };
    }

    this._setupMobileControls();
    this._attachSwipe(canvas);
  }

  _resize() {
    const rect = this.canvasBox.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    const cellW = rect.width / this.cols;
    const cellH = rect.height / this.rows;
    this.cellSize = Math.floor(Math.min(cellW, cellH));
    this.offsetX = (rect.width - this.cellSize * this.cols) / 2;
    this.offsetY = (rect.height - this.cellSize * this.rows) / 2;
    this._cssWidth = rect.width;
    this._cssHeight = rect.height;
  }

  // ───────────── Lifecycle ─────────────

  start() {
    document.addEventListener('keydown', this._onKeyDown);
    this._loop();
  }

  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.animFrame = null;
    document.removeEventListener('keydown', this._onKeyDown);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.canvas) this.canvas.removeEventListener('click', this._onCanvasTap);
    if (this.container) {
      this.container.innerHTML = '';
      delete this.container.dataset.region;
    }
  }

  _loop() {
    if (!this.ctx) return;
    if (this.enemy) this._updateEnemy();
    this._draw();
    this.animFrame = requestAnimationFrame(this._loop);
  }

  // ───────────── Enemy update ─────────────

  _updateEnemy() {
    if (this.won || this.caught) return;
    const e = this.enemy;
    const path = this.config.enemy.patrolPath;

    e.progress += e.speed;
    if (e.progress >= 1) {
      e.progress = 0;
      e.row = e.targetRow;
      e.col = e.targetCol;
      e.pathIndex = (e.pathIndex + 1) % path.length;
      const next = path[(e.pathIndex + 1) % path.length];
      e.targetRow = next[0];
      e.targetCol = next[1];

      if (e.row === this.player.row && e.col === this.player.col) {
        this._triggerCatch();
      }
    }
  }

  // ───────────── Draw ─────────────

  _draw() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const col = this._colours();

    ctx.fillStyle = col.background;
    ctx.fillRect(0, 0, this._cssWidth, this._cssHeight);

    // Tiles
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.offsetX + c * cs;
        const y = this.offsetY + r * cs;
        const val = this.config.grid[r][c];
        if (val === 1) {
          ctx.fillStyle = col.wall;
          ctx.fillRect(x, y, cs, cs);
        } else {
          ctx.fillStyle = col.path;
          ctx.fillRect(x, y, cs, cs);
          if (val === 2) this._drawObstacle(x, y, cs);
        }
      }
    }

    // Fan-mode hint ring on hinted obstacle tiles
    if (this.gameState && this.gameState.mode === 'fan') {
      ctx.strokeStyle = col.hintRing;
      ctx.lineWidth = 1;
      for (const h of this.config.fanModeHints || []) {
        const [r, c] = h.position;
        const x = this.offsetX + c * cs;
        const y = this.offsetY + r * cs;
        ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
      }
    }

    // Easter egg tile (pulsing '?')
    if (this.gameState?.easterEggsEnabled !== false) {
      const eggTile = this.config.easterEggTile;
      const egg = getEgg('bicep_wennbar');
      if (egg && eggTile) {
        const x = this.offsetX + eggTile[1] * cs;
        const y = this.offsetY + eggTile[0] * cs;
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 500));
        ctx.fillStyle = col.egg;
        ctx.font = `bold ${Math.floor(cs * 0.55)}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(CHAR_EGG, x + cs / 2, y + cs / 2);
        ctx.restore();
      }
    }

    this._drawGem();
    if (this.enemy) this._drawEnemy();
    this._drawPlayer();
  }

  _drawObstacle(x, y, cs) {
    const ctx = this.ctx;
    const col = this._colours();
    const type = this.config.obstacles?.[0]?.type || 'web';

    ctx.save();
    ctx.strokeStyle = col.obstacle;
    ctx.lineWidth = Math.max(1.2, cs * 0.05);
    ctx.lineCap = 'round';

    if (type === 'pipe') {
      ctx.beginPath();
      ctx.moveTo(x + cs * 0.15, y + cs * 0.35);
      ctx.lineTo(x + cs * 0.85, y + cs * 0.35);
      ctx.moveTo(x + cs * 0.15, y + cs * 0.65);
      ctx.lineTo(x + cs * 0.85, y + cs * 0.65);
      ctx.stroke();
    } else {
      // web: X pattern + diagonals
      ctx.beginPath();
      ctx.moveTo(x + cs * 0.2, y + cs * 0.2);
      ctx.lineTo(x + cs * 0.8, y + cs * 0.8);
      ctx.moveTo(x + cs * 0.8, y + cs * 0.2);
      ctx.lineTo(x + cs * 0.2, y + cs * 0.8);
      ctx.moveTo(x + cs * 0.5, y + cs * 0.15);
      ctx.lineTo(x + cs * 0.5, y + cs * 0.85);
      ctx.moveTo(x + cs * 0.15, y + cs * 0.5);
      ctx.lineTo(x + cs * 0.85, y + cs * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawGem() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const col = this._colours();
    const [gr, gc] = this.config.gemPosition;
    const x = this.offsetX + gc * cs + cs / 2;
    const y = this.offsetY + gr * cs + cs / 2;
    const pulse = 1 + 0.18 * Math.sin(Date.now() / 400);
    const size = cs * 0.42 * pulse;

    ctx.save();
    ctx.shadowColor = col.accent;
    ctx.shadowBlur = cs * 0.55 * pulse;
    ctx.fillStyle = col.accent;
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  _drawPlayer() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const col = this._colours();
    const x = this.offsetX + this.player.col * cs + cs / 2;
    const y = this.offsetY + this.player.row * cs + cs / 2;
    const size = cs * 0.5;

    ctx.save();
    ctx.shadowColor = col.player;
    ctx.shadowBlur = cs * 0.45;
    ctx.fillStyle = col.player;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  _drawEnemy() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const col = this._colours();
    const e = this.enemy;
    const drawR = e.row + (e.targetRow - e.row) * e.progress;
    const drawC = e.col + (e.targetCol - e.col) * e.progress;
    const x = this.offsetX + drawC * cs + cs / 2;
    const y = this.offsetY + drawR * cs + cs / 2;
    const radius = cs * 0.32;

    ctx.save();
    ctx.shadowColor = col.enemyGlow;
    ctx.shadowBlur = cs * 0.6;
    ctx.fillStyle = col.enemyFill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = col.enemyGlow;
    ctx.lineWidth = Math.max(1.5, cs * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  // ───────────── Input ─────────────

  _onKeyDown(e) {
    if (this.won || this.caught) return;
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
    if (this.won || this.caught) return;
    const deltas = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dr, dc] = deltas[dir];
    const nr = this.player.row + dr;
    const nc = this.player.col + dc;

    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return;
    const target = this.config.grid[nr][nc];
    if (target === 1 || target === 2) return;

    this.player.row = nr;
    this.player.col = nc;

    // Easter egg tile trigger on entry
    const eggTile = this.config.easterEggTile;
    if (eggTile && nr === eggTile[0] && nc === eggTile[1]) {
      const egg = getEgg('bicep_wennbar');
      if (egg) this._showInfoPopup('FIELD NOTES', egg.content.text);
    }

    // Enemy collision on move
    if (this.enemy && nr === this.enemy.row && nc === this.enemy.col) {
      this._triggerCatch();
      return;
    }

    // Win
    const [gr, gc] = this.config.gemPosition;
    if (nr === gr && nc === gc) {
      this._triggerWin();
    }
  }

  _onCanvasTap(e) {
    if (this.won || this.caught) return;
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left - this.offsetX;
    const py = e.clientY - rect.top - this.offsetY;
    if (px < 0 || py < 0) return;
    const c = Math.floor(px / this.cellSize);
    const r = Math.floor(py / this.cellSize);
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;

    // Easter egg tile tap
    const eggTile = this.config.easterEggTile;
    if (eggTile && r === eggTile[0] && c === eggTile[1]) {
      const egg = getEgg('bicep_wennbar');
      if (egg) this._showInfoPopup('FIELD NOTES', egg.content.text);
      return;
    }

    // Fan mode: tap an obstacle with a hint
    if (this.gameState?.mode === 'fan') {
      const hint = (this.config.fanModeHints || []).find(
        h => h.position[0] === r && h.position[1] === c
      );
      if (hint) this._showInfoPopup('HINT', hint.text);
    }
  }

  _setupMobileControls() {
    const dpad = document.createElement('div');
    dpad.className = 'maze-controls dpad-container';
    dpad.innerHTML = `
      <div class="dpad-row">
        <button class="dpad-btn" data-dir="up" aria-label="Up">↑</button>
      </div>
      <div class="dpad-row">
        <button class="dpad-btn" data-dir="left" aria-label="Left">←</button>
        <button class="dpad-btn" data-dir="down" aria-label="Down">↓</button>
        <button class="dpad-btn" data-dir="right" aria-label="Right">→</button>
      </div>
    `;
    dpad.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._move(btn.dataset.dir);
      }, { passive: false });
      btn.addEventListener('click', () => this._move(btn.dataset.dir));
    });
    this.container.appendChild(dpad);
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

  // ───────────── Overlays ─────────────

  _triggerCatch() {
    this.caught = true;
    document.removeEventListener('keydown', this._onKeyDown);

    const overlay = document.createElement('div');
    overlay.className = 'maze-catch-overlay';
    overlay.innerHTML = `
      <div class="maze-catch-content">
        <h2 class="maze-catch-title">The Glus found you.</h2>
        <p class="maze-catch-text">The walls close in.</p>
        <button class="maze-catch-btn">TRY AGAIN</button>
      </div>
    `;
    overlay.querySelector('.maze-catch-btn').addEventListener('click', () => {
      overlay.remove();
      this._resetAfterCatch();
    });
    this.container.appendChild(overlay);
  }

  _resetAfterCatch() {
    this.caught = false;
    this.player.row = this.config.playerStart[0];
    this.player.col = this.config.playerStart[1];
    if (this.enemy) {
      const path = this.config.enemy.patrolPath;
      this.enemy.row = path[0][0];
      this.enemy.col = path[0][1];
      const nxt = path[1 % path.length];
      this.enemy.targetRow = nxt[0];
      this.enemy.targetCol = nxt[1];
      this.enemy.progress = 0;
      this.enemy.pathIndex = 0;
    }
    document.addEventListener('keydown', this._onKeyDown);
  }

  _triggerWin() {
    this.won = true;
    document.removeEventListener('keydown', this._onKeyDown);

    const overlay = document.createElement('div');
    overlay.className = 'maze-win-overlay';
    overlay.style.setProperty('--accent', this.config.accentColour);
    overlay.innerHTML = `
      <div class="maze-win-content">
        <div class="maze-win-gem"></div>
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

  _showInfoPopup(label, text) {
    if (this.container.querySelector('.maze-egg-popup')) return;
    const popup = document.createElement('div');
    popup.className = 'maze-egg-popup';
    popup.innerHTML = `
      <div class="maze-egg-popup-inner">
        <p class="maze-egg-label">${label}</p>
        <p class="maze-egg-text">${text}</p>
        <button class="maze-egg-close">OK</button>
      </div>
    `;
    popup.querySelector('.maze-egg-close').addEventListener('click', () => popup.remove());
    this.container.appendChild(popup);
  }

  _getRegionDisplayName() {
    const names = {
      forests: 'Forests of Silence',
      beast: 'Maze of the Beast',
    };
    return names[this.config.id] || this.config.id;
  }
}

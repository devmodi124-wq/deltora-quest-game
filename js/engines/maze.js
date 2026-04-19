// engines/maze.js — shared maze engine

import { getEgg } from '../main.js';

export class MazeEngine {
  constructor(config, gameState, onWin) {
    this.config = config;
    this.gameState = gameState;
    this.onWin = onWin;

    this.playerPos = [...config.playerStart];
    this.rows = config.grid.length;
    this.cols = config.grid[0].length;
    this.tileSize = config.tileSize;
    this.container = null;
    this.mazeEl = null;
    this.playerEl = null;
    this.enemyEl = null;
    this.won = false;
    this.caught = false;
    this.patrolIndex = 0;
    this.patrolInterval = null;

    this._onKeyDown = this._onKeyDown.bind(this);
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
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
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

  // ───────────── Render ─────────────

  render(container) {
    this.container = container;
    container.innerHTML = '';

    if (!this._verifySolvable()) {
      console.warn(`MAZE WARNING: No valid path from start to gem in region ${this.config.id}`);
    }

    // Set accent + region on the container
    container.style.setProperty('--accent', this.config.accentColour);
    container.dataset.region = this.config.id;

    // HUD
    const hud = document.createElement('div');
    hud.className = 'maze-hud';
    hud.innerHTML = `
      <span class="maze-hud-region">${this._getRegionDisplayName()}</span>
      <span class="maze-hud-goal">Find the ${this.config.gemName}</span>
    `;
    container.appendChild(hud);

    // Maze grid
    const maze = document.createElement('div');
    maze.className = 'maze-grid';
    maze.style.gridTemplateColumns = `repeat(${this.cols}, ${this.tileSize}px)`;
    maze.style.gridTemplateRows = `repeat(${this.rows}, ${this.tileSize}px)`;

    const [gemR, gemC] = this.config.gemPosition;
    const eggTile = this.config.easterEggTile || null;
    const egg = getEgg('bicep_wennbar');

    // Determine obstacle character based on type
    const obstacleType = this.config.obstacles.length > 0
      ? this.config.obstacles[0].type : 'web';
    const obstacleChar = obstacleType === 'pipe' ? '\u2248' : '\u2726';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = document.createElement('div');
        tile.className = 'maze-tile';
        tile.dataset.row = r;
        tile.dataset.col = c;

        const val = this.config.grid[r][c];
        if (val === 1) {
          tile.classList.add('maze-wall');
        } else if (val === 2) {
          tile.classList.add('maze-obstacle');
          if (obstacleType === 'pipe') tile.classList.add('maze-pipe');
          tile.textContent = obstacleChar;
          // Fan mode hint
          if (this.gameState.mode === 'fan') {
            const hint = this.config.fanModeHints.find(
              h => h.position[0] === r && h.position[1] === c
            );
            if (hint) {
              tile.title = hint.text;
              tile.classList.add('maze-hint');
            }
          }
        } else {
          tile.classList.add('maze-path');

          // Gem tile
          if (r === gemR && c === gemC) {
            tile.classList.add('maze-gem');
            tile.textContent = '\u25C6';
          }

          // Easter egg tile
          if (egg && eggTile && r === eggTile[0] && c === eggTile[1]) {
            tile.classList.add('maze-egg');
            tile.textContent = '?';
            tile.addEventListener('click', () => {
              this._showEggPopup(egg.content.text);
            });
          }
        }

        maze.appendChild(tile);
      }
    }

    // Player
    const player = document.createElement('div');
    player.className = 'maze-player';
    this.playerEl = player;
    maze.appendChild(player);

    // Enemy (if configured)
    if (this.config.enemy) {
      const enemy = document.createElement('div');
      enemy.className = 'maze-enemy';
      if (this.config.enemy.sprite) {
        enemy.classList.add(`maze-enemy-${this.config.enemy.sprite}`);
      }
      this.enemyEl = enemy;
      maze.appendChild(enemy);
      this._updateEnemyVisual(this.config.enemy.patrolPath[0]);
    }

    // Vignette overlay for beast region
    if (this.config.id === 'beast') {
      const vignette = document.createElement('div');
      vignette.className = 'maze-vignette';
      maze.appendChild(vignette);
    }

    this.mazeEl = maze;
    container.appendChild(maze);
    this._updatePlayerVisual();

    // Mobile controls
    const controls = document.createElement('div');
    controls.className = 'maze-controls';
    controls.innerHTML = `
      <div class="maze-ctrl-row">
        <button class="maze-ctrl-btn" data-dir="up">W</button>
      </div>
      <div class="maze-ctrl-row">
        <button class="maze-ctrl-btn" data-dir="left">A</button>
        <button class="maze-ctrl-btn" data-dir="down">S</button>
        <button class="maze-ctrl-btn" data-dir="right">D</button>
      </div>
    `;
    controls.querySelectorAll('.maze-ctrl-btn').forEach(btn => {
      btn.addEventListener('click', () => this._move(btn.dataset.dir));
    });
    container.appendChild(controls);
  }

  // ───────────── Start / Destroy ─────────────

  start() {
    document.addEventListener('keydown', this._onKeyDown);
    this._startEnemyPatrol();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    this._stopEnemyPatrol();
    if (this.container) {
      this.container.innerHTML = '';
      delete this.container.dataset.region;
    }
  }

  // ───────────── Enemy Patrol ─────────────

  _startEnemyPatrol() {
    if (!this.config.enemy || !this.enemyEl) return;

    const path = this.config.enemy.patrolPath;
    const intervalMs = 1000 / this.config.enemy.speed;

    this.patrolIndex = 0;
    this._updateEnemyVisual(path[0]);

    this.patrolInterval = setInterval(() => {
      if (this.won || this.caught) return;

      this.patrolIndex = (this.patrolIndex + 1) % path.length;
      const [er, ec] = path[this.patrolIndex];
      this._updateEnemyVisual([er, ec]);

      // Check collision with player
      const [pr, pc] = this.playerPos;
      if (pr === er && pc === ec) {
        this._triggerCatch();
      }
    }, intervalMs);
  }

  _stopEnemyPatrol() {
    if (this.patrolInterval !== null) {
      clearInterval(this.patrolInterval);
      this.patrolInterval = null;
    }
  }

  _updateEnemyVisual(pos) {
    if (!this.enemyEl) return;
    const [r, c] = pos;
    this.enemyEl.style.transform =
      `translate(${c * this.tileSize}px, ${r * this.tileSize}px)`;
  }

  // ───────────── Catch (enemy collision) ─────────────

  _triggerCatch() {
    this.caught = true;
    this._stopEnemyPatrol();
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
    this.playerPos = [...this.config.playerStart];
    this._updatePlayerVisual();

    // Reset enemy to patrol start
    this.patrolIndex = 0;
    if (this.config.enemy) {
      this._updateEnemyVisual(this.config.enemy.patrolPath[0]);
    }

    // Re-enable input and patrol
    document.addEventListener('keydown', this._onKeyDown);
    this._startEnemyPatrol();
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

    const [r, c] = this.playerPos;
    const deltas = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] };
    const [dr, dc] = deltas[dir];
    const nr = r + dr;
    const nc = c + dc;

    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return;

    const target = this.config.grid[nr][nc];
    if (target === 1 || target === 2) return;

    this.playerPos = [nr, nc];
    this._updatePlayerVisual();

    // Check adjacency to gem for pulse effect
    this._checkGemProximity();

    // Check enemy collision
    if (this.config.enemy && this.enemyEl) {
      const path = this.config.enemy.patrolPath;
      const [er, ec] = path[this.patrolIndex];
      if (nr === er && nc === ec) {
        this._triggerCatch();
        return;
      }
    }

    // Check win
    const [gr, gc] = this.config.gemPosition;
    if (nr === gr && nc === gc) {
      this._triggerWin();
    }
  }

  _updatePlayerVisual() {
    const [r, c] = this.playerPos;
    this.playerEl.style.transform =
      `translate(${c * this.tileSize}px, ${r * this.tileSize}px)`;
  }

  _checkGemProximity() {
    const [pr, pc] = this.playerPos;
    const [gr, gc] = this.config.gemPosition;
    const dist = Math.abs(pr - gr) + Math.abs(pc - gc);
    const gemTile = this.mazeEl.querySelector('.maze-gem');
    if (gemTile) {
      gemTile.classList.toggle('maze-gem-near', dist <= 2);
    }
  }

  // ───────────── Win ─────────────

  _triggerWin() {
    this.won = true;
    this._stopEnemyPatrol();
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

  // ───────────── Easter Egg Popup ─────────────

  _showEggPopup(text) {
    if (this.container.querySelector('.maze-egg-popup')) return;

    const popup = document.createElement('div');
    popup.className = 'maze-egg-popup';
    popup.innerHTML = `
      <div class="maze-egg-popup-inner">
        <p class="maze-egg-label">FIELD NOTES</p>
        <p class="maze-egg-text">${text}</p>
        <button class="maze-egg-close">OK</button>
      </div>
    `;
    popup.querySelector('.maze-egg-close').addEventListener('click', () => popup.remove());
    this.container.appendChild(popup);
  }

  // ───────────── Helpers ─────────────

  _getRegionDisplayName() {
    const names = {
      forests: 'Forests of Silence',
      beast: 'Maze of the Beast',
    };
    return names[this.config.id] || this.config.id;
  }
}

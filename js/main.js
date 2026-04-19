// main.js — app init and screen router

import { easterEggs, regions, gemPowers } from './data.js';
import { audioManager } from './audio.js';
import {
  initMap,
  updateBelt,
  setOnEnterRegion,
  setOnSettingsRequest,
  getBeltSlotRect,
} from './map.js';
import { MazeEngine } from './engines/maze.js';
import { SandsEngine } from './engines/sands.js';
import { DialogueEngine } from './engines/dialogue.js';
import { MemoryEngine } from './engines/memory.js';
import { RiddleEngine } from './engines/riddle.js';
import { forestsConfig } from './regions/forests.js';
import { beastConfig } from './regions/beast.js';
import { sandsConfig } from './regions/sands.js';
import { lakeConfig } from './regions/lake.js';
import { ratsConfig } from './regions/rats.js';
import { dreadConfig } from './regions/dread.js';
import { valleyConfig } from './regions/valley.js';

// ───────────── Game State ─────────────

const gameState = {
  mode: null,
  gemsCollected: [],
  regionsVisited: [],
  easterEggsEnabled: true,
};

const TOTAL_GEMS = 7;

// ───────────── Screen Router ─────────────

let isTransitioning = false;

function showScreen(id, direction = 'fade') {
  const target = document.getElementById(`screen-${id}`);
  if (!target) { console.error('[showScreen] no target for', id); return; }

  const current = document.querySelector('.screen:not(.hidden)');
  console.log('[showScreen]', { id, direction, currentId: current?.id, targetId: target.id });
  if (current === target) { console.warn('[showScreen] current===target, skip', id); return; }

  const enter = () => {
    target.classList.remove('hidden');
    void target.offsetWidth;
    target.classList.add(`screen-enter-${direction}`);
    const done = () => {
      target.classList.remove(`screen-enter-${direction}`);
      isTransitioning = false;
      console.log('[showScreen] enter complete:', id);
    };
    // Fallback: if animationend never fires, complete after 600ms
    const fallback = setTimeout(done, 600);
    target.addEventListener('animationend', () => {
      clearTimeout(fallback);
      done();
    }, { once: true });
  };

  if (!current) {
    enter();
    return;
  }

  isTransitioning = true;
  current.classList.add(`screen-exit-${direction}`);
  const exited = () => {
    current.classList.remove(`screen-exit-${direction}`);
    current.classList.add('hidden');
    console.log('[showScreen] exit complete:', current.id);
    enter();
  };
  const exitFallback = setTimeout(exited, 500);
  current.addEventListener('animationend', () => {
    clearTimeout(exitFallback);
    exited();
  }, { once: true });
}

// ───────────── Easter Egg Utility ─────────────

export function getEgg(id) {
  if (!gameState.easterEggsEnabled) return null;
  if (!easterEggs.masterSwitch) return null;
  const egg = easterEggs.eggs.find(e => e.id === id);
  return (egg && egg.enabled) ? egg : null;
}

// ───────────── LocalStorage ─────────────

const STORAGE_KEY = 'deltora_state';
const MODE_KEY = 'deltora_mode';

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  if (gameState.mode) {
    localStorage.setItem(MODE_KEY, gameState.mode);
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    if (saved.mode) {
      gameState.mode = saved.mode;
      gameState.gemsCollected = saved.gemsCollected || [];
      gameState.regionsVisited = saved.regionsVisited || [];
      gameState.easterEggsEnabled = saved.easterEggsEnabled ?? true;
      return true;
    }
  } catch {
    // corrupted data — start fresh
  }
  return false;
}

function clearAllProgress() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(MODE_KEY);
  gameState.mode = null;
  gameState.gemsCollected = [];
  gameState.regionsVisited = [];
  gameState.easterEggsEnabled = true;
}

// ───────────── Boot Screen ─────────────

function initBoot() {
  const advance = () => {
    ensureAudioStarted();
    showScreen('mode', 'fade');
    document.removeEventListener('keydown', onKey);
    document.getElementById('screen-boot').removeEventListener('click', advance);
  };

  const onKey = (e) => {
    if (e.key === 'Enter') advance();
  };

  document.addEventListener('keydown', onKey);
  document.getElementById('screen-boot').addEventListener('click', advance);
}

// ───────────── Mode Select ─────────────

function initModeSelect() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', () => {
      ensureAudioStarted();
      gameState.mode = fresh.dataset.mode;
      saveState();
      goToMap('fade');
    });
  });
}

// ───────────── Audio ─────────────

const MUTED_KEY = 'deltora_muted';
let audioStarted = false;

function loadMuteState() {
  const raw = localStorage.getItem(MUTED_KEY);
  const muted = raw === '1' || raw === 'true';
  audioManager.muted = muted;
  return muted;
}

function saveMuteState() {
  localStorage.setItem(MUTED_KEY, audioManager.isMuted() ? '1' : '0');
}

function ensureAudioStarted() {
  if (audioStarted) return;
  audioStarted = true;
  audioManager.init();
  // Boot/mode select uses 'map' track at 50% gain
  audioManager.play('map', { gainMultiplier: 0.5 });
}

function initMuteButton() {
  let btn = document.getElementById('mute-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'mute-btn';
    btn.className = 'mute-btn';
    btn.setAttribute('aria-label', 'Mute');
    document.body.appendChild(btn);
  }
  const updateIcon = () => {
    btn.textContent = audioManager.isMuted() ? '\u{1F507}' : '\u{1F50A}';
    btn.classList.toggle('muted', audioManager.isMuted());
  };
  updateIcon();

  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', () => {
    ensureAudioStarted();
    if (audioManager.isMuted()) audioManager.unmute();
    else audioManager.mute();
    saveMuteState();
    fresh.textContent = audioManager.isMuted() ? '\u{1F507}' : '\u{1F50A}';
    fresh.classList.toggle('muted', audioManager.isMuted());
  });
}

// ───────────── Map ─────────────

function goToMap(direction = 'down') {
  showScreen('map', direction);
  initMap(gameState);
  updateBelt(gameState.gemsCollected);
  if (audioStarted) audioManager.play('map');
}

// ───────────── Region Intro ─────────────

const REGION_CONFIGS = {
  forests: forestsConfig,
  beast: beastConfig,
  sands: sandsConfig,
  lake: lakeConfig,
  rats: ratsConfig,
  dread: dreadConfig,
  valley: valleyConfig,
};

const REGION_ENGINES = {
  maze: MazeEngine,
  sands: SandsEngine,
  dialogue: DialogueEngine,
  memory: MemoryEngine,
  riddle: RiddleEngine,
};

let activeMaze = null;

function showRegionIntro(regionData) {
  console.log('[showRegionIntro] called with', regionData.id, regionData.name);
  const screen = document.getElementById('screen-region');
  const introText = gameState.mode === 'fan'
    ? regionData.introFan
    : regionData.introExplorer;

  screen.querySelector('.region-intro-name').textContent = regionData.name;
  screen.querySelector('.region-intro-name').style.color = regionData.accentColour;
  screen.querySelector('.region-intro-text').textContent = introText;
  screen.querySelector('.region-intro-gem').textContent =
    `Gem: ${regionData.gem} \u2014 ${regionData.gemPower}`;

  // Easter egg: dog-eared Kin sprite on Dread Mountain intro
  const content = screen.querySelector('.region-intro-content');
  const existingKin = content.querySelector('.intro-kin');
  if (existingKin) existingKin.remove();
  if (regionData.id === 'dread' && getEgg('dog_kin')) {
    const kin = document.createElement('div');
    kin.className = 'intro-kin';
    kin.innerHTML = `
      <div class="intro-kin-ear intro-kin-ear-l"></div>
      <div class="intro-kin-ear intro-kin-ear-r"></div>
      <div class="intro-kin-head"></div>
      <div class="intro-kin-body"></div>
      <div class="intro-kin-label">Kin</div>
    `;
    content.appendChild(kin);
  }

  const enterBtn = screen.querySelector('.region-intro-enter');
  enterBtn.textContent = `\u25B6 ENTER THE ${regionData.name.toUpperCase().split(' ').pop()}`;
  enterBtn.style.setProperty('--accent', regionData.accentColour);

  const fresh = enterBtn.cloneNode(true);
  enterBtn.parentNode.replaceChild(fresh, enterBtn);

  fresh.addEventListener('click', () => {
    launchMaze(regionData);
  });

  showScreen('region', 'up');

  // Diagnostic: log computed state of screen-region after transition settles
  setTimeout(() => {
    const s = document.getElementById('screen-region');
    const cs = getComputedStyle(s);
    const rect = s.getBoundingClientRect();
    const name = s.querySelector('.region-intro-name').textContent;
    const text = s.querySelector('.region-intro-text').textContent.slice(0, 60);
    console.log('[region DIAG]', {
      classList: s.className,
      display: cs.display,
      opacity: cs.opacity,
      visibility: cs.visibility,
      zIndex: cs.zIndex,
      position: cs.position,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      name,
      textStart: text,
    });
    // Also log what OTHER screens look like
    document.querySelectorAll('.screen').forEach(sc => {
      const c = getComputedStyle(sc);
      console.log('  [screen]', sc.id, 'display:', c.display, 'classes:', sc.className);
    });
  }, 1200);
}

function launchMaze(regionData) {
  const config = REGION_CONFIGS[regionData.id];
  if (!config) return;

  // Switch music to region track
  if (audioStarted && regionData.audioTrack) {
    audioManager.play(regionData.audioTrack);
  }

  // Show loading briefly
  const loader = document.getElementById('loading-overlay');
  loader.querySelector('.loading-text').textContent = `Entering ${regionData.name}...`;
  loader.classList.remove('hidden');
  void loader.offsetWidth;
  loader.classList.add('loading-visible');

  setTimeout(() => {
    showScreen('game', 'fade');
    const container = document.getElementById('game-container');

    if (activeMaze) {
      activeMaze.destroy();
    }

    const EngineClass = REGION_ENGINES[regionData.engineType] || MazeEngine;
    activeMaze = new EngineClass(config, gameState, onWin);
    activeMaze.render(container);
    activeMaze.start();

    loader.classList.remove('loading-visible');
    setTimeout(() => loader.classList.add('hidden'), 400);
  }, 350);
}

// ───────────── Win Handler ─────────────

let pendingGem = null;   // { gemName, accentColour }

function onWin(regionId, gemName) {
  const isNew = !gameState.gemsCollected.includes(gemName);
  if (isNew) gameState.gemsCollected.push(gemName);
  if (!gameState.regionsVisited.includes(regionId)) {
    gameState.regionsVisited.push(regionId);
  }
  saveState();

  // Collect accent for animation
  const regionData = regions.find(r => r.id === regionId);
  const accent = regionData ? regionData.accentColour : 'var(--gold)';

  if (activeMaze) {
    activeMaze.destroy();
    activeMaze = null;
  }

  pendingGem = isNew ? { gemName, accent } : null;
  goToMap('down');

  // After map fade completes, play belt animation
  setTimeout(() => {
    if (pendingGem) {
      playBeltAnimation(pendingGem.gemName, pendingGem.accent);
      pendingGem = null;
    }
  }, 500);
}

// ───────────── Belt Fly-In Animation ─────────────

function playBeltAnimation(gemName, accentColour) {
  const target = getBeltSlotRect(gemName);
  if (!target) return;

  // Dim other slots briefly
  const belt = document.getElementById('belt-progress');
  belt.classList.add('belt-incoming');

  // Create flying gem at viewport centre
  const fly = document.createElement('div');
  fly.className = 'belt-fly-gem';
  fly.style.setProperty('--accent', accentColour);
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;
  fly.style.left = `${startX - 24}px`;
  fly.style.top = `${startY - 24}px`;
  document.body.appendChild(fly);

  // Force reflow then animate to slot
  void fly.offsetWidth;
  const targetX = target.rect.left + target.rect.width / 2 - 24;
  const targetY = target.rect.top + target.rect.height / 2 - 24;
  fly.style.transition = 'transform 0.6s cubic-bezier(0.5, 0, 0.3, 1), opacity 0.6s';
  fly.style.transform = `translate(${targetX - (startX - 24)}px, ${targetY - (startY - 24)}px) scale(0.55)`;

  setTimeout(() => {
    fly.remove();
    belt.classList.remove('belt-incoming');

    // Mark slot collected + pulse + ring
    updateBelt(gameState.gemsCollected);
    const slot = target.el;
    slot.classList.add('belt-gem-slot-in');

    const ring = document.createElement('span');
    ring.className = 'belt-slot-ring';
    ring.style.setProperty('--accent', accentColour);
    slot.appendChild(ring);
    setTimeout(() => ring.remove(), 900);

    setTimeout(() => {
      slot.classList.remove('belt-gem-slot-in');
      // Combo pulse on all collected
      updateBelt(gameState.gemsCollected, { pulse: true });

      // End check
      if (gameState.gemsCollected.length >= TOTAL_GEMS) {
        setTimeout(() => goToEndScreen(), 1000);
      }
    }, 400);
  }, 620);
}

// ───────────── End Screen ─────────────

const BELT_ORDER = [
  { gem: 'diamond',       accent: 'var(--valley-violet)' },
  { gem: 'emerald',       accent: 'var(--mountain-teal)' },
  { gem: 'lapis-lazuli',  accent: 'var(--sands-amber)' },
  { gem: 'topaz',         accent: 'var(--forest-green)' },
  { gem: 'opal',          accent: 'var(--rat-grey)' },
  { gem: 'ruby',          accent: 'var(--lake-blue)' },
  { gem: 'amethyst',      accent: 'var(--beast-purple)' },
];

function goToEndScreen() {
  const screen = document.getElementById('screen-end');
  const slots = screen.querySelector('.end-belt-slots');
  slots.innerHTML = '';
  BELT_ORDER.forEach((g, i) => {
    const s = document.createElement('div');
    s.className = 'end-gem';
    s.style.setProperty('--accent', g.accent);
    s.style.setProperty('--pulse-delay', `${(i * 0.27).toFixed(2)}s`);
    slots.appendChild(s);
  });

  const linesEl = screen.querySelector('.end-lines');
  linesEl.innerHTML = '';
  const restartBtn = screen.querySelector('.end-restart-btn');
  restartBtn.classList.add('hidden');

  const fanLines = [
    { text: 'The Belt of Deltora is complete.', pause: 1500 },
    { text: 'Seven gems. Seven tribes. One land.', pause: 1500 },
    { text: 'The Shadow Lord is driven back to the Shadowlands.', pause: 2000 },
    { text: 'Deltora is free.', pause: 2000 },
    { text: 'Well played.', pause: 500, gold: true, large: true },
  ];
  const explorerLines = [
    { text: 'The Belt of Deltora is complete.', pause: 1500 },
    { text: 'Seven gems. Seven tribes. One land.', pause: 1500 },
    { text: 'This is only the beginning.', pause: 1500 },
    { text: "Lief, Barda and Jasmine's full story spans eight books \u2014 and the world of Deltora spans fifteen.", pause: 2000 },
    { text: 'Read the series.', pause: 500, gold: true, large: true },
    { text: 'Deltora Quest by Emily Rodda \u2014 available wherever books are sold.', pause: 500, small: true },
  ];

  const lines = gameState.mode === 'explorer' ? explorerLines : fanLines;

  showScreen('end', 'fade');

  setTimeout(() => {
    playEndLines(linesEl, lines, 0, () => {
      restartBtn.classList.remove('hidden');
      const fresh = restartBtn.cloneNode(true);
      restartBtn.parentNode.replaceChild(fresh, restartBtn);
      fresh.addEventListener('click', () => {
        clearAllProgress();
        showScreen('boot', 'fade');
        setTimeout(() => initBoot(), 100);
      });
    });
  }, 1100);
}

function playEndLines(container, lines, idx, onDone) {
  if (idx >= lines.length) {
    onDone();
    return;
  }
  const line = lines[idx];
  const p = document.createElement('p');
  p.className = 'end-line';
  if (line.gold) p.classList.add('end-line-gold');
  if (line.large) p.classList.add('end-line-large');
  if (line.small) p.classList.add('end-line-small');
  container.appendChild(p);

  const text = line.text;
  let i = 0;
  const TYPE_MS = 40;
  const step = () => {
    if (i >= text.length) {
      setTimeout(() => playEndLines(container, lines, idx + 1, onDone), line.pause);
      return;
    }
    p.textContent += text.charAt(i);
    i += 1;
    setTimeout(step, TYPE_MS);
  };
  step();
}

// ───────────── Settings ─────────────

function openSettings() {
  let overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'settings-overlay';
  overlay.innerHTML = `
    <div class="settings-panel">
      <h2 class="settings-title">SETTINGS</h2>

      <div class="settings-row">
        <div class="settings-row-label">Easter Eggs</div>
        <label class="toggle">
          <input type="checkbox" id="egg-toggle" ${gameState.easterEggsEnabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <div class="settings-row-sub">Hidden surprises for those who know where to look.</div>
      </div>

      <div class="settings-row">
        <div class="settings-row-label">Mode</div>
        <div class="settings-row-value">Current: <span class="settings-mode">${gameState.mode === 'fan' ? 'Fan' : 'Explorer'}</span></div>
        <button class="settings-btn settings-btn-danger" id="switch-mode-btn">SWITCH MODE</button>
      </div>

      <button class="settings-btn settings-close-btn">CLOSE</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings();
  });

  overlay.querySelector('#egg-toggle').addEventListener('change', (e) => {
    gameState.easterEggsEnabled = e.target.checked;
    saveState();
  });

  overlay.querySelector('#switch-mode-btn').addEventListener('click', () => {
    showConfirm(
      'Switching mode will reset your progress. Continue?',
      () => {
        clearAllProgress();
        closeSettings();
        showScreen('mode', 'fade');
        initModeSelect();
      }
    );
  });

  overlay.querySelector('.settings-close-btn').addEventListener('click', closeSettings);
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.remove();
}

function showConfirm(text, onConfirm) {
  const dlg = document.createElement('div');
  dlg.className = 'confirm-overlay';
  dlg.innerHTML = `
    <div class="confirm-panel">
      <p class="confirm-text">${text}</p>
      <div class="confirm-buttons">
        <button class="settings-btn confirm-yes">YES</button>
        <button class="settings-btn confirm-no">CANCEL</button>
      </div>
    </div>
  `;
  document.body.appendChild(dlg);
  dlg.querySelector('.confirm-yes').addEventListener('click', () => {
    dlg.remove();
    onConfirm();
  });
  dlg.querySelector('.confirm-no').addEventListener('click', () => dlg.remove());
}

// ───────────── App Init ─────────────

function init() {
  const hasState = loadState();
  loadMuteState();
  initMuteButton();

  setOnEnterRegion(showRegionIntro);
  setOnSettingsRequest(openSettings);

  if (hasState && gameState.mode) {
    goToMap('fade');
  } else {
    showScreen('boot', 'fade');
    initBoot();
  }

  initModeSelect();

  const backBtn = document.getElementById('region-back-btn');
  if (backBtn) {
    const fresh = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(fresh, backBtn);
    fresh.addEventListener('click', () => goToMap('down'));
  }
}

// Console testing helpers
window.__deltora = {
  gameState,
  updateBelt,
  showScreen,
  saveState,
  goToEndScreen,
  clearAllProgress,
};

init();

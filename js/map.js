// map.js — map screen logic

import { regions } from './data.js';

const REGION_DATA = [
  { id: 'forests-of-silence', name: 'Forests of Silence', gem: 'Topaz' },
  { id: 'lake-of-tears',      name: 'Lake of Tears',      gem: 'Ruby' },
  { id: 'city-of-the-rats',   name: 'City of the Rats',   gem: 'Opal' },
  { id: 'shifting-sands',     name: 'Shifting Sands',     gem: 'Lapis Lazuli' },
  { id: 'dread-mountain',     name: 'Dread Mountain',     gem: 'Emerald' },
  { id: 'maze-of-the-beast',  name: 'Maze of the Beast',  gem: 'Amethyst' },
  { id: 'valley-of-the-lost', name: 'Valley of the Lost', gem: 'Diamond' },
];

const MAP_TO_DATA = {
  'forests-of-silence': 'forests',
  'maze-of-the-beast': 'beast',
  'shifting-sands': 'sands',
  'lake-of-tears': 'lake',
  'city-of-the-rats': 'rats',
  'dread-mountain': 'dread',
  'valley-of-the-lost': 'valley',
};

let currentBackdrop = null;
let currentRegionId = null;
let _onEnterRegion = null;
let _onSettingsRequest = null;

export function setOnEnterRegion(fn) {
  _onEnterRegion = fn;
}

export function setOnSettingsRequest(fn) {
  _onSettingsRequest = fn;
}

const GEM_ABBREV = {
  'diamond':      'DIAM',
  'emerald':      'EMER',
  'lapis-lazuli': 'LAPIS',
  'topaz':        'TOPAZ',
  'opal':         'OPAL',
  'ruby':         'RUBY',
  'amethyst':     'AMTH',
};

export function initMap(gameState) {
  _ensureMarkerLabels();
  _setBeltAbbreviations();

  const markers = document.querySelectorAll('.region-marker');
  const popup = document.getElementById('region-popup');
  const closeBtn = popup.querySelector('.popup-close');
  const enterBtn = popup.querySelector('.popup-enter-btn');

  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener('click', closePopup);

  const newEnterBtn = enterBtn.cloneNode(true);
  enterBtn.parentNode.replaceChild(newEnterBtn, enterBtn);

  markers.forEach(marker => {
    const fresh = marker.cloneNode(true);
    marker.parentNode.replaceChild(fresh, marker);
    fresh.addEventListener('click', () => {
      const regionId = fresh.dataset.region;
      const region = REGION_DATA.find(r => r.id === regionId);
      if (!region) return;
      currentRegionId = regionId;
      openPopup(region, gameState);
    });
  });

  newEnterBtn.addEventListener('click', () => {
    try {
      console.log('[ENTER REGION] clicked', {
        currentRegionId,
        dataId: MAP_TO_DATA[currentRegionId],
        hasOnEnterRegion: typeof _onEnterRegion,
      });
      const dataId = MAP_TO_DATA[currentRegionId];
      if (!dataId) { console.error('[ENTER] no dataId for', currentRegionId); return; }
      if (!_onEnterRegion) { console.error('[ENTER] _onEnterRegion not set'); return; }
      const regionData = regions.find(r => r.id === dataId);
      if (!regionData) { console.error('[ENTER] no regionData for', dataId); return; }
      closePopup();
      _onEnterRegion(regionData);
    } catch (err) {
      console.error('[ENTER REGION] threw:', err);
      alert('Enter Region error: ' + err.message);
    }
  });

  // Settings gear
  const gear = document.getElementById('settings-gear');
  if (gear) {
    const freshGear = gear.cloneNode(true);
    gear.parentNode.replaceChild(freshGear, gear);
    freshGear.addEventListener('click', () => {
      if (_onSettingsRequest) _onSettingsRequest();
    });
  }

  updateMarkers(gameState);
}

function _ensureMarkerLabels() {
  document.querySelectorAll('.region-marker').forEach(marker => {
    if (marker.querySelector('.marker-label')) return;
    const regionId = marker.dataset.region;
    const region = REGION_DATA.find(r => r.id === regionId);
    if (!region) return;
    const label = document.createElement('span');
    label.className = 'marker-label region-label';
    label.textContent = region.name;
    // Inline !important — cannot be overridden by any stylesheet rule
    label.style.setProperty('font-family', "'Press Start 2P', monospace", 'important');
    label.style.setProperty('font-size', '0.42rem', 'important');
    label.style.setProperty('letter-spacing', '0.04em', 'important');
    label.style.setProperty('line-height', '1.4', 'important');
    label.style.setProperty('font-style', 'normal', 'important');
    marker.appendChild(label);
  });
}

function _setBeltAbbreviations() {
  document.querySelectorAll('#belt-progress .belt-slot').forEach(slot => {
    const labelEl = slot.querySelector('.belt-gem-label');
    if (!labelEl) return;
    const gemKey = slot.dataset.gem;
    const abbr = GEM_ABBREV[gemKey];
    if (abbr) labelEl.textContent = abbr;
  });
}

function openPopup(region, gameState) {
  const popup = document.getElementById('region-popup');
  popup.querySelector('.popup-region-name').textContent = region.name;
  popup.querySelector('.popup-gem-name').textContent = `Gem: ${region.gem}`;

  const collected = gameState.gemsCollected.includes(region.gem.toLowerCase());
  popup.querySelector('.popup-status').textContent = collected
    ? 'Gem collected \u2713'
    : 'Not yet visited';

  if (!currentBackdrop) {
    currentBackdrop = document.createElement('div');
    currentBackdrop.className = 'region-popup-backdrop';
    currentBackdrop.addEventListener('click', closePopup);
    document.body.appendChild(currentBackdrop);
  }

  popup.classList.remove('hidden');
}

function closePopup() {
  document.getElementById('region-popup').classList.add('hidden');
  if (currentBackdrop) {
    currentBackdrop.remove();
    currentBackdrop = null;
  }
}

function updateMarkers(gameState) {
  document.querySelectorAll('.region-marker').forEach(marker => {
    const regionId = marker.dataset.region;
    const region = REGION_DATA.find(r => r.id === regionId);
    if (!region) return;
    const collected = gameState.gemsCollected.includes(region.gem.toLowerCase());
    marker.classList.toggle('visited', collected);

    const label = marker.querySelector('.marker-label');
    if (label) {
      label.classList.toggle('marker-visited', collected);
      label.classList.toggle('marker-unvisited', !collected);
    }
  });
}

/**
 * Update the belt progress bar on the map screen.
 */
export function updateBelt(gemsCollected, options = {}) {
  const belt = document.getElementById('belt-progress');
  if (!belt) return;
  const slots = belt.querySelectorAll('.belt-slot');
  slots.forEach(slot => {
    const gemKey = slot.dataset.gem;
    const normalised = gemKey.replace(/-/g, ' ');
    const isCollected = gemsCollected.some(
      g => g.toLowerCase() === normalised
    );
    const gemEl = slot.querySelector('.belt-gem');
    gemEl.classList.toggle('collected', isCollected);
    if (options.pulse && isCollected) {
      gemEl.classList.remove('belt-gem-combo-pulse');
      void gemEl.offsetWidth;
      gemEl.classList.add('belt-gem-combo-pulse');
    }
  });

  // Belt border brightness scales with progress
  const count = slots.length;
  const collected = Array.from(slots).filter(s =>
    s.querySelector('.belt-gem').classList.contains('collected')
  ).length;
  const pct = Math.min(1, 0.1 + (collected / count) * 0.9);
  belt.style.setProperty('--belt-glow', pct.toFixed(2));
}

/**
 * Find a belt slot by gem name (lowercase).
 */
export function getBeltSlotRect(gemName) {
  const key = gemName.toLowerCase().replace(/\s+/g, '-');
  const slot = document.querySelector(`#belt-progress .belt-slot[data-gem="${key}"] .belt-gem`);
  if (!slot) return null;
  const rect = slot.getBoundingClientRect();
  return { rect, el: slot };
}

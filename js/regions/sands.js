// regions/sands.js — Shifting Sands configuration

export const sandsConfig = {
  id: 'sands',
  gemName: 'Lapis Lazuli',
  accentColour: 'var(--sands-amber)',
  playerStart: [1, 3],
  gemPosition: [4, 4],
  tileSize: 72,
  sinkSpeed: 1.0,

  grid: [
    [1,1,1,1,1,1,1,1,1],
    [1,0,2,0,2,0,2,0,1],
    [1,2,0,2,0,2,0,2,1],
    [1,0,2,0,2,0,2,0,1],
    [1,2,0,2,0,2,0,2,1],
    [1,0,2,0,2,0,2,0,1],
    [1,2,0,2,0,2,0,2,1],
    [1,0,2,0,2,0,2,0,1],
    [1,1,1,1,1,1,1,1,1],
  ],
};

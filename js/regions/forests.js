// regions/forests.js — Forests of Silence maze configuration

export const forestsConfig = {
  id: 'forests',
  gemName: 'Topaz',
  accentColour: '#2d5a27',
  accentColourHex: '#2d5a27',
  colours: {
    wall:       '#0a1a0a',
    path:       '#141f14',
    background: '#060e06',
  },
  playerStart: [1, 1],
  gemPosition: [7, 6],
  tileSize: 40,

  grid: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,2,1,1,1,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,1,1],
    [1,1,1,0,1,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1,1,2,0,1],
    [1,0,1,1,1,0,1,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,1,1,1,0,1],
    [1,1,2,0,1,1,1,0,0,0,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],

  obstacles: [
    {
      type: 'web',
      positions: [[4,4], [7,10], [10,2]]
    }
  ],

  enemy: null,

  fanModeHints: [
    { position: [4,4], text: "Woven One web. The spiders of the forest block the short paths." },
    { position: [7,10], text: "Another web. Gorl's vines have spread even here." },
    { position: [10,2], text: "The Dark grows closer. The forest does not want you here." }
  ],

  easterEggTile: [11, 1]
};

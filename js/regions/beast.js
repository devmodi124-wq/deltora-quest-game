// regions/beast.js — Maze of the Beast configuration

export const beastConfig = {
  id: 'beast',
  gemName: 'Amethyst',
  accentColour: '#2d1a4a',
  accentColourHex: '#6a00aa',
  colours: {
    wall:       '#1a0a2a',
    path:       '#151020',
    background: '#0a0010',
  },
  playerStart: [1, 1],
  gemPosition: [7, 6],
  tileSize: 40,

  grid: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,0,1,0,1,0,1,1,0,1],
    [1,0,0,1,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,2,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,0,0,1,0,1],
    [1,0,0,0,0,0,2,0,0,1,0,1,0,0,1],
    [1,1,1,0,1,0,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],

  obstacles: [
    {
      type: 'pipe',
      positions: [[4,6], [9,6]]
    }
  ],

  enemy: {
    sprite: 'glus',
    speed: 1.5,
    patrolPath: [
      [5,4],[5,5],[5,6],[5,7],[5,8],
      [6,8],[7,8],[7,7],[7,6],[7,5],
      [7,4],[7,3],[6,3],[5,3],[5,4]
    ]
  },

  fanModeHints: [
    { position: [4,6], text: "A pipe floods this passage. The maze was carved by water." },
    { position: [9,6], text: "Another blocked pipe. The Glus uses the water to track prey." },
  ]
};

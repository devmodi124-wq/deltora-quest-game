// regions/rats.js — City of the Rats memory configuration

export const ratsConfig = {
  id: 'rats',
  gemName: 'Opal',
  accentColour: 'var(--rat-grey)',

  pairs: [
    {
      id: 'soldeen',
      label: 'SOLDEEN',
      description: `The sea serpent of the Lake of Tears. Once Nanion, leader of the golden city of D'Or, transformed by Thaegan's curse.`,
      icon: '\u{1F40D}'
    },
    {
      id: 'reeah',
      label: 'REEAH',
      description: `The giant serpent who wore the Opal crown. Grew from a worm to fill an entire hall on a diet of rats.`,
      icon: '\u{1F451}'
    },
    {
      id: 'gellick',
      label: 'GELLICK',
      description: `The Ooze Toad who enslaved the Dread Gnomes. His venom killed in seconds. Dreaming Spring water was his end.`,
      icon: '\u{1F438}'
    },
    {
      id: 'glus',
      label: 'THE GLUS',
      description: `The silent guardian of the Maze of the Beast. A vast creature that moves through the dark passages. Its victims are still in the walls.`,
      icon: '\u{1F311}'
    },
    {
      id: 'gorl',
      label: 'GORL',
      description: `The ghost-knight who guards the Topaz in the Forests of Silence. His spirit lives in his armour, endlessly protecting the Lilies of Life.`,
      icon: '\u2694\uFE0F'
    },
    {
      id: 'hive',
      label: 'THE HIVE',
      description: `The ancient entity of the Shifting Sands. Not a creature but a consciousness \u2014 it draws all who enter toward its cone of stolen treasure.`,
      icon: '\u{1F536}'
    },
    {
      id: 'grey_guard',
      label: 'GREY GUARD',
      description: `The Shadow Lord's armoured enforcers. They patrol Deltora's roads and answer to no one but their master.`,
      icon: '\u{1F6E1}\uFE0F'
    },
    {
      id: 'ak_baba',
      label: 'AK-BABA',
      description: `The seven great birds of the Shadow Lord. They destroyed the Belt of Deltora and scattered its gems to the most fearful places in the land.`,
      icon: '\u{1F985}'
    }
  ],

  wrongFlipResponses: [
    'Not a match. Keep looking.',
    'The rats watch you fumble.',
    'Try again.',
    'The city offers no second chances. Except this one.'
  ],

  winText: `Every guardian named. Every shadow known. The Opal crown falls from Reeah's head and into your hands.`,
};

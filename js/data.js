// data.js — game content and configuration

export const regions = [
  {
    id: 'forests',
    mapId: 'forests-of-silence',
    name: 'Forests of Silence',
    gem: 'Topaz',
    accentColour: '#2d5a27',
    engineType: 'maze',
    audioTrack: 'tension',

    introExplorer: `The Forests of Silence are three vast, shadow-draped woodlands at the southernmost edge of Deltora. No birdsong. No wind in the leaves. Only a terrible, pressing quiet \u2014 and things moving just beyond your sight.\n\nThe forest was home to Jasmine, a wild girl raised by the trees after the Shadow Lord took her parents. At the heart of the forest, in a clearing called The Dark, a ghostly knight named Gorl guards the Lilies of Life \u2014 and in the hilt of his sword, the golden Topaz.`,

    introFan: `The Dark. Gorl's clearing. The Topaz is in the hilt of his sword. Navigate to the centre \u2014 but the Woven Ones' webs block the short paths. Find another way.`,

    gemPower: `"The topaz is a powerful gem. It protects its wearer from the terrors of the night. It strengthens and clears the mind."`,
  },
  {
    id: 'beast',
    mapId: 'maze-of-the-beast',
    name: 'Maze of the Beast',
    gem: 'Amethyst',
    accentColour: '#2d1a4a',
    engineType: 'maze',
    audioTrack: 'tension',

    introExplorer: `Beneath the coast of Deltora, carved into the rock by water and time, lies the Maze of the Beast. Its walls are pale and wet, lit by a faint blue light. Do not rest. Do not lean against the walls \u2014 they solidify around anyone who stops, trapping them until the Glus comes.\n\nThe Glus is the maze's guardian: a vast, silent creature that moves through the passages in total darkness. The skeletons of the trapped are embedded in the walls. The Amethyst is somewhere in the dark.`,

    introFan: `Darker. Tighter. The Glus patrols a fixed path \u2014 learn its route. The Amethyst is deeper than you think. Move. Don't stop.`,

    gemPower: `"The great amethyst calms and soothes. It changes colour in the presence of illness. It guides the wearer toward sincerity and peace of mind."`,
  },
  {
    id: 'sands',
    mapId: 'shifting-sands',
    name: 'Shifting Sands',
    gem: 'Lapis Lazuli',
    accentColour: 'var(--sands-amber)',
    mapPosition: { top: '30%', left: '68%' },
    engineType: 'sands',
    audioTrack: 'tension',

    introExplorer: `The Shifting Sands are red dunes, constantly moving, plagued by violent sandstorms. A low hum drones through the whole desert \u2014 hypnotic, pulling all who enter toward the Centre. The Sands are not merely dangerous. They are alive. The ancient entity known as the Hive dwells at the Centre, a cone of treasure collected from everyone who wandered in and never walked out. The Lapis Lazuli lies at the top of that cone. The Hive wants the Belt.`,

    introFan: `The Sands are shifting beneath you. Tiles sink if you stand on them too long. Reach the Lapis Lazuli at the Centre before the desert swallows you.`,

    gemPower: `"The lapis lazuli \u2014 the heavenly stone, midnight blue with pinpoints of silver like the night sky. It brings good luck to its wearer."`,
  },
  {
    id: 'lake',
    mapId: 'lake-of-tears',
    name: 'Lake of Tears',
    gem: 'Ruby',
    accentColour: 'var(--lake-blue)',
    mapPosition: { top: '48%', left: '72%' },
    engineType: 'dialogue',
    audioTrack: 'sorrow',

    introExplorer: `Where the beautiful golden city of D'Or once stood, there is now only grey water and thick, blood-sucking mud. A hundred years ago, the sorceress Thaegan cursed D'Or, drowning it and transforming its people into monsters. The city's leader, Nanion, became Soldeen \u2014 a towering creature of scales and sorrow, condemned to guard a rock at the lake's centre. That rock was once his wife.`,

    introFan: `Soldeen is tortured, not evil. He remembers nothing of who he was. Your words \u2014 and the power of the Topaz \u2014 can reach through his grief. Choose carefully. You have three chances to earn his trust.`,

    gemPower: `"The great ruby, symbol of happiness, red as blood, grows pale in the presence of evil or when misfortune threatens its wearer. It wards off evil spirits and is an antidote to snake venom."`,
  },
  {
    id: 'rats',
    mapId: 'city-of-the-rats',
    name: 'City of the Rats',
    gem: 'Opal',
    accentColour: 'var(--rat-grey)',
    mapPosition: { top: '52%', left: '50%' },
    engineType: 'memory',
    audioTrack: 'ancient',

    introExplorer: `The city of Hira was once the proud capital of the Plains tribe \u2014 a vast, maze-like place of wide halls and busy streets. Then the Shadow Lord sent a plague of rats. The people fled. The rat catchers took over. And from a worm they raised in secret, a monster grew \u2014 Reeah, a serpent as wide as an ancient tree trunk, wearing a golden crown with the Opal set at its centre. Reeah knew your name before you arrived. The Opal showed it everything.`,

    introFan: `The City of the Rats is overrun. Match the creatures and artefacts of the quest before Reeah finds you. Flip pairs. Remember what you see. The Opal will be your reward.`,

    gemPower: `"The opal, symbol of hope, sparkling with all the colours of the rainbow. It gives glimpses of the future when touched. It has a special bond with the Lapis Lazuli."`,
  },
  {
    id: 'dread',
    mapId: 'dread-mountain',
    name: 'Dread Mountain',
    gem: 'Emerald',
    accentColour: 'var(--mountain-teal)',
    mapPosition: { top: '15%', left: '25%' },
    engineType: 'riddle',
    audioTrack: 'ancient',

    introExplorer: `Dread Mountain rises at the edge of Deltora, where the land meets the Shadowlands. Its slopes are choked with Boolong trees, its tunnels carved by the Dread Gnomes \u2014 short, stocky, greedy, and brilliant with a bow. For decades they have been enslaved by Gellick, a monstrous Ooze Toad whose venom can kill in seconds. The Emerald sits embedded in Gellick's brow. The gnomes are too afraid to resist. But you are not.`,

    introFan: `The Dread Gnomes will test you before trusting you. Answer two of three riddles correctly and they will let you face Gellick. Their mountain, their rules.`,

    gemPower: `"The emerald, symbol of honour, dulls in the presence of evil and when a vow is broken. It is an antidote to poison."`,
  },
  {
    id: 'valley',
    mapId: 'valley-of-the-lost',
    name: 'Valley of the Lost',
    gem: 'Diamond',
    accentColour: 'var(--valley-violet)',
    mapPosition: { top: '38%', left: '35%' },
    engineType: 'riddle',
    audioTrack: 'ancient',

    introExplorer: `Haven Vale was once a peaceful valley. Now it is lost \u2014 veiled in the Shadow Lord's mist, haunted by pale ghostly figures that press against the walls, longing for warmth. Their captor, the Guardian, was once a man named Fardeep \u2014 an innkeeper broken by grief and corrupted by the Shadow Lord. He has four pets: Pride, Envy, Hate and Greed. They are not animals. They are parts of himself, given form. The Guardian offers the Diamond to anyone who can discover his true name. Choose wrong and you join the lost.`,

    introFan: `The Guardian's true name is not what the Shadow Lord wants you to believe. Listen to what he tells you. The Diamond cannot be stolen \u2014 it must be won.`,

    gemPower: `"The diamond \u2014 for purity and strength, clear and sparkling as ice. Cannot be taken dishonourably. To steal it is to invite evil upon yourself."`,
  }
];

export const gemPowers = {
  'Topaz':        'Strengthens and clears the mind. Protects from the terrors of the night.',
  'Ruby':         'Grows pale in the presence of evil. Wards off evil spirits.',
  'Opal':         'Gives glimpses of the future. Symbol of hope.',
  'Lapis Lazuli': 'The heavenly stone. Brings good luck to its wearer.',
  'Emerald':      'Dulls when a vow is broken. Antidote to poison.',
  'Amethyst':     'Calms and soothes. Changes colour in the presence of illness.',
  'Diamond':      'For purity and strength. Cannot be taken dishonourably.',
};

export const easterEggs = {
  masterSwitch: true,
  eggs: [
    {
      id: 'bicep_wennbar',
      enabled: true,
      location: 'forests_monster_flavour',
      description: 'Wennbar lore tile hidden in a dead-end of the Forests maze',
      content: {
        text: "The Wennbar's preferred meal, according to local legend, is bicep. Specifically, the left one. Scholars dispute this. The Wennbar does not."
      }
    },
    {
      id: 'mango_soldeen',
      enabled: true,
      location: 'lake_soldeen_memory',
      description: `Soldeen's memory fragment about Manus's music smelling of mango, triggered on the positive memory choice`,
      content: {
        text: "The boy's music smells of something sweet. Something golden. Like fruit I have not tasted in a hundred years."
      }
    },
    {
      id: 'baek_wrong_answer',
      enabled: true,
      location: 'valley_riddle_options',
      description: 'Adds Baek as a wrong answer in the Guardian\u2019s riddle and modifies the cutscene opening if chosen',
      content: {
        optionText: 'Baek',
        failResponse: 'That name... where did you hear that name? It does not belong to this valley. And neither, perhaps, do you.'
      }
    },
    {
      id: 'dog_kin',
      enabled: true,
      location: 'dread_mountain_intro_sprite',
      description: 'Adds a small dog-eared Kin sprite to the Dread Mountain intro panel',
      content: {
        spriteVariant: 'kin_dog_ears',
        position: 'background_right'
      }
    },
    {
      id: 'sassy_memory_responses',
      enabled: true,
      location: 'rats_memory_wrong_flip',
      description: 'Replaces wrong flip messages with sassy responses',
      content: {
        responses: [
          'Not even close. Try harder.',
          'Bold choice. Wrong, but bold.'
        ]
      }
    },
    {
      id: 'meeting_date_stone',
      enabled: true,
      location: 'sands_intro_stone',
      description: 'Warning stone plaque shown before entering the Shifting Sands',
      content: {
        date: '02.04.26'
      }
    }
  ]
};

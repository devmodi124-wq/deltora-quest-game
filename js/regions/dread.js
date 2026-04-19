// regions/dread.js — Dread Mountain riddle configuration

export const dreadConfig = {
  id: 'dread',
  gemName: 'Emerald',
  accentColour: 'var(--mountain-teal)',
  requiredCorrect: 2,
  hardFail: false,
  singleShot: false,

  presenter: {
    name: 'Fa-Glin',
    sprite: 'fa-glin',
    description: `Fa-Glin is a Dread Gnome \u2014 short, stocky, and deeply proud of his mountain. The gnomes were enslaved by Gellick for decades, forced to collect poison and breed flies. They do not trust outsiders easily. Prove your knowledge and they will let you face the toad.`
  },

  riddles: [
    {
      id: 'riddle_ruby',
      question: `"I am red as blood when all is well. I grow pale when evil draws near. I ward off dark spirits and cure snake venom. Which gem am I?"`,
      answers: [
        { text: 'The Emerald', correct: false },
        { text: 'The Ruby', correct: true },
        { text: 'The Amethyst', correct: false },
        { text: 'The Opal', correct: false }
      ],
      hint: `Think about the gem that changes colour in the presence of danger \u2014 and what colour it normally is.`,
      correctFlavour: `"Correct. The Ruby. Even a Del child knows that much."`,
      wrongFlavour: `"Wrong. The Gnomes of Dread Mountain know their gems. You should learn."`
    },
    {
      id: 'riddle_gellick',
      question: `"For decades, the Dread Gnomes collected my poison and fed me flies. I wore the Emerald in my brow. Dreaming Spring water was my undoing. What was I?"`,
      answers: [
        { text: 'Soldeen', correct: false },
        { text: 'Reeah', correct: false },
        { text: 'Gellick', correct: true },
        { text: 'The Glus', correct: false }
      ],
      hint: `This creature enslaved the Dread Gnomes themselves. It was an Ooze Toad.`,
      correctFlavour: `"Good. You know what oppressed us. We do not forget it either."`,
      wrongFlavour: `"That is not the creature that held us in chains. Think harder."`
    },
    {
      id: 'riddle_amethyst',
      question: `"The great amethyst calms and soothes. It changes colour in the presence of one specific thing. What is that thing?"`,
      answers: [
        { text: 'Evil', correct: false },
        { text: 'Illness', correct: true },
        { text: 'Water', correct: false },
        { text: 'Darkness', correct: false }
      ],
      hint: `The Ruby reacts to evil. The Amethyst reacts to something different \u2014 something that afflicts the body.`,
      correctFlavour: `"Illness. Yes. The Amethyst has saved more lives than swords."`,
      wrongFlavour: `"You confuse the gems. Each has its own power. Learn the difference."`
    }
  ],

  winText: `Fa-Glin studies you for a long moment. Then he nods. "You know enough. Come. Gellick awaits \u2014 and so does the Emerald."`,

  failText: `"Not enough. The mountain does not open for the ignorant."`,
  failCutscene: null,
};

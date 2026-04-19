// regions/valley.js — Valley of the Lost riddle configuration

export const valleyConfig = {
  id: 'valley',
  gemName: 'Diamond',
  accentColour: 'var(--valley-violet)',
  requiredCorrect: 1,
  hardFail: true,
  singleShot: true,

  presenter: {
    name: 'The Guardian',
    sprite: 'guardian',
    description: `The Guardian was once Fardeep \u2014 a man of trade and games, the keeper of Rithmere's Champion Inn. The Shadow Lord broke him with grief and rebuilt him as something darker. His four pets \u2014 Pride, Envy, Hate and Greed \u2014 are not animals. They are parts of himself, given flesh. He offers the Diamond to anyone who can name him. The Shadow Lord told him to lie about his name.`
  },

  riddles: [
    {
      id: 'riddle_guardian',
      question: `"I was not born to this valley. I was a man of trade and games \u2014 a keeper of an inn in Rithmere. The Shadow Lord broke me. He gave me this palace. He gave me these pets. And he told me to say my name was Endon \u2014 the name of a king.\n\nBut that was never my name.\n\nDiscover my true name and the Diamond is yours."`,
      answers: [
        { text: 'Endon', correct: false },
        { text: 'Nanion', correct: false, eggReplace: 'baek_wrong_answer' },
        { text: 'Fardeep', correct: true },
        { text: 'Jarred', correct: false }
      ],
      hint: `The Shadow Lord wanted you to say a king's name. That is the trap. The Guardian was never a king. He was a man of trade from Rithmere. His name is that man's name.`,
      correctFlavour: `The Guardian is silent for a long moment. Something in his face shifts \u2014 like a curtain dropping. "Fardeep," he says quietly. "Yes. That is who I was. That is who I still am."`,
      wrongFlavour: null
    }
  ],

  winText: `The Guardian holds out the Diamond. It blazes with cold white light \u2014 pure and unyielding as ice. "Take it," he says. "Free them all." Behind him, the pale figures pressed against the walls begin, slowly, to remember themselves.`,

  failText: null,

  failCutscene: [
    'You chose a name the Shadow Lord whispered.',
    'The Guardian smiles. It is not a kind smile.',
    'The valley keeps you now.',
    'Your warmth fades. Your colour drains.',
    'You join the others pressing against the walls.'
  ],
};

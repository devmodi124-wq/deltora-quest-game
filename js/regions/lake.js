// regions/lake.js — Lake of Tears dialogue configuration

export const lakeConfig = {
  id: 'lake',
  gemName: 'Ruby',
  accentColour: 'var(--lake-blue)',

  character: {
    name: 'Soldeen',
    sprite: 'soldeen',
    description: `Soldeen was once Nanion, leader of the golden city of D'Or. The sorceress Thaegan cursed his people and transformed him into this creature of grief and fury. He has no memory of his former life \u2014 only a vast, aching sadness he cannot name.`
  },

  trustRequired: 2,
  trustMax: 3,
  failThreshold: -1,

  nodes: [
    {
      id: 'node_1',
      speaker: 'narrator',
      text: `The grey water churns. Something vast moves beneath the surface. Then Soldeen rises \u2014 a creature of scales and sorrow, his eyes ancient and full of pain.`,
      choices: null
    },
    {
      id: 'node_2',
      speaker: 'Soldeen',
      text: `"You dare come to this Lake. What do you want?"`,
      hint: `Soldeen is in pain, not evil. Acknowledge the lake, not the gem.`,
      choices: [
        {
          text: `"We have come to take the Ruby. Stand aside."`,
          trustDelta: -1,
          response: `"Take? Nothing here is yours to take. You are like all the others \u2014 grasping, thoughtless."`,
          responseType: 'negative'
        },
        {
          text: `"We seek a gem that was dropped here. We mean you no disrespect."`,
          trustDelta: 1,
          response: `"Dropped. Yes. Like everything else that falls into this place." His voice carries something beneath the anger. Something older.`,
          responseType: 'positive'
        },
        {
          text: `"We have heard of your suffering. We are sorry for what was done to this lake."`,
          trustDelta: 0,
          response: `"...You know nothing of suffering." But he does not attack.`,
          responseType: 'neutral'
        }
      ]
    },
    {
      id: 'node_3',
      speaker: 'narrator',
      text: `From the shore, Manus begins to play his flute. The notes drift out over the grey water. Soldeen goes still.`,
      choices: null
    },
    {
      id: 'node_4',
      speaker: 'Soldeen',
      text: `"...Keep playing. Do not stop."`,
      hint: `The music is reaching something in him. Don't dismiss it.`,
      choices: [
        {
          text: `"Play on, Manus. His mood depends on it."`,
          trustDelta: 1,
          response: `"Yes. The sound... it reaches something in me. Something I cannot name."`,
          responseType: 'positive'
        },
        {
          text: `"It is only a flute. There is nothing special about it."`,
          trustDelta: -1,
          response: `"Then you understand nothing." The water darkens around him.`,
          responseType: 'negative'
        },
        {
          text: `"What does the music mean to you? Does it remind you of something?"`,
          trustDelta: 1,
          response: `"...It reminds me of a time I can no longer reach. A city. A name I have forgotten."`,
          responseType: 'positive',
          eggTrigger: 'mango_soldeen'
        }
      ]
    },
    {
      id: 'node_5',
      speaker: 'Soldeen',
      text: `"I will give you what you seek. But I want something in return. Give me the one who plays. His music comforts me."`,
      hint: `Manus is your companion. The right answer is the honest one.`,
      choices: [
        {
          text: `"Take him. He is not our concern."`,
          trustDelta: -2,
          response: `"Then you are like all the others. Willing to sacrifice the innocent for your prize."`,
          responseType: 'negative'
        },
        {
          text: `"We will not give him up. Not for anything."`,
          trustDelta: 1,
          response: `"...You would refuse? Even for the gem?" Something shifts behind his eyes.`,
          responseType: 'positive'
        },
        {
          text: `"He is our friend. We came here together. We leave together."`,
          trustDelta: 1,
          response: `"Friends." The word lands strangely in his mouth. "I once had a name for people I would not leave behind."`,
          responseType: 'positive'
        }
      ]
    }
  ],

  eggLines: {
    mango_soldeen: `The boy's music smells of something sweet. Something golden. Like fruit I have not tasted in a hundred years.`
  },

  winText: `Something stirs in Soldeen's ancient mind. The Topaz at your belt glows warm \u2014 and through it, a hundred years of sorrow begins to lift. "There is something on that Belt," he says quietly. "It touches my mind. It makes me... remember." He turns and carries you across the dark water to the Weeping Rock.`,

  failText: `Soldeen's patience breaks. The Lake of Tears is true to its name.`,
};

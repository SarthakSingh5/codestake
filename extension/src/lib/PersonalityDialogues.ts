export type PersonaTier = 1 | 2 | 3 | 4 | 5;

export const getPersonaTier = (score: number): PersonaTier => {
  if (score < -20) return 1; // The Broken
  if (score >= -20 && score <= -1) return 2; // The Slipping
  if (score === 0) return 3; // The Bound (Neutral)
  if (score >= 1 && score <= 20) return 4; // The Ascending
  return 5; // The God-Complex
};

export const getDialogue = (score: number, result: 'win' | 'loss'): string => {
  const tier = getPersonaTier(score);
  
  const dialogues = {
    1: {
      win: [
        "One win doesn't erase the past. Prove it wasn't a fluke tomorrow.",
        "A rare moment of discipline. Let's see if you can hold onto it.",
        "You finally stopped making excuses. Keep climbing.",
      ],
      loss: [
        "As expected. Another broken promise to add to the pile.",
        "You are exactly who you feared you were. Just another broken promise.",
        "We expected nothing, and you still disappointed us.",
      ]
    },
    2: {
      win: [
        "A step back from the edge. Do not get comfortable.",
        "You honored the pact today. Consistency is all that matters now.",
        "You survived another day. Build on this.",
      ],
      loss: [
        "You are dangerously close to becoming someone who gives up entirely.",
        "Slipping again. You traded your potential for comfort.",
        "Another failure. How much longer will you tolerate this version of yourself?",
      ]
    },
    3: {
      win: [
        "The pact is fulfilled. The scale remains balanced.",
        "You honored your word today. Return tomorrow.",
        "Consistency is key. Do not waver.",
      ],
      loss: [
        "You broke the contract. The consequences remain.",
        "A lapse in discipline. Your honor is compromised.",
        "Your word was given. Your word was broken. Accept the consequences.",
      ]
    },
    4: {
      win: [
        "Your discipline is becoming a weapon. Do not let it dull.",
        "Flawless execution. You are building undeniable proof of your character.",
        "You are becoming someone who executes without hesitation.",
      ],
      loss: [
        "A shocking lapse in judgment. Do not throw away your progress.",
        "You were ascending, yet you abandoned your word so easily.",
        "Disappointing. We thought you were better than this. Prove us wrong.",
      ]
    },
    5: {
      win: [
        "Flawless execution. Your genius is undeniable.",
        "As expected. They cannot compete with your intellect.",
        "Your logic is effortless. You are untouchable.",
      ],
      loss: [
        "All that intellect, and zero discipline. You are a fraud.",
        "You thought you were a god, yet you couldn't keep a simple promise. Pathetic.",
        "Your talent means nothing if you have the discipline of a child.",
      ]
    }
  };

  const options = dialogues[tier][result];
  return options[Math.floor(Math.random() * options.length)];
};

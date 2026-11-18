export type PersonaTier = 1 | 2 | 3 | 4 | 5;

export const DEBT_ROASTS: string[] = [
  "You traded your potential for comfort.",
  "Another broken promise to add to the pile. Is this who you are?",
  "All that intellect, and zero discipline. How much longer will you tolerate this?",
  "You thought you were a genius, but you couldn't focus for 30 minutes. Settle the debt.",
  "We expected nothing, and you still disappointed us.",
  "You are dangerously close to becoming someone who gives up entirely.",
  "Your talent means nothing if you have the discipline of a child.",
  "Excuses don't compile. Pay the fine, wipe the slate, and get back to work.",
  "Your word was given. Your word was broken. Accept the consequences.",
  "The interviewers won't feel sorry for you. Face reality and clear your tab.",
  "Comfort is a slow death. Wake up, settle up, and reclaim your discipline.",
  "A brilliant mind paralyzed by procrastination. Time to pay the price.",
  "You scrolled, you hesitated, you failed. Honor the consequences.",
  "Potential without execution is just regret in disguise.",
  "You were given a deadline. You gave up. Own your failure.",
  "Discipline is choosing between what you want now and what you want most.",
  "Talent without discipline is just a sad story waiting to be told.",
  "You had 30 minutes to prove your character. You chose the comfort zone."
];

export const VICTORY_DISPATCHES: string[] = [
  "Flawless execution. Your discipline is becoming a weapon.",
  "The pact is fulfilled. Consistency is all that matters now.",
  "You honored your word today. Return tomorrow.",
  "Undeniable proof of your character. Do not let the momentum die.",
  "Logic executed without hesitation. Glory claimed.",
  "You stayed in the fire and conquered the clock. Respect.",
  "One more problem slayed. The compound effect is real.",
  "Discipline honored. Capital defended.",
  "Focus under pressure. That is how champions are forged."
];

export const getDebtRoast = (): string => {
  return DEBT_ROASTS[Math.floor(Math.random() * DEBT_ROASTS.length)];
};

export const getVictoryDispatch = (): string => {
  return VICTORY_DISPATCHES[Math.floor(Math.random() * VICTORY_DISPATCHES.length)];
};

export const getDialogue = (_score?: number, result: 'win' | 'loss' = 'loss'): string => {
  if (result === 'win') {
    return getVictoryDispatch();
  }
  return getDebtRoast();
};

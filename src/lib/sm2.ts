import { SM2Card } from "@/types";

const DAY_MS = 86_400_000;

export function createCard(exampleId: string): SM2Card {
  return {
    exampleId,
    repetitions: 0,
    easeFactor: 2.5,
    interval: 1,
    nextReview: Date.now(),
    lastQuality: -1,
  };
}

export function reviewCard(card: SM2Card, quality: 0 | 1 | 2 | 3 | 4 | 5): SM2Card {
  let { easeFactor, repetitions, interval } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  return {
    ...card,
    repetitions,
    easeFactor,
    interval,
    nextReview: Date.now() + interval * DAY_MS,
    lastQuality: quality,
  };
}

export function isDue(card: SM2Card): boolean {
  return Date.now() >= card.nextReview;
}

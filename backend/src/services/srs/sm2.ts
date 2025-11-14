// SM-2 Spaced Repetition Algorithm Implementation
// https://www.supermemo.com/en/archives1990-2015/english/sm2

export interface SM2State {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface SM2Result extends SM2State {
  nextReview: Date;
}

/**
 * Calculate next review schedule using SM-2 algorithm
 * @param state Current SRS state
 * @param quality Quality of recall (0-5)
 *  0 - complete blackout
 *  1 - incorrect response; correct answer remembered
 *  2 - incorrect response; correct answer seemed familiar
 *  3 - correct response with serious difficulty
 *  4 - correct response after hesitation
 *  5 - perfect response
 */
export function calculateNextReview(
  state: SM2State,
  quality: number
): SM2Result {
  let { easeFactor, interval, repetitions } = state;

  // Validate quality
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5');
  }

  // Update repetitions
  if (quality >= 3) {
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ensure minimum ease factor
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
  };
}

/**
 * Initialize a new SRS item with default values
 */
export function initializeSRS(): SM2State {
  return {
    easeFactor: 2.5, // Default ease factor
    interval: 1, // First review in 1 day
    repetitions: 0,
  };
}

/**
 * Calculate review date based on ease factor and interval
 */
export function getReviewDate(interval: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date;
}

/**
 * Get due items for a given date
 */
export function getDueDate(date: Date = new Date()): Date {
  // Items due when next_review <= current date
  return date;
}

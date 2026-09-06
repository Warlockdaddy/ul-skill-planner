/**
 * Lowest character level accepted by the planner.
 */
export const MINIMUM_CHARACTER_LEVEL = 1;

/**
 * Temporary maximum accepted by the level-entry field.
 *
 * This is not yet intended to represent a confirmed
 * Undead Legacy maximum character level.
 */
export const MAXIMUM_CHARACTER_LEVEL = 300;

/**
 * Converts a user-entered level into a valid whole number.
 *
 * Examples:
 * 25.8 becomes 25
 * -10 becomes 1
 * 500 becomes 300
 * Invalid input becomes 1
 */
export function normalizeCharacterLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return MINIMUM_CHARACTER_LEVEL;
  }

  const wholeLevel = Math.floor(level);

  return Math.min(
    MAXIMUM_CHARACTER_LEVEL,
    Math.max(MINIMUM_CHARACTER_LEVEL, wholeLevel),
  );
}

/**
 * Calculates skill points earned from character levels.
 *
 * Temporary prototype formula:
 * Level 1  = 0 points
 * Level 2  = 1 point
 * Level 10 = 9 points
 *
 * We will replace this formula once the exact in-game
 * progression rule has been confirmed.
 */
export function calculateLevelSkillPoints(level: number): number {
  const normalizedLevel = normalizeCharacterLevel(level);

  return Math.max(0, normalizedLevel - 1);
}

/**
 * Calculates the complete skill-point budget.
 *
 * Additional skill points allow the user to account for
 * points that may not come from ordinary character levels.
 */
export function calculateTotalSkillPoints(
  level: number,
  bonusSkillPoints: number,
): number {
  const levelPoints = calculateLevelSkillPoints(level);

  const normalizedBonusPoints = Math.max(
    0,
    Math.floor(
      Number.isFinite(bonusSkillPoints)
        ? bonusSkillPoints
        : 0,
    ),
  );

  return levelPoints + normalizedBonusPoints;
}
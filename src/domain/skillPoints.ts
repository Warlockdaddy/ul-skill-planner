export const MINIMUM_CHARACTER_LEVEL = 1;
export const MAXIMUM_CHARACTER_LEVEL = 300;

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

export function calculateLevelSkillPoints(level: number): number {
  const normalizedLevel = normalizeCharacterLevel(level);
  const standardLevelPoints = Math.max(0, normalizedLevel - 1);
  const fiveLevelBonusPoints = Math.floor(normalizedLevel / 5);

  return standardLevelPoints + fiveLevelBonusPoints;
}

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

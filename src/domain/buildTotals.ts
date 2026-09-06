import type {
  PlannerBuild,
  SkillEffectUnit,
  SkillNode,
} from "./types";

export interface BuildTotal {
  statId: string;
  label: string;
  value: number;
  unit: SkillEffectUnit;
  sortOrder: number;
}

/**
 * Combines every effect granted by all purchased
 * nodes and ranks.
 *
 * Example:
 *
 * Node A grants +5 Intellect.
 * Node B grants +5 Intellect.
 *
 * Result:
 * Intellect +10
 */
export function calculateBuildTotals(
  build: PlannerBuild,
  skills: SkillNode[],
): BuildTotal[] {
  const totals =
    new Map<string, BuildTotal>();

  for (const skill of skills) {
    const purchasedRank =
      build.purchasedRanks[skill.id] ?? 0;

    if (purchasedRank <= 0) {
      continue;
    }

    for (const effect of skill.effects) {
      const effectValue =
        effect.valuePerRank;

      const existingTotal =
        totals.get(effect.statId);

      if (existingTotal) {
        /**
         * Using one stat ID with multiple incompatible
         * units would produce an invalid total.
         */
        if (
          existingTotal.unit !==
          effect.unit
        ) {
          throw new Error(
            `Build total "${effect.statId}" mixes ` +
              `"${existingTotal.unit}" and ` +
              `"${effect.unit}" units.`,
          );
        }

        existingTotal.value += effectValue;

        existingTotal.sortOrder = Math.min(
          existingTotal.sortOrder,
          effect.sortOrder ??
            Number.MAX_SAFE_INTEGER,
        );

        continue;
      }

      totals.set(effect.statId, {
        statId: effect.statId,
        label: effect.label,
        value: effectValue,
        unit: effect.unit,
        sortOrder:
          effect.sortOrder ??
          Number.MAX_SAFE_INTEGER,
      });
    }
  }

  return Array.from(totals.values())
    .filter((total) => total.value !== 0)
    .sort((first, second) => {
      if (
        first.sortOrder !==
        second.sortOrder
      ) {
        return (
          first.sortOrder -
          second.sortOrder
        );
      }

      return first.label.localeCompare(
        second.label,
      );
    });
}

/**
 * Formats one calculated value for display.
 *
 * Examples:
 *
 * 10 flat     -> +10
 * -5 flat     -> -5
 * 15 percent  -> +15%
 * -10 percent -> -10%
 */
export function formatBuildTotalValue(
  total: BuildTotal,
): string {
  const sign =
    total.value > 0 ? "+" : "";

  const suffix =
    total.unit === "percent"
      ? "%"
      : "";

  return `${sign}${total.value}${suffix}`;
}
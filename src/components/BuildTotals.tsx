import { useMemo } from "react";
import type { PlannerBuild, SkillEffect, SkillNode } from "../domain/types";
import {
  ATTRIBUTE_STAT_IDS,
  calculateAttributeTotals,
  calculateRecurringAttributeEffects,
} from "../domain/derivedBonuses";

type BuildTotalsProps = { build: PlannerBuild; skills: SkillNode[] };
type Total = { label: string; value: number; unit: "flat" | "percent" };

const MAXIMUM_HEALTH_STAT_ID = "increased-maximum-health";
const MAXIMUM_HEALTH_LABEL = "Increased Maximum Health";
const CARRY_WEIGHT_STAT_ID = "carry-weight";
const CARRY_WEIGHT_LABEL = "Carry Weight";

function normalizeEffect(effect: SkillEffect): SkillEffect {
  const normalizedLabel = effect.label.trim().toLocaleLowerCase();
  const isMaximumHealthEffect =
    normalizedLabel === "maximum health" ||
    normalizedLabel === "to maximum health" ||
    normalizedLabel === "increased maximum health";

  if (isMaximumHealthEffect) {
    return {
      ...effect,
      statId: MAXIMUM_HEALTH_STAT_ID,
      label: MAXIMUM_HEALTH_LABEL,
    };
  }

  const isCarryWeightEffect =
    normalizedLabel === "carry weight" ||
    normalizedLabel === "to inventory carry limit";

  return isCarryWeightEffect
    ? {
        ...effect,
        statId: CARRY_WEIGHT_STAT_ID,
        label: CARRY_WEIGHT_LABEL,
      }
    : effect;
}

function capitalizeFirstLetter(label: string): string {
  const firstLetterIndex = label.search(/[a-z]/i);
  if (firstLetterIndex < 0) return label;
  return (
    label.slice(0, firstLetterIndex) +
    label.charAt(firstLetterIndex).toLocaleUpperCase() +
    label.slice(firstLetterIndex + 1)
  );
}

function addEffect(byStat: Map<string, Total>, originalEffect: SkillEffect): void {
  const effect = normalizeEffect(originalEffect);
  if (effect.includeInTotals === false || ATTRIBUTE_STAT_IDS.has(effect.statId as never)) return;

  const current = byStat.get(effect.statId);
  if (current) current.value += effect.valuePerRank;
  else {
    byStat.set(effect.statId, {
      label: capitalizeFirstLetter(effect.label),
      value: effect.valuePerRank,
      unit: effect.unit,
    });
  }
}

export function calculateBuildTotals(build: PlannerBuild, skills: SkillNode[]): Total[] {
  const byStat = new Map<string, Total>();
  for (const skill of skills) {
    if ((build.purchasedRanks[skill.id] ?? 0) < 1) continue;
    for (const effect of skill.effects) addEffect(byStat, effect);
  }

  const attributes = calculateAttributeTotals(build.purchasedRanks, skills);
  for (const effect of calculateRecurringAttributeEffects(attributes)) addEffect(byStat, effect);

  return [...byStat.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export function BuildTotals({ build, skills }: BuildTotalsProps) {
  const totals = useMemo(
    () => calculateBuildTotals(build, skills),
    [build.purchasedRanks, skills],
  );

  return (
    <section className="build-totals" aria-labelledby="build-totals-heading">
      <h2 id="build-totals-heading" className="build-totals__heading">
        Build Totals
      </h2>
      {totals.length === 0 ? (
        <p className="build-totals__empty">No build bonuses selected.</p>
      ) : (
        <dl className="build-totals__list">
          {totals.map((total) => (
            <div className="build-totals__row" key={`${total.label}-${total.unit}`}>
              <dt>{total.label}</dt>
              <dd
                className={
                  total.value < 0
                    ? "build-totals__value build-totals__value--negative"
                    : "build-totals__value"
                }
              >
                {total.value > 0 ? "+" : ""}
                {total.value}
                {total.unit === "percent" ? "%" : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

import type { PlannerBuild, SkillCategoryId, SkillNode } from "../domain/types";
import {
  ATTRIBUTE_BONUS_RULES,
  calculateAttributeTotals,
} from "../domain/derivedBonuses";

type AttributeSummaryProps = {
  build: PlannerBuild;
  skills: SkillNode[];
};

type AttributeDefinition = {
  id: SkillCategoryId;
  label: string;
  symbol: string;
};

const attributes: AttributeDefinition[] = [
  { id: "strength", label: "Strength", symbol: "S" },
  { id: "fortitude", label: "Fortitude", symbol: "F" },
  { id: "dexterity", label: "Dexterity", symbol: "D" },
  { id: "perception", label: "Perception", symbol: "P" },
  { id: "intellect", label: "Intellect", symbol: "I" },
];

function formatValue(value: number, unit: "flat" | "percent"): string {
  return `${value}${unit === "percent" ? "%" : ""}`;
}

function formatBonus(attributeId: SkillCategoryId, effectIndex: number): string {
  const effect = ATTRIBUTE_BONUS_RULES[attributeId].effectsPerInterval[effectIndex];
  const value = formatValue(effect.valuePerRank, effect.unit);

  if (attributeId === "strength" && effect.statId === "carry-weight") {
    return `Carry Weight limit increased by ${value}`;
  }

  return `${value} increased ${effect.label}`;
}

export function AttributeSummary({ build, skills }: AttributeSummaryProps) {
  const totals = calculateAttributeTotals(build.purchasedRanks, skills);

  return (
    <section className="attribute-summary" aria-label="Attribute totals">
      {attributes.map((attribute) => {
        const rule = ATTRIBUTE_BONUS_RULES[attribute.id];
        const tooltipId = `attribute-tooltip-${attribute.id}`;

        return (
          <div
            className={`attribute-summary__item attribute-summary__item--${attribute.id}`}
            key={attribute.id}
            tabIndex={0}
            aria-describedby={tooltipId}
          >
            <span className="attribute-summary__icon" aria-hidden="true">
              {attribute.symbol}
            </span>
            <span className="attribute-summary__label">{attribute.label}</span>
            <strong className="attribute-summary__value">
              {totals[attribute.id]}
            </strong>

            <div
              id={tooltipId}
              className="attribute-summary__tooltip"
              role="tooltip"
            >
              <strong className="attribute-summary__tooltip-title">
                {attribute.label}
              </strong>
              <span className="attribute-summary__tooltip-rule">
                Every {rule.interval} {attribute.label}:
              </span>
              {rule.effectsPerInterval.map((_, effectIndex) => (
                <span
                  className="attribute-summary__tooltip-bonus"
                  key={`${attribute.id}-bonus-${effectIndex}`}
                >
                  {formatBonus(attribute.id, effectIndex)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

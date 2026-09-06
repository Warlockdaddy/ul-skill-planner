import type { SkillCategoryId, SkillEffect, SkillNode } from "../domain/types";

export type AttributeTotals = Record<SkillCategoryId, number>;
export const ATTRIBUTE_STAT_IDS = new Set<SkillCategoryId>(["strength", "fortitude", "dexterity", "perception", "intellect"]);

type Rule = { interval: number; effectsPerInterval: SkillEffect[] };
export const ATTRIBUTE_BONUS_RULES: Record<SkillCategoryId, Rule> = {
  strength: { interval: 5, effectsPerInterval: [
    { statId: "melee-physical-damage", label: "Melee Physical Damage", valuePerRank: 1, unit: "percent" },
    { statId: "carry-weight", label: "Carry Weight", valuePerRank: 5, unit: "flat" },
  ] },
  fortitude: { interval: 5, effectsPerInterval: [
    { statId: "maximum-health", label: "Maximum Health", valuePerRank: 2, unit: "flat" },
    { statId: "stun-resistance", label: "Stun Resistance", valuePerRank: 2.5, unit: "percent" },
  ] },
  dexterity: { interval: 5, effectsPerInterval: [
    { statId: "maximum-stamina", label: "Maximum Stamina", valuePerRank: 2, unit: "flat" },
    { statId: "headshot-damage", label: "Headshot Damage", valuePerRank: 5, unit: "percent" },
  ] },
  perception: { interval: 5, effectsPerInterval: [
    { statId: "ranged-physical-damage", label: "Ranged Physical Damage", valuePerRank: 1, unit: "percent" },
    { statId: "dismemberment-chance", label: "Dismemberment Chance", valuePerRank: 2, unit: "percent" },
  ] },
  intellect: { interval: 5, effectsPerInterval: [
    { statId: "energy-weapon-damage", label: "Energy Weapon Damage", valuePerRank: 1, unit: "percent" },
    { statId: "skill-experience-gain", label: "Skill Experience Gain", valuePerRank: 2.5, unit: "percent" },
  ] },
};

export function calculateAttributeTotals(purchasedRanks: Record<string, number>, skills: SkillNode[]): AttributeTotals {
  const totals: AttributeTotals = { strength: 0, fortitude: 0, dexterity: 0, perception: 0, intellect: 0 };
  for (const skill of skills) {
    if ((purchasedRanks[skill.id] ?? 0) < 1) continue;
    for (const effect of skill.effects) {
      if (ATTRIBUTE_STAT_IDS.has(effect.statId as SkillCategoryId)) totals[effect.statId as SkillCategoryId] += effect.valuePerRank;
    }
  }
  return totals;
}

export function calculateRecurringAttributeEffects(totals: AttributeTotals): SkillEffect[] {
  return (Object.keys(ATTRIBUTE_BONUS_RULES) as SkillCategoryId[]).flatMap((id) => {
    const rule = ATTRIBUTE_BONUS_RULES[id];
    const multiplier = Math.floor(totals[id] / rule.interval);
    return multiplier < 1 ? [] : rule.effectsPerInterval.map((effect) => ({ ...effect, valuePerRank: effect.valuePerRank * multiplier }));
  });
}

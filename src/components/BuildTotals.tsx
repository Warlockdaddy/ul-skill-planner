import { useMemo, useState } from "react";
import type { PlannerBuild, SkillEffect, SkillNode } from "../domain/types";
import { ATTRIBUTE_STAT_IDS, calculateAttributeTotals, calculateRecurringAttributeEffects } from "../domain/derivedBonuses";
import { BUILD_TOTAL_CATALOG, BUILD_TOTAL_HIERARCHY, type BuildTotalCategoryNode } from "../domain/buildTotalCategories";

type BuildTotalsProps = { build: PlannerBuild; skills: SkillNode[] };
type Total = { statId: string; label: string; value: number; unit: "flat" | "percent" };
type DisplayTotal = Total & { category: string; valueText?: string; valueSuffix?: string };

const MAXIMUM_HEALTH_STAT_ID = "increased-maximum-health";
const CARRY_WEIGHT_STAT_ID = "carry-weight";

const CATALOG_DISPLAY_OVERRIDES: Readonly<Record<string, { label?: string; valueMultiplier?: number; valueSuffix?: string }>> = {
  "s-increased-delay-timer-when-setting-off-land-mines": {
    label: "Increased delay timer when setting off Land Mines",
    valueSuffix: "s",
  },
  "m-distance-increased-for-safe-fall": { valueSuffix: "m" },
  "m-increased-safe-fall-distance": { valueSuffix: "m" },
  "to-all-attributes-for-nearby-allies-and-party-members": {
    label: "Increased Attributes for nearby Allies and Party Members",
    valueSuffix: " to all",
  },
  "increased-stealth-effectiveness-in-low-light": { label: "Low light stealth bonus" },
  "increased-crouch-speed-and-stealth-effectiveness-in-low-light": { label: "Low light crouch speed bonus" },
  "s-increased-underwater-diving-duration": {
    label: "Increased underwater breathing duration",
    valueSuffix: "s",
  },
  "to-maximum-food-and-thirst-limit": { label: "Maximum food and thirst limit" },
  "to-maximum-food-water": { label: "Maximum food/water" },
  "successive-hits-with-clubs-cause-the-last-hit-to-deal-additional-33-physical-damage": {
    label: "3 Successive hits with clubs cause the last hit to deal additional physical damage",
    valueMultiplier: 11,
    valueSuffix: "%",
  },
  "to-sniper-rifle-target-penetration": { label: "Sniper Rifle Target Penetration" },
  "to-polearm-target-armor-reduction": { label: "Polearm Target Armor Reduction" },
  "to-ranged-weapon-target-armor-reduction": { label: "Ranged Weapon Target Armor Reduction" },
  "successive-hits-with-pistols-in-a-short-time-cause-the-last-shot-to-deal-additional-33-physical-damage": {
    label: "3 successive hits with pistols in a short time causes the last shot to deal additional Physical Damage",
    valueMultiplier: 11,
    valueSuffix: "%",
  },
  "increased-portable-turret-active-range-by-m": {
    label: "Increased Portable Turret active Range",
    valueSuffix: "m",
  },
  "increased-ranged-portable-turret-magazine-size-by-rounds": {
    label: "Increased Ranged Portable Turret Magazine Size",
  },
  "to-maximum-number-of-allowed-active-portable-turrets": {
    label: "Additional number of allowed active Portable Turrets",
  },
  "attacks-with-shotgun-stun-enemies-for-additional-s-seconds": { valueSuffix: "s" },
  "attacks-with-shotgun-stun-enemies-for-s-seconds": { valueSuffix: "s" },
};

const STAT_SPLITS: Readonly<Record<string, { addTo: readonly string[]; removeSource: boolean }>> = {
  "decreased-action-noise-level-and-alerted-target-search-duration": {
    addTo: ["decreased-action-noise-level", "decreased-alerted-target-search-duration"],
    removeSource: true,
  },
  "increased-crouch-speed-and-stealth-effectiveness-in-low-light": {
    addTo: ["increased-stealth-effectiveness-in-low-light"],
    removeSource: false,
  },
};

const STAT_MERGES: Readonly<Record<string, { targetStatId: string; label: string }>> = {
  "increased-action-skill-experience-gain": {
    targetStatId: "increased-action-skill-experience-gain",
    label: "Increased Action Skill Experience Gain",
  },
  "skill-experience-gain": {
    targetStatId: "increased-action-skill-experience-gain",
    label: "Increased Action Skill Experience Gain",
  },
  "m-distance-increased-for-safe-fall": {
    targetStatId: "m-distance-increased-for-safe-fall",
    label: "Distance increased for safe fall",
  },
  "m-increased-safe-fall-distance": {
    targetStatId: "m-distance-increased-for-safe-fall",
    label: "Distance increased for safe fall",
  },
  "to-trader-stage": { targetStatId: "trader-level", label: "Trader level" },
  "trader-level": { targetStatId: "trader-level", label: "Trader level" },
  "increased-dismemberment-chance": { targetStatId: "dismemberment-chance", label: "Dismemberment Chance" },
  "dismemberment-chance": { targetStatId: "dismemberment-chance", label: "Dismemberment Chance" },
  "increased-melee-attack-speed": { targetStatId: "increased-melee-attack-speed", label: "Increased Melee Attack Speed" },
  "increased-melee-weapon-attack-speed": { targetStatId: "increased-melee-attack-speed", label: "Increased Melee Attack Speed" },
  "increased-melee-physical-damage": { targetStatId: "increased-melee-physical-damage", label: "Increased Melee Physical Damage" },
  "increased-melee-weapon-physical-damage": { targetStatId: "increased-melee-physical-damage", label: "Increased Melee Physical Damage" },
  "melee-physical-damage": { targetStatId: "increased-melee-physical-damage", label: "Increased Melee Physical Damage" },
  "less-stamina-used-by-melee-attacks": { targetStatId: "less-stamina-used-by-melee-attacks", label: "Less Stamina Used by Melee Attacks" },
  "decreased-stamina-consumption-while-using-melee-weapons": { targetStatId: "less-stamina-used-by-melee-attacks", label: "Less Stamina Used by Melee Attacks" },
  "increased-hip-fire-accuracy": { targetStatId: "increased-hip-fire-accuracy", label: "Increased Hip Fire Accuracy" },
  "increased-ranged-weapon-hip-fire-accuracy": { targetStatId: "increased-hip-fire-accuracy", label: "Increased Hip Fire Accuracy" },
  "increased-ranged-physical-damage": { targetStatId: "increased-ranged-physical-damage", label: "Increased Ranged Physical Damage" },
  "ranged-physical-damage": { targetStatId: "increased-ranged-physical-damage", label: "Increased Ranged Physical Damage" },
  "attacks-with-shotgun-stun-enemies-for-additional-s-seconds": {
    targetStatId: "attacks-with-shotgun-stun-enemies-for-additional-s-seconds",
    label: "Attacks with shotguns stun enemies for an additional",
  },
  "attacks-with-shotgun-stun-enemies-for-s-seconds": {
    targetStatId: "attacks-with-shotgun-stun-enemies-for-additional-s-seconds",
    label: "Attacks with shotguns stun enemies for an additional",
  },
};

const CATEGORY_STAT_MERGES: Readonly<Record<string, Record<string, { targetStatId: string; label: string; targetCategory?: string }>>> = {
  Spears: {
    "increased-physical-damage-with-spears-bows-crossbows-and-sniper-rifles": {
      targetStatId: "increased-polearm-physical-damage",
      label: "Increased Polearm Physical Damage",
    },
  },
  "Sniper Rifles": {
    "increased-physical-damage-with-spears-bows-crossbows-and-sniper-rifles": {
      targetStatId: "increased-sniper-rifle-physical-damage",
      label: "Increased Sniper Rifle Physical Damage",
    },
  },
  "Bow and Crossbow": {
    "increased-physical-damage-with-spears-bows-crossbows-and-sniper-rifles": {
      targetStatId: "increased-bow-and-crossbow-physical-damage",
      label: "Increased Bow and Crossbow Physical Damage",
    },
  },
  "Assault Rifles": {
    "increased-assault-rifle-rocket-launcher-and-explosive-physical-damage": {
      targetStatId: "increased-machine-gun-physical-damage",
      label: "Increased Machine Gun Physical Damage",
      targetCategory: "Machine Guns",
    },
  },
  Pistols: {
    "increased-physical-damage-with-blade-weapons-pistols-and-submachine-guns": {
      targetStatId: "increased-pistol-physical-damage",
      label: "Increased Pistol Physical Damage",
    },
  },
};

const SPECIAL_DISPLAY: Readonly<Record<string, { category: string; label: string; valueText: string }>> = {
  "you-can-additionally-find-200-duke-s-casino-tokens-in-buried-treasures": {
    category: "Looting",
    label: "You can additionally find Duke's Casino Tokens in buried treasures",
    valueText: "100-200",
  },
  "you-can-additionally-find-200-old-cash-in-buried-treasures": {
    category: "Looting",
    label: "You can additionally find Old Cash in buried treasures",
    valueText: "100-200",
  },
};

const DISPLAY_ONLY_BONUSES: readonly {
  syntheticStatId: string;
  category: string;
  label: string;
  match: (text: string) => boolean;
}[] = [
  {
    syntheticStatId: "you-can-additionally-find-armor-weapons-rare-ore-in-buried-treasures",
    category: "Looting",
    label: "You can additionally find Armor, Weapons, Rare Ore or Superior Parts in buried treasures",
    match: (text) => text.includes("rare ore") && text.includes("buried treasure"),
  },
  {
    syntheticStatId: "enables-double-jump",
    category: "Mobility",
    label: "Can use Double Jump",
    match: (text) => text.includes("enables double jump"),
  },
];

const CATEGORY_BONUS_ORDER: Readonly<Record<string, readonly string[]>> = {
  Defense: [
    "increased-maximum-health",
    "increased-physical-damage-resistance",
    "stun-resistance",
    "reduced-light-armor-durability-loss",
    "reduced-medium-armor-movement-penalty",
    "reduced-medium-armor-stamina-penalty",
    "reduced-medium-armor-durability-loss",
    "reduced-heavy-armor-movement-and-stamina-penalty",
    "reduced-heavy-armor-durability-loss",
  ],
  Looting: [
    "increased-loot-stage",
    "to-loot-stage",
    "to-lockpicking",
    "increased-bobby-pin-and-lockpick-durability",
    "increased-item-quantity-in-buried-treasure",
    "smaller-buried-treasure-search-area",
    "you-can-additionally-find-200-duke-s-casino-tokens-in-buried-treasures",
    "you-can-additionally-find-200-old-cash-in-buried-treasures",
    "you-can-additionally-find-armor-weapons-rare-ore-in-buried-treasures",
    "increased-looting-speed-when-opening-untouched-containers",
  ],
  Miscellaneous: [
    "carry-weight",
    "increased-drone-inventory-carry-weight-limit",
    "increased-experience-gained-from-electrical-trap-kills",
    "increased-gained-exp-from-medical-healing-items",
    "increased-action-skill-experience-gain",
    "increased-experience-gain-from-kills",
    "decreased-damage-taken-from-land-mines",
    "s-increased-delay-timer-when-setting-off-land-mines",
  ],
  Mobility: [
    "maximum-stamina",
    "increased-stamina-regeneration-speed-when-sprinting",
    "m-distance-increased-for-safe-fall",
    "enables-double-jump",
    "increased-double-jump-height",
    "decreased-double-jump-stamina-use",
    "decreased-jumping-stamina-use",
  ],
  Stealth: [
    "increased-sneak-attack-physical-damage",
    "decreased-action-noise-level",
    "decreased-alerted-target-search-duration",
    "increased-crouch-speed",
    "increased-crouch-speed-and-stealth-effectiveness-in-low-light",
    "increased-stealth-effectiveness-in-low-light",
  ],
  Clubs: [
    "increased-club-weapon-physical-damage",
    "additional-physical-damage-to-stunned-targets-while-using-clubs",
    "successive-hits-with-clubs-cause-the-last-hit-to-deal-additional-33-physical-damage",
    "increased-chance-to-knock-down-enemies",
  ],
  "Blade Weapons": [
    "increased-blade-weapon-physical-damage",
    "max-bleeding-wounds-on-targets-using-blade-weapons",
    "additional-bleeding-wound-with-power-attack",
    "chance-to-cause-a-bleeding-wound-on-glancing-blows",
    "reduced-target-run-speed-with-bleeding-wounds",
  ],
  "Melee Weapons": [
    "increased-melee-physical-damage",
    "increased-melee-attack-speed",
    "less-stamina-used-by-melee-attacks",
    "recover-stamina-per-enemy-killed-using-melee-weapons",
    "increased-attack-speed-using-clubs-batons-knuckles-knives-and-swords",
    "recover-stamina-per-enemy-killed-using-clubs-batons-knuckles-knives-or-swords",
  ],
  "Trading and Missions": [
    "trader-level",
    "better-prices-when-buying-or-selling-from-traders",
    "more-dukes-for-completing-missions",
    "additional-mission-reward",
  ],
  "Survival and Metabolism": [
    "to-maximum-food-water",
    "to-maximum-food-and-thirst-limit",
    "decreased-speed-of-food-and-water-loss",
    "reduced-food-and-water-depletion-when-cold-or-overheated",
    "increased-healing-effectiveness-of-medical-healing-items",
    "increased-critical-injury-healing-speed",
    "increased-recovery-speed-using-antidotes",
    "reduced-poison-build-up-speed",
    "increased-poison-resistance",
    "increased-duration-of-consumable-effects",
    "reduced-chance-of-dysentery-when-using-consumables",
    "recover-health-every-second-while-not-very-hungry-or-thirsty",
    "increased-heat-and-cold-resistance",
    "s-increased-underwater-diving-duration",
  ],
  "Fist Weapons": [
    "increased-fist-weapon-physical-damage",
    "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons",
    "increased-chance-to-stun-targets-using-fist-weapons",
    "increased-chance-to-knockdown-target-using-fist-weapons",
  ],
  Sledgehammers: [
    "increased-sledgehammer-physical-damage",
    "increased-chance-to-knock-down-nearby-targets",
    "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets",
  ],
  Spears: [
    "increased-polearm-physical-damage",
    "to-polearm-target-armor-reduction",
  ],
  "Ranged Weapons": [
    "increased-ranged-physical-damage",
    "increased-hip-fire-accuracy",
    "increased-firearm-fire-rate-and-handling",
    "reduced-movement-penalty-when-reloading",
    "decreased-stamina-consumption-while-aiming-with-ranged-weapons",
    "to-ranged-weapon-target-armor-reduction",
  ],
  "Portable Turrets": [
    "increased-portable-turret-physical-damage",
    "increased-melee-portable-turret-attack-speed",
    "increased-ranged-portable-turret-fire-rate",
    "increased-ranged-portable-turret-reload-speed",
    "increased-ranged-portable-turret-magazine-size-by-rounds",
    "increased-portable-turret-active-range-by-m",
    "to-maximum-number-of-allowed-active-portable-turrets",
  ],
  "Bow and Crossbow": [
    "increased-bow-and-crossbow-physical-damage",
    "improved-bow-and-crossbow-aim-draw-and-reload-speed",
  ],
  "Sniper Rifles": [
    "increased-sniper-rifle-physical-damage",
    "improved-sniper-rifle-aim-and-reload-speed",
    "successive-kills-can-trigger-up-to-more-kill-streak-bonus-damage",
    "decreased-stamina-consumption-while-aiming-with-sniper-rifles",
    "to-sniper-rifle-target-penetration",
  ],
  Shotguns: [
    "increased-shotgun-physical-damage",
    "improved-shotgun-fire-rate-and-reload-speed",
    "attacks-with-shotgun-stun-enemies-for-additional-s-seconds",
  ],
};

function applyStatSplits(totals: Total[]): Total[] {
  const byId = new Map(totals.map((total) => [total.statId, { ...total }]));
  for (const [sourceId, config] of Object.entries(STAT_SPLITS)) {
    const source = byId.get(sourceId);
    if (!source) continue;
    for (const targetId of config.addTo) {
      const target = byId.get(targetId);
      if (target) {
        target.value += source.value;
      } else {
        byId.set(targetId, { statId: targetId, label: targetId, value: source.value, unit: source.unit });
      }
    }
    if (config.removeSource) byId.delete(sourceId);
  }
  return [...byId.values()];
}

function sortCategoryTotals(category: string, totals: DisplayTotal[]): DisplayTotal[] {
  const order = CATEGORY_BONUS_ORDER[category];
  if (!order) {
    return [...totals].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }
  const positions = new Map(order.map((statId, index) => [statId, index]));
  return [...totals].sort((a, b) => {
    const aPosition = positions.get(a.statId) ?? Number.MAX_SAFE_INTEGER;
    const bPosition = positions.get(b.statId) ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

function normalizeEffect(effect: SkillEffect): SkillEffect {
  const label = effect.label.trim().toLocaleLowerCase();
  if (["maximum health", "to maximum health", "increased maximum health"].includes(label)) {
    return { ...effect, statId: MAXIMUM_HEALTH_STAT_ID, label: "Increased Maximum Health" };
  }
  if (["carry weight", "to inventory carry limit"].includes(label)) {
    return { ...effect, statId: CARRY_WEIGHT_STAT_ID, label: "Carry Weight" };
  }
  return effect;
}

function capitalizeFirstLetter(label: string): string {
  const index = label.search(/[a-z]/i);
  return index < 0 ? label : label.slice(0, index) + label[index].toLocaleUpperCase() + label.slice(index + 1);
}

function addEffect(byStat: Map<string, Total>, original: SkillEffect): void {
  const effect = normalizeEffect(original);
  if (effect.includeInTotals === false || ATTRIBUTE_STAT_IDS.has(effect.statId as never)) return;
  const current = byStat.get(effect.statId);
  if (current) {
    if (current.unit !== effect.unit) throw new Error(`Build total "${effect.statId}" mixes units.`);
    current.value += effect.valuePerRank;
  } else {
    byStat.set(effect.statId, { statId: effect.statId, label: capitalizeFirstLetter(effect.label), value: effect.valuePerRank, unit: effect.unit });
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
  return [...byStat.values()].filter((total) => total.value !== 0);
}

function collectDisplayOnlyBonuses(build: PlannerBuild, skills: SkillNode[]): DisplayTotal[] {
  const results: DisplayTotal[] = [];
  const alreadyAdded = new Set<string>();
  for (const skill of skills) {
    if ((build.purchasedRanks[skill.id] ?? 0) < 1) continue;
    for (const effect of skill.effects) {
      const text = `${effect.displayText ?? ""} ${effect.label ?? ""}`.toLocaleLowerCase();
      for (const bonus of DISPLAY_ONLY_BONUSES) {
        if (alreadyAdded.has(bonus.syntheticStatId)) continue;
        if (!bonus.match(text)) continue;
        alreadyAdded.add(bonus.syntheticStatId);
        results.push({
          statId: bonus.syntheticStatId,
          category: bonus.category,
          label: bonus.label,
          value: 0,
          unit: "flat",
          valueText: "",
        });
      }
    }
  }
  return results;
}

const STAT_ID_CATEGORY_COUNT = (() => {
  const counts = new Map<string, number>();
  for (const entry of BUILD_TOTAL_CATALOG) {
    counts.set(entry.statId, (counts.get(entry.statId) ?? 0) + 1);
  }
  return counts;
})();

function createDisplayTotals(totals: Total[], displayOnlyBonuses: DisplayTotal[]): DisplayTotal[] {
  const byStat = new Map(totals.map((total) => [total.statId, total]));
  const catalogStatIds = new Set(BUILD_TOTAL_CATALOG.map((entry) => entry.statId));

  const perStat: DisplayTotal[] = [];
  const seenStatKeys = new Set<string>();
  for (const entry of BUILD_TOTAL_CATALOG) {
    const total = byStat.get(entry.statId);
    const statKey = `${entry.category}::${entry.statId}`;
    if (!total || seenStatKeys.has(statKey)) continue;
    seenStatKeys.add(statKey);
    const categoryMerge = CATEGORY_STAT_MERGES[entry.category]?.[entry.statId];
    const merge = categoryMerge ?? STAT_MERGES[entry.statId];
    const override = CATALOG_DISPLAY_OVERRIDES[entry.statId];
    perStat.push({
      statId: merge ? merge.targetStatId : entry.statId,
      category: categoryMerge?.targetCategory ?? entry.category,
      label: merge ? merge.label : override?.label ?? capitalizeFirstLetter(entry.label),
      value: override?.valueMultiplier !== undefined ? total.value * override.valueMultiplier : total.value,
      unit: total.unit,
      valueSuffix: override?.valueSuffix,
    });
  }

  const byCategoryLabel = new Map<string, DisplayTotal>();
  for (const item of perStat) {
    const labelKey = `${item.category}::${item.label.toLocaleLowerCase()}`;
    const existing = byCategoryLabel.get(labelKey);
    if (!existing) {
      byCategoryLabel.set(labelKey, { ...item });
      continue;
    }
    if (existing.unit !== item.unit) continue;
    existing.value += item.value;
    if (existing.valueSuffix === undefined && item.valueSuffix !== undefined) {
      existing.valueSuffix = item.valueSuffix;
    }
    const existingIsAlias = (STAT_ID_CATEGORY_COUNT.get(existing.statId) ?? 1) > 1;
    const itemIsNative = (STAT_ID_CATEGORY_COUNT.get(item.statId) ?? 1) === 1;
    if (existingIsAlias && itemIsNative) existing.statId = item.statId;
  }

  const displayed = [...byCategoryLabel.values()];

  displayed.push(...displayOnlyBonuses);

  for (const total of totals) {
    if (catalogStatIds.has(total.statId)) continue;

    const merge = STAT_MERGES[total.statId];
    if (merge) {
      const target = displayed.find(
        (row) => row.statId === merge.targetStatId && row.unit === total.unit,
      );
      if (target) {
        target.value += total.value;
      } else {
        displayed.push({
          statId: merge.targetStatId,
          category: "Miscellaneous",
          label: merge.label,
          value: total.value,
          unit: total.unit,
        });
      }
      continue;
    }

    const special = SPECIAL_DISPLAY[total.statId];
    if (special) {
      displayed.push({
        ...total,
        category: special.category,
        label: special.label,
        valueText: special.valueText,
      });
    } else {
      displayed.push({ ...total, category: "Miscellaneous" });
    }
  }
  return displayed;
}

function formatValue(total: DisplayTotal): string {
  if (total.valueText !== undefined) return total.valueText;
  const suffix = total.valueSuffix ?? (total.unit === "percent" ? "%" : "");
  return `${total.value > 0 ? "+" : ""}${total.value}${suffix}`;
}

function TotalRows({ totals }: { totals: DisplayTotal[] }) {
  return <dl className="build-totals__list">{totals.map((total) => (
    <div className="build-totals__row" key={`${total.category}-${total.statId}-${total.label}`}>
      <dt>{total.label}</dt>
      <dd className={`build-totals__value${total.valueText === undefined && total.value < 0 ? " build-totals__value--negative" : ""}`}>
        {formatValue(total)}
      </dd>
    </div>
  ))}</dl>;
}

function CategorySection({ node, totals, depth = 0 }: { node: BuildTotalCategoryNode; totals: DisplayTotal[]; depth?: number }) {
  const [open, setOpen] = useState(true);
  const direct = sortCategoryTotals(
    node.name,
    totals.filter((total) => total.category === node.name),
  );
  const children = (node.children ?? []).filter((child) =>
    totals.some((total) => total.category === child.name) || child.children?.some((grandchild) => totals.some((total) => total.category === grandchild.name)),
  );
  if (direct.length === 0 && children.length === 0) return null;
  const id = `build-total-category-${node.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <section className={`build-totals__category build-totals__category--depth-${depth}`}>
    <button type="button" className="build-totals__category-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
      <span>{node.name}</span><span className="build-totals__chevron" aria-hidden="true">{open ? "\u2212" : "+"}</span>
    </button>
    {open ? <div id={id} className="build-totals__category-content">
      {direct.length ? <TotalRows totals={direct} /> : null}
      {children.map((child) => <CategorySection key={child.name} node={child} totals={totals} depth={depth + 1} />)}
    </div> : null}
  </section>;
}

export function BuildTotals({ build, skills }: BuildTotalsProps) {
  const totals = useMemo(() => {
    const numericTotals = applyStatSplits(calculateBuildTotals(build, skills));
    const displayOnly = collectDisplayOnlyBonuses(build, skills);
    return createDisplayTotals(numericTotals, displayOnly);
  }, [build.purchasedRanks, skills]);
  return <section className="build-totals" aria-labelledby="build-totals-heading">
    <h2 id="build-totals-heading" className="build-totals__heading">Build Totals</h2>
    {totals.length === 0 ? <p className="build-totals__empty">No build bonuses selected.</p> :
      BUILD_TOTAL_HIERARCHY.map((node) => <CategorySection key={node.name} node={node} totals={totals} />)}
  </section>;
}

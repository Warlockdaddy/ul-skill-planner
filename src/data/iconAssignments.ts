import type { SkillEffect, SkillNode } from "../domain/types";

/**
 * Icon assignment by shared bonuses.
 *
 * The universal rule: every node that displays the exact same set of bonus
 * lines shares the same icon. We deliberately match on the VISIBLE bonus text
 * (what the tooltip shows), never on statId.
 *
 * Why not statId: the same visible bonus is stored under inconsistent statIds
 * in the tree data (for example "physical-damage-resistance" vs
 * "increased-physical-damage-resistance" both render
 * "4% increased Physical Damage Resistance"). Matching on the rendered text
 * groups those nodes correctly regardless of the underlying statId.
 */

/**
 * Formats one effect into the exact line the tooltip shows.
 * Mirrors SkillTooltip.formatEffect so signatures line up with what the
 * player reads on the node.
 */
function formatBonusLine(effect: SkillEffect): string {
  if (effect.displayText) return effect.displayText;
  const sign = effect.valuePerRank > 0 ? "+" : "";
  const suffix = effect.unit === "percent" ? "%" : "";
  return `${sign}${effect.valuePerRank}${suffix} ${effect.label}`;
}

/**
 * Builds a stable signature from a set of bonus lines.
 * Normalizes whitespace and case, and sorts so line order never matters.
 * Two nodes share a signature exactly when they show the same bonus set.
 */
function signatureFromLines(lines: string[]): string {
  return lines
    .map((line) => line.trim().replace(/\s+/g, " ").toLocaleLowerCase())
    .sort()
    .join(" || ");
}

/** Canonical bonus signature for a node, derived from its rendered lines. */
export function getBonusSignature(node: Pick<SkillNode, "effects">): string {
  return signatureFromLines(node.effects.map(formatBonusLine));
}

/**
 * One icon mapped to the exact bonus lines that identify it.
 *
 * `bonuses` must contain the exact rendered lines (copy them straight from a
 * node's tooltip). Order does not matter. Every node whose complete bonus set
 * matches these lines will use `icon`.
 */
interface IconAssignment {
  icon: string;
  bonuses: string[];
}

/**
 * The icon registry. Add one entry per distinct bonus set.
 *
 * Each PNG must follow the shared icon spec (48x48, pure white, binary alpha,
 * ~40px footprint) and live in public/icons/skills/.
 *
 * Note: a single icon may be reused for multiple distinct bonus sets — just
 * add a separate entry per bonus set that points at the same PNG.
 */
const iconAssignments: IconAssignment[] = [
  /* -------- Attribute nodes (unified into the same system) -------- */
  { icon: "/icons/skills/strength-bicep.png", bonuses: ["+5 to Strength"] },
  { icon: "/icons/skills/fortitude-heart.png", bonuses: ["+5 to Fortitude"] },
  { icon: "/icons/skills/dexterity-hand.png", bonuses: ["+5 to Dexterity"] },
  { icon: "/icons/skills/perception-eye.png", bonuses: ["+5 to Perception"] },
  { icon: "/icons/skills/intellect-brain.png", bonuses: ["+5 to Intellect"] },

  /* -------- Bonus-based nodes -------- */
  {
    icon: "/icons/skills/resist-damage-shell.png",
    bonuses: [
      "4% increased Physical Damage Resistance",
      "10% increased Stun Resistance",
    ],
  },
  {
    icon: "/icons/skills/resist-damage-shield.png",
    bonuses: [
      "5% increased Physical Damage Resistance",
      "15% increased Stun Resistance",
    ],
  },
  {
    icon: "/icons/skills/metabolism-stomach.png",
    bonuses: [
      "15% decreased speed of food and water loss",
    ],
  },
  {
    // Same stomach icon reused for the Consumable-duration node.
    icon: "/icons/skills/metabolism-stomach.png",
    bonuses: [
      "20% increased duration of Consumable effects",
    ],
  },
  {
    // Same stomach icon reused for the Food/Water + diving + dysentery node.
    icon: "/icons/skills/metabolism-stomach.png",
    bonuses: [
      "+10 to Maximum Food/Water",
      "40s increased underwater diving duration",
      "2% reduced chance of Dysentery when using consumables",
    ],
  },
  {
    icon: "/icons/skills/health-plus.png",
    bonuses: [
      "+5 to Maximum Health",
    ],
  },
  {
    // Same plus icon reused for the larger Maximum Health node.
    icon: "/icons/skills/health-plus.png",
    bonuses: [
      "+10 to Maximum Health",
    ],
  },
  {
    icon: "/icons/skills/fist-brass-knuckles.png",
    bonuses: [
      "5% increased Fist Weapon Physical Damage",
      "3% increased decapitation chance with punches to the head using Fist Weapons",
    ],
  },
  {
    // Same brass knuckles icon reused for the upgraded Fist Weapon node.
    icon: "/icons/skills/fist-brass-knuckles.png",
    bonuses: [
      "5% increased Fist Weapon Physical Damage",
      "5% increased decapitation chance with punches to the head using Fist Weapons",
      "Punches to the head negate ability to get infected by the Target",
    ],
  },
  {
    // Same brass knuckles icon reused for the Fist Weapon stun/knockdown node.
    icon: "/icons/skills/fist-brass-knuckles.png",
    bonuses: [
      "8% increased chance to Stun Targets using Fist Weapons",
      "10% increased chance to knockdown Target using Fist Weapons",
    ],
  },
  {
    icon: "/icons/skills/poison-skull.png",
    bonuses: [
      "5% increased Poison Resistance",
      "10% reduced poison build up speed",
      "10% increased recovery speed using antidotes",
    ],
  },
  {
    // Same stomach icon reused for the Maximum Food/Water node.
    icon: "/icons/skills/metabolism-stomach.png",
    bonuses: [
      "+20 to Maximum Food/Water",
    ],
  },
  {
    // Same stomach icon reused for the 10% food/water-loss node.
    icon: "/icons/skills/metabolism-stomach.png",
    bonuses: [
      "10% decreased speed of food and water loss",
    ],
  },
  {
    icon: "/icons/skills/medic-doctor.png",
    bonuses: [
      "10% increased healing effectiveness of medical healing items",
      "25% increased gained EXP from medical healing items",
    ],
  },
  {
    icon: "/icons/skills/shotgun.png",
    bonuses: [
      "5% increased Shotgun Physical Damage",
    ],
  },
  {
    // Same shotgun icon reused for the fire-rate/reload node.
    icon: "/icons/skills/shotgun.png",
    bonuses: [
      "5% improved Shotgun Fire Rate and Reload Speed",
    ],
  },
  {
    // Same shotgun icon reused for the stun node.
    icon: "/icons/skills/shotgun.png",
    bonuses: [
      "Attacks with Shotgun stun enemies for 4s seconds",
    ],
  },
  {
    // Same shotgun icon reused for the +2s stun-extension node.
    icon: "/icons/skills/shotgun.png",
    bonuses: [
      "Attacks with Shotgun stun enemies for additional 2s seconds",
    ],
  },
  {
    // Same shotgun icon reused for the +2s stun-extension + leg-cripple node.
    icon: "/icons/skills/shotgun.png",
    bonuses: [
      "Attacks with Shotgun stun enemies for additional 2s seconds.",
      "Leg shots with Shotguns cripple opponents",
    ],
  },
  {
    icon: "/icons/skills/health-regen-plus-cluster.png",
    bonuses: [
      "Recover 0.025 Health every second while not very hungry or thirsty",
      "20% increased Critical Injury healing speed",
    ],
  },
  {
    icon: "/icons/skills/weather-thermometer.png",
    bonuses: [
      "+5 increased Heat and Cold Resistance",
      "15% reduced food and water depletion when cold or overheated",
    ],
  },
  {
    icon: "/icons/skills/heavy-armor.png",
    bonuses: [
      "10% reduced Heavy Armor durability loss",
      "5% reduced Heavy Armor movement and stamina penalty",
    ],
  },
  {
    icon: "/icons/skills/melee-stamina-trex.png",
    bonuses: [
      "10% less Stamina Used by Melee Attacks",
      "Recover 5 Stamina per Enemy Killed using Melee Weapons",
    ],
  },
  {
    icon: "/icons/skills/land-mine-boot-trap.png",
    bonuses: [
      "0.5s increased delay timer when setting off Land Mines",
      "20% decreased damage taken from Land Mines",
    ],
  },
  {
    // Same boot-and-trap icon reused for the upgraded Land Mine node.
    icon: "/icons/skills/land-mine-boot-trap.png",
    bonuses: [
      "1s increased delay timer when setting off Land Mines",
      "20% decreased damage taken from Land Mines",
      "Can pick up Land Mines",
    ],
  },
  {
    icon: "/icons/skills/sneak-attack-dagger.png",
    bonuses: [
      "75% increased Sneak Attack Physical Damage",
      "(Does not affect Great Swords, Great Axes or Sledgehammers)",
    ],
  },
  {
    // Same poised-dagger icon reused for the 50% Sneak Attack node.
    icon: "/icons/skills/sneak-attack-dagger.png",
    bonuses: [
      "50% increased Sneak Attack Physical Damage",
      "(Does not affect Great Swords, Great Axes or Sledgehammers)",
    ],
  },
  {
    icon: "/icons/skills/bow-and-arrow.png",
    bonuses: [
      "15% improved Bow and Crossbow Aim, Draw and Reload Speed",
    ],
  },
  {
    // Same bow-and-arrow icon reused for the physical-damage node.
    icon: "/icons/skills/bow-and-arrow.png",
    bonuses: [
      "5% increased Bow and Crossbow Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/fast-bow-and-arrow.png",
    bonuses: [
      "10% improved Bow and Crossbow Aim, Draw and Reload Speed",
    ],
  },
  {
    icon: "/icons/skills/loot-sack.png",
    bonuses: [
      "+5 to Loot Stage",
      "10% increased looting speed when opening Untouched Containers",
    ],
  },
  {
    // Same tied loot-sack icon reused for the percentage Loot Stage node.
    icon: "/icons/skills/loot-sack.png",
    bonuses: [
      "15% increased Loot Stage",
      "10% increased looting speed when opening Untouched Containers",
    ],
  },
  {
    // Same tied loot-sack icon reused for the percentage Loot Stage node.
    icon: "/icons/skills/loot-sack.png",
    bonuses: [
      "10% increased Loot Stage",
      "10% increased looting speed when opening Untouched Containers",
    ],
  },
  {
    icon: "/icons/skills/polearm-spear.png",
    bonuses: [
      "5% increased Polearm Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/fast-polearm-spear.png",
    bonuses: [
      "10% to Polearm Target Armor Reduction",
    ],
  },
  {
    icon: "/icons/skills/meat-and-knife.png",
    bonuses: [
      "+10 to Maximum Food/Water",
      "10% increased amount of resources gathered from animals with Bladed Tools",
    ],
  },
  {
    // Same meat-and-knife icon reused for the larger animal-harvest node.
    icon: "/icons/skills/meat-and-knife.png",
    bonuses: [
      "15% increased amount of resources gathered from animals with Bladed Tools",
    ],
  },
  {
    icon: "/icons/skills/sniper-rifle.png",
    bonuses: [
      "5% increased Sniper Rifle Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/sniper-penetration-round.png",
    bonuses: [
      "+1 to Sniper Rifle Target Penetration.",
      "Requires AP Rounds.",
    ],
  },
  {
    icon: "/icons/skills/fast-sniper-rifle.png",
    bonuses: [
      "5% improved Sniper Rifle Aim and Reload Speed",
    ],
  },
  {
    icon: "/icons/skills/bear-paw-print.png",
    bonuses: [
      "Track small game like rabbits, snakes or chickens. They are marked on your compass and map",
    ],
  },
  {
    // Same bear-paw icon reused for medium-game tracking.
    icon: "/icons/skills/bear-paw-print.png",
    bonuses: [
      "Track medium game like deer, boars, wolves and coyotes",
    ],
  },
  {
    // Same bear-paw icon reused for big-game tracking.
    icon: "/icons/skills/bear-paw-print.png",
    bonuses: [
      "Track big game like mountain lions and bears",
    ],
  },
  {
    icon: "/icons/skills/ranged-armor-reduction-round.png",
    bonuses: [
      "7.5% to Ranged Weapon Target Armor Reduction",
    ],
  },
  {
    icon: "/icons/skills/sniper-scope-eye.png",
    bonuses: [
      "10% decreased stamina consumption while aiming with Sniper Rifles",
      "Successive kills can trigger up to 20% more kill streak bonus damage",
    ],
  },
  {
    icon: "/icons/skills/scattered-seeds.png",
    bonuses: [
      "50% Chance to harvest an additional plant",
      "Increased harvesting area by 1 while using a Sickle or Scythe",
    ],
  },
  {
    icon: "/icons/skills/three-leaf-plant.png",
    bonuses: [
      "-25% Farm Plot crafting cost",
    ],
  },
  {
    icon: "/icons/skills/explosion-burst.png",
    bonuses: [
      "10% increased Ranged Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/open-treasure-chest.png",
    bonuses: [
      "10% increased item quantity in buried treasure",
	  "20% smaller Buried Treasure Search Area",
    ],
  },
  {
    icon: "/icons/skills/open-treasure-chest.png",
    bonuses: [
      "10% increased item quantity in buried treasure",
	  "You can additionally find 100-200 Old Cash in buried treasures",
    ],
  },
  {
    icon: "/icons/skills/open-treasure-chest.png",
    bonuses: [
      "10% increased item quantity in buried treasure",
	  "You can additionally find 100-200 Duke's Casino Tokens in buried treasures",
    ],
  },
  {
    icon: "/icons/skills/open-treasure-chest.png",
    bonuses: [
      "10% increased item quantity in buried treasure",
	  "You can additionally find Armor, Weapons, Rare Ore or Superior Parts in buried treasures",
    ],
  },
  {
    icon: "/icons/skills/energy-blast-two-trails.png",
    bonuses: [
      "10% increased Firearm Fire Rate and Handling",
    ],
  },
  {
    icon: "/icons/skills/pistol.png",
    bonuses: [
      "5% increased Pistol Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/pistol.png",
    bonuses: [
      "10% improved Pistol Fire Rate and Reload Speed",
    ],
  },
  {
    icon: "/icons/skills/pistol.png",
    bonuses: [
      "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/pistol-figure.png",
    bonuses: [
      "10% increased Hip Fire Accuracy",
	  "33% reduced movement penalty when reloading",
    ],
  },
  {
    icon: "/icons/skills/light-armor-strap.png",
    bonuses: [
      "10% reduced Light Armor durability loss",
    ],
  },
  {
    icon: "/icons/skills/crossed-batons.png",
    bonuses: [
      "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords",
	  "Recover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords",
    ],
  },
  {
    icon: "/icons/skills/running-figure.png",
    bonuses: [
      "+10 increased Maximum Stamina",
    ],
  },
  {
    icon: "/icons/skills/running-figure.png",
    bonuses: [
      "5 increased Maximum Stamina",
	  "5% increased stamina regeneration speed when sprinting",
    ],
  },
  {
    icon: "/icons/skills/fox-silhouette.png",
    bonuses: [
      "While Crouching:",
	  "8.5% increased Crouch speed",
	  "8.5% decreased action noise level",
	  "10% increased stealth effectiveness in low light",
	  "11.5% decreased Alerted Target search duration",
    ],
  },
  {
    icon: "/icons/skills/three-line-swish.png",
    bonuses: [
      "10% increased Melee Attack Speed",
	  "Recover 5 Stamina per Enemy Killed using Melee Weapons",
    ],
  },
  {
    icon: "/icons/skills/three-line-swish.png",
    bonuses: [
      "5% increased Melee Weapon Attack Speed",
    ],
  },
  {
    icon: "/icons/skills/knife-machete.png",
    bonuses: [
      "5% increased Blade Weapon Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/bleeding-heart.png",
    bonuses: [
      "+1 Max Bleeding Wounds on Targets using Blade Weapons",
	  "+15% chance to cause a Bleeding Wound on Glancing Blows",
	  "+1 Additional Bleeding Wound with Power Attack",
	  "5% reduced Target run speed with Bleeding Wounds",
    ],
  },
  {
    icon: "/icons/skills/lockpick-tool.png",
    bonuses: [
      "25 to Lockpicking",
	  "20% increased Bobby Pin and Lockpick Durability",
    ],
  },
  {
    icon: "/icons/skills/lockpick-tool.png",
    bonuses: [
      "25 to Lockpicking",
	  "30% increased Bobby Pin and Lockpick Durability",
    ],
  },
  {
    icon: "/icons/skills/rabbit-spring-leg.png",
    bonuses: [
      "10% decreased Jumping Stamina use",
	  "+1m distance increased for safe fall",
	  "Enables Double Jump",
    ],
  },
  {
    icon: "/icons/skills/rabbit-spring-leg.png",
    bonuses: [
      "10% decreased Jumping Stamina use",
	  "10% decreased Double Jump Stamina use",
	  "33% increased Double Jump Height",
	  "+1 m increased safe fall distance",
    ],
  },
  {
    icon: "/icons/skills/rabbit-spring-leg.png",
    bonuses: [
      "10% decreased Jumping Stamina use",
	  "10% decreased Double Jump Stamina use",
	  "33% increased Double Jump Height",
	  "+1 m increased safe fall distance",
	  "Never get a broken leg from falling",
    ],
  },
  {
    icon: "/icons/skills/rabbit-spring-leg.png",
    bonuses: [
      "10% decreased Jumping Stamina use",
	  "10% decreased Double Jump Stamina use",
	  "33% increased Double Jump Height",
	  "+2 m increased safe fall distance",
	  "Never get a sprained or broken leg from falling",
    ],
  },
  {
    icon: "/icons/skills/submachine-gun.png",
    bonuses: [
      "5% improved Machine Gun Handling, Aim and Reload Speed",
    ],
  },
  {
    icon: "/icons/skills/submachine-gun.png",
    bonuses: [
      "5% increased Submachine Gun Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/wrench.png",
    bonuses: [
      "10% increased Salvage Tool Physical Damage",
	  "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
    ],
  },
  {
    icon: "/icons/skills/cargo-drone.png",
    bonuses: [
      "25% increased Drone Inventory Carry Weight Limit",
    ],
  },
  {
    icon: "/icons/skills/money.png",
    bonuses: [
      "5% better prices when Buying or Selling from Traders",
    ],
  },
  {
    icon: "/icons/skills/money.png",
    bonuses: [
      "+10 trader level",
    ],
  },
  {
    icon: "/icons/skills/money.png",
    bonuses: [
      "5% more Dukes for completing Missions",
    ],
  },
  {
    icon: "/icons/skills/money.png",
    bonuses: [
      "5% more Dukes for completing Missions",
	  "+1 Additional mission Reward",
    ],
  },
  {
    icon: "/icons/skills/money.png",
    bonuses: [
      "5% better prices when Buying or Selling from Traders",
	  "5% more Dukes for completing Missions",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "10% increased Ranged Portable Turret Fire Rate",
	  "25% increased Melee Portable Turret Attack Speed",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "+1 to maximum number of allowed active Portable Turrets",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "10% increased Portable Turret Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "Increased Portable Turret active Range by 4m",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "Increased Ranged Portable Turret Magazine Size by 20 rounds",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "10% increased Ranged Portable Turret Reload Speed",
    ],
  },
  {
    icon: "/icons/skills/talk.png",
    bonuses: [
      "10% increased Physical Resistance for nearby Allies and Party Members",
    ],
  },
  {
    icon: "/icons/skills/talk.png",
    bonuses: [
      "10% increased Loot for nearby Allies and Party Members",
    ],
  },
  {
    icon: "/icons/skills/talk.png",
    bonuses: [
      "50% increased Health Regeneration for nearby Allies and Party Members",
    ],
  },
  {
    icon: "/icons/skills/talk.png",
    bonuses: [
      "+5 to all Attributes for nearby Allies and Party Members",
    ],
  },
  {
    icon: "/icons/skills/talk.png",
    bonuses: [
      "20% increased Damage for nearby Allies and Party Members",
    ],
  },
  {
    icon: "/icons/skills/experience.png",
    bonuses: [
      "5% increased Experience gain from kills",
    ],
  },
  {
    icon: "/icons/skills/batons.png",
    bonuses: [
      "10% increased Baton Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/batons.png",
    bonuses: [
      "20% increased Stun Duration of Stun Batons",
    ],
  },
  {
    icon: "/icons/skills/turret.png",
    bonuses: [
      "20% increased Experience Gained from Electrical Trap kills",
    ],
  },
  {
    icon: "/icons/skills/leather-armor.png",
    bonuses: [
      "10% reduced Medium Armor durability loss",
	  "10% reduced Medium Armor movement penalty",
	  "12.5% reduced Medium Armor stamina penalty",
    ],
  },
  {
    icon: "/icons/skills/club.png",
    bonuses: [
      "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/club.png",
    bonuses: [
      "5% increased Club Weapon Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/club.png",
    bonuses: [
      "15% additional Physical Damage to Stunned Targets while using Clubs",
	  "15% increased chance to knock down enemies",
    ],
  },
  {
    icon: "/icons/skills/fist.png",
    bonuses: [
      "10% increased Melee Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/fist.png",
    bonuses: [
      "5% increased Melee Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/hammer-drop.png",
    bonuses: [
      "5% increased Sledgehammer Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/hammer-drop.png",
    bonuses: [
      "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets",
	  "5% increased chance to knock down nearby Targets",
    ],
  },
  {
    icon: "/icons/skills/rocket.png",
    bonuses: [
      "10% increased Rocket Launcher and Explosive Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/rocket.png",
    bonuses: [
      "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance",
	  "5% improved Rocket Launcher Reload Speed",
    ],
  },
  {
    icon: "/icons/skills/mine-wagon.png",
    bonuses: [
      "10% increased Mining and Woodcutting Tool Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/pickaxe.png",
    bonuses: [
      "15% increased Mining and Woodcutting Tool Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/miner.png",
    bonuses: [
      "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
    ],
  },
  {
    icon: "/icons/skills/knapsack.png",
    bonuses: [
      "+20 to Inventory Carry Limit",
    ],
  },
  {
    icon: "/icons/skills/hand.png",
    bonuses: [
      "10% decreased stamina consumption while using Melee Weapons",
	  "10% decreased stamina consumption while aiming with Ranged Weapons",
    ],
  },
  {
    icon: "/icons/skills/ak47.png",
    bonuses: [
      "5% increased Machine Gun Physical Damage",
    ],
  },
  {
    icon: "/icons/skills/ak47.png",
    bonuses: [
      "Recover 2 Stamina on each successful shot using Machine Guns",
    ],
  },
];

/** Precomputed signature -> icon lookup, built once at module load. */
const iconBySignature: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const assignment of iconAssignments) {
    const signature = signatureFromLines(assignment.bonuses);
    if (map.has(signature)) {
      console.warn(
        `iconAssignments: duplicate signature for bonuses [${assignment.bonuses.join(
          " / ",
        )}] — the earlier entry will be overwritten.`,
      );
    }
    map.set(signature, assignment.icon);
  }
  return map;
})();

/**
 * Returns the icon path for a node whose bonus set has a registered icon,
 * or undefined to fall back to the default SVG symbol.
 */
export function getNodeIconSrc(node: Pick<SkillNode, "effects">): string | undefined {
  const iconPath = iconBySignature.get(getBonusSignature(node));
  if (!iconPath) return undefined;
  return `${import.meta.env.BASE_URL}${iconPath.replace(/^\/+/, "")}`;
}

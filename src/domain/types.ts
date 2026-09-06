/**
 * The five temporary category identifiers currently used by the prototype.
 * These can be renamed when the real center-class names are confirmed.
 */
export type SkillCategoryId =
  | "strength"
  | "fortitude"
  | "dexterity"
  | "perception"
  | "intellect";

/**
 * Identifiers for the planner's original icon artwork.
 */
export type SkillIcon =
  | "assault-rifle"
  | "wrench"
  | "shield"
  | "crossbow"
  | "knife"
  | "brain"
  | "heart"
  | "bicep"
  | "eye"
  | "hand"
  | "lockpick"
  | "handshake"
  | "experience"
  | "fist"
  | "pickaxe"
  | "stomach"
  | "plus"
  | "thief"
  | "bow"
  | "arrow"
  | "cheetah"
  | "treadmill"
  | "magazine"
  | "sack"
  | "bullet"
  | "sniper"
  | "scope"
  | "pistol"
  | "machine-gun"
  | "fox"
  | "blood"
  | "machete"
  | "running-man"
  | "submachine-gun"
  | "talking-man"
  | "turret"
  | "baton"
  | "club"
  | "sledgehammer"
  | "backpack"
  | "diamond"
  | "brass-knuckles"
  | "poison"
  | "doctor"
  | "shotgun"
  | "spear"
  | "meat"
  | "seeds"
  | "shell"
  | "paw-print"
  | "plant"
  | "treasure"
  | "shirt"
  | "drone"
  | "minecart"
  | "rocket-launcher"
  | "bear-trap"
  | "thermometer"
  | "class-enforcer"
  | "class-scout"
  | "class-recon"
  | "class-specialist"
  | "class-assault";

export type SkillEffectUnit = "flat" | "percent";

/**
 * One numerical bonus granted when a skill node is allocated.
 * valuePerRank is retained as a legacy property name for compatibility.
 * Since every real node is binary, the value is applied exactly once.
 */
export interface SkillEffect {
  statId: string;
  label: string;
  valuePerRank: number;
  unit: SkillEffectUnit;
  sortOrder?: number;

  /** Exact cleaned localized line shown in the hover tooltip. */
  displayText?: string;

  /** False for localized informational lines that do not belong in Build Totals. */
  includeInTotals?: boolean;
}

export interface SkillCategory {
  id: SkillCategoryId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: SkillIcon;
}

/**
 * One clickable, binary skill-tree node.
 */
export interface SkillNode {
  id: string;
  name: string;
  description: string;
  categoryId: SkillCategoryId;
  icon: SkillIcon;
  x: number;
  y: number;
  cost: number;

  /**
   * Retained temporarily so the current prototype data still compiles.
   * The application treats every node as binary regardless of this value.
   */
  maxRank: number;

  /**
   * Existing linear or AND prerequisites.
   * This remains supported for all current prototype nodes.
   */
  prerequisites: string[];

  /**
   * Optional alternate prerequisite routes.
   *
   * The outer array means OR. Each inner array means AND.
   *
   * Example:
   * [["left-route-3"], ["right-route-3"]]
   * means left-route-3 OR right-route-3 can reach this node.
   *
   * Example:
   * [["node-a", "node-b"]]
   * means node-a AND node-b are both required.
   */
  prerequisiteGroups?: string[][];

  effects: SkillEffect[];
}

/**
 * A large, non-clickable icon placed between parallel skill branches.
 * Context hubs are visual labels only. They never cost points, participate
 * in pathfinding, become allocated, or contribute to Build Totals.
 */
export interface SkillContextHub {
  id: string;
  name: string;
  description: string;
  categoryId: SkillCategoryId;
  icon: SkillIcon;
  x: number;
  y: number;
}

export interface SkillEdge {
  id: string;
  from: string;
  to: string;
}

export interface PlannerBuild {
  characterLevel: number;
  bonusSkillPoints: number;
  selectedClassId: SkillCategoryId | null;

  /**
   * Legacy property name retained for compatibility.
   * Allocated nodes are stored with the value 1.
   */
  purchasedRanks: Record<string, number>;
}

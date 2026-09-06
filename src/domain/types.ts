export type SkillCategoryId =
  | "strength"
  | "fortitude"
  | "dexterity"
  | "perception"
  | "intellect";

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

export interface SkillEffect {
  statId: string;
  label: string;
  valuePerRank: number;
  unit: SkillEffectUnit;
  sortOrder?: number;

  displayText?: string;

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

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  categoryId: SkillCategoryId;
  icon: SkillIcon;
  x: number;
  y: number;
  cost: number;

  maxRank: number;

  prerequisites: string[];

  prerequisiteGroups?: string[][];

  effects: SkillEffect[];
}

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

  purchasedRanks: Record<string, number>;
}

import type { SkillCategory } from "../domain/types";

export const skillCategories: SkillCategory[] = [
  {
    id: "strength",
    name: "Strength",
    shortName: "STR",
    description: "Skills associated with Strength.",
    color: "#c98742",
    icon: "bicep",
  },
  {
    id: "fortitude",
    name: "Fortitude",
    shortName: "FOR",
    description: "Skills associated with Fortitude.",
    color: "#c9584e",
    icon: "heart",
  },
  {
    id: "dexterity",
    name: "Dexterity",
    shortName: "DEX",
    description: "Skills associated with Dexterity.",
    color: "#44bd69",
    icon: "hand",
  },
  {
    id: "perception",
    name: "Perception",
    shortName: "PER",
    description: "Skills associated with Perception.",
    color: "#a44bbb",
    icon: "eye",
  },
  {
    id: "intellect",
    name: "Intellect",
    shortName: "INT",
    description: "Skills associated with Intellect.",
    color: "#527aa7",
    icon: "brain",
  },
];

export function getCategoryById(
  categoryId: SkillCategory["id"],
): SkillCategory {
  const category = skillCategories.find(
    (candidate) => candidate.id === categoryId,
  );

  if (!category) {
    throw new Error(`Unknown skill category: ${categoryId}`);
  }

  return category;
}
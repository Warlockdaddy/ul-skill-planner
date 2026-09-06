import type { SkillIcon } from "../domain/types";

export interface IconDefinition {
  id: SkillIcon;
  name: string;
}

export const iconDefinitions: IconDefinition[] = [
  { id: "assault-rifle", name: "Assault Rifle" },
  { id: "wrench", name: "Wrench" },
  { id: "shield", name: "Shield" },
  { id: "crossbow", name: "Crossbow" },
  { id: "knife", name: "Knife" },
  { id: "brain", name: "Brain" },
  { id: "heart", name: "Heart" },
  { id: "bicep", name: "Bicep" },
  { id: "eye", name: "Eye" },
  { id: "hand", name: "Hand" },
  { id: "lockpick", name: "Lockpick" },
  { id: "handshake", name: "Handshake" },
  { id: "experience", name: "Experience" },
  { id: "fist", name: "Fist" },
  { id: "pickaxe", name: "Pickaxe" },
  { id: "stomach", name: "Stomach" },
  { id: "plus", name: "Plus" },
  { id: "thief", name: "Thief" },
  { id: "bow", name: "Bow" },
  { id: "arrow", name: "Arrow" },
  { id: "cheetah", name: "Cheetah" },
  { id: "treadmill", name: "Treadmill" },
  { id: "magazine", name: "Magazine" },
  { id: "sack", name: "Sack" },
  { id: "bullet", name: "Bullet" },
  { id: "sniper", name: "Sniper" },
  { id: "scope", name: "Scope" },
  { id: "pistol", name: "Pistol" },
  { id: "machine-gun", name: "Machine Gun" },
  { id: "fox", name: "Fox" },
  { id: "blood", name: "Blood" },
  { id: "machete", name: "Machete" },
  { id: "running-man", name: "Running Man" },
  { id: "submachine-gun", name: "Submachine Gun" },
  { id: "talking-man", name: "Talking Man" },
  { id: "turret", name: "Turret" },
  { id: "baton", name: "Baton" },
  { id: "club", name: "Club" },
  { id: "sledgehammer", name: "Sledgehammer" },
  { id: "backpack", name: "Backpack" },
  { id: "diamond", name: "Diamond" },
  { id: "brass-knuckles", name: "Brass Knuckles" },
  { id: "poison", name: "Poison" },
  { id: "doctor", name: "Doctor" },
  { id: "shotgun", name: "Shotgun" },
  { id: "spear", name: "Spear" },
  { id: "meat", name: "Meat" },
  { id: "seeds", name: "Seeds" },
  { id: "shell", name: "Shell" },
  { id: "paw-print", name: "Paw Print" },
  { id: "plant", name: "Plant" },
  { id: "treasure", name: "Treasure" },
  { id: "shirt", name: "Shirt" },
  { id: "drone", name: "Drone" },
  { id: "minecart", name: "Minecart" },
  { id: "rocket-launcher", name: "Rocket Launcher" },
  { id: "bear-trap", name: "Bear Trap" },
  { id: "thermometer", name: "Thermometer" },
];

export function getIconDefinition(
  iconId: SkillIcon,
): IconDefinition {
  const definition = iconDefinitions.find(
    (candidate) => candidate.id === iconId,
  );

  if (!definition) {
    throw new Error(`Unknown skill icon: ${iconId}`);
  }

  return definition;
}
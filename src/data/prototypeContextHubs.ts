import type {
  SkillCategoryId,
  SkillContextHub,
  SkillIcon,
} from "../domain/types";

const CX = 3100;
const CY = 3100;
const INNER_HUB_R = 1150;
const OUTER_HUB_R = 2030;
const MODULE_OFFSETS = [-24, 0, 24] as const;

const classes: Array<{
  id: SkillCategoryId;
  angle: number;
  icons: [SkillIcon, SkillIcon, SkillIcon];
}> = [
  {
    id: "strength",
    angle: -90,
    icons: ["poison", "stomach", "club"],
  },
  {
    id: "fortitude",
    angle: -18,
    icons: ["shield", "meat", "thermometer"],
  },
  {
    id: "dexterity",
    angle: 54,
    icons: ["running-man", "knife", "pistol"],
  },
  {
    id: "perception",
    angle: 126,
    icons: ["scope", "bow", "treasure"],
  },
  {
    id: "intellect",
    angle: 198,
    icons: ["wrench", "turret", "drone"],
  },
];

const polar = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Math.round(CX + Math.cos(radians) * radius),
    y: Math.round(CY + Math.sin(radians) * radius),
  };
};

const innerHubs: SkillContextHub[] = classes.flatMap(
  (classInfo) =>
    MODULE_OFFSETS.map((moduleOffset, index) => ({
      id: `${classInfo.id}-context-${index + 1}`,
      name: `${classInfo.id} Context ${index + 1}`,
      description: "Temporary non-clickable context marker.",
      categoryId: classInfo.id,
      icon: classInfo.icons[index],
      ...polar(INNER_HUB_R, classInfo.angle + moduleOffset),
    })),
);

const innerModules = classes.flatMap((classInfo) =>
  MODULE_OFFSETS.map((moduleOffset) => ({
    angle: classInfo.angle + moduleOffset,
    categoryId: classInfo.id,
  })),
);

const outerAnchors = innerModules
  .flatMap((module) => [
    {
      angle: module.angle,
      categoryId: module.categoryId,
    },
    {
      angle: module.angle + 12,
      categoryId: module.categoryId,
    },
  ])
  .sort(
    (a, b) =>
      ((a.angle + 360) % 360) - ((b.angle + 360) % 360),
  );

const outerHubs: SkillContextHub[] = outerAnchors.map(
  (anchor, index) => {
    const iconSet = classes.find(
      (item) => item.id === anchor.categoryId,
    )!.icons;

    return {
      id: `outer-context-${index + 1}`,
      name: `Outer Context ${index + 1}`,
      description:
        "Temporary non-clickable outer context marker.",
      categoryId: anchor.categoryId,
      icon: iconSet[index % 3],
      ...polar(OUTER_HUB_R, anchor.angle),
    };
  },
);

const halfBranchHubs: SkillContextHub[] = [27, 28].map(
  (moduleNumber, index) => {
    const anchor = outerAnchors[moduleNumber - 1];
    const iconSet = classes.find(
      (item) => item.id === anchor.categoryId,
    )!.icons;

    return {
      id: `outer-half-context-${moduleNumber}`,
      name: `Outer Half Context ${moduleNumber}`,
      description: "Temporary non-clickable half-branch context marker.",
      categoryId: anchor.categoryId,
      icon: iconSet[index],
      ...polar(2810, anchor.angle),
    };
  },
);

const module2HalfContext: SkillContextHub = (() => {
  const anchor = outerAnchors[1];
  const iconSet = classes.find(
    (item) => item.id === anchor.categoryId,
  )!.icons;

  return {
    id: "outer-half-context-2",
    name: "Outer Half Context 2",
    description: "Temporary non-clickable four-node half-branch context marker.",
    categoryId: anchor.categoryId,
    icon: iconSet[1],
    ...polar(2830, anchor.angle),
  };
})();

const module5HalfContext: SkillContextHub = (() => {
  const anchor = outerAnchors[4];
  const icons = classes.find((item) => item.id === anchor.categoryId)!.icons;
  return { id: "outer-half-context-5", name: "Outer Half Context 5", description: "Temporary non-clickable five-node half-branch context marker.", categoryId: anchor.categoryId, icon: icons[2], ...polar(2835, anchor.angle) };
})();
const module4AsymmetricContext: SkillContextHub = (() => {
  const anchor = outerAnchors[3];
  const icons = classes.find((item) => item.id === anchor.categoryId)!.icons;
  return { id: "outer-asymmetric-context-4", name: "Outer Asymmetric Context 4", description: "Temporary non-clickable asymmetric branch context marker.", categoryId: anchor.categoryId, icon: icons[1], ...polar(2830, anchor.angle) };
})();
const finalSplitBranchHubs: SkillContextHub[] = [10, 12].map((moduleNumber, index) => {
  const anchor = outerAnchors[moduleNumber - 1];
  const icons = classes.find((item) => item.id === anchor.categoryId)!.icons;
  return { id: `outer-final-split-context-${moduleNumber}`, name: `Outer Final Split Context ${moduleNumber}`, description: "Temporary non-clickable final split-branch context marker.", categoryId: anchor.categoryId, icon: icons[index + 1], ...polar(2820, anchor.angle) };
});
const openFinalSplitModules = [23, 19, 18, 17, 16, 15, 14, 13, 11, 9, 8, 7, 6, 29] as const;
const openFinalSplitHubs: SkillContextHub[] = openFinalSplitModules.map((moduleNumber, index) => {
  const anchor = outerAnchors[moduleNumber - 1];
  const icons = classes.find((item) => item.id === anchor.categoryId)!.icons;
  return { id: `outer-open-split-context-${moduleNumber}`, name: `Outer Open Split Context ${moduleNumber}`, description: "Temporary non-clickable open split-branch context marker.", categoryId: anchor.categoryId, icon: icons[index % 3], ...polar(2820, anchor.angle) };
});
export const prototypeContextHubs = [
  ...innerHubs,
  ...outerHubs,
  ...halfBranchHubs,
  module2HalfContext,
  module5HalfContext,
  module4AsymmetricContext,
  ...finalSplitBranchHubs,
  ...openFinalSplitHubs,
];

import type { SkillCategoryId, SkillEdge, SkillIcon, SkillNode } from "../domain/types";

const CX = 3100;
const CY = 3100;
const CLASS_R = 165;
const SHARED_R = 390;
const ENTRY_R = 650;
const INNER_BOTTOM_R = 880;
const INNER_BRANCH_RADII = [1085, 1150, 1215] as const;

/*
 * All 15 inner top junctions and all 15 connecting nodes sit on this
 * exact radius. The resulting 30-node ring is a true regular circle.
 */
const FIRST_RING_R = 1450;

const OUTER_BOTTOM_R = 1750;
const OUTER_BRANCH_RADII = [1965, 2030, 2095] as const;
const OUTER_TOP_R = 2310;
const FINAL_RING_R = 2630;
const SINGLE_OUTER_NODE_R = 2800;
const HALF_BRANCH_RADII = [2745, 2810, 2875] as const;
const HALF_BRANCH_OFFSET = 70;
const HALF_BRANCH_CURVE = [0.8, 1.35, 0.8] as const;
const INNER_BRANCH_OFFSET = 84;
const OUTER_BRANCH_OFFSET = 70;
const MODULE_OFFSETS = [-24, 0, 24] as const;

const classes: Array<{
  id: SkillCategoryId;
  name: string;
  icon: SkillIcon;
  angle: number;
}> = [
  { id: "fortitude", name: "Enforcer", icon: "class-enforcer", angle: -90 },
  { id: "perception", name: "Scout", icon: "class-scout", angle: -18 },
  { id: "dexterity", name: "Recon", icon: "class-recon", angle: 54 },
  { id: "intellect", name: "Specialist", icon: "class-specialist", angle: 126 },
  { id: "strength", name: "Assault", icon: "class-assault", angle: 198 },
];

const placeholder =
  "Temporary layout node. Real details will be added later.";

const polar = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Math.round(CX + Math.cos(radians) * radius),
    y: Math.round(CY + Math.sin(radians) * radius),
  };
};

const offset = (
  point: { x: number; y: number },
  degrees: number,
  amount: number,
) => {
  const radians = ((degrees + 90) * Math.PI) / 180;
  return {
    x: Math.round(point.x + Math.cos(radians) * amount),
    y: Math.round(point.y + Math.sin(radians) * amount),
  };
};

const effect = (categoryId: SkillCategoryId, order: number) => [
  {
    statId: categoryId,
    label:
      categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    valuePerRank: 1,
    unit: "flat" as const,
    sortOrder: order,
  },
];

const enforcerClassEffects = [
  {
    statId: "maximum-health",
    label: "Maximum Health",
    valuePerRank: 20,
    unit: "flat" as const,
    sortOrder: 1,
  },
  {
    statId: "stun-resistance",
    label: "Stun Resistance",
    valuePerRank: 10,
    unit: "percent" as const,
    sortOrder: 2,
  },
  {
    statId: "medical-healing-effectiveness",
    label: "Healing Effectiveness of Medical Healing Items",
    valuePerRank: 20,
    unit: "percent" as const,
    sortOrder: 3,
  },
  {
    statId: "fist-weapon-physical-damage",
    label: "Fist Weapon Physical Damage",
    valuePerRank: 5,
    unit: "percent" as const,
    sortOrder: 4,
  },
  {
    statId: "shotgun-physical-damage",
    label: "Shotgun Physical Damage",
    valuePerRank: 5,
    unit: "percent" as const,
    sortOrder: 5,
  },
];

const assaultClassEffects = [
  { statId: "inventory-carry-limit", label: "Inventory Carry Limit", valuePerRank: 40, unit: "flat" as const, sortOrder: 1 },
  { statId: "maximum-food-thirst-limit", label: "Maximum Food and Thirst Limit", valuePerRank: 20, unit: "flat" as const, sortOrder: 2 },
  { statId: "melee-weapon-physical-damage", label: "Melee Weapon Physical Damage", valuePerRank: 5, unit: "percent" as const, sortOrder: 3 },
  { statId: "assault-explosive-physical-damage", label: "Assault Rifle, Rocket Launcher and Explosive Physical Damage", valuePerRank: 5, unit: "percent" as const, sortOrder: 4 },
  { statId: "mining-tool-physical-damage", label: "Mining Tool Physical Damage", valuePerRank: 10, unit: "percent" as const, sortOrder: 5 },
];

const makeNode = (
  id: string,
  name: string,
  categoryId: SkillCategoryId,
  icon: SkillIcon,
  position: { x: number; y: number },
  neighbors: string[],
  order: number,
  cost = 1,
): SkillNode => ({
  id,
  name,
  description: placeholder,
  categoryId,
  icon,
  ...position,
  cost,
  maxRank: 1,
  prerequisites: [],
  prerequisiteGroups: neighbors.map((neighbor) => [neighbor]),
  effects: effect(categoryId, order),
});

const skills: SkillNode[] = [];
const innerTopIds: string[] = [];
const innerModules: Array<{
  angle: number;
  categoryId: SkillCategoryId;
}> = [];
let order = 10;

function addSplitModule(
  prefix: string,
  title: string,
  categoryId: SkillCategoryId,
  angle: number,
  bottomId: string,
  branchRadii: readonly number[],
  topRadius: number,
  branchOffset: number,
) {
  const topId = `${prefix}-top-junction`;
  const leftIds = branchRadii.map(
    (_, index) => `${prefix}-left-${index + 1}`,
  );
  const rightIds = branchRadii.map(
    (_, index) => `${prefix}-right-${index + 1}`,
  );

  branchRadii.forEach((radius, index) => {
    const center = polar(radius, angle);

    /*
     * The middle node bows farther away from the module centerline,
     * while the first and third nodes taper back toward the junctions.
     */
    const curveProfile = [0.8, 1.35, 0.8] as const;
    const curvedOffset = branchOffset * curveProfile[index];

    /*
     * Keep branch content visually consistent around the complete tree.
     * SVG y coordinates increase downward, so the tangent direction reverses
     * visually outside the confirmed correct sectors. Mirror module angles
     * from 18 degrees through 222 degrees. Preserve 0 and 6 degrees at the
     * top-right boundary, plus 234 degrees through 360 degrees across the top.
     * This changes coordinates only; IDs, mappings, prerequisites, and the
     * already-correct top-center modules remain unchanged.
     */
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const visualOrientation =
      normalizedAngle >= 18 && normalizedAngle < 234 ? -1 : 1;
    const orientedOffset = curvedOffset * visualOrientation;

    const leftNeighbors = [
      index === 0 ? bottomId : leftIds[index - 1],
      index === 2 ? topId : leftIds[index + 1],
    ];
    const rightNeighbors = [
      index === 0 ? bottomId : rightIds[index - 1],
      index === 2 ? topId : rightIds[index + 1],
    ];

    skills.push(
      makeNode(
        leftIds[index],
        `${title} Left ${index + 1}`,
        categoryId,
        "plus",
        offset(center, angle, -orientedOffset),
        leftNeighbors,
        order++,
      ),
    );
    skills.push(
      makeNode(
        rightIds[index],
        `${title} Right ${index + 1}`,
        categoryId,
        "plus",
        offset(center, angle, orientedOffset),
        rightNeighbors,
        order++,
      ),
    );
  });

  skills.push(
    makeNode(
      topId,
      `${title} Top Junction`,
      categoryId,
      "plus",
      polar(topRadius, angle),
      [leftIds[2], rightIds[2]],
      order++,
    ),
  );

  return topId;
}

for (const classInfo of classes) {
  const rootId = `${classInfo.id}-root`;
  skills.push(
    makeNode(
      rootId,
      classInfo.name,
      classInfo.id,
      classInfo.icon,
      polar(CLASS_R, classInfo.angle),
      [],
      order++,
      0,
    ),
  );

  const classRoot = skills.find((skill) => skill.id === rootId)!;
  if (classInfo.id === "fortitude") {
    classRoot.effects = enforcerClassEffects;
  } else if (classInfo.id === "strength") {
    classRoot.effects = assaultClassEffects;
  }

  const sharedId = `${classInfo.id}-shared-junction`;
  skills.push(
    makeNode(
      sharedId,
      `${classInfo.name} Shared Junction`,
      classInfo.id,
      "plus",
      polar(SHARED_R, classInfo.angle),
      [rootId],
      order++,
    ),
  );

  MODULE_OFFSETS.forEach((moduleOffset, moduleIndex) => {
    const angle = classInfo.angle + moduleOffset;
    const prefix = `${classInfo.id}-module-${moduleIndex + 1}`;
    const entryId = `${prefix}-entry`;
    const bottomId = `${prefix}-bottom-junction`;

    skills.push(
      makeNode(
        entryId,
        `${classInfo.name} Entry ${moduleIndex + 1}`,
        classInfo.id,
        "plus",
        polar(ENTRY_R, angle),
        [sharedId],
        order++,
      ),
    );
    skills.push(
      makeNode(
        bottomId,
        `${classInfo.name} Bottom Junction ${moduleIndex + 1}`,
        classInfo.id,
        "plus",
        polar(INNER_BOTTOM_R, angle),
        [entryId],
        order++,
      ),
    );

    innerTopIds.push(
      addSplitModule(
        prefix,
        `${classInfo.name} Module ${moduleIndex + 1}`,
        classInfo.id,
        angle,
        bottomId,
        INNER_BRANCH_RADII,
        FIRST_RING_R,
        INNER_BRANCH_OFFSET,
      ),
    );
    innerModules.push({ angle, categoryId: classInfo.id });
  });
}

/*
 * Enforcer test mapping from the real XML tree.
 * Every visible node remains binary. Build Totals simply sum these effects.
 */
const setNodeDetails = (
  id: string,
  name: string,
  description: string,
  effects: SkillNode["effects"],
) => {
  const node = skills.find((skill) => skill.id === id);
  if (!node) throw new Error(`Missing prototype skill node: ${id}`);
  node.name = name;
  node.description = description;
  node.effects = effects;
  node.maxRank = 1;
};

setNodeDetails(
  "fortitude-root",
  "Enforcer",
  "E N F O R C E R\n20 increased Maximum Health\n10% increased Stun Resistance\n20% increased healing effectiveness of medical healing items\n5% increased Fist Weapon Physical Damage\n5% increased Shotgun Physical Damage",
  [
    { statId: "maximum-health", label: "increased Maximum Health", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "20 increased Maximum Health" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
    { statId: "medical-healing-effectiveness", label: "increased healing effectiveness of medical healing items", valuePerRank: 20, unit: "percent", sortOrder: 3, displayText: "20% increased healing effectiveness of medical healing items" },
    { statId: "fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 5, displayText: "5% increased Shotgun Physical Damage" },
  ],
);

setNodeDetails(
  "fortitude-shared-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);

setNodeDetails(
  "fortitude-module-1-entry",
  "Damage Resistance",
  "5% increased Physical Damage Resistance\n15% increased Stun Resistance",
  [
    { statId: "physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% increased Stun Resistance" },
  ],
);

setNodeDetails(
  "fortitude-module-2-entry",
  "Metabolism",
  "15% decreased speed of food and water loss",
  [
    { statId: "food-water-loss-speed", label: "decreased speed of food and water loss", valuePerRank: -15, unit: "percent", sortOrder: 1, displayText: "15% decreased speed of food and water loss" },
  ],
);

setNodeDetails(
  "fortitude-module-3-entry",
  "Maximum Health",
  "+10 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Health" },
  ],
);


/*
 * Build a regular 30-node ring. Inner top junctions occupy angles
 * 0, 24, 48... and connector nodes occupy 12, 36, 60...
 * Every ring node uses FIRST_RING_R, so no petal or zig-zag effect occurs.
 */
const ringAnchors: Array<{
  id: string;
  angle: number;
  categoryId: SkillCategoryId;
}> = [];

for (let index = 0; index < innerTopIds.length; index += 1) {
  const currentId = innerTopIds[index];
  const nextId = innerTopIds[(index + 1) % innerTopIds.length];
  const currentMeta = innerModules[index];
  const connectorAngle = currentMeta.angle + 12;
  const connectorId = `outer-ring-connector-${index + 1}`;

  skills.push(
    makeNode(
      connectorId,
      `Outer Ring Connector ${index + 1}`,
      currentMeta.categoryId,
      "plus",
      polar(FIRST_RING_R, connectorAngle),
      [currentId, nextId],
      order++,
    ),
  );

  const current = skills.find((skill) => skill.id === currentId)!;
  const next = skills.find((skill) => skill.id === nextId)!;
  current.prerequisiteGroups = [
    ...(current.prerequisiteGroups ?? []),
    [connectorId],
  ];
  next.prerequisiteGroups = [
    ...(next.prerequisiteGroups ?? []),
    [connectorId],
  ];

  ringAnchors.push({
    id: currentId,
    angle: currentMeta.angle,
    categoryId: currentMeta.categoryId,
  });
  ringAnchors.push({
    id: connectorId,
    angle: connectorAngle,
    categoryId: currentMeta.categoryId,
  });
}

ringAnchors.sort(
  (a, b) =>
    ((a.angle + 360) % 360) - ((b.angle + 360) % 360),
);

/* Every one of the 30 circular ring nodes grows radially outward. */
ringAnchors.forEach((anchor, index) => {
  const prefix = `outer-module-${index + 1}`;
  const bottomId = `${prefix}-bottom-junction`;

  skills.push(
    makeNode(
      bottomId,
      `Outer Bottom Junction ${index + 1}`,
      anchor.categoryId,
      "plus",
      polar(OUTER_BOTTOM_R, anchor.angle),
      [anchor.id],
      order++,
    ),
  );

  addSplitModule(
    prefix,
    `Outer Module ${index + 1}`,
    anchor.categoryId,
    anchor.angle,
    bottomId,
    OUTER_BRANCH_RADII,
    OUTER_TOP_R,
    OUTER_BRANCH_OFFSET,
  );
});

/*
 * Final 30-position ring. Modules 1-24 and 26-30 connect from their top
 * junction to one new ring node. Module 25's existing top junction is moved
 * outward and occupies ring position 25 itself.
 */
const finalRingNodeIds: string[] = [];

ringAnchors.forEach((anchor, index) => {
  const moduleNumber = index + 1;
  const outerTopId = `outer-module-${moduleNumber}-top-junction`;

  if (moduleNumber === 25) {
    const module25Top = skills.find((skill) => skill.id === outerTopId)!;
    const ringPosition = polar(FINAL_RING_R, anchor.angle);
    module25Top.x = ringPosition.x;
    module25Top.y = ringPosition.y;
    finalRingNodeIds.push(outerTopId);
    return;
  }

  const ringNodeId = `final-ring-node-${moduleNumber}`;
  skills.push(
    makeNode(
      ringNodeId,
      `Final Ring Node ${moduleNumber}`,
      anchor.categoryId,
      "plus",
      polar(FINAL_RING_R, anchor.angle),
      [outerTopId],
      order++,
    ),
  );
  finalRingNodeIds.push(ringNodeId);
});

for (let index = 0; index < finalRingNodeIds.length; index += 1) {
  const currentId = finalRingNodeIds[index];
  const nextId = finalRingNodeIds[(index + 1) % finalRingNodeIds.length];
  const currentSkill = skills.find((skill) => skill.id === currentId)!;
  const nextSkill = skills.find((skill) => skill.id === nextId)!;
  currentSkill.prerequisiteGroups = [
    ...(currentSkill.prerequisiteGroups ?? []),
    [nextId],
  ];
  nextSkill.prerequisiteGroups = [
    ...(nextSkill.prerequisiteGroups ?? []),
    [currentId],
  ];
}

/* Seven single endpoint nodes shown outside the final ring. */
const singleOuterNodeModules = [21, 22, 24, 25, 30, 1, 3] as const;

singleOuterNodeModules.forEach((moduleNumber) => {
  const anchor = ringAnchors[moduleNumber - 1];
  const sourceId =
    moduleNumber === 25
      ? "outer-module-25-top-junction"
      : `final-ring-node-${moduleNumber}`;

  skills.push(
    makeNode(
      `outer-single-node-${moduleNumber}`,
      `Outer Single Node ${moduleNumber}`,
      anchor.categoryId,
      "plus",
      polar(SINGLE_OUTER_NODE_R, anchor.angle),
      [sourceId],
      order++,
    ),
  );
});

/*
 * Final Ring Nodes 27 and 28 each have one side of a normal context-hub
 * branch. The context hub remains on the module centerline. Module 27 uses
 * the clockwise side and Module 28 uses the counterclockwise side.
 */
const halfBranchModules = [27, 28] as const;

halfBranchModules.forEach((moduleNumber) => {
  const side = 1;
  const anchor = ringAnchors[moduleNumber - 1];
  const sourceId = `final-ring-node-${moduleNumber}`;
  const nodeIds = HALF_BRANCH_RADII.map(
    (_, index) => `outer-half-${moduleNumber}-${index + 1}`,
  );

  HALF_BRANCH_RADII.forEach((radius, index) => {
    const center = polar(radius, anchor.angle);
    const curvedOffset =
      HALF_BRANCH_OFFSET * HALF_BRANCH_CURVE[index] * side;

    skills.push(
      makeNode(
        nodeIds[index],
        `Outer Half Branch ${moduleNumber} Node ${index + 1}`,
        anchor.categoryId,
        "plus",
        offset(center, anchor.angle, curvedOffset),
        [index === 0 ? sourceId : nodeIds[index - 1]],
        order++,
      ),
    );
  });
});

/*
 * Final Ring Node 2 has one single-side context branch with four nodes.
 * The branch uses the same compact south-side geometry as Modules 27 and 28,
 * but extends by one additional node.
 */
const module2Anchor = ringAnchors[1];
const module2HalfNodeIds = [1, 2, 3, 4].map(
  (nodeNumber) => `outer-half-2-${nodeNumber}`,
);
const module2HalfRadii = [2740, 2800, 2860, 2920] as const;
const module2HalfCurve = [0.72, 1.2, 1.2, 0.72] as const;

module2HalfRadii.forEach((radius, index) => {
  const center = polar(radius, module2Anchor.angle);
  const curvedOffset = 70 * module2HalfCurve[index];

  skills.push(
    makeNode(
      module2HalfNodeIds[index],
      `Outer Half Branch 2 Node ${index + 1}`,
      module2Anchor.categoryId,
      "plus",
      offset(center, module2Anchor.angle, curvedOffset),
      [
        index === 0
          ? "final-ring-node-2"
          : module2HalfNodeIds[index - 1],
      ],
      order++,
    ),
  );
});

/* Final Ring Node 5: five-node left semicircle. */
const module5Anchor = ringAnchors[4];
const module5HalfNodeIds = [1, 2, 3, 4, 5].map(
  (nodeNumber) => `outer-half-5-${nodeNumber}`,
);
const module5HalfRadii = [2735, 2785, 2835, 2885, 2935] as const;
const module5HalfCurve = [0.3, 1, 1.25, 1, 0.3] as const;
module5HalfRadii.forEach((radius, index) => {
  const center = polar(radius, module5Anchor.angle);
  const curvedOffset = 80 * module5HalfCurve[index];
  skills.push(makeNode(
    module5HalfNodeIds[index],
    `Outer Half Branch 5 Node ${index + 1}`,
    module5Anchor.categoryId,
    "plus",
    offset(center, module5Anchor.angle, curvedOffset),
    [index === 0 ? "final-ring-node-5" : module5HalfNodeIds[index - 1]],
    order++,
  ));
});

/* Final Ring Node 4: asymmetric 2-node and 4-node sides. */
const module4Anchor = ringAnchors[3];
const module4ShortNodeIds = [1, 2].map(
  (nodeNumber) => `outer-asymmetric-4-short-${nodeNumber}`,
);
const module4LongNodeIds = [1, 2, 3, 4].map(
  (nodeNumber) => `outer-asymmetric-4-long-${nodeNumber}`,
);
const module4ShortRadii = [2775, 2845] as const;
const module4ShortCurve = [0.82, 1.12] as const;
const module4LongRadii = [2735, 2795, 2855, 2915] as const;
const module4LongCurve = [0.58, 1.08, 1.18, 0.68] as const;
module4ShortRadii.forEach((radius, index) => {
  const center = polar(radius, module4Anchor.angle);
  skills.push(makeNode(
    module4ShortNodeIds[index],
    `Outer Asymmetric Branch 4 Short ${index + 1}`,
    module4Anchor.categoryId,
    "plus",
    offset(center, module4Anchor.angle, -76 * module4ShortCurve[index]),
    [index === 0 ? "final-ring-node-4" : module4ShortNodeIds[index - 1]],
    order++,
  ));
});
module4LongRadii.forEach((radius, index) => {
  const center = polar(radius, module4Anchor.angle);
  skills.push(makeNode(
    module4LongNodeIds[index],
    `Outer Asymmetric Branch 4 Long ${index + 1}`,
    module4Anchor.categoryId,
    "plus",
    offset(center, module4Anchor.angle, 76 * module4LongCurve[index]),
    [index === 0 ? "final-ring-node-4" : module4LongNodeIds[index - 1]],
    order++,
  ));
});

/* Final Ring Nodes 10 and 12: full split branches with an end junction. */
const finalSplitBranchModules = [10, 12] as const;
const finalSplitBranchRadii = [2745, 2820, 2895] as const;
const finalSplitBranchCurve = [0.8, 1.35, 0.8] as const;
finalSplitBranchModules.forEach((moduleNumber) => {
  const anchor = ringAnchors[moduleNumber - 1];
  const sourceId = `final-ring-node-${moduleNumber}`;
  const leftIds = finalSplitBranchRadii.map(
    (_, index) => `outer-final-split-${moduleNumber}-left-${index + 1}`,
  );
  const rightIds = finalSplitBranchRadii.map(
    (_, index) => `outer-final-split-${moduleNumber}-right-${index + 1}`,
  );
  finalSplitBranchRadii.forEach((radius, index) => {
    const center = polar(radius, anchor.angle);
    const amount = 70 * finalSplitBranchCurve[index];
    const visualSide = moduleNumber >= 6 && moduleNumber <= 19 ? -1 : 1;
    skills.push(makeNode(leftIds[index], `Outer Final Split ${moduleNumber} Left ${index + 1}`, anchor.categoryId, "plus", offset(center, anchor.angle, -amount * visualSide), [index === 0 ? sourceId : leftIds[index - 1]], order++));
    skills.push(makeNode(rightIds[index], `Outer Final Split ${moduleNumber} Right ${index + 1}`, anchor.categoryId, "plus", offset(center, anchor.angle, amount * visualSide), [index === 0 ? sourceId : rightIds[index - 1]], order++));
  });
  skills.push(makeNode(
    `outer-final-split-${moduleNumber}-junction`,
    `Outer Final Split ${moduleNumber} Junction`,
    anchor.categoryId,
    "plus",
    polar(2990, anchor.angle),
    [leftIds[2], rightIds[2]],
    order++,
  ));
});

/* Fourteen full split branches with no junction at the outer end. */
const openFinalSplitModules = [23, 19, 18, 17, 16, 15, 14, 13, 11, 9, 8, 7, 6, 29] as const;
const openFinalSplitRadii = [2745, 2820, 2895] as const;
const openFinalSplitCurve = [0.8, 1.35, 0.8] as const;
openFinalSplitModules.forEach((moduleNumber) => {
  const anchor = ringAnchors[moduleNumber - 1];
  const sourceId = `final-ring-node-${moduleNumber}`;
  const leftIds = openFinalSplitRadii.map((_, index) => `outer-open-split-${moduleNumber}-left-${index + 1}`);
  const rightIds = openFinalSplitRadii.map((_, index) => `outer-open-split-${moduleNumber}-right-${index + 1}`);
  openFinalSplitRadii.forEach((radius, index) => {
    const center = polar(radius, anchor.angle);
    const amount = 70 * openFinalSplitCurve[index];
    const visualSide = moduleNumber >= 6 && moduleNumber <= 19 ? -1 : 1;
    skills.push(makeNode(leftIds[index], `Outer Open Split ${moduleNumber} Left ${index + 1}`, anchor.categoryId, "plus", offset(center, anchor.angle, -amount * visualSide), [index === 0 ? sourceId : leftIds[index - 1]], order++));
    skills.push(makeNode(rightIds[index], `Outer Open Split ${moduleNumber} Right ${index + 1}`, anchor.categoryId, "plus", offset(center, anchor.angle, amount * visualSide), [index === 0 ? sourceId : rightIds[index - 1]], order++));
  });
});

/*
 * Complete Enforcer mapping from recipes_skills.xml, English.txt, and
 * buffs_progression.xml. Planner IDs and geometry remain unchanged.
 */
// Game node: fortitude_336_7; progression: Fortitude
setNodeDetails(
  "fortitude-module-1-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_000_7; progression: Fortitude
setNodeDetails(
  "fortitude-module-2-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_024_7; progression: Fortitude
setNodeDetails(
  "fortitude-module-3-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: holdBreath1; progression: skillTreeHoldBreath
setNodeDetails(
  "fortitude-module-2-left-1",
  "Consumable Duration",
  "20% increased duration of Consumable effects",
  [
    { statId: "skilltreeconsumableduration-0", label: "increased duration of Consumable effects", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased duration of Consumable effects" },
  ],
);
// Game node: holdBreath2; progression: skillTreeHoldBreath
setNodeDetails(
  "fortitude-module-2-left-2",
  "Consumable Duration",
  "20% increased duration of Consumable effects",
  [
    { statId: "skilltreeconsumableduration-0", label: "increased duration of Consumable effects", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased duration of Consumable effects" },
  ],
);
// Game node: holdBreath3; progression: skillTreeHoldBreath
setNodeDetails(
  "fortitude-module-2-left-3",
  "Consumable Duration",
  "20% increased duration of Consumable effects",
  [
    { statId: "skilltreeconsumableduration-0", label: "increased duration of Consumable effects", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased duration of Consumable effects" },
  ],
);
// Game node: consumableDuration1; progression: skillTreeConsumableDuration
setNodeDetails(
  "fortitude-module-2-right-1",
  "Hold Breath",
  "+10 to Maximum Food/Water\n40s increased underwater diving duration\n2% reduced chance of Dysentery when using consumables",
  [
    { statId: "skilltreeholdbreath-0", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "skilltreeholdbreath-1", label: "s increased underwater diving duration", valuePerRank: 40, unit: "flat", sortOrder: 2, displayText: "40s increased underwater diving duration" },
    { statId: "skilltreeholdbreath-2", label: "reduced chance of Dysentery when using consumables", valuePerRank: 2, unit: "percent", sortOrder: 3, displayText: "2% reduced chance of Dysentery when using consumables" },
  ],
);
// Game node: consumableDuration2; progression: skillTreeConsumableDuration
setNodeDetails(
  "fortitude-module-2-right-2",
  "Hold Breath",
  "+10 to Maximum Food/Water\n40s increased underwater diving duration\n2% reduced chance of Dysentery when using consumables",
  [
    { statId: "skilltreeholdbreath-0", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "skilltreeholdbreath-1", label: "s increased underwater diving duration", valuePerRank: 40, unit: "flat", sortOrder: 2, displayText: "40s increased underwater diving duration" },
    { statId: "skilltreeholdbreath-2", label: "reduced chance of Dysentery when using consumables", valuePerRank: 2, unit: "percent", sortOrder: 3, displayText: "2% reduced chance of Dysentery when using consumables" },
  ],
);
// Game node: consumableDuration3; progression: skillTreeConsumableDuration
setNodeDetails(
  "fortitude-module-2-right-3",
  "Hold Breath",
  "+10 to Maximum Food/Water\n40s increased underwater diving duration\n2% reduced chance of Dysentery when using consumables",
  [
    { statId: "skilltreeholdbreath-0", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "skilltreeholdbreath-1", label: "s increased underwater diving duration", valuePerRank: 40, unit: "flat", sortOrder: 2, displayText: "40s increased underwater diving duration" },
    { statId: "skilltreeholdbreath-2", label: "reduced chance of Dysentery when using consumables", valuePerRank: 2, unit: "percent", sortOrder: 3, displayText: "2% reduced chance of Dysentery when using consumables" },
  ],
);
// Game node: knuckleDamage1; progression: skillTreeKnucklesDamage
setNodeDetails(
  "fortitude-module-1-left-1",
  "Fist Weapon Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "skilltreeknucklesdamage-0", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "skilltreeknucklesdamage-1", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: knuckleDamage2; progression: skillTreeKnucklesDamage
setNodeDetails(
  "fortitude-module-1-left-2",
  "Fist Weapon Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "skilltreeknucklesdamage-0", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "skilltreeknucklesdamage-1", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: knuckleDamage3; progression: skillTreeKnucklesDamage
setNodeDetails(
  "fortitude-module-1-left-3",
  "Fist Weapon Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "skilltreeknucklesdamage-0", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "skilltreeknucklesdamage-1", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: mithridatism1; progression: skillTreeMithridatism
setNodeDetails(
  "fortitude-module-1-right-1",
  "Poison Resistance",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "skilltreemithridatism-0", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "skilltreemithridatism-1", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "skilltreemithridatism-2", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: mithridatism2; progression: skillTreeMithridatism
setNodeDetails(
  "fortitude-module-1-right-2",
  "Poison Resistance",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "skilltreemithridatism-0", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "skilltreemithridatism-1", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "skilltreemithridatism-2", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: mithridatism3; progression: skillTreeMithridatism
setNodeDetails(
  "fortitude-module-1-right-3",
  "Poison Resistance",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "skilltreemithridatism-0", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "skilltreemithridatism-1", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "skilltreemithridatism-2", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: medic1; progression: skillTreeMedic
setNodeDetails(
  "fortitude-module-3-left-1",
  "Medical Healing",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "skilltreemedic-0", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "skilltreemedic-1", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic2; progression: skillTreeMedic
setNodeDetails(
  "fortitude-module-3-left-2",
  "Medical Healing",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "skilltreemedic-0", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "skilltreemedic-1", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic3; progression: skillTreeMedic
setNodeDetails(
  "fortitude-module-3-left-3",
  "Medical Healing",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "skilltreemedic-0", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "skilltreemedic-1", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: shotgunDamage1; progression: skillTreeShotgunDamage
setNodeDetails(
  "fortitude-module-3-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "skilltreeshotgundamage-0", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunHandling1; progression: skillTreeShotgunHandling
setNodeDetails(
  "fortitude-module-3-right-2",
  "Shotgun Handling",
  "5% improved Shotgun Fire Rate and Reload Speed",
  [
    { statId: "shotgun-handling", label: "improved Shotgun Fire Rate and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Shotgun Fire Rate and Reload Speed" },
  ],
);
// Game node: shotgunStun1; progression: skillTreeShotgunStun1
setNodeDetails(
  "fortitude-module-3-right-3",
  "Shotgun Stun",
  "Attacks with Shotgun stun enemies for 4s seconds",
  [
    { statId: "skilltreeshotgunstun1-0", label: "Attacks with Shotgun stun enemies for s seconds", valuePerRank: 4, unit: "flat", sortOrder: 1, displayText: "Attacks with Shotgun stun enemies for 4s seconds" },
  ],
);
// Game node: fortitude_336_11; progression: Fortitude
setNodeDetails(
  "fortitude-module-1-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: resistDamage1; progression: skillTreeResistDamage
setNodeDetails(
  "outer-ring-connector-1",
  "Damage Resistance",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: fortitude_000_11; progression: Fortitude
setNodeDetails(
  "fortitude-module-2-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: healthMax1; progression: skillTreeHealth05
setNodeDetails(
  "outer-ring-connector-2",
  "Maximum Health",
  "+5 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: fortitude_024_11; progression: Fortitude
setNodeDetails(
  "fortitude-module-3-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_036_11; progression: Intellect
setNodeDetails(
  "outer-ring-connector-3",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "to Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: dexterity_324_11; progression: Dexterity
setNodeDetails(
  "outer-ring-connector-15",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "to Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: strength_324_13; progression: Strength
setNodeDetails(
  "outer-module-20-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "to Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_336_13; progression: Strength
setNodeDetails(
  "outer-module-21-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "to Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_348_13; progression: Fortitude
setNodeDetails(
  "outer-module-22-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_000_13; progression: Fortitude
setNodeDetails(
  "outer-module-23-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_012_13; progression: Fortitude
setNodeDetails(
  "outer-module-24-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: perception_024_13; progression: Perception
setNodeDetails(
  "outer-module-25-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "to Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: fortitude_036_13; progression: Fortitude
setNodeDetails(
  "outer-module-26-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: meleeStaminaUse2; progression: skillTreeMeleeStaminaUse
setNodeDetails(
  "outer-module-23-left-1",
  "Melee Stamina Efficiency",
  "10% less Stamina Used by Melee Attacks\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
  [
    { statId: "skilltreemeleestaminause-0", label: "less Stamina Used by Melee Attacks", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% less Stamina Used by Melee Attacks" },
    { statId: "skilltreemeleestaminause-1", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
  ],
);
// Game node: healthMax2; progression: skillTreeHealth05
setNodeDetails(
  "outer-module-23-left-2",
  "Maximum Health",
  "+5 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: resistDamage2; progression: skillTreeResistDamage
setNodeDetails(
  "outer-module-23-left-3",
  "Damage Resistance",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: mithridatism4; progression: skillTreeMithridatism
setNodeDetails(
  "outer-module-23-right-1",
  "Poison Resistance",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "skilltreemithridatism-0", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "skilltreemithridatism-1", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "skilltreemithridatism-2", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: mithridatism5; progression: skillTreeMithridatism
setNodeDetails(
  "outer-module-23-right-2",
  "Poison Resistance",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "skilltreemithridatism-0", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "skilltreemithridatism-1", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "skilltreemithridatism-2", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: foodWaterMax1; progression: skillTreeMaxFoodWater
setNodeDetails(
  "outer-module-23-right-3",
  "Maximum Food and Water",
  "+20 to Maximum Food/Water",
  [
    { statId: "skilltreemaxfoodwater-0", label: "to Maximum Food/Water", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Maximum Food/Water" },
  ],
);
// Game node: regenerateHealth1; progression: skillTreeHealing
setNodeDetails(
  "outer-module-24-left-1",
  "Natural Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "skilltreehealing-0", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "skilltreehealing-1", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: regenerateHealth2; progression: skillTreeHealing
setNodeDetails(
  "outer-module-24-left-2",
  "Natural Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "skilltreehealing-0", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "skilltreehealing-1", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: regenerateHealth3; progression: skillTreeHealing
setNodeDetails(
  "outer-module-24-left-3",
  "Natural Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "skilltreehealing-0", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "skilltreehealing-1", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: resistWeather1; progression: skillTreeResistWeather
setNodeDetails(
  "outer-module-24-right-1",
  "Weather Resistance",
  "+5 increased Heat and Cold Resistance\n15% reduced food and water depletion when cold or overheated",
  [
    { statId: "skilltreeresistweather-0", label: "increased Heat and Cold Resistance", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 increased Heat and Cold Resistance" },
    { statId: "skilltreeresistweather-1", label: "reduced food and water depletion when cold or overheated", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% reduced food and water depletion when cold or overheated" },
  ],
);
// Game node: resistWeather2; progression: skillTreeResistWeather
setNodeDetails(
  "outer-module-24-right-2",
  "Weather Resistance",
  "+5 increased Heat and Cold Resistance\n15% reduced food and water depletion when cold or overheated",
  [
    { statId: "skilltreeresistweather-0", label: "increased Heat and Cold Resistance", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 increased Heat and Cold Resistance" },
    { statId: "skilltreeresistweather-1", label: "reduced food and water depletion when cold or overheated", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% reduced food and water depletion when cold or overheated" },
  ],
);
// Game node: resistWeather3; progression: skillTreeResistWeather
setNodeDetails(
  "outer-module-24-right-3",
  "Weather Resistance",
  "+5 increased Heat and Cold Resistance\n15% reduced food and water depletion when cold or overheated",
  [
    { statId: "skilltreeresistweather-0", label: "increased Heat and Cold Resistance", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 increased Heat and Cold Resistance" },
    { statId: "skilltreeresistweather-1", label: "reduced food and water depletion when cold or overheated", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% reduced food and water depletion when cold or overheated" },
  ],
);
// Game node: infiltrator1; progression: skillTreeInfiltrator
setNodeDetails(
  "outer-module-22-left-1",
  "Infiltrator",
  "0.5s increased delay timer when setting off Land Mines\n20% decreased damage taken from Land Mines",
  [
    { statId: "skilltreeinfiltrator-0", label: "s increased delay timer when setting off Land Mines", valuePerRank: 0.5, unit: "flat", sortOrder: 1, displayText: "0.5s increased delay timer when setting off Land Mines" },
    { statId: "skilltreeinfiltrator-1", label: "decreased damage taken from Land Mines", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% decreased damage taken from Land Mines" },
  ],
);
// Game node: infiltrator2; progression: skillTreeInfiltrator
setNodeDetails(
  "outer-module-22-left-2",
  "Infiltrator",
  "0.5s increased delay timer when setting off Land Mines\n20% decreased damage taken from Land Mines",
  [
    { statId: "skilltreeinfiltrator-0", label: "s increased delay timer when setting off Land Mines", valuePerRank: 0.5, unit: "flat", sortOrder: 1, displayText: "0.5s increased delay timer when setting off Land Mines" },
    { statId: "skilltreeinfiltrator-1", label: "decreased damage taken from Land Mines", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% decreased damage taken from Land Mines" },
  ],
);
// Game node: infiltrator3; progression: skillTreeInfiltrator3
setNodeDetails(
  "outer-module-22-left-3",
  "Infiltrator",
  "1s increased delay timer when setting off Land Mines\n20% decreased damage taken from Land Mines\nCan pick up Land Mines",
  [
    { statId: "skilltreeinfiltrator3-0", label: "s increased delay timer when setting off Land Mines", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "1s increased delay timer when setting off Land Mines" },
    { statId: "skilltreeinfiltrator3-1", label: "decreased damage taken from Land Mines", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% decreased damage taken from Land Mines" },
    { statId: "display-only-skilltreeinfiltrator3-2", label: "Can pick up Land Mines", valuePerRank: 0, unit: "flat", sortOrder: 3, displayText: "Can pick up Land Mines", includeInTotals: false },
  ],
);
// Game node: armorHeavy1; progression: skillTreeArmorHeavy
setNodeDetails(
  "outer-module-22-right-1",
  "Heavy Armor",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "skilltreearmorheavy-0", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "skilltreearmorheavy-1", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy2; progression: skillTreeArmorHeavy
setNodeDetails(
  "outer-module-22-right-2",
  "Heavy Armor",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "skilltreearmorheavy-0", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "skilltreearmorheavy-1", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy3; progression: skillTreeArmorHeavy
setNodeDetails(
  "outer-module-22-right-3",
  "Heavy Armor",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "skilltreearmorheavy-0", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "skilltreearmorheavy-1", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: shotgunDamage4; progression: skillTreeShotgunDamage
setNodeDetails(
  "outer-module-20-left-1",
  "Heavy Armor",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "skilltreearmorheavy-0", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "skilltreearmorheavy-1", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: shotgunDamage5; progression: skillTreeShotgunDamage
setNodeDetails(
  "outer-module-20-left-2",
  "Heavy Armor",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "skilltreearmorheavy-0", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "skilltreearmorheavy-1", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: shotgunDamage6; progression: skillTreeShotgunDamage
setNodeDetails(
  "outer-module-20-left-3",
  "Heavy Armor",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "skilltreearmorheavy-0", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "skilltreearmorheavy-1", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy4; progression: skillTreeArmorHeavy
setNodeDetails(
  "outer-module-20-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "skilltreeshotgundamage-0", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: armorHeavy5; progression: skillTreeArmorHeavy
setNodeDetails(
  "outer-module-20-right-2",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "skilltreeshotgundamage-0", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: armorHeavy6; progression: skillTreeArmorHeavy
setNodeDetails(
  "outer-module-20-right-3",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "skilltreeshotgundamage-0", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: medic4; progression: skillTreeMedic
setNodeDetails(
  "outer-module-26-left-1",
  "Medical Healing",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "skilltreemedic-0", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "skilltreemedic-1", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic5; progression: skillTreeMedic
setNodeDetails(
  "outer-module-26-left-2",
  "Medical Healing",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "skilltreemedic-0", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "skilltreemedic-1", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic6; progression: skillTreeMedic
setNodeDetails(
  "outer-module-26-left-3",
  "Medical Healing",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "skilltreemedic-0", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "skilltreemedic-1", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: metabolism1; progression: skillTreeMetabolism
setNodeDetails(
  "outer-module-26-right-1",
  "Metabolism",
  "10% decreased speed of food and water loss",
  [
    { statId: "food-water-loss-speed", label: "decreased speed of food and water loss", valuePerRank: -10, unit: "percent", sortOrder: 1, displayText: "10% decreased speed of food and water loss" },
  ],
);
// Game node: metabolism2; progression: skillTreeMetabolism
setNodeDetails(
  "outer-module-26-right-2",
  "Metabolism",
  "10% decreased speed of food and water loss",
  [
    { statId: "food-water-loss-speed", label: "decreased speed of food and water loss", valuePerRank: -10, unit: "percent", sortOrder: 1, displayText: "10% decreased speed of food and water loss" },
  ],
);
// Game node: metabolism3; progression: skillTreeMetabolism
setNodeDetails(
  "outer-module-26-right-3",
  "Metabolism",
  "10% decreased speed of food and water loss",
  [
    { statId: "food-water-loss-speed", label: "decreased speed of food and water loss", valuePerRank: -10, unit: "percent", sortOrder: 1, displayText: "10% decreased speed of food and water loss" },
  ],
);
// Game node: knuckleStun1; progression: skillTreeKnucklesStun
setNodeDetails(
  "outer-module-21-left-1",
  "Fist Weapon Stun",
  "8% increased chance to Stun Targets using Fist Weapons\n10% increased chance to knockdown Target using Fist Weapons",
  [
    { statId: "skilltreeknucklesstun-0", label: "increased chance to Stun Targets using Fist Weapons", valuePerRank: 8, unit: "percent", sortOrder: 1, displayText: "8% increased chance to Stun Targets using Fist Weapons" },
    { statId: "skilltreeknucklesstun-1", label: "increased chance to knockdown Target using Fist Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased chance to knockdown Target using Fist Weapons" },
  ],
);
// Game node: knuckleStun2; progression: skillTreeKnucklesStun
setNodeDetails(
  "outer-module-21-left-2",
  "Fist Weapon Stun",
  "8% increased chance to Stun Targets using Fist Weapons\n10% increased chance to knockdown Target using Fist Weapons",
  [
    { statId: "skilltreeknucklesstun-0", label: "increased chance to Stun Targets using Fist Weapons", valuePerRank: 8, unit: "percent", sortOrder: 1, displayText: "8% increased chance to Stun Targets using Fist Weapons" },
    { statId: "skilltreeknucklesstun-1", label: "increased chance to knockdown Target using Fist Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased chance to knockdown Target using Fist Weapons" },
  ],
);
// Game node: knuckleStun3; progression: skillTreeKnucklesStun
setNodeDetails(
  "outer-module-21-left-3",
  "Fist Weapon Stun",
  "8% increased chance to Stun Targets using Fist Weapons\n10% increased chance to knockdown Target using Fist Weapons",
  [
    { statId: "skilltreeknucklesstun-0", label: "increased chance to Stun Targets using Fist Weapons", valuePerRank: 8, unit: "percent", sortOrder: 1, displayText: "8% increased chance to Stun Targets using Fist Weapons" },
    { statId: "skilltreeknucklesstun-1", label: "increased chance to knockdown Target using Fist Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased chance to knockdown Target using Fist Weapons" },
  ],
);
// Game node: regenerateHealth4; progression: skillTreeHealing
setNodeDetails(
  "outer-module-21-right-1",
  "Natural Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "skilltreehealing-0", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "skilltreehealing-1", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: regenerateHealth5; progression: skillTreeHealing
setNodeDetails(
  "outer-module-21-right-2",
  "Natural Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "skilltreehealing-0", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "skilltreehealing-1", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: foodWaterMax2; progression: skillTreeMaxFoodWater
setNodeDetails(
  "outer-module-21-right-3",
  "Maximum Food and Water",
  "+20 to Maximum Food/Water",
  [
    { statId: "skilltreemaxfoodwater-0", label: "to Maximum Food/Water", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Maximum Food/Water" },
  ],
);
// Game node: resistDamage3; progression: skillTreeResistDamage
setNodeDetails(
  "outer-module-25-left-1",
  "Damage Resistance",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: resistDamage4; progression: skillTreeResistDamage
setNodeDetails(
  "outer-module-25-left-2",
  "Damage Resistance",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: resistDamage5; progression: skillTreeResistDamage
setNodeDetails(
  "outer-module-25-left-3",
  "Damage Resistance",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: shotgunDamage2; progression: skillTreeShotgunDamage
setNodeDetails(
  "outer-module-25-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "skilltreeshotgundamage-0", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunHandling2; progression: skillTreeShotgunHandling
setNodeDetails(
  "outer-module-25-right-2",
  "Shotgun Handling",
  "5% improved Shotgun Fire Rate and Reload Speed",
  [
    { statId: "shotgun-handling", label: "improved Shotgun Fire Rate and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Shotgun Fire Rate and Reload Speed" },
  ],
);
// Game node: shotgunStun2; progression: skillTreeShotgunStun2
setNodeDetails(
  "outer-module-25-right-3",
  "Shotgun Stun",
  "Attacks with Shotgun stun enemies for additional 2s seconds",
  [
    { statId: "skilltreeshotgunstun2-0", label: "Attacks with Shotgun stun enemies for additional s seconds", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Attacks with Shotgun stun enemies for additional 2s seconds" },
  ],
);
// Game node: perception_324_17; progression: Perception
setNodeDetails(
  "outer-module-20-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "to Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: fortitude_336_17; progression: Fortitude
setNodeDetails(
  "outer-module-21-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_348_17; progression: Fortitude
setNodeDetails(
  "outer-module-22-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_000_17; progression: Fortitude
setNodeDetails(
  "outer-module-23-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_012_17; progression: Fortitude
setNodeDetails(
  "outer-module-24-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: strength_036_17; progression: Strength
setNodeDetails(
  "outer-module-26-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "to Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_000_19; progression: Fortitude
setNodeDetails(
  "final-ring-node-23",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: dexterity_012_19; progression: Dexterity
setNodeDetails(
  "final-ring-node-24",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "to Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: fortitude_024_19; progression: Fortitude
setNodeDetails(
  "outer-module-25-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_036_19; progression: Intellect
setNodeDetails(
  "final-ring-node-26",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "to Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: dexterity_324_19; progression: Dexterity
setNodeDetails(
  "final-ring-node-20",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "to Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: fortitude_336_19; progression: Fortitude
setNodeDetails(
  "final-ring-node-21",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "to Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_348_19; progression: Intellect
setNodeDetails(
  "final-ring-node-22",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "to Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: shotgunDamage3; progression: skillTreeShotgunDamage
setNodeDetails(
  "outer-open-split-23-left-1",
  "Fist Weapon Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "skilltreeknucklesdamage-0", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "skilltreeknucklesdamage-1", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: shotgunHandling3; progression: skillTreeShotgunHandling
setNodeDetails(
  "outer-open-split-23-left-2",
  "Fist Weapon Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "skilltreeknucklesdamage-0", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "skilltreeknucklesdamage-1", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: shotgunStun3; progression: skillTreeShotgunStun3
setNodeDetails(
  "outer-open-split-23-left-3",
  "Teeth Breaker",
  "5% increased Fist Weapon Physical Damage\n5% increased decapitation chance with punches to the head using Fist Weapons\nPunches to the head negate ability to get infected by the Target",
  [
    { statId: "skilltreeknucklesteethbreaker-0", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "skilltreeknucklesteethbreaker-1", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased decapitation chance with punches to the head using Fist Weapons" },
    { statId: "display-only-skilltreeknucklesteethbreaker-2", label: "Punches to the head negate ability to get infected by the Target", valuePerRank: 0, unit: "flat", sortOrder: 3, displayText: "Punches to the head negate ability to get infected by the Target", includeInTotals: false },
  ],
);
// Game node: knuckleDamage4; progression: skillTreeKnucklesDamage
setNodeDetails(
  "outer-open-split-23-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "skilltreeshotgundamage-0", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: knuckleDamage5; progression: skillTreeKnucklesDamage
setNodeDetails(
  "outer-open-split-23-right-2",
  "Shotgun Handling",
  "5% improved Shotgun Fire Rate and Reload Speed",
  [
    { statId: "shotgun-handling", label: "improved Shotgun Fire Rate and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Shotgun Fire Rate and Reload Speed" },
  ],
);
// Game node: knuckleTeethBreaker; progression: skillTreeKnucklesTeethBreaker
setNodeDetails(
  "outer-open-split-23-right-3",
  "Shotgun Stun",
  "Attacks with Shotgun stun enemies for additional 2s seconds.\nLeg shots with Shotguns cripple opponents",
  [
    { statId: "skilltreeshotgunstun3-0", label: "Attacks with Shotgun stun enemies for additional s seconds.", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Attacks with Shotgun stun enemies for additional 2s seconds." },
    { statId: "display-only-skilltreeshotgunstun3-1", label: "Leg shots with Shotguns cripple opponents", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "Leg shots with Shotguns cripple opponents", includeInTotals: false },
  ],
);
// Game node: healthMax3; progression: skillTreeHealth05
setNodeDetails(
  "outer-single-node-21",
  "Maximum Health",
  "+5 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: healthMax4; progression: skillTreeHealth05
setNodeDetails(
  "outer-single-node-22",
  "Maximum Health",
  "+5 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: healthMax5; progression: skillTreeHealth05
setNodeDetails(
  "outer-single-node-24",
  "Maximum Health",
  "+5 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: healthMax6; progression: skillTreeHealth05
setNodeDetails(
  "outer-single-node-25",
  "Maximum Health",
  "+5 to Maximum Health",
  [
    { statId: "maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);

/* Full-tree XML data overlay. Geometry and topology above are unchanged. */
const fullTreeOverlayMissingIds: string[] = [];
const setFullTreeNodeDetails = (id: string, name: string, description: string, effects: SkillNode["effects"]) => {
  const node = skills.find((skill) => skill.id === id);
  if (!node) {
    fullTreeOverlayMissingIds.push(id);
    return;
  }
  node.name = name;
  node.description = description;
  node.effects = effects;
  node.maxRank = 1;
};
// Game node: rootFortitude; progression: skillTreeFortitudeClass
setFullTreeNodeDetails(
  "fortitude-root",
  "Enforcer",
  "E N F O R C E R\n20 increased Maximum Health\n10% increased Stun Resistance\n20% increased healing effectiveness of medical healing items\n5% increased Fist Weapon Physical Damage\n5% increased Shotgun Physical Damage",
  [
    { statId: "maximum-health", label: "increased Maximum Health", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "20 increased Maximum Health" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 20, unit: "percent", sortOrder: 3, displayText: "20% increased healing effectiveness of medical healing items" },
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 5, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: baseFortitude; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-shared-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: baseResistDamage; progression: skillTreeResistDamageBase
setFullTreeNodeDetails(
  "fortitude-module-1-entry",
  "Resist Damage Base",
  "5% increased Physical Damage Resistance\n15% increased Stun Resistance",
  [
    { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% increased Stun Resistance" },
  ],
);
// Game node: baseMetabolism; progression: skillTreeMetabolismBase
setFullTreeNodeDetails(
  "fortitude-module-2-entry",
  "Metabolism Base",
  "15% decreased speed of food and water loss",
  [
    { statId: "decreased-speed-of-food-and-water-loss", label: "decreased speed of food and water loss", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% decreased speed of food and water loss" },
  ],
);
// Game node: baseHealth; progression: skillTreeHealthBase
setFullTreeNodeDetails(
  "fortitude-module-3-entry",
  "Health Base",
  "+10 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Health" },
  ],
);
// Game node: fortitude_336_7; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-module-1-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_000_7; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-module-2-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_024_7; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-module-3-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: holdBreath1; progression: skillTreeHoldBreath
setFullTreeNodeDetails(
  "fortitude-module-2-right-1",
  "Hold Breath",
  "+10 to Maximum Food/Water\n40s increased underwater diving duration\n2% reduced chance of Dysentery when using consumables",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "s-increased-underwater-diving-duration", label: "s increased underwater diving duration", valuePerRank: 40, unit: "flat", sortOrder: 2, displayText: "40s increased underwater diving duration" },
    { statId: "reduced-chance-of-dysentery-when-using-consumables", label: "reduced chance of Dysentery when using consumables", valuePerRank: 2, unit: "percent", sortOrder: 3, displayText: "2% reduced chance of Dysentery when using consumables" },
  ],
);
// Game node: holdBreath2; progression: skillTreeHoldBreath
setFullTreeNodeDetails(
  "fortitude-module-2-right-2",
  "Hold Breath",
  "+10 to Maximum Food/Water\n40s increased underwater diving duration\n2% reduced chance of Dysentery when using consumables",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "s-increased-underwater-diving-duration", label: "s increased underwater diving duration", valuePerRank: 40, unit: "flat", sortOrder: 2, displayText: "40s increased underwater diving duration" },
    { statId: "reduced-chance-of-dysentery-when-using-consumables", label: "reduced chance of Dysentery when using consumables", valuePerRank: 2, unit: "percent", sortOrder: 3, displayText: "2% reduced chance of Dysentery when using consumables" },
  ],
);
// Game node: holdBreath3; progression: skillTreeHoldBreath
setFullTreeNodeDetails(
  "fortitude-module-2-right-3",
  "Hold Breath",
  "+10 to Maximum Food/Water\n40s increased underwater diving duration\n2% reduced chance of Dysentery when using consumables",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "s-increased-underwater-diving-duration", label: "s increased underwater diving duration", valuePerRank: 40, unit: "flat", sortOrder: 2, displayText: "40s increased underwater diving duration" },
    { statId: "reduced-chance-of-dysentery-when-using-consumables", label: "reduced chance of Dysentery when using consumables", valuePerRank: 2, unit: "percent", sortOrder: 3, displayText: "2% reduced chance of Dysentery when using consumables" },
  ],
);
// Game node: consumableDuration1; progression: skillTreeConsumableDuration
setFullTreeNodeDetails(
  "fortitude-module-2-left-1",
  "Consumable Duration",
  "20% increased duration of Consumable effects",
  [
    { statId: "increased-duration-of-consumable-effects", label: "increased duration of Consumable effects", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased duration of Consumable effects" },
  ],
);
// Game node: consumableDuration2; progression: skillTreeConsumableDuration
setFullTreeNodeDetails(
  "fortitude-module-2-left-2",
  "Consumable Duration",
  "20% increased duration of Consumable effects",
  [
    { statId: "increased-duration-of-consumable-effects", label: "increased duration of Consumable effects", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased duration of Consumable effects" },
  ],
);
// Game node: consumableDuration3; progression: skillTreeConsumableDuration
setFullTreeNodeDetails(
  "fortitude-module-2-left-3",
  "Consumable Duration",
  "20% increased duration of Consumable effects",
  [
    { statId: "increased-duration-of-consumable-effects", label: "increased duration of Consumable effects", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased duration of Consumable effects" },
  ],
);
// Game node: knuckleDamage1; progression: skillTreeKnucklesDamage
setFullTreeNodeDetails(
  "fortitude-module-1-left-1",
  "Knuckles Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: knuckleDamage2; progression: skillTreeKnucklesDamage
setFullTreeNodeDetails(
  "fortitude-module-1-left-2",
  "Knuckles Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: knuckleDamage3; progression: skillTreeKnucklesDamage
setFullTreeNodeDetails(
  "fortitude-module-1-left-3",
  "Knuckles Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: mithridatism1; progression: skillTreeMithridatism
setFullTreeNodeDetails(
  "fortitude-module-1-right-1",
  "Mithridatism",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "increased-poison-resistance", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "reduced-poison-build-up-speed", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "increased-recovery-speed-using-antidotes", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: mithridatism2; progression: skillTreeMithridatism
setFullTreeNodeDetails(
  "fortitude-module-1-right-2",
  "Mithridatism",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "increased-poison-resistance", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "reduced-poison-build-up-speed", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "increased-recovery-speed-using-antidotes", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: mithridatism3; progression: skillTreeMithridatism
setFullTreeNodeDetails(
  "fortitude-module-1-right-3",
  "Mithridatism",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "increased-poison-resistance", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "reduced-poison-build-up-speed", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "increased-recovery-speed-using-antidotes", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: medic1; progression: skillTreeMedic
setFullTreeNodeDetails(
  "fortitude-module-3-left-1",
  "Medic",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "increased-gained-exp-from-medical-healing-items", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic2; progression: skillTreeMedic
setFullTreeNodeDetails(
  "fortitude-module-3-left-2",
  "Medic",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "increased-gained-exp-from-medical-healing-items", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic3; progression: skillTreeMedic
setFullTreeNodeDetails(
  "fortitude-module-3-left-3",
  "Medic",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "increased-gained-exp-from-medical-healing-items", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: shotgunDamage1; progression: skillTreeShotgunDamage
setFullTreeNodeDetails(
  "fortitude-module-3-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunHandling1; progression: skillTreeShotgunHandling
setFullTreeNodeDetails(
  "fortitude-module-3-right-2",
  "Shotgun Handling",
  "5% improved Shotgun Fire Rate and Reload Speed",
  [
    { statId: "improved-shotgun-fire-rate-and-reload-speed", label: "improved Shotgun Fire Rate and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Shotgun Fire Rate and Reload Speed" },
  ],
);
// Game node: shotgunStun1; progression: skillTreeShotgunStun1
setFullTreeNodeDetails(
  "fortitude-module-3-right-3",
  "Shotgun Stun1",
  "Attacks with Shotgun stun enemies for 4s seconds",
  [
    { statId: "attacks-with-shotgun-stun-enemies-for-s-seconds", label: "Attacks with Shotgun stun enemies for s seconds", valuePerRank: 4, unit: "flat", sortOrder: 1, displayText: "Attacks with Shotgun stun enemies for 4s seconds" },
  ],
);
// Game node: fortitude_336_11; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-module-1-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: resistDamage1; progression: skillTreeResistDamage
setFullTreeNodeDetails(
  "outer-ring-connector-22",
  "Resist Damage",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: fortitude_000_11; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-module-2-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: healthMax1; progression: skillTreeHealth05
setFullTreeNodeDetails(
  "outer-ring-connector-24",
  "Health05",
  "+5 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: fortitude_024_11; progression: Fortitude
setFullTreeNodeDetails(
  "fortitude-module-3-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_036_11; progression: Intellect
setFullTreeNodeDetails(
  "outer-ring-connector-26",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: dexterity_324_11; progression: Dexterity
setFullTreeNodeDetails(
  "outer-ring-connector-20",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: strength_324_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-20-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_336_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-21-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_348_13; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-22-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_000_13; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-23-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_012_13; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-24-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: perception_024_13; progression: Perception
setFullTreeNodeDetails(
  "outer-module-25-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: fortitude_036_13; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-26-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: meleeStaminaUse2; progression: skillTreeMeleeStaminaUse
setFullTreeNodeDetails(
  "outer-module-23-left-1",
  "Melee Stamina Use",
  "10% less Stamina Used by Melee Attacks\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
  [
    { statId: "less-stamina-used-by-melee-attacks", label: "less Stamina Used by Melee Attacks", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% less Stamina Used by Melee Attacks" },
    { statId: "recover-stamina-per-enemy-killed-using-melee-weapons", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
  ],
);
// Game node: healthMax2; progression: skillTreeHealth05
setFullTreeNodeDetails(
  "outer-module-23-left-2",
  "Health05",
  "+5 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: resistDamage2; progression: skillTreeResistDamage
setFullTreeNodeDetails(
  "outer-module-23-left-3",
  "Resist Damage",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: mithridatism4; progression: skillTreeMithridatism
setFullTreeNodeDetails(
  "outer-module-23-right-1",
  "Mithridatism",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "increased-poison-resistance", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "reduced-poison-build-up-speed", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "increased-recovery-speed-using-antidotes", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: mithridatism5; progression: skillTreeMithridatism
setFullTreeNodeDetails(
  "outer-module-23-right-2",
  "Mithridatism",
  "5% increased Poison Resistance\n10% reduced poison build up speed\n10% increased recovery speed using antidotes",
  [
    { statId: "increased-poison-resistance", label: "increased Poison Resistance", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Poison Resistance" },
    { statId: "reduced-poison-build-up-speed", label: "reduced poison build up speed", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced poison build up speed" },
    { statId: "increased-recovery-speed-using-antidotes", label: "increased recovery speed using antidotes", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased recovery speed using antidotes" },
  ],
);
// Game node: foodWaterMax1; progression: skillTreeMaxFoodWater
setFullTreeNodeDetails(
  "outer-module-23-right-3",
  "Max Food Water",
  "+20 to Maximum Food/Water",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Maximum Food/Water" },
  ],
);
// Game node: regenerateHealth1; progression: skillTreeHealing
setFullTreeNodeDetails(
  "outer-module-24-left-1",
  "Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "recover-health-every-second-while-not-very-hungry-or-thirsty", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "increased-critical-injury-healing-speed", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: regenerateHealth2; progression: skillTreeHealing
setFullTreeNodeDetails(
  "outer-module-24-left-2",
  "Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "recover-health-every-second-while-not-very-hungry-or-thirsty", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "increased-critical-injury-healing-speed", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: regenerateHealth3; progression: skillTreeHealing
setFullTreeNodeDetails(
  "outer-module-24-left-3",
  "Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "recover-health-every-second-while-not-very-hungry-or-thirsty", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "increased-critical-injury-healing-speed", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: resistWeather1; progression: skillTreeResistWeather
setFullTreeNodeDetails(
  "outer-module-24-right-1",
  "Resist Weather",
  "+5 increased Heat and Cold Resistance\n15% reduced food and water depletion when cold or overheated",
  [
    { statId: "increased-heat-and-cold-resistance", label: "increased Heat and Cold Resistance", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 increased Heat and Cold Resistance" },
    { statId: "reduced-food-and-water-depletion-when-cold-or-overheated", label: "reduced food and water depletion when cold or overheated", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% reduced food and water depletion when cold or overheated" },
  ],
);
// Game node: resistWeather2; progression: skillTreeResistWeather
setFullTreeNodeDetails(
  "outer-module-24-right-2",
  "Resist Weather",
  "+5 increased Heat and Cold Resistance\n15% reduced food and water depletion when cold or overheated",
  [
    { statId: "increased-heat-and-cold-resistance", label: "increased Heat and Cold Resistance", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 increased Heat and Cold Resistance" },
    { statId: "reduced-food-and-water-depletion-when-cold-or-overheated", label: "reduced food and water depletion when cold or overheated", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% reduced food and water depletion when cold or overheated" },
  ],
);
// Game node: resistWeather3; progression: skillTreeResistWeather
setFullTreeNodeDetails(
  "outer-module-24-right-3",
  "Resist Weather",
  "+5 increased Heat and Cold Resistance\n15% reduced food and water depletion when cold or overheated",
  [
    { statId: "increased-heat-and-cold-resistance", label: "increased Heat and Cold Resistance", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 increased Heat and Cold Resistance" },
    { statId: "reduced-food-and-water-depletion-when-cold-or-overheated", label: "reduced food and water depletion when cold or overheated", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% reduced food and water depletion when cold or overheated" },
  ],
);
// Game node: infiltrator1; progression: skillTreeInfiltrator
setFullTreeNodeDetails(
  "outer-module-22-left-1",
  "Infiltrator",
  "0.5s increased delay timer when setting off Land Mines\n20% decreased damage taken from Land Mines",
  [
    { statId: "s-increased-delay-timer-when-setting-off-land-mines", label: "s increased delay timer when setting off Land Mines", valuePerRank: 0.5, unit: "flat", sortOrder: 1, displayText: "0.5s increased delay timer when setting off Land Mines" },
    { statId: "decreased-damage-taken-from-land-mines", label: "decreased damage taken from Land Mines", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% decreased damage taken from Land Mines" },
  ],
);
// Game node: infiltrator2; progression: skillTreeInfiltrator
setFullTreeNodeDetails(
  "outer-module-22-left-2",
  "Infiltrator",
  "0.5s increased delay timer when setting off Land Mines\n20% decreased damage taken from Land Mines",
  [
    { statId: "s-increased-delay-timer-when-setting-off-land-mines", label: "s increased delay timer when setting off Land Mines", valuePerRank: 0.5, unit: "flat", sortOrder: 1, displayText: "0.5s increased delay timer when setting off Land Mines" },
    { statId: "decreased-damage-taken-from-land-mines", label: "decreased damage taken from Land Mines", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% decreased damage taken from Land Mines" },
  ],
);
// Game node: infiltrator3; progression: skillTreeInfiltrator3
setFullTreeNodeDetails(
  "outer-module-22-left-3",
  "Infiltrator3",
  "1s increased delay timer when setting off Land Mines\n20% decreased damage taken from Land Mines\nCan pick up Land Mines",
  [
    { statId: "s-increased-delay-timer-when-setting-off-land-mines", label: "s increased delay timer when setting off Land Mines", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "1s increased delay timer when setting off Land Mines" },
    { statId: "decreased-damage-taken-from-land-mines", label: "decreased damage taken from Land Mines", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% decreased damage taken from Land Mines" },
    { statId: "display-only-skilltreeinfiltrator3-2", label: "Can pick up Land Mines", valuePerRank: 0, unit: "flat", sortOrder: 3, displayText: "Can pick up Land Mines", includeInTotals: false },
  ],
);
// Game node: armorHeavy1; progression: skillTreeArmorHeavy
setFullTreeNodeDetails(
  "outer-module-22-right-1",
  "Armor Heavy",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "reduced-heavy-armor-durability-loss", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "reduced-heavy-armor-movement-and-stamina-penalty", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy2; progression: skillTreeArmorHeavy
setFullTreeNodeDetails(
  "outer-module-22-right-2",
  "Armor Heavy",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "reduced-heavy-armor-durability-loss", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "reduced-heavy-armor-movement-and-stamina-penalty", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy3; progression: skillTreeArmorHeavy
setFullTreeNodeDetails(
  "outer-module-22-right-3",
  "Armor Heavy",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "reduced-heavy-armor-durability-loss", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "reduced-heavy-armor-movement-and-stamina-penalty", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: shotgunDamage4; progression: skillTreeShotgunDamage
setFullTreeNodeDetails(
  "outer-module-20-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunDamage5; progression: skillTreeShotgunDamage
setFullTreeNodeDetails(
  "outer-module-20-right-2",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunDamage6; progression: skillTreeShotgunDamage
setFullTreeNodeDetails(
  "outer-module-20-right-3",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: armorHeavy4; progression: skillTreeArmorHeavy
setFullTreeNodeDetails(
  "outer-module-20-left-1",
  "Armor Heavy",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "reduced-heavy-armor-durability-loss", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "reduced-heavy-armor-movement-and-stamina-penalty", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy5; progression: skillTreeArmorHeavy
setFullTreeNodeDetails(
  "outer-module-20-left-2",
  "Armor Heavy",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "reduced-heavy-armor-durability-loss", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "reduced-heavy-armor-movement-and-stamina-penalty", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: armorHeavy6; progression: skillTreeArmorHeavy
setFullTreeNodeDetails(
  "outer-module-20-left-3",
  "Armor Heavy",
  "10% reduced Heavy Armor durability loss\n5% reduced Heavy Armor movement and stamina penalty",
  [
    { statId: "reduced-heavy-armor-durability-loss", label: "reduced Heavy Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Heavy Armor durability loss" },
    { statId: "reduced-heavy-armor-movement-and-stamina-penalty", label: "reduced Heavy Armor movement and stamina penalty", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% reduced Heavy Armor movement and stamina penalty" },
  ],
);
// Game node: medic4; progression: skillTreeMedic
setFullTreeNodeDetails(
  "outer-module-26-left-1",
  "Medic",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "increased-gained-exp-from-medical-healing-items", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic5; progression: skillTreeMedic
setFullTreeNodeDetails(
  "outer-module-26-left-2",
  "Medic",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "increased-gained-exp-from-medical-healing-items", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: medic6; progression: skillTreeMedic
setFullTreeNodeDetails(
  "outer-module-26-left-3",
  "Medic",
  "10% increased healing effectiveness of medical healing items\n25% increased gained EXP from medical healing items",
  [
    { statId: "increased-healing-effectiveness-of-medical-healing-items", label: "increased healing effectiveness of medical healing items", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased healing effectiveness of medical healing items" },
    { statId: "increased-gained-exp-from-medical-healing-items", label: "increased gained EXP from medical healing items", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased gained EXP from medical healing items" },
  ],
);
// Game node: metabolism1; progression: skillTreeMetabolism
setFullTreeNodeDetails(
  "outer-module-26-right-1",
  "Metabolism",
  "10% decreased speed of food and water loss",
  [
    { statId: "decreased-speed-of-food-and-water-loss", label: "decreased speed of food and water loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased speed of food and water loss" },
  ],
);
// Game node: metabolism2; progression: skillTreeMetabolism
setFullTreeNodeDetails(
  "outer-module-26-right-2",
  "Metabolism",
  "10% decreased speed of food and water loss",
  [
    { statId: "decreased-speed-of-food-and-water-loss", label: "decreased speed of food and water loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased speed of food and water loss" },
  ],
);
// Game node: metabolism3; progression: skillTreeMetabolism
setFullTreeNodeDetails(
  "outer-module-26-right-3",
  "Metabolism",
  "10% decreased speed of food and water loss",
  [
    { statId: "decreased-speed-of-food-and-water-loss", label: "decreased speed of food and water loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased speed of food and water loss" },
  ],
);
// Game node: knuckleStun1; progression: skillTreeKnucklesStun
setFullTreeNodeDetails(
  "outer-module-21-left-1",
  "Knuckles Stun",
  "8% increased chance to Stun Targets using Fist Weapons\n10% increased chance to knockdown Target using Fist Weapons",
  [
    { statId: "increased-chance-to-stun-targets-using-fist-weapons", label: "increased chance to Stun Targets using Fist Weapons", valuePerRank: 8, unit: "percent", sortOrder: 1, displayText: "8% increased chance to Stun Targets using Fist Weapons" },
    { statId: "increased-chance-to-knockdown-target-using-fist-weapons", label: "increased chance to knockdown Target using Fist Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased chance to knockdown Target using Fist Weapons" },
  ],
);
// Game node: knuckleStun2; progression: skillTreeKnucklesStun
setFullTreeNodeDetails(
  "outer-module-21-left-2",
  "Knuckles Stun",
  "8% increased chance to Stun Targets using Fist Weapons\n10% increased chance to knockdown Target using Fist Weapons",
  [
    { statId: "increased-chance-to-stun-targets-using-fist-weapons", label: "increased chance to Stun Targets using Fist Weapons", valuePerRank: 8, unit: "percent", sortOrder: 1, displayText: "8% increased chance to Stun Targets using Fist Weapons" },
    { statId: "increased-chance-to-knockdown-target-using-fist-weapons", label: "increased chance to knockdown Target using Fist Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased chance to knockdown Target using Fist Weapons" },
  ],
);
// Game node: knuckleStun3; progression: skillTreeKnucklesStun
setFullTreeNodeDetails(
  "outer-module-21-left-3",
  "Knuckles Stun",
  "8% increased chance to Stun Targets using Fist Weapons\n10% increased chance to knockdown Target using Fist Weapons",
  [
    { statId: "increased-chance-to-stun-targets-using-fist-weapons", label: "increased chance to Stun Targets using Fist Weapons", valuePerRank: 8, unit: "percent", sortOrder: 1, displayText: "8% increased chance to Stun Targets using Fist Weapons" },
    { statId: "increased-chance-to-knockdown-target-using-fist-weapons", label: "increased chance to knockdown Target using Fist Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased chance to knockdown Target using Fist Weapons" },
  ],
);
// Game node: regenerateHealth4; progression: skillTreeHealing
setFullTreeNodeDetails(
  "outer-module-21-right-1",
  "Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "recover-health-every-second-while-not-very-hungry-or-thirsty", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "increased-critical-injury-healing-speed", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: regenerateHealth5; progression: skillTreeHealing
setFullTreeNodeDetails(
  "outer-module-21-right-2",
  "Healing",
  "Recover 0.025 Health every second while not very hungry or thirsty\n20% increased Critical Injury healing speed",
  [
    { statId: "recover-health-every-second-while-not-very-hungry-or-thirsty", label: "Recover Health every second while not very hungry or thirsty", valuePerRank: 0.025, unit: "flat", sortOrder: 1, displayText: "Recover 0.025 Health every second while not very hungry or thirsty" },
    { statId: "increased-critical-injury-healing-speed", label: "increased Critical Injury healing speed", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Critical Injury healing speed" },
  ],
);
// Game node: foodWaterMax2; progression: skillTreeMaxFoodWater
setFullTreeNodeDetails(
  "outer-module-21-right-3",
  "Max Food Water",
  "+20 to Maximum Food/Water",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Maximum Food/Water" },
  ],
);
// Game node: resistDamage3; progression: skillTreeResistDamage
setFullTreeNodeDetails(
  "outer-module-25-left-1",
  "Resist Damage",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: resistDamage4; progression: skillTreeResistDamage
setFullTreeNodeDetails(
  "outer-module-25-left-2",
  "Resist Damage",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: resistDamage5; progression: skillTreeResistDamage
setFullTreeNodeDetails(
  "outer-module-25-left-3",
  "Resist Damage",
  "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
  [
    { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
    { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
  ],
);
// Game node: shotgunDamage2; progression: skillTreeShotgunDamage
setFullTreeNodeDetails(
  "outer-module-25-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunHandling2; progression: skillTreeShotgunHandling
setFullTreeNodeDetails(
  "outer-module-25-right-2",
  "Shotgun Handling",
  "5% improved Shotgun Fire Rate and Reload Speed",
  [
    { statId: "improved-shotgun-fire-rate-and-reload-speed", label: "improved Shotgun Fire Rate and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Shotgun Fire Rate and Reload Speed" },
  ],
);
// Game node: shotgunStun2; progression: skillTreeShotgunStun2
setFullTreeNodeDetails(
  "outer-module-25-right-3",
  "Shotgun Stun2",
  "Attacks with Shotgun stun enemies for additional 2s seconds",
  [
    { statId: "attacks-with-shotgun-stun-enemies-for-additional-s-seconds", label: "Attacks with Shotgun stun enemies for additional s seconds", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Attacks with Shotgun stun enemies for additional 2s seconds" },
  ],
);
// Game node: perception_324_17; progression: Perception
setFullTreeNodeDetails(
  "outer-module-20-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: fortitude_336_17; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-21-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_348_17; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-22-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_000_17; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-23-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: fortitude_012_17; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-24-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: strength_036_17; progression: Strength
setFullTreeNodeDetails(
  "outer-module-26-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_000_19; progression: Fortitude
setFullTreeNodeDetails(
  "final-ring-node-23",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: dexterity_012_19; progression: Dexterity
setFullTreeNodeDetails(
  "final-ring-node-24",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: fortitude_024_19; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-25-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_036_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-26",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: dexterity_324_19; progression: Dexterity
setFullTreeNodeDetails(
  "final-ring-node-20",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: fortitude_336_19; progression: Fortitude
setFullTreeNodeDetails(
  "final-ring-node-21",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_348_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-22",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: shotgunDamage3; progression: skillTreeShotgunDamage
setFullTreeNodeDetails(
  "outer-open-split-23-right-1",
  "Shotgun Damage",
  "5% increased Shotgun Physical Damage",
  [
    { statId: "increased-shotgun-physical-damage", label: "increased Shotgun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Shotgun Physical Damage" },
  ],
);
// Game node: shotgunHandling3; progression: skillTreeShotgunHandling
setFullTreeNodeDetails(
  "outer-open-split-23-right-2",
  "Shotgun Handling",
  "5% improved Shotgun Fire Rate and Reload Speed",
  [
    { statId: "improved-shotgun-fire-rate-and-reload-speed", label: "improved Shotgun Fire Rate and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Shotgun Fire Rate and Reload Speed" },
  ],
);
// Game node: shotgunStun3; progression: skillTreeShotgunStun3
setFullTreeNodeDetails(
  "outer-open-split-23-right-3",
  "Shotgun Stun3",
  "Attacks with Shotgun stun enemies for additional 2s seconds.\nLeg shots with Shotguns cripple opponents",
  [
    { statId: "attacks-with-shotgun-stun-enemies-for-additional-s-seconds", label: "Attacks with Shotgun stun enemies for additional s seconds.", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Attacks with Shotgun stun enemies for additional 2s seconds." },
    { statId: "display-only-skilltreeshotgunstun3-1", label: "Leg shots with Shotguns cripple opponents", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "Leg shots with Shotguns cripple opponents", includeInTotals: false },
  ],
);
// Game node: knuckleDamage4; progression: skillTreeKnucklesDamage
setFullTreeNodeDetails(
  "outer-open-split-23-left-1",
  "Knuckles Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: knuckleDamage5; progression: skillTreeKnucklesDamage
setFullTreeNodeDetails(
  "outer-open-split-23-left-2",
  "Knuckles Damage",
  "5% increased Fist Weapon Physical Damage\n3% increased decapitation chance with punches to the head using Fist Weapons",
  [
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 3, unit: "percent", sortOrder: 2, displayText: "3% increased decapitation chance with punches to the head using Fist Weapons" },
  ],
);
// Game node: knuckleTeethBreaker; progression: skillTreeKnucklesTeethBreaker
setFullTreeNodeDetails(
  "outer-open-split-23-left-3",
  "Knuckles Teeth Breaker",
  "5% increased Fist Weapon Physical Damage\n5% increased decapitation chance with punches to the head using Fist Weapons\nPunches to the head negate ability to get infected by the Target",
  [
    { statId: "increased-fist-weapon-physical-damage", label: "increased Fist Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Fist Weapon Physical Damage" },
    { statId: "increased-decapitation-chance-with-punches-to-the-head-using-fist-weapons", label: "increased decapitation chance with punches to the head using Fist Weapons", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased decapitation chance with punches to the head using Fist Weapons" },
    { statId: "display-only-skilltreeknucklesteethbreaker-2", label: "Punches to the head negate ability to get infected by the Target", valuePerRank: 0, unit: "flat", sortOrder: 3, displayText: "Punches to the head negate ability to get infected by the Target", includeInTotals: false },
  ],
);
// Game node: healthMax3; progression: skillTreeHealth05
setFullTreeNodeDetails(
  "outer-single-node-21",
  "Health05",
  "+5 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: healthMax4; progression: skillTreeHealth05
setFullTreeNodeDetails(
  "outer-single-node-22",
  "Health05",
  "+5 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: healthMax5; progression: skillTreeHealth05
setFullTreeNodeDetails(
  "outer-single-node-24",
  "Health05",
  "+5 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: healthMax6; progression: skillTreeHealth05
setFullTreeNodeDetails(
  "outer-single-node-25",
  "Health05",
  "+5 to Maximum Health",
  [
    { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
  ],
);
// Game node: rootPerception; progression: skillTreePerceptionClass
setFullTreeNodeDetails(
  "perception-root",
  "Scout",
  "S C O U T\n5% increased Physical Damage with Spears, Bows, Crossbows and Sniper Rifles\n10% decreased stamina consumption while aiming with Ranged Weapons\n10% increased Dismemberment Chance\n+10 to Loot Stage\n+10 to Trader Stage",
  [
    { statId: "increased-physical-damage-with-spears-bows-crossbows-and-sniper-rifles", label: "increased Physical Damage with Spears, Bows, Crossbows and Sniper Rifles", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Physical Damage with Spears, Bows, Crossbows and Sniper Rifles" },
    { statId: "decreased-stamina-consumption-while-aiming-with-ranged-weapons", label: "decreased stamina consumption while aiming with Ranged Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% decreased stamina consumption while aiming with Ranged Weapons" },
    { statId: "increased-dismemberment-chance", label: "increased Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased Dismemberment Chance" },
    { statId: "to-loot-stage", label: "to Loot Stage", valuePerRank: 10, unit: "flat", sortOrder: 4, displayText: "+10 to Loot Stage" },
    { statId: "to-trader-stage", label: "to Trader Stage", valuePerRank: 10, unit: "flat", sortOrder: 5, displayText: "+10 to Trader Stage" },
  ],
);
// Game node: basePerception; progression: Perception
setFullTreeNodeDetails(
  "perception-shared-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: baseSneakDamage; progression: skillTreeSneakDamageBase
setFullTreeNodeDetails(
  "perception-module-1-entry",
  "Sneak Damage Base",
  "75% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 75, unit: "percent", sortOrder: 1, displayText: "75% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamagebase-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: baseBowHandling; progression: skillTreeArcheryHandlingBase
setFullTreeNodeDetails(
  "perception-module-2-entry",
  "Archery Handling Base",
  "15% improved Bow and Crossbow Aim, Draw and Reload Speed",
  [
    { statId: "improved-bow-and-crossbow-aim-draw-and-reload-speed", label: "improved Bow and Crossbow Aim, Draw and Reload Speed", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% improved Bow and Crossbow Aim, Draw and Reload Speed" },
  ],
);
// Game node: baseRangeDamage; progression: skillTreeRangedDamageBase
setFullTreeNodeDetails(
  "perception-module-3-entry",
  "Ranged Damage Base",
  "10% increased Ranged Physical Damage",
  [
    { statId: "increased-ranged-physical-damage", label: "increased Ranged Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Physical Damage" },
  ],
);
// Game node: perception_048_7; progression: Perception
setFullTreeNodeDetails(
  "perception-module-1-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_072_7; progression: Perception
setFullTreeNodeDetails(
  "perception-module-2-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_096_7; progression: Perception
setFullTreeNodeDetails(
  "perception-module-3-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: hunter1; progression: skillTreeHunter
setFullTreeNodeDetails(
  "perception-module-1-right-1",
  "Hunter",
  "+10 to Maximum Food/Water\n10% increased amount of resources gathered from animals with Bladed Tools",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "increased-amount-of-resources-gathered-from-animals-with-bladed-tools", label: "increased amount of resources gathered from animals with Bladed Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased amount of resources gathered from animals with Bladed Tools" },
  ],
);
// Game node: hunter2; progression: skillTreeHunter
setFullTreeNodeDetails(
  "perception-module-1-right-2",
  "Hunter",
  "+10 to Maximum Food/Water\n10% increased amount of resources gathered from animals with Bladed Tools",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "increased-amount-of-resources-gathered-from-animals-with-bladed-tools", label: "increased amount of resources gathered from animals with Bladed Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased amount of resources gathered from animals with Bladed Tools" },
  ],
);
// Game node: hunter3; progression: skillTreeHunter
setFullTreeNodeDetails(
  "perception-module-1-right-3",
  "Hunter",
  "+10 to Maximum Food/Water\n10% increased amount of resources gathered from animals with Bladed Tools",
  [
    { statId: "to-maximum-food-water", label: "to Maximum Food/Water", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 to Maximum Food/Water" },
    { statId: "increased-amount-of-resources-gathered-from-animals-with-bladed-tools", label: "increased amount of resources gathered from animals with Bladed Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased amount of resources gathered from animals with Bladed Tools" },
  ],
);
// Game node: polearmDamage1; progression: skillTreeSpearDamage
setFullTreeNodeDetails(
  "perception-module-1-left-1",
  "Spear Damage",
  "5% increased Polearm Physical Damage",
  [
    { statId: "increased-polearm-physical-damage", label: "increased Polearm Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Polearm Physical Damage" },
  ],
);
// Game node: penetratingSpears1; progression: skillTreeSpearArmorReduction
setFullTreeNodeDetails(
  "perception-module-1-left-2",
  "Spear Armor Reduction",
  "10% to Polearm Target Armor Reduction",
  [
    { statId: "to-polearm-target-armor-reduction", label: "to Polearm Target Armor Reduction", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% to Polearm Target Armor Reduction" },
  ],
);
// Game node: polearmDamage2; progression: skillTreeSpearDamage
setFullTreeNodeDetails(
  "perception-module-1-left-3",
  "Spear Damage",
  "5% increased Polearm Physical Damage",
  [
    { statId: "increased-polearm-physical-damage", label: "increased Polearm Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Polearm Physical Damage" },
  ],
);
// Game node: archeryDamage1; progression: skillTreeArcheryDamage
setFullTreeNodeDetails(
  "perception-module-2-left-1",
  "Archery Damage",
  "5% increased Bow and Crossbow Physical Damage",
  [
    { statId: "increased-bow-and-crossbow-physical-damage", label: "increased Bow and Crossbow Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Bow and Crossbow Physical Damage" },
  ],
);
// Game node: archeryHandling1; progression: skillTreeArcheryHandling
setFullTreeNodeDetails(
  "perception-module-2-left-2",
  "Archery Handling",
  "10% improved Bow and Crossbow Aim, Draw and Reload Speed",
  [
    { statId: "improved-bow-and-crossbow-aim-draw-and-reload-speed", label: "improved Bow and Crossbow Aim, Draw and Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Bow and Crossbow Aim, Draw and Reload Speed" },
  ],
);
// Game node: archeryDamage2; progression: skillTreeArcheryDamage
setFullTreeNodeDetails(
  "perception-module-2-left-3",
  "Archery Damage",
  "5% increased Bow and Crossbow Physical Damage",
  [
    { statId: "increased-bow-and-crossbow-physical-damage", label: "increased Bow and Crossbow Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Bow and Crossbow Physical Damage" },
  ],
);
// Game node: loot1; progression: skillTreeLooting05
setFullTreeNodeDetails(
  "perception-module-2-right-1",
  "Looting05",
  "+5 to Loot Stage\n10% increased looting speed when opening Untouched Containers",
  [
    { statId: "to-loot-stage", label: "to Loot Stage", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Loot Stage" },
    { statId: "increased-looting-speed-when-opening-untouched-containers", label: "increased looting speed when opening Untouched Containers", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased looting speed when opening Untouched Containers" },
  ],
);
// Game node: lootPerception1; progression: Perception
setFullTreeNodeDetails(
  "perception-module-2-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: loot2; progression: skillTreeLooting05
setFullTreeNodeDetails(
  "perception-module-2-right-3",
  "Looting05",
  "+5 to Loot Stage\n10% increased looting speed when opening Untouched Containers",
  [
    { statId: "to-loot-stage", label: "to Loot Stage", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Loot Stage" },
    { statId: "increased-looting-speed-when-opening-untouched-containers", label: "increased looting speed when opening Untouched Containers", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased looting speed when opening Untouched Containers" },
  ],
);
// Game node: firearmArmorReduction1; progression: skillTreeRangedArmorReduction
setFullTreeNodeDetails(
  "perception-module-3-left-1",
  "Ranged Armor Reduction",
  "7.5% to Ranged Weapon Target Armor Reduction",
  [
    { statId: "to-ranged-weapon-target-armor-reduction", label: "to Ranged Weapon Target Armor Reduction", valuePerRank: 7.5, unit: "percent", sortOrder: 1, displayText: "7.5% to Ranged Weapon Target Armor Reduction" },
  ],
);
// Game node: firearmPerception1; progression: Perception
setFullTreeNodeDetails(
  "perception-module-3-left-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: firearmArmorReduction2; progression: skillTreeRangedArmorReduction
setFullTreeNodeDetails(
  "perception-module-3-left-3",
  "Ranged Armor Reduction",
  "7.5% to Ranged Weapon Target Armor Reduction",
  [
    { statId: "to-ranged-weapon-target-armor-reduction", label: "to Ranged Weapon Target Armor Reduction", valuePerRank: 7.5, unit: "percent", sortOrder: 1, displayText: "7.5% to Ranged Weapon Target Armor Reduction" },
  ],
);
// Game node: sniperRifleDamage1; progression: skillTreeSniperDamage
setFullTreeNodeDetails(
  "perception-module-3-right-1",
  "Sniper Damage",
  "5% increased Sniper Rifle Physical Damage",
  [
    { statId: "increased-sniper-rifle-physical-damage", label: "increased Sniper Rifle Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sniper Rifle Physical Damage" },
  ],
);
// Game node: sniperRifleHandling1; progression: skillTreeSniperHandling
setFullTreeNodeDetails(
  "perception-module-3-right-2",
  "Sniper Handling",
  "5% improved Sniper Rifle Aim and Reload Speed",
  [
    { statId: "improved-sniper-rifle-aim-and-reload-speed", label: "improved Sniper Rifle Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Sniper Rifle Aim and Reload Speed" },
  ],
);
// Game node: sniperRifleDeadEye1; progression: skillTreeSniperDeadEye
setFullTreeNodeDetails(
  "perception-module-3-right-3",
  "Sniper Dead Eye",
  "10% decreased stamina consumption while aiming with Sniper Rifles\nSuccessive kills can trigger up to 20% more kill streak bonus damage",
  [
    { statId: "decreased-stamina-consumption-while-aiming-with-sniper-rifles", label: "decreased stamina consumption while aiming with Sniper Rifles", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased stamina consumption while aiming with Sniper Rifles" },
    { statId: "successive-kills-can-trigger-up-to-more-kill-streak-bonus-damage", label: "Successive kills can trigger up to more kill streak bonus damage", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "Successive kills can trigger up to 20% more kill streak bonus damage" },
  ],
);
// Game node: perception_048_11; progression: Perception
setFullTreeNodeDetails(
  "perception-module-1-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: tracker1; progression: skillTreeTrackAnimalsSmall
setFullTreeNodeDetails(
  "outer-ring-connector-28",
  "Track Animals Small",
  "Track small game like rabbits, snakes or chickens. They are marked on your compass and map",
  [
    { statId: "display-only-skilltreetrackanimalssmall-0", label: "Track small game like rabbits, snakes or chickens. They are marked on your compass and map", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "Track small game like rabbits, snakes or chickens. They are marked on your compass and map", includeInTotals: false },
  ],
);
// Game node: perception_072_11; progression: Perception
setFullTreeNodeDetails(
  "perception-module-2-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: forager1; progression: skillTreeForager
setFullTreeNodeDetails(
  "outer-ring-connector-30",
  "Forager",
  "50% Chance to harvest an additional plant\nIncreased harvesting area by 1 while using a Sickle or Scythe",
  [
    { statId: "chance-to-harvest-an-additional-plant", label: "Chance to harvest an additional plant", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% Chance to harvest an additional plant" },
    { statId: "increased-harvesting-area-by-while-using-a-sickle-or-scythe", label: "Increased harvesting area by while using a Sickle or Scythe", valuePerRank: 1, unit: "flat", sortOrder: 2, displayText: "Increased harvesting area by 1 while using a Sickle or Scythe" },
  ],
);
// Game node: perception_096_11; progression: Perception
setFullTreeNodeDetails(
  "perception-module-3-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: strength_108_11; progression: Strength
setFullTreeNodeDetails(
  "outer-ring-connector-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_048_13; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-27-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: perception_060_13; progression: Perception
setFullTreeNodeDetails(
  "outer-module-28-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_072_13; progression: Perception
setFullTreeNodeDetails(
  "outer-module-29-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: dexterity_084_13; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-30-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_096_13; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-1-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: polearmDamage3; progression: skillTreeSpearDamage
setFullTreeNodeDetails(
  "outer-module-27-left-1",
  "Spear Damage",
  "5% increased Polearm Physical Damage",
  [
    { statId: "increased-polearm-physical-damage", label: "increased Polearm Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Polearm Physical Damage" },
  ],
);
// Game node: penetratingSpears2; progression: skillTreeSpearArmorReduction
setFullTreeNodeDetails(
  "outer-module-27-left-2",
  "Spear Armor Reduction",
  "10% to Polearm Target Armor Reduction",
  [
    { statId: "to-polearm-target-armor-reduction", label: "to Polearm Target Armor Reduction", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% to Polearm Target Armor Reduction" },
  ],
);
// Game node: polearmDamage4; progression: skillTreeSpearDamage
setFullTreeNodeDetails(
  "outer-module-27-left-3",
  "Spear Damage",
  "5% increased Polearm Physical Damage",
  [
    { statId: "increased-polearm-physical-damage", label: "increased Polearm Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Polearm Physical Damage" },
  ],
);
// Game node: sniperRifleDamage4; progression: skillTreeSniperDamage
setFullTreeNodeDetails(
  "outer-module-27-right-1",
  "Sniper Damage",
  "5% increased Sniper Rifle Physical Damage",
  [
    { statId: "increased-sniper-rifle-physical-damage", label: "increased Sniper Rifle Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sniper Rifle Physical Damage" },
  ],
);
// Game node: sniperRifleDamage5; progression: skillTreeSniperDamage
setFullTreeNodeDetails(
  "outer-module-27-right-2",
  "Sniper Damage",
  "5% increased Sniper Rifle Physical Damage",
  [
    { statId: "increased-sniper-rifle-physical-damage", label: "increased Sniper Rifle Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sniper Rifle Physical Damage" },
  ],
);
// Game node: sniperRifleDamage6; progression: skillTreeSniperDamage
setFullTreeNodeDetails(
  "outer-module-27-right-3",
  "Sniper Damage",
  "5% increased Sniper Rifle Physical Damage",
  [
    { statId: "increased-sniper-rifle-physical-damage", label: "increased Sniper Rifle Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sniper Rifle Physical Damage" },
  ],
);
// Game node: butcher1; progression: skillTreeButcher
setFullTreeNodeDetails(
  "outer-module-28-right-1",
  "Butcher",
  "15% increased amount of resources gathered from animals with Bladed Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-animals-with-bladed-tools", label: "increased amount of resources gathered from animals with Bladed Tools", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% increased amount of resources gathered from animals with Bladed Tools" },
  ],
);
// Game node: butcher2; progression: skillTreeButcher
setFullTreeNodeDetails(
  "outer-module-28-right-2",
  "Butcher",
  "15% increased amount of resources gathered from animals with Bladed Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-animals-with-bladed-tools", label: "increased amount of resources gathered from animals with Bladed Tools", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% increased amount of resources gathered from animals with Bladed Tools" },
  ],
);
// Game node: butcher3; progression: skillTreeButcher
setFullTreeNodeDetails(
  "outer-module-28-right-3",
  "Butcher",
  "15% increased amount of resources gathered from animals with Bladed Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-animals-with-bladed-tools", label: "increased amount of resources gathered from animals with Bladed Tools", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% increased amount of resources gathered from animals with Bladed Tools" },
  ],
);
// Game node: tracker2; progression: skillTreeTrackAnimalsMedium
setFullTreeNodeDetails(
  "outer-module-28-left-1",
  "Track Animals Medium",
  "Track medium game like deer, boars, wolves and coyotes",
  [
    { statId: "display-only-skilltreetrackanimalsmedium-0", label: "Track medium game like deer, boars, wolves and coyotes", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "Track medium game like deer, boars, wolves and coyotes", includeInTotals: false },
  ],
);
// Game node: trackerPerception; progression: Perception
setFullTreeNodeDetails(
  "outer-module-28-left-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: tracker3; progression: skillTreeTrackAnimalsLarge
setFullTreeNodeDetails(
  "outer-module-28-left-3",
  "Track Animals Large",
  "Track big game like mountain lions and bears",
  [
    { statId: "display-only-skilltreetrackanimalslarge-0", label: "Track big game like mountain lions and bears", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "Track big game like mountain lions and bears", includeInTotals: false },
  ],
);
// Game node: archeryDamage3; progression: skillTreeArcheryDamage
setFullTreeNodeDetails(
  "outer-module-29-left-1",
  "Archery Damage",
  "5% increased Bow and Crossbow Physical Damage",
  [
    { statId: "increased-bow-and-crossbow-physical-damage", label: "increased Bow and Crossbow Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Bow and Crossbow Physical Damage" },
  ],
);
// Game node: archeryHandling2; progression: skillTreeArcheryHandling
setFullTreeNodeDetails(
  "outer-module-29-left-2",
  "Archery Handling",
  "10% improved Bow and Crossbow Aim, Draw and Reload Speed",
  [
    { statId: "improved-bow-and-crossbow-aim-draw-and-reload-speed", label: "improved Bow and Crossbow Aim, Draw and Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Bow and Crossbow Aim, Draw and Reload Speed" },
  ],
);
// Game node: archeryDamage4; progression: skillTreeArcheryDamage
setFullTreeNodeDetails(
  "outer-module-29-left-3",
  "Archery Damage",
  "5% increased Bow and Crossbow Physical Damage",
  [
    { statId: "increased-bow-and-crossbow-physical-damage", label: "increased Bow and Crossbow Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Bow and Crossbow Physical Damage" },
  ],
);
// Game node: archeryDamage6; progression: skillTreeArcheryDamage
setFullTreeNodeDetails(
  "outer-module-29-right-1",
  "Archery Damage",
  "5% increased Bow and Crossbow Physical Damage",
  [
    { statId: "increased-bow-and-crossbow-physical-damage", label: "increased Bow and Crossbow Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Bow and Crossbow Physical Damage" },
  ],
);
// Game node: archeryHandling3; progression: skillTreeArcheryHandling
setFullTreeNodeDetails(
  "outer-module-29-right-2",
  "Archery Handling",
  "10% improved Bow and Crossbow Aim, Draw and Reload Speed",
  [
    { statId: "improved-bow-and-crossbow-aim-draw-and-reload-speed", label: "improved Bow and Crossbow Aim, Draw and Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Bow and Crossbow Aim, Draw and Reload Speed" },
  ],
);
// Game node: archeryDamage5; progression: skillTreeArcheryDamage
setFullTreeNodeDetails(
  "outer-module-29-right-3",
  "Archery Damage",
  "5% increased Bow and Crossbow Physical Damage",
  [
    { statId: "increased-bow-and-crossbow-physical-damage", label: "increased Bow and Crossbow Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Bow and Crossbow Physical Damage" },
  ],
);
// Game node: farmer1; progression: skillTreeFarmer
setFullTreeNodeDetails(
  "outer-module-30-right-1",
  "Farmer",
  "-25% Farm Plot crafting cost",
  [
    { statId: "farm-plot-crafting-cost", label: "Farm Plot crafting cost", valuePerRank: -25, unit: "percent", sortOrder: 1, displayText: "-25% Farm Plot crafting cost" },
  ],
);
// Game node: forager2; progression: skillTreeForager
setFullTreeNodeDetails(
  "outer-module-30-right-2",
  "Forager",
  "50% Chance to harvest an additional plant\nIncreased harvesting area by 1 while using a Sickle or Scythe",
  [
    { statId: "chance-to-harvest-an-additional-plant", label: "Chance to harvest an additional plant", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% Chance to harvest an additional plant" },
    { statId: "increased-harvesting-area-by-while-using-a-sickle-or-scythe", label: "Increased harvesting area by while using a Sickle or Scythe", valuePerRank: 1, unit: "flat", sortOrder: 2, displayText: "Increased harvesting area by 1 while using a Sickle or Scythe" },
  ],
);
// Game node: farmer2; progression: skillTreeFarmer
setFullTreeNodeDetails(
  "outer-module-30-right-3",
  "Farmer",
  "-25% Farm Plot crafting cost",
  [
    { statId: "farm-plot-crafting-cost", label: "Farm Plot crafting cost", valuePerRank: -25, unit: "percent", sortOrder: 1, displayText: "-25% Farm Plot crafting cost" },
  ],
);
// Game node: loot3; progression: skillTreeLooting05
setFullTreeNodeDetails(
  "outer-module-30-left-1",
  "Looting05",
  "+5 to Loot Stage\n10% increased looting speed when opening Untouched Containers",
  [
    { statId: "to-loot-stage", label: "to Loot Stage", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Loot Stage" },
    { statId: "increased-looting-speed-when-opening-untouched-containers", label: "increased looting speed when opening Untouched Containers", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased looting speed when opening Untouched Containers" },
  ],
);
// Game node: lootPerception2; progression: Perception
setFullTreeNodeDetails(
  "outer-module-30-left-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: loot4; progression: skillTreeLooting10
setFullTreeNodeDetails(
  "outer-module-30-left-3",
  "Looting10",
  "10% increased Loot Stage\n10% increased looting speed when opening Untouched Containers",
  [
    { statId: "increased-loot-stage", label: "increased Loot Stage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Loot Stage" },
    { statId: "increased-looting-speed-when-opening-untouched-containers", label: "increased looting speed when opening Untouched Containers", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased looting speed when opening Untouched Containers" },
  ],
);
// Game node: sniperRifleDamage2; progression: skillTreeSniperDamage
setFullTreeNodeDetails(
  "outer-module-1-right-1",
  "Sniper Damage",
  "5% increased Sniper Rifle Physical Damage",
  [
    { statId: "increased-sniper-rifle-physical-damage", label: "increased Sniper Rifle Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sniper Rifle Physical Damage" },
  ],
);
// Game node: sniperRifleHandling2; progression: skillTreeSniperHandling
setFullTreeNodeDetails(
  "outer-module-1-right-2",
  "Sniper Handling",
  "5% improved Sniper Rifle Aim and Reload Speed",
  [
    { statId: "improved-sniper-rifle-aim-and-reload-speed", label: "improved Sniper Rifle Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Sniper Rifle Aim and Reload Speed" },
  ],
);
// Game node: sniperRifleDeadEye2; progression: skillTreeSniperDeadEye
setFullTreeNodeDetails(
  "outer-module-1-right-3",
  "Sniper Dead Eye",
  "10% decreased stamina consumption while aiming with Sniper Rifles\nSuccessive kills can trigger up to 20% more kill streak bonus damage",
  [
    { statId: "decreased-stamina-consumption-while-aiming-with-sniper-rifles", label: "decreased stamina consumption while aiming with Sniper Rifles", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased stamina consumption while aiming with Sniper Rifles" },
    { statId: "successive-kills-can-trigger-up-to-more-kill-streak-bonus-damage", label: "Successive kills can trigger up to more kill streak bonus damage", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "Successive kills can trigger up to 20% more kill streak bonus damage" },
  ],
);
// Game node: firearmArmorReduction3; progression: skillTreeRangedArmorReduction
setFullTreeNodeDetails(
  "outer-module-1-left-1",
  "Ranged Armor Reduction",
  "7.5% to Ranged Weapon Target Armor Reduction",
  [
    { statId: "to-ranged-weapon-target-armor-reduction", label: "to Ranged Weapon Target Armor Reduction", valuePerRank: 7.5, unit: "percent", sortOrder: 1, displayText: "7.5% to Ranged Weapon Target Armor Reduction" },
  ],
);
// Game node: firearmPerception2; progression: Perception
setFullTreeNodeDetails(
  "outer-module-1-left-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: firearmArmorReduction4; progression: skillTreeRangedArmorReduction
setFullTreeNodeDetails(
  "outer-module-1-left-3",
  "Ranged Armor Reduction",
  "7.5% to Ranged Weapon Target Armor Reduction",
  [
    { statId: "to-ranged-weapon-target-armor-reduction", label: "to Ranged Weapon Target Armor Reduction", valuePerRank: 7.5, unit: "percent", sortOrder: 1, displayText: "7.5% to Ranged Weapon Target Armor Reduction" },
  ],
);
// Game node: treasureHunter1; progression: skillTreeTreasureHunter
setFullTreeNodeDetails(
  "outer-module-2-right-3",
  "Treasure Hunter",
  "10% increased item quantity in buried treasure\n20% smaller Buried Treasure Search Area",
  [
    { statId: "increased-item-quantity-in-buried-treasure", label: "increased item quantity in buried treasure", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased item quantity in buried treasure" },
    { statId: "smaller-buried-treasure-search-area", label: "smaller Buried Treasure Search Area", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% smaller Buried Treasure Search Area" },
  ],
);
// Game node: treasureHunterPerception; progression: Perception
setFullTreeNodeDetails(
  "outer-module-2-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: treasureHunter2; progression: skillTreeTreasureHunter
setFullTreeNodeDetails(
  "outer-module-2-right-1",
  "Treasure Hunter",
  "10% increased item quantity in buried treasure\n20% smaller Buried Treasure Search Area",
  [
    { statId: "increased-item-quantity-in-buried-treasure", label: "increased item quantity in buried treasure", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased item quantity in buried treasure" },
    { statId: "smaller-buried-treasure-search-area", label: "smaller Buried Treasure Search Area", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% smaller Buried Treasure Search Area" },
  ],
);
// Game node: sneakDamage3; progression: skillTreeSneakDamage
setFullTreeNodeDetails(
  "outer-module-2-left-3",
  "Sneak Damage",
  "50% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamage-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: sneakDexterity3; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-2-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: sneakDamage4; progression: skillTreeSneakDamage
setFullTreeNodeDetails(
  "outer-module-2-left-1",
  "Sneak Damage",
  "50% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamage-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: perception_048_17; progression: Perception
setFullTreeNodeDetails(
  "outer-module-27-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_060_17; progression: Perception
setFullTreeNodeDetails(
  "outer-module-28-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_072_17; progression: Perception
setFullTreeNodeDetails(
  "outer-module-29-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_084_17; progression: Perception
setFullTreeNodeDetails(
  "outer-module-30-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: intellect_108_17; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-2-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: perception_096_17; progression: Perception
setFullTreeNodeDetails(
  "outer-module-1-top-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_048_19; progression: Perception
setFullTreeNodeDetails(
  "final-ring-node-27",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: strength_060_19; progression: Strength
setFullTreeNodeDetails(
  "final-ring-node-28",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: perception_072_19; progression: Perception
setFullTreeNodeDetails(
  "final-ring-node-29",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: intellect_084_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-30",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: perception_096_19; progression: Perception
setFullTreeNodeDetails(
  "final-ring-node-1",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: strength_108_19; progression: Strength
setFullTreeNodeDetails(
  "final-ring-node-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: loot5; progression: skillTreeLooting15
setFullTreeNodeDetails(
  "outer-single-node-30",
  "Looting15",
  "15% increased Loot Stage\n10% increased looting speed when opening Untouched Containers",
  [
    { statId: "increased-loot-stage", label: "increased Loot Stage", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% increased Loot Stage" },
    { statId: "increased-looting-speed-when-opening-untouched-containers", label: "increased looting speed when opening Untouched Containers", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased looting speed when opening Untouched Containers" },
  ],
);
// Game node: sniperRiflePierce3; progression: skillTreeSniperPenetration
setFullTreeNodeDetails(
  "outer-single-node-1",
  "Sniper Penetration",
  "+1 to Sniper Rifle Target Penetration.\nRequires AP Rounds.",
  [
    { statId: "to-sniper-rifle-target-penetration", label: "to Sniper Rifle Target Penetration.", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 to Sniper Rifle Target Penetration." },
    { statId: "display-only-skilltreesniperpenetration-1", label: "Requires AP Rounds.", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "Requires AP Rounds.", includeInTotals: false },
  ],
);
// Game node: treasureHunter3; progression: skillTreeTreasureHunter
setFullTreeNodeDetails(
  "outer-half-2-1",
  "Treasure Hunter",
  "10% increased item quantity in buried treasure\n20% smaller Buried Treasure Search Area",
  [
    { statId: "increased-item-quantity-in-buried-treasure", label: "increased item quantity in buried treasure", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased item quantity in buried treasure" },
    { statId: "smaller-buried-treasure-search-area", label: "smaller Buried Treasure Search Area", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% smaller Buried Treasure Search Area" },
  ],
);
// Game node: treasureHunterLoot1; progression: skillTreeTreasureLoot1
setFullTreeNodeDetails(
  "outer-half-2-2",
  "Treasure Loot1",
  "10% increased item quantity in buried treasure\nYou can additionally find 100-200 Old Cash in buried treasures",
  [
    { statId: "increased-item-quantity-in-buried-treasure", label: "increased item quantity in buried treasure", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased item quantity in buried treasure" },
    { statId: "you-can-additionally-find-200-old-cash-in-buried-treasures", label: "You can additionally find -200 Old Cash in buried treasures", valuePerRank: 100, unit: "flat", sortOrder: 2, displayText: "You can additionally find 100-200 Old Cash in buried treasures" },
  ],
);
// Game node: treasureHunterLoot2; progression: skillTreeTreasureLoot2
setFullTreeNodeDetails(
  "outer-half-2-3",
  "Treasure Loot2",
  "10% increased item quantity in buried treasure\nYou can additionally find 100-200 Duke's Casino Tokens in buried treasures",
  [
    { statId: "increased-item-quantity-in-buried-treasure", label: "increased item quantity in buried treasure", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased item quantity in buried treasure" },
    { statId: "you-can-additionally-find-200-duke-s-casino-tokens-in-buried-treasures", label: "You can additionally find -200 Duke's Casino Tokens in buried treasures", valuePerRank: 100, unit: "flat", sortOrder: 2, displayText: "You can additionally find 100-200 Duke's Casino Tokens in buried treasures" },
  ],
);
// Game node: treasureHunterLoot3; progression: skillTreeTreasureLoot3
setFullTreeNodeDetails(
  "outer-half-2-4",
  "Treasure Loot3",
  "10% increased item quantity in buried treasure\nYou can additionally find Armor, Weapons, Rare Ore or Superior Parts in buried treasures",
  [
    { statId: "increased-item-quantity-in-buried-treasure", label: "increased item quantity in buried treasure", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased item quantity in buried treasure" },
    { statId: "display-only-skilltreetreasureloot3-1", label: "You can additionally find Armor, Weapons, Rare Ore or Superior Parts in buried treasures", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "You can additionally find Armor, Weapons, Rare Ore or Superior Parts in buried treasures", includeInTotals: false },
  ],
);
// Game node: sniperRiflePierce1; progression: skillTreeSniperPenetration
setFullTreeNodeDetails(
  "outer-half-27-1",
  "Sniper Penetration",
  "+1 to Sniper Rifle Target Penetration.\nRequires AP Rounds.",
  [
    { statId: "to-sniper-rifle-target-penetration", label: "to Sniper Rifle Target Penetration.", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 to Sniper Rifle Target Penetration." },
    { statId: "display-only-skilltreesniperpenetration-1", label: "Requires AP Rounds.", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "Requires AP Rounds.", includeInTotals: false },
  ],
);
// Game node: sniperRiflePerception1; progression: Perception
setFullTreeNodeDetails(
  "outer-half-27-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: sniperRiflePierce2; progression: skillTreeSniperPenetration
setFullTreeNodeDetails(
  "outer-half-27-3",
  "Sniper Penetration",
  "+1 to Sniper Rifle Target Penetration.\nRequires AP Rounds.",
  [
    { statId: "to-sniper-rifle-target-penetration", label: "to Sniper Rifle Target Penetration.", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 to Sniper Rifle Target Penetration." },
    { statId: "display-only-skilltreesniperpenetration-1", label: "Requires AP Rounds.", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "Requires AP Rounds.", includeInTotals: false },
  ],
);
// Game node: polearmDamage5; progression: skillTreeSpearDamage
setFullTreeNodeDetails(
  "outer-open-split-29-right-1",
  "Spear Damage",
  "5% increased Polearm Physical Damage",
  [
    { statId: "increased-polearm-physical-damage", label: "increased Polearm Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Polearm Physical Damage" },
  ],
);
// Game node: penetratingSpears3; progression: skillTreeSpearArmorReduction
setFullTreeNodeDetails(
  "outer-open-split-29-right-2",
  "Spear Armor Reduction",
  "10% to Polearm Target Armor Reduction",
  [
    { statId: "to-polearm-target-armor-reduction", label: "to Polearm Target Armor Reduction", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% to Polearm Target Armor Reduction" },
  ],
);
// Game node: polearmDamage6; progression: skillTreeSpearDamage
setFullTreeNodeDetails(
  "outer-open-split-29-right-3",
  "Spear Damage",
  "5% increased Polearm Physical Damage",
  [
    { statId: "increased-polearm-physical-damage", label: "increased Polearm Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Polearm Physical Damage" },
  ],
);
// Game node: sniperRifleDamage3; progression: skillTreeSniperDamage
setFullTreeNodeDetails(
  "outer-open-split-29-left-1",
  "Sniper Damage",
  "5% increased Sniper Rifle Physical Damage",
  [
    { statId: "increased-sniper-rifle-physical-damage", label: "increased Sniper Rifle Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sniper Rifle Physical Damage" },
  ],
);
// Game node: sniperRifleHandling3; progression: skillTreeSniperHandling
setFullTreeNodeDetails(
  "outer-open-split-29-left-2",
  "Sniper Handling",
  "5% improved Sniper Rifle Aim and Reload Speed",
  [
    { statId: "improved-sniper-rifle-aim-and-reload-speed", label: "improved Sniper Rifle Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Sniper Rifle Aim and Reload Speed" },
  ],
);
// Game node: sniperRifleDeadEye3; progression: skillTreeSniperDeadEye
setFullTreeNodeDetails(
  "outer-open-split-29-left-3",
  "Sniper Dead Eye",
  "10% decreased stamina consumption while aiming with Sniper Rifles\nSuccessive kills can trigger up to 20% more kill streak bonus damage",
  [
    { statId: "decreased-stamina-consumption-while-aiming-with-sniper-rifles", label: "decreased stamina consumption while aiming with Sniper Rifles", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased stamina consumption while aiming with Sniper Rifles" },
    { statId: "successive-kills-can-trigger-up-to-more-kill-streak-bonus-damage", label: "Successive kills can trigger up to more kill streak bonus damage", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "Successive kills can trigger up to 20% more kill streak bonus damage" },
  ],
);
// Game node: firearmArmorReduction5; progression: skillTreeRangedArmorReduction
setFullTreeNodeDetails(
  "outer-half-28-1",
  "Ranged Armor Reduction",
  "7.5% to Ranged Weapon Target Armor Reduction",
  [
    { statId: "to-ranged-weapon-target-armor-reduction", label: "to Ranged Weapon Target Armor Reduction", valuePerRank: 7.5, unit: "percent", sortOrder: 1, displayText: "7.5% to Ranged Weapon Target Armor Reduction" },
  ],
);
// Game node: firearmPerception3; progression: Perception
setFullTreeNodeDetails(
  "outer-half-28-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: firearmArmorReduction6; progression: skillTreeRangedArmorReduction
setFullTreeNodeDetails(
  "outer-half-28-3",
  "Ranged Armor Reduction",
  "7.5% to Ranged Weapon Target Armor Reduction",
  [
    { statId: "to-ranged-weapon-target-armor-reduction", label: "to Ranged Weapon Target Armor Reduction", valuePerRank: 7.5, unit: "percent", sortOrder: 1, displayText: "7.5% to Ranged Weapon Target Armor Reduction" },
  ],
);
// Game node: rootDexterity; progression: skillTreeDexterityClass
setFullTreeNodeDetails(
  "dexterity-root",
  "Recon",
  "R E C O N\n20 increased Maximum Stamina\n5% increased Physical Damage with Blade Weapons, Pistols and Submachine Guns\n10% increased Ranged Weapon Hip Fire Accuracy\n10% increased Crouch Speed and Stealth effectiveness in low light\n10% decreased action noise level and Alerted Target search duration",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "20 increased Maximum Stamina" },
    { statId: "increased-physical-damage-with-blade-weapons-pistols-and-submachine-guns", label: "increased Physical Damage with Blade Weapons, Pistols and Submachine Guns", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased Physical Damage with Blade Weapons, Pistols and Submachine Guns" },
    { statId: "increased-ranged-weapon-hip-fire-accuracy", label: "increased Ranged Weapon Hip Fire Accuracy", valuePerRank: 10, unit: "percent", sortOrder: 3, displayText: "10% increased Ranged Weapon Hip Fire Accuracy" },
    { statId: "increased-crouch-speed-and-stealth-effectiveness-in-low-light", label: "increased Crouch Speed and Stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased Crouch Speed and Stealth effectiveness in low light" },
    { statId: "decreased-action-noise-level-and-alerted-target-search-duration", label: "decreased action noise level and Alerted Target search duration", valuePerRank: 10, unit: "percent", sortOrder: 5, displayText: "10% decreased action noise level and Alerted Target search duration" },
  ],
);
// Game node: baseDexterity; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-shared-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: baseStamina; progression: skillTreeMaxStaminaBase
setFullTreeNodeDetails(
  "dexterity-module-2-entry",
  "Max Stamina Base",
  "+10 increased Maximum Stamina",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 increased Maximum Stamina" },
  ],
);
// Game node: baseFirearmHandling; progression: skillTreeFirearmHandlingBase
setFullTreeNodeDetails(
  "dexterity-module-1-entry",
  "Firearm Handling Base",
  "10% increased Firearm Fire Rate and Handling",
  [
    { statId: "increased-firearm-fire-rate-and-handling", label: "increased Firearm Fire Rate and Handling", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Firearm Fire Rate and Handling" },
  ],
);
// Game node: baseMeleeSpeed; progression: skillTreeMeleeSpeedBase
setFullTreeNodeDetails(
  "dexterity-module-3-entry",
  "Melee Speed Base",
  "10% increased Melee Attack Speed\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
  [
    { statId: "increased-melee-attack-speed", label: "increased Melee Attack Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Melee Attack Speed" },
    { statId: "recover-stamina-per-enemy-killed-using-melee-weapons", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
  ],
);
// Game node: pistolDamage1; progression: skillTreePistolDamage
setFullTreeNodeDetails(
  "dexterity-module-1-right-1",
  "Pistol Damage",
  "5% increased Pistol Physical Damage",
  [
    { statId: "increased-pistol-physical-damage", label: "increased Pistol Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Pistol Physical Damage" },
  ],
);
// Game node: pistolHandling1; progression: skillTreePistolHandling
setFullTreeNodeDetails(
  "dexterity-module-1-right-2",
  "Pistol Handling",
  "10% improved Pistol Fire Rate and Reload Speed",
  [
    { statId: "improved-pistol-fire-rate-and-reload-speed", label: "improved Pistol Fire Rate and Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Pistol Fire Rate and Reload Speed" },
  ],
);
// Game node: pistolTrippleTap1; progression: skillTreePistolTrippleTap
setFullTreeNodeDetails(
  "dexterity-module-1-right-3",
  "Pistol Tripple Tap",
  "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage",
  [
    { statId: "successive-hits-with-pistols-in-a-short-time-cause-the-last-shot-to-deal-additional-33-physical-damage", label: "successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage", valuePerRank: 3, unit: "flat", sortOrder: 1, displayText: "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage" },
  ],
);
// Game node: firearmRunAndGun1; progression: skillTreeFirearmRunAndGun
setFullTreeNodeDetails(
  "dexterity-module-1-left-3",
  "Firearm Run And Gun",
  "10% increased Hip Fire Accuracy\n33% reduced movement penalty when reloading",
  [
    { statId: "increased-hip-fire-accuracy", label: "increased Hip Fire Accuracy", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Hip Fire Accuracy" },
    { statId: "reduced-movement-penalty-when-reloading", label: "reduced movement penalty when reloading", valuePerRank: 33, unit: "percent", sortOrder: 2, displayText: "33% reduced movement penalty when reloading" },
  ],
);
// Game node: firearmDexterity1; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-1-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: firearmRunAndGun2; progression: skillTreeFirearmRunAndGun
setFullTreeNodeDetails(
  "dexterity-module-1-left-1",
  "Firearm Run And Gun",
  "10% increased Hip Fire Accuracy\n33% reduced movement penalty when reloading",
  [
    { statId: "increased-hip-fire-accuracy", label: "increased Hip Fire Accuracy", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Hip Fire Accuracy" },
    { statId: "reduced-movement-penalty-when-reloading", label: "reduced movement penalty when reloading", valuePerRank: 33, unit: "percent", sortOrder: 2, displayText: "33% reduced movement penalty when reloading" },
  ],
);
// Game node: stealth1; progression: skillTreeStealth
setFullTreeNodeDetails(
  "dexterity-module-2-left-3",
  "Stealth",
  "While Crouching:\n8.5% increased Crouch speed\n8.5% decreased action noise level\n10% increased stealth effectiveness in low light\n11.5% decreased Alerted Target search duration",
  [
    { statId: "display-only-skilltreestealth-0", label: "While Crouching:", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "While Crouching:", includeInTotals: false },
    { statId: "increased-crouch-speed", label: "increased Crouch speed", valuePerRank: 8.5, unit: "percent", sortOrder: 2, displayText: "8.5% increased Crouch speed" },
    { statId: "decreased-action-noise-level", label: "decreased action noise level", valuePerRank: 8.5, unit: "percent", sortOrder: 3, displayText: "8.5% decreased action noise level" },
    { statId: "increased-stealth-effectiveness-in-low-light", label: "increased stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased stealth effectiveness in low light" },
    { statId: "decreased-alerted-target-search-duration", label: "decreased Alerted Target search duration", valuePerRank: 11.5, unit: "percent", sortOrder: 5, displayText: "11.5% decreased Alerted Target search duration" },
  ],
);
// Game node: stealthPerception1; progression: Perception
setFullTreeNodeDetails(
  "dexterity-module-2-left-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: stealth2; progression: skillTreeStealth
setFullTreeNodeDetails(
  "dexterity-module-2-left-1",
  "Stealth",
  "While Crouching:\n8.5% increased Crouch speed\n8.5% decreased action noise level\n10% increased stealth effectiveness in low light\n11.5% decreased Alerted Target search duration",
  [
    { statId: "display-only-skilltreestealth-0", label: "While Crouching:", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "While Crouching:", includeInTotals: false },
    { statId: "increased-crouch-speed", label: "increased Crouch speed", valuePerRank: 8.5, unit: "percent", sortOrder: 2, displayText: "8.5% increased Crouch speed" },
    { statId: "decreased-action-noise-level", label: "decreased action noise level", valuePerRank: 8.5, unit: "percent", sortOrder: 3, displayText: "8.5% decreased action noise level" },
    { statId: "increased-stealth-effectiveness-in-low-light", label: "increased stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased stealth effectiveness in low light" },
    { statId: "decreased-alerted-target-search-duration", label: "decreased Alerted Target search duration", valuePerRank: 11.5, unit: "percent", sortOrder: 5, displayText: "11.5% decreased Alerted Target search duration" },
  ],
);
// Game node: cardio1; progression: skillTreeMaxStaminaCardio
setFullTreeNodeDetails(
  "dexterity-module-2-right-3",
  "Max Stamina Cardio",
  "5 increased Maximum Stamina\n5% increased stamina regeneration speed when sprinting",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "5 increased Maximum Stamina" },
    { statId: "increased-stamina-regeneration-speed-when-sprinting", label: "increased stamina regeneration speed when sprinting", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased stamina regeneration speed when sprinting" },
  ],
);
// Game node: cardioDexterity1; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-2-right-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: cardio2; progression: skillTreeMaxStaminaCardio
setFullTreeNodeDetails(
  "dexterity-module-2-right-1",
  "Max Stamina Cardio",
  "5 increased Maximum Stamina\n5% increased stamina regeneration speed when sprinting",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "5 increased Maximum Stamina" },
    { statId: "increased-stamina-regeneration-speed-when-sprinting", label: "increased stamina regeneration speed when sprinting", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased stamina regeneration speed when sprinting" },
  ],
);
// Game node: bladeDamage1; progression: skillTreeBladeDamage
setFullTreeNodeDetails(
  "dexterity-module-3-left-3",
  "Blade Damage",
  "5% increased Blade Weapon Physical Damage",
  [
    { statId: "increased-blade-weapon-physical-damage", label: "increased Blade Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Blade Weapon Physical Damage" },
  ],
);
// Game node: bladeDexterity1; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-3-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: bladeDamage2; progression: skillTreeBladeDamage
setFullTreeNodeDetails(
  "dexterity-module-3-left-1",
  "Blade Damage",
  "5% increased Blade Weapon Physical Damage",
  [
    { statId: "increased-blade-weapon-physical-damage", label: "increased Blade Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Blade Weapon Physical Damage" },
  ],
);
// Game node: bladeBleed1; progression: skillTreeBladeDeepCuts
setFullTreeNodeDetails(
  "dexterity-module-3-right-3",
  "Blade Deep Cuts",
  "+1 Max Bleeding Wounds on Targets using Blade Weapons\n+15% chance to cause a Bleeding Wound on Glancing Blows\n+1 Additional Bleeding Wound with Power Attack\n5% reduced Target run speed with Bleeding Wounds",
  [
    { statId: "max-bleeding-wounds-on-targets-using-blade-weapons", label: "Max Bleeding Wounds on Targets using Blade Weapons", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 Max Bleeding Wounds on Targets using Blade Weapons" },
    { statId: "chance-to-cause-a-bleeding-wound-on-glancing-blows", label: "chance to cause a Bleeding Wound on Glancing Blows", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "+15% chance to cause a Bleeding Wound on Glancing Blows" },
    { statId: "additional-bleeding-wound-with-power-attack", label: "Additional Bleeding Wound with Power Attack", valuePerRank: 1, unit: "flat", sortOrder: 3, displayText: "+1 Additional Bleeding Wound with Power Attack" },
    { statId: "reduced-target-run-speed-with-bleeding-wounds", label: "reduced Target run speed with Bleeding Wounds", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% reduced Target run speed with Bleeding Wounds" },
  ],
);
// Game node: bladeDexterity2; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-3-right-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: bladeBleed2; progression: skillTreeBladeDeepCuts
setFullTreeNodeDetails(
  "dexterity-module-3-right-1",
  "Blade Deep Cuts",
  "+1 Max Bleeding Wounds on Targets using Blade Weapons\n+15% chance to cause a Bleeding Wound on Glancing Blows\n+1 Additional Bleeding Wound with Power Attack\n5% reduced Target run speed with Bleeding Wounds",
  [
    { statId: "max-bleeding-wounds-on-targets-using-blade-weapons", label: "Max Bleeding Wounds on Targets using Blade Weapons", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 Max Bleeding Wounds on Targets using Blade Weapons" },
    { statId: "chance-to-cause-a-bleeding-wound-on-glancing-blows", label: "chance to cause a Bleeding Wound on Glancing Blows", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "+15% chance to cause a Bleeding Wound on Glancing Blows" },
    { statId: "additional-bleeding-wound-with-power-attack", label: "Additional Bleeding Wound with Power Attack", valuePerRank: 1, unit: "flat", sortOrder: 3, displayText: "+1 Additional Bleeding Wound with Power Attack" },
    { statId: "reduced-target-run-speed-with-bleeding-wounds", label: "reduced Target run speed with Bleeding Wounds", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% reduced Target run speed with Bleeding Wounds" },
  ],
);
// Game node: dexterity_120_7; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-1-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_144_7; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-2-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_168_7; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-3-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_120_11; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-1-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_144_11; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-2-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_168_11; progression: Dexterity
setFullTreeNodeDetails(
  "dexterity-module-3-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: firearmRunAndGun3; progression: skillTreeFirearmRunAndGun
setFullTreeNodeDetails(
  "outer-ring-connector-4",
  "Firearm Run And Gun",
  "10% increased Hip Fire Accuracy\n33% reduced movement penalty when reloading",
  [
    { statId: "increased-hip-fire-accuracy", label: "increased Hip Fire Accuracy", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Hip Fire Accuracy" },
    { statId: "reduced-movement-penalty-when-reloading", label: "reduced movement penalty when reloading", valuePerRank: 33, unit: "percent", sortOrder: 2, displayText: "33% reduced movement penalty when reloading" },
  ],
);
// Game node: meleeStaminaUse1; progression: skillTreeMeleeStaminaUse
setFullTreeNodeDetails(
  "outer-ring-connector-6",
  "Melee Stamina Use",
  "10% less Stamina Used by Melee Attacks\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
  [
    { statId: "less-stamina-used-by-melee-attacks", label: "less Stamina Used by Melee Attacks", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% less Stamina Used by Melee Attacks" },
    { statId: "recover-stamina-per-enemy-killed-using-melee-weapons", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
  ],
);
// Game node: fortitude_180_11; progression: Fortitude
setFullTreeNodeDetails(
  "outer-ring-connector-8",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: perception_120_13; progression: Perception
setFullTreeNodeDetails(
  "outer-module-3-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: perception_108_13; progression: Perception
setFullTreeNodeDetails(
  "outer-module-2-bottom-junction",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: dexterity_132_13; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-4-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_144_13; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-5-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: intellect_168_13; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-7-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: armorLight4; progression: skillTreeArmorLight
setFullTreeNodeDetails(
  "outer-module-8-right-3",
  "Armor Light",
  "10% reduced Light Armor durability loss",
  [
    { statId: "reduced-light-armor-durability-loss", label: "reduced Light Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Light Armor durability loss" },
  ],
);
// Game node: armorLight5; progression: skillTreeArmorLight
setFullTreeNodeDetails(
  "outer-module-8-right-2",
  "Armor Light",
  "10% reduced Light Armor durability loss",
  [
    { statId: "reduced-light-armor-durability-loss", label: "reduced Light Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Light Armor durability loss" },
  ],
);
// Game node: armorLight6; progression: skillTreeArmorLight
setFullTreeNodeDetails(
  "outer-module-8-right-1",
  "Armor Light",
  "10% reduced Light Armor durability loss",
  [
    { statId: "reduced-light-armor-durability-loss", label: "reduced Light Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Light Armor durability loss" },
  ],
);
// Game node: sneakDamage1; progression: skillTreeSneakDamage
setFullTreeNodeDetails(
  "outer-module-8-left-3",
  "Sneak Damage",
  "50% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamage-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: sneakDexterity1; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-8-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: sneakDamage2; progression: skillTreeSneakDamage
setFullTreeNodeDetails(
  "outer-module-8-left-1",
  "Sneak Damage",
  "50% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamage-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: stealth3; progression: skillTreeStealth
setFullTreeNodeDetails(
  "outer-module-4-left-3",
  "Stealth",
  "While Crouching:\n8.5% increased Crouch speed\n8.5% decreased action noise level\n10% increased stealth effectiveness in low light\n11.5% decreased Alerted Target search duration",
  [
    { statId: "display-only-skilltreestealth-0", label: "While Crouching:", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "While Crouching:", includeInTotals: false },
    { statId: "increased-crouch-speed", label: "increased Crouch speed", valuePerRank: 8.5, unit: "percent", sortOrder: 2, displayText: "8.5% increased Crouch speed" },
    { statId: "decreased-action-noise-level", label: "decreased action noise level", valuePerRank: 8.5, unit: "percent", sortOrder: 3, displayText: "8.5% decreased action noise level" },
    { statId: "increased-stealth-effectiveness-in-low-light", label: "increased stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased stealth effectiveness in low light" },
    { statId: "decreased-alerted-target-search-duration", label: "decreased Alerted Target search duration", valuePerRank: 11.5, unit: "percent", sortOrder: 5, displayText: "11.5% decreased Alerted Target search duration" },
  ],
);
// Game node: stealthPerception2; progression: Perception
setFullTreeNodeDetails(
  "outer-module-4-left-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: stealth4; progression: skillTreeStealth
setFullTreeNodeDetails(
  "outer-module-4-left-1",
  "Stealth",
  "While Crouching:\n8.5% increased Crouch speed\n8.5% decreased action noise level\n10% increased stealth effectiveness in low light\n11.5% decreased Alerted Target search duration",
  [
    { statId: "display-only-skilltreestealth-0", label: "While Crouching:", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "While Crouching:", includeInTotals: false },
    { statId: "increased-crouch-speed", label: "increased Crouch speed", valuePerRank: 8.5, unit: "percent", sortOrder: 2, displayText: "8.5% increased Crouch speed" },
    { statId: "decreased-action-noise-level", label: "decreased action noise level", valuePerRank: 8.5, unit: "percent", sortOrder: 3, displayText: "8.5% decreased action noise level" },
    { statId: "increased-stealth-effectiveness-in-low-light", label: "increased stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased stealth effectiveness in low light" },
    { statId: "decreased-alerted-target-search-duration", label: "decreased Alerted Target search duration", valuePerRank: 11.5, unit: "percent", sortOrder: 5, displayText: "11.5% decreased Alerted Target search duration" },
  ],
);
// Game node: sneakDamage5; progression: skillTreeSneakDamage
setFullTreeNodeDetails(
  "outer-module-4-right-3",
  "Sneak Damage",
  "50% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamage-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: sneakDexterity2; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-4-right-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: sneakDamage6; progression: skillTreeSneakDamage
setFullTreeNodeDetails(
  "outer-module-4-right-1",
  "Sneak Damage",
  "50% increased Sneak Attack Physical Damage\n(Does not affect Great Swords, Great Axes or Sledgehammers)",
  [
    { statId: "increased-sneak-attack-physical-damage", label: "increased Sneak Attack Physical Damage", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Sneak Attack Physical Damage" },
    { statId: "display-only-skilltreesneakdamage-1", label: "(Does not affect Great Swords, Great Axes or Sledgehammers)", valuePerRank: 0, unit: "flat", sortOrder: 2, displayText: "(Does not affect Great Swords, Great Axes or Sledgehammers)", includeInTotals: false },
  ],
);
// Game node: meleeAttackSpeed1; progression: skillTreeMeleeAttackSpeed
setFullTreeNodeDetails(
  "outer-module-5-left-3",
  "Melee Attack Speed",
  "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords\nRecover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords",
  [
    { statId: "increased-attack-speed-using-clubs-batons-knuckles-knives-and-swords", label: "increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords" },
    { statId: "recover-stamina-per-enemy-killed-using-clubs-batons-knuckles-knives-or-swords", label: "Recover Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords" },
  ],
);
// Game node: meleeAttackSpeedDexterity; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-5-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: meleeAttackSpeed2; progression: skillTreeMeleeAttackSpeed
setFullTreeNodeDetails(
  "outer-module-5-left-1",
  "Melee Attack Speed",
  "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords\nRecover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords",
  [
    { statId: "increased-attack-speed-using-clubs-batons-knuckles-knives-and-swords", label: "increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords" },
    { statId: "recover-stamina-per-enemy-killed-using-clubs-batons-knuckles-knives-or-swords", label: "Recover Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords" },
  ],
);
// Game node: lockpick3; progression: skillTreeLockPicking
setFullTreeNodeDetails(
  "outer-module-5-right-1",
  "Lock Picking",
  "25 to Lockpicking\n20% increased Bobby Pin and Lockpick Durability",
  [
    { statId: "to-lockpicking", label: "to Lockpicking", valuePerRank: 25, unit: "flat", sortOrder: 1, displayText: "25 to Lockpicking" },
    { statId: "increased-bobby-pin-and-lockpick-durability", label: "increased Bobby Pin and Lockpick Durability", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Bobby Pin and Lockpick Durability" },
  ],
);
// Game node: lockpickPerception2; progression: Perception
setFullTreeNodeDetails(
  "outer-module-5-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: lockpick4; progression: skillTreeLockPicking
setFullTreeNodeDetails(
  "outer-module-5-right-3",
  "Lock Picking",
  "25 to Lockpicking\n20% increased Bobby Pin and Lockpick Durability",
  [
    { statId: "to-lockpicking", label: "to Lockpicking", valuePerRank: 25, unit: "flat", sortOrder: 1, displayText: "25 to Lockpicking" },
    { statId: "increased-bobby-pin-and-lockpick-durability", label: "increased Bobby Pin and Lockpick Durability", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Bobby Pin and Lockpick Durability" },
  ],
);
// Game node: cardio4; progression: skillTreeMaxStaminaCardio
setFullTreeNodeDetails(
  "outer-module-6-left-1",
  "Max Stamina Cardio",
  "5 increased Maximum Stamina\n5% increased stamina regeneration speed when sprinting",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "5 increased Maximum Stamina" },
    { statId: "increased-stamina-regeneration-speed-when-sprinting", label: "increased stamina regeneration speed when sprinting", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased stamina regeneration speed when sprinting" },
  ],
);
// Game node: cardioStrength; progression: Strength
setFullTreeNodeDetails(
  "outer-module-6-left-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: cardio3; progression: skillTreeMaxStaminaCardio
setFullTreeNodeDetails(
  "outer-module-6-left-3",
  "Max Stamina Cardio",
  "5 increased Maximum Stamina\n5% increased stamina regeneration speed when sprinting",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "5 increased Maximum Stamina" },
    { statId: "increased-stamina-regeneration-speed-when-sprinting", label: "increased stamina regeneration speed when sprinting", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased stamina regeneration speed when sprinting" },
  ],
);
// Game node: cardio5; progression: skillTreeMaxStaminaCardio
setFullTreeNodeDetails(
  "outer-module-6-right-3",
  "Max Stamina Cardio",
  "5 increased Maximum Stamina\n5% increased stamina regeneration speed when sprinting",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "5 increased Maximum Stamina" },
    { statId: "increased-stamina-regeneration-speed-when-sprinting", label: "increased stamina regeneration speed when sprinting", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased stamina regeneration speed when sprinting" },
  ],
);
// Game node: cardioFortitude; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-6-right-2",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: cardio6; progression: skillTreeMaxStaminaCardio
setFullTreeNodeDetails(
  "outer-module-6-right-1",
  "Max Stamina Cardio",
  "5 increased Maximum Stamina\n5% increased stamina regeneration speed when sprinting",
  [
    { statId: "maximum-stamina", label: "increased Maximum Stamina", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "5 increased Maximum Stamina" },
    { statId: "increased-stamina-regeneration-speed-when-sprinting", label: "increased stamina regeneration speed when sprinting", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased stamina regeneration speed when sprinting" },
  ],
);
// Game node: strength_180_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-8-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: armorLight1; progression: skillTreeArmorLight
setFullTreeNodeDetails(
  "outer-module-3-left-3",
  "Armor Light",
  "10% reduced Light Armor durability loss",
  [
    { statId: "reduced-light-armor-durability-loss", label: "reduced Light Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Light Armor durability loss" },
  ],
);
// Game node: armorLight2; progression: skillTreeArmorLight
setFullTreeNodeDetails(
  "outer-module-3-left-2",
  "Armor Light",
  "10% reduced Light Armor durability loss",
  [
    { statId: "reduced-light-armor-durability-loss", label: "reduced Light Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Light Armor durability loss" },
  ],
);
// Game node: armorLight3; progression: skillTreeArmorLight
setFullTreeNodeDetails(
  "outer-module-3-left-1",
  "Armor Light",
  "10% reduced Light Armor durability loss",
  [
    { statId: "reduced-light-armor-durability-loss", label: "reduced Light Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Light Armor durability loss" },
  ],
);
// Game node: pistolDamage2; progression: skillTreePistolDamage
setFullTreeNodeDetails(
  "outer-module-3-right-1",
  "Pistol Damage",
  "5% increased Pistol Physical Damage",
  [
    { statId: "increased-pistol-physical-damage", label: "increased Pistol Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Pistol Physical Damage" },
  ],
);
// Game node: pistolHandling2; progression: skillTreePistolHandling
setFullTreeNodeDetails(
  "outer-module-3-right-2",
  "Pistol Handling",
  "10% improved Pistol Fire Rate and Reload Speed",
  [
    { statId: "improved-pistol-fire-rate-and-reload-speed", label: "improved Pistol Fire Rate and Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Pistol Fire Rate and Reload Speed" },
  ],
);
// Game node: pistolTrippleTap2; progression: skillTreePistolTrippleTap
setFullTreeNodeDetails(
  "outer-module-3-right-3",
  "Pistol Tripple Tap",
  "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage",
  [
    { statId: "successive-hits-with-pistols-in-a-short-time-cause-the-last-shot-to-deal-additional-33-physical-damage", label: "successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage", valuePerRank: 3, unit: "flat", sortOrder: 1, displayText: "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage" },
  ],
);
// Game node: bladeDamage3; progression: skillTreeBladeDamage
setFullTreeNodeDetails(
  "outer-module-7-left-3",
  "Blade Damage",
  "5% increased Blade Weapon Physical Damage",
  [
    { statId: "increased-blade-weapon-physical-damage", label: "increased Blade Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Blade Weapon Physical Damage" },
  ],
);
// Game node: bladeDexterity3; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-7-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: bladeDamage4; progression: skillTreeBladeDamage
setFullTreeNodeDetails(
  "outer-module-7-left-1",
  "Blade Damage",
  "5% increased Blade Weapon Physical Damage",
  [
    { statId: "increased-blade-weapon-physical-damage", label: "increased Blade Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Blade Weapon Physical Damage" },
  ],
);
// Game node: bladeBleed3; progression: skillTreeBladeDeepCuts
setFullTreeNodeDetails(
  "outer-module-7-right-3",
  "Blade Deep Cuts",
  "+1 Max Bleeding Wounds on Targets using Blade Weapons\n+15% chance to cause a Bleeding Wound on Glancing Blows\n+1 Additional Bleeding Wound with Power Attack\n5% reduced Target run speed with Bleeding Wounds",
  [
    { statId: "max-bleeding-wounds-on-targets-using-blade-weapons", label: "Max Bleeding Wounds on Targets using Blade Weapons", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 Max Bleeding Wounds on Targets using Blade Weapons" },
    { statId: "chance-to-cause-a-bleeding-wound-on-glancing-blows", label: "chance to cause a Bleeding Wound on Glancing Blows", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "+15% chance to cause a Bleeding Wound on Glancing Blows" },
    { statId: "additional-bleeding-wound-with-power-attack", label: "Additional Bleeding Wound with Power Attack", valuePerRank: 1, unit: "flat", sortOrder: 3, displayText: "+1 Additional Bleeding Wound with Power Attack" },
    { statId: "reduced-target-run-speed-with-bleeding-wounds", label: "reduced Target run speed with Bleeding Wounds", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% reduced Target run speed with Bleeding Wounds" },
  ],
);
// Game node: bladeDexterity4; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-7-right-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: bladeBleed4; progression: skillTreeBladeDeepCuts
setFullTreeNodeDetails(
  "outer-module-7-right-1",
  "Blade Deep Cuts",
  "+1 Max Bleeding Wounds on Targets using Blade Weapons\n+15% chance to cause a Bleeding Wound on Glancing Blows\n+1 Additional Bleeding Wound with Power Attack\n5% reduced Target run speed with Bleeding Wounds",
  [
    { statId: "max-bleeding-wounds-on-targets-using-blade-weapons", label: "Max Bleeding Wounds on Targets using Blade Weapons", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 Max Bleeding Wounds on Targets using Blade Weapons" },
    { statId: "chance-to-cause-a-bleeding-wound-on-glancing-blows", label: "chance to cause a Bleeding Wound on Glancing Blows", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "+15% chance to cause a Bleeding Wound on Glancing Blows" },
    { statId: "additional-bleeding-wound-with-power-attack", label: "Additional Bleeding Wound with Power Attack", valuePerRank: 1, unit: "flat", sortOrder: 3, displayText: "+1 Additional Bleeding Wound with Power Attack" },
    { statId: "reduced-target-run-speed-with-bleeding-wounds", label: "reduced Target run speed with Bleeding Wounds", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% reduced Target run speed with Bleeding Wounds" },
  ],
);
// Game node: dexterity_156_13; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-6-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_120_17; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-3-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_144_17; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-5-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_132_17; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-4-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_156_17; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-6-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_168_17; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-7-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: dexterity_120_19; progression: Dexterity
setFullTreeNodeDetails(
  "final-ring-node-3",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: perception_132_19; progression: Perception
setFullTreeNodeDetails(
  "final-ring-node-4",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: dexterity_144_19; progression: Dexterity
setFullTreeNodeDetails(
  "final-ring-node-5",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: intellect_156_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-6",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: dexterity_168_19; progression: Dexterity
setFullTreeNodeDetails(
  "final-ring-node-7",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: fortitude_180_17; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-8-top-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: intellect_180_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-8",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: meleeAttackSpeed3; progression: skillTreeMeleeAttackSpeed
setFullTreeNodeDetails(
  "outer-single-node-3",
  "Melee Attack Speed",
  "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords\nRecover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords",
  [
    { statId: "increased-attack-speed-using-clubs-batons-knuckles-knives-and-swords", label: "increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Attack Speed using Clubs, Batons, Knuckles, Knives and Swords" },
    { statId: "recover-stamina-per-enemy-killed-using-clubs-batons-knuckles-knives-or-swords", label: "Recover Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Clubs, Batons, Knuckles, Knives or Swords" },
  ],
);
// Game node: bladeBleed5; progression: skillTreeBladeDeepCuts
setFullTreeNodeDetails(
  "outer-asymmetric-4-long-1",
  "Blade Deep Cuts",
  "+1 Max Bleeding Wounds on Targets using Blade Weapons\n+15% chance to cause a Bleeding Wound on Glancing Blows\n+1 Additional Bleeding Wound with Power Attack\n5% reduced Target run speed with Bleeding Wounds",
  [
    { statId: "max-bleeding-wounds-on-targets-using-blade-weapons", label: "Max Bleeding Wounds on Targets using Blade Weapons", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 Max Bleeding Wounds on Targets using Blade Weapons" },
    { statId: "chance-to-cause-a-bleeding-wound-on-glancing-blows", label: "chance to cause a Bleeding Wound on Glancing Blows", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "+15% chance to cause a Bleeding Wound on Glancing Blows" },
    { statId: "additional-bleeding-wound-with-power-attack", label: "Additional Bleeding Wound with Power Attack", valuePerRank: 1, unit: "flat", sortOrder: 3, displayText: "+1 Additional Bleeding Wound with Power Attack" },
    { statId: "reduced-target-run-speed-with-bleeding-wounds", label: "reduced Target run speed with Bleeding Wounds", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% reduced Target run speed with Bleeding Wounds" },
  ],
);
// Game node: bladeDamage5; progression: skillTreeBladeDamage
setFullTreeNodeDetails(
  "outer-asymmetric-4-long-2",
  "Blade Damage",
  "5% increased Blade Weapon Physical Damage",
  [
    { statId: "increased-blade-weapon-physical-damage", label: "increased Blade Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Blade Weapon Physical Damage" },
  ],
);
// Game node: bladeBleed6; progression: skillTreeBladeDeepCuts
setFullTreeNodeDetails(
  "outer-asymmetric-4-long-3",
  "Blade Deep Cuts",
  "+1 Max Bleeding Wounds on Targets using Blade Weapons\n+15% chance to cause a Bleeding Wound on Glancing Blows\n+1 Additional Bleeding Wound with Power Attack\n5% reduced Target run speed with Bleeding Wounds",
  [
    { statId: "max-bleeding-wounds-on-targets-using-blade-weapons", label: "Max Bleeding Wounds on Targets using Blade Weapons", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 Max Bleeding Wounds on Targets using Blade Weapons" },
    { statId: "chance-to-cause-a-bleeding-wound-on-glancing-blows", label: "chance to cause a Bleeding Wound on Glancing Blows", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "+15% chance to cause a Bleeding Wound on Glancing Blows" },
    { statId: "additional-bleeding-wound-with-power-attack", label: "Additional Bleeding Wound with Power Attack", valuePerRank: 1, unit: "flat", sortOrder: 3, displayText: "+1 Additional Bleeding Wound with Power Attack" },
    { statId: "reduced-target-run-speed-with-bleeding-wounds", label: "reduced Target run speed with Bleeding Wounds", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% reduced Target run speed with Bleeding Wounds" },
  ],
);
// Game node: bladeDamage6; progression: skillTreeBladeDamage
setFullTreeNodeDetails(
  "outer-asymmetric-4-long-4",
  "Blade Damage",
  "5% increased Blade Weapon Physical Damage",
  [
    { statId: "increased-blade-weapon-physical-damage", label: "increased Blade Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Blade Weapon Physical Damage" },
  ],
);
// Game node: stealth5; progression: skillTreeStealth
setFullTreeNodeDetails(
  "outer-asymmetric-4-short-1",
  "Stealth",
  "While Crouching:\n8.5% increased Crouch speed\n8.5% decreased action noise level\n10% increased stealth effectiveness in low light\n11.5% decreased Alerted Target search duration",
  [
    { statId: "display-only-skilltreestealth-0", label: "While Crouching:", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "While Crouching:", includeInTotals: false },
    { statId: "increased-crouch-speed", label: "increased Crouch speed", valuePerRank: 8.5, unit: "percent", sortOrder: 2, displayText: "8.5% increased Crouch speed" },
    { statId: "decreased-action-noise-level", label: "decreased action noise level", valuePerRank: 8.5, unit: "percent", sortOrder: 3, displayText: "8.5% decreased action noise level" },
    { statId: "increased-stealth-effectiveness-in-low-light", label: "increased stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased stealth effectiveness in low light" },
    { statId: "decreased-alerted-target-search-duration", label: "decreased Alerted Target search duration", valuePerRank: 11.5, unit: "percent", sortOrder: 5, displayText: "11.5% decreased Alerted Target search duration" },
  ],
);
// Game node: stealth6; progression: skillTreeStealth
setFullTreeNodeDetails(
  "outer-asymmetric-4-short-2",
  "Stealth",
  "While Crouching:\n8.5% increased Crouch speed\n8.5% decreased action noise level\n10% increased stealth effectiveness in low light\n11.5% decreased Alerted Target search duration",
  [
    { statId: "display-only-skilltreestealth-0", label: "While Crouching:", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "While Crouching:", includeInTotals: false },
    { statId: "increased-crouch-speed", label: "increased Crouch speed", valuePerRank: 8.5, unit: "percent", sortOrder: 2, displayText: "8.5% increased Crouch speed" },
    { statId: "decreased-action-noise-level", label: "decreased action noise level", valuePerRank: 8.5, unit: "percent", sortOrder: 3, displayText: "8.5% decreased action noise level" },
    { statId: "increased-stealth-effectiveness-in-low-light", label: "increased stealth effectiveness in low light", valuePerRank: 10, unit: "percent", sortOrder: 4, displayText: "10% increased stealth effectiveness in low light" },
    { statId: "decreased-alerted-target-search-duration", label: "decreased Alerted Target search duration", valuePerRank: 11.5, unit: "percent", sortOrder: 5, displayText: "11.5% decreased Alerted Target search duration" },
  ],
);
// Game node: pistolDamage3; progression: skillTreePistolDamage
setFullTreeNodeDetails(
  "outer-open-split-6-right-3",
  "Pistol Damage",
  "5% increased Pistol Physical Damage",
  [
    { statId: "increased-pistol-physical-damage", label: "increased Pistol Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Pistol Physical Damage" },
  ],
);
// Game node: pistolHandling3; progression: skillTreePistolHandling
setFullTreeNodeDetails(
  "outer-open-split-6-right-2",
  "Pistol Handling",
  "10% improved Pistol Fire Rate and Reload Speed",
  [
    { statId: "improved-pistol-fire-rate-and-reload-speed", label: "improved Pistol Fire Rate and Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Pistol Fire Rate and Reload Speed" },
  ],
);
// Game node: pistolTrippleTap3; progression: skillTreePistolTrippleTap
setFullTreeNodeDetails(
  "outer-open-split-6-right-1",
  "Pistol Tripple Tap",
  "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage",
  [
    { statId: "successive-hits-with-pistols-in-a-short-time-cause-the-last-shot-to-deal-additional-33-physical-damage", label: "successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage", valuePerRank: 3, unit: "flat", sortOrder: 1, displayText: "3 successive hits with Pistols in a short time cause the last shot to deal additional +33% Physical Damage" },
  ],
);
// Game node: pistolDamage4; progression: skillTreePistolDamage
setFullTreeNodeDetails(
  "outer-open-split-6-left-3",
  "Pistol Damage",
  "5% increased Pistol Physical Damage",
  [
    { statId: "increased-pistol-physical-damage", label: "increased Pistol Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Pistol Physical Damage" },
  ],
);
// Game node: pistolDamage5; progression: skillTreePistolDamage
setFullTreeNodeDetails(
  "outer-open-split-6-left-2",
  "Pistol Damage",
  "5% increased Pistol Physical Damage",
  [
    { statId: "increased-pistol-physical-damage", label: "increased Pistol Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Pistol Physical Damage" },
  ],
);
// Game node: pistolDamage6; progression: skillTreePistolDamage
setFullTreeNodeDetails(
  "outer-open-split-6-left-1",
  "Pistol Damage",
  "5% increased Pistol Physical Damage",
  [
    { statId: "increased-pistol-physical-damage", label: "increased Pistol Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Pistol Physical Damage" },
  ],
);
// Game node: doubleJump; progression: skillTreeDoubleJump
setFullTreeNodeDetails(
  "outer-half-5-1",
  "Double Jump",
  "10% decreased Jumping Stamina use\n+1m distance increased for safe fall\nEnables Double Jump",
  [
    { statId: "decreased-jumping-stamina-use", label: "decreased Jumping Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased Jumping Stamina use" },
    { statId: "m-distance-increased-for-safe-fall", label: "m distance increased for safe fall", valuePerRank: 1, unit: "flat", sortOrder: 2, displayText: "+1m distance increased for safe fall" },
    { statId: "display-only-skilltreedoublejump-2", label: "Enables Double Jump", valuePerRank: 0, unit: "flat", sortOrder: 3, displayText: "Enables Double Jump", includeInTotals: false },
  ],
);
// Game node: betterJump1; progression: skillTreeDoubleJump2
setFullTreeNodeDetails(
  "outer-half-5-2",
  "Double Jump2",
  "10% decreased Jumping Stamina use\n10% decreased Double Jump Stamina use\n33% increased Double Jump Height\n+1 m increased safe fall distance",
  [
    { statId: "decreased-jumping-stamina-use", label: "decreased Jumping Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased Jumping Stamina use" },
    { statId: "decreased-double-jump-stamina-use", label: "decreased Double Jump Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% decreased Double Jump Stamina use" },
    { statId: "increased-double-jump-height", label: "increased Double Jump Height", valuePerRank: 33, unit: "percent", sortOrder: 3, displayText: "33% increased Double Jump Height" },
    { statId: "m-increased-safe-fall-distance", label: "m increased safe fall distance", valuePerRank: 1, unit: "flat", sortOrder: 4, displayText: "+1 m increased safe fall distance" },
  ],
);
// Game node: parkourDexterity; progression: Dexterity
setFullTreeNodeDetails(
  "outer-half-5-3",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: betterJump2; progression: skillTreeDoubleJump3
setFullTreeNodeDetails(
  "outer-half-5-4",
  "Double Jump3",
  "10% decreased Jumping Stamina use\n10% decreased Double Jump Stamina use\n33% increased Double Jump Height\n+1 m increased safe fall distance\nNever get a broken leg from falling",
  [
    { statId: "decreased-jumping-stamina-use", label: "decreased Jumping Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased Jumping Stamina use" },
    { statId: "decreased-double-jump-stamina-use", label: "decreased Double Jump Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% decreased Double Jump Stamina use" },
    { statId: "increased-double-jump-height", label: "increased Double Jump Height", valuePerRank: 33, unit: "percent", sortOrder: 3, displayText: "33% increased Double Jump Height" },
    { statId: "m-increased-safe-fall-distance", label: "m increased safe fall distance", valuePerRank: 1, unit: "flat", sortOrder: 4, displayText: "+1 m increased safe fall distance" },
    { statId: "display-only-skilltreedoublejump3-4", label: "Never get a broken leg from falling", valuePerRank: 0, unit: "flat", sortOrder: 5, displayText: "Never get a broken leg from falling", includeInTotals: false },
  ],
);
// Game node: betterJump3; progression: skillTreeDoubleJump4
setFullTreeNodeDetails(
  "outer-half-5-5",
  "Double Jump4",
  "10% decreased Jumping Stamina use\n10% decreased Double Jump Stamina use\n33% increased Double Jump Height\n+2 m increased safe fall distance\nNever get a sprained or broken leg from falling",
  [
    { statId: "decreased-jumping-stamina-use", label: "decreased Jumping Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased Jumping Stamina use" },
    { statId: "decreased-double-jump-stamina-use", label: "decreased Double Jump Stamina use", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% decreased Double Jump Stamina use" },
    { statId: "increased-double-jump-height", label: "increased Double Jump Height", valuePerRank: 33, unit: "percent", sortOrder: 3, displayText: "33% increased Double Jump Height" },
    { statId: "m-increased-safe-fall-distance", label: "m increased safe fall distance", valuePerRank: 2, unit: "flat", sortOrder: 4, displayText: "+2 m increased safe fall distance" },
    { statId: "display-only-skilltreedoublejump4-4", label: "Never get a sprained or broken leg from falling", valuePerRank: 0, unit: "flat", sortOrder: 5, displayText: "Never get a sprained or broken leg from falling", includeInTotals: false },
  ],
);
// Game node: rootIntellect; progression: skillTreeIntellectClass
setFullTreeNodeDetails(
  "intellect-root",
  "Specialist",
  "S P E C I A L I S T\n5% increased Submachine Gun, Baton Weapon and Salvage Tool Physical Damage\n10% increased Portable Turret Physical Damage\n5% increased Action Skill Experience gain\n5% better prices when Buying or Selling from Traders\n5% more Dukes for completing Missions\n25% increased Bobby Pin and Lockpick Durability",
  [
    { statId: "increased-submachine-gun-baton-weapon-and-salvage-tool-physical-damage", label: "increased Submachine Gun, Baton Weapon and Salvage Tool Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun, Baton Weapon and Salvage Tool Physical Damage" },
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Portable Turret Physical Damage" },
    { statId: "increased-action-skill-experience-gain", label: "increased Action Skill Experience gain", valuePerRank: 5, unit: "percent", sortOrder: 3, displayText: "5% increased Action Skill Experience gain" },
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% better prices when Buying or Selling from Traders" },
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 5, displayText: "5% more Dukes for completing Missions" },
    { statId: "increased-bobby-pin-and-lockpick-durability", label: "increased Bobby Pin and Lockpick Durability", valuePerRank: 25, unit: "percent", sortOrder: 6, displayText: "25% increased Bobby Pin and Lockpick Durability" },
  ],
);
// Game node: baseIntellect; progression: Intellect
setFullTreeNodeDetails(
  "intellect-shared-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: baseFastLearner; progression: skillTreeFastLearner
setFullTreeNodeDetails(
  "intellect-module-3-entry",
  "Fast Learner",
  "5% increased Experience gain from kills",
  [
    { statId: "increased-experience-gain-from-kills", label: "increased Experience gain from kills", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Experience gain from kills" },
  ],
);
// Game node: baseLockPicking; progression: skillTreeLockPickingBase
setFullTreeNodeDetails(
  "intellect-module-1-entry",
  "Lock Picking Base",
  "25 to Lockpicking\n30% increased Bobby Pin and Lockpick Durability",
  [
    { statId: "to-lockpicking", label: "to Lockpicking", valuePerRank: 25, unit: "flat", sortOrder: 1, displayText: "25 to Lockpicking" },
    { statId: "increased-bobby-pin-and-lockpick-durability", label: "increased Bobby Pin and Lockpick Durability", valuePerRank: 30, unit: "percent", sortOrder: 2, displayText: "30% increased Bobby Pin and Lockpick Durability" },
  ],
);
// Game node: baseDiplomat; progression: skillTreeDiplomat
setFullTreeNodeDetails(
  "intellect-module-2-entry",
  "Diplomat",
  "5% better prices when Buying or Selling from Traders\n5% more Dukes for completing Missions",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% more Dukes for completing Missions" },
  ],
);
// Game node: salvcager1; progression: skillTreeSalvager
setFullTreeNodeDetails(
  "intellect-module-1-left-3",
  "Salvager",
  "10% increased Salvage Tool Physical Damage\n10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
  [
    { statId: "increased-salvage-tool-physical-damage", label: "increased Salvage Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Salvage Tool Physical Damage" },
    { statId: "increased-efficiency-of-retrieving-resources-while-harvesting-salvageable-objects-using-salvage-tools", label: "increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools" },
  ],
);
// Game node: salvcagerStrength1; progression: Strength
setFullTreeNodeDetails(
  "intellect-module-1-left-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: salvcager2; progression: skillTreeSalvager
setFullTreeNodeDetails(
  "intellect-module-1-left-1",
  "Salvager",
  "10% increased Salvage Tool Physical Damage\n10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
  [
    { statId: "increased-salvage-tool-physical-damage", label: "increased Salvage Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Salvage Tool Physical Damage" },
    { statId: "increased-efficiency-of-retrieving-resources-while-harvesting-salvageable-objects-using-salvage-tools", label: "increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools" },
  ],
);
// Game node: smgDamage1; progression: skillTreeSubmachineGunDamage
setFullTreeNodeDetails(
  "intellect-module-1-right-3",
  "Submachine Gun Damage",
  "5% increased Submachine Gun Physical Damage",
  [
    { statId: "increased-submachine-gun-physical-damage", label: "increased Submachine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun Physical Damage" },
  ],
);
// Game node: smgHandling1; progression: skillTreeSubmachineGunHandling
setFullTreeNodeDetails(
  "intellect-module-1-right-2",
  "Submachine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: smgDamage2; progression: skillTreeSubmachineGunDamage
setFullTreeNodeDetails(
  "intellect-module-1-right-1",
  "Submachine Gun Damage",
  "5% increased Submachine Gun Physical Damage",
  [
    { statId: "increased-submachine-gun-physical-damage", label: "increased Submachine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun Physical Damage" },
  ],
);
// Game node: charismaRegen; progression: skillTreeCharismaRegen
setFullTreeNodeDetails(
  "intellect-module-2-left-1",
  "Charisma Regen",
  "50% increased Health Regeneration for nearby Allies and Party Members",
  [
    { statId: "increased-health-regeneration-for-nearby-allies-and-party-members", label: "increased Health Regeneration for nearby Allies and Party Members", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% increased Health Regeneration for nearby Allies and Party Members" },
  ],
);
// Game node: charismaLoot1; progression: skillTreeCharismaLoot
setFullTreeNodeDetails(
  "intellect-module-2-left-2",
  "Charisma Loot",
  "10% increased Loot for nearby Allies and Party Members",
  [
    { statId: "increased-loot-for-nearby-allies-and-party-members", label: "increased Loot for nearby Allies and Party Members", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Loot for nearby Allies and Party Members" },
  ],
);
// Game node: charismaResistance; progression: skillTreeCharismaResistance
setFullTreeNodeDetails(
  "intellect-module-2-left-3",
  "Charisma Resistance",
  "10% increased Physical Resistance for nearby Allies and Party Members",
  [
    { statId: "increased-physical-resistance-for-nearby-allies-and-party-members", label: "increased Physical Resistance for nearby Allies and Party Members", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Physical Resistance for nearby Allies and Party Members" },
  ],
);
// Game node: traderStage1; progression: skillTreeTraderStage
setFullTreeNodeDetails(
  "intellect-module-2-right-1",
  "Trader Stage",
  "+10 trader level",
  [
    { statId: "trader-level", label: "trader level", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 trader level" },
  ],
);
// Game node: trading1; progression: skillTreeTrading
setFullTreeNodeDetails(
  "intellect-module-2-right-2",
  "Trading",
  "5% better prices when Buying or Selling from Traders",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
  ],
);
// Game node: questRewardDukes1; progression: skillTreeQuestRewardDukes
setFullTreeNodeDetails(
  "intellect-module-2-right-3",
  "Quest Reward Dukes",
  "5% more Dukes for completing Missions",
  [
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% more Dukes for completing Missions" },
  ],
);
// Game node: turretDamage1; progression: skillTreeTurretDamage
setFullTreeNodeDetails(
  "intellect-module-3-right-1",
  "Turret Damage",
  "10% increased Portable Turret Physical Damage",
  [
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Portable Turret Physical Damage" },
  ],
);
// Game node: turretHandling1; progression: skillTreeTurretHandling
setFullTreeNodeDetails(
  "intellect-module-3-right-2",
  "Turret Handling",
  "10% increased Ranged Portable Turret Fire Rate\n25% increased Melee Portable Turret Attack Speed",
  [
    { statId: "increased-ranged-portable-turret-fire-rate", label: "increased Ranged Portable Turret Fire Rate", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Fire Rate" },
    { statId: "increased-melee-portable-turret-attack-speed", label: "increased Melee Portable Turret Attack Speed", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased Melee Portable Turret Attack Speed" },
  ],
);
// Game node: turretRange1; progression: skillTreeTurretRange
setFullTreeNodeDetails(
  "intellect-module-3-right-3",
  "Turret Range",
  "Increased Portable Turret active Range by 4m",
  [
    { statId: "increased-portable-turret-active-range-by-m", label: "Increased Portable Turret active Range by m", valuePerRank: 4, unit: "flat", sortOrder: 1, displayText: "Increased Portable Turret active Range by 4m" },
  ],
);
// Game node: batonDamage1; progression: skillTreeBatonDamage
setFullTreeNodeDetails(
  "intellect-module-3-left-3",
  "Baton Damage",
  "10% increased Baton Physical Damage",
  [
    { statId: "increased-baton-physical-damage", label: "increased Baton Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Baton Physical Damage" },
  ],
);
// Game node: batonIntellect1; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-3-left-2",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: batonDamage2; progression: skillTreeBatonDamage
setFullTreeNodeDetails(
  "intellect-module-3-left-1",
  "Baton Damage",
  "10% increased Baton Physical Damage",
  [
    { statId: "increased-baton-physical-damage", label: "increased Baton Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Baton Physical Damage" },
  ],
);
// Game node: intellect_192_7; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-1-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_216_7; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-2-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_240_7; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-3-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_192_11; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-1-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_216_11; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-2-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_240_11; progression: Intellect
setFullTreeNodeDetails(
  "intellect-module-3-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: turretElectricalTrapXP1; progression: skillTreeElectricalTrapXP
setFullTreeNodeDetails(
  "outer-ring-connector-12",
  "Electrical Trap X P",
  "20% increased Experience Gained from Electrical Trap kills",
  [
    { statId: "increased-experience-gained-from-electrical-trap-kills", label: "increased Experience Gained from Electrical Trap kills", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Experience Gained from Electrical Trap kills" },
  ],
);
// Game node: supportPerception1; progression: Perception
setFullTreeNodeDetails(
  "outer-ring-connector-10",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: armorMedium1; progression: skillTreeArmorMedium
setFullTreeNodeDetails(
  "outer-module-14-left-3",
  "Armor Medium",
  "10% reduced Medium Armor durability loss\n10% reduced Medium Armor movement penalty\n12.5% reduced Medium Armor stamina penalty",
  [
    { statId: "reduced-medium-armor-durability-loss", label: "reduced Medium Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Medium Armor durability loss" },
    { statId: "reduced-medium-armor-movement-penalty", label: "reduced Medium Armor movement penalty", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced Medium Armor movement penalty" },
    { statId: "reduced-medium-armor-stamina-penalty", label: "reduced Medium Armor stamina penalty", valuePerRank: 12.5, unit: "percent", sortOrder: 3, displayText: "12.5% reduced Medium Armor stamina penalty" },
  ],
);
// Game node: armorMedium2; progression: skillTreeArmorMedium
setFullTreeNodeDetails(
  "outer-module-14-left-2",
  "Armor Medium",
  "10% reduced Medium Armor durability loss\n10% reduced Medium Armor movement penalty\n12.5% reduced Medium Armor stamina penalty",
  [
    { statId: "reduced-medium-armor-durability-loss", label: "reduced Medium Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Medium Armor durability loss" },
    { statId: "reduced-medium-armor-movement-penalty", label: "reduced Medium Armor movement penalty", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced Medium Armor movement penalty" },
    { statId: "reduced-medium-armor-stamina-penalty", label: "reduced Medium Armor stamina penalty", valuePerRank: 12.5, unit: "percent", sortOrder: 3, displayText: "12.5% reduced Medium Armor stamina penalty" },
  ],
);
// Game node: armorMedium3; progression: skillTreeArmorMedium
setFullTreeNodeDetails(
  "outer-module-14-left-1",
  "Armor Medium",
  "10% reduced Medium Armor durability loss\n10% reduced Medium Armor movement penalty\n12.5% reduced Medium Armor stamina penalty",
  [
    { statId: "reduced-medium-armor-durability-loss", label: "reduced Medium Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Medium Armor durability loss" },
    { statId: "reduced-medium-armor-movement-penalty", label: "reduced Medium Armor movement penalty", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced Medium Armor movement penalty" },
    { statId: "reduced-medium-armor-stamina-penalty", label: "reduced Medium Armor stamina penalty", valuePerRank: 12.5, unit: "percent", sortOrder: 3, displayText: "12.5% reduced Medium Armor stamina penalty" },
  ],
);
// Game node: batonStun1; progression: skillTreeBatonStun
setFullTreeNodeDetails(
  "outer-module-14-right-3",
  "Baton Stun",
  "20% increased Stun Duration of Stun Batons",
  [
    { statId: "increased-stun-duration-of-stun-batons", label: "increased Stun Duration of Stun Batons", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Stun Duration of Stun Batons" },
  ],
);
// Game node: batonIntellect2; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-14-right-2",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: batonStun2; progression: skillTreeBatonStun
setFullTreeNodeDetails(
  "outer-module-14-right-1",
  "Baton Stun",
  "20% increased Stun Duration of Stun Batons",
  [
    { statId: "increased-stun-duration-of-stun-batons", label: "increased Stun Duration of Stun Batons", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Stun Duration of Stun Batons" },
  ],
);
// Game node: turretDamage2; progression: skillTreeTurretDamage
setFullTreeNodeDetails(
  "outer-module-12-left-1",
  "Turret Damage",
  "10% increased Portable Turret Physical Damage",
  [
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Portable Turret Physical Damage" },
  ],
);
// Game node: turretHandling2; progression: skillTreeTurretHandling
setFullTreeNodeDetails(
  "outer-module-12-left-2",
  "Turret Handling",
  "10% increased Ranged Portable Turret Fire Rate\n25% increased Melee Portable Turret Attack Speed",
  [
    { statId: "increased-ranged-portable-turret-fire-rate", label: "increased Ranged Portable Turret Fire Rate", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Fire Rate" },
    { statId: "increased-melee-portable-turret-attack-speed", label: "increased Melee Portable Turret Attack Speed", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased Melee Portable Turret Attack Speed" },
  ],
);
// Game node: turretRange2; progression: skillTreeTurretRange
setFullTreeNodeDetails(
  "outer-module-12-left-3",
  "Turret Range",
  "Increased Portable Turret active Range by 4m",
  [
    { statId: "increased-portable-turret-active-range-by-m", label: "Increased Portable Turret active Range by m", valuePerRank: 4, unit: "flat", sortOrder: 1, displayText: "Increased Portable Turret active Range by 4m" },
  ],
);
// Game node: turretMagazine1; progression: skillTreeTurretMagazineSize
setFullTreeNodeDetails(
  "outer-module-12-right-3",
  "Turret Magazine Size",
  "Increased Ranged Portable Turret Magazine Size by 20 rounds",
  [
    { statId: "increased-ranged-portable-turret-magazine-size-by-rounds", label: "Increased Ranged Portable Turret Magazine Size by rounds", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "Increased Ranged Portable Turret Magazine Size by 20 rounds" },
  ],
);
// Game node: turretReload1; progression: skillTreeTurretReload
setFullTreeNodeDetails(
  "outer-module-12-right-2",
  "Turret Reload",
  "10% increased Ranged Portable Turret Reload Speed",
  [
    { statId: "increased-ranged-portable-turret-reload-speed", label: "increased Ranged Portable Turret Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Reload Speed" },
  ],
);
// Game node: turretMagazine2; progression: skillTreeTurretMagazineSize
setFullTreeNodeDetails(
  "outer-module-12-right-1",
  "Turret Magazine Size",
  "Increased Ranged Portable Turret Magazine Size by 20 rounds",
  [
    { statId: "increased-ranged-portable-turret-magazine-size-by-rounds", label: "Increased Ranged Portable Turret Magazine Size by rounds", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "Increased Ranged Portable Turret Magazine Size by 20 rounds" },
  ],
);
// Game node: batonDamage3; progression: skillTreeBatonDamage
setFullTreeNodeDetails(
  "outer-module-13-left-1",
  "Baton Damage",
  "10% increased Baton Physical Damage",
  [
    { statId: "increased-baton-physical-damage", label: "increased Baton Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Baton Physical Damage" },
  ],
);
// Game node: batonDexterity1; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-13-left-2",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: batonStun3; progression: skillTreeBatonStun
setFullTreeNodeDetails(
  "outer-module-13-left-3",
  "Baton Stun",
  "20% increased Stun Duration of Stun Batons",
  [
    { statId: "increased-stun-duration-of-stun-batons", label: "increased Stun Duration of Stun Batons", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Stun Duration of Stun Batons" },
  ],
);
// Game node: turretElectricalTrapXP2; progression: skillTreeElectricalTrapXP
setFullTreeNodeDetails(
  "outer-module-13-right-3",
  "Electrical Trap X P",
  "20% increased Experience Gained from Electrical Trap kills",
  [
    { statId: "increased-experience-gained-from-electrical-trap-kills", label: "increased Experience Gained from Electrical Trap kills", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Experience Gained from Electrical Trap kills" },
  ],
);
// Game node: turretIntellect1; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-13-right-2",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: turretElectricalTrapXP3; progression: skillTreeElectricalTrapXP
setFullTreeNodeDetails(
  "outer-module-13-right-1",
  "Electrical Trap X P",
  "20% increased Experience Gained from Electrical Trap kills",
  [
    { statId: "increased-experience-gained-from-electrical-trap-kills", label: "increased Experience Gained from Electrical Trap kills", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Experience Gained from Electrical Trap kills" },
  ],
);
// Game node: charismaLoot2; progression: skillTreeCharismaLoot
setFullTreeNodeDetails(
  "outer-module-11-left-1",
  "Charisma Loot",
  "10% increased Loot for nearby Allies and Party Members",
  [
    { statId: "increased-loot-for-nearby-allies-and-party-members", label: "increased Loot for nearby Allies and Party Members", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Loot for nearby Allies and Party Members" },
  ],
);
// Game node: charismaDamage; progression: skillTreeCharismaDamage
setFullTreeNodeDetails(
  "outer-module-11-left-2",
  "Charisma Damage",
  "20% increased Damage for nearby Allies and Party Members",
  [
    { statId: "increased-damage-for-nearby-allies-and-party-members", label: "increased Damage for nearby Allies and Party Members", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Damage for nearby Allies and Party Members" },
  ],
);
// Game node: charismaAttributes; progression: skillTreeCharismaAttributes
setFullTreeNodeDetails(
  "outer-module-11-left-3",
  "Charisma Attributes",
  "+5 to all Attributes for nearby Allies and Party Members",
  [
    { statId: "to-all-attributes-for-nearby-allies-and-party-members", label: "to all Attributes for nearby Allies and Party Members", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to all Attributes for nearby Allies and Party Members" },
  ],
);
// Game node: traderStage2; progression: skillTreeTraderStage
setFullTreeNodeDetails(
  "outer-module-11-right-1",
  "Trader Stage",
  "+10 trader level",
  [
    { statId: "trader-level", label: "trader level", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 trader level" },
  ],
);
// Game node: trading2; progression: skillTreeTrading
setFullTreeNodeDetails(
  "outer-module-11-right-2",
  "Trading",
  "5% better prices when Buying or Selling from Traders",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
  ],
);
// Game node: questRewardDukes2; progression: skillTreeQuestRewardDukes
setFullTreeNodeDetails(
  "outer-module-11-right-3",
  "Quest Reward Dukes",
  "5% more Dukes for completing Missions",
  [
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% more Dukes for completing Missions" },
  ],
);
// Game node: smgHandling2; progression: skillTreeSubmachineGunHandling
setFullTreeNodeDetails(
  "outer-module-9-right-3",
  "Submachine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: smgDamage3; progression: skillTreeSubmachineGunDamage
setFullTreeNodeDetails(
  "outer-module-9-right-2",
  "Submachine Gun Damage",
  "5% increased Submachine Gun Physical Damage",
  [
    { statId: "increased-submachine-gun-physical-damage", label: "increased Submachine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun Physical Damage" },
  ],
);
// Game node: smgHandling3; progression: skillTreeSubmachineGunHandling
setFullTreeNodeDetails(
  "outer-module-9-right-1",
  "Submachine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: salvcager3; progression: skillTreeSalvager
setFullTreeNodeDetails(
  "outer-module-9-left-3",
  "Salvager",
  "10% increased Salvage Tool Physical Damage\n10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
  [
    { statId: "increased-salvage-tool-physical-damage", label: "increased Salvage Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Salvage Tool Physical Damage" },
    { statId: "increased-efficiency-of-retrieving-resources-while-harvesting-salvageable-objects-using-salvage-tools", label: "increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools" },
  ],
);
// Game node: salvcagerStrength2; progression: Strength
setFullTreeNodeDetails(
  "outer-module-9-left-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: salvcager4; progression: skillTreeSalvager
setFullTreeNodeDetails(
  "outer-module-9-left-1",
  "Salvager",
  "10% increased Salvage Tool Physical Damage\n10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
  [
    { statId: "increased-salvage-tool-physical-damage", label: "increased Salvage Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Salvage Tool Physical Damage" },
    { statId: "increased-efficiency-of-retrieving-resources-while-harvesting-salvageable-objects-using-salvage-tools", label: "increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools" },
  ],
);
// Game node: lockpick1; progression: skillTreeLockPicking
setFullTreeNodeDetails(
  "outer-module-10-right-3",
  "Lock Picking",
  "25 to Lockpicking\n20% increased Bobby Pin and Lockpick Durability",
  [
    { statId: "to-lockpicking", label: "to Lockpicking", valuePerRank: 25, unit: "flat", sortOrder: 1, displayText: "25 to Lockpicking" },
    { statId: "increased-bobby-pin-and-lockpick-durability", label: "increased Bobby Pin and Lockpick Durability", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Bobby Pin and Lockpick Durability" },
  ],
);
// Game node: lockpickPerception1; progression: Perception
setFullTreeNodeDetails(
  "outer-module-10-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: lockpick2; progression: skillTreeLockPicking
setFullTreeNodeDetails(
  "outer-module-10-right-1",
  "Lock Picking",
  "25 to Lockpicking\n20% increased Bobby Pin and Lockpick Durability",
  [
    { statId: "to-lockpicking", label: "to Lockpicking", valuePerRank: 25, unit: "flat", sortOrder: 1, displayText: "25 to Lockpicking" },
    { statId: "increased-bobby-pin-and-lockpick-durability", label: "increased Bobby Pin and Lockpick Durability", valuePerRank: 20, unit: "percent", sortOrder: 2, displayText: "20% increased Bobby Pin and Lockpick Durability" },
  ],
);
// Game node: droneCargo1; progression: skillTreeDroneCargo
setFullTreeNodeDetails(
  "outer-module-10-left-3",
  "Drone Cargo",
  "25% increased Drone Inventory Carry Weight Limit",
  [
    { statId: "increased-drone-inventory-carry-weight-limit", label: "increased Drone Inventory Carry Weight Limit", valuePerRank: 25, unit: "percent", sortOrder: 1, displayText: "25% increased Drone Inventory Carry Weight Limit" },
  ],
);
// Game node: droneCargo2; progression: skillTreeDroneCargo
setFullTreeNodeDetails(
  "outer-module-10-left-2",
  "Drone Cargo",
  "25% increased Drone Inventory Carry Weight Limit",
  [
    { statId: "increased-drone-inventory-carry-weight-limit", label: "increased Drone Inventory Carry Weight Limit", valuePerRank: 25, unit: "percent", sortOrder: 1, displayText: "25% increased Drone Inventory Carry Weight Limit" },
  ],
);
// Game node: droneCargo3; progression: skillTreeDroneCargo
setFullTreeNodeDetails(
  "outer-module-10-left-1",
  "Drone Cargo",
  "25% increased Drone Inventory Carry Weight Limit",
  [
    { statId: "increased-drone-inventory-carry-weight-limit", label: "increased Drone Inventory Carry Weight Limit", valuePerRank: 25, unit: "percent", sortOrder: 1, displayText: "25% increased Drone Inventory Carry Weight Limit" },
  ],
);
// Game node: dexterity_192_13; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-9-bottom-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: intellect_204_13; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-10-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_216_13; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-11-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: strength_240_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-13-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: intellect_228_13; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-12-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_192_17; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-9-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_204_17; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-10-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_216_17; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-11-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_228_17; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-12-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_240_17; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-13-top-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: intellect_192_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-9",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: dexterity_204_19; progression: Dexterity
setFullTreeNodeDetails(
  "final-ring-node-10",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: intellect_216_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-11",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: strength_228_19; progression: Strength
setFullTreeNodeDetails(
  "final-ring-node-12",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: intellect_240_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-13",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: trading3; progression: skillTreeTrading
setFullTreeNodeDetails(
  "outer-open-split-9-left-1",
  "Trading",
  "5% better prices when Buying or Selling from Traders",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
  ],
);
// Game node: traderStage3; progression: skillTreeTraderStage
setFullTreeNodeDetails(
  "outer-open-split-9-left-2",
  "Trader Stage",
  "+10 trader level",
  [
    { statId: "trader-level", label: "trader level", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 trader level" },
  ],
);
// Game node: questRewardDukes3; progression: skillTreeQuestRewardDukes
setFullTreeNodeDetails(
  "outer-open-split-9-left-3",
  "Quest Reward Dukes",
  "5% more Dukes for completing Missions",
  [
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% more Dukes for completing Missions" },
  ],
);
// Game node: questRewardDukes4; progression: skillTreeQuestRewardDukes
setFullTreeNodeDetails(
  "outer-open-split-9-right-1",
  "Quest Reward Dukes",
  "5% more Dukes for completing Missions",
  [
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% more Dukes for completing Missions" },
  ],
);
// Game node: questRewardDukes5; progression: skillTreeQuestRewardDukes
setFullTreeNodeDetails(
  "outer-open-split-9-right-2",
  "Quest Reward Dukes",
  "5% more Dukes for completing Missions",
  [
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% more Dukes for completing Missions" },
  ],
);
// Game node: questRewardCount1; progression: skillTreeQuestRewardCount
setFullTreeNodeDetails(
  "outer-open-split-9-right-3",
  "Quest Reward Count",
  "5% more Dukes for completing Missions\n+1 Additional mission Reward",
  [
    { statId: "more-dukes-for-completing-missions", label: "more Dukes for completing Missions", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% more Dukes for completing Missions" },
    { statId: "additional-mission-reward", label: "Additional mission Reward", valuePerRank: 1, unit: "flat", sortOrder: 2, displayText: "+1 Additional mission Reward" },
  ],
);
// Game node: trading4; progression: skillTreeTrading
setFullTreeNodeDetails(
  "outer-open-split-13-left-3",
  "Trading",
  "5% better prices when Buying or Selling from Traders",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
  ],
);
// Game node: trading5; progression: skillTreeTrading
setFullTreeNodeDetails(
  "outer-open-split-13-left-2",
  "Trading",
  "5% better prices when Buying or Selling from Traders",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
  ],
);
// Game node: trading6; progression: skillTreeTrading
setFullTreeNodeDetails(
  "outer-open-split-13-left-1",
  "Trading",
  "5% better prices when Buying or Selling from Traders",
  [
    { statId: "better-prices-when-buying-or-selling-from-traders", label: "better prices when Buying or Selling from Traders", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% better prices when Buying or Selling from Traders" },
  ],
);
// Game node: traderStage4; progression: skillTreeTraderStage
setFullTreeNodeDetails(
  "outer-open-split-13-right-3",
  "Trader Stage",
  "+10 trader level",
  [
    { statId: "trader-level", label: "trader level", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 trader level" },
  ],
);
// Game node: traderStage5; progression: skillTreeTraderStage
setFullTreeNodeDetails(
  "outer-open-split-13-right-2",
  "Trader Stage",
  "+10 trader level",
  [
    { statId: "trader-level", label: "trader level", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 trader level" },
  ],
);
// Game node: traderStage6; progression: skillTreeTraderStage
setFullTreeNodeDetails(
  "outer-open-split-13-right-1",
  "Trader Stage",
  "+10 trader level",
  [
    { statId: "trader-level", label: "trader level", valuePerRank: 10, unit: "flat", sortOrder: 1, displayText: "+10 trader level" },
  ],
);
// Game node: turretDamage3; progression: skillTreeTurretDamage
setFullTreeNodeDetails(
  "outer-final-split-12-left-1",
  "Turret Damage",
  "10% increased Portable Turret Physical Damage",
  [
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Portable Turret Physical Damage" },
  ],
);
// Game node: turretHandling3; progression: skillTreeTurretHandling
setFullTreeNodeDetails(
  "outer-final-split-12-left-2",
  "Turret Handling",
  "10% increased Ranged Portable Turret Fire Rate\n25% increased Melee Portable Turret Attack Speed",
  [
    { statId: "increased-ranged-portable-turret-fire-rate", label: "increased Ranged Portable Turret Fire Rate", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Fire Rate" },
    { statId: "increased-melee-portable-turret-attack-speed", label: "increased Melee Portable Turret Attack Speed", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased Melee Portable Turret Attack Speed" },
  ],
);
// Game node: turretRange3; progression: skillTreeTurretRange
setFullTreeNodeDetails(
  "outer-final-split-12-left-3",
  "Turret Range",
  "Increased Portable Turret active Range by 4m",
  [
    { statId: "increased-portable-turret-active-range-by-m", label: "Increased Portable Turret active Range by m", valuePerRank: 4, unit: "flat", sortOrder: 1, displayText: "Increased Portable Turret active Range by 4m" },
  ],
);
// Game node: turretReload2; progression: skillTreeTurretReload
setFullTreeNodeDetails(
  "outer-final-split-12-right-3",
  "Turret Reload",
  "10% increased Ranged Portable Turret Reload Speed",
  [
    { statId: "increased-ranged-portable-turret-reload-speed", label: "increased Ranged Portable Turret Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Reload Speed" },
  ],
);
// Game node: turretMagazine3; progression: skillTreeTurretMagazineSize
setFullTreeNodeDetails(
  "outer-final-split-12-right-2",
  "Turret Magazine Size",
  "Increased Ranged Portable Turret Magazine Size by 20 rounds",
  [
    { statId: "increased-ranged-portable-turret-magazine-size-by-rounds", label: "Increased Ranged Portable Turret Magazine Size by rounds", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "Increased Ranged Portable Turret Magazine Size by 20 rounds" },
  ],
);
// Game node: turretReload3; progression: skillTreeTurretReload
setFullTreeNodeDetails(
  "outer-final-split-12-right-1",
  "Turret Reload",
  "10% increased Ranged Portable Turret Reload Speed",
  [
    { statId: "increased-ranged-portable-turret-reload-speed", label: "increased Ranged Portable Turret Reload Speed", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Reload Speed" },
  ],
);
// Game node: droneCargo4; progression: skillTreeDroneCargo
setFullTreeNodeDetails(
  "outer-open-split-8-left-3",
  "Drone Cargo",
  "25% increased Drone Inventory Carry Weight Limit",
  [
    { statId: "increased-drone-inventory-carry-weight-limit", label: "increased Drone Inventory Carry Weight Limit", valuePerRank: 25, unit: "percent", sortOrder: 1, displayText: "25% increased Drone Inventory Carry Weight Limit" },
  ],
);
// Game node: droneCargo5; progression: skillTreeDroneCargo
setFullTreeNodeDetails(
  "outer-open-split-8-left-2",
  "Drone Cargo",
  "25% increased Drone Inventory Carry Weight Limit",
  [
    { statId: "increased-drone-inventory-carry-weight-limit", label: "increased Drone Inventory Carry Weight Limit", valuePerRank: 25, unit: "percent", sortOrder: 1, displayText: "25% increased Drone Inventory Carry Weight Limit" },
  ],
);
// Game node: droneCargo6; progression: skillTreeDroneCargo
setFullTreeNodeDetails(
  "outer-open-split-8-left-1",
  "Drone Cargo",
  "25% increased Drone Inventory Carry Weight Limit",
  [
    { statId: "increased-drone-inventory-carry-weight-limit", label: "increased Drone Inventory Carry Weight Limit", valuePerRank: 25, unit: "percent", sortOrder: 1, displayText: "25% increased Drone Inventory Carry Weight Limit" },
  ],
);
// Game node: salvcager5; progression: skillTreeSalvager
setFullTreeNodeDetails(
  "outer-open-split-8-right-3",
  "Salvager",
  "10% increased Salvage Tool Physical Damage\n10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
  [
    { statId: "increased-salvage-tool-physical-damage", label: "increased Salvage Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Salvage Tool Physical Damage" },
    { statId: "increased-efficiency-of-retrieving-resources-while-harvesting-salvageable-objects-using-salvage-tools", label: "increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools" },
  ],
);
// Game node: salvcagerPerception1; progression: Perception
setFullTreeNodeDetails(
  "outer-open-split-8-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: salvcager6; progression: skillTreeSalvager
setFullTreeNodeDetails(
  "outer-open-split-8-right-1",
  "Salvager",
  "10% increased Salvage Tool Physical Damage\n10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools",
  [
    { statId: "increased-salvage-tool-physical-damage", label: "increased Salvage Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Salvage Tool Physical Damage" },
    { statId: "increased-efficiency-of-retrieving-resources-while-harvesting-salvageable-objects-using-salvage-tools", label: "increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased efficiency of retrieving resources while Harvesting Salvageable Objects using Salvage Tools" },
  ],
);
// Game node: smgDamage4; progression: skillTreeSubmachineGunDamage
setFullTreeNodeDetails(
  "outer-open-split-7-left-3",
  "Submachine Gun Damage",
  "5% increased Submachine Gun Physical Damage",
  [
    { statId: "increased-submachine-gun-physical-damage", label: "increased Submachine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun Physical Damage" },
  ],
);
// Game node: smgDamage5; progression: skillTreeSubmachineGunDamage
setFullTreeNodeDetails(
  "outer-open-split-7-left-2",
  "Submachine Gun Damage",
  "5% increased Submachine Gun Physical Damage",
  [
    { statId: "increased-submachine-gun-physical-damage", label: "increased Submachine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun Physical Damage" },
  ],
);
// Game node: smgDamage6; progression: skillTreeSubmachineGunDamage
setFullTreeNodeDetails(
  "outer-open-split-7-left-1",
  "Submachine Gun Damage",
  "5% increased Submachine Gun Physical Damage",
  [
    { statId: "increased-submachine-gun-physical-damage", label: "increased Submachine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Submachine Gun Physical Damage" },
  ],
);
// Game node: smgHandling4; progression: skillTreeSubmachineGunHandling
setFullTreeNodeDetails(
  "outer-open-split-7-right-3",
  "Submachine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: smgHandling5; progression: skillTreeSubmachineGunHandling
setFullTreeNodeDetails(
  "outer-open-split-7-right-2",
  "Submachine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: smgHandling6; progression: skillTreeSubmachineGunHandling
setFullTreeNodeDetails(
  "outer-open-split-7-right-1",
  "Submachine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: turretDamage4; progression: skillTreeTurretDamage
setFullTreeNodeDetails(
  "outer-final-split-10-left-3",
  "Turret Damage",
  "10% increased Portable Turret Physical Damage",
  [
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Portable Turret Physical Damage" },
  ],
);
// Game node: turretDamage5; progression: skillTreeTurretDamage
setFullTreeNodeDetails(
  "outer-final-split-10-left-2",
  "Turret Damage",
  "10% increased Portable Turret Physical Damage",
  [
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Portable Turret Physical Damage" },
  ],
);
// Game node: turretDamage6; progression: skillTreeTurretDamage
setFullTreeNodeDetails(
  "outer-final-split-10-left-1",
  "Turret Damage",
  "10% increased Portable Turret Physical Damage",
  [
    { statId: "increased-portable-turret-physical-damage", label: "increased Portable Turret Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Portable Turret Physical Damage" },
  ],
);
// Game node: turretHandling4; progression: skillTreeTurretHandling
setFullTreeNodeDetails(
  "outer-final-split-10-right-3",
  "Turret Handling",
  "10% increased Ranged Portable Turret Fire Rate\n25% increased Melee Portable Turret Attack Speed",
  [
    { statId: "increased-ranged-portable-turret-fire-rate", label: "increased Ranged Portable Turret Fire Rate", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Fire Rate" },
    { statId: "increased-melee-portable-turret-attack-speed", label: "increased Melee Portable Turret Attack Speed", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased Melee Portable Turret Attack Speed" },
  ],
);
// Game node: turretHandling5; progression: skillTreeTurretHandling
setFullTreeNodeDetails(
  "outer-final-split-10-right-2",
  "Turret Handling",
  "10% increased Ranged Portable Turret Fire Rate\n25% increased Melee Portable Turret Attack Speed",
  [
    { statId: "increased-ranged-portable-turret-fire-rate", label: "increased Ranged Portable Turret Fire Rate", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Fire Rate" },
    { statId: "increased-melee-portable-turret-attack-speed", label: "increased Melee Portable Turret Attack Speed", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased Melee Portable Turret Attack Speed" },
  ],
);
// Game node: turretHandling6; progression: skillTreeTurretHandling
setFullTreeNodeDetails(
  "outer-final-split-10-right-1",
  "Turret Handling",
  "10% increased Ranged Portable Turret Fire Rate\n25% increased Melee Portable Turret Attack Speed",
  [
    { statId: "increased-ranged-portable-turret-fire-rate", label: "increased Ranged Portable Turret Fire Rate", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Ranged Portable Turret Fire Rate" },
    { statId: "increased-melee-portable-turret-attack-speed", label: "increased Melee Portable Turret Attack Speed", valuePerRank: 25, unit: "percent", sortOrder: 2, displayText: "25% increased Melee Portable Turret Attack Speed" },
  ],
);
// Game node: batonDamage4; progression: skillTreeBatonDamage
setFullTreeNodeDetails(
  "outer-open-split-11-left-3",
  "Baton Damage",
  "10% increased Baton Physical Damage",
  [
    { statId: "increased-baton-physical-damage", label: "increased Baton Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Baton Physical Damage" },
  ],
);
// Game node: batonDamage5; progression: skillTreeBatonDamage
setFullTreeNodeDetails(
  "outer-open-split-11-left-2",
  "Baton Damage",
  "10% increased Baton Physical Damage",
  [
    { statId: "increased-baton-physical-damage", label: "increased Baton Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Baton Physical Damage" },
  ],
);
// Game node: batonDamage6; progression: skillTreeBatonDamage
setFullTreeNodeDetails(
  "outer-open-split-11-left-1",
  "Baton Damage",
  "10% increased Baton Physical Damage",
  [
    { statId: "increased-baton-physical-damage", label: "increased Baton Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Baton Physical Damage" },
  ],
);
// Game node: batonStun4; progression: skillTreeBatonStun
setFullTreeNodeDetails(
  "outer-open-split-11-right-3",
  "Baton Stun",
  "20% increased Stun Duration of Stun Batons",
  [
    { statId: "increased-stun-duration-of-stun-batons", label: "increased Stun Duration of Stun Batons", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Stun Duration of Stun Batons" },
  ],
);
// Game node: batonStun5; progression: skillTreeBatonStun
setFullTreeNodeDetails(
  "outer-open-split-11-right-2",
  "Baton Stun",
  "20% increased Stun Duration of Stun Batons",
  [
    { statId: "increased-stun-duration-of-stun-batons", label: "increased Stun Duration of Stun Batons", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Stun Duration of Stun Batons" },
  ],
);
// Game node: batonStun6; progression: skillTreeBatonStun
setFullTreeNodeDetails(
  "outer-open-split-11-right-1",
  "Baton Stun",
  "20% increased Stun Duration of Stun Batons",
  [
    { statId: "increased-stun-duration-of-stun-batons", label: "increased Stun Duration of Stun Batons", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Stun Duration of Stun Batons" },
  ],
);
// Game node: turretCount1; progression: skillTreeTurretCount
setFullTreeNodeDetails(
  "outer-final-split-10-junction",
  "Turret Count",
  "+1 to maximum number of allowed active Portable Turrets",
  [
    { statId: "to-maximum-number-of-allowed-active-portable-turrets", label: "to maximum number of allowed active Portable Turrets", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 to maximum number of allowed active Portable Turrets" },
  ],
);
// Game node: turretCount2; progression: skillTreeTurretCount
setFullTreeNodeDetails(
  "outer-final-split-12-junction",
  "Turret Count",
  "+1 to maximum number of allowed active Portable Turrets",
  [
    { statId: "to-maximum-number-of-allowed-active-portable-turrets", label: "to maximum number of allowed active Portable Turrets", valuePerRank: 1, unit: "flat", sortOrder: 1, displayText: "+1 to maximum number of allowed active Portable Turrets" },
  ],
);
// Game node: rootStrength; progression: skillTreeStrengthClass
setFullTreeNodeDetails(
  "strength-root",
  "Assault",
  "A S S A U L T\n40 to Inventory Carry Limit\n20 to Maximum Food and Thirst Limit\n5% increased Melee Weapon Physical Damage\n5% increased Assault Rifle, Rocket Launcher and Explosive Physical Damage\n10% increased Mining Tool Physical Damage",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 40, unit: "flat", sortOrder: 1, displayText: "40 to Inventory Carry Limit" },
    { statId: "to-maximum-food-and-thirst-limit", label: "to Maximum Food and Thirst Limit", valuePerRank: 20, unit: "flat", sortOrder: 2, displayText: "20 to Maximum Food and Thirst Limit" },
    { statId: "increased-melee-weapon-physical-damage", label: "increased Melee Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 3, displayText: "5% increased Melee Weapon Physical Damage" },
    { statId: "increased-assault-rifle-rocket-launcher-and-explosive-physical-damage", label: "increased Assault Rifle, Rocket Launcher and Explosive Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 4, displayText: "5% increased Assault Rifle, Rocket Launcher and Explosive Physical Damage" },
    { statId: "increased-mining-tool-physical-damage", label: "increased Mining Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 5, displayText: "10% increased Mining Tool Physical Damage" },
  ],
);
// Game node: baseStrength; progression: Strength
setFullTreeNodeDetails(
  "strength-shared-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: baseMeleeDamage; progression: skillTreeMeleeDamage10
setFullTreeNodeDetails(
  "strength-module-1-entry",
  "Melee Damage10",
  "10% increased Melee Physical Damage",
  [
    { statId: "increased-melee-physical-damage", label: "increased Melee Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Melee Physical Damage" },
  ],
);
// Game node: baseMiningDamage; progression: skillTreeMiningDamageBase
setFullTreeNodeDetails(
  "strength-module-2-entry",
  "Mining Damage Base",
  "15% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: baseMeleeStaminaUse; progression: skillTreeMeleeAndAimStaminaUse
setFullTreeNodeDetails(
  "strength-module-3-entry",
  "Melee And Aim Stamina Use",
  "10% decreased stamina consumption while using Melee Weapons\n10% decreased stamina consumption while aiming with Ranged Weapons",
  [
    { statId: "decreased-stamina-consumption-while-using-melee-weapons", label: "decreased stamina consumption while using Melee Weapons", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% decreased stamina consumption while using Melee Weapons" },
    { statId: "decreased-stamina-consumption-while-aiming-with-ranged-weapons", label: "decreased stamina consumption while aiming with Ranged Weapons", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% decreased stamina consumption while aiming with Ranged Weapons" },
  ],
);
// Game node: strength_264_7; progression: Strength
setFullTreeNodeDetails(
  "strength-module-1-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_288_7; progression: Strength
setFullTreeNodeDetails(
  "strength-module-2-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_312_7; progression: Strength
setFullTreeNodeDetails(
  "strength-module-3-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: sledgeDamage1; progression: skillTreeSledgeDamage
setFullTreeNodeDetails(
  "strength-module-1-left-3",
  "Sledge Damage",
  "5% increased Sledgehammer Physical Damage",
  [
    { statId: "increased-sledgehammer-physical-damage", label: "increased Sledgehammer Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sledgehammer Physical Damage" },
  ],
);
// Game node: sledgeKnockdown1; progression: skillTreeSledgeKnockdown
setFullTreeNodeDetails(
  "strength-module-1-left-2",
  "Sledge Knockdown",
  "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets\n5% increased chance to knock down nearby Targets",
  [
    { statId: "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets", label: "increased chance for Sledgehammer Power Attacks to Knock Down Targets", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets" },
    { statId: "increased-chance-to-knock-down-nearby-targets", label: "increased chance to knock down nearby Targets", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased chance to knock down nearby Targets" },
  ],
);
// Game node: sledgeDamage2; progression: skillTreeSledgeDamage
setFullTreeNodeDetails(
  "strength-module-1-left-1",
  "Sledge Damage",
  "5% increased Sledgehammer Physical Damage",
  [
    { statId: "increased-sledgehammer-physical-damage", label: "increased Sledgehammer Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sledgehammer Physical Damage" },
  ],
);
// Game node: clubDamage1; progression: skillTreeClubDamage
setFullTreeNodeDetails(
  "strength-module-1-right-1",
  "Club Damage",
  "5% increased Club Weapon Physical Damage",
  [
    { statId: "increased-club-weapon-physical-damage", label: "increased Club Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Club Weapon Physical Damage" },
  ],
);
// Game node: clubKnockdown1; progression: skillTreeClubKnockdown
setFullTreeNodeDetails(
  "strength-module-1-right-2",
  "Club Knockdown",
  "15% additional Physical Damage to Stunned Targets while using Clubs\n15% increased chance to knock down enemies",
  [
    { statId: "additional-physical-damage-to-stunned-targets-while-using-clubs", label: "additional Physical Damage to Stunned Targets while using Clubs", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% additional Physical Damage to Stunned Targets while using Clubs" },
    { statId: "increased-chance-to-knock-down-enemies", label: "increased chance to knock down enemies", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% increased chance to knock down enemies" },
  ],
);
// Game node: clubDamageCombo1; progression: skillTreeClubDamageCombo
setFullTreeNodeDetails(
  "strength-module-1-right-3",
  "Club Damage Combo",
  "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage",
  [
    { statId: "successive-hits-with-clubs-cause-the-last-hit-to-deal-additional-33-physical-damage", label: "successive hits with Clubs cause the last hit to deal additional 33% Physical Damage", valuePerRank: 3, unit: "flat", sortOrder: 1, displayText: "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage" },
  ],
);
// Game node: carryWeight1; progression: skillTreeCarryWeight
setFullTreeNodeDetails(
  "strength-module-2-left-3",
  "Carry Weight",
  "+20 to Inventory Carry Limit",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Inventory Carry Limit" },
  ],
);
// Game node: carryStrength1; progression: Strength
setFullTreeNodeDetails(
  "strength-module-2-left-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: carryWeight2; progression: skillTreeCarryWeight
setFullTreeNodeDetails(
  "strength-module-2-left-1",
  "Carry Weight",
  "+20 to Inventory Carry Limit",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Inventory Carry Limit" },
  ],
);
// Game node: miningYield1; progression: skillTreeMiningYield
setFullTreeNodeDetails(
  "strength-module-2-right-3",
  "Mining Yield",
  "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-boulders-ore-terrain-and-trees-while-using-mining-or-woodcutting-tools", label: "increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools" },
  ],
);
// Game node: miningPerception1; progression: Perception
setFullTreeNodeDetails(
  "strength-module-2-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: miningYield2; progression: skillTreeMiningYield
setFullTreeNodeDetails(
  "strength-module-2-right-1",
  "Mining Yield",
  "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-boulders-ore-terrain-and-trees-while-using-mining-or-woodcutting-tools", label: "increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools" },
  ],
);
// Game node: machineGunDamage1; progression: skillTreeMachineGunDamage
setFullTreeNodeDetails(
  "strength-module-3-right-3",
  "Machine Gun Damage",
  "5% increased Machine Gun Physical Damage",
  [
    { statId: "increased-machine-gun-physical-damage", label: "increased Machine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Machine Gun Physical Damage" },
  ],
);
// Game node: machineGunDamage2; progression: skillTreeMachineGunDamage
setFullTreeNodeDetails(
  "strength-module-3-right-2",
  "Machine Gun Damage",
  "5% increased Machine Gun Physical Damage",
  [
    { statId: "increased-machine-gun-physical-damage", label: "increased Machine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Machine Gun Physical Damage" },
  ],
);
// Game node: machineGunDamage3; progression: skillTreeMachineGunDamage
setFullTreeNodeDetails(
  "strength-module-3-right-1",
  "Machine Gun Damage",
  "5% increased Machine Gun Physical Damage",
  [
    { statId: "increased-machine-gun-physical-damage", label: "increased Machine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Machine Gun Physical Damage" },
  ],
);
// Game node: machineGunHandling1; progression: skillTreeMachineGunHandling
setFullTreeNodeDetails(
  "strength-module-3-left-3",
  "Machine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: machineGunHandling2; progression: skillTreeMachineGunHandling
setFullTreeNodeDetails(
  "strength-module-3-left-2",
  "Machine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: machineGunHandling3; progression: skillTreeMachineGunHandling
setFullTreeNodeDetails(
  "strength-module-3-left-1",
  "Machine Gun Handling",
  "5% improved Machine Gun Handling, Aim and Reload Speed",
  [
    { statId: "improved-machine-gun-handling-aim-and-reload-speed", label: "improved Machine Gun Handling, Aim and Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% improved Machine Gun Handling, Aim and Reload Speed" },
  ],
);
// Game node: meleeStaminaUse3; progression: skillTreeMeleeStaminaUse
setFullTreeNodeDetails(
  "outer-ring-connector-14",
  "Melee Stamina Use",
  "10% less Stamina Used by Melee Attacks\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
  [
    { statId: "less-stamina-used-by-melee-attacks", label: "less Stamina Used by Melee Attacks", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% less Stamina Used by Melee Attacks" },
    { statId: "recover-stamina-per-enemy-killed-using-melee-weapons", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
  ],
);
// Game node: strength_264_11; progression: Strength
setFullTreeNodeDetails(
  "strength-module-1-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: dexterity_276_11; progression: Dexterity
setFullTreeNodeDetails(
  "outer-ring-connector-16",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: strength_288_11; progression: Strength
setFullTreeNodeDetails(
  "strength-module-2-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: intellect_300_11; progression: Intellect
setFullTreeNodeDetails(
  "outer-ring-connector-18",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: strength_312_11; progression: Strength
setFullTreeNodeDetails(
  "strength-module-3-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_252_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-14-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: intellect_264_13; progression: Intellect
setFullTreeNodeDetails(
  "outer-module-15-bottom-junction",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: strength_276_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-16-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_288_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-17-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_300_13; progression: Strength
setFullTreeNodeDetails(
  "outer-module-18-bottom-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_312_13; progression: Fortitude
setFullTreeNodeDetails(
  "outer-module-19-bottom-junction",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: sledgeKnockdown2; progression: skillTreeSledgeKnockdown
setFullTreeNodeDetails(
  "outer-module-15-left-3",
  "Sledge Knockdown",
  "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets\n5% increased chance to knock down nearby Targets",
  [
    { statId: "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets", label: "increased chance for Sledgehammer Power Attacks to Knock Down Targets", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets" },
    { statId: "increased-chance-to-knock-down-nearby-targets", label: "increased chance to knock down nearby Targets", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased chance to knock down nearby Targets" },
  ],
);
// Game node: sledgeDamage3; progression: skillTreeSledgeDamage
setFullTreeNodeDetails(
  "outer-module-15-left-2",
  "Sledge Damage",
  "5% increased Sledgehammer Physical Damage",
  [
    { statId: "increased-sledgehammer-physical-damage", label: "increased Sledgehammer Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sledgehammer Physical Damage" },
  ],
);
// Game node: sledgeKnockdown3; progression: skillTreeSledgeKnockdown
setFullTreeNodeDetails(
  "outer-module-15-left-1",
  "Sledge Knockdown",
  "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets\n5% increased chance to knock down nearby Targets",
  [
    { statId: "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets", label: "increased chance for Sledgehammer Power Attacks to Knock Down Targets", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets" },
    { statId: "increased-chance-to-knock-down-nearby-targets", label: "increased chance to knock down nearby Targets", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased chance to knock down nearby Targets" },
  ],
);
// Game node: clubDamage2; progression: skillTreeClubDamage
setFullTreeNodeDetails(
  "outer-module-15-right-1",
  "Club Damage",
  "5% increased Club Weapon Physical Damage",
  [
    { statId: "increased-club-weapon-physical-damage", label: "increased Club Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Club Weapon Physical Damage" },
  ],
);
// Game node: clubKnockdown2; progression: skillTreeClubKnockdown
setFullTreeNodeDetails(
  "outer-module-15-right-2",
  "Club Knockdown",
  "15% additional Physical Damage to Stunned Targets while using Clubs\n15% increased chance to knock down enemies",
  [
    { statId: "additional-physical-damage-to-stunned-targets-while-using-clubs", label: "additional Physical Damage to Stunned Targets while using Clubs", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% additional Physical Damage to Stunned Targets while using Clubs" },
    { statId: "increased-chance-to-knock-down-enemies", label: "increased chance to knock down enemies", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% increased chance to knock down enemies" },
  ],
);
// Game node: clubDamageCombo2; progression: skillTreeClubDamageCombo
setFullTreeNodeDetails(
  "outer-module-15-right-3",
  "Club Damage Combo",
  "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage",
  [
    { statId: "successive-hits-with-clubs-cause-the-last-hit-to-deal-additional-33-physical-damage", label: "successive hits with Clubs cause the last hit to deal additional 33% Physical Damage", valuePerRank: 3, unit: "flat", sortOrder: 1, displayText: "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage" },
  ],
);
// Game node: explosiveDamage1; progression: skillTreeExplosiveDamage
setFullTreeNodeDetails(
  "outer-module-16-left-3",
  "Explosive Damage",
  "10% increased Rocket Launcher and Explosive Physical Damage",
  [
    { statId: "increased-rocket-launcher-and-explosive-physical-damage", label: "increased Rocket Launcher and Explosive Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Rocket Launcher and Explosive Physical Damage" },
  ],
);
// Game node: explosiveHandling1; progression: skillTreeExplosiveHandling
setFullTreeNodeDetails(
  "outer-module-16-left-2",
  "Explosive Handling",
  "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance\n5% improved Rocket Launcher Reload Speed",
  [
    { statId: "improved-rocket-launcher-and-explosive-handling-and-dismemberment-chance", label: "improved Rocket Launcher and Explosive Handling and Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance" },
    { statId: "improved-rocket-launcher-reload-speed", label: "improved Rocket Launcher Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% improved Rocket Launcher Reload Speed" },
  ],
);
// Game node: explosiveDamage2; progression: skillTreeExplosiveDamage
setFullTreeNodeDetails(
  "outer-module-16-left-1",
  "Explosive Damage",
  "10% increased Rocket Launcher and Explosive Physical Damage",
  [
    { statId: "increased-rocket-launcher-and-explosive-physical-damage", label: "increased Rocket Launcher and Explosive Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Rocket Launcher and Explosive Physical Damage" },
  ],
);
// Game node: miningDamage1; progression: skillTreeMiningDamage
setFullTreeNodeDetails(
  "outer-module-16-right-3",
  "Mining Damage",
  "10% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: miningStrength1; progression: Strength
setFullTreeNodeDetails(
  "outer-module-16-right-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: miningDamage2; progression: skillTreeMiningDamage
setFullTreeNodeDetails(
  "outer-module-16-right-1",
  "Mining Damage",
  "10% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: armorMedium4; progression: skillTreeArmorMedium
setFullTreeNodeDetails(
  "outer-module-18-left-3",
  "Armor Medium",
  "10% reduced Medium Armor durability loss\n10% reduced Medium Armor movement penalty\n12.5% reduced Medium Armor stamina penalty",
  [
    { statId: "reduced-medium-armor-durability-loss", label: "reduced Medium Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Medium Armor durability loss" },
    { statId: "reduced-medium-armor-movement-penalty", label: "reduced Medium Armor movement penalty", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced Medium Armor movement penalty" },
    { statId: "reduced-medium-armor-stamina-penalty", label: "reduced Medium Armor stamina penalty", valuePerRank: 12.5, unit: "percent", sortOrder: 3, displayText: "12.5% reduced Medium Armor stamina penalty" },
  ],
);
// Game node: armorMedium5; progression: skillTreeArmorMedium
setFullTreeNodeDetails(
  "outer-module-18-left-2",
  "Armor Medium",
  "10% reduced Medium Armor durability loss\n10% reduced Medium Armor movement penalty\n12.5% reduced Medium Armor stamina penalty",
  [
    { statId: "reduced-medium-armor-durability-loss", label: "reduced Medium Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Medium Armor durability loss" },
    { statId: "reduced-medium-armor-movement-penalty", label: "reduced Medium Armor movement penalty", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced Medium Armor movement penalty" },
    { statId: "reduced-medium-armor-stamina-penalty", label: "reduced Medium Armor stamina penalty", valuePerRank: 12.5, unit: "percent", sortOrder: 3, displayText: "12.5% reduced Medium Armor stamina penalty" },
  ],
);
// Game node: armorMedium6; progression: skillTreeArmorMedium
setFullTreeNodeDetails(
  "outer-module-18-left-1",
  "Armor Medium",
  "10% reduced Medium Armor durability loss\n10% reduced Medium Armor movement penalty\n12.5% reduced Medium Armor stamina penalty",
  [
    { statId: "reduced-medium-armor-durability-loss", label: "reduced Medium Armor durability loss", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% reduced Medium Armor durability loss" },
    { statId: "reduced-medium-armor-movement-penalty", label: "reduced Medium Armor movement penalty", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% reduced Medium Armor movement penalty" },
    { statId: "reduced-medium-armor-stamina-penalty", label: "reduced Medium Armor stamina penalty", valuePerRank: 12.5, unit: "percent", sortOrder: 3, displayText: "12.5% reduced Medium Armor stamina penalty" },
  ],
);
// Game node: miningDamage4; progression: skillTreeMiningDamage
setFullTreeNodeDetails(
  "outer-module-18-right-3",
  "Mining Damage",
  "10% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: miningStrength3; progression: Strength
setFullTreeNodeDetails(
  "outer-module-18-right-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: miningDamage3; progression: skillTreeMiningDamage
setFullTreeNodeDetails(
  "outer-module-18-right-1",
  "Mining Damage",
  "10% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: carryWeight3; progression: skillTreeCarryWeight
setFullTreeNodeDetails(
  "outer-module-17-left-3",
  "Carry Weight",
  "+20 to Inventory Carry Limit",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Inventory Carry Limit" },
  ],
);
// Game node: carryStrength2; progression: Strength
setFullTreeNodeDetails(
  "outer-module-17-left-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: carryWeight4; progression: skillTreeCarryWeight
setFullTreeNodeDetails(
  "outer-module-17-left-1",
  "Carry Weight",
  "+20 to Inventory Carry Limit",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Inventory Carry Limit" },
  ],
);
// Game node: miningYield3; progression: skillTreeMiningYield
setFullTreeNodeDetails(
  "outer-module-17-right-3",
  "Mining Yield",
  "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-boulders-ore-terrain-and-trees-while-using-mining-or-woodcutting-tools", label: "increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools" },
  ],
);
// Game node: miningPerception2; progression: Perception
setFullTreeNodeDetails(
  "outer-module-17-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: miningYield4; progression: skillTreeMiningYield
setFullTreeNodeDetails(
  "outer-module-17-right-1",
  "Mining Yield",
  "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-boulders-ore-terrain-and-trees-while-using-mining-or-woodcutting-tools", label: "increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools" },
  ],
);
// Game node: carryWeight5; progression: skillTreeCarryWeight
setFullTreeNodeDetails(
  "outer-module-19-left-3",
  "Carry Weight",
  "+20 to Inventory Carry Limit",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Inventory Carry Limit" },
  ],
);
// Game node: carryStrength3; progression: Strength
setFullTreeNodeDetails(
  "outer-module-19-left-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: carryWeight6; progression: skillTreeCarryWeight
setFullTreeNodeDetails(
  "outer-module-19-left-1",
  "Carry Weight",
  "+20 to Inventory Carry Limit",
  [
    { statId: "to-inventory-carry-limit", label: "to Inventory Carry Limit", valuePerRank: 20, unit: "flat", sortOrder: 1, displayText: "+20 to Inventory Carry Limit" },
  ],
);
// Game node: miningYield5; progression: skillTreeMiningYield
setFullTreeNodeDetails(
  "outer-module-19-right-3",
  "Mining Yield",
  "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-boulders-ore-terrain-and-trees-while-using-mining-or-woodcutting-tools", label: "increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools" },
  ],
);
// Game node: miningPerception3; progression: Perception
setFullTreeNodeDetails(
  "outer-module-19-right-2",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: miningYield6; progression: skillTreeMiningYield
setFullTreeNodeDetails(
  "outer-module-19-right-1",
  "Mining Yield",
  "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools",
  [
    { statId: "increased-amount-of-resources-gathered-from-boulders-ore-terrain-and-trees-while-using-mining-or-woodcutting-tools", label: "increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased amount of resources gathered from Boulders, Ore, Terrain and Trees while using Mining or Woodcutting Tools" },
  ],
);
// Game node: dexterity_252_17; progression: Dexterity
setFullTreeNodeDetails(
  "outer-module-14-top-junction",
  "Dexterity",
  "+5 to Dexterity",
  [
    { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
  ],
);
// Game node: strength_276_17; progression: Strength
setFullTreeNodeDetails(
  "outer-module-16-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_288_17; progression: Strength
setFullTreeNodeDetails(
  "outer-module-17-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_300_17; progression: Strength
setFullTreeNodeDetails(
  "outer-module-18-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_312_17; progression: Strength
setFullTreeNodeDetails(
  "outer-module-19-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: strength_264_17; progression: Strength
setFullTreeNodeDetails(
  "outer-module-15-top-junction",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: perception_252_19; progression: Perception
setFullTreeNodeDetails(
  "final-ring-node-14",
  "Perception",
  "+5 to Perception",
  [
    { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
  ],
);
// Game node: strength_264_19; progression: Strength
setFullTreeNodeDetails(
  "final-ring-node-15",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: intellect_276_19; progression: Intellect
setFullTreeNodeDetails(
  "final-ring-node-16",
  "Intellect",
  "+5 to Intellect",
  [
    { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
  ],
);
// Game node: strength_288_19; progression: Strength
setFullTreeNodeDetails(
  "final-ring-node-17",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: fortitude_300_19; progression: Fortitude
setFullTreeNodeDetails(
  "final-ring-node-18",
  "Fortitude",
  "+5 to Fortitude",
  [
    { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
  ],
);
// Game node: strength_312_19; progression: Strength
setFullTreeNodeDetails(
  "final-ring-node-19",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: miningDamage5; progression: skillTreeMiningDamage
setFullTreeNodeDetails(
  "outer-open-split-18-right-3",
  "Mining Damage",
  "10% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: miningStrength4; progression: Strength
setFullTreeNodeDetails(
  "outer-open-split-18-right-2",
  "Strength",
  "+5 to Strength",
  [
    { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
  ],
);
// Game node: miningDamage6; progression: skillTreeMiningDamage
setFullTreeNodeDetails(
  "outer-open-split-18-right-1",
  "Mining Damage",
  "10% increased Mining and Woodcutting Tool Physical Damage",
  [
    { statId: "increased-mining-and-woodcutting-tool-physical-damage", label: "increased Mining and Woodcutting Tool Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Mining and Woodcutting Tool Physical Damage" },
  ],
);
// Game node: explosiveHandling2; progression: skillTreeExplosiveHandling
setFullTreeNodeDetails(
  "outer-open-split-18-left-3",
  "Explosive Handling",
  "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance\n5% improved Rocket Launcher Reload Speed",
  [
    { statId: "improved-rocket-launcher-and-explosive-handling-and-dismemberment-chance", label: "improved Rocket Launcher and Explosive Handling and Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance" },
    { statId: "improved-rocket-launcher-reload-speed", label: "improved Rocket Launcher Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% improved Rocket Launcher Reload Speed" },
  ],
);
// Game node: explosiveDamage3; progression: skillTreeExplosiveDamage
setFullTreeNodeDetails(
  "outer-open-split-18-left-2",
  "Explosive Damage",
  "10% increased Rocket Launcher and Explosive Physical Damage",
  [
    { statId: "increased-rocket-launcher-and-explosive-physical-damage", label: "increased Rocket Launcher and Explosive Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Rocket Launcher and Explosive Physical Damage" },
  ],
);
// Game node: explosiveHandling3; progression: skillTreeExplosiveHandling
setFullTreeNodeDetails(
  "outer-open-split-18-left-1",
  "Explosive Handling",
  "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance\n5% improved Rocket Launcher Reload Speed",
  [
    { statId: "improved-rocket-launcher-and-explosive-handling-and-dismemberment-chance", label: "improved Rocket Launcher and Explosive Handling and Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance" },
    { statId: "improved-rocket-launcher-reload-speed", label: "improved Rocket Launcher Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% improved Rocket Launcher Reload Speed" },
  ],
);
// Game node: explosiveDamage4; progression: skillTreeExplosiveDamage
setFullTreeNodeDetails(
  "outer-open-split-15-left-3",
  "Explosive Damage",
  "10% increased Rocket Launcher and Explosive Physical Damage",
  [
    { statId: "increased-rocket-launcher-and-explosive-physical-damage", label: "increased Rocket Launcher and Explosive Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Rocket Launcher and Explosive Physical Damage" },
  ],
);
// Game node: explosiveDamage5; progression: skillTreeExplosiveDamage
setFullTreeNodeDetails(
  "outer-open-split-15-left-2",
  "Explosive Damage",
  "10% increased Rocket Launcher and Explosive Physical Damage",
  [
    { statId: "increased-rocket-launcher-and-explosive-physical-damage", label: "increased Rocket Launcher and Explosive Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Rocket Launcher and Explosive Physical Damage" },
  ],
);
// Game node: explosiveDamage6; progression: skillTreeExplosiveDamage
setFullTreeNodeDetails(
  "outer-open-split-15-left-1",
  "Explosive Damage",
  "10% increased Rocket Launcher and Explosive Physical Damage",
  [
    { statId: "increased-rocket-launcher-and-explosive-physical-damage", label: "increased Rocket Launcher and Explosive Physical Damage", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Rocket Launcher and Explosive Physical Damage" },
  ],
);
// Game node: explosiveHandling4; progression: skillTreeExplosiveHandling
setFullTreeNodeDetails(
  "outer-open-split-15-right-3",
  "Explosive Handling",
  "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance\n5% improved Rocket Launcher Reload Speed",
  [
    { statId: "improved-rocket-launcher-and-explosive-handling-and-dismemberment-chance", label: "improved Rocket Launcher and Explosive Handling and Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance" },
    { statId: "improved-rocket-launcher-reload-speed", label: "improved Rocket Launcher Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% improved Rocket Launcher Reload Speed" },
  ],
);
// Game node: explosiveHandling5; progression: skillTreeExplosiveHandling
setFullTreeNodeDetails(
  "outer-open-split-15-right-2",
  "Explosive Handling",
  "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance\n5% improved Rocket Launcher Reload Speed",
  [
    { statId: "improved-rocket-launcher-and-explosive-handling-and-dismemberment-chance", label: "improved Rocket Launcher and Explosive Handling and Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance" },
    { statId: "improved-rocket-launcher-reload-speed", label: "improved Rocket Launcher Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% improved Rocket Launcher Reload Speed" },
  ],
);
// Game node: explosiveHandling6; progression: skillTreeExplosiveHandling
setFullTreeNodeDetails(
  "outer-open-split-15-right-1",
  "Explosive Handling",
  "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance\n5% improved Rocket Launcher Reload Speed",
  [
    { statId: "improved-rocket-launcher-and-explosive-handling-and-dismemberment-chance", label: "improved Rocket Launcher and Explosive Handling and Dismemberment Chance", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% improved Rocket Launcher and Explosive Handling and Dismemberment Chance" },
    { statId: "improved-rocket-launcher-reload-speed", label: "improved Rocket Launcher Reload Speed", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% improved Rocket Launcher Reload Speed" },
  ],
);
// Game node: machineGunDamage4; progression: skillTreeMachineGunDamage
setFullTreeNodeDetails(
  "outer-open-split-19-left-3",
  "Machine Gun Damage",
  "5% increased Machine Gun Physical Damage",
  [
    { statId: "increased-machine-gun-physical-damage", label: "increased Machine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Machine Gun Physical Damage" },
  ],
);
// Game node: machineGunDamage5; progression: skillTreeMachineGunDamage
setFullTreeNodeDetails(
  "outer-open-split-19-left-2",
  "Machine Gun Damage",
  "5% increased Machine Gun Physical Damage",
  [
    { statId: "increased-machine-gun-physical-damage", label: "increased Machine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Machine Gun Physical Damage" },
  ],
);
// Game node: machineGunDamage6; progression: skillTreeMachineGunDamage
setFullTreeNodeDetails(
  "outer-open-split-19-left-1",
  "Machine Gun Damage",
  "5% increased Machine Gun Physical Damage",
  [
    { statId: "increased-machine-gun-physical-damage", label: "increased Machine Gun Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Machine Gun Physical Damage" },
  ],
);
// Game node: machineGunCommando1; progression: skillTreeMachineGunCommando
setFullTreeNodeDetails(
  "outer-open-split-19-right-3",
  "Machine Gun Commando",
  "Recover 2 Stamina on each successful shot using Machine Guns",
  [
    { statId: "recover-stamina-on-each-successful-shot-using-machine-guns", label: "Recover Stamina on each successful shot using Machine Guns", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Recover 2 Stamina on each successful shot using Machine Guns" },
  ],
);
// Game node: machineGunCommando2; progression: skillTreeMachineGunCommando
setFullTreeNodeDetails(
  "outer-open-split-19-right-2",
  "Machine Gun Commando",
  "Recover 2 Stamina on each successful shot using Machine Guns",
  [
    { statId: "recover-stamina-on-each-successful-shot-using-machine-guns", label: "Recover Stamina on each successful shot using Machine Guns", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Recover 2 Stamina on each successful shot using Machine Guns" },
  ],
);
// Game node: machineGunCommando3; progression: skillTreeMachineGunCommando
setFullTreeNodeDetails(
  "outer-open-split-19-right-1",
  "Machine Gun Commando",
  "Recover 2 Stamina on each successful shot using Machine Guns",
  [
    { statId: "recover-stamina-on-each-successful-shot-using-machine-guns", label: "Recover Stamina on each successful shot using Machine Guns", valuePerRank: 2, unit: "flat", sortOrder: 1, displayText: "Recover 2 Stamina on each successful shot using Machine Guns" },
  ],
);
// Game node: clubKnockdown3; progression: skillTreeClubKnockdown
setFullTreeNodeDetails(
  "outer-open-split-14-left-1",
  "Club Knockdown",
  "15% additional Physical Damage to Stunned Targets while using Clubs\n15% increased chance to knock down enemies",
  [
    { statId: "additional-physical-damage-to-stunned-targets-while-using-clubs", label: "additional Physical Damage to Stunned Targets while using Clubs", valuePerRank: 15, unit: "percent", sortOrder: 1, displayText: "15% additional Physical Damage to Stunned Targets while using Clubs" },
    { statId: "increased-chance-to-knock-down-enemies", label: "increased chance to knock down enemies", valuePerRank: 15, unit: "percent", sortOrder: 2, displayText: "15% increased chance to knock down enemies" },
  ],
);
// Game node: clubDamage3; progression: skillTreeClubDamage
setFullTreeNodeDetails(
  "outer-open-split-14-left-2",
  "Club Damage",
  "5% increased Club Weapon Physical Damage",
  [
    { statId: "increased-club-weapon-physical-damage", label: "increased Club Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Club Weapon Physical Damage" },
  ],
);
// Game node: clubDamageCombo3; progression: skillTreeClubDamageCombo
setFullTreeNodeDetails(
  "outer-open-split-14-left-3",
  "Club Damage Combo",
  "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage",
  [
    { statId: "successive-hits-with-clubs-cause-the-last-hit-to-deal-additional-33-physical-damage", label: "successive hits with Clubs cause the last hit to deal additional 33% Physical Damage", valuePerRank: 3, unit: "flat", sortOrder: 1, displayText: "3 successive hits with Clubs cause the last hit to deal additional 33% Physical Damage" },
  ],
);
// Game node: clubDamage4; progression: skillTreeClubDamage
setFullTreeNodeDetails(
  "outer-open-split-14-right-3",
  "Club Damage",
  "5% increased Club Weapon Physical Damage",
  [
    { statId: "increased-club-weapon-physical-damage", label: "increased Club Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Club Weapon Physical Damage" },
  ],
);
// Game node: clubDamage5; progression: skillTreeClubDamage
setFullTreeNodeDetails(
  "outer-open-split-14-right-2",
  "Club Damage",
  "5% increased Club Weapon Physical Damage",
  [
    { statId: "increased-club-weapon-physical-damage", label: "increased Club Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Club Weapon Physical Damage" },
  ],
);
// Game node: clubDamage6; progression: skillTreeClubDamage
setFullTreeNodeDetails(
  "outer-open-split-14-right-1",
  "Club Damage",
  "5% increased Club Weapon Physical Damage",
  [
    { statId: "increased-club-weapon-physical-damage", label: "increased Club Weapon Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Club Weapon Physical Damage" },
  ],
);
// Game node: sledgeDamage4; progression: skillTreeSledgeDamage
setFullTreeNodeDetails(
  "outer-open-split-16-left-3",
  "Sledge Damage",
  "5% increased Sledgehammer Physical Damage",
  [
    { statId: "increased-sledgehammer-physical-damage", label: "increased Sledgehammer Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sledgehammer Physical Damage" },
  ],
);
// Game node: sledgeDamage5; progression: skillTreeSledgeDamage
setFullTreeNodeDetails(
  "outer-open-split-16-left-2",
  "Sledge Damage",
  "5% increased Sledgehammer Physical Damage",
  [
    { statId: "increased-sledgehammer-physical-damage", label: "increased Sledgehammer Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sledgehammer Physical Damage" },
  ],
);
// Game node: sledgeDamage6; progression: skillTreeSledgeDamage
setFullTreeNodeDetails(
  "outer-open-split-16-left-1",
  "Sledge Damage",
  "5% increased Sledgehammer Physical Damage",
  [
    { statId: "increased-sledgehammer-physical-damage", label: "increased Sledgehammer Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Sledgehammer Physical Damage" },
  ],
);
// Game node: sledgeKnockdown4; progression: skillTreeSledgeKnockdown
setFullTreeNodeDetails(
  "outer-open-split-16-right-3",
  "Sledge Knockdown",
  "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets\n5% increased chance to knock down nearby Targets",
  [
    { statId: "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets", label: "increased chance for Sledgehammer Power Attacks to Knock Down Targets", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets" },
    { statId: "increased-chance-to-knock-down-nearby-targets", label: "increased chance to knock down nearby Targets", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased chance to knock down nearby Targets" },
  ],
);
// Game node: sledgeKnockdown5; progression: skillTreeSledgeKnockdown
setFullTreeNodeDetails(
  "outer-open-split-16-right-2",
  "Sledge Knockdown",
  "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets\n5% increased chance to knock down nearby Targets",
  [
    { statId: "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets", label: "increased chance for Sledgehammer Power Attacks to Knock Down Targets", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets" },
    { statId: "increased-chance-to-knock-down-nearby-targets", label: "increased chance to knock down nearby Targets", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased chance to knock down nearby Targets" },
  ],
);
// Game node: sledgeKnockdown6; progression: skillTreeSledgeKnockdown
setFullTreeNodeDetails(
  "outer-open-split-16-right-1",
  "Sledge Knockdown",
  "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets\n5% increased chance to knock down nearby Targets",
  [
    { statId: "increased-chance-for-sledgehammer-power-attacks-to-knock-down-targets", label: "increased chance for Sledgehammer Power Attacks to Knock Down Targets", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased chance for Sledgehammer Power Attacks to Knock Down Targets" },
    { statId: "increased-chance-to-knock-down-nearby-targets", label: "increased chance to knock down nearby Targets", valuePerRank: 5, unit: "percent", sortOrder: 2, displayText: "5% increased chance to knock down nearby Targets" },
  ],
);
// Game node: meleeDamage1; progression: skillTreeMeleeDamage05
setFullTreeNodeDetails(
  "outer-open-split-17-left-3",
  "Melee Damage05",
  "5% increased Melee Physical Damage",
  [
    { statId: "increased-melee-physical-damage", label: "increased Melee Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Melee Physical Damage" },
  ],
);
// Game node: meleeDamage2; progression: skillTreeMeleeDamage05
setFullTreeNodeDetails(
  "outer-open-split-17-left-2",
  "Melee Damage05",
  "5% increased Melee Physical Damage",
  [
    { statId: "increased-melee-physical-damage", label: "increased Melee Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Melee Physical Damage" },
  ],
);
// Game node: meleeDamage3; progression: skillTreeMeleeDamage05
setFullTreeNodeDetails(
  "outer-open-split-17-left-1",
  "Melee Damage05",
  "5% increased Melee Physical Damage",
  [
    { statId: "increased-melee-physical-damage", label: "increased Melee Physical Damage", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Melee Physical Damage" },
  ],
);
// Game node: meleeSpeed1; progression: skillTreeMeleeSpeed05
setFullTreeNodeDetails(
  "outer-open-split-17-right-3",
  "Melee Speed05",
  "5% increased Melee Weapon Attack Speed",
  [
    { statId: "increased-melee-weapon-attack-speed", label: "increased Melee Weapon Attack Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Melee Weapon Attack Speed" },
  ],
);
// Game node: meleeSpeed2; progression: skillTreeMeleeSpeed05
setFullTreeNodeDetails(
  "outer-open-split-17-right-2",
  "Melee Speed05",
  "5% increased Melee Weapon Attack Speed",
  [
    { statId: "increased-melee-weapon-attack-speed", label: "increased Melee Weapon Attack Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Melee Weapon Attack Speed" },
  ],
);
// Game node: meleeSpeed3; progression: skillTreeMeleeSpeed05
setFullTreeNodeDetails(
  "outer-open-split-17-right-1",
  "Melee Speed05",
  "5% increased Melee Weapon Attack Speed",
  [
    { statId: "increased-melee-weapon-attack-speed", label: "increased Melee Weapon Attack Speed", valuePerRank: 5, unit: "percent", sortOrder: 1, displayText: "5% increased Melee Weapon Attack Speed" },
  ],
);


if (fullTreeOverlayMissingIds.length > 0) {
  console.warn("Full-tree overlay skipped missing planner nodes:", fullTreeOverlayMissingIds);
}

export const prototypeSkills = skills;

export const prototypeEdges: SkillEdge[] = (() => {
  const seen = new Set<string>();
  const edges: SkillEdge[] = [];

  for (const skill of skills) {
    for (
      const neighbor of
        skill.prerequisiteGroups?.flat() ?? skill.prerequisites
    ) {
      const id = [skill.id, neighbor].sort().join("--");
      if (seen.has(id)) continue;

      seen.add(id);
      edges.push({ id, from: neighbor, to: skill.id });
    }
  }

  return edges;
})();
/*
 * ===========================================================================
 * AUTHORITATIVE RING-CONNECTOR CORRECTIONS
 * Append at the VERY END of prototypeSkills.ts (after BOTH overlays).
 * ===========================================================================
 *
 * ROOT CAUSE
 * ----------
 * The planner's inner ring is 30 nodes = 15 module top-junctions interleaved
 * with 15 connectors. The tree code names connectors by INNER-MODULE CREATION
 * ORDER:
 *     fortitude m1,m2,m3 -> perception m1,m2,m3 -> ... -> strength m3  = 1..15
 * but the overlay generator numbered them by ANGULAR POSITION among all 30
 * ring nodes, emitting outer-ring-connector-1..30. Result:
 *   - refs 16..30 hit non-existent ids (silently dropped),
 *   - existing 1..15 received the WRONG game node.
 *
 * The correct game node for each connector is found by angle:
 *     game_angle = planner_angle + 90
 * validated against every known-good partial-overlay mapping (connectors
 * 1, 3, 15) and the in-game-confirmed connector 2 (Maximum Health).
 *
 * This block runs last, so it authoritatively restores all 15 connectors and
 * is safe to re-run. Data sourced from recipes_skills.xml (geometry +
 * progression) and English.txt (display strings).
 */
const ringConnectorCorrections: Array<{
  id: string;
  name: string;
  description: string;
  effects: SkillNode["effects"];
}> = [
  {
    // gameAngle 348 -> resistDamage1 / skillTreeResistDamage
    id: "outer-ring-connector-1",
    name: "Damage Resistance",
    description:
      "4% increased Physical Damage Resistance\n10% increased Stun Resistance",
    effects: [
      { statId: "increased-physical-damage-resistance", label: "increased Physical Damage Resistance", valuePerRank: 4, unit: "percent", sortOrder: 1, displayText: "4% increased Physical Damage Resistance" },
      { statId: "stun-resistance", label: "increased Stun Resistance", valuePerRank: 10, unit: "percent", sortOrder: 2, displayText: "10% increased Stun Resistance" },
    ],
  },
  {
    // gameAngle 12 -> healthMax1 / skillTreeHealth05  (IN-GAME CONFIRMED)
    id: "outer-ring-connector-2",
    name: "Maximum Health",
    description: "+5 to Maximum Health",
    effects: [
      { statId: "to-maximum-health", label: "to Maximum Health", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Maximum Health" },
    ],
  },
  {
    // gameAngle 36 -> intellect_036_11 / Intellect
    id: "outer-ring-connector-3",
    name: "Intellect",
    description: "+5 to Intellect",
    effects: [
      { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
    ],
  },
  {
    // gameAngle 60 -> tracker1 / skillTreeTrackAnimalsSmall
    id: "outer-ring-connector-4",
    name: "Track Animals Small",
    description:
      "Track small game like rabbits, snakes or chickens. They are marked on your compass and map",
    effects: [
      { statId: "display-only-skilltreetrackanimalssmall-0", label: "Track small game like rabbits, snakes or chickens. They are marked on your compass and map", valuePerRank: 0, unit: "flat", sortOrder: 1, displayText: "Track small game like rabbits, snakes or chickens. They are marked on your compass and map", includeInTotals: false },
    ],
  },
  {
    // gameAngle 84 -> forager1 / skillTreeForager
    id: "outer-ring-connector-5",
    name: "Forager",
    description:
      "50% Chance to harvest an additional plant\nIncreased harvesting area by 1 while using a Sickle or Scythe",
    effects: [
      { statId: "chance-to-harvest-an-additional-plant", label: "Chance to harvest an additional plant", valuePerRank: 50, unit: "percent", sortOrder: 1, displayText: "50% Chance to harvest an additional plant" },
      { statId: "increased-harvesting-area-by-while-using-a-sickle-or-scythe", label: "Increased harvesting area by while using a Sickle or Scythe", valuePerRank: 1, unit: "flat", sortOrder: 2, displayText: "Increased harvesting area by 1 while using a Sickle or Scythe" },
    ],
  },
  {
    // gameAngle 108 -> strength_108_11 / Strength
    id: "outer-ring-connector-6",
    name: "Strength",
    description: "+5 to Strength",
    effects: [
      { statId: "strength", label: "Strength", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Strength" },
    ],
  },
  {
    // gameAngle 132 -> firearmRunAndGun3 / skillTreeFirearmRunAndGun
    id: "outer-ring-connector-7",
    name: "Firearm Run And Gun",
    description:
      "10% increased Hip Fire Accuracy\n33% reduced movement penalty when reloading",
    effects: [
      { statId: "increased-hip-fire-accuracy", label: "increased Hip Fire Accuracy", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% increased Hip Fire Accuracy" },
      { statId: "reduced-movement-penalty-when-reloading", label: "reduced movement penalty when reloading", valuePerRank: 33, unit: "percent", sortOrder: 2, displayText: "33% reduced movement penalty when reloading" },
    ],
  },
  {
    // gameAngle 156 -> meleeStaminaUse1 / skillTreeMeleeStaminaUse
    id: "outer-ring-connector-8",
    name: "Melee Stamina Use",
    description:
      "10% less Stamina Used by Melee Attacks\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
    effects: [
      { statId: "less-stamina-used-by-melee-attacks", label: "less Stamina Used by Melee Attacks", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% less Stamina Used by Melee Attacks" },
      { statId: "recover-stamina-per-enemy-killed-using-melee-weapons", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
    ],
  },
  {
    // gameAngle 180 -> fortitude_180_11 / Fortitude
    id: "outer-ring-connector-9",
    name: "Fortitude",
    description: "+5 to Fortitude",
    effects: [
      { statId: "fortitude", label: "Fortitude", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Fortitude" },
    ],
  },
  {
    // gameAngle 204 -> supportPerception1 / Perception
    id: "outer-ring-connector-10",
    name: "Perception",
    description: "+5 to Perception",
    effects: [
      { statId: "perception", label: "Perception", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Perception" },
    ],
  },
  {
    // gameAngle 228 -> turretElectricalTrapXP1 / skillTreeElectricalTrapXP
    id: "outer-ring-connector-11",
    name: "Electrical Trap XP",
    description: "20% increased Experience Gained from Electrical Trap kills",
    effects: [
      { statId: "increased-experience-gained-from-electrical-trap-kills", label: "increased Experience Gained from Electrical Trap kills", valuePerRank: 20, unit: "percent", sortOrder: 1, displayText: "20% increased Experience Gained from Electrical Trap kills" },
    ],
  },
  {
    // gameAngle 252 -> meleeStaminaUse3 / skillTreeMeleeStaminaUse
    id: "outer-ring-connector-12",
    name: "Melee Stamina Use",
    description:
      "10% less Stamina Used by Melee Attacks\nRecover 5 Stamina per Enemy Killed using Melee Weapons",
    effects: [
      { statId: "less-stamina-used-by-melee-attacks", label: "less Stamina Used by Melee Attacks", valuePerRank: 10, unit: "percent", sortOrder: 1, displayText: "10% less Stamina Used by Melee Attacks" },
      { statId: "recover-stamina-per-enemy-killed-using-melee-weapons", label: "Recover Stamina per Enemy Killed using Melee Weapons", valuePerRank: 5, unit: "flat", sortOrder: 2, displayText: "Recover 5 Stamina per Enemy Killed using Melee Weapons" },
    ],
  },
  {
    // gameAngle 276 -> dexterity_276_11 / Dexterity
    id: "outer-ring-connector-13",
    name: "Dexterity",
    description: "+5 to Dexterity",
    effects: [
      { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
    ],
  },
  {
    // gameAngle 300 -> intellect_300_11 / Intellect
    id: "outer-ring-connector-14",
    name: "Intellect",
    description: "+5 to Intellect",
    effects: [
      { statId: "intellect", label: "Intellect", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Intellect" },
    ],
  },
  {
    // gameAngle 324 -> dexterity_324_11 / Dexterity
    id: "outer-ring-connector-15",
    name: "Dexterity",
    description: "+5 to Dexterity",
    effects: [
      { statId: "dexterity", label: "Dexterity", valuePerRank: 5, unit: "flat", sortOrder: 1, displayText: "+5 to Dexterity" },
    ],
  },
];

for (const fix of ringConnectorCorrections) {
  const node = skills.find((skill) => skill.id === fix.id);
  if (!node) {
    console.warn(`ringConnectorCorrections: missing node ${fix.id}`);
    continue;
  }
  node.name = fix.name;
  node.description = fix.description;
  node.effects = fix.effects;
  node.maxRank = 1;
}

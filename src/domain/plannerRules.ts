import type { PlannerBuild, SkillNode } from "./types";

interface GraphIndex {
  byId: Map<string, SkillNode>;
  neighborsById: Map<string, string[]>;
}

const graphCache = new WeakMap<SkillNode[], GraphIndex>();

function getGraph(skills: SkillNode[]): GraphIndex {
  const cached = graphCache.get(skills);
  if (cached) return cached;
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const sets = new Map<string, Set<string>>(
    skills.map((skill) => [skill.id, new Set<string>()]),
  );
  for (const skill of skills) {
    for (const neighborId of getPrerequisiteGroups(skill).flat()) {
      if (!byId.has(neighborId)) continue;
      sets.get(skill.id)!.add(neighborId);
      sets.get(neighborId)!.add(skill.id);
    }
  }
  const neighborsById = new Map(
    [...sets].map(([id, neighbors]) => [id, [...neighbors]]),
  );
  const graph = { byId, neighborsById };
  graphCache.set(skills, graph);
  return graph;
}

export function getSkillRank(build: PlannerBuild, skillId: string): number {
  return build.purchasedRanks[skillId] ?? 0;
}
export function isSkillPurchased(build: PlannerBuild, skillId: string): boolean {
  return getSkillRank(build, skillId) > 0;
}
export function findSkillById(skills: SkillNode[], skillId: string): SkillNode | undefined {
  return getGraph(skills).byId.get(skillId);
}
export function calculateSpentSkillPoints(build: PlannerBuild, skills: SkillNode[]): number {
  return skills.reduce((total, skill) =>
    total + (isSkillPurchased(build, skill.id) ? skill.cost : 0), 0);
}
export function calculateAvailableSkillPoints(total: number, spent: number): number {
  return Math.max(0, total - spent);
}
export function getPrerequisiteGroups(skill: SkillNode): string[][] {
  if (skill.prerequisiteGroups?.length) return skill.prerequisiteGroups;
  return skill.prerequisites.length ? [skill.prerequisites] : [];
}
function neighbors(skillId: string, skills: SkillNode[]): string[] {
  return getGraph(skills).neighborsById.get(skillId) ?? [];
}
export function arePrerequisitesMet(skill: SkillNode, build: PlannerBuild): boolean {
  const groups = getPrerequisiteGroups(skill);
  return groups.length === 0 || groups.some((group) =>
    group.every((id) => isSkillPurchased(build, id)));
}
export function hasPurchasedDependent(skillId: string, build: PlannerBuild, skills: SkillNode[]): boolean {
  return neighbors(skillId, skills).some((id) => isSkillPurchased(build, id));
}
function isOtherRoot(skill: SkillNode, selectedClassId: PlannerBuild["selectedClassId"]): boolean {
  return skill.cost === 0 && skill.prerequisites.length === 0 &&
    skill.id !== `${selectedClassId}-root`;
}
export function getCompleteRequiredPath(
  destination: SkillNode,
  skills: SkillNode[],
  build: PlannerBuild = { characterLevel: 1, bonusSkillPoints: 0, selectedClassId: null, purchasedRanks: {} },
): SkillNode[] {
  if (isSkillPurchased(build, destination.id)) return [];
  const graph = getGraph(skills);
  const queue = [destination.id];
  let cursor = 0;
  const visited = new Set(queue);
  const parent = new Map<string, string>();
  let anchor: string | null = null;
  while (cursor < queue.length && anchor === null) {
    const currentId = queue[cursor++];
    for (const neighborId of graph.neighborsById.get(currentId) ?? []) {
      const neighbor = graph.byId.get(neighborId);
      if (!neighbor || isOtherRoot(neighbor, build.selectedClassId)) continue;
      if (isSkillPurchased(build, neighborId)) {
        parent.set(neighborId, currentId);
        anchor = neighborId;
        break;
      }
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      parent.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }
  if (anchor === null) return [destination];
  const path: SkillNode[] = [];
  let currentId = parent.get(anchor);
  while (currentId) {
    const skill = graph.byId.get(currentId);
    if (skill && !isSkillPurchased(build, currentId)) path.push(skill);
    if (currentId === destination.id) break;
    currentId = parent.get(currentId);
  }
  return path;
}
export function getMissingPathSkills(destination: SkillNode, build: PlannerBuild, skills: SkillNode[]): SkillNode[] {
  return getCompleteRequiredPath(destination, skills, build);
}
export function calculatePathCost(destination: SkillNode, build: PlannerBuild, skills: SkillNode[]): number {
  return getMissingPathSkills(destination, build, skills).reduce((sum, skill) => sum + skill.cost, 0);
}
export function canPurchasePath(destination: SkillNode, build: PlannerBuild, skills: SkillNode[], availablePoints: number): boolean {
  return Boolean(build.selectedClassId) && !isSkillPurchased(build, destination.id) &&
    !isOtherRoot(destination, build.selectedClassId) &&
    calculatePathCost(destination, build, skills) <= availablePoints;
}
export function purchaseCompletePath(destination: SkillNode, build: PlannerBuild, skills: SkillNode[]): PlannerBuild {
  const purchasedRanks = { ...build.purchasedRanks };
  for (const skill of getCompleteRequiredPath(destination, skills, build)) purchasedRanks[skill.id] = 1;
  return { ...build, purchasedRanks };
}
export function canRemoveSkillRank(skill: SkillNode, build: PlannerBuild, skills: SkillNode[]): boolean {
  if (skill.cost === 0 || !isSkillPurchased(build, skill.id) || !build.selectedClassId) return false;
  const rootId = `${build.selectedClassId}-root`;
  const reached = new Set([rootId]);
  const queue = [rootId];
  let cursor = 0;
  while (cursor < queue.length) {
    const currentId = queue[cursor++];
    for (const neighborId of neighbors(currentId, skills)) {
      if (neighborId === skill.id || reached.has(neighborId) || !isSkillPurchased(build, neighborId)) continue;
      reached.add(neighborId);
      queue.push(neighborId);
    }
  }
  return skills.every((candidate) => candidate.id === skill.id ||
    !isSkillPurchased(build, candidate.id) || reached.has(candidate.id));
}
export function removeSkillRank(skill: SkillNode, build: PlannerBuild): PlannerBuild {
  const purchasedRanks = { ...build.purchasedRanks };
  delete purchasedRanks[skill.id];
  return { ...build, purchasedRanks };
}

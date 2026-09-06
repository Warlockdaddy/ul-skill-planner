import { useEffect, useMemo, useState } from "react";
import { AttributeSummary } from "./components/AttributeSummary";
import { BuildTotals } from "./components/BuildTotals";
import { SkillTree } from "./components/SkillTree";
import { prototypeContextHubs } from "./data/prototypeContextHubs";
import { prototypeEdges, prototypeSkills } from "./data/prototypeSkills";
import {
  calculateAvailableSkillPoints,
  calculateSpentSkillPoints,
  canPurchasePath,
  canRemoveSkillRank,
  findSkillById,
  getSkillRank,
  hasPurchasedDependent,
  purchaseCompletePath,
  removeSkillRank,
} from "./domain/plannerRules";
import {
  calculateTotalSkillPoints,
  normalizeCharacterLevel,
} from "./domain/skillPoints";
import type { PlannerBuild, SkillCategoryId, SkillNode } from "./domain/types";

const initialBuild: PlannerBuild = {
  characterLevel: 300,
  bonusSkillPoints: 0,
  selectedClassId: null,
  purchasedRanks: {},
};

function isClassRoot(skill: SkillNode): boolean {
  return skill.cost === 0 && skill.prerequisites.length === 0;
}

function getClassRootId(classId: SkillCategoryId): string {
  return `${classId}-root`;
}

const classDisplayNames: Record<SkillCategoryId, string> = {
  fortitude: "Enforcer",
  perception: "Scout",
  dexterity: "Recon",
  intellect: "Specialist",
  strength: "Assault",
};

function getClassDisplayName(classId: SkillCategoryId | null): string {
  return classId === null ? "None" : classDisplayNames[classId];
}

type SharedBuild = {
  v: 1;
  l: number;
  b: number;
  c: SkillCategoryId | null;
  s: string[];
};

const validClassIds = new Set<SkillCategoryId>([
  "strength",
  "fortitude",
  "dexterity",
  "perception",
  "intellect",
]);

const BUILD_CODE_PREFIX = "ULB1.";

function encodeBuildCode(build: SharedBuild): string {
  const bytes = new TextEncoder().encode(JSON.stringify(build));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return BUILD_CODE_PREFIX + btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function decodeBuildCode(code: string): unknown {
  const normalized = code.trim();
  if (!normalized.startsWith(BUILD_CODE_PREFIX)) {
    throw new Error("Build codes must begin with ULB1.");
  }
  const encoded = normalized.slice(BUILD_CODE_PREFIX.length);
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function App() {
  const [build, setBuild] = useState<PlannerBuild>(initialBuild);
  const [buildFileMessage, setBuildFileMessage] = useState<string | null>(null);
  const [buildCodeDialogMode, setBuildCodeDialogMode] = useState<
    "share" | "load" | null
  >(null);
  const [buildCodeInput, setBuildCodeInput] = useState("");

  useEffect(() => {
    if (buildFileMessage !== "Build loaded successfully.") return;

    const timeoutId = window.setTimeout(() => {
      setBuildFileMessage(null);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [buildFileMessage]);

  const totalSkillPoints = useMemo(
    () => calculateTotalSkillPoints(build.characterLevel, build.bonusSkillPoints),
    [build.characterLevel, build.bonusSkillPoints],
  );

  const spentSkillPoints = useMemo(
    () => calculateSpentSkillPoints(build, prototypeSkills),
    [build],
  );

  const availableSkillPoints = calculateAvailableSkillPoints(
    totalSkillPoints,
    spentSkillPoints,
  );

  function handleLevelChange(value: string) {
    setBuild((current) => ({
      ...current,
      characterLevel: normalizeCharacterLevel(Number(value)),
    }));
  }

  function handleBonusPointsChange(value: string) {
    const numericValue = Number(value);
    setBuild((current) => ({
      ...current,
      bonusSkillPoints: Number.isFinite(numericValue)
        ? Math.max(0, Math.floor(numericValue))
        : 0,
    }));
  }

  function handleClassRootClick(skill: SkillNode) {
    if (build.selectedClassId === null) {
      setBuild((current) => ({
        ...current,
        selectedClassId: skill.categoryId,
        purchasedRanks: { ...current.purchasedRanks, [skill.id]: 1 },
      }));
      return;
    }

    if (build.selectedClassId !== skill.categoryId) return;
    if (hasPurchasedDependent(skill.id, build, prototypeSkills)) return;

    setBuild((current) => {
      const purchasedRanks = { ...current.purchasedRanks };
      delete purchasedRanks[skill.id];
      return { ...current, selectedClassId: null, purchasedRanks };
    });
  }

  function createSharedBuild(): SharedBuild {
    return {
      v: 1,
      l: build.characterLevel,
      b: build.bonusSkillPoints,
      c: build.selectedClassId,
      s: prototypeSkills
        .filter((skill) => getSkillRank(build, skill.id) > 0)
        .map((skill) => skill.id),
    };
  }

  function validateSharedBuild(value: unknown): PlannerBuild {
    if (!value || typeof value !== "object") {
      throw new Error("The pasted code does not contain a build.");
    }

    const imported = value as Partial<SharedBuild>;
    if (imported.v !== 1) {
      throw new Error("This build-code version is not supported.");
    }
    if (!Number.isInteger(imported.l) || imported.l! < 1 || imported.l! > 300) {
      throw new Error("Character level must be a whole number from 1 to 300.");
    }
    if (!Number.isInteger(imported.b) || imported.b! < 0) {
      throw new Error("Additional points must be a non-negative whole number.");
    }
    if (imported.c !== null && !validClassIds.has(imported.c as SkillCategoryId)) {
      throw new Error("The build class is not recognized.");
    }
    if (!Array.isArray(imported.s)) {
      throw new Error("The build code has no valid skill list.");
    }

    const knownIds = new Set(prototypeSkills.map((skill) => skill.id));
    const purchasedIds = [...new Set(imported.s)];
    if (purchasedIds.some((id) => typeof id !== "string" || !knownIds.has(id))) {
      throw new Error("The build contains unknown skill nodes.");
    }
    if (imported.c === null && purchasedIds.length > 0) {
      throw new Error("Allocated nodes require a selected class.");
    }
    if (imported.c !== null) {
      const rootId = getClassRootId(imported.c as SkillCategoryId);
      if (!purchasedIds.includes(rootId)) {
        throw new Error("The selected class root is missing from this build.");
      }
      if (purchasedIds.some((id) => id.endsWith("-root") && id !== rootId)) {
        throw new Error("A build cannot contain more than one class root.");
      }
    }

    const importedBuild: PlannerBuild = {
      characterLevel: imported.l!,
      bonusSkillPoints: imported.b!,
      selectedClassId: imported.c as SkillCategoryId | null,
      purchasedRanks: Object.fromEntries(purchasedIds.map((id) => [id, 1])),
    };
    const total = calculateTotalSkillPoints(
      importedBuild.characterLevel,
      importedBuild.bonusSkillPoints,
    );
    const spent = calculateSpentSkillPoints(importedBuild, prototypeSkills);
    if (spent > total) {
      throw new Error(`This build spends ${spent} points but only has ${total} available.`);
    }
    return importedBuild;
  }

  async function handleShareBuild() {
    const code = encodeBuildCode(createSharedBuild());
    setBuildCodeInput(code);
    setBuildCodeDialogMode("share");
    try {
      await navigator.clipboard.writeText(code);
      setBuildFileMessage("Build code copied to clipboard.");
    } catch {
      setBuildFileMessage("Build code generated. Copy it from the box below.");
    }
  }

  function handleLoadBuildCode() {
    try {
      const importedBuild = validateSharedBuild(decodeBuildCode(buildCodeInput));
      setBuild(importedBuild);
      setBuildCodeDialogMode(null);
      setBuildCodeInput("");
      setBuildFileMessage("Build loaded successfully.");
    } catch (error) {
      setBuildFileMessage(
        error instanceof Error ? error.message : "The build code could not be loaded.",
      );
    }
  }

  function handleActivateSkill(skillId: string) {
    const skill = findSkillById(prototypeSkills, skillId);
    if (!skill) return;

    if (isClassRoot(skill)) {
      handleClassRootClick(skill);
      return;
    }

    if (build.selectedClassId === null) {
      return;
    }

    if (getSkillRank(build, skill.id) > 0) {
      if (!canRemoveSkillRank(skill, build, prototypeSkills)) return;
      setBuild((current) => removeSkillRank(skill, current));
      return;
    }

    if (getSkillRank(build, getClassRootId(build.selectedClassId)) === 0) return;

    if (
      !canPurchasePath(
        skill,
        build,
        prototypeSkills,
        availableSkillPoints,
      )
    ) {
      return;
    }

    setBuild((current) =>
      purchaseCompletePath(skill, current, prototypeSkills),
    );
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="header-left">
          <div className="project-heading">
            <h1>UL Skill Planner</h1>
          </div>

          <AttributeSummary build={build} skills={prototypeSkills} />
        </div>

        <div className="header-right">
          <div className="point-summary">
            <div><span>Class</span><strong>{getClassDisplayName(build.selectedClassId)}</strong></div>
            <div><span>Total</span><strong>{totalSkillPoints}</strong></div>
            <div><span>Spent</span><strong>{spentSkillPoints}</strong></div>
            <div><span>Available</span><strong>{availableSkillPoints}</strong></div>
            <button
              type="button"
              className="build-file-button build-file-button--share"
              onClick={handleShareBuild}
            >
              Share Build
            </button>
            <button
              type="button"
              className="build-file-button"
              onClick={() => {
                setBuildCodeInput("");
                setBuildCodeDialogMode("load");
                setBuildFileMessage(null);
              }}
            >
              Load Build
            </button>
            <button
              type="button"
              className="reset-button"
              onClick={() => {
                setBuild((current) => ({
                  ...initialBuild,
                  characterLevel: current.characterLevel,
                }));
                setBuildFileMessage(null);
              }}
            >
              Reset
            </button>
          </div>

          {buildFileMessage ? (
            <p className="build-file-message" role="status">
              {buildFileMessage}
            </p>
          ) : null}

          <div className="level-controls">
          <label>
            <span>Character level</span>
            <input
              type="number"
              min="1"
              max="300"
              value={build.characterLevel}
              onChange={(event) => handleLevelChange(event.target.value)}
            />
          </label>
          <label>
            <span>Additional points</span>
            <input
              type="number"
              min="0"
              value={build.bonusSkillPoints}
              onChange={(event) => handleBonusPointsChange(event.target.value)}
            />
          </label>
          </div>
        </div>
      </header>

      <section className="workspace workspace--three-column">
        <aside className="build-panel">
          <BuildTotals build={build} skills={prototypeSkills} />
        </aside>

        <SkillTree
          skills={prototypeSkills}
          edges={prototypeEdges}
          contextHubs={prototypeContextHubs}
          build={build}
          availableSkillPoints={availableSkillPoints}
          selectedSkillId={null}
          onSelectSkill={() => {}}
          onActivateSkill={handleActivateSkill}
        />

        <aside className="help-panel">
          <section className="instructions">
            <h2>How to use the planner</h2>
            <p>Select exactly one center class before purchasing skills.</p>
            <p>Hover over any node to see its description and bonuses.</p>
            <p>Click an unallocated node to buy its complete required path.</p>
            <p>
              Click an allocated endpoint again to remove it. A prerequisite
              cannot be removed while another allocated node depends on it.
            </p>
            <p>
              Remove every purchased branch skill before deselecting the active
              class.
            </p>
          </section>
        </aside>
      </section>

      {buildCodeDialogMode ? (
        <div className="build-code-dialog-backdrop" role="presentation">
          <section
            className="build-code-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="build-code-dialog-title"
          >
            {buildCodeDialogMode === "share" ? (
              <>
                <h2 id="build-code-dialog-title">Share Build</h2>
                <p>Copy this code and share it with your friends.</p>
                <textarea
                  className="build-code-dialog__input"
                  value={buildCodeInput}
                  readOnly
                  spellCheck={false}
                  autoFocus
                  onFocus={(event) => event.currentTarget.select()}
                />
                <div className="build-code-dialog__actions">
                  <button
                    type="button"
                    className="build-file-button build-file-button--share"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(buildCodeInput);
                        setBuildFileMessage("Build code copied to clipboard.");
                      } catch {
                        setBuildFileMessage("Select the code and copy it manually.");
                      }
                    }}
                  >
                    Copy Code
                  </button>
                  <button
                    type="button"
                    className="reset-button"
                    onClick={() => setBuildCodeDialogMode(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="build-code-dialog-title">Load Build</h2>
                <p>Paste your code here to load the build.</p>
                <textarea
                  className="build-code-dialog__input"
                  value={buildCodeInput}
                  onChange={(event) => setBuildCodeInput(event.target.value)}
                  placeholder="Paste a ULB1 build code here"
                  spellCheck={false}
                  autoFocus
                />
                <div className="build-code-dialog__actions">
                  <button
                    type="button"
                    className="build-file-button"
                    onClick={handleLoadBuildCode}
                    disabled={!buildCodeInput.trim()}
                  >
                    Load Build
                  </button>
                  <button
                    type="button"
                    className="reset-button"
                    onClick={() => setBuildCodeDialogMode(null)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;

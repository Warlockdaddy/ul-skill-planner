import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type {
  PlannerBuild,
  SkillContextHub,
  SkillEdge,
  SkillNode,
} from "../domain/types";
import {
  calculatePathCost,
  canPurchasePath,
  findSkillById,
  getCompleteRequiredPath,
  getSkillRank,
  isSkillPurchased,
} from "../domain/plannerRules";
import { SkillContextHubView } from "./SkillContextHubView";
import { SkillNodeView } from "./SkillNodeView";
import { SkillTooltip } from "./SkillTooltip";

interface SkillTreeProps {
  skills: SkillNode[];
  edges: SkillEdge[];
  contextHubs?: SkillContextHub[];
  build: PlannerBuild;
  availableSkillPoints: number;
  selectedSkillId: string | null;
  onSelectSkill: (skillId: string) => void;
  onActivateSkill: (skillId: string) => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface Point {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  startingPointer: Point;
  startingView: ViewTransform;
}

interface MatchingBonus {
  label: string;
  count: number;
  skillIds: string[];
}

const MINIMUM_ZOOM = 1;
const MAXIMUM_ZOOM = 4;
const TREE_CENTER = 3100;
const ZOOM_SENSITIVITY = 0.0015;
const DRAG_THRESHOLD = 8;
const DEFAULT_VIEW: ViewTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

function isClassRoot(
  skill: SkillNode,
): boolean {
  return (
    skill.cost === 0 &&
    skill.prerequisites.length === 0
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function bonusSortKey(text: string): string {
  return text.replace(/^[^a-z]+/i, "").toLocaleLowerCase();
}

function searchableBonusText(text: string): string {
  return text
    .replace(/\([^()]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function clientPointToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point | null {
  const screenMatrix =
    svg.getScreenCTM();
  if (!screenMatrix) {
    return null;
  }
  const svgPoint = new DOMPoint(
    clientX,
    clientY,
  ).matrixTransform(
    screenMatrix.inverse(),
  );
  return {
    x: svgPoint.x,
    y: svgPoint.y,
  };
}

export function SkillTree({
  skills,
  edges,
  contextHubs = [],
  build,
  availableSkillPoints,
  selectedSkillId,
  onSelectSkill,
  onActivateSkill,
}: SkillTreeProps) {
  const svgRef =
    useRef<SVGSVGElement | null>(null);
  const dragStateRef =
    useRef<DragState | null>(null);
  const isDraggingRef =
    useRef(false);
  const suppressNextClickRef =
    useRef(false);
  const [view, setView] =
    useState<ViewTransform>(
      DEFAULT_VIEW,
    );
  const [isDragging, setIsDragging] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedSearchSkillId, setFocusedSearchSkillId] = useState<string | null>(null);
  const [
    hoveredSkillId,
    setHoveredSkillId,
  ] = useState<string | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const searchMatchIds = useMemo(() => {
    if (!normalizedSearchQuery) return new Set<string>();
    return new Set(
      skills
        .filter((skill) =>
          skill.effects
            .map((effect) => searchableBonusText(effect.displayText ?? effect.label))
            .filter(Boolean)
            .join(" ")
            .includes(normalizedSearchQuery),
        )
        .map((skill) => skill.id),
    );
  }, [normalizedSearchQuery, skills]);

  const matchingBonuses = useMemo<MatchingBonus[]>(() => {
    if (!normalizedSearchQuery) return [];
    const matches = new Map<string, string[]>();
    for (const skill of skills) {
      const seenInSkill = new Set<string>();
      for (const effect of skill.effects) {
        const line = effect.displayText ?? effect.label;
        if (!line) continue;
        if (!searchableBonusText(line).includes(normalizedSearchQuery)) continue;
        if (seenInSkill.has(line)) continue;
        seenInSkill.add(line);
        const skillIds = matches.get(line) ?? [];
        skillIds.push(skill.id);
        matches.set(line, skillIds);
      }
    }
    return [...matches.entries()]
      .map(([label, skillIds]) => ({ label, count: skillIds.length, skillIds }))
      .sort((first, second) => {
        const keyCompare = bonusSortKey(first.label).localeCompare(
          bonusSortKey(second.label),
          undefined,
          { sensitivity: "base" },
        );
        return keyCompare !== 0
          ? keyCompare
          : first.label.localeCompare(second.label);
      });
  }, [normalizedSearchQuery, skills]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0) {
        return;
      }

      setView((currentView) => {
        const nextScale = clamp(
          currentView.scale,
          MINIMUM_ZOOM,
          MAXIMUM_ZOOM,
        );
        if (nextScale === currentView.scale) {
          return currentView;
        }

        const worldX = (TREE_CENTER - currentView.x) / currentView.scale;
        const worldY = (TREE_CENTER - currentView.y) / currentView.scale;
        return {
          scale: nextScale,
          x: TREE_CENTER - worldX * nextScale,
          y: TREE_CENTER - worldY * nextScale,
        };
      });
    });

    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    function handleWheel(
      event: WheelEvent,
    ) {
      event.preventDefault();
      event.stopPropagation();
      const currentSvg = svgRef.current;
      if (!currentSvg) {
        return;
      }
      const cursor =
        clientPointToSvg(
          currentSvg,
          event.clientX,
          event.clientY,
        );
      if (!cursor) {
        return;
      }
      setView((currentView) => {
        const worldX =
          (
            cursor.x -
            currentView.x
          ) / currentView.scale;
        const worldY =
          (
            cursor.y -
            currentView.y
          ) / currentView.scale;
        const zoomFactor = Math.exp(
          -event.deltaY *
            ZOOM_SENSITIVITY,
        );
        const nextScale = clamp(
          currentView.scale *
            zoomFactor,
          MINIMUM_ZOOM,
          MAXIMUM_ZOOM,
        );
        return {
          scale: nextScale,
          x:
            cursor.x -
            worldX * nextScale,
          y:
            cursor.y -
            worldY * nextScale,
        };
      });
    }
    svg.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      },
    );
    return () => {
      svg.removeEventListener(
        "wheel",
        handleWheel,
      );
    };
  }, []);

  function handlePointerDown(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    if (event.button !== 0) {
      return;
    }
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const startingPointer =
      clientPointToSvg(
        svg,
        event.clientX,
        event.clientY,
      );
    if (!startingPointer) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startingPointer,
      startingView: {
        ...view,
      },
    };
    isDraggingRef.current = false;
    suppressNextClickRef.current = false;
  }

  function handlePointerMove(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    const svg = svgRef.current;
    const dragState =
      dragStateRef.current;
    if (
      !svg ||
      !dragState ||
      dragState.pointerId !==
        event.pointerId
    ) {
      return;
    }
    const currentPointer =
      clientPointToSvg(
        svg,
        event.clientX,
        event.clientY,
      );
    if (!currentPointer) {
      return;
    }
    const deltaX =
      currentPointer.x -
      dragState.startingPointer.x;
    const deltaY =
      currentPointer.y -
      dragState.startingPointer.y;
    const movementDistance =
      Math.hypot(
        deltaX,
        deltaY,
      );
    if (
      !isDraggingRef.current &&
      movementDistance <
        DRAG_THRESHOLD
    ) {
      return;
    }
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      suppressNextClickRef.current = true;
      setIsDragging(true);
      setHoveredSkillId(null);
      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    }
    event.preventDefault();
    setView({
      x:
        dragState.startingView.x +
        deltaX,
      y:
        dragState.startingView.y +
        deltaY,
      scale:
        dragState.startingView.scale,
    });
  }

  function finishPointerInteraction(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    const dragState =
      dragStateRef.current;
    if (
      !dragState ||
      dragState.pointerId !==
        event.pointerId
    ) {
      return;
    }
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
    dragStateRef.current = null;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }

  function handleLostPointerCapture() {
    dragStateRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
  }

  function handleClickCapture(
    event: ReactMouseEvent<SVGSVGElement>,
  ) {
    if (!suppressNextClickRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  }

  const handleSkillHoverStart = useCallback((skillId: string) => {
    if (!isDraggingRef.current) setHoveredSkillId(skillId);
  }, []);
  const handleSkillHoverEnd = useCallback(() => setHoveredSkillId(null), []);
  function isSkillClassLocked(skill: SkillNode): boolean {
    if (build.selectedClassId === null) return !isClassRoot(skill);
    return skill.categoryId !== build.selectedClassId;
  }

  const hoveredSkill = useMemo(() => {
    if (
      hoveredSkillId === null
    ) {
      return undefined;
    }
    return findSkillById(
      skills,
      hoveredSkillId,
    );
  }, [
    hoveredSkillId,
    skills,
  ]);

  const previewPath = useMemo<SkillNode[]>(() => {
    if (!hoveredSkill || isDragging) return [];
    if (build.selectedClassId === null && !isClassRoot(hoveredSkill)) return [];
    if (isClassRoot(hoveredSkill) && build.selectedClassId !== null &&
        hoveredSkill.categoryId !== build.selectedClassId) return [];
    return getCompleteRequiredPath(hoveredSkill, skills, build);
  }, [hoveredSkill, skills, build, isDragging]);

  const previewNodeIds = useMemo(
    () => new Set(previewPath.map((skill) => skill.id)),
    [previewPath],
  );

  const previewAffordable = useMemo(() => {
    if (!hoveredSkill) return true;
    if (isClassRoot(hoveredSkill)) return build.selectedClassId === null ||
      build.selectedClassId === hoveredSkill.categoryId;
    if (build.selectedClassId === null) return false;
    if (isSkillPurchased(build, hoveredSkill.id)) return true;
    return canPurchasePath(hoveredSkill, build, skills, availableSkillPoints);
  }, [hoveredSkill, build, skills, availableSkillPoints]);

  function isEdgeOnPreviewPath(edge: SkillEdge): boolean {
    const fromPreview = previewNodeIds.has(edge.from);
    const toPreview = previewNodeIds.has(edge.to);
    return (fromPreview && toPreview) ||
      (fromPreview && isSkillPurchased(build, edge.to)) ||
      (toPreview && isSkillPurchased(build, edge.from));
  }

  function focusSearchBonus(bonus: MatchingBonus) {
    if (bonus.skillIds.length === 0) return;

    const currentIndex = focusedSearchSkillId === null
      ? -1
      : bonus.skillIds.indexOf(focusedSearchSkillId);
    const nextSkillId = bonus.skillIds[(currentIndex + 1) % bonus.skillIds.length];
    const skill = findSkillById(skills, nextSkillId);
    if (!skill) return;

    const nextScale = 2.4;
    setFocusedSearchSkillId(nextSkillId);
    setHoveredSkillId(null);
    setView({
      scale: nextScale,
      x: TREE_CENTER - skill.x * nextScale,
      y: TREE_CENTER - skill.y * nextScale,
    });
  }

  function resetView() {
    setView(DEFAULT_VIEW);
    setHoveredSkillId(null);
    setFocusedSearchSkillId(null);
  }

  function zoomFromCenter(
    zoomFactor: number,
  ) {
    const centerX = TREE_CENTER;
    const centerY = TREE_CENTER;
    setView((currentView) => {
      const worldX =
        (
          centerX -
          currentView.x
        ) / currentView.scale;
      const worldY =
        (
          centerY -
          currentView.y
        ) / currentView.scale;
      const nextScale = clamp(
        currentView.scale *
          zoomFactor,
        MINIMUM_ZOOM,
        MAXIMUM_ZOOM,
      );
      return {
        scale: nextScale,
        x:
          centerX -
          worldX * nextScale,
        y:
          centerY -
          worldY * nextScale,
      };
    });
  }

  return (
    <section className="tree-panel">
      <div className="skill-search" role="search">
        <span className="skill-search__icon" aria-hidden="true">⌕</span>
        <input
          className="skill-search__input"
          type="search"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setFocusedSearchSkillId(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchQuery("");
              setFocusedSearchSkillId(null);
              event.currentTarget.blur();
            }
          }}
          placeholder="Search bonuses"
          aria-label="Search node bonuses"
          spellCheck={false}
        />
        {normalizedSearchQuery ? (
          <span className="skill-search__count" aria-live="polite">
            {searchMatchIds.size} {searchMatchIds.size === 1 ? "match" : "matches"}
          </span>
        ) : null}
        {searchQuery ? (
          <button className="skill-search__clear" type="button" onClick={() => {
            setSearchQuery("");
            setFocusedSearchSkillId(null);
          }} aria-label="Clear bonus search" title="Clear search">×</button>
        ) : null}
        {normalizedSearchQuery && matchingBonuses.length > 0 ? (
          <div className="skill-search__bonuses">
            <p className="skill-search__bonuses-title">
              Bonuses found ({matchingBonuses.length})
            </p>
            <ul className="skill-search__bonuses-list">
              {matchingBonuses.map((bonus) => (
                <li key={bonus.label}>
                  <button
                    type="button"
                    className="skill-search__bonus"
                    onClick={() => focusSearchBonus(bonus)}
                    title={bonus.count === 1
                      ? "Center view on the matching node"
                      : `Center view on a matching node; click again to cycle through ${bonus.count} nodes`}
                  >
                    <span className="skill-search__bonus-label">{bonus.label}</span>
                    <span className="skill-search__bonus-count">{bonus.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <svg
        ref={svgRef}
        className={[
          "skill-tree",
          isDragging
            ? "skill-tree--dragging"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        viewBox="0 0 6200 6200"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Skill tree"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          finishPointerInteraction
        }
        onPointerCancel={
          finishPointerInteraction
        }
        onLostPointerCapture={
          handleLostPointerCapture
        }
        onClickCapture={
          handleClickCapture
        }
      >
        <defs>
          <pattern
            id="planner-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              className="tree-grid-line"
              d="M 40 0 L 0 0 0 40"
            />
          </pattern>
        </defs>
        {/*
          The background remains stationary while the
          skill-tree scene moves and zooms.
        */}
        <rect
          className="tree-background"
          x="0"
          y="0"
          width="6200"
          height="6200"
        />
        <rect
          x="0"
          y="0"
          width="6200"
          height="6200"
          fill="url(#planner-grid)"
          pointerEvents="none"
        />
        {/*
          All movable and zoomable tree content must
          remain inside this transformed group.
        */}
        <g
          className="skill-tree__scene"
          transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
        >
          <g
            className="tree-decorations"
            pointerEvents="none"
          >
            <circle
              cx="3100"
              cy="3100"
              r="105"
            />
            <circle
              cx="3100"
              cy="3100"
              r="235"
            />
            <circle
              cx="3100"
              cy="3100"
              r="390"
            />
          </g>
          {/*
            Draw connection lines beneath nodes.
          */}
          <g
            className="skill-edges"
            pointerEvents="none"
          >
            {edges.map((edge) => {
              const startingSkill =
                findSkillById(
                  skills,
                  edge.from,
                );
              const endingSkill =
                findSkillById(
                  skills,
                  edge.to,
                );
              if (
                !startingSkill ||
                !endingSkill
              ) {
                return null;
              }
              const startingSkillIsPurchased = isSkillPurchased(
                build,
                startingSkill.id,
              );
              const endingSkillIsPurchased = isSkillPurchased(
                build,
                endingSkill.id,
              );
              const edgeIsActive =
                startingSkillIsPurchased && endingSkillIsPurchased;
              const edgeLeadsToAvailableNode =
                build.selectedClassId !== null &&
                ((startingSkillIsPurchased &&
                  !endingSkillIsPurchased &&
                  !isClassRoot(endingSkill)) ||
                  (endingSkillIsPurchased &&
                    !startingSkillIsPurchased &&
                    !isClassRoot(startingSkill)));
              const edgeIsLocked =
                isSkillClassLocked(
                  startingSkill,
                ) ||
                isSkillClassLocked(
                  endingSkill,
                );
              const edgeIsPreviewed =
                isEdgeOnPreviewPath(
                  edge,
                );
              const edgeIsDormant =
                !edgeIsActive && !edgeLeadsToAvailableNode;
              const edgeClassName = [
                "skill-edge",
                edgeIsActive
                  ? "skill-edge--active"
                  : "",
                edgeLeadsToAvailableNode
                  ? "skill-edge--available"
                  : "",
                edgeIsPreviewed
                  ? "skill-edge--preview"
                  : "",
                edgeIsPreviewed &&
                !previewAffordable
                  ? "skill-edge--unaffordable"
                  : "",
                !edgeIsActive &&
                !edgeLeadsToAvailableNode &&
                (edgeIsLocked || edgeIsDormant)
                  ? "skill-edge--class-locked"
                  : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <line
                  key={edge.id}
                  className={
                    edgeClassName
                  }
                  x1={
                    startingSkill.x
                  }
                  y1={
                    startingSkill.y
                  }
                  x2={
                    endingSkill.x
                  }
                  y2={
                    endingSkill.y
                  }
                />
              );
            })}
          </g>
          {/*
            Draw interactive nodes over the connection
            lines.
          */}
          <g
            className="skill-context-hubs"
            pointerEvents="none"
          >
            {contextHubs.map((hub) => (
              <SkillContextHubView
                key={hub.id}
                hub={hub}
              />
            ))}
          </g>
          <g className="skill-nodes">
            {skills.map((skill) => {
              const rank =
                getSkillRank(
                  build,
                  skill.id,
                );
              const classLocked =
                isSkillClassLocked(
                  skill,
                );
              const hasAllocatedNeighbor = edges.some((edge) =>
                (edge.from === skill.id && isSkillPurchased(build, edge.to)) ||
                (edge.to === skill.id && isSkillPurchased(build, edge.from)),
              );
              const classRootAvailable =
                isClassRoot(skill) &&
                (
                  build.selectedClassId ===
                    null ||
                  build.selectedClassId ===
                    skill.categoryId
                );
              const ordinarySkillAvailable =
                !isClassRoot(skill) &&
                !classLocked &&
                (rank > 0 || hasAllocatedNeighbor);
              const skillIsAvailable =
                classRootAvailable ||
                ordinarySkillAvailable;
              const skillIsSelected =
                selectedSkillId === skill.id ||
                focusedSearchSkillId === skill.id;
              const skillIsOnPreviewPath =
                previewNodeIds.has(
                  skill.id,
                );
              return (
                <SkillNodeView
                  key={skill.id}
                  skill={skill}
                  rank={rank}
                  isAvailable={
                    skillIsAvailable
                  }
                  isSelected={
                    skillIsSelected
                  }
                  isPathPreview={
                    skillIsOnPreviewPath
                  }
                  canAffordPath={
                    previewAffordable
                  }
                  isSearchMatch={searchMatchIds.has(skill.id)}
                  onSelect={
                    onSelectSkill
                  }
                  onActivate={
                    onActivateSkill
                  }
                  onHoverStart={handleSkillHoverStart}
                  onHoverEnd={handleSkillHoverEnd}
                />
              );
            })}
          </g>
          {hoveredSkill && !isDragging && (
            <SkillTooltip
              skill={hoveredSkill}
              rank={getSkillRank(build, hoveredSkill.id)}
              pathCost={getSkillRank(build, hoveredSkill.id) > 0
                ? 0
                : calculatePathCost(hoveredSkill, build, skills)}
              isAvailable={isClassRoot(hoveredSkill)
                ? build.selectedClassId === null || build.selectedClassId === hoveredSkill.categoryId
                : build.selectedClassId !== null &&
                  canPurchasePath(hoveredSkill, build, skills, availableSkillPoints)}
            />
          )}
        </g>
      </svg>
      <div
        className="tree-zoom-controls"
        aria-label="Skill tree navigation controls"
      >
        <button
          type="button"
          onClick={() => {
            zoomFromCenter(1.2);
          }}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <output
          className="tree-zoom-level"
          aria-label="Current zoom level"
        >
          {Math.round(
            view.scale * 100,
          )}
          %
        </output>
        <button
          type="button"
          onClick={() => {
            zoomFromCenter(
              1 / 1.2,
            );
          }}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="tree-zoom-reset"
          onClick={resetView}
          aria-label="Reset skill tree view"
          title="Reset view"
        >
          Reset view
        </button>
      </div>
    </section>
  );
}

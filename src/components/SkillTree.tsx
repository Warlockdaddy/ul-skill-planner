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

/**
 * One matching bonus line shown beneath the search bar.
 * count is the number of nodes that grant this exact bonus line.
 */
interface MatchingBonus {
  label: string;
  count: number;
}

/**
 * scale=1 is the fitted view: the 6200x6200 SVG viewBox already scales itself
 * to the browser window. Allowing scale below 1 shrinks the tree inside that
 * fitted canvas, which is what produced the apparently endless zoom-out state.
 */
const MINIMUM_ZOOM = 1;
const MAXIMUM_ZOOM = 4;
const TREE_CENTER = 3100;
const ZOOM_SENSITIVITY = 0.0015;
/**
 * A pointer must move this many SVG units before the
 * interaction becomes a drag.
 *
 * This allows normal node clicks to work even if the
 * mouse moves slightly during the click.
 */
const DRAG_THRESHOLD = 8;
const DEFAULT_VIEW: ViewTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

/**
 * Returns true when the skill is one of the five
 * center class-selection nodes.
 */
function isClassRoot(
  skill: SkillNode,
): boolean {
  return (
    skill.cost === 0 &&
    skill.prerequisites.length === 0
  );
}

/**
 * Prevents zoom from going below or above the
 * configured limits.
 */
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

/**
 * Sort key that ignores any leading non-letter characters
 * (such as +, %, or a numeric value) so bonuses order by
 * their first real word. For example, "+5 to Fortitude"
 * sorts under F and "10% increased Baton Damage" sorts
 * under I, exactly as a reader expects.
 */
function bonusSortKey(text: string): string {
  return text.replace(/^[^a-z]+/i, "").toLocaleLowerCase();
}

/**
 * Removes parenthetical qualifier and exclusion notes from the searchable
 * copy of a bonus. The original text remains unchanged for tooltips and UI.
 */
function searchableBonusText(text: string): string {
  return text
    .replace(/\([^()]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

/**
 * Converts browser cursor coordinates into the SVG's
 * internal 0 to 1000 coordinate system.
 *
 * This keeps zooming and dragging accurate even when
 * the browser window changes size.
 */
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
  /**
   * Stores the starting position of the current
   * possible drag operation.
   */
  const dragStateRef =
    useRef<DragState | null>(null);
  /**
   * Tracks dragging immediately without waiting for
   * React to update state.
   */
  const isDraggingRef =
    useRef(false);
  /**
   * Prevents the browser-generated click event that
   * normally occurs after releasing a drag.
   */
  const suppressNextClickRef =
    useRef(false);
  const [view, setView] =
    useState<ViewTransform>(
      DEFAULT_VIEW,
    );
  const [isDragging, setIsDragging] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  /**
   * Collect every individual bonus line that matches the
   * current query, deduplicated, with a count of how many
   * nodes grant it. Built from the same displayText ?? label
   * text the match counter scans, so the list and the count
   * always agree. Sorted alphabetically by first real word.
   */
  const matchingBonuses = useMemo<MatchingBonus[]>(() => {
    if (!normalizedSearchQuery) return [];
    const counts = new Map<string, number>();
    for (const skill of skills) {
      const seenInSkill = new Set<string>();
      for (const effect of skill.effects) {
        const line = effect.displayText ?? effect.label;
        if (!line) continue;
        if (!searchableBonusText(line).includes(normalizedSearchQuery)) continue;
        /* Count each node once per distinct bonus line. */
        if (seenInSkill.has(line)) continue;
        seenInSkill.add(line);
        counts.set(line, (counts.get(line) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
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

  /**
   * Add cursor-centered mouse-wheel zoom directly to
   * the skill-tree SVG.
   *
   * The wheel listener is non-passive so preventDefault
   * can stop the webpage from scrolling while the
   * cursor is over the skill tree.
   */
  /**
   * Keep the transform valid when the SVG changes size.
   *
   * The SVG viewBox performs the actual responsive fit. This observer only
   * repairs stale/out-of-range transforms after minimize, maximize, docking,
   * mobile rotation, or panel resizing. It derives the correction from the
   * current state instead of multiplying by the previous element size, so
   * repeated resizes cannot accumulate zoom drift.
   */
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

        /* Preserve the same world point beneath the center while clamping. */
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
        /**
         * Find the untransformed tree coordinate that
         * currently appears beneath the cursor.
         */
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
        /**
         * Exponential scaling works smoothly with both
         * mouse wheels and laptop touchpads.
         */
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
        /**
         * Move the scene so the same world coordinate
         * remains beneath the cursor after zooming.
         */
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

  /**
   * Begin tracking a possible drag.
   *
   * Pointer capture does not begin here. Waiting until
   * actual movement is detected allows normal node
   * clicks to reach SkillNodeView.
   */
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

  /**
   * Turn the possible drag into a real drag once the
   * pointer has moved beyond the threshold.
   */
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
    /**
     * Allow normal clicking while the pointer movement
     * remains below the drag threshold.
     */
    if (
      !isDraggingRef.current &&
      movementDistance <
        DRAG_THRESHOLD
    ) {
      return;
    }
    /**
     * The pointer moved far enough that the interaction
     * is now officially a drag.
     */
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      suppressNextClickRef.current = true;
      setIsDragging(true);
      setHoveredSkillId(null);
      /**
       * Capture only after dragging begins.
       *
       * This is the important behavior that preserves
       * ordinary node clicks.
       */
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

  /**
   * End a pointer interaction.
   */
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

  /**
   * Cancel dragging if the pointer is lost unexpectedly.
   */
  function handleLostPointerCapture() {
    dragStateRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
  }

  /**
   * Prevent the click generated after a drag from
   * activating a node.
   *
   * Normal clicks are unaffected because this ref is
   * only enabled after the drag threshold is exceeded.
   */
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

  /**
   * Determine whether a node belongs to a class that
   * the user cannot currently access.
   */
  const handleSkillHoverStart = useCallback((skillId: string) => {
    if (!isDraggingRef.current) setHoveredSkillId(skillId);
  }, []);
  const handleSkillHoverEnd = useCallback(() => setHoveredSkillId(null), []);
  function isSkillClassLocked(skill: SkillNode): boolean {
    if (build.selectedClassId === null) return !isClassRoot(skill);
    return skill.categoryId !== build.selectedClassId;
  }

  /**
   * Find the full skill object for the node currently
   * beneath the cursor.
   */
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

  /**
   * Calculate the complete prerequisite path leading
   * to the hovered node.
   */
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

  /**
   * Restore the default position and zoom.
   */
  function resetView() {
    setView(DEFAULT_VIEW);
    setHoveredSkillId(null);
  }

  /**
   * Zoom around the center of the skill-tree viewport
   * when the user presses an on-screen zoom button.
   *
   * Mouse-wheel zoom remains centered on the cursor.
   */
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
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchQuery("");
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
          <button className="skill-search__clear" type="button" onClick={() => setSearchQuery("")} aria-label="Clear bonus search" title="Clear search">×</button>
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
                    onClick={() => setSearchQuery(bonus.label)}
                    title={`Search for "${bonus.label}"`}
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
              /**
               * Every untraveled segment stays fully dim. An edge is visually
               * reachable only when it connects a purchased node directly to
               * the next unpurchased node.
               */
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
              /**
               * A class root is available before a class
               * is selected, or when it is the active
               * class.
               */
              const classRootAvailable =
                isClassRoot(skill) &&
                (
                  build.selectedClassId ===
                    null ||
                  build.selectedClassId ===
                    skill.categoryId
                );
              /**
               * An ordinary skill is available only when
               * it belongs to the active class and its
               * immediate requirements are purchased.
               */
              const ordinarySkillAvailable =
                !isClassRoot(skill) &&
                !classLocked &&
                (rank > 0 || hasAllocatedNeighbor);
              const skillIsAvailable =
                classRootAvailable ||
                ordinarySkillAvailable;
              const skillIsSelected =
                selectedSkillId ===
                skill.id;
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

import { memo } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { SkillNode } from "../domain/types";
import { getNodeIconSrc } from "../data/iconAssignments";
import { SkillSymbol } from "./SkillSymbol";

interface SkillNodeViewProps {
  skill: SkillNode;
  rank: number;
  isAvailable: boolean;
  isSelected: boolean;
  isPathPreview: boolean;
  canAffordPath: boolean;
  isSearchMatch: boolean;
  onSelect: (skillId: string) => void;
  onActivate: (skillId: string) => void;
  onHoverStart: (skillId: string) => void;
  onHoverEnd: () => void;
}

/**
 * Debug switch: when the page URL contains ?nodeids (or ?nodeids=1), every
 * skill node renders its exact id beneath it so nodes can be identified
 * precisely (mirrors the ?hubids overlay for context hubs). This is the
 * surefire way to tell which node has, for example, a wrong bonus in the data.
 *
 * Examples that enable it:
 *   http://localhost:5173/?nodeids
 *   http://localhost:5173/?nodeids=1
 * It can be combined with the hub overlay: ?hubids&nodeids
 */
const NODE_ID_DEBUG: boolean =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("nodeids");

function SkillNodeViewComponent({
  skill,
  rank,
  isAvailable,
  isSelected,
  isPathPreview,
  canAffordPath,
  isSearchMatch,
  onSelect,
  onActivate,
  onHoverStart,
  onHoverEnd,
}: SkillNodeViewProps) {
  const isPurchased = rank > 0;
  const isRoot = skill.cost === 0 && skill.prerequisites.length === 0;
  const pureAttributeEffect =
    !isRoot &&
    skill.effects.length === 1 &&
    skill.effects[0].valuePerRank === 5 &&
    skill.effects[0].unit === "flat" &&
    ["strength", "fortitude", "dexterity", "perception", "intellect"].includes(
      skill.effects[0].statId,
    )
      ? skill.effects[0]
      : null;
  const pureAttributeId = pureAttributeEffect?.statId ?? null;
  /**
   * These three Strength nodes share their visible bonus wording with the
   * Submachine Gun branch, but represent the separate Machine Gun branch.
   * Give only these nodes their dedicated AK-47 artwork.
   */
  const machineGunIconOverride =
    skill.id === "strength-module-3-left-1" ||
    skill.id === "strength-module-3-left-2" ||
    skill.id === "strength-module-3-left-3";
  /**
   * Custom white-silhouette artwork is normally resolved from shared bonuses.
   * The targeted Machine Gun nodes use their dedicated AK-47 PNG instead.
   */
  const nodeIconSrc = machineGunIconOverride
    ? `${import.meta.env.BASE_URL}icons/skills/ak47.png`
    : !isRoot
      ? getNodeIconSrc(skill)
      : undefined;
  const imageClassIcons = new Set([
    "class-enforcer",
    "class-scout",
    "class-recon",
    "class-specialist",
    "class-assault",
  ]);
  const isImageClassIcon = isRoot && imageClassIcons.has(skill.icon);
  const radius = isRoot ? 88 : 29;
  const stateClass = isPurchased
    ? "skill-node--purchased"
    : isAvailable
      ? "skill-node--available"
      : "skill-node--locked";
  const className = [
    "skill-node",
    stateClass,
    isSelected ? "skill-node--selected" : "",
    isPathPreview ? "skill-node--path-preview" : "",
    isPathPreview && !canAffordPath ? "skill-node--path-unaffordable" : "",
    isSearchMatch ? "skill-node--search-match" : "",
    `skill-node--${skill.categoryId}`,
    pureAttributeId ? `skill-node--pure-attribute skill-node--attribute-${pureAttributeId}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  function activate(event: MouseEvent<SVGGElement>) {
    event.stopPropagation();
    onSelect(skill.id);
    onActivate(skill.id);
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(skill.id);
    onActivate(skill.id);
  }

  const symbolBoxSize = isImageClassIcon ? 166 : isRoot ? 92 : 36;
  const symbolSize = isImageClassIcon ? 166 : isRoot ? 80 : 30;
  const symbolBoxOffset = -symbolBoxSize / 2;

  return (
    <g
      className={className}
      transform={`translate(${skill.x} ${skill.y})`}
      onClick={activate}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHoverStart(skill.id)}
      onMouseLeave={onHoverEnd}
      role="button"
      aria-label={`${skill.name}, rank ${rank} of ${skill.maxRank}`}
      aria-pressed={isPurchased}
      tabIndex={0}
    >
      <circle className="skill-node__selection" r={radius + 8} />
      <circle className="skill-node__body" r={radius} />
      <circle className="skill-node__inner" r={radius - 5} />
      <foreignObject
        x={symbolBoxOffset}
        y={symbolBoxOffset}
        width={symbolBoxSize}
        height={symbolBoxSize}
        pointerEvents="none"
      >
        <div
          className={[
            "skill-node__symbol-container",
            isRoot ? "skill-node__symbol-container--class-root" : "",
            isImageClassIcon
              ? "skill-node__symbol-container--image-class-root"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            width: symbolBoxSize,
            height: symbolBoxSize,
            borderRadius: isImageClassIcon ? "50%" : undefined,
            overflow: isImageClassIcon ? "hidden" : undefined,
            clipPath: isImageClassIcon
              ? "circle(50% at 50% 50%)"
              : undefined,
          }}
        >
          {nodeIconSrc ? (
            <img
              className="skill-symbol-image skill-symbol-image--attribute"
              src={nodeIconSrc}
              alt=""
              width={30}
              height={30}
              aria-hidden="true"
              draggable={false}
              style={{
                display: "block",
                width: 30,
                height: 30,
                objectFit: "contain",
                imageRendering: "pixelated",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          ) : (
            <SkillSymbol icon={skill.icon} size={symbolSize} />
          )}
        </div>
      </foreignObject>
      {NODE_ID_DEBUG && !isRoot ? (
        <g pointerEvents="none">
          {/* Backing plate so the id stays readable over any background. */}
          <rect
            x={-skill.id.length * 3.4 - 5}
            y={radius + 4}
            width={skill.id.length * 6.8 + 10}
            height={20}
            rx={4}
            fill="rgba(4, 8, 10, 0.9)"
            stroke="#7fd4ff"
            strokeWidth={1.25}
          />
          <text
            x={0}
            y={radius + 18}
            textAnchor="middle"
            fontSize={12}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fontWeight={700}
            fill="#c7ecff"
          >
            {skill.id}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export const SkillNodeView = memo(
  SkillNodeViewComponent,
  (previous, next) =>
    previous.skill === next.skill &&
    previous.rank === next.rank &&
    previous.isAvailable === next.isAvailable &&
    previous.isSelected === next.isSelected &&
    previous.isPathPreview === next.isPathPreview &&
    previous.canAffordPath === next.canAffordPath &&
    previous.isSearchMatch === next.isSearchMatch &&
    previous.onSelect === next.onSelect &&
    previous.onActivate === next.onActivate &&
    previous.onHoverStart === next.onHoverStart &&
    previous.onHoverEnd === next.onHoverEnd,
);

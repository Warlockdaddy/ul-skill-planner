import { useLayoutEffect, useRef, useState } from "react";
import type { SkillEffect, SkillNode } from "../domain/types";

interface SkillTooltipProps {
  skill: SkillNode;
  rank: number;
  isAvailable: boolean;
  pathCost: number;
}

function formatEffect(effect: SkillEffect): string {
  if (effect.displayText) return effect.displayText;

  const sign = effect.valuePerRank > 0 ? "+" : "";
  const suffix = effect.unit === "percent" ? "%" : "";
  return `${sign}${effect.valuePerRank}${suffix} ${effect.label}`;
}

function getClassBonusLines(skill: SkillNode): string[] {
  const lines = skill.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  /*
   * Class descriptions begin with a spaced banner such as E N F O R C E R.
   * The class name is already rendered as the tooltip heading, so omit only
   * that banner and preserve all localized bonus lines exactly as supplied.
   */
  if (lines.length > 0) {
    const compactFirstLine = lines[0].replace(/\s+/g, "").toLowerCase();
    const compactName = skill.name.replace(/\s+/g, "").toLowerCase();
    if (compactFirstLine === compactName) lines.shift();
  }

  return lines;
}

function estimateWrappedLines(lines: string[], charactersPerLine: number): number {
  return Math.max(
    1,
    lines.reduce(
      (total, line) => total + Math.max(1, Math.ceil(line.length / charactersPerLine)),
      0,
    ),
  );
}

export function SkillTooltip({
  skill,
  rank,
  pathCost,
}: SkillTooltipProps) {
  const isPurchased = rank > 0;
  const isClassNode =
    skill.cost === 0 && skill.prerequisites.length === 0;
  const classBonusLines = isClassNode ? getClassBonusLines(skill) : [];
  const ordinaryEffectLines = skill.effects.map(formatEffect);
  const displayedLines = isClassNode ? classBonusLines : ordinaryEffectLines;
  const width = 720;
  const estimatedLines = estimateWrappedLines(displayedLines, 31);
  const nameLines = isClassNode
    ? Math.max(1, Math.ceil(skill.name.length / 24))
    : 0;
  const lineGaps = Math.max(0, displayedLines.length - 1) * 10;

  /* Reserve enough SVG height for all wrapped lines and the optional cost row. */
  const estimatedHeight = isClassNode
    ? 56 + nameLines * 52 + 22 + 34 + estimatedLines * 39 + lineGaps + 24 + 66 + 18
    : 56 + 34 + estimatedLines * 39 + lineGaps + 24 + 66 + 18;
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(tooltip.scrollHeight + 4);
      setMeasuredHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight,
      );
    };

    updateHeight();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateHeight);
    observer.observe(tooltip);
    return () => observer.disconnect();
  }, [skill.id, isPurchased, pathCost]);

  const height = measuredHeight ?? estimatedHeight;
  const radius = isClassNode ? 88 : 29;
  const gap = 38;
  const x =
    skill.x > 3100
      ? skill.x - width - radius - gap
      : skill.x + radius + gap;
  const y = skill.y - height / 2;

  return (
    <foreignObject
      className="skill-tooltip-object skill-tooltip-object--top-layer"
      x={x}
      y={y}
      width={width}
      height={height}
      pointerEvents="none"
      overflow="visible"
    >
      <div
        ref={tooltipRef}
        className={`skill-tooltip skill-tooltip--${skill.categoryId}`}
      >
        {isClassNode ? (
          <h3 className="skill-tooltip__name">{skill.name}</h3>
        ) : null}

        <section className="skill-tooltip__effects">
          <p className="skill-tooltip__effects-title">
            {isClassNode ? "Class bonuses" : "Bonuses"}
          </p>
          {displayedLines.length === 0 ? (
            <p className="skill-tooltip__no-effects">
              No class description available
            </p>
          ) : (
            <ul>
              {displayedLines.map((line, index) => (
                <li key={`${skill.id}-tooltip-line-${index}`}>{line}</li>
              ))}
            </ul>
          )}
        </section>

        <div className="skill-tooltip__path-cost">
          <span>Total skill point cost</span>
          <strong>
            {isClassNode
              ? isPurchased
                ? "Allocated"
                : "1 point"
              : isPurchased
                ? "Allocated"
                : `${pathCost} ${pathCost === 1 ? "point" : "points"}`}
          </strong>
        </div>
      </div>
    </foreignObject>
  );
}

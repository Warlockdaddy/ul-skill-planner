import type { SkillIcon } from "../domain/types";

interface SkillSymbolProps {
  icon: SkillIcon;
  size?: number;
}

/**
 * Draws an original SVG symbol for a skill node.
 * Symbols use a 48 x 48 coordinate system and inherit
 * their color from the surrounding node or context hub.
 */
export function SkillSymbol({
  icon,
  size = 30,
}: SkillSymbolProps) {
  const classIconPaths: Partial<Record<SkillIcon, string>> = {
    "class-enforcer": "/icons/classes/class-enforcer.png",
    "class-scout": "/icons/classes/class-scout.png",
    "class-recon": "/icons/classes/class-recon.png",
    "class-specialist": "/icons/classes/class-specialist.png",
    "class-assault": "/icons/classes/class-assault.png",
  };
  const rawClassIconPath = classIconPaths[icon];
  const classIconPath = rawClassIconPath
    ? `${import.meta.env.BASE_URL}${rawClassIconPath.replace(/^\/+/, "")}`
    : undefined;

  if (classIconPath) {
    return (
      <img
        className="skill-symbol-image skill-symbol-image--class"
        src={classIconPath}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          imageRendering: "pixelated",
          userSelect: "none",
        }}
      />
    );
  }

  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  function renderSymbol() {
    switch (icon) {
      case "bicep":
        return (
          <>
            <path d="M16 10v9c0 3-2 5-5 5H8" />
            <path d="M16 19c3-5 7-7 11-5 2 1 3 3 3 5" />
            <path d="M30 19c6-2 10 2 10 8 0 8-6 13-15 13H14c-5 0-8-3-8-8v-8" />
            <path d="M16 10c0-3 2-5 5-5s5 2 5 5v5" />
          </>
        );

      case "stomach":
        return (
          <>
            <path d="M18 7v10c0 5-4 7-4 13 0 7 5 12 12 12 8 0 14-6 14-14 0-6-3-10-8-12" />
            <path d="M32 16c-4 0-7 3-7 7 0 3 2 5 5 5 2 0 4-1 5-3" />
            <path d="M18 12h7" />
          </>
        );

      case "heart":
        return (
          <path d="M24 40 8 25C1 18 5 7 15 7c4 0 7 2 9 6 2-4 5-6 9-6 10 0 14 11 7 18L24 40Z" />
        );

      case "brain":
        return (
          <>
            <path d="M24 9c-3-5-10-4-11 2-6-1-9 6-5 10-4 4-1 11 5 10 1 6 8 7 11 2Z" />
            <path d="M24 9c3-5 10-4 11 2 6-1 9 6 5 10 4 4 1 11-5 10-1 6-8 7-11 2Z" />
            <path d="M24 9v24M13 11c4 1 5 4 4 7M8 21c3-1 6 0 8 3M13 31c1-3 3-5 6-5M35 11c-4 1-5 4-4 7M40 21c-3-1-6 0-8 3M35 31c-1-3-3-5-6-5" />
          </>
        );

      case "eye":
        return (
          <>
            <path d="M4 24s7-11 20-11 20 11 20 11-7 11-20 11S4 24 4 24Z" />
            <circle cx="24" cy="24" r="6" />
          </>
        );

      case "hand":
        return (
          <>
            <path d="M15 23V11c0-2 1-4 3-4s3 2 3 4v10" />
            <path d="M21 19V8c0-2 1-4 3-4s3 2 3 4v11" />
            <path d="M27 20V10c0-2 1-4 3-4s3 2 3 4v12" />
            <path d="M33 22v-7c0-2 1-4 3-4s3 2 3 4v13c0 9-6 15-15 15-7 0-11-4-14-10l-4-8c-1-2 0-5 2-6 2-1 4 0 5 2l3 5" />
          </>
        );

      case "plus":
        return (
          <>
            <path d="M24 8v32" />
            <path d="M8 24h32" />
          </>
        );

      default:
        return (
          <>
            <circle cx="24" cy="24" r="16" />
            <path d="M24 14v12" />
            <circle cx="24" cy="33" r="1.5" fill="currentColor" stroke="none" />
          </>
        );
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      {...commonProps}
    >
      {renderSymbol()}
    </svg>
  );
}

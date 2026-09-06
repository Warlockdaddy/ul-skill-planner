import { memo } from "react";
import type { SkillContextHub } from "../domain/types";
import { SkillSymbol } from "./SkillSymbol";

interface SkillContextHubViewProps {
  hub: SkillContextHub;
}

/**
 * Context hubs that use dedicated white PNG artwork.
 *
 * IMPORTANT: keyed by the hub's unique `id`, NOT by `hub.icon`.
 *
 * The icon field is not unique across hubs — the prototypeContextHubs
 * generator reuses each class's icon set (e.g. strength = poison/stomach/club)
 * for both the inner module hubs AND the cycling outer decorative hubs. Keying
 * on the icon therefore lit up several unrelated outer hubs with the stomach
 * image. Keying on the specific hub id guarantees only the intended hub
 * receives the artwork.
 *
 * HOW TO ADD A CONTEXT-HUB ICON:
 *   1. Load the planner with ?hubids in the URL to reveal every hub's id
 *      (see HUB_ID_DEBUG below). Each hub shows its exact id as a label.
 *   2. Note the id of the hub you want (e.g. "strength-context-2").
 *   3. Add one line here: "<hub-id>": "/icons/skills/<icon>.png".
 */
const HUB_IMAGE_SRC: Partial<Record<string, string>> = {
  // Inner strength module hub surrounded by the six Food/Water stomach nodes.
  "strength-context-2": "/icons/skills/metabolism-stomach.png",
  // Inner strength module hub (gas mask branch).
  "strength-context-1": "/icons/skills/gasmask-hub.png",
  // Inner strength module hub (shotgun branch).
  "strength-context-3": "/icons/skills/shotgun.png",
  // Inner Fortitude module hub on the bow-and-crossbow branch.
  "fortitude-context-2": "/icons/skills/bow-and-arrow.png",
  // Inner Fortitude module hub on the Polearm branch.
  "fortitude-context-1": "/icons/skills/polearm-spear.png",
  // Outer decorative hub on the Polearm branch.
  "outer-context-27": "/icons/skills/polearm-spear.png",
  // Outer decorative hub on the animal-harvesting branch.
  "outer-context-28": "/icons/skills/meat-and-knife.png",
  // Sniper Rifle branch hubs.
  "fortitude-context-3": "/icons/skills/sniper-rifle.png",
  "outer-context-1": "/icons/skills/sniper-rifle.png",
  "outer-half-context-27": "/icons/skills/sniper-rifle.png",
  "outer-open-split-context-29": "/icons/skills/sniper-rifle.png",
  // Generic ranged-weapon armor-reduction branch.
  "outer-half-context-28": "/icons/skills/ranged-armor-reduction-round.png",
  // Outer decorative hub on the bow-and-crossbow branch.
  "outer-context-29": "/icons/skills/bow-and-arrow.png",
  // Outer decorative hub also on the shotgun branch.
  "outer-context-25": "/icons/skills/shotgun.png",
  // Outer decorative hub on the doctor/medic branch.
  "outer-context-26": "/icons/skills/medic-doctor.png",
  // Outer decorative hub on the health-regen branch.
  "outer-context-24": "/icons/skills/health-regen-plus-cluster.png",
  // Outer decorative hub on the brass-knuckles/Fist Weapon branch.
  "outer-context-21": "/icons/skills/fist-brass-knuckles.png",
  // Outer decorative hubs on the Heavy Armor branch.
  "outer-context-20": "/icons/skills/heavy-armor.png",
  "outer-context-22": "/icons/skills/heavy-armor.png",
  // Matching regular and open-split hubs on the cracked-body branch.
  "outer-context-23": "/icons/skills/cracked-body.png",
  "outer-open-split-context-23": "/icons/skills/cracked-body.png",
  "outer-context-30": "/icons/skills/three-leaf-plant.png",
  "outer-context-2": "/icons/skills/closed-treasure-chest.png",
  "outer-half-context-2": "/icons/skills/closed-treasure-chest.png",
  "dexterity-context-1": "/icons/skills/pistol.png",
  "outer-context-3": "/icons/skills/pistol.png",
  "outer-open-split-context-6": "/icons/skills/pistol.png",
  "outer-context-8": "/icons/skills/light-armor-strap.png",
  "outer-context-5": "/icons/skills/crossed-batons.png",
  "outer-context-6": "/icons/skills/running-figure.png",
  "dexterity-context-2": "/icons/skills/fox-silhouette.png",
  "outer-context-4": "/icons/skills/fox-silhouette.png",
  "outer-asymmetric-context-4": "/icons/skills/bloody-knife-machete.png",
  "dexterity-context-3": "/icons/skills/bloody-knife-machete.png",
  "outer-context-7": "/icons/skills/bloody-knife-machete.png",
  "outer-context-10": "/icons/skills/lockpick-tool.png",
  "outer-half-context-5": "/icons/skills/rabbit-spring-leg.png",
  "outer-open-split-context-7": "/icons/skills/submachine-gun.png",
  "outer-context-9": "/icons/skills/submachine-gun.png",
  "perception-context-1": "/icons/skills/wrench.png",
  "outer-open-split-context-8": "/icons/skills/cargo-drone.png",
  "outer-open-split-context-9": "/icons/skills/money.png",
  "outer-open-split-context-13": "/icons/skills/money.png",
  "outer-final-split-context-10": "/icons/skills/turret.png",
  "outer-final-split-context-12": "/icons/skills/turret.png",
  "perception-context-2": "/icons/skills/talk.png",
  "outer-context-11": "/icons/skills/talk.png",
  "outer-open-split-context-11": "/icons/skills/batons.png",
  "outer-context-13": "/icons/skills/batons.png",
  "outer-context-14": "/icons/skills/batons.png",
  "outer-context-12": "/icons/skills/turret.png",
  "perception-context-3": "/icons/skills/turret.png",
  "outer-open-split-context-14": "/icons/skills/club.png",
  "intellect-context-1": "/icons/skills/club.png",
  "outer-context-15": "/icons/skills/club.png",
  "outer-open-split-context-17": "/icons/skills/fist.png",
  "outer-open-split-context-16": "/icons/skills/hammer-drop.png",
  "outer-open-split-context-15": "/icons/skills/rocket.png",
  "outer-context-16": "/icons/skills/pickaxe.png",
  "outer-context-18": "/icons/skills/pickaxe.png",
  "outer-open-split-context-18": "/icons/skills/pickaxe.png",
  "intellect-context-2": "/icons/skills/backpack.png",
  "outer-context-17": "/icons/skills/backpack.png",
  "outer-context-19": "/icons/skills/backpack.png",
  "intellect-context-3": "/icons/skills/ak47.png",
  "outer-open-split-context-19": "/icons/skills/ak47.png",
};

/**
 * Debug switch: when the page URL contains ?hubids (or ?hubids=1), every
 * context hub renders its exact id beneath it so hubs can be identified
 * precisely. Evaluated once at module load; add the param and reload to toggle.
 *
 * Examples that enable it:
 *   http://localhost:5173/?hubids
 *   http://localhost:5173/?hubids=1
 */
const HUB_ID_DEBUG: boolean =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("hubids");

/**
 * Renders one large, non-clickable context icon between
 * parallel skill branches.
 *
 * Context hubs are visual labels only. They do not cost
 * points, participate in route calculations, receive hover
 * tooltips, or contribute to Build Totals.
 */
function SkillContextHubViewComponent({
  hub,
}: SkillContextHubViewProps) {
  const hubImageSrc = HUB_IMAGE_SRC[hub.id];
  /* Larger footprint than the SVG symbol so the artwork fills the hub. */
  const imageSize = 54;
  const imageBox = 60;

  return (
    <g
      className={[
        "skill-context-hub",
        `skill-context-hub--${hub.categoryId}`,
      ].join(" ")}
      transform={`translate(${hub.x} ${hub.y})`}
      pointerEvents="none"
      aria-hidden="true"
    >
      <circle
        cx="0"
        cy="0"
        r="47"
        fill="#111619"
        stroke="#0a0d0f"
        strokeWidth="8"
      />
      <circle
        cx="0"
        cy="0"
        r="42"
        fill="#242b30"
        stroke="currentColor"
        strokeWidth="4"
      />
      <circle
        cx="0"
        cy="0"
        r="34"
        fill="#171c20"
        stroke="rgba(255, 255, 255, 0.16)"
        strokeWidth="2"
      />
      {hubImageSrc ? (
        <foreignObject
          x={-imageBox / 2}
          y={-imageBox / 2}
          width={imageBox}
          height={imageBox}
          pointerEvents="none"
        >
          <div
            style={{
              display: "grid",
              width: `${imageBox}px`,
              height: `${imageBox}px`,
              placeItems: "center",
            }}
          >
            <img
              className="skill-symbol-image skill-symbol-image--context-hub"
              src={hubImageSrc}
              alt=""
              width={imageSize}
              height={imageSize}
              aria-hidden="true"
              draggable={false}
              style={{
                display: "block",
                width: imageSize,
                height: imageSize,
                objectFit: "contain",
                imageRendering: "pixelated",
                pointerEvents: "none",
                userSelect: "none",
                /* Fully opaque: the hub icon should read clearly, not washed out. */
                opacity: 1,
              }}
            />
          </div>
        </foreignObject>
      ) : (
        <foreignObject
          x="-23"
          y="-23"
          width="46"
          height="46"
          pointerEvents="none"
        >
          <div
            style={{
              display: "grid",
              width: "46px",
              height: "46px",
              placeItems: "center",
              color: "currentColor",
            }}
          >
            <SkillSymbol
              icon={hub.icon}
              size={38}
            />
          </div>
        </foreignObject>
      )}
      {HUB_ID_DEBUG ? (
        <g pointerEvents="none">
          {/* Backing plate so the id stays readable over any background. */}
          <rect
            x={-hub.id.length * 4.6 - 6}
            y={54}
            width={hub.id.length * 9.2 + 12}
            height={26}
            rx={5}
            fill="rgba(4, 8, 10, 0.9)"
            stroke="#f2d979"
            strokeWidth={1.5}
          />
          <text
            x={0}
            y={72}
            textAnchor="middle"
            fontSize={16}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
            fontWeight={700}
            fill="#ffe89a"
          >
            {hub.id}
          </text>
        </g>
      ) : null}
    </g>
  );
}

export const SkillContextHubView = memo(
  SkillContextHubViewComponent,
  (a, b) => a.hub === b.hub,
);

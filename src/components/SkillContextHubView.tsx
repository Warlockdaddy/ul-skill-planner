import { memo } from "react";
import type { SkillContextHub } from "../domain/types";
import { SkillSymbol } from "./SkillSymbol";

interface SkillContextHubViewProps {
  hub: SkillContextHub;
}


const HUB_IMAGE_SRC: Partial<Record<string, string>> = {

  "strength-context-2": "/icons/skills/metabolism-stomach.png",

  "strength-context-1": "/icons/skills/gasmask-hub.png",

  "strength-context-3": "/icons/skills/shotgun.png",

  "fortitude-context-2": "/icons/skills/bow-and-arrow.png",

  "fortitude-context-1": "/icons/skills/polearm-spear.png",

  "outer-context-27": "/icons/skills/polearm-spear.png",

  "outer-context-28": "/icons/skills/meat-and-knife.png",

  "fortitude-context-3": "/icons/skills/sniper-rifle.png",
  "outer-context-1": "/icons/skills/sniper-rifle.png",
  "outer-half-context-27": "/icons/skills/sniper-rifle.png",
  "outer-open-split-context-29": "/icons/skills/sniper-rifle.png",

  "outer-half-context-28": "/icons/skills/ranged-armor-reduction-round.png",

  "outer-context-29": "/icons/skills/bow-and-arrow.png",

  "outer-context-25": "/icons/skills/shotgun.png",

  "outer-context-26": "/icons/skills/medic-doctor.png",

  "outer-context-24": "/icons/skills/health-regen-plus-cluster.png",

  "outer-context-21": "/icons/skills/fist-brass-knuckles.png",

  "outer-context-20": "/icons/skills/heavy-armor.png",
  "outer-context-22": "/icons/skills/heavy-armor.png",

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


const HUB_ID_DEBUG: boolean =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("hubids");


function SkillContextHubViewComponent({
  hub,
}: SkillContextHubViewProps) {
  const rawHubImageSrc = HUB_IMAGE_SRC[hub.id];
  const hubImageSrc = rawHubImageSrc
    ? `${import.meta.env.BASE_URL}${rawHubImageSrc.replace(/^\/+/, "")}`
    : undefined;

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

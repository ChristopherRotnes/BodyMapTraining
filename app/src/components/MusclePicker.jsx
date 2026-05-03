import React from "react";
import { MUSCLES, SHAPES, BODY_PATH, PRIMARY_FILL, PRIMARY_HOVER, PRIMARY_STROKE, SEC_STROKE } from "../lib/bodymap.jsx";
import { Tag } from "@carbon/react";

function MusclePickerView({ view, primary, secondary, onToggle, instanceId }) {
  const pSet = new Set(primary);
  const sSet = new Set(secondary);
  const [hovered, setHovered] = React.useState(null);

  return (
    <svg viewBox="0 0 160 360" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <filter id={`pick-glow-${view}-${instanceId}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`pick-softglow-${view}-${instanceId}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id={`pick-sec-stripe-${view}-${instanceId}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45 0 0)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(120,169,255,0.6)" strokeWidth="2.5" />
        </pattern>
      </defs>

      <g aria-hidden="true" style={{ fill: "var(--cds-layer-02)", stroke: "var(--cds-border-subtle-01)" }} strokeWidth="0.6">
        <circle cx="80" cy="21" r="17" />
        <polygon points="74,37 86,37 87,50 73,50" />
        <path d={BODY_PATH} />
      </g>

      {Object.entries(SHAPES)
        .filter(([id]) => MUSCLES[id]?.view === view)
        .map(([id, shapes]) => {
          const isPrimary = pSet.has(id);
          const isSec = sSet.has(id);
          const isHov = hovered === id;
          let fill, stroke, filter;
          if (isPrimary) {
            fill = isHov ? PRIMARY_HOVER : PRIMARY_FILL;
            stroke = PRIMARY_STROKE;
            filter = `url(#pick-glow-${view}-${instanceId})`;
          } else if (isSec) {
            fill = `url(#pick-sec-stripe-${view}-${instanceId})`;
            stroke = SEC_STROKE;
            filter = `url(#pick-softglow-${view}-${instanceId})`;
          } else {
            fill = isHov ? "rgba(128,128,128,0.25)" : "rgba(128,128,128,0.08)";
            stroke = "rgba(128,128,128,0.15)";
            filter = undefined;
          }
          return (
            <g key={id}
              filter={filter}
              style={{ cursor: "pointer" }}
              onClick={() => onToggle(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}>
              {shapes.map((sh, i) =>
                sh.d
                  ? <path key={i} d={sh.d} fill={fill} stroke={stroke} strokeWidth="0.8" />
                  : <ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} fill={fill} stroke={stroke} strokeWidth="0.8" />
              )}
            </g>
          );
        })}

      <text aria-hidden="true" x="80" y="352" textAnchor="middle" fontSize="7.5"
        fontFamily="var(--cds-font-mono)" letterSpacing="2"
        style={{ fill: "var(--cds-text-secondary)" }}>
        {view === "front" ? "FRONT" : "BACK"}
      </text>
    </svg>
  );
}

export default function MusclePicker({ primary = [], secondary = [], onChange, instanceId = "0" }) {
  const toggle = (id) => {
    const isPrimary = primary.includes(id);
    const isSec = secondary.includes(id);
    let nextPrimary = [...primary];
    let nextSecondary = [...secondary];
    if (!isPrimary && !isSec) {
      nextPrimary.push(id);
    } else if (isPrimary) {
      nextPrimary = nextPrimary.filter(m => m !== id);
      nextSecondary.push(id);
    } else {
      nextSecondary = nextSecondary.filter(m => m !== id);
    }
    onChange({ primary: nextPrimary, secondary: nextSecondary });
  };

  const helpId = `muscle-help-${instanceId}`;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        <Tag type="green" size="sm">Primær ({primary.length})</Tag>
        <Tag type="blue" size="sm">Sekundær ({secondary.length})</Tag>
        <span id={helpId} style={{ fontSize: 11, color: "var(--cds-text-secondary)", alignSelf: "center", marginLeft: 4 }}>
          Klikk muskel: av → primær → sekundær → av
        </span>
      </div>
      <div aria-describedby={helpId} style={{ display: "flex", gap: 8 }}>
        {["front", "back"].map(view => (
          <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "6px 4px" }}>
            <MusclePickerView
              view={view}
              primary={primary}
              secondary={secondary}
              onToggle={toggle}
              instanceId={`${instanceId}-${view}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

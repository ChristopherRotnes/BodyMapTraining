import React from "react";

export const EX_DB = [
  { kw: ["benkpress","bench press","chest press","push up","pushup","armhevinger","brystpress","flies","fly","pec deck"], p: ["chest"], s: ["shoulders_front","triceps"] },
  { kw: ["skulderpress","shoulder press","overhead press","ohp","militærpress","military press","arnold"], p: ["shoulders_front","shoulders_side"], s: ["triceps","traps"] },
  { kw: ["sidehev","lateral raise","lateral"], p: ["shoulders_side"], s: [] },
  { kw: ["fronthev","front raise"], p: ["shoulders_front"], s: [] },
  { kw: ["face pull","rear delt","bakre delt"], p: ["rear_delts","traps"], s: [] },
  { kw: ["pullup","pull-up","chin up","chinup","chins"], p: ["lats","biceps"], s: ["rear_delts"] },
  { kw: ["pulldown","nedtrekk","lat pull"], p: ["lats"], s: ["biceps"] },
  { kw: ["roing","row","rodd","t-bar"], p: ["lats","rear_delts"], s: ["biceps","traps"] },
  { kw: ["markløft","deadlift","rdl","romanian","stiff leg"], p: ["hamstrings","glutes","lower_back"], s: ["traps","lats"] },
  { kw: ["knebøy","squat","goblet"], p: ["quads","glutes"], s: ["hamstrings","calves"] },
  { kw: ["leg press","beinpress","hack squat"], p: ["quads","glutes"], s: ["hamstrings"] },
  { kw: ["lunge","utfall","step up","bulgarian"], p: ["quads","glutes"], s: ["hamstrings","calves"] },
  { kw: ["leg curl","hamstring curl","bein curl"], p: ["hamstrings"], s: [] },
  { kw: ["hip thrust","glute bridge"], p: ["glutes"], s: ["hamstrings"] },
  { kw: ["bicep curl","curl","hammer curl","preacher"], p: ["biceps"], s: ["forearms"] },
  { kw: ["tricep","skull crusher","pushdown","dip"], p: ["triceps"], s: ["shoulders_front"] },
  { kw: ["planke","plank"], p: ["abs","obliques"], s: ["lower_back"] },
  { kw: ["situp","sit up","crunch","cable crunch"], p: ["abs"], s: ["obliques"] },
  { kw: ["russian twist","woodchop","oblique"], p: ["obliques","abs"], s: [] },
  { kw: ["tåhev","calf raise","calf"], p: ["calves","calves_back"], s: [] },
  { kw: ["hyperextension","back extension","ryggstrekning"], p: ["lower_back","glutes"], s: ["hamstrings"] },
  { kw: ["shrug","skuldertrekk","upright row"], p: ["traps"], s: ["shoulders_side"] },
];

export const MUSCLES = {
  chest:           { label: "Bryst",            view: "front" },
  shoulders_front: { label: "Fremre skuldre",   view: "front" },
  shoulders_side:  { label: "Laterale skuldre", view: "front" },
  biceps:          { label: "Biceps",           view: "front" },
  forearms:        { label: "Underarmer",       view: "front" },
  abs:             { label: "Mage",             view: "front" },
  obliques:        { label: "Oblique",          view: "front" },
  quads:           { label: "Quadriceps",       view: "front" },
  calves:          { label: "Legg",             view: "front" },
  traps:           { label: "Trapezius",        view: "back"  },
  rear_delts:      { label: "Bakre skuldre",    view: "back"  },
  lats:            { label: "Latissimus",       view: "back"  },
  triceps:         { label: "Triceps",          view: "back"  },
  lower_back:      { label: "Korsrygg",         view: "back"  },
  glutes:          { label: "Sete",             view: "back"  },
  hamstrings:      { label: "Hamstrings",       view: "back"  },
  calves_back:     { label: "Legg (bak)",       view: "back"  },
};

export const SHAPES = {
  chest:           [{ cx:63, cy:78, rx:16, ry:11 }, { cx:97, cy:78, rx:16, ry:11 }],
  shoulders_front: [{ cx:35, cy:62, rx:13, ry:10 }, { cx:125, cy:62, rx:13, ry:10 }],
  shoulders_side:  [{ cx:32, cy:67, rx:10, ry:9  }, { cx:128, cy:67, rx:10, ry:9  }],
  biceps:          [{ cx:21, cy:96, rx:9,  ry:15 }, { cx:139, cy:96, rx:9,  ry:15 }],
  forearms:        [{ cx:17, cy:128, rx:8, ry:14 }, { cx:143, cy:128, rx:8, ry:14 }],
  abs:             [{ cx:80, cy:108, rx:13, ry:26 }],
  obliques:        [{ cx:58, cy:110, rx:10, ry:21 }, { cx:102, cy:110, rx:10, ry:21 }],
  quads:           [{ cx:63, cy:212, rx:18, ry:37 }, { cx:97, cy:212, rx:18, ry:37 }],
  calves:          [{ cx:63, cy:292, rx:12, ry:24 }, { cx:97, cy:292, rx:12, ry:24 }],
  traps:           [{ cx:80, cy:62, rx:26, ry:13 }],
  rear_delts:      [{ cx:35, cy:65, rx:13, ry:10 }, { cx:125, cy:65, rx:13, ry:10 }],
  lats:            [{ cx:52, cy:92, rx:19, ry:27 }, { cx:108, cy:92, rx:19, ry:27 }],
  triceps:         [{ cx:21, cy:96, rx:9,  ry:15 }, { cx:139, cy:96, rx:9,  ry:15 }],
  lower_back:      [{ cx:80, cy:124, rx:20, ry:13 }],
  glutes:          [{ cx:63, cy:168, rx:18, ry:19 }, { cx:97, cy:168, rx:18, ry:19 }],
  hamstrings:      [{ cx:63, cy:218, rx:17, ry:33 }, { cx:97, cy:218, rx:17, ry:33 }],
  calves_back:     [{ cx:63, cy:292, rx:13, ry:24 }, { cx:97, cy:292, rx:13, ry:24 }],
};

export const BODY_POLY = "30,50 17,52 11,132 17,148 24,152 25,132 30,62 50,57 55,118 51,148 48,162 48,355 78,355 78,162 82,162 82,355 112,355 112,162 109,148 105,118 110,57 130,62 135,132 136,152 143,148 149,132 143,52 130,50";

export const PRIMARY_FILL   = "rgba(36,161,72,0.78)";
export const PRIMARY_HOVER  = "rgba(36,161,72,1)";
export const PRIMARY_STROKE = "rgba(36,161,72,0.5)";
export const SEC_FILL       = "rgba(120,169,255,0.45)";
export const SEC_HOVER      = "rgba(120,169,255,0.7)";
export const SEC_STROKE     = "rgba(120,169,255,0.25)";

export function calcMuscles(exercises) {
  const p = new Set(), s = new Set();
  exercises.forEach(ex => {
    if (ex.primary?.length || ex.secondary?.length) {
      (ex.primary || []).forEach(m => p.add(m));
      (ex.secondary || []).forEach(m => s.add(m));
    } else {
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) {
          rule.p.forEach(m => p.add(m));
          rule.s.forEach(m => s.add(m));
          break;
        }
      }
    }
  });
  p.forEach(m => s.delete(m));
  return { primary: [...p], secondary: [...s] };
}

export function HeatmapBodySVG({ view, counts = {}, maxCount = 1 }) {
  const [tooltip, setTooltip] = React.useState(null);
  const wrapRef = React.useRef();

  const handleEnter = (id, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMove = (id, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleLeave = () => setTooltip(null);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox="0 0 160 360" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <filter id={`heatglow-${view}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g style={{ fill: "var(--cds-layer-02)", stroke: "var(--cds-border-subtle-01)" }} strokeWidth="0.6">
          <circle cx="80" cy="21" r="17" />
          <polygon points="74,37 86,37 87,50 73,50" />
          <polygon points={BODY_POLY} />
        </g>

        {Object.entries(SHAPES)
          .filter(([id]) => MUSCLES[id]?.view === view)
          .map(([id, shapes]) => {
            const { primary = 0, secondary = 0 } = counts[id] || {};
            let fill, stroke, useGlow;
            if (primary > 0) {
              const intensity = 0.2 + (primary / Math.max(1, maxCount)) * 0.7;
              fill = `rgba(36,161,72,${intensity.toFixed(2)})`;
              stroke = `rgba(36,161,72,${(intensity * 0.6).toFixed(2)})`;
              useGlow = true;
            } else if (secondary > 0) {
              fill = "rgba(120,169,255,0.35)";
              stroke = "rgba(120,169,255,0.2)";
              useGlow = false;
            } else {
              fill = "rgba(128,128,128,0.1)";
              stroke = "rgba(128,128,128,0.08)";
              useGlow = false;
            }
            return (
              <g key={id}
                filter={useGlow ? `url(#heatglow-${view})` : undefined}
                style={{ cursor: "pointer" }}
                onMouseEnter={e => handleEnter(id, e)}
                onMouseMove={e => handleMove(id, e)}
                onMouseLeave={handleLeave}>
                {shapes.map((sh, i) => (
                  <ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry}
                    fill={fill} stroke={stroke} strokeWidth="0.8" />
                ))}
              </g>
            );
          })}

        <text x="80" y="352" textAnchor="middle" fontSize="7.5"
          fontFamily="var(--cds-font-mono)" letterSpacing="2"
          style={{ fill: "var(--cds-text-secondary)" }}>
          {view === "front" ? "FRONT" : "BACK"}
        </text>
      </svg>

      {tooltip && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x + 10, (wrapRef.current?.offsetWidth || 200) - 150),
          top: Math.max(tooltip.y - 10, 4),
          background: "var(--cds-layer-02)",
          border: "1px solid var(--cds-border-subtle-01)",
          padding: "8px 10px",
          pointerEvents: "none",
          zIndex: 10,
          minWidth: 130,
        }}>
          <div style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "1px", marginBottom: 4, fontFamily: "var(--cds-font-mono)" }}>
            {MUSCLES[tooltip.id]?.label?.toUpperCase()}
          </div>
          {(() => {
            const { primary = 0, secondary = 0 } = counts[tooltip.id] || {};
            return (
              <>
                <div style={{ fontSize: 12, color: "var(--cds-text-primary)" }}>
                  Primær: {primary} {primary === 1 ? "økt" : "økter"}
                </div>
                {secondary > 0 && (
                  <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                    Sekundær: {secondary} {secondary === 1 ? "økt" : "økter"}
                  </div>
                )}
                {primary === 0 && secondary === 0 && (
                  <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Ikke trent</div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export function BodySVG({ view, primary, secondary, muscleMap = {} }) {
  const pSet = new Set(primary);
  const sSet = new Set(secondary);
  const [tooltip, setTooltip] = React.useState(null);
  const wrapRef = React.useRef();

  const handleEnter = (id, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMove = (id, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleLeave = () => setTooltip(null);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox="0 0 160 360" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <filter id={`glow-${view}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`softglow-${view}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g style={{ fill: "var(--cds-layer-02)", stroke: "var(--cds-border-subtle-01)" }} strokeWidth="0.6">
          <circle cx="80" cy="21" r="17" />
          <polygon points="74,37 86,37 87,50 73,50" />
          <polygon points={BODY_POLY} />
        </g>

        {Object.entries(SHAPES)
          .filter(([id]) => MUSCLES[id]?.view === view)
          .map(([id, shapes]) => {
            const isPrimary = pSet.has(id);
            const isSec = sSet.has(id);
            if (!isPrimary && !isSec) return null;
            const isHovered = tooltip?.id === id;
            return (
              <g key={id} filter={`url(#${isPrimary ? "glow" : "softglow"}-${view})`}
                style={{ cursor: muscleMap[id]?.length ? "pointer" : "default" }}
                onMouseEnter={e => handleEnter(id, e)}
                onMouseMove={e => handleMove(id, e)}
                onMouseLeave={handleLeave}>
                {shapes.map((sh, i) => (
                  <ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry}
                    fill={isPrimary
                      ? (isHovered ? PRIMARY_HOVER : PRIMARY_FILL)
                      : (isHovered ? SEC_HOVER : SEC_FILL)}
                    stroke={isPrimary ? PRIMARY_STROKE : SEC_STROKE}
                    strokeWidth="0.8"
                    style={{ transition: "fill 0.15s" }} />
                ))}
              </g>
            );
          })}

        <text x="80" y="352" textAnchor="middle" fontSize="7.5"
          fontFamily="var(--cds-font-mono)" letterSpacing="2"
          style={{ fill: "var(--cds-text-secondary)" }}>
          {view === "front" ? "FRONT" : "BACK"}
        </text>
      </svg>

      {tooltip && muscleMap[tooltip.id]?.length > 0 && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x + 10, (wrapRef.current?.offsetWidth || 200) - 140),
          top: Math.max(tooltip.y - 10, 4),
          background: "var(--cds-layer-02)",
          border: "1px solid var(--cds-border-subtle-01)",
          padding: "8px 10px",
          pointerEvents: "none",
          zIndex: 10,
          minWidth: 120,
          maxWidth: 160,
        }}>
          <div style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "1px", marginBottom: 5, fontFamily: "var(--cds-font-mono)" }}>
            {MUSCLES[tooltip.id]?.label?.toUpperCase()}
          </div>
          {muscleMap[tooltip.id].map((ex, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--cds-text-primary)", padding: "2px 0", borderBottom: i < muscleMap[tooltip.id].length - 1 ? "1px solid var(--cds-border-subtle-01)" : "none" }}>
              {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

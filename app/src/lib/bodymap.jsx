import React from "react";
import { useTranslation } from "react-i18next";

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

// shape.d = SVG path string; otherwise ellipse (cx/cy/rx/ry)
export const SHAPES = {
  chest:           [{ cx:62, cy:80, rx:18, ry:13 }, { cx:98, cy:80, rx:18, ry:13 }],
  shoulders_front: [{ cx:42, cy:60, rx:10, ry:8 }, { cx:118, cy:60, rx:10, ry:8 }],
  shoulders_side:  [{ cx:23, cy:68, rx:9,  ry:8 }, { cx:137, cy:68, rx:9,  ry:8 }],
  biceps:          [{ cx:21, cy:96, rx:9,  ry:15 }, { cx:139, cy:96, rx:9,  ry:15 }],
  forearms:        [{ cx:17, cy:128, rx:8, ry:14 }, { cx:143, cy:128, rx:8, ry:14 }],
  abs:             [{ cx:80, cy:108, rx:13, ry:26 }],
  obliques:        [{ cx:58, cy:110, rx:10, ry:21 }, { cx:102, cy:110, rx:10, ry:21 }],
  quads:           [{ cx:63, cy:212, rx:18, ry:37 }, { cx:97, cy:212, rx:18, ry:37 }],
  calves:          [{ cx:63, cy:292, rx:12, ry:24 }, { cx:97, cy:292, rx:12, ry:24 }],
  // traps: trapezoid with neck notch — wider at shoulders, tapers to mid-back
  traps:           [{ d: "M 42,57 L 68,55 L 72,50 L 88,50 L 92,55 L 118,57 L 102,76 L 58,76 Z" }],
  // rear_delts: outer shoulder position, distinct from traps
  rear_delts:      [{ cx:29, cy:68, rx:11, ry:9 }, { cx:131, cy:68, rx:11, ry:9 }],
  // lats: wing-shaped paths from armpit down to lower back
  lats:            [
    { d: "M 33,72 Q 26,96 30,122 Q 36,132 54,130 Q 58,112 55,90 Q 48,74 33,72 Z" },
    { d: "M 127,72 Q 134,96 130,122 Q 124,132 106,130 Q 102,112 105,90 Q 112,74 127,72 Z" },
  ],
  triceps:         [{ cx:21, cy:96, rx:9,  ry:15 }, { cx:139, cy:96, rx:9,  ry:15 }],
  lower_back:      [{ cx:80, cy:124, rx:20, ry:13 }],
  glutes:          [{ cx:63, cy:168, rx:18, ry:19 }, { cx:97, cy:168, rx:18, ry:19 }],
  hamstrings:      [{ cx:63, cy:218, rx:17, ry:33 }, { cx:97, cy:218, rx:17, ry:33 }],
  calves_back:     [{ cx:63, cy:292, rx:13, ry:24 }, { cx:97, cy:292, rx:13, ry:24 }],
};

// Smooth body silhouette using bezier curves
export const BODY_PATH = "M 73,50 C 57,50 24,53 18,60 Q 10,82 11,110 Q 10,130 15,144 Q 18,152 24,155 Q 25,143 26,126 Q 28,80 33,64 Q 46,57 56,58 Q 55,80 53,115 Q 50,140 47,155 Q 47,162 48,167 L 48,355 L 76,355 L 76,167 Q 78,174 80,174 Q 82,174 84,167 L 84,355 L 112,355 L 112,167 Q 113,162 113,155 Q 110,140 107,115 Q 105,80 104,58 Q 114,57 127,64 Q 132,80 134,126 Q 135,143 136,155 Q 142,152 145,144 Q 150,130 149,110 Q 150,82 142,60 C 136,53 103,50 87,50 Z";
export const BODY_POLY = BODY_PATH; // backward compat alias

export const PRIMARY_FILL   = "var(--heat-4, #d02670)";
export const PRIMARY_HOVER  = "var(--heat-5, #ee2c80)";
export const PRIMARY_STROKE = "#ee2c80";
export const SEC_FILL       = "none";
export const SEC_HOVER      = "none";
export const SEC_STROKE     = "none";

export function useIsMobile(breakpoint = 500) {
  const [mobile, setMobile] = React.useState(() => window.innerWidth < breakpoint);
  React.useEffect(() => {
    const fn = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [breakpoint]);
  return mobile;
}

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

function Shape({ sh, i, fill, stroke, strokeWidth = "0.8", strokeDasharray }) {
  if (sh.d) {
    return <path key={i} d={sh.d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
  }
  return <ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
}

export function HeatmapBodySVG({ view, counts = {}, maxCount = 1, exerciseMap = {}, onHover, hovered, gaps = [] }) {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = React.useState(null);
  const [focused, setFocused] = React.useState(null);
  const [wrapWidth, setWrapWidth] = React.useState(200);
  const wrapRef = React.useRef();
  const rafRef = React.useRef(null);

  React.useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => setWrapWidth(entries[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const handleEnter = (id, e) => {
    if (onHover) { onHover(id); return; }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMove = (id, e) => {
    if (onHover) return;
    if (rafRef.current) return;
    const cx = e.clientX, cy = e.clientY;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({ id, x: cx - rect.left, y: cy - rect.top });
    });
  };
  const handleLeave = () => {
    if (onHover) { onHover(null); return; }
    setTooltip(null);
  };
  const handleFocus = (id) => {
    setFocused(id);
    if (onHover) { onHover(id); return; }
    const { primary = 0, secondary = 0 } = counts[id] || {};
    if (primary > 0 || secondary > 0) {
      setTooltip({ id, x: 10, y: 10 });
    }
  };
  const handleBlur = (id) => {
    setFocused(null);
    if (onHover) { onHover(null); return; }
    setTooltip(prev => prev?.id === id ? null : prev);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}
      onKeyDown={e => { if (e.key === "Escape") { setTooltip(null); setFocused(null); if (onHover) onHover(null); } }}>
      <svg viewBox="0 0 160 375" xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t("bodymap.freqMapLabel", { view: view === "front" ? t("bodymap.front") : t("bodymap.back") })}
        style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <pattern id={`sec-stripe-${view}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45 0 0)">
            <rect width="6" height="6" fill="#1c0f30" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#9f1853" strokeWidth="3" opacity="0.55" />
          </pattern>
        </defs>

        <g aria-hidden="true" style={{ fill: "var(--cds-layer-02)", stroke: "var(--cds-text-secondary)" }} strokeWidth="1.2">
          <circle cx="80" cy="21" r="17" />
          <polygon points="74,37 86,37 87,50 73,50" />
          <path d={BODY_PATH} />
        </g>

        {Object.entries(SHAPES)
          .filter(([id]) => MUSCLES[id]?.view === view)
          .map(([id, shapes]) => {
            const isHovered = id === hovered;
            const isFocused = focused === id;
            const { primary = 0, secondary = 0 } = counts[id] || {};
            const isTrained = primary > 0 || secondary > 0;
            const label = t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label ?? id });
            const ariaLabel = primary > 0
              ? t("bodymap.ariaPrimary", { count: primary, muscle: label })
              : secondary > 0
                ? t("bodymap.ariaSecondary", { count: secondary, muscle: label })
                : t("bodymap.ariaNotTrained", { muscle: label });

            let fill, stroke;
            if (primary > 0) {
              const ratio = primary / Math.max(1, maxCount);
              fill = ratio < 0.2 ? "var(--heat-1)" : ratio < 0.4 ? "var(--heat-2)" : ratio < 0.6 ? "var(--heat-3)" : ratio < 0.8 ? "var(--heat-4)" : "var(--heat-5)";
              stroke = PRIMARY_STROKE;
            } else if (secondary > 0) {
              fill = `url(#sec-stripe-${view})`;
              stroke = "none";
            } else {
              fill = "rgba(128,128,128,0.1)";
              stroke = "rgba(128,128,128,0.08)";
            }
            const finalStroke = isFocused ? "#ee2c80" : isHovered ? "#fff" : stroke;
            const finalStrokeWidth = (isFocused || isHovered) ? "1.5" : undefined;
            return (
              <g key={id}
                tabIndex={isTrained ? 0 : -1}
                role="img"
                aria-label={ariaLabel}
                style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={e => handleEnter(id, e)}
                onMouseMove={e => handleMove(id, e)}
                onMouseLeave={handleLeave}
                onFocus={() => handleFocus(id)}
                onBlur={() => handleBlur(id)}>
                {shapes.map((sh, i) => (
                  <Shape key={i} sh={sh} i={i} fill={fill} stroke={finalStroke} strokeWidth={finalStrokeWidth} />
                ))}
              </g>
            );
          })}

        {gaps
          .filter(id => MUSCLES[id]?.view === view)
          .map(id => (SHAPES[id] || []).map((sh, i) => (
            <Shape key={`gap-${id}-${i}`} sh={sh} i={i}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
          )))}

        <text aria-hidden="true" x="80" y="369" textAnchor="middle" fontSize="7.5"
          fontFamily="var(--cds-font-mono)" letterSpacing="2"
          style={{ fill: "var(--cds-interactive)" }}>
          {view === "front" ? "FRONT" : "BACK"}
        </text>
      </svg>

      {!onHover && tooltip && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x + 10, wrapWidth - 150),
          top: Math.max(tooltip.y - 10, 4),
          background: "var(--cds-layer-02)",
          border: "1px solid var(--cds-border-subtle-01)",
          padding: "8px 10px",
          zIndex: 10,
          minWidth: 130,
        }}>
          <div style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "1px", marginBottom: 4, fontFamily: "var(--cds-font-mono)" }}>
            {t(`muscles.${tooltip.id}`, { defaultValue: MUSCLES[tooltip.id]?.label })?.toUpperCase()}
          </div>
          {(() => {
            const { primary = 0, secondary = 0 } = counts[tooltip.id] || {};
            const exNames = exerciseMap[tooltip.id] ? [...exerciseMap[tooltip.id]] : [];
            return (
              <>
                <div style={{ fontSize: 12, color: "var(--cds-text-primary)" }}>
                  {t("bodymap.primaryLabel")}: {primary} {primary === 1 ? t("common.session") : t("common.sessions")}
                </div>
                {secondary > 0 && (
                  <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                    {t("bodymap.secondaryLabel")}: {secondary} {secondary === 1 ? t("common.session") : t("common.sessions")}
                  </div>
                )}
                {primary === 0 && secondary === 0 && (
                  <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{t("bodymap.notTrained")}</div>
                )}
                {exNames.length > 0 && (
                  <div style={{ marginTop: 6, borderTop: "1px solid var(--cds-border-subtle-01)", paddingTop: 5 }}>
                    {exNames.map((name, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--cds-text-primary)", padding: "2px 0" }}>{name}</div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export function BodySVG({ view, primary, secondary, muscleMap = {}, onHover, hovered, gaps = [] }) {
  const { t } = useTranslation();
  const pSet = new Set(primary);
  const sSet = new Set(secondary);
  const [tooltip, setTooltip] = React.useState(null);
  const [focused, setFocused] = React.useState(null);
  const [wrapWidth, setWrapWidth] = React.useState(200);
  const wrapRef = React.useRef();
  const rafRef = React.useRef(null);

  React.useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => setWrapWidth(entries[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const handleEnter = (id, e) => {
    if (onHover) { onHover(id); return; }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMove = (id, e) => {
    if (onHover) return;
    if (rafRef.current) return;
    const cx = e.clientX, cy = e.clientY;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({ id, x: cx - rect.left, y: cy - rect.top });
    });
  };
  const handleLeave = () => {
    if (onHover) { onHover(null); return; }
    setTooltip(null);
  };
  const handleFocus = (id) => {
    setFocused(id);
    if (onHover) { onHover(id); return; }
    if (muscleMap[id]?.length) setTooltip({ id, x: 10, y: 10 });
  };
  const handleBlur = (id) => {
    setFocused(null);
    if (onHover) { onHover(null); return; }
    setTooltip(prev => prev?.id === id ? null : prev);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}
      onKeyDown={e => { if (e.key === "Escape") { setTooltip(null); setFocused(null); if (onHover) onHover(null); } }}>
      <svg viewBox="0 0 160 375" xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${t("bodymap.mapLabel", { view: view === "front" ? t("bodymap.front") : t("bodymap.back") })}. ${[...pSet].map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label })).filter(Boolean).join(", ") || t("common.none")}.`}
        style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <pattern id={`sec-stripe-${view}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45 0 0)">
            <rect width="6" height="6" fill="#1c0f30" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#9f1853" strokeWidth="3" opacity="0.55" />
          </pattern>
        </defs>

        <g aria-hidden="true" style={{ fill: "var(--cds-layer-02)", stroke: "var(--cds-text-secondary)" }} strokeWidth="1.2">
          <circle cx="80" cy="21" r="17" />
          <polygon points="74,37 86,37 87,50 73,50" />
          <path d={BODY_PATH} />
        </g>

        {Object.entries(SHAPES)
          .filter(([id]) => MUSCLES[id]?.view === view)
          .map(([id, shapes]) => {
            const isPrimary = pSet.has(id);
            const isSec = sSet.has(id);
            if (!isPrimary && !isSec) return null;
            const isHovered = onHover ? id === hovered : tooltip?.id === id;
            const isFocused = focused === id;
            const label = t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label ?? id });
            const ariaLabel = `${label} – ${isPrimary ? t("bodymap.primaryLabel") : t("bodymap.secondaryLabel")}`;
            const fill = isPrimary
              ? (isHovered ? PRIMARY_HOVER : PRIMARY_FILL)
              : `url(#sec-stripe-${view})`;
            const stroke = isFocused ? "#ee2c80" : isHovered ? "#fff" : isPrimary ? PRIMARY_STROKE : "none";
            const strokeWidth = (isFocused || isHovered) ? "1.5" : "0.8";
            return (
              <g key={id}
                tabIndex={0}
                role="img"
                aria-label={ariaLabel}
                style={{ cursor: muscleMap[id]?.length ? "pointer" : "default", outline: "none" }}
                onMouseEnter={e => handleEnter(id, e)}
                onMouseMove={e => handleMove(id, e)}
                onMouseLeave={handleLeave}
                onFocus={() => handleFocus(id)}
                onBlur={() => handleBlur(id)}>
                {shapes.map((sh, i) => (
                  <Shape key={i} sh={sh} i={i} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                ))}
              </g>
            );
          })}

        {gaps
          .filter(id => MUSCLES[id]?.view === view)
          .map(id => (SHAPES[id] || []).map((sh, i) => (
            <Shape key={`gap-${id}-${i}`} sh={sh} i={i}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
          )))}

        <text aria-hidden="true" x="80" y="369" textAnchor="middle" fontSize="7.5"
          fontFamily="var(--cds-font-mono)" letterSpacing="2"
          style={{ fill: "var(--cds-interactive)" }}>
          {view === "front" ? "FRONT" : "BACK"}
        </text>
      </svg>

      {!onHover && tooltip && muscleMap[tooltip.id]?.length > 0 && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x + 10, wrapWidth - 140),
          top: Math.max(tooltip.y - 10, 4),
          background: "var(--cds-layer-02)",
          border: "1px solid var(--cds-border-subtle-01)",
          padding: "8px 10px",
          zIndex: 10,
          minWidth: 120,
          maxWidth: 160,
        }}>
          <div style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "1px", marginBottom: 5, fontFamily: "var(--cds-font-mono)" }}>
            {t(`muscles.${tooltip.id}`, { defaultValue: MUSCLES[tooltip.id]?.label })?.toUpperCase()}
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

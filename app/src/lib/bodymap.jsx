import React from "react";
import { useTranslation } from "react-i18next";
import { MUSCLES, SHAPES, BODY_PATH, PRIMARY_FILL, PRIMARY_HOVER, PRIMARY_STROKE } from "./bodymap.js";

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

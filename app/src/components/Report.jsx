import { useState, useEffect, useRef, useMemo } from "react";
import { subDays, format } from "date-fns";
import { nb } from "date-fns/locale";
import { fetchSessionsForReport } from "../lib/db";
import { HeatmapBodySVG, BodySVG, MUSCLES, useIsMobile } from "../lib/bodymap.jsx";
import { buildRecMuscleMap, callClaude, logDevError } from "../lib/utils";
import { CLAUDE_MODEL_TEXT, buildPeriodRecommendPrompt } from "../lib/prompts";
import {
  Tag, InlineLoading, DefinitionTooltip, Button, InlineNotification,
} from "@carbon/react";
import { AiGenerate, Add } from "@carbon/icons-react";
import PageShell, { SectionLabel, AccentChip, StickyCta } from "./PageShell";
import { useNav } from "../lib/NavContext";

const PERIODS = [
  { label: "7 dager", days: 7 },
  { label: "30 dager", days: 30 },
  { label: "90 dager", days: 90 },
];

const DAYS = [
  { label: "Man", day: 1 },
  { label: "Tir", day: 2 },
  { label: "Ons", day: 3 },
  { label: "Tor", day: 4 },
  { label: "Fre", day: 5 },
  { label: "Lør", day: 6 },
  { label: "Søn", day: 0 },
];

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        fontSize: 12,
        fontFamily: "var(--cds-font-mono)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        border: "1px solid",
        borderColor: active ? "var(--accent)" : "var(--border-subtle-wl)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--text-muted-wl)",
        cursor: "pointer",
        borderRadius: "var(--r-pill)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function KpiTile({ label, value }) {
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "16px 12px", borderRadius: "var(--r-tile)" }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: "var(--cds-text-primary)", fontFamily: "var(--cond)", lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--cds-font-mono)" }}>
        {label}
      </div>
    </div>
  );
}

export default function Report({ prefill, onPrefillConsumed }) {
  const isMobile = useIsMobile();
  const { onShowBibliotek } = useNav();
  const [mobileRecView, setMobileRecView] = useState("front");
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);

  const initialPrefill = useRef(prefill);
  useEffect(() => {
    if (!initialPrefill.current) return;
    const p = initialPrefill.current;
    if (p.periodDays) setPeriodDays(p.periodDays);
    if (p.selectedDays) setSelectedDays(p.selectedDays);
    if (p.selectedTypes) setSelectedTypes(p.selectedTypes);
    onPrefillConsumed?.();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const to = format(new Date(), "yyyy-MM-dd");
    const from = format(subDays(new Date(), periodDays - 1), "yyyy-MM-dd");
    fetchSessionsForReport(from, to)
      .then(setSessions)
      .catch(err => { logDevError("Report/fetchSessions", err); setError(err.message); })
      .finally(() => setLoading(false));
  }, [periodDays]);

  useEffect(() => {
    setRecs(null);
    setRecsError(null);
  }, [periodDays, selectedDays, selectedTypes]);

  useEffect(() => {
    if (!hoveredMuscle) return;
    const fn = e => { if (e.key === "Escape") setHoveredMuscle(null); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [hoveredMuscle]);

  const getAdvice = async () => {
    setLoadingRecs(true);
    setRecs(null);
    setRecsError(null);

    const trainedLabels = Object.entries(muscleCounts)
      .filter(([, c]) => c.primary > 0)
      .map(([id]) => MUSCLES[id]?.label || id)
      .join(", ");

    const untrainedLabels = untrainedMuscles.map(id => MUSCLES[id]?.label || id).join(", ");

    const prompt = buildPeriodRecommendPrompt(periodDays, sessionCount, trainedLabels, untrainedLabels);

    try {
      const res = await callClaude({
        model: CLAUDE_MODEL_TEXT,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data?.error?.message;
        throw new Error(detail ? `Serverfeil (${res.status}): ${detail}` : `Serverfeil (${res.status})`);
      }
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        throw new Error("Svaret fra Claude var ikke gyldig JSON. Prøv igjen.");
      }
      setRecs(parsed);
    } catch (err) {
      logDevError("Report/anbefalinger", err);
      setRecsError(err.message || "Kunne ikke hente anbefalinger. Prøv igjen.");
    } finally {
      setLoadingRecs(false);
    }
  };

  const availableTypes = useMemo(() => {
    const names = new Set();
    sessions.forEach(s => {
      if (s.gym_calendar?.name) names.add(s.gym_calendar.name);
    });
    return [...names].sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (selectedDays.size > 0) {
        const dow = new Date(s.session_date + "T12:00:00").getDay();
        if (!selectedDays.has(dow)) return false;
      }
      if (selectedTypes.size > 0) {
        const name = s.gym_calendar?.name || null;
        if (!name || !selectedTypes.has(name)) return false;
      }
      return true;
    });
  }, [sessions, selectedDays, selectedTypes]);

  const { muscleCounts, maxPrimaryCount, muscleExercises, muscleVolume, muscleLastDate } = useMemo(() => {
    const primarySessions = {};
    const secondarySessions = {};
    const exercises = {};
    const volumeSets = {};
    const lastDates = {};

    filteredSessions.forEach(s => {
      (s.session_exercises || []).forEach(ex => {
        const exSets = Math.max(1, parseInt(ex.sets) || 1);
        (ex.muscle_activations || []).forEach(ma => {
          const id = ma.muscle_id;
          if (ma.activation_type === "primary") {
            if (!primarySessions[id]) primarySessions[id] = new Set();
            primarySessions[id].add(s.id);
            volumeSets[id] = (volumeSets[id] || 0) + exSets;
          } else {
            if (!secondarySessions[id]) secondarySessions[id] = new Set();
            secondarySessions[id].add(s.id);
          }
          if (!exercises[id]) exercises[id] = new Set();
          exercises[id].add(ex.name);
          if (!lastDates[id] || s.session_date > lastDates[id]) lastDates[id] = s.session_date;
        });
      });
    });

    const counts = {};
    const volume = {};
    Object.keys(MUSCLES).forEach(id => {
      counts[id] = {
        primary: primarySessions[id]?.size || 0,
        secondary: secondarySessions[id]?.size || 0,
      };
      volume[id] = volumeSets[id] || 0;
    });

    const maxPrimary = Math.max(1, ...Object.values(counts).map(c => c.primary));
    return { muscleCounts: counts, maxPrimaryCount: maxPrimary, muscleExercises: exercises, muscleVolume: volume, muscleLastDate: lastDates };
  }, [filteredSessions]);

  const toggleDay = (day) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const toggleType = (name) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const sessionCount = filteredSessions.length;
  const musclesCovered = Object.values(muscleCounts).filter(c => c.primary > 0).length;
  const avgPerWeek = (sessionCount / (periodDays / 7)).toFixed(1);

  const untrainedMuscles = Object.entries(muscleCounts)
    .filter(([, c]) => c.primary === 0)
    .map(([id]) => id);

  const frequencyTable = Object.entries(muscleCounts)
    .map(([id, c]) => ({ id, ...c }))
    .sort((a, b) => b.primary - a.primary || b.secondary - a.secondary);

  const periodWeeks = Math.round(periodDays / 7);
  const dayLabel = selectedDays.size > 0
    ? DAYS.filter(d => selectedDays.has(d.day)).map(d => d.label.toUpperCase()).join(" · ")
    : "ALLE DAGER";
  const periodLabel = periodWeeks === 1 ? "1 UKE" : `${periodWeeks} UKER`;

  const labelStyle = {
    fontSize: 10,
    color: "var(--text-muted-wl)",
    letterSpacing: "0.14em",
    marginBottom: 8,
    fontFamily: "var(--cds-font-mono)",
    textTransform: "uppercase",
  };

  return (
    <PageShell>
      <div style={{ paddingBottom: 80 }}>
        <SectionLabel>
          <span style={{ display: "block" }}>PERIODE · {periodLabel}</span>
          <span style={{ display: "block" }}>{dayLabel}</span>
        </SectionLabel>

        {/* Hero */}
        <div style={{ padding: "4px 16px 20px" }}>
          <p style={{ fontFamily: "var(--cond)", fontSize: 30, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            <span style={{ color: "var(--accent)" }}>{untrainedMuscles.length} muskler</span>
          </p>
          <p style={{ fontFamily: "var(--cond)", fontSize: 30, fontWeight: 700, lineHeight: 1.1, margin: 0, color: "var(--cds-text-primary)" }}>
            aldri trent.
          </p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 12 }}>
          {/* Row 1: period */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 8 }}>
            {PERIODS.map(p => (
              <FilterChip key={p.days} label={p.label} active={periodDays === p.days} onClick={() => setPeriodDays(p.days)} />
            ))}
          </div>
          {/* Row 2: weekdays */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, paddingBottom: 8, borderTop: "1px solid var(--border-subtle-wl)" }}>
            {DAYS.map(d => (
              <FilterChip key={d.day} label={d.label} active={selectedDays.has(d.day)} onClick={() => toggleDay(d.day)} />
            ))}
          </div>
          {/* Row 3: session types — only when present */}
          {availableTypes.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, paddingBottom: 8, borderTop: "1px solid var(--border-subtle-wl)" }}>
              {availableTypes.map(name => (
                <FilterChip key={name} label={name} active={selectedTypes.has(name)} onClick={() => toggleType(name)} />
              ))}
            </div>
          )}
          <button
            onClick={() => { setSelectedDays(new Set()); setSelectedTypes(new Set()); }}
            style={{
              display: "block", background: "none", border: "none", padding: "4px 0 0", cursor: "pointer",
              fontSize: 11, color: "var(--accent)", fontFamily: "var(--cds-font-mono)",
              letterSpacing: "0.06em", textAlign: "left",
              opacity: (selectedDays.size > 0 || selectedTypes.size > 0) ? 1 : 0,
              pointerEvents: (selectedDays.size > 0 || selectedTypes.size > 0) ? "auto" : "none",
            }}
          >
            Nullstill filter
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {loading ? (
            <InlineLoading description="Laster rapport…" status="active" style={{ marginTop: 24 }} />
          ) : error ? (
            <p role="alert" style={{ color: "var(--cds-support-error)", fontSize: 14 }}>{error}</p>
          ) : (
            <>
              {/* KPI tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 20 }}>
                <KpiTile label="Økter" value={sessionCount} />
                <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "16px 12px", borderRadius: "var(--r-tile)" }}>
                  <div style={{ lineHeight: 1, marginBottom: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 600, fontFamily: "var(--cond)", color: "var(--cds-text-primary)" }}>{musclesCovered}</span>
                    <span style={{ fontSize: 22, fontWeight: 400, fontFamily: "var(--cond)", color: "var(--text-disabled-wl)" }}>/17</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--cds-font-mono)" }}>Muskler</div>
                </div>
                <KpiTile label="Snitt/uke" value={avgPerWeek} />
              </div>

              {/* Heatmap body */}
              <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
                {["front", "back"].map(view => (
                  <div key={view} style={{ flex: 1, background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "10px 6px", borderRadius: "var(--r-tile)" }}>
                    <HeatmapBodySVG view={view} counts={muscleCounts} maxCount={maxPrimaryCount} exerciseMap={muscleExercises} volumeMap={muscleVolume} onHover={setHoveredMuscle} hovered={hoveredMuscle} />
                  </div>
                ))}
              </div>

              {/* Hover detail card */}
              <div style={{ height: 68, marginBottom: 12, overflow: "hidden" }}>
                {hoveredMuscle ? (
                  <div style={{ borderLeft: "3px solid var(--accent)", background: "var(--surface-card)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                      {MUSCLES[hoveredMuscle]?.label}
                    </div>
                    <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--cds-font-sans)", color: "var(--cds-text-primary)" }}>
                          {muscleCounts[hoveredMuscle]?.primary || 0}
                        </span>
                        <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", marginLeft: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          PRIMÆRØKTER
                        </span>
                      </div>
                      {muscleLastDate[hoveredMuscle] && (
                        <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          SIST {format(new Date(muscleLastDate[hoveredMuscle] + "T12:00:00"), "d. MMM", { locale: nb })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", padding: "10px 0", letterSpacing: "0.08em" }}>
                    Hold musepeker over eller fokuser muskel for detaljer
                  </div>
                )}
              </div>

              {/* Heat legend */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex" }}>
                    {["--heat-1","--heat-2","--heat-3","--heat-4","--heat-5"].map(v => (
                      <div key={v} style={{ width: 10, height: 12, background: `var(${v})` }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)" }}>Primær</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" style={{ flexShrink: 0 }}>
                    <defs>
                      <pattern id="legend-sec" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45 0 0)">
                        <rect width="6" height="6" fill="#001d6c" />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#4589ff" strokeWidth="3" opacity="0.55" />
                      </pattern>
                    </defs>
                    <rect width="12" height="12" fill="url(#legend-sec)" />
                  </svg>
                  <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)" }}>Sekundær</span>
                </div>
              </div>

              {/* Gap callout card */}
              {untrainedMuscles.length > 0 && (
                <div style={{ background: "var(--accent-bg-08)", border: "1px solid var(--accent-bg-30)", padding: "14px 16px", marginBottom: 20, borderRadius: "var(--r-tile)" }}>
                  <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent-soft)", marginBottom: 10 }}>
                    IKKE TRUFFET
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {untrainedMuscles.map(id => (
                      <AccentChip key={id}>
                        {MUSCLES[id]?.label || id}
                      </AccentChip>
                    ))}
                  </div>
                </div>
              )}

              {/* Frequency table */}
              <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: 14, borderRadius: "var(--r-tile)" }}>
                <p style={{ ...labelStyle, marginBottom: 8 }} id="freq-table-label">Muskelfrekvens</p>
                <table aria-labelledby="freq-table-label" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle-wl)" }}>
                      <th scope="col" style={{ fontSize: 10, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "left", paddingBottom: 6, width: 140 }}>MUSKEL</th>
                      <th scope="col" aria-label="Frekvensbar" style={{ width: "100%" }} />
                      <th scope="col" style={{ fontSize: 10, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "right", paddingBottom: 6, width: 36 }}>ØKT</th>
                      <th scope="col" style={{ fontSize: 10, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "right", paddingBottom: 6, width: 40 }}>SETT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencyTable.map(({ id, primary, secondary }) => {
                      const barWidth = maxPrimaryCount > 0 ? (primary / maxPrimaryCount) * 100 : 0;
                      const countColor = primary > 0
                        ? "var(--cds-text-primary)"
                        : secondary > 0
                        ? "#4589ff"
                        : "var(--text-disabled-wl)";
                      const countLabel = primary > 0
                        ? String(primary)
                        : secondary > 0
                        ? `(${secondary})`
                        : "—";
                      return (
                        <tr key={id} style={{ borderBottom: "1px solid var(--border-subtle-wl)" }}>
                          <td style={{ fontSize: 12, color: "var(--cds-text-primary)", padding: "6px 0" }}>
                            {muscleExercises[id]?.size > 0 ? (
                              <DefinitionTooltip definition={[...muscleExercises[id]].join(", ")} openOnHover align="bottom">
                                {MUSCLES[id]?.label || id}
                              </DefinitionTooltip>
                            ) : MUSCLES[id]?.label || id}
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ height: 6, background: "var(--border-subtle-wl)" }}>
                              {primary > 0 && (
                                <div style={{ height: "100%", width: `${barWidth}%`, background: "var(--accent)" }} />
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 11, color: countColor, fontFamily: "var(--cds-font-mono)", textAlign: "right", padding: "6px 0" }}>
                            {countLabel}
                          </td>
                          <td style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", textAlign: "right", padding: "6px 0" }}>
                            {muscleVolume[id] > 0 ? muscleVolume[id] : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sessionCount > 0 && (
                <div style={{ marginTop: 20 }}>
                  <Button
                    kind="tertiary"
                    size="sm"
                    renderIcon={AiGenerate}
                    onClick={getAdvice}
                    disabled={loadingRecs}
                  >
                    {loadingRecs ? "Henter anbefalinger…" : "Få anbefaling"}
                  </Button>

                  <div aria-live="polite" aria-atomic="true">
                    {loadingRecs && (
                      <InlineLoading description="Analyserer treningsdata…" status="active" style={{ marginTop: 12 }} />
                    )}
                    {recsError && (
                      <InlineNotification
                        kind="error"
                        title="Feil:"
                        subtitle={recsError}
                        hideCloseButton
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </div>

                  {recs && recs.length > 0 && (() => {
                    const recPrimary = [...new Set(recs.flatMap(r => r.primary || []))];
                    const recSecAll = [...new Set(recs.flatMap(r => r.secondary || []))];
                    const recSecondary = recSecAll.filter(id => !recPrimary.includes(id));
                    return (
                      <div className="fade-in" style={{ marginTop: 12 }}>
                        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", overflow: "hidden", marginBottom: 10 }}>
                          <p style={{ ...labelStyle, margin: "14px 14px 10px" }}>Anbefalte øvelser</p>
                          {recs.map((r, i) => (
                            <div key={i} style={{
                              padding: "10px 14px",
                              borderLeft: "3px solid var(--accent)",
                              borderBottom: i < recs.length - 1 ? "1px solid var(--border-subtle-wl)" : "none",
                              display: "flex", alignItems: "flex-start", gap: 12,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontFamily: "var(--cond)", fontWeight: 700, marginBottom: 3, color: "var(--cds-text-primary)" }}>{r.name}</p>
                                <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.08em", marginBottom: r.tip ? 4 : 0 }}>
                                  {[
                                    (r.primary || []).map(id => MUSCLES[id]?.label || id).join(", "),
                                    (r.secondary || []).length > 0 && `(${(r.secondary || []).map(id => MUSCLES[id]?.label || id).join(", ")})`
                                  ].filter(Boolean).join(" · ")}
                                </p>
                                {r.tip && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)", margin: 0 }}>{r.tip}</p>}
                              </div>
                              <button
                                aria-label={`Legg til ${r.name} i biblioteket`}
                                onClick={() => onShowBibliotek()}
                                style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  background: "var(--accent)", border: "none", cursor: "pointer",
                                  color: "#fff", fontSize: 20, lineHeight: "28px",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Add size={16} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {isMobile ? (
                          <>
                            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                              {["front", "back"].map(v => (
                                <button key={v}
                                  onClick={() => setMobileRecView(v)}
                                  style={{
                                    padding: "5px 14px", borderRadius: "var(--r-pill)", border: "1px solid",
                                    borderColor: mobileRecView === v ? "var(--accent)" : "var(--border-subtle-wl)",
                                    background: mobileRecView === v ? "var(--accent)" : "transparent",
                                    color: mobileRecView === v ? "#fff" : "var(--text-muted-wl)",
                                    fontFamily: "var(--cds-font-mono)", fontSize: 11, cursor: "pointer",
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  {v === "front" ? "Front" : "Bak"}
                                </button>
                              ))}
                            </div>
                            <div style={{ maxWidth: 240, margin: "0 auto 10px", background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "10px 6px", borderRadius: "var(--r-tile)" }}>
                              <BodySVG view={mobileRecView} primary={recPrimary} secondary={recSecondary}
                                muscleMap={buildRecMuscleMap(recs)} />
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            {["front", "back"].map(view => (
                              <div key={view} style={{ flex: 1, background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "10px 6px", borderRadius: "var(--r-tile)" }}>
                                <BodySVG view={view} primary={recPrimary} secondary={recSecondary}
                                  muscleMap={buildRecMuscleMap(recs)} />
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 12 }}>
                          <Tag type="green" size="sm">Primær</Tag>
                          <Tag type="blue" size="sm">Sekundær</Tag>
                        </div>
                      </div>
                    );
                  })()}

                  {recs && recs.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", marginTop: 12 }}>
                      Ingen anbefalinger tilgjengelig.
                    </p>
                  )}
                </div>
              )}

              {sessionCount === 0 && (
                <p style={{ color: "var(--cds-text-secondary)", fontSize: 14, marginTop: 16 }}>
                  Ingen økter funnet for valgte filter.
                </p>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA to Bibliotek */}
        {recs && recs.length > 0 && (
          <StickyCta>
            <button
              onClick={() => onShowBibliotek()}
              style={{
                width: "100%", background: "var(--accent)", border: "none", cursor: "pointer",
                padding: "14px 16px", borderRadius: "var(--r-pill)",
                fontFamily: "var(--cond)", fontSize: 16, fontWeight: 700,
                color: "#fff", textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              Disse bør du legge inn i programmet →
            </button>
          </StickyCta>
        )}
      </div>
    </PageShell>
  );
}

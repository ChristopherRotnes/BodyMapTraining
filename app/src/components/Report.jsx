import { useState, useEffect, useMemo } from "react";
import { subDays, format } from "date-fns";
import { nb } from "date-fns/locale";
import { fetchSessionsForReport } from "../lib/db";
import { HeatmapBodySVG, BodySVG, MUSCLES, useIsMobile } from "../lib/bodymap.jsx";
import { buildRecMuscleMap, callClaude, logDevError } from "../lib/utils";
import { CLAUDE_MODEL_TEXT, buildPeriodRecommendPrompt } from "../lib/prompts";
import {
  Tag, InlineLoading, DefinitionTooltip, Button, InlineNotification,
} from "@carbon/react";
import { AiGenerate } from "@carbon/icons-react";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";

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
        padding: "5px 12px",
        fontSize: 12,
        fontFamily: "var(--cds-font-mono)",
        letterSpacing: "1px",
        textTransform: "uppercase",
        border: "1px solid",
        borderColor: active ? "var(--cds-interactive)" : "var(--cds-border-strong-01)",
        background: active ? "var(--cds-interactive)" : "transparent",
        color: active ? "#fff" : "var(--cds-text-primary)",
        cursor: "pointer",
        borderRadius: 0,
      }}
    >
      {label}
    </button>
  );
}

function KpiTile({ label, value }) {
  return (
    <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "16px 12px" }}>
      <div style={{ fontSize: 42, fontWeight: 300, color: "var(--cds-text-primary)", fontFamily: "var(--cds-font-sans)", lineHeight: 1, marginBottom: 8 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--cds-font-mono)" }}>
        {label}
      </div>
    </div>
  );
}

export default function Report({ onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek, currentView }) {

  const isMobile = useIsMobile();
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

  const labelStyle = {
    fontSize: 11,
    color: "var(--cds-text-secondary)",
    letterSpacing: "2px",
    marginBottom: 8,
    fontFamily: "var(--cds-font-mono)",
    textTransform: "uppercase",
  };

  return (
    <PageShell
      onShowHome={onShowHome}
      onShowLogger={onShowLogger}
      onShowHistory={onShowHistory}
      onShowReport={onShowReport}
      onShowBibliotek={onShowBibliotek}
      currentView={currentView}
    >
      <div style={{ paddingBottom: 32 }}>
          <SectionLabel>RAPPORT</SectionLabel>
          <PageHeading>Perioderapport</PageHeading>

          <div style={{ marginBottom: 16 }}>
            <p style={labelStyle}>Periode</p>
            <div style={{ display: "flex", gap: 8 }}>
              {PERIODS.map(p => (
                <FilterChip
                  key={p.days}
                  label={p.label}
                  active={periodDays === p.days}
                  onClick={() => setPeriodDays(p.days)}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ ...labelStyle, marginBottom: 0 }}>Dag <span style={{ opacity: 0.5 }}>(tom = alle)</span></p>
              {selectedDays.size > 0 && (
                <button onClick={() => setSelectedDays(new Set())} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--cds-interactive)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  Nullstill
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DAYS.map(d => (
                <FilterChip
                  key={d.day}
                  label={d.label}
                  active={selectedDays.has(d.day)}
                  onClick={() => toggleDay(d.day)}
                />
              ))}
            </div>
          </div>

          {availableTypes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ ...labelStyle, marginBottom: 0 }}>Økttype <span style={{ opacity: 0.5 }}>(tom = alle)</span></p>
                {selectedTypes.size > 0 && (
                  <button onClick={() => setSelectedTypes(new Set())} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--cds-interactive)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Nullstill
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {availableTypes.map(name => (
                  <FilterChip
                    key={name}
                    label={name}
                    active={selectedTypes.has(name)}
                    onClick={() => toggleType(name)}
                  />
                ))}
              </div>
            </div>
          )}

          <div aria-live="polite" aria-atomic="true">
          {loading ? (
            <InlineLoading description="Laster rapport…" status="active" style={{ marginTop: 24 }} />
          ) : error ? (
            <p role="alert" style={{ color: "var(--cds-support-error)", fontSize: 14 }}>{error}</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, marginBottom: 20 }}>
                <KpiTile label="Økter" value={sessionCount} />
                <KpiTile label="Muskelgrupper" value={`${musclesCovered}/17`} />
                <KpiTile label="Snitt/uke" value={avgPerWeek} />
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 0 }}>
                {["front", "back"].map(view => (
                  <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <HeatmapBodySVG view={view} counts={muscleCounts} maxCount={maxPrimaryCount} exerciseMap={muscleExercises} volumeMap={muscleVolume} onHover={setHoveredMuscle} hovered={hoveredMuscle} />
                  </div>
                ))}
              </div>

              <div style={{ height: 68, marginBottom: 12, overflow: "hidden" }}>
                {hoveredMuscle ? (
                  <div style={{ borderLeft: "3px solid var(--cds-interactive)", background: "var(--cds-layer-01)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                      {MUSCLES[hoveredMuscle]?.label}
                    </div>
                    <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--cds-font-sans)", color: "var(--cds-text-primary)" }}>
                          {muscleCounts[hoveredMuscle]?.primary || 0}
                        </span>
                        <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--cds-text-secondary)", marginLeft: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          PRIMÆRØKTER
                        </span>
                      </div>
                      {muscleLastDate[hoveredMuscle] && (
                        <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          SIST {format(new Date(muscleLastDate[hoveredMuscle] + "T12:00:00"), "d. MMM", { locale: nb })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", padding: "10px 0", letterSpacing: "0.08em" }}>
                    Hold musepeker over eller fokuser muskel for detaljer
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex" }}>
                    {["--heat-1","--heat-2","--heat-3","--heat-4","--heat-5"].map(v => (
                      <div key={v} style={{ width: 10, height: 12, background: `var(${v})` }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)" }}>Primær</span>
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
                  <span style={{ fontSize: 11, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)" }}>Sekundær</span>
                </div>
              </div>

              {untrainedMuscles.length > 0 && (
                <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-support-warning)", padding: 14, marginBottom: 20 }}>
                  <p style={{ ...labelStyle, color: "var(--cds-support-warning)", marginBottom: 10 }}>
                    Ikke trent i perioden
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {untrainedMuscles.map(id => (
                      <Tag key={id} type="warm-gray" size="sm">{MUSCLES[id]?.label || id}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14 }}>
                <p style={{ ...labelStyle, marginBottom: 8 }} id="freq-table-label">Muskelfrekvens</p>
                <table aria-labelledby="freq-table-label" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--cds-border-strong-01)" }}>
                      <th scope="col" style={{ fontSize: 10, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "left", paddingBottom: 6, width: 140 }}>MUSKEL</th>
                      <th scope="col" aria-label="Frekvensbar" style={{ width: "100%" }} />
                      <th scope="col" style={{ fontSize: 10, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "right", paddingBottom: 6, width: 36 }}>ØKT</th>
                      <th scope="col" style={{ fontSize: 10, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "right", paddingBottom: 6, width: 40 }}>SETT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencyTable.map(({ id, primary, secondary }) => {
                      const barWidth = maxPrimaryCount > 0 ? (primary / maxPrimaryCount) * 100 : 0;
                      const countColor = primary > 0
                        ? "var(--cds-text-primary)"
                        : secondary > 0
                        ? "#4589ff"
                        : "var(--cds-text-disabled)";
                      const countLabel = primary > 0
                        ? String(primary)
                        : secondary > 0
                        ? `(${secondary})`
                        : "—";
                      return (
                        <tr key={id} style={{ borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                          <td style={{ fontSize: 12, color: "var(--cds-text-primary)", padding: "6px 0" }}>
                            {muscleExercises[id]?.size > 0 ? (
                              <DefinitionTooltip definition={[...muscleExercises[id]].join(", ")} openOnHover align="bottom">
                                {MUSCLES[id]?.label || id}
                              </DefinitionTooltip>
                            ) : MUSCLES[id]?.label || id}
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ height: 6, background: "var(--cds-layer-02)" }}>
                              {primary > 0 && (
                                <div style={{ height: "100%", width: `${barWidth}%`, background: "var(--heat-4)" }} />
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 11, color: countColor, fontFamily: "var(--cds-font-mono)", textAlign: "right", padding: "6px 0" }}>
                            {countLabel}
                          </td>
                          <td style={{ fontSize: 11, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", textAlign: "right", padding: "6px 0" }}>
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
                        <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 10 }}>
                          <p style={{ ...labelStyle, marginBottom: 10 }}>Anbefalte øvelser</p>
                          {recs.map((r, i) => (
                            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--cds-text-primary)" }}>{r.name}</p>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: r.tip ? 4 : 0 }}>
                                {(r.primary || []).length > 0 && (
                                  <Tag type="green" size="sm">{r.primary.map(id => MUSCLES[id]?.label || id).join(", ")}</Tag>
                                )}
                                {(r.secondary || []).length > 0 && (
                                  <Tag type="blue" size="sm">{r.secondary.map(id => MUSCLES[id]?.label || id).join(", ")}</Tag>
                                )}
                              </div>
                              {r.tip && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{r.tip}</p>}
                            </div>
                          ))}
                        </div>

                        {isMobile ? (
                          <>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              {["front", "back"].map(v => (
                                <Button key={v} kind={mobileRecView === v ? "primary" : "ghost"} size="sm"
                                  onClick={() => setMobileRecView(v)}>
                                  {v === "front" ? "Front" : "Bak"}
                                </Button>
                              ))}
                            </div>
                            <div style={{ maxWidth: 240, margin: "0 auto 10px", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                              <BodySVG view={mobileRecView} primary={recPrimary} secondary={recSecondary}
                                muscleMap={buildRecMuscleMap(recs)} />
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                            {["front", "back"].map(view => (
                              <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                                <BodySVG view={view} primary={recPrimary} secondary={recSecondary}
                                  muscleMap={buildRecMuscleMap(recs)} />
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
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
        </div>
    </PageShell>
  );
}

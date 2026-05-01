import React, { useState, useEffect, useMemo } from "react";
import { subDays, format } from "date-fns";
import { fetchSessionsForReport } from "../lib/db";
import { HeatmapBodySVG, BodySVG, MUSCLES, useIsMobile } from "../lib/bodymap.jsx";
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent,
  Tag, InlineLoading, DefinitionTooltip, Button, InlineNotification,
} from "@carbon/react";
import { Camera, RecentlyViewed, Asleep, Light, AiGenerate } from "@carbon/icons-react";
import { useTheme } from "../theme";

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

function StatTile({ label, value }) {
  return (
    <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "14px 12px" }}>
      <div style={{ fontSize: 24, fontWeight: 600, color: "var(--cds-text-primary)", fontFamily: "var(--cds-font-mono)", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "var(--cds-font-mono)" }}>
        {label}
      </div>
    </div>
  );
}

function buildRecMuscleMap(recs) {
  const map = {};
  (recs || []).forEach(r => {
    [...(r.primary || []), ...(r.secondary || [])].forEach(id => {
      if (!map[id]) map[id] = [];
      if (!map[id].includes(r.name)) map[id].push(r.name);
    });
  });
  return map;
}

export default function Report({ onNewSession, onShowHistory }) {
  const { theme, setTheme } = useTheme();
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    const to = format(new Date(), "yyyy-MM-dd");
    const from = format(subDays(new Date(), periodDays - 1), "yyyy-MM-dd");
    fetchSessionsForReport(from, to)
      .then(setSessions)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [periodDays]);

  useEffect(() => {
    setRecs(null);
    setRecsError(null);
  }, [periodDays, selectedDays, selectedTypes]);

  const getAdvice = async () => {
    setLoadingRecs(true);
    setRecs(null);
    setRecsError(null);

    const trainedLabels = Object.entries(muscleCounts)
      .filter(([, c]) => c.primary > 0)
      .map(([id]) => MUSCLES[id]?.label || id)
      .join(", ");

    const untrainedLabels = untrainedMuscles.map(id => MUSCLES[id]?.label || id).join(", ");

    const prompt = `Du er en personlig trener som analyserer en klients treningshistorikk fra de siste ${periodDays} dagene (${sessionCount} økter).
Trent (primær): ${trainedLabels || "ingen"}.
Ikke trent: ${untrainedLabels || "alle muskelgrupper er dekket"}.
Foreslå 5 øvelser som prioriterer de utrente musklene. Gjerne øvelser som er vanlige på norske treningssentre.
Bruk KUN disse muscle-ID-ene: chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves, traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Øvelsesnavn","primary":["muscle_id"],"secondary":["muscle_id"],"tip":"Kort praktisk tips på norsk"}]`;

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`API-feil ${res.status}`);
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      setRecs(JSON.parse(text));
    } catch (err) {
      setRecsError(err.message);
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

  const { muscleCounts, maxPrimaryCount, muscleExercises } = useMemo(() => {
    const primarySessions = {};
    const secondarySessions = {};
    const exercises = {};

    filteredSessions.forEach(s => {
      (s.session_exercises || []).forEach(ex => {
        (ex.muscle_activations || []).forEach(ma => {
          const id = ma.muscle_id;
          if (ma.activation_type === "primary") {
            if (!primarySessions[id]) primarySessions[id] = new Set();
            primarySessions[id].add(s.id);
          } else {
            if (!secondarySessions[id]) secondarySessions[id] = new Set();
            secondarySessions[id].add(s.id);
          }
          if (!exercises[id]) exercises[id] = new Set();
          exercises[id].add(ex.name);
        });
      });
    });

    const counts = {};
    Object.keys(MUSCLES).forEach(id => {
      counts[id] = {
        primary: primarySessions[id]?.size || 0,
        secondary: secondarySessions[id]?.size || 0,
      };
    });

    const maxPrimary = Math.max(1, ...Object.values(counts).map(c => c.primary));
    return { muscleCounts: counts, maxPrimaryCount: maxPrimary, muscleExercises: exercises };
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
    <>
      <Header aria-label="Workout Lens">
        <SkipToContent />
        <HeaderName href="#" prefix="">Workout Lens</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Logg ny økt" onClick={onNewSession}>
            <Camera size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Treningshistorikk" onClick={onShowHistory}>
            <RecentlyViewed size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label={theme === "g10" ? "Bytt til mørkt tema" : "Bytt til lyst tema"}
            onClick={() => setTheme(theme === "g10" ? "g100" : "g10")}
          >
            {theme === "g10" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <main style={{ paddingTop: 48, minHeight: "100vh", background: "var(--cds-background)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>

          <p style={{ ...labelStyle, marginBottom: 20 }}>Perioderapport</p>

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

          {loading ? (
            <InlineLoading description="Laster rapport…" status="active" style={{ marginTop: 24 }} />
          ) : error ? (
            <p style={{ color: "var(--cds-support-error)", fontSize: 14 }}>{error}</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
                <StatTile label="Økter" value={sessionCount} />
                <StatTile label="Muskelgrupper" value={`${musclesCovered}/17`} />
                <StatTile label="Snitt / uke" value={avgPerWeek} />
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                {["front", "back"].map(view => (
                  <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <HeatmapBodySVG view={view} counts={muscleCounts} maxCount={maxPrimaryCount} exerciseMap={muscleExercises} />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, background: "rgba(36,161,72,0.9)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)" }}>Primær (mørkere = flere økter)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, background: "rgba(120,169,255,0.5)", flexShrink: 0 }} />
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
                <p style={{ ...labelStyle, marginBottom: 12 }}>Muskelfrekvens</p>
                {frequencyTable.map(({ id, primary, secondary }) => {
                  const barWidth = maxPrimaryCount > 0 ? (primary / maxPrimaryCount) * 100 : 0;
                  const countColor = primary > 0
                    ? "var(--cds-text-primary)"
                    : secondary > 0
                    ? "rgba(120,169,255,0.8)"
                    : "var(--cds-text-disabled)";
                  const countLabel = primary > 0
                    ? String(primary)
                    : secondary > 0
                    ? `(${secondary})`
                    : "—";
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                      <span style={{ fontSize: 12, color: "var(--cds-text-primary)", width: 140, flexShrink: 0 }}>
                        {muscleExercises[id]?.size > 0 ? (
                          <DefinitionTooltip definition={[...muscleExercises[id]].join(", ")} openOnHover align="bottom">
                            {MUSCLES[id]?.label || id}
                          </DefinitionTooltip>
                        ) : MUSCLES[id]?.label || id}
                      </span>
                      <div style={{ flex: 1, height: 6, background: "var(--cds-layer-02)" }}>
                        {primary > 0 && (
                          <div style={{ height: "100%", width: `${barWidth}%`, background: "rgba(36,161,72,0.8)" }} />
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: countColor, fontFamily: "var(--cds-font-mono)", width: 36, textAlign: "right", flexShrink: 0 }}>
                        {countLabel}
                      </span>
                    </div>
                  );
                })}
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

                  {loadingRecs && (
                    <InlineLoading description="Analyserer treningsdata…" status="active" style={{ marginTop: 12 }} />
                  )}

                  {recsError && (
                    <InlineNotification
                      kind="error"
                      title="Feil:"
                      subtitle={recsError}
                      hideCloseButton
                      lowContrast
                      style={{ marginTop: 12 }}
                    />
                  )}

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
      </main>
    </>
  );
}

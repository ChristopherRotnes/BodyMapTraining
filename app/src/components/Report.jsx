import { useState, useEffect, useRef, useMemo } from "react";
import { fetchSessionsForReport, saveLibraryExercise, fetchRecsCache, saveRecsCache } from "../lib/db";
import { HeatmapBodySVG } from "../lib/bodymap.jsx";
import { MUSCLES } from "../lib/bodymap";
import { callClaude, logDevError, getIntlLocale } from "../lib/utils";
import { CLAUDE_MODEL_TEXT, buildPeriodRecommendPrompt, RECS_PROMPT_VERSION } from "../lib/prompts";
import {
  Tag, InlineLoading, DefinitionTooltip, Button, InlineNotification,
} from "@carbon/react";
import { AiGenerate, Add, Checkmark, Renew } from "@carbon/icons-react";
import PageShell, { SectionLabel, AccentChip } from "./PageShell";
import { useTranslation } from "react-i18next";
import i18n from "../lib/i18n";

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
        borderColor: active ? "var(--accent-active)" : "var(--border-subtle-wl)",
        background: active ? "var(--accent-active)" : "transparent",
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

function recsCacheKey(periodDays, sessionCount, trainedIds, untrainedIds) {
  return `v${RECS_PROMPT_VERSION}_${periodDays}_${sessionCount}_${[...trainedIds].sort().join(',')}_${[...untrainedIds].sort().join(',')}`;
}

export default function Report({ prefill, onPrefillConsumed }) {
  const { t } = useTranslation();
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedInstructors, setSelectedInstructors] = useState(new Set());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [savedRecs, setSavedRecs] = useState(new Set());
  const [savingRec, setSavingRec] = useState(null);
  const [saveRecError, setSaveRecError] = useState(null);

  const PERIODS = useMemo(() => [
    { label: t("report.periods.7"), days: 7 },
    { label: t("report.periods.30"), days: 30 },
    { label: t("report.periods.90"), days: 90 },
  ], [t]);

  const DAYS = useMemo(() => [
    { label: t("report.days.mon"), day: 1 },
    { label: t("report.days.tue"), day: 2 },
    { label: t("report.days.wed"), day: 3 },
    { label: t("report.days.thu"), day: 4 },
    { label: t("report.days.fri"), day: 5 },
    { label: t("report.days.sat"), day: 6 },
    { label: t("report.days.sun"), day: 0 },
  ], [t]);

  const initialPrefill = useRef(prefill);
  useEffect(() => {
    if (!initialPrefill.current) return;
    const p = initialPrefill.current;
    if (p.periodDays) setPeriodDays(p.periodDays);
    if (p.selectedDays) setSelectedDays(p.selectedDays);
    if (p.selectedTypes) setSelectedTypes(p.selectedTypes);
    if (p.weekday !== undefined) setSelectedDays(new Set([p.weekday]));
    if (p.sessionType) setSelectedTypes(new Set([p.sessionType]));
    onPrefillConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only: onPrefillConsumed excluded — it's a one-shot callback that must not re-run if parent re-renders

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setSelectedInstructors(new Set());
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - (periodDays - 1) * 86400_000).toISOString().slice(0, 10);
    fetchSessionsForReport(from, to)
      .then(setSessions)
      .catch(err => { logDevError("Report/fetchSessions", err); setError(err.message); })
      .finally(() => setLoading(false));
  }, [periodDays]);

  useEffect(() => {
    if (!hoveredMuscle) return;
    const fn = e => { if (e.key === "Escape") setHoveredMuscle(null); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [hoveredMuscle]);

  const handleSaveRec = async (r) => {
    setSavingRec(r.name);
    setSaveRecError(null);
    try {
      await saveLibraryExercise({
        name: r.name,
        primary_muscles: r.primary || [],
        secondary_muscles: r.secondary || [],
      });
      setSavedRecs(prev => new Set([...prev, r.name]));
    } catch (err) {
      if (err?.code === "23505") {
        setSavedRecs(prev => new Set([...prev, r.name]));
      } else {
        setSaveRecError(t("report.saveRecError"));
      }
    } finally {
      setSavingRec(null);
    }
  };

  const getAdvice = async () => {
    setLoadingRecs(true);
    setRecs(null);
    setRecsError(null);

    const trainedLabels = trainedIds.map(id => MUSCLES[id]?.label || id).join(", ");
    const untrainedLabels = untrainedMuscles.map(id => MUSCLES[id]?.label || id).join(", ");

    const prompt = buildPeriodRecommendPrompt(periodDays, sessionCount, trainedLabels, untrainedLabels, i18n.language);

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
      saveRecsCache(recsCacheKey(periodDays, sessionCount, trainedIds, untrainedMuscles), parsed);
    } catch (err) {
      logDevError("Report/anbefalinger", err);
      setRecsError(err.message || t("report.fetchRecError"));
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

  const availableInstructors = useMemo(() => {
    const names = new Set();
    sessions.forEach(s => {
      if (s.gym_calendar?.instructor) names.add(s.gym_calendar.instructor);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
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
      if (selectedInstructors.size > 0) {
        if (!selectedInstructors.has(s.gym_calendar?.instructor)) return false;
      }
      return true;
    });
  }, [sessions, selectedDays, selectedTypes, selectedInstructors]);

  const { muscleCounts, maxPrimaryCount, muscleExercises, muscleLastDate } = useMemo(() => {
    const primarySessions = {};
    const secondarySessions = {};
    const exercises = {};
    const lastDates = {};

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
          if (!lastDates[id] || s.session_date > lastDates[id]) lastDates[id] = s.session_date;
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
    return { muscleCounts: counts, maxPrimaryCount: maxPrimary, muscleExercises: exercises, muscleLastDate: lastDates };
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

  const toggleInstructor = (id) => {
    setSelectedInstructors(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const sessionCount = filteredSessions.length;
  const avgPerWeek = (sessionCount / (periodDays / 7)).toFixed(1);

  const { musclesCovered, trainedIds, untrainedMuscles, secondaryOnlyMuscles, frequencyTable } = useMemo(() => {
    const entries = Object.entries(muscleCounts);
    const musclesCovered = entries.filter(([, c]) => c.primary > 0).length;
    const trainedIds = entries.filter(([, c]) => c.primary > 0).map(([id]) => id);
    const untrainedMuscles = entries.filter(([, c]) => c.primary === 0).map(([id]) => id);
    const secondaryOnlyMuscles = entries.filter(([, c]) => c.primary === 0 && c.secondary > 0).map(([id]) => id);
    const frequencyTable = entries
      .map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => b.primary - a.primary || b.secondary - a.secondary);
    return { musclesCovered, trainedIds, untrainedMuscles, secondaryOnlyMuscles, frequencyTable };
  }, [muscleCounts]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecsError(null);
    fetchRecsCache(recsCacheKey(periodDays, sessionCount, trainedIds, untrainedMuscles))
      .then(cached => { if (!cancelled) setRecs(cached); })
      .catch(() => { if (!cancelled) setRecs(null); });
    return () => { cancelled = true; };
    // muscleCounts, sessionCount, untrainedMuscles are derived from the state values already in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays, selectedDays, selectedTypes, selectedInstructors, sessions]);

  const dayLabel = selectedDays.size > 0
    ? DAYS.filter(d => selectedDays.has(d.day)).map(d => d.label.toUpperCase()).join(" · ")
    : t("report.activeDays");
  const periodLabel = t(`report.periods.${periodDays}`, { defaultValue: `${periodDays}` });

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
      <div style={{ paddingBottom: 24 }}>
        <SectionLabel>
          <span style={{ display: "block" }}>{t("report.period")} · {periodLabel}</span>
          <span style={{ display: "block" }}>{dayLabel}</span>
        </SectionLabel>

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
          {/* Row 4: instructors — when any instructor is present */}
          {availableInstructors.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, paddingBottom: 8, borderTop: "1px solid var(--border-subtle-wl)" }}>
              {availableInstructors.map(name => (
                <FilterChip key={name} label={name} active={selectedInstructors.has(name)} onClick={() => toggleInstructor(name)} />
              ))}
            </div>
          )}
          <button
            onClick={() => { setSelectedDays(new Set()); setSelectedTypes(new Set()); setSelectedInstructors(new Set()); }}
            style={{
              display: "block", background: "none", border: "none", padding: "4px 0 0", cursor: "pointer",
              fontSize: 11, color: "var(--accent)", fontFamily: "var(--cds-font-mono)",
              letterSpacing: "0.06em", textAlign: "left",
              opacity: (selectedDays.size > 0 || selectedTypes.size > 0 || selectedInstructors.size > 0) ? 1 : 0,
              pointerEvents: (selectedDays.size > 0 || selectedTypes.size > 0 || selectedInstructors.size > 0) ? "auto" : "none",
            }}
          >
            {t("common.resetFilter")}
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {loading ? (
            <InlineLoading description={t("common.loading")} status="active" style={{ marginTop: 24 }} />
          ) : error ? (
            <p role="alert" style={{ color: "var(--cds-support-error)", fontSize: 14 }}>{error}</p>
          ) : (
            <>
              {/* KPI tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 20 }}>
                <KpiTile label={t("report.kpiSessions")} value={sessionCount} />
                <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "16px 12px", borderRadius: "var(--r-tile)" }}>
                  <div style={{ lineHeight: 1, marginBottom: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 600, fontFamily: "var(--cond)", color: "var(--cds-text-primary)" }}>{musclesCovered}</span>
                    <span style={{ fontSize: 22, fontWeight: 400, fontFamily: "var(--cond)", color: "var(--text-disabled-wl)" }}>/17</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--cds-font-mono)" }}>{t("report.kpiMuscles")}</div>
                </div>
                <KpiTile label={t("report.kpiAvgPerWeek")} value={avgPerWeek} />
              </div>

              {/* Heatmap body */}
              <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
                {["front", "back"].map(view => (
                  <div key={view} style={{ flex: 1, background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "10px 6px", borderRadius: "var(--r-tile)" }}>
                    <HeatmapBodySVG view={view} counts={muscleCounts} maxCount={maxPrimaryCount} exerciseMap={muscleExercises} onHover={setHoveredMuscle} hovered={hoveredMuscle} />
                  </div>
                ))}
              </div>

              {/* Hover detail card */}
              <div style={{ height: 68, marginBottom: 12, overflow: "hidden" }}>
                {hoveredMuscle ? (
                  <div style={{ borderInlineStart: "3px solid var(--accent)", background: "var(--surface-card)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                      {t(`muscles.${hoveredMuscle}`, { defaultValue: MUSCLES[hoveredMuscle]?.label })}
                    </div>
                    <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--cds-font-sans)", color: "var(--cds-text-primary)" }}>
                          {muscleCounts[hoveredMuscle]?.primary || 0}
                        </span>
                        <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", marginLeft: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {t("report.primarySessions")}
                        </span>
                      </div>
                      {muscleLastDate[hoveredMuscle] && (
                        <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          {t("report.lastDate")} {new Intl.DateTimeFormat(getIntlLocale(), { day: "numeric", month: "short" }).format(new Date(muscleLastDate[hoveredMuscle] + "T12:00:00"))}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", padding: "10px 0", letterSpacing: "0.08em" }}>
                    {t("report.hoverHint")}
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
                  <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)" }}>{t("report.legendPrimary")}</span>
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
                  <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)" }}>{t("report.legendSecondary")}</span>
                </div>
              </div>

              {/* Frequency table */}
              <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: 14, borderRadius: "var(--r-tile)", marginBottom: 20 }}>
                <p style={{ ...labelStyle, marginBottom: 8 }} id="freq-table-label">{t("report.frequencyTable")}</p>
                <table aria-labelledby="freq-table-label" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle-wl)" }}>
                      <th scope="col" style={{ fontSize: 10, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "left", paddingBottom: 6, width: 140 }}>{t("report.colMuscle")}</th>
                      <th scope="col" aria-label={t("report.frequencyTable")} style={{ width: "100%" }} />
                      <th scope="col" style={{ fontSize: 10, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", letterSpacing: "1px", textAlign: "right", paddingBottom: 6, width: 36 }}>{t("report.colSession")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencyTable.map(({ id, primary, secondary }) => {
                      const barWidth = maxPrimaryCount > 0 ? (primary / maxPrimaryCount) * 100 : 0;
                      const countColor = primary > 0
                        ? "var(--cds-text-primary)"
                        : secondary > 0
                        ? "var(--cds-blue-40)"
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
                                {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                              </DefinitionTooltip>
                            ) : t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Untrained section — acts as recommendation header */}
              {untrainedMuscles.length > 0 ? (
                <div style={{ background: "var(--accent-bg-08)", border: "1px solid var(--accent-bg-30)", padding: "14px 16px", marginBottom: 16, borderRadius: "var(--r-tile)" }}>
                  <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent-soft)", marginBottom: 10 }}>
                    {t("report.gapHeading")}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {untrainedMuscles.map(id => (
                      <AccentChip key={id}>
                        {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                      </AccentChip>
                    ))}
                  </div>
                </div>
              ) : secondaryOnlyMuscles.length > 0 ? (
                <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "14px 16px", marginBottom: 16, borderRadius: "var(--r-tile)" }}>
                  <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted-wl)", marginBottom: 10 }}>
                    {t("report.allMusclesSecondaryNote")}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {secondaryOnlyMuscles.map(id => (
                      <Tag key={id} type="blue" size="sm">
                        {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                      </Tag>
                    ))}
                  </div>
                </div>
              ) : sessionCount > 0 ? (
                <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-sans)", marginBottom: 16 }}>
                  {t("report.allMusclesPrimary")}
                </p>
              ) : null}

              {/* Recommendation button + results */}
              {sessionCount > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <Button
                    kind="tertiary"
                    size="sm"
                    renderIcon={AiGenerate}
                    onClick={getAdvice}
                    disabled={loadingRecs}
                  >
                    {loadingRecs ? t("report.loadingRecs") : t("report.getRecommendation")}
                  </Button>

                  <div aria-live="polite" aria-atomic="true">
                    {loadingRecs && (
                      <InlineLoading description={t("report.analyzingData")} status="active" style={{ marginTop: 12 }} />
                    )}
                    {recsError && (
                      <InlineNotification
                        kind="error"
                        title={`${t("common.error")}:`}
                        subtitle={recsError}
                        hideCloseButton
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </div>

                  {recs && recs.length > 0 && (
                    <div className="fade-in" style={{ marginTop: 12 }}>
                      <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", overflow: "hidden" }}>
                        <p style={{ ...labelStyle, margin: "14px 14px 10px" }}>{t("report.recommendedExercises")}</p>
                        {saveRecError && (
                          <InlineNotification
                            kind="error"
                            title={`${t("common.error")}:`}
                            subtitle={saveRecError}
                            hideCloseButton
                            style={{ margin: "0 14px 8px" }}
                          />
                        )}
                        {recs.map((r, i) => (
                          <div key={i} style={{
                            padding: "10px 14px",
                            borderInlineStart: "3px solid var(--accent)",
                            borderBottom: i < recs.length - 1 ? "1px solid var(--border-subtle-wl)" : "none",
                            display: "flex", alignItems: "flex-start", gap: 12,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontFamily: "var(--cond)", fontWeight: 700, marginBottom: 3, color: "var(--cds-text-primary)" }}>{r.name}</p>
                              <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.08em", marginBottom: r.tip ? 4 : 0 }}>
                                {[
                                  (r.primary || []).map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", "),
                                  (r.secondary || []).length > 0 && `(${(r.secondary || []).map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ")})`
                                ].filter(Boolean).join(" · ")}
                              </p>
                              {r.tip && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)", margin: 0 }}>{r.tip}</p>}
                            </div>
                            {savedRecs.has(r.name) ? (
                              <button
                                disabled
                                aria-label={`${r.name} er lagret i biblioteket`}
                                style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  background: "var(--cds-layer-02)", border: "none", cursor: "default",
                                  color: "var(--cds-text-secondary)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Checkmark size={16} />
                              </button>
                            ) : (
                              <button
                                aria-label={`Legg til ${r.name} i biblioteket`}
                                onClick={() => handleSaveRec(r)}
                                disabled={savingRec === r.name}
                                style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  background: savingRec === r.name ? "var(--cds-layer-02)" : "var(--accent)",
                                  border: "none",
                                  cursor: savingRec === r.name ? "default" : "pointer",
                                  color: savingRec === r.name ? "var(--cds-text-secondary)" : "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                  opacity: savingRec === r.name ? 0.5 : 1,
                                }}
                              >
                                <Add size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <Button
                          kind="ghost"
                          size="sm"
                          renderIcon={Renew}
                          onClick={getAdvice}
                          disabled={loadingRecs}
                          style={{ marginTop: 4 }}
                        >
                          {t("report.refreshRecs")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {recs && recs.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", marginTop: 12 }}>
                      {t("report.noRecs")}
                    </p>
                  )}
                </div>
              )}

              {sessionCount === 0 && (
                <p style={{ color: "var(--cds-text-secondary)", fontSize: 14, marginTop: 16 }}>
                  {t("report.noSessions")}
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </PageShell>
  );
}

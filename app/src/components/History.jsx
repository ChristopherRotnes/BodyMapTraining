import { useState, useEffect, useRef, useMemo } from "react";
import { fetchSessions, fetchSessionsByDate, fetchGymSessionsByDate, updateSession, fetchLibraryExercises, fetchClassHistory } from "../lib/db";
import { MUSCLES, calcMuscles } from "../lib/bodymap";
import { compressImage, buildMuscleMapFromSession, buildMuscleMapFromExercises, callClaude, extractMuscles, logDevError, getIntlLocale, toIsoDate } from "../lib/utils";
import { CLAUDE_MODEL_VISION, ANALYZE_PROMPT } from "../lib/prompts";
import {
  Button, Tag,
  AccordionSkeleton, SkeletonPlaceholder,
} from "@carbon/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "@carbon/icons-react";
import MonthGrid from "./MonthGrid";
import SessionEditPanel from "./SessionEditPanel";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";
import { useTranslation } from "react-i18next";

const MUSCLE_FILTER_ITEMS = Object.entries(MUSCLES).map(([id, { label }]) => ({ id, label }));

function sessionExToEditFormat(exercises) {
  return exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    standardName: ex.standard_name || "",
    primary: (ex.muscle_activations || []).filter(ma => ma.activation_type === "primary").map(ma => ma.muscle_id),
    secondary: (ex.muscle_activations || []).filter(ma => ma.activation_type === "secondary").map(ma => ma.muscle_id),
    enabled: true,
  }));
}

function sessionMuscleIds(session) {
  return new Set(
    (session.session_exercises || []).flatMap(ex =>
      (ex.muscle_activations || []).map(ma => ma.muscle_id)
    )
  );
}


export default function History({ initialDate }) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    initialDate ? new Date(initialDate + "T12:00:00") : undefined
  );
  const [daySessions, setDaySessions] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const [loadingSession, setLoadingSession] = useState(false);
  const [today, setToday] = useState(() => new Date());

  const initDate = initialDate ? new Date(initialDate + "T12:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const atCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(() => setToday(new Date()), midnight - now);
    return () => clearTimeout(timer);
  }, [today]);

  const [muscleFilter, setMuscleFilter] = useState([]);

  const [sessionEdits, setSessionEdits] = useState(new Map());
  const [libraryExercises, setLibraryExercises] = useState([]);
  const libraryCache = useRef(null);
  const uploadingForSessionRef = useRef(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [classHistory, setClassHistory] = useState(new Map());
  const fileRef = useRef();
  const initialDateRef = useRef(initialDate);

  const patchSessionEdit = (id, patch) => setSessionEdits(prev => {
    const next = new Map(prev);
    next.set(id, { ...(next.get(id) || {}), ...patch });
    return next;
  });

  useEffect(() => {
    Promise.all([fetchSessions(), fetchLibraryExercises()])
      .then(([sessions, library]) => {
        setSessions(sessions);
        libraryCache.current = library;
        setLibraryExercises(library);
      })
      .catch(e => logDevError("History/init", e))
      .finally(() => setLoading(false));
  }, []);

  const sessionMuscleIdMap = useMemo(
    () => new Map(sessions.map(s => [s.id, sessionMuscleIds(s)])),
    [sessions]
  );
  const filteredSessions = useMemo(
    () => muscleFilter.length === 0 ? sessions
      : sessions.filter(s => muscleFilter.some(id => (sessionMuscleIdMap.get(s.id) ?? new Set()).has(id))),
    [sessions, muscleFilter, sessionMuscleIdMap]
  );
  const filteredTrainedSet = useMemo(
    () => new Set(filteredSessions.map(s => s.session_date)),
    [filteredSessions]
  );

  const sessionCountMap = useMemo(() => {
    const map = {};
    filteredSessions.forEach(s => {
      map[s.session_date] = (map[s.session_date] || 0) + 1;
    });
    return map;
  }, [filteredSessions]);

  const currentMonthCount = useMemo(() => filteredSessions.filter(s => {
    const d = new Date(s.session_date + "T12:00:00");
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length, [filteredSessions, viewYear, viewMonth]);

  const loadClassHistory = async (gymCalendarId) => {
    setClassHistory(prev => new Map(prev).set(gymCalendarId, { loading: true, sessions: [], error: null }));
    try {
      const data = await fetchClassHistory(gymCalendarId);
      setClassHistory(prev => new Map(prev).set(gymCalendarId, { loading: false, sessions: data, error: null }));
    } catch {
      setClassHistory(prev => new Map(prev).set(gymCalendarId, { loading: false, sessions: [], error: true }));
    }
  };

  const initSessionEdit = (session) => {
    setSessionEdits(prev => {
      if (prev.has(session.id)) return prev;
      const next = new Map(prev);
      next.set(session.id, {
        exercises: sessionExToEditFormat(session.session_exercises || []),
        gymSessionId: session.gym_calendar_id || "",
        gymSessions: [],
        gymConflict: null,
        dirty: false,
        newExIds: new Set(),
        saving: false,
        saveError: null,
        analyzing: false,
        analyzeError: null,
      });
      return next;
    });
    fetchGymSessionsByDate(session.session_date)
      .then(gymSessions => setSessionEdits(prev => {
        if (!prev.has(session.id)) return prev;
        const next = new Map(prev);
        next.set(session.id, { ...next.get(session.id), gymSessions });
        return next;
      }))
      .catch(() => {});
    if (libraryCache.current) {
      setLibraryExercises(libraryCache.current);
    } else {
      fetchLibraryExercises()
        .then(data => { libraryCache.current = data; setLibraryExercises(data); })
        .catch(() => {});
    }
  };

  const toggleExpand = (id) => {
    const isOpen = expandedIds.has(id);
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (isOpen) { next.delete(id); setHoveredMuscle(null); }
      else next.add(id);
      return next;
    });
    if (isOpen) {
      setSessionEdits(prev => { const m = new Map(prev); m.delete(id); return m; });
    } else {
      const session = daySessions.find(s => s.id === id);
      if (session) {
        initSessionEdit(session);
        if (session.gym_calendar_id && !classHistory.has(session.gym_calendar_id)) {
          loadClassHistory(session.gym_calendar_id);
        }
      }
    }
  };

  const loadSession = async (dateStr) => {
    setLoadingSession(true);
    setDaySessions([]);
    setExpandedIds(new Set());
    try {
      const results = await fetchSessionsByDate(dateStr);
      results.forEach(s => {
        s.session_exercises = [...(s.session_exercises || [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0)
        );
      });
      results.sort((a, b) => {
        const ta = a.gym_calendar?.start_time ?? a.created_at;
        const tb = b.gym_calendar?.start_time ?? b.created_at;
        return new Date(ta) - new Date(tb);
      });
      setDaySessions(results);
      if (results.length === 1) {
        setExpandedIds(new Set([results[0].id]));
        initSessionEdit(results[0]);
      } else {
        setExpandedIds(new Set());
      }
    } catch (err) {
      logDevError("History/loadSession", err);
    } finally {
      setLoadingSession(false);
    }
  };

  // mount-only: initialDate is a one-time navigation hint from the home screen
  useEffect(() => {
    if (initialDateRef.current) loadSession(initialDateRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: initialDateRef is a ref, loadSession is stable

  const handleSelect = (dateStr) => {
    if (!dateStr || !filteredTrainedSet.has(dateStr)) return;
    setSelectedDate(new Date(dateStr + "T12:00:00"));
    setHoveredMuscle(null);
    loadSession(dateStr);
  };

  const discardEdit = (session) => {
    setSessionEdits(prev => {
      const next = new Map(prev);
      next.set(session.id, {
        ...(next.get(session.id) || {}),
        exercises: sessionExToEditFormat(session.session_exercises || []),
        gymSessionId: session.gym_calendar_id || "",
        gymConflict: null,
        dirty: false,
        newExIds: new Set(),
        saveError: null,
        analyzeError: null,
      });
      return next;
    });
  };

  const saveEdit = async (session) => {
    const edit = sessionEdits.get(session.id);
    if (!edit) return;
    patchSessionEdit(session.id, { saving: true, saveError: null });
    try {
      await updateSession(session.id, edit.exercises, edit.gymSessionId || null, { replace: !!edit.gymConflict });
      setExpandedIds(prev => { const n = new Set(prev); n.delete(session.id); return n; });
      setSessionEdits(prev => { const m = new Map(prev); m.delete(session.id); return m; });
      await loadSession(session.session_date);
    } catch (err) {
      logDevError("History/save", err);
      const msg = err?.message?.includes("unique") || err?.code === "23505"
        ? t("history.duplicateGymSession")
        : t("common.saveFailed");
      patchSessionEdit(session.id, { saving: false, saveError: msg });
    }
  };

  const reanalyze = async (session, file) => {
    if (!file) return;
    patchSessionEdit(session.id, { analyzing: true, analyzeError: null });
    try {
      const { base64: b64, mediaType: mt } = await compressImage(file);
      const res = await callClaude({
        model: CLAUDE_MODEL_VISION,
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mt, data: b64 } },
            { type: "text", text: ANALYZE_PROMPT }
          ]
        }]
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(t("history.reanalyzeServerError", { status: res.status })); }
      if (!res.ok) {
        const detail = data?.detail || data?.error?.message;
        throw new Error(detail
          ? t("history.reanalyzeServerErrorDetail", { status: res.status, detail })
          : t("history.reanalyzeServerErrorCode", { status: res.status }));
      }
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        throw new Error(t("history.reanalyzeInvalidJson"));
      }
      if (!Array.isArray(parsed)) throw new Error(t("history.reanalyzeUnexpectedFormat"));
      patchSessionEdit(session.id, {
        exercises: parsed.map((ex, i) => ({ ...ex, id: Date.now() + i, enabled: true })),
        dirty: true,
        analyzing: false,
      });
    } catch (err) {
      logDevError("History/reanalyse", err);
      patchSessionEdit(session.id, { analyzing: false, analyzeError: err.message || t("history.reanalyzeImageError") });
    }
  };

  const toggleMuscleFilter = (id) => {
    const newFilter = muscleFilter.includes(id)
      ? muscleFilter.filter(x => x !== id)
      : [...muscleFilter, id];
    setMuscleFilter(newFilter);
    if (!selectedDate && newFilter.length > 0) {
      const matching = sessions.filter(s => newFilter.some(mid => (sessionMuscleIdMap.get(s.id) ?? new Set()).has(mid)));
      const todayStr = toIsoDate(today);
      const dates = matching.map(s => s.session_date).sort();
      const target = dates.includes(todayStr) ? todayStr : dates[dates.length - 1];
      if (target) {
        setSelectedDate(new Date(target + "T12:00:00"));
        loadSession(target);
      }
    }
  };

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <SectionLabel>{t("history.sectionLabel")}</SectionLabel>
        <PageHeading style={{ minHeight: 72 }}>
          {muscleFilter.length > 0 && selectedDate ? (() => {
            const selectedDateStr = toIsoDate(selectedDate);
            const count = filteredSessions.filter(s => s.session_date === selectedDateStr).length;
            const total = sessions.filter(s => s.session_date === selectedDateStr).length;
            const dateLabel = new Intl.DateTimeFormat(getIntlLocale(), { day: "numeric", month: "long" }).format(selectedDate);
            const sessionLabel = total === 1 ? t("common.session") : t("common.sessions");
            return <>{t("history.filterWithDate", { count, total, sessionLabel, date: dateLabel })}</>;
          })() : muscleFilter.length > 0 ? (
            <>{t("history.filteredMonth", { count: currentMonthCount, sessionLabel: currentMonthCount === 1 ? t("common.session") : t("common.sessions"), month: new Intl.DateTimeFormat(getIntlLocale(), { month: "long" }).format(new Date(viewYear, viewMonth, 1)) })}</>
          ) : (
            <>{t("history.monthCount", { count: currentMonthCount, sessionLabel: currentMonthCount === 1 ? t("common.session") : t("common.sessions"), month: new Intl.DateTimeFormat(getIntlLocale(), { month: "long" }).format(new Date(viewYear, viewMonth, 1)) })}</>
          )}
        </PageHeading>

        {/* Muscle filter chips */}
        <div style={{ marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-subtle-wl)" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingBottom: 8 }}>
            {MUSCLE_FILTER_ITEMS.map(item => {
              const active = muscleFilter.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleMuscleFilter(item.id)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 13px",
                    borderRadius: "var(--r-pill)",
                    border: "1px solid",
                    borderColor: active ? "var(--accent-active)" : "var(--border-subtle-wl)",
                    background: active ? "var(--accent-active)" : "transparent",
                    color: active ? "#fff" : "var(--text-muted-wl)",
                    fontFamily: "var(--cds-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(`muscles.${item.id}`, { defaultValue: item.label })}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setMuscleFilter([])}
            style={{ background: "none", border: "none", padding: "0 16px", cursor: "pointer", fontSize: 11, color: "var(--accent)", fontFamily: "var(--cds-font-mono)", letterSpacing: "0.06em", opacity: muscleFilter.length > 0 ? 1 : 0, pointerEvents: muscleFilter.length > 0 ? "auto" : "none" }}
          >
            {t("common.resetFilter")}
          </button>
        </div>

        {loading ? (
          <div aria-live="polite" aria-busy="true" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "16px 12px", marginBottom: 24 }}>
            <SkeletonPlaceholder style={{ width: "100%", height: 280 }} />
          </div>
        ) : (
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "12px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Button kind="ghost" size="sm" renderIcon={ChevronLeft} hasIconOnly iconDescription={t("history.prevMonth")} onClick={goPrevMonth} />
              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 12, color: "var(--cds-text-primary)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {new Intl.DateTimeFormat(getIntlLocale(), { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonth, 1)).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <Button kind="ghost" size="sm" renderIcon={ChevronRight} hasIconOnly iconDescription={t("history.nextMonth")} onClick={goNextMonth} disabled={atCurrentMonth} />
            </div>
            <MonthGrid
              year={viewYear}
              month={viewMonth}
              sessionCountMap={sessionCountMap}
              onDayClick={handleSelect}
              selectedDate={selectedDate}
              today={today}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)", letterSpacing: "0.08em" }}>{t("history.volumeLegendMin")}</span>
              {["--heat-1","--heat-2","--heat-3","--heat-4","--heat-5"].map(v => (
                <div key={v} style={{ width: 10, height: 10, background: `var(${v})` }} />
              ))}
              <span style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)", letterSpacing: "0.08em" }}>{t("history.volumeLegendMax")}</span>
            </div>
          </div>
        )}

        {loadingSession && (
          <div aria-live="polite" aria-busy="true" style={{ marginBottom: 24 }}>
            <AccordionSkeleton count={2} />
          </div>
        )}

        {daySessions.length > 0 && (
          <div className="fade-in">
            <p style={{ fontSize: 11, color: "var(--text-muted-wl)", letterSpacing: "2px", marginBottom: 16, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
              {new Intl.DateTimeFormat(getIntlLocale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(daySessions[0].session_date + "T12:00:00"))}
            </p>

            {[...daySessions].sort((a, b) => {
              if (!muscleFilter.length) return 0;
              const aMatch = muscleFilter.some(id => (sessionMuscleIdMap.get(a.id) ?? new Set()).has(id));
              const bMatch = muscleFilter.some(id => (sessionMuscleIdMap.get(b.id) ?? new Set()).has(id));
              return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
            }).map((session) => {
              const isExpanded = expandedIds.has(session.id);
              const edit = sessionEdits.get(session.id) || {};
              const workExercises = edit.exercises;
              const sessionMuscles = workExercises
                ? calcMuscles(workExercises.filter(e => e.enabled && e.name))
                : extractMuscles(session);
              const sessionMuscleMap = workExercises
                ? buildMuscleMapFromExercises(workExercises)
                : buildMuscleMapFromSession(session);
              const exCount = (session.session_exercises || []).filter(e => e.name).length;
              const musIds = sessionMuscleIdMap.get(session.id) ?? new Set();
              const isFilterMatch = muscleFilter.length > 0 && muscleFilter.some(id => musIds.has(id));
              const matchedLabels = isFilterMatch
                ? muscleFilter.filter(id => musIds.has(id)).map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id }))
                : [];
              const topMuscles = extractMuscles(session).primary.slice(0, 2).map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id }));
              const sessionTime = session.gym_calendar?.start_time
                ? new Date(session.gym_calendar.start_time).toLocaleTimeString(getIntlLocale(), { hour: "2-digit", minute: "2-digit" })
                : new Date(session.created_at).toLocaleTimeString(getIntlLocale(), { hour: "2-digit", minute: "2-digit" });
              const sessionTitle = session.gym_calendar
                ? `${sessionTime} – ${session.gym_calendar.name}`
                : `${sessionTime} – ${t("history.ownTraining")}`;

              return (
                <div key={session.id} style={{ marginBottom: 4, opacity: muscleFilter.length > 0 && !isFilterMatch ? 0.45 : 1 }}>
                  <button
                    onClick={() => toggleExpand(session.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`session-content-${session.id}`}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle-wl)",
                      borderInlineStart: isFilterMatch ? "3px solid var(--accent)" : "3px solid var(--border-subtle-wl)",
                      borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle-wl)",
                      padding: "10px 14px", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sessionTitle}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, maxWidth: "55%", overflow: "hidden" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {t("history.exerciseCount", { count: exCount })}
                      </span>
                      {isFilterMatch ? (() => {
                        const visible = matchedLabels.slice(0, 2);
                        const extra = matchedLabels.length - 2;
                        return <>
                          {visible.map(label => <Tag key={label} type="cyan" size="sm">{label}</Tag>)}
                          {extra > 0 && <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", whiteSpace: "nowrap", flexShrink: 0 }}>+{extra}</span>}
                        </>;
                      })() : topMuscles.map(label => <Tag key={label} type="green" size="sm">{label}</Tag>)}
                      <ChevronDown size={16} style={{ color: "var(--text-muted-wl)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                    </div>
                  </button>

                  {isExpanded && (
                    <SessionEditPanel
                      session={session}
                      edit={edit}
                      isFilterMatch={isFilterMatch}
                      sessionMuscles={sessionMuscles}
                      sessionMuscleMap={sessionMuscleMap}
                      hoveredMuscle={hoveredMuscle}
                      onHoverMuscle={setHoveredMuscle}
                      libraryExercises={libraryExercises}
                      classHistory={classHistory}
                      fileRef={fileRef}
                      uploadingForSessionRef={uploadingForSessionRef}
                      onPatch={(patch) => patchSessionEdit(session.id, patch)}
                      onDiscard={() => discardEdit(session)}
                      onSave={() => saveEdit(session)}
                      onReanalyze={(file) => reanalyze(session, file)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
            {t("history.noSessions")}
          </p>
        )}

      </div>
    </PageShell>
  );
}

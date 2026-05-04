import { useState, useEffect, useRef, useMemo } from "react";
import { nb } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import { fetchSessions, fetchSessionsByDate, fetchGymSessionsByDate, updateSession, checkGymCalendarConflict, fetchLibraryExercises } from "../lib/db";
import { MUSCLES, PRIMARY_FILL, SEC_FILL, calcMuscles } from "../lib/bodymap.jsx";
import { toBase64, detectMediaType, buildMuscleMapFromSession, buildMuscleMapFromExercises, isInvalidNum, callClaude, extractMuscles, logDevError } from "../lib/utils";
import { CLAUDE_MODEL_VISION, ANALYZE_PROMPT } from "../lib/prompts";
import {
  Button, Tag, InlineNotification, DefinitionTooltip,
  Select, SelectItem, AccordionSkeleton, SkeletonPlaceholder,
} from "@carbon/react";
import { Camera, Add, Edit as EditIcon, Renew, ChevronDown, ChevronLeft, ChevronRight } from "@carbon/icons-react";
import ExerciseRowWithAutocomplete from "./ExerciseRowWithAutocomplete";
import BodyPanel from "./BodyPanel";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";

const MUSCLE_FILTER_ITEMS = Object.entries(MUSCLES).map(([id, { label }]) => ({ id, label }));

const DAY_HEADERS = ["ma", "ti", "on", "to", "fr", "lø", "sø"];

function calHeatColor(count) {
  if (!count) return "var(--surface-card)";
  if (count <= 1) return "var(--heat-1)";
  if (count <= 3) return "var(--heat-2)";
  if (count <= 5) return "var(--heat-3)";
  if (count <= 7) return "var(--heat-4)";
  return "var(--heat-5)";
}

function MonthGrid({ year, month, sessionCountMap, onDayClick, selectedDate, today }) {
  const todayStr = format(today, "yyyy-MM-dd");
  const selectedStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDOW; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{ textAlign: "center", fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 0" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`pad-${i}`} style={{ height: 40, background: "var(--surface-card)", borderRadius: 0 }} />;
          const count = sessionCountMap[dateStr] || 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedStr;
          const isFuture = dateStr > todayStr;
          const isInteractive = !isFuture && count > 0;
          const day = parseInt(dateStr.split("-")[2], 10);
          const cellStyle = {
            height: 40,
            borderRadius: 0,
            background: calHeatColor(count),
            border: "1px solid var(--border-subtle-wl)",
            outline: isSelected ? "3px solid #ffffff" : isToday ? "1px dashed var(--cds-text-secondary)" : undefined,
            outlineOffset: isSelected ? "-3px" : "-2px",
            display: "flex", alignItems: "center", justifyContent: "center",
          };
          const daySpan = (
            <span style={{
              fontSize: 10, fontFamily: "var(--cds-font-mono)", letterSpacing: "0.06em",
              color: count > 0 ? "rgba(255,255,255,0.9)" : isFuture ? "var(--cds-text-disabled)" : "var(--cds-text-secondary)",
            }}>
              {day}
            </span>
          );
          if (isInteractive) {
            return (
              <button
                key={dateStr}
                aria-label={`${dateStr}: ${count} ${count === 1 ? "økt" : "økter"}`}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => onDayClick(dateStr)}
                style={{ ...cellStyle, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
              >
                {daySpan}
              </button>
            );
          }
          return (
            <div
              key={dateStr}
              aria-current={isToday ? "date" : undefined}
              style={{ ...cellStyle, cursor: "default" }}
            >
              {daySpan}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sessionExToEditFormat(exercises) {
  return exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    standardName: ex.standard_name || "",
    sets: ex.sets != null ? String(ex.sets) : null,
    reps: ex.reps != null ? String(ex.reps) : null,
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

function heroMotivation(count) {
  if (count < 1) return null;
  if (count < 2) return "god start!";
  if (count < 5) return "fortsett sånn!";
  if (count < 10) return "bra jobba!";
  return "Rock on!";
}


export default function History({ initialDate }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    initialDate ? parseISO(initialDate + "T12:00:00") : undefined
  );
  const [daySessions, setDaySessions] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedSession, setSelectedSession] = useState(null);
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

  const [editMode, setEditMode] = useState(false);
  const [editExercises, setEditExercises] = useState([]);
  const [editingExId, setEditingExId] = useState(null);
  const [editGymSessionId, setEditGymSessionId] = useState("");
  const [editGymSessions, setEditGymSessions] = useState([]);
  const [editGymCalendarConflict, setEditGymCalendarConflict] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [libraryExercises, setLibraryExercises] = useState([]);
  const [newExerciseIds, setNewExerciseIds] = useState(new Set());
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(e => logDevError("History/fetchSessions", e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialDate) loadSession(initialDate);
  }, []);

  const filteredSessions = muscleFilter.length === 0 ? sessions
    : sessions.filter(s => muscleFilter.some(id => sessionMuscleIds(s).has(id)));
  const filteredTrainedSet = new Set(filteredSessions.map(s => s.session_date));

  const sessionCountMap = useMemo(() => {
    const map = {};
    filteredSessions.forEach(s => {
      const count = (s.session_exercises || []).length;
      map[s.session_date] = (map[s.session_date] || 0) + count;
    });
    return map;
  }, [filteredSessions]);

  const currentMonthCount = useMemo(() => filteredSessions.filter(s => {
    const d = new Date(s.session_date + "T12:00:00");
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length, [filteredSessions, viewYear, viewMonth]);

  useEffect(() => {
    if (daySessions.length === 1) {
      setExpandedIds(new Set([daySessions[0].id]));
    } else {
      setExpandedIds(new Set());
    }
  }, [daySessions]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setHoveredMuscle(null); }
      else next.add(id);
      return next;
    });
  };

  const loadSession = async (dateStr) => {
    setLoadingSession(true);
    setDaySessions([]);
    setSelectedSession(null);
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
    } catch (err) {
      logDevError("History/loadSession", err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSelect = (dateStr) => {
    if (!dateStr || !filteredTrainedSet.has(dateStr)) return;
    setSelectedDate(new Date(dateStr + "T12:00:00"));
    setEditMode(false);
    setSelectedSession(null);
    setHoveredMuscle(null);
    loadSession(dateStr);
  };

  const enterEditMode = (session) => {
    setExpandedIds(prev => { const next = new Set(prev); next.add(session.id); return next; });
    setSelectedSession(session);
    const exs = sessionExToEditFormat(session.session_exercises || []);
    setEditExercises(exs);
    setEditGymSessionId(session.gym_calendar_id || "");
    setEditGymSessions([]);
    setEditError(null);
    setAnalyzeError(null);
    setNewExerciseIds(new Set());
    setEditMode(true);
    fetchGymSessionsByDate(session.session_date)
      .then(setEditGymSessions)
      .catch(() => setEditGymSessions([]));
    fetchLibraryExercises()
      .then(setLibraryExercises)
      .catch(() => {});
  };

  const cancelEdit = () => {
    setEditMode(false);
    setSelectedSession(null);
    setEditingExId(null);
    setEditError(null);
    setAnalyzeError(null);
    setEditGymCalendarConflict(null);
    setNewExerciseIds(new Set());
  };

  useEffect(() => {
    if (!editMode || !editGymSessionId || editGymSessionId === (selectedSession?.gym_calendar_id || "")) {
      setEditGymCalendarConflict(null);
      return;
    }
    checkGymCalendarConflict(editGymSessionId, selectedSession?.id)
      .then(setEditGymCalendarConflict)
      .catch(() => setEditGymCalendarConflict(null));
  }, [editGymSessionId, editMode, selectedSession]);

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      const date = selectedSession.session_date;
      await updateSession(selectedSession.id, editExercises, editGymSessionId || null, { replace: !!editGymCalendarConflict });
      setEditMode(false);
      setSelectedSession(null);
      await loadSession(date);
    } catch (err) {
      logDevError("History/save", err);
      const msg = err?.message?.includes("unique") || err?.code === "23505"
        ? "Denne gymtimen har allerede en økt lagret."
        : "Lagring feilet. Prøv igjen.";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const reanalyze = async (file) => {
    if (!file) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const mt = await detectMediaType(file);
      const b64 = await toBase64(file);
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
      try { data = await res.json(); } catch { throw new Error(`Serverfeil (${res.status}): Ugyldig svar fra server`); }
      if (!res.ok) {
        const detail = data?.error?.message;
        throw new Error(detail ? `Serverfeil (${res.status}): ${detail}` : `Serverfeil (${res.status})`);
      }
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        throw new Error("Svaret fra Claude var ikke gyldig JSON. Prøv igjen.");
      }
      if (!Array.isArray(parsed)) throw new Error("Uventet svarformat fra Claude.");
      setEditExercises(parsed.map((ex, i) => ({ ...ex, id: Date.now() + i, enabled: true, sets: ex.sets ?? "1" })));
    } catch (err) {
      logDevError("History/reanalyse", err);
      setAnalyzeError(err.message || "Kunne ikke tolke bildet. Prøv igjen med et tydeligere bilde.");
    } finally {
      setAnalyzing(false);
    }
  };

  const editMuscles = useMemo(
    () => editMode ? calcMuscles(editExercises.filter(e => e.enabled && e.name)) : null,
    [editMode, editExercises]
  );

  const hasEditErrors = editMode && (
    editExercises.some(e => e.enabled && !e.name?.trim()) ||
    editExercises.some(e => isInvalidNum(e.sets) || isInvalidNum(e.reps))
  );

  const toggleMuscleFilter = (id) => {
    const newFilter = muscleFilter.includes(id)
      ? muscleFilter.filter(x => x !== id)
      : [...muscleFilter, id];
    setMuscleFilter(newFilter);
    if (!selectedDate && newFilter.length > 0) {
      const matching = sessions.filter(s => newFilter.some(mid => sessionMuscleIds(s).has(mid)));
      const todayStr = format(today, "yyyy-MM-dd");
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
        <SectionLabel>HISTORIKK</SectionLabel>
        <PageHeading>
          {currentMonthCount} {currentMonthCount === 1 ? "økt" : "økter"} i {format(new Date(viewYear, viewMonth, 1), "MMMM", { locale: nb })}.
          {heroMotivation(currentMonthCount) && (
            <> <span style={{ color: "var(--accent)" }}>{heroMotivation(currentMonthCount)}</span></>
          )}
        </PageHeading>

        {/* Muscle filter — horizontal pill scroll */}
        <div style={{ marginBottom: 16 }}>
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
                    borderColor: active ? "var(--accent)" : "var(--border-subtle-wl)",
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#fff" : "var(--text-muted-wl)",
                    fontFamily: "var(--cds-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setMuscleFilter([])}
            style={{ background: "none", border: "none", padding: "0 16px", cursor: "pointer", fontSize: 11, color: "var(--accent)", fontFamily: "var(--cds-font-mono)", letterSpacing: "0.06em", opacity: muscleFilter.length > 0 ? 1 : 0, pointerEvents: muscleFilter.length > 0 ? "auto" : "none" }}
          >
            Nullstill filter
          </button>
        </div>

        {loading ? (
          <div aria-live="polite" aria-busy="true" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "16px 12px", marginBottom: 24 }}>
            <SkeletonPlaceholder style={{ width: "100%", height: 280 }} />
          </div>
        ) : (
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", padding: "12px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Button kind="ghost" size="sm" renderIcon={ChevronLeft} hasIconOnly iconDescription="Forrige måned" onClick={goPrevMonth} />
              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 12, color: "var(--cds-text-primary)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {format(new Date(viewYear, viewMonth, 1), "MMMM yyyy", { locale: nb }).replace(/^\w/, c => c.toUpperCase())}
              </span>
              <Button kind="ghost" size="sm" renderIcon={ChevronRight} hasIconOnly iconDescription="Neste måned" onClick={goNextMonth} disabled={atCurrentMonth} />
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
              <span style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)", letterSpacing: "0.08em" }}>VOLUM 1</span>
              {["--heat-1","--heat-2","--heat-3","--heat-4","--heat-5"].map(v => (
                <div key={v} style={{ width: 10, height: 10, background: `var(${v})` }} />
              ))}
              <span style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)", letterSpacing: "0.08em" }}>5+</span>
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
              {format(new Date(daySessions[0].session_date + "T12:00:00"), "EEEE d. MMMM yyyy", { locale: nb })}
            </p>

            {[...daySessions].sort((a, b) => {
              if (!muscleFilter.length) return 0;
              const aMatch = muscleFilter.some(id => sessionMuscleIds(a).has(id));
              const bMatch = muscleFilter.some(id => sessionMuscleIds(b).has(id));
              return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
            }).map((session) => {
              const isEditing = editMode && selectedSession?.id === session.id;
              const isExpanded = expandedIds.has(session.id);
              const sessionMuscles = isEditing ? editMuscles : extractMuscles(session);
              const sessionMuscleMap = isEditing ? buildMuscleMapFromExercises(editExercises) : buildMuscleMapFromSession(session);
              const exCount = (session.session_exercises || []).filter(e => e.name).length;
              const musIds = sessionMuscleIds(session);
              const isFilterMatch = muscleFilter.length > 0 && muscleFilter.some(id => musIds.has(id));
              const matchedLabels = isFilterMatch
                ? muscleFilter.filter(id => musIds.has(id)).map(id => MUSCLES[id]?.label || id)
                : [];
              const topMuscles = extractMuscles(session).primary.slice(0, 2).map(id => MUSCLES[id]?.label || id);
              const sessionTime = session.gym_calendar?.start_time
                ? new Date(session.gym_calendar.start_time).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })
                : new Date(session.created_at).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
              const sessionTitle = session.gym_calendar
                ? `${sessionTime} – ${session.gym_calendar.name}`
                : `${sessionTime} – Egentrening`;

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
                      borderLeft: isFilterMatch ? "3px solid var(--accent)" : "3px solid var(--border-subtle-wl)",
                      borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle-wl)",
                      padding: "10px 14px", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sessionTitle}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", whiteSpace: "nowrap" }}>
                        {exCount} øvelser
                      </span>
                      {isFilterMatch
                        ? matchedLabels.map(label => <Tag key={label} type="cyan" size="sm">{label}</Tag>)
                        : topMuscles.map(label => <Tag key={label} type="green" size="sm">{label}</Tag>)
                      }
                      <ChevronDown size={16} style={{ color: "var(--text-muted-wl)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div id={`session-content-${session.id}`} aria-live="polite" style={{ border: "1px solid var(--border-subtle-wl)", borderTop: "none", borderLeft: isFilterMatch ? "3px solid var(--accent)" : "3px solid var(--border-subtle-wl)", padding: "16px 14px", marginBottom: 0 }}>

                      {/* Gym class tag (read) or selector (edit) */}
                      {isEditing ? (
                        editGymSessions.length > 0 && (
                          <>
                            <Select
                              id="edit-gym-session"
                              labelText="Gymtime"
                              value={editGymSessionId}
                              onChange={(e) => setEditGymSessionId(e.target.value)}
                              style={{ marginBottom: editGymCalendarConflict ? 8 : 16 }}
                            >
                              <SelectItem value="" text="Ingen time valgt" />
                              {editGymSessions.map(s => {
                                const time = new Date(s.start_time).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
                                const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
                                return <SelectItem key={s.id} value={s.id} text={label} />;
                              })}
                            </Select>
                            {editGymCalendarConflict && (
                              <InlineNotification
                                kind="warning"
                                title="Eksisterende økt:"
                                subtitle={`Denne gymtimen har allerede en lagret økt (${editGymCalendarConflict.session_date}). Lagring erstatter den.`}
                                hideCloseButton
                                style={{ marginBottom: 16 }}
                              />
                            )}
                          </>
                        )
                      ) : (
                        session.gym_calendar && (
                          <div style={{ marginBottom: 12 }}>
                            <Tag type="outline" size="sm">{session.gym_calendar.name}</Tag>
                          </div>
                        )
                      )}

                      {/* Body map */}
                      <BodyPanel
                        primary={sessionMuscles.primary}
                        secondary={sessionMuscles.secondary}
                        muscleMap={sessionMuscleMap}
                        onHover={setHoveredMuscle}
                        hovered={hoveredMuscle}
                        marginBottom={0}
                      />

                      <div style={{ height: 68, marginBottom: 16, overflow: "hidden" }}>
                        {hoveredMuscle ? (
                          <div style={{ borderLeft: "3px solid var(--accent)", background: "var(--surface-card)", padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                              {MUSCLES[hoveredMuscle]?.label}
                            </div>
                            <div style={{ display: "flex", gap: 24, alignItems: "baseline", overflow: "hidden" }}>
                              <div style={{ flexShrink: 0 }}>
                                <span style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--cds-font-sans)", color: "var(--cds-text-primary)" }}>
                                  {(sessionMuscleMap[hoveredMuscle] || []).length}
                                </span>
                                <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", marginLeft: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                  {(sessionMuscleMap[hoveredMuscle] || []).length === 1 ? "ØVELSE" : "ØVELSER"}
                                </span>
                              </div>
                              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.08em", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>
                                {(sessionMuscleMap[hoveredMuscle] || []).join(" · ")}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", padding: "10px 0", letterSpacing: "0.08em" }}>
                            Hold musepeker over kroppen for detaljer
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        <Tag type="green" size="sm">Primær ({sessionMuscles.primary.length})</Tag>
                        <Tag type="blue" size="sm">Sekundær ({sessionMuscles.secondary.length})</Tag>
                      </div>

                      {/* Exercise list */}
                      <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--border-subtle-wl)", padding: 14, marginBottom: 12 }}>
                        <p style={{ fontSize: 11, color: "var(--text-muted-wl)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                          Øvelser
                        </p>

                        {isEditing ? (
                          <>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                              {editExercises.map((ex) => (
                                <ExerciseRowWithAutocomplete
                                  key={ex.id}
                                  exercise={ex}
                                  autoFocusName={ex.id === editingExId}
                                  onChange={(updates) => setEditExercises(p => p.map(e => e.id === ex.id ? { ...e, ...updates } : e))}
                                  onDelete={() => setEditExercises(p => p.filter(e => e.id !== ex.id))}
                                  layer="layer-02"
                                  validateNumbers
                                  libraryExercises={libraryExercises}
                                  isNew={newExerciseIds.has(ex.id)}
                                />
                              ))}
                            </div>
                            <Button
                              kind="ghost"
                              renderIcon={Add}
                              size="sm"
                              onClick={() => {
                                const id = Date.now();
                                setEditExercises(p => [...p, { id, name: "", standardName: "", sets: null, reps: null, primary: [], secondary: [], enabled: true }]);
                                setEditingExId(id);
                                setNewExerciseIds(prev => new Set([...prev, id]));
                              }}
                              style={{ width: "100%" }}
                            >
                              Legg til øvelse manuelt
                            </Button>
                          </>
                        ) : (
                          (session.session_exercises || []).map(ex => {
                            const muscleLabels = (ex.muscle_activations || []).map(ma => MUSCLES[ma.muscle_id]?.label || ma.muscle_id).join(", ");
                            return (
                              <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--border-subtle-wl)", color: "var(--cds-text-primary)" }}>
                                <span>
                                  {muscleLabels ? (
                                    <DefinitionTooltip definition={muscleLabels} openOnHover align="bottom">{ex.name}</DefinitionTooltip>
                                  ) : ex.name}
                                </span>
                                {(ex.sets || ex.reps) && (
                                  <span style={{ color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", fontSize: 12 }}>
                                    {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Muscle groups (read mode only) */}
                      {!isEditing && (
                        <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--border-subtle-wl)", padding: 14, marginBottom: 12 }}>
                          <p style={{ fontSize: 11, color: "var(--text-muted-wl)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                            Muskelgrupper
                          </p>
                          {sessionMuscles.primary.map(id => {
                            const exNames = (sessionMuscleMap[id] || []).join(", ");
                            return (
                              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border-subtle-wl)" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIMARY_FILL, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-primary)" }}>
                                  {exNames ? (
                                    <DefinitionTooltip definition={exNames} openOnHover align="bottom">{MUSCLES[id]?.label || id}</DefinitionTooltip>
                                  ) : MUSCLES[id]?.label || id}
                                </span>
                                <Tag type="green" size="sm">Primær</Tag>
                              </div>
                            );
                          })}
                          {sessionMuscles.secondary.map(id => {
                            const exNames = (sessionMuscleMap[id] || []).join(", ");
                            return (
                              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border-subtle-wl)" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEC_FILL, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-secondary)" }}>
                                  {exNames ? (
                                    <DefinitionTooltip definition={exNames} openOnHover align="bottom">{MUSCLES[id]?.label || id}</DefinitionTooltip>
                                  ) : MUSCLES[id]?.label || id}
                                </span>
                                <Tag type="blue" size="sm">Sekundær</Tag>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Edit mode actions */}
                      {isEditing && (
                        <>
                          {analyzeError && (
                            <InlineNotification kind="error" title="Feil:" subtitle={analyzeError} hideCloseButton style={{ marginBottom: 8 }} />
                          )}
                          {editError && (
                            <InlineNotification kind="error" title="Feil:" subtitle={editError} hideCloseButton style={{ marginBottom: 8 }} />
                          )}
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                            onChange={(e) => { if (e.target.files[0]) reanalyze(e.target.files[0]); e.target.value = ""; }} />
                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <Button kind="secondary" renderIcon={analyzing ? Renew : Camera} disabled={analyzing} onClick={() => fileRef.current?.click()}>
                              {analyzing ? "Analyserer…" : "Re-analyser"}
                            </Button>
                            <Button kind="ghost" onClick={cancelEdit}>Avbryt</Button>
                            <Button
                              kind="primary"
                              disabled={editSaving || hasEditErrors}
                              onClick={saveEdit}
                              style={{ marginLeft: "auto" }}
                            >
                              {editSaving ? "Lagrer…" : "Lagre"}
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Read mode: edit button (hidden when any session is in edit mode) */}
                      {!editMode && (
                        <Button kind="ghost" renderIcon={EditIcon} onClick={() => enterEditMode(session)}>
                          Rediger økt
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
            Ingen økter lagret ennå.
          </p>
        )}

      </div>
    </PageShell>
  );
}

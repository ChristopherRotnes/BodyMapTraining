import React, { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import { nb } from "date-fns/locale";
import { format, subMonths } from "date-fns";
import "react-day-picker/style.css";
import { fetchSessions, fetchSessionsByDate, fetchGymSessionsByDate, updateSession } from "../lib/db";
import { BodySVG, MUSCLES, PRIMARY_FILL, SEC_FILL, calcMuscles, useIsMobile } from "../lib/bodymap.jsx";
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent,
  Button, Tag, InlineLoading, InlineNotification, DefinitionTooltip,
  Checkbox, Select, SelectItem,
} from "@carbon/react";
import { Camera, Asleep, Light, Analytics, Add, TrashCan, Edit as EditIcon, Renew } from "@carbon/icons-react";
import { useTheme } from "../theme";

const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

const getMediaType = (file) => {
  const t = { "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp" };
  return t[file.type] || "image/jpeg";
};

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

function extractMuscles(session) {
  const primary = new Set();
  const secondary = new Set();
  (session.session_exercises || []).forEach(ex => {
    (ex.muscle_activations || []).forEach(ma => {
      if (ma.activation_type === "primary") primary.add(ma.muscle_id);
      else secondary.add(ma.muscle_id);
    });
  });
  primary.forEach(m => secondary.delete(m));
  return { primary: [...primary], secondary: [...secondary] };
}

function buildMuscleMap(session) {
  const map = {};
  (session.session_exercises || []).forEach(ex => {
    (ex.muscle_activations || []).forEach(ma => {
      if (!map[ma.muscle_id]) map[ma.muscle_id] = [];
      if (!map[ma.muscle_id].includes(ex.name)) map[ma.muscle_id].push(ex.name);
    });
  });
  return map;
}

export default function History({ onNewSession, onShowReport }) {
  const { theme, setTheme } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [mobileView, setMobileView] = useState("front");
  const isMobile = useIsMobile();

  const [editMode, setEditMode] = useState(false);
  const [editExercises, setEditExercises] = useState([]);
  const [editingExId, setEditingExId] = useState(null);
  const [editGymSessionId, setEditGymSessionId] = useState("");
  const [editGymSessions, setEditGymSessions] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const trainedSet = new Set(sessions.map(s => s.session_date));
  const trainedDates = sessions.map(s => new Date(s.session_date + "T12:00:00"));

  const loadSession = async (dateStr) => {
    setLoadingSession(true);
    setSelectedSession(null);
    try {
      const results = await fetchSessionsByDate(dateStr);
      if (results.length > 0) {
        const s = results[0];
        s.session_exercises = [...(s.session_exercises || [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0)
        );
        setSelectedSession(s);
      }
    } catch (err) {
      console.error("Kunne ikke laste økt:", err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSelect = (date) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (!trainedSet.has(dateStr)) return;
    setSelectedDate(date);
    setEditMode(false);
    loadSession(dateStr);
  };

  const enterEditMode = () => {
    const exs = sessionExToEditFormat(selectedSession.session_exercises || []);
    setEditExercises(exs);
    setEditGymSessionId(selectedSession.gym_calendar_id || "");
    setEditGymSessions([]);
    setEditError(null);
    setAnalyzeError(null);
    setEditMode(true);
    fetchGymSessionsByDate(selectedSession.session_date)
      .then(setEditGymSessions)
      .catch(() => setEditGymSessions([]));
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditingExId(null);
    setEditError(null);
    setAnalyzeError(null);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      await updateSession(selectedSession.id, editExercises, editGymSessionId || null);
      setEditMode(false);
      await loadSession(selectedSession.session_date);
    } catch (err) {
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
      const mt = getMediaType(file);
      const b64 = await toBase64(file);
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mt, data: b64 } },
              { type: "text", text: `Du ser ett eller flere bilder av treningsprogrammer fra norske treningsstudio-tavler (gjerne håndskrevet).
Identifiser ALLE treningsøvelser fra alle bildene. Ikke dupliser øvelser som finnes i flere bilder.
For hver øvelse, angi hvilke muskler som er primære og sekundære.
Bruk KUN disse muscle-ID-ene: chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves, traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Nøyaktig navn fra tavlen","standardName":"Standard norsk/engelsk navn","sets":"3","reps":"10","primary":["chest"],"secondary":["shoulders_front","triceps"]}]
"sets" og "reps" er null om ikke skrevet. Finn du ingen øvelser, returner: []` }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error();
      setEditExercises(parsed.map((ex, i) => ({ ...ex, id: Date.now() + i, enabled: true, sets: ex.sets ?? "1" })));
    } catch {
      setAnalyzeError("Kunne ikke tolke bildet. Prøv igjen med et tydeligere bilde.");
    } finally {
      setAnalyzing(false);
    }
  };

  const muscles = selectedSession ? extractMuscles(selectedSession) : null;
  const muscleMap = selectedSession ? buildMuscleMap(selectedSession) : {};
  const editMuscles = editMode ? calcMuscles(editExercises.filter(e => e.enabled && e.name)) : null;
  const editMuscleMap = editMode ? (() => {
    const map = {};
    editExercises.filter(e => e.enabled && e.name).forEach(ex => {
      [...(ex.primary || []), ...(ex.secondary || [])].forEach(id => {
        if (!map[id]) map[id] = [];
        if (!map[id].includes(ex.name)) map[id].push(ex.name);
      });
    });
    return map;
  })() : {};

  return (
    <>
      <Header aria-label="Workout Lens">
        <SkipToContent />
        <HeaderName href="#" prefix="">Workout Lens</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Logg ny økt" onClick={onNewSession}>
            <Camera size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Perioderapport" onClick={onShowReport}>
            <Analytics size={20} />
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

          <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 20, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
            Treningshistorikk
          </p>

          {loading ? (
            <InlineLoading description="Laster historikk…" status="active" />
          ) : (
            <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "16px 12px", marginBottom: 24, overflowX: "auto" }}>
              <DayPicker
                numberOfMonths={2}
                defaultMonth={subMonths(new Date(), 1)}
                locale={nb}
                mode="single"
                required
                selected={selectedDate}
                onSelect={handleSelect}
                modifiers={{ trained: trainedDates }}
                modifiersClassNames={{ trained: "rdp-day-trained" }}
                disabled={{ after: new Date() }}
              />
            </div>
          )}

          {loadingSession && (
            <InlineLoading description="Laster økt…" status="active" style={{ marginBottom: 16 }} />
          )}

          {selectedSession && muscles && (
            <div className="fade-in">
              <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 8, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                {format(new Date(selectedSession.session_date + "T12:00:00"), "EEEE d. MMMM yyyy", { locale: nb })}
              </p>

              {/* Gym class tag (read mode) or selector (edit mode) */}
              {editMode ? (
                editGymSessions.length > 0 && (
                  <Select
                    id="edit-gym-session"
                    labelText="Gymtime"
                    value={editGymSessionId}
                    onChange={(e) => setEditGymSessionId(e.target.value)}
                    style={{ marginBottom: 16 }}
                  >
                    <SelectItem value="" text="Ingen time valgt" />
                    {editGymSessions.map(s => {
                      const time = new Date(s.start_time).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
                      const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
                      return <SelectItem key={s.id} value={s.id} text={label} />;
                    })}
                  </Select>
                )
              ) : (
                selectedSession.gym_calendar && (
                  <div style={{ marginBottom: 16 }}>
                    <Tag type="outline" size="sm">{selectedSession.gym_calendar.name}</Tag>
                  </div>
                )
              )}

              {/* Body map */}
              {isMobile ? (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {["front", "back"].map(v => (
                      <Button key={v} kind={mobileView === v ? "primary" : "ghost"} size="sm"
                        onClick={() => setMobileView(v)}>
                        {v === "front" ? "Front" : "Bak"}
                      </Button>
                    ))}
                  </div>
                  <div style={{ maxWidth: 240, margin: "0 auto 16px", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <BodySVG
                      view={mobileView}
                      primary={editMode ? editMuscles.primary : muscles.primary}
                      secondary={editMode ? editMuscles.secondary : muscles.secondary}
                      muscleMap={editMode ? editMuscleMap : muscleMap}
                    />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  {["front", "back"].map(view => (
                    <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                      <BodySVG
                        view={view}
                        primary={editMode ? editMuscles.primary : muscles.primary}
                        secondary={editMode ? editMuscles.secondary : muscles.secondary}
                        muscleMap={editMode ? editMuscleMap : muscleMap}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <Tag type="green" size="sm">Primær ({editMode ? editMuscles.primary.length : muscles.primary.length})</Tag>
                <Tag type="blue" size="sm">Sekundær ({editMode ? editMuscles.secondary.length : muscles.secondary.length})</Tag>
              </div>

              {/* Exercise list */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Øvelser
                </p>

                {editMode ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                      {editExercises.map((ex) => (
                        <div
                          key={ex.id}
                          onClick={() => setEditExercises(p => p.map(e => e.id === ex.id ? { ...e, enabled: !e.enabled } : e))}
                          style={{
                            background: ex.enabled ? "var(--cds-layer-02)" : "transparent",
                            border: "1px solid var(--cds-border-subtle-01)",
                            padding: "6px 8px 6px 12px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            opacity: ex.enabled ? 1 : 0.4,
                            transition: "opacity 0.15s",
                            cursor: "pointer",
                          }}
                        >
                          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                            <Checkbox
                              id={`edit-ex-${ex.id}`}
                              labelText=""
                              hideLabel
                              checked={ex.enabled}
                              onChange={() => setEditExercises(p => p.map(e => e.id === ex.id ? { ...e, enabled: !e.enabled } : e))}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                            {editingExId === ex.id ? (
                              <input
                                autoFocus
                                value={ex.name}
                                onChange={(e) => setEditExercises(p => p.map(x => x.id === ex.id ? { ...x, name: e.target.value, standardName: e.target.value } : x))}
                                onBlur={() => setEditingExId(null)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingExId(null)}
                                style={{
                                  width: "100%",
                                  background: "transparent",
                                  border: "none",
                                  borderBottom: "2px solid var(--cds-interactive)",
                                  color: "var(--cds-text-primary)",
                                  fontFamily: "var(--cds-font-sans)",
                                  fontSize: 14,
                                  padding: "2px 0",
                                  outline: "none",
                                }}
                              />
                            ) : (
                              <div
                                onClick={() => setEditingExId(ex.id)}
                                style={{ fontSize: 14, fontWeight: 500, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--cds-text-primary)" }}
                              >
                                {ex.name || <span style={{ color: "var(--cds-text-secondary)" }}>Klikk for å skrive øvelse…</span>}
                              </div>
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            {["sets", "reps"].map(field => (
                              <div key={field} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="–"
                                  value={ex[field] || ""}
                                  onChange={e => setEditExercises(p => p.map(x => x.id === ex.id ? { ...x, [field]: e.target.value } : x))}
                                  style={{
                                    width: 40,
                                    height: 28,
                                    padding: "0 4px",
                                    background: "var(--cds-field-01)",
                                    border: "1px solid var(--cds-border-strong-01)",
                                    color: "var(--cds-text-primary)",
                                    fontFamily: "var(--cds-font-sans)",
                                    fontSize: 12,
                                    outline: "none",
                                    textAlign: "center",
                                  }}
                                />
                                <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                                  {field === "sets" ? "sett" : "reps"}
                                </span>
                              </div>
                            ))}
                          </div>
                          <Button
                            kind="ghost"
                            hasIconOnly
                            renderIcon={TrashCan}
                            iconDescription="Slett øvelse"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setEditExercises(p => p.filter(e => e.id !== ex.id)); }}
                          />
                        </div>
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
                      }}
                      style={{ width: "100%" }}
                    >
                      Legg til øvelse manuelt
                    </Button>
                  </>
                ) : (
                  (selectedSession.session_exercises || []).map(ex => {
                    const muscleLabels = (ex.muscle_activations || []).map(ma => MUSCLES[ma.muscle_id]?.label || ma.muscle_id).join(", ");
                    return (
                      <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--cds-border-subtle-01)", color: "var(--cds-text-primary)" }}>
                        <span>
                          {muscleLabels ? (
                            <DefinitionTooltip definition={muscleLabels} openOnHover align="bottom">{ex.name}</DefinitionTooltip>
                          ) : ex.name}
                        </span>
                        {(ex.sets || ex.reps) && (
                          <span style={{ color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", fontSize: 12 }}>
                            {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Muscle groups (read mode only) */}
              {!editMode && (
                <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                    Muskelgrupper
                  </p>
                  {muscles.primary.map(id => {
                    const exNames = (muscleMap[id] || []).join(", ");
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
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
                  {muscles.secondary.map(id => {
                    const exNames = (muscleMap[id] || []).join(", ");
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
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
              {editMode && (
                <>
                  {analyzeError && (
                    <InlineNotification kind="error" title="Feil:" subtitle={analyzeError} hideCloseButton lowContrast style={{ marginBottom: 8 }} />
                  )}
                  {editError && (
                    <InlineNotification kind="error" title="Feil:" subtitle={editError} hideCloseButton lowContrast style={{ marginBottom: 8 }} />
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files[0]) reanalyze(e.target.files[0]); e.target.value = ""; }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <Button
                      kind="secondary"
                      renderIcon={analyzing ? Renew : Camera}
                      disabled={analyzing}
                      onClick={() => fileRef.current?.click()}
                    >
                      {analyzing ? "Analyserer…" : "Re-analyser"}
                    </Button>
                    <Button kind="ghost" onClick={cancelEdit}>Avbryt</Button>
                    <Button
                      kind="primary"
                      disabled={editSaving || !editExercises.some(e => e.enabled && e.name)}
                      onClick={saveEdit}
                      style={{ marginLeft: "auto" }}
                    >
                      {editSaving ? "Lagrer…" : "Lagre"}
                    </Button>
                  </div>
                </>
              )}

              {/* Read mode: edit button */}
              {!editMode && (
                <Button kind="ghost" renderIcon={EditIcon} onClick={enterEditMode}>
                  Rediger økt
                </Button>
              )}
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
              Ingen økter lagret ennå.
            </p>
          )}

        </div>
      </main>
    </>
  );
}

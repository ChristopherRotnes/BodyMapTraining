import { useReducer, useRef, useCallback, useEffect, useMemo, useState } from "react";
import { saveSession, fetchGymSessionsByDate, checkGymCalendarConflict } from "../lib/db";
import { EX_DB, MUSCLES, PRIMARY_FILL, SEC_FILL, calcMuscles } from "../lib/bodymap.jsx";
import { toBase64, detectMediaType, buildMuscleMapFromExercises, buildRecMuscleMap, callClaude, logDevError } from "../lib/utils";
import { CLAUDE_MODEL_VISION, CLAUDE_MODEL_TEXT, ANALYZE_PROMPT, buildRecommendPrompt } from "../lib/prompts";
import {
  Button, Select, SelectItem,
  DatePicker, DatePickerInput,
  InlineNotification, InlineLoading,
  Tag, DefinitionTooltip,
} from "@carbon/react";
import { Add, ArrowLeft, ArrowRight, Renew, Camera, Ai, Book } from "@carbon/icons-react";
import ExerciseRow from "./ExerciseRow";
import BodyPanel from "./BodyPanel";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";
import { useNav } from "../lib/NavContext";

const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const STEP_HEADINGS = { upload: "Last opp bilde", analyzing: "Analyserer…", confirm: "Bekreft øvelser", muscles: "Analyse av økt" };
const STEP_LABELS = ["Last opp bilde", "Bekreft øvelser", "Analyse av økt"];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const initialState = {
  step: "upload",
  images: [],
  exercises: [],
  muscles: { primary: [], secondary: [] },
  error: null,
  dragging: false,
  editingId: null,
  recs: null,
  loadingRecs: false,
  recsError: null,
  saving: false,
  saved: false,
  saveError: false,
  gymSessions: [],
  gymSessionId: "",
  gymCalendarConflict: null,
  sessionDate: localDateStr(),
};

export function reducer(state, action) {
  switch (action.type) {
    case "RESET":
      return { ...initialState, sessionDate: localDateStr() };
    case "ADD_IMAGE":
      return { ...state, images: [...state.images, action.image], error: null };
    case "REMOVE_IMAGE":
      return { ...state, images: state.images.filter(i => i.id !== action.id) };
    case "SET_DRAGGING":
      return { ...state, dragging: action.dragging };
    case "ANALYZE_START":
      return { ...state, step: "analyzing", error: null };
    case "ANALYZE_SUCCESS":
      return { ...state, step: "confirm", exercises: action.exercises };
    case "ANALYZE_ERROR":
      return { ...state, step: "upload", error: action.error };
    case "UPDATE_EXERCISE":
      return { ...state, exercises: state.exercises.map(e => e.id === action.id ? { ...e, ...action.updates } : e) };
    case "DELETE_EXERCISE":
      return { ...state, exercises: state.exercises.filter(e => e.id !== action.id) };
    case "ADD_EXERCISE":
      return { ...state, exercises: [...state.exercises, action.exercise], editingId: action.exercise.id };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_SESSION_DATE":
      return { ...state, sessionDate: action.date, gymSessions: [], gymSessionId: "", gymCalendarConflict: null };
    case "SET_GYM_SESSIONS":
      return { ...state, gymSessions: action.sessions, gymSessionId: "", gymCalendarConflict: null };
    case "SET_GYM_SESSION_ID":
      return { ...state, gymSessionId: action.id };
    case "SET_GYM_CONFLICT":
      return { ...state, gymCalendarConflict: action.conflict };
    case "CONFIRM":
      return { ...state, step: "muscles", muscles: action.muscles, saving: true, saved: false, saveError: false };
    case "SAVE_SUCCESS":
      return { ...state, saving: false, saved: true };
    case "SAVE_ERROR":
      return { ...state, saving: false, saveError: true };
    case "RECS_START":
      return { ...state, loadingRecs: true, recs: null, recsError: null };
    case "RECS_SUCCESS":
      return { ...state, loadingRecs: false, recs: action.recs };
    case "RECS_ERROR":
      return { ...state, loadingRecs: false, recsError: action.error };
    case "LOAD_TEMPLATE":
      return { ...state, step: "confirm", exercises: action.exercises };
    default:
      return state;
  }
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function MuscleMap({ templatePreload, onTemplatePreloadConsumed }) {
  const { onShowHome, onShowTemplatePicker } = useNav();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, images, exercises, muscles, error, dragging, editingId,
          recs, loadingRecs, recsError, saving, saved, saveError,
          gymSessions, gymSessionId, gymCalendarConflict, sessionDate } = state;
  const fileRef = useRef();
  const [sizeError, setSizeError] = useState(null);

  useEffect(() => {
    if (step !== "confirm") return;
    fetchGymSessionsByDate(sessionDate)
      .then(sessions => dispatch({ type: "SET_GYM_SESSIONS", sessions }))
      .catch(() => dispatch({ type: "SET_GYM_SESSIONS", sessions: [] })); // gym calendar is optional
  }, [step, sessionDate]);

  useEffect(() => {
    if (!gymSessionId) { dispatch({ type: "SET_GYM_CONFLICT", conflict: null }); return; }
    checkGymCalendarConflict(gymSessionId)
      .then(conflict => dispatch({ type: "SET_GYM_CONFLICT", conflict }))
      .catch(() => dispatch({ type: "SET_GYM_CONFLICT", conflict: null })); // treat conflict check failure as no conflict
  }, [gymSessionId]);

  // Load exercises from a chosen template and skip straight to the confirm step
  useEffect(() => {
    if (!templatePreload) return;
    dispatch({ type: "LOAD_TEMPLATE", exercises: templatePreload.map((e, i) => ({ ...e, id: e.id || i })) });
    onTemplatePreloadConsumed();
  }, [templatePreload]);

  const stepIndex = { upload: 0, analyzing: 0, confirm: 1, muscles: 2 }[step] ?? 0;
  const headingRef = useRef();
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  const exerciseMuscleMap = useMemo(() => buildMuscleMapFromExercises(exercises), [exercises]);

  const addImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSizeError(`Bildet er for stort (maks ${MAX_FILE_SIZE_MB} MB). Komprimer eller velg et annet bilde.`);
      return;
    }
    const mt = await detectMediaType(file);
    const b64 = await toBase64(file);
    dispatch({ type: "ADD_IMAGE", image: { id: Date.now() + Math.random(), base64: b64, mediaType: mt, preview: `data:${mt};base64,${b64}` } });
  }, [setSizeError]);

  const handleFiles = useCallback(async (files) => {
    setSizeError(null);
    for (const file of Array.from(files)) await addImage(file);
  }, [addImage, setSizeError]);

  const analyze = async () => {
    dispatch({ type: "ANALYZE_START" });
    try {
      const imageBlocks = images.map(img => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      }));
      const res = await callClaude({
        model: CLAUDE_MODEL_VISION,
        max_tokens: 1500,
        messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: ANALYZE_PROMPT }] }]
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Serverfeil (${res.status}): Ugyldig svar fra server`); }
      if (!res.ok) {
        const detail = data?.error?.message;
        throw new Error(res.status === 401 ? "Ikke innlogget. Logg inn på nytt." : detail ? `Serverfeil (${res.status}): ${detail}` : `Serverfeil (${res.status})`);
      }
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        throw new Error("Svaret fra Claude var ikke gyldig JSON. Prøv igjen.");
      }
      if (!Array.isArray(parsed)) throw new Error("Uventet svarformat fra Claude.");
      dispatch({ type: "ANALYZE_SUCCESS", exercises: parsed.map((ex, i) => ({ ...ex, id: i, enabled: true, sets: ex.sets ?? "1" })) });
    } catch (err) {
      logDevError("MuscleMap/analyse", err);
      dispatch({ type: "ANALYZE_ERROR", error: err.message || "Kunne ikke tolke bildet. Prøv igjen med et tydeligere bilde." });
    }
  };

  const confirm = () => {
    const enabled = exercises.filter(e => e.enabled && e.name);
    const enriched = enabled.map(ex => {
      if (ex.primary?.length || ex.secondary?.length) return ex;
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) return { ...ex, primary: rule.p, secondary: rule.s };
      }
      return ex;
    });
    dispatch({ type: "CONFIRM", muscles: calcMuscles(enriched) });
    saveSession(enriched, { gymCalendarId: gymSessionId || null, sessionDate, replace: !!gymCalendarConflict })
      .then(() => dispatch({ type: "SAVE_SUCCESS" }))
      .catch(err => { logDevError("MuscleMap/save", err); dispatch({ type: "SAVE_ERROR" }); });
  };

  const recommend = async () => {
    dispatch({ type: "RECS_START" });
    const untrained = Object.keys(MUSCLES).filter(id => !muscles.primary.includes(id) && !muscles.secondary.includes(id)).map(id => MUSCLES[id].label);
    const trained = [...muscles.primary, ...muscles.secondary].map(id => MUSCLES[id]?.label).filter(Boolean);
    try {
      const res = await callClaude({
        model: CLAUDE_MODEL_TEXT,
        max_tokens: 1000,
        messages: [{ role: "user", content: buildRecommendPrompt(trained, untrained) }]
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
        throw new Error("Svaret fra Claude var ikke gyldig JSON.");
      }
      dispatch({ type: "RECS_SUCCESS", recs: parsed });
    } catch (err) {
      logDevError("MuscleMap/anbefalinger", err);
      dispatch({ type: "RECS_ERROR", error: err.message || "Kunne ikke hente anbefalinger. Prøv igjen." });
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
          <div ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
            <SectionLabel>LOGG ØKT</SectionLabel>
            <PageHeading style={{ marginBottom: 20 }}>{STEP_HEADINGS[step]}</PageHeading>
          </div>
          <div role="list" aria-label="Fremgang" style={{ display: "flex", marginBottom: 28 }}>
            {STEP_LABELS.map((label, idx) => {
              const isComplete = stepIndex > idx;
              const isActive = stepIndex === idx;
              return (
                <div key={idx} role="listitem" aria-current={isActive ? "step" : undefined} style={{
                  flex: 1,
                  borderTop: (isActive || isComplete) ? "2px solid #0f62fe" : "1px solid #393939",
                  paddingTop: 8,
                  paddingRight: idx < 2 ? 12 : 0,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: isComplete ? "none" : `1px solid ${isActive ? "#0f62fe" : "#6f6f6f"}`,
                      background: isComplete ? "#0f62fe" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, flexShrink: 0,
                      color: isComplete ? "#fff" : isActive ? "#0f62fe" : "var(--cds-text-secondary)",
                      fontFamily: "var(--cds-font-mono)",
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: isActive ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                    }}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── UPLOAD ── */}
          {step === "upload" && (
            <div className="fade-in">
              <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
                Last opp ett eller flere bilder av treningsprogrammet.
              </p>

              <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
                {images.length > 0 ? `${images.length} bilde${images.length !== 1 ? "r" : ""} valgt` : ""}
              </p>

              {images.length === 0 ? (
                <div
                  role="region"
                  aria-label="Last opp treningsbilde"
                  onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: true }); }}
                  onDragLeave={() => dispatch({ type: "SET_DRAGGING", dragging: false })}
                  onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: false }); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `1px dashed ${dragging ? "var(--cds-interactive)" : "#6f6f6f"}`,
                    background: dragging ? "var(--cds-layer-hover-01)" : "transparent",
                    marginBottom: 14,
                    cursor: "pointer",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ textAlign: "center", padding: "48px 20px 40px" }}>
                    <Camera size={40} aria-hidden="true" style={{ color: "var(--cds-text-secondary)", marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Trykk for å velge bilde</p>
                    <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>eller dra og slipp · JPEG, PNG, WebP · flere bilder støttes</p>
                  </div>
                </div>
              ) : (
                <div
                  role="region"
                  aria-label="Last opp treningsbilde"
                  onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: true }); }}
                  onDragLeave={() => dispatch({ type: "SET_DRAGGING", dragging: false })}
                  onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: false }); handleFiles(e.dataTransfer.files); }}
                  style={{ marginBottom: 14 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {images.map((img, idx) => (
                      <div key={img.id} style={{ position: "relative", overflow: "hidden", aspectRatio: "1", background: "var(--cds-layer-01)" }}>
                        <img src={img.preview} alt={`Treningsbilde ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <button
                          aria-label={`Fjern bilde ${idx + 1}`}
                          onClick={() => dispatch({ type: "REMOVE_IMAGE", id: img.id })}
                          style={{
                            position: "absolute", top: 4, right: 4,
                            background: "var(--cds-layer-02)", border: "none",
                            color: "#fff", width: 24, height: 24,
                            fontSize: 16, lineHeight: "24px", textAlign: "center",
                            padding: 0, cursor: "pointer",
                          }}>
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileRef.current?.click()}
                      aria-label="Legg til flere bilder"
                      style={{
                        border: `1px dashed ${dragging ? "var(--cds-interactive)" : "#6f6f6f"}`,
                        background: dragging ? "var(--cds-layer-hover-01)" : "transparent",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        aspectRatio: "1", cursor: "pointer", gap: 4,
                      }}>
                      <Add size={20} aria-hidden="true" style={{ color: "var(--cds-text-secondary)" }} />
                      <span style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "0.5px" }}>Legg til</span>
                    </button>
                  </div>
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)} />

              <div aria-live="polite" aria-atomic="true">
                {sizeError && (
                  <InlineNotification
                    kind="error"
                    title="Feil:"
                    subtitle={sizeError}
                    hideCloseButton
                    style={{ marginBottom: 14 }}
                  />
                )}
              </div>

              <div aria-live="polite" aria-atomic="true">
                {error && (
                  <InlineNotification
                    kind="error"
                    title="Feil:"
                    subtitle={error}
                    hideCloseButton

                    style={{ marginBottom: 14 }}
                  />
                )}
              </div>

              <Button
                kind="secondary"
                renderIcon={Book}
                onClick={onShowTemplatePicker}
                style={{ width: "100%", maxWidth: "100%", marginBottom: 0 }}
              >
                Velg fra bibliotek
              </Button>

              <div style={{
                position: "sticky",
                bottom: 0,
                background: "var(--cds-background)",
                borderTop: "1px solid #393939",
                display: "flex",
                marginTop: 16,
              }}>
                <Button kind="ghost" onClick={onShowHome} style={{ flex: 1 }}>
                  Avbryt
                </Button>
                <Button
                  kind="primary"
                  renderIcon={ArrowRight}
                  onClick={analyze}
                  disabled={images.length === 0}
                  style={{ flex: 1 }}
                >
                  Neste
                </Button>
              </div>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {step === "analyzing" && (
            <div aria-live="polite" aria-busy="true" style={{ textAlign: "center", padding: "70px 0" }}>
              <InlineLoading
                description="Leser treningsprogram og identifiserer øvelser…"
                status="active"
                style={{ justifyContent: "center" }}
              />
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="fade-in">
              <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
                {exercises.length > 0
                  ? `Fant ${exercises.length} øvelse${exercises.length !== 1 ? "r" : ""}. Juster om nødvendig:`
                  : "Ingen øvelser funnet. Legg til manuelt:"}
              </p>

              <DatePicker
                datePickerType="single"
                dateFormat="d/m/Y"
                value={(() => { const [y, m, d] = sessionDate.split("-"); return `${d}/${m}/${y}`; })()}
                maxDate={(() => { const [y, m, d] = localDateStr().split("-"); return `${d}/${m}/${y}`; })()}
                onChange={([date]) => {
                  if (!date) return;
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  dispatch({ type: "SET_SESSION_DATE", date: `${y}-${m}-${d}` });
                }}
                style={{ marginBottom: 16 }}
              >
                <DatePickerInput id="session-date" labelText="Dato" placeholder="dd/mm/åååå" size="md" />
              </DatePicker>

              {gymSessions.length > 0 && (
                <Select
                  id="gym-session-select"
                  labelText="Hvilken time var dette?"
                  value={gymSessionId}
                  onChange={(e) => dispatch({ type: "SET_GYM_SESSION_ID", id: e.target.value })}
                  style={{ marginBottom: gymCalendarConflict ? 8 : 16 }}
                >
                  <SelectItem value="" text="Velg gymtime (valgfritt)" />
                  {gymSessions.map(s => {
                    const time = new Date(s.start_time).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
                    const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
                    return <SelectItem key={s.id} value={s.id} text={label} />;
                  })}
                </Select>
              )}

              {gymCalendarConflict && (
                <InlineNotification
                  kind="warning"
                  title="Eksisterende økt:"
                  subtitle={`Denne gymtimen har allerede en lagret økt (${gymCalendarConflict.session_date}). Lagring erstatter den.`}
                  hideCloseButton
                 
                  style={{ marginBottom: 16 }}
                />
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {exercises.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    autoFocusName={ex.id === editingId}
                    onChange={(updates) => dispatch({ type: "UPDATE_EXERCISE", id: ex.id, updates })}
                    onDelete={() => dispatch({ type: "DELETE_EXERCISE", id: ex.id })}
                  />
                ))}
              </div>

              <Button
                kind="ghost"
                renderIcon={Add}
                onClick={() => dispatch({ type: "ADD_EXERCISE", exercise: { id: Date.now(), name: "", standardName: "", sets: null, reps: null, enabled: true } })}
                style={{ width: "100%", marginBottom: 16 }}
              >
                Legg til øvelse manuelt
              </Button>

              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="secondary" renderIcon={ArrowLeft} onClick={() => dispatch({ type: "SET_STEP", step: "upload" })}>
                  Tilbake
                </Button>
                <Button
                  kind="primary"
                  renderIcon={ArrowRight}
                  onClick={confirm}
                  disabled={!exercises.some(e => e.enabled && e.name)}
                  style={{ flex: 1 }}
                >
                  Lagre og vis treningseffekt
                </Button>
              </div>
            </div>
          )}

          {/* ── MUSCLES ── */}
          {step === "muscles" && (
            <div className="fade-in">

              {/* Legend + save status */}
              <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
                <Tag type="green" size="sm">Primær ({muscles.primary.length})</Tag>
                <Tag type="blue" size="sm">Sekundær ({muscles.secondary.length})</Tag>
                <div aria-live="polite" style={{ marginLeft: "auto" }}>
                  {saving && <InlineLoading description="Lagrer…" status="active" />}
                  {saved && <InlineLoading description="Lagret" status="finished" />}
                  {saveError && <InlineLoading description="Lagring feilet" status="error" />}
                </div>
              </div>

              {/* Body maps */}
              <BodyPanel
                primary={muscles.primary}
                secondary={muscles.secondary}
                muscleMap={exerciseMuscleMap}
                marginBottom={18}
              />

              {/* Trained muscle groups */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Trente muskelgrupper
                </p>
                {muscles.primary.length === 0 && muscles.secondary.length === 0 ? (
                  <p style={{ color: "var(--cds-text-secondary)", fontSize: 13 }}>Ingen muskelgrupper gjenkjent for de valgte øvelsene.</p>
                ) : (
                  <>
                    {muscles.primary.map(id => {
                      const exNames = (exerciseMuscleMap[id] || []).join(", ");
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
                      const exNames = (exerciseMuscleMap[id] || []).join(", ");
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
                  </>
                )}
              </div>

              {/* Exercises this session */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Øvelser denne økten
                </p>
                {exercises.filter(e => e.enabled && e.name).map(ex => {
                  const muscleLabels = [...(ex.primary || []), ...(ex.secondary || [])].map(id => MUSCLES[id]?.label || id).join(", ");
                  return (
                    <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--cds-border-subtle-01)", color: "var(--cds-text-primary)" }}>
                      <span>
                        {muscleLabels ? (
                          <DefinitionTooltip definition={muscleLabels} openOnHover align="bottom">{ex.name}</DefinitionTooltip>
                        ) : ex.name}
                      </span>
                      {(ex.sets || ex.reps) && (
                        <span style={{ color: "var(--cds-text-secondary)" }}>{[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recommendations */}
              <Button
                kind="tertiary"
                renderIcon={Ai}
                onClick={recommend}
                disabled={loadingRecs}
                style={{ width: "100%", maxWidth: "100%", marginBottom: 10 }}
              >
                {loadingRecs ? "Henter anbefalinger…" : "Hva bør jeg trene neste gang?"}
              </Button>

              {recsError && (
                <InlineNotification
                  kind="error"
                  title="Feil:"
                  subtitle={recsError}
                  hideCloseButton
                  style={{ marginBottom: 10 }}
                />
              )}

              {recs && recs.length > 0 && (() => {
                const recPrimary  = [...new Set(recs.flatMap(r => r.primary || []))];
                const recSecAll   = [...new Set(recs.flatMap(r => r.secondary || []))];
                const recSecondary = recSecAll.filter(id => !recPrimary.includes(id));
                return (
                  <div className="fade-in">
                    <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                        Anbefalte øvelser
                      </p>
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

                    <BodyPanel
                      primary={recPrimary}
                      secondary={recSecondary}
                      muscleMap={buildRecMuscleMap(recs)}
                      marginBottom={10}
                    />

                    <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                      <Tag type="green" size="sm">Primær</Tag>
                      <Tag type="blue" size="sm">Sekundær</Tag>
                    </div>
                  </div>
                );
              })()}

              {recs && recs.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center", marginBottom: 10 }}>
                  Ingen anbefalinger tilgjengelig.
                </p>
              )}

              <Button kind="ghost" renderIcon={Renew} onClick={() => dispatch({ type: "RESET" })} style={{ width: "100%", maxWidth: "100%" }}>
                Logg ny økt
              </Button>
            </div>
          )}

        </div>
    </PageShell>
  );
}

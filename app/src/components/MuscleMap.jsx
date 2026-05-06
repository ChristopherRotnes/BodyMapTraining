import { useReducer, useRef, useCallback, useEffect, useMemo, useState } from "react";
import { saveSession, fetchGymSessionsByDate, checkGymCalendarConflict, fetchLibraryExercises } from "../lib/db";
import { EX_DB, MUSCLES, calcMuscles } from "../lib/bodymap.jsx";
import { toBase64, detectMediaType, buildMuscleMapFromExercises, buildRecMuscleMap, callClaude, logDevError, getIntlLocale } from "../lib/utils";
import { CLAUDE_MODEL_VISION, CLAUDE_MODEL_TEXT, ANALYZE_PROMPT, buildRecommendPrompt } from "../lib/prompts";
import {
  Button, Select, SelectItem,
  DatePicker, DatePickerInput,
  InlineNotification, InlineLoading,
  Tag, DefinitionTooltip,
} from "@carbon/react";
import { Add, ArrowLeft, ArrowRight, Renew, Camera, AiRecommend, Close, Edit } from "@carbon/icons-react";
import ExerciseRowWithAutocomplete from "./ExerciseRowWithAutocomplete";
import BodyPanel from "./BodyPanel";
import PageShell, { SectionLabel, AccentChip, StickyCta } from "./PageShell";
import { useNav } from "../lib/NavContext";
import { useTranslation } from "react-i18next";
import i18n from "../lib/i18n";

const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function getConfidenceColor(ex) {
  if (ex.primary?.length || ex.secondary?.length) return "var(--heat-4)";
  const txt = ((ex.name || "") + " " + (ex.standardName || "")).toLowerCase();
  for (const rule of EX_DB) {
    if (rule.kw.some(k => txt.includes(k))) return "var(--cds-support-warning)";
  }
  return "var(--cds-support-error)";
}

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
    case "ANALYZE_SUCCESS": {
      const validIds = new Set(Object.keys(MUSCLES));
      const clean = (arr) => (arr || []).filter(id => validIds.has(id));
      return {
        ...state,
        step: "confirm",
        exercises: action.exercises.map(e => ({
          ...e,
          primary: clean(e.primary),
          secondary: clean(e.secondary),
        })),
      };
    }
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
  const { t } = useTranslation();
  const { onShowHome, onShowTemplatePicker, onShowReportWithPrefill } = useNav();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, images, exercises, muscles, error, dragging, editingId,
          recs, loadingRecs, recsError, saving, saved, saveError,
          gymSessions, gymSessionId, gymCalendarConflict, sessionDate } = state;
  const fileRef = useRef();
  const [sizeError, setSizeError] = useState(null);
  const [libraryExercises, setLibraryExercises] = useState([]);
  const [newExerciseIds, setNewExerciseIds] = useState(() => new Set());
  const [useTodayDate, setUseTodayDate] = useState(true);

  const STEP_DEFS = useMemo(() => [
    { num: "01", label: t("muscleMap.stepSnap") },
    { num: "02", label: t("muscleMap.stepConfirm") },
    { num: "03", label: t("muscleMap.stepResult") },
  ], [t]);

  useEffect(() => {
    fetchLibraryExercises().then(setLibraryExercises).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === "confirm") setUseTodayDate(true);
  }, [step]);

  useEffect(() => {
    if (step !== "confirm") return;
    fetchGymSessionsByDate(sessionDate)
      .then(sessions => dispatch({ type: "SET_GYM_SESSIONS", sessions }))
      .catch(() => dispatch({ type: "SET_GYM_SESSIONS", sessions: [] }));
  }, [step, sessionDate]);

  useEffect(() => {
    if (!gymSessionId) { dispatch({ type: "SET_GYM_CONFLICT", conflict: null }); return; }
    checkGymCalendarConflict(gymSessionId)
      .then(conflict => dispatch({ type: "SET_GYM_CONFLICT", conflict }))
      .catch(() => dispatch({ type: "SET_GYM_CONFLICT", conflict: null }));
  }, [gymSessionId]);

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
        messages: [{ role: "user", content: buildRecommendPrompt(trained, untrained, i18n.language) }]
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

  const totalMuscles = muscles.primary.length + muscles.secondary.length;
  const enabledCount = exercises.filter(e => e.enabled && e.name).length;

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div style={{ paddingBottom: 100 }}>

        <div ref={headingRef} tabIndex={-1} style={{ outline: "none" }}>
          <SectionLabel>{t("muscleMap.sectionLabel")}</SectionLabel>
        </div>

        {/* Top-border stepper */}
        <div role="list" aria-label={t("muscleMap.progressLabel")} style={{ display: "flex", marginBottom: 28, padding: "0 16px" }}>
          {STEP_DEFS.map((s, idx) => {
            const isActive = stepIndex === idx;
            const isComplete = stepIndex > idx;
            return (
              <div key={idx} role="listitem" aria-current={isActive ? "step" : undefined} style={{
                flex: 1,
                borderTop: isActive ? "3px solid var(--accent)" : isComplete ? "3px solid var(--accent-bg-55)" : "1px solid var(--border-subtle-wl)",
                paddingTop: 10,
                paddingRight: idx < 2 ? 16 : 0,
              }}>
                <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: isActive ? "var(--accent)" : "var(--text-muted-wl)", letterSpacing: "0.12em" }}>
                  {s.num}
                </div>
                <div style={{ fontSize: 12, color: isActive ? "var(--cds-text-primary)" : "var(--text-muted-wl)", fontWeight: isActive ? 600 : 400, marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── UPLOAD ── */}
        {step === "upload" && (
          <div className="fade-in" style={{ padding: "0 16px" }}>

            {/* Hero */}
            <div style={{ fontFamily: "var(--cond)", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.02em", marginBottom: 28 }}>
              <div style={{ fontSize: 32, color: "var(--cds-text-primary)" }}>{t("muscleMap.heroLine1")}</div>
              <div style={{ fontSize: 52, color: "var(--accent)" }}>{t("muscleMap.heroLine2")}</div>
            </div>

            <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>
              {images.length > 0 ? t("muscleMap.imageCount", { count: images.length }) : ""}
            </p>

            {/* Dropzone */}
            {images.length === 0 ? (
              <div
                role="region"
                aria-label={t("muscleMap.dropzoneLabel")}
                onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: true }); }}
                onDragLeave={() => dispatch({ type: "SET_DRAGGING", dragging: false })}
                onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: false }); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1px solid ${dragging ? "var(--accent)" : "var(--accent-bg-30)"}`,
                  background: dragging ? "var(--accent-bg-14)" : "var(--accent-bg-08)",
                  borderRadius: 16,
                  marginBottom: 14,
                  cursor: "pointer",
                  minHeight: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 120ms ease, border-color 120ms ease",
                }}
              >
                <div style={{ textAlign: "center", padding: "48px 20px 40px" }}>
                  <div style={{
                    width: 64, height: 64,
                    borderRadius: "50%",
                    background: "var(--accent-bg-14)",
                    boxShadow: "0 0 32px var(--accent-bg-55)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    <Camera size={28} aria-hidden="true" style={{ color: "var(--accent)" }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t("muscleMap.dropzoneClick")}</p>
                  <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{t("muscleMap.dropzoneDrag")}</p>
                </div>
              </div>
            ) : (
              <div
                role="region"
                aria-label={t("muscleMap.dropzoneLabel")}
                onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: true }); }}
                onDragLeave={() => dispatch({ type: "SET_DRAGGING", dragging: false })}
                onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAGGING", dragging: false }); handleFiles(e.dataTransfer.files); }}
                style={{ marginBottom: 14 }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {images.map((img, idx) => (
                    <div key={img.id} style={{ position: "relative", overflow: "hidden", aspectRatio: "1", background: "var(--cds-layer-01)" }}>
                      <img src={img.preview} alt={t("muscleMap.imageAlt", { n: idx + 1 })} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <button
                        aria-label={t("muscleMap.removeImage", { n: idx + 1 })}
                        onClick={() => dispatch({ type: "REMOVE_IMAGE", id: img.id })}
                        style={{
                          position: "absolute", top: 4, right: 4,
                          background: "var(--cds-layer-02)", border: "none",
                          color: "var(--cds-text-inverse)", width: 24, height: 24,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, cursor: "pointer",
                        }}>
                        <Close size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    aria-label={t("muscleMap.addMoreImages")}
                    style={{
                      border: `1px dashed ${dragging ? "var(--accent)" : "var(--accent-bg-30)"}`,
                      background: dragging ? "var(--accent-bg-08)" : "transparent",
                      borderRadius: 16,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      aspectRatio: "1", cursor: "pointer", gap: 4,
                    }}>
                    <Add size={20} aria-hidden="true" style={{ color: "var(--text-muted-wl)" }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.5px" }}>{t("common.add")}</span>
                  </button>
                </div>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)} />

            {/* Ghost pill shortcuts */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                onClick={onShowTemplatePicker}
                style={{
                  flex: 1, padding: "10px 0",
                  background: "transparent",
                  border: "1px solid var(--border-subtle-wl)",
                  borderRadius: "var(--r-pill)",
                  color: "var(--cds-text-primary)",
                  fontFamily: "var(--cds-font-sans)", fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t("muscleMap.useTemplate")}
              </button>
              <button
                onClick={() => dispatch({ type: "ANALYZE_SUCCESS", exercises: [] })}
                style={{
                  flex: 1, padding: "10px 0",
                  background: "transparent",
                  border: "1px solid var(--border-subtle-wl)",
                  borderRadius: "var(--r-pill)",
                  color: "var(--cds-text-primary)",
                  fontFamily: "var(--cds-font-sans)", fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {t("muscleMap.manualEntry")}
              </button>
            </div>

            {/* Tips callout */}
            <div style={{
              borderInlineStart: "3px solid var(--accent)",
              background: "var(--accent-bg-08)",
              padding: "10px 12px",
              marginBottom: 14,
            }}>
              <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{t("muscleMap.tipsHeading")}</p>
              <p style={{ fontSize: 13, color: "var(--cds-text-secondary)" }}>{t("muscleMap.tipsBody")}</p>
            </div>

            <div aria-live="polite" aria-atomic="true">
              {sizeError && (
                <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={sizeError} hideCloseButton style={{ marginBottom: 14 }} />
              )}
            </div>
            <div aria-live="polite" aria-atomic="true">
              {error && (
                <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={error} hideCloseButton style={{ marginBottom: 14 }} />
              )}
            </div>

            <StickyCta>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onShowHome}
                  style={{
                    flex: 1, padding: "12px 0",
                    background: "transparent", border: "1px solid var(--border-subtle-wl)",
                    borderRadius: "var(--r-pill)", color: "var(--cds-text-primary)",
                    fontFamily: "var(--cds-font-sans)", fontSize: 14, cursor: "pointer",
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={analyze}
                  disabled={images.length === 0}
                  style={{
                    flex: 2, padding: "12px 20px",
                    background: images.length === 0 ? "var(--cds-layer-01)" : "var(--accent)",
                    border: "none",
                    borderRadius: "var(--r-pill)",
                    color: images.length === 0 ? "var(--text-muted-wl)" : "#fff",
                    fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 14,
                    cursor: images.length === 0 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span>{t("muscleMap.analyzeBtn")}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </StickyCta>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {step === "analyzing" && (
          <div aria-live="polite" aria-busy="true" style={{ textAlign: "center", padding: "70px 16px" }}>
            <InlineLoading
              description={t("muscleMap.analyzing")}
              status="active"
              style={{ justifyContent: "center" }}
            />
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && (
          <div style={{ background: "var(--cds-layer-02)", borderTop: "2px solid var(--accent)" }}>
          <SectionLabel renderIcon={Edit} style={{ margin: "12px 16px 4px" }}>
            {t("muscleMap.confirmLabel")}
          </SectionLabel>
          <div className="fade-in" style={{ padding: "0 16px" }}>

            {/* Hero */}
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 56, color: "var(--accent)", lineHeight: 1, display: "block" }}>
                {exercises.length}
              </span>
              <span style={{ fontSize: 20, color: "var(--cds-text-primary)" }}>{t("muscleMap.foundExercises", { count: exercises.length })}</span>
            </div>

            {/* Tilbake */}
            <button
              onClick={() => dispatch({ type: "SET_STEP", step: "upload" })}
              style={{
                background: "none", border: "none", padding: "8px 0 20px", cursor: "pointer",
                color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-sans)", fontSize: 13,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <ArrowLeft size={14} /> {t("common.back")}
            </button>

            {/* I dag / Annen dag segmented pill */}
            <div style={{ display: "flex", borderRadius: "var(--r-pill)", border: "1px solid var(--border-subtle-wl)", overflow: "hidden", marginBottom: 16 }}>
              <button
                onClick={() => { setUseTodayDate(true); dispatch({ type: "SET_SESSION_DATE", date: localDateStr() }); }}
                style={{
                  flex: 1, padding: "10px 0",
                  background: useTodayDate ? "var(--accent)" : "transparent",
                  color: useTodayDate ? "#fff" : "var(--cds-text-primary)",
                  border: "none", cursor: "pointer",
                  fontFamily: "var(--cds-font-sans)", fontSize: 13, fontWeight: useTodayDate ? 600 : 400,
                  transition: "background 120ms ease",
                }}
              >
                {t("muscleMap.today")}
              </button>
              <button
                onClick={() => setUseTodayDate(false)}
                style={{
                  flex: 1, padding: "10px 0",
                  background: !useTodayDate ? "var(--accent)" : "transparent",
                  color: !useTodayDate ? "#fff" : "var(--cds-text-primary)",
                  border: "none", borderLeft: "1px solid var(--border-subtle-wl)", cursor: "pointer",
                  fontFamily: "var(--cds-font-sans)", fontSize: 13, fontWeight: !useTodayDate ? 600 : 400,
                  transition: "background 120ms ease",
                }}
              >
                {t("muscleMap.otherDay")}
              </button>
            </div>

            {!useTodayDate && (
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
                <DatePickerInput id="session-date" labelText={t("muscleMap.dateLabel")} placeholder={t("muscleMap.datePlaceholder")} size="md" />
              </DatePicker>
            )}

            {gymSessions.length > 0 && (
              <Select
                id="gym-session-select"
                labelText={t("muscleMap.selectGymSession")}
                value={gymSessionId}
                onChange={(e) => dispatch({ type: "SET_GYM_SESSION_ID", id: e.target.value })}
                style={{ marginBottom: gymCalendarConflict ? 8 : 16 }}
              >
                <SelectItem value="" text={t("muscleMap.selectGymOptional")} />
                {gymSessions.map(s => {
                  const time = new Intl.DateTimeFormat(getIntlLocale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(s.start_time));
                  const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
                  return <SelectItem key={s.id} value={s.id} text={label} />;
                })}
              </Select>
            )}

            {gymCalendarConflict && (
              <InlineNotification
                kind="warning"
                title={t("muscleMap.conflictTitle")}
                subtitle={t("muscleMap.conflictBody", { date: gymCalendarConflict.session_date })}
                hideCloseButton
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Exercise list with confidence dots */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              {exercises.map((ex) => (
                <div key={ex.id} style={{ position: "relative" }}>
                  <ExerciseRowWithAutocomplete
                    exercise={ex}
                    autoFocusName={ex.id === editingId}
                    isNew={newExerciseIds.has(ex.id)}
                    libraryExercises={libraryExercises}
                    validateNumbers
                    onChange={(updates) => dispatch({ type: "UPDATE_EXERCISE", id: ex.id, updates })}
                    onDelete={() => dispatch({ type: "DELETE_EXERCISE", id: ex.id })}
                  />
                  <div
                    title={
                      (ex.primary?.length || ex.secondary?.length)
                        ? t("muscleMap.musclesViaClaude")
                        : (() => {
                            const txt = ((ex.name || "") + " " + (ex.standardName || "")).toLowerCase();
                            return EX_DB.some(r => r.kw.some(k => txt.includes(k)))
                              ? t("muscleMap.musclesViaDB")
                              : t("muscleMap.musclesUnknown");
                          })()
                    }
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 10, right: 42,
                      width: 7, height: 7,
                      borderRadius: "50%",
                      background: getConfidenceColor(ex),
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ))}
            </div>

            <Button
              kind="ghost"
              renderIcon={Add}
              onClick={() => {
                const id = Date.now();
                setNewExerciseIds(s => new Set(s).add(id));
                dispatch({ type: "ADD_EXERCISE", exercise: { id, name: "", standardName: "", sets: null, reps: null, enabled: true } });
              }}
              style={{ width: "100%", marginBottom: 16 }}
            >
              {t("muscleMap.addManual")}
            </Button>

            <StickyCta>
              <button
                onClick={confirm}
                disabled={!exercises.some(e => e.enabled && e.name)}
                style={{
                  width: "100%", padding: "14px 20px",
                  background: exercises.some(e => e.enabled && e.name) ? "var(--accent)" : "var(--cds-layer-01)",
                  border: "none",
                  borderRadius: "var(--r-pill)",
                  color: exercises.some(e => e.enabled && e.name) ? "#fff" : "var(--text-muted-wl)",
                  fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 15,
                  cursor: exercises.some(e => e.enabled && e.name) ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span>{t("muscleMap.saveAndShow")}</span>
                <ArrowRight size={16} />
              </button>
            </StickyCta>
          </div>
          </div>
        )}

        {/* ── RESULTAT ── */}
        {step === "muscles" && (
          <div className="fade-in" style={{ padding: "0 16px" }}>

            {/* Hero */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, color: "var(--cds-text-primary)", marginBottom: 2 }}>{t("muscleMap.hitMuscles1")}</div>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 56, color: "var(--accent)", lineHeight: 1, display: "block" }}>
                {totalMuscles}
              </span>
              <div style={{ fontSize: 20, color: "var(--cds-text-primary)" }}>{t("muscleMap.hitMuscles2")}</div>
            </div>

            {/* KPI strip */}
            <div style={{
              display: "flex",
              background: "var(--surface-card)",
              borderRadius: "var(--r-tile)",
              border: "1px solid var(--border-subtle-wl)",
              marginBottom: 20,
              overflow: "hidden",
            }}>
              {[
                { label: t("common.exercises"), value: enabledCount },
                { label: t("muscleMap.kpiMuscles"), value: totalMuscles },
                { label: t("muscleMap.kpiTime"), value: "—" },
              ].map((tile, i) => (
                <div key={i} style={{
                  flex: 1, padding: "14px 0", textAlign: "center",
                  borderRight: i < 2 ? "1px solid var(--border-subtle-wl)" : "none",
                }}>
                  <div style={{ fontFamily: "var(--cond)", fontWeight: 600, fontSize: 28, color: "var(--cds-text-primary)", lineHeight: 1 }}>
                    {tile.value}
                  </div>
                  <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
                    {tile.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Save status */}
            <div aria-live="polite" style={{ marginBottom: 16, minHeight: 24, display: "flex", justifyContent: "flex-end" }}>
              {saving && <InlineLoading description={t("common.saving")} status="active" />}
              {saved && <InlineLoading description={t("common.saved")} status="finished" />}
              {saveError && <InlineLoading description={t("muscleMap.savingError")} status="error" />}
            </div>

            {/* Body maps */}
            <BodyPanel
              primary={muscles.primary}
              secondary={muscles.secondary}
              muscleMap={exerciseMuscleMap}
              marginBottom={20}
            />

            {/* Muscle chips */}
            {(muscles.primary.length > 0 || muscles.secondary.length > 0) && (
              <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 16, marginBottom: 16 }}>
                <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                  {t("muscleMap.trainedMuscles")}
                </p>
                {muscles.primary.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: muscles.secondary.length > 0 ? 10 : 0 }}>
                    {muscles.primary.map(id => (
                      <AccentChip key={id}>{t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}</AccentChip>
                    ))}
                  </div>
                )}
                {muscles.secondary.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {muscles.secondary.map(id => (
                      <span key={id} style={{
                        display: "inline-block",
                        borderRadius: "var(--r-pill)", padding: "3px 10px",
                        background: "var(--cds-layer-01)", border: "1px solid var(--border-subtle-wl)",
                        color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)",
                        fontSize: 11, letterSpacing: "0.06em",
                      }}>
                        {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Exercises this session */}
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 16, marginBottom: 16 }}>
              <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                {t("muscleMap.exercisesThisSession")}
              </p>
              {exercises.filter(e => e.enabled && e.name).map(ex => {
                const muscleLabels = [...(ex.primary || []), ...(ex.secondary || [])].map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ");
                return (
                  <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--border-subtle-wl)", color: "var(--cds-text-primary)" }}>
                    <span>
                      {muscleLabels ? (
                        <DefinitionTooltip definition={muscleLabels} openOnHover align="bottom">{ex.name}</DefinitionTooltip>
                      ) : ex.name}
                    </span>
                    {(ex.sets || ex.reps) && (
                      <span style={{ color: "var(--text-muted-wl)" }}>{[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Forward CTA → Periode-rapport */}
            <div style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle-wl)",
              borderRadius: "var(--r-card)",
              padding: "18px 16px",
              marginBottom: 16,
            }}>
              <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.16em", color: "var(--text-muted-wl)", textTransform: "uppercase", marginBottom: 8 }}>
                {t("muscleMap.nextStep")}
              </div>
              <p style={{ fontSize: 14, color: "var(--cds-text-primary)", marginBottom: 14 }}>
                {t("muscleMap.nextStepBody")}
              </p>
              <button
                onClick={() => {
                  const weekday = new Date(sessionDate + "T12:00:00").getDay();
                  const gymSession = gymSessions.find(s => s.id === gymSessionId);
                  onShowReportWithPrefill({ periodDays: 30, weekday, sessionType: gymSession?.name || "" });
                }}
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "var(--accent)", color: "#fff",
                  border: "none", borderRadius: "var(--r-pill)",
                  fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 14,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <span>{t("muscleMap.analyzePeriod")}</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Recommendations */}
            <Button
              kind="tertiary"
              renderIcon={AiRecommend}
              onClick={recommend}
              disabled={loadingRecs}
              style={{ width: "100%", maxWidth: "100%", marginBottom: 10 }}
            >
              {loadingRecs ? t("muscleMap.loadingRecs") : t("muscleMap.getRecommendations")}
            </Button>

            {recsError && (
              <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={recsError} hideCloseButton style={{ marginBottom: 10 }} />
            )}

            {recs && recs.length > 0 && (() => {
              const recPrimary  = [...new Set(recs.flatMap(r => r.primary || []))];
              const recSecAll   = [...new Set(recs.flatMap(r => r.secondary || []))];
              const recSecondary = recSecAll.filter(id => !recPrimary.includes(id));
              return (
                <div className="fade-in">
                  <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 14, marginBottom: 10 }}>
                    <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                      {t("muscleMap.recommendedExercises")}
                    </p>
                    {recs.map((r, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle-wl)" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--cds-text-primary)" }}>{r.name}</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: r.tip ? 4 : 0 }}>
                          {(r.primary || []).length > 0 && (
                            <Tag type="green" size="sm">{r.primary.map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ")}</Tag>
                          )}
                          {(r.secondary || []).length > 0 && (
                            <Tag type="blue" size="sm">{r.secondary.map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ")}</Tag>
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
                    <Tag type="green" size="sm">{t("muscleMap.primaryTag")}</Tag>
                    <Tag type="blue" size="sm">{t("muscleMap.secondaryTag")}</Tag>
                  </div>
                </div>
              );
            })()}

            {recs && recs.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center", marginBottom: 10 }}>
                {t("muscleMap.noRecs")}
              </p>
            )}

            <Button kind="ghost" renderIcon={Renew} onClick={() => dispatch({ type: "RESET" })} style={{ width: "100%", maxWidth: "100%" }}>
              {t("muscleMap.logNew")}
            </Button>
          </div>
        )}

      </div>
    </PageShell>
  );
}

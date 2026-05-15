import { useReducer, useRef, useCallback, useEffect, useMemo, useState } from "react";
import { saveSession, fetchGymSessionsByDate, checkGymCalendarConflict, fetchLibraryExercises } from "../lib/db";
import { EX_DB, MUSCLES, calcMuscles } from "../lib/bodymap.jsx";
import { compressImage, buildMuscleMapFromExercises, callClaude, logDevError } from "../lib/utils";
import { CLAUDE_MODEL_VISION, CLAUDE_MODEL_TEXT, ANALYZE_PROMPT, buildRecommendPrompt } from "../lib/prompts";
import { InlineLoading } from "@carbon/react";
import MuscleMapUpload from "./MuscleMapUpload";
import MuscleMapConfirm from "./MuscleMapConfirm";
import MuscleMapResult from "./MuscleMapResult";
import PageShell, { SectionLabel } from "./PageShell";
import { useNav } from "../lib/NavContext";
import { useTranslation } from "react-i18next";
import i18n from "../lib/i18n";

export const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// Gym whiteboards are written in ALL CAPS by convention. Normalize to title
// case when the entire string is uppercase so names display consistently.
const toTitleCase = (str) =>
  str.toLowerCase().split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
const normalizeExName = (str) => {
  if (!str) return str;
  const t = str.trim();
  return t === t.toUpperCase() && /[A-ZÆØÅ]{2,}/.test(t) ? toTitleCase(t) : t;
};

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

export default function MuscleMap({ templatePreload, onTemplatePreloadConsumed }) {
  const { t } = useTranslation();
  const { onShowHome, onShowTemplatePicker } = useNav();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUseTodayDate(true);
    onTemplatePreloadConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatePreload]); // onTemplatePreloadConsumed excluded: adding it would re-run if parent recreates the callback

  const stepIndex = { upload: 0, analyzing: 0, confirm: 1, muscles: 2 }[step] ?? 0;
  const headingRef = useRef();
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  const exerciseMuscleMap = useMemo(() => buildMuscleMapFromExercises(exercises), [exercises]);

  const addImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const { base64: b64, mediaType: mt } = await compressImage(file);
      dispatch({ type: "ADD_IMAGE", image: { id: Date.now() + Math.random(), base64: b64, mediaType: mt, preview: `data:${mt};base64,${b64}` } });
    } catch (e) {
      setSizeError(e.message || "Kunne ikke laste bildet.");
    }
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
        const detail = data?.detail || data?.error?.message;
        throw new Error(res.status === 401 ? "Ikke innlogget. Logg inn på nytt." : detail ? `Serverfeil (${res.status}): ${detail}` : `Serverfeil (${res.status})`);
      }
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        throw new Error("Svaret fra Claude var ikke gyldig JSON. Prøv igjen.");
      }
      if (!Array.isArray(parsed)) throw new Error("Uventet svarformat fra Claude.");
      dispatch({ type: "ANALYZE_SUCCESS", exercises: parsed.map((ex, i) => ({ ...ex, id: i, enabled: true, name: normalizeExName(ex.name), standardName: normalizeExName(ex.standardName) })) });
      setUseTodayDate(true);
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

        {step === "upload" && (
          <MuscleMapUpload
            images={images}
            dragging={dragging}
            sizeError={sizeError}
            error={error}
            fileRef={fileRef}
            dispatch={dispatch}
            onAnalyze={analyze}
            onShowHome={onShowHome}
            onShowTemplatePicker={onShowTemplatePicker}
            onHandleFiles={handleFiles}
          />
        )}

        {step === "analyzing" && (
          <div aria-live="polite" aria-busy="true" style={{ textAlign: "center", padding: "70px 16px" }}>
            <InlineLoading
              description={t("muscleMap.analyzing")}
              status="active"
              style={{ justifyContent: "center" }}
            />
          </div>
        )}

        {step === "confirm" && (
          <MuscleMapConfirm
            exercises={exercises}
            gymSessions={gymSessions}
            gymSessionId={gymSessionId}
            gymCalendarConflict={gymCalendarConflict}
            sessionDate={sessionDate}
            useTodayDate={useTodayDate}
            setUseTodayDate={setUseTodayDate}
            editingId={editingId}
            libraryExercises={libraryExercises}
            newExerciseIds={newExerciseIds}
            setNewExerciseIds={setNewExerciseIds}
            dispatch={dispatch}
            onConfirm={confirm}
          />
        )}

        {step === "muscles" && (
          <MuscleMapResult
            muscles={muscles}
            exercises={exercises}
            totalMuscles={totalMuscles}
            enabledCount={enabledCount}
            recs={recs}
            loadingRecs={loadingRecs}
            recsError={recsError}
            saving={saving}
            saved={saved}
            saveError={saveError}
            exerciseMuscleMap={exerciseMuscleMap}
            onRecommend={recommend}
            dispatch={dispatch}
          />
        )}

      </div>
    </PageShell>
  );
}

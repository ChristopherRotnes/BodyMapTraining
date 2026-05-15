import { useReducer, useRef, useCallback, useEffect, useMemo, useState } from "react";
import { saveSession, fetchGymSessionsByDate, checkGymCalendarConflict, fetchLibraryExercises } from "../lib/db";
import { EX_DB, calcMuscles } from "../lib/bodymap.jsx";
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
import { localDateStr, initialState, reducer } from "../lib/muscleMapReducer";

// Gym whiteboards are written in ALL CAPS by convention. Normalize to title
// case when the entire string is uppercase so names display consistently.
const toTitleCase = (str) =>
  str.toLowerCase().split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
const normalizeExName = (str) => {
  if (!str) return str;
  const t = str.trim();
  return t === t.toUpperCase() && /[A-ZÆØÅ]{2,}/.test(t) ? toTitleCase(t) : t;
};

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

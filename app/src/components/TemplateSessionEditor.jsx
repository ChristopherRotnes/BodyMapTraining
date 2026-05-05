import { useState, useEffect, useMemo } from "react";
import {
  Button, Tag, InlineNotification,
} from "@carbon/react";
import { Add, ArrowLeft, ArrowRight, Save } from "@carbon/icons-react";
import PageShell, { PageTitle, BackButton } from "./PageShell";
import { fetchLibraryExercises, replaceTemplateExercises, touchTemplate, updateTemplateName } from "../lib/db";
import { calcMuscles } from "../lib/bodymap.jsx";
import { buildMuscleMapFromExercises, logDevError } from "../lib/utils";
import ExerciseRowWithAutocomplete from "./ExerciseRowWithAutocomplete";
import BodyPanel from "./BodyPanel";
import LibraryPicker from "./LibraryPicker";


// Convert a template_exercise DB row into the exercise object shape used by ExerciseRow / calcMuscles
function templateExToEditorShape(te) {
  return {
    id: te.id,
    library_exercise_id: te.library_exercise_id || null,
    name: te.name,
    standardName: te.name,
    sets: te.sets || null,
    reps: te.reps || null,
    primary: te.primary_muscles || [],
    secondary: te.secondary_muscles || [],
    enabled: true,
  };
}

// Props:
//   template          — the full template object (with session_template_exercises)
//   mode              — "use" | "edit"
//                         "use"  → "Bruk økt" button calls onUseTemplate(exercises)
//                         "edit" → "Lagre mal" button saves to DB and calls onBack
//   onBack            — navigate back
//   onUseTemplate(exercises) — called in "use" mode when trainer clicks "Bruk økt"
export default function TemplateSessionEditor({ template, mode, onBack, onUseTemplate }) {
  const [exercises, setExercises] = useState(() =>
    (template.session_template_exercises || []).map(templateExToEditorShape)
  );
  const [templateName, setTemplateName] = useState(template.name);
  const [editingTitle, setEditingTitle] = useState(false);

  const [libraryExercises, setLibraryExercises] = useState([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [newExId, setNewExId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchLibraryExercises().then(setLibraryExercises).catch(() => {}); // degrades silently to manual entry
  }, []);

  const muscles = useMemo(
    () => calcMuscles(exercises.filter(e => e.enabled && e.name)),
    [exercises]
  );
  const muscleMap = useMemo(
    () => buildMuscleMapFromExercises(exercises),
    [exercises]
  );

  const addFromLibrary = (libEx) => {
    const id = `lib-${Date.now()}`;
    setExercises(p => [...p, {
      id,
      library_exercise_id: libEx.id,
      name: libEx.name,
      standardName: libEx.name,
      sets: libEx.default_sets || null,
      reps: libEx.default_reps || null,
      primary: libEx.primary_muscles || [],
      secondary: libEx.secondary_muscles || [],
      enabled: true,
    }]);
    setShowLibraryPicker(false);
  };

  const addManual = () => {
    const id = `manual-${Date.now()}`;
    setNewExId(id);
    setExercises(p => [...p, {
      id,
      library_exercise_id: null,
      name: "",
      standardName: "",
      sets: null,
      reps: null,
      primary: [],
      secondary: [],
      enabled: true,
    }]);
    setShowLibraryPicker(false);
  };

  const saveToTemplate = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const enabled = exercises.filter(e => e.enabled && e.name);
      if (templateName !== template.name) {
        await updateTemplateName(template.id, templateName);
      }
      await replaceTemplateExercises(template.id, enabled);
      setSaved(true);
      if (mode === "edit") {
        setTimeout(onBack, 800);
      }
    } catch (e) {
      logDevError("TemplateSessionEditor/save", e);
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUseSession = async () => {
    const enabled = exercises.filter(e => e.enabled && e.name);
    // Fire-and-forget: update used_at so template rises to top on next open
    touchTemplate(template.id).catch(console.warn);
    onUseTemplate(enabled);
  };

  const canProceed = exercises.some(e => e.enabled && e.name);

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <BackButton onClick={onBack} />
        <PageTitle>{mode === "edit" ? "Rediger mal" : "Bruk mal"}</PageTitle>

        {/* Editable template name */}
        <div style={{ marginBottom: 20 }}>
          {editingTitle ? (
            <input
              autoFocus
              id="template-name"
              name="template-name"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: "2px solid var(--cds-interactive)",
                color: "var(--cds-text-primary)",
                fontFamily: "var(--cds-font-sans)",
                fontSize: 18,
                fontWeight: 600,
                padding: "2px 0",
                outline: "none",
                width: "100%",
              }}
            />
          ) : (
            <span
              onClick={() => setEditingTitle(true)}
              style={{ cursor: "text", fontSize: 18, fontWeight: 600, color: "var(--cds-text-primary)" }}
              title="Klikk for å endre navn"
            >
              {templateName}
            </span>
          )}
        </div>

        {/* ─── rest of TemplateSessionEditor content ─── */}
        <div>

          {/* Live body map */}
          <BodyPanel
            primary={muscles.primary}
            secondary={muscles.secondary}
            muscleMap={muscleMap}
          />

          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <Tag type="green" size="sm">Primær ({muscles.primary.length})</Tag>
            <Tag type="blue" size="sm">Sekundær ({muscles.secondary.length})</Tag>
          </div>

          {/* Exercise list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {exercises.map(ex => (
              <ExerciseRowWithAutocomplete
                key={ex.id}
                exercise={ex}
                autoFocusName={ex.id === newExId}
                isNew={ex.id === newExId}
                libraryExercises={libraryExercises}
                onChange={(updates) => setExercises(p => p.map(e => e.id === ex.id ? { ...e, ...updates } : e))}
                onDelete={() => setExercises(p => p.filter(e => e.id !== ex.id))}
              />
            ))}
          </div>

          {/* Add exercise controls */}
          {showLibraryPicker ? (
            <LibraryPicker
              libraryExercises={libraryExercises}
              onAdd={addFromLibrary}
              onClose={() => setShowLibraryPicker(false)}
            />
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <Button kind="ghost" renderIcon={Add} size="sm"
                onClick={() => setShowLibraryPicker(true)}
                style={{ flex: 1 }}>
                Fra biblioteket
              </Button>
              <Button kind="ghost" renderIcon={Add} size="sm"
                onClick={addManual}
                style={{ flex: 1 }}>
                Manuelt
              </Button>
            </div>
          )}

          {saveError && (
            <InlineNotification kind="error" title="Feil:" subtitle={saveError} hideCloseButton
              style={{ marginBottom: 12 }} />
          )}

          {/* Action bar */}
          <div style={{ borderTop: "1px solid var(--cds-border-subtle-01)", paddingTop: 16 }}>
            {mode === "use" && (
              <>
                <button
                  onClick={saveToTemplate}
                  disabled={saving}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cds-link-primary)",
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "0 0 14px 0",
                    display: "block",
                    textDecoration: "underline",
                    fontFamily: "var(--cds-font-sans)",
                  }}
                >
                  {saving ? "Lagrer…" : saved ? "Lagret" : "Lagre endringer i malen"}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button kind="secondary" renderIcon={ArrowLeft} onClick={onBack}>
                    Tilbake
                  </Button>
                  <Button kind="primary" renderIcon={ArrowRight} onClick={handleUseSession}
                    disabled={!canProceed} style={{ flex: 1 }}>
                    Bruk økt
                  </Button>
                </div>
              </>
            )}

            {mode === "edit" && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="secondary" renderIcon={ArrowLeft} onClick={onBack}>
                  Tilbake
                </Button>
                <Button kind="primary" renderIcon={Save} onClick={saveToTemplate}
                  disabled={saving || !canProceed} style={{ flex: 1 }}>
                  {saving ? "Lagrer…" : "Lagre mal"}
                </Button>
              </div>
            )}
          </div>

        </div>

      </div>
    </PageShell>
  );
}

import { useState, useEffect, useMemo } from "react";
import {
  Button, Tag, InlineNotification, TextInput,
} from "@carbon/react";
import { Add, ArrowLeft, ArrowRight, Save, Edit } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, BackButton } from "./PageShell";
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
  const { t } = useTranslation();
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
    try {
      const enabled = exercises.filter(e => e.enabled && e.name);
      if (templateName !== template.name) {
        await updateTemplateName(template.id, templateName);
      }
      await replaceTemplateExercises(template.id, enabled);
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

        <div style={{ background: "var(--cds-layer-02)", borderTop: "2px solid var(--accent)", padding: 16, marginBottom: 8 }}>
          <SectionLabel renderIcon={Edit} style={{ margin: "0 0 16px -16px" }}>
            {mode === "edit" ? t("templateEditor.titleEdit") : t("templateEditor.titleUse")}
          </SectionLabel>

          {mode === "use" && (
            <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "0.06em", marginBottom: 16 }}>
              {t("templateEditor.stepIndicator")}
            </p>
          )}

          {/* Editable template name */}
          <div style={{ marginBottom: 20 }}>
            {editingTitle ? (
              <TextInput
                id="template-name"
                labelText={t("templateEditor.nameLabel")}
                autoFocus
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
              />
            ) : (
              <span
                onClick={() => setEditingTitle(true)}
                style={{ cursor: "text", fontSize: 18, fontWeight: 600, color: "var(--cds-text-primary)" }}
                title={t("templateEditor.clickToRename")}
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
            <Tag type="green" size="sm">{t("templateEditor.primaryCount", { count: muscles.primary.length })}</Tag>
            <Tag type="blue" size="sm">{t("templateEditor.secondaryCount", { count: muscles.secondary.length })}</Tag>
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
                {t("templateEditor.fromLibrary")}
              </Button>
              <Button kind="ghost" renderIcon={Add} size="sm"
                onClick={addManual}
                style={{ flex: 1 }}>
                {t("templateEditor.manual")}
              </Button>
            </div>
          )}

          {saveError && (
            <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={saveError} hideCloseButton
              style={{ marginBottom: 12 }} />
          )}

          {/* Action bar */}
          <div style={{ borderTop: "1px solid var(--cds-border-subtle-01)", paddingTop: 16 }}>
            {mode === "use" && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>
                  {t("common.cancel")}
                </Button>
                <Button kind="primary" renderIcon={ArrowRight} onClick={handleUseSession}
                  disabled={!canProceed} style={{ flex: 1 }}>
                  {t("templateEditor.useSession")}
                </Button>
              </div>
            )}

            {mode === "edit" && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="ghost" renderIcon={ArrowLeft} onClick={onBack}>
                  {t("common.cancel")}
                </Button>
                <Button kind="primary" renderIcon={Save} onClick={saveToTemplate}
                  disabled={saving || !canProceed} style={{ flex: 1 }}>
                  {saving ? t("common.saving") : t("templateEditor.saveTemplate")}
                </Button>
              </div>
            )}
          </div>

        </div>
        </div>

      </div>
    </PageShell>
  );
}

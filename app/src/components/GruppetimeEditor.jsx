import { useState, useEffect, useMemo } from "react";
import { Button, InlineNotification, TextInput } from "@carbon/react";
import { Add, ArrowUp, ArrowDown, Save } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, BackButton } from "./PageShell";
import BodyPanel from "./BodyPanel";
import ExerciseRowWithAutocomplete from "./ExerciseRowWithAutocomplete";
import ExFlyt from "./ExFlyt";
import { MUSCLES } from "../lib/bodymap.jsx";
import { buildMuscleMapFromExercises, logDevError, getIntlLocale } from "../lib/utils";
import { fetchLibraryExercises, replaceTemplateExercises, updateTemplateDetails, touchTemplate } from "../lib/db";


function templateExToEditorShape(te) {
  return {
    id: te.id,
    library_exercise_id: te.library_exercise_id || null,
    name: te.name,
    standardName: te.name,
    primary: te.primary_muscles || [],
    secondary: te.secondary_muscles || [],
    enabled: true,
  };
}

export default function GruppetimeEditor({ template, onBack }) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState(() =>
    (template.session_template_exercises || []).map(templateExToEditorShape)
  );
  const [name, setName] = useState(template.name);
  const [editingName, setEditingName] = useState(false);
  const [libraryExercises, setLibraryExercises] = useState([]);
  const [showExFlyt, setShowExFlyt] = useState(false);
  const [newExId, setNewExId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetchLibraryExercises().then(setLibraryExercises).catch(() => {});
  }, []);

  const muscleMap = useMemo(
    () => buildMuscleMapFromExercises(exercises.filter(e => e.enabled && e.name)),
    [exercises]
  );

  // buildMuscleMapFromExercises returns { [muscleId]: string[] } — derive primary/secondary arrays separately
  const { coveredPrimary, coveredSecondary } = useMemo(() => {
    const pSet = new Set();
    const sSet = new Set();
    exercises.filter(e => e.enabled && e.name).forEach(ex => {
      (ex.primary || []).forEach(id => pSet.add(id));
      (ex.secondary || []).forEach(id => { if (!pSet.has(id)) sSet.add(id); });
    });
    return { coveredPrimary: [...pSet], coveredSecondary: [...sSet] };
  }, [exercises]);

  const gapIds = useMemo(() => {
    const trained = new Set([...coveredPrimary, ...coveredSecondary]);
    return Object.keys(MUSCLES).filter(id => !trained.has(id));
  }, [coveredPrimary, coveredSecondary]);

  function moveUp(idx) {
    if (idx === 0) return;
    setExercises(p => {
      const next = [...p];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx) {
    setExercises(p => {
      if (idx === p.length - 1) return p;
      const next = [...p];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function addManual() {
    const id = `manual-${Date.now()}`;
    setNewExId(id);
    setExercises(p => [...p, {
      id,
      library_exercise_id: null,
      name: "", standardName: "",
      primary: [], secondary: [],
      enabled: true,
    }]);
    setShowExFlyt(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const enabled = exercises.filter(e => e.enabled && e.name);
      await updateTemplateDetails(template.id, { name });
      await replaceTemplateExercises(template.id, enabled);
      touchTemplate(template.id).catch(() => {});
      onBack();
    } catch (e) {
      logDevError("GruppetimeEditor/save", e);
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const creatorName = template.profiles?.display_name;
  const usedAt = template.used_at
    ? new Intl.DateTimeFormat(getIntlLocale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(template.used_at))
    : null;

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <SectionLabel>{t("nav.library")}</SectionLabel>
        <div style={{ padding: "0 16px" }}>
          <BackButton onClick={onBack} />

          {/* Name + type container */}
          <div style={{
            background: "var(--cds-layer-02)",
            borderTop: "2px solid var(--accent)",
            padding: 16,
            marginBottom: 16,
          }}>
            {/* Editable name */}
            <div style={{ marginBottom: 16 }}>
              {editingName ? (
                <TextInput
                  id="tpl-name"
                  labelText={t("templateEditor.nameLabel")}
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                />
              ) : (
                <span
                  onClick={() => setEditingName(true)}
                  title={t("templateEditor.clickToRename")}
                  style={{ cursor: "text", fontFamily: "var(--cond)", fontSize: 20, fontWeight: 700, color: "var(--cds-text-primary)" }}
                >
                  {name}
                </span>
              )}
            </div>

          </div>

          {/* Live muscle coverage */}
          <BodyPanel
            primary={coveredPrimary}
            secondary={coveredSecondary}
            muscleMap={muscleMap}
            marginBottom={8}
          />

          {/* Gap hints */}
          {gapIds.length === 0 ? (
            <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-support-success)", letterSpacing: "0.06em", marginBottom: 16 }}>
              {t("gruppetimerEditor.allTrained")}
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "0.06em", marginRight: 4 }}>
                {t("gruppetimerEditor.gapHints")}
              </span>
              {gapIds.map(id => (
                <span key={id} style={{
                  display: "inline-block",
                  borderRadius: "var(--r-pill)",
                  padding: "2px 8px",
                  background: "var(--cds-layer-02)",
                  border: "1px solid var(--cds-border-subtle-01)",
                  color: "var(--cds-text-secondary)",
                  fontFamily: "var(--cds-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                }}>
                  {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                </span>
              ))}
            </div>
          )}

          {/* Exercise list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {exercises.map((ex, idx) => (
              <div key={ex.id} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                {/* Reorder buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    aria-label="Flytt opp"
                    style={{
                      background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer",
                      color: idx === 0 ? "var(--cds-border-subtle-01)" : "var(--cds-text-secondary)",
                      padding: 2, display: "flex",
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === exercises.length - 1}
                    aria-label="Flytt ned"
                    style={{
                      background: "none", border: "none", cursor: idx === exercises.length - 1 ? "default" : "pointer",
                      color: idx === exercises.length - 1 ? "var(--cds-border-subtle-01)" : "var(--cds-text-secondary)",
                      padding: 2, display: "flex",
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ExerciseRowWithAutocomplete
                    exercise={ex}
                    autoFocusName={ex.id === newExId}
                    isNew={ex.id === newExId}
                    libraryExercises={libraryExercises}
                    onChange={updates => setExercises(p => p.map(e => e.id === ex.id ? { ...e, ...updates } : e))}
                    onDelete={() => setExercises(p => p.filter(e => e.id !== ex.id))}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add controls */}
          {!showExFlyt && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { label: t("gruppetimerEditor.addFromLibrary"), onClick: () => setShowExFlyt(true) },
                { label: t("gruppetimerEditor.addManual"), onClick: addManual },
              ].map(({ label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  style={{
                    flex: 1,
                    background: "var(--cds-layer-01)",
                    border: "1px solid var(--cds-border-subtle-01)",
                    borderInlineStart: "3px solid var(--exercise)",
                    borderRadius: "0 var(--r-card) var(--r-card) 0",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "var(--exercise-soft)",
                    border: "1px solid var(--exercise)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Add size={14} style={{ color: "var(--exercise)" }} />
                  </div>
                  <span style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 700, color: "var(--cds-text-primary)", flex: 1, minWidth: 0 }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {saveError && (
            <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={saveError} hideCloseButton style={{ marginBottom: 12 }} />
          )}

          {/* Save */}
          <div style={{ borderTop: "1px solid var(--cds-border-subtle-01)", paddingTop: 16, marginBottom: 16 }}>
            <Button kind="primary" renderIcon={Save} onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? t("common.saving") : t("gruppetimerEditor.save")}
            </Button>
          </div>

          {/* Footer metadata */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {creatorName && (
              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "0.06em" }}>
                {t("gruppetimerEditor.createdBy", { name: creatorName })}
              </span>
            )}
            <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "0.06em" }}>
              {usedAt ? t("gruppetimerEditor.lastUsed", { date: usedAt }) : t("gruppetimerEditor.neverUsed")}
            </span>
          </div>
        </div>
      </div>

      {showExFlyt && (
        <ExFlyt
          libraryExercises={libraryExercises}
          onAdd={ex => { setExercises(p => [...p, ex]); setShowExFlyt(false); }}
          onClose={() => setShowExFlyt(false)}
        />
      )}
    </PageShell>
  );
}

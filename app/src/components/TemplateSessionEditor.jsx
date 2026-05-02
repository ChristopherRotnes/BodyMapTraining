import React, { useState, useEffect, useMemo } from "react";
import {
  Button, Tag, InlineNotification, InlineLoading, TextInput,
} from "@carbon/react";
import { Add, ArrowRight, Save } from "@carbon/icons-react";
import PageShell, { PageTitle, BackButton } from "./PageShell";
import { fetchLibraryExercises, replaceTemplateExercises, touchTemplate, updateTemplateName } from "../lib/db";
import { calcMuscles, BodySVG, useIsMobile } from "../lib/bodymap.jsx";
import { buildMuscleMapFromExercises } from "../lib/utils";
import ExerciseRow from "./ExerciseRow";


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

// Searchable picker that shows library exercises and lets user add one to the list
function LibraryPicker({ libraryExercises, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? libraryExercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : libraryExercises;

  return (
    <div style={{
      background: "var(--cds-layer-02)",
      border: "1px solid var(--cds-border-strong-01)",
      padding: 16,
      marginTop: 8,
    }}>
      <TextInput
        id="library-picker-search"
        labelText="Søk i øvelsesbiblioteket"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Skriv for å filtrere…"
        style={{ marginBottom: 8 }}
        autoFocus
      />
      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", padding: "8px 0" }}>Ingen treff.</p>
        ) : (
          filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => onAdd(ex)}
              style={{
                background: "var(--cds-layer-01)",
                border: "1px solid var(--cds-border-subtle-01)",
                padding: "8px 12px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--cds-layer-hover-01)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--cds-layer-01)"}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--cds-text-primary)" }}>{ex.name}</span>
              {(ex.default_sets || ex.default_reps) && (
                <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                  {ex.default_sets || "–"}×{ex.default_reps || "–"}
                </span>
              )}
            </button>
          ))
        )}
      </div>
      <Button kind="secondary" size="sm" onClick={onClose}>Lukk</Button>
    </div>
  );
}

// Props:
//   template          — the full template object (with session_template_exercises)
//   mode              — "use" | "edit"
//                         "use"  → "Bruk økt" button calls onUseTemplate(exercises)
//                         "edit" → "Lagre mal" button saves to DB and calls onBack
//   onBack            — navigate back
//   onUseTemplate(exercises) — called in "use" mode when trainer clicks "Bruk økt"
export default function TemplateSessionEditor({ template, mode, onBack, onUseTemplate, onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek, currentView }) {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("front");

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
    fetchLibraryExercises().then(setLibraryExercises).catch(() => {});
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
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUseSession = async () => {
    const enabled = exercises.filter(e => e.enabled && e.name);
    // Fire-and-forget: update used_at so template rises to top on next open
    touchTemplate(template.id).catch(() => {});
    onUseTemplate(enabled);
  };

  const canProceed = exercises.some(e => e.enabled && e.name);

  return (
    <PageShell
      onShowHome={onShowHome}
      onShowLogger={onShowLogger}
      onShowHistory={onShowHistory}
      onShowReport={onShowReport}
      onShowBibliotek={onShowBibliotek}
      currentView={currentView}
    >
      <div style={{ paddingBottom: 32 }}>
        <BackButton onClick={onBack} />
        <PageTitle>{mode === "edit" ? "Rediger mal" : "Bruk mal"}</PageTitle>

        {/* Editable template name */}
        <div style={{ marginBottom: 20 }}>
          {editingTitle ? (
            <input
              autoFocus
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
          {isMobile ? (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {["front", "back"].map(v => (
                  <Button key={v} kind={mobileView === v ? "primary" : "ghost"} size="sm"
                    onClick={() => setMobileView(v)}>
                    {v === "front" ? "Forside" : "Bakside"}
                  </Button>
                ))}
              </div>
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "8px 4px", marginBottom: 16 }}>
                <BodySVG view={mobileView} primary={muscles.primary} secondary={muscles.secondary} muscleMap={muscleMap} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["front", "back"].map(v => (
                <div key={v} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "8px 4px" }}>
                  <BodySVG view={v} primary={muscles.primary} secondary={muscles.secondary} muscleMap={muscleMap} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <Tag type="green" size="sm">Primær ({muscles.primary.length})</Tag>
            <Tag type="blue" size="sm">Sekundær ({muscles.secondary.length})</Tag>
          </div>

          {/* Exercise list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {exercises.map(ex => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                autoFocusName={ex.id === newExId}
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

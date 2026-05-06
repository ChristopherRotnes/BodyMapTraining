import { useState, useRef, useEffect } from "react";
import { InlineLoading } from "@carbon/react";
import { useTranslation } from "react-i18next";
import ExerciseRow from "./ExerciseRow";
import { inferMusclesFromName } from "../lib/utils";

export default function ExerciseRowWithAutocomplete({
  exercise,
  onChange,
  onDelete,
  layer,
  validateNumbers,
  autoFocusName,
  libraryExercises,
  isNew,
}) {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inferStatus, setInferStatus] = useState(null); // null | "active" | "finished"
  const [aiInferred, setAiInferred] = useState(false);
  const containerRef = useRef();
  const blurTimer = useRef(null);
  const finishTimer = useRef(null);

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (finishTimer.current) clearTimeout(finishTimer.current);
  }, []);

  const filtered =
    isNew && showSuggestions && exercise.name?.trim()
      ? libraryExercises
          .filter((lib) =>
            lib.name.toLowerCase().includes(exercise.name.toLowerCase())
          )
          .slice(0, 8)
      : [];

  const handleChange = (updates) => {
    if ("name" in updates) {
      setShowSuggestions(true);
      if (aiInferred) setAiInferred(false);
    }
    onChange(updates);
  };

  const handleSelect = (lib) => {
    setAiInferred(false);
    onChange({
      name: lib.name,
      standardName: lib.name,
      sets: lib.default_sets ? String(lib.default_sets) : null,
      reps: lib.default_reps ? String(lib.default_reps) : null,
      primary: lib.primary_muscles || [],
      secondary: lib.secondary_muscles || [],
    });
    setShowSuggestions(false);
  };

  const handleNameBlur = async () => {
    if (!isNew) return;
    if (exercise.primary?.length || exercise.secondary?.length) return;
    if (aiInferred || inferStatus) return;

    setInferStatus("active");
    const result = await inferMusclesFromName(exercise.name);
    if (result) {
      onChange({ primary: result.primary, secondary: result.secondary });
      setInferStatus("finished");
      finishTimer.current = setTimeout(() => {
        setInferStatus(null);
        setAiInferred(true);
      }, 1200);
    } else {
      setInferStatus(null);
    }
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => {
      if (
        containerRef.current &&
        !containerRef.current.contains(document.activeElement)
      ) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }} onBlur={handleBlur}>
      <ExerciseRow
        exercise={exercise}
        onChange={handleChange}
        onDelete={onDelete}
        layer={layer}
        validateNumbers={validateNumbers}
        autoFocusName={autoFocusName}
        onNameBlur={handleNameBlur}
      />
      {filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "var(--cds-layer-01)",
            border: "1px solid var(--cds-border-strong-01)",
            borderTop: "none",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {filtered.map((lib) => (
            <button
              key={lib.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(lib)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--cds-border-subtle-01)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13, fontFamily: "var(--cds-font-sans)", color: "var(--cds-text-primary)" }}>
                {lib.name}
              </span>
              {(lib.default_sets || lib.default_reps) && (
                <span style={{ fontSize: 11, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)" }}>
                  {[lib.default_sets && `${lib.default_sets}×`, lib.default_reps].filter(Boolean).join("")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {inferStatus === "active" && (
        <div style={{ padding: "4px 12px" }}>
          <InlineLoading description={t("exercise.inferring")} status="active" />
        </div>
      )}
      {inferStatus === "finished" && (
        <div style={{ padding: "4px 12px" }}>
          <InlineLoading description={t("exercise.musclesAI")} status="finished" />
        </div>
      )}
      {!inferStatus && aiInferred && (
        <div style={{ padding: "2px 12px 6px", fontSize: 11, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)" }}>
          {t("exercise.musclesAI")}
        </div>
      )}
    </div>
  );
}

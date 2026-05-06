import { useState, useRef, useEffect } from "react";
import ExerciseRow from "./ExerciseRow";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef();
  const blurTimer = useRef(null);

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  const filtered =
    isNew && showSuggestions && exercise.name?.trim()
      ? libraryExercises
          .filter((lib) =>
            lib.name.toLowerCase().includes(exercise.name.toLowerCase())
          )
          .slice(0, 8)
      : [];

  const handleChange = (updates) => {
    if ("name" in updates) setShowSuggestions(true);
    onChange(updates);
  };

  const handleSelect = (lib) => {
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
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "var(--cds-font-sans)",
                  color: "var(--cds-text-primary)",
                }}
              >
                {lib.name}
              </span>
              {(lib.default_sets || lib.default_reps) && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--cds-font-mono)",
                    color: "var(--cds-text-secondary)",
                  }}
                >
                  {[
                    lib.default_sets && `${lib.default_sets}×`,
                    lib.default_reps,
                  ]
                    .filter(Boolean)
                    .join("")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

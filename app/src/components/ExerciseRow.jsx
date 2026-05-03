import { useState } from "react";
import { Checkbox, Button } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { isInvalidNum } from "../lib/utils";

export default function ExerciseRow({
  exercise,
  onChange,
  onDelete,
  layer = "layer-01",
  validateNumbers = false,
  autoFocusName = false,
}) {
  const [editingName, setEditingName] = useState(autoFocusName);

  const bg = layer === "layer-02" ? "var(--cds-layer-02)" : "var(--cds-layer-01)";

  const nameInvalid = validateNumbers && exercise.enabled && !exercise.name?.trim();

  return (
    <div
      style={{
        background: exercise.enabled ? bg : "transparent",
        border: "1px solid var(--cds-border-subtle-01)",
        padding: "6px 8px 6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: exercise.enabled ? 1 : 0.4,
        transition: "opacity 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Checkbox
          id={`ex-row-${exercise.id}`}
          labelText=""
          hideLabel
          checked={exercise.enabled}
          onChange={() => onChange({ enabled: !exercise.enabled })}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editingName ? (
          <input
            autoFocus
            aria-label="Øvelsenavn"
            value={exercise.name}
            onChange={(e) => onChange({ name: e.target.value, standardName: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${nameInvalid ? "var(--cds-support-error)" : "var(--cds-interactive)"}`,
              color: "var(--cds-text-primary)",
              fontFamily: "var(--cds-font-sans)",
              fontSize: 14,
              padding: "2px 0",
              outline: "none",
            }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            style={{ fontSize: 14, fontWeight: 500, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--cds-text-primary)" }}
          >
            {exercise.name?.trim() ? (
              exercise.name
            ) : nameInvalid ? (
              <span style={{ color: "var(--cds-support-error)" }}>Påkrevd</span>
            ) : (
              <span style={{ color: "var(--cds-text-secondary)" }}>Klikk for å skrive øvelse…</span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {["sets", "reps"].map(field => {
          const isFieldInvalid = validateNumbers && isInvalidNum(exercise[field]);
          const errorId = `err-${exercise.id}-${field}`;
          return (
            <div key={field} style={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
              <input
                type="number"
                min="1"
                max="99"
                placeholder="–"
                aria-label={field === "sets" ? `Sett for ${exercise.name || "øvelse"}` : `Reps for ${exercise.name || "øvelse"}`}
                aria-invalid={isFieldInvalid || undefined}
                aria-describedby={isFieldInvalid ? errorId : undefined}
                value={exercise[field] || ""}
                onChange={e => onChange({ [field]: e.target.value })}
                style={{
                  width: 40,
                  height: 28,
                  padding: "0 4px",
                  background: "var(--cds-field-01)",
                  border: `1px solid ${isFieldInvalid ? "var(--cds-support-error)" : "var(--cds-border-strong-01)"}`,
                  color: isFieldInvalid ? "var(--cds-support-error)" : "var(--cds-text-primary)",
                  fontFamily: "var(--cds-font-sans)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                {field === "sets" ? "sett" : "reps"}
              </span>
              {isFieldInvalid && (
                <span
                  id={errorId}
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
                >
                  Ugyldig antall – skriv inn 1 til 99
                </span>
              )}
            </div>
          );
        })}
      </div>

      <Button
        kind="ghost"
        hasIconOnly
        renderIcon={TrashCan}
        iconDescription="Slett øvelse"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      />
    </div>
  );
}

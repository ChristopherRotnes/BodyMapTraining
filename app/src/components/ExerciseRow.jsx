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
      onClick={() => onChange({ enabled: !exercise.enabled })}
      style={{
        background: exercise.enabled ? bg : "transparent",
        border: "1px solid var(--cds-border-subtle-01)",
        padding: "6px 8px 6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: exercise.enabled ? 1 : 0.4,
        transition: "opacity 0.15s",
        cursor: "pointer",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Checkbox
          id={`ex-row-${exercise.id}`}
          labelText=""
          hideLabel
          checked={exercise.enabled}
          onChange={() => onChange({ enabled: !exercise.enabled })}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
        {editingName ? (
          <input
            autoFocus
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

      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {["sets", "reps"].map(field => (
          <div key={field} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <input
              type="number"
              min="1"
              max="99"
              placeholder="–"
              value={exercise[field] || ""}
              onChange={e => onChange({ [field]: e.target.value })}
              style={{
                width: 40,
                height: 28,
                padding: "0 4px",
                background: "var(--cds-field-01)",
                border: `1px solid ${validateNumbers && isInvalidNum(exercise[field]) ? "var(--cds-support-error)" : "var(--cds-border-strong-01)"}`,
                color: validateNumbers && isInvalidNum(exercise[field]) ? "var(--cds-support-error)" : "var(--cds-text-primary)",
                fontFamily: "var(--cds-font-sans)",
                fontSize: 12,
                outline: "none",
                textAlign: "center",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
              {field === "sets" ? "sett" : "reps"}
            </span>
          </div>
        ))}
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

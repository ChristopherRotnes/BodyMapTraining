import { useState } from "react";
import { Checkbox, Button } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";

export default function ExerciseRow({
  exercise,
  onChange,
  onDelete,
  layer = "layer-01",
  validateNumbers = false,
  autoFocusName = false,
  onNameBlur,
}) {
  const { t } = useTranslation();
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
            id={`ex-name-${exercise.id}`}
            name={`ex-name-${exercise.id}`}
            aria-label={t("exerciseRow.nameAriaLabel")}
            value={exercise.name}
            onChange={(e) => onChange({ name: e.target.value, standardName: e.target.value })}
            onBlur={() => { setEditingName(false); onNameBlur?.(); }}
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
              <span style={{ color: "var(--cds-support-error)" }}>{t("exerciseRow.nameRequired")}</span>
            ) : (
              <span style={{ color: "var(--cds-text-secondary)" }}>{t("exerciseRow.namePlaceholder")}</span>
            )}
          </div>
        )}
      </div>

      <Button
        kind="ghost"
        hasIconOnly
        renderIcon={TrashCan}
        iconDescription={t("exerciseRow.deleteExercise")}
        size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      />
    </div>
  );
}

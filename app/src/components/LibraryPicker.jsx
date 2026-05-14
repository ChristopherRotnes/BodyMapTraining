import { useState } from "react";
import { Button, TextInput } from "@carbon/react";
import { useTranslation } from "react-i18next";

// Searchable picker that shows library exercises and lets the user add one to a list.
// Props:
//   libraryExercises — array of exercise_library rows
//   onAdd(exercise)  — called when user clicks an exercise
//   onClose()        — called when user dismisses the picker
export default function LibraryPicker({ libraryExercises, onAdd, onClose }) {
  const { t } = useTranslation();
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
        labelText={t("libraryPicker.searchLabel")}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t("libraryPicker.searchPlaceholder")}
        style={{ marginBottom: 8 }}
        autoFocus
      />
      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", padding: "8px 0" }}>{t("libraryPicker.noResults")}</p>
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
            </button>
          ))
        )}
      </div>
      <Button kind="secondary" size="sm" onClick={onClose}>{t("libraryPicker.close")}</Button>
    </div>
  );
}

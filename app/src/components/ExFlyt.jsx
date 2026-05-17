import { useState, useMemo } from "react";
import { Button } from "@carbon/react";
import { Add, Close, Search } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { MUSCLES } from "../lib/bodymap";
import { AccentChip } from "./PageShell";

export default function ExFlyt({ libraryExercises, onAdd, onClose }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [quickName, setQuickName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? libraryExercises.filter(e => e.name.toLowerCase().includes(q)) : libraryExercises;
  }, [libraryExercises, query]);

  function handleQuickAdd() {
    const name = quickName.trim();
    if (!name) return;
    onAdd({
      id: `quick-${Date.now()}`,
      library_exercise_id: null,
      name,
      standardName: name,
      primary: [],
      secondary: [],
      enabled: true,
    });
    setQuickName("");
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 200,
      background: "var(--cds-overlay)",
      display: "flex",
      alignItems: "flex-end",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--cds-background)",
        borderTop: "2px solid var(--accent)",
        width: "100%",
        maxWidth: 640,
        margin: "0 auto",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--r-card) var(--r-card) 0 0",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--cds-border-subtle-01)", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted-wl)", pointerEvents: "none" }} />
            <input
              autoFocus
              type="search"
              placeholder={t("gruppetimerEditor.exFlytSearch")}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "8px 12px 8px 34px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle-wl)",
                borderRadius: 8,
                color: "var(--cds-text-primary)",
                fontFamily: "var(--cds-font-sans)", fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cds-text-secondary)", padding: 4, display: "flex" }}
          >
            <Close size={20} />
          </button>
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {libraryExercises.length === 0 ? (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14, padding: "12px 16px" }}>
              {t("gruppetimerEditor.exFlytEmpty")}
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14, padding: "12px 16px" }}>
              {t("gruppetimerEditor.exFlytNoResults")}
            </p>
          ) : (
            filtered.map(ex => (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  gap: 8,
                  borderBottom: "1px solid var(--cds-border-subtle-01)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--cond)", fontSize: 14, fontWeight: 700, color: "var(--cds-text-primary)", margin: "0 0 4px" }}>
                    {ex.name}
                  </p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(ex.primary_muscles || []).slice(0, 3).map(id => (
                      <AccentChip key={id} style={{ fontSize: 10, padding: "2px 7px" }}>
                        {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                      </AccentChip>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onAdd({
                    id: `lib-${ex.id}-${Date.now()}`,
                    library_exercise_id: ex.id,
                    name: ex.name,
                    standardName: ex.name,
                    primary: ex.primary_muscles || [],
                    secondary: ex.secondary_muscles || [],
                    enabled: true,
                  })}
                  aria-label={`${t("gruppetimerEditor.exFlytAdd")} ${ex.name}`}
                  style={{
                    background: "var(--accent-bg-14)",
                    border: "1px solid var(--accent-bg-30)",
                    borderRadius: "var(--r-pill)",
                    color: "var(--accent)",
                    cursor: "pointer",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Add size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick-add footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--cds-border-subtle-01)", display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder={t("gruppetimerEditor.exFlytQuickPlaceholder")}
            value={quickName}
            onChange={e => setQuickName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuickAdd()}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle-wl)",
              borderRadius: 8,
              color: "var(--cds-text-primary)",
              fontFamily: "var(--cds-font-sans)", fontSize: 14,
              outline: "none",
            }}
          />
          <Button kind="primary" size="sm" renderIcon={Add} onClick={handleQuickAdd} disabled={!quickName.trim()}>
            {t("gruppetimerEditor.exFlytAdd")}
          </Button>
        </div>
      </div>
    </div>
  );
}

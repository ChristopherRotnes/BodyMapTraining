import { useState, useEffect, useMemo } from "react";
import { InlineLoading, InlineNotification } from "@carbon/react";
import { Add, Search, ChevronRight } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, BackButton } from "./PageShell";
import ExerciseForm from "./ExerciseForm";
import { MUSCLES } from "../lib/bodymap";
import { fetchLibraryExercises, saveLibraryExercise, updateLibraryExercise, fetchExerciseTemplateCounts } from "../lib/db";
import { logDevError } from "../lib/utils";
import { useDebouncedSearch } from "../lib/hooks";

const REGION_MUSCLES = {
  overkropp:  new Set(["chest", "shoulders_front", "shoulders_side", "biceps", "forearms", "traps", "rear_delts", "lats", "triceps"]),
  kjerne:     new Set(["abs", "obliques", "lower_back"]),
  underkropp: new Set(["quads", "hamstrings", "glutes", "calves", "calves_back"]),
};

function matchesRegion(ex, region) {
  if (region === "alle") return true;
  if (region === "kondisjon") return (ex.primary_muscles || []).length === 0 && (ex.secondary_muscles || []).length === 0;
  const set = REGION_MUSCLES[region];
  return [...(ex.primary_muscles || []), ...(ex.secondary_muscles || [])].some(m => set.has(m));
}

export default function OvelsePicker({ onBack }) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState([]);
  const [templateCounts, setTemplateCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [region, setRegion] = useState("alle");
  const [showNew, setShowNew] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchLibraryExercises(), fetchExerciseTemplateCounts()])
      .then(([exs, counts]) => { setExercises(exs); setTemplateCounts(counts); })
      .catch(e => { logDevError("OvelsePicker/fetch", e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  const regionCounts = useMemo(() => {
    const c = { alle: exercises.length };
    ["overkropp", "kjerne", "underkropp", "kondisjon"].forEach(r => {
      c[r] = exercises.filter(e => matchesRegion(e, r)).length;
    });
    return c;
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return exercises
      .filter(ex => matchesRegion(ex, region))
      .filter(ex => !q || ex.name.toLowerCase().includes(q));
  }, [exercises, debouncedSearch, region]);

  async function handleSaveNew(fields) {
    setSaving(true);
    try {
      const saved = await saveLibraryExercise(fields);
      setExercises(p => [...p, saved].sort((a, b) => a.name.localeCompare(b.name, "no")));
      setShowNew(false);
    } catch (e) {
      logDevError("OvelsePicker/save", e);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id, fields) {
    setSaving(true);
    try {
      const updated = await updateLibraryExercise(id, fields);
      setExercises(p => p.map(e => e.id === id ? updated : e).sort((a, b) => a.name.localeCompare(b.name, "no")));
      setEditingEx(null);
    } catch (e) {
      logDevError("OvelsePicker/update", e);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const regions = [
    { key: "alle",       label: t("settSammen.regionAll") },
    { key: "overkropp",  label: t("settSammen.regionUpper") },
    { key: "kjerne",     label: t("settSammen.regionCore") },
    { key: "underkropp", label: t("settSammen.regionLower") },
    { key: "kondisjon",  label: t("settSammen.regionCardio") },
  ];

  const activeRegionLabel = regions.find(r => r.key === region)?.label || "";

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <SectionLabel>{t("ovelsePicker.eyebrow")}</SectionLabel>
        <div style={{ padding: "0 16px" }}>
          <BackButton onClick={onBack} />

          {error && (
            <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={error} hideCloseButton style={{ marginBottom: 16 }} />
          )}

          {/* New exercise featured card */}
          {!showNew && !editingEx && (
            <button
              onClick={() => setShowNew(true)}
              style={{
                width: "100%",
                background: "var(--cds-layer-01)",
                border: "1px solid var(--cds-border-subtle-01)",
                borderInlineStart: "3px solid var(--exercise)",
                borderRadius: "0 var(--r-card) var(--r-card) 0",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 16,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--exercise-soft)",
                border: "1px solid var(--exercise)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Add size={18} style={{ color: "var(--exercise)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", margin: "0 0 2px" }}>
                  {t("settSammen.nyOvelse")}
                </p>
                <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--exercise)", margin: 0 }}>
                  {t("ovelsePicker.nyOvelseSubtitle")}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
            </button>
          )}

          {showNew && (
            <ExerciseForm
              onSave={handleSaveNew}
              onCancel={() => setShowNew(false)}
              saving={saving}
            />
          )}

          {/* Region filter chips with counts */}
          {!showNew && !editingEx && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {regions.filter(r => r.key === "alle" || loading || regionCounts[r.key] > 0).map(r => (
                <button
                  key={r.key}
                  onClick={() => setRegion(r.key)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "var(--r-pill)",
                    border: region === r.key ? "1px solid var(--accent)" : "1px solid var(--border-subtle-wl)",
                    background: region === r.key ? "var(--accent-bg-14)" : "transparent",
                    color: region === r.key ? "var(--accent-soft)" : "var(--text-muted-wl)",
                    fontFamily: "var(--cds-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                  }}
                >
                  {r.label}{regionCounts[r.key] > 0 ? ` ${regionCounts[r.key]}` : ""}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          {!loading && !showNew && !editingEx && exercises.length > 0 && (
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted-wl)", pointerEvents: "none" }} />
              <input
                type="search"
                placeholder={t("settSammen.searchOvelser")}
                value={search}
                onChange={e => setSearch(e.target.value)}
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
          )}

          {loading ? (
            <InlineLoading description={t("bibliotek.loadingExercises")} status="active" />
          ) : filtered.length === 0 && !showNew && !editingEx ? (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
              {search.trim() || region !== "alle" ? t("bibliotek.noSearchResults") : t("settSammen.ovelserEmpty")}
            </p>
          ) : !showNew && !editingEx && (
            <>
              {/* Count divider */}
              <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--cds-text-secondary)", margin: "4px 0 8px" }}>
                · {activeRegionLabel.toUpperCase()} · {filtered.length}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filtered.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => { setEditingEx(ex); setShowNew(false); }}
                    style={{
                      background: "var(--cds-layer-01)",
                      border: "1px solid var(--cds-border-subtle-01)",
                      borderInlineStart: "3px solid var(--exercise)",
                      borderRadius: "0 var(--r-card) var(--r-card) 0",
                      padding: "10px 12px 10px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", margin: "0 0 3px" }}>
                        {ex.name}
                      </p>
                      <ExerciseSubtitle ex={ex} count={templateCounts[ex.id] || 0} t={t} />
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Edit form — shown full-width when editing, hides the list */}
          {editingEx && (
            <>
              {(templateCounts[editingEx.id] || 0) > 0 && (
                <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--cds-text-secondary)", margin: "0 0 8px" }}>
                  {t("ovelsePicker.usedInGT", { count: templateCounts[editingEx.id] })}
                </p>
              )}
              <ExerciseForm
                initial={editingEx}
                onSave={fields => handleUpdate(editingEx.id, fields)}
                onCancel={() => setEditingEx(null)}
                saving={saving}
              />
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function ExerciseSubtitle({ ex, count, t }) {
  const muscles = (ex.primary_muscles || []).slice(0, 3).map(id =>
    t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })
  );
  const muscleText = muscles.join(", ");
  const countText = count > 0 ? t("ovelsePicker.usedInGT", { count }) : null;
  if (!muscleText && !countText) return null;
  return (
    <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--cds-text-secondary)", margin: 0 }}>
      {muscleText}
      {muscleText && countText && <span> · </span>}
      {countText && <span style={{ color: "var(--accent-soft)" }}>{countText}</span>}
    </p>
  );
}

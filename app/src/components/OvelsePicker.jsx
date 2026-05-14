import { useState, useEffect, useMemo } from "react";
import { Button, InlineLoading, InlineNotification } from "@carbon/react";
import { Add, Search } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, BackButton, AccentChip } from "./PageShell";
import ExerciseForm from "./ExerciseForm";
import OvelseDetail from "./OvelseDetail";
import { MUSCLES } from "../lib/bodymap.jsx";
import { fetchLibraryExercises, saveLibraryExercise, updateLibraryExercise } from "../lib/db";
import { logDevError } from "../lib/utils";

const REGION_MUSCLES = {
  overkropp: new Set(["chest", "shoulders_front", "shoulders_side", "biceps", "forearms", "traps", "rear_delts", "lats", "triceps"]),
  kjerne:    new Set(["abs", "obliques", "lower_back"]),
  underkropp: new Set(["quads", "hamstrings", "glutes", "calves", "calves_back"]),
};

function matchesRegion(ex, region) {
  if (region === "alle") return true;
  if (region === "kondisjon") return (ex.primary_muscles || []).length === 0 && (ex.secondary_muscles || []).length === 0;
  const set = REGION_MUSCLES[region];
  return [...(ex.primary_muscles || []), ...(ex.secondary_muscles || [])].some(m => set.has(m));
}

export default function OvelsePicker({ onBack, initialShowNew = false }) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [region, setRegion] = useState("alle");
  const [showNew, setShowNew] = useState(initialShowNew);
  const [detailEx, setDetailEx] = useState(null);
  const [editingEx, setEditingEx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLibraryExercises()
      .then(setExercises)
      .catch(e => { logDevError("OvelsePicker/fetch", e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

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
    { key: "alle",      label: t("settSammen.regionAll") },
    { key: "overkropp", label: t("settSammen.regionUpper") },
    { key: "kjerne",    label: t("settSammen.regionCore") },
    { key: "underkropp",label: t("settSammen.regionLower") },
    { key: "kondisjon", label: t("settSammen.regionCardio") },
  ];

  if (detailEx) {
    return (
      <OvelseDetail
        exercise={detailEx}
        onBack={() => setDetailEx(null)}
        onEdit={(ex) => { setDetailEx(null); setEditingEx(ex); }}
      />
    );
  }

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <SectionLabel>{t("nav.library")}</SectionLabel>
        <div style={{ padding: "0 16px" }}>
          <BackButton onClick={onBack} />

          {error && (
            <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={error} hideCloseButton style={{ marginBottom: 16 }} />
          )}

          {!showNew && !editingEx && (
            <Button kind="primary" renderIcon={Add} onClick={() => setShowNew(true)} style={{ marginBottom: 16 }}>
              {t("bibliotek.newExercise")}
            </Button>
          )}

          {showNew && (
            <ExerciseForm
              onSave={handleSaveNew}
              onCancel={() => setShowNew(false)}
              saving={saving}
            />
          )}

          {/* Region filter chips */}
          {!showNew && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {regions.map(r => (
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
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          {!loading && !showNew && exercises.length > 0 && (
            <div style={{ position: "relative", marginBottom: 12 }}>
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
          ) : filtered.length === 0 && !showNew ? (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
              {search.trim() || region !== "alle" ? t("bibliotek.noSearchResults") : t("settSammen.ovelserEmpty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {filtered.map(ex => (
                <div key={ex.id}>
                  {editingEx?.id === ex.id ? (
                    <ExerciseForm
                      initial={editingEx}
                      onSave={fields => handleUpdate(ex.id, fields)}
                      onCancel={() => setEditingEx(null)}
                      saving={saving}
                    />
                  ) : (
                    <button
                      onClick={() => { setDetailEx(ex); setShowNew(false); }}
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
                        <p style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", margin: "0 0 4px" }}>
                          {ex.name}
                        </p>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(ex.primary_muscles || []).slice(0, 4).map(id => (
                            <AccentChip key={id}>{t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}</AccentChip>
                          ))}
                          {(ex.secondary_muscles || []).slice(0, 3).map(id => (
                            <span key={id} style={{
                              display: "inline-block", borderRadius: "var(--r-pill)",
                              padding: "3px 10px",
                              background: "rgba(69,137,255,.10)",
                              border: "1px solid rgba(69,137,255,.25)",
                              color: "#4589ff",
                              fontFamily: "var(--cds-font-mono)",
                              fontSize: 11,
                              letterSpacing: "0.06em",
                            }}>
                              {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Button, InlineLoading, InlineNotification, TextInput } from "@carbon/react";
import { Add, Search, ChevronRight } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import PageShell, { SectionLabel, BackButton } from "./PageShell";
import { BodySVG } from "../lib/bodymap.jsx";
import { fetchTemplates, saveTemplate } from "../lib/db";
import { buildMuscleMapFromExercises, logDevError } from "../lib/utils";

export default function GruppetimePicker({ onBack, onEditTemplate }) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(e => { logDevError("GruppetimePicker/fetch", e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return q ? templates.filter(tpl => tpl.name.toLowerCase().includes(q)) : templates;
  }, [templates, debouncedSearch]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const tpl = await saveTemplate(newName.trim());
      const full = { ...tpl, session_template_exercises: [] };
      setTemplates(p => [full, ...p]);
      setNewName("");
      setShowNew(false);
      onEditTemplate(full);
    } catch (e) {
      logDevError("GruppetimePicker/create", e);
      setError(e.message);
    } finally {
      setSaving(false);
    }
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

          {!showNew && (
            <Button kind="primary" renderIcon={Add} onClick={() => setShowNew(true)} style={{ marginBottom: 16 }}>
              {t("settSammen.newGruppetime")}
            </Button>
          )}

          {showNew && (
            <div style={{
              background: "var(--cds-layer-01)",
              border: "1px solid var(--cds-border-subtle-01)",
              borderRadius: "var(--r-card)",
              padding: 16,
              marginBottom: 16,
            }}>
              <TextInput
                id="new-tpl-name"
                labelText={t("bibliotek.templateNameLabel")}
                placeholder={t("bibliotek.templateNamePlaceholder")}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowNew(false); setNewName(""); }
                }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button kind="primary" size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
                  {saving ? t("bibliotek.creating") : t("bibliotek.createTemplate")}
                </Button>
                <Button kind="ghost" size="sm" onClick={() => { setShowNew(false); setNewName(""); }}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}

          {!loading && templates.length > 0 && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted-wl)", pointerEvents: "none" }} />
              <input
                type="search"
                placeholder={t("settSammen.searchGruppetimer")}
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
            <InlineLoading description={t("bibliotek.loadingTemplates")} status="active" />
          ) : filtered.length === 0 ? (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
              {search.trim() ? t("bibliotek.noSearchResults") : t("settSammen.gruppetimerEmpty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {filtered.map(tpl => {
                const exs = (tpl.session_template_exercises || []).map(e => ({
                  primary: e.primary_muscles || [],
                  secondary: e.secondary_muscles || [],
                  enabled: true,
                }));
                const muscleMap = buildMuscleMapFromExercises(exs);
                const hasMuscles = muscleMap.primary.size > 0 || muscleMap.secondary.size > 0;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => onEditTemplate(tpl)}
                    style={{
                      background: "var(--cds-layer-01)",
                      border: "1px solid var(--cds-border-subtle-01)",
                      borderInlineStart: "3px solid var(--accent)",
                      borderRadius: "0 var(--r-card) var(--r-card) 0",
                      padding: "12px 12px 12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", margin: "0 0 4px" }}>
                        {tpl.name}
                      </p>
                      <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", margin: 0, letterSpacing: "0.06em" }}>
                        {t("bibliotek.exerciseCount", { count: (tpl.session_template_exercises || []).length })}
                      </p>
                    </div>
                    {hasMuscles && (
                      <div style={{ width: 36, flexShrink: 0, opacity: 0.85 }}>
                        <BodySVG
                          view="front"
                          primary={[...muscleMap.primary]}
                          secondary={[...muscleMap.secondary]}
                        />
                      </div>
                    )}
                    <ChevronRight size={16} style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

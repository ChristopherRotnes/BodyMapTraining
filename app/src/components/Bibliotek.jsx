import { useState, useEffect, useMemo } from "react";
import {
  Button, InlineNotification, InlineLoading,
  TextInput, Modal,
} from "@carbon/react";
import { Add, TrashCan, Edit as EditIcon, ChevronRight, Search } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { getIntlLocale } from "../lib/utils";
import PageShell, { SectionLabel, PageHeading, AccentChip } from "./PageShell";
import {
  fetchLibraryExercises, saveLibraryExercise, updateLibraryExercise, deleteLibraryExercise,
  fetchTemplates, saveTemplate, deleteTemplate, fetchTemplateNamesUsingExercise,
} from "../lib/db";
import { MUSCLES, BodySVG } from "../lib/bodymap.jsx";
import { logDevError } from "../lib/utils";
import ExerciseForm from "./ExerciseForm";

export default function Bibliotek({ onEditTemplate, initialTab = 0 }) {
  const { t } = useTranslation();

  const [tabIndex, setTabIndex] = useState(initialTab);
  const [exSearch, setExSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(exSearch), 200);
    return () => clearTimeout(timer);
  }, [exSearch]);

  const [exercises, setExercises] = useState([]);
  const [exLoading, setExLoading] = useState(true);
  const [exError, setExError] = useState(null);
  const [showNewEx, setShowNewEx] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [savingEx, setSavingEx] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState(null);
  const [newTplName, setNewTplName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [exVisible, setExVisible] = useState(20);
  const [tplSearch, setTplSearch] = useState("");
  const [tplVisible, setTplVisible] = useState(12);

  useEffect(() => {
    fetchLibraryExercises()
      .then(setExercises)
      .catch(e => { logDevError("Bibliotek/fetchExercises", e); setExError(e.message); })
      .finally(() => setExLoading(false));
    fetchTemplates()
      .then(setTemplates)
      .catch(e => { logDevError("Bibliotek/fetchTemplates", e); setTplError(e.message); })
      .finally(() => setTplLoading(false));
  }, []);

  const filteredExercises = useMemo(() => {
    return debouncedSearch.trim()
      ? exercises.filter(e => e.name.toLowerCase().includes(debouncedSearch.toLowerCase().trim()))
      : exercises;
  }, [exercises, debouncedSearch]);

  useEffect(() => { setExVisible(20); }, [filteredExercises]);

  const filteredTemplates = useMemo(() => {
    const q = tplSearch.trim().toLowerCase();
    return q ? templates.filter(t => t.name.toLowerCase().includes(q)) : templates;
  }, [templates, tplSearch]);

  const handleSaveNewExercise = async (fields) => {
    setSavingEx(true);
    try {
      const saved = await saveLibraryExercise(fields);
      setExercises(p => [...p, saved].sort((a, b) => a.name.localeCompare(b.name, "no")));
      setShowNewEx(false);
    } catch (e) { logDevError("Bibliotek/saveExercise", e); setExError(e.message); }
    finally { setSavingEx(false); }
  };

  const handleUpdateExercise = async (id, fields) => {
    setSavingEx(true);
    try {
      const updated = await updateLibraryExercise(id, fields);
      setExercises(p =>
        p.map(e => e.id === id ? updated : e)
          .sort((a, b) => a.name.localeCompare(b.name, "no"))
      );
      setEditingEx(null);
    } catch (e) { logDevError("Bibliotek/updateExercise", e); setExError(e.message); }
    finally { setSavingEx(false); }
  };

  const handleDeleteExercise = async (id) => {
    const ex = exercises.find(e => e.id === id);
    const affectedTemplates = await fetchTemplateNamesUsingExercise(id).catch(() => []);
    setConfirmDelete({ type: "exercise", id, name: ex?.name || "", affectedTemplates });
  };

  const handleSaveNewTemplate = async () => {
    if (!newTplName.trim()) return;
    setSavingTpl(true);
    try {
      const tpl = await saveTemplate(newTplName.trim());
      const full = { ...tpl, session_template_exercises: [] };
      setTemplates(p => [full, ...p]);
      setNewTplName("");
      setShowNewTpl(false);
      onEditTemplate(full);
    } catch (e) { logDevError("Bibliotek/saveTemplate", e); setTplError(e.message); }
    finally { setSavingTpl(false); }
  };

  const handleDeleteTemplate = (id) => {
    const tpl = templates.find(t => t.id === id);
    setConfirmDelete({ type: "template", id, name: tpl?.name || "" });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      if (type === "exercise") {
        await deleteLibraryExercise(id);
        setExercises(p => p.filter(e => e.id !== id));
      } else {
        await deleteTemplate(id);
        setTemplates(p => p.filter(t => t.id !== id));
      }
    } catch (e) {
      logDevError(`Bibliotek/delete-${type}`, e);
      if (type === "exercise") setExError(e.message);
      else setTplError(e.message);
    }
  };

  const tabLabels = [
    `${t("bibliotek.tabExercises")}${!exLoading ? ` (${exercises.length})` : ""}`,
    `${t("bibliotek.tabTemplates")}${!tplLoading ? ` (${templates.length})` : ""}`,
  ];

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <SectionLabel>{t("bibliotek.sectionLabel")}</SectionLabel>
        <PageHeading>{t("bibliotek.heading")}</PageHeading>

        {/* Pill tab strip */}
        <div
          style={{ display: "inline-flex", gap: 2, padding: 4, background: "var(--surface-card)", borderRadius: "var(--r-pill)", marginBottom: 20, border: "1px solid var(--border-subtle-wl)" }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setTabIndex(0);
            if (e.key === "ArrowRight") setTabIndex(1);
          }}
          role="tablist"
          aria-label={t("bibliotek.sectionLabel")}
        >
          {tabLabels.map((label, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={tabIndex === i}
              onClick={() => setTabIndex(i)}
              style={{
                padding: "6px 20px",
                borderRadius: "var(--r-pill)",
                border: "none",
                background: tabIndex === i ? "var(--accent)" : "transparent",
                color: tabIndex === i ? "#fff" : "var(--text-muted-wl)",
                fontFamily: "var(--cds-font-mono)",
                fontSize: 12,
                cursor: "pointer",
                letterSpacing: "0.06em",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── EXERCISES ── */}
        {tabIndex === 0 && (
          <div role="tabpanel">
            {exError && (
              <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={exError} hideCloseButton style={{ marginBottom: 16 }} />
            )}

            {!showNewEx && (
              <Button kind="primary" renderIcon={Add} onClick={() => { setShowNewEx(true); setEditingEx(null); }}
                style={{ marginBottom: 16 }}>
                {t("bibliotek.newExercise")}
              </Button>
            )}

            {/* Shortcut carousel — template shortcuts */}
            {!tplLoading && templates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted-wl)", marginBottom: 8 }}>
                  {t("bibliotek.shortcuts")}
                </p>
                <div style={{ overflowX: "auto", display: "flex", gap: 8, paddingBottom: 8, scrollbarWidth: "none" }}>
                  {templates.slice(0, 6).map(tpl => {
                    const exCount = tpl.session_template_exercises?.length || 0;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => onEditTemplate(tpl)}
                        style={{
                          flexShrink: 0,
                          background: "var(--surface-card)",
                          border: "1px solid var(--border-subtle-wl)",
                          borderRadius: "var(--r-tile)",
                          padding: "10px 14px",
                          cursor: "pointer", textAlign: "left",
                          minWidth: 110,
                        }}
                      >
                        <div style={{ fontFamily: "var(--cond)", fontWeight: 600, fontSize: 14, color: "var(--cds-text-primary)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                          {tpl.name}
                        </div>
                        <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {t("bibliotek.exerciseCount", { count: exCount })}
                        </div>
                      </button>
                    );
                  })}
                  {templates.length > 6 && (
                    <button
                      onClick={() => setTabIndex(1)}
                      style={{
                        flexShrink: 0, alignSelf: "center",
                        background: "none", border: "none",
                        color: "var(--accent)", fontFamily: "var(--cds-font-mono)", fontSize: 11,
                        letterSpacing: "0.06em", cursor: "pointer", padding: "10px 8px",
                      }}
                    >
                      {t("bibliotek.seeAll")} →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search */}
            {!exLoading && exercises.length > 0 && (
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted-wl)", pointerEvents: "none" }} />
                <input
                  type="search"
                  id="exercise-search"
                  name="exercise-search"
                  placeholder={t("bibliotek.searchPlaceholder")}
                  value={exSearch}
                  onChange={e => setExSearch(e.target.value)}
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

            {showNewEx && (
              <ExerciseForm
                onSave={handleSaveNewExercise}
                onCancel={() => setShowNewEx(false)}
                saving={savingEx}
              />
            )}

            {exLoading ? (
              <InlineLoading description={t("bibliotek.loadingExercises")} status="active" />
            ) : filteredExercises.length === 0 && !showNewEx ? (
              <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
                {exSearch.trim() ? t("bibliotek.noSearchResults") : t("bibliotek.noExercises")}
              </p>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {filteredExercises.slice(0, exVisible).map(ex => (
                    <div key={ex.id}>
                      {editingEx?.id === ex.id ? (
                        <ExerciseForm
                          initial={editingEx}
                          onSave={(fields) => handleUpdateExercise(ex.id, fields)}
                          onCancel={() => setEditingEx(null)}
                          saving={savingEx}
                        />
                      ) : (
                        <div style={{
                          background: "var(--surface-card)",
                          border: "1px solid var(--border-subtle-wl)",
                          borderInlineStart: "3px solid var(--border-subtle-wl)",
                          padding: "10px 12px",
                          display: "flex", alignItems: "center", gap: 8,
                          borderRadius: "0 var(--r-accent) var(--r-accent) 0",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--cds-text-primary)" }}>
                              {ex.name}
                            </div>
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
                                  color: "var(--cds-blue-40)",
                                  fontFamily: "var(--cds-font-mono)", fontSize: 11, letterSpacing: "0.06em",
                                }}>
                                  {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                                </span>
                              ))}
                              {!(ex.primary_muscles?.length) && !(ex.secondary_muscles?.length) && (
                                <span style={{ fontSize: 11, color: "var(--text-muted-wl)" }}>{t("bibliotek.noMuscles")}</span>
                              )}
                            </div>
                          </div>
                          {(ex.default_sets && ex.default_reps) && (
                            <span style={{ fontSize: 11, color: "var(--text-muted-wl)", flexShrink: 0, fontFamily: "var(--cds-font-mono)" }}>
                              {ex.default_sets}×{ex.default_reps}
                            </span>
                          )}
                          <Button kind="ghost" hasIconOnly renderIcon={EditIcon} iconDescription={t("common.edit")} size="sm"
                            onClick={() => { setEditingEx(ex); setShowNewEx(false); }} />
                          <Button kind="ghost" hasIconOnly renderIcon={TrashCan} iconDescription={t("common.delete")} size="sm"
                            onClick={() => handleDeleteExercise(ex.id)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {filteredExercises.length > exVisible && (
                  <button
                    onClick={() => setExVisible(v => v + 20)}
                    style={{
                      display: "block", width: "100%", marginTop: 8,
                      background: "none", border: "1px solid var(--border-subtle-wl)",
                      padding: "8px 0", cursor: "pointer",
                      fontFamily: "var(--cds-font-mono)", fontSize: 12, letterSpacing: "0.06em",
                      color: "var(--cds-text-secondary)",
                    }}
                  >
                    {t("bibliotek.showMore", { count: Math.min(20, filteredExercises.length - exVisible) })}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {tabIndex === 1 && (
          <div role="tabpanel">
            {tplError && (
              <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={tplError} hideCloseButton style={{ marginBottom: 16 }} />
            )}

            {!showNewTpl && (
              <Button kind="primary" renderIcon={Add} onClick={() => setShowNewTpl(true)} style={{ marginBottom: 12 }}>
                {t("bibliotek.newTemplate")}
              </Button>
            )}

            {showNewTpl && (
              <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 16, marginBottom: 12 }}>
                <TextInput
                  id="new-tpl-name"
                  labelText={t("bibliotek.templateNameLabel")}
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  placeholder={t("bibliotek.templateNamePlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNewTemplate()}
                  style={{ marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button kind="secondary" size="sm" onClick={() => { setShowNewTpl(false); setNewTplName(""); }}>
                    {t("common.cancel")}
                  </Button>
                  <Button kind="primary" size="sm" disabled={!newTplName.trim() || savingTpl} onClick={handleSaveNewTemplate}>
                    {savingTpl ? t("bibliotek.creating") : t("bibliotek.createTemplate")}
                  </Button>
                </div>
              </div>
            )}

            {!tplLoading && templates.length > 0 && (
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted-wl)", pointerEvents: "none" }} />
                <input
                  type="search"
                  id="template-search"
                  name="template-search"
                  placeholder={t("bibliotek.searchTemplates")}
                  value={tplSearch}
                  onChange={e => { setTplSearch(e.target.value); setTplVisible(12); }}
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

            {tplLoading ? (
              <InlineLoading description={t("bibliotek.loadingTemplates")} status="active" />
            ) : filteredTemplates.length === 0 && !showNewTpl ? (
              <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
                {tplSearch.trim() ? t("bibliotek.noSearchResults") : t("bibliotek.noTemplates")}
              </p>
            ) : (
              <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredTemplates.slice(0, tplVisible).map(tpl => {
                  const exCount = tpl.session_template_exercises?.length || 0;
                  const usedAt = tpl.used_at
                    ? new Intl.DateTimeFormat(getIntlLocale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(tpl.used_at))
                    : null;
                  const tplPrimary = [...new Set((tpl.session_template_exercises || []).flatMap(e => e.primary_muscles || []))];
                  const muscleCount = tplPrimary.length;
                  return (
                    <div key={tpl.id} style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle-wl)",
                      borderRadius: "var(--r-card)",
                      padding: "12px 14px",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div
                        style={{ background: "var(--cds-layer-02)", padding: 6, display: "flex", gap: 2, cursor: "pointer", flexShrink: 0, borderRadius: 8 }}
                        onClick={() => onEditTemplate(tpl)}
                      >
                        <div style={{ width: 32 }}><BodySVG view="front" primary={tplPrimary} secondary={[]} /></div>
                        <div style={{ width: 32 }}><BodySVG view="back" primary={tplPrimary} secondary={[]} /></div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onEditTemplate(tpl)}>
                        <div style={{ fontFamily: "var(--cond)", fontSize: 15, fontWeight: 700, color: "var(--cds-text-primary)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tpl.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {t("bibliotek.exerciseCount", { count: exCount })} · {muscleCount} MUS{usedAt ? ` · ${usedAt}` : ""}
                        </div>
                      </div>
                      <Button kind="ghost" hasIconOnly renderIcon={ChevronRight}
                        iconDescription={t("bibliotek.deleteTemplateTitle")} size="sm"
                        onClick={() => onEditTemplate(tpl)} />
                      <Button kind="ghost" hasIconOnly renderIcon={TrashCan}
                        iconDescription={t("bibliotek.deleteTemplateTitle")} size="sm"
                        onClick={() => handleDeleteTemplate(tpl.id)} />
                    </div>
                  );
                })}
              </div>
              {filteredTemplates.length > tplVisible && (
                <button
                  onClick={() => setTplVisible(v => v + 12)}
                  style={{
                    display: "block", width: "100%", marginTop: 8,
                    background: "none", border: "1px solid var(--border-subtle-wl)",
                    padding: "8px 0", cursor: "pointer",
                    fontFamily: "var(--cds-font-mono)", fontSize: 12, letterSpacing: "0.06em",
                    color: "var(--cds-text-secondary)",
                  }}
                >
                  {t("bibliotek.showMore", { count: Math.min(12, filteredTemplates.length - tplVisible) })}
                </button>
              )}
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        open={!!confirmDelete}
        size="sm"
        modalHeading={confirmDelete?.type === "exercise" ? t("bibliotek.deleteExerciseTitle") : t("bibliotek.deleteTemplateTitle")}
        primaryButtonText={t("common.delete")}
        secondaryButtonText={t("common.cancel")}
        danger
        onRequestClose={() => setConfirmDelete(null)}
        onRequestSubmit={executeDelete}
      >
        <p>{t("bibliotek.deleteConfirm", { name: confirmDelete?.name })}</p>
        {confirmDelete?.affectedTemplates?.length > 0 && (
          <p style={{ marginTop: 8, color: "var(--cds-support-error)", fontSize: 13 }}>
            {t("bibliotek.usedInTemplates", { count: confirmDelete.affectedTemplates.length })}{" "}
            <strong>{confirmDelete.affectedTemplates.join(", ")}</strong> {t("bibliotek.exerciseRemovedWarning")}
          </p>
        )}
      </Modal>
    </PageShell>
  );
}

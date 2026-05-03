import { useState, useEffect } from "react";
import {
  Button, Tag, InlineNotification, InlineLoading,
  Tabs, Tab, TabList, TabPanels, TabPanel,
  TextInput, Modal,
} from "@carbon/react";
import { Add, TrashCan, Edit as EditIcon, ChevronRight } from "@carbon/icons-react";
import PageShell, { PageTitle } from "./PageShell";
import {
  fetchLibraryExercises, saveLibraryExercise, updateLibraryExercise, deleteLibraryExercise,
  fetchTemplates, saveTemplate, deleteTemplate, fetchTemplateNamesUsingExercise,
} from "../lib/db";
import { MUSCLES, BodySVG } from "../lib/bodymap.jsx";
import { logDevError } from "../lib/utils";
import ExerciseForm from "./ExerciseForm";

export default function Bibliotek({ onEditTemplate, onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek, currentView, initialTab = 0 }) {

  const [tabIndex, setTabIndex] = useState(initialTab);

  const [exercises, setExercises] = useState([]);
  const [exLoading, setExLoading] = useState(true);
  const [exError, setExError] = useState(null);
  const [showNewEx, setShowNewEx] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [savingEx, setSavingEx] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null); // { type: "exercise"|"template", id, name }

  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState(null);
  const [newTplName, setNewTplName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [showNewTpl, setShowNewTpl] = useState(false);

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
    setConfirmDelete({ type: "exercise", id, name: ex?.name || "øvelsen", affectedTemplates });
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
    setConfirmDelete({ type: "template", id, name: tpl?.name || "malen" });
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

  const muscleChips = (ids, type) =>
    (ids || []).slice(0, 4).map(id => (
      <Tag key={id} type={type === "primary" ? "green" : "blue"} size="sm">
        {MUSCLES[id]?.label || id}
      </Tag>
    ));

  return (
    <PageShell
      onShowHome={onShowHome}
      onShowLogger={onShowLogger}
      onShowHistory={onShowHistory}
      onShowReport={onShowReport}
      onShowBibliotek={onShowBibliotek}
      currentView={currentView}
    >
      <div style={{ paddingBottom: 32 }}>
          <PageTitle>Bibliotek</PageTitle>
          <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => setTabIndex(selectedIndex)}>
            <TabList aria-label="Bibliotek-seksjoner">
              <Tab>Øvelser{!exLoading ? ` (${exercises.length})` : ""}</Tab>
              <Tab>Maler{!tplLoading ? ` (${templates.length})` : ""}</Tab>
            </TabList>
            <TabPanels>

              {/* ── ØVELSER ── */}
              <TabPanel>
                {exError && (
                  <InlineNotification kind="error" title="Feil:" subtitle={exError} hideCloseButton
                    style={{ marginBottom: 16 }} />
                )}

                {!showNewEx && (
                  <Button kind="primary" renderIcon={Add} onClick={() => { setShowNewEx(true); setEditingEx(null); }}
                    style={{ marginBottom: 12 }}>
                    Ny øvelse
                  </Button>
                )}

                {showNewEx && (
                  <ExerciseForm
                    onSave={handleSaveNewExercise}
                    onCancel={() => setShowNewEx(false)}
                    saving={savingEx}
                  />
                )}

                {exLoading ? (
                  <InlineLoading description="Laster øvelser…" status="active" />
                ) : exercises.length === 0 && !showNewEx ? (
                  <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
                    Ingen øvelser lagt til ennå.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {exercises.map(ex => (
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
                            background: "var(--cds-layer-01)",
                            border: "1px solid var(--cds-border-subtle-01)",
                            padding: "10px 12px",
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: "var(--cds-text-primary)" }}>
                                {ex.name}
                              </div>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {muscleChips(ex.primary_muscles, "primary")}
                                {muscleChips(ex.secondary_muscles, "secondary")}
                                {!(ex.primary_muscles?.length) && !(ex.secondary_muscles?.length) && (
                                  <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>Ingen muskler</span>
                                )}
                              </div>
                            </div>
                            {(ex.default_sets && ex.default_reps) && (
                              <span style={{ fontSize: 11, color: "var(--cds-text-secondary)", flexShrink: 0, fontFamily: "var(--cds-font-mono)" }}>
                                {ex.default_sets}×{ex.default_reps}
                              </span>
                            )}
                            <Button kind="ghost" hasIconOnly renderIcon={EditIcon} iconDescription="Rediger" size="sm"
                              onClick={() => { setEditingEx(ex); setShowNewEx(false); }} />
                            <Button kind="ghost" hasIconOnly renderIcon={TrashCan} iconDescription="Slett" size="sm"
                              onClick={() => handleDeleteExercise(ex.id)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabPanel>

              {/* ── MALER ── */}
              <TabPanel>
                {tplError && (
                  <InlineNotification kind="error" title="Feil:" subtitle={tplError} hideCloseButton
                    style={{ marginBottom: 16 }} />
                )}

                {!showNewTpl && (
                  <Button kind="primary" renderIcon={Add} onClick={() => setShowNewTpl(true)}
                    style={{ marginBottom: 12 }}>
                    Ny mal
                  </Button>
                )}

                {showNewTpl && (
                  <div style={{ background: "var(--cds-layer-02)", border: "1px solid var(--cds-border-strong-01)", padding: 16, marginBottom: 12 }}>
                    <TextInput
                      id="new-tpl-name"
                      labelText="Navn på mal"
                      value={newTplName}
                      onChange={(e) => setNewTplName(e.target.value)}
                      placeholder="f.eks. CrossFit - Anna - mandag"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveNewTemplate()}
                      style={{ marginBottom: 12 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button kind="secondary" size="sm"
                        onClick={() => { setShowNewTpl(false); setNewTplName(""); }}>
                        Avbryt
                      </Button>
                      <Button kind="primary" size="sm" disabled={!newTplName.trim() || savingTpl}
                        onClick={handleSaveNewTemplate}>
                        {savingTpl ? "Oppretter…" : "Opprett og legg til øvelser"}
                      </Button>
                    </div>
                  </div>
                )}

                {tplLoading ? (
                  <InlineLoading description="Laster maler…" status="active" />
                ) : templates.length === 0 && !showNewTpl ? (
                  <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
                    Ingen maler opprettet ennå.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {templates.map(tpl => {
                      const exCount = tpl.session_template_exercises?.length || 0;
                      const usedAt = tpl.used_at
                        ? new Date(tpl.used_at).toLocaleDateString("no-NO")
                        : null;
                      const tplPrimary = [...new Set((tpl.session_template_exercises || []).flatMap(e => e.primary_muscles || []))];
                      const muscleCount = tplPrimary.length;
                      return (
                        <div key={tpl.id} style={{
                          background: "var(--cds-layer-01)",
                          border: "1px solid var(--cds-border-subtle-01)",
                          padding: "10px 12px",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <div
                            style={{ background: "var(--cds-layer-02)", padding: 6, display: "flex", gap: 2, cursor: "pointer", flexShrink: 0 }}
                            onClick={() => onEditTemplate(tpl)}
                          >
                            <div style={{ width: 32 }}><BodySVG view="front" primary={tplPrimary} secondary={[]} /></div>
                            <div style={{ width: 32 }}><BodySVG view="back" primary={tplPrimary} secondary={[]} /></div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                            onClick={() => onEditTemplate(tpl)}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--cds-text-primary)", marginBottom: 4 }}>
                              {tpl.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", letterSpacing: "0.06em" }}>
                              {exCount} ØVELSER · {muscleCount} MUSKLER{usedAt ? ` · SIST ${usedAt}` : ""}
                            </div>
                          </div>
                          <Button kind="ghost" hasIconOnly renderIcon={ChevronRight}
                            iconDescription="Rediger mal" size="sm"
                            onClick={() => onEditTemplate(tpl)} />
                          <Button kind="ghost" hasIconOnly renderIcon={TrashCan}
                            iconDescription="Slett mal" size="sm"
                            onClick={() => handleDeleteTemplate(tpl.id)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabPanel>

            </TabPanels>
          </Tabs>
        </div>

      <Modal
        open={!!confirmDelete}
        size="sm"
        modalHeading={confirmDelete?.type === "exercise" ? "Slett øvelse" : "Slett mal"}
        primaryButtonText="Slett"
        secondaryButtonText="Avbryt"
        danger
        onRequestClose={() => setConfirmDelete(null)}
        onRequestSubmit={executeDelete}
      >
        <p>Er du sikker på at du vil slette «{confirmDelete?.name}»? Dette kan ikke angres.</p>
        {confirmDelete?.affectedTemplates?.length > 0 && (
          <p style={{ marginTop: 8, color: "var(--cds-support-error)", fontSize: 13 }}>
            Øvelsen brukes i {confirmDelete.affectedTemplates.length === 1 ? "malen" : "malene"}{" "}
            <strong>{confirmDelete.affectedTemplates.join(", ")}</strong> og vil bli fjernet derfra.
          </p>
        )}
      </Modal>
    </PageShell>
  );
}

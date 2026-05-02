import React, { useState, useEffect } from "react";
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent,
  Button, Tag, InlineNotification, InlineLoading,
  Tabs, Tab, TabList, TabPanels, TabPanel,
  TextInput,
} from "@carbon/react";
import { Add, TrashCan, Edit as EditIcon, ArrowLeft, ChevronRight, Asleep, Light } from "@carbon/icons-react";
import {
  fetchLibraryExercises, saveLibraryExercise, updateLibraryExercise, deleteLibraryExercise,
  fetchTemplates, saveTemplate, deleteTemplate,
} from "../lib/db";
import { MUSCLES } from "../lib/bodymap.jsx";
import MusclePicker from "./MusclePicker";
import { useTheme } from "../theme";

function ExerciseForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name || "");
  const [primary, setPrimary] = useState(initial?.primary_muscles || []);
  const [secondary, setSecondary] = useState(initial?.secondary_muscles || []);
  const [defaultSets, setDefaultSets] = useState(initial?.default_sets || "");
  const [defaultReps, setDefaultReps] = useState(initial?.default_reps || "");

  return (
    <div style={{ background: "var(--cds-layer-02)", border: "1px solid var(--cds-border-strong-01)", padding: 16, marginBottom: 8 }}>
      <TextInput
        id={`ex-form-name-${initial?.id || "new"}`}
        labelText="Navn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="f.eks. Knebøy"
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TextInput
          id={`ex-form-sets-${initial?.id || "new"}`}
          labelText="Standard sett"
          value={defaultSets}
          onChange={(e) => setDefaultSets(e.target.value)}
          placeholder="–"
          size="sm"
        />
        <TextInput
          id={`ex-form-reps-${initial?.id || "new"}`}
          labelText="Standard reps"
          value={defaultReps}
          onChange={(e) => setDefaultReps(e.target.value)}
          placeholder="–"
          size="sm"
        />
      </div>
      <MusclePicker
        primary={primary}
        secondary={secondary}
        onChange={({ primary: p, secondary: s }) => { setPrimary(p); setSecondary(s); }}
        instanceId={initial?.id || "new"}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button kind="secondary" size="sm" onClick={onCancel}>Avbryt</Button>
        <Button
          kind="primary"
          size="sm"
          disabled={!name.trim() || saving}
          onClick={() => onSave({
            name: name.trim(),
            primary_muscles: primary,
            secondary_muscles: secondary,
            default_sets: defaultSets || null,
            default_reps: defaultReps || null,
          })}
        >
          {saving ? "Lagrer…" : "Lagre øvelse"}
        </Button>
      </div>
    </div>
  );
}

export default function Bibliotek({ onBack, onEditTemplate }) {
  const { theme, setTheme } = useTheme();
  const [tabIndex, setTabIndex] = useState(0);

  const [exercises, setExercises] = useState([]);
  const [exLoading, setExLoading] = useState(true);
  const [exError, setExError] = useState(null);
  const [showNewEx, setShowNewEx] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [savingEx, setSavingEx] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState(null);
  const [newTplName, setNewTplName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [showNewTpl, setShowNewTpl] = useState(false);

  useEffect(() => {
    fetchLibraryExercises()
      .then(setExercises)
      .catch(e => setExError(e.message))
      .finally(() => setExLoading(false));
    fetchTemplates()
      .then(setTemplates)
      .catch(e => setTplError(e.message))
      .finally(() => setTplLoading(false));
  }, []);

  const handleSaveNewExercise = async (fields) => {
    setSavingEx(true);
    try {
      const saved = await saveLibraryExercise(fields);
      setExercises(p => [...p, saved].sort((a, b) => a.name.localeCompare(b.name, "no")));
      setShowNewEx(false);
    } catch (e) { setExError(e.message); }
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
    } catch (e) { setExError(e.message); }
    finally { setSavingEx(false); }
  };

  const handleDeleteExercise = async (id) => {
    if (!window.confirm("Slett øvelse?")) return;
    try {
      await deleteLibraryExercise(id);
      setExercises(p => p.filter(e => e.id !== id));
    } catch (e) { setExError(e.message); }
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
    } catch (e) { setTplError(e.message); }
    finally { setSavingTpl(false); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Slett mal?")) return;
    try {
      await deleteTemplate(id);
      setTemplates(p => p.filter(t => t.id !== id));
    } catch (e) { setTplError(e.message); }
  };

  const muscleChips = (ids, type) =>
    (ids || []).slice(0, 4).map(id => (
      <Tag key={id} type={type === "primary" ? "green" : "blue"} size="sm">
        {MUSCLES[id]?.label || id}
      </Tag>
    ));

  return (
    <div data-theme={theme}>
      <Header aria-label="Workout Lens">
        <SkipToContent />
        <HeaderGlobalAction aria-label="Tilbake" onClick={onBack} style={{ order: -1 }}>
          <ArrowLeft size={20} />
        </HeaderGlobalAction>
        <HeaderName href="#" prefix="">Bibliotek</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={theme === "g10" ? "Bytt til mørkt tema" : "Bytt til lyst tema"}
            onClick={() => setTheme(theme === "g10" ? "g100" : "g10")}
          >
            {theme === "g10" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <main style={{ paddingTop: 48, minHeight: "100vh", background: "var(--cds-background)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
          <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => setTabIndex(selectedIndex)}>
            <TabList aria-label="Bibliotek-seksjoner">
              <Tab>Øvelser</Tab>
              <Tab>Maler</Tab>
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
                            {(ex.default_sets || ex.default_reps) && (
                              <span style={{ fontSize: 12, color: "var(--cds-text-secondary)", flexShrink: 0 }}>
                                {ex.default_sets || "–"}×{ex.default_reps || "–"}
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
                      return (
                        <div key={tpl.id} style={{
                          background: "var(--cds-layer-01)",
                          border: "1px solid var(--cds-border-subtle-01)",
                          padding: "10px 12px",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                            onClick={() => onEditTemplate(tpl)}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--cds-text-primary)", marginBottom: 2 }}>
                              {tpl.name}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                              {exCount} {exCount === 1 ? "øvelse" : "øvelser"}
                              {usedAt ? ` · Sist brukt ${usedAt}` : ""}
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
      </main>
    </div>
  );
}

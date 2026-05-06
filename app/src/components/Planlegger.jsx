import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, InlineLoading, InlineNotification } from "@carbon/react";
import { ChevronLeft, ChevronRight, Add, Close, TrashCan } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { fetchWeekPlan, saveWeekPlan, deleteWeekPlan, fetchTemplates } from "../lib/db";
import { buildMuscleMapFromExercises, toWeekIso, logDevError, getIntlLocale } from "../lib/utils";
import { calcMuscles, MUSCLES, HeatmapBodySVG, useIsMobile } from "../lib/bodymap.jsx";
import PageShell, { SectionLabel, PageHeading, StickyCta, AccentChip } from "./PageShell";

function TemplatePickerSheet({ templates, onSelect, onClose }) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === "Escape" && onClose()}
        style={{
          background: "var(--cds-layer-01)",
          width: "100%",
          maxWidth: 640,
          maxHeight: "60vh",
          overflowY: "auto",
          borderTop: "2px solid var(--accent)",
          paddingBottom: 16,
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 8px",
          borderBottom: "1px solid var(--cds-border-subtle-01)",
        }}>
          <span style={{ fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 15, color: "var(--cds-text-primary)" }}>
            {t("planlegger.selectTemplate")}
          </span>
          <button
            aria-label={t("common.close")}
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cds-icon-primary)", display: "flex", alignItems: "center" }}
          >
            <Close size={20} />
          </button>
        </div>

        {templates.length === 0 ? (
          <p style={{ padding: "16px", fontSize: 14, color: "var(--cds-text-secondary)" }}>
            {t("planlegger.noTemplates")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--cds-border-subtle-01)",
                  padding: "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--cds-layer-hover-01)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--cds-text-primary)" }}>
                  {tpl.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  {t("planlegger.exerciseCount", { count: (tpl.session_template_exercises || []).length })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayRow({ dow, date, template, onAdd, onRemove }) {
  const { t } = useTranslation();
  const dateLabel = date
    ? date.toLocaleDateString(getIntlLocale(), { day: "numeric", month: "short", timeZone: "UTC" })
    : "";

  const muscles = useMemo(() => {
    if (!template) return [];
    const exercises = (template.session_template_exercises || []).map(e => ({
      name: e.name,
      primary: e.primary_muscles || [],
      secondary: e.secondary_muscles || [],
      enabled: true,
    }));
    const { primary, secondary } = calcMuscles(exercises);
    const ids = [...new Set([...primary, ...secondary])];
    return ids.slice(0, 4).map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id }));
  }, [template, t]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 16px",
      borderBottom: "1px solid var(--cds-border-subtle-01)",
      minHeight: 56,
    }}>
      <div style={{ width: 36, flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "0.08em" }}>
          {t(`planlegger.days.${dow}`)}
        </div>
        <div style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
          {dateLabel}
        </div>
      </div>

      {template ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--cds-text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {template.name}
            </div>
            {muscles.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {muscles.map(m => (
                  <AccentChip key={m}>{m}</AccentChip>
                ))}
              </div>
            )}
          </div>
          <button
            aria-label={t("planlegger.removeTemplate", { name: template.name })}
            onClick={() => onRemove(dow)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--cds-icon-secondary)",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              padding: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--cds-icon-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--cds-icon-secondary)"}
          >
            <Close size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onAdd(dow)}
          style={{
            flex: 1,
            border: "1px dashed var(--cds-border-subtle-01)",
            background: "none",
            cursor: "pointer",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--cds-text-secondary)",
            fontSize: 13,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cds-border-subtle-01)"; e.currentTarget.style.color = "var(--cds-text-secondary)"; }}
        >
          <Add size={16} />
          {t("planlegger.addSession")}
        </button>
      )}
    </div>
  );
}

export default function Planlegger() {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [assignments, setAssignments] = useState({});
  const [savedAssignments, setSavedAssignments] = useState({});
  const [templates, setTemplates] = useState([]);
  const [pickerDow, setPickerDow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [mobileBodyView, setMobileBodyView] = useState("front");
  const isMobile = useIsMobile();

  const today = useMemo(() => new Date(), []);
  const monday = useMemo(() => {
    const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const day = base.getUTCDay() || 7;
    base.setUTCDate(base.getUTCDate() - (day - 1) + weekOffset * 7);
    return base;
  }, [today, weekOffset]);

  const weekIso = useMemo(() => toWeekIso(monday), [monday]);
  const weekLabel = useMemo(() => {
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
    const dayOfWeek = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

    const month = new Intl.DateTimeFormat(getIntlLocale(), { month: "short", timeZone: "UTC" })
      .format(sunday)
      .toUpperCase();

    return t("planlegger.weekLabel", { week, start: monday.getUTCDate(), end: sunday.getUTCDate(), month });
  }, [monday, t]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return d;
    });
  }, [monday]);

  const projectedData = useMemo(() => {
    const allExercises = Object.values(assignments)
      .filter(Boolean)
      .flatMap(tpl =>
        (tpl.session_template_exercises || []).map(e => ({
          name: e.name,
          primary: e.primary_muscles || [],
          secondary: e.secondary_muscles || [],
          enabled: true,
        }))
      );
    const muscleMap = buildMuscleMapFromExercises(allExercises);
    const primary = new Set(allExercises.flatMap(e => e.primary || []));
    const secondary = new Set(allExercises.flatMap(e => (e.secondary || []).filter(id => !primary.has(id))));

    const counts = {};
    primary.forEach(id => { counts[id] = { primary: 1, secondary: 0 }; });
    secondary.forEach(id => {
      if (!counts[id]) counts[id] = { primary: 0, secondary: 1 };
    });

    return { primary, secondary, muscleMap, counts };
  }, [assignments]);

  const sessionCount = useMemo(
    () => Object.values(assignments).filter(Boolean).length,
    [assignments]
  );

  const muscleGroupCount = useMemo(
    () => new Set([...projectedData.primary, ...projectedData.secondary]).size,
    [projectedData]
  );

  const untrainedMuscleIds = useMemo(() => {
    const trained = new Set([...projectedData.primary, ...projectedData.secondary]);
    return Object.keys(MUSCLES).filter(id => !trained.has(id));
  }, [projectedData]);

  const showForslag = untrainedMuscleIds.length >= 2 && sessionCount > 0;

  const forslagTemplates = useMemo(() => {
    if (!showForslag) return [];
    const untrainedSet = new Set(untrainedMuscleIds);
    return templates
      .map(tpl => {
        const exercises = (tpl.session_template_exercises || []).map(e => ({
          name: e.name,
          primary: e.primary_muscles || [],
          secondary: e.secondary_muscles || [],
          enabled: true,
        }));
        const { primary, secondary } = calcMuscles(exercises);
        const covered = [...primary, ...secondary].filter(id => untrainedSet.has(id)).length;
        return { tpl, covered };
      })
      .filter(x => x.covered > 0)
      .sort((a, b) => b.covered - a.covered)
      .slice(0, 3)
      .map(x => x.tpl);
  }, [showForslag, untrainedMuscleIds, templates]);

  const loadPlan = useCallback(async (iso) => {
    setLoading(true);
    setSaveError(null);
    try {
      const [{ days }, tpls] = await Promise.all([fetchWeekPlan(iso), fetchTemplates()]);
      setTemplates(tpls);
      const map = {};
      (days || []).forEach(d => {
        map[d.day_of_week] = d.session_templates || null;
      });
      setAssignments(map);
      setSavedAssignments(map);
    } catch (e) {
      logDevError("Planlegger/loadPlan", e);
      setSaveError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan(weekIso);
  }, [weekIso, loadPlan]);

  useEffect(() => {
    if (pickerDow === null) return;
    const handler = (e) => { if (e.key === "Escape") setPickerDow(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pickerDow]);

  const handleAssign = (dow, tpl) => {
    setAssignments(prev => ({ ...prev, [dow]: tpl }));
    setPickerDow(null);
  };

  const handleRemove = (dow) => {
    setAssignments(prev => ({ ...prev, [dow]: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const asgn = Object.entries(assignments)
        .filter(([, tpl]) => tpl)
        .map(([dow, tpl]) => ({ day_of_week: parseInt(dow, 10), template_id: tpl.id }));
      await saveWeekPlan(weekIso, asgn);
      setSavedAssignments({ ...assignments });
    } catch (e) {
      logDevError("Planlegger/saveWeekPlan", e);
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteWeekPlan(weekIso);
      setAssignments({});
      setSavedAssignments({});
      setConfirmDelete(false);
    } catch (e) {
      logDevError("Planlegger/deleteWeekPlan", e);
      setSaveError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const hasSavedPlan = Object.values(savedAssignments).some(Boolean);

  return (
    <PageShell>
      <div style={{ paddingBottom: 80 }}>

        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <button
            aria-label={t("planlegger.prevWeek")}
            onClick={() => setWeekOffset(o => o - 1)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cds-icon-primary)", display: "flex", alignItems: "center" }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{
            fontFamily: "var(--cds-font-mono)",
            fontSize: 12,
            letterSpacing: "0.12em",
            color: "var(--cds-text-secondary)",
            minWidth: 180,
            textAlign: "center",
          }}>
            {weekLabel}
          </span>
          <button
            aria-label={t("planlegger.nextWeek")}
            onClick={() => setWeekOffset(o => o + 1)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cds-icon-primary)", display: "flex", alignItems: "center" }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <PageHeading>{t("planlegger.heading")}</PageHeading>

        {loading ? (
          <InlineLoading description={t("planlegger.loadingPlan")} status="active" style={{ padding: "0 16px" }} />
        ) : (
          <>
            {/* Projected coverage */}
            <SectionLabel>{t("planlegger.projectedCoverage")}</SectionLabel>

            <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", padding: "0 16px", marginBottom: 12 }}>
              {t("planlegger.weekSummary", { count: sessionCount, muscleCount: muscleGroupCount })}
            </p>

            {/* Body map */}
            {isMobile ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, paddingLeft: 16 }}>
                  {["front", "back"].map(v => (
                    <Button key={v} kind={mobileBodyView === v ? "primary" : "ghost"} size="sm"
                      onClick={() => setMobileBodyView(v)}>
                      {v === "front" ? t("bodyPanel.front") : t("bodyPanel.back")}
                    </Button>
                  ))}
                </div>
                <div style={{ maxWidth: 240, margin: "0 auto", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                  <HeatmapBodySVG
                    view={mobileBodyView}
                    counts={projectedData.counts}
                    maxCount={1}
                    exerciseMap={projectedData.muscleMap}
                    onHover={setHoveredMuscle}
                    hovered={hoveredMuscle}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: "0 16px" }}>
                {["front", "back"].map(view => (
                  <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <HeatmapBodySVG
                      view={view}
                      counts={projectedData.counts}
                      maxCount={1}
                      exerciseMap={projectedData.muscleMap}
                      onHover={setHoveredMuscle}
                      hovered={hoveredMuscle}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ height: 48, margin: "0 16px 12px", overflow: "hidden" }}>
              {hoveredMuscle && projectedData.muscleMap[hoveredMuscle]?.length > 0 && (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--accent-bg-08)",
                  border: "1px solid var(--accent-bg-30)",
                  fontSize: 13,
                  color: "var(--cds-text-primary)",
                }}>
                  <span style={{ fontWeight: 600 }}>{t(`muscles.${hoveredMuscle}`, { defaultValue: MUSCLES[hoveredMuscle]?.label })}:</span>{" "}
                  {projectedData.muscleMap[hoveredMuscle].join(", ")}
                </div>
              )}
            </div>

            {/* Gaps card */}
            {showForslag && (
              <div style={{
                margin: "0 16px 16px",
                padding: "14px 16px",
                background: "var(--cds-notification-background-warning, #1c1500)",
                border: "1px solid var(--cds-support-warning, #f1c21b)",
                borderInlineStart: "3px solid var(--cds-support-warning, #f1c21b)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--cds-text-primary)", marginBottom: 8 }}>
                  {t("planlegger.gapsCard", { count: untrainedMuscleIds.length })}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: forslagTemplates.length > 0 ? 10 : 0 }}>
                  {untrainedMuscleIds.map(id => (
                    <AccentChip key={id}>{t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}</AccentChip>
                  ))}
                </div>
                {forslagTemplates.length > 0 && (
                  <>
                    <p style={{ fontSize: 12, color: "var(--cds-text-secondary)", marginBottom: 6 }}>
                      {t("planlegger.templatesCovering")}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {forslagTemplates.map(tpl => (
                        <span key={tpl.id} style={{ fontSize: 13, color: "var(--cds-text-primary)" }}>
                          · {tpl.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Week plan */}
            <SectionLabel>{t("planlegger.weekPlan")}</SectionLabel>

            {saveError && (
              <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={saveError} hideCloseButton
                style={{ margin: "0 16px 12px" }} />
            )}

            <div style={{ border: "1px solid var(--cds-border-subtle-01)", margin: "0 16px" }}>
              {Array.from({ length: 7 }, (_, i) => i + 1).map(dow => (
                <DayRow
                  key={dow}
                  dow={dow}
                  date={weekDates[dow - 1]}
                  template={assignments[dow] || null}
                  onAdd={setPickerDow}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {/* Confirm delete strip */}
            {confirmDelete && (
              <div style={{
                margin: "12px 16px 0",
                padding: "12px 14px",
                background: "var(--cds-layer-01)",
                border: "1px solid var(--cds-support-error)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}>
                <span style={{ fontSize: 13, color: "var(--cds-text-primary)" }}>
                  {t("planlegger.confirmDelete")}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button kind="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    kind="danger"
                    size="sm"
                    renderIcon={deleting ? undefined : TrashCan}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? t("planlegger.removing") : t("planlegger.remove")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky action bar */}
      {!loading && (
        <StickyCta>
          <div style={{ display: "flex", gap: 8, padding: "0 16px" }}>
            {hasSavedPlan && !confirmDelete && (
              <Button
                kind="ghost"
                size="md"
                renderIcon={TrashCan}
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
              >
                {t("planlegger.removeWeek")}
              </Button>
            )}
            <Button
              kind="primary"
              size="md"
              onClick={handleSave}
              disabled={saving || deleting}
              style={{ flex: 1 }}
            >
              {saving ? <InlineLoading description={t("common.saving")} status="active" /> : t("planlegger.savePlan")}
            </Button>
          </div>
        </StickyCta>
      )}

      {/* Template picker bottom sheet */}
      {pickerDow !== null && (
        <TemplatePickerSheet
          templates={templates}
          onSelect={(tpl) => handleAssign(pickerDow, tpl)}
          onClose={() => setPickerDow(null)}
        />
      )}
    </PageShell>
  );
}

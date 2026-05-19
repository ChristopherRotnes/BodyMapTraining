import { Button, Select, SelectItem, DatePicker, DatePickerInput, InlineNotification } from "@carbon/react";
import { Add, ArrowLeft, ArrowRight, Edit } from "@carbon/icons-react";
import ExerciseRowWithAutocomplete from "./ExerciseRowWithAutocomplete";
import { SectionLabel, StickyCta } from "./PageShell";
import { EX_DB } from "../lib/bodymap";
import { toIsoDate, getIntlLocale } from "../lib/utils";
import { useTranslation } from "react-i18next";

function getConfidenceColor(ex) {
  if (ex.primary?.length || ex.secondary?.length) return "var(--heat-4)";
  const txt = ((ex.name || "") + " " + (ex.standardName || "")).toLowerCase();
  for (const rule of EX_DB) {
    if (rule.kw.some(k => txt.includes(k))) return "var(--cds-support-warning)";
  }
  return "var(--cds-support-error)";
}

export default function MuscleMapConfirm({
  exercises, gymSessions, gymSessionId, gymCalendarConflict, sessionDate,
  useTodayDate, setUseTodayDate, editingId, libraryExercises,
  newExerciseIds, setNewExerciseIds, dispatch, onConfirm,
}) {
  const { t } = useTranslation();
  const todayStr = toIsoDate(new Date());
  const todayDisplay = (() => { const [y, m, d] = todayStr.split("-"); return `${d}/${m}/${y}`; })();
  const hasEnabled = exercises.some(e => e.enabled && e.name);

  return (
    <div style={{ background: "var(--cds-layer-02)", borderTop: "2px solid var(--accent)" }}>
      <SectionLabel renderIcon={Edit} style={{ margin: "12px 16px 4px" }}>
        {t("muscleMap.confirmLabel")}
      </SectionLabel>
      <div className="fade-in" style={{ padding: "0 16px" }}>

        <div style={{ marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 56, color: "var(--accent)", lineHeight: 1, display: "block" }}>
            {exercises.length}
          </span>
          <span style={{ fontSize: 20, color: "var(--cds-text-primary)" }}>{t("muscleMap.foundExercises", { count: exercises.length })}</span>
        </div>

        <button
          onClick={() => dispatch({ type: "SET_STEP", step: "upload" })}
          style={{
            background: "none", border: "none", padding: "8px 0 20px", cursor: "pointer",
            color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-sans)", fontSize: 13,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <ArrowLeft size={14} /> {t("common.back")}
        </button>

        {/* Today / other day segmented pill */}
        <div style={{ display: "flex", borderRadius: "var(--r-pill)", border: "1px solid var(--border-subtle-wl)", overflow: "hidden", marginBottom: 16 }}>
          <button
            onClick={() => { setUseTodayDate(true); dispatch({ type: "SET_SESSION_DATE", date: todayStr }); }}
            style={{
              flex: 1, padding: "10px 0",
              background: useTodayDate ? "var(--accent-active)" : "transparent",
              color: useTodayDate ? "#fff" : "var(--cds-text-primary)",
              border: "none", cursor: "pointer",
              fontFamily: "var(--cds-font-sans)", fontSize: 13, fontWeight: useTodayDate ? 600 : 400,
              transition: "background 120ms ease",
            }}
          >
            {t("muscleMap.today")}
          </button>
          <button
            onClick={() => setUseTodayDate(false)}
            style={{
              flex: 1, padding: "10px 0",
              background: !useTodayDate ? "var(--accent-active)" : "transparent",
              color: !useTodayDate ? "#fff" : "var(--cds-text-primary)",
              border: "none", borderLeft: "1px solid var(--border-subtle-wl)", cursor: "pointer",
              fontFamily: "var(--cds-font-sans)", fontSize: 13, fontWeight: !useTodayDate ? 600 : 400,
              transition: "background 120ms ease",
            }}
          >
            {t("muscleMap.otherDay")}
          </button>
        </div>

        {!useTodayDate && (
          <DatePicker
            datePickerType="single"
            dateFormat="d/m/Y"
            value={(() => { const [y, m, d] = sessionDate.split("-"); return `${d}/${m}/${y}`; })()}
            maxDate={todayDisplay}
            onChange={([date]) => {
              if (!date) return;
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              dispatch({ type: "SET_SESSION_DATE", date: `${y}-${m}-${d}` });
            }}
            style={{ marginBottom: 16 }}
          >
            <DatePickerInput id="session-date" labelText={t("muscleMap.dateLabel")} placeholder={t("muscleMap.datePlaceholder")} size="md" />
          </DatePicker>
        )}

        {gymSessions.length > 0 && (
          <Select
            id="gym-session-select"
            labelText={t("muscleMap.selectGymSession")}
            value={gymSessionId}
            onChange={(e) => dispatch({ type: "SET_GYM_SESSION_ID", id: e.target.value })}
            style={{ marginBottom: gymCalendarConflict ? 8 : 16 }}
          >
            <SelectItem value="" text={t("muscleMap.selectGymOptional")} />
            {gymSessions.map(s => {
              const time = new Intl.DateTimeFormat(getIntlLocale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(s.start_time));
              const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
              return <SelectItem key={s.id} value={s.id} text={label} />;
            })}
          </Select>
        )}

        {gymCalendarConflict && (
          <InlineNotification
            kind="warning"
            title={t("muscleMap.conflictTitle")}
            subtitle={t("muscleMap.conflictBody", { date: gymCalendarConflict.session_date })}
            hideCloseButton
            style={{ marginBottom: 16 }}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          {exercises.map((ex) => (
            <div key={ex.id} style={{ position: "relative" }}>
              <ExerciseRowWithAutocomplete
                exercise={ex}
                autoFocusName={ex.id === editingId}
                isNew={newExerciseIds.has(ex.id)}
                libraryExercises={libraryExercises}
                validateNumbers
                onChange={(updates) => dispatch({ type: "UPDATE_EXERCISE", id: ex.id, updates })}
                onDelete={() => dispatch({ type: "DELETE_EXERCISE", id: ex.id })}
              />
              <div
                title={
                  (ex.primary?.length || ex.secondary?.length)
                    ? t("muscleMap.musclesViaClaude")
                    : (() => {
                        const txt = ((ex.name || "") + " " + (ex.standardName || "")).toLowerCase();
                        return EX_DB.some(r => r.kw.some(k => txt.includes(k)))
                          ? t("muscleMap.musclesViaDB")
                          : t("muscleMap.musclesUnknown");
                      })()
                }
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 10, right: 42,
                  width: 7, height: 7,
                  borderRadius: "50%",
                  background: getConfidenceColor(ex),
                  pointerEvents: "none",
                }}
              />
            </div>
          ))}
        </div>

        <Button
          kind="ghost"
          renderIcon={Add}
          onClick={() => {
            const id = Date.now();
            setNewExerciseIds(s => new Set(s).add(id));
            dispatch({ type: "ADD_EXERCISE", exercise: { id, name: "", standardName: "", enabled: true } });
          }}
          style={{ width: "100%", marginBottom: 16 }}
        >
          {t("muscleMap.addManual")}
        </Button>

        <StickyCta>
          <button
            onClick={onConfirm}
            disabled={!hasEnabled}
            style={{
              width: "100%", padding: "14px 20px",
              background: hasEnabled ? "var(--accent-active)" : "var(--cds-layer-01)",
              border: "none",
              borderRadius: "var(--r-pill)",
              color: hasEnabled ? "#fff" : "var(--text-muted-wl)",
              fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 15,
              cursor: hasEnabled ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>{t("muscleMap.saveAndShow")}</span>
            <ArrowRight size={16} />
          </button>
        </StickyCta>
      </div>
    </div>
  );
}

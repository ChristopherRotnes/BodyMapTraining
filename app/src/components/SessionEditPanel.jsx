import { Button, Tag, InlineNotification, InlineLoading, Select, SelectItem } from "@carbon/react";
import { Camera, Add, Renew } from "@carbon/icons-react";
import ExerciseRowWithAutocomplete from "./ExerciseRowWithAutocomplete";
import BodyPanel from "./BodyPanel";
import { checkGymCalendarConflict } from "../lib/db";
import { MUSCLES } from "../lib/bodymap.jsx";
import { getIntlLocale } from "../lib/utils";
import { useTranslation } from "react-i18next";

export default function SessionEditPanel({
  session, edit, isFilterMatch,
  sessionMuscles, sessionMuscleMap,
  hoveredMuscle, onHoverMuscle,
  libraryExercises, classHistory,
  fileRef, uploadingForSessionRef,
  onPatch, onDiscard, onSave, onReanalyze,
}) {
  const { t } = useTranslation();
  const isDirty = edit.dirty || false;
  const isSaving = edit.saving || false;
  const gymSessions = edit.gymSessions || [];
  const gymSessionId = edit.gymSessionId ?? (session.gym_calendar_id || "");
  const gymConflict = edit.gymConflict;
  const isAnalyzing = edit.analyzing || false;
  const workExercises = edit.exercises;
  const hasErrors = workExercises && workExercises.some(e => e.enabled && !e.name?.trim());

  return (
    <div id={`session-content-${session.id}`} aria-live="polite" style={{ border: "1px solid var(--border-subtle-wl)", borderTop: "none", borderInlineStart: isFilterMatch ? "3px solid var(--accent)" : "3px solid var(--border-subtle-wl)", padding: "16px 14px", marginBottom: 0 }}>

      {gymSessions.length > 0 ? (
        <>
          <Select
            id={`gym-session-${session.id}`}
            labelText={t("history.gymClassLabel")}
            value={gymSessionId}
            onChange={(e) => {
              const newId = e.target.value;
              onPatch({ gymSessionId: newId, gymConflict: null, dirty: true });
              if (newId && newId !== (session.gym_calendar_id || "")) {
                checkGymCalendarConflict(newId, session.id)
                  .then(c => onPatch({ gymConflict: c }))
                  .catch(() => {});
              }
            }}
            style={{ marginBottom: gymConflict ? 8 : 16 }}
          >
            <SelectItem value="" text={t("history.noClassSelected")} />
            {gymSessions.map(s => {
              const time = new Date(s.start_time).toLocaleTimeString(getIntlLocale(), { hour: "2-digit", minute: "2-digit" });
              const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
              return <SelectItem key={s.id} value={s.id} text={label} />;
            })}
          </Select>
          {gymConflict && (
            <InlineNotification kind="warning" title={t("history.conflictWarningTitle")}
              subtitle={t("history.conflictWarningBody", { date: gymConflict.session_date })}
              hideCloseButton style={{ marginBottom: 16 }} />
          )}
        </>
      ) : session.gym_calendar && (
        <div style={{ marginBottom: 12 }}>
          <Tag type="outline" size="sm">{session.gym_calendar.name}</Tag>
        </div>
      )}

      <BodyPanel
        primary={sessionMuscles.primary}
        secondary={sessionMuscles.secondary}
        muscleMap={sessionMuscleMap}
        onHover={onHoverMuscle}
        hovered={hoveredMuscle}
        marginBottom={0}
      />

      <div style={{ height: 68, marginBottom: 16, overflow: "hidden" }}>
        {hoveredMuscle ? (
          <div style={{ borderInlineStart: "3px solid var(--accent)", background: "var(--surface-card)", padding: "10px 14px" }}>
            <div style={{ fontSize: 10, fontFamily: "var(--cds-font-mono)", color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
              {t(`muscles.${hoveredMuscle}`, { defaultValue: MUSCLES[hoveredMuscle]?.label })}
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "baseline", overflow: "hidden" }}>
              <div style={{ flexShrink: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--cds-font-sans)", color: "var(--cds-text-primary)" }}>
                  {(sessionMuscleMap[hoveredMuscle] || []).length}
                </span>
                <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", marginLeft: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {t("common.exercises")}
                </span>
              </div>
              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.08em", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>
                {(sessionMuscleMap[hoveredMuscle] || []).join(" · ")}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)", padding: "10px 0", letterSpacing: "0.08em" }}>
            {t("history.hoverHint")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Tag type="green" size="sm">{t("history.primaryCount", { count: sessionMuscles.primary.length })}</Tag>
        <Tag type="blue" size="sm">{t("history.secondaryCount", { count: sessionMuscles.secondary.length })}</Tag>
      </div>

      <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--border-subtle-wl)", padding: 14, marginBottom: 12 }}>
        {workExercises && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {workExercises.map((ex) => (
              <ExerciseRowWithAutocomplete
                key={ex.id}
                exercise={ex}
                autoFocusName={edit.newExIds?.has(ex.id)}
                onChange={(updates) => onPatch({
                  exercises: workExercises.map(e => e.id === ex.id ? { ...e, ...updates } : e),
                  dirty: true,
                })}
                onDelete={() => onPatch({
                  exercises: workExercises.filter(e => e.id !== ex.id),
                  dirty: true,
                })}
                layer="layer-02"
                validateNumbers
                libraryExercises={libraryExercises}
                isNew={edit.newExIds?.has(ex.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Button kind="ghost" renderIcon={Add} size="sm"
          onClick={() => {
            const id = Date.now();
            onPatch({
              exercises: [...(workExercises || []), { id, name: "", standardName: "", primary: [], secondary: [], enabled: true }],
              newExIds: new Set([...(edit.newExIds || []), id]),
              dirty: true,
            });
          }}
        >
          {t("muscleMap.addManual")}
        </Button>
        <Button kind="ghost" renderIcon={isAnalyzing ? Renew : Camera} size="sm" disabled={isAnalyzing}
          onClick={() => { uploadingForSessionRef.current = session; fileRef.current?.click(); }}>
          {isAnalyzing ? t("history.analyzing") : t("history.reuploadPhoto")}
        </Button>
      </div>

      {session.gym_calendar_id && (() => {
        const ch = classHistory.get(session.gym_calendar_id);
        if (!ch) return null;
        if (ch.loading) return (
          <div style={{ marginBottom: 12 }}>
            <InlineLoading description={t("history.classHistoryLoading")} />
          </div>
        );
        if (ch.error) return (
          <InlineNotification kind="error" title={t("history.classHistoryError")} hideCloseButton style={{ marginBottom: 12 }} />
        );
        if (!ch.sessions.length) return null;
        return (
          <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--border-subtle-wl)", padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted-wl)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
              {t("history.classHistory")}
            </p>
            {ch.sessions.map(cs => {
              const name = cs.profiles?.display_name || t("history.classHistoryInstructor");
              const exs = (cs.session_exercises || []).filter(e => e.name);
              return (
                <div key={cs.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle-wl)" }}>
                  <p style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, color: "var(--cds-text-primary)", margin: "0 0 6px", borderInlineStart: "3px solid var(--accent)", paddingInlineStart: 8 }}>
                    {name}
                  </p>
                  {exs.map(ex => (
                    <div key={ex.id} style={{ padding: "3px 0", fontSize: 13, color: "var(--cds-text-secondary)" }}>
                      {ex.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })()}

      <input ref={fileRef} id="session-image-upload" name="session-image-upload" type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files[0] && uploadingForSessionRef.current) {
            onReanalyze(e.target.files[0]);
          }
          e.target.value = "";
          uploadingForSessionRef.current = null;
        }} />

      {isDirty && (
        <>
          {edit.analyzeError && (
            <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={edit.analyzeError} hideCloseButton style={{ marginBottom: 8 }} />
          )}
          {edit.saveError && (
            <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={edit.saveError} hideCloseButton style={{ marginBottom: 8 }} />
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Button kind="ghost" onClick={onDiscard}>{t("common.discard")}</Button>
            <Button kind="primary" disabled={isSaving || hasErrors}
              onClick={onSave} style={{ marginLeft: "auto" }}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

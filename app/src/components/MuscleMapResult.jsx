import { Button, Tag, InlineNotification, InlineLoading, DefinitionTooltip } from "@carbon/react";
import { AiRecommend, Renew } from "@carbon/icons-react";
import BodyPanel from "./BodyPanel";
import { AccentChip } from "./PageShell";
import { MUSCLES } from "../lib/bodymap";
import { buildRecMuscleMap } from "../lib/utils";
import { useTranslation } from "react-i18next";

export default function MuscleMapResult({
  muscles, exercises, totalMuscles, enabledCount,
  recs, loadingRecs, recsError,
  saving, saved, saveError,
  exerciseMuscleMap,
  onRecommend, dispatch,
}) {
  const { t } = useTranslation();
  return (
    <div className="fade-in" style={{ padding: "0 16px" }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, color: "var(--cds-text-primary)", marginBottom: 2 }}>{t("muscleMap.hitMuscles1")}</div>
        <span style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 56, color: "var(--accent)", lineHeight: 1, display: "block" }}>
          {totalMuscles}
        </span>
        <div style={{ fontSize: 20, color: "var(--cds-text-primary)" }}>{t("muscleMap.hitMuscles2")}</div>
      </div>

      <div style={{
        display: "flex",
        background: "var(--surface-card)",
        borderRadius: "var(--r-tile)",
        border: "1px solid var(--border-subtle-wl)",
        marginBottom: 20,
        overflow: "hidden",
      }}>
        {[
          { label: t("common.exercises"), value: enabledCount },
          { label: t("muscleMap.kpiMuscles"), value: totalMuscles },
          { label: t("muscleMap.kpiTime"), value: "—" },
        ].map((tile, i) => (
          <div key={i} style={{
            flex: 1, padding: "14px 0", textAlign: "center",
            borderRight: i < 2 ? "1px solid var(--border-subtle-wl)" : "none",
          }}>
            <div style={{ fontFamily: "var(--cond)", fontWeight: 600, fontSize: 28, color: "var(--cds-text-primary)", lineHeight: 1 }}>
              {tile.value}
            </div>
            <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
              {tile.label}
            </div>
          </div>
        ))}
      </div>

      <div aria-live="polite" style={{ marginBottom: 16, minHeight: 24, display: "flex", justifyContent: "flex-end" }}>
        {saving && <InlineLoading description={t("common.saving")} status="active" />}
        {saved && <InlineLoading description={t("common.saved")} status="finished" />}
        {saveError && <InlineLoading description={t("muscleMap.savingError")} status="error" />}
      </div>

      <BodyPanel
        primary={muscles.primary}
        secondary={muscles.secondary}
        muscleMap={exerciseMuscleMap}
        marginBottom={20}
      />

      {(muscles.primary.length > 0 || muscles.secondary.length > 0) && (
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 16, marginBottom: 16 }}>
          <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
            {t("muscleMap.trainedMuscles")}
          </p>
          {muscles.primary.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: muscles.secondary.length > 0 ? 10 : 0 }}>
              {muscles.primary.map(id => (
                <AccentChip key={id}>{t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}</AccentChip>
              ))}
            </div>
          )}
          {muscles.secondary.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {muscles.secondary.map(id => (
                <span key={id} style={{
                  display: "inline-block",
                  borderRadius: "var(--r-pill)", padding: "3px 10px",
                  background: "var(--cds-layer-01)", border: "1px solid var(--border-subtle-wl)",
                  color: "var(--text-muted-wl)", fontFamily: "var(--cds-font-mono)",
                  fontSize: 11, letterSpacing: "0.06em",
                }}>
                  {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 16, marginBottom: 16 }}>
        <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          {t("muscleMap.exercisesThisSession")}
        </p>
        {exercises.filter(e => e.enabled && e.name).map(ex => {
          const muscleLabels = [...(ex.primary || []), ...(ex.secondary || [])].map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ");
          return (
            <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--border-subtle-wl)", color: "var(--cds-text-primary)" }}>
              <span>
                {muscleLabels ? (
                  <DefinitionTooltip definition={muscleLabels} openOnHover align="bottom">{ex.name}</DefinitionTooltip>
                ) : ex.name}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        kind="tertiary"
        renderIcon={AiRecommend}
        onClick={onRecommend}
        disabled={loadingRecs}
        style={{ width: "100%", maxWidth: "100%", marginBottom: 10 }}
      >
        {loadingRecs ? t("muscleMap.loadingRecs") : t("muscleMap.getRecommendations")}
      </Button>

      {recsError && (
        <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={recsError} hideCloseButton style={{ marginBottom: 10 }} />
      )}

      {recs && recs.length > 0 && (() => {
        const recPrimary  = [...new Set(recs.flatMap(r => r.primary || []))];
        const recSecAll   = [...new Set(recs.flatMap(r => r.secondary || []))];
        const recSecondary = recSecAll.filter(id => !recPrimary.includes(id));
        return (
          <div className="fade-in">
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-tile)", padding: 14, marginBottom: 10 }}>
              <p style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--text-muted-wl)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                {t("muscleMap.recommendedExercises")}
              </p>
              {recs.map((r, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle-wl)" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--cds-text-primary)" }}>{r.name}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: r.tip ? 4 : 0 }}>
                    {(r.primary || []).length > 0 && (
                      <Tag type="green" size="sm">{r.primary.map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ")}</Tag>
                    )}
                    {(r.secondary || []).length > 0 && (
                      <Tag type="blue" size="sm">{r.secondary.map(id => t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })).join(", ")}</Tag>
                    )}
                  </div>
                  {r.tip && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{r.tip}</p>}
                </div>
              ))}
            </div>

            <BodyPanel
              primary={recPrimary}
              secondary={recSecondary}
              muscleMap={buildRecMuscleMap(recs)}
              marginBottom={10}
            />

            <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
              <Tag type="green" size="sm">{t("muscleMap.primaryTag")}</Tag>
              <Tag type="blue" size="sm">{t("muscleMap.secondaryTag")}</Tag>
            </div>
          </div>
        );
      })()}

      {recs && recs.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center", marginBottom: 10 }}>
          {t("muscleMap.noRecs")}
        </p>
      )}

      <Button kind="ghost" renderIcon={Renew} onClick={() => dispatch({ type: "RESET" })} style={{ width: "100%", maxWidth: "100%" }}>
        {t("muscleMap.logNew")}
      </Button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button, InlineLoading } from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { SectionLabel, BackButton, AccentChip } from "./PageShell";
import BodyPanel from "./BodyPanel";
import { MUSCLES } from "../lib/bodymap.jsx";
import { fetchTemplateNamesUsingExercise } from "../lib/db";

export default function OvelseDetail({ exercise, onBack, onEdit }) {
  const { t } = useTranslation();
  const [templateNames, setTemplateNames] = useState(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    fetchTemplateNamesUsingExercise(exercise.id)
      .then(setTemplateNames)
      .catch(() => setTemplateNames([]));
  }, [exercise.id]);

  const primary = exercise.primary_muscles || [];
  const secondary = exercise.secondary_muscles || [];
  const count = templateNames?.length ?? null;

  return (
    <div>
      <BackButton onClick={onBack} />
      <SectionLabel>{t("nav.library")}</SectionLabel>

      {/* Name */}
      <p style={{
        fontFamily: "var(--cond)",
        fontSize: 24,
        fontWeight: 700,
        color: "var(--cds-text-primary)",
        padding: "4px 16px 16px",
        margin: 0,
        lineHeight: 1.2,
      }}>
        {exercise.name}
      </p>

      {/* Body map */}
      <BodyPanel
        primary={primary}
        secondary={secondary}
        muscleMap={{}}
        marginBottom={16}
      />

      {/* Muscle tags */}
      <div style={{ padding: "0 16px 16px" }}>
        {primary.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {primary.map(id => (
              <AccentChip key={id}>
                {t(`muscles.${id}`, { defaultValue: MUSCLES[id]?.label || id })}
              </AccentChip>
            ))}
          </div>
        )}
        {secondary.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {secondary.map(id => (
              <span key={id} style={{
                display: "inline-block",
                borderRadius: "var(--r-pill)",
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
        )}
      </div>

      {/* Used in templates */}
      <div style={{ padding: "0 16px 24px" }}>
        {templateNames === null ? (
          <InlineLoading description={t("ovelseDetail.loadingTemplates")} status="active" />
        ) : (
          <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", borderRadius: "var(--r-card)" }}>
            <button
              onClick={() => setTemplatesOpen(o => !o)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: count > 0 ? "pointer" : "default",
                textAlign: "left",
              }}
            >
              <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 12, color: "var(--cds-text-secondary)", letterSpacing: "0.06em" }}>
                {t("ovelseDetail.usedInTemplates", { count })}
              </span>
              {count > 0 && (
                <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--accent-soft)" }}>
                  {templatesOpen ? "▲" : "▼"}
                </span>
              )}
            </button>
            {templatesOpen && count > 0 && (
              <div style={{ borderTop: "1px solid var(--cds-border-subtle-01)", padding: "8px 0" }}>
                {templateNames.map(name => (
                  <p key={name} style={{
                    fontFamily: "var(--cds-font-sans)",
                    fontSize: 13,
                    color: "var(--cds-text-primary)",
                    margin: 0,
                    padding: "6px 16px",
                  }}>
                    {name}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit button */}
      <div style={{ padding: "0 16px" }}>
        <Button kind="secondary" renderIcon={Edit} onClick={() => onEdit(exercise)}>
          {t("ovelseDetail.edit")}
        </Button>
      </div>
    </div>
  );
}

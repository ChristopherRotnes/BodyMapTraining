import { useTranslation } from "react-i18next";
import { Camera, Add, Notebook } from "@carbon/icons-react";
import PageShell, { SectionLabel } from "./PageShell";

function ActionCard({ icon: Icon, label, body, accent, disabled, badge, onClick }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        background: "var(--cds-layer-01)",
        border: "1px solid var(--cds-border-subtle-01)",
        borderInlineStart: accent ? "3px solid var(--accent)" : "3px solid var(--cds-border-subtle-01)",
        borderRadius: "0 var(--r-card) var(--r-card) 0",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        textAlign: "left",
        width: "100%",
      }}
    >
      <Icon size={20} style={{ color: accent ? "var(--accent)" : "var(--cds-text-secondary)" }} />
      <p style={{
        fontFamily: "var(--cond)",
        fontSize: 15,
        fontWeight: 700,
        color: "var(--cds-text-primary)",
        margin: 0,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "var(--cds-font-sans)",
        fontSize: 12,
        color: "var(--cds-text-secondary)",
        margin: 0,
        lineHeight: 1.4,
      }}>
        {body}
      </p>
      {badge && (
        <span style={{
          display: "inline-block",
          fontFamily: "var(--cds-font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--cds-text-secondary)",
          background: "var(--cds-layer-02)",
          borderRadius: "var(--r-pill)",
          padding: "2px 8px",
          marginTop: 4,
          alignSelf: "flex-start",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function SetSammen({ onShowGruppetimePicker, onShowOvelsePicker, onShowNewOvelse }) {
  const { t } = useTranslation();

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <SectionLabel>{t("nav.library")}</SectionLabel>

        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ActionCard
            icon={Notebook}
            label={t("settSammen.lagGruppetime")}
            body={t("settSammen.lagGruppetimerBody")}
            accent
            onClick={onShowGruppetimePicker}
          />
          <ActionCard
            icon={Add}
            label={t("settSammen.nyOvelse")}
            body={t("settSammen.nyOvelseBody")}
            accent
            onClick={onShowNewOvelse}
          />
          <ActionCard
            icon={Camera}
            label={t("settSammen.knipsTavla")}
            body={t("settSammen.knipsTavlaBody")}
            disabled
            badge={t("settSammen.comingSoon")}
          />
        </div>
      </div>
    </PageShell>
  );
}

import { useState, useEffect } from "react";
import { Button, InlineLoading, InlineNotification } from "@carbon/react";
import { Notebook } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import { fetchTemplates } from "../lib/db";
import { logDevError } from "../lib/utils";
import PageShell, { PageTitle, BackButton } from "./PageShell";
import { useNav } from "../lib/NavContext";

export default function TemplatePicker({ onBack, onSelectTemplate }) {
  const { t } = useTranslation();
  const { onShowSetSammen } = useNav();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(e => { logDevError("TemplatePicker/fetchTemplates", e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  const STEPS = [t("templatePicker.step1"), t("templatePicker.step2"), t("templatePicker.step3")];

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <BackButton onClick={onBack} />

        {/* Step indicator */}
        <div role="list" style={{ display: "flex", marginBottom: 28, padding: "0 16px" }}>
          {STEPS.map((label, idx) => {
            const isActive = idx === 0;
            const isComplete = false;
            return (
              <div key={idx} role="listitem" aria-current={isActive ? "step" : undefined} style={{
                flex: 1,
                borderTop: isActive ? "3px solid var(--accent)" : isComplete ? "3px solid var(--accent-bg-55)" : "1px solid var(--border-subtle-wl)",
                paddingTop: 10,
                paddingRight: idx < 2 ? 16 : 0,
              }}>
                <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: isActive ? "var(--accent)" : "var(--text-muted-wl)", letterSpacing: "0.12em" }}>
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 12, color: isActive ? "var(--cds-text-primary)" : "var(--text-muted-wl)", fontWeight: isActive ? 600 : 400, marginTop: 2 }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <PageTitle>{t("templatePicker.title")}</PageTitle>

        <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 20 }}>
          {t("templatePicker.description")}
        </p>

        {error && (
          <InlineNotification kind="error" title={`${t("common.error")}:`} subtitle={error} hideCloseButton
            style={{ marginBottom: 16 }} />
        )}

        {loading ? (
          <InlineLoading description={t("templatePicker.loading")} status="active" />
        ) : templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
              {t("templatePicker.noTemplates")}
            </p>
            <Button kind="primary" renderIcon={Notebook} onClick={onShowSetSammen}>
              {t("templatePicker.goToLibrary")}
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {templates.map(tpl => {
              const exCount = tpl.session_template_exercises?.length || 0;
              return (
                <button
                  key={tpl.id}
                  onClick={() => onSelectTemplate(tpl)}
                  style={{
                    background: "var(--cds-layer-01)",
                    border: "1px solid var(--cds-border-subtle-01)",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--cds-layer-hover-01)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--cds-layer-01)"}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--cds-text-primary)" }}>
                    {tpl.name}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                    {t("templatePicker.exerciseCount", { count: exCount })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

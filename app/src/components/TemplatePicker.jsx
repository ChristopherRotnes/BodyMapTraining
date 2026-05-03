import { useState, useEffect } from "react";
import { Button, InlineLoading, InlineNotification } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import { fetchTemplates } from "../lib/db";
import { logDevError } from "../lib/utils";
import PageShell, { PageTitle, BackButton } from "./PageShell";
import { useNav } from "../lib/NavContext";

export default function TemplatePicker({ onBack, onSelectTemplate }) {
  const { onShowBibliotek } = useNav();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(e => { logDevError("TemplatePicker/fetchTemplates", e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <div style={{ paddingBottom: 32 }}>
        <BackButton onClick={onBack} />
        <PageTitle>Velg mal</PageTitle>

        <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 20 }}>
          Velg en mal for å starte en økt med forhåndsutfylte øvelser.
        </p>

        {error && (
          <InlineNotification kind="error" title="Feil:" subtitle={error} hideCloseButton
            style={{ marginBottom: 16 }} />
        )}

        {loading ? (
          <InlineLoading description="Laster maler…" status="active" />
        ) : templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
              Ingen maler opprettet ennå.
            </p>
            <Button kind="primary" renderIcon={Book} onClick={onShowBibliotek}>
              Gå til biblioteket
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {templates.map(tpl => {
              const exCount = tpl.session_template_exercises?.length || 0;
              const usedAt = tpl.used_at
                ? new Date(tpl.used_at).toLocaleDateString("no-NO")
                : null;
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
                    {exCount} {exCount === 1 ? "øvelse" : "øvelser"}
                    {usedAt ? ` · Sist brukt ${usedAt}` : ""}
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

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Button, Tag, InlineLoading } from "@carbon/react";
import { Camera } from "@carbon/icons-react";
import { BodySVG, MUSCLES } from "../lib/bodymap.jsx";
import { fetchLastSession } from "../lib/db";
import PageShell, { PageTitle } from "./PageShell";

function extractMuscles(session) {
  const primary = new Set();
  const secondary = new Set();
  (session.session_exercises || []).forEach(ex => {
    (ex.muscle_activations || []).forEach(ma => {
      if (ma.activation_type === "primary") primary.add(ma.muscle_id);
      else secondary.add(ma.muscle_id);
    });
  });
  primary.forEach(m => secondary.delete(m));
  return { primary: [...primary], secondary: [...secondary] };
}

function formatDate(isoDate) {
  const raw = format(parseISO(isoDate), "EEEE d. MMMM", { locale: nb });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function Home({ onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek, currentView, onShowHistoryWithDate }) {
  const [lastSession, setLastSession] = useState(undefined);

  useEffect(() => {
    fetchLastSession()
      .then(setLastSession)
      .catch(() => setLastSession(null));
  }, []);

  const muscles = lastSession ? extractMuscles(lastSession) : null;

  return (
    <PageShell
      onShowHome={onShowHome}
      onShowLogger={onShowLogger}
      onShowHistory={onShowHistory}
      onShowReport={onShowReport}
      onShowBibliotek={onShowBibliotek}
      currentView={currentView}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>

        <Button renderIcon={Camera} onClick={onShowLogger} style={{ width: "100%" }}>
          Logg ny økt
        </Button>

        {lastSession === undefined && (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <InlineLoading description="Laster siste økt…" />
          </div>
        )}

        {lastSession && muscles && (
          <div
            style={{
              background: "var(--cds-layer-01)",
              border: "1px solid var(--cds-border-subtle-01)",
              padding: 16,
              cursor: "pointer",
            }}
            onClick={() => onShowHistoryWithDate(lastSession.session_date)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && onShowHistoryWithDate(lastSession.session_date)}
            aria-label="Se siste økt i historikk"
          >
            <PageTitle>Siste økt</PageTitle>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: lastSession.gym_calendar?.name ? 2 : 10 }}>
                  {formatDate(lastSession.session_date)}
                </div>
                {lastSession.gym_calendar?.name && (
                  <div style={{ fontSize: 13, color: "var(--cds-text-secondary)", marginBottom: 10 }}>
                    {lastSession.gym_calendar.name}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {muscles.primary.map(m => (
                    <Tag key={m} type="green" size="sm">{MUSCLES[m]?.label ?? m}</Tag>
                  ))}
                  {muscles.secondary.map(m => (
                    <Tag key={m} type="blue" size="sm">{MUSCLES[m]?.label ?? m}</Tag>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <div style={{ width: 55 }}>
                  <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="front" />
                </div>
                <div style={{ width: 55 }}>
                  <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="back" />
                </div>
              </div>
            </div>
          </div>
        )}

        {lastSession === null && (
          <div style={{
            background: "var(--cds-layer-01)",
            border: "1px solid var(--cds-border-subtle-01)",
            padding: 24,
            textAlign: "center",
            color: "var(--cds-text-secondary)",
            fontSize: 14,
          }}>
            Ingen økter logget ennå. Logg din første økt!
          </div>
        )}

      </div>
    </PageShell>
  );
}

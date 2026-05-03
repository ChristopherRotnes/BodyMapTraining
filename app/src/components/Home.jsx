import React, { useState, useEffect } from "react";
import { format, parseISO, startOfISOWeek, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Tag, InlineLoading } from "@carbon/react";
import { Camera } from "@carbon/icons-react";
import { BodySVG, MUSCLES } from "../lib/bodymap.jsx";
import { fetchLastSession, fetchThisWeekSessions } from "../lib/db";
import PageShell, { SectionLabel, PageHeading } from "./PageShell";

const DAY_LABELS = ["M", "T", "O", "T", "F", "L", "S"];

function heatColor(count) {
  if (!count) return "var(--cds-layer-01)";
  if (count <= 1) return "var(--heat-1)";
  if (count <= 3) return "var(--heat-2)";
  if (count <= 5) return "var(--heat-3)";
  if (count <= 7) return "var(--heat-4)";
  return "var(--heat-5)";
}

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

function formatSessionDate(isoDate) {
  const raw = format(parseISO(isoDate), "EEEE d. MMMM", { locale: nb });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatToday() {
  const raw = format(new Date(), "EEEE d. MMMM", { locale: nb });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function Home({
  onShowHome, onShowLogger, onShowHistory, onShowReport,
  onShowBibliotek, onShowBibliotekMaler, currentView, onShowHistoryWithDate,
}) {
  const [lastSession, setLastSession] = useState(undefined);
  const [weekSessions, setWeekSessions] = useState(undefined);

  useEffect(() => {
    fetchLastSession().then(setLastSession).catch(() => setLastSession(null));
    fetchThisWeekSessions().then(setWeekSessions).catch(() => setWeekSessions([]));
  }, []);

  const muscles = lastSession ? extractMuscles(lastSession) : null;

  const weekStart = startOfISOWeek(new Date());
  const weekDays = DAY_LABELS.map((label, i) => {
    const date = format(addDays(weekStart, i), "yyyy-MM-dd");
    const session = weekSessions?.find(s => s.session_date === date);
    const count = session ? (session.session_exercises?.length ?? 0) : 0;
    return { label, date, count };
  });

  const weekSessionCount = weekSessions?.length ?? 0;
  const weekMuscleCount = (() => {
    const seen = new Set();
    weekSessions?.forEach(s =>
      (s.session_exercises || []).forEach(ex =>
        (ex.muscle_activations || []).forEach(ma => seen.add(ma.muscle_id))
      )
    );
    return seen.size;
  })();

  return (
    <PageShell
      onShowHome={onShowHome}
      onShowLogger={onShowLogger}
      onShowHistory={onShowHistory}
      onShowReport={onShowReport}
      onShowBibliotek={onShowBibliotek}
      currentView={currentView}
    >
      <div style={{ paddingBottom: 40 }}>

        {/* Today header + CTA */}
        <SectionLabel>I DAG</SectionLabel>
        <PageHeading>{formatToday()}</PageHeading>
        <div style={{ padding: "0 16px 24px" }}>
          <button
            onClick={onShowLogger}
            style={{
              width: "100%", height: 48,
              background: "#0f62fe", color: "#fff",
              border: "none", borderRadius: 0,
              fontFamily: "var(--cds-font-sans)", fontSize: 14,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 16px",
            }}
          >
            <span>Logg ny økt</span>
            <Camera size={16} />
          </button>
        </div>

        {/* Last session */}
        <SectionLabel>SISTE ØKT</SectionLabel>

        {lastSession === undefined && (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 32px" }}>
            <InlineLoading description="Laster siste økt…" />
          </div>
        )}

        {lastSession === null && (
          <div style={{
            margin: "0 16px",
            background: "var(--cds-layer-01)",
            border: "1px solid var(--cds-border-subtle-01)",
            padding: 24, textAlign: "center",
            color: "var(--cds-text-secondary)", fontSize: 14,
          }}>
            Ingen økter logget ennå. Logg din første økt!
          </div>
        )}

        {lastSession && muscles && (
          <div style={{ margin: "0 16px", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)" }}>
            <div style={{ padding: "16px 16px 0" }}>
              <div style={{
                fontFamily: "var(--cds-font-mono)", fontSize: 11,
                letterSpacing: "0.12em", color: "var(--cds-text-secondary)",
                textTransform: "uppercase", marginBottom: 6,
              }}>
                {formatSessionDate(lastSession.session_date)}
                {lastSession.session_exercises?.length > 0 && ` · ${lastSession.session_exercises.length} øvelser`}
              </div>
              {lastSession.gym_calendar?.name && (
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--cds-text-primary)", lineHeight: 1.25 }}>
                  {lastSession.gym_calendar.name}
                </div>
              )}
            </div>

            <div style={{ display: "flex", padding: "14px 12px 0", gap: 6 }}>
              <div style={{ width: 90, flexShrink: 0 }}>
                <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="front" />
              </div>
              <div style={{ width: 90, flexShrink: 0 }}>
                <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="back" />
              </div>
            </div>

            <div style={{ padding: "8px 16px 16px" }}>
              {muscles.primary.length > 0 && (
                <>
                  <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--cds-text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>
                    PRIMÆR ({muscles.primary.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 4px", marginBottom: 10 }}>
                    {muscles.primary.map(m => (
                      <Tag key={m} type="green" size="sm">{MUSCLES[m]?.label ?? m}</Tag>
                    ))}
                  </div>
                </>
              )}
              {muscles.secondary.length > 0 && (
                <>
                  <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--cds-text-secondary)", textTransform: "uppercase", marginBottom: 6 }}>
                    SEKUNDÆR ({muscles.secondary.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 4px" }}>
                    {muscles.secondary.map(m => (
                      <Tag key={m} type="blue" size="sm">{MUSCLES[m]?.label ?? m}</Tag>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--cds-border-subtle-01)", display: "flex" }}>
              <button
                onClick={() => onShowHistoryWithDate(lastSession.session_date)}
                style={{
                  flex: 1, height: 48, background: "transparent", border: "none",
                  borderRight: "1px solid var(--cds-border-subtle-01)",
                  color: "var(--cds-text-primary)", fontFamily: "var(--cds-font-sans)",
                  fontSize: 14, cursor: "pointer",
                }}
              >
                Se detaljer
              </button>
              <button
                onClick={onShowBibliotekMaler}
                style={{
                  flex: 1, height: 48, background: "transparent", border: "none",
                  color: "var(--cds-text-primary)", fontFamily: "var(--cds-font-sans)",
                  fontSize: 14, cursor: "pointer",
                }}
              >
                Bruk som mal
              </button>
            </div>
          </div>
        )}

        {/* Weekly strip */}
        <SectionLabel>UKEN SÅ LANGT</SectionLabel>
        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {weekDays.map(({ label, count }, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--cds-text-secondary)", marginBottom: 4, letterSpacing: "0.1em" }}>
                  {label}
                </div>
                <div style={{ height: 36, background: heatColor(count), border: "1px solid var(--cds-border-subtle-01)" }} />
              </div>
            ))}
          </div>
          {weekSessions !== undefined && (
            <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", marginTop: 8, letterSpacing: "0.06em" }}>
              {weekSessionCount} ØKTE{weekSessionCount !== 1 ? "R" : ""} · {weekMuscleCount} MUSKELGRUPPE{weekMuscleCount !== 1 ? "R" : ""}
            </div>
          )}
        </div>

      </div>
    </PageShell>
  );
}

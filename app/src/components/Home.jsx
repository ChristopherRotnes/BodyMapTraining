import React, { useState, useEffect } from "react";
import { format, parseISO, startOfISOWeek, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { InlineLoading } from "@carbon/react";
import { Camera } from "@carbon/icons-react";
import { BodySVG, MUSCLES } from "../lib/bodymap.jsx";
import { fetchLastSession, fetchThisWeekSessions } from "../lib/db";
import { extractMuscles } from "../lib/utils";
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

function formatSessionDate(isoDate) {
  const raw = format(parseISO(isoDate), "EEEE d. MMMM", { locale: nb });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatToday(today) {
  const raw = format(today, "EEEE d. MMMM", { locale: nb });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function countUniqueMuscles(sessions) {
  const seen = new Set();
  sessions?.forEach(s =>
    (s.session_exercises || []).forEach(ex =>
      (ex.muscle_activations || []).forEach(ma => seen.add(ma.muscle_id))
    )
  );
  return seen.size;
}

export default function Home({
  onShowHome, onShowLogger, onShowHistory, onShowReport,
  onShowBibliotek, currentView, onShowHistoryWithDate,
}) {
  const [lastSession, setLastSession] = useState(undefined);
  const [weekSessions, setWeekSessions] = useState(undefined);

  useEffect(() => {
    fetchLastSession().then(setLastSession).catch(() => setLastSession(null));
    fetchThisWeekSessions().then(setWeekSessions).catch(() => setWeekSessions([]));
  }, []);

  const today = new Date();
  const muscles = lastSession ? extractMuscles(lastSession) : null;
  const isToday = lastSession?.session_date === format(today, "yyyy-MM-dd");

  const muscleMap = muscles
    ? Object.fromEntries(
        [...muscles.primary, ...muscles.secondary].map(id => [id, [MUSCLES[id]?.label ?? id]])
      )
    : {};

  const weekStart = startOfISOWeek(today);
  const weekDays = DAY_LABELS.map((label, i) => {
    const date = format(addDays(weekStart, i), "yyyy-MM-dd");
    const session = weekSessions?.find(s => s.session_date === date);
    const count = session ? (session.session_exercises?.length ?? 0) : 0;
    return { label, date, count };
  });

  const weekSessionCount = weekSessions?.length ?? 0;
  const weekMuscleCount = countUniqueMuscles(weekSessions);

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
        <PageHeading>{formatToday(today)}</PageHeading>
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
        <SectionLabel>{isToday ? "DAGENS ØKT" : "SISTE ØKT"}</SectionLabel>

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
            {/* Header: date + session identity */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
              <div style={{
                fontFamily: "var(--cds-font-mono)", fontSize: 11,
                letterSpacing: "0.12em", color: "var(--cds-text-secondary)",
                textTransform: "uppercase", marginBottom: 6,
              }}>
                {formatSessionDate(lastSession.session_date)}
              </div>
              {lastSession.gym_calendar?.name ? (
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--cds-text-primary)", lineHeight: 1.2 }}>
                  {lastSession.gym_calendar.name}
                </div>
              ) : (
                <div style={{ fontSize: 16, fontStyle: "italic", color: "var(--cds-text-secondary)" }}>
                  Egentrening
                </div>
              )}
            </div>

            {/* Body figures + exercise list side by side */}
            <div style={{ display: "flex", gap: 16, padding: "12px 16px 0", alignItems: "flex-start" }}>
              {/* Body figures — hover shows muscle name */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <div style={{ width: 72 }}>
                  <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="front" muscleMap={muscleMap} />
                </div>
                <div style={{ width: 72 }}>
                  <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="back" muscleMap={muscleMap} />
                </div>
              </div>

              {/* Exercise list */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {(lastSession.session_exercises || []).map((ex, i) => (
                  <div key={ex.id ?? i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    padding: "5px 0",
                    borderBottom: i < lastSession.session_exercises.length - 1
                      ? "1px solid var(--cds-border-subtle-01)" : "none",
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 13, color: "var(--cds-text-primary)", lineHeight: 1.3 }}>
                      {ex.name}
                    </span>
                    {(ex.sets || ex.reps) && (
                      <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                        {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ?? ex.reps}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid var(--cds-border-subtle-01)", marginTop: 14 }}>
              <button
                onClick={() => onShowHistoryWithDate(lastSession.session_date)}
                style={{
                  width: "100%", height: 48, background: "transparent", border: "none",
                  color: "var(--cds-text-primary)", fontFamily: "var(--cds-font-sans)",
                  fontSize: 14, cursor: "pointer",
                }}
              >
                Se detaljer
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

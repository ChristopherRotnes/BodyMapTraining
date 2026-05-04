import { useState, useEffect, useRef } from "react";
import { format, parseISO, startOfISOWeek, addDays, getISOWeek } from "date-fns";
import { nb } from "date-fns/locale";
import { InlineLoading } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { BodySVG } from "../lib/bodymap.jsx";
import { fetchLastSession, fetchThisWeekSessions } from "../lib/db";
import { extractMuscles, logDevError } from "../lib/utils";
import PageShell, { SectionLabel, AccentChip } from "./PageShell";
import { useNav } from "../lib/NavContext";

const DAY_LABELS = ["M", "T", "O", "T", "F", "L", "S"];

function formatSessionDate(isoDate) {
  const raw = format(parseISO(isoDate), "EEEE d. MMMM", { locale: nb });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatTodayEyebrow(today) {
  const day = format(today, "EEEE", { locale: nb });
  const week = getISOWeek(today);
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · uke ${week}`;
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

export default function Home({ onShowHistoryWithDate }) {
  const { onShowLogger } = useNav();
  const [lastSession, setLastSession] = useState(undefined);
  const [weekSessions, setWeekSessions] = useState(undefined);
  const [tooltip, setTooltip] = useState(null);
  const weekStripRef = useRef();
  const [syncState, setSyncState] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');

  async function triggerSportySync() {
    setSyncState('loading');
    setSyncMsg('');
    try {
      const res = await fetch('/api/sporty-sync', {
        method: 'POST',
        headers: { 'x-api-key': import.meta.env.VITE_SPORTY_SYNC_API_KEY ?? '' },
      });
      const json = await res.json();
      setSyncState(res.ok ? 'ok' : 'error');
      setSyncMsg(res.ok ? `Hentet ${json.upserted} gymklasser` : json.error ?? 'Ukjent feil');
    } catch (e) {
      logDevError("Home/sync", e);
      setSyncState('error');
      setSyncMsg(e.message);
    }
  }

  useEffect(() => {
    fetchLastSession().then(setLastSession).catch(() => setLastSession(null)); // home renders empty state on failure
    fetchThisWeekSessions().then(setWeekSessions).catch(() => setWeekSessions([])); // home renders empty state on failure
  }, []);

  useEffect(() => {
    if (!tooltip) return;
    const fn = e => { if (e.key === "Escape") setTooltip(null); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [tooltip]);

  const today = new Date();
  const muscles = lastSession ? extractMuscles(lastSession) : null;
  const isToday = lastSession?.session_date === format(today, "yyyy-MM-dd");

  const weekStart = startOfISOWeek(today);
  const weekDays = DAY_LABELS.map((label, i) => {
    const date = format(addDays(weekStart, i), "yyyy-MM-dd");
    const sessions = weekSessions?.filter(s => s.session_date === date) ?? [];
    const count = sessions.reduce((sum, s) => sum + (s.session_exercises?.length ?? 0), 0);
    const names = sessions.map(s => s.gym_calendar?.name).filter(Boolean);
    return { label, date, count, names };
  });
  const maxWeekCount = Math.max(...weekDays.map(d => d.count), 1);

  const weekSessionCount = weekSessions?.length ?? 0;
  const weekMuscleCount = countUniqueMuscles(weekSessions);

  const exCount = lastSession?.session_exercises?.length ?? 0;
  const muscleCount = muscles ? new Set([...muscles.primary, ...muscles.secondary]).size : 0;

  return (
    <PageShell>
      <div style={{ paddingBottom: 40 }}>

        {/* Hero card */}
        <div style={{ margin: "0 16px 8px", padding: "22px 18px 20px", borderRadius: "var(--r-card)", background: "linear-gradient(135deg, #1a1014 0%, var(--surface-card) 60%)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 10%, var(--accent-bg-55) 0%, transparent 60%)", pointerEvents: "none" }} aria-hidden="true" />
          <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.16em", color: "var(--text-subdued-wl)", textTransform: "uppercase", marginBottom: 10, position: "relative" }}>
            {formatTodayEyebrow(today)}
          </div>
          <div style={{ fontFamily: "var(--cond)", fontWeight: 700, fontSize: 64, lineHeight: 0.9, letterSpacing: "-0.025em", marginBottom: 22, position: "relative" }}>
            <div style={{ color: "var(--cds-text-primary)" }}>Tren.</div>
            <div style={{ color: "var(--accent)" }}>I dag.</div>
          </div>
          <button
            onClick={onShowLogger}
            style={{
              width: "100%", padding: "16px 20px",
              background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: "var(--r-pill)",
              fontFamily: "var(--cds-font-sans)", fontWeight: 600, fontSize: 15,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
              position: "relative",
              transition: "transform 80ms ease, background 80ms ease",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span>Start ny økt</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Day-bars */}
        <div style={{ padding: "10px 16px 20px" }}>
          <div ref={weekStripRef} style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 6, height: 56, alignItems: "flex-end" }}>
              {weekDays.map(({ label, count, date, names }, i) => {
                const pct = count > 0 ? Math.max(count / maxWeekCount, 0.1) : 0;
                const isCurrentDay = date === format(today, "yyyy-MM-dd");
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div
                        role={count > 0 ? "button" : undefined}
                        tabIndex={count > 0 ? 0 : -1}
                        aria-label={count > 0 ? `${label}: ${count} ${count === 1 ? "øvelse" : "øvelser"}` : undefined}
                        onClick={count > 0 ? () => onShowHistoryWithDate(date) : undefined}
                        onKeyDown={count > 0 ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onShowHistoryWithDate(date); } } : undefined}
                        onMouseEnter={count > 0 ? e => {
                          const rect = weekStripRef.current?.getBoundingClientRect();
                          if (rect) setTooltip({ names, x: e.clientX - rect.left, y: e.clientY - rect.top });
                        } : undefined}
                        onMouseMove={count > 0 ? e => {
                          const rect = weekStripRef.current?.getBoundingClientRect();
                          if (rect) setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev);
                        } : undefined}
                        onMouseLeave={count > 0 ? () => setTooltip(null) : undefined}
                        onFocus={count > 0 ? e => {
                          const stripRect = weekStripRef.current?.getBoundingClientRect();
                          const cellRect = e.currentTarget.getBoundingClientRect();
                          if (stripRect) setTooltip({ names, x: cellRect.left - stripRect.left, y: 0 });
                        } : undefined}
                        onBlur={count > 0 ? () => setTooltip(null) : undefined}
                        style={{
                          width: "100%",
                          height: count > 0 ? `${Math.round(pct * 100)}%` : 3,
                          minHeight: count > 0 ? 6 : 3,
                          background: count > 0 ? "linear-gradient(to top, var(--accent), var(--accent-soft))" : "var(--border-subtle-wl)",
                          outline: isCurrentDay ? "1.5px solid var(--accent)" : "none",
                          outlineOffset: 2,
                          cursor: count > 0 ? "pointer" : "default",
                        }}
                      />
                    </div>
                    <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, color: isCurrentDay ? "var(--accent)" : "var(--text-subdued-wl)", letterSpacing: "0.1em" }}>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
            {tooltip && tooltip.names.length > 0 && (
              <div style={{
                position: "absolute",
                left: Math.min(tooltip.x + 10, (weekStripRef.current?.offsetWidth || 300) - 160),
                top: Math.max(tooltip.y - 10, 4),
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle-wl)",
                padding: "8px 10px",
                zIndex: 10,
                maxWidth: 200,
              }}>
                {tooltip.names.map((name, i) => (
                  <div key={i} style={{ fontFamily: "var(--cds-font-mono)", fontSize: 12, color: "var(--cds-text-primary)", padding: i > 0 ? "4px 0 0" : 0 }}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {weekSessions !== undefined && (
            <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--text-muted-wl)", marginTop: 8, letterSpacing: "0.06em" }}>
              {`${weekSessionCount} ØKTE${weekSessionCount !== 1 ? "R" : ""} · ${weekMuscleCount} MUSKELGRUPPE${weekMuscleCount !== 1 ? "R" : ""}`}
            </div>
          )}
        </div>

        {/* Last session */}
        <div style={{ padding: "0 16px", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionLabel style={{ margin: 0 }}>{isToday ? "DAGENS ØKT" : "SISTE ØKT"}</SectionLabel>
            <button
              onClick={() => onShowHistoryWithDate(lastSession?.session_date)}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--cds-font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", padding: 0 }}
            >
              SE ALLE →
            </button>
          </div>
        </div>

        {lastSession === undefined && (
          <div aria-live="polite" aria-busy="true" style={{ display: "flex", justifyContent: "center", padding: "16px 0 32px" }}>
            <InlineLoading description="Laster siste økt…" />
          </div>
        )}

        {lastSession === null && (
          <div style={{
            margin: "0 16px",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle-wl)",
            borderRadius: "var(--r-card)",
            padding: 24, textAlign: "center",
            color: "var(--cds-text-secondary)", fontSize: 14,
          }}>
            Ingen økter logget ennå. Logg din første økt!
          </div>
        )}

        {lastSession && muscles && (
          <div
            onClick={() => onShowHistoryWithDate(lastSession.session_date)}
            style={{ margin: "0 16px", background: "var(--surface-card)", border: "1px solid var(--border-subtle-wl)", borderRadius: "var(--r-card)", padding: "14px 14px 12px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}
          >
            {/* Mini body figures */}
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              <div style={{ width: 58 }}>
                <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="front" />
              </div>
              <div style={{ width: 58 }}>
                <BodySVG primary={muscles.primary} secondary={muscles.secondary} view="back" />
              </div>
            </div>

            {/* Session identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted-wl)", textTransform: "uppercase", marginBottom: 5 }}>
                {formatSessionDate(lastSession.session_date)}
              </div>
              {lastSession.gym_calendar?.name ? (
                <div style={{ fontFamily: "var(--cond)", fontSize: 18, fontWeight: 600, color: "var(--cds-text-primary)", lineHeight: 1.15, marginBottom: 10 }}>
                  {lastSession.gym_calendar.name}
                </div>
              ) : (
                <div style={{ fontFamily: "var(--cond)", fontSize: 18, fontWeight: 600, color: "var(--cds-text-secondary)", marginBottom: 10 }}>
                  Egentrening
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <AccentChip>{exCount} øvelser</AccentChip>
                <AccentChip>{muscleCount} muskler</AccentChip>
              </div>
            </div>
          </div>
        )}

        {import.meta.env.DEV && <div style={{ margin: "32px 16px 0" }}>
          <SectionLabel>DEV</SectionLabel>
          <button
            onClick={triggerSportySync}
            disabled={syncState === 'loading'}
            style={{
              width: "100%", height: 40,
              background: "var(--cds-layer-02)",
              border: "1px solid var(--cds-border-subtle-01)",
              color: "var(--cds-text-secondary)",
              fontFamily: "var(--cds-font-mono)", fontSize: 12,
              cursor: syncState === 'loading' ? 'wait' : 'pointer',
              letterSpacing: "0.06em",
            }}
          >
            {syncState === 'loading' ? 'SYNKRONISERER…' : 'SYNK SPORTY.NO'}
          </button>
          {syncMsg && (
            <div style={{
              fontFamily: "var(--cds-font-mono)", fontSize: 11, marginTop: 6,
              letterSpacing: "0.06em",
              color: syncState === 'ok' ? "var(--success-wl)" : "var(--cds-support-error)",
            }}>
              {syncMsg}
            </div>
          )}
        </div>}

      </div>
    </PageShell>
  );
}

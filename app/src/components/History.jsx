import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { nb } from "date-fns/locale";
import { format, subMonths } from "date-fns";
import "react-day-picker/style.css";
import { fetchSessions, fetchSessionsByDate } from "../lib/db";
import { BodySVG, MUSCLES, PRIMARY_FILL, SEC_FILL, useIsMobile } from "../lib/bodymap.jsx";
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent,
  Button, Tag, InlineLoading,
} from "@carbon/react";
import { Camera, Asleep, Light, Analytics } from "@carbon/icons-react";
import { useTheme } from "../theme";

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

function buildMuscleMap(session) {
  const map = {};
  (session.session_exercises || []).forEach(ex => {
    (ex.muscle_activations || []).forEach(ma => {
      if (!map[ma.muscle_id]) map[ma.muscle_id] = [];
      if (!map[ma.muscle_id].includes(ex.name)) map[ma.muscle_id].push(ex.name);
    });
  });
  return map;
}

export default function History({ onNewSession, onShowReport }) {
  const { theme, setTheme } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [mobileView, setMobileView] = useState("front");
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const trainedSet = new Set(sessions.map(s => s.session_date));
  const trainedDates = sessions.map(s => new Date(s.session_date + "T12:00:00"));

  const loadSession = async (dateStr) => {
    setLoadingSession(true);
    setSelectedSession(null);
    try {
      const results = await fetchSessionsByDate(dateStr);
      if (results.length > 0) {
        const s = results[0];
        s.session_exercises = [...(s.session_exercises || [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0)
        );
        setSelectedSession(s);
      }
    } catch (err) {
      console.error("Kunne ikke laste økt:", err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSelect = (date) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (!trainedSet.has(dateStr)) return;
    setSelectedDate(date);
    loadSession(dateStr);
  };

  const muscles = selectedSession ? extractMuscles(selectedSession) : null;
  const muscleMap = selectedSession ? buildMuscleMap(selectedSession) : {};

  return (
    <>
      <Header aria-label="Workout Lens">
        <SkipToContent />
        <HeaderName href="#" prefix="">Workout Lens</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Logg ny økt" onClick={onNewSession}>
            <Camera size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Perioderapport" onClick={onShowReport}>
            <Analytics size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label={theme === "g10" ? "Bytt til mørkt tema" : "Bytt til lyst tema"}
            onClick={() => setTheme(theme === "g10" ? "g100" : "g10")}
          >
            {theme === "g10" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <main style={{ paddingTop: 48, minHeight: "100vh", background: "var(--cds-background)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>

          <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 20, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
            Treningshistorikk
          </p>

          {loading ? (
            <InlineLoading description="Laster historikk…" status="active" />
          ) : (
            <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "16px 12px", marginBottom: 24, overflowX: "auto" }}>
              <DayPicker
                numberOfMonths={2}
                defaultMonth={subMonths(new Date(), 1)}
                locale={nb}
                mode="single"
                required
                selected={selectedDate}
                onSelect={handleSelect}
                modifiers={{ trained: trainedDates }}
                modifiersClassNames={{ trained: "rdp-day-trained" }}
                disabled={{ after: new Date() }}
              />
            </div>
          )}

          {loadingSession && (
            <InlineLoading description="Laster økt…" status="active" style={{ marginBottom: 16 }} />
          )}

          {selectedSession && muscles && (
            <div className="fade-in">
              <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 16, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                {format(new Date(selectedSession.session_date + "T12:00:00"), "EEEE d. MMMM yyyy", { locale: nb })}
              </p>

              {isMobile ? (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {["front", "back"].map(v => (
                      <Button key={v} kind={mobileView === v ? "primary" : "ghost"} size="sm"
                        onClick={() => setMobileView(v)}>
                        {v === "front" ? "Front" : "Bak"}
                      </Button>
                    ))}
                  </div>
                  <div style={{ maxWidth: 240, margin: "0 auto 16px", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <BodySVG view={mobileView} primary={muscles.primary} secondary={muscles.secondary} muscleMap={muscleMap} />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  {["front", "back"].map(view => (
                    <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                      <BodySVG view={view} primary={muscles.primary} secondary={muscles.secondary} muscleMap={muscleMap} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <Tag type="green" size="sm">Primær ({muscles.primary.length})</Tag>
                <Tag type="blue" size="sm">Sekundær ({muscles.secondary.length})</Tag>
              </div>

              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Øvelser
                </p>
                {(selectedSession.session_exercises || []).map(ex => (
                  <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13, borderBottom: "1px solid var(--cds-border-subtle-01)", color: "var(--cds-text-primary)" }}>
                    <span>{ex.name}</span>
                    {(ex.sets || ex.reps) && (
                      <span style={{ color: "var(--cds-text-secondary)", fontFamily: "var(--cds-font-mono)", fontSize: 12 }}>
                        {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Muskelgrupper
                </p>
                {muscles.primary.map(id => (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIMARY_FILL, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-primary)" }}>{MUSCLES[id]?.label || id}</span>
                    <Tag type="green" size="sm">Primær</Tag>
                  </div>
                ))}
                {muscles.secondary.map(id => (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEC_FILL, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-secondary)" }}>{MUSCLES[id]?.label || id}</span>
                    <Tag type="blue" size="sm">Sekundær</Tag>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && sessions.length === 0 && (
            <p style={{ color: "var(--cds-text-secondary)", fontSize: 14 }}>
              Ingen økter lagret ennå.
            </p>
          )}

        </div>
      </main>
    </>
  );
}

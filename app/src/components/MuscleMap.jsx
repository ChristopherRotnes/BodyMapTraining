import React, { useState, useRef, useCallback, useEffect } from "react";
import { saveSession, fetchGymSessionsByDate, checkGymCalendarConflict } from "../lib/db";
import { EX_DB, MUSCLES, PRIMARY_FILL, SEC_FILL, calcMuscles, BodySVG, useIsMobile } from "../lib/bodymap.jsx";
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent,
  Button, Checkbox, Select, SelectItem,
  DatePicker, DatePickerInput,
  ProgressIndicator, ProgressStep,
  InlineNotification, InlineLoading,
  Tag, DefinitionTooltip,
} from "@carbon/react";
import { Add, TrashCan, ArrowLeft, ArrowRight, Renew, Camera, Asleep, Light, Ai, RecentlyViewed, Analytics } from "@carbon/icons-react";
import { useTheme } from "../theme";

const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// ── MUSCLE MAP BUILDERS ───────────────────────────────────────────────
function buildMuscleMap(exercises) {
  const map = {};
  exercises.filter(e => e.enabled && e.name).forEach(ex => {
    if (ex.primary?.length || ex.secondary?.length) {
      [...(ex.primary || []), ...(ex.secondary || [])].forEach(id => {
        if (!map[id]) map[id] = [];
        if (!map[id].includes(ex.name)) map[id].push(ex.name);
      });
    } else {
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) {
          [...rule.p, ...rule.s].forEach(id => {
            if (!map[id]) map[id] = [];
            if (!map[id].includes(ex.name)) map[id].push(ex.name);
          });
          break;
        }
      }
    }
  });
  return map;
}

function buildRecMuscleMap(recs) {
  const map = {};
  (recs || []).forEach(r => {
    [...(r.primary || []), ...(r.secondary || [])].forEach(id => {
      if (!map[id]) map[id] = [];
      if (!map[id].includes(r.name)) map[id].push(r.name);
    });
  });
  return map;
}

const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

const getMediaType = (file) => {
  const t = { "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp" };
  return t[file.type] || "image/jpeg";
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function MuscleMap({ onShowHistory, onShowReport }) {
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState("upload");
  const [images, setImages] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [muscles, setMuscles] = useState({ primary: [], secondary: [] });
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [gymSessions, setGymSessions] = useState([]);
  const [gymSessionId, setGymSessionId] = useState("");
  const [gymCalendarConflict, setGymCalendarConflict] = useState(null);
  const [sessionDate, setSessionDate] = useState(() => localDateStr());
  const [mobileView, setMobileView] = useState("front");
  const isMobile = useIsMobile();
  const fileRef = useRef();

  useEffect(() => {
    if (step !== "confirm") return;
    fetchGymSessionsByDate(sessionDate)
      .then(sessions => { setGymSessions(sessions); setGymSessionId(""); setGymCalendarConflict(null); })
      .catch(() => setGymSessions([]));
  }, [step, sessionDate]);

  useEffect(() => {
    if (!gymSessionId) { setGymCalendarConflict(null); return; }
    checkGymCalendarConflict(gymSessionId)
      .then(setGymCalendarConflict)
      .catch(() => setGymCalendarConflict(null));
  }, [gymSessionId]);

  const stepIndex = { upload: 0, analyzing: 0, confirm: 1, muscles: 2 }[step] ?? 0;

  const addImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const mt = getMediaType(file);
    const b64 = await toBase64(file);
    setImages(prev => [...prev, { id: Date.now() + Math.random(), base64: b64, mediaType: mt, preview: `data:${mt};base64,${b64}` }]);
    setError(null);
  }, []);

  const handleFiles = useCallback(async (files) => {
    for (const file of Array.from(files)) await addImage(file);
  }, [addImage]);

  const analyze = async () => {
    setStep("analyzing"); setError(null);
    try {
      const imageBlocks = images.map(img => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      }));
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text", text: `Du ser ett eller flere bilder av treningsprogrammer fra norske treningsstudio-tavler (gjerne håndskrevet).
Identifiser ALLE treningsøvelser fra alle bildene. Ikke dupliser øvelser som finnes i flere bilder.
For hver øvelse, angi hvilke muskler som er primære og sekundære.
Bruk KUN disse muscle-ID-ene: chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves, traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Nøyaktig navn fra tavlen","standardName":"Standard norsk/engelsk navn","sets":"3","reps":"10","primary":["chest"],"secondary":["shoulders_front","triceps"]}]
"sets" og "reps" er null om ikke skrevet. Finn du ingen øvelser, returner: []` }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error();
      setExercises(parsed.map((ex, i) => ({ ...ex, id: i, enabled: true, sets: ex.sets ?? "1" })));
      setStep("confirm");
    } catch (err) {
      const msg = err?.status === 401
        ? "API-nøkkel feil. Sjekk ANTHROPIC_API_KEY i Azure-miljøet."
        : "Kunne ikke tolke bildet. Prøv igjen med et tydeligere bilde.";
      setError(msg);
      setStep("upload");
    }
  };

  const confirm = () => {
    const enabled = exercises.filter(e => e.enabled && e.name);
    const enriched = enabled.map(ex => {
      if (ex.primary?.length || ex.secondary?.length) return ex;
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) return { ...ex, primary: rule.p, secondary: rule.s };
      }
      return ex;
    });
    setMuscles(calcMuscles(enriched));
    setStep("muscles");
    setSaving(true); setSaved(false); setSaveError(false);
    saveSession(enriched, { gymCalendarId: gymSessionId || null, sessionDate, replace: !!gymCalendarConflict })
      .then(() => setSaved(true))
      .catch(err => { console.error("Lagring feilet:", err); setSaveError(true); })
      .finally(() => setSaving(false));
  };

  const reset = () => {
    setStep("upload"); setImages([]);
    setExercises([]); setMuscles({ primary: [], secondary: [] });
    setError(null); setRecs(null);
    setSaving(false); setSaved(false); setSaveError(false);
    setGymSessions([]); setGymSessionId(""); setGymCalendarConflict(null);
    setSessionDate(localDateStr());
  };

  const getUntrainedMuscles = () =>
    Object.keys(MUSCLES).filter(id => !muscles.primary.includes(id) && !muscles.secondary.includes(id));

  const recommend = async () => {
    setLoadingRecs(true); setRecs(null);
    const untrained = getUntrainedMuscles().map(id => MUSCLES[id].label);
    const trained = [...muscles.primary, ...muscles.secondary].map(id => MUSCLES[id]?.label).filter(Boolean);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Du er en personlig trener. Brukeren har trent disse musklene i dag: ${trained.join(", ")}.
Muskelgrupper som IKKE er trent: ${untrained.join(", ")}.
Foreslå 5 øvelser som dekker de utrente musklene. Gjerne øvelser som er vanlige på norske treningssentre.
Bruk KUN disse muscle-ID-ene: chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves, traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Øvelsesnavn","primary":["muscle_id"],"secondary":["muscle_id"],"tip":"Kort praktisk tips på norsk"}]`
          }]
        })
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      setRecs(JSON.parse(text));
    } catch { setRecs([]); }
    setLoadingRecs(false);
  };

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <>
      <Header aria-label="Workout Lens">
        <SkipToContent />
        <HeaderName href="#" prefix="">Workout Lens</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Treningshistorikk" onClick={onShowHistory}>
            <RecentlyViewed size={20} />
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
        <div style={{ maxWidth: 540, margin: "0 auto", padding: "24px 20px" }}>

          <ProgressIndicator currentIndex={stepIndex} spaceEqually style={{ marginBottom: 28 }}>
            <ProgressStep label="Last opp bilde" />
            <ProgressStep label="Bekreft øvelser" />
            <ProgressStep label="Muskelkart" />
          </ProgressIndicator>

          {/* ── UPLOAD ── */}
          {step === "upload" && (
            <div className="fade-in">
              <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
                Last opp ett eller flere bilder av treningsprogrammet.
              </p>

              {images.length === 0 ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? "var(--cds-interactive)" : "var(--cds-border-subtle-01)"}`,
                    background: dragging ? "var(--cds-layer-hover-01)" : "transparent",
                    marginBottom: 14,
                    cursor: "pointer",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <Camera size={40} style={{ color: "var(--cds-text-secondary)", marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Trykk for å velge bilde</p>
                    <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>eller dra og slipp · JPEG, PNG, WebP · flere bilder støttes</p>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                  style={{ marginBottom: 14 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {images.map(img => (
                      <div key={img.id} style={{ position: "relative", overflow: "hidden", aspectRatio: "1", background: "var(--cds-layer-01)" }}>
                        <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <button
                          onClick={() => setImages(p => p.filter(i => i.id !== img.id))}
                          style={{
                            position: "absolute", top: 4, right: 4,
                            background: "rgba(0,0,0,0.75)", border: "none",
                            color: "#fff", width: 24, height: 24,
                            fontSize: 16, lineHeight: "24px", textAlign: "center",
                            padding: 0, cursor: "pointer",
                          }}>
                          ×
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragging ? "var(--cds-interactive)" : "var(--cds-border-subtle-01)"}`,
                        background: dragging ? "var(--cds-layer-hover-01)" : "transparent",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        aspectRatio: "1", cursor: "pointer", gap: 4,
                        transition: "border-color 0.2s",
                      }}>
                      <Add size={20} style={{ color: "var(--cds-text-secondary)" }} />
                      <span style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "0.5px" }}>Legg til</span>
                    </div>
                  </div>
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)} />

              {error && (
                <InlineNotification
                  kind="error"
                  title="Feil:"
                  subtitle={error}
                  hideCloseButton
                 
                  style={{ marginBottom: 14 }}
                />
              )}

              <Button
                kind="primary"
                renderIcon={images.length > 0 ? ArrowRight : Camera}
                onClick={images.length > 0 ? analyze : () => fileRef.current?.click()}
                style={{ width: "100%", maxWidth: "100%" }}
              >
                {images.length > 1
                  ? `Analyser ${images.length} bilder`
                  : images.length === 1
                    ? "Analyser program"
                    : "Velg bilde"}
              </Button>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {step === "analyzing" && (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <InlineLoading
                description="Leser treningsprogram og identifiserer øvelser…"
                status="active"
                style={{ justifyContent: "center" }}
              />
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="fade-in">
              <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
                {exercises.length > 0
                  ? `Fant ${exercises.length} øvelse${exercises.length !== 1 ? "r" : ""}. Juster om nødvendig:`
                  : "Ingen øvelser funnet. Legg til manuelt:"}
              </p>

              <DatePicker
                datePickerType="single"
                value={(() => { const [y, m, d] = sessionDate.split("-"); return `${m}/${d}/${y}`; })()}
                maxDate={(() => { const [y, m, d] = localDateStr().split("-"); return `${m}/${d}/${y}`; })()}
                onChange={([date]) => {
                  if (!date) return;
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, "0");
                  const d = String(date.getDate()).padStart(2, "0");
                  setSessionDate(`${y}-${m}-${d}`);
                }}
                style={{ marginBottom: 16 }}
              >
                <DatePickerInput id="session-date" labelText="Dato" placeholder="mm/dd/åååå" size="md" />
              </DatePicker>

              {gymSessions.length > 0 && (
                <Select
                  id="gym-session-select"
                  labelText="Hvilken time var dette?"
                  value={gymSessionId}
                  onChange={(e) => setGymSessionId(e.target.value)}
                  style={{ marginBottom: gymCalendarConflict ? 8 : 16 }}
                >
                  <SelectItem value="" text="Velg gymtime (valgfritt)" />
                  {gymSessions.map(s => {
                    const time = new Date(s.start_time).toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
                    const label = s.instructor ? `${time} – ${s.name} (${s.instructor})` : `${time} – ${s.name}`;
                    return <SelectItem key={s.id} value={s.id} text={label} />;
                  })}
                </Select>
              )}

              {gymCalendarConflict && (
                <InlineNotification
                  kind="warning"
                  title="Eksisterende økt:"
                  subtitle={`Denne gymtimen har allerede en lagret økt (${gymCalendarConflict.session_date}). Lagring erstatter den.`}
                  hideCloseButton
                 
                  style={{ marginBottom: 16 }}
                />
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => setExercises(p => p.map(e => e.id === ex.id ? { ...e, enabled: !e.enabled } : e))}
                    style={{
                      background: ex.enabled ? "var(--cds-layer-01)" : "transparent",
                      border: `1px solid var(--cds-border-subtle-01)`,
                      padding: "6px 8px 6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: ex.enabled ? 1 : 0.4,
                      transition: "opacity 0.15s",
                      cursor: "pointer",
                    }}
                  >
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <Checkbox
                        id={`ex-${ex.id}`}
                        labelText=""
                        hideLabel
                        checked={ex.enabled}
                        onChange={() => setExercises(p => p.map(e => e.id === ex.id ? { ...e, enabled: !e.enabled } : e))}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                      {editingId === ex.id ? (
                        <input
                          autoFocus
                          value={ex.name}
                          onChange={(e) => setExercises(p => p.map(x => x.id === ex.id ? { ...x, name: e.target.value, standardName: e.target.value } : x))}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            borderBottom: "2px solid var(--cds-interactive)",
                            color: "var(--cds-text-primary)",
                            fontFamily: "var(--cds-font-sans)",
                            fontSize: 14,
                            padding: "2px 0",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => setEditingId(ex.id)}
                          style={{ fontSize: 14, fontWeight: 500, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--cds-text-primary)" }}
                        >
                          {ex.name || <span style={{ color: "var(--cds-text-secondary)" }}>Klikk for å skrive øvelse…</span>}
                        </div>
                      )}
                    </div>

                    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {["sets", "reps"].map(field => (
                        <div key={field} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <input
                            type="number"
                            min="1"
                            placeholder="–"
                            value={ex[field] || ""}
                            onChange={e => setExercises(p => p.map(x => x.id === ex.id ? { ...x, [field]: e.target.value } : x))}
                            style={{
                              width: 40,
                              height: 28,
                              padding: "0 4px",
                              background: "var(--cds-field-01)",
                              border: "1px solid var(--cds-border-strong-01)",
                              color: "var(--cds-text-primary)",
                              fontFamily: "var(--cds-font-sans)",
                              fontSize: 12,
                              outline: "none",
                              textAlign: "center",
                            }}
                          />
                          <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                            {field === "sets" ? "sett" : "reps"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      kind="ghost"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription="Slett øvelse"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setExercises(p => p.filter(e => e.id !== ex.id)); }}
                    />
                  </div>
                ))}
              </div>

              <Button
                kind="ghost"
                renderIcon={Add}
                onClick={() => {
                  const id = Date.now();
                  setExercises(p => [...p, { id, name: "", standardName: "", sets: null, reps: null, enabled: true }]);
                  setEditingId(id);
                }}
                style={{ width: "100%", marginBottom: 16 }}
              >
                Legg til øvelse manuelt
              </Button>

              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="secondary" renderIcon={ArrowLeft} onClick={() => setStep("upload")}>
                  Tilbake
                </Button>
                <Button
                  kind="primary"
                  renderIcon={ArrowRight}
                  onClick={confirm}
                  disabled={!exercises.some(e => e.enabled && e.name)}
                  style={{ flex: 1 }}
                >
                  Vis muskelkart
                </Button>
              </div>
            </div>
          )}

          {/* ── MUSCLES ── */}
          {step === "muscles" && (
            <div className="fade-in">

              {/* Legend + save status */}
              <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
                <Tag type="green" size="sm">Primær ({muscles.primary.length})</Tag>
                <Tag type="blue" size="sm">Sekundær ({muscles.secondary.length})</Tag>
                <div style={{ marginLeft: "auto" }}>
                  {saving && <InlineLoading description="Lagrer…" status="active" />}
                  {saved && <InlineLoading description="Lagret" status="finished" />}
                  {saveError && <InlineLoading description="Lagring feilet" status="error" />}
                </div>
              </div>

              {/* Body maps */}
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
                  <div style={{ maxWidth: 240, margin: "0 auto 18px", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <BodySVG view={mobileView} primary={muscles.primary} secondary={muscles.secondary}
                      muscleMap={buildMuscleMap(exercises)} />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                  {["front", "back"].map(view => (
                    <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                      <BodySVG view={view} primary={muscles.primary} secondary={muscles.secondary}
                        muscleMap={buildMuscleMap(exercises)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Trained muscle groups */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Trente muskelgrupper
                </p>
                {muscles.primary.length === 0 && muscles.secondary.length === 0 ? (
                  <p style={{ color: "var(--cds-text-secondary)", fontSize: 13 }}>Ingen muskelgrupper gjenkjent for de valgte øvelsene.</p>
                ) : (
                  <>
                    {muscles.primary.map(id => {
                      const exNames = (buildMuscleMap(exercises)[id] || []).join(", ");
                      return (
                        <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIMARY_FILL, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-primary)" }}>
                            {exNames ? (
                              <DefinitionTooltip definition={exNames} openOnHover align="bottom">{MUSCLES[id]?.label || id}</DefinitionTooltip>
                            ) : MUSCLES[id]?.label || id}
                          </span>
                          <Tag type="green" size="sm">Primær</Tag>
                        </div>
                      );
                    })}
                    {muscles.secondary.map(id => {
                      const exNames = (buildMuscleMap(exercises)[id] || []).join(", ");
                      return (
                        <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEC_FILL, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-secondary)" }}>
                            {exNames ? (
                              <DefinitionTooltip definition={exNames} openOnHover align="bottom">{MUSCLES[id]?.label || id}</DefinitionTooltip>
                            ) : MUSCLES[id]?.label || id}
                          </span>
                          <Tag type="blue" size="sm">Sekundær</Tag>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Exercises this session */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Øvelser denne økten
                </p>
                {exercises.filter(e => e.enabled && e.name).map(ex => {
                  const muscleLabels = [...(ex.primary || []), ...(ex.secondary || [])].map(id => MUSCLES[id]?.label || id).join(", ");
                  return (
                    <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--cds-border-subtle-01)", color: "var(--cds-text-primary)" }}>
                      <span>
                        {muscleLabels ? (
                          <DefinitionTooltip definition={muscleLabels} openOnHover align="bottom">{ex.name}</DefinitionTooltip>
                        ) : ex.name}
                      </span>
                      {(ex.sets || ex.reps) && (
                        <span style={{ color: "var(--cds-text-secondary)" }}>{[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Recommendations */}
              <Button
                kind="tertiary"
                renderIcon={Ai}
                onClick={recommend}
                disabled={loadingRecs}
                style={{ width: "100%", maxWidth: "100%", marginBottom: 10 }}
              >
                {loadingRecs ? "Henter anbefalinger…" : "Hva bør jeg trene neste gang?"}
              </Button>

              {recs && recs.length > 0 && (() => {
                const recPrimary  = [...new Set(recs.flatMap(r => r.primary || []))];
                const recSecAll   = [...new Set(recs.flatMap(r => r.secondary || []))];
                const recSecondary = recSecAll.filter(id => !recPrimary.includes(id));
                return (
                  <div className="fade-in">
                    <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                        Anbefalte øvelser
                      </p>
                      {recs.map((r, i) => (
                        <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--cds-text-primary)" }}>{r.name}</p>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: r.tip ? 4 : 0 }}>
                            {(r.primary || []).length > 0 && (
                              <Tag type="green" size="sm">{r.primary.map(id => MUSCLES[id]?.label || id).join(", ")}</Tag>
                            )}
                            {(r.secondary || []).length > 0 && (
                              <Tag type="blue" size="sm">{r.secondary.map(id => MUSCLES[id]?.label || id).join(", ")}</Tag>
                            )}
                          </div>
                          {r.tip && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{r.tip}</p>}
                        </div>
                      ))}
                    </div>

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
                        <div style={{ maxWidth: 240, margin: "0 auto 10px", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                          <BodySVG view={mobileView} primary={recPrimary} secondary={recSecondary}
                            muscleMap={buildRecMuscleMap(recs)} />
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                        {["front", "back"].map(view => (
                          <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                            <BodySVG view={view} primary={recPrimary} secondary={recSecondary}
                              muscleMap={buildRecMuscleMap(recs)} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                      <Tag type="green" size="sm">Primær</Tag>
                      <Tag type="blue" size="sm">Sekundær</Tag>
                    </div>
                  </div>
                );
              })()}

              {recs && recs.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center", marginBottom: 10 }}>
                  Ingen anbefalinger tilgjengelig.
                </p>
              )}

              <Button kind="ghost" renderIcon={Renew} onClick={reset} style={{ width: "100%", maxWidth: "100%" }}>
                Logg ny økt
              </Button>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
